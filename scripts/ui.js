// Day/night mode
document.querySelector("button.daynight").addEventListener("click", () => {
    document.body.classList.toggle("light")
    
    localStorage.setItem(
        "g4_lightmode",
        document.body.classList.contains("light") ? 1 : 0
    )
})

// Check for light mode
if (localStorage.getItem("g4_lightmode") == 1) {
    document.body.classList.add("light")
}

// First time hint
if (!localStorage.getItem("g4_hideHint")) {
    document.querySelector("div.firstTimeHint").classList.remove("hidden")
    localStorage.setItem("g4_hideHint", true)

    setTimeout(() => {
        document.querySelector("div.firstTimeHint").classList.add("hidden")
    }, 3500)
}

// Sidebar expander
document.querySelector("button.expander").addEventListener("click", () => {
    document.querySelector("aside").classList.toggle("expanded")
})

// Sidebar windows
document.querySelectorAll("dialog").forEach(dialog => {
    dialog.querySelector("button.close").addEventListener("click", () => {
        dialog.classList.remove("open")
    })
})

function openWindow(id) {
    if (document.querySelector("dialog.open")) {
        document.querySelector("dialog.open").classList.remove("open")
    }

    document.querySelector("dialog#" + id).classList.add("open")
}

function closeWindows() {
    if (document.querySelector("dialog.open")) {
        document.querySelector("dialog.open").classList.remove("open")
    }
}

// G4 Account
/**
 * 
 * @param {Leaderboard} leaderboard 
 */
function prepG4AccountUI(leaderboard) {
    document.querySelector("button#openLoginBtn").addEventListener("click", () => {
        openWindow("login")
    })

    document.querySelector("button#goToRegisterBtn").addEventListener("click", () => {
        openWindow("register")
    })

    document.querySelector("button#logoutBtn").addEventListener("click", () => {
        leaderboard.logout()
    })

    document.querySelector("button#loginBtn").addEventListener("click", () => {
        let err = document.querySelector("dialog#login p.error")
        err.classList.remove("visible")

        let username = document.querySelector("input#loginUsername").value
        let passwd = document.querySelector("input#loginPassword").value

        if (!username || !passwd) {
            err.textContent = "Incomplete login information."
            err.classList.add("visible")
            return
        }

        try {
            leaderboard.loginAccount(
                username, passwd
            ).then(result => {
                if (result) {
                    closeWindows()
                } else {
                    err.textContent = "Incorrect login information."
                    err.classList.add("visible")
                }
            })
        } catch(e) {
            err.textContent = "Couldn't connect to the server. Try again later."
            err.classList.add("visible")
        }
    })

    document.querySelector("button#registerBtn").addEventListener("click", () => {
        let err = document.querySelector("dialog#register p.error")
        err.classList.remove("visible")

        let username = document.querySelector("input#registerUsername").value
        let passwd = document.querySelector("input#registerPassword").value

        if (!username || !passwd) {
            err.textContent = "Incomplete login information."
            err.classList.add("visible")
            return
        }
        if (username.length > 20) {
            err.textContent = "Username must be 20 characters or less."
            err.classList.add("visible")
            return
        } else if (username.length < 3) {
            err.textContent = "Username must be longer than 2 characters."
            err.classList.add("visible")
            return
        } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            err.textContent = "Username must contain only letters A-Z, numbers and underscores (_)."
            err.classList.add("visible")
            return
        }

        try {
            leaderboard.isUsernameAvailable(username).then(available => {
                if (available) {
                    console.log("available!")
                    leaderboard.registerAccount(username, passwd).then(result => {
                        console.log(result)
                        if (result) {
                            closeWindows()
                        } else {
                            err.textContent = "Couldn't complete account registration. Try again later."
                            err.classList.add("visible")
                        }
                    })
                } else {
                    err.textContent = "This username is already taken."
                    err.classList.add("visible")
                }
            })
        } catch(e) {
            err.textContent = "Couldn't connect to the server. Try again later."
            err.classList.add("visible")
        }
    })
}

// Music playback
document.querySelector("button#musicToggleBtn").addEventListener("click", function() {
    /**
     * @type {HTMLAudioElement}
     */
    let audio = document.querySelector("audio#gameAudio")

    let state = !audio.paused && !audio.ended && audio.readyState > 2
    state = !state

    console.log(state)

    if (state) {
        audio.play()
    } else {
        audio.pause()
    }

    this.classList.toggle("playing", state)
})