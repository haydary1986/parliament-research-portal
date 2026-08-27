// شعار مجلس النواب العراقي (ختم الدائرة الإعلامية)
// المصدر: Wikimedia Commons — ملف:شعاربرلماني.png — رخصة CC BY-SA 4.0
// ملاحظة: صورة نقطية 400×400، لا تُستخدم بأحجام صغيرة (<80px) لأن النص يصبح غير مقروء.
// للأحجام الصغيرة استخدم StateEmblem بدلاً منه.
export default function CouncilLogo({ size = 128, className = '', glow = false }) {
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
        src="/national/council-logo.png"
        alt="شعار مجلس النواب العراقي"
        width={size}
        height={size}
        className="relative w-full h-full object-contain"
        draggable="false"
      />
    </div>
  )
}
