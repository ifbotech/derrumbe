// balance-config.json: el esquema (tipos y rangos de cada campo), la constitución y que cada número que lee
// el motor sale del archivo. Lo último se comprueba cargando las reglas con un archivo cambiado (todos los
// números +1) y mirando que el motor juega y escribe con los números nuevos.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { AFINABLES, BALANCE, BalanceConfig, fill, getPath, num, setPath } from '../src/rules/balance-config';
import { DEFAULT_CONFIG, FORM, FORMATIONS, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../src/rules/engine';
import { KEYWORDS } from '../src/rules/keywords';
import { ASCENSIONS, BOSSES, DECKS, STAGES, UPGRADES } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOL, TOOLS } from '../src/rules/tools';

const RAW = JSON.parse(readFileSync(new URL('../src/rules/balance-config.json', import.meta.url), 'utf8')) as BalanceConfig;
const FX_KEYS = ['flat', 'flatPerCard', 'wallForce', 'highDouble', 'allHigh', 'allAdv', 'strikeMult', 'pierce', 'wall', 'wallPerCard', 'heal', 'hurt', 'splash', 'noSiren', 'draw', 'disarm', 'gold', 'goldOnKill'];

/** Todas las hojas numéricas del archivo, con su ruta. */
function leaves(o: unknown, path = ''): [string, number][] {
  if (typeof o === 'number') return [[path, o]];
  if (!o || typeof o !== 'object') return [];
  return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}
const ent = (n: number) => Number.isInteger(n);

describe('balance-config.json: esquema y rangos', () => {
  it('es el mismo objeto que lee el motor, y todo número es finito', () => {
    expect(BALANCE).toEqual(RAW);
    for (const [p, v] of leaves(RAW)) expect(Number.isFinite(v), p).toBe(true);
    expect(leaves(RAW).length).toBeGreaterThan(200);
  });

  it('asaltos: ocho, con Vida > 0 y Ataque ≥ 1; Trono infinito crece', () => {
    expect(RAW.asaltos).toHaveLength(8);
    for (const [i, s] of RAW.asaltos.entries()) {
      expect(s.hp, `asalto ${i + 1}`).toBeGreaterThan(0);
      expect(ent(s.threat) && s.threat >= 1, `asalto ${i + 1}`).toBe(true);
    }
    expect(RAW.tronoInfinito.hpCrece).toBeGreaterThan(1);
  });

  it('mesa: Vida y Ataque de los guardias positivos, divisores ≥ 1, manos ≥ 3', () => {
    for (const m of [RAW.mesa, { ...RAW.mesa, ...RAW.clasica.obra }]) {
      for (const r of ['11', '12', '13']) {
        expect(m.floorHp[r]).toBeGreaterThan(0);
        expect(m.floorThreat[r]).toBeGreaterThanOrEqual(1);
      }
      for (const p of ['1', '2', '3', '4']) expect(m.handSize[p]).toBeGreaterThanOrEqual(3);
    }
    for (const k of ['maxIntegrity', 'wallCap', 'collapseLoss', 'wallDiv', 'repairDiv', 'shardDiv'] as const) expect(RAW.mesa[k], k).toBeGreaterThanOrEqual(1);
    expect(RAW.clasica.brutal.maxIntegrity).toBeGreaterThan(0);
    expect(RAW.clasica.obra.collapseRelief).toHaveLength(4);
  });

  it('cuadrilla, Reinados, Asedio final, Puertas selladas y Anillo de sello', () => {
    expect(RAW.cuadrilla).toHaveLength(4);
    expect(RAW.cuadrilla[0]).toBe(1);
    for (let i = 1; i < 4; i++) expect(RAW.cuadrilla[i]).toBeGreaterThanOrEqual(RAW.cuadrilla[i - 1]);
    expect(RAW.reinados.corazas).toBeGreaterThanOrEqual(1);
    for (const k of ['impuesto', 'reyColerico', 'heridasViejas', 'guardiaNoche'] as const) expect(ent(RAW.reinados[k]) && RAW.reinados[k] >= 0, k).toBe(true);
    expect(ent(RAW.asedio.start) && RAW.asedio.start >= 1).toBe(true);
    expect(ent(RAW.asedio.every) && RAW.asedio.every >= 1).toBe(true);
    expect(RAW.asedio.res).toBeGreaterThan(0);
    for (const s of RAW.clausura.stages) expect(ent(s) && s >= 1 && s <= 8).toBe(true);
    expect(RAW.clausura.threat).toBeGreaterThanOrEqual(1);
    expect(ent(RAW.timbre.stamps) && RAW.timbre.stamps >= 1).toBe(true);
  });

  it('monarcas: cifras de decreto en rango', () => {
    const m = RAW.monarcas;
    expect(m.doble.contraataques).toBeGreaterThanOrEqual(2);
    expect(m.doble.ataque).toBeGreaterThan(0);
    expect(m.doble.ataque).toBeLessThan(1);
    expect(m.escasez.cartas).toBeGreaterThanOrEqual(1);
    expect(m.intemperie.escudoTope).toBeGreaterThanOrEqual(1);
    for (const v of [m.blindaje.ataque, m.furia.ataque, m.inestable.antes, m.inestable.vida]) expect(ent(v) && v >= 1).toBe(true);
  });

  it('La Taberna, el cobro y la Orden: precios ≥ 0, enteros; pesos > 0', () => {
    const t = RAW.taberna;
    for (const r of Object.values(t.rarezas)) {
      expect(ent(r.cost) && r.cost >= 0).toBe(true);
      expect(r.weight).toBeGreaterThan(0);
    }
    for (const v of [t.reliquias, t.sobre, t.sobreCiego, t.mesaLacre, t.pergamino.base, t.pergamino.porNivel, t.hoguera.base, t.hoguera.paso, t.curar.base, t.curar.paso, t.curar.vida, t.renovar.base, t.renovar.paso]) expect(ent(v) && v >= 0).toBe(true);
    for (const v of Object.values(RAW.cobro)) expect(ent(v) && v >= 0).toBe(true);
    expect(RAW.cobro.vidaCada).toBeGreaterThan(0);
    expect(RAW.cobro.interesCada).toBeGreaterThan(0);
    expect(Object.keys(RAW.orden.costes).sort()).toEqual(UPGRADES.map((u) => u.id).sort());
    for (const cs of Object.values(RAW.orden.costes)) for (const c of cs) expect(ent(c) && c > 0).toBe(true);
    expect(RAW.inicio.vida).toBeGreaterThan(RAW.barajas.corta.vida + RAW.reinados.heridasViejas);
    for (const v of Object.values(RAW.inicio)) expect(ent(v) && v >= 0).toBe(true);
  });

  it('formaciones, acabados y golpe: Daño ≥ 0, Multi > 0', () => {
    expect(Object.keys(RAW.formaciones).sort()).toEqual([...FORMATIONS].sort());
    for (const f of Object.values(RAW.formaciones)) {
      expect(f.f).toBeGreaterThanOrEqual(0);
      expect(f.r).toBeGreaterThanOrEqual(1);
      expect(f.lf).toBeGreaterThanOrEqual(0);
      expect(f.lr).toBeGreaterThanOrEqual(0);
    }
    for (const v of Object.values(RAW.acabados)) expect(v).toBeGreaterThan(0);
    expect(RAW.acabados.agrietadoRompe).toBeLessThan(1);
    for (const v of Object.values(RAW.golpe)) expect(v).toBeGreaterThan(0);
  });

  it('reliquias y especiales: cada id existe, cada cifra > 0, cada especial con sus efectos conocidos', () => {
    for (const [id, vals] of Object.entries(RAW.reliquias)) {
      expect(TOOL[id], id).toBeTruthy();
      for (const [k, v] of Object.entries(vals)) expect(v, `${id}.${k}`).toBeGreaterThan(0);
    }
    expect(Object.keys(RAW.especiales).sort()).toEqual(SPECIALS.map((s) => s.id).sort());
    for (const [id, fx] of Object.entries(RAW.especiales)) {
      for (const [k, v] of Object.entries(fx)) {
        expect(FX_KEYS, `${id}.${k}`).toContain(k);
        expect(typeof v === 'boolean' ? v : v > 0, `${id}.${k}`).toBe(true);
      }
    }
  });

  it('los campos afinables existen y son números', () => {
    for (const a of AFINABLES) expect(typeof getPath(RAW, a.ruta), a.ruta).toBe('number');
    expect(new Set(AFINABLES.map((a) => a.ruta)).size).toBe(AFINABLES.length);
  });
});

describe('constitución con los textos generados', () => {
  const descs = [...TOOLS.map((t) => t.desc), ...SPECIALS.map((s) => s.desc), ...BOSSES.flatMap((b) => [b.desc, b.curse.badge]), ...ASCENSIONS.map((a) => a.desc), ...DECKS.map((d) => d.desc), ...UPGRADES.map((u) => u.desc), ...SEALS.map((s) => SEAL[s].desc), ...TREATMENTS.map((t) => TREATMENT[t].desc), ...Object.values(TOWER_FX).map((f) => f.desc)];

  it('≤ 6 palabras clave, ≤ 56 reliquias, descripciones ≤ 115 y sin plantillas sin rellenar', () => {
    expect(KEYWORDS.length).toBeLessThanOrEqual(6);
    expect(TOOLS.length).toBeLessThanOrEqual(56);
    for (const d of [...TOOLS.map((t) => t.desc), ...SPECIALS.map((s) => s.desc), ...BOSSES.map((b) => b.desc), ...ASCENSIONS.map((a) => a.desc)]) expect(d.length, d).toBeLessThanOrEqual(115);
    for (const d of descs) expect(d, d).not.toMatch(/[{}]/);
  });

  it('cada cifra de una reliquia se ve en su texto', () => {
    for (const t of TOOLS) for (const v of Object.values(BALANCE.reliquias[t.id] ?? {})) expect(t.desc, t.id).toContain(num(t.id === 'prensa' ? 1 + v : v));
  });

  it('fill y num: coma decimal, dos decimales como mucho, y falla si falta una cifra', () => {
    expect(num(0.15)).toBe('0,15');
    expect(num(1.05)).toBe('1,05');
    expect(num(1 + 4 * 0.05)).toBe('1,2');
    expect(fill('+{a} y ×{b}', { a: 3, b: 1.5 })).toBe('+3 y ×1,5');
    expect(() => fill('+{a}', {})).toThrow();
  });
});

describe('cada número que lee el motor sale de balance-config.json', () => {
  /** Las reglas cargadas de nuevo con todos los números del archivo +1 (salvo los asaltos de Puertas selladas). */
  async function patched() {
    vi.resetModules();
    const cfg = await import('../src/rules/balance-config');
    for (const [p, v] of leaves(cfg.BALANCE)) if (!p.startsWith('clausura.stages')) setPath(cfg.BALANCE, p, v + 1);
    const [engine, run, tools, specials] = await Promise.all([import('../src/rules/engine'), import('../src/rules/run'), import('../src/rules/tools'), import('../src/rules/specials')]);
    return { B: cfg.BALANCE, engine, run, tools, specials };
  }

  it('las tablas del motor son las del archivo', async () => {
    const { B, engine, run, tools, specials } = await patched();
    expect(run.STAGES.map((s) => [s.hp, s.threat])).toEqual(B.asaltos.map((s) => [s.hp, s.threat]));
    expect(run.FATIGUE).toEqual(B.asedio);
    expect(run.TIMBRE).toEqual(B.timbre);
    expect(run.CLAUSURA).toEqual(B.clausura);
    expect(engine.FORM).toEqual(B.formaciones);
    expect(engine.DEFAULT_CONFIG).toEqual(B.mesa);
    expect(engine.DIFFICULTY.obra).toMatchObject(B.clasica.obra);
    expect(engine.DIFFICULTY.brutal).toMatchObject(B.clasica.brutal);
    for (const r of ['comun', 'oficio', 'capataz', 'reliquia'] as const) expect(tools.RARITY[r]).toMatchObject(B.taberna.rarezas[r]);
    for (const u of run.UPGRADES) expect(u.costs, u.id).toEqual(B.orden.costes[u.id]);
    for (const s of specials.SPECIALS) expect(s.fx, s.id).toEqual(B.especiales[s.id]);
    // y lo que se enseña sale de los mismos números
    for (const t of tools.TOOLS) for (const v of Object.values(B.reliquias[t.id] ?? {})) expect(t.desc, t.id).toContain(num(t.id === 'prensa' ? 1 + v : v)); // el Cetro enseña ×(1 + cifra)
    expect(engine.TREATMENT.forjado.desc).toContain(num(B.acabados.forjado));
    expect(engine.SEAL.jornal.desc).toContain(num(B.sellos.jornal));
    expect(run.BOSS.furia.curse.badge).toContain(num(B.monarcas.furia.ataque));
    expect(run.ASCENSIONS[2].desc).toContain(num(B.reinados.impuesto));
    expect(run.DECK.corta.desc).toContain(num(B.barajas.corta.vida));
    // las originales no cambiaron: el archivo de disco sigue igual
    expect(STAGES[0].hp).toBe(RAW.asaltos[0].hp);
    expect(DEFAULT_CONFIG).toEqual(RAW.mesa);
    expect(FORM).toEqual(RAW.formaciones);
  });

  it('campaña: Vida, oro, precios y Reinados', async () => {
    const { B, run } = await patched();
    const r = run.newRun({ up: { caja: 1 } }, 5);
    expect(r.maxIntegrity).toBe(B.inicio.vida);
    expect(r.gold).toBe(B.inicio.oro + B.orden.oroPorNivel);
    expect(r.interestCap).toBe(B.inicio.interesTope);
    expect(r.pack).toHaveLength(B.inicio.sobre);
    expect(run.newRun({ ascension: 5 }, 5).maxIntegrity).toBe(B.inicio.vida - B.reinados.heridasViejas);
    r.removals = 2;
    r.heals = 2;
    r.rerolls = 2;
    expect(run.removeCost(r)).toBe(B.taberna.hoguera.base + 2 * B.taberna.hoguera.paso);
    expect(run.healCost(r)).toBe(B.taberna.curar.base + 2 * B.taberna.curar.paso);
    expect(run.rerollCost(r)).toBe(B.taberna.renovar.base + 2 * B.taberna.renovar.paso);
    const c = run.stageConfig(r, 1);
    expect(c.floorHp[11]).toBe(Math.round(B.mesa.floorHp[11] * (B.asaltos[0].hp * 1 * B.cuadrilla[0])));
    expect(c.floorThreat[11]).toBe(B.mesa.floorThreat[11] + B.asaltos[0].threat);
    expect(c.fatigueStart).toBe(Math.round(B.asedio.start * B.cuadrilla[0]));
    expect(run.stageConfig(r, 2).floorHp[11]).toBe(Math.round(B.mesa.floorHp[11] * (B.asaltos[0].hp * 1 * B.cuadrilla[1])));
    const a = run.newRun({ ascension: 6 }, 5);
    const ca = run.stageConfig(a, 1);
    expect(ca.floorHp[11]).toBe(Math.round(B.mesa.floorHp[11] * (B.asaltos[0].hp * B.reinados.corazas * B.cuadrilla[0])));
    expect(ca.floorThreat[13]).toBe(B.mesa.floorThreat[13] + B.asaltos[0].threat + B.reinados.reyColerico);
    expect(ca.floorThreat[11]).toBe(B.mesa.floorThreat[11] + B.asaltos[0].threat + B.reinados.guardiaNoche);
  });

  it('decretos de los monarcas', async () => {
    const { B, engine, run } = await patched();
    const base = () => structuredClone(engine.DEFAULT_CONFIG);
    const furia = base();
    run.BOSS.furia.apply(furia);
    expect(furia.floorThreat[11]).toBe(B.mesa.floorThreat[11] + B.monarcas.furia.ataque);
    const helada = base();
    run.BOSS.intemperie.apply(helada);
    expect(helada.wallCap).toBe(Math.min(B.mesa.wallCap, B.monarcas.intemperie.escudoTope));
    const doble = base();
    run.BOSS.doble.apply(doble);
    expect(doble.sirenCount).toBe(B.monarcas.doble.contraataques);
    expect(doble.floorThreat[13]).toBe(Math.max(1, Math.ceil(B.mesa.floorThreat[13] * B.monarcas.doble.ataque)));
    const usurero = base();
    run.BOSS.escasez.apply(usurero);
    expect(usurero.handSize[2]).toBe(B.mesa.handSize[2] - B.monarcas.escasez.cartas);
    const inq = base();
    run.BOSS.blindaje.apply(inq);
    expect(inq.bracedThreat).toBe(B.monarcas.blindaje.ataque);
    const rel = { ...base(), fatigueStart: 20 };
    run.BOSS.inestable.apply(rel);
    expect(rel.fatigueStart).toBe(20 - B.monarcas.inestable.antes);
    expect(rel.crumbleHurt).toBe(B.monarcas.inestable.vida);
  });

  it('reliquias, acabados y especiales en un golpe', async () => {
    const { B, engine, tools } = await patched();
    type Card = import('../src/rules/engine').Card;
    const card = (id: string, extra: Partial<Card> = {}): Card => ({ id, suit: id[0] as Card['suit'], rank: Number(id.slice(1)), ...extra });
    const env = (ids: string[] = [], over: Partial<{ integrity: number; wall: number; scrap: number }> = {}) => {
      const config = structuredClone(engine.DEFAULT_CONFIG);
      for (const id of ids) tools.TOOL[id].cfg?.(config);
      return { config, towers: engine.newTowers([11, 12, 13], config), tools: ids.map((id) => ({ id, n: 0 })), chain: 0, charge: 0, scrap: 0, integrity: 20, wall: 0, ...over };
    };
    const hit = (ids: string[], cs: Card[], over = {}) => engine.strike(env(ids, over), cs, 'D');
    const df = (id: string, cs: Card[], over = {}) => hit([id], cs, over).fuerza - hit([], cs, over).fuerza;
    const dr = (id: string, cs: Card[], over = {}) => Math.round((hit([id], cs, over).res - hit([], cs, over).res) * 1000) / 1000;
    const rx = (id: string, cs: Card[], over = {}) => Math.round((hit([id], cs, over).res / hit([], cs, over).res) * 1000) / 1000;
    const V = B.reliquias;
    expect(df('piqueta', [card('S7')])).toBe(V.piqueta.dano);
    expect(df('cincel', [card('S7')])).toBe(V.cincel.dano);
    expect(df('ariete', [card('S7')], { wall: 3 })).toBe(V.ariete.dano * 3);
    expect(df('montacargas', [card('S7')], { scrap: 2 })).toBe(V.montacargas.dano * 2);
    expect(df('mosaico', [card('S2'), card('H3'), card('C4')])).toBe(V.mosaico.dano);
    expect(dr('gemelos', [card('S7'), card('H7')])).toBe(V.gemelos.multi);
    expect(dr('dados', [card('S4'), card('H4'), card('C9'), card('H9')])).toBe(V.dados.multi);
    expect(dr('sismografo', [card('S7')], { integrity: 10 })).toBeCloseTo(V.sismografo.multi * (B.mesa.maxIntegrity - 10), 6);
    expect(rx('plano_maestro', [card('S7')])).toBe(V.plano_maestro.multi);
    expect(rx('resonador', [card('S2'), card('S3'), card('S4'), card('S5'), card('S6')])).toBe(V.resonador.multi); // V.resonador.cartas (+1) = 5
    expect(rx('ultimo', [card('S7')], { integrity: 5 })).toBe(V.ultimo.multi);
    const sacos = env(['sacos']).config;
    expect(sacos.wallCap).toBe(B.mesa.wallCap + V.sacos.tope);
    expect(env(['sordina']).config.floorThreat[12]).toBe(Math.max(1, B.mesa.floorThreat[12] - V.sordina.ataque));
    expect(env(['puntales']).config.collapseLoss).toBe(Math.max(0, B.mesa.collapseLoss - V.puntales.vida));
    // acabados y especiales
    const forjado = engine.strike(env(), [card('S7', { tr: 'forjado' })], 'D').fuerza - engine.strike(env(), [card('S7')], 'D').fuerza;
    expect(forjado).toBe(B.acabados.forjado);
    const barreno = engine.strike(env(), [card('S7'), { id: 'sp', suit: 'X', rank: 0, sp: 'barreno' }], 'D').fuerza - engine.strike(env(), [card('S7')], 'D').fuerza;
    expect(barreno).toBe(B.especiales.barreno.flat);
    // la formación pone la base del archivo
    expect(engine.strike(env(), [card('S7')], 'H')).toMatchObject({ fuerza: B.formaciones.solo.f + 7 });
  });
});

describe('getPath y setPath', () => {
  it('leen y escriben por ruta, y fallan si la ruta no es un número', () => {
    const o = structuredClone(RAW);
    expect(getPath(o, 'asaltos.0.hp')).toBe(RAW.asaltos[0].hp);
    setPath(o, 'asaltos.0.hp', 1.23);
    expect(o.asaltos[0].hp).toBe(1.23);
    expect(() => getPath(o, 'asaltos.0')).toThrow();
    expect(() => setPath(o, 'no.existe', 1)).toThrow();
  });
});
