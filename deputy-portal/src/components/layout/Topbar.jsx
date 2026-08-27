import { useEffect, useRef, useState } from 'react'
import { IconBell, IconLock } from '../icons/Icons'
import * as api from '../../api'
import { useToast } from '../ui/Toast'

export default function Topbar({ title, subtitle, actions, onChangePassword, onMenuClick }) {
  const [notifs, setNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await api.getNotifications({ limit: 30 })
        if (!cancelled && r.success) {
          setNotifs(r.data || [])
          setUnreadCount(r.unread ?? (r.data || []).filter((n) => !n.is_read).length)
        }
      } catch {
        // silent polling failure
      }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = unreadCount

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id)
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch {
      toast.error('فشل تحديث الإشعار')
    }
  }

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      toast.error('فشل تحديث الإشعارات')
    }
  }

  return (
    <header className="topbar sticky top-0 z-20">
      {/* زر القائمة (هاتف فقط) */}
      {onMenuClick && (
        <button onClick={onMenuClick} className="hamburger" aria-label="فتح القائمة">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="page-subtitle truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-1 md:gap-2">
        {actions}

        {onChangePassword && (
          <button onClick={onChangePassword} className="btn-icon" title="تغيير كلمة المرور" aria-label="تغيير كلمة المرور">
            <IconLock className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="btn-icon relative"
            title="الإشعارات"
            aria-label={unread > 0 ? `الإشعارات، ${unread} غير مقروء` : 'الإشعارات'}
            aria-expanded={open}
            aria-haspopup="true"
          >
            <IconBell className="w-5 h-5" aria-hidden="true" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-danger-600)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {open && (
            <div className="fixed md:absolute inset-x-2 md:inset-x-auto md:left-0 top-16 md:top-12 md:w-96 card shadow-xl z-30 animate-fade-in overflow-hidden">
              <div className="card-header py-3">
                <h4 className="font-bold text-sm">الإشعارات</h4>
                {unread > 0 && (
                  <button onClick={markAll} className="btn-ghost btn-sm">
                    تعليم الكل كمقروء ({unread})
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[var(--color-navy-500)]">لا توجد إشعارات</div>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={`w-full text-right p-3 border-b border-[var(--color-border)] hover:bg-[var(--color-surface-soft)] transition-colors ${
                        !n.is_read ? 'bg-[var(--color-gold-50)]/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--color-gold-600)] mt-1.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[var(--color-navy-900)]">{n.title}</p>
                          <p className="text-xs text-[var(--color-navy-600)] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-[var(--color-navy-400)] mt-1">
                            {new Date(n.created_at).toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
