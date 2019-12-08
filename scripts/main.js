waitForAssetLoad(loadDefaultAssets()).then(() => {
    /**
     * @type {Game[]}
     */
    let games = []

    let mainGame = new Game(
        null, false, "",
        new Leaderboard()
    )

    prepG4AccountUI(mainGame.leaderboard)

    mainGame.generateLevel(gameModes[0], 0)

    document.querySelector("main").appendChild(mainGame.dom)
    mainGame.resizeCanvas()

    games.push(mainGame)

    if (localStorage["g4_glsl_enable"] == "true") mainGame.initWebGL()

    // Owo Chroma
    let chroma = new RazerChromaRGBHandler()
    let chromaInterval
    mainGame.rgbHandler = chroma

    let initChroma = async () => {
        await chroma.init()
            
        chromaInterval = setInterval(async () => {
            chroma.updateGameColors(mainGame.dom)
            await chroma.render()
            chroma.nextFrame(1 / 30)
        }, 1000 / 30)
    }
    let unInitChroma = async () => {
        clearInterval(chromaInterval)
        await chroma.unInit()
    }

    addEventListener("beforeunload", async () => {
        unInitChroma()
    })

    // Chroma on/off
    if (!localStorage.getItem("g4_chromaEnabled")) localStorage["g4_chromaEnabled"] = false
    if (localStorage["g4_chromaEnabled"] == "true") {
        document.querySelector("input#settingEnableChroma").checked = true
        document.querySelector("input#settingEnableChroma").classList.add("loading")
        document.querySelectorAll("div.setting.chroma").forEach(s => s.classList.remove("disabled"))

        initChroma().then(() => {
            document.querySelector("input#settingEnableChroma").classList.remove("loading")
        })
    }

    document.querySelector("input#settingEnableChroma").addEventListener("input", function() {
        localStorage["g4_chromaEnabled"] = this.checked
        document.querySelector("input#settingEnableChroma").classList.add("loading")
        document.querySelectorAll("div.setting.chroma").forEach(s => s.classList.toggle("disabled", !this.checked))

        if (this.checked) {
            initChroma().then(() => {
                document.querySelector("input#settingEnableChroma").classList.remove("loading")
            })
        } else {
            unInitChroma().then(() => {
                document.querySelector("input#settingEnableChroma").classList.remove("loading")
            })
        }
    })

    // Legit Verified Amirite
    document.querySelector("input#settingVerifiedLegit").addEventListener("input", function() {
        localStorage["g4_showLegitTM"] = this.checked ? "1": "0"
        mainGame.leaderboard.updateLeaderboard(
            mainGame.data.mode
        )
    })

    // Game interaction events
    addEventListener("keydown", (e) => {
        games.forEach(game => game.handleKeyboardEvent(e))
    })
    addEventListener("g4gamepadbuttonpressed", (e) => {
        games.forEach(game => game.handleGamepadEvent(e))
    })

    // Load audio & stuff
    waitForAssetLoad(getNativeModeMusicAssets()).then(() => {
        document.querySelector("label[for=settingMusic]").classList.remove("loading")
    })

    // On window resize, resize the canvases
    window.addEventListener("resize", () => {
        games.forEach(game => game.resizeCanvas())
    })

    // DOM update "loop"
    setInterval(() => {
        games.forEach(game => game.updateDOM())
    }, 1000 / 30)

    // Rendering "loop"
    let previousTimestamp = null
    let fpsCounter = document.querySelector("span.fpsCounter")

    function renderAllGames(timestamp) {
        if (previousTimestamp) {
            let frameTime = timestamp - previousTimestamp
            let frameRate = 1000 / frameTime

            fpsCounter.textContent = Math.round(frameRate)
        }

        requestAnimationFrame(renderAllGames)

        games.forEach(game => {
            game.render()

            if (game.glslCanvas) {
                game.renderPasses()
                game.renderWebGL()
            }
        })

        // Render static previews
        document.querySelectorAll("dialog.open div.game.modePreview").forEach(gameDOM => {
            // previews have dom.game attrs
            gameDOM.game.advance(1 / 90)
            gameDOM.game.render()            
        })

        previousTimestamp = timestamp
    }

    requestAnimationFrame(renderAllGames)

    let physicsFps = 90
    let processSpectated = true
    // Physics "loop"
    setInterval(() => {
        games.forEach(game => {
            if (!game.isSpectated)
                game.advance(1 / physicsFps)
            else if (game.isSpectated && processSpectated)
                game.advance(2 / physicsFps)
        })

        processSpectated = !processSpectated

        processGamepadInputs()
    }, 1000 / physicsFps)

    addEventListener("g4modechange", (e) => {
        let mode = e.detail.mode

        mainGame.generateLevel(
            mode,
            0
        )
        mainGame.data.slow = {
            time: 0,
            isSlow: false
        }
        
        if (mode instanceof NativeMode) {
            let bgmAsset = getAsset(null, `g4mode_${mainGame.currentMode.modeId}_bgm`)
            getAudioCategory("bgm").replace(
                0,
                new AudioItem(bgmAsset, "looped")
            )
        } else if (mode instanceof CustomMode) {
            let bgmAsset = getAsset(null, `g4mode_easy_bgm`)

            if ("getMusic" in mode) {
                let link = mode.getMusic()

                if (link) {
                    let asset = getAssetFromLink(link)

                    if (asset && asset instanceof AudioAsset) {
                        bgmAsset = asset
                    }
                }
            }
            
            getAudioCategory("bgm").replace(
                0,
                new AudioItem(bgmAsset, "looped")
            )
        }
    })

    window.getActiveMode = () => mainGame.currentMode

    updateModeButtons()

    document.querySelector("button#openGame").addEventListener("click", () => {
        document.querySelector("div.loadingScreen").classList.add("hidden")
        getAudioCategory("bgm").replace(
            0,
            new AudioItem(
                getAsset(null, `g4mode_easy_bgm`),
                "looped"
            )
        )

        dispatchEvent(new CustomEvent("g4runall"))
    })
})