// Certificación rápida del laboratorio (misión V12 → V26): `npm run analyze:meta -- --fast`.
//
//   · 6.000 campañas con semilla repartidas entre los núcleos con hilos de trabajo (worker_threads): menos de 90 s.
//   · Si la huella de las reglas de combate (scripts/lab.ts → fingerprint) es la del último informe completo sin
//     avisos (scripts/meta-report.json) o la de la última certificación rápida en verde (scripts/meta-fast.json),
//     no juega nada: «sin cambios», 0 s. `--forzar` la juega igual.
//   · El veredicto es una red, no el informe: cada objetivo se comprueba con un margen de tres errores típicos de
//     su muestra (con 1.000 campañas, ±4 puntos), el ritmo con un turno de holgura. Detecta roturas, no décimas.
//     El informe completo (≈ 52.000 campañas, sin márgenes) se corre en la coronación del Campeón.
//   · Escribe scripts/meta-fast.json; nunca toca meta-report.json.
import './balance-patch';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { DECKS } from '../src/rules/run';
import { Spec, fingerprint, playCampaign } from './lab';
import { OBJETIVOS } from './objetivos';

/** Lo mínimo de cada campaña que viaja del hilo al principal. */
interface Corto {
  deck: string;
  a: number;
  full: boolean;
  won: boolean;
  diedAt: number | null;
  turns: number[];
}

if (!isMainThread) {
  const specs = (workerData as { specs: Spec[] }).specs;
  const out: Corto[] = specs.map((spec) => {
    const { log } = playCampaign(spec);
    return { deck: spec.deck, a: spec.ascension, full: spec.full, won: log.won, diedAt: log.diedAt, turns: log.stageTurns };
  });
  parentPort!.postMessage(out);
}

const REPORTE = new URL('./meta-report.json', import.meta.url);
const RAPIDO = new URL('./meta-fast.json', import.meta.url);

function plan(): Spec[] {
  const specs: Spec[] = [];
  // las mismas semillas que el informe completo: comparar una certificación con otra tiene así menos ruido
  const seeds = (n: number) => Array.from({ length: n }, (_, i) => (i + 1) * 7919);
  const celda = (deck: string, ascension: number, n: number) => {
    for (const full of [false, true]) for (const seed of seeds(n)) specs.push({ seed, deck, ascension, full });
  };
  celda('obra', 0, 1000); // Reinado 1: 2.000
  celda('obra', 7, 500); // Reinado 8: 1.000
  for (const d of DECKS) if (d.id !== 'obra') celda(d.id, 0, 300); // cinco barajas: 3.000
  return specs;
}

interface Check {
  id: string;
  valor: number;
  lo?: number;
  hi?: number;
  margen: number;
  n: number;
  pasa: boolean;
}

/** ¿Hay ya un certificado de estas mismas reglas? Devuelve de dónde, o null. */
export function certificadoVigente(): string | null {
  const fp = fingerprint();
  try {
    const r = JSON.parse(readFileSync(REPORTE, 'utf8')) as { rules?: string; flags?: unknown[]; quick?: boolean };
    if (r.rules === fp && !r.quick && Array.isArray(r.flags) && r.flags.length === 0) return 'el informe completo (scripts/meta-report.json)';
  } catch {
    /* sin informe */
  }
  try {
    if (existsSync(RAPIDO)) {
      const f = JSON.parse(readFileSync(RAPIDO, 'utf8')) as { rules?: string; ok?: boolean };
      if (f.rules === fp && f.ok === true) return 'la certificación rápida (scripts/meta-fast.json)';
    }
  } catch {
    /* sin certificación */
  }
  return null;
}

export async function rapido(args: string[]): Promise<number> {
  const t0 = Date.now();
  const fp = fingerprint();
  if (!args.includes('--forzar')) {
    const de = certificadoVigente();
    if (de) {
      console.log(`Reglas de combate sin cambios (huella ${fp}) desde ${de}: Monte Carlo saltado, 0 s.`);
      return 0;
    }
  }
  const specs = plan();
  const hilos = Math.max(1, Math.min(Number(process.env.LAB_HILOS) || 12, availableParallelism()));
  const partes: Spec[][] = Array.from({ length: hilos }, () => []);
  specs.forEach((s, i) => partes[i % hilos].push(s));
  const self = new URL(import.meta.url);
  const tandas = await Promise.all(
    partes.map(
      (p) =>
        new Promise<Corto[]>((resolve, reject) => {
          const w = new Worker(self, { workerData: { specs: p }, execArgv: process.execArgv });
          w.once('message', (m: Corto[]) => resolve(m));
          w.once('error', reject);
          w.once('exit', (c) => c !== 0 && reject(new Error(`un hilo del laboratorio terminó con código ${c}`)));
        }),
    ),
  );
  const logs = tandas.flat();

  const pct = (xs: Corto[]) => (xs.length ? (100 * xs.filter((l) => l.won).length) / xs.length : 0);
  const se = (p: number, n: number) => (n ? 100 * Math.sqrt((Math.max(0.02, Math.min(0.98, p / 100)) * (1 - Math.max(0.02, Math.min(0.98, p / 100)))) / n) : 0);
  const grupo = (deck: string, a: number, full: boolean) => logs.filter((l) => l.deck === deck && l.a === a && l.full === full);
  const checks: Check[] = [];
  const rango = (id: string, xs: Corto[], [lo, hi]: readonly [number, number]) => {
    const valor = Math.round(pct(xs) * 10) / 10;
    const margen = Math.round(3 * se(valor, xs.length) * 10) / 10;
    checks.push({ id, valor, lo, hi, margen, n: xs.length, pasa: valor >= lo - margen && valor <= hi + margen });
  };
  rango('reinado1.vacio', grupo('obra', 0, false), OBJETIVOS.reinado1.vacio);
  rango('reinado1.lleno', grupo('obra', 0, true), OBJETIVOS.reinado1.lleno);
  rango('reinado8.vacio', grupo('obra', 7, false), OBJETIVOS.reinado8.vacio);
  rango('reinado8.lleno', grupo('obra', 7, true), OBJETIVOS.reinado8.lleno);
  for (const d of DECKS) {
    if (d.id === 'obra') continue;
    rango(`baraja.${d.id}.vacio`, grupo(d.id, 0, false), OBJETIVOS.barajas.vacio);
    rango(`baraja.${d.id}.lleno`, grupo(d.id, 0, true), OBJETIVOS.barajas.lleno);
  }
  // el Árbol lleno gana más que el vacío, y el Reinado 8 menos que el 1 (con las mismas semillas)
  const r1v = pct(grupo('obra', 0, false));
  const r1l = pct(grupo('obra', 0, true));
  checks.push({ id: 'arbol.suma', valor: Math.round((r1l - r1v) * 10) / 10, lo: 0, margen: 0, n: 2000, pasa: r1l > r1v });
  checks.push({ id: 'reinados.bajan', valor: Math.round((r1v - pct(grupo('obra', 7, false))) * 10) / 10, lo: 0, margen: 0, n: 1500, pasa: r1v > pct(grupo('obra', 7, false)) });
  // ritmo: percentil 95 de turnos por asalto (Reinado 1, todas las barajas), con un turno de holgura
  const cuantil = (xs: number[], q: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))] : 0);
  const r1 = logs.filter((l) => l.a === 0);
  const asaltos = Math.max(...r1.map((l) => l.turns.length));
  for (let s = 0; s < asaltos; s++) {
    const turnos = r1.map((l) => l.turns[s]).filter((t): t is number => typeof t === 'number' && t > 0);
    const tramo = OBJETIVOS.ritmo.find((x) => s + 1 <= x.hasta)!;
    const p95 = cuantil(turnos, 0.95);
    checks.push({ id: `ritmo.${s + 1}.p95`, valor: p95, hi: tramo.p95, margen: 1, n: turnos.length, pasa: p95 <= tramo.p95 + 1 });
  }
  // muertes en el asalto 1 (Reinado 1, Árbol vacío)
  const vacio = grupo('obra', 0, false);
  const m1 = vacio.length ? Math.round(((100 * vacio.filter((l) => l.diedAt === 1).length) / vacio.length) * 10) / 10 : 0;
  checks.push({ id: 'muertes.asalto1', valor: m1, hi: OBJETIVOS.muertesAsalto1, margen: Math.round(3 * se(m1, vacio.length) * 10) / 10, n: vacio.length, pasa: m1 <= OBJETIVOS.muertesAsalto1 + 3 * se(m1, vacio.length) });

  const ok = checks.every((c) => c.pasa) && logs.length === specs.length;
  const segundos = Math.round((Date.now() - t0) / 100) / 10;
  console.log(`\nCertificación rápida del laboratorio · ${logs.length} campañas · ${hilos} hilos · ${segundos} s · huella ${fp}\n`);
  for (const c of checks) {
    const banda = `${c.lo ?? '−∞'}–${c.hi ?? '∞'}`;
    console.log(`  ${c.pasa ? '✓' : '✗'} ${c.id.padEnd(26)} ${String(c.valor).padStart(6)}   objetivo ${banda} (margen ±${c.margen}, n ${c.n})`);
  }
  console.log(ok ? '\nSin roturas: las reglas quedan certificadas en rápido (el informe completo, en la coronación).' : `\nROTURAS (${checks.filter((c) => !c.pasa).length}): no se certifica.`);
  writeFileSync(RAPIDO, `${JSON.stringify({ generated: new Date().toISOString(), rules: fp, campaigns: logs.length, hilos, segundos, ok, checks, nota: 'Red rápida con margen de 3 errores típicos; no sustituye al informe completo.' }, null, 2)}\n`);
  return ok ? 0 : 1;
}
