import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import {
  LayoutDashboard, Upload, Activity, Bell, ScrollText,
  FileBarChart2, Settings, LogOut, Shield, Wifi, WifiOff
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/upload', label: 'Upload Files', icon: Upload },
  { to: '/monitoring', label: 'Monitoring', icon: Activity },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/audit', label: 'Audit History', icon: ScrollText },
  { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className={`flex flex-col h-full bg-cyber-surface border-r border-cyber-border transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-cyber-border">
        <div className="flex-shrink-0 w-9 h-9 bg-cyber-blue rounded-lg flex items-center justify-center glow-cyan">
          <Shield size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">FIM System</p>
            <p className="text-cyber-cyan text-xs">File Integrity Monitor</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="space-y-1 px-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-cyber-blue/20 text-cyber-cyan border border-cyber-cyan/20'
                    : 'text-cyber-muted hover:text-cyber-text hover:bg-cyber-card'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyber-cyan rounded-r-full" />
                  )}
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{label}</span>}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2 py-1 bg-cyber-card border border-cyber-border rounded-md text-xs text-cyber-text whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                      {label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Connection status */}
      <div className={`px-4 py-2 ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg bg-cyber-card border border-cyber-border/50 ${collapsed ? 'justify-center' : ''}`}>
          {connected ? (
            <>
              <Wifi size={13} className="text-cyber-green flex-shrink-0" />
              {!collapsed && <span className="text-xs text-cyber-green font-medium">Live Connected</span>}
            </>
          ) : (
            <>
              <WifiOff size={13} className="text-cyber-muted flex-shrink-0" />
              {!collapsed && <span className="text-xs text-cyber-muted">Disconnected</span>}
            </>
          )}
        </div>
      </div>

      {/* User + Logout */}
      <div className="border-t border-cyber-border p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-cyber-blue/30 border border-cyber-blue/50 flex items-center justify-center text-cyber-cyan font-bold text-sm flex-shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-cyber-text text-sm font-medium truncate">{user?.username}</p>
              <p className="text-cyber-muted text-xs capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-cyber-muted hover:text-cyber-red hover:bg-red-900/10 transition-all duration-200 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
