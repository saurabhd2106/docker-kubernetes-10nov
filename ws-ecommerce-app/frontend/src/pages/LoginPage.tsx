import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    }
  }

  return (
    <div className="page narrow">
      <h1>Welcome back to Oakline</h1>
      <form className="stack-form" onSubmit={onSubmit}>
        <label>
          Username
          <input
            data-testid="login-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            data-testid="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p data-testid="form-error" className="error">{error}</p>}
        <button data-testid="login-submit" type="submit">Log in</button>
      </form>
      <p className="muted">
        Demo account: <code>demo</code> / <code>password1</code>
      </p>
      <p>
        Need an account? <Link to="/register">Register</Link>
      </p>
    </div>
  )
}
