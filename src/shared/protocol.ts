// Mensajes JSON que viajan por el WebSocket (/ws).
import type { Action, Difficulty, GameEvent, PlayerView } from '../rules/engine';
import type { Run, RunAction, RunOpts } from '../rules/run';

export type Mode = 'clasica' | 'campana';

/**
 * Versión del protocolo (V12: la campaña que viaja lleva esquirlas, gotas, lo que cae y la tirada de huesos;
 * edición de reglas-balance, bloque B). `create`, `join` y `rejoin` la llevan en `v`; el servidor no deja entrar
 * a un cliente de otra versión (ni a uno sin `v`, como la 10.0; la 11.0 llevaba 11).
 */
export const PROTOCOL_VERSION = 12;

export type ClientMsg =
  | { t: 'create'; name: string; v: number }
  | { t: 'join'; room: string; name: string; v: number }
  | { t: 'rejoin'; room: string; playerId: string; token: string; v: number }
  | { t: 'difficulty'; value: Difficulty }
  | { t: 'mode'; value: Mode }
  /** En campaña, el anfitrión aporta sus mejoras de la Orden, el Reinado, la baraja, sus cartas legendarias y, si quiere, una semilla. */
  | ({ t: 'start' } & RunOpts)
  | { t: 'action'; action: Action }
  /** Decisiones de campaña (mapa, Botín, la Taberna, secretos, orden de las reliquias): solo el anfitrión. */
  | { t: 'run'; action: RunAction }
  /** Seña: cualquiera de la conjura señala una ruta, una oferta, una carta o un trono. */
  | { t: 'ping'; target: string }
  | { t: 'lobby' } // el anfitrión devuelve la sala al vestíbulo tras terminar
  /** V9: el resumen del estado no cuadró en el cliente; el servidor reenvía el estado entero (y la campaña). */
  | { t: 'resync' }
  | { t: 'leave' };

/** Un mensaje tal como lo escribe el cliente: `sendMsg` le pone la versión a los que la llevan. */
export type ClientMsgSinVersion = ClientMsg extends infer M ? (M extends { v: number } ? Omit<M, 'v'> : M) : never;

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
  /** `hash`: stateHash(view) (src/rules/state-hash.ts), para que el cliente compruebe que lo que tiene es lo que se envió. */
  | { t: 'state'; view: PlayerView; events: GameEvent[]; hash: string }
  /** La campaña, sin el estado del azar ni la semilla (ver publicRun). */
  | { t: 'run'; run: Run }
  /** La seña de un jugador (una a la vez por jugador; target vacío la borra). */
  | { t: 'ping'; player: string; target: string }
  | { t: 'left' }
  | { t: 'error'; message: string };
