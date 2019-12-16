class Chroma {
    constructor(appInfo) {
        this.initialized = false

        this.chromaAppInfo = appInfo

        this.sessionId = null
        this.sessionURL = null

        this.heartbeatTimer = null
    }

    async init() {
        var res = await fetch("http://localhost:54235/razer/chromasdk", {
            method: "POST",
            body: JSON.stringify(this.chromaAppInfo),
            headers: {
                "Content-Type": "application/json"
            }
        })
        var data = await res.json()

        if ("sessionid" in data && "uri" in data) {
            this.sessionId = data.sessionid
            this.sessionURL = data.uri
            this.initialized = true

            this.heartbeatTimer = setInterval(() => {
                fetch(this.sessionURL + "/heartbeat", {
                    method: "PUT"
                })
            }, 1000)
        }
    }

    async unInit() {
        if (!this.initialized) return

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer)
            this.heartbeatTimer = null
        }

        var res = await fetch(this.sessionURL, {
            method: "DELETE"
        })

        this.initialized = false
    }

    async putEffect(device, effectType, effectParam) {
        if (!this.initialized) return

        var res = await fetch(this.sessionURL + "/" + device, {
            method: "PUT",
            body: JSON.stringify({
                effect: effectType,
                param: effectParam
            })
        })

        return (await res.json())
    }
}

class RGBColor {
    constructor(r, g, b, a) {
        this.r = r
        this.g = g
        this.b = b
        this.a = a
    }

    /**
     * @param {RGBColor} dest
     * @returns {RGBColor}
     */
    blend(dest) {
        return new RGBColor(
            this.r * this.a + dest.r * (1 - this.a),
            this.g * this.a + dest.g * (1 - this.a),
            this.b * this.a + dest.b * (1 - this.a),
            1
        )
    }

    /**
     * @param {Number} x
     * @param {RGBColor} c1
     * @param {RGBColor} c2
     */
    static lerp(x, c1, c2) {
        return new RGBColor(
            c1.r + x * (c2.r - c1.r),
            c1.g + x * (c2.g - c1.g),
            c1.b + x * (c2.b - c1.b),
            c1.a + x * (c2.a - c1.a)
        )
    }
}

class RGBEffect {
    constructor(handler) {
        /**
         * @type {RGBHandler}
         */
        this.handler = handler

        this.time = 0
    }

    /**
     * @returns {Boolean}
     */
    get done() {
        return false
    }

    /**
     * @param {Number} x
     * @param {Number} y
     * @returns {RGBColor}
     */
    getColorAt(x, y) {
        return new RGBColor(0, 0, 0, 0)
    }
}

class RGBIdleEffect extends RGBEffect {
    getColorAt(x, y) {
        let cursor = this.time % 1
        let fade = Math.min(
                            Math.abs(x - cursor),
                            Math.abs(x + 1 - cursor),
                            Math.abs(x - 1 - cursor)
                    )
        fade = fade**2

        return RGBColor.lerp(
            fade,
            this.handler.gameColors.background,
            this.handler.gameColors.obstacle1
        )
    }
}

class RGBShootEffect extends RGBEffect {
    get done() {
        return this.time > 0.3
    }

    getColorAt(x, y) {
        let arrowPos = 1 - this.time * 10
        let arrowY = y - Math.abs(x - 0.5) * 2

        if (arrowY < arrowPos) return new RGBColor(0, 0, 0, 0)

        let color = this.handler.gameColors.bullet
        color.a = Math.max(0, 1 - Math.abs(arrowY - arrowPos))

        return color
    }
}

class RGBStack {
    constructor() {
        /**
         * @type {RGBEffect[]}
         */
        this.effectStack = []
    }

    /**
     * @param {RGBEffect} effect
     */
    push(effect) {
        this.effectStack.push(effect)
    }

    pop() {
        this.effectStack.forEach(fx => {
            let index = this.effectStack.indexOf(fx)
            if (fx.done) this.effectStack.splice(index, 1)
        })
    }

    /**
     * @param {Number} x
     * @param {Number} y
     * @returns {RGBColor}
     */
    getColorAt(x, y) {
        let color = new RGBColor(0, 0, 0, 1)

        this.effectStack.forEach(fx => color = fx.getColorAt(x, y).blend(color))

        return color
    }

    nextFrame(dT) {
        this.effectStack.forEach(fx => fx.time += dT)
        this.pop()
    }
}

class RGBHandler {
    constructor() {
        this.gameColors = {}

        this.stack = new RGBStack()
        this.stack.push(new RGBIdleEffect(this))
    }

    async init() {}
    async unInit() {}

    /**
     *
     * @param {String} event
     */
    handleEvent(event) {}

    cssHexToRGBColor(css) {
        css = css.trim()

        return new RGBColor(
            parseInt(css.substring(1, 3), 16) / 255,
            parseInt(css.substring(3, 5), 16) / 255,
            parseInt(css.substring(5, 7), 16) / 255,
            1
        )
    }

    /**
     * @param {HTMLDivElement} gameDOM
     */
    updateGameColors(gameDOM) {
        let computedStyles = getComputedStyle(gameDOM.querySelector("canvas"))

        this.gameColors = {
            background: this.cssHexToRGBColor(computedStyles.getPropertyValue("--g4-game-background")),
            damage: this.cssHexToRGBColor(computedStyles.getPropertyValue("--g4-game-damage")),

            foreground: this.cssHexToRGBColor(computedStyles.getPropertyValue("--g4-game-foreground")),
            obstacle1: this.cssHexToRGBColor(computedStyles.getPropertyValue("--g4-game-obstacle1")),
            obstacle2: this.cssHexToRGBColor(computedStyles.getPropertyValue("--g4-game-obstacle2")),

            cannon: this.cssHexToRGBColor(computedStyles.getPropertyValue("--g4-game-cannon")),
            bullet: this.cssHexToRGBColor(computedStyles.getPropertyValue("--g4-game-bullet"))
        }
    }

    async render() {}

    nextFrame(dT) {
        this.stack.nextFrame(dT)
    }
}

class RazerChromaRGBHandler extends RGBHandler {
    constructor() {
        super()

        this.chroma = new Chroma({
            title: "G4",
            description: "An infinite rage game.",
            author: {
                name: "Team G4",
                contact: "https://g4game.wtf"
            },
            device_supported: [
                "keyboard", "mouse", "headset", "mousepad", "keypad", "chromalink"
            ],
            category: "game"
        })
    }

    async init() {
        await this.chroma.init()
    }

    async unInit() {
        await this.chroma.unInit()
    }

    /**
     * @param {RGBColor} color
     */
    rgbColorToBGR(color) {
        let r = Math.floor(color.r * 255)
        let g = Math.floor(color.g * 255)
        let b = Math.floor(color.b * 255)

        return r | (g << 8) | (b << 16)
    }

    createKeyboardEffect() {
        let array = Array(6).fill(0).map(x => Array(22))

        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 22; x++) {
                let xPos = x / 21, yPos = y / 5
                array[y][x] = this.rgbColorToBGR(this.stack.getColorAt(xPos, yPos))
            }
        }

        return array
    }

    createKeypadEffect() {
        let array = Array(4).fill(0).map(x => Array(5))

        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 5; x++) {
                let xPos = x / 8 + 0.25, yPos = y / 3
                array[y][x] = this.rgbColorToBGR(this.stack.getColorAt(xPos, yPos))
            }
        }

        return array
    }

    createMouseEffect() {
        let array = Array(9).fill(0).map(x => Array(7))

        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 7; x++) {
                let xPos = x / 8, yPos = y / 6
                array[y][x] = this.rgbColorToBGR(this.stack.getColorAt(xPos, yPos))
            }
        }

        return array
    }

    createHeadsetEffect() {
        let array = Array(5)

        for (let x = 0; x < 5; x++) {
            let xPos = x / 4
            array[x] = this.rgbColorToBGR(this.stack.getColorAt(xPos, 1))
        }

        return array
    }

    createMousepadEffect() {
        let array = Array(20)

        for (let x = 0; x < 20; x++) {
            let xPos = x / 19
            array[x] = this.rgbColorToBGR(this.stack.getColorAt(xPos, xPos))
        }

        return array
    }

    async render() {
        if (localStorage["g4_chroma_keyboard"] == "true")
            await this.chroma.putEffect(
                "keyboard", "CHROMA_CUSTOM",
                this.createKeyboardEffect()
            )

        if (localStorage["g4_chroma_keypad"] == "true")
            await this.chroma.putEffect(
                "keypad", "CHROMA_CUSTOM",
                this.createKeypadEffect()
            )

        if (localStorage["g4_chroma_mouse"] == "true")
            await this.chroma.putEffect(
                "mouse", "CHROMA_CUSTOM",
                this.createMouseEffect()
            )

        if (localStorage["g4_chroma_headset"] == "true")
            await this.chroma.putEffect(
                "headset", "CHROMA_CUSTOM",
                this.createHeadsetEffect()
            )

        if (localStorage["g4_chroma_mousepad"] == "true")
            await this.chroma.putEffect(
                "mousepad", "CHROMA_CUSTOM",
                this.createMousepadEffect()
            )

        if (localStorage["g4_chroma_link"] == "true")
            await this.chroma.putEffect(
                "chromalink", "CHROMA_CUSTOM",
                this.createHeadsetEffect()
            )
    }

    handleEvent(event) {
        switch (event) {
            case "shoot":
                this.stack.push(new RGBShootEffect(this))
                break
        }
    }
}
