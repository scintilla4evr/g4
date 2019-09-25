let electron = require("electron")

let discord = electron.remote.require("discord-rpc")
let clientId = "620780964494442500"

// dynamyc's section
let currentRawMode = "easy" // REPLACE THIS WITH EASY PICTURE BEFORE PUSH OR ELSE IT MIGHT BREAK IDK
let currentMode = "Easy"
let currentScore = "0"
let username = null
let preUsername = document.querySelector("input#loginUsername").value

if (preUsername == "") {
    username = "an Unregistered user"
} else {
    username = preUsername
}



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

//Updating the RPC on certain stuff
//WARNING: Really fucking spaghetti
window.addEventListener("g4statechange", (e) => {

    preUsername = document.querySelector("input#loginUsername").value

    //Update username
    if (preUsername == "") {
        username = "an Unregistered user"
    } else {
        username = preUsername
    }





    let modeAlias = {
        easy: "Easy",
        normal: "Normal",
        hard: "Hard",
        hell: "Hell",
        hades: "Hades",
        denise: "Chaos",
        reverse: "Reverse",
        nox: "Nox"
    }
    currentMode = modeAlias[e.detail.mode]
    currentScore = e.detail.levelIndex
    currentRawMode = [e.detail.mode]




    let activityData = {
        details: "Playing on: " + currentMode,
        state: "Score: " + currentScore,

        largeImageKey: "g4" + currentRawMode,
        largeImageText: "Currently playing as " + username + "!",
        smallImageKey: "g4",

        instance: false
    }

    rpc.setActivity(activityData)

})
window.addEventListener("g4login", (e) => {

    preUsername = document.querySelector("input#loginUsername").value

    //Update username
    if (preUsername == "") {
        username = "an Unregistered user"
    } else {
        username = preUsername
    }





    let modeAlias = {
        easy: "Easy",
        normal: "Normal",
        hard: "Hard",
        hell: "Hell",
        hades: "Hades",
        denise: "Chaos",
        reverse: "Reverse",
        nox: "Nox"
    }
    currentMode = modeAlias[e.detail.mode]
    currentScore = e.detail.levelIndex
    currentRawMode = [e.detail.mode]




    let activityData = {
        details: "Playing on: " + currentMode,
        state: "Score: " + currentScore,

        largeImageKey: "g4" + currentRawMode,
        largeImageText: "Currently playing as " + username + "!",
        smallImageKey: "g4",

        instance: false
    }

    rpc.setActivity(activityData)

})
window.addEventListener("g4logout", (e) => {

    preUsername = document.querySelector("input#loginUsername").value

    //Update username
    if (preUsername == "") {
        username = "an Unregistered user"
    } else {
        username = preUsername
    }





    let modeAlias = {
        easy: "Easy",
        normal: "Normal",
        hard: "Hard",
        hell: "Hell",
        hades: "Hades",
        denise: "Chaos",
        reverse: "Reverse",
        nox: "nox"
    }
    currentMode = modeAlias[e.detail.mode]
    currentScore = e.detail.levelIndex
    currentRawMode = e.detail.mode




    let activityData = {
        details: "Playing on: " + currentMode,
        state: "Score: " + currentScore,

        largeImageKey: "g4" + currentRawMode,
        largeImageText: "Currently playing as " + username + "!",
        smallImageKey: "g4",

        instance: false
    }

    rpc.setActivity(activityData)

})

// END
// OF
// THIS
// SHITTY
// PART

function setRPC() {
    let activityData = {

        details: "Playing on: " + currentMode,
        state: "Just started playing",

        largeImageKey: "g4" + currentRawMode,
        largeImageText: "Currently playing as " + username + "!",
        smallImageKey: "g4",

        instance: false
    }
    
    rpc.setActivity(activityData)
}

sleep(300)
setRPC()


