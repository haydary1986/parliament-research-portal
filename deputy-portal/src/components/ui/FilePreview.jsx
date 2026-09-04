import { useEffect, useState } from 'react'
import * as api from '../../api'

// نوع الملف من الامتداد
function extOf(name = '') {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : ''
}

/**
 * معاينة مضمَّنة للملف — PDF مباشرةً، و Word (.docx) عبر تحويله لـ HTML.
 * الملفات مُصادَقة، فنجلبها blob بالجلسة ونعرضها داخل التطبيق.
 *
 * @param {{ filename: string, title?: string, onClose: () => void }} props
 */
export default function FilePreview({ filename, title, onClose }) {
  const [state, setState] = useState({ loading: true, kind: null, url: '', html: '', error: '' })

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    const ext = extOf(filename)

    async function load() {
      try {
        const blob = await api.fetchFileBlob(filename)
        if (cancelled) return

        if (ext === 'pdf') {
          objectUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'application/pdf' }))
          setState({ loading: false, kind: 'pdf', url: objectUrl, html: '', error: '' })
        } else if (ext === 'docx') {
          // تحويل docx إلى HTML عبر mammoth (يُحمَّل عند الحاجة فقط)
          const mammoth = await import('mammoth')
          const arrayBuffer = await blob.arrayBuffer()
          if (cancelled) return
          const result = await mammoth.convertToHtml({ arrayBuffer })
          if (cancelled) return
          setState({ loading: false, kind: 'docx', url: '', html: result.value || '<p>لا يوجد محتوى نصّي</p>', error: '' })
        } else {
          // doc القديم وغيره: لا معاينة مضمَّنة
          setState({ loading: false, kind: 'unsupported', url: '', html: '', error: '' })
        }
      } catch (e) {
        if (!cancelled) setState({ loading: false, kind: null, url: '', html: '', error: e.message || 'تعذّر فتح الملف' })
      }
    }
    load()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [filename])

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-label="معاينة الملف">
      <div className="modal max-w-5xl w-full animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 className="card-title truncate">{title || 'معاينة الملف'}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => api.downloadFile(filename).catch(() => {})} className="btn-outline btn-sm">تنزيل</button>
            <button onClick={onClose} className="btn-icon" aria-label="إغلاق">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-[var(--color-surface-soft)]">
          {state.loading && (
            <div className="h-full flex items-center justify-center text-sm text-[var(--color-navy-500)]">
              جارٍ تحميل الملف للمعاينة…
            </div>
          )}
          {!state.loading && state.error && (
            <div className="h-full flex items-center justify-center text-sm text-[var(--color-danger-700)] p-6 text-center">
              {state.error}
            </div>
          )}
          {!state.loading && state.kind === 'pdf' && (
            <iframe title="معاينة PDF" src={state.url} className="w-full h-full border-0" />
          )}
          {!state.loading && state.kind === 'docx' && (
            <div className="max-w-3xl mx-auto bg-white p-8 my-4 shadow rounded prose-doc" dir="rtl"
              dangerouslySetInnerHTML={{ __html: state.html }} />
          )}
          {!state.loading && state.kind === 'unsupported' && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-6">
              <p className="text-sm text-[var(--color-navy-600)]">لا تتوفّر معاينة مضمَّنة لهذا النوع من الملفات.</p>
              <button onClick={() => api.downloadFile(filename).catch(() => {})} className="btn-primary btn-sm">تنزيل الملف</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
