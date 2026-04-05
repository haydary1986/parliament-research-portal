import { useState, useRef, useEffect } from 'react';
import * as api from './api';
import { User, Lock, FileText, Clock, CheckCircle, AlertCircle, LogOut, Eye, Bell, Home, List, Settings, ChevronLeft, Building, Send, Play, Check, X, Calendar, MessageSquare, ArrowLeft, BookOpen, Plus, Trash2, ExternalLink, Upload, Paperclip, Edit3, Bold, Italic, Underline, AlignRight, AlignCenter, AlignLeft, List as ListIcon, ListOrdered, Save, FileEdit } from 'lucide-react';

export default function ResearcherPortal({ onSwitchPortal, user }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loginData, setLoginData] = useState({ username: user?.name || '', password: '' });
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedResearch, setSelectedResearch] = useState(null);
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [showSendToProofreaderModal, setShowSendToProofreaderModal] = useState(false);
  const [researchFile, setResearchFile] = useState(null);
  const [newInfoRequest, setNewInfoRequest] = useState({
    targetEntity: '',
    subject: '',
    date: new Date().toISOString().split('T')[0],
    attachedFile: null
  });
  const [showWordEditor, setShowWordEditor] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const editorRef = useRef(null);

  // الباحثون المسجلون
  const registeredResearchers = [
    { id: 1, name: 'د. نور الدين', specialization: 'اقتصاد', department: 'financial' },
    { id: 2, name: 'أ. حسين محمد', specialization: 'علاقات دولية', department: 'political' },
    { id: 3, name: 'أ. رنا علي', specialization: 'قانون دستوري', department: 'legal' },
    { id: 4, name: 'د. سمية أحمد', specialization: 'علم اجتماع', department: 'social' },
    { id: 5, name: 'د. كريم حسن', specialization: 'بيئة', department: 'scientific' },
  ];

  // البحوث المحالة للباحث
  const [assignedResearches, setAssignedResearches] = useState([
    {
      id: 'REQ-006',
      title: 'دراسة أثر السياسة النقدية على التضخم',
      deputy: 'د. أحمد محمد العلي',
      committee: 'اللجنة المالية',
      purpose: 'رقابي',
      dateAssigned: '2024-01-21',
      deadline: '2024-03-20',
      status: 'in_progress', // in_progress, submitted, completed
      serviceType: 'دراسة',
      classification: 'مالية واقتصادية',
      description: 'دراسة تحليلية لأثر السياسات النقدية للبنك المركزي العراقي على معدلات التضخم',
      assignedTo: 'د. نور الدين',
      completionDays: 60,
      // طلبات المعلومات من الجهات المعنية (بحد أقصى 3)
      informationRequests: [
        {
          id: 1,
          number: 'INF-001',
          date: '2024-01-22',
          targetEntity: 'البنك المركزي العراقي',
          subject: 'طلب بيانات معدلات التضخم للسنوات 2020-2024',
          status: 'sent'
        },
        {
          id: 2,
          number: 'INF-002',
          date: '2024-01-25',
          targetEntity: 'وزارة التخطيط',
          subject: 'طلب إحصائيات الناتج المحلي الإجمالي',
          status: 'sent'
        }
      ],
      notes: [
        { date: '2024-01-21', text: 'تم استلام البحث والبدء بالعمل' },
        { date: '2024-01-28', text: 'اكتمل التحليل الإحصائي' }
      ]
    },
    {
      id: 'REQ-008',
      title: 'تحليل قانون الاستثمار الجديد',
      deputy: 'أ. كريم العبادي',
      committee: 'اللجنة الاقتصادية',
      purpose: 'تشريعي',
      dateAssigned: '2024-01-28',
      deadline: '2024-03-28',
      status: 'in_progress',
      serviceType: 'تقرير',
      classification: 'قانوني',
      description: 'تحليل قانوني واقتصادي لمشروع قانون الاستثمار الجديد ومقارنته بالتشريعات الإقليمية',
      assignedTo: 'د. نور الدين',
      completionDays: 45,
      informationRequests: [],
      notes: [
        { date: '2024-01-28', text: 'تم استلام البحث' }
      ]
    }
  ]);

  const [notifications, setNotifications] = useState([]);

  // جلب المهام من API
  useEffect(() => {
    if (!isLoggedIn || !api.getToken()) return;
    api.getResearchTasks().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setAssignedResearches(res.data.map(t => ({
          id: t.request_id || t.id,
          title: t.request_title || t.id,
          assignedTo: loginData.username,
          department: 'القسم',
          dateAssigned: t.date_assigned?.split('T')[0] || '',
          deadline: t.deadline?.split('T')[0] || '',
          status: t.status,
          completionDays: t.completion_days || 30,
          serviceType: 'دراسة', classification: 'عام',
          informationRequests: t.information_requests || [],
          notes: t.notes || [],
        })));
      }
    }).catch(() => {});
    api.getNotifications().then(res => {
      if (res.success && res.data) {
        setNotifications(res.data.map(n => ({
          id: n.id, text: n.message || n.title,
          time: new Date(n.created_at).toLocaleString('ar-IQ'), read: n.is_read,
        })));
      }
    }).catch(() => setNotifications([
      { id: 1, text: 'تم تحويل بحث جديد إليك', time: 'منذ ساعة', read: false },
    ]));
  }, [isLoggedIn]);

  const getStatusInfo = (status) => {
    switch(status) {
      case 'in_progress': return { label: 'قيد الإعداد', color: 'bg-blue-500', bgLight: 'bg-blue-100 text-blue-700', icon: Play };
      case 'sent_to_proofreader': return { label: 'لدى المدقق اللغوي', color: 'bg-rose-500', bgLight: 'bg-rose-100 text-rose-700', icon: Edit3 };
      case 'submitted': return { label: 'تم التسليم', color: 'bg-yellow-500', bgLight: 'bg-yellow-100 text-yellow-700', icon: Send };
      case 'completed': return { label: 'مكتمل', color: 'bg-green-500', bgLight: 'bg-green-100 text-green-700', icon: CheckCircle };
      default: return { label: 'غير محدد', color: 'bg-gray-500', bgLight: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const researcher = registeredResearchers.find(r => r.name === loginData.username);
    if (researcher && loginData.password) {
      setIsLoggedIn(true);
    } else {
      alert('يرجى اختيار اسم الباحث وإدخال كلمة المرور');
    }
  };

  // إضافة طلب معلومات جديد
  const handleAddInfoRequest = () => {
    if (!newInfoRequest.targetEntity || !newInfoRequest.subject) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    if (!newInfoRequest.attachedFile) {
      alert('يرجى رفع كتاب الطلب');
      return;
    }

    const research = assignedResearches.find(r => r.id === selectedResearch.id);
    if (research.informationRequests.length >= 3) {
      alert('لا يمكن إضافة أكثر من 3 طلبات معلومات لكل بحث');
      return;
    }

    const newRequest = {
      id: Date.now(),
      number: `INF-${String(research.informationRequests.length + 1).padStart(3, '0')}`,
      date: newInfoRequest.date,
      targetEntity: newInfoRequest.targetEntity,
      subject: newInfoRequest.subject,
      attachedFile: newInfoRequest.attachedFile,
      status: 'sent'
    };

    setAssignedResearches(prev => prev.map(r =>
      r.id === selectedResearch.id
        ? {
            ...r,
            informationRequests: [...r.informationRequests, newRequest],
            notes: [...r.notes, {
              date: new Date().toISOString().split('T')[0],
              text: `تم إرسال طلب معلومات إلى: ${newInfoRequest.targetEntity}`
            }]
          }
        : r
    ));

    // تحديث البحث المحدد
    setSelectedResearch(prev => ({
      ...prev,
      informationRequests: [...prev.informationRequests, newRequest]
    }));

    setShowAddRequestModal(false);
    setNewInfoRequest({
      targetEntity: '',
      subject: '',
      date: new Date().toISOString().split('T')[0],
      attachedFile: null
    });
  };

  // حذف طلب معلومات
  const handleDeleteInfoRequest = (requestId) => {
    setAssignedResearches(prev => prev.map(r =>
      r.id === selectedResearch.id
        ? {
            ...r,
            informationRequests: r.informationRequests.filter(req => req.id !== requestId)
          }
        : r
    ));

    setSelectedResearch(prev => ({
      ...prev,
      informationRequests: prev.informationRequests.filter(req => req.id !== requestId)
    }));
  };

  // إرسال البحث للمدقق اللغوي
  const handleSendToProofreader = () => {
    if (!researchFile) {
      alert('يرجى رفع ملف البحث أولاً');
      return;
    }

    setAssignedResearches(prev => prev.map(r =>
      r.id === selectedResearch.id
        ? {
            ...r,
            status: 'sent_to_proofreader',
            researchFile: researchFile,
            sentToProofreaderDate: new Date().toISOString().split('T')[0],
            notes: [...r.notes, {
              date: new Date().toISOString().split('T')[0],
              text: 'تم إرسال البحث للمدقق اللغوي'
            }]
          }
        : r
    ));

    setSelectedResearch(prev => ({
      ...prev,
      status: 'sent_to_proofreader',
      researchFile: researchFile
    }));

    setShowSendToProofreaderModal(false);
    setResearchFile(null);
    alert('تم إرسال البحث للمدقق اللغوي بنجاح');
  };

  // الباحث الحالي
  const currentResearcher = registeredResearchers.find(r => r.name === loginData.username);

  // فلترة البحوث حسب الباحث
  const myResearches = assignedResearches.filter(r => r.assignedTo === loginData.username);

  const stats = {
    total: myResearches.length,
    inProgress: myResearches.filter(r => r.status === 'in_progress').length,
    submitted: myResearches.filter(r => r.status === 'submitted').length,
    completed: myResearches.filter(r => r.status === 'completed').length,
  };

  // صفحة تسجيل الدخول
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          {/* زر العودة */}
          <button
            onClick={onSwitchPortal}
            className="mb-6 flex items-center gap-2 text-cyan-300 hover:text-cyan-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للصفحة الرئيسية
          </button>

          {/* الشعار والعنوان */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">دائرة البحوث والدراسات</h1>
            <p className="text-cyan-300">بوابة الباحثين</p>
          </div>

          {/* نموذج تسجيل الدخول */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-6">تسجيل دخول الباحث</h2>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* اختيار الباحث */}
              <div>
                <label className="block text-cyan-200 text-sm mb-2">اسم الباحث</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300" />
                  <select
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent appearance-none"
                    required
                  >
                    <option value="" className="text-slate-900">اختر اسمك</option>
                    {registeredResearchers.map(researcher => (
                      <option key={researcher.id} value={researcher.name} className="text-slate-900">
                        {researcher.name} - {researcher.specialization}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-cyan-200 text-sm mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300" />
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-cyan-400 to-teal-500 text-white font-bold py-3 rounded-xl hover:from-cyan-500 hover:to-teal-600 transition-all shadow-lg shadow-cyan-500/30"
              >
                دخول
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // لوحة تحكم الباحث
  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* الشريط العلوي */}
      <header className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold">بوابة الباحثين</h1>
              <p className="text-xs text-white/80">دائرة البحوث والدراسات</p>
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
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              </button>

              {showNotifications && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                  <div className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white px-4 py-3 font-bold">الإشعارات</div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${!notif.read ? 'bg-cyan-50' : ''}`}>
                        <p className="text-sm text-slate-700">{notif.text}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* معلومات الباحث */}
            <div className="flex items-center gap-3 bg-white/10 rounded-full pr-2 pl-4 py-1">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{loginData.username}</p>
                <p className="text-xs text-white/80">{currentResearcher?.specialization}</p>
              </div>
            </div>

            <button
              onClick={() => setIsLoggedIn(false)}
              className="p-2 hover:bg-red-500/20 rounded-full transition-colors"
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
            <div className="p-4 bg-gradient-to-r from-cyan-500 to-teal-600 text-white">
              <p className="font-bold">القائمة الرئيسية</p>
            </div>
            <div className="p-2">
              {[
                { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
                { id: 'researches', label: 'البحوث المحالة', icon: List },
                { id: 'completed', label: 'البحوث المنجزة', icon: CheckCircle },
                { id: 'settings', label: 'الإعدادات', icon: Settings },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    currentPage === item.id
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.id === 'researches' && stats.inProgress > 0 && (
                    <span className="mr-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.inProgress}</span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          {/* زر العودة */}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي البحوث', value: stats.total, icon: FileText, color: 'from-slate-500 to-slate-600' },
                  { label: 'قيد الإعداد', value: stats.inProgress, icon: Play, color: 'from-blue-500 to-blue-600' },
                  { label: 'تم التسليم', value: stats.submitted, icon: Send, color: 'from-yellow-500 to-yellow-600' },
                  { label: 'مكتملة', value: stats.completed, icon: CheckCircle, color: 'from-green-500 to-green-600' },
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

              {/* البحوث قيد الإعداد */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Play className="w-5 h-5 text-blue-500" />
                    البحوث قيد الإعداد
                  </h2>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">{stats.inProgress}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {myResearches.filter(r => r.status === 'in_progress').map(research => (
                    <div key={research.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{research.title}</p>
                            <p className="text-sm text-slate-500">{research.deputy} • الموعد النهائي: {research.deadline}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedResearch(research)}
                          className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          التفاصيل
                        </button>
                      </div>
                    </div>
                  ))}
                  {stats.inProgress === 0 && (
                    <div className="px-6 py-8 text-center text-slate-500">
                      لا توجد بحوث قيد الإعداد حالياً
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* صفحة البحوث المحالة */}
          {currentPage === 'researches' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">البحوث المحالة إليك</h2>
              {myResearches.filter(r => r.status !== 'completed').map(research => (
                <div key={research.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{research.title}</h3>
                      <p className="text-slate-500">{research.deputy} • {research.committee}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-lg">{research.serviceType}</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg">{research.classification}</span>
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm text-white ${getStatusInfo(research.status).color}`}>
                      {getStatusInfo(research.status).label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs text-slate-500">تاريخ الإحالة</p>
                      <p className="font-semibold text-slate-800">{research.dateAssigned}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">الموعد النهائي</p>
                      <p className="font-semibold text-slate-800">{research.deadline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">طلبات المعلومات</p>
                      <p className="font-semibold text-slate-800">{research.informationRequests.length} / 3</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedResearch(research)}
                      className="flex-1 bg-cyan-500 text-white py-2 rounded-lg hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" /> عرض التفاصيل وطلبات المعلومات
                    </button>
                  </div>
                </div>
              ))}
              {myResearches.filter(r => r.status !== 'completed').length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد بحوث محالة إليك حالياً</p>
                </div>
              )}
            </div>
          )}

          {/* صفحة البحوث المنجزة */}
          {currentPage === 'completed' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">البحوث المنجزة</h2>
              {myResearches.filter(r => r.status === 'completed').map(research => (
                <div key={research.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{research.title}</h3>
                        <p className="text-slate-500">{research.deputy}</p>
                      </div>
                    </div>
                    <span className="px-4 py-2 rounded-full text-sm bg-green-100 text-green-700">
                      مكتمل
                    </span>
                  </div>
                </div>
              ))}
              {myResearches.filter(r => r.status === 'completed').length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد بحوث منجزة بعد</p>
                </div>
              )}
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
                    <p className="font-semibold text-slate-800">إشعارات البحوث الجديدة</p>
                    <p className="text-sm text-slate-500">استلام إشعار عند إحالة بحث جديد</p>
                  </div>
                  <button className="w-12 h-6 bg-cyan-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">تذكير المواعيد النهائية</p>
                    <p className="text-sm text-slate-500">تذكير قبل الموعد النهائي بأسبوع</p>
                  </div>
                  <button className="w-12 h-6 bg-cyan-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* نافذة تفاصيل البحث وطلبات المعلومات */}
      {selectedResearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">تفاصيل البحث</h3>
              <button onClick={() => setSelectedResearch(null)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* معلومات البحث */}
              <div className="mb-6">
                <h4 className="font-bold text-xl text-slate-800 mb-2">{selectedResearch.title}</h4>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                  <span>{selectedResearch.id}</span>
                  <span className={`px-2 py-1 rounded ${getStatusInfo(selectedResearch.status).bgLight}`}>
                    {getStatusInfo(selectedResearch.status).label}
                  </span>
                </div>
                <div className="flex gap-2 mb-4">
                  <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-sm rounded-lg">{selectedResearch.serviceType}</span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-lg">{selectedResearch.classification}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">مقدم الطلب</p>
                  <p className="font-semibold text-slate-800">{selectedResearch.deputy}</p>
                  <p className="text-sm text-slate-500">{selectedResearch.committee}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">المواعيد</p>
                  <p className="text-sm text-slate-800">الإحالة: {selectedResearch.dateAssigned}</p>
                  <p className="text-sm text-slate-800">التسليم: {selectedResearch.deadline}</p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">تفاصيل البحث</p>
                <p className="text-slate-800">{selectedResearch.description}</p>
              </div>

              {/* طلبات المعلومات */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="font-bold text-slate-800 flex items-center gap-2">
                    <ExternalLink className="w-5 h-5 text-cyan-500" />
                    طلبات المعلومات من الجهات المعنية
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">{selectedResearch.informationRequests.length} / 3</span>
                    {selectedResearch.informationRequests.length < 3 && (
                      <button
                        onClick={() => setShowAddRequestModal(true)}
                        className="bg-cyan-500 text-white px-3 py-1.5 rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-1 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة طلب
                      </button>
                    )}
                  </div>
                </div>

                {selectedResearch.informationRequests.length > 0 ? (
                  <div className="space-y-3">
                    {selectedResearch.informationRequests.map((req, idx) => (
                      <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded font-mono">{req.number}</span>
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {req.date}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                              <Building className="w-4 h-4 text-slate-400" />
                              {req.targetEntity}
                            </p>
                            <p className="text-sm text-slate-600">{req.subject}</p>
                            {req.attachedFile && (
                              <p className="text-xs text-cyan-600 mt-1 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                {req.attachedFile.name}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteInfoRequest(req.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 rounded-xl text-center">
                    <ExternalLink className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">لم يتم إضافة طلبات معلومات بعد</p>
                    <p className="text-sm text-slate-400">يمكنك إضافة حتى 3 طلبات للجهات المعنية</p>
                  </div>
                )}
              </div>

              {/* سجل الملاحظات */}
              {selectedResearch.notes.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <p className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> سجل التحديثات
                  </p>
                  <div className="space-y-2 p-4 bg-slate-50 rounded-xl max-h-40 overflow-y-auto">
                    {selectedResearch.notes.map((note, idx) => (
                      <div key={idx} className="flex gap-3 text-sm border-b border-slate-200 pb-2 last:border-0">
                        <span className="text-slate-400 whitespace-nowrap">{note.date}</span>
                        <span className="text-slate-600">{note.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* زر إرسال للمدقق اللغوي */}
              {selectedResearch.status === 'in_progress' && (
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <button
                    onClick={() => setShowSendToProofreaderModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl hover:from-rose-600 hover:to-pink-700 transition-colors flex items-center justify-center gap-2 font-bold"
                  >
                    <Edit3 className="w-5 h-5" />
                    إرسال للمدقق اللغوي
                  </button>
                </div>
              )}

              {selectedResearch.status === 'sent_to_proofreader' && (
                <div className="mt-6 p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                      <Edit3 className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-rose-800">البحث لدى المدقق اللغوي</p>
                      <p className="text-sm text-rose-600">بانتظار إعادة البحث بعد التدقيق</p>
                    </div>
                  </div>
                </div>
              )}

              {/* زر الإغلاق */}
              <div className="mt-6">
                <button
                  onClick={() => setSelectedResearch(null)}
                  className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة طلب معلومات */}
      {showAddRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                إضافة طلب معلومات
              </h3>
              <button onClick={() => setShowAddRequestModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                طلب رقم: <span className="font-mono font-bold">INF-{String(selectedResearch?.informationRequests.length + 1).padStart(3, '0')}</span>
              </p>

              {/* تاريخ الطلب */}
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">تاريخ الطلب</label>
                <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <input
                    type="date"
                    value={newInfoRequest.date}
                    onChange={(e) => setNewInfoRequest({...newInfoRequest, date: e.target.value})}
                    className="bg-transparent flex-1 focus:outline-none"
                  />
                </div>
              </div>

              {/* الجهة المعنية */}
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">الدائرة / الجهة المعنية</label>
                <div className="relative">
                  <Building className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={newInfoRequest.targetEntity}
                    onChange={(e) => setNewInfoRequest({...newInfoRequest, targetEntity: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="مثال: وزارة المالية، البنك المركزي..."
                  />
                </div>
              </div>

              {/* موضوع الطلب */}
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">موضوع الطلب</label>
                <textarea
                  value={newInfoRequest.subject}
                  onChange={(e) => setNewInfoRequest({...newInfoRequest, subject: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-cyan-500 h-24 resize-none"
                  placeholder="اكتب موضوع طلب المعلومات..."
                />
              </div>

              {/* رفع كتاب الطلب */}
              <div className="mb-6">
                <label className="block text-slate-700 font-semibold mb-2">
                  كتاب الطلب <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-cyan-400 transition-colors">
                  <input
                    type="file"
                    id="requestFile"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNewInfoRequest({...newInfoRequest, attachedFile: {
                          name: file.name,
                          size: file.size,
                          type: file.type
                        }});
                      }
                    }}
                    className="hidden"
                  />
                  {newInfoRequest.attachedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Paperclip className="w-5 h-5 text-cyan-500" />
                      <span className="text-slate-700">{newInfoRequest.attachedFile.name}</span>
                      <button
                        onClick={() => setNewInfoRequest({...newInfoRequest, attachedFile: null})}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="requestFile" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 text-sm">اضغط لرفع كتاب الطلب</p>
                      <p className="text-slate-400 text-xs mt-1">PDF, DOC, DOCX</p>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddInfoRequest}
                  className="flex-1 bg-cyan-500 text-white py-3 rounded-xl hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  إضافة الطلب
                </button>
                <button
                  onClick={() => setShowAddRequestModal(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إرسال البحث للمدقق اللغوي */}
      {showSendToProofreaderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                إرسال للمدقق اللغوي
              </h3>
              <button onClick={() => setShowSendToProofreaderModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">البحث</p>
                <p className="font-bold text-slate-800">{selectedResearch?.title}</p>
              </div>

              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  يرجى رفع ملف البحث بصيغة Word (DOC أو DOCX) ليتمكن المدقق اللغوي من التعديل عليه
                </p>
              </div>

              {/* رفع ملف البحث */}
              <div className="mb-6">
                <label className="block text-slate-700 font-semibold mb-2">
                  ملف البحث (Word) <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-rose-300 rounded-xl p-6 text-center hover:border-rose-400 transition-colors bg-rose-50/50">
                  <input
                    type="file"
                    id="researchFileUpload"
                    accept=".doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setResearchFile({
                          name: file.name,
                          size: file.size,
                          type: file.type,
                          uploadDate: new Date().toISOString()
                        });
                      }
                    }}
                    className="hidden"
                  />
                  {researchFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-rose-500" />
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">{researchFile.name}</p>
                        <p className="text-xs text-slate-500">{(researchFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => setResearchFile(null)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="researchFileUpload" className="cursor-pointer">
                      <Upload className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                      <p className="text-slate-700 font-medium">اضغط لرفع ملف البحث</p>
                      <p className="text-slate-400 text-sm mt-1">DOC, DOCX فقط</p>
                      <p className="text-xs text-rose-500 mt-2">ملف Word قابل للتعديل</p>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSendToProofreader}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-xl hover:from-rose-600 hover:to-pink-700 transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  <Send className="w-5 h-5" />
                  إرسال للمدقق
                </button>
                <button
                  onClick={() => {
                    setShowSendToProofreaderModal(false);
                    setResearchFile(null);
                  }}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
