"use client";

/**
 * หน้า /control — สำหรับแอดมิน/พิธีกร
 * ใช้คุมสไลด์และ highlight/เปิด modal คำถาม jeopardy ให้ทุกจอ /display sync ตาม
 */

import { useEffect, useState } from "react";
import {
  loadCategories,
  loadPresentationState,
  updatePresentationState,
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

export default function ControlPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [current, setCurrent] = useState<{
    slide: number;
    qId: number | null;
    open: boolean;
  }>({ slide: 1, qId: null, open: false });

  useEffect(() => {
    loadCategories().then(setCategories);
    loadPresentationState().then((s: PresentationState) =>
      setCurrent({
        slide: s.current_slide,
        qId: s.highlighted_question_id,
        open: s.modal_open,
      }),
    );
  }, []);

  const goSlide = async (n: number) => {
    setCurrent((c) => ({ ...c, slide: n }));
    await updatePresentationState({ current_slide: n });
  };

  const highlightQuestion = async (qId: number) => {
    // เลือกข้อ = highlight อย่างเดียว ยังไม่เปิด modal
    setCurrent((c) => ({ ...c, qId, open: false }));
    await updatePresentationState({
      highlighted_question_id: qId,
      modal_open: false,
    });
  };

  const openModal = async () => {
    if (!current.qId) return;
    setCurrent((c) => ({ ...c, open: true }));
    await updatePresentationState({ modal_open: true });
  };

  const closeModal = async () => {
    setCurrent((c) => ({ ...c, open: false }));
    await updatePresentationState({ modal_open: false });
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", color: "#fff", background: "#111", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: 12 }}>Slide Control</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        {Array.from({ length: TOTAL_SLIDES }, (_, i) => (
          <button
            key={i}
            onClick={() => goSlide(i + 1)}
            style={{
              padding: "10px 16px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: current.slide === i + 1 ? "#ED8240" : "#333",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <h2 style={{ marginBottom: 12 }}>Jeopardy Cells</h2>
      {categories.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 16 }}>
          <strong>{cat.name}</strong>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {cat.questions?.map((q) => (
              <button
                key={q.id}
                onClick={() => highlightQuestion(q.id)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: current.qId === q.id ? "#ED8240" : "#333",
                  color: "#fff",
                }}
              >
                ข้อ {q.number}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
        <button
          onClick={openModal}
          disabled={!current.qId}
          style={{
            padding: "12px 20px",
            borderRadius: 6,
            border: "none",
            cursor: current.qId ? "pointer" : "not-allowed",
            background: current.qId ? "#34d399" : "#333",
            color: "#fff",
            fontWeight: 700,
            opacity: current.qId ? 1 : 0.5,
          }}
        >
          เปิด Modal
        </button>
        <button
          onClick={closeModal}
          style={{
            padding: "12px 20px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: "#f87171",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          ปิด Modal
        </button>
      </div>

      <p style={{ marginTop: 24, opacity: 0.5, fontSize: 12 }}>
        สถานะปัจจุบัน: slide {current.slide} · question id {current.qId ?? "-"} ·{" "}
        modal {current.open ? "เปิด" : "ปิด"}
      </p>
    </div>
  );
}