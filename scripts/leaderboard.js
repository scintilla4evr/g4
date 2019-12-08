let leaderboardEndpoint = "https://g4-leaderboard.herokuapp.com"

if (!localStorage.getItem("g4_showLegitTM")) localStorage["g4_showLegitTM"] = "0"
if (localStorage["g4_showLegitTM"] == "1") document.querySelector("input#settingVerifiedLegit").checked = true

let gameAchievements = {
    "firstClear": {
        name: "First steps",
        description: "You reached level 1 in $$ mode."
    },
    "10thClear": {
        name: "Almost 11",
        description: "You reached level 10 in $$ mode."
    },
    "ninenine": {
        name: "Infinity",
        description: "You reached level 999,999 in $$ mode."
    },

    "zeroFail": {
        name: "Oh.",
        description: "Oh well. You failed on level 0 in $$ mode."
    },

    "leader": {
        name: "Follow the Leader",
        description: "You got the first place on the $$ mode leaderboard."
    }
}

class Leaderboard {
    constructor() {
        this.userID = null
        this.userName = null
        this.accessToken = null

        if (localStorage.getItem("g4_user_id")) this.forceLogin()
    }

    async isUsernameAvailable(username) {
        if (username.length > 20) return false

        let name = encodeURIComponent(username)
        let url = `${leaderboardEndpoint}/usernameAvailable?username=${name}`

        let data = await fetch(url)
        data = await data.json()

        return data.available
    }

    async forceLogin() {
        let uuid = localStorage.getItem("g4_user_id")
        let data = await fetch(
            leaderboardEndpoint + "/userForceLogin",
            {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    uuid
                })
            }
        )
        data = await data.json()

        if (data.successful) {
            this.setAuthData(data.username, uuid, data.accesstoken)
            this.updateUI()

            window.dispatchEvent(new CustomEvent(
                "g4login", {
                    detail: {
                        username: data.username
                    }
                }
            ))

            return true
        }

        return false
    }

    async loginAccount(username, passwd) {
        let data = await fetch(
            leaderboardEndpoint + "/userLogin",
            {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: passwd
                })
            }
        )
        data = await data.json()

        if (!data.successful) {
            this.userID = null
            this.updateUI()

            return false
        } else {
            this.setAuthData(username, data.uuid, data.accesstoken)
            this.updateUI()

            window.dispatchEvent(new CustomEvent(
                "g4login", {
                    detail: {
                        username: username
                    }
                }
            ))

            return true
        }
    }

    async registerAccount(username, passwd) {
        if (username.length > 20) return false

        let data = await fetch(
            leaderboardEndpoint + "/userRegister",
            {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: passwd
                })
            }
        )

        data = await data.json()

        if (!data.successful) {
            this.userID = null
            this.updateUI()

            return false
        } else {
            this.setAuthData(username, data.uuid, data.accesstoken)
            this.updateUI()

            window.dispatchEvent(new CustomEvent(
                "g4login", {
                    detail: {
                        username: username
                    }
                }
            ))

            return true
        }
    }

    async logout() {
        if (!this.userID) return

        let data = await fetch(
            leaderboardEndpoint + "/userLogout",
            {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    uuid: this.userID
                })
            }
        )

        data = await data.json()

        this.userID = null
        this.userName = null
        this.accessToken = null

        localStorage.removeItem("g4_user_id")

        window.dispatchEvent(new CustomEvent(
            "g4logout"
        ))

        this.updateUI()
    }

    setAuthData(username, uuid, token) {
        this.userID = uuid
        this.userName = username
        this.accessToken = token

        if (document.querySelector("input#loginRemember").checked) localStorage.setItem("g4_user_id", this.userID)
    }

    async updateUI() {
        if (this.userID) {
            document.querySelector("div.accountInfo p.username").textContent = this.userName

            document.body.classList.add("login")
        } else {
            document.body.classList.remove("login")
        }
    }

    async getLeaderboard(mode) {
        let legit = localStorage["g4_showLegitTM"]
        let data = await fetch(
            leaderboardEndpoint + "/scores?mode=" + mode + "&legit=" + legit
        )

        return await data.json()
    }

    async updateLeaderboard(mode) {
        let scores = await this.getLeaderboard(mode)

        let table = document.querySelector("section.leaderboard tbody")
        table.innerHTML = ""

        let counter = 0

        scores.scores.forEach((score, i) => {
            let tr = document.createElement("tr")

            if (score.username === this.userName) tr.classList.add("me")
            if (score.verified) {
                tr.classList.add("verified")
            } else {
                counter++
            }

            let rank = document.createElement("td")
            rank.textContent = score.verified ? "-" : counter
            tr.appendChild(rank)

            let player = document.createElement("td")
            player.classList.add("player")

            let playerName = document.createElement("span")
            playerName.classList.add("name")
            playerName.textContent = score.username
            player.appendChild(playerName)

            if (score.verified) {
                let verified = document.createElement("span")
                verified.classList.add("verified")
                verified.textContent = "Verified Legit™"
                player.appendChild(verified)
            }

            if (score.playerinfo) {
                let teamBits = score.playerinfo.teammember
                let isG4Dev = !!(teamBits & 1)
                let isTheorist = !!(teamBits & 2)

                if (isG4Dev) {
                    let badge = document.createElement("span")
                    badge.classList.add("teamg4")
                    badge.textContent = "G4"
                    player.appendChild(badge)
                }
                if (isTheorist) {
                    let badge = document.createElement("span")
                    badge.classList.add("teamgt")
                    badge.textContent = "GT"
                    player.appendChild(badge)
                }
            }

            tr.appendChild(player)

            let scoreText = document.createElement("td")
            scoreText.textContent = score.score
            tr.appendChild(scoreText)

            tr.addEventListener("click", () => {
                this.showDetailedScores(score.username)
            })

            table.appendChild(tr)
        })
    }

    getAchievementInfo(achID) {
        let achType = "", achMode = "", achName = ""
        let achSpec = achID.split("_")

        achType = achSpec[0]
        if (achType == "gen") {
            achName = achSpec[1]
        } else {
            achMode = achSpec[1]
            achName = achSpec[2]
        }

        return {
            name: gameAchievements[achName].name,
            description: gameAchievements[achName].description.replace("$$", Game.modeIDToDisplayName(achMode))
        }
    }

    async showDetailedScores(username) {
        let name = encodeURIComponent(username)

        let data = await fetch(`${leaderboardEndpoint}/playerScores?username=${name}`)
        data = await data.json()

        let scores = data.scores
        if (!scores) scores = []

        data = await fetch(`${leaderboardEndpoint}/playerAchievements?username=${name}`)
        data = await data.json()

        let achievements = data.achievements
        if (!achievements) achievements = []

        document.querySelector("dialog#playerStats h1").textContent = username

        let container = document.querySelector("dialog#playerStats div.scores")
        container.innerHTML = ""        

        let achContainer = document.querySelector("dialog#playerStats div.achievements")
        achContainer.innerHTML = ""

        openWindow("playerStats")

        for (let achievement of achievements) {
            let achType = "", achMode = "", achName = ""
            let achSpec = achievement.split("_")

            achType = achSpec[0]
            if (achType == "gen") {
                achName = achSpec[1]
            } else {
                achMode = achSpec[1]
                achName = achSpec[2]
            }

            let achDiv = document.createElement("div")

            achDiv.classList.add("achievement")
            achDiv.classList.add(achType)
            
            if (achType == "game") achDiv.setAttribute("data-mode", achMode)
            let modeName = Game.modeIDToDisplayName(achMode)

            let svgData = await fetch(`res/images/achievements/${achName}.svg`)
            svgData = await svgData.text()

            achDiv.innerHTML = `
            ${svgData}
            <div class="info">
                <p class="name">${gameAchievements[achName].name}</p>
                <p class="description">${gameAchievements[achName].description.replace("$$", modeName)}</p>
            </div>
            `

            achContainer.appendChild(achDiv)
        }

        let playerBits = 0, isVerified = false

        for (let score of scores) {
            if (score.playerinfo)
                playerBits = score.playerinfo.teammember
            if (score.verified) isVerified = true

            let scoreDiv = document.createElement("div")

            scoreDiv.className = "highScore"
            scoreDiv.setAttribute("data-mode", score.gamemode)

            let modeName = Game.modeIDToDisplayName(score.gamemode)

            scoreDiv.innerHTML = `<p class="mode"><span>${modeName}</span></p>
            <table>
                <tr>
                    <th>Score</th>
                    <th>Deaths</th>
                </tr>
                <tr>
                    <td>${+score.score}</th>
                    <td>${+score.deathcount}</th>
                </tr>
            </table>`

            container.appendChild(scoreDiv)
        }

        let badges = ""

        if (playerBits & 1) badges += `<div class="badge teamg4">G4 Dev</div>`
        if (playerBits & 2) badges += `<div class="badge teamgt">Team Theorist</div>`
        if (isVerified) badges += `<div class="badge">Verified Legit™</div>`

        document.querySelector("dialog#playerStats div.badges").innerHTML = badges
    }

    async postScore(mode, score, deathCount) {
        if (!this.userID) return false
        if (score <= 0) return false

        let data = await fetch(
            leaderboardEndpoint + "/score",
            {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    uuid: this.userID,
                    accesstoken: this.accessToken,
                    data: {
                        mode: mode,
                        score: score,
                        deathcount: deathCount
                    }
                })
            }
        )

        data = await data.json()

        if (!data.authError) {
            this.accessToken = data.accesstoken
        }
    }

    async addAchievement(achID) {
        if (!this.userID) return false

        let data = await fetch(
            leaderboardEndpoint + "/addAchievement",
            {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    uuid: this.userID,
                    accesstoken: this.accessToken,
                    data: {
                        achievement: achID
                    }
                })
            }
        )

        data = await data.json()

        if (!data.authError) {
            this.accessToken = data.accesstoken
        }
        return data.successful && data.data
    }
}