// Quadra — shared UI components. Loaded after data.js + React.
// Styles scoped via the `q-` class names defined in index.html.
var { useState, useEffect, useRef } = React;

// ── Icons (clean single-weight line icons) ───────────────────
function Icon({ name, size = 24, stroke = 'currentColor', fill = 'none', sw = 2, grad = false }) {
  const gid = useRef('qg' + Math.random().toString(36).slice(2, 8)).current;
  const strokeVal = grad ? `url(#${gid})` : stroke;
  const p = { fill, stroke: strokeVal, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <path d="M3 10.5L12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5" {...p} />,
    search: <g {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></g>,
    grid: <g {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="2" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></g>,
    trophy: <g {...p}><path d="M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" /><path d="M12 13v4M8.5 21h7M9.5 21c0-2 1-3 2.5-3s2.5 1 2.5 3" /></g>,
    user: <g {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" /></g>,
    bell: <g {...p}><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 004 0" /></g>,
    plus: <path d="M12 5v14M5 12h14" {...p} style={{ stroke: "rgb(0, 0, 0)" }} />,
    chevL: <path d="M15 5l-7 7 7 7" {...p} />,
    chevR: <path d="M9 5l7 7-7 7" {...p} />,
    pin: <g {...p}><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></g>,
    clock: <g {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></g>,
    users: <g {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5" /><path d="M16 6.2a3 3 0 010 5.6M17.5 14c2.4.4 4 2.3 4 5" /></g>,
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" {...p} style={{ stroke: "rgb(255, 255, 255)" }} />,
    star: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.8 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z" {...p} />,
    check: <path d="M5 12.5l4.5 4.5L19 7" {...p} />,
    share: <g {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="M8.2 11l6.6-3.6M8.2 13l6.6 3.6" /></g>,
    flame: <path d="M12 3c1 3-2 4-2 7a2 2 0 004 0c0-1 0-2-.5-3 2 1.5 3.5 3.6 3.5 6a5 5 0 01-10 0c0-3.5 3-5 5-10z" {...p} />,
    cal: <g {...p}><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M4 9.5h16M8 3v4M16 3v4" /></g>,
    whistle: <g {...p}><path d="M13 9h8v3a5 5 0 01-5 5 5 5 0 01-5-5" /><circle cx="6" cy="13" r="3.5" /><path d="M11 9V6" /></g>,
    arrowU: <path d="M12 19V5M6 11l6-6 6 6" {...p} />,
    arrowD: <path d="M12 5v14M6 13l6 6 6-6" {...p} />,
    edit: <g {...p}><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M14 6l4 4" /></g>,
    settings: <g {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M22 12h-3M5 12H2M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7L5.6 5.6" /></g>,
    volley: <g {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3c2.7 3.4 2.7 14.6 0 18" /><path d="M20.4 8.6c-3.9 2.2-12.9 2.2-16.8 0" /><path d="M19.8 16.6c-3.5-2-12.1-2-15.6 0" /></g>,
    net: <g {...p}><path d="M4 7.5V20M20 7.5V20" /><path d="M4 9.5h16" /><circle cx="12" cy="7" r="2" /><path d="M4 14h16" /><path d="M8.5 9.5V14M12 9.5V14M15.5 9.5V14" /></g>,
    heart: <path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0112 7a3.5 3.5 0 017 3.5C19 15.5 12 20 12 20z" {...p} />,
    plusUser: <g {...p}><circle cx="9" cy="8" r="3.6" /><path d="M3.5 19c0-3.2 2.5-5.4 5.5-5.4" /><path d="M17 11v6M14 14h6" /></g>,
    lock: <g {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></g>,
    chat: <g {...p}><path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7A2.5 2.5 0 0117.5 16H9l-4 4v-4H6.5" /></g>,
    dice: <g {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="8.3" cy="8.3" r="1.4" fill={strokeVal} stroke="none" /><circle cx="15.7" cy="8.3" r="1.4" fill={strokeVal} stroke="none" /><circle cx="12" cy="12" r="1.4" fill={strokeVal} stroke="none" /><circle cx="8.3" cy="15.7" r="1.4" fill={strokeVal} stroke="none" /><circle cx="15.7" cy="15.7" r="1.4" fill={strokeVal} stroke="none" /></g>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    {grad && <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#0032D1" /><stop offset="1" stopColor="#ACEA00" />
    </linearGradient></defs>}
    {paths[name]}
  </svg>;
}

// ── Volleyball (clean, classic) ──────────────────────────────
// A plain, recognizable volleyball: white ball, curved navy seams,
// three subtle brand-tinted panels. Reads crisp on the gradient FAB.
function VolleyBall({ size = 32 }) {
  const uid = useRef('qvb' + Math.random().toString(36).slice(2, 7)).current;
  const panel = `${uid}p`,seam = `${uid}s`,clip = `${uid}c`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <defs>
        <clipPath id={clip}><circle cx="50" cy="50" r="46" /></clipPath>
        <path id={panel} d="M50 50 C40 44 30 30 30 8 A46 46 0 0 1 95 48 C74 44 60 46 50 50 Z" />
        <path id={seam} d="M50 50 C40 44 30 30 30 8" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="#fff" />
      <g clipPath={`url(#${clip})`} opacity="0.1">
        <use href={`#${panel}`} fill={QUADRA.blue} transform="rotate(0 50 50)" />
        <use href={`#${panel}`} fill={QUADRA.blue} transform="rotate(120 50 50)" />
        <use href={`#${panel}`} fill={QUADRA.blue} transform="rotate(240 50 50)" />
      </g>
      <g clipPath={`url(#${clip})`} fill="none" stroke={QUADRA.navy} strokeWidth="4.5" strokeLinecap="round">
        <use href={`#${seam}`} transform="rotate(0 50 50)" />
        <use href={`#${seam}`} transform="rotate(120 50 50)" />
        <use href={`#${seam}`} transform="rotate(240 50 50)" />
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke={QUADRA.navy} strokeWidth="5" />
    </svg>);

}

// ── Brand SVG icons (jogar ball + notification bells) ────────
const LOGO_BLUE = '#0032D1';

// Detailed volleyball used inside the "Jogar" FAB (from jogar.svg)
function JogarBall({ size = 28, color = '#EBF1FF' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 31 31" fill="none" style={{ display: 'block' }}>
      <path d="M14.9767 0L16.6448 0.0349601C29.5038 0.860407 35.7099 16.5157 26.8394 26.1094C19.0027 34.5853 4.66763 31.5831 0.885712 20.6595C-2.5829 10.641 4.55646 0.334549 14.9767 0ZM24.3146 6.24912C21.0967 3.22313 16.3609 2.19132 12.1015 3.21439C11.7877 3.28965 11.587 3.28868 11.3565 3.53C10.2914 4.64484 8.55688 7.48244 8.30758 8.99689C8.28929 9.10905 8.2402 9.73251 8.26282 9.81165C8.27196 9.84419 8.31672 9.91071 8.35378 9.87041C12.6666 6.20542 18.8265 4.53753 24.3151 6.24912H24.3146ZM6.09175 7.22121C6.02052 7.15274 5.61817 7.66501 5.56427 7.73201C3.92068 9.76116 2.48213 13.6694 3.12464 16.2628C4.00395 19.8117 7.41095 22.9683 10.7722 24.1137C11.5173 22.8294 11.6756 21.2538 11.7194 19.7811C8.57132 18.1938 6.12689 15.1261 5.61913 11.5587C5.41362 10.1166 5.47667 8.556 6.09175 7.22169V7.22121ZM28.1605 16.8833C28.3612 14.6939 28.0902 12.4662 27.2692 10.4278C24.2068 8.45841 20.2785 8.00878 16.7565 8.741C13.8014 9.35523 10.9835 10.9352 9.04154 13.2664C9.72159 14.7323 10.8666 15.9122 12.1299 16.8809C12.193 16.8988 12.2098 16.8449 12.2392 16.8037C12.4803 16.4662 12.6285 16.1346 12.9202 15.7923C15.8069 12.4074 21.2671 12.2385 24.9884 14.2361C26.2238 14.8993 27.2668 15.8025 28.16 16.8833H28.1605ZM19.9325 15.6757C17.7653 15.5665 14.8838 16.5701 14.3852 18.9702C14.2336 19.7 14.3106 20.3633 14.2649 21.0824C14.1306 23.1965 13.4968 25.1106 12.217 26.7833C12.1386 26.8858 11.512 27.552 11.5731 27.6136C13.0242 27.9739 14.5055 28.2808 16.0105 28.2347C16.1092 28.2118 16.449 27.8229 16.55 27.7117C17.875 26.2521 19.1047 24.087 19.6996 22.2006C20.3464 20.1487 20.613 17.7481 19.9325 15.6757ZM20.036 27.6627C22.3336 26.6192 24.4258 25.0513 25.8927 22.9678C26.1444 22.6105 26.8726 21.4971 26.9491 21.1203C27.093 20.4099 26.0857 18.6765 25.6121 18.1224C25.1636 17.598 23.7409 16.3759 23.0892 16.2511C22.9935 16.2327 23.0194 16.2399 23.0401 16.3006C23.1383 16.591 23.1937 17.0348 23.2115 17.3422C23.392 20.4837 22.5675 23.6952 20.9215 26.3473L20.036 27.6627L20.036 27.6627Z" fill={color} />
    </svg>);

}

// Notification bell — outline (idle) and filled-with-alert (active)
function BellIcon({ size = 22, color = LOGO_BLUE, alert = false }) {
  const uid = useRef('qb' + Math.random().toString(36).slice(2, 7)).current;
  if (!alert) {
    return (
      <svg width={size * (21 / 23)} height={size} viewBox="0 0 21 23" fill="none" style={{ display: 'block' }}>
        <path d="M20.8111 12.6568L19.1192 6.62275C18.5735 4.67847 17.3889 2.97102 15.7537 1.77166C14.1185 0.572304 12.1265 -0.0501607 10.0942 0.00316161C8.06187 0.0564839 6.10576 0.782535 4.53668 2.06596C2.96759 3.34939 1.87552 5.11658 1.43397 7.08676L0.12645 12.9242C-0.0460447 13.6949 -0.0420114 14.4942 0.138252 15.2632C0.318515 16.0321 0.670406 16.7511 1.16795 17.3669C1.6655 17.9828 2.29601 18.4799 3.01294 18.8215C3.72987 19.1632 4.51492 19.3406 5.31016 19.3408H5.69643C6.00373 20.3958 6.64803 21.3232 7.53228 21.9832C8.41654 22.6431 9.49286 23 10.5991 23C11.7054 23 12.7817 22.6431 13.666 21.9832C14.5502 21.3232 15.1945 20.3958 15.5018 19.3408H15.6882C16.507 19.3409 17.3148 19.153 18.0484 18.7919C18.7819 18.4307 19.4215 17.9061 19.917 17.2589C20.4125 16.6118 20.7506 15.8597 20.9049 15.0613C21.0592 14.263 21.0254 13.44 20.8062 12.6568H20.8111ZM17.6157 15.5175C17.3915 15.813 17.101 16.0525 16.7672 16.2169C16.4335 16.3813 16.0656 16.4662 15.693 16.4647H5.31016C4.94872 16.4646 4.5919 16.384 4.26605 16.2287C3.94019 16.0734 3.65362 15.8475 3.42746 15.5676C3.20131 15.2877 3.04135 14.9609 2.95939 14.6114C2.87743 14.2619 2.87557 13.8986 2.95393 13.5483L4.26144 7.70032C4.56169 6.35438 5.30682 5.14684 6.37823 4.26991C7.44964 3.39299 8.78575 2.89709 10.1739 2.86115C11.562 2.82521 12.9223 3.25129 14.0383 4.07158C15.1543 4.89187 15.9618 6.05922 16.3323 7.38779L18.0203 13.4218C18.1221 13.7782 18.1386 14.1534 18.0683 14.5173C17.9981 14.8812 17.8431 15.2237 17.6157 15.5175Z" fill={color} />
      </svg>);

  }
  return (
    <svg width={size * (21 / 23)} height={size} viewBox="0 0 21 23" fill="none" style={{ display: 'block' }}>
      <path d="M6.05603 20.2151C6.42668 21.0426 7.03819 21.747 7.81545 22.2417C8.59271 22.7365 9.50187 23 10.4313 23C11.3607 23 12.2698 22.7365 13.0471 22.2417C13.8243 21.747 14.4358 21.0426 14.8065 20.2151H6.05603Z" fill={color} />
      <path d="M20.3674 12.3697L18.7075 7.05687C18.176 5.19868 17.0203 3.56614 15.4241 2.41848C13.8278 1.27081 11.8824 0.67379 9.89674 0.722212C7.91109 0.770634 5.99901 1.46172 4.46409 2.68575C2.92917 3.90977 1.85938 5.59657 1.42459 7.47833L0.135736 12.6185C-0.0355699 13.3015 -0.0448513 14.0134 0.108592 14.7004C0.262035 15.3874 0.574194 16.0316 1.02151 16.5844C1.46883 17.1372 2.03962 17.5841 2.69081 17.8914C3.34199 18.1987 4.05656 18.3583 4.7806 18.3583H15.7923C16.5388 18.3584 17.2749 18.1887 17.9417 17.8628C18.6085 17.537 19.1874 17.0641 19.6321 16.482C20.0768 15.8998 20.375 15.2247 20.5026 14.5106C20.6303 13.7965 20.584 13.0633 20.3674 12.3697Z" fill={color} />
      <ellipse cx="16.5265" cy="4.34345" rx="4.47351" ry="4.34345" fill={`url(#${uid})`} />
      <defs>
        <linearGradient id={uid} x1="16.5265" y1="0" x2="16.5265" y2="8.68691" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" /><stop offset="1" stopColor="#ACEA00" />
        </linearGradient>
      </defs>
    </svg>);

}

// ── Logo mark (official Quadra SVG) ──────────────────────────
const LOGO_LIME = '#ACEA00';
function LogoMark({ size = 26 }) {
  // viewBox 169×163 → keep aspect
  const w = size * (169 / 163);
  return (
    <svg width={w} height={size} viewBox="0 0 169 163" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M47.9316 0.577696L98.0858 15.1204L60.4704 144.847L10.3162 130.304C2.72875 128.104 -1.64255 120.163 0.557503 112.575L30.2026 10.3364C32.4026 2.74895 40.3442 -1.62236 47.9316 0.577696Z" fill={LOGO_BLUE} />
      <path d="M120.52 162.24L71.13 147.92L78.55 122.31L141.68 140.61L138.24 152.47C136.04 160.06 128.1 164.43 120.51 162.23L120.52 162.24Z" fill={LOGO_LIME} />
      <path d="M108.737 18.2061L158.123 32.5259C165.711 34.726 170.082 42.6675 167.882 50.255L144.728 130.106L81.5986 111.801L108.737 18.2061Z" fill={LOGO_BLUE} />
    </svg>);

}
function Wordmark({ size = 22, color = QUADRA.navy }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.34 }}>
      <LogoMark size={size * 1.12} />
      <span className="q-word" style={{ fontSize: size * 1.18, color, lineHeight: 1, letterSpacing: '-.5px' }}>quadra</span>
    </span>);

}

// ── Buttons ──────────────────────────────────────────────────
function Btn({ children, kind = 'primary', icon, full, onClick, style = {}, disabled, flat }) {
  const [hover, setHover] = useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: 15,
    borderRadius: 18, padding: '16px 22px', border: 'none', cursor: 'pointer',
    width: full ? '100%' : undefined, boxSizing: 'border-box',
    transition: 'transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s, background .2s',
    transform: hover && !disabled ? 'translateY(-2px)' : 'none', WebkitTapHighlightColor: 'transparent'
  };
  const kinds = {
    primary: {
      background: `linear-gradient(120deg, ${QUADRA.navy}, ${QUADRA.blue})`, color: '#fff',
      boxShadow: hover ? `0 10px 30px rgba(26,26,255,.4)` : `0 4px 16px rgba(26,26,255,.28)`
    },
    grad: window.QSTYLE && window.QSTYLE.solidCTA ? {
      background: QUADRA.blue, color: '#fff',
      boxShadow: hover ? `0 10px 30px rgba(26,26,255,.4)` : `0 4px 16px rgba(26,26,255,.28)`
    } : {
      background: `linear-gradient(120deg, ${QUADRA.blue}, ${QUADRA.lime})`, color: '#fff',
      boxShadow: hover ? `0 10px 30px rgba(170,221,0,.45)` : `0 4px 16px rgba(170,221,0,.3)`
    },
    outline: {
      background: hover ? 'rgba(26,26,255,.06)' : 'transparent', color: QUADRA.blue,
      border: `2px solid ${QUADRA.blue}`, padding: '14px 22px'
    },
    outlineW: {
      background: hover ? 'rgba(255,255,255,.12)' : 'transparent', color: '#fff',
      border: '2px solid rgba(255,255,255,.85)', padding: '14px 22px'
    },
    ghost: { background: 'transparent', color: QUADRA.blue, fontWeight: 600, fontSize: 13, padding: '8px 10px', boxShadow: 'none' }
  };
  const dis = disabled ? { background: 'rgba(10,10,60,.08)', color: QUADRA.muted, boxShadow: 'none', cursor: 'default' } : {};
  const flatStyle = flat && !hover && !disabled ? { boxShadow: 'none' } : {};
  return (
    <button onClick={disabled ? undefined : onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    style={{ ...base, ...kinds[kind], ...dis, ...flatStyle, ...style }}>
      {icon && <Icon name={icon} size={18} stroke="currentColor" />}
      {children}
    </button>);

}

// ── Tag / pill ───────────────────────────────────────────────
function Tag({ children, bg = QUADRA.lime, color = QUADRA.navy, style = {} }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: bg, color,
      fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: 1,
      textTransform: 'uppercase', padding: '4px 9px', borderRadius: 20, lineHeight: 1.1, ...style }}>
      {children}
    </span>);

}

// ── Avatar (round frame, square photo, optional level badge) ──
// No colored stroke around the photo — the ONLY thing that changes
// color by level is the small badge ("bolinha") with the level number.
function Avatar({ player = {}, size = 48, badge = false }) {
  const [imgOk, setImgOk] = useState(true);
  const showImg = player.img && imgOk;
  const bSize = Math.max(16, Math.round(size * 0.36));
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', boxSizing: 'border-box',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(140deg, ${QUADRA.midNavy}, ${QUADRA.navy})`, color: '#fff',
        fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: size * 0.34, letterSpacing: .5 }}>
        {showImg ?
        <img src={player.img} alt={player.name || ''} draggable={false} onError={() => setImgOk(false)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> :
        player.initials || ''}
      </span>
      {badge && player.level != null &&
      <span style={{ position: 'absolute', bottom: -2, right: -2, minWidth: bSize, height: bSize, padding: '0 4px',
        borderRadius: bSize / 2, background: levelBg(player.level), color: levelText(player.level), border: '2px solid #fff', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"DM Sans",sans-serif', fontWeight: 800, fontSize: Math.max(9, bSize * 0.55), lineHeight: 1 }}>
          {player.level}</span>
      }
    </span>);

}

// ── Court image placeholder (on-brand: court lines + label) ──
function CourtImage({ tint = QUADRA.blue, height = 200, radius = 16, label = 'FOTO DA QUADRA', children }) {
  return (
    <div style={{ position: 'relative', height, borderRadius: radius, overflow: 'hidden',
      background: `linear-gradient(150deg, ${tint} 0%, ${QUADRA.navy} 115%)` }}>
      {/* court line motif */}
      <svg width="100%" height="100%" viewBox="0 0 170 200" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, opacity: .16 }}>
        <g stroke="#fff" strokeWidth="1.4" fill="none">
          <rect x="22" y="34" width="126" height="150" rx="2" />
          <line x1="22" y1="109" x2="148" y2="109" />
          <line x1="22" y1="72" x2="148" y2="72" strokeDasharray="5 6" />
          <line x1="22" y1="146" x2="148" y2="146" strokeDasharray="5 6" />
        </g>
      </svg>
      {/* dot grid texture */}
      <div style={{ position: 'absolute', inset: 0, opacity: .5,
        background: 'radial-gradient(rgba(255,255,255,.12) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
      <span className="q-mono" style={{ position: 'absolute', top: 10, right: 12, fontSize: 8.5,
        letterSpacing: 1.5, color: 'rgba(255,255,255,.55)' }}>{label}</span>
      {children}
    </div>);

}

// ── Decorative blobs ─────────────────────────────────────────
function Blob({ color, size = 240, style = {} }) {
  return <div style={{ position: 'absolute', width: size, height: size, borderRadius: '50%',
    background: color, filter: 'blur(60px)', opacity: .25, pointerEvents: 'none', ...style }} />;
}

// ── Card ─────────────────────────────────────────────────────
function Card({ children, dark, hover, onClick, style = {}, pad = 16 }) {
  const [h, setH] = useState(false);
  const lift = hover && h;
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ ...{ background: dark ? QUADRA.navy : '#fff', borderRadius: 20, padding: pad,
        color: dark ? '#fff' : QUADRA.text, boxSizing: 'border-box',
        boxShadow: dark ?
        lift ? '0 10px 28px rgba(0,0,0,.3)' : '0 4px 16px rgba(0,0,0,.2)' :
        lift ? '0 10px 26px rgba(10,10,60,.12)' : '0 2px 12px rgba(10,10,60,.06)',
        transform: lift ? 'translateY(-4px)' : 'none', cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .25s cubic-bezier(.4,0,.2,1), box-shadow .25s', ...style } }}>
      {children}
    </div>);

}

// ── Avatar stack (overlapping mini avatars + "+N") ──────────
function AvatarStack({ ids = [], more = 0, size = 28 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {ids.map((id, i) =>
      <span key={id} style={{ marginLeft: i === 0 ? 0 : -9, zIndex: ids.length - i,
        borderRadius: '50%', border: '2px solid #fff', display: 'inline-flex' }}>
          <Avatar player={PLAYERS[id]} size={size} ring={false} />
        </span>
      )}
      {more > 0 &&
      <span style={{ marginLeft: -9, zIndex: 0, width: size, height: size, borderRadius: '50%',
        border: '2px solid #fff', background: QUADRA.lightBg, color: QUADRA.blue,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: size * 0.36 }}>+{more}</span>
      }
    </div>);

}

Object.assign(window, { Icon, VolleyBall, JogarBall, BellIcon, LogoMark, Wordmark, Btn, Tag, Avatar, AvatarStack, CourtImage, Blob, Card });