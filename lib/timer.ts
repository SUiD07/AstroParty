import { supabase } from './supabase';

export interface TimerState {
  id: number;
  status: 'idle' | 'input' | 'running';
  duration_seconds: number;
  end_at: string | null;
  updated_at: string;
}

export type TimerTable = 'bidding_timer' | 'answer_timer';

export async function loadTimerState(table: TimerTable): Promise<TimerState> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data as TimerState;
}

// ★ บันทึกเวลาที่กรอก — ยังไม่เริ่มนับ แค่ให้ผู้ชมเห็นว่าแอดมินตั้งค่าแล้ว
export async function saveTimerDuration(table: TimerTable, durationSeconds: number) {
  const { error } = await supabase
    .from(table)
    .update({
      status: 'input',
      duration_seconds: durationSeconds,
      end_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) throw error;
}

// เริ่มนับถอยหลังจริง
export async function startTimer(table: TimerTable, durationSeconds: number) {
  const endAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
  const { error } = await supabase
    .from(table)
    .update({
      status: 'running',
      duration_seconds: durationSeconds,
      end_at: endAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) throw error;
}

// ★ หยุด — กลับไปแก้เวลาใหม่ได้ (duration_seconds คงค่าเดิมไว้ให้แก้ต่อ)
export async function stopTimer(table: TimerTable) {
  const { error } = await supabase
    .from(table)
    .update({
      status: 'input',
      end_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) throw error;
}

export function subscribeToTimer(
  table: TimerTable,
  cb: (state: TimerState) => void,
) {
  return supabase
    .channel(`${table}_changes-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table, filter: 'id=eq.1' },
      (payload) => cb(payload.new as TimerState),
    )
    .subscribe();
}

export { unsubscribe } from './db';