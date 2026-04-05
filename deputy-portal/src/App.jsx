import { useState } from 'react'
import DeputyPortal from './DeputyPortal'
import ManagerPortal from './ManagerPortal'
import DepartmentPortal from './DepartmentPortal'
import ResearcherPortal from './ResearcherPortal'
import ProofreaderPortal from './ProofreaderPortal'
import SuperAdminPortal from './SuperAdminPortal'
import { login as apiLogin, logout as apiLogout, setToken } from './api'

function App() {
  const [currentPortal, setCurrentPortal] = useState('login')
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)
  const [selectedCredPortal, setSelectedCredPortal] = useState(null)

  // بيانات تجريبية للعرض فقط (بدون كلمات مرور)
  const demoAccounts = [
    { email: 'khaled@parliament.iq', portal: 'deputy', name: 'د. خالد العبيدي' },
    { email: 'manager@parliament.iq', portal: 'manager', name: 'أ. خالد عبدالله المحمدي' },
    { email: 'suad@parliament.iq', portal: 'department', name: 'د. سعاد العلوي' },
    { email: 'nour@parliament.iq', portal: 'researcher', name: 'د. نور الدين' },
    { email: 'mohammed.k@parliament.iq', portal: 'proofreader', name: 'أ. محمد الخطاط' },
    { email: 'admin@parliament.iq', portal: 'admin', name: 'مدير النظام' },
  ]

  // بيانات البوابات للعرض
  const portals = [
    {
      id: 'deputy',
      name: 'بوابة السادة النواب',
      desc: 'تقديم طلبات البحوث والدراسات ومتابعتها',
      color: 'from-amber-400 to-yellow-500',
      textColor: 'text-amber-200',
      borderColor: 'border-amber-400/50',
      icon: (
        <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      users: () => demoAccounts.filter(u => u.portal === 'deputy'),
    },
    {
      id: 'manager',
      name: 'بوابة مدير الدائرة',
      desc: 'إدارة الطلبات وتوجيهها للأقسام المختصة',
      color: 'from-emerald-400 to-green-500',
      textColor: 'text-emerald-200',
      borderColor: 'border-emerald-400/50',
      icon: (
        <svg className="w-6 h-6 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      users: () => demoAccounts.filter(u => u.portal === 'manager'),
    },
    {
      id: 'department',
      name: 'بوابة الأقسام',
      desc: 'استلام الطلبات والعمل عليها وتسليمها',
      color: 'from-indigo-400 to-purple-500',
      textColor: 'text-indigo-200',
      borderColor: 'border-indigo-400/50',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      users: () => demoAccounts.filter(u => u.portal === 'department'),
    },
    {
      id: 'researcher',
      name: 'بوابة الباحثين',
      desc: 'إعداد البحوث وطلب المعلومات من الجهات',
      color: 'from-cyan-400 to-teal-500',
      textColor: 'text-cyan-200',
      borderColor: 'border-cyan-400/50',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      users: () => demoAccounts.filter(u => u.portal === 'researcher'),
    },
    {
      id: 'proofreader',
      name: 'بوابة المدقق اللغوي',
      desc: 'تدقيق البحوث لغوياً وإعادتها للباحث',
      color: 'from-rose-400 to-pink-500',
      textColor: 'text-rose-200',
      borderColor: 'border-rose-400/50',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      users: () => demoAccounts.filter(u => u.portal === 'proofreader'),
    },
    {
      id: 'admin',
      name: 'لوحة تحكم السوبر أدمن',
      desc: 'إدارة المستخدمين والأقسام والنظام',
      color: 'from-purple-500 to-purple-700',
      textColor: 'text-purple-200',
      borderColor: 'border-purple-400/50',
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      users: () => demoAccounts.filter(u => u.portal === 'admin'),
    },
  ]

  // تسجيل الدخول
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    setIsLoggingIn(true)

    try {
      // محاولة الدخول عبر API أولاً
      const data = await apiLogin(loginEmail, loginPassword)
      if (data.success) {
        const apiUser = data.data.user
        setToken(data.data.token)

        // تحديد البوابة حسب الدور
        const roleToPortal = {
          deputy: 'deputy',
          manager: 'manager',
          department_head: 'department',
          researcher: 'researcher',
          proofreader: 'proofreader',
          admin: 'admin',
        }

        const portalId = roleToPortal[apiUser.role] || 'deputy'
        setLoggedInUser({ ...apiUser, email: loginEmail, portal: portalId })
        setCurrentPortal(portalId)
        setIsLoggingIn(false)
        return
      }
    } catch (err) {
      setLoginError(err.message || 'فشل الاتصال بالخادم. تأكد من تشغيل السيرفر')
    }
    setIsLoggingIn(false)
  }

  // تعبئة الحقول تلقائياً عند الضغط على مستخدم
  const handleFillCredentials = (user) => {
    setLoginEmail(user.email)
    setLoginPassword('')
    setLoginError('')
    setShowCredentials(false)
    setSelectedCredPortal(null)
  }

  // صفحة تسجيل الدخول
  if (currentPortal === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-5xl">
          {/* الشعار */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg viewBox="0 0 100 100" className="w-14 h-14 text-slate-900">
                <circle cx="50" cy="30" r="15" fill="currentColor"/>
                <path d="M20 85 L50 50 L80 85 Z" fill="currentColor"/>
                <rect x="45" y="45" width="10" height="25" fill="currentColor"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">مجلس النواب العراقي</h1>
            <p className="text-lg text-blue-300">دائرة البحوث والدراسات</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* نموذج تسجيل الدخول */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              <h2 className="text-xl font-bold text-white text-center mb-6">تسجيل الدخول</h2>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-blue-200 text-sm mb-2">البريد الإلكتروني</label>
                  <div className="relative">
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      placeholder="example@parliament.iq"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-blue-200 text-sm mb-2">كلمة المرور</label>
                  <div className="relative">
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      placeholder="أدخل كلمة المرور"
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-200 text-sm text-center">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-bold py-3 rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50"
                >
                  {isLoggingIn ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                </button>
              </form>

              {/* مسار الطلب */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-bold text-white mb-3 text-center">مسار الطلب</h3>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {[
                    { num: '1', label: 'النائب', color: 'bg-amber-500' },
                    { num: '2', label: 'المدير', color: 'bg-emerald-500' },
                    { num: '3', label: 'القسم', color: 'bg-indigo-500' },
                    { num: '4', label: 'الباحث', color: 'bg-cyan-500' },
                    { num: '5', label: 'المدقق', color: 'bg-rose-500' },
                  ].map((step, i) => (
                    <div key={step.num} className="flex items-center gap-1">
                      <div className={`w-7 h-7 ${step.color} rounded-full flex items-center justify-center text-white font-bold text-xs`}>{step.num}</div>
                      <span className="text-slate-400 text-xs">{step.label}</span>
                      {i < 4 && (
                        <svg className="w-4 h-4 text-slate-600 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8l-4 4m0 0l4 4m-4-4h18" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-slate-400 text-xs">للدعم الفني: support@parliament.iq</p>
              </div>
            </div>

            {/* بيانات تسجيل الدخول حسب البوابة */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-6 py-4 bg-white/5 border-b border-white/10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  بيانات الدخول التجريبية
                </h3>
                <p className="text-slate-400 text-xs mt-1">اضغط على اسم البوابة لعرض البيانات، ثم اضغط على المستخدم لتعبئة الحقول تلقائياً</p>
              </div>

              <div className="p-3 max-h-[420px] overflow-y-auto space-y-1">
                {portals.map(portal => (
                  <div key={portal.id}>
                    <button
                      onClick={() => setSelectedCredPortal(selectedCredPortal === portal.id ? null : portal.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        selectedCredPortal === portal.id
                          ? 'bg-white/15 border border-white/20'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-9 h-9 bg-gradient-to-br ${portal.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        {portal.icon}
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-white font-semibold text-sm">{portal.name}</p>
                        <p className="text-slate-400 text-xs">{portal.users().length} مستخدم</p>
                      </div>
                      <svg className={`w-4 h-4 text-slate-400 transition-transform ${selectedCredPortal === portal.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* قائمة المستخدمين */}
                    {selectedCredPortal === portal.id && (
                      <div className="mr-12 mb-2 space-y-1">
                        {portal.users().map(user => (
                          <button
                            key={user.email}
                            onClick={() => handleFillCredentials(user)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 transition-all group text-right"
                          >
                            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-white/20">
                              <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{user.name}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-slate-400 text-xs font-mono" dir="ltr">{user.email}</span>
                                <span className="text-slate-500 text-xs">|</span>
                                <span className="text-slate-400 text-xs">اضغط لتعبئة الإيميل</span>
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    await apiLogout()
    setCurrentPortal('login')
    setLoggedInUser(null)
    setLoginEmail('')
    setLoginPassword('')
    setLoginError('')
  }

  if (currentPortal === 'deputy') {
    return <DeputyPortal onSwitchPortal={handleLogout} user={loggedInUser} />
  }

  if (currentPortal === 'manager') {
    return <ManagerPortal onSwitchPortal={handleLogout} user={loggedInUser} />
  }

  if (currentPortal === 'department') {
    return <DepartmentPortal onSwitchPortal={handleLogout} user={loggedInUser} />
  }

  if (currentPortal === 'researcher') {
    return <ResearcherPortal onSwitchPortal={handleLogout} user={loggedInUser} />
  }

  if (currentPortal === 'proofreader') {
    return <ProofreaderPortal onSwitchPortal={handleLogout} user={loggedInUser} />
  }

  if (currentPortal === 'admin') {
    return <SuperAdminPortal onSwitchPortal={handleLogout} user={loggedInUser} />
  }

  return null
}

export default App
