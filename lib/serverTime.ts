import { supabase } from './supabase';
import { useEffect } from 'react';

let offsetMs = 0; // serverTime - localTime

// ★ วิธีวัดแบบ NTP คร่าวๆ: จับเวลาก่อน-หลังยิง request แล้วประมาณ
// network latency ครึ่งหนึ่งของ round trip เพื่อลบผลจากความหน่วงเน็ตออก
export async function syncServerTimeOffset(): Promise<void> {
  const t0 = Date.now();
  const { data, error } = await supabase.rpc('get_server_time');
  const t1 = Date.now();
  if (error || !data) return; // ถ้า fail ใช้ offset เดิมไปก่อน

  const serverTimeRaw = new Date(data as string).getTime();
  const roundTrip = t1 - t0;
  const estimatedServerNow = serverTimeRaw + roundTrip / 2;
  offsetMs = estimatedServerNow - t1;
}

// ★ ใช้แทน Date.now() ทุกจุดที่เกี่ยวกับ timer
export function getServerNow(): number {
  return Date.now() + offsetMs;
}
// ★ hook กลาง — เรียกครั้งเดียวใน component ระดับบนสุดของแต่ละหน้า
// (ViewerDashboard, AdminPanel) แทนที่จะ copy useEffect เดิมซ้ำทุกที่
export function useServerTimeSync() {
  useEffect(() => {
    syncServerTimeOffset();
    const interval = setInterval(syncServerTimeOffset, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncServerTimeOffset();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}