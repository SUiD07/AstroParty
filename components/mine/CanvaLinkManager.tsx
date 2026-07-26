"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Save, RefreshCw, AlertTriangle } from "lucide-react";
import {
  loadCanvaLinks,
  saveCanvaLink,
  deleteCanvaLink,
  loadCategories,
} from "@/lib/db";

const ORANGE = "#ED8240";

interface Question {
  id: number;
  number: number;
  points?: number;
  label?: string;
}
interface Category {
  id: number;
  name: string;
  position: number;
  questions: Question[];
}

// แยก URL เต็มออกเป็น base (ก่อน #) กับ page (หลัง #)
function splitCanvaUrl(url: string): { base: string; page: string } {
  const idx = url.indexOf("#");
  if (idx === -1) return { base: url, page: "" };
  return { base: url.slice(0, idx), page: url.slice(idx + 1) };
}

export function CanvaLinkManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [canvaLinks, setCanvaLinks] = useState<Record<number, string>>({});
  const [baseUrl, setBaseUrl] = useState("");
  // เก็บเลขหน้าที่กำลังพิมพ์ต่อคำถาม (string เพื่ออนุญาตค่าว่างระหว่างพิมพ์)
  const [pages, setPages] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingQuestionId, setSavingQuestionId] = useState<number | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [cats, links] = await Promise.all([
      loadCategories(),
      loadCanvaLinks(),
    ]);
    setCategories(cats);
    setCanvaLinks(links);

    // แยก base/page จาก URL เต็มที่เคยบันทึกไว้
    const parsed: Record<number, string> = {};
    const baseCounts = new Map<string, number>();
    Object.entries(links).forEach(([qId, url]) => {
      const { base, page } = splitCanvaUrl(url);
      parsed[Number(qId)] = page;
      if (base) baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
    });
    setPages(parsed);

    // เดา base URL ที่ "ใช้บ่อยที่สุด" จากข้อมูลเดิม ให้แอดมินไม่ต้องพิมพ์ใหม่
    let mostCommonBase = "";
    let maxCount = 0;
    baseCounts.forEach((count, base) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonBase = base;
      }
    });
    setBaseUrl((prev) => prev || mostCommonBase);

    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // เช็คว่ามีคำถามไหน base URL ไม่ตรงกับที่เลือกไว้ตอนนี้ไหม (ข้อมูลเก่าที่อาจไม่สม่ำเสมอ)
  const inconsistentCount = useMemo(() => {
    if (!baseUrl.trim()) return 0;
    let count = 0;
    Object.values(canvaLinks).forEach((url) => {
      const { base } = splitCanvaUrl(url);
      if (base && base !== baseUrl.trim()) count++;
    });
    return count;
  }, [canvaLinks, baseUrl]);

  const handlePageChange = (qId: number, value: string) => {
    // อนุญาตแค่ตัวเลขล้วน หรือว่างไว้ระหว่างพิมพ์
    if (value !== "" && !/^\d+$/.test(value)) return;
    setPages((prev) => ({ ...prev, [qId]: value }));
  };

  const handleSavePage = async (qId: number) => {
    const raw = pages[qId] ?? "";
    setSavingQuestionId(qId);
    try {
      if (raw === "" || !baseUrl.trim()) {
        await deleteCanvaLink(qId);
        setCanvaLinks((prev) => {
          const next = { ...prev };
          delete next[qId];
          return next;
        });
      } else {
        const fullUrl = `${baseUrl.trim()}#${raw}`;
        await saveCanvaLink(qId, fullUrl);
        setCanvaLinks((prev) => ({ ...prev, [qId]: fullUrl }));
      }
      setLastSaved("บันทึกแล้ว");
    } finally {
      setSavingQuestionId(null);
    }
  };

  const isChanged = (qId: number) => {
    const raw = pages[qId] ?? "";
    const { page: savedPage } = canvaLinks[qId]
      ? splitCanvaUrl(canvaLinks[qId])
      : { page: "" };
    return raw !== savedPage;
  };

  const anyChanged = categories.some((cat) =>
    cat.questions.some((q) => isChanged(q.id)),
  );

  const handleSaveAll = async () => {
    const changedIds: number[] = [];
    categories.forEach((cat) =>
      cat.questions.forEach((q) => {
        if (isChanged(q.id)) changedIds.push(q.id);
      }),
    );
    if (changedIds.length === 0) return;
    setSavingQuestionId(-1); // -1 = กำลังบันทึกทั้งหมด
    try {
      await Promise.all(
        changedIds.map(async (qId) => {
          const raw = pages[qId] ?? "";
          if (raw === "" || !baseUrl.trim()) {
            await deleteCanvaLink(qId);
          } else {
            await saveCanvaLink(qId, `${baseUrl.trim()}#${raw}`);
          }
        }),
      );
      const links = await loadCanvaLinks();
      setCanvaLinks(links);
      setLastSaved(`บันทึกแล้ว ${changedIds.length} ข้อ`);
    } finally {
      setSavingQuestionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-black/30 text-xs py-8 justify-center">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lastSaved && (
        <div
          className="text-[10px] px-2.5 py-1 rounded-md inline-block"
          style={{
            color: "#1a7a4c",
            background: "rgba(26,122,76,0.06)",
            border: "1px solid rgba(26,122,76,0.15)",
          }}
        >
          ✓ {lastSaved}
        </div>
      )}

      {/* ── Base URL — ค่าเดียวใช้ร่วมกันทุกคำถาม ── */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
          Canva Base URL (ไฟล์เดียวกันทุกคำถาม — กรอกแค่ครั้งเดียว)
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://www.canva.com/design/XXXXX/YYYYY/view?embed"
          className="w-full rounded-lg px-3 py-2.5 text-xs outline-none border border-black/[0.08] focus:border-black/20 placeholder:text-black/25 font-mono"
        />
        <p className="text-[10px] text-black/30">
          อย่าใส่ <span className="font-mono">#เลขหน้า</span> ต่อท้ายตรงนี้ —
          ระบบจะเติมให้เองจากเลขหน้าที่กรอกด้านล่าง แล้วบันทึกรวมเป็น URL
          เต็มให้อัตโนมัติ
        </p>
        {inconsistentCount > 0 && (
          <div className="flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              มี {inconsistentCount} คำถามที่เคยบันทึกด้วย base URL อื่น — ถ้ากด
              &quot;บันทึก&quot; ที่ข้อนั้นๆ อีกครั้ง จะถูกเปลี่ยนมาใช้ base URL
              ปัจจุบันแทน
            </span>
          </div>
        )}
      </div>

      <div className="h-px bg-black/[0.06]" />

      {/* ── ตารางเลขหน้าต่อคำถาม ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-[0.15em] text-black/30 block">
            เลขหน้า Canva ต่อคำถาม
          </label>
          <button
            onClick={handleSaveAll}
            disabled={!anyChanged || savingQuestionId === -1}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all disabled:cursor-not-allowed"
            style={{
              background: anyChanged ? "rgba(237,130,64,0.10)" : "transparent",
              color: anyChanged ? ORANGE : "rgba(0,0,0,0.25)",
              border: `1px solid ${
                anyChanged ? "rgba(237,130,64,0.3)" : "rgba(0,0,0,0.08)"
              }`,
            }}
          >
            {savingQuestionId === -1
              ? "กำลังบันทึกทั้งหมด..."
              : "บันทึกที่แก้ไขทั้งหมด"}
          </button>
        </div>

        {categories.length === 0 ? (
          <p className="text-[11px] text-black/30 italic py-4 text-center">
            ยังไม่มีหมวดคำถาม
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="border border-black/[0.07] rounded-lg overflow-hidden"
              >
                <div className="px-4 py-2 bg-black/[0.02] border-b border-black/[0.06] text-[11px] font-medium text-black/60">
                  {cat.name}
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[...cat.questions]
                    .sort((a, b) => a.number - b.number)
                    .map((q) => {
                      const raw = pages[q.id] ?? "";
                      const changed = isChanged(q.id);
                      return (
                        <div
                          key={q.id}
                          className="flex items-center gap-1.5 rounded-lg border border-black/[0.07] px-2.5 py-2"
                        >
                          <span className="text-[11px] text-black/40 font-medium w-11 shrink-0">
                            ข้อ {q.number}
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={raw}
                            onChange={(e) =>
                              handlePageChange(q.id, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSavePage(q.id);
                            }}
                            placeholder="เลขหน้า"
                            className="w-16 rounded-md px-2 py-1 text-xs outline-none border border-black/[0.08] focus:border-black/20 text-center"
                          />
                          <button
                            onClick={() => handleSavePage(q.id)}
                            disabled={!changed || savingQuestionId === q.id}
                            className="ml-auto shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:cursor-not-allowed"
                            style={{
                              background: changed
                                ? "rgba(237,130,64,0.12)"
                                : "transparent",
                              color: changed ? ORANGE : "rgba(0,0,0,0.15)",
                            }}
                            title="บันทึกข้อนี้"
                          >
                            {savingQuestionId === q.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CanvaLinkManager;
