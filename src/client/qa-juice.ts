// Ganchos de control de calidad de juice-ux (solo con ?qa). La prueba de humo juega una campaña de cinco
// asaltos con el bot y mide el tiempo real de cada jugada y de cada entreacto: para que llegue siempre al
// Salón del Trono, `heal()` devuelve la Vida al tope antes de cada jugada (no cambia lo que se anima, solo
// que nadie muere por el camino). No toca el guardado de verdad: con ?qa, platform es de quita y pon.
import { S } from './core';
import { serverError } from './net';

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
    },
  });
}
