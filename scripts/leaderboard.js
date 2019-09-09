let leaderboardEndpoint = "http://localhost:5000"

/**
 * @typedef {Object} Score
 * 
 * @property {String} player
 * @property {Number} score
 * @property {Number} date
 */

class Leaderboard {
    /**
     * @param {String} mode 
     * @returns {Promise<Score[]>}
     */
    static async getLeaderboard(mode) {
        let data = await fetch(
            leaderboardEndpoint + "/scores/" + mode
        )
        data = await data.json()

        return data.sort((i1, i2) => i1.score > i2.score)
    }

    static getNickname() {
        return localStorage.getItem("g4game_player")
    }

    static setNickname(nickname) {
        localStorage.setItem("g4game_player", nickname)
    }

    static async setScore(mode, score) {
        if (!localStorage.getItem("g4game_player")) return false
        
        let player = encodeURIComponent(localStorage.getItem("g4game_player"))

        let url = `${leaderboardEndpoint}/set/${mode}?user=${player}&score=${score}`

        await fetch(url)

        return true
    }

    static async updateLeaderboard(mode) {
        let scores = await Leaderboard.getLeaderboard(mode)

        console.log(scores)

        let table = document.querySelector("section.leaderboard tbody")
        table.innerHTML = ""

        scores.forEach((score, i) => {
            let tr = document.createElement("tr")

            tr.innerHTML = `<td>${i + 1}</td><td>${score.player}</td><td>${score.score}</td>`

            table.appendChild(tr)
        })
    }
}