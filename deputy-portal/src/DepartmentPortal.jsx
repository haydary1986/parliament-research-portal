import { useEffect, useState } from 'react'
import PortalLayout from './components/layout/PortalLayout'
import StatusBadge from './components/ui/StatusBadge'
import StatCard from './components/ui/StatCard'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import { PageLoader } from './components/ui/Spinner'
import { useToast } from './components/ui/Toast'
import {
  IconDashboard, IconRequests, IconResearch, IconProofread, IconUsers,
  IconDocument, IconClock, IconCheck, IconPlus, IconSearch,
} from './components/icons/Icons'
import { formatDate, formatDateTime, SERVICE_TYPES, CLASSIFICATIONS } from './lib/format'
import * as api from './api'

export default function DepartmentPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [requests, setRequests] = useState([])
  const [researchTasks, setResearchTasks] = useState([])
  const [proofreaders, setProofreaders] = useState([])
  const [researchers, setResearchers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRequest, setActiveRequest] = useState(null)
  const [activeTask, setActiveTask] = useState(null)
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const toast = useToast()

  const refresh = async () => {
    setLoading(true)
    try {
      const [r, t, prf, res] = await Promise.all([
        api.getRequests({ limit: 200 }),
        api.getResearchTasks(),
        api.getUsers({ role: 'proofreader', limit: 50 }),
        api.getUsers({ role: 'researcher', department: user?.department_id || '', limit: 50 }),
      ])
      if (r.success) setRequests(r.data || [])
      if (t.success) setResearchTasks(t.data || [])
      if (prf.success) setProofreaders(prf.data || [])
      if (res.success) setResearchers(res.data || [])
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(() => {
      // silent refresh - فقط إعادة جلب البيانات
      api.getRequests({ limit: 200 }).then((r) => { if (r.success) setRequests(r.data || []) }).catch(() => {})
      api.getResearchTasks().then((r) => { if (r.success) setResearchTasks(r.data || []) }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [user?.department_id])

  const incoming = requests.filter((r) => r.status === 'assigned')
  const inProgress = requests.filter((r) => ['confirmed', 'in_progress', 'review', 'pending_dept_review', 'proofreading'].includes(r.status))
  const reviewing = requests.filter((r) => r.status === 'pending_dept_review' || r.status === 'pending_dept_send')

  const navItems = [
    { key: 'dashboard', label: 'لوحة المعلومات', icon: IconDashboard },
    { key: 'incoming', label: 'طلبات واردة', icon: IconClock, badge: incoming.length },
    { key: 'reviewing', label: 'بانتظار قراري', icon: IconProofread, badge: reviewing.length },
    { key: 'in_progress', label: 'قيد التنفيذ', icon: IconDocument },
    { key: 'research', label: 'مهام البحث', icon: IconResearch },
    { key: 'team', label: 'فريق القسم', icon: IconUsers },
  ]

  // اسم القسم من أحد الباحثين أو من قائمة افتراضية
  const deptName = (() => {
    if (!user?.department_id) return ''
    const map = {
      research: 'قسم البحوث',
      budget_research: 'قسم بحوث الموازنة',
      legal_studies: 'قسم الدراسات القانونية',
      parliament_library: 'قسم المكتبة النيابية',
      research_support: 'قسم الدعم البحثي',
    }
    return map[user.department_id] || user.department_id
  })()

  const meta = {
    dashboard: { title: deptName ? `لوحة ${deptName}` : 'لوحة معلومات القسم', subtitle: `أهلاً ${user?.name || ''} — متابعة عمل ${deptName}` },
    incoming:  { title: `الطلبات الواردة لـ ${deptName}`, subtitle: 'طلبات بحاجة إلى تأكيد وتعيين باحث' },
    reviewing: { title: 'البحوث بانتظار قرارك', subtitle: 'بحوث مسلَّمة من الباحث للمراجعة أو جاهزة للإرسال للنائب' },
    in_progress: { title: 'الطلبات الجارية', subtitle: 'طلبات بدأ العمل عليها' },
    research: { title: 'مهام البحث', subtitle: 'كل المهام البحثية للقسم' },
    team: { title: `فريق ${deptName}`, subtitle: 'الباحثون وإدارة الفريق' },
  }

  return (
    <PortalLayout
      user={user}
      portalLabel="رئيس القسم"
      navItems={navItems}
      activeKey={tab}
      onNavigate={setTab}
      onLogout={onLogout}
      title={meta[tab].title}
      subtitle={meta[tab].subtitle}
      actions={tab === 'team' && (
        <button onClick={() => setCreateUserOpen(true)} className="btn-gold">
          <IconPlus className="w-4 h-4" />
          <span>إضافة عضو</span>
        </button>
      )}
    >
      {loading ? <PageLoader /> : (
        <>
          {tab === 'dashboard' && <DeptDashboard requests={requests} tasks={researchTasks} researchers={researchers} deptName={deptName} />}
          {tab === 'incoming' && <RequestsTable rows={incoming} onOpen={setActiveRequest} emptyText="لا توجد طلبات واردة" />}
          {tab === 'reviewing' && <RequestsTable rows={reviewing} onOpen={setActiveRequest} emptyText="لا توجد بحوث بانتظار قرارك" />}
          {tab === 'in_progress' && <RequestsTable rows={inProgress} onOpen={setActiveRequest} emptyText="لا توجد طلبات قيد التنفيذ" />}
          {tab === 'research' && <ResearchTasksTable rows={researchTasks} onOpen={setActiveTask} />}
          {tab === 'team' && <TeamView researchers={researchers} />}
        </>
      )}

      <ConfirmRequestModal
        request={activeRequest}
        researchers={researchers}
        proofreaders={proofreaders}
        onClose={() => setActiveRequest(null)}
        onChanged={() => { setActiveRequest(null); refresh() }}
      />
      <ResearchTaskModal
        task={activeTask}
        proofreaders={proofreaders}
        onClose={() => setActiveTask(null)}
        onChanged={() => { setActiveTask(null); refresh() }}
      />
      <CreateUserModal
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onCreated={() => { setCreateUserOpen(false); refresh(); toast.success('تم إضافة المستخدم') }}
      />
    </PortalLayout>
  )
}

function DeptDashboard({ requests, tasks, researchers, deptName }) {
  const stats = {
    incoming: requests.filter((r) => r.status === 'assigned').length,
    active: tasks.filter((t) => ['assigned', 'in_progress'].includes(t.status)).length,
    waitingReview: requests.filter((r) => r.status === 'pending_dept_review').length,
    proofread: requests.filter((r) => r.status === 'proofreading').length,
    waitingSend: requests.filter((r) => r.status === 'pending_dept_send').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }
  return (
    <div className="space-y-6">
      {deptName && (
        <div className="card p-4 bg-gradient-to-l from-[var(--color-navy-50)] to-white border-r-4 border-r-[var(--color-gold-500)]">
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-navy-500)] font-semibold">القسم</p>
          <h2 className="text-xl font-bold text-[var(--color-navy-900)] mt-0.5">{deptName}</h2>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="طلبات واردة" value={stats.incoming} tone="warning" icon={<IconClock />} />
        <StatCard label="قيد البحث" value={stats.active} tone="info" icon={<IconResearch />} />
        <StatCard label="بانتظار قراري" value={stats.waitingReview} tone="warning" icon={<IconProofread />} />
        <StatCard label="قيد التدقيق" value={stats.proofread} tone="navy" icon={<IconProofread />} />
        <StatCard label="جاهز للإرسال" value={stats.waitingSend} tone="info" icon={<IconCheck />} />
        <StatCard label="مكتمل" value={stats.completed} tone="success" icon={<IconCheck />} />
      </div>

      <div className="card">
        <div className="card-header"><h3 className="card-title">باحثو القسم</h3></div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {researchers.map((r) => {
            const active = tasks.filter((t) => t.researcher_id === r.id && !['completed', 'returned'].includes(t.status)).length
            return (
              <div key={r.id} className="p-4 rounded-xl border border-[var(--color-border)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-navy-50)] text-[var(--color-navy-700)] flex items-center justify-center font-bold">
                  {r.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--color-navy-900)] truncate">{r.name}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">{r.specialization || 'باحث'}</p>
                </div>
                <div className="text-left">
                  <p className="text-lg font-bold text-[var(--color-gold-700)]">{active}</p>
                  <p className="text-[10px] text-[var(--color-navy-500)]">مهمة نشطة</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RequestsTable({ rows, onOpen, emptyText }) {
  if (rows.length === 0) return <div className="card"><EmptyState title={emptyText} /></div>
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>العنوان</th>
            <th>النائب</th>
            <th>تاريخ الإحالة</th>
            <th>الحالة</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const allDepts = r.assigned_departments || []
            const sharedWith = allDepts.length > 1
            return (
              <tr key={r.id} onClick={() => onOpen(r)} className="cursor-pointer">
                <td className="font-mono text-xs" dir="ltr">{r.id}</td>
                <td className="font-semibold max-w-md truncate">
                  <div className="flex items-center gap-2">
                    <span>{r.title}</span>
                    {sharedWith && (
                      <span className="badge-gold text-[10px]" title={`مشترك مع ${allDepts.length - 1} قسم آخر`}>
                        + مشترك
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-sm">{r.deputy_name}</td>
                <td className="text-xs">{formatDate(r.referral_date || r.date_received)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td><button className="btn-ghost btn-sm">إجراء</button></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ResearchTasksTable({ rows, onOpen }) {
  const [search, setSearch] = useState('')
  const filtered = rows.filter((r) => !search || r.request_title?.toLowerCase().includes(search.toLowerCase()) || r.id?.toLowerCase().includes(search.toLowerCase()))
  if (rows.length === 0) return <div className="card"><EmptyState title="لا توجد مهام بحث" /></div>
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="relative">
          <IconSearch className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." className="input input-with-icon" />
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>عنوان البحث</th>
              <th>رقم المهمة</th>
              <th>الباحث</th>
              <th>تاريخ التعيين</th>
              <th>الموعد النهائي</th>
              <th>المدة</th>
              <th>الحالة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} onClick={() => onOpen(t)} className="cursor-pointer">
                <td className="font-semibold max-w-xs" title={t.request_title}>
                  <div className="line-clamp-2">{t.request_title || <span className="text-[var(--color-navy-400)]">—</span>}</div>
                </td>
                <td className="font-mono text-xs whitespace-nowrap" dir="ltr">{t.id}</td>
                <td className="text-sm">{t.researcher_name}</td>
                <td className="text-xs whitespace-nowrap">{formatDate(t.date_assigned)}</td>
                <td className="text-xs whitespace-nowrap">{formatDate(t.deadline)}</td>
                <td className="text-xs whitespace-nowrap">{t.completion_days ? `${t.completion_days} يوم` : '—'}</td>
                <td><StatusBadge status={t.status} /></td>
                <td><button className="btn-ghost btn-sm">عرض</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TeamView({ researchers }) {
  if (researchers.length === 0) return <div className="card"><EmptyState title="لا يوجد أعضاء بعد" description="اضغط 'إضافة عضو' لإنشاء حساب جديد" /></div>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {researchers.map((r) => (
        <div key={r.id} className="card p-5 card-hover">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-navy-600)] to-[var(--color-navy-800)] text-white flex items-center justify-center font-bold">
              {r.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-[var(--color-navy-900)] truncate">{r.name}</h4>
              <p className="text-xs text-[var(--color-navy-500)] mt-0.5">{r.specialization || '—'}</p>
              <p className="text-xs text-[var(--color-navy-400)] font-mono mt-1" dir="ltr">{r.email}</p>
              <div className="mt-2">
                <span className={`badge ${r.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                  {r.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ConfirmRequestModal({ request, researchers, proofreaders, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0])
  const [classification, setClassification] = useState(CLASSIFICATIONS[0])
  const [days, setDays] = useState(30)
  const [selectedResearchers, setSelectedResearchers] = useState([])
  const [busy, setBusy] = useState(false)
  // مراجعة رئيس القسم
  const [reviewDecision, setReviewDecision] = useState('approve')
  const [reviewNotes, setReviewNotes] = useState('')
  const [reviewProofreader, setReviewProofreader] = useState('')
  const toast = useToast()

  useEffect(() => {
    if (!request) { setDetail(null); return }
    setLoading(true)
    setSelectedResearchers([])
    setReviewNotes('')
    setReviewProofreader('')
    api.getRequest(request.id).then((r) => { if (r.success) setDetail(r.data) }).catch(() => {}).finally(() => setLoading(false))
  }, [request])

  if (!request) return null
  const d = detail || request

  const toggleResearcher = (id) => {
    setSelectedResearchers((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  const confirm = async () => {
    if (selectedResearchers.length === 0) return toast.error('اختر باحثاً واحداً على الأقل')
    setBusy(true)
    try {
      await api.confirmRequest(d.id, {
        service_type: serviceType,
        classification,
        completion_days: parseInt(days),
        researcher_ids: selectedResearchers,
      })
      toast.success(selectedResearchers.length > 1 ? `تم تعيين ${selectedResearchers.length} باحثين` : 'تم التأكيد والتعيين')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const submitDeptReview = async () => {
    if (reviewDecision === 'approve' && !reviewProofreader) {
      return toast.error('اختر المدقق اللغوي')
    }
    setBusy(true)
    try {
      await api.deptHeadReview(d.id, reviewDecision, parseInt(reviewProofreader) || 0, reviewNotes)
      toast.success('تم تسجيل القرار')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const sendToDeputy = async () => {
    if (!confirm) return
    setBusy(true)
    try {
      await api.deptSendToDeputy(d.id)
      toast.success('تم إرسال البحث للنائب')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={!!request} onClose={onClose} title={`الطلب ${request.id}`} size="lg">
      {loading ? <PageLoader /> : (
        <div className="space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-lg font-bold text-[var(--color-navy-900)]">{d.title}</h3>
              <StatusBadge status={d.status} />
            </div>
            <p className="text-sm text-[var(--color-navy-600)]">{d.description}</p>
          </div>

          {/* الأقسام التي يشاركها الطلب */}
          {d.assigned_departments && d.assigned_departments.length > 1 && (
            <div className="card p-3 bg-blue-50 border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-2">
                ℹ️ هذا الطلب مُحال إلى {d.assigned_departments.length} أقسام:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {d.assigned_departments.map((deptId) => (
                  <span key={deptId} className={`badge ${deptId === d.assigned_department ? 'badge-gold' : 'badge-info'} text-[11px]`}>
                    {deptId}
                  </span>
                ))}
              </div>
            </div>
          )}

          {d.status === 'assigned' && (
            <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">تأكيد الطلب وتعيين الباحث/الباحثين</h4>
              <p className="text-xs text-[var(--color-navy-600)] mb-3">يمكن تعيين أكثر من باحث للعمل على نفس الطلب</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label label-required">نوع الخدمة</label>
                  <select className="select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                    {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label label-required">التصنيف</label>
                  <select className="select" value={classification} onChange={(e) => setClassification(e.target.value)}>
                    {CLASSIFICATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label label-required">مدة الإنجاز (أيام)</label>
                  <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(e.target.value)} className="input" />
                </div>
              </div>
              <label className="label label-required">الباحث/الباحثون</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 max-h-56 overflow-y-auto">
                {researchers.map((r) => {
                  const checked = selectedResearchers.includes(r.id)
                  return (
                    <label key={r.id} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition ${
                      checked ? 'border-[var(--color-gold-500)] bg-white' : 'border-[var(--color-border)] bg-white/50 hover:bg-white'
                    }`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleResearcher(r.id)} className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{r.name}</p>
                        <p className="text-[10px] text-[var(--color-navy-500)]">{r.specialization || 'باحث'}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
              <button onClick={confirm} disabled={busy || selectedResearchers.length === 0} className="btn-primary w-full">
                {busy ? 'جاري...' : `تأكيد وتعيين ${selectedResearchers.length > 0 ? `(${selectedResearchers.length})` : ''}`}
              </button>
            </div>
          )}

          {/* مراجعة رئيس القسم للبحث المسلَّم (workflow جديد) */}
          {d.status === 'pending_dept_review' && (
            <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">مراجعة البحث المسلَّم</h4>
              <p className="text-xs text-[var(--color-navy-600)] mb-3">الباحث سلّم البحث — قرر إن كان جاهزاً للتدقيق اللغوي أو يحتاج تعديل</p>
              <div className="flex gap-2 mb-3">
                <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 ${reviewDecision === 'approve' ? 'border-[var(--color-success-600)] bg-emerald-50' : 'border-[var(--color-border)] bg-white'}`}>
                  <input type="radio" name="dr" value="approve" checked={reviewDecision === 'approve'} onChange={(e) => setReviewDecision(e.target.value)} className="sr-only" />
                  <span className="font-semibold text-sm">✓ اعتماد + إرسال للتدقيق</span>
                </label>
                <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 ${reviewDecision === 'reject' ? 'border-[var(--color-danger-600)] bg-red-50' : 'border-[var(--color-border)] bg-white'}`}>
                  <input type="radio" name="dr" value="reject" checked={reviewDecision === 'reject'} onChange={(e) => setReviewDecision(e.target.value)} className="sr-only" />
                  <span className="font-semibold text-sm">✗ رفض وإرجاع للباحث</span>
                </label>
              </div>
              {reviewDecision === 'approve' && (
                <div className="mb-3">
                  <label className="label label-required">المدقق اللغوي</label>
                  <select className="select" value={reviewProofreader} onChange={(e) => setReviewProofreader(e.target.value)}>
                    <option value="">اختر المدقق...</option>
                    {proofreaders?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <textarea className="textarea mb-3" rows={2} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="ملاحظات (اختياري)" />
              <button onClick={submitDeptReview} disabled={busy} className={reviewDecision === 'approve' ? 'btn-success w-full' : 'btn-danger w-full'}>
                {busy ? 'جاري...' : 'تأكيد القرار'}
              </button>
            </div>
          )}

          {/* إرسال للنائب بعد اعتماد المعاون */}
          {d.status === 'pending_dept_send' && (
            <div className="card p-4 bg-emerald-50 border-emerald-200">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">إرسال البحث للنائب</h4>
              <p className="text-xs text-[var(--color-navy-600)] mb-3">
                المعاون اعتمد البحث نهائياً. يرجى إرساله للنائب طالب الخدمة.
              </p>
              <button onClick={sendToDeputy} disabled={busy} className="btn-success w-full">
                <IconCheck className="w-4 h-4" />
                <span>{busy ? 'جاري الإرسال...' : 'إرسال للنائب'}</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--color-surface-soft)] rounded-xl">
            <Field label="النائب" value={d.deputy_name} />
            <Field label="اللجنة" value={d.committee} />
            <Field label="تاريخ التقديم" value={formatDate(d.date_received)} />
            <Field label="تاريخ الإحالة" value={formatDate(d.referral_date)} />
          </div>

          {d.notes && d.notes.length > 0 && (
            <div>
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-800)]">الملاحظات</h4>
              <div className="space-y-2">
                {d.notes.map((n) => (
                  <div key={n.id} className="p-3 bg-[var(--color-surface-soft)] rounded-lg border border-[var(--color-border)]">
                    <div className="flex justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm">{n.user_name}</span>
                      <span className="text-[10px] text-[var(--color-navy-500)]">{formatDateTime(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-[var(--color-navy-700)]">{n.content}</p>
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

function ResearchTaskModal({ task, proofreaders, onClose, onChanged }) {
  const [proofId, setProofId] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => { setProofId('') }, [task])
  if (!task) return null

  const sendToProofreading = async () => {
    if (!proofId) return toast.error('اختر المدقق')
    setBusy(true)
    try {
      await api.createProofreadingTask({ research_task_id: task.id, proofreader_id: parseInt(proofId) })
      toast.success('تم إرسال البحث للتدقيق')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={!!task} onClose={onClose} title={`المهمة ${task.id}`} size="md">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--color-navy-900)]">{task.request_title}</h3>
          <StatusBadge status={task.status} />
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 bg-[var(--color-surface-soft)] rounded-xl">
          <Field label="الباحث" value={task.researcher_name} />
          <Field label="تاريخ التعيين" value={formatDate(task.date_assigned)} />
          <Field label="الموعد النهائي" value={formatDate(task.deadline)} />
          <Field label="مدة الإنجاز" value={`${task.completion_days || 0} يوم`} />
        </div>

        {task.status === 'submitted' && (
          <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
            <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">إرسال للتدقيق اللغوي</h4>
            <div className="space-y-3">
              <select className="select" value={proofId} onChange={(e) => setProofId(e.target.value)}>
                <option value="">اختر المدقق...</option>
                {proofreaders.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={sendToProofreading} disabled={busy || !proofId} className="btn-primary w-full">
                {busy ? 'جاري...' : 'إرسال للتدقيق'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function CreateUserModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('researcher')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (open) { setName(''); setEmail(''); setPassword(''); setRole('researcher') }
  }, [open])

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    setBusy(true)
    try {
      await api.createUser({ name, email, password, role })
      onCreated()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة عضو جديد للقسم"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button form="cu-form" type="submit" disabled={busy} className="btn-gold">{busy ? 'جاري...' : 'إنشاء'}</button>
        </>
      }
    >
      <form id="cu-form" onSubmit={submit} className="space-y-4">
        <div className="form-group">
          <label className="label label-required">الاسم الكامل</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
        </div>
        <div className="form-group">
          <label className="label label-required">البريد الإلكتروني</label>
          <input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required className="input text-right" />
        </div>
        <div className="form-group">
          <label className="label label-required">كلمة المرور الأولية</label>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input" />
          <p className="form-hint">يمكن للمستخدم تغييرها لاحقاً</p>
        </div>
        <div className="form-group">
          <label className="label label-required">الدور</label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="researcher">باحث</option>
            <option value="proofreader">مدقق لغوي</option>
          </select>
        </div>
      </form>
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
