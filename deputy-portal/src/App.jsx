import { useState } from 'react'
import DeputyPortal from './DeputyPortal'
import ManagerPortal from './ManagerPortal'
import DepartmentPortal from './DepartmentPortal'
import ResearcherPortal from './ResearcherPortal'
import ProofreaderPortal from './ProofreaderPortal'
import AssistantManagerPortal from './AssistantManagerPortal'
import SuperAdminPortal from './SuperAdminPortal'
import { login as apiLogin, logout as apiLogout, setToken } from './api'
import Brand from './components/layout/Brand'
import Spinner from './components/ui/Spinner'
import { ToastProvider, useToast } from './components/ui/Toast'
import { IconMail, IconLock, IconUser, IconChevronDown } from './components/icons/Icons'

const ROLE_TO_PORTAL = {
  deputy: 'deputy',
  manager: 'manager',
  department_head: 'department',
  researcher: 'researcher',
  proofreader: 'proofreader',
  assistant_manager: 'assistant',
  admin: 'admin',
}

const PORTALS_META = [
  { id: 'deputy', name: 'بوابة السادة النواب', tone: 'gold' },
  { id: 'manager', name: 'بوابة مدير الدائرة', tone: 'navy' },
  { id: 'department', name: 'بوابة رئيس القسم', tone: 'gold' },
  { id: 'researcher', name: 'بوابة الباحث', tone: 'navy' },
  { id: 'proofreader', name: 'بوابة المدقق اللغوي', tone: 'gold' },
  { id: 'assistant', name: 'بوابة المعاون', tone: 'navy' },
  { id: 'admin', name: 'لوحة إدارة النظام', tone: 'navy' },
]

const DEMO_ACCOUNTS = [
  { email: 'khaled@parliament.iq', portal: 'deputy', name: 'د. خالد العبيدي' },
  { email: 'sara@parliament.iq', portal: 'deputy', name: 'أ. سارة عبدالرحمن' },
  { email: 'manager@parliament.iq', portal: 'manager', name: 'مدير الدائرة' },
  { email: 'suad@parliament.iq', portal: 'department', name: 'د. سعاد العلوي - قسم البحوث' },
  { email: 'hassan@parliament.iq', portal: 'department', name: 'أ. حسن الربيعي - بحوث الموازنة' },
  { email: 'ali.m@parliament.iq', portal: 'department', name: 'أ. علي الموسوي - الدراسات القانونية' },
  { email: 'nour@parliament.iq', portal: 'researcher', name: 'د. نور الدين' },
  { email: 'rana@parliament.iq', portal: 'researcher', name: 'أ. رنا علي' },
  { email: 'mohammed.k@parliament.iq', portal: 'proofreader', name: 'أ. محمد الخطاط' },
  { email: 'huda@parliament.iq', portal: 'proofreader', name: 'أ. هدى السامرائي' },
  { email: 'assistant@parliament.iq', portal: 'assistant', name: 'د. عبدالكريم الأنصاري' },
  { email: 'admin@parliament.iq', portal: 'admin', name: 'مدير النظام' },
]

function LoginPage({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [expandedPortal, setExpandedPortal] = useState(null)
  const toast = useToast()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await apiLogin(email, password)
      if (data.success) {
        const apiUser = data.data.user
        setToken(data.data.token)
        const portalId = ROLE_TO_PORTAL[apiUser.role] || 'deputy'
        toast.success(`أهلاً ${apiUser.name}`)
        onSuccess({ ...apiUser, email, portal: portalId }, portalId)
      } else {
        setError(data.message || 'فشل تسجيل الدخول')
      }
    } catch (err) {
      setError(err.message || 'فشل الاتصال بالخادم')
    } finally {
      setBusy(false)
    }
  }

  const fillCred = (acc) => {
    setEmail(acc.email)
    setPassword('123456')
    setError('')
    setExpandedPortal(null)
  }

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Brand size={88} />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">مجلس النواب العراقي</h1>
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-12 bg-[var(--color-gold-500)]" />
            <p className="text-base font-semibold text-[var(--color-gold-300)]">دائرة البحوث والدراسات</p>
            <span className="h-px w-12 bg-[var(--color-gold-500)]" />
          </div>
          <p className="text-sm text-[var(--color-navy-200)] mt-3">منصة إدارة البحوث البرلمانية</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Login form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="iraqi-accent" />
              <div className="p-8">
                <h2 className="text-xl font-bold text-[var(--color-navy-900)] mb-1">تسجيل الدخول</h2>
                <p className="text-sm text-[var(--color-navy-500)] mb-6">ادخل بياناتك للوصول إلى المنصة</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="label label-required">البريد الإلكتروني</label>
                    <div className="relative">
                      <IconMail className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
                      <input
                        type="email" dir="ltr"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError('') }}
                        className="input input-with-icon text-right"
                        placeholder="example@parliament.iq"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label label-required">كلمة المرور</label>
                    <div className="relative">
                      <IconLock className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        className="input input-with-icon"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-[var(--color-danger-50)] border border-red-200 rounded-lg">
                      <svg className="w-5 h-5 text-[var(--color-danger-600)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-[var(--color-danger-700)]">{error}</p>
                    </div>
                  )}

                  <button type="submit" disabled={busy} className="btn-gold w-full btn-lg justify-center">
                    {busy ? <Spinner size="sm" /> : 'تسجيل الدخول'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
                  <p className="text-xs text-center text-[var(--color-navy-500)]">
                    للدعم الفني: <span className="font-mono" dir="ltr">support@parliament.iq</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Workflow */}
            <div className="mt-4 p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
              <p className="text-xs font-semibold text-[var(--color-gold-300)] mb-3 text-center">مسار الطلب البحثي</p>
              <div className="flex items-center justify-between gap-1">
                {['النائب', 'المدير', 'القسم', 'الباحث', 'المدقق'].map((step, i) => (
                  <div key={step} className="flex-1 flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[var(--color-gold-400)] to-[var(--color-gold-600)] flex items-center justify-center text-[var(--color-navy-950)] font-bold text-xs">
                      {i + 1}
                    </div>
                    <span className="text-[10px] text-[var(--color-navy-200)] mt-1">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Demo accounts */}
          <div className="lg:col-span-3">
            <div className="bg-white/8 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-gold-500)]/20 text-[var(--color-gold-300)] flex items-center justify-center">
                  <IconUser className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">حسابات تجريبية</h3>
                  <p className="text-xs text-[var(--color-navy-300)]">اضغط على بوابة ثم اختر مستخدماً للدخول السريع (كلمة المرور: 123456)</p>
                </div>
              </div>
              <div className="p-3 max-h-[480px] overflow-y-auto space-y-1.5">
                {PORTALS_META.map((portal) => {
                  const accounts = DEMO_ACCOUNTS.filter((a) => a.portal === portal.id)
                  const expanded = expandedPortal === portal.id
                  return (
                    <div key={portal.id} className="rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedPortal(expanded ? null : portal.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                          expanded ? 'bg-white/15' : 'hover:bg-white/10'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          portal.tone === 'gold'
                            ? 'bg-gradient-to-br from-[var(--color-gold-400)] to-[var(--color-gold-700)]'
                            : 'bg-gradient-to-br from-[var(--color-navy-400)] to-[var(--color-navy-700)]'
                        }`}>
                          <IconUser className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-white font-semibold text-sm">{portal.name}</p>
                          <p className="text-[var(--color-navy-300)] text-[11px]">{accounts.length} {accounts.length === 1 ? 'حساب' : 'حسابات'}</p>
                        </div>
                        <IconChevronDown className={`w-4 h-4 text-[var(--color-navy-300)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded && (
                        <div className="bg-black/10 mr-12 mb-1 rounded-lg overflow-hidden animate-fade-in">
                          {accounts.map((acc) => (
                            <button
                              key={acc.email}
                              onClick={() => fillCred(acc)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors text-right border-b border-white/5 last:border-0"
                            >
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold">
                                {acc.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{acc.name}</p>
                                <p className="text-[var(--color-navy-300)] text-[11px] font-mono truncate" dir="ltr">{acc.email}</p>
                              </div>
                              <span className="text-[var(--color-gold-300)] text-xs font-semibold">دخول سريع ←</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-navy-300)] mt-8">
          © {new Date().getFullYear()} مجلس النواب العراقي — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  )
}

function AppInner() {
  const [view, setView] = useState('login')
  const [user, setUser] = useState(null)

  const handleSuccess = (apiUser, portalId) => {
    setUser(apiUser)
    setView(portalId)
  }

  const handleLogout = async () => {
    try { await apiLogout() } catch { /* ignore */ }
    setUser(null)
    setView('login')
  }

  if (view === 'login') return <LoginPage onSuccess={handleSuccess} />
  if (view === 'deputy') return <DeputyPortal user={user} onLogout={handleLogout} />
  if (view === 'manager') return <ManagerPortal user={user} onLogout={handleLogout} />
  if (view === 'department') return <DepartmentPortal user={user} onLogout={handleLogout} />
  if (view === 'researcher') return <ResearcherPortal user={user} onLogout={handleLogout} />
  if (view === 'proofreader') return <ProofreaderPortal user={user} onLogout={handleLogout} />
  if (view === 'assistant') return <AssistantManagerPortal user={user} onLogout={handleLogout} />
  if (view === 'admin') return <SuperAdminPortal user={user} onLogout={handleLogout} />
  return null
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
