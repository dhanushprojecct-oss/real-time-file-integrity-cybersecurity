export function SeverityBadge({ severity }) {
  const cls = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  }[severity] || 'badge-low'

  return <span className={cls}>{severity}</span>
}

export function StatusBadge({ status }) {
  const cls = {
    safe: 'badge-safe',
    compromised: 'badge-compromised',
    deleted: 'badge-deleted',
    warning: 'badge-warning',
  }[status?.toLowerCase()] || 'badge-warning'

  const labels = {
    safe: '✓ Safe',
    compromised: '✗ Compromised',
    deleted: '⊘ Deleted',
    warning: '⚠ Warning',
  }

  return <span className={cls}>{labels[status?.toLowerCase()] || status}</span>
}

export function RoleBadge({ role }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${
      role === 'admin'
        ? 'bg-purple-900/40 text-purple-300 border-purple-800/50'
        : 'bg-blue-900/40 text-cyber-cyan border-blue-800/50'
    }`}>
      {role}
    </span>
  )
}
