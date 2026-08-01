"use client";

/**
 * หน้า /control — สำหรับแอดมิน/พิธีกร
 * ใช้คุมสไลด์และ highlight/เปิด modal คำถาม jeopardy ให้ทุกจอ /display sync ตาม
 *
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
 *  * - ★★
 * - ★★ ปรับ UI ทั้งหมดให้เข้ากับธีม minimal ของ AdminPanel.tsx (white/black,
 *   border-black/[0.07], rounded-xl, ORANGE accent) แทนธีมมืดเดิมที่แยกจากกัน
 *   เพราะ component นี้ถูกเสียบอยู่ใน section ของ AdminPanel อยู่แล้ว
 * - ★★ เพิ่มปุ่ม "↑ เลื่อนขึ้นไปดูโจทย์ (Canva)" คู่กับปุ่ม "↓ เลื่อนให้ผู้ชมดูคะแนน"
 *   เดิม — ใช้ scroll_top_signal ใหม่ใน presentation_state (pattern เดียวกับ
 *   scroll_signal เดิม)
 * - ปุ่ม ◀ / ▶ เลื่อนหน้า Canva ของ modal คำถามที่เปิดอยู่ (ไม่ปิด-เปิด modal ใหม่)
 * - Jeopardy cell จัดเป็น grid แบบเดียวกับหน้า viewer (คอลัมน์ = หมวด, แถว = เลขข้อ)
 * - ★★★ FIX บั๊กสำคัญ: JEOPARDY_SLIDE เดิมตั้งไว้ 3 แต่หลัง ViewerDashboard.tsx
 *   แทรกสไลด์ Canva Intro เข้ามาเป็นสไลด์ 2 ทำให้ Question Board ที่แท้จริง
 *   เลื่อนไปอยู่ตำแหน่งสไลด์ 4 — ปุ่ม highlight/เปิด-ปิด modal เคยทำงานผิดจังหวะ
 *   เพราะเช็คสไลด์ผิดตัว แก้เป็น JEOPARDY_SLIDE = 4, TOTAL_SLIDES = 11
 * - ★★★ เพิ่ม CANVA_INTRO_SLIDE = 2 และขยายปุ่ม ◀/▶ ให้ใช้ได้ตอนอยู่สไลด์
 *   Canva Intro ด้วย (ไม่ใช่แค่ตอนเปิด modal คำถาม) เพราะสไลด์นี้ใช้ไฟล์ Canva
 *   ไฟล์เดียวกับ Question Board เลยใช้ปุ่มเดิมร่วมกันได้เลยโดยไม่ต้องเพิ่ม state
 *   ใหม่ — เปลี่ยนชื่อ canControlOpenModal → canControlCanvaPage ให้สื่อความหมาย
 *   ตรงขึ้น เพราะตอนนี้ครอบคลุม 2 บริบท ไม่ใช่แค่ modal อย่างเดียว
 * - ★★★★ NEW: Canva Page Presets ("Quick Jump") — เสริมปุ่ม ◀/▶ เดิม ไม่แทนที่
 *   ◀/▶ = เลื่อนทีละหน้า, preset = กระโดดตรงไปหน้าที่ตั้งชื่อไว้ล่วงหน้า
 *   (เช่น "time up" หน้า 100, "buffer" หน้า 101) เก็บใน Supabase table
 *   canva_page_presets ใหม่ ใช้ gate เดียวกับปุ่ม ◀/▶ (canControlCanvaPage)
 *   ทั้งคู่แก้ canva_current_page ตัวเดียวกัน จึง sync กันเองเสมอ ไม่มีทาง
 *   ไม่ตรงกัน — เรียง preset ตามเลขหน้าน้อย→มาก
 * - ★★★★★ NEW: Canva Preview — โชว์หน้าก่อนหน้า/ปัจจุบัน/ถัดไปเป็น iframe
 *   จริงย่อขนาด (ไม่ใช่ screenshot) mount ค้างตลอดเหมือน CanvaSingleFrame
 *   หลักของฝั่ง viewer เพื่อไม่ให้ reload ทุกครั้งที่เลขหน้าขยับ — ใช้
 *   computeCanvaSrc/CanvaSingleFrame/INTRO_CANVA_URL ที่ export มาจาก
 *   ViewerDashboard.tsx ตรงๆ (ไม่แยกไฟล์ใหม่ตามที่ตกลงกันไว้) คลิก preview
 *   = จั๊มป์ไปหน้านั้นทันที (เรียก changeCanvaPage เดิมซ้ำ ไม่เขียนใหม่)
 * - ★★★★★★ NEW: Quick Jump return — กด preset (เช่น "time up") แล้วจำหน้าที่
 *   ค้างไว้ก่อน jump ไว้ใน preJumpPage (บันทึกแค่ครั้งแรกที่ยังไม่อยู่ในสถานะ
 *   jump กัน jump ซ้อน jump ทับตำแหน่งจริง) ปุ่ม "↩ กลับ" จะพาไปหน้า
 *   preJumpPage + 1 (ข้ามไปหน้าถัดไปเลยตามที่ตกลงกัน) แล้วเคลียร์ preJumpPage
 *   preJumpPage ถูกเคลียร์ทิ้งทุกครั้งที่มีการนำทางแบบอื่นเกิดขึ้นด้วย
 *   (เปลี่ยนสไลด์, highlight คำถามใหม่, เคลียร์ไฮไลท์, ปิด modal, กด ◀/▶ เอง)
 *   เพื่อไม่ให้ปุ่ม "กลับ" ค้างพาไปหน้าผิดถ้าพี่เลื่อนเองไปแล้วระหว่างทาง
 */

import { useEffect, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Zap,
  Undo2,
  LayoutGrid,
} from "lucide-react";
import {
  loadCategories,
  loadPresentationState,
  updatePresentationState,
  subscribeToPresentationState,
  unsubscribe,
  loadCanvaLinks,
  splitCanvaUrl,
  loadCanvaPagePresets,
  createCanvaPagePreset,
  deleteCanvaPagePreset,
  type PresentationState,
  type CanvaPagePreset,
} from "@/lib/db";
// ★★★★★ NEW: import ข้ามไฟล์จาก ViewerDashboard.tsx ตรงๆ (ไม่แยกไฟล์ใหม่)
// ต้อง export computeCanvaSrc / CanvaSingleFrame / INTRO_CANVA_URL ออกมาที่
// ต้นทางก่อน (แค่เติมคำว่า `export` หน้าของเดิม ไม่แก้ logic ข้างใน)
import {
  computeCanvaSrc,
  CanvaSingleFrame,
  INTRO_CANVA_URL,
} from "./ViewerDashboard";

interface Question {
  id: number;
  number: number;
}
interface Category {
  id: number;
  name: string;
  questions: Question[];
}

const TOTAL_SLIDES = 12; // ★★ [แก้ไข] เพิ่ม Slide12 (พักเบรก) ต่อท้าย
const JEOPARDY_SLIDE = 4;
// ★ สไลด์ Canva Intro (เต็มจอ) — ใช้ไฟล์ Canva เดียวกับ Question Board
// จึงใช้ปุ่ม ◀/▶ เลื่อนหน้าร่วมกันได้ (ดู canControlCanvaPage ด้านล่าง)
const CANVA_INTRO_SLIDE = 2;
const MAX_QUESTIONS_PER_CATEGORY = 6; // ต้องตรงกับ Slide3 ฝั่ง viewer

// ★★ [ใหม่] Preview สไลด์แบบข้อความล้วน — ตั้งค่าคงที่ตายตัว ไม่ดึงข้อมูลจริง
// (คะแนน/อันดับ ฯลฯ) เลย จึงไม่กิน realtime bandwidth เพิ่มขึ้นแม้แต่นิดเดียว
// ต้องแก้ array นี้เองถ้าลำดับ/ชื่อสไลด์ฝั่ง viewer เปลี่ยนในอนาคต (ต้องตรงกับ
// slides record ใน ViewerDashboard.tsx)
const SLIDE_LABELS: string[] = [
  "หน้าไตเติ้ล",
  "Canva Intro",
  "ภาพรวม",
  "Question Board",
  "Space Race",
  "Live Leaderboard",
  "กำลังประมวลผล",
  "รางวัลชมเชย",
  "รองชนะเลิศ 2",
  "รองชนะเลิศ 1",
  "ชนะเลิศ",
  "พักเบรก",
];

const ORANGE = "#ED8240";
const GREEN = "#1a7a4c";
const NEGATIVE = "#d4183d";
const BLUE = "#2563eb";

export default function ControlPage({
  // onJumpToScore,
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
    scrollBoardSignal: number;
    canvaPage: number | null; // ★ override เลขหน้าปัจจุบัน (null = ยังไม่ override)
  }>({
    slide: 1,
    qId: null,
    open: false,
    scrollSignal: 0,
    scrollTopSignal: 0,
    scrollBoardSignal: 0,
    canvaPage: null,
  });

  // ★★★★ NEW: Canva Page Presets ("Quick Jump")
  const [presets, setPresets] = useState<CanvaPagePreset[]>([]);
  const [showAddPreset, setShowAddPreset] = useState(false);
  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [newPresetPage, setNewPresetPage] = useState("");

  // ★★★★★★ NEW: จำหน้าที่ค้างไว้ก่อนกด Quick Jump ครั้งแรก (null = ไม่ได้
  // อยู่ในสถานะ "jump ออกไป") ใช้คู่กับปุ่ม "↩ กลับ"
  const [preJumpPage, setPreJumpPage] = useState<number | null>(null);

  useEffect(() => {
    loadCategories().then(setCategories);
    loadCanvaLinks().then(setCanvaLinks);
    loadCanvaPagePresets().then(setPresets); // ★★★★ NEW
    loadPresentationState().then((s: PresentationState) =>
      setCurrent({
        slide: s.current_slide,
        qId: s.highlighted_question_id,
        open: s.modal_open,
        scrollSignal: s.scroll_signal,
        scrollTopSignal: s.scroll_top_signal,
        scrollBoardSignal: s.scroll_board_signal,
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
        scrollBoardSignal: s.scroll_board_signal,
        canvaPage: s.canva_current_page,
      });
    });

    return () => unsubscribe(channel);
  }, []);

  const isOnJeopardySlide = current.slide === JEOPARDY_SLIDE;
  const isOnCanvaIntroSlide = current.slide === CANVA_INTRO_SLIDE;

  const goSlide = async (n: number) => {
    // ★ เข้า/ออกสไลด์ Canva Intro — เคลียร์ override เลขหน้าเก่าทิ้งเสมอ
    // เพื่อไม่ให้เลขหน้าที่เคยเลื่อนไว้ตอนอยู่บริบทหนึ่ง (เช่น modal คำถาม)
    // ค้างมาโผล่ผิดที่ตอนสลับไปอีกบริบทหนึ่ง (เช่น Canva Intro) โดยไม่ตั้งใจ
    const enteringOrLeavingIntro =
      n === CANVA_INTRO_SLIDE || current.slide === CANVA_INTRO_SLIDE;
    setCurrent((c) => ({
      ...c,
      slide: n,
      canvaPage: enteringOrLeavingIntro ? null : c.canvaPage,
    }));
    if (enteringOrLeavingIntro) setPreJumpPage(null); // ★★★★★★ NEW
    await updatePresentationState({
      current_slide: n,
      ...(enteringOrLeavingIntro ? { canva_current_page: null } : {}),
    });
  };

  const highlightQuestion = async (qId: number) => {
    if (!isOnJeopardySlide) return;
    // ★ เลือกคำถามใหม่ — เคลียร์ override เลขหน้าเก่าทิ้งด้วยเสมอ
    setCurrent((c) => ({ ...c, qId, open: false, canvaPage: null }));
    setPreJumpPage(null); // ★★★★★★ NEW
    await updatePresentationState({
      highlighted_question_id: qId,
      modal_open: false,
      canva_current_page: null,
    });
  };

  const clearHighlight = async () => {
    if (!isOnJeopardySlide) return;
    setCurrent((c) => ({ ...c, qId: null, open: false, canvaPage: null }));
    setPreJumpPage(null); // ★★★★★★ NEW
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
    setPreJumpPage(null); // ★★★★★★ NEW
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

  // ★★★★★★★★ NEW: ส่งสัญญาณให้จอ viewer ที่เปิด modal ค้างอยู่ สลับไปโชว์
  // iframe keepthescore เต็มคอลัมน์ขวาแทนที่ list คะแนน
  const triggerScrollToBoard = async () => {
    if (!isOnJeopardySlide || !current.open) return;
    const next = current.scrollBoardSignal + 1;
    setCurrent((c) => ({ ...c, scrollBoardSignal: next }));
    await updatePresentationState({ scroll_board_signal: next });
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

  // ★ เลขหน้า Canva เริ่มต้น — สองบริบท:
  // 1) อยู่สไลด์ Canva Intro → เริ่มที่หน้า 1 เสมอ (ไม่มี "คำถาม" มากำหนดเลขหน้า)
  // 2) เปิด modal คำถามอยู่ → ใช้เลขหน้าเริ่มต้นที่ตั้งไว้ล่วงหน้าต่อคำถามนั้น
  //    (parse จาก canva_url ใน CanvaLinkManager)
  const assignedPage = (() => {
    if (isOnCanvaIntroSlide) return 1;
    if (!current.qId) return null;
    const url = canvaLinks[current.qId];
    if (!url) return null;
    const { page } = splitCanvaUrl(url);
    const n = Number(page);
    return page !== "" && !Number.isNaN(n) ? n : null;
  })();

  // ★ เลขหน้าที่กำลังแสดงอยู่จริงตอนนี้ (override ถ้ามี ไม่งั้นใช้ค่าเริ่มต้น)
  const effectivePage = current.canvaPage ?? assignedPage ?? 1;

  // ★ ปุ่มเลื่อนหน้าใช้ได้ใน 2 กรณี: (1) เปิด modal คำถามอยู่จริง หรือ
  // (2) อยู่สไลด์ Canva Intro (ไม่ต้องมี "modal" เพราะเป็นสไลด์เต็มจอ)
  // ทั้งสองกรณีใช้ canva_current_page ตัวเดียวกัน แต่ไม่มีทางเกิดพร้อมกัน
  // (คนละสไลด์) จึงไม่ชนกัน — ดู FIX H ใน ViewerDashboard.tsx
  const canControlCanvaPage =
    (isOnJeopardySlide && current.open) || isOnCanvaIntroSlide;

  // ★★★★★ NEW: base URL ของ Canva ที่ "กำลังคุมอยู่ตอนนี้" — ใช้คำนวณ preview
  // (1) modal คำถาม → canvaLinks[qId]  (2) Canva Intro → INTRO_CANVA_URL คงที่
  const activeCanvaUrl = isOnCanvaIntroSlide
    ? INTRO_CANVA_URL
    : current.qId
      ? canvaLinks[current.qId]
      : undefined;

  const changeCanvaPage = async (delta: number) => {
    if (!canControlCanvaPage) return;
    const nextPage = Math.max(1, effectivePage + delta);
    setCurrent((c) => ({ ...c, canvaPage: nextPage }));
    setPreJumpPage(null); // ★★★★★★ NEW — เลื่อนเองแล้ว ไม่ใช่รอ "กลับ" อีกต่อไป
    await updatePresentationState({ canva_current_page: nextPage });
  };

  // ★★★★ NEW: Quick Jump — กระโดดตรงไปหน้าที่ตั้ง preset ไว้
  // ใช้ gate เดียวกับปุ่ม ◀/▶ (canControlCanvaPage) เป๊ะๆ
  const applyPreset = async (page: number) => {
    if (!canControlCanvaPage) return;
    // ★★★★★★ NEW: บันทึกหน้าปัจจุบันไว้ก่อน jump — เฉพาะครั้งแรกที่ยังไม่ได้
    // อยู่ในสถานะ jump (preJumpPage === null) กัน jump ซ้อน jump ทับตำแหน่งจริง
    setCurrent((c) => {
      if (preJumpPage === null) {
        setPreJumpPage(c.canvaPage ?? assignedPage ?? 1);
      }
      return { ...c, canvaPage: page };
    });
    await updatePresentationState({ canva_current_page: page });
  };

  // ★★★★★★ NEW: กลับจาก Quick Jump — 2 แบบ
  // (1) กลับหน้าเดิมเป๊ะๆ ที่ค้างไว้ก่อน jump
  // (2) กลับ + ข้ามไปหน้าถัดไปเลย (เผื่อกรณีเนื้อหาหน้าเดิมโชว์ไปแล้วตอน jump)
  // ทั้งคู่เคลียร์ preJumpPage ทิ้งเหมือนกัน (จบสถานะ "jump ออกไป")
  const returnFromJump = async (advance: boolean) => {
    if (!canControlCanvaPage || preJumpPage === null) return;
    const nextPage = advance ? preJumpPage + 1 : preJumpPage;
    setCurrent((c) => ({ ...c, canvaPage: nextPage }));
    setPreJumpPage(null);
    await updatePresentationState({ canva_current_page: nextPage });
  };

  const addPreset = async () => {
    const page = Number(newPresetPage);
    if (!newPresetLabel.trim() || !newPresetPage || Number.isNaN(page)) return;
    const created = await createCanvaPagePreset(newPresetLabel.trim(), page);
    setPresets((p) =>
      [...p, created].sort((a, b) => a.page_number - b.page_number),
    );
    setNewPresetLabel("");
    setNewPresetPage("");
    setShowAddPreset(false);
  };

  const removePreset = async (id: number) => {
    await deleteCanvaPagePreset(id);
    setPresets((p) => p.filter((preset) => preset.id !== id));
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
        {canControlCanvaPage && (
          <StatusChip
            label="หน้า Canva ปัจจุบัน"
            value={`หน้า ${effectivePage}`}
            highlight={current.canvaPage != null}
          />
        )}

        {!isOnJeopardySlide && !isOnCanvaIntroSlide && (
          <span className="ml-auto text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
            ⚠ ปุ่ม Jeopardy ใช้ได้เฉพาะตอนอยู่สไลด์ {JEOPARDY_SLIDE} — เลื่อนไป
            สไลด์ {JEOPARDY_SLIDE} ก่อน
          </span>
        )}
        {isOnCanvaIntroSlide && (
          <span className="ml-auto text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-md">
            ℹ อยู่ในสไลด์ Canva Intro — ใช้ปุ่ม ◀/▶ เลื่อนหน้าได้เลย
          </span>
        )}
      </div>

      {/* ── Slide Control ── */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
          Slide Control
        </label>
        {/* ★★ [แก้ไข] เดิมเป็นปุ่มตัวเลขล้วน (w-9 h-9) เปลี่ยนเป็นการ์ดที่มีเลข +
            ชื่อสไลด์ (จาก SLIDE_LABELS ค่าคงที่ ไม่ใช่ข้อมูลจริง) ให้กดง่ายขึ้นว่า
            แต่ละหมายเลขคือสไลด์อะไร โดยไม่ต้องดึงข้อมูลอะไรเพิ่มเลย */}
        <div className="flex gap-1.5 flex-wrap">
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => {
            const active = current.slide === i + 1;
            return (
              <button
                key={i}
                onClick={() => goSlide(i + 1)}
                className="flex flex-col items-center justify-center rounded-lg text-[10px] font-medium border transition-all px-2 py-1.5 min-w-[64px]"
                style={{
                  background: active ? ORANGE : "transparent",
                  borderColor: active ? ORANGE : "rgba(0,0,0,0.1)",
                  color: active ? "#fff" : "rgba(0,0,0,0.5)",
                }}
              >
                <span className="text-xs font-bold">{i + 1}</span>
                <span className="leading-tight text-center opacity-90">
                  {SLIDE_LABELS[i] ?? ""}
                </span>
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
                        borderColor: isActive
                          ? ORANGE
                          : "rgba(0,0,0,0.08)",
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
          </div>

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
                borderColor: canControlCanvaPage
                  ? "rgba(37,99,235,0.3)"
                  : "rgba(0,0,0,0.08)",
                background: canControlCanvaPage
                  ? "rgba(37,99,235,0.06)"
                  : "transparent",
                opacity: canControlCanvaPage ? 1 : 0.4,
              }}
              title="เลื่อนหน้า Canva — ใช้ได้ทั้งตอนเปิด Modal คำถามอยู่ และตอนอยู่สไลด์ Canva Intro"
            >
              <button
                onClick={() => changeCanvaPage(-1)}
                disabled={!canControlCanvaPage}
                className="w-7 h-7 rounded-md flex items-center justify-center disabled:cursor-not-allowed"
                style={{
                  background: canControlCanvaPage ? BLUE : "transparent",
                  color: canControlCanvaPage ? "#fff" : "rgba(0,0,0,0.25)",
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span
                className="text-[11px] font-medium min-w-[52px] text-center"
                style={{
                  color: canControlCanvaPage ? BLUE : "rgba(0,0,0,0.3)",
                }}
              >
                หน้า {effectivePage}
              </span>
              <button
                onClick={() => changeCanvaPage(1)}
                disabled={!canControlCanvaPage}
                className="w-7 h-7 rounded-md flex items-center justify-center disabled:cursor-not-allowed"
                style={{
                  background: canControlCanvaPage ? BLUE : "transparent",
                  color: canControlCanvaPage ? "#fff" : "rgba(0,0,0,0.25)",
                }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ── ★★★★ NEW: Quick Jump preset — แยกทรง/สีจาก ◀/▶ ชัดเจน กันสับสน ── */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border flex-wrap"
              style={{
                borderColor: canControlCanvaPage
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(0,0,0,0.06)",
                background: "transparent",
                opacity: canControlCanvaPage ? 1 : 0.4,
              }}
              title="กระโดดไปหน้าที่ตั้งชื่อไว้โดยตรง"
            >
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-black/35 px-1">
                <Zap className="w-3 h-3" />
                Quick Jump
              </span>

              {presets.map((preset) => (
                <span
                  key={preset.id}
                  className="flex items-center rounded-md border overflow-hidden"
                  style={{ borderColor: "rgba(0,0,0,0.1)" }}
                >
                  <button
                    onClick={() => applyPreset(preset.page_number)}
                    disabled={!canControlCanvaPage}
                    className="px-2.5 py-1.5 text-[11px] font-medium disabled:cursor-not-allowed"
                    style={{
                      color: canControlCanvaPage
                        ? "rgba(0,0,0,0.65)"
                        : "rgba(0,0,0,0.3)",
                    }}
                  >
                    {preset.label} · {preset.page_number}
                  </button>
                  <button
                    onClick={() => removePreset(preset.id)}
                    className="w-6 h-6 flex items-center justify-center text-black/25 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {showAddPreset ? (
                <div className="flex items-center gap-1">
                  <input
                    value={newPresetLabel}
                    onChange={(e) => setNewPresetLabel(e.target.value)}
                    placeholder="ชื่อ"
                    className="w-16 px-2 py-1.5 text-[11px] rounded-md border border-black/10 outline-none"
                  />
                  <input
                    value={newPresetPage}
                    onChange={(e) => setNewPresetPage(e.target.value)}
                    placeholder="หน้า"
                    inputMode="numeric"
                    className="w-14 px-2 py-1.5 text-[11px] rounded-md border border-black/10 outline-none"
                  />
                  <button
                    onClick={addPreset}
                    className="px-2.5 py-1.5 text-[11px] font-medium rounded-md text-white"
                    style={{ background: ORANGE }}
                  >
                    บันทึก
                  </button>
                  <button
                    onClick={() => setShowAddPreset(false)}
                    className="px-2 py-1.5 text-[11px] text-black/40"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddPreset(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-md border border-dashed border-black/15 text-black/40"
                >
                  <Plus className="w-3 h-3" />
                  เพิ่ม
                </button>
              )}
            </div>

            {/* ── ★★★★★★ NEW: ปุ่มกลับจาก Quick Jump — 2 แบบ ── */}
            {preJumpPage !== null && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => returnFromJump(false)}
                  disabled={!canControlCanvaPage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border disabled:cursor-not-allowed"
                  style={{
                    borderColor: "rgba(237,130,64,0.35)",
                    background: "rgba(237,130,64,0.08)",
                    color: ORANGE,
                  }}
                  title={`กลับไปหน้า ${preJumpPage} (หน้าเดิมที่ค้างไว้ก่อน jump)`}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  กลับหน้าเดิม · หน้า {preJumpPage}
                </button>

                <button
                  onClick={() => returnFromJump(true)}
                  disabled={!canControlCanvaPage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border disabled:cursor-not-allowed"
                  style={{
                    borderColor: "rgba(237,130,64,0.35)",
                    background: "rgba(237,130,64,0.08)",
                    color: ORANGE,
                  }}
                  title={`กลับไปหน้า ${preJumpPage + 1} (ถัดจากหน้าที่ค้างไว้ก่อน jump)`}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  กลับ+ถัดไป · หน้า {preJumpPage + 1}
                </button>
              </div>
            )}
            {/* ── ★★★★★ NEW: Canva Preview — ก่อนหน้า / ปัจจุบัน / ถัดไป ──
              mount ค้างตลอด (ไม่ conditional-render/unmount) เหมือน
              CanvaSingleFrame หลักของ viewer เพื่อไม่ให้ iframe reload ทุกครั้ง
              ที่เลขหน้าขยับ — gate ด้วย canControlCanvaPage เหมือนปุ่มอื่น
              คลิก preview = จั๊มป์ไปหน้านั้นทันที (เรียก changeCanvaPage เดิม) */}
            {canControlCanvaPage && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {[
                  {
                    label: "ก่อนหน้า",
                    page: effectivePage - 1,
                    onClick: () => changeCanvaPage(-1),
                  },
                  {
                    label: "ปัจจุบัน",
                    page: effectivePage,
                    onClick: undefined,
                  },
                  {
                    label: "ถัดไป",
                    page: effectivePage + 1,
                    onClick: () => changeCanvaPage(1),
                  },
                ].map(({ label, page, onClick }) => (
                  <div
                    key={label}
                    onClick={onClick}
                    className="rounded-lg border overflow-hidden"
                    style={{
                      borderColor:
                        label === "ปัจจุบัน"
                          ? "rgba(237,130,64,0.4)"
                          : "rgba(0,0,0,0.08)",
                      width: 160,
                      cursor: onClick ? "pointer" : "default",
                    }}
                  >
                    <div className="px-2 py-1 text-[10px] text-black/40 border-b border-black/[0.06]">
                      {label} · หน้า {Math.max(1, page)}
                    </div>
                    {/* ★ scale ย่อทั้ง iframe แทนบีบ width/height ตรงๆ — กัน
                      Canva re-layout เนื้อหาข้างในผิดสัดส่วน (เทคนิคเดียวกับ
                      mini scoreboard iframe ใน QuestionModal) */}
                    <div
                      style={{
                        width: 160,
                        height: 90,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          transform: "scale(0.167)", // 160/958 ≈ พอดีเฟรม 16:9
                          transformOrigin: "top left",
                          width: 958,
                          height: 539,
                          pointerEvents: "none", // preview ดูอย่างเดียว
                        }}
                      >
                        <CanvaSingleFrame
                          src={computeCanvaSrc(
                            activeCanvaUrl,
                            Math.max(1, page),
                          )}
                          modalVisible={true}
                          fill
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="w-px h-6 bg-black/[0.08]" />

            {/* ── ↑ เลื่อนขึ้นไปดูโจทย์ / ↓ เลื่อนดูคะแนน ── */}
            <button
              onClick={triggerScrollToTop}
              disabled={!canControlCanvaPage}
              title="เลื่อนจอผู้ชมที่เปิด Modal ค้างอยู่ ขึ้นไปดูโจทย์ (Canva) ด้านบน"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all disabled:cursor-not-allowed"
              style={{
                borderColor: canControlCanvaPage
                  ? "rgba(52,211,153,0.4)"
                  : "rgba(0,0,0,0.08)",
                background: canControlCanvaPage
                  ? "rgba(52,211,153,0.10)"
                  : "transparent",
                color: canControlCanvaPage ? "#0f9d68" : "rgba(0,0,0,0.3)",
              }}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              เลื่อนขึ้นไปดูโจทย์
            </button>
            
            <button
              onClick={triggerScrollToScore}
              disabled={!canControlCanvaPage}
              title="เลื่อนจอผู้ชมที่เปิด Modal ค้างอยู่ ไปยังจุดคะแนนใต้ Canva iframe"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all disabled:cursor-not-allowed"
              style={{
                borderColor: canControlCanvaPage
                  ? "rgba(52,211,153,0.4)"
                  : "rgba(0,0,0,0.08)",
                background: canControlCanvaPage
                  ? "rgba(52,211,153,0.10)"
                  : "transparent",
                color: canControlCanvaPage ? "#0f9d68" : "rgba(0,0,0,0.3)",
              }}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              เลื่อนให้ผู้ชมดูคะแนน
            </button>

            {/* ── ★★★★★★★★ NEW: เลื่อนให้ผู้ชมดู Scoreboard (keepthescore) ── */}
            <button
              onClick={triggerScrollToBoard}
              disabled={!canControlCanvaPage}
              title="เลื่อนจอผู้ชมที่เปิด Modal ค้างอยู่ ไปโชว์ iframe scoreboard เต็มคอลัมน์ขวา"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-all disabled:cursor-not-allowed"
              style={{
                borderColor: canControlCanvaPage
                  ? "rgba(52,211,153,0.4)"
                  : "rgba(0,0,0,0.08)",
                background: canControlCanvaPage
                  ? "rgba(52,211,153,0.10)"
                  : "transparent",
                color: canControlCanvaPage ? "#0f9d68" : "rgba(0,0,0,0.3)",
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              เลื่อนให้ผู้ชมดู Scoreboard
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