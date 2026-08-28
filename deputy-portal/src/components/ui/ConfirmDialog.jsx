/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ConfirmContext = createContext(null)

/**
 * مزوّد نافذة التأكيد — يمنع تنفيذ الإجراءات المصيرية فوراً بالنقر.
 * الاستخدام: const confirm = useConfirm();  if (!(await confirm({ title, message }))) return
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { title, message, confirmText, cancelText, danger }
  const resolver = useRef(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolver.current = resolve
      setState({
        title: opts.title || 'تأكيد الإجراء',
        message: opts.message || 'هل أنت متأكد من تنفيذ هذا الإجراء؟',
        confirmText: opts.confirmText || 'تأكيد',
        cancelText: opts.cancelText || 'إلغاء',
        danger: !!opts.danger,
      })
    })
  }, [])

  const close = (result) => {
    setState(null)
    if (resolver.current) { resolver.current(result); resolver.current = null }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="modal-backdrop animate-fade-in"
          onClick={() => close(false)}
          role="alertdialog"
          aria-modal="true"
          aria-label={state.title}
        >
          <div className="modal max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`w-10 h-10 flex-shrink-0 rounded-full grid place-items-center ${
                    state.danger
                      ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-600)]'
                      : 'bg-[var(--color-gold-50)] text-[var(--color-gold-700)]'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base text-[var(--color-navy-900)]">{state.title}</h3>
                  <p className="text-sm text-[var(--color-navy-700)] mt-1.5 leading-relaxed">{state.message}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => close(true)}
                autoFocus
                className={state.danger ? 'btn-danger flex-1' : 'btn-primary flex-1'}
              >
                {state.confirmText}
              </button>
              <button onClick={() => close(false)} className="btn-outline flex-1">
                {state.cancelText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
