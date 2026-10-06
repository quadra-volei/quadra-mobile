# Análise — SCOPE.md × Telas (Claude Design)

> Auditoria das divergências entre o `docs/SCOPE.md` e os 27 prints em
> `docs/references/screens/**`, feita antes de reescrever o SCOPE.
> Serve como registro do *por quê* de cada mudança.
>
> Legenda: ✅ alinhado · ⚠️ divergência menor · 🔴 divergência grande
> · 🟦 decisão de produto tomada nesta rodada

---

## 1. Problemas estruturais (afetavam quase todo o SCOPE)

| # | Achado | Impacto | Resolução |
|---|--------|---------|-----------|
| E1 | Todos os `Reference:` apontavam para `docs/references/_shared/…`, mas a pasta foi movida para `docs/references/screens/_shared/` | Todo caminho de JSX quebrado | Corrigido em todas as telas |
| E2 | `screens-rede.jsx` (S7), `screens-game.jsx` (S9/S13.5/S14) e `screens-teams.jsx` (S13) **não existem**; as funções `RedeScreen`, `RankingScreen`, `GameScreen`, `TeamsScreen`, `AutoResultScreen` também não existem em nenhum arquivo | Specs apontavam para fonte fantasma | Referências trocadas para "screenshot only" |
| E3 | S13 (In-Game Teams) **não tem nenhum screenshot** (`partida-time-automatico.png`/`partida-time-manual.png` citados não existem) | Tela sem referência | Aponta para a visão do organizador (S12) como referência visual |
| E4 | Screenshots a mais, não citados: `S2/login-acesse-sua-conta.png`, `S4/dados-posicao.png` | Telas reais ficavam de fora do spec | Incorporados às referências |
| E5 | `S17-map/explorar.png` é **cópia idêntica** do `S6/explorar.png` | S17 sem mapa fullscreen real | Documentado; S17 reutiliza o `ExploreMap` (esse helper existe e é válido) |

**JSX que de fato existem** (`docs/references/screens/_shared/`):
`screens-main` (LoginScreen, AuthScreen, HomeScreen, ExploreScreen, NearbyCard, ExploreMap) ·
`screens-detail` (DetailScreen, CreateScreen) ·
`screens-onboarding` (OnboardingScreen, CadastroScreen) ·
`screens-profile` (ProfileScreen, CardScreen) ·
`screens-settings` (SettingsScreen, EditProfileScreen) ·
`screens-manage` (ManageScreen) ·
`screens-matchend` (MatchEndScreen, MVPScreen) ·
`screens-matchresult` (MatchResultScreen).

---

## 2. Divergências por tela

### S1 — Splash ✅
Bate com o print (logo + wordmark + tagline + barra "CARREGANDO", sem blobs). Sem ajuste.

### S2 — Login 🔴
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| Uma tela = form de login | **Dois estados**: boas-vindas (`login.png`, CTA "Entrar e jogar") + bottom sheet "ACESSE SUA CONTA" (`login-acesse-sua-conta.png`) | Ambos os estados documentados |
| Botão "Entrar com Apple" (iOS) | Sem botão Apple | Marcado OUT (reincluir quando o design trouxer) |
| (forget password já removido em commit) | Print ainda tem "Esqueceu a senha?" | Marcado OUT (print stale; fluxo é passwordless) |

### S3 — SMS OTP ⚠️
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| "Pedir denovo", cooldown 30s | "Reenviar código" / "Reenviar em 0:26" | Label e cooldown corrigidos |
| — | "Usar outro número" | Adicionado |
| error state (shake + borda vermelha) | sem print desse estado | Mantido, anotado "sem referência" |

### S4 — Onboarding 🔴 (maior divergência) 🟦
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| Form único | Wizard "Passo X de 3" + dados pessoais + tela final "PERFIL PRONTO!" | Reescrito como wizard |
| "name input" | NOME **+ SOBRENOME**, **DATA DE NASCIMENTO**, **APELIDO/@handle** | 🟦 Todos incluídos no MVP |
| dropdown posição primária + secundária (PON/OPO/LEV/LIB/CEN/**OUT**) | grid single-select LEV/PON/OPO/CEN/LIB/**COR (Coringa)**, sem secundária | 🟦 Segue o print |
| — | Etapa **MODALIDADE** (Vôlei de quadra 6x6 × praia 2x2) | 🟦 Incluída no MVP |
| photo picker no onboarding | sem foto no onboarding (foto está no S10) | Movido para S10 |

> ⚠️ Impacto backend (F2.1): novos campos `@handle`, `lastName`, `birthDate`, `modality`.

### S5 — Home ⚠️
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| header com avatar + saudação + sino | título "INÍCIO" + sino + **toggle de tema** (sem avatar/saudação) | Header corrigido |
Resto (Criar partida / Procurar partidas / Próximas / Jogos perto / tab bar + FAB) ✅.

### S6 — Explore ⚠️
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| chips "Casual / Serinho" | chips **Todos / Perto / Hoje / Iniciante / 6x6** | Corrigido |
| sem mapa (mapa é S17) | **mini-mapa integrado** com pins + card de quadra | Adicionado (preview inline) |
| "Quadras próximas" + "Jogadores (Em breve)" | não visíveis | Marcados OUT/revisar |

### S7 — Network ✅
Print mostra feed completo; SCOPE já dizia "placeholder, use para entender o que NÃO construir". Só corrigida a referência fantasma.

### S8 — Profile 🔴 (muito Layer 3 no print)
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| header avatar + saudação + sino | + **toggle de tema** | Ajustado |
| — | **"Minhas partidas"** (histórico V/D) | Incluído (F1.6) |
| — | "Ver a sua carta" (player card) | OUT (Layer 3) |
| — | "Sugestão de amigos" | OUT (Layer 3) |
| achievement gallery OUT | "Conquistas" preenchidas | Mantido OUT |
| ACE/BLK/ATA/DEF = Layer 3 | aparecem preenchidos | Mantido OUT/placeholder |

### S9 — Ranking ⚠️
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| "group selector"; city/global OUT | abas **Bairro / Amigos / Geral** + pódio + setas ↑↓ | Só "Amigos" funcional; "Bairro"/"Geral" desabilitadas (Layer 3); pódio e tendência adicionados |

### S10 — Settings ⚠️ 🟦
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| light only, sem toggle | **"Aparência: Claro/Escuro/Automático"** | 🟦 Dark mode entra no MVP |
| — | "Pagamentos e Premium [PRO]" | OUT (Layer 3 — billing) |
| edit: name/photo/positions | + apelido, nascimento, telefone; chips de posição (6) | Detalhado |
| — | "Permissões do app", "Enviar feedback" | Adicionados |

### S11 — Create Match 🔴 🟦
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| Recorrente/Avulsa + janela de confirmação + descrição | **não tem** esses campos | 🟦 Recorrente/janela mantidos como **DESIGN GAP** (F1.1 exige); descrição OUT |
| — | FORMATO (2x2/4x4/6x6), NÍVEL, **capa**, **PRIVACIDADE** (toggle), datas em chips | Adicionados |
| convidar = OUT | sucesso tem "Convidar jogadores" | Doc: CTA abre fluxo separado |

### S12 — Match Detail 🔴
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| abas Info \| Times \| Placar \| Resumo | **scroll único**, sem abas | Modelo de abas descartado |
| S13 separada | visão organizador **embute** config de times (2/3/4 times, jogadores/time, Manual/Automático, "Montar os times") | Documentado como entrada da S13 |
| — | OVR por jogador | OUT (Layer 3) |

### S13 — In-Game Teams 🔴
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| 2 screenshots (não existem); "OUT: além de 2 times" | sem screenshot; S12/S13.5 suportam **3-4 times** | Referência → visão organizador; contradição corrigida (2-4 times IN); rota = tela separada |

### S13.5 — Set Team Picker ✅
Bate bem (1° set · melhor de 5, times 1/2, pill de pareamento, "Começar partida"). Só corrigida a referência fantasma.

### S14 — Scoreboard ⚠️
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| "+/- por time", tab dentro de S12 | "+ ponto" por time + **"Desfazer" global**; tela separada | Corrigido; "AO VIVO" + timer adicionados |

### S15 — MVP Vote ⚠️
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| lista excluindo self | self aparece **bloqueado** | Esclarecido |
| — | stats PON/BLO/DEF/ACE por card | OUT (Layer 3) |

### S16 — Match Summary 🔴 (contradição interna)
| SCOPE dizia | Print mostra | Resolução |
|---|---|---|
| tab dentro de S12; final score + duration + team compositions | tela separada; score + sets + MVP votado + ranking de votos + **"MEU DESEMPENHO"** | Reescrito; sem duration/compositions (não estão no print) |
| "editable stats = NÃO-MVP" | `partida-encerrar-estatisticas.png` = **input de stats pessoais** | ⚠️ **DECISÃO EM ABERTO** — default OUT |

### S17 — Map 🔴
Sem mockup real (`explorar.png` é cópia do S6). Reutiliza o helper `ExploreMap` (válido). Documentado.

---

## 3. Tema transversal — a raiz do problema

Os mockups foram gerados **mais ricos que o MVP**. Recorrem em várias telas
funcionalidades que o SCOPE corta por serem Layer 3:

- **Dark mode** (toggle em S10, ícone de sol nos headers) → 🟦 puxado para o MVP
- **OVR / rating de jogador** (S12, S15) → OUT
- **Input de estatísticas pessoais** (S16) → ⚠️ decisão em aberto
- **Sistema de amigos** (sugestões em S8) → OUT
- **Conquistas** (S8) → OUT
- **Premium / pagamentos** (S10) → OUT
- **Ranking de cidade/global** (Bairro/Geral em S9) → OUT
- **Modalidade quadra/praia** (S4) → 🟦 puxada para o MVP

"Adequar o SCOPE às telas" foi, portanto, sobretudo **decidir o que puxar para o
MVP × o que continua cortado** (o implementer ignora essas partes do print).

---

## 4. Decisões de produto desta rodada (🟦)

| Tema | Decisão |
|---|---|
| Campos S4 | @handle, sobrenome, data de nascimento e modalidade **entram** |
| Dark mode | **Entra** no MVP |
| Posições | LEV/PON/OPO/CEN/LIB/COR, seleção única, sem secundária |
| S11 | Print + manter Recorrente/Avulsa e janela de confirmação como DESIGN GAP |

## 5. Pendências

1. **S16** — manter input de estatísticas OUT ou puxar para o MVP? (default: OUT)
2. **`docs/DESIGN_SYSTEM.md`** — precisa de tokens *dark* (dark mode virou MVP)
3. **Backend SCOPE** — adicionar `@handle`, `lastName`, `birthDate`, `modality` (F2.1)
