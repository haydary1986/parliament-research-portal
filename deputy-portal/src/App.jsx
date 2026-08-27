import { useState } from 'react'
import DeputyPortal from './DeputyPortal'
import ManagerPortal from './ManagerPortal'
import DepartmentPortal from './DepartmentPortal'
import ResearcherPortal from './ResearcherPortal'
import ProofreaderPortal from './ProofreaderPortal'
import AssistantManagerPortal from './AssistantManagerPortal'
import SuperAdminPortal from './SuperAdminPortal'
import { login as apiLogin, logout as apiLogout, setToken } from './api'
import Spinner from './components/ui/Spinner'
import { ToastProvider, useToast } from './components/ui/Toast'
import { IconMail, IconLock, IconEye, IconEyeOff, IconUser } from './components/icons/Icons'
import StateEmblem from './components/national/StateEmblem'
import CouncilLogo from './components/national/CouncilLogo'
import IraqFlag, { FlagStripe } from './components/national/IraqFlag'
import IslamicPattern from './components/national/IslamicPattern'
import BaghdadSkyline from './components/national/BaghdadSkyline'
import { REQUESTER_TYPES } from './lib/format'

const ROLE_TO_PORTAL = {
  deputy: 'deputy',
  manager: 'manager',
  department_head: 'department',
  researcher: 'researcher',
  proofreader: 'proofreader',
  assistant_manager: 'assistant',
  admin: 'admin',
}

// مسار الخدمة البحثية كما يراه المستفيد — مطابق للـ workflow المعتمد
const SERVICE_JOURNEY = [
  { step: 'تقديم الطلب', actor: 'الجهة الطالبة' },
  { step: 'الإحالة إلى القسم', actor: 'مدير الدائرة' },
  { step: 'إعداد البحث', actor: 'الباحث' },
  { step: 'التدقيق اللغوي', actor: 'المدقق اللغوي' },
  { step: 'التدقيق النهائي', actor: 'المعاون' },
  { step: 'تسليم البحث', actor: 'رئيس القسم أو مدير الدائرة' },
]

// =============================================
// حسابات الاختبار — دخول بضغطة واحدة
// =============================================
// ⚠️ تكشف بيانات دخول كل الأدوار — بما فيها الأدمن — لأي زائر.
// مقصودة للفحص أثناء التطوير والعرض. لإخفائها عند التشغيل الرسمي:
// اضبط VITE_SHOW_DEMO_ACCOUNTS=false وأعد البناء (لا حاجة لتعديل الشيفرة).
const SHOW_DEMO_ACCOUNTS = import.meta.env.VITE_SHOW_DEMO_ACCOUNTS !== 'false'
const DEMO_PASSWORD = '123456'

const DEMO_GROUPS = [
  {
    portal: 'الجهات الطالبة',
    accounts: [
      { email: 'khaled@parliament.iq', name: 'د. خالد العبيدي', hint: 'اللجنة المالية' },
      { email: 'sara@parliament.iq', name: 'أ. سارة عبدالرحمن', hint: 'اللجنة القانونية' },
    ],
  },
  {
    portal: 'مدير الدائرة',
    accounts: [{ email: 'manager@parliament.iq', name: 'مدير الدائرة', hint: 'الإحالة والتقارير' }],
  },
  {
    portal: 'رؤساء الأقسام',
    accounts: [
      { email: 'suad@parliament.iq', name: 'د. سعاد العلوي', hint: 'قسم البحوث' },
      { email: 'hassan@parliament.iq', name: 'أ. حسن الربيعي', hint: 'بحوث الموازنة' },
      { email: 'ali.m@parliament.iq', name: 'أ. علي الموسوي', hint: 'الدراسات القانونية' },
    ],
  },
  {
    portal: 'الباحثون',
    accounts: [
      { email: 'nour@parliament.iq', name: 'د. نور الدين', hint: 'قسم البحوث' },
      { email: 'rana@parliament.iq', name: 'أ. رنا علي', hint: 'الدراسات القانونية' },
    ],
  },
  {
    portal: 'المدققون اللغويون',
    accounts: [
      { email: 'mohammed.k@parliament.iq', name: 'أ. محمد الخطاط', hint: '' },
      { email: 'huda@parliament.iq', name: 'أ. هدى السامرائي', hint: '' },
    ],
  },
  {
    portal: 'المعاون',
    accounts: [{ email: 'assistant@parliament.iq', name: 'د. عبدالكريم الأنصاري', hint: 'التدقيق النهائي' }],
  },
  {
    portal: 'مدير النظام',
    accounts: [{ email: 'admin@parliament.iq', name: 'مدير النظام', hint: 'إدارة كاملة' }],
  },
]

function LoginPage({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [error, setError] = useState('')
  const toast = useToast()

  // منطق الدخول الوحيد — يستخدمه النموذج وأزرار الدخول السريع معاً
  const doLogin = async (loginEmail, loginPassword) => {
    setError('')
    setBusy(true)
    setPendingEmail(loginEmail)
    try {
      const data = await apiLogin(loginEmail, loginPassword)
      if (data.success) {
        const apiUser = data.data.user
        setToken(data.data.token)
        const portalId = ROLE_TO_PORTAL[apiUser.role] || 'deputy'
        toast.success(`أهلاً ${apiUser.name}`)
        onSuccess({ ...apiUser, email: loginEmail, portal: portalId }, portalId)
      } else {
        setError(data.message || 'فشل تسجيل الدخول')
      }
    } catch (err) {
      setError(err.message || 'فشل الاتصال بالخادم')
    } finally {
      setBusy(false)
      setPendingEmail('')
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    doLogin(email, password)
  }

  return (
    <div className="relative min-h-screen login-bg flex items-center justify-center p-3 sm:p-4 overflow-hidden" dir="rtl">
      {/* ===== طبقات الخلفية الوطنية ===== */}
      <IslamicPattern className="absolute inset-0" opacity={0.06} />
      <BaghdadSkyline
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full min-w-[1000px]"
        color="#0F3157"
      />
      {/* تعتيم متدرج يحافظ على وضوح المحتوى فوق الرسم */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(5,22,40,0.72), transparent 100%)' }}
      />

      {/* شريط العلم العراقي أعلى الصفحة */}
      <FlagStripe className="absolute top-0 inset-x-0 z-10" height={5} />

      <div className="relative z-10 w-full max-w-5xl py-8 sm:py-10">
        {/* ===== الترويسة الرسمية ===== */}
        <header className="text-center mb-8 sm:mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <StateEmblem size={40} className="sm:!w-12 sm:!h-12" />
            <p className="text-[10px] sm:text-xs font-bold tracking-[0.3em] text-[var(--color-gold-400)]">
              جمهورية العراق
            </p>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">مجلس النواب العراقي</h1>

          <div className="flex items-center justify-center gap-2 sm:gap-3 mt-2">
            <span aria-hidden="true" className="h-px w-10 sm:w-20 bg-gradient-to-l from-[var(--color-gold-500)] to-transparent" />
            <p className="text-sm sm:text-base font-semibold text-[var(--color-gold-300)]">دائرة البحوث والدراسات النيابية</p>
            <span aria-hidden="true" className="h-px w-10 sm:w-20 bg-gradient-to-r from-[var(--color-gold-500)] to-transparent" />
          </div>

          <p className="text-xs sm:text-sm text-[var(--color-navy-200)] mt-2">منصة إدارة البحوث البرلمانية</p>
        </header>

        {/* ===== عمودان: بطاقة الدخول + التعريف بالخدمة ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">

          {/* --- بطاقة تسجيل الدخول (الإجراء الرئيسي) --- */}
          <div className="lg:col-span-5 lg:order-2">
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden">
              <FlagStripe height={5} />
              <img
                src="/national/emblem-iraq.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -left-8 -bottom-8 w-36 opacity-[0.035] select-none"
                draggable="false"
              />
              <div className="relative p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <StateEmblem size={40} />
                  <div>
                    <h2 className="text-xl font-bold text-[var(--color-navy-900)] leading-tight">تسجيل الدخول</h2>
                    <p className="text-sm text-[var(--color-navy-500)]">للمستخدمين المخوَّلين حصراً</p>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className="label label-required">البريد الإلكتروني</label>
                    <div className="relative">
                      <IconMail aria-hidden="true" className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
                      <input
                        id="login-email"
                        type="email" dir="ltr"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError('') }}
                        className="input input-with-icon text-right"
                        placeholder="example@parliament.iq"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-password" className="label label-required">كلمة المرور</label>
                    <div className="relative">
                      <IconLock aria-hidden="true" className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-navy-400)]" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        className="input input-with-icon pl-11"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-lg text-[var(--color-navy-500)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-navy-900)] transition-colors"
                        aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        aria-pressed={showPassword}
                      >
                        {showPassword
                          ? <IconEyeOff aria-hidden="true" className="w-5 h-5" />
                          : <IconEye aria-hidden="true" className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="flex items-start gap-2 px-4 py-3 bg-[var(--color-danger-50)] border border-red-200 rounded-lg">
                      <svg aria-hidden="true" className="w-5 h-5 text-[var(--color-danger-600)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-[var(--color-danger-700)]">{error}</p>
                    </div>
                  )}

                  <button type="submit" disabled={busy} className="btn-gold w-full btn-lg justify-center">
                    {busy ? <><Spinner size="sm" /><span>جاري التحقق...</span></> : 'تسجيل الدخول'}
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-[var(--color-border)] space-y-1.5">
                  <p className="text-xs text-center text-[var(--color-navy-500)]">
                    للدعم الفني: <a href="mailto:support@parliament.iq" className="touch-link font-mono text-[var(--color-navy-700)] hover:text-[var(--color-gold-700)] underline" dir="ltr">support@parliament.iq</a>
                  </p>
                  <p className="text-[11px] text-center text-[var(--color-navy-400)]">
                    تُسجَّل جميع عمليات الدخول لأغراض التدقيق الأمني
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* --- التعريف بالخدمة --- */}
          <div className="lg:col-span-7 lg:order-1 space-y-5">
            {/* شعار المجلس بين علمين */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <IraqFlag width={54} className="hidden sm:block" wave />
              <CouncilLogo size={112} className="sm:!w-32 sm:!h-32" glow />
              <IraqFlag width={54} className="hidden sm:block" wave />
            </div>

            {/* دخول سريع للفحص — ضغطة واحدة تدخل مباشرةً */}
            {SHOW_DEMO_ACCOUNTS && (
              <section className="rounded-2xl bg-white/[0.06] backdrop-blur border border-white/10 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/10 flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 w-8 h-8 rounded-lg bg-[var(--color-gold-500)]/20 text-[var(--color-gold-300)] flex items-center justify-center flex-shrink-0"
                  >
                    <IconUser className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-[var(--color-gold-300)]">دخول سريع — حسابات الفحص</h2>
                    <p className="text-[11px] text-[var(--color-navy-300)] mt-0.5">
                      اضغط أي حساب لتدخل بوابته مباشرةً · كلمة المرور الموحّدة{' '}
                      <span className="font-mono text-[var(--color-navy-200)]" dir="ltr">{DEMO_PASSWORD}</span>
                    </p>
                  </div>
                </div>

                <div className="p-3 max-h-[26rem] overflow-y-auto space-y-3">
                  {DEMO_GROUPS.map((group) => (
                    <div key={group.portal}>
                      <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--color-navy-400)] px-1 mb-1.5">
                        {group.portal}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {group.accounts.map((acc) => {
                          const loading = busy && pendingEmail === acc.email
                          return (
                            <button
                              key={acc.email}
                              type="button"
                              onClick={() => doLogin(acc.email, DEMO_PASSWORD)}
                              disabled={busy}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.14] hover:border-[var(--color-gold-500)]/40 disabled:opacity-50 transition-colors text-right"
                            >
                              <span
                                aria-hidden="true"
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-gold-400)] to-[var(--color-gold-700)] text-[var(--color-navy-950)] flex items-center justify-center text-xs font-bold flex-shrink-0"
                              >
                                {loading ? <Spinner size="sm" /> : acc.name.replace(/^(د\.|أ\.)\s*/, '')[0]}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-[13px] font-semibold text-white truncate">{acc.name}</span>
                                <span className="block text-[10px] text-[var(--color-navy-300)] truncate">
                                  {acc.hint || acc.email}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* مسار الخدمة البحثية */}
            <section className="p-5 rounded-2xl bg-white/[0.06] backdrop-blur border border-white/10">
              <h2 className="text-sm font-bold text-[var(--color-gold-300)] mb-4">مسار الخدمة البحثية</h2>
              <ol className="space-y-2.5">
                {SERVICE_JOURNEY.map((s, i) => (
                  <li key={s.step} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="w-7 h-7 flex-shrink-0 rounded-full bg-gradient-to-b from-[var(--color-gold-400)] to-[var(--color-gold-600)] flex items-center justify-center text-[var(--color-navy-950)] font-bold text-xs"
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-white font-medium">{s.step}</span>
                    <span aria-hidden="true" className="flex-1 h-px bg-white/10" />
                    <span className="text-[11px] text-[var(--color-navy-300)]">{s.actor}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* الجهات المستفيدة */}
            <section className="p-5 rounded-2xl bg-white/[0.06] backdrop-blur border border-white/10">
              <h2 className="text-sm font-bold text-[var(--color-gold-300)] mb-3">الجهات المستفيدة من الخدمة</h2>
              <ul className="flex flex-wrap gap-2">
                {Object.entries(REQUESTER_TYPES).map(([key, label]) => (
                  <li
                    key={key}
                    className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-xs font-medium text-white"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <footer className="flex flex-col items-center gap-2 mt-10">
          <IraqFlag width={40} />
          <p className="text-center text-xs text-[var(--color-navy-300)]">
            © {new Date().getFullYear()} جمهورية العراق — مجلس النواب العراقي — جميع الحقوق محفوظة
          </p>
        </footer>
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
