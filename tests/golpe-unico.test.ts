// V40 1f · Ninguna muerte de un golpe con la Vida llena. Con los números de balance-config.json (y las reglas de
// verdad: `stageConfig` y `threatOf`), el Contraataque de un guardia o de un Guardia Bravo, con la Furia típica de su
// asalto (la mediana que mide `npm run analyze:meta -- golpes`, apuntada en scripts/objetivos.ts), quita como mucho el
// 60 % de la Vida máxima del Mazo más frágil; el Rey jefe, con la Furia que acumula cada turno al frente y el dado del
// Rey de Oros en su cara más alta, no mata de un golpe con la Vida llena en sus tres primeros turnos. En el Reinado 8,
// ningún guardia ni Bravo mata de un golpe con la Vida llena y el Rey jefe tampoco en sus dos primeros turnos.
import { describe, expect, it } from 'vitest';
import { OBJETIVOS } from '../scripts/objetivos';
import { threatOf, type Config, type Tower } from '../src/rules/engine';
import { MAZO_IDS } from '../src/rules/mazos';
import { BOSSES, LAST_STAGE, newRun, rangoBravo, stageConfig, stageDef, type Run } from '../src/rules/run';

const G = OBJETIVOS.golpeUnico;

/** La Vida máxima con que empieza cada Mazo en ese Reinado (sin Altar ni Bendiciones). */
const vidaDe = (deck: string, ascension: number): number => newRun({ deck, ascension }, 7).maxIntegrity;
const fragil = (ascension: number) => Math.min(...MAZO_IDS.map((d) => vidaDe(d, ascension)));

/** Una campaña puesta en el asalto s (o en el Guardia Bravo de su tramo), lista para leer sus reglas. */
function enAsalto(ascension: number, s: number, bravo = false, rey: string | null = null): { run: Run; cfg: Config } {
  const run = newRun({ deck: 'escoba', ascension }, 11);
  run.stage = s;
  run.combate = bravo ? 'bravo' : 'asalto';
  run.boss = rey;
  if (rey) run.bosses[s] = rey;
  if (bravo) {
    const n = run.mapa.nodos.find((x) => x.tipo === 'bravo' && x.tramo === s);
    if (!n) throw new Error(`sin Guardia Bravo en el tramo ${s}`);
    run.mapa.en = n.id;
  }
  return { run, cfg: stageConfig(run) };
}
const torre = (cfg: Config, suit: Tower['suit'], rango: number): Tower => ({ suit, floors: [rango], damage: 0, fx: {} });

/** El Contraataque más alto de los guardias (no jefes) de un asalto, con la Furia típica de ese asalto. */
function peorGuardia(ascension: number, s: number): number {
  const { cfg } = enAsalto(ascension, s);
  const furia = G.furiaTipica[s - 1] + (cfg.furiaInicial ?? 0);
  return Math.max(...stageDef(s).floors.map((r) => threatOf({ config: cfg, fatigue: furia }, torre(cfg, 'S', r))));
}
function peorBravo(ascension: number, t: number): number {
  const { cfg } = enAsalto(ascension, t, true);
  return threatOf({ config: cfg, fatigue: G.furiaTipica[t - 1] + (cfg.furiaInicial ?? 0) }, torre(cfg, cfg.orden![0], rangoBravo(t)));
}
/** El Contraataque del Rey jefe en su turno k (1, 2, 3…), con el dado en su cara más alta. */
function golpeRey(ascension: number, s: number, rey: string, k: number): number {
  const { cfg } = enAsalto(ascension, s, false, rey);
  const j = cfg.jefe!;
  const rango = Math.max(...stageDef(s).floors);
  return threatOf({ config: cfg, fatigue: G.furiaTipica[s - 1] + (cfg.furiaInicial ?? 0) + j.furia * (k - 1), dado: 6 }, torre(cfg, j.suit, rango));
}
const ASALTOS = Array.from({ length: LAST_STAGE }, (_, i) => i + 1);
const CON_REY = ASALTOS.filter((s) => stageDef(s).boss);

describe('V40 1f · ninguna muerte de un golpe con la Vida llena', () => {
  it(`Reinado 1: guardias y Guardias Bravos quitan como mucho el ${G.tope * 100} % de la Vida del Mazo más frágil`, () => {
    const v = fragil(0);
    for (const s of ASALTOS) expect(peorGuardia(0, s), `asalto ${s} (Vida ${v})`).toBeLessThanOrEqual(G.tope * v);
    for (const t of ASALTOS.slice(1)) expect(peorBravo(0, t), `Bravo del tramo ${t} (Vida ${v})`).toBeLessThanOrEqual(G.tope * v);
  });

  it(`Reinado 1: ningún Rey jefe mata de un golpe con la Vida llena en sus ${G.turnosRey} primeros turnos`, () => {
    const v = fragil(0);
    for (const s of CON_REY) for (const b of BOSSES) for (let k = 1; k <= G.turnosRey; k++) expect(golpeRey(0, s, b.id, k), `${b.id} en el asalto ${s}, turno ${k} (Vida ${v})`).toBeLessThan(v);
  });

  it('Reinado 8: nadie mata de un golpe con la Vida llena (el Rey jefe, en sus dos primeros turnos)', () => {
    const v = fragil(7);
    for (const s of ASALTOS) expect(peorGuardia(7, s), `asalto ${s}`).toBeLessThan(v);
    for (const t of ASALTOS.slice(1)) expect(peorBravo(7, t), `Bravo del tramo ${t}`).toBeLessThan(v);
    for (const s of CON_REY) for (const b of BOSSES) for (let k = 1; k <= 2; k++) expect(golpeRey(7, s, b.id, k), `${b.id} en el asalto ${s}, turno ${k}`).toBeLessThan(v);
  });

  it('la Furia típica de cada asalto es un entero ≥ 0 y la Vida de los Mazos sale de balance-config.json', () => {
    expect(G.furiaTipica.length).toBe(LAST_STAGE);
    for (const f of G.furiaTipica) expect(Number.isInteger(f) && f >= 0).toBe(true);
    expect(fragil(0)).toBeGreaterThan(0);
  });
});
