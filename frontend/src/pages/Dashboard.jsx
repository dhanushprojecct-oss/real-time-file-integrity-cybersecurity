import { useState, useEffect, useCallback } from 'react'
import {
  Files, ShieldAlert, ShieldCheck, Trash2, Bell, Activity,
  TrendingUp, RefreshCw, AlertTriangle, Clock
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import StatCard from '../components/common/StatCard'
import { SeverityBadge, StatusBadge } from '../components/common/Badge'
import { useSocket } from '../context/SocketContext'
import api from '../api/client'
import { formatDistanceToNow } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#6b7fa3', font: { size: 11 } } } },
}

export default function Dashboard() {
  const { subscribe } = useSocket()
  const [stats, setStats] = useState(null)
  const [trend, setTrend] = useState([])
  const [activity, setActivity] = useState([])
  const [alertDist, setAlertDist] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchAll = useCallback(async () => {
    try {
      const [s, t, a, d] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/trend'),
        api.get('/dashboard/recent-activity'),
        api.get('/dashboard/alert-distribution'),
      ])
      setStats(s.data)
      setTrend(t.data.trend)
      setActivity(a.data.activity)
      setAlertDist(d.data)
      setLastRefresh(new Date())
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchAll])

  // Live refresh on socket events
  useEffect(() => {
    const unsub = subscribe('dashboard', () => fetchAll())
    return unsub
  }, [subscribe, fetchAll])

  const trendChart = {
    labels: trend.map((d) => d.date),
    datasets: [
      {
        label: 'Files Uploaded',
        data: trend.map((d) => d.files),
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0,212,255,0.08)',
        fill: true, tension: 0.4, pointRadius: 4,
        pointBackgroundColor: '#00d4ff',
      },
      {
        label: 'Alerts',
        data: trend.map((d) => d.alerts),
        borderColor: '#ff1744',
        backgroundColor: 'rgba(255,23,68,0.08)',
        fill: true, tension: 0.4, pointRadius: 4,
        pointBackgroundColor: '#ff1744',
      },
    ],
  }

  const donutChart = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{
      data: [alertDist.CRITICAL || 0, alertDist.HIGH || 0, alertDist.MEDIUM || 0, alertDist.LOW || 0],
      backgroundColor: ['#ff1744', '#ff6d00', '#ffab00', '#00c853'],
      borderColor: '#111827',
      borderWidth: 2,
      hoverOffset: 6,
    }],
  }

  const barChart = {
    labels: trend.map((d) => d.date),
    datasets: [{
      label: 'Daily Alerts',
      data: trend.map((d) => d.alerts),
      backgroundColor: trend.map((_, i) =>
        i === trend.length - 1 ? '#00d4ff' : 'rgba(13,110,253,0.5)'),
      borderRadius: 6, borderSkipped: false,
    }],
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="cyber-spinner" />
          <p className="text-cyber-muted text-sm animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const secScore = stats?.security_score ?? 100
  const scoreColor = secScore >= 80 ? 'text-cyber-green' : secScore >= 50 ? 'text-cyber-yellow' : 'text-cyber-red'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Security Overview</h2>
          <p className="text-cyber-muted text-sm mt-0.5">
            Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Security Score */}
          <div className="cyber-card py-2 px-4 flex items-center gap-3">
            <div>
              <p className="text-xs text-cyber-muted">Security Score</p>
              <p className={`text-2xl font-bold ${scoreColor}`}>{secScore}%</p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: secScore >= 80 ? '#00c853' : secScore >= 50 ? '#ffab00' : '#ff1744' }}>
              <ShieldCheck size={18} style={{ color: secScore >= 80 ? '#00c853' : secScore >= 50 ? '#ffab00' : '#ff1744' }} />
            </div>
          </div>
          {/* Monitoring Status */}
          <div className={`cyber-card py-2 px-4 flex items-center gap-2 border ${
            stats?.monitoring_running ? 'border-cyber-green/30' : 'border-cyber-red/30'
          }`}>
            <span className={`status-dot ${stats?.monitoring_running ? 'active' : 'inactive'}`} />
            <div>
              <p className="text-xs text-cyber-muted">Monitoring</p>
              <p className={`text-sm font-bold ${stats?.monitoring_running ? 'text-cyber-green' : 'text-cyber-red'}`}>
                {stats?.monitoring_status || 'UNKNOWN'}
              </p>
            </div>
          </div>
          <button onClick={fetchAll} className="btn-ghost text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Files" value={stats?.total_files} icon={Files} color="cyan"
          subtitle={`${stats?.files_safe} safe`} />
        <StatCard title="Files Added Today" value={stats?.files_added_today} icon={TrendingUp} color="blue" />
        <StatCard title="Compromised" value={stats?.files_compromised} icon={AlertTriangle} color="red"
          subtitle="Integrity violations" />
        <StatCard title="Files Deleted" value={stats?.files_deleted} icon={Trash2} color="orange" />
        <StatCard title="Active Alerts" value={stats?.active_alerts} icon={Bell} color="yellow"
          subtitle="Requires attention" />
        <StatCard title="Critical Alerts" value={stats?.critical_alerts} icon={ShieldAlert} color="red" />
        <StatCard title="Safe Files" value={stats?.files_safe} icon={ShieldCheck} color="green" />
        <StatCard title="System Status" value={stats?.monitoring_running ? 'ACTIVE' : 'INACTIVE'}
          icon={Activity} color={stats?.monitoring_running ? 'green' : 'red'} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-2 cyber-card">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-cyber-cyan" />
            7-Day File Events Trend
          </h3>
          <div className="h-52">
            <Line data={trendChart} options={{
              ...CHART_DEFAULTS,
              scales: {
                x: { grid: { color: 'rgba(30,58,95,0.4)' }, ticks: { color: '#6b7fa3', font: { size: 10 } } },
                y: { grid: { color: 'rgba(30,58,95,0.4)' }, ticks: { color: '#6b7fa3', font: { size: 10 } }, beginAtZero: true },
              },
            }} />
          </div>
        </div>

        {/* Donut */}
        <div className="cyber-card">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldAlert size={15} className="text-cyber-cyan" />
            Alert Severity
          </h3>
          <div className="h-52">
            <Doughnut data={donutChart} options={{
              ...CHART_DEFAULTS,
              cutout: '65%',
              plugins: {
                legend: { position: 'bottom', labels: { color: '#6b7fa3', font: { size: 10 }, padding: 12 } },
              },
            }} />
          </div>
        </div>
      </div>

      {/* Daily Bar + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar */}
        <div className="cyber-card">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={15} className="text-cyber-cyan" />
            Daily Alert Activity
          </h3>
          <div className="h-44">
            <Bar data={barChart} options={{
              ...CHART_DEFAULTS,
              scales: {
                x: { grid: { display: false }, ticks: { color: '#6b7fa3', font: { size: 9 } } },
                y: { grid: { color: 'rgba(30,58,95,0.4)' }, ticks: { color: '#6b7fa3', font: { size: 10 } }, beginAtZero: true },
              },
            }} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 cyber-card">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={15} className="text-cyber-cyan" />
            Recent Activity
          </h3>
          <div className="overflow-auto max-h-52">
            {activity.length === 0 ? (
              <p className="text-cyber-muted text-sm text-center py-8">No recent activity</p>
            ) : (
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>File</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((log) => (
                    <tr key={log.id}>
                      <td className="font-medium text-cyber-cyan text-xs">{log.username || '—'}</td>
                      <td className="text-xs">{log.action}</td>
                      <td className="text-xs text-cyber-muted truncate max-w-[120px]">{log.file_name || '—'}</td>
                      <td className="text-xs text-cyber-muted whitespace-nowrap">
                        {log.timestamp ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }) : '—'}
                      </td>
                      <td>
                        <span className={`text-xs font-medium ${
                          log.status === 'success' ? 'text-cyber-green'
                          : log.status === 'failed' ? 'text-cyber-red'
                          : 'text-cyber-yellow'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
