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