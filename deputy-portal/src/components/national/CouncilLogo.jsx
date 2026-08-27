// شعار مجلس النواب العراقي — الشعار المعتمد في المنصة
// المصدر: Wikimedia Commons — ملف:شعاربرلماني.png — رخصة CC BY-SA 4.0
//
// نسختان بحجمين: الأصل 400×400 (251KB) للعرض الكبير في صفحة الدخول،
// ونسخة 96×96 (22KB) للسايدبار — يظهر بـ42px في كل صفحة، فشحن الأصل
// معه هدر بلا فائدة بصرية.
const FULL_SRC = '/national/council-logo.png'
const COMPACT_SRC = '/national/council-logo-96.png'

export default function CouncilLogo({ size = 128, className = '', glow = false, alt }) {
  // النسخة المصغَّرة تكفي حتى 96px عرضاً (192px على شاشات 2x)
  const src = size <= 96 ? COMPACT_SRC : FULL_SRC

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full blur-2xl"
          style={{ background: 'radial-gradient(circle, rgba(212,169,67,0.5), transparent 70%)' }}
        />
      )}
      <img
        src={src}
        alt={alt ?? 'شعار مجلس النواب العراقي'}
        width={size}
        height={size}
        className="relative w-full h-full object-contain"
        draggable="false"
      />
    </div>
  )
}
