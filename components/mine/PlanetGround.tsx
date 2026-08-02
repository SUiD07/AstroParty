"use client";

/**
 * PlanetGround.tsx — พื้นผิวดาวขอบล่างสุดของสไลด์รางวัล (8-11)
 * + ShipLandingRow — จรวดแต่ละทีมบินโค้งลงมาจอดเรียงกันบนพื้นนี้
 *
 * ── รอบนี้แก้ตามที่พี่ขอ ──
 * 1) พื้นขรุขระ — ความสูงแต่ละแท่งไม่เท่ากัน (jagged) แทนพื้นเรียบเดิม
 * 2) พื้นโค้งขึ้นตรงกลาง — ความสูงเฉลี่ยไล่เป็นพาราโบลา (สูงกลาง ต่ำขอบ)
 *    ให้ความรู้สึกยืนอยู่บนผิวดาวทรงกลม ไม่ใช่พื้นราบธรรมดา
 * 3) พื้นที่พื้นใหญ่ขึ้น (default height 130 จากเดิม 44) เผื่อโดน navbar
 *    ด้านล่างสุดของจอบังบางส่วน ยังเห็นพื้นเหลือเยอะพอ
 * 4) จรวดหมุน -90deg ให้ "ด้านไฟ" (ท้ายจรวด/เครื่องยนต์) หันลงเป็นด้านลงจอด
 *    (เหมือนจรวดจริงที่เผาไหม้เครื่องยนต์ลงพื้นตอนเบรกลงจอด)
 * 5) จรวดใหญ่ขึ้นนิดหน่อย — ส่ง size=7 ให้ PixelShip (เดิม default 5)
 * 6) เส้นทางบินโค้งเข้ามาจากด้านข้าง (มี x offset ค่อยๆ ลดเป็น 0) แทนร่วง
 *    ดิ่งตรงๆ และใช้เวลานานขึ้น (1.6s จากเดิม 0.85s)
 *
 * ★ ค่าความสูงพื้นทั้งหมดคำนวณด้วย Math.sin/cos ที่ index คงที่ (ไม่มี
 *   Math.random) จึงเป็นค่าเดิมทุกครั้งที่ re-render กันภาพกระตุก — ตาม
 *   pattern เดียวกับ GLITTER_STARS ที่มีอยู่แล้วในไฟล์หลัก
 */

import { motion } from "framer-motion";
import { PixelShip } from "./SpaceRaceShip"; // ⚠️ แก้ path ให้ตรงโปรเจกต์จริง

// ---------------------------------------------------------------------------
// PlanetGround — พื้นดาวขรุขระ + โค้งขึ้นกลาง
// วาดเป็นแท่งพิกเซลเรียงกันแนวนอน (ไม่ใช้เส้นโค้ง SVG ให้เข้าธีมพิกเซลเหลี่ยม)
// ความสูงแต่ละแท่ง = พาราโบลา (โค้งขึ้นกลาง) + jitter ขรุขระ (deterministic)
// ---------------------------------------------------------------------------
const GROUND_COLUMNS = 46;

const GROUND_PROFILE = Array.from({ length: GROUND_COLUMNS }, (_, i) => {
  const t = i / (GROUND_COLUMNS - 1); // 0..1 ซ้าย→ขวา
  const curve = Math.sin(t * Math.PI); // ★ โค้งขึ้นกลาง ต่ำขอบซ้าย-ขวา
  const jag =
    Math.sin(i * 2.7) * 0.14 + Math.sin(i * 5.3 + 1.2) * 0.07; // ★ ขรุขระ deterministic
  return Math.max(0.32, Math.min(1, curve * 0.62 + 0.38 + jag));
});

export function PlanetGround({
  height = 130, // ★ ใหญ่ขึ้นจากเดิม 44
  color = "#3D160C",
  edgeColor = "#ED8240",
}: {
  height?: number;
  color?: string;
  edgeColor?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        display: "flex",
        alignItems: "flex-end",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {GROUND_PROFILE.map((frac, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: height * frac,
            background: color,
            borderTop: `3px solid ${edgeColor}`, // ★ ขอบบนเป็นสันเขาสว่าง ให้เห็นความขรุขระชัด
            opacity: 0.92,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShipLandingRow — จรวดของแต่ละทีมบินโค้งเข้ามาจอด "ด้านไฟหันลง" บนพื้นดาว
// ---------------------------------------------------------------------------
export function ShipLandingRow({
  teams,
  groundHeight = 100, // ★ ตำแหน่งลงจอด — อิงความสูงเฉลี่ยของพื้นใหม่ (ต่ำกว่ายอดพาราโบลาสุดนิดหน่อย)
  shipSize = 7, // ★ จรวดใหญ่ขึ้นจากเดิม (PixelShip default 5)
  delayStep = 0.24,
  baseDelay = 0.3,
}: {
  teams: { id: string; color: string }[];
  groundHeight?: number;
  shipSize?: number;
  delayStep?: number;
  baseDelay?: number;
}) {
  if (teams.length === 0) return null;
  const n = teams.length;

  return (
    <>
      {teams.map((team, i) => {
        const leftPct = ((i + 0.5) / n) * 100;
        const delay = baseDelay + i * delayStep;
        // ★ สลับทิศเข้าซ้าย/ขวาตาม index (deterministic) ให้เส้นทางโค้ง
        // ดูมีชีวิตชีวา ไม่บินเข้าทางเดียวกันหมดทุกลำ
        const dir = i % 2 === 0 ? -1 : 1;

        return (
          <div
            key={team.id}
            style={{
              position: "absolute",
              left: `${leftPct}%`,
              bottom: groundHeight - 2,
              transform: "translateX(-50%)",
              zIndex: 5,
            }}
          >
            {/* ★ กล่องหมุนด้านไฟลงล่าง — rotate คงที่ตลอดแอนิเมชัน แยกจาก
                กล่องเคลื่อนที่ (x/y) ด้านนอก กันสับสนระหว่าง "ทิศทางหมุน"
                กับ "เส้นทางบิน" */}
            <motion.div
              initial={{ x: dir * 110, y: -340, opacity: 0 }}
              animate={{
                x: [dir * 110, dir * 40, 0], // ★ โค้งเข้าจากด้านข้าง ไม่ดิ่งตรงๆ
                y: [-340, -150, 0],
                opacity: 1,
              }}
              transition={{
                delay,
                duration: 1.6, // ★ นานขึ้นจากเดิม 0.85s
                times: [0, 0.62, 1],
                ease: "easeInOut",
              }}
            >
              <div style={{ transform: "rotate(-90deg)" }}>
                {/* ★ rotate(-90deg): ด้านหัว (เดิมชี้ขวา) หมุนขึ้นบน,
                    ด้านไฟ/ท้ายเครื่องยนต์ (เดิมอยู่ซ้าย) หมุนลงล่าง
                    = ไฟหันลงเป็นด้านลงจอด ตามที่พี่ขอ */}
                <PixelShip color={team.color} size={shipSize} />
              </div>
            </motion.div>

            {/* ฝุ่นกระแทกพื้น — จับเวลาให้ตรงกับจังหวะที่จรวดถึง y=0 */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: [0, 0.6, 0], scaleX: [0.4, 1.9, 2.6] }}
              transition={{ delay: delay + 1.5, duration: 0.5 }}
              style={{
                position: "absolute",
                bottom: -3,
                left: "50%",
                translate: "-50% 0",
                width: 34,
                height: 9,
                background: team.color,
              }}
            />
          </div>
        );
      })}
    </>
  );
}