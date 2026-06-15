// Quadra — Fim de partida: anotar estatísticas (você) + seleção de MVP.
// Fundo escuro, mesma linguagem da tela de sets (GameScreen).
// Loaded after screens-game.jsx, before app.jsx.
var { useState, useEffect, useRef } = React;

// Stats de cada jogador na partida — determinístico por id (mock estável).
function genGameStats(p) {
  let s = 0;for (const ch of p.id || 'x') s += ch.charCodeAt(0);
  const r = (n, mod) => (s * 9301 + 49297 + n * 7919) % 7919 % mod;
  const base = Math.round((p.level || 10) / 3);
  return { pts: 7 + base + r(1, 13), blk: 1 + r(2, 6), def: 3 + r(3, 9), ace: r(4, 5) };
}

// 4 categorias anotáveis + cor/ícone
const STAT_DEFS = [
{ key: 'pts', label: 'Pontos', icon: 'volley', color: '#1A1AFF' },
{ key: 'blk', label: 'Blocks', icon: 'net', color: '#00B4D8' },
{ key: 'def', label: 'Defesas', icon: 'lock', color: '#6B1AFF' },
{ key: 'ace', label: 'Aces', icon: 'bolt', color: '#AADD00' }];


// — glifo de menos (não existe no set de Icon) —
function Minus({ color = '#fff', w = 14 }) {
  return <span style={{ width: w, height: 2.6, borderRadius: 2, background: color, display: 'block' }} />;
}

// Stepper redondo
function StepBtn({ kind, onClick, disabled, accent }) {
  const [h, setH] = useState(false);
  const isPlus = kind === 'plus';
  return (
    <button onClick={disabled ? undefined : onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    aria-label={isPlus ? 'Adicionar' : 'Remover'}
    style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, cursor: disabled ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent',
      border: isPlus ? 'none' : '1px solid rgba(255,255,255,.14)',
      background: isPlus ? (disabled ? 'rgba(255,255,255,.06)' : QUADRA.lime) : 'transparent',
      boxShadow: isPlus && !disabled && h ? `0 6px 16px ${QUADRA.lime}66` : 'none',
      transform: h && !disabled ? 'translateY(-1px)' : 'none', transition: 'transform .15s, box-shadow .15s, background .15s' }}>
      {isPlus ?
      <Icon name="plus" size={18} stroke={disabled ? 'rgba(255,255,255,.25)' : QUADRA.navy} sw={3} /> :
      <Minus color={disabled ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.55)'} />}
    </button>);

}

// ════════════════════════════════════════════════════════════
// FIM DE PARTIDA · ANOTAR SUAS ESTATÍSTICAS
// ════════════════════════════════════════════════════════════
function MatchEndScreen({ match, back, go }) {
  const name = match ? match.name || match.title : 'Partida';
  const [st, setSt] = useState({ pts: 0, blk: 0, def: 0, ace: 0 });
  const bump = (k, d) => setSt((s) => ({ ...s, [k]: Math.max(0, s[k] + d) }));

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      background: `linear-gradient(180deg, #08083a 0%, ${QUADRA.navy} 100%)` }}>
      <Blob color={QUADRA.blue} size={260} style={{ top: -30, left: -100, opacity: .2 }} />
      <Blob color={QUADRA.lime} size={220} style={{ bottom: 60, right: -90, opacity: .13 }} />

      {/* header */}
      <div style={{ paddingTop: SAFE_TOP, flexShrink: 0, position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 18px 8px' }}>
          <IconBtn name="chevL" dark fill="rgba(255,255,255,.1)" onClick={back} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span className="q-mono" style={{ fontSize: 10, letterSpacing: 1.6, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase' }}>
              Fim de jogo</span>
            <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 14, color: '#fff' }}>{name}</span>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="q-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 2,
        padding: '8px 22px 16px' }}>
        {/* você */}
        <div className="q-rise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
          <span style={{ borderRadius: '50%', border: `3px solid ${QUADRA.brightLime}`, padding: 3, display: 'inline-flex' }}>
            <Avatar player={ME} size={88} badge /></span>
          <h1 className="q-bebas" style={{ fontSize: 26, color: '#fff', letterSpacing: .8, margin: '14px 0 0', lineHeight: 1 }}>
            {ME.name}</h1>
          <div style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 13, color: QUADRA.brightLime, fontWeight: 600, marginTop: 6 }}>
            {ME.nick} · {ME.pos}</div>
          <p style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 13.5, lineHeight: 1.45, color: 'rgba(255,255,255,.6)',
            margin: '12px 0 0', maxWidth: 250 }}>
            Anote o que você fez nessa partida. Isso conta pro seu ranking.</p>
        </div>

        {/* anotações */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {STAT_DEFS.map((d) =>
          <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 18,
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
              <span style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', background: 'rgba(255,255,255,.06)' }}>
                <Icon name={d.icon} size={23} stroke="#fff" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>{d.label}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StepBtn kind="minus" disabled={st[d.key] === 0} onClick={() => bump(d.key, -1)} />
                <span className="q-num" style={{ fontSize: 24, color: '#fff', minWidth: 34, textAlign: 'center' }}>{st[d.key]}</span>
                <StepBtn kind="plus" accent={d.color} onClick={() => bump(d.key, 1)} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* confirmar */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 3, background: 'rgba(255,255,255,.05)',
        borderTop: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(8px)',
        padding: `14px 22px ${SAFE_BOTTOM + 12}px` }}>
        <Btn kind="grad" full icon="check" onClick={() => go('mvp', { name, myStats: st })}>Confirmar estatísticas</Btn>
      </div>
    </div>);

}

// ════════════════════════════════════════════════════════════
// SELEÇÃO DE MVP
// ════════════════════════════════════════════════════════════
function MVPScreen({ match, back, go }) {
  const name = match ? match.name || match.title : 'Partida';
  const [pick, setPick] = useState(null);
  const [done, setDone] = useState(false);

  // você fixo em 1º (não votável) + demais participantes
  const me = { ...ME, ...(match && match.myStats ? match.myStats : genGameStats(ME)), isMe: true };
  const others = [...ROSTER_A, ...ROSTER_B].
  filter((p) => p.id !== ME.id).
  map((p) => ({ ...p, ...genGameStats(p) }));
  const list = [me, ...others];
  const mvp = list.find((p) => p.id === pick);

  const StatChips = ({ p }) =>
  <div style={{ display: 'flex', gap: 7, marginTop: 7, flexWrap: 'wrap' }}>
      {STAT_DEFS.map((d) =>
    <span key={d.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 9,
      background: 'rgba(255,255,255,.08)' }}>
          <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 800, fontSize: 9, letterSpacing: .6,
        color: d.color, textTransform: 'uppercase' }}>{d.label.slice(0, 3)}</span>
          <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 12.5, color: '#fff', lineHeight: 1 }}>{p[d.key]}</span>
        </span>
    )}
    </div>;


  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      background: `linear-gradient(180deg, #08083a 0%, ${QUADRA.navy} 100%)` }}>
      <Blob color={QUADRA.lime} size={240} style={{ top: -40, right: -90, opacity: .16 }} />
      <Blob color={QUADRA.blue} size={240} style={{ bottom: 80, left: -100, opacity: .18 }} />

      {/* header */}
      <div style={{ paddingTop: SAFE_TOP, flexShrink: 0, position: 'relative', zIndex: 3, padding: `${SAFE_TOP}px 22px 4px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconBtn name="chevL" dark fill="rgba(255,255,255,.1)" onClick={back} />
          <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,.85)' }}>Resultado da partida</span>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="trophy" size={18} stroke={QUADRA.brightLime} />
            <span className="q-mono" style={{ fontSize: 11, letterSpacing: 1.8, color: QUADRA.brightLime, textTransform: 'uppercase' }}>
              MVP da partida</span>
          </div>
          <h1 className="q-bebas" style={{ fontSize: 30, color: '#fff', letterSpacing: .8, margin: '8px 0 0', lineHeight: 1 }}>
            Quem brilhou?</h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, padding: '7px 14px', borderRadius: 20,
            background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)' }}>
            <Icon name="volley" size={14} stroke={QUADRA.brightLime} />
            <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 13, color: '#fff' }}>{name}</span>
          </div>
        </div>
      </div>

      {/* lista */}
      <div className="q-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 2,
        padding: '16px 22px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((p) => {
          const on = pick === p.id;
          if (p.isMe) {
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '14px 16px', borderRadius: 18,
                background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.18)' }}>
                <Avatar player={p} size={48} badge />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 15, color: '#fff',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    <Tag bg="rgba(198,241,53,.16)" color={QUADRA.brightLime} style={{ fontSize: 9, flexShrink: 0 }}>Você</Tag>
                  </div>
                  <StatChips p={p} />
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginTop: 2 }}>
                  <Icon name="lock" size={15} stroke="rgba(255,255,255,.4)" />
                </span>
              </div>);

          }
          return (
            <button key={p.id} onClick={() => setPick(on ? null : p.id)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 13, padding: '14px 16px', borderRadius: 18, cursor: 'pointer',
              textAlign: 'left', WebkitTapHighlightColor: 'transparent', transition: 'all .18s',
              background: on ? 'rgba(198,241,53,.12)' : 'rgba(255,255,255,.06)',
              border: on ? `1.5px solid ${QUADRA.brightLime}` : '1.5px solid rgba(255,255,255,.08)',
              transform: on ? 'translateY(-1px)' : 'none' }}>
              <Avatar player={p} size={48} badge />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>{p.name}</div>
                <div style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginTop: 1 }}>{p.nick} · {p.pos}</div>
                <StatChips p={p} />
              </div>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', marginTop: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: on ? QUADRA.brightLime : 'transparent',
                border: on ? 'none' : '2px solid rgba(255,255,255,.25)' }}>
                {on && <Icon name="check" size={14} stroke={QUADRA.navy} sw={3} />}
              </span>
            </button>);

        })}
      </div>

      {/* confirmar */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 3, background: 'rgba(255,255,255,.05)',
        borderTop: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(8px)',
        padding: `14px 22px ${SAFE_BOTTOM + 12}px` }}>
        <Btn kind="grad" full disabled={!pick} onClick={() => setDone(true)}>
          {pick
            ? <span>Confirmar <span className="q-bebas" style={{ fontSize: 17, letterSpacing: .5 }}>MVP</span> · {mvp.name.split(' ')[0]}</span>
            : <span>Selecione o <span className="q-bebas" style={{ fontSize: 17, letterSpacing: .5 }}>MVP</span></span>}</Btn>
      </div>

      {/* confirmação */}
      {done && mvp &&
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 36px',
        background: 'rgba(6,6,31,.78)', backdropFilter: 'blur(8px)' }}>
          <div className="q-pop" style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', inset: -10, borderRadius: '50%',
            background: `radial-gradient(circle, ${QUADRA.brightLime}55, transparent 70%)` }} />
            <span style={{ position: 'relative', borderRadius: '50%', border: `3px solid ${QUADRA.brightLime}`, padding: 4, display: 'inline-flex' }}>
              <Avatar player={mvp} size={104} badge /></span>
            <span style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 40, height: 40,
            borderRadius: '50%', background: QUADRA.brightLime, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid #06061f' }}>
              <Icon name="trophy" size={20} stroke={QUADRA.navy} /></span>
          </div>
          <div className="q-mono q-rise" style={{ fontSize: 11, letterSpacing: 2, color: QUADRA.brightLime, textTransform: 'uppercase', marginTop: 24 }}>
            MVP da partida</div>
          <h1 className="q-bebas q-rise" style={{ fontSize: 34, color: '#fff', letterSpacing: 1, margin: '8px 0 0', lineHeight: 1, animationDelay: '.05s' }}>
            {mvp.name}</h1>
          <p className="q-rise" style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 14, color: 'rgba(255,255,255,.7)',
          margin: '10px 0 0', animationDelay: '.1s' }}>
            Seu voto foi registrado. Valeu por jogar!</p>
          <div className="q-rise" style={{ width: '100%', maxWidth: 280, marginTop: 30, animationDelay: '.16s' }}>
            <Btn kind="grad" full icon="home" onClick={() => go('home')}>Voltar ao início</Btn>
          </div>
        </div>
      }
    </div>);

}

Object.assign(window, { MatchEndScreen, MVPScreen, genGameStats });