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
  Grid3x3,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
} from "lucide-react";
import {
  loadData,
  saveTeam,
  deleteTeam,
  loadCategories,
  loadScoreEvents,
  addScoreEvent,
  deleteScoreEvent,
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
// Sidebar
// ===========================================================================
interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Control Center",
    items: [
      { id: "fleet-management", label: "Fleet Management", icon: Rocket },
      { id: "canva-links", label: "Canva Embed Links", icon: Link2 },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "score-entry", label: "เพิ่มคะแนน", icon: CheckCircle },
      { id: "event-log", label: "Score Event Log", icon: Clock },
      { id: "audit-matrix", label: "Score Audit Matrix", icon: Grid3x3 },
    ],
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

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] px-2 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm transition-all"
                    style={{
                      background: isActive
                        ? "rgba(237,130,64,0.12)"
                        : "transparent",
                      color: isActive ? ORANGE : "rgba(255,255,255,0.4)",
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
function PillButton({
  children,
  active,
  onClick,
  positive,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  positive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="py-2 rounded-lg text-[11px] font-medium border transition-all"
      style={{
        background: active
          ? positive === false
            ? "rgba(212,24,61,0.08)"
            : "rgba(237,130,64,0.10)"
          : "transparent",
        borderColor: active
          ? positive === false
            ? "rgba(212,24,61,0.3)"
            : "rgba(237,130,64,0.3)"
          : "rgba(0,0,0,0.08)",
        color: active
          ? positive === false
            ? NEGATIVE
            : ORANGE
          : "rgba(0,0,0,0.5)",
      }}
    >
      {children}
    </button>
  );
}

// ===========================================================================
// ScoreEntryAndLog
// ===========================================================================
const fmtScore = (n: number) => {
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
};

function ScoreEntryAndLog({
  teams,
  onRefreshScores,
  refreshVersion,
}: {
  teams: Team[];
  onRefreshScores: () => void;
  refreshVersion: number;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [scoreFull, setScoreFull] = useState<number | null>(null);

  // per-team data: key = teamId, value = { bonus, n } — ทุกทีมมี entry เสมอ ไม่ต้อง select
  const [teamEntries, setTeamEntries] = useState<
    Record<string, { bonus: boolean; n: number }>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  // สร้าง entry เริ่มต้น (n=0, bonus=false) ให้ทุกทีมเสมอ — ทั้งตอนโหลดทีมใหม่ และตอนเปลี่ยนหมวด/ข้อ
  useEffect(() => {
    setTeamEntries(
      Object.fromEntries(teams.map((t) => [t.id, { bonus: false, n: 0 }])),
    );
  }, [teams]);

  useEffect(() => {
    setSelectedQuestion(null);
    setScoreFull(null);
    setTeamEntries(
      Object.fromEntries(teams.map((t) => [t.id, { bonus: false, n: 0 }])),
    );
  }, [selectedCategory]);

  const updateTeamBonus = (teamId: string, bonus: boolean) => {
    setTeamEntries((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], bonus },
    }));
  };

  const updateTeamN = (teamId: string, n: number) => {
    setTeamEntries((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], n },
    }));
  };

  const computeScore = (bonus: boolean, n: number, full: number) => {
    const multiplier = bonus ? 2 : 1;
    const correctPortion = multiplier * (n / 100) * full;
    // ไม่มีโบนัส → ไม่หักคะแนนจากข้อที่ตอบผิด
    const incorrectPortion = bonus ? ((100 - n) / 100) * full : 0;
    return {
      correctPortion,
      incorrectPortion,
      finalScore: correctPortion - incorrectPortion, // ไม่ปัดเศษ
    };
  };

  const canSubmit =
    selectedCategory &&
    selectedQuestion &&
    scoreFull != null &&
    teams.length > 0 &&
    teams.every((t) => {
      const n = teamEntries[t.id]?.n;
      return n !== undefined && n >= 0 && n <= 100;
    });

  const buildNote = (bonus: boolean, n: number, full: number, final: number) =>
    bonus
      ? `โบนัส x2 · ตอบถูก ${n}% · เต็ม ${full} → 2×(${n}/100)×${full} − (100−${n})/100×${full} = ${final.toFixed(2)}`
      : `ไม่มีโบนัส · ตอบถูก ${n}% · เต็ม ${full} → (${n}/100)×${full} = ${final.toFixed(2)} (ไม่หักข้อผิด)`;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const results = teams.map((team) => {
        const entry = teamEntries[team.id];
        const { finalScore } = computeScore(entry.bonus, entry.n, scoreFull!);
        return { teamId: team.id, finalScore, entry };
      });

      await Promise.all(
        results.map(({ teamId, finalScore, entry }) =>
          addScoreEvent(
            teamId,
            selectedCategory!.id,
            selectedQuestion!.id,
            finalScore,
            buildNote(entry.bonus, entry.n, scoreFull!, finalScore),
          ),
        ),
      );

      const summary = results
        .map(({ teamId, finalScore }) => {
          const name = teams.find((t) => t.id === teamId)?.name;
          return `${name} (${finalScore > 0 ? "+" : ""}${fmtScore(finalScore)})`;
        })
        .join(", ");
      setLastSaved(
        `${selectedCategory!.name} ข้อ ${selectedQuestion!.number} • ${summary}`,
      );

      setSelectedQuestion(null);
      setScoreFull(null);
      setTeamEntries(
        Object.fromEntries(teams.map((t) => [t.id, { bonus: false, n: 0 }])),
      );
      await refreshEvents();
      onRefreshScores();
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
                className="w-full rounded-lg px-3 py-2 text-xs outline-none border border-black/[0.08] focus:border-black/20 placeholder:text-black/25"
              />
            </div>
          </div>

          {/* ④ ตารางทีม — ทุกทีมกรอกได้เลย ไม่ต้องติ๊กเลือก */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
              ④ โบนัส / ตอบถูก (N%) ต่อทีม — ถ้าทีมไม่ตอบให้กรอก 0
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
                    const entry = teamEntries[team.id] ?? {
                      bonus: false,
                      n: 0,
                    };
                    const valid =
                      scoreFull != null && entry.n >= 0 && entry.n <= 100;
                    const { correctPortion, incorrectPortion, finalScore } =
                      valid
                        ? computeScore(entry.bonus, entry.n, scoreFull!)
                        : {
                            correctPortion: 0,
                            incorrectPortion: 0,
                            finalScore: 0,
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
                            min={0}
                            max={100}
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
                            {entry.bonus ? (
                              <>
                                {multiplier}×({entry.n}/100)×
                                {scoreFull ?? "score"} − (100−{entry.n})/100×
                                {scoreFull ?? "score"}
                                <br />={" "}
                                {valid ? correctPortion.toFixed(1) : "—"} −{" "}
                                {valid ? incorrectPortion.toFixed(1) : "—"}
                              </>
                            ) : (
                              <>
                                ({entry.n}/100)×{scoreFull ?? "score"}{" "}
                                (ไม่หักข้อผิด)
                                <br />={" "}
                                {valid ? correctPortion.toFixed(1) : "—"}
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
        </div>
      </section>

      {/* ── Event Log — เหมือนเดิมทุกจุด ไม่แตะ ── */}
      <section id="event-log" className="scroll-mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: ORANGE }} />
              Score Event Log
            </h1>
            <p className="text-black/35 text-sm mt-0.5">กดลบเพื่อ Undo</p>
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

        {events.length === 0 && !eventsLoading ? (
          <div className="h-24 flex items-center justify-center border border-dashed border-black/[0.08] rounded-xl text-black/25 text-xs italic">
            ยังไม่มีรายการ
          </div>
        ) : (
          <div className="border border-black/[0.07] rounded-xl overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] text-black/25 border-b border-black/[0.06]">
                  <th className="text-left py-3 pl-5 pr-3 font-medium">เวลา</th>
                  <th className="text-left py-3 pr-3 font-medium">ทีม</th>
                  <th className="text-left py-3 pr-3 font-medium">หมวด</th>
                  <th className="text-left py-3 pr-3 font-medium">ข้อ</th>
                  <th className="text-left py-3 pr-3 font-medium">หมายเหตุ</th>
                  <th className="text-right py-3 pr-3 font-medium">คะแนน</th>
                  <th className="py-3 pr-5" />
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
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
                      className="py-3 pr-3 text-black/30 italic max-w-[240px] truncate"
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
                      <button
                        onClick={() => handleDelete(event)}
                        disabled={deletingId !== null}
                        className="text-black/25 hover:text-red-500 transition-colors disabled:cursor-not-allowed"
                        title="Undo / ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {events.length > 0 && (
          <p className="text-[10px] text-black/25 text-right mt-2">
            {events.length} รายการล่าสุด
          </p>
        )}
      </section>
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

  const [refreshVersion, setRefreshVersion] = useState(0);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState("fleet-management");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const refresh = useCallback(async () => {
    const fresh = await loadData();
    setData(fresh);
  }, []);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setLoading(false);
    });

    const scoreChannel = subscribeToScoreEvents(async () => {
      const fresh = await loadData();
      setData(fresh);
      setRefreshVersion((v) => v + 1);
    });

    const teamChannel = subscribeToTeams(async () => {
      const fresh = await loadData();
      setData(fresh);
    });

    return () => {
      unsubscribe(scoreChannel);
      unsubscribe(teamChannel);
    };
  }, []);

  useEffect(() => {
    const ids = [
      "fleet-management",
      "canva-links",
      "score-entry",
      "event-log",
      "audit-matrix",
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loading]);

  const handleNavigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
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
        active={activeSection}
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
                    return (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 px-3.5 py-2 rounded-lg border border-black/[0.07] text-xs"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        <span className="font-medium">{team.name}</span>
                        <span
                          className="font-medium"
                          style={{ color: "#1a7a4c" }}
                        >
                          {pos?.score ?? 0} pts
                        </span>
                        <button
                          onClick={() => removeTeam(team.id)}
                          className="text-black/25 hover:text-red-500 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

          {/* Score Entry + Log */}
          <ScoreEntryAndLog
            teams={data.teams}
            onRefreshScores={refresh}
            refreshVersion={refreshVersion}
          />

          {/* Score Audit Matrix */}
          <section id="audit-matrix" className="scroll-mt-6">
            <div className="mb-7">
              <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
                <ClipboardList className="w-4 h-4" style={{ color: ORANGE }} />
                Score Audit Matrix
              </h1>
            </div>
            <div className="border border-black/[0.07] rounded-xl p-6">
              <AuditMatrix teams={data.teams} refreshVersion={refreshVersion} />
            </div>
          </section>
          {/* Presentation State */}
          <section id="presentation-state" className="scroll-mt-6">
            <div className="mb-7">
              <h1 className="text-xl font-medium tracking-tight flex items-center gap-2">
                <ClipboardList className="w-4 h-4" style={{ color: ORANGE }} />
                Presentation State
              </h1>
            </div>
            <div className="border border-black/[0.07] rounded-xl p-6">
              <ControlPage />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
