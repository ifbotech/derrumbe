// V12 · AUTO (SPECS/V12.md, apartado 1.7): `pasoAuto` juega con el bot de referencia. Con Auto-saquear y
// Auto-taberna, la campaña sale idéntica a la del laboratorio con la misma semilla; sin ellas, se para en el
// Botín y en La Taberna; en el Asalto diario y en cooperativo, pausa.
import { describe, expect, it } from 'vitest';
import { pasoAuto, avisoPausa, type AutoOpts } from '../src/rules/auto';
import { applyAction } from '../src/rules/engine';
import type { GameState } from '../src/rules/engine';
import { Run, finishBattle, newRun, runAction, startStage, trackEvents } from '../src/rules/run';
import { DICCIONARIOS } from '../src/shared/i18n';
import { playCampaign } from '../scripts/lab';

const P = [{ id: 'p0', name: 'p0' }];

/** Juega con pasoAuto hasta el final o hasta la primera pausa. */
function juega(run: Run, opts: AutoOpts): { run: Run; pausa: string | null } {
  let state: GameState | null = null;
  for (let guard = 0; guard < 20_000; guard++) {
    if (run.phase === 'battle' && !state) state = startStage(run, P);
    const paso = pasoAuto({ run, state, playerId: 'p0', diaria: false, coop: false }, opts);
    if (paso === null) {
      finishBattle(run, state!);
      state = null;
      continue;
    }
    if (paso.t === 'pausa') return { run, pausa: paso.motivo };
    if (paso.t === 'mesa') {
      const res = applyAction(state!, 'p0', paso.action);
      trackEvents(run, res.events);
      state = res.state;
    } else expect(runAction(run, paso.action)).toBeNull();
  }
  throw new Error('campaña sin fin');
}

describe('pasoAuto', () => {
  it('con Auto-saquear y Auto-taberna, la misma campaña que el laboratorio con la misma semilla', () => {
    for (const seed of [7919, 15838, 23757, 31676, 39595, 47514]) {
      const lab = playCampaign({ seed, deck: 'obra', ascension: 0, full: false }).run;
      const { run, pausa } = juega(newRun({ deck: 'obra', ascension: 0, pool: [], up: {} }, seed), { saquear: true, taberna: true });
      expect(pausa).toBe('fin');
      expect(run).toEqual(lab);
    }
  }, 120_000);

  it('sin ellas: se para en el Botín y en La Taberna (y juega los asaltos)', () => {
    const r1 = juega(newRun({}, 7919), { saquear: false, taberna: true });
    expect(['botin', 'fin']).toContain(r1.pausa);
    if (r1.pausa === 'botin') expect(r1.run.phase).toBe('reward');
    const r2 = juega(newRun({}, 7919), { saquear: true, taberna: false });
    expect(['taberna', 'fin', 'mapa']).toContain(r2.pausa);
    if (r2.pausa === 'taberna') expect(r2.run.phase).toBe('shop');
    // ganó al menos el primer asalto con AUTO
    expect(r1.run.stats.stageTurns.length).toBeGreaterThan(0);
  });

  it('el Asalto diario y el cooperativo: pausa; la campaña terminada: fin', () => {
    const run = newRun({}, 1);
    const o = { saquear: true, taberna: true };
    expect(pasoAuto({ run, state: null, playerId: 'p0', diaria: true, coop: false }, o)).toEqual({ t: 'pausa', motivo: 'diaria' });
    expect(pasoAuto({ run: newRun({ daily: '2026-11-15' }, 1), state: null, playerId: 'p0', diaria: false, coop: false }, o)).toEqual({ t: 'pausa', motivo: 'diaria' });
    expect(pasoAuto({ run, state: null, playerId: 'p0', diaria: false, coop: true }, o)).toEqual({ t: 'pausa', motivo: 'coop' });
    expect(pasoAuto({ run, state: null, playerId: 'p0', diaria: false, coop: false }, o)).toEqual({ t: 'campana', action: { t: 'begin', don: 0 } }); // V29: AUTO se queda con el primer Don de la Conjura
    run.phase = 'lost';
    expect(pasoAuto({ run, state: null, playerId: 'p0', diaria: false, coop: false }, o)).toEqual({ t: 'pausa', motivo: 'fin' });
  });

  it('cada pausa tiene su aviso de una línea en los dos idiomas', () => {
    for (const m of ['botin', 'taberna', 'mapa', 'secreto', 'fin', 'diaria', 'coop'] as const)
      for (const lang of ['es', 'en'] as const) {
        const t = DICCIONARIOS[lang][avisoPausa(m)];
        expect(t, `${lang} ${m}`).toBeTruthy();
        expect(t.length).toBeLessThanOrEqual(60);
      }
  });
});
