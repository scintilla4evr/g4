class Viewport {
    get width() {}
    get height() {}

    createPath() {}

    setClipPath(path) {}
    clearClipPath() {}

    fillPath(path, fill) {}
    strokePath(path, stroke, lineWidth) {}

    drawImage(asset, x, y, w, h) {}

    translate(dX, dY) {}
    rotate(rot) {}
    scale(sX, sY) {}

    saveState() {}
    restoreState() {}

    get blendMode() {}
    set blendMode(mode) {}
}

class LevelRenderer {
    /**
     * @param {RingElement} element 
     * @returns {Path2D}
     */
    static getElementPath(item) {
        let path = new Path2D()

        switch (item.type) {
            case "ball":
            case "pulsingBall":
                path.arc(
                    item.distance * Math.cos(2 * Math.PI * item.angle) + item.centerX,
                    item.distance * Math.sin(2 * Math.PI * item.angle) + item.centerY,
                    item.radius,
                    0, 2 * Math.PI
                )
                path.closePath()
                break
            case "bar":
            case "marqueeBar":
                path.arc(
                    item.centerX, item.centerY, item.distance + item.radius,
                    2 * Math.PI * item.angleStart - 0.01,
                    2 * Math.PI * (item.angleStart + item.angleLength) + 0.01
                )
                path.arc(
                    item.centerX, item.centerY, item.distance - item.radius,
                    2 * Math.PI * (item.angleStart + item.angleLength) + 0.01,
                    2 * Math.PI * item.angleStart - 0.01,
                    true
                )
                break
        }

        return path
    }

    static getRingPath(ring) {
        let path = new Path2D()

        ring.items.forEach(item => path.addPath(LevelRenderer.getElementPath(item)))

        return path
    }

    static getCannonPath(cannon) {
        let path = new Path2D()

        path.moveTo(
            20 * Math.cos(2 * Math.PI * cannon.angle) + cannon.x,
            20 * Math.sin(2 * Math.PI * cannon.angle) + cannon.y
        )
        path.lineTo(
            20 * Math.cos(2 * Math.PI * cannon.angle + Math.PI - 0.8) + cannon.x,
            20 * Math.sin(2 * Math.PI * cannon.angle + Math.PI - 0.8) + cannon.y
        )
        path.lineTo(
            8 * Math.cos(2 * Math.PI * cannon.angle + Math.PI) + cannon.x,
            8 * Math.sin(2 * Math.PI * cannon.angle + Math.PI) + cannon.y
        )
        path.lineTo(
            20 * Math.cos(2 * Math.PI * cannon.angle + Math.PI + 0.8) + cannon.x,
            20 * Math.sin(2 * Math.PI * cannon.angle + Math.PI + 0.8) + cannon.y
        )
        path.closePath()

        return path
    }

    static isPow2(x) {
        return (x & (x - 1)) == 0
    }

    /**
     * @param {HTMLCanvasElement} canvas 
     * @returns {Viewport}
     */
    static createViewportFromCanvas(canvas) {
        let ctx = canvas.getContext("2d")
    
        let viewport = {
            get width() { return canvas.width },
            get height() { return canvas.height },

            createPath: () => { return new Path2D() },

            setClipPath: (path) => {
                ctx.clip(path)
            },
            resetClipPath: () => {
                ctx.clip(null)
            },

            fillPath: (path, fill) => {
                if (fill) ctx.fillStyle = fill
                ctx.fill(path)
            },
            strokePath: (path, stroke, lineWidth) => {
                if (lineWidth) ctx.lineWidth = lineWidth
                if (stroke) ctx.strokeStyle = stroke
                ctx.stroke(path)
            },

            
            drawImage: (asset, x, y, w, h) => {
                if (asset instanceof AssetLink) asset = getAssetFromLink(asset)
                if (!(asset instanceof ImageAsset)) return

                let img = asset.image

                ctx.drawImage(img, x, y, w, h)
            },

            translate: (dX, dY) => {
                ctx.translate(dX, dY)
            },
            rotate: (rot) => {
                ctx.rotate(rot)
            },
            scale: (sX, sY) => {
                ctx.scale(sX, sY)
            },

            saveState: () => {
                ctx.save()
            },
            restoreState: () => {
                ctx.restore()
            },

            get blendMode() { return ctx.globalCompositeOperation },
            set blendMode(m) { ctx.globalCompositeOperation = m }
        }
    
        Object.setPrototypeOf(viewport, Viewport.prototype)
    
        return viewport
    }
}
