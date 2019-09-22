let leaderboardEndpoint = "https://g4-leaderboard.herokuapp.com"

class Leaderboard {
    constructor() {
        this.userID = null
        this.userName = null
        this.accessToken = null
    }

    async isUsernameAvailable(username) {
        if (username.length > 20) return false

        let name = encodeURIComponent(username)
        let url = `${leaderboardEndpoint}/usernameAvailable?username=${name}`

        let data = await fetch(url)
        data = await data.json()

        return data.available
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

        this.updateUI()
    }

    setAuthData(username, uuid, token) {
        this.userID = uuid
        this.userName = username
        this.accessToken = token
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
        let data = await fetch(
            leaderboardEndpoint + "/scores?mode=" + mode
        )

        return await data.json()
    }

    async updateLeaderboard(mode) {
        let scores = await this.getLeaderboard(mode)

        let table = document.querySelector("section.leaderboard tbody")
        table.innerHTML = ""

        scores.scores.forEach((score, i) => {
            let tr = document.createElement("tr")

            if (score.username === this.userName) tr.classList.add("me")

            let rank = document.createElement("td")
            rank.textContent = i + 1
            tr.appendChild(rank)

            let player = document.createElement("td")
            player.textContent = score.username
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

    async showDetailedScores(username) {
        let name = encodeURIComponent(username)
        let url = `${leaderboardEndpoint}/playerScores?username=${name}`

        let data = await fetch(url)
        data = await data.json()

        let scores = data.scores
        if (!scores) scores = []

        document.querySelector("dialog#playerStats h2").textContent = username

        let container = document.querySelector("dialog#playerStats div.scores")
        container.innerHTML = ""

        for (let score of scores) {
            let scoreDiv = document.createElement("div")

            scoreDiv.className = "highScore"
            scoreDiv.setAttribute("data-mode", score.gamemode)

            let modeName = Game.modeIDToDisplayName(score.gamemode)

            scoreDiv.innerHTML = `<p class="mode">${modeName} mode</p>
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

        openWindow("playerStats")
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
}