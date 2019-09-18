function loadAudio(audioFile) {
    return new Promise((resolve, reject) => {
        let audio = new Audio()

        audio.addEventListener("canplaythrough", () => resolve())
        audio.src = audioFile
    })
}

async function loadAssets() {
    // Load the default music
    await loadAudio("res/music/default.mp3")
}