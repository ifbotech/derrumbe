// Ganchos de control de calidad de juice-ux (solo con ?qa). La prueba de humo juega una campaña de cinco
// asaltos con el bot y mide el tiempo real de cada jugada y de cada entreacto: para que llegue siempre al
// Salón del Trono, `heal()` devuelve la Vida al tope antes de cada jugada (no cambia lo que se anima, solo
// que nadie muere por el camino). No toca el guardado de verdad: con ?qa, platform es de quita y pon.
// V12: la Mejor jugada que propone el motor y lo que ha hecho AUTO (pasos, pausas y tiempos de apagado).
import { mejorJugada } from '../rules/mejor-jugada';
import { autoDiag, autoQa } from './auto';
import { RUN_PLAYER, S, settings } from './core';
import { serverError } from './net';
import { meta } from './guild';
import { arbolVista } from './arbol';

export function installQaJuice(): void {
  Object.assign(window, {
    __qaJuice: {
      /** Vida al tope en la mesa de campaña. Devuelve si había mesa. */
      heal: () => {
        const st = S.campaign?.state;
        if (!st || st.phase !== 'playing') return false;
        st.integrity = st.config.maxIntegrity;
        return true;
      },
      /** Tronos presentes en la mesa de ahora (el asalto 1 tiene dos; el 2, tres). */
      thrones: () => {
        const st = S.campaign?.state;
        return st ? Object.values(st.towers).filter((t) => !t.away).length : 0;
      },
      /** El título del asalto en curso: si es el del Rey Tirano (o la Reina Tirana). */
      stage: () => S.campaign?.run.stage ?? 0,
      /** Lo que hace el cliente con un aviso de error del servidor (p. ej. el rechazo de versión): un aviso en el idioma de la mesa. */
      serverError,
      /** V12: la Mejor jugada del motor en la mesa de ahora (lo que el botón, Q y LT deben elegir). */
      mejor: () => {
        const st = S.campaign?.state;
        return st && st.phase === 'playing' ? mejorJugada(st, RUN_PLAYER) : null;
      },
      /** V12: lo elegido ahora mismo en la mesa y la fase/turno (para ver que Mejor jugada no golpea). */
      mesa: () => ({ selected: [...S.selected], turn: S.campaign?.state?.turnCount ?? -1, phase: S.campaign?.state?.phase ?? null }),
      /** V12: AUTO (encendido, Auto-saquear, Auto-taberna) y lo que ha hecho. */
      auto: () => ({ on: settings.auto, saquear: settings.autoSaquear, taberna: settings.autoTaberna, speed: settings.speed, ...autoQa, pausas: [...autoQa.pausas], apagados: [...autoQa.apagados] }),
      /** V12: por qué AUTO no avanza (diagnóstico de una prueba atascada). */
      autoDiag,
      /** V12: el saldo y los rangos del Árbol (para ver que navegar no compra y que A en «Comprar» sí). */
      meta: () => ({ renown: meta.renown, up: { ...meta.up } }),
      /** V12: zum y nivel de detalle del Árbol. */
      arbol: () => ({ zum: arbolVista.zumActual, nivel: arbolVista.nivel }),
      /** V12: pone Auto-saquear, Auto-taberna y la velocidad (lo que el jugador haría en Ajustes y en la barra). */
      autoOpts: (o: { saquear?: boolean; taberna?: boolean; speed?: 1 | 2 | 4 | 8 }) => {
        if (o.saquear !== undefined) settings.autoSaquear = o.saquear;
        if (o.taberna !== undefined) settings.autoTaberna = o.taberna;
        if (o.speed) settings.speed = o.speed;
      },
    },
  });
}
