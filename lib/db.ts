import { supabase } from './supabase';
import { RaceData, Team, GameStatus } from '@/app/types';

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
