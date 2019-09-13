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

// Leaderboard nickname
if (Leaderboard.getNickname()) {
    let btn = document.querySelector("#setNicknameBtn")
    btn.parentNode.removeChild(btn)
} else {
    document.querySelector("#setNicknameBtn").addEventListener("click", function(e) {
        showDialog("setNickname", this)
        e.stopPropagation()
    })
}

document.querySelector("dialog#setNickname button").addEventListener("click", () => {
    let nickname = document.querySelector("#userNickname").value

    if (nickname) {
        Leaderboard.isNicknameAvailable(nickname).then((available) => {
            document.querySelector("dialog#setNickname p.error").classList.toggle("hidden", available)

            if (available) {
                Leaderboard.setNickname(nickname).then(() => {
                    document.querySelector("dialog#setNickname").classList.remove("open")

                    let btn = document.querySelector("#setNicknameBtn")
                    btn.parentNode.removeChild(btn)
                })
            }
        })
    }
})

// Dialog hiding
window.addEventListener("click", (e) => {
    let activeDialog = document.querySelector("dialog.open")

    if (activeDialog && !e.path.includes(activeDialog))
        activeDialog.classList.remove("open")
})

/**
 * 
 * @param {String} dialogId 
 * @param {HTMLButtonElement} button 
 */
function showDialog(dialogId, button) {
    let dialog = document.querySelector("dialog#" + dialogId)

    dialog.classList.add("open")

    let top = button.getBoundingClientRect().bottom
    dialog.style.top = `${top + 4}px`
}