import { describe, expect, it } from 'vitest';
import { GameEvent, applyAction } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';
import { TUTORIAL_PLAYER, TUTORIAL_STEPS, createTutorial, stepAction } from '../src/rules/tutorial';

const impact = (events: GameEvent[]) => events.find((e): e is Extract<GameEvent, { e: 'impact' }> => e.e === 'impact')!;
const siren = (events: GameEvent[]) => events.find((e): e is Extract<GameEvent, { e: 'siren' }> => e.e === 'siren')!;

describe('partida guiada', () => {
  it('el guion se puede jugar entero y enseña lo que dice', () => {
    let s = createTutorial();
    const ids = [...s.deck, ...s.players[0].hand].map((c) => c.id);
    expect(new Set(ids).size).toBe(42);

    const play = (i: number) => {
      const action = stepAction(TUTORIAL_STEPS[i])!;
      const res = applyAction(s, TUTORIAL_PLAYER, action);
      s = res.state;
      return res.events;
    };

    let ev = play(0); // 4♠ a VIDRIO: 8 de Fuerza × 1
    expect(impact(ev)).toMatchObject({ fuerza: 8, res: 1, total: 8 });
    expect(s.towers.D.damage).toBe(8);
    expect(siren(ev)).toMatchObject({ tower: 'H', taken: 1 });
    expect(s.integrity).toBe(19);

    ev = play(1); // 6♥ 6♣ a HORMIGÓN: (2 + 12) × 1,2 = 17
    expect(impact(ev)).toMatchObject({ fuerza: 14, res: 1.2, total: 17 });
    expect(s.towers.C.floors).toEqual([]);
    expect(s.wall).toBe(2);
    expect(s.integrity).toBe(20);
    expect(siren(ev).reason).toBe('ruin');

    ev = play(2); // 3♦ 4♦ 5♦ a LADRILLO: (10 + 24) × 2 = 68, y esquirlas de 4
    expect(impact(ev)).toMatchObject({ fuerza: 34, res: 2, total: 68 });
    expect(s.towers.H.floors).toEqual([]);
    expect(s.towers.D).toMatchObject({ floors: [12], damage: 0 });
    expect(s.towers.S.damage).toBe(4);
    expect(siren(ev)).toMatchObject({ tower: 'S', blocked: 1, taken: 0 });
    expect(s.wall).toBe(1);

    ev = play(3); // 5♣ 5♠ a ACERO: 14, cae la J y 8 perforan hasta la Q
    expect(impact(ev).total).toBe(14);
    expect(s.towers.S).toMatchObject({ floors: [12, 13], damage: 8 });
    expect(siren(ev)).toMatchObject({ blocked: 2, taken: 0 });
    expect(s.integrity).toBe(20);

    ev = play(4); // 3♣: golpe limpio sobre la Q
    expect(ev.find((e) => e.e === 'floorDown')).toMatchObject({ tower: 'S', rank: 12, clean: true });
    expect(siren(ev).reason).toBe('clean');
    expect(ev.find((e) => e.e === 'onda')).toMatchObject({ tower: 'S', amount: 5 });
    expect(s.towers.S).toMatchObject({ floors: [13], damage: 5 });
    expect(s.chain).toBe(1);

    ev = play(5); // huelga sobre la K de ACERO
    expect(s.towers.S.disarmed).toBe(true);
    expect(siren(ev).reason).toBe('huelga');
    expect(s.exhausted.map((c) => c.id)).toEqual(['X1']);

    // juego libre: el 10♠ forjado con la racha remata VIDRIO…
    const hand = s.players[0].hand.map((c) => c.id);
    expect(hand).toContain('S10');
    expect(hand).toContain('C7');
    expect(s.players[0].hand.find((c) => c.id === 'S10')!.tr).toBe('forjado');
    let res = applyAction(s, TUTORIAL_PLAYER, { type: 'attack', cards: ['S10'], target: 'D' });
    expect(impact(res.events)).toMatchObject({ fuerza: 26, res: 1.5, total: 39 });
    expect(res.state.towers.D.floors).toEqual([]);
    // …y el 7♣ tira la K de ACERO
    res = applyAction(res.state, TUTORIAL_PLAYER, { type: 'attack', cards: ['C7'], target: 'S' });
    expect(res.state.phase).toBe('won');
    expect(res.state.integrity).toBeGreaterThan(15);
  });

  it('el último paso es libre y el bot también sabe terminar la obra', () => {
    let s = createTutorial();
    for (const step of TUTORIAL_STEPS) {
      const action = stepAction(step);
      if (action) s = applyAction(s, TUTORIAL_PLAYER, action).state;
    }
    expect(stepAction(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1])).toBeNull();
    for (let i = 0; i < 40 && s.phase === 'playing'; i++) s = applyAction(s, TUTORIAL_PLAYER, chooseAction(s)).state;
    expect(s.phase).toBe('won');
  });
});
