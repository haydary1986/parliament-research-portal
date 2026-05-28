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

// مراحل سير الطلب التفصيلية للنائب
// مرجع: req.md - بوابة النواب نقطة 5
export const REQUEST_STAGES = [
  { key: 'routing',        label: 'التوجيه إلى القسم',                        statuses: ['pending', 'assigned'] },
  { key: 'researcher',     label: 'التوجيه للباحث',                            statuses: ['confirmed'] },
  { key: 'sources',        label: 'جمع المصادر',                              statuses: ['in_progress'] },
  { key: 'official_corr',  label: 'إجراء مخاطبات رسمية لطلب البيانات والمعلومات', statuses: [] },
  { key: 'analysis',       label: 'تحليل',                                    statuses: ['pending_dept_review'] },
  { key: 'proofreading',   label: 'المدقق اللغوي',                            statuses: ['proofreading'] },
  { key: 'final_review',   label: 'التدقيق النهائي',                          statuses: ['pending_assistant', 'pending_dept_send', 'under_manager_review'] },
  { key: 'delivered',      label: 'تم التسليم',                                statuses: ['delivered', 'completed'] },
]

// إرجاع المرحلة الحالية لطلب بناءً على الـ status
export function getRequestStage(status) {
  for (const stage of REQUEST_STAGES) {
    if (stage.statuses.includes(status)) return stage
  }
  return REQUEST_STAGES[0]
}

// تصنيف لوحة المعلومات للمدير (req.md - بوابة المدير نقطة 2)
export const MANAGER_DASHBOARD_LABELS = {
  total:       'إجمالي الطلبات',
  pending:     'انتظار التوجيه',     // كان: بانتظار الإجراء
  in_progress: 'قيد الإعداد',        // كان: قيد العمل
  completed:   'مكتمل',
  returned:    'لا يمكن التنفيذ',    // كان: مُرجَعة
}
