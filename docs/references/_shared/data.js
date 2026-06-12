// Quadra — palette + mock data (plain JS, attached to window)
// Palette straight from the brief.
const QUADRA = {
  blue:      '#1A1AFF', // Electric Blue
  navy:      '#0A0A3C', // Dark Navy
  lime:      '#AADD00', // Lime Accent
  brightLime:'#C6F135', // Bright Lime
  lightBg:   '#EFF3FC', // Light Blue BG
  midNavy:   '#111145', // Mid Navy (cards)
  white:     '#FFFFFF',
  text:      '#1A1A2E', // Dark text
  muted:     '#7A7A9A', // Muted gray
};

// Position colors (avatar borders)
const POSCOLOR = {
  'Levantador': '#1A1AFF',
  'Oposto':     '#1A1AFF',
  'Ponteiro':   '#1A1AFF',
  'Central':    '#1A1AFF',
  'Líbero':     '#1A1AFF',
  'Coringa':    '#1A1AFF',
};

// Players (avatars = initials + position border)
const PLAYERS = {
  rafa:   { id:'rafa',   name:'Renan Dias',    nick:'@renan',      pos:'Levantador', initials:'RN', level:15 },
  erica:  { id:'erica',  name:'Érica Moraes',  nick:'@erica.vbs',  pos:'Central',    initials:'EM', level:18 },
  bia:    { id:'bia',    name:'Bia Fontes',    nick:'@biaf',       pos:'Líbero',     initials:'BF', level:9  },
  caio:   { id:'caio',   name:'Caio Drumond',  nick:'@caio_op',    pos:'Oposto',     initials:'CD', level:15 },
  duda:   { id:'duda',   name:'Duda Reis',     nick:'@dudareis',   pos:'Ponteiro',   initials:'DR', level:11 },
  theo:   { id:'theo',   name:'Theo Nunes',    nick:'@theon',      pos:'Ponteiro',   initials:'TN', level:7  },
  manu:   { id:'manu',   name:'Manu Castro',   nick:'@manuc',      pos:'Central',    initials:'MC', level:14 },
  vini:   { id:'vini',   name:'Vini Sales',    nick:'@vsales',     pos:'Coringa',    initials:'VS', level:6  },
};

const ME = PLAYERS.rafa;

// Overall (geral) determinístico por jogador — correlato ao nível + variação estável.
// Usado no sorteio automático ("equilibrado por nível e overall").
Object.values(PLAYERS).forEach((p) => {
  let s = 0; for (const ch of p.id) s += ch.charCodeAt(0);
  const r = ((s * 9301 + 49297) % 233280) / 233280;
  p.overall = 58 + Math.round((p.level / 18) * 28) + Math.round(r * 11); // ~60–97
});
// Força combinada (nível + overall) — base do snake draft do sorteio automático.
function playerPower(id) {
  const p = PLAYERS[id]; if (!p) return 0;
  return (p.level || 0) * 2 + (p.overall || 0);
}

// Pre-defined profile pictures (square art, rounded by the UI).
// Randomly (but deterministically) assigned so every reload is stable.
const AVATAR_POOL = Array.from({length:10}, (_,i)=> `avatars/perfil-${String(i+1).padStart(2,'0')}.png`);
(function assignAvatars(){
  let seed = 9;
  const rnd = ()=>{ seed = (seed*1103515245 + 12345) & 0x7fffffff; return seed/0x7fffffff; };
  const pool = AVATAR_POOL.slice();
  for (let i=pool.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  Object.values(PLAYERS).forEach((p,i)=>{ p.img = pool[i % pool.length]; });
})();

// Upcoming matches (próximas partidas)
const UPCOMING = [
  { id:'m1', title:'Vôlei de Quinta', place:'Arena Pinheiros', time:'Hoje · 19h30', status:'confirmado', spots:'10/12', tint:'#1A1AFF', cat:'Casual',      vagas:2, price:'R$ 15', crew:['rafa','bia','caio'],  more:3 },
  { id:'m2', title:'Racha da Galera', place:'Quadra Vila Madá', time:'Amanhã · 20h00', status:'em breve',  spots:'7/12', tint:'#6B1AFF', cat:'Competitivo', vagas:5, price:'R$ 20', crew:['duda','manu','theo'], more:9 },
  { id:'m3', title:'Treino Misto',    place:'Clube Hebraica',   time:'Sex · 18h00',    status:'confirmado', spots:'8/12', tint:'#00B4D8', cat:'Casual',      vagas:4, price:'Grátis', crew:['erica','vini','manu'],more:5 },
];

// Nearby games (jogos perto de você) — card grid
const NEARBY = [
  { id:'n1', name:'Arena Sky Beach', dist:'1,2 km', level:'Intermediário', mode:'4x4', price:'R$ 25', tint:'#1A1AFF',  players:6,  cap:8 },
  { id:'n2', name:'Quadra do Parque', dist:'2,8 km', level:'Iniciante',    mode:'6x6', price:'Grátis', tint:'#00B4D8', players:9,  cap:12 },
  { id:'n3', name:'Beach Vôlei SP',   dist:'3,4 km', level:'Avançado',     mode:'2x2', price:'R$ 40', tint:'#6B1AFF',  players:2,  cap:4 },
  { id:'n4', name:'Centro Olímpico',  dist:'4,1 km', level:'Intermediário',mode:'6x6', price:'R$ 18', tint:'#AADD00',  players:7,  cap:12 },
];

// Roster for a match detail / in-game
const ROSTER_A = [PLAYERS.rafa, PLAYERS.bia, PLAYERS.caio, PLAYERS.duda, PLAYERS.manu, PLAYERS.vini];
const ROSTER_B = [PLAYERS.erica, PLAYERS.theo];

// Arenas — locais onde dá pra jogar vôlei (mapa do Explorar).
// Compila quadras com partidas criadas: avaliação por estrelas, valor médio
// gasto (ou gratuito) e os jogos abertos no local. x/y = posição no mundo do mapa (600×560).
const ARENAS = [
  { id:'a1', name:'Arena Sky Beach', short:'Sky Beach', address:'R. dos Pinheiros, 1402', dist:'1,2 km',
    x:130, y:120, rating:4.8, reviews:212, free:false, avgPrice:'R$ 25', priceRange:'R$ 20–30',
    mode:'4x4', level:'Intermediário', surface:'Areia', tint:'#1A1AFF', live:true,
    games:[
      { id:'a1g1', title:'Vôlei de Quinta', time:'Hoje · 19h30', mode:'4x4', price:'R$ 25', vagas:2, crew:['rafa','bia','caio'], more:3 },
      { id:'a1g2', title:'Racha Sky Beach',  time:'Sáb · 17h00',  mode:'4x4', price:'R$ 25', vagas:4, crew:['manu','theo'],       more:2 },
    ] },
  { id:'a2', name:'Quadra do Parque', short:'Do Parque', address:'Parque Villa-Lobos', dist:'2,8 km',
    x:330, y:180, rating:4.5, reviews:98, free:true, avgPrice:'Gratuito', priceRange:'Gratuito',
    mode:'6x6', level:'Iniciante', surface:'Quadra', tint:'#00B4D8', live:false,
    games:[
      { id:'a2g1', title:'Vôlei no Parque', time:'Dom · 09h00', mode:'6x6', price:'Grátis', vagas:6, crew:['duda','vini'], more:4 },
    ] },
  { id:'a3', name:'Beach Vôlei SP', short:'Beach SP', address:'Av. Pedroso de Morais, 980', dist:'3,4 km',
    x:210, y:330, rating:4.9, reviews:341, free:false, avgPrice:'R$ 40', priceRange:'R$ 35–45',
    mode:'2x2', level:'Avançado', surface:'Areia', tint:'#6B1AFF', live:true,
    games:[
      { id:'a3g1', title:'Duplas de Sábado', time:'Hoje · 18h00', mode:'2x2', price:'R$ 40', vagas:2, crew:['erica','caio'],       more:0 },
      { id:'a3g2', title:'Treino Avançado',  time:'Ter · 20h00',  mode:'2x2', price:'R$ 40', vagas:2, crew:['rafa','manu'],        more:0 },
      { id:'a3g3', title:'Open Beach',        time:'Qui · 19h00',  mode:'2x2', price:'R$ 35', vagas:1, crew:['theo','bia','duda'],  more:1 },
    ] },
  { id:'a4', name:'Centro Olímpico', short:'C. Olímpico', address:'R. Henrique Schaumann, 350', dist:'4,1 km',
    x:440, y:300, rating:4.2, reviews:56, free:false, avgPrice:'R$ 18', priceRange:'R$ 15–22',
    mode:'6x6', level:'Intermediário', surface:'Quadra', tint:'#AADD00', live:false,
    games:[
      { id:'a4g1', title:'Misto de Sexta', time:'Sex · 19h30', mode:'6x6', price:'R$ 18', vagas:4, crew:['manu','erica','vini'], more:5 },
    ] },
];

// Partida que VOCÊ organiza (seed) — aparece em "Partidas que você criou" no Início.
// roster = jogadores confirmados (ids de PLAYERS). 'rafa' é você (organizador).
const MY_HOSTED = {
  id:'host1', title:'Racha de Sexta', place:'Arena Sky Beach', time:'Sex · 19h30', mode:'6x6',
  level:'Intermediário', price:'R$ 25', tint:'#1A1AFF', host:true,
  roster:['rafa','erica','caio','duda','manu','theo','bia','vini'], draw:'manual',
};

// Cores por time (sorteio) — prioridade: azul, verde limão, laranja, roxo (último)
const TEAM_TINTS = ['#1A1AFF', '#AADD00', '#FF6B00', '#6B1AFF'];

// Persistência simples das partidas criadas pelo usuário (localStorage)
function loadCreated(){ try { return JSON.parse(localStorage.getItem('quadra-created') || '[]'); } catch(e){ return []; } }
function addCreatedMatch(m){
  try { const list = loadCreated(); list.push(m); localStorage.setItem('quadra-created', JSON.stringify(list)); } catch(e){}
}
// todas as partidas que você organiza (criadas + seed)
function hostedMatches(){ return [...loadCreated().reverse(), MY_HOSTED]; }

// Ranking
const RANKING = [
  { ...PLAYERS.erica, score:2480, delta:'+3' },
  { ...PLAYERS.caio,  score:2310, delta:'+1' },
  { ...PLAYERS.manu,  score:2180, delta:'-1' },
  { ...PLAYERS.rafa,  score:1995, delta:'+5', me:true },
  { ...PLAYERS.duda,  score:1870, delta:'0'  },
  { ...PLAYERS.bia,   score:1740, delta:'+2' },
  { ...PLAYERS.theo,  score:1510, delta:'-2' },
  { ...PLAYERS.vini,  score:1320, delta:'+1' },
];

// Profile stats for ME
const MY_STATS = { geral:68, ace:30, blk:25, ata:20, def:30, srv:27, rec:24 };
// Histórico de partidas (perfil) — 3 mais recentes
// Cada partida guarda placar por set, MVP mais votado (votação completa),
// e o desempenho do ME naquele jogo. mvpId 'rafa' === você.
const MATCH_HISTORY = [
  { id:'h1', title:'Vôlei de Quinta', when:'Ontem · 19h30', date:'10 jun 2026', place:'Arena Pinheiros',
    mode:'6x6', win:true, score:'3–1', pts:'+24', xp:24, tint:'#1A1AFF',
    sets:['25–19','23–25','25–21','25–18'],
    mvpId:'erica', voters:10,
    votes:[ {id:'erica',v:5}, {id:'caio',v:3}, {id:'manu',v:2} ],
    myStats:{ pts:16, blk:2, def:6, ace:1 }, rating:7.4 },
  { id:'h2', title:'Racha da Galera', when:'Seg · 20h00', date:'8 jun 2026', place:'Quadra Vila Madá',
    mode:'4x4', win:false, score:'1–3', pts:'+11', xp:11, tint:'#6B1AFF',
    sets:['22–25','25–20','19–25','18–25'],
    mvpId:'caio', voters:8,
    votes:[ {id:'caio',v:4}, {id:'duda',v:2}, {id:'rafa',v:1}, {id:'theo',v:1} ],
    myStats:{ pts:11, blk:1, def:4, ace:0 }, rating:6.5 },
  { id:'h3', title:'Treino Misto', when:'Sáb · 18h00', date:'6 jun 2026', place:'Clube Hebraica',
    mode:'6x6', win:true, score:'3–0', pts:'+30', xp:30, tint:'#00B4D8',
    sets:['25–17','25–21','25–19'],
    mvpId:'rafa', voters:9,
    votes:[ {id:'rafa',v:5}, {id:'manu',v:2}, {id:'bia',v:2} ],
    myStats:{ pts:22, blk:4, def:7, ace:3 }, rating:8.6 },
];
const MY_BADGES = [
  { id:'b1', label:'Sequência de 5', sub:'5 jogos seguidos', icon:'flame' },
  { id:'b2', label:'Saque de Ferro', sub:'30 aces',          icon:'bolt'  },
  { id:'b3', label:'Muralha',        sub:'25 bloqueios',      icon:'users' },
  { id:'b4', label:'Maratonista',    sub:'50 partidas',       icon:'whistle', locked:true, progress:'32/50' },
  { id:'b5', label:'MVP de Ouro',    sub:'10× MVP da partida',icon:'trophy',  locked:true, progress:'4/10'  },
];

// Level tiers — complementary-color rule.
// Ring/badge color is driven by LEVEL (not position): each tier is a
// hue ~opposite the previous on the wheel, so neighboring brackets read
// as complementary pairs. 1–5 → 5–15 → 15–30 → 30–50 → 50–75 → 75+.
const LEVEL_TIERS = [
  { max:5,        color:'#00B4D8', label:'Nv 1–5'   }, // cyan
  { max:15,       color:'#FF6B00', label:'Nv 5–15'  }, // orange  (compl. of cyan)
  { max:30,       color:'#1A1AFF', label:'Nv 15–30' }, // electric blue
  { max:50,       color:'#AADD00', label:'Nv 30–50' }, // lime    (compl. of blue)
  { max:75,       color:'#6B1AFF', label:'Nv 50–75' }, // violet
  // Elite (75+): degradê verde → azul.
  { max:Infinity, color:'#3FA9FF', grad:'linear-gradient(135deg, #AADD00 0%, #1A1AFF 100%)', label:'Nv 75+' },
];
function levelTier(level){
  for (const t of LEVEL_TIERS) if ((level||0) <= t.max) return t;
  return LEVEL_TIERS[2];
}
function levelColor(level){ return levelTier(level).color; }
// Background usável (cor sólida ou degradê) para a bolinha de nível.
function levelBg(level){ const t = levelTier(level); return t.grad || t.color; }
// Cor de texto legível sobre a bolinha (degradê → branco).
function levelText(level){ const t = levelTier(level); return t.grad ? '#FFFFFF' : readableOn(t.color); }
// Readable text color over a tier color (light tiers → navy, dark → white).
function readableOn(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (0.299*r + 0.587*g + 0.114*b) > 150 ? '#0A0A3C' : '#FFFFFF';
}

Object.assign(window, {
  QUADRA, POSCOLOR, LEVEL_TIERS, levelTier, levelColor, levelBg, levelText, readableOn, AVATAR_POOL, PLAYERS, ME, playerPower, UPCOMING, NEARBY, ARENAS, MY_HOSTED, TEAM_TINTS, loadCreated, addCreatedMatch, hostedMatches, ROSTER_A, ROSTER_B, RANKING, MY_STATS, MATCH_HISTORY, MY_BADGES,
});
