export type GameStatus = 'idle' | 'running' | 'finished';

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Position {
  teamId: string;
  score: number; // Absolute points
}

export interface GameState {
  status: GameStatus;
  round: number;
}

export interface RaceData {
  teams: Team[];
  positions: Position[];
  state: GameState;
}

export const INITIAL_DATA: RaceData = {
  teams: [],
  positions: [],
  state: {
    status: 'idle',
    round: 1
  }
};
