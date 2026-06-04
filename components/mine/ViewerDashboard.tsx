"use client";

/**
 * AstroParty Viewer Dashboard — Slide-Based
 * Theme: Space & Cosmos
 * Palette: #254074 #538FEE #9CC8EE #FCD47D #ED8240 #AA4229
 * Fonts: Noto Sans Thai + Orbitron (display)
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap, X } from "lucide-react";
import { RaceData } from "@/app/types";
import { loadData, loadCategories, loadScoreEvents } from "@/lib/db";
import type { ScoreEvent } from "@/lib/db";
import { subscribeToScoreEvents, unsubscribe } from "@/lib/db";
// import Image from "next/image";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Question {
  id: number;
  number: number;
  points?: number;
  label?: string;
}
interface Category {
  id: number;
  name: string;
  position: number;
  questions: Question[];
}

// ---------------------------------------------------------------------------
// Design Tokens
// ---------------------------------------------------------------------------
const C = {
  navyDeep: "#0D1B2E",
  navyMid: "#254074",
  blueCore: "#538FEE",
  blueLight: "#9CC8EE",
  gold: "#FCD47D",
  orange: "#ED8240",
  redAcc: "#AA4229",
  slate: "#76849D",
  bg: "#07111E",
  white: "#FFFFFF",
  textHi: "#FFFFFF",
  textMid: "#9CC8EE",
  textLo: "#76849D",
} as const;

// Surface helpers
const surface = "rgba(37,64,116,0.22)";
const surfaceHi = "rgba(37,64,116,0.40)";
const border = "rgba(156,200,238,0.14)";
const borderWarm = "rgba(237,130,64,0.32)";

// Reusable style objects
const glassCard = (warm = false): React.CSSProperties => ({
  background: surface,
  border: `1px solid ${warm ? borderWarm : border}`,
  borderRadius: 10,
  backdropFilter: "blur(10px)",
});

const orbitron: React.CSSProperties = { fontFamily: "'Orbitron', monospace" };
const notoTH: React.CSSProperties = {
  fontFamily: "'Noto Sans Thai', sans-serif",
};

const medals = ["🥇", "🥈", "🥉"];

// ---------------------------------------------------------------------------
// Global CSS (injected once)
// ---------------------------------------------------------------------------
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes twinkle  { 0%,100%{opacity:.15} 50%{opacity:.9} }
@keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes ndrift   { from{transform:translate(0,0) scale(1);} to{transform:translate(35px,22px) scale(1.08);} }
@keyframes shipGlow { from{filter:brightness(1);} to{filter:brightness(1.4) drop-shadow(0 0 10px currentColor);} }
@keyframes glowPulse {
  0%,100%{ filter: drop-shadow(0 0 12px rgba(237,130,64,.55)) drop-shadow(0 0 28px rgba(252,212,125,.25)); }
  50%    { filter: drop-shadow(0 0 28px rgba(237,130,64,.9))  drop-shadow(0 0 60px rgba(252,212,125,.50)); }
}
@keyframes confettiFall {
  0%  { transform: translateY(-30px) rotate(0deg);   opacity: 1; }
  100%{ transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
@keyframes fadeUp {
  from { opacity:0; transform:translateY(16px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes slideIn {
  from { opacity:0; transform:translateX(-12px); }
  to   { opacity:1; transform:translateX(0); }
}

.ap-star {
  position: absolute; border-radius: 50%; background: white;
  animation: twinkle var(--dur) ease-in-out infinite var(--dl);
}
.ap-nebula {
  position: absolute; border-radius: 50%;
  filter: blur(88px); pointer-events: none;
}

/* custom scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(83,143,238,.25); border-radius: 2px; }
`;

// ---------------------------------------------------------------------------
// Cosmos Background
// ---------------------------------------------------------------------------
function CosmosBackground() {
  const [stars, setStars] = useState<
    {
      id: number;
      left: number;
      top: number;
      size: number;
      dur: number;
      dl: number;
    }[]
  >([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 130 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 0.8 + Math.random() * 1.8,
        dur: 2 + Math.random() * 5,
        dl: Math.random() * 4,
      })),
    );
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Nebula layers */}
      <div
        className="ap-nebula"
        style={{
          width: 900,
          height: 500,
          top: -150,
          left: -250,
          background:
            "radial-gradient(ellipse, rgba(83,143,238,0.13), transparent 70%)",
          animation: "ndrift 22s ease-in-out infinite alternate",
        }}
      />
      <div
        className="ap-nebula"
        style={{
          width: 600,
          height: 600,
          bottom: -80,
          right: -120,
          background:
            "radial-gradient(ellipse, rgba(237,130,64,0.09), transparent 70%)",
          animation: "ndrift 28s ease-in-out infinite alternate-reverse",
        }}
      />
      <div
        className="ap-nebula"
        style={{
          width: 400,
          height: 300,
          top: "38%",
          left: "40%",
          background:
            "radial-gradient(ellipse, rgba(252,212,125,0.05), transparent 70%)",
          animation: "ndrift 16s ease-in-out infinite alternate",
        }}
      />
      {/* Stars */}
      {stars.map((s) => (
        <div
          key={s.id}
          className="ap-star"
          style={
            {
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: 0.3 + Math.random() * 0.5,
              "--dur": `${s.dur}s`,
              "--dl": `${s.dl}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared UI atoms
// ---------------------------------------------------------------------------
function SectionHead({
  title,
  badge,
  warm = false,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  warm?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 14px",
        background: surfaceHi,
        borderBottom: `1px solid ${border}`,
        borderRadius: "10px 10px 0 0",
      }}
    >
      <div
        style={{
          ...orbitron,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: C.blueLight,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {title}
      </div>
      {badge && (
        <div
          style={{
            ...orbitron,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: "0.12em",
            padding: "2px 8px",
            borderRadius: 10,
            border: `1px solid ${warm ? borderWarm : "rgba(83,143,238,.28)"}`,
            color: warm ? C.orange : C.blueCore,
            background: warm ? "rgba(237,130,64,.08)" : "rgba(83,143,238,.08)",
          }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

function SlideHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 28px 0",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "relative" }}>
        <h2
          style={{
            ...orbitron,
            fontSize: "clamp(1.1rem,2.2vw,1.7rem)",
            fontWeight: 900,
            color: C.blueLight,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
        <div
          style={{
            position: "absolute",
            bottom: -5,
            left: 0,
            width: 44,
            height: 2,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
          }}
        />
      </div>
      {right && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {right}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JeopardyCell
// ---------------------------------------------------------------------------
function JeopardyCell({
  question,
  events,
  teams,
  onClick,
}: {
  question: Question;
  events: ScoreEvent[];
  teams: RaceData["teams"];
  onClick: () => void;
}) {
  const answered = events.length > 0;
  // const label =
  //   question.points != null
  //     ? `+${question.points}`
  //     : `+${question.number * 100}`;
  const MAX_VISIBLE = 9;
  const visibleEvents = events.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, events.length - MAX_VISIBLE);

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        minHeight: 62,
        padding: "8px 6px",
        borderRadius: 8,
        border: answered
          ? `1px solid rgba(37,64,116,0.22)`
          : `1px solid rgba(83,143,238,0.25)`,
        background: answered
          ? "rgba(7,17,30,0.88)"
          : `linear-gradient(135deg, rgba(13,27,50,0.95), rgba(37,64,116,0.28))`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        transition: "all 0.2s",
        opacity: answered ? 0.62 : 1,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = answered
          ? "none"
          : `0 0 18px rgba(237,130,64,0.28)`;

        if (!answered) {
          el.style.borderColor = `rgba(237,130,64,0.45)`;
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = "none";
        el.style.borderColor = answered
          ? "rgba(37,64,116,0.22)"
          : "rgba(83,143,238,0.25)";
      }}
    >
      {answered ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 3,
              width: "100%",
            }}
          >
            {visibleEvents.map((ev) => {
              const team = teams.find((t) => t.id === ev.team_id);
              if (!team) return null;

              return (
                <div
                  key={String(ev.id)}
                  style={{
                    padding: "2px 4px",
                    borderRadius: 4,
                    background: `${team.color}1A`,
                    borderLeft: `2px solid ${team.color}`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: ev.delta > 0 ? team.color : "#f87171",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={`${team.name} ${
                    ev.delta > 0 ? `+${ev.delta}` : ev.delta
                  }`}
                >
                  {team.name} {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                </div>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <div
              style={{
                marginTop: 4,
                textAlign: "center",
                fontSize: 10,
                fontWeight: 700,
                color: C.textLo,
              }}
            >
              +{hiddenCount} more
            </div>
          )}

          {/* answered dot */}
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 5,
              fontSize: 10,
              color: "#34d399",
              fontWeight: 900,
            }}
          >
            ✓
          </div>
        </>
      ) : (
        <span
          style={{
            ...orbitron,
            fontSize: 20,
            fontWeight: 900,
            color: C.orange,
            letterSpacing: "0.04em",
          }}
        >
          ข้อ {question.number}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuestionModal
// ---------------------------------------------------------------------------
function QuestionModal({
  category,
  question,
  events,
  teams,
  onClose,
}: {
  category: Category;
  question: Question;
  events: ScoreEvent[];
  teams: RaceData["teams"];
  onClose: () => void;
}) {
  // const label =
  //   question.points != null
  //     ? `+${question.points}`
  //     : `+${question.number * 100}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(6px)",
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 14 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        style={{
          position: "relative",
          background: "rgba(10,20,38,0.97)",
          border: `1px solid ${borderWarm}`,
          borderRadius: 14,
          padding: "36px 40px",
          width: 440,
          maxWidth: "90vw",
          boxShadow: `0 0 40px rgba(237,130,64,0.12), 0 24px 60px rgba(0,0,0,0.55)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            background: "transparent",
            border: "none",
            color: C.textLo,
            cursor: "pointer",
            fontSize: 18,
            transition: "color .2s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = C.textHi)
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.color = C.textLo)
          }
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <p
            style={{
              ...orbitron,
              color: C.blueLight,
              fontSize: 9,
              letterSpacing: "0.22em",
              marginBottom: 8,
            }}
          >
            {category.name}
          </p>
          <h3
            style={{
              ...orbitron,
              fontSize: 40,
              fontWeight: 900,
              lineHeight: 1,
              background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {/* {label} */}
            ข้อ {question.number}
          </h3>
        </div>
        {/* Events */}
        {events.length === 0 ? (
          <div
            style={{
              padding: "36px 0",
              textAlign: "center",
              borderRadius: 8,
              border: "1px dashed rgba(83,143,238,0.2)",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔭</div>
            <p
              style={{
                ...notoTH,
                fontSize: 12,
                color: C.textLo,
                letterSpacing: "0.1em",
              }}
            >
              ยังไม่มีการให้คะแนนในข้อนี้
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p
              style={{
                ...orbitron,
                fontSize: 8,
                letterSpacing: "0.22em",
                color: C.textLo,
                marginBottom: 4,
              }}
            >
              ผลคะแนนที่บันทึกไว้
            </p>
            {events.map((ev, i) => {
              const team = teams.find((t) => t.id === ev.team_id);
              if (!team) return null;
              const isPos = ev.delta > 0;
              return (
                <motion.div
                  key={String(ev.id)}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 9,
                    background: `${team.color}0F`,
                    border: `1px solid ${team.color}40`,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: team.color,
                      }}
                    />
                    <span
                      style={{
                        ...notoTH,
                        fontSize: 14,
                        fontWeight: 700,
                        color: team.color,
                      }}
                    >
                      {team.name}
                    </span>
                  </div>
                  <span
                    style={{
                      ...orbitron,
                      fontSize: 22,
                      fontWeight: 900,
                      color: isPos ? "#4ade80" : "#f87171",
                    }}
                  >
                    {isPos ? `+${ev.delta}` : ev.delta}
                    <span
                      style={{ fontSize: 9, color: C.textLo, marginLeft: 4 }}
                    >
                      PTS
                    </span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
        <div className="p-4">
          <iframe
            // loading="lazy"
            // style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: none; padding: 0;margin: 0;"
            src="https://www.canva.com/design/DAHJcsfAYkA/uw5444kV3WhaQGvVdCxuMQ/view?embed#20"
            allowFullScreen
            allow="fullscreen"
          ></iframe>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function ViewerDashboard() {
  const totalSlides = 6;
  const [currentSlide, setCurrentSlide] = useState(1);

  const [data, setData] = useState<RaceData>({
    teams: [],
    positions: [],
    state: { status: "idle", round: 1 },
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const [selectedCell, setSelectedCell] = useState<{
    category: Category;
    question: Question;
  } | null>(null);

  const fetchAll = useCallback(async () => {
    const [fresh, cats, evs] = await Promise.all([
      loadData(),
      loadCategories(),
      loadScoreEvents(),
    ]);
    setData(fresh);
    setCategories(cats);
    setScoreEvents(evs);
    setDataReady(true);
  }, []);

  useEffect(() => {
    //โหลดครั้งแรก
    fetchAll();

    // subscribe realtime
    const channel = subscribeToScoreEvents(() => {
      fetchAll(); //refetch ทุกครั้งที่มีการเปลี่ยนแปลง
    });

    return () => {
      unsubscribe(channel);
    };
  }, [fetchAll]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  };

  const goToSlide = useCallback((n: number) => setCurrentSlide(n), []);
  const nextSlide = () => setCurrentSlide((s) => Math.min(s + 1, totalSlides));
  const prevSlide = () => setCurrentSlide((s) => Math.max(s - 1, 1));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "Escape") setSelectedCell(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Confetti
  const launchConfetti = () => {
    const c = document.getElementById("confetti-root");
    if (!c) return;
    c.innerHTML = "";
    const colors = [
      C.gold,
      C.orange,
      C.blueCore,
      C.blueLight,
      C.redAcc,
      "#34d399",
    ];
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement("div");
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 5 + Math.random() * 8;
      piece.style.cssText = `
        position:absolute;
        left:${Math.random() * 100}%;top:-20px;
        width:${size}px;height:${size}px;
        background:${color};
        border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
        animation:confettiFall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite;
      `;
      c.appendChild(piece);
    }
  };

  // Derived
  const sortedPositions = [...data.positions].sort((a, b) => b.score - a.score);
  const topEight = sortedPositions.slice(0, 8);
  const maxScoreAchieved = Math.max(1, ...data.positions.map((p) => p.score));
  const visualTarget =
    data.state.status === "finished"
      ? maxScoreAchieved
      : Math.max(10, maxScoreAchieved * 1.1);
  const minScore = Math.min(0, ...data.positions.map((p) => p.score));
  const scoreRange = visualTarget - minScore;

  const getEvents = (qId: number) =>
    scoreEvents.filter((e) => e.question_id === qId);
  const answeredCount = categories.reduce(
    (a, c) =>
      a + (c.questions?.filter((q) => getEvents(q.id).length > 0).length ?? 0),
    0,
  );
  const totalQCount = categories.reduce(
    (a, c) => a + (c.questions?.length ?? 0),
    0,
  );

  // Shared refresh button
  const RefreshBtn = () => (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 16px",
        borderRadius: 20,
        cursor: "pointer",
        ...notoTH,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: C.blueLight,
        background: "rgba(83,143,238,0.10)",
        border: "1px solid rgba(83,143,238,0.25)",
        transition: "all .2s",
        opacity: isRefreshing ? 0.6 : 1,
      }}
    >
      <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
      Sync
    </button>
  );

  // =========================================================================
  // SLIDE 1 — TITLE
  // =========================================================================
  const Slide1 = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        position: "relative",
        padding: 32,
      }}
    >
      {/* Corner accent lines — top-left */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          width: 40,
          height: 40,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 40,
            height: 1.5,
            background: "rgba(156,200,238,0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1.5,
            height: 40,
            background: "rgba(156,200,238,0.25)",
          }}
        />
      </div>
      {/* Corner accent lines — bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 40,
          height: 40,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 40,
            height: 1.5,
            background: "rgba(156,200,238,0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 1.5,
            height: 40,
            background: "rgba(156,200,238,0.25)",
          }}
        />
      </div>

      {/* Planet deco — top right */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "7%",
          width: 110,
          height: 110,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 32% 28%, #9CC8EE, #254074 58%, #0D1B2E)",
          boxShadow: "0 0 50px rgba(83,143,238,0.3)",
          animation: "float 7s ease-in-out infinite",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 186,
            height: 46,
            border: "1.5px solid rgba(156,200,238,0.2)",
            borderRadius: "50%",
            transform: "translate(-50%,-50%) rotateX(70deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 162,
            height: 38,
            border: "1px solid rgba(156,200,238,0.1)",
            borderRadius: "50%",
            transform: "translate(-50%,-50%) rotateX(70deg)",
          }}
        />
      </div>

      {/* Small planet — bottom left */}
      <div
        style={{
          position: "absolute",
          bottom: "14%",
          left: "6%",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 32%, #C4A8F0, #4B2A8A 60%, #1A0D2E)",
          opacity: 0.55,
          animation: "float 5s ease-in-out infinite 1.5s",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 94,
            height: 22,
            border: "1px solid rgba(196,168,240,0.2)",
            borderRadius: "50%",
            transform: "translate(-50%,-50%) rotateX(70deg)",
          }}
        />
      </div>

      {/* Ambient glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(83,143,238,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
          marginBottom: 0,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -62%)",
        }}
      />

      {/* Logo */}
      <img
        src="/logo.png"
        alt="AMSci Logo"
        style={{
          width: "clamp(42rem,18vw,42rem)",
          height: "auto",
          // marginBottom: 20,
          filter: "drop-shadow(0 0 22px rgba(83,143,238,0.5))",
          animation: "float 6s ease-in-out infinite",
        }}
      />

      {/* Title */}
      <h1
        style={{
          ...orbitron,
          fontSize: "clamp(2rem,4.5vw,5em)",
          fontWeight: 900,
          textAlign: "center",
          letterSpacing: "0.08em",
          background: `linear-gradient(135deg, ${C.orange} 0%, ${C.gold} 45%, ${C.blueLight} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "glowPulse 4s ease-in-out infinite alternate",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {/* ASTROPARTY */}
        Final Round
      </h1>

      {/* Divider */}
      <div
        style={{
          width: 260,
          height: 2.5,
          borderRadius: 2,
          margin: "20px auto",
          background: `linear-gradient(90deg, transparent, ${C.orange}, ${C.gold}, ${C.blueLight}, transparent)`,
          opacity: 0.9,
        }}
      />

      {/* AMSci subtitle */}
      {/* <p
        style={{
          ...orbitron,
          fontSize: "clamp(0.85rem,1.7vw,1.1rem)",
          fontWeight: 700,
          letterSpacing: "0.35em",
          color: C.slate,
          textTransform: "uppercase",
          margin: "0 0 8px",
        }}
      >
        AMSci 2026
      </p> */}
      <p
        style={{
          ...notoTH,
          fontSize: "clamp(0.85rem,1.5vw,1rem)",
          fontWeight: 300,
          letterSpacing: "0.05em",
          color: C.blueLight,
          opacity: 0.7,
          margin: 0,
        }}
      >
        คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย · 9 สิงหาคม 2569
      </p>
    </div>
  );

  // =========================================================================
  // SLIDE 2 — OVERVIEW
  // =========================================================================
  const Slide2 = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 28,
      }}
    >
      <div
        style={{
          ...glassCard(true),
          padding: "40px 44px",
          maxWidth: 820,
          width: "100%",
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <h2
            style={{
              ...orbitron,
              fontSize: "clamp(1.8rem,3.5vw,2.8rem)",
              fontWeight: 900,
              color: C.blueLight,
              margin: 0,
            }}
          >
            Round {data.state.round}
          </h2>
          {/* <div
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              background: "rgba(237,130,64,0.10)",
              border: `1px solid ${borderWarm}`,
            }}
          >
            <span
              style={{
                ...orbitron,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: data.state.status === "finished" ? "#4ade80" : C.orange,
              }}
            >
              {data.state.status.toUpperCase()}
            </span>
          </div> */}
        </div>
        <p
          style={{
            ...notoTH,
            fontSize: 17,
            color: C.blueLight,
            opacity: 0.55,
            marginBottom: 32,
          }}
        >
          AMSci 2026 Final Round — คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย
        </p>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {[
            ["Teams", data.teams.length],
            ["Answered", `${answeredCount} / ${totalQCount}`],
            [
              "Leader",
              sortedPositions[0]
                ? (data.teams.find((t) => t.id === sortedPositions[0].teamId)
                    ?.name ?? "—")
                : "—",
            ],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              style={{
                ...glassCard(),
                padding: "14px 16px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
                }}
              />
              <div
                style={{
                  ...notoTH,
                  fontSize: 12,
                  opacity: 0.55,
                  marginBottom: 5,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  ...orbitron,
                  fontSize: 20,
                  fontWeight: 900,
                  color: C.textHi,
                }}
              >
                {val}
              </div>
            </div>
          ))}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <h3
              style={{
                ...notoTH,
                color: C.blueLight,
                fontWeight: 700,
                fontSize: 13,
                margin: "0 0 10px",
              }}
            >
              หมวดคำถาม:
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {categories.map((c) => (
                <div
                  key={c.id}
                  style={{
                    ...glassCard(),
                    padding: "6px 14px",
                    ...notoTH,
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.blueLight,
                  }}
                >
                  {c.name}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // =========================================================================
  // SLIDE 3 — QUESTION BOARD
  // =========================================================================
  const Slide3 = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "0 24px 80px",
        overflow: "hidden",
      }}
    >
      <SlideHeader
        title="Question Board"
        right={
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "5px 13px",
                borderRadius: 18,
                background: "rgba(37,64,116,.28)",
                border: `1px solid ${border}`,
              }}
            >
              <Zap size={11} color={C.blueLight} />
              <span style={{ ...orbitron, fontSize: 10, color: C.blueLight }}>
                {answeredCount}/{totalQCount}
              </span>
            </div>
            {/* <RefreshBtn /> */}
          </>
        }
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "12px 0",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Progress */}
        <div
          style={{
            height: 3,
            background: "rgba(83,143,238,.10)",
            borderRadius: 2,
            marginBottom: 14,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 2,
              background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
              width: totalQCount
                ? `${(answeredCount / totalQCount) * 100}%`
                : "0%",
              transition: "width .8s ease",
            }}
          />
        </div>

        {categories.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <p style={{ ...notoTH, opacity: 0.3, fontSize: 13 }}>
              No categories loaded — press Sync
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
              gap: 6,
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            {/* Category headers */}
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  padding: "8px 6px",
                  textAlign: "center",
                  background: surfaceHi,
                  border: `1px solid rgba(83,143,238,0.22)`,
                  borderRadius: 6,
                }}
              >
                <span
                  style={{
                    ...notoTH,
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.blueLight,
                    letterSpacing: "0.04em",
                    lineHeight: 1.3,
                    display: "block",
                  }}
                >
                  {cat.name}
                </span>
              </div>
            ))}

            {/* Cells row by row */}
            {Array.from({ length: 6 }, (_, qi) =>
              categories.map((cat) => {
                const q = cat.questions?.find((q) => q.number === qi + 1);
                if (!q)
                  return (
                    <div key={`${cat.id}-${qi}`} style={{ minHeight: 62 }} />
                  );
                return (
                  <JeopardyCell
                    key={q.id}
                    question={q}
                    events={getEvents(q.id)}
                    teams={data.teams}
                    onClick={() =>
                      setSelectedCell({ category: cat, question: q })
                    }
                  />
                );
              }),
            )}
          </div>
        )}

        {/* Legend */}
        <div
          style={{ display: "flex", gap: 20, paddingTop: 10, flexShrink: 0 }}
        >
          {[
            [`rgba(237,130,64,0.55)`, "ยังไม่ตอบ"],
            [`rgba(37,64,116,0.60)`, "ตอบแล้ว — กดเพื่อดูรายละเอียด"],
          ].map(([color, label]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                color: C.textLo,
                letterSpacing: "0.08em",
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: color,
                }}
              />
              <span style={notoTH}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedCell && (
          <QuestionModal
            category={selectedCell.category}
            question={selectedCell.question}
            events={getEvents(selectedCell.question.id)}
            teams={data.teams}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );

  // =========================================================================
  // SLIDE 4 — SPACE RACE
  // =========================================================================
  const Slide4 = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "0 24px 80px",
        gap: 0,
      }}
    >
      <SlideHeader
        title="Space Race"
        // right={<RefreshBtn />}
      />

      <div
        style={{
          display: "flex",
          gap: 14,
          flex: 1,
          minHeight: 0,
          paddingTop: 14,
        }}
      >
        {/* Track */}
        <div
          style={{
            flex: 3,
            position: "relative",
            ...glassCard(),
            overflow: "hidden",
            borderRadius: 10,
          }}
        >
          {/* Grid bg */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.06,
              backgroundImage: `linear-gradient(${C.blueLight} 1px, transparent 1px), linear-gradient(90deg, ${C.blueLight} 1px, transparent 1px)`,
              backgroundSize: "44px 44px",
            }}
          />
          {/* Scale */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 48,
              right: 80,
              height: 24,
              borderTop: `1px solid rgba(156,200,238,0.12)`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: "0 6px",
            }}
          >
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <div
                key={p}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 1,
                    height: 7,
                    background: "rgba(83,143,238,.2)",
                  }}
                />
                <span
                  style={{
                    ...orbitron,
                    fontSize: 8,
                    color: "rgba(156,200,238,0.3)",
                    marginTop: 2,
                  }}
                >
                  {Math.floor(minScore + p * scoreRange)}
                </span>
              </div>
            ))}
          </div>

          {/* Finish line */}
          <div
            style={{
              position: "absolute",
              right: 80,
              top: 0,
              bottom: 24,
              width: 1,
              background: `rgba(237,130,64,0.28)`,
              borderRight: "1px dashed rgba(237,130,64,0.14)",
            }}
          />

          {/* Ships */}
          <div
            style={{
              position: "absolute",
              left: 48,
              right: 80,
              top: 0,
              bottom: 24,
              padding: "14px 0",
            }}
          >
            <AnimatePresence>
              {topEight.map((pos, index) => {
                const team = data.teams.find((t) => t.id === pos.teamId);
                if (!team) return null;
                const yPos = (index + 0.5) * (100 / 8);
                const leftPct = ((pos.score - minScore) / scoreRange) * 100;
                const isNearRight = leftPct > 78;
                return (
                  <motion.div
                    key={team.id}
                    layoutId={`ship-${team.id}`}
                    initial={false}
                    animate={{
                      left: `${Math.min(100, leftPct)}%`,
                      top: `${yPos}%`,
                    }}
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    style={{
                      position: "absolute",
                      transform: "translate(-50%,-50%)",
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {/* Ship */}
                      <div
                        style={{
                          width: 40,
                          height: 28,
                          flexShrink: 0,
                          clipPath:
                            "polygon(0% 0%, 100% 50%, 0% 100%, 25% 50%)",
                          backgroundColor: team.color,
                          color: team.color,
                          animation:
                            "shipGlow 2s ease-in-out infinite alternate",
                        }}
                      />
                      {/* Label */}
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          transform: "translateY(-50%)",
                          ...(isNearRight
                            ? { right: "calc(100% + 10px)" }
                            : { left: "calc(100% + 10px)" }),
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          alignItems: isNearRight ? "flex-end" : "flex-start",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div
                          style={{
                            ...orbitron,
                            fontSize: 9,
                            fontWeight: 900,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "rgba(7,17,30,0.96)",
                            border: `1px solid ${team.color}55`,
                            color: team.color,
                            letterSpacing: "0.10em",
                          }}
                        >
                          <span style={{ opacity: 0.45 }}>#{index + 1}</span>{" "}
                          {team.name}
                        </div>
                        <div
                          style={{
                            ...orbitron,
                            fontSize: 10,
                            fontWeight: 900,
                            padding: "1px 6px",
                            borderRadius: 3,
                            background: "rgba(13,27,50,0.65)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            color: C.textHi,
                          }}
                        >
                          {pos.score}{" "}
                          <span style={{ fontSize: 7, color: C.textLo }}>
                            P
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {topEight.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(156,200,238,0.18)",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                }}
              >
                AWAITING FLEET TRANSMISSION…
              </div>
            )}
          </div>
        </div>

        {/* Fleet Rankings sidebar */}
        <div
          style={{
            flex: "0 0 220px",
            ...glassCard(),
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <SectionHead title={<>🚀 Fleet Rankings</>} badge="LIVE" warm />
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {sortedPositions.map((pos, index) => {
              const team = data.teams.find((t) => t.id === pos.teamId);
              if (!team) return null;
              const isTop3 = index < 3;
              return (
                <div
                  key={team.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 11px",
                    borderRadius: 7,
                    background: isTop3
                      ? "rgba(37,64,116,.22)"
                      : "rgba(0,0,0,.18)",
                    border: isTop3
                      ? `1px solid rgba(83,143,238,.18)`
                      : "1px solid rgba(255,255,255,.03)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* rank accent */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background:
                        index === 0
                          ? `linear-gradient(180deg, ${C.gold}, ${C.orange})`
                          : index === 1
                            ? `linear-gradient(180deg, ${C.blueLight}, ${C.blueCore})`
                            : index === 2
                              ? `linear-gradient(180deg, ${C.orange}, ${C.redAcc})`
                              : "transparent",
                    }}
                  />
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 9 }}
                  >
                    <span
                      style={{
                        ...orbitron,
                        fontSize: 9,
                        fontWeight: 700,
                        width: 16,
                        textAlign: "center",
                        color: isTop3
                          ? [C.gold, C.blueLight, C.orange][index]
                          : C.textLo,
                      }}
                    >
                      {index + 1}
                    </span>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: team.color,
                      }}
                    />
                    <span
                      style={{
                        ...notoTH,
                        fontSize: 11,
                        fontWeight: 600,
                        maxWidth: 88,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {team.name}
                    </span>
                  </div>
                  <span
                    style={{
                      ...orbitron,
                      fontSize: 10,
                      color: isTop3
                        ? [C.gold, C.blueLight, C.orange][index]
                        : C.textLo,
                    }}
                  >
                    {pos.score} <span style={{ fontSize: 8 }}>P</span>
                  </span>
                </div>
              );
            })}
            {data.teams.length === 0 && (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  fontSize: 10,
                  color: C.textLo,
                  letterSpacing: "0.15em",
                }}
              >
                NO DATA
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finish label */}
      <div
        style={{
          textAlign: "right",
          paddingRight: 96,
          paddingTop: 6,
          fontSize: 10,
          color: C.textLo,
          letterSpacing: "0.1em",
          flexShrink: 0,
        }}
      >
        {/* 🏁 FINISH LINE ({Math.floor(visualTarget)} PTS) → */}
      </div>
    </div>
  );

  // =========================================================================
  // SLIDE 5 — LIVE LEADERBOARD
  // =========================================================================
  const Slide5 = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        padding: "0 24px 80px",
        overflow: "hidden",
      }}
    >
      <SlideHeader
        title="Live Leaderboard"
        // right={<RefreshBtn />}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 740,
          flex: 1,
          overflowY: "auto",
          paddingTop: 16,
          paddingRight: 4,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {sortedPositions.length === 0 && (
          <p style={{ ...notoTH, opacity: 0.4, textAlign: "center" }}>
            No teams yet
          </p>
        )}

        {sortedPositions.map((pos, i) => {
          const team = data.teams.find((t) => t.id === pos.teamId);
          if (!team) return null;
          const rankColor =
            i === 0
              ? C.gold
              : i === 1
                ? C.blueLight
                : i === 2
                  ? C.orange
                  : C.textMid;

          return (
            <div
              key={team.id}
              style={{
                ...glassCard(i < 3),
                borderLeft: `4px solid ${team.color}`,
                display: "flex",
                alignItems: "center",
                overflow: "hidden",
                animation: `fadeUp .5s ease ${i * 0.07}s both`,
              }}
            >
              {/* Medal */}
              <div
                style={{
                  fontSize: i < 3 ? 28 : 20,
                  padding: "14px 16px",
                  flexShrink: 0,
                }}
              >
                {medals[i]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, padding: "14px 0", minWidth: 0 }}>
                <div
                  style={{
                    ...notoTH,
                    fontSize: i < 3 ? 19 : 16,
                    fontWeight: 700,
                    marginBottom: 5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {team.name}
                </div>
                {/* Progress bar */}
                {/* <div
                  style={{
                    height: 3,
                    background: "rgba(255,255,255,.06)",
                    borderRadius: 2,
                    width: "90%",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 2,
                      width: `${Math.min(100, (pos.score / Math.max(1, sortedPositions[0]?.score ?? 1)) * 100)}%`,
                      background:
                        i === 0
                          ? `linear-gradient(90deg, ${C.orange}, ${C.gold})`
                          : i === 1
                            ? `linear-gradient(90deg, ${C.blueCore}, ${C.blueLight})`
                            : `linear-gradient(90deg, ${team.color}, ${team.color}99)`,
                      transition: "width .8s ease",
                    }}
                  />
                </div> */}
              </div>

              {/* Score */}
              <div
                style={{
                  padding: "14px 22px",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    ...orbitron,
                    fontSize: i < 3 ? 28 : 22,
                    fontWeight: 900,
                    color: rankColor,
                    lineHeight: 1,
                  }}
                >
                  {pos.score}
                </div>
                <div
                  style={{
                    ...orbitron,
                    fontSize: 8,
                    color: C.textLo,
                    letterSpacing: "0.18em",
                    marginTop: 3,
                  }}
                >
                  POINTS
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // =========================================================================
  // SLIDE 6 — FINAL RESULTS
  // =========================================================================
  function Slide6() {
    useEffect(() => {
      launchConfetti();
    }, []);

    const winner = sortedPositions[0]
      ? data.teams.find((t) => t.id === sortedPositions[0].teamId)
      : null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          height: "100%",
          padding: "28px 24px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          id="confetti-root"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        />

        <div
          style={{
            fontSize: 58,
            animation: "float 2.5s ease-in-out infinite",
            marginBottom: 14,
            flexShrink: 0,
          }}
        >
          🚀
        </div>

        <h2
          style={{
            ...orbitron,
            fontSize: "clamp(1.8rem,4.5vw,3.2rem)",
            fontWeight: 900,
            background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 8,
            flexShrink: 0,
          }}
        >
          CONGRATULATIONS!
        </h2>

        {winner && (
          <p
            style={{
              ...notoTH,
              fontSize: 24,
              fontWeight: 800,
              color: winner.color,
              marginBottom: 22,
              flexShrink: 0,
            }}
          >
            {winner.name} คือผู้ชนะ!
          </p>
        )}

        <div
          style={{
            width: "100%",
            maxWidth: 620,
            flex: 1,
            overflowY: "auto",
            paddingRight: 4,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {sortedPositions.map((pos, i) => {
            const team = data.teams.find((t) => t.id === pos.teamId);
            if (!team) return null;
            return (
              <div
                key={team.id}
                style={{
                  ...glassCard(i < 3),
                  padding: "13px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderLeft: `3px solid ${team.color}`,
                  animation: `fadeUp .5s ease ${i * 0.07}s both`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: i < 3 ? 22 : 18, flexShrink: 0 }}>
                    {medals[i]}
                  </span>
                  <span
                    style={{
                      ...notoTH,
                      fontSize: 16,
                      fontWeight: 700,
                      color: team.color,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {team.name}
                  </span>
                </div>
                <span
                  style={{
                    ...orbitron,
                    fontSize: 20,
                    fontWeight: 900,
                    flexShrink: 0,
                    color: i === 0 ? C.gold : C.textHi,
                  }}
                >
                  {pos.score}
                </span>
              </div>
            );
          })}
        </div>

        {/* <button
          style={{
            marginTop: 20,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 24px",
            borderRadius: 22,
            cursor: "pointer",
            ...notoTH,
            fontSize: 13,
            fontWeight: 600,
            color: C.blueLight,
            background: "rgba(83,143,238,0.12)",
            border: `1px solid rgba(83,143,238,0.28)`,
            transition: "all .2s",
          }}
          onClick={() => goToSlide(1)}
        >
          ↩ Back to Start
        </button> */}
      </div>
    );
  }

  // =========================================================================
  // NAV BAR
  // =========================================================================
  const NavBar = () => {
    const [showNav, setShowNav] = useState(false);
    const [showStatus, setShowStatus] = useState(false);

    const pillStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      gap: 6,
      background: "rgba(10,20,38,0.90)",
      border: `1px solid ${border}`,
      borderRadius: 28,
      padding: "7px 14px",
      backdropFilter: "blur(14px)",
    };
    const btnStyle: React.CSSProperties = {
      ...notoTH,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.06em",
      color: "rgba(156,200,238,.7)",
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "3px 9px",
      borderRadius: 18,
    };

    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 20px 14px",
          gap: 8,
          background: "linear-gradient(0deg, rgba(7,17,30,.96), transparent)",
          flexWrap: "wrap",
        }}
      >
        {/* ── STATUS TOGGLE ── */}
        <button
          style={{ ...pillStyle, cursor: "pointer" }}
          onClick={() => setShowStatus((v) => !v)}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dataReady ? "#4ade80" : "#f472b6",
              boxShadow: `0 0 7px ${dataReady ? "#4ade80" : "#f472b6"}`,
              animation: "glowPulse 1.5s infinite",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              ...orbitron,
              fontSize: 10,
              color: C.textMid,
              letterSpacing: "0.15em",
            }}
          >
            {showStatus ? "✕" : "···"}
          </span>
        </button>

        {showStatus && (
          <>
            {/* Status */}
            <div style={pillStyle}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: dataReady ? "#4ade80" : "#f472b6",
                  boxShadow: `0 0 7px ${dataReady ? "#4ade80" : "#f472b6"}`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  ...notoTH,
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  color: dataReady ? "#4ade80" : "#f472b6",
                }}
              >
                {dataReady ? "DATA LINKED" : "CONNECTING…"}
              </span>
            </div>

            {/* Round */}
            <div style={pillStyle}>
              <span
                style={{
                  ...orbitron,
                  fontSize: 11,
                  color: C.blueLight,
                  letterSpacing: "0.2em",
                }}
              >
                ROUND {data.state.round}
              </span>
            </div>

            {/* Sync */}
            <div style={{ ...pillStyle, padding: "5px 10px" }}>
              <RefreshBtn />
            </div>
          </>
        )}

        {/* ── DIVIDER ── */}
        <div style={{ width: 1, height: 20, background: border }} />

        {/* ── NAV TOGGLE ── */}
        <button
          style={{ ...pillStyle, cursor: "pointer" }}
          onClick={() => setShowNav((v) => !v)}
        >
          <span style={{ ...notoTH, fontSize: 14, color: C.textMid }}>
            {showNav ? "✕" : "☰"}
          </span>
        </button>

        {showNav && (
          <>
            <div style={pillStyle}>
              <button style={btnStyle} onClick={prevSlide}>
                ← Prev
              </button>
              <div style={{ width: 1, height: 14, background: border }} />
              <span
                style={{
                  ...orbitron,
                  fontSize: 10,
                  color: C.textLo,
                  padding: "0 6px",
                }}
              >
                {currentSlide} / {totalSlides}
              </span>
              <div style={{ width: 1, height: 14, background: border }} />
              <button style={btnStyle} onClick={nextSlide}>
                Next →
              </button>
            </div>

            {/* Dot indicators */}
            <div style={{ ...pillStyle, gap: 7 }}>
              {Array.from({ length: totalSlides }, (_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i + 1)}
                  style={{
                    width: currentSlide === i + 1 ? 20 : 7,
                    height: 7,
                    borderRadius: currentSlide === i + 1 ? 3 : "50%",
                    background:
                      currentSlide === i + 1
                        ? C.orange
                        : "rgba(156,200,238,.25)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all .25s",
                    boxShadow:
                      currentSlide === i + 1
                        ? `0 0 8px rgba(237,130,64,.6)`
                        : "none",
                  }}
                />
              ))}
            </div>

            {/* Slide jump buttons */}
            <div style={{ ...pillStyle, padding: "5px 10px", gap: 2 }}>
              {(["😽", "💻", "📋", "🚀", "📊", "🏆"] as const).map(
                (icon, i) => (
                  <button
                    key={i}
                    style={{
                      ...btnStyle,
                      fontSize: 16,
                      opacity: currentSlide === i + 1 ? 1 : 0.45,
                      padding: "3px 8px",
                      background:
                        currentSlide === i + 1
                          ? "rgba(237,130,64,.12)"
                          : "none",
                    }}
                    onClick={() => goToSlide(i + 1)}
                  >
                    {icon}
                  </button>
                ),
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  const slides: Record<number, React.ReactNode> = {
    1: <Slide1 />,
    2: <Slide2 />,
    3: <Slide3 />,
    4: <Slide4 />,
    5: <Slide5 />,
    6: <Slide6 />,
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `
            radial-gradient(ellipse 88% 55% at 14% 5%,  rgba(37,64,116,0.58) 0%, transparent 62%),
            radial-gradient(ellipse 52% 44% at 84% 84%, rgba(83,143,238,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 36% 28% at 52% 44%, rgba(237,130,64,0.07) 0%, transparent 52%),
            #07111E
          `,
          fontFamily: "'Noto Sans Thai', sans-serif",
          color: C.textHi,
          overflow: "hidden",
        }}
      >
        <CosmosBackground />

        {/* Slides */}
        <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              style={{ position: "absolute", inset: 0, display: "flex" }}
            >
              {slides[currentSlide]}
            </motion.div>
          </AnimatePresence>
        </div>

        <NavBar />
      </div>
    </>
  );
}
