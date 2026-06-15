// Quadra — Detalhe da partida + Criar partida. Loaded after screens-main.jsx.
var { useState, useEffect, useRef } = React;

// normalize a match-ish object coming from either UPCOMING or NEARBY
function norm(m = {}) {
  return {
    title: m.title || m.name || 'Partida',
    place: m.place || m.name || 'Arena Quadra',
    time: m.time || 'Hoje · 19h30',
    tint: m.tint || QUADRA.blue,
    level: m.level || 'Intermediário',
    mode: m.mode || '6x6',
    price: m.price || 'R$ 25',
    dist: m.dist || '1,2 km',
    spots: m.spots || `${m.players||6}/${m.cap||12}`,
    status: m.status || 'confirmado',
  };
}

// ════════════════════════════════════════════════════════════
// DETALHE DA PARTIDA
// ════════════════════════════════════════════════════════════
function DetailScreen({ match, back, go }) {
  const m = norm(match);
  const [joined, setJoined] = useState(false);
  const roster = ROSTER_A;
  const cap = parseInt(m.spots.split('/')[1]) || 12;

  const infoCell = (icon, label, val) => (
    <div style={{ display:'flex', gap:11, alignItems:'center' }}>
      <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:24, flexShrink:0 }}>
        <Icon name={icon} size={22} stroke={QUADRA.blue}/></span>
      <div style={{ minWidth:0 }}>
        <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11, color:QUADRA.muted, fontWeight:600,
          textTransform:'uppercase', letterSpacing:.8 }}>{label}</div>
        <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:14, color:QUADRA.navy, fontWeight:600,
          lineHeight:1.2 }}>{val}</div>
      </div>
    </div>
  );

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'#fff', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:SAFE_TOP, zIndex:8,
        background:`linear-gradient(180deg, rgba(10,10,60,.4), rgba(10,10,60,0))`, pointerEvents:'none' }}/>
      <div className="q-scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
        {/* hero */}
        <div style={{ position:'relative' }}>
          <CourtImage tint={m.tint} height={270} radius={0} label="FOTO DA QUADRA"/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, rgba(10,10,60,.35) 0%, transparent 30%, rgba(10,10,60,.55) 100%)' }}/>
          <div style={{ position:'absolute', top:SAFE_TOP-8, left:16, right:16, display:'flex', justifyContent:'space-between' }}>
            <IconBtn name="chevL" dark fill="rgba(10,10,60,.35)" onClick={back}/>
            <IconBtn name="share" dark fill="rgba(10,10,60,.35)"/>
          </div>
          <div style={{ position:'absolute', left:20, right:20, bottom:18 }}>
            <div style={{ display:'flex', gap:6, marginBottom:9 }}>
              <Tag bg="rgba(255,255,255,.92)" color={QUADRA.navy}>{m.mode}</Tag>
              <Tag bg={QUADRA.lime} color={QUADRA.navy}>{m.level}</Tag>
            </div>
            <h1 className="q-bebas" style={{ fontSize:24, color:'#fff', letterSpacing:1, margin:0, lineHeight:1 }}>{m.title}</h1>
            <div style={{ display:'flex', alignItems:'center', gap:5, color:'rgba(255,255,255,.85)', fontSize:13,
              fontFamily:'"DM Sans",sans-serif', marginTop:6 }}>
              <Icon name="pin" size={15} stroke="rgba(255,255,255,.85)"/>{m.place} · {m.dist}</div>
          </div>
        </div>

        {/* body sheet */}
        <div style={{ padding:'22px 20px 20px' }}>
          {/* info grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px 14px', marginBottom:22 }}>
            {infoCell('cal','Quando', m.time)}
            {infoCell('whistle','Modo', m.mode)}
            {infoCell('users','Vagas', m.spots)}
            {infoCell('bolt','Nível', m.level)}
          </div>

          {/* host */}
          <Card style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }} pad={14}>
            <Avatar player={PLAYERS.erica} size={46} badge/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12, color:QUADRA.muted, fontWeight:500 }}>Organizado por</div>
              <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:15, fontWeight:700, color:QUADRA.navy }}>{PLAYERS.erica.name}</div>
            </div>
            <Tag bg={QUADRA.lightBg} color={QUADRA.blue}>{PLAYERS.erica.pos}</Tag>
          </Card>

          {/* roster */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h2 className="q-bebas" style={{ fontSize:14, color:QUADRA.navy, letterSpacing:1, margin:0 }}>Confirmados</h2>
            <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13, fontWeight:700, color:QUADRA.blue }}>
              {roster.length + (joined?1:0)}/{cap}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px 6px', marginBottom:8 }}>
            {roster.map(p => (
              <div key={p.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <Avatar player={p} size={50} badge/>
                <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11, color:QUADRA.text, fontWeight:600,
                  maxWidth:62, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name.split(' ')[0]}</span>
              </div>
            ))}
            {joined && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <Avatar player={ME} size={50} badge/>
                <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11, color:QUADRA.blue, fontWeight:700 }}>Você</span>
              </div>
            )}
            {/* empty slots */}
            {Array.from({ length: Math.max(0, cap - roster.length - (joined?1:0)) }).slice(0,3).map((_,i)=>(
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                <span style={{ width:50, height:50, borderRadius:'50%', border:`2px dashed rgba(26,26,255,.25)`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="plus" size={18} stroke="rgba(26,26,255,.4)"/></span>
                <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11, color:QUADRA.muted }}>vaga</span>
              </div>
            ))}
          </div>
          {/* level legend — anel do avatar segue o nível */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 12px', marginTop:14, padding:'12px 0 0',
            borderTop:'1px solid rgba(10,10,60,.06)' }}>
            {LEVEL_TIERS.map(t=>(
              <span key={t.label} style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'"DM Sans",sans-serif',
                fontSize:11, color:QUADRA.muted }}>
                <span style={{ width:9, height:9, borderRadius:'50%', background:t.color }}/>{t.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* sticky action bar */}
      <div style={{ flexShrink:0, background:'#fff', borderTop:'1px solid rgba(10,10,60,.06)',
        padding:`14px 20px ${SAFE_BOTTOM+10}px`, boxShadow:'0 -4px 20px rgba(10,10,60,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div>
            <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11, color:QUADRA.muted, fontWeight:600 }}>Valor</div>
            <div className="q-num" style={{ fontSize:24, color:QUADRA.navy, letterSpacing:.5 }}>{m.price}</div>
          </div>
          {joined
            ? <Btn kind="primary" full icon="whistle" onClick={()=>go('game', match)} style={{ flex:1 }}>Iniciar partida</Btn>
            : <Btn kind="grad" full icon="check" onClick={()=>setJoined(true)} style={{ flex:1 }}>Confirmar presença</Btn>}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CRIAR PARTIDA
// ════════════════════════════════════════════════════════════
function CreateScreen({ back, go }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('6x6');
  const [level, setLevel] = useState('Intermediário');
  const [day, setDay] = useState('Hoje');
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);

  const Chip = ({ on, children, onClick }) => (
    <button onClick={onClick} style={{ border:'none', cursor:'pointer', flex:'0 0 auto',
      fontFamily:'"DM Sans",sans-serif', fontWeight:on?700:600, fontSize:13.5, padding:'11px 18px', borderRadius:14,
      background: on?QUADRA.blue:'#fff', color:on?'#fff':QUADRA.muted,
      boxShadow: on?'0 4px 14px rgba(26,26,255,.25)':'inset 0 0 0 1px rgba(26,26,255,.1)', transition:'all .2s' }}>{children}</button>
  );
  const FieldLabel = ({ children }) => (
    <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:11, color:QUADRA.navy,
      textTransform:'uppercase', letterSpacing:1.2, margin:'22px 0 10px' }}>{children}</div>
  );

  const header = (
    <Header title="CRIAR PARTIDA" left={<IconBtn name="chevL" onClick={back}/>}/>
  );

  if (done) {
    const createdMatch = {
      id: 'created', title: name || 'Sua partida', place: 'Arena Sky Beach',
      time: `${day} · 19h30`, mode, level, tint: QUADRA.blue, host: true, locked,
      roster: ['rafa', 'erica', 'caio', 'duda', 'manu', 'theo', 'bia', 'vini'], draw: 'manual',
    };
    return (
      <div style={{ height:'100%', position:'relative', overflow:'hidden',
        background:`linear-gradient(165deg, ${QUADRA.navy}, ${QUADRA.blue})`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, textAlign:'center' }}>
        <Blob color={QUADRA.lime} size={260} style={{ top:-40, right:-70 }}/>
        <div className="q-pop" style={{ width:96, height:96, borderRadius:'50%', background:QUADRA.lime,
          display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 12px 40px rgba(170,221,0,.45)' }}>
          <Icon name="check" size={48} stroke={QUADRA.navy} sw={3}/></div>
        <h1 className="q-bebas q-rise" style={{ fontSize:29, color:'#fff', letterSpacing:1, margin:'26px 0 0' }}>Partida criada!</h1>
        <p className="q-rise" style={{ fontFamily:'"DM Sans",sans-serif', fontSize:15, color:'rgba(255,255,255,.8)',
          marginTop:10, animationDelay:'.08s', maxWidth:260 }}>
          {name || 'Sua partida'} está no ar. Convide a galera e bora jogar!</p>
        <div style={{ marginTop:32, width:'100%', maxWidth:300, display:'flex', flexDirection:'column', gap:10 }}>
          <Btn kind="grad" full onClick={()=>go('manage', createdMatch)}>Ver a partida criada</Btn>
          <Btn kind="outlineW" full icon="share">Convidar jogadores</Btn>
          <Btn kind="outlineW" full onClick={()=>go('home')}>Voltar ao início</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:QUADRA.lightBg, overflow:'hidden' }}>
      {header}
      <div className="q-scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'8px 20px 24px' }}>
        <CourtImage tint={QUADRA.blue} height={120} radius={18} label="CAPA DA PARTIDA">
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Icon name="edit" size={18} stroke="rgba(255,255,255,.9)"/>
            <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13, fontWeight:600, color:'rgba(255,255,255,.9)' }}>Trocar capa</span>
          </div>
        </CourtImage>

        <FieldLabel>Nome da partida</FieldLabel>
        <input className="q-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Racha de Quinta"
          style={{ width:'100%', boxSizing:'border-box', padding:'15px 16px', borderRadius:18, border:'1px solid rgba(26,26,255,.1)',
            fontFamily:'"DM Sans",sans-serif', fontSize:15, color:QUADRA.text, background:'#fff', outline:'none' }}/>

        <FieldLabel>Local</FieldLabel>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)' }}>
            <Icon name="pin" size={18} stroke={QUADRA.blue}/></span>
          <input className="q-input" placeholder="Buscar quadra ou endereço"
            style={{ width:'100%', boxSizing:'border-box', padding:'15px 16px 15px 44px', borderRadius:18, border:'1px solid rgba(26,26,255,.1)',
              fontFamily:'"DM Sans",sans-serif', fontSize:15, color:QUADRA.text, background:'#fff', outline:'none' }}/>
        </div>

        <FieldLabel>Quando</FieldLabel>
        <div style={{ display:'flex', gap:8 }}>
          {['Hoje','Amanhã','Sex','Sáb'].map(d=> <Chip key={d} on={day===d} onClick={()=>setDay(d)}>{d}</Chip>)}
          <Chip on={false}>＋</Chip>
        </div>

        <FieldLabel>Formato</FieldLabel>
        <div style={{ display:'flex', gap:8 }}>
          {['2x2','4x4','6x6'].map(x=> <Chip key={x} on={mode===x} onClick={()=>setMode(x)}>{x}</Chip>)}
        </div>

        <FieldLabel>Nível</FieldLabel>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['Iniciante','Intermediário','Avançado'].map(x=> <Chip key={x} on={level===x} onClick={()=>setLevel(x)}>{x}</Chip>)}
        </div>

        <FieldLabel>Vagas & valor</FieldLabel>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1, background:'#fff', borderRadius:18, border:'1px solid rgba(26,26,255,.1)', padding:'12px 16px' }}>
            <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11, color:QUADRA.muted }}>Jogadores</div>
            <div className="q-num" style={{ fontSize:20, color:QUADRA.navy }}>12</div>
          </div>
          <div style={{ flex:1, background:'#fff', borderRadius:18, border:'1px solid rgba(26,26,255,.1)', padding:'12px 16px' }}>
            <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11, color:QUADRA.muted }}>Valor / pessoa</div>
            <div className="q-num" style={{ fontSize:20, color:QUADRA.navy }}>R$ 25</div>
          </div>
        </div>

        <FieldLabel>Privacidade</FieldLabel>
        <button onClick={()=>setLocked(v=>!v)} style={{ width:'100%', display:'flex', alignItems:'center', gap:13,
          padding:'14px 16px', borderRadius:18, cursor:'pointer', textAlign:'left', WebkitTapHighlightColor:'transparent',
          background:'#fff', transition:'all .2s',
          border: locked ? `1.5px solid ${QUADRA.blue}` : '1px solid rgba(26,26,255,.1)' }}>
          <span style={{ width:42, height:42, borderRadius:13, flexShrink:0, transition:'background .2s',
            background: locked ? QUADRA.blue : 'rgba(26,26,255,.08)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="lock" size={20} stroke={locked ? '#fff' : QUADRA.blue}/></span>
          <span style={{ flex:1, minWidth:0 }}>
            <span style={{ display:'block', fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:14.5, color:QUADRA.navy }}>
              {locked ? 'Partida fechada' : 'Partida aberta'}</span>
            <span style={{ display:'block', fontFamily:'"DM Sans",sans-serif', fontSize:12, color:QUADRA.muted, marginTop:1 }}>
              {locked ? 'Só quem você convidar pode entrar' : 'Qualquer um pode entrar nas vagas'}</span>
          </span>
          <span style={{ width:46, height:28, borderRadius:20, flexShrink:0, position:'relative', transition:'background .2s',
            background: locked ? QUADRA.blue : 'rgba(10,10,60,.14)' }}>
            <span style={{ position:'absolute', top:3, left: locked ? 21 : 3, width:22, height:22, borderRadius:'50%',
              background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.25)', transition:'left .2s' }}/></span>
        </button>
      </div>

      <div style={{ flexShrink:0, background:'#fff', borderTop:'1px solid rgba(10,10,60,.06)',
        padding:`14px 20px ${SAFE_BOTTOM+10}px` }}>
        <Btn kind="grad" full onClick={()=>setDone(true)}>Criar partida</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { DetailScreen, CreateScreen });
