"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { getAuditMatrix } from "@/lib/db";
import { Team } from "@/app/types";

interface AuditEvent {
  id: number;
  team_id: string;
  team_name?: string;
  team_color?: string;
  category_name?: string;
  question_number?: number;
  delta: number;
  created_at: string;
}

interface ColGroup {
  category_name: string;
  question_number: number;
  events: AuditEvent[];
  timeStart: string;
  timeEnd: string;
}

export function AuditMatrix({ teams }: { teams: Team[] }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getAuditMatrix();
    setEvents(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("th-TH", {
      hour: "2-digit", minute: "2-digit",
    });

  if (loading) return (
    <div className="h-24 flex items-center justify-center text-xs text-slate-500 animate-pulse">
      Loading...
    </div>
  );

  if (events.length === 0) return (
    <div className="h-24 flex items-center justify-center border border-dashed border-brand-slate-border text-slate-600 text-xs italic">
      ยังไม่มีข้อมูล
    </div>
  );

  // ── สร้าง colGroups ──────────────────────────────────────
  const colGroups: ColGroup[] = [];
  for (const ev of events) {
    const last = colGroups[colGroups.length - 1];
    const sameQuestion =
      last &&
      last.category_name === ev.category_name &&
      last.question_number === ev.question_number;

    if (sameQuestion) {
      last.events.push(ev);
      last.timeEnd = ev.created_at;
    } else {
      colGroups.push({
        category_name: ev.category_name ?? "",
        question_number: ev.question_number ?? 0,
        events: [ev],
        timeStart: ev.created_at,
        timeEnd: ev.created_at,
      });
    }
  }

  // ── sortedTeams ───────────────────────────────────────────
  const sortedTeams = [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, "th")
  );

  // ── runningTotals[teamId][colIndex] ──────────────────────
  const runningTotals: Record<string, number[]> = {};
  sortedTeams.forEach((t) => { runningTotals[t.id] = []; });

  const cumulative: Record<string, number> = {};
  colGroups.forEach((col) => {
    col.events.forEach((ev) => {
      cumulative[ev.team_id] = (cumulative[ev.team_id] ?? 0) + ev.delta;
    });
    sortedTeams.forEach((t) => {
      runningTotals[t.id].push(cumulative[t.id] ?? 0);
    });
  });

  // ── final total + rank ────────────────────────────────────
  const finalTotal = (teamId: string) => cumulative[teamId] ?? 0;
  const ranked = [...sortedTeams].sort(
    (a, b) => finalTotal(b.id) - finalTotal(a.id)
  );
  const rankMap: Record<string, number> = {};
  ranked.forEach((t, i) => { rankMap[t.id] = i + 1; });

  const rankColor = (r: number) =>
    r === 1 ? "text-yellow-400"
    : r === 2 ? "text-slate-300"
    : r === 3 ? "text-orange-400"
    : "text-slate-500";

  return (
    <div className="space-y-3">
      {/* toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-slate-500 uppercase tracking-widest">
          {colGroups.length} กลุ่มคำถาม · {events.length} events
        </p>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-slate-500 hover:text-brand-cyan transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded border border-brand-slate-border">
        <table className="text-[10px] font-mono border-separate border-spacing-0 w-full">
          <thead>
            {/* Row 1: category + question */}
            <tr className="bg-brand-slate-dark">
              <th className="sticky left-0 z-20 bg-brand-slate-dark px-3 py-2 text-left text-slate-500 border-b border-r border-brand-slate-border min-w-[110px]">
                ทีม
              </th>
              {colGroups.map((col, ci) => (
                <th
                  key={ci}
                  className="px-2 py-1 text-center border-b border-r border-brand-slate-border/50 min-w-[72px]"
                >
                  <div className="text-brand-cyan font-bold truncate max-w-[68px]">
                    {col.category_name}
                  </div>
                  <div className="text-slate-400">ข้อ {col.question_number}</div>
                </th>
              ))}
              <th className="px-3 py-2 text-center border-b border-r border-brand-slate-border text-brand-cyan min-w-[60px]">
                รวม
              </th>
              <th className="px-3 py-2 text-center border-b border-brand-slate-border text-slate-400 min-w-[48px]">
                อันดับ
              </th>
            </tr>

            {/* Row 2: timestamp */}
            <tr className="bg-brand-slate-dark/60">
              <th className="sticky left-0 z-20 bg-brand-slate-dark/60 border-b border-r border-brand-slate-border" />
              {colGroups.map((col, ci) => (
                <th
                  key={ci}
                  className="px-2 py-1 text-center text-slate-600 border-b border-r border-brand-slate-border/50 font-normal whitespace-nowrap"
                >
                  {formatTime(col.timeStart)}
                  {col.timeStart !== col.timeEnd && (
                    <span className="text-slate-700">
                      {" "}–{formatTime(col.timeEnd)}
                    </span>
                  )}
                </th>
              ))}
              <th className="border-b border-r border-brand-slate-border" />
              <th className="border-b border-brand-slate-border" />
            </tr>
          </thead>

          <tbody>
            {sortedTeams.map((team) => (
              <tr key={team.id} className="hover:bg-white/[0.02]">
                {/* team name */}
                <td className="sticky left-0 z-10 bg-brand-slate-dark px-3 py-2 border-b border-r border-brand-slate-border">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-bold" style={{ color: team.color }}>
                      {team.name}
                    </span>
                  </div>
                </td>

                {/* delta per colGroup */}
                {colGroups.map((col, ci) => {
                  const ev = col.events.find((e) => e.team_id === team.id);
                  const snapshot = runningTotals[team.id][ci];
                  return (
                    <td
                      key={ci}
                      className="px-2 py-2 text-center border-b border-r border-brand-slate-border/30"
                    >
                      {ev ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`font-black text-xs ${
                              ev.delta > 0 ? "text-brand-green" : "text-red-400"
                            }`}
                          >
                            {ev.delta > 0 ? `+${ev.delta}` : ev.delta}
                          </span>
                          <span className="text-slate-500 text-[8px]">
                            ({snapshot})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  );
                })}

                {/* final total */}
                <td className="px-3 py-2 text-center border-b border-r border-brand-slate-border">
                  <span
                    className={`font-black text-sm ${
                      finalTotal(team.id) > 0
                        ? "text-brand-green"
                        : finalTotal(team.id) < 0
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  >
                    {finalTotal(team.id)}
                  </span>
                </td>

                {/* rank */}
                <td className="px-3 py-2 text-center border-b border-brand-slate-border">
                  <span className={`font-black ${rankColor(rankMap[team.id])}`}>
                    #{rankMap[team.id]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
