/**
 * @type {Gamepad[]}
 */
let lastGamepadData = []

/**
 * @param {HTMLElement} domElement 
 * @param {string} eventName 
 */
function promisifyEvent(domElement, eventName) {
    return new Promise((resolve, reject) => {
        let callback = (event) => {
            domElement.removeEventListener(eventName, callback)
            
            resolve(event)
        }

        domElement.addEventListener(eventName, callback)
    })
}

/**
 * @param {Gamepad} gamepad 
 */
function getLastGamepadData(gamepad) {
    return lastGamepadData.find(g => gamepad.id == g.id)
}

/**
 * @param {Gamepad} gamepad 
 */
function flattenGamepadData(gamepad) {
    return {
        axes: gamepad.axes,
        buttons: gamepad.buttons.map(button => ({pressed: button.pressed})),
        id: gamepad.id
    }
}

/**
 * @param {Gamepad} gamepad 
 */
function setLastGamepadData(gamepad) {
    let index = lastGamepadData.findIndex(g => gamepad.id == g.id)

    if (index >= 0)
        lastGamepadData[index] = flattenGamepadData(gamepad)
    else
        lastGamepadData.push(flattenGamepadData(gamepad))
}

function processGamepadInputs() {
    let gamepads = navigator.getGamepads()

    Object.values(gamepads).forEach(gamepad => {
        if (!gamepad) return

        let last = getLastGamepadData(gamepad)
        
        if (last) {
            let didChangeAxes = last.axes.some((axis, i) => axis != gamepad.axes[i])

            if (didChangeAxes)
                window.dispatchEvent(new CustomEvent(
                    "g4gamepadaxischanged",
                    {
                        detail: {gamepad}
                    }
                ))

            gamepad.buttons.forEach((button, i) => {
                if (button.pressed && !last.buttons[i].pressed) {
                    window.dispatchEvent(new CustomEvent(
                        "g4gamepadbuttonpressed",
                        {
                            detail: {
                                gamepad, button: `Button${i}`
                            }
                        }
                    ))
                } else if (!button.pressed && last.buttons[i].pressed) {
                    window.dispatchEvent(new CustomEvent(
                        "g4gamepadbuttonreleased",
                        {
                            detail: {
                                gamepad, button: `Button${i}`
                            }
                        }
                    ))
                }
            })
        }

        setLastGamepadData(gamepad)
    })
}

function initInputSettings() {
    if (!localStorage.getItem("g4input_keyboardShoot")) localStorage["g4input_keyboardShoot"] = "Space"
    if (!localStorage.getItem("g4input_keyboardSlow")) localStorage["g4input_keyboardSlow"] = "KeyS"
    if (!localStorage.getItem("g4input_gamepadShoot")) localStorage["g4input_gamepadShoot"] = "not set"
    if (!localStorage.getItem("g4input_gamepadSlow")) localStorage["g4input_gamepadSlow"] = "not set"
}

function anyGamepadsConnected() {
    let gamepads = navigator.getGamepads()

    return Object.values(gamepads).some(gamepad => gamepad)
}

function updateGamepadUI() {
    let available = anyGamepadsConnected()

    if (available) {
        document.querySelector("span#noGamepads").style.display = "none"
        document.querySelectorAll("div.setting.gamepad").forEach(setting => setting.classList.remove("disabled"))
    } else {
        document.querySelector("span#noGamepads").style.display = "initial"
        document.querySelectorAll("div.setting.gamepad").forEach(setting => setting.classList.add("disabled"))
    }
}

initInputSettings()

// Change keyboard input
document.querySelectorAll("button.keyboardInput").forEach(button => {
    let promise = null
    let input = button.getAttribute("data-control")

    button.textContent = localStorage[`g4input_${input}`]

    button.addEventListener("click", (e) => {
        button.blur()

        if (button.classList.contains("waiting")) {
            button.classList.remove("waiting")
            button.textContent = localStorage[`g4input_${input}`]

            promise = null
        } else {
            button.classList.add("waiting")
            button.textContent = "Press a key..."

            promise = promisifyEvent(window, "keyup").then((e) => {
                if (!button.classList.contains("waiting")) return
                
                localStorage[`g4input_${input}`] = e.code

                button.classList.remove("waiting")    
                button.textContent = localStorage[`g4input_${input}`]
    
                promise = null
            })
        }
    })
})

// Change gamepad input
document.querySelectorAll("button.gamepadInput").forEach(button => {
    let promise = null
    let input = button.getAttribute("data-control")

    button.textContent = localStorage[`g4input_${input}`]

    button.addEventListener("click", (e) => {
        button.blur()

        if (button.classList.contains("waiting")) {
            button.classList.remove("waiting")
            button.textContent = localStorage[`g4input_${input}`]

            promise = null
        } else {
            button.classList.add("waiting")
            button.textContent = "Press a button..."

            promise = promisifyEvent(window, "g4gamepadbuttonpressed").then((e) => {
                if (!button.classList.contains("waiting")) return

                localStorage[`g4input_${input}`] = e.detail.button

                button.classList.remove("waiting")    
                button.textContent = localStorage[`g4input_${input}`]
    
                promise = null
            })
        }
    })
})

// Detect gamepads
window.addEventListener("gamepadconnected", (e) => {
    updateGamepadUI()
})
window.addEventListener("gamepaddisconnected", (e) => {
    updateGamepadUI()
})