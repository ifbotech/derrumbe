// V40 1e · Sonda rápida del Mapa de caminos (solo laboratorio): campañas con cada política de ruta, en un proceso.
//   npx tsx scripts/sonda-mapa.ts [n] [mazo] [vacio|lleno]
import { Spec, playCampaign } from './lab';
import { POLITICAS_RUTA } from '../src/rules/bot';
import { DECK } from '../src/rules/run';
const n = Number(process.argv[2] ?? 200);
const deck = process.argv[3] ?? 'escoba';
const full = process.argv[4] === 'lleno';
// SIN_COMODIN=1: el Mazo sin su segundo Comodín (para medir cuánto le cuesta al bot llevarlo)
if (process.env.SIN_COMODIN) {
  const build = DECK[deck].build;
  DECK[deck].build = (run) => {
    build(run);
    run.deck = run.deck.filter((c) => c.id !== 'X2');
  };
}
const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
for (const ruta of POLITICAS_RUTA.filter((r) => !process.env.RUTAS || process.env.RUTAS.split(",").includes(r))) {
  const t0 = Date.now();
  const logs = Array.from({ length: n }, (_, i) => playCampaign({ seed: (i + 1) * 7919, deck, ascension: 0, full, policy: { ruta } } as Spec).log);
  const won = logs.filter((l) => l.won).length;
  const nodos: Record<string, number> = {};
  for (const l of logs) for (const [k, v] of Object.entries(l.nodos)) nodos[k] = (nodos[k] ?? 0) + v;
  const j = [0, 1, 2, 3, 4].map((i) => med(logs.flatMap((l) => (l.stageJugadas[i] !== undefined ? [l.stageJugadas[i]] : []))));
  console.log(`${ruta.padEnd(12)} ${((won / n) * 100).toFixed(1)} % · nodos/campaña ${Object.entries(nodos).map(([k, v]) => `${k} ${(v / n).toFixed(2)}`).join(' ')} · bravo jug ${(logs.reduce((a, l) => a + l.bravoJugadas, 0) / n).toFixed(1)} · muere en bravo ${logs.filter((l) => l.diedBravo).length} · gasto ${(logs.reduce((a, l) => a + l.gastoPulperia, 0) / n).toFixed(1)} · j50 ${j.join('/')} · muertes ${[1, 2, 3, 4, 5].map((s) => logs.filter((l) => l.diedAt === s).length).join('/')} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
process.exit(0);
