// Control de calidad visual. Solo se carga si la dirección lleva ?qa: monta a mano, y siempre igual,
// los estados que fotografía scripts/visual-qa.ts (mesa llena, lupa, mapa, Taberna, mesa de lacre…).
// Nada de lo que pasa aquí se guarda: el guardado queda desactivado mientras dura la sesión.
import { ACHIEVEMENTS } from '../rules/achievements';
import type { Autopsy } from '../rules/autopsy';
import { chooseAction } from '../rules/bot';
import { Card, GameState, SUITS, Seal, Suit, TREATMENT, Treatment, applyAction, fatigueAt, viewFor } from '../rules/engine';
import { BOSSES, EVENTS, Run, bossIdentity, finishBattle, newRun, runAction, startStage } from '../rules/run';
import { TUTORIAL_PLAYER, TUTORIAL_STEPS, createTutorial, stepAction } from '../rules/tutorial';
import { TOOLS } from '../rules/tools';
import { hero } from './art';
import { prefs } from './campaign';
import { cardEl } from './card';
import { FULL_TITLE } from '../shared/brand';
import { RUN_PLAYER, S, app } from './core';
import { brandLockup, renderHome } from './home';
import { archive, meta, openGuild } from './guild';
import { openLupa } from './lupa';
import { InputMode, setMode } from './nav';
import { platform } from './platform';
import { setScreen } from './router';
import { renderRun } from './runscreens';
import { pump, renderInteractive, toggleInspector } from './table';
import { monarchGallery, showBark, spotlight } from './guia';
import { coinPieces, crownShardsHost, slashPieces, waxStamp } from './engraving';
import { feedbackShow, showRules, showSettings } from './widgets';
import { clearTelemetry, noteRun, telemetryLog } from './telemetry';

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
/** Todo quieto y en su sitio antes de medir dónde colocar una pieza a mano (las cartas aún entran repartidas). */
const quieto = () =>
  document.getAnimations().forEach((a) => {
    try {
      if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
    } catch {
      /* animación sin final */
    }
  });

function clean(): void {
  document.querySelectorAll('.modal, .lupa, .end:not(.in-page), .toast, .ach-stack, .tip, .ribbon, .banner, body > .pieza, body > .esquirlas').forEach((n) => n.remove());
  S.tutorial = null;
  S.session = null;
  S.lobby = null;
  S.shown = null;
  S.queue.length = 0;
  S.selected.length = 0;
  S.screen = null;
}

/** Una campaña a medio camino: Reliquias llenas, oro y unas cuantas cartas con sello o acabado. */
function baseRun(stage = 1): Run {
  const run = newRun({ seedText: 'QA-CORONA', deck: 'obra', ascension: 2, up: { tienda: 1, rutas: 1 } }, 7);
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
function show(run: Run, state: GameState | null = null, key = 'qa'): void {
  clean();
  S.campaign = { run, online: false, state, key };
}
/** V8: cada mesa con monarca es una campaña nueva para la presentación: su voz de entrada (voces.ts) vuelve a
 *  sonar y el temporizador de la anterior queda anulado, en vez de esconder el bocadillo de la siguiente. */
let monarchRuns = 0;

async function mesa(firstRun = false, input: InputMode = 'pointer', turn = 6, boss: string | null = null): Promise<void> {
  setMode(input);
  // los Susurros solo salen en la primera campaña de un perfil
  meta.runs = firstRun ? 0 : Math.max(1, meta.runs);
  // con monarca, el asalto 5 (La Capilla: Sota, Reina y Rey, como el 4) con ese monarca en el trono
  const run = baseRun(boss ? 5 : 4);
  if (boss) run.bosses[5] = boss;
  runAction(run, { t: 'route', i: 0 });
  let state = startStage(run, [{ id: RUN_PLAYER, name: 'TÚ' }]);
  // la mano que se quiere ver: trío de sietes, cartas marcadas, un as, una especial y el comodín
  const p = state.players[0];
  const all = [...p.hand, ...state.deck];
  const hand = [...MARKS.map(([s, r]) => find(all, s, r)), all.find((c) => c.sp), all.find((c) => c.suit === 'X' && !c.sp)].filter((c): c is Card => !!c);
  state.deck = all.filter((c) => !hand.includes(c));
  p.hand = hand;
  // un asalto ya empezado: daño, un guardia abatido, estados y algo de Escudo
  const hp = state.config.floorHp;
  state.towers.S.damage = Math.floor(hp[state.towers.S.floors[0]] * 0.72);
  state.towers.H.floors.shift();
  state.towers.H.damage = Math.floor(hp[state.towers.H.floors[0]] * 0.35);
  state.towers.D.fx = { fractura: true };
  state.towers.C.fx = { ...state.towers.C.fx, sobrecarga: true };
  state.wall = 3;
  state.integrity = 13;
  state.chain = 1;
  state.turnCount = turn;
  state.fatigue = fatigueAt(state.config, turn);
  const stashed = find(p.hand, 'C', 4);
  if (stashed) state = applyAction(state, RUN_PLAYER, { type: 'stash', card: stashed.id }).state;
  state.stashed = false;
  show(run, state, boss ? `qa-monarca-${++monarchRuns}` : 'qa');
  S.queue.push({ view: viewFor(state, RUN_PLAYER), events: [] });
  setScreen('table');
  await pump();
  document.querySelectorAll('.modal').forEach((m) => m.remove());
  // la previsualización en vivo: el trío de sietes elegido
  S.selected = (['S', 'D', 'H'] as Suit[]).map((s) => find(state.players[0].hand, s, 7)?.id).filter((id): id is string => !!id);
  renderInteractive();
}

/** V7 · la mesa de un asalto con monarca: retrato, placa del decreto, la maldición marcada y su bocadillo de entrada. */
async function mesaMonarca(boss: string): Promise<void> {
  await mesa(false, 'pointer', 6, boss);
  const id = bossIdentity(boss);
  if (id) showBark(id.barks.entrada);
}

/** V7 · la partida guiada en el paso n (0-4), con los pasos anteriores ya jugados y su foco encendido. */
async function guia(step: number): Promise<void> {
  clean();
  setMode('pointer');
  meta.runs = Math.max(1, meta.runs);
  let state = createTutorial();
  for (let i = 0; i < step; i++) {
    const a = stepAction(TUTORIAL_STEPS[i]);
    if (a) state = applyAction(state, TUTORIAL_PLAYER, a).state;
  }
  S.tutorial = { state, step, mode: 'do' };
  S.campaign = null;
  S.queue.push({ view: viewFor(state, TUTORIAL_PLAYER), events: [] });
  setScreen('table');
  await pump();
  document.querySelectorAll('.modal').forEach((m) => m.remove());
  renderInteractive();
  const s = TUTORIAL_STEPS[step];
  spotlight(s.focus, s.line);
}

/** Da por ganado el asalto en curso y deja la campaña en el Botín. */
function winStage(run: Run): void {
  runAction(run, { t: 'route', i: 0 });
  const state = startStage(run, [{ id: RUN_PLAYER, name: 'TÚ' }]);
  for (const s of SUITS) state.towers[s].floors = [];
  state.phase = 'won';
  state.turnCount = 9;
  run.battle.cleans = 2;
  finishBattle(run, state);
}
/**
 * V9: la campaña de la Crónica queda en los datos de prueba (como al llegar a la Crónica de verdad). No borra
 * lo que ya hubiera: la prueba de humo juega de verdad antes de abrir Ajustes y lee luego lo apuntado.
 */
function logged(run: Run): void {
  setMode('pointer');
  noteRun(run);
}

/** La campaña perdida de acta-derrota (y de acta-feedback): causa de la derrota y semilla con enlace. */
function derrota(): Run {
  const run = baseRun(6);
  run.phase = 'lost';
  run.integrity = 0;
  run.stats.turns = 71;
  run.stats.gold = 143;
  run.stats.contracts = 3;
  run.death = { kind: 'sirena', title: 'Contraataque de PICAS: ⚔ 14 contra Escudo 3 → entran 11', detail: 'Te quedaba 9 de Vida. Un ♣ más o un Golpe exacto lo evitaban.', before: 9, threat: 14, blocked: 3, taken: 11, tower: 'S' };
  return run;
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
  // la otra cara de la marca (BLOOD & SUITS con el sello SANGRE Y PALO), sin depender del idioma del navegador
  'portada-en': () => {
    clean();
    S.campaign = null;
    setScreen('home');
    renderHome('en');
  },
  preparacion: () => {
    clean();
    meta.ascMax = 7;
    setScreen('camp');
  },
  mesa: () => mesa(),
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
  // la lupa sobre una carta especial: su banda de nombre y su texto, a tamaño de lectura
  'lupa-especial': async () => {
    await mesa();
    openLupa(document.querySelector('#hand .card.k-special') ?? document.querySelector('#hand .card'));
  },
  // el visor del mazo sobre la mesa: cartas en miniatura, en su versión simplificada
  mazo: async () => {
    await mesa();
    toggleInspector();
  },
  reglas: () => {
    clean();
    S.campaign = null;
    setScreen('home');
    showRules();
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
  // V7: los otros cuatro secretos de la cripta (hallazgo-caja, hallazgo-planos…), para la QA a demanda
  ...Object.fromEntries(
    EVENTS.filter((e) => e.id !== 'horno').map((e) => [
      `hallazgo-${e.id}`,
      () => {
        const run = baseRun(3);
        toShop(run);
        run.events = [e.id, ...run.events.filter((x) => x !== e.id)];
        runAction(run, { t: 'next' });
        show(run);
        setScreen('run');
      },
    ]),
  ),
  gremio: () => {
    clean();
    meta.renown = 37;
    for (const a of ACHIEVEMENTS.slice(0, 9)) meta.ach[a.id] = true;
    openGuild('ups');
  },
  // la pestaña de logros, con la mitad conseguidos: cada logro con su icono
  logros: () => {
    clean();
    meta.renown = 37;
    ACHIEVEMENTS.forEach((a, i) => i % 2 === 0 && (meta.ach[a.id] = true));
    openGuild('ach');
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
    logged(run);
    show(run);
    setScreen('run');
  },
  // V9: con al menos una campaña en los datos de prueba (la de acta-derrota si aún no hay ninguna)
  ajustes: () => {
    setMode('pointer');
    if (!telemetryLog().some((r) => r.modo !== 'guia')) noteRun(derrota());
    clean();
    S.campaign = null;
    setScreen('home');
    showSettings();
  },
  // primera campaña y jugando con teclado: Susurro al margen e indicaciones de tecla
  'mesa-susurro': () => mesa(true, 'keys'),
  // la mesa tal como se ve jugando con mando: cada botón enseña el suyo
  // con mando: insignias de botón en cada acción y el marco de foco sobre la primera carta elegida
  // V8 · A1: el foco va a una carta NO elegida (la que sigue a las elegidas) y lleva data-foco, como lo pone nav.ts
  'mesa-mando': async () => {
    await mesa(false, 'pad');
    const cards = [...document.querySelectorAll<HTMLElement>('#hand > .card')];
    const last = cards.map((c) => c.classList.contains('sel')).lastIndexOf(true);
    const card = cards.slice(last + 1).find((c) => !c.classList.contains('sel')) ?? cards.find((c) => !c.classList.contains('sel'));
    document.querySelectorAll('[data-foco]').forEach((n) => n.removeAttribute('data-foco'));
    card?.setAttribute('data-foco', '');
    card?.focus({ preventScroll: true });
  },
  // un asalto que se alarga: Asedio final de nivel 3, con su Multi y su Ataque de más
  'mesa-fatiga': () => mesa(false, 'pointer', 12),
  archivo: () => {
    clean();
    archive.length = 0;
    const sample = (i: number, won: boolean, stage: number, boss: string | null, tools: string[], seed: string, deck = 'obra', level = 1, death: Autopsy | null = null) => ({
      key: `qa:${i}`,
      when: new Date(Date.UTC(2026, 10, 12 - i, 20, 0)).toISOString(),
      won,
      cleared: won ? 8 : stage - 1,
      stage,
      boss,
      depth: 0,
      turns: won ? 84 : 9 * stage + i,
      maxHit: 120 + 37 * ((i * 5) % 7),
      tools,
      seed,
      deck,
      level,
      daily: null,
      online: false,
      gain: won ? 13 : stage - 1,
      text: `${FULL_TITLE} · Crónica`,
      death,
    });
    archive.push(
      sample(0, true, 8, 'El Verdugo', ['piqueta', 'gemelos', 'calibre', 'ariete', 'bastion', 'resonador'], 'ALBA-7', 'obra', 2),
      sample(1, false, 5, 'El Inquisidor', ['maza', 'sacos', 'contragolpe', 'encofrado'], 'K3QX91', 'obra', 1, {
        kind: 'sirena',
        title: 'Contraataque de TRÉBOLES: ⚔ 18 contra Escudo 4 → entran 14',
        detail: 'Te quedaba 11 de Vida. Un ♣ más o un Golpe exacto lo evitaban.',
        before: 11,
        threat: 18,
        blocked: 4,
        taken: 14,
        tower: 'C',
      }),
      sample(2, false, 7, 'La Reina Helada', ['cincel', 'plomada', 'nivel', 'tiralineas', 'cizalla'], 'PLOMO', 'acero', 3, {
        kind: 'colapso',
        title: 'Mazo agotado: te quitó 4 de Vida y el Escudo no lo frena',
        detail: 'Te quedaba 3 de Vida. Cada vez que se agota el Mazo quita 1 más: cuenta el Mazo antes de robar.',
        before: 3,
        threat: 4,
        blocked: 0,
        taken: 4,
      }),
      sample(3, true, 8, 'El Relojero', ['paleta', 'botiquin', 'rebosadero', 'casco', 'prensa', 'trituradora'], 'Z81MM0', 'ases', 1),
      sample(4, false, 3, 'El Usurero', ['hucha', 'cinta'], '4HH2PA'),
    );
    openGuild('arc');
  },
  // ── arte-ui B: cuenta central, aviso de último turno y crónica con la causa de la derrota ──
  // el recibo paso a paso desplegado (fijado, como tras un toque)
  'mesa-cuenta': async () => {
    await mesa();
    const { pinReceipt } = await import('./cuenta');
    pinReceipt();
  },
  // último turno: el próximo Contraataque puede dejarte sin Vida y la banda de aviso sale junto a la cuenta
  'mesa-peligro': async () => {
    await mesa();
    const state = S.campaign?.state;
    if (!state) return;
    state.integrity = 2;
    state.wall = 0;
    const keep = [...S.selected];
    S.queue.push({ view: viewFor(state, RUN_PLAYER), events: [] });
    await pump();
    S.selected.splice(0, S.selected.length, ...keep);
    renderInteractive();
  },
  // la crónica de una campaña que cayó en la mesa: causa de la derrota, semilla con enlace y botones de lámina
  'acta-derrota': () => {
    const run = derrota();
    logged(run);
    show(run);
    setScreen('run');
  },
  // la crónica de una campaña ganada: sello «Corte vencida», el más ancho, junto a la ficha de la baraja y el Reinado
  'acta-victoria': () => {
    const run = baseRun(8);
    run.phase = 'won';
    run.conquered = true; // como en una partida de verdad: la lámina y la crónica copiada lo leen de aquí
    run.stats.turns = 96;
    run.stats.gold = 188;
    run.stats.contracts = 5;
    logged(run);
    show(run);
    setScreen('run');
  },
  // ── arte-ui V7: partida guiada, monarcas y su maldición ──
  // el foco de los pasos 1 (el poder del palo), 3 (La Manga) y 5 (el Golpe exacto)
  'guia-palo': () => guia(0),
  'guia-manga': () => guia(2),
  'guia-exacto': () => guia(4),
  // un asalto con La Dama del Cáliz: su retrato, la placa «Tus ♥ no curan», el cáliz tachado en cada ♥ y su bocadillo
  'mesa-monarca': () => mesaMonarca('sequia'),
  // el mismo asalto con cada monarca (mesa-monarca-doble, …-escasez…): la QA los corre a demanda
  ...Object.fromEntries(BOSSES.map((b) => [`mesa-monarca-${b.id}`, () => mesaMonarca(b.id)])),
  // ── arte-ui V8: las piezas de la caída, congeladas a mano (sin fx.ts) ──
  // el trono de Diamantes caído con la corona hecha esquirlas, y el guardia de Picas cortado por el tajo
  'mesa-esquirlas': async () => {
    await mesa();
    const state = S.campaign?.state;
    if (!state) return;
    state.towers.D.floors = [];
    const keep = [...S.selected];
    S.queue.push({ view: viewFor(state, RUN_PLAYER), events: [] });
    await pump();
    S.selected.splice(0, S.selected.length, ...keep);
    renderInteractive();
    quieto();
    const rub = document.querySelector<SVGElement>('.tower[data-suit="D"] .rubble');
    if (rub) {
      rub.querySelectorAll<SVGElement>('.crn-l, .crn-r').forEach((h) => (h.style.opacity = '0'));
      const r = rub.getBoundingClientRect();
      const host = crownShardsHost('D');
      const w = r.width * 0.58;
      host.style.cssText = `position:fixed;z-index:56;width:${w}px;left:${r.left + r.width * 0.48 - w / 2}px;top:${r.top + r.height * 0.6 - w * 0.32}px;`;
      document.body.appendChild(host);
      // a media caída: cada esquirla, a un tercio de su vuelo hacia fuera y algo caída, con medio giro
      host.querySelectorAll<SVGElement>('.esquirla').forEach((s, i) => {
        const vx = parseFloat(s.style.getPropertyValue('--vx'));
        const vy = parseFloat(s.style.getPropertyValue('--vy'));
        const k = w * (0.22 + (i % 3) * 0.06);
        s.style.transform = `translate(${(vx * k).toFixed(1)}px, ${(vy * k + w * 0.12).toFixed(1)}px) rotate(${parseFloat(s.style.getPropertyValue('--giro')) * 0.5}deg)`;
      });
    }
    const guard = document.querySelector<HTMLElement>('.tower[data-suit="S"] .floor-slot .card');
    if (guard) {
      const pieces = slashPieces(guard);
      guard.style.visibility = 'hidden';
      const W = guard.getBoundingClientRect().width;
      pieces.forEach((p, i) => {
        const vx = parseFloat(p.style.getPropertyValue('--vx'));
        const vy = parseFloat(p.style.getPropertyValue('--vy'));
        const k = i < 2 ? W * 0.16 : W * 0.3;
        p.style.transform = `translate(${(vx * k).toFixed(1)}px, ${(vy * k).toFixed(1)}px) rotate(${parseFloat(p.style.getPropertyValue('--giro')) * 0.35}deg)`;
        document.body.appendChild(p);
      });
    }
  },
  // las cuatro cartas con acabado, cada una con su banda de brillo a media pasada
  'cartas-lamina': () => {
    clean();
    S.campaign = null;
    setMode('pointer');
    app.innerHTML = '<div class="run"><div class="run-head"><h1>Cartas con lámina</h1></div><div class="qa-laminas"></div></div>';
    const host = app.querySelector('.qa-laminas')!;
    ([['forjado', 'C', 9, 52], ['templado', 'D', 10, 78], ['policromado', 'H', 7, 104], ['agrietado', 'S', 4, 64]] as [Treatment, Suit, number, number][]).forEach(([tr, suit, rank, at]) => {
      const fig = document.createElement('figure');
      const c = cardEl({ id: `lam-${tr}`, suit, rank, tr }, { tilt: false });
      const band = c.querySelector<HTMLElement>('.foil-band');
      band?.style.setProperty('--foil-x', `${at}%`);
      band?.style.setProperty('--foil-o', '0.95');
      fig.append(c);
      fig.insertAdjacentHTML('beforeend', `<figcaption>${TREATMENT[tr].name}</figcaption>`);
      host.appendChild(fig);
    });
  },
  // la Taberna con el oro en vuelo: seis monedas grabadas entre la primera oferta y la bolsa
  'taberna-monedas': async () => {
    await STATES.ferreteria();
    quieto();
    const from = document.querySelector('.run-body.shop .choice')?.getBoundingClientRect();
    const to = document.querySelector('.deck-head .purse b, .purse b')?.getBoundingClientRect();
    if (!from || !to) return;
    const [ax, ay] = [from.left + from.width / 2, from.top + from.height * 0.3];
    const [bx, by] = [to.left + to.width / 2, to.top + to.height / 2];
    coinPieces(6).forEach((c, i) => {
      const t = 0.2 + i * 0.13;
      const x = ax + (bx - ax) * t;
      const y = Math.max(28, ay + (by - ay) * t - Math.sin(Math.PI * t) * Math.min(110, Math.abs(bx - ax) * 0.3));
      c.style.setProperty('--x', `${x.toFixed(1)}px`);
      c.style.setProperty('--y', `${y.toFixed(1)}px`);
      document.body.appendChild(c);
    });
  },
  // un sello de pólvora recién estampado (caliente) sobre la carta que entra en la cuenta, y uno de eco ya frío
  'mesa-lacre': async () => {
    await mesa();
    const put = (sel: string, seal: Seal, hot: boolean) => {
      const card = document.querySelector<HTMLElement>(sel);
      if (!card) return;
      const s = waxStamp(seal);
      s.classList.toggle('caliente', hot);
      card.appendChild(s);
    };
    put('#hand .card.z-dinamita', 'dinamita', true);
    put('#hand .card.z-eco', 'eco', false);
  },
  // los siete retratos, en calma y vencidos, con la placa de su decreto
  monarcas: () => {
    clean();
    S.campaign = null;
    app.innerHTML = `<div class="run monarcas-qa"><div class="run-head"><h1>Los siete monarcas</h1></div>${monarchGallery()}</div>`;
  },
  // ── arte-ui V9: Feedback de prueba y foco del mando en La Taberna ──
  // la Crónica de una derrota con el botón «Enviar Crónica / Feedback de Prueba» ya pulsado y su confirmación
  // (se pinta la respuesta «copiado» sin llamar a shareFeedback: la QA visual no comparte ni descarga nada)
  'acta-feedback': () => {
    setMode('pointer');
    const run = derrota();
    logged(run);
    show(run);
    setScreen('run');
    feedbackShow(app, 'copiado');
    // en el móvil el bloque queda bajo la tabla: la hoja se desplaza hasta él, como tras pulsarlo
    app.querySelector('.fb')?.scrollIntoView({ block: 'center' });
  },
  // Ajustes con la fila «Datos de prueba» y dos campañas guardadas (una derrota y una victoria)
  'ajustes-prueba': () => {
    setMode('pointer');
    clearTelemetry();
    const lost = derrota();
    lost.id = 9101;
    noteRun(lost);
    const won = baseRun(8);
    won.id = 9102;
    won.seedText = 'QA-VICTORIA';
    won.phase = 'won';
    won.conquered = true;
    won.stats.turns = 96;
    noteRun(won);
    clean();
    S.campaign = null;
    setScreen('home');
    showSettings();
  },
  // V8-3 · La Taberna jugando con mando: el marco de foco (.focus-ring) y data-foco sobre la primera oferta
  'ferreteria-mando': async () => {
    await STATES.ferreteria();
    setMode('pad');
    quieto();
    const offer = document.querySelector<HTMLElement>('.run-body.shop .choice.pick');
    document.querySelectorAll('[data-foco]').forEach((n) => n.removeAttribute('data-foco'));
    (document.activeElement as HTMLElement | null)?.blur?.();
    offer?.focus({ preventScroll: true });
  },
  // tarjeta para compartir (1200 × 630): la fotografía scripts/og-card.ts
  og: () => {
    clean();
    S.campaign = null;
    // siempre la cara española: es la que enseña el enlace (index.html va en español)
    app.innerHTML = `<div class="og-card">${hero()}<div class="og-txt">${brandLockup('es')}<small>Cuatro tronos · doce guardias · tu Vida · de 1 a 4 jugadores</small></div><div class="og-cards"></div></div>`;
    const fan = app.querySelector('.og-cards')!;
    ([['S', 13], ['D', 12], ['H', 11], ['C', 13]] as [Suit, number][]).forEach(([suit, rank], i) => {
      const c = cardEl({ id: `og-${suit}`, suit, rank }, { tilt: false });
      c.style.setProperty('--r', `${(i - 1.5) * 9}deg`);
      c.style.setProperty('--y', `${Math.abs(i - 1.5) * 16}px`);
      fan.appendChild(c);
    });
  },
};

export function installQa(): void {
  // nada de esto debe tocar la partida ni la Orden guardadas: el guardado pasa a ser de quita y pon
  const memory = new Map<string, string>();
  platform.load = (key) => memory.get(key) ?? null;
  platform.save = (key, value) => void memory.set(key, value);
  platform.remove = (key) => void memory.delete(key);
  platform.keys = (prefix) => [...memory.keys()].filter((k) => k.startsWith(prefix));
  document.documentElement.classList.add('qa');
  const settle = () =>
    document.getAnimations().forEach((a) => {
      try {
        if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
      } catch {
        /* animación sin final */
      }
    });
  Object.assign(window, {
    __qa: {
      states: Object.keys(STATES),
      go: async (name: string) => {
        await STATES[name]?.();
        settle(); // todo quieto y en su sitio antes de la foto
        return name in STATES;
      },
      settle,
      /** Semilla de la próxima campaña (el mando no escribe). */
      seed: (text: string) => void (prefs.seed = text),
      /** Lo que el bot de referencia haría ahora en el asalto en curso (la prueba lo ejecuta con el mando). */
      bot: () => (S.campaign?.state && S.campaign.state.phase === 'playing' ? chooseAction(S.campaign.state) : null),
      /** Resumen de la campaña en curso, para comprobar lo que hizo el mando. */
      run: () => {
        const run = S.campaign?.run;
        return run ? { phase: run.phase, stage: run.stage, gold: run.gold, tools: run.tools.map((t) => t.id), marks: run.deck.filter((c) => c.seal || c.tr).length, pending: run.pending?.kind ?? null, shop: run.shop.map((o) => o.kind) } : null;
      },
      /** En la Taberna: oro de sobra y dos reliquias, para probar las Reliquias y la Mesa de lacre sin depender del azar. */
      boost: () => {
        const run = S.campaign?.run;
        if (!run) return false;
        run.gold = 60;
        for (const id of ['piqueta', 'gemelos']) if (run.tools.length < 2 && !run.tools.some((t) => t.id === id)) run.tools.push({ id, n: 0 });
        renderRun();
        return true;
      },
    },
  });
}
