"use client";

/**
 * SpaceRaceShip.tsx — แยกออกมาจาก ViewerDashboard.tsx (ไฟล์เริ่มยาวเกินไป)
 * รวมทุกอย่างที่เกี่ยวกับ "จรวด" ใน Space Race (Slide5):
 *
 * - PixelShip      — จรวดพิกเซล หัวชี้ขวา (ทิศทางที่ทีมวิ่งซ้าย→ขวา)
 * - ShipTrail       — ★★★★★★★★ NEW: เอฟเฟกต์ฝุ่น/ดาวหางตามหลังจรวดตอนกำลังวิ่ง
 *                     (ระหว่างส่ายสุ่มหรือบินเข้าตำแหน่งครั้งแรก) — CSS-only
 *                     ไม่ใช้ JS state สุ่มพ่นอนุภาคแบบ confetti เพื่อไม่ให้หนัก
 *                     ตอนมีจรวด 6 ลำวิ่งพร้อมกัน
 * - buildSuspensePath / buildEntryPath / buildTimes / useSuspensePath
 *                     — สร้าง/จัดการเส้นทางส่ายสุ่มก่อนเข้าตำแหน่งจริง
 * - Slide5Ship      — จรวด 1 ลำในแทร็ก Space Race แบบเต็ม (ใช้ hook ต่อลำ
 *                     จึงแยกเป็น component ของตัวเอง เรียกใน .map() ตรงๆ
 *                     ไม่ได้เพราะกฎ React hooks)
 *
 * ── การเชื่อมกับ ViewerDashboard.tsx ──
 * ต้อง export เพิ่ม 2 ตัวจาก ViewerDashboard.tsx (แค่เติมคำว่า export หน้าของเดิม):
 *   - export const C = {...}        (design tokens สี)
 *   - export const notoTH = {...}   (font style object)
 * แล้วเพิ่ม keyframe ใหม่ 1 อันใน GLOBAL_CSS ของ ViewerDashboard.tsx (ดูท้ายไฟล์นี้)
 */

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RaceData } from "@/app/types";
import { C, notoTH } from "./ViewerDashboard"; // ⚠️ แก้ path ให้ตรงโปรเจกต์จริง

// ---------------------------------------------------------------------------
// Types (คัดลอกมาจาก ViewerDashboard.tsx เท่าที่ Slide5Ship ต้องใช้)
// ---------------------------------------------------------------------------
export interface Position {
  teamId: string;
  score: number;
}

// ---------------------------------------------------------------------------
// PixelShip — จรวดพิกเซล หัวชี้ขวา + เปลวไฟด้านซ้าย (ไอเสีย)
// ใช้สีทีมเดิม (team.color) เป๊ะๆ ไม่เพิ่มสีใหม่
// ---------------------------------------------------------------------------
const SHIP_GRID: number[][] = [
  [0, 0, 1, 0, 0, 0],
  [1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1], // ← แถวกลาง หัวจรวด (col ขวาสุด) อยู่แถวนี้
  [0, 1, 1, 1, 1, 1], // ← แถวกลาง
  [0, 0, 1, 1, 1, 0],
  [1, 1, 1, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
];
const FLAME_ROWS = [3, 4];

export function PixelShip({
  color,
  size = 5,
}: {
  color: string;
  size?: number;
}) {
  const cell = size;
  const cols = SHIP_GRID[0].length;
  const rows = SHIP_GRID.length;
  const flameCols = 2;

  return (
    <svg
      width={cell * (cols + flameCols)}
      height={cell * rows}
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      {FLAME_ROWS.map((y) =>
        Array.from({ length: flameCols }, (_, fx) => (
          <rect
            key={`flame-${fx}-${y}`}
            x={fx * cell}
            y={y * cell}
            width={cell}
            height={cell}
            fill={color}
            opacity={0.45}
          />
        )),
      )}
      {SHIP_GRID.map((row, y) =>
        row.map((v, x) =>
          v ? (
            <rect
              key={`${x}-${y}`}
              x={(x + flameCols) * cell}
              y={y * cell}
              width={cell}
              height={cell}
              fill={color}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ★★★★★★★★ NEW: ShipTrail — ฝุ่น/ดาวหางตามหลังจรวดตอนกำลังวิ่ง
// วางไว้ทางซ้ายของจรวด (ตรงข้ามทิศวิ่งซ้าย→ขวา) เป็นบล็อกพิกเซลจางๆ
// ไล่ระดับความจาง+ดีเลย์ ให้ดูเหมือนโดนสลัดทิ้งไว้ข้างหลังตอนเร่งความเร็ว
// CSS-only (keyframes ใน GLOBAL_CSS) ไม่ใช้ JS spawn อนุภาคแบบ confetti
// เพื่อไม่ให้หนักตอนมีจรวด 6 ลำ active พร้อมกัน
// active=false → return null ไปเลย ไม่ mount ทิ้งไว้เฉยๆ (ประหยัด DOM)
// ---------------------------------------------------------------------------
export function ShipTrail({
  color,
  active,
}: {
  color: string;
  active: boolean;
}) {
  if (!active) return null;
  const particles = [0, 1, 2, 3, 4, 5];
  return (
    <div
      style={{
        position: "absolute",
        right: "100%",
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      {particles.map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            marginRight: 2,
            background: color,
            opacity: 0.55 - i * 0.08,
            animation: "dustTrail 0.5s steps(3) infinite",
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// buildSuspensePath — เส้นทางส่ายสุ่มตอน "คะแนนเปลี่ยน" (ระยะสั้นรอบตำแหน่งเดิม)
// ---------------------------------------------------------------------------
export function buildSuspensePath(
  from: number,
  to: number,
  steps = 5,
): number[] {
  const range = Math.max(Math.abs(to - from), 14);
  const path: number[] = [from];
  for (let i = 0; i < steps; i++) {
    const amplitude = range * (1 - i / steps) * 0.55;
    const base = from + (to - from) * ((i + 1) / (steps + 1));
    const jitter = (Math.random() - 0.5) * 2 * amplitude;
    path.push(Math.min(97, Math.max(0, base + jitter)));
  }
  path.push(to);
  return path;
}

// ★ buildEntryPath — เส้นทางส่ายตอน "จรวดเพิ่งโผล่ครั้งแรก" (เข้าสไลด์นี้)
// กวาดกว้างทั่วแทร็กจากขอบจอซ้าย (-16%) แล้วแคบลงจนจบที่ตำแหน่งจริงเป๊ะ
export function buildEntryPath(to: number, steps = 6): number[] {
  const path: number[] = [-16];
  for (let i = 0; i < steps; i++) {
    const amplitude = 45 * (1 - i / steps);
    const base = to * ((i + 1) / (steps + 1));
    const jitter = (Math.random() - 0.5) * 2 * amplitude;
    path.push(Math.min(97, Math.max(-16, base + jitter)));
  }
  path.push(to);
  return path;
}

export function buildTimes(len: number): number[] {
  return Array.from({ length: len }, (_, i) => i / (len - 1));
}

// ★ สุ่มเส้นทางใหม่เฉพาะตอน "เป้าหมายเปลี่ยนจริง" (คะแนนขยับ) — ไม่สุ่มซ้ำ
// ทุก re-render เฉยๆ
function useSuspensePath(target: number) {
  const [path, setPath] = useState<number[]>([target]);
  const prevRef = useRef(target);

  useEffect(() => {
    if (prevRef.current === target) return;
    setPath(buildSuspensePath(prevRef.current, target));
    prevRef.current = target;
  }, [target]);

  return path;
}

// ---------------------------------------------------------------------------
// Slide5Ship — จรวด 1 ลำใน Space Race แบบเต็ม (ลำตัว + ทาง trail + ป้ายชื่อ/คะแนน)
// ---------------------------------------------------------------------------
export function Slide5Ship({
  team,
  pos,
  leftPct,
  yPos,
  isNearRight,
  rank,
  isFirstEntry,
  onAnimationComplete,
}: {
  team: RaceData["teams"][number];
  pos: Position;
  leftPct: number;
  yPos: number;
  isNearRight: boolean;
  rank: number;
  isFirstEntry: boolean;
  onAnimationComplete: () => void;
}) {
  // ★ สุ่มแค่ครั้งเดียวตอน mount (lazy initializer) — ไม่สุ่มใหม่ทุก re-render
  const [entryPath] = useState(() => buildEntryPath(Math.min(100, leftPct)));
  const path = useSuspensePath(Math.min(100, leftPct));
  const isWobbling = path.length > 2;

  // ★★★★★★★★ NEW: กำลังวิ่งอยู่ตอนไหนบ้าง — ใช้เปิด/ปิด ShipTrail
  const isMoving = isFirstEntry || isWobbling;

  return (
    <motion.div
      layoutId={`ship-${team.id}`}
      initial={
        isFirstEntry
          ? { left: `${entryPath[0]}%`, top: `${yPos}%`, opacity: 0 }
          : false
      }
      animate={{
        left: isFirstEntry
          ? entryPath.map((v) => `${v}%`)
          : isWobbling
            ? path.map((v) => `${v}%`)
            : `${Math.min(100, leftPct)}%`,
        top: `${yPos}%`,
        opacity: 1,
      }}
      transition={
        isFirstEntry
          ? {
              left: {
                duration: 1.8,
                ease: "easeInOut",
                times: buildTimes(entryPath.length),
              },
              opacity: { duration: 0.25 },
              top: { duration: 1.8, ease: "easeInOut" },
            }
          : isWobbling
            ? {
                left: {
                  duration: 1.6,
                  ease: "easeInOut",
                  times: buildTimes(path.length),
                },
                top: { type: "spring", stiffness: 40, damping: 15 },
              }
            : { type: "spring", stiffness: 40, damping: 15 }
      }
      onAnimationComplete={onAnimationComplete}
      style={{
        position: "absolute",
        transform: "translate(-50%,-50%)",
        zIndex: 10,
      }}
    >
      <div
        style={{ position: "relative", display: "flex", alignItems: "center" }}
      >
        {/* ★★★★★★★★ NEW: ทางฝุ่น/ดาวหาง — วาดก่อนลำตัวจรวด (อยู่ข้างหลัง) */}
        <ShipTrail color={team.color} active={isMoving} />

        <div
          style={{ flexShrink: 0, animation: "pixelFlicker 0.6s steps(2) infinite" }}
        >
          <PixelShip color={team.color} />
        </div>

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
              borderRadius: 0,
              color: team.color,
              letterSpacing: "0.10em",
              background: "rgba(61,22,12,0.55)",
              border: `2px solid ${team.color}`,
            }}
          >
            <span style={{ opacity: 0.45 }}>#{rank}</span> {team.name}
          </div>
          <div
            style={{
              ...notoTH,
              fontSize: 20,
              fontWeight: 900,
              padding: "1px 6px",
              borderRadius: 0,
              color: C.textHi,
            }}
          >
            {pos.score} <span style={{ fontSize: 15, color: C.textLo }}>P</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}