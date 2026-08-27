import { useState } from 'react'
import { formatDateTime } from '../../lib/format'
import { useToast } from './Toast'
import * as api from '../../api'

/**
 * صندوق النقاش — يعرض الملاحظات ويسمح بإضافة واحدة.
 * `req.md` ينص على «طلب معلومات ونقاشات وتعديلات»، وكان جدول notes
 * يُكتب من الباك‑إند فقط بلا أي واجهة للكتابة.
 *
 * entityType: 'request' | 'research_task' | 'proofreading_task'
 */
export default function Discussion({ entityType, entityId, notes = [], onAdded, title = 'النقاش والملاحظات', placeholder }) {
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    const text = content.trim()
    if (!text) return
    setBusy(true)
    try {
      await api.createNote({ entity_type: entityType, entity_id: entityId, content: text })
      setContent('')
      toast.success('أُضيفت الملاحظة')
      onAdded?.()
    } catch (err) {
      toast.error(err.message || 'فشل إضافة الملاحظة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-4">
      <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-800)]">
        {title} {notes.length > 0 && <span className="font-normal text-[var(--color-navy-500)]">({notes.length})</span>}
      </h4>

      {notes.length > 0 && (
        <ul className="space-y-2 mb-4 max-h-72 overflow-y-auto">
          {notes.map((n) => (
            <li key={n.id} className="p-3 bg-[var(--color-surface-soft)] rounded-lg border border-[var(--color-border)]">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-semibold text-sm text-[var(--color-navy-900)]">{n.user_name}</span>
                <span className="text-[10px] text-[var(--color-navy-500)] flex-shrink-0">{formatDateTime(n.created_at)}</span>
              </div>
              <p className="text-sm text-[var(--color-navy-700)] whitespace-pre-wrap">{n.content}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <label htmlFor={`note-${entityId}`} className="label">إضافة ملاحظة</label>
        <textarea
          id={`note-${entityId}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="textarea"
          rows={3}
          placeholder={placeholder || 'اكتب ملاحظتك أو استفسارك...'}
        />
        <button type="submit" disabled={busy || !content.trim()} className="btn-primary btn-sm">
          {busy ? 'جاري الإضافة...' : 'إضافة'}
        </button>
      </form>
    </div>
  )
}
