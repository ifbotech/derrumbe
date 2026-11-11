import { describe, expect, it } from 'vitest';
import { Card, DEFAULT_CONFIG, GameState, RuleError, applyAction, classify, createGame, currentPlayer, eventsFor, multiplier, viewFor } from '../src/rules/engine';
import { chooseAction, formations } from '../src/rules/bot';

const c = (id: string): Card => ({ id, suit: id[0] as Card['suit'], rank: Number(id.slice(1)) });
const two = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];

/** Partida con la mano del jugador activo fijada y el mazo controlado. */
function rig(hand: string[], top: string[] = ['X1'], pad = true): GameState {
  const s = createGame(two, 1);
  const mk = (id: string): Card => (id.startsWith('X') ? { id, suit: 'X', rank: 0 } : c(id));
  s.players[0].hand = hand.map(mk);
  s.players[1].hand = [];
  const used = new Set([...hand, ...top]);
  const rest: Card[] = [];
  if (pad) for (const su of ['S', 'D', 'H', 'C']) for (let r = 1; r <= 10; r++) if (!used.has(su + r)) rest.push(c(su + r));
  s.deck = [...top.map(mk), ...rest];
  s.discard = [];
  return s;
}

describe('preparación', () => {
  it('reparte 42 cartas entre manos y cantera, con 4 torres de 3 pisos', () => {
    const s = createGame(two, 7);
    expect(s.players.every((p) => p.hand.length === 6)).toBe(true);
    expect(s.deck.length).toBe(42 - 12);
    expect(Object.values(s.towers).every((t) => t.floors.join() === '11,12,13')).toBe(true);
  });
  it('es determinista con la misma semilla', () => {
    expect(createGame(two, 99)).toEqual(createGame(two, 99));
  });
});

describe('formaciones', () => {
  it('reconoce solo, grupo y escalera', () => {
    expect(classify([c('S5')])).toBe('solo');
    expect(classify([c('S5'), c('H5'), c('D5')])).toBe('grupo');
    expect(classify([c('S3'), c('H5'), c('D4')])).toBe('escalera');
    expect(classify([c('S3'), c('H4')])).toBeNull();
    expect(classify([c('S3'), c('H4'), c('D6')])).toBeNull();
    expect(classify([{ id: 'X1', suit: 'X', rank: 0 }])).toBeNull();
  });
  it('multiplicadores: dominante ×2, mismo material ×0, resto ×1', () => {
    expect(multiplier('S', 'D')).toBe(2);
    expect(multiplier('D', 'D')).toBe(0);
    expect(multiplier('H', 'D')).toBe(1);
  });
});

describe('ataque', () => {
  it('daño doble con el palo dominante y descarta las cartas', () => {
    const { state } = applyAction(rig(['S7', 'H2']), 'a', { type: 'attack', cards: ['S7'], target: 'D' });
    expect(state.towers.D.damage).toBe(14);
    expect(state.discard.some((x) => x.id === 'S7')).toBe(true);
    expect(state.turn).toBe(1);
  });
  it('el acero perfora: el exceso pasa al piso siguiente', () => {
    const s = rig(['S10', 'S9', 'S8']); // escalera de color: 27 ×2 ×1,5 = 81 contra vidrio: J(20) + Q(30) y sobran 31
    const { state } = applyAction(s, 'a', { type: 'attack', cards: ['S10', 'S9', 'S8'], target: 'D' });
    expect(state.towers.D.floors).toEqual([13]);
    expect(state.towers.D.damage).toBe(31);
  });
  it('sin acero el exceso se pierde', () => {
    const s = rig(['H10', 'C10', 'D10']); // contra acero: C×2=20, H=10, D=10 → 40
    const { state } = applyAction(s, 'a', { type: 'attack', cards: ['H10', 'C10', 'D10'], target: 'S' });
    expect(state.towers.S.floors).toEqual([12, 13]);
    expect(state.towers.S.damage).toBe(0);
  });
  it('vidrio salpica, hormigón levanta muro, ladrillo repara', () => {
    const s = rig(['D9', 'C9', 'H9']);
    s.integrity = 10;
    const { state } = applyAction(s, 'a', { type: 'attack', cards: ['D9', 'C9', 'H9'], target: 'S' });
    expect(state.towers.S.floors).toEqual([12, 13]); // 9 + 18 + 9 = 36 ≥ 20: cae la J
    expect(state.towers.S.damage).toBe(0); // sin acero no perfora
    expect(state.towers.H.damage).toBe(3);
    expect(state.towers.C.damage).toBe(3);
    expect(state.wall).toBe(3);
    expect(state.integrity).toBe(13);
  });
  it('golpe limpio silencia la sirena', () => {
    const s = rig(['S10'], ['D5']);
    const { state, events } = applyAction(s, 'a', { type: 'attack', cards: ['S10'], target: 'D' });
    expect(state.towers.D.floors).toEqual([12, 13]);
    expect(events.find((e) => e.e === 'siren')).toMatchObject({ reason: 'clean' });
    expect(state.integrity).toBe(20);
  });
  it('rechaza jugadas ilegales', () => {
    const s = rig(['S7', 'H2']);
    expect(() => applyAction(s, 'b', { type: 'attack', cards: ['S7'], target: 'D' })).toThrow(RuleError);
    expect(() => applyAction(s, 'a', { type: 'attack', cards: ['S7', 'H2'], target: 'D' })).toThrow(RuleError);
    expect(() => applyAction(s, 'a', { type: 'attack', cards: ['D1'], target: 'D' })).toThrow(RuleError);
    expect(() => applyAction(s, 'a', { type: 'pass' })).toThrow(RuleError);
  });
});

describe('sirena y búnker', () => {
  it('la torre señalada golpea y el muro absorbe primero', () => {
    const s = rig(['H2', 'H3'], ['C4', 'S1', 'S2']);
    s.wall = 2;
    const { state } = applyAction(s, 'a', { type: 'attack', cards: ['H2'], target: 'S' });
    expect(state.wall).toBe(0);
    expect(state.integrity).toBe(19); // amenaza 3, muro 2 → 1 de daño
  });
  it('una torre en ruinas no golpea', () => {
    const s = rig(['H2'], ['C4', 'S1']);
    s.towers.C.floors = [];
    const { state } = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    expect(state.integrity).toBe(20);
  });
  it('el comodín desarma el piso y hay huelga (sin sirena)', () => {
    const s = rig(['X1'], ['C4']);
    const r = applyAction(s, 'a', { type: 'joker', card: 'X1', target: 'C' });
    expect(r.state.towers.C.disarmed).toBe(true);
    expect(r.state.integrity).toBe(20);
    expect(r.state.discard.length).toBe(0);
  });
  it('rebarajar provoca un colapso y perder toda la integridad termina la partida', () => {
    const s = rig(['H2', 'H3'], [], false);
    s.integrity = 5;
    const { state, events } = applyAction(s, 'a', { type: 'discard', cards: ['H2'] });
    expect(events.some((e) => e.e === 'collapse')).toBe(true);
    expect(state.phase).toBe('lost');
  });
});

describe('vista y bot', () => {
  it('la vista no filtra manos ajenas ni la cantera', () => {
    const s = createGame(two, 3);
    const v = viewFor(s, 'a');
    expect(v.hand).toEqual(s.players[0].hand);
    expect(JSON.stringify(v)).not.toContain(s.players[1].hand[0].id + '"');
    expect((v as any).deck).toBeUndefined();
    const ev = eventsFor([{ e: 'draw', player: 'b', count: 1, cards: [c('S1')] }], 'a');
    expect((ev[0] as any).cards).toBeUndefined();
  });
  it('el bot solo propone formaciones legales y termina partidas', () => {
    for (let seed = 0; seed < 40; seed++) {
      let s = createGame(two, seed);
      expect(formations(s.players[0].hand).every((f) => classify(f))).toBe(true);
      let guard = 0;
      while (s.phase === 'playing' && guard++ < 500) s = applyAction(s, currentPlayer(s).id, chooseAction(s)).state;
      expect(s.phase).not.toBe('playing');
      // conservación de cartas: nada se duplica
      const ids = [...s.deck, ...s.discard, ...s.players.flatMap((p) => p.hand)].map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
