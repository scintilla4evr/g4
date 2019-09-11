class Game {
    /**
     * @param {GameData} gameData 
     * @param {Boolean} isSpectated 
     * @param {String} spectatedUser
     */
    constructor(
        gameData,
        isSpectated, spectatedUser
    ) {
        /**
         * @type {GameData}
         */
        this.data = gameData
        
        /**
         * @type {Boolean}
         */
        this.isSpectated = isSpectated

        /**
         * @type {String}
         */
        this.spectatedUser = spectatedUser

        /**
         * @type {Number}
         */
        this.bpm = 16.25

        /**
         * @type {HTMLDivElement}
         */
        this.dom = this.createDOM()

        /**
         * @type {Number}
         */
        this.gameTime = 0
    }

    /**
     * @returns {HTMLDivElement}
     */
    createDOM() {
        let div = document.createElement("div")
        div.classList.add("game")
        if (this.isSpectated)
            div.classList.add("spectated")

        let spectatingHeader = ""
        if (this.isSpectated)
            spectatingHeader = `<div class="spectating">Spectating <span class="name">${this.spectatedUser}</div>`

        div.innerHTML = `
        <header>
            ${spectatingHeader}
            <div class="stat level">
                <p class="name">Level</p>
                <p class="value">16</p>
            </div>
            <div class="stat record">
                <p class="name">Record</p>
                <p class="value">16</p>
            </div>
        </header>

        <canvas class="viewport"></canvas>

        <footer>
            <div class="progress">
                <div style="width: 50%"></div>
                <p class="time">5 s</p>
            </div>
            <button>
                Slow mode [s]
            </button>
        </footer>`

        if (!this.isSpectated) {
            div.querySelector("canvas").addEventListener("click", () => {
                if (!this.data.projectile)
                    this.shoot()
            })
            div.querySelector("footer button").addEventListener("click", () => {
                if (this.data.slow && !this.data.slow.isSlow)
                    this.data.slow.isSlow = true
                    this.dom.classList.add("slow")
            })
        }

        return div
    }

    getLevelRadius() {
        let radius = 200

        this.data.rings.forEach(ring => {
            ring.items.forEach(item => {
                switch (item.type) {
                    case "ball":
                    case "pulsingBall":
                    case "bar":
                    case "marqueeBar":
                        radius = Math.max(
                            radius,
                            item.distance + item.radius
                        )
                        break
                }
            })
        })

        let cannonDistance = Math.hypot(
            this.data.cannon.x, this.data.cannon.y
        )

        radius = Math.max(radius, cannonDistance + 20)

        return radius
    }

    /**
     * @param {Number} dTime 
     * @param {Ring} ring
     */
    advanceRing(dTime, ring) {
        ring.items.forEach(item => {
            switch (item.type) {
                case "ball":
                    item.angle += dTime
                    break
                case "pulsingBall":
                    item.angle += dTime
                    item.radius = item.baseRadius + Math.sin(
                        item.pulseTime * 2 * Math.PI * item.pulseFreq
                    ) * item.baseRadius / 3
                    break
                case "bar":
                    item.angleStart += dTime
                    break
                case "marqueeBar":
                    item.baseStart += dTime
                    item.baseEnd += dTime

                    item.sweepTime += dTime

                    let sin = Math.sin(
                        item.sweepTime * 2 * Math.PI * item.sweepFreq
                    ) / 2 + 0.5

                    item.angleLength = sin * (item.baseEnd - item.baseStart)
                    item.angleStart = (item.baseStart + item.baseStart) / 2 - item.angleLength / 2

                    break
            }
        })
    }

    /**
     * 
     * @param {Projectile} bullet 
     * @param {RingElement} item 
     */
    hitTest(bullet, item) {
        switch (item.type) {
            case "ball":
            case "pulsingBall":
                return Math.hypot(
                    item.distance * Math.cos(2 * Math.PI * item.angle) - bullet.x,
                    item.distance * Math.sin(2 * Math.PI * item.angle) - bullet.y
                ) < (item.radius + bullet.radius)
            case "bar":
            case "marqueeBar":
                let bulletAngle = Math.atan2(
                    bullet.y, bullet.x
                )
                if (bulletAngle < 0) bulletAngle += Math.PI * 2
                bulletAngle /= Math.PI * 2

                let bulletDist = Math.hypot(bullet.x, bullet.y)

                let clampedStart = item.angleStart % 1
                let clampedEnd = (clampedStart + item.angleLength) % 1

                let mightCollide = false

                if (clampedStart < clampedEnd) {
                    mightCollide = bulletAngle > clampedStart && bulletAngle < clampedEnd
                } else {
                    mightCollide = bulletAngle > clampedStart || bulletAngle < clampedEnd
                }

                if (
                    mightCollide &&
                    Math.abs(bulletDist - item.distance) < (item.radius + bullet.radius)
                )
                    return true
        }

        return false
    }

    /**
     * 
     * @param {Projectile} bullet 
     */
    hitTestLevel(bullet) {
        for (let ring of this.data.rings) {
            if (ring.isDistraction) continue
            for (let item of ring.items) {
                if (this.hitTest(bullet, item)) return true
            }
        }

        return false
    }

    /**
     * @param {Number} dTime 
     */
    calculateBeatTime(dTime) {
        let beatTime = 60 / this.bpm

        return dTime / beatTime
    }

    /**
     * @param {Number} dTime 
     */
    advanceLevel(dTime) {
        let beatTime = this.calculateBeatTime(dTime)

        this.data.rotation += beatTime
        this.data.rings.forEach(ring => this.advanceRing(
            beatTime * ring.speedMult,
            ring
        ))
    }

    /**
     * @param {Number} dTime 
     */
    advanceCannon(dTime) {
        this.data.cannon.angle -= dTime * 0.461538461

        switch (this.data.mode) {
            case "hard":
            case "hell":
                this.data.cannon.x = 40 * Math.cos(-this.data.cannon.angle * Math.PI)
                this.data.cannon.y = 40 * Math.sin(-this.data.cannon.angle * Math.PI)
                break
            case "hades":
                this.data.cannon.x = 200 * Math.cos(-this.data.cannon.angle * Math.PI)
                this.data.cannon.y = 200 * Math.sin(-this.data.cannon.angle * Math.PI)
                break
            case "reverse":
                this.data.cannon.angle += dTime * 0.461538461 / 2

                this.data.cannon.x = -400 * Math.cos(2 * Math.PI * this.data.cannon.angle) 
                this.data.cannon.y = -400 * Math.sin(2 * Math.PI * this.data.cannon.angle) 
                break
            default:
                this.data.cannon.x = 0
                this.data.cannon.y = 0
        }
    }

    /**
     * 
     * @param {Number} dTime 
     */
    advance(dTime) {
        let physTime = dTime
        if (this.data.slow.isSlow) physTime /= 2

        this.gameTime += physTime

        this.advanceLevel(physTime)

        // Process collisions and level transition here
        if (!this.isSpectated && this.data.projectile) {
            let levelRadius = this.getLevelRadius()
            let bullet = this.data.projectile

            if (Math.hypot(bullet.x, bullet.y) >= levelRadius * 1.41 + 20) {
                this.data.projectile = null
                this.nextLevel()
            }

            if (this.hitTestLevel(bullet)) {
                this.data.projectile = null
                this.resetProgress()
            }
        }

        if (this.data.projectile) {
            // move the bullet
            this.data.projectile.x += this.data.projectile.velocityX * physTime
            this.data.projectile.y += this.data.projectile.velocityY * physTime
        }

        // move the cannon
        this.advanceCannon(physTime)

        if (this.data.slow.isSlow) {
            let slow = this.data.slow

            slow.time = Math.max(0, slow.time - dTime)
            if (slow.time == 0) {
                slow.isSlow = false
                this.dom.classList.remove("slow")
            }
        }
    }

    shoot() {
        let cannon = this.data.cannon

        this.data.projectile = {
            x: 20 * Math.cos(2 * Math.PI * cannon.angle) + cannon.x,
            y: 20 * Math.sin(2 * Math.PI * cannon.angle) + cannon.y,
            radius: 7,
            velocityX: 750 * Math.cos(2 * Math.PI * cannon.angle),
            velocityY: 750 * Math.sin(2 * Math.PI * cannon.angle)
        }
    }

    /**
     * @param {CanvasRe} ctx 
     */
    renderCannon(ctx) {
        let cannon = this.data.cannon

        ctx.beginPath()
        ctx.moveTo(
            20 * Math.cos(2 * Math.PI * cannon.angle) + cannon.x,
            20 * Math.sin(2 * Math.PI * cannon.angle) + cannon.y
        )
        ctx.lineTo(
            20 * Math.cos(2 * Math.PI * cannon.angle + Math.PI - 0.8) + cannon.x,
            20 * Math.sin(2 * Math.PI * cannon.angle + Math.PI - 0.8) + cannon.y
        )
        ctx.lineTo(
            8 * Math.cos(2 * Math.PI * cannon.angle + Math.PI) + cannon.x,
            8 * Math.sin(2 * Math.PI * cannon.angle + Math.PI) + cannon.y
        )
        ctx.lineTo(
            20 * Math.cos(2 * Math.PI * cannon.angle + Math.PI + 0.8) + cannon.x,
            20 * Math.sin(2 * Math.PI * cannon.angle + Math.PI + 0.8) + cannon.y
        )
        ctx.closePath()

        ctx.fill()
    }

    /**
     * @param {CanvasRe} ctx 
     */
    renderProjectile(ctx) {
        let bullet = this.data.projectile

        ctx.beginPath()
        ctx.arc(
            bullet.x, bullet.y,
            10,
            0, Math.PI * 2
        )
        ctx.closePath()

        ctx.fill()
    }


    /**
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Ring} ring
     */
    renderRing(ctx, ring) {
        ring.items.forEach(item => {
            switch (item.type) {
                case "ball":
                case "pulsingBall":
                    ctx.beginPath()

                    ctx.arc(
                        item.distance * Math.cos(2 * Math.PI * item.angle),
                        item.distance * Math.sin(2 * Math.PI * item.angle),
                        item.radius,
                        0, 2 * Math.PI
                    )

                    ctx.fill()
                    break
                case "bar":
                case "marqueeBar":
                    ctx.beginPath()

                    ctx.lineWidth = item.radius * 2

                    ctx.arc(
                        0, 0, item.distance,
                        2 * Math.PI * item.angleStart,
                        2 * Math.PI * (item.angleStart + item.angleLength)
                    )

                    ctx.stroke()
            }
        })
    }

    updateDOM() {
        if (this.dom.getAttribute("data-mode") != this.data.mode)
            this.dom.setAttribute("data-mode", this.data.mode)

        this.dom.querySelector("div.stat.level p.value").textContent = this.data.levelIndex
        this.dom.querySelector("div.stat.record p.value").textContent = this.data.userRecord

        this.dom.querySelector("div.progress p.time").textContent = this.data.slow.time.toFixed(1) + " s"
        this.dom.querySelector("div.progress div").style.width = `${this.data.slow.time * 10}%`
    }

    render() {
        let boundingBox = this.dom.getBoundingClientRect()
        let minWidth = Math.min(
            boundingBox.width,
            boundingBox.height - 160
        )

        this.updateDOM()

        let computedStyles = getComputedStyle(this.dom)

        let canvas = this.dom.querySelector("canvas")

        if (canvas.width != minWidth || canvas.height != minWidth) {
            canvas.width = minWidth
            canvas.height = minWidth
        }

        let ctx = canvas.getContext("2d")

        ctx.setTransform(1, 0, 0, 1, 0, 0)

        ctx.fillStyle = computedStyles.getPropertyValue("--g4-game-background")

        if (this.data.slow.isSlow) ctx.globalAlpha = 0.2
        ctx.fillRect(0, 0, minWidth, minWidth)
        ctx.globalAlpha = 1

        let levelRadius = this.getLevelRadius()
        let levelScale = (minWidth / 2) / levelRadius
        levelScale = Math.min(levelScale, 1.2)

        ctx.fillStyle = "#fff"
        ctx.strokeStyle = "#fff"

        ctx.translate(minWidth / 2, minWidth / 2)
        ctx.scale(levelScale, levelScale)

        this.data.rings.forEach((ring, i) => {
            let property = "--g4-game-obstacle" + ((i % 2) + 1)
            ctx.fillStyle = computedStyles.getPropertyValue(property)
            ctx.strokeStyle = computedStyles.getPropertyValue(property)

            ctx.globalAlpha = ring.isDistraction ? 0.4 : 1

            this.renderRing(ctx, ring)
        })

        ctx.globalAlpha = 1

        ctx.fillStyle = computedStyles.getPropertyValue("--g4-game-cannon")
        this.renderCannon(ctx)

        if (this.data.projectile) {
            ctx.fillStyle = computedStyles.getPropertyValue("--g4-game-bullet")
            this.renderProjectile(ctx)
        }
    }

    /**
     * @param {String} mode 
     * @param {Number} levelIndex 
     */
    generateLevel(mode, levelIndex) {
        if (!this.data) {
            this.data = LevelGenerator.generate(
                levelIndex, 0, mode
            )
        } else {
            this.data.levelIndex = levelIndex
            this.data.mode = mode

            this.data.rings = LevelGenerator.generateRings(mode, levelIndex)
        }

        this.advanceLevel(this.gameTime)

        this.updateRecord()
        this.sendStateChange()
    }

    sendStateChange() {
        window.dispatchEvent(
            new CustomEvent(
                "g4statechange",
                {
                    detail: {
                        mode: this.data.mode,
                        levelIndex: this.data.levelIndex,
                        record: this.data.userRecord
                    }
                }
            )
        )
    }

    nextLevel() {
        this.data.slow.time = Math.min(this.data.slow.time + 0.2, 10)
        this.generateLevel(
            this.data.mode, this.data.levelIndex + 1
        )
    }

    resetProgress() {
        this.data.slow.time = Math.min(this.data.slow.time, 0.6)

        this.generateLevel(
            this.data.mode, 0
        )

        this.dom.classList.add("hit")
        setTimeout(() => {
            this.dom.classList.remove("hit")
        }, 500)
    }

    updateRecord() {
        let storageKey = "g4game_record"
        if (this.data.mode != "normal") {
            let mode = this.data.mode

            storageKey += mode[0].toUpperCase() + mode.substring(1)
        }

        let record = 0
        if (localStorage.getItem(storageKey)) record = localStorage.getItem(storageKey)

        if (this.data.levelIndex > record) record = this.data.levelIndex
        localStorage[storageKey] = record

        this.data.userRecord = record

        Leaderboard.setScore(this.data.mode, record).then(() => {
            Leaderboard.updateLeaderboard(this.data.mode)
        })
    }

    /**
     * @param {KeyboardEvent} event 
     */
    handleKeyboardEvent(event) {
        if (this.isSpectated) return

        if (event.code == "Space" && !this.data.projectile)
            this.shoot()
        else if (event.code == "KeyS" && !this.data.slow.isSlow && this.data.slow.time) {
            this.data.slow.isSlow = true
            this.dom.classList.add("slow")
        }
    }
}