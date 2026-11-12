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
    expect(markKeywords('<b title="Daño">+3 de Daño</b>')).toBe('<b title="Daño">+3 de <b class="kw" data-kw="fuerza">Daño</b></b>');
    expect(markKeywords('Cada Golpe exacto: +2 de oro.')).toContain('<b class="kw" data-kw="limpio">Golpe exacto</b>');
    // «Daño» solo es palabra clave con mayúscula; «Multi» no casa dentro de «multiplica»
    expect(markKeywords('Hace daño y multiplica.')).toBe('Hace daño y multiplica.');
    expect(markKeywords('+1 de Multi.')).toBe('+1 de <b class="kw" data-kw="resonancia">Multi</b>.');
    expect(markKeywords('Sin palabras de las que marcar.')).toBe('Sin palabras de las que marcar.');
  });

  it('keywordsIn encuentra las que menciona un texto, una vez cada una', () => {
    const found = keywordsIn('<b>Caldero</b>La Brecha multiplica ×2; los golpes de 3 palos también dejan Brecha. +1 de Multi.');
    expect(found.map((k) => k.id)).toEqual(['resonancia', 'fractura']);
    expect(keywordsIn('Robas 2 cartas extra este turno.')).toEqual([]);
  });

  it('ningún texto del juego usa jerga fuera de esas seis', () => {
    // términos que existieron y se retiraron: ahora se dicen con palabras llanas
    const jerga = /escombro|sobrecarga|onda sísmica|\bascenso\b|\bobra\b|búnker|sirena|\bmuro\b|\btorre\b|\bpiso\b/i;
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

describe('Rebobinar y la Manga', () => {
  it('usar la Manga no gasta el rebobinado: Rebobinar deshace la última jugada de verdad', () => {
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

  it('perder con el Mazo agotado no hace desaparecer la carta del Contraataque', () => {
    // Mazo vacío y Vida en las últimas: el rebarajado es mortal
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
