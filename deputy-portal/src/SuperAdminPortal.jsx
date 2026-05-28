import { useEffect, useState } from 'react'
import PortalLayout from './components/layout/PortalLayout'
import StatCard from './components/ui/StatCard'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import { PageLoader } from './components/ui/Spinner'
import { useToast } from './components/ui/Toast'
import {
  IconDashboard, IconUsers, IconBuilding, IconActivity, IconShield,
  IconDocument, IconPlus, IconSearch, IconParliament,
} from './components/icons/Icons'
import { formatDate, formatDateTime, ROLE_LABELS } from './lib/format'
import { COMMITTEES } from './lib/committees'
import * as api from './api'

export default function SuperAdminPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [activity, setActivity] = useState([])
  const [security, setSecurity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const toast = useToast()

  const refresh = async () => {
    setLoading(true)
    try {
      const [s, u, d, a, sec] = await Promise.all([
        api.getDashboardStats(),
        api.getUsers({ limit: 200 }),
        api.getDepartments(),
        api.getActivityLogs({ limit: 50 }),
        api.getSecurityStats().catch(() => ({ success: true, data: null })),
      ])
      if (s.success) setStats(s.data)
      if (u.success) setUsers(u.data || [])
      if (d.success) setDepartments(d.data || [])
      if (a.success) setActivity(a.data || [])
      if (sec.success) setSecurity(sec.data)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])

  const navItems = [
    { key: 'dashboard', label: 'لوحة المعلومات', icon: IconDashboard },
    { key: 'users', label: 'المستخدمون', icon: IconUsers, badge: users.length },
    { key: 'departments', label: 'الأقسام', icon: IconBuilding },
    { key: 'activity', label: 'سجل النشاط', icon: IconActivity },
    { key: 'security', label: 'الأمان', icon: IconShield },
  ]

  const meta = {
    dashboard: { title: 'لوحة الإدارة', subtitle: 'إدارة عامة لمنصة البحوث البرلمانية' },
    users: { title: 'إدارة المستخدمين', subtitle: 'إدارة الحسابات والصلاحيات' },
    departments: { title: 'الأقسام', subtitle: 'إدارة الأقسام البحثية' },
    activity: { title: 'سجل النشاط', subtitle: 'كل العمليات المنفذة في النظام' },
    security: { title: 'الأمان', subtitle: 'إحصائيات أمنية ومحاولات الاختراق' },
  }

  return (
    <PortalLayout
      user={user}
      portalLabel="مدير النظام"
      navItems={navItems}
      activeKey={tab}
      onNavigate={setTab}
      onLogout={onLogout}
      title={meta[tab].title}
      subtitle={meta[tab].subtitle}
      actions={tab === 'users' && (
        <button onClick={() => setCreateOpen(true)} className="btn-gold">
          <IconPlus className="w-4 h-4" />
          <span>مستخدم جديد</span>
        </button>
      )}
    >
      {loading ? <PageLoader /> : (
        <>
          {tab === 'dashboard' && <AdminDashboard stats={stats} users={users} departments={departments} activity={activity} />}
          {tab === 'users' && <UsersView users={users} onChanged={refresh} />}
          {tab === 'departments' && <DepartmentsView departments={departments} users={users} />}
          {tab === 'activity' && <ActivityView logs={activity} />}
          {tab === 'security' && <SecurityView security={security} />}
        </>
      )}

      <CreateUserModal
        open={createOpen}
        departments={departments}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); refresh(); toast.success('تم إنشاء المستخدم') }}
      />
    </PortalLayout>
  )
}

function AdminDashboard({ stats, users, departments, activity }) {
  const s = stats || {}
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="المستخدمون" value={users.length} tone="navy" icon={<IconUsers />} />
        <StatCard label="الأقسام" value={departments.length} tone="gold" icon={<IconBuilding />} />
        <StatCard label="الطلبات" value={s.total_requests || 0} tone="info" icon={<IconDocument />} />
        <StatCard label="الباحثون" value={s.total_researchers || 0} tone="success" icon={<IconParliament />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><h3 className="card-title">توزع المستخدمين</h3></div>
          <div className="p-4 space-y-3">
            {Object.entries(ROLE_LABELS).map(([role, label]) => {
              const count = users.filter((u) => u.role === role).length
              const pct = users.length ? (count / users.length) * 100 : 0
              return (
                <div key={role}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-semibold text-[var(--color-navy-800)]">{label}</span>
                    <span className="text-[var(--color-navy-600)]">{count}</span>
                  </div>
                  <div className="h-2 bg-[var(--color-surface-soft)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-l from-[var(--color-gold-500)] to-[var(--color-gold-700)] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">آخر النشاطات</h3></div>
          <div className="divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
            {activity.slice(0, 10).map((log) => (
              <div key={log.id} className="p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--color-navy-50)] text-[var(--color-navy-700)] flex items-center justify-center text-xs font-bold">
                  {log.user_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{log.user_name}</span>
                    <span className="text-[var(--color-navy-600)]"> — {log.details}</span>
                  </p>
                  <p className="text-[10px] text-[var(--color-navy-500)] mt-0.5">{formatDateTime(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function UsersView({ users, onChanged }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const toast = useToast()

  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    }
    return true
  })

  const toggleStatus = async (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active'
    try {
      await api.updateUserStatus(u.id, newStatus)
      toast.success('تم التحديث')
      onChanged()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <IconSearch className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد..." className="input input-with-icon" />
        </div>
        <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">جميع الأدوار</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد</th>
              <th>الدور</th>
              <th>القسم</th>
              <th>الحالة</th>
              <th>آخر دخول</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-navy-50)] text-[var(--color-navy-700)] flex items-center justify-center text-xs font-bold">
                      {u.name[0]}
                    </div>
                    <span className="font-semibold text-sm">{u.name}</span>
                  </div>
                </td>
                <td className="text-xs font-mono" dir="ltr">{u.email}</td>
                <td><span className="badge-navy">{ROLE_LABELS[u.role] || u.role}</span></td>
                <td className="text-sm">{u.department_id || '—'}</td>
                <td>
                  <span className={u.status === 'active' ? 'badge-success' : 'badge-neutral'}>
                    {u.status === 'active' ? 'نشط' : 'معطّل'}
                  </span>
                </td>
                <td className="text-xs">{u.last_login ? formatDate(u.last_login) : '—'}</td>
                <td>
                  <button onClick={() => toggleStatus(u)} className="btn-ghost btn-sm">
                    {u.status === 'active' ? 'تعطيل' : 'تفعيل'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DepartmentsView({ departments, users }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {departments.map((d) => {
        const members = users.filter((u) => u.department_id === d.id)
        return (
          <div key={d.id} className="card overflow-hidden">
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
              <div className="grid grid-cols-2 gap-2 mb-3 pt-3 border-t border-[var(--color-border)]">
                <div>
                  <p className="text-2xl font-bold text-[var(--color-navy-900)]">{d.researcher_count}</p>
                  <p className="text-[10px] text-[var(--color-navy-500)] uppercase">باحث</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--color-gold-700)]">{d.active_requests}</p>
                  <p className="text-[10px] text-[var(--color-navy-500)] uppercase">طلب نشط</p>
                </div>
              </div>
              <div className="flex -space-x-2 space-x-reverse">
                {members.slice(0, 5).map((m) => (
                  <div key={m.id} className="w-7 h-7 rounded-full bg-[var(--color-navy-100)] text-[var(--color-navy-700)] border-2 border-white flex items-center justify-center text-[10px] font-bold" title={m.name}>
                    {m.name[0]}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-[var(--color-navy-700)] text-white border-2 border-white flex items-center justify-center text-[10px] font-bold">
                    +{members.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ActivityView({ logs }) {
  if (logs.length === 0) return <div className="card"><EmptyState title="لا توجد نشاطات" /></div>
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>الوقت</th>
            <th>المستخدم</th>
            <th>الإجراء</th>
            <th>التفاصيل</th>
            <th>الكيان</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="text-xs text-[var(--color-navy-600)]">{formatDateTime(l.created_at)}</td>
              <td className="font-semibold text-sm">{l.user_name}</td>
              <td><span className="badge-info">{l.action}</span></td>
              <td className="text-sm">{l.details || '—'}</td>
              <td className="text-xs font-mono" dir="ltr">{l.entity_id || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SecurityView({ security }) {
  const s = security || {}
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="عناوين IP محظورة" value={s.blocked_ips || 0} tone="danger" icon={<IconShield />} />
        <StatCard label="عناوين IP مشبوهة" value={s.suspicious_ips || 0} tone="warning" icon={<IconShield />} />
      </div>

      <div className="card p-6">
        <h3 className="card-title mb-3">سياسات الأمان النشطة</h3>
        <ul className="space-y-2 text-sm text-[var(--color-navy-700)]">
          {[
            'حظر تصاعدي عند فشل محاولات تسجيل الدخول (3→30s، 5→2m، 7→10m، 10→30m)',
            'JWT بمدة صلاحية 8 ساعات + قائمة سوداء للـ tokens',
            'CSP و HSTS و X-Frame-Options و XSS Protection',
            'حد أقصى لحجم الطلب 1MB',
            'تعقيم HTML من جميع المدخلات النصية',
            'تحقق من نوع الملف عبر magic bytes (PDF, DOC, DOCX فقط)',
            'حد أقصى للملف 10MB',
            'كل العمليات الحرجة داخل transactions ذرية',
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[var(--color-success-600)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CreateUserModal({ open, departments, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('researcher')
  const [departmentId, setDepartmentId] = useState('')
  const [committee, setCommittee] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setName(''); setEmail(''); setPassword('')
      setRole('researcher'); setDepartmentId('')
      setCommittee(''); setPhone('')
    }
  }, [open])

  const needsDept = ['department_head', 'researcher'].includes(role)
  const isDeputy = role === 'deputy'

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('كلمة المرور قصيرة')
    if (needsDept && !departmentId) return toast.error('اختر القسم')
    if (isDeputy && !committee) return toast.error('اختر اللجنة النيابية')
    setBusy(true)
    try {
      await api.createUser({
        name, email, password, role,
        department_id: needsDept ? departmentId : null,
        committee: isDeputy ? committee : null,
        phone: isDeputy && phone ? phone : null,
      })
      onCreated()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إنشاء مستخدم جديد"
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
          <label className="label label-required">كلمة المرور</label>
          <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="input" />
        </div>
        <div className="form-group">
          <label className="label label-required">الدور</label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {needsDept && (
          <div className="form-group">
            <label className="label label-required">القسم</label>
            <select className="select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">اختر...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}
        {isDeputy && (
          <>
            <div className="form-group">
              <label className="label label-required">اللجنة النيابية</label>
              <select className="select" value={committee} onChange={(e) => setCommittee(e.target.value)}>
                <option value="">اختر اللجنة...</option>
                {COMMITTEES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">رقم الموبايل (للإشعارات)</label>
              <input type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} className="input text-right" placeholder="07XXXXXXXXX" />
              <p className="form-hint">يُرسل إشعار للنائب عند اكتمال البحث</p>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
