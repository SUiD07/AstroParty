import { supabase } from './supabase';
import { getServerNow } from './serverTime';

export interface TimerState {
  id: number;
  status: 'idle' | 'input' | 'running' | 'paused'; // ★ เพิ่ม 'paused'
  duration_seconds: number;
  remaining_seconds: number | null; // ★ ใหม่
  end_at: string | null;
  updated_at: string;
}

export type TimerTable = 'bidding_timer' | 'answer_timer';

export async function loadTimerState(table: TimerTable): Promise<TimerState> {
  const { data, error } = await supabase.from(table).select('*').eq('id', 1).single();
  if (error) throw error;
  return data as TimerState;
}

export async function saveTimerDuration(table: TimerTable, durationSeconds: number) {
  const { error } = await supabase.from(table).update({
    status: 'input',
    duration_seconds: durationSeconds,
    remaining_seconds: null,
    end_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) throw error;
}

export async function startTimer(table: TimerTable, durationSeconds: number) {
  const endAt = new Date(getServerNow() + durationSeconds * 1000).toISOString();
  const { error } = await supabase.from(table).update({
    status: 'running',
    duration_seconds: durationSeconds,
    remaining_seconds: null,
    end_at: endAt,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) throw error;
}

// ★ หยุดชั่วคราว — เก็บเวลาที่เหลือไว้ ไม่แตะ duration_seconds เดิม
export async function pauseTimer(table: TimerTable, remainingSeconds: number) {
  const { error } = await supabase.from(table).update({
    status: 'paused',
    remaining_seconds: Math.max(0, Math.round(remainingSeconds)),
    end_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) throw error;
}

// ★ ทำต่อจากเวลาที่ค้างไว้ตอน pause
export async function resumeTimer(table: TimerTable, remainingSeconds: number) {
  const endAt = new Date(getServerNow() + remainingSeconds * 1000).toISOString();
  const { error } = await supabase.from(table).update({
    status: 'running',
    end_at: endAt,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) throw error;
}

// ★ ล้างทั้งหมด กลับไปเริ่มใหม่
export async function resetTimer(table: TimerTable, defaultSeconds = 0) {
  const { error } = await supabase.from(table).update({
    status: 'input',
    duration_seconds: defaultSeconds,
    remaining_seconds: null,
    end_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  if (error) throw error;
}

export function subscribeToTimer(table: TimerTable, cb: (state: TimerState) => void) {
  return supabase
    .channel(`${table}_changes-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter: 'id=eq.1' }, (payload) => cb(payload.new as TimerState))
    .subscribe();
}

export { unsubscribe } from './db';