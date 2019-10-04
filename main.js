const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path  = require("path");

//Electron
//--------------------------------
function createWindow () {
  let win = new BrowserWindow({
    width: 1600,
    height: 900,

    frame: false,
    icon: __dirname + '/icon.ico',

    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('game.html');

  win.webContents.on("dom-ready", () => {
    win.webContents.executeJavaScript(
        fs.readFileSync(
            path.join(__dirname, "/scripts/discordIntegration.js"), "utf-8"
        ), true
    )
  })

  initIpcEvents(win)
}

/**
 * @param {BrowserWindow} win 
 */
function initIpcEvents(win) {
  ipcMain.on("minimize", (e) => {
    win.minimize()
  })
  ipcMain.on("maximize", (e) => {
    win.maximize()
  })
  ipcMain.on("unmaximize", (e) => {
    win.unmaximize()
  })
  ipcMain.on("close", (e) => {
    win.close()
  })
  ipcMain.on("clearCache", (e) => {
    win.webContents.session.clearCache()
  })

  if (win.isMaximized()) win.webContents.send("maximized")

  win.on("maximize", () => {
    win.webContents.send("maximized")
  })
  win.on("unmaximize", () => {
    win.webContents.send("unmaximized")
  })
}

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

app.on('ready', createWindow);
app.on('browser-window-created', (e, window) => {
  window.setMenu(null);
});
app.on('window-all-closed', () => {
  app.exit()
})