// Quadra — Onboarding (montar perfil). Loaded after chrome.jsx, before app.jsx.
// 4 passos: posição → nível → modalidade → resumo.
// Sem voltar. Continuar desabilitado até selecionar. Indicador de progresso em cada tela.
var { useState, useEffect, useRef } = React;

// ── Dados locais do onboarding ───────────────────────────────
const ONB_POSITIONS = [
    { key: "Levantador", abbr: "LEV", role: "Distribui e arma o jogo" },
    { key: "Ponteiro", abbr: "PON", role: "Ataca e recebe pela ponta" },
    { key: "Oposto", abbr: "OPO", role: "Potência de ataque na direita" },
    { key: "Central", abbr: "CEN", role: "Bloqueio e jogadas de meio" },
    { key: "Líbero", abbr: "LIB", role: "Especialista em defesa" },
    { key: "Coringa", abbr: "COR", role: "Joga em qualquer posição" },
];

const ONB_LEVELS = [
    {
        key: "Iniciante",
        desc: "Ainda aprendendo as regras e fundamentos",
        bars: 1,
    },
    {
        key: "Intermediário",
        desc: "Joga bem, tem experiência em partidas",
        bars: 2,
    },
    { key: "Avançado", desc: "Alta performance, leva a sério", bars: 3 },
];

const ONB_MODES = [
    {
        key: "Vôlei de quadra",
        desc: "Clássico 6x6, na quadra coberta",
        tint: QUADRA.blue,
        label: "QUADRA",
    },
    {
        key: "Vôlei de praia",
        desc: "Dupla 2x2, no calor da areia",
        tint: "#00B4D8",
        label: "PRAIA",
    },
];

// ── Indicador de progresso (3 passos de seleção) ─────────────
function ONBStepper({ step, dark = false, complete = false }) {
    const total = 3;
    const filled = complete ? total : step + 1;
    const track = dark ? "rgba(255,255,255,.22)" : "rgba(10,10,60,.1)";
    const eyebrow = dark ? "rgba(255,255,255,.7)" : QUADRA.muted;
    const accent = complete ? QUADRA.brightLime : QUADRA.blue;
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <span
                    className="q-mono"
                    style={{
                        fontSize: 10.5,
                        letterSpacing: 1.6,
                        textTransform: "uppercase",
                        color: eyebrow,
                    }}
                >
                    {complete ? "Perfil completo" : "Monte seu perfil"}
                </span>
                <span
                    className="q-mono"
                    style={{ fontSize: 10.5, letterSpacing: 1, color: eyebrow }}
                >
                    {complete ? (
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                color: QUADRA.brightLime,
                            }}
                        >
                            <Icon
                                name="check"
                                size={12}
                                stroke={QUADRA.brightLime}
                                sw={3}
                            />{" "}
                            3/3
                        </span>
                    ) : (
                        `Passo ${step + 1} de ${total}`
                    )}
                </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: total }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            overflow: "hidden",
                            background: track,
                        }}
                    >
                        <div
                            style={{
                                height: "100%",
                                borderRadius: 3,
                                transition: "width .4s cubic-bezier(.4,0,.2,1)",
                                width: i < filled ? "100%" : "0%",
                                background:
                                    i === total - 1 && complete
                                        ? `linear-gradient(90deg, ${QUADRA.blue}, ${QUADRA.brightLime})`
                                        : accent,
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Selo de seleção (check) ──────────────────────────────────
function ONBCheck({ size = 24, style = {} }) {
    return (
        <span
            className="q-pop"
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: QUADRA.blue,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(26,26,255,.35)",
                ...style,
            }}
        >
            <Icon name="check" size={size * 0.6} stroke="#fff" sw={3} />
        </span>
    );
}

// ── Barras de nível ──────────────────────────────────────────
function ONBBars({ n, on }) {
    const heights = [9, 15, 21];
    const c = on ? QUADRA.blue : QUADRA.muted;
    const dim = on ? "rgba(26,26,255,.18)" : "rgba(10,10,60,.12)";
    return (
        <div
            style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                height: 21,
            }}
        >
            {heights.map((h, i) => (
                <div
                    key={i}
                    style={{
                        width: 6,
                        height: h,
                        borderRadius: 3,
                        background: i < n ? c : dim,
                        transition: "background .2s",
                    }}
                />
            ))}
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// ONBOARDING
// ════════════════════════════════════════════════════════════
function OnboardingScreen({ go, setStatusDark }) {
    const [step, setStep] = useState(0);
    const [pos, setPos] = useState(null);
    const [lvl, setLvl] = useState(null);
    const [mode, setMode] = useState(null);

    // passos 0–2 = claro; passo 3 (resumo) = navy → status bar branca
    useEffect(() => {
        if (setStatusDark) setStatusDark(step === 3 ? true : false);
        return () => {
            if (setStatusDark) setStatusDark(null);
        };
    }, [step]);

    const canContinue =
        step === 0 ? !!pos : step === 1 ? !!lvl : step === 2 ? !!mode : true;
    const next = () => setStep((s) => Math.min(3, s + 1));

    const titles = [
        {
            t: "Qual sua posição?",
            s: "Escolha onde você joga melhor. Isso equilibra os times nas partidas.",
        },
        {
            t: "Seu nível de jogo",
            s: "Seja sincero — é o que garante partidas justas e equilibradas.",
        },
        {
            t: "Modalidade favorita",
            s: "Onde você curte mais entrar em quadra?",
        },
    ];

    // ── RESUMO (passo 3) ───────────────────────────────────────
    if (step === 3) {
        const posData = ONB_POSITIONS.find((p) => p.key === pos);
        const lvlData = ONB_LEVELS.find((l) => l.key === lvl);
        const modeData = ONB_MODES.find((m) => m.key === mode);
        const rowBase = {
            display: "flex",
            alignItems: "center",
            gap: 13,
            padding: "14px 16px",
        };
        const sep = { borderTop: "1px solid rgba(255,255,255,.1)" };
        const rowLabel = {
            fontFamily: '"DM Sans",sans-serif',
            fontSize: 11,
            letterSpacing: 0.4,
            color: "rgba(255,255,255,.55)",
        };
        const rowVal = {
            fontFamily: '"DM Sans",sans-serif',
            fontWeight: 700,
            fontSize: 15,
            color: "#fff",
        };

        return (
            <div
                style={{
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                    background: `linear-gradient(165deg, ${QUADRA.navy} 0%, #14146b 60%, ${QUADRA.blue} 135%)`,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Blob
                    color={QUADRA.blue}
                    size={280}
                    style={{ top: -90, right: -90 }}
                />
                <Blob
                    color={QUADRA.lime}
                    size={240}
                    style={{ bottom: -60, left: -80 }}
                />

                {/* progresso completo no topo */}
                <div
                    style={{
                        flexShrink: 0,
                        padding: `${SAFE_TOP - 8}px 26px 0`,
                        position: "relative",
                        zIndex: 2,
                    }}
                >
                    <ONBStepper step={2} dark complete />
                </div>

                <div
                    className="q-scroll"
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        position: "relative",
                        zIndex: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        padding: "26px 30px 12px",
                    }}
                >
                    <div
                        className="q-pop"
                        style={{
                            width: 92,
                            height: 92,
                            borderRadius: "50%",
                            background: QUADRA.brightLime,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 14px 44px rgba(170,221,0,.45)",
                        }}
                    >
                        <Icon
                            name="check"
                            size={46}
                            stroke={QUADRA.navy}
                            sw={3}
                        />
                    </div>
                    <h1
                        className="q-bebas q-rise"
                        style={{
                            fontSize: 32,
                            color: "#fff",
                            letterSpacing: 1,
                            margin: "24px 0 0",
                            lineHeight: 1,
                        }}
                    >
                        Perfil pronto!
                    </h1>
                    <p
                        className="q-rise"
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontSize: 15,
                            lineHeight: 1.5,
                            color: "rgba(255,255,255,.78)",
                            margin: "10px 0 0",
                            maxWidth: 280,
                            animationDelay: ".06s",
                        }}
                    >
                        Já dá pra montar times equilibrados pra você. Bora
                        encontrar partidas perto e entrar em quadra.
                    </p>

                    {/* resumo das seleções */}
                    <div
                        className="q-rise"
                        style={{
                            width: "100%",
                            marginTop: 26,
                            borderRadius: 22,
                            overflow: "hidden",
                            background: "rgba(255,255,255,.07)",
                            border: "1px solid rgba(255,255,255,.14)",
                            backdropFilter: "blur(8px)",
                            WebkitBackdropFilter: "blur(8px)",
                            animationDelay: ".12s",
                        }}
                    >
                        {/* posição */}
                        <div style={rowBase}>
                            <span
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 13,
                                    flexShrink: 0,
                                    background: POSCOLOR[pos],
                                    color: readableOn(POSCOLOR[pos]),
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontWeight: 800,
                                    fontSize: 14,
                                    letterSpacing: 0.5,
                                }}
                            >
                                {posData.abbr}
                            </span>
                            <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={rowLabel}>Posição</div>
                                <div style={rowVal}>{pos}</div>
                            </div>
                        </div>
                        {/* nível */}
                        <div style={{ ...rowBase, ...sep }}>
                            <span
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 13,
                                    flexShrink: 0,
                                    background: "rgba(255,255,255,.1)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <ONBBars n={lvlData.bars} on={false} />
                            </span>
                            <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={rowLabel}>Nível</div>
                                <div style={rowVal}>{lvl}</div>
                            </div>
                        </div>
                        {/* modalidade */}
                        <div style={{ ...rowBase, ...sep }}>
                            <span
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 13,
                                    flexShrink: 0,
                                    background: modeData.tint,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Icon name="volley" size={22} stroke="#fff" />
                            </span>
                            <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={rowLabel}>Modalidade</div>
                                <div style={rowVal}>{mode}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA final */}
                <div
                    style={{
                        flexShrink: 0,
                        padding: `14px 26px ${SAFE_BOTTOM + 12}px`,
                        position: "relative",
                        zIndex: 2,
                    }}
                >
                    <Btn
                        kind="grad"
                        full
                        icon="volley"
                        onClick={() => go("home")}
                    >
                        Entrar na quadra
                    </Btn>
                </div>
            </div>
        );
    }

    // ── PASSOS DE SELEÇÃO (0–2) ────────────────────────────────
    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: QUADRA.lightBg,
                overflow: "hidden",
            }}
        >
            {/* topo: progresso (sem voltar) */}
            <div
                style={{
                    flexShrink: 0,
                    padding: `${SAFE_TOP - 2}px 24px 16px`,
                    background: QUADRA.lightBg,
                    position: "relative",
                    zIndex: 5,
                }}
            >
                <ONBStepper step={step} />
            </div>

            {/* conteúdo do passo */}
            <div
                key={step}
                className="q-scroll q-rise"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: "4px 22px 20px",
                }}
            >
                <h1
                    className="q-bebas"
                    style={{
                        fontSize: 26,
                        color: QUADRA.navy,
                        letterSpacing: 0.5,
                        margin: "4px 0 6px",
                        lineHeight: 1.02,
                    }}
                >
                    {titles[step].t}
                </h1>
                <p
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontSize: 13.5,
                        lineHeight: 1.45,
                        color: QUADRA.muted,
                        margin: "0 0 22px",
                    }}
                >
                    {titles[step].s}
                </p>

                {/* PASSO 1 — POSIÇÃO */}
                {step === 0 && (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                        }}
                    >
                        {ONB_POSITIONS.map((p, i) => {
                            const on = pos === p.key;
                            const wild = p.key === "Coringa";
                            const c = POSCOLOR[p.key];
                            const titleColor = QUADRA.navy;
                            const roleColor = wild
                                ? "rgba(10,10,60,.62)"
                                : QUADRA.muted;
                            const abbrColor = wild ? QUADRA.navy : QUADRA.blue;
                            return (
                                <button
                                    key={p.key}
                                    onClick={() => setPos(p.key)}
                                    className="q-rise"
                                    style={{
                                        position: "relative",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        background: wild
                                            ? QUADRA.brightLime
                                            : "#fff",
                                        borderRadius: 20,
                                        padding: "15px 14px 14px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 11,
                                        border: `2px solid ${on ? QUADRA.blue : "transparent"}`,
                                        boxShadow: on
                                            ? "0 9px 24px rgba(26,26,255,.16)"
                                            : wild
                                              ? "0 6px 18px rgba(170,221,0,.3)"
                                              : "0 2px 12px rgba(10,10,60,.06)",
                                        transform: on
                                            ? "translateY(-2px)"
                                            : "none",
                                        transition: "all .2s",
                                        WebkitTapHighlightColor: "transparent",
                                        animationDelay: `${0.04 * i}s`,
                                    }}
                                >
                                    {on && (
                                        <ONBCheck
                                            style={{
                                                position: "absolute",
                                                top: 11,
                                                right: 11,
                                            }}
                                        />
                                    )}
                                    <span
                                        style={{
                                            fontFamily: '"DM Sans",sans-serif',
                                            fontWeight: 800,
                                            fontSize: 22,
                                            letterSpacing: 1.5,
                                            textTransform: "uppercase",
                                            color: abbrColor,
                                        }}
                                    >
                                        {p.abbr}
                                    </span>
                                    <div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontFamily:
                                                        '"DM Sans",sans-serif',
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                    color: titleColor,
                                                }}
                                            >
                                                {p.key}
                                            </span>
                                            {wild && (
                                                <Icon
                                                    name="star"
                                                    size={13}
                                                    stroke={QUADRA.navy}
                                                    fill={QUADRA.navy}
                                                />
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily:
                                                    '"DM Sans",sans-serif',
                                                fontSize: 11.5,
                                                lineHeight: 1.3,
                                                color: roleColor,
                                                marginTop: 3,
                                            }}
                                        >
                                            {p.role}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* PASSO 2 — NÍVEL */}
                {step === 1 && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                    >
                        {ONB_LEVELS.map((l, i) => {
                            const on = lvl === l.key;
                            return (
                                <button
                                    key={l.key}
                                    onClick={() => setLvl(l.key)}
                                    className="q-rise"
                                    style={{
                                        position: "relative",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        background: "#fff",
                                        borderRadius: 20,
                                        padding: "16px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 15,
                                        border: `2px solid ${on ? QUADRA.blue : "transparent"}`,
                                        boxShadow: on
                                            ? "0 9px 24px rgba(26,26,255,.16)"
                                            : "0 2px 12px rgba(10,10,60,.06)",
                                        transform: on
                                            ? "translateY(-2px)"
                                            : "none",
                                        transition: "all .2s",
                                        WebkitTapHighlightColor: "transparent",
                                        animationDelay: `${0.05 * i}s`,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: 15,
                                            flexShrink: 0,
                                            background: on
                                                ? "rgba(26,26,255,.08)"
                                                : QUADRA.lightBg,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <ONBBars n={l.bars} on={on} />
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div
                                            style={{
                                                fontFamily:
                                                    '"DM Sans",sans-serif',
                                                fontWeight: 700,
                                                fontSize: 16,
                                                color: QUADRA.navy,
                                            }}
                                        >
                                            {l.key}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily:
                                                    '"DM Sans",sans-serif',
                                                fontSize: 12.5,
                                                lineHeight: 1.35,
                                                color: QUADRA.muted,
                                                marginTop: 2,
                                            }}
                                        >
                                            {l.desc}
                                        </div>
                                    </div>
                                    <span
                                        style={{
                                            flexShrink: 0,
                                            width: 24,
                                            height: 24,
                                            borderRadius: "50%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: on
                                                ? QUADRA.blue
                                                : "transparent",
                                            border: on
                                                ? "none"
                                                : "2px solid rgba(10,10,60,.16)",
                                            boxShadow: on
                                                ? "0 4px 12px rgba(26,26,255,.35)"
                                                : "none",
                                        }}
                                    >
                                        {on && (
                                            <Icon
                                                name="check"
                                                size={14}
                                                stroke="#fff"
                                                sw={3}
                                            />
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* PASSO 3 — MODALIDADE */}
                {step === 2 && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 14,
                        }}
                    >
                        {ONB_MODES.map((m, i) => {
                            const on = mode === m.key;
                            return (
                                <button
                                    key={m.key}
                                    onClick={() => setMode(m.key)}
                                    className="q-rise"
                                    style={{
                                        position: "relative",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        background: "#fff",
                                        borderRadius: 22,
                                        padding: 0,
                                        overflow: "hidden",
                                        border: `2px solid ${on ? QUADRA.blue : "transparent"}`,
                                        boxShadow: on
                                            ? "0 12px 28px rgba(26,26,255,.18)"
                                            : "0 2px 14px rgba(10,10,60,.07)",
                                        transform: on
                                            ? "translateY(-2px)"
                                            : "none",
                                        transition: "all .2s",
                                        WebkitTapHighlightColor: "transparent",
                                        animationDelay: `${0.06 * i}s`,
                                    }}
                                >
                                    <CourtImage
                                        tint={m.tint}
                                        height={118}
                                        radius={0}
                                        label={m.label}
                                    >
                                        {on && (
                                            <ONBCheck
                                                size={28}
                                                style={{
                                                    position: "absolute",
                                                    top: 12,
                                                    right: 12,
                                                }}
                                            />
                                        )}
                                    </CourtImage>
                                    <div style={{ padding: "14px 16px" }}>
                                        <div
                                            style={{
                                                fontFamily:
                                                    '"DM Sans",sans-serif',
                                                fontWeight: 700,
                                                fontSize: 16.5,
                                                color: QUADRA.navy,
                                            }}
                                        >
                                            {m.key}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily:
                                                    '"DM Sans",sans-serif',
                                                fontSize: 13,
                                                color: QUADRA.muted,
                                                marginTop: 2,
                                            }}
                                        >
                                            {m.desc}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CTA — Continuar (desabilitado até selecionar) */}
            <div
                style={{
                    flexShrink: 0,
                    background: "#fff",
                    borderTop: "1px solid rgba(10,10,60,.06)",
                    padding: `14px 22px ${SAFE_BOTTOM + 10}px`,
                }}
            >
                <Btn
                    kind="grad"
                    full
                    icon="chevR"
                    disabled={!canContinue}
                    onClick={next}
                >
                    Continuar
                </Btn>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// CADASTRO (nome, sobrenome, nascimento, apelido) — antes do onboarding
// ════════════════════════════════════════════════════════════
function CadastroScreen({ back, go }) {
    const [nome, setNome] = useState("");
    const [sobre, setSobre] = useState("");
    const [nasc, setNasc] = useState("");
    const [user, setUser] = useState("");

    const fmtDate = (v) => {
        const d = v.replace(/\D/g, "").slice(0, 8);
        if (d.length <= 2) return d;
        if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
        return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    };
    const cleanUser = (v) =>
        v
            .toLowerCase()
            .replace(/[^a-z0-9_.]/g, "")
            .slice(0, 18);
    const userOk = user.length >= 3;
    const valid = nome.trim() && sobre.trim() && nasc.length === 10 && userOk;

    const FieldLabel = ({ children, style }) => (
        <div
            style={{
                fontFamily: '"DM Sans",sans-serif',
                fontWeight: 700,
                fontSize: 11,
                color: QUADRA.navy,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginBottom: 9,
                ...style,
            }}
        >
            {children}
        </div>
    );

    const inputStyle = {
        width: "100%",
        boxSizing: "border-box",
        padding: "15px 16px",
        borderRadius: 18,
        border: "1px solid rgba(26,26,255,.1)",
        fontFamily: '"DM Sans",sans-serif',
        fontSize: 15,
        color: QUADRA.text,
        background: "#fff",
        outline: "none",
    };

    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: QUADRA.lightBg,
                overflow: "hidden",
            }}
        >
            {/* topo navy — mesma linguagem do login/auth */}
            <div
                style={{
                    position: "relative",
                    flexShrink: 0,
                    overflow: "hidden",
                    background: `linear-gradient(165deg, ${QUADRA.navy} 0%, #14146b 60%, ${QUADRA.blue} 130%)`,
                    height: 188,
                }}
            >
                <Blob
                    color={QUADRA.blue}
                    size={200}
                    style={{ top: -70, right: -70 }}
                />
                <Blob
                    color={QUADRA.lime}
                    size={170}
                    style={{ bottom: -50, left: -60 }}
                />
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 390 200"
                    preserveAspectRatio="none"
                    style={{ position: "absolute", inset: 0, opacity: 0.07 }}
                >
                    <g stroke="#fff" strokeWidth="1.5" fill="none">
                        <rect x="70" y="34" width="250" height="150" rx="4" />
                        <line x1="70" y1="109" x2="320" y2="109" />
                    </g>
                </svg>
                <div
                    style={{
                        position: "absolute",
                        top: SAFE_TOP - 12,
                        left: 14,
                    }}
                >
                    <IconBtn
                        name="chevL"
                        dark
                        fill="rgba(255,255,255,.14)"
                        onClick={back}
                    />
                </div>
                <div
                    style={{
                        position: "absolute",
                        left: 26,
                        right: 26,
                        bottom: 30,
                        margin: "10px",
                    }}
                >
                    <span
                        className="q-mono"
                        style={{
                            fontSize: 10.5,
                            letterSpacing: 1.6,
                            textTransform: "uppercase",
                            color: "rgba(255,255,255,.65)",
                        }}
                    >
                        Sua conta
                    </span>
                    <h1
                        className="q-bebas"
                        style={{
                            fontSize: 30,
                            color: "#fff",
                            letterSpacing: 0.8,
                            lineHeight: 1,
                            margin: "0px",
                            padding: "0px 0px 1.01123e+09px",
                        }}
                    >
                        Quem é você?
                    </h1>
                </div>
            </div>

            {/* folha branca */}
            <div
                className="q-scroll"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    background: "#fff",
                    marginTop: -28,
                    borderRadius: "30px 30px 0 0",
                    padding: "28px 24px 14px",
                    position: "relative",
                    boxShadow: "0 -8px 30px rgba(10,10,60,.12)",
                }}
            >
                {/* nome + sobrenome */}
                <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <FieldLabel>Nome</FieldLabel>
                        <input
                            className="q-input"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Renan"
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <FieldLabel>Sobrenome</FieldLabel>
                        <input
                            className="q-input"
                            value={sobre}
                            onChange={(e) => setSobre(e.target.value)}
                            placeholder="Dias"
                            style={inputStyle}
                        />
                    </div>
                </div>

                {/* data de nascimento */}
                <FieldLabel style={{ marginTop: 20 }}>
                    Data de nascimento
                </FieldLabel>
                <div style={{ position: "relative" }}>
                    <span
                        style={{
                            position: "absolute",
                            left: 16,
                            top: "50%",
                            transform: "translateY(-50%)",
                        }}
                    >
                        <Icon name="cal" size={18} stroke={QUADRA.blue} />
                    </span>
                    <input
                        className="q-input"
                        inputMode="numeric"
                        value={nasc}
                        onChange={(e) => setNasc(fmtDate(e.target.value))}
                        placeholder="DD/MM/AAAA"
                        style={{
                            ...inputStyle,
                            padding: "15px 16px 15px 44px",
                        }}
                    />
                </div>

                {/* apelido — destaque diferenciado */}
                <div
                    style={{
                        marginTop: 24,
                        background: "rgba(26,26,255,.04)",
                        border: "1px solid rgba(26,26,255,.12)",
                        borderRadius: 22,
                        padding: "16px 16px 18px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                            marginBottom: 10,
                        }}
                    >
                        <FieldLabel
                            style={{ marginBottom: 0, whiteSpace: "nowrap" }}
                        >
                            Apelido
                        </FieldLabel>
                        <Tag
                            bg={QUADRA.brightLime}
                            color={QUADRA.navy}
                            style={{ whiteSpace: "nowrap" }}
                        >
                            Seu @ na quadra
                        </Tag>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "#fff",
                            borderRadius: 18,
                            border: `2px solid ${userOk ? QUADRA.blue : "rgba(26,26,255,.22)"}`,
                            padding: "4px 14px 4px 16px",
                            boxShadow: userOk
                                ? "0 6px 18px rgba(26,26,255,.16)"
                                : "none",
                            transition: "all .2s",
                        }}
                    >
                        <span
                            style={{
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: 800,
                                fontSize: 19,
                                color: QUADRA.blue,
                            }}
                        >
                            @
                        </span>
                        <input
                            className="q-input"
                            value={user}
                            onChange={(e) => setUser(cleanUser(e.target.value))}
                            placeholder="renan"
                            style={{
                                flex: 1,
                                minWidth: 0,
                                boxSizing: "border-box",
                                padding: "12px 0",
                                border: "none",
                                outline: "none",
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: 700,
                                fontSize: 17,
                                color: QUADRA.navy,
                                background: "transparent",
                            }}
                        />
                        {userOk && (
                            <span
                                className="q-pop"
                                style={{
                                    flexShrink: 0,
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    background: QUADRA.brightLime,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Icon
                                    name="check"
                                    size={14}
                                    stroke={QUADRA.navy}
                                    sw={3}
                                />
                            </span>
                        )}
                    </div>
                    <p
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontSize: 12,
                            color: QUADRA.muted,
                            margin: "10px 2px 0",
                            lineHeight: 1.4,
                        }}
                    >
                        É assim que a galera vai te encontrar e marcar nas
                        partidas.
                    </p>
                </div>

                <div style={{ marginTop: 24 }}>
                    <Btn
                        kind="grad"
                        full
                        disabled={!valid}
                        onClick={() => go("onboard")}
                    >
                        Continuar
                    </Btn>
                </div>
                <p
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontSize: 11,
                        color: QUADRA.muted,
                        textAlign: "center",
                        margin: "16px 0 0",
                        lineHeight: 1.5,
                    }}
                >
                    Você poderá editar essas informações depois no seu perfil.
                </p>
            </div>
        </div>
    );
}

Object.assign(window, { OnboardingScreen, CadastroScreen });
