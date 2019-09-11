const electron = require('electron')
const { app, BrowserWindow } = require('electron')
const DiscordRPC = require('discord-rpc');
const clientId = 'REDACTED';

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
}

app.on('ready', createWindow)
electron.app.on('browser-window-created',function(e,window) {
    window.setMenu(null);
});

//Discord Rich Presence
//--------------------------------
const rpc = new DiscordRPC.Client({
    transport: "ipc"
})

DiscordRPC.register(clientId);

async function setActivity() {
    rpc.setActivity({
      details: `DevBuild-4.6`,
      state: 'Score: N/A',
      largeImageKey: 'g4_logo',
      largeImageText: 'G4',
      smallImageKey: 'g4',
      smallImageText: 'G4',
      instance: false,
    });
  }
  
  rpc.on('ready', () => {
    setActivity();
  
    // activity can only be set every 15 seconds
    setInterval(() => {
      setActivity();
    }, 15e3);
  });
  
  rpc.login({ clientId }).catch(console.error);

