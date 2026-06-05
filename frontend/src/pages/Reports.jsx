import { useState, useEffect } from 'react'
import { FileBarChart2, Download, Loader, Calendar, CheckCircle, FileText, Table, FileSpreadsheet } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report', icon: '📅', desc: 'Last 24 hours activity' },
  { value: 'weekly', label: 'Weekly Report', icon: '📆', desc: 'Last 7 days summary' },
  { value: 'monthly', label: 'Monthly Report', icon: '🗓️', desc: 'Last 30 days overview' },
  { value: 'custom', label: 'Custom Range', icon: '🔍', desc: 'Pick your own date range' },
]

const FORMATS = [
  { value: 'pdf', label: 'PDF', icon: FileText, color: 'text-cyber-red', desc: 'Professional report with tables' },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, color: 'text-cyber-green', desc: 'Multi-sheet spreadsheet' },
  { value: 'csv', label: 'CSV', icon: Table, color: 'text-cyber-cyan', desc: 'Raw data export' },
]

export default function Reports() {
  const [reportType, setReportType] = useState('weekly')
  const [fmt, setFmt] = useState('pdf')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [generating, setGenerating] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [history, setHistory] = useState([])
  const [downloading, setDownloading] = useState(null)

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/reports/list')
      setHistory(data.reports)
    } catch {}
  }

  const handleGenerate = async () => {
    if (reportType === 'custom' && (!dateFrom || !dateTo)) {
      toast.error('Please select both From and To dates for custom range')
      return
    }
    setGenerating(true)
    setLastResult(null)
    try {
      const { data } = await api.post('/reports/generate', {
        report_type: reportType,
        format: fmt,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setLastResult(data)
      toast.success(`${data.report.report_type} report generated!`)
      fetchHistory()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Report generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async (filename) => {
    setDownloading(filename)
    try {
      const response = await api.get(`/reports/download/${filename}`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch { toast.error('Download failed') }
    finally { setDownloading(null) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Security Reports</h2>
        <p className="text-cyber-muted text-sm mt-0.5">Generate and export professional cybersecurity reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generator */}
        <div className="space-y-5">
          {/* Report Type */}
          <div className="cyber-card">
            <h3 className="text-sm font-semibold text-white mb-4">Report Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {REPORT_TYPES.map(({ value, label, icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setReportType(value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    reportType === value
                      ? 'border-cyber-cyan/50 bg-cyber-cyan/10 ring-1 ring-cyber-cyan/30'
                      : 'border-cyber-border hover:border-cyber-cyan/30'
                  }`}
                >
                  <div className="text-xl mb-1">{icon}</div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-cyber-muted mt-0.5">{desc}</p>
                </button>
              ))}
            </div>

            {reportType === 'custom' && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-cyber-muted mb-1.5 block">From Date</label>
                  <input type="datetime-local" value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="cyber-input text-sm py-2" />
                </div>
                <div>
                  <label className="text-xs text-cyber-muted mb-1.5 block">To Date</label>
                  <input type="datetime-local" value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="cyber-input text-sm py-2" />
                </div>
              </div>
            )}
          </div>

          {/* Format */}
          <div className="cyber-card">
            <h3 className="text-sm font-semibold text-white mb-4">Export Format</h3>
            <div className="space-y-2">
              {FORMATS.map(({ value, label, icon: Icon, color, desc }) => (
                <button
                  key={value}
                  onClick={() => setFmt(value)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                    fmt === value
                      ? 'border-cyber-cyan/50 bg-cyber-cyan/5 ring-1 ring-cyber-cyan/20'
                      : 'border-cyber-border hover:border-cyber-cyan/30'
                  }`}
                >
                  <Icon size={20} className={color} />
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-cyber-muted">{desc}</p>
                  </div>
                  {fmt === value && <CheckCircle size={16} className="text-cyber-cyan ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            id="generate-report-btn"
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary w-full justify-center py-3"
          >
            {generating ? (
              <><Loader size={16} className="animate-spin" /> Generating Report...</>
            ) : (
              <><FileBarChart2 size={16} /> Generate {fmt.toUpperCase()} Report</>
            )}
          </button>
        </div>

        {/* Right: Preview + History */}
        <div className="space-y-5">
          {/* Generated summary */}
          {lastResult && (
            <div className="cyber-card border-cyber-green/30 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={18} className="text-cyber-green" />
                <h3 className="text-sm font-semibold text-white">Report Generated Successfully</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  ['Total Files', lastResult.stats?.total_files],
                  ['Active Alerts', lastResult.stats?.active_alerts],
                  ['Critical Alerts', lastResult.stats?.critical_alerts],
                  ['Audit Entries', lastResult.stats?.audit_entries],
                  ['Files Added', lastResult.stats?.files_added],
                  ['Compromised', lastResult.stats?.files_modified],
                ].map(([label, value]) => (
                  <div key={label} className="bg-cyber-surface rounded-lg p-3 border border-cyber-border/50">
                    <p className="text-xs text-cyber-muted">{label}</p>
                    <p className="text-lg font-bold text-white">{value ?? 0}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => handleDownload(lastResult.filename)}
                disabled={downloading === lastResult.filename}
                className="btn-success w-full justify-center"
              >
                {downloading === lastResult.filename
                  ? <><Loader size={14} className="animate-spin" /> Downloading...</>
                  : <><Download size={14} /> Download {fmt.toUpperCase()}</>}
              </button>
            </div>
          )}

          {/* Report history */}
          <div className="cyber-card">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-cyber-cyan" /> Report History
            </h3>
            {history.length === 0 ? (
              <p className="text-cyber-muted text-sm text-center py-6">No reports generated yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {history.map((r) => {
                  const filename = r.file_path ? r.file_path.split('\\').pop().split('/').pop() : null
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-cyber-surface rounded-lg border border-cyber-border/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{r.report_name}</p>
                        <p className="text-xs text-cyber-muted">
                          {r.format?.toUpperCase()} · {r.report_type} ·{' '}
                          {r.generated_at ? format(new Date(r.generated_at), 'MMM dd, HH:mm') : '—'}
                        </p>
                      </div>
                      {filename && (
                        <button
                          onClick={() => handleDownload(filename)}
                          disabled={downloading === filename}
                          className="p-1.5 rounded text-cyber-muted hover:text-cyber-cyan hover:bg-cyber-card transition-all"
                          title="Download"
                        >
                          {downloading === filename
                            ? <Loader size={13} className="animate-spin" />
                            : <Download size={13} />}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
