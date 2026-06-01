import { useEffect, useRef, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  DEFAULT_DPI,
  DEFAULT_VALORANT_SENS,
  SENS_BASE_SCALE,
  VALORANT_YAW,
} from '../constants'
import type { TaskConfig } from '../types'
import { ThreeBackground } from '../renderer/ThreeBackground'
import type { BackgroundType } from '../renderer/ThreeBackground'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const BACKGROUNDS: { id: BackgroundType; name: string; desc: string; grad: string }[] = [
  { id: 'tunnel', name: 'Cyber Tunnel', desc: 'Wireframe corridor',      grad: 'linear-gradient(135deg,#050a10 40%,#1a5580)' },
  { id: 'dojo',   name: 'Dojo',         desc: 'Japanese training room',  grad: 'linear-gradient(135deg,#1a0f07 40%,#8a9860)' },
  { id: 'bunker', name: 'Bunker',       desc: 'Concrete firing range',   grad: 'linear-gradient(135deg,#606468 40%,#87ceeb)' },
  { id: 'mars',   name: 'Mars Arena',   desc: 'Red planet battlefield',  grad: 'linear-gradient(135deg,#3a1808 40%,#c86030)' },
]

type RoundStatus = 'idle' | 'running' | 'ended'
type SettingsTab = 'dot' | 'background' | 'mouse' | 'crosshair'

// type HitFlash = {
//   x: number
//   y: number
//   z: number
//   baseR: number
//   hitAt: number
// }

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
// const HIT_FLASH_MS = 160

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
  const threeBackgroundRef = useRef<ThreeBackground | null>(null)

  // Game stats refs
  const hitsRef = useRef(0)
  const missesRef = useRef(0)
  const currentStreakRef = useRef(0)
  const maxStreakRef = useRef(0)
  const trackingOnTargetMsRef = useRef(0)
  const trackingOffTargetMsRef = useRef(0)

  // Draft UI state (settings modal)
  const [score, setScore] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [roundEnded, setRoundEnded] = useState(false)
  const [scoreSaveStatus, setScoreSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [personalScores, setPersonalScores] = useState<{ label: string; score: number }[]>([])
  const [personalHighScore, setPersonalHighScore] = useState(0)
  const [timeLeftSec, setTimeLeftSec] = useState(task.roundDuration)
  const [activeTab, setActiveTab] = useState<SettingsTab>('dot')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dotSize, setDotSize] = useState(task.targetSize)
  const [dotDepth, setDotDepth] = useState(task.targetDepth)
  const [dotColor, setDotColor] = useState(task.targetColor)
  const [backgroundType, setBackgroundType] = useState<BackgroundType>(
    () => (localStorage.getItem('aimers-bg') as BackgroundType | null) ?? 'tunnel'
  )
  const [dpi, setDpi] = useState(DEFAULT_DPI)
  const [valorantSens, setValorantSens] = useState(DEFAULT_VALORANT_SENS)

  // Applied refs read by the game loop
  const dotSizeRef = useRef(task.targetSize)
  const dotDepthRef = useRef(task.targetDepth)
  const dotColorRef = useRef(task.targetColor)
  const sensMultiplierRef = useRef(1.0)
  const crosshairRef = useRef<CrosshairConfig>(DEFAULT_CROSSHAIR)
  const crosshairHitFlashRef = useRef(0)
  const trackingScoreAccRef = useRef(0)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [crosshairDraft, setCrosshairDraft] = useState<CrosshairConfig>(DEFAULT_CROSSHAIR)

  const { user, profile } = useAuth()

  // Load DPI / sens from profile when it becomes available (overrides localStorage)
  useEffect(() => {
    if (!profile) return
    const d = profile.dpi ?? DEFAULT_DPI
    const s = profile.valorant_sens ?? DEFAULT_VALORANT_SENS
    setDpi(d)
    setValorantSens(s)
    const mult = (d * s * VALORANT_YAW) / SENS_BASE_SCALE
    sensMultiplierRef.current = isFinite(mult) ? mult : 1.0
  }, [profile])

  // Fetch personal scores for current task when round ends
  useEffect(() => {
    if (!roundEnded || !user) return
    supabase
      .from('scores')
      .select('score, played_at')
      .eq('user_id', user.id)
      .eq('task_id', taskRef.current.id)
      .order('played_at', { ascending: true })
      .limit(10)
      .then(({ data }) => {
        const scores = (data ?? []).map((row, i) => ({
          label: `#${i + 1}`,
          score: row.score,
        }))
        setPersonalScores(scores)
        const high = Math.max(0, ...(data?.map(r => r.score) ?? [0]))
        setPersonalHighScore(high)
      })
  }, [roundEnded, user])

  // Save score to Supabase when round ends (only if signed in)
  useEffect(() => {
    if (!roundEnded || !user) return

    const t = taskRef.current
    let hits = hitsRef.current
    let misses = missesRef.current
    let accuracy = 0

    // For tracking tasks, use on-target/off-target time instead
    if (t.movementType !== 'stationary') {
      hits = Math.round(trackingOnTargetMsRef.current / 100) // convert ms to tenths of seconds
      misses = Math.round(trackingOffTargetMsRef.current / 100)
      const total = hits + misses
      accuracy = total > 0 ? hits / total : 0
    } else {
      const totalShots = hits + misses
      accuracy = totalShots > 0 ? hits / totalShots : 0
    }

    setScoreSaveStatus('saving')
    supabase.from('scores').insert({
      user_id: user.id,
      task_id: t.id,
      task_name: t.name,
      score: scoreRef.current,
      hits,
      misses,
      accuracy,
      duration: t.roundDuration,
    }).then(({ error }) => {
      if (error) {
        console.error('[Scores] Failed to save score:', error.message)
        setScoreSaveStatus('error')
      } else {
        setScoreSaveStatus('saved')
      }
    })
  }, [roundEnded, user])

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
    hitsRef.current = 0
    missesRef.current = 0
    currentStreakRef.current = 0
    maxStreakRef.current = 0
    trackingOnTargetMsRef.current = 0
    trackingOffTargetMsRef.current = 0
    timeLeftSecRef.current = taskRef.current.roundDuration
    setScore(0)
    setHits(0)
    setMisses(0)
    setMaxStreak(0)
    setRoundEnded(false)
    setScoreSaveStatus('idle')
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
    hitsRef.current = 0
    missesRef.current = 0
    currentStreakRef.current = 0
    maxStreakRef.current = 0
    trackingOnTargetMsRef.current = 0
    trackingOffTargetMsRef.current = 0
    timeLeftSecRef.current = t.roundDuration
    setScore(0)
    setHits(0)
    setMisses(0)
    setMaxStreak(0)
    setRoundEnded(false)
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
      hitsRef.current++
      currentStreakRef.current++
      if (currentStreakRef.current > maxStreakRef.current) {
        maxStreakRef.current = currentStreakRef.current
        setMaxStreak(maxStreakRef.current)
      }
      setHits(hitsRef.current)
      setScore((s) => { const n = s + t.hitScore; scoreRef.current = n; return n })
    } else {
      if (dots.length > 0) dots.splice(0, dots.length)
      missesRef.current++
      currentStreakRef.current = 0
      setMisses(missesRef.current)
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

    // Initialise Three.js background and mount its canvas behind the 2D canvas
    const bg3 = new ThreeBackground()
    threeBackgroundRef.current = bg3
    const wrap = canvas.parentElement
    if (wrap) {
      const bc = bg3.canvas
      bc.style.position = 'absolute'
      bc.style.top = '0'
      bc.style.left = '0'
      bc.style.width = '100%'
      bc.style.height = '100%'
      bc.style.pointerEvents = 'none'
      bc.style.zIndex = '0'
      wrap.insertBefore(bc, canvas)   // insert BEFORE 2D canvas so it's behind
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.max(1, Math.floor((window.devicePixelRatio || 1) * 100) / 100)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { w: rect.width, h: rect.height, dpr }
      bg3.resize(rect.width, rect.height)
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
        if (t.movementType !== 'stationary') {
          if (onTargetIdx >= 0) {
            crosshairHitFlashRef.current = now
            trackingOnTargetMsRef.current += dt
            trackingScoreAccRef.current += (t.hitScore / 1000) * dt
            const whole = Math.floor(trackingScoreAccRef.current)
            if (whole > 0) {
              trackingScoreAccRef.current -= whole
              setScore(s => { const n = s + whole; scoreRef.current = n; return n })
            }
          } else {
            trackingOffTargetMsRef.current += dt
          }
        }

        const remainingMs = Math.max(0, endAtRef.current - now)
        const remainingSec = Math.ceil(remainingMs / 1000)
        if (remainingSec !== timeLeftSecRef.current) {
          timeLeftSecRef.current = remainingSec
          setTimeLeftSec(remainingSec)
        }
        if (remainingMs <= 0 && statusRef.current !== 'ended') {
          statusRef.current = 'ended'
          timeLeftSecRef.current = 0
          setTimeLeftSec(0)
          setRoundEnded(true)
          dotsRef.current = []
        }
      }

      // ── Draw ──
      const pan = panRef.current

      // Three.js background renders its own canvas; just clear the 2D overlay
      bg3.render(pan, now)
      ctx.clearRect(0, 0, w, h)

      // Dots — Canvas 2D radial-gradient spheres (Phong-look)
      for (let di = 0; di < dotsRef.current.length; di++) {
        const d = dotsRef.current[di]
        const sx = centerX + (d.x - pan.x) / d.z
        const sy = centerY + (d.y - pan.y) / d.z
        let r = d.baseR / d.z
        if (!isFinite(sx) || !isFinite(sy) || !isFinite(r)) continue
        if (sx + r < 0 || sx - r > w || sy + r < 0 || sy - r > h) continue
        if (t.targetLifetime > 0) {
          const remaining = t.targetLifetime - (now - d.spawnedAt) / 1000
          if (remaining < t.targetLifetime * 0.3) r += Math.sin(now * 0.02) * 2
        }
        r = Math.max(1, r)
        const isHovered = di === onTargetIdx
        drawSphere3D(ctx, sx, sy, r, dotColorRef.current, isHovered, now)
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
      } else if (statusNow === 'idle') {
        ctx.save()
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.textAlign = 'center'
        ctx.font = '600 26px system-ui, Segoe UI, Roboto, sans-serif'
        ctx.fillText(taskRef.current.name, w / 2, h / 2 - 14)
        ctx.font = '400 17px system-ui, Segoe UI, Roboto, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.fillText('Click to lock cursor & start', w / 2, h / 2 + 22)
        ctx.restore()
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => { ro.disconnect(); cancelAnimationFrame(rafId); bg3.dispose() }
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

  // Sync task prop changes into the ref so live-test updates take effect
  useEffect(() => {
    taskRef.current = task
    dotsRef.current = []
    nextSpawnAtRef.current = performance.now() + task.spawnDelay
  }, [task])

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
    sensMultiplierRef.current = (dpi * valorantSens * VALORANT_YAW) / SENS_BASE_SCALE
    crosshairRef.current = crosshairDraft
    localStorage.setItem('aimers-bg', backgroundType)
    if (user) {
      supabase.from('profiles').update({ dpi, valorant_sens: valorantSens }).eq('id', user.id)
    }
    setSettingsOpen(false)
  }

  const resetSettings = () => {
    const t = taskRef.current
    setDotSize(t.targetSize)
    setDotDepth(t.targetDepth)
    setDotColor(t.targetColor)
    setDpi(DEFAULT_DPI)
    setValorantSens(DEFAULT_VALORANT_SENS)
    dotSizeRef.current = t.targetSize
    dotDepthRef.current = t.targetDepth
    dotColorRef.current = t.targetColor
    sensMultiplierRef.current = 1.0
    setCrosshairDraft(DEFAULT_CROSSHAIR)
    crosshairRef.current = DEFAULT_CROSSHAIR
  }

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0

  return (
    <div className="aimApp">
      {/* HUD_A — minimal corners overlay */}
      <div className="aimHud">
        <div className="aimHudTopLeft">
          <div className="aimHudLabel">score</div>
          <div className="aimHudValue">{score.toLocaleString()}</div>
        </div>
        <div className="aimHudTopCenter">
          <div className="aimHudLabel">time</div>
          <div className={`aimHudValue aimHudValueLg${timeLeftSec <= 10 ? ' aimHudValueAccent' : ''}`}>
            {pad2(Math.floor(timeLeftSec / 60))}:{pad2(timeLeftSec % 60)}
          </div>
        </div>
        <div className="aimHudBottomRight">
          <div className="aimHudStatGroup">
            <div className="aimHudLabel">acc</div>
            <div className="aimHudValue" style={{ fontSize: 18 }}>{accuracy}%</div>
          </div>
          <div className="aimHudStatGroup">
            <div className="aimHudLabel">streak</div>
            <div className="aimHudValue aimHudValueAccent" style={{ fontSize: 18 }}>×{maxStreak}</div>
          </div>
        </div>
        <div className="aimHudActions">
          <button type="button" className="aimIconBtn" onClick={onBack} aria-label="Back to menu">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <button type="button" className="aimIconBtn" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
            <i className="fa-solid fa-gear" />
          </button>
        </div>
      </div>

      {/* Results overlay */}
      {roundEnded && (
        <div className="aimResultsOverlay">
          <div className="aimResultsCard">
            <div className="aimResultsDrillLabel">{task.name} · {task.roundDuration}s · run complete</div>
            <div className="aimResultsScore">{score.toLocaleString()}</div>
            <div className="aimResultsScoreLabel">
              score
              {personalHighScore > 0 && score > personalHighScore && <span className="aimNewRecord">🎉 NEW RECORD</span>}
            </div>

            {user && personalScores.length > 0 && (
              <div className="aimResultsChart">
                <div className="aimChartLabel">Your Performance</div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={personalScores} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} width={30} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(3,8,18,0.95)', border: '1px solid rgba(88,214,255,0.2)', borderRadius: '4px', fontSize: 11 }}
                      formatter={(value) => value}
                    />
                    <Line type="monotone" dataKey="score" stroke="#58d6ff" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="aimChartStats">
                  <div><span>High Score:</span> <strong>{personalHighScore.toLocaleString()}</strong></div>
                  <div><span>Current:</span> <strong>{score.toLocaleString()}</strong></div>
                </div>
              </div>
            )}

            <div className="aimResultsKpis">
              <div className="aimResultsKpi">
                <div className="aimHudLabel">accuracy</div>
                <div className="aimResultsKpiValue">{accuracy}%</div>
              </div>
              <div className="aimResultsKpiDivider" />
              <div className="aimResultsKpi">
                <div className="aimHudLabel">hits</div>
                <div className="aimResultsKpiValue">{hits}</div>
              </div>
              <div className="aimResultsKpiDivider" />
              <div className="aimResultsKpi">
                <div className="aimHudLabel">best streak</div>
                <div className="aimResultsKpiValue">×{maxStreak}</div>
              </div>
            </div>
            {user && (
              <div className="aimResultsSaveStatus">
                {scoreSaveStatus === 'saving' && <span className="aimSaveLabel">Saving…</span>}
                {scoreSaveStatus === 'saved'  && <span className="aimSaveLabel isSaved"><i className="fa-solid fa-check" /> Saved</span>}
                {scoreSaveStatus === 'error'  && <span className="aimSaveLabel isError"><i className="fa-solid fa-triangle-exclamation" /> Failed to save</span>}
              </div>
            )}
            <div className="aimResultsActions">
              <button
                type="button"
                className="gxBtn isSm"
                onClick={() => { resetRound(); startCountdown() }}
              >
                [R] retry
              </button>
              <button
                type="button"
                className="gxBtn isSm"
                onClick={onBack}
              >
                menu
              </button>
              <button
                type="button"
                className="gxBtn isSm isPrimary"
                onClick={() => { resetRound(); startCountdown() }}
              >
                play again ▸
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div className="aimBgPanel">
                <div className="aimBgGrid">
                  {BACKGROUNDS.map(bg => (
                    <button
                      key={bg.id}
                      type="button"
                      className={`aimBgCard${backgroundType === bg.id ? ' isSelected' : ''}`}
                      onClick={() => {
                        setBackgroundType(bg.id)
                        threeBackgroundRef.current?.setBackground(bg.id)
                      }}
                    >
                      <div className="aimBgThumb" style={{ background: bg.grad }} />
                      <div className="aimBgMeta">
                        <span className="aimBgName">{bg.name}</span>
                        <span className="aimBgDesc">{bg.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
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

function drawSphere3D(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, r: number,
  hex: string,
  active: boolean,
  now: number,
) {
  const { r: rv, g: gv, b: bv } = hexToRgb(hex)

  // Active glow ring behind sphere
  if (active) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006)
    const glow = ctx.createRadialGradient(sx, sy, r * 0.85, sx, sy, r * 1.45)
    glow.addColorStop(0, `rgba(255,220,0,${(0.25 + pulse * 0.3).toFixed(2)})`)
    glow.addColorStop(1, 'rgba(255,220,0,0)')
    ctx.beginPath(); ctx.arc(sx, sy, r * 1.45, 0, Math.PI * 2)
    ctx.fillStyle = glow; ctx.fill()
  }

  // Sphere body — radial gradient simulating Phong lighting
  // Light source: upper-left-front → highlight offset
  const hx = sx - r * 0.30
  const hy = sy - r * 0.34
  const lit  = (c: number) => Math.min(255, Math.round(c + 70))
  const dark = (c: number) => Math.round(c * 0.22)
  const grd = ctx.createRadialGradient(hx, hy, r * 0.02, sx, sy, r)
  grd.addColorStop(0,    'rgba(255,255,255,0.92)')
  grd.addColorStop(0.18, `rgb(${lit(rv)},${lit(gv)},${lit(bv)})`)
  grd.addColorStop(0.62, `rgb(${rv},${gv},${bv})`)
  grd.addColorStop(1,    `rgb(${dark(rv)},${dark(gv)},${dark(bv)})`)
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.fillStyle = grd; ctx.fill()

  // Rim highlight (thin bright crescent at upper-left edge)
  const rim = ctx.createRadialGradient(hx - r * 0.1, hy - r * 0.1, r * 0.6, sx, sy, r)
  rim.addColorStop(0,   'rgba(255,255,255,0)')
  rim.addColorStop(0.8, 'rgba(255,255,255,0)')
  rim.addColorStop(1,   'rgba(255,255,255,0.18)')
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2)
  ctx.fillStyle = rim; ctx.fill()
}
