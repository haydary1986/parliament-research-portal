// رسم ظلّي لمعالم بغداد: النخيل، المآذن والقباب، مبنى المجلس، نصب الشهيد، برج الساعة
// يُستخدم كشريط سفلي خلف واجهة تسجيل الدخول

const W = 1440
const H = 220
const BASE = H // خط الأرض

// ---------- نخلة ----------
// كل سعفة شكل مملوء: يُبنى من محور مائل بزاوية θ عن العمود، مع انحناء وانسدال يزدادان كلما اتسعت الزاوية
function PalmTree({ x, height, scale = 1, fronds = 11 }) {
  const top = BASE - height
  const trunkW = 6 * scale

  const frondPaths = Array.from({ length: fronds }, (_, i) => {
    const deg = -98 + (196 * i) / (fronds - 1) // من -98° إلى +98° عن العمود
    const a = (deg * Math.PI) / 180
    const lateral = Math.abs(Math.sin(a)) // 0 للسعفة العمودية، 1 للأفقية

    const len = (38 + 24 * lateral) * scale
    const droop = 30 * Math.pow(lateral, 1.5) * scale // الانسدال بفعل الجاذبية
    const dx = Math.sin(a) * len
    const dy = -Math.cos(a) * len + droop

    const tipX = x + dx
    const tipY = top + dy

    // نقطة منتصف المحور مرفوعة لأعلى لإعطاء الانحناء
    const arc = (14 - 5 * lateral) * scale
    const midX = x + dx / 2
    const midY = top + dy / 2 - arc

    // عرض السعفة: إزاحة عمودية على المحور عند المنتصف
    const w = (11 - 3.5 * lateral) * scale
    const norm = Math.hypot(dx, dy) || 1
    const px = (-dy / norm) * (w / 2)
    const py = (dx / norm) * (w / 2)

    return `M${x},${top} Q${(midX + px).toFixed(1)},${(midY + py).toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} Q${(midX - px).toFixed(1)},${(midY - py).toFixed(1)} ${x},${top + 4 * scale} Z`
  })

  return (
    <g>
      {/* الجذع المستدق */}
      <path d={`M${x - trunkW},${BASE} L${x - trunkW * 0.45},${top + 4} L${x + trunkW * 0.45},${top + 4} L${x + trunkW},${BASE} Z`} />
      {frondPaths.map((d, i) => <path key={i} d={d} />)}
      {/* عذوق التمر تحت التاج */}
      <circle cx={x - 6 * scale} cy={top + 11 * scale} r={3.6 * scale} />
      <circle cx={x + 6 * scale} cy={top + 12 * scale} r={3.2 * scale} />
      <circle cx={x} cy={top + 15 * scale} r={2.8 * scale} />
    </g>
  )
}

// ---------- قبة مدببة على رقبة ----------
function Dome({ cx, base, r, drum = 0 }) {
  const y = base - drum
  return (
    <g>
      {drum > 0 && <rect x={cx - r * 0.86} y={y} width={r * 1.72} height={drum} />}
      <path
        d={`M${cx - r},${y}
            C${cx - r},${y - r * 1.18} ${cx - r * 0.44},${y - r * 1.76} ${cx},${y - r * 2.02}
            C${cx + r * 0.44},${y - r * 1.76} ${cx + r},${y - r * 1.18} ${cx + r},${y} Z`}
      />
      {/* هلال/سنّ علوي */}
      <path d={`M${cx - 2},${y - r * 2.0} L${cx},${y - r * 2.62} L${cx + 2},${y - r * 2.0} Z`} />
    </g>
  )
}

// ---------- مئذنة ----------
function Minaret({ x, height, w = 9 }) {
  const top = BASE - height
  return (
    <g>
      <path d={`M${x - w},${BASE} L${x - w * 0.66},${top} L${x + w * 0.66},${top} L${x + w},${BASE} Z`} />
      {/* شرفة الأذان */}
      <rect x={x - w * 1.5} y={top + height * 0.2} width={w * 3} height={6} />
      <rect x={x - w * 1.25} y={top + height * 0.52} width={w * 2.5} height={5} />
      {/* تاج المئذنة */}
      <path d={`M${x - w * 0.8},${top} C${x - w * 0.8},${top - w} ${x - w * 0.3},${top - w * 1.5} ${x},${top - w * 1.75}
                C${x + w * 0.3},${top - w * 1.5} ${x + w * 0.8},${top - w} ${x + w * 0.8},${top} Z`} />
      <path d={`M${x - 1.5},${top - w * 1.7} L${x},${top - w * 2.5} L${x + 1.5},${top - w * 1.7} Z`} />
    </g>
  )
}

// ---------- مبنى المجلس (طراز كلاسيكي بأعمدة وقبة) ----------
function ParliamentBuilding({ cx }) {
  const bodyW = 300
  const left = cx - bodyW / 2
  const stepsTop = BASE - 16
  const colBase = stepsTop
  const colTop = colBase - 78
  const entabY = colTop - 14

  const columns = Array.from({ length: 11 }, (_, i) => left + 26 + i * ((bodyW - 52) / 10))

  return (
    <g>
      {/* الدرج */}
      <path d={`M${left - 26},${BASE} L${left - 12},${stepsTop} L${cx + bodyW / 2 + 12},${stepsTop} L${cx + bodyW / 2 + 26},${BASE} Z`} />
      {/* الأعمدة */}
      {columns.map((x) => (
        <rect key={x} x={x - 5} y={colTop} width={10} height={colBase - colTop} />
      ))}
      {/* الطنف العلوي */}
      <rect x={left - 6} y={entabY} width={bodyW + 12} height={14} />
      {/* الجملون */}
      <path d={`M${left + 46},${entabY} L${cx},${entabY - 40} L${cx + bodyW / 2 - 46},${entabY} Z`} />
      {/* القبة المركزية */}
      <Dome cx={cx} base={entabY - 34} r={40} drum={26} />
      {/* جناحان جانبيان */}
      <rect x={left - 74} y={BASE - 66} width={70} height={66} />
      <rect x={cx + bodyW / 2 + 4} y={BASE - 66} width={70} height={66} />
    </g>
  )
}

// ---------- نصب الشهيد (القبة المشطورة) ----------
function ShaheedMonument({ cx }) {
  const R = 104
  const HH = 138

  // قشرة نصف القبة: حافة خارجية صاعدة ثم حافة داخلية أرفع هابطة
  const half = `M${-R},0
                C${-R},${-HH * 0.60} ${-R * 0.70},${-HH * 0.98} ${-10},${-HH}
                C${-R * 0.24},${-HH * 0.88} ${-R * 0.56},${-HH * 0.52} ${-R * 0.62},0 Z`

  return (
    <g transform={`translate(${cx},${BASE})`}>
      {/* المنصة الدائرية */}
      <rect x={-R - 34} y={-13} width={(R + 34) * 2} height={13} />
      {/* النصفان منفرجان عن بعضهما */}
      <g transform="translate(-24,0) rotate(-5)"><path d={half} /></g>
      <g transform="translate(24,0) scale(-1,1) rotate(-5)"><path d={half} /></g>
      {/* الشعلة الخالدة في فتحة الشطر */}
      <path d="M-6,-13 C-6,-38 -11,-46 0,-66 C11,-46 6,-38 6,-13 Z" />
    </g>
  )
}

// ---------- برج الساعة (القشلة) ----------
function ClockTower({ x }) {
  const height = 158
  const top = BASE - height
  const w = 20
  return (
    <g>
      <path d={`M${x - w},${BASE} L${x - w * 0.78},${top} L${x + w * 0.78},${top} L${x + w},${BASE} Z`} />
      <rect x={x - w * 1.2} y={top + 26} width={w * 2.4} height={8} />
      {/* وجه الساعة */}
      <circle cx={x} cy={top + 54} r={11} fill="#0A2540" />
      <circle cx={x} cy={top + 54} r={11} fill="none" stroke="currentColor" strokeWidth="3" />
      {/* السقف الهرمي */}
      <path d={`M${x - w * 0.95},${top} L${x},${top - 34} L${x + w * 0.95},${top} Z`} />
      <path d={`M${x - 1.5},${top - 32} L${x},${top - 46} L${x + 1.5},${top - 32} Z`} />
    </g>
  )
}

export default function BaghdadSkyline({ className = '', color = '#0d2f52', opacity = 1 }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`} style={{ opacity }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax meet"
        className="w-full h-auto block"
        fill={color}
        style={{ color }}
      >
        {/* نخيل يسار */}
        <PalmTree x={72} height={140} scale={1} />
        <PalmTree x={132} height={104} scale={0.78} fronds={6} />

        {/* جامع بقبة ومئذنتين */}
        <Minaret x={252} height={182} w={8} />
        <g>
          <rect x={286} y={BASE - 62} width={128} height={62} />
          <Dome cx={350} base={BASE - 62} r={46} drum={20} />
        </g>
        <Minaret x={448} height={182} w={8} />

        {/* مبنى مجلس النواب */}
        <ParliamentBuilding cx={700} />

        {/* نصب الشهيد */}
        <ShaheedMonument cx={1010} />

        {/* برج الساعة */}
        <ClockTower x={1188} />

        {/* جامع صغير يمين */}
        <g>
          <rect x={1240} y={BASE - 48} width={86} height={48} />
          <Dome cx={1283} base={BASE - 48} r={30} drum={14} />
        </g>

        {/* نخيل يمين */}
        <PalmTree x={1354} height={132} scale={0.94} />
        <PalmTree x={1406} height={98} scale={0.72} fronds={9} />

        {/* خط الأرض */}
        <rect x="0" y={BASE - 4} width={W} height="4" />
      </svg>
    </div>
  )
}
