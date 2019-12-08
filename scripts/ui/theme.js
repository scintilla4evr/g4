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
    "polar": "Polar mode",
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

function applyThemeToElement(domElement, theme) {
    createCSSVars(
        domElement.style,
        theme.colors, "--g4-theme")
}

function applyTheme() {
    if (!localStorage.getItem("g4_currentTheme")) localStorage["g4_currentTheme"] = 1

    let themes = JSON.parse(localStorage["g4_themes"])
    let theme = themes[localStorage["g4_currentTheme"] - 1]

    applyThemeToElement(document.documentElement, theme)
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
                applyThemeToElement(document.querySelector("dialog#themeEditor div.content"), theme)
            })
        
            dom.appendChild(div)
        } else {
            let div = document.createElement("div")
            div.classList.add("colors")
            div.setAttribute("data-key", key)

            let h2 = document.createElement("h2")
            h2.textContent = themeKeyNames[key]
            div.appendChild(h2)

            if (Game.modeIDToDisplayName(key)) {
                let preview = new ModePreviewGame({})

                preview.dom.children[0].width = 356
                preview.dom.children[0].height = 356

                preview.dom.game = preview

                preview.generateLevel(
                    gameModes.find(m => m instanceof NativeMode && m.modeId == key),
                    15
                )
                preview.updateDOM()

                div.appendChild(
                    preview.dom
                )

                preview.render()
            }

            createThemeDOM(div, value, theme, id)
        
            dom.appendChild(div)
        }
    }
}

function editTheme(id) {
    let themes = JSON.parse(localStorage["g4_themes"])
    let theme = themes[id - 1]

    let editor = document.querySelector("dialog#themeEditor div.content")

    editor.querySelector("#themeName").value = theme.name
    editor.querySelector("#themeName").oninput = function() {
        theme.name = this.value
        updateTheme(id, theme)
    }

    let colors = editor.querySelector("div.themeColors")
    colors.innerHTML = ""

    applyThemeToElement(editor, theme)

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

        applyThemeToElement(div, theme)

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

        console.log(theme)

//         div.innerHTML = `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
//         viewBox="0 0 512 320" style="enable-background:new 0 0 512 320;" xml:space="preserve">
//    <g>
//        <rect class="st0" width="320" height="320"/>
//    </g>
//    <g>
//        <rect x="320" class="st1" width="192" height="320"/>
//    </g>
//    <path class="st2" d="M288,160c0,17.7-14.3,32-32,32s-32-14.3-32-32c0-13.8,8.7-25.5,20.8-30c-9-25.5-29.3-45.8-54.8-54.8
//        C185.5,87.3,173.8,96,160,96c-17.7,0-32-14.3-32-32c0-17.7,14.3-32,32-32c17.4,0,31.5,13.9,32,31.1c30.5,10.1,54.8,34.3,64.9,64.9
//        C274.1,128.5,288,142.6,288,160z"/>
//    <circle class="st2" cx="160" cy="256" r="16"/>
//    <circle class="st2" cx="64" cy="160" r="32"/>
//    <polygon class="st2" points="171.3,148.7 141.1,163.8 156.2,178.9 "/>
//    <path class="st3" d="M320,0h192v48H352h0c-17.7,0-32,14.3-32,32v0V0z"/>
//    <rect x="352" y="16" class="st4" width="128" height="16"/>
//    <rect x="352" y="80" class="st4" width="128" height="16"/>
//    <rect x="352" y="112" class="st4" width="128" height="16"/>
//    <rect x="352" y="240" class="st4" width="32" height="16"/>
//    <rect x="400" y="240" class="st4" width="80" height="16"/>
//    <rect x="352" y="272" class="st4" width="80" height="16"/>
//    <rect x="352" y="144" class="st4" width="80" height="16"/>
//    <path class="st5" d="M407.5,208h65c4.1,0,7.5-3.4,7.5-7.5v-17c0-4.1-3.4-7.5-7.5-7.5h-65c-4.1,0-7.5,3.4-7.5,7.5v17
//        C400,204.6,403.4,208,407.5,208z"/>
//    </svg>`

        if (localStorage.g4_currentTheme == themeId) div.classList.add("current")

        let optDiv = document.createElement("div")

        let name = document.createElement("p")
        name.textContent = theme.name
        optDiv.appendChild(name)

        let cloneBtn = document.createElement("button")
        cloneBtn.textContent = "Clone"
        optDiv.appendChild(cloneBtn)

        cloneBtn.addEventListener("click", (e) => {
            duplicateTheme(themeId)

            e.stopPropagation()
        })

        if (themeId > 2) {
            let editBtn = document.createElement("button")
            editBtn.textContent = "Edit"
            optDiv.appendChild(editBtn)
    
            editBtn.addEventListener("click", (e) => {
                editTheme(themeId)

                e.stopPropagation()
            })

            if (localStorage.g4_currentTheme != themeId) {
                let deleteBtn = document.createElement("button")
                deleteBtn.textContent = "Delete"
                optDiv.appendChild(deleteBtn)
        
                deleteBtn.addEventListener("click", (e) => {
                    deleteTheme(themeId)

                    e.stopPropagation()
                })
            }
        }

        div.appendChild(optDiv)

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
    applyTheme()
}

function fillGaps(source, target) {
    for (let key in source) {
        if (!(key in target)) {
            target[key] = JSON.parse(JSON.stringify(source[key]))
        } else if (target[key] instanceof Object) {
            fillGaps(source[key], target[key])
        }
    }
}

function updateThemes() {
    let themes = JSON.parse(localStorage["g4_themes"])

    if (themes.length < 3) return

    for (let i = 2; i < themes.length; i++) {
        fillGaps(themes[0], themes[i])
    }

    localStorage["g4_themes"] = JSON.stringify(themes)
}

loadDefaultThemes(!!localStorage.getItem("g4_themes")).then(() => {
    updateThemes()
    applyTheme()
})