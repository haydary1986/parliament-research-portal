// تصدير بطاقة الخدمة البحثية كوثيقة رسمية قابلة للطباعة/الحفظ PDF.
//
// النهج: نفتح نافذة مستقلّة بمستند HTML رسمي (ترويسة المجلس + بيانات الطلب
// + سجل القرارات) ونستدعي الطباعة. المتصفح يتولّى تشكيل العربية RTL بدقّة
// تامّة ويحفظها PDF عبر «حفظ بصيغة PDF» — بلا مكتبة ولا مشاكل خطوط.

import {
  STATUS_LABELS, PURPOSE_LABELS, CONFIDENTIALITY_LABELS, REQUESTER_TYPES,
} from './format'

const ACTION_LABELS = {
  create_request: 'تقديم الطلب',
  assign_request: 'الإحالة إلى القسم',
  cancel_referral: 'إلغاء الإحالة',
  confirm_request: 'التأكيد وتعيين الباحث',
  update_request: 'تعديل الطلب',
  dept_review_approve: 'اعتماد رئيس القسم',
  dept_review_reject: 'إرجاع رئيس القسم',
  assistant_approve: 'اعتماد المعاون',
  assistant_reject: 'رفض المعاون',
  return_request: 'لا يمكن التنفيذ',
  reject_request: 'رفض الطلب',
  withdraw_request: 'سحب الطلب',
  dept_send_to_deputy: 'إرسال البحث للنائب',
  manager_send_to_deputy: 'إرسال البحث للنائب',
}

// تهريب النصوص المستخدَمة داخل الـHTML لمنع كسر المستند أو الحقن
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function fmtDate(v) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return '—' }
}

function fmtDateTime(v) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })
  } catch { return '—' }
}

function row(label, value) {
  return `<tr><th>${esc(label)}</th><td>${esc(value || '—')}</td></tr>`
}

/**
 * يفتح وثيقة رسمية للطلب في نافذة جديدة ويستدعي الطباعة.
 * @param {object} req بيانات الطلب (من GetRequest)
 * @param {Array}  timeline سجل القرارات (اختياري)
 */
export function printOfficialRequest(req, timeline = []) {
  const origin = window.location.origin
  const conf = req.confirmation || {}
  const printedAt = new Date().toLocaleString('ar-IQ', { dateStyle: 'long', timeStyle: 'short' })

  const timelineRows = (timeline || []).map((e) => `
    <tr>
      <td class="tl-when">${esc(fmtDateTime(e.created_at))}</td>
      <td class="tl-what"><strong>${esc(ACTION_LABELS[e.action] || e.action)}</strong>${e.details ? ` — ${esc(e.details)}` : ''}${e.user_name ? `<span class="tl-who">${esc(e.user_name)}</span>` : ''}</td>
    </tr>`).join('')

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>بطاقة الخدمة البحثية ${esc(req.id)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Amiri:wght@700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Cairo', sans-serif; color: #17202b; margin: 0; line-height: 1.7; font-size: 12.5px; }
  .flag { height: 5px; background: linear-gradient(90deg, #CE1126 0 33%, #fff 33% 66%, #111 66%); }
  header { text-align: center; padding: 14px 0 10px; border-bottom: 2px solid #B8860B; }
  header img { width: 64px; height: 64px; object-fit: contain; }
  .republic { font-size: 11px; letter-spacing: .2em; color: #8a6410; font-weight: 700; margin: 4px 0 2px; }
  .council { font-family: 'Amiri', serif; font-size: 22px; font-weight: 700; color: #0A2540; margin: 0; }
  .dept { font-size: 13px; color: #1c435f; font-weight: 600; margin-top: 2px; }
  .doc-title { text-align: center; margin: 18px 0 6px; }
  .doc-title h1 { font-size: 18px; color: #0A2540; margin: 0; display: inline-block; border-bottom: 2px solid #B8860B; padding-bottom: 3px; }
  .doc-meta { text-align: center; font-size: 11px; color: #4a5763; margin-bottom: 14px; }
  .doc-meta b { color: #0A2540; font-family: monospace; }
  h2.sec { font-size: 13px; color: #0A2540; margin: 16px 0 6px; padding-right: 8px; border-right: 3px solid #B8860B; }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv th, table.kv td { text-align: right; padding: 5px 8px; border: 1px solid #e5ded1; font-size: 12px; vertical-align: top; }
  table.kv th { background: #f4f1ea; color: #0A2540; font-weight: 700; width: 32%; white-space: nowrap; }
  .prose { padding: 8px 10px; border: 1px solid #e5ded1; border-radius: 4px; background: #faf8f3; white-space: pre-wrap; }
  table.tl { width: 100%; border-collapse: collapse; }
  table.tl td { padding: 5px 8px; border-bottom: 1px solid #efe9dd; font-size: 11.5px; vertical-align: top; }
  .tl-when { white-space: nowrap; color: #7a8794; font-family: monospace; direction: ltr; text-align: left; width: 40%; }
  .tl-who { display: block; color: #7a8794; font-size: 10.5px; margin-top: 1px; }
  footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e5ded1; display: flex; justify-content: space-between; font-size: 10.5px; color: #7a8794; }
  .sign { margin-top: 30px; display: flex; justify-content: space-between; gap: 40px; }
  .sign div { flex: 1; text-align: center; }
  .sign .line { margin-top: 34px; border-top: 1px solid #4a5763; padding-top: 4px; font-size: 11px; color: #4a5763; }
  @media print { .noprint { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .noprint { text-align: center; padding: 14px; background: #0A2540; }
  .noprint button { font-family: 'Cairo', sans-serif; font-size: 14px; font-weight: 700; padding: 10px 26px; border: 0; border-radius: 8px; background: #B8860B; color: #061626; cursor: pointer; }
</style>
</head>
<body>
  <div class="noprint"><button onclick="window.print()">طباعة / حفظ PDF</button></div>
  <div class="flag"></div>
  <header>
    <img src="${origin}/national/council-logo.png" alt="">
    <p class="republic">جمهورية العراق</p>
    <p class="council">مجلس النواب العراقي</p>
    <p class="dept">دائرة البحوث والدراسات النيابية</p>
  </header>

  <div class="doc-title"><h1>بطاقة الخدمة البحثية</h1></div>
  <div class="doc-meta">رقم الطلب: <b>${esc(req.id)}</b> · تاريخ الإصدار: ${esc(printedAt)}</div>

  <h2 class="sec">بيانات الطلب</h2>
  <table class="kv">
    ${row('الجهة الطالبة', req.deputy_name)}
    ${row('نوع الجهة', REQUESTER_TYPES[req.requester_type] || 'نائب')}
    ${row('اللجنة', req.committee)}
    ${row('الغرض', PURPOSE_LABELS[req.purpose] || req.purpose)}
    ${row('تصنيف السرّية', CONFIDENTIALITY_LABELS[req.confidentiality] || 'عام')}
    ${row('الحالة', STATUS_LABELS[req.status] || req.status)}
    ${row('تاريخ التقديم', fmtDate(req.date_received))}
    ${req.delivered_to_deputy_date ? row('تاريخ التسليم', fmtDate(req.delivered_to_deputy_date)) : ''}
  </table>

  <h2 class="sec">موضوع البحث</h2>
  <table class="kv">${row('العنوان', req.title)}</table>
  ${req.description ? `<div class="prose" style="margin-top:6px">${esc(req.description)}</div>` : ''}

  ${conf.service_type ? `
  <h2 class="sec">تفاصيل الخدمة</h2>
  <table class="kv">
    ${row('نوع الخدمة', conf.service_type)}
    ${row('التصنيف', conf.classification)}
    ${row('مدة الإنجاز', conf.completion_days ? `${conf.completion_days} يوم` : '—')}
  </table>` : ''}

  ${timelineRows ? `
  <h2 class="sec">سجل القرارات</h2>
  <table class="tl">${timelineRows}</table>` : ''}

  <div class="sign">
    <div><div class="line">توقيع مدير الدائرة</div></div>
    <div><div class="line">الختم الرسمي</div></div>
  </div>

  <footer>
    <span>دائرة البحوث والدراسات النيابية — مجلس النواب العراقي</span>
    <span>طُبعت في ${esc(printedAt)}</span>
  </footer>

  <script>
    window.addEventListener('load', function () {
      // مهلة قصيرة لتحميل الخط والشعار قبل الطباعة
      setTimeout(function () { try { window.print(); } catch (e) {} }, 600);
    });
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return false // مانع النوافذ المنبثقة
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}
