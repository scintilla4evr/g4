const electron = require('electron')
const { app, BrowserWindow } = require('electron')
const fs = require('fs');
let path  = require("path")

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
  })

  win.loadFile('game.html')
  win.webContents.openDevTools()
  win.webContents.on("dom-ready", () => {
    win.webContents.executeJavaScript(
        fs.readFileSync(
            path.join(__dirname, "/scripts/discordIntegration.js"), "utf-8"
        ), true
    )
})
}

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch('remote-debugging-port', '8315');
app.commandLine.appendSwitch('host-rules', 'MAP * 127.0.0.1');

app.on('ready', createWindow)
electron.app.on('browser-window-created',function(e,window) {
    window.setMenu(null);
});

