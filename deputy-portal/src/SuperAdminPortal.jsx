import { useState, useEffect } from 'react';
import {
  User, Lock, Shield, Settings, LogOut, Bell, Home, Users, Building2,
  FileText, BarChart3, History, Key, Plus, Edit, Trash2, X, Check,
  Search, ChevronDown, Eye, EyeOff, Save, RefreshCw, AlertTriangle,
  UserPlus, FolderPlus, ShieldCheck, Activity, Database, Cog, ArrowLeft
} from 'lucide-react';
import { getUsers, getDepartments, getActivityLogs, createUser, updateUserStatus, getToken } from './api';

export default function SuperAdminPortal({ onSwitchPortal, user }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditDepartmentModal, setShowEditDepartmentModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // الأقسام
  const [departments, setDepartments] = useState([
    { id: 'legal', name: 'القسم القانوني', head: 'أ. علي الموسوي', usersCount: 5, status: 'active', createdAt: '2023-01-15' },
    { id: 'financial', name: 'القسم المالي والاقتصادي', head: 'د. سعاد العلوي', usersCount: 4, status: 'active', createdAt: '2023-01-15' },
    { id: 'political', name: 'القسم السياسي', head: 'أ. كريم الحسني', usersCount: 3, status: 'active', createdAt: '2023-01-15' },
    { id: 'social', name: 'القسم الاجتماعي', head: 'د. نور الهدى', usersCount: 4, status: 'active', createdAt: '2023-01-15' },
    { id: 'scientific', name: 'القسم العلمي والبيئي', head: 'د. حسين جابر', usersCount: 3, status: 'active', createdAt: '2023-01-15' },
  ]);

  // المستخدمون
  const [users, setUsers] = useState([]);

  // جلب البيانات من الـ API
  useEffect(() => {
    if (!isLoggedIn || !getToken()) return;
    setLoading(true);
    Promise.all([
      getUsers().then(res => {
        if (res.success && res.data) {
          setUsers(res.data.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            department: u.department_id,
            status: u.status,
            lastLogin: u.last_login ? new Date(u.last_login).toLocaleDateString('ar-IQ') : '-',
            permissions: u.permissions || []
          })));
        }
      }).catch(() => {
        // fallback data
        setUsers([
          { id: 1, name: 'د. خالد العبيدي', email: 'khaled@parliament.iq', role: 'deputy', department: null, status: 'active', lastLogin: '2024-01-27', permissions: ['submit_request', 'view_own_requests'] },
          { id: 2, name: 'أ. سارة عبدالرحمن', email: 'sara@parliament.iq', role: 'deputy', department: null, status: 'active', lastLogin: '2024-01-26', permissions: ['submit_request', 'view_own_requests'] },
          { id: 3, name: 'أ. علي الموسوي', email: 'ali.m@parliament.iq', role: 'department_head', department: 'legal', status: 'active', lastLogin: '2024-01-27', permissions: [] },
          { id: 4, name: 'د. سعاد العلوي', email: 'suad@parliament.iq', role: 'department_head', department: 'financial', status: 'active', lastLogin: '2024-01-27', permissions: [] },
          { id: 5, name: 'د. نور الدين', email: 'nour@parliament.iq', role: 'researcher', department: 'financial', status: 'active', lastLogin: '2024-01-27', permissions: [] },
          { id: 6, name: 'أ. محمد الخطاط', email: 'mohammed.k@parliament.iq', role: 'proofreader', department: null, status: 'active', lastLogin: '2024-01-27', permissions: [] },
        ]);
      }),
      getDepartments().then(res => {
        if (res.success && res.data) {
          setDepartments(res.data.map(d => ({
            id: d.id,
            name: d.name,
            head: d.head_name,
            usersCount: d.researcher_count,
            status: 'active',
            createdAt: '2024-01-01'
          })));
        }
      }).catch(() => {}),
      getActivityLogs().then(res => {
        if (res.success && res.data) {
          setActivityLogData(res.data);
        }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [isLoggedIn]);

  // الأدوار والصلاحيات
  const roles = [
    { id: 'deputy', name: 'نائب', bgClass: 'bg-amber-100', textClass: 'text-amber-700', dotClass: 'bg-amber-500' },
    { id: 'manager', name: 'مدير الدائرة', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700', dotClass: 'bg-emerald-500' },
    { id: 'department_head', name: 'مسؤول قسم', bgClass: 'bg-indigo-100', textClass: 'text-indigo-700', dotClass: 'bg-indigo-500' },
    { id: 'researcher', name: 'باحث', bgClass: 'bg-cyan-100', textClass: 'text-cyan-700', dotClass: 'bg-cyan-500' },
    { id: 'proofreader', name: 'مدقق لغوي', bgClass: 'bg-rose-100', textClass: 'text-rose-700', dotClass: 'bg-rose-500' },
    { id: 'admin', name: 'مدير النظام', bgClass: 'bg-purple-100', textClass: 'text-purple-700', dotClass: 'bg-purple-500' },
  ];

  const allPermissions = [
    { id: 'submit_request', name: 'تقديم طلب بحث', category: 'الطلبات' },
    { id: 'view_own_requests', name: 'عرض طلباتي', category: 'الطلبات' },
    { id: 'view_all_requests', name: 'عرض جميع الطلبات', category: 'الطلبات' },
    { id: 'manage_requests', name: 'إدارة الطلبات', category: 'الطلبات' },
    { id: 'assign_researchers', name: 'تعيين الباحثين', category: 'الإدارة' },
    { id: 'view_department', name: 'عرض بيانات القسم', category: 'الأقسام' },
    { id: 'manage_department', name: 'إدارة القسم', category: 'الأقسام' },
    { id: 'view_assigned', name: 'عرض البحوث المحالة', category: 'البحوث' },
    { id: 'submit_research', name: 'تسليم البحث', category: 'البحوث' },
    { id: 'request_info', name: 'طلب معلومات', category: 'البحوث' },
    { id: 'proofread', name: 'التدقيق اللغوي', category: 'التدقيق' },
    { id: 'edit_research', name: 'تعديل البحث', category: 'التدقيق' },
    { id: 'manage_users', name: 'إدارة المستخدمين', category: 'النظام' },
    { id: 'manage_departments', name: 'إدارة الأقسام', category: 'النظام' },
    { id: 'view_reports', name: 'عرض التقارير', category: 'النظام' },
    { id: 'system_settings', name: 'إعدادات النظام', category: 'النظام' },
    { id: 'full_access', name: 'صلاحيات كاملة', category: 'النظام' },
  ];

  // سجل النشاطات
  const [activityLogData, setActivityLogData] = useState([]);
  const activityLog = activityLogData.length > 0
    ? activityLogData.map(a => ({
        id: a.id,
        user: a.user_name,
        action: a.details || a.action,
        target: a.entity_id || '',
        time: new Date(a.created_at).toLocaleString('ar-IQ'),
        type: a.entity_type || 'system'
      }))
    : [
        { id: 1, user: 'مدير النظام', action: 'إضافة مستخدم جديد', target: 'أ. محمد الخطاط', time: 'منذ 5 دقائق', type: 'user' },
        { id: 2, user: 'د. سعاد العلوي', action: 'تعيين باحث للطلب', target: 'REQ-006', time: 'منذ ساعة', type: 'request' },
        { id: 3, user: 'د. نور الدين', action: 'إرسال بحث للتدقيق', target: 'REQ-006', time: 'منذ ساعتين', type: 'research' },
        { id: 4, user: 'أ. محمد الخطاط', action: 'إكمال تدقيق بحث', target: 'REQ-005', time: 'منذ 3 ساعات', type: 'proofread' },
        { id: 5, user: 'د. خالد العبيدي', action: 'تقديم طلب جديد', target: 'REQ-007', time: 'منذ 4 ساعات', type: 'request' },
      ];

  const notifications = [
    { id: 1, text: 'مستخدم جديد بانتظار الموافقة', time: 'منذ 10 دقائق', read: false },
    { id: 2, text: 'تحديث النظام متاح', time: 'منذ ساعة', read: false },
    { id: 3, text: 'نسخة احتياطية مكتملة', time: 'منذ يوم', read: true },
  ];

  // إعدادات النظام
  const [systemSettings, setSystemSettings] = useState({
    siteName: 'دائرة البحوث والدراسات',
    maxRequestsPerDeputy: 5,
    maxInfoRequests: 3,
    defaultCompletionDays: 30,
    autoBackup: true,
    maintenanceMode: false,
    emailNotifications: true,
  });

  // نموذج إضافة قسم جديد
  const [newDepartment, setNewDepartment] = useState({
    name: '',
    head: '',
    status: 'active'
  });

  // نموذج إضافة مستخدم جديد
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    permissions: []
  });

  // نموذج تعديل قسم
  const [editDepartment, setEditDepartment] = useState({
    name: '',
    head: '',
    status: 'active',
  });

  // نموذج تعديل مستخدم
  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.username === 'admin' && loginData.password === 'admin123') {
      setIsLoggedIn(true);
    } else {
      alert('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  const handleAddDepartment = () => {
    if (!newDepartment.name) {
      alert('يرجى إدخال اسم القسم');
      return;
    }
    const dept = {
      id: `dept_${Date.now()}`,
      name: newDepartment.name,
      head: newDepartment.head || 'غير محدد',
      usersCount: 0,
      status: newDepartment.status,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setDepartments([...departments, dept]);
    setShowAddDepartmentModal(false);
    setNewDepartment({ name: '', head: '', status: 'active' });
  };

  const handleEditDepartment = () => {
    if (!editDepartment.name) {
      alert('يرجى إدخال اسم القسم');
      return;
    }
    setDepartments(departments.map(d =>
      d.id === selectedDepartment.id
        ? { ...d, name: editDepartment.name, head: editDepartment.head || 'غير محدد', status: editDepartment.status }
        : d
    ));
    setShowEditDepartmentModal(false);
    setSelectedDepartment(null);
  };

  const handleDeleteDepartment = (deptId) => {
    if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
      setDepartments(departments.filter(d => d.id !== deptId));
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.role) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    // محاولة الإضافة عبر API
    try {
      if (getToken()) {
        const res = await createUser({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password || '123456',
          role: newUser.role,
          department_id: newUser.department || null,
          permissions: newUser.permissions
        });
        if (res.success) {
          // إعادة جلب المستخدمين
          const usersRes = await getUsers();
          if (usersRes.success && usersRes.data) {
            setUsers(usersRes.data.map(u => ({
              id: u.id, name: u.name, email: u.email, role: u.role,
              department: u.department_id, status: u.status,
              lastLogin: u.last_login ? new Date(u.last_login).toLocaleDateString('ar-IQ') : '-',
              permissions: u.permissions || []
            })));
          }
          setShowAddUserModal(false);
          setNewUser({ name: '', email: '', password: '', role: '', department: '', permissions: [] });
          return;
        }
      }
    } catch (e) {
      // fallback للإضافة المحلية
    }

    const localUser = {
      id: Date.now(),
      name: newUser.name, email: newUser.email, role: newUser.role,
      department: newUser.department || null, status: 'active', lastLogin: '-',
      permissions: newUser.permissions
    };
    setUsers([...users, localUser]);
    setShowAddUserModal(false);
    setNewUser({ name: '', email: '', password: '', role: '', department: '', permissions: [] });
  };

  const handleDeleteUser = (userId) => {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleToggleUserStatus = async (userId) => {
    const targetUser = users.find(u => u.id === userId);
    const newStatus = targetUser?.status === 'active' ? 'inactive' : 'active';
    try {
      if (getToken()) await updateUserStatus(userId, newStatus);
    } catch {}
    setUsers(users.map(u =>
      u.id === userId
        ? { ...u, status: newStatus }
        : u
    ));
  };

  const handleEditUser = () => {
    if (!editUser.name || !editUser.email || !editUser.role) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    setUsers(users.map(u =>
      u.id === selectedUser.id
        ? { ...u, name: editUser.name, email: editUser.email, role: editUser.role, department: editUser.department || null }
        : u
    ));
    setShowEditUserModal(false);
    setSelectedUser(null);
  };

  const getRoleInfo = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role || { name: 'غير محدد', bgClass: 'bg-gray-100', textClass: 'text-gray-700', dotClass: 'bg-gray-500' };
  };

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    totalDepartments: departments.length,
    activeDepartments: departments.filter(d => d.status === 'active').length,
    deputies: users.filter(u => u.role === 'deputy').length,
    researchers: users.filter(u => u.role === 'researcher').length,
  };

  // صفحة تسجيل الدخول
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          {/* زر العودة */}
          <button
            onClick={onSwitchPortal}
            className="mb-6 flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للصفحة الرئيسية
          </button>

          {/* الشعار والعنوان */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">لوحة التحكم</h1>
            <p className="text-purple-300">السوبر أدمن</p>
          </div>

          {/* نموذج تسجيل الدخول */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-6">تسجيل دخول المدير</h2>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-purple-200 text-sm mb-2">اسم المستخدم</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    placeholder="أدخل اسم المستخدم"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300" />
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-3 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/30"
              >
                دخول
              </button>
            </form>

            <div className="mt-4 p-3 bg-purple-500/20 rounded-xl">
              <p className="text-xs text-purple-200 text-center">
                للتجربة: اسم المستخدم: admin | كلمة المرور: admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // لوحة التحكم الرئيسية
  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* الشريط العلوي */}
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold">لوحة التحكم - السوبر أدمن</h1>
              <p className="text-xs text-white/80">الإدارة الكاملة للنظام</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* البحث */}
            <div className="relative hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg py-2 pr-10 pl-4 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 w-64"
              />
            </div>

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
                  <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 font-bold">الإشعارات</div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${!notif.read ? 'bg-purple-50' : ''}`}>
                        <p className="text-sm text-slate-700">{notif.text}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* معلومات المدير */}
            <div className="flex items-center gap-3 bg-white/10 rounded-full pr-2 pl-4 py-1">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">مدير النظام</p>
                <p className="text-xs text-white/80">صلاحيات كاملة</p>
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
            <div className="p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
              <p className="font-bold">القائمة الرئيسية</p>
            </div>
            <div className="p-2">
              {[
                { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
                { id: 'users', label: 'إدارة المستخدمين', icon: Users },
                { id: 'departments', label: 'إدارة الأقسام', icon: Building2 },
                { id: 'permissions', label: 'الصلاحيات', icon: Key },
                { id: 'reports', label: 'التقارير', icon: BarChart3 },
                { id: 'activity', label: 'سجل النشاطات', icon: History },
                { id: 'settings', label: 'إعدادات النظام', icon: Cog },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    currentPage === item.id
                      ? 'bg-purple-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-blue-600', sub: `${stats.activeUsers} نشط` },
                  { label: 'الأقسام', value: stats.totalDepartments, icon: Building2, color: 'from-indigo-500 to-indigo-600', sub: `${stats.activeDepartments} نشط` },
                  { label: 'النواب', value: stats.deputies, icon: User, color: 'from-amber-500 to-amber-600', sub: 'مسجلون' },
                  { label: 'الباحثون', value: stats.researchers, icon: FileText, color: 'from-cyan-500 to-cyan-600', sub: 'مسجلون' },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm">
                    <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-slate-500 text-sm">{stat.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* آخر النشاطات */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-500" />
                    آخر النشاطات
                  </h2>
                  <button
                    onClick={() => setCurrentPage('activity')}
                    className="text-purple-500 text-sm hover:text-purple-700"
                  >
                    عرض الكل
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {activityLog.slice(0, 5).map(log => (
                    <div key={log.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            log.type === 'user' ? 'bg-blue-100' :
                            log.type === 'request' ? 'bg-amber-100' :
                            log.type === 'research' ? 'bg-cyan-100' :
                            'bg-rose-100'
                          }`}>
                            {log.type === 'user' ? <UserPlus className="w-5 h-5 text-blue-500" /> :
                             log.type === 'request' ? <FileText className="w-5 h-5 text-amber-500" /> :
                             log.type === 'research' ? <FileText className="w-5 h-5 text-cyan-500" /> :
                             <Check className="w-5 h-5 text-rose-500" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{log.action}</p>
                            <p className="text-sm text-slate-500">{log.user} • {log.target}</p>
                          </div>
                        </div>
                        <span className="text-sm text-slate-400">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* إحصائيات سريعة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* توزيع المستخدمين */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">توزيع المستخدمين حسب الدور</h3>
                  <div className="space-y-3">
                    {roles.map(role => {
                      const count = users.filter(u => u.role === role.id).length;
                      const percentage = Math.round((count / users.length) * 100) || 0;
                      return (
                        <div key={role.id} className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${role.dotClass}`}></span>
                          <span className="text-sm text-slate-600 w-28">{role.name}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-full rounded-full ${role.dotClass}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-500 w-12 text-left">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* حالة النظام */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">حالة النظام</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-700">الخادم يعمل بشكل طبيعي</span>
                      </div>
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-green-600" />
                        <span className="text-green-700">قاعدة البيانات متصلة</span>
                      </div>
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-slate-600" />
                        <span className="text-slate-700">آخر نسخة احتياطية</span>
                      </div>
                      <span className="text-sm text-slate-500">منذ يوم</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* إدارة المستخدمين */}
          {currentPage === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">إدارة المستخدمين</h2>
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-purple-500 text-white px-4 py-2 rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  إضافة مستخدم
                </button>
              </div>

              {/* فلترة */}
              <div className="bg-white rounded-xl p-4 shadow-sm flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="بحث عن مستخدم..."
                      className="w-full border border-slate-200 rounded-lg py-2 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <select className="border border-slate-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">جميع الأدوار</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                <select className="border border-slate-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">جميع الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              {/* جدول المستخدمين */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">المستخدم</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">الدور</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">القسم</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">الحالة</th>
                      <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">آخر دخول</th>
                      <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{user.name}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleInfo(user.role).bgClass} ${getRoleInfo(user.role).textClass}`}>
                            {getRoleInfo(user.role).name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {user.department ? departments.find(d => d.id === user.department)?.name || '-' : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status === 'active' ? 'نشط' : 'غير نشط'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{user.lastLogin}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowPermissionsModal(true);
                              }}
                              className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                              title="الصلاحيات"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setEditUser({ name: user.name, email: user.email, role: user.role, department: user.department || '' });
                                setShowEditUserModal(true);
                              }}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.status === 'active'
                                  ? 'text-orange-500 hover:bg-orange-50'
                                  : 'text-green-500 hover:bg-green-50'
                              }`}
                              title={user.status === 'active' ? 'تعطيل' : 'تفعيل'}
                            >
                              {user.status === 'active' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* إدارة الأقسام */}
          {currentPage === 'departments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">إدارة الأقسام</h2>
                <button
                  onClick={() => setShowAddDepartmentModal(true)}
                  className="bg-purple-500 text-white px-4 py-2 rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-2"
                >
                  <FolderPlus className="w-5 h-5" />
                  إضافة قسم
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map(dept => (
                  <div key={dept.id} className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-indigo-500" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        dept.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {dept.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 mb-2">{dept.name}</h3>
                    <p className="text-slate-500 text-sm mb-4">المسؤول: {dept.head}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{dept.usersCount} مستخدم</span>
                      <span className="text-slate-400">منذ {dept.createdAt}</span>
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setEditDepartment({ name: dept.name, head: dept.head, status: dept.status });
                          setShowEditDepartmentModal(true);
                        }}
                        className="flex-1 py-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Edit className="w-4 h-4" /> تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id)}
                        className="flex-1 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Trash2 className="w-4 h-4" /> حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* الصلاحيات */}
          {currentPage === 'permissions' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">إدارة الصلاحيات</h2>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">صلاحيات الأدوار</h3>
                </div>
                <div className="p-6">
                  {roles.map(role => (
                    <div key={role.id} className="mb-6 last:mb-0">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`w-4 h-4 rounded-full ${role.dotClass}`}></span>
                        <h4 className="font-bold text-slate-800">{role.name}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2 pr-7">
                        {allPermissions
                          .filter(p => {
                            if (role.id === 'admin') return true;
                            if (role.id === 'deputy') return ['submit_request', 'view_own_requests'].includes(p.id);
                            if (role.id === 'manager') return ['view_all_requests', 'manage_requests', 'assign_researchers', 'view_reports'].includes(p.id);
                            if (role.id === 'department_head') return ['manage_requests', 'assign_researchers', 'view_department', 'manage_department'].includes(p.id);
                            if (role.id === 'researcher') return ['view_assigned', 'submit_research', 'request_info'].includes(p.id);
                            if (role.id === 'proofreader') return ['proofread', 'edit_research'].includes(p.id);
                            return false;
                          })
                          .map(perm => (
                            <span key={perm.id} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm">
                              {perm.name}
                            </span>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">جميع الصلاحيات المتاحة</h3>
                </div>
                <div className="p-6">
                  {['الطلبات', 'الأقسام', 'البحوث', 'التدقيق', 'الإدارة', 'النظام'].map(category => (
                    <div key={category} className="mb-6 last:mb-0">
                      <h4 className="font-semibold text-slate-700 mb-3">{category}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {allPermissions.filter(p => p.category === category).map(perm => (
                          <div key={perm.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                            <ShieldCheck className="w-4 h-4 text-purple-500" />
                            <span className="text-sm text-slate-700">{perm.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* التقارير */}
          {currentPage === 'reports' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">التقارير والإحصائيات</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">إحصائيات الطلبات</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-600">إجمالي الطلبات</span>
                      <span className="font-bold text-slate-800">156</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <span className="text-blue-600">قيد الإعداد</span>
                      <span className="font-bold text-blue-800">23</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                      <span className="text-green-600">مكتملة</span>
                      <span className="font-bold text-green-800">120</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                      <span className="text-yellow-600">بانتظار التدقيق</span>
                      <span className="font-bold text-yellow-800">13</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-4">أداء الأقسام</h3>
                  <div className="space-y-4">
                    {departments.map(dept => (
                      <div key={dept.id} className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 w-40 truncate">{dept.name}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.random() * 60 + 40}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-500 w-10">{Math.floor(Math.random() * 30 + 10)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">تصدير التقارير</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-center">
                    <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">تقرير الطلبات</p>
                  </button>
                  <button className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-center">
                    <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">تقرير المستخدمين</p>
                  </button>
                  <button className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-center">
                    <Building2 className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">تقرير الأقسام</p>
                  </button>
                  <button className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-center">
                    <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">تقرير شامل</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* سجل النشاطات */}
          {currentPage === 'activity' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">سجل النشاطات</h2>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <select className="border border-slate-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="">جميع الأنواع</option>
                      <option value="user">المستخدمين</option>
                      <option value="request">الطلبات</option>
                      <option value="research">البحوث</option>
                    </select>
                    <input type="date" className="border border-slate-200 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <button className="text-purple-500 hover:text-purple-700 flex items-center gap-1 text-sm">
                    <RefreshCw className="w-4 h-4" /> تحديث
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {activityLog.map(log => (
                    <div key={log.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            log.type === 'user' ? 'bg-blue-100' :
                            log.type === 'request' ? 'bg-amber-100' :
                            log.type === 'research' ? 'bg-cyan-100' :
                            'bg-rose-100'
                          }`}>
                            {log.type === 'user' ? <UserPlus className="w-5 h-5 text-blue-500" /> :
                             log.type === 'request' ? <FileText className="w-5 h-5 text-amber-500" /> :
                             log.type === 'research' ? <FileText className="w-5 h-5 text-cyan-500" /> :
                             <Check className="w-5 h-5 text-rose-500" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{log.action}</p>
                            <p className="text-sm text-slate-500">بواسطة: {log.user}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-slate-800">{log.target}</p>
                          <p className="text-xs text-slate-400">{log.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* إعدادات النظام */}
          {currentPage === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-slate-800">إعدادات النظام</h2>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">الإعدادات العامة</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2">اسم النظام</label>
                      <input
                        type="text"
                        value={systemSettings.siteName}
                        onChange={(e) => setSystemSettings({...systemSettings, siteName: e.target.value})}
                        className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2">الحد الأقصى للطلبات لكل نائب</label>
                      <input
                        type="number"
                        value={systemSettings.maxRequestsPerDeputy}
                        onChange={(e) => setSystemSettings({...systemSettings, maxRequestsPerDeputy: parseInt(e.target.value)})}
                        className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2">الحد الأقصى لطلبات المعلومات</label>
                      <input
                        type="number"
                        value={systemSettings.maxInfoRequests}
                        onChange={(e) => setSystemSettings({...systemSettings, maxInfoRequests: parseInt(e.target.value)})}
                        className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-2">مدة الإنجاز الافتراضية (أيام)</label>
                      <input
                        type="number"
                        value={systemSettings.defaultCompletionDays}
                        onChange={(e) => setSystemSettings({...systemSettings, defaultCompletionDays: parseInt(e.target.value)})}
                        className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="font-semibold text-slate-700 mb-4">الإعدادات المتقدمة</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-slate-800">النسخ الاحتياطي التلقائي</p>
                          <p className="text-sm text-slate-500">إنشاء نسخة احتياطية يومياً</p>
                        </div>
                        <button
                          onClick={() => setSystemSettings({...systemSettings, autoBackup: !systemSettings.autoBackup})}
                          className={`w-14 h-7 rounded-full relative transition-colors ${systemSettings.autoBackup ? 'bg-purple-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${systemSettings.autoBackup ? 'left-1' : 'right-1'}`}></div>
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-slate-800">إشعارات البريد الإلكتروني</p>
                          <p className="text-sm text-slate-500">إرسال إشعارات عبر البريد</p>
                        </div>
                        <button
                          onClick={() => setSystemSettings({...systemSettings, emailNotifications: !systemSettings.emailNotifications})}
                          className={`w-14 h-7 rounded-full relative transition-colors ${systemSettings.emailNotifications ? 'bg-purple-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${systemSettings.emailNotifications ? 'left-1' : 'right-1'}`}></div>
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                        <div>
                          <p className="font-semibold text-red-800">وضع الصيانة</p>
                          <p className="text-sm text-red-600">إيقاف النظام للصيانة</p>
                        </div>
                        <button
                          onClick={() => setSystemSettings({...systemSettings, maintenanceMode: !systemSettings.maintenanceMode})}
                          className={`w-14 h-7 rounded-full relative transition-colors ${systemSettings.maintenanceMode ? 'bg-red-500' : 'bg-slate-300'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all ${systemSettings.maintenanceMode ? 'left-1' : 'right-1'}`}></div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors">
                      إلغاء التغييرات
                    </button>
                    <button className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors flex items-center gap-2">
                      <Save className="w-5 h-5" />
                      حفظ الإعدادات
                    </button>
                  </div>
                </div>
              </div>

              {/* أدوات النظام */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4">أدوات النظام</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-center">
                    <Database className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">نسخ احتياطي</p>
                  </button>
                  <button className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-center">
                    <RefreshCw className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">مسح الذاكرة المؤقتة</p>
                  </button>
                  <button className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-center">
                    <History className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">استعادة النسخة</p>
                  </button>
                  <button className="p-4 border border-red-200 rounded-xl hover:bg-red-50 transition-colors text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600">إعادة تعيين النظام</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* نافذة إضافة قسم */}
      {showAddDepartmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                إضافة قسم جديد
              </h3>
              <button onClick={() => setShowAddDepartmentModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">اسم القسم *</label>
                <input
                  type="text"
                  value={newDepartment.name}
                  onChange={(e) => setNewDepartment({...newDepartment, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="أدخل اسم القسم"
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">مسؤول القسم</label>
                <input
                  type="text"
                  value={newDepartment.head}
                  onChange={(e) => setNewDepartment({...newDepartment, head: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="اسم المسؤول"
                />
              </div>
              <div className="mb-6">
                <label className="block text-slate-700 font-semibold mb-2">الحالة</label>
                <select
                  value={newDepartment.status}
                  onChange={(e) => setNewDepartment({...newDepartment, status: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddDepartment}
                  className="flex-1 bg-purple-500 text-white py-3 rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  إضافة
                </button>
                <button
                  onClick={() => setShowAddDepartmentModal(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إضافة مستخدم */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                إضافة مستخدم جديد
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">الاسم الكامل *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="أدخل الاسم الكامل"
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="example@parliament.iq"
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">كلمة المرور *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="أدخل كلمة المرور"
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">الدور *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">اختر الدور</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              {(newUser.role === 'department_head' || newUser.role === 'researcher') && (
                <div className="mb-4">
                  <label className="block text-slate-700 font-semibold mb-2">القسم</label>
                  <select
                    value={newUser.department}
                    onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">اختر القسم</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAddUser}
                  className="flex-1 bg-purple-500 text-white py-3 rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  إضافة المستخدم
                </button>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل القسم */}
      {showEditDepartmentModal && selectedDepartment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Edit className="w-5 h-5" />
                تعديل بيانات القسم
              </h3>
              <button onClick={() => { setShowEditDepartmentModal(false); setSelectedDepartment(null); }} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">اسم القسم *</label>
                <input
                  type="text"
                  value={editDepartment.name}
                  onChange={(e) => setEditDepartment({...editDepartment, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">المسؤول</label>
                <input
                  type="text"
                  value={editDepartment.head}
                  onChange={(e) => setEditDepartment({...editDepartment, head: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">الحالة</label>
                <select
                  value={editDepartment.status}
                  onChange={(e) => setEditDepartment({...editDepartment, status: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleEditDepartment}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => { setShowEditDepartmentModal(false); setSelectedDepartment(null); }}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تعديل المستخدم */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Edit className="w-5 h-5" />
                تعديل بيانات المستخدم
              </h3>
              <button onClick={() => { setShowEditUserModal(false); setSelectedUser(null); }} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">الاسم الكامل *</label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser({...editUser, name: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-slate-700 font-semibold mb-2">الدور *</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر الدور</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              {(editUser.role === 'department_head' || editUser.role === 'researcher') && (
                <div className="mb-4">
                  <label className="block text-slate-700 font-semibold mb-2">القسم</label>
                  <select
                    value={editUser.department}
                    onChange={(e) => setEditUser({...editUser, department: e.target.value})}
                    className="w-full border border-slate-300 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">اختر القسم</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleEditUser}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => { setShowEditUserModal(false); setSelectedUser(null); }}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الصلاحيات */}
      {showPermissionsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between sticky top-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Key className="w-5 h-5" />
                صلاحيات المستخدم
              </h3>
              <button onClick={() => setShowPermissionsModal(false)} className="hover:bg-white/20 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-slate-50 rounded-xl">
                <p className="font-bold text-slate-800">{selectedUser.name}</p>
                <p className="text-sm text-slate-500">{getRoleInfo(selectedUser.role).name}</p>
              </div>

              <p className="font-semibold text-slate-700 mb-3">الصلاحيات الحالية:</p>
              <div className="space-y-2 mb-6">
                {allPermissions.map(perm => (
                  <label key={perm.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={selectedUser.permissions.includes(perm.id) || selectedUser.permissions.includes('full_access')}
                      onChange={(e) => {
                        const newPerms = e.target.checked
                          ? [...selectedUser.permissions, perm.id]
                          : selectedUser.permissions.filter(p => p !== perm.id);
                        setUsers(users.map(u => u.id === selectedUser.id ? {...u, permissions: newPerms} : u));
                        setSelectedUser({...selectedUser, permissions: newPerms});
                      }}
                      disabled={selectedUser.permissions.includes('full_access') && perm.id !== 'full_access'}
                      className="w-5 h-5 text-purple-500 rounded"
                    />
                    <div>
                      <p className="text-slate-700">{perm.name}</p>
                      <p className="text-xs text-slate-400">{perm.category}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowPermissionsModal(false)}
                  className="flex-1 bg-purple-500 text-white py-3 rounded-xl hover:bg-purple-600 transition-colors"
                >
                  حفظ التغييرات
                </button>
                <button
                  onClick={() => setShowPermissionsModal(false)}
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
