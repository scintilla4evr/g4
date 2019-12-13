(() => {
    class Projectile {
        constructor(
            x, y, radius,
            veloX, veloY
        ) {
            this.x = x
            this.y = y
            this.radius = radius
            this.veloX = veloX
            this.veloY = veloY
        }

        /**
         * 
         * @param {Number} time 
         */
        advance(time) {
            this.x += this.veloX * time
            this.y += this.veloY * time
        }
    }

    class Collider {
        /**
         * @param {Projectile} projectile 
         * @returns {Boolean}
         */
        hitTest(projectile) {
            return false
        }
    }

    class RingElement extends Collider {
        /**
         * 
         * @param {CanvasRenderingContext2D} context
         */
        render(context) {}

        /**
         * 
         * @param {Number} dAngle 
         */
        rotate(dAngle) {}

        /**
         * 
         * @param {Number} time 
         */
        advance(time) {}
    }

    class RingBall extends RingElement {
        constructor(angle, distance, radius) {
            super()

            this.angle = angle
            this.distance = distance
            this.radius = radius
        }

        /**
         * @param {Projectile} projectile 
         * @returns {Boolean}
         */
        hitTest(projectile) {
            return Math.hypot(
                this.distance * Math.cos(2 * Math.PI * this.angle) - projectile.x,
                this.distance * Math.sin(2 * Math.PI * this.angle) - projectile.y
            ) < (this.radius + projectile.radius)
        }

        rotate(dAngle) {
            this.angle += dAngle
        }

        render(context) {
            context.beginPath()

            context.arc(
                this.distance * Math.cos(2 * Math.PI * this.angle) + context.canvas.width / 2,
                this.distance * Math.sin(2 * Math.PI * this.angle) + context.canvas.height / 2,
                this.radius,
                0, 2 * Math.PI
            )

            context.fill()
        }
    }

    class RingPulsingBall extends RingBall {
        constructor(angle, distance, radius, pulseFreq) {
            super(angle, distance, radius)

            this.baseRadius = radius
            this.pulseTime = 0
            this.pulseFreq = pulseFreq
        }

        advance(dTime) {
            this.pulseTime += dTime

            this.radius = this.baseRadius + Math.sin(this.pulseTime * 2 * Math.PI * this.pulseFreq) * this.baseRadius / 3
        }
    }

    class RingBar extends RingElement {
        constructor(angleStart, angleLength, distance, radius) {
            super()

            this.angleStart = angleStart
            this.angleLength = angleLength
            this.distance = distance
            this.radius = radius
        }

        /**
         * @param {Projectile} projectile 
         * @returns {Boolean}
         */
        hitTest(projectile) {
            var projAngle = Math.atan2(
                projectile.y, projectile.x
            )
            if (projAngle < 0) projAngle += Math.PI * 2
            projAngle /= Math.PI * 2

            var projDist = Math.hypot(projectile.x, projectile.y)

            var clampedStart = this.angleStart % 1
            var clampedEnd = (clampedStart + this.angleLength) % 1

            var mightCollide = false

            if (clampedStart < clampedEnd) {
                mightCollide = projAngle > clampedStart && projAngle < clampedEnd
            } else {
                mightCollide = projAngle > clampedStart || projAngle < clampedEnd
            }

            if (mightCollide && Math.abs(projDist - this.distance) < (this.radius + projectile.radius))
                return true
            return false
        }

        rotate(dAngle) {
            this.angleStart += dAngle
        }

        render(context) {
            context.beginPath()

            context.lineWidth = this.radius * 2

            context.arc(
                context.canvas.width / 2,
                context.canvas.height / 2,
                this.distance,
                2 * Math.PI * this.angleStart,
                2 * Math.PI * (this.angleStart + this.angleLength)
            )

            context.stroke()
        }
    }

    class RingMarqueeBar extends RingBar {
        constructor(angleStart, angleLength, distance, radius, sweepFreq) {
            super(angleStart, angleLength, distance, radius)
        
            this.sweepFreq = sweepFreq
            this.sweepTime = 0

            this.baseStart = angleStart
            this.baseEnd = angleStart + angleLength
        }

        advance(dTime) {
            this.sweepTime += dTime
            
            var sin = Math.sin(this.sweepTime * 2 * Math.PI * this.sweepFreq) / 2 + 0.5
            this.angleLength = sin * (this.baseEnd - this.baseStart)
            this.angleStart = (this.baseStart + this.baseEnd) / 2 - this.angleLength / 2
        }

        rotate(dAngle) {
            this.baseStart += dAngle
            this.baseEnd += dAngle
        }
    }

    /**
     * Represents a ring of obstacles
     */
    class Ring {
        constructor(
            level,
            speedMult
        ) {
            /**
             * @type {Level}
             */
            this.level = level

            /**
             * @type {Number}
             */
            this.speedMult = speedMult

            /**
             * @type {Number}
             */
            this.rotation = 0

            /**
             * @type {RingElement[]}
             */
            this.elements = []
        }
        /**
         * 
         * @param {CanvasRenderingContext2D} context
         */
        render(context) {
            this.elements.forEach(element => element.render(context))
        }

        advance(time) {
            this.rotation += time * this.speedMult
            this.elements.forEach(element => {
                element.rotate(time * this.speedMult)
                element.advance(time)
            })
        }

        /**
         * 
         * @param {Projectile} projectile 
         * @returns {RingElement}
         */
        getCollidingObject(projectile) {
            for (var element of this.elements) {
                if (element.hitTest(projectile)) return element
            }
            return null
        }
    }

    class Level {
        constructor(bpm) {
            /**
             * @type {Ring[]}
             */
            this.rings = []

            /**
             * @type {Number}
             */
            this.bpm = bpm

            /**
             * @type {Number}
             */
            this.rotation = 0
        }

        static create(difficulties) {
            var level = new Level(16.25)

            var innerRing = new Ring(level, 1)
            innerRing.elements = generateInnerRing(difficulties[0])
            level.rings.push(innerRing)

            if (difficulties[1]) {
                var middleRing = new Ring(level, 0.5)
                middleRing.elements = generateMiddleRing(difficulties[1])
                level.rings.push(middleRing)
            }

            if (difficulties[2]) {
                var outerRing = new Ring(level, 0.25)
                outerRing.elements = generateOuterRing(difficulties[2])
                level.rings.push(outerRing)
            }

            return level
        }

        advance(time) {
            var beatTime = 60 / this.bpm
            this.rotation += time / beatTime

            this.rings.forEach(ring => ring.advance(time / beatTime))
        }

        /**
         * 
         * @param {CanvasRenderingContext2D} context
         */
        render(context) {
            this.rings.forEach(ring => ring.render(context))
        }

        /**
         * 
         * @param {Projectile} projectile 
         * @returns {RingElement}
         */
        getCollidingObject(projectile) {
            for (var ring of this.rings) {
                var element = ring.getCollidingObject(projectile)
                if (element) return element
            }
            return null
        }
    }

    class Game {
        constructor(difficulty) {
            /**
             * @type {Level}
             */
            this.level = null

            /**
             * @type {Projectile}
             */
            this.bullet = null

            /**
             * @type {Number}
             */
            this.playerAngle = 0

            this.difficulty = difficulty

            this.progressionLevel = 0

            this.staticProgression = [
                [1, 0, 0],
                [1, 0, 0],
                [2, 0, 0],
                [2, 0, 0],
                [2, 0, 0],
                [3, 0, 0],
                [3, 0, 1],
                [2, 0, 2],
                [2, 0, 2],
                [2, 0, 2],
                [2, 1, 2],
                [2, 1, 2]
            ]
            this.loopedProgression = [
                [3, 1, 2],
                [2, 2, 2],
                [2, 2, 2],
                [2, 3, 2],
                [2, 3, 1],
                [2, 2, 2],
                [2, 2, 2],
                [3, 1, 2],
                [2, 1, 2],
                [3, 1, 2],
                [2, 2, 2],
                [2, 2, 2],
                [2, 3, 2],
                [3, 3, 3],
                [2, 2, 2],
                [2, 2, 2],
                [3, 1, 2],
                [2, 1, 2]
            ]
        }

        advance(time) {
            this.level.advance(time)

            if (this.bullet) {
                if (Math.hypot(this.bullet.x, this.bullet.y) >= 600) {
                    this.bullet = null
                    this.nextLevel()
                }

                var collision = this.level.getCollidingObject(this.bullet)
                if (collision instanceof RingElement) {
                    this.resetProgress()
                    this.bullet = null
                }
            }

            if (this.bullet) 
                this.bullet.advance(time)

            this.playerAngle -= time * 0.461538461
        }

        /**
         * 
         * @param {CanvasRenderingContext2D} context
         */
        render(context) {
            context.fillStyle = "#dbb986"
            context.strokeStyle = "#dbb986"

            context.clearRect(
                0, 0,
                context.canvas.width, context.canvas.height
            )

            this.level.render(context)

            context.lineWidth = 1

            context.beginPath()
            context.moveTo(
                20 * Math.cos(2 * Math.PI * this.playerAngle) + context.canvas.width / 2,
                20 * Math.sin(2 * Math.PI * this.playerAngle) + context.canvas.height / 2
            )
            context.lineTo(
                20 * Math.cos(2 * Math.PI * this.playerAngle + Math.PI - 0.8) + context.canvas.width / 2,
                20 * Math.sin(2 * Math.PI * this.playerAngle + Math.PI - 0.8) + context.canvas.height / 2
            )
            context.lineTo(
                10 * Math.cos(2 * Math.PI * this.playerAngle + Math.PI) + context.canvas.width / 2,
                10 * Math.sin(2 * Math.PI * this.playerAngle + Math.PI) + context.canvas.height / 2
            )
            context.lineTo(
                20 * Math.cos(2 * Math.PI * this.playerAngle + Math.PI + 0.8) + context.canvas.width / 2,
                20 * Math.sin(2 * Math.PI * this.playerAngle + Math.PI + 0.8) + context.canvas.height / 2
            )
            context.closePath()

            context.fill()

            if (this.bullet) {
                context.beginPath()

                context.arc(
                    this.bullet.x + context.canvas.width / 2,
                    this.bullet.y + context.canvas.height / 2,
                    10,
                    0, 2 * Math.PI
                )

                context.fillStyle = "#ff523b"
                context.fill()
            }
        }

        shoot() {
            var bullet = new Projectile(
                20 * Math.cos(2 * Math.PI * this.playerAngle),
                20 * Math.sin(2 * Math.PI * this.playerAngle),
                7,
                750 * Math.cos(2 * Math.PI * this.playerAngle),
                750 * Math.sin(2 * Math.PI * this.playerAngle)
            )

            this.bullet = bullet
        }

        getProgression() {
            if (this.progressionLevel < this.staticProgression.length) return this.staticProgression[this.progressionLevel]

            var level = (this.progressionLevel - this.staticProgression.length) % this.loopedProgression.length
            return this.loopedProgression[level]
        }

        start() {
            this.level = Level.create(this.getProgression())
            document.querySelector("#levelNum").textContent = this.progressionLevel
            this.updateRecord()
            resizeCanvas()
        }

        nextLevel() {
            this.progressionLevel++
            this.start()
        }

        resetProgress() {
            this.progressionLevel = 0
            this.start()

            document.body.classList.add("hit")
            setTimeout(() => {
                document.body.classList.remove("hit")
            }, 500)
        }

        updateRecord() {
            var record = 0
            if (localStorage.getItem("g4game_record")) record = localStorage.getItem("g4game_record")

            if (this.progressionLevel > record) record = this.progressionLevel
            localStorage.setItem("g4game_record", record)

            document.querySelector("#recordNum").textContent = record
        }
    }

    function generateAngleArrangement(n) {
        var angleBetween = 1 / n
        var shiftAngle = angleBetween / 3
        var isShifted = Math.random() >= 0.5
        var shiftSign = (Math.random() >= 0.5) ? 1 : -1

        var angles = []

        for (var i = 0; i < n; i++) {
            var angle = i * angleBetween

            if (isShifted && n == 4 && i % 2) {
                angle += shiftSign * shiftAngle
            } else if (isShifted && n == 6) {
                if (i % 3 == 0) angle += shiftSign * shiftAngle
                if (i % 3 == 1) angle -= shiftSign * shiftAngle
            }

            angles.push(angle)
        }

        return angles
    }

    function generateInnerRing(difficulty) {
        var n = 2
        if (difficulty == 2) n = Math.floor(Math.random() * 2) + 2
        if (difficulty == 3) n = 4

        n += Math.round(Math.random())

        var elements = []
        var angles = generateAngleArrangement(n)

        for (var i = 0; i < n; i++) {
            var isBall = Math.random() >= 0.5

            if (isBall || (!isBall && i == 0)) {
                elements.push(
                    new RingBall(angles[i], 200, 50)
                )

                if (Math.random() >= 0.5 && difficulty > 1) {
                    elements.push(
                        new RingBall(
                            angles[i] + 0.08, 200, 20
                        ),
                        new RingBall(
                            angles[i] - 0.08, 200, 20
                        )
                    )

                }
            } else if (!isBall && i > 0) {
                var angleStart = angles[i]
                var angleLength = angles[(i + 1) % angles.length] - angleStart
                if (angleLength < 0) angleLength += 1

                elements.push(
                    new RingBar(
                        angleStart, angleLength, 200, 10
                    )
                )

                if (Math.random() >= 0.5) {
                    elements.push(
                        new RingBall(
                            angleStart, 200, 30
                        ),
                        new RingBall(
                            angleStart + angleLength, 200, 30
                        )
                    )
                }
            }
        }

        return elements
    }

    function generateMiddleRing(difficulty) {
        if (difficulty == 1) return []
        var n = (difficulty - 1) * 2
        if (difficulty == 3 && Math.random() >= 0.6) n = 6

        var angles = generateAngleArrangement(n)
        var elements = []

        for (var i = 0; i < n / 2; i++) {
            var angleStart = angles[2 * i]
            var angleLength = angles[2 * i + 1] - angleStart

            if (difficulty == 3 && Math.random() >= 0.5) {
                elements.push(
                    new RingMarqueeBar(angleStart, angleLength, 300, 10, 1)
                )
            } else {
                elements.push(
                    new RingBar(angleStart, angleLength, 300, 10)
                )
            }
        }

        return elements
    }

    function generateOuterRing(difficulty) {
        if (difficulty == 1 && Math.random() >= 0.5) return []
        var n = 3 + Math.round(1.2 * difficulty * Math.random())
        var isPulsing = Math.random() >= 0.5 && difficulty > 1
        var willGenerateBars = difficulty > 2

        var elements = []

        var angles = generateAngleArrangement(n)
        angles.forEach((angle, i) => {
            if (isPulsing && i % 2) {
                elements.push(
                    new RingPulsingBall(angle, 400, 20, 2)
                )
            } else {
                elements.push(
                    new RingBall(angle, 400, 20)
                )
            }
        })

        if (willGenerateBars) {
            for (var i = 0; i < n/2; i++) {
                var angle1 = angles[i * 2]
                var angle2 = angles[(i * 2 + 1) % angles.length]
                if (angle2 < angle1) angle2 += 1

                var angleLength = (angle2 - angle1) * (Math.random() * 0.4 + 0.2)
                var angleStart = (angle1 + angle2) / 2 - angleLength / 2

                elements.push(
                    new RingBar(angleStart, angleLength, 400, 10)
                )
            }
        }

        return elements
    }

    var game = new Game()

    var gameCanvas = document.querySelector("canvas")
    var gameCanvasContext = gameCanvas.getContext("2d")


    game.start()
    game.updateRecord()

    setInterval(() => {
        game.advance(1/120)
    }, 1000/120)

    function render() {
        requestAnimationFrame(render)
        game.render(gameCanvasContext)
    }

    addEventListener("keydown", (e) => {
        if (e.code == "Space" && !game.bullet)
            game.shoot()
    })
    gameCanvas.addEventListener("click", () => {
        if (!game.bullet) game.shoot()
    })

    function resizeCanvas() {
        var minSize = Math.min(innerHeight, innerWidth) - 24

        if (game.level.rings.length < 3 || !game.level.rings[2].elements.length) {
            minSize += 150

            if (game.level.rings.length < 2 || !game.level.rings[1].elements.length) {
                minSize += 80
            }
        }

        if (minSize < 900)
            gameCanvas.style.transform = `translate(-50%, -50%) scale(${minSize/900})`
        else
            gameCanvas.style.transform = `translate(-50%, -50%) scale(1)`
    }

    resizeCanvas()
    addEventListener("resize", () => resizeCanvas())

    var audio = document.querySelector("audio")
    audio.load()

    audio.addEventListener("canplaythrough", () => {
        document.querySelector("#muteMusic").style.display = "initial"
    })

    document.querySelector("#muteMusic").addEventListener("click", function() {
        this.classList.toggle("checked")

        if (this.classList.contains("checked")) {
            this.textContent = "Unmute music"
            audio.pause()
        } else {
            this.textContent = "Mute music"
            audio.play()
        }
    })

    render()
})()