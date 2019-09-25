(() => {
    /**
     * @type {Game[]}
     */
    let games = []

    let mainGame = new Game(
        null, false, "",
        new Leaderboard()
    )

    prepG4AccountUI(mainGame.leaderboard)

    mainGame.generateLevel("easy", 0)

    document.querySelector("main").appendChild(mainGame.dom)
    mainGame.resizeCanvas()

    games.push(mainGame)

    // Load audio & stuff
    loadAssets().then(() => {
        document.querySelector("audio#gameAudio").src = "res/music/easy.mp3"
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

        games.forEach(game => game.render())

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
    }, 1000 / physicsFps)

    // Mode changing buttons
    document.querySelectorAll("section.gameMode button").forEach(button => {
        button.addEventListener("click", () => {
            if (mainGame.data.mode == button.getAttribute("data-mode")) return

            mainGame.generateLevel(
                button.getAttribute("data-mode"),
                0
            )
            mainGame.data.slow = {
                time: 0,
                isSlow: false
            }

            document.querySelector("section.gameMode button.active").classList.remove("active")
            button.classList.add("active")

            let audio = document.querySelector("audio#gameAudio")
            let audioState = !audio.paused && !audio.ended && audio.readyState > 2

            let currentTime = audio.currentTime

            // Temporary (until we get all modes music'd up)
            audio.src = "res/music/normal.mp3"
            if (mainGame.data.mode == "easy") {
                audio.src = "res/music/easy.mp3"
            } else if (mainGame.data.mode == "hell") {
                audio.src = "res/music/hell.mp3"
            }

            if (audioState) {
                let timestamp = Date.now()
                audio.play().then(() => {
                    audio.currentTime = currentTime % audio.duration + (Date.now() - timestamp) / 1000
                })
            }
        })
    })

    addEventListener("keyup", (e) => {
        games.forEach(game => game.handleKeyboardEvent(e))
    })
})()