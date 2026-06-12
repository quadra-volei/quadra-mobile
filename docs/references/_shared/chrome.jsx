// Quadra — app chrome: ScreenShell, Header, BottomNav. Loaded after ui.jsx.
var { useState, useEffect, useRef } = React;

// Top safe-area height (status bar / island)

const SAFE_TOP = 56;
const SAFE_BOTTOM = 26;

// ── Header ───────────────────────────────────────────────────
function Header({ left, title, right, dark, transparent }) {
  const txt = dark ? '#fff' : QUADRA.navy;
  const glass = !dark && !transparent;
  return (
    <div style={{ paddingTop: SAFE_TOP, flexShrink: 0, position: 'relative', zIndex: 6,
      background: transparent ? 'transparent' : dark ? 'transparent' : 'rgba(255,255,255,.55)',
      backdropFilter: glass ? 'saturate(160%) blur(22px)' : undefined,
      WebkitBackdropFilter: glass ? 'saturate(160%) blur(22px)' : undefined,
      borderBottom: transparent || dark ? 'none' : '1px solid rgba(255,255,255,.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '14px 20px 16px', minHeight: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {left}
          {title && <div className="q-bebas" style={{ ...{ fontSize: 18, color: txt, letterSpacing: 1, whiteSpace: 'nowrap' }, color: dark ? '#fff' : "rgb(44, 44, 73)" }}>{title}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
      </div>
    </div>);

}

// round icon button used in headers
function IconBtn({ name, onClick, dark, badge, fill }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ position: 'relative', width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: fill || (dark ? 'rgba(255,255,255,.12)' : QUADRA.lightBg),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: h ? 'translateY(-1px)' : 'none', transition: 'transform .2s, background .2s',
      WebkitTapHighlightColor: 'transparent' }}>
      <Icon name={name} size={21} stroke={dark ? '#fff' : QUADRA.blue} />
      {badge && <span style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: '50%',
        background: QUADRA.lime, border: `2px solid ${dark ? QUADRA.navy : '#fff'}` }} />}
    </button>);

}

// ── Bottom navigation ────────────────────────────────────────
function NotifBell({ dark }) {
  const [alert, setAlert] = useState(false);
  const [h, setH] = useState(false);
  return (
    <button onClick={() => setAlert((a) => !a)} aria-label="Notificações"
    onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: h ? 'translateY(-1px)' : 'none', transition: 'transform .2s',
      WebkitTapHighlightColor: 'transparent' }}>
      <BellIcon size={21} alert={alert} color={dark ? '#fff' : '#0032D1'} />
    </button>);

}

// header right cluster: notifications + settings gear
function HeaderRight({ go, dark }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <NotifBell dark={dark} />
      <button onClick={() => go && go('settings')} aria-label="Configurações"
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: h ? 'translateY(-1px)' : 'none', transition: 'transform .2s',
          WebkitTapHighlightColor: 'transparent' }}>
        <Icon name="settings" size={21} stroke={dark ? '#fff' : '#0032D1'} />
      </button>
    </div>);

}

function FabButton({ onCreate }) {
  const [burst, setBurst] = useState(0);
  const [h, setH] = useState(false);
  const handle = () => {setBurst((b) => b + 1);onCreate && onCreate();};
  return (
    <button onClick={handle} aria-label="Jogar"
    onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ border: 'none', cursor: 'pointer', background: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 0, marginTop: -30,
      WebkitTapHighlightColor: 'transparent' }}>
      {/* hover = bounce (quique); click = same pop as the other nav icons */}
      <span className={h ? 'q-fabbounce' : ''} style={{ display: 'flex' }}>
        <span key={burst} className={burst ? 'q-fabnavpop' : ''} style={{ position: 'relative', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, width: 66, height: 66, borderRadius: '50%',
          background: 'linear-gradient(180deg, #0032D1 0%, #ACEA00 100%)', transition: 'box-shadow .28s ease',
          boxShadow: h ? '0 6px 20px rgba(172,234,0,.5), 0 0 16px rgba(0,50,209,.45)' : 'none' }}>
          <span style={{ display: 'flex' }}>
            <JogarBall size={26} />
          </span>
          <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 9.5, color: '#EBF1FF', lineHeight: 1, marginTop: 1 }}>Jogar</span>
        </span>
      </span>
    </button>);

}

function BottomNav({ active, go, onCreate }) {
  const items = [
  { key: 'home', icon: 'home', label: 'Início' },
  { key: 'explore', icon: 'explore', label: 'Explorar' },
  { key: '__fab' },
  { key: 'rede', icon: 'rede', label: 'Rede' },
  { key: 'profile', icon: 'perfil', label: 'Perfil' }];

  return (
    <div style={{ flexShrink: 0, position: 'relative', zIndex: 7,
      background: 'rgba(255,255,255,.80)', backdropFilter: 'saturate(160%) blur(22.8px)', WebkitBackdropFilter: 'saturate(160%) blur(22.8px)',
      boxShadow: '0 -2px 18px rgba(10,10,60,.06)', borderTop: '1px solid rgba(255,255,255,.4)',
      paddingBottom: SAFE_BOTTOM }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
        padding: '9px 14px 6px', minHeight: 60 }}>
        {items.map((it) => {
          if (it.key === '__fab') return <FabButton key="fab" onCreate={onCreate} />;
          const on = active === it.key;
          return (
            <button key={it.key} onClick={() => go(it.key)} style={{ border: 'none', background: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1, padding: 0,
              WebkitTapHighlightColor: 'transparent' }}>
              {/* key flips on activation → re-mounts → pop animation runs each time the tab turns active */}
              <img key={on ? it.key + '-on' : it.key} src={`icons/${it.icon}${on ? '-active' : ''}.svg`} alt={it.label}
              className={on ? 'q-navpop' : ''}
              style={{ width: 23, height: 23, display: 'block' }} />
              <span style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 10, fontWeight: on ? 700 : 500,
                color: on ? QUADRA.navy : '#A6A6BC', transition: 'color .25s, font-weight .25s' }}>{it.label}</span>
            </button>);

        })}
      </div>
    </div>);

}

// ── Screen shell ─────────────────────────────────────────────
// header: JSX | null, children scroll, nav: show bottom nav, navProps
// On nav screens the header + bottom nav are translucent (glassmorphism)
// and overlay the scroll area, so content blurs as it passes beneath them.
function ScreenShell({ header, children, bg = QUADRA.lightBg, nav, navProps, scrollRef, padBody = true, topScrim }) {
  const headRef = useRef(null),navRef = useRef(null);
  const [pads, setPads] = useState({ top: 118, bottom: 90 });
  React.useLayoutEffect(() => {
    const t = headRef.current ? headRef.current.offsetHeight : pads.top;
    const b = navRef.current ? navRef.current.offsetHeight : pads.bottom;
    setPads((p) => p.top === t && p.bottom === b ? p : { top: t, bottom: b });
  });

  if (nav) {
    return (
      <div style={{ height: '100%', position: 'relative', overflow: 'hidden', background: bg }}>
        {topScrim && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SAFE_TOP, zIndex: 8,
          background: topScrim, pointerEvents: 'none' }} />}
        <div ref={scrollRef} className="q-scroll" style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
          paddingTop: pads.top + (padBody ? 14 : 0), paddingBottom: pads.bottom + (padBody ? 14 : 0),
          paddingLeft: padBody ? 20 : 0, paddingRight: padBody ? 20 : 0 }}>
          {children}
        </div>
        <div ref={headRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 6 }}>{header}</div>
        <div ref={navRef} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 7 }}>
          <BottomNav {...navProps} />
        </div>
      </div>);

  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: bg, position: 'relative', overflow: 'hidden' }}>
      {topScrim && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SAFE_TOP, zIndex: 8,
        background: topScrim, pointerEvents: 'none' }} />}
      {header}
      <div ref={scrollRef} className="q-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative',
        padding: padBody ? '18px 20px 28px' : 0 }}>
        {children}
      </div>
    </div>);

}

// section title
function SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
      <h2 className="q-bebas" style={{ fontSize: 14, color: QUADRA.navy, letterSpacing: .6, lineHeight: 1,
        whiteSpace: 'nowrap', flexShrink: 0, padding: "0px", margin: "0px" }}>{children}</h2>
      {action && <button onClick={onAction} style={{ border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0,
        fontFamily: '"DM Sans",sans-serif', fontWeight: 600, fontSize: 13, color: QUADRA.blue }}>{action}</button>}
    </div>);

}

Object.assign(window, { SAFE_TOP, SAFE_BOTTOM, Header, IconBtn, NotifBell, HeaderRight, BottomNav, ScreenShell, SectionTitle });