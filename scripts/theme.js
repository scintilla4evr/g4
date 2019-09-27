let themeKeyNames = {
    "background": "Background",
    "foreground": "Foreground",
    "headerBackground": "Header background",
    "accent": "Accent color",
    "scrollTrack": "Scrollbar track color",
    "scrollThumb": "Scrollbar thumb color",

    "damage": "Background after damage",
    "obstacle1": "Obstacle color #1",
    "obstacle2": "Obstacle color #2",
    "cannon": "Cannon color",
    "bullet": "Bullet color",

    "colors": "Theme colors",
    "app": "Sidebar",
    "game": "Game modes",

    "easy": "Easy mode",
    "normal": "Normal mode",
    "hard": "Hard mode",
    "hell": "Hell mode",
    "hades": "Hades mode",
    "denise": "Chaos mode",
    "reverse": "Reverse mode",
    "nox": "Nox mode",
}

async function loadTheme(name) {
    let data = await fetch(
        `res/themes/${name}.json`
    )
    return await data.json()
}

async function loadDefaultThemes(replace) {
    let themes = [
        await loadTheme("dark"),
        await loadTheme("light")
    ]

    if (replace) {
        let storedThemes = JSON.parse(localStorage["g4_themes"])
        
        themes.forEach((t, i) => storedThemes[i] = t)

        localStorage["g4_themes"] = JSON.stringify(storedThemes)
    } else {
        localStorage["g4_themes"] = JSON.stringify(themes)
    }
}

function createCSSVars(compStyles, obj, prefix) {
    for (let key in obj) {
        let value = obj[key]
        let property = prefix + "-" + key

        if (typeof value === "string") {
            compStyles.setProperty(property, value)
        } else {
            createCSSVars(compStyles, value, property)
        }
    }
}

function applyTheme() {
    if (!localStorage.getItem("g4_currentTheme")) localStorage["g4_currentTheme"] = 1

    let themes = JSON.parse(localStorage["g4_themes"])
    let theme = themes[localStorage["g4_currentTheme"] - 1]

    createCSSVars(
        document.documentElement.style,
        theme.colors, "--g4-theme")
}

function setTheme(id) {
    localStorage["g4_currentTheme"] = id
    applyTheme()
    updateThemeList()
}

function updateTheme(id, theme) {
    let themes = JSON.parse(localStorage["g4_themes"])

    themes[id - 1] = theme
    localStorage["g4_themes"] = JSON.stringify(themes)

    applyTheme()
    updateThemeList()
}

function createThemeDOM(dom, obj, theme, id) {
    for (var key in obj) {
        if (key == "name") continue

        let value = obj[key]

        if (typeof value === "string") {
            let div = document.createElement("div")
            div.classList.add("color")
            div.setAttribute("data-key", key)

            let label = document.createElement("label")
            label.textContent = themeKeyNames[key]
            div.appendChild(label)

            let color = document.createElement("input")
            color.type = "color"
            color.value = value
            color.colorObj = obj
            div.appendChild(color)

            color.addEventListener("input", function() {
                let key = this.parentElement.getAttribute("data-key")

                this.colorObj[key] = this.value

                updateTheme(id, theme)
            })
        
            dom.appendChild(div)
        } else {
            let div = document.createElement("div")
            div.classList.add("colors")
            div.setAttribute("data-key", key)

            let h2 = document.createElement("h2")
            h2.textContent = themeKeyNames[key]
            div.appendChild(h2)

            createThemeDOM(div, value, theme, id)
        
            dom.appendChild(div)
        }
    }
}

function editTheme(id) {
    let themes = JSON.parse(localStorage["g4_themes"])
    let theme = themes[id - 1]

    let editor = document.querySelector("dialog#themeEditor content")

    editor.querySelector("#themeName").value = theme.name
    editor.querySelector("#themeName").oninput = function() {
        theme.name = this.value
        updateTheme(id, theme)
    }

    let colors = editor.querySelector("div.themeColors")
    colors.innerHTML = ""

    createThemeDOM(colors, theme, theme, id)

    openWindow("themeEditor")
}

function deleteTheme(id) {
    let themes = JSON.parse(localStorage["g4_themes"])
    let current = localStorage["g4_currentTheme"]

    if (current > id) current--

    themes.splice(id - 1, 1)

    localStorage["g4_themes"] = JSON.stringify(themes)
    localStorage["g4_currentTheme"] = current

    updateThemeList()
}

function updateThemeList() {
    let list = document.querySelector("div.themeList")
    list.innerHTML = ""

    let themes = JSON.parse(localStorage["g4_themes"])

    for (let theme of themes) {
        let themeId = themes.indexOf(theme) + 1

        let div = document.createElement("div")
        div.classList.add("theme")

        div.style.setProperty(
            "--g4-app-background",
            theme.colors.app.background
        )
        div.style.setProperty(
            "--g4-app-foreground",
            theme.colors.app.foreground
        )
        div.style.setProperty(
            "--g4-app-header-background",
            theme.colors.app.headerBackground
        )

        if (localStorage.g4_currentTheme == themeId) div.classList.add("current")

        let name = document.createElement("p")
        name.textContent = theme.name
        div.appendChild(name)

        let cloneBtn = document.createElement("button")
        cloneBtn.textContent = "Clone"
        div.appendChild(cloneBtn)

        cloneBtn.addEventListener("click", (e) => {
            duplicateTheme(themeId)

            e.stopPropagation()
        })

        if (themeId > 2) {
            let editBtn = document.createElement("button")
            editBtn.textContent = "Edit"
            div.appendChild(editBtn)
    
            editBtn.addEventListener("click", (e) => {
                editTheme(themeId)

                e.stopPropagation()
            })

            if (localStorage.g4_currentTheme != themeId) {
                let deleteBtn = document.createElement("button")
                deleteBtn.textContent = "Delete"
                div.appendChild(deleteBtn)
        
                deleteBtn.addEventListener("click", (e) => {
                    deleteTheme(themeId)

                    e.stopPropagation()
                })
            }
        }

        div.addEventListener("click", () => {
            setTheme(themeId)
        })

        list.appendChild(div)
    }
}

function duplicateCurrentTheme() {
    let themes = JSON.parse(localStorage["g4_themes"])
    let theme = {...themes[localStorage["g4_currentTheme"] - 1]}

    theme.name = "Theme #" + (themes.length + 1)

    themes.push(theme)

    localStorage["g4_themes"] = JSON.stringify(themes)
    localStorage["g4_currentTheme"] = themes.length
    applyTheme()
    updateThemeList()
}

function duplicateTheme(themeId) {
    let themes = JSON.parse(localStorage["g4_themes"])
    let theme = {...themes[themeId - 1]}

    theme.name = theme.name + " - copy"

    themes.push(theme)

    localStorage["g4_themes"] = JSON.stringify(themes)
    localStorage["g4_currentTheme"] = themes.length
    updateThemeList()
}

loadDefaultThemes(!!localStorage.getItem("g4_themes")).then(() => applyTheme())