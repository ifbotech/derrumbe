import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/rules/engine';
import { TUTORIAL_PLAYER, TUTORIAL_STEPS, createTutorial, stepAction } from '../src/rules/tutorial';

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

    play(0); // 4♠ a VIDRIO
    expect(s.towers.D.damage).toBe(8);
    expect(s.integrity).toBe(19);

    play(1); // 6♥ 6♣ a HORMIGÓN
    expect(s.towers.C.floors).toEqual([]);
    expect(s.wall).toBe(2);
    expect(s.integrity).toBe(20);

    play(2); // 3♦ 4♦ 5♦ a LADRILLO
    expect(s.towers.H.floors).toEqual([]);
    expect(s.towers.D.floors).toEqual([12]);
    expect(s.towers.S.damage).toBe(4);
    expect(s.wall).toBe(1);

    play(3); // 8♣ 8♠ a ACERO: perfora
    expect(s.towers.S.floors).toEqual([13]);
    expect(s.towers.S.damage).toBe(10);
    expect(s.integrity).toBe(20);

    const clean = play(4); // 4♣: golpe limpio
    expect(s.towers.S.floors).toEqual([]);
    expect(clean.find((e) => e.e === 'siren')).toMatchObject({ reason: 'clean' });

    play(5); // comodín
    expect(s.towers.D.disarmed).toBe(true);

    expect(s.players[0].hand.some((c) => c.id === 'S10')).toBe(true);
    s = applyAction(s, TUTORIAL_PLAYER, { type: 'attack', cards: ['S10'], target: 'D' }).state;
    expect(s.phase).toBe('won');
  });
});
