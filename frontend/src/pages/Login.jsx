import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Please enter username and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      await login(form.username.trim(), form.password, form.remember)
      toast.success('Welcome back! Access granted.')
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed'
      const left = err.response?.data?.attempts_left
      setError(msg)
      if (left !== undefined) setAttemptsLeft(left)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-bg bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyber-blue/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyber-cyan/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cyber-blue/20 border border-cyber-cyan/30 rounded-2xl mb-4 neon-border">
            <Shield size={32} className="text-cyber-cyan" />
          </div>
          <h1 className="text-2xl font-bold text-white">File Integrity Monitoring System</h1>
          <p className="text-cyber-muted text-sm mt-1">Using Cybersecurity</p>
        </div>

        {/* Card */}
        <div className="bg-cyber-card border border-cyber-border rounded-2xl p-8 shadow-2xl neon-border">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Secure Login</h2>
            <p className="text-cyber-muted text-sm mt-1">Enter your credentials to access the system</p>
          </div>

          {/* Default credentials hint */}
          <div className="mb-5 p-3 bg-cyber-blue/10 border border-cyber-blue/20 rounded-lg">
            <p className="text-xs text-cyber-cyan font-medium">Default Credentials</p>
            <p className="text-xs text-cyber-muted mt-0.5">Admin: <span className="text-cyber-text font-mono">admin / admin123</span></p>
            <p className="text-xs text-cyber-muted">Analyst: <span className="text-cyber-text font-mono">analyst / analyst123</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-cyber-muted mb-1.5 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  autoComplete="username"
                  className="cyber-input pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-cyber-muted mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="cyber-input pl-9 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-cyan transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={form.remember}
                onChange={handleChange}
                className="w-4 h-4 rounded border-cyber-border bg-cyber-surface accent-cyber-blue cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-cyber-muted cursor-pointer hover:text-cyber-text transition-colors">
                Remember me for 8 hours
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-800/40 rounded-lg animate-fade-in">
                <AlertCircle size={15} className="text-cyber-red flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-cyber-red">{error}</p>
                  {attemptsLeft !== null && (
                    <p className="text-xs text-cyber-muted mt-0.5">
                      {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before lockout
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-btn"
              type="submit"
              disabled={loading}
              className="w-full btn-primary justify-center py-3 text-sm font-semibold relative overflow-hidden"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Secure Login</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-cyber-border/50 text-center">
            <p className="text-xs text-cyber-muted">
              🔒 SHA-256 Secured · Session Protected · Role-Based Access
            </p>
            <p className="text-xs text-cyber-muted/50 mt-1">
              Max 5 login attempts · 30-minute lockout
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-cyber-muted/40 mt-6">
          © 2024 File Integrity Monitoring System Using Cybersecurity · B.E. Cybersecurity Project
        </p>
      </div>
    </div>
  )
}
