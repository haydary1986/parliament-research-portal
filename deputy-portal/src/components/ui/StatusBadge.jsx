import { STATUS_LABELS } from '../../lib/format'

// عناوين الحالات بالعربية (مرجع: req.md - تصنيف الطلبات)

export default function StatusBadge({ status, className = '' }) {
  const label = STATUS_LABELS[status] || status
  const cls = `status-${status}`
  return <span className={`${cls} ${className}`}>{label}</span>
}
