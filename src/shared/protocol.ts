// Mensajes JSON que viajan por el WebSocket (/ws).
import type { Action, Difficulty, GameEvent, PlayerView } from '../rules/engine';
import type { Run, RunAction, RunOpts } from '../rules/run';

export type Mode = 'clasica' | 'campana';

export type ClientMsg =
  | { t: 'create'; name: string }
  | { t: 'join'; room: string; name: string }
  | { t: 'rejoin'; room: string; playerId: string; token: string }
  | { t: 'difficulty'; value: Difficulty }
  | { t: 'mode'; value: Mode }
  /** En campaña, el anfitrión aporta sus mejoras del gremio, el ascenso, la baraja y sus cartas legendarias. */
  | ({ t: 'start' } & RunOpts)
  | { t: 'action'; action: Action }
  /** Decisiones de campaña (sobre, recompensa, ferretería): solo el anfitrión. */
  | { t: 'run'; action: RunAction }
  | { t: 'lobby' } // el anfitrión devuelve la sala al vestíbulo tras terminar
  | { t: 'leave' };

export interface LobbyInfo {
  room: string;
  host: string;
  difficulty: Difficulty;
  mode: Mode;
  inGame: boolean;
  players: { id: string; name: string; connected: boolean }[];
}

export type ServerMsg =
  | { t: 'joined'; room: string; playerId: string; token: string }
  | { t: 'lobby'; lobby: LobbyInfo }
  | { t: 'state'; view: PlayerView; events: GameEvent[] }
  | { t: 'run'; run: Run }
  | { t: 'left' }
  | { t: 'error'; message: string };
