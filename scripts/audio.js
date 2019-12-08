class AudioItem {
    constructor(asset, type) {
        /**
         * @type {AudioAsset}
         */
        this.asset = asset
        this.type = type

        /**
         * @type {AudioBufferSourceNode}
         */
        this.sourceNode = null

        this.outputNode = null

        this.startTime = null
    }

    createFXChain() {
        // No FX Chain for now
        return this.sourceNode
    }

    play(offset) {
        this.sourceNode = mainAudioContext.createBufferSource()
        this.sourceNode.buffer = this.asset.audioBuffer

        if (this.type == "looped") {
            this.sourceNode.loop = true
            this.sourceNode.loopStart = 0
            this.sourceNode.loopEnd = this.asset.audioBuffer.duration
        }

        if (!offset) offset = 0
        this.startTime = mainAudioContext.currentTime - offset
        this.sourceNode.start(
            mainAudioContext.currentTime,
            offset,
            2**20
        )

        this.outputNode = this.createFXChain()
    }

    stop() {
        this.sourceNode.stop(mainAudioContext.currentTime)
        this.sourceNode = null
    }
}

class AudioCategory {
    constructor(name, maxSlots, masterGain) {
        this.name = name
        this.maxSlots = maxSlots

        this.gainNode = mainAudioContext.createGain()
        this.gainNode.connect(masterGain)

        /**
         * @type {AudioItem[]}
         */
        this.slots = Array(maxSlots).fill(null)
    }

    set gain(value) {
        this.gainNode.value = value
    }

    remove(index) {
        this.slots[index].stop()
        this.slots[index].outputNode.disconnect(this.gainNode)
        this.slots[index] = null
    }

    /**
     * @param {AudioItem} item 
     */
    add(item) {
        let emptySlot = this.slots.findIndex(i => !i)
        if (emptySlot < 0) {
            this.remove(0)
            emptySlot = 0
        }

        item.play()
        item.outputNode.connect(this.gainNode)

        this.slots[emptySlot] = item
    }

    replace(index, item) {
        let offset = 0

        if (this.slots[index]) {
            offset = (mainAudioContext.currentTime - this.slots[index].startTime) % this.slots[index].asset.audioBuffer.duration

            this.slots[index].stop()
            this.slots[index].outputNode.disconnect(this.gainNode)
        }

        item.play(offset)
        item.outputNode.connect(this.gainNode)

        this.slots[index] = item
    }
}
let masterGainNode = mainAudioContext.createGain()
masterGainNode.connect(mainAudioContext.destination)

/**
 * @type {AudioCategory[]}
 */
let audioCategories = [
    new AudioCategory("bgm", 1, masterGainNode),
    new AudioCategory("sfx", 8, masterGainNode)
]

function getAudioCategory(name) {
    return audioCategories.find(ac => ac.name == name)
}

function registerNativeModeMusicAssets() {
    gameModes.filter(mode => mode instanceof NativeMode).map(mode => {
        return new AudioAsset(
            null, `g4mode_${mode.modeId}_bgm`,
            `res/music/${mode.modeId}.ogg`
        )
    }).forEach(a => registerAsset(a))
}

function getNativeModeMusicAssets() {
    return gameModes.filter(mode => mode instanceof NativeMode).map(mode => {
        return getAsset(null, `g4mode_${mode.modeId}_bgm`)
    })
}

registerNativeModeMusicAssets()

// Volume controls
document.querySelectorAll("div.volume").forEach(vol => {
    let categoryName = vol.getAttribute("data-category")
    let gainNode = categoryName == "master" ? masterGainNode : getAudioCategory(categoryName).gainNode

    if (!localStorage.getItem(`g4_gain_${categoryName}`)) {
        localStorage[`g4_gain_${categoryName}`] = categoryName == "bgm" ? 80 : 100
    }

    let input = vol.querySelector("input")
    input.value = +localStorage[`g4_gain_${categoryName}`]

    let label = vol.querySelector("div.slider p")
    label.textContent = `${localStorage[`g4_gain_${categoryName}`]}%`

    gainNode.gain.value = +localStorage[`g4_gain_${categoryName}`]/100

    input.addEventListener("input", () => {
        label.textContent = `${input.value}%`
        localStorage[`g4_gain_${categoryName}`] = input.value

        gainNode.gain.value = +localStorage[`g4_gain_${categoryName}`]/100
    })
})