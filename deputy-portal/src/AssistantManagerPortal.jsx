import { useEffect, useState } from 'react'
import PortalLayout from './components/layout/PortalLayout'
import StatusBadge from './components/ui/StatusBadge'
import StatCard from './components/ui/StatCard'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import { PageLoader } from './components/ui/Spinner'
import ResearchFiles from './components/ui/ResearchFiles'
import Discussion from './components/ui/Discussion'
import { useToast } from './components/ui/Toast'
import { useConfirm } from './components/ui/ConfirmDialog'
import {
  IconDashboard, IconShield, IconClock, IconCheck, IconDocument, IconActivity,
} from './components/icons/Icons'
import { formatDate, PURPOSE_LABELS, CONFIDENTIALITY_LABELS, REQUESTER_TYPES } from './lib/format'
import * as api from './api'

export default function AssistantManagerPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const toast = useToast()

  const refresh = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const r = await api.getRequests({ limit: 200 })
      if (r.success) setRequests(r.data || [])
    } catch (e) {
      if (!silent) toast.error(e.message)
    }
    finally { if (!silent) setLoading(false) }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(() => refresh(true), 30000)
    return () => clearInterval(interval)
  }, [])

  // المعاون يهتم بالـ pending_assistant + ما سبقها وما بعدها
  const pendingMyReview = requests.filter((r) => r.status === 'pending_assistant')
  const inProcess = requests.filter((r) => ['pending_dept_review', 'proofreading', 'pending_dept_send', 'pending_manager_send'].includes(r.status))
  const completedByMe = requests.filter((r) => r.assistant_review_by === user?.id)

  const navItems = [
    { key: 'dashboard', label: 'لوحة المعلومات', icon: IconDashboard },
    { key: 'pending', label: 'بانتظار تدقيقي', icon: IconShield, badge: pendingMyReview.length },
    { key: 'in_process', label: 'قيد التنفيذ', icon: IconActivity },
    { key: 'done', label: 'دققتُها سابقاً', icon: IconCheck },
  ]

  const meta = {
    dashboard: { title: 'لوحة المعاون', subtitle: `مرحباً ${user?.name || ''} — التدقيق النهائي للبحوث` },
    pending:   { title: 'البحوث بانتظار التدقيق النهائي', subtitle: 'بحوث أحالها الباحثون إليك بعد المدقق اللغوي' },
    in_process:{ title: 'بحوث قيد التنفيذ', subtitle: 'بحوث لم تصل لمرحلة التدقيق النهائي بعد' },
    done:      { title: 'البحوث التي دققتها', subtitle: 'سجل قراراتك السابقة' },
  }

  let rows = []
  if (tab === 'pending') rows = pendingMyReview
  else if (tab === 'in_process') rows = inProcess
  else if (tab === 'done') rows = completedByMe

  return (
    <PortalLayout
      user={user}
      portalLabel="المعاون"
      navItems={navItems}
      activeKey={tab}
      onNavigate={setTab}
      onLogout={onLogout}
      title={meta[tab].title}
      subtitle={meta[tab].subtitle}
    >
      {loading ? <PageLoader /> : tab === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatCard label="بانتظار تدقيقي" value={pendingMyReview.length} tone="warning" icon={<IconClock />} />
            <StatCard label="بحوث قيد التنفيذ" value={inProcess.length} tone="info" icon={<IconDocument />} />
            <StatCard label="دققتها" value={completedByMe.length} tone="success" icon={<IconCheck />} />
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">البحوث بانتظار التدقيق النهائي</h3>
            </div>
            {pendingMyReview.length === 0 ? <EmptyState title="لا توجد بحوث بانتظارك" description="ستظهر هنا البحوث التي يحيلها الباحثون إليك بعد المدقق اللغوي" /> : (
              <div className="divide-y divide-[var(--color-border)]">
                {pendingMyReview.map((r) => (
                  <button key={r.id} onClick={() => setActive(r)} className="w-full text-right p-4 hover:bg-[var(--color-surface-soft)] flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-gold-50)] text-[var(--color-gold-700)] flex items-center justify-center">
                      <IconShield className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-[var(--color-navy-500)]" dir="ltr">{r.id}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="font-semibold text-[var(--color-navy-900)] truncate">{r.title}</p>
                      <p className="text-xs text-[var(--color-navy-500)] mt-1">
                        من: {r.deputy_name} • القسم: {r.assigned_department}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        rows.length === 0 ? <div className="card"><EmptyState title="لا توجد بيانات" /></div> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>العنوان</th>
                  <th>النائب</th>
                  <th>القسم</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setActive(r)} className="cursor-pointer">
                    <td className="font-mono text-xs" dir="ltr">{r.id}</td>
                    <td className="font-semibold max-w-md truncate">{r.title}</td>
                    <td className="text-sm">{r.deputy_name}</td>
                    <td className="text-sm">{r.assigned_department || '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td><button className="btn-ghost btn-sm">عرض</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <ReviewModal
        request={active}
        onClose={() => setActive(null)}
        onChanged={() => { setActive(null); refresh() }}
      />
    </PortalLayout>
  )
}

function ReviewModal({ request, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [decision, setDecision] = useState('approve')
  const [notes, setNotes] = useState('')
  const [confidentiality, setConfidentiality] = useState('public')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const confirmAction = useConfirm()

  useEffect(() => {
    if (!request) { setDetail(null); return }
    setLoading(true)
    setDecision('approve')
    setNotes('')
    // علم cancelled: يمنع ردّ طلبٍ سابق من دهس تفاصيل طلبٍ فُتح بعده —
    // حرِج هنا لأن المعاون يقرّر «اعتماد/رفض» بناءً على المحتوى المعروض
    let cancelled = false
    api.getRequest(request.id)
      .then((r) => {
        if (cancelled || !r.success) return
        setDetail(r.data)
        // نبدأ من تصنيف الجهة الطالبة، ويستطيع المعاون تعديله
        setConfidentiality(r.data.confidentiality || 'public')
      })
      .catch(() => {}).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request])

  if (!request) return null
  const d = detail || request

  const submit = async () => {
    const approve = decision === 'approve'
    if (!(await confirmAction({
      title: approve ? 'اعتماد البحث نهائياً' : 'رفض البحث',
      message: approve ? 'سيُعتمَد البحث ويُوجَّه للتسليم للجهة الطالبة.' : 'سيُرجَع البحث إلى الباحث للتعديل.',
      danger: !approve, confirmText: approve ? 'اعتماد' : 'رفض',
    }))) return
    setBusy(true)
    try {
      await api.assistantFinalReview(d.id, decision, notes, decision === 'approve' ? confidentiality : undefined)
      toast.success('تم تسجيل قرارك')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={!!request} onClose={onClose} title={`الطلب ${request.id}`} size="lg">
      {loading ? <PageLoader /> : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[var(--color-navy-900)]">{d.title}</h3>
              <p className="text-sm text-[var(--color-navy-600)] mt-1">{d.description}</p>
            </div>
            <StatusBadge status={d.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--color-surface-soft)] rounded-xl">
            <Field label="الجهة الطالبة" value={d.deputy_name} />
            <Field label="نوع الجهة" value={REQUESTER_TYPES[d.requester_type] || 'نائب'} />
            <Field label="اللجنة" value={d.committee} />
            <Field label="الغرض" value={PURPOSE_LABELS[d.purpose] || '—'} />
            <Field label="القسم" value={d.assigned_department} />
            <Field label="تصنيف الجهة الطالبة" value={CONFIDENTIALITY_LABELS[d.confidentiality] || 'عام'} />
            <Field label="تاريخ التقديم" value={formatDate(d.date_received)} />
            <Field label="موافقة على النشر" value={d.can_share ? '✓ نعم' : '✗ لا'} />
          </div>

          {d.status === 'pending_assistant' && (
            <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">التدقيق النهائي</h4>
              <div className="flex gap-2 mb-3">
                <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 ${decision === 'approve' ? 'border-[var(--color-success-600)] bg-emerald-50' : 'border-[var(--color-border)] bg-white'}`}>
                  <input type="radio" name="dec" value="approve" checked={decision === 'approve'} onChange={(e) => setDecision(e.target.value)} className="sr-only" />
                  <div className="flex items-center gap-2">
                    <IconCheck className="w-5 h-5 text-[var(--color-success-700)]" />
                    <span className="font-semibold">اعتماد + إرجاع لرئيس القسم</span>
                  </div>
                </label>
                <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 ${decision === 'reject' ? 'border-[var(--color-danger-600)] bg-red-50' : 'border-[var(--color-border)] bg-white'}`}>
                  <input type="radio" name="dec" value="reject" checked={decision === 'reject'} onChange={(e) => setDecision(e.target.value)} className="sr-only" />
                  <div className="flex items-center gap-2">
                    <IconClock className="w-5 h-5 text-[var(--color-danger-700)]" />
                    <span className="font-semibold">رفض + إرجاع للباحث</span>
                  </div>
                </label>
              </div>

              {/* تحديد مسار التسليم عند الاعتماد */}
              {decision === 'approve' && (
                <div className="mb-3 p-3 rounded-lg bg-white border border-[var(--color-border)]">
                  <label className="label label-required mb-1">تصنيف البحث ومسار التسليم</label>
                  <p className="form-hint mb-2">
                    البحث العام يُرسل إلى رئيس القسم ليسلّمه للنائب، وذو الخصوصية يُرسل إلى مدير الدائرة.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {Object.entries(CONFIDENTIALITY_LABELS).map(([value, label]) => {
                      const checked = confidentiality === value
                      const danger = value === 'confidential'
                      return (
                        <label key={value} className={`flex-1 cursor-pointer p-2.5 rounded-lg border-2 transition ${
                          checked
                            ? danger
                              ? 'border-[var(--color-danger-600)] bg-[var(--color-danger-50)]'
                              : 'border-[var(--color-success-600)] bg-[var(--color-success-50)]'
                            : 'border-[var(--color-border)] hover:bg-[var(--color-surface-soft)]'
                        }`}>
                          <input
                            type="radio" name="conf" value={value} checked={checked}
                            onChange={(e) => setConfidentiality(e.target.value)} className="sr-only"
                          />
                          <span className="font-semibold text-sm block">{label}</span>
                          <span className="text-[10px] text-[var(--color-navy-500)]">
                            {danger ? '← مدير الدائرة' : '← رئيس القسم'}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                  {d.confidentiality && confidentiality !== d.confidentiality && (
                    <p className="text-[11px] font-semibold text-[var(--color-warning-700)] mt-2">
                      ⚠️ ستغيّر تصنيف الجهة الطالبة من «{CONFIDENTIALITY_LABELS[d.confidentiality]}» إلى «{CONFIDENTIALITY_LABELS[confidentiality]}»
                    </p>
                  )}
                </div>
              )}

              <textarea className="textarea mb-3" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات (مهم في حال الرفض)" />
              <button onClick={submit} disabled={busy} className={decision === 'approve' ? 'btn-success w-full' : 'btn-danger w-full'}>
                {busy ? 'جاري...' : 'تأكيد القرار'}
              </button>
            </div>
          )}

          {/* المعاون يمنح الاعتماد النهائي — فلا يصح أن يقرر بلا مستند */}
          <ResearchFiles
            files={d.files}
            title="ملف البحث للتدقيق النهائي"
            emptyText="لم يُرفق ملف بهذا البحث — لا تعتمده قبل التحقق"
          />

          <Discussion
            entityType="request"
            entityId={d.id}
            notes={d.notes || []}
            onAdded={() => api.getRequest(d.id).then((x) => { if (x.success) setDetail(x.data) }).catch(() => {})}
          />
        </div>
      )}
    </Modal>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[var(--color-navy-500)] font-semibold mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-900)]">{value || '—'}</p>
    </div>
  )
}
