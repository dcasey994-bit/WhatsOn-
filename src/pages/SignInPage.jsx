import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn, setRole } from '../data/authStore.js'
import './SignInPage.css'

export default function SignInPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(null)
  const [step, setStep] = useState('signin') // 'signin' | 'role'

  function handleSignIn(provider) {
    setLoading(provider)
    setTimeout(() => {
      signIn(provider)
      setLoading(null)
      setStep('role')
    }, 900)
  }

  function handleRole(role) {
    setRole(role)
    navigate(role === 'venue' ? '/venue' : '/discover', { replace: true })
  }

  if (step === 'role') {
    return <RolePicker onSelect={handleRole} />
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
        <button
          className={`signin-btn signin-google ${loading === 'google' ? 'loading' : ''}`}
          onClick={() => handleSignIn('google')}
          disabled={!!loading}
        >
          {loading === 'google' ? <span className="spinner" /> : <GoogleIcon />}
          Continue with Google
        </button>

        <button
          className={`signin-btn signin-apple ${loading === 'apple' ? 'loading' : ''}`}
          onClick={() => handleSignIn('apple')}
          disabled={!!loading}
        >
          {loading === 'apple' ? <span className="spinner spinner-dark" /> : <AppleIcon />}
          Continue with Apple
        </button>

        <p className="signin-terms">
          By continuing you agree to our{' '}
          <span className="terms-link">Terms of Service</span>
          {' '}and{' '}
          <span className="terms-link">Privacy Policy</span>
        </p>
      </div>
    </div>
  )
}

function RolePicker({ onSelect }) {
  return (
    <div className="signin-page">
      <div className="signin-glow" />

      <div className="signin-hero">
        <div className="signin-logo">WhatsOn<span className="logo-q">?</span></div>
        <p className="signin-tagline">How will you be using<br />WhatsOn?</p>
      </div>

      <div className="role-cards">
        <button className="role-card" onClick={() => onSelect('customer')}>
          <span className="role-icon">🗺️</span>
          <div className="role-text">
            <p className="role-title">I'm going out</p>
            <p className="role-desc">Discover live music, comedy, karaoke and more happening near you tonight</p>
          </div>
          <span className="role-arrow">→</span>
        </button>

        <button className="role-card" onClick={() => onSelect('venue')}>
          <span className="role-icon">🏠</span>
          <div className="role-text">
            <p className="role-title">I run a venue</p>
            <p className="role-desc">List your events, reach more people, and see who's interested tonight</p>
          </div>
          <span className="role-arrow">→</span>
        </button>
      </div>

      <p className="role-note">You can change this later in settings</p>
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

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}
