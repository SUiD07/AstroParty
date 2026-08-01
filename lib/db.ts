import { supabase } from './supabase';
import { RaceData, Team, GameStatus } from '@/app/types';
import { RealtimeChannel } from '@supabase/supabase-js';

// ---- Types ----
export interface ScoreEvent {
  id: number;
  team_id: string;
  category_id: number;
  question_id: number;
  delta: number;
  note: string | null;
  created_at: string;
  // joined
  team_name?: string;
  team_color?: string;
  category_name?: string;
  question_number?: number;
  question_points?: number;   // เพิ่ม
}

// ---- Load ----
export async function loadData(): Promise<RaceData> {
  const [{ data: teams }, { data: scores }, { data: gameState }] = await Promise.all([
    supabase.from('teams').select('*'),
    supabase.from('team_scores').select('*'),
    supabase.from('game_state').select('*').eq('id', 1).single(),
  ]);

  return {
    teams: teams ?? [],
    positions: (scores ?? []).map(s => ({ teamId: s.team_id, score: s.score })),
    state: gameState ?? { status: 'idle', round: 1 },
  };
}

// ---- Teams ----
export function subscribeToTeams(callback: () => void) {
  return supabase
    .channel("teams-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "teams" },
      callback,
    )
    .subscribe();
}
export async function saveTeam(team: Team) {
  await supabase.from('teams').upsert(team);
}

export async function deleteTeam(id: string) {
  await supabase.from('teams').delete().eq('id', id);
}

// ---- Game State ----
export async function updateGameState(patch: Partial<{ status: GameStatus; round: number }>) {
  await supabase.from('game_state').update(patch).eq('id', 1);
}

export async function resetScores() {
  await supabase.from('score_events').delete().neq('id', 0);
  await supabase.from('game_state').update({ status: 'idle' }).eq('id', 1);
}

// ---- Categories ----
export async function loadCategories() {
  const { data } = await supabase
    .from('categories')
    .select('*, questions(*)')
    .order('position');
  return data ?? [];
}

// subscribe ให้ callback ทำงานทุกครั้งที่ score_events เปลี่ยน
export function subscribeToScoreEvents(callback: () => void) {
  const channel = supabase
    .channel('score-events-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'score_events',
      },
      callback
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
// ---- Score Events ----
export async function addScoreEvent(
  teamId: string,
  categoryId: number,
  questionId: number,
  delta: number,
  note?: string
) {
  const { error } = await supabase.from('score_events').insert({
    team_id: teamId,
    category_id: categoryId,
    question_id: questionId,
    delta,
    note: note ?? null,
  });
  if (error) throw error;
}

export async function deleteScoreEvent(eventId: number) {
  const { error } = await supabase
    .from('score_events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
}

export async function loadScoreEvents(): Promise<ScoreEvent[]> {
  const { data, error } = await supabase
    .from('score_events')
    .select(`
      id,
      team_id,
      category_id,
      question_id,
      delta,
      note,
      created_at,
      teams ( name, color ),
      categories ( name ),
      questions ( number )
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((e: any) => ({
    id: e.id,
    team_id: e.team_id,
    category_id: e.category_id,
    question_id: e.question_id,
    delta: e.delta,
    note: e.note,
    created_at: e.created_at,
    team_name: e.teams?.name,
    team_color: e.teams?.color,
    category_name: e.categories?.name,
    question_number: e.questions?.number,
    // question_points: e.questions?.points,  
  }));
}
//score audit matrix
export async function getAuditMatrix() {
  const { data, error } = await supabase
    .from('score_events')
    .select(`
      id,
      team_id,
      delta,
      created_at,
      teams ( name, color ),
      categories ( name ),
      questions ( number )
    `)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((e: any) => ({
    id: e.id,
    team_id: e.team_id,
    team_name: e.teams?.name,
    team_color: e.teams?.color,
    category_name: e.categories?.name,
    question_number: e.questions?.number,
    delta: e.delta,
    created_at: e.created_at,
  }));
}
// ---- Canva Links ----
export async function loadCanvaLinks(): Promise<Record<number, string>> {
  const { data } = await supabase
    .from("questions")
    .select("id, canva_url")
    .not("canva_url", "is", null);
  if (!data) return {};
  return Object.fromEntries(data.map((r) => [r.id, r.canva_url]));
}

export async function saveCanvaLink(questionId: number, url: string) {
  await supabase
    .from("questions")
    .update({ canva_url: url })
    .eq("id", questionId);
}

export async function deleteCanvaLink(questionId: number) {
  await supabase
    .from("questions")
    .update({ canva_url: null })
    .eq("id", questionId);
}

// ★ แยก URL เต็มของ Canva ออกเป็น base (ก่อน #) กับ page (หลัง #)
// ใช้ร่วมกันทั้งฝั่งแอดมิน (CanvaLinkManager, ControlPage) และฝั่ง viewer
// เพราะทุกคำถามใช้ไฟล์ Canva เดียวกัน ต่างกันแค่เลขหน้าท้าย URL
export function splitCanvaUrl(url: string): { base: string; page: string } {
  const idx = url.indexOf("#");
  if (idx === -1) return { base: url, page: "" };
  return { base: url.slice(0, idx), page: url.slice(idx + 1) };
}

/**
 *ฟังก์ชันจัดการ presentation_state
 * (คุมสไลด์ + highlight/เปิด modal คำถาม jeopardy จากหน้า /control)
  */

/**
 * เพิ่ม scroll_signal เข้าไปใน PresentationState
 * (ใช้ส่งสัญญาณ "เลื่อนให้ผู้ชมดูคะแนน" จากหน้า /control ไปยังทุกจอ viewer)
 *
 * ★ เพิ่ม canva_current_page — ใช้ควบคุม "เลื่อนหน้า Canva ของ modal ที่เปิดอยู่"
 * จากหน้า /control โดยไม่ต้องปิด-เปิด modal ใหม่ (แยกอิสระจากเลขหน้าเริ่มต้น
 * ที่ตั้งไว้ล่วงหน้าใน CanvaLinkManager ต่อคำถาม) ค่า null = ยังไม่ override
 * ให้ viewer ใช้เลขหน้าเริ่มต้นของคำถามนั้นตามปกติ
 *
 * ★ เพิ่ม scroll_top_signal — ตรงข้ามกับ scroll_signal คือส่งสัญญาณ
 * "เลื่อนกลับขึ้นไปดูโจทย์ (Canva)" จากหน้า /control ไปยังทุกจอ viewer
 * (ใช้ pattern increment เหมือน scroll_signal เดิม)
 */

export interface PresentationState {
  current_slide: number;
  highlighted_question_id: number | null;
  modal_open: boolean;
  scroll_signal: number;
  scroll_top_signal: number;
  scroll_board_signal: number;
  canva_current_page: number | null;
  updated_at: string;
}

export async function loadPresentationState(): Promise<PresentationState> {
  const { data, error } = await supabase
    .from("presentation_state")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data as PresentationState;
}

export async function updatePresentationState(
  patch: Partial<
    Pick<
      PresentationState,
      | "current_slide"
      | "highlighted_question_id"
      | "modal_open"
      | "scroll_signal"
      | "scroll_top_signal"
      | "scroll_board_signal"
      | "canva_current_page"
    >
  >,
) {
  const { error } = await supabase
    .from("presentation_state")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

export function subscribeToPresentationState(
  cb: (state: PresentationState) => void,
) {
  return supabase
    .channel("presentation_state_changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "presentation_state",
        filter: "id=eq.1",
      },
      (payload) => cb(payload.new as PresentationState),
    )
    .subscribe();
}

/**
 * ฟังก์ชันแก้ไข score event ที่มีอยู่แล้วแบบ UPDATE จริง
 * (ไม่ใช่ลบแล้วสร้างใหม่ — id และ created_at ของ record เดิมยังคงอยู่)
 */

export async function updateScoreEvent(
  id: number,
  delta: number,
  note: string,
) {
  const { error } = await supabase
    .from("score_events")
    .update({ delta, note })
    .eq("id", id);
  if (error) throw error;
}

// ---- Canva Page Presets ----
// ★ preset เลขหน้า Canva ที่ใช้บ่อย (เช่น "time up" หน้า 100, "buffer" หน้า 101)
// แยกจาก canva_current_page ใน presentation_state เพราะนี่คือ "รายการชื่อ+เลขหน้า"
// ที่ผู้ใช้ตั้งเองไว้ล่วงหน้า ไม่ใช่ state ของการนำเสนอ ณ ขณะนั้น
// ปุ่ม Quick Jump ที่ยิงจาก preset นี้ จะไปเขียนทับ canva_current_page ตัวเดิม
// (ดู applyPreset ใน ControlPage.tsx) จึงทำงานสอดคล้องกับปุ่ม ◀/▶ เดิมเป๊ะๆ
export interface CanvaPagePreset {
  id: number;
  label: string;
  page_number: number;
}
 
export async function loadCanvaPagePresets(): Promise<CanvaPagePreset[]> {
  const { data, error } = await supabase
    .from("canva_page_presets")
    .select("*")
    .order("page_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
 
export async function createCanvaPagePreset(
  label: string,
  pageNumber: number,
): Promise<CanvaPagePreset> {
  const { data, error } = await supabase
    .from("canva_page_presets")
    .insert({ label, page_number: pageNumber })
    .select()
    .single();
  if (error) throw error;
  return data as CanvaPagePreset;
}
 
export async function deleteCanvaPagePreset(id: number) {
  const { error } = await supabase
    .from("canva_page_presets")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
 