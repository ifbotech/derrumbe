// Mejor jugada (V12, SPECS/V12.md 1.6): «si puedes dar un Golpe exacto, lo elige; si no, tu Golpe más alto».
//   (a) en 500 mesas al azar con semilla coincide con la fuerza bruta de esta prueba, y applyAction la acepta
//   (b) con un Golpe exacto posible, siempre lo elige
//   (c) null cuando ninguna jugada hace Daño
//   (d) cartasConExacto ⊆ mano + Manga, y cada id está en alguna jugada exacta
//   (e) P95 del tiempo de mejorJugada ≤ 30 ms en esas 500 mesas
import { describe, expect, it } from 'vitest';
import { arrange, chooseAction } from '../src/rules/bot';
import { Card, GameState, SEALS, SUITS, Suit, TREATMENTS, applyAction, classify, currentPlayer, nextRandom, previewStrike, seedFrom, standing } from '../src/rules/engine';
import { REGLA_MEJOR, cartasConExacto, mejorJugada } from '../src/rules/mejor-jugada';
import { DICCIONARIOS } from '../src/shared/i18n';
import * as R from '../src/rules/run';
import { TOOLS } from '../src/rules/tools';
import { canonical } from '../src/rules/state-hash';

type Jugada = { cards: string[]; target: Suit; total: number; exacto: boolean };

/** Fuerza bruta: cada subconjunto de la mano y la Manga (sin especiales ni Comodín) contra cada trono en pie. */
function todas(state: GameState): Jugada[] {
  const p = currentPlayer(state);
  const lisas = [...p.hand, ...p.reserve].filter((c) => c.suit !== 'X' && !c.sp);
  const subs: Card[][] = [];
  const recorre = (i: number, acc: Card[]) => {
    if (i === lisas.length) {
      if (acc.length) subs.push(acc);
      return;
    }
    recorre(i + 1, acc);
    recorre(i + 1, [...acc, lisas[i]]);
  };
  recorre(0, []);
  const out: Jugada[] = [];
  for (const s of subs) {
    if (!classify(s)) continue;
    const orden = arrange(s);
    for (const t of SUITS) {
      if (!standing(state.towers[t])) continue;
      const r = previewStrike(state, orden, t);
      out.push({ cards: orden.map((c) => c.id), target: t, total: r.total, exacto: r.clean });
    }
  }
  return out;
}

/** La regla del apartado 1.6 escrita aparte: ordena y coge la primera. */
function porRegla(js: Jugada[]): Jugada | null {
  const orden = (a: Jugada, b: Jugada) =>
    b.total - a.total || a.cards.length - b.cards.length || SUITS.indexOf(a.target) - SUITS.indexOf(b.target) || ([...a.cards].sort().join('|') < [...b.cards].sort().join('|') ? -1 : 1);
  const exactas = js.filter((j) => j.exacto).sort(orden);
  if (exactas.length) return exactas[0];
  return js.filter((j) => j.total > 0).sort(orden)[0] ?? null;
}

/** 500 mesas variadas: campaña con reliquias, unas jugadas del bot, Manga, sellos, acabados, estados y Racha. */
function mesas(n: number): GameState[] {
  const azar = { rng: seedFrom('mejor-jugada-v12') };
  const r = () => nextRandom(azar);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const out: GameState[] = [];
  for (let i = 0; out.length < n; i++) {
    const run = R.newRun({ ascension: i % 8, up: { caja: 2 } }, 1000 + i);
    run.tools = Array.from({ length: Math.floor(r() * 5) }, (_, k) => ({ id: pick(TOOLS).id, n: k }));
    run.stage = 1 + (i % 5);
    let state = R.startStage(run, [{ id: 'p0', name: 'p0' }]);
    const pasos = Math.floor(r() * 8);
    for (let k = 0; k < pasos && state.phase === 'playing'; k++) state = applyAction(state, 'p0', chooseAction(state)).state;
    if (state.phase !== 'playing') continue;
    const p = currentPlayer(state);
    // la Manga con una carta del Mazo, si está vacía
    if (!p.reserve.length && state.deck.length && r() < 0.6) p.reserve.push(state.deck.shift()!);
    for (const c of [...p.hand, ...p.reserve]) {
      if (c.suit === 'X' || c.sp) continue;
      if (r() < 0.15) c.seal = pick(SEALS);
      if (r() < 0.12) c.tr = pick(TREATMENTS);
    }
    for (const s of SUITS) {
      if (!standing(state.towers[s])) continue;
      if (r() < 0.2) state.towers[s].fx.fractura = true;
      if (r() < 0.1) state.towers[s].fx.sobrecarga = true;
      // daño ya hecho, para que haya Golpes exactos al alcance
      if (r() < 0.5) state.towers[s].damage = Math.max(0, state.config.floorHp[state.towers[s].floors[0]] - 2 - Math.floor(r() * 14));
    }
    state.chain = Math.floor(r() * 3);
    out.push(state);
  }
  return out;
}

describe('Mejor jugada', () => {
  it('la regla del Reglamento (regla.mejor), ≤ 100 caracteres en los dos idiomas', () => {
    expect(DICCIONARIOS.es['regla.mejor']).toBe(REGLA_MEJOR);
    expect(REGLA_MEJOR).toBe('Mejor jugada: si puedes dar un Golpe exacto, lo elige. Si no, elige tu Golpe más alto. Tú confirmas.');
    for (const lang of ['es', 'en'] as const) expect(DICCIONARIOS[lang]['regla.mejor'].length, lang).toBeLessThanOrEqual(100);
    expect(DICCIONARIOS.en['regla.mejor']).toContain('Exact Hit');
  });

  const lista = mesas(500);

  it('(a, b, d, e) 500 mesas: igual que la fuerza bruta, legal, elige el exacto, corona bien y en ≤ 30 ms (P95)', () => {
    const tiempos: number[] = [];
    let conExacto = 0;
    let nulas = 0;
    for (const [i, state] of lista.entries()) {
      const antes = canonical(state);
      const t0 = performance.now();
      const mj = mejorJugada(state);
      tiempos.push(performance.now() - t0);
      const corona = cartasConExacto(state);
      expect(canonical(state), `mesa ${i}: no toca el estado`).toBe(antes);

      const js = todas(state);
      expect(mj, `mesa ${i}`).toEqual(porRegla(js));
      if (js.some((j) => j.exacto)) {
        conExacto++;
        expect(mj!.exacto, `mesa ${i}: había un Golpe exacto`).toBe(true);
      }
      if (mj) expect(() => applyAction(state, 'p0', { type: 'attack', cards: mj.cards, target: mj.target }), `mesa ${i}`).not.toThrow();
      else nulas++;

      const p = currentPlayer(state);
      const mano = new Set([...p.hand, ...p.reserve].map((c) => c.id));
      const enExactas = new Set(js.filter((j) => j.exacto).flatMap((j) => j.cards));
      for (const id of corona) {
        expect(mano.has(id), `mesa ${i}: ${id} en la mano`).toBe(true);
        expect(enExactas.has(id), `mesa ${i}: ${id} en una jugada exacta`).toBe(true);
      }
      expect(corona.length).toBe(enExactas.size);
    }
    tiempos.sort((a, b) => a - b);
    const p95 = tiempos[Math.floor(tiempos.length * 0.95)];
    console.log(`mejorJugada: P50 ${tiempos[250].toFixed(2)} ms · P95 ${p95.toFixed(2)} ms · máx ${tiempos.at(-1)!.toFixed(2)} ms · ${conExacto} mesas con exacto · ${nulas} sin jugada`);
    expect(conExacto).toBeGreaterThan(100);
    expect(p95).toBeLessThanOrEqual(30);
  }, 120_000);

  it('(c) null cuando ninguna jugada hace Daño', () => {
    const run = R.newRun({ ascension: 0 }, 7);
    const state = R.startStage(run, [{ id: 'p0', name: 'p0' }]);
    // solo queda en pie un trono, y en la mano solo hay una carta de su palo: Inmune, Golpe 0
    const solo = SUITS.find((s) => standing(state.towers[s]))!;
    for (const s of SUITS) if (s !== solo) state.towers[s].floors = [];
    state.tools = [];
    state.chain = 0;
    state.charge = 0;
    state.fatigue = 0;
    const p = currentPlayer(state);
    p.hand = [{ id: `${solo}5`, suit: solo, rank: 5 }];
    p.reserve = [];
    expect(mejorJugada(state)).toBeNull();
    expect(cartasConExacto(state)).toEqual([]);
    // y con una carta de otro palo, ya hay jugada
    const otro = (['H', 'C'] as Suit[]).find((x) => x !== solo)!;
    p.hand.push({ id: `${otro}4`, suit: otro, rank: 4 });
    expect(mejorJugada(state)).toMatchObject({ cards: [`${otro}4`], target: solo, total: 4 });
  });

  it('(b) entre un Golpe exacto pequeño y un Golpe alto sin exacto, elige el exacto', () => {
    const run = R.newRun({ ascension: 0 }, 11);
    const state = R.startStage(run, [{ id: 'p0', name: 'p0' }]);
    state.tools = [];
    state.chain = 0;
    const p = currentPlayer(state);
    const objetivo = SUITS.find((s) => standing(state.towers[s]))!;
    const otro = SUITS.find((s) => s !== objetivo && standing(state.towers[s]))!;
    // al guardia de `objetivo` le faltan exactamente 3 (un 3 de Corazones solo da 3: Golpe exacto)
    const hp = state.config.floorHp[state.towers[objetivo].floors[0]];
    state.towers[objetivo].damage = hp - 3;
    // el 3 de un palo que no sea el del trono (ni ♦, que salpica): Golpe 3, exacto; el 10 pega más fuerte
    const palo = (['H', 'C'] as Suit[]).find((x) => x !== objetivo)!;
    const alto = (['C', 'H'] as Suit[]).find((x) => x !== objetivo && x !== palo) ?? palo;
    p.hand = [
      { id: `${palo}3`, suit: palo, rank: 3 },
      { id: `${alto}10`, suit: alto, rank: 10 },
    ];
    p.reserve = [];
    state.towers[otro].damage = 0;
    const mj = mejorJugada(state)!;
    expect(mj.exacto).toBe(true);
    expect(cartasConExacto(state)).toContain(`${palo}3`);
  });
});
