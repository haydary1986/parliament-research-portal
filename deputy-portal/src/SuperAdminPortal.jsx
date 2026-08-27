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
import { formatDate, formatDateTime, ROLE_LABELS, REQUESTER_TYPES } from './lib/format'
import { COMMITTEES } from './lib/committees'
import * as api from './api'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export default function SuperAdminPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [activity, setActivity] = useState([])
  const [security, setSecurity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
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
        <div className="flex gap-2">
          <button onClick={() => setBulkOpen(true)} className="btn-outline">
            <span>📥</span>
            <span>استيراد من Excel</span>
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-gold">
            <IconPlus className="w-4 h-4" />
            <span>مستخدم جديد</span>
          </button>
        </div>
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

      <BulkImportModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onDone={() => { setBulkOpen(false); refresh() }}
      />
    </PortalLayout>
  )
}

function AdminDashboard({ stats, users, departments, activity }) {
  const s = stats || {}
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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
  const [resetUser, setResetUser] = useState(null)
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

      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} onSaved={onChanged} />

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
                <td>
                  <span className="badge-navy">{ROLE_LABELS[u.role] || u.role}</span>
                  {/* الجهات الطالبة غير النواب تُميَّز بنوعها */}
                  {u.role === 'deputy' && u.requester_type && u.requester_type !== 'deputy' && (
                    <span className="badge-gold text-[10px] mr-1">{REQUESTER_TYPES[u.requester_type]}</span>
                  )}
                </td>
                <td className="text-sm">{u.department_id || '—'}</td>
                <td>
                  <span className={u.status === 'active' ? 'badge-success' : 'badge-neutral'}>
                    {u.status === 'active' ? 'نشط' : 'معطّل'}
                  </span>
                </td>
                <td className="text-xs">{u.last_login ? formatDate(u.last_login) : '—'}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setResetUser(u)} className="btn-ghost btn-sm" title="إعادة تعيين كلمة المرور">
                      🔑
                    </button>
                    <button onClick={() => toggleStatus(u)} className="btn-ghost btn-sm">
                      {u.status === 'active' ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </div>
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

function BulkImportModal({ open, onClose, onDone }) {
  const [step, setStep] = useState('upload') // upload | preview | done
  const [rows, setRows] = useState([])
  const [results, setResults] = useState([])
  const [requesterType, setRequesterType] = useState('deputy')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (open) { setStep('upload'); setRows([]); setResults([]); setRequesterType('deputy') }
  }, [open])

  // قراءة ملف Excel - أعمدة متوقعة:
  // A: الاسم، B: البريد (اختياري)، C: الموبايل، D: الرقم النيابي، E+: لجان (متعددة)
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

      // أول صف ربما يكون header - نتحقق
      const firstRow = (raw[0] || []).map((c) => String(c).trim())
      const hasHeader = firstRow.some((c) => /اسم|بريد|name|email/i.test(c))
      const dataRows = hasHeader ? raw.slice(1) : raw

      const parsed = dataRows
        .filter((r) => r.some((c) => String(c).trim()))
        .map((r) => {
          const cells = r.map((c) => String(c).trim())
          const name = cells[0] || ''
          const email = cells[1] || ''
          const phone = cells[2] || ''
          const deputyId = cells[3] || ''
          // باقي الخانات: لجان (قد تكون مفصولة بفاصلة أيضاً)
          let committees = []
          for (let i = 4; i < cells.length; i++) {
            const v = cells[i]
            if (!v) continue
            v.split(/[,،;\n]/).forEach((c) => {
              const t = c.trim()
              if (t && COMMITTEES.includes(t)) committees.push(t)
              else if (t && t !== 'أخرى') committees.push(t) // نقبل غير الرسمية أيضاً
            })
          }
          // إذا كان عمود اللجان مفصولاً بفاصلة في خانة واحدة
          if (committees.length === 0 && cells[4]) {
            committees = cells[4].split(/[,،;\n]/).map((c) => c.trim()).filter(Boolean)
          }
          return { name, email, phone, deputy_id: deputyId, role: 'deputy', committees }
        })
        .filter((r) => r.name)

      if (parsed.length === 0) {
        toast.error('لا توجد بيانات صالحة في الملف')
        return
      }
      setRows(parsed)
      setStep('preview')
    } catch (err) {
      toast.error('فشل قراءة الملف: ' + err.message)
    }
  }

  const downloadTemplate = () => {
    const headers = ['الاسم', 'البريد (اختياري)', 'الموبايل', 'الرقم النيابي', 'اللجان (مفصولة بفاصلة)']
    const sample = [
      ['د. علي محمد', 'ali.m@parliament.iq', '07701112233', 'DEP-100', 'اللجنة المالية، لجنة النزاهة'],
      ['أ. فاطمة حسين', '', '07702223344', '', 'لجنة التربية'],
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample])
    ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 50 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'نواب')
    XLSX.writeFile(wb, 'قالب_استيراد_النواب.xlsx')
  }

  const submit = async () => {
    setBusy(true)
    try {
      const r = await api.bulkCreateUsers(rows.map((u) => ({
        name: u.name,
        email: u.email || undefined,
        phone: u.phone || undefined,
        deputy_id: u.deputy_id || undefined,
        role: u.role,
        requester_type: requesterType,
        committees: u.committees,
      })))
      if (r.success) {
        setResults(r.data || [])
        setStep('done')
        toast.success(r.message)
      } else {
        toast.error(r.message)
      }
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  const downloadCredentials = () => {
    // CSV بأسماء وبريد وكلمات مرور للمشاركة الآمنة
    const headers = ['الاسم', 'البريد', 'كلمة المرور', 'الحالة', 'ملاحظة']
    const rowsCsv = results.map((r) => [
      r.name,
      r.email || '',
      r.password || '',
      r.success ? 'تم الإنشاء' : 'فشل',
      r.error || ''
    ])
    const csv = [headers, ...rowsCsv]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // BOM لدعم العربية في Excel
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const date = new Date().toISOString().slice(0, 10)
    saveAs(blob, `حسابات_النواب_${date}.csv`)
  }

  if (!open) return null

  return (
    <Modal
      open={open}
      onClose={() => { if (step === 'done') onDone?.(); onClose() }}
      title={step === 'upload' ? 'استيراد حسابات النواب من Excel' : step === 'preview' ? `معاينة (${rows.length} نائب)` : `النتائج (${results.filter((r) => r.success).length} ناجح)`}
      size="xl"
      footer={
        <>
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="btn-outline">رجوع</button>
              <button onClick={submit} disabled={busy || rows.length === 0} className="btn-gold">
                {busy ? `جاري الإنشاء... (${rows.length})` : `إنشاء ${rows.length} حساب`}
              </button>
            </>
          )}
          {step === 'done' && (
            <>
              <button onClick={downloadCredentials} className="btn-success">
                📥 تحميل بيانات الدخول (CSV)
              </button>
              <button onClick={() => { onDone?.(); onClose() }} className="btn-primary">إغلاق</button>
            </>
          )}
          {step === 'upload' && (
            <button onClick={onClose} className="btn-outline">إلغاء</button>
          )}
        </>
      }
    >
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-bold text-blue-900 mb-2">📋 صيغة الملف المتوقعة</h4>
            <p className="text-sm text-blue-800 mb-2">
              ملف <code className="bg-white px-1.5 py-0.5 rounded">xlsx</code> أو
              <code className="bg-white px-1.5 py-0.5 rounded mr-1">xls</code> بالأعمدة التالية:
            </p>
            <table className="w-full text-xs bg-white rounded border border-blue-200">
              <thead className="bg-blue-100">
                <tr>
                  <th className="p-2 text-right">الاسم</th>
                  <th className="p-2 text-right">البريد (اختياري)</th>
                  <th className="p-2 text-right">الموبايل</th>
                  <th className="p-2 text-right">الرقم النيابي</th>
                  <th className="p-2 text-right">اللجان (يفصلها فاصلة)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-blue-200">
                  <td className="p-2">د. علي محمد</td>
                  <td className="p-2 text-gray-500">يُولَّد تلقائياً</td>
                  <td className="p-2">07701112233</td>
                  <td className="p-2">DEP-100</td>
                  <td className="p-2">اللجنة المالية، لجنة النزاهة</td>
                </tr>
              </tbody>
            </table>
            <button onClick={downloadTemplate} className="btn-outline btn-sm mt-3">
              📥 تحميل قالب جاهز
            </button>
          </div>

          <label className="block">
            <div className="border-2 border-dashed border-[var(--color-gold-400)] rounded-xl p-8 text-center cursor-pointer hover:bg-[var(--color-gold-50)] transition">
              <div className="text-4xl mb-2">📥</div>
              <p className="font-semibold text-[var(--color-navy-900)]">اضغط لاختيار ملف Excel</p>
              <p className="text-xs text-[var(--color-navy-500)] mt-1">.xlsx, .xls</p>
            </div>
            <input type="file" accept=".xlsx,.xls" onChange={onFile} className="sr-only" />
          </label>
        </div>
      )}

      {step === 'preview' && (
        <div>
          <div className="form-group">
            <label className="label label-required" htmlFor="bulk-requester-type">نوع الجهة الطالبة لهذه الدفعة</label>
            <select
              id="bulk-requester-type"
              className="select"
              value={requesterType}
              onChange={(e) => setRequesterType(e.target.value)}
            >
              {Object.entries(REQUESTER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <p className="form-hint">يُطبَّق على كل الصفوف. استورد كل جهة في دفعة منفصلة.</p>
          </div>
          <p className="text-sm text-[var(--color-navy-600)] mb-3">
            راجع البيانات أدناه. سيتم توليد كلمات مرور عشوائية تلقائياً.
          </p>
          <div className="table-wrap max-h-96 overflow-y-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم</th>
                  <th>البريد</th>
                  <th>الموبايل</th>
                  <th>اللجان</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td className="font-semibold">{r.name}</td>
                    <td className="text-xs font-mono" dir="ltr">{r.email || <span className="text-[var(--color-navy-400)]">سيُولَّد</span>}</td>
                    <td className="text-xs" dir="ltr">{r.phone || '—'}</td>
                    <td className="text-xs">{r.committees.join('، ') || <span className="text-[var(--color-navy-400)]">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="font-semibold text-emerald-900">
              ✓ {results.filter((r) => r.success).length} حساب أُنشئ بنجاح
              {results.some((r) => !r.success) && (
                <span className="text-red-700"> • {results.filter((r) => !r.success).length} فشل</span>
              )}
            </p>
            <p className="text-xs text-emerald-800 mt-1">
              ⚠️ احفظ كلمات المرور الآن — لا يمكن استرجاعها لاحقاً (ستحتاج لإعادة تعيينها)
            </p>
          </div>
          <div className="table-wrap max-h-96 overflow-y-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد</th>
                  <th>كلمة المرور</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className={r.success ? '' : 'bg-red-50'}>
                    <td className="font-semibold">{r.name}</td>
                    <td className="text-xs font-mono" dir="ltr">{r.email}</td>
                    <td className="text-xs font-mono font-bold">{r.password || '—'}</td>
                    <td>
                      {r.success ? <span className="badge-success">✓</span> : (
                        <span className="badge-danger" title={r.error}>✗ {r.error?.slice(0, 30)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose, onSaved }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (user) { setNewPassword(''); setConfirmPassword('') }
  }, [user])

  if (!user) return null

  const generateRandom = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let pwd = ''
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
    setNewPassword(pwd); setConfirmPassword(pwd)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) return toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    if (newPassword !== confirmPassword) return toast.error('كلمتا المرور غير متطابقتين')
    setBusy(true)
    try {
      await api.adminResetPassword(user.id, newPassword)
      toast.success(`تم تعيين كلمة المرور لـ ${user.name}`)
      onSaved?.()
      onClose()
    } catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title="إعادة تعيين كلمة المرور"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button form="rp-form" type="submit" disabled={busy} className="btn-danger">
            {busy ? 'جاري التعيين...' : 'تعيين كلمة مرور جديدة'}
          </button>
        </>
      }
    >
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4 flex items-start gap-2">
        <span className="text-xl">⚠️</span>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-900">إعادة تعيين كلمة مرور:</p>
          <p className="text-amber-800 mt-0.5">
            <strong>{user.name}</strong> ({user.email})
          </p>
          <p className="text-amber-700 text-xs mt-2">
            سيُرسَل إشعار للمستخدم بأن كلمة مروره قد أُعيد تعيينها.
            احفظ كلمة المرور الجديدة وأرسلها له بطريقة آمنة.
          </p>
        </div>
      </div>
      <form id="rp-form" onSubmit={submit} className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label label-required mb-0">كلمة المرور الجديدة</label>
            <button type="button" onClick={generateRandom} className="text-xs text-[var(--color-gold-700)] hover:underline">
              🎲 توليد عشوائية
            </button>
          </div>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input font-mono"
            placeholder="6 أحرف على الأقل"
            required minLength={6}
          />
        </div>
        <div>
          <label className="label label-required">تأكيد كلمة المرور</label>
          <input
            type="text"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input font-mono"
            required minLength={6}
          />
        </div>
      </form>
    </Modal>
  )
}

function CreateUserModal({ open, departments, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('researcher')
  const [departmentId, setDepartmentId] = useState('')
  const [requesterType, setRequesterType] = useState('deputy')
  const [committees, setCommittees] = useState([])
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setName(''); setEmail(''); setPassword('')
      setRole('researcher'); setDepartmentId('')
      setRequesterType('deputy')
      setCommittees([]); setPhone('')
    }
  }, [open])

  const needsDept = ['department_head', 'researcher'].includes(role)
  const isDeputy = role === 'deputy'

  const toggleCommittee = (c) => {
    setCommittees((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('كلمة المرور قصيرة')
    if (needsDept && !departmentId) return toast.error('اختر القسم')
    if (isDeputy && committees.length === 0) return toast.error('اختر لجنة واحدة على الأقل')
    setBusy(true)
    try {
      await api.createUser({
        name, email, password, role,
        department_id: needsDept ? departmentId : null,
        requester_type: isDeputy ? requesterType : 'deputy',
        committees: isDeputy ? committees : [],
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
              <label className="label label-required">نوع الجهة الطالبة</label>
              <select className="select" value={requesterType} onChange={(e) => setRequesterType(e.target.value)}>
                {Object.entries(REQUESTER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <p className="form-hint">كل هذه الجهات تستخدم بوابة تقديم الطلبات نفسها</p>
            </div>
            <div className="form-group">
              <label className="label label-required">اللجان النيابية (يمكن اختيار أكثر من واحدة)</label>
              <p className="form-hint mb-2">الأولى تُعتبر اللجنة الرئيسية. {committees.length} مختارة</p>
              <div className="max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-lg p-2 space-y-1 bg-white">
                {COMMITTEES.map((c) => {
                  const checked = committees.includes(c)
                  return (
                    <label key={c} className={`flex items-start gap-2 p-2 rounded cursor-pointer transition ${
                      checked ? 'bg-[var(--color-gold-50)] border border-[var(--color-gold-300)]' : 'hover:bg-[var(--color-surface-soft)]'
                    }`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCommittee(c)} className="mt-0.5 w-4 h-4" />
                      <span className="text-sm flex-1">{c}</span>
                      {checked && committees[0] === c && <span className="badge-gold text-[10px]">رئيسية</span>}
                    </label>
                  )
                })}
              </div>
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
