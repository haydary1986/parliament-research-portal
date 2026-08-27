// علم جمهورية العراق الرسمي (أحمر/أبيض/أسود مع "الله أكبر" بالخط الكوفي)
// المصدر: Wikimedia Commons (Public Domain) — /public/national/flag-iraq.svg
export default function IraqFlag({ width = 72, className = '', wave = false }) {
  const height = Math.round((width * 2) / 3) // نسبة العلم الرسمية 2:3

  return (
    <img
      src="/national/flag-iraq.svg"
      alt="علم جمهورية العراق"
      width={width}
      height={height}
      style={{ width, height }}
      className={`rounded-[3px] ring-1 ring-white/25 shadow-md object-cover ${
        wave ? 'flag-wave' : ''
      } ${className}`}
      draggable="false"
    />
  )
}

// شريط زخرفي بألوان العلم العراقي (أحمر - أبيض - أسود)
export function FlagStripe({ className = '', height = 4 }) {
  return (
    <div
      aria-hidden="true"
      className={`w-full ${className}`}
      style={{
        height,
        background:
          'linear-gradient(to bottom, #CE1126 0%, #CE1126 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #101010 66.66%, #101010 100%)',
      }}
    />
  )
}
