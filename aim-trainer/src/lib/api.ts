/**
 * Client for the Aimers REST API (Django backend).
 *
 * - The short-lived access token is kept in memory only (never localStorage).
 * - The refresh token lives in an httpOnly cookie the browser sends for us.
 * - On a 401 the client refreshes the session once and retries the request.
 */

const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000/api/v1'
).replace(/\/$/, '')

// ---------- types ----------

export type Profile = {
  id: string
  username: string
  email: string
  dpi: number
  valorant_sens: number
  avatar_url: string
  created_at: string
}

export type ScoreRow = {
  id?: string
  rank?: number
  username?: string
  avatar_url?: string
  task_id: string
  task_name: string
  score: number
  hits: number
  misses: number
  accuracy: number
  duration?: number
  played_at: string
}

export type RunConfig = {
  roundDuration: number
  hitScore: number
  missPenalty: number
  movementType: 'stationary' | 'horizontal' | 'vertical' | '2d'
  maxTargets: number
  spawnDelay: number
}

export type FinishedRun = ScoreRow & { personal_best: boolean }
export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all'
export type TrendPeriod = 'hourly' | 'daily' | 'weekly'
export type TrendPoint = { bucket: string; score: number; count: number }

// ---------- errors ----------

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** First human-readable message in a DRF error body ({detail}, or {field: [msgs]}). */
export function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>
    if (typeof record.detail === 'string') return record.detail
    for (const value of Object.values(record)) {
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
      if (typeof value === 'string') return value
    }
  }
  return fallback
}

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  return err instanceof Error && err.message ? err.message : fallback
}

// ---------- session + transport ----------

let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null
const expiredListeners = new Set<() => void>()

/** Called when the session can no longer be refreshed (user must sign in again). */
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener)
  return () => expiredListeners.delete(listener)
}

function clearSession() {
  accessToken = null
  expiredListeners.forEach((listener) => listener())
}

/** Exchange the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Requested-With': 'aimers' },
        })
        if (!res.ok) {
          accessToken = null
          return null
        }
        const data = (await res.json()) as { access: string }
        accessToken = data.access
        return accessToken
      } catch {
        return null // network error: keep whatever we had, the caller will surface the failure
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

type Options = {
  method?: string
  json?: unknown
  form?: FormData
  auth?: boolean // send the access token (default true)
  csrfHeader?: boolean // cookie-authenticated endpoints need this header
}

async function request<T>(path: string, opts: Options = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (opts.csrfHeader) headers['X-Requested-With'] = 'aimers'

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
  })

  if (res.status === 401 && opts.auth !== false && !retried) {
    const token = await refreshSession()
    if (token) return request<T>(path, opts, true)
    clearSession()
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  const body = text ? safeJson(text) : null
  if (!res.ok) {
    throw new ApiError(res.status, body, messageFrom(body, `Request failed (${res.status})`))
  }
  return body as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

// ---------- auth ----------

type Session = { user: Profile; access: string }

async function startSession(path: string, json: unknown): Promise<Profile> {
  const data = await request<Session>(path, { method: 'POST', json, auth: false })
  accessToken = data.access
  return data.user
}

export const register = (username: string, email: string, password: string) =>
  startSession('/auth/register/', { username, email, password })

export const login = (identifier: string, password: string) =>
  startSession('/auth/login/', { identifier, password })

export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout/', { method: 'POST', auth: false, csrfHeader: true })
  } finally {
    accessToken = null
  }
}

/** On page load: use the refresh cookie to sign back in. Resolves to the profile or null. */
export async function restoreSession(): Promise<Profile | null> {
  const token = await refreshSession()
  return token ? getMe() : null
}

// ---------- profile ----------

export const getMe = () => request<Profile>('/me/')

export const updateMe = (changes: Partial<Pick<Profile, 'username' | 'dpi' | 'valorant_sens'>>) =>
  request<Profile>('/me/', { method: 'PATCH', json: changes })

export function uploadAvatar(file: Blob, filename = 'avatar.jpg') {
  const form = new FormData()
  form.append('file', file, filename)
  return request<Profile>('/me/avatar/', { method: 'POST', form })
}

export const removeAvatar = () => request<Profile>('/me/avatar/', { method: 'DELETE' })

// ---------- runs ----------

export const startRun = (taskId: string, taskName: string, config: RunConfig) =>
  request<{ id: string; duration: number }>('/runs/start/', {
    method: 'POST',
    json: { task_id: taskId, task_name: taskName, config },
  })

export const finishRun = (runId: string, result: { score: number; hits: number; misses: number }) =>
  request<FinishedRun>(`/runs/${runId}/finish/`, { method: 'POST', json: result })

export async function getMyRuns(opts: { taskId?: string; limit?: number } = {}): Promise<ScoreRow[]> {
  const data = await request<{ results: ScoreRow[] }>(
    `/me/runs/${query({ task_id: opts.taskId, limit: opts.limit })}`,
  )
  return data.results
}

export async function getMyBests(): Promise<Record<string, number>> {
  const data = await request<{ bests: Record<string, number> }>('/me/bests/')
  return data.bests
}

// ---------- public ----------

export async function getLeaderboard(
  opts: { task?: string; period?: LeaderboardPeriod; limit?: number } = {},
): Promise<ScoreRow[]> {
  const data = await request<{ results: ScoreRow[] }>(
    `/leaderboard/${query({ task: opts.task, period: opts.period, limit: opts.limit })}`,
    { auth: false },
  )
  return data.results
}

export async function getTrend(opts: { task?: string; period?: TrendPeriod } = {}): Promise<TrendPoint[]> {
  const data = await request<{ results: TrendPoint[] }>(
    `/leaderboard/trend/${query({ task: opts.task, period: opts.period })}`,
    { auth: false },
  )
  return data.results
}

export async function getRecentPlayers(): Promise<ScoreRow[]> {
  const data = await request<{ results: ScoreRow[] }>('/players/recent/', { auth: false })
  return data.results
}
