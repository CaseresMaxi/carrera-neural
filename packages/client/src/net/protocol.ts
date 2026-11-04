import type { FactionId, GameView, Move } from '@sotobosque/engine';

export const APP_ID = 'carrera-neural-3d-v1';

export interface LobbySeat {
  faction: FactionId;
  name: string;
  /** playerId estable del dueño del asiento (localStorage). */
  ownerId: string | null;
  connected: boolean;
}

export interface LobbyInfo {
  roomCode: string;
  seats: LobbySeat[];
  started: boolean;
}

export type ToHost =
  | { t: 'hello'; name: string; playerId: string }
  | { t: 'claim'; seat: number }
  | { t: 'intent'; move: Move; seq: number }
  | { t: 'undo' };

export type ToPeer =
  | { t: 'lobby'; lobby: LobbyInfo }
  | { t: 'state'; view: GameView; seat: number | null; canUndo: boolean; seq: number }
  | { t: 'reject'; error: string };

export function genRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  const buf = crypto.getRandomValues(new Uint32Array(5));
  for (const n of buf) s += alphabet[n % alphabet.length];
  return s;
}

export function getPlayerId(): string {
  let id = localStorage.getItem('carrera-neural.playerId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('carrera-neural.playerId', id);
  }
  return id;
}
