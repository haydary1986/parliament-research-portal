import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import EmptyState from '../ui/EmptyState'
import { useToast } from '../ui/Toast'
import { IconBuilding, IconPlus } from '../icons/Icons'
import * as api from '../../api'

/**
 * إدارة الأقسام — كانت الأقسام الخمسة مثبَّتة في البذور بلا أي واجهة
 * لإضافة قسم أو تعديله أو حذفه.
 */
export default function DepartmentsAdmin({ departments, users, onChanged }) {
  const [editing, setEditing] = useState(null) // كائن القسم أو 'new'
  const toast = useToast()

  const remove = async (d) => {
    if (!window.confirm(`حذف «${d.name}»؟ لا يمكن التراجع.`)) return
    try {
      await api.deleteDepartment(d.id)
      toast.success('تم حذف القسم')
      onChanged?.()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing('new')} className="btn-gold">
          <IconPlus className="w-4 h-4" aria-hidden="true" />
          <span>قسم جديد</span>
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="card"><EmptyState title="لا توجد أقسام" description="أضف أول قسم بحثي" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => {
            const members = users.filter((u) => u.department_id === d.id)
            return (
              <div key={d.id} className="card overflow-hidden">
                <div className="h-1.5" style={{ background: d.color }} />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: d.color + '20', color: d.color }}>
                      <IconBuilding className="w-6 h-6" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[var(--color-navy-900)] truncate">{d.name}</h3>
                      <p className="text-xs text-[var(--color-navy-500)] mt-0.5 truncate">{d.head_name || '—'}</p>
                      <p className="text-[10px] font-mono text-[var(--color-navy-400)] mt-0.5" dir="ltr">{d.id}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-[var(--color-border)] mb-3">
                    <Stat n={d.researcher_count} l="باحث" />
                    <Stat n={d.active_requests} l="نشط" />
                    <Stat n={members.length} l="عضو" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setEditing(d)} className="btn-outline btn-sm flex-1">تعديل</button>
                    <button
                      onClick={() => remove(d)}
                      disabled={members.length > 0 || d.active_requests > 0}
                      title={members.length > 0 || d.active_requests > 0
                        ? 'لا يمكن الحذف: القسم مرتبط بمستخدمين أو طلبات'
                        : 'حذف القسم'}
                      className="btn-danger btn-sm flex-1"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DepartmentModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); onChanged?.() }}
      />
    </div>
  )
}

function Stat({ n, l }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-[var(--color-navy-900)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</p>
      <p className="text-[10px] text-[var(--color-navy-500)] uppercase tracking-wider">{l}</p>
    </div>
  )
}

function DepartmentModal({ target, onClose, onSaved }) {
  const isNew = target === 'new'
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [headName, setHeadName] = useState('')
  const [color, setColor] = useState('#0A2540')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!target) return
    if (isNew) {
      setId(''); setName(''); setHeadName(''); setColor('#0A2540')
    } else {
      setId(target.id); setName(target.name)
      setHeadName(target.head_name || ''); setColor(target.color || '#0A2540')
    }
  }, [target, isNew])

  if (!target) return null

  const submit = async (e) => {
    e.preventDefault()
    if (isNew && !/^[a-z0-9_]{1,40}$/.test(id)) {
      return toast.error('المعرّف يقبل الحروف اللاتينية الصغيرة والأرقام والشرطة السفلية فقط')
    }
    setBusy(true)
    try {
      if (isNew) {
        await api.createDepartment({ id, name, head_name: headName, color })
        toast.success('تم إنشاء القسم')
      } else {
        await api.updateDepartment(target.id, { name, head_name: headName, color })
        toast.success('تم تعديل القسم')
      }
      onSaved()
    } catch (err) {
      toast.error(err.message)
    } finally { setBusy(false) }
  }

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={isNew ? 'قسم بحثي جديد' : `تعديل ${target.name}`}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button form="dept-form" type="submit" disabled={busy} className="btn-gold">
            {busy ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </>
      }
    >
      <form id="dept-form" onSubmit={submit} className="space-y-4">
        {isNew && (
          <div className="form-group">
            <label htmlFor="dept-id" className="label label-required">المعرّف</label>
            <input
              id="dept-id" dir="ltr" value={id}
              onChange={(e) => setId(e.target.value.toLowerCase())}
              className="input font-mono text-right" placeholder="legal_studies" required
            />
            <p className="form-hint">مفتاح ثابت لا يتغير بعد الإنشاء — حروف لاتينية صغيرة وأرقام وشرطة سفلية</p>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="dept-name" className="label label-required">اسم القسم</label>
          <input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
        </div>
        <div className="form-group">
          <label htmlFor="dept-head" className="label">اسم رئيس القسم</label>
          <input id="dept-head" value={headName} onChange={(e) => setHeadName(e.target.value)} className="input" />
        </div>
        <div className="form-group">
          <label htmlFor="dept-color" className="label">لون القسم</label>
          <div className="flex items-center gap-3">
            <input
              id="dept-color" type="color" value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-14 h-11 rounded-lg border border-[var(--color-border-strong)] cursor-pointer"
            />
            <span className="font-mono text-sm text-[var(--color-navy-600)]" dir="ltr">{color}</span>
          </div>
        </div>
      </form>
    </Modal>
  )
}
