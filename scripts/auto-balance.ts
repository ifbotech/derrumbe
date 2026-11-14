// Afinador acotado: busca variaciones pequeñas de los números de src/rules/balance-config.json contra los
// objetivos de balance (scripts/objetivos.ts, los mismos avisos que da npm run analyze:meta).
//
//   npm run balance:tune                     propone (presupuesto: 45 minutos) → artifacts/balance-tune/propuesta.{json,md}
//   npm run balance:tune -- --minutos=30     otro presupuesto de tiempo
//   npm run balance:tune -- --corto          modo de prueba: 2 campos, pocas campañas, segundos; no vale para aplicar
//   npm run balance:tune -- --aplicar        escribe en balance-config.json los cambios ya confirmados en propuesta.json
//   npm run balance:tune -- --probar=asaltos.0.hp=3,asedio.start=10 [--n=1500] [--modo=rapido]
//                                            mide una hipótesis contra el punto de partida (no la aplica nunca)
//
// Reglas de la búsqueda:
//   · cada campo de AFINABLES (src/rules/balance-config.ts) se mueve como mucho ±15 % de su valor de
//     partida, redondeado (enteros de uno en uno, reales a 0,01), y un campo cada vez;
//   · las semillas del laboratorio son fijas y compartidas: medir dos veces lo mismo da lo mismo;
//   · sondeos con n reducida (por defecto 200 campañas por celda) y confirmación del mejor candidato con
//     n ≥ 1.500; un cambio solo entra si en la confirmación baja la distancia a los objetivos y no saca
//     de su rango ningún objetivo que se cumplía;
//   · sin --aplicar no se escribe balance-config.json: su SHA-256 se comprueba al empezar y al acabar.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AFINABLES, Afinable, getPath, setPath } from '../src/rules/balance-config';
import { Comprobacion, InformeMeta, distancia, margen, revisar, revisarClasica } from './objetivos';

/** Lo más que se aleja un número de su valor de partida. */
export const TOPE = 0.15;
/** Muestra mínima de una confirmación (campañas por celda). */
export const N_CONFIRMA = 1500;

// ───────────────────────── Búsqueda (pura: no sabe nada del laboratorio) ─────────────────────────

/** Un campo con su valor de partida. */
export interface Campo extends Afinable {
  base: number;
}
/** Mide un parche `{ ruta: valor }` con n campañas por celda y devuelve las comprobaciones de los objetivos. */
export type Medidor = (patch: Record<string, number>, n: number) => Promise<Comprobacion[]>;

/** Redondea al paso del campo (enteros a la unidad; reales a 0,01 salvo otro `paso`). */
export function redondear(campo: Afinable, v: number): number {
  if (campo.entero) return Math.round(v);
  const paso = campo.paso ?? 0.01;
  return Math.round(Math.round(v / paso) * paso * 1e6) / 1e6;
}

/** ¿Está v dentro de ±15 % de la base? (con una tolerancia mínima por el redondeo de coma flotante) */
export function dentro(base: number, v: number): boolean {
  const d = Math.abs(base) * TOPE + 1e-9;
  return v >= base - d && v <= base + d;
}

/**
 * Valores que se prueban para un campo: −15 %, −7,5 %, +7,5 % y +15 % de la base, redondeados y, si el
 * redondeo los saca de ±15 %, recortados hacia dentro. Sin repetir y sin la base. Un entero pequeño
 * (2, 3, 4…) puede no tener ninguno: ±15 % no llega a la unidad siguiente.
 */
export function candidatos(campo: Campo): number[] {
  const out: number[] = [];
  for (const f of [-1, -0.5, 0.5, 1]) {
    let v = redondear(campo, campo.base * (1 + f * TOPE));
    // el redondeo hacia fuera se recorta: nunca más de ±15 %
    const unidad = campo.entero ? 1 : (campo.paso ?? 0.01);
    while (!dentro(campo.base, v) && Math.abs(v - campo.base) > 0) v = redondear(campo, v - Math.sign(v - campo.base) * unidad);
    if (v !== campo.base && dentro(campo.base, v) && !out.includes(v)) out.push(v);
  }
  return out;
}

export interface Sondeo {
  campo: string;
  valor: number;
  n: number;
  distancia: number;
}
export interface Cambio {
  campo: string;
  antes: number;
  despues: number;
  /** Variación sobre el valor de partida, en % (con signo). */
  variacion: number;
  /** Objetivos que no se cumplían y con el cambio sí. */
  arregla: string[];
  /** Objetivos que se siguen cumpliendo, pero cuyo margen se mueve 1 punto o más. */
  toca: { id: string; antes: number; despues: number }[];
  n: { sondeo: number; confirma: number };
}
export interface Resultado {
  vacia: boolean;
  mensaje: string;
  base: { n: number; distancia: number; comprobaciones: { id: string; ok: boolean; margen: number }[] };
  cambios: Cambio[];
  sondeos: Sondeo[];
  /** Campos que no se pudieron mover (ningún valor dentro de ±15 %) o que no se llegaron a probar. */
  sinProbar: string[];
  confirmaciones: { patch: Record<string, number>; n: number; distancia: number; aceptado: boolean; motivo: string }[];
  agotado: boolean;
}

export interface Opciones {
  campos: Campo[];
  medir: Medidor;
  nSondeo: number;
  nConfirma: number;
  /** Milisegundos. */
  presupuesto: number;
  ahora?: () => number;
  log?: (s: string) => void;
}

const resumen = (cs: Comprobacion[]) => cs.map((c) => ({ id: c.id, ok: c.ok, margen: Math.round(margen(c) * 100) / 100 }));
/** Solo se comparan las comprobaciones que están en las dos medidas (un sondeo no mide las piezas de regalo). */
const comunes = (a: Comprobacion[], b: Comprobacion[]) => {
  const ids = new Set(b.map((c) => c.id));
  return a.filter((c) => ids.has(c.id));
};

/**
 * Busca, un campo cada vez, el valor dentro de ±15 % que más acerca los objetivos; confirma el mejor con
 * muestra grande y lo acepta si mejora sin romper nada. Repite desde ahí mientras quede presupuesto.
 * Si en la medida de partida todo se cumple, no busca: la propuesta sale vacía con los márgenes.
 */
export async function buscar(o: Opciones): Promise<Resultado> {
  const ahora = o.ahora ?? Date.now;
  const log = o.log ?? (() => {});
  const t0 = ahora();
  // las semillas son fijas: medir dos veces lo mismo da lo mismo, así que no se repite
  const memo = new Map<string, Promise<Comprobacion[]>>();
  const real = o.medir;
  const medirUna: Medidor = (p, n) => {
    const k = `${n}|${JSON.stringify(Object.entries(p).sort())}`;
    if (!memo.has(k)) memo.set(k, real(p, n));
    return memo.get(k)!;
  };
  o = { ...o, medir: medirUna };
  const quedan = () => o.presupuesto - (ahora() - t0);
  const nConfirma = Math.max(o.nConfirma, 1);
  const base = await o.medir({}, nConfirma);
  const res: Resultado = { vacia: true, mensaje: '', base: { n: nConfirma, distancia: distancia(base), comprobaciones: resumen(base) }, cambios: [], sondeos: [], sinProbar: [], confirmaciones: [], agotado: false };
  if (distancia(base) === 0) {
    res.mensaje = `Todos los objetivos se cumplen en el punto de partida (n=${nConfirma}): la propuesta sale vacía.`;
    return res;
  }
  const patch: Record<string, number> = {};
  let actual = base;
  let tSondeo = 0;
  const usados = new Set<string>();
  for (;;) {
    const ref = await o.medir(patch, o.nSondeo);
    const dRef = distancia(ref);
    let mejor: { campo: Campo; valor: number; d: number } | null = null;
    for (const campo of o.campos) {
      if (usados.has(campo.ruta)) continue;
      const vals = candidatos(campo);
      if (!vals.length) {
        if (!res.sinProbar.includes(campo.ruta)) res.sinProbar.push(campo.ruta);
        continue;
      }
      for (const valor of vals) {
        // se reserva tiempo para la confirmación (n grande): si no cabe, se para aquí
        const coste = tSondeo * (1 + nConfirma / Math.max(1, o.nSondeo));
        if (tSondeo && quedan() < coste) {
          res.agotado = true;
          break;
        }
        const t = ahora();
        const m = await o.medir({ ...patch, [campo.ruta]: valor }, o.nSondeo);
        tSondeo = Math.max(tSondeo, ahora() - t);
        const d = distancia(comunes(m, ref));
        res.sondeos.push({ campo: campo.ruta, valor, n: o.nSondeo, distancia: Math.round(d * 100) / 100 });
        log(`  sondeo ${campo.ruta} = ${valor}: distancia ${d.toFixed(2)} (partida ${dRef.toFixed(2)})`);
        if (d < dRef && (!mejor || d < mejor.d || (d === mejor.d && Math.abs(valor - campo.base) < Math.abs(mejor.valor - mejor.campo.base)))) mejor = { campo, valor, d };
      }
      if (res.agotado) break;
    }
    if (res.agotado) for (const c of o.campos) if (!usados.has(c.ruta) && !res.sondeos.some((s) => s.campo === c.ruta) && !res.sinProbar.includes(c.ruta)) res.sinProbar.push(c.ruta);
    if (!mejor) break;
    // confirmación con muestra grande
    const prueba = { ...patch, [mejor.campo.ruta]: mejor.valor };
    const conf = await o.medir(prueba, nConfirma);
    const antes = comunes(actual, conf);
    const despues = comunes(conf, actual);
    const rompe = despues.filter((c) => !c.ok && antes.find((a) => a.id === c.id)?.ok).map((c) => c.id);
    const mejora = distancia(despues) < distancia(antes);
    const aceptado = mejora && !rompe.length;
    res.confirmaciones.push({ patch: prueba, n: nConfirma, distancia: Math.round(distancia(despues) * 100) / 100, aceptado, motivo: aceptado ? 'mejora sin romper nada' : !mejora ? 'no mejora con la muestra grande' : `saca de su rango: ${rompe.join(', ')}` });
    usados.add(mejor.campo.ruta);
    if (aceptado) {
      const arregla = despues.filter((c) => c.ok && !antes.find((a) => a.id === c.id)?.ok).map((c) => c.id);
      const toca = despues
        .filter((c) => c.ok && antes.find((a) => a.id === c.id)?.ok)
        .map((c) => ({ id: c.id, antes: Math.round(margen(antes.find((a) => a.id === c.id)!) * 100) / 100, despues: Math.round(margen(c) * 100) / 100 }))
        .filter((x) => Math.abs(x.despues - x.antes) >= 1);
      res.cambios.push({ campo: mejor.campo.ruta, antes: mejor.campo.base, despues: mejor.valor, variacion: Math.round(((mejor.valor - mejor.campo.base) / mejor.campo.base) * 1000) / 10, arregla, toca, n: { sondeo: o.nSondeo, confirma: nConfirma } });
      patch[mejor.campo.ruta] = mejor.valor;
      actual = conf;
      if (distancia(conf) === 0) break;
    }
    if (res.agotado || quedan() <= 0) {
      res.agotado = true;
      break;
    }
  }
  res.vacia = res.cambios.length === 0;
  res.mensaje = res.vacia
    ? `Hay objetivos fuera de rango y ningún cambio de ±15 % los acerca con la muestra grande${res.agotado ? ' (se acabó el presupuesto antes de probarlo todo)' : ''}.`
    : `${res.cambios.length} cambio${res.cambios.length > 1 ? 's' : ''} confirmado${res.cambios.length > 1 ? 's' : ''} con n=${nConfirma}. Aplicar con --aplicar y repetir el informe completo.`;
  return res;
}

// ───────────────────────── Propuesta y aplicación ─────────────────────────

export interface Propuesta extends Resultado {
  generado: string;
  /** SHA-256 de balance-config.json cuando se hizo la propuesta. */
  config: string;
  corto: boolean;
  minutos: number;
  duracion: number;
  medida: string;
}

export const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/**
 * Escribe en el archivo de configuración solo los campos de la propuesta. Comprueba que cada cambio parte del
 * valor que hay hoy en el archivo y no se sale de ±15 %. Devuelve los campos escritos.
 */
export function aplicar(configPath: string, propuesta: Pick<Propuesta, 'cambios' | 'corto'>): string[] {
  if (propuesta.corto) throw new Error('una propuesta del modo corto no se aplica: repite sin --corto');
  const cfg = JSON.parse(readFileSync(configPath, 'utf8')) as unknown;
  for (const c of propuesta.cambios) {
    const hoy = getPath(cfg, c.campo);
    if (hoy !== c.antes) throw new Error(`${c.campo}: la propuesta parte de ${c.antes}, pero el archivo tiene ${hoy}`);
    if (!dentro(c.antes, c.despues)) throw new Error(`${c.campo}: ${c.antes} → ${c.despues} se sale de ±15 %`);
    if (!c.n || c.n.confirma < N_CONFIRMA) throw new Error(`${c.campo}: confirmado con n=${c.n?.confirma ?? 0} (< ${N_CONFIRMA})`);
    setPath(cfg, c.campo, c.despues);
  }
  if (propuesta.cambios.length) writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
  return propuesta.cambios.map((c) => c.campo);
}

/** La propuesta en prosa, para leerla sin abrir el JSON. */
export function legible(p: Propuesta): string {
  const l: string[] = [`# Propuesta del afinador`, '', `${p.generado} · ${p.medida} · presupuesto ${p.minutos} min · ${Math.round(p.duracion / 1000)} s${p.corto ? ' · **modo corto: no vale para aplicar**' : ''}`, '', p.mensaje, ''];
  if (p.cambios.length) {
    l.push('| Campo | Antes | Después | Variación | Arregla | Toca (margen antes → después) | n |', '|---|---|---|---|---|---|---|');
    for (const c of p.cambios) l.push(`| \`${c.campo}\` | ${c.antes} | ${c.despues} | ${c.variacion > 0 ? '+' : ''}${c.variacion} % | ${c.arregla.join(', ') || '—'} | ${c.toca.map((t) => `${t.id} ${t.antes} → ${t.despues}`).join('; ') || '—'} | ${c.n.sondeo} / ${c.n.confirma} |`);
    l.push('');
  }
  l.push(`## Punto de partida (n=${p.base.n}, distancia ${p.base.distancia})`, '', '| Objetivo | Se cumple | Margen |', '|---|---|---|');
  for (const c of p.base.comprobaciones) l.push(`| ${c.id} | ${c.ok ? 'sí' : '**no**'} | ${c.margen === Infinity ? '—' : c.margen} |`);
  if (p.sondeos.length) l.push('', `## Sondeos (${p.sondeos.length})`, '', ...p.sondeos.map((s) => `- \`${s.campo}\` = ${s.valor}: distancia ${s.distancia} (n=${s.n})`));
  if (p.confirmaciones.length) l.push('', '## Confirmaciones', '', ...p.confirmaciones.map((c) => `- ${JSON.stringify(c.patch)} con n=${c.n}: distancia ${c.distancia} · ${c.aceptado ? 'aceptado' : 'rechazado'} (${c.motivo})`));
  if (p.sinProbar.length) l.push('', `Sin probar: ${p.sinProbar.map((s) => `\`${s}\``).join(', ')}.`);
  return l.join('\n') + '\n';
}

// ───────────────────────── Medida con el laboratorio ─────────────────────────

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const META = join(ROOT, 'scripts', 'analyze-meta.ts');
const REPORT = join(ROOT, 'scripts', 'meta-report.json');

/**
 * Mide con `analyze-meta` (modo rápido: los 8 Reinados, las 6 barajas, monarcas y ritmo; sin las piezas de
 * regalo, que solo mide el informe completo) en un proceso aparte, con el parche en BALANCE_PATCH.
 * El punto de partida a n ≥ 1.500 sale del informe completo publicado si es de estas reglas (misma huella).
 */
export function medidorLab(modo: string, log: (s: string) => void): Medidor {
  return async (patch, n) => {
    if (!Object.keys(patch).length && n >= N_CONFIRMA && existsSync(REPORT)) {
      const { fingerprint } = await import('./lab');
      const r = JSON.parse(readFileSync(REPORT, 'utf8')) as InformeMeta & { rules: string; quick: boolean };
      if (!r.quick && r.rules === fingerprint()) {
        log(`  punto de partida: scripts/meta-report.json (informe completo de estas reglas, huella ${r.rules})`);
        return [...revisar(r), ...revisarClasica(r.classic ?? [])];
      }
    }
    const t = Date.now();
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [...process.execArgv, META, modo, `--n=${n}`], { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, BALANCE_PATCH: JSON.stringify(patch) } });
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`analyze-meta terminó con código ${code}`))));
    });
    const r = JSON.parse(readFileSync(join(tmpdir(), `derrumbe-meta-${modo}.json`), 'utf8')) as InformeMeta;
    log(`  medido ${JSON.stringify(patch)} · ${modo} n=${n} · ${Math.round((Date.now() - t) / 1000)} s`);
    return revisar(r);
  };
}

// ───────────────────────── Programa ─────────────────────────

export interface Ejecucion {
  args: string[];
  configPath: string;
  outDir: string;
  medir?: Medidor;
  log?: (s: string) => void;
}

/** El programa entero, con rutas y medidor inyectables (las pruebas lo usan con un medidor de juguete). */
export async function ejecutar(e: Ejecucion): Promise<Propuesta | string[] | null> {
  const log = e.log ?? console.log;
  const arg = (name: string) => e.args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  const flag = (name: string) => e.args.includes(`--${name}`);
  const propuestaPath = join(e.outDir, 'propuesta.json');
  if (flag('aplicar')) {
    if (!existsSync(propuestaPath)) throw new Error(`no hay propuesta en ${propuestaPath}: ejecuta antes balance:tune sin --aplicar`);
    const p = JSON.parse(readFileSync(propuestaPath, 'utf8')) as Propuesta;
    const campos = aplicar(e.configPath, p);
    log(campos.length ? `Aplicado en balance-config.json: ${campos.join(', ')}. Repite el informe completo (npm run analyze:meta) y npm run docs.` : 'La propuesta está vacía: no se cambia nada.');
    return campos;
  }
  const corto = flag('corto');
  const minutos = Number(arg('minutos') ?? (corto ? 2 : 45));
  // el modo corto mide solo los Reinados 1 y 8 (cuatro celdas): segundos por medida
  const modo = arg('modo') ?? (corto ? 'foco' : 'rapido');
  const nSondeo = Number(arg('sondeo') ?? (corto ? 20 : 200));
  const nConfirma = Number(arg('n') ?? (corto ? 20 : N_CONFIRMA));
  const hashAntes = sha256(e.configPath);
  const cfg = JSON.parse(readFileSync(e.configPath, 'utf8')) as unknown;
  const medir = e.medir ?? medidorLab(modo, log);
  const t0 = Date.now();
  mkdirSync(e.outDir, { recursive: true });

  const probar = arg('probar');
  if (probar) {
    // una hipótesis: se mide tal cual (puede salirse de ±15 %; por eso nunca se aplica) frente a la partida
    const patch = Object.fromEntries(probar.split(',').map((kv) => [kv.split('=')[0], Number(kv.split('=')[1])]));
    for (const [ruta, v] of Object.entries(patch)) {
      getPath(cfg, ruta); // falla si la ruta no existe
      if (!Number.isFinite(v)) throw new Error(`--probar: «${ruta}» sin número`);
    }
    const base = await medir({}, nConfirma);
    const hipo = await medir(patch, nConfirma);
    const filas = comunes(hipo, base).map((c) => {
      const b = base.find((x) => x.id === c.id)!;
      return { id: c.id, antes: { ok: b.ok, margen: Math.round(margen(b) * 100) / 100, partes: b.partes }, despues: { ok: c.ok, margen: Math.round(margen(c) * 100) / 100, partes: c.partes } };
    });
    const fuera = Object.entries(patch).filter(([ruta, v]) => !dentro(getPath(cfg, ruta), v)).map(([ruta]) => ruta);
    const salida = { generado: new Date().toISOString().slice(0, 10), patch, n: nConfirma, modo, fueraDeTope: fuera, rompe: filas.filter((f) => f.antes.ok && !f.despues.ok).map((f) => f.id), arregla: filas.filter((f) => !f.antes.ok && f.despues.ok).map((f) => f.id), filas };
    writeFileSync(join(e.outDir, 'prueba.json'), JSON.stringify(salida, null, 1) + '\n');
    log(`Hipótesis ${JSON.stringify(patch)} (n=${nConfirma}, ${modo}): saca de su rango ${salida.rompe.join(', ') || 'nada'}; arregla ${salida.arregla.join(', ') || 'nada'}${fuera.length ? `; fuera de ±15 %: ${fuera.join(', ')} (el afinador no lo propondría)` : ''}.`);
    for (const f of filas.filter((x) => x.antes.ok !== x.despues.ok || Math.abs(x.despues.margen - x.antes.margen) >= 1)) log(`  ${f.id}: ${f.antes.partes.map((p) => p.valor).join('/')} → ${f.despues.partes.map((p) => p.valor).join('/')}${f.despues.ok ? '' : '  FUERA'}`);
    if (sha256(e.configPath) !== hashAntes) throw new Error('balance-config.json cambió durante la prueba');
    return null;
  }

  const lista = corto ? AFINABLES.slice(0, 2) : AFINABLES;
  const campos: Campo[] = lista.map((a) => ({ ...a, base: getPath(cfg, a.ruta) }));
  log(`Afinador · ${campos.length} campos · sondeos n=${nSondeo}, confirmación n=${nConfirma} · ${modo} · presupuesto ${minutos} min${corto ? ' · modo corto' : ''}`);
  const r = await buscar({ campos, medir, nSondeo, nConfirma, presupuesto: minutos * 60_000, log });
  const propuesta: Propuesta = { generado: new Date().toISOString().slice(0, 10), config: hashAntes, corto, minutos, duracion: Date.now() - t0, medida: `analyze-meta ${modo}`, ...r };
  writeFileSync(propuestaPath, JSON.stringify(propuesta, null, 1) + '\n');
  writeFileSync(join(e.outDir, 'propuesta.md'), legible(propuesta));
  if (sha256(e.configPath) !== hashAntes) throw new Error('balance-config.json cambió sin --aplicar: la propuesta no vale');
  log(`\n${r.mensaje}`);
  for (const c of r.base.comprobaciones.filter((x) => !x.ok || x.margen < 1)) log(`  ${c.ok ? 'justo' : 'FUERA'} ${c.id}: margen ${c.margen}`);
  log(`\n${propuestaPath} · ${Math.round(propuesta.duracion / 1000)} s · balance-config.json sin tocar (SHA-256 ${hashAntes.slice(0, 12)}…)`);
  return propuesta;
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  await ejecutar({ args: process.argv.slice(2), configPath: join(ROOT, 'src', 'rules', 'balance-config.json'), outDir: join(ROOT, 'artifacts', 'balance-tune') });
}
