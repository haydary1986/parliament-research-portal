import { useState } from 'react'
import * as api from '../../api'
import { useToast } from '../ui/Toast'

/**
 * زر تنزيل ملف مُصادَق عليه.
 *
 * يستبدل وسم <a href> الذي كان يفشل بـ 401: الرمز محفوظ في الذاكرة ولا
 * تحمله تنقّلات المتصفح العادية، فكان المستخدم يرى JSON خاماً بدل الملف.
 */
export default function FileDownload({ filename, saveAs, className = 'btn-outline btn-sm', children }) {
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const onClick = async () => {
    setBusy(true)
    try {
      await api.downloadFile(filename, saveAs)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      {busy ? 'جاري التنزيل…' : children || 'تنزيل'}
    </button>
  )
}
