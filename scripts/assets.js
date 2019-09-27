function loadAudio(audioFile) {
    return new Promise((resolve, reject) => {
        let audio = new Audio()

        audio.addEventListener("canplaythrough", () => resolve())
        audio.src = audioFile
    })
}

async function loadAssets() {
    // Load the default music
    await loadAudio("res/music/easy.mp3")
    await loadAudio("res/music/normal.mp3")
    await loadAudio("res/music/hell.mp3")
    await loadAudio("res/music/hades.mp3")
    await loadAudio("res/music/reverse.mp3")
    await loadAudio("res/music/denise.mp3")
}