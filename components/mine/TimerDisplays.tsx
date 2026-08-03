"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadTimerState, subscribeToTimer, type TimerState, type TimerTable } from '@/lib/timer';
import { useCountdown } from '@/hooks/useCountdown';

function useTimerState(table: TimerTable) {
  const [state, setState] = useState<TimerState | null>(null);

  useEffect(() => {
    loadTimerState(table).then(setState);
    const channel = subscribeToTimer(table, setState);
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table]);

  return state;
}

// ── มุมขวาบน: จับเวลา "ทำข้อสอบ" ──
export function TimerTopRight() {
  const timerState = useTimerState('answer_timer');
  const { remaining, progress, status } = useCountdown(timerState);

  if (!timerState || status === 'idle') return null;

  const isTimeUp = status === 'running' && remaining <= 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: isTimeUp ? 24 : 32,
          color: isTimeUp ? '#f87171' : '#ED8240',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        {isTimeUp ? "Time's up" : `${mm}:${ss}`}
      </span>
      {!isTimeUp && (
        <div
          style={{
            width: 140,
            height: 5,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.15)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #ED8240, #F0B65C)',
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── นาฬิกาวงกลม: จับเวลา "ประมูล" ──
export function TimerCircular({ size = 330 }: { size?: number }) {
  const timerState = useTimerState('bidding_timer');
  const { remaining, progress, status } = useCountdown(timerState);

  if (!timerState || status === 'idle') return null;

  const isTimeUp = status === 'running' && remaining <= 0;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
        test
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isTimeUp ? '#f87171' : '#ED8240'}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={isTimeUp ? 0 : offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 900,
          fontSize: isTimeUp ? size * 0.13 : size * 0.26,
          color: isTimeUp ? '#f87171' : '#fff',
          padding: '0 6px',
        }}
      >
        {isTimeUp ? "Time's up" : remaining}
      </span>
    </div>
  );
}