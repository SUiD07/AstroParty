"use client";

/**
 * AstroParty Viewer Dashboard — Slide-Based
 * Theme: Space & Cosmos
 * Palette: #1A1A1A #ED8240 #FFFFFF #ED8240 #ED8240 #AA4229
 * Fonts: Noto Sans Thai + Orbitron (display)
 *
 * ── แก้ไขในรอบนี้ ──
 * FIX A: ยก Slide1, Slide3, Slide5–Slide11, NavBar, FooterTicker, RefreshBtn
 *        ออกมาเป็น top-level function (เหมือน Slide4 ที่เคยแก้ไปแล้ว)
 *        เพื่อไม่ให้ re-mount ทุกครั้งที่ parent re-render (ทุกครั้งที่มี score event)
 * FIX B: เปลี่ยน dependency array ของ presentation_state effect เป็น []
 *        ใช้ categoriesRef แทนการอ้าง categories ตรงๆ กัน stale closure
 * FIX C: QuestionModal ไม่ unmount ตอนปิดแล้ว (ใช้ prop `visible` คุม opacity/
 *        pointer-events แทน conditional render)
 * FIX D: Slide4 mount ค้างตลอดไม่ unmount ตอนสลับสไลด์ (เดิมใช้ key={currentSlide}
 *        ใน AnimatePresence ทำให้ Slide4 unmount ทุกครั้งที่เปลี่ยนสไลด์) —
 *        สไลด์อื่นยัง mount/unmount ตามปกติ
 * FIX E: CanvaSingleFrame — ทุกคำถามใช้ไฟล์ Canva เดียวกัน ต่างกันแค่เลขหน้า
 *        ท้าย URL (#26, #27, ...) ยืนยันแล้วว่าเปลี่ยน src ที่ต่างกันแค่
 *        fragment ทำให้ browser navigate ภายในเอกสารเดิม ไม่ reload ใหม่
 *        (ยืนยันจาก Network tab: ไม่มี request ก้อนใหญ่ใหม่ มีแค่ telemetry
 *        เบาๆ) จึงใช้ iframe เดียวถาวรแทนระบบ pool + LRU cache ที่เคยทำไว้
 *        ก่อนหน้า — เรียบง่ายกว่ามาก ไม่มีปัญหาเรื่อง memory บวมบนมือถือ
 *        หรือสถานะ loading/loaded ที่ไม่แม่นยำอีกต่อไป
 * FIX F: ★★ Rename ฟังก์ชันทุกสไลด์ให้ตรงกับตำแหน่งจริงที่แสดงบนจอ
 *        (เดิมหลังแทรก Slide2/Canva-Intro เข้ามา ชื่อฟังก์ชัน Slide2..Slide10
 *        เพี้ยนไปคนละตัวกับตำแหน่งจริง เช่น "Slide3" แปะอยู่ที่ตำแหน่งสไลด์ 4
 *        ทำให้สับสนตอนแก้โค้ด) ตอนนี้ชื่อฟังก์ชัน SlideN ตรงกับเลขสไลด์ N
 *        ที่เห็นจริงบนจอเสมอ — ยกเว้น Question Board (Slide4) ซึ่งยัง render
 *        แยกอยู่นอก `slides` record ตามเดิม (ดู FIX D/G)
 * FIX G: Slide2 (Canva Intro) mount ค้างตลอด session เหมือน Slide4 — เพราะ
 *        ใช้ไฟล์ Canva เดียวกัน จึงมีปัญหา "reload ทุกครั้งที่กลับมาสไลด์นี้"
 *        แบบเดียวกับที่เคยแก้ให้ Slide4 (FIX D/E) ย้ายออกจาก `slides` record
 *        มาเป็น persistent-mount wrapper แยกต่างหาก
 * FIX H: ★★ Slide2 ใช้ canvaPageOverride ตัวเดียวกับ Slide4 (Question Board)
 *        เพราะทั้งสองสไลด์ใช้ไฟล์ Canva เดียวกัน และไม่มีทางแสดงพร้อมกัน
 *        (คนละสไลด์) จึงใช้ประโยชน์จากปุ่ม ◀/▶ "เลื่อนหน้า Canva" ที่ทำไว้ใน
 *        /control ร่วมกันได้เลยโดยไม่ต้องเพิ่ม state/คอลัมน์ DB ใหม่ — ดู
 *        ControlPage.tsx ที่แยกเงื่อนไข "อยู่สไลด์ Canva Intro" ออกจาก
 *        "เปิด modal คำถามอยู่" เพื่อคำนวณเลขหน้าเริ่มต้นให้ถูก context
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
import { loadCanvaLinks, splitCanvaUrl } from "@/lib/db";
import {
  loadPresentationState,
  // updatePresentationState,
  subscribeToPresentationState,
  type PresentationState,
} from "@/lib/db";
// import Image from "next/image";
import Particles from "../Particles";
import Grainient from "../Grainient";

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
// getRank / getTeamsAtRank — จัดอันดับแบบ "standard competition ranking"
// (1,1,3,4,...) ถ้าคะแนนเท่ากันได้อันดับเดียวกัน แล้วอันดับถัดไปข้ามไปตาม
// จำนวนทีมที่เสมอกัน (เช่น 2 ทีมเสมออันดับ 1 → ทีมถัดไปเป็นอันดับ 3 ไม่ใช่ 2)
// ---------------------------------------------------------------------------
function getRank(sortedPositions: Position[], score: number): number {
  return sortedPositions.filter((p) => p.score > score).length + 1;
}

function getTeamsAtRank(
  sortedPositions: Position[],
  rank: number,
): Position[] {
  return sortedPositions.filter(
    (p) => getRank(sortedPositions, p.score) === rank,
  );
}

// ---------------------------------------------------------------------------
// Design Tokens
// ★ ปรับให้ตรงกับธีมจริงของ Canva — พื้นหลังโทนมารูน/น้ำตาลแดงอิฐอบอุ่น
// (ไม่ใช่ดำ/เนวี่แบบเดิม) มีแสงทองที่มุมบน และเนบิวลาสีม่วงที่มุมล่างซ้าย
// สีตรงนี้ประมาณจากภาพสไลด์จริง ไม่ใช่ HEX ที่แม่นยำ 100%
// ---------------------------------------------------------------------------
const C = {
  maroonDeep: "#170806", // พื้นหลังมืดสุด (มุมภาพ)
  maroonMid: "#3D160C", // พื้นหลังโทนกลาง
  maroonLight: "#6B2A12", // แสงอบอุ่นมุมบน/รอบโลโก้
  violet: "#5B3A73", // เนบิวลาสีม่วง มุมล่างซ้าย
  blueCore: "#ED8240",
  blueLight: "#C4B6AC",
  gold: "#F0B65C", // โทนทองอุ่น แยกจากส้มหลัก ใช้กับดาว/แสงกระพริบ
  orange: "#ED8240",
  redAcc: "#AA4229",
  slate: "#9C8478",
  bg: "#170806",
  white: "#FFFFFF",
  textHi: "#FFFFFF",
  textMid: "#C4B6AC",
  textLo: "#9C8478",
} as const;

// Surface helpers
const surface = "rgba(61,22,12,0.28)";
const surfaceHi = "rgba(61,22,12,0.46)";
const border = "rgba(255,255,255,0.14)";
const borderWarm = "rgba(237,130,64,0.32)";

// Reusable style objects
const glassCard = (warm = false): React.CSSProperties => ({
  background: surface,
  border: `1px solid ${warm ? borderWarm : border}`,
  borderRadius: 10,
  backdropFilter: "blur(10px)",
});

// ★ fontDisplay เดิมใช้ Bodoni Moda (เซอริฟ) ซึ่งขัดกับตัวอักษรบล็อกหนา
// สไตล์ LED/dot-matrix ของ Canva จริง — เปลี่ยนมาใช้ Orbitron น้ำหนักหนาแทน
const orbitron: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
};
const notoTH: React.CSSProperties = {
  fontFamily: "'Noto Sans Thai', sans-serif",
};

const fontDisplay: React.CSSProperties = {
  fontFamily: "'Orbitron', sans-serif",
  fontWeight: 900,
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
// function CosmosBackground() {
//   const [stars, setStars] = useState<
//     {
//       id: number;
//       left: number;
//       top: number;
//       size: number;
//       dur: number;
//       dl: number;
//     }[]
//   >([]);

//   useEffect(() => {
//     setStars(
//       Array.from({ length: 130 }, (_, i) => ({
//         id: i,
//         left: Math.random() * 100,
//         top: Math.random() * 100,
//         size: 0.8 + Math.random() * 1.8,
//         dur: 2 + Math.random() * 5,
//         dl: Math.random() * 4,
//       })),
//     );
//   }, []);

//   return (
//     <div
//       style={{
//         position: "absolute",
//         inset: 0,
//         pointerEvents: "none",
//         overflow: "hidden",
//       }}
//     >
//       <div
//         className="ap-nebula"
//         style={{
//           width: 900,
//           height: 500,
//           top: -150,
//           left: -250,
//           background:
//             "radial-gradient(ellipse, rgba(83,143,238,0.13), transparent 70%)",
//           animation: "ndrift 22s ease-in-out infinite alternate",
//         }}
//       />
//       <div
//         className="ap-nebula"
//         style={{
//           width: 600,
//           height: 600,
//           bottom: -80,
//           right: -120,
//           background:
//             "radial-gradient(ellipse, rgba(237,130,64,0.09), transparent 70%)",
//           animation: "ndrift 28s ease-in-out infinite alternate-reverse",
//         }}
//       />
//       <div
//         className="ap-nebula"
//         style={{
//           width: 400,
//           height: 300,
//           top: "38%",
//           left: "40%",
//           background:
//             "radial-gradient(ellipse, rgba(252,212,125,0.05), transparent 70%)",
//           animation: "ndrift 16s ease-in-out infinite alternate",
//         }}
//       />
//       {stars.map((s) => (
//         <div
//           key={s.id}
//           className="ap-star"
//           style={
//             {
//               left: `${s.left}%`,
//               top: `${s.top}%`,
//               width: s.size,
//               height: s.size,
//               opacity: 0.3 + Math.random() * 0.5,
//               "--dur": `${s.dur}s`,
//               "--dl": `${s.dl}s`,
//             } as React.CSSProperties
//           }
//         />
//       ))}
//     </div>
//   );
// }

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
            color: "#fff",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
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
  // teams,
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
  const MAX_VISIBLE = 9;
  // const visibleEvents = events.slice(0, MAX_VISIBLE);
  // const hiddenCount = Math.max(0, events.length - MAX_VISIBLE);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        position: "relative",
        minHeight: 62,
        padding: "8px 6px",
        borderRadius: 8,
        border: answered
          ? `1px solid rgba(237,130,64,0.25)`
          : "1px solid rgba(255,255,255,0.07)",
        background: answered
          ? `linear-gradient(135deg, rgba(23,8,6,0.95), rgba(61,22,12,0.28))`
          : "#20100a",
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
          {/* <div
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
          </div> */}

          {/* {hiddenCount > 0 && (
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
          )} */}

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
            // ...orbitron,
            ...notoTH,
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
// computeCanvaSrc — คำนวณ src จริงของ iframe โดยรองรับ "เลื่อนหน้า Canva
// ของ modal ที่เปิดอยู่" จากหน้า /control (canva_current_page ใน
// presentation_state) ถ้ามีค่า override ให้ใช้แทนเลขหน้าเริ่มต้นของคำถามนั้น
// ---------------------------------------------------------------------------
function computeCanvaSrc(
  fullUrl: string | undefined,
  pageOverride: number | null,
): string | undefined {
  if (!fullUrl) return undefined;
  if (pageOverride == null) return fullUrl;
  const { base } = splitCanvaUrl(fullUrl);
  if (!base) return fullUrl;
  return `${base}#${pageOverride}`;
}

// ---------------------------------------------------------------------------
// CanvaSingleFrame — iframe เดียวถาวรตลอด session
//
// ★ ทุกคำถามใช้ไฟล์ Canva เดียวกัน ต่างกันแค่เลขหน้าท้าย URL (#26, #27, ...)
// ยืนยันแล้วว่าการเปลี่ยน src ที่ต่างกันแค่ fragment (#) ทำให้ browser
// navigate ภายในเอกสารเดิม (เหมือนคลิกลิงก์ #anchor) ไม่ใช่การโหลดใหม่ทั้งหมด
// จึงไม่จำเป็นต้องมี pool ของหลาย iframe + LRU cache อีกต่อไป
// เพราะ React จะไม่ unmount <iframe> element นี้เลยตราบใดที่ key เดิม
// (ไม่มี key ผูกกับ question id) แค่เปลี่ยน attribute src เฉยๆ
// ---------------------------------------------------------------------------
function CanvaSingleFrame({
  src,
  modalVisible,
  fill,
}: {
  src: string | undefined;
  modalVisible: boolean;
  // ★ fill=true → ยืดเต็มพื้นที่ container (ใช้กับสไลด์เต็มจอ เช่น Slide2)
  // ค่าเริ่มต้น (undefined/false) → ขนาดคงที่แบบกล่อง 16:9 ในกรอบ modal
  fill?: boolean;
}) {
  if (!src) return null;
  return (
    <iframe
      src={src}
      allowFullScreen
      allow="fullscreen"
      style={{
        width: "100%",
        height: fill ? "100%" : "min(90vh, calc((100vw - 80px) * 9 / 16))",
        border: "none",
        borderRadius: 8,
        pointerEvents: modalVisible ? "auto" : "none",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// QuestionModal
// ไม่ unmount ตอนปิดแล้ว — คุมด้วย prop `visible` แทน (opacity/pointer-events)
// ---------------------------------------------------------------------------
function QuestionModal({
  category,
  question,
  events,
  teams,
  canvaLinks,
  onClose,
  scrollPulse,
  scrollTopPulse,
  visible,
  canvaPageOverride,
}: {
  category: Category;
  question: Question;
  events: ScoreEvent[];
  teams: RaceData["teams"];
  canvaLinks: Record<number, string>;
  onClose: () => void;
  scrollPulse?: number;
  scrollTopPulse?: number;
  visible: boolean;
  canvaPageOverride?: number | null;
}) {
  // ★★ [แก้ไข] เดิม layout เป็นแนวตั้ง (คะแนนอยู่ใต้ Canva) เลยต้อง scrollIntoView
  // ตอนนี้ปรับเป็นซ้าย-ขวาแล้ว (Canva ซ้าย / คะแนนขวา) ไม่มีอะไรต้องเลื่อนอีกต่อไป
  // เปลี่ยนเป็น "เรืองแสงกระพริบชั่วคราว" (1.6 วิ) ที่ฝั่งคะแนนแทน เพื่อดึงความสนใจ
  // ผู้ชมไปที่พาแนลคะแนน — สัญญาณ scrollPulse ยังใช้ pattern เดิม (เทียบค่าเก่า-ใหม่)
  const [scoreHighlight, setScoreHighlight] = useState(false);
  const prevScrollPulseRef = useRef(scrollPulse);
  useEffect(() => {
    if (
      scrollPulse !== undefined &&
      scrollPulse !== prevScrollPulseRef.current
    ) {
      setScoreHighlight(true);
      const t = setTimeout(() => setScoreHighlight(false), 1600);
      prevScrollPulseRef.current = scrollPulse;
      return () => clearTimeout(t);
    }
  }, [scrollPulse]);

  // ★★ [แก้ไข] เหมือนกันแต่ตรงข้าม — ไฮไลท์ฝั่ง Canva (ซ้าย) แทนตอนกดปุ่ม
  // "เลื่อนขึ้นไปดูโจทย์" ใน /control (เดิม scrollTo กลับขึ้นบนสุด)
  const [canvaHighlight, setCanvaHighlight] = useState(false);
  const prevScrollTopPulseRef = useRef(scrollTopPulse);
  useEffect(() => {
    if (
      scrollTopPulse !== undefined &&
      scrollTopPulse !== prevScrollTopPulseRef.current
    ) {
      setCanvaHighlight(true);
      const t = setTimeout(() => setCanvaHighlight(false), 1600);
      prevScrollTopPulseRef.current = scrollTopPulse;
      return () => clearTimeout(t);
    }
  }, [scrollTopPulse]);

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
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity .2s ease",
      }}
      onClick={onClose}
    >
      <motion.div
        animate={{
          scale: visible ? 1 : 0.9,
          opacity: visible ? 1 : 0,
          y: visible ? 0 : 14,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        style={{
          position: "relative",
          border: `1px solid ${borderWarm}`,
          borderRadius: 14,
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
              style={{
                transform: "scale(0.43)",
              }}
            >
              <iframe
                src="https://keepthescore.com/scoreboard/ymzywzmyfjzpr/"
                // src="https://stagetimer.io/output/6a5f772898e737c7ac88e520/?v=2&signature=d65fa0d941b542ed188a72c82d07eedf235c47965388f9fd62cec850b6fe3479"
                className="pointer-events-auto h-20 w-auto rounded-xl"
              ></iframe>
            </div>
          </div>
        </div>

        {/* ★★ [แก้ไข] เดิม div เดียว overflowY:auto วางซ้อนแนวตั้ง (Canva บน / คะแนนล่าง)
            ตอนนี้แยกเป็น flex row 2 คอลัมน์: ซ้าย = Canva (65%), ขวา = คะแนน (35%,
            scroll อิสระของตัวเอง) — ทั้งสองฝั่งกระพริบ outline/glow ได้เมื่อแอดมิน
            กดปุ่มเลื่อนจาก /control (แทนการ scrollIntoView/scrollTo แบบเดิม) */}
        <div
          style={{
            display: "flex",
            gap: 20,
            flex: 1,
            minHeight: 0,
            padding: "0 20px 20px",
          }}
        >
          {/* ── ฝั่งซ้าย: Canva iframe ── */}
          <div
            style={{
              flex: "0 0 65%",
              minWidth: 0,
              pointerEvents: visible ? "auto" : "none",
              borderRadius: 10,
              transition: "box-shadow .3s ease, outline-color .3s ease",
              outline: canvaHighlight
                ? `3px solid ${C.orange}`
                : "3px solid transparent",
              boxShadow: canvaHighlight
                ? `0 0 32px rgba(237,130,64,0.55)`
                : "none",
            }}
          >
            <CanvaSingleFrame
              src={computeCanvaSrc(
                canvaLinks[question.id],
                canvaPageOverride ?? null,
              )}
              modalVisible={visible}
              fill
            />
          </div>

          {/* ── ฝั่งขวา: รายการคะแนน (scroll อิสระของตัวเอง) ── */}
          <div
            style={{
              flex: "1 1 35%",
              minWidth: 0,
              overflowY: "auto",
              borderRadius: 10,
              padding: 10,
              transition: "box-shadow .3s ease, outline-color .3s ease",
              outline: scoreHighlight
                ? `3px solid ${C.orange}`
                : "3px solid transparent",
              boxShadow: scoreHighlight
                ? `0 0 32px rgba(237,130,64,0.55)`
                : "none",
            }}
          >
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
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GlitterBurst — กลุ่มประกายดาว 4 แฉก ฟุ้งกระจายเป็นทรงพวยพุ่ง (เลียนแบบ
// ลาย sparkle มุมบนขวาในดีไซน์ Canva จริง) ตำแหน่ง/ขนาด/จังหวะกระพริบ
// เป็นค่าคงที่ (ไม่ random ทุก render) กันภาพกระตุกตอน re-render
// ---------------------------------------------------------------------------
const SPARKLE_PATH =
  "M50,0 C52,35 65,48 100,50 C65,52 52,65 50,100 C48,65 35,52 0,50 C35,48 48,35 50,0 Z";

// { x, y, size, rotate, color, dur, delay } — x/y เป็น % ของกรอบ 0-400
const GLITTER_STARS: {
  x: number;
  y: number;
  size: number;
  rotate: number;
  color: string;
  dur: number;
  delay: number;
}[] = [
  { x: 330, y: 20, size: 34, rotate: 12, color: "#F0B65C", dur: 2.4, delay: 0 },
  { x: 380, y: 55, size: 22, rotate: -8, color: "#FFFFFF", dur: 1.8, delay: 0.3 },
  { x: 300, y: 70, size: 16, rotate: 20, color: "#ED8240", dur: 2.1, delay: 0.6 },
  { x: 355, y: 100, size: 28, rotate: -15, color: "#FFFFFF", dur: 2.6, delay: 0.15 },
  { x: 260, y: 40, size: 20, rotate: 5, color: "#F0B65C", dur: 1.9, delay: 0.9 },
  { x: 395, y: 130, size: 18, rotate: 30, color: "#ED8240", dur: 2.3, delay: 0.45 },
  { x: 310, y: 150, size: 24, rotate: -22, color: "#FFFFFF", dur: 2.0, delay: 1.1 },
  { x: 230, y: 90, size: 14, rotate: 10, color: "#F0B65C", dur: 1.7, delay: 0.75 },
  { x: 270, y: 165, size: 12, rotate: -5, color: "#FFFFFF", dur: 2.5, delay: 0.2 },
  { x: 200, y: 130, size: 16, rotate: 18, color: "#ED8240", dur: 2.2, delay: 1.3 },
  { x: 340, y: 185, size: 10, rotate: 8, color: "#F0B65C", dur: 1.6, delay: 0.55 },
  { x: 180, y: 175, size: 12, rotate: -12, color: "#FFFFFF", dur: 2.0, delay: 0.85 },
  { x: 370, y: 15, size: 12, rotate: 25, color: "#FFFFFF", dur: 1.5, delay: 1.5 },
  { x: 235, y: 20, size: 10, rotate: -18, color: "#ED8240", dur: 2.4, delay: 0.4 },
];

function GlitterBurst({
  width = 420,
  opacity = 1,
}: {
  width?: number;
  opacity?: number;
}) {
  return (
    <svg
      viewBox="0 0 400 200"
      width={width}
      height={width / 2}
      style={{ opacity }}
    >
      <defs>
        <path id="ap-sparkle" d={SPARKLE_PATH} />
      </defs>
      {GLITTER_STARS.map((s, i) => (
        <use
          key={i}
          href="#ap-sparkle"
          x={-50}
          y={-50}
          width={100}
          height={100}
          transform={`translate(${s.x} ${s.y}) rotate(${s.rotate}) scale(${
            s.size / 100
          })`}
          fill={s.color}
          style={{
            transformOrigin: "50px 50px",
            filter: `drop-shadow(0 0 6px ${s.color}99)`,
            animation: `twinkle ${s.dur}s ease-in-out infinite ${s.delay}s`,
          }}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Slide Prop Types
// ---------------------------------------------------------------------------
// HeartPulseMotif — ลายตกแต่งหัวใจ + คลื่นไฟฟ้าหัวใจ (ECG) เลียนแบบธีมของ
// Canva design จริง (หัวใจเส้นขาวโปร่ง + เส้นคลื่นชีพจรพาดผ่านกลาง)
// ใช้เป็นลายพื้นหลังโปร่งแสงเบาๆ ไม่แย่งความสนใจจากเนื้อหาหลัก
// ---------------------------------------------------------------------------
function HeartPulseMotif({
  opacity = 0.12,
  width = 560,
}: {
  opacity?: number;
  width?: number;
}) {
  return (
    <svg
      viewBox="0 0 400 400"
      width={width}
      height={width}
      style={{
        opacity,
        filter: "drop-shadow(0 0 18px rgba(255,255,255,0.25))",
      }}
    >
      {/* หัวใจ — เส้นขอบโปร่ง ไม่มีพื้นข้างใน */}
      <path
        d="M200,338 C118,258 42,190 42,122 C42,74 80,42 122,42 C158,42 186,66 200,102 C214,66 242,42 278,42 C320,42 358,74 358,122 C358,190 282,258 200,338 Z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={3}
      />
      {/* เส้นคลื่นไฟฟ้าหัวใจ (ECG) พาดผ่านกลางหัวใจ */}
      <path
        d="M0,206 L58,206 L78,188 L98,224 L118,140 L138,262 L158,196 L200,196 L220,166 L238,222 L258,200 L400,200"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      {/* ★ ลายตกแต่งหัวใจ+ECG พื้นหลัง — วางกึ่งกลาง อยู่หลังเนื้อหาหลักทั้งหมด */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* <HeartPulseMotif opacity={0.1} width={620} /> */}
      </div>

      {/* ★ ประกายดาวฟุ้งมุมบนขวา เลียนแบบลาย sparkle ในดีไซน์ Canva จริง */}
      <div
        style={{
          position: "absolute",
          top: "-4%",
          right: "-2%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <GlitterBurst width={460} opacity={0.85} />
      </div>
      <div
        style={{
          position: "absolute",
          top: "0%",
          right: "90%",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <GlitterBurst width={460} opacity={0.85} />
      </div>
      <div
        style={{
          position: "absolute",
          top: "70%",
          right: "90%",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <GlitterBurst width={460} opacity={0.85} />
      </div>
      <div
        style={{
          position: "absolute",
          top: "70%",
          right: "0%",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <GlitterBurst width={460} opacity={0.85} />
      </div>
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

      {/* <div
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
      </div> */}

      {/* <div
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
      </div> */}
      {/* ── LOGO ROW (เดิม) — เก็บไว้อ้างอิง ปิดใช้งานชั่วคราว ──
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
      */}

      {/* ── LOGO ROW (ใหม่) — จัดกลางทั้งแถว โลโก้ AMSci อยู่กลางและใหญ่เด่น ── */}

      {/* <div
        style={{
          width: 40,
          height: 2,
          background: C.orange,
          borderRadius: 1,
          marginBottom: 40,
          flexShrink: 0,
        }}
      /> */}

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
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            paddingTop: 64,
            paddingBottom: 48,
            flexShrink: 0,
          }}
        >
          <img
            src="/smcu_old.webp"
            alt="สโมสรนิสิตคณะแพทยศาสตร์"
            style={{
              width: "clamp(9rem,4.5vw,4.5rem)",
              height: "auto",
              // opacity: 0.85,
            }}
          />
  
          <div
            style={{
              width: 1,
              height: 56,
              background: "rgba(255,255,255,0.08)",
            }}
          />
  
          <img
            src="/logo.png"
            alt="AMSci 2026"
            style={{ width: "clamp(25rem,17vw,20rem)", height: "auto" }}
          />
  
          <div
            style={{
              width: 1,
              height: 56,
              background: "rgba(255,255,255,0.08)",
            }}
          />
  
          <img
            src="/MD_Chula.png"
            alt="คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย"
            style={{
              width: "clamp(9rem,4.5vw,4.5rem)",
              height: "auto",
              // opacity: 0.85,
            }}
          />
        </div>
        <p
          style={{
            ...notoTH,
            color: C.orange,
            fontSize: "clamp(1.5rem,1.4vw,1.1rem)",
            // letterSpacing: "0.25em",
            marginBottom: 24,
          }}
        >
          Ananda Mahidol Day&apos;s Biology and Medical Science Test 2026
        </p>

        {/* ── "Final Round" heading (เดิม) — เอาออกจากสไลด์ตามคำขอ เก็บไว้อ้างอิง ──
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
        */}

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
              fontSize: "clamp(0.7rem,1.5vw,1.45rem)",
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.9,
              margin: 0,
            }}
          >
            งานแข่งขันตอบปัญหาวิชาการและวิทยาศาสตร์การแพทย์ โดยนิสิตแพทย์จุฬาฯ
            <br />
            เนื่องในงานสัปดาห์วันอานันทมหิดล
            {/* <br/> */} ประจำปีการศึกษา 2569
          </p>

          <div
            style={{
              width: 1,
              height: 32,
              background: "rgba(255,255,255,0.06)",
              margin: "0 auto",
            }}
          />

          {/* <p
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
          </p> */}
        </div>
      </div>

      <div style={{ paddingBottom: 40, flexShrink: 0 }}>
        <p
          style={{
            ...fontDisplay,
            color: "rgba(255,255,255,0.65)",
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
// SLIDE 2 — CANVA INTRO (เต็มจอ)
// ★ ใช้ไฟล์ Canva เดียวกันกับ Question Board (Slide4) เลยได้ประโยชน์จาก
//   ปุ่ม ◀/▶ "เลื่อนหน้า Canva" ที่ทำไว้ใน /control ร่วมกันได้เลย — ควบคุมผ่าน
//   canvaPageOverride ตัวเดียวกัน (ดู ControlPage.tsx ที่แยกเงื่อนไข "อยู่สไลด์
//   Canva Intro" ออกจาก "เปิด modal คำถามอยู่" เพื่อสลับ base page ให้ถูก context)
// ★ ใช้ CanvaSingleFrame ตัวเดียวกับที่ Question Board ใช้ — iframe จะไม่ถูก
//   ทำลายตอนสลับสไลด์ไปมา (ดู persistent-mount wrapper ใน Main ด้านล่าง)
//   แก้ปัญหาเดิมที่ Canva ต้องโหลดใหม่ทุกครั้งที่กลับมาสไลด์นี้
// ---------------------------------------------------------------------------
const INTRO_CANVA_URL =
  "https://www.canva.com/design/DAHPWmXRz-8/uGmhgJxkpGvoMveLuyJr2g/view?embed";

interface Slide2Props {
  canvaPageOverride: number | null;
  isActive: boolean;
}

function Slide2({ canvaPageOverride, isActive }: Slide2Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: 12,
      }}
    >
      <CanvaSingleFrame
        src={computeCanvaSrc(INTRO_CANVA_URL, canvaPageOverride)}
        modalVisible={isActive}
        fill
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 3 — OVERVIEW
// ---------------------------------------------------------------------------
interface Slide3Props {
  data: RaceData;
  categories: Category[];
  sortedPositions: Position[];
  answeredCount: number;
  totalQCount: number;
}

function Slide3({
  data,
  categories,
  sortedPositions,
  answeredCount,
  // totalQCount,
}: Slide3Props) {
  const leaderScore = sortedPositions[0]?.score;
  const leaderTeams =
    leaderScore !== undefined
      ? sortedPositions.filter((p) => p.score === leaderScore)
      : [];
  const leaderName =
    leaderTeams.length > 0
      ? leaderTeams
          .map((p) => data.teams.find((t) => t.id === p.teamId)?.name)
          .filter(Boolean)
          .join(" · ")
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

      <div className="px-16 pb-7 flex gap-5">
        <div
          className="flex-[0.8] rounded-2xl p-6"
          style={{
            background: "rgba(61,22,12,0.55)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              // color: "rgba(255,255,255,0.25)",
              fontSize: 13,
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
          className="flex-[0.8] rounded-2xl p-6"
          style={{
            background: "rgba(61,22,12,0.55)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              // color: "rgba(255,255,255,0.25)",
              fontSize: 13,
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
            <span className="text-white ml-1" style={{ fontSize: "1.5rem" }}>
              / 12
              {/* {totalQCount} */}
            </span>
          </p>
        </div>

        <div
          className="flex-[1.8] rounded-2xl p-6"
          style={{
            background: "rgba(61,22,12,0.55)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p
            style={{
              // color: "rgba(255,255,255,0.25)",
              fontSize: 13,
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
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
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
              // color: "rgba(255,255,255,0.2)",
              fontSize: 20,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 10,
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
// SLIDE 4 — QUESTION BOARD (top-level, hoisted)
// ★ Mount ค้างตลอด session (ดู Main component ด้านล่าง) เพื่อให้ QuestionModal
//   และ CanvaSingleFrame ข้างในไม่ถูกทำลายเวลาสลับสไลด์ไปมา
// ---------------------------------------------------------------------------
interface Slide4Props extends SlideCommonProps {
  answeredCount: number;
  totalQCount: number;
  selectedCell: { category: Category; question: Question } | null;
  onCloseModal: () => void;
  activeHighlightId: number | null;
  onCellClick: (cat: Category, q: Question) => void;
  onBackgroundClick: () => void;
  scrollPulse: number;
  scrollTopPulse: number;
  canvaPageOverride: number | null;
}

function Slide4({
  data,
  categories,
  scoreEvents,
  canvaLinks,
  answeredCount,
  totalQCount,
  selectedCell,
  onCloseModal,
  activeHighlightId,
  onCellClick,
  onBackgroundClick,
  scrollPulse,
  scrollTopPulse,
  canvaPageOverride,
}: Slide4Props) {
  const getEvents = (qId: number) =>
    scoreEvents.filter((e) => e.question_id === qId);

  // ★ เก็บ selectedCell ล่าสุดไว้ ไม่ให้ QuestionModal unmount ตอนปิด
  const [lastCell, setLastCell] = useState<Slide4Props["selectedCell"]>(null);
  useEffect(() => {
    // เปิด modal จริงแล้ว — ใช้ค่านี้เป็นหลักเสมอ
    if (selectedCell) {
      setLastCell(selectedCell);
      return;
    }
    // ★ ยังไม่เปิด modal แต่มีคำถามถูก highlight ไว้ (จังหวะคลิกแรก
    // หรือแอดมิน highlight จากระยะไกล) → mount QuestionModal แบบซ่อนไว้
    // (visible=false เพราะ selectedCell ยังเป็น null) เพื่อให้ iframe
    // ของ Canva navigate ไปหน้าที่ highlight รอไว้ล่วงหน้า (แทบไม่มีต้นทุน
    // เพราะทุกคำถามใช้ไฟล์ Canva เดียวกัน แค่เปลี่ยนเลขหน้าท้าย URL)
    if (activeHighlightId != null) {
      for (const cat of categories) {
        const q = cat.questions?.find((qq) => qq.id === activeHighlightId);
        if (q) {
          setLastCell({ category: cat, question: q });
          return;
        }
      }
    }
  }, [selectedCell, activeHighlightId, categories]);

  return (
    <div
      onClick={onBackgroundClick}
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

      {lastCell && (
        <QuestionModal
          category={lastCell.category}
          question={lastCell.question}
          events={getEvents(lastCell.question.id)}
          teams={data.teams}
          canvaLinks={canvaLinks}
          onClose={onCloseModal}
          scrollPulse={scrollPulse}
          scrollTopPulse={scrollTopPulse}
          visible={!!selectedCell}
          canvaPageOverride={canvaPageOverride}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 5 — SPACE RACE
// ---------------------------------------------------------------------------
interface Slide5Props {
  data: RaceData;
  topSix: Position[];
  minScore: number;
  scoreRange: number;
}

function Slide5({ data, topSix, minScore, scoreRange }: Slide5Props) {
  // ★ เก็บว่าจรวดของทีมไหนเคยปรากฏบนจอ Space Race มาแล้วบ้าง (ref เพราะแค่
  // ใช้เลือก animation ไม่ต้อง trigger re-render) — ครั้งแรกที่โผล่มาเล่น
  // animation "เลื่อนช้าๆ แล้วพุ่งไปตำแหน่งตัวเอง" (ease-in) ส่วนครั้งต่อๆ ไป
  // ที่แค่ขยับตำแหน่งเพราะคะแนนเปลี่ยน ใช้ spring แบบเดิมที่กระฉับกระเฉงกว่า
  const shipEnteredRef = useRef<Set<string>>(new Set());

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

                // ★ ทีมนี้เคยปรากฏบนจอนี้มาก่อนหรือยัง (ดูจาก ref ด้านบน)
                const isFirstEntry = !shipEnteredRef.current.has(team.id);

                return (
                  <motion.div
                    key={team.id}
                    layoutId={`ship-${team.id}`}
                    initial={
                      isFirstEntry
                        ? { left: "-16%", top: `${yPos}%`, opacity: 0 }
                        : false
                    }
                    animate={{
                      left: `${Math.min(100, leftPct)}%`,
                      top: `${yPos}%`,
                      opacity: 1,
                    }}
                    transition={
                      isFirstEntry
                        ? // ★ เลื่อนช้าๆ ก่อนแล้วค่อยพุ่ง (ease-in — ช้าตอนเริ่ม
                          // เร่งความเร็วขึ้นเรื่อยๆ ตอนท้าย) ใช้ตอนจรวดโผล่มาครั้งแรก
                          { duration: 1.4, ease: [0.55, 0.06, 0.68, 0.19] }
                        : // ครั้งต่อๆ ไปที่แค่ขยับตำแหน่งเพราะคะแนนเปลี่ยน
                          // ใช้ spring แบบเดิมที่กระฉับกระเฉงกว่า
                          { type: "spring", stiffness: 40, damping: 15 }
                    }
                    onAnimationComplete={() => {
                      shipEnteredRef.current.add(team.id);
                    }}
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
                            borderRadius: 10,
                            color: team.color,
                            letterSpacing: "0.10em",
                            background: "rgba(61,22,12,0.55)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}
                          // className="border-2 border-slate-800"
                        >
                          <span style={{ opacity: 0.45 }}>
                            #
                            {topSix.filter((p) => p.score > pos.score).length +
                              1}
                          </span>{" "}
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
// Decoration — เติมพื้นที่ว่างฝั่งขวาของ Live Leaderboard เวลาทีมน้อย
// ตำแหน่ง/ขนาดคงที่ (ไม่ random ทุก render) กันภาพกระตุกตอน re-render
// ---------------------------------------------------------------------------
function LeaderboardDecor({ compact }: { compact?: boolean }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: compact ? 120 : 220,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* ดาวเคราะห์วงแหวน */}
      <div
        style={{
          position: "absolute",
          top: "8%",
          right: "18%",
          width: compact ? 46 : 72,
          height: compact ? 46 : 72,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 32% 28%, #9CC8EE, #254074 58%, #0D1B2E)",
          boxShadow: "0 0 34px rgba(83,143,238,0.28)",
          animation: "float 7s ease-in-out infinite",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: compact ? "170%" : "160%",
            height: compact ? "34%" : "30%",
            border: "1.3px solid rgba(156,200,238,0.22)",
            borderRadius: "50%",
            transform: "translate(-50%,-50%) rotateX(70deg)",
          }}
        />
      </div>

      {/* ดาวเคราะห์เล็กสีม่วง */}
      <div
        style={{
          position: "absolute",
          bottom: "14%",
          left: "20%",
          width: compact ? 26 : 40,
          height: compact ? 26 : 40,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 32%, #C4A8F0, #4B2A8A 60%, #1A0D2E)",
          opacity: 0.6,
          animation: "float 5s ease-in-out infinite 1s",
        }}
      />

      {/* จรวด */}
      <div
        style={{
          position: "absolute",
          top: "42%",
          left: "12%",
          width: compact ? 22 : 34,
          height: compact ? 15 : 22,
          clipPath: "polygon(0% 0%, 100% 50%, 0% 100%, 22% 50%)",
          background: C.orange,
          opacity: 0.55,
          filter: "drop-shadow(0 0 8px rgba(237,130,64,.5))",
          animation: "float 4.2s ease-in-out infinite .6s",
        }}
      />

      {/* จุดดาวกระจาย */}
      {[
        { top: "20%", left: "55%", size: 3 },
        { top: "65%", left: "70%", size: 2 },
        { top: "78%", left: "35%", size: 2.5 },
        { top: "30%", left: "80%", size: 2 },
        { top: "55%", left: "10%", size: 2 },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.6,
            animation: `twinkle ${2 + i}s ease-in-out infinite ${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 6 — LIVE LEADERBOARD
// ซ้าย fix สูงสุด 4 ทีม, ขวาคือทีมที่เหลือ (ปกติ 2 ทีมจาก 6 ทีมรวม)
// ถ้าทีมทั้งหมด < 4 คอลัมน์ขวาว่าง เติม decoration ล้วน
// ถ้าขวามีทีมน้อยกว่าซ้าย (แถวเหลือ) เติม decoration ในช่องว่างที่เหลือ
// ---------------------------------------------------------------------------
interface Slide6Props {
  data: RaceData;
  sortedPositions: Position[];
}

function Slide6({ data, sortedPositions }: Slide6Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const LEFT_MAX = 4;
  const leftTeams = sortedPositions.slice(0, LEFT_MAX);
  const rightTeams = sortedPositions.slice(LEFT_MAX);
  const hasRightTeams = rightTeams.length > 0;
  const useTwoColumns = !isMobile && sortedPositions.length > 0;

  const rowsForSizing = Math.max(1, leftTeams.length);
  const rowPad = Math.min(18, 140 / rowsForSizing);
  const nameSize = Math.min(1.6, 12 / rowsForSizing + 0.9);
  const scoreSize = Math.min(2.4, 18 / rowsForSizing + 1.2);
  const rankSize = Math.min(13, 90 / rowsForSizing + 8);

  const renderRow = (pos: Position, i: number, isLastInColumn: boolean) => {
    const team = data.teams.find((t) => t.id === pos.teamId);
    if (!team) return null;

    const rank = getRank(sortedPositions, pos.score);
    const isFirst = rank === 1; // ★ ใช้ rank แทน index กันเคสเสมออันดับ 1

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
          {rank}
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

        {sortedPositions.length > 0 && (
          <>
            {/* คอลัมน์ซ้าย — สูงสุด 4 ทีม */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-evenly",
                minHeight: 0,
              }}
            >
              {leftTeams.map((pos, i) =>
                renderRow(pos, i, i === leftTeams.length - 1),
              )}
            </div>

            {/* คอลัมน์ขวา — ทีมที่เหลือ + decoration เติมพื้นที่ว่าง */}
            {useTwoColumns && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                }}
              >
                {!hasRightTeams ? (
                  // ทีมทั้งหมด < 4 → ขวาว่างทั้งคอลัมน์ เป็น decoration ล้วน
                  <LeaderboardDecor />
                ) : (
                  <>
                    <div
                      style={{
                        flex: rightTeams.length,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-evenly",
                        minHeight: 0,
                      }}
                    >
                      {rightTeams.map((pos, i) => {
                        const globalIndex = LEFT_MAX + i;
                        return renderRow(
                          pos,
                          globalIndex,
                          i === rightTeams.length - 1,
                        );
                      })}
                    </div>
                    {/* เติม decoration ในพื้นที่ว่างที่เหลือ ถ้าทีมขวาน้อยกว่าซ้าย */}
                    {rightTeams.length < leftTeams.length && (
                      <div
                        style={{ flex: leftTeams.length - rightTeams.length }}
                      >
                        <LeaderboardDecor compact />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 7 — CALCULATING (static)
// ---------------------------------------------------------------------------
function Slide7() {
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
// SLIDE 8 — รางวัลชมเชย
// ---------------------------------------------------------------------------
interface AwardSlideProps {
  data: RaceData;
  sortedPositions: Position[];
}

function Slide8({ data, sortedPositions }: AwardSlideProps) {
  const consolationTeams = sortedPositions.filter(
    (p) => getRank(sortedPositions, p.score) > 3,
  );

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
          ✦ &nbsp; AMSci 2026 &nbsp; ✦
        </div>
        <div
          className="grad-blue"
          style={{
            // ...orbitron,
            ...notoTH,
            fontSize: "clamp(2.2rem,5.5vw,4.5rem)",
            fontWeight: 900,
            letterSpacing: ".1em",
          }}
        >
          รางวัลชมเชย
        </div>

        <div
          style={{
            padding: "20px 24px",
            width: "100%",
            maxHeight: "56vh",
            overflowY: "auto",
            backdropFilter: "blur(16px)",
          }}
        >
          <div
            style={{
              // ...orbitron,
              ...notoTH,
              fontSize: 20,
              letterSpacing: ".22em",
              marginBottom: 12,
              paddingBottom: 8,
            }}
          >
            รางวัลชมเชย {consolationTeams.length} ทีม
          </div>

          {consolationTeams.length === 0 ? (
            <p
              style={{
                ...notoTH,
                fontSize: 12,
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
              const rank = getRank(sortedPositions, pos.score);
              return (
                <div
                  key={team.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "rgba(23,8,6,.6)",
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
                      opacity: 0.6,
                      borderRadius: "1px 0 0 1px",
                    }}
                  />
                  <span
                    style={{
                      ...orbitron,
                      fontSize: 17,
                      fontWeight: 900,
                      width: 22,
                      textAlign: "center",
                    }}
                  >
                    {rank}
                  </span>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: team.color,
                      marginLeft: 6,
                    }}
                  />
                  <span
                    style={{
                      ...notoTH,
                      flex: 1,
                      paddingLeft: 10,
                      fontSize: 20,
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
                      fontSize: 20,
                      fontWeight: 900,
                    }}
                  >
                    {pos.score}
                    <span
                      style={{
                        fontSize: 20,
                        marginLeft: 3,
                        opacity: 0.5,
                        ...notoTH,
                      }}
                    >
                      {" "}
                      คะแนน
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
// SLIDE 9 — รางวัลรองชนะเลิศอันดับ 2
// ---------------------------------------------------------------------------
function Slide9({ data, sortedPositions }: AwardSlideProps) {
  const rank3Positions = getTeamsAtRank(sortedPositions, 3);
  const rank3Teams = rank3Positions
    .map((p) => data.teams.find((t) => t.id === p.teamId))
    .filter((t): t is NonNullable<typeof t> => !!t);
  const s3 = rank3Positions[0]?.score ?? 0;

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
            fontSize: "clamp(.55rem,.85vw,.72rem)",
            letterSpacing: ".38em",
            color: "rgba(255,255,255,.5)",
          }}
        >
          ✦ &nbsp; AMSci 2026 &nbsp; ✦
        </div>
        <div
          className="grad-gold"
          style={{
            // ...orbitron,
            ...notoTH,
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
        {rank3Teams.length > 0 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {rank3Teams.map((t3) => (
            <div
                  key={t3.id}
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
              ))}
            </div>
            <div
              style={{
                ...orbitron,
                fontSize: "clamp(1.8rem,1.5vw,1.1rem)",
              }}
            >
              {s3}{" "}
              <span style={{ fontSize: "1.1em", opacity: 0.6, ...notoTH }}>
                คะแนน
              </span>
            </div>
          </>
        )}
        <div
          style={{
            ...notoTH,
            fontSize: "clamp(1.3rem,1.1vw,.85rem)",
            // color: "rgba(255,255,255,.28)",
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
// SLIDE 10 — รางวัลรองชนะเลิศอันดับ 1
// ---------------------------------------------------------------------------
function Slide10({ data, sortedPositions }: AwardSlideProps) {
  const rank2Positions = getTeamsAtRank(sortedPositions, 2);
  const rank2Teams = rank2Positions
    .map((p) => data.teams.find((t) => t.id === p.teamId))
    .filter((t): t is NonNullable<typeof t> => !!t);
  const sru = rank2Positions[0]?.score ?? 0;

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
            fontSize: "clamp(.55rem,.85vw,.72rem)",
            letterSpacing: ".38em",
            color: "rgba(255,255,255,.5)",
          }}
        >
          ✦ &nbsp; AMSci 2026 &nbsp; ✦
        </div>
        <div
          className="grad-blue"
          style={{
            // ...orbitron,
            ...notoTH,
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
        {rank2Teams.length > 0 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {rank2Teams.map((ru) => (
            <div
                  key={ru.id}
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
              ))}
            </div>
            <div
              style={{
                ...orbitron,
                fontSize: "clamp(1.8rem,1.5vw,1.1rem)",
              }}
            >
              {sru}{" "}
              <span style={{ fontSize: "1.1em", opacity: 0.6, ...notoTH }}>
                คะแนน
              </span>
            </div>
          </>
        )}
        <div
          style={{
            ...notoTH,
            fontSize: "clamp(1.3rem,1.1vw,.85rem)",
            // color: "rgba(255,255,255,.28)",
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

// ---------------------------------------------------------------------------
// SLIDE 11 — รางวัลชนะเลิศ
// ---------------------------------------------------------------------------
function Slide11({ data, sortedPositions }: AwardSlideProps) {
  // Slide11 เป็น component identity คงที่ (module-level)
  // useEffect นี้จะยิงแค่ตอน "mount จริง" (navigate เข้าสไลด์นี้ครั้งแรก)
  // ไม่ยิงซ้ำทุกครั้งที่ parent re-render จาก score event
  useEffect(() => {
    launchConfetti();
  }, []);

  const rank1Positions = getTeamsAtRank(sortedPositions, 1);
  const rank1Teams = rank1Positions
    .map((p) => data.teams.find((t) => t.id === p.teamId))
    .filter((t): t is NonNullable<typeof t> => !!t);
  const sch = rank1Positions[0]?.score ?? 0;

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
            fontSize: "clamp(.55rem,.85vw,.72rem)",
            letterSpacing: ".38em",
            color: "rgba(255,255,255,.5)",
          }}
        >
          ✦ &nbsp; AMSci 2026 &nbsp; ✦
        </div>
        <div
          className="grad-gold"
          style={{
            // ...orbitron,
            ...notoTH,
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
        {rank1Teams.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rank1Teams.map((ch) => (
          <div
                key={ch.id}
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
            ))}
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
          <span style={{ fontSize: "1.1em", opacity: 0.6, ...notoTH }}>
            คะแนน
          </span>
        </div>
        <div
          style={{
            ...notoTH,
            fontSize: "clamp(1.3rem,1.1vw,.85rem)",
            // color: "rgba(255,255,255,.28)",
            letterSpacing: ".08em",
            marginTop: 8,
          }}
        >
          ขอแสดงความยินดีกับรางวัลชนะเลิศอันดับ 1
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLIDE 12 — BREAK / PAUSE (ต่อท้ายเป็นสไลด์สุดท้าย ไม่แทรกกลาง กัน renumber
// สไลด์อื่นทั้งหมดที่เคยพลาดมาก่อน) ★★ [ใหม่] แอดมินกดมาที่สไลด์นี้ได้ทุกเมื่อ
// ตอนระบบมีปัญหา/ติดขัด โดยไม่กระทบตำแหน่งสไลด์อื่นเลย
// ---------------------------------------------------------------------------
function Slide12() {
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
      {/* ★ ใช้ลายตกแต่งชุดเดียวกับ Slide1 ให้ธีมสม่ำเสมอ */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <HeartPulseMotif opacity={0.08} width={560} />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          textAlign: "center",
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
          ✦ &nbsp; กรุณารอสักครู่ &nbsp; ✦
        </div>
        <div
          style={{
            ...fontDisplay,
            fontSize: "clamp(2.4rem,6vw,4.8rem)",
            color: "#fff",
            letterSpacing: "0.04em",
          }}
        >
          พักการถ่ายทอดชั่วคราว
        </div>
        <div
          style={{
            width: 200,
            height: 1.5,
            background: `linear-gradient(90deg,transparent,${C.orange},transparent)`,
            borderRadius: 1,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: C.orange,
                animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            ...notoTH,
            fontSize: "clamp(.75rem,1.3vw,1rem)",
            color: "rgba(255,255,255,.5)",
            letterSpacing: ".05em",
            marginTop: 8,
            maxWidth: 560,
            lineHeight: 1.8,
          }}
        >
          ขออภัยในความไม่สะดวก ทีมงานกำลังดำเนินการแก้ไข
          <br />
          การถ่ายทอดสดจะกลับมาโดยเร็วที่สุด
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

      <div style={{ width: 1, height: 20, background: border }} />

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

          <div
            style={{
              ...pillStyle,
              padding: "5px 10px",
              gap: 2,
              pointerEvents: "all",
            }}
          >
            {(
              ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"] as const
            ).map((icon, i) => (
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
            ))}
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
  const totalSlides = 12; // ★★ [แก้ไข] เพิ่ม Slide12 (พักเบรก) ต่อท้าย ไม่กระทบสไลด์เดิม
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

  // ★ scrollPulse — เพิ่มค่าขึ้นทุกครั้งที่ตรวจพบว่า scroll_signal จาก DB เปลี่ยน
  // (แอดมินกดปุ่ม "เลื่อนให้ผู้ชมดูคะแนน" ใน /control) ส่งลง QuestionModal ให้เลื่อนจอ
  const [scrollPulse, setScrollPulse] = useState(0);
  const lastScrollSignalRef = useRef<number | null>(null);

  // ★ scrollTopPulse — เหมือน scrollPulse แต่ตรงข้าม ใช้ตอนแอดมินกดปุ่ม
  // "เลื่อนขึ้นไปดูโจทย์" ใน /control ส่งลง QuestionModal ให้เลื่อนกลับขึ้นบนสุด
  const [scrollTopPulse, setScrollTopPulse] = useState(0);
  const lastScrollTopSignalRef = useRef<number | null>(null);

  // ★ canvaPageOverride — ค่าเลขหน้า Canva ที่แอดมิน override ไว้จาก /control
  // (ปุ่ม ◀/▶ เลื่อนหน้าของ modal ที่เปิดอยู่) null = ยังไม่ override ให้ใช้
  // เลขหน้าเริ่มต้นของคำถามนั้นตามที่ตั้งไว้ใน CanvaLinkManager ตามปกติ
  const [canvaPageOverride, setCanvaPageOverride] = useState<number | null>(
    null,
  );

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

  // คลิกพื้นที่ว่างในกระดาน (นอก cell) — เคลียร์เฉพาะ local highlight ของผู้ใช้
  // (ไม่ยุ่งกับ adminHighlightId เพื่อไม่ให้คนอื่นที่ดูจอเดียวกันเห็นการเปลี่ยนแปลง)
  const handleBackgroundClick = useCallback(() => {
    setLocalHighlightId(null);
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
      // เก็บค่า scroll_signal เริ่มต้นไว้เฉยๆ ไม่ trigger การเลื่อน (แค่ sync ครั้งแรก)
      lastScrollSignalRef.current = s.scroll_signal;
      lastScrollTopSignalRef.current = s.scroll_top_signal;
      setCanvaPageOverride(s.canva_current_page);
      if (s.modal_open && s.highlighted_question_id) {
        const found = findCellByQuestionId(s.highlighted_question_id);
        if (found) setSelectedCell(found);
      }
    });

    const channel = subscribeToPresentationState((s: PresentationState) => {
      setCurrentSlide(s.current_slide);
      setAdminHighlightId(s.highlighted_question_id);
      setLocalHighlightId(null);
      setCanvaPageOverride(s.canva_current_page);

      // ★ ถ้า scroll_signal เปลี่ยนจากที่เคยเห็นล่าสุด = แอดมินกดปุ่มเลื่อนมาจริง
      // (ไม่ใช่แค่ effect นี้เพิ่งรันครั้งแรก) → bump scrollPulse ให้ modal เลื่อนจอ
      if (
        lastScrollSignalRef.current !== null &&
        s.scroll_signal !== lastScrollSignalRef.current
      ) {
        setScrollPulse((p) => p + 1);
      }
      lastScrollSignalRef.current = s.scroll_signal;

      // ★ เหมือนกันแต่ตรงข้าม — scroll_top_signal เปลี่ยน = แอดมินกดปุ่ม
      // "เลื่อนขึ้นไปดูโจทย์" → bump scrollTopPulse ให้ modal เลื่อนกลับขึ้นบนสุด
      if (
        lastScrollTopSignalRef.current !== null &&
        s.scroll_top_signal !== lastScrollTopSignalRef.current
      ) {
        setScrollTopPulse((p) => p + 1);
      }
      lastScrollTopSignalRef.current = s.scroll_top_signal;

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
  // ★ FIX F: Slide4 (Question Board) mount ค้างตลอด session ไม่อยู่ใน record นี้
  //   — render แยกต่างหากด้านล่าง (ดู JSX ท้ายไฟล์)
  // ★ FIX G: Slide2 (Canva Intro) ก็ mount ค้างตลอด session เหมือนกัน — เพราะ
  //   ใช้ไฟล์ Canva เดียวกับ Question Board จึงมีปัญหา "reload ทุกครั้งที่กลับมา
  //   สไลด์นี้" แบบเดียวกัน ถ้าปล่อยให้ unmount/remount ตาม key={currentSlide}
  //   ปกติ — จึงย้ายออกจาก record นี้เช่นกัน (ดู JSX ท้ายไฟล์)
  const slides: Record<number, React.ReactNode> = {
    1: <Slide1 />,
    // ★ ไม่มี key 2 — Slide2 (Canva Intro) render แยกไว้ด้านล่างตลอด session
    3: (
      <Slide3
        data={data}
        categories={categories}
        sortedPositions={sortedPositions}
        answeredCount={answeredCount}
        totalQCount={totalQCount}
      />
    ),
    // ★ ไม่มี key 4 — สไลด์ Question Board (Slide4) ถูก render แยกไว้ด้านล่าง
    //   ตลอด session (ดู FIX D)
    5: (
      <Slide5
        data={data}
        topSix={topSix}
        minScore={minScore}
        scoreRange={scoreRange}
      />
    ),
    6: <Slide6 data={data} sortedPositions={sortedPositions} />,
    7: <Slide7 />,
    8: <Slide8 data={data} sortedPositions={sortedPositions} />,
    9: <Slide9 data={data} sortedPositions={sortedPositions} />,
    10: <Slide10 data={data} sortedPositions={sortedPositions} />,
    11: <Slide11 data={data} sortedPositions={sortedPositions} />,
    12: <Slide12 />, // ★★ [ใหม่] หน้าพักเบรก ไม่ต้องรับ props
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 55% at 15% 95%, rgba(91,58,115,0.32) 0%, transparent 60%),
            radial-gradient(ellipse 65% 50% at 65% 5%, rgba(240,182,92,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 60% 45% at 50% 0%, rgba(237,130,64,0.10) 0%, transparent 60%),
            linear-gradient(160deg, #3D160C 0%, #170806 55%, #0d0503 100%)
          `,
          fontFamily: "'Noto Sans Thai', sans-serif",
          color: C.textHi,
          overflow: "hidden",
        }}
      >
        {/* <CosmosBackground /> */}
        <div
          style={{
            width: 2000,
            height: 1080,
            position: "relative",
          }}
        >
          <Grainient
            color1="#170806"
            color2="#6C240A"
            color3="#ED8240"
            timeSpeed={0.35}
            colorBalance={0}
            warpStrength={1}
            warpFrequency={5}
            warpSpeed={2}
            warpAmplitude={50}
            blendAngle={0}
            blendSoftness={0.05}
            rotationAmount={500}
            noiseScale={2}
            grainAmount={0.1}
            grainScale={2}
            grainAnimated={false}
            contrast={1.5}
            gamma={1}
            saturation={1}
            centerX={0}
            centerY={0}
            zoom={0.9}
          />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
          }}
        >
          <Particles
            particleCount={200}
            particleSpread={10}
            speed={0.1}
            particleColors={["#ffffff", "#ffffff", "#ffffff"]}
            moveParticlesOnHover
            particleHoverFactor={1}
            alphaParticles={false}
            particleBaseSize={100}
            sizeRandomness={1}
            cameraDistance={30}
            disableRotation={false}
          />
        </div>

        <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
          {/* ★ FIX G: Slide2 (Canva Intro) mount ค้างตลอด session เหมือน Slide4
              เพราะใช้ไฟล์ Canva เดียวกัน ถ้าปล่อยให้ unmount/remount ตาม
              key={currentSlide} ปกติ จะโหลด Canva ใหม่ทุกครั้งที่กลับมาสไลด์นี้
              โดยไม่จำเป็น (เหตุผลเดียวกับ FIX D ของ Slide4) */}
          <motion.div
            animate={{ opacity: currentSlide === 2 ? 1 : 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              visibility: currentSlide === 2 ? "visible" : "hidden",
              pointerEvents: currentSlide === 2 ? "auto" : "none",
              zIndex: currentSlide === 2 ? 2 : 1,
            }}
          >
            <Slide2
              canvaPageOverride={canvaPageOverride}
              isActive={currentSlide === 2}
            />
          </motion.div>

          {/* ★ FIX D: Slide4 mount ค้างตลอด session ไม่ unmount ตอนสลับสไลด์
              (เดิมใช้ key={currentSlide} ทำให้ Slide4 ถูก unmount/remount
              ทุกครั้งที่เปลี่ยนสไลด์ ซึ่งจะทำให้ CanvaSingleFrame ข้างใน
              ถูกทำลายและต้อง navigate ใหม่ทุกครั้งโดยไม่จำเป็น) */}
          <motion.div
            animate={{ opacity: currentSlide === 4 ? 1 : 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              visibility: currentSlide === 4 ? "visible" : "hidden",
              pointerEvents: currentSlide === 4 ? "auto" : "none",
              zIndex: currentSlide === 4 ? 2 : 1,
            }}
          >
            <Slide4
              data={data}
              categories={categories}
              scoreEvents={scoreEvents}
              canvaLinks={canvaLinks}
              answeredCount={answeredCount}
              totalQCount={totalQCount}
              selectedCell={selectedCell}
              onCloseModal={handleModalClose}
              activeHighlightId={activeHighlightId}
              onCellClick={handleCellClick}
              onBackgroundClick={handleBackgroundClick}
              scrollPulse={scrollPulse}
              scrollTopPulse={scrollTopPulse}
              canvaPageOverride={canvaPageOverride}
            />
          </motion.div>

          {/* สไลด์อื่นๆ (1,3,5-11) — mount/unmount + animation แบบเดิมทุกอย่าง */}
          <AnimatePresence mode="wait">
            {currentSlide !== 2 && currentSlide !== 4 && (
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  zIndex: 1,
                }}
              >
                {slides[currentSlide]}
              </motion.div>
            )}
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