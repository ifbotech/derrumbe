// V40 1d · Las piezas que se llevan (Amuletos, Trampas del Bufón y Bendiciones): su sello de nivel S · A · B, que sale
// del laboratorio, y su ★ Sinergia, una función pura de la pieza y de lo que se lleva (src/rules/piezas.ts).
import { describe, expect, it } from 'vitest';
import { repartoSellos } from '../scripts/sellos';
import { MAZO_NOMBRE } from '../src/rules/mazos';
import { SELLOS, existePieza, selloDe, sinergia } from '../src/rules/piezas';
import type { Pieza } from '../src/rules/piezas';
import { BENDICIONES, REY_IDS } from '../src/rules/reyes';
import { DECKS } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { sinergiaFor } from '../src/rules/textos';
import { TOOLS } from '../src/rules/tools';

const amu = (id: string): Pieza => ({ tipo: 'amuleto', id });
const deRey = (rey: string) => TOOLS.filter((t) => t.arch === rey);

describe('V40 1d · sellos de nivel S · A · B', () => {
  it('cada Amuleto, Trampa y Bendición tiene su sello calculado por el laboratorio', () => {
    for (const t of TOOLS) expect(selloDe(amu(t.id)), t.id).not.toBeNull();
    for (const s of SPECIALS) expect(selloDe({ tipo: 'trampa', id: s.id }), s.id).not.toBeNull();
    for (const b of BENDICIONES) expect(selloDe({ tipo: 'bendicion', id: b.id }), b.id).not.toBeNull();
  });

  it('en cada clase hay piezas de los tres sellos (nunca todo S)', () => {
    const clases = [TOOLS.map((t) => selloDe(amu(t.id))), SPECIALS.map((s) => selloDe({ tipo: 'trampa', id: s.id })), BENDICIONES.map((b) => selloDe({ tipo: 'bendicion', id: b.id }))];
    for (const sellos of clases) for (const s of SELLOS) expect(sellos).toContain(s);
  });

  it('repartoSellos: el tercio de mejor efecto S, el de peor B y el resto A; a igualdad, por id', () => {
    const filas = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, delta: i, n: 800 }));
    const r = repartoSellos(filas);
    expect(Object.values(r).filter((s) => s === 'S')).toHaveLength(3);
    expect(Object.values(r).filter((s) => s === 'B')).toHaveLength(3);
    expect(Object.values(r).filter((s) => s === 'A')).toHaveLength(4);
    expect(r.p9).toBe('S');
    expect(r.p0).toBe('B');
    expect(repartoSellos([{ id: 'a', delta: 9, n: 1 }, { id: 'b', delta: -9, n: 1 }])).toEqual({ a: 'A', b: 'A' });
    const empate = repartoSellos([{ id: 'b', delta: 1, n: 1 }, { id: 'a', delta: 1, n: 1 }, { id: 'c', delta: 0, n: 1 }]);
    expect(empate).toEqual({ a: 'S', b: 'A', c: 'B' });
  });

  it('una pieza que no existe no tiene sello ni sinergia', () => {
    expect(existePieza(amu('no-existe'))).toBe(false);
    expect(selloDe(amu('no-existe'))).toBeNull();
    expect(sinergia(amu('no-existe'), { mazo: 'escoba' })).toBeNull();
  });
});

describe('V40 1d · ★ Sinergia', () => {
  it('los nombres de los Mazos de las etiquetas son los de DECKS', () => {
    for (const d of DECKS) expect(MAZO_NOMBRE[d.id as keyof typeof MAZO_NOMBRE], d.id).toBe(d.name);
  });

  it('cada familia tiene Amuletos suficientes para encender el [4] de su Rey', () => {
    for (const rey of REY_IDS) expect(deRey(rey).length, rey).toBeGreaterThanOrEqual(4);
  });

  it('enciende un nivel: con un Amuleto de su Rey, el segundo es «★ <palo> [2]»', () => {
    for (const rey of REY_IDS) {
      const [a, b] = deRey(rey);
      const s = sinergia(amu(b.id), { tools: [{ id: a.id }] });
      expect(s?.tipo, rey).toBe('nivel');
      expect(s?.texto).toMatch(/^★ \S+ \[2\]$/);
    }
  });

  it('acerca el [4]: con dos piezas de su Rey, la tercera es «★ <palo> 3/4» si no encaja con el Mazo', () => {
    for (const rey of REY_IDS) {
      const [a, b, c] = deRey(rey);
      const s = sinergia(amu(c.id), { tools: [{ id: a.id }, { id: b.id }], mazo: 'ninguno' });
      expect(s?.tipo, rey).toBe('acerca');
      expect(s?.texto).toMatch(/^★ \S+ 3\/4$/);
    }
  });

  it('con tres piezas, la cuarta enciende el [4]', () => {
    const [a, b, c, d] = deRey('bastos');
    expect(sinergia(amu(d.id), { tools: [{ id: a.id }, { id: b.id }, { id: c.id }] })?.texto).toBe('★ Bastos [4]');
  });

  it('encaja con el Mazo: «★ Para <Mazo>», y un nivel pesa más que el Mazo', () => {
    const t = TOOLS.find((x) => x.mazos?.length)!;
    const mazo = t.mazos![0];
    expect(sinergia(amu(t.id), { mazo })?.texto).toBe(`★ Para ${MAZO_NOMBRE[mazo]}`);
    const otro = deRey(t.arch).find((x) => x.id !== t.id)!;
    expect(sinergia(amu(t.id), { mazo, tools: [{ id: otro.id }] })?.tipo).toBe('nivel');
  });

  it('las Trampas solo encajan con su Mazo', () => {
    for (const s of SPECIALS) {
      const p: Pieza = { tipo: 'trampa', id: s.id };
      expect(sinergia(p, { mazo: 'ninguno' }), s.id).toBeNull();
      for (const m of s.mazos ?? []) expect(sinergia(p, { mazo: m })?.tipo, s.id).toBe('mazo');
    }
  });

  it('una Bendición enciende el nivel de su Rey igual que un Amuleto', () => {
    const b = BENDICIONES.find((x) => x.rey === 'copas')!;
    const s = sinergia({ tipo: 'bendicion', id: b.id }, { tools: [{ id: deRey('copas')[0].id }] });
    expect(s?.texto).toBe('★ Copas [2]');
  });

  it('una pieza que ya se lleva no lleva estrella; sin nada que encaje, null', () => {
    const [a, b] = deRey('oros');
    expect(sinergia(amu(a.id), { tools: [{ id: a.id }, { id: b.id }] })).toBeNull();
    const suelta = TOOLS.find((x) => !x.mazos?.length)!;
    expect(sinergia(amu(suelta.id), { mazo: 'escoba' })).toBeNull();
  });

  it('es pura: lo mismo da lo mismo, y no toca lo que recibe', () => {
    const [a, b] = deRey('espadas');
    const ctx = { tools: [{ id: a.id }], mazo: 'truco' };
    const copia = JSON.stringify(ctx);
    expect(sinergia(amu(b.id), ctx)).toEqual(sinergia(amu(b.id), ctx));
    expect(JSON.stringify(ctx)).toBe(copia);
  });

  it('en inglés: «★ For <Deck>» y el palo traducido', () => {
    const t = TOOLS.find((x) => x.mazos?.length)!;
    const s = sinergia(amu(t.id), { mazo: t.mazos![0] })!;
    expect(sinergiaFor('en', s)).toMatch(/^★ For /);
    const [a, b] = deRey('bastos');
    expect(sinergiaFor('en', sinergia(amu(b.id), { tools: [{ id: a.id }] })!)).toBe('★ Clubs [2]');
  });
});
