/**
 * @type {Map<String, AudioBuffer>}
 */
let audioBuffers = new Map()
/**
 * @type {AudioContext}
 */
let audioCtx = new AudioContext()
/**
 * @type {AudioBufferSourceNode}
 */
let currentSourceNode = null
/**
 * @type {BiquadFilterNode}
 */
let currentBiquadNode = null
let isAudioPlaying = false
let audioStartTime = 0

/**
 * @param {AudioContext} audioCtx 
 * @param {String} audioFile 
 */
async function loadAudioBuffer(audioCtx, audioFile) {
    let data = await fetch(audioFile)
    let arrayBuf = await data.arrayBuffer()

    return await audioCtx.decodeAudioData(arrayBuf)
}

function stopAudio() {
    currentSourceNode.disconnect(currentBiquadNode)
    currentBiquadNode.disconnect(audioCtx.destination)
    currentSourceNode.stop()
}

function enableSlowAudioEffect() {
    currentBiquadNode.frequency.linearRampToValueAtTime(1000, 1)
    currentSourceNode.playbackRate.linearRampToValueAtTime(0.5, 1)
}

function disableSlowAudioEffect() {
    currentBiquadNode.frequency.linearRampToValueAtTime(20000, 1)
    currentSourceNode.playbackRate.linearRampToValueAtTime(1, 1)
}

function playAudio(mode, fresh) {
    if (!isAudioPlaying) return
    if (currentSourceNode && !fresh) stopAudio()

    let buffer = audioBuffers.get(mode)
    if (!buffer) return

    let sourceNode = audioCtx.createBufferSource()
    sourceNode.buffer = buffer

    sourceNode.loop = true
    sourceNode.loopStart = 0
    sourceNode.loopEnd = buffer.duration

    let biquadNode = audioCtx.createBiquadFilter()

    biquadNode.type = "lowpass"
    biquadNode.frequency.value = 20000

    sourceNode.connect(biquadNode)
    biquadNode.connect(audioCtx.destination)

    let offset = 0

    if (currentSourceNode) {
        offset = (audioCtx.currentTime - audioStartTime) % currentSourceNode.buffer.duration
    }

    sourceNode.start(
        audioCtx.currentTime,
        offset, 10e60
    )
    audioStartTime = audioCtx.currentTime - offset

    currentSourceNode = sourceNode
    currentBiquadNode = biquadNode
}

async function loadAssets() {
    let modes = [
        "easy", "normal", "hell",
        "hades", "reverse", "denise"
    ]

    // Load the default music
    for (let mode of modes) {
        audioBuffers.set(
            mode,
            await loadAudioBuffer(
                audioCtx, `res/music/${mode}.ogg`
            )
        )
    }
}