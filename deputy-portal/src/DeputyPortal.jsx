import { useState, useEffect } from 'react';
import * as api from './api';
import { User, Lock, FileText, Send, Clock, CheckCircle, AlertCircle, LogOut, Plus, Eye, Download, Bell, Home, List, Settings, ChevronLeft, Phone, Mail, Building, Target, Heart, ArrowLeft } from 'lucide-react';

export default function DeputyPortal({ onSwitchPortal, user }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loginData, setLoginData] = useState({ deputyId: '', password: '' });
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // استمارة طلب الخدمة الجديدة
  const [serviceRequest, setServiceRequest] = useState({
    // بيانات طالب الخدمة
    requesterName: '',
    workplace: [], // اللجان المختارة
    phone: '',
    email: '',
    // الغرض من الخدمة
    purpose: {
      oversight: false,      // رقابي
      legislative: false,    // تشريعي
      otherActivities: false // أنشطة أخرى
    },
    otherPurposeText: '',
    // تفاصيل الخدمة
    serviceTitle: '',
    serviceType: '',
    department: '',
    description: '',
    priority: 'normal',
    deadline: '',
    attachments: []
  });

  // قائمة اللجان البرلمانية
  const committees = [
    'اللجنة المالية',
    'اللجنة القانونية',
    'لجنة الأمن والدفاع',
    'لجنة العلاقات الخارجية',
    'لجنة النفط والطاقة',
    'لجنة الصحة والبيئة',
    'لجنة التربية والتعليم',
    'لجنة حقوق الإنسان',
    'لجنة الزراعة والمياه',
    'لجنة الاقتصاد والاستثمار',
    'لجنة الخدمات والإعمار',
    'لجنة الأوقاف والشؤون الدينية',
    'لجنة المرأة والأسرة والطفولة',
    'لجنة الشهداء والسجناء السياسيين',
    'لجنة النزاهة',
    'لجنة الثقافة والإعلام',
    'لجنة العمل والشؤون الاجتماعية',
    'لجنة الأقاليم والمحافظات',
  ];

  // بيانات النائب من الـ API
  const deputyInfo = {
    name: user?.name || 'نائب',
    id: user?.deputy_id || user?.email || '',
    committee: user?.committee || '',
    image: null
  };

  // طلبات من الـ API
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const statusMap = {
    pending: { label: 'بانتظار التوجيه', color: 'bg-orange-500' },
    assigned: { label: 'تم التوجيه', color: 'bg-blue-500' },
    confirmed: { label: 'تم التأكيد', color: 'bg-indigo-500' },
    in_progress: { label: 'قيد الإعداد', color: 'bg-blue-500' },
    review: { label: 'قيد المراجعة', color: 'bg-yellow-500' },
    proofreading: { label: 'قيد التدقيق', color: 'bg-purple-500' },
    completed: { label: 'مكتمل', color: 'bg-green-500' },
    returned_exists: { label: 'مُرجع', color: 'bg-red-500' },
  };

  useEffect(() => {
    if (!isLoggedIn || !api.getToken()) { setLoadingData(false); return; }
    const load = async () => {
      try {
        const [reqRes, notifRes] = await Promise.all([
          api.getRequests(),
          api.getNotifications().catch(() => ({ success: true, data: [] })),
        ]);
        if (reqRes.success && reqRes.data) {
          setRequests(reqRes.data.map(r => ({
            id: r.id, title: r.title, type: r.purpose || 'بحث',
            department: r.assigned_department || 'لم يُحال بعد',
            status: statusMap[r.status]?.label || r.status,
            statusColor: statusMap[r.status]?.color || 'bg-gray-500',
            date: r.date_received?.split('T')[0] || '',
            description: r.description,
            rawStatus: r.status,
          })));
        }
        if (notifRes.success && notifRes.data) {
          setNotifications(notifRes.data.map(n => ({
            id: n.id, text: n.message || n.title,
            time: new Date(n.created_at).toLocaleString('ar-IQ'),
            read: n.is_read,
          })));
        }
      } catch {}
      setLoadingData(false);
    };
    load();
  }, [isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.deputyId && loginData.password) {
      setIsLoggedIn(true);
    }
  };

  const handleDownloadPDF = (req) => {
    const content = `
منصة البحوث البرلمانية
================================
رقم الطلب: ${req.id}
العنوان: ${req.title}
النوع: ${req.type}
القسم: ${req.department}
الحالة: ${req.status}
تاريخ الطلب: ${req.date}
================================
مقدم الطلب: ${deputyInfo.name}
رقم النائب: ${deputyInfo.id}
اللجنة: ${deputyInfo.committee}
================================
    `.trim();

    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${req.id}-${req.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCommitteeChange = (committee) => {
    setServiceRequest(prev => ({
      ...prev,
      workplace: prev.workplace.includes(committee)
        ? prev.workplace.filter(c => c !== committee)
        : [...prev.workplace, committee]
    }));
  };

  const handlePurposeChange = (purposeType) => {
    setServiceRequest(prev => ({
      ...prev,
      purpose: {
        ...prev.purpose,
        [purposeType]: !prev.purpose[purposeType]
      }
    }));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!serviceRequest.requesterName || serviceRequest.workplace.length === 0 || !serviceRequest.serviceTitle) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!serviceRequest.purpose.oversight && !serviceRequest.purpose.legislative && !serviceRequest.purpose.otherActivities) {
      alert('يرجى اختيار الغرض من الخدمة');
      return;
    }

    // إرسال للـ API
    const purpose = serviceRequest.purpose.oversight ? 'oversight' : serviceRequest.purpose.legislative ? 'legislative' : 'other';
    try {
      const res = await api.createRequest({
        title: serviceRequest.serviceTitle,
        description: serviceRequest.description || serviceRequest.serviceTitle,
        purpose: purpose,
      });
      if (res.success) {
        alert('تم تقديم الطلب بنجاح! رقم الطلب: ' + (res.data?.id || ''));
        // إعادة تحميل الطلبات
        const reqRes = await api.getRequests();
        if (reqRes.success && reqRes.data) {
          setRequests(reqRes.data.map(r => ({
            id: r.id, title: r.title, type: r.purpose || 'بحث',
            department: r.assigned_department || 'لم يُحال بعد',
            status: statusMap[r.status]?.label || r.status,
            statusColor: statusMap[r.status]?.color || 'bg-gray-500',
            date: r.date_received?.split('T')[0] || '', rawStatus: r.status,
          })));
        }
      } else {
        alert(res.message || 'فشل تقديم الطلب');
        return;
      }
    } catch (err) {
      alert(err.message || 'خطأ في الاتصال');
      return;
    }
    
    // إعادة تعيين الاستمارة
    setServiceRequest({
      requesterName: '',
      workplace: [],
      phone: '',
      email: '',
      purpose: {
        oversight: false,
        legislative: false,
        otherActivities: false
      },
      otherPurposeText: '',
      serviceTitle: '',
      serviceType: '',
      department: '',
      description: '',
      priority: 'normal',
      deadline: '',
      attachments: []
    });
    setCurrentPage('requests');
  };

  // صفحة تسجيل الدخول
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          {/* زر العودة */}
          {onSwitchPortal && (
            <button
              onClick={onSwitchPortal}
              className="mb-6 flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              العودة للصفحة الرئيسية
            </button>
          )}

          {/* الشعار والعنوان */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg viewBox="0 0 100 100" className="w-16 h-16 text-slate-900">
                <circle cx="50" cy="30" r="15" fill="currentColor"/>
                <path d="M20 85 L50 50 L80 85 Z" fill="currentColor"/>
                <rect x="45" y="45" width="10" height="25" fill="currentColor"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">مجلس النواب العراقي</h1>
            <p className="text-blue-300">بوابة السادة النواب - دائرة البحوث والدراسات</p>
          </div>

          {/* نموذج تسجيل الدخول */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-6">تسجيل الدخول</h2>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-blue-200 text-sm mb-2">رقم النائب</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                  <input
                    type="text"
                    value={loginData.deputyId}
                    onChange={(e) => setLoginData({...loginData, deputyId: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    placeholder="أدخل رقم النائب"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-blue-200 text-sm mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300" />
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-blue-200 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/10 text-amber-400 focus:ring-amber-400" />
                  تذكرني
                </label>
                <a href="#" className="text-amber-400 hover:text-amber-300">نسيت كلمة المرور؟</a>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-bold py-3 rounded-xl hover:from-amber-500 hover:to-yellow-600 transition-all shadow-lg shadow-amber-500/30"
              >
                دخول
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-blue-300 text-sm">للمساعدة التقنية:</p>
              <p className="text-white text-sm mt-1">support@parliament.iq</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // لوحة التحكم الرئيسية بعد تسجيل الدخول
  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* الشريط العلوي */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-8 h-8 text-slate-900">
                <circle cx="50" cy="30" r="15" fill="currentColor"/>
                <path d="M20 85 L50 50 L80 85 Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold">دائرة البحوث والدراسات</h1>
              <p className="text-xs text-blue-300">مجلس النواب العراقي</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* الإشعارات */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">2</span>
              </button>
              
              {showNotifications && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="bg-slate-800 text-white px-4 py-3 font-bold">الإشعارات</div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${!notif.read ? 'bg-blue-50' : ''}`}>
                        <p className="text-sm text-slate-700">{notif.text}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* معلومات النائب */}
            <div className="flex items-center gap-3 bg-white/10 rounded-full pr-2 pl-4 py-1">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{deputyInfo.name}</p>
                <p className="text-xs text-blue-300">{deputyInfo.committee}</p>
              </div>
            </div>

            <button 
              onClick={() => setIsLoggedIn(false)}
              className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-400"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* القائمة الجانبية */}
        <aside className="w-64 flex-shrink-0">
          <nav className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900">
              <p className="font-bold">القائمة الرئيسية</p>
            </div>
            <div className="p-2">
              {[
                { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
                { id: 'new-request', label: 'طلب جديد', icon: Plus },
                { id: 'requests', label: 'طلباتي', icon: List },
                { id: 'completed', label: 'البحوث المكتملة', icon: CheckCircle },
                { id: 'volunteer', label: 'البحوث التطوعية', icon: Heart },
                { id: 'settings', label: 'الإعدادات', icon: Settings },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    currentPage === item.id 
                      ? 'bg-blue-500 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        </aside>

        {/* المحتوى الرئيسي */}
        <main className="flex-1">
          {/* لوحة التحكم */}
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              {/* الإحصائيات */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي الطلبات', value: '12', icon: FileText, color: 'from-blue-500 to-blue-600' },
                  { label: 'قيد الإعداد', value: '3', icon: Clock, color: 'from-yellow-500 to-orange-500' },
                  { label: 'قيد المراجعة', value: '2', icon: Eye, color: 'from-purple-500 to-purple-600' },
                  { label: 'مكتملة', value: '7', icon: CheckCircle, color: 'from-green-500 to-green-600' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-slate-500 text-sm">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* آخر الطلبات */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">آخر الطلبات</h2>
                  <button 
                    onClick={() => setCurrentPage('requests')}
                    className="text-blue-500 text-sm hover:text-blue-600 flex items-center gap-1"
                  >
                    عرض الكل <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {requests.map(req => (
                    <div key={req.id} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{req.title}</p>
                          <p className="text-sm text-slate-500">{req.type} • {req.department}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs text-white ${req.statusColor}`}>
                          {req.status}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">{req.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* زر طلب جديد سريع */}
              <button
                onClick={() => setCurrentPage('new-request')}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-bold py-4 rounded-2xl hover:from-amber-500 hover:to-yellow-600 transition-all shadow-lg flex items-center justify-center gap-3"
              >
                <Plus className="w-6 h-6" />
                تقديم طلب خدمة جديد
              </button>
            </div>
          )}

          {/* صفحة طلب جديد - الاستمارة المحدثة */}
          {currentPage === 'new-request' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <h2 className="text-xl font-bold">استمارة طلب خدمة</h2>
                <p className="text-blue-100 text-sm mt-1">دائرة البحوث والدراسات - مجلس النواب العراقي</p>
              </div>
              
              <form onSubmit={handleSubmitRequest} className="p-6 space-y-8">
                
                {/* ===== القسم الأول: بيانات طالب الخدمة ===== */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    بيانات طالب الخدمة
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* اسم طالب الخدمة */}
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2">
                        اسم طالب الخدمة <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={serviceRequest.requesterName}
                          onChange={(e) => setServiceRequest({...serviceRequest, requesterName: e.target.value})}
                          className="w-full border border-slate-300 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="الاسم الثلاثي"
                          required
                        />
                      </div>
                    </div>

                    {/* رقم الهاتف */}
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2">
                        رقم الهاتف <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={serviceRequest.phone}
                          onChange={(e) => setServiceRequest({...serviceRequest, phone: e.target.value})}
                          className="w-full border border-slate-300 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="07XX XXX XXXX"
                          required
                        />
                      </div>
                    </div>

                    {/* البريد الإلكتروني */}
                    <div className="md:col-span-2">
                      <label className="block text-slate-700 font-semibold mb-2">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="email"
                          value={serviceRequest.email}
                          onChange={(e) => setServiceRequest({...serviceRequest, email: e.target.value})}
                          className="w-full border border-slate-300 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="example@parliament.iq"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== القسم الثاني: مكان العمل (اللجان) ===== */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-500" />
                    مكان العمل (اللجنة البرلمانية) <span className="text-red-500">*</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {committees.map((committee, idx) => (
                      <label 
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          serviceRequest.workplace.includes(committee)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={serviceRequest.workplace.includes(committee)}
                          onChange={() => handleCommitteeChange(committee)}
                          className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">{committee}</span>
                      </label>
                    ))}
                  </div>
                  
                  {serviceRequest.workplace.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-100 rounded-xl">
                      <p className="text-sm text-blue-800">
                        <strong>اللجان المختارة:</strong> {serviceRequest.workplace.join(' ، ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* ===== القسم الثالث: الغرض من الخدمة ===== */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    الغرض من الخدمة <span className="text-red-500">*</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* رقابي */}
                    <label 
                      className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                        serviceRequest.purpose.oversight
                          ? 'border-green-500 bg-green-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={serviceRequest.purpose.oversight}
                        onChange={() => handlePurposeChange('oversight')}
                        className="w-6 h-6 rounded border-slate-300 text-green-500 focus:ring-green-500"
                      />
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                          serviceRequest.purpose.oversight ? 'bg-green-500' : 'bg-slate-200'
                        }`}>
                          <Eye className={`w-8 h-8 ${serviceRequest.purpose.oversight ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className={`font-bold text-lg ${serviceRequest.purpose.oversight ? 'text-green-700' : 'text-slate-600'}`}>
                          رقابي
                        </span>
                        <p className="text-xs text-slate-500 mt-1">متابعة ومراقبة أداء الحكومة</p>
                      </div>
                    </label>

                    {/* تشريعي */}
                    <label 
                      className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                        serviceRequest.purpose.legislative
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={serviceRequest.purpose.legislative}
                        onChange={() => handlePurposeChange('legislative')}
                        className="w-6 h-6 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                          serviceRequest.purpose.legislative ? 'bg-blue-500' : 'bg-slate-200'
                        }`}>
                          <FileText className={`w-8 h-8 ${serviceRequest.purpose.legislative ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className={`font-bold text-lg ${serviceRequest.purpose.legislative ? 'text-blue-700' : 'text-slate-600'}`}>
                          تشريعي
                        </span>
                        <p className="text-xs text-slate-500 mt-1">إعداد ومراجعة القوانين</p>
                      </div>
                    </label>

                    {/* أنشطة أخرى */}
                    <label 
                      className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                        serviceRequest.purpose.otherActivities
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={serviceRequest.purpose.otherActivities}
                        onChange={() => handlePurposeChange('otherActivities')}
                        className="w-6 h-6 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                      />
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${
                          serviceRequest.purpose.otherActivities ? 'bg-purple-500' : 'bg-slate-200'
                        }`}>
                          <Plus className={`w-8 h-8 ${serviceRequest.purpose.otherActivities ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <span className={`font-bold text-lg ${serviceRequest.purpose.otherActivities ? 'text-purple-700' : 'text-slate-600'}`}>
                          أنشطة أخرى
                        </span>
                        <p className="text-xs text-slate-500 mt-1">أنشطة برلمانية متنوعة</p>
                      </div>
                    </label>
                  </div>

                  {/* حقل إضافي لتوضيح الأنشطة الأخرى */}
                  {serviceRequest.purpose.otherActivities && (
                    <div className="mt-4">
                      <label className="block text-slate-700 font-semibold mb-2">
                        يرجى توضيح النشاط
                      </label>
                      <input
                        type="text"
                        value={serviceRequest.otherPurposeText}
                        onChange={(e) => setServiceRequest({...serviceRequest, otherPurposeText: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="اكتب وصف النشاط هنا..."
                      />
                    </div>
                  )}
                </div>

                {/* ===== القسم الرابع: عنوان الخدمة/النشاط ===== */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    تفاصيل الخدمة المطلوبة
                  </h3>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">
                      عنوان الخدمة / النشاط <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={serviceRequest.serviceTitle}
                      onChange={(e) => setServiceRequest({...serviceRequest, serviceTitle: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-32 resize-none"
                      placeholder="أدخل عنوان البحث أو الدراسة أو الخدمة المطلوبة مع أي تفاصيل إضافية..."
                      required
                    />
                  </div>
                </div>

                {/* ملاحظة */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">ملاحظة مهمة</p>
                    <p className="text-amber-700 text-sm">المدة المتوقعة للرد على الطلبات العادية هي 60 يوماً كحد أقصى. سيتم إشعاركم بكل تحديث على حالة الطلب.</p>
                  </div>
                </div>

                {/* أزرار الإرسال */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    تقديم الطلب
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('dashboard')}
                    className="px-8 py-4 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* صفحة الطلبات */}
          {currentPage === 'requests' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">طلباتي</h2>
                <div className="flex gap-2">
                  <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>جميع الحالات</option>
                    <option>قيد الإعداد</option>
                    <option>قيد المراجعة</option>
                    <option>مكتمل</option>
                  </select>
                </div>
              </div>
              
              <div className="divide-y divide-slate-100">
                {requests.map(req => (
                  <div key={req.id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{req.title}</p>
                          <p className="text-sm text-slate-500">{req.id} • {req.type} • {req.department}</p>
                        </div>
                      </div>
                      <span className={`inline-block px-4 py-2 rounded-full text-sm text-white ${req.statusColor}`}>
                        {req.status}
                      </span>
                    </div>
                    
                    {/* شريط التقدم */}
                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full ${req.status === 'مكتمل' ? 'bg-green-500 w-full' : req.status === 'قيد المراجعة' ? 'bg-yellow-500 w-3/4' : 'bg-blue-500 w-1/2'}`}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm text-slate-400">تاريخ الطلب: {req.date}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedRequest(req)} className="text-blue-500 hover:text-blue-600 text-sm flex items-center gap-1">
                          <Eye className="w-4 h-4" /> التفاصيل
                        </button>
                        {req.status === 'مكتمل' && (
                          <button onClick={() => handleDownloadPDF(req)} className="text-green-500 hover:text-green-600 text-sm flex items-center gap-1">
                            <Download className="w-4 h-4" /> تحميل PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* صفحة البحوث المكتملة */}
          {currentPage === 'completed' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">البحوث المكتملة</h2>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">7 بحوث مكتملة</h3>
                  <p className="text-slate-500">جميع البحوث المكتملة متاحة للتحميل بصيغة PDF</p>
                </div>
              </div>
            </div>
          )}

          {/* صفحة البحوث التطوعية */}
          {currentPage === 'volunteer' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                <h2 className="text-xl font-bold">البحوث التطوعية</h2>
                <p className="text-pink-100 text-sm mt-1">بحوث ودراسات أعدها الباحثون تطوعياً</p>
              </div>
              <div className="p-6">
                {/* قائمة البحوث التطوعية */}
                <div className="space-y-4">
                  {[
                    { id: 'VOL-001', title: 'دراسة حول التنمية المستدامة في العراق', author: 'د. سارة أحمد', department: 'بحوث اقتصادية', date: '2024-01-10', downloads: 45 },
                    { id: 'VOL-002', title: 'تحليل السياسات التعليمية المقارنة', author: 'أ. محمد علي', department: 'بحوث اجتماعية', date: '2024-01-08', downloads: 32 },
                    { id: 'VOL-003', title: 'ورقة بحثية: الطاقة المتجددة وآفاقها', author: 'د. فاطمة حسين', department: 'بحوث علمية', date: '2024-01-05', downloads: 67 },
                    { id: 'VOL-004', title: 'دراسة قانونية حول حقوق المرأة', author: 'أ. زينب كاظم', department: 'دراسات قانونية', date: '2024-01-02', downloads: 28 },
                  ].map(research => (
                    <div key={research.id} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all hover:border-pink-300">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-100 rounded-xl flex items-center justify-center">
                            <Heart className="w-6 h-6 text-pink-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 mb-1">{research.title}</h3>
                            <p className="text-sm text-slate-500">{research.author} • {research.department}</p>
                            <p className="text-xs text-slate-400 mt-1">تاريخ النشر: {research.date}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                            <Download className="w-4 h-4" />
                            {research.downloads}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                        <button onClick={() => handleDownloadPDF({ id: research.id, title: research.title, type: 'بحث تطوعي', department: research.department, status: 'مكتمل', date: research.date })} className="flex-1 bg-pink-500 text-white py-2 px-4 rounded-lg hover:bg-pink-600 transition-colors flex items-center justify-center gap-2">
                          <Download className="w-4 h-4" />
                          تحميل PDF
                        </button>
                        <button onClick={() => setSelectedRequest({ id: research.id, title: research.title, type: 'بحث تطوعي', department: research.department, status: 'مكتمل', date: research.date, statusColor: 'bg-green-500' })} className="flex-1 bg-slate-100 text-slate-700 py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                          <Eye className="w-4 h-4" />
                          معاينة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* إحصائيات */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-pink-600">24</p>
                    <p className="text-sm text-slate-600">بحث تطوعي</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-pink-600">12</p>
                    <p className="text-sm text-slate-600">باحث متطوع</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-pink-600">458</p>
                    <p className="text-sm text-slate-600">تحميل</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* صفحة الإعدادات */}
          {currentPage === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">الإعدادات</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-800">إشعارات البريد الإلكتروني</p>
                      <p className="text-sm text-slate-500">استلام إشعارات عبر البريد</p>
                    </div>
                    <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                      <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* نافذة تفاصيل الطلب */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              selectedRequest.status === 'مكتمل' ? 'bg-gradient-to-r from-green-600 to-green-700' :
              selectedRequest.status === 'قيد المراجعة' ? 'bg-gradient-to-r from-yellow-600 to-yellow-700' :
              'bg-gradient-to-r from-blue-600 to-blue-700'
            }`}>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                تفاصيل الطلب
              </h3>
              <button onClick={() => setSelectedRequest(null)} className="hover:bg-white/20 p-1 rounded">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">رقم الطلب</span>
                <span className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">{selectedRequest.id}</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-500 block mb-1">عنوان الطلب</span>
                <p className="text-slate-800 font-bold">{selectedRequest.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-semibold text-slate-500 block mb-1">نوع الخدمة</span>
                  <p className="text-slate-800">{selectedRequest.type}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-500 block mb-1">القسم المختص</span>
                  <p className="text-slate-800">{selectedRequest.department}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-semibold text-slate-500 block mb-1">تاريخ التقديم</span>
                  <p className="text-slate-800">{selectedRequest.date}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-500 block mb-1">الحالة</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm text-white ${selectedRequest.statusColor}`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-500 block mb-1">مقدم الطلب</span>
                <p className="text-slate-800">{deputyInfo.name}</p>
              </div>

              {/* شريط التقدم */}
              <div>
                <span className="text-sm font-semibold text-slate-500 block mb-2">مراحل الطلب</span>
                <div className="space-y-3">
                  {['تم الاستلام', 'قيد المراجعة', 'قيد الإعداد', 'التدقيق', 'مكتمل'].map((step, i) => {
                    const statusIndex = selectedRequest.status === 'مكتمل' ? 4 : selectedRequest.status === 'قيد المراجعة' ? 2 : 1;
                    const isCompleted = i <= statusIndex;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                        }`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className={`text-sm ${isCompleted ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                {selectedRequest.status === 'مكتمل' && (
                  <button
                    onClick={() => handleDownloadPDF(selectedRequest)}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    تحميل PDF
                  </button>
                )}
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
