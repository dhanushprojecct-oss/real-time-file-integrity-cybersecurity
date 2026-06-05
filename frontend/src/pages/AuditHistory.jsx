import { useState, useEffect, useCallback } from 'react'
import { ScrollText, Search, Download, RefreshCw, Filter } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STATUS_COLORS = {
  success: 'text-cyber-green',
  failed: 'text-cyber-red',
  warning: 'text-cyber-yellow',
}

export default function AuditHistory() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('timestamp')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/audit/', {
        params: {
          search, action: action || undefined, status: status || undefined,
          date_from: dateFrom || undefined, date_to: dateTo || undefined,
          sort_by: sortBy, sort_dir: sortDir, page, per_page: 20,
        },
      })
      setLogs(data.logs)
      setTotal(data.total)
      setPages(data.pages)
    } catch {}
    finally { setLoading(false) }
  }, [search, action, status, dateFrom, dateTo, sortBy, sortDir, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleExport = async (fmt) => {
    try {
      const response = await api.get('/audit/export', {
        params: { format: fmt },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${Date.now()}.${fmt === 'excel' ? 'xlsx' : 'csv'}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Audit log exported as ${fmt.toUpperCase()}`)
    } catch { toast.error('Export failed') }
  }

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-cyber-muted/30">↕</span>
    return <span className="text-cyber-cyan">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Audit History</h2>
          <p className="text-cyber-muted text-sm mt-0.5">{total} audit log entries</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn-ghost text-sm">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => handleExport('excel')} className="btn-ghost text-sm">
            <Download size={14} /> Excel
          </button>
          <button onClick={fetchLogs} className="btn-ghost text-sm">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="cyber-card space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-cyber-muted">
          <Filter size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search logs..." className="cyber-input pl-9 text-sm py-2" />
          </div>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }}
            className="cyber-input text-sm py-2">
            <option value="">All Actions</option>
            {['LOGIN','LOGOUT','FILE_UPLOAD','FILE_DELETED','INTEGRITY_VIOLATION',
              'ALERT_RESOLVED','REPORT_GENERATED','PASSWORD_CHANGED','USER_CREATED'].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="cyber-input text-sm py-2">
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="warning">Warning</option>
          </select>
          <div className="flex gap-2">
            <input type="date" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="cyber-input text-sm py-2 flex-1" placeholder="From" />
            <input type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="cyber-input text-sm py-2 flex-1" placeholder="To" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="cyber-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="cyber-spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText size={40} className="text-cyber-muted mx-auto mb-3 opacity-40" />
            <p className="text-cyber-muted">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort('id')}>
                    # <SortIcon col="id" />
                  </th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort('username')}>
                    User <SortIcon col="username" />
                  </th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort('action')}>
                    Action <SortIcon col="action" />
                  </th>
                  <th>File</th>
                  <th>Details</th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort('timestamp')}>
                    Timestamp <SortIcon col="timestamp" />
                  </th>
                  <th>IP Address</th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status <SortIcon col="status" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs text-cyber-muted font-mono">#{log.id}</td>
                    <td className="text-xs font-medium text-cyber-cyan">{log.username || 'System'}</td>
                    <td className="text-xs font-mono text-cyber-text">{log.action}</td>
                    <td className="text-xs text-cyber-muted max-w-[120px]">
                      <span className="truncate block">{log.file_name || '—'}</span>
                    </td>
                    <td className="text-xs text-cyber-muted max-w-[160px]">
                      <span className="truncate block" title={log.details}>{log.details || '—'}</span>
                    </td>
                    <td className="text-xs text-cyber-muted whitespace-nowrap">
                      {log.timestamp ? format(new Date(log.timestamp), 'MMM dd, HH:mm:ss') : '—'}
                    </td>
                    <td className="text-xs font-mono text-cyber-muted">{log.ip_address || '—'}</td>
                    <td>
                      <span className={`text-xs font-medium capitalize ${STATUS_COLORS[log.status] || 'text-cyber-muted'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">← Prev</button>
          <span className="text-cyber-muted text-sm">Page {page} of {pages} · {total} total</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  )
}
