import { supabase } from './supabase';
import { RaceData } from '@/app/types';

export async function loadData(): Promise<RaceData> {
  const [{ data: teams }, { data: positions }, { data: gameState }] = await Promise.all([
    supabase.from('teams').select('*'),
    supabase.from('positions').select('*'),
    supabase.from('game_state').select('*').eq('id', 1).single(),
  ]);

  return {
    teams: teams ?? [],
    positions: (positions ?? []).map(p => ({ teamId: p.team_id, score: p.score })),
    state: gameState ?? { status: 'idle', round: 1 },
  };
}

export async function saveTeam(team: { id: string; name: string; color: string }) {
  await supabase.from('teams').upsert(team);
  await supabase.from('positions').upsert({ team_id: team.id, score: 0 });
}

export async function deleteTeam(id: string) {
  await supabase.from('teams').delete().eq('id', id);
  // positions ลบ cascade อัตโนมัติ
}

export async function updateScore(teamId: string, score: number) {
  await supabase.from('positions').update({ score }).eq('team_id', teamId);
}

export async function updateGameState(patch: Partial<{ status: string; round: number }>) {
  await supabase.from('game_state').update(patch).eq('id', 1);
}

export async function resetScores() {
  await supabase.from('positions').update({ score: 0 });
  await supabase.from('game_state').update({ status: 'idle' }).eq('id', 1);
}

// ดึง categories + questions
export async function loadCategories() {
  const { data } = await supabase
    .from('categories')
    .select('*, questions(*)')
    .order('position');
  return data ?? [];
}

// บันทึก score event + อัปเดต positions ในครั้งเดียว
export async function addScoreEvent(
  teamId: string,
  categoryId: number,
  questionId: number,
  delta: number
) {
  await supabase.from('score_events').insert({
    team_id: teamId,
    category_id: categoryId,
    question_id: questionId,
    delta,
  });
  // อัปเดต score สะสม
  const { data: pos } = await supabase
    .from('positions')
    .select('score')
    .eq('team_id', teamId)
    .single();
  const newScore = Math.max(0, (pos?.score ?? 0) + delta);
  await supabase.from('positions')
    .update({ score: newScore })
    .eq('team_id', teamId);
}

export async function loadScoreEvents() {
  const { data } = await supabase
    .from('score_events')
    .select('id, team_id, question_id, delta');
  return data ?? [];
}