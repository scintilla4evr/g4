let electron = require("electron")

let discord = electron.remote.require("discord-rpc")
let clientId = "620780964494442500"

// dynamyc's section
let currentMode = "Normal"
let currentScore = "0"

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if ((new Date().getTime() - start) > milliseconds){
        break;
      }
    }
  }


const fs = require('fs');
const clientID = JSON.parse(fs.readFileSync(__dirname + "/discordID.json", "utf-8")).clientId
let path  = require("path")

discord.register(clientId)

const rpc = new discord.Client({
    transport: "ipc"
})

rpc.login({
    clientId: clientId
})

window.addEventListener("g4statechange", (e) => {
    let modeAlias = {
		easy: "Easy",
		normal: "Normal",
		hard: "Hard",
		hell: "Hell",
		hades: "Hades",
		denise: "Chaos",
		reverse: "Reverse"
    }
    currentMode = modeAlias[e.detail.mode]
    currentScore = e.detail.levelIndex

    let activityData = {
        details: "Playing on: " + currentMode,
        state: "Score: " + currentScore,

        largeImageKey: "g4_logo",
        largeImageText: "G4",
        smallImageKey: "g4",

        instance: false
    }

    rpc.setActivity(activityData)

})

function setRPC() {
    let activityData = {
        details: "Playing on: " + currentMode,
        state: "Score: " + currentScore,

        largeImageKey: "g4_logo",
        largeImageText: "G4",
        smallImageKey: "g4",

        instance: false
    }
    
    rpc.setActivity(activityData)
}

sleep(250)
setRPC()


