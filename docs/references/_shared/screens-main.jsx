// Quadra — Login, Home, Explorar. Loaded after chrome.jsx.
var { useState, useEffect, useRef } = React;

// ════════════════════════════════════════════════════════════
// LOGIN / WELCOME
// ════════════════════════════════════════════════════════════
function LoginScreen({ go }) {
    return (
        <div
            style={{
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: `linear-gradient(165deg, ${QUADRA.navy} 0%, #14146b 55%, ${QUADRA.blue} 130%)`,
            }}
        >
            <Blob
                color={QUADRA.blue}
                size={300}
                style={{ top: -80, right: -90 }}
            />
            <Blob
                color={QUADRA.lime}
                size={260}
                style={{ bottom: -60, left: -80 }}
            />
            {/* court motif faint */}
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 390 844"
                preserveAspectRatio="none"
                style={{ position: "absolute", inset: 0, opacity: 0.06 }}
            >
                <g stroke="#fff" strokeWidth="1.5" fill="none">
                    <rect x="60" y="120" width="270" height="500" rx="4" />
                    <line x1="60" y1="370" x2="330" y2="370" />
                </g>
            </svg>

            <div
                style={{
                    position: "relative",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    padding: `${SAFE_TOP + 24}px 32px ${SAFE_BOTTOM + 28}px`,
                }}
            >
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}
                >
                    <div className="q-rise">
                        <Wordmark size={40} color="#fff" />
                    </div>
                    <h1
                        className="q-bebas q-rise"
                        style={{
                            fontSize: 46,
                            lineHeight: 0.92,
                            color: "#fff",
                            letterSpacing: 1,
                            margin: "26px 0 0",
                            animationDelay: ".06s",
                        }}
                    >
                        O JOGO
                        <br />
                        COMEÇA
                        <br />
                        <span style={{ color: QUADRA.brightLime }}>AQUI.</span>
                    </h1>
                    <p
                        className="q-rise"
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontSize: 16,
                            lineHeight: 1.5,
                            color: "rgba(255,255,255,.75)",
                            marginTop: 18,
                            maxWidth: 280,
                            animationDelay: ".12s",
                        }}
                    >
                        Encontre partidas de vôlei perto de você, monte seu time
                        e suba no ranking.
                    </p>
                </div>
                <div
                    className="q-rise"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        animationDelay: ".18s",
                    }}
                >
                    <Btn kind="grad" full flat onClick={() => go("auth")}>
                        Entrar e jogar
                    </Btn>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// AUTENTICAÇÃO · TELEFONE (Criar conta)
// ════════════════════════════════════════════════════════════
function AuthScreen({ back, go }) {
    const [phone, setPhone] = useState("");
    const fmt = (v) => {
        const d = v.replace(/\D/g, "").slice(0, 11);
        if (d.length <= 2) return d.length ? `(${d}` : "";
        if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    };
    const valid = phone.replace(/\D/g, "").length >= 10;

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
            {/* top navy panel — same visual language as onboarding */}
            <div
                style={{
                    position: "relative",
                    flexShrink: 0,
                    overflow: "hidden",
                    background: `linear-gradient(165deg, ${QUADRA.navy} 0%, #14146b 60%, ${QUADRA.blue} 130%)`,
                    height: 236,
                }}
            >
                <Blob
                    color={QUADRA.blue}
                    size={220}
                    style={{ top: -80, right: -80 }}
                />
                <Blob
                    color={QUADRA.lime}
                    size={180}
                    style={{ bottom: -50, left: -70 }}
                />
                {/* faint court motif (matches login) */}
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 390 248"
                    preserveAspectRatio="none"
                    style={{ position: "absolute", inset: 0, opacity: 0.07 }}
                >
                    <g stroke="#fff" strokeWidth="1.5" fill="none">
                        <rect x="70" y="40" width="250" height="190" rx="4" />
                        <line x1="70" y1="135" x2="320" y2="135" />
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
                        left: 0,
                        right: 0,
                        bottom: 48,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        fontSize: "6px",
                        fontWeight: "700",
                        gap: "1122px",
                        width: "390px",
                        height: "52px",
                    }}
                >
                    <LogoMark size={52} />
                </div>
            </div>

            {/* white sheet — rounded top corners rise over the flat navy header */}
            <div
                className="q-scroll"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    background: "#fff",
                    marginTop: -30,
                    borderRadius: "30px 30px 0 0",
                    padding: "32px 26px 28px",
                    position: "relative",
                    boxShadow: "0 -8px 30px rgba(10,10,60,.12)",
                }}
            >
                <h1
                    className="q-bebas"
                    style={{
                        fontSize: 24,
                        color: QUADRA.navy,
                        letterSpacing: 0.6,
                        margin: "0 0 4px",
                        lineHeight: 1,
                    }}
                >
                    Acesse sua conta
                </h1>
                <p
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontSize: 13.5,
                        color: QUADRA.muted,
                        margin: "0 0 26px",
                    }}
                >
                    Use seu telefone para entrar ou criar conta.
                </p>

                <div
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontWeight: 700,
                        fontSize: 11,
                        color: QUADRA.navy,
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                        marginBottom: 10,
                    }}
                >
                    Número de telefone
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "0 16px",
                            borderRadius: 18,
                            background: QUADRA.lightBg,
                            border: "1px solid rgba(26,26,255,.1)",
                            flexShrink: 0,
                        }}
                    >
                        <span style={{ fontSize: 18 }}>🇧🇷</span>{" "}
                        <span
                            style={{
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: 700,
                                fontSize: 14,
                                color: QUADRA.navy,
                            }}
                        >
                            +55
                        </span>
                    </div>
                    <input
                        className="q-input"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(fmt(e.target.value))}
                        placeholder="(11) 00000-0000"
                        style={{
                            flex: 1,
                            minWidth: 0,
                            boxSizing: "border-box",
                            padding: "15px 16px",
                            borderRadius: 18,
                            border: "1px solid rgba(26,26,255,.1)",
                            fontFamily: '"DM Sans",sans-serif',
                            fontSize: 15,
                            color: QUADRA.text,
                            background: "#fff",
                            outline: "none",
                        }}
                    />
                </div>

                <Btn
                    kind="grad"
                    full
                    disabled={!valid}
                    onClick={() => go("cadastro")}
                >
                    Entrar na Quadra
                </Btn>

                {/* divider */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        margin: "20px 0",
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: 1,
                            background: "rgba(10,10,60,.1)",
                        }}
                    />
                    <span
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontSize: 12,
                            color: QUADRA.muted,
                        }}
                    >
                        ou
                    </span>
                    <div
                        style={{
                            flex: 1,
                            height: 1,
                            background: "rgba(10,10,60,.1)",
                        }}
                    />
                </div>

                <button
                    onClick={() => go("onboard")}
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        padding: "14px",
                        borderRadius: 18,
                        cursor: "pointer",
                        background: "#fff",
                        border: "1px solid rgba(10,10,60,.14)",
                        fontFamily: '"DM Sans",sans-serif',
                        fontWeight: 600,
                        fontSize: 15,
                        color: QUADRA.text,
                    }}
                >
                    <span
                        style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: "#fff",
                            border: "1px solid rgba(10,10,60,.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: '"DM Sans",sans-serif',
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#4285F4",
                        }}
                    >
                        G
                    </span>
                    Entrar com Google
                </button>

                <div style={{ textAlign: "center", marginTop: 20 }}>
                    <button
                        style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            fontFamily: '"DM Sans",sans-serif',
                            fontWeight: 700,
                            fontSize: 13,
                            color: QUADRA.blue,
                        }}
                    >
                        Esqueceu a senha?
                    </button>
                </div>
                <p
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontSize: 11,
                        color: QUADRA.muted,
                        textAlign: "center",
                        marginTop: 18,
                        lineHeight: 1.5,
                    }}
                >
                    Ao continuar, você aceita os{" "}
                    <b style={{ color: QUADRA.navy }}>Termos</b> e a{" "}
                    <b style={{ color: QUADRA.navy }}>
                        Política de Privacidade
                    </b>
                    .
                </p>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════════════
function HomeScreen({ go, navProps }) {
    const statusStyle = (s) =>
        s === "confirmado"
            ? { bg: QUADRA.blue, color: "#fff" }
            : { bg: QUADRA.lime, color: QUADRA.navy };

    const header = <Header title="INÍCIO" right={<HeaderRight go={go} />} />;

    return (
        <ScreenShell header={header} nav navProps={navProps}>
            {/* Dual CTA */}
            <Card pad={18} style={{ marginBottom: 24 }}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontWeight: 700,
                            fontSize: 19,
                            color: QUADRA.navy,
                        }}
                    >
                        Bora pra quadra?
                    </div>
                    <div
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontSize: 16,
                            color: QUADRA.muted,
                            marginTop: 2,
                        }}
                    >
                        Crie ou encontre um jogo agora
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                    }}
                >
                    <Btn
                        kind="grad"
                        full
                        onClick={() => go("create")}
                        style={{ fontSize: 17 }}
                    >
                        Criar partida
                    </Btn>
                    <Btn
                        kind="outline"
                        full
                        onClick={() => navProps.go("explore")}
                        style={{ fontSize: 17 }}
                    >
                        Procurar partidas
                    </Btn>
                </div>
            </Card>

            {/* Próximas partidas */}
            <SectionTitle
                action="Ver todas"
                onAction={() => navProps.go("explore")}
            >
                Próximas partidas
            </SectionTitle>
            <div
                className="q-scroll"
                style={{
                    display: "flex",
                    gap: 14,
                    overflowX: "auto",
                    margin: "0 -20px 26px",
                    padding: "2px 20px 8px",
                }}
            >
                {UPCOMING.map((m) => {
                    const catBlue = m.cat === "Casual";
                    return (
                        <Card
                            key={m.id}
                            hover
                            onClick={() => go("detail", m)}
                            pad={0}
                            style={{
                                width: 262,
                                flexShrink: 0,
                                overflow: "hidden",
                            }}
                        >
                            {/* image on top (default court placeholder) */}
                            <div style={{ position: "relative" }}>
                                <CourtImage
                                    tint={m.tint}
                                    height={124}
                                    radius={0}
                                    label=""
                                >
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background:
                                                "linear-gradient(180deg, rgba(10,10,60,0.18) 0%, transparent 55%)",
                                        }}
                                    />
                                </CourtImage>
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 10,
                                        left: 10,
                                    }}
                                >
                                    <Tag
                                        bg={catBlue ? QUADRA.blue : QUADRA.lime}
                                        color={catBlue ? "#fff" : QUADRA.navy}
                                    >
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: "50%",
                                                background: catBlue
                                                    ? "#fff"
                                                    : QUADRA.navy,
                                            }}
                                        />
                                        {m.cat}
                                    </Tag>
                                </div>
                            </div>
                            {/* content below */}
                            <div style={{ padding: "13px 14px 14px" }}>
                                <div
                                    style={{
                                        fontFamily: '"DM Sans",sans-serif',
                                        fontWeight: 700,
                                        fontSize: 16,
                                        color: QUADRA.navy,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {m.title}
                                </div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 5,
                                        color: QUADRA.muted,
                                        fontSize: 12.5,
                                        fontFamily: '"DM Sans",sans-serif',
                                        marginTop: 6,
                                    }}
                                >
                                    <Icon
                                        name="clock"
                                        size={14}
                                        stroke={QUADRA.muted}
                                    />
                                    {m.time}
                                </div>
                                {/* bottom row: avatar stack + meta pills */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 8,
                                        marginTop: 13,
                                        paddingTop: 13,
                                        borderTop:
                                            "1px solid rgba(10,10,60,.06)",
                                    }}
                                >
                                    <AvatarStack
                                        ids={m.crew}
                                        more={m.more}
                                        size={26}
                                    />
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
                                                fontSize: 11.5,
                                                color: QUADRA.blue,
                                                background:
                                                    "rgba(26,26,255,.08)",
                                                padding: "5px 10px",
                                                borderRadius: 20,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {m.vagas} vagas
                                        </span>
                                        <span
                                            style={{
                                                fontFamily:
                                                    '"DM Sans",sans-serif',
                                                fontWeight: 700,
                                                fontSize: 11.5,
                                                color:
                                                    m.price === "Grátis"
                                                        ? "#1F8A5B"
                                                        : QUADRA.navy,
                                                background: QUADRA.lightBg,
                                                padding: "5px 10px",
                                                borderRadius: 20,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {m.price}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Jogos perto de você */}
            <SectionTitle action="Mapa" onAction={() => navProps.go("explore")}>
                Jogos perto de você
            </SectionTitle>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                }}
            >
                {NEARBY.map((n) => (
                    <NearbyCard
                        key={n.id}
                        n={n}
                        onClick={() => go("detail", n)}
                    />
                ))}
            </div>
        </ScreenShell>
    );
}

function NearbyCard({ n, onClick }) {
    const [h, setH] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{
                cursor: "pointer",
                transform: h ? "translateY(-4px)" : "none",
                transition: "transform .25s cubic-bezier(.4,0,.2,1)",
            }}
        >
            <CourtImage tint={n.tint} height={172} radius={16} label="">
                {/* dark gradient bottom */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        background:
                            "linear-gradient(180deg, rgba(10,10,60,.05) 35%, rgba(10,10,60,.82) 100%)",
                    }}
                />
                {/* tags top-left */}
                <div
                    style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        alignItems: "flex-start",
                    }}
                >
                    <Tag bg="rgba(255,255,255,.92)" color={QUADRA.navy}>
                        {n.mode}
                    </Tag>
                    <Tag bg={QUADRA.lime} color={QUADRA.navy}>
                        {n.level}
                    </Tag>
                </div>
                {/* bottom info */}
                <div
                    style={{
                        position: "absolute",
                        left: 11,
                        right: 11,
                        bottom: 10,
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            marginBottom: 3,
                        }}
                    >
                        <Icon name="pin" size={11} stroke={QUADRA.brightLime} />
                        <span
                            className="q-mono"
                            style={{
                                fontSize: 9.5,
                                letterSpacing: 0.5,
                                color: QUADRA.brightLime,
                            }}
                        >
                            {n.dist}
                        </span>
                    </div>
                    <div
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#fff",
                            lineHeight: 1.15,
                        }}
                    >
                        {n.name}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 6,
                        }}
                    >
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                color: "rgba(255,255,255,.8)",
                                fontSize: 11,
                                fontFamily: '"DM Sans",sans-serif',
                            }}
                        >
                            <Icon
                                name="users"
                                size={13}
                                stroke="rgba(255,255,255,.8)"
                            />
                            {n.players}/{n.cap}
                        </span>
                        <span
                            className="q-num"
                            style={{
                                fontSize: 16,
                                letterSpacing: 0.5,
                                whiteSpace: "nowrap",
                                color: QUADRA.brightLime,
                            }}
                        >
                            {n.price}
                        </span>
                    </div>
                </div>
            </CourtImage>
        </div>
    );
}

// ════════════════════════════════════════════════════════════
// EXPLORAR
// ════════════════════════════════════════════════════════════
function ExploreMap({ go }) {
    const arenas = ARENAS;

    const [sel, setSel] = useState("a3");
    const [pan, setPan] = useState({ x: -70, y: -90 });
    const drag = useRef(null);
    const moved = useRef(false);
    const start = (e) => {
        const pt = e.touches ? e.touches[0] : e;
        drag.current = { sx: pt.clientX, sy: pt.clientY, px: pan.x, py: pan.y };
        moved.current = false;
    };
    const move = (e) => {
        if (!drag.current) return;
        const pt = e.touches ? e.touches[0] : e;
        const dx = pt.clientX - drag.current.sx,
            dy = pt.clientY - drag.current.sy;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
        let nx = Math.max(-250, Math.min(0, drag.current.px + dx));
        let ny = Math.max(-250, Math.min(0, drag.current.py + dy));
        setPan({ x: nx, y: ny });
    };
    const end = () => {
        drag.current = null;
    };
    const selArena = arenas.find((a) => a.id === sel);

    return (
        <div
            style={{
                position: "relative",
                height: 300,
                borderRadius: 20,
                overflow: "hidden",
                marginBottom: 20,
                isolation: "isolate",
                boxShadow:
                    "inset 0 0 0 1px rgba(10,10,60,.06), 0 2px 12px rgba(10,10,60,.06)",
                touchAction: "none",
                userSelect: "none",
                cursor: drag.current ? "grabbing" : "grab",
            }}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
        >
            {/* panned world */}
            <div
                style={{
                    position: "absolute",
                    width: 600,
                    height: 560,
                    transform: `translate(${pan.x}px, ${pan.y}px)`,
                    willChange: "transform",
                }}
            >
                <svg
                    width="600"
                    height="560"
                    style={{ position: "absolute", inset: 0, display: "block" }}
                >
                    <rect width="600" height="560" fill="#E4EAF5" />
                    {/* water */}
                    <path
                        d="M0 410 Q160 366 320 404 T600 392 L600 560 L0 560 Z"
                        fill="#CFE0F2"
                    />
                    {/* parks */}
                    <rect
                        x="56"
                        y="48"
                        width="150"
                        height="116"
                        rx="16"
                        fill="#D7E8C9"
                    />
                    <rect
                        x="380"
                        y="324"
                        width="170"
                        height="120"
                        rx="16"
                        fill="#D7E8C9"
                    />
                    {/* roads */}
                    <g stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round">
                        <line x1="-20" y1="210" x2="620" y2="188" />
                        <line x1="-20" y1="70" x2="620" y2="118" />
                        <line x1="258" y1="-20" x2="298" y2="580" />
                        <line x1="452" y1="-20" x2="492" y2="580" />
                    </g>
                    {/* building blocks */}
                    <g fill="#DBE2EE">
                        <rect x="40" y="236" width="86" height="64" rx="9" />
                        <rect x="142" y="236" width="86" height="64" rx="9" />
                        <rect x="330" y="44" width="96" height="72" rx="9" />
                        <rect x="446" y="44" width="96" height="72" rx="9" />
                        <rect x="330" y="232" width="96" height="70" rx="9" />
                        <rect x="44" y="332" width="150" height="60" rx="9" />
                    </g>
                </svg>

                {/* pins */}
                {arenas.map((a) => {
                    const on = a.id === sel;
                    return (
                        <button
                            key={a.id}
                            onClick={() => {
                                if (!moved.current) setSel(a.id);
                            }}
                            style={{
                                position: "absolute",
                                left: a.x,
                                top: a.y,
                                transform: "translate(-50%,-100%)",
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                padding: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                zIndex: on ? 6 : 3,
                                WebkitTapHighlightColor: "transparent",
                            }}
                        >
                            <span
                                style={{
                                    marginBottom: 5,
                                    padding: "3px 8px",
                                    borderRadius: 10,
                                    background: "#fff",
                                    whiteSpace: "nowrap",
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontWeight: 700,
                                    fontSize: 10.5,
                                    color: QUADRA.navy,
                                    boxShadow: "0 2px 8px rgba(10,10,60,.18)",
                                    border: on
                                        ? `1.5px solid ${QUADRA.blue}`
                                        : "1.5px solid transparent",
                                }}
                            >
                                {a.short}
                            </span>
                            <span
                                style={{
                                    position: "relative",
                                    width: on ? 34 : 28,
                                    height: on ? 34 : 28,
                                    borderRadius: "50% 50% 50% 50%",
                                    clipPath:
                                        "polygon(50% 100%, 0 35%, 50% 0, 100% 35%)",
                                    background: a.tint,
                                    boxShadow: on
                                        ? `0 0 0 3px rgba(26,26,255,.25)`
                                        : "none",
                                    transition: "all .18s",
                                }}
                            />
                            <span
                                style={{
                                    position: "absolute",
                                    bottom: on ? 12 : 9,
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    width: 9,
                                    height: 9,
                                    borderRadius: "50%",
                                    background: "#fff",
                                }}
                            />
                            {a.live && (
                                <span
                                    className="q-pulse"
                                    style={{
                                        position: "absolute",
                                        top: 20,
                                        right: -3,
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background: "#FF3B3B",
                                        border: "2px solid #fff",
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* live badge (fixed) */}
            <div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    zIndex: 7,
                    background: "rgba(255,255,255,.94)",
                    borderRadius: 20,
                    padding: "6px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    boxShadow: "0 2px 8px rgba(10,10,60,.12)",
                }}
            >
                <span
                    className="q-pulse"
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#FF3B3B",
                    }}
                />
                <span
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontWeight: 700,
                        fontSize: 11.5,
                        color: QUADRA.navy,
                    }}
                >
                    2 jogos ao vivo
                </span>
            </div>

            {/* selected arena info (fixed) */}
            {selArena && (
                <div
                    style={{
                        position: "absolute",
                        left: 12,
                        right: 12,
                        bottom: 12,
                        zIndex: 8,
                        background: "#fff",
                        borderRadius: 16,
                        padding: "11px 12px",
                        boxShadow: "0 8px 24px rgba(10,10,60,.2)",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <span
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: `linear-gradient(140deg, ${selArena.tint}, ${QUADRA.navy})`,
                        }}
                    >
                        <Icon name="pin" size={20} stroke="#fff" />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: 700,
                                fontSize: 14,
                                color: QUADRA.navy,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {selArena.name}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginTop: 3,
                            }}
                        >
                            <Icon
                                name="star"
                                size={13}
                                stroke="#F5A623"
                                fill="#F5A623"
                            />
                            <span
                                style={{
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    color: QUADRA.navy,
                                }}
                            >
                                {selArena.rating.toFixed(1)}
                            </span>
                            <span
                                style={{
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontSize: 11.5,
                                    color: QUADRA.muted,
                                }}
                            >
                                ({selArena.reviews}) · {selArena.dist}
                            </span>
                            <span
                                style={{
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontWeight: 700,
                                    fontSize: 11.5,
                                    color: selArena.free
                                        ? "#1F8A5B"
                                        : QUADRA.navy,
                                }}
                            >
                                · {selArena.avgPrice}
                            </span>
                        </div>
                    </div>
                    <Btn
                        kind="grad"
                        onClick={() => go("arena", selArena)}
                        style={{ padding: "9px 16px", fontSize: 12.5 }}
                    >
                        Ver
                    </Btn>
                </div>
            )}
        </div>
    );
}

function ExploreScreen({ go, navProps }) {
    const [filter, setFilter] = useState("Todos");
    const filters = ["Todos", "Perto", "Hoje", "Iniciante", "6x6", "Grátis"];
    const list = [
        ...NEARBY,
        ...NEARBY.map((n, i) => ({
            ...n,
            id: n.id + "b",
            dist: (parseFloat(n.dist) + 3).toFixed(1).replace(".", ",") + " km",
        })),
    ];

    const header = <Header title="EXPLORAR" right={<HeaderRight go={go} />} />;

    return (
        <ScreenShell header={header} nav navProps={navProps}>
            {/* search field */}
            <div style={{ position: "relative", marginBottom: 14 }}>
                <span
                    style={{
                        position: "absolute",
                        left: 16,
                        top: "50%",
                        transform: "translateY(-50%)",
                    }}
                >
                    <Icon name="search" size={19} stroke={QUADRA.muted} />
                </span>
                <input
                    className="q-input"
                    placeholder="Buscar quadra, bairro ou horário…"
                    style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "14px 16px 14px 44px",
                        borderRadius: 18,
                        border: "1px solid rgba(26,26,255,.1)",
                        fontFamily: '"DM Sans",sans-serif',
                        fontSize: 14,
                        color: QUADRA.text,
                        background: "#fff",
                        outline: "none",
                    }}
                />
            </div>
            {/* filter chips */}
            <div
                className="q-scroll"
                style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    margin: "0 -20px 20px",
                    padding: "2px 20px",
                }}
            >
                {filters.map((f) => {
                    const on = filter === f;
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                flexShrink: 0,
                                border: "none",
                                cursor: "pointer",
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: on ? 700 : 600,
                                fontSize: 13,
                                padding: "9px 16px",
                                borderRadius: 20,
                                background: on ? QUADRA.blue : "#fff",
                                color: on ? "#fff" : QUADRA.muted,
                                boxShadow: on
                                    ? "0 4px 14px rgba(26,26,255,.28)"
                                    : "0 1px 6px rgba(10,10,60,.05)",
                                transition: "all .2s",
                            }}
                        >
                            {f}
                        </button>
                    );
                })}
            </div>
            {/* mapa de quadras — encontre jogos perto e avalie locais */}
            <div style={{ marginTop: 2 }}>
                <ExploreMap go={go} />
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                }}
            >
                <span
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontSize: 13,
                        color: QUADRA.muted,
                        fontWeight: 500,
                    }}
                >
                    {list.length} partidas encontradas
                </span>
                <span
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontFamily: '"DM Sans",sans-serif',
                        fontSize: 13,
                        fontWeight: 700,
                        color: QUADRA.blue,
                    }}
                >
                    <Icon name="grid" size={15} stroke={QUADRA.blue} />
                    Grade
                </span>
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                }}
            >
                {list.map((n) => (
                    <NearbyCard
                        key={n.id}
                        n={n}
                        onClick={() => go("detail", n)}
                    />
                ))}
            </div>
        </ScreenShell>
    );
}

Object.assign(window, {
    LoginScreen,
    AuthScreen,
    HomeScreen,
    ExploreScreen,
    NearbyCard,
});
