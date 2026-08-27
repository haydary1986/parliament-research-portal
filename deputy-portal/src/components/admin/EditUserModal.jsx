import { useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { ROLE_LABELS, REQUESTER_TYPES } from '../../lib/format'
import { COMMITTEES } from '../../lib/committees'
import * as api from '../../api'

/**
 * تعديل بيانات مستخدم — كان الأدمن ينشئ ويفعّل ويعيد كلمة المرور فقط،
 * ولا يستطيع تصحيح اسم أو بريد أو لجنة أو قسم.
 * الحذف غير مدعوم عمداً: السجلات تشير إلى المستخدم، والتعطيل هو البديل.
 */
export default function EditUserModal({ user, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [requesterType, setRequesterType] = useState('deputy')
  const [phone, setPhone] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [committees, setCommittees] = useState([])
  const [departments, setDepartments] = useState([])
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    setName(user.name || '')
    setEmail(user.email || '')
    setDepartmentId(user.department_id || '')
    setRequesterType(user.requester_type || 'deputy')
    setPhone(user.phone || '')
    setSpecialization(user.specialization || '')

    // اللجان الكاملة تأتي من GET /users/{id} لا من القائمة
    api.getUser(user.id)
      .then((r) => { if (r.success) setCommittees(r.data.committees || []) })
      .catch(() => setCommittees(user.committee ? [user.committee] : []))

    api.getDepartments()
      .then((r) => { if (r.success) setDepartments(r.data || []) })
      .catch(() => {})
  }, [user])

  if (!user) return null

  const isRequester = user.role === 'deputy'
  const needsDept = ['department_head', 'researcher'].includes(user.role)

  const toggleCommittee = (c) =>
    setCommittees((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('الاسم مطلوب')
    if (needsDept && !departmentId) return toast.error('اختر القسم')
    setBusy(true)
    try {
      await api.updateUser(user.id, {
        name: name.trim(),
        email: email.trim(),
        department_id: needsDept ? departmentId : '',
        requester_type: isRequester ? requesterType : 'deputy',
        committees: isRequester ? committees : [],
        phone,
        specialization,
      })
      toast.success('تم تعديل بيانات المستخدم')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally { setBusy(false) }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={`تعديل: ${user.name}`}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-outline">إلغاء</button>
          <button form="edit-user-form" type="submit" disabled={busy} className="btn-gold">
            {busy ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </>
      }
    >
      <div className="p-3 rounded-lg bg-[var(--color-navy-50)] border border-[var(--color-navy-200)] mb-4">
        <p className="text-xs text-[var(--color-navy-700)]">
          الدور: <strong>{ROLE_LABELS[user.role] || user.role}</strong>
          {' — '}لا يمكن تغيير الدور بعد الإنشاء حفاظاً على سلامة السجل.
          لإيقاف الحساب استخدم زر التعطيل.
        </p>
      </div>

      <form id="edit-user-form" onSubmit={submit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="eu-name" className="label label-required">الاسم الكامل</label>
          <input id="eu-name" value={name} onChange={(e) => setName(e.target.value)} className="input" required />
        </div>

        <div className="form-group">
          <label htmlFor="eu-email" className="label label-required">البريد الإلكتروني</label>
          <input
            id="eu-email" type="email" dir="ltr" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input text-right" required autoComplete="off"
          />
        </div>

        {needsDept && (
          <div className="form-group">
            <label htmlFor="eu-dept" className="label label-required">القسم</label>
            <select id="eu-dept" className="select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">اختر...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        {user.role === 'researcher' && (
          <div className="form-group">
            <label htmlFor="eu-spec" className="label">التخصص</label>
            <input id="eu-spec" value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="input" />
          </div>
        )}

        {isRequester && (
          <>
            <div className="form-group">
              <label htmlFor="eu-type" className="label label-required">نوع الجهة الطالبة</label>
              <select id="eu-type" className="select" value={requesterType} onChange={(e) => setRequesterType(e.target.value)}>
                {Object.entries(REQUESTER_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="label">اللجان النيابية</label>
              <p className="form-hint mb-2">الأولى تُعتبر الرئيسية. {committees.length} مختارة</p>
              <div className="max-h-56 overflow-y-auto border border-[var(--color-border)] rounded-lg p-2 space-y-1 bg-white">
                {COMMITTEES.map((c) => {
                  const checked = committees.includes(c)
                  return (
                    <label key={c} className={`flex items-start gap-2 p-2 rounded cursor-pointer transition ${
                      checked ? 'bg-[var(--color-gold-50)] border border-[var(--color-gold-300)]' : 'hover:bg-[var(--color-surface-soft)]'
                    }`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCommittee(c)} className="mt-0.5 w-4 h-4" />
                      <span className="text-sm flex-1">{c}</span>
                      {checked && committees[0] === c && <span className="badge-gold text-[10px]">رئيسية</span>}
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="eu-phone" className="label">رقم الموبايل (للإشعارات)</label>
              <input
                id="eu-phone" type="tel" dir="ltr" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input text-right" placeholder="07XXXXXXXXX"
              />
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
