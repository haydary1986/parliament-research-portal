import { formatDate } from '../../lib/format'
import FileDownload from './FileDownload'
import { IconDocument } from '../icons/Icons'

/**
 * مرفقات البحث — تُعرض لكل من يحق له قراءة الطلب.
 * قبل هذا كان الملف مرئياً للباحث وحده، فكانت سلسلة المراجعة تعتمد
 * بحوثاً لا تراها، والجهة الطالبة لا تستلم مخرَج طلبها إطلاقاً.
 */
export default function ResearchFiles({ files, title = 'ملف البحث', emptyText }) {
  if (!files || files.length === 0) {
    if (!emptyText) return null
    return (
      <div className="card p-4">
        <h4 className="font-bold text-sm mb-1 text-[var(--color-navy-800)]">{title}</h4>
        <p className="text-xs text-[var(--color-navy-500)]">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-800)]">
        {title} {files.length > 1 && <span className="text-[var(--color-navy-500)] font-normal">({files.length} ملفات)</span>}
      </h4>
      <ul className="space-y-2">
        {files.map((f) => (
          <li
            key={f.task_id + f.file_path}
            className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-soft)]"
          >
            <span className="w-9 h-9 rounded-lg bg-[var(--color-navy-50)] text-[var(--color-navy-700)] flex items-center justify-center flex-shrink-0">
              <IconDocument className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-navy-900)] truncate">
                {f.researcher_name || 'الباحث'}
              </p>
              <p className="text-[11px] text-[var(--color-navy-500)]">
                آخر تحديث {formatDate(f.updated_at)}
                {f.submitted_date && ` • سُلِّم ${formatDate(f.submitted_date)}`}
              </p>
            </div>
            <FileDownload
              filename={f.file_path}
              className="btn-outline btn-sm flex-shrink-0"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
