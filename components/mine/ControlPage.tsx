"use client";

/**
 * หน้า /control — สำหรับแอดมิน/พิธีกร
 * ใช้คุมสไลด์และ highlight/เปิด modal คำถาม jeopardy ให้ทุกจอ /display sync ตาม
 * Sync ทุก instance ของหน้านี้แบบ realtime (เปิดพร้อมกันหลายเครื่อง/หลายคนเห็นตรงกัน)
 * เพิ่มปุ่ม "เคลียร์ไฮไลท์" แยกจากเปิด/ปิด modal
 * ย้าย status bar ขึ้นบนสุด ทำให้เด่นขึ้น (sticky)
 * ปุ่ม highlight/เปิด-ปิด modal/เคลียร์ไฮไลท์ กดได้เฉพาะตอนอยู่สไลด์ 3 เท่านั้น
 * (ปุ่มเลื่อนสไลด์ยังกดได้ตลอดเวลา เพื่อให้แอดมินเลื่อนมาสไลด์ 3 ได้ก่อน)
 */

import { useEffect, useState } from "react";
import {
  loadCategories,
  loadPresentationState,
  updatePresentationState,
  subscribeToPresentationState,
  unsubscribe,
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

const ORANGE = "#ED8240";

export default function ControlPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState<{
    slide: number;
    qId: number | null;
    open: boolean;
  }>({ slide: 1, qId: null, open: false });

  // โหลดครั้งแรก + subscribe realtime — ทุกคนที่เปิดหน้านี้เห็นสถานะเดียวกันเสมอ
  useEffect(() => {
    loadCategories().then(setCategories);
    loadPresentationState().then((s: PresentationState) =>
      setCurrent({
        slide: s.current_slide,
        qId: s.highlighted_question_id,
        open: s.modal_open,
      }),
    );

    const channel = subscribeToPresentationState((s: PresentationState) => {
      setCurrent({
        slide: s.current_slide,
        qId: s.highlighted_question_id,
        open: s.modal_open,
      });
    });

    return () => unsubscribe(channel);
  }, []);

  const isOnJeopardySlide = current.slide === JEOPARDY_SLIDE;

  const goSlide = async (n: number) => {
    // อัปเดต optimistic ไว้ก่อน — ถ้ามาจาก broadcast ของตัวเองจะ sync ค่าเดิมซ้ำ ไม่มีปัญหา
    setCurrent((c) => ({ ...c, slide: n }));
    await updatePresentationState({ current_slide: n });
  };

  const highlightQuestion = async (qId: number) => {
    if (!isOnJeopardySlide) return;
    setCurrent((c) => ({ ...c, qId, open: false }));
    await updatePresentationState({
      highlighted_question_id: qId,
      modal_open: false,
    });
  };

  const clearHighlight = async () => {
    if (!isOnJeopardySlide) return;
    setCurrent((c) => ({ ...c, qId: null, open: false }));
    await updatePresentationState({
      highlighted_question_id: null,
      modal_open: false,
    });
  };

  const openModal = async () => {
    if (!isOnJeopardySlide || !current.qId) return;
    setCurrent((c) => ({ ...c, open: true }));
    await updatePresentationState({ modal_open: true });
  };

  const closeModal = async () => {
    if (!isOnJeopardySlide) return;
    setCurrent((c) => ({ ...c, open: false }));
    await updatePresentationState({ modal_open: false });
  };

  const highlightedQuestionLabel = (() => {
    if (!current.qId) return null;
    for (const cat of categories) {
      const q = cat.questions?.find((qq) => qq.id === current.qId);
      if (q) return `${cat.name} · ข้อ ${q.number}`;
    }
    return `#${current.qId}`;
  })();

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
          ใช้ได้เฉพาะตอนอยู่สไลด์ {JEOPARDY_SLIDE} เท่านั้น
        </p>

        <div
          style={{
            opacity: isOnJeopardySlide ? 1 : 0.4,
            pointerEvents: isOnJeopardySlide ? "auto" : "none",
            transition: "opacity .2s",
          }}
        >
          {categories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 16 }}>
              <strong>{cat.name}</strong>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                {cat.questions?.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => highlightQuestion(q.id)}
                    disabled={!isOnJeopardySlide}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 6,
                      border: "none",
                      cursor: isOnJeopardySlide ? "pointer" : "not-allowed",
                      background: current.qId === q.id ? ORANGE : "#333",
                      color: "#fff",
                    }}
                  >
                    ข้อ {q.number}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={openModal}
              disabled={!isOnJeopardySlide || !current.qId}
              style={{
                padding: "12px 20px",
                borderRadius: 6,
                border: "none",
                cursor:
                  isOnJeopardySlide && current.qId ? "pointer" : "not-allowed",
                background:
                  isOnJeopardySlide && current.qId ? "#34d399" : "#333",
                color: "#fff",
                fontWeight: 700,
                opacity: isOnJeopardySlide && current.qId ? 1 : 0.5,
              }}
            >
              เปิด Modal
            </button>
            <button
              onClick={closeModal}
              disabled={!isOnJeopardySlide}
              style={{
                padding: "12px 20px",
                borderRadius: 6,
                border: "none",
                cursor: isOnJeopardySlide ? "pointer" : "not-allowed",
                background: "#f87171",
                color: "#fff",
                fontWeight: 700,
                opacity: isOnJeopardySlide ? 1 : 0.5,
              }}
            >
              ปิด Modal
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
