// Quadra — Gerenciar a partida que VOCÊ criou.
// Resumo + jogadores convidados, CONFIGURAÇÃO dos times (nº de times + jogadores
// por time) e então a escolha de COMO sortear (Manual ou Automático por nível +
// overall). Manual → montar à mão; Automático → resumo escuro pronto pra iniciar.
// Loaded after screens-teams.jsx.
var { useState } = React;

// cartão de escolha do modo de sorteio (ícone só, azul)
function DrawChoice({ icon, title, desc, on, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13,
        padding: '16px', borderRadius: 18, background: '#fff', transition: 'all .18s', WebkitTapHighlightColor: 'transparent',
        border: on ? `2px solid ${QUADRA.blue}` : '1.5px solid rgba(10,10,60,.1)',
        boxShadow: on ? `0 8px 22px rgba(26,26,255,.18)` : '0 1px 6px rgba(10,10,60,.05)',
        transform: on ? 'translateY(-1px)' : 'none' }}>
      <span style={{ width: 33, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} stroke={QUADRA.blue} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 800, fontSize: 15.5, color: QUADRA.navy }}>{title}</div>
        <div style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 12.5, color: QUADRA.muted, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
      <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', border: on ? 'none' : '2px solid rgba(10,10,60,.18)', background: on ? QUADRA.blue : 'transparent' }}>
        {on && <Icon name="check" size={13} stroke="#fff" sw={3} />}</span>
    </button>
  );
}

// ════════════════════════════════════════════════════════════
// GERENCIAR PARTIDA
// ════════════════════════════════════════════════════════════
function ManageScreen({ match, back, go }) {
  const m = match || MY_HOSTED;
  const ids = m.roster || [];
  const total = ids.length;

  const [draw, setDraw] = useState(m.draw === 'auto' ? 'auto' : 'manual');
  const [numTeams, setNumTeams] = useState(2);
  const [perTeam, setPerTeam] = useState(Math.ceil(total / 2));
  const pickTeams = (n) => { setNumTeams(n); setPerTeam(Math.ceil(total / n)); };

  const header = (
    <Header title="SUA PARTIDA" left={<IconBtn name="chevL" onClick={() => (back ? back() : go('home'))} />} />
  );

  const Label = ({ children, style = {} }) => (
    <div style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 11, color: QUADRA.navy,
      textTransform: 'uppercase', letterSpacing: 1.1, margin: '0 0 12px', ...style }}>{children}</div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: QUADRA.lightBg, overflow: 'hidden' }}>
      {header}
      <div className="q-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 20px 20px' }}>

        {/* capa + identidade da partida */}
        <Card pad={0} style={{ overflow: 'hidden', marginBottom: 18 }}>
          <CourtImage tint={m.tint || QUADRA.blue} height={104} radius={0} label="">
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,60,.05) 30%, rgba(10,10,60,.78) 100%)' }} />
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
              <Tag bg={QUADRA.lime} color={QUADRA.navy} style={{ fontSize: 9 }}>Você organiza</Tag>
              <div style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 800, fontSize: 18, color: '#fff', marginTop: 7,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
            </div>
          </CourtImage>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '13px 14px 14px' }}>
            {[['pin', m.place || 'Arena'], ['clock', m.time || 'A definir'], ['whistle', m.mode || '6x6']].map(([ic, tx]) => (
              <span key={ic} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 12,
                background: QUADRA.lightBg }}>
                <Icon name={ic} size={14} stroke={QUADRA.blue} />
                <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 600, fontSize: 12.5, color: QUADRA.navy }}>{tx}</span>
              </span>
            ))}
          </div>
        </Card>

        {/* jogadores convidados */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
          <Label style={{ margin: 0 }}>Confirmados · {total}</Label>
          <button onClick={() => {}} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 12,
            border: `1.5px solid ${QUADRA.blue}`, background: 'transparent', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 12.5, color: QUADRA.blue }}>
            <Icon name="plusUser" size={15} stroke={QUADRA.blue} />Convidar</button>
        </div>
        <Card pad={16} style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px 6px' }}>
            {ids.map((id) => {
              const p = PLAYERS[id];
              return (
                <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <Avatar player={p} size={48} badge />
                  <div style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 11.5, color: QUADRA.navy,
                    maxWidth: 62, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
                    {p.name.split(' ')[0]}{id === ME.id ? ' (você)' : ''}</div>
                  <span style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 10, color: QUADRA.muted, letterSpacing: .3 }}>
                    OVR {p.overall}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* configuração dos times (antes da escolha de modo) */}
        <Label>Configuração dos times</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[2, 3, 4].map((nq) => {
            const on = numTeams === nq;
            return (
              <button key={nq} onClick={() => pickTeams(nq)}
                style={{ flex: 1, border: 'none', cursor: 'pointer', padding: '12px 8px', borderRadius: 14,
                  fontFamily: '"DM Sans",sans-serif', fontWeight: on ? 700 : 600, fontSize: 13.5,
                  background: on ? QUADRA.blue : '#fff', color: on ? '#fff' : QUADRA.muted,
                  boxShadow: on ? '0 5px 14px rgba(26,26,255,.24)' : 'inset 0 0 0 1px rgba(26,26,255,.1)',
                  transition: 'all .18s', WebkitTapHighlightColor: 'transparent' }}>{nq} times</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 28,
          padding: '12px 16px', borderRadius: 16, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(26,26,255,.1)' }}>
          <div>
            <div style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 700, fontSize: 14, color: QUADRA.navy }}>Jogadores por time</div>
            <div style={{ fontFamily: '"DM Sans",sans-serif', fontSize: 12, color: QUADRA.muted, marginTop: 2 }}>{total} confirmados no total</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setPerTeam((v) => Math.max(1, v - 1))} aria-label="Menos"
              style={{ width: 36, height: 36, borderRadius: 11, border: '1.5px solid rgba(26,26,255,.2)', background: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
              <span style={{ width: 12, height: 2.6, borderRadius: 2, background: QUADRA.blue }} /></button>
            <span className="q-num" style={{ fontSize: 22, color: QUADRA.navy, minWidth: 22, textAlign: 'center' }}>{perTeam}</span>
            <button onClick={() => setPerTeam((v) => Math.min(total, v + 1))} aria-label="Mais"
              style={{ width: 36, height: 36, borderRadius: 11, border: 'none', background: QUADRA.blue, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
              <Icon name="plus" size={16} stroke="#fff" sw={3} /></button>
          </div>
        </div>

        {/* modo de sorteio */}
        <Label>Como sortear os times</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DrawChoice icon="users" title="Manual" on={draw === 'manual'} onClick={() => setDraw('manual')}
            desc="Você escolhe quem joga em cada time, na mão." />
          <DrawChoice icon="volley" title="Automático" on={draw === 'auto'} onClick={() => setDraw('auto')}
            desc="Times equilibrados automaticamente por nível e overall." />
        </div>
      </div>

      {/* footer */}
      <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid rgba(10,10,60,.06)',
        padding: `14px 20px ${SAFE_BOTTOM + 10}px`, boxShadow: '0 -4px 20px rgba(10,10,60,.06)' }}>
        <Btn kind="grad" full icon={draw === 'auto' ? 'volley' : undefined}
          onClick={() => draw === 'auto'
            ? go('teamsauto', { ...m, draw: 'auto', numTeams, perTeam })
            : go('teams', { ...m, draw: 'manual', numTeams, perTeam, lockConfig: true })}>
          {draw === 'auto' ? 'Sortear e iniciar' : 'Montar os times'}</Btn>
      </div>
    </div>
  );
}

Object.assign(window, { ManageScreen });
