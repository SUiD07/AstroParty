"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RefreshCw, Users, Clock, CheckCircle } from "lucide-react";
import {
  loadData,
  saveTeam,
  deleteTeam,
  loadCategories,
  loadScoreEvents,
  addScoreEvent,
  deleteScoreEvent,
} from "@/lib/db";
import { RaceData, Team } from "@/app/types";
import { COLORS } from "@/app/constants";
import { ScoreEvent } from "@/lib/db";
import Link from "next/link";

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
// ScoreEntryAndLog — เพิ่มคะแนน + history ในกล่องเดียว
// ===========================================================================
function ScoreEntryAndLog({
  teams,
  onRefreshScores,
}: {
  teams: Team[];
  onRefreshScores: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null,
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [delta, setDelta] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [events, setEvents] = useState<ScoreEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const PRESET_DELTAS = [
    -600, -500, -400, -300, -200, -100, 100, 200, 300, 400, 500, 600,
  ];

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
    refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    setSelectedQuestion(null);
    setDelta(null);
  }, [selectedCategory]);

  const canSubmit =
    selectedCategory && selectedQuestion && selectedTeamId && delta !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addScoreEvent(
        selectedTeamId,
        selectedCategory!.id,
        selectedQuestion!.id,
        delta!,
        note || undefined,
      );
      const team = teams.find((t) => t.id === selectedTeamId);
      setLastSaved(
        `${team?.name} • ${selectedCategory!.name} ข้อ ${selectedQuestion!.number} • ${delta! > 0 ? "+" : ""}${delta}`,
      );
      setSelectedQuestion(null);
      setDelta(null);
      setNote("");
      await refreshEvents();
      onRefreshScores();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (event: ScoreEvent) => {
    const label = `${event.team_name} • ${event.category_name} ข้อ ${event.question_number} • ${event.delta > 0 ? "+" : ""}${event.delta}`;
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
    <div className="space-y-6">
      {/* ── Entry Form ── */}
      <section className="p-6 bg-brand-slate-mid border border-brand-slate-border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-cyan flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> เพิ่มคะแนน
          </h2>
          {lastSaved && (
            <div className="text-[9px] text-brand-green border border-brand-green/20 px-2 py-1 rounded bg-brand-green/5 font-mono">
              ✓ {lastSaved}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* ① Category */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-slate-500 block">
              ① หมวด
            </label>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 text-[11px] font-bold uppercase border transition-all ${
                    selectedCategory?.id === cat.id
                      ? "bg-red-500 text-brand-slate-dark border-red-500"
                      : "bg-black/30 border-brand-slate-border text-slate-300 hover:border-red-500/40"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* ② Question */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-slate-500 block">
              ② ข้อ
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(selectedCategory?.questions ?? [])
                .sort((a, b) => a.number - b.number)
                .map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setSelectedQuestion(q);
                      // setDelta(q.points); // auto-fill delta เป็น points ของข้อนั้น
                    }}
                    className={`py-2 text-[11px] font-black border transition-all ${
                      selectedQuestion?.id === q.id
                        ? "bg-red-500 text-brand-slate-dark border-red-500"
                        : "bg-black/30 border-brand-slate-border text-slate-300 hover:border-red-500/40"
                    }`}
                  >
                    ข้อ {q.number}
                  </button>
                ))}
            </div>
            {!selectedCategory && (
              <p className="text-[9px] text-slate-600 italic">เลือกหมวดก่อน</p>
            )}
          </div>

          {/* ③ Team */}
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-widest text-slate-500 block">
              ③ ทีม
            </label>
            <div className="space-y-1">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`w-full text-left px-3 py-2 text-[11px] font-bold flex items-center gap-2 border transition-all ${
                    selectedTeamId === team.id
                      ? "border-white/40 bg-white/5"
                      : "border-brand-slate-border bg-black/30 hover:border-white/20"
                  }`}
                  style={
                    selectedTeamId === team.id
                      ? { borderColor: `${team.color}88`, color: team.color }
                      : {}
                  }
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                  {team.name}
                </button>
              ))}
            </div>
          </div>

          {/* ④ Delta + Submit */}
          <div className="space-y-2 flex flex-col">
            <label className="text-[9px] uppercase tracking-widest text-slate-500 block">
              ④ คะแนน (+/-)
            </label>
            <div className="grid grid-cols-2 gap-1">
              {PRESET_DELTAS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDelta(d)}
                  className={`py-2 text-[11px] font-black border transition-all ${
                    delta === d
                      ? d > 0
                        ? "bg-red-500 text-brand-slate-dark border-red-500 hover:border-red-400/40"
                        : "bg-red-500 text-white border-red-500"
                      : d > 0
                        ? "text-brand-cyan border-brand-slate-border bg-black/30 hover:border-brand-cyan/40"
                        : "text-red-400 border-brand-slate-border bg-black/30 hover:border-red-400/40"
                  }`}
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>

            <input
              type="number"
              placeholder="กรอกเองได้..."
              value={
                delta !== null && !PRESET_DELTAS.includes(delta) ? delta : ""
              }
              onChange={(e) => setDelta(Number(e.target.value))}
              className="w-full bg-black/30 border border-brand-slate-border px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan placeholder:text-slate-600"
            />

            <input
              type="text"
              placeholder="หมายเหตุ (optional)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-black/30 border border-brand-slate-border px-3 py-2 text-xs text-white outline-none focus:border-brand-cyan placeholder:text-slate-600"
            />

            {/* Summary */}
            <div className="flex-1 p-3 bg-black/40 border border-dashed border-brand-slate-border rounded text-[10px] text-slate-400 space-y-1">
              <div>
                หมวด:{" "}
                <span className="text-white">
                  {selectedCategory?.name ?? "—"}
                </span>
              </div>
              <div>
                ข้อ:{" "}
                <span className="text-white">
                  {selectedQuestion ? `ข้อ ${selectedQuestion.number}` : "—"}
                </span>
              </div>
              <div>
                ทีม:{" "}
                <span className="text-white">
                  {teams.find((t) => t.id === selectedTeamId)?.name ?? "—"}
                </span>
              </div>
              <div>
                คะแนน:{" "}
                <span
                  className={
                    delta != null
                      ? delta > 0
                        ? "text-brand-green font-black"
                        : "text-red-400 font-black"
                      : "text-white"
                  }
                >
                  {delta != null ? (delta > 0 ? `+${delta}` : delta) : "—"}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className={`w-full py-3 font-black uppercase text-xs tracking-widest transition-all ${
                canSubmit && !submitting
                  ? "bg-brand-green text-brand-slate-dark hover:opacity-90"
                  : "bg-brand-slate-border text-slate-500 cursor-not-allowed"
              }`}
            >
              {submitting ? "กำลังบันทึก..." : "✓ ยืนยัน / OK"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Event Log ── */}
      <section className="p-6 bg-brand-slate-mid border border-brand-slate-border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-cyan flex items-center gap-2">
            <Clock className="w-4 h-4" /> Score Event Log
            <span className="text-slate-500 font-normal normal-case tracking-normal text-[9px]">
              — กดลบเพื่อ Undo
            </span>
          </h2>
          <button
            onClick={refreshEvents}
            disabled={eventsLoading}
            className="text-slate-500 hover:text-brand-cyan transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${eventsLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {events.length === 0 && !eventsLoading ? (
          <div className="h-24 flex items-center justify-center border border-dashed border-brand-slate-border text-slate-600 text-xs uppercase italic">
            ยังไม่มีรายการ
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-slate-500 border-b border-brand-slate-border">
                  <th className="text-left pb-2 pr-3">เวลา</th>
                  <th className="text-left pb-2 pr-3">ทีม</th>
                  <th className="text-left pb-2 pr-3">หมวด</th>
                  <th className="text-left pb-2 pr-3">ข้อ</th>
                  <th className="text-left pb-2 pr-3">หมายเหตุ</th>
                  <th className="text-right pb-2 pr-3">คะแนน</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-slate-border/40">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className={`transition-opacity ${deletingId === event.id ? "opacity-30" : "hover:bg-white/[0.02]"}`}
                  >
                    <td className="py-2 pr-3 text-slate-500">
                      {formatTime(event.created_at)}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: event.team_color }}
                        />
                        <span
                          className="font-bold"
                          style={{ color: event.team_color }}
                        >
                          {event.team_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      {event.category_name}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">
                      ข้อ {event.question_number}
                    </td>
                    <td className="py-2 pr-3 text-slate-500 italic">
                      {event.note ?? "—"}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-black text-sm ${event.delta > 0 ? "text-brand-green" : "text-red-400"}`}
                    >
                      {event.delta > 0 ? `+${event.delta}` : event.delta}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDelete(event)}
                        disabled={deletingId !== null}
                        className="text-slate-600 hover:text-red-500 transition-colors disabled:cursor-not-allowed"
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
          <p className="text-[9px] text-slate-600 text-right">
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
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const fresh = await loadData();
    setData(fresh);
  }, []);

  useEffect(() => {
    loadData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

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
      <div className="min-h-screen bg-brand-slate-dark text-slate-100 flex items-center justify-center font-mono">
        <span className="text-xs uppercase tracking-widest text-brand-cyan animate-pulse">
          Initializing...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-slate-dark text-slate-100 p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-brand-slate-border pb-6">
          <div>
            <h1 className="text-3xl font-black italic neon-text uppercase">
              Control Center
            </h1>
            <p className="text-[10px] text-slate-500 tracking-[0.2em] mt-1">
              AUTHORIZATION: GRANTED
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-brand-cyan text-brand-slate-dark font-bold text-xs uppercase"
          >
            Go To Viewer
          </Link>
        </div>

        {/* Fleet Management */}
        <section className="p-6 bg-brand-slate-mid border border-brand-slate-border rounded-lg space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-brand-cyan flex items-center gap-2">
            <Users className="w-4 h-4" /> Fleet Management
          </h2>

          <div className="flex gap-4 items-end flex-wrap">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTeam()}
              placeholder="TEAM CALLSIGN EX: NEON-1"
              className="flex-1 min-w-48 bg-[#020617] border border-brand-slate-border p-3 text-xs focus:border-brand-cyan outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTeamColor(c)}
                  className={`w-8 h-8 border-2 transition-all ${newTeamColor === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={addTeam}
              className="px-6 py-3 bg-brand-cyan text-brand-slate-dark font-black uppercase text-xs tracking-widest"
            >
              + Register
            </button>
          </div>

          {/* Team list */}
          {data.teams.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {data.teams.map((team) => {
                const pos = data.positions.find((p) => p.teamId === team.id);
                return (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 px-4 py-2 bg-[#020617] border border-brand-slate-border text-xs"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-bold">{team.name}</span>
                    <span className="text-brand-green font-black">
                      {pos?.score ?? 0} pts
                    </span>
                    <button
                      onClick={() => removeTeam(team.id)}
                      className="text-slate-500 hover:text-red-500 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Score Entry + Log */}
        <ScoreEntryAndLog teams={data.teams} onRefreshScores={refresh} />
      </div>
    </div>
  );
}
