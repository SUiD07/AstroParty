"use client";

/**
 * หน้า /control — สำหรับแอดมิน/พิธีกร
 * ใช้คุมสไลด์และ highlight/เปิด modal คำถาม jeopardy ให้ทุกจอ /display sync ตาม
 *
 * ── อัปเดตรอบนี้ ──
 * - Sync ทุก instance ของหน้านี้แบบ realtime
 * - ปุ่มเคลียร์ไฮไลท์ + status bar เด่นด้านบน
 * - ปุ่ม highlight/เปิด-ปิด modal/เคลียร์ไฮไลท์ กดได้เฉพาะตอนอยู่สไลด์ 3
 * - ★ Jeopardy cell จัดเป็น grid แบบเดียวกับหน้า viewer (คอลัมน์ = หมวด, แถว = เลขข้อ)
 *   เพื่อให้ตำแหน่งตรงกับที่เห็นบนจอจริง กดง่ายขึ้น
 * - ★ ปุ่ม "ปิด Modal" กดได้เฉพาะตอน modal เปิดอยู่จริงเท่านั้น
 * - ★ ปุ่ม "↓ ดูคะแนนข้อนี้" โผล่ตอนมีคำถามถูกไฮไลท์อยู่ — เลื่อนหน้า admin
 *   ไปยัง Score Event Log พร้อม filter ไปที่หมวด/ข้อนั้นให้อัตโนมัติ
 * - ★★ NEW: ปุ่ม ◀ / ▶ เลื่อนหน้า Canva ของ modal ที่เปิดอยู่ (ไม่ปิด-เปิด modal ใหม่)
 *   ใช้ค่า canva_current_page ใน presentation_state แยกอิสระจากเลขหน้าเริ่มต้น
 *   ที่ตั้งไว้ล่วงหน้าต่อคำถามใน CanvaLinkManager — รีเซ็ตกลับเป็นค่าเริ่มต้น
 *   ทุกครั้งที่ปิด modal หรือ highlight คำถามใหม่
 */

import { useEffect, useState } from "react";
import {
  loadCategories,
  loadPresentationState,
  updatePresentationState,
  subscribeToPresentationState,
  unsubscribe,
  loadCanvaLinks,
  splitCanvaUrl,
  type PresentationState,
} from "@/lib/db";

interface Question {
  id: number;
  number: number;
}
interface Category {
  id: number;
  name: string;
  questions: Question[];
}

const TOTAL_SLIDES = 10;
const JEOPARDY_SLIDE = 3;
const MAX_QUESTIONS_PER_CATEGORY = 6; // ต้องตรงกับ Slide3 ฝั่ง viewer

const ORANGE = "#ED8240";

export default function ControlPage({
  onJumpToScore,
}: {
  onJumpToScore?: (categoryId: number, questionNumber: number) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  // ★ เลขหน้า Canva เริ่มต้นของแต่ละคำถาม (ตั้งไว้ล่วงหน้าใน CanvaLinkManager)
  const [canvaLinks, setCanvaLinks] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState<{
    slide: number;
    qId: number | null;
    open: boolean;
    scrollSignal: number;
    canvaPage: number | null; // ★ override เลขหน้าปัจจุบัน (null = ยังไม่ override)
  }>({ slide: 1, qId: null, open: false, scrollSignal: 0, canvaPage: null });

  useEffect(() => {
    loadCategories().then(setCategories);
    loadCanvaLinks().then(setCanvaLinks);
    loadPresentationState().then((s: PresentationState) =>
      setCurrent({
        slide: s.current_slide,
        qId: s.highlighted_question_id,
        open: s.modal_open,
        scrollSignal: s.scroll_signal,
        canvaPage: s.canva_current_page,
      }),
    );

    const channel = subscribeToPresentationState((s: PresentationState) => {
      setCurrent({
        slide: s.current_slide,
        qId: s.highlighted_question_id,
        open: s.modal_open,
        scrollSignal: s.scroll_signal,
        canvaPage: s.canva_current_page,
      });
    });

    return () => unsubscribe(channel);
  }, []);

  const isOnJeopardySlide = current.slide === JEOPARDY_SLIDE;

  const goSlide = async (n: number) => {
    setCurrent((c) => ({ ...c, slide: n }));
    await updatePresentationState({ current_slide: n });
  };

  const highlightQuestion = async (qId: number) => {
    if (!isOnJeopardySlide) return;
    // ★ เลือกคำถามใหม่ — เคลียร์ override เลขหน้าเก่าทิ้งด้วยเสมอ
    setCurrent((c) => ({ ...c, qId, open: false, canvaPage: null }));
    await updatePresentationState({
      highlighted_question_id: qId,
      modal_open: false,
      canva_current_page: null,
    });
  };

  const clearHighlight = async () => {
    if (!isOnJeopardySlide) return;
    setCurrent((c) => ({ ...c, qId: null, open: false, canvaPage: null }));
    await updatePresentationState({
      highlighted_question_id: null,
      modal_open: false,
      canva_current_page: null,
    });
  };

  const openModal = async () => {
    if (!isOnJeopardySlide || !current.qId || current.open) return;
    setCurrent((c) => ({ ...c, open: true }));
    await updatePresentationState({ modal_open: true });
  };

  const closeModal = async () => {
    // FIX: ปิดได้เฉพาะตอนเปิดอยู่จริงเท่านั้น
    if (!isOnJeopardySlide || !current.open) return;
    // ★ ปิด modal = จบคำถามนี้แล้ว เคลียร์ override เลขหน้ากลับเป็น null
    // เพื่อให้เปิดคำถามถัดไปเริ่มที่เลขหน้าเริ่มต้นเสมอ
    setCurrent((c) => ({ ...c, open: false, canvaPage: null }));
    await updatePresentationState({
      modal_open: false,
      canva_current_page: null,
    });
  };

  // ★ ส่งสัญญาณให้ทุกจอ viewer ที่เปิด QuestionModal ค้างอยู่ เลื่อนไปดูจุดคะแนน
  // ที่อยู่ใต้ Canva iframe — ใช้ได้เฉพาะตอน modal เปิดอยู่จริงเท่านั้น
  // (increment ค่าขึ้นทุกครั้งที่กด เพื่อให้ viewer เทียบค่าเก่า-ใหม่แล้วรู้ว่ามีคำสั่งมาใหม่)
  const triggerScrollToScore = async () => {
    if (!isOnJeopardySlide || !current.open) return;
    const next = current.scrollSignal + 1;
    setCurrent((c) => ({ ...c, scrollSignal: next }));
    await updatePresentationState({ scroll_signal: next });
  };

  // หา category ของคำถามที่ถูกไฮไลท์อยู่ (ใช้ทั้งแสดง label และปุ่ม jump-to-score)
  const highlightedInfo = (() => {
    if (!current.qId) return null;
    for (const cat of categories) {
      const q = cat.questions?.find((qq) => qq.id === current.qId);
      if (q) return { category: cat, question: q };
    }
    return null;
  })();

  const highlightedQuestionLabel = highlightedInfo
    ? `${highlightedInfo.category.name} · ข้อ ${highlightedInfo.question.number}`
    : current.qId
      ? `#${current.qId}`
      : null;

  const handleJumpToScore = () => {
    if (!highlightedInfo || !onJumpToScore) return;
    onJumpToScore(highlightedInfo.category.id, highlightedInfo.question.number);
  };

  // ★ เลขหน้า Canva เริ่มต้นของคำถามที่ highlight อยู่ (parse จาก canva_url)
  const assignedPage = (() => {
    if (!current.qId) return null;
    const url = canvaLinks[current.qId];
    if (!url) return null;
    const { page } = splitCanvaUrl(url);
    const n = Number(page);
    return page !== "" && !Number.isNaN(n) ? n : null;
  })();

  // ★ เลขหน้าที่กำลังแสดงอยู่จริงตอนนี้ (override ถ้ามี ไม่งั้นใช้ค่าเริ่มต้น)
  const effectivePage = current.canvaPage ?? assignedPage ?? 1;

  // ★ ปุ่มเลื่อนหน้าใช้ได้เฉพาะตอน modal เปิดอยู่จริงเท่านั้น (เหมือนปุ่มเลื่อนดูคะแนน)
  const canNavigateCanvaPage = isOnJeopardySlide && current.open;

  const changeCanvaPage = async (delta: number) => {
    if (!canNavigateCanvaPage) return;
    const nextPage = Math.max(1, effectivePage + delta);
    setCurrent((c) => ({ ...c, canvaPage: nextPage }));
    await updatePresentationState({ canva_current_page: nextPage });
  };

  return (
    <div
      style={{
        fontFamily: "sans-serif",
        color: "#fff",
        background: "#111",
        minHeight: "100vh",
      }}
    >
      {/* ── Status bar — sticky ด้านบนสุด เด่นชัด ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "linear-gradient(180deg, #1a1005, #0d0904 90%)",
          borderBottom: `2px solid ${ORANGE}`,
          padding: "16px 24px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <StatusChip
            label="สไลด์ปัจจุบัน"
            value={`${current.slide} / ${TOTAL_SLIDES}`}
          />
          <StatusChip
            label="ไฮไลท์คำถาม"
            value={highlightedQuestionLabel ?? "— ไม่มี —"}
            dim={!highlightedQuestionLabel}
          />
          <StatusChip
            label="Modal"
            value={current.open ? "เปิดอยู่" : "ปิดอยู่"}
            highlight={current.open}
          />
          {current.open && (
            <StatusChip
              label="หน้า Canva ปัจจุบัน"
              value={`หน้า ${effectivePage}`}
              highlight={current.canvaPage != null}
            />
          )}
          {/* {highlightedInfo && onJumpToScore && (
            <button
              onClick={handleJumpToScore}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid rgba(52,211,153,0.4)",
                background: "rgba(52,211,153,0.1)",
                color: "#34d399",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ↓ ดูคะแนนข้อนี้
            </button>
          )} */}

          {!isOnJeopardySlide && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: "#f59e0b",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.35)",
                padding: "6px 12px",
                borderRadius: 6,
              }}
            >
              ⚠ ปุ่ม Jeopardy ใช้ได้เฉพาะตอนอยู่สไลด์ {JEOPARDY_SLIDE} —
              เลื่อนไปสไลด์ {JEOPARDY_SLIDE} ก่อน
            </span>
          )}
        </div>
      </div>

      {/* ── เนื้อหา ── */}
      <div style={{ padding: 24 }}>
        <h2 style={{ marginBottom: 12 }}>Slide Control</h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 32,
            flexWrap: "wrap",
          }}
        >
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
            <button
              key={i}
              onClick={() => goSlide(i + 1)}
              style={{
                padding: "10px 16px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: current.slide === i + 1 ? ORANGE : "#333",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <h2 style={{ marginBottom: 4 }}>Jeopardy Cells</h2>
        <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>
          ใช้ได้เฉพาะตอนอยู่สไลด์ {JEOPARDY_SLIDE} เท่านั้น —
          จัดเรียงตรงตามตำแหน่งบนจอ viewer
        </p>

        <div
          style={{
            opacity: isOnJeopardySlide ? 1 : 0.4,
            pointerEvents: isOnJeopardySlide ? "auto" : "none",
            transition: "opacity .2s",
          }}
        >
          {/* ★ Grid เหมือน Slide3 ฝั่ง viewer: คอลัมน์ = หมวด, แถว = เลขข้อ */}
          {categories.length === 0 ? (
            <p style={{ fontSize: 12, opacity: 0.4 }}>ยังไม่มีหมวดคำถาม</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${categories.length}, minmax(90px, 1fr))`,
                gap: 6,
                maxWidth: 720,
              }}
            >
              {/* หัวคอลัมน์ = ชื่อหมวด */}
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    background: "rgba(237,130,64,0.08)",
                    border: "1px solid rgba(237,130,64,0.22)",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    color: "rgba(255,255,255,0.6)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={cat.name}
                >
                  {cat.name}
                </div>
              ))}

              {/* แถวคำถาม เรียงตามเลขข้อ 1..MAX */}
              {Array.from({ length: MAX_QUESTIONS_PER_CATEGORY }, (_, qi) =>
                categories.map((cat) => {
                  const q = cat.questions?.find((qq) => qq.number === qi + 1);
                  if (!q) {
                    return (
                      <div key={`${cat.id}-${qi}`} style={{ minHeight: 44 }} />
                    );
                  }
                  const isActive = current.qId === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => highlightQuestion(q.id)}
                      disabled={!isOnJeopardySlide}
                      style={{
                        minHeight: 44,
                        padding: "8px 6px",
                        borderRadius: 6,
                        border: isActive
                          ? `2px solid ${ORANGE}`
                          : "1px solid rgba(255,255,255,0.08)",
                        cursor: isOnJeopardySlide ? "pointer" : "not-allowed",
                        background: isActive
                          ? "rgba(237,130,64,0.18)"
                          : "#1a1a1a",
                        color: isActive ? ORANGE : "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        boxShadow: isActive
                          ? `0 0 10px rgba(237,130,64,.4)`
                          : "none",
                      }}
                    >
                      ข้อ {q.number}
                    </button>
                  );
                }),
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              onClick={openModal}
              disabled={!isOnJeopardySlide || !current.qId || current.open}
              style={{
                padding: "12px 20px",
                borderRadius: 6,
                border: "none",
                cursor:
                  isOnJeopardySlide && current.qId && !current.open
                    ? "pointer"
                    : "not-allowed",
                background:
                  isOnJeopardySlide && current.qId && !current.open
                    ? "#34d399"
                    : "#333",
                color: "#fff",
                fontWeight: 700,
                opacity:
                  isOnJeopardySlide && current.qId && !current.open ? 1 : 0.5,
              }}
            >
              เปิด Modal
            </button>
            <button
              onClick={closeModal}
              disabled={!isOnJeopardySlide || !current.open}
              style={{
                padding: "12px 20px",
                borderRadius: 6,
                border: "none",
                cursor:
                  isOnJeopardySlide && current.open ? "pointer" : "not-allowed",
                background: "#f87171",
                color: "#fff",
                fontWeight: 700,
                opacity: isOnJeopardySlide && current.open ? 1 : 0.5,
              }}
            >
              ปิด Modal
            </button>

            {/* ★★ NEW: ปุ่มเลื่อนหน้า Canva ของ modal ที่เปิดอยู่ ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid rgba(96,165,250,0.35)",
                background: canNavigateCanvaPage
                  ? "rgba(96,165,250,0.08)"
                  : "transparent",
                opacity: canNavigateCanvaPage ? 1 : 0.4,
              }}
              title="เลื่อนหน้า Canva ของ Modal ที่เปิดอยู่ ไม่ต้องปิด-เปิดใหม่"
            >
              <button
                onClick={() => changeCanvaPage(-1)}
                disabled={!canNavigateCanvaPage}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  cursor: canNavigateCanvaPage ? "pointer" : "not-allowed",
                  background: canNavigateCanvaPage ? "#60a5fa" : "#333",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                ◀
              </button>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#60a5fa",
                  minWidth: 64,
                  textAlign: "center",
                }}
              >
                หน้า {effectivePage}
              </span>
              <button
                onClick={() => changeCanvaPage(1)}
                disabled={!canNavigateCanvaPage}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "none",
                  cursor: canNavigateCanvaPage ? "pointer" : "not-allowed",
                  background: canNavigateCanvaPage ? "#60a5fa" : "#333",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                ▶
              </button>
            </div>

            <button
              onClick={triggerScrollToScore}
              disabled={!isOnJeopardySlide || !current.open}
              title="เลื่อนจอผู้ชมที่เปิด Modal ค้างอยู่ ไปยังจุดคะแนนใต้ Canva iframe"
              style={{
                padding: "12px 20px",
                borderRadius: 6,
                border: "1px solid rgba(52,211,153,0.4)",
                cursor:
                  isOnJeopardySlide && current.open ? "pointer" : "not-allowed",
                background:
                  isOnJeopardySlide && current.open
                    ? "rgba(52,211,153,0.12)"
                    : "transparent",
                color: "#34d399",
                fontWeight: 700,
                opacity: isOnJeopardySlide && current.open ? 1 : 0.5,
              }}
            >
              เลื่อนให้ผู้ชมดูคะแนน
            </button>
            <button
              onClick={clearHighlight}
              disabled={!isOnJeopardySlide || !current.qId}
              style={{
                padding: "12px 20px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.2)",
                cursor:
                  isOnJeopardySlide && current.qId ? "pointer" : "not-allowed",
                background: "transparent",
                color: "#fff",
                fontWeight: 700,
                opacity: isOnJeopardySlide && current.qId ? 1 : 0.5,
              }}
            >
              ✕ เคลียร์ไฮไลท์
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusChip — ใช้แสดงในแถบสถานะบนสุด
// ---------------------------------------------------------------------------
function StatusChip({
  label,
  value,
  dim,
  highlight,
}: {
  label: string;
  value: string;
  dim?: boolean;
  highlight?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: highlight
            ? "#34d399"
            : dim
              ? "rgba(255,255,255,0.35)"
              : "#fff",
        }}
      >
        {value}
      </span>
    </div>
  );
}
