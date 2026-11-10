import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as api from '../lib/api'
import type { Profile } from '../lib/api'

type AuthContextType = {
  /** The signed-in player, or null. `profile` is the same object (kept for older call sites). */
  user: Profile | null
  profile: Profile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<void>
  signUp: (username: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  setProfile: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  setProfile: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // On page load, try to sign back in with the refresh cookie.
  useEffect(() => {
    let active = true
    api
      .restoreSession()
      .then((profile) => {
        if (active) setUser(profile)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    // If the session can no longer be refreshed, drop back to signed-out.
    const stopListening = api.onSessionExpired(() => setUser(null))
    return () => {
      active = false
      stopListening()
    }
  }, [])

  const signIn = useCallback(async (identifier: string, password: string) => {
    setUser(await api.login(identifier, password))
  }, [])

  const signUp = useCallback(async (username: string, email: string, password: string) => {
    setUser(await api.register(username, email, password))
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // The local session is cleared regardless; the cookie expires on its own.
    }
    setUser(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    setUser(await api.getMe())
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, profile: user, loading, signIn, signUp, signOut, refreshProfile, setProfile: setUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
