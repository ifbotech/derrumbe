import { guardian } from './guardian';
// infra/rapido · tope por modo: partida (--pasada=a, --pasada=b, --compara) ninguna invocación pasa de 170 s; entera
// (las dos pasadas seguidas), 400 s en paralelo y 2400 s con un solo navegador (QA_HILOS=1)
const argv0 = process.argv.slice(2);
const partida = argv0.some((a) => a.startsWith('--pasada=') || a === '--compara');
guardian('qa:determinista', partida ? 170 : Number(process.env.QA_HILOS || 8) > 1 ? 400 : 2400); // tope duro: ver scripts/guardian.ts
// QA determinista (V12, SPECS/V12.md 1.13): la QA visual, dos veces seguidas sobre la misma construcción,
// tiene que dar capturas idénticas byte a byte. Si una captura cambia entre pasadas, una prueba de píxeles
// sobre ella no prueba nada (es azar, reloj, una fuente a medio cargar o una animación a medias).
//
//   npm run qa:determinista                          las cuatro ventanas y todos los estados, en español
//   npm run qa:determinista -- --lang=en             la pasada en inglés
//   npm run qa:determinista -- mesa portada          solo esos estados
//   VIEW=1280x800 npm run qa:determinista            solo esa ventana
//   QA_DIR=dist/qa-yo npm run qa:determinista        construye y sirve desde otra carpeta
//
// infra/rapido · en tres invocaciones de menos de 170 s cada una (con con-tope.mjs 180 cada una):
//   npm run qa:determinista -- --pasada=a            solo la primera pasada (construye, salvo NO_BUILD=1)
//   npm run qa:determinista -- --pasada=b            solo la segunda (nunca construye: usa la de la primera)
//   npm run qa:determinista -- --compara             solo la comparación de las dos carpetas que ya están
//   … --compara --a=<carpeta> --b=<carpeta>          compara dos carpetas cualesquiera (p. ej. contra las de
//                                                    referencia de artifacts/visual-qa)
//
// La primera pasada construye (salvo NO_BUILD=1) y la segunda reutiliza esa construcción. Cada una deja sus
// capturas en su carpeta (artifacts/qa-determinista/<idioma>/a y …/b). Se compara el SHA-256 de cada PNG y,
// para las que difieren, cuántos píxeles cambian, la diferencia máxima por canal y la caja que los contiene.
// Sale con error si alguna captura falta en una pasada o difiere más allá del residuo de rasterizado (abajo). Los fallos de la QA visual de
// cada pasada se informan aparte: esta orden mide solo la repetibilidad.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { type Browser, chromium } from 'playwright';

const args = argv0;
const lang = args.some((a) => a === '--lang=en') || process.env.QA_LANG === 'en' ? 'en' : 'es';
const base = resolve(process.env.QA_DET_OUT?.trim() || join('artifacts/qa-determinista', lang));
const opcion = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const pasadas = [resolve(opcion('a') || join(base, 'a')), resolve(opcion('b') || join(base, 'b'))];
const soloPasada = opcion('pasada');
const soloCompara = args.includes('--compara');
/** Lo que se le pasa a visual-qa: estados y --lang, sin las opciones de esta orden. */
const deVisual = args.filter((a) => !/^--(pasada|a|b)=/.test(a) && a !== '--compara');

/** Una pasada de la QA visual con sus capturas en `out`. Devuelve el código de salida. */
function pasada(out: string, construir: boolean): number {
  rmSync(out, { recursive: true, force: true });
  const env = { ...process.env, QA_OUT: out, ...(construir ? {} : { NO_BUILD: '1' }) };
  // con tope: una pasada en paralelo tarda ~110 s; con un solo navegador, ~12 min
  const tope = Number(process.env.QA_HILOS || 8) > 1 ? 175_000 : 1_100_000;
  const r = spawnSync(`npx tsx scripts/visual-qa.ts ${deVisual.map((a) => JSON.stringify(a)).join(' ')}`, { stdio: 'inherit', shell: true, env, timeout: tope });
  if (r.error) console.log(`! la pasada en ${relative(process.cwd(), out)} se cortó: ${r.error.message}`);
  return r.status ?? 1;
}

function pngs(dir: string): string[] {
  const out: string[] = [];
  const anda = (d: string) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) anda(p);
      else if (f.endsWith('.png')) out.push(relative(dir, p).replace(/\\/g, '/'));
    }
  };
  anda(dir);
  return out.sort();
}

const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');

/** Comparador de dos PNG en la página (texto plano: se evalúa tal cual en Chromium). */
const COMPARA = `async (a, b) => {
      const carga = (u) =>
        new Promise((ok, mal) => {
          const im = new Image();
          im.onload = () => ok(im);
          im.onerror = mal;
          im.src = u;
        });
      const [ia, ib] = await Promise.all([carga(a), carga(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { tam: \`\${ia.width}x\${ia.height} y \${ib.width}x\${ib.height}\` };
      const datos = (im) => {
        const c = document.createElement('canvas');
        c.width = im.width;
        c.height = im.height;
        const g = c.getContext('2d');
        g.drawImage(im, 0, 0);
        return g.getImageData(0, 0, im.width, im.height).data;
      };
      const [da, db] = [datos(ia), datos(ib)];
      let distintos = 0;
      let max = 0;
      let caja = null;
      for (let i = 0; i < da.length; i += 4) {
        const m = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
        if (!m) continue;
        distintos++;
        max = Math.max(max, m);
        const x = (i / 4) % ia.width;
        const y = Math.floor(i / 4 / ia.width);
        caja = caja ? [Math.min(caja[0], x), Math.min(caja[1], y), Math.max(caja[2], x), Math.max(caja[3], y)] : [x, y, x, y];
      }
      return { distintos, max, caja, total: ia.width * ia.height };
    }`;

type Dif = { distintos: number; max: number; caja: [number, number, number, number] | null; total: number } | { tam: string };

// Residuo de rasterizado (decisión del orquestador, V12): Chromium trama algunas capas compuestas a ± unos niveles
// de una pasada a otra. Se tolera como AVISO si son como mucho RESIDUO.capturas capturas, cada una con diferencia
// máxima por canal ≤ RESIDUO.max y menos de RESIDUO.superficie de sus píxeles. Cualquier otra cosa es error.
// Segundo caso (orquestador, arte B): un puñado de píxeles en el borde de un glifo (antialias del texto), sea cual
// sea su amplitud, si son menos de RESIDUO.borde de la captura (medido: 55 px de 1.024.000, máx. 37, en la bolsa).
const RESIDUO = { capturas: 4, max: 8, superficie: 0.01, borde: 0.0005 };
const esResiduo = (d: Dif) =>
  !('tam' in d) && ((d.max <= RESIDUO.max && d.distintos / d.total < RESIDUO.superficie) || d.distintos / d.total < RESIDUO.borde);

async function compara(codigos: number[]): Promise<number> {
  const [la, lb] = pasadas.map(pngs);
  const todas = [...new Set([...la, ...lb])].sort();
  const faltan = todas.filter((f) => !la.includes(f) || !lb.includes(f));
  const distintas = todas.filter((f) => !faltan.includes(f) && sha(join(pasadas[0], f)) !== sha(join(pasadas[1], f)));
  const detalle: Record<string, Dif> = {};
  if (distintas.length) {
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch();
      const page = await browser.newPage();
      page.setDefaultTimeout(30_000);
      for (const f of distintas) {
        const [ua, ub] = pasadas.map((d) => `data:image/png;base64,${readFileSync(join(d, f)).toString('base64')}`);
        // el comparador va como texto: así tsx no le cuela ayudantes (__name) que la página no tiene
        detalle[f] = (await page.evaluate(`(${COMPARA})(${JSON.stringify(ua)}, ${JSON.stringify(ub)})`)) as Dif;
      }
    } finally {
      await Promise.race([browser?.close(), new Promise((ok) => setTimeout(ok, 10_000).unref())]);
    }
  }
  const residuo = distintas.filter((f) => esResiduo(detalle[f]));
  const graves = distintas.filter((f) => !esResiduo(detalle[f]));
  const toleradas = graves.length === 0 && residuo.length <= RESIDUO.capturas;
  const linea = (f: string) => {
    const d = detalle[f];
    return 'tam' in d
      ? `${f}: tamaños ${d.tam}`
      : `${f}: ${d.distintos} px distintos (${((100 * d.distintos) / d.total).toFixed(3)} %), diferencia máxima ${d.max}, caja x ${d.caja?.[0]}–${d.caja?.[2]} y ${d.caja?.[1]}–${d.caja?.[3]}`;
  };

  console.log(`\n── QA determinista · ${lang} · ${pasadas.map((p) => relative(process.cwd(), p)).join(' frente a ')} ──`);
  for (const f of graves) console.log(`✗ ${linea(f)}`);
  for (const f of residuo) console.log(`${toleradas ? '!' : '✗'} ${linea(f)}${toleradas ? ' · residuo de rasterizado' : ''}`);
  for (const f of faltan) console.log(`✗ ${f}: solo está en la pasada ${la.includes(f) ? 1 : 2}`);
  codigos.forEach((c, i) => c && console.log(`! la pasada ${i + 1} de la QA visual salió con ${c} (ver sus fallos arriba)`));
  const ok = !!todas.length && !faltan.length && (!distintas.length || toleradas);
  const identicas = todas.length - distintas.length - faltan.length;
  const conResiduo = toleradas ? residuo.length : 0;
  mkdirSync(base, { recursive: true });
  writeFileSync(
    join(base, 'determinista.json'),
    JSON.stringify(
      { lang, pasadas, capturas: todas.length, identicas, conResiduo, residuo: toleradas ? residuo.map((f) => ({ f, ...detalle[f] })) : [], distintas: toleradas ? [] : distintas.map((f) => ({ f, ...detalle[f] })), faltan, criterioResiduo: RESIDUO, qaVisual: codigos, ok },
      null,
      1,
    ),
  );
  console.log(`${todas.length} capturas · ${identicas} idénticas · ${conResiduo} con residuo de rasterizado · ${toleradas ? 0 : distintas.length} distintas · ${faltan.length} en una sola pasada`);
  console.log(!ok ? 'NO es determinista.' : distintas.length ? `Determinista salvo residuo de rasterizado (${residuo.length} capturas, aviso).` : 'Determinista: las dos pasadas son idénticas byte a byte.');
  return ok ? 0 : 1;
}

async function main(): Promise<number> {
  if (soloPasada === 'a' || soloPasada === 'b') {
    const i = soloPasada === 'a' ? 0 : 1;
    console.log(`QA determinista · ${lang === 'en' ? 'inglés' : 'español'} · solo la pasada ${soloPasada} en ${relative(process.cwd(), pasadas[i])}`);
    const c = pasada(pasadas[i], i === 0 && !process.env.NO_BUILD);
    // la pasada guarda su código para que --compara lo pueda informar
    writeFileSync(join(pasadas[i], 'codigo-qa-visual.txt'), `${c}\n`);
    return c;
  }
  if (soloCompara) {
    const codigos = pasadas.map((d) => (existsSync(join(d, 'codigo-qa-visual.txt')) ? Number(readFileSync(join(d, 'codigo-qa-visual.txt'), 'utf8')) : 0));
    return compara(codigos);
  }
  if (soloPasada) {
    console.log(`✗ --pasada=${soloPasada}: solo vale a o b`);
    return 1;
  }
  console.log(`QA determinista · ${lang === 'en' ? 'inglés' : 'español'} · dos pasadas en ${relative(process.cwd(), base)}`);
  const codigos = pasadas.map((out, i) => {
    console.log(`\n── pasada ${i + 1} de 2 ──`);
    return pasada(out, i === 0 && !process.env.NO_BUILD);
  });
  return compara(codigos);
}

// infra/rapido · salida explícita siempre (el navegador del comparador ya se cerró en su finally)
main().then(
  (c) => process.exit(c),
  (e) => {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    process.exit(1);
  },
);
