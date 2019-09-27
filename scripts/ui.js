/*
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
*/
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
    let zIndex = 2000 + document.querySelectorAll("dialog.open").length
    let dialog = document.querySelector("dialog#" + id)

    dialog.classList.add("open")
    dialog.style.zIndex = zIndex
}

function closeWindows() {
    document.querySelectorAll("dialog.open").forEach(d => d.classList.remove("open"))
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

// Open settings
document.querySelector("button#openSettingsBtn").addEventListener("click", () => {
    updateThemeList()
    openWindow("settings")
})

// Music playback
document.querySelector("input#settingMusic").addEventListener("input", function() {
    /**
     * @type {HTMLAudioElement}
     */
    let audio = document.querySelector("audio#gameAudio")

    let state = this.checked

    if (state) {
        audio.play()
    } else {
        audio.pause()
    }
})

// Left side sidebar
if (!localStorage.getItem("g4_leftSidebar")) localStorage["g4_leftSidebar"] = false
if (localStorage["g4_leftSidebar"] == "true") {
    document.querySelector("input#settingLeftBar").checked = true
    document.body.classList.add("left", this.checked)
}

document.querySelector("input#settingLeftBar").addEventListener("input", function() {
    localStorage["g4_leftSidebar"] = this.checked
    document.body.classList.toggle("left", this.checked)
})