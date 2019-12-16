(() => {
    let fs = require("fs")
    let path = require("path")
    let vm = require("vm")
    let util = require("util")

    const pluginPath = path.join(__dirname, "plugins")

    function isInsidePluginsPath(plugin, p) {
        let rel = path.relative(path.join(pluginPath, plugin.directory), p)

        return rel && !rel.startsWith("..") && !path.isAbsolute(rel)
    }

    /**
     * @type {Plugin[]}
     */
    let loadedPlugins = []
    window.loadedPlugins = loadedPlugins

    class PluginDebugMessage {
        constructor(plugin) {
            this.plugin = plugin

            this.timestamp = new Date()

            dispatchEvent(new CustomEvent(
                "g4pluginmessage", {
                    detail: {
                        plugin: plugin,
                        message: this
                    }
                }
            ))
        }

        get messageHTML() {
            return ""
        }

        get messageType() {
            return ""
        }

        htmlFromObject(obj) {
            return util.inspect(obj).replace(/</g, "&lt;")
        }

        addToConsole() {
            let console = document.querySelector("div.pluginConsole div.messages")

            let tr = document.createElement("tr")
            tr.classList.add(this.messageType)

            let hr = this.timestamp.getHours()
            let min = "0" + this.timestamp.getMinutes()
            let sec = "0" + this.timestamp.getSeconds()

            min = min.substring(min.length - 2)
            sec = sec.substring(sec.length - 2)

            let time = `${hr}:${min}:${sec}`

            tr.innerHTML = `
                <td class="time">${time}</td>
                <td class="plugin">
                    <img src="${pluginPath}/${this.plugin.directory}/${this.plugin.icon}">
                    ${this.plugin.name}
                </td>
                <td class="message"><div>${this.messageHTML}</div></td>
            `

            console.querySelector("tbody").appendChild(tr)

            console.scrollTop = console.scrollHeight
        }
    }

    class PluginDebugAPICallMessage extends PluginDebugMessage {
        constructor(plugin, apiFunc, args) {
            super(plugin)

            this.apiFunc = apiFunc
            this.args = args

            this.addToConsole()
        }

        get messageHTML() {
            let funcName = this.apiFunc
            return `Call to function <span class="funcName">${funcName}</span> with arguments ${this.htmlFromObject(this.args)}`
        }

        get messageType() {
            return "call"
        }
    }

    class PluginExecutionErrorMessage extends PluginDebugMessage {
        constructor(plugin, err) {
            super(plugin)

            this.error = err

            this.addToConsole()
        }

        get messageHTML() {
            let stack = this.error.stack.toString().replace(/</g, "&lt;").replace(/\n/g, "<br>")

            return `Execution error: <b>${this.error.message}</b><br><pre>${stack}</pre>`
        }

        get messageType() {
            return "error"
        }
    }

    class PluginAssetErrorMessage extends PluginDebugMessage {
        constructor(plugin, assetName, msg) {
            super(plugin)

            this.assetName = assetName
            this.msg = msg

            this.addToConsole()
        }

        get messageHTML() {
            return `Error while loading asset ${this.assetName}: ${this.msg}`
        }

        get messageType() {
            return "error"
        }
    }

    class PluginModuleErrorMessage extends PluginDebugMessage {
        constructor(plugin, msg) {
            super(plugin)

            this.msg = msg

            this.addToConsole()
        }

        get messageHTML() {
            return `Error while importing modules: ${this.msg}`
        }

        get messageType() {
            return "error"
        }
    }

    class PluginDebugTextMessage extends PluginDebugMessage {
        constructor(plugin, message, type) {
            super(plugin)

            this.message = message
            this.type = type

            this.addToConsole()
        }

        get messageHTML() {
            return this.htmlFromObject(this.message)
        }

        get messageType() {
            return this.type
        }
    }

    class PluginEventHandler {
        constructor(type, listener) {
            this.eventType = type
            this.listener = listener
        }
    }

    class Plugin {
        constructor(dir, manifestData, isRunning) {
            this.directory = dir

            this.manifest = manifestData

            this.name = manifestData.name
            this.author = manifestData.author
            this.description = manifestData.description

            this.icon = manifestData.icon

            this.version = manifestData.version

            this.scriptPath = manifestData.script

            /**
             * @type {PluginDebugMessage[]}
             */
            this.debugMessages = []

            /**
             * @type {PluginEventHandler[]}
             */
            this.eventHandlers = []

            this.objects = []

            this.isRunning = isRunning

            this.registerAssets()
            // if (isRunning) this.run()
        }

        getFilePath(relPath) {
            return path.join(pluginPath, this.directory, relPath)
        }

        registerAssets() {
            if (!("assets" in this.manifest)) return

            let assets = []

            for (let assetName in this.manifest.assets) {
                let assetSpec = this.manifest.assets[assetName]

                let assetType = assetSpec.type
                if (!["audio", "image"].includes(assetType)) {
                    this.debugMessages.push(
                        new PluginAssetErrorMessage(this, assetName, `Unknown asset type ${assetType}.`)
                    )
                    continue
                }

                let assetFile = this.getFilePath(assetSpec.file)
                if (!isInsidePluginsPath(this, assetFile)) {
                    this.debugMessages.push(
                        new PluginAssetErrorMessage(this, assetName, `Tried to load a file from outside the plugin directory.`)
                    )
                    continue
                }
                if (!fs.existsSync(assetFile)) {
                    this.debugMessages.push(
                        new PluginAssetErrorMessage(this, assetName, `Couldn't find ${assetSpec.file}.`)
                    )
                    continue
                }

                let asset

                switch (assetType) {
                    case "audio":
                        asset = new AudioAsset(this, assetName, assetFile)
                        break
                    case "image":
                        asset = new ImageAsset(this, assetName, assetFile)
                        break
                }

                if (asset) {
                    // registerAsset(asset)
                    assets.push(asset)
                } else {
                    this.debugMessages.push(
                        new PluginAssetErrorMessage(this, assetName, `Couldn't create asset.`)
                    )
                }
            }

            assets.forEach(a => registerAsset(a))

            return assets
        }

        unregisterAssets() {
            if (!("assets" in this.manifest)) return

            for (let assetName in this.manifest.assets) {
                let asset = getAsset(this, assetName)
                let link = getAssetLink(asset)

                asset.dispose()
                gameAssets[link.id] = null
            }
        }

        getPluginContext(moduleDir, exports) {
            return {
                // Modules
                export: (object) => {
                    this.debugMessages.push(
                        new PluginDebugAPICallMessage(this, "[PluginContext].export", [object])
                    )

                    exports.exports = object
                },
                import: (modulePath) => {
                    this.debugMessages.push(
                        new PluginDebugAPICallMessage(this, "[PluginContext].import", [modulePath])
                    )

                    let scriptPath = path.join(moduleDir, modulePath)

                    return this.runScript(scriptPath)
                },

                // Object registration
                registerMode: (mode) => {
                    this.debugMessages.push(
                        new PluginDebugAPICallMessage(this, "[PluginContext].registerMode", [mode])
                    )

                    if (!(mode instanceof CustomMode)) return false

                    this.objects.push(mode)

                    gameModes.push(mode)

                    updateModeButtons()

                    return true
                },

                // Asset stuff
                getAsset: (assetName) => {
                    this.debugMessages.push(
                        new PluginDebugAPICallMessage(this, "[PluginContext].getAsset", [assetName])
                    )

                    let asset = getAsset(this, assetName)

                    if (!asset) return null

                    return getAssetLink(asset)
                },

                // Debug messages
                log: (message) => {
                    this.debugMessages.push(
                        new PluginDebugTextMessage(this, message, "log")
                    )
                },
                info: (message) => {
                    this.debugMessages.push(
                        new PluginDebugTextMessage(this, message, "info")
                    )
                },
                warn: (message) => {
                    this.debugMessages.push(
                        new PluginDebugTextMessage(this, message, "warning")
                    )
                },
                error: (message) => {
                    this.debugMessages.push(
                        new PluginDebugTextMessage(this, message, "error")
                    )
                }
            }
        }

        getG4Object() {
            return {
                // Level gen elements
                RingElement,
                RingBall, RingPulsingBall,
                RingBar, RingMarqueeBar,
                RingH,

                Ring,

                Mode: CustomMode,

                levelGen: {
                    ringTypes: {
                        TYPE_A: 1,
                        TYPE_B: 2,
                        TYPE_C: 3,
                        TYPE_D: 4
                    },

                    generateRing: (type, difficulty, distance) => {
                        this.debugMessages.push(
                            new PluginDebugAPICallMessage(this, "G4.levelGen.generateRing", [type, difficulty, distance])
                        )

                        let items = []

                        switch (type) {
                            case 1: // type A
                                items = LevelGenerator.generateInnerRing(difficulty, distance)
                                break
                            case 2: // type B
                                items = LevelGenerator.generateMiddleRing(difficulty, distance)
                                break
                            case 3: // type C
                                items = LevelGenerator.generateOuterRing(difficulty, distance)
                                break
                            case 4: // type D
                                items = LevelGenerator.generateDeniseRing(difficulty, distance)
                                break
                        }

                        return items
                    },
                    generateMode: (modeId, levelIndex) => {
                        this.debugMessages.push(
                            new PluginDebugAPICallMessage(this, "G4.levelGen.generateMode", [modeId, levelIndex])
                        )

                        let rings = []
                        let mode = gameModes.find(m => (m instanceof NativeMode) && m.modeId == modeId)

                        if (mode) rings = mode.getRings(levelIndex)

                        return rings
                    }
                },
                render: {
                    getElementPath: (element) => {
                        if (!(element instanceof RingElement)) return null
                        return LevelRenderer.getElementPath(element)
                    },
                    getRingPath: (ring) => {
                        if (!(ring instanceof Ring)) return null
                        return LevelRenderer.getRingPath(ring)
                    },
                    getCannonPath: (cannon) => {
                        // if (!(ring instanceof Ring)) return null
                        return LevelRenderer.getCannonPath(cannon)
                    }
                }
            }
        }

        createVolatileObject(source, exclusions) {
            let isExpired = false

            let volatileSpec = {
                expire() {
                    isExpired = true
                },
                isExpired() {
                    return isExpired
                },
                object: new Proxy(
                    source,
                    {
                        has(o, p) {
                            if (isExpired) return false
                            if (exclusions.includes(p)) return false
                            return p in o
                        },
                        get(o, p) {
                            if (isExpired) return undefined
                            if (exclusions.includes(p)) return undefined

                            return o[p]
                        },
                        ownKeys(o) {
                            if (isExpired) return []
                            return Object.keys(o).filter(k => exclusions.includes(k))
                        },
                        isExtensible(o) {
                            return false
                        },
                        set(o, p, v, r) {
                            if (isExpired) return false
                            if (exclusions.includes(p)) return false
                            if (!Object.getOwnPropertyDescriptor(o, p).writable) return false

                            o[p] = v

                            return true
                        }
                    }
                )
            }

            return volatileSpec
        }

        runScript(scriptPath) {
            if (!isInsidePluginsPath(this, scriptPath)) {
                this.debugMessages.push(
                    new PluginModuleErrorMessage(this, `Tried to load a module from outside the plugin directory.`)
                )
                return
            }
            if (!fs.existsSync(scriptPath)) {
                this.debugMessages.push(
                    new PluginModuleErrorMessage(this, `Couldn't find ${scriptPath}.`)
                )
                return
            }

            let scriptDir = path.dirname(scriptPath)

            let exportsObject = {
                exports: null
            }
            let context = {
                plugin: this.getPluginContext(scriptDir, exportsObject),
                G4: this.getG4Object()
            }

            let scriptData = fs.readFileSync(
                scriptPath,
                "utf-8"
            )

            this.isRunning = true

            try {
                vm.runInNewContext(scriptData, context, {
                    displayErrors: true
                })

                return exportsObject.exports
            } catch(e) {
                this.debugMessages.push(
                    new PluginExecutionErrorMessage(this, e)
                )
            }
        }

        run() {
            return this.runScript(this.getFilePath(this.scriptPath))
        }

        unregister() {
            this.objects.forEach(o => {
                if (o instanceof CustomMode) {
                    if (getActiveMode() == o) {
                        console.log(o)
                        dispatchEvent(new CustomEvent(
                            "g4modechange", {
                                detail: {
                                    mode: gameModes[0]
                                }
                            }
                        ))
                    }
                    let idx = gameModes.indexOf(o)
                    if (idx >= 0) gameModes.splice(idx, 1)
                }
            })

            this.unregisterAssets()
            this.isRunning = false

            updateModeButtons()
            updatePluginList()
        }
    }

    function updatePluginList() {
        let list = document.querySelector("div.pluginList")
        list.innerHTML = ""

        for (let plugin of loadedPlugins) {
            let div = document.createElement("div")
            div.classList.add("plugin")

            let toggle = document.createElement("div")
            toggle.classList.add("toggle")

            let checkbox = document.createElement("input")
            checkbox.type = "checkbox"
            checkbox.id = Math.floor(Math.random() * 1000000)
            if (plugin.isRunning) checkbox.checked = true
            toggle.appendChild(checkbox)

            checkbox.addEventListener("input", () => {
                if (checkbox.checked) {
                    checkbox.disabled = true
                    waitForAssetLoad(plugin.registerAssets()).then(() => {
                        plugin.run()
                        checkbox.disabled = false
                        setPluginAsRunning(plugin.directory)
                        updatePluginList()
                    })
                } else {
                    plugin.unregister()
                    setPluginAsStopped(plugin.directory)
                    updatePluginList()
                }
            })

            let label = document.createElement("label")
            label.htmlFor = checkbox.id

            let logo = document.createElement("img")
            logo.src = path.join(pluginPath, plugin.directory, plugin.icon)
            label.appendChild(logo)

            let name = document.createElement("p")
            name.textContent = plugin.name
            label.appendChild(name)

            toggle.appendChild(label)

            div.appendChild(toggle)

            let description = document.createElement("p")
            description.classList.add("description")
            description.textContent = plugin.description
            div.appendChild(description)

            if (plugin.isRunning) {
                let running = document.createElement("p")
                running.classList.add("running")
                running.textContent = "The plugin is enabled."
                div.appendChild(running)
            }

            let buttons = document.createElement("div")
            buttons.classList.add("buttons")

            let deleteBtn = document.createElement("button")
            deleteBtn.textContent = "Delete"
            buttons.appendChild(deleteBtn)

            div.appendChild(buttons)

            list.appendChild(div)
        }
    }

    function getRunningPlugins() {
        if (!localStorage.getItem("g4_runningPlugins")) localStorage["g4_runningPlugins"] = "[]"

        return JSON.parse(localStorage["g4_runningPlugins"])
    }

    function setPluginAsRunning(pluginID) {
        if (!localStorage.getItem("g4_runningPlugins")) localStorage["g4_runningPlugins"] = "[]"
        let plugins = JSON.parse(localStorage["g4_runningPlugins"])

        if (!plugins.includes(pluginID)) plugins.push(pluginID)

        localStorage["g4_runningPlugins"] = JSON.stringify(plugins)
    }

    function setPluginAsStopped(pluginID) {
        if (!localStorage.getItem("g4_runningPlugins")) localStorage["g4_runningPlugins"] = "[]"
        let plugins = JSON.parse(localStorage["g4_runningPlugins"])

        if (plugins.includes(pluginID)) plugins.splice(plugins.indexOf(pluginID), 1)

        localStorage["g4_runningPlugins"] = JSON.stringify(plugins)
    }

    function isPluginRunning(pluginID) {
        if (!localStorage.getItem("g4_runningPlugins")) localStorage["g4_runningPlugins"] = "[]"
        let plugins = JSON.parse(localStorage["g4_runningPlugins"])

        return plugins.includes(pluginID)
    }

    fs.readdirSync(pluginPath, {
        withFileTypes: true
    }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name).forEach(dir => {
        if (!fs.existsSync(path.join(pluginPath, dir, "manifest.json"))) return

        loadedPlugins.push(
            new Plugin(
                dir,
                JSON.parse(
                    fs.readFileSync(path.join(pluginPath, dir, "manifest.json"), "utf-8")
                ),
                isPluginRunning(dir)
            )
        )
    })

    addEventListener("g4runall", () => {
        loadedPlugins.forEach(plugin => {
            if (plugin.isRunning) plugin.run()
        })

        updatePluginList()
        updateModeButtons()
    })

    document.querySelector("div.pluginConsole > header span").addEventListener("click", () => {
        document.querySelector("div.pluginConsole").classList.toggle("collapsed")
    })

    // Plugin console filters
    if (!localStorage.getItem("g4_console_filter_apiCalls")) localStorage["g4_console_filter_apiCalls"] = false
    if (localStorage["g4_console_filter_apiCalls"] == "true") {
        document.querySelector("div.pluginConsole div.filters button.call").classList.add("active")
        document.querySelector("div.pluginConsole div.messages").classList.add("showCall")
    }
    document.querySelector("div.pluginConsole div.filters button.call").addEventListener("click", function() {
        this.classList.toggle("active")
        document.querySelector("div.pluginConsole div.messages").classList.toggle("showCall", this.classList.contains("active"))
        localStorage["g4_console_filter_apiCalls"] = this.classList.contains("active")
    })

    if (!localStorage.getItem("g4_console_filter_info")) localStorage["g4_console_filter_info"] = true
    if (localStorage["g4_console_filter_info"] == "true") {
        document.querySelector("div.pluginConsole div.filters button.info").classList.add("active")
        document.querySelector("div.pluginConsole div.messages").classList.add("showInfo")
    }
    document.querySelector("div.pluginConsole div.filters button.info").addEventListener("click", function() {
        this.classList.toggle("active")
        document.querySelector("div.pluginConsole div.messages").classList.toggle("showInfo", this.classList.contains("active"))
        localStorage["g4_console_filter_info"] = this.classList.contains("active")
    })

    if (!localStorage.getItem("g4_console_filter_warnings")) localStorage["g4_console_filter_warnings"] = true
    if (localStorage["g4_console_filter_warnings"] == "true") {
        document.querySelector("div.pluginConsole div.filters button.warning").classList.add("active")
        document.querySelector("div.pluginConsole div.messages").classList.add("showWarning")
    }
    document.querySelector("div.pluginConsole div.filters button.warning").addEventListener("click", function() {
        this.classList.toggle("active")
        document.querySelector("div.pluginConsole div.messages").classList.toggle("showWarning", this.classList.contains("active"))
        localStorage["g4_console_filter_warnings"] = this.classList.contains("active")
    })

    if (!localStorage.getItem("g4_console_filter_errors")) localStorage["g4_console_filter_errors"] = true
    if (localStorage["g4_console_filter_errors"] == "true") {
        document.querySelector("div.pluginConsole div.filters button.error").classList.add("active")
        document.querySelector("div.pluginConsole div.messages").classList.add("showError")
    }
    document.querySelector("div.pluginConsole div.filters button.error").addEventListener("click", function() {
        this.classList.toggle("active")
        document.querySelector("div.pluginConsole div.messages").classList.toggle("showError", this.classList.contains("active"))
        localStorage["g4_console_filter_errors"] = this.classList.contains("active")
    })

    // Clear console
    document.querySelector("button#clearPluginConsole").addEventListener("click", () => {
        document.querySelectorAll("div.pluginConsole div.messages tbody tr").forEach(row => {
            row.parentNode.removeChild(row)
        })
    })

    // Enable/disable plugin console
    if (!localStorage.getItem("g4_console_enabled")) localStorage["g4_console_enabled"] = false
    if (localStorage["g4_console_enabled"] == "true") {
        document.querySelector("input#settingShowConsole").checked = true
        document.querySelector("main").classList.add("visibleConsole")
    }
    document.querySelector("input#settingShowConsole").addEventListener("input", function() {
        localStorage["g4_console_enabled"] = this.checked
        document.querySelector("main").classList.toggle("visibleConsole", this.checked)
    })
})()
