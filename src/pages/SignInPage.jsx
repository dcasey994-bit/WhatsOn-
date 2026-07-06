import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, signInWithPassword, signUpWithEmail } from '../data/authStore.js'
import './SignInPage.css'

export default function SignInPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)
  const [showEmail, setShowEmail] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSignIn(provider) {
    setLoading(provider)
    setError(null)
    try {
      await signIn(provider)
      // Supabase redirects the browser — no navigate() needed
    } catch (e) {
      setError('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading('email')
    setError(null)
    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters.')
          setLoading(null)
          return
        }
        const needsConfirm = await signUpWithEmail(email.trim(), password)
        if (needsConfirm) {
          setSent(true)
        }
        // If no confirmation needed, auth state change signs them straight in
      } else {
        await signInWithPassword(email.trim(), password)
        // Auth state change handles the rest
      }
    } catch (err) {
      setError(
        isSignUp
          ? 'Could not create the account. Try a different email.'
          : 'Wrong email or password. Please try again.'
      )
    }
    setLoading(null)
  }

  return (
    <div className="signin-page">
      <div className="signin-glow" />

      <div className="signin-hero">
        <div className="signin-logo">WhatsOn<span className="logo-q">?</span></div>
        <p className="signin-tagline">
          Everything happening tonight,<br />right where you are.
        </p>
      </div>

      <div className="signin-pins">
        <span className="pin pin-music">🎵</span>
        <span className="pin pin-comedy">😂</span>
        <span className="pin pin-karaoke">🎤</span>
        <span className="pin pin-quiz">🧠</span>
        <span className="pin pin-jazz">🎷</span>
      </div>

      <div className="signin-buttons">
        {error && <p className="signin-error">{error}</p>}

        {sent ? (
          <p className="signin-sent">
            ✉️ Almost there — we've sent a confirmation link to<br />
            <strong>{email}</strong><br />
            Click it to finish creating your account.
          </p>
        ) : showEmail ? (
          <form className="signin-email-form" onSubmit={handleEmailSubmit}>
            <input
              type="email"
              className="signin-email-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
            <input
              type="password"
              className="signin-email-input"
              placeholder={isSignUp ? 'Create a password' : 'Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
            />
            <button
              type="submit"
              className="signin-btn signin-email-submit"
              disabled={!!loading}
            >
              {loading === 'email' ? <span className="spinner spinner-dark" /> : null}
              {isSignUp ? 'Create account' : 'Sign in'}
            </button>
            <button
              type="button"
              className="signin-toggle"
              onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : 'New here? Create an account'}
            </button>
            <button
              type="button"
              className="signin-back"
              onClick={() => { setShowEmail(false); setError(null) }}
            >
              ← Back
            </button>
          </form>
        ) : (
          <>
            <button
              className="signin-btn signin-email"
              onClick={() => setShowEmail(true)}
              disabled={!!loading}
            >
              <EmailIcon />
              Continue with Email
            </button>

            <button
              className={`signin-btn signin-google ${loading === 'google' ? 'loading' : ''}`}
              onClick={() => handleSignIn('google')}
              disabled={!!loading}
            >
              {loading === 'google' ? <span className="spinner" /> : <GoogleIcon />}
              Continue with Google
            </button>

            <p className="signin-terms">
              By continuing you agree to our{' '}
              <span className="terms-link">Terms of Service</span>
              {' '}and{' '}
              <span className="terms-link">Privacy Policy</span>
            </p>

            <button
              className="signin-skip"
              onClick={() => navigate('/discover')}
            >
              Just browsing? Explore without an account →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
