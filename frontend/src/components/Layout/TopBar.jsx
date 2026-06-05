import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Bell, Search, RefreshCw } from 'lucide-react'
import { useSocket } from '../../context/SocketContext'
import api from '../../api/client'
import { formatDistanceToNow } from 'date-fns'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/upload': 'Upload Files',
  '/monitoring': 'File Monitoring',
  '/alerts': 'Alert Management',
  '/audit': 'Audit History',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export default function TopBar({ onToggleSidebar }) {
  const location = useLocation()
  const { connected, latestAlert } = useSocket()
  const [alertCount, setAlertCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [recentAlerts, setRecentAlerts] = useState([])
  const [time, setTime] = useState(new Date())

  const title = PAGE_TITLES[location.pathname] || 'FIM System'

  useEffect(() => {
    fetchAlertCount()
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (latestAlert) {
      setAlertCount((c) => c + 1)
      setRecentAlerts((prev) => [latestAlert, ...prev].slice(0, 5))
    }
  }, [latestAlert])

  const fetchAlertCount = async () => {
    try {
      const { data } = await api.get('/alerts/stats')
      setAlertCount(data.active)
    } catch {}
  }

  const severityColor = {
    CRITICAL: 'text-cyber-red',
    HIGH: 'text-cyber-orange',
    MEDIUM: 'text-cyber-yellow',
    LOW: 'text-cyber-green',
  }

  return (
    <header className="h-14 bg-cyber-surface border-b border-cyber-border flex items-center justify-between px-4 gap-4 flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-cyber-muted hover:text-cyber-cyan hover:bg-cyber-card transition-all"
        >
          <Menu size={18} />
        </button>
        <div>
          <h1 className="text-white font-semibold text-sm">{title}</h1>
          <p className="text-cyber-muted text-xs hidden sm:block">
            Real-Time File Integrity Monitoring System
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Clock */}
        <div className="hidden md:flex items-center gap-1.5 bg-cyber-card border border-cyber-border rounded-lg px-3 py-1.5">
          <span className="status-dot active" />
          <span className="text-xs font-mono text-cyber-cyan">
            {time.toLocaleTimeString()}
          </span>
        </div>

        {/* Connection */}
        <div className={`hidden sm:flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${
          connected
            ? 'bg-green-900/20 border-green-800/40 text-cyber-green'
            : 'bg-red-900/20 border-red-800/40 text-cyber-red'
        }`}>
          <span className={`status-dot ${connected ? 'active' : 'inactive'}`} />
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-cyber-muted hover:text-cyber-cyan hover:bg-cyber-card transition-all"
          >
            <Bell size={18} />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-cyber-red text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-cyber-card border border-cyber-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border">
                <span className="text-sm font-semibold text-white">Recent Alerts</span>
                <button
                  onClick={() => { setAlertCount(0); setShowNotifications(false) }}
                  className="text-xs text-cyber-cyan hover:underline"
                >
                  Clear
                </button>
              </div>
              {recentAlerts.length === 0 ? (
                <div className="p-6 text-center text-cyber-muted text-sm">No new alerts</div>
              ) : (
                <div className="divide-y divide-cyber-border max-h-64 overflow-y-auto">
                  {recentAlerts.map((a, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-cyber-surface transition-colors">
                      <div className="flex items-start gap-2">
                        <span className={`text-xs font-bold mt-0.5 ${severityColor[a.severity] || 'text-cyber-muted'}`}>
                          [{a.severity}]
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-cyber-text truncate">{a.file_name}</p>
                          <p className="text-xs text-cyber-muted">{a.event_type}</p>
                          {a.timestamp && (
                            <p className="text-xs text-cyber-muted/60 mt-0.5">
                              {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
