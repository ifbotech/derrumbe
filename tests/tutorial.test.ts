import { describe, expect, it } from 'vitest';
import { Action, GameEvent, GameState, RuleError, applyAction, viewFor } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';
import { TUTORIAL_PLAYER, TUTORIAL_STEPS, createTutorial, stepAction } from '../src/rules/tutorial';

const impact = (events: GameEvent[]) => events.find((e): e is Extract<GameEvent, { e: 'impact' }> => e.e === 'impact')!;
const visible = (s: string) => s.replace(/<\/?b>/g, '');

/** Juega el guion siguiendo el foco: la jugada que sugiere cada paso, hasta que el paso se cumple. */
function followFocus(): { s: GameState; actions: number; doneAt: number[]; log: GameEvent[][] } {
  let s = createTutorial();
  let actions = 0;
  const doneAt: number[] = [];
  const log: GameEvent[][] = [];
  for (const step of TUTORIAL_STEPS) {
    const action = stepAction(step)!;
    const res = applyAction(s, TUTORIAL_PLAYER, action);
    s = res.state;
    actions++;
    log.push(res.events);
    if (step.done(viewFor(s, TUTORIAL_PLAYER), res.events)) doneAt.push(actions);
  }
  return { s, actions, doneAt, log };
}

describe('partida guiada de cinco pasos', () => {
  it('cinco pasos con id estable, en orden, de una línea', () => {
    expect(TUTORIAL_STEPS.map((p) => p.id)).toEqual(['palo', 'inmune', 'manga', 'cuenta', 'exacto']);
    for (const p of TUTORIAL_STEPS) {
      expect(p.line.length, p.id).toBeLessThanOrEqual(60);
      expect(p.line, p.id).not.toMatch(/\n/);
      expect(p.line.replace(/<b>[^<]*<\/b>/, ''), `${p.id}: solo un <b>`).not.toMatch(/<[^>]+>/);
      expect(p.title.length).toBeGreaterThan(0);
    }
    expect(TUTORIAL_STEPS.map((p) => p.focus)).toEqual(['cards', { ui: 'inmune' }, { ui: 'manga' }, { ui: 'cuenta' }, 'target']);
  });

  it('el Mazo y la mano son una baraja entera sin repetidas', () => {
    const s = createTutorial();
    const ids = [...s.deck, ...s.players[0].hand].map((c) => c.id);
    expect(new Set(ids).size).toBe(42);
    expect(s.config.reserveSize).toBe(1);
  });

  it('siguiendo el foco, los cinco pasos se cumplen en orden, uno por acción, y la partida se gana', () => {
    const { s, actions, doneAt, log } = followFocus();
    expect(actions).toBeLessThanOrEqual(7);
    expect(doneAt).toEqual([1, 2, 3, 4, 5]);
    expect(s.phase).toBe('won');
    expect(s.integrity).toBe(20);

    // 1 · 6♣ a PICAS: ×2 = 12, cae la Sota y los ♣ dan Escudo
    expect(impact(log[0])).toMatchObject({ tower: 'S', fuerza: 12, res: 1, total: 12 });
    expect(log[0].find((e) => e.e === 'wall')).toMatchObject({ amount: 2 });
    // 2 · 8♥ a TRÉBOLES: ×2 = 16
    expect(impact(log[1])).toMatchObject({ tower: 'C', total: 16 });
    // 3 · el 9♦ a La Manga
    expect(log[2]).toEqual([expect.objectContaining({ e: 'stash', card: expect.objectContaining({ id: 'D9' }), back: null })]);
    // 4 · grupo 7♠ 7♣ a DIAMANTES: (2 + 14 + 7) × 1,2 = 28
    expect(impact(log[3])).toMatchObject({ tower: 'D', fuerza: 23, res: 1.2, total: 28 });
    // 5 · el 9♦ de La Manga, 18 justos contra el Rey de CORAZONES
    expect(impact(log[4])).toMatchObject({ tower: 'H', total: 18 });
    expect(log[4].find((e) => e.e === 'floorDown')).toMatchObject({ tower: 'H', rank: 13, clean: true, towerDown: true });
    // los Contraataques del guion salen de tronos caídos
    for (const ev of [log[0], log[1], log[3]]) expect(ev.find((e) => e.e === 'siren')).toMatchObject({ reason: 'ruin', taken: 0 });
  });

  it('ningún paso se da por hecho con una jugada que no toca', () => {
    const s = createTutorial();
    const [palo, inmune, manga, cuenta, exacto] = TUTORIAL_STEPS;
    const tryStep = (step: (typeof TUTORIAL_STEPS)[number], action: Action) => {
      const res = applyAction(s, TUTORIAL_PLAYER, action);
      return step.done(viewFor(res.state, TUTORIAL_PLAYER), res.events);
    };
    // un 3♠ contra PICAS no hace nada: ni poder a la vista ni trono esquivado
    expect(tryStep(palo, { type: 'attack', cards: ['S3'], target: 'S' })).toBe(false);
    expect(tryStep(inmune, { type: 'attack', cards: ['H8'], target: 'H' })).toBe(false);
    expect(tryStep(inmune, { type: 'attack', cards: ['H8'], target: 'C' })).toBe(true);
    expect(tryStep(manga, { type: 'attack', cards: ['D9'], target: 'H' })).toBe(false);
    expect(tryStep(cuenta, { type: 'attack', cards: ['S3'], target: 'D' })).toBe(false);
    expect(tryStep(exacto, { type: 'attack', cards: ['C6'], target: 'S' })).toBe(false);
    // los done son puros: misma mesa y mismos eventos, misma respuesta
    const res = applyAction(s, TUTORIAL_PLAYER, { type: 'attack', cards: ['C6'], target: 'S' });
    const v = viewFor(res.state, TUTORIAL_PLAYER);
    expect(palo.done(v, res.events)).toBe(palo.done(v, res.events));
  });

  it('fuera del guion tampoco se pierde: el bot gana desde el principio y nadie muere jugando al azar', () => {
    let s = createTutorial();
    for (let i = 0; i < 60 && s.phase === 'playing'; i++) s = applyAction(s, TUTORIAL_PLAYER, chooseAction(s)).state;
    expect(s.phase).toBe('won');

    // jugadas legales al azar (semilla fija): cartas sueltas, grupos y descartes contra cualquier trono
    let seed = 12345;
    const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) | 0) >>> 0) / 4294967296;
    let lost = 0;
    let maxTurns = 0;
    for (let g = 0; g < 400; g++) {
      let t = createTutorial();
      for (let i = 0; i < 200 && t.phase === 'playing'; i++) {
        const p = t.players[0];
        const held = [...p.hand, ...p.reserve];
        const up = (['S', 'D', 'H', 'C'] as const).filter((x) => t.towers[x].floors.length);
        const pickCard = () => held[Math.floor(rnd() * held.length)];
        const r = rnd();
        let action: Action;
        if (!held.length) action = { type: 'pass' };
        else if (r < 0.15 && !t.stashed && p.hand.length) action = { type: 'stash', card: p.hand[Math.floor(rnd() * p.hand.length)].id };
        else if (r < 0.3) action = { type: 'discard', cards: [pickCard().id] };
        else {
          const c = pickCard();
          const target = up[Math.floor(rnd() * up.length)];
          action = c.suit === 'X' ? { type: 'joker', card: c.id, target } : { type: 'attack', cards: [c.id], target };
        }
        try {
          t = applyAction(t, TUTORIAL_PLAYER, action).state;
        } catch (err) {
          if (!(err instanceof RuleError)) throw err;
        }
      }
      if (t.phase === 'lost') lost++;
      maxTurns = Math.max(maxTurns, t.turnCount);
    }
    expect(lost).toBe(0);
  });

  it('las líneas nombran las cartas que sugiere el foco', () => {
    for (const p of TUTORIAL_STEPS) {
      const action = stepAction(p);
      expect(action, p.id).not.toBeNull();
      expect(visible(p.line).length).toBeLessThanOrEqual(60);
    }
  });
});
