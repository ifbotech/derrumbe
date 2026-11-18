// V40 · tramo 1a de la refundación (SPECS/V40-REFUNDACION.md): la baraja española, los nombres de los palos en un
// solo sitio, el Bufón que sustituye a la Partida guiada y lo que se fue (Asalto diario).
import { describe, expect, it } from 'vitest';
import { BUFON_MAX, FRASES_BUFON, consejoBufon } from '../src/rules/bufon';
import { ACHIEVEMENTS } from '../src/rules/achievements';
import {
  AS_ALTO, CABALLO, FIGURAS, FIGURA_NOMBRE, MATERIAL, MAX_NUM, PALO_NOMBRE, RANK_LABEL, REY, SOTA, SUITS,
  cardLabel, cardValue, classify, createGame, esFigura, standardDeck,
} from '../src/rules/engine';
import { newRun } from '../src/rules/run';
import { DICCIONARIOS, tFor } from '../src/shared/i18n';
import { cartaEn } from '../src/rules/textos';

const c = (suit: 'S' | 'D' | 'H' | 'C', rank: number) => ({ id: `${suit}${rank}`, suit, rank });

describe('V40 · la baraja española', () => {
  it('36 cartas de número (1 a 9 de cada palo) y 2 Comodines; ningún 10 numerado', () => {
    const d = standardDeck();
    const numeros = d.filter((x) => x.suit !== 'X');
    expect(numeros).toHaveLength(36);
    expect(d.filter((x) => x.suit === 'X')).toHaveLength(2);
    expect(Math.max(...numeros.map((x) => x.rank))).toBe(MAX_NUM);
    expect(MAX_NUM).toBe(9);
    for (const s of SUITS) expect(numeros.filter((x) => x.suit === s).map((x) => x.rank).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('la corte: 10 Sota, 11 Caballo, 12 Rey; los tronos se forman con ellas', () => {
    expect([SOTA, CABALLO, REY]).toEqual([10, 11, 12]);
    expect(FIGURAS).toEqual([10, 11, 12]);
    expect(FIGURAS.map((r) => FIGURA_NOMBRE[r])).toEqual(['Sota', 'Caballo', 'Rey']);
    expect(FIGURAS.map((r) => RANK_LABEL[r])).toEqual(['10', '11', '12']);
    expect([9, 10, 12].map(esFigura)).toEqual([false, true, true]);
    const g = createGame([{ id: 'a', name: 'A' }], 1);
    for (const s of SUITS) expect(g.towers[s].floors).toEqual([10, 11, 12]);
  });

  it('el As vale 11 y enlaza por abajo (1-2-3) y por arriba (8-9-1)', () => {
    expect(cardValue(c('S', 1))).toBe(11);
    expect(AS_ALTO).toBe(10);
    expect(classify([c('S', 8), c('H', 9), c('D', 1)])).toBe('escalera');
    expect(classify([c('S', 1), c('H', 2), c('D', 3)])).toBe('escalera');
    expect(classify([c('S', 9), c('H', 1), c('D', 2)])).toBeNull(); // no da la vuelta
  });

  it('los palos se nombran en un solo sitio: Espadas, Oros, Copas y Bastos (Swords, Coins, Cups, Clubs)', () => {
    expect(SUITS.map((s) => PALO_NOMBRE[s])).toEqual(['Espadas', 'Oros', 'Copas', 'Bastos']);
    expect(SUITS.map((s) => MATERIAL[s])).toEqual(['ESPADAS', 'OROS', 'COPAS', 'BASTOS']);
    expect(SUITS.map((s) => tFor('en', `palo.${s}.nombre`))).toEqual(['Swords', 'Coins', 'Cups', 'Clubs']);
    expect(SUITS.map((s) => tFor('en', `palo.${s}`))).toEqual(['SWORDS', 'COINS', 'CUPS', 'CLUBS']);
    expect(cardLabel(c('S', 7))).toBe('7 de Espadas');
    expect(cartaEn('en', '7 de Espadas')).toBe('7 of Swords');
    expect(cartaEn('en', '1 de Copas')).toBe('1 of Cups');
    expect(cartaEn('en', 'Comodín')).toBe('Joker');
  });

  it('ningún texto del juego, en ningún idioma, nombra los palos franceses ni lleva sus signos', () => {
    const FRANCES = /\b(?:picas|corazones|diamantes|tr[eé]boles|spades|hearts|diamonds)\b|[♠♥♦♣]/i;
    for (const lang of ['es', 'en'] as const) {
      const malas = Object.entries(DICCIONARIOS[lang]).filter(([, v]) => FRANCES.test(v)).map(([k, v]) => `${lang} ${k}: ${v}`);
      expect(malas).toEqual([]);
    }
  });
});

describe('V40 · el Bufón', () => {
  it('tres frases cortas, en los dos idiomas, sin HTML', () => {
    expect(FRASES_BUFON.map((f) => f.id)).toEqual(['palo', 'cuenta', 'exacto']);
    for (const f of FRASES_BUFON)
      for (const lang of ['es', 'en'] as const) {
        const t = tFor(lang, `bufon.${f.id}`);
        expect(t, `${lang} ${f.id}`).not.toBe(`bufon.${f.id}`);
        expect(t.length, `${lang} ${f.id}: ${t}`).toBeLessThanOrEqual(BUFON_MAX);
        expect(t).not.toMatch(/[<>{}]/);
      }
  });

  it('habla solo en los tres primeros golpes del Asalto 1 de la primera campaña, y se puede apagar', () => {
    const base = { campanas: 0, asalto: 1, jugadas: 0, apagado: false };
    expect([0, 1, 2, 3].map((jugadas) => consejoBufon({ ...base, jugadas }))).toEqual(['palo', 'cuenta', 'exacto', null]);
    expect(consejoBufon({ ...base, asalto: 2 })).toBeNull();
    expect(consejoBufon({ ...base, campanas: 1 })).toBeNull();
    expect(consejoBufon({ ...base, apagado: true })).toBeNull();
    expect(consejoBufon({ ...base, ajeno: true })).toBeNull();
  });
});

describe('V40 · lo que se fue', () => {
  it('sin Asalto diario: ni logro, ni opción de campaña, ni textos', () => {
    expect(ACHIEVEMENTS.some((a) => a.id === 'diaria')).toBe(false);
    expect('daily' in newRun({}, 1)).toBe(false);
    for (const lang of ['es', 'en'] as const) {
      const keys = Object.keys(DICCIONARIOS[lang]);
      expect(keys.filter((k) => /diari|^guia\.|tutorial/.test(k)), lang).toEqual([]);
    }
  });
});
