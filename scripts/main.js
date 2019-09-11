(() => {
    /**
     * @type {Game[]}
     */
    let games = []

    let testGame = new Game(
        null, false, ""
    )
    testGame.generateLevel("normal", 0)
    window.game = testGame

    document.querySelector("main").appendChild(testGame.dom)

    games.push(testGame)

    // let spectatedGame = new Game(
    //     JSON.parse(
    //         JSON.stringify(
    //             testGame.data
    //         )
    //     ),
    //     true, "the one on the left"
    // )

    // document.querySelector("main").appendChild(spectatedGame.dom)

    // games.push(spectatedGame)

    // setInterval(() => {
    //     spectatedGame.data = JSON.parse(
    //         JSON.stringify(
    //             testGame.data
    //         )
    //     )
    // }, 250)

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
            if (testGame.data.mode == button.getAttribute("data-mode")) return

            testGame.generateLevel(
                button.getAttribute("data-mode"),
                0
            )
            testGame.data.slow = {
                time: 0,
                isSlow: false
            }

            document.querySelector("section.gameMode button.active").classList.remove("active")
            button.classList.add("active")
        })
    })

    addEventListener("g4statechange", (e) => console.log(e))

    addEventListener("keyup", (e) => {
        games.forEach(game => game.handleKeyboardEvent(e))
    })
})()