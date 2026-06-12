// Quadra — Configurações (hub) + Editar perfil. Loaded after screens-profile.jsx.
// Linguagem clara (lightBg), grupos de linhas em cards brancos.
var { useState, useEffect, useRef } = React;

// ── Header simples de subtela (chevron + título) ─────────────
function SubHeader({ title, back, right }) {
  return (
    <Header
      title={title}
      left={<IconBtn name="chevL" onClick={back}/>}
      right={right}
    />
  );
}

// ── Rótulo de grupo ──────────────────────────────────────────
function SettGroup({ children, style = {} }) {
  return (
    <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:11, letterSpacing:1.4,
      textTransform:'uppercase', color:QUADRA.muted, margin:'0 6px 9px', ...style }}>{children}</div>
  );
}

// ── Linha de configuração (ícone + label + valor/chevron) ────
function SettRow({ icon, iconColor = QUADRA.blue, label, sub, value, badge, onClick, danger, last }) {
  const [h, setH] = useState(false);
  const tint = danger ? '#E0344B' : iconColor;
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 14px',
        border:'none', background: h ? 'rgba(26,26,255,.035)' : 'transparent', cursor:'pointer',
        textAlign:'left', WebkitTapHighlightColor:'transparent', borderRadius: 14,
        transition:'background .15s' }}>
      <span style={{ width:26, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name={icon} size={22} stroke={danger ? '#E0344B' : QUADRA.navy}/></span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:600, fontSize:15,
          color: danger ? '#E0344B' : QUADRA.navy, lineHeight:1.2 }}>{label}</div>
        {sub && <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12, color:QUADRA.muted, marginTop:2,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sub}</div>}
      </div>
      {badge && <Tag bg={QUADRA.lime} color={QUADRA.navy} style={{ fontSize:9, flexShrink:0 }}>{badge}</Tag>}
      {value && <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13.5, color:QUADRA.muted, flexShrink:0 }}>{value}</span>}
      {!danger && <Icon name="chevR" size={18} stroke="rgba(10,10,60,.28)"/>}
    </button>
  );
}

// ── Linha com toggle ─────────────────────────────────────────
function ToggleRow({ icon, iconColor = QUADRA.blue, label, sub, value, onChange }) {
  return (
    <div style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 14px' }}>
      {icon && <span style={{ width:26, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon name={icon} size={22} stroke={QUADRA.navy}/></span>}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:600, fontSize:15, color:QUADRA.navy, lineHeight:1.2 }}>{label}</div>
        {sub && <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12, color:QUADRA.muted, marginTop:2 }}>{sub}</div>}
      </div>
      <Switch value={value} onChange={onChange}/>
    </div>
  );
}

// ── Switch (interruptor) on-brand ────────────────────────────
function Switch({ value, onChange }) {
  return (
    <button onClick={()=>onChange(!value)} aria-checked={value} role="switch"
      style={{ position:'relative', width:46, height:28, borderRadius:16, border:'none', flexShrink:0, cursor:'pointer',
        background: value ? QUADRA.blue : 'rgba(10,10,60,.16)', transition:'background .2s', padding:0,
        WebkitTapHighlightColor:'transparent' }}>
      <span style={{ position:'absolute', top:3, left:3, width:22, height:22, borderRadius:'50%', background:'#fff',
        boxShadow:'0 2px 5px rgba(10,10,60,.25)', transform: value ? 'translateX(18px)' : 'none',
        transition:'transform .2s cubic-bezier(.3,.7,.4,1)' }}/>
    </button>
  );
}

// Wrap de grupo (card branco contendo linhas com divisórias)
function SettCard({ children, style = {} }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <Card pad={4} style={{ marginBottom:22, ...style }}>
      {items.map((el, i) => (
        <React.Fragment key={i}>
          {i>0 && <div style={{ height:1, background:'rgba(10,10,60,.06)', margin:'0 14px' }}/>}
          {el}
        </React.Fragment>
      ))}
    </Card>
  );
}

// ════════════════════════════════════════════════════════════
// CONFIGURAÇÕES · HUB
// ════════════════════════════════════════════════════════════
function SettingsScreen({ go, back }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('quadra-theme') || 'claro');
  const pickTheme = (t) => { setTheme(t); try { localStorage.setItem('quadra-theme', t); } catch(e){} };

  const themeTiles = [
    { key:'claro',     label:'Claro',      bg:'#EFF3FC', card:'#fff',     ink:'#0A0A3C' },
    { key:'escuro',    label:'Escuro',     bg:'#0A0A3C', card:'#191951',  ink:'#fff'    },
    { key:'automatico',label:'Automático', bg:'linear-gradient(120deg,#EFF3FC 50%,#0A0A3C 50%)', card:'transparent', ink:QUADRA.muted, split:true },
  ];

  const header = <SubHeader title="CONFIGURAÇÕES" back={back}/>;

  return (
    <ScreenShell header={header}>
      {/* identidade compacta */}
      <Card style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }} pad={14}>
        <Avatar player={ME} size={56} badge/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:17, color:QUADRA.navy, lineHeight:1.1 }}>{ME.name}</div>
          <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:13, color:QUADRA.muted, marginTop:2 }}>{ME.nick} · {ME.pos}</div>
        </div>
      </Card>

      {/* CONTA */}
      <SettGroup>Conta</SettGroup>
      <SettCard>
        <SettRow icon="user"  label="Editar perfil" sub="Nome, nascimento, telefone" onClick={()=>go('editProfile')}/>
        <SettRow icon="star"  iconColor="#E8A317" label="Pagamentos e Premium" sub="Assinatura, formas de pagamento"
          badge="PRO" onClick={()=>go('payments')}/>
      </SettCard>

      {/* PREFERÊNCIAS */}
      <SettGroup>Preferências</SettGroup>
      <Card pad={16} style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <span style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:600, fontSize:15, color:QUADRA.navy }}>Aparência</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {themeTiles.map(t => {
            const on = theme === t.key;
            return (
              <button key={t.key} onClick={()=>pickTheme(t.key)} style={{ flex:1, border:'none', background:'none', cursor:'pointer',
                padding:0, WebkitTapHighlightColor:'transparent' }}>
                <div style={{ height:64, borderRadius:14, background:t.bg, position:'relative', overflow:'hidden',
                  boxShadow: on ? `0 0 0 2.5px ${QUADRA.blue}` : 'inset 0 0 0 1px rgba(10,10,60,.1)',
                  transition:'box-shadow .18s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {!t.split && <div style={{ width:'62%', height:26, borderRadius:7, background:t.card,
                    boxShadow:'0 1px 4px rgba(0,0,0,.15)' }}/>}
                  {on && <span style={{ position:'absolute', top:6, right:6, width:18, height:18, borderRadius:'50%',
                    background:QUADRA.blue, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon name="check" size={11} stroke="#fff" sw={3}/></span>}
                </div>
                <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight: on?700:500, fontSize:12.5,
                  color: on?QUADRA.navy:QUADRA.muted, textAlign:'center', marginTop:8 }}>{t.label}</div>
              </button>
            );
          })}
        </div>
      </Card>
      <SettCard>
        <SettRow icon="bell"     label="Notificações" sub="Convites, lembretes, ranking" onClick={()=>go('notifSettings')}/>
        <SettRow icon="settings" iconColor="#6B1AFF" label="Permissões do app" sub="Localização, câmera, contatos" onClick={()=>go('permissions')}/>
      </SettCard>

      {/* SUPORTE */}
      <SettGroup>Suporte</SettGroup>
      <SettCard>
        <SettRow icon="chat"   iconColor="#00B4D8" label="Enviar feedback" sub="Sugestões, problemas e elogios" onClick={()=>go('feedback')}/>
        <SettRow icon="volley" label="Sobre o Quadra" value="v2.4.0" onClick={()=>{}}/>
      </SettCard>

      {/* sair */}
      <SettCard>
        <SettRow icon="chevL" label="Sair da conta" danger onClick={()=>go('login')}/>
      </SettCard>

      <div style={{ height:6 }}/>
    </ScreenShell>
  );
}

// ════════════════════════════════════════════════════════════
// EDITAR PERFIL
// ════════════════════════════════════════════════════════════
function EditProfileScreen({ back }) {
  const [first, setFirst]   = useState(ME.name.split(' ')[0]);
  const [last, setLast]     = useState(ME.name.split(' ').slice(1).join(' '));
  const [nick, setNick]     = useState(ME.nick.replace('@',''));
  const [birth, setBirth]   = useState('1998-03-14');
  const [phone, setPhone]   = useState('(11) 98472-1130');
  const [pos, setPos]       = useState(ME.pos);
  const [saved, setSaved]   = useState(false);

  const POSITIONS = ['Levantador','Oposto','Ponteiro','Central','Líbero','Coringa'];

  const fieldBox = { width:'100%', boxSizing:'border-box', padding:'15px 16px', borderRadius:16,
    border:'1px solid rgba(26,26,255,.12)', fontFamily:'"DM Sans",sans-serif', fontSize:15,
    color:QUADRA.text, background:'#fff', outline:'none' };

  const Label = ({ children }) => (
    <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:11, color:QUADRA.navy,
      textTransform:'uppercase', letterSpacing:1.1, margin:'0 0 8px' }}>{children}</div>
  );

  const header = <SubHeader title="EDITAR PERFIL" back={back}/>;

  return (
    <ScreenShell header={header}>
      {/* foto */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:24 }}>
        <div style={{ position:'relative', display:'inline-block' }}>
          <Avatar player={ME} size={96}/>
          <span style={{ position:'absolute', bottom:-2, right:-2, width:34, height:34, borderRadius:'50%',
            background:QUADRA.blue, border:'3px solid #fff', display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer' }}>
            <Icon name="edit" size={16} stroke="#fff"/></span>
        </div>
        <button style={{ marginTop:12, border:'none', background:'none', cursor:'pointer',
          fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:13.5, color:QUADRA.blue }}>Trocar foto</button>
      </div>

      {/* nome + sobrenome */}
      <div style={{ display:'flex', gap:12, marginBottom:18 }}>
        <div style={{ flex:1 }}>
          <Label>Nome</Label>
          <input className="q-input" value={first} onChange={e=>setFirst(e.target.value)} style={fieldBox}/>
        </div>
        <div style={{ flex:1 }}>
          <Label>Sobrenome</Label>
          <input className="q-input" value={last} onChange={e=>setLast(e.target.value)} style={fieldBox}/>
        </div>
      </div>

      {/* apelido */}
      <div style={{ marginBottom:18 }}>
        <Label>Apelido</Label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
            fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:15, color:QUADRA.muted }}>@</span>
          <input className="q-input" value={nick} onChange={e=>setNick(e.target.value.replace(/\s/g,''))}
            style={{ ...fieldBox, paddingLeft:34 }}/>
        </div>
      </div>

      {/* data de nascimento */}
      <div style={{ marginBottom:18 }}>
        <Label>Data de nascimento</Label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
            <Icon name="cal" size={18} stroke={QUADRA.blue}/></span>
          <input className="q-input" type="date" value={birth} onChange={e=>setBirth(e.target.value)}
            style={{ ...fieldBox, paddingLeft:46 }}/>
        </div>
      </div>

      {/* telefone */}
      <div style={{ marginBottom:18 }}>
        <Label>Número de telefone</Label>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
            fontFamily:'"DM Sans",sans-serif', fontWeight:600, fontSize:14, color:QUADRA.muted }}>🇧🇷</span>
          <input className="q-input" type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
            style={{ ...fieldBox, paddingLeft:44 }}/>
        </div>
      </div>

      {/* posição (já existe no app) */}
      <div style={{ marginBottom:26 }}>
        <Label>Posição em quadra</Label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {POSITIONS.map(p => {
            const on = pos === p;
            return (
              <button key={p} onClick={()=>setPos(p)} style={{ border:'none', cursor:'pointer',
                fontFamily:'"DM Sans",sans-serif', fontWeight: on?700:600, fontSize:13, padding:'10px 16px', borderRadius:13,
                background: on?QUADRA.blue:'#fff', color: on?'#fff':QUADRA.muted,
                boxShadow: on?'0 4px 12px rgba(26,26,255,.22)':'inset 0 0 0 1px rgba(26,26,255,.1)',
                transition:'all .18s', WebkitTapHighlightColor:'transparent' }}>{p}</button>
            );
          })}
        </div>
      </div>

      <Btn kind="grad" full icon="check" onClick={()=>{ setSaved(true); setTimeout(back, 850); }}>
        {saved ? 'Salvo!' : 'Salvar alterações'}</Btn>
      <div style={{ height:10 }}/>
    </ScreenShell>
  );
}

Object.assign(window, {
  SubHeader, SettGroup, SettRow, ToggleRow, Switch, SettCard,
  SettingsScreen, EditProfileScreen,
});
