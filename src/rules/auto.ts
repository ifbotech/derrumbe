// AUTO (V12, SPECS/V12.md apartado 1.7): el paso siguiente que daría el bot de referencia, el mismo que juega
// las campañas del laboratorio (`chooseAction` en la mesa y `chooseRunAction` en la campaña). Ninguna IA nueva.
// AUTO juega los asaltos y pulsa lo que no tiene decisión (abrir el Sobre, entrar al asalto con monarca); el
// Botín y la Selección los elige solo con Auto-saquear; La Taberna, la ruta del Mapa y los Secretos, solo con
// Auto-taberna. Lo que no cubre lo deja en pausa (AUTO sigue encendido y espera). En cooperativo no hay AUTO.
//
// Puro: no aplica nada, solo dice qué haría. El cliente (src/client/auto.ts, de juice-ux) lo aplica.
import { chooseAction, chooseRunAction } from './bot';
import type { Action, GameState } from './engine';
import { Run, RunAction, stageDef } from './run';

export interface AutoCtx {
  run: Run;
  /** La mesa del asalto en curso (null fuera de la mesa). */
  state: GameState | null;
  playerId: string;
  /** Cooperativo: se juega a mano. */
  coop: boolean;
}
export interface AutoOpts {
  /** Auto-saquear: elige el Botín (reliquia del monarca), la Selección y la Bendición (V40 1c). */
  saquear: boolean;
  /** Auto-taberna: compra en La Taberna, elige ruta en el Mapa y opción en los Secretos. */
  taberna: boolean;
}
export type MotivoPausa = 'botin' | 'bendicion' | 'taberna' | 'mapa' | 'secreto' | 'fin' | 'coop';
export type PasoAuto = { t: 'mesa'; action: Action } | { t: 'campana'; action: RunAction } | { t: 'pausa'; motivo: MotivoPausa };

/** Clave del aviso de una línea de cada pausa (`auto.pausa.<motivo>`, en los dos idiomas). */
export const avisoPausa = (m: MotivoPausa): string => `auto.pausa.${m}`;

/**
 * El paso siguiente de AUTO. null: no hay nada que hacer ahora (la mesa ya no está en juego y falta cerrar el
 * asalto con `finishBattle`, o no es el turno de `playerId`).
 */
export function pasoAuto(ctx: AutoCtx, opts: AutoOpts): PasoAuto | null {
  const { run, state } = ctx;
  if (ctx.coop) return { t: 'pausa', motivo: 'coop' };
  if (run.phase === 'won' || run.phase === 'lost') return { t: 'pausa', motivo: 'fin' };
  if (run.phase === 'battle') {
    if (!state || state.phase !== 'playing') return null;
    if (state.players[state.turn]?.id !== ctx.playerId) return null;
    return { t: 'mesa', action: chooseAction(state) };
  }
  const decide = (motivo: MotivoPausa, puede: boolean): PasoAuto => {
    if (!puede) return { t: 'pausa', motivo };
    const action = chooseRunAction(run);
    return action ? { t: 'campana', action } : { t: 'pausa', motivo: 'fin' };
  };
  switch (run.phase) {
    case 'pack':
      return decide('fin', true);
    case 'map':
      // con monarca no hay ruta que elegir: se entra al asalto
      return decide('mapa', stageDef(run.stage).boss || opts.taberna);
    case 'reward':
      return decide('botin', opts.saquear);
    // V40 1c · la Bendición se elige como el Botín: con Auto-saquear
    case 'bendicion':
      return decide('bendicion', opts.saquear);
    case 'shop':
      return decide('taberna', opts.taberna);
    // V40 1f · el Fogón es un servicio como La Pulpería: con Auto-taberna (antes no tenía caso y AUTO se quedaba quieto)
    case 'fogon':
      return decide('taberna', opts.taberna);
    case 'event':
      return decide('secreto', opts.taberna);
  }
  return null;
}
