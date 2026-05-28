import Brand from './Brand'
import { IconLogout } from '../icons/Icons'

export default function Sidebar({ items, activeKey, onNavigate, user, onLogout, portalLabel }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Brand size={42} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">مجلس النواب العراقي</p>
          <p className="text-[11px] text-[var(--color-gold-300)] mt-0.5">دائرة البحوث والدراسات</p>
        </div>
      </div>

      {portalLabel && (
        <div className="px-5 py-3 border-b border-[var(--color-navy-700)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-navy-300)] font-semibold">البوابة</p>
          <p className="text-sm font-semibold text-[var(--color-gold-300)] mt-0.5">{portalLabel}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const active = activeKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate?.(item.key)}
              className={active ? 'nav-link-active w-[calc(100%-1.5rem)]' : 'nav-link w-[calc(100%-1.5rem)] text-[var(--color-navy-100)]'}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              <span className="flex-1 text-right">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="badge bg-[var(--color-gold-500)] text-[var(--color-navy-950)] px-2 py-0 text-[10px] font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {user && (
        <div className="p-3 border-t border-[var(--color-navy-700)]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-navy-800)] mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] flex items-center justify-center text-[var(--color-navy-950)] font-bold text-sm flex-shrink-0">
              {user.name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-[var(--color-navy-300)] truncate" dir="ltr">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--color-navy-200)] hover:bg-[var(--color-danger-600)]/20 hover:text-white transition-colors"
          >
            <IconLogout className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}

      <div className="iraqi-accent" />
    </aside>
  )
}
