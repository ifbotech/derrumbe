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
  /** En campaña, el anfitrión aporta sus mejoras de la Orden, el Reinado, la baraja, sus cartas legendarias y, si quiere, una semilla. */
  | ({ t: 'start' } & RunOpts)
  | { t: 'action'; action: Action }
  /** Decisiones de campaña (mapa, Botín, Mercado clandestino, secretos, orden de las reliquias): solo el anfitrión. */
  | { t: 'run'; action: RunAction }
  /** Seña: cualquiera de la conjura señala una ruta, una oferta, una carta o un trono. */
  | { t: 'ping'; target: string }
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
  /** La campaña, sin el estado del azar ni la semilla (ver publicRun). */
  | { t: 'run'; run: Run }
  /** La seña de un jugador (una a la vez por jugador; target vacío la borra). */
  | { t: 'ping'; player: string; target: string }
  | { t: 'left' }
  | { t: 'error'; message: string };
