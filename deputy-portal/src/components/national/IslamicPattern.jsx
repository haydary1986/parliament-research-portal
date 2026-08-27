// زخرفة هندسية إسلامية — نجمة ثمانية (خاتم سليمان) متكررة
// تُستخدم كطبقة خلفية خفيفة خلف واجهة تسجيل الدخول

const TILE = 120
const OUTER_R = TILE * 0.3
// نسبة نصف القطر الداخلي الناتجة عن تقاطع مربعين متعامدين بزاوية 45°
const INNER_R = OUTER_R * 0.7654

// نجمة ثمانية: 16 رأساً تتناوب بين نصف القطر الخارجي والداخلي
function starPath(cx, cy) {
  const points = Array.from({ length: 16 }, (_, i) => {
    const radius = i % 2 === 0 ? OUTER_R : INNER_R
    const angle = (Math.PI / 8) * i - Math.PI / 2
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
  })
  return `M${points.join('L')}Z`
}

// مربع مائل صغير يربط بين النجوم
function diamondPath(cx, cy, r) {
  return `M${cx},${cy - r}L${cx + r},${cy}L${cx},${cy + r}L${cx - r},${cy}Z`
}

export default function IslamicPattern({ className = '', opacity = 0.07, color = '#D4A943' }) {
  const centers = [
    [0, 0], [TILE, 0], [0, TILE], [TILE, TILE], // الزوايا (تتكرر مع البلاطات المجاورة)
    [TILE / 2, TILE / 2], // المركز
  ]
  const diamonds = [
    [TILE / 2, 0], [0, TILE / 2], [TILE, TILE / 2], [TILE / 2, TILE],
  ]

  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`} style={{ opacity }}>
      <svg width="100%" height="100%" className="block">
        <defs>
          <pattern id="islamic-star" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
            <g fill="none" stroke={color} strokeWidth="1.1" strokeLinejoin="round">
              {centers.map(([cx, cy]) => (
                <path key={`s-${cx}-${cy}`} d={starPath(cx, cy)} />
              ))}
              {diamonds.map(([cx, cy]) => (
                <path key={`d-${cx}-${cy}`} d={diamondPath(cx, cy, OUTER_R * 0.42)} />
              ))}
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamic-star)" />
      </svg>
    </div>
  )
}
