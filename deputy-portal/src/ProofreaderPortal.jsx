import { useState, useRef, useCallback, useEffect } from 'react';
import * as api from './api';
import { User, Lock, FileText, Clock, CheckCircle, LogOut, Eye, Bell, Home, List, Settings, Building, Send, Play, Check, X, Calendar, MessageSquare, ArrowLeft, BookOpen, Upload, Paperclip, Edit3, FileCheck, FileMinus, RotateCcw, Download, FileType, Save, History, Undo2, Type, Bold, Italic, Underline, AlignRight, AlignCenter, AlignLeft, Highlighter, ChevronDown } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';

export default function ProofreaderPortal({ onSwitchPortal, user }) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!user);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loginData, setLoginData] = useState({ username: user?.name || '', password: '' });
  const [showNotifications, setShowNotifications] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  // حالة المحرر المدمج
  const [editorContent, setEditorContent] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingResearch, setEditingResearch] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // المدققون اللغويون المسجلون
  const registeredProofreaders = [
    { id: 1, name: 'أ. محمد الخطاط', specialization: 'تدقيق لغوي' },
    { id: 2, name: 'د. فاطمة النحوية', specialization: 'تدقيق لغوي' },
    { id: 3, name: 'أ. علي الأديب', specialization: 'تدقيق لغوي' },
  ];

  // البحوث المرسلة للتدقيق
  const [researchesForProofreading, setResearchesForProofreading] = useState([
    {
      id: 'REQ-006',
      title: 'دراسة أثر السياسة النقدية على التضخم',
      researcher: 'د. نور الدين',
      department: 'قسم البحوث المالية والاقتصادية',
      dateReceived: '2024-02-01',
      deadline: '2024-02-05',
      status: 'pending',
      serviceType: 'دراسة',
      classification: 'مالية واقتصادية',
      originalFile: {
        name: 'دراسة_السياسة_النقدية_v1.docx',
        uploadDate: '2024-02-01',
        size: '2.5 MB',
        type: 'word'
      },
      content: `<h1 style="text-align:center">دراسة أثر السياسة النقدية على التضخم في العراق</h1>
<h2>المقدمة</h2>
<p>تعد السياسة النقدية من أهم الأدوات الاقتصادية التي يستخدمها البنك المركزي للتحكم في العرض النقدي وأسعار الفائدة، بهدف تحقيق الاستقرار الاقتصادي والسيطرة على معدلات التضخم. وفي العراق، يواجه الاقتصاد تحديات كبيرة نتيجة الاعتماد المفرط على النفط كمصدر رئيسي للإيرادات.</p>
<h2>الفصل الأول: الإطار النظري</h2>
<h3>1.1 مفهوم السياسة النقدية</h3>
<p>السياسة النقدية هي مجموعة الإجراءات والتدابير التي يتخذها البنك المركزي بهدف التأثير على حجم الائتمان والسيولة النقدية في الاقتصاد. وتشمل أدوات السياسة النقدية:</p>
<ul>
<li>سعر الفائدة الرئيسي</li>
<li>نسبة الاحتياطي الإلزامي</li>
<li>عمليات السوق المفتوحة</li>
<li>سعر صرف العملة المحلية</li>
</ul>
<h3>1.2 نظريات التضخم</h3>
<p>يُعرَّف التضخم بأنه الارتفاع المستمر والعام في المستوى العام للأسعار خلال فترة زمنية محددة. وتتعدد نظريات التضخم لتشمل:</p>
<ol>
<li><strong>تضخم الطلب:</strong> ينشأ عندما يفوق الطلب الكلي العرض الكلي</li>
<li><strong>تضخم التكاليف:</strong> ينتج عن ارتفاع تكاليف الإنتاج</li>
<li><strong>التضخم النقدي:</strong> وفقاً للنظرية النقدية، ينتج التضخم عن الزيادة المفرطة في العرض النقدي</li>
</ol>
<h2>الفصل الثاني: واقع السياسة النقدية في العراق</h2>
<p>يتميز الاقتصاد العراقي بخصائص فريدة تؤثر على فعالية السياسة النقدية، أبرزها الاعتماد الكبير على إيرادات النفط التي تشكل أكثر من 90% من الإيرادات الحكومية. وقد اتخذ البنك المركزي العراقي عدة إجراءات للسيطرة على التضخم منها تثبيت سعر الصرف واستخدام مزاد العملة.</p>
<h2>الفصل الثالث: التحليل والنتائج</h2>
<p>أظهرت النتائج أن معدلات التضخم في العراق تتأثر بشكل كبير بالعوامل الخارجية مثل أسعار النفط العالمية والأوضاع الأمنية، في حين أن تأثير أدوات السياسة النقدية التقليدية يبقى محدوداً نسبياً في ظل الظروف الاقتصادية الراهنة.</p>
<h2>التوصيات</h2>
<ul>
<li>تنويع مصادر الدخل الوطني للحد من تأثير تقلبات أسعار النفط</li>
<li>تعزيز استقلالية البنك المركزي في اتخاذ القرارات النقدية</li>
<li>تطوير القطاع المصرفي وزيادة الشمول المالي</li>
<li>اعتماد سياسات مالية ونقدية متكاملة ومنسقة</li>
</ul>`,
      editedFile: null,
      versions: [],
      notes: [
        { date: '2024-02-01', text: 'تم استلام البحث للتدقيق اللغوي' }
      ]
    },
    {
      id: 'REQ-008',
      title: 'تحليل قانون الاستثمار الجديد',
      researcher: 'د. نور الدين',
      department: 'قسم البحوث المالية والاقتصادية',
      dateReceived: '2024-02-02',
      deadline: '2024-02-06',
      status: 'in_progress',
      serviceType: 'تقرير',
      classification: 'قانوني',
      originalFile: {
        name: 'تحليل_قانون_الاستثمار_v1.docx',
        uploadDate: '2024-02-02',
        size: '1.8 MB',
        type: 'word'
      },
      content: `<h1 style="text-align:center">تحليل قانون الاستثمار الجديد في العراق</h1>
<h2>المقدمة</h2>
<p>يعد قانون الاستثمار من أهم التشريعات الاقتصادية التي تهدف إلى جذب رؤوس الأموال المحلية والأجنبية وتوفير بيئة أعمال محفزة للنمو الاقتصادي. وقد صدر القانون الجديد استجابةً للتحديات الاقتصادية المتزايدة.</p>
<h2>أولاً: أبرز التعديلات في القانون الجديد</h2>
<p>تضمن القانون الجديد عدة تعديلات جوهرية تشمل:</p>
<ol>
<li><strong>الإعفاءات الضريبية:</strong> منح إعفاءات ضريبية تصل إلى 15 سنة للمشاريع الاستراتيجية</li>
<li><strong>حقوق الملكية:</strong> السماح للمستثمر الأجنبي بالتملك الكامل للمشروع</li>
<li><strong>تحويل الأرباح:</strong> ضمان حق المستثمر في تحويل أرباحه للخارج</li>
<li><strong>تسوية النزاعات:</strong> اعتماد آليات تحكيم دولية لحل النزاعات</li>
</ol>
<h2>ثانياً: التحديات والمعوقات</h2>
<p>رغم الإصلاحات التشريعية، لا تزال هناك عدة تحديات تواجه بيئة الاستثمار في العراق منها البيروقراطية الإدارية وضعف البنية التحتية وعدم الاستقرار الأمني في بعض المناطق.</p>
<h2>ثالثاً: التوصيات</h2>
<ul>
<li>تبسيط الإجراءات الإدارية وإنشاء نافذة واحدة للمستثمرين</li>
<li>تطوير البنية التحتية خاصة في المناطق الصناعية</li>
<li>تعزيز الشفافية ومكافحة الفساد في القطاع الاستثماري</li>
<li>إنشاء محاكم تجارية متخصصة للنظر في النزاعات الاستثمارية</li>
</ul>`,
      editedFile: null,
      versions: [],
      notes: [
        { date: '2024-02-02', text: 'تم استلام البحث للتدقيق اللغوي' },
        { date: '2024-02-03', text: 'جاري التدقيق اللغوي' }
      ]
    }
  ]);

  const [notifications, setNotifications] = useState([]);

  // جلب مهام التدقيق من API
  useEffect(() => {
    if (!isLoggedIn || !api.getToken()) return;
    api.getProofreadingTasks().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        const apiTasks = res.data.map(t => ({
          id: t.research_task_id || t.id,
          title: t.request_title || 'مهمة تدقيق',
          researcher: t.researcher_name || 'باحث',
          department: '', dateReceived: t.assigned_date?.split('T')[0] || '',
          deadline: t.completed_date?.split('T')[0] || '',
          status: t.status, serviceType: 'تدقيق', classification: '',
          originalFile: { name: `بحث_${t.research_task_id}.docx`, uploadDate: t.assigned_date?.split('T')[0] || '', size: '2 MB', type: 'word' },
          content: '', editedFile: null, versions: [],
          notes: [{ date: t.assigned_date?.split('T')[0] || '', text: 'تم استلام البحث للتدقيق' }],
        }));
        setResearchesForProofreading(prev => {
          // دمج مع البيانات المحلية الموجودة (للمحتوى الغني)
          return prev.map(p => {
            const apiMatch = apiTasks.find(a => a.id === p.id);
            return apiMatch ? { ...p, status: apiMatch.status } : p;
          }).concat(apiTasks.filter(a => !prev.find(p => p.id === a.id)));
        });
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
      { id: 1, text: 'تم إرسال بحث جديد للتدقيق', time: 'منذ ساعة', read: false },
    ]));
  }, [isLoggedIn]);

  const getStatusInfo = (status) => {
    switch(status) {
      case 'pending': return { label: 'بانتظار التدقيق', color: 'bg-orange-500', bgLight: 'bg-orange-100 text-orange-700', icon: Clock };
      case 'in_progress': return { label: 'قيد التدقيق', color: 'bg-blue-500', bgLight: 'bg-blue-100 text-blue-700', icon: Edit3 };
      case 'completed': return { label: 'تم التدقيق', color: 'bg-green-500', bgLight: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'returned': return { label: 'تم الإرجاع للباحث', color: 'bg-purple-500', bgLight: 'bg-purple-100 text-purple-700', icon: RotateCcw };
      default: return { label: 'غير محدد', color: 'bg-gray-500', bgLight: 'bg-gray-100 text-gray-700', icon: Clock };
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const proofreader = registeredProofreaders.find(p => p.name === loginData.username);
    if (proofreader && loginData.password) {
      setIsLoggedIn(true);
    } else {
      alert('يرجى اختيار اسم المدقق وإدخال كلمة المرور');
    }
  };

  // بدء التدقيق
  const handleStartProofreading = (researchId) => {
    setResearchesForProofreading(prev => prev.map(r =>
      r.id === researchId
        ? {
            ...r,
            status: 'in_progress',
            notes: [...r.notes, {
              date: new Date().toISOString().split('T')[0],
              text: 'تم بدء التدقيق اللغوي'
            }]
          }
        : r
    ));
  };

  // فتح المحرر المدمج
  const handleOpenEditor = (research) => {
    setEditingResearch(research);
    setEditorContent(research.content || '');
    setVersionHistory(research.versions || []);
    setIsEditorOpen(true);
    setEditNotes('');
  };

  // فتح ملف Word من الجهاز
  const handleImportFile = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      // حفظ النسخة الحالية قبل الاستبدال
      if (editorContent) {
        const newVersion = {
          id: Date.now(),
          content: editorContent,
          date: new Date().toISOString(),
          label: `نسخة قبل استيراد ${file.name}`,
          type: 'import'
        };
        setVersionHistory(prev => [newVersion, ...prev]);
      }

      setEditorContent(result.value);
    } catch (err) {
      alert('حدث خطأ أثناء قراءة الملف');
    }
    e.target.value = '';
  }, [editorContent]);

  // حفظ نسخة (يدوي)
  const handleSaveVersion = () => {
    const newVersion = {
      id: Date.now(),
      content: editorContent,
      date: new Date().toISOString(),
      label: `حفظ يدوي - ${new Date().toLocaleString('ar-IQ')}`,
      type: 'manual'
    };
    setVersionHistory(prev => [newVersion, ...prev]);

    // تحديث البحث
    setResearchesForProofreading(prev => prev.map(r =>
      r.id === editingResearch.id
        ? { ...r, content: editorContent, versions: [newVersion, ...(r.versions || [])] }
        : r
    ));

    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1500);
  };

  // استعادة نسخة قديمة
  const handleRestoreVersion = (version) => {
    // حفظ النسخة الحالية أولاً
    const backupVersion = {
      id: Date.now(),
      content: editorContent,
      date: new Date().toISOString(),
      label: `نسخة احتياطية قبل الاستعادة`,
      type: 'backup'
    };
    setVersionHistory(prev => [backupVersion, ...prev]);
    setEditorContent(version.content);
    setSelectedVersion(null);
    setShowVersionHistory(false);
  };

  // تصدير كملف HTML
  const handleExportFile = () => {
    const htmlContent = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><title>${editingResearch.title}</title>
<style>body{font-family:'Segoe UI',Tahoma,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.8;direction:rtl}h1{text-align:center;color:#1e293b}h2{color:#334155;border-bottom:2px solid #e2e8f0;padding-bottom:8px}h3{color:#475569}p{text-align:justify}ul,ol{padding-right:20px}li{margin-bottom:8px}</style></head>
<body>${editorContent}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${editingResearch.title}_معدل.html`);
  };

  // إكمال التدقيق وإرجاع البحث
  const handleCompleteEdit = () => {
    // حفظ النسخة النهائية
    const finalVersion = {
      id: Date.now(),
      content: editorContent,
      date: new Date().toISOString(),
      label: 'النسخة النهائية - بعد التدقيق',
      type: 'final'
    };

    setResearchesForProofreading(prev => prev.map(r =>
      r.id === editingResearch.id
        ? {
            ...r,
            status: 'returned',
            content: editorContent,
            versions: [finalVersion, ...(r.versions || [])],
            editedFile: {
              name: `${r.originalFile.name.replace('.docx', '')}_معدل.docx`,
              uploadDate: new Date().toISOString().split('T')[0],
              size: `${(editorContent.length / 1024).toFixed(1)} KB`
            },
            notes: [...r.notes, {
              date: new Date().toISOString().split('T')[0],
              text: `تم إكمال التدقيق وإرجاع البحث للباحث${editNotes ? ' - ملاحظات: ' + editNotes : ''}`
            }]
          }
        : r
    ));

    setIsEditorOpen(false);
    setEditingResearch(null);
    setEditorContent('');
    setEditNotes('');
  };

  // إعدادات المحرر
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': ['right', 'center', '', 'justify'] }],
      [{ 'direction': 'rtl' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['blockquote'],
      ['clean']
    ]
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'align', 'direction',
    'list', 'indent', 'blockquote'
  ];

  // الإحصائيات
  const stats = {
    total: researchesForProofreading.length,
    pending: researchesForProofreading.filter(r => r.status === 'pending').length,
    inProgress: researchesForProofreading.filter(r => r.status === 'in_progress').length,
    completed: researchesForProofreading.filter(r => r.status === 'completed' || r.status === 'returned').length,
  };

  // ============================
  // واجهة المحرر المدمج (ملء الشاشة)
  // ============================
  if (isEditorOpen && editingResearch) {
    return (
      <div className="h-screen flex flex-col bg-slate-100" dir="rtl">
        {/* شريط المحرر العلوي */}
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (confirm('هل تريد الخروج؟ تأكد من حفظ التعديلات أولاً.')) {
                    setIsEditorOpen(false);
                    setEditingResearch(null);
                  }
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="border-l border-slate-200 h-8 mx-1"></div>
              <div>
                <h1 className="font-bold text-slate-800 text-sm">{editingResearch.title}</h1>
                <p className="text-xs text-slate-500">الباحث: {editingResearch.researcher} • {editingResearch.department}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* استيراد ملف Word */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <Upload className="w-4 h-4" />
                استيراد Word
              </button>

              {/* سجل النسخ */}
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors relative"
              >
                <History className="w-4 h-4" />
                النسخ السابقة
                {versionHistory.length > 0 && (
                  <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">{versionHistory.length}</span>
                )}
              </button>

              {/* تصدير */}
              <button
                onClick={handleExportFile}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                تصدير
              </button>

              {/* حفظ */}
              <button
                onClick={handleSaveVersion}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                  isSaving
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isSaving ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'تم الحفظ' : 'حفظ نسخة'}
              </button>

              {/* إكمال التدقيق */}
              <button
                onClick={() => {
                  if (confirm('هل أنت متأكد من إكمال التدقيق وإرجاع البحث للباحث؟')) {
                    handleCompleteEdit();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
              >
                <Send className="w-4 h-4" />
                إرجاع للباحث
              </button>
            </div>
          </div>
        </header>

        {/* المحتوى */}
        <div className="flex-1 flex overflow-hidden">
          {/* المحرر */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto bg-white" dir="rtl">
              <ReactQuill
                theme="snow"
                value={editorContent}
                onChange={setEditorContent}
                modules={quillModules}
                formats={quillFormats}
                className="h-full prose-editor"
                placeholder="ابدأ الكتابة هنا..."
              />
            </div>

            {/* شريط ملاحظات التدقيق */}
            <div className="bg-white border-t border-slate-200 p-3">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="flex-1 text-sm border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="أضف ملاحظات التدقيق هنا..."
                />
              </div>
            </div>
          </div>

          {/* لوحة النسخ السابقة */}
          {showVersionHistory && (
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-purple-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-500" />
                    سجل النسخ
                  </h3>
                  <button onClick={() => setShowVersionHistory(false)} className="p-1 hover:bg-purple-100 rounded">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">جميع النسخ المحفوظة مع إمكانية الاستعادة</p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* النسخة الأصلية */}
                <div
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-orange-50 transition-colors ${
                    selectedVersion === 'original' ? 'bg-orange-50 border-r-4 border-r-orange-500' : ''
                  }`}
                  onClick={() => setSelectedVersion(selectedVersion === 'original' ? null : 'original')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-sm font-bold text-slate-800">النسخة الأصلية</span>
                  </div>
                  <p className="text-xs text-slate-500 mr-4">قبل أي تعديل • {editingResearch.originalFile.uploadDate}</p>
                  {selectedVersion === 'original' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('سيتم استعادة النسخة الأصلية. النسخة الحالية ستُحفظ تلقائياً. متأكد؟')) {
                          handleRestoreVersion({ content: editingResearch.content });
                        }
                      }}
                      className="mt-2 mr-4 text-xs bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 flex items-center gap-1"
                    >
                      <Undo2 className="w-3 h-3" />
                      استعادة هذه النسخة
                    </button>
                  )}
                </div>

                {/* النسخ المحفوظة */}
                {versionHistory.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                      selectedVersion === version.id ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                    }`}
                    onClick={() => setSelectedVersion(selectedVersion === version.id ? null : version.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        version.type === 'final' ? 'bg-green-500' :
                        version.type === 'backup' ? 'bg-yellow-500' :
                        version.type === 'import' ? 'bg-purple-500' :
                        'bg-blue-500'
                      }`}></div>
                      <span className="text-sm font-medium text-slate-800">{version.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 mr-4">
                      {new Date(version.date).toLocaleString('ar-IQ')}
                    </p>
                    {selectedVersion === version.id && (
                      <div className="mt-2 mr-4 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('سيتم استعادة هذه النسخة. النسخة الحالية ستُحفظ تلقائياً. متأكد؟')) {
                              handleRestoreVersion(version);
                            }
                          }}
                          className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 flex items-center gap-1"
                        >
                          <Undo2 className="w-3 h-3" />
                          استعادة
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVersion(null);
                          }}
                          className="text-xs bg-slate-200 text-slate-600 px-3 py-1 rounded-lg hover:bg-slate-300"
                        >
                          معاينة
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {versionHistory.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">لا توجد نسخ محفوظة بعد</p>
                    <p className="text-xs mt-1">اضغط "حفظ نسخة" لحفظ النسخة الحالية</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ستايل المحرر */}
        <style>{`
          .prose-editor { display: flex; flex-direction: column; height: 100%; direction: rtl; }
          .prose-editor .ql-toolbar { border-top: none; border-left: none; border-right: none; background: #f8fafc; direction: rtl; text-align: right; padding: 8px 12px; }
          .prose-editor .ql-toolbar .ql-formats { margin-left: 8px; margin-right: 0; }
          .prose-editor .ql-container { border: none; direction: rtl; font-family: 'Segoe UI', Tahoma, 'Arabic Transparent', 'Traditional Arabic', sans-serif; font-size: 16px; }
          .prose-editor .ql-editor { min-height: 100%; padding: 40px 60px; line-height: 2; max-width: 900px; margin: 0 auto; direction: rtl; text-align: right; }
          .prose-editor .ql-editor h1 { font-size: 1.8em; font-weight: bold; color: #1e293b; margin-bottom: 16px; text-align: center; direction: rtl; }
          .prose-editor .ql-editor h2 { font-size: 1.4em; font-weight: bold; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px; text-align: right; direction: rtl; }
          .prose-editor .ql-editor h3 { font-size: 1.2em; font-weight: bold; color: #475569; margin-top: 16px; text-align: right; direction: rtl; }
          .prose-editor .ql-editor p { text-align: right; margin-bottom: 12px; color: #374151; direction: rtl; }
          .prose-editor .ql-editor ul, .prose-editor .ql-editor ol { padding-right: 20px; padding-left: 0; margin-bottom: 12px; direction: rtl; text-align: right; }
          .prose-editor .ql-editor li { margin-bottom: 6px; text-align: right; direction: rtl; }
          .prose-editor .ql-editor li::before { margin-left: 0.3em; margin-right: 0; }
          .prose-editor .ql-editor blockquote { border-right: 4px solid #e2e8f0; border-left: none; padding-right: 16px; padding-left: 0; margin-right: 0; direction: rtl; }
          .prose-editor .ql-editor .ql-indent-1 { padding-right: 3em; padding-left: 0; }
          .prose-editor .ql-editor .ql-indent-2 { padding-right: 6em; padding-left: 0; }
          .prose-editor .ql-editor .ql-indent-3 { padding-right: 9em; padding-left: 0; }
          .prose-editor .ql-editor.ql-blank::before { right: 60px; left: auto; direction: rtl; text-align: right; }
          .prose-editor .ql-snow .ql-picker { direction: ltr; }
          .prose-editor .ql-snow .ql-picker-label { direction: rtl; }
        `}</style>
      </div>
    );
  }

  // صفحة تسجيل الدخول
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-rose-900 to-slate-800 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          <button
            onClick={onSwitchPortal}
            className="mb-6 flex items-center gap-2 text-rose-300 hover:text-rose-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للصفحة الرئيسية
          </button>

          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg shadow-rose-500/30">
              <Edit3 className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">دائرة البحوث والدراسات</h1>
            <p className="text-rose-300">بوابة المدقق اللغوي</p>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-6">تسجيل دخول المدقق</h2>
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-rose-200 text-sm mb-2">اسم المدقق</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
                  <select
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent appearance-none"
                    required
                  >
                    <option value="" className="text-slate-900">اختر اسمك</option>
                    {registeredProofreaders.map(proofreader => (
                      <option key={proofreader.id} value={proofreader.name} className="text-slate-900">
                        {proofreader.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-rose-200 text-sm mb-2">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-11 pl-4 text-white placeholder-rose-300/50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                    placeholder="أدخل كلمة المرور"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold py-3 rounded-xl hover:from-rose-500 hover:to-pink-600 transition-all shadow-lg shadow-rose-500/30"
              >
                دخول
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ============================
  // لوحة تحكم المدقق
  // ============================
  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      {/* الشريط العلوي */}
      <header className="bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Edit3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold">بوابة المدقق اللغوي</h1>
              <p className="text-xs text-white/80">دائرة البحوث والدراسات</p>
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
                  <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-4 py-3 font-bold">الإشعارات</div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${!notif.read ? 'bg-rose-50' : ''}`}>
                        <p className="text-sm text-slate-700">{notif.text}</p>
                        <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 bg-white/10 rounded-full pr-2 pl-4 py-1">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{loginData.username}</p>
                <p className="text-xs text-white/80">مدقق لغوي</p>
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
            <div className="p-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white">
              <p className="font-bold">القائمة الرئيسية</p>
            </div>
            <div className="p-2">
              {[
                { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
                { id: 'pending', label: 'بانتظار التدقيق', icon: Clock },
                { id: 'in-progress', label: 'قيد التدقيق', icon: Edit3 },
                { id: 'completed', label: 'المكتملة', icon: CheckCircle },
                { id: 'settings', label: 'الإعدادات', icon: Settings },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    currentPage === item.id
                      ? 'bg-rose-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.id === 'pending' && stats.pending > 0 && (
                    <span className="mr-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{stats.pending}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: 'إجمالي البحوث', value: stats.total, icon: FileText, color: 'from-slate-500 to-slate-600' },
                  { label: 'بانتظار التدقيق', value: stats.pending, icon: Clock, color: 'from-orange-500 to-orange-600' },
                  { label: 'قيد التدقيق', value: stats.inProgress, icon: Edit3, color: 'from-blue-500 to-blue-600' },
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

              {/* البحوث بانتظار التدقيق */}
              {stats.pending > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-orange-50 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      بحوث بانتظار التدقيق
                    </h2>
                    <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm">{stats.pending}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {researchesForProofreading.filter(r => r.status === 'pending').map(research => (
                      <div key={research.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                              <FileText className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{research.title}</p>
                              <p className="text-sm text-slate-500">الباحث: {research.researcher}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleStartProofreading(research.id)}
                            className="bg-rose-500 text-white px-4 py-2 rounded-lg hover:bg-rose-600 transition-colors flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            بدء التدقيق
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* البحوث قيد التدقيق */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">البحوث قيد التدقيق</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {researchesForProofreading.filter(r => r.status === 'in_progress').map(research => (
                    <div key={research.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Edit3 className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{research.title}</p>
                            <p className="text-sm text-slate-500">الموعد النهائي: {research.deadline}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenEditor(research)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          فتح المحرر
                        </button>
                      </div>
                    </div>
                  ))}
                  {stats.inProgress === 0 && (
                    <div className="px-6 py-8 text-center text-slate-500">
                      لا توجد بحوث قيد التدقيق حالياً
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* صفحة بانتظار التدقيق */}
          {currentPage === 'pending' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">بحوث بانتظار التدقيق</h2>
              {researchesForProofreading.filter(r => r.status === 'pending').map(research => (
                <div key={research.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{research.title}</h3>
                      <p className="text-slate-500">الباحث: {research.researcher} • {research.department}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-lg">{research.serviceType}</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-lg">{research.classification}</span>
                      </div>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm text-white ${getStatusInfo(research.status).color}`}>
                      {getStatusInfo(research.status).label}
                    </span>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                    <p className="text-sm text-blue-600 mb-2 flex items-center gap-2">
                      <FileType className="w-4 h-4" />
                      ملف البحث
                    </p>
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-blue-500" />
                      <div className="flex-1">
                        <span className="text-slate-800 font-medium">{research.originalFile.name}</span>
                        <span className="text-xs text-slate-400 mr-2">{research.originalFile.size}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartProofreading(research.id)}
                    className="w-full bg-rose-500 text-white py-3 rounded-xl hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    بدء التدقيق
                  </button>
                </div>
              ))}
              {researchesForProofreading.filter(r => r.status === 'pending').length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد بحوث بانتظار التدقيق</p>
                </div>
              )}
            </div>
          )}

          {/* صفحة قيد التدقيق */}
          {currentPage === 'in-progress' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">بحوث قيد التدقيق</h2>
              {researchesForProofreading.filter(r => r.status === 'in_progress').map(research => (
                <div key={research.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{research.title}</h3>
                      <p className="text-slate-500">الباحث: {research.researcher}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm text-white ${getStatusInfo(research.status).color}`}>
                      {getStatusInfo(research.status).label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">تاريخ الاستلام</p>
                      <p className="font-semibold text-slate-800">{research.dateReceived}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">الموعد النهائي</p>
                      <p className="font-semibold text-slate-800">{research.deadline}</p>
                    </div>
                  </div>

                  {/* معلومات الملف */}
                  <div className="p-4 bg-blue-50 rounded-xl mb-4 border border-blue-200">
                    <p className="text-sm text-blue-700 mb-2 flex items-center gap-2">
                      <FileType className="w-4 h-4" />
                      ملف البحث الأصلي
                    </p>
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-blue-500" />
                      <span className="text-slate-800 font-medium flex-1">{research.originalFile.name}</span>
                    </div>
                    {research.versions && research.versions.length > 0 && (
                      <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                        <History className="w-3 h-3" />
                        {research.versions.length} نسخة محفوظة
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenEditor(research)}
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <Edit3 className="w-5 h-5" />
                    فتح المحرر والتعديل داخل المنصة
                  </button>
                </div>
              ))}
              {researchesForProofreading.filter(r => r.status === 'in_progress').length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <Edit3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد بحوث قيد التدقيق</p>
                </div>
              )}
            </div>
          )}

          {/* صفحة المكتملة */}
          {currentPage === 'completed' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800">البحوث المكتملة</h2>
              {researchesForProofreading.filter(r => r.status === 'completed' || r.status === 'returned').map(research => (
                <div key={research.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{research.title}</h3>
                        <p className="text-slate-500">الباحث: {research.researcher}</p>
                      </div>
                    </div>
                    <span className="px-4 py-2 rounded-full text-sm bg-green-100 text-green-700">
                      تم الإرجاع للباحث
                    </span>
                  </div>

                  {/* النسخ */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                      <p className="text-sm text-orange-700 mb-2 flex items-center gap-2">
                        <FileMinus className="w-4 h-4" />
                        الملف الأصلي
                      </p>
                      <p className="text-slate-800 text-sm">{research.originalFile.name}</p>
                    </div>
                    {research.editedFile && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-sm text-green-700 mb-2 flex items-center gap-2">
                          <FileCheck className="w-4 h-4" />
                          الملف المعدل
                        </p>
                        <p className="text-slate-800 text-sm">{research.editedFile.name}</p>
                      </div>
                    )}
                  </div>

                  {/* سجل النسخ */}
                  {research.versions && research.versions.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                      <p className="text-sm text-purple-700 mb-2 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        سجل النسخ ({research.versions.length} نسخة)
                      </p>
                      <div className="space-y-1">
                        {research.versions.slice(0, 3).map(v => (
                          <p key={v.id} className="text-xs text-slate-600 flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${v.type === 'final' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                            {v.label} - {new Date(v.date).toLocaleString('ar-IQ')}
                          </p>
                        ))}
                        {research.versions.length > 3 && (
                          <p className="text-xs text-purple-600">+{research.versions.length - 3} نسخ أخرى</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {researchesForProofreading.filter(r => r.status === 'completed' || r.status === 'returned').length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">لا توجد بحوث مكتملة بعد</p>
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
                    <p className="text-sm text-slate-500">استلام إشعار عند إرسال بحث للتدقيق</p>
                  </div>
                  <button className="w-12 h-6 bg-rose-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">حفظ تلقائي أثناء التحرير</p>
                    <p className="text-sm text-slate-500">حفظ نسخة تلقائياً كل 5 دقائق</p>
                  </div>
                  <button className="w-12 h-6 bg-rose-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">تذكير المواعيد النهائية</p>
                    <p className="text-sm text-slate-500">تذكير قبل الموعد النهائي بيوم</p>
                  </div>
                  <button className="w-12 h-6 bg-rose-500 rounded-full relative">
                    <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
