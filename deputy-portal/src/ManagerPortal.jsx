import { useState, useEffect } from 'react';
import * as api from './api';
import { User, Lock, FileText, Clock, CheckCircle, AlertCircle, LogOut, Eye, Bell, Home, List, Settings, ChevronLeft, ChevronDown, Users, Building, Send, Filter, Search, ArrowLeft, X, Check, RotateCcw, BookOpen, Download, MessageSquare, Calendar, Phone, Mail, Target, Copy } from 'lucide-react';

export default function ManagerPortal({ onSwitchPortal, user }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // حالة نافذة الإجراءات
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject_exists'
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [selectedExistingResearch, setSelectedExistingResearch] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);

  // بيانات مدير الدائرة
  const managerInfo = {
    name: 'أ. خالد عبدالله المحمدي',
    role: 'مدير دائرة البحوث والدراسات',
    image: null
  };

  // الأقسام المتاحة للتوجيه
  const departments = [
    { id: 'financial', name: 'قسم البحوث المالية والاقتصادية', head: 'د. علي حسن' },
    { id: 'political', name: 'قسم البحوث السياسية', head: 'د. فاطمة أحمد' },
    { id: 'legal', name: 'قسم الدراسات القانونية', head: 'أ. محمد سالم' },
    { id: 'social', name: 'قسم البحوث الاجتماعية', head: 'د. زينب كريم' },
    { id: 'scientific', name: 'قسم البحوث العلمية', head: 'د. أحمد جواد' },
  ];

  // بحوث مكتملة سابقاً (أرشيف البحوث الموجودة)
  const [existingResearches] = useState([
    {
      id: 'RES-2023-001',
      title: 'دراسة حول تأثير التضخم على الاقتصاد العراقي 2020-2023',
      department: 'قسم البحوث المالية والاقتصادية',
      researcher: 'د. نور الدين',
      completedDate: '2023-09-15',
      pages: 45,
      keywords: ['تضخم', 'اقتصاد', 'سياسة نقدية', 'موازنة'],
      summary: 'دراسة شاملة حول تأثير معدلات التضخم على الاقتصاد العراقي خلال الفترة 2020-2023 مع تحليل السياسات النقدية المتبعة وتوصيات لمعالجة الآثار السلبية.',
      fileName: 'دراسة_التضخم_2023.pdf'
    },
    {
      id: 'RES-2023-002',
      title: 'تقرير مقارن حول قوانين مكافحة الفساد في الدول العربية',
      department: 'قسم الدراسات القانونية',
      researcher: 'أ. رنا علي',
      completedDate: '2023-11-20',
      pages: 62,
      keywords: ['فساد', 'مكافحة', 'قانون', 'نزاهة', 'تشريع'],
      summary: 'دراسة مقارنة تحليلية لقوانين مكافحة الفساد في العراق والدول العربية مع تقييم الإطار القانوني والمؤسسي لمكافحة الفساد.',
      fileName: 'مكافحة_الفساد_مقارنة_2023.pdf'
    },
    {
      id: 'RES-2023-003',
      title: 'ورقة إحاطة حول العلاقات العراقية مع دول الجوار',
      department: 'قسم البحوث السياسية',
      researcher: 'أ. حسين كاظم',
      completedDate: '2023-08-10',
      pages: 28,
      keywords: ['علاقات', 'تركيا', 'إيران', 'سياسة خارجية', 'جوار'],
      summary: 'ورقة إحاطة تحليلية حول واقع العلاقات العراقية مع دول الجوار وتأثيرها على الاستقرار الإقليمي.',
      fileName: 'العلاقات_دول_الجوار_2023.pdf'
    },
    {
      id: 'RES-2024-001',
      title: 'دراسة واقع التعليم الإلكتروني في العراق بعد جائحة كورونا',
      department: 'قسم البحوث الاجتماعية',
      researcher: 'د. ليلى عباس',
      completedDate: '2024-01-05',
      pages: 38,
      keywords: ['تعليم', 'إلكتروني', 'كورونا', 'تربية', 'تكنولوجيا'],
      summary: 'دراسة ميدانية حول واقع التعليم الإلكتروني في المدارس والجامعات العراقية بعد جائحة كورونا والتحديات والفرص المستقبلية.',
      fileName: 'التعليم_الالكتروني_2024.pdf'
    },
  ]);

  // طلبات من الـ API
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [apiDepartments, setApiDepartments] = useState([]);

  const purposeMap = { oversight: 'رقابي', legislative: 'تشريعي', other: 'أنشطة أخرى' };

  const loadRequests = async () => {
    try {
      const res = await api.getRequests();
      if (res.success && res.data) {
        setRequests(res.data.map(r => ({
          id: r.id, title: r.title,
          deputy: r.deputy_name || 'غير محدد',
          committee: r.committee || '',
          purpose: purposeMap[r.purpose] || r.purpose || '',
          date: r.date_received?.split('T')[0] || '',
          status: r.status,
          assignedTo: r.assigned_department,
          phone: r.phone || '', email: r.email || '',
          description: r.description || '',
          managerAction: r.status === 'returned_exists' ? 'returned_exists' : r.assigned_department ? 'approved' : null,
          managerNotes: '', existingResearchRef: null,
        })));
      }
    } catch {}
  };

  useEffect(() => {
    if (!isLoggedIn || !api.getToken()) return;
    loadRequests();
    api.getDepartments().then(res => {
      if (res.success && res.data) {
        setApiDepartments(res.data);
      }
    }).catch(() => {});
    api.getNotifications().then(res => {
      if (res.success && res.data) {
        setNotifications(res.data.map(n => ({
          id: n.id, text: n.message || n.title,
          time: new Date(n.created_at).toLocaleString('ar-IQ'), read: n.is_read,
        })));
      }
    }).catch(() => {});
  }, [isLoggedIn]);

  const getStatusInfo = (status) => {
    switch(status) {
      case 'pending': return { label: 'بانتظار الإجراء', color: 'bg-orange-500', bgLight: 'bg-orange-100 text-orange-700' };
      case 'assigned': return { label: 'تم التوجيه للقسم', color: 'bg-blue-500', bgLight: 'bg-blue-100 text-blue-700' };
      case 'in_progress': return { label: 'قيد الإعداد', color: 'bg-yellow-500', bgLight: 'bg-yellow-100 text-yellow-700' };
      case 'completed': return { label: 'مكتمل', color: 'bg-green-500', bgLight: 'bg-green-100 text-green-700' };
      case 'returned_exists': return { label: 'تم الإرجاع - بحث موجود', color: 'bg-purple-500', bgLight: 'bg-purple-100 text-purple-700' };
      default: return { label: 'غير محدد', color: 'bg-gray-500', bgLight: 'bg-gray-100 text-gray-700' };
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.username && loginData.password) {
      setIsLoggedIn(true);
    }
  };

  // فتح نافذة الإجراءات
  const handleOpenAction = (req) => {
    setSelectedRequest(req);
    setShowActionModal(true);
    setActionType(null);
    setSelectedDepartment('');
    setManagerNotes('');
    setSelectedExistingResearch(null);
  };

  // البحث عن بحوث مشابهة
  const findSimilarResearches = (title) => {
    const words = title.split(' ').filter(w => w.length > 2);
    return existingResearches.filter(r =>
      words.some(word => r.title.includes(word) || r.keywords.some(k => title.includes(k)))
    );
  };

  // الموافقة وتوجيه للقسم
  const handleApproveAndAssign = async () => {
    if (!selectedDepartment) {
      alert('يرجى اختيار القسم المختص');
      return;
    }
    try {
      const res = await api.assignRequest(selectedRequest.id, selectedDepartment);
      if (res.success) {
        await loadRequests();
        setShowActionModal(false);
        setSelectedRequest(null);
      } else {
        alert(res.message || 'فشل التوجيه');
      }
    } catch {
      // fallback محلي
      setRequests(prev => prev.map(req =>
        req.id === selectedRequest.id
          ? { ...req, status: 'assigned', assignedTo: selectedDepartment, managerAction: 'approved', managerNotes: managerNotes }
          : req
      ));
      setShowActionModal(false);
      setSelectedRequest(null);
    }
  };

  // إرجاع الطلب - بحث موجود مسبقاً
  const handleReturnWithExisting = async () => {
    if (!selectedExistingResearch) {
      alert('يرجى اختيار البحث الموجود مسبقاً');
      return;
    }
    try {
      const notes = managerNotes || `يوجد بحث مكتمل حول نفس الموضوع. تم إرفاق نسخة من البحث "${selectedExistingResearch.title}".`;
      await api.returnRequest(selectedRequest.id, {
        reason: 'بحث موجود مسبقاً',
        existing_research_id: selectedExistingResearch.id,
        notes: notes,
      });
      await loadRequests();
    } catch {
      setRequests(prev => prev.map(req =>
        req.id === selectedRequest.id
          ? { ...req, status: 'returned_exists', managerAction: 'returned_exists' }
          : req
      ));
    }
    setShowActionModal(false);
    setSelectedRequest(null);
  };

  const filteredRequests = requests.filter(req => {
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = req.title.includes(searchQuery) || req.deputy.includes(searchQuery) || req.id.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    inProgress: requests.filter(r => r.status === 'assigned' || r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    returned: requests.filter(r => r.status === 'returned_exists').length,
  };

  // صفحة تسجيل الدخول
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          <button
            onClick={onSwitchPortal}
            className="mb-6 flex items-center gap-2 text-emerald-300 hover:text-emerald-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للصفحة الرئيسية
          </button>

          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Building className="w-12 h-12 text-slate-900" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">دائرة البحوث والدراسات</h1>
            <p className="text-emerald-300">بوابة مدير الدائرة</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-6">تسجيل دخول المدير</h2>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-emerald-200 text-sm mb-2">اسم المستخدم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300" />
                  <input
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    placeholder="أدخل اسم المستخدم"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-emerald-200 text-sm mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300" />
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-emerald-300/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-400 to-green-500 text-slate-900 font-bold py-3 rounded-xl hover:from-emerald-500 hover:to-green-600 transition-all shadow-lg shadow-emerald-500/30"
              >
                دخول
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // لوحة تحكم المدير
  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* الشريط العلوي */}
      <header className="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold">دائرة البحوث والدراسات</h1>
              <p className="text-xs text-emerald-200">لوحة تحكم المدير</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              </button>

              {showNotifications && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="bg-emerald-700 text-white px-4 py-3 font-bold">الإشعارات</div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${!notif.read ? 'bg-emerald-50' : ''}`}>
                        <p className="text-sm text-slate-700">{notif.text}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 bg-white/10 rounded-full pr-2 pl-4 py-1">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-900" />
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{managerInfo.name}</p>
                <p className="text-xs text-emerald-200">مدير الدائرة</p>
              </div>
            </div>

            <button
              onClick={() => setIsLoggedIn(false)}
              className="p-2 hover:bg-red-500/20 rounded-full transition-colors text-red-300"
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
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white">
              <p className="font-bold">القائمة الرئيسية</p>
            </div>
            <div className="p-2">
              {[
                { id: 'dashboard', label: 'لوحة التحكم', icon: Home, badge: null },
                { id: 'requests', label: 'الطلبات الواردة', icon: List, badge: stats.pending > 0 ? stats.pending : null },
                { id: 'archive', label: 'أرشيف البحوث', icon: BookOpen, badge: null },
                { id: 'departments', label: 'الأقسام', icon: Users, badge: null },
                { id: 'settings', label: 'الإعدادات', icon: Settings, badge: null },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    currentPage === item.id
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.badge && (
                    <span className="mr-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          <button
            onClick={onSwitchPortal}
            className="mt-4 w-full bg-slate-200 text-slate-700 py-3 px-4 rounded-xl hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            الصفحة الرئيسية
          </button>
        </aside>

        {/* المحتوى الرئيسي */}
        <main className="flex-1">
          {/* لوحة التحكم */}
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              {/* الإحصائيات */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { label: 'إجمالي الطلبات', value: stats.total, icon: FileText, color: 'from-blue-500 to-blue-600' },
                  { label: 'بانتظار الإجراء', value: stats.pending, icon: Clock, color: 'from-orange-500 to-orange-600' },
                  { label: 'قيد العمل', value: stats.inProgress, icon: AlertCircle, color: 'from-yellow-500 to-yellow-600' },
                  { label: 'مكتملة', value: stats.completed, icon: CheckCircle, color: 'from-green-500 to-green-600' },
                  { label: 'مُرجعة (موجود)', value: stats.returned, icon: RotateCcw, color: 'from-purple-500 to-purple-600' },
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

              {/* الطلبات بانتظار الإجراء */}
              {stats.pending > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-orange-50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      طلبات بانتظار إجراء المدير
                    </h2>
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm">{stats.pending}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {requests.filter(r => r.status === 'pending').map(req => {
                      const similar = findSimilarResearches(req.title);
                      return (
                        <div key={req.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-orange-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{req.title}</p>
                                <p className="text-sm text-slate-500">{req.deputy} • {req.committee} • {req.date}</p>
                                {similar.length > 0 && (
                                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    يوجد {similar.length} بحث مشابه في الأرشيف
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleOpenAction(req)}
                              className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                            >
                              <Target className="w-4 h-4" />
                              اتخاذ إجراء
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* آخر الطلبات */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">آخر الإجراءات</h2>
                  <button
                    onClick={() => setCurrentPage('requests')}
                    className="text-emerald-500 text-sm hover:text-emerald-600 flex items-center gap-1"
                  >
                    عرض الكل <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {requests.filter(r => r.status !== 'pending').slice(0, 4).map(req => (
                    <div key={req.id} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          req.status === 'returned_exists' ? 'bg-purple-100' :
                          req.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {req.status === 'returned_exists'
                            ? <RotateCcw className="w-5 h-5 text-purple-500" />
                            : <FileText className={`w-5 h-5 ${req.status === 'completed' ? 'text-green-500' : 'text-blue-500'}`} />
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{req.title}</p>
                          <p className="text-sm text-slate-500">{req.deputy}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${getStatusInfo(req.status).bgLight}`}>
                        {getStatusInfo(req.status).label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* صفحة الطلبات */}
          {currentPage === 'requests' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-4">جميع الطلبات</h2>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث بالعنوان أو اسم النائب..."
                      className="w-full border border-slate-300 rounded-lg py-2 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="border border-slate-300 rounded-lg py-2 pr-10 pl-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none bg-white"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="pending">بانتظار الإجراء</option>
                      <option value="assigned">تم التوجيه</option>
                      <option value="in_progress">قيد الإعداد</option>
                      <option value="completed">مكتمل</option>
                      <option value="returned_exists">مُرجع - بحث موجود</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredRequests.map(req => (
                  <div key={req.id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          req.status === 'pending' ? 'bg-orange-100' :
                          req.status === 'returned_exists' ? 'bg-purple-100' :
                          req.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {req.status === 'returned_exists'
                            ? <RotateCcw className={`w-6 h-6 text-purple-500`} />
                            : <FileText className={`w-6 h-6 ${
                                req.status === 'pending' ? 'text-orange-500' :
                                req.status === 'completed' ? 'text-green-500' : 'text-blue-500'
                              }`} />
                          }
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{req.title}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            {req.id} • {req.deputy} • {req.committee}
                          </p>
                          <p className="text-sm text-slate-400 mt-1">
                            الغرض: {req.purpose} • التاريخ: {req.date}
                          </p>
                          {req.managerNotes && (
                            <p className="text-sm text-emerald-600 mt-2 bg-emerald-50 px-3 py-1 rounded-lg inline-block">
                              <MessageSquare className="w-3 h-3 inline ml-1" />
                              {req.managerNotes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm text-white ${getStatusInfo(req.status).color}`}>
                          {getStatusInfo(req.status).label}
                        </span>
                        {req.assignedTo && (
                          <p className="text-xs text-slate-500 mt-2">
                            موجه إلى: {departments.find(d => d.id === req.assignedTo)?.name}
                          </p>
                        )}
                        {req.existingResearchRef && (
                          <p className="text-xs text-purple-600 mt-1">
                            بحث مرفق: {existingResearches.find(r => r.id === req.existingResearchRef)?.title?.substring(0, 30)}...
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {req.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {req.email}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setDetailRequest(req); setShowRequestDetails(true); }}
                          className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" /> التفاصيل
                        </button>
                        {req.status === 'pending' && (
                          <button
                            onClick={() => handleOpenAction(req)}
                            className="bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600 transition-colors text-sm flex items-center gap-1"
                          >
                            <Target className="w-4 h-4" /> اتخاذ إجراء
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* صفحة أرشيف البحوث */}
          {currentPage === 'archive' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 mb-4">أرشيف البحوث المكتملة</h2>
              <p className="text-slate-500 mb-4">البحوث المكتملة سابقاً - يمكن إرفاقها مع الطلبات المشابهة</p>
              {existingResearches.map(research => (
                <div key={research.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{research.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{research.department} • {research.researcher}</p>
                        <p className="text-sm text-slate-400">تاريخ الإنجاز: {research.completedDate} • {research.pages} صفحة</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">{research.id}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 bg-slate-50 p-3 rounded-xl">{research.summary}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                      {research.keywords.map(kw => (
                        <span key={kw} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">{kw}</span>
                      ))}
                    </div>
                    <button className="flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-600">
                      <Download className="w-4 h-4" /> {research.fileName}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* صفحة الأقسام */}
          {currentPage === 'departments' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 mb-4">أقسام الدائرة</h2>
              {departments.map(dept => {
                const deptRequests = requests.filter(r => r.assignedTo === dept.id);
                const inProgress = deptRequests.filter(r => r.status === 'in_progress' || r.status === 'assigned').length;
                const completed = deptRequests.filter(r => r.status === 'completed').length;
                return (
                  <div key={dept.id} className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl flex items-center justify-center">
                          <Building className="w-7 h-7 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">{dept.name}</h3>
                          <p className="text-sm text-slate-500">رئيس القسم: {dept.head}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">{inProgress}</p>
                          <p className="text-xs text-slate-500">قيد العمل</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{completed}</p>
                          <p className="text-xs text-slate-500">مكتمل</p>
                        </div>
                      </div>
                    </div>
                    {deptRequests.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm font-semibold text-slate-600 mb-2">الطلبات الحالية:</p>
                        <div className="space-y-2">
                          {deptRequests.slice(0, 3).map(req => (
                            <div key={req.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                              <span className="text-sm text-slate-700">{req.title}</span>
                              <span className={`px-2 py-1 rounded text-xs ${getStatusInfo(req.status).bgLight}`}>
                                {getStatusInfo(req.status).label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* صفحة الإعدادات */}
          {currentPage === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">الإعدادات</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">إشعارات الطلبات الجديدة</p>
                    <p className="text-sm text-slate-500">استلام إشعار عند ورود طلب جديد</p>
                  </div>
                  <button className="w-12 h-6 bg-emerald-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">التحقق التلقائي من البحوث المشابهة</p>
                    <p className="text-sm text-slate-500">عرض تنبيه عند وجود بحث مشابه في الأرشيف</p>
                  </div>
                  <button className="w-12 h-6 bg-emerald-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================= */}
      {/* نافذة اتخاذ الإجراء (موافقة / إرجاع) */}
      {/* ========================================= */}
      {showActionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* رأس النافذة */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                اتخاذ إجراء على الطلب
              </h3>
              <button onClick={() => { setShowActionModal(false); setActionType(null); }} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* بيانات الطلب */}
              <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">{selectedRequest.id}</span>
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">{selectedRequest.purpose}</span>
                </div>
                <h4 className="font-bold text-slate-800 text-lg">{selectedRequest.title}</h4>
                <p className="text-sm text-slate-600 mt-2">{selectedRequest.description}</p>
                <div className="flex gap-4 mt-3 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {selectedRequest.deputy}</span>
                  <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {selectedRequest.committee}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {selectedRequest.date}</span>
                </div>
              </div>

              {/* تنبيه بحوث مشابهة */}
              {(() => {
                const similar = findSimilarResearches(selectedRequest.title);
                if (similar.length > 0) {
                  return (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="font-bold text-amber-800 flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        تنبيه: يوجد {similar.length} بحث مشابه في الأرشيف
                      </p>
                      <div className="space-y-2">
                        {similar.map(r => (
                          <div key={r.id} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-100 px-3 py-2 rounded-lg">
                            <BookOpen className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1">{r.title}</span>
                            <span className="text-xs text-amber-600">{r.completedDate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* اختيار نوع الإجراء */}
              {!actionType && (
                <div className="space-y-3">
                  <p className="font-bold text-slate-700 text-lg mb-4">اختر الإجراء المناسب:</p>

                  <button
                    onClick={() => setActionType('approve')}
                    className="w-full p-5 border-2 border-emerald-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-right group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <Check className="w-7 h-7 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg">الموافقة وتحويل لقسم</p>
                        <p className="text-sm text-slate-500 mt-1">الموافقة على الطلب وتوجيهه للقسم المختص للبدء بالعمل</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActionType('reject_exists')}
                    className="w-full p-5 border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-right group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <RotateCcw className="w-7 h-7 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg">إرجاع - البحث موجود مسبقاً</p>
                        <p className="text-sm text-slate-500 mt-1">إرجاع الطلب للنائب مع إرفاق نسخة من البحث الموجود حول نفس الموضوع</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* ========= نموذج الموافقة والتحويل ========= */}
              {actionType === 'approve' && (
                <div className="space-y-4">
                  <button onClick={() => setActionType(null)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
                    <ArrowLeft className="w-4 h-4" /> رجوع لاختيار الإجراء
                  </button>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="font-bold text-emerald-800 flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      الموافقة وتحويل الطلب للقسم المختص
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-3">اختر القسم المختص: *</label>
                    <div className="space-y-2">
                      {departments.map(dept => (
                        <button
                          key={dept.id}
                          onClick={() => setSelectedDepartment(dept.id)}
                          className={`w-full text-right p-4 border-2 rounded-xl transition-all flex items-center justify-between ${
                            selectedDepartment === dept.id
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              selectedDepartment === dept.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <Building className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{dept.name}</p>
                              <p className="text-sm text-slate-500">{dept.head}</p>
                            </div>
                          </div>
                          {selectedDepartment === dept.id && <Check className="w-5 h-5 text-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">توجيهات المدير (اختياري)</label>
                    <textarea
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
                      placeholder="أضف أي توجيهات أو ملاحظات للقسم المختص..."
                    />
                  </div>

                  <button
                    onClick={handleApproveAndAssign}
                    className="w-full bg-emerald-500 text-white py-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 font-bold"
                  >
                    <Send className="w-5 h-5" />
                    موافقة وتحويل للقسم
                  </button>
                </div>
              )}

              {/* ========= نموذج الإرجاع - بحث موجود ========= */}
              {actionType === 'reject_exists' && (
                <div className="space-y-4">
                  <button onClick={() => setActionType(null)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2">
                    <ArrowLeft className="w-4 h-4" /> رجوع لاختيار الإجراء
                  </button>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <p className="font-bold text-purple-800 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5" />
                      إرجاع الطلب - البحث موجود مسبقاً
                    </p>
                    <p className="text-sm text-purple-600 mt-1">اختر البحث الموجود في الأرشيف لإرفاقه مع رد الطلب</p>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-3">اختر البحث الموجود: *</label>
                    <div className="space-y-3">
                      {existingResearches.map(research => (
                        <button
                          key={research.id}
                          onClick={() => setSelectedExistingResearch(research)}
                          className={`w-full text-right p-4 border-2 rounded-xl transition-all ${
                            selectedExistingResearch?.id === research.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${
                              selectedExistingResearch?.id === research.id ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <p className="font-semibold text-slate-800">{research.title}</p>
                                {selectedExistingResearch?.id === research.id && <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />}
                              </div>
                              <p className="text-sm text-slate-500 mt-1">{research.department} • {research.researcher}</p>
                              <p className="text-xs text-slate-400 mt-1">تاريخ الإنجاز: {research.completedDate} • {research.pages} صفحة</p>
                              <p className="text-sm text-slate-600 mt-2">{research.summary.substring(0, 100)}...</p>
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {research.keywords.slice(0, 4).map(kw => (
                                  <span key={kw} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{kw}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* معاينة البحث المختار */}
                  {selectedExistingResearch && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                      <p className="font-bold text-green-800 flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4" />
                        البحث المرفق للنائب
                      </p>
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <p className="font-semibold text-slate-800">{selectedExistingResearch.title}</p>
                        <p className="text-sm text-slate-500 mt-1">{selectedExistingResearch.fileName}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Copy className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-700">سيتم إرسال نسخة من هذا البحث للنائب</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">رسالة للنائب</label>
                    <textarea
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                      placeholder="أوضح للنائب أن البحث موجود مسبقاً..."
                      defaultValue=""
                    />
                  </div>

                  <button
                    onClick={handleReturnWithExisting}
                    className="w-full bg-purple-500 text-white py-3 rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 font-bold"
                  >
                    <RotateCcw className="w-5 h-5" />
                    إرجاع الطلب مع إرفاق البحث
                  </button>
                </div>
              )}

              {/* زر إلغاء */}
              <button
                onClick={() => { setShowActionModal(false); setActionType(null); }}
                className="w-full mt-4 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* نافذة تفاصيل الطلب */}
      {/* ========================================= */}
      {showRequestDetails && detailRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className={`px-6 py-4 flex items-center justify-between text-white sticky top-0 ${
              detailRequest.status === 'returned_exists' ? 'bg-gradient-to-r from-purple-600 to-purple-700' :
              detailRequest.status === 'completed' ? 'bg-gradient-to-r from-green-600 to-green-700' :
              detailRequest.status === 'pending' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
              'bg-gradient-to-r from-emerald-600 to-emerald-700'
            }`}>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                تفاصيل الطلب {detailRequest.id}
              </h3>
              <button onClick={() => setShowRequestDetails(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-sm font-semibold text-slate-500">العنوان</span>
                <p className="text-slate-800 font-bold text-lg mt-1">{detailRequest.title}</p>
              </div>
              {detailRequest.description && (
                <div>
                  <span className="text-sm font-semibold text-slate-500">الوصف</span>
                  <p className="text-slate-700 mt-1">{detailRequest.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-semibold text-slate-500">مقدم الطلب</span>
                  <p className="text-slate-800 mt-1">{detailRequest.deputy}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-500">اللجنة</span>
                  <p className="text-slate-800 mt-1">{detailRequest.committee}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-500">الغرض</span>
                  <p className="text-slate-800 mt-1">{detailRequest.purpose}</p>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-500">الحالة</span>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm text-white ${getStatusInfo(detailRequest.status).color}`}>
                    {getStatusInfo(detailRequest.status).label}
                  </span>
                </div>
              </div>

              {detailRequest.assignedTo && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-sm font-semibold text-blue-700">القسم المختص</span>
                  <p className="text-blue-800 font-bold mt-1">{departments.find(d => d.id === detailRequest.assignedTo)?.name}</p>
                </div>
              )}

              {detailRequest.managerNotes && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" /> ملاحظات المدير
                  </span>
                  <p className="text-emerald-800 mt-1">{detailRequest.managerNotes}</p>
                </div>
              )}

              {detailRequest.existingResearchRef && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <span className="text-sm font-semibold text-purple-700 flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4" /> البحث المرفق
                  </span>
                  {(() => {
                    const ref = existingResearches.find(r => r.id === detailRequest.existingResearchRef);
                    if (!ref) return null;
                    return (
                      <div className="bg-white rounded-lg p-3 border border-purple-200">
                        <p className="font-bold text-slate-800">{ref.title}</p>
                        <p className="text-sm text-slate-500 mt-1">{ref.department} • {ref.researcher}</p>
                        <p className="text-sm text-slate-600 mt-2">{ref.summary.substring(0, 120)}...</p>
                        <button className="mt-3 flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium">
                          <Download className="w-4 h-4" /> تحميل {ref.fileName}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              <button
                onClick={() => setShowRequestDetails(false)}
                className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
