"use client";

import { useState, useEffect, useCallback } from 'react';
import type { TimerState } from '@/lib/timer';
import { getServerNow } from '@/lib/serverTime';

export function useCountdown(timerState: TimerState | null) {
  const [remaining, setRemaining] = useState(0);

  const recalc = useCallback(() => {
    if (!timerState) return;
    if (timerState.status !== 'running' || !timerState.end_at) {
      setRemaining(timerState.duration_seconds);
      return;
    }
    const diff = Math.max(0, new Date(timerState.end_at).getTime() - getServerNow()); // ★ เปลี่ยนจาก Date.now()
    setRemaining(Math.ceil(diff / 1000));
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

  const duration = timerState?.duration_seconds || 1;
  const progress = duration > 0 ? remaining / duration : 0;

  return { remaining, progress, status: timerState?.status ?? 'idle' };
}