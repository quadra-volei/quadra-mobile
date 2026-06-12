// Quadra — Perfil (progresso + amigos) e Carta do Jogador. Loaded after screens-game.jsx.
var { useState, useEffect, useRef } = React;

// Avatar with a level badge (used in the friends ranking + greeting).
// Thin wrapper over <Avatar> so photos + level badge stay consistent.
function BadgeAvatar({ initials, img, level, size = 44, badge = true }) {
    return (
        <Avatar
            player={{ initials, img, level, name: initials }}
            size={size}
            badge={badge}
        />
    );
}

// Quick-add player card (carousel) — avatar + "+", position, nick + level, real name
function AddPlayerCard({ p }) {
    const [added, setAdded] = useState(false);
    const c = levelColor(p.level);
    const pos3 =
        {
            Levantador: "LEV",
            Oposto: "OPO",
            Ponteiro: "PON",
            Líbero: "LIB",
            Central: "CEN",
            Coringa: "CUR",
        }[p.pos] || p.pos.slice(0, 3).toUpperCase();
    return (
        <div style={{ width: 104, flexShrink: 0, textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
                <Avatar player={p} size={66} badge />
                <button
                    onClick={() => setAdded((a) => !a)}
                    aria-label="Adicionar"
                    style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: added ? QUADRA.blue : QUADRA.lime,
                        border: "2.5px solid #fff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background .2s",
                        WebkitTapHighlightColor: "transparent",
                    }}
                >
                    <Icon
                        name={added ? "check" : "plus"}
                        size={14}
                        stroke={added ? "#fff" : QUADRA.navy}
                        sw={3}
                    />
                </button>
            </div>
            <div
                style={{
                    fontFamily: '"DM Sans",sans-serif',
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: 1,
                    color: QUADRA.muted,
                    marginTop: 8,
                }}
            >
                {pos3}
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    marginTop: 1,
                }}
            >
                <span
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontWeight: 700,
                        fontSize: 13.5,
                        color: QUADRA.navy,
                        maxWidth: 78,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {p.nick.replace("@", "")}
                </span>
            </div>
            <div
                style={{
                    fontFamily: '"DM Sans",sans-serif',
                    fontSize: 11,
                    color: QUADRA.muted,
                    marginTop: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {p.name}
            </div>
        </div>
    );
}

// Linha do histórico de partidas (perfil) — clicável → resumo da partida
function MatchHistoryRow({ m, onClick }) {
    const [h, setH] = useState(false);
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setH(true)}
            onMouseLeave={() => setH(false)}
            style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "13px 10px",
                border: "none",
                background: h ? "rgba(26,26,255,.04)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                borderRadius: 12,
                transition: "background .15s",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <span
                style={{
                    width: 28,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Icon name="whistle" size={22} stroke={QUADRA.navy} />
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
                    {m.title}
                </div>
                <div
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontSize: 11.5,
                        color: QUADRA.muted,
                        marginTop: 2,
                    }}
                >
                    {m.when} · {m.mode}
                </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                    style={{
                        fontFamily: '"DM Sans",sans-serif',
                        fontWeight: 800,
                        fontSize: 10.5,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        color: m.win ? "#5C8A00" : QUADRA.muted,
                    }}
                >
                    {m.win ? "Vitória" : "Derrota"}
                </div>
                <div
                    className="q-num"
                    style={{ fontSize: 16, color: QUADRA.navy, marginTop: 1 }}
                >
                    {m.score}
                </div>
            </div>
            <Icon name="chevR" size={17} stroke="rgba(10,10,60,.25)" />
        </button>
    );
}

// ════════════════════════════════════════════════════════════
// PERFIL · PROGRESSO + AMIGOS
// ════════════════════════════════════════════════════════════
function ProfileScreen({ go, navProps }) {
    const s = MY_STATS;
    const addPlayers = [
        PLAYERS.caio,
        PLAYERS.duda,
        PLAYERS.erica,
        PLAYERS.bia,
        PLAYERS.theo,
        PLAYERS.manu,
    ];
    const FRIENDS = [
        {
            rank: 1,
            initials: "GU",
            img: AVATAR_POOL[2],
            name: "Guga",
            sub: "Gustavo Lima",
            score: 81,
            level: 17,
        },
        {
            rank: 2,
            initials: "PI",
            img: AVATAR_POOL[5],
            name: "Pistache",
            sub: "André Souza",
            score: 79,
            level: 16,
        },
        {
            rank: 3,
            initials: "CA",
            img: AVATAR_POOL[8],
            name: "Cake",
            sub: "Caio Keller",
            score: 74,
            level: 15,
        },
        {
            rank: 4,
            initials: "VO",
            img: ME.img,
            name: "Você",
            sub: ME.name,
            score: s.geral,
            level: ME.level,
            me: true,
        },
    ];

    const header = (
        <Header
            left={
                <>
                    <BadgeAvatar
                        initials={ME.initials}
                        img={ME.img}
                        level={ME.level}
                        size={46}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            minWidth: 0,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: 600,
                                fontSize: 14,
                                color: QUADRA.muted,
                                lineHeight: 1,
                            }}
                        >
                            Olá,
                        </span>
                        <span
                            className="q-bebas"
                            style={{
                                fontSize: 20,
                                color: QUADRA.navy,
                                letterSpacing: 1,
                                lineHeight: 1,
                                whiteSpace: "nowrap",
                            }}
                        >
                            {ME.name.split(" ")[0]}
                        </span>
                    </div>
                </>
            }
            right={<HeaderRight go={go} />}
        />
    );

    const statCell = (l, v) => (
        <div
            key={l}
            style={{
                border: "1.5px solid rgba(10,10,60,.1)",
                borderRadius: 14,
                padding: "10px 0",
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontFamily: '"DM Sans",sans-serif',
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: QUADRA.muted,
                }}
            >
                {l}
            </div>
            <div
                className="q-num"
                style={{
                    fontSize: 24,
                    color: QUADRA.navy,
                    lineHeight: 1,
                    marginTop: 3,
                }}
            >
                {v}
            </div>
        </div>
    );

    return (
        <ScreenShell header={header} nav navProps={navProps}>
            {/* 1 · Seu progresso (sem título) */}
            <Card pad={18} style={{ marginBottom: 22 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                    {/* GERAL box */}
                    <div
                        style={{
                            flex: "0 0 auto",
                            width: 104,
                            borderRadius: 16,
                            background: "rgba(26,26,255,.06)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "16px 0",
                        }}
                    >
                        <div
                            style={{
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: 700,
                                fontSize: 11,
                                letterSpacing: 1.5,
                                color: QUADRA.muted,
                            }}
                        >
                            GERAL
                        </div>
                        <div
                            className="q-num"
                            style={{
                                fontSize: 46,
                                color: QUADRA.blue,
                                lineHeight: 1,
                                marginTop: 4,
                            }}
                        >
                            {s.geral}
                        </div>
                    </div>
                    {/* 2×2 stat grid */}
                    <div
                        style={{
                            flex: 1,
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                        }}
                    >
                        {statCell("ACE", s.ace)}
                        {statCell("BLK", s.blk)}
                        {statCell("ATA", s.ata)}
                        {statCell("DEF", s.def)}
                    </div>
                </div>

                {/* Ver a sua carta */}
                <Btn
                    kind="grad"
                    full
                    onClick={() => go("card")}
                    style={{ fontSize: 16 }}
                >
                    Ver a sua carta
                </Btn>

                {/* level + xp */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        margin: "18px 0 9px",
                    }}
                >
                    <span
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontWeight: 800,
                            fontSize: 14,
                            color: QUADRA.navy,
                        }}
                    >
                        Level {ME.level}
                    </span>
                    <span
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontSize: 13,
                            color: QUADRA.muted,
                        }}
                    >
                        XP: 2.450 / 5.000
                    </span>
                </div>
                <div
                    style={{
                        height: 9,
                        borderRadius: 8,
                        background: "rgba(10,10,60,.08)",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            width: "49%",
                            height: "100%",
                            borderRadius: 8,
                            background: `linear-gradient(90deg, ${QUADRA.lime}, ${QUADRA.brightLime})`,
                        }}
                    />
                </div>
            </Card>

            {/* 2 · Minhas partidas — histórico (3 últimas) */}
            <SectionTitle>Minhas partidas</SectionTitle>
            <Card pad={8} style={{ marginBottom: 22 }}>
                {MATCH_HISTORY.map((m, i) => (
                    <React.Fragment key={m.id}>
                        {i > 0 && (
                            <div
                                style={{
                                    height: 1,
                                    background: "rgba(10,10,60,.06)",
                                    margin: "0 10px",
                                }}
                            />
                        )}
                        <MatchHistoryRow
                            m={m}
                            onClick={() => go("matchresult", m)}
                        />
                    </React.Fragment>
                ))}
                <button
                    onClick={() => {}}
                    style={{
                        width: "100%",
                        marginTop: 8,
                        padding: "12px",
                        borderRadius: 14,
                        background: "transparent",
                        border: "1.5px solid rgba(26,26,255,.28)",
                        color: QUADRA.blue,
                        cursor: "pointer",
                        fontFamily: '"DM Sans",sans-serif',
                        fontWeight: 700,
                        fontSize: 14,
                        WebkitTapHighlightColor: "transparent",
                    }}
                >
                    Ver tudo
                </button>
            </Card>

            {/* 3 · Meus amigos */}
            <SectionTitle>Meus amigos</SectionTitle>
            <Card dark pad={18} style={{ marginBottom: 22 }}>
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
                            fontWeight: 700,
                            fontSize: 12.5,
                            letterSpacing: 0.3,
                            color: QUADRA.brightLime,
                        }}
                    >
                        Ranking semanal
                    </span>
                </div>
                <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                    {FRIENDS.map((f) => (
                        <div
                            key={f.rank}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "8px 10px",
                                borderRadius: 14,
                                background: f.me
                                    ? "rgba(26,26,255,.24)"
                                    : "transparent",
                                border: f.me
                                    ? `1.5px solid ${QUADRA.blue}`
                                    : "1.5px solid transparent",
                            }}
                        >
                            <span
                                className="q-num"
                                style={{
                                    fontSize: 15,
                                    width: 18,
                                    textAlign: "center",
                                    color: f.me
                                        ? QUADRA.brightLime
                                        : "rgba(255,255,255,.5)",
                                }}
                            >
                                {f.rank}
                            </span>
                            <BadgeAvatar
                                initials={f.initials}
                                img={f.img}
                                level={f.level}
                                size={40}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontFamily: '"DM Sans",sans-serif',
                                        fontWeight: 700,
                                        fontSize: 14.5,
                                        color: "#fff",
                                    }}
                                >
                                    {f.name}
                                </div>
                                <div
                                    style={{
                                        fontFamily: '"DM Sans",sans-serif',
                                        fontSize: 12,
                                        color: "rgba(255,255,255,.55)",
                                    }}
                                >
                                    {f.sub}
                                </div>
                            </div>
                            <span
                                className="q-num"
                                style={{
                                    fontSize: 20,
                                    color: f.me ? QUADRA.brightLime : "#fff",
                                }}
                            >
                                {f.score}
                            </span>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => navProps.go("ranking")}
                    style={{
                        width: "100%",
                        marginTop: 14,
                        padding: "13px",
                        borderRadius: 16,
                        background: "transparent",
                        border: "1.5px solid rgba(198,241,53,.5)",
                        color: QUADRA.brightLime,
                        cursor: "pointer",
                        fontFamily: '"DM Sans",sans-serif',
                        fontWeight: 700,
                        fontSize: 14,
                        WebkitTapHighlightColor: "transparent",
                    }}
                >
                    Ver tudo
                </button>
            </Card>

            {/* 4 · Sugestão de amigos (antes "Segue aí") */}
            <SectionTitle action="Ver tudo">Sugestão de amigos</SectionTitle>
            <div
                className="q-scroll"
                style={{
                    display: "flex",
                    gap: 14,
                    overflowX: "auto",
                    margin: "0 -20px 22px",
                    padding: "2px 20px 8px",
                }}
            >
                {addPlayers.map((p) => (
                    <AddPlayerCard key={p.id} p={p} />
                ))}
            </div>

            {/* 5 · Conquistas — repaginado: card branco, ícone degradê alinhado à esquerda */}
            <SectionTitle action="Ver tudo">Conquistas</SectionTitle>
            <div
                className="q-scroll"
                style={{
                    display: "flex",
                    gap: 12,
                    overflowX: "auto",
                    margin: "0 -20px 4px",
                    padding: "2px 20px 8px",
                }}
            >
                {MY_BADGES.map((b) =>
                    b.locked ? (
                        <Card
                            key={b.id}
                            pad={16}
                            style={{
                                width: 160,
                                flexShrink: 0,
                                position: "relative",
                                background: "#F1F3F9",
                                boxShadow: "none",
                                border: "1px dashed rgba(10,10,60,.16)",
                            }}
                        >
                            <div
                                style={{
                                    position: "relative",
                                    width: "fit-content",
                                }}
                            >
                                <Icon
                                    name={b.icon}
                                    size={28}
                                    stroke="#A8AFC4"
                                    sw={2}
                                />
                                <span
                                    style={{
                                        position: "absolute",
                                        bottom: -6,
                                        right: -9,
                                        width: 18,
                                        height: 18,
                                        borderRadius: "50%",
                                        background: QUADRA.muted,
                                        border: "2px solid #F1F3F9",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon
                                        name="lock"
                                        size={9}
                                        stroke="#fff"
                                        sw={2.6}
                                    />
                                </span>
                            </div>
                            <div
                                style={{
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontWeight: 700,
                                    fontSize: 14,
                                    color: "#9AA0B5",
                                    marginTop: 12,
                                }}
                            >
                                {b.label}
                            </div>
                            <div
                                style={{
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontSize: 11.5,
                                    color: "#A8AFC4",
                                    marginTop: 3,
                                }}
                            >
                                {b.sub}
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 7,
                                    marginTop: 10,
                                }}
                            >
                                <div
                                    style={{
                                        flex: 1,
                                        height: 5,
                                        borderRadius: 3,
                                        background: "rgba(10,10,60,.08)",
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            height: "100%",
                                            width: `${(parseInt(b.progress) / parseInt(b.progress.split("/")[1])) * 100}%`,
                                            background: QUADRA.muted,
                                            borderRadius: 3,
                                        }}
                                    />
                                </div>
                                <span
                                    className="q-mono"
                                    style={{
                                        fontSize: 10,
                                        color: QUADRA.muted,
                                        letterSpacing: 0.3,
                                    }}
                                >
                                    {b.progress}
                                </span>
                            </div>
                        </Card>
                    ) : (
                        <Card
                            key={b.id}
                            pad={16}
                            style={{ width: 160, flexShrink: 0 }}
                        >
                            <Icon name={b.icon} size={28} grad sw={2} />
                            <div
                                style={{
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontWeight: 700,
                                    fontSize: 14,
                                    color: QUADRA.navy,
                                    marginTop: 12,
                                }}
                            >
                                {b.label}
                            </div>
                            <div
                                style={{
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontSize: 11.5,
                                    color: QUADRA.muted,
                                    marginTop: 3,
                                }}
                            >
                                {b.sub}
                            </div>
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    marginTop: 10,
                                    padding: "3px 9px",
                                    borderRadius: 20,
                                    background: "rgba(170,221,0,.16)",
                                }}
                            >
                                <Icon
                                    name="check"
                                    size={11}
                                    stroke="#4f9c00"
                                    sw={3}
                                />
                                <span
                                    className="q-mono"
                                    style={{
                                        fontSize: 9.5,
                                        letterSpacing: 0.6,
                                        color: "#4f9c00",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Desbloqueada
                                </span>
                            </div>
                        </Card>
                    ),
                )}
            </div>
        </ScreenShell>
    );
}

// ════════════════════════════════════════════════════════════
// CARTA DO JOGADOR
// ════════════════════════════════════════════════════════════
function CardScreen({ back }) {
    const s = MY_STATS;
    const stats = [
        ["ACE", s.ace],
        ["BLK", s.blk],
        ["ATA", s.ata],
        ["DEF", s.def],
        ["SRV", s.srv],
        ["REC", s.rec],
    ];
    return (
        <div
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
                background: `linear-gradient(180deg, #0c0c52 0%, ${QUADRA.navy} 55%, #08083a 100%)`,
            }}
        >
            <Blob
                color={QUADRA.blue}
                size={240}
                style={{ top: -40, left: -90, opacity: 0.22 }}
            />
            <Blob
                color={QUADRA.lime}
                size={240}
                style={{ bottom: 40, right: -90, opacity: 0.16 }}
            />

            {/* header */}
            <div
                style={{
                    paddingTop: SAFE_TOP,
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 3,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "6px 18px 10px",
                    }}
                >
                    <IconBtn
                        name="chevL"
                        dark
                        fill="rgba(255,255,255,.1)"
                        onClick={back}
                    />
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}
                    >
                        <span
                            style={{
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: 700,
                                fontSize: 16,
                                color: "#fff",
                            }}
                        >
                            Carta do Jogador
                        </span>
                    </div>
                </div>
            </div>

            {/* body */}
            <div
                className="q-scroll"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    position: "relative",
                    zIndex: 2,
                    padding: "14px 22px 28px",
                }}
            >
                {/* the card */}
                <div
                    style={{
                        position: "relative",
                        borderRadius: 24,
                        padding: "22px 22px 26px",
                        background:
                            "linear-gradient(165deg, rgba(42,42,124,.55), rgba(16,16,70,.5))",
                        border: `1.5px solid ${QUADRA.brightLime}`,
                        boxShadow: "0 16px 50px rgba(0,0,0,.4)",
                    }}
                >
                    {/* top row */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                        }}
                    >
                        <div style={{ lineHeight: 0.8 }}>
                            <div
                                className="q-num"
                                style={{
                                    fontSize: 54,
                                    color: QUADRA.brightLime,
                                    lineHeight: 0.9,
                                }}
                            >
                                {s.geral}
                            </div>
                            <div
                                style={{
                                    fontFamily: '"DM Sans",sans-serif',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    letterSpacing: 2,
                                    color: "rgba(255,255,255,.65)",
                                    marginTop: 5,
                                }}
                            >
                                GERAL
                            </div>
                        </div>
                        <Tag
                            bg={QUADRA.lime}
                            color={QUADRA.navy}
                            style={{ fontSize: 11, padding: "6px 13px" }}
                        >
                            LEV
                        </Tag>
                    </div>

                    {/* photo */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            margin: "8px 0 16px",
                        }}
                    >
                        <div
                            style={{
                                width: 140,
                                height: 140,
                                borderRadius: "50%",
                                position: "relative",
                                overflow: "hidden",
                                background: `linear-gradient(140deg, ${QUADRA.midNavy}, ${QUADRA.navy})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {ME.img ? (
                                <img
                                    src={ME.img}
                                    alt={ME.name}
                                    draggable={false}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        display: "block",
                                    }}
                                />
                            ) : (
                                <span
                                    className="q-mono"
                                    style={{
                                        fontSize: 11,
                                        letterSpacing: 1,
                                        color: "rgba(255,255,255,.55)",
                                        textAlign: "center",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    foto do
                                    <br />
                                    jogador
                                </span>
                            )}
                        </div>
                    </div>

                    {/* name */}
                    <div style={{ textAlign: "center" }}>
                        <h1
                            className="q-bebas"
                            style={{
                                fontSize: 26,
                                color: "#fff",
                                margin: 0,
                                letterSpacing: 0.5,
                                textTransform: "uppercase",
                            }}
                        >
                            {ME.name}
                        </h1>
                        <div
                            style={{
                                fontFamily: '"DM Sans",sans-serif',
                                fontWeight: 600,
                                fontSize: 13.5,
                                color: QUADRA.brightLime,
                                marginTop: 5,
                            }}
                        >
                            {ME.nick} · {ME.pos}
                        </div>
                    </div>

                    {/* divider */}
                    <div
                        style={{
                            height: 1,
                            background: "rgba(255,255,255,.12)",
                            margin: "18px 0 18px",
                        }}
                    />

                    {/* stats grid */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            rowGap: 18,
                            columnGap: 6,
                        }}
                    >
                        {stats.map(([l, v]) => (
                            <div
                                key={l}
                                style={{
                                    display: "flex",
                                    alignItems: "baseline",
                                    justifyContent: "center",
                                    gap: 5,
                                }}
                            >
                                <span
                                    className="q-num"
                                    style={{
                                        fontSize: 21,
                                        color: "#fff",
                                        lineHeight: 1,
                                    }}
                                >
                                    {v}
                                </span>
                                <span
                                    style={{
                                        fontFamily: '"DM Sans",sans-serif',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        letterSpacing: 0.5,
                                        color: "rgba(255,255,255,.6)",
                                    }}
                                >
                                    {l}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* share button */}
                <div style={{ marginTop: 22 }}>
                    <Btn kind="grad" full icon="share" onClick={back}>
                        Compartilhar carta
                    </Btn>
                </div>
                {/* premium note */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        marginTop: 16,
                    }}
                >
                    <Icon name="lock" size={14} stroke="rgba(255,255,255,.6)" />
                    <span
                        style={{
                            fontFamily: '"DM Sans",sans-serif',
                            fontSize: 12.5,
                            color: "rgba(255,255,255,.6)",
                        }}
                    >
                        Carta animada na{" "}
                        <b style={{ color: QUADRA.brightLime }}>
                            Versão Premium
                        </b>
                    </span>
                </div>
            </div>
        </div>
    );
}

Object.assign(window, {
    ProfileScreen,
    CardScreen,
    BadgeAvatar,
    AddPlayerCard,
    MatchHistoryRow,
});
