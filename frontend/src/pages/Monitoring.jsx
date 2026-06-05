import { useState, useEffect, useCallback } from 'react'
import { Activity, RefreshCw, ShieldCheck, AlertTriangle, Trash2, Search, CheckCircle } from 'lucide-react'
import { StatusBadge } from '../components/common/Badge'
import { useSocket } from '../context/SocketContext'
import api from '../api/client'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

function formatSize(b) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function Monitoring() {
  const { subscribe } = useSocket()
  const [files, setFiles] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [verifying, setVerifying] = useState({})

  const fetchFiles = useCallback(async () => {
    try {
      const params = { page, per_page: 15, search, status: statusFilter || undefined }
      const { data } = await api.get('/files/', { params })
      setFiles(data.files)
      setTotal(data.total)
      setPages(data.pages)
    } catch {}
    finally { setLoading(false) }
  }, [page, search, statusFilter])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  useEffect(() => {
    const unsub = subscribe('monitoring', (type) => {
      if (type === 'file_event') fetchFiles()
    })
    return unsub
  }, [subscribe, fetchFiles])

  const handleVerify = async (fileId) => {
    setVerifying((v) => ({ ...v, [fileId]: true }))
    try {
      const { data } = await api.post(`/files/${fileId}/verify`)
      if (data.status === 'safe') toast.success('File integrity verified — No changes detected')
      else if (data.status === 'compromised') toast.error('⚠️ Integrity violation detected!')
      else toast('File not found on disk', { icon: '⚠️' })
      fetchFiles()
    } catch {
      toast.error('Verification failed')
    } finally {
      setVerifying((v) => ({ ...v, [fileId]: false }))
    }
  }

  const handleDelete = async (fileId, name) => {
    if (!confirm(`Remove "${name}" from monitoring?`)) return
    try {
      await api.delete(`/files/${fileId}`)
      toast.success(`${name} removed from monitoring`)
      fetchFiles()
    } catch { toast.error('Delete failed') }
  }

  const statusCounts = {
    all: total,
    safe: files.filter((f) => f.status === 'safe').length,
    compromised: files.filter((f) => f.status === 'compromised').length,
    deleted: files.filter((f) => f.status === 'deleted').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">File Monitoring</h2>
          <p className="text-cyber-muted text-sm mt-0.5">{total} files under continuous SHA-256 monitoring</p>
        </div>
        <button onClick={fetchFiles} className="btn-ghost text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: '', label: `All (${total})` },
          { key: 'safe', label: `Safe`, color: 'text-cyber-green' },
          { key: 'compromised', label: `Compromised`, color: 'text-cyber-red' },
          { key: 'deleted', label: `Deleted`, color: 'text-cyber-muted' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === key
                ? 'bg-cyber-blue text-white'
                : `border border-cyber-border text-cyber-muted hover:border-cyber-cyan/50 ${color || ''}`
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1 min-w-48">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search files..."
              className="cyber-input pl-9 text-sm py-2"
            />
          </div>
        </div>
      </div>

      {/* Files table */}
      <div className="cyber-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="cyber-spinner" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-16">
            <Activity size={40} className="text-cyber-muted mx-auto mb-3 opacity-40" />
            <p className="text-cyber-muted">No files monitored yet</p>
            <p className="text-cyber-muted/60 text-sm mt-1">Upload files to start monitoring</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>SHA-256 Hash (Original)</th>
                  <th>Current Hash</th>
                  <th>Last Checked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => {
                  const hashMatch = f.current_hash && f.original_hash === f.current_hash
                  const hashMismatch = f.current_hash && f.original_hash !== f.current_hash

                  return (
                    <tr key={f.id} className={f.status === 'compromised' ? 'bg-red-900/5' : ''}>
                      <td className="font-medium text-cyber-text max-w-[160px]">
                        <span className="truncate block text-xs">{f.file_name}</span>
                      </td>
                      <td className="text-xs text-cyber-muted uppercase">{f.file_type}</td>
                      <td className="text-xs text-cyber-muted">{formatSize(f.file_size)}</td>
                      <td><StatusBadge status={f.status} /></td>
                      <td className="font-mono text-xs text-cyber-cyan/70 max-w-[140px]">
                        <span className="truncate block" title={f.original_hash}>
                          {f.original_hash ? f.original_hash.slice(0, 16) + '...' : '—'}
                        </span>
                      </td>
                      <td className="font-mono text-xs max-w-[140px]">
                        {f.current_hash ? (
                          <span
                            className={`truncate block ${hashMatch ? 'text-cyber-green' : hashMismatch ? 'text-cyber-red' : 'text-cyber-muted'}`}
                            title={f.current_hash}
                          >
                            {hashMatch && <span className="mr-1">✓</span>}
                            {hashMismatch && <span className="mr-1">✗</span>}
                            {f.current_hash.slice(0, 16)}...
                          </span>
                        ) : (
                          <span className="text-cyber-muted">Not checked</span>
                        )}
                      </td>
                      <td className="text-xs text-cyber-muted">
                        {f.last_checked
                          ? formatDistanceToNow(new Date(f.last_checked), { addSuffix: true })
                          : 'Never'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVerify(f.id)}
                            disabled={verifying[f.id]}
                            className="p-1.5 rounded text-cyber-muted hover:text-cyber-cyan hover:bg-cyber-surface transition-all disabled:opacity-50"
                            title="Verify integrity"
                          >
                            {verifying[f.id]
                              ? <RefreshCw size={13} className="animate-spin" />
                              : <ShieldCheck size={13} />}
                          </button>
                          <button
                            onClick={() => handleDelete(f.id, f.file_name)}
                            className="p-1.5 rounded text-cyber-muted hover:text-cyber-red hover:bg-red-900/10 transition-all"
                            title="Remove from monitoring"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
          <span className="text-cyber-muted text-sm">Page {page} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="btn-ghost text-sm py-1.5 px-3 disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  )
}
