import { useState } from 'react'
import { errorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'

type Props = {
  onClose: () => void
}

type Mode = 'signin' | 'signup'

export default function AuthModal({ onClose }: Props) {
  const { signIn, signUp } = useAuth()
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

    try {
      if (mode === 'signup') {
        if (username.trim().length < 3) {
          setError('Username must be at least 3 characters.')
          return
        }
        await signUp(username.trim(), email.trim(), password)
      } else {
        await signIn(email.trim(), password)
      }
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
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
            onClick={() => {
              setMode('signin')
              setError('')
              setEmail('')
              setPassword('')
              setUsername('')
              setShowPassword(false)
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`authTab ${mode === 'signup' ? 'isActive' : ''}`}
            onClick={() => {
              setMode('signup')
              setError('')
              setEmail('')
              setPassword('')
              setUsername('')
              setShowPassword(false)
            }}
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
            <label className="tcLabel">{mode === 'signup' ? 'Email' : 'Email or username'}</label>
            <input
              className="tcInput"
              type={mode === 'signup' ? 'email' : 'text'}
              placeholder={mode === 'signup' ? 'you@example.com' : 'you@example.com or username'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={mode === 'signup' ? 'email' : 'username'}
            />
          </div>
          <div className="authField">
            <label className="tcLabel">Password</label>
            <div className="authPasswordWrap">
              <input
                className="tcInput"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'signup' ? 8 : undefined}
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
