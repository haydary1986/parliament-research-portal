import { useEffect, useState } from 'react'
import * as api from '../../api'
import { formatDateTime } from '../../lib/format'

// أيقونة ولون كل نوع قرار
const ACTION_META = {
  create_request:      { tone: 'navy', label: 'تقديم الطلب' },
  assign_request:      { tone: 'gold', label: 'الإحالة إلى القسم' },
  cancel_referral:     { tone: 'danger', label: 'إلغاء الإحالة' },
  confirm_request:     { tone: 'gold', label: 'التأكيد وتعيين الباحث' },
  update_request:      { tone: 'navy', label: 'تعديل الطلب' },
  dept_review_approve: { tone: 'success', label: 'اعتماد رئيس القسم' },
  dept_review_reject:  { tone: 'danger', label: 'إرجاع رئيس القسم' },
  assistant_approve:   { tone: 'success', label: 'اعتماد المعاون' },
  assistant_reject:    { tone: 'danger', label: 'رفض المعاون' },
  return_request:      { tone: 'danger', label: 'لا يمكن التنفيذ' },
  reject_request:      { tone: 'danger', label: 'رفض الطلب' },
  withdraw_request:    { tone: 'danger', label: 'سحب الطلب' },
  dept_send_to_deputy: { tone: 'success', label: 'إرسال للنائب' },
  manager_send_to_deputy: { tone: 'success', label: 'إرسال للنائب' },
}

const DOT = {
  navy: 'bg-[var(--color-navy-600)]',
  gold: 'bg-[var(--color-gold-500)]',
  success: 'bg-[var(--color-success-600)]',
  danger: 'bg-[var(--color-danger-600)]',
}

/**
 * سجل قرارات الطلب — «من فعل ماذا ومتى» عبر مراحل الطلب.
 * @param {{ requestId: string }} props
 */
export default function RequestTimeline({ requestId }) {
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    if (!requestId) return
    let cancelled = false
    api.getRequestTimeline(requestId)
      .then((r) => { if (!cancelled && r.success) setEntries(r.data || []) })
      .catch(() => { if (!cancelled) setEntries([]) })
    return () => { cancelled = true }
  }, [requestId])

  if (entries === null) {
    return <p className="text-xs text-[var(--color-navy-400)]">جارٍ تحميل السجل…</p>
  }
  if (entries.length === 0) {
    return <p className="text-xs text-[var(--color-navy-400)]">لا توجد قرارات مسجَّلة بعد.</p>
  }

  return (
    <ol className="relative space-y-3 pr-4">
      <span aria-hidden="true" className="absolute right-[5px] top-1.5 bottom-1.5 w-px bg-[var(--color-border)]" />
      {entries.map((e, i) => {
        const meta = ACTION_META[e.action] || { tone: 'navy', label: e.action }
        return (
          <li key={i} className="relative flex gap-3">
            <span aria-hidden="true" className={`absolute right-[-13px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--color-surface)] ${DOT[meta.tone] || DOT.navy}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-[13px] font-semibold text-[var(--color-navy-900)]">{meta.label}</p>
                <time className="text-[10px] text-[var(--color-navy-400)] font-mono" dir="ltr">{formatDateTime(e.created_at)}</time>
              </div>
              {e.details && <p className="text-xs text-[var(--color-navy-600)] mt-0.5 leading-relaxed">{e.details}</p>}
              {e.user_name && <p className="text-[10px] text-[var(--color-navy-400)] mt-0.5">بواسطة: {e.user_name}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
