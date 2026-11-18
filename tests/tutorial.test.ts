import { describe, expect, it } from 'vitest';
import { Action, GameEvent, GameState, RuleError, applyAction, viewFor } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';
import { TUTORIAL_PLAYER, TUTORIAL_STEPS, createTutorial, stepAction } from '../src/rules/tutorial';
import { tFor } from '../src/shared/i18n';

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

  it('dos tronos, como el asalto 1: PICAS y CORAZONES; DIAMANTES y TRÉBOLES no están', () => {
    const s = createTutorial();
    expect(s.towers.S).toMatchObject({ floors: [11] });
    expect(s.towers.H).toMatchObject({ floors: [13, 12] });
    expect(s.config.floorHp).toMatchObject({ 11: 13, 12: 9, 13: 20 });
    for (const x of ['D', 'C'] as const) expect(s.towers[x]).toMatchObject({ floors: [], away: true });
    expect(s.players[0].hand.map((c) => c.id)).toEqual(['C6', 'H8', 'D9', 'D7', 'C7', 'H2', 'S3']);
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

    // 1 · 6♣ a PICAS (Sota, Vida 13): 6 × 1 = 6, queda en 7; el ♣ da +2 de Escudo
    expect(impact(log[0])).toMatchObject({ tower: 'S', fuerza: 6, res: 1, total: 6 });
    expect(log[0].find((e) => e.e === 'wall')).toMatchObject({ amount: 2 });
    expect(log[0].some((e) => e.e === 'floorDown')).toBe(false);
    // 2 · 8♥ a PICAS: 8 × 1 = 8 contra 7, cae la Sota y con ella PICAS (sin Golpe exacto)
    expect(impact(log[1])).toMatchObject({ tower: 'S', fuerza: 8, res: 1, total: 8 });
    expect(log[1].find((e) => e.e === 'floorDown')).toMatchObject({ tower: 'S', rank: 11, clean: false, towerDown: true });
    // 3 · el 9♦ a La Manga
    expect(log[2]).toEqual([expect.objectContaining({ e: 'stash', card: expect.objectContaining({ id: 'D9' }), back: null })]);
    // 4 · pareja 7♦ 7♣ a CORAZONES (Rey, Vida 20): (2 + 14) × 2 = 32, cae el Rey; +2 de Escudo; no salpica a nadie
    expect(impact(log[3])).toMatchObject({ tower: 'H', fuerza: 16, res: 2, total: 32 });
    expect(log[3].find((e) => e.e === 'floorDown')).toMatchObject({ tower: 'H', rank: 13, clean: false, towerDown: false, damage: 0 });
    expect(log[3].find((e) => e.e === 'wall')).toMatchObject({ amount: 2 });
    expect(log[3].some((e) => e.e === 'hit' && e.splash)).toBe(false);
    // 5 · el 9♦ de La Manga a CORAZONES (Reina, Vida 9): 9 × 1 = 9 justos, Golpe exacto y victoria
    expect(impact(log[4])).toMatchObject({ tower: 'H', fuerza: 9, res: 1, total: 9 });
    expect(log[4].find((e) => e.e === 'floorDown')).toMatchObject({ tower: 'H', rank: 12, clean: true, towerDown: true });
    // V35 · en la partida guiada nadie contraataca
    for (const ev of [log[0], log[1], log[3]]) expect(ev.find((e) => e.e === 'siren')).toBeUndefined();
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
    // V35 · solo se golpea al enemigo activo (PICAS): un ♠ contra PICAS es Inmune y no enseña nada
    expect(() => tryStep(inmune, { type: 'attack', cards: ['H8'], target: 'H' })).toThrow(RuleError);
    expect(tryStep(inmune, { type: 'attack', cards: ['S3'], target: 'S' })).toBe(false);
    expect(tryStep(inmune, { type: 'attack', cards: ['H8'], target: 'S' })).toBe(true);
    expect(tryStep(manga, { type: 'attack', cards: ['D9'], target: 'S' })).toBe(false);
    expect(tryStep(cuenta, { type: 'attack', cards: ['S3'], target: 'S' })).toBe(false);
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

  it('las líneas en inglés también caben en 60 caracteres y nombran las mismas cartas', () => {
    for (const p of TUTORIAL_STEPS) {
      const en = tFor('en', `guia.${p.id}.linea`);
      expect(en.length, p.id).toBeLessThanOrEqual(60);
      expect(en.match(/<b>[^<]*<\/b>/)?.[0], p.id).toBe(p.line.match(/<b>[^<]*<\/b>/)?.[0]);
    }
  });

  it('las líneas nombran las cartas que sugiere el foco', () => {
    for (const p of TUTORIAL_STEPS) {
      const action = stepAction(p);
      expect(action, p.id).not.toBeNull();
      expect(visible(p.line).length).toBeLessThanOrEqual(60);
    }
  });
});
