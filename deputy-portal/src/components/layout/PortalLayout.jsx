import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Modal from '../ui/Modal'
import { useToast } from '../ui/Toast'
import * as api from '../../api'

export default function PortalLayout({
  user,
  portalLabel,
  navItems,
  activeKey,
  onNavigate,
  onLogout,
  title,
  subtitle,
  actions,
  children,
}) {
  const [pwOpen, setPwOpen] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const submitPassword = async (e) => {
    e.preventDefault()
    if (newPw.length < 6) return toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل')
    if (newPw !== confirmPw) return toast.error('كلمتا المرور غير متطابقتين')
    setBusy(true)
    try {
      await api.changePassword(oldPw, newPw)
      toast.success('تم تغيير كلمة المرور بنجاح')
      setOldPw(''); setNewPw(''); setConfirmPw(''); setPwOpen(false)
    } catch (err) {
      toast.error(err.message || 'فشل تغيير كلمة المرور')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-container">
      <Sidebar
        items={navItems}
        activeKey={activeKey}
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
        portalLabel={portalLabel}
      />
      <div className="page-content">
        <Topbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onChangePassword={() => setPwOpen(true)}
        />
        <main className="page-main animate-fade-in">{children}</main>
      </div>

      <Modal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        title="تغيير كلمة المرور"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setPwOpen(false)} className="btn-outline">إلغاء</button>
            <button type="submit" form="pw-form" disabled={busy} className="btn-primary">
              {busy ? 'جاري...' : 'تحديث'}
            </button>
          </>
        }
      >
        <form id="pw-form" onSubmit={submitPassword} className="space-y-4">
          <div className="form-group">
            <label className="label label-required">كلمة المرور الحالية</label>
            <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required className="input" />
          </div>
          <div className="form-group">
            <label className="label label-required">كلمة المرور الجديدة</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} className="input" />
            <p className="form-hint">6 أحرف على الأقل</p>
          </div>
          <div className="form-group">
            <label className="label label-required">تأكيد كلمة المرور الجديدة</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required className="input" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
