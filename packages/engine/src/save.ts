import type { GameState } from './types';

export interface SeatInfo {
  name: string;
  playerId: string | null;
}

export interface SaveFile {
  format: 'carrera-neural-save';
  version: 1;
  savedAt: string;
  state: GameState;
  seats: SeatInfo[];
}

export function makeSave(state: GameState, seats: SeatInfo[]): SaveFile {
  return { format: 'carrera-neural-save', version: 1, savedAt: new Date().toISOString(), state, seats };
}

export function parseSave(json: string): SaveFile {
  const data = JSON.parse(json) as SaveFile;
  if (data?.format !== 'carrera-neural-save' || data.version !== 1 || !data.state?.glades)
    throw new Error('Archivo de partida inválido');
  return data;
}
