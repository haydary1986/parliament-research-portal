// شعار رسمي يجمع بين النخل والسنابل والميزان (رمزية برلمانية عراقية)
export default function Brand({ size = 48, className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E6BD3F" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
        </defs>
        {/* دائرة خلفية ذهبية */}
        <circle cx="32" cy="32" r="30" fill="url(#goldGrad)" stroke="#966B08" strokeWidth="1.5" />
        {/* نجمة مركزية (ترمز للوحدة) */}
        <path d="M32 14 L34.5 24 L44.5 24 L36.5 30 L39.5 40 L32 34 L24.5 40 L27.5 30 L19.5 24 L29.5 24 Z"
          fill="#0A2540" />
        {/* قاعدة معمارية (تمثل المبنى البرلماني) */}
        <rect x="18" y="42" width="28" height="3" fill="#0A2540" />
        <rect x="20" y="45" width="2" height="6" fill="#0A2540" />
        <rect x="25" y="45" width="2" height="6" fill="#0A2540" />
        <rect x="30" y="45" width="2" height="6" fill="#0A2540" />
        <rect x="35" y="45" width="2" height="6" fill="#0A2540" />
        <rect x="40" y="45" width="2" height="6" fill="#0A2540" />
        <rect x="16" y="51" width="32" height="2" fill="#0A2540" />
      </svg>
    </div>
  )
}
