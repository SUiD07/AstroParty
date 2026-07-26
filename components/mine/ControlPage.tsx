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
 *  * - ★★ ปรับ UI ทั้งหมดให้เข้ากับธีม minimal ของ AdminPanel.tsx (white/black,
 *   border-black/[0.07], rounded-xl, ORANGE accent) แทนธีมมืดเดิมที่แยกจากกัน
 *   เพราะ component นี้ถูกเสียบอยู่ใน section ของ AdminPanel อยู่แล้ว
 * - ★★ เพิ่มปุ่ม "↑ เลื่อนขึ้นไปดูโจทย์ (Canva)" คู่กับปุ่ม "↓ เลื่อนให้ผู้ชมดูคะแนน"
 *   เดิม — ใช้ scroll_top_signal ใหม่ใน presentation_state (pattern เดียวกับ
 *   scroll_signal เดิม)
 * - Jeopardy cell จัดเป็น grid แบบเดียวกับหน้า viewer (คอลัมน์ = หมวด, แถว = เลขข้อ)
 * - ★★★ อัปเดต: หน้า viewer เพิ่มสไลด์ Canva เต็มจอเป็นสไลด์ที่ 2 ทำให้ทุกสไลด์
 *   ถัดจากนั้นเลื่อนเลขหน้าขึ้น 1 (รวมทั้งหมดเป็น 11 สไลด์) และสไลด์ Question
 *   Board (Jeopardy) ย้ายจากตำแหน่งที่ 3 ไปเป็นตำแหน่งที่ 4 — ปรับ TOTAL_SLIDES
 *   และ JEOPARDY_SLIDE ด้านล่างให้ตรงกัน
 */

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X } from "lucide-react";
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

const TOTAL_SLIDES = 11;
const JEOPARDY_SLIDE = 4;
const MAX_QUESTIONS_PER_CATEGORY = 6; // ต้องตรงกับ Slide3 ฝั่ง viewer

const ORANGE = "#ED8240";
const GREEN = "#1a7a4c";
const NEGATIVE = "#d4183d";
const BLUE = "#2563eb";

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
    scrollTopSignal: number;
    canvaPage: number | null; // ★ override เลขหน้าปัจจุบัน (null = ยังไม่ override)
  }>({
    slide: 1,
    qId: null,
    open: false,
    scrollSignal: 0,
    scrollTopSignal: 0,
    canvaPage: null,
  });

  useEffect(() => {
    loadCategories().then(setCategories);
    loadCanvaLinks().then(setCanvaLinks);
    loadPresentationState().then((s: PresentationState) =>
      setCurrent({
        slide: s.current_slide,
        qId: s.highlighted_question_id,
        open: s.modal_open,
        scrollSignal: s.scroll_signal,
        scrollTopSignal: s.scroll_top_signal,
        canvaPage: s.canva_current_page,
      }),
    );

    const channel = subscribeToPresentationState((s: PresentationState) => {
      setCurrent({
        slide: s.current_slide,
        qId: s.highlighted_question_id,
        open: s.modal_open,
        scrollSignal: s.scroll_signal,
        scrollTopSignal: s.scroll_top_signal,
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
    // ปิดได้เฉพาะตอนเปิดอยู่จริงเท่านั้น
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
  const triggerScrollToScore = async () => {
    if (!isOnJeopardySlide || !current.open) return;
    const next = current.scrollSignal + 1;
    setCurrent((c) => ({ ...c, scrollSignal: next }));
    await updatePresentationState({ scroll_signal: next });
  };

  // ★★ NEW — ตรงข้ามกับด้านบน: เลื่อนกลับขึ้นไปดูโจทย์ (Canva) ที่อยู่บนสุด
  const triggerScrollToTop = async () => {
    if (!isOnJeopardySlide || !current.open) return;
    const next = current.scrollTopSignal + 1;
    setCurrent((c) => ({ ...c, scrollTopSignal: next }));
    await updatePresentationState({ scroll_top_signal: next });
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

  // ★ ปุ่มเลื่อนหน้าใช้ได้เฉพาะตอน modal เปิดอยู่จริงเท่านั้น
  const canControlOpenModal = isOnJeopardySlide && current.open;

  const changeCanvaPage = async (delta: number) => {
    if (!canControlOpenModal) return;
    const nextPage = Math.max(1, effectivePage + delta);
    setCurrent((c) => ({ ...c, canvaPage: nextPage }));
    await updatePresentationState({ canva_current_page: nextPage });
  };

  return (
    <div className="space-y-6">
      {/* ── Status bar ── */}
      <div className="flex items-center gap-6 flex-wrap">
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

        {!isOnJeopardySlide && (
          <span className="ml-auto text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
            ⚠ ปุ่ม Jeopardy ใช้ได้เฉพาะตอนอยู่สไลด์ {JEOPARDY_SLIDE} — เลื่อนไป
            สไลด์ {JEOPARDY_SLIDE} ก่อน
          </span>
        )}
      </div>

      {/* ── Slide Control ── */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
          Slide Control
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => {
            const active = current.slide === i + 1;
            return (
              <button
                key={i}
                onClick={() => goSlide(i + 1)}
                className="w-9 h-9 rounded-lg text-xs font-medium border transition-all"
                style={{
                  background: active ? ORANGE : "transparent",
                  borderColor: active ? ORANGE : "rgba(0,0,0,0.1)",
                  color: active ? "#fff" : "rgba(0,0,0,0.5)",
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-black/[0.06]" />

      {/* ── Jeopardy Cells ── */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
            Jeopardy Cells
          </label>
          <span className="text-[10px] text-black/25">
            ใช้ได้เฉพาะตอนอยู่สไลด์ {JEOPARDY_SLIDE} — จัดเรียงตรงตามตำแหน่งบนจอ
            viewer
          </span>
        </div>

        <div
          className="transition-opacity duration-200"
          style={{
            opacity: isOnJeopardySlide ? 1 : 0.4,
            pointerEvents: isOnJeopardySlide ? "auto" : "none",
          }}
        >
          {categories.length === 0 ? (
            <p className="text-[11px] text-black/30 italic py-3">
              ยังไม่มีหมวดคำถาม
            </p>
          ) : (
            <div
              className="grid gap-1.5 max-w-2xl"
              style={{
                gridTemplateColumns: `repeat(${categories.length}, minmax(80px, 1fr))`,
              }}
            >
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="px-2 py-1.5 text-center rounded-md border text-[10px] font-medium tracking-wide overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{
                    background: "rgba(237,130,64,0.06)",
                    borderColor: "rgba(237,130,64,0.2)",
                    color: "rgba(0,0,0,0.55)",
                  }}
                  title={cat.name}
                >
                  {cat.name}
                </div>
              ))}

              {Array.from({ length: MAX_QUESTIONS_PER_CATEGORY }, (_, qi) =>
                categories.map((cat) => {
                  const q = cat.questions?.find((qq) => qq.number === qi + 1);
                  if (!q) {
                    return (
                      <div key={`${cat.id}-${qi}`} style={{ minHeight: 38 }} />
                    );
                  }
                  const isActive = current.qId === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => highlightQuestion(q.id)}
                      disabled={!isOnJeopardySlide}
                      className="rounded-md border text-[12px] font-semibold transition-all"
                      style={{
                        minHeight: 38,
                        borderColor: isActive ? ORANGE : "rgba(0,0,0,0.08)",
                        borderWidth: isActive ? 2 : 1,
                        cursor: isOnJeopardySlide ? "pointer" : "not-allowed",
                        background: isActive
                          ? "rgba(237,130,64,0.10)"
                          : "transparent",
                        color: isActive ? ORANGE : "rgba(0,0,0,0.6)",
                      }}
                    >
                      ข้อ {q.number}
                    </button>
                  );
                }),
              )}
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="mt-6 flex items-center gap-2 flex-wrap">
            <button
              onClick={openModal}
              disabled={!isOnJeopardySlide || !current.qId || current.open}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:cursor-not-allowed"
              style={{
                background:
                  isOnJeopardySlide && current.qId && !current.open
                    ? GREEN
                    : "rgba(0,0,0,0.08)",
                color:
                  isOnJeopardySlide && current.qId && !current.open
                    ? "#fff"
                    : "rgba(0,0,0,0.3)",
              }}
            >
              เปิด Modal
            </button>

            <button
              onClick={closeModal}
              disabled={!isOnJeopardySlide || !current.open}
              className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:cursor-not-allowed"
              style={{
                background:
                  isOnJeopardySlide && current.open
                    ? NEGATIVE
                    : "rgba(0,0,0,0.08)",
                color:
                  isOnJeopardySlide && current.open
                    ? "#fff"
                    : "rgba(0,0,0,0.3)",
              }}
            >
              ปิด Modal
            </button>

            <div className="w-px h-6 bg-black/[0.08]" />

            {/* ── ◀ / ▶ เลื่อนหน้า Canva ของ modal ที่เปิดอยู่ ── */}
            <div
              className="flex items-center gap-1 px-1.5 py-1 rounded-lg border transition-opacity"
              style={{
                borderColor: canControlOpenModal
                  ? "rgba(37,99,235,0.3)"
                  : "rgba(0,0,0,0.08)",
                background: canControlOpenModal
                  ? "rgba(37,99,235,0.06)"
                  : "transparent",
                opacity: canControlOpenModal ? 1 : 0.4,
              }}
              title="เลื่อนหน้า Canva ของ Modal ที่เปิดอยู่ ไม่ต้องปิด-เปิดใหม่"
            >
              <button
                onClick={() => changeCanvaPage(-1)}
                disabled={!canControlOpenModal}
                className="w-7 h-7 rounded-md flex items-center justify-center disabled:cursor-not-allowed"
                style={{
                  background: canControlOpenModal ? BLUE : "transparent",
                  color: canControlOpenModal ? "#fff" : "rgba(0,0,0,0.25)",
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span
                className="text-[11px] font-medium min-w-[52px] text-center"
                style={{
                  color: canControlOpenModal ? BLUE : "rgba(0,0,0,0.3)",
                }}
              >
                หน้า {effectivePage}
              </span>
              <button
                onClick={() => changeCanvaPage(1)}
                disabled={!canControlOpenModal}
                className="w-7 h-7 rounded-md flex items-center justify-center disabled:cursor-not-allowed"
                style={{
                  background: canControlOpenModal ? BLUE : "transparent",
                  color: canControlOpenModal ? "#fff" : "rgba(0,0,0,0.25)",
                }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-px h-6 bg-black/[0.08]" />

            {/* ── ↑ เลื่อนขึ้นไปดูโจทย์ / ↓ เลื่อนดูคะแนน ── */}
            <button
              onClick={triggerScrollToTop}
              disabled={!canControlOpenModal}
              title="เลื่อนจอผู้ชมที่เปิด Modal ค้างอยู่ ขึ้นไปดูโจทย์ (Canva) ด้านบน"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all disabled:cursor-not-allowed"
              style={{
                borderColor: canControlOpenModal
                  ? "rgba(52,211,153,0.4)"
                  : "rgba(0,0,0,0.08)",
                background: canControlOpenModal
                  ? "rgba(52,211,153,0.10)"
                  : "transparent",
                color: canControlOpenModal ? "#0f9d68" : "rgba(0,0,0,0.3)",
              }}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              เลื่อนขึ้นไปดูโจทย์
            </button>

            <button
              onClick={triggerScrollToScore}
              disabled={!canControlOpenModal}
              title="เลื่อนจอผู้ชมที่เปิด Modal ค้างอยู่ ไปยังจุดคะแนนใต้ Canva iframe"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all disabled:cursor-not-allowed"
              style={{
                borderColor: canControlOpenModal
                  ? "rgba(52,211,153,0.4)"
                  : "rgba(0,0,0,0.08)",
                background: canControlOpenModal
                  ? "rgba(52,211,153,0.10)"
                  : "transparent",
                color: canControlOpenModal ? "#0f9d68" : "rgba(0,0,0,0.3)",
              }}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              เลื่อนให้ผู้ชมดูคะแนน
            </button>

            <div className="w-px h-6 bg-black/[0.08]" />

            <button
              onClick={clearHighlight}
              disabled={!isOnJeopardySlide || !current.qId}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all disabled:cursor-not-allowed"
              style={{
                borderColor: "rgba(0,0,0,0.1)",
                color:
                  isOnJeopardySlide && current.qId
                    ? "rgba(0,0,0,0.55)"
                    : "rgba(0,0,0,0.25)",
              }}
            >
              <X className="w-3.5 h-3.5" />
              เคลียร์ไฮไลท์
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusChip — ใช้แสดงในแถบสถานะบนสุด (ปรับให้เข้ากับธีมขาว/ดำของ AdminPanel)
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
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.12em] text-black/30">
        {label}
      </span>
      <span
        className="text-sm font-semibold"
        style={{
          color: highlight ? "#1a7a4c" : dim ? "rgba(0,0,0,0.3)" : "#000",
        }}
      >
        {value}
      </span>
    </div>
  );
}
