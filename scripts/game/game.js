class Game {
    /**
     * @param {GameData} gameData 
     * @param {Boolean} isSpectated 
     * @param {String} spectatedUser
     * @param {Leaderboard} leaderboard
     */
    constructor(
        gameData,
        isSpectated, spectatedUser,
        leaderboard
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

        /**
         * @type {Mode}
         */
        this.currentMode = null

        /**
         * @type {Leaderboard}
         */
        this.leaderboard = leaderboard

        /**
         * @type {RGBHandler}
         */
        this.rgbHandler = null

        this.glslCanvas = null
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
        <canvas class="viewport"></canvas>
        <canvas class="normalPass hidden"></canvas>
        <canvas class="objectPass hidden"></canvas>
        <canvas class="webGLViewport"></canvas>

        <header>
            ${spectatingHeader}
            <div class="stat deaths">
                <p class="name">Deaths</p>
                <p class="value">0</p>
            </div>
            <div class="stat level">
                <p class="name">Level</p>
                <p class="value">16</p>
            </div>
            <div class="stat record">
                <p class="name">Record</p>
                <p class="value">16</p>
            </div>
        </header>

        <footer>
            <div class="progress">
                <div style="width: 50%"></div>
                <p class="time">5 s</p>
            </div>
            <button>
                Slow mode
            </button>
        </footer>`

        if (!this.isSpectated) {
            div.querySelector("canvas").addEventListener("mouseup", (e) => {
                if (!this.data.projectile && e.button == 0)
                    this.shoot()
            })
            div.querySelector("canvas").addEventListener("touchend", (e) => {
                if (!this.data.projectile)
                    this.shoot()
            })

            div.querySelector("footer button").addEventListener("click", () => {
                if (this.data.slow && !this.data.slow.isSlow)
                    this.enableSlow()
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
                    case "bar":
                    case "h":
                    case "marqueeBar":
                        radius = Math.max(
                            radius,
                            item.distance + item.radius + ring.distance
                        )
                        break
                    case "pulsingBall":
                        radius = Math.max(
                            radius,
                            item.distance + item.baseRadius * 2 + ring.distance
                        )
                        break
                }
            })
        })

        let cannonDistance = Math.hypot(
            this.data.cannon.x, this.data.cannon.y
        )

        radius = Math.max(radius, cannonDistance + 20)

        return radius + 20
    }

    /**
     * @param {Number} dTime 
     * @param {Ring} ring
     */
    advanceRing(dTime, dRawTime, ring, ringIndex) {
        ring.rotation += dTime

        let phase = 2 * Math.PI * ring.revolvePhase
        let centerX = Math.cos(ring.rotation * 2 * Math.PI * ring.revolveFreq + phase) * ring.distance
        let centerY = Math.sin(ring.rotation * 2 * Math.PI * ring.revolveFreq + phase) * ring.distance

        ring.items.forEach(item => {
            if (this.currentMode instanceof CustomMode &&
                "moveElement" in this.currentMode) {
                let isFulfilled = this.currentMode.moveElement(
                    item, ring, ringIndex,
                    dTime, dRawTime, this.gameTime
                )
                if (isFulfilled) return
            }

            item.centerX = centerX
            item.centerY = centerY

            switch (item.type) {
                case "ball":
                    item.angle += dTime
                    while (item.angle < 0) { item.angle += 1 }
                    break
                case "pulsingBall":
                    item.angle += dTime
                    while (item.angle < 0) { item.angle += 1 }
                    item.pulseTime += dRawTime
                    item.radius = item.baseRadius + Math.sin(
                        item.pulseTime * 2 * Math.PI * item.pulseFreq
                    ) * item.baseRadius / 3
                    break
                case "bar":
                    item.angleStart += dTime
                    while (item.angleStart < 0) { item.angleStart += 1 }
                    break
                case "marqueeBar":
                    item.baseStart += dTime
                    while (item.baseStart < 0) { item.baseStart += 1 }
                    item.baseEnd += dTime
                    while (item.baseEnd < 0) { item.baseEnd += 1 }

                    item.sweepTime += dRawTime

                    let sin = Math.sin(
                        item.sweepTime * 2 * Math.PI * item.sweepFreq
                    ) / 2 + 0.5

                    item.angleLength = sin * (item.baseEnd - item.baseStart)
                    item.angleStart = (item.baseStart + item.baseStart) / 2 - item.angleLength / 2

                    break
                case "h":
                    item.angle += dTime * item.direction
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
        let bulletX = bullet.x - item.centerX
        let bulletY = bullet.y - item.centerY

        let bulletAngle = Math.atan2(
            bulletY, bulletX
        )
        if (bulletAngle < 0) bulletAngle += Math.PI * 2
        bulletAngle /= Math.PI * 2

        let bulletDist = Math.hypot(bulletX, bulletY)

        let clampedStart, clampedEnd, mightCollide

        switch (item.type) {
            case "ball":
            case "pulsingBall":
                return Math.hypot(
                    item.distance * Math.cos(2 * Math.PI * item.angle) - bulletX,
                    item.distance * Math.sin(2 * Math.PI * item.angle) - bulletY
                ) < (item.radius + bullet.radius)
            case "bar":
            case "marqueeBar":
                clampedStart = item.angleStart % 1
                clampedEnd = (clampedStart + item.angleLength) % 1

                mightCollide = false

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
            case "h":
        }

        return false
    }

    /**
     * 
     * @param {Projectile} bullet 
     */
    hitTestLevel(bullet) {
        if (!bullet) return false
        
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
        this.data.rings.forEach((ring, i) => this.advanceRing(
            beatTime * ring.speedMult, beatTime,
            ring, i
        ))
    }

    /**
     * @param {Number} dTime 
     */
    advanceCannon(dTime) {
        let beatTime = this.calculateBeatTime(dTime)

        if (this.currentMode instanceof CustomMode &&
            "moveCannon" in this.currentMode) {
            let isFulfilled = this.currentMode.moveCannon(
                this.data.cannon,
                beatTime, dTime, this.gameTime
            )
            if (isFulfilled) return
        }

        this.data.cannon.angle -= beatTime * 1.5

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

    advanceBullet(bullet, dTime) {
        let beatTime = this.calculateBeatTime(dTime)

        if (this.currentMode instanceof CustomMode &&
            "moveBullet" in this.currentMode) {
            let isFulfilled = this.currentMode.moveBullet(
                bullet,
                beatTime, dTime, this.gameTime
            )
            if (isFulfilled) return
        }

        bullet.x += bullet.velocityX * dTime
        bullet.y += bullet.velocityY * dTime
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
            this.advanceBullet(this.data.projectile, dTime)
        }

        // move the cannon
        this.advanceCannon(physTime)

        if (this.data.slow.isSlow) {
            let slow = this.data.slow

            slow.time = Math.max(0, slow.time - dTime)
            if (slow.time == 0) {
                this.disableSlow()
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

        if (this.rgbHandler) this.rgbHandler.handleEvent("shoot")

        getAudioCategory("sfx").add(new AudioItem(getAsset(null, "g4sfx_shoot"), "oneshot"))
    }

    /**
     * @param {CanvasRe} ctx 
     */
    renderCannon(ctx) {
        if (this.currentMode instanceof CustomMode && "renderCannon" in this.currentMode) {
            this.currentMode.renderCannon(
                this.data.cannon,
                LevelRenderer.createViewportFromCanvas(ctx.canvas),
                this.gameTime
            )
            return
        }
        
        ctx.fill(
            LevelRenderer.getCannonPath(this.data.cannon)
        )
    }

    /**
     * @param {CanvasRe} ctx 
     */
    renderProjectile(ctx) {
        if (this.currentMode instanceof CustomMode && "renderProjectile" in this.currentMode) {
            this.currentMode.renderProjectile(
                this.data.projectile,
                LevelRenderer.createViewportFromCanvas(ctx.canvas),
                this.gameTime
            )
            return
        }

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
    renderRing(ctx, ring, ringIndex, levelScale) {
        if (this.currentMode instanceof CustomMode && "renderRing" in this.currentMode) {
            let isFulfilled = this.currentMode.renderRing(
                ring, ringIndex,
                LevelRenderer.createViewportFromCanvas(ctx.canvas),
                this.gameTime
            )

            if (isFulfilled) return
        }

        ring.items.forEach(item => {                
            this.resetTransform(ctx, levelScale)

            if (this.currentMode instanceof CustomMode && "renderElement" in this.currentMode) {
                let isFulfilled = this.currentMode.renderElement(
                    item, ring, ringIndex,
                    LevelRenderer.createViewportFromCanvas(ctx.canvas),
                    this.gameTime
                )

                if (isFulfilled) return
            }

            ctx.fill(
                LevelRenderer.getElementPath(item)
            )
        })
    }

    enableSlow() {
        this.data.slow.isSlow = true

        this.dom.classList.add("slow")

        enableSlowAudioEffect()
    }

    disableSlow() {
        if (!this.data.slow.isSlow) return
        this.data.slow.isSlow = false

        this.dom.classList.remove("slow")

        disableSlowAudioEffect()
    }

    updateDOM() {
        if (this.dom.getAttribute("data-mode") != this.data.mode)
            this.dom.setAttribute("data-mode", this.data.mode)

        if (this.currentMode instanceof CustomMode) {
            let colors = mode.getColors()

            for (let color in colors) {
                this.dom.style.setProperty("--g4-game-custom-" + color, colors[color])
            }
        }

        var index = this.data.levelIndex
        if (this.currentMode instanceof CustomMode && "getLevelName" in this.currentMode) {
            index = this.currentMode.getLevelName(
                index
            )
        }

        this.dom.querySelector("div.stat.level p.value").textContent = index
        this.dom.querySelector("div.stat.record p.value").textContent = this.data.userRecord
        this.dom.querySelector("div.stat.deaths p.value").textContent = this.data.userDeaths

        this.dom.querySelector("div.progress p.time").textContent = this.data.slow.time.toFixed(1) + " s"
        this.dom.querySelector("div.progress div").style.width = `${this.data.slow.time * 10}%`
    }

    resizeCanvas() {
        let boundingBox = this.dom.getBoundingClientRect()

        let canvas = this.dom.querySelector("canvas.viewport")
        let auxCanvases = [
            this.dom.querySelector("canvas.webGLViewport"),
            this.dom.querySelector("canvas.objectPass"),
            this.dom.querySelector("canvas.normalPass")
        ]

        if (canvas.width != boundingBox.width || canvas.height != boundingBox.height) {
            canvas.width = boundingBox.width
            canvas.height = boundingBox.height
            auxCanvases.forEach(c => {
                c.width = boundingBox.width
                c.height = boundingBox.height
            })
        }
    }

    resetTransform(ctx, levelScale) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2)
        ctx.scale(levelScale, levelScale)

        ctx.globalCompositeOperation = "source-over"
    }

    initWebGL() {
        let canvas = this.dom.querySelector("canvas.viewport")

        let nrmCanvas = this.dom.querySelector("canvas.normalPass")
        let objCanvas = this.dom.querySelector("canvas.objectPass")

        let wGLCanvas = this.dom.querySelector("canvas.webGLViewport")

        this.glslCanvas = new GlslCanvas(wGLCanvas)

        this.glslCanvas.loadTexture("u_game", canvas)

        if (localStorage["g4_glsl_pass_normal"] == "true") this.glslCanvas.loadTexture("u_normal", nrmCanvas)
        if (localStorage["g4_glsl_pass_object"] == "true") this.glslCanvas.loadTexture("u_object", objCanvas)

        this.glslCanvas.load(`
        #ifdef GL_ES
        precision mediump float;
        #endif 

        #define PI 3.1415926
        #define MAX_DEPTH 3

        uniform vec2 u_resolution;
        uniform float u_time;

        uniform sampler2D u_game;
        uniform sampler2D u_normal;
        uniform sampler2D u_object;

        vec3 getNormal(vec2 coords) {
            vec3 nrmColor = texture2D(u_normal, coords).rgb;

            return nrmColor * 2.0 - 1.0;
        }

        vec3 getDiffuseColor(vec2 coords) {
            vec3 color = texture2D(u_game, coords).rgb;
            vec3 n = getNormal(coords);
            vec3 diffuseColor = vec3(0.0, 0.0, 0.0);

            diffuseColor += dot(
                n,
                normalize(vec3(0.0, 0.3, 1.0))
            ) * vec3(1.0, 1.0, 1.0) * color;

            return diffuseColor;
        }

        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            vec3 color = texture2D(u_game, st).rgb;
            vec3 object = texture2D(u_object, st).rgb;
            vec3 color2;
            vec3 n = getNormal(st);
            vec2 reflectedSt = st;
            vec3 ambient = texture2D(u_game, vec2(0.0, 0.0)).rgb;

            vec3 diffuseColor = getDiffuseColor(st) + ambient * color;

            float angle = dot(n, vec3(0.0, 0.0, 1.0));

            if (object.g < 1.0) {
                color = texture2D(u_game, st).rgb;
            } else {
                reflectedSt += vec2(0.1 * n.x, 0.1 * n.y);
                color2 = getDiffuseColor(reflectedSt);

                if (dot(
                    n,
                    normalize(vec3(0.0, 0.3, 1.0))
                ) > 0.98) {
                    color2 += 0.6 * vec3(1.0, 1.0, 1.0);
                }

                color = diffuseColor * angle + color2 * (1.0 - angle);
            }

            gl_FragColor = vec4(color, 1.0);
        }
        `)
    }

    renderWebGL() {
        if (!this.glslCanvas) return

        let canvas = this.dom.querySelector("canvas.viewport")

        this.glslCanvas.textures.u_game.update()

        if (this.glslCanvas.textures.u_normal) this.glslCanvas.textures.u_normal.update()
        if (this.glslCanvas.textures.u_object) this.glslCanvas.textures.u_object.update()
    }

    renderPasses() {
        let normalCanvas = this.dom.querySelector("canvas.normalPass")
        let objectCanvas = this.dom.querySelector("canvas.objectPass")

        /**
         * @type {CanvasRenderingContext2D}
         */
        let nrmCtx = normalCanvas.getContext("2d")
        /**
         * @type {CanvasRenderingContext2D}
         */
        let objCtx = objectCanvas.getContext("2d")

        let minWidth = Math.min(
            normalCanvas.width,
            normalCanvas.height - 160
        )

        let levelRadius = this.getLevelRadius()
        let levelScale = (minWidth / 2) / levelRadius
        levelScale = Math.min(levelScale, 1.2)
        
        objCtx.setTransform(1, 0, 0, 1, 0, 0)

        objCtx.fillStyle = "#000000"
        objCtx.fillRect(0, 0, objectCanvas.width, objectCanvas.height)

        nrmCtx.clearRect(0, 0, normalCanvas.width, normalCanvas.height)
        nrmCtx.globalCompositeOperation = "source-over"

        this.resetTransform(nrmCtx, levelScale)
        this.resetTransform(objCtx, levelScale)

        this.data.rings.forEach(ring => {
            ring.items.forEach(item => {
                let path = LevelRenderer.getElementPath(item)

                if (item instanceof RingBall) {
                    nrmCtx.drawImage(
                        getAsset(null, "g4img_ballNormalMap").image,
                        item.distance * Math.cos(2 * Math.PI * item.angle) + item.centerX - item.radius,
                        item.distance * Math.sin(2 * Math.PI * item.angle) + item.centerY - item.radius,
                        item.radius * 2,
                        item.radius * 2
                    )

                    objCtx.fillStyle = "#FFFF00"
                } else if (item instanceof RingBar) {
                    var bar1 = {
                        ...item,
                        distance: item.distance + item.radius / 2,
                        radius: item.radius / 2
                    }
                    var bar2 = {
                        ...item,
                        distance: item.distance - item.radius / 2,
                        radius: item.radius / 2
                    }

                    nrmCtx.save()
                    nrmCtx.clip(
                        LevelRenderer.getElementPath(bar1)
                    )
                    nrmCtx.drawImage(
                        getAsset(null, "g4img_slope1NormalMap").image,
                        item.centerX - item.radius - item.distance,
                        item.centerY - item.radius - item.distance,
                        (item.distance + item.radius) * 2,
                        (item.distance + item.radius) * 2
                    )
                    nrmCtx.restore()
                    nrmCtx.save()
                    nrmCtx.clip(
                        LevelRenderer.getElementPath(bar2)
                    )
                    nrmCtx.drawImage(
                        getAsset(null, "g4img_slope2NormalMap").image,
                        item.centerX - item.radius - item.distance,
                        item.centerY - item.radius - item.distance,
                        (item.distance + item.radius) * 2,
                        (item.distance + item.radius) * 2
                    )
                    nrmCtx.restore()

                    objCtx.fillStyle = "#FFFFFF"
                }
                objCtx.fill(path)
            })
        })

        objCtx.fillStyle = "#FF00FF"
        this.resetTransform(objCtx, levelScale)
        this.renderCannon(objCtx)

        if (this.data.projectile) {
            objCtx.fillStyle = "#FF0000"
            this.resetTransform(objCtx, levelScale)
            this.renderProjectile(objCtx)
        }

        nrmCtx.globalCompositeOperation = "destination-over"

        nrmCtx.setTransform(1, 0, 0, 1, 0, 0)
        nrmCtx.fillStyle = "#8080FF"
        nrmCtx.fillRect(0, 0, normalCanvas.width, normalCanvas.height)
    }

    render() {
        let canvas = this.dom.querySelector("canvas.viewport")
        let minWidth = Math.min(
            canvas.width,
            canvas.height - 160
        )

        let computedStyles = getComputedStyle(canvas)

        let ctx = canvas.getContext("2d")

        ctx.setTransform(1, 0, 0, 1, 0, 0)

        ctx.fillStyle = computedStyles.getPropertyValue("--g4-game-background")

        if (this.data.slow.isSlow) ctx.globalAlpha = 0.2
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.globalAlpha = 1

        let levelRadius = this.getLevelRadius()
        let levelScale = (minWidth / 2) / levelRadius
        levelScale = Math.min(levelScale, 1.2)

        ctx.fillStyle = "#fff"
        ctx.strokeStyle = "#fff"

        if (this.currentMode instanceof CustomMode && "renderBackground" in this.currentMode) {
            this.currentMode.renderBackground(
                LevelRenderer.createViewportFromCanvas(ctx.canvas),
                this.gameTime
            )
        }


        this.resetTransform(ctx, levelScale)
        if (this.currentMode instanceof CustomMode && "renderRings" in this.currentMode) {
            this.resetTransform(ctx, levelScale)
            this.currentMode.renderRings(
                this.data.rings,
                LevelRenderer.createViewportFromCanvas(ctx.canvas),
                this.gameTime
            )
        } else {
            this.data.rings.forEach((ring, i) => {
                let property = "--g4-game-obstacle" + ((i % 2) + 1)
                ctx.fillStyle = computedStyles.getPropertyValue(property)
                ctx.strokeStyle = computedStyles.getPropertyValue(property)
    
                ctx.globalAlpha = ring.isDistraction ? 0.4 : 1
    
                this.renderRing(ctx, ring, i, levelScale)
            })
        }

        ctx.globalAlpha = 1

        ctx.fillStyle = computedStyles.getPropertyValue("--g4-game-cannon")
        
        this.resetTransform(ctx, levelScale)
        this.renderCannon(ctx)

        if (this.data.projectile) {
            ctx.fillStyle = computedStyles.getPropertyValue("--g4-game-bullet")
            
            this.resetTransform(ctx, levelScale)
            this.renderProjectile(ctx)
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0)
        if (this.currentMode instanceof CustomMode && "renderForeground" in this.currentMode) {
            this.resetTransform(ctx, levelScale)
            this.currentMode.renderForeground(
                LevelRenderer.createViewportFromCanvas(ctx.canvas),
                this.gameTime
            )
        }
    }

    /**
     * @param {Mode} modeObj 
     * @param {Number} levelIndex 
     */
    async generateLevel(modeObj, levelIndex) {
        let mode = "custom"
        if (modeObj instanceof NativeMode) mode = modeObj.modeId

        this.currentMode = modeObj

        window.mode = this.currentMode

        if (!this.data) {
            this.data = LevelGenerator.generate(
                levelIndex, 0, mode
            )
        } else {
            this.data.levelIndex = levelIndex
            this.data.mode = mode

            this.data.rings = modeObj.generateRings(levelIndex)
        }
        this.disableSlow()

        this.advanceLevel(this.gameTime)

        this.updateRecord()
        this.updateDeaths()
        
        this.sendStateChange()

        document.querySelector("section.leaderboard").style.display = (this.currentMode instanceof CustomMode) ? "none" : "flex"

        await this.updateLeaderboard()
    }

    async updateLeaderboard() {
        if (this.currentMode instanceof CustomMode) return

        await this.leaderboard.postScore(
            this.data.mode,
            this.data.levelIndex,
            this.data.userDeaths
        )
        await this.leaderboard.updateLeaderboard(this.data.mode)
    }

    sendStateChange() {
        console.log({
            mode: this.data.mode,
            levelIndex: this.data.levelIndex,
            record: this.data.userRecord
        })
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
            this.currentMode, this.data.levelIndex + 1
        ).then(() => {
            if (this.currentMode instanceof NativeMode) {
                if (this.data.levelIndex == 1) {
                    this.addAchievement(
                        `game_${this.currentMode.modeId}_firstClear`
                    )
                } else if (this.data.levelIndex == 10) {
                    this.addAchievement(
                        `game_${this.currentMode.modeId}_10thClear`
                    )
                } else if (this.data.levelIndex == 999999) {
                    this.addAchievement(
                        `game_${this.currentMode.modeId}_ninenine`
                    )
                }
            }
        })

        getAudioCategory("sfx").add(new AudioItem(getAsset(null, "g4sfx_succ"), "oneshot"))
    }

    resetProgress() {
        this.data.slow.time = Math.min(this.data.slow.time, 0.6)

        if (this.data.levelIndex == 0 && this.currentMode instanceof NativeMode) {
            this.addAchievement(
                `game_${this.currentMode.modeId}_zeroFail`
            )
        }

        this.generateLevel(
            this.currentMode, 0
        )

        this.addDeath()

        this.dom.classList.add("hit")
        setTimeout(() => {
            this.dom.classList.remove("hit")
        }, 500)

        getAudioCategory("sfx").add(new AudioItem(getAsset(null, "g4sfx_damage"), "oneshot"))
    }

    updateDeaths() {
        let storageKey = "g4game_deaths"
        if (this.data.mode != "normal") {
            let mode = this.data.mode

            storageKey += mode[0].toUpperCase() + mode.substring(1)
        }

        let deaths = 0
        if (localStorage.getItem(storageKey)) deaths = localStorage.getItem(storageKey)

        localStorage[storageKey] = deaths

        this.data.userDeaths = deaths
    }

    async addAchievement(id) {
        if (this.isSpectated) return
        if (!this.leaderboard) return
        if (this.currentMode instanceof CustomMode) return

        let added = await this.leaderboard.addAchievement(id)

        if (added) {
            let info = this.leaderboard.getAchievementInfo(id)

            showNotification({
                source: null,
                text: `You got the ${info.name} achievement!`
            })
        }
    }

    addDeath() {
        let storageKey = "g4game_deaths"
        if (this.data.mode != "normal") {
            let mode = this.data.mode

            storageKey += mode[0].toUpperCase() + mode.substring(1)
        }

        let deaths = 0
        if (localStorage.getItem(storageKey)) deaths = localStorage.getItem(storageKey)

        deaths++
        localStorage[storageKey] = deaths

        this.data.userDeaths = deaths
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
    }

    /**
     * @param {KeyboardEvent} event 
     */
    handleKeyboardEvent(event) {
        if (this.isSpectated) return
        if (event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLButtonElement) return
            
        if (this.currentMode instanceof CustomMode && "handleKeyPress" in this.currentMode) {
            let isFulfilled = this.currentMode.handleKeyPress(
                event.code
            )

            if (isFulfilled) return
        }

        if (
            (event.code == localStorage["g4input_keyboardShoot"]) &&
            !this.data.projectile
        )
            this.shoot()
        else if (event.code == localStorage["g4input_keyboardSlow"] && !this.data.slow.isSlow && this.data.slow.time) {
            this.enableSlow()
        }
    }

    handleGamepadEvent(event) {
        if (this.isSpectated) return

        if (
            event.detail.button == localStorage["g4input_gamepadShoot"] &&
            !this.data.projectile
        ) {
            this.shoot()
        } else if (
            event.detail.button == localStorage["g4input_gamepadSlow"] &&
            !this.data.slow.isSlow && this.data.slow.time
        ) {
            this.enableSlow()
        }
    }

    static modeIDToDisplayName(mode) {
        let modeAlias = {
            easy: "Easy",
            normal: "Normal",
            hard: "Hard",
            hell: "Hell",
            hades: "Hades",
            denise: "Chaos",
            reverse: "Reverse",
            nox: "Nox",
            polar: "Polar",
            shook: "Shook"
        }

        return modeAlias[mode]
    }
}

class ModePreviewGame extends Game {    
    constructor(
    ) {
        super(null, true, "", null)
    }

    /**
     * @returns {HTMLDivElement}
     */
    createDOM() {
        let div = document.createElement("div")
        div.classList.add("game")
        div.classList.add("modePreview")

        div.innerHTML = `<canvas class="viewport"></canvas>`

        return div
    }

    updateLeaderboard() {}

    updateDOM() {
        if (this.dom.getAttribute("data-mode") != this.data.mode)
            this.dom.setAttribute("data-mode", this.data.mode)
    }
}