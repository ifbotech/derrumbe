import { guardian } from './guardian';
guardian('ritmo-arbol', 900); // tope duro: ver scripts/guardian.ts
// Ritmo del Árbol de la Conjura (SPECS/V12.md, apartado 1.5): cuántas campañas tarda un jugador en
// comprar su primer rango, en llenar el Arsenal y en llenar el Árbol entero.
//
//   npx tsx scripts/ritmo-arbol.ts [jugadores=200] [--tope=160] [--semilla=12] [--comprueba=40]
//
// Guion: cada jugador simulado juega campañas seguidas con el bot de referencia (Reinado 1, baraja de la
// conjura, con las cartas legendarias que va desbloqueando), cobra al cerrar cada una (el cobro de la
// conjura: Coronas de `renownFor` × 100, lo que cayó a la mesa y los huesos, y los logros con `claim`) y
// luego compra. Dos pasadas con los mismos jugadores y semillas:
//   · «barato»:  compra el rango más barato que pueda, una y otra vez, hasta que no le alcance.
//   · «arsenal»: igual, pero solo nodos de combate hasta tener el Arsenal lleno; después, el resto.
// El guion prueba `buyUpgrade` (que mira saldo, padre y tope) sobre `UPGRADES`, ordenadas por el coste de su
// rango siguiente.
//
// Para caber en diez minutos, cada campaña se juega una sola vez por (semilla, Arsenal, legendarias): los 17
// nodos que no son del Arsenal no cambian ninguna partida de cinco asaltos (tests/arbol.test.ts; Manga honda y
// Buen ojo solo actúan en el Trono infinito, que este guion no juega: cuentan como del Trono infinito), así que la campaña se juega sin ellos
// y sus esquirlas se recalculan para el Árbol de cada jugador con las mismas `caidaDe` y `tirarHuesos` sobre
// los eventos guardados. `--comprueba=n` juega además n campañas con el Árbol real y exige el mismo cobro.
// Con el Arsenal lleno, cada proceso toma las campañas de un banco de semillas (`--banco=2200` en total):
// remuestreo, para que 200 jugadores quepan en unos cinco minutos.
// La línea base de la 11.0 (La Orden llena en 6 campañas de mediana) la midió la primera versión de este
// guion, antes de la V12 (bitácora de reglas-balance, bloque B).
// Objetivos (apartado 1.5): (a) primer rango tras 1 campaña en el 100 %; (b) Arsenal lleno a ±25 % de La
// Orden llena de la 11.0; (c) Árbol entero en 40–80 campañas de mediana.
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { claim, noteEvents, noteRun, unlockedPool } from '../src/rules/achievements';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { caidaDe, sumaPiezas } from '../src/rules/caida';
import { GameEvent, applyAction, currentPlayer } from '../src/rules/engine';
import { tirarHuesos } from '../src/rules/huesos';
import { ESQUIRLAS_POR_CORONA } from '../src/rules/migracion';
import { Meta, Run, UPGRADES, buyUpgrade, finishBattle, newMeta, newRun, renownFor, runAction, settle, startStage, trackEvents } from '../src/rules/run';

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const PLAYERS = Number(args.find((a) => !a.startsWith('--')) ?? 200);
const TOPE = Number(arg('tope') ?? 160);
const SEMILLA = Number(arg('semilla') ?? 12);
const COMPRUEBA = Number(arg('comprueba') ?? 40);
const BANCO = Number(arg('banco') ?? 2200);
type Pasada = 'barato' | 'arsenal';

const COMBATE = UPGRADES.filter((u) => u.combate);
const lleno = (meta: Meta, us: typeof UPGRADES) => us.every((u) => (meta.up[u.id] ?? 0) >= u.costs.length);

/** Lo que hace falta de una campaña para cobrarla con cualquier Árbol incremental. */
interface Hecho {
  id: number;
  coronas: number;
  /** Cada asalto jugado: su número, su monarca, si se ganó, los eventos que sueltan piezas y los guardias abatidos hasta ahí. */
  asaltos: { stage: number; boss: string | null; won: boolean; evs: GameEvent[]; floors: number }[];
  /** La Meta que deja la campaña sobre una Meta vacía (se suma a la del jugador). */
  delta: Meta;
}
const SUELTAN = new Set(['play', 'joker', 'impact', 'floorDown', 'gold', 'end']);
/** Solo los eventos que lee `caidaDe` (las cartas de `play`, solo cuántas). */
const compacta = (evs: GameEvent[]): GameEvent[] =>
  evs.filter((e) => SUELTAN.has(e.e) || (e.e === 'step' && e.src === 'chain')).map((e) => (e.e === 'play' ? { ...e, cards: e.cards.map(() => ({ id: '', suit: 'S', rank: 0 })) } : e.e === 'joker' ? { ...e, card: { id: '', suit: 'X', rank: 0 } } : e) as GameEvent);

/** Una campaña entera con el bot (con el `up` que se le dé) y lo que deja. */
function juega(up: Record<string, number>, pool: string[], seed: number): { hecho: Hecho; esquirlas: number } {
  const run = newRun({ up, deck: 'obra', ascension: 0, pool }, seed);
  const delta = newMeta();
  const players = [{ id: 'p0', name: 'p0' }];
  const asaltos: Hecho['asaltos'] = [];
  for (let guard = 0; guard < 6000 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
    if (run.phase === 'battle') {
      const evs: GameEvent[] = [];
      let state = startStage(run, players);
      while (state.phase === 'playing') {
        const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
        trackEvents(run, res.events);
        noteEvents(delta, res.events);
        evs.push(...compacta(res.events));
        state = res.state;
      }
      asaltos.push({ stage: run.stage, boss: run.boss, won: state.phase === 'won', evs, floors: run.stats.floors });
      finishBattle(run, state);
      noteRun(delta, run);
      continue;
    }
    const action = chooseRunAction(run);
    if (!action) throw new Error(`el bot no sabe qué hacer en la fase ${run.phase}`);
    const err = runAction(run, action);
    if (err) throw new Error(`decisión rechazada (${JSON.stringify(action)}): ${err}`);
    noteRun(delta, run);
  }
  noteRun(delta, run);
  const coronas = renownFor(run);
  settle(delta, run);
  return { hecho: { id: run.id, coronas, asaltos, delta }, esquirlas: run.esquirlas };
}

/** Las esquirlas de la mesa y de los huesos de una campaña con el Árbol `up` (las mismas funciones del motor). */
function esquirlasCon(h: Hecho, up: Record<string, number>): number {
  let total = 0;
  for (const a of h.asaltos) {
    let esq = sumaPiezas(caidaDe({ up, boss: a.boss, endless: false, stats: { floors: a.floors } as Run['stats'] }, a.evs)).esquirlas;
    if (a.won) esq += tirarHuesos({ up, endless: false, id: h.id, stage: a.stage, caida: { oro: 0, esquirlas: esq, gotas: 0 } }).esquirlas.extra;
    total += esq;
  }
  return total;
}

/** Suma a la Meta del jugador lo que dejó una campaña (contadores, récords y colección). */
function suma(meta: Meta, d: Meta): void {
  const s = meta.stats;
  const x = d.stats;
  for (const k of ['floors', 'cleans', 'forged', 'contracts', 'skips'] as const) s[k] += x[k];
  for (const k of ['maxHit', 'maxGold', 'reach', 'winAsc', 'intact', 'depth', 'maxTools'] as const) s[k] = Math.max(s[k], x[k]);
  for (const k of ['tools', 'specials', 'bosses', 'forms'] as const) for (const id of d.seen[k]) if (!meta.seen[k].includes(id)) meta.seen[k].push(id);
  meta.runs += d.runs;
  meta.wins += d.wins;
  meta.best = Math.max(meta.best, d.best);
  meta.ascMax = Math.max(meta.ascMax, d.ascMax);
}

const cache = new Map<string, Hecho>();
const soloCombate = (up: Record<string, number>) => Object.fromEntries(COMBATE.map((u) => [u.id, up[u.id] ?? 0]));

/** Cobra una campaña: la juega (o la toma de la caché) con el Arsenal del jugador y suma su cobro. */
function campana(meta: Meta, seed: number): void {
  const up = soloCombate(meta.up);
  const pool = unlockedPool(meta);
  const key = `${seed}|${JSON.stringify(up)}|${pool.join(',')}`;
  let h = cache.get(key);
  if (!h) {
    h = juega(up, pool, seed).hecho;
    cache.set(key, h);
  }
  suma(meta, h.delta);
  meta.renown += h.coronas * ESQUIRLAS_POR_CORONA + esquirlasCon(h, meta.up);
  claim(meta);
}

/** Compra mientras le alcance: el rango siguiente más barato (en la pasada «arsenal», primero el combate). */
function compras(meta: Meta, pasada: Pasada): number {
  let n = 0;
  for (;;) {
    const pool = pasada === 'arsenal' && !lleno(meta, COMBATE) ? COMBATE : UPGRADES;
    const next = pool
      .filter((u) => (meta.up[u.id] ?? 0) < u.costs.length)
      .map((u) => ({ id: u.id, cost: u.costs[meta.up[u.id] ?? 0] }))
      .sort((a, b) => a.cost - b.cost || (a.id < b.id ? -1 : 1));
    const hit = next.find((x) => x.cost <= meta.renown && buyUpgrade(meta, x.id));
    if (!hit) return n;
    n++;
  }
}

interface Jugador {
  primero: number | null;
  trasUna: boolean;
  arsenal: number | null;
  arbol: number | null;
  saldo1: number;
  /** Esquirlas ganadas en total tras cada campaña (las 15 primeras). */
  ganado: number[];
}

const semillaDe = (p: number, k: number) => ((SEMILLA * 1_000_003 + (p + 1) * 104_729 + k * 7_919) | 0) >>> 0;
let shardI = 0;
let shardOf = 1;
/** Con el Arsenal lleno, las campañas solo difieren por la semilla: se toman de un banco común del proceso (remuestreo). */
function semillaBanco(p: number, k: number): number {
  const porProceso = Math.max(1, Math.ceil(BANCO / shardOf));
  const h = (Math.imul(p + 1, 2_654_435_761) ^ Math.imul(k + 1, 40_503)) >>> 0;
  return semillaDe(100_000 + shardI, 1 + (h % porProceso));
}

function jugador(p: number, pasada: Pasada): Jugador {
  const meta = newMeta();
  const out: Jugador = { primero: null, trasUna: false, arsenal: null, arbol: null, saldo1: 0, ganado: [] };
  let gastado = 0;
  for (let k = 1; k <= TOPE; k++) {
    campana(meta, lleno(meta, COMBATE) ? semillaBanco(p, k) : semillaDe(p, k));
    if (k === 1) out.saldo1 = meta.renown;
    if (k <= 15) out.ganado.push(meta.renown + gastado);
    const before = meta.renown;
    const bought = compras(meta, pasada);
    gastado += before - meta.renown;
    if (bought && out.primero === null) out.primero = k;
    if (k === 1) out.trasUna = bought > 0;
    if (out.arsenal === null && lleno(meta, COMBATE)) out.arsenal = k;
    if (lleno(meta, UPGRADES)) {
      out.arbol = k;
      break;
    }
  }
  return out;
}

/** Juega n campañas con el Árbol real y comprueba que el cobro recalculado es el mismo. */
function comprueba(n: number, shardI: number): number {
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const st = { r: (i + 1) * 2654435761 + shardI };
    const r = (m: number) => ((st.r = (Math.imul(st.r, 1103515245) + 12345) >>> 0), st.r % (m + 1));
    const up = Object.fromEntries(UPGRADES.map((u) => [u.id, r(u.costs.length)]));
    const seed = semillaDe(9000 + shardI, i + 1);
    const real = juega(up, [], seed);
    const sin = juega(soloCombate(up), [], seed).hecho;
    if (real.esquirlas !== esquirlasCon(sin, up) || real.hecho.coronas !== sin.coronas) bad++;
  }
  return bad;
}

const shard = arg('shard');
if (shard) {
  const [i, of] = shard.split('/').map(Number);
  shardI = i;
  shardOf = of;
  const res: Record<Pasada, Jugador[]> & { malas: number; jugadas: number } = { barato: [], arsenal: [], malas: comprueba(Math.ceil(COMPRUEBA / of), i), jugadas: 0 };
  for (let p = i; p < PLAYERS; p += of) for (const pasada of ['barato', 'arsenal'] as Pasada[]) res[pasada].push(jugador(p, pasada));
  res.jugadas = cache.size;
  writeFileSync(arg('out')!, JSON.stringify(res));
  process.exit(0);
}

const t0 = performance.now();
const workers = Math.max(1, Math.min(Number(process.env.LAB_HILOS) || 11, availableParallelism() - 1));
const self = fileURLToPath(import.meta.url);
const files = Array.from({ length: workers }, (_, i) => join(tmpdir(), `derrumbe-ritmo-${process.pid}-${i}.json`));
await Promise.all(
  files.map(
    (out, i) =>
      new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, [...process.execArgv, self, ...args, `--shard=${i}/${workers}`, `--out=${out}`], { stdio: ['ignore', 'inherit', 'inherit'] });
        child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`proceso ${i}: código ${code}`))));
      }),
  ),
);
const all: Record<Pasada, Jugador[]> = { barato: [], arsenal: [] };
let malas = 0;
let jugadas = 0;
for (const f of files) {
  const r = JSON.parse(readFileSync(f, 'utf8')) as Record<Pasada, Jugador[]> & { malas: number; jugadas: number };
  all.barato.push(...r.barato);
  all.arsenal.push(...r.arsenal);
  malas += r.malas;
  jugadas += r.jugadas;
  rmSync(f, { force: true });
}

const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];
function linea(name: string, xs: (number | null)[]): string {
  const vals = xs.map((x) => x ?? Infinity);
  const fmt = (v: number) => (Number.isFinite(v) ? String(v) : `>${TOPE}`);
  const no = xs.filter((x) => x === null).length;
  return `  ${name.padEnd(22)} mediana ${fmt(q(vals, 0.5)).padStart(4)} · P10 ${fmt(q(vals, 0.1)).padStart(4)} · P90 ${fmt(q(vals, 0.9)).padStart(4)}${no ? ` · ${no} sin llegar` : ''}`;
}
const total = UPGRADES.reduce((a, u) => a + u.costs.reduce((b, c) => b + c, 0), 0);
const totalCombate = COMBATE.reduce((a, u) => a + u.costs.reduce((b, c) => b + c, 0), 0);
console.log(`Ritmo del Árbol · ${PLAYERS} jugadores · Reinado 1 · tope ${TOPE} campañas · semilla ${SEMILLA}`);
console.log(`  ${UPGRADES.length} nodos (${COMBATE.length} de combate) · coste total ${total} (combate ${totalCombate}, incremental ${total - totalCombate})`);
for (const pasada of ['barato', 'arsenal'] as Pasada[]) {
  const js = all[pasada];
  const una = js.filter((j) => j.trasUna).length;
  console.log(`pasada «${pasada}»`);
  console.log(`  primer rango tras 1 campaña: ${una}/${js.length} (${((una / js.length) * 100).toFixed(1)} %) · saldo tras la 1.ª: mediana ${q(js.map((j) => j.saldo1), 0.5)} · mín ${Math.min(...js.map((j) => j.saldo1))}`);
  console.log(linea('primer rango', js.map((j) => j.primero)));
  console.log(linea('Arsenal lleno', js.map((j) => j.arsenal)));
  console.log(linea('Árbol lleno', js.map((j) => j.arbol)));
  const k = Math.min(...js.map((j) => j.ganado.length));
  console.log(`  esquirlas ganadas (mediana, acumulado) tras 1…${k}: ${Array.from({ length: k }, (_, i) => q(js.map((j) => j.ganado[i]), 0.5)).join(' · ')}`);
}
console.log(`banco de ${BANCO} campañas con el Arsenal lleno (remuestreo por proceso)`);
console.log(`comprobación: ${malas} cobros distintos en ${workers * Math.ceil(COMPRUEBA / workers)} campañas con el Árbol real · ${jugadas} campañas jugadas`);
console.log(`tiempo ${((performance.now() - t0) / 1000).toFixed(0)} s con ${workers} procesos`);
if (malas) process.exit(1);
