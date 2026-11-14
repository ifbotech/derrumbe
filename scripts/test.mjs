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

const VITEST = ['node_modules/vitest/vitest.mjs', 'run'];
const COOP = 'tests/coop-estres.test.ts';
const CAIDA_NATIVA = /Worker exited unexpectedly with exit code 3221226505/;
const INTENTOS = 3;
const args = process.argv.slice(2);

function vitest(extra, capturar = false) {
  const r = spawnSync(process.execPath, [...VITEST, ...extra], { stdio: capturar ? ['inherit', 'pipe', 'pipe'] : 'inherit', encoding: 'utf8' });
  if (capturar) {
    process.stdout.write(r.stdout ?? '');
    process.stderr.write(r.stderr ?? '');
  }
  return { codigo: r.status ?? 1, salida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

if (args.length) process.exit(vitest(args).codigo);

const resto = vitest(['--exclude', COOP]);
if (resto.codigo !== 0) process.exit(resto.codigo);

for (let i = 1; i <= INTENTOS; i++) {
  const coop = vitest([COOP], true);
  if (coop.codigo === 0) process.exit(0);
  const nativa = CAIDA_NATIVA.test(coop.salida) && !/AssertionError|Test timed out| FAIL /.test(coop.salida);
  if (!nativa || i === INTENTOS) process.exit(coop.codigo);
  console.log(`\n[npm test] El proceso de las pruebas de cooperativo se cayó de forma nativa (0xC0000409: Node en Windows al abrir conexiones de cliente). No es un fallo de la prueba: se repite (${i + 1} de ${INTENTOS}).\n`);
}
