import { beforeEach, describe, expect, it, vi } from 'vitest'

const PROFILE = {
  id: 'u1', username: 'ace', email: 'ace@example.com', dpi: 800,
  valorant_sens: 0.5, avatar_url: '', created_at: '2026-01-01T00:00:00Z',
}

function reply(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

type FetchMock = ReturnType<typeof vi.fn>
let fetchMock: FetchMock

async function loadApi() {
  vi.resetModules() // fresh module = fresh in-memory token for every test
  return import('./api')
}

function lastCall(index = -1) {
  const calls = fetchMock.mock.calls
  const [url, init] = calls.at(index) as [string, RequestInit]
  return { url, init, headers: (init.headers ?? {}) as Record<string, string> }
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

describe('api client', () => {
  it('logs in, keeps the access token in memory and sends it on later calls', async () => {
    const api = await loadApi()
    fetchMock
      .mockResolvedValueOnce(reply(200, { user: PROFILE, access: 'tok1' }))
      .mockResolvedValueOnce(reply(200, PROFILE))

    expect((await api.login('ace', 'pw')).username).toBe('ace')
    await api.getMe()

    expect(lastCall(0).url).toMatch(/\/auth\/login\/$/)
    expect(lastCall(0).headers.Authorization).toBeUndefined()
    expect(lastCall(1).headers.Authorization).toBe('Bearer tok1')
    expect(lastCall(1).init.credentials).toBe('include')
  })

  it('refreshes once on a 401 and retries the request with the new token', async () => {
    const api = await loadApi()
    fetchMock
      .mockResolvedValueOnce(reply(401, { detail: 'expired' })) // /me/ with no/old token
      .mockResolvedValueOnce(reply(200, { access: 'fresh' })) // /auth/refresh/
      .mockResolvedValueOnce(reply(200, PROFILE)) // /me/ retried

    expect((await api.getMe()).id).toBe('u1')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(lastCall(1).url).toMatch(/\/auth\/refresh\/$/)
    expect(lastCall(1).headers['X-Requested-With']).toBe('aimers')
    expect(lastCall(2).headers.Authorization).toBe('Bearer fresh')
  })

  it('shares one refresh request between concurrent 401s', async () => {
    const api = await loadApi()
    let refreshCalls = 0
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh/')) {
        refreshCalls++
        return reply(200, { access: 'fresh' })
      }
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === 'Bearer fresh' ? reply(200, { bests: { gridshot: 10 } }) : reply(401, {})
    })

    const results = await Promise.all([api.getMyBests(), api.getMyBests(), api.getMyBests()])
    expect(results).toEqual([{ gridshot: 10 }, { gridshot: 10 }, { gridshot: 10 }])
    expect(refreshCalls).toBe(1)
  })

  it('reports an expired session when the refresh fails', async () => {
    const api = await loadApi()
    const expired = vi.fn()
    api.onSessionExpired(expired)
    fetchMock
      .mockResolvedValueOnce(reply(401, { detail: 'Not signed in.' }))
      .mockResolvedValueOnce(reply(401, { detail: 'Session expired.' }))

    await expect(api.getMe()).rejects.toMatchObject({ status: 401 })
    expect(expired).toHaveBeenCalledOnce()
  })

  it('does not retry forever when the retried request is still 401', async () => {
    const api = await loadApi()
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/auth/refresh/') ? reply(200, { access: 'fresh' }) : reply(401, { detail: 'nope' }),
    )
    await expect(api.getMe()).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(3) // call, refresh, one retry
  })

  it('turns API validation errors into readable messages', async () => {
    const api = await loadApi()
    fetchMock.mockResolvedValueOnce(reply(400, { username: ['This username is already taken.'] }))
    await expect(api.register('ace', 'a@b.co', 'pw')).rejects.toThrow('This username is already taken.')
  })

  it('does not send the access token to public endpoints', async () => {
    const api = await loadApi()
    fetchMock
      .mockResolvedValueOnce(reply(200, { user: PROFILE, access: 'tok1' }))
      .mockResolvedValueOnce(reply(200, { results: [] }))
    await api.login('ace', 'pw')
    await api.getLeaderboard({ task: 'gridshot', period: 'week', limit: 10 })
    expect(lastCall().headers.Authorization).toBeUndefined()
    expect(lastCall().url).toMatch(/\/leaderboard\/\?task=gridshot&period=week&limit=10$/)
  })

  it('logout calls the API with the CSRF header and forgets the token', async () => {
    const api = await loadApi()
    fetchMock
      .mockResolvedValueOnce(reply(200, { user: PROFILE, access: 'tok1' }))
      .mockResolvedValueOnce(reply(204))
      .mockResolvedValueOnce(reply(401, {})) // /me/ after logout: no token any more
      .mockResolvedValueOnce(reply(401, {})) // refresh fails
    await api.login('ace', 'pw')
    await api.logout()
    expect(lastCall(1).headers['X-Requested-With']).toBe('aimers')
    await expect(api.getMe()).rejects.toMatchObject({ status: 401 })
    expect(lastCall(2).headers.Authorization).toBeUndefined()
  })

  it('restoreSession returns null when there is no valid refresh cookie', async () => {
    const api = await loadApi()
    fetchMock.mockResolvedValueOnce(reply(401, { detail: 'Not signed in.' }))
    expect(await api.restoreSession()).toBeNull()
  })

  it('uploads avatars as multipart form data without forcing a content type', async () => {
    const api = await loadApi()
    fetchMock.mockResolvedValueOnce(reply(200, PROFILE))
    await api.uploadAvatar(new Blob(['x'], { type: 'image/jpeg' }))
    const { init, headers } = lastCall()
    expect(init.body).toBeInstanceOf(FormData)
    expect(headers['Content-Type']).toBeUndefined()
  })
})
