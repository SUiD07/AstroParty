"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trash2,
  RefreshCw,
  Users,
  Clock,
  CheckCircle,
  Rocket,
  Link2,
  ClipboardList,
  // Grid3x3,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  // Timer,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  loadData,
  saveTeam,
  deleteTeam,
  loadCategories,
  loadScoreEvents,
  addScoreEvent,
  deleteScoreEvent,
  updateScoreEvent,
  subscribeToTeams,
} from "@/lib/db";
import { RaceData, Team } from "@/app/types";
import { COLORS } from "@/app/constants";
import { ScoreEvent } from "@/lib/db";
import Link from "next/link";
import { AuditMatrix } from "./AuditMatrix";
import { subscribeToScoreEvents, unsubscribe } from "@/lib/db";
import { CanvaLinkManager } from "./CanvaLinkManager";
import ControlPage from "./ControlPage";
import { TimerAdminControl } from "./TimerAdminControl";
import { useServerTimeSync } from "@/lib/serverTime";

const ORANGE = "#ED8240";
const NEGATIVE = "#d4183d";

// ---- Types ----
interface Question {
  id: number;
  number: number;
  points: number;
  label?: string;
}
interface Category {
  id: number;
  name: string;
  position: number;
  questions: Question[];
}

// ===========================================================================
// Sidebar — เปลี่ยนจาก 7 nav items (scroll-spy, mount รวมกันหมด) เป็น 3 "tabs"
// ที่ mount แยกกันจริง ๆ ตาม role ของคนใช้งาน เพื่อไม่ให้เปิด realtime channel
// (teams / score_events) เกินความจำเป็นสำหรับคนที่ไม่ได้ใช้ส่วนนั้น
// - scoring   : คนกรอกคะแนน   → เพิ่มคะแนน + Score Event Log + Score Audit Matrix
// - slides    : คนเปิดสไลด์   → Presentation State + Timer
// - emergency : staff สำรอง   → Fleet Management + Canva Embed Links (ปกติไม่แตะ)
// ===========================================================================
interface TabItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  {
    id: "scoring",
    label: "เพิ่มคะแนน",
    description: "กรอกคะแนน · Event Log · Audit Matrix",
    icon: CheckCircle,
  },
  {
    id: "slides",
    label: "ควบคุมสไลด์",
    description: "Presentation State · Timer",
    icon: ClipboardList,
  },
  {
    id: "emergency",
    label: "ฉุกเฉิน",
    description: "Fleet Management · Canva Links",
    icon: Rocket,
  },
];

function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
}: {
  active: string;
  onNavigate: (id: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 w-56 flex-shrink-0 flex flex-col overflow-y-auto transition-transform duration-300 z-40 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ background: "#0a0a0a" }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <span className="font-display font-bold text-white text-base tracking-tight block">
            AstroParty
          </span>
          <span className="text-white/25 text-[10px] tracking-widest uppercase mt-0.5 block">
            Admin
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-white/25 hover:text-white/60 transition-colors shrink-0 ml-2"
          title="ปิดเมนู"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <nav className="flex-1 px-3 py-4">
        <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] px-2 mb-2">
          เมนู
        </p>
        <div className="space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className="w-full flex flex-col items-start gap-0.5 px-2.5 py-2.5 rounded-md text-left transition-all"
                style={{
                  background: isActive
                    ? "rgba(237,130,64,0.12)"
                    : "transparent",
                }}
              >
                <span
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: isActive ? ORANGE : "rgba(255,255,255,0.6)" }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </span>
                <span
                  className="text-[10px] pl-6"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer link */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: "rgba(255,255,255,0.25)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.6)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "rgba(255,255,255,0.25)")
          }
        >
          <ExternalLink className="w-3 h-3" />
          View Display
        </Link>
      </div>
    </aside>
  );
}

// Small helper button used in ScoreEntryAndLog + elsewhere (mirrors ScoreBtn look from example)
// function PillButton({
//   children,
//   active,
//   onClick,
//   positive,
// }: {
//   children: React.ReactNode;
//   active?: boolean;
//   onClick: () => void;
//   positive?: boolean;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className="py-2 rounded-lg text-[11px] font-medium border transition-all"
//       style={{
//         background: active
//           ? positive === false
//             ? "rgba(212,24,61,0.08)"
//             : "rgba(237,130,64,0.10)"
//           : "transparent",
//         borderColor: active
//           ? positive === false
//             ? "rgba(212,24,61,0.3)"
//             : "rgba(237,130,64,0.3)"
//           : "rgba(0,0,0,0.08)",
//         color: active
//           ? positive === false
//             ? NEGATIVE
//             : ORANGE
//           : "rgba(0,0,0,0.5)",
//       }}
//     >
//       {children}
//     </button>
//   );
// }

// ===========================================================================
// ScoreEntryAndLog
// ===========================================================================
const fmtScore = (n: number) => {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
};

interface TeamEntry {
  bonus: boolean;
  n: number; // ใช้ร่วมกันทั้งกติกา A และ B (สูตรคำนวณต่างกัน ไม่ใช่ช่องกรอก)
}

interface PendingSaveRow {
  teamId: string;
  teamName: string;
  teamColor: string;
  finalScore: number;
  note: string;
}
interface PendingSave {
  kind: "normal" | "raw";
  categoryId: number;
  categoryName: string;
  questionId: number;
  questionNumber: number;
  rows: PendingSaveRow[];
}

function ScoreEntryAndLog({
  teams,
  onRefreshScores,
  refreshVersion,
  jumpTarget,
  onJumpHandled,
}: {
  teams: Team[];
  onRefreshScores: () => void;
  refreshVersion: number;
  jumpTarget?: { categoryId: number; questionNumber: number } | null;
  onJumpHandled?: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [scoreFull, setScoreFull] = useState<number | null>(null);

  // per-team data: key = teamId — ทุกทีมมี entry เสมอ ไม่ต้อง select
  // n = ช่องเดียวใช้ร่วมกันทั้งกติกา A และ B (สูตรคำนวณต่างกัน ไม่ใช่ช่องกรอก)
  const [teamEntries, setTeamEntries] = useState<Record<string, TeamEntry>>({});

  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);

  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Filters สำหรับ Score Event Log ──────────────────────────────────
  const [filterTeamIds, setFilterTeamIds] = useState<Set<string>>(new Set());
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterQuestionNumber, setFilterQuestionNumber] = useState<
    number | null
  >(null);

  // รับคำสั่ง "jump มาดูคะแนนข้อนี้" จากภายนอก (เช่นปุ่มในหน้า Presentation State)
  // — apply filter ให้อัตโนมัติ แล้วเลื่อนหน้าไปยัง event log
  useEffect(() => {
    if (!jumpTarget) return;
    setFilterTeamIds(new Set());
    setFilterCategoryId(jumpTarget.categoryId);
    setFilterQuestionNumber(jumpTarget.questionNumber);
    document
      .getElementById("event-log")
      ?.scrollIntoView({ behavior: "smooth" });
    onJumpHandled?.();
  }, [jumpTarget, onJumpHandled]);

  // ── แก้ไขคะแนนที่บันทึกไปแล้ว ────────────────────────────────────────
  const [editingEvent, setEditingEvent] = useState<ScoreEvent | null>(null);
  const [editMode, setEditMode] = useState<"formula" | "manual">("formula");
  const [editScoringMode, setEditScoringMode] = useState<"A" | "B">("A");
  const [editBonus, setEditBonus] = useState(false);
  const [editN, setEditN] = useState(0);
  const [editFull, setEditFull] = useState<number | null>(null);
  const [editManualValue, setEditManualValue] = useState(0);
  const [editClampNegative, setEditClampNegative] = useState(false);
  const [editParseFailed, setEditParseFailed] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── กรอกคะแนนเอง (Manual Override) — ยุบไว้เป็นค่าเริ่มต้น กันมือลั่น ──
  // มี selector หมวด/ข้อของตัวเอง แยกจากฟอร์มปกติด้านบน เพราะ manual override
  // อาจต้องใช้กับข้อไหนก็ได้ ไม่อยากไปรบกวนการเลือกของฟอร์มปกติที่เตรียมไว้
  const [rawExpanded, setRawExpanded] = useState(false);
  const [rawCategory, setRawCategory] = useState<Category | null>(null);
  const [rawQuestion, setRawQuestion] = useState<Question | null>(null);
  const [rawEntries, setRawEntries] = useState<Record<string, number>>({});

  const refreshEvents = useCallback(async () => {
    setEventsLoading(true);
    const data = await loadScoreEvents();
    setEvents(data);
    setEventsLoading(false);
  }, []);

  useEffect(() => {
    loadCategories().then((cats: Category[]) => {
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0]);
    });
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents, refreshVersion]);

  const emptyEntry = (): TeamEntry => ({
    bonus: false,
    n: 0,
  });

  // FIX D: เดิมโค้ดนี้รีเซ็ต teamEntries ทั้งหมดทุกครั้งที่ `teams` เปลี่ยน reference
  // (ซึ่งเกิดขึ้นทุกครั้งที่มี score/team event realtime เข้ามา เพราะ loadData()
  // คืน array ใหม่เสมอแม้เนื้อหาจะเหมือนเดิม) ทำให้ค่าที่แอดมินกำลังพิมพ์อยู่
  // หายรีเซ็ตเป็น 0 กลางคันโดยไม่ตั้งใจ ถ้ามีคนอื่นให้คะแนนเข้ามาพร้อมกัน
  //
  // แก้โดยใช้ functional update: เก็บค่าเดิมของทีมที่มีอยู่แล้วไว้ (อ้างอิงด้วย id)
  // เพิ่ม entry เริ่มต้นให้เฉพาะทีมใหม่ที่เพิ่งเข้ามา และตัดทีมที่ถูกลบออกไปแล้ว
  useEffect(() => {
    setTeamEntries((prev) => {
      const next: Record<string, TeamEntry> = {};
      teams.forEach((t) => {
        next[t.id] = prev[t.id] ?? emptyEntry();
      });
      return next;
    });
    // ใช้ pattern เดียวกับ FIX D กับ rawEntries ด้วย กันค่าที่กำลังกรอกหาย
    setRawEntries((prev) => {
      const next: Record<string, number> = {};
      teams.forEach((t) => {
        next[t.id] = prev[t.id] ?? 0;
      });
      return next;
    });
  }, [teams]);

  useEffect(() => {
    setSelectedQuestion(null);
    setScoreFull(null);
    // เปลี่ยนหมวด/ข้อ = ตั้งใจเริ่มกรอกใหม่จริงๆ รีเซ็ตทั้งหมดตามเดิม (ไม่เกี่ยวกับ FIX D)
    setTeamEntries(Object.fromEntries(teams.map((t) => [t.id, emptyEntry()])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  // Manual Override มี selector ของตัวเอง — reset rawEntries เมื่อเปลี่ยนหมวด/ข้อของมันเอง
  useEffect(() => {
    setRawQuestion(null);
    setRawEntries(Object.fromEntries(teams.map((t) => [t.id, 0])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawCategory]);

  useEffect(() => {
    setRawEntries(Object.fromEntries(teams.map((t) => [t.id, 0])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuestion]);

  const updateTeamBonus = (teamId: string, bonus: boolean) => {
    setTeamEntries((prev) => ({
      ...prev,
      [teamId]: { ...(prev[teamId] ?? emptyEntry()), bonus },
    }));
  };

  const updateTeamN = (teamId: string, n: number) => {
    setTeamEntries((prev) => ({
      ...prev,
      [teamId]: { ...(prev[teamId] ?? emptyEntry()), n },
    }));
  };

  // ── กติกาคำนวณคะแนน — สลับได้ 2 แบบ ──────────────────────────────────
  // A: มีการหักคะแนนส่วนตอบผิดแยกต่างหากในสูตร
  // B: กรอก N (%) ช่องเดียวเหมือนกติกา A — ระบบคิด "ผิด" = (100-N) ให้เองเสมอ
  //    แล้วคำนวณสุทธิ = N - (100-N) = 2N-100 จากนั้นคูณตัวคูณโบนัสกับสุทธิ
  //    ทั้งก้อนตรงๆ ไม่มีการหักซ้ำอีกชั้นแบบกติกา A
  const [scoringMode, setScoringMode] = useState<"A" | "B">("A");

  // ★ Feature flag: ยังไม่แน่ใจว่ากติกา B จะถูกใช้จริงไหม — เปิด/ปิดได้ทีเดียว
  // คุมทั้งฟอร์มเพิ่มคะแนนปกติและ Edit Modal พร้อมกัน จำค่าไว้ใน localStorage
  // (อยู่รอดข้าม refresh หน้า แต่ยังแก้ได้ง่ายๆ ผ่านปุ่มสวิตช์ ไม่ต้องแก้โค้ด)
  const [enableModeB, setEnableModeB] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("astroparty_enable_mode_b");
      if (saved != null) setEnableModeB(saved === "true");
    } catch {
      // ignore (เช่น localStorage ไม่พร้อมใช้งาน)
    }
  }, []);

  const toggleEnableModeB = () => {
    setEnableModeB((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("astroparty_enable_mode_b", String(next));
      } catch {
        // ignore
      }
      // ปิดกติกา B แล้ว ต้องบังคับกลับไป A ทันทีทั้งฟอร์มปกติและ edit modal
      // กันเหลือ state ค้างเป็น B ทั้งที่ UI ไม่มีให้เลือกแล้ว
      if (!next) {
        setScoringMode("A");
        setEditScoringMode("A");
      }
      return next;
    });
  };

  const computeScoreA = (bonus: boolean, n: number, full: number) => {
    const multiplier = bonus ? 2 : 1;
    const correctPortion = multiplier * (n / 100) * full;
    // ไม่มีโบนัส → ไม่หักคะแนนจากข้อที่ตอบผิด
    const incorrectPortion = bonus ? ((100 - n) / 100) * full : 0;
    return {
      correctPortion,
      incorrectPortion,
      finalScore: correctPortion - incorrectPortion, // ไม่ปัดเศษ
      net: undefined as number | undefined,
    };
  };

  const computeScoreB = (bonus: boolean, n: number, full: number) => {
    // ระบบคิด "ผิด" = (100-N) ให้เองเสมอ แล้วสุทธิ = N-(100-N) = 2N-100
    const net = n - (100 - n);
    const multiplier = bonus ? 2 : 1;
    const finalScore = multiplier * (net / 100) * full;
    return { correctPortion: finalScore, incorrectPortion: 0, finalScore, net };
  };

  // ★ standalone — รับ mode ตรงๆ เป็นพารามิเตอร์ ไม่ผูกกับ scoringMode ของฟอร์มหลัก
  // ใช้ร่วมกันได้ทั้งฟอร์มเพิ่มคะแนนปกติ และ Edit Modal (ที่มี mode ของตัวเอง)
  const computeScoreByMode = (
    mode: "A" | "B",
    bonus: boolean,
    n: number,
    full: number,
  ) =>
    mode === "A"
      ? computeScoreA(bonus, n, full)
      : computeScoreB(bonus, n, full);

  const buildNoteA = (
    bonus: boolean,
    n: number,
    full: number,
    final: number,
  ) =>
    bonus
      ? `โบนัส x2 · ตอบถูก ${n}% · เต็ม ${full} → 2×(${n}/100)×${full} − (100−${n})/100×${full} = ${final.toFixed(2)}`
      : `ไม่มีโบนัส · ตอบถูก ${n}% · เต็ม ${full} → (${n}/100)×${full} = ${final.toFixed(2)} (ไม่หักข้อผิด)`;

  const buildNoteB = (
    bonus: boolean,
    n: number,
    full: number,
    final: number,
  ) => {
    const wrong = 100 - n;
    const net = n - wrong;
    return bonus
      ? `กติกา B (สุทธิ×โบนัส) · ถูก ${n}% − ผิด ${wrong}% = สุทธิ ${net}% · เต็ม ${full} → 2×(${net}/100)×${full} = ${final.toFixed(2)}`
      : `กติกา B (สุทธิ) · ถูก ${n}% − ผิด ${wrong}% = สุทธิ ${net}% · เต็ม ${full} → (${net}/100)×${full} = ${final.toFixed(2)}`;
  };

  // ★ standalone — คู่กับ computeScoreByMode
  const buildNoteByMode = (
    mode: "A" | "B",
    bonus: boolean,
    n: number,
    full: number,
    final: number,
  ) =>
    mode === "A"
      ? buildNoteA(bonus, n, full, final)
      : buildNoteB(bonus, n, full, final);

  // ★ ติด tag ⚠ ติดลบถูกปรับเป็น 0 — ใช้ร่วมกันได้ทั้งฟอร์มหลักและ Edit Modal
  const tagClampIfNeeded = (
    baseNote: string,
    wasClamped: boolean,
    rawFinalScore: number,
  ) =>
    wasClamped
      ? `${baseNote} · ⚠ ติดลบ (${fmtScore(rawFinalScore)}) ถูกปรับเป็น 0 ตามกติกาที่ตั้งไว้`
      : baseNote;

  // dispatcher ของฟอร์มหลัก — ผูกกับ scoringMode ที่เลือกไว้บนฟอร์ม
  const computeScoreForEntry = (entry: TeamEntry, full: number) =>
    computeScoreByMode(scoringMode, entry.bonus, entry.n, full);

  // ── ตัวเลือก: ไม่นับคะแนนติดลบ (clamp เป็น 0) — ใช้ได้ทั้งกติกา A และ B ──
  // default = false (อนุญาตติดลบ เหมือนพฤติกรรมเดิม) ต้องติ๊กเองถ้าอยาก clamp
  const [clampNegative, setClampNegative] = useState(false);

  // wrapper ที่ห่อ computeScoreForEntry แล้ว clamp ให้ถ้าติ๊กไว้
  // คืนทั้งค่า raw (ก่อน clamp) และค่าจริงที่จะถูกบันทึก เพื่อใช้ tag ใน note ได้
  const computeScoreClamped = (entry: TeamEntry, full: number) => {
    const raw = computeScoreForEntry(entry, full);
    const wasClamped = clampNegative && raw.finalScore < 0;
    const finalScore = wasClamped ? 0 : raw.finalScore;
    return { ...raw, rawFinalScore: raw.finalScore, finalScore, wasClamped };
  };

  const canSubmit =
    selectedCategory &&
    selectedQuestion &&
    scoreFull != null &&
    teams.length > 0 &&
    teams.every((t) => teamEntries[t.id] !== undefined);

  const buildNoteForEntry = (
    entry: TeamEntry,
    full: number,
    final: number,
    wasClamped?: boolean,
    rawFinalScore?: number,
  ) => {
    const base = buildNoteByMode(
      scoringMode,
      entry.bonus,
      entry.n,
      full,
      final,
    );
    return wasClamped ? tagClampIfNeeded(base, true, rawFinalScore!) : base;
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const results = teams.map((team) => {
      const entry = teamEntries[team.id];
      const { finalScore, wasClamped, rawFinalScore } = computeScoreClamped(
        entry,
        scoreFull!,
      );
      const note = buildNoteForEntry(
        entry,
        scoreFull!,
        finalScore,
        wasClamped,
        rawFinalScore,
      );
      return {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
        finalScore,
        note,
      };
    });

    setPendingSave({
      kind: "normal",
      categoryId: selectedCategory!.id,
      categoryName: selectedCategory!.name,
      questionId: selectedQuestion!.id,
      questionNumber: selectedQuestion!.number,
      rows: results,
    });
  };

  const confirmPendingSave = async () => {
    if (!pendingSave) return;
    setSubmitting(true);
    try {
      await Promise.all(
        pendingSave.rows.map(({ teamId, finalScore, note }) =>
          addScoreEvent(
            teamId,
            pendingSave.categoryId,
            pendingSave.questionId,
            finalScore,
            note,
          ),
        ),
      );

      const summary = pendingSave.rows
        .map(
          ({ teamName, finalScore }) =>
            `${teamName} (${finalScore > 0 ? "+" : ""}${fmtScore(finalScore)})`,
        )
        .join(", ");
      setLastSaved(
        `${pendingSave.categoryName} ข้อ ${pendingSave.questionNumber} • ${summary}`,
      );

      if (pendingSave.kind === "normal") {
        setSelectedQuestion(null);
        setScoreFull(null);
        setTeamEntries(
          Object.fromEntries(teams.map((t) => [t.id, emptyEntry()])),
        );
      } else {
        setRawEntries(Object.fromEntries(teams.map((t) => [t.id, 0])));
        setRawExpanded(false);
      }

      await refreshEvents();
      onRefreshScores();
      setPendingSave(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (event: ScoreEvent) => {
    const label = `${event.team_name} • ${event.category_name} ข้อ ${event.question_number} • ${event.delta > 0 ? "+" : ""}${fmtScore(event.delta)}`;
    if (!confirm(`ยืนยันการลบ / Undo?\n${label}`)) return;
    setDeletingId(event.id);
    try {
      await deleteScoreEvent(event.id);
      await refreshEvents();
      onRefreshScores();
    } finally {
      setDeletingId(null);
    }
  };

  // ── แก้ไขคะแนนที่บันทึกไปแล้ว — เปิด modal ใช้เครื่องคำนวณเดิม ──────────
  // อ่านค่าจาก note เดิม รองรับทั้งรูปแบบกติกา A ("ตอบถูก N% ... เต็ม F")
  // และกติกา B ("ถูก N% − ผิด ... เต็ม F") — คืน mode มาด้วยเพื่อ pre-select ให้ถูก
  const parseNoteForEdit = (note: string | null) => {
    if (!note) return null;
    const isModeB = note.includes("กติกา B");
    const pattern = isModeB
      ? /ถูก\s+(-?\d+(?:\.\d+)?)%.*?เต็ม\s+(-?\d+(?:\.\d+)?)/
      : /ตอบถูก\s+(-?\d+(?:\.\d+)?)%\s*·\s*เต็ม\s+(-?\d+(?:\.\d+)?)/;
    const m = note.match(pattern);
    if (!m) return null;
    return {
      mode: (isModeB ? "B" : "A") as "A" | "B",
      n: Number(m[1]),
      full: Number(m[2]),
      bonus: isModeB
        ? note.includes("สุทธิ×โบนัส")
        : note.trim().startsWith("โบนัส"),
    };
  };

  // ติด tag ว่าแก้ไขแล้วต่อท้ายหมายเหตุเสมอ เพื่อให้เห็นใน log ว่ารายการนี้เคยถูกแก้
  const tagEdited = (note: string) => {
    const time = new Date().toLocaleString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
    return `${note} · ✎ แก้ไขล่าสุดเมื่อ ${time}`;
  };

  const openEditModal = (event: ScoreEvent) => {
    const parsed = parseNoteForEdit(event.note);
    if (parsed) {
      setEditMode("formula");
      // ถ้าปิดกติกา B ไว้อยู่ แม้ record เดิมจะเคยใช้ B มาก่อน ก็บังคับกลับเป็น A
      // เพื่อไม่ให้มี state B ซ่อนอยู่ทั้งที่ UI ไม่มีให้เลือกแล้ว
      setEditScoringMode(enableModeB ? parsed.mode : "A");
      setEditBonus(parsed.bonus);
      setEditN(parsed.n);
      setEditFull(parsed.full);
      setEditParseFailed(false);
    } else {
      // อ่านค่าจากบันทึกเดิมไม่ได้ (เช่นเป็นรายการที่กรอกแบบ manual override มาก่อน)
      // เริ่มที่โหมดกรอกเองเลย เพราะไม่มีสูตรให้ recalculate
      setEditMode("manual");
      setEditScoringMode("A");
      setEditBonus(false);
      setEditN(0);
      setEditFull(Math.abs(event.delta) || null);
      setEditParseFailed(true);
    }
    setEditManualValue(event.delta);
    setEditClampNegative(false);
    setEditingEvent(event);
  };

  const closeEditModal = () => {
    setEditingEvent(null);
    setEditParseFailed(false);
  };

  const handleEditSave = async () => {
    if (!editingEvent) return;
    if (editMode === "formula" && editFull == null) return;

    const rawFinalScore =
      editMode === "formula"
        ? computeScoreByMode(editScoringMode, editBonus, editN, editFull!)
            .finalScore
        : editManualValue;

    const wasClamped = editClampNegative && rawFinalScore < 0;
    const finalScore = wasClamped ? 0 : rawFinalScore;

    const baseNote =
      editMode === "formula"
        ? buildNoteByMode(
            editScoringMode,
            editBonus,
            editN,
            editFull!,
            finalScore,
          )
        : "กรอกคะแนนเองโดยตรง (Manual Override — ไม่ผ่านสูตรคำนวณ)";

    // FIX: ติด tag ว่าแก้ไขแล้วเสมอ + tag clamp ถ้ามี ให้เห็นใน log ว่ารายการนี้เคยถูกปรับ
    const newNote = tagEdited(
      tagClampIfNeeded(baseNote, wasClamped, rawFinalScore),
    );

    const confirmMessage = [
      `ยืนยันการแก้ไขคะแนน?`,
      ``,
      `ทีม: ${editingEvent.team_name}`,
      `หมวด: ${editingEvent.category_name} · ข้อ ${editingEvent.question_number}`,
      ``,
      `ค่าเดิม: ${editingEvent.delta > 0 ? "+" : ""}${fmtScore(editingEvent.delta)}`,
      `ค่าใหม่: ${finalScore > 0 ? "+" : ""}${fmtScore(finalScore)}`,
    ].join("\n");

    if (!confirm(confirmMessage)) return;

    setEditSubmitting(true);
    try {
      // FIX: แก้ไขคือแก้ไขจริง (UPDATE record เดิม) ไม่ใช่ลบแล้วสร้างใหม่
      // — id, created_at ของ record เดิมยังอยู่เหมือนเดิม
      await updateScoreEvent(editingEvent.id, finalScore, newNote);
      await refreshEvents();
      onRefreshScores();
      closeEditModal();
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── กรอกคะแนนเอง (Manual Override) — ไม่ผ่านสูตรคำนวณ ────────────────
  const updateRawEntry = (teamId: string, value: number) => {
    setRawEntries((prev) => ({ ...prev, [teamId]: value }));
  };

  const canSubmitRaw = !!rawCategory && !!rawQuestion && teams.length > 0;

  const handleRawSubmit = () => {
    if (!canSubmitRaw) return;

    const note = "กรอกคะแนนเองโดยตรง (Manual Override — ไม่ผ่านสูตรคำนวณ)";

    const rows: PendingSaveRow[] = teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      finalScore: rawEntries[team.id] ?? 0,
      note,
    }));

    setPendingSave({
      kind: "raw",
      categoryId: rawCategory!.id,
      categoryName: rawCategory!.name,
      questionId: rawQuestion!.id,
      questionNumber: rawQuestion!.number,
      rows,
    });
  };

  // ── Filters สำหรับ Score Event Log ──────────────────────────────────
  const toggleFilterTeam = (teamId: string) => {
    setFilterTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const filterCategory =
    categories.find((c) => c.id === filterCategoryId) ?? null;

  const filteredEvents = events.filter((e) => {
    if (filterTeamIds.size > 0 && !filterTeamIds.has(e.team_id)) return false;
    if (filterCategory && e.category_name !== filterCategory.name) return false;
    if (
      filterQuestionNumber != null &&
      e.question_number !== filterQuestionNumber
    )
      return false;
    return true;
  });

  const clearFilters = () => {
    setFilterTeamIds(new Set());
    setFilterCategoryId(null);
    setFilterQuestionNumber(null);
  };

  const hasActiveFilters =
    filterTeamIds.size > 0 ||
    filterCategoryId != null ||
    filterQuestionNumber != null;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="space-y-8">
      {/* ── Entry Form ── */}
      <section id="score-entry" className="scroll-mt-6">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: ORANGE }} />
              เพิ่มคะแนน
            </h1>
          </div>
          {lastSaved && (
            <div
              className="text-[10px] px-2.5 py-1 rounded-md max-w-md truncate"
              title={lastSaved}
              style={{
                color: "#1a7a4c",
                background: "rgba(26,122,76,0.06)",
                border: "1px solid rgba(26,122,76,0.15)",
              }}
            >
              ✓ {lastSaved}
            </div>
          )}
        </div>

        <div className="border border-black/[0.07] rounded-xl p-6 space-y-6">
          <div className="flex gap-6 flex-wrap">
            {/* ① หมวด */}
            <div className="space-y-2 w-40">
              <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                ① เลือกหมวด
              </label>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const active = selectedCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full text-left px-3 py-2 text-[12px] font-medium rounded-lg border transition-all"
                      style={{
                        background: active
                          ? "rgba(237,130,64,0.10)"
                          : "transparent",
                        borderColor: active
                          ? "rgba(237,130,64,0.3)"
                          : "rgba(0,0,0,0.08)",
                        color: active ? ORANGE : "rgba(0,0,0,0.55)",
                      }}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-px bg-black/[0.06]" />

            {/* ② เลือกข้อ — เรียงลงบรรทัดใหม่ทีละข้อ */}
            <div className="space-y-2 w-32">
              <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                ② เลือกข้อ
              </label>
              <div className="flex flex-col gap-1">
                {(selectedCategory?.questions ?? [])
                  .sort((a, b) => a.number - b.number)
                  .map((q) => {
                    const active = selectedQuestion?.id === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setSelectedQuestion(q)}
                        className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-medium border transition-all"
                        style={{
                          background: active
                            ? "rgba(237,130,64,0.10)"
                            : "transparent",
                          borderColor: active
                            ? "rgba(237,130,64,0.3)"
                            : "rgba(0,0,0,0.08)",
                          color: active ? ORANGE : "rgba(0,0,0,0.5)",
                        }}
                      >
                        ข้อ {q.number}
                      </button>
                    );
                  })}
              </div>
              {!selectedCategory && (
                <p className="text-[10px] text-black/30 italic">
                  เลือกหมวดก่อน
                </p>
              )}
            </div>

            <div className="w-px bg-black/[0.06]" />

            {/* ③ คะแนนเต็มของข้อ */}
            <div className="space-y-2 w-36">
              <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                ③ คะแนนเต็มข้อนี้
              </label>
              <input
                type="number"
                placeholder="เช่น 100"
                value={scoreFull ?? ""}
                onChange={(e) =>
                  setScoreFull(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none border border-black/[0.08] focus:border-black/20 placeholder:text-black/25"
              />
            </div>
          </div>

          {/* ── สลับกติกาคำนวณคะแนน + สวิตช์เปิด/ปิดกติกา B ── */}
          {enableModeB && scoringMode === "B" && (
            <p className="text-[11px] text-black/40 bg-black/[0.02] rounded-md px-3 py-2">
              กติกา B: กรอก N (%) ช่องเดียวเหมือนกติกา A เช่น N=40 ระบบจะคิด
              &quot;ผิด&quot; = 100−40 = 60% ให้เอง แล้วคำนวณสุทธิ = 40−60 =
              −20% จากนั้นคูณด้วยตัวคูณโบนัสกับผลสุทธิทั้งก้อนตรงๆ
              (ไม่มีการหักซ้ำอีกชั้น) — กรอกติดลบหรือเกิน 100 ได้
            </p>
          )}

          {/* ── ตัวเลือก: ไม่นับคะแนนติดลบ (clamp เป็น 0) — ใช้ได้ทั้งกติกา A/B ── */}
          <button
            onClick={() => setClampNegative((v) => !v)}
            className="flex items-center gap-2 text-xs w-fit"
          >
            <span
              className="w-4 h-4 rounded-[4px] border-2 inline-flex items-center justify-center shrink-0"
              style={{
                borderColor: clampNegative ? "#f59e0b" : "rgba(0,0,0,0.2)",
                background: clampNegative ? "#f59e0b" : "transparent",
              }}
            >
              {clampNegative && (
                <span className="text-white text-[9px] leading-none">✓</span>
              )}
            </span>
            <span className="text-black/60">
              ข้อนี้ไม่นับคะแนนติดลบ — ถ้าคำนวณแล้วติดลบให้เป็น 0 แทน
            </span>
          </button>

          {/* ④ ตารางทีม — ทุกทีมกรอกได้เลย ไม่ต้องติ๊กเลือก */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
              {scoringMode === "A"
                ? "④ โบนัส / ตอบถูก (N%) ต่อทีม — ถ้าทีมไม่ตอบให้กรอก 0"
                : '④ โบนัส / N (%) ต่อทีม — ระบบคิด "ผิด" = 100−N และลบสุทธิให้อัตโนมัติ'}
            </label>
            <div className="border border-black/[0.07] rounded-lg overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-black/30 border-b border-black/[0.06] bg-black/[0.015]">
                    <th className="text-left py-2 pl-4 pr-2 font-medium">
                      ทีม
                    </th>
                    <th className="text-center py-2 pr-2 font-medium w-20">
                      โบนัส x2
                    </th>
                    <th className="text-center py-2 pr-2 font-medium w-24">
                      N (%)
                    </th>
                    <th className="text-left py-2 pr-2 font-medium">
                      สูตรคำนวณ
                    </th>
                    <th className="text-right py-2 pr-4 font-medium w-24">
                      คะแนนได้
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {teams.map((team) => {
                    const entry = teamEntries[team.id] ?? emptyEntry();
                    const valid = scoreFull != null;
                    const {
                      correctPortion,
                      incorrectPortion,
                      finalScore,
                      wasClamped,
                      net,
                    } = valid
                      ? computeScoreClamped(entry, scoreFull!)
                      : {
                          correctPortion: 0,
                          incorrectPortion: 0,
                          finalScore: 0,
                          wasClamped: false,
                          net: 0,
                        };
                    const multiplier = entry.bonus ? 2 : 1;

                    return (
                      <tr
                        key={team.id}
                        className="border-b border-black/[0.04] last:border-0"
                      >
                        <td className="py-2 pl-4 pr-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: team.color }}
                            />
                            <span
                              className="font-medium"
                              style={{ color: team.color }}
                            >
                              {team.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-center">
                          <button
                            onClick={() =>
                              updateTeamBonus(team.id, !entry.bonus)
                            }
                            className="w-4 h-4 rounded-[4px] border-2 inline-flex items-center justify-center"
                            style={{
                              borderColor: entry.bonus
                                ? ORANGE
                                : "rgba(0,0,0,0.2)",
                              background: entry.bonus ? ORANGE : "transparent",
                            }}
                          >
                            {entry.bonus && (
                              <span className="text-white text-[9px] leading-none">
                                ✓
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            placeholder="0"
                            value={entry.n}
                            onChange={(e) =>
                              updateTeamN(
                                team.id,
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value),
                              )
                            }
                            onWheel={(e) => e.currentTarget.blur()}
                            className="w-full rounded-md px-2 py-1 text-xs outline-none border border-black/[0.08] focus:border-black/20"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <div
                            className="rounded-md px-2.5 py-1.5 text-[10.5px] leading-snug"
                            style={{
                              background: "rgba(147,51,234,0.04)",
                              border: "1px solid rgba(147,51,234,0.15)",
                              color: "rgba(88,28,135,0.75)",
                            }}
                          >
                            {scoringMode === "A" ? (
                              entry.bonus ? (
                                <>
                                  {multiplier}×({entry.n}/100)×
                                  {scoreFull ?? "score"} − (100−{entry.n})/100×
                                  {scoreFull ?? "score"}
                                  <br />={" "}
                                  {valid
                                    ? correctPortion.toFixed(1)
                                    : "—"} −{" "}
                                  {valid ? incorrectPortion.toFixed(1) : "—"}
                                </>
                              ) : (
                                <>
                                  ({entry.n}/100)×{scoreFull ?? "score"}{" "}
                                  (ไม่หักข้อผิด)
                                  <br />={" "}
                                  {valid ? correctPortion.toFixed(1) : "—"}
                                </>
                              )
                            ) : (
                              <>
                                ถูก {entry.n}% − ผิด {100 - entry.n}% = สุทธิ{" "}
                                {net}%
                                <br />
                                {multiplier}×({net}/100)×{scoreFull ?? "score"}
                                <br />= {valid ? finalScore.toFixed(1) : "—"}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-right">
                          <span
                            className="font-medium tabular-nums"
                            style={{
                              color: valid
                                ? finalScore >= 0
                                  ? "#1a7a4c"
                                  : NEGATIVE
                                : "rgba(0,0,0,0.2)",
                            }}
                          >
                            {valid
                              ? (finalScore > 0 ? "+" : "") +
                                fmtScore(finalScore)
                              : "—"}
                          </span>
                          {wasClamped && (
                            <div
                              className="text-[9px] mt-0.5"
                              style={{ color: "#f59e0b" }}
                              title="คะแนนติดลบถูกปรับเป็น 0 ตามที่ติ๊กไว้"
                            >
                              ⚠ ปรับจากติดลบ
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-3 rounded-lg font-medium text-sm transition-all disabled:cursor-not-allowed"
            style={{
              background:
                canSubmit && !submitting ? "#1a7a4c" : "rgba(0,0,0,0.06)",
              color: canSubmit && !submitting ? "#fff" : "rgba(0,0,0,0.3)",
            }}
          >
            {submitting
              ? "กำลังบันทึก..."
              : `✓ บันทึกทุกทีม (${teams.length} ทีม)`}
          </button>

          {/* ── กรอกคะแนนเอง (Manual Override) — ยุบไว้เป็นค่าเริ่มต้น กันมือลั่น ── */}
          <div className="border border-black/[0.08] rounded-lg overflow-hidden">
            <button
              onClick={() => setRawExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
            >
              <span className="flex items-center gap-2 text-xs font-medium text-black/60">
                {rawExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                กรอกคะแนนเอง (ไม่ผ่านสูตรคำนวณ)
              </span>
              <span className="text-[10px] text-black/30 uppercase tracking-wider">
                Manual Override
              </span>
            </button>

            {rawExpanded && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-black/[0.06]">
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  ⚠ โหมดนี้บันทึกคะแนนตามตัวเลขที่กรอกโดยตรง ไม่ผ่านสูตร
                  โบนัส/N% ใดๆ ทั้งสิ้น ใช้เมื่อกติกาต้องเปลี่ยนกะทันหันหน้างาน
                  — เลือกหมวด/ข้อของตัวเองด้านล่าง แยกจากฟอร์มปกติด้านบน
                </p>

                {/* selector หมวด/ข้อของตัวเอง — แยกจากฟอร์มปกติโดยเจตนา */}
                <div className="flex gap-4 flex-wrap">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                      หมวด
                    </label>
                    <select
                      value={rawCategory?.id ?? ""}
                      onChange={(e) => {
                        const cat =
                          categories.find(
                            (c) => c.id === Number(e.target.value),
                          ) ?? null;
                        setRawCategory(cat);
                      }}
                      className="rounded-lg px-3 py-1.5 text-[12px] outline-none border border-black/[0.08] focus:border-black/20 min-w-36"
                    >
                      <option value="">— เลือกหมวด —</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                      ข้อ
                    </label>
                    <select
                      value={rawQuestion?.id ?? ""}
                      onChange={(e) => {
                        const q =
                          rawCategory?.questions.find(
                            (qq) => qq.id === Number(e.target.value),
                          ) ?? null;
                        setRawQuestion(q ?? null);
                      }}
                      disabled={!rawCategory}
                      className="rounded-lg px-3 py-1.5 text-[12px] outline-none border border-black/[0.08] focus:border-black/20 min-w-28 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">— เลือกข้อ —</option>
                      {(rawCategory?.questions ?? [])
                        .sort((a, b) => a.number - b.number)
                        .map((q) => (
                          <option key={q.id} value={q.id}>
                            ข้อ {q.number}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {!rawCategory || !rawQuestion ? (
                  <p className="text-[11px] text-black/30 italic">
                    เลือกหมวดและข้อก่อน
                  </p>
                ) : (
                  <>
                    <div className="border border-black/[0.07] rounded-lg overflow-hidden">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.12em] text-black/30 border-b border-black/[0.06] bg-black/[0.015]">
                            <th className="text-left py-2 pl-4 pr-2 font-medium">
                              ทีม
                            </th>
                            <th className="text-right py-2 pr-4 font-medium w-32">
                              คะแนน (กรอกตรง)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {teams.map((team) => (
                            <tr
                              key={team.id}
                              className="border-b border-black/[0.04] last:border-0"
                            >
                              <td className="py-2 pl-4 pr-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: team.color }}
                                  />
                                  <span
                                    className="font-medium"
                                    style={{ color: team.color }}
                                  >
                                    {team.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 pr-4">
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={rawEntries[team.id] ?? 0}
                                  onChange={(e) =>
                                    updateRawEntry(
                                      team.id,
                                      e.target.value === ""
                                        ? 0
                                        : Number(e.target.value),
                                    )
                                  }
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className="w-full rounded-md px-2 py-1.5 text-xs text-right outline-none border border-black/[0.08] focus:border-black/20"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleRawSubmit}
                      disabled={!canSubmitRaw}
                      className="w-full py-2.5 rounded-lg font-medium text-xs transition-all disabled:cursor-not-allowed"
                      style={{
                        background: canSubmitRaw
                          ? "#7c3aed"
                          : "rgba(0,0,0,0.06)",
                        color: canSubmitRaw ? "#fff" : "rgba(0,0,0,0.3)",
                      }}
                    >
                      ⚠ บันทึกคะแนนเอง (Manual Override)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {enableModeB ? (
            <>
              <div className="flex gap-1.5 p-1 bg-black/[0.04] rounded-lg max-w-sm">
                <button
                  onClick={() => setScoringMode("A")}
                  className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: scoringMode === "A" ? "#fff" : "transparent",
                    color: scoringMode === "A" ? "#000" : "rgba(0,0,0,0.4)",
                    boxShadow:
                      scoringMode === "A"
                        ? "0 1px 2px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  กติกา A · % ตอบถูก
                </button>
                {/* <button
                  onClick={() => setScoringMode("B")}
                  className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: scoringMode === "B" ? "#fff" : "transparent",
                    color: scoringMode === "B" ? "#000" : "rgba(0,0,0,0.4)",
                    boxShadow:
                      scoringMode === "B"
                        ? "0 1px 2px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  กติกา B · % สุทธิ
                </button> */}
              </div>
              <button
                onClick={toggleEnableModeB}
                className="text-[10px] text-black/30 hover:text-red-500 underline whitespace-nowrap"
                title="ซ่อนกติกา B ทั้งฟอร์มเพิ่มคะแนนและ Edit Modal"
              >
                {/* <div className="text-red-700 text-9xl">กดทำไม</div> */}
                ปิดกติกา B
              </button>
            </>
          ) : (
            <button
              onClick={toggleEnableModeB}
              className="text-[11px] text-black/35 hover:text-black/60 underline"
              // disabled
            >
              {/* + เปิดใช้กติกา B (ทดลอง) */}
              ห้ามกดปุ่มนี้
            </button>
          )}
        </div>
      </section>

      {/* ── Event Log ── */}
      <section id="event-log" className="scroll-mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: ORANGE }} />
              Score Event Log
            </h1>
            <p className="text-black/35 text-sm mt-0.5">
              กดลบเพื่อ Undo · กดดินสอเพื่อแก้ไข
            </p>
          </div>
          <button
            onClick={refreshEvents}
            disabled={eventsLoading}
            className="text-black/30 hover:text-black/60 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${eventsLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* ── Filter toolbar ── */}
        <div className="border border-black/[0.07] rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block mb-1.5">
              ทีม (เลือกได้หลายทีม — realtime ตามรายชื่อทีมปัจจุบัน)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {teams.map((team) => {
                const active = filterTeamIds.has(team.id);
                return (
                  <button
                    key={team.id}
                    onClick={() => toggleFilterTeam(team.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all"
                    style={{
                      background: active ? `${team.color}1A` : "transparent",
                      borderColor: active ? team.color : "rgba(0,0,0,0.1)",
                      color: active ? team.color : "rgba(0,0,0,0.4)",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                  </button>
                );
              })}
              {teams.length === 0 && (
                <span className="text-[11px] text-black/25 italic">
                  ยังไม่มีทีม
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                หมวด
              </label>
              <select
                value={filterCategoryId ?? ""}
                onChange={(e) => {
                  setFilterCategoryId(
                    e.target.value === "" ? null : Number(e.target.value),
                  );
                  setFilterQuestionNumber(null);
                }}
                className="rounded-lg px-3 py-1.5 text-[12px] outline-none border border-black/[0.08] focus:border-black/20 min-w-36"
              >
                <option value="">ทุกหมวด</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                ข้อ
              </label>
              <select
                value={filterQuestionNumber ?? ""}
                onChange={(e) =>
                  setFilterQuestionNumber(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                disabled={!filterCategory}
                className="rounded-lg px-3 py-1.5 text-[12px] outline-none border border-black/[0.08] focus:border-black/20 min-w-28 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">ทุกข้อ</option>
                {(filterCategory?.questions ?? [])
                  .sort((a, b) => a.number - b.number)
                  .map((q) => (
                    <option key={q.id} value={q.number}>
                      ข้อ {q.number}
                    </option>
                  ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="self-end text-[11px] text-black/40 hover:text-red-500 transition-colors underline"
              >
                ล้าง filter ทั้งหมด
              </button>
            )}
          </div>
        </div>

        {filteredEvents.length === 0 && !eventsLoading ? (
          <div className="h-24 flex items-center justify-center border border-dashed border-black/[0.08] rounded-xl text-black/25 text-xs italic">
            {hasActiveFilters ? "ไม่มีรายการตรงตาม filter" : "ยังไม่มีรายการ"}
          </div>
        ) : (
          <div className="border border-black/[0.07] rounded-xl overflow-hidden">
            {/* ── scroll แนวตั้งถ้ารายการยาวเกิน แทนที่จะยืดไม่จำกัด ── */}
            <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-[10px] uppercase tracking-[0.15em] text-black/25 border-b border-black/[0.06]">
                    <th className="text-left py-3 pl-5 pr-3 font-medium">
                      เวลา
                    </th>
                    <th className="text-left py-3 pr-3 font-medium">ทีม</th>
                    <th className="text-left py-3 pr-3 font-medium">หมวด</th>
                    <th className="text-left py-3 pr-3 font-medium">ข้อ</th>
                    <th className="text-left py-3 pr-3 font-medium">
                      หมายเหตุ
                    </th>
                    <th className="text-right py-3 pr-3 font-medium">คะแนน</th>
                    <th className="py-3 pr-5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      className={`border-b border-black/[0.04] last:border-0 transition-opacity ${
                        deletingId === event.id
                          ? "opacity-30"
                          : "hover:bg-black/[0.015]"
                      }`}
                    >
                      <td className="py-3 pl-5 pr-3 text-black/35 tabular-nums">
                        {formatTime(event.created_at)}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: event.team_color }}
                          />
                          <span
                            className="font-medium"
                            style={{ color: event.team_color }}
                          >
                            {event.team_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-black/55">
                        {event.category_name}
                      </td>
                      <td className="py-3 pr-3 text-black/55">
                        ข้อ {event.question_number}
                      </td>
                      <td
                        className="py-3 pr-3 text-black/30 italic max-w-[240px]"
                        title={event.note ?? ""}
                      >
                        {event.note ?? "—"}
                      </td>
                      <td
                        className="py-3 pr-3 text-right font-medium tabular-nums"
                        style={{
                          color: event.delta > 0 ? "#1a7a4c" : NEGATIVE,
                        }}
                      >
                        {event.delta > 0
                          ? `+${fmtScore(event.delta)}`
                          : fmtScore(event.delta)}
                      </td>
                      <td className="py-3 pr-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(event)}
                            className="text-black/25 hover:text-blue-500 transition-colors"
                            title="แก้ไขคะแนนนี้"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(event)}
                            disabled={deletingId !== null}
                            className="text-black/25 hover:text-red-500 transition-colors disabled:cursor-not-allowed"
                            title="Undo / ลบรายการนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {filteredEvents.length > 0 && (
          <p className="text-[10px] text-black/25 text-right mt-2">
            {hasActiveFilters
              ? `${filteredEvents.length} / ${events.length} รายการ (กรองอยู่)`
              : `${filteredEvents.length} รายการล่าสุด`}
          </p>
        )}
      </section>

      {/* ── Edit Modal ── */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEditModal}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-medium">แก้ไขคะแนน</h3>
              <button
                onClick={closeEditModal}
                className="text-black/30 hover:text-black/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── ข้อมูลที่เคยถูกบันทึกไว้ (raw data ตรงตามที่อยู่ใน DB) ── */}
            <div className="border border-black/[0.08] rounded-lg overflow-hidden">
              <div className="px-3.5 py-2 bg-black/[0.02] border-b border-black/[0.06] text-[10px] uppercase tracking-[0.15em] text-black/35 font-medium">
                ข้อมูลที่บันทึกไว้เดิม
              </div>
              <table className="w-full text-[12px]">
                <tbody>
                  <tr className="border-b border-black/[0.04]">
                    <td className="py-2 pl-3.5 pr-2 text-black/35 w-28">ทีม</td>
                    <td className="py-2 pr-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: editingEvent.team_color }}
                        />
                        <span
                          className="font-medium"
                          style={{ color: editingEvent.team_color }}
                        >
                          {editingEvent.team_name}
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-b border-black/[0.04]">
                    <td className="py-2 pl-3.5 pr-2 text-black/35">
                      หมวด / ข้อ
                    </td>
                    <td className="py-2 pr-3.5 text-black/70">
                      {editingEvent.category_name} · ข้อ{" "}
                      {editingEvent.question_number}
                    </td>
                  </tr>
                  <tr className="border-b border-black/[0.04]">
                    <td className="py-2 pl-3.5 pr-2 text-black/35">
                      คะแนนที่บันทึก
                    </td>
                    <td className="py-2 pr-3.5">
                      <span
                        className="font-medium tabular-nums"
                        style={{
                          color: editingEvent.delta > 0 ? "#1a7a4c" : NEGATIVE,
                        }}
                      >
                        {editingEvent.delta > 0 ? "+" : ""}
                        {fmtScore(editingEvent.delta)}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-black/[0.04]">
                    <td className="py-2 pl-3.5 pr-2 text-black/35 align-top">
                      หมายเหตุ
                    </td>
                    <td className="py-2 pr-3.5 text-black/60">
                      {editingEvent.note ?? "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-black/[0.04]">
                    <td className="py-2 pl-3.5 pr-2 text-black/35">
                      เวลาที่บันทึก
                    </td>
                    <td className="py-2 pr-3.5 text-black/50 tabular-nums">
                      {formatTime(editingEvent.created_at)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pl-3.5 pr-2 text-black/35">
                      record id
                    </td>
                    <td className="py-2 pr-3.5 font-mono text-[10px] text-black/35">
                      {editingEvent.id}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {editParseFailed && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                ⚠ อ่านค่า N% / โบนัส จากบันทึกเดิมไม่ได้
                (อาจเป็นรายการที่กรอกแบบ manual override) เริ่มที่โหมด
                &quot;กรอกเอง&quot; ให้แล้ว
              </p>
            )}

            {/* ── สลับโหมด: คำนวณตามสูตร vs กรอกคะแนนเอง ── */}
            <div className="flex gap-1.5 p-1 bg-black/[0.04] rounded-lg">
              <button
                onClick={() => setEditMode("formula")}
                className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: editMode === "formula" ? "#fff" : "transparent",
                  color: editMode === "formula" ? "#000" : "rgba(0,0,0,0.4)",
                  boxShadow:
                    editMode === "formula"
                      ? "0 1px 2px rgba(0,0,0,0.08)"
                      : "none",
                }}
              >
                คำนวณตามสูตร
              </button>
              <button
                onClick={() => setEditMode("manual")}
                className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: editMode === "manual" ? "#fff" : "transparent",
                  color: editMode === "manual" ? "#7c3aed" : "rgba(0,0,0,0.4)",
                  boxShadow:
                    editMode === "manual"
                      ? "0 1px 2px rgba(0,0,0,0.08)"
                      : "none",
                }}
              >
                ⚠ กรอกเอง
              </button>
            </div>

            {editMode === "formula" ? (
              /* ── ค่าใหม่ที่จะบันทึก — เรียงลำดับและแสดงผลแบบเดียวกับฟอร์มเพิ่มคะแนน ── */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.15em] text-black/35 font-medium">
                    ค่าใหม่ที่จะบันทึกแทน
                  </div>
                  {/* ★ สลับกติกา A/B — แสดงเฉพาะตอนเปิดใช้กติกา B ไว้เท่านั้น */}
                  {enableModeB && (
                    <div className="flex gap-1 p-0.5 bg-black/[0.05] rounded-md">
                      <button
                        onClick={() => setEditScoringMode("A")}
                        className="px-2.5 py-1 rounded text-[10px] font-medium transition-all"
                        style={{
                          background:
                            editScoringMode === "A" ? "#fff" : "transparent",
                          color:
                            editScoringMode === "A"
                              ? "#000"
                              : "rgba(0,0,0,0.4)",
                          boxShadow:
                            editScoringMode === "A"
                              ? "0 1px 2px rgba(0,0,0,0.08)"
                              : "none",
                        }}
                      >
                        กติกา A
                      </button>
                      <button
                        onClick={() => setEditScoringMode("B")}
                        className="px-2.5 py-1 rounded text-[10px] font-medium transition-all"
                        style={{
                          background:
                            editScoringMode === "B" ? "#fff" : "transparent",
                          color:
                            editScoringMode === "B"
                              ? "#000"
                              : "rgba(0,0,0,0.4)",
                          boxShadow:
                            editScoringMode === "B"
                              ? "0 1px 2px rgba(0,0,0,0.08)"
                              : "none",
                        }}
                      >
                        กติกา B
                      </button>
                    </div>
                  )}
                </div>

                {/* ③ คะแนนเต็ม (ลำดับเดียวกับฟอร์มปกติ) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                    คะแนนเต็มของข้อนี้
                  </label>
                  <input
                    type="number"
                    value={editFull ?? ""}
                    onChange={(e) =>
                      setEditFull(
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full rounded-lg px-3 py-2 text-xs outline-none border border-black/[0.08] focus:border-black/20"
                  />
                </div>

                {/* ④ โบนัส + N% (ลำดับ/สไตล์เดียวกับคอลัมน์ในตารางฟอร์มปกติ) */}
                <div className="flex items-end gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                      โบนัส x2
                    </label>
                    <button
                      onClick={() => setEditBonus((v) => !v)}
                      className="w-9 h-9 rounded-lg border-2 inline-flex items-center justify-center"
                      style={{
                        borderColor: editBonus ? ORANGE : "rgba(0,0,0,0.15)",
                        background: editBonus ? ORANGE : "transparent",
                      }}
                    >
                      {editBonus && (
                        <span className="text-white text-xs leading-none">
                          ✓
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                      {editScoringMode === "A" ? "ตอบถูก N (%)" : "N (%)"}
                    </label>
                    <input
                      type="number"
                      value={editN}
                      onChange={(e) =>
                        setEditN(
                          e.target.value === "" ? 0 : Number(e.target.value),
                        )
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none border border-black/[0.08] focus:border-black/20"
                    />
                  </div>
                </div>

                {/* ★ ไม่นับคะแนนติดลบ — เหมือนฟอร์มเพิ่มคะแนนปกติ แต่แยกอิสระต่อการแก้ไขนี้ */}
                <button
                  onClick={() => setEditClampNegative((v) => !v)}
                  className="flex items-center gap-2 text-xs w-fit"
                >
                  <span
                    className="w-4 h-4 rounded-[4px] border-2 inline-flex items-center justify-center shrink-0"
                    style={{
                      borderColor: editClampNegative
                        ? "#f59e0b"
                        : "rgba(0,0,0,0.2)",
                      background: editClampNegative ? "#f59e0b" : "transparent",
                    }}
                  >
                    {editClampNegative && (
                      <span className="text-white text-[9px] leading-none">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="text-black/60">
                    ไม่นับคะแนนติดลบ — ถ้าคำนวณแล้วติดลบให้เป็น 0 แทน
                  </span>
                </button>

                {/* สูตรคำนวณ — สไตล์กล่องม่วงเดียวกับคอลัมน์ "สูตรคำนวณ" ในตารางปกติ */}
                {editFull != null && (
                  <div
                    className="rounded-md px-3 py-2 text-[11px] leading-snug"
                    style={{
                      background: "rgba(147,51,234,0.04)",
                      border: "1px solid rgba(147,51,234,0.15)",
                      color: "rgba(88,28,135,0.75)",
                    }}
                  >
                    {editScoringMode === "A" ? (
                      editBonus ? (
                        <>
                          2×({editN}/100)×{editFull} − (100−{editN})/100×
                          {editFull}
                          <br />={" "}
                          {computeScoreA(
                            editBonus,
                            editN,
                            editFull,
                          ).correctPortion.toFixed(1)}{" "}
                          −{" "}
                          {computeScoreA(
                            editBonus,
                            editN,
                            editFull,
                          ).incorrectPortion.toFixed(1)}
                        </>
                      ) : (
                        <>
                          ({editN}/100)×{editFull} (ไม่หักข้อผิด)
                          <br />={" "}
                          {computeScoreA(
                            editBonus,
                            editN,
                            editFull,
                          ).correctPortion.toFixed(1)}
                        </>
                      )
                    ) : (
                      <>
                        ถูก {editN}% − ผิด {100 - editN}% = สุทธิ{" "}
                        {computeScoreB(editBonus, editN, editFull).net}%
                        <br />
                        {editBonus ? 2 : 1}×(
                        {computeScoreB(editBonus, editN, editFull).net}/100)×
                        {editFull}
                        <br />={" "}
                        {computeScoreB(
                          editBonus,
                          editN,
                          editFull,
                        ).finalScore.toFixed(1)}
                      </>
                    )}
                  </div>
                )}

                {/* คะแนนที่ได้ — ตำแหน่งเดียวกับคอลัมน์ "คะแนนได้" ท้ายตารางปกติ */}
                {editFull != null &&
                  (() => {
                    const raw = computeScoreByMode(
                      editScoringMode,
                      editBonus,
                      editN,
                      editFull,
                    ).finalScore;
                    const wasClamped = editClampNegative && raw < 0;
                    const finalPreview = wasClamped ? 0 : raw;
                    return (
                      <div className="flex items-center justify-between rounded-md px-3 py-2.5 bg-black/[0.02]">
                        <span className="text-[11px] text-black/40">
                          คะแนนที่จะได้
                        </span>
                        <div className="text-right">
                          <span
                            className="font-medium tabular-nums text-sm"
                            style={{
                              color: finalPreview >= 0 ? "#1a7a4c" : NEGATIVE,
                            }}
                          >
                            {finalPreview > 0 ? "+" : ""}
                            {fmtScore(finalPreview)}
                          </span>
                          {wasClamped && (
                            <div
                              className="text-[9px]"
                              style={{ color: "#f59e0b" }}
                            >
                              ⚠ ปรับจากติดลบ ({fmtScore(raw)})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            ) : (
              /* ── โหมดกรอกคะแนนเอง — ไม่ผ่านสูตร กรอกค่าตรงเลย ── */
              <div className="space-y-3">
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  ⚠ โหมดนี้บันทึกคะแนนตามตัวเลขที่กรอกโดยตรง ไม่ผ่านสูตรคำนวณใดๆ
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
                    คะแนนใหม่ (กรอกตรง)
                  </label>
                  <input
                    type="number"
                    value={editManualValue}
                    onChange={(e) =>
                      setEditManualValue(
                        e.target.value === "" ? 0 : Number(e.target.value),
                      )
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none border border-black/[0.08] focus:border-black/20"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md px-3 py-2.5 bg-black/[0.02]">
                  <span className="text-[11px] text-black/40">
                    คะแนนที่จะได้
                  </span>
                  <span
                    className="font-medium tabular-nums text-sm"
                    style={{
                      color: editManualValue >= 0 ? "#1a7a4c" : NEGATIVE,
                    }}
                  >
                    {editManualValue > 0 ? "+" : ""}
                    {fmtScore(editManualValue)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={closeEditModal}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium border border-black/[0.1] text-black/50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEditSave}
                disabled={
                  (editMode === "formula" && editFull == null) || editSubmitting
                }
                className="flex-1 py-2.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                style={{
                  background: editMode === "manual" ? "#7c3aed" : "#1a7a4c",
                }}
              >
                {editSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Save Modal — ใช้ร่วมกันทั้งฟอร์มปกติและ Manual Override ── */}
      {pendingSave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !submitting && setPendingSave(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 py-4 border-b border-black/[0.06] flex items-start justify-between shrink-0"
              style={{
                background:
                  pendingSave.kind === "raw"
                    ? "rgba(124,58,237,0.04)"
                    : "rgba(26,122,76,0.04)",
              }}
            >
              <div>
                <h3 className="text-base font-medium">
                  {pendingSave.kind === "raw"
                    ? "⚠ ยืนยันบันทึกคะแนนแบบกรอกเอง"
                    : "ยืนยันการบันทึกลงฐานข้อมูล"}
                </h3>
                <p className="text-xs text-black/40 mt-0.5">
                  {pendingSave.categoryName} · ข้อ {pendingSave.questionNumber}{" "}
                  — จะสร้าง {pendingSave.rows.length} record ใน{" "}
                  <span className="font-mono">score_events</span>
                </p>
              </div>
              <button
                onClick={() => !submitting && setPendingSave(null)}
                className="text-black/30 hover:text-black/60 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-black/30 border-b border-black/[0.06]">
                    <th className="text-left py-2.5 pl-6 pr-3 font-medium">
                      ทีม
                    </th>
                    <th className="text-right py-2.5 pr-3 font-medium">
                      คะแนน
                    </th>
                    <th className="text-left py-2.5 pr-6 font-medium">
                      หมายเหตุ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSave.rows.map((row) => (
                    <tr
                      key={row.teamId}
                      className="border-b border-black/[0.04] last:border-0"
                    >
                      <td className="py-2.5 pl-6 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: row.teamColor }}
                          />
                          <span
                            className="font-medium"
                            style={{ color: row.teamColor }}
                          >
                            {row.teamName}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-black/25 mt-0.5">
                          team_id: {row.teamId}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <span
                          className="font-medium tabular-nums"
                          style={{
                            color: row.finalScore >= 0 ? "#1a7a4c" : NEGATIVE,
                          }}
                        >
                          {row.finalScore > 0 ? "+" : ""}
                          {fmtScore(row.finalScore)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-6 text-black/40 italic max-w-[220px]">
                        {row.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-2.5 font-mono text-[9px] text-black/25 border-t border-black/[0.04]">
                category_id: {pendingSave.categoryId} · question_id:{" "}
                {pendingSave.questionId}
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t border-black/[0.06] shrink-0">
              <button
                onClick={() => setPendingSave(null)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium border border-black/[0.1] text-black/50 disabled:opacity-40"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmPendingSave}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
                style={{
                  background:
                    pendingSave.kind === "raw" ? "#7c3aed" : "#1a7a4c",
                }}
              >
                {submitting ? "กำลังบันทึก..." : "✓ ยืนยันบันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Main AdminPanel
// ===========================================================================
export default function AdminPanel() {
  const [data, setData] = useState<RaceData>({
    teams: [],
    positions: [],
    state: { status: "idle", round: 1 },
  });
  
  useServerTimeSync();

  const [refreshVersion, setRefreshVersion] = useState(0);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(true);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editingTeamName, setEditingTeamName] = useState("");

  // default = "scoring" เพราะคนกรอกคะแนนเป็นกลุ่มที่เปิดหน้านี้บ่อยสุด
  const [activeTab, setActiveTab] = useState("scoring");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ส่งต่อคำสั่ง "jump มาดูคะแนนข้อนี้" จาก ControlPage (tab slides) ไปยัง
  // ScoreEntryAndLog (tab scoring) — ต้องสลับ tab ให้ด้วยตอนสั่ง jump ข้าม tab
  const [jumpTarget, setJumpTarget] = useState<{
    categoryId: number;
    questionNumber: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    const fresh = await loadData();
    setData(fresh);
  }, []);

  // โหลดข้อมูลครั้งแรกเสมอ (แค่ REST fetch ครั้งเดียว ไม่ใช่ realtime channel
  // ราคาถูก ไม่มีปัญหาเรื่อง realtime quota) เพื่อให้ทุก tab มีข้อมูล teams พร้อมใช้
  // ทันทีที่สลับมา โดยไม่ต้องรอ fetch ใหม่
  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  // Subscribe realtime เฉพาะ tab ที่ "ต้องใช้ teams/score_events จริง ๆ" เท่านั้น:
  // - scoring   : ต้องเห็นคะแนนเข้าใหม่แบบ real-time (ทีมอื่นกรอกพร้อมกัน)
  // - emergency : fleet management ต้อง sync รายชื่อทีมถ้ามีคนแก้พร้อมกัน
  // - slides    : ไม่ต้องใช้ข้อมูลนี้เลย → ไม่เปิด channel ใด ๆ เพิ่ม
  // สลับ tab แล้ว channel เก่าจะถูกปิดอัตโนมัติผ่าน cleanup ก่อน effect รอบใหม่รัน
  useEffect(() => {
    const needsTeamsAndScore =
      activeTab === "scoring" || activeTab === "emergency";
    if (!needsTeamsAndScore) return;

    const scoreChannel = subscribeToScoreEvents(async () => {
      const fresh = await loadData();
      setData(fresh);
      setRefreshVersion((v) => v + 1);
    });

    const teamChannel = subscribeToTeams(async () => {
      const fresh = await loadData();
      setData(fresh);
      // FIX: ตอนแก้ไขชื่อ/สีทีม ต้อง refresh event log ด้วย เพราะ events แต่ละแถว
      // เก็บ team_name/team_color แบบ denormalized ไว้จากตอน query ครั้งก่อน
      // ถ้าไม่ bump refreshVersion ตรงนี้ ชื่อทีมใน Score Event Log จะค้างชื่อเก่า
      // จนกว่าจะมี score event ใหม่เข้ามา หรือกด refresh เอง
      setRefreshVersion((v) => v + 1);
    });

    return () => {
      unsubscribe(scoreChannel);
      unsubscribe(teamChannel);
    };
  }, [activeTab]);

  const handleNavigate = (id: string) => {
    setActiveTab(id);
  };

  const addTeam = async () => {
    if (!newTeamName.trim()) return;
    const id = Math.random().toString(36).substr(2, 9);
    await saveTeam({ id, name: newTeamName, color: newTeamColor });
    setNewTeamName("");
    await refresh();
  };

  const removeTeam = async (id: string) => {
    if (!confirm("ลบทีมนี้?")) return;
    await deleteTeam(id);
    await refresh();
  };

  const startEditTeam = (team: Team) => {
    setEditingTeamId(team.id);
    setEditingTeamName(team.name);
  };

  const cancelEditTeam = () => {
    setEditingTeamId(null);
    setEditingTeamName("");
  };

  const saveEditTeam = async (team: Team) => {
    const trimmed = editingTeamName.trim();
    if (!trimmed || trimmed === team.name) {
      cancelEditTeam();
      return;
    }
    await saveTeam({ id: team.id, name: trimmed, color: team.color });
    cancelEditTeam();
    await refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans">
        <span
          className="text-xs uppercase tracking-widest animate-pulse"
          style={{ color: ORANGE }}
        >
          Initializing...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-sans bg-white text-black">
      <Sidebar
        active={activeTab}
        onNavigate={handleNavigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-6 left-6 z-50 flex items-center gap-2 px-3 py-2 bg-white border border-black/[0.08] rounded-lg hover:border-black/20 transition-all"
          style={{ color: ORANGE }}
          title="เปิดเมนู"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      <main
        className={`flex-1 overflow-auto transition-all duration-300 ${
          sidebarOpen ? "ml-56" : "ml-0"
        }`}
      >
        <div className="max-w-3xl mx-auto px-8 py-10 space-y-10">
          {activeTab === "emergency" && (
            <>
              {/* Fleet Management */}
              <section id="fleet-management" className="scroll-mt-6">
                <div className="mb-7">
                  <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: ORANGE }} />
                    Fleet Management
                  </h1>
                  <p className="text-black/35 text-sm mt-0.5">
                    {data.teams.length} teams registered
                  </p>
                </div>

                <div className="border border-black/[0.07] rounded-xl p-6 space-y-4">
                  <div className="flex gap-3 items-end flex-wrap">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTeam()}
                      placeholder="TEAM CALLSIGN EX: NEON-1"
                      className="flex-1 min-w-48 rounded-lg px-3 py-2.5 text-xs outline-none border border-black/[0.08] focus:border-black/20 placeholder:text-black/25"
                    />
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewTeamColor(c)}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${
                            newTeamColor === c
                              ? "border-black scale-110"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={addTeam}
                      className="px-5 py-2.5 rounded-lg font-medium text-xs text-white transition-all hover:opacity-90"
                      style={{ background: ORANGE }}
                    >
                      + Register
                    </button>
                  </div>

                  {data.teams.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {data.teams.map((team) => {
                        const pos = data.positions.find(
                          (p) => p.teamId === team.id,
                        );
                        const isEditing = editingTeamId === team.id;
                        return (
                          <div
                            key={team.id}
                            className="flex items-center gap-3 px-3.5 py-2 rounded-lg border border-black/[0.07] text-xs"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: team.color }}
                            />
                            {isEditing ? (
                              <input
                                type="text"
                                autoFocus
                                value={editingTeamName}
                                onChange={(e) =>
                                  setEditingTeamName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEditTeam(team);
                                  if (e.key === "Escape") cancelEditTeam();
                                }}
                                className="w-28 rounded-md px-2 py-1 text-xs outline-none border border-black/[0.15] focus:border-black/30"
                              />
                            ) : (
                              <span className="font-medium">{team.name}</span>
                            )}
                            <span
                              className="font-medium"
                              style={{ color: "#1a7a4c" }}
                            >
                              {pos?.score ?? 0} pts
                            </span>
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEditTeam(team)}
                                  className="text-black/25 hover:text-green-600 ml-1"
                                  title="บันทึก"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={cancelEditTeam}
                                  className="text-black/25 hover:text-black/60"
                                  title="ยกเลิก"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditTeam(team)}
                                  className="text-black/25 hover:text-blue-500 ml-1"
                                  title="แก้ไขชื่อทีม"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeTeam(team.id)}
                                  className="text-black/25 hover:text-red-500"
                                  title="ลบทีม"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Canva Embed Links */}
              <section id="canva-links" className="scroll-mt-6">
                <div className="mb-7">
                  <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
                    <Link2 className="w-4 h-4" style={{ color: ORANGE }} />
                    Canva Embed Links
                  </h1>
                </div>
                <div className="border border-black/[0.07] rounded-xl p-6">
                  <CanvaLinkManager />
                </div>
              </section>
            </>
          )}

          {activeTab === "slides" && (
            <>
              {/* Presentation State */}
              <section id="presentation-state" className="scroll-mt-6">
                <div className="mb-7">
                  <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
                    <ClipboardList
                      className="w-4 h-4"
                      style={{ color: ORANGE }}
                    />
                    Presentation State
                  </h1>
                </div>
                <div className="border border-black/[0.07] rounded-xl p-6">
                  <ControlPage
                    onJumpToScore={(categoryId, questionNumber) => {
                      // jump ข้าม tab: presentation-state (slides) → scoring
                      setActiveTab("scoring");
                      setJumpTarget({ categoryId, questionNumber });
                    }}
                  />
                </div>
              </section>
              {/* Timer */}
              <section id="timer" className="scroll-mt-6">
                <TimerAdminControl
                  table="bidding_timer"
                  title="นาฬิกาประมูล"
                  defaultSeconds={45}
                />
                <TimerAdminControl
                  table="answer_timer"
                  title="นาฬิกาทำข้อสอบ"
                  defaultSeconds={60}
                />
              </section>
              {/* <section id="timer" className="scroll-mt-6">
            <div className="mb-7">
              <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
                <Timer className="w-4 h-4" style={{ color: ORANGE }} />
                Timer
              </h1>
            </div>
            <div className="border border-black/[0.07] rounded-xl p-6">
              <Link href="https://keepthescore.com/board/jbmyjghsmkjbe">
                จับเวลาทำข้อสอบ <ExternalLink className="w-3 h-3 inline-block" />
              </Link>
              <iframe
                src="https://keepthescore.com/board/jbmyjghsmkjbe"
                className="w-full h-96"
              />
            </div>
             <div className="border border-black/[0.07] rounded-xl p-6">
              <Link href="https://keepthescore.com/board/tkwnddmqfmcwe">
                ประมูล <ExternalLink className="w-3 h-3 inline-block" />
              </Link>
              <iframe
                src="https://keepthescore.com/board/tkwnddmqfmcwe"
                className="w-full h-96"
              />
            </div>
          </section> */}
            </>
          )}

          {activeTab === "scoring" && (
            <>
              {/* Score Entry + Log */}
              <ScoreEntryAndLog
                teams={data.teams}
                onRefreshScores={refresh}
                refreshVersion={refreshVersion}
                jumpTarget={jumpTarget}
                onJumpHandled={() => setJumpTarget(null)}
              />

              {/* Score Audit Matrix */}
              <section id="audit-matrix" className="scroll-mt-6">
                <div className="mb-7">
                  <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
                    <ClipboardList
                      className="w-4 h-4"
                      style={{ color: ORANGE }}
                    />
                    Score Audit Matrix
                  </h1>
                </div>
                <div className="border border-black/[0.07] rounded-xl p-6">
                  <AuditMatrix
                    teams={data.teams}
                    refreshVersion={refreshVersion}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
