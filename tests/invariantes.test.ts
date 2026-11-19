// Constitución anticomplejidad del juego. Si un cambio rompe una de estas pruebas, el cambio está mal:
// no se sube el límite, se simplifica otra cosa.
//
//   · como mucho 5 palabras clave (V11) y 56 reliquias (TOOLS), con identificadores únicos
//   · toda descripción cabe en 100 caracteres (V12; antes 115) y no inventa palabras clave
//   · el informe publicado del laboratorio (scripts/meta-report.json) es de estas reglas, no trae avisos,
//     ningún asalto (los cinco) pasa del tope de turnos de su tramo en el percentil 95 con ninguna baraja, y los Reinados 1 y 8
//     están en rango y bajan del 1 al 8 (objetivos de scripts/objetivos.ts, SPECS/V11.md 1.10)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fingerprint } from '../scripts/lab';
import { OBJETIVOS, duracion } from '../scripts/objetivos';
import { FORMATION_NAME, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../src/rules/engine';
import { KEYWORDS, TERMS } from '../src/rules/keywords';
import { ASCENSIONS, BOSSES, CONTRACTS, DECKS, FURIA, TAGS, UPGRADES } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { RARITY, RASGOS, TOOLS, UMBRALES } from '../src/rules/tools';

const MAX_DESC = 100;

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
  it('como mucho 5 palabras clave (V11)', () => {
    expect(KEYWORDS.length).toBeLessThanOrEqual(5);
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
    // Una palabra clave se reconoce porque va con mayúscula en mitad de la frase (Daño, Multi).
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
      ...Object.values(RARITY).map((r) => r.name),
      // vocabulario de mesa con mayúscula (Vida, Escudo, Mazo…): no son palabras clave
      ...TERMS,
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
    // y las cinco que existen se reconocen de verdad en algún texto del juego
    for (const k of KEYWORDS) expect(DESCS.some(([, d]) => new RegExp(k.match.source, k.match.flags).test(d)), k.name).toBe(true);
  });

  it('V35 · la Furia sube de uno en uno con el monarca y con cada Mazo agotado, siempre en enteros', () => {
    expect(Number.isInteger(FURIA.rey) && FURIA.rey >= 1).toBe(true);
    expect(Number.isInteger(FURIA.mazo) && FURIA.mazo >= 1).toBe(true);
  });

  it('V35 · cinco rasgos, cada Reliquia con el suyo, y tres bonos por rasgo (con 2, 4 y 6) de ≤ 100 caracteres', () => {
    expect(RASGOS.map((r) => r.id)).toEqual(['sangre', 'tahur', 'verdugo', 'bastion', 'horda']);
    expect(UMBRALES).toEqual([2, 4, 6]);
    for (const t of TOOLS) expect(RASGOS.some((r) => r.id === t.rasgo), t.id).toBe(true);
    // con seis huecos, cada rasgo tiene Reliquias de sobra para llegar a su bono de 6
    for (const r of RASGOS) expect(TOOLS.filter((t) => t.rasgo === r.id).length, r.id).toBeGreaterThanOrEqual(8);
    for (const r of RASGOS) for (const b of r.bonos) {
      expect(b.length, b).toBeLessThanOrEqual(100);
      expect(b.endsWith('.'), b).toBe(true);
      expect(b, b).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('informe publicado del laboratorio (scripts/meta-report.json)', () => {
  type Cell = { level?: number; deck?: string; name: string; vacio: number; lleno: number; n: number };
  const r = JSON.parse(readFileSync(new URL('../scripts/meta-report.json', import.meta.url), 'utf8')) as {
    quick: boolean;
    rules?: string;
    flags: string[];
    winrate: { levels: Cell[]; decks: Cell[] };
    pacing: { stage: number; name: string; p50: number; p95: number; n: number; j50?: number }[];
    pacingByDeck: { deck: string; name: string; worstP95: number; n: number }[];
    tools: { id: string; given: number | null; confirm: number | null; confirmN: number }[];
    bosses: { id: string; lethality: number; faced: number }[];
    avgLethality: number;
  };
  const between = (x: number, lo: number, hi: number, what: string) => {
    expect(x, what).toBeGreaterThanOrEqual(lo);
    expect(x, what).toBeLessThanOrEqual(hi);
  };

  // V12 → V26: durante el bucle, si las reglas de combate cambian, vale la certificación rápida de ESTAS reglas
  // (`npm run analyze:meta -- --fast` → scripts/meta-fast.json, en verde); el informe completo se rehace en la
  // coronación del Campeón. Las comprobaciones del contenido del informe solo corren si el informe es de estas reglas.
  const vigente = r.rules === fingerprint();
  const rapida = (() => {
    try {
      const f = JSON.parse(readFileSync(new URL('../scripts/meta-fast.json', import.meta.url), 'utf8')) as { rules?: string; ok?: boolean };
      return f.rules === fingerprint() && f.ok === true;
    } catch {
      return false;
    }
  })();

  it('las reglas de combate están certificadas: informe completo de estas reglas o certificación rápida en verde', () => {
    expect(vigente || rapida, 'reglas de combate sin certificar: npm run analyze:meta -- --fast (o el informe completo)').toBe(true);
  });

  it.runIf(vigente)('es un informe completo (si no, vuelve a lanzar npm run analyze:meta)', () => {
    expect(r.quick).toBe(false);
    expect(r.tools.map((t) => t.id)).toEqual(TOOLS.map((t) => t.id));
    expect(r.winrate.levels.map((l) => l.name)).toEqual(ASCENSIONS.map((a) => a.name));
    for (const l of r.winrate.levels) expect(l.n, `nivel ${l.level}`).toBeGreaterThanOrEqual(1000);
  });

  it.runIf(vigente)('no trae avisos', () => {
    expect(r.flags).toEqual([]);
  });

  it.runIf(vigente)('ningún asalto de los cinco pasa del tope de turnos de su tramo en el percentil 95, con ninguno de los cinco Mazos', () => {
    expect(r.pacingByDeck.map((d) => d.deck).sort()).toEqual(DECKS.map((d) => d.id).sort());
    for (const d of r.pacingByDeck) {
      expect(d.n, d.name).toBeGreaterThan(0);
      expect(d.worstP95, d.name).toBeLessThanOrEqual(OBJETIVOS.ritmoBaraja);
    }
    expect(r.pacing.map((p) => p.stage)).toEqual([1, 2, 3, 4, 5]);
    for (const p of r.pacing) expect(p.p95, `asalto ${p.stage}`).toBeLessThanOrEqual(OBJETIVOS.ritmo.find((t) => p.stage <= t.hasta)!.p95);
  });

  // V40 1b · la duración se estima con las jugadas (un turno no cuenta la jugada que abate ni las que no gastan el turno)
  it.runIf(vigente)('trae las jugadas de cada asalto (nunca menos que sus turnos) y la duración estimada está en rango', () => {
    for (const p of r.pacing) {
      expect(typeof p.j50, `asalto ${p.stage}`).toBe('number');
      expect(p.j50!, `asalto ${p.stage}`).toBeGreaterThanOrEqual(p.p50);
    }
    const min = duracion(r)!;
    expect(min).toBeGreaterThanOrEqual(OBJETIVOS.duracion.minutos[0]);
    expect(min).toBeLessThanOrEqual(OBJETIVOS.duracion.minutos[1]);
  });

  it('la duración de un informe sin jugadas usa el supuesto viejo de los turnos', () => {
    const D = OBJETIVOS.duracion;
    const fijo = D.inicio + 4 * D.entreacto + 2 * D.secreto + 5 * D.ritual;
    const p = [5, 9, 9, 10, 9].map((p50, i) => ({ stage: i + 1, name: '', p50, p95: 0, n: 1 }));
    expect(duracion({ pacing: p })).toBe(Math.round(((fijo + D.turno * 42) / 60) * 10) / 10);
    expect(duracion({ pacing: p.map((x) => ({ ...x, j50: 13 })) })).toBe(Math.round(((fijo + D.jugada * 65) / 60) * 10) / 10);
  });

  it.runIf(vigente)('el Reinado 1 y el Reinado 8 están en rango, y del 1 al 8 cada Reinado gana menos que el anterior', () => {
    const L = r.winrate.levels;
    const [l1, l8] = [L[0], L[7]];
    const O = OBJETIVOS;
    between(l1.vacio, O.reinado1.vacio[0], O.reinado1.vacio[1], 'Reinado 1, Árbol vacío');
    between(l1.lleno, O.reinado1.lleno[0], O.reinado1.lleno[1], 'Reinado 1, Árbol lleno');
    between(l8.vacio, O.reinado8.vacio[0], O.reinado8.vacio[1], 'Reinado 8, Árbol vacío');
    between(l8.lleno, O.reinado8.lleno[0], O.reinado8.lleno[1], 'Reinado 8, Árbol lleno');
    for (const [a, b] of L.slice(1).map((b, i) => [L[i], b])) {
      expect(b.vacio, `Reinados ${a.level} → ${b.level}, Árbol vacío`).toBeLessThan(a.vacio);
      expect(b.lleno, `Reinados ${a.level} → ${b.level}, Árbol lleno`).toBeLessThan(a.lleno);
    }
  });

  it.runIf(vigente)('ninguna herramienta dada de salida es una trampa (< 35 %) ni una victoria regalada (> 68 %)', () => {
    for (const t of r.tools) {
      // manda la segunda vuelta (muestra grande y semillas nuevas) si la pieza pasó por ella
      const wr = t.confirmN ? t.confirm : t.given;
      if (wr === null) continue;
      between(wr, 35, 68, `herramienta ${t.id}`);
    }
  });

  it.runIf(vigente)('los siete jefes matan entre 0,8× y 1,3× de la media', () => {
    expect(r.bosses.map((b) => b.id)).toEqual(BOSSES.map((b) => b.id));
    for (const b of r.bosses) between(b.lethality / r.avgLethality, 0.8, 1.3, `jefe ${b.id}`);
  });
});
