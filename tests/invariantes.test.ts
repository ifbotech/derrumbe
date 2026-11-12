// Constitución anticomplejidad de DERRUMBE. Si un cambio rompe una de estas pruebas, el cambio está mal:
// no se sube el límite, se simplifica otra cosa.
//
//   · como mucho 6 palabras clave y 56 herramientas, con identificadores únicos
//   · toda descripción cabe en 115 caracteres y no inventa palabras clave
//   · el informe publicado del laboratorio (scripts/meta-report.json) es de estas reglas, no trae avisos,
//     ninguna obra de la 4 a la 8 pasa de 19 turnos en el percentil 95 y los niveles 1 y 8 están en rango
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerprint } from '../scripts/lab';
import { FORMATION_NAME, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../src/rules/engine';
import { KEYWORDS } from '../src/rules/keywords';
import { ASCENSIONS, BOSSES, CONTRACTS, DECKS, FATIGUE, TAGS, UPGRADES } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';

const MAX_DESC = 115;

/** Todas las descripciones que la constitución limita, con un nombre para el mensaje de error. */
const DESCS: [string, string][] = [
  ...TOOLS.map((t): [string, string] => [`herramienta ${t.id}`, t.desc]),
  ...SPECIALS.map((s): [string, string] => [`especial ${s.id}`, s.desc]),
  ...BOSSES.map((b): [string, string] => [`jefe ${b.id}`, b.desc]),
  ...ASCENSIONS.map((a, i): [string, string] => [`nivel ${i + 1}`, a.desc]),
  ...CONTRACTS.map((c): [string, string] => [`contrato ${c.id}`, c.desc]),
  ...SEALS.map((s): [string, string] => [`sello ${s}`, SEAL[s].desc]),
  ...TREATMENTS.map((t): [string, string] => [`tratamiento ${t}`, TREATMENT[t].desc]),
  ...Object.entries(TOWER_FX).map(([k, v]): [string, string] => [`estado ${k}`, v.desc]),
  ...TAGS.map((t): [string, string] => [`etiqueta ${t.id}`, t.desc]),
];

describe('constitución anticomplejidad', () => {
  it('como mucho 6 palabras clave', () => {
    expect(KEYWORDS.length).toBeLessThanOrEqual(6);
    expect(new Set(KEYWORDS.map((k) => k.id)).size).toBe(KEYWORDS.length);
  });

  it('como mucho 56 herramientas, con identificadores únicos', () => {
    expect(TOOLS.length).toBeLessThanOrEqual(56);
    expect(new Set(TOOLS.map((t) => t.id)).size).toBe(TOOLS.length);
    expect(new Set(TOOLS.map((t) => t.name)).size).toBe(TOOLS.length);
    expect(new Set(SPECIALS.map((s) => s.id)).size).toBe(SPECIALS.length);
    expect(new Set(BOSSES.map((b) => b.id)).size).toBe(BOSSES.length);
    expect(new Set(CONTRACTS.map((c) => c.id)).size).toBe(CONTRACTS.length);
  });

  it(`toda descripción cabe en ${MAX_DESC} caracteres`, () => {
    const largas = DESCS.filter(([, d]) => d.length > MAX_DESC).map(([id, d]) => `${id} (${d.length}): ${d}`);
    expect(largas).toEqual([]);
    // y ninguna está vacía ni sin punto final: son frases, no etiquetas
    for (const [id, d] of DESCS) expect(d.trim().length, id).toBeGreaterThan(8);
    for (const [id, d] of DESCS) expect(d, id).toMatch(/[.!]$/);
  });

  it('las piezas que tocan un número lo dicen con cifras (nada de «mucho» o «más» a secas)', () => {
    const vago = /\b(mucho|mucha|muchos|muchas|bastante|un poco|algo de|enorme|ligeramente)\b/i;
    for (const [id, d] of DESCS) expect(d, id).not.toMatch(vago);
    // «más» y «menos» solo valen pegados a su cifra («1 carta menos», «2 de oro más», «4 cartas o más», «+3 más»)
    for (const [id, d] of DESCS) for (const m of d.matchAll(/\b(más|menos)\b/gi)) expect(/\d/.test(d.slice(Math.max(0, m.index - 22), m.index + 12)), `${id}: «${d}»`).toBe(true);
  });

  it('ninguna descripción usa una palabra clave que no exista', () => {
    // Una palabra clave se reconoce porque va con mayúscula en mitad de la frase (Fuerza, Resonancia).
    // Las únicas mayúsculas interiores permitidas son esas y los nombres propios del juego.
    const nombres = [
      ...KEYWORDS.map((k) => k.name),
      ...TOOLS.map((t) => t.name),
      ...SPECIALS.map((s) => s.name),
      ...BOSSES.flatMap((b) => [b.who, b.name]),
      ...DECKS.map((d) => d.name),
      ...UPGRADES.map((u) => u.name),
      ...ASCENSIONS.map((a) => a.name),
      ...Object.values(FORMATION_NAME),
      ...TREATMENTS.map((t) => TREATMENT[t].name),
      ...SEALS.map((s) => SEAL[s].name),
    ];
    const propias = new Set(nombres.flatMap((n) => n.split(/[^\p{L}]+/u)).filter((w) => /^\p{Lu}/u.test(w)));
    for (const w of ['K', 'Q', 'J', 'A', 'As', 'Ej']) propias.add(w);
    const intrusas: string[] = [];
    for (const [id, d] of DESCS) {
      // se quita el arranque de cada frase: ahí la mayúscula es ortografía, no jerga
      const interior = d.replace(/(^|[.!?:]\s+|\(\s*)\p{Lu}\p{L}*/gu, '$1');
      for (const w of interior.match(/\p{Lu}\p{L}*/gu) ?? []) if (!propias.has(w)) intrusas.push(`${id}: «${w}»`);
    }
    expect(intrusas).toEqual([]);
    // y las seis que existen se reconocen de verdad en algún texto del juego
    for (const k of KEYWORDS) expect(DESCS.some(([, d]) => new RegExp(k.match.source, k.match.flags).test(d)), k.name).toBe(true);
  });

  it('la fatiga de cimientos sube cada 2 turnos', () => {
    expect(FATIGUE.every).toBe(2);
  });
});

describe('informe publicado del laboratorio (scripts/meta-report.json)', () => {
  type Cell = { level?: number; deck?: string; name: string; vacio: number; lleno: number; n: number };
  const r = JSON.parse(readFileSync(new URL('../scripts/meta-report.json', import.meta.url), 'utf8')) as {
    quick: boolean;
    rules?: string;
    flags: string[];
    winrate: { levels: Cell[]; decks: Cell[] };
    pacing: { stage: number; p50: number; p95: number; n: number }[];
    pacingByDeck: { deck: string; name: string; worstP95: number; n: number }[];
    tools: { id: string; given: number | null; confirm: number | null; confirmN: number }[];
    bosses: { id: string; lethality: number; faced: number }[];
    avgLethality: number;
  };
  const between = (x: number, lo: number, hi: number, what: string) => {
    expect(x, what).toBeGreaterThanOrEqual(lo);
    expect(x, what).toBeLessThanOrEqual(hi);
  };

  it('es un informe completo y de estas mismas reglas (si no, vuelve a lanzar npm run analyze:meta)', () => {
    expect(r.quick).toBe(false);
    expect(r.rules, 'el informe se generó con otras reglas: npm run analyze:meta').toBe(fingerprint());
    expect(r.tools.map((t) => t.id)).toEqual(TOOLS.map((t) => t.id));
    expect(r.winrate.levels.map((l) => l.name)).toEqual(ASCENSIONS.map((a) => a.name));
    for (const l of r.winrate.levels) expect(l.n, `nivel ${l.level}`).toBeGreaterThanOrEqual(1000);
  });

  it('no trae avisos', () => {
    expect(r.flags).toEqual([]);
  });

  it('ninguna obra de la 4 a la 8 pasa de 19 turnos en el percentil 95, con ninguna de las seis barajas', () => {
    expect(r.pacingByDeck.map((d) => d.deck).sort()).toEqual(DECKS.map((d) => d.id).sort());
    for (const d of r.pacingByDeck) {
      expect(d.n, d.name).toBeGreaterThan(0);
      expect(d.worstP95, d.name).toBeLessThanOrEqual(19);
    }
    for (const p of r.pacing.filter((x) => x.stage >= 4)) expect(p.p95, `obra ${p.stage}`).toBeLessThanOrEqual(19);
  });

  it('el nivel 1 y el nivel 8 están en rango, y del 5 al 8 cada nivel gana menos que el anterior', () => {
    const [l1, , , , l5, l6, l7, l8] = r.winrate.levels;
    between(l1.vacio, 24, 30, 'nivel 1, gremio vacío');
    between(l1.lleno, 40, 48, 'nivel 1, gremio lleno');
    between(l8.vacio, 6, 9, 'nivel 8, gremio vacío');
    between(l8.lleno, 12, 17, 'nivel 8, gremio lleno');
    for (const [a, b] of [
      [l5, l6],
      [l6, l7],
      [l7, l8],
    ]) {
      expect(b.vacio, `niveles ${a.level} → ${b.level}, gremio vacío`).toBeLessThan(a.vacio);
      expect(b.lleno, `niveles ${a.level} → ${b.level}, gremio lleno`).toBeLessThan(a.lleno);
    }
  });

  it('ninguna herramienta dada de salida es una trampa (< 35 %) ni una victoria regalada (> 68 %)', () => {
    for (const t of r.tools) {
      // manda la segunda vuelta (muestra grande y semillas nuevas) si la pieza pasó por ella
      const wr = t.confirmN ? t.confirm : t.given;
      if (wr === null) continue;
      between(wr, 35, 68, `herramienta ${t.id}`);
    }
  });

  it('los siete jefes matan entre 0,8× y 1,3× de la media', () => {
    expect(r.bosses.map((b) => b.id)).toEqual(BOSSES.map((b) => b.id));
    for (const b of r.bosses) between(b.lethality / r.avgLethality, 0.8, 1.3, `jefe ${b.id}`);
  });
});
