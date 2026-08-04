"use client";

import { useEffect, useState } from 'react';
import {
  loadTimerState,
  subscribeToTimer,
  saveTimerDuration,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  unsubscribe,
  type TimerState,
  type TimerTable,
} from '@/lib/timer';
import { useCountdown } from '@/hooks/useCountdown';

interface TimerAdminControlProps {
  table: TimerTable;
  title: string;
  defaultSeconds?: number;
}

function toMMSS(totalSeconds: number) {
  return {
    mm: Math.floor(Math.max(0, totalSeconds) / 60),
    ss: Math.max(0, totalSeconds) % 60,
  };
}

export function TimerAdminControl({
  table,
  title,
  defaultSeconds = 0,
}: TimerAdminControlProps) {
  const [state, setState] = useState<TimerState | null>(null);
  const [mm, setMm] = useState(0);
  const [ss, setSs] = useState(0);

  useEffect(() => {
    loadTimerState(table).then((s) => {
      setState(s);
      const initialSeconds = s.duration_seconds > 0 ? s.duration_seconds : defaultSeconds;
      const t = toMMSS(initialSeconds);
      setMm(t.mm);
      setSs(t.ss);
    });
    const channel = subscribeToTimer(table, (s) => {
      setState(s);
      if (s.status === 'input') {
        const t = toMMSS(s.duration_seconds);
        setMm(t.mm);
        setSs(t.ss);
      }
    });
    return () => {
      unsubscribe(channel);
    };
  }, [table, defaultSeconds]);

  const { remaining, status } = useCountdown(state);
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isTimeUp = isRunning && remaining <= 0;
  const inputTotalSeconds = mm * 60 + ss;

  if (!state) return <div className="text-xs text-black/30">กำลังโหลด...</div>;

  const liveMM = String(Math.floor(Math.max(0, remaining) / 60)).padStart(2, '0');
  const liveSS = String(Math.max(0, remaining) % 60).padStart(2, '0');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-black/30">
          {title}
        </span>
        <span
          className="text-xs font-medium px-2 py-1 rounded-md"
          style={{
            background: isTimeUp
              ? 'rgba(220,38,38,0.1)'
              : isRunning
                ? 'rgba(26,122,76,0.1)'
                : isPaused
                  ? 'rgba(245,158,11,0.1)'
                  : 'rgba(0,0,0,0.05)',
            color: isTimeUp
              ? '#dc2626'
              : isRunning
                ? '#1a7a4c'
                : isPaused
                  ? '#d97706'
                  : 'rgba(0,0,0,0.4)',
          }}
        >
          {isTimeUp ? 'หมดเวลา' : isRunning ? 'กำลังจับเวลา' : isPaused ? 'หยุดชั่วคราว' : 'พร้อมกรอกเวลา'}
        </span>
      </div>

      {/* ช่องแสดง/กรอกเวลา */}
      {isTimeUp ? (
        <div className="py-3 text-center">
          <span className="text-2xl font-bold" style={{ color: '#dc2626' }}>
            Time&apos;s up
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            value={isRunning || isPaused ? liveMM : mm}
            onChange={(e) => setMm(Math.max(0, Number(e.target.value) || 0))}
            onWheel={(e) => e.currentTarget.blur()}
            disabled={isRunning || isPaused}
            className="w-16 rounded-lg border border-black/[0.08] px-2 py-2 text-center font-mono text-xl outline-none focus:border-black/20 disabled:bg-black/[0.03]"
          />
          <span className="font-mono text-xl">:</span>
          <input
            type="number"
            value={isRunning || isPaused ? liveSS : ss}
            onChange={(e) => setSs(Math.min(59, Math.max(0, Number(e.target.value) || 0)))}
            onWheel={(e) => e.currentTarget.blur()}
            disabled={isRunning || isPaused}
            className="w-16 rounded-lg border border-black/[0.08] px-2 py-2 text-center font-mono text-xl outline-none focus:border-black/20 disabled:bg-black/[0.03]"
          />
        </div>
      )}

      {/* ★ ปุ่ม — สลับชุดตามสถานะปัจจุบัน */}
      {status === 'input' || status === 'idle' ? (
        <div className="flex gap-2">
          <button
            onClick={() => saveTimerDuration(table, inputTotalSeconds)}
            className="flex-1 rounded-lg border border-black/[0.1] py-2.5 text-xs font-medium text-black/60"
          >
            บันทึก
          </button>
          <button
            onClick={() => startTimer(table, inputTotalSeconds)}
            disabled={inputTotalSeconds <= 0}
            className="flex-1 rounded-lg py-2.5 text-xs font-medium text-white disabled:opacity-40"
            style={{ background: '#1a7a4c' }}
          >
            ▶ จับเวลา
          </button>
        </div>
      ) : isRunning && !isTimeUp ? (
        <div className="flex gap-2">
          <button
            onClick={() => pauseTimer(table, remaining)}
            className="flex-1 rounded-lg py-2.5 text-xs font-medium text-white"
            style={{ background: '#d97706' }}
          >
            ❚❚ หยุดชั่วคราว
          </button>
          <button
            onClick={() => resetTimer(table, defaultSeconds)}
            className="flex-1 rounded-lg py-2.5 text-xs font-medium text-white"
            style={{ background: '#AA4229' }}
          >
            ↺ รีเซ็ต
          </button>
        </div>
      ) : isPaused ? (
        <div className="flex gap-2">
          <button
            onClick={() => resumeTimer(table, state.remaining_seconds ?? 0)}
            className="flex-1 rounded-lg py-2.5 text-xs font-medium text-white"
            style={{ background: '#1a7a4c' }}
          >
            ▶ ทำต่อ
          </button>
          <button
            onClick={() => resetTimer(table, defaultSeconds)}
            className="flex-1 rounded-lg py-2.5 text-xs font-medium text-white"
            style={{ background: '#AA4229' }}
          >
            ↺ รีเซ็ต
          </button>
        </div>
      ) : (
        // isTimeUp — เหลือแค่รีเซ็ตอย่างเดียว
        <button
          onClick={() => resetTimer(table, defaultSeconds)}
          className="w-full rounded-lg py-2.5 text-xs font-medium text-white"
          style={{ background: '#AA4229' }}
        >
          ↺ รีเซ็ต
        </button>
      )}
    </div>
  );
}