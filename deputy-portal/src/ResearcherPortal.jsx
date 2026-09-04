import { useEffect, useState } from 'react'
import FileDownload from './components/ui/FileDownload'
import PortalLayout from './components/layout/PortalLayout'
import StatusBadge from './components/ui/StatusBadge'
import StatCard from './components/ui/StatCard'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import { PageLoader } from './components/ui/Spinner'
import { useToast } from './components/ui/Toast'
import { useConfirm } from './components/ui/ConfirmDialog'
import {
  IconDashboard, IconResearch, IconMail, IconArchive, IconDocument,
  IconClock, IconCheck, IconPlus, IconUpload,
} from './components/icons/Icons'
import { formatDate, formatDateTime, PURPOSE_LABELS, CONFIDENTIALITY_LABELS, REQUESTER_TYPES } from './lib/format'
import DeadlineBadge from './components/ui/DeadlineBadge'
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

  useEffect(() => {
    refresh()
    const interval = setInterval(() => {
      api.getResearchTasks().then((r) => { if (r.success) setTasks(r.data || []) }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const myTasks = tasks
  // 'returned' ضمن النشطة: البحث المُرجَع من رئيس القسم أو المدقق يحتاج عملاً
  // من الباحث. كان يسقط من القائمة فيصله إشعار الإرجاع بلا سبيل للتعديل.
  // 'submitted' ضمن النشطة ليجد الباحث المهمة المُسلَّمة توّاً ويتراجع عنها إن لزم
  const activeTasks = myTasks.filter((t) => ['assigned', 'in_progress', 'returned', 'submitted'].includes(t.status))
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
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
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
                        {t.deadline ? `الموعد: ${formatDate(t.deadline)}` : 'بدون موعد'} <DeadlineBadge deadline={t.deadline} status={t.status} />
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
        onRefresh={refresh}
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
              <td className="text-xs"><div className="flex items-center gap-2">{formatDate(t.deadline)}<DeadlineBadge deadline={t.deadline} status={t.status} /></div></td>
              <td><StatusBadge status={t.status} /></td>
              <td><button className="btn-ghost btn-sm">عرض</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TaskDetailModal({ task, onClose, onChanged, onRefresh }) {
  const [detail, setDetail] = useState(null)
  const [reqDetail, setReqDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [target, setTarget] = useState('')
  const [subject, setSubject] = useState('')
  const [letterNumber, setLetterNumber] = useState('')
  const [letterDate, setLetterDate] = useState('')
  const [consentChoice, setConsentChoice] = useState('approved')
  const [consentNotes, setConsentNotes] = useState('')
  const toast = useToast()
  const confirmAction = useConfirm()

  useEffect(() => {
    if (!task) { setDetail(null); setReqDetail(null); return }
    setLoading(true)
    setShowInfo(false); setTarget(''); setSubject(''); setConsentNotes('')
    setLetterNumber(''); setLetterDate('')
    setReqDetail(null)
    // علم cancelled: يمنع ردّ مهمةٍ سابقة من دهس تفاصيل مهمةٍ فُتحت بعدها
    let cancelled = false
    api.getResearchTask(task.id)
      .then((r) => { if (!cancelled && r.success) setDetail(r.data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    // تفاصيل الطلب: من الجهة الطالبة، العنوان الكامل، الوصف، اللجنة، الغرض
    if (task.request_id) {
      api.getRequest(task.request_id)
        .then((r) => { if (!cancelled && r.success) setReqDetail(r.data) })
        .catch(() => { /* التفاصيل غير حرِجة لعرض المهمة */ })
    }
    return () => { cancelled = true }
  }, [task])

  if (!task) return null
  const t = detail || task

  // تحديث في مكانه: يُبقي النافذة مفتوحة ويحدّث القائمة خلفها.
  // كان رفع الملف يُغلق النافذة فينقطع مسار الباحث ويضطر لإعادة فتحها.
  const reloadInPlace = async () => {
    try {
      const r = await api.getResearchTask(t.id)
      if (r.success) setDetail(r.data)
    } catch { /* الفشل غير حرج — القائمة تُحدَّث على أي حال */ }
    onRefresh?.()
  }

  // تغييرات الحالة التي تُبقي المهمة عند الباحث: نبقى في النافذة
  const updateStatusInPlace = async (status) => {
    setBusy(true)
    try {
      await api.updateResearchTaskStatus(t.id, status)
      toast.success('تم التحديث')
      await reloadInPlace()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  // التراجع عن التسليم — يعيد المهمة «قيد الإعداد» ليعدّلها الباحث
  const retract = async () => {
    if (!(await confirmAction({
      title: 'التراجع عن التسليم',
      message: 'سيعود البحث «قيد الإعداد» لتتمكّن من تعديله ثم إعادة تسليمه. متاح ما دام رئيس القسم لم يبدأ المراجعة.',
    }))) return
    setBusy(true)
    try {
      await api.retractSubmission(t.id)
      toast.success('تم التراجع — يمكنك تعديل البحث وإعادة تسليمه')
      await reloadInPlace()
      // نحدّث حالة الطلب المعروضة أيضاً
      if (t.request_id) {
        const r = await api.getRequest(t.request_id).catch(() => null)
        if (r?.success) setReqDetail(r.data)
      }
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  // تغييرات تُخرج المهمة من قائمة الباحث: نغلق النافذة
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
      await api.createInfoRequest(t.id, {
        target_entity: target,
        subject,
        number: letterNumber,
        letter_date: letterDate,
      })
      toast.success('تم تسجيل الكتاب')
      setShowInfo(false); setTarget(''); setSubject(''); setLetterNumber(''); setLetterDate('')
      const r = await api.getResearchTask(t.id)
      if (r.success) setDetail(r.data)
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  const submitConsent = async () => {
    const approve = consentChoice === 'approved'
    if (!(await confirmAction({ title: 'قرار الأرشفة', message: approve ? 'ستوافق على إرسال البحث للمستودع الرقمي.' : 'سترفض أرشفة البحث في المستودع الرقمي.', confirmText: approve ? 'موافقة' : 'رفض', danger: !approve }))) return
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
            <h3 className="text-lg font-bold text-[var(--color-navy-900)]">{reqDetail?.title || task.request_title}</h3>
            <StatusBadge status={t.status} />
          </div>

          {/* تفاصيل الطلب: من الجهة الطالبة، العنوان الكامل، الوصف، اللجنة، الغرض
              — بدونها كان الباحث يُكلَّف بمهمة لا يعرف مصدرها ولا تفاصيلها */}
          <div className="card p-4 border-r-4 border-r-[var(--color-gold-500)]">
            <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">بيانات الطلب</h4>
            {reqDetail ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                  <Field label="الجهة الطالبة" value={reqDetail.deputy_name} />
                  <Field label="نوع الجهة" value={REQUESTER_TYPES[reqDetail.requester_type] || 'نائب'} />
                  <Field label="اللجنة" value={reqDetail.committee} />
                  <Field label="الغرض" value={PURPOSE_LABELS[reqDetail.purpose] || reqDetail.purpose || '—'} />
                  <Field label="السرّية" value={CONFIDENTIALITY_LABELS[reqDetail.confidentiality] || 'عام'} />
                  <Field label="رقم الطلب" value={reqDetail.id} />
                  {reqDetail.confirmation?.service_type && <Field label="نوع الخدمة" value={reqDetail.confirmation.service_type} />}
                  {reqDetail.confirmation?.classification && <Field label="التصنيف" value={reqDetail.confirmation.classification} />}
                </div>
                {reqDetail.description && (
                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider text-[var(--color-navy-400)] font-semibold mb-1">تفاصيل البحث المطلوب</p>
                    <p className="text-sm text-[var(--color-navy-800)] leading-relaxed whitespace-pre-wrap">{reqDetail.description}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[var(--color-navy-400)]">جارٍ تحميل تفاصيل الطلب…</p>
            )}
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
              <button onClick={() => updateStatusInPlace('in_progress')} disabled={busy} className="btn-primary w-full">
                {busy ? 'جاري...' : 'بدء العمل على البحث'}
              </button>
            </div>
          )}

          {t.status === 'returned' && (
            <div className="card p-4 bg-red-50 border-red-200">
              <h4 className="font-bold text-sm mb-1 text-[var(--color-danger-700)]">أُرجع البحث للتعديل</h4>
              <p className="text-xs text-[var(--color-navy-700)]">
                راجع ملاحظات رئيس القسم أو المدقق اللغوي، عدّل البحث وارفع النسخة المحدَّثة ثم أعد التسليم.
              </p>
            </div>
          )}

          {(t.status === 'in_progress' || t.status === 'returned') && (
            <div className="card p-4 bg-[var(--color-navy-50)] border-[var(--color-navy-200)] space-y-3">
              <ResearchFileUpload task={t} onUploaded={reloadInPlace} />
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    // التسليم يتطلّب ملفاً — لا يُسلَّم بحث بلا مخرَج
                    if (!t.file_path) {
                      toast.error('يجب رفع ملف البحث قبل التسليم')
                      return
                    }
                    if (!(await confirmAction({ title: 'تسليم البحث للمراجعة', message: 'سيُسلَّم البحث لرئيس القسم للمراجعة.' }))) return
                    updateStatus('submitted')
                  }}
                  disabled={busy || !t.file_path}
                  className="btn-success flex-1"
                  title={!t.file_path ? 'ارفع ملف البحث أولاً' : undefined}
                >
                  {t.status === 'returned' ? 'إعادة تسليم البحث' : 'تسليم البحث للمراجعة'}
                </button>
                <button onClick={() => setShowInfo(true)} disabled={(t.information_requests || []).length >= 3} className="btn-outline flex-1">
                  <IconPlus className="w-4 h-4" />
                  طلب معلومات ({(t.information_requests || []).length}/3)
                </button>
              </div>
            </div>
          )}

          {/* بعد التسليم: البحث يسير في سلسلة المراجعة تلقائياً */}
          {(t.status === 'submitted' || t.status === 'sent_to_proofreader') && (
            <div className="card p-4 bg-[var(--color-navy-50)] border-[var(--color-navy-200)]">
              <h4 className="font-bold text-sm mb-2 text-[var(--color-navy-900)]">البحث قيد المراجعة</h4>
              <p className="text-xs text-[var(--color-navy-700)]">
                سُلِّم البحث ويسير الآن في سلسلة المراجعة تلقائياً:
                رئيس القسم ← المدقق اللغوي ← المعاون ← التسليم للجهة الطالبة.
                ستصلك إشعارات عند أي إرجاع للتعديل.
              </p>
              {/* التراجع عن التسليم: متاح ما دام رئيس القسم لم يبدأ المراجعة */}
              {t.status === 'submitted' && reqDetail?.status === 'pending_dept_review' && (
                <div className="mt-3 pt-3 border-t border-[var(--color-navy-200)]">
                  <p className="text-xs text-[var(--color-navy-600)] mb-2">
                    ما زال بإمكانك التراجع لتعديل البحث — قبل أن يبدأ رئيس القسم مراجعته.
                  </p>
                  <button onClick={retract} disabled={busy} className="btn-outline btn-sm w-full">
                    {busy ? 'جاري...' : '↩ التراجع عن التسليم'}
                  </button>
                </div>
              )}
            </div>
          )}

          {showInfo && (
            <form onSubmit={createInfo} className="card p-4 space-y-3">
              <h4 className="font-bold text-sm text-[var(--color-navy-900)]">كتاب مخاطبة رسمي جديد</h4>
              <div>
                <label className="label label-required">جهة المخاطبة</label>
                <input value={target} onChange={(e) => setTarget(e.target.value)} required className="input" placeholder="مثال: وزارة المالية" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">رقم الكتاب</label>
                  <input value={letterNumber} onChange={(e) => setLetterNumber(e.target.value)} className="input" placeholder="مثال: م/2026/512" />
                  <p className="form-hint">يُولَّد تلقائياً إن تُرك فارغاً</p>
                </div>
                <div>
                  <label className="label">تاريخ الكتاب</label>
                  <input type="date" dir="ltr" value={letterDate} onChange={(e) => setLetterDate(e.target.value)} className="input text-right" />
                  <p className="form-hint">افتراضياً تاريخ اليوم</p>
                </div>
              </div>
              <div>
                <label className="label label-required">موضوع الكتاب</label>
                <textarea value={subject} onChange={(e) => setSubject(e.target.value)} required className="textarea" rows={3} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowInfo(false)} className="btn-outline flex-1">إلغاء</button>
                <button type="submit" disabled={busy} className="btn-primary flex-1">{busy ? 'جاري...' : 'تسجيل الكتاب'}</button>
              </div>
            </form>
          )}

          {t.information_requests && t.information_requests.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h4 className="card-title text-base flex items-center gap-2"><IconMail className="w-4 h-4" /> المخاطبات الرسمية</h4>
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {t.information_requests.map((ir) => (
                  <div key={ir.id} className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{ir.target_entity}</p>
                        <p className="text-xs text-[var(--color-navy-600)] mt-0.5">{ir.subject}</p>
                        <p className="text-[10px] text-[var(--color-navy-500)] mt-1">
                          كتاب رقم <span className="font-mono font-semibold">{ir.number}</span>
                          {' '}بتاريخ {formatDate(ir.date_sent)} • المحاولة {ir.attempt_number}/3
                        </p>
                        {ir.response_letter_number && (
                          <p className="text-[10px] text-[var(--color-success-700)] mt-0.5">
                            رد الجهة: كتاب <span className="font-mono font-semibold">{ir.response_letter_number}</span>
                            {ir.response_date && ` بتاريخ ${formatDate(ir.response_date)}`}
                          </p>
                        )}
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

function ResearchFileUpload({ task, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const toast = useToast()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      e.target.value = ''
      return toast.error('حجم الملف يتجاوز 10MB')
    }
    setUploading(true)
    setProgress(0)
    try {
      // رفع بنسبة تقدّم — لا يُسمح بالتسليم حتى يكتمل الرفع (الزر مُعطَّل أثناءه)
      const up = await api.uploadFileWithProgress(file, setProgress)
      if (up.success && up.data?.filename) {
        await api.attachResearchFile(task.id, up.data.filename)
        toast.success('تم رفع الملف بنجاح')
        await onUploaded?.()
      } else {
        toast.error(up.message || 'فشل رفع الملف')
      }
    } catch (err) { toast.error(err.message || 'فشل رفع الملف') }
    finally { setUploading(false); setProgress(0); e.target.value = '' }
  }

  return (
    <div className="card p-3 bg-white border-[var(--color-border)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">📎</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-navy-500)] font-semibold">ملف البحث</p>
            {task.file_path ? (
              <FileDownload
                filename={task.file_path}
                className="text-sm font-mono text-[var(--color-navy-900)] hover:text-[var(--color-gold-700)] truncate block text-right"
              >
                {task.file_path}
              </FileDownload>
            ) : (
              <p className="text-sm text-[var(--color-navy-400)]">لم يُرفَع ملف بعد</p>
            )}
          </div>
        </div>
        <label className={`btn-outline btn-sm cursor-pointer ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          <IconUpload className="w-4 h-4" />
          <span>{uploading ? `جاري الرفع ${progress}%` : (task.file_path ? 'استبدال' : 'رفع ملف')}</span>
          <input type="file" accept=".pdf,.doc,.docx" onChange={onFile} disabled={uploading} className="sr-only" />
        </label>
      </div>

      {/* شريط تقدّم الرفع — يمنع ضغط التسليم قبل اكتمال الرفع */}
      {uploading && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--color-navy-700)] mb-1">
            <span>جارٍ رفع الملف…</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-surface-soft)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-[var(--color-gold-500)] to-[var(--color-gold-700)] transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--color-navy-500)] mt-1">لا تُغلق النافذة ولا تُسلّم البحث حتى يكتمل الرفع.</p>
        </div>
      )}

      <p className="text-[10px] text-[var(--color-navy-500)] mt-2">PDF / DOC / DOCX (حد أقصى 10MB)</p>
    </div>
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
