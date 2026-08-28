import { useEffect, useRef, useState } from 'react'
import PortalLayout from './components/layout/PortalLayout'
import StatusBadge from './components/ui/StatusBadge'
import StatCard from './components/ui/StatCard'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import { PageLoader } from './components/ui/Spinner'
import ResearchFiles from './components/ui/ResearchFiles'
import Discussion from './components/ui/Discussion'
import { useToast } from './components/ui/Toast'
import {
  IconDashboard, IconRequests, IconPlus, IconDocument, IconClock,
  IconCheck, IconActivity, IconSearch,
} from './components/icons/Icons'
import {
  formatDate, PURPOSE_LABELS, REQUEST_STAGES, getRequestStage,
  CONFIDENTIALITY_LABELS,
} from './lib/format'
import { COMMITTEES } from './lib/committees'
import * as api from './api'

export default function DeputyPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const toast = useToast()

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await api.getRequests({ limit: 100 })
      if (r.success) setRequests(r.data || [])
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(() => {
      api.getRequests({ limit: 100 }).then((r) => { if (r.success) setRequests(r.data || []) }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    inProgress: requests.filter((r) => ['assigned', 'confirmed', 'in_progress', 'review', 'proofreading', 'under_manager_review'].includes(r.status)).length,
    completed: requests.filter((r) => ['delivered', 'completed'].includes(r.status)).length,
  }

  const filtered = requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return r.title?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q)
    }
    return true
  })

  const navItems = [
    { key: 'dashboard', label: 'الرئيسية', icon: IconDashboard },
    { key: 'requests', label: 'طلباتي', icon: IconRequests, badge: stats.total },
    { key: 'new', label: 'تقديم طلب جديد', icon: IconPlus },
  ]

  const tabMeta = {
    dashboard: { title: 'لوحة المعلومات', subtitle: `مرحباً ${user?.name || ''} — متابعة طلباتك البحثية` },
    requests: { title: 'طلباتي البحثية', subtitle: 'عرض ومتابعة جميع طلباتك' },
  }
  const meta = tabMeta[tab] || tabMeta.dashboard

  return (
    <PortalLayout
      user={user}
      portalLabel="السادة النواب"
      navItems={navItems}
      activeKey={tab}
      onNavigate={(k) => { if (k === 'new') setCreateOpen(true); else setTab(k) }}
      onLogout={onLogout}
      title={meta.title}
      subtitle={meta.subtitle}
      actions={
        <button onClick={() => setCreateOpen(true)} className="btn-gold">
          <IconPlus className="w-4 h-4" />
          <span>طلب جديد</span>
        </button>
      }
    >
      {loading ? <PageLoader /> : tab === 'dashboard' ? (
        <DashboardView stats={stats} requests={requests} onOpen={setSelectedRequest} />
      ) : (
        <RequestsView
          requests={filtered}
          search={search}
          onSearch={setSearch}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          onOpen={setSelectedRequest}
        />
      )}

      <CreateRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); refresh(); toast.success('تم تقديم الطلب بنجاح') }}
        defaultCommittees={
          (user?.committees && user.committees.length > 0)
            ? user.committees
            : (user?.committee ? [user.committee] : [])
        }
      />
      <RequestDetailModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onChanged={refresh}
      />
    </PortalLayout>
  )
}

function DashboardView({ stats, requests, onOpen }) {
  const recent = requests.slice(0, 5)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="إجمالي الطلبات" value={stats.total} tone="navy" icon={<IconDocument />} />
        <StatCard label="قيد الانتظار" value={stats.pending} tone="warning" icon={<IconClock />} />
        <StatCard label="قيد التنفيذ" value={stats.inProgress} tone="info" icon={<IconActivity />} />
        <StatCard label="مكتملة / مُسلَّمة" value={stats.completed} tone="success" icon={<IconCheck />} />
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">آخر طلباتي</h3>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="لا توجد طلبات بعد" description="ابدأ بتقديم أول طلب بحثي لك" />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {recent.map((r) => (
              <button key={r.id} onClick={() => onOpen(r)} className="w-full text-right p-4 hover:bg-[var(--color-surface-soft)] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-navy-50)] text-[var(--color-navy-700)] flex items-center justify-center flex-shrink-0">
                    <IconDocument className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-[var(--color-navy-500)]" dir="ltr">{r.id}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="font-semibold text-[var(--color-navy-900)] truncate">{r.title}</p>
                    <p className="text-xs text-[var(--color-navy-500)] mt-1">قُدِّم في {formatDate(r.date_received)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RequestsView({ requests, search, onSearch, statusFilter, onStatusFilter, onOpen }) {
  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <IconSearch className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
          <input
            type="search"
            placeholder="ابحث بالعنوان أو الرقم..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="input input-with-icon"
          />
        </div>
        <select className="select md:w-56" value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
          <option value="">جميع الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="assigned">محال إلى القسم</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="proofreading">قيد التدقيق</option>
          <option value="under_manager_review">مراجعة نهائية</option>
          <option value="delivered">مُسلَّم</option>
          <option value="completed">مكتمل</option>
        </select>
      </div>

      {requests.length === 0 ? (
        <div className="card">
          <EmptyState title="لا توجد طلبات مطابقة" description="جرّب تعديل الفلاتر أو ابدأ بطلب جديد" />
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العنوان</th>
                <th>القسم</th>
                <th>تاريخ التقديم</th>
                <th>الحالة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} onClick={() => onOpen(r)} className="cursor-pointer">
                  <td className="font-mono text-xs" dir="ltr">{r.id}</td>
                  <td className="font-semibold max-w-md truncate">{r.title}</td>
                  <td>{r.assigned_department || <span className="text-[var(--color-navy-400)]">—</span>}</td>
                  <td className="text-xs text-[var(--color-navy-600)]">{formatDate(r.date_received)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><button className="btn-ghost btn-sm">عرض</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CreateRequestModal({ open, onClose, onCreated, defaultCommittees }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [purpose, setPurpose] = useState('oversight')
  const [committees, setCommittees] = useState([])
  const [canShare, setCanShare] = useState(false)
  const [confidentiality, setConfidentiality] = useState('public')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  // اللجان الافتراضية عبر ref لا كتبعية للـ effect: الأب يعيد الرندر كل 30 ثانية
  // (استطلاع الطلبات) ويُنشئ مصفوفة defaultCommittees جديدة في كل مرة. لو كانت
  // تبعيةً للـ effect لأعادت التهيئة ومسحت ما يكتبه المستخدم أثناء ملء النموذج،
  // فيجد العنوان فارغاً عند الضغط ويُطلب منه ثانيةً.
  const defaultCommitteesRef = useRef(defaultCommittees)
  defaultCommitteesRef.current = defaultCommittees

  // إعادة التهيئة عند فتح النافذة فقط — لا عند كل إعادة رندر للأب
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setPurpose('oversight')
      const dc = defaultCommitteesRef.current
      setCommittees(Array.isArray(dc) ? dc.filter((c) => COMMITTEES.includes(c)) : [])
      setCanShare(false)
      setConfidentiality('public')
    }
  }, [open])

  const toggleCommittee = (c) => {
    setCommittees((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (title.length < 5) return toast.error('العنوان قصير جداً')
    if (committees.length === 0) return toast.error('يرجى اختيار لجنة واحدة على الأقل')
    setBusy(true)
    try {
      // نرسل اللجنة الأولى كرئيسية (للتوافق). الـ backend الحالي يخزن committee واحدة
      // عدة لجان للطلب تُمثَّل في الحقل النصي مفصولة بفاصلة
      await api.createRequest({
        title, description, purpose,
        committee: committees.join('، '),
        can_share: canShare,
        confidentiality,
      })
      onCreated()
    } catch (err) {
      toast.error(err.message || 'فشل تقديم الطلب')
    } finally { setBusy(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تقديم طلب بحثي جديد"
      footer={
        <>
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button form="req-form" type="submit" disabled={busy} className="btn-gold">
            {busy ? 'جاري التقديم...' : 'تقديم الطلب'}
          </button>
        </>
      }
    >
      <form id="req-form" onSubmit={submit} className="space-y-4">
        {/* تنبيه إلزامي: كل بحث في طلب مستقل (req.md - بوابة النواب) */}
        <div className="flex items-start gap-2 p-3 rounded-lg border-2 border-[var(--color-danger-600)] bg-[var(--color-danger-50)]">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-danger-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm font-bold text-[var(--color-danger-700)]">
            يُرجى كتابة كل بحث في طلب واحد منفصل عن الآخر — لا تجمع أكثر من موضوع بحثي في طلب واحد.
          </p>
        </div>

        <div className="form-group">
          <label className="label label-required">عنوان البحث</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" placeholder="مثال: دراسة حول الأثر الاقتصادي لقانون..." />
        </div>
        <div className="form-group">
          <label className="label">وصف تفصيلي</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" rows={5} placeholder="اشرح هدف البحث ونطاقه والمنهجية المطلوبة..." />
          <p className="form-hint">كلما كان الوصف أوضح، كانت نتيجة البحث أدق</p>
        </div>
        <div className="form-group">
          <label className="label label-required">اللجان النيابية (يمكن اختيار أكثر من لجنة)</label>
          <p className="form-hint mb-2">
            عدد المختارة: <strong>{committees.length}</strong> من أصل {COMMITTEES.length}
          </p>
          <div className="max-h-64 overflow-y-auto border border-[var(--color-border)] rounded-lg p-2 space-y-1 bg-white">
            {COMMITTEES.map((c) => {
              const checked = committees.includes(c)
              return (
                <label key={c} className={`flex items-start gap-2 p-2 rounded cursor-pointer transition ${
                  checked ? 'bg-[var(--color-gold-50)] border border-[var(--color-gold-300)]' : 'hover:bg-[var(--color-surface-soft)]'
                }`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleCommittee(c)} className="mt-0.5 w-4 h-4 flex-shrink-0" />
                  <span className="text-sm flex-1">{c}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="form-group">
          <label className="label label-required">الغرض من البحث</label>
          <select className="select" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="oversight">رقابي</option>
            <option value="legislative">تشريعي</option>
            <option value="other">أخرى</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label label-required">تصنيف البحث</label>
          <p className="form-hint mb-2">يحدد مسار التسليم: البحث العام يُسلَّم عبر رئيس القسم، وذو الخصوصية يُسلَّم عبر مدير الدائرة</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {Object.entries(CONFIDENTIALITY_LABELS).map(([value, label]) => {
              const checked = confidentiality === value
              const danger = value === 'confidential'
              return (
                <label
                  key={value}
                  className={`flex-1 cursor-pointer p-3 rounded-lg border-2 transition ${
                    checked
                      ? danger
                        ? 'border-[var(--color-danger-600)] bg-[var(--color-danger-50)]'
                        : 'border-[var(--color-success-600)] bg-[var(--color-success-50)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-surface-soft)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="confidentiality"
                    value={value}
                    checked={checked}
                    onChange={(e) => setConfidentiality(e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-semibold text-sm">{label}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="form-group p-4 rounded-xl bg-[var(--color-gold-50)] border border-[var(--color-gold-200)]">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={canShare}
              onChange={(e) => setCanShare(e.target.checked)}
              className="mt-1 w-4 h-4"
            />
            <div>
              <p className="font-semibold text-sm text-[var(--color-navy-900)]">هل توافق على نشر أو توزيع الخدمة البحثية؟</p>
              <p className="text-xs text-[var(--color-navy-600)] mt-0.5">عند الموافقة، يحق للدائرة أرشفة ومشاركة البحث مع أعضاء مجلس النواب</p>
            </div>
          </label>
        </div>
      </form>
    </Modal>
  )
}

function StageTracker({ status, lettersCount = 0 }) {
  const current = getRequestStage(status, lettersCount)
  const currentIdx = REQUEST_STAGES.findIndex((s) => s.key === current.key)

  return (
    <div className="card p-4">
      <h4 className="font-bold text-sm mb-4 text-[var(--color-navy-800)]">المرحلة الحالية للطلب</h4>
      <div className="space-y-2">
        {REQUEST_STAGES.map((stage, i) => {
          const reached = i <= currentIdx
          const isCurrent = i === currentIdx
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                isCurrent
                  ? 'bg-[var(--color-gold-500)] text-[var(--color-navy-950)] ring-4 ring-[var(--color-gold-200)]'
                  : reached
                    ? 'bg-[var(--color-success-600)] text-white'
                    : 'bg-[var(--color-surface-soft)] text-[var(--color-navy-400)] border border-[var(--color-border)]'
              }`}>
                {reached && !isCurrent ? '✓' : i + 1}
              </div>
              <span className={`text-sm ${isCurrent ? 'font-bold text-[var(--color-navy-900)]' : reached ? 'text-[var(--color-navy-700)]' : 'text-[var(--color-navy-400)]'}`}>
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RequestDetailModal({ request, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const reload = () => {
    if (!request) return
    api.getRequest(request.id).then((r) => { if (r.success) setDetail(r.data) }).catch(() => {})
    onChanged?.()
  }

  useEffect(() => {
    if (!request) return
    let cancelled = false
    setLoading(true)
    api.getRequest(request.id)
      .then((r) => { if (!cancelled && r.success) setDetail(r.data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request])

  useEffect(() => {
    if (!request) setDetail(null)
  }, [request])

  if (!request) return null
  const d = detail || request

  return (
    <Modal open={!!request} onClose={onClose} title={`تفاصيل الطلب ${request.id}`} size="lg">
      {loading ? <PageLoader /> : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[var(--color-navy-900)]">{d.title}</h3>
              <p className="text-sm text-[var(--color-navy-600)] mt-1">{d.description || 'لا يوجد وصف'}</p>
            </div>
            <StatusBadge status={d.status} />
          </div>

          {/* عرض المراحل التفصيلية للنائب (نقطة 5 من بوابة النواب) */}
          <StageTracker status={d.status} lettersCount={d.official_letters_count || 0} />

          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--color-surface-soft)] rounded-xl">
            <Field label="اللجنة" value={d.committee} />
            <Field label="الغرض" value={PURPOSE_LABELS[d.purpose] || '—'} />
            <Field label="القسم/الأقسام" value={
              d.assigned_departments && d.assigned_departments.length > 1
                ? `${d.assigned_departments.length} أقسام`
                : (d.assigned_department || '—')
            } />
            <Field label="تصنيف البحث" value={CONFIDENTIALITY_LABELS[d.confidentiality] || 'عام'} />
            <Field label="موافقة على النشر" value={d.can_share ? '✓ نعم' : '✗ لا'} />
            <Field label="تاريخ التقديم" value={formatDate(d.date_received)} />
            <Field label="الموعد النهائي" value={formatDate(d.deadline)} />
            {d.delivered_to_deputy_date && (
              <Field label="تم التسليم في" value={formatDate(d.delivered_to_deputy_date)} />
            )}
          </div>

          {d.confirmation && (
            <div className="card p-4">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-800)]">تفاصيل الإعداد</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Field label="نوع الخدمة" value={d.confirmation.service_type} />
                <Field label="التصنيف" value={d.confirmation.classification} />
                <Field label="مدة الإنجاز" value={`${d.confirmation.completion_days} يوم`} />
              </div>
            </div>
          )}

          {/* مخرَج الطلب: كان النائب لا يستطيع تنزيل بحثه إطلاقاً */}
          <ResearchFiles
            files={d.files}
            title="ملف البحث المُسلَّم"
            emptyText={['delivered', 'completed'].includes(d.status)
              ? 'لم يُرفق ملف بهذا البحث — راجع دائرة البحوث'
              : 'سيظهر ملف البحث هنا فور تسليمه'}
          />

          <Discussion
            entityType="request"
            entityId={d.id}
            notes={d.notes || []}
            onAdded={reload}
            placeholder="استفسار أو توضيح إضافي حول طلبك..."
          />

          {d.status === 'pending' && (
            <div className="card p-4 bg-[var(--color-danger-50)] border-[var(--color-danger-600)]">
              <h4 className="font-bold text-sm mb-1 text-[var(--color-navy-900)]">سحب الطلب</h4>
              <p className="text-xs text-[var(--color-navy-700)] mb-3">
                يمكنك سحب الطلب ما دام لم يُحَل إلى قسم بعد. بعد الإحالة راجع مدير الدائرة.
              </p>
              <button
                onClick={async () => {
                  if (!window.confirm('هل تريد سحب هذا الطلب؟ لا يمكن التراجع.')) return
                  setBusy(true)
                  try {
                    await api.withdrawRequest(d.id)
                    toast.success('تم سحب الطلب')
                    onChanged?.()
                    onClose()
                  } catch (e) { toast.error(e.message) }
                  finally { setBusy(false) }
                }}
                disabled={busy}
                className="btn-danger w-full"
              >
                {busy ? 'جاري السحب...' : 'سحب الطلب'}
              </button>
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
      <p className="text-sm font-medium text-[var(--color-navy-900)]">{value}</p>
    </div>
  )
}
