// V12 · lo que cae a la mesa (SPECS/V12.md, apartado 1.3): la tabla con números, lo que cae es lo que se
// abona, al perder también se cobra, y las gotas de lacre sellan gratis en la Mesa de lacre.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/rules/balance-config';
import { caidaDe, sumaPiezas } from '../src/rules/caida';
import { chooseAction } from '../src/rules/bot';
import { applyAction, currentPlayer } from '../src/rules/engine';
import type { Card, GameEvent } from '../src/rules/engine';
import { cobroDe, finishBattle, newMeta, newRun, offerCost, runAction, settle, startStage, trackEvents } from '../src/rules/run';
import { playCampaign } from '../scripts/lab';

const K = BALANCE.caida;
const c = (id: string): Card => ({ id, suit: 'S', rank: 5 });
const golpe = (cartas: number, extra: GameEvent[] = []): GameEvent[] => [
  { e: 'play', player: 'p', cards: Array.from({ length: cartas }, (_, i) => c(`c${i}`)), target: 'S', formation: 'solo' },
  ...extra,
  { e: 'impact', tower: 'S', fuerza: 5, res: 1, total: 5 },
];
const guardia = (clean: boolean): GameEvent => ({ e: 'floorDown', tower: 'S', rank: 10, clean, towerDown: false, damage: 0 });

describe('la tabla del apartado 1.3, con números', () => {
  it('Árbol vacío: golpe 1 esquirla; guardia 1 moneda y 2; exacto +5 y 1 gota; oro tal cual; monarca 25', () => {
    expect([K.esquirlaGolpe, K.esquirlaGuardia, K.esquirlaExacto, K.esquirlaMonarca, K.oroGuardia, K.gotaExacto, K.gotasPorSello]).toEqual([1, 2, 5, 25, 1, 1, 3]);
    const run = newRun({}, 1);
    expect(caidaDe(run, golpe(1))).toEqual([{ tipo: 'esquirla', n: 1, trono: 'S', de: 'golpe' }]);
    expect(caidaDe(run, [guardia(false)])).toEqual([
      { tipo: 'moneda', n: 1, trono: 'S', de: 'guardia' },
      { tipo: 'esquirla', n: 2, trono: 'S', de: 'guardia' },
    ]);
    expect(sumaPiezas(caidaDe(run, [guardia(true)]))).toEqual({ oro: 1, esquirlas: 7, gotas: 1 });
    expect(caidaDe(run, [{ e: 'gold', amount: 3 }])).toEqual([{ tipo: 'moneda', n: 3, trono: null, de: 'oro' }]);
    run.boss = 'furia';
    expect(caidaDe(run, [{ e: 'end', result: 'won' }])).toEqual([{ tipo: 'esquirla', n: 25, trono: null, de: 'monarca' }]);
    run.boss = null;
    expect(caidaDe(run, [{ e: 'end', result: 'won' }])).toEqual([]);
  });

  it('con los nodos de la Bolsa al máximo: cada uno suma su cifra', () => {
    const run = newRun({ up: { esq_golpe: 5, esq_guardia: 5, esq_exacto: 5, esq_monarca: 5, esq_formacion: 5, esq_racha: 5, esq_derrota: 5 } }, 1);
    expect(sumaPiezas(caidaDe(run, golpe(1))).esquirlas).toBe(1 + 5);
    expect(sumaPiezas(caidaDe(run, golpe(3))).esquirlas).toBe(1 + 5 + 10);
    // Racha de 2 eslabones: +10 por eslabón
    const racha: GameEvent = { e: 'step', src: 'chain', id: 'onda', label: 'Racha', dr: 2 * BALANCE.golpe.racha, fuerza: 0, res: 0 };
    expect(sumaPiezas(caidaDe(run, golpe(1, [racha]))).esquirlas).toBe(1 + 5 + 2 * 10);
    expect(sumaPiezas(caidaDe(run, [guardia(true)]))).toEqual({ oro: 1, esquirlas: 2 + 10 + 5 + 25, gotas: 1 });
    run.boss = 'furia';
    expect(sumaPiezas(caidaDe(run, [{ e: 'end', result: 'won' }])).esquirlas).toBe(25 + 125);
    // al perder: Ceniza del caído, 5 por cada guardia abatido en la campaña
    run.stats.floors = 7;
    expect(sumaPiezas(caidaDe(run, [{ e: 'end', result: 'lost' }])).esquirlas).toBe(35);
  });

  it('en el Trono infinito: Corona de hierro multiplica y el Pendón negro paga cada trono superado', () => {
    const run = newRun({ up: { corona_hierro: 2, pendon: 1 } }, 1);
    expect(sumaPiezas(caidaDe(run, golpe(1))).esquirlas).toBe(1);
    run.endless = true;
    run.boss = 'furia';
    expect(sumaPiezas(caidaDe(run, golpe(1))).esquirlas).toBe(3);
    expect(sumaPiezas(caidaDe(run, [{ e: 'end', result: 'won' }])).esquirlas).toBe((25 + 100) * 3);
  });
});

describe('lo que cae es lo que se abona', () => {
  it('en campañas enteras, las piezas de trackEvents suman lo abonado (oro, esquirlas y gotas)', () => {
    for (const seed of [11, 23, 37, 41, 59]) {
      const run = newRun({}, seed);
      runAction(run, { t: 'begin' });
      runAction(run, { t: 'bendicion', i: 0 }); // V40 1c · la oferta de los Reyes
      runAction(run, { t: 'route', i: 0 });
      let state = startStage(run, [{ id: 'p', name: 'p' }]);
      const total = { oro: 0, esquirlas: 0, gotas: 0 };
      const gold0 = run.gold;
      while (state.phase === 'playing') {
        const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
        const s = sumaPiezas(trackEvents(run, res.events));
        total.oro += s.oro;
        total.esquirlas += s.esquirlas;
        total.gotas += s.gotas;
        state = res.state;
      }
      expect(run.caida).toEqual(total);
      expect(run.esquirlas).toBe(total.esquirlas);
      expect(run.gotas).toBe(total.gotas);
      expect(run.gold - gold0).toBe(total.oro);
      expect(total.esquirlas).toBeGreaterThan(0);
      finishBattle(run, state);
      if (run.phase !== 'lost') expect(run.esquirlas).toBe(total.esquirlas + run.ritual!.esquirlas.extra);
    }
  });

  it('al perder también se cobran las esquirlas: cobro de la conjura = Coronas × 100 + esquirlas', () => {
    let vistas = 0;
    for (let i = 0; i < 40 && vistas < 5; i++) {
      const { run } = playCampaign({ seed: (i + 1) * 7919, deck: 'escoba', ascension: 7, full: false });
      if (run.phase !== 'lost') continue;
      vistas++;
      expect(run.esquirlas).toBeGreaterThan(0);
      const meta = newMeta();
      expect(settle(meta, run)).toBe(cobroDe(run));
      expect(meta.renown).toBe(cobroDe(run));
      expect(cobroDe(run) % 100).toBe(run.esquirlas % 100);
    }
    expect(vistas).toBe(5);
  });
});

describe('gotas de lacre', () => {
  it('con 3 gotas la Mesa de lacre cuesta 0 y sellar gasta las 3; con menos, su precio', () => {
    const run = newRun({}, 5);
    run.phase = 'shop';
    run.gold = 50;
    run.shop = [{ kind: 'forja', cost: 5, seal: 'eco' }];
    run.gotas = 2;
    expect(offerCost(run, run.shop[0])).toBe(5);
    run.gotas = 4;
    expect(offerCost(run, run.shop[0])).toBe(0);
    expect(runAction(run, { t: 'buy', i: 0 })).toBeNull();
    const card = run.deck.find((d) => !d.sp && d.suit !== 'X' && !d.seal)!;
    expect(runAction(run, { t: 'target', cards: [card.id] })).toBeNull();
    expect(card.seal).toBe('eco');
    expect(run.gold).toBe(50);
    expect(run.gotas).toBe(1);
    expect(run.stats.sellosGratis).toBe(1);
    // solo la Mesa de lacre: el resto cuesta lo de siempre
    expect(offerCost(run, { kind: 'sobre', cost: 6 })).toBe(6);
  });

  it('el bot usa las gotas (sellos gratis en campañas enteras)', () => {
    let gratis = 0;
    for (let i = 0; i < 40; i++) gratis += playCampaign({ seed: (i + 1) * 104729, deck: 'escoba', ascension: 0, full: false }).run.stats.sellosGratis;
    expect(gratis).toBeGreaterThan(0);
  }, 120_000);
});
