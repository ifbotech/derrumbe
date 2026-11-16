// Humo completo por secciones (infra/rapido): construye una vez y lanza cada sección de scripts/smoke.ts en su propia
// invocación, una tras otra, cada una con `node scripts/con-tope.mjs 180 …`: ninguna orden suelta pasa de 180 s (y el
// guardián de cada sección la corta antes, a los 170 s). La suma tarda lo que tarde. Al final, el resumen por sección.
//
//   npm run qa:smoke:todo                    (español)
//   npm run qa:smoke:todo -- --lang=en       (inglés)
//   npm run qa:smoke:todo -- --desde=mando   (retoma desde una sección; los tramos de campaña van juntos y en orden)
//   QA_DIR=dist/qa-<celda> construye y sirve aparte, como el humo de siempre. NO_PAD=1 y NO_V12=1 siguen valiendo.
//
// Sale con 0 solo si todas las secciones salen con 0 y ninguna comprobación falla («Todo en orden.»).
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const lang = args.filter((a) => a === '--lang=en');
const desde = args.find((a) => a.startsWith('--desde='))?.slice('--desde='.length) ?? '';
const TOPE = 180;
const empezo = Date.now();

/** Lanza una orden con tope (con-tope.mjs), deja ver su salida tal cual y la devuelve entera. */
function corre(orden, env = {}) {
  return new Promise((done) => {
    const hijo = spawn(process.execPath, ['scripts/con-tope.mjs', String(TOPE), ...orden], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let salida = '';
    hijo.stdout.on('data', (d) => {
      salida += d;
      process.stdout.write(d);
    });
    hijo.stderr.on('data', (d) => {
      salida += d;
      process.stderr.write(d);
    });
    hijo.on('exit', (codigo) => done({ codigo: codigo ?? 1, salida }));
    hijo.on('error', (e) => done({ codigo: 127, salida: String(e) }));
  });
}

const qaDir = process.env.QA_DIR?.trim();
console.log(`Humo completo por secciones · ${lang.length ? 'inglés' : 'español'} · construcción en ${qaDir || 'dist/web'}`);
const build = await corre(qaDir ? ['npx', 'vite', 'build', '--mode', 'web', '--outDir', qaDir, '--logLevel', 'warn'] : ['npm', 'run', 'build:web']);
if (build.codigo !== 0) {
  console.log(`\nLa construcción falló (exit ${build.codigo}).`);
  console.log('exit 1');
  process.exit(1);
}
const lista = await corre(['npx', 'tsx', 'scripts/smoke.ts', '--secciones']);
let secciones = (lista.salida.split('\n').find((l) => /^mesa\b/.test(l.trim())) ?? '').trim().split(/\s+/).filter(Boolean);
if (!secciones.length) {
  console.log('\nNo se pudo leer la lista de secciones de scripts/smoke.ts.');
  console.log('exit 1');
  process.exit(1);
}
if (desde) {
  const i = secciones.indexOf(desde.startsWith('campana-') ? 'campana-1' : desde);
  if (i < 0) {
    console.log(`\nSección desconocida: ${desde}. Hay: ${secciones.join(' ')}`);
    console.log('exit 2');
    process.exit(2);
  }
  secciones = secciones.slice(i);
}

const filas = [];
for (const id of secciones) {
  console.log(`\n════ sección ${id} ════`);
  const t = Date.now();
  const r = await corre(['npx', 'tsx', 'scripts/smoke.ts', `--solo=${id}`, ...lang], { NO_BUILD: '1' });
  const m = r.salida.match(/HUMO · sección \S+: (\d+) ✓ · (\d+) ✗ · ([\d.]+) s/);
  const tope = /TOPE: la orden pasó|GUARDIÁN/.test(r.salida);
  filas.push({ id, ok: m ? Number(m[1]) : 0, ko: m ? Number(m[2]) : 0, s: (Date.now() - t) / 1000, codigo: r.codigo, tope, problemas: r.salida.split('\n').filter((l) => l.startsWith('! ')).map((l) => l.trim()) });
}

const ok = filas.reduce((a, f) => a + f.ok, 0);
const ko = filas.reduce((a, f) => a + f.ko, 0);
console.log(`\n════ resumen (${lang.length ? 'inglés' : 'español'}) ════`);
for (const f of filas) console.log(`  ${f.id.padEnd(14)} ${String(f.ok).padStart(4)} ✓ ${String(f.ko).padStart(3)} ✗ ${f.s.toFixed(1).padStart(7)} s  exit ${f.codigo}${f.tope ? ' (cortada por el tope)' : ''}`);
const lenta = filas.reduce((a, f) => (f.s > a.s ? f : a), { id: '—', s: 0 });
console.log(`  total: ${ok} ✓ · ${ko} ✗ · ${secciones.length} secciones · ${((Date.now() - empezo) / 1000).toFixed(0)} s (la más larga: ${lenta.id}, ${lenta.s.toFixed(1)} s)`);
for (const f of filas) for (const p of f.problemas) console.log(`  [${f.id}] ${p}`);
const bien = filas.every((f) => f.codigo === 0) && ko === 0;
console.log(bien ? '\nTodo en orden.' : `\n${filas.filter((f) => f.codigo !== 0).length} secciones con problemas`);
process.exit(bien ? 0 : 1);
