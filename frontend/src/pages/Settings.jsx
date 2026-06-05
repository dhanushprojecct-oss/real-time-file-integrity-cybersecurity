import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Settings as SettingsIcon, User, Lock, Users, Shield, Trash2, UserPlus, Eye, EyeOff, Bell, Mail, SendHorizonal, CheckCircle2, XCircle, Info } from 'lucide-react'
import { RoleBadge } from '../components/common/Badge'
import Modal from '../components/common/Modal'
import api from '../api/client'
import toast from 'react-hot-toast'

function ChangePasswordForm({ onSuccess }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.new_password !== form.confirm) { toast.error('Passwords do not match'); return }
    if (form.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { current_password: form.current_password, new_password: form.new_password })
      toast.success('Password changed successfully')
      setForm({ current_password: '', new_password: '', confirm: '' })
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {['current_password', 'new_password', 'confirm'].map((field) => (
        <div key={field}>
          <label className="block text-xs font-medium text-cyber-muted mb-1.5 uppercase tracking-wider">
            {field.replace(/_/g, ' ')}
          </label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              className="cyber-input pr-10 text-sm"
              placeholder="••••••••"
              required
            />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-cyan transition-colors">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      ))}
      <button type="submit" disabled={loading} className="btn-primary text-sm">
        {loading ? 'Saving...' : 'Change Password'}
      </button>
    </form>
  )
}

// ── Notification / Email Settings ──────────────────────────────────────────────
function NotificationSettings() {
  const { user, refreshUser } = useAuth()
  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | 'success' | 'error'

  const handleSaveEmail = async (e) => {
    e.preventDefault()
    setSaving(true)
    setTestResult(null)
    try {
      await api.put('/auth/me/email', { email })
      toast.success('Notification email saved!')
      refreshUser()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save email')
    } finally { setSaving(false) }
  }

  const handleTestEmail = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const { data } = await api.post('/auth/test-email')
      toast.success(data.message || 'Test email sent!')
      setTestResult('success')
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send test email'
      toast.error(msg)
      setTestResult('error')
    } finally { setTesting(false) }
  }

  const hasRealEmail = email && !email.endsWith('.local') && !email.endsWith('example.com')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell size={15} className="text-cyber-cyan" />
          Email Alert Notifications
        </h3>
        <p className="text-xs text-cyber-muted mt-1">
          Receive instant email alerts whenever monitoring detects a file event.
        </p>
      </div>

      {/* Email input */}
      <form onSubmit={handleSaveEmail} className="space-y-3">
        <label className="block text-xs font-medium text-cyber-muted uppercase tracking-wider">
          Notification Email Address
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
            <input
              id="notification-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setTestResult(null) }}
              className="cyber-input pl-9 text-sm"
              placeholder="your@gmail.com"
            />
          </div>
          <button
            id="save-email-btn"
            type="submit"
            disabled={saving}
            className="btn-primary text-sm px-5 flex-shrink-0"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Test email button */}
        <div className="flex items-center gap-3 pt-1">
          <button
            id="test-email-btn"
            type="button"
            onClick={handleTestEmail}
            disabled={testing || !hasRealEmail}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all ${
              hasRealEmail
                ? 'border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan/10'
                : 'border-cyber-border text-cyber-muted cursor-not-allowed opacity-50'
            }`}
          >
            <SendHorizonal size={13} />
            {testing ? 'Sending...' : 'Send Test Email'}
          </button>

          {testResult === 'success' && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 size={13} /> Test email delivered!
            </span>
          )}
          {testResult === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <XCircle size={13} /> Check SMTP config in .env
            </span>
          )}
        </div>
      </form>

      {/* Divider */}
      <div className="border-t border-cyber-border/50" />

      {/* SMTP setup guide */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-cyber-muted uppercase tracking-wider flex items-center gap-2">
          <Info size={12} /> SMTP Configuration (backend/.env)
        </h4>
        <div className="bg-cyber-surface rounded-xl border border-cyber-border/50 p-4 space-y-3">
          <p className="text-xs text-cyber-muted leading-relaxed">
            The system sends emails via SMTP. Edit{' '}
            <code className="bg-cyber-card px-1.5 py-0.5 rounded text-cyber-cyan font-mono text-xs">backend/.env</code>
            {' '}with your credentials:
          </p>
          <div className="font-mono text-xs bg-cyber-card rounded-lg p-3 space-y-1 border border-cyber-border">
            <p><span className="text-cyber-muted"># Gmail settings</span></p>
            <p><span className="text-cyber-cyan">MAIL_SERVER</span>=<span className="text-green-400">smtp.gmail.com</span></p>
            <p><span className="text-cyber-cyan">MAIL_PORT</span>=<span className="text-green-400">587</span></p>
            <p><span className="text-cyber-cyan">MAIL_USERNAME</span>=<span className="text-yellow-400">your@gmail.com</span></p>
            <p><span className="text-cyber-cyan">MAIL_PASSWORD</span>=<span className="text-yellow-400">your_app_password</span></p>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-blue-300 font-semibold mb-1">📧 Gmail App Password Setup</p>
            <ol className="text-xs text-blue-200/80 space-y-0.5 list-decimal ml-4">
              <li>Enable 2-Step Verification on your Google account</li>
              <li>Go to Google Account → Security → App Passwords</li>
              <li>Create an app password named &quot;FIM-Cybersecurity&quot;</li>
              <li>Copy the 16-character password into MAIL_PASSWORD</li>
              <li>Restart the backend server after saving .env</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Alert events info */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-cyber-muted uppercase tracking-wider">Events That Trigger Emails</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { event: '📁 File Added',    severity: 'LOW',      color: 'text-green-400',  bg: 'bg-green-900/20 border-green-500/30' },
            { event: '✏️ File Modified', severity: 'HIGH',     color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-500/30' },
            { event: '🗑️ File Deleted',  severity: 'MEDIUM',   color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-500/30' },
            { event: '🚨 Critical',      severity: 'CRITICAL', color: 'text-red-400',    bg: 'bg-red-900/20 border-red-500/30' },
          ].map(({ event, severity, color, bg }) => (
            <div key={severity} className={`flex items-center justify-between p-2.5 rounded-lg border ${bg}`}>
              <span className="text-xs text-cyber-text">{event}</span>
              <span className={`text-xs font-bold ${color}`}>{severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'analyst', email: '' })
  const [adding, setAdding] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/auth/users')
      setUsers(data.users)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setAdding(true)
    try {
      await api.post('/auth/users', newUser)
      toast.success(`User "${newUser.username}" created`)
      setNewUser({ username: '', password: '', role: 'analyst', email: '' })
      setShowAdd(false)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user')
    } finally { setAdding(false) }
  }

  const handleDelete = async (uid, username) => {
    if (!confirm(`Delete user "${username}"?`)) return
    try {
      await api.delete(`/auth/users/${uid}`)
      toast.success(`User "${username}" deleted`)
      fetchUsers()
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed') }
  }

  const handleRoleChange = async (uid, role) => {
    try {
      await api.put(`/auth/users/${uid}/role`, { role })
      toast.success('Role updated')
      fetchUsers()
    } catch { toast.error('Role update failed') }
  }

  useState(() => { fetchUsers() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">User Management</h3>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-xs py-1.5 px-3">
          <UserPlus size={13} /> Add User
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24"><div className="cyber-spinner" /></div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-cyber-surface rounded-lg border border-cyber-border/50">
              <div className="w-8 h-8 rounded-full bg-cyber-blue/20 border border-cyber-blue/40 flex items-center justify-center text-cyber-cyan font-bold text-sm flex-shrink-0">
                {u.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{u.username}</p>
                <p className="text-xs text-cyber-muted">{u.email || 'No email'}</p>
              </div>
              <select value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                className="text-xs bg-cyber-card border border-cyber-border rounded px-2 py-1 text-cyber-text">
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
              </select>
              <button onClick={() => handleDelete(u.id, u.username)}
                className="p-1.5 rounded text-cyber-muted hover:text-cyber-red hover:bg-red-900/10 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            {[
              { name: 'username', placeholder: 'Username', type: 'text' },
              { name: 'email', placeholder: 'Email (optional)', type: 'email' },
              { name: 'password', placeholder: 'Password (min 8 chars)', type: 'password' },
            ].map(({ name, placeholder, type }) => (
              <input key={name} type={type} placeholder={placeholder}
                value={newUser[name]}
                onChange={(e) => setNewUser((u) => ({ ...u, [name]: e.target.value }))}
                className="cyber-input text-sm" required={name !== 'email'} />
            ))}
            <select value={newUser.role}
              onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
              className="cyber-input text-sm">
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={adding} className="btn-primary flex-1 justify-center">
                {adding ? 'Creating...' : 'Create User'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost flex-1 justify-center">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { key: 'profile',       label: 'Profile',       icon: User },
    { key: 'security',      label: 'Security',      icon: Lock },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    ...(user?.role === 'admin' ? [{ key: 'users', label: 'Users', icon: Users }] : []),
    { key: 'about',         label: 'About',         icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-cyber-muted text-sm mt-0.5">Manage your account and system preferences</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Sidebar tabs */}
        <div className="lg:w-48 flex-shrink-0">
          <div className="cyber-card p-2 space-y-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === key
                    ? 'bg-cyber-blue/20 text-cyber-cyan border border-cyber-cyan/20'
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-card'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 cyber-card">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Your Profile</h3>
              <div className="flex items-center gap-4 p-4 bg-cyber-surface rounded-xl border border-cyber-border/50">
                <div className="w-16 h-16 rounded-2xl bg-cyber-blue/20 border border-cyber-blue/50 flex items-center justify-center text-cyber-cyan font-bold text-2xl">
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">{user?.username}</p>
                  <p className="text-cyber-muted text-sm">{user?.email || 'No email set'}</p>
                  <RoleBadge role={user?.role} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Role', user?.role],
                  ['Account Created', user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'],
                  ['Last Login', user?.last_login ? new Date(user.last_login).toLocaleString() : '—'],
                  ['Status', 'Active'],
                ].map(([label, value]) => (
                  <div key={label} className="p-3 bg-cyber-surface rounded-lg border border-cyber-border/50">
                    <p className="text-xs text-cyber-muted">{label}</p>
                    <p className="text-sm text-white font-medium mt-0.5 capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Change Password</h3>
              <p className="text-xs text-cyber-muted">Passwords are hashed with bcrypt. Minimum 8 characters required.</p>
              <ChangePasswordForm />
            </div>
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings />
          )}

          {activeTab === 'users' && user?.role === 'admin' && (
            <UserManagement />
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">About This System</h3>
              <div className="p-4 bg-cyber-surface rounded-xl border border-cyber-cyan/20 space-y-3">
                <div className="flex items-center gap-3">
                  <Shield size={24} className="text-cyber-cyan" />
                  <div>
                    <p className="text-white font-bold">File Integrity Monitoring System Using Cybersecurity</p>
                    <p className="text-cyber-muted text-xs">Version 1.0.0 — B.E. Cybersecurity Project</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Hashing', 'SHA-256 (hashlib)'],
                  ['Password Security', 'bcrypt'],
                  ['Real-Time Monitoring', 'Watchdog + SocketIO'],
                  ['Authentication', 'Flask-Login + Sessions'],
                  ['Database', 'SQLite / SQLAlchemy'],
                  ['Reports', 'ReportLab + openpyxl'],
                  ['Frontend', 'React + Tailwind CSS'],
                  ['API', 'Flask REST API'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between p-3 bg-cyber-surface rounded-lg border border-cyber-border/50">
                    <span className="text-xs text-cyber-muted">{k}</span>
                    <span className="text-xs font-mono text-cyber-cyan">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
