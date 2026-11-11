// Mensajes JSON que viajan por el WebSocket (/ws).
import type { Action, Difficulty, GameEvent, PlayerView } from '../rules/engine';

export type ClientMsg =
  | { t: 'create'; name: string }
  | { t: 'join'; room: string; name: string }
  | { t: 'rejoin'; room: string; playerId: string; token: string }
  | { t: 'difficulty'; value: Difficulty }
  | { t: 'start' }
  | { t: 'action'; action: Action }
  | { t: 'lobby' } // el anfitrión devuelve la sala al vestíbulo tras terminar
  | { t: 'leave' };

export interface LobbyInfo {
  room: string;
  host: string;
  difficulty: Difficulty;
  inGame: boolean;
  players: { id: string; name: string; connected: boolean }[];
}

export type ServerMsg =
  | { t: 'joined'; room: string; playerId: string; token: string }
  | { t: 'lobby'; lobby: LobbyInfo }
  | { t: 'state'; view: PlayerView; events: GameEvent[] }
  | { t: 'left' }
  | { t: 'error'; message: string };
