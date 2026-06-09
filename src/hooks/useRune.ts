import { RefObject, useEffect } from 'react'
import * as PIXI from 'pixi.js'

interface Glyph {
  text: PIXI.Text
  vx: number
  vy: number
  born: number
  tIn: number
  tHold: number
  tOut: number
}

interface Ghost {
  active: boolean
  alpha: number
}

const RUNES   = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ']
const GLACIERS = ['#4FA4B8','#6BBDD1','#8BE0F2','#3C8A9E','#A5EDFC','#5CBED4']
const SILVERS  = ['#D2D7DF','#E2E7EF','#FFFFFF','#B2B8C2','#C2C8D2','#F0F4FA']
const MAX_GLYPHS = 30
const STOP_DELAY = 120

export function useRune(containerRef: RefObject<HTMLDivElement>): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const eventTarget = container.parentElement ?? container
    let app: PIXI.Application | null = null
    let isDestroyed = false
    let innerCleanup: (() => void) | null = null

    async function init() {
      const instance = new PIXI.Application()
      app = instance // Capture immediately

      try {
        await instance.init({
          width: container!.offsetWidth,
          height: container!.offsetHeight,
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })

        if (isDestroyed) {
          if (app) {
            app.destroy({ removeView: true })
            app = null
          }
          return
        }

        app.canvas.style.position = 'absolute'
        app.canvas.style.inset = '0'
        app.canvas.style.pointerEvents = 'none'
        container!.appendChild(app.canvas)

        const glyphs: Glyph[] = []
        const runeLayer = new PIXI.Container()
        const ghostLayer = new PIXI.Container()
        app.stage.addChild(runeLayer)
        app.stage.addChild(ghostLayer)

        let mouseX = -999, mouseY = -999
        let lastMouseX = -999, lastMouseY = -999
        let lastSpawnTime = 0
        let stopTimer: ReturnType<typeof setTimeout> | null = null

        const ghostText = new PIXI.Text({
          text: RUNES[0],
          style: new PIXI.TextStyle({
            fontFamily: 'Quantico, sans-serif',
            fontSize: 14,
            fill: '#8BE0F2',
            dropShadow: { color: '#4FA4B8', blur: 6, distance: 0, alpha: 1 }
          })
        })
        ghostText.alpha = 0
        ghostText.blendMode = 'add'
        ghostLayer.addChild(ghostText)

        const ghostState: Ghost = { active: false, alpha: 0 }

        const pickColor = (): { fill: string; shadowColor: string } => {
          if (Math.random() < 0.65) {
            return {
              fill: GLACIERS[Math.floor(Math.random() * GLACIERS.length)],
              shadowColor: '#4FA4B8'
            }
          }
          return {
            fill: SILVERS[Math.floor(Math.random() * SILVERS.length)],
            shadowColor: '#9DA8B8'
          }
        }

        const spawnGlyph = (cx: number, cy: number): void => {
          if (!app) return
          const angle  = Math.random() * Math.PI * 2
          const radius = 6 + Math.random() * 18
          const { fill, shadowColor } = pickColor()
          const size = 11 + Math.random() * 9

          const textObj = new PIXI.Text({
            text: RUNES[Math.floor(Math.random() * RUNES.length)],
            style: new PIXI.TextStyle({
              fontFamily: 'Quantico, sans-serif',
              fontSize: size,
              fill,
              dropShadow: { color: shadowColor, blur: 5 + Math.random() * 7, distance: 0, alpha: 1 }
            })
          })
          textObj.x = cx + Math.cos(angle) * radius
          textObj.y = cy + Math.sin(angle) * radius
          textObj.alpha = 0
          textObj.blendMode = 'add'

          if (glyphs.length >= MAX_GLYPHS) {
            const oldest = glyphs.splice(0, 1)[0]
            runeLayer.removeChild(oldest.text)
            oldest.text.destroy()
          }

          const glyph: Glyph = {
            text: textObj,
            vx: Math.cos(angle) * (0.18 + Math.random() * 0.22),
            vy: Math.sin(angle) * (0.18 + Math.random() * 0.22),
            born: performance.now(),
            tIn:   90  + Math.random() * 60,
            tHold: 100 + Math.random() * 80,
            tOut:  160 + Math.random() * 80,
          }
          runeLayer.addChild(textObj)
          glyphs.push(glyph)
        }

        const onMouseMove = (e: MouseEvent): void => {
          if (!container) return
          const rect = container.getBoundingClientRect()
          mouseX = e.clientX - rect.left
          mouseY = e.clientY - rect.top

          ghostState.active = false
          if (stopTimer) { clearTimeout(stopTimer); stopTimer = null }

          const dx = mouseX - lastMouseX
          const dy = mouseY - lastMouseY
          const speed = Math.sqrt(dx * dx + dy * dy)
          lastMouseX = mouseX
          lastMouseY = mouseY

          if (speed > 2) {
            const now = performance.now()
            if (now - lastSpawnTime >= 40) {
              lastSpawnTime = now
              const count = speed >= 12 ? 2 : 1
              for (let i = 0; i < count; i++) spawnGlyph(mouseX, mouseY)
            }
          }

          stopTimer = setTimeout(() => {
            ghostState.active = true
            ghostText.text = RUNES[Math.floor(Math.random() * RUNES.length)]
            ghostText.x = mouseX + 10
            ghostText.y = mouseY - 6
          }, STOP_DELAY)
        }

        const onMouseLeave = (): void => {
          mouseX = -999; mouseY = -999
          ghostState.active = false
          if (stopTimer) { clearTimeout(stopTimer); stopTimer = null }
        }

        eventTarget.addEventListener('mousemove', onMouseMove)
        eventTarget.addEventListener('mouseleave', onMouseLeave)

        const update = () => {
          if (isDestroyed || !app) return
          const now = performance.now()

          for (let i = glyphs.length - 1; i >= 0; i--) {
            const g = glyphs[i]
            const age = now - g.born

            if (age < g.tIn) {
              g.text.alpha = (age / g.tIn) * 0.85
              g.text.x += g.vx; g.text.y += g.vy
              g.vx *= 0.97;     g.vy *= 0.97
            } else if (age < g.tIn + g.tHold) {
              g.text.alpha = 0.85
              g.text.x += g.vx; g.text.y += g.vy
              g.vx *= 0.97;     g.vy *= 0.97
            } else if (age < g.tIn + g.tHold + g.tOut) {
              g.text.alpha = 0.85 * (1 - (age - g.tIn - g.tHold) / g.tOut)
            } else {
              runeLayer.removeChild(g.text)
              glyphs.splice(i, 1)
            }
          }

          if (ghostState.active && mouseX > -900) {
            ghostState.alpha = Math.min(ghostState.alpha + 0.04, 0.55)
          } else if (!ghostState.active && ghostState.alpha > 0) {
            ghostState.alpha = Math.max(0, ghostState.alpha - 0.06)
          }
          ghostText.alpha = ghostState.alpha
        }

        app.ticker.add(update)

        const resizeObserver = new ResizeObserver(() => {
          if (!isDestroyed && app?.renderer) {
            app.renderer.resize(container!.offsetWidth, container!.offsetHeight)
          }
        })
        resizeObserver.observe(container!)

        innerCleanup = () => {
          const appToDestroy = app
          if (appToDestroy) {
            app = null // Nullify first
            appToDestroy.ticker.remove(update)
            // Use timeout to ensure we are out of active cycles
            setTimeout(() => {
              try {
                if (appToDestroy.renderer) {
                  appToDestroy.destroy({ removeView: true })
                }
              } catch (e) {
                // Silent catch for Pixi internal teardown errors
              }
            }, 0)
          }
          eventTarget.removeEventListener('mousemove', onMouseMove)
          eventTarget.removeEventListener('mouseleave', onMouseLeave)
          resizeObserver.disconnect()
          if (stopTimer) clearTimeout(stopTimer)
        }

        if (isDestroyed) {
          innerCleanup()
        }
      } catch (err) {
        console.error('Pixi initialization failed', err)
      }
    }

    init()

    return () => {
      isDestroyed = true
      if (innerCleanup) {
        innerCleanup()
      }
    }
  }, [containerRef])
}
