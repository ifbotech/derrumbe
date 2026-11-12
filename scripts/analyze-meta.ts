// Laboratorio de balance: miles de campañas con semilla, repartidas entre los núcleos de la máquina,
// y un informe con lo que hay que mirar antes de tocar un número.
//
//   npm run analyze:meta            informe completo (≈ 15.000 campañas) → scripts/meta-report.json
//   npm run analyze:meta -- rapido  niveles, barajas, jefes y ritmo, sin el estudio pieza a pieza
//
// Qué mide:
//   · porcentaje de campañas ganadas por baraja y por nivel de obra, con el gremio vacío y lleno
//   · cada herramienta, carta especial, sello y tratamiento: cuánto se elige, cuánto se activa y
//     cuánto cambia el resultado (dada de salida frente a la referencia, y llevándola a media campaña)
//   · letalidad de cada jefe y duración de cada obra (mediana y percentil 95 de turnos)
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEAL, SEALS, TREATMENT, TREATMENTS } from '../src/rules/engine';
import { ASCENSIONS, BOSS, BOSSES, DECKS, LAST_STAGE, STAGES } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';
import { Log, Spec, playCampaign } from './lab';

const args = process.argv.slice(2);
const arg = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const quick = args.includes('rapido');
/** Dos desviaciones típicas de una proporción cercana al 45 % medida con 90 campañas: por debajo de eso, es ruido. */
const NOISE = 10.5;

// ───────────────────────── Plan de campañas ─────────────────────────

function plan(): Spec[] {
  const specs: Spec[] = [];
  const seeds = (count: number, salt: number) => Array.from({ length: quick ? Math.round(count * 0.5) : count }, (_, i) => (i + 1) * 7919 + salt * 104729);
  // la baraja de obra en los 8 niveles, con el gremio vacío y lleno
  for (let a = 0; a < ASCENSIONS.length; a++) for (const full of [false, true]) for (const seed of seeds(a === 0 || a === 7 ? 1500 : 200, a)) specs.push({ seed, deck: 'obra', ascension: a, full });
  // las demás barajas en el nivel 1
  for (const d of DECKS) if (d.id !== 'obra') for (const full of [false, true]) for (const seed of seeds(400, 11)) specs.push({ seed, deck: d.id, ascension: 0, full });
  if (quick) return specs;
  // cada herramienta y cada especial, de regalo al empezar (gremio lleno, nivel 1)
  for (const t of TOOLS) for (const seed of seeds(90, 23)) specs.push({ seed, deck: 'obra', ascension: 0, full: true, giveTool: t.id });
  for (const s of SPECIALS) for (const seed of seeds(60, 29)) specs.push({ seed, deck: 'obra', ascension: 0, full: true, giveSpecial: s.id });
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

async function runAll(): Promise<Log[]> {
  const workers = Math.max(1, Math.min(12, availableParallelism() - 1));
  const self = fileURLToPath(import.meta.url);
  const files = Array.from({ length: workers }, (_, i) => join(tmpdir(), `derrumbe-meta-${process.pid}-${i}.json`));
  await Promise.all(
    files.map(
      (out, i) =>
        new Promise<void>((resolve, reject) => {
          const child = spawn(process.execPath, [...process.execArgv, self, `--shard=${i}/${workers}`, `--out=${out}`, ...(quick ? ['rapido'] : [])], { stdio: ['ignore', 'inherit', 'inherit'] });
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

function report(logs: Log[]) {
  const plain = logs.filter((l) => !l.spec.giveTool && !l.spec.giveSpecial);
  const group = (deck: string, a: number, full: boolean) => plain.filter((l) => l.spec.deck === deck && l.spec.ascension === a && l.spec.full === full);

  const winrate = {
    levels: ASCENSIONS.map((asc, a) => ({ level: a + 1, name: asc.name, vacio: wr(group('obra', a, false)), lleno: wr(group('obra', a, true)), n: group('obra', a, true).length })),
    decks: DECKS.map((d) => ({ deck: d.id, name: d.name, vacio: wr(group(d.id, 0, false)), lleno: wr(group(d.id, 0, true)), n: group(d.id, 0, true).length })),
  };

  // referencia para medir el valor de cada cosa: gremio lleno, nivel 1, baraja de obra
  const base = group('obra', 0, true);
  const baseWr = wr(base);
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
      /** Dada al empezar: % de campañas ganadas y diferencia con la referencia. */
      given: given.length ? wr(given) : null,
      delta: given.length ? Math.round((wr(given) - baseWr) * 10) / 10 : null,
      /** Llevándola al entrar a la obra 5, entre las campañas que llegaron hasta ahí. */
      withMid: withIt.length >= 15 ? wr(withIt) : null,
      withoutMid: without.length >= 15 ? wr(without) : null,
      carried: withIt.length,
      activations: activations && own.length ? Math.round((sum(own, activations) / own.length) * 10) / 10 : null,
    };
  };

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
  // dónde se pierden las campañas (gremio vacío, nivel 1, baraja de obra)
  const fresh = group('obra', 0, false);
  const deaths = Array.from({ length: LAST_STAGE }, (_, i) => pct(fresh.filter((l) => l.diedAt === i + 1).length, fresh.length));

  // ── avisos ──
  const flags: string[] = [];
  const l1 = winrate.levels[0];
  const l8 = winrate.levels[7];
  if (l1.vacio < 24 || l1.vacio > 30) flags.push(`Nivel 1 con gremio vacío: ${l1.vacio} % (objetivo 24–30)`);
  if (l1.lleno < 40 || l1.lleno > 48) flags.push(`Nivel 1 con gremio lleno: ${l1.lleno} % (objetivo 40–48)`);
  if (l8.lleno < 8 || l8.lleno > 18) flags.push(`Nivel 8 con gremio lleno: ${l8.lleno} % (objetivo 8–18)`);
  for (const d of winrate.decks) if (d.lleno < 34 || d.lleno > 54) flags.push(`Baraja ${d.name}: ${d.lleno} % con gremio lleno (se aleja de las demás)`);
  for (const t of tools) {
    if (t.given !== null && t.given > 68) flags.push(`Herramienta ${t.name}: ${t.given} % ganadas si se da de salida (>68)`);
    if (t.pick < 5 && t.offered >= 40 && (t.delta ?? 0) <= 0) flags.push(`Herramienta ${t.name}: casi nunca se elige (${t.pick} %) y no ayuda (${t.delta})`);
    if ((t.delta ?? 0) <= -NOISE) flags.push(`Herramienta ${t.name}: llevarla de salida empeora el resultado (${t.delta})`);
  }
  for (const s of specials) {
    if (s.given !== null && s.given > 68) flags.push(`Especial ${s.name}: ${s.given} % ganadas si se da de salida (>68)`);
    if ((s.delta ?? 0) <= -NOISE * 1.2) flags.push(`Especial ${s.name}: llevarla de salida empeora el resultado (${s.delta})`);
  }
  for (const b of bosses) if (b.lethality > 2.2 * avgLethality) flags.push(`Jefe ${b.who}: letalidad ${b.lethality} % (más de 2,2× la media, ${avgLethality} %)`);
  for (const p of pacing) if (p.p50 > 18 || p.p95 > 27) flags.push(`Obra ${p.stage} (${p.name}): mediana de ${p.p50} turnos y percentil 95 de ${p.p95}`);

  return { campaigns: logs.length, baseline: baseWr, winrate, deaths, tools, specials, marks, bosses, avgLethality, pacing, flags };
}

function print(r: ReturnType<typeof report>): void {
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const num = (x: number | null, n = 6) => (x === null ? '—' : String(x)).padStart(n);
  console.log(`\nDERRUMBE · laboratorio de balance · ${r.campaigns} campañas\n`);
  console.log('Campañas ganadas por nivel de obra (baraja de obra)');
  for (const l of r.winrate.levels) console.log(`  ${l.level} ${pad(l.name, 18)} vacío ${num(l.vacio)} %   lleno ${num(l.lleno)} %`);
  console.log('\nPor baraja inicial (nivel 1)');
  for (const d of r.winrate.decks) console.log(`  ${pad(d.name, 24)} vacío ${num(d.vacio)} %   lleno ${num(d.lleno)} %`);
  console.log(`\nDónde se pierde (gremio vacío, % de campañas por obra): ${r.deaths.join(' · ')}`);
  console.log(`\nHerramientas (referencia: ${r.baseline} % con gremio lleno)`);
  console.log(`  ${pad('', 22)} ${pad('rareza', 9)} elige%  salida%  Δ      a media  sin    activ.`);
  for (const t of [...r.tools].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)))
    console.log(`  ${pad(t.name, 22)} ${pad(t.rarity, 9)} ${num(t.pick)} ${num(t.given, 8)} ${num(t.delta, 6)} ${num(t.withMid, 8)} ${num(t.withoutMid, 6)} ${num(t.activations, 8)}`);
  console.log('\nCartas especiales');
  for (const s of [...r.specials].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))) console.log(`  ${pad(s.name, 22)} ${pad(s.legendary ? 'legend.' : 'común', 9)} ${num(s.pick)} ${num(s.given, 8)} ${num(s.delta, 6)} ${num(s.withMid, 8)} ${num(s.withoutMid, 6)}`);
  console.log('\nSellos y tratamientos (llevándolos a media campaña)');
  for (const m of r.marks) console.log(`  ${pad(m.name, 22)} elige ${num(m.pick)} %   con ${num(m.withMid)} %   sin ${num(m.withoutMid)} %`);
  console.log(`\nJefes (letalidad media ${r.avgLethality} %)`);
  for (const b of r.bosses) console.log(`  ${pad(b.who, 14)} ${num(b.lethality)} %  (${b.deaths}/${b.faced})  ×${(b.lethality / (r.avgLethality || 1)).toFixed(2)}`);
  console.log('\nTurnos por obra (mediana · percentil 95)');
  for (const p of r.pacing) console.log(`  ${p.stage} ${pad(p.name, 20)} ${num(p.p50, 3)} · ${num(p.p95, 3)}`);
  console.log(r.flags.length ? `\nAVISOS (${r.flags.length})\n${r.flags.map((f) => `  ! ${f}`).join('\n')}` : '\nSin avisos: todo dentro de objetivo.');
}

const started = Date.now();
const result = report(await runAll());
print(result);
const out = fileURLToPath(new URL('./meta-report.json', import.meta.url));
writeFileSync(out, JSON.stringify({ generated: 'npm run analyze:meta', quick, curses: Object.fromEntries(BOSSES.map((b) => [b.id, BOSS[b.id].name])), ...result }, null, 1) + '\n');
console.log(`\n${out} · ${Math.round((Date.now() - started) / 1000)} s`);
