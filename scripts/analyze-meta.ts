// Laboratorio de balance: miles de campañas con semilla, repartidas entre los núcleos de la máquina,
// y un informe con lo que hay que mirar antes de tocar un número.
//
//   npm run analyze:meta              informe completo (≈ 52.000 campañas) → scripts/meta-report.json
//   npm run analyze:meta -- rapido    todo menos el estudio pieza a pieza, con muestra pequeña
//   npm run analyze:meta -- foco      solo los niveles 1 y 8 (para afinar la dureza)
//   npm run analyze:meta -- niveles   los 8 niveles · barajas: las 6 barajas en nivel 1 · clasica: la partida clásica
//   npm run analyze:meta -- regalos --piezas=clavos,ariete --n=600   unas pocas piezas, con muestra grande
//   … --n=2000 cambia las campañas por celda; --barajas=corta,ases mide solo esas barajas.
//   Solo el informe completo escribe meta-report.json.
//
// Qué mide:
//   · porcentaje de campañas ganadas por baraja y por nivel de obra, con el gremio vacío y lleno
//   · cada herramienta, carta especial, sello y tratamiento: cuánto se elige, cuánto se activa y
//     cuánto cambia el resultado (dada de salida frente a las campañas sin regalo, y llevándola a
//     media campaña)
//   · letalidad de cada jefe y duración de cada obra (mediana y percentil 95 de turnos)
// Las piezas que salen mal paradas de regalo pasan una segunda vuelta con más campañas y semillas
// nuevas antes de dar aviso: con tantas piezas, alguna cae siempre por azar.
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseAction } from '../src/rules/bot';
import { DIFFICULTY, SEAL, SEALS, TREATMENT, TREATMENTS, applyAction, createGame, currentPlayer } from '../src/rules/engine';
import { ASCENSIONS, BOSS, BOSSES, DECKS, LAST_STAGE, STAGES } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';
import { Log, Spec, fingerprint, playCampaign } from './lab';

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const mode = args.find((a) => !a.startsWith('--')) ?? 'todo';
const quick = mode !== 'todo';
const N = Number(arg('n') ?? 0);
/** --barajas=corta,ases: en el modo «barajas», mide solo esas. */
const onlyDecks = arg('barajas')?.split(',');
/** Campañas por pieza en el estudio de regalos (y otras tantas de control, con las mismas semillas y sin regalo). */
const GIFT_N = 160;
/**
 * Segunda vuelta. Con 160 campañas por pieza y casi 80 piezas, alguna sale muy baja por puro azar: las
 * que la primera vuelta señala se vuelven a medir con esta muestra y semillas nuevas, y solo avisa la
 * que sigue empeorando. (Elegir con unos datos y confirmar con otros evita perseguir el ruido.)
 */
const CONFIRM_N = 800;
/** Una herramienta dada de salida que gana menos que esto es una trampa; más que GIFT_MAX, una victoria regalada. */
const TRAP = 35;
const GIFT_MAX = 68;
/** --piezas=clavos,ariete: en el modo «regalos», las herramientas o especiales que se miden (con --n campañas cada una). */
const onlyPieces = arg('piezas')?.split(',') ?? [];
/**
 * Cuánto tiene que empeorar una pieza para avisar: tres desviaciones típicas de la diferencia entre dos
 * proporciones, la de la pieza (n campañas) y la de referencia (nRef campañas sin regalo). Son unas 77
 * comparaciones por informe: con dos desviaciones saldrían casi dos avisos falsos cada vez; con tres,
 * uno de cada diez informes.
 */
const noise = (n: number, nRef: number, refPct: number) => {
  const p = Math.min(0.9, Math.max(0.1, refPct / 100));
  return Math.round(3 * Math.sqrt(p * (1 - p) * (1 / Math.max(1, n) + 1 / Math.max(1, nRef))) * 1000) / 10;
};

// ───────────────────────── Plan de campañas ─────────────────────────

function plan(): Spec[] {
  const specs: Spec[] = [];
  const seeds = (count: number, salt: number) => Array.from({ length: count }, (_, i) => (i + 1) * 7919 + salt * 104729);
  // todos los niveles juegan las mismas semillas: comparar uno con otro tiene así menos ruido
  const levels = (which: number[], count: number) => {
    for (const a of which) for (const full of [false, true]) for (const seed of seeds(count, 0)) specs.push({ seed, deck: 'obra', ascension: a, full });
  };
  const decks = (count: number) => {
    for (const d of DECKS) if (d.id !== 'obra' && (!onlyDecks || onlyDecks.includes(d.id))) for (const full of [false, true]) for (const seed of seeds(count, 0)) specs.push({ seed, deck: d.id, ascension: 0, full });
  };
  const all = ASCENSIONS.map((_, a) => a);
  if (mode === 'clasica') return specs;
  if (mode === 'regalos') {
    // unas pocas piezas con muestra grande, para saber si un aviso del informe es ruido o no
    const count = N || 600;
    const salt = Number(arg('sal') ?? 31); // --sal=29 repite las semillas que usa el informe completo para las especiales (23 para las herramientas)
    for (const seed of seeds(count, salt)) specs.push({ seed, deck: 'obra', ascension: 0, full: true, control: 'special' });
    for (const id of onlyPieces) for (const seed of seeds(count, salt)) specs.push({ seed, deck: 'obra', ascension: 0, full: true, ...(TOOLS.some((t) => t.id === id) ? { giveTool: id } : { giveSpecial: id }) });
    return specs;
  }
  if (mode === 'foco') return levels([0, 7], N || 1200), specs;
  if (mode === 'niveles') return levels(all, N || 800), specs;
  if (mode === 'barajas') return onlyDecks || levels([0], N || 800), decks(N || 800), specs;
  if (mode === 'rapido') return levels(all, N || 300), decks(N || 300), specs;
  levels(all, N || 1500);
  decks(N || 1500);
  // cada herramienta y cada especial, de regalo al empezar (gremio lleno, nivel 1)
  // y, de control, las mismas semillas sin regalo: se suman a la referencia (nivel 1, gremio lleno)
  for (const seed of seeds(GIFT_N, 23)) specs.push({ seed, deck: 'obra', ascension: 0, full: true, control: 'tool' });
  for (const t of TOOLS) for (const seed of seeds(GIFT_N, 23)) specs.push({ seed, deck: 'obra', ascension: 0, full: true, giveTool: t.id });
  for (const seed of seeds(GIFT_N, 29)) specs.push({ seed, deck: 'obra', ascension: 0, full: true, control: 'special' });
  for (const s of SPECIALS) for (const seed of seeds(GIFT_N, 29)) specs.push({ seed, deck: 'obra', ascension: 0, full: true, giveSpecial: s.id });
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

async function runAll(argv: string[] = args): Promise<Log[]> {
  // LAB_HILOS=6 deja núcleos libres cuando hay otras pruebas (capturas, humo) corriendo a la vez
  const cap = Number(process.env.LAB_HILOS) || 12;
  const workers = Math.max(1, Math.min(cap, availableParallelism() - 1));
  const self = fileURLToPath(import.meta.url);
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
  const plain = logs.filter((l) => !l.spec.giveTool && !l.spec.giveSpecial && !l.spec.control);
  const group = (deck: string, a: number, full: boolean) => plain.filter((l) => l.spec.deck === deck && l.spec.ascension === a && l.spec.full === full);

  const winrate = {
    levels: ASCENSIONS.map((asc, a) => ({ level: a + 1, name: asc.name, vacio: wr(group('obra', a, false)), lleno: wr(group('obra', a, true)), n: group('obra', a, true).length })),
    decks: DECKS.map((d) => ({ deck: d.id, name: d.name, vacio: wr(group(d.id, 0, false)), lleno: wr(group(d.id, 0, true)), n: group(d.id, 0, true).length })),
  };

  // referencia para medir el valor de cada cosa: gremio lleno, nivel 1, baraja de obra
  const base = group('obra', 0, true);
  const baseWr = wr(base);
  /** Referencia de los regalos: todas las campañas sin regalo de nivel 1 con gremio lleno (las de la tabla de niveles y las de control). */
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
    return { stage: i + 1, name: st.name, p50: quantile(turns, 0.5), p95: quantile(turns, 0.95), n: turns.length };
  });
  // lo peor de cada baraja: el percentil 95 más alto de sus obras 4 a 8
  const pacingByDeck = DECKS.map((d) => {
    const mine = plain.filter((l) => l.spec.ascension === 0 && l.spec.deck === d.id);
    const p95 = [3, 4, 5, 6, 7].map((i) => quantile(mine.flatMap((l) => (l.stageTurns[i] !== undefined ? [l.stageTurns[i]] : [])), 0.95));
    return { deck: d.id, name: d.name, worstP95: Math.max(0, ...p95), n: mine.length };
  }).filter((d) => d.n > 0);
  // dónde se pierden las campañas (gremio vacío, nivel 1, baraja de obra)
  const fresh = group('obra', 0, false);
  const deaths = Array.from({ length: LAST_STAGE }, (_, i) => pct(fresh.filter((l) => l.diedAt === i + 1).length, fresh.length));

  // ── avisos: los objetivos de balance, uno por uno ──
  const flags: string[] = [];
  const has = (c: { n: number }) => c.n > 0;
  const l1 = winrate.levels[0];
  const l8 = winrate.levels[7];
  if (has(l1) && (l1.vacio < 24 || l1.vacio > 30)) flags.push(`Nivel 1 con gremio vacío: ${l1.vacio} % (objetivo 24–30)`);
  if (has(l1) && (l1.lleno < 40 || l1.lleno > 48)) flags.push(`Nivel 1 con gremio lleno: ${l1.lleno} % (objetivo 40–48)`);
  if (has(l8) && (l8.vacio < 6 || l8.vacio > 9)) flags.push(`Nivel 8 con gremio vacío: ${l8.vacio} % (objetivo 6–9)`);
  if (has(l8) && (l8.lleno < 12 || l8.lleno > 17)) flags.push(`Nivel 8 con gremio lleno: ${l8.lleno} % (objetivo 12–17)`);
  // cada nivel tiene que ser más difícil que el anterior, con el gremio vacío y con el lleno
  for (let i = 1; i < winrate.levels.length; i++) {
    const a = winrate.levels[i - 1];
    const b = winrate.levels[i];
    if (!has(a) || !has(b)) continue;
    if (b.vacio >= a.vacio) flags.push(`Niveles ${a.level} → ${b.level} con gremio vacío: ${a.vacio} % → ${b.vacio} % (no baja)`);
    if (b.lleno >= a.lleno) flags.push(`Niveles ${a.level} → ${b.level} con gremio lleno: ${a.lleno} % → ${b.lleno} % (no baja)`);
  }
  for (const d of winrate.decks) {
    if (!has(d) || d.deck === 'obra') continue;
    if (d.lleno < 38 || d.lleno > 48) flags.push(`${d.name}: ${d.lleno} % con gremio lleno (objetivo 40–45, margen 38–48)`);
    if (d.vacio < 22 || d.vacio > 32) flags.push(`${d.name}: ${d.vacio} % con gremio vacío (objetivo 24–31)`);
    if (d.lleno - d.vacio < 6) flags.push(`${d.name}: el gremio lleno solo le suma ${Math.round((d.lleno - d.vacio) * 10) / 10} puntos`);
  }
  /**
   * Piezas que la primera vuelta deja por debajo del ruido, o fuera de 35–68 % de victorias dadas de salida
   * (trampa o victoria regalada): todas pasan la segunda vuelta antes de avisar.
   */
  const suspect = (x: { givenN: number; given: number | null; delta: number | null }) =>
    x.givenN > 0 && ((x.delta ?? 0) <= -noise(x.givenN, noGift.length, giftRef) || (x.given ?? 50) < TRAP || (x.given ?? 50) > GIFT_MAX);
  /** Lo que ganó la pieza dada de salida: manda la segunda vuelta si la hubo. */
  const final = (x: { givenN: number; given: number | null; confirmN: number; confirm: number | null }) => (x.confirmN ? [x.confirm, x.confirmN] : [x.given, x.givenN]) as [number | null, number];
  const worse = (kind: string, x: { name: string; givenN: number; delta: number | null; confirmN: number; confirmDelta: number | null }) => {
    if (!x.givenN || (x.delta ?? 0) > -noise(x.givenN, noGift.length, giftRef)) return;
    const [delta, n] = x.confirmN ? [x.confirmDelta ?? 0, x.confirmN] : [x.delta ?? 0, x.givenN];
    // con segunda vuelta, manda ella: muestra grande y semillas que no eligieron a la sospechosa
    if (delta <= -noise(n, noGift.length, giftRef)) flags.push(`${kind} ${x.name}: llevarla de salida empeora el resultado (${delta} puntos en ${n} campañas; ruido ±${noise(n, noGift.length, giftRef)})`);
  };
  for (const t of tools) {
    const [won, n] = final(t);
    if (won !== null && won > GIFT_MAX) flags.push(`Herramienta ${t.name}: ${won} % ganadas si se da de salida en ${n} campañas (> ${GIFT_MAX}: victoria regalada)`);
    if (won !== null && won < TRAP) flags.push(`Herramienta ${t.name}: ${won} % ganadas si se da de salida en ${n} campañas (< ${TRAP}: trampa)`);
    if (t.pick < 5 && t.offered >= 40 && (t.delta ?? 0) <= 0) flags.push(`Herramienta ${t.name}: casi nunca se elige (${t.pick} %) y no ayuda (${t.delta})`);
    worse('Herramienta', t);
  }
  for (const sp of specials) {
    const [won, n] = final(sp);
    if (won !== null && won > GIFT_MAX) flags.push(`Especial ${sp.name}: ${won} % ganadas si se da de salida en ${n} campañas (> ${GIFT_MAX})`);
    worse('Especial', sp);
  }
  // jefes: todos entre 0,8× y 1,3× de la letalidad media
  for (const b of bosses) {
    const ratio = avgLethality ? b.lethality / avgLethality : 1;
    if (b.faced >= 150 && (ratio < 0.8 || ratio > 1.3)) flags.push(`Jefe ${b.who}: letalidad ${b.lethality} % (×${ratio.toFixed(2)} de la media; objetivo 0,8×–1,3×)`);
  }
  // ritmo: obra 1 de 5 a 7 turnos (P95 ≤ 10), obras 2 y 3 de 8 a 10 (P95 ≤ 15), obras 4 a 8 de 9 a 13 (P95 ≤ 19)
  for (const p of pacing) {
    if (!p.n) continue;
    const [lo, hi, top] = p.stage === 1 ? [5, 7, 10] : p.stage <= 3 ? [8, 10, 15] : [9, 13, 19];
    if (p.p50 < lo || p.p50 > hi || p.p95 > top) flags.push(`Obra ${p.stage} (${p.name}): mediana ${p.p50} y percentil 95 ${p.p95} (objetivo ${lo}–${hi} y ≤ ${top})`);
  }
  for (const d of pacingByDeck) if (d.worstP95 > 19) flags.push(`${d.name}: percentil 95 de ${d.worstP95} turnos en alguna obra de la 4 a la 8 (objetivo ≤ 19)`);

  const pieces = [...tools, ...specials];
  const suspects = pieces.filter(suspect).map((x) => x.id);
  const confirmations = pieces.filter((x) => x.confirmN).map((x) => ({ id: x.id, name: x.name, first: x.delta, n: x.confirmN, winrate: x.confirm, delta: x.confirmDelta }));
  return { campaigns: logs.length + confirm.length, suspects, confirmations, baseline: baseWr, giftBaseline: giftRef, giftBaselineN: noGift.length, giftNoise: noise(mode === 'regalos' ? N || 600 : GIFT_N, noGift.length, giftRef), winrate, deaths, tools, specials, marks, bosses, avgLethality, pacing, pacingByDeck, flags };
}

function print(r: ReturnType<typeof report>): void {
  if (!r.campaigns) return;
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const num = (x: number | null, n = 6) => (x === null ? '—' : String(x)).padStart(n);
  console.log(`\nDERRUMBE · laboratorio de balance · ${r.campaigns} campañas\n`);
  if (r.winrate.levels.some((l) => l.n)) console.log('Campañas ganadas por nivel de obra (baraja de obra)');
  for (const l of r.winrate.levels) if (l.n) console.log(`  ${l.level} ${pad(l.name, 18)} vacío ${num(l.vacio)} %   lleno ${num(l.lleno)} %   (${l.n} por celda)`);
  if (r.winrate.decks.some((d) => d.n)) console.log('\nPor baraja inicial (nivel 1)');
  for (const d of r.winrate.decks) if (d.n) console.log(`  ${pad(d.name, 24)} vacío ${num(d.vacio)} %   lleno ${num(d.lleno)} %   (${d.n} por celda)`);
  if (r.winrate.levels[0]?.n) console.log(`\nDónde se pierde (gremio vacío, % de campañas por obra): ${r.deaths.join(' · ')}`);
  const gifts = !quick || mode === 'regalos';
  const shown = <T extends { givenN: number }>(rows: T[]) => (mode === 'regalos' ? rows.filter((x) => x.givenN) : rows);
  if (gifts) console.log(`\nHerramientas (de regalo al empezar; sin regalo: ${r.giftBaseline} % en ${r.giftBaselineN} campañas; por debajo de ±${r.giftNoise} puntos es ruido)`);
  if (gifts) console.log(`  ${pad('', 22)} ${pad('rareza', 9)} elige%  salida%  Δ      a media  sin    activ.`);
  for (const t of !gifts ? [] : shown([...r.tools]).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)))
    console.log(`  ${pad(t.name, 22)} ${pad(t.rarity, 9)} ${num(t.pick)} ${num(t.given, 8)} ${num(t.delta, 6)} ${num(t.withMid, 8)} ${num(t.withoutMid, 6)} ${num(t.activations, 8)}`);
  if (gifts) console.log('\nCartas especiales (misma referencia)');
  for (const s of !gifts ? [] : shown([...r.specials]).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))) console.log(`  ${pad(s.name, 22)} ${pad(s.legendary ? 'legend.' : 'común', 9)} ${num(s.pick)} ${num(s.given, 8)} ${num(s.delta, 6)} ${num(s.withMid, 8)} ${num(s.withoutMid, 6)}`);
  if (r.confirmations.length) console.log(`\nSegunda vuelta (${r.confirmations[0].n} campañas por pieza, semillas nuevas): ${r.confirmations.map((c) => `${c.name} ${c.winrate} % (${(c.delta ?? 0) > 0 ? '+' : ''}${c.delta}; antes ${c.first})`).join(' · ')}`);
  if (!quick) console.log('\nSellos y tratamientos (llevándolos a media campaña)');
  for (const m of quick ? [] : r.marks) console.log(`  ${pad(m.name, 22)} elige ${num(m.pick)} %   con ${num(m.withMid)} %   sin ${num(m.withoutMid)} %`);
  if (r.bosses.some((b) => b.faced)) console.log(`\nJefes (letalidad media ${r.avgLethality} %)`);
  for (const b of r.bosses) if (b.faced) console.log(`  ${pad(b.who, 14)} ${num(b.lethality)} %  (${b.deaths}/${b.faced})  ×${(b.lethality / (r.avgLethality || 1)).toFixed(2)}`);
  if (r.pacing.some((p) => p.n)) console.log('\nTurnos por obra (mediana · percentil 95)');
  for (const p of r.pacing) if (p.n) console.log(`  ${p.stage} ${pad(p.name, 20)} ${num(p.p50, 3)} · ${num(p.p95, 3)}`);
  if (r.pacingByDeck.length) console.log(`  peor percentil 95 en las obras 4–8, por baraja: ${r.pacingByDeck.map((d) => `${d.name.replace('Baraja ', '')} ${d.worstP95}`).join(' · ')}`);
  console.log(r.flags.length ? `\nAVISOS (${r.flags.length})\n${r.flags.map((f) => `  ! ${f}`).join('\n')}` : '\nSin avisos: todo dentro de objetivo.');
}

/** Partida clásica (una obra): cuánto gana el bot según cuántos jueguen. Objetivo: del 58 al 65 % con 1, 2, 3 y 4. */
function classic(games: number) {
  return [1, 2, 3, 4].map((n) => {
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
const running = runAll();
// mientras los procesos juegan campañas, este juega las partidas clásicas
const classicRows = mode === 'todo' || mode === 'clasica' ? classic(N || 1500) : [];
const logs = mode === 'clasica' ? [] : await running;
// segunda vuelta: lo que el informe completo señala entre los regalos se confirma con muestra grande
const suspects = mode === 'todo' ? report(logs).suspects : [];
const confirmLogs = suspects.length ? await runAll(['regalos', `--piezas=${suspects.join(',')}`, `--n=${CONFIRM_N}`, '--sal=37']) : [];
const result = { ...report(logs, confirmLogs), classic: classicRows };
for (const c of classicRows) if (c.winrate < 58 || c.winrate > 65) result.flags.push(`Partida clásica con ${c.players} jugador${c.players > 1 ? 'es' : ''}: ${c.winrate} % (objetivo 58–65)`);
print(result);
if (classicRows.length) console.log(`\nPartida clásica (victorias del bot): ${classicRows.map((c) => `${c.players}J ${c.winrate} %`).join(' · ')}`);
const out = quick ? join(tmpdir(), `derrumbe-meta-${mode}.json`) : fileURLToPath(new URL('./meta-report.json', import.meta.url));
writeFileSync(out, JSON.stringify({ generated: 'npm run analyze:meta', quick, rules: fingerprint(), curses: Object.fromEntries(BOSSES.map((b) => [b.id, BOSS[b.id].name])), ...result }, null, 1) + '\n');
console.log(`\n${out} · ${Math.round((Date.now() - started) / 1000)} s`);
