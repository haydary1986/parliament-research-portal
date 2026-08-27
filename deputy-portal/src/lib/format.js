// مساعدات تنسيق التواريخ والنصوص

export function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('ar-IQ', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return '—' }
}

export function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('ar-IQ', {
      dateStyle: 'medium', timeStyle: 'short',
    })
  } catch { return '—' }
}

export function relativeTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return formatDate(value)
}

export const ROLE_LABELS = {
  deputy: 'نائب',
  manager: 'مدير الدائرة',
  department_head: 'رئيس قسم',
  researcher: 'باحث',
  proofreader: 'مدقق لغوي',
  assistant_manager: 'المعاون',
  admin: 'مدير النظام',
}

export const PURPOSE_LABELS = {
  oversight: 'رقابي',
  legislative: 'تشريعي',
  other: 'أخرى',
}

export const SERVICE_TYPES = ['دراسة', 'تقرير', 'ورقة إحاطة', 'بيان رأي', 'سؤال نيابي']
export const CLASSIFICATIONS = ['علمي', 'اجتماعي', 'سياسي', 'قانوني', 'مالية واقتصادية']

// مراحل سير الطلب التفصيلية للطالب
// مرجع: req.md - بوابة النواب نقطة 5
export const REQUEST_STAGES = [
  { key: 'routing',       label: 'التوجيه إلى القسم' },
  { key: 'researcher',    label: 'التوجيه للباحث' },
  { key: 'sources',       label: 'جمع المصادر' },
  { key: 'official_corr', label: 'إجراء مخاطبات رسمية لطلب البيانات والمعلومات' },
  { key: 'analysis',      label: 'تحليل' },
  { key: 'proofreading',  label: 'المدقق اللغوي' },
  { key: 'final_review',  label: 'التدقيق النهائي' },
  { key: 'delivered',     label: 'تم التسليم' },
]

// الحالات التي تُثبّت مرحلة بعينها مباشرةً
const STAGE_BY_STATUS = {
  pending: 'routing',
  assigned: 'researcher',
  confirmed: 'researcher',
  // in_progress يُحسَب ديناميكياً (جمع مصادر / مخاطبات) — انظر أدناه
  review: 'analysis',
  pending_dept_review: 'analysis',
  proofreading: 'proofreading',
  pending_assistant: 'final_review',
  pending_dept_send: 'final_review',
  pending_manager_send: 'final_review',
  under_manager_review: 'final_review',
  delivered: 'delivered',
  completed: 'delivered',
}

/**
 * إرجاع المرحلة الحالية للطلب.
 * `officialLettersCount` يميّز بين «جمع المصادر» و«إجراء مخاطبات رسمية»
 * وكلاهما يقع ضمن الحالة in_progress.
 */
export function getRequestStage(status, officialLettersCount = 0) {
  if (status === 'in_progress') {
    return officialLettersCount > 0
      ? REQUEST_STAGES.find((s) => s.key === 'official_corr')
      : REQUEST_STAGES.find((s) => s.key === 'sources')
  }
  const key = STAGE_BY_STATUS[status]
  return REQUEST_STAGES.find((s) => s.key === key) || REQUEST_STAGES[0]
}

// الجهات الطالبة (req.md: نواب – رئاسات – لجان – رؤساء الكتل – مدراء – مستشارين)
export const REQUESTER_TYPES = {
  deputy: 'نائب',
  presidency: 'رئاسات',
  committee: 'لجان',
  bloc_leader: 'رؤساء الكتل',
  director: 'مدراء',
  advisor: 'مستشارين',
}

// تصنيف سرية البحث — يحدد مسار التسليم للنائب
export const CONFIDENTIALITY_LABELS = {
  public: 'عام',
  confidential: 'ذو خصوصية وحساسية',
}

// تصنيف لوحة المعلومات للمدير (req.md - بوابة المدير نقطة 2)
export const MANAGER_DASHBOARD_LABELS = {
  total:       'إجمالي الطلبات',
  pending:     'انتظار التوجيه',     // كان: بانتظار الإجراء
  in_progress: 'قيد الإعداد',        // كان: قيد العمل
  completed:   'مكتمل',
  returned:    'لا يمكن التنفيذ',    // كان: مُرجَعة
}

// عناوين الحالات بالعربية — مشتركة بين شارة الحالة والتقارير
export const STATUS_LABELS = {
  // طلبات
  pending: 'انتظار التوجيه',           // كان: بانتظار الإجراء (req.md - مدير ن2)
  assigned: 'محال إلى قسم',
  confirmed: 'مؤكد',
  in_progress: 'قيد الإعداد',          // كان: قيد العمل (req.md - مدير ن2)
  review: 'قيد المراجعة',
  pending_dept_review: 'مراجعة رئيس القسم',
  proofreading: 'قيد المدقق اللغوي',
  pending_assistant: 'بانتظار المعاون',
  pending_dept_send: 'بانتظار إرسال رئيس القسم',
  pending_manager_send: 'بانتظار إرسال مدير الدائرة',
  under_manager_review: 'مراجعة نهائية',
  delivered: 'مُسلَّم للنائب',
  completed: 'مكتمل',
  returned_exists: 'لا يمكن التنفيذ',  // كان: مُرجَع (req.md - مدير ن2)
  rejected: 'مرفوض',
  withdrawn: 'مسحوب',
  // مهام بحث
  sent_to_proofreader: 'أرسل للتدقيق',
  submitted: 'مقدّم',
  returned: 'مُرجَع للتعديل',
  // طلبات معلومات
  sent: 'مُرسَل',
  received: 'وصل الرد',
  no_response: 'بدون رد',
}
