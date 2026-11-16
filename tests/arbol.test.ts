// V12 · el Árbol de la Conjura (SPECS/V12.md, apartados 1.5 y 1.12): 30 nodos y la raíz, costes, textos,
// compras y la neutralidad de los 15 nodos incrementales (no cambian ninguna partida).
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/rules/achievements';
import { ARBOL, RAIZ, RAMAS, arbolLleno, cifraDe, comprarNodo, costeDe, dosCifras, imanDe, nodo, puedeComprar } from '../src/rules/arbol';
import { BALANCE, fill, fillFor } from '../src/rules/balance-config';
import { BOSSES, CONTRACTS, EVENTS, TAGS, UPGRADES, buyUpgrade, cleanUp, newMeta, newRun, stageConfig, startStage } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';
import { DICCIONARIOS, tFor } from '../src/shared/i18n';
import { playCampaign } from '../scripts/lab';

const ORDEN_11 = ['caja_precision', 'caja_sismo', 'caja_alquimia', 'caja_limite', 'caja_trituradora', 'caja_aguante', 'tampones', 'bronce', 'vale', 'tienda', 'caja', 'rutas'];
const INCREMENTALES = ARBOL.filter((n) => !n.combate);

describe('la forma del Árbol', () => {
  it('30 nodos y la raíz; 15 de combate y 15 incrementales; 14 de 5 rangos', () => {
    expect(ARBOL).toHaveLength(30);
    expect(RAIZ.id).toBe('raiz');
    expect(nodo('raiz')).toBeUndefined();
    expect(new Set(ARBOL.map((n) => n.id)).size).toBe(30);
    expect(ARBOL.filter((n) => n.combate)).toHaveLength(15);
    expect(INCREMENTALES).toHaveLength(15);
    expect(ARBOL.filter((n) => n.rangos === 5)).toHaveLength(14);
    expect(ARBOL.filter((n) => n.rangos === 2 || n.rangos === 3).map((n) => n.id).sort()).toEqual(['gracia', 'tasador', 'tienda', 'vale']);
    expect(ARBOL.filter((n) => n.rangos === 1)).toHaveLength(12);
    expect(UPGRADES).toBe(ARBOL);
  });

  it('las 12 mejoras de La Orden siguen con su id en el Arsenal, con sus costes de hoy × 100 (la Bolsa, con 5 rangos)', () => {
    for (const id of ORDEN_11) expect(nodo(id)?.rama, id).toBe('arsenal');
    expect(nodo('caja')!.costs).toEqual([300, 600, 900, 1200, 1500]);
    expect(nodo('vale')!.costs).toEqual([400, 800]);
    expect(nodo('tienda')!.costs).toEqual([800, 1200]);
    for (const id of ['caja_precision', 'caja_sismo', 'caja_alquimia', 'caja_limite', 'caja_trituradora', 'caja_aguante']) expect(nodo(id)!.costs).toEqual([400]);
    expect(BALANCE.arbol.oroPorNivel).toBe(2);
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
    expect(cifraDe('caja', 3)).toEqual({ oro: 2 });
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
    expect(meta.renown).toBe(10_000 - 4_500);
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
    expect(Object.keys(cleanUp({})).length).toBe(30);
  });
});

describe('efectos de combate del Arsenal', () => {
  it('Bolsa de la conjura, Manga honda, Buen ojo y Ojo del tasador', () => {
    expect(newRun({ up: { caja: 5 } }, 1).gold).toBe(BALANCE.inicio.oro + 5 * BALANCE.arbol.oroPorNivel);
    const manga = newRun({ up: { manga: 1, gracia: 2 } }, 1);
    manga.phase = 'battle';
    const cfg = stageConfig(manga);
    expect(cfg.reserveSize).toBe(2);
    expect(cfg.cleanOver).toBe(2);
    expect(stageConfig(newRun({}, 1)).cleanOver).toBeUndefined();
    // el tasador baja el precio de cada reliquia de La Taberna (nunca de 1) sin cambiar el azar de la campaña
    const base = newRun({}, 11);
    const tas = newRun({ up: { tasador: 3 } }, 11);
    expect(tas.rng).toBe(base.rng);
  });
});

describe('neutralidad del incremental (criterio 5)', () => {
  it('los 15 nodos incrementales al máximo no cambian la configuración de ningún asalto', () => {
    const lleno = arbolLleno('incremental');
    expect(Object.values(lleno).filter((v) => v > 0)).toHaveLength(15);
    for (let s = 1; s <= 8; s++) {
      const a = newRun({}, 100 + s);
      const b = newRun({ up: lleno }, 100 + s);
      a.stage = b.stage = s;
      a.endless = b.endless = s > 5;
      expect(stageConfig(b)).toEqual(stageConfig(a));
      expect(startStage(b, [{ id: 'p', name: 'p' }])).toEqual(startStage(a, [{ id: 'p', name: 'p' }]));
      expect(b.gold).toBe(a.gold);
      expect(b.deck).toEqual(a.deck);
    }
  });

  it('≥ 300 campañas con semilla: mismos resultados de combate con los 15 incrementales al máximo y con el Árbol vacío', () => {
    const incr = arbolLleno('incremental');
    let distintas = 0;
    let n = 0;
    let ganadas = 0;
    let esqVacio = 0;
    let esqLleno = 0;
    for (let i = 0; i < 300; i++) {
      // Reinado 8 (campañas más cortas) y Reinado 1, alternados, con la baraja de la conjura
      const spec = { seed: (i + 1) * 7919 + 31, deck: 'obra', ascension: i % 2 ? 7 : 0, full: false };
      const vacio = playCampaign(spec);
      const conIncr = playCampaign({ ...spec, up: incr });
      const pick = (r: typeof vacio) => ({ won: r.log.won, cleared: r.log.cleared, turnos: r.log.stageTurns, golpes: r.log.golpes, maxHit: r.log.maxHit, oro: r.log.gold, deck: r.run.deck.length, tools: r.log.toolsEnd, gotas: r.run.stats.gotas });
      if (JSON.stringify(pick(vacio)) !== JSON.stringify(pick(conIncr))) distintas++;
      n++;
      if (vacio.log.won) ganadas++;
      esqVacio += vacio.run.esquirlas;
      esqLleno += conIncr.run.esquirlas;
    }
    expect(n).toBeGreaterThanOrEqual(300);
    expect(distintas).toBe(0);
    expect(ganadas).toBeGreaterThan(0);
    // y los incrementales sí hacen algo: más esquirlas
    expect(esqLleno).toBeGreaterThan(esqVacio);
  }, 600_000);
});
