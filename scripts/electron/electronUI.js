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