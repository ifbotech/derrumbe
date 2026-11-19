// V40 1f · La curva de golpes, con los números de balance-config.json: Vida inicial por Mazo, Ataque de los guardias y
// del Guardia Bravo por asalto y el del Rey jefe en sus turnos 1 a 3 (dado en su cara más alta), frente a la Vida del
// Mazo más frágil. npx tsx scripts/curva-golpes.ts [reinado]
import { threatOf, type Config, type Tower } from '../src/rules/engine';
import { MAZO_IDS } from '../src/rules/mazos';
import { BOSSES, LAST_STAGE, newRun, rangoBravo, stageConfig, stageDef } from '../src/rules/run';

const a = Number(process.argv[2] ?? 1) - 1;
const vidas = Object.fromEntries(MAZO_IDS.map((d) => [d, newRun({ deck: d, ascension: a }, 7).maxIntegrity]));
const fragil = Math.min(...Object.values(vidas));
console.log(`Reinado ${a + 1} · Vida inicial por Mazo: ${MAZO_IDS.map((d) => `${d} ${vidas[d]}`).join(' · ')} (más frágil ${fragil})`);
const torre = (suit: Tower['suit'], r: number): Tower => ({ suit, floors: [r], damage: 0, fx: {} });
const pct = (n: number) => `${Math.round((100 * n) / fragil)} %`;
for (let s = 1; s <= LAST_STAGE; s++) {
  const run = newRun({ deck: 'escoba', ascension: a }, 11);
  run.stage = s;
  run.combate = 'asalto';
  const cfg: Config = stageConfig(run);
  const f = cfg.furiaInicial ?? 0;
  const guardias = stageDef(s).floors.map((r) => threatOf({ config: cfg, fatigue: f }, torre('S', r)));
  let linea = `  asalto ${s}: guardias ${guardias.join('/')} (peor ${pct(Math.max(...guardias))})`;
  if (s > 1) {
    const n = run.mapa.nodos.find((x) => x.tipo === 'bravo' && x.tramo === s)!;
    run.mapa.en = n.id;
    run.combate = 'bravo';
    const cb = stageConfig(run);
    const b = threatOf({ config: cb, fatigue: cb.furiaInicial ?? 0 }, torre(cb.orden![0], rangoBravo(s)));
    linea += ` · Bravo ${b} (${pct(b)})`;
    run.combate = 'asalto';
  }
  if (stageDef(s).boss)
    for (const boss of BOSSES) {
      run.boss = boss.id;
      run.bosses[s] = boss.id;
      const cr = stageConfig(run);
      const j = cr.jefe!;
      const r = Math.max(...stageDef(s).floors);
      const t = [1, 2, 3].map((k) => threatOf({ config: cr, fatigue: f + j.furia * (k - 1), dado: 6 }, torre(j.suit, r)));
      linea += ` · ${boss.id} ${t.join('/')}`;
    }
  console.log(linea);
}
