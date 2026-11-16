// `npm test`: todas las pruebas de Vitest, con las de cooperativo aparte.
//
// Por qué aparte: `tests/coop-estres.test.ts` abre cientos de conexiones WebSocket de cliente desde Node, y con
// Node 24 en Windows el proceso que las abre se cae a veces de forma nativa (código 0xC0000409, sin mensaje),
// más o menos una pasada de cada seis. No es un fallo de la prueba ni del servidor de salas: con el servidor en
// su propio proceso nunca se cayó (0 de 22 pasadas; los clientes, 4), y el servidor real no abre conexiones
// salientes (sus clientes son navegadores). Cuando la pasada de cooperativo muere con esa firma exacta se repite,
// hasta tres veces. Un fallo de verdad (una aserción, un tiempo agotado) no se repite: falla a la primera.
//
// Con argumentos (`npm test -- tests/engine.test.ts`), se le pasan a Vitest tal cual.
import { spawnSync } from 'node:child_process';

// Misión V12 → V26: tope duro. Cada pasada de Vitest se corta a los TOPE_TEST segundos (spawnSync bloquea el
// bucle de eventos, así que el tope va en la propia llamada) y `npm test` sale con 124.
const TOPE_TEST = Number(process.env.GUARDIAN_S) || 600;

const VITEST = ['node_modules/vitest/vitest.mjs', 'run'];
const COOP = 'tests/coop-estres.test.ts';
const CAIDA_NATIVA = /Worker exited unexpectedly with exit code 3221226505/;
const INTENTOS = 3;
const args = process.argv.slice(2);

function vitest(extra, capturar = false) {
  const r = spawnSync(process.execPath, [...VITEST, ...extra], { stdio: capturar ? ['inherit', 'pipe', 'pipe'] : 'inherit', encoding: 'utf8', timeout: TOPE_TEST * 1000, killSignal: 'SIGKILL' });
  if (r.error && /ETIMEDOUT/.test(String(r.error.code ?? r.error.message))) {
    console.error(`
GUARDIÁN · npm test: una pasada de Vitest pasó de ${TOPE_TEST} s. Se corta con 124.`);
    process.exit(124);
  }
  if (capturar) {
    process.stdout.write(r.stdout ?? '');
    process.stderr.write(r.stderr ?? '');
  }
  return { codigo: r.status ?? 1, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

// Misión V12 → V26: dos modos.
//   npm test             rápido (< 25 s): muestras cortas de Monte Carlo; las dos pasadas, una tras otra
//   npm run test:full    completo: PRUEBAS_COMPLETAS=1 (muestras enteras) y las pasadas una tras otra, como siempre
const COMPLETO = args.includes('--completo') || process.env.PRUEBAS_COMPLETAS === '1';
if (COMPLETO) process.env.PRUEBAS_COMPLETAS = '1';
const sueltos = args.filter((a) => a !== '--completo');
if (sueltos.length) process.exit(vitest(sueltos).codigo);

if (!COMPLETO) {
  const { spawn } = await import('node:child_process');
  const lanza = (extra) =>
    new Promise((ok) => {
      const h = spawn(process.execPath, [...VITEST, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] });
      let salida = '';
      h.stdout.on('data', (d) => (salida += d));
      h.stderr.on('data', (d) => (salida += d));
      const reloj = setTimeout(() => h.kill('SIGKILL'), TOPE_TEST * 1000);
      h.on('exit', (codigo) => (clearTimeout(reloj), ok({ codigo: codigo ?? 1, salida })));
    });
  const t0 = Date.now();
  // una tras otra: a la vez, con la máquina cargada, la prueba de cortes del cooperativo (sensible al tiempo) fallaba
  const todo = await lanza(['--exclude', COOP]);
  const primera = await lanza([COOP]);
  process.stdout.write(todo.salida);
  let coop = primera;
  for (let i = 1; coop.codigo !== 0 && i < INTENTOS && CAIDA_NATIVA.test(coop.salida) && !/AssertionError|Test timed out| FAIL /.test(coop.salida); i++) {
    console.log(`\n[npm test] El proceso de las pruebas de cooperativo se cayó de forma nativa (0xC0000409). Se repite (${i + 1} de ${INTENTOS}).\n`);
    coop = await lanza([COOP]);
  }
  process.stdout.write(coop.salida);
  console.log(`\n[npm test] rápido: ${((Date.now() - t0) / 1000).toFixed(1)} s (muestras cortas; la pasada completa es npm run test:full)`);
  process.exit(todo.codigo !== 0 ? todo.codigo : coop.codigo);
}


const resto = vitest(['--exclude', COOP]);
if (resto.codigo !== 0) process.exit(resto.codigo);

for (let i = 1; i <= INTENTOS; i++) {
  const coop = vitest([COOP], true);
  if (coop.codigo === 0) process.exit(0);
  const nativa = CAIDA_NATIVA.test(coop.salida) && !/AssertionError|Test timed out| FAIL /.test(coop.salida);
  if (!nativa || i === INTENTOS) process.exit(coop.codigo);
  console.log(`\n[npm test] El proceso de las pruebas de cooperativo se cayó de forma nativa (0xC0000409: Node en Windows al abrir conexiones de cliente). No es un fallo de la prueba: se repite (${i + 1} de ${INTENTOS}).\n`);
}
