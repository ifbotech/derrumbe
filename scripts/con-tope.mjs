// Tope duro para cualquier orden (misión V12 → V26): ninguna espera es infinita.
//
//   node scripts/con-tope.mjs <segundos> <orden> [argumentos…]
//   node scripts/con-tope.mjs 180 npm run qa:smoke -- --fast
//   node scripts/con-tope.mjs 900 --cwd ../panelAgentesGaming .venv/Scripts/python -m panel_gaming run --preset pulso-24
//
// Lanza la orden con su salida tal cual. Si pasa de sus segundos, mata el árbol entero de procesos (en Windows,
// `taskkill /T /F`: node, chromium, python y lo que cuelgue de ellos) y sale con 124. La última línea que escribe
// es siempre «exit <código>», para los registros que esperan esa marca.
import { spawn, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const segundos = Number(args.shift());
let cwd = process.cwd();
if (args[0] === '--cwd') {
  args.shift();
  cwd = args.shift() ?? cwd;
}
if (!Number.isFinite(segundos) || segundos <= 0 || !args.length) {
  console.error('uso: node scripts/con-tope.mjs <segundos> [--cwd <carpeta>] <orden> [argumentos…]');
  console.log('exit 2');
  process.exit(2);
}

const empezo = Date.now();
const esWindows = process.platform === 'win32';
// con shell para que «npm» y las rutas con barras funcionen igual en Windows; cada argumento, entre comillas si hace falta
const cita = (a) => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const hijo = spawn(args.map(cita).join(' '), { cwd, stdio: 'inherit', shell: true, windowsHide: true });

const matarArbol = () => {
  if (hijo.pid === undefined) return;
  try {
    if (esWindows) spawnSync('taskkill', ['/PID', String(hijo.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-hijo.pid, 'SIGKILL');
  } catch {
    try {
      hijo.kill('SIGKILL');
    } catch {
      /* ya no está */
    }
  }
};

let cortado = false;
const reloj = setTimeout(() => {
  cortado = true;
  console.error(`\nTOPE: la orden pasó de ${segundos} s. Se mata su árbol de procesos.`);
  matarArbol();
  // si ni así vuelve el evento de cierre, se sale igual
  setTimeout(() => fin(124), 5000);
}, segundos * 1000);

function fin(codigo) {
  clearTimeout(reloj);
  const seg = Math.round((Date.now() - empezo) / 100) / 10;
  console.log(`\n[con-tope] ${seg} s de ${segundos} s`);
  console.log(`exit ${codigo}`);
  process.exit(codigo);
}

hijo.on('error', (e) => {
  console.error(`no se pudo lanzar: ${e.message}`);
  fin(127);
});
hijo.on('exit', (codigo, senal) => fin(cortado ? 124 : (codigo ?? (senal ? 137 : 1))));
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => (matarArbol(), fin(130)));
