import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

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
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
      <form onSubmit={handleSubmit}>
        {isSignUp && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', margin: '5px 0', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', margin: '5px 0', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '10px', margin: '5px 0', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <button type="submit" style={{ width: '100%', padding: '10px', margin: '10px 0', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}>
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      
      {error && (
        <div>
          <p style={{color: 'red'}}>{error}</p>
          {error.includes('Email not confirmed') && (
            <button onClick={resendConfirmation} style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
              Resend Confirmation Email
            </button>
          )}
        </div>
      )}
      
      {message && <p style={{color: 'green'}}>{message}</p>}
      
      <button 
        onClick={() => setIsSignUp(!isSignUp)}
        style={{ width: '100%', padding: '10px', margin: '10px 0', backgroundColor: 'transparent', border: '1px solid #ddd', borderRadius: '4px' }}
      >
        {isSignUp ? 'Already have an account?' : 'Need an account?'}
      </button>
    </div>
  )
}