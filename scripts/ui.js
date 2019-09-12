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