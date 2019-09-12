let electron = require("electron")

let discord = electron.remote.require("discord-rpc")
let clientId = "620780964494442500"

const fs = require('fs');
const clientID = JSON.parse(fs.readFileSync(__dirname + "/discordID.json", "utf-8")).clientId
let path  = require("path")

discord.register(clientId)

const rpc = new discord.Client({
    transport: "ipc"
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
	
    let activityData = {
        details: "Playing on: " + modeAlias[e.detail.mode],
        state: "Score: " + e.detail.levelIndex,

        largeImageKey: "g4_logo",
        largeImageText: "G4",
        smallImageKey: "g4",

        instance: false
    }
    
    rpc.setActivity(activityData)
})

rpc.login({
    clientId: clientId
})
