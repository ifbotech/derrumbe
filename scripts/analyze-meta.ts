import { guardian } from './guardian';
guardian('analyze:meta', 2400); // tope duro: ver scripts/guardian.ts
// Laboratorio de balance: miles de campañas con semilla, repartidas entre los núcleos de la máquina,
// y un informe con lo que hay que mirar antes de tocar un número.
//
//   npm run analyze:meta              informe completo (≈ 52.000 campañas) → scripts/meta-report.json
//   npm run analyze:meta -- rapido    todo menos el estudio pieza a pieza, con muestra pequeña
//   npm run analyze:meta -- foco      solo los Reinados 1 y 8 (para afinar la dureza; --reinados=5,6,7 elige otros)
//   npm run analyze:meta -- niveles   los 8 Reinados · barajas: las 6 barajas en el Reinado 1 · clasica: el Asalto único
//   npm run analyze:meta -- regalos --piezas=clavos,ariete --n=600   unas pocas piezas, con muestra grande
//   … --n=2000 cambia las campañas por celda; --barajas=truco,chancho mide solo esos Mazos.
//   Solo el informe completo escribe meta-report.json.
//   npm run analyze:meta -- --tramo=1/5 … --tramo=5/5 y luego -- --juntar   el informe completo por tramos (< 300 s cada uno)
//     (V40 1c: antes de --juntar, -- --previo=clasica:1,2 · --previo=clasica:3,4 · --previo=confirmar, cada uno < 170 s)
//   npm run analyze:meta -- --fast  certificación rápida del bucle (6.000 campañas, < 90 s; 0 s si la huella no cambió)
//   npm run analyze:meta -- altar     (V40 1d) el Altar lleno quitando un grupo de nodos cada vez (los 5 Mazos por
//     turno, --n=600 por grupo): qué parte del Altar suma y cuál resta
//   npm run analyze:meta -- sellos --tramo=1/3 … --tramo=3/3 y luego -- sellos --juntar   (V40 1d) los sellos S · A · B de
//     cada Amuleto, Trampa y Bendición (regalo de salida frente a control, --n=800 por pieza) → balance-config.json
//
// Qué mide:
//   · porcentaje de campañas ganadas por baraja y por Reinado, con el Árbol vacío y lleno
//   · cada Amuleto, Trampa del Bufón, sello de lacre y acabado: cuánto se elige, cuánto se activa y
//     cuánto cambia el resultado (dada de salida frente a las campañas sin regalo, y llevándola a
//     media campaña)
//   · letalidad de cada monarca y duración de cada asalto (mediana y percentil 95 de turnos)
// Las piezas que salen mal paradas de regalo pasan una segunda vuelta con más campañas y semillas
// nuevas antes de dar aviso: con tantas piezas, alguna cae siempre por azar.
//
// Los objetivos (rangos de victorias, ritmo, letalidad, regalos) son datos de scripts/objetivos.ts: los
// mismos que lee el afinador (npm run balance:tune). Con BALANCE_PATCH en el entorno, el laboratorio juega
// con esos números cambiados (ver scripts/balance-patch.ts) sin tocar balance-config.json.
import './balance-patch';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAction } from '../src/rules/bot';
import { DIFFICULTY, SEAL, SEALS, TREATMENT, TREATMENTS, applyAction, createGame, currentPlayer } from '../src/rules/engine';
import { MAZO_IDS, MAZO_INICIAL } from '../src/rules/mazos';
import { ASCENSIONS, BOSS, BOSSES, DECKS, LAST_STAGE, STAGES, UPGRADES } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';
import { TITLE } from '../src/shared/brand';
import { Log, Spec, fingerprint, playCampaign } from './lab';
import { BENDICION, BENDICIONES, REY_NOMBRE } from '../src/rules/reyes';
import { OBJETIVOS, avisos, noise, revisarClasica } from './objetivos';
import { Medida, bloqueSellos, conSellos, repartoSellos } from './sellos';

const args = process.argv.slice(2);
// V12 · certificación rápida: 6.000 campañas en hilos de trabajo, o nada si la huella no cambió (scripts/lab-rapido.ts)
if (args.includes('--fast')) {
  const { rapido } = await import('./lab-rapido');
  process.exit(await rapido(args));
}
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const mode = args.find((a) => !a.startsWith('--')) ?? 'todo';
const quick = mode !== 'todo';
const N = Number(arg('n') ?? 0);
/** --barajas=truco,chancho: en el modo «barajas», mide solo esos Mazos. */
const onlyDecks = arg('barajas')?.split(',');
/** --vacio: solo el Altar vacío (para sondear una regla de Mazo en la mitad de tiempo; solo en los modos rápidos). */
const fulls = args.includes('--vacio') ? [false] : [false, true];
/** Campañas por pieza en el estudio de regalos (y otras tantas de control, con las mismas semillas y sin regalo). */
const GIFT_N = 160;
/**
 * Segunda vuelta. Con 160 campañas por pieza y casi 80 piezas, alguna sale muy baja por puro azar: las
 * que la primera vuelta señala se vuelven a medir con esta muestra y semillas nuevas, y solo avisa la
 * que sigue empeorando. (Elegir con unos datos y confirmar con otros evita perseguir el ruido.)
 */
const CONFIRM_N = 800;
/** Una herramienta dada de salida que gana menos que esto es una trampa; más que GIFT_MAX, una victoria regalada. */
const TRAP = OBJETIVOS.regalo.trampa;
const GIFT_MAX = OBJETIVOS.regalo.maximo;
/** --piezas=clavos,ariete: en el modo «regalos», las herramientas o especiales que se miden (con --n campañas cada una). */
const onlyPieces = arg('piezas')?.split(',') ?? [];
// El umbral de ruido de cada pieza (`noise`) vive con los objetivos, en scripts/objetivos.ts.

/** V40 1d · los grupos de nodos del Altar que mide el modo «altar» (los que tocan el combate o La Pulpería). */
const GRUPOS_ALTAR: string[][] = [['caja_espadas'], ['caja_bastos'], ['caja_oros'], ['caja_copas'], ['tienda'], ['tasador', 'vale', 'caja'], ['rutas'], ['tampones', 'bronce'], ['hueso_tallado', 'cara_rey', 'segundo_hueso']];

// ───────────────────────── Plan de campañas ─────────────────────────

function plan(): Spec[] {
  const specs: Spec[] = [];
  const seeds = (count: number, salt: number) => Array.from({ length: count }, (_, i) => (i + 1) * 7919 + salt * 104729);
  // todos los niveles juegan las mismas semillas: comparar uno con otro tiene así menos ruido
  const levels = (which: number[], count: number) => {
    for (const a of which) for (const full of fulls) for (const seed of seeds(count, 0)) specs.push({ seed, deck: MAZO_INICIAL, ascension: a, full });
  };
  const decks = (count: number) => {
    for (const d of DECKS) if (d.id !== MAZO_INICIAL && (!onlyDecks || onlyDecks.includes(d.id))) for (const full of fulls) for (const seed of seeds(count, 0)) specs.push({ seed, deck: d.id, ascension: 0, full });
  };
  const all = ASCENSIONS.map((_, a) => a);
  if (mode === 'clasica') return specs;
  if (mode === 'sellos') {
    // V40 1d · cada pieza de regalo al empezar, en las mismas campañas que el control: los 5 Mazos por turno y el Altar
    // vacío y lleno a medias (Reinado 1)
    const count = N || 800;
    const each = (extra: Partial<Spec>) => seeds(count, 41).forEach((seed, i) => specs.push({ seed, deck: MAZO_IDS[i % MAZO_IDS.length], ascension: 0, full: i % 2 === 1, ...extra }));
    each({ control: 'tool' });
    for (const t of TOOLS) each({ giveTool: t.id });
    for (const x of SPECIALS) each({ giveSpecial: x.id });
    for (const b of BENDICIONES) each({ giveBendicion: b.id });
    return specs;
  }
  if (mode === 'altar') {
    // V40 1d · el Altar lleno sin cada grupo de nodos que toca el combate o La Pulpería, frente al vacío y al lleno
    const count = N || 600;
    const todos = UPGRADES.map((u) => u.id);
    const each = (extra: Partial<Spec>) => seeds(count, 43).forEach((seed, i) => specs.push({ seed, deck: MAZO_IDS[i % MAZO_IDS.length], ascension: 0, full: true, ...extra }));
    each({ full: false, sinAltar: 'vacío' });
    each({ sinAltar: 'lleno' });
    for (const g of GRUPOS_ALTAR) each({ sinAltar: g.join(','), only: todos.filter((id) => !g.includes(id)) });
    return specs;
  }
  if (mode === 'regalos') {
    // unas pocas piezas con muestra grande, para saber si un aviso del informe es ruido o no
    const count = N || 600;
    const salt = Number(arg('sal') ?? 31); // --sal=29 repite las semillas que usa el informe completo para las especiales (23 para las herramientas)
    for (const seed of seeds(count, salt)) specs.push({ seed, deck: MAZO_INICIAL, ascension: 0, full: true, control: 'special' });
    for (const id of onlyPieces) for (const seed of seeds(count, salt)) specs.push({ seed, deck: MAZO_INICIAL, ascension: 0, full: true, ...(TOOLS.some((t) => t.id === id) ? { giveTool: id } : BENDICION[id] ? { giveBendicion: id } : { giveSpecial: id }) });
    return specs;
  }
  // --reinados=5,6,7: el foco mide esos Reinados en lugar del 1 y el 8 (V40 1c)
  if (mode === 'foco') return levels(arg('reinados')?.split(',').map((r) => Number(r) - 1) ?? [0, 7], N || 1200), specs;
  if (mode === 'niveles') return levels(all, N || 800), specs;
  // --barajas=escoba,truco: solo esos Mazos (el inicial, con sus campañas del Reinado 1)
  if (mode === 'barajas') return (!onlyDecks || onlyDecks.includes(MAZO_INICIAL)) && levels([0], N || 800), decks(N || 800), specs;
  if (mode === 'rapido') return levels(all, N || 300), decks(N || 300), specs;
  levels(all, N || 1500);
  decks(N || 1500);
  // cada herramienta y cada especial, de regalo al empezar (Árbol lleno, nivel 1)
  // y, de control, las mismas semillas sin regalo: se suman a la referencia (nivel 1, Árbol lleno)
  for (const seed of seeds(GIFT_N, 23)) specs.push({ seed, deck: MAZO_INICIAL, ascension: 0, full: true, control: 'tool' });
  for (const t of TOOLS) for (const seed of seeds(GIFT_N, 23)) specs.push({ seed, deck: MAZO_INICIAL, ascension: 0, full: true, giveTool: t.id });
  // V40 1c · cada Bendición de regalo al empezar (con las semillas de control de los Amuletos)
  for (const b of BENDICIONES) for (const seed of seeds(GIFT_N, 23)) specs.push({ seed, deck: MAZO_INICIAL, ascension: 0, full: true, giveBendicion: b.id });
  for (const seed of seeds(GIFT_N, 29)) specs.push({ seed, deck: MAZO_INICIAL, ascension: 0, full: true, control: 'special' });
  for (const s of SPECIALS) for (const seed of seeds(GIFT_N, 29)) specs.push({ seed, deck: MAZO_INICIAL, ascension: 0, full: true, giveSpecial: s.id });
  return specs;
}

// ───────────────────────── Reparto entre procesos ─────────────────────────

const shard = arg('shard');
if (shard) {
  const [i, of] = shard.split('/').map(Number);
  const logs = plan()
    .filter((_, k) => k % of === i)
    .map((spec) => playCampaign(spec).log);
  writeFileSync(arg('out')!, JSON.stringify(logs));
  process.exit(0);
}

/** V35 · tramos: dónde deja cada tramo sus registros hasta que `--juntar` los lee. */
const TRAMOS = join(tmpdir(), mode === 'altar' ? 'derrumbe-altar-tramos' : mode === 'sellos' ? 'derrumbe-sellos-tramos' : 'derrumbe-meta-tramos');
const tramo = arg('tramo')?.split('/').map(Number) as [number, number] | undefined;

async function runAll(argv: string[] = args): Promise<Log[]> {
  // LAB_HILOS=6 deja núcleos libres cuando hay otras pruebas (capturas, humo) corriendo a la vez
  const cap = Number(process.env.LAB_HILOS) || 12;
  const workers = Math.max(1, Math.min(cap, availableParallelism() - 1));
  const self = fileURLToPath(import.meta.url);
  // en un tramo, cada proceso juega su trozo del trozo k de K, y el registro se queda en disco
  if (tramo && argv === args) {
    const [k, K] = tramo;
    mkdirSync(TRAMOS, { recursive: true });
    if (k === 1) for (const f of readdirSync(TRAMOS)) rmSync(join(TRAMOS, f), { force: true });
    await Promise.all(
      Array.from({ length: workers }, (_, i) => {
        const idx = (k - 1) * workers + i;
        const out = join(TRAMOS, `t-${idx}-de-${K * workers}.json`);
        return new Promise<void>((resolve, reject) => {
          const child = spawn(process.execPath, [...process.execArgv, self, `--shard=${idx}/${K * workers}`, `--out=${out}`, ...argv.filter((a) => !a.startsWith('--shard') && !a.startsWith('--out') && !a.startsWith('--tramo'))], { stdio: ['ignore', 'inherit', 'inherit'] });
          child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`el proceso ${i} terminó con código ${code}`))));
        });
      }),
    );
    return [];
  }
  const files = Array.from({ length: workers }, (_, i) => join(tmpdir(), `derrumbe-meta-${process.pid}-${i}.json`));
  await Promise.all(
    files.map(
      (out, i) =>
        new Promise<void>((resolve, reject) => {
          const child = spawn(process.execPath, [...process.execArgv, self, `--shard=${i}/${workers}`, `--out=${out}`, ...argv.filter((a) => !a.startsWith('--shard') && !a.startsWith('--out'))], { stdio: ['ignore', 'inherit', 'inherit'] });
          child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`el proceso ${i} terminó con código ${code}`))));
        }),
    ),
  );
  const logs = files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as Log[]);
  files.forEach((f) => rmSync(f, { force: true }));
  return logs;
}

// ───────────────────────── Informe ─────────────────────────

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const wr = (logs: Log[]) => pct(logs.filter((l) => l.won).length, logs.length);
const quantile = (xs: number[], q: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))] : 0);
const sum = (logs: Log[], pick: (l: Log) => number) => logs.reduce((a, l) => a + pick(l), 0);

function report(logs: Log[], confirm: Log[] = []) {
  const plain = logs.filter((l) => !l.spec.giveTool && !l.spec.giveSpecial && !l.spec.giveBendicion && !l.spec.control);
  const group = (deck: string, a: number, full: boolean) => plain.filter((l) => l.spec.deck === deck && l.spec.ascension === a && l.spec.full === full);

  const winrate = {
    levels: ASCENSIONS.map((asc, a) => ({ level: a + 1, name: asc.name, vacio: wr(group(MAZO_INICIAL, a, false)), lleno: wr(group(MAZO_INICIAL, a, true)), n: Math.max(group(MAZO_INICIAL, a, true).length, group(MAZO_INICIAL, a, false).length) })),
    decks: DECKS.map((d) => ({ deck: d.id, name: d.name, vacio: wr(group(d.id, 0, false)), lleno: wr(group(d.id, 0, true)), n: Math.max(group(d.id, 0, true).length, group(d.id, 0, false).length) })),
  };

  // referencia para medir el valor de cada cosa: Árbol lleno, nivel 1, baraja de obra
  const base = group(MAZO_INICIAL, 0, true);
  const baseWr = wr(base);
  /** Referencia de los regalos: todas las campañas sin regalo de nivel 1 con Árbol lleno (las de la tabla de niveles y las de control). */
  const noGift = [...base, ...logs.filter((l) => l.spec.control), ...confirm.filter((l) => l.spec.control)];
  const giftRef = wr(noGift);
  const reached = plain.filter((l) => l.spec.full && l.spec.ascension === 0 && l.mid);
  const item = (key: string, given: Log[], has: (l: Log) => boolean, activations?: (l: Log) => number, owners?: (l: Log) => boolean) => {
    const all = plain.filter((l) => l.spec.full);
    const offered = sum(all, (l) => l.offered[key] ?? 0);
    const taken = sum(all, (l) => l.taken[key] ?? 0);
    const withIt = reached.filter(has);
    const without = reached.filter((l) => !has(l));
    const own = owners ? all.filter(owners) : [];
    return {
      pick: pct(taken, offered),
      offered,
      /** Dada al empezar: % de campañas ganadas y diferencia con la referencia sin regalo. */
      given: given.length ? wr(given) : null,
      givenN: given.length,
      delta: given.length ? Math.round((wr(given) - giftRef) * 10) / 10 : null,
      /** Llevándola al entrar a la obra 5, entre las campañas que llegaron hasta ahí. */
      withMid: withIt.length >= 15 ? wr(withIt) : null,
      withoutMid: without.length >= 15 ? wr(without) : null,
      carried: withIt.length,
      activations: activations && own.length ? Math.round((sum(own, activations) / own.length) * 10) / 10 : null,
    };
  };

  /** Lo que dio una pieza en la segunda vuelta, si pasó por ella. */
  const second = (given: Log[]) => ({ confirmN: given.length, confirm: given.length ? wr(given) : null, confirmDelta: given.length ? Math.round((wr(given) - giftRef) * 10) / 10 : null });
  const tools = TOOLS.map((t) => ({
    id: t.id,
    name: t.name,
    rarity: t.rarity,
    arch: t.arch,
    kind: t.kind,
    ...item(
      `tool:${t.id}`,
      logs.filter((l) => l.spec.giveTool === t.id),
      (l) => l.mid!.tools.includes(t.id),
      (l) => l.toolUse[t.id] ?? 0,
      (l) => l.toolsEnd.includes(t.id),
    ),
    ...second(confirm.filter((l) => l.spec.giveTool === t.id)),
  }));
  const specials = SPECIALS.map((s) => ({
    id: s.id,
    name: s.name,
    legendary: !!s.locked,
    ...item(
      `special:${s.id}`,
      logs.filter((l) => l.spec.giveSpecial === s.id),
      (l) => l.mid!.specials.includes(s.id),
    ),
    ...second(confirm.filter((l) => l.spec.giveSpecial === s.id)),
  }));
  // V40 1c · las Bendiciones: cuánto las elige el bot cuando se ofrecen, cuánto valen de regalo y sus cargas al acabar
  const bendiciones = BENDICIONES.map((b) => {
    const owners = plain.filter((l) => l.spec.full && l.bendEnd?.some((x) => x.id === b.id));
    return {
      id: b.id,
      name: b.name,
      rey: b.duo ? `${REY_NOMBRE[b.rey]} y ${REY_NOMBRE[b.duo]}` : REY_NOMBRE[b.rey],
      dual: !!b.duo,
      ...item(`bend:${b.id}`, logs.filter((l) => l.spec.giveBendicion === b.id), () => false),
      ...second(confirm.filter((l) => l.spec.giveBendicion === b.id)),
      cargas: owners.length ? Math.round((sum(owners, (l) => l.bendEnd.find((x) => x.id === b.id)!.n) / owners.length) * 10) / 10 : null,
    };
  });
  const marks = [
    ...SEALS.map((s) => ({ id: s, name: SEAL[s].name, ...item(`mark:${s}`, [], (l) => l.mid!.seals.includes(s)) })),
    ...TREATMENTS.map((t) => ({ id: t, name: TREATMENT[t].name, ...item(`mark:${t}`, [], (l) => l.mid!.treats.includes(t)) })),
  ];

  // jefes: de cada vez que alguien se enfrentó a uno, cuántas cayó el búnker en su obra
  const bossLogs = plain.filter((l) => l.spec.ascension === 0);
  const bosses = BOSSES.map((b) => {
    const faced = sum(bossLogs, (l) => l.faced.filter((id) => id === b.id).length);
    const deaths = bossLogs.filter((l) => l.diedBoss === b.id).length;
    return { id: b.id, who: b.who, faced, deaths, lethality: pct(deaths, faced) };
  });
  const avgLethality = Math.round((bosses.reduce((a, b) => a + b.lethality, 0) / bosses.length) * 10) / 10;
  const pacing = STAGES.map((st, i) => {
    const turns = plain.filter((l) => l.spec.ascension === 0).flatMap((l) => (l.stageTurns[i] !== undefined ? [l.stageTurns[i]] : []));
    const jugadas = plain.filter((l) => l.spec.ascension === 0).flatMap((l) => (l.stageJugadas?.[i] !== undefined ? [l.stageJugadas[i]] : []));
    return { stage: i + 1, name: st.name, p50: quantile(turns, 0.5), p95: quantile(turns, 0.95), n: turns.length, ...(jugadas.length ? { j50: quantile(jugadas, 0.5) } : {}) };
  });
  // lo peor de cada baraja: el percentil 95 más alto de sus asaltos (los cinco)
  const pacingByDeck = DECKS.map((d) => {
    const mine = plain.filter((l) => l.spec.ascension === 0 && l.spec.deck === d.id);
    const p95 = STAGES.map((_, i) => i).map((i) => quantile(mine.flatMap((l) => (l.stageTurns[i] !== undefined ? [l.stageTurns[i]] : [])), 0.95));
    return { deck: d.id, name: d.name, worstP95: Math.max(0, ...p95), n: mine.length };
  }).filter((d) => d.n > 0);
  // dónde se pierden las campañas (Árbol vacío, nivel 1, baraja de obra)
  const fresh = group(MAZO_INICIAL, 0, false);
  const deaths = Array.from({ length: LAST_STAGE }, (_, i) => pct(fresh.filter((l) => l.diedAt === i + 1).length, fresh.length));

  // ── avisos: los objetivos de balance (scripts/objetivos.ts), uno por uno; se calculan al final ──
  /**
   * Piezas que la primera vuelta deja por debajo del ruido, o fuera de 35–68 % de victorias dadas de salida
   * (trampa o victoria regalada): todas pasan la segunda vuelta antes de avisar.
   */
  const suspect = (x: { givenN: number; given: number | null; delta: number | null }) =>
    x.givenN > 0 && ((x.delta ?? 0) <= -noise(x.givenN, noGift.length, giftRef) || (x.given ?? 50) < TRAP || (x.given ?? 50) > GIFT_MAX);
  const pieces = [...tools, ...specials, ...bendiciones];
  const suspects = pieces.filter(suspect).map((x) => x.id);
  const confirmations = pieces.filter((x) => x.confirmN).map((x) => ({ id: x.id, name: x.name, first: x.delta, n: x.confirmN, winrate: x.confirm, delta: x.confirmDelta }));
  const body = { campaigns: logs.length + confirm.length, suspects, confirmations, baseline: baseWr, giftBaseline: giftRef, giftBaselineN: noGift.length, giftNoise: noise(mode === 'regalos' ? N || 600 : GIFT_N, noGift.length, giftRef), winrate, deaths, tools, specials, bendiciones, marks, bosses, avgLethality, pacing, pacingByDeck };
  return { ...body, flags: avisos(body) };
}

function print(r: ReturnType<typeof report>): void {
  if (!r.campaigns) return;
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const num = (x: number | null, n = 6) => (x === null ? '—' : String(x)).padStart(n);
  console.log(`\n${TITLE} · laboratorio de balance · ${r.campaigns} campañas\n`);
  if (r.winrate.levels.some((l) => l.n)) console.log(`Campañas ganadas por Reinado (${DECKS[0].name.toLowerCase()})`);
  for (const l of r.winrate.levels) if (l.n) console.log(`  ${l.level} ${pad(l.name, 18)} vacío ${num(l.vacio)} %   lleno ${num(l.lleno)} %   (${l.n} por celda)`);
  if (r.winrate.decks.some((d) => d.n)) console.log('\nPor baraja inicial (Reinado 1)');
  for (const d of r.winrate.decks) if (d.n) console.log(`  ${pad(d.name, 24)} vacío ${num(d.vacio)} %   lleno ${num(d.lleno)} %   (${d.n} por celda)`);
  if (r.winrate.levels[0]?.n) console.log(`\nDónde se pierde (Altar vacío, % de campañas por asalto): ${r.deaths.join(' · ')}`);
  const gifts = !quick || mode === 'regalos';
  const shown = <T extends { givenN: number }>(rows: T[]) => (mode === 'regalos' ? rows.filter((x) => x.givenN) : rows);
  if (gifts) console.log(`\nAmuletos (de regalo al empezar; sin regalo: ${r.giftBaseline} % en ${r.giftBaselineN} campañas; por debajo de ±${r.giftNoise} puntos es ruido)`);
  if (gifts) console.log(`  ${pad('', 22)} ${pad('rareza', 9)} elige%  salida%  Δ      a media  sin    activ.`);
  for (const t of !gifts ? [] : shown([...r.tools]).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)))
    console.log(`  ${pad(t.name, 22)} ${pad(t.rarity, 9)} ${num(t.pick)} ${num(t.given, 8)} ${num(t.delta, 6)} ${num(t.withMid, 8)} ${num(t.withoutMid, 6)} ${num(t.activations, 8)}`);
  if (gifts) console.log('\nTrampas del Bufón (misma referencia)');
  for (const s of !gifts ? [] : shown([...r.specials]).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))) console.log(`  ${pad(s.name, 22)} ${pad(s.legendary ? 'legend.' : 'común', 9)} ${num(s.pick)} ${num(s.given, 8)} ${num(s.delta, 6)} ${num(s.withMid, 8)} ${num(s.withoutMid, 6)}`);
  if (r.confirmations.length) console.log(`\nSegunda vuelta (${r.confirmations[0].n} campañas por pieza, semillas nuevas): ${r.confirmations.map((c) => `${c.name} ${c.winrate} % (${(c.delta ?? 0) > 0 ? '+' : ''}${c.delta}; antes ${c.first})`).join(' · ')}`);
  const conBend = r.bendiciones.filter((b) => b.offered || b.givenN);
  if (conBend.length) console.log('\nBendiciones (elige%: cuando se ofrece; salida% y Δ: de regalo al empezar; cargas: media al acabar)');
  for (const b of [...conBend].sort((a, b) => b.pick - a.pick)) console.log(`  ${pad(b.name, 20)} ${pad(b.rey, 34)} ${num(b.pick)} ${num(b.given, 8)} ${num(b.delta, 6)}   cargas ${num(b.cargas, 5)}`);
  if (!quick) console.log('\nSellos de lacre y acabados (llevándolos a media campaña)');
  for (const m of quick ? [] : r.marks) console.log(`  ${pad(m.name, 22)} elige ${num(m.pick)} %   con ${num(m.withMid)} %   sin ${num(m.withoutMid)} %`);
  if (r.bosses.some((b) => b.faced)) console.log(`\nReyes jefe (letalidad media ${r.avgLethality} %)`);
  for (const b of r.bosses) if (b.faced) console.log(`  ${pad(b.who, 14)} ${num(b.lethality)} %  (${b.deaths}/${b.faced})  ×${(b.lethality / (r.avgLethality || 1)).toFixed(2)}`);
  if (r.pacing.some((p) => p.n)) console.log('\nTurnos por asalto (mediana · percentil 95)');
  for (const p of r.pacing) if (p.n) console.log(`  ${p.stage} ${pad(p.name, 20)} ${num(p.p50, 3)} · ${num(p.p95, 3)}${p.j50 !== undefined ? `   jugadas ${num(p.j50, 3)}` : ''}`);
  if (r.pacingByDeck.length) console.log(`  peor percentil 95 en los asaltos 1–${LAST_STAGE}, por baraja: ${r.pacingByDeck.map((d) => `${d.name.replace('Baraja ', '')} ${d.worstP95}`).join(' · ')}`);
  console.log(r.flags.length ? `\nAVISOS (${r.flags.length})\n${r.flags.map((f) => `  ! ${f}`).join('\n')}` : '\nSin avisos: todo dentro de objetivo.');
}

/** Partida clásica (una obra): cuánto gana el bot según cuántos jueguen. Objetivo: del 58 al 65 % con 1, 2, 3 y 4. */
function classic(games: number, jugadores: number[] = [1, 2, 3, 4]) {
  return jugadores.map((n) => {
    let wins = 0;
    let turns = 0;
    for (let g = 0; g < games; g++) {
      let state = createGame(Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}` })), g * 7919 + n, DIFFICULTY.obra);
      for (let guard = 0; state.phase === 'playing' && guard < 2000; guard++) state = applyAction(state, currentPlayer(state).id, chooseAction(state)).state;
      if (state.phase === 'won') wins++;
      turns += state.turnCount;
    }
    return { players: n, winrate: pct(wins, games), turns: Math.round((turns / games) * 10) / 10, n: games };
  });
}

const started = Date.now();
if (tramo) {
  await runAll();
  console.log(`
Tramo ${tramo[0]}/${tramo[1]} jugado · ${Math.round((Date.now() - started) / 1000)} s. ${tramo[0] === tramo[1] ? 'Falta: npm run analyze:meta -- --juntar' : ''}`);
  process.exit(0);
}
/** Con `--juntar`, los registros de todos los tramos; si no, el laboratorio de siempre. */
function juntados(): Promise<Log[]> {
  const files = readdirSync(TRAMOS).filter((f) => f.startsWith('t-'));
  const total = Number(files[0]?.match(/-de-(\d+)\.json$/)?.[1] ?? 0);
  if (!files.length || files.length !== total) throw new Error(`faltan tramos: hay ${files.length} de ${total} registros en ${TRAMOS}`);
  return Promise.resolve(files.flatMap((f) => JSON.parse(readFileSync(join(TRAMOS, f), 'utf8')) as Log[]));
}
/**
 * V40 1c · Los pasos previos de `--juntar`, para que ninguna orden pase de los topes: `--previo=clasica:1,2` juega las
 * partidas clásicas de esos jugadores y `--previo=confirmar` confirma los regalos sospechosos de los tramos; los dos
 * dejan su resultado en la carpeta de los tramos (el tramo 1 la vacía), y `--juntar` lo usa en vez de jugarlo.
 */
const CLASICA_DE = (n: number) => join(TRAMOS, `x-clasica-${n}.json`);
const CONFIRMAR = join(TRAMOS, 'x-confirmar.json');
const previo = arg('previo');
if (previo) {
  if (previo.startsWith('clasica:')) {
    for (const n of previo.slice(8).split(',').map(Number)) writeFileSync(CLASICA_DE(n), JSON.stringify(classic(N || 1500, [n])));
  } else if (previo === 'confirmar') {
    const sus = report(await juntados()).suspects;
    writeFileSync(CONFIRMAR, JSON.stringify(sus.length ? await runAll(['regalos', `--piezas=${sus.join(',')}`, `--n=${CONFIRM_N}`, '--sal=37']) : []));
  } else throw new Error(`--previo=${previo}: se espera clasica:<jugadores> o confirmar`);
  console.log(`Previo «${previo}» hecho · ${Math.round((Date.now() - started) / 1000)} s.`);
  process.exit(0);
}
if (mode === 'altar') {
  const logs = args.includes('--juntar') ? await juntados() : await runAll();
  const grupos = [...new Set(logs.map((l) => l.spec.sinAltar!))];
  const ref = wr(logs.filter((l) => l.spec.sinAltar === 'lleno'));
  console.log(`\n${TITLE} · el Altar por partes · Reinado 1, los 5 Mazos por turno · ${logs.length} campañas`);
  for (const g of grupos) {
    const de = logs.filter((l) => l.spec.sinAltar === g);
    const v = wr(de);
    console.log(`  ${(g === 'vacío' || g === 'lleno' ? g : `lleno sin ${g}`).padEnd(64)} ${String(v).padStart(5)} %   ${g === 'lleno' ? '' : `(${v - ref > 0 ? '+' : ''}${Math.round((v - ref) * 10) / 10} frente al lleno)`}   (${de.length})`);
  }
  console.log(`  diferencia que se puede creer entre dos filas: ±${noise(N || 600, N || 600, ref)}`);
  process.exit(0);
}
if (mode === 'sellos') {
  // V40 1d · los sellos S · A · B: el efecto de cada pieza dada de salida frente al control, repartido por tercios
  const logs = args.includes('--juntar') ? await juntados() : await runAll();
  const control = logs.filter((l) => l.spec.control);
  const ref = wr(control);
  const medir = (given: Log[], id: string): Medida => ({ id, delta: Math.round((wr(given) - ref) * 10) / 10, n: given.length });
  const clases = {
    amuletos: TOOLS.map((t) => medir(logs.filter((l) => l.spec.giveTool === t.id), t.id)),
    trampas: SPECIALS.map((x) => medir(logs.filter((l) => l.spec.giveSpecial === x.id), x.id)),
    bendiciones: BENDICIONES.map((b) => medir(logs.filter((l) => l.spec.giveBendicion === b.id), b.id)),
  };
  const sellos = { amuletos: repartoSellos(clases.amuletos), trampas: repartoSellos(clases.trampas), bendiciones: repartoSellos(clases.bendiciones) };
  const ruido = noise(control.length, control.length, ref);
  console.log(`\n${TITLE} · sellos de nivel · ${logs.length} campañas · control ${ref} % en ${control.length} (diferencia que se puede creer: ±${ruido})`);
  for (const [k, filas] of Object.entries(clases)) {
    console.log(`\n${k}`);
    for (const f of [...filas].sort((a, b) => b.delta - a.delta)) console.log(`  ${sellos[k as keyof typeof sellos][f.id]}  ${f.id.padEnd(14)} ${String(f.delta).padStart(6)}   (${f.n})`);
  }
  const cfg = fileURLToPath(new URL('../src/rules/balance-config.json', import.meta.url));
  writeFileSync(cfg, conSellos(readFileSync(cfg, 'utf8'), bloqueSellos(sellos)));
  writeFileSync(fileURLToPath(new URL('./sellos-report.json', import.meta.url)), JSON.stringify({ generated: 'npm run analyze:meta -- sellos', control: { winrate: ref, n: control.length }, ruido, ...clases, sellos }, null, 1) + '\n');
  console.log(`\nbalance-config.json (sellosNivel) y scripts/sellos-report.json · ${Math.round((Date.now() - started) / 1000)} s`);
  process.exit(0);
}
const juntar = args.includes('--juntar');
const guardado = <T>(f: string): T | null => (juntar && existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as T) : null);
const running = juntar ? juntados() : runAll();
// mientras los procesos juegan campañas, este juega las partidas clásicas (o las toma de --previo=clasica)
const clasicasPrevias = [1, 2, 3, 4].map((n) => guardado<ReturnType<typeof classic>>(CLASICA_DE(n)));
const classicRows = mode === 'todo' || mode === 'clasica' ? (clasicasPrevias.every(Boolean) ? clasicasPrevias.flatMap((r) => r!) : classic(N || 1500)) : [];
const logs = mode === 'clasica' ? [] : await running;
// segunda vuelta: lo que el informe completo señala entre los regalos se confirma con muestra grande (o --previo=confirmar)
const confirmPrevias = guardado<Log[]>(CONFIRMAR);
const suspects = mode === 'todo' && !confirmPrevias ? report(logs).suspects : [];
const confirmLogs = confirmPrevias ?? (suspects.length ? await runAll(['regalos', `--piezas=${suspects.join(',')}`, `--n=${CONFIRM_N}`, '--sal=37']) : []);
const result = { ...report(logs, confirmLogs), classic: classicRows };
for (const c of revisarClasica(classicRows)) if (!c.ok) result.flags.push(c.texto);
print(result);
if (classicRows.length) console.log(`\nAsalto único (victorias del bot): ${classicRows.map((c) => `${c.players}J ${c.winrate} %`).join(' · ')}`);
const out = quick ? join(tmpdir(), `derrumbe-meta-${mode}.json`) : fileURLToPath(new URL('./meta-report.json', import.meta.url));
writeFileSync(out, JSON.stringify({ generated: 'npm run analyze:meta', quick, rules: fingerprint(), curses: Object.fromEntries(BOSSES.map((b) => [b.id, BOSS[b.id].name])), ...result }, null, 1) + '\n');
console.log(`\n${out} · ${Math.round((Date.now() - started) / 1000)} s`);
