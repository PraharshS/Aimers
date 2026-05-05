import { useEffect, useRef, useState } from 'react'

type RoundStatus = 'idle' | 'running' | 'ended'
type SettingsTab = 'dot' | 'background'

type Dot = {
  id: number
  x: number // world space
  y: number // world space
  z: number // depth (bigger z = farther)
  baseR: number // base radius used for perspective scaling
}

const ROUND_MS = 30_000
const SPAWN_DELAY_AFTER_SHOT_MS = 450
const MAX_ACTIVE_DOTS = 1

const DOT_Z_MIN = 1
const DOT_Z_MAX = 7
const DOT_R_BASE_MIN = 7
const DOT_R_BASE_MAX = 14
const SPAWN_DISK_FRACTION = 0.36 // spawn dots near the center; easier to reach

const HIT_PADDING_PX = 2

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function AimTrainer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const dotsRef = useRef<Dot[]>([])
  const panRef = useRef({ x: 0, y: 0 }) // world shift; crosshair is always at screen center
  const nextIdRef = useRef(1)

  const statusRef = useRef<RoundStatus>('idle')

  const [score, setScore] = useState(0)
  const [timeLeftSec, setTimeLeftSec] = useState(30)
  const [activeTab, setActiveTab] = useState<SettingsTab>('dot')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dotSize, setDotSize] = useState(1)
  const [dotDepth, setDotDepth] = useState(1.5)
  const [dotColor, setDotColor] = useState('#58d6ff')
  const [bgDepth, setBgDepth] = useState(1.12)
  const scoreRef = useRef(0)
  const timeLeftSecRef = useRef(30)

  const endAtRef = useRef(0)
  const nextSpawnAtRef = useRef(0)

  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const pointerLockedRef = useRef(false)

  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })

  const spawnDot = (id: number): Dot => {
    const { w, h } = sizeRef.current
    const pan = panRef.current

    const zBase = DOT_Z_MIN + Math.random() * (DOT_Z_MAX - DOT_Z_MIN)
    const z = Math.max(0.6, zBase / dotDepth)
    const baseR =
      (DOT_R_BASE_MIN + Math.random() * (DOT_R_BASE_MAX - DOT_R_BASE_MIN)) * dotSize
    const r = baseR / z

    // If we don't know canvas size yet, fall back to a safe default.
    if (w <= 2 || h <= 2) {
      const angle = Math.random() * Math.PI * 2
      const rr = Math.sqrt(Math.random()) * 420
      return { id, x: Math.cos(angle) * rr, y: Math.sin(angle) * rr, z, baseR }
    }

    const centerX = w / 2
    const centerY = h / 2

    // Spawn within a disk around the crosshair so it’s reachable without needing
    // extreme mouse panning.
    const spawnDiskR = Math.min(w, h) * SPAWN_DISK_FRACTION
    const theta = Math.random() * Math.PI * 2
    const u = Math.sqrt(Math.random())
    const dx = Math.cos(theta) * u * spawnDiskR
    const dy = Math.sin(theta) * u * spawnDiskR

    const sx = centerX + dx
    const sy = centerY + dy

    // Optional sanity clamp so the dot starts fully within view.
    const pad = Math.min(Math.max(8, r + 6), Math.min(w, h) * 0.35)
    const sxClamped = Math.max(pad, Math.min(w - pad, sx))
    const syClamped = Math.max(pad, Math.min(h - pad, sy))

    return {
      id,
      x: pan.x + (sxClamped - centerX) * z,
      y: pan.y + (syClamped - centerY) * z,
      z,
      baseR,
    }
  }

  const resetRound = () => {
    statusRef.current = 'idle'
    scoreRef.current = 0
    timeLeftSecRef.current = 30
    setScore(0)
    setTimeLeftSec(30)
    endAtRef.current = 0
    nextSpawnAtRef.current = 0
    dotsRef.current = []
    panRef.current = { x: 0, y: 0 }
    nextIdRef.current = 1
    lastPointerRef.current = null
  }

  const startRound = () => {
    if (statusRef.current === 'running') return

    statusRef.current = 'running'
    scoreRef.current = 0
    timeLeftSecRef.current = 30
    setScore(0)
    setTimeLeftSec(30)

    dotsRef.current = []
    panRef.current = { x: 0, y: 0 }
    nextIdRef.current = 1

    const now = performance.now()
    endAtRef.current = now + ROUND_MS
    nextSpawnAtRef.current = now + 350
    lastPointerRef.current = null
  }

  const shoot = () => {
    if (statusRef.current !== 'running') return

    const crossX = panRef.current.x
    const crossY = panRef.current.y

    const { w, h } = sizeRef.current
    const centerX = w / 2
    const centerY = h / 2

    let bestIdx = -1
    let bestDistSq = Infinity

    const dots = dotsRef.current
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]

      // Project dot to screen (crosshair is at screen center).
      const sx = centerX + (d.x - crossX) / d.z
      const sy = centerY + (d.y - crossY) / d.z
      const r = d.baseR / d.z

      const dx = sx - centerX
      const dy = sy - centerY
      const distSq = dx * dx + dy * dy

      const hitR = r + HIT_PADDING_PX
      const hitR2 = hitR * hitR

      if (distSq <= hitR2 && distSq < bestDistSq) {
        bestDistSq = distSq
        bestIdx = i
      }
    }

    if (bestIdx >= 0) {
      dots.splice(bestIdx, 1)
      setScore((s) => {
        const next = s + 10
        scoreRef.current = next
        return next
      })
    } else {
      // Miss: remove the current dot so spawning continues after each shot.
      if (dots.length > 0) dots.splice(0, dots.length)
      setScore((s) => {
        const next = s - 3
        scoreRef.current = next
        return next
      })
    }

    // Sequential spawning: next dot appears after a short delay.
    nextSpawnAtRef.current = performance.now() + SPAWN_DELAY_AFTER_SHOT_MS
  }

  const applyPanDelta = (dx: number, dy: number) => {
    const { w, h } = sizeRef.current
    const dots = dotsRef.current

    // Pan the "world" so the crosshair stays fixed at screen center.
    // If a dot is active, clamp panning so the dot remains within the visible area.
    if (w > 2 && h > 2 && dots.length > 0) {
      const dot = dots[0]
      const centerX = w / 2
      const centerY = h / 2

      const rScreen = dot.baseR / dot.z
      const pad = Math.max(16, rScreen + 18)
      const z = dot.z

      const leftXTerm = (pad - centerX) * z
      const rightXTerm = (w - pad - centerX) * z
      const minPanX = dot.x - rightXTerm
      const maxPanX = dot.x - leftXTerm

      const topYTerm = (pad - centerY) * z
      const bottomYTerm = (h - pad - centerY) * z
      const minPanY = dot.y - bottomYTerm
      const maxPanY = dot.y - topYTerm

      const nextPanX = panRef.current.x + dx
      const nextPanY = panRef.current.y + dy
      panRef.current.x = Math.max(minPanX, Math.min(maxPanX, nextPanX))
      panRef.current.y = Math.max(minPanY, Math.min(maxPanY, nextPanY))
    } else {
      panRef.current.x += dx
      panRef.current.y += dy
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.max(1, Math.floor((window.devicePixelRatio || 1) * 100) / 100)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: rect.width, h: rect.height, dpr }
    }

    resize()
    const ro = new ResizeObserver(() => resize())
    ro.observe(canvas)

    let rafId = 0
    const tick = (now: number) => {
      const { w, h } = sizeRef.current
      const statusNow = statusRef.current

      // Logic updates (keep dot/pan in refs; only score/time use React state).
      if (statusNow === 'running') {
        // Sequential spawning: only spawn when no dot is on screen.
        if (dotsRef.current.length < MAX_ACTIVE_DOTS && now >= nextSpawnAtRef.current) {
          dotsRef.current.push(spawnDot(nextIdRef.current++))
        }

        const remainingMs = Math.max(0, endAtRef.current - now)
        const remainingSec = Math.ceil(remainingMs / 1000)

        if (remainingSec !== timeLeftSecRef.current) {
          timeLeftSecRef.current = remainingSec
          setTimeLeftSec(remainingSec)
        }

        if (remainingMs <= 0) {
          statusRef.current = 'ended'
          // Ensure UI shows 0 instantly when time ends.
          timeLeftSecRef.current = 0
          setTimeLeftSec(0)
        }
      }

      // Draw
      ctx.clearRect(0, 0, w, h)

      // Background: black/blue 3D wireframe tunnel.
      const centerX = w / 2
      const centerY = h / 2
      const pan = panRef.current

      const bg = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.max(10, Math.min(w, h) * 0.02),
        centerX,
        centerY,
        Math.max(w, h) * 0.78,
      )
      bg.addColorStop(0, 'rgba(10, 24, 68, 0.9)')
      bg.addColorStop(0.45, 'rgba(4, 10, 28, 0.96)')
      bg.addColorStop(1, 'rgba(0, 0, 0, 1)')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      const tunnelWidth = w * 0.96
      const tunnelHeight = h * 0.94
      const vanishingX = centerX - pan.x * (0.08 * bgDepth)
      const vanishingY = centerY - pan.y * (0.08 * bgDepth)
      const layers = Math.round(10 + bgDepth * 6)

      ctx.save()
      ctx.strokeStyle = 'rgba(70, 170, 255, 0.26)'
      ctx.lineWidth = 1

      // Concentric tunnel rectangles.
      for (let i = 0; i < layers; i++) {
        const t = i / (layers - 1)
        const depth = t * t
        const rw = tunnelWidth * (1 - depth * 0.88)
        const rh = tunnelHeight * (1 - depth * 0.88)
        const rx = vanishingX - rw / 2
        const ry = vanishingY - rh / 2

        ctx.strokeStyle = `rgba(70, 170, 255, ${0.1 + (1 - t) * 0.24})`
        ctx.strokeRect(rx, ry, rw, rh)
      }

      // Floor/ceiling grid lines moving toward the vanishing point.
      const verticalLines = 24
      const horizontalLines = 16
      for (let i = 0; i <= verticalLines; i++) {
        const x = ((i / verticalLines) * tunnelWidth) + (centerX - tunnelWidth / 2)
        ctx.beginPath()
        ctx.moveTo(x, centerY - tunnelHeight / 2)
        ctx.lineTo(vanishingX + (x - centerX) * 0.12, vanishingY - tunnelHeight * 0.05)
        ctx.strokeStyle = 'rgba(70, 170, 255, 0.18)'
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(x, centerY + tunnelHeight / 2)
        ctx.lineTo(vanishingX + (x - centerX) * 0.12, vanishingY + tunnelHeight * 0.05)
        ctx.stroke()
      }

      for (let i = 0; i <= horizontalLines; i++) {
        const y = ((i / horizontalLines) * tunnelHeight) + (centerY - tunnelHeight / 2)
        ctx.beginPath()
        ctx.moveTo(centerX - tunnelWidth / 2, y)
        ctx.lineTo(vanishingX - tunnelWidth * 0.05, vanishingY + (y - centerY) * 0.12)
        ctx.strokeStyle = 'rgba(70, 170, 255, 0.14)'
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(centerX + tunnelWidth / 2, y)
        ctx.lineTo(vanishingX + tunnelWidth * 0.05, vanishingY + (y - centerY) * 0.12)
        ctx.stroke()
      }

      // Soft blue light streaks like the reference image.
      for (let i = 0; i < 10; i++) {
        const px = ((i * 127 + Math.floor(now * 0.08)) % (w + 180)) - 90
        const py = ((i * 83 + Math.floor(now * 0.05)) % (h + 140)) - 70
        const glow = ctx.createLinearGradient(px - 28, py, px + 28, py)
        glow.addColorStop(0, 'rgba(0, 0, 0, 0)')
        glow.addColorStop(0.5, 'rgba(90, 210, 255, 0.22)')
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.strokeStyle = glow
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(px - 24, py)
        ctx.lineTo(px + 24, py)
        ctx.stroke()
      }
      ctx.restore()

      // Dots (world -> screen)
      for (let i = 0; i < dotsRef.current.length; i++) {
        const d = dotsRef.current[i]
        const sx = centerX + (d.x - pan.x) / d.z
        const sy = centerY + (d.y - pan.y) / d.z
        const r = d.baseR / d.z

        if (sx + r < 0 || sx - r > w || sy + r < 0 || sy - r > h) continue

        const depth01 = Math.max(0, Math.min(1, (DOT_Z_MAX - d.z) / (DOT_Z_MAX - DOT_Z_MIN)))
        const coreAlpha = 0.75 + depth01 * 0.25
        const glowAlpha = 0.12 + depth01 * 0.18
        const dotRgb = hexToRgb(dotColor)

        // Outer glow
        ctx.beginPath()
        ctx.arc(sx, sy, r + 6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${dotRgb.r},${dotRgb.g},${dotRgb.b},${glowAlpha})`
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(1.3, r), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${dotRgb.r},${dotRgb.g},${dotRgb.b},${coreAlpha})`
        ctx.fill()

        // Rim highlight
        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(1.3, r), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + depth01 * 0.25})`
        ctx.lineWidth = Math.max(1, r * 0.08)
        ctx.stroke()
      }

      // Fixed crosshair at screen center (does NOT move with mouse)
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-16, 0)
      ctx.lineTo(-6, 0)
      ctx.moveTo(6, 0)
      ctx.lineTo(16, 0)
      ctx.moveTo(0, -16)
      ctx.lineTo(0, -6)
      ctx.moveTo(0, 6)
      ctx.lineTo(0, 16)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, 10, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.restore()

      if (statusNow !== 'running') {
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.textAlign = 'center'
        ctx.font = '600 26px system-ui, Segoe UI, Roboto, sans-serif'

        if (statusNow === 'ended') {
          ctx.fillText('Round over', w / 2, h / 2 - 10)
          ctx.font = '500 20px system-ui, Segoe UI, Roboto, sans-serif'
          ctx.fillText(`Score: ${scoreRef.current}`, w / 2, h / 2 + 28)
        } else {
          ctx.fillText('Aim at the dots', w / 2, h / 2 - 10)
          ctx.font = '500 20px system-ui, Segoe UI, Roboto, sans-serif'
          ctx.fillText('Move mouse to pan. Click to shoot.', w / 2, h / 2 + 28)
        }
        ctx.restore()
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Start immediately so you can test without pressing Start/Reset.
    startRound()

    const onLockChange = () => {
      pointerLockedRef.current = document.pointerLockElement === canvasRef.current
    }
    document.addEventListener('pointerlockchange', onLockChange)

    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLockedRef.current) return
      if (statusRef.current !== 'running') return
      applyPanDelta(e.movementX || 0, e.movementY || 0)
    }
    window.addEventListener('mousemove', onMouseMove)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        resetRound()
        startRound()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== 'running') return
    if (e.button === 0) shoot()

    // Keep receiving events even if the pointer moves outside the canvas.
    e.currentTarget.setPointerCapture(e.pointerId)

    // Pointer lock prevents the OS cursor from leaving the canvas region.
    // If the browser blocks it, it will gracefully fall back to normal mouse handling.
    if (e.button === 0) {
      canvasRef.current?.requestPointerLock?.()
    }

    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!rect) return

    const cx = clamp(e.clientX, rect.left, rect.right)
    const cy = clamp(e.clientY, rect.top, rect.bottom)
    lastPointerRef.current = { x: cx, y: cy }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== 'running') return
    if (pointerLockedRef.current) return

    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!rect) return

    const cx = clamp(e.clientX, rect.left, rect.right)
    const cy = clamp(e.clientY, rect.top, rect.bottom)

    const last = lastPointerRef.current
    if (!last) {
      lastPointerRef.current = { x: cx, y: cy }
      return
    }

    const dx = cx - last.x
    const dy = cy - last.y
    applyPanDelta(dx, dy)

    lastPointerRef.current = { x: cx, y: cy }
  }

  const handlePointerUp = () => {
    lastPointerRef.current = null
  }

  return (
    <div className="aimApp">
      <div className="aimTopBar">
        <div className="aimStat">
          <div className="aimLabel">Time</div>
          <div className="aimValue">{pad2(timeLeftSec)}</div>
        </div>
        <div className="aimStat">
          <div className="aimLabel">Score</div>
          <div className="aimValue">{score}</div>
        </div>
        <div className="aimActions">
          <div className="aimHint">Click canvas to shoot. Press R to restart.</div>
          <button
            type="button"
            className="aimSettingsBtn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <i className="fa-solid fa-gear" />
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="aimModalOverlay" onClick={() => setSettingsOpen(false)}>
          <div className="aimModal" onClick={(e) => e.stopPropagation()}>
            <div className="aimModalHeader">
              <span>Settings</span>
              <button
                type="button"
                className="aimModalClose"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="aimTabs" role="tablist" aria-label="Settings tabs">
              <button
                type="button"
                className={`aimTab ${activeTab === 'dot' ? 'isActive' : ''}`}
                onClick={() => setActiveTab('dot')}
              >
                Dot
              </button>
              <button
                type="button"
                className={`aimTab ${activeTab === 'background' ? 'isActive' : ''}`}
                onClick={() => setActiveTab('background')}
              >
                Background
              </button>
            </div>
            {activeTab === 'dot' ? (
              <div className="aimPanel">
                <label className="aimControl">
                  <span>Size</span>
                  <input
                    type="range"
                    min="0.6"
                    max="2.2"
                    step="0.1"
                    value={dotSize}
                    onChange={(e) => setDotSize(Number(e.target.value))}
                  />
                </label>
                <label className="aimControl">
                  <span>Color</span>
                  <input
                    type="color"
                    value={dotColor}
                    onChange={(e) => setDotColor(e.target.value)}
                  />
                </label>
                <label className="aimControl">
                  <span>3D depth</span>
                  <input
                    type="range"
                    min="0.8"
                    max="3"
                    step="0.1"
                    value={dotDepth}
                    onChange={(e) => setDotDepth(Number(e.target.value))}
                  />
                </label>
              </div>
            ) : (
              <div className="aimPanel">
                <label className="aimControl">
                  <span>Tunnel depth</span>
                  <input
                    type="range"
                    min="0.8"
                    max="2"
                    step="0.05"
                    value={bgDepth}
                    onChange={(e) => setBgDepth(Number(e.target.value))}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="aimCanvasWrap">
        <canvas
          ref={canvasRef}
          className="aimCanvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label="Aim trainer canvas"
        />
      </div>
    </div>
  )
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = Number.parseInt(normalized, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

