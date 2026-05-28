import { useEffect, useState } from 'react'
import PortalLayout from './components/layout/PortalLayout'
import StatusBadge from './components/ui/StatusBadge'
import StatCard from './components/ui/StatCard'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import { PageLoader } from './components/ui/Spinner'
import { useToast } from './components/ui/Toast'
import {
  IconDashboard, IconResearch, IconMail, IconArchive, IconDocument,
  IconClock, IconCheck, IconPlus,
} from './components/icons/Icons'
import { formatDate, formatDateTime } from './lib/format'
import * as api from './api'

export default function ResearcherPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const toast = useToast()

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await api.getResearchTasks()
      if (r.success) setTasks(r.data || [])
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  const myTasks = tasks
  const activeTasks = myTasks.filter((t) => ['assigned', 'in_progress'].includes(t.status))
  const awaitingConsent = myTasks.filter((t) => ['completed'].includes(t.status) && !t.archive_consent)
  const completed = myTasks.filter((t) => t.status === 'completed')

  const navItems = [
    { key: 'dashboard', label: 'لوحة المعلومات', icon: IconDashboard },
    { key: 'active', label: 'مهامي النشطة', icon: IconResearch, badge: activeTasks.length },
    { key: 'all', label: 'كل المهام', icon: IconDocument },
    { key: 'consent', label: 'موافقة الأرشفة', icon: IconArchive, badge: awaitingConsent.length },
  ]

  const meta = {
    dashboard: { title: 'مهامي البحثية', subtitle: `مرحباً ${user?.name || ''}` },
    active: { title: 'المهام النشطة', subtitle: 'مهام قيد العمل عليها' },
    all: { title: 'كل المهام', subtitle: 'سجل كامل لمهامي' },
    consent: { title: 'موافقة على الأرشفة', subtitle: 'بحوث تنتظر قرارك بشأن المستودع الرقمي' },
  }

  let rows = []
  if (tab === 'active') rows = activeTasks
  else if (tab === 'consent') rows = awaitingConsent
  else if (tab === 'all') rows = myTasks

  return (
    <PortalLayout
      user={user}
      portalLabel="الباحث"
      navItems={navItems}
      activeKey={tab}
      onNavigate={setTab}
      onLogout={onLogout}
      title={meta[tab].title}
      subtitle={meta[tab].subtitle}
    >
      {loading ? <PageLoader /> : tab === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="مهام نشطة" value={activeTasks.length} tone="warning" icon={<IconClock />} />
            <StatCard label="مكتملة" value={completed.length} tone="success" icon={<IconCheck />} />
            <StatCard label="بانتظار موافقتك" value={awaitingConsent.length} tone="info" icon={<IconArchive />} />
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">آخر مهامي</h3></div>
            {myTasks.length === 0 ? <EmptyState title="لا توجد مهام بعد" /> : (
              <div className="divide-y divide-[var(--color-border)]">
                {myTasks.slice(0, 6).map((t) => (
                  <button key={t.id} onClick={() => setActive(t)} className="w-full text-right p-4 hover:bg-[var(--color-surface-soft)] flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-navy-50)] text-[var(--color-navy-700)] flex items-center justify-center">
                      <IconResearch className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-[var(--color-navy-500)]" dir="ltr">{t.id}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="font-semibold text-[var(--color-navy-900)] truncate">{t.request_title}</p>
                      <p className="text-xs text-[var(--color-navy-500)] mt-1">
                        {t.deadline ? `الموعد: ${formatDate(t.deadline)}` : 'بدون موعد'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <TasksTable rows={rows} onOpen={setActive} />
      )}

      <TaskDetailModal
        task={active}
        onClose={() => setActive(null)}
        onChanged={() => { setActive(null); refresh() }}
      />
    </PortalLayout>
  )
}

function TasksTable({ rows, onOpen }) {
  if (rows.length === 0) return <div className="card"><EmptyState title="لا توجد مهام" /></div>
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>عنوان البحث</th>
            <th>تاريخ التعيين</th>
            <th>الموعد النهائي</th>
            <th>الحالة</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} onClick={() => onOpen(t)} className="cursor-pointer">
              <td className="font-mono text-xs" dir="ltr">{t.id}</td>
              <td className="font-semibold max-w-md truncate">{t.request_title}</td>
              <td className="text-xs">{formatDate(t.date_assigned)}</td>
              <td className="text-xs">{formatDate(t.deadline)}</td>
              <td><StatusBadge status={t.status} /></td>
              <td><button className="btn-ghost btn-sm">عرض</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TaskDetailModal({ task, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [target, setTarget] = useState('')
  const [subject, setSubject] = useState('')
  const [consentChoice, setConsentChoice] = useState('approved')
  const [consentNotes, setConsentNotes] = useState('')
  const toast = useToast()

  useEffect(() => {
    if (!task) { setDetail(null); return }
    setLoading(true)
    setShowInfo(false); setTarget(''); setSubject(''); setConsentNotes('')
    api.getResearchTask(task.id).then((r) => { if (r.success) setDetail(r.data) }).catch(() => {}).finally(() => setLoading(false))
  }, [task])

  if (!task) return null
  const t = detail || task

  const updateStatus = async (status) => {
    setBusy(true)
    try {
      await api.updateResearchTaskStatus(t.id, status)
      toast.success('تم التحديث')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const createInfo = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api.createInfoRequest(t.id, { target_entity: target, subject })
      toast.success('تم إنشاء طلب المعلومات')
      setShowInfo(false); setTarget(''); setSubject('')
      const r = await api.getResearchTask(t.id)
      if (r.success) setDetail(r.data)
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  const submitConsent = async () => {
    setBusy(true)
    try {
      await api.updateArchiveConsent(t.id, consentChoice, consentNotes)
      toast.success('تم تسجيل قرارك')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const updateInfoResp = async (id, status, letterNumber = '') => {
    setBusy(true)
    try {
      await api.updateInfoRequestResponse(id, { status, response_letter_number: letterNumber })
      toast.success('تم التحديث')
      const r = await api.getResearchTask(t.id)
      if (r.success) setDetail(r.data)
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={!!task} onClose={onClose} title={`المهمة ${task.id}`} size="lg">
      {loading ? <PageLoader /> : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-[var(--color-navy-900)]">{task.request_title}</h3>
            <StatusBadge status={t.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--color-surface-soft)] rounded-xl">
            <Field label="تاريخ التعيين" value={formatDate(t.date_assigned)} />
            <Field label="الموعد النهائي" value={formatDate(t.deadline)} />
            <Field label="مدة الإنجاز" value={`${t.completion_days || 0} يوم`} />
            <Field label="تاريخ التسليم" value={formatDate(t.submitted_date)} />
          </div>

          {t.status === 'assigned' && (
            <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
              <p className="text-sm mb-3">عند البدء بالعمل، حدِّث حالة المهمة:</p>
              <button onClick={() => updateStatus('in_progress')} disabled={busy} className="btn-primary w-full">
                {busy ? 'جاري...' : 'بدء العمل على البحث'}
              </button>
            </div>
          )}

          {t.status === 'in_progress' && (
            <div className="card p-4 bg-[var(--color-navy-50)] border-[var(--color-navy-200)]">
              <div className="flex gap-3">
                <button onClick={() => updateStatus('submitted')} disabled={busy} className="btn-success flex-1">
                  تسليم البحث للمراجعة
                </button>
                <button onClick={() => setShowInfo(true)} disabled={(t.information_requests || []).length >= 3} className="btn-outline flex-1">
                  <IconPlus className="w-4 h-4" />
                  طلب معلومات ({(t.information_requests || []).length}/3)
                </button>
              </div>
            </div>
          )}

          {/* Workflow الجديد: بعد المدقق اللغوي، الباحث يحيل للمعاون */}
          {t.status === 'submitted' && (
            <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
              <h4 className="font-bold text-sm mb-2 text-[var(--color-navy-900)]">إحالة للمعاون</h4>
              <p className="text-xs text-[var(--color-navy-600)] mb-3">
                تم المدقق اللغوي للبحث. يرجى إحالته إلى المعاون للتدقيق النهائي قبل التسليم للنائب.
              </p>
              <button
                onClick={async () => {
                  setBusy(true)
                  try {
                    await api.referToAssistant(t.id)
                    toast.success('تمت الإحالة إلى المعاون')
                    onChanged()
                  } catch (e) { toast.error(e.message) }
                  finally { setBusy(false) }
                }}
                disabled={busy}
                className="btn-primary w-full"
              >
                {busy ? 'جاري...' : 'إحالة إلى المعاون للتدقيق النهائي'}
              </button>
            </div>
          )}

          {showInfo && (
            <form onSubmit={createInfo} className="card p-4 space-y-3">
              <h4 className="font-bold text-sm text-[var(--color-navy-900)]">طلب معلومات جديد</h4>
              <div>
                <label className="label label-required">الجهة المستهدفة</label>
                <input value={target} onChange={(e) => setTarget(e.target.value)} required className="input" placeholder="مثال: وزارة المالية" />
              </div>
              <div>
                <label className="label label-required">موضوع الطلب</label>
                <textarea value={subject} onChange={(e) => setSubject(e.target.value)} required className="textarea" rows={3} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowInfo(false)} className="btn-outline flex-1">إلغاء</button>
                <button type="submit" disabled={busy} className="btn-primary flex-1">{busy ? 'جاري...' : 'إرسال'}</button>
              </div>
            </form>
          )}

          {t.information_requests && t.information_requests.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h4 className="card-title text-base flex items-center gap-2"><IconMail className="w-4 h-4" /> طلبات المعلومات</h4>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {t.information_requests.map((ir) => (
                  <div key={ir.id} className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{ir.target_entity}</p>
                        <p className="text-xs text-[var(--color-navy-600)] mt-0.5">{ir.subject}</p>
                        <p className="text-[10px] text-[var(--color-navy-500)] mt-1">المحاولة {ir.attempt_number}/3 • أُرسل {formatDate(ir.date_sent)}</p>
                      </div>
                      <StatusBadge status={ir.status} />
                    </div>
                    {ir.status === 'sent' && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--color-border)]">
                        <button onClick={() => {
                          const ln = prompt('رقم كتاب الرد:')
                          if (ln) updateInfoResp(ir.id, 'received', ln)
                        }} disabled={busy} className="btn-success btn-sm flex-1">وصل الرد</button>
                        <button onClick={() => updateInfoResp(ir.id, 'no_response')} disabled={busy} className="btn-outline btn-sm flex-1">لا يوجد رد</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(t.status === 'completed' || (task.status === 'completed' && !task.archive_consent)) && !t.archive_consent && (
            <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">موافقة على إرسال البحث للمستودع الرقمي</h4>
              <p className="text-xs text-[var(--color-navy-600)] mb-3">قرارك هذا يحدد ما إذا كان البحث سيُؤرشف ويُتاح للبحث في المستودع.</p>
              <div className="flex gap-2 mb-3">
                <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 ${consentChoice === 'approved' ? 'border-[var(--color-success-600)] bg-emerald-50' : 'border-[var(--color-border)]'}`}>
                  <input type="radio" name="cc" value="approved" checked={consentChoice === 'approved'} onChange={(e) => setConsentChoice(e.target.value)} className="sr-only" />
                  <div className="flex items-center gap-2"><IconCheck className="w-5 h-5 text-[var(--color-success-700)]" /><span className="font-semibold">موافق</span></div>
                </label>
                <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 ${consentChoice === 'rejected' ? 'border-[var(--color-danger-600)] bg-red-50' : 'border-[var(--color-border)]'}`}>
                  <input type="radio" name="cc" value="rejected" checked={consentChoice === 'rejected'} onChange={(e) => setConsentChoice(e.target.value)} className="sr-only" />
                  <div className="flex items-center gap-2"><span className="font-semibold">رافض</span></div>
                </label>
              </div>
              <textarea className="textarea mb-3" rows={2} value={consentNotes} onChange={(e) => setConsentNotes(e.target.value)} placeholder="ملاحظات (اختياري)" />
              <button onClick={submitConsent} disabled={busy} className="btn-primary w-full">{busy ? 'جاري...' : 'تأكيد القرار'}</button>
            </div>
          )}

          {t.archive_consent && (
            <div className={`card p-3 ${t.archive_consent === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm font-semibold">
                {t.archive_consent === 'approved' ? '✓ وافقت على الأرشفة' : '✗ رفضت الأرشفة'}
                <span className="text-xs font-normal text-[var(--color-navy-500)] mr-2">— {formatDate(t.archive_consent_date)}</span>
              </p>
            </div>
          )}

          {t.notes && t.notes.length > 0 && (
            <div>
              <h4 className="font-bold text-sm mb-3">الملاحظات</h4>
              <div className="space-y-2">
                {t.notes.map((n) => (
                  <div key={n.id} className="p-3 bg-[var(--color-surface-soft)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm">{n.user_name}</span>
                      <span className="text-[10px] text-[var(--color-navy-500)]">{formatDateTime(n.created_at)}</span>
                    </div>
                    <p className="text-sm">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
