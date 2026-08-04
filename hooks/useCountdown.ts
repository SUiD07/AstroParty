"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TimerState } from '@/lib/timer';
import { getServerNow } from '@/lib/serverTime';

export function useCountdown(timerState: TimerState | null) {
  const [remaining, setRemaining] = useState(0);

  const recalc = useCallback(() => {
    if (!timerState) return;

    if (timerState.status === 'running' && timerState.end_at) {
      const diff = Math.max(0, new Date(timerState.end_at).getTime() - getServerNow());
      setRemaining(Math.ceil(diff / 1000));
      return;
    }

    // ★ paused — ใช้ค่าที่ค้างไว้ตอนกดหยุด ไม่นับต่อ
    if (timerState.status === 'paused') {
      setRemaining(timerState.remaining_seconds ?? timerState.duration_seconds);
      return;
    }

    // idle / input
    setRemaining(timerState.duration_seconds);
  }, [timerState]);

  useEffect(() => {
    recalc();
    const interval = setInterval(recalc, 100);
    const onVisible = () => {
      if (document.visibilityState === 'visible') recalc();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [recalc]);

  // ★ duration_seconds คงที่เสมอ (ไม่ถูกเขียนทับตอน pause) จึงใช้เป็นตัวหาร
  // progress ได้ถูกต้องไม่ว่าจะ running หรือ paused
  const duration = timerState?.duration_seconds || 1;
  const progress = duration > 0 ? remaining / duration : 0;

  return { remaining, progress, status: timerState?.status ?? 'idle' };
}