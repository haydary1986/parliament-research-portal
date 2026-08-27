// شعار جمهورية العراق الرسمي — نسر صلاح الدين
// المصدر: Wikimedia Commons (Public Domain) — /public/national/emblem-iraq.svg
export default function StateEmblem({ size = 96, className = '', glow = false }) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full blur-xl"
          style={{ background: 'radial-gradient(circle, rgba(212,169,67,0.45), transparent 70%)' }}
        />
      )}
      <img
        src="/national/emblem-iraq.svg"
        alt="شعار جمهورية العراق"
        width={size}
        height={size}
        className="relative w-full h-full object-contain drop-shadow-lg"
        draggable="false"
      />
    </div>
  )
}
