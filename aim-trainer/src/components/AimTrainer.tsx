import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_BG_DEPTH,
  DEFAULT_DPI,
  DEFAULT_VALORANT_SENS,
  SENS_BASE_SCALE,
  VALORANT_YAW,
} from '../constants'
import type { TaskConfig } from '../types'

type RoundStatus = 'idle' | 'running' | 'ended'
type SettingsTab = 'dot' | 'background' | 'mouse' | 'crosshair'

type HitFlash = {
  x: number
  y: number
  z: number
  baseR: number
  hitAt: number
}

type Dot = {
  id: number
  x: number       // current world x
  y: number       // current world y
  z: number       // depth (bigger = farther)
  baseR: number
  ox: number      // origin world x (center of oscillation)
  oy: number      // origin world y
  amplitude: number // world-space oscillation radius
  freq: number    // rad/ms
  phase: number   // x phase offset
  phase2: number  // y phase offset (for 2d)
  moveType: string
  spawnedAt: number // performance.now() timestamp
}

const DOT_Z_MIN = 1
const DOT_Z_MAX = 7
const DOT_R_BASE_MIN = 7
const DOT_R_BASE_MAX = 14
const HIT_PADDING_PX = 10
const HIT_FLASH_MS = 160

type CrosshairConfig = {
  color: string
  outlineEnabled: boolean
  outlineOpacity: number
  outlineThickness: number
  dotEnabled: boolean
  dotOpacity: number
  dotThickness: number
  innerLinesEnabled: boolean
  innerLineOpacity: number
  innerLineLength: number
  innerLineThickness: number
  innerLineOffset: number
  outerLinesEnabled: boolean
  outerLineOpacity: number
  outerLineLength: number
  outerLineThickness: number
  outerLineOffset: number
}

const DEFAULT_CROSSHAIR: CrosshairConfig = {
  color: '#ffffff',
  outlineEnabled: true,
  outlineOpacity: 0.75,
  outlineThickness: 1,
  dotEnabled: true,
  dotOpacity: 1,
  dotThickness: 2,
  innerLinesEnabled: false,
  innerLineOpacity: 0.8,
  innerLineLength: 6,
  innerLineThickness: 2,
  innerLineOffset: 3,
  outerLinesEnabled: false,
  outerLineOpacity: 0.35,
  outerLineLength: 2,
  outerLineThickness: 2,
  outerLineOffset: 10,
}

const CH_COLORS = ['#ffffff', '#00ff87', '#ffff00', '#00d4ff', '#ff00e0', '#ff4444']

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

type Props = {
  task: TaskConfig
  onBack: () => void
}

export default function AimTrainer({ task, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const taskRef = useRef(task)  // stable ref so closures always read current task

  const dotsRef = useRef<Dot[]>([])
  const panRef = useRef({ x: 0, y: 0 })
  const nextIdRef = useRef(1)
  const statusRef = useRef<RoundStatus>('idle')
  const scoreRef = useRef(0)
  const timeLeftSecRef = useRef(task.roundDuration)
  const endAtRef = useRef(0)
  const nextSpawnAtRef = useRef(0)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const pointerLockedRef = useRef(false)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const countdownRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Draft UI state (settings modal)
  const [score, setScore] = useState(0)
  const [timeLeftSec, setTimeLeftSec] = useState(task.roundDuration)
  const [activeTab, setActiveTab] = useState<SettingsTab>('dot')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dotSize, setDotSize] = useState(task.targetSize)
  const [dotDepth, setDotDepth] = useState(task.targetDepth)
  const [dotColor, setDotColor] = useState(task.targetColor)
  const [bgDepth, setBgDepth] = useState(DEFAULT_BG_DEPTH)
  const [dpi, setDpi] = useState(DEFAULT_DPI)
  const [valorantSens, setValorantSens] = useState(DEFAULT_VALORANT_SENS)

  // Applied refs read by the game loop
  const dotSizeRef = useRef(task.targetSize)
  const dotDepthRef = useRef(task.targetDepth)
  const dotColorRef = useRef(task.targetColor)
  const bgDepthRef = useRef(DEFAULT_BG_DEPTH)
  const sensMultiplierRef = useRef(1.0)
  const crosshairRef = useRef<CrosshairConfig>(DEFAULT_CROSSHAIR)
  const crosshairHitFlashRef = useRef(0)
  const trackingScoreAccRef = useRef(0)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [crosshairDraft, setCrosshairDraft] = useState<CrosshairConfig>(DEFAULT_CROSSHAIR)

  const spawnDot = (id: number): Dot => {
    const { w, h } = sizeRef.current
    const pan = panRef.current
    const t = taskRef.current
    const now = performance.now()

    const zBase = DOT_Z_MIN + Math.random() * (DOT_Z_MAX - DOT_Z_MIN)
    const z = Math.max(0.6, zBase / dotDepthRef.current)
    const baseR = (DOT_R_BASE_MIN + Math.random() * (DOT_R_BASE_MAX - DOT_R_BASE_MIN)) * dotSizeRef.current
    const r = baseR / z

    // Motion parameters: sinusoidal oscillation around spawn origin
    const amplitude = t.movementType === 'stationary' ? 0 : t.movementSpeed * 1.5 * z
    const freq = t.movementType === 'stationary' ? 0 : (t.movementSpeed / 100) * 0.0008
    const phase = Math.random() * Math.PI * 2
    const phase2 = Math.random() * Math.PI * 2

    if (w <= 2 || h <= 2) {
      const angle = Math.random() * Math.PI * 2
      const rr = Math.sqrt(Math.random()) * 420
      const ox = Math.cos(angle) * rr
      const oy = Math.sin(angle) * rr
      return { id, x: ox, y: oy, z, baseR, ox, oy, amplitude, freq, phase, phase2, moveType: t.movementType, spawnedAt: now }
    }

    const centerX = w / 2
    const centerY = h / 2
    const spawnDiskR = Math.min(w, h) * t.spawnDistance
    const theta = Math.random() * Math.PI * 2
    const u = Math.sqrt(Math.random())
    const dx = Math.cos(theta) * u * spawnDiskR
    const dy = Math.sin(theta) * u * spawnDiskR
    const sx = centerX + dx
    const sy = centerY + dy
    const pad = Math.min(Math.max(8, r + 6), Math.min(w, h) * 0.35)
    const sxClamped = Math.max(pad, Math.min(w - pad, sx))
    const syClamped = Math.max(pad, Math.min(h - pad, sy))

    const worldX = pan.x + (sxClamped - centerX) * z
    const worldY = pan.y + (syClamped - centerY) * z

    return { id, x: worldX, y: worldY, z, baseR, ox: worldX, oy: worldY, amplitude, freq, phase, phase2, moveType: t.movementType, spawnedAt: now }
  }

  const resetRound = () => {
    statusRef.current = 'idle'
    scoreRef.current = 0
    trackingScoreAccRef.current = 0
    timeLeftSecRef.current = taskRef.current.roundDuration
    setScore(0)
    setTimeLeftSec(taskRef.current.roundDuration)
    endAtRef.current = 0
    nextSpawnAtRef.current = 0
    dotsRef.current = []
    panRef.current = { x: 0, y: 0 }
    nextIdRef.current = 1
    lastPointerRef.current = null
  }

  const startRound = () => {
    if (statusRef.current === 'running') return
    const t = taskRef.current
    statusRef.current = 'running'
    scoreRef.current = 0
    trackingScoreAccRef.current = 0
    timeLeftSecRef.current = t.roundDuration
    setScore(0)
    setTimeLeftSec(t.roundDuration)
    dotsRef.current = []
    panRef.current = { x: 0, y: 0 }
    nextIdRef.current = 1
    const now = performance.now()
    endAtRef.current = now + t.roundDuration * 1000
    nextSpawnAtRef.current = now + 350
    lastPointerRef.current = null
  }

  const startCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    countdownRef.current = 3
    let n = 3
    countdownTimerRef.current = setInterval(() => {
      n--
      if (n <= 0) {
        clearInterval(countdownTimerRef.current!)
        countdownTimerRef.current = null
        countdownRef.current = null
        startRound()
      } else {
        countdownRef.current = n
      }
    }, 1000)
  }

  const shoot = () => {
    if (statusRef.current !== 'running') return
    const t = taskRef.current
    if (t.movementType !== 'stationary') return  // tracking scores per-frame, not on click
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
      const sx = centerX + (d.x - crossX) / d.z
      const sy = centerY + (d.y - crossY) / d.z
      const r = d.baseR / d.z
      const dx = sx - centerX
      const dy = sy - centerY
      const distSq = dx * dx + dy * dy
      const hitR = r + HIT_PADDING_PX
      if (distSq <= hitR * hitR && distSq < bestDistSq) {
        bestDistSq = distSq
        bestIdx = i
      }
    }

    if (bestIdx >= 0) {
      dots.splice(bestIdx, 1)
      crosshairHitFlashRef.current = performance.now()
      setScore((s) => { const n = s + t.hitScore; scoreRef.current = n; return n })
    } else {
      if (dots.length > 0) dots.splice(0, dots.length)
      setScore((s) => { const n = s - t.missPenalty; scoreRef.current = n; return n })
    }

    nextSpawnAtRef.current = performance.now() + t.spawnDelay
  }

  const applyPanDelta = (dx: number, dy: number) => {
    const s = sensMultiplierRef.current
    const sdx = dx * s
    const sdy = dy * s
    const { w, h } = sizeRef.current
    const dots = dotsRef.current
    const t = taskRef.current

    // Clamp panning to keep the single stationary dot visible.
    // For moving targets or multi-target modes, allow free panning.
    if (w > 2 && h > 2 && dots.length === 1 && t.movementType === 'stationary') {
      const dot = dots[0]
      const centerX = w / 2
      const centerY = h / 2
      const rScreen = dot.baseR / dot.z
      const pad = Math.max(16, rScreen + 18)
      const z = dot.z

      const minPanX = dot.x - (w - pad - centerX) * z
      const maxPanX = dot.x - (pad - centerX) * z
      const minPanY = dot.y - (h - pad - centerY) * z
      const maxPanY = dot.y - (pad - centerY) * z

      panRef.current.x = Math.max(minPanX, Math.min(maxPanX, panRef.current.x + sdx))
      panRef.current.y = Math.max(minPanY, Math.min(maxPanY, panRef.current.y + sdy))
    } else {
      panRef.current.x += sdx
      panRef.current.y += sdy
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
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let rafId = 0
    let prevNow = 0
    const tick = (now: number) => {
      const dt = prevNow > 0 ? now - prevNow : 0
      prevNow = now

      const { w, h } = sizeRef.current
      const statusNow = statusRef.current
      const t = taskRef.current
      const centerX = w / 2
      const centerY = h / 2

      let onTargetIdx = -1

      if (statusNow === 'running') {
        // Expire dots that exceeded their lifetime
        if (t.targetLifetime > 0) {
          let expiredCount = 0
          dotsRef.current = dotsRef.current.filter((d) => {
            if (now - d.spawnedAt >= t.targetLifetime * 1000) { expiredCount++; return false }
            return true
          })
          if (expiredCount > 0) {
            setScore((s) => { const n = s - expiredCount * t.missPenalty; scoreRef.current = n; return n })
            nextSpawnAtRef.current = now + t.spawnDelay
          }
        }

        // Update moving dot positions (sinusoidal oscillation around spawn origin)
        for (const d of dotsRef.current) {
          if (d.amplitude > 0) {
            const elapsed = now - d.spawnedAt
            if (d.moveType === 'horizontal') {
              d.x = d.ox + d.amplitude * Math.sin(d.freq * elapsed + d.phase)
            } else if (d.moveType === 'vertical') {
              d.y = d.oy + d.amplitude * Math.sin(d.freq * elapsed + d.phase)
            } else if (d.moveType === '2d') {
              d.x = d.ox + d.amplitude * Math.sin(d.freq * elapsed + d.phase)
              d.y = d.oy + d.amplitude * Math.cos(d.freq * 1.3 * elapsed + d.phase2)
            }
          }
        }

        // Spawn new dots up to maxTargets
        while (dotsRef.current.length < t.maxTargets && now >= nextSpawnAtRef.current) {
          dotsRef.current.push(spawnDot(nextIdRef.current++))
          nextSpawnAtRef.current = now + t.spawnDelay
        }

        // Crosshair-on-dot overlap: find which dot (if any) the crosshair is over
        const crossX = panRef.current.x
        const crossY = panRef.current.y
        for (let i = 0; i < dotsRef.current.length; i++) {
          const d = dotsRef.current[i]
          const sx = centerX + (d.x - crossX) / d.z
          const sy = centerY + (d.y - crossY) / d.z
          const r = d.baseR / d.z
          const ddx = sx - centerX
          const ddy = sy - centerY
          if (ddx * ddx + ddy * ddy <= (r + HIT_PADDING_PX) * (r + HIT_PADDING_PX)) {
            onTargetIdx = i
            break
          }
        }

        // Time-based scoring for moving targets (tracking tasks)
        if (onTargetIdx >= 0 && t.movementType !== 'stationary') {
          crosshairHitFlashRef.current = now
          trackingScoreAccRef.current += (t.hitScore / 1000) * dt
          const whole = Math.floor(trackingScoreAccRef.current)
          if (whole > 0) {
            trackingScoreAccRef.current -= whole
            setScore(s => { const n = s + whole; scoreRef.current = n; return n })
          }
        }

        const remainingMs = Math.max(0, endAtRef.current - now)
        const remainingSec = Math.ceil(remainingMs / 1000)
        if (remainingSec !== timeLeftSecRef.current) {
          timeLeftSecRef.current = remainingSec
          setTimeLeftSec(remainingSec)
        }
        if (remainingMs <= 0) {
          statusRef.current = 'ended'
          timeLeftSecRef.current = 0
          setTimeLeftSec(0)
          dotsRef.current = []
        }
      }

      // ── Draw ──
      ctx.clearRect(0, 0, w, h)

      const pan = panRef.current

      // Background gradient
      const bg = ctx.createRadialGradient(centerX, centerY, Math.max(10, Math.min(w, h) * 0.02), centerX, centerY, Math.max(w, h) * 0.78)
      bg.addColorStop(0, 'rgba(10, 24, 68, 0.9)')
      bg.addColorStop(0.45, 'rgba(4, 10, 28, 0.96)')
      bg.addColorStop(1, 'rgba(0, 0, 0, 1)')
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Tunnel
      const tunnelWidth = w * 0.96
      const tunnelHeight = h * 0.94
      const vanishingX = centerX - pan.x * (0.08 * bgDepthRef.current)
      const vanishingY = centerY - pan.y * (0.08 * bgDepthRef.current)
      const layers = Math.round(10 + bgDepthRef.current * 6)

      ctx.save()
      ctx.lineWidth = 1
      for (let i = 0; i < layers; i++) {
        const tt = i / (layers - 1)
        const depth = tt * tt
        const rw = tunnelWidth * (1 - depth * 0.88)
        const rh = tunnelHeight * (1 - depth * 0.88)
        ctx.strokeStyle = `rgba(70, 170, 255, ${0.1 + (1 - tt) * 0.24})`
        ctx.strokeRect(vanishingX - rw / 2, vanishingY - rh / 2, rw, rh)
      }

      const verticalLines = 24
      const horizontalLines = 16
      for (let i = 0; i <= verticalLines; i++) {
        const x = (i / verticalLines) * tunnelWidth + (centerX - tunnelWidth / 2)
        ctx.beginPath(); ctx.moveTo(x, centerY - tunnelHeight / 2); ctx.lineTo(vanishingX + (x - centerX) * 0.12, vanishingY - tunnelHeight * 0.05)
        ctx.strokeStyle = 'rgba(70, 170, 255, 0.18)'; ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, centerY + tunnelHeight / 2); ctx.lineTo(vanishingX + (x - centerX) * 0.12, vanishingY + tunnelHeight * 0.05)
        ctx.stroke()
      }
      for (let i = 0; i <= horizontalLines; i++) {
        const y = (i / horizontalLines) * tunnelHeight + (centerY - tunnelHeight / 2)
        ctx.beginPath(); ctx.moveTo(centerX - tunnelWidth / 2, y); ctx.lineTo(vanishingX - tunnelWidth * 0.05, vanishingY + (y - centerY) * 0.12)
        ctx.strokeStyle = 'rgba(70, 170, 255, 0.14)'; ctx.stroke()
        ctx.beginPath(); ctx.moveTo(centerX + tunnelWidth / 2, y); ctx.lineTo(vanishingX + tunnelWidth * 0.05, vanishingY + (y - centerY) * 0.12)
        ctx.stroke()
      }

      // Light streaks
      for (let i = 0; i < 10; i++) {
        const px = ((i * 127 + Math.floor(now * 0.08)) % (w + 180)) - 90
        const py = ((i * 83 + Math.floor(now * 0.05)) % (h + 140)) - 70
        const glow = ctx.createLinearGradient(px - 28, py, px + 28, py)
        glow.addColorStop(0, 'rgba(0,0,0,0)')
        glow.addColorStop(0.5, 'rgba(90,210,255,0.22)')
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.strokeStyle = glow; ctx.lineWidth = 5
        ctx.beginPath(); ctx.moveTo(px - 24, py); ctx.lineTo(px + 24, py); ctx.stroke()
      }
      ctx.restore()

      // Dots
      for (let di = 0; di < dotsRef.current.length; di++) {
        const d = dotsRef.current[di]
        const sx = centerX + (d.x - pan.x) / d.z
        const sy = centerY + (d.y - pan.y) / d.z
        const r = d.baseR / d.z
        if (sx + r < 0 || sx - r > w || sy + r < 0 || sy - r > h) continue

        const depth01 = Math.max(0, Math.min(1, (DOT_Z_MAX - d.z) / (DOT_Z_MAX - DOT_Z_MIN)))
        const coreAlpha = 0.75 + depth01 * 0.25
        const glowAlpha = 0.12 + depth01 * 0.18
        const isHovered = di === onTargetIdx
        const rgb = isHovered ? { r: 255, g: 220, b: 0 } : hexToRgb(dotColorRef.current)

        // Lifetime warning pulse (flashes when < 30% lifetime remains)
        let sizeBoost = 0
        if (t.targetLifetime > 0) {
          const remaining = t.targetLifetime - (now - d.spawnedAt) / 1000
          if (remaining < t.targetLifetime * 0.3) {
            sizeBoost = Math.sin(now * 0.02) * 2
          }
        }

        ctx.beginPath()
        ctx.arc(sx, sy, r + 6 + sizeBoost, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${glowAlpha})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(1.3, r + sizeBoost), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${coreAlpha})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(sx, sy, Math.max(1.3, r + sizeBoost), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + depth01 * 0.25})`
        ctx.lineWidth = Math.max(1, r * 0.08)
        ctx.stroke()
      }

      // Crosshair (hidden during countdown)
      if (countdownRef.current === null) {
        const chCfg = now - crosshairHitFlashRef.current < 150
          ? { ...crosshairRef.current, color: '#ffff00' }
          : crosshairRef.current
        drawCrosshairAt(ctx, centerX, centerY, chCfg)
      }
      // Overlay text
      const cd = countdownRef.current
      if (cd !== null) {
        ctx.save()
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const fontSize = Math.round(Math.min(w, h) * 0.28)
        ctx.font = `900 ${fontSize}px system-ui, Segoe UI, Roboto, sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fillText(String(cd), centerX + 4, centerY + 4)
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.fillText(String(cd), centerX, centerY)
        ctx.restore()
      } else if (statusNow !== 'running') {
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.textAlign = 'center'
        ctx.font = '600 26px system-ui, Segoe UI, Roboto, sans-serif'
        if (statusNow === 'ended') {
          ctx.fillText('Round over', w / 2, h / 2 - 14)
          ctx.font = '500 20px system-ui, Segoe UI, Roboto, sans-serif'
          ctx.fillText(`Score: ${scoreRef.current}`, w / 2, h / 2 + 22)
          ctx.font = '400 15px system-ui, Segoe UI, Roboto, sans-serif'
          ctx.fillStyle = 'rgba(255,255,255,0.45)'
          ctx.fillText('Click or press R to play again', w / 2, h / 2 + 56)
        } else {
          ctx.fillText(taskRef.current.name, w / 2, h / 2 - 14)
          ctx.font = '400 17px system-ui, Segoe UI, Roboto, sans-serif'
          ctx.fillStyle = 'rgba(255,255,255,0.55)'
          ctx.fillText('Click to lock cursor & start', w / 2, h / 2 + 22)
        }
        ctx.restore()
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => { ro.disconnect(); cancelAnimationFrame(rafId) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onLockChange = () => { pointerLockedRef.current = document.pointerLockElement === canvasRef.current }
    document.addEventListener('pointerlockchange', onLockChange)

    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLockedRef.current || statusRef.current !== 'running') return
      applyPanDelta(e.movementX || 0, e.movementY || 0)
    }
    window.addEventListener('mousemove', onMouseMove)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') { resetRound(); startCountdown() }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      document.removeEventListener('pointerlockchange', onLockChange)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = 130, h = 130
    ctx.setTransform(2, 0, 0, 2, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#060d1e'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(88,214,255,0.07)'
    ctx.lineWidth = 1
    for (let x = 0; x <= w; x += 13) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
    for (let y = 0; y <= h; y += 13) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
    drawCrosshairAt(ctx, w / 2, h / 2, crosshairDraft)
  }, [crosshairDraft, settingsOpen, activeTab])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = canvasRef.current?.getBoundingClientRect()
    const cx = rect ? clamp(e.clientX, rect.left, rect.right) : 0
    const cy = rect ? clamp(e.clientY, rect.top, rect.bottom) : 0

    if (statusRef.current === 'idle' || statusRef.current === 'ended') {
      if (countdownRef.current !== null) return
      canvasRef.current?.requestPointerLock?.()
      resetRound()
      startCountdown()
      if (rect) lastPointerRef.current = { x: cx, y: cy }
      return
    }
    if (statusRef.current !== 'running') return
    shoot()
    canvasRef.current?.requestPointerLock?.()
    if (rect) lastPointerRef.current = { x: cx, y: cy }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== 'running' || pointerLockedRef.current) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = clamp(e.clientX, rect.left, rect.right)
    const cy = clamp(e.clientY, rect.top, rect.bottom)
    const last = lastPointerRef.current
    if (!last) { lastPointerRef.current = { x: cx, y: cy }; return }
    applyPanDelta(cx - last.x, cy - last.y)
    lastPointerRef.current = { x: cx, y: cy }
  }

  const handlePointerUp = () => { lastPointerRef.current = null }

  const setCh = <K extends keyof CrosshairConfig>(key: K, val: CrosshairConfig[K]) =>
    setCrosshairDraft(prev => ({ ...prev, [key]: val }))

  const chRow = (
    label: string, min: number, max: number, step: number,
    value: number, onChange: (v: number) => void, fmt?: (v: number) => string,
  ) => (
    <div className="aimCRow">
      <span className="aimCLabel">{label}</span>
      <div className="aimCSliderRow">
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
        <span className="aimCVal">{fmt ? fmt(value) : value}</span>
      </div>
    </div>
  )

  const applySettings = () => {
    dotSizeRef.current = dotSize
    dotDepthRef.current = dotDepth
    dotColorRef.current = dotColor
    bgDepthRef.current = bgDepth
    sensMultiplierRef.current = (dpi * valorantSens * VALORANT_YAW) / SENS_BASE_SCALE
    crosshairRef.current = crosshairDraft
    setSettingsOpen(false)
  }

  const resetSettings = () => {
    const t = taskRef.current
    setDotSize(t.targetSize)
    setDotDepth(t.targetDepth)
    setDotColor(t.targetColor)
    setBgDepth(DEFAULT_BG_DEPTH)
    setDpi(DEFAULT_DPI)
    setValorantSens(DEFAULT_VALORANT_SENS)
    dotSizeRef.current = t.targetSize
    dotDepthRef.current = t.targetDepth
    dotColorRef.current = t.targetColor
    bgDepthRef.current = DEFAULT_BG_DEPTH
    sensMultiplierRef.current = 1.0
    setCrosshairDraft(DEFAULT_CROSSHAIR)
    crosshairRef.current = DEFAULT_CROSSHAIR
  }

  return (
    <div className="aimApp">
      <div className="aimTopBar">
        <div className="aimStat">
          <div className="aimLabel">Score</div>
          <div className="aimValue">{score}</div>
        </div>
        <div className="aimStat aimStatCenter">
          <div className="aimLabel">Time</div>
          <div className="aimValue">{pad2(timeLeftSec)}</div>
        </div>
        <div className="aimActions">
          <button type="button" className="aimSettingsBtn" onClick={onBack} aria-label="Back to menu">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <button type="button" className="aimSettingsBtn" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            <i className="fa-solid fa-gear" />
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="aimModalOverlay" onClick={() => setSettingsOpen(false)}>
          <div className={`aimModal${activeTab === 'crosshair' ? ' aimModalWide' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="aimModalHeader">
              <span>Settings</span>
              <button type="button" className="aimModalClose" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="aimTabs" role="tablist" aria-label="Settings tabs">
              <button type="button" className={`aimTab ${activeTab === 'crosshair' ? 'isActive' : ''}`} onClick={() => setActiveTab('crosshair')}>Crosshair</button>
              <button type="button" className={`aimTab ${activeTab === 'dot' ? 'isActive' : ''}`} onClick={() => setActiveTab('dot')}>Dot</button>
              <button type="button" className={`aimTab ${activeTab === 'background' ? 'isActive' : ''}`} onClick={() => setActiveTab('background')}>Background</button>
              <button type="button" className={`aimTab ${activeTab === 'mouse' ? 'isActive' : ''}`} onClick={() => setActiveTab('mouse')}>Mouse</button>
            </div>
            {activeTab === 'crosshair' && (
              <div className="aimCPanel">
                <div className="aimCPreviewWrap">
                  <canvas ref={previewCanvasRef} width={260} height={260} className="aimCPreviewCanvas" />
                  <span className="aimCPreviewLabel">Preview</span>
                </div>
                <div className="aimCControls">
                  <div className="aimCSection">
                    <div className="aimCSTitle">Color</div>
                    <div className="aimCColorRow">
                      {CH_COLORS.map(c => (
                        <button key={c} type="button"
                          className={`aimCSwatch${crosshairDraft.color === c ? ' isActive' : ''}`}
                          style={{ background: c }} onClick={() => setCh('color', c)}
                          aria-label={`Color ${c}`} />
                      ))}
                      <input type="color" className="aimCColorInput" value={crosshairDraft.color}
                        onChange={e => setCh('color', e.target.value)} title="Custom color" />
                    </div>
                  </div>

                  <div className="aimCSection">
                    <div className="aimCSHeader">
                      <span className="aimCSTitle">Outline</span>
                      <button type="button" className={`aimCToggle${crosshairDraft.outlineEnabled ? ' isOn' : ''}`}
                        onClick={() => setCh('outlineEnabled', !crosshairDraft.outlineEnabled)}>
                        {crosshairDraft.outlineEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {crosshairDraft.outlineEnabled && <>
                      {chRow('Opacity', 0, 1, 0.05, crosshairDraft.outlineOpacity, v => setCh('outlineOpacity', v), v => v.toFixed(2))}
                      {chRow('Thickness', 1, 3, 1, crosshairDraft.outlineThickness, v => setCh('outlineThickness', v))}
                    </>}
                  </div>

                  <div className="aimCSection">
                    <div className="aimCSHeader">
                      <span className="aimCSTitle">Center Dot</span>
                      <button type="button" className={`aimCToggle${crosshairDraft.dotEnabled ? ' isOn' : ''}`}
                        onClick={() => setCh('dotEnabled', !crosshairDraft.dotEnabled)}>
                        {crosshairDraft.dotEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {crosshairDraft.dotEnabled && <>
                      {chRow('Opacity', 0, 1, 0.05, crosshairDraft.dotOpacity, v => setCh('dotOpacity', v), v => v.toFixed(2))}
                      {chRow('Size', 1, 6, 0.5, crosshairDraft.dotThickness, v => setCh('dotThickness', v), v => v.toFixed(1))}
                    </>}
                  </div>

                  <div className="aimCSection">
                    <div className="aimCSHeader">
                      <span className="aimCSTitle">Inner Lines</span>
                      <button type="button" className={`aimCToggle${crosshairDraft.innerLinesEnabled ? ' isOn' : ''}`}
                        onClick={() => setCh('innerLinesEnabled', !crosshairDraft.innerLinesEnabled)}>
                        {crosshairDraft.innerLinesEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {crosshairDraft.innerLinesEnabled && <>
                      {chRow('Opacity', 0, 1, 0.05, crosshairDraft.innerLineOpacity, v => setCh('innerLineOpacity', v), v => v.toFixed(2))}
                      {chRow('Length', 1, 15, 1, crosshairDraft.innerLineLength, v => setCh('innerLineLength', v))}
                      {chRow('Thickness', 1, 6, 1, crosshairDraft.innerLineThickness, v => setCh('innerLineThickness', v))}
                      {chRow('Offset', 0, 12, 1, crosshairDraft.innerLineOffset, v => setCh('innerLineOffset', v))}
                    </>}
                  </div>

                  <div className="aimCSection">
                    <div className="aimCSHeader">
                      <span className="aimCSTitle">Outer Lines</span>
                      <button type="button" className={`aimCToggle${crosshairDraft.outerLinesEnabled ? ' isOn' : ''}`}
                        onClick={() => setCh('outerLinesEnabled', !crosshairDraft.outerLinesEnabled)}>
                        {crosshairDraft.outerLinesEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    {crosshairDraft.outerLinesEnabled && <>
                      {chRow('Opacity', 0, 1, 0.05, crosshairDraft.outerLineOpacity, v => setCh('outerLineOpacity', v), v => v.toFixed(2))}
                      {chRow('Length', 1, 15, 1, crosshairDraft.outerLineLength, v => setCh('outerLineLength', v))}
                      {chRow('Thickness', 1, 6, 1, crosshairDraft.outerLineThickness, v => setCh('outerLineThickness', v))}
                      {chRow('Offset', 4, 20, 1, crosshairDraft.outerLineOffset, v => setCh('outerLineOffset', v))}
                    </>}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'dot' && (
              <div className="aimPanel">
                <label className="aimControl">
                  <span>Size</span>
                  <input type="range" min="0.6" max="2.2" step="0.1" value={dotSize} onChange={(e) => setDotSize(Number(e.target.value))} />
                </label>
                <label className="aimControl">
                  <span>Color</span>
                  <input type="color" value={dotColor} onChange={(e) => setDotColor(e.target.value)} />
                </label>
                <label className="aimControl">
                  <span>3D depth</span>
                  <input type="range" min="0.8" max="3" step="0.1" value={dotDepth} onChange={(e) => setDotDepth(Number(e.target.value))} />
                </label>
              </div>
            )}
            {activeTab === 'background' && (
              <div className="aimPanel">
                <label className="aimControl">
                  <span>Tunnel depth</span>
                  <input type="range" min="0.8" max="2" step="0.05" value={bgDepth} onChange={(e) => setBgDepth(Number(e.target.value))} />
                </label>
              </div>
            )}
            {activeTab === 'mouse' && (
              <div className="aimPanel aimPanelMouse">
                <label className="aimControl">
                  <span>DPI</span>
                  <select className="aimSelect" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
                    {[400, 800, 1600, 3200].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
                <label className="aimControl">
                  <span>Valorant sensitivity</span>
                  <div className="aimSliderRow">
                    <input type="range" min="0.1" max="3" step="0.05" value={valorantSens} onChange={(e) => setValorantSens(Number(e.target.value))} />
                    <span className="aimSliderVal">{valorantSens.toFixed(2)}</span>
                  </div>
                </label>
                <div className="aimSensStats">
                  <div className="aimSensStat">
                    <span className="aimSensLabel">eDPI</span>
                    <span className="aimSensValue">{Math.round(dpi * valorantSens)}</span>
                  </div>
                  <div className="aimSensStat">
                    <span className="aimSensLabel">cm / 360°</span>
                    <span className="aimSensValue">{((360 * 2.54) / (dpi * valorantSens * VALORANT_YAW)).toFixed(1)}</span>
                  </div>
                  <div className="aimSensStat">
                    <span className="aimSensLabel">Multiplier</span>
                    <span className="aimSensValue">{((dpi * valorantSens * VALORANT_YAW) / SENS_BASE_SCALE).toFixed(2)}×</span>
                  </div>
                </div>
              </div>
            )}
            <div className="aimModalFooter">
              <button type="button" className="aimModalResetBtn" onClick={resetSettings}>Reset</button>
              <button type="button" className="aimModalApplyBtn" onClick={applySettings}>Apply</button>
            </div>
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

function drawCrosshairAt(ctx: CanvasRenderingContext2D, cx: number, cy: number, cfg: CrosshairConfig) {
  const rgb = hexToRgb(cfg.color)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.lineCap = 'square'

  const strokeLines = (off: number, len: number, thick: number, color: string) => {
    ctx.lineWidth = thick
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(-off - len, 0); ctx.lineTo(-off, 0)
    ctx.moveTo(off, 0); ctx.lineTo(off + len, 0)
    ctx.moveTo(0, -off - len); ctx.lineTo(0, -off)
    ctx.moveTo(0, off); ctx.lineTo(0, off + len)
    ctx.stroke()
  }

  if (cfg.outlineEnabled) {
    const oc = `rgba(0,0,0,${cfg.outlineOpacity})`
    const ot = cfg.outlineThickness
    if (cfg.innerLinesEnabled) strokeLines(cfg.innerLineOffset, cfg.innerLineLength, cfg.innerLineThickness + ot * 2, oc)
    if (cfg.outerLinesEnabled) strokeLines(cfg.outerLineOffset, cfg.outerLineLength, cfg.outerLineThickness + ot * 2, oc)
    if (cfg.dotEnabled) {
      ctx.beginPath(); ctx.arc(0, 0, cfg.dotThickness + ot, 0, Math.PI * 2)
      ctx.fillStyle = oc; ctx.fill()
    }
  }

  const cc = `rgba(${rgb.r},${rgb.g},${rgb.b}`
  if (cfg.innerLinesEnabled) strokeLines(cfg.innerLineOffset, cfg.innerLineLength, cfg.innerLineThickness, `${cc},${cfg.innerLineOpacity})`)
  if (cfg.outerLinesEnabled) strokeLines(cfg.outerLineOffset, cfg.outerLineLength, cfg.outerLineThickness, `${cc},${cfg.outerLineOpacity})`)
  if (cfg.dotEnabled) {
    ctx.beginPath(); ctx.arc(0, 0, cfg.dotThickness, 0, Math.PI * 2)
    ctx.fillStyle = `${cc},${cfg.dotOpacity})`; ctx.fill()
  }

  ctx.restore()
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const normalized = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = Number.parseInt(normalized, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}
