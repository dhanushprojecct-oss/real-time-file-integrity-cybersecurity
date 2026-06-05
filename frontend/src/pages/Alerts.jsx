import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle, Trash2, RefreshCw, Search, Filter, ShieldAlert } from 'lucide-react'
import { SeverityBadge } from '../components/common/Badge'
import { useSocket } from '../context/SocketContext'
import api from '../api/client'
import toast from 'react-hot-toast'
import { formatDistanceToNow, format } from 'date-fns'

export default function Alerts() {
  const { subscribe } = useSocket()
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('')
  const [resolved, setResolved] = useState('false')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [resolving, setResolving] = useState({})

  const fetchAlerts = useCallback(async () => {
    try {
      const params = { page, per_page: 15, search, severity: severity || undefined, resolved }
      const [alertRes, statsRes] = await Promise.all([
        api.get('/alerts/', { params }),
        api.get('/alerts/stats'),
      ])
      setAlerts(alertRes.data.alerts)
      setTotal(alertRes.data.total)
      setPages(Math.ceil(alertRes.data.total / 15))
      setStats(statsRes.data)
    } catch {}
    finally { setLoading(false) }
  }, [page, search, severity, resolved])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  useEffect(() => {
    const unsub = subscribe('alerts', (type) => {
      if (type === 'alert') fetchAlerts()
    })
    return unsub
  }, [subscribe, fetchAlerts])

  const handleResolve = async (id) => {
    setResolving((r) => ({ ...r, [id]: true }))
    try {
      await api.put(`/alerts/${id}/resolve`)
      toast.success('Alert resolved')
      fetchAlerts()
    } catch { toast.error('Failed to resolve') }
    finally { setResolving((r) => ({ ...r, [id]: false })) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this alert?')) return
    try {
      await api.delete(`/alerts/${id}`)
      toast.success('Alert deleted')
      fetchAlerts()
    } catch { toast.error('Delete failed') }
  }

  const handleResolveAll = async () => {
    if (!confirm('Mark all active alerts as resolved?')) return
    try {
      await api.put('/alerts/resolve-all')
      toast.success('All alerts resolved')
      fetchAlerts()
    } catch { toast.error('Failed') }
  }

  const severityIcon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Alert Management</h2>
          <p className="text-cyber-muted text-sm mt-0.5">{stats.active || 0} active alerts require attention</p>
        </div>
        <div className="flex gap-2">
          {stats.active > 0 && (
            <button onClick={handleResolveAll} className="btn-success text-sm py-2">
              <CheckCircle size={14} /> Resolve All
            </button>
          )}
          <button onClick={fetchAlerts} className="btn-ghost text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Severity summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'CRITICAL', label: 'Critical', count: stats.critical, color: 'border-cyber-red/30 bg-red-900/10 text-cyber-red' },
          { key: 'HIGH', label: 'High', count: stats.high, color: 'border-cyber-orange/30 bg-orange-900/10 text-cyber-orange' },
          { key: 'MEDIUM', label: 'Medium', count: stats.medium, color: 'border-cyber-yellow/30 bg-yellow-900/10 text-cyber-yellow' },
          { key: 'LOW', label: 'Low', count: stats.low, color: 'border-cyber-green/30 bg-green-900/10 text-cyber-green' },
        ].map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => { setSeverity(severity === key ? '' : key); setPage(1) }}
            className={`p-3 rounded-xl border text-left transition-all ${color} ${severity === key ? 'ring-1 ring-current' : 'opacity-80 hover:opacity-100'}`}
          >
            <p className="text-2xl font-bold">{count || 0}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search alerts..." className="cyber-input pl-9 text-sm py-2" />
        </div>
        <select value={resolved} onChange={(e) => { setResolved(e.target.value); setPage(1) }}
          className="cyber-input text-sm py-2 w-auto">
          <option value="false">Active Alerts</option>
          <option value="true">Resolved Alerts</option>
          <option value="">All Alerts</option>
        </select>
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="cyber-spinner" /></div>
        ) : alerts.length === 0 ? (
          <div className="cyber-card text-center py-16">
            <Bell size={40} className="text-cyber-muted mx-auto mb-3 opacity-40" />
            <p className="text-cyber-muted">No alerts found</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`cyber-card flex items-start gap-4 transition-all ${
                alert.severity === 'CRITICAL' ? 'border-red-900/50 bg-red-900/5' :
                alert.severity === 'HIGH' ? 'border-orange-900/30' : ''
              } ${alert.resolved ? 'opacity-60' : ''}`}
            >
              <div className="flex-shrink-0 text-2xl mt-0.5">{severityIcon[alert.severity] || '⚪'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-xs text-cyber-muted font-mono uppercase">{alert.event_type}</span>
                  {alert.resolved && (
                    <span className="text-xs text-cyber-green bg-green-900/20 border border-green-800/30 px-2 py-0.5 rounded-full">Resolved</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white mt-1 truncate">{alert.file_name || 'Unknown file'}</p>
                <p className="text-xs text-cyber-muted mt-0.5 line-clamp-2">{alert.description}</p>
                <p className="text-xs text-cyber-muted/60 mt-1.5">
                  {alert.timestamp ? format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm:ss') : '—'} ·{' '}
                  {alert.timestamp ? formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true }) : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!alert.resolved && (
                  <button onClick={() => handleResolve(alert.id)} disabled={resolving[alert.id]}
                    className="btn-success text-xs py-1.5 px-3">
                    {resolving[alert.id] ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Resolve
                  </button>
                )}
                <button onClick={() => handleDelete(alert.id)}
                  className="p-1.5 rounded text-cyber-muted hover:text-cyber-red hover:bg-red-900/10 transition-all">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">← Prev</button>
          <span className="text-cyber-muted text-sm">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  )
}
