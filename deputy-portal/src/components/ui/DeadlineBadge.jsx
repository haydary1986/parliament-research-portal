import { deadlineInfo } from '../../lib/format'

const STYLES = {
  overdue: 'bg-[var(--color-danger-50)] text-[var(--color-danger-700)] border-[var(--color-danger-600)]/30',
  soon: 'bg-[var(--color-warning-50)] text-[var(--color-warning-700)] border-[var(--color-warning-500)]/40',
  ok: 'bg-[var(--color-navy-50)] text-[var(--color-navy-600)] border-[var(--color-navy-100)]',
}

/**
 * وسم المهلة — يبيّن التأخّر أو قرب انتهاء الموعد.
 * @param {{ deadline: string, status: string, showOk?: boolean }} props
 */
export default function DeadlineBadge({ deadline, status, showOk = false }) {
  const info = deadlineInfo(deadline, status)
  if (!info) return null
  if (info.state === 'ok' && !showOk) return null
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STYLES[info.state]}`}>
      {info.state === 'overdue' && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
      )}
      {info.label}
    </span>
  )
}
