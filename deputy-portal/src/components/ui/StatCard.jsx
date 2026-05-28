const TONES = {
  navy: { bg: 'bg-[var(--color-navy-50)]', text: 'text-[var(--color-navy-700)]' },
  gold: { bg: 'bg-[var(--color-gold-50)]', text: 'text-[var(--color-gold-700)]' },
  success: { bg: 'bg-[var(--color-success-50)]', text: 'text-[var(--color-success-700)]' },
  warning: { bg: 'bg-[var(--color-warning-50)]', text: 'text-[var(--color-warning-700)]' },
  danger: { bg: 'bg-[var(--color-danger-50)]', text: 'text-[var(--color-danger-700)]' },
  info: { bg: 'bg-[var(--color-info-50)]', text: 'text-[var(--color-info-700)]' },
}

export default function StatCard({ label, value, icon, tone = 'navy', hint }) {
  const t = TONES[tone] || TONES.navy
  return (
    <div className="stat-card card-hover">
      <div className={`stat-icon ${t.bg} ${t.text}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {hint && <p className="text-xs text-[var(--color-navy-500)] mt-1">{hint}</p>}
      </div>
    </div>
  )
}
