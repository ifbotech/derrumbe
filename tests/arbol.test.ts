// V12 · el Árbol de la Conjura (SPECS/V12.md, apartados 1.5 y 1.12; V40 1d: 28 nodos, con 4 arcones): 28 nodos y la raíz, costes, textos,
// compras y la neutralidad de los 17 nodos que no son del Arsenal en la campaña de cinco asaltos (V12-C: Manga
// honda y Buen ojo solo actúan en el Trono infinito; los otros 15 no cambian ningún combate).
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/rules/achievements';
import { ARBOL, RAIZ, RAMAS, arbolLleno, cifraDe, comprarNodo, costeDe, dosCifras, imanDe, mejorasAlAlcance, nodo, puedeComprar, siguienteMejora } from '../src/rules/arbol';
import { BALANCE, fill, fillFor } from '../src/rules/balance-config';
import { BOSSES, CONTRACTS, EVENTS, TAGS, UPGRADES, buyUpgrade, cleanUp, newMeta, newRun, stageConfig, startStage } from '../src/rules/run';
import { newTowers, previewStrike } from '../src/rules/engine';
import type { Card } from '../src/rules/engine';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';
import { DICCIONARIOS, tFor } from '../src/shared/i18n';
import { playCampaign } from '../scripts/lab';
import { muestra } from './muestra';

const ARCONES = ['caja_espadas', 'caja_bastos', 'caja_oros', 'caja_copas'];
const ORDEN_11 = [...ARCONES, 'tampones', 'bronce', 'vale', 'tienda', 'caja', 'rutas'];
const INCREMENTALES = ARBOL.filter((n) => !n.combate);
const PUROS = ARBOL.filter((n) => !n.combate && !n.infinito);

describe('la forma del Árbol', () => {
  it('V40 1d · 28 nodos y la raíz; 11 de combate, 2 del Trono infinito y 15 incrementales puros; 14 de 5 rangos', () => {
    expect(ARBOL).toHaveLength(28);
    expect(RAIZ.id).toBe('raiz');
    expect(nodo('raiz')).toBeUndefined();
    expect(new Set(ARBOL.map((n) => n.id)).size).toBe(28);
    expect(ARBOL.filter((n) => n.combate)).toHaveLength(11);
    expect(INCREMENTALES).toHaveLength(17);
    expect(PUROS).toHaveLength(15);
    expect(ARBOL.filter((n) => n.infinito).map((n) => n.id).sort()).toEqual(['gracia', 'manga']);
    expect(ARBOL.filter((n) => n.rangos === 5)).toHaveLength(14);
    expect(ARBOL.filter((n) => n.rangos === 2 || n.rangos === 3).map((n) => n.id).sort()).toEqual(['gracia', 'tasador', 'tienda', 'vale']);
    expect(ARBOL.filter((n) => n.rangos === 1)).toHaveLength(10);
    expect(UPGRADES).toBe(ARBOL);
  });

  it('las mejoras de La Orden siguen con su id en el Arsenal (V40 1d: los 4 arcones de los Reyes), con sus costes × 100', () => {
    for (const id of ORDEN_11) expect(nodo(id)?.rama, id).toBe('arsenal');
    // V12-C: los rangos 3 a 5 (nuevos) bajan para que el Arsenal lleno cueste unas 7 campañas (criterio 7)
    expect(nodo('caja')!.costs).toEqual([300, 600, 700, 800, 900]);
    expect(nodo('tasador')!.costs).toEqual([200, 300, 400]);
    expect(nodo('vale')!.costs).toEqual([400, 800]);
    expect(nodo('tienda')!.costs).toEqual([800, 1200]);
    for (const id of ARCONES) expect(nodo(id)!.costs).toEqual([400]);
    // V40 1c: 1 de oro por rango (5 con la Bolsa llena; la V35 daba 2: con más oro el bot del laboratorio rendía menos)
    expect(BALANCE.arbol.oroPorNivel).toBe(1);
  });

  it('cuatro ramas; cada padre existe, está en el Árbol y no hay ciclos', () => {
    expect(RAMAS.map((r) => r.id)).toEqual(['arsenal', 'bolsa', 'huesos', 'corona']);
    for (const n of ARBOL) {
      if (n.padre) expect(nodo(n.padre), n.id).toBeDefined();
      const seen = new Set<string>();
      for (let p: string | null = n.id; p; p = nodo(p)!.padre) {
        expect(seen.has(p), n.id).toBe(false);
        seen.add(p);
      }
    }
    for (const r of RAMAS) expect(ARBOL.some((n) => n.rama === r.id)).toBe(true);
    expect(ARBOL.filter((n) => n.combate).every((n) => n.rama === 'arsenal')).toBe(true);
    // lo que solo actúa en el Trono infinito vive en su rama, la Corona de hierro
    expect(ARBOL.filter((n) => n.infinito).every((n) => n.rama === 'corona' && !n.combate)).toBe(true);
    // ningún par de nodos ocupa el mismo sitio del pergamino
    const sitios = [RAIZ, ...ARBOL].map((n) => `${n.pos.x},${n.pos.y}`);
    expect(new Set(sitios).size).toBe(sitios.length);
  });

  it('costes enteros, positivos y crecientes; los incrementales, base × 3^(rango − 1) a dos cifras significativas', () => {
    for (const n of ARBOL) {
      expect(n.costs).toHaveLength(n.rangos);
      for (let i = 0; i < n.costs.length; i++) {
        expect(Number.isInteger(n.costs[i]) && n.costs[i] > 0, n.id).toBe(true);
        if (i) expect(n.costs[i], n.id).toBeGreaterThan(n.costs[i - 1]);
      }
    }
    expect(nodo('esq_golpe')!.costs).toEqual([50, 150, 450, 1400, 4100]);
    expect([dosCifras(1350), dosCifras(4050), dosCifras(150), dosCifras(50)]).toEqual([1400, 4100, 150, 50]);
  });

  it('cifras de cada rango (enteras salvo los segundos del imán) y los dados con multiplicadores enteros', () => {
    expect(cifraDe('caja', 3)).toEqual({ oro: 1 });
    expect(cifraDe('esq_monarca', 2)).toEqual({ n: 50 });
    expect(cifraDe('cara_rey', 1)).toEqual({ n: 4 });
    expect(cifraDe('cara_rey', 5)).toEqual({ n: 8 });
    expect(cifraDe('corona_hierro', 5)).toEqual({ n: 6 });
    expect(cifraDe('pendon', 3)).toEqual({ n: 300 });
    expect(cifraDe('piedra_iman', 5)).toEqual({ pct: 100, s: 0.5 });
    expect(imanDe({})).toEqual({ radio: 1, espera: 1 });
    expect(imanDe({ piedra_iman: 5 })).toEqual({ radio: 2, espera: 0.5 });
    for (const n of ARBOL) for (let r = 1; r <= n.rangos; r++) for (const [k, v] of Object.entries(cifraDe(n.id, r))) if (k !== 's') expect(Number.isInteger(v), `${n.id} ${k}`).toBe(true);
  });
});

describe('los textos de cada nodo', () => {
  it('nombre y descripción en los dos idiomas; cada rango relleno ≤ 100 caracteres, con su cifra y su punto', () => {
    for (const n of ARBOL) {
      for (const lang of ['es', 'en'] as const) {
        const d = DICCIONARIOS[lang];
        expect(d[`mejora.${n.id}.nombre`], `${lang} ${n.id}`).toBeTruthy();
        expect(d[`mejora.${n.id}.nombre`].length, `${lang} ${n.id}`).toBeLessThanOrEqual(24);
        expect(d[`mejora.${n.id}.desc`].length, `${lang} ${n.id}`).toBeLessThanOrEqual(100);
        if (!n.plantilla) continue;
        const p = d[`mejora.${n.id}.plantilla`];
        expect(p, `${lang} ${n.id}`).toBeTruthy();
        for (let r = 1; r <= n.rangos; r++) {
          const txt = fillFor(lang, p, cifraDe(n.id, r));
          expect(txt.length, `${lang} ${n.id} ${r}: ${txt}`).toBeLessThanOrEqual(100);
          expect(txt, `${lang} ${n.id} ${r}`).toMatch(/\d/);
          expect(txt).toMatch(/[.!]$/);
        }
        expect(d[`mejora.${n.id}.desc`]).toBe(fillFor(lang, p, cifraDe(n.id, 1)));
      }
      if (n.plantilla) expect(n.desc).toBe(fill(n.plantilla, cifraDe(n.id, 1)));
    }
    expect(tFor('es', 'mejora.caja.nombre')).toBe('Bolsa de la conjura');
    expect(tFor('en', 'mejora.caja.nombre')).toBe('Conspiracy Purse');
    for (const r of RAMAS) for (const lang of ['es', 'en'] as const) expect(DICCIONARIOS[lang][`rama.${r.id}.nombre`]).toBeTruthy();
  });

  it('ningún nodo repite el nombre de una reliquia, especial, monarca, juramento, atajo, Secreto o logro', () => {
    for (const lang of ['es', 'en'] as const) {
      const d = DICCIONARIOS[lang];
      const otros = new Set([
        ...TOOLS.map((t) => d[`reliquia.${t.id}.nombre`]),
        ...SPECIALS.map((s) => d[`especial.${s.id}.nombre`]),
        ...BOSSES.flatMap((b) => [d[`monarca.${b.id}.nombre`], d[`monarca.${b.id}.decreto`]]),
        ...CONTRACTS.map((c) => d[`juramento.${c.id}.nombre`]),
        ...TAGS.map((t) => d[`atajo.${t.id}.nombre`]),
        ...EVENTS.map((e) => d[`secreto.${e.id}.nombre`]),
        ...ACHIEVEMENTS.map((a) => d[`logro.${a.id}.nombre`]),
      ]);
      const nombres = ARBOL.map((n) => d[`mejora.${n.id}.nombre`]);
      expect(new Set(nombres).size).toBe(nombres.length);
      expect(nombres.filter((x) => otros.has(x)), lang).toEqual([]);
    }
  });
});

describe('comprar', () => {
  it('puedeComprar: saldo, padre y tope; comprarNodo gasta el coste del rango siguiente', () => {
    const meta = newMeta();
    expect(puedeComprar(meta, 'caja')).toBe('saldo');
    expect(puedeComprar(meta, 'vale')).toBe('padre');
    expect(puedeComprar(meta, 'inventado')).toBe('tope');
    meta.renown = 10_000;
    expect(puedeComprar(meta, 'vale')).toBe('padre');
    expect(comprarNodo(meta, 'vale')).toBe(false);
    expect(costeDe(meta, 'caja')).toBe(300);
    expect(comprarNodo(meta, 'caja')).toBe(true);
    expect(meta).toMatchObject({ renown: 9_700, up: { caja: 1 } });
    expect(puedeComprar(meta, 'vale')).toBeNull();
    for (let i = 0; i < 4; i++) expect(buyUpgrade(meta, 'caja')).toBe(true);
    expect(meta.renown).toBe(10_000 - 3_300);
    expect(costeDe(meta, 'caja')).toBeNull();
    expect(puedeComprar(meta, 'caja')).toBe('tope');
    expect(buyUpgrade(meta, 'caja')).toBe(false);
    // un rango migrado vale aunque su padre esté vacío: los padres solo cuentan para comprar
    const run = newRun({ up: { tasador: 2 } }, 3);
    expect(run.up.tasador).toBe(2);
    expect(run.up.tienda).toBe(0);
  });

  it('cleanUp recorta a los rangos nuevos (la Bolsa, hasta 5)', () => {
    expect(cleanUp({ caja: 9, vale: 99, gracia: 2, inventada: 3, pendon: -1 })).toMatchObject({ caja: 5, vale: 2, gracia: 2, pendon: 0 });
    expect(Object.keys(cleanUp({})).length).toBe(28);
  });
});

describe('V33 · la mejora que se propone al cerrar la campaña', () => {
  it('sin saldo: la más barata de las abiertas, con lo que falta; primero El Arsenal', () => {
    const meta = newMeta();
    meta.renown = 40;
    const sig = siguienteMejora(meta)!;
    expect(nodo(sig.id)!.rama).toBe('arsenal');
    expect(sig.id).toBe('caja');
    expect(sig.coste).toBe(costeDe(meta, 'caja'));
    expect(sig.falta).toBe(sig.coste - 40);
    expect(mejorasAlAlcance(meta)).toBe(0);
  });

  it('si alcanza para algo, se propone eso antes que una del Arsenal que no alcanza', () => {
    const meta = newMeta();
    meta.renown = costeDe(meta, 'piedra_iman')!;
    expect(meta.renown).toBeLessThan(costeDe(meta, 'caja')!);
    const sig = siguienteMejora(meta)!;
    expect(sig.falta).toBe(0);
    expect(puedeComprar(meta, sig.id)).toBeNull();
    expect(nodo(sig.id)!.rama).not.toBe('arsenal');
    expect(mejorasAlAlcance(meta)).toBeGreaterThan(0);
  });

  it('con saldo para varias, la más barata del Arsenal; nunca una con el padre sin comprar', () => {
    const meta = newMeta();
    meta.renown = 340;
    const sig = siguienteMejora(meta)!;
    expect(sig).toEqual({ id: 'caja', coste: costeDe(meta, 'caja'), falta: 0 });
    for (let i = 0; i < 200; i++) {
      const s2 = siguienteMejora(meta);
      if (!s2) break;
      const padre = nodo(s2.id)!.padre;
      expect(!padre || (meta.up[padre] ?? 0) >= 1).toBe(true);
      meta.renown = Math.max(meta.renown, s2.coste);
      expect(comprarNodo(meta, s2.id)).toBe(true);
    }
  });

  it('con el Árbol lleno no propone nada', () => {
    const meta = newMeta();
    meta.up = arbolLleno();
    meta.renown = 999999;
    expect(siguienteMejora(meta)).toBeNull();
    expect(mejorasAlAlcance(meta)).toBe(0);
  });
});

describe('efectos de combate', () => {
  it('Bolsa de la conjura y Ojo del tasador (Arsenal)', () => {
    expect(newRun({ up: { caja: 5 } }, 1).gold).toBe(BALANCE.inicio.oro + 5 * BALANCE.arbol.oroPorNivel);
    // el tasador baja el precio de cada reliquia de La Taberna (nunca de 1) sin cambiar el azar de la campaña
    const base = newRun({}, 11);
    const tas = newRun({ up: { tasador: 3 } }, 11);
    expect(tas.rng).toBe(base.rng);
  });

  it('Manga honda y Buen ojo: nada en los cinco asaltos; en el Trono infinito, 2 huecos y exacto pasándose por 1 o 2', () => {
    for (let s = 1; s <= 5; s++) {
      const r = newRun({ up: { manga: 1, gracia: 2 } }, 40 + s);
      r.stage = s;
      expect(stageConfig(r)).toEqual(stageConfig(Object.assign(newRun({}, 40 + s), { stage: s })));
      expect(stageConfig(r).reserveSize).toBeUndefined();
      expect(stageConfig(r).cleanOver).toBeUndefined();
    }
    const inf = (up: Record<string, number>) => Object.assign(newRun({ up }, 7), { stage: 6, endless: true });
    expect(stageConfig(inf({})).reserveSize).toBeUndefined();
    expect(stageConfig(inf({ manga: 1 })).reserveSize).toBe(2);
    expect(startStage(inf({ manga: 1 }), [{ id: 'p', name: 'p' }]).config.reserveSize).toBe(2);
    expect(stageConfig(inf({})).cleanOver).toBeUndefined();
    expect(stageConfig(inf({ gracia: 1 })).cleanOver).toBe(1);
    expect(stageConfig(inf({ gracia: 2 })).cleanOver).toBe(2);
    // con números: un 10 de ♠ contra el guardia de ♦ que se pasa por 0, 1, 2 y 3 de su Vida
    const exacto = (gracia: number, sobra: number) => {
      const config = stageConfig(inf({ gracia }));
      const towers = newTowers([10, 11, 12], config);
      const diez: Card[] = [{ id: 'S10', suit: 'S', rank: 10 }];
      const env = { config, towers, tools: [], chain: 0, charge: 0, scrap: 0, integrity: 20, wall: 0 };
      const total = previewStrike(env, diez, 'D').total;
      towers.D.damage = config.floorHp[10] - total + sobra;
      return previewStrike(env, diez, 'D').clean;
    };
    expect([0, 1, 2, 3].map((sobra) => exacto(0, sobra))).toEqual([true, false, false, false]);
    expect([0, 1, 2, 3].map((sobra) => exacto(1, sobra))).toEqual([true, true, false, false]);
    expect([0, 1, 2, 3].map((sobra) => exacto(2, sobra))).toEqual([true, true, true, false]);
  });
});

describe('neutralidad del incremental (criterio 5)', () => {
  it('los 15 incrementales puros no cambian ningún asalto (tampoco el Trono infinito); los 17 que no son del Arsenal, ninguno de los cinco', () => {
    const puro = arbolLleno('puro');
    expect(Object.values(puro).filter((v) => v > 0)).toHaveLength(15);
    const incr = arbolLleno('incremental');
    expect(Object.values(incr).filter((v) => v > 0)).toHaveLength(17);
    for (let s = 1; s <= 8; s++) {
      const a = newRun({}, 100 + s);
      const b = newRun({ up: s > 5 ? puro : incr }, 100 + s);
      a.stage = b.stage = s;
      a.endless = b.endless = s > 5;
      expect(stageConfig(b)).toEqual(stageConfig(a));
      expect(startStage(b, [{ id: 'p', name: 'p' }])).toEqual(startStage(a, [{ id: 'p', name: 'p' }]));
      expect(b.gold).toBe(a.gold);
      expect(b.deck).toEqual(a.deck);
    }
  });

  it('campañas con semilla (300 en la pasada completa, 36 en la rápida): mismos resultados de combate con los 17 nodos que no son del Arsenal al máximo y con el Árbol vacío', () => {
    const incr = arbolLleno('incremental');
    let distintas = 0;
    let n = 0;
    let ganadas = 0;
    let esqVacio = 0;
    let esqLleno = 0;
    for (let i = 0; i < muestra(300, 36); i++) {
      // Reinado 8 (campañas más cortas) y Reinado 1, alternados, con la baraja de la conjura
      const spec = { seed: (i + 1) * 7919 + 31, deck: 'escoba', ascension: i % 2 ? 7 : 0, full: false };
      const vacio = playCampaign(spec);
      const conIncr = playCampaign({ ...spec, up: incr });
      const pick = (r: typeof vacio) => ({ won: r.log.won, cleared: r.log.cleared, turnos: r.log.stageTurns, golpes: r.log.golpes, maxHit: r.log.maxHit, oro: r.log.gold, deck: r.run.deck.length, tools: r.log.toolsEnd, gotas: r.run.stats.gotas });
      if (JSON.stringify(pick(vacio)) !== JSON.stringify(pick(conIncr))) distintas++;
      n++;
      if (vacio.log.won) ganadas++;
      esqVacio += vacio.run.esquirlas;
      esqLleno += conIncr.run.esquirlas;
    }
    expect(n).toBeGreaterThanOrEqual(muestra(300, 36));
    expect(distintas).toBe(0);
    expect(ganadas).toBeGreaterThan(0);
    // y los incrementales sí hacen algo: más esquirlas
    expect(esqLleno).toBeGreaterThan(esqVacio);
  }, 600_000);
});
