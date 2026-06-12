// Quadra — Resumo de uma partida do histórico: MVP mais votado + seu desempenho.
// Fundo escuro (mesma linguagem de MVP/fim de jogo). Loaded after screens-matchend.jsx.
var { useState, useEffect, useRef } = React;

// categorias do desempenho (mesmo mapa de cores/ícones do fim de jogo)
const RESULT_STATS = [
  { key:'pts', label:'Pontos',  icon:'volley', color:'#1A1AFF' },
  { key:'blk', label:'Blocks',  icon:'net',    color:'#00B4D8' },
  { key:'def', label:'Defesas', icon:'lock',   color:'#6B1AFF' },
  { key:'ace', label:'Aces',    icon:'bolt',   color:'#AADD00' },
];

function playerById(id) {
  const all = Object.values(PLAYERS);
  return all.find(p => p.id === id) || ME;
}

// ════════════════════════════════════════════════════════════
// RESUMO DA PARTIDA
// ════════════════════════════════════════════════════════════
function MatchResultScreen({ match, back, go }) {
  const m = match || MATCH_HISTORY[0];
  const win = m.win;
  const sets = m.sets || [];
  const votes = (m.votes || []).slice().sort((a,b)=>b.v-a.v);
  const totalCast = votes.reduce((s,x)=>s+x.v, 0);
  const mvp = playerById(m.mvpId);
  const mvpVotes = (votes.find(v=>v.id===m.mvpId) || {}).v || 0;
  const mvpIsMe = m.mvpId === ME.id;
  const st = m.myStats || { pts:0, blk:0, def:0, ace:0 };
  const rating = m.rating != null ? m.rating : 0;
  // melhor categoria do jogador (destaque)
  const best = RESULT_STATS.reduce((a,b)=> (st[b.key] > st[a.key] ? b : a), RESULT_STATS[0]);

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative',
      background:`linear-gradient(180deg, #08083a 0%, ${QUADRA.navy} 60%, #0c0c52 100%)` }}>
      <Blob color={QUADRA.blue} size={260} style={{ top:-40, left:-100, opacity:.2 }}/>
      <Blob color={QUADRA.lime} size={230} style={{ bottom:60, right:-90, opacity:.14 }}/>

      {/* header */}
      <div style={{ paddingTop:SAFE_TOP, flexShrink:0, position:'relative', zIndex:3 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 16px 8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <IconBtn name="chevL" dark fill="rgba(255,255,255,.1)" onClick={back}/>
            <span style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:700, fontSize:14, color:'rgba(255,255,255,.85)' }}>
              Resumo da partida</span>
          </div>
          <IconBtn name="share" dark fill="rgba(255,255,255,.1)"/>
        </div>
      </div>

      {/* body */}
      <div className="q-scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden', position:'relative', zIndex:2,
        padding:'10px 22px 26px' }}>
        {/* título + placar */}
        <div className="q-rise" style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:7, marginBottom:12 }}>
            <Tag bg="rgba(255,255,255,.12)" color="#fff" style={{ fontSize:9 }}>{m.mode}</Tag>
            <Tag bg={win ? QUADRA.lime : 'rgba(255,255,255,.12)'} color={win ? QUADRA.navy : 'rgba(255,255,255,.8)'} style={{ fontSize:9 }}>
              {win ? 'Vitória' : 'Derrota'}</Tag>
          </div>
          <h1 className="q-bebas" style={{ fontSize:26, color:'#fff', letterSpacing:.6, margin:0, lineHeight:1.05 }}>{m.title}</h1>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:8,
            fontFamily:'"DM Sans",sans-serif', fontSize:12.5, color:'rgba(255,255,255,.55)' }}>
            <Icon name="pin" size={13} stroke="rgba(255,255,255,.55)"/>{m.place} · {m.date}</div>

          {/* placar grande */}
          <div className="q-num" style={{ fontSize:64, color: win ? QUADRA.brightLime : '#fff', lineHeight:1, margin:'16px 0 0',
            letterSpacing:1 }}>{m.score}</div>

          {/* sets */}
          <div style={{ display:'flex', justifyContent:'center', flexWrap:'wrap', gap:7, marginTop:14 }}>
            {sets.map((s,i) => (
              <span key={i} className="q-num" style={{ fontSize:13, color:'rgba(255,255,255,.75)', padding:'5px 11px',
                borderRadius:9, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)' }}>{s}</span>
            ))}
          </div>
        </div>

        {/* ── MVP mais votado ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, margin:'26px 4px 12px' }}>
          <Icon name="trophy" size={17} stroke={QUADRA.brightLime}/>
          <span className="q-mono" style={{ fontSize:11, letterSpacing:1.8, color:QUADRA.brightLime, textTransform:'uppercase' }}>
            MVP mais votado</span>
        </div>

        <div style={{ position:'relative', borderRadius:22, padding:'20px', overflow:'hidden',
          background: mvpIsMe ? 'linear-gradient(155deg, rgba(198,241,53,.16), rgba(170,221,0,.06))'
                              : 'linear-gradient(155deg, rgba(42,42,124,.55), rgba(16,16,70,.5))',
          border:`1.5px solid ${QUADRA.brightLime}`, boxShadow:'0 14px 44px rgba(0,0,0,.35)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* avatar com brilho + troféu */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <span style={{ position:'absolute', inset:-8, borderRadius:'50%',
                background:`radial-gradient(circle, ${QUADRA.brightLime}44, transparent 70%)` }}/>
              <span style={{ position:'relative', borderRadius:'50%', border:`3px solid ${QUADRA.brightLime}`, padding:3, display:'inline-flex' }}>
                <Avatar player={mvp} size={76} badge/></span>
              <span style={{ position:'absolute', bottom:-4, left:'50%', transform:'translateX(-50%)', width:30, height:30,
                borderRadius:'50%', background:QUADRA.brightLime, display:'flex', alignItems:'center', justifyContent:'center',
                border:'3px solid #0c0c52' }}>
                <Icon name="trophy" size={15} stroke={QUADRA.navy}/></span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              {mvpIsMe && <Tag bg={QUADRA.brightLime} color={QUADRA.navy} style={{ fontSize:9, marginBottom:7 }}>Você foi o MVP!</Tag>}
              <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:800, fontSize:19, color:'#fff', lineHeight:1.1,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{mvpIsMe ? 'Você' : mvp.name}</div>
              <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12.5, color:QUADRA.brightLime, fontWeight:600, marginTop:3 }}>
                {mvp.nick} · {mvp.pos}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginTop:9 }}>
                <span className="q-num" style={{ fontSize:22, color:'#fff', lineHeight:1 }}>{mvpVotes}</span>
                <span style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12.5, color:'rgba(255,255,255,.6)' }}>
                  de {m.voters} votos</span>
              </div>
            </div>
          </div>
        </div>

        {/* votação (top votados) */}
        <div style={{ marginTop:14, padding:'4px 2px' }}>
          {votes.map((v,i) => {
            const p = playerById(v.id);
            const me = v.id === ME.id;
            const pct = totalCast ? Math.round((v.v / totalCast) * 100) : 0;
            return (
              <div key={v.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 0' }}>
                <span className="q-num" style={{ fontSize:13, width:16, textAlign:'center', color:'rgba(255,255,255,.4)' }}>{i+1}</span>
                <Avatar player={p} size={34} badge/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:600, fontSize:13.5,
                    color: me ? QUADRA.brightLime : '#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {me ? 'Você' : p.name}</div>
                  <div style={{ height:5, borderRadius:4, background:'rgba(255,255,255,.1)', overflow:'hidden', marginTop:5 }}>
                    <div style={{ width:`${pct}%`, height:'100%', borderRadius:4,
                      background: i===0 ? QUADRA.brightLime : 'rgba(255,255,255,.4)' }}/>
                  </div>
                </div>
                <span className="q-num" style={{ fontSize:15, color: me ? QUADRA.brightLime : 'rgba(255,255,255,.85)', flexShrink:0 }}>{v.v}</span>
              </div>
            );
          })}
        </div>

        {/* ── Meu desempenho ── */}
        <div style={{ display:'flex', alignItems:'center', gap:8, margin:'26px 4px 12px' }}>
          <Icon name="user" size={17} stroke={QUADRA.brightLime}/>
          <span className="q-mono" style={{ fontSize:11, letterSpacing:1.8, color:QUADRA.brightLime, textTransform:'uppercase' }}>
            Meu desempenho</span>
        </div>

        {/* xp ganho */}
        <div style={{ borderRadius:18, padding:'18px 20px', marginBottom:12, background:'rgba(198,241,53,.12)',
          border:`1px solid rgba(198,241,53,.3)`, display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ width:42, height:42, borderRadius:13, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(198,241,53,.16)' }}>
            <Icon name="flame" size={22} stroke={QUADRA.brightLime}/></span>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,.6)' }}>XP ganho nesta partida</div>
            <div style={{ fontFamily:'"DM Sans",sans-serif', fontSize:11.5, color:'rgba(255,255,255,.4)', marginTop:2 }}>Some ao seu progresso de nível</div>
          </div>
          <div className="q-num" style={{ fontSize:38, color:QUADRA.brightLime, lineHeight:1 }}>+{m.xp}</div>
        </div>

        {/* grid de estatísticas */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
          {RESULT_STATS.map(d => {
            const isBest = d.key === best.key && st[d.key] > 0;
            return (
              <div key={d.key} style={{ borderRadius:18, padding:'15px 16px',
                background:'rgba(255,255,255,.06)', border:`1px solid ${isBest ? 'rgba(198,241,53,.4)' : 'rgba(255,255,255,.1)'}`,
                position:'relative' }}>
                {isBest && <span style={{ position:'absolute', top:12, right:12 }}>
                  <Icon name="flame" size={15} stroke={QUADRA.brightLime}/></span>}
                <span style={{ width:36, height:36, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center',
                  background:'rgba(255,255,255,.07)' }}>
                  <Icon name={d.icon} size={20} stroke="#fff"/></span>
                <div className="q-num" style={{ fontSize:30, color:'#fff', lineHeight:1, marginTop:12 }}>{st[d.key]}</div>
                <div style={{ fontFamily:'"DM Sans",sans-serif', fontWeight:600, fontSize:12.5, color:'rgba(255,255,255,.6)', marginTop:3 }}>{d.label}</div>
              </div>
            );
          })}
        </div>

        {/* cta */}
        <div style={{ marginTop:22 }}>
          <Btn kind="grad" full icon="user" onClick={()=>go('profile')}>Voltar para o perfil</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MatchResultScreen });
