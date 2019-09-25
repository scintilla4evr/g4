const {BrowserWindow} = require("electron").remote

document.body.classList.add("electron")

let win = BrowserWindow.getFocusedWindow()
if (win.isMaximized()) document.body.classList.add("maximized")

document.querySelector("button#minimizeBtn").addEventListener("click", () => {
    win.minimize()
})

document.querySelector("button#maximizeBtn").addEventListener("click", () => {
    win.maximize()
})

document.querySelector("button#restoreBtn").addEventListener("click", () => {
    win.unmaximize()
})

document.querySelector("button#closeBtn").addEventListener("click", () => {
    win.close()
})

win.on("maximize", () => {
    document.body.classList.add("maximized")
})

win.on("unmaximize", () => {
    document.body.classList.remove("maximized")
})