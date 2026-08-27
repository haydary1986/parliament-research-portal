import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import { PageLoader } from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import StatCard from '../ui/StatCard'
import StatusBadge from '../ui/StatusBadge'
import { useToast } from '../ui/Toast'
import { IconDocument, IconClock, IconCheck, IconActivity } from '../icons/Icons'
import { formatDate, REQUESTER_TYPES, STATUS_LABELS } from '../../lib/format'
import * as api from '../../api'

/**
 * التقرير التشغيلي لمدير الدائرة — لم يكن للمنصة أي تقرير أداء،
 * والتصدير الوحيد كان بيانات دخول النواب.
 */
export default function OperationsReport() {
  const [rep, setRep] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    api.getOperationsReport()
      .then((r) => { if (!cancelled && r.success) setRep(r.data) })
      .catch((e) => { if (!cancelled) toast.error(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportExcel = async () => {
    setExporting(true)
    try {
      const r = await api.exportRequests()
      const rows = (r.data || []).map((x) => ({
        'رقم الطلب': x.id,
        'العنوان': x.title,
        'الجهة الطالبة': x.requester,
        'نوع الجهة': REQUESTER_TYPES[x.requester_type] || x.requester_type,
        'اللجنة': x.committee,
        'الحالة': STATUS_LABELS[x.status] || x.status,
        'التصنيف': x.confidentiality === 'confidential' ? 'ذو خصوصية' : 'عام',
        'القسم': x.department,
        'نوع الخدمة': x.service_type,
        'تصنيف البحث': x.classification,
        'الباحثون': x.researchers,
        'تاريخ التقديم': formatDate(x.date_received),
        'الموعد النهائي': formatDate(x.deadline),
        'تاريخ الإنجاز': formatDate(x.completed_date),
      }))
      if (rows.length === 0) return toast.error('لا توجد طلبات للتصدير')
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 22 }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'الطلبات')
      XLSX.writeFile(wb, `تقرير_الطلبات_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success(`صُدِّر ${rows.length} طلباً`)
    } catch (e) {
      toast.error(e.message)
    } finally { setExporting(false) }
  }

  if (loading) return <PageLoader />
  if (!rep) return <div className="card"><EmptyState title="تعذّر تحميل التقرير" /></div>

  const totalRequests = Object.values(rep.by_status || {}).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-navy-500)]">
          حُدِّث في {new Date(rep.generated_at).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        <button onClick={exportExcel} disabled={exporting} className="btn-gold btn-sm">
          {exporting ? 'جاري التصدير...' : '⬇ تصدير الطلبات إلى Excel'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard label="إجمالي الطلبات" value={totalRequests} tone="navy" icon={<IconDocument />} />
        <StatCard label="متأخرة عن الموعد" value={rep.overdue} tone="danger" icon={<IconClock />} />
        <StatCard
          label="متوسط الإنجاز"
          value={rep.avg_completion_days ? `${Math.round(rep.avg_completion_days)} يوم` : '—'}
          tone="info"
          icon={<IconActivity />}
        />
        <StatCard label="الأقسام" value={(rep.departments || []).length} tone="success" icon={<IconCheck />} />
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">حِمل الأقسام</h3></div>
        <div className="scroll table-wrap" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>القسم</th><th>نشط</th><th>مكتمل</th><th>متأخر</th><th>الباحثون</th><th>متوسط الإنجاز</th>
              </tr>
            </thead>
            <tbody>
              {(rep.departments || []).map((d) => (
                <tr key={d.department_id}>
                  <td className="font-semibold">{d.department_name}</td>
                  <td>{d.active}</td>
                  <td>{d.completed}</td>
                  <td className={d.overdue > 0 ? 'font-bold text-[var(--color-danger-700)]' : ''}>{d.overdue}</td>
                  <td>{d.researchers}</td>
                  <td>{d.avg_days ? `${Math.round(d.avg_days)} يوم` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">حِمل الباحثين</h3></div>
        {(rep.researchers || []).length === 0 ? <EmptyState title="لا يوجد باحثون نشطون" /> : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr><th>الباحث</th><th>القسم</th><th>نشط</th><th>مكتمل</th><th>متأخر</th></tr>
              </thead>
              <tbody>
                {rep.researchers.map((x) => (
                  <tr key={x.id}>
                    <td className="font-semibold">{x.name}</td>
                    <td className="text-sm">{x.department}</td>
                    <td>{x.active}</td>
                    <td>{x.completed}</td>
                    <td className={x.overdue > 0 ? 'font-bold text-[var(--color-danger-700)]' : ''}>{x.overdue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(rep.overdue_items || []).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">الطلبات المتأخرة</h3>
            <span className="badge-danger">{rep.overdue_items.length}</span>
          </div>
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr><th>الرقم</th><th>العنوان</th><th>الجهة الطالبة</th><th>الحالة</th><th>الموعد النهائي</th></tr>
              </thead>
              <tbody>
                {rep.overdue_items.map((q) => (
                  <tr key={q.id}>
                    <td className="font-mono text-xs" dir="ltr">{q.id}</td>
                    <td className="font-semibold max-w-xs truncate">{q.title}</td>
                    <td className="text-sm">{q.deputy_name}</td>
                    <td><StatusBadge status={q.status} /></td>
                    <td className="text-xs font-semibold text-[var(--color-danger-700)]">{formatDate(q.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DistributionCard title="توزيع الحالات" data={rep.by_status} labels={STATUS_LABELS} />
        <DistributionCard title="توزيع الجهات الطالبة" data={rep.by_requester_type} labels={REQUESTER_TYPES} />
      </div>

      <DistributionCard title="أكثر اللجان طلباً" data={rep.by_committee} />
    </div>
  )
}

function DistributionCard({ title, data, labels }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  const max = entries.length ? entries[0][1] : 1
  if (entries.length === 0) return null
  return (
    <div className="card">
      <div className="card-header"><h3 className="card-title">{title}</h3></div>
      <div className="p-4 space-y-2.5">
        {entries.map(([key, n]) => (
          <div key={key}>
            <div className="flex items-center justify-between text-sm mb-1 gap-2">
              <span className="font-medium text-[var(--color-navy-800)] truncate">{labels?.[key] || key}</span>
              <span className="text-[var(--color-navy-600)] font-mono">{n}</span>
            </div>
            <div className="h-2 bg-[var(--color-surface-soft)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-[var(--color-gold-500)] to-[var(--color-gold-700)] rounded-full"
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
