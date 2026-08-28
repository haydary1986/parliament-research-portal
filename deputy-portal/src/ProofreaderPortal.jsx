import { useEffect, useState } from 'react'
import FileDownload from './components/ui/FileDownload'
import PortalLayout from './components/layout/PortalLayout'
import StatusBadge from './components/ui/StatusBadge'
import StatCard from './components/ui/StatCard'
import Modal from './components/ui/Modal'
import EmptyState from './components/ui/EmptyState'
import { PageLoader } from './components/ui/Spinner'
import { useToast } from './components/ui/Toast'
import { useConfirm } from './components/ui/ConfirmDialog'
import {
  IconDashboard, IconProofread, IconClock, IconCheck, IconDocument,
} from './components/icons/Icons'
import { formatDate } from './lib/format'
import * as api from './api'

export default function ProofreaderPortal({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const toast = useToast()

  const refresh = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const r = await api.getProofreadingTasks()
      if (r.success) setTasks(r.data || [])
    } catch (e) {
      if (!silent) toast.error(e.message)
    }
    finally { if (!silent) setLoading(false) }
  }

  useEffect(() => {
    refresh()
    // auto-refresh كل 30 ثانية لكي تظهر المهام الجديدة بدون reload يدوي
    const interval = setInterval(() => refresh(true), 30000)
    return () => clearInterval(interval)
  }, [])

  const pending = tasks.filter((t) => t.status === 'pending')
  const inProgress = tasks.filter((t) => t.status === 'in_progress')
  const completed = tasks.filter((t) => t.status === 'completed')

  const navItems = [
    { key: 'dashboard', label: 'لوحة المعلومات', icon: IconDashboard },
    { key: 'pending', label: 'مهام جديدة', icon: IconClock, badge: pending.length },
    { key: 'in_progress', label: 'قيد التدقيق', icon: IconProofread, badge: inProgress.length },
    { key: 'completed', label: 'مكتملة', icon: IconCheck },
  ]

  const meta = {
    dashboard: { title: 'مهام التدقيق', subtitle: `مرحباً ${user?.name || ''}` },
    pending: { title: 'مهام تدقيق جديدة', subtitle: 'بحوث بانتظار البدء بالتدقيق' },
    in_progress: { title: 'قيد التدقيق', subtitle: 'بحوث قيد المراجعة اللغوية' },
    completed: { title: 'مهام مكتملة', subtitle: 'بحوث تم تدقيقها وإرسالها للمراجعة النهائية' },
  }

  let rows = tasks
  if (tab === 'pending') rows = pending
  else if (tab === 'in_progress') rows = inProgress
  else if (tab === 'completed') rows = completed

  return (
    <PortalLayout
      user={user}
      portalLabel="المدقق اللغوي"
      navItems={navItems}
      activeKey={tab}
      onNavigate={setTab}
      onLogout={onLogout}
      title={meta[tab].title}
      subtitle={meta[tab].subtitle}
    >
      {loading ? <PageLoader /> : tab === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatCard label="مهام جديدة" value={pending.length} tone="warning" icon={<IconClock />} />
            <StatCard label="قيد التدقيق" value={inProgress.length} tone="info" icon={<IconProofread />} />
            <StatCard label="مكتملة" value={completed.length} tone="success" icon={<IconCheck />} />
          </div>

          <div className="card">
            <div className="card-header"><h3 className="card-title">آخر المهام</h3></div>
            {tasks.length === 0 ? <EmptyState title="لا توجد مهام بعد" /> : (
              <div className="divide-y divide-[var(--color-border)]">
                {tasks.slice(0, 8).map((t) => (
                  <button key={t.id} onClick={() => setActive(t)} className="w-full text-right p-4 hover:bg-[var(--color-surface-soft)] flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-navy-50)] text-[var(--color-navy-700)] flex items-center justify-center">
                      <IconProofread className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-[var(--color-navy-500)]" dir="ltr">{t.id}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="font-semibold text-[var(--color-navy-900)] truncate">{t.request_title}</p>
                      <p className="text-xs text-[var(--color-navy-500)] mt-1">من الباحث: {t.researcher_name} • {formatDate(t.assigned_date)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        rows.length === 0 ? <div className="card"><EmptyState title="لا توجد مهام" /></div> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>عنوان البحث</th>
                  <th>الباحث</th>
                  <th>تاريخ التعيين</th>
                  <th>الحالة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => setActive(t)} className="cursor-pointer">
                    <td className="font-mono text-xs" dir="ltr">{t.id}</td>
                    <td className="font-semibold max-w-md truncate">{t.request_title}</td>
                    <td className="text-sm">{t.researcher_name}</td>
                    <td className="text-xs">{formatDate(t.assigned_date)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td><button className="btn-ghost btn-sm">إجراء</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <TaskModal
        task={active}
        onClose={() => setActive(null)}
        onChanged={() => { setActive(null); refresh() }}
      />
    </PortalLayout>
  )
}

function TaskModal({ task, onClose, onChanged }) {
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const confirmAction = useConfirm()

  useEffect(() => { setNotes(task?.notes || '') }, [task])
  if (!task) return null

  const updateStatus = async (status) => {
    const isDone = status === 'completed'
    const isReturn = status === 'returned'
    if (isDone || isReturn) {
      if (!(await confirmAction({
        title: isDone ? 'إتمام التدقيق اللغوي' : 'إرجاع البحث للباحث',
        message: isDone ? 'سيُحال البحث إلى المعاون للتدقيق النهائي.' : 'سيُرجَع البحث إلى الباحث للتصحيح.',
        danger: isReturn, confirmText: isDone ? 'إتمام' : 'إرجاع',
      }))) return
    }
    setBusy(true)
    try {
      await api.updateProofreadingStatus(task.id, { status, notes })
      toast.success('تم التحديث')
      onChanged()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <Modal open={!!task} onClose={onClose} title={`مهمة التدقيق ${task.id}`} size="md">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-[var(--color-navy-900)]">{task.request_title}</h3>
          <StatusBadge status={task.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 bg-[var(--color-surface-soft)] rounded-xl">
          <Field label="الباحث" value={task.researcher_name} />
          <Field label="تاريخ التعيين" value={formatDate(task.assigned_date)} />
          <Field label="تاريخ الإنجاز" value={formatDate(task.completed_date)} />
        </div>

        {/* ملف البحث المطلوب تدقيقه — كان المدقق يُكلَّف بمستند لا يراه */}
        {task.research_file ? (
          <div className="card p-4">
            <h4 className="font-bold text-sm mb-3 text-[var(--color-navy-800)]">المستند المطلوب تدقيقه</h4>
            <FileDownload
              filename={task.research_file}
              className="btn-primary w-full justify-center"
            >
              <IconDocument className="w-4 h-4" aria-hidden="true" />
              <span>فتح ملف البحث</span>
            </FileDownload>
          </div>
        ) : (
          <div className="card p-4 bg-[var(--color-warning-50)] border-[var(--color-warning-600)]">
            <p className="text-sm font-semibold text-[var(--color-warning-700)]">
              لم يُرفق ملف بهذا البحث — راجع رئيس القسم قبل التدقيق
            </p>
          </div>
        )}

        <div>
          <label className="label">ملاحظات التدقيق</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="textarea" rows={5} placeholder="اكتب ملاحظاتك على البحث..." />
        </div>

        {task.status === 'pending' && (
          <div className="card p-4 bg-[var(--color-gold-50)] border-[var(--color-gold-200)]">
            <p className="text-sm mb-3">عند البدء بالتدقيق:</p>
            <button onClick={() => updateStatus('in_progress')} disabled={busy} className="btn-primary w-full">
              {busy ? 'جاري...' : 'بدء التدقيق'}
            </button>
          </div>
        )}

        {task.status === 'in_progress' && (
          <div className="flex gap-3">
            <button onClick={() => updateStatus('completed')} disabled={busy} className="btn-success flex-1">
              <IconCheck className="w-4 h-4" />
              <span>إتمام التدقيق</span>
            </button>
            <button onClick={() => updateStatus('returned')} disabled={busy} className="btn-danger flex-1">
              إرجاع للباحث
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-[var(--color-navy-500)] font-semibold mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[var(--color-navy-900)]">{value || '—'}</p>
    </div>
  )
}
