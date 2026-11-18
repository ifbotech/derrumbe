// V12 · la tirada de huesos (SPECS/V12.md, apartado 1.4): caras enteras, reproducible, `run.rng` intacto,
// el producto de los Dados de la Corona y lo que abona `finishBattle`.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/rules/balance-config';
import { carasDe, multiplicadores, tirarHuesos } from '../src/rules/huesos';
import { finishBattle, newRun, runAction, startStage } from '../src/rules/run';
import { nextRandom } from '../src/rules/engine';
import { playCampaign } from '../scripts/lab';

describe('caras', () => {
  it('de serie: Dado de oro ×1 ×1 ×1 ×1 ×2 ×2 y Dado de la Corona ×1 ×1 ×1 ×2 ×2 ×3, uno de cada', () => {
    expect(carasDe(newRun({}, 1))).toEqual({ oro: [1, 1, 1, 1, 2, 2], corona: [1, 1, 1, 2, 2, 3], coronas: 1 });
    expect(BALANCE.huesos.oro).toEqual([1, 1, 1, 1, 2, 2]);
  });

  it('Hueso tallado, Cara del rey, Segundo hueso y, en el Trono infinito, Sangre real y Trono de huesos', () => {
    expect(carasDe(newRun({ up: { hueso_tallado: 1 } }, 1)).corona).toEqual([1, 1, 2, 2, 2, 3]);
    expect(carasDe(newRun({ up: { hueso_tallado: 5 } }, 1)).corona).toEqual([2, 2, 2, 3, 3, 3]);
    expect(carasDe(newRun({ up: { hueso_tallado: 5, cara_rey: 5 } }, 1)).corona).toEqual([2, 2, 2, 3, 3, 8]);
    expect(carasDe(newRun({ up: { segundo_hueso: 1 } }, 1)).coronas).toBe(2);
    const inf = newRun({ up: { sangre_real: 2, trono_huesos: 1, segundo_hueso: 1 } }, 1);
    expect(carasDe(inf)).toMatchObject({ corona: [1, 1, 1, 2, 2, 3], coronas: 2 });
    inf.endless = true;
    expect(carasDe(inf)).toMatchObject({ corona: [3, 3, 3, 4, 4, 5], coronas: 3 });
    // el Dado de oro no lo mejora nada
    expect(carasDe(inf).oro).toEqual([1, 1, 1, 1, 2, 2]);
  });

  it('todas las caras son enteras con cualquier Árbol', () => {
    for (let i = 0; i < 200; i++) {
      const st = { rng: i * 31 + 7 };
      const r = (n: number) => Math.floor(nextRandom(st) * (n + 1));
      const run = newRun({ up: { hueso_tallado: r(5), cara_rey: r(5), segundo_hueso: r(1), sangre_real: r(5), trono_huesos: r(1) } }, i);
      run.endless = !!r(1);
      const c = carasDe(run);
      for (const x of [...c.oro, ...c.corona]) expect(Number.isInteger(x) && x >= 1).toBe(true);
    }
  });
});

describe('tirada', () => {
  it('misma semilla, misma tirada (10.000 tiradas) y run.rng intacto', () => {
    const cuentas = new Array(6).fill(0);
    for (let i = 0; i < 10_000; i++) {
      const run = newRun({}, i * 7919 + 1);
      run.stage = 1 + (i % 7);
      run.caida = { oro: 3, esquirlas: 10, gotas: 0 };
      const rng = run.rng;
      const a = tirarHuesos(run);
      const b = tirarHuesos(structuredClone(run));
      expect(a).toEqual(b);
      expect(run.rng).toBe(rng);
      cuentas[a.huesos[0].sale]++;
      const m = multiplicadores(a);
      expect(Number.isInteger(m.oro) && Number.isInteger(m.corona)).toBe(true);
      expect(a.oro).toEqual({ base: 3, extra: 3 * (m.oro - 1) });
      expect(a.esquirlas).toEqual({ base: 10, extra: 10 * (m.corona - 1) });
    }
    // las seis caras salen (a ojo, 1/6 cada una)
    for (const n of cuentas) expect(n).toBeGreaterThan(1300);
  });

  it('con dos Dados de la Corona, sus caras se multiplican', () => {
    let visto = false;
    for (let i = 0; i < 200; i++) {
      const run = newRun({ up: { segundo_hueso: 1, cara_rey: 2 } }, i + 1);
      run.caida = { oro: 0, esquirlas: 7, gotas: 0 };
      const t = tirarHuesos(run);
      const [, a, b] = t.huesos;
      expect(t.huesos.map((h) => h.tipo)).toEqual(['oro', 'corona', 'corona']);
      const prod = a.caras[a.sale] * b.caras[b.sale];
      expect(multiplicadores(t).corona).toBe(prod);
      expect(t.esquirlas.extra).toBe(7 * (prod - 1));
      if (a.caras[a.sale] > 1 && b.caras[b.sale] > 1) visto = true;
    }
    expect(visto).toBe(true);
  });

  it('finishBattle tira al ganar, abona el Dado de oro con su línea y no toca el azar de la campaña', () => {
    const run = newRun({}, 77);
    runAction(run, { t: 'begin' });
    runAction(run, { t: 'route', i: 0 });
    const state = startStage(run, [{ id: 'p', name: 'p' }]);
    run.caida = { oro: 5, esquirlas: 20, gotas: 0 };
    for (const t of Object.values(state.towers)) t.floors = [];
    state.phase = 'won';
    const rng = run.rng;
    const twin = structuredClone(run);
    finishBattle(run, state);
    const t = run.ritual!;
    expect(t).toEqual(tirarHuesos(twin));
    expect(t.asalto).toBe(1);
    const dado = run.pay.find(([l]) => l.startsWith('Dado de oro'));
    if (t.oro.extra > 0) expect(dado).toEqual([`Dado de oro ×${multiplicadores(t).oro}`, t.oro.extra]);
    else expect(dado).toBeUndefined();
    expect(run.esquirlas).toBe(t.esquirlas.extra);
    // tirarHuesos no muta la campaña: el azar de la campaña solo lo mueven la selección y el botín
    expect(twin.rng).toBe(rng);
  });

  it('al perder no hay tirada; en campañas enteras, una por asalto ganado', () => {
    for (let i = 0; i < 20; i++) {
      const { run, log } = playCampaign({ seed: (i + 1) * 7919, deck: 'escoba', ascension: 0, full: false });
      if (log.won) expect(run.ritual?.asalto).toBe(5);
      else if (run.phase === 'lost') expect(run.ritual).toBeNull();
    }
  }, 120_000);
});
