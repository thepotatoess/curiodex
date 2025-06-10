import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import '../css/Auth.css'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, username)
        if (error) throw error
        setMessage('Check your email for confirmation link!')
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
      }
    } catch (error) {
      setError(error.message)
    }
  }

  const resendConfirmation = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      if (error) throw error
      setMessage('Confirmation email sent!')
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="auth-input-group">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="form-input"
              />
            </div>
          )}
          
          <div className="auth-input-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>
          
          <div className="auth-input-group">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn btn-primary auth-submit-btn">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        
        {error && (
          <div className="auth-error">
            <p>{error}</p>
            {error.includes('Email not confirmed') && (
              <button 
                onClick={resendConfirmation} 
                className="btn btn-success auth-resend-btn"
              >
                Resend Confirmation Email
              </button>
            )}
          </div>
        )}
        
        {message && <p className="auth-success">{message}</p>}
        
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="auth-toggle-btn"
        >
          {isSignUp ? 'Already have an account?' : 'Need an account?'}
        </button>
      </div>
    </div>
  )
}