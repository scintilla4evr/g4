let mainAudioContext = new AudioContext()

class Asset {
    constructor(source, name, filePath) {
        this.source = source
        this.filePath = filePath
        this.name = name

        this.isLoaded = false
    }

    async load() {
        this.isLoaded = true
        dispatchEvent(new CustomEvent(
            "g4assetloaded",
            {
                detail: {
                    asset: this
                }
            }
        ))
    }

    dispose() {}
}

class AudioAsset extends Asset {
    constructor(source, name, filePath) {
        super(source, name, filePath)

        /**
         * @type {AudioBuffer}
         */
        this.audioBuffer = null
    }

    async load() {
        let data = await fetch(this.filePath)
        let arrayBuf = await data.arrayBuffer()

        this.audioBuffer = await mainAudioContext.decodeAudioData(arrayBuf)

        super.load()
    }

    dispose() {
        delete this.audioBuffer
    }
}

class ImageAsset extends Asset {
    constructor(source, name, filePath) {
        super(source, name, filePath)

        /**
         * @type {HTMLImageElement}
         */
        this.image = null
    }

    asyncImgLoad() {
        return new Promise((resolve, reject) => {
            let listener = () => {
                this.image.removeEventListener("load", listener)
                resolve()
            }

            this.image.addEventListener("load", listener)
            this.image.src = this.filePath
        })
    }

    async load() {
        this.image = new Image()

        await this.asyncImgLoad()

        super.load()
    }

    dispose() {
        delete this.image
    }
}

class AssetLink {
    constructor(id) {
        this.id = id
    }
}

/**
 * @type {Asset[]}
 */
let gameAssets = []
let baseLoadedCount = 0

function getAssetLink(asset) {
    return new AssetLink(gameAssets.indexOf(asset))
}

function getAssetFromLink(link) {
    return gameAssets[link.id]
}

function getAssetCount() {
    return gameAssets.filter(a => a instanceof Asset).length
}

function getLoadedAssetCount() {
    return gameAssets.filter(a => a instanceof Asset && a.isLoaded).length
}

function updateAssetProgress() {
    let loaded = getLoadedAssetCount()
    let all = getAssetCount()
    let fraction = (loaded - baseLoadedCount) / (all - baseLoadedCount)

    document.querySelector("div.loadingScreen").classList.toggle("loading", loaded != all)

    document.querySelector("div.loadingScreen div.bar").style.width = `${100 * fraction}%`

    if (loaded == all) {
        baseLoadedCount = loaded
    }
}

function registerAsset(asset) {
    let index = gameAssets.push(asset)

    updateAssetProgress()
    asset.load().then(() => updateAssetProgress())

    return index
}

function areAssetsLoaded(assets) {
    return getLoadedAssetCount() == getAssetCount()
}

function waitForAssetLoad(assets) {
    return new Promise((resolve, reject) => {
        if (areAssetsLoaded(assets)) resolve()

        let listener = () => {
            if (areAssetsLoaded(assets)) {
                removeEventListener("g4assetloaded", listener)
                resolve()
            }
        }

        addEventListener("g4assetloaded", listener)
    })
}

function getAsset(source, name) {
    return gameAssets.find(a => a instanceof Asset && a.source == source && a.name == name)
}

function loadDefaultAssets() {
    let assets = [
        new ImageAsset(null, "g4img_ballNormalMap", "res/images/normals/ball.png"),
        new ImageAsset(null, "g4img_slope1NormalMap", "res/images/normals/slope1.png"),
        new ImageAsset(null, "g4img_slope2NormalMap", "res/images/normals/slope2.png"),
        
        new AudioAsset(
            null, "g4sfx_damage",
            "res/sfx/damage.ogg"
        ),
        new AudioAsset(
            null, "g4sfx_shoot",
            "res/sfx/shoot.ogg"
        ),
        new AudioAsset(
            null, "g4sfx_succ",
            "res/sfx/succ.ogg"
        )
    ]
    assets.forEach(a => registerAsset(a))
    return assets
}

updateAssetProgress()