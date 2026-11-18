// V40 · tramo 1b: los 5 Mazos (SPECS/V40-REFUNDACION.md, apartado 5). Cada regla salta cuando toca y no salta cuando
// no; las cargas duran toda la campaña; el Engaño es uno por asalto; el Chancho aturde en cadena; el Truco no tiene
// 8 ni 9; El Mentiroso lleva más Comodines y el Comodín no le gasta el turno.
import { describe, expect, it } from 'vitest';
import { Card, GameState, SOTA, SUITS, Suit, activo, applyAction, classify, currentPlayer, eligeEngano, previewStrike } from '../src/rules/engine';
import { DANO_POR_CARGA, MAZO_IDS, MAZO_INICIAL, MZ, REGLAS, TRUCO_MAX, cargasVisibles, perfilMazo, reglasDe } from '../src/rules/mazos';
import { DECK, DECKS, Run, finishBattle, newRun, startStage } from '../src/rules/run';
import { DICCIONARIOS } from '../src/shared/i18n';
import { playCampaign } from '../scripts/lab';

const P = [{ id: 'p0', name: 'p0' }];
let serial = 0;
const c = (suit: Suit, rank: number): Card => ({ id: `t${++serial}`, suit, rank });

/** Una mesa del asalto 1 con ese Mazo, la mano que se pide y los guardias con mucha Vida (nadie cae sin querer). */
function mesa(deck: string, hand: (otro: Suit[], frente: Suit) => Card[], opts: { duros?: boolean; seed?: number } = {}): { run: Run; state: GameState; frente: Suit } {
  const run = newRun({ deck }, opts.seed ?? 11);
  run.phase = 'battle';
  const state = startStage(run, P);
  const frente = activo(state)!.suit;
  if (opts.duros !== false) state.config.floorHp[SOTA] = 999;
  const otro = SUITS.filter((s) => s !== frente);
  state.players[0].hand = hand(otro, frente);
  state.players[0].reserve = [];
  return { run, state, frente };
}
const pasos = (events: { e: string; src?: string; id?: string }[], id: string) => events.filter((e) => e.e === 'step' && e.src === 'mazo' && e.id === id);
const ataca = (state: GameState, cards: Card[], target: Suit) => applyAction(state, 'p0', { type: 'attack', cards: cards.map((x) => x.id), target });

describe('V40 · los 5 Mazos', () => {
  it('cinco Mazos, la Escoba de inicio y sin desbloqueo; cada uno con su lema, sus reglas y sus textos en los dos idiomas', () => {
    expect(DECKS.map((d) => d.id)).toEqual(MAZO_IDS);
    expect(MAZO_INICIAL).toBe('escoba');
    expect(DECK.escoba.unlock).toBeNull();
    for (const d of DECKS.slice(1)) expect(d.unlock, d.id).toBeTruthy();
    for (const d of DECKS) {
      expect(d.reglas, d.id).toEqual(reglasDe(d.id).map((r) => r.id));
      for (const lang of ['es', 'en'] as const) {
        for (const k of ['nombre', 'lema', 'desc']) expect(DICCIONARIOS[lang][`baraja.${d.id}.${k}`], `${lang} ${d.id}.${k}`).toBeTruthy();
        expect(DICCIONARIOS[lang][`baraja.${d.id}.desc`].length, `${lang} ${d.id}`).toBeLessThanOrEqual(100);
      }
    }
    for (const r of REGLAS) for (const lang of ['es', 'en'] as const) {
      expect(DICCIONARIOS[lang][`regla.${r.id}.nombre`], `${lang} ${r.id}`).toBeTruthy();
      expect(DICCIONARIOS[lang][`regla.${r.id}.desc`].length, `${lang} ${r.id}`).toBeLessThanOrEqual(115);
    }
    // los lemas de la constitución
    expect(DECKS.map((d) => d.lema)).toEqual(['Mesa barrida', 'Envido y bravas', 'Pierna y escalera', 'Cara de piedra', 'Mano al centro']);
    expect(DECKS.map((d) => DICCIONARIOS.en[`baraja.${d.id}.lema`])).toEqual(['Clean sweep', 'Envido and bravos', 'Sets and runs', 'Poker face', 'Pass it on']);
  });

  it('cada Mazo empieza con su Vida y su mano, y el texto lo dice', () => {
    for (const d of DECKS) {
      const run = newRun({ deck: d.id }, 3);
      const { vida, mano } = perfilMazo(d.id);
      expect(run.maxIntegrity, d.id).toBe(vida);
      run.phase = 'battle';
      expect(startStage(run, P).players[0].hand.length, d.id).toBe(mano);
    }
    expect(DECK.escoba.desc).toContain(`Mano de ${perfilMazo('escoba').mano}`);
    expect(DECK.truco.desc).toContain(`${perfilMazo('truco').vida} de Vida`);
  });
});

describe('Truco · Envido y bravas', () => {
  it('del 1 al 7: ni la baraja ni lo que se gana por el camino trae 8 ni 9', () => {
    const run = newRun({ deck: 'truco' }, 5);
    const lisas = run.deck.filter((x) => x.suit !== 'X' && !x.sp);
    expect(lisas).toHaveLength(28);
    expect(Math.max(...lisas.map((x) => x.rank))).toBe(TRUCO_MAX);
    for (let i = 0; i < 6; i++) {
      const fin = playCampaign({ seed: 9000 + i * 7919, deck: 'truco', ascension: 0, full: true }).run;
      const altas = fin.deck.filter((x) => x.suit !== 'X' && !x.sp && x.rank > TRUCO_MAX);
      expect(altas.map((x) => x.id), `semilla ${i}`).toEqual([]);
    }
  });

  it('2 cartas del mismo palo son jugada (Par de palo) y cantan Envido; de palos distintos, no', () => {
    const { state, frente } = mesa('truco', (o) => [c(o[0], 2), c(o[0], 5), c(o[1], 3)]);
    const [a, b, x] = state.players[0].hand;
    expect(classify([a, b], state.config)).toBe('parpalo');
    expect(classify([a, b])).toBeNull(); // sin el Truco no es jugada
    expect(classify([a, x], state.config)).toBeNull();
    const r = previewStrike(state, [a, b], frente);
    expect(pasos(r.events, 'envido')).toHaveLength(1);
    expect(r.fuerza).toBeGreaterThanOrEqual(MZ.truco.envido);
    // un par de números (mismo número, palos distintos) no canta Envido
    const par = mesa('truco', (o) => [c(o[0], 4), c(o[1], 4)]);
    expect(pasos(previewStrike(par.state, par.state.players[0].hand, par.frente).events, 'envido')).toHaveLength(0);
  });

  it('los bravos suman su Daño; otra carta del mismo número, no', () => {
    const bravo = (['C1', 'D7', 'S1', 'S7'] as const).map((k) => ({ suit: k[0] as Suit, rank: Number(k.slice(1)) }));
    const { state, frente } = mesa('truco', () => []);
    const b = bravo.find((x) => x.suit !== frente)!;
    const otra = SUITS.find((s) => s !== frente && `${s}${b.rank}` !== `${b.suit}${b.rank}` && !bravo.some((x) => x.suit === s && x.rank === b.rank))!;
    const con = previewStrike(state, [c(b.suit, b.rank)], frente);
    const sin = previewStrike(state, [c(otra, b.rank)], frente);
    expect(pasos(con.events, 'bravo')).toHaveLength(1);
    expect(pasos(sin.events, 'bravo')).toHaveLength(0);
    expect(con.fuerza - sin.fuerza).toBe((MZ.truco.bravo as Record<string, number>)[`${b.suit}${b.rank}`]);
    // fuera del Truco, el mismo naipe no es bravo
    const esc = mesa('escoba', () => []);
    if (esc.frente !== b.suit) expect(pasos(previewStrike(esc.state, [c(b.suit, b.rank)], esc.frente).events, 'bravo')).toHaveLength(0);
  });
});

describe('Escoba · Mesa barrida', () => {
  it('si las cartas suman 15 es jugada (Quince) y barre: +Multi y una carga que dura toda la campaña', () => {
    const { state, frente } = mesa('escoba', (o) => [c(o[0], 7), c(o[1], 8), c(o[0], 6), c(o[2], 1), c(o[1], 3), c(o[2], 5)]);
    const [a, b, x, as, tres, cinco] = state.players[0].hand;
    expect(classify([a, b], state.config)).toBe('quince');
    expect(classify([a, b])).toBeNull(); // sin la Escoba no es jugada
    expect(classify([a, x], state.config)).toBeNull(); // 7 + 6 = 13
    // el As cuenta 1 para la Escoba: 1 + 3 + 5 + 6 = 15
    expect(classify([as, tres, cinco, x], state.config)).toBe('quince');
    const r = previewStrike(state, [a, b], frente);
    expect(r.mazo.escoba).toBe(true);
    expect(r.res).toBeGreaterThanOrEqual(1 + MZ.escoba.multi);
  });

  it('la carga de la Escoba crece con cada Escoba, suma Daño y pasa de un asalto al siguiente', () => {
    const { run, state, frente } = mesa('escoba', (o) => [c(o[0], 7), c(o[1], 8), c(o[0], 2), c(o[1], 4)]);
    const [a, b] = state.players[0].hand;
    const r0 = previewStrike(state, [a, b], frente);
    expect(r0.mazo.escoba).toBe(true);
    expect(pasos(r0.events, 'escoba')).toHaveLength(1);
    // con 3 cargas, el mismo golpe suma 3 × su Daño por carga
    const r3 = previewStrike({ ...state, cargas: { escoba: 3 } }, [a, b], frente);
    expect(r3.fuerza - r0.fuerza).toBe(3 * DANO_POR_CARGA.escoba);
    // un golpe que no suma 15, sin Escoba
    expect(previewStrike(state, [state.players[0].hand[2]], frente).mazo.escoba).toBeFalsy();
    // jugarla deja la carga en la mesa, y al terminar el asalto pasa a la campaña y al asalto siguiente
    const { state: s1 } = ataca(state, [a, b], frente);
    expect(s1.cargas).toEqual({ escoba: 1 });
    expect(cargasVisibles('escoba', s1.cargas)).toEqual([{ id: 'escoba', regla: REGLAS.find((r) => r.id === 'escoba'), n: 1, dano: DANO_POR_CARGA.escoba }]);
    s1.phase = 'won';
    finishBattle(run, s1);
    expect(run.cargas).toEqual({ escoba: 1 });
    run.phase = 'battle';
    expect(startStage(run, P).cargas).toEqual({ escoba: 1 });
    // la Escoba no existe en los otros Mazos
    const tr = mesa('truco', (o) => [c(o[0], 7), c(o[1], 8)]);
    expect(previewStrike(tr.state, tr.state.players[0].hand, tr.frente).mazo.escoba).toBeFalsy();
  });
});

describe('Chinchón · Pierna y escalera', () => {
  it('la Pierna (trío) suma Multi; la Escalera del palo suma Daño; una pareja, nada', () => {
    const pierna = mesa('chinchon', (o) => [c(o[0], 3), c(o[1], 3), c(o[2], 3)]);
    const r = previewStrike(pierna.state, pierna.state.players[0].hand, pierna.frente);
    expect(pasos(r.events, 'pierna')).toHaveLength(1);
    const par = mesa('chinchon', (o) => [c(o[0], 3), c(o[1], 3)]);
    expect(pasos(previewStrike(par.state, par.state.players[0].hand, par.frente).events, 'pierna')).toHaveLength(0);
    const esc = mesa('chinchon', (o) => [c(o[0], 3), c(o[0], 4), c(o[0], 5)]);
    expect(pasos(previewStrike(esc.state, esc.state.players[0].hand, esc.frente).events, 'escalera')).toHaveLength(1);
    // en la Escoba, el mismo trío no es Pierna
    const fuera = mesa('escoba', (o) => [c(o[0], 3), c(o[1], 3), c(o[2], 3)]);
    expect(pasos(previewStrike(fuera.state, fuera.state.players[0].hand, fuera.frente).events, 'pierna')).toHaveLength(0);
  });

  it('una mano larga frena el Contraataque de ese turno y deja una carga permanente', () => {
    const larga = mesa('chinchon', (o) => [c(o[0], 2), c(o[1], 3), c(o[2], 4), c(o[0], 5)]);
    const cards = larga.state.players[0].hand;
    const r = previewStrike(larga.state, cards, larga.frente);
    expect(r.mazo.larga).toBe(true);
    expect(r.mazo.alivio).toBe(MZ.chinchon.alivio);
    const { state, events } = ataca(larga.state, cards, larga.frente);
    expect(state.cargas).toEqual({ larga: 1 });
    expect(pasos(events, 'larga').length).toBeGreaterThan(0);
    // corta (3 cartas), nada
    const corta = mesa('chinchon', (o) => [c(o[0], 2), c(o[1], 3), c(o[2], 4)]);
    expect(previewStrike(corta.state, corta.state.players[0].hand, corta.frente).mazo.larga).toBeFalsy();
  });
});

describe('El Mentiroso · Cara de piedra', () => {
  it('lleva más Comodines que los demás Mazos', () => {
    const comodines = (deck: string) => newRun({ deck }, 4).deck.filter((x) => x.suit === 'X' && !x.sp).length;
    expect(comodines('mentiroso')).toBe(2 + MZ.mentiroso.comodines);
    expect(comodines('mentiroso')).toBeGreaterThan(comodines('escoba'));
  });

  it('el Comodín no gasta el turno: carga Daño y el Contraataque de ese guardia no llega', () => {
    const { state, frente } = mesa('mentiroso', (o) => [{ id: 'X9', suit: 'X', rank: 0 }, c(o[0], 2)]);
    const antes = state.turnCount;
    const { state: s1 } = applyAction(state, 'p0', { type: 'joker', card: 'X9', target: frente });
    expect(s1.turnCount).toBe(antes);
    expect(currentPlayer(s1).id).toBe('p0');
    expect(s1.charge).toBe(state.charge + MZ.mentiroso.dano);
    expect(s1.towers[frente].piedra).toBe(true);
    expect(s1.towers[frente].fx.sobrecarga).toBeFalsy(); // sin quedar Aturdido
    const integ = s1.integrity;
    const { state: s2, events } = ataca(s1, [s1.players[0].hand[0]], frente);
    expect(s2.turnCount).toBe(antes + 1);
    expect(pasos(events, 'piedra')).toHaveLength(1);
    expect(s2.integrity).toBe(integ);
    expect(s2.towers[frente].piedra).toBeUndefined();
  });

  it('el Engaño: uno por asalto, solo si convierte el golpe en uno que abate; si no abate, sube la Furia', () => {
    // el golpe va con una carta del palo del enemigo (Inmune): sin Engaño no lo tumba, con él sí
    const m = mesa('mentiroso', (_o, f) => [c(f, 9), c(f, 8)], { duros: false });
    const t = m.state.towers[m.frente];
    t.damage = m.state.config.floorHp[t.floors[0]] - 3;
    const [a] = m.state.players[0].hand;
    expect(previewStrike(m.state, [a], m.frente).fallenBy[m.frente] ?? 0).toBe(0);
    expect(eligeEngano(m.state, [a], m.frente)).toBe('inmune');
    const { state: s1 } = ataca(m.state, [a], m.frente);
    expect(s1.engano).toMatchObject({ usado: true, modo: 'inmune', auto: true, abatio: true });
    expect(s1.furiaMazo ?? 0).toBe(0);
    // ya no queda Engaño en este asalto
    expect(eligeEngano(s1, [s1.players[0].hand.find((x) => x.suit === m.frente) ?? a], m.frente)).toBeUndefined();
    // en el asalto siguiente vuelve a estar
    m.run.phase = 'battle';
    expect(startStage(m.run, P).engano).toEqual({ usado: false });
    // si el golpe ya abate por sí solo, no se gasta
    const sobra = mesa('mentiroso', (o) => [c(o[0], 9)], { duros: false });
    const ts = sobra.state.towers[sobra.frente];
    ts.damage = sobra.state.config.floorHp[ts.floors[0]] - 1;
    expect(eligeEngano(sobra.state, sobra.state.players[0].hand, sobra.frente)).toBeUndefined();
    // pedido a mano y sin abatir: la Furia sube
    const mano = mesa('mentiroso', (o) => [c(o[0], 2), c(o[1], 3), c(o[2], 4)]);
    const { state: s3 } = applyAction(mano.state, 'p0', { type: 'attack', cards: mano.state.players[0].hand.map((x) => x.id), target: mano.frente, engano: 'palo' });
    expect(s3.engano).toMatchObject({ usado: true, modo: 'palo', auto: false, abatio: false, furia: MZ.mentiroso.furia });
    expect(s3.furiaMazo).toBe(MZ.mentiroso.furia);
    // en otro Mazo no hay Engaño
    const otro = mesa('escoba', (_o, f) => [c(f, 9)], { duros: false });
    expect(eligeEngano(otro.state, otro.state.players[0].hand, otro.frente)).toBeUndefined();
  });
});

describe('Chancho Va · Mano al centro', () => {
  it('Pasar: la primera carta suelta que se descarta no gasta el turno y se roba otra; la segunda, sí', () => {
    const { state } = mesa('chancho', (o) => [2, 3, 4, 5, 6, 7, 8].map((n, i) => c(o[i % 3], n)));
    const antes = state.turnCount;
    const { state: s1, events } = applyAction(state, 'p0', { type: 'discard', cards: [state.players[0].hand[0].id] });
    expect(s1.turnCount).toBe(antes);
    expect(s1.pasado).toBe(true);
    expect(s1.players[0].hand).toHaveLength(7);
    expect(events.some((e) => e.e === 'discard' && e.libre)).toBe(true);
    const { state: s2 } = applyAction(s1, 'p0', { type: 'discard', cards: [s1.players[0].hand[0].id] });
    expect(s2.turnCount).toBe(antes + 1);
    expect(s2.pasado).toBeFalsy();
    // en otro Mazo, descartar gasta el turno
    const otro = mesa('escoba', (o) => [c(o[0], 2), c(o[1], 3)]);
    expect(applyAction(otro.state, 'p0', { type: 'discard', cards: [otro.state.players[0].hand[0].id] }).state.turnCount).toBe(otro.state.turnCount + 1);
  });

  it('el Chancho (póker) aturde en cadena: los Contraataques siguientes no llegan', () => {
    const { state, frente } = mesa('chancho', () => SUITS.map((s) => c(s, 4)).concat([c(SUITS[0], 9)]));
    const poker = state.players[0].hand.slice(0, 4);
    expect(previewStrike(state, poker, frente).mazo.chancho).toBe(true);
    const vida = state.integrity;
    const { state: s1, events } = ataca(state, poker, frente);
    // el póker son cuatro palos: el guardia queda además Aturdido, y eso frena el Contraataque de este turno
    expect(pasos(events, 'chancho')).toHaveLength(1);
    expect(s1.cadena).toBe(MZ.chancho.cadena);
    expect(s1.integrity).toBe(vida);
    // el turno siguiente (dos descartes sueltos: el primero es Pasar), el Contraataque tampoco llega
    const s2 = applyAction(s1, 'p0', { type: 'discard', cards: [s1.players[0].hand[0].id] }).state;
    const { state: s3, events: ev3 } = applyAction(s2, 'p0', { type: 'discard', cards: [s2.players[0].hand[0].id] });
    expect(pasos(ev3, 'chancho')).toHaveLength(1);
    expect(s3.cadena).toBe(MZ.chancho.cadena - 1);
    expect(s3.integrity).toBe(vida);
    // un trío no es Chancho
    const trio = mesa('chancho', () => SUITS.slice(0, 3).map((s) => c(s, 4)));
    expect(previewStrike(trio.state, trio.state.players[0].hand, trio.frente).mazo.chancho).toBeFalsy();
  });

  it('De arranque: abatir a un guardia en los primeros turnos carga Daño; más tarde, no', () => {
    const pronto = mesa('chancho', (o) => [c(o[0], 9), c(o[1], 2)], { duros: false });
    const t = pronto.state.towers[pronto.frente];
    t.damage = pronto.state.config.floorHp[t.floors[0]] - 1;
    const carga = pronto.state.charge;
    const { state: s1, events } = ataca(pronto.state, [pronto.state.players[0].hand[0]], pronto.frente);
    expect(pasos(events, 'arranque')).toHaveLength(1);
    expect(s1.charge).toBe(carga + MZ.chancho.dano);
    const tarde = mesa('chancho', (o) => [c(o[0], 9), c(o[1], 2)], { duros: false });
    tarde.state.turnCount = MZ.chancho.turnos;
    const tt = tarde.state.towers[tarde.frente];
    tt.damage = tarde.state.config.floorHp[tt.floors[0]] - 1;
    expect(pasos(ataca(tarde.state, [tarde.state.players[0].hand[0]], tarde.frente).events, 'arranque')).toHaveLength(0);
  });
});

describe('Multi siempre entero, también con las reglas de los Mazos', () => {
  it('1.000 golpes al azar por Mazo: Daño, Multi y Golpe enteros', () => {
    let r = 12345;
    const rnd = () => ((r = (r * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (const deck of MAZO_IDS) {
      for (let i = 0; i < 1000; i++) {
        const { state, frente } = mesa(deck, () => [], { seed: 100 + i });
        state.cargas = { escoba: Math.floor(rnd() * 6), larga: Math.floor(rnd() * 6) };
        const n = 1 + Math.floor(rnd() * 5);
        const cards = Array.from({ length: n }, () => c(SUITS[Math.floor(rnd() * 4)], 1 + Math.floor(rnd() * 9)));
        if (!classify(cards, state.config)) continue;
        const res = previewStrike(state, cards, frente, deck === 'mentiroso' && rnd() < 0.5 ? { engano: 'numero' } : {});
        expect(Number.isInteger(res.res), `${deck}: Multi ${res.res}`).toBe(true);
        expect(Number.isInteger(res.fuerza), `${deck}: Daño ${res.fuerza}`).toBe(true);
      }
    }
  });
});
