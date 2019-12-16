const {ipcRenderer} = require("electron")
const {shell} = require("electron").remote

document.body.classList.add("electron")

document.querySelector("button#minimizeBtn").addEventListener("click", () => {
    ipcRenderer.send("minimize")
})

document.querySelector("button#maximizeBtn").addEventListener("click", () => {
    ipcRenderer.send("maximize")
})

document.querySelector("button#restoreBtn").addEventListener("click", () => {
    ipcRenderer.send("unmaximize")
})

document.querySelector("button#closeBtn").addEventListener("click", () => {
    ipcRenderer.send("close")
})

ipcRenderer.on("maximized", (e) => {
    document.body.classList.add("maximized")
})

ipcRenderer.on("unmaximized", (e) => {
    document.body.classList.remove("maximized")
})

document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", (e) => {
        shell.openExternal(link.href)
        e.preventDefault()
    })
})

window.openLink = (url) => {
    shell.openExternal(url)
}

// Check whether the thing was just updated
{
    let path = require("path")
    let fs = require("fs")

    let versionPath = path.join(__dirname, "../version.json")
    let version = JSON.parse(
        fs.readFileSync(versionPath, "utf-8")
    )

    if (version.justUpdated) {
        openWindow("changelog")

        version.justUpdated = false
        fs.writeFileSync(
            versionPath,
            JSON.stringify(version),
            "utf-8"
        )
    }
}
