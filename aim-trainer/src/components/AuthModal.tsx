import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type Props = {
  onClose: () => void
}

type Mode = 'signin' | 'signup'

export default function AuthModal({ onClose }: Props) {
  const { refreshProfile } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters.')
        setLoading(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim() } },
      })

      if (signUpError) { setError(signUpError.message); setLoading(false); return }

      if (data.user) {
        // Upsert profile in case trigger hasn't fired yet
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: username.trim(),
        })
        await refreshProfile()
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
    }

    setLoading(false)
    onClose()
  }

  return (
    <div className="taskCreatorOverlay" onClick={onClose}>
      <div className="authModal" onClick={(e) => e.stopPropagation()}>
        <div className="taskCreatorHeader">
          <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
          <button type="button" className="aimModalClose" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="authTabs">
          <button
            type="button"
            className={`authTab ${mode === 'signin' ? 'isActive' : ''}`}
            onClick={() => { setMode('signin'); setError('') }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`authTab ${mode === 'signup' ? 'isActive' : ''}`}
            onClick={() => { setMode('signup'); setError('') }}
          >
            Sign Up
          </button>
        </div>

        <form className="authForm" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="authField">
              <label className="tcLabel">Username</label>
              <input
                className="tcInput"
                type="text"
                placeholder="e.g. sharpshooter99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                required
                autoComplete="username"
              />
            </div>
          )}
          <div className="authField">
            <label className="tcLabel">Email</label>
            <input
              className="tcInput"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="authField">
            <label className="tcLabel">Password</label>
            <div className="authPasswordWrap">
              <input
                className="tcInput"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="authPasswordToggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <i className={`fa-solid fa-eye${showPassword ? '' : '-slash'}`} />
              </button>
            </div>
          </div>

          {error && <p className="authError">{error}</p>}

          <button type="submit" className="aimModalApplyBtn authSubmitBtn" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
