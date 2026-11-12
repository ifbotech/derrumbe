import { describe, expect, it } from 'vitest';
import { SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS, applyAction, createGame } from '../src/rules/engine';
import { KEYWORDS, keywordsIn, markKeywords } from '../src/rules/keywords';
import { ASCENSIONS, BOSSES, CONTRACTS, DECKS, TAGS } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';

describe('palabras clave', () => {
  it('son seis como mucho', () => {
    expect(KEYWORDS.length).toBeLessThanOrEqual(6);
    expect(new Set(KEYWORDS.map((k) => k.id)).size).toBe(KEYWORDS.length);
  });

  it('se marcan en negrita sin tocar lo que va dentro de una etiqueta', () => {
    expect(markKeywords('<b title="Fuerza">+3 de Fuerza</b>')).toBe('<b title="Fuerza">+3 de <b class="kw" data-kw="fuerza">Fuerza</b></b>');
    expect(markKeywords('Cada golpe limpio: +2 de oro.')).toContain('<b class="kw" data-kw="limpio">golpe limpio</b>');
    expect(markKeywords('Sin palabras de las que marcar.')).toBe('Sin palabras de las que marcar.');
  });

  it('keywordsIn encuentra las que menciona un texto, una vez cada una', () => {
    const found = keywordsIn('<b>Crisol</b>La fractura multiplica ×2; los golpes de 3 palos también dejan fractura. +1 de Resonancia.');
    expect(found.map((k) => k.id)).toEqual(['resonancia', 'fractura']);
    expect(keywordsIn('Robas 2 cartas extra este turno.')).toEqual([]);
  });

  it('ningún texto del juego usa jerga fuera de esas seis', () => {
    // términos que existieron y se retiraron: ahora se dicen con palabras llanas
    const jerga = /escombro|sobrecarga|onda sísmica|\bascenso\b/i;
    const textos = [
      ...TOOLS.map((t) => t.desc),
      ...SPECIALS.map((s) => s.desc),
      ...BOSSES.map((b) => b.desc),
      ...CONTRACTS.map((c) => `${c.desc} ${c.reward}`),
      ...TAGS.map((t) => t.desc),
      ...DECKS.map((d) => d.desc),
      ...ASCENSIONS.map((a) => a.desc),
      ...SEALS.map((s) => SEAL[s].desc),
      ...TREATMENTS.map((t) => TREATMENT[t].desc),
      ...Object.values(TOWER_FX).map((f) => `${f.name} ${f.desc}`),
    ];
    for (const texto of textos) expect(texto).not.toMatch(jerga);
  });
});

describe('tiza y andamio', () => {
  it('mover el andamio no gasta el punto de replanteo: la tiza deshace la última jugada de verdad', () => {
    const start = { ...createGame([{ id: 'a', name: 'A' }], 4242), chalk: 1 };
    const first = start.players[0].hand[0];
    const played = applyAction(start, 'a', { type: 'discard', cards: [first.id] }).state;
    expect(played.undo).not.toBeNull();
    const stashed = applyAction(played, 'a', { type: 'stash', card: played.players[0].hand[0].id }).state;
    expect(stashed.players[0].reserve.length).toBe(1);
    const back = applyAction(stashed, 'a', { type: 'undo' }).state;
    // vuelve a antes del descarte: la carta está otra vez en la mano y el andamio, vacío
    expect(back.players[0].hand.map((c) => c.id)).toContain(first.id);
    expect(back.players[0].reserve).toEqual([]);
    expect(back.chalk).toBe(0);
    expect(() => applyAction(back, 'a', { type: 'undo' })).toThrow();
  });

  it('perder por un colapso no hace desaparecer la carta de la sirena', () => {
    // cantera vacía y búnker en las últimas: el rebarajado es mortal
    const s = createGame([{ id: 'a', name: 'A' }], 77);
    const all = (g: typeof s) => g.deck.length + g.discard.length + g.exhausted.length + g.burned.length + g.players.reduce((n, p) => n + p.hand.length + p.reserve.length, 0);
    const total = all(s);
    s.discard = s.deck;
    s.deck = [];
    s.integrity = 1;
    const end = applyAction(s, 'a', { type: 'discard', cards: [s.players[0].hand[0].id] }).state;
    expect(end.phase).toBe('lost');
    expect(all(end)).toBe(total);
  });
});
