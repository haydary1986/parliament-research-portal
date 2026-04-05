import { useState, useEffect } from 'react';
import { User, Lock, FileText, Clock, CheckCircle, AlertCircle, LogOut, Eye, Bell, Home, List, Settings, ChevronLeft, Building, Upload, Play, Check, X, Calendar, MessageSquare, ArrowLeft, Users, ClipboardCheck, UserPlus, Plus, Trash2, Phone, Mail, BookOpen, Edit } from 'lucide-react';
import * as api from './api';

export default function DepartmentPortal({ onSwitchPortal, user }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loginData, setLoginData] = useState({ username: user?.name || '', password: '', department: user?.email === 'suad@parliament.iq' ? 'financial' : user?.email === 'hassan@parliament.iq' ? 'political' : user?.email === 'ali.m@parliament.iq' ? 'legal' : '' });
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNote, setCompletionNote] = useState('');

  // حالة نافذة التأكيد
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const [confirmData, setConfirmData] = useState({
    serviceType: '',
    classification: '',
    completionDays: 30
  });

  // أنواع الخدمات
  const serviceTypes = [
    { id: 'study', name: 'دراسة' },
    { id: 'report', name: 'تقرير' },
    { id: 'briefing', name: 'ورقة إحاطة' },
    { id: 'opinion', name: 'بيان رأي' },
    { id: 'parliamentary_question', name: 'سؤال نيابي' },
  ];

  // تصنيفات الخدمة البحثية
  const classifications = [
    { id: 'scientific', name: 'علمي' },
    { id: 'social', name: 'اجتماعي' },
    { id: 'political', name: 'سياسي' },
    { id: 'legal', name: 'قانوني' },
    { id: 'financial', name: 'مالية واقتصادية' },
  ];

  // قائمة الأقسام
  const departmentsList = [
    { id: 'financial', name: 'قسم البحوث المالية والاقتصادية', head: 'د. علي حسن', color: 'from-blue-500 to-blue-600' },
    { id: 'political', name: 'قسم البحوث السياسية', head: 'د. فاطمة أحمد', color: 'from-purple-500 to-purple-600' },
    { id: 'legal', name: 'قسم الدراسات القانونية', head: 'أ. محمد سالم', color: 'from-amber-500 to-amber-600' },
    { id: 'social', name: 'قسم البحوث الاجتماعية', head: 'د. زينب كريم', color: 'from-pink-500 to-pink-600' },
    { id: 'scientific', name: 'قسم البحوث العلمية', head: 'د. أحمد جواد', color: 'from-teal-500 to-teal-600' },
  ];

  // القسم الحالي (بعد تسجيل الدخول)
  const currentDepartment = departmentsList.find(d => d.id === loginData.department) || departmentsList[0];

  // الطلبات الموجهة للقسم
  const [requests, setRequests] = useState([]);

  // جلب الطلبات والموظفين من API
  useEffect(() => {
    if (!isLoggedIn || !api.getToken()) return;
    api.getRequests({ department: loginData.department }).then(res => {
      if (res.success && res.data) {
        setRequests(res.data.map(r => ({
          id: r.id, title: r.title, deputy: r.deputy_name || '', committee: r.committee || '',
          purpose: r.purpose || '', dateReceived: r.date_received?.split('T')[0] || '',
          deadline: r.deadline?.split('T')[0] || '', status: r.status === 'assigned' ? 'new' : r.status,
          assignedTo: r.assigned_department, description: r.description || '',
          researcher: null, notes: [], phone: r.phone || '', email: r.email || '',
        })));
      }
    }).catch(() => {});
    api.getUsers({ department: loginData.department }).then(res => {
      if (res.success && res.data) {
        const apiStaff = res.data.filter(u => u.role === 'researcher' || u.role === 'proofreader').map(u => ({
          id: u.id, name: u.name, role: u.role, specialization: u.specialization || '',
          department: u.department_id || loginData.department, email: u.email, phone: u.phone || '',
          status: u.status, activeTasks: 0, permissions: u.permissions || [],
        }));
        if (apiStaff.length > 0) setStaff(prev => [...apiStaff, ...prev.filter(s => !apiStaff.find(a => a.email === s.email))]);
      }
    }).catch(() => {});
  }, [isLoggedIn, loginData.department]);

  // موظفو القسم (باحثين + مدققين)
  const [staff, setStaff] = useState([
    { id: 1, name: 'د. نور الدين', role: 'researcher', specialization: 'اقتصاد', department: 'financial', email: 'nour@parliament.iq', phone: '0770 111 2222', status: 'active', activeTasks: 1, permissions: ['view_assigned', 'submit_research', 'request_info'] },
    { id: 2, name: 'أ. حسين محمد', role: 'researcher', specialization: 'علاقات دولية', department: 'political', email: 'hussein@parliament.iq', phone: '0770 222 3333', status: 'active', activeTasks: 2, permissions: ['view_assigned', 'submit_research', 'request_info'] },
    { id: 3, name: 'أ. رنا علي', role: 'researcher', specialization: 'قانون دستوري', department: 'legal', email: 'rana@parliament.iq', phone: '0770 333 4444', status: 'active', activeTasks: 0, permissions: ['view_assigned', 'submit_research', 'request_info'] },
    { id: 4, name: 'د. سمية أحمد', role: 'researcher', specialization: 'علم اجتماع', department: 'social', email: 'sumaya@parliament.iq', phone: '0770 444 5555', status: 'active', activeTasks: 1, permissions: ['view_assigned', 'submit_research'] },
    { id: 5, name: 'د. كريم حسن', role: 'researcher', specialization: 'بيئة', department: 'scientific', email: 'kareem@parliament.iq', phone: '0770 555 6666', status: 'active', activeTasks: 0, permissions: ['view_assigned', 'submit_research', 'request_info'] },
    { id: 6, name: 'أ. محمد الخطاط', role: 'proofreader', specialization: 'تدقيق لغوي', department: 'financial', email: 'mohammed.k@parliament.iq', phone: '0770 666 7777', status: 'active', activeTasks: 1, permissions: ['proofread', 'edit_research'] },
    { id: 7, name: 'أ. هدى السامرائي', role: 'proofreader', specialization: 'تدقيق لغوي', department: 'legal', email: 'huda@parliament.iq', phone: '0770 777 8888', status: 'active', activeTasks: 0, permissions: ['proofread', 'edit_research'] },
    { id: 8, name: 'أ. ياسر الكناني', role: 'proofreader', specialization: 'تدقيق لغوي', department: 'political', email: 'yaser@parliament.iq', phone: '0770 888 9999', status: 'active', activeTasks: 0, permissions: ['proofread'] },
  ]);

  // الصلاحيات المتاحة لموظفي القسم
  const staffPermissions = [
    { id: 'view_assigned', name: 'عرض المهام المسندة', category: 'البحوث', roles: ['researcher'] },
    { id: 'submit_research', name: 'تسليم البحث', category: 'البحوث', roles: ['researcher'] },
    { id: 'request_info', name: 'طلب معلومات من جهات', category: 'البحوث', roles: ['researcher'] },
    { id: 'view_department', name: 'عرض بيانات القسم', category: 'القسم', roles: ['researcher', 'proofreader'] },
    { id: 'proofread', name: 'التدقيق اللغوي', category: 'التدقيق', roles: ['proofreader'] },
    { id: 'edit_research', name: 'تعديل البحث', category: 'التدقيق', roles: ['proofreader'] },
    { id: 'view_all_research', name: 'عرض جميع بحوث القسم', category: 'القسم', roles: ['researcher', 'proofreader'] },
  ];

  const staffRoles = [
    { id: 'researcher', name: 'باحث', color: 'bg-cyan-100 text-cyan-700', dotColor: 'bg-cyan-500' },
    { id: 'proofreader', name: 'مدقق لغوي', color: 'bg-rose-100 text-rose-700', dotColor: 'bg-rose-500' },
  ];

  // إدارة الموظفين
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffFilter, setStaffFilter] = useState('all');
  const [newStaff, setNewStaff] = useState({ name: '', email: '', phone: '', specialization: '', role: 'researcher' });

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.email || !newStaff.specialization) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const defaultPerms = newStaff.role === 'researcher'
      ? ['view_assigned', 'submit_research', 'request_info']
      : ['proofread', 'edit_research'];
    const member = {
      id: Date.now(),
      name: newStaff.name,
      email: newStaff.email,
      phone: newStaff.phone,
      specialization: newStaff.specialization,
      role: newStaff.role,
      department: loginData.department,
      status: 'active',
      activeTasks: 0,
      permissions: defaultPerms,
    };
    setStaff([...staff, member]);
    setShowAddStaffModal(false);
    setNewStaff({ name: '', email: '', phone: '', specialization: '', role: 'researcher' });
  };

  const handleToggleStaffStatus = (staffId) => {
    setStaff(staff.map(s =>
      s.id === staffId ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s
    ));
  };

  const handleDeleteStaff = (staffId) => {
    const member = staff.find(s => s.id === staffId);
    if (member?.activeTasks > 0) {
      alert('لا يمكن حذف موظف لديه مهام نشطة');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف "${member?.name}"؟`)) {
      setStaff(staff.filter(s => s.id !== staffId));
    }
  };

  const handleTogglePermission = (staffId, permId) => {
    setStaff(staff.map(s => {
      if (s.id !== staffId) return s;
      const has = s.permissions.includes(permId);
      return { ...s, permissions: has ? s.permissions.filter(p => p !== permId) : [...s.permissions, permId] };
    }));
  };

  const myStaff = staff.filter(s => s.department === loginData.department);
  const myResearchers = myStaff.filter(s => s.role === 'researcher');
  const myProofreaders = myStaff.filter(s => s.role === 'proofreader');
  const filteredStaff = staffFilter === 'all' ? myStaff : myStaff.filter(s => s.role === staffFilter);

  // للتوافق مع باقي الكود القديم
  const researchers = staff;

  const notifications = [
    { id: 1, text: 'طلب جديد تم توجيهه للقسم', time: 'منذ ساعة', read: false },
    { id: 2, text: 'تذكير: موعد تسليم REQ-003 بعد أسبوع', time: 'منذ يوم', read: false },
  ];

  const getStatusInfo = (status) => {
    switch(status) {
      case 'new': return { label: 'جديد', color: 'bg-orange-500', bgLight: 'bg-orange-100 text-orange-700', icon: AlertCircle };
      case 'in_progress': return { label: 'قيد الإعداد', color: 'bg-blue-500', bgLight: 'bg-blue-100 text-blue-700', icon: Play };
      case 'review': return { label: 'قيد المراجعة', color: 'bg-yellow-500', bgLight: 'bg-yellow-100 text-yellow-700', icon: Eye };
      case 'completed': return { label: 'مكتمل', color: 'bg-green-500', bgLight: 'bg-green-100 text-green-700', icon: CheckCircle };
      default: return { label: 'غير محدد', color: 'bg-gray-500', bgLight: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.username && loginData.password && loginData.department) {
      setIsLoggedIn(true);
    }
  };

  // بدء العمل على طلب
  const handleStartWork = (requestId, researcherId) => {
    const researcher = researchers.find(r => r.id === researcherId);
    setRequests(prev => prev.map(req =>
      req.id === requestId
        ? {
            ...req,
            status: 'in_progress',
            researcher: researcher?.name,
            notes: [...req.notes, { date: new Date().toISOString().split('T')[0], text: `تم تكليف ${researcher?.name} بالعمل على الطلب` }]
          }
        : req
    ));
    setSelectedRequest(null);
  };

  // إرسال للمراجعة
  const handleSendToReview = (requestId) => {
    setRequests(prev => prev.map(req =>
      req.id === requestId
        ? {
            ...req,
            status: 'review',
            notes: [...req.notes, { date: new Date().toISOString().split('T')[0], text: 'تم إرسال البحث للمراجعة النهائية' }]
          }
        : req
    ));
  };

  // إكمال الطلب
  const handleCompleteRequest = (requestId) => {
    setRequests(prev => prev.map(req =>
      req.id === requestId
        ? {
            ...req,
            status: 'completed',
            completedDate: new Date().toISOString().split('T')[0],
            notes: [...req.notes, { date: new Date().toISOString().split('T')[0], text: completionNote || 'تم إكمال البحث وتسليمه' }]
          }
        : req
    ));
    setShowCompleteModal(false);
    setCompletionNote('');
    setSelectedRequest(null);
  };

  // إضافة ملاحظة
  const handleAddNote = (requestId, noteText) => {
    if (!noteText.trim()) return;
    setRequests(prev => prev.map(req =>
      req.id === requestId
        ? {
            ...req,
            notes: [...req.notes, { date: new Date().toISOString().split('T')[0], text: noteText }]
          }
        : req
    ));
  };

  // فتح نافذة التأكيد
  const handleOpenConfirm = (request) => {
    setConfirmRequest(request);
    setConfirmData({
      serviceType: '',
      classification: '',
      completionDays: 30
    });
    setShowConfirmModal(true);
  };

  // تأكيد الطلب
  const handleConfirmRequest = () => {
    if (!confirmData.serviceType || !confirmData.classification) {
      alert('يرجى تحديد نوع الخدمة والتصنيف');
      return;
    }
    const referralDate = new Date().toISOString().split('T')[0];
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + confirmData.completionDays);

    setRequests(prev => prev.map(req =>
      req.id === confirmRequest.id
        ? {
            ...req,
            serviceType: confirmData.serviceType,
            classification: confirmData.classification,
            referralDate: referralDate,
            completionDays: confirmData.completionDays,
            deadline: deadline.toISOString().split('T')[0],
            confirmed: true,
            notes: [...req.notes, {
              date: referralDate,
              text: `تم تأكيد الطلب - نوع الخدمة: ${serviceTypes.find(s => s.id === confirmData.serviceType)?.name} - التصنيف: ${classifications.find(c => c.id === confirmData.classification)?.name} - مدة الإنجاز: ${confirmData.completionDays} يوم`
            }]
          }
        : req
    ));
    setShowConfirmModal(false);
    setConfirmRequest(null);
  };

  // فلترة الطلبات حسب القسم
  const departmentRequests = requests.filter(r => r.assignedTo === loginData.department);

  const stats = {
    total: departmentRequests.length,
    new: departmentRequests.filter(r => r.status === 'new').length,
    inProgress: departmentRequests.filter(r => r.status === 'in_progress').length,
    review: departmentRequests.filter(r => r.status === 'review').length,
    completed: departmentRequests.filter(r => r.status === 'completed').length,
  };

  // صفحة تسجيل الدخول
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          {/* زر العودة */}
          <button
            onClick={onSwitchPortal}
            className="mb-6 flex items-center gap-2 text-indigo-300 hover:text-indigo-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للصفحة الرئيسية
          </button>

          {/* الشعار والعنوان */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">دائرة البحوث والدراسات</h1>
            <p className="text-indigo-300">بوابة الأقسام البحثية</p>
          </div>

          {/* نموذج تسجيل الدخول */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-6">تسجيل دخول القسم</h2>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* اختيار القسم */}
              <div>
                <label className="block text-indigo-200 text-sm mb-2">القسم</label>
                <div className="relative">
                  <Building className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                  <select
                    value={loginData.department}
                    onChange={(e) => setLoginData({...loginData, department: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent appearance-none"
                    required
                  >
                    <option value="" className="text-slate-900">اختر القسم</option>
                    {departmentsList.map(dept => (
                      <option key={dept.id} value={dept.id} className="text-slate-900">{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-indigo-200 text-sm mb-2">اسم المستخدم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                  <input
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    placeholder="أدخل اسم المستخدم"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-indigo-200 text-sm mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-400 to-purple-500 text-white font-bold py-3 rounded-xl hover:from-indigo-500 hover:to-purple-600 transition-all shadow-lg shadow-indigo-500/30"
              >
                دخول
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // لوحة تحكم القسم
  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* الشريط العلوي */}
      <header className={`bg-gradient-to-r ${currentDepartment.color} text-white shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold">{currentDepartment.name}</h1>
              <p className="text-xs text-white/80">رئيس القسم: {currentDepartment.head}</p>
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
                  <div className={`bg-gradient-to-r ${currentDepartment.color} text-white px-4 py-3 font-bold`}>الإشعارات</div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${!notif.read ? 'bg-indigo-50' : ''}`}>
                        <p className="text-sm text-slate-700">{notif.text}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* معلومات المستخدم */}
            <div className="flex items-center gap-3 bg-white/10 rounded-full pr-2 pl-4 py-1">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{loginData.username}</p>
                <p className="text-xs text-white/80">باحث</p>
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
            <div className={`p-4 bg-gradient-to-r ${currentDepartment.color} text-white`}>
              <p className="font-bold">القائمة الرئيسية</p>
            </div>
            <div className="p-2">
              {[
                { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
                { id: 'requests', label: 'الطلبات الواردة', icon: List },
                { id: 'in-progress', label: 'قيد الإعداد', icon: Play },
                { id: 'completed', label: 'المكتملة', icon: CheckCircle },
                { id: 'staff', label: 'إدارة الموظفين', icon: Users },
                { id: 'settings', label: 'الإعدادات', icon: Settings },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    currentPage === item.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.id === 'requests' && stats.new > 0 && (
                    <span className="mr-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.new}</span>
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
                  { label: 'إجمالي الطلبات', value: stats.total, icon: FileText, color: 'from-slate-500 to-slate-600' },
                  { label: 'طلبات جديدة', value: stats.new, icon: AlertCircle, color: 'from-orange-500 to-orange-600' },
                  { label: 'قيد الإعداد', value: stats.inProgress, icon: Play, color: 'from-blue-500 to-blue-600' },
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

              {/* الطلبات الجديدة */}
              {stats.new > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-orange-50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      طلبات جديدة تحتاج للتعيين
                    </h2>
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm">{stats.new}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {departmentRequests.filter(r => r.status === 'new').map(req => (
                      <div key={req.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                              <FileText className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{req.title}</p>
                              <p className="text-sm text-slate-500">{req.deputy} • {req.committee}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!req.confirmed ? (
                              <button
                                onClick={() => handleOpenConfirm(req)}
                                className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
                              >
                                <ClipboardCheck className="w-4 h-4" />
                                تأكيد
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedRequest(req)}
                                className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
                              >
                                <Play className="w-4 h-4" />
                                تعيين باحث
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* الطلبات قيد الإعداد */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">الطلبات قيد العمل</h2>
                  <button
                    onClick={() => setCurrentPage('in-progress')}
                    className="text-indigo-500 text-sm hover:text-indigo-600 flex items-center gap-1"
                  >
                    عرض الكل <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {departmentRequests.filter(r => r.status === 'in_progress' || r.status === 'review').slice(0, 3).map(req => (
                    <div key={req.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            req.status === 'review' ? 'bg-yellow-100' : 'bg-blue-100'
                          }`}>
                            <FileText className={`w-5 h-5 ${
                              req.status === 'review' ? 'text-yellow-500' : 'text-blue-500'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{req.title}</p>
                            <p className="text-sm text-slate-500">الباحث: {req.researcher}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${getStatusInfo(req.status).bgLight}`}>
                          {getStatusInfo(req.status).label}
                        </span>
                      </div>
                    </div>
                  ))}
                  {stats.inProgress === 0 && stats.review === 0 && (
                    <div className="px-6 py-8 text-center text-slate-500">
                      لا توجد طلبات قيد العمل حالياً
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* صفحة الطلبات الواردة */}
          {currentPage === 'requests' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">جميع الطلبات الواردة</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {departmentRequests.map(req => (
                  <div key={req.id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          req.status === 'new' ? 'bg-orange-100' :
                          req.status === 'completed' ? 'bg-green-100' :
                          req.status === 'review' ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}>
                          <FileText className={`w-6 h-6 ${
                            req.status === 'new' ? 'text-orange-500' :
                            req.status === 'completed' ? 'text-green-500' :
                            req.status === 'review' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{req.title}</p>
                          <p className="text-sm text-slate-500 mt-1">{req.id} • {req.deputy}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            الغرض: {req.purpose} • الموعد النهائي: {req.deadline}
                          </p>
                          {req.researcher && (
                            <p className="text-sm text-indigo-600 mt-1">الباحث: {req.researcher}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm text-white ${getStatusInfo(req.status).color}`}>
                        {getStatusInfo(req.status).label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <p className="text-sm text-slate-400">تاريخ الاستلام: {req.dateReceived}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="text-indigo-500 hover:text-indigo-700 text-sm flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" /> التفاصيل
                        </button>
                        {req.status === 'new' && !req.confirmed && (
                          <button
                            onClick={() => handleOpenConfirm(req)}
                            className="bg-amber-500 text-white px-3 py-1 rounded-lg hover:bg-amber-600 text-sm flex items-center gap-1"
                          >
                            <ClipboardCheck className="w-4 h-4" /> تأكيد
                          </button>
                        )}
                        {req.status === 'new' && req.confirmed && (
                          <button
                            onClick={() => setSelectedRequest(req)}
                            className="bg-indigo-500 text-white px-3 py-1 rounded-lg hover:bg-indigo-600 text-sm"
                          >
                            تعيين باحث
                          </button>
                        )}
                        {req.status === 'in_progress' && (
                          <button
                            onClick={() => handleSendToReview(req.id)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600 text-sm"
                          >
                            إرسال للمراجعة
                          </button>
                        )}
                        {req.status === 'review' && (
                          <button
                            onClick={() => { setSelectedRequest(req); setShowCompleteModal(true); }}
                            className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-sm"
                          >
                            إتمام وتسليم
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* صفحة قيد الإعداد */}
          {currentPage === 'in-progress' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">الطلبات قيد الإعداد</h2>
              {departmentRequests.filter(r => r.status === 'in_progress' || r.status === 'review').map(req => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{req.title}</h3>
                      <p className="text-slate-500">{req.deputy} • {req.committee}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm text-white ${getStatusInfo(req.status).color}`}>
                      {getStatusInfo(req.status).label}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs text-slate-500">الباحث المكلف</p>
                      <p className="font-semibold text-slate-800">{req.researcher}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">تاريخ الاستلام</p>
                      <p className="font-semibold text-slate-800">{req.dateReceived}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">الموعد النهائي</p>
                      <p className="font-semibold text-slate-800">{req.deadline}</p>
                    </div>
                  </div>

                  {/* سجل الملاحظات */}
                  {req.notes.length > 0 && (
                    <div className="mb-4">
                      <p className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> سجل التحديثات
                      </p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {req.notes.map((note, idx) => (
                          <div key={idx} className="flex gap-3 text-sm">
                            <span className="text-slate-400 whitespace-nowrap">{note.date}</span>
                            <span className="text-slate-600">{note.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    {req.status === 'in_progress' && (
                      <button
                        onClick={() => handleSendToReview(req.id)}
                        className="flex-1 bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> إرسال للمراجعة
                      </button>
                    )}
                    {req.status === 'review' && (
                      <button
                        onClick={() => { setSelectedRequest(req); setShowCompleteModal(true); }}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> إتمام وتسليم
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      التفاصيل
                    </button>
                  </div>
                </div>
              ))}
              {departmentRequests.filter(r => r.status === 'in_progress' || r.status === 'review').length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <Play className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد طلبات قيد الإعداد حالياً</p>
                </div>
              )}
            </div>
          )}

          {/* صفحة المكتملة */}
          {currentPage === 'completed' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">البحوث المكتملة</h2>
              {departmentRequests.filter(r => r.status === 'completed').map(req => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{req.title}</h3>
                        <p className="text-slate-500">{req.deputy} • {req.committee}</p>
                        <p className="text-sm text-green-600 mt-1">تم التسليم: {req.completedDate}</p>
                      </div>
                    </div>
                    <span className="px-4 py-2 rounded-full text-sm bg-green-100 text-green-700">
                      مكتمل
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" /> عرض البحث
                    </button>
                    <button className="flex-1 bg-indigo-100 text-indigo-700 py-2 rounded-lg hover:bg-indigo-200 transition-colors flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" /> تحميل PDF
                    </button>
                  </div>
                </div>
              ))}
              {departmentRequests.filter(r => r.status === 'completed').length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد بحوث مكتملة بعد</p>
                </div>
              )}
            </div>
          )}

          {/* صفحة إدارة الموظفين */}
          {currentPage === 'staff' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">إدارة موظفي القسم</h2>
                  <p className="text-slate-500 text-sm mt-1">إنشاء حسابات الباحثين والمدققين وإدارة صلاحياتهم</p>
                </div>
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-xl hover:bg-indigo-600 transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  إضافة موظف
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي الموظفين', value: myStaff.length, icon: Users, color: 'from-indigo-500 to-indigo-600' },
                  { label: 'الباحثون', value: myResearchers.length, icon: BookOpen, color: 'from-cyan-500 to-cyan-600' },
                  { label: 'المدققون', value: myProofreaders.length, icon: Edit, color: 'from-rose-500 to-rose-600' },
                  { label: 'متاح حالياً', value: myStaff.filter(s => s.activeTasks === 0 && s.status === 'active').length, icon: CheckCircle, color: 'from-green-500 to-green-600' },
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

              {/* فلتر */}
              <div className="flex gap-2">
                {[{ id: 'all', label: 'الكل' }, { id: 'researcher', label: 'الباحثون' }, { id: 'proofreader', label: 'المدققون' }].map(f => (
                  <button key={f.id} onClick={() => setStaffFilter(f.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${staffFilter === f.id ? 'bg-indigo-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                  >{f.label}</button>
                ))}
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredStaff.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">لا يوجد موظفون</p>
                    </div>
                  ) : (
                    filteredStaff.map(member => {
                      const roleInfo = staffRoles.find(r => r.id === member.role);
                      return (
                        <div key={member.id} className="px-6 py-5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${member.role === 'researcher' ? 'bg-cyan-100' : 'bg-rose-100'}`}>
                                {member.role === 'researcher' ? <BookOpen className="w-6 h-6 text-cyan-500" /> : <Edit className="w-6 h-6 text-rose-500" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-bold text-slate-800">{member.name}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${roleInfo?.color}`}>{roleInfo?.name}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {member.status === 'active' ? 'نشط' : 'معطّل'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1">{member.specialization}</p>
                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>
                                  {member.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{member.phone}</span>}
                                </div>
                                <div className="flex items-center gap-1 mt-2 flex-wrap">
                                  {member.permissions.map(p => { const perm = staffPermissions.find(sp => sp.id === p); return perm ? <span key={p} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">{perm.name}</span> : null; })}
                                </div>
                                <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-lg ${member.activeTasks > 0 ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                  {member.activeTasks > 0 ? `${member.activeTasks} مهمة نشطة` : 'متاح'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setSelectedStaff(member); setShowPermissionsModal(true); }} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors" title="الصلاحيات"><ClipboardCheck className="w-4 h-4" /></button>
                              <button onClick={() => handleToggleStaffStatus(member.id)} className={`p-2 rounded-lg transition-colors ${member.status === 'active' ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`} title={member.status === 'active' ? 'تعطيل' : 'تفعيل'}>
                                {member.status === 'active' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => handleDeleteStaff(member.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* نافذة إضافة موظف */}
          {showAddStaffModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                  <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus className="w-5 h-5" /> إنشاء حساب موظف جديد</h3>
                  <button onClick={() => setShowAddStaffModal(false)} className="hover:bg-white/20 p-1 rounded"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">نوع الحساب *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setNewStaff({...newStaff, role: 'researcher'})}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${newStaff.role === 'researcher' ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-cyan-300'}`}>
                        <BookOpen className={`w-8 h-8 mx-auto mb-2 ${newStaff.role === 'researcher' ? 'text-cyan-500' : 'text-slate-400'}`} />
                        <p className="font-bold text-slate-800">باحث</p>
                        <p className="text-xs text-slate-500 mt-1">إعداد البحوث والدراسات</p>
                      </button>
                      <button onClick={() => setNewStaff({...newStaff, role: 'proofreader'})}
                        className={`p-4 rounded-xl border-2 transition-all text-center ${newStaff.role === 'proofreader' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-rose-300'}`}>
                        <Edit className={`w-8 h-8 mx-auto mb-2 ${newStaff.role === 'proofreader' ? 'text-rose-500' : 'text-slate-400'}`} />
                        <p className="font-bold text-slate-800">مدقق لغوي</p>
                        <p className="text-xs text-slate-500 mt-1">تدقيق ومراجعة البحوث</p>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">الاسم الكامل *</label>
                    <input type="text" value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="أدخل الاسم الكامل" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">البريد الإلكتروني *</label>
                    <input type="email" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="example@parliament.iq" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">رقم الهاتف</label>
                    <input type="text" value={newStaff.phone} onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0770 000 0000" />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-2">التخصص *</label>
                    <input type="text" value={newStaff.specialization} onChange={(e) => setNewStaff({...newStaff, specialization: e.target.value})}
                      className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={newStaff.role === 'proofreader' ? 'مثال: تدقيق لغوي عربي' : 'مثال: اقتصاد كلي، قانون دستوري...'} />
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-700 mb-2 text-sm">الصلاحيات الافتراضية:</p>
                    <div className="flex flex-wrap gap-1">
                      {staffPermissions.filter(p => p.roles.includes(newStaff.role)).map(p => (
                        <span key={p.id} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">{p.name}</span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">يمكن تعديل الصلاحيات بعد الإنشاء</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                    <p className="text-sm text-indigo-700 flex items-center gap-2"><Building className="w-4 h-4" /> القسم: <strong>{currentDepartment?.name}</strong></p>
                    <p className="text-xs text-indigo-500 mt-1">كلمة المرور الافتراضية: 123456</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddStaff} className="flex-1 bg-indigo-500 text-white py-3 rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" /> إنشاء الحساب
                    </button>
                    <button onClick={() => setShowAddStaffModal(false)} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors">إلغاء</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* نافذة إدارة الصلاحيات */}
          {showPermissionsModal && selectedStaff && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                  <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardCheck className="w-5 h-5" /> صلاحيات: {selectedStaff.name}</h3>
                  <button onClick={() => { setShowPermissionsModal(false); setSelectedStaff(null); }} className="hover:bg-white/20 p-1 rounded"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6">
                  <div className="mb-4 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedStaff.role === 'researcher' ? 'bg-cyan-100' : 'bg-rose-100'}`}>
                      {selectedStaff.role === 'researcher' ? <BookOpen className="w-5 h-5 text-cyan-500" /> : <Edit className="w-5 h-5 text-rose-500" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{selectedStaff.name}</p>
                      <p className="text-sm text-slate-500">{staffRoles.find(r => r.id === selectedStaff.role)?.name} • {selectedStaff.email}</p>
                    </div>
                  </div>
                  {['البحوث', 'القسم', 'التدقيق'].map(category => {
                    const perms = staffPermissions.filter(p => p.category === category);
                    if (perms.length === 0) return null;
                    return (
                      <div key={category} className="mb-4">
                        <p className="font-semibold text-slate-600 text-sm mb-2">{category}</p>
                        <div className="space-y-2">
                          {perms.map(perm => {
                            const hasIt = selectedStaff.permissions.includes(perm.id);
                            const isApplicable = perm.roles.includes(selectedStaff.role);
                            return (
                              <button key={perm.id} onClick={() => isApplicable && handleTogglePermission(selectedStaff.id, perm.id)} disabled={!isApplicable}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-right ${!isApplicable ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' : hasIt ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${hasIt ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`}>
                                    {hasIt && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className={`text-sm ${hasIt ? 'text-purple-700 font-medium' : 'text-slate-600'}`}>{perm.name}</span>
                                </div>
                                {!isApplicable && <span className="text-xs text-slate-400">غير متاح لهذا الدور</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => { setShowPermissionsModal(false); setSelectedStaff(null); }}
                    className="w-full mt-4 bg-purple-500 text-white py-3 rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> حفظ الصلاحيات
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* صفحة الإعدادات */}
          {currentPage === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">إعدادات القسم</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">إشعارات الطلبات الجديدة</p>
                    <p className="text-sm text-slate-500">استلام إشعار عند ورود طلب جديد</p>
                  </div>
                  <button className="w-12 h-6 bg-indigo-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">تذكير المواعيد النهائية</p>
                    <p className="text-sm text-slate-500">تذكير قبل الموعد النهائي بأسبوع</p>
                  </div>
                  <button className="w-12 h-6 bg-indigo-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* نافذة تفاصيل الطلب وتعيين الباحث */}
      {selectedRequest && !showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className={`bg-gradient-to-r ${currentDepartment.color} text-white px-6 py-4 flex items-center justify-between`}>
              <h3 className="font-bold text-lg">تفاصيل الطلب</h3>
              <button onClick={() => setSelectedRequest(null)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="mb-6">
                <h4 className="font-bold text-xl text-slate-800 mb-2">{selectedRequest.title}</h4>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{selectedRequest.id}</span>
                  <span className={`px-2 py-1 rounded ${getStatusInfo(selectedRequest.status).bgLight}`}>
                    {getStatusInfo(selectedRequest.status).label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">مقدم الطلب</p>
                  <p className="font-semibold text-slate-800">{selectedRequest.deputy}</p>
                  <p className="text-sm text-slate-500">{selectedRequest.committee}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">معلومات التواصل</p>
                  <p className="text-sm text-slate-800">{selectedRequest.phone}</p>
                  <p className="text-sm text-slate-800">{selectedRequest.email}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">الغرض</p>
                  <p className="font-semibold text-slate-800">{selectedRequest.purpose}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">الموعد النهائي</p>
                  <p className="font-semibold text-slate-800">{selectedRequest.deadline}</p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 mb-1">تفاصيل الطلب</p>
                <p className="text-slate-800">{selectedRequest.description}</p>
              </div>

              {/* سجل الملاحظات */}
              {selectedRequest.notes.length > 0 && (
                <div className="mb-6">
                  <p className="font-semibold text-slate-700 mb-2">سجل التحديثات</p>
                  <div className="space-y-2 p-4 bg-slate-50 rounded-xl max-h-40 overflow-y-auto">
                    {selectedRequest.notes.map((note, idx) => (
                      <div key={idx} className="flex gap-3 text-sm border-b border-slate-200 pb-2 last:border-0">
                        <span className="text-slate-400 whitespace-nowrap">{note.date}</span>
                        <span className="text-slate-600">{note.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* تعيين باحث للطلبات الجديدة */}
              {selectedRequest.status === 'new' && (
                <div className="border-t border-slate-200 pt-6">
                  <p className="font-semibold text-slate-700 mb-3">تعيين باحث للعمل على الطلب:</p>
                  <div className="space-y-2">
                    {researchers.filter(r => r.department === loginData.department).map(researcher => (
                      <button
                        key={researcher.id}
                        onClick={() => handleStartWork(selectedRequest.id, researcher.id)}
                        className="w-full text-right p-4 border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{researcher.name}</p>
                          <p className="text-sm text-slate-500">التخصص: {researcher.specialization}</p>
                        </div>
                        <Play className="w-5 h-5 text-indigo-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* أزرار الإجراءات */}
              <div className="flex gap-2 mt-6">
                {selectedRequest.status === 'in_progress' && (
                  <button
                    onClick={() => { handleSendToReview(selectedRequest.id); setSelectedRequest(null); }}
                    className="flex-1 bg-yellow-500 text-white py-3 rounded-xl hover:bg-yellow-600 transition-colors"
                  >
                    إرسال للمراجعة
                  </button>
                )}
                {selectedRequest.status === 'review' && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="flex-1 bg-green-500 text-white py-3 rounded-xl hover:bg-green-600 transition-colors"
                  >
                    إتمام وتسليم
                  </button>
                )}
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إتمام الطلب */}
      {showCompleteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4">
              <h3 className="font-bold text-lg">إتمام وتسليم البحث</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-4">
                أنت على وشك تسليم البحث: <strong>{selectedRequest.title}</strong>
              </p>

              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">ملاحظات التسليم (اختياري)</label>
                <textarea
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
                  placeholder="أضف أي ملاحظات حول البحث المكتمل..."
                />
              </div>

              <div className="mb-6 p-4 bg-green-50 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded text-green-500" />
                  <span className="text-sm text-slate-700">تم رفع ملف البحث بصيغة PDF</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCompleteRequest(selectedRequest.id)}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  تأكيد التسليم
                </button>
                <button
                  onClick={() => { setShowCompleteModal(false); setCompletionNote(''); }}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الطلب */}
      {showConfirmModal && confirmRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" />
                تأكيد الطلب
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500 mb-1">الطلب</p>
                <p className="font-bold text-slate-800">{confirmRequest.title}</p>
                <p className="text-sm text-slate-500 mt-1">{confirmRequest.deputy}</p>
              </div>

              {/* نوع الخدمة */}
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">نوع الخدمة</label>
                <select
                  value={confirmData.serviceType}
                  onChange={(e) => setConfirmData({...confirmData, serviceType: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">اختر نوع الخدمة</option>
                  {serviceTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              {/* تصنيف الخدمة البحثية */}
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">تصنيف الخدمة البحثية</label>
                <select
                  value={confirmData.classification}
                  onChange={(e) => setConfirmData({...confirmData, classification: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">اختر التصنيف</option>
                  {classifications.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              {/* تاريخ الإحالة */}
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">تاريخ الإحالة إلى الباحث</label>
                <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-slate-500" />
                  <span className="text-slate-800">{new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="text-xs text-slate-500 mr-auto">(تاريخ النظام)</span>
                </div>
              </div>

              {/* مدة الإنجاز */}
              <div className="mb-6">
                <label className="block text-slate-700 font-semibold mb-2">مدة الإنجاز (بالأيام)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={confirmData.completionDays}
                    onChange={(e) => setConfirmData({...confirmData, completionDays: parseInt(e.target.value) || 30})}
                    min="1"
                    max="365"
                    className="w-24 border border-slate-300 rounded-xl py-3 px-4 text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-600">يوم</span>
                  <div className="mr-auto flex gap-2">
                    {[7, 14, 30, 60].map(days => (
                      <button
                        key={days}
                        onClick={() => setConfirmData({...confirmData, completionDays: days})}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          confirmData.completionDays === days
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {days}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConfirmRequest}
                  className="flex-1 bg-amber-500 text-white py-3 rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  تأكيد
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
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
