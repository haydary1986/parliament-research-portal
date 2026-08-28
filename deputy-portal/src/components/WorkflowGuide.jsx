import CouncilLogo from './national/CouncilLogo'
import {
  IconUser, IconBuilding, IconDepartments, IconResearch, IconProofread,
  IconShield, IconCheck, IconDocument, IconArchive, IconX,
} from './icons/Icons'
import {
  REQUESTERS, ONE_RESEARCH_RULE, WORKFLOW_STEPS,
  DELIVERY_PATHS, RETURN_NOTE, ADMIN_NOTE,
} from '../lib/workflow'

const ICONS = {
  IconUser, IconBuilding, IconDepartments, IconResearch,
  IconProofread, IconShield, IconCheck, IconDocument, IconArchive,
}

// نبرة اللون لكل بطاقة مرحلة
const TONES = {
  navy: {
    ring: 'border-[var(--color-navy-200)]',
    chip: 'bg-[var(--color-navy-50)] text-[var(--color-navy-700)]',
    num: 'bg-gradient-to-b from-[var(--color-navy-700)] to-[var(--color-navy-900)] text-white',
    icon: 'bg-[var(--color-navy-50)] text-[var(--color-navy-700)]',
  },
  gold: {
    ring: 'border-[var(--color-gold-200)]',
    chip: 'bg-[var(--color-gold-50)] text-[var(--color-gold-700)]',
    num: 'bg-gradient-to-b from-[var(--color-gold-500)] to-[var(--color-gold-700)] text-[var(--color-navy-950)]',
    icon: 'bg-[var(--color-gold-50)] text-[var(--color-gold-700)]',
  },
}

/**
 * دليل سير العمل الكامل — من تقديم الطلب حتى استلامه.
 * صفحة مستقلة تُفتح من الرئيسية، وقابلة لإعادة الاستخدام داخل أي بوابة.
 *
 * @param {{ onBack?: () => void, embedded?: boolean }} props
 *   onBack: عند الضغط على «رجوع» / الإغلاق (يُخفى الزر إن لم يُمرَّر)
 *   embedded: true عند العرض داخل بوابة (يُخفي الترويسة الكبيرة)
 */
export default function WorkflowGuide({ onBack, embedded = false }) {
  return (
    <div className="min-h-dvh bg-[var(--color-surface-soft)] text-[var(--color-navy-900)]">
      {/* شريط علوي */}
      <header className="sticky top-0 z-10 bg-[var(--color-navy-950)] text-white">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <CouncilLogo size={40} className="flex-shrink-0" alt="" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">دليل سير العمل</h1>
            <p className="text-[11px] text-[var(--color-gold-300)]">
              من تقديم طلب البحث حتى استلامه
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
            >
              <IconX className="w-4 h-4" />
              <span>{embedded ? 'إغلاق' : 'رجوع'}</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* مقدمة: الجهات الطالبة + القاعدة */}
        {!embedded && (
          <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-sm font-bold text-[var(--color-navy-800)] mb-3">من يطلب الخدمة البحثية؟</h2>
            <ul className="flex flex-wrap gap-2 mb-4">
              {REQUESTERS.map((r) => (
                <li key={r} className="px-3 py-1.5 rounded-lg bg-[var(--color-navy-50)] text-[var(--color-navy-700)] text-xs font-medium border border-[var(--color-navy-100)]">
                  {r}
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-2 p-3 rounded-lg border-2 border-[var(--color-danger-600)] bg-[var(--color-danger-50)]">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-[var(--color-danger-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-sm font-bold text-[var(--color-danger-700)]">{ONE_RESEARCH_RULE}</p>
            </div>
          </section>
        )}

        {/* المراحل */}
        <section>
          <h2 className="text-sm font-bold text-[var(--color-navy-800)] mb-4">مراحل الطلب والأشخاص الذين يمرّ عليهم</h2>
          <ol className="relative space-y-3">
            {WORKFLOW_STEPS.map((step, idx) => {
              const Icon = ICONS[step.icon] || IconDocument
              const tone = TONES[step.tone] || TONES.navy
              const last = idx === WORKFLOW_STEPS.length - 1
              return (
                <li key={step.n} className="relative">
                  {/* خط الوصل للمرحلة التالية */}
                  {!last && (
                    <span aria-hidden="true" className="absolute right-[19px] top-12 bottom-[-14px] w-px bg-[var(--color-border)]" />
                  )}
                  <div className={`relative rounded-2xl border ${tone.ring} bg-[var(--color-surface)] p-4`}>
                    <div className="flex items-start gap-3">
                      {/* رقم المرحلة */}
                      <span className={`w-10 h-10 flex-shrink-0 rounded-full grid place-items-center font-bold text-sm ${tone.num}`}>
                        {step.n}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-7 h-7 rounded-lg grid place-items-center flex-shrink-0 ${tone.icon}`}>
                            <Icon className="w-4 h-4" aria-hidden="true" />
                          </span>
                          <h3 className="font-bold text-[15px] text-[var(--color-navy-900)]">{step.role}</h3>
                          {step.branch && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-gold-100)] text-[var(--color-gold-800)]">
                              نقطة تفرّع
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-[var(--color-navy-700)] mt-1.5">{step.duty}</p>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px]">
                          <span className={`px-2 py-1 rounded-md ${tone.chip}`}>يستلم: {step.receives}</span>
                          <span className="px-2 py-1 rounded-md bg-[var(--color-surface-soft)] text-[var(--color-navy-500)]">
                            الحالة: {step.status}
                          </span>
                        </div>

                        <ul className="mt-3 space-y-1.5">
                          {step.does.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--color-navy-700)] leading-relaxed">
                              <span aria-hidden="true" className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-gold-500)] flex-shrink-0" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>

                        {step.next && step.next !== 'اكتمل المسار' && (
                          <p className="mt-3 text-xs text-[var(--color-navy-500)]">
                            ← يُحيله إلى: <span className="font-semibold text-[var(--color-navy-800)]">{step.next}</span>
                          </p>
                        )}
                        {step.next === 'اكتمل المسار' && (
                          <p className="mt-3 text-xs font-semibold text-[var(--color-success-700)]">✓ اكتمل مسار الطلب</p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {/* المساران حسب السرّية */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-sm font-bold text-[var(--color-navy-800)] mb-3">مسار التسليم يختلف حسب سرّية البحث</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {DELIVERY_PATHS.map((p) => (
              <div key={p.key} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <p className="text-xs font-bold text-[var(--color-navy-800)] mb-1">{p.label}</p>
                <p className="text-[13px] text-[var(--color-navy-600)] leading-relaxed">{p.flow}</p>
              </div>
            ))}
          </div>
        </section>

        {/* الإرجاع للتعديل */}
        <section className="rounded-2xl border border-[var(--color-warning-500)]/40 bg-[var(--color-warning-50)] p-5">
          <h2 className="text-sm font-bold text-[var(--color-warning-700)] mb-1.5">إمكانية الإرجاع للتعديل</h2>
          <p className="text-[13px] text-[var(--color-navy-700)] leading-relaxed">{RETURN_NOTE}</p>
        </section>

        {/* دور الأدمن */}
        <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 bg-[var(--color-navy-50)] text-[var(--color-navy-700)]">
              <IconShield className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--color-navy-800)] mb-1">مدير النظام</h2>
              <p className="text-[13px] text-[var(--color-navy-700)] leading-relaxed">{ADMIN_NOTE}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
