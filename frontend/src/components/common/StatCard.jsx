export default function StatCard({ title, value, icon: Icon, color = 'cyan', subtitle, trend }) {
  const colorMap = {
    cyan:   { border: 'border-cyber-cyan/20',   text: 'text-cyber-cyan',   bg: 'bg-cyber-cyan/10',   glow: '0 0 20px rgba(0,212,255,0.1)' },
    green:  { border: 'border-cyber-green/20',  text: 'text-cyber-green',  bg: 'bg-cyber-green/10',  glow: '0 0 20px rgba(0,200,83,0.1)'  },
    red:    { border: 'border-cyber-red/20',    text: 'text-cyber-red',    bg: 'bg-cyber-red/10',    glow: '0 0 20px rgba(255,23,68,0.1)' },
    orange: { border: 'border-cyber-orange/20', text: 'text-cyber-orange', bg: 'bg-cyber-orange/10', glow: '0 0 20px rgba(255,109,0,0.1)' },
    yellow: { border: 'border-cyber-yellow/20', text: 'text-cyber-yellow', bg: 'bg-cyber-yellow/10', glow: '0 0 20px rgba(255,171,0,0.1)' },
    blue:   { border: 'border-cyber-blue/20',   text: 'text-cyber-blue',   bg: 'bg-cyber-blue/10',   glow: '0 0 20px rgba(13,110,253,0.1)' },
    purple: { border: 'border-cyber-purple/20', text: 'text-cyber-purple', bg: 'bg-cyber-purple/10', glow: '0 0 20px rgba(124,58,237,0.1)' },
  }
  const c = colorMap[color] || colorMap.cyan

  return (
    <div
      className={`cyber-card border ${c.border} flex items-start gap-4 hover:scale-[1.01] cursor-default`}
      style={{ boxShadow: c.glow }}
    >
      <div className={`${c.bg} ${c.border} border rounded-xl p-3 flex-shrink-0`}>
        <Icon size={22} className={c.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-cyber-muted text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${c.text}`}>{value ?? '—'}</p>
        {subtitle && <p className="text-cyber-muted text-xs mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <p className={`text-xs mt-1 font-medium ${trend >= 0 ? 'text-cyber-green' : 'text-cyber-red'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)} from yesterday
          </p>
        )}
      </div>
    </div>
  )
}
