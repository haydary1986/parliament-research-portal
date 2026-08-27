// عناوين الحالات بالعربية (مرجع: req.md - تصنيف الطلبات)
const STATUS_LABELS = {
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
  // مهام بحث
  sent_to_proofreader: 'أرسل للتدقيق',
  submitted: 'مقدّم',
  returned: 'مُرجَع للتعديل',
  // طلبات معلومات
  sent: 'مُرسَل',
  received: 'وصل الرد',
  no_response: 'بدون رد',
}

export default function StatusBadge({ status, className = '' }) {
  const label = STATUS_LABELS[status] || status
  const cls = `status-${status}`
  return <span className={`${cls} ${className}`}>{label}</span>
}
