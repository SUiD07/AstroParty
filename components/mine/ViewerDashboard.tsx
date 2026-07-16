"use client";

/**
 * AstroParty Viewer Dashboard — Slide-Based
 * Theme: Space & Cosmos
 * Palette: #1A1A1A #ED8240 #FFFFFF #ED8240 #ED8240 #AA4229
 * Fonts: Noto Sans Thai + Orbitron (display)
 *
 * ── แก้ไขในรอบนี้ ──
 * FIX A: ยก Slide1, Slide2, Slide4–Slide10, NavBar, FooterTicker, RefreshBtn
 *        ออกมาเป็น top-level function (เหมือน Slide3 ที่เคยแก้ไปแล้ว)
 *        เพื่อไม่ให้ re-mount ทุกครั้งที่ parent re-render (ทุกครั้งที่มี score event)
 * FIX B: เปลี่ยน dependency array ของ presentation_state effect เป็น []
 *        ใช้ categoriesRef แทนการอ้าง categories ตรงๆ กัน stale closure
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  // Zap,
  X,
} from "lucide-react";
import { RaceData } from "@/app/types";
import {
  loadData,
  loadCategories,
  loadScoreEvents,
  subscribeToTeams,
} from "@/lib/db";
import type { ScoreEvent } from "@/lib/db";
import { subscribeToScoreEvents, unsubscribe } from "@/lib/db";
import { loadCanvaLinks } from "@/lib/db";
import {
  loadPresentationState,
  // updatePresentationState,
  subscribeToPresentationState,
  type PresentationState,
} from "@/lib/db";
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

interface Position {
  teamId: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Design Tokens
// ---------------------------------------------------------------------------
const C = {
  navyDeep: "#0a0a0a",
  navyMid: "#1A1A1A",
  blueCore: "#ED8240",
  blueLight: "#B0B0B0",
  gold: "#ED8240",
  orange: "#ED8240",
  redAcc: "#AA4229",
  slate: "#76849D",
  bg: "#080808",
  white: "#FFFFFF",
  textHi: "#FFFFFF",
  textMid: "#B0B0B0",
  textLo: "#76849D",
} as const;

// Surface helpers
const surface = "rgba(26,26,26,0.22)";
const surfaceHi = "rgba(26,26,26,0.40)";
const border = "rgba(255,255,255,0.14)";
const borderWarm = "rgba(237,130,64,0.32)";

// Reusable style objects
const glassCard = (warm = false): React.CSSProperties => ({
  background: surface,
  border: `1px solid ${warm ? borderWarm : border}`,
  borderRadius: 10,
  backdropFilter: "blur(10px)",
});

// const orbitron: React.CSSProperties = { fontFamily: "'Orbitron', monospace" };
// const orbitron: React.CSSProperties = { fontFamily: "'Cormorant Garamond', serif" };
const orbitron: React.CSSProperties = {
  fontFamily: "'Noto Sans Thai', sans-serif",
};
const notoTH: React.CSSProperties = {
  fontFamily: "'Noto Sans Thai', sans-serif",
};

const fontDisplay: React.CSSProperties = {
  fontFamily: "'Bodoni Moda', serif",
  fontWeight: 700,
};
// const fontSans: React.CSSProperties = {
//   fontFamily: "'Roboto', sans-serif",
// };

// const medals = ["🥇", "🥈", "🥉"];

// ---------------------------------------------------------------------------
// Global CSS (injected once)
// ---------------------------------------------------------------------------
// @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');
// @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes twinkle  { 0%,100%{opacity:.15} 50%{opacity:.9} }
@keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes ndrift   { from{transform:translate(0,0) scale(1);} to{transform:translate(35px,22px) scale(1.08);} }
@keyframes shipGlow { from{filter:brightness(1);} to{filter:brightness(1.4) drop-shadow(0 0 10px currentColor);} }
@keyframes glowPulse {
  0%,100%{ filter: drop-shadow(0 0 12px rgba(237,130,64,.55)) drop-shadow(0 0 28px rgba(237,130,64,.25)); }
  50%    { filter: drop-shadow(0 0 28px rgba(237,130,64,.9))  drop-shadow(0 0 60px rgba(237,130,64,.50)); }
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
@keyframes dotPulse {
  0%,100% { transform:scale(1); opacity:.7; }
  50%     { transform:scale(1.4); opacity:1; }
}
  .grad-gold {
  background: linear-gradient(135deg, #ED8240 0%, #ED8240 45%, #fffbe8 80%, #ED8240 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.grad-blue {
  background: linear-gradient(135deg, #FFFFFF, #fff, #FFFFFF);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.ap-star {
  position: absolute; border-radius: 50%; background: white;
  animation: twinkle var(--dur) ease-in-out infinite var(--dl);
}
.ap-nebula {
  position: absolute; border-radius: 50%;
  filter: blur(88px); pointer-events: none;
}
@keyframes tickerScroll {
  0%   { transform: translateX(100vw); }
  100% { transform: translateX(-100%); }
}
.ap-ticker-text {
  display: inline-block;
  white-space: nowrap;
  animation: tickerScroll 28s linear infinite;
}

/* custom scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(237,130,64,.25); border-radius: 2px; }
`;

// ---------------------------------------------------------------------------
// Confetti helper — module-level, ไม่ผูกกับ re-render ของ component ใดๆ
// ---------------------------------------------------------------------------
function launchConfetti() {
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
}

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
// function SectionHead({
//   title,
//   badge,
//   warm = false,
// }: {
//   title: React.ReactNode;
//   badge?: React.ReactNode;
//   warm?: boolean;
// }) {
//   return (
//     <div
//       style={{
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "space-between",
//         padding: "9px 14px",
//         background: surfaceHi,
//         borderBottom: `1px solid ${border}`,
//         borderRadius: "10px 10px 0 0",
//       }}
//     >
//       <div
//         style={{
//           ...orbitron,
//           fontSize: 9,
//           fontWeight: 700,
//           letterSpacing: "0.22em",
//           textTransform: "uppercase",
//           color: C.blueLight,
//           display: "flex",
//           alignItems: "center",
//           gap: 6,
//         }}
//       >
//         {title}
//       </div>
//       {badge && (
//         <div
//           style={{
//             ...orbitron,
//             fontSize: 8,
//             fontWeight: 700,
//             letterSpacing: "0.12em",
//             padding: "2px 8px",
//             borderRadius: 10,
//             border: `1px solid ${warm ? borderWarm : "rgba(237,130,64,.28)"}`,
//             color: warm ? C.orange : C.blueCore,
//             background: warm ? "rgba(237,130,64,.08)" : "rgba(237,130,64,.08)",
//           }}
//         >
//           {badge}
//         </div>
//       )}
//     </div>
//   );
// }

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
            ...fontDisplay,
            fontSize: "clamp(3rem,2.2vw,1.7rem)",
            fontWeight: 900,
            // color: C.blueLight,
            color: "#fff",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
        {/* <div
          style={{
            position: "absolute",
            bottom: -5,
            left: 0,
            width: 44,
            height: 2,
            borderRadius: 2,
            background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
          }}
        /> */}
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
  isHighlighted,
  onClick,
}: {
  question: Question;
  events: ScoreEvent[];
  teams: RaceData["teams"];
  isHighlighted?: boolean;
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
      // style={{
      //   position: "relative",
      //   minHeight: 62,
      //   padding: "8px 6px",
      //   borderRadius: 8,
      //   // border: answered
      //   //   ? `1px solid rgba(26,26,26,0.22)`
      //   //   : `1px solid rgba(237,130,64,0.25)`,
      //   border: `1px solid rgba(237,130,64,0.25)`,
      //   // background: answered
      //   //   ? "rgba(7,17,30,0.88)"
      //   //   : `linear-gradient(135deg, rgba(10,10,10,0.95), rgba(26,26,26,0.28))`,
      //   background: `linear-gradient(135deg, rgba(10,10,10,0.95), rgba(26,26,26,0.28))`,
      //   cursor: "pointer",
      //   display: "flex",
      //   flexDirection: "column",
      //   alignItems: "center",
      //   justifyContent: "center",
      //   gap: 4,
      //   transition: "all 0.2s",
      //   // opacity: answered ? 0.62 : 1,
      //   opacity: 1,
      // }}
      style={{
        position: "relative",
        minHeight: 62,
        padding: "8px 6px",
        borderRadius: 8,
        border: answered
          ? `1px solid rgba(237,130,64,0.25)`
          : "1px solid rgba(255,255,255,0.07)",
        background: answered
          ? `linear-gradient(135deg, rgba(10,10,10,0.95), rgba(26,26,26,0.28))`
          : "#1a1a1a",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        transition: "all 0.2s",
        opacity: 1,
        boxShadow: isHighlighted
          ? `0 0 0 2px ${C.orange}, 0 0 20px rgba(237,130,64,.5)`
          : "none",
        animation: isHighlighted
          ? "glowPulse 1.4s ease-in-out infinite"
          : "none",
      }}
      // onMouseEnter={(e) => {
      //   const el = e.currentTarget as HTMLDivElement;
      //   // el.style.boxShadow = answered
      //   //   ? "none"
      //   //   : `0 0 18px rgba(237,130,64,0.28)`;
      //   el.style.boxShadow = `0 0 18px rgba(237,130,64,0.28)`;

      //   // if (!answered) {
      //   //   el.style.borderColor = `rgba(237,130,64,0.45)`;
      //   // }
      //   el.style.borderColor = `rgba(237,130,64,0.45)`;
      // }}
      // onMouseLeave={(e) => {
      //   const el = e.currentTarget as HTMLDivElement;
      //   el.style.boxShadow = "none";
      //   // el.style.borderColor = answered
      //   //   ? "rgba(26,26,26,0.22)"
      //   //   : "rgba(237,130,64,0.25)";
      //   el.style.borderColor = "rgba(237,130,64,0.25)";
      // }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        if (answered) {
          el.style.boxShadow = `0 0 18px rgba(237,130,64,0.28)`;
          el.style.borderColor = `rgba(237,130,64,0.45)`;
        } else {
          el.style.boxShadow = isHighlighted
            ? `0 0 0 2px ${C.orange}, 0 0 20px rgba(237,130,64,.5)`
            : "none";
          el.style.borderColor = "rgba(255,255,255,0.14)";
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = isHighlighted
          ? `0 0 0 2px ${C.orange}, 0 0 20px rgba(237,130,64,.5)`
          : "none";
        el.style.borderColor = answered
          ? "rgba(237,130,64,0.25)"
          : "rgba(255,255,255,0.07)";
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
                    // borderLeft: `2px solid ${team.color}`,
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
  canvaLinks,
  onClose,
}: {
  category: Category;
  question: Question;
  events: ScoreEvent[];
  teams: RaceData["teams"];
  canvaLinks: Record<number, string>;
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
          // background: "rgba(10,20,38,0.97)",
          border: `1px solid ${borderWarm}`,
          borderRadius: 14,
          // width: 440,
          // maxWidth: "90vw",
          // maxHeight: "85vh",
          width: "95%",
          height: "95%",
          maxWidth: "95%",
          maxHeight: "95%",
          display: "flex",
          flexDirection: "column",
          boxShadow: `0 0 40px rgba(237,130,64,0.12), 0 24px 60px rgba(0,0,0,0.55)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sticky header with close button ── */}
        <div
          style={{
            padding: "28px 40px 0",
            flexShrink: 0,
            position: "relative",
          }}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 5,
            }}
          >
            <p
              style={{
                ...fontDisplay,
                color: C.blueLight,
                fontSize: 40,
                margin: 0,
              }}
            >
              {category.name}
            </p>

            <h3
              style={{
                ...notoTH,
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1,
                margin: 0,
                background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ข้อ {question.number}
            </h3>
            <div
              // className="fixed bottom-0 left-0 z-50 origin-bottom-left"
              style={{
                transform: "scale(0.47)",
                // transformOrigin: "bottom left",
              }}
            >
              <iframe
                src="https://keepthescore.com/scoreboard/ymzywzmyfjzpr/"
                // width="500"
                // height="500"
                className="pointer-events-auto h-20 w-auto"
                // frameBorder="0"
              ></iframe>
            </div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div
          style={{
            overflowY: "auto",
            padding: "0 20px 50px",
            flex: 1,
          }}
        >
          {/* Canva iframe */}
          {canvaLinks[question.id] && (
            <div style={{ marginTop: 0 }}>
              <iframe
                src={canvaLinks[question.id]}
                allowFullScreen
                allow="fullscreen"
                style={{
                  width: "100%",
                  height: "min(90vh, calc((100vw - 80px) * 9 / 16))",
                  border: "none",
                  borderRadius: 8,
                }}
              />
            </div>
          )}
          {/* Events */}
          {events.length === 0 ? (
            <div
              style={{
                padding: "36px 0",
                textAlign: "center",
                borderRadius: 8,
                border: "1px dashed rgba(237,130,64,0.2)",
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
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slide Prop Types
// ---------------------------------------------------------------------------
interface SlideCommonProps {
  data: RaceData;
  categories: Category[];
  scoreEvents: ScoreEvent[];
  canvaLinks: Record<number, string>;
}

// ---------------------------------------------------------------------------
// SLIDE 1 — TITLE (static — ไม่ต้องรับ props เลย)
// ---------------------------------------------------------------------------
function Slide1() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          paddingTop: 56,
          paddingBottom: 40,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img
            src="/smcu_old.webp"
            alt="สโมสรนิสิตคณะแพทยศาสตร์"
            style={{ width: "clamp(4.5rem,6vw,6rem)", height: "auto" }}
          />
          <img
            src="/MD_Chula.png"
            alt="คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย"
            style={{ width: "clamp(4.5rem,6vw,6rem)", height: "auto" }}
          />
        </div>
        <div
          style={{
            width: 1,
            height: 72,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        <img
          src="/logo.png"
          alt="AMSci 2026"
          style={{ width: "clamp(7rem,9vw,10rem)", height: "auto" }}
        />
      </div>

      <div
        style={{
          width: 40,
          height: 2,
          background: C.orange,
          borderRadius: 1,
          marginBottom: 40,
          flexShrink: 0,
        }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 64px 32px",
          textAlign: "center",
          minHeight: 0,
        }}
      >
        <p
          style={{
            ...notoTH,
            color: C.orange,
            fontSize: "clamp(0.8rem,1.4vw,1.1rem)",
            letterSpacing: "0.25em",
            marginBottom: 24,
          }}
        >
          AMSci 2026
        </p>

        <h1
          style={{
            ...fontDisplay,
            fontSize: "clamp(3.2rem,9vw,7rem)",
            color: "#fff",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            margin: "0 0 40px",
          }}
        >
          Final Round
        </h1>

        <div
          style={{
            maxWidth: 780,
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <p
            style={{
              ...notoTH,
              fontSize: "clamp(1rem,2vw,1.45rem)",
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.9,
              margin: 0,
            }}
          >
            ถ่ายทอดสดการแข่งขันตอบปัญหาวิชาการและวิทยาศาสตร์การแพทย์
            <br />
            ระดับมัธยมศึกษาตอนปลาย
          </p>

          <div
            style={{
              width: 1,
              height: 32,
              background: "rgba(255,255,255,0.06)",
              margin: "0 auto",
            }}
          />

          <p
            style={{
              ...notoTH,
              fontSize: "clamp(0.75rem,1.3vw,1rem)",
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1.9,
              margin: 0,
            }}
          >
            ชิงโล่พระราชทานสมเด็จพระกนิษฐาธิราชเจ้า กรมสมเด็จพระเทพรัตนราชสุดาฯ
            สยามบรมราชกุมารี
            <br />
            เนื่องในสัปดาห์วันอานันทมหิดล ปี 2568
          </p>
        </div>
      </div>

      <div style={{ paddingBottom: 40, flexShrink: 0 }}>
        <p
          style={{
            ...fontDisplay,
            color: "rgba(255,255,255,0.15)",
            fontSize: 11,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Faculty of Medicine · Chulalongkorn University
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 2 — OVERVIEW
// ---------------------------------------------------------------------------
interface Slide2Props {
  data: RaceData;
  categories: Category[];
  sortedPositions: Position[];
  answeredCount: number;
  totalQCount: number;
}

function Slide2({
  data,
  categories,
  sortedPositions,
  answeredCount,
  totalQCount,
}: Slide2Props) {
  const leaderName = sortedPositions[0]
    ? (data.teams.find((t) => t.id === sortedPositions[0].teamId)?.name ?? "—")
    : "—";

  return (
    <div
      className="h-full flex flex-col select-none font-sans overflow-hidden"
      style={{ paddingBottom: 40 }}
    >
      <div className="px-16 pt-14 pb-6">
        <h1
          className="font-bold text-white leading-none"
          style={{
            fontSize: "clamp(5rem, 12vw, 10rem)",
            letterSpacing: "-0.02em",
            ...fontDisplay,
          }}
        >
          Round {data.state.round}
        </h1>

        <div className="mt-5 space-y-1.5">
          <p className="text-white/65 text-xl tracking-tight">
            AMSci 2026 Final Round
          </p>
          <p className="text-white/30" style={{ fontSize: "1rem", ...notoTH }}>
            คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย
          </p>
        </div>
      </div>

      <div
        className="mx-16 mb-10"
        style={{ height: 1, background: "rgba(255,255,255,0.05)" }}
      />

      <div className="px-16 pb-12 flex gap-5 max-w-3xl">
        <div
          className="flex-1 rounded-2xl p-6"
          style={{
            background: "#111",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Teams
          </p>
          <p
            className="text-white font-light tabular-nums"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 1 }}
          >
            {data.teams.length}
          </p>
        </div>

        <div
          className="flex-1 rounded-2xl p-6"
          style={{
            background: "#111",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Answered
          </p>
          <p
            className="font-light tabular-nums"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4rem)",
              lineHeight: 1,
              color: answeredCount > 0 ? "#ED8240" : "white",
            }}
          >
            {answeredCount}
            <span className="text-white/20 ml-1" style={{ fontSize: "1.5rem" }}>
              / {totalQCount}
            </span>
          </p>
        </div>

        <div
          className="flex-1 rounded-2xl p-6"
          style={{
            background: "#111",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Leader
          </p>
          <p
            className="text-white font-light"
            style={{
              fontSize: "clamp(1.6rem, 3vw, 2.5rem)",
              lineHeight: 1.2,
            }}
          >
            {leaderName}
          </p>
        </div>
      </div>

      {categories.length > 0 && (
        <div
          className="px-16 pb-8 flex-1 flex flex-col"
          style={{ minHeight: 0 }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 20,
              ...notoTH,
            }}
          >
            หมวดคำถาม
          </p>

          <div
            className="flex-1 flex flex-col"
            style={{ justifyContent: "space-evenly" }}
          >
            {categories.map((c, i) => (
              <div key={c.id} className="flex items-center gap-5">
                <span
                  className="tabular-nums"
                  style={{
                    color: "rgba(255,255,255,0.12)",
                    fontSize: `clamp(0.6rem, ${18 / categories.length}vh, 0.9rem)`,
                    width: 18,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: `clamp(0.9rem, ${28 / categories.length}vh, 1.6rem)`,
                    fontWeight: 300,
                  }}
                >
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 3 — QUESTION BOARD (top-level, hoisted แล้วก่อนหน้านี้)
// ---------------------------------------------------------------------------
interface Slide3Props extends SlideCommonProps {
  answeredCount: number;
  totalQCount: number;
  selectedCell: { category: Category; question: Question } | null;
  setSelectedCell: (
    v: { category: Category; question: Question } | null,
  ) => void;
  activeHighlightId: number | null;
  onCellClick: (cat: Category, q: Question) => void;
}

function Slide3({
  data,
  categories,
  scoreEvents,
  canvaLinks,
  answeredCount,
  totalQCount,
  selectedCell,
  setSelectedCell,
  activeHighlightId,
  onCellClick,
}: Slide3Props) {
  const getEvents = (qId: number) =>
    scoreEvents.filter((e) => e.question_id === qId);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "0 24px 56px",
        overflow: "hidden",
      }}
    >
      <SlideHeader
        title="Question Board"
        right={
          <>
            <div style={{ paddingBottom: 4, textAlign: "right" }}>
              <p
                style={{
                  ...notoTH,
                  fontSize: 15,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  color: "#fff",
                }}
              >
                Question {answeredCount}/{totalQCount}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "#ED8240",
                    animation: "twinkle 1.5s ease-in-out infinite",
                  }}
                />
                <span
                  style={{
                    ...orbitron,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "#ED8240",
                  }}
                >
                  Live
                </span>
              </div>
            </div>
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
        <div
          style={{
            height: 3,
            background: "rgba(237,130,64,.10)",
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
            {categories.map((cat) => (
              <div
                key={cat.id}
                style={{
                  padding: "8px 6px",
                  textAlign: "center",
                  background: surfaceHi,
                  border: `1px solid rgba(237,130,64,0.22)`,
                  borderRadius: 6,
                }}
              >
                <span
                  style={{
                    ...notoTH,
                    fontSize: "clamp(0.72rem, 1.1vw, 0.95rem)",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    lineHeight: 1.3,
                    display: "block",
                  }}
                >
                  {cat.name}
                </span>
              </div>
            ))}

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
                    isHighlighted={q.id === activeHighlightId}
                    onClick={() => onCellClick(cat, q)}
                  />
                );
              }),
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedCell && (
          <QuestionModal
            category={selectedCell.category}
            question={selectedCell.question}
            events={getEvents(selectedCell.question.id)}
            teams={data.teams}
            canvaLinks={canvaLinks}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 4 — SPACE RACE
// ---------------------------------------------------------------------------
interface Slide4Props {
  data: RaceData;
  topSix: Position[];
  minScore: number;
  scoreRange: number;
}

function Slide4({ data, topSix, minScore, scoreRange }: Slide4Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "0 24px 56px",
        gap: 0,
      }}
    >
      <SlideHeader title="Space Race" />

      <div
        style={{
          display: "flex",
          gap: 14,
          flex: 1,
          minHeight: 0,
          paddingTop: 14,
        }}
      >
        <div
          style={{
            flex: 3,
            position: "relative",
            ...glassCard(),
            overflow: "hidden",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.06,
              backgroundImage: `linear-gradient(${C.blueLight} 1px, transparent 1px), linear-gradient(90deg, ${C.blueLight} 1px, transparent 1px)`,
              backgroundSize: "44px 44px",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 48,
              right: 80,
              height: 24,
              borderTop: `1px solid rgba(255,255,255,0.12)`,
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
                    height: 20,
                    background: "rgba(237,130,64,.2)",
                  }}
                />
                <span
                  style={{
                    ...fontDisplay,
                    fontSize: 8,
                    color: "rgba(255,255,255,0.3)",
                    marginTop: 2,
                  }}
                >
                  {Math.floor(minScore + p * scoreRange)}
                </span>
              </div>
            ))}
          </div>

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
              {topSix.map((pos, index) => {
                const team = data.teams.find((t) => t.id === pos.teamId);
                if (!team) return null;
                const yPos = (index + 0.5) * (100 / 6);
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
                            ...notoTH,
                            fontSize: 20,
                            fontWeight: 900,
                            padding: "2px 8px",
                            borderRadius: 4,
                            color: team.color,
                            letterSpacing: "0.10em",
                          }}
                        >
                          <span style={{ opacity: 0.45 }}>#{index + 1}</span>{" "}
                          {team.name}
                        </div>
                        <div
                          style={{
                            ...notoTH,
                            fontSize: 20,
                            fontWeight: 900,
                            padding: "1px 6px",
                            borderRadius: 3,
                            color: C.textHi,
                          }}
                        >
                          {pos.score}{" "}
                          <span style={{ fontSize: 15, color: C.textLo }}>
                            P
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {topSix.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.18)",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                }}
              >
                AWAITING FLEET TRANSMISSION…
              </div>
            )}
          </div>
        </div>
      </div>

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
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 5 — LIVE LEADERBOARD
// ---------------------------------------------------------------------------
interface Slide5Props {
  data: RaceData;
  sortedPositions: Position[];
}

function Slide5({ data, sortedPositions }: Slide5Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const useTwoColumns = !isMobile && sortedPositions.length > 6;
  const half = Math.ceil(sortedPositions.length / 2);
  const columns = useTwoColumns
    ? [sortedPositions.slice(0, half), sortedPositions.slice(half)]
    : [sortedPositions];

  const rowsPerColumn = Math.max(1, columns[0].length);
  const rowPad = Math.min(18, 140 / rowsPerColumn);
  const nameSize = Math.min(1.6, 12 / rowsPerColumn + 0.9);
  const scoreSize = Math.min(2.4, 18 / rowsPerColumn + 1.2);
  const rankSize = Math.min(13, 90 / rowsPerColumn + 8);

  const renderRow = (pos: Position, i: number, isLastInColumn: boolean) => {
    const team = data.teams.find((t) => t.id === pos.teamId);
    if (!team) return null;

    const isFirst = i === 0;

    return (
      <div
        key={team.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 12 : 20,
          padding: `${rowPad}px 0`,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          ...(isLastInColumn
            ? { borderBottom: "1px solid rgba(255,255,255,0.04)" }
            : {}),
        }}
      >
        <span
          style={{
            ...orbitron,
            fontSize: rankSize,
            fontWeight: 700,
            width: 20,
            textAlign: "right",
            flexShrink: 0,
            color: isFirst ? C.orange : "rgba(255,255,255,0.2)",
          }}
        >
          {i + 1}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              ...notoTH,
              fontWeight: 300,
              lineHeight: 1.2,
              fontSize: `${nameSize}rem`,
              color: isFirst ? "#fff" : "rgba(255,255,255,0.5)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {team.name}
          </div>
        </div>

        <span
          style={{
            ...orbitron,
            fontWeight: 300,
            flexShrink: 0,
            width: isMobile ? 60 : 80,
            textAlign: "right",
            fontSize: `${scoreSize}rem`,
            color: isFirst ? C.orange : "rgba(255,255,255,0.45)",
          }}
        >
          {pos.score}
        </span>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexShrink: 0,
          padding: isMobile ? "24px 20px 14px" : "36px 56px 20px",
        }}
      >
        <h1
          style={{
            ...fontDisplay,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "#fff",
            fontSize: isMobile
              ? "clamp(1.8rem, 8vw, 2.6rem)"
              : "clamp(3rem, 6vw, 5.5rem)",
            margin: 0,
          }}
        >
          Live Leaderboard
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingBottom: 4,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#ED8240",
              animation: "twinkle 1.5s ease-in-out infinite",
            }}
          />
          <span
            style={{
              ...orbitron,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#ED8240",
            }}
          >
            Live
          </span>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 48,
          minHeight: 0,
          padding: isMobile ? "0 20px 20px" : "0 56px 32px",
        }}
      >
        {sortedPositions.length === 0 && (
          <p
            style={{
              ...notoTH,
              opacity: 0.4,
              textAlign: "center",
              width: "100%",
            }}
          >
            No teams yet
          </p>
        )}

        {columns.map((col, colIdx) => (
          <div
            key={colIdx}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-evenly",
              minHeight: 0,
            }}
          >
            {col.map((pos, i) => {
              const globalIndex = colIdx === 0 ? i : half + i;
              return renderRow(pos, globalIndex, i === col.length - 1);
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 6 — CALCULATING (static)
// ---------------------------------------------------------------------------
function Slide6() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 24px 56px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...fontDisplay,
            fontSize: "clamp(2.2rem,5.5vw,4.5rem)",
            fontWeight: 900,
            letterSpacing: ".1em",
            lineHeight: 1,
            color: "#fff",
          }}
        >
          FINAL ROUND COMPLETE
        </div>
        <div
          style={{
            width: 200,
            height: 1.5,
            background: `linear-gradient(90deg,transparent,${C.blueCore},transparent)`,
            borderRadius: 1,
          }}
        />
        <div
          style={{
            ...orbitron,
            fontSize: "clamp(.75rem,1.4vw,1.05rem)",
            letterSpacing: ".28em",
            color: "rgba(255,255,255,.65)",
          }}
        >
          CALCULATING FINAL RANKINGS
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.blueCore,
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            ...notoTH,
            fontSize: "clamp(.65rem,1.1vw,.88rem)",
            color: "rgba(255,255,255,.3)",
            letterSpacing: ".08em",
            marginTop: 6,
          }}
        >
          กำลังประมวลผลคะแนนรอบสุดท้าย…
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 7 — รางวัลชมเชย
// ---------------------------------------------------------------------------
interface AwardSlideProps {
  data: RaceData;
  sortedPositions: Position[];
}

function Slide7({ data, sortedPositions }: AwardSlideProps) {
  const consolationTeams = sortedPositions.slice(3);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 24px 56px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          width: "100%",
          maxWidth: 560,
        }}
      >
        <div
          style={{
            ...orbitron,
            fontSize: "clamp(.55rem,.85vw,.72rem)",
            letterSpacing: ".38em",
            color: "rgba(255,255,255,.5)",
          }}
        >
          ✦ &nbsp; CONSOLATION AWARDS &nbsp; ✦
        </div>
        <div
          className="grad-blue"
          style={{
            ...orbitron,
            fontSize: "clamp(2.2rem,5.5vw,4.5rem)",
            fontWeight: 900,
            letterSpacing: ".1em",
          }}
        >
          รางวัลชมเชย
        </div>

        <div
          style={{
            background: "rgba(4,12,28,.82)",
            border: `1px solid rgba(237,130,64,.2)`,
            borderRadius: 12,
            padding: "20px 24px",
            width: "100%",
            maxHeight: "56vh",
            overflowY: "auto",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              ...orbitron,
              fontSize: 7,
              letterSpacing: ".22em",
              color: "rgba(255,255,255,.45)",
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: `1px solid rgba(237,130,64,.15)`,
            }}
          >
            🏅 รางวัลชมเชย — {consolationTeams.length} ทีม
          </div>

          {consolationTeams.length === 0 ? (
            <p
              style={{
                ...notoTH,
                fontSize: 12,
                color: "rgba(255,255,255,.35)",
                textAlign: "center",
                padding: "12px 0",
              }}
            >
              ไม่มีทีมในรอบนี้
            </p>
          ) : (
            consolationTeams.map((pos) => {
              const team = data.teams.find((t) => t.id === pos.teamId);
              if (!team) return null;
              const rank = sortedPositions.findIndex(
                (p) => p.teamId === pos.teamId,
              );
              return (
                <div
                  key={team.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(10,10,10,.6)",
                    border: `1px solid rgba(255,255,255,.04)`,
                    marginBottom: 7,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: team.color,
                      opacity: 0.6,
                      borderRadius: "1px 0 0 1px",
                    }}
                  />
                  <span
                    style={{
                      ...orbitron,
                      fontSize: 10,
                      fontWeight: 900,
                      width: 22,
                      textAlign: "center",
                      color: "rgba(255,255,255,.5)",
                    }}
                  >
                    {rank + 1}
                  </span>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: team.color,
                      boxShadow: `0 0 8px ${team.color}88`,
                      marginLeft: 6,
                    }}
                  />
                  <span
                    style={{
                      ...notoTH,
                      flex: 1,
                      paddingLeft: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      color: team.color,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {team.name}
                  </span>
                  <span
                    style={{
                      ...orbitron,
                      fontSize: 13,
                      fontWeight: 900,
                      color: "rgba(255,255,255,.6)",
                    }}
                  >
                    {pos.score}
                    <span style={{ fontSize: 8, marginLeft: 3, opacity: 0.5 }}>
                      PTS
                    </span>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 8 — รางวัลรองชนะเลิศอันดับ 2
// ---------------------------------------------------------------------------
function Slide8({ data, sortedPositions }: AwardSlideProps) {
  const t3 = sortedPositions[2]
    ? data.teams.find((t) => t.id === sortedPositions[2].teamId)
    : null;
  const s3 = sortedPositions[2]?.score ?? 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 24px 56px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...orbitron,
            fontSize: "clamp(.55rem,.85vw,.7rem)",
            letterSpacing: ".42em",
            color: "rgba(255,255,255,.4)",
          }}
        >
          — AWARD REVEAL —
        </div>
        <div
          className="grad-gold"
          style={{
            ...orbitron,
            fontSize: "clamp(2rem,5vw,3.8rem)",
            fontWeight: 900,
            letterSpacing: ".08em",
            lineHeight: 1,
          }}
        >
          รางวัลรองชนะเลิศอันดับ 2
        </div>
        <div
          style={{
            width: 160,
            height: 1.5,
            background: `linear-gradient(90deg,transparent,${C.gold},transparent)`,
            borderRadius: 1,
          }}
        />
        <div
          style={{ fontSize: 28, animation: "float 2.5s ease-in-out infinite" }}
        >
          🥉
        </div>
        {t3 && (
          <>
            <div
              style={{
                ...notoTH,
                fontSize: "clamp(1.4rem,3.2vw,2.6rem)",
                fontWeight: 800,
                color: t3.color,
                textShadow: `0 0 28px ${t3.color}99`,
              }}
            >
              {t3.name}
            </div>
            <div
              style={{
                ...orbitron,
                fontSize: "clamp(.8rem,1.5vw,1.1rem)",
                color: "rgba(255,255,255,.5)",
              }}
            >
              {s3}{" "}
              <span style={{ fontSize: ".65em", opacity: 0.6 }}>POINTS</span>
            </div>
          </>
        )}
        <div
          style={{
            ...notoTH,
            fontSize: "clamp(.65rem,1.1vw,.85rem)",
            color: "rgba(255,255,255,.28)",
            letterSpacing: ".08em",
            marginTop: 8,
          }}
        >
          ขอแสดงความยินดีกับรางวัลรองชนะเลิศอันดับ 2
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 9 — รางวัลรองชนะเลิศอันดับ 1
// ---------------------------------------------------------------------------
function Slide9({ data, sortedPositions }: AwardSlideProps) {
  const ru = sortedPositions[1]
    ? data.teams.find((t) => t.id === sortedPositions[1].teamId)
    : null;
  const sru = sortedPositions[1]?.score ?? 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 24px 56px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...orbitron,
            fontSize: "clamp(.55rem,.85vw,.7rem)",
            letterSpacing: ".42em",
            color: "rgba(255,255,255,.4)",
          }}
        >
          — AWARD REVEAL —
        </div>
        <div
          className="grad-blue"
          style={{
            ...orbitron,
            fontSize: "clamp(2rem,5vw,3.8rem)",
            fontWeight: 900,
            letterSpacing: ".08em",
            lineHeight: 1,
          }}
        >
          รางวัลรองชนะเลิศอันดับ 1
        </div>
        <div
          style={{
            width: 160,
            height: 1.5,
            background: `linear-gradient(90deg,transparent,${C.blueLight},transparent)`,
            borderRadius: 1,
          }}
        />
        <div
          style={{ fontSize: 28, animation: "float 2.5s ease-in-out infinite" }}
        >
          🥈
        </div>
        {ru && (
          <>
            <div
              style={{
                ...notoTH,
                fontSize: "clamp(1.4rem,3.2vw,2.6rem)",
                fontWeight: 800,
                color: ru.color,
                textShadow: `0 0 28px ${ru.color}99`,
              }}
            >
              {ru.name}
            </div>
            <div
              style={{
                ...orbitron,
                fontSize: "clamp(.8rem,1.5vw,1.1rem)",
                color: "rgba(255,255,255,.5)",
              }}
            >
              {sru}{" "}
              <span style={{ fontSize: ".65em", opacity: 0.6 }}>POINTS</span>
            </div>
          </>
        )}
        <div
          style={{
            ...notoTH,
            fontSize: "clamp(.65rem,1.1vw,.85rem)",
            color: "rgba(255,255,255,.28)",
            letterSpacing: ".08em",
            marginTop: 8,
          }}
        >
          ขอแสดงความยินดีกับรางวัลรองชนะเลิศอันดับ 1
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SLIDE 10 — รางวัลชนะเลิศ
// =========================================================================
function Slide10({ data, sortedPositions }: AwardSlideProps) {
  // ตอนนี้ Slide10 เป็น component ที่ identity คงที่ (module-level)
  // useEffect นี้จะยิงแค่ตอน "mount จริง" (เช่น navigate เข้าสไลด์นี้ครั้งแรก)
  // ไม่ยิงซ้ำทุกครั้งที่ parent re-render จาก score event แล้ว
  useEffect(() => {
    launchConfetti();
  }, []);

  const ch = sortedPositions[0]
    ? data.teams.find((t) => t.id === sortedPositions[0].teamId)
    : null;
  const sch = sortedPositions[0]?.score ?? 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: "0 24px 56px",
        position: "relative",
      }}
    >
      <div
        id="confetti-root"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(237,130,64,.06) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          textAlign: "center",
        }}
      >
        <div
          style={{
            ...orbitron,
            fontSize: "clamp(.5rem,.8vw,.68rem)",
            letterSpacing: ".48em",
            color: "rgba(255,255,255,.5)",
          }}
        >
          ✦ &nbsp; AMSci 2026 · ASTRO PARTY &nbsp; ✦
        </div>
        <div
          className="grad-gold"
          style={{
            ...orbitron,
            fontSize: "clamp(2rem,5vw,3.8rem)",
            fontWeight: 900,
            letterSpacing: ".08em",
            lineHeight: 1,
          }}
        >
          รางวัลชนะเลิศ
        </div>
        <div
          style={{
            width: 280,
            height: 2,
            background: `linear-gradient(90deg,transparent,${C.orange},${C.gold},${C.orange},transparent)`,
            borderRadius: 1,
          }}
        />
        <div
          style={{
            fontSize: "clamp(2.8rem,6vw,5rem)",
            animation: "float 2.2s ease-in-out infinite",
            filter: `drop-shadow(0 0 22px rgba(237,130,64,.8))`,
          }}
        >
          🏆
        </div>
        {ch && (
          <div
            style={{
              ...notoTH,
              fontSize: "clamp(1.6rem,3.8vw,3rem)",
              fontWeight: 900,
              color: ch.color,
              textShadow: `0 0 35px ${ch.color}cc, 0 0 70px ${ch.color}55`,
            }}
          >
            {ch.name}
          </div>
        )}
        <div
          style={{
            ...orbitron,
            fontSize: "clamp(1rem,2.2vw,1.7rem)",
            fontWeight: 900,
            color: C.gold,
          }}
        >
          {sch}{" "}
          <span
            style={{
              fontSize: ".4em",
              color: "rgba(255,255,255,.4)",
              marginLeft: 5,
            }}
          >
            POINTS
          </span>
        </div>
        <div
          style={{
            ...notoTH,
            fontSize: "clamp(.6rem,1vw,.82rem)",
            color: "rgba(255,255,255,.3)",
            letterSpacing: ".1em",
            marginTop: 4,
          }}
        >
          คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย · 9 สิงหาคม 2569
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FOOTER TICKER (static — hoisted)
// ---------------------------------------------------------------------------
function FooterTicker() {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        zIndex: 45,
        // background: "rgba(7,17,30,.92)",
        borderTop: `1px solid rgba(237,130,64,.12)`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backdropFilter: "blur(10px)",
        padding: "0 24px",
      }}
    >
      <span
        style={{
          ...notoTH,
          fontSize: 11,
          color: "rgba(255,255,255,.55)",
          letterSpacing: "0.05em",
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        ✦&nbsp;
        <span style={{ color: C.gold, fontWeight: 600 }}>
          วันที่ 9 สิงหาคม 2569
        </span>
        &nbsp;·&nbsp;ช่วงเช้า&nbsp;
        <span style={{ color: C.orange, fontWeight: 600 }}>Elimination</span>
        &nbsp;·&nbsp;ช่วงบ่าย&nbsp;
        <span style={{ color: C.orange, fontWeight: 600 }}>Semi-final</span>
        &nbsp;และ&nbsp;
        <span style={{ color: C.orange, fontWeight: 600 }}>Final</span>
        &nbsp;·&nbsp;รับชมการถ่ายทอดสดได้ทาง&nbsp;
        <span style={{ color: C.blueLight, fontWeight: 600 }}>
          facebook.com/@anandayquiz
        </span>
        &nbsp;✦
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// REFRESH BUTTON (hoisted — รับ props แทนอ่าน closure)
// ---------------------------------------------------------------------------
function RefreshBtn({
  onClick,
  isRefreshing,
}: {
  onClick: () => void;
  isRefreshing: boolean;
}) {
  return (
    <button
      onClick={onClick}
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
        background: "rgba(237,130,64,0.10)",
        border: "1px solid rgba(237,130,64,0.25)",
        transition: "all .2s",
        opacity: isRefreshing ? 0.6 : 1,
      }}
    >
      <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
      Sync
    </button>
  );
}

// ---------------------------------------------------------------------------
// NAV BAR (hoisted — รับ props แทนอ่าน closure)
// ---------------------------------------------------------------------------
interface NavBarProps {
  dataReady: boolean;
  currentSlide: number;
  totalSlides: number;
  round: number;
  isRefreshing: boolean;
  onGoToSlide: (n: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onRefresh: () => void;
}

function NavBar({
  dataReady,
  currentSlide,
  totalSlides,
  round,
  isRefreshing,
  onGoToSlide,
  onNext,
  onPrev,
  onRefresh,
}: NavBarProps) {
  const [showNav, setShowNav] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  const pillStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    // background: "rgba(10,20,38,0.90)",
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
    color: "rgba(255,255,255,.7)",
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
        bottom: 32,
        right: 16,
        zIndex: 50,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: 8,
        pointerEvents: "none",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {/* ── STATUS TOGGLE ── */}
      <div style={{ pointerEvents: "all" }}>
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
      </div>

      {showStatus && (
        <>
          <div style={{ ...pillStyle, pointerEvents: "all" }}>
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
          <div style={{ ...pillStyle, pointerEvents: "all" }}>
            <span
              style={{
                ...orbitron,
                fontSize: 11,
                color: C.blueLight,
                letterSpacing: "0.2em",
              }}
            >
              ROUND {round}
            </span>
          </div>
          <div
            style={{ ...pillStyle, padding: "5px 10px", pointerEvents: "all" }}
          >
            <RefreshBtn onClick={onRefresh} isRefreshing={isRefreshing} />
          </div>
        </>
      )}

      {/* ── DIVIDER ── */}
      <div style={{ width: 1, height: 20, background: border }} />

      {/* ── NAV TOGGLE ── */}
      <div style={{ pointerEvents: "all" }}>
        <button
          style={{ ...pillStyle, cursor: "pointer" }}
          onClick={() => setShowNav((v) => !v)}
        >
          <span style={{ ...notoTH, fontSize: 14, color: C.textMid }}>
            {showNav ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {showNav && (
        <>
          <div style={{ ...pillStyle, pointerEvents: "all" }}>
            <button style={btnStyle} onClick={onPrev}>
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
            <button style={btnStyle} onClick={onNext}>
              Next →
            </button>
          </div>

          {/* Dot indicators */}
          <div style={{ ...pillStyle, gap: 7, pointerEvents: "all" }}>
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                onClick={() => onGoToSlide(i + 1)}
                style={{
                  width: currentSlide === i + 1 ? 20 : 7,
                  height: 7,
                  borderRadius: currentSlide === i + 1 ? 3 : "50%",
                  background:
                    currentSlide === i + 1 ? C.orange : "rgba(255,255,255,.25)",
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

          {/* Slide jump emoji */}
          <div
            style={{
              ...pillStyle,
              padding: "5px 10px",
              gap: 2,
              pointerEvents: "all",
            }}
          >
            {(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const).map(
              (icon, i) => (
                <button
                  key={i}
                  style={{
                    ...btnStyle,
                    fontSize: 16,
                    opacity: currentSlide === i + 1 ? 1 : 0.45,
                    padding: "3px 8px",
                    background:
                      currentSlide === i + 1 ? "rgba(237,130,64,.12)" : "none",
                  }}
                  onClick={() => onGoToSlide(i + 1)}
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
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function ViewerDashboard() {
  const totalSlides = 10;
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

  const [canvaLinks, setCanvaLinks] = useState<Record<number, string>>({});

  // ── Admin / Local highlight control ──────────────────────────────────
  const [adminHighlightId, setAdminHighlightId] = useState<number | null>(null);
  const [localHighlightId, setLocalHighlightId] = useState<number | null>(null);
  // admin ชนะเสมอถ้ามีค่า
  const activeHighlightId = adminHighlightId ?? localHighlightId;

  // FIX B: เก็บ categories ล่าสุดไว้ใน ref เพื่อไม่ต้อง resubscribe presentation_state
  // ทุกครั้งที่ categories เปลี่ยน (เช่นตอนแอดมินอัปเดตคะแนน)
  const categoriesRef = useRef<Category[]>([]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const findCellByQuestionId = useCallback((qId: number) => {
    for (const cat of categoriesRef.current) {
      const q = cat.questions?.find((qq) => qq.id === qId);
      if (q) return { category: cat, question: q };
    }
    return null;
  }, []);

  // คลิก cell — 2 จังหวะ: ครั้งแรก highlight, คลิกซ้ำ cell เดิม → เปิด modal
  const handleCellClick = useCallback(
    (cat: Category, q: Question) => {
      const isAlreadyLocalHighlighted =
        localHighlightId === q.id && adminHighlightId === null;

      if (isAlreadyLocalHighlighted) {
        setSelectedCell({ category: cat, question: q });
      } else {
        setAdminHighlightId(null); // เคลียร์ของแอดมิน ให้ local ควบคุมได้ชั่วคราว
        setLocalHighlightId(q.id);
      }
    },
    [localHighlightId, adminHighlightId],
  );

  const handleModalClose = useCallback(() => {
    setSelectedCell(null);
    setLocalHighlightId(null); // รีเซ็ต ต้องคลิก 2 ครั้งใหม่เสมอ
  }, []);

  const fetchAll = useCallback(async () => {
    const [fresh, cats, evs, links] = await Promise.all([
      loadData(),
      loadCategories(),
      loadScoreEvents(),
      loadCanvaLinks(),
    ]);
    setData(fresh);
    setCategories(cats);
    setScoreEvents(evs);
    setCanvaLinks(links);
    setDataReady(true);
  }, []);

  useEffect(() => {
    fetchAll();

    const scoreChannel = subscribeToScoreEvents(() => {
      fetchAll();
    });
    const teamChannel = subscribeToTeams(() => {
      fetchAll();
    });

    return () => {
      unsubscribe(scoreChannel);
      unsubscribe(teamChannel);
    };
  }, [fetchAll]);

  // ── Presentation state (admin control) ───────────────────────────────
  // FIX B: subscribe ครั้งเดียวตอน mount ([]) — findCellByQuestionId อ่าน
  // categories ผ่าน ref แล้ว จึงไม่ต้อง resubscribe ทุกครั้งที่ categories
  // เปลี่ยน (ซึ่งเคยทำให้ loadPresentationState() ถูกเรียกซ้ำและดึงสไลด์
  // ผู้ใช้กลับไปตามแอดมินโดยไม่ตั้งใจ ทุกครั้งที่แอดมินอัปเดตคะแนน)
  useEffect(() => {
    loadPresentationState().then((s: PresentationState) => {
      setCurrentSlide(s.current_slide);
      setAdminHighlightId(s.highlighted_question_id);
      if (s.modal_open && s.highlighted_question_id) {
        const found = findCellByQuestionId(s.highlighted_question_id);
        if (found) setSelectedCell(found);
      }
    });

    const channel = subscribeToPresentationState((s: PresentationState) => {
      setCurrentSlide(s.current_slide);
      setAdminHighlightId(s.highlighted_question_id);
      setLocalHighlightId(null);

      if (s.modal_open && s.highlighted_question_id) {
        const found = findCellByQuestionId(s.highlighted_question_id);
        if (found) setSelectedCell(found);
      } else {
        setSelectedCell(null);
      }
    });

    return () => unsubscribe(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAll();
    setIsRefreshing(false);
  }, [fetchAll]);

  const goToSlide = useCallback((n: number) => setCurrentSlide(n), []);
  const nextSlide = useCallback(
    () => setCurrentSlide((s) => Math.min(s + 1, totalSlides)),
    [],
  );
  const prevSlide = useCallback(
    () => setCurrentSlide((s) => Math.max(s - 1, 1)),
    [],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "Escape") handleModalClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleModalClose, nextSlide, prevSlide]);

  // Derived
  const sortedPositions = [...data.positions].sort((a, b) => b.score - a.score);
  const topSix = sortedPositions.slice(0, 6);
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

  // FIX A: ทุก Slide ตอนนี้เป็น top-level function ที่ identity คงที่
  // ส่งข้อมูลผ่าน props แทนการปิด (closure) ทับ re-render ของ parent
  const slides: Record<number, React.ReactNode> = {
    1: <Slide1 />,
    2: (
      <Slide2
        data={data}
        categories={categories}
        sortedPositions={sortedPositions}
        answeredCount={answeredCount}
        totalQCount={totalQCount}
      />
    ),
    3: (
      <Slide3
        data={data}
        categories={categories}
        scoreEvents={scoreEvents}
        canvaLinks={canvaLinks}
        answeredCount={answeredCount}
        totalQCount={totalQCount}
        selectedCell={selectedCell}
        setSelectedCell={setSelectedCell}
        activeHighlightId={activeHighlightId}
        onCellClick={handleCellClick}
      />
    ),
    4: (
      <Slide4
        data={data}
        topSix={topSix}
        minScore={minScore}
        scoreRange={scoreRange}
      />
    ),
    5: <Slide5 data={data} sortedPositions={sortedPositions} />,
    6: <Slide6 />,
    7: <Slide7 data={data} sortedPositions={sortedPositions} />,
    8: <Slide8 data={data} sortedPositions={sortedPositions} />,
    9: <Slide9 data={data} sortedPositions={sortedPositions} />,
    10: <Slide10 data={data} sortedPositions={sortedPositions} />,
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `
            radial-gradient(ellipse 60% 45% at 50% 0%, rgba(237,130,64,0.05) 0%, transparent 60%),
            #080808
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
        <FooterTicker />
        <NavBar
          dataReady={dataReady}
          currentSlide={currentSlide}
          totalSlides={totalSlides}
          round={data.state.round}
          isRefreshing={isRefreshing}
          onGoToSlide={goToSlide}
          onNext={nextSlide}
          onPrev={prevSlide}
          onRefresh={handleRefresh}
        />
      </div>
    </>
  );
}
