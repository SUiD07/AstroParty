"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, Save, RefreshCw, Link } from "lucide-react";
import { loadCategories, loadCanvaLinks, saveCanvaLink, deleteCanvaLink } from "@/lib/db";

interface Question {
  id: number;
  number: number;
}
interface Category {
  id: number;
  name: string;
  position: number;
  questions: Question[];
}

export function CanvaLinkManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [canvaLinks, setCanvaLinks] = useState<Record<number, string>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [cats, links] = await Promise.all([loadCategories(), loadCanvaLinks()]);
    setCategories(cats);
    setCanvaLinks(links);
    setDrafts(links); // sync drafts
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSave = async (questionId: number) => {
    const url = drafts[questionId]?.trim();
    if (!url) return;
    setSaving(questionId);
    await saveCanvaLink(questionId, url);
    await refresh();
    setSaving(null);
  };

  const handleDelete = async (questionId: number) => {
    if (!confirm("ลบลิงก์ Canva ของข้อนี้?")) return;
    setDeleting(questionId);
    await deleteCanvaLink(questionId);
    setDrafts((d) => { const n = { ...d }; delete n[questionId]; return n; });
    await refresh();
    setDeleting(null);
  };

  const isDirty = (qId: number) => (drafts[qId] ?? "") !== (canvaLinks[qId] ?? "");

  if (loading) return (
    <div className="flex items-center justify-center h-24 text-brand-cyan text-xs animate-pulse font-mono">
      Loading…
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-brand-cyan flex items-center gap-2">
          <Link className="w-4 h-4" /> Canva Embed Links
        </h2>
        <button
          onClick={refresh}
          className="text-slate-500 hover:text-brand-cyan transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Per-category tables */}
      {categories.map((cat) => (
        <div key={cat.id} className="space-y-2">
          {/* Category label */}
          <div className="text-[9px] uppercase tracking-widest text-slate-500 border-b border-brand-slate-border pb-1">
            {cat.name}
          </div>

          <div className="space-y-2">
            {(cat.questions ?? [])
              .sort((a, b) => a.number - b.number)
              .map((q) => {
                const saved = canvaLinks[q.id];
                const draft = drafts[q.id] ?? "";
                const dirty = isDirty(q.id);

                return (
                  <div key={q.id} className="flex items-center gap-3">
                    {/* Question badge */}
                    <div className="w-14 shrink-0 text-center py-1.5 text-[10px] font-black border border-brand-slate-border bg-black/30 text-slate-400">
                      ข้อ {q.number}
                    </div>

                    {/* URL input */}
                    <input
                      type="text"
                      placeholder="https://www.canva.com/design/.../view?embed"
                      value={draft}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                      }
                      className={`flex-1 bg-black/30 border px-3 py-1.5 text-xs text-white outline-none font-mono transition-colors
                        ${dirty
                          ? "border-yellow-500/60 focus:border-yellow-400"
                          : saved
                            ? "border-brand-green/40 focus:border-brand-green"
                            : "border-brand-slate-border focus:border-brand-cyan"
                        }`}
                    />

                    {/* Status dot */}
                    <div className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: dirty
                          ? "#eab308"
                          : saved
                            ? "#4ade80"
                            : "transparent",
                        border: !dirty && !saved ? "1px solid #334155" : "none",
                      }}
                      title={dirty ? "Unsaved changes" : saved ? "Saved" : "Empty"}
                    />

                    {/* Save button */}
                    <button
                      onClick={() => handleSave(q.id)}
                      disabled={!dirty || saving === q.id || !draft.trim()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase shrink-0 transition-all
                        ${dirty && draft.trim()
                          ? "bg-brand-green text-brand-slate-dark hover:opacity-90"
                          : "bg-brand-slate-border text-slate-500 cursor-not-allowed"
                        }`}
                    >
                      {saving === q.id
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <Save className="w-3 h-3" />
                      }
                      Save
                    </button>

                    {/* Delete button */}
                    {saved && (
                      <button
                        onClick={() => handleDelete(q.id)}
                        disabled={deleting === q.id}
                        className="text-slate-600 hover:text-red-500 transition-colors shrink-0"
                        title="ลบลิงก์"
                      >
                        {deleting === q.id
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <div className="h-24 flex items-center justify-center border border-dashed border-brand-slate-border text-slate-600 text-xs italic">
          ไม่พบหมวดคำถาม
        </div>
      )}
    </div>
  );
}