/** Barber Studio emblem — pixel-matched to the imported Claude Design file
 * "logo design mockup" (artboard 3B, "Sello de vidrio"): a glass disc
 * with a double gold ring, a straight-razor mark, and the "Barber Studio"
 * script wordmark. Self-contained (own gradients/mask), so it's safe to
 * drop anywhere — pass a distinct `idPrefix` if it's ever rendered more
 * than once on the same page, so the SVG def ids (gradients/mask) don't
 * collide.
 */
export function Logo({ size = 64, idPrefix = "logo" }: { size?: number; idPrefix?: string }) {
  const grad = `${idPrefix}-g`;
  const glass = `${idPrefix}-glass`;
  const mask = `${idPrefix}-mask`;

  return (
    <svg viewBox="0 0 400 470" width={size} height={size * (470 / 400)} fill="none" role="img" aria-label="Barber Studio">
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2cd8f" />
          <stop offset="0.5" stopColor="#d9a34a" />
          <stop offset="1" stopColor="#b9772e" />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.02" />
        </linearGradient>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="430">
          <rect width="400" height="430" fill="#fff" />
          <text
            x="200"
            y="244"
            textAnchor="middle"
            fontFamily="var(--font-yellowtail), cursive"
            fontSize="100"
            fill="#000"
            stroke="#000"
            strokeWidth="24"
            strokeLinejoin="round"
          >
            Barber Studio
          </text>
        </mask>
      </defs>
      <circle cx="200" cy="235" r="182" fill={`url(#${glass})`} stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
      <circle cx="200" cy="235" r="170" fill="none" stroke={`url(#${grad})`} strokeWidth="3" />
      <g transform="translate(70,90) scale(0.65)">
        <path d="M30 26 H370 L200 300 Z" stroke={`url(#${grad})`} strokeWidth="9" strokeLinejoin="round" fill="none" mask={`url(#${mask})`} />
        <g fill={`url(#${grad})`}>
          <path d="M152 20 L166 10 L234 162 Z" />
          <path d="M248 20 L234 10 L166 162 Z" />
        </g>
        <circle cx="152" cy="4" r="16" fill="#101a15" stroke={`url(#${grad})`} strokeWidth="9" />
        <circle cx="248" cy="4" r="16" fill="#101a15" stroke={`url(#${grad})`} strokeWidth="9" />
        <circle cx="200" cy="94" r="5" fill="#101a15" />
        <text x="200" y="244" textAnchor="middle" fontFamily="var(--font-yellowtail), cursive" fontSize="100" fill={`url(#${grad})`}>
          Barber Studio
        </text>
        <path d="M110 330 h180" stroke="#f2cd8f" strokeWidth="4" />
        <text x="200" y="364" textAnchor="middle" fontFamily="var(--font-oswald), sans-serif" fontSize="17" fontWeight="600" fill="#f2cd8f" letterSpacing="9">
          BARBER SHOP
        </text>
        <g fill={`url(#${grad})`}>
          <rect x="150" y="388" width="100" height="7" rx="3" />
          <rect x="153" y="395" width="8" height="21" />
          <rect x="177" y="395" width="8" height="21" />
          <rect x="201" y="395" width="8" height="21" />
          <rect x="225" y="395" width="8" height="21" />
        </g>
      </g>
    </svg>
  );
}
