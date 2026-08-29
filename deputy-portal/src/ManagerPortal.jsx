import { useEffect, useState } from 'react'
import PortalLayout from './components/layout/PortalLayout'
import StatusBadge from './components/ui/StatusBadge'
import StatCard from './components/ui/StatCard'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import { PageLoader } from './components/ui/Spinner'
import ResearchFiles from './components/ui/ResearchFiles'
import Discussion from './components/ui/Discussion'
import RequestTimeline from './components/ui/RequestTimeline'
import OperationsReport from './components/reports/OperationsReport'
import { useToast } from './components/ui/Toast'
import { useConfirm } from './components/ui/ConfirmDialog'
import {
  IconDashboard, IconRequests, IconDocument, IconClock, IconCheck, IconActivity,
  IconSearch, IconBuilding, IconArchive, IconShield, IconUsers,
} from './components/icons/Icons'
import {
  formatDate, PURPOSE_LABELS, MANAGER_DASHBOARD_LABELS,
  CONFIDENTIALITY_LABELS, REQUESTER_TYPES, deadlineInfo,
} from './lib/format'
import { COMMITTEES } from './lib/committees'
import * as api from './api'

export default function ManagerPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [requests, setRequests] = useState([])
  const [departments, setDepartments] = useState([])
  const [researchers, setResearchers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeRequest, setActiveRequest] = useState(null)
  const toast = useToast()

  const refresh = async () => {
    setLoading(true)
    try {
      const [r, d, s, res] = await Promise.all([
        api.getRequests({ limit: 200 }),
        api.getDepartments(),
        api.getDashboardStats(),
        api.getUsers({ role: 'researcher', limit: 200 }),
      ])
      if (r.success) setRequests(r.data || [])
      if (d.success) setDepartments(d.data || [])
      if (s.success) setStats(s.data)
      if (res.success) setResearchers(res.data || [])
    } catch (e) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(() => {
      api.getRequests({ limit: 200 }).then((r) => { if (r.success) setRequests(r.data || []) }).catch(() => {})
      api.getDashboardStats().then((r) => { if (r.success) setStats(r.data) }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const pending = requests.filter((r) => r.status === 'pending')
  const reviews = requests.filter((r) => r.status === 'under_manager_review')
  // بحوث ذات خصوصية اعتمدها المعاون وتنتظر إرسال مدير الدائرة للنائب
  const toSend = requests.filter((r) => r.status === 'pending_manager_send')

  const navItems = [
    { key: 'dashboard', label: 'لوحة المعلومات', icon: IconDashboard },
    { key: 'pending', label: 'طلبات قيد الإحالة', icon: IconClock, badge: pending.length },
    { key: 'to_send', label: 'بحوث للإرسال للنائب', icon: IconShield, badge: toSend.length },
    { key: 'all', label: 'جميع الطلبات', icon: IconRequests },
    { key: 'reports', label: 'التقارير والتصدير', icon: IconActivity },
    { key: 'departments', label: 'الأقسام', icon: IconBuilding },
    { key: 'archive', label: 'البحث في الأرشيف', icon: IconArchive },
  ]
  // تبويب المراجعات القديم يظهر فقط إن وُجدت طلبات عالقة في المسار السابق
  if (reviews.length > 0) {
    navItems.splice(3, 0, { key: 'reviews', label: 'مراجعات نهائية (قديم)', icon: IconCheck, badge: reviews.length })
  }

  const meta = {
    dashboard: { title: 'لوحة المعلومات', subtitle: 'نظرة عامة على عمل دائرة البحوث' },
    pending: { title: 'الطلبات قيد الإحالة', subtitle: 'طلبات بحاجة إلى إحالة لقسم أو إرجاع — يمكنك اقتراح باحث لرئيس القسم' },
    to_send: { title: 'بحوث بانتظار إرسالك للنائب', subtitle: 'بحوث ذات خصوصية وحساسية اعتمدها المعاون' },
    reviews: { title: 'المراجعات النهائية', subtitle: 'بحوث بانتظار الاعتماد النهائي قبل التسليم' },
    all: { title: 'جميع الطلبات', subtitle: 'سجل كامل لكل الطلبات في الدائرة' },
    reports: { title: 'التقارير التشغيلية', subtitle: 'أداء الأقسام والباحثين، الطلبات المتأخرة، وتصدير كامل البيانات' },
    departments: { title: 'أقسام الدائرة', subtitle: 'إدارة الأقسام البحثية' },
    archive: { title: 'الأرشيف الرقمي', subtitle: 'البحث في البحوث المكتملة المؤرشفة' },
  }

  return (
    <PortalLayout
      user={user}
      portalLabel="مدير الدائرة"
      navItems={navItems}
      activeKey={tab}
      onNavigate={setTab}
      onLogout={onLogout}
      title={meta[tab].title}
      subtitle={meta[tab].subtitle}
    >
      {loading ? <PageLoader /> : (
        <>
          {tab === 'dashboard' && <ManagerDashboard stats={stats} requests={requests} departments={departments} onOpen={setActiveRequest} />}
          {tab === 'pending' && <RequestsTable rows={pending} departments={departments} onOpen={setActiveRequest} emptyText="لا توجد طلبات قيد الإحالة" />}
          {tab === 'to_send' && <RequestsTable rows={toSend} departments={departments} onOpen={setActiveRequest} emptyText="لا توجد بحوث بانتظار إرسالك" />}
          {tab === 'reviews' && <RequestsTable rows={reviews} departments={departments} onOpen={setActiveRequest} emptyText="لا توجد مراجعات نهائية معلقة" />}
          {tab === 'all' && <RequestsTable rows={requests} departments={departments} onOpen={setActiveRequest} withFilter />}
          {tab === 'reports' && <OperationsReport />}
          {tab === 'departments' && <DepartmentsView departments={departments} requests={requests} />}
          {tab === 'archive' && <ArchiveSearch />}
        </>
      )}

      <RequestDetailModal
        request={activeRequest}
        departments={departments}
        researchers={researchers}
        onClose={() => setActiveRequest(null)}
        onChanged={() => { setActiveRequest(null); refresh() }}
      />
    </PortalLayout>
  )
}

function ManagerDashboard({ stats, requests, departments, onOpen }) {
  const s = stats || {}
  const recent = requests.slice(0, 6)
  // العنوانات الجديدة (req.md - بوابة المدير نقطة 2):
  // قيد الانتظار → انتظار التوجيه، قيد التنفيذ → قيد الإعداد، مُرجَعة → لا يمكن التنفيذ
  const returnedCount = requests.filter((r) => r.status === 'returned_exists').length
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
        <StatCard label={MANAGER_DASHBOARD_LABELS.total} value={s.total_requests || 0} tone="navy" icon={<IconDocument />} />
        <StatCard label={MANAGER_DASHBOARD_LABELS.pending} value={s.pending_requests || 0} tone="warning" icon={<IconClock />} />
        <StatCard label={MANAGER_DASHBOARD_LABELS.in_progress} value={s.in_progress_count || 0} tone="info" icon={<IconActivity />} />
        <StatCard label={MANAGER_DASHBOARD_LABELS.completed} value={s.completed_requests || 0} tone="success" icon={<IconCheck />} />
        <StatCard label={MANAGER_DASHBOARD_LABELS.returned} value={returnedCount} tone="danger" icon={<IconClock />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="card-header"><h3 className="card-title">أحدث الطلبات</h3></div>
          {recent.length === 0 ? <EmptyState title="لا توجد طلبات" /> : (
            <div className="divide-y divide-[var(--color-border)]">
              {recent.map((r) => (
                <button key={r.id} onClick={() => onOpen(r)} className="w-full text-right p-4 hover:bg-[var(--color-surface-soft)] transition-colors flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-navy-50)] text-[var(--color-navy-700)] flex items-center justify-center flex-shrink-0">
                    <IconDocument className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-[var(--color-navy-500)]" dir="ltr">{r.id}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="font-semibold text-[var(--color-navy-900)] truncate">{r.title}</p>
                    <p className="text-xs text-[var(--color-navy-500)] mt-1">من {r.deputy_name} • {formatDate(r.date_received)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">حِمل الأقسام</h3></div>
          <div className="p-4 space-y-3">
            {departments.map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="w-2.5 h-10 rounded" style={{ background: d.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--color-navy-900)] truncate">{d.name}</p>
                  <p className="text-xs text-[var(--color-navy-500)]">{d.researcher_count} باحث</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-[var(--color-navy-900)]">{d.active_requests}</p>
                  <p className="text-[10px] text-[var(--color-navy-500)] uppercase">نشط</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RequestsTable({ rows, departments, onOpen, withFilter = false, emptyText = 'لا توجد بيانات' }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [committeeFilter, setCommitteeFilter] = useState('')
  const [overdueOnly, setOverdueOnly] = useState(false)

  const filtered = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    // القسم: رئيسي أو ضمن الإحالة متعددة الأقسام
    if (deptFilter && r.assigned_department !== deptFilter && !(r.assigned_departments || []).includes(deptFilter)) return false
    if (typeFilter && r.requester_type !== typeFilter) return false
    if (committeeFilter && !(r.committee || '').includes(committeeFilter)) return false
    if (overdueOnly && deadlineInfo(r.deadline, r.status)?.state !== 'overdue') return false
    if (search) {
      const q = search.toLowerCase()
      return r.title?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q) || r.deputy_name?.toLowerCase().includes(q)
    }
    return true
  })

  const activeFilters = statusFilter || deptFilter || typeFilter || committeeFilter || overdueOnly || search

  return (
    <div className="space-y-4">
      {withFilter && (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <IconSearch className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالعنوان أو الرقم أو الطالب..." className="input input-with-icon" />
            </div>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">جميع الحالات</option>
              <option value="pending">انتظار التوجيه</option>
              <option value="assigned">محال إلى القسم</option>
              <option value="in_progress">قيد الإعداد</option>
              <option value="pending_dept_review">مراجعة رئيس القسم</option>
              <option value="proofreading">قيد التدقيق اللغوي</option>
              <option value="pending_assistant">بانتظار المعاون</option>
              <option value="pending_dept_send">جاهز للإرسال</option>
              <option value="pending_manager_send">جاهز للإرسال (خصوصية)</option>
              <option value="delivered">مُسلَّم</option>
              <option value="completed">مكتمل</option>
              <option value="returned_exists">لا يمكن التنفيذ</option>
              <option value="rejected">مرفوض</option>
              <option value="withdrawn">مسحوب</option>
            </select>
            <select className="select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">جميع الأقسام</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">كل الجهات الطالبة</option>
              {Object.entries(REQUESTER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="select" value={committeeFilter} onChange={(e) => setCommitteeFilter(e.target.value)}>
              <option value="">كل اللجان</option>
              {COMMITTEES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 px-3 rounded-lg border border-[var(--color-border)] cursor-pointer select-none">
              <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium text-[var(--color-danger-700)]">المتأخّرة فقط</span>
            </label>
          </div>
          <div className="flex items-center justify-between text-xs text-[var(--color-navy-500)]">
            <span>عدد النتائج: <strong className="text-[var(--color-navy-800)]">{filtered.length}</strong> من {rows.length}</span>
            {activeFilters && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); setDeptFilter(''); setTypeFilter(''); setCommitteeFilter(''); setOverdueOnly(false) }}
                className="text-[var(--color-gold-700)] font-semibold hover:underline"
              >
                مسح الفلاتر
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card"><EmptyState title={emptyText} /></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>العنوان</th>
                <th>النائب</th>
                <th>القسم</th>
                <th>تاريخ التقديم</th>
                <th>الحالة</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const depts = r.assigned_departments || []
                const dispatchedDept = (() => {
                  if (depts.length === 0 && !r.assigned_department) return null
                  if (depts.length > 1) {
                    const first = departments.find((x) => x.id === depts[0])?.name || depts[0]
                    return (
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium">{first}</span>
                        <span className="badge-gold text-[10px] px-1.5 py-0.5">+{depts.length - 1}</span>
                      </span>
                    )
                  }
                  const single = depts[0] || r.assigned_department
                  return departments.find((x) => x.id === single)?.name || single
                })()
                return (
                  <tr key={r.id} onClick={() => onOpen(r)} className="cursor-pointer">
                    <td className="font-mono text-xs" dir="ltr">{r.id}</td>
                    <td className="font-semibold max-w-xs truncate">{r.title}</td>
                    <td className="text-sm">{r.deputy_name}</td>
                    <td className="text-sm">{dispatchedDept || <span className="text-[var(--color-navy-400)]">—</span>}</td>
                    <td className="text-xs text-[var(--color-navy-600)]">{formatDate(r.date_received)}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td><button className="btn-ghost btn-sm">إجراء</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DepartmentsView({ departments, requests }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {departments.map((d) => {
        const deptReqs = requests.filter((r) => r.assigned_department === d.id)
        return (
          <div key={d.id} className="card card-hover overflow-hidden">
            <div className="h-1.5" style={{ background: d.color }} />
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: d.color + '20', color: d.color }}>
                  <IconBuilding className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[var(--color-navy-900)]">{d.name}</h3>
                  <p className="text-xs text-[var(--color-navy-500)] mt-0.5">{d.head_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--color-border)]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--color-navy-900)]">{d.researcher_count}</p>
                  <p className="text-[10px] text-[var(--color-navy-500)] uppercase tracking-wider">باحث</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--color-gold-700)]">{d.active_requests}</p>
                  <p className="text-[10px] text-[var(--color-navy-500)] uppercase tracking-wider">نشط</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--color-navy-900)]">{deptReqs.length}</p>
                  <p className="text-[10px] text-[var(--color-navy-500)] uppercase tracking-wider">إجمالي</p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ArchiveSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const search = async (e) => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      const r = await api.searchArchive(q)
      if (r.success) setResults(r.data || [])
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="card p-4 flex gap-3">
        <div className="relative flex-1">
          <IconSearch className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في عناوين ووصف البحوث المؤرشفة..." className="input input-with-icon" />
        </div>
        <button type="submit" disabled={busy} className="btn-primary">{busy ? 'جاري البحث...' : 'بحث'}</button>
      </form>

      {results.length === 0 ? (
        <div className="card"><EmptyState title="ابحث في الأرشيف" description="البحث في عناوين البحوث المكتملة فقط" /></div>
      ) : (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.id} className="card p-4 card-hover">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-gold-50)] text-[var(--color-gold-700)] flex items-center justify-center flex-shrink-0">
                  <IconArchive className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[var(--color-navy-900)]">{r.title}</h4>
                  {r.description && <p className="text-sm text-[var(--color-navy-600)] mt-1 line-clamp-2">{r.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--color-navy-500)]">
                    <span><strong>النائب:</strong> {r.deputy_name}</span>
                    <span><strong>القسم:</strong> {r.department}</span>
                    {r.completed_date && <span><strong>أُنجز:</strong> {formatDate(r.completed_date)}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RequestDetailModal({ request, departments, researchers = [], onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedDepts, setSelectedDepts] = useState([])
  const [busy, setBusy] = useState(false)
  const [reviewDecision, setReviewDecision] = useState('approve')
  const [reviewNotes, setReviewNotes] = useState('')
  // اقتراح مدير الدائرة للباحث (اختياري وغير مُلزِم)
  const [assignResearchers, setAssignResearchers] = useState([])
  const [editOpen, setEditOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const toast = useToast()
  const confirmAction = useConfirm()

  useEffect(() => {
    if (!request) { setDetail(null); return }
    setLoading(true)
    setReviewNotes('')
    setAssignResearchers([])
    setEditOpen(false)
    // علم cancelled: يمنع ردّ طلبٍ سابق بطيء من دهس تفاصيل طلبٍ فُتح بعده،
    // فيرى المدير محتوى طلب غير الذي يظنّه معروضاً
    let cancelled = false
    api.getRequest(request.id)
      .then((r) => {
        if (cancelled || !r.success) return
        setDetail(r.data)
        // pre-check الأقسام المُحالة سابقاً ليرى المدير حالتها الحالية
        const existing = r.data?.assigned_departments || []
        setSelectedDepts(existing.length > 0 ? existing : [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [request])

  if (!request) return null
  const d = detail || request

  // الباحثون المتاحون = المنتمون للأقسام المحددة حالياً
  const eligibleResearchers = researchers.filter(
    (r) => r.department_id && selectedDepts.includes(r.department_id) && r.status === 'active'
  )

  const toggleDept = (id) => {
    setSelectedDepts((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      // إسقاط أي باحث لم يعد قسمه ضمن المحدَّد
      setAssignResearchers((rs) =>
        rs.filter((rid) => {
          const res = researchers.find((x) => x.id === rid)
          return res && next.includes(res.department_id)
        })
      )
      return next
    })
  }

  const toggleResearcher = (id) => {
    setAssignResearchers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const assign = async () => {
    if (selectedDepts.length === 0) return toast.error('اختر قسماً واحداً على الأقل')
    if (!(await confirmAction({ title: 'إحالة الطلب', message: `سيُحال الطلب إلى ${selectedDepts.length} قسم${assignResearchers.length ? ' مع اقتراح باحث' : ''} لاعتماد رئيس القسم.` }))) return
    setBusy(true)
    try {
      // الباحثون اقتراح غير مُلزِم فقط — رئيس القسم يعتمد ويحدّد تفاصيل الإعداد
      const extra = assignResearchers.length > 0 ? { researcher_ids: assignResearchers } : {}
      const res = await api.assignRequest(d.id, selectedDepts, extra)
      toast.success(res.message || 'تمت الإحالة')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const sendToDeputy = async () => {
    if (!(await confirmAction({ title: 'إرسال البحث للنائب', message: 'سيُرسَل البحث ذو الخصوصية إلى الجهة الطالبة. لا يمكن التراجع بعد الإرسال.' }))) return
    setBusy(true)
    try {
      await api.managerSendToDeputy(d.id)
      toast.success('تم إرسال البحث للنائب')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const cancelReferral = async () => {
    if (!(await confirmAction({ title: 'إلغاء الإحالة', message: 'سيعود الطلب إلى «انتظار التوجيه» لتعيد توجيهه. متاح فقط قبل أن يؤكّد رئيس القسم.', danger: true, confirmText: 'إلغاء الإحالة' }))) return
    setBusy(true)
    try {
      await api.cancelReferral(d.id)
      toast.success('أُلغيت الإحالة')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const returnReq = async () => {
    if (!(await confirmAction({ title: 'لا يمكن التنفيذ', message: 'سيُرجَع الطلب للجهة الطالبة بوصفه غير قابل للتنفيذ (بحث موجود مسبقاً).', danger: true, confirmText: 'إرجاع' }))) return
    setBusy(true)
    try {
      await api.returnRequest(d.id, { reason: 'البحث موجود مسبقاً', notes: 'تم إرجاع الطلب' })
      toast.success('تم الإرجاع')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  // رفض الطلب قبل الإحالة — خيار «رفض وإرجاع» كان في كتلة ميتة مشروطة
  // بحالة under_manager_review المحذوفة من المخطط، فلم يكن أي دور يستطيع
  // رفض طلب غير مختص.
  const rejectReq = async () => {
    const reason = rejectReason.trim()
    if (!reason) { toast.error('سبب الرفض مطلوب'); return }
    if (!(await confirmAction({ title: 'رفض الطلب', message: 'سيُرفض الطلب نهائياً. هذا الإجراء لا يُنفَّذ إلا لطلب غير مختص.', danger: true, confirmText: 'رفض' }))) return
    setBusy(true)
    try {
      await api.rejectRequest(d.id, reason)
      toast.success('تم رفض الطلب')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  const submitReview = async () => {
    setBusy(true)
    try {
      await api.finalReviewRequest(d.id, reviewDecision, reviewNotes)
      toast.success('تم تسجيل القرار')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={!!request} onClose={onClose} title={`الطلب ${request.id}`} size="lg">
      {loading ? <PageLoader /> : (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
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
            <Field label="تصنيف البحث" value={CONFIDENTIALITY_LABELS[d.confidentiality] || 'عام'} />
            <Field label="تاريخ التقديم" value={formatDate(d.date_received)} />
            <Field label="الموعد النهائي" value={formatDate(d.deadline)} />
            <Field label="موافقة على النشر" value={d.can_share ? '✓ نعم' : '✗ لا'} />
          </div>

          {/* تعديل بيانات الطلب — متاح ما لم يُسلَّم الطلب */}
          {!['delivered', 'completed', 'returned_exists', 'rejected'].includes(d.status) && (
            <div>
              <button onClick={() => setEditOpen((o) => !o)} className="btn-outline btn-sm">
                {editOpen ? 'إخفاء التعديل' : '✎ تعديل بيانات الطلب'}
              </button>
              {editOpen && (
                <EditRequestForm
                  request={d}
                  busy={busy}
                  setBusy={setBusy}
                  onSaved={onChanged}
                />
              )}
            </div>
          )}

          {/* إرسال البحث ذي الخصوصية للنائب */}
          {d.status === 'pending_manager_send' && (
            <div className="card p-4 bg-[var(--color-danger-50)] border-[var(--color-danger-600)]">
              <h4 className="font-bold text-sm mb-2 text-[var(--color-navy-900)]">
                إرسال البحث للنائب — بحث ذو خصوصية وحساسية
              </h4>
              <p className="text-xs text-[var(--color-navy-700)] mb-3">
                اعتمد المعاون هذا البحث، ولخصوصيته يُسلَّم للنائب طالب الخدمة عن طريقكم مباشرةً.
              </p>
              <button onClick={sendToDeputy} disabled={busy} className="btn-success w-full">
                <IconCheck className="w-4 h-4" />
                <span>{busy ? 'جاري الإرسال...' : 'إرسال للنائب'}</span>
              </button>
            </div>
          )}

          {/* 🏢 الأقسام التي أُحيل إليها الطلب - مرئية دائماً عند وجود إحالة */}
          {d.assigned_departments && d.assigned_departments.length > 0 && (
            <div className="card p-4">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-800)] flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--color-gold-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                الأقسام المُحالة إليها ({d.assigned_departments.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {d.assigned_departments.map((deptId) => {
                  const deptInfo = departments.find((x) => x.id === deptId)
                  const isPrimary = deptId === d.assigned_department
                  return (
                    <div key={deptId} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-gold-50)] border border-[var(--color-gold-300)]">
                      <span className="text-sm font-semibold text-[var(--color-navy-900)]">
                        {deptInfo?.name || deptId}
                      </span>
                      {isPrimary && (
                        <span className="badge-gold text-[10px]">رئيسي</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(d.status === 'pending' || d.status === 'assigned') && (
            <div className="card p-4 bg-[var(--color-navy-50)] border-[var(--color-navy-200)]">
              <h4 className="font-bold text-sm mb-1 text-[var(--color-navy-900)]">
                {d.status === 'pending' ? 'إحالة الطلب' : 'تعديل الإحالة'}
              </h4>
              <p className="text-xs text-[var(--color-navy-600)] mb-3">
                {d.status === 'pending'
                  ? 'حدد قسماً أو أكثر — سيتم إشعار رؤساء الأقسام المحددة'
                  : 'الأقسام المُحدّدة سابقاً مفعّلة. أضف/أزل لإعادة الإحالة (سيستبدل الإحالة الحالية)'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                {departments.map((dept) => {
                  const checked = selectedDepts.includes(dept.id)
                  const wasAssigned = (d.assigned_departments || []).includes(dept.id)
                  return (
                    <label key={dept.id} className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition ${
                      checked ? 'border-[var(--color-gold-500)] bg-[var(--color-gold-50)]' : 'border-[var(--color-border)] hover:bg-white'
                    }`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleDept(dept.id)} className="w-4 h-4" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-[var(--color-navy-900)] truncate">{dept.name}</p>
                          {wasAssigned && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-gold-200)] text-[var(--color-gold-800)]">مُحال حالياً</span>}
                        </div>
                        <p className="text-[10px] text-[var(--color-navy-500)]">{dept.researcher_count} باحث • {dept.active_requests} نشط</p>
                      </div>
                    </label>
                  )
                })}
              </div>
              {/* اقتراح باحث لرئيس القسم (اختياري، غير مُلزِم) */}
              <div className="pt-3 mt-1 border-t border-[var(--color-navy-200)]">
                <div className="flex items-center gap-2 mb-1">
                  <IconUsers className="w-4 h-4 text-[var(--color-gold-700)]" />
                  <h5 className="font-bold text-sm text-[var(--color-navy-900)]">اقتراح باحث لرئيس القسم (اختياري)</h5>
                </div>
                <p className="text-xs text-[var(--color-navy-600)] mb-3">
                  اقتراح غير مُلزِم — الطلب يذهب لرئيس القسم الذي يعتمد ويعيّن الباحث. اتركه فارغاً ليختار رئيس القسم بنفسه.
                </p>

                {selectedDepts.length === 0 ? (
                  <p className="text-xs text-[var(--color-navy-500)]">اختر قسماً أولاً لعرض باحثيه</p>
                ) : eligibleResearchers.length === 0 ? (
                  <p className="text-xs text-[var(--color-navy-500)]">لا يوجد باحثون نشطون في الأقسام المحددة</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 max-h-48 overflow-y-auto">
                      {eligibleResearchers.map((res) => {
                        const checked = assignResearchers.includes(res.id)
                        const deptName = departments.find((x) => x.id === res.department_id)?.name || res.department_id
                        return (
                          <label key={res.id} className={`flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer transition ${
                            checked ? 'border-[var(--color-gold-500)] bg-white' : 'border-[var(--color-border)] bg-white/50 hover:bg-white'
                          }`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleResearcher(res.id)} className="w-4 h-4" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{res.name}</p>
                              <p className="text-[10px] text-[var(--color-navy-500)] truncate">{deptName}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>

                    {assignResearchers.length > 0 && (
                      <p className="text-[11px] text-[var(--color-navy-500)] bg-[var(--color-surface-soft)] rounded-lg p-2">
                        نوع الخدمة والتصنيف ومدة الإنجاز يحدّدها رئيس القسم عند اعتماد الطلب وتعيين الباحث.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={assign} disabled={busy || selectedDepts.length === 0} className="btn-primary flex-1">
                  {d.status === 'pending' ? 'إحالة' : 'حفظ التغييرات'} {selectedDepts.length > 0 && `(${selectedDepts.length})`}
                  {assignResearchers.length > 0 && ` + اقتراح ${assignResearchers.length} باحث`}
                </button>
                {d.status === 'pending' && (
                  <button onClick={returnReq} disabled={busy} className="btn-outline flex-1">لا يمكن التنفيذ</button>
                )}
                {d.status === 'pending' && (
                  <button onClick={() => setShowReject((v) => !v)} disabled={busy} className="btn-outline flex-1 text-[var(--color-danger-700)]">
                    رفض الطلب
                  </button>
                )}
                {d.status === 'assigned' && (
                  <button onClick={cancelReferral} disabled={busy} className="btn-outline flex-1 text-[var(--color-danger-700)]">
                    إلغاء الإحالة
                  </button>
                )}
              </div>

              {d.status === 'pending' && showReject && (
                <div className="card p-3 mt-3 bg-red-50 border-red-200">
                  <label className="label label-required" htmlFor="reject-reason">سبب الرفض</label>
                  <textarea
                    id="reject-reason"
                    className="textarea"
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="مثال: الطلب خارج نطاق اختصاص الدائرة"
                  />
                  <button onClick={rejectReq} disabled={busy || !rejectReason.trim()} className="btn-danger w-full mt-2">
                    {busy ? 'جاري...' : 'تأكيد الرفض'}
                  </button>
                </div>
              )}
            </div>
          )}

          {d.status === 'under_manager_review' && (
            <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">المراجعة النهائية</h4>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 ${reviewDecision === 'approve' ? 'border-[var(--color-success-600)] bg-emerald-50' : 'border-[var(--color-border)]'}`}>
                    <input type="radio" name="dec" value="approve" checked={reviewDecision === 'approve'} onChange={(e) => setReviewDecision(e.target.value)} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <IconCheck className="w-5 h-5 text-[var(--color-success-700)]" />
                      <span className="font-semibold">اعتماد وتسليم</span>
                    </div>
                  </label>
                  <label className={`flex-1 cursor-pointer p-3 rounded-lg border-2 ${reviewDecision === 'reject' ? 'border-[var(--color-danger-600)] bg-red-50' : 'border-[var(--color-border)]'}`}>
                    <input type="radio" name="dec" value="reject" checked={reviewDecision === 'reject'} onChange={(e) => setReviewDecision(e.target.value)} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <IconClock className="w-5 h-5 text-[var(--color-danger-700)]" />
                      <span className="font-semibold">رفض وإرجاع</span>
                    </div>
                  </label>
                </div>
                <textarea className="textarea" rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="ملاحظات (اختياري)" />
                <button onClick={submitReview} disabled={busy} className={reviewDecision === 'approve' ? 'btn-success w-full' : 'btn-danger w-full'}>
                  {busy ? 'جاري...' : 'تأكيد القرار'}
                </button>
              </div>
            </div>
          )}

          {d.confirmation && (
            <div className="card p-4">
              <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-800)]">تفاصيل الإعداد</h4>
              <div className="grid grid-cols-3 gap-3">
                <Field label="نوع الخدمة" value={d.confirmation.service_type} />
                <Field label="التصنيف" value={d.confirmation.classification} />
                <Field label="مدة الإنجاز" value={`${d.confirmation.completion_days} يوم`} />
              </div>
            </div>
          )}

          <ResearchFiles files={d.files} title="ملفات البحث" />

                    <div className="card p-4">
            <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-900)]">سجل القرارات</h4>
            <RequestTimeline requestId={d.id} />
          </div>

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

// نموذج تعديل بيانات الطلب من مدير الدائرة
function EditRequestForm({ request, busy, setBusy, onSaved }) {
  const [title, setTitle] = useState(request.title || '')
  const [description, setDescription] = useState(request.description || '')
  const [purpose, setPurpose] = useState(request.purpose || 'oversight')
  const [committee, setCommittee] = useState(request.committee || '')
  const [confidentiality, setConfidentiality] = useState(request.confidentiality || 'public')
  const [canShare, setCanShare] = useState(!!request.can_share)
  const [deadline, setDeadline] = useState(
    request.deadline ? String(request.deadline).slice(0, 10) : ''
  )
  const toast = useToast()

  const save = async (e) => {
    e.preventDefault()
    if (title.trim().length < 5) return toast.error('العنوان قصير جداً')
    setBusy(true)
    try {
      await api.updateRequest(request.id, {
        title: title.trim(),
        description,
        purpose,
        committee,
        confidentiality,
        can_share: canShare,
        deadline,
      })
      toast.success('تم تعديل الطلب')
      onSaved()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} className="card p-4 mt-3 space-y-3 bg-[var(--color-surface-soft)]">
      <div>
        <label className="label label-required">عنوان البحث</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" />
      </div>
      <div>
        <label className="label">الوصف</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="textarea" rows={3} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="label">الغرض</label>
          <select className="select" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="oversight">رقابي</option>
            <option value="legislative">تشريعي</option>
            <option value="other">أخرى</option>
          </select>
        </div>
        <div>
          <label className="label">تصنيف البحث</label>
          <select className="select" value={confidentiality} onChange={(e) => setConfidentiality(e.target.value)}>
            {Object.entries(CONFIDENTIALITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">اللجنة</label>
          <select className="select" value={committee} onChange={(e) => setCommittee(e.target.value)}>
            <option value="">— بدون —</option>
            {/* اللجنة قد تكون مركّبة من عدة لجان، نعرضها كما هي إن لم تطابق القائمة */}
            {committee && !COMMITTEES.includes(committee) && <option value={committee}>{committee}</option>}
            {COMMITTEES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">الموعد النهائي</label>
          <input type="date" dir="ltr" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input text-right" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={canShare} onChange={(e) => setCanShare(e.target.checked)} className="w-4 h-4" />
        <span className="text-sm">موافقة الجهة الطالبة على نشر/توزيع البحث</span>
      </label>
      <button type="submit" disabled={busy} className="btn-gold w-full">
        {busy ? 'جاري الحفظ...' : 'حفظ التعديلات'}
      </button>
    </form>
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
