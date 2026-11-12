// Control de calidad visual. Solo se carga si la dirección lleva ?qa: monta a mano, y siempre igual,
// los estados que fotografía scripts/visual-qa.ts (mesa llena, lupa, plano, ferretería, forja…).
// Nada de lo que pasa aquí se guarda: el guardado queda desactivado mientras dura la sesión.
import { ACHIEVEMENTS } from '../rules/achievements';
import { Card, GameState, SUITS, Seal, Suit, Treatment, applyAction, viewFor } from '../rules/engine';
import { Run, finishBattle, newRun, runAction, startStage } from '../rules/run';
import { TOOLS } from '../rules/tools';
import { RUN_PLAYER, S } from './core';
import { meta, openGuild } from './guild';
import { openLupa } from './lupa';
import { platform } from './platform';
import { setScreen } from './router';
import { pump, renderInteractive } from './table';
import { showSettings } from './widgets';

const TOOLKIT = ['piqueta', 'gemelos', 'calibre', 'dinamita', 'pasarela', 'resonador'];
const MARKS: [Suit, number, { seal?: Seal; tr?: Treatment }][] = [
  ['S', 7, { seal: 'dinamita' }],
  ['D', 7, { seal: 'eco' }],
  ['H', 7, { tr: 'policromado' }],
  ['C', 9, { tr: 'forjado' }],
  ['H', 10, { seal: 'jornal' }],
  ['D', 10, { tr: 'templado' }],
  ['S', 1, { seal: 'sindical' }],
  ['C', 4, { tr: 'agrietado' }],
];
const find = (cards: Card[], s: Suit, r: number) => cards.find((c) => !c.sp && c.suit === s && c.rank === r);

function clean(): void {
  document.querySelectorAll('.modal, .lupa, .end:not(.in-page), .toast, .ach-stack, .tip, .ribbon, .banner').forEach((n) => n.remove());
  S.tutorial = null;
  S.session = null;
  S.lobby = null;
  S.shown = null;
  S.queue.length = 0;
  S.selected.length = 0;
  S.screen = null;
}

/** Una campaña a medio camino: cinturón lleno, oro y unas cuantas cartas con sello o tratamiento. */
function baseRun(stage = 1): Run {
  const run = newRun({ seedText: 'QA-DERRUMBE', deck: 'obra', ascension: 2, up: { tienda: 1, rutas: 1 } }, 7);
  runAction(run, { t: 'begin' });
  run.stage = stage;
  run.tools = TOOLKIT.map((id) => ({ id, n: id === 'calibre' ? 4 : 0 }));
  run.gold = 64;
  run.integrity = 16;
  for (const [s, r, m] of MARKS) Object.assign(find(run.deck, s, r) ?? {}, m);
  run.stats.toolUse = { piqueta: 14, gemelos: 9, calibre: 4, dinamita: 11 };
  run.stats.maxHit = 268;
  run.stats.floors = 14;
  run.stats.cleans = 5;
  return run;
}
function show(run: Run, state: GameState | null = null): void {
  clean();
  S.campaign = { run, online: false, state, key: 'qa' };
}

async function mesa(): Promise<void> {
  const run = baseRun(4);
  runAction(run, { t: 'route', i: 0 });
  let state = startStage(run, [{ id: RUN_PLAYER, name: 'TÚ' }]);
  // la mano que se quiere ver: trío de sietes, cartas marcadas, un as, una especial y el comodín
  const p = state.players[0];
  const all = [...p.hand, ...state.deck];
  const hand = [...MARKS.map(([s, r]) => find(all, s, r)), all.find((c) => c.sp), all.find((c) => c.suit === 'X' && !c.sp)].filter((c): c is Card => !!c);
  state.deck = all.filter((c) => !hand.includes(c));
  p.hand = hand;
  // una obra ya empezada: daño, un piso caído, estados y algo de muro
  const hp = state.config.floorHp;
  state.towers.S.damage = Math.floor(hp[state.towers.S.floors[0]] * 0.72);
  state.towers.H.floors.shift();
  state.towers.H.damage = Math.floor(hp[state.towers.H.floors[0]] * 0.35);
  state.towers.D.fx = { fractura: true };
  state.towers.C.fx = { ...state.towers.C.fx, sobrecarga: true };
  state.wall = 3;
  state.integrity = 13;
  state.chain = 1;
  state.turnCount = 6;
  const stashed = find(p.hand, 'C', 4);
  if (stashed) state = applyAction(state, RUN_PLAYER, { type: 'stash', card: stashed.id }).state;
  state.stashed = false;
  show(run, state);
  S.queue.push({ view: viewFor(state, RUN_PLAYER), events: [] });
  setScreen('table');
  await pump();
  document.querySelectorAll('.modal').forEach((m) => m.remove());
  // la previsualización en vivo: el trío de sietes elegido
  S.selected = (['S', 'D', 'H'] as Suit[]).map((s) => find(state.players[0].hand, s, 7)?.id).filter((id): id is string => !!id);
  renderInteractive();
}

/** Da por ganada la obra en curso y deja la campaña en el cobro. */
function winStage(run: Run): void {
  runAction(run, { t: 'route', i: 0 });
  const state = startStage(run, [{ id: RUN_PLAYER, name: 'TÚ' }]);
  for (const s of SUITS) state.towers[s].floors = [];
  state.phase = 'won';
  state.turnCount = 9;
  run.battle.cleans = 2;
  finishBattle(run, state);
}
function toShop(run: Run): void {
  winStage(run);
  runAction(run, { t: 'draft', i: null });
  if (!run.looted) runAction(run, { t: 'loot', id: null });
  run.gold = 64;
}

const STATES: Record<string, () => void | Promise<void>> = {
  portada: () => {
    clean();
    S.campaign = null;
    setScreen('home');
  },
  preparacion: () => {
    clean();
    meta.ascMax = 7;
    setScreen('camp');
  },
  mesa,
  lupa: async () => {
    await mesa();
    openLupa(document.querySelector('#hand .card.z-dinamita') ?? document.querySelector('#hand .card'));
  },
  'lupa-herramienta': async () => {
    await mesa();
    openLupa(document.querySelector('#beltbar .belt-slot.tool'));
  },
  'lupa-piso': async () => {
    await mesa();
    openLupa(document.querySelector('.tower[data-suit="S"] .floor-slot .card'));
  },
  plano: () => {
    show(baseRun(2));
    setScreen('run');
  },
  cobro: () => {
    const run = baseRun(2);
    winStage(run);
    show(run);
    setScreen('run');
  },
  ferreteria: () => {
    const run = baseRun(2);
    toShop(run);
    show(run);
    setScreen('run');
  },
  forja: () => {
    const run = baseRun(2);
    toShop(run);
    // hasta dar con una oferta de forja en el surtido
    for (let i = 0; i < 40 && !run.shop.some((o) => o.kind === 'forja'); i++) {
      run.gold = 99;
      runAction(run, { t: 'reroll' });
    }
    run.gold = 99;
    const at = run.shop.findIndex((o) => o.kind === 'forja');
    if (at >= 0) runAction(run, { t: 'buy', i: at });
    show(run);
    setScreen('run');
  },
  hallazgo: () => {
    const run = baseRun(3);
    toShop(run);
    run.events = ['horno', ...run.events.filter((e) => e !== 'horno')];
    runAction(run, { t: 'next' });
    show(run);
    setScreen('run');
  },
  gremio: () => {
    clean();
    meta.renown = 37;
    for (const a of ACHIEVEMENTS.slice(0, 9)) meta.ach[a.id] = true;
    openGuild('ups');
  },
  coleccion: () => {
    clean();
    meta.seen.tools = TOOLS.slice(0, 30).map((t) => t.id);
    meta.seen.specials = ['barreno', 'martillo', 'palanca', 'grua', 'mordaza', 'bola', 'nitro', 'gemelo'];
    meta.seen.bosses = ['doble', 'blindaje', 'furia'];
    meta.mastery = { tools: { piqueta: 2, gemelos: 5, dinamita: 8, calibre: 1, resonador: 4 }, decks: { obra: 3, acero: 7 } };
    openGuild('col');
  },
  acta: () => {
    const run = baseRun(6);
    run.phase = 'lost';
    run.integrity = 0;
    run.stats.turns = 71;
    run.stats.gold = 143;
    run.stats.contracts = 3;
    show(run);
    setScreen('run');
  },
  ajustes: () => {
    clean();
    S.campaign = null;
    setScreen('home');
    showSettings();
  },
};

export function installQa(): void {
  // nada de esto debe tocar la partida ni el gremio guardados
  platform.save = () => undefined;
  platform.remove = () => undefined;
  document.documentElement.classList.add('qa');
  Object.assign(window, {
    __qa: {
      states: Object.keys(STATES),
      go: async (name: string) => {
        await STATES[name]?.();
        // todo quieto y en su sitio antes de la foto
        document.getAnimations().forEach((a) => {
          try {
            if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
          } catch {
            /* animación sin final */
          }
        });
        return name in STATES;
      },
    },
  });
}
