// Control de calidad visual. Solo se carga si la dirección lleva ?qa: monta a mano, y siempre igual,
// los estados que fotografía scripts/visual-qa.ts (mesa llena, lupa, mapa, Taberna, mesa de lacre…).
// Nada de lo que pasa aquí se guarda: el guardado queda desactivado mientras dura la sesión.
import { ACHIEVEMENTS } from '../rules/achievements';
import type { Autopsy } from '../rules/autopsy';
import { chooseAction } from '../rules/bot';
import { CABALLO, Card, GameState, MAX_NUM, REY, SOTA, SUITS, Seal, Suit, TREATMENT, Treatment, applyAction, fatigueAt, ordenDe, previewStrike, viewFor } from '../rules/engine';
import { BOSSES, EVENTS, Run, bossIdentity, finishBattle, newRun, runAction, startStage, tomaBendicion } from '../rules/run';
import { agregaTramo, asaltoDe, type TipoNodo } from '../rules/mapa';
import { BENDICION, PALO_DE_REY, REY_IDS, type ReyId, bendicionesDe, esRey, fraseRey, ofertaBendiciones, reyesEnOferta } from '../rules/reyes';
import { TOOLS, placeTool } from '../rules/tools';
import { hero } from './art';
import { prefs } from './campaign';
import { cardEl } from './card';
import { FULL_TITLE } from '../shared/brand';
import { RUN_PLAYER, S, app, applySettings, settings } from './core';
import { getLang, isLang, setLang, t } from '../shared/i18n';
import { L, acabN } from './lengua';
import { brandLockup, renderHome } from './home';
import { archive, meta, openGuild, qaCobro } from './guild';
import { arbolVista, vistaNueva } from './arbol';
import { colocarCaida, recogerCaida } from './caida';
import { pintarRitual, ritualNuevo } from './ritual';
import type { Pieza } from '../rules/caida';
import { conmutaAuto, refreshSpeed, renderHud, usarMejor } from './table';
import { congelaAuto } from './auto'; // juice-ux: AUTO encendido a la vista sin jugar (mesa-auto)

import { openLupa } from './lupa';
import { InputMode, moveFocus, setMode } from './nav';
import { platform } from './platform';
import { setScreen } from './router';
import { renderRun } from './runscreens';
import { pump, renderInteractive, toggleInspector } from './table';
import { hideBark, monarchGallery, showBark } from './guia';
import { bufonSays } from './whispers';
import type { ConsejoBufon } from '../rules/bufon';
import { coinPieces, crownShardsHost, slashPieces, waxStamp } from './engraving';
import { feedbackShow, showRules, showSettings } from './widgets';
import { clearTelemetry, noteRun, telemetryLog } from './telemetry';

// V40 1d: tres de Espadas (el Rey de la Bendición que toma la QA, Remate) y dos de Bastos; sin la Piedra ni el Facón,
// que llenan la mano de coronas de Golpe exacto
const TOOLKIT = ['piqueta', 'cincel', 'cizalla', 'sacos', 'encofrado'];
const MARKS: [Suit, number, { seal?: Seal; tr?: Treatment }][] = [
  ['S', 7, { seal: 'dinamita' }],
  ['D', 7, { seal: 'eco' }],
  ['H', 7, { tr: 'policromado' }],
  ['C', 9, { tr: 'forjado' }],
  ['H', 9, { seal: 'jornal' }],
  ['D', 8, { tr: 'templado' }],
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

/** V12: el perfil de partida (rangos del Árbol y saldo): cada estado lo recupera, así los del Árbol no tocan a los demás. */
let perfil0: { up: Record<string, number>; renown: number } | null = null;
function clean(): void {
  perfil0 ??= { up: { ...meta.up }, renown: meta.renown };
  meta.up = { ...perfil0.up };
  meta.renown = perfil0.renown;
  delete meta.aviso;
  vistaNueva();
  // V12: AUTO apagado y la velocidad de serie en cada estado; sin piezas en la mesa
  settings.auto = false;
  settings.speed = 1;
  settings.autoSaquear = false;
  settings.autoTaberna = false;
  recogerCaida();
  ritualNuevo();
  document.querySelectorAll('.modal, .lupa, .end:not(.in-page), .toast, .ach-stack, .tip, .ribbon, .banner, body > .pieza, body > .esquirlas').forEach((n) => n.remove());
  S.session = null;
  S.lobby = null;
  S.shown = null;
  S.queue.length = 0;
  S.selected.length = 0;
  S.screen = null;
  // cada estado parte de la paleta y el contraste de serie (mesa-contraste, mesa-2tintas y mesa-clasica los cambian)
  if (settings.contrast || settings.paleta !== 'cuatro') {
    settings.contrast = false;
    settings.paleta = 'cuatro';
    applySettings();
  }
}

/** Una campaña a medio camino: Reliquias llenas, oro y unas cuantas cartas con sello o acabado. */
function baseRun(stage = 1): Run {
  const run = newRun({ seedText: 'QA-CORONA', deck: 'escoba', ascension: 2, up: { tienda: 1, rutas: 1 } }, 7);
  runAction(run, { t: 'begin' });
  // V40 1c · la campaña empieza con la oferta de los Reyes: la QA se queda con la primera
  if (run.phase === 'bendicion') runAction(run, { t: 'bendicion', i: 0 });
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
/** V40 1e · Pone la campaña en el Mapa justo antes del nodo `id` (en uno que lleva a él) y entra en él. */
function alNodo(run: Run, id: number): void {
  const m = run.mapa;
  const previo = m.nodos.find((n) => n.hacia.includes(id));
  m.en = previo ? previo.id : -1;
  m.hechos = m.nodos.filter((n) => n.fila < (m.nodos[id]?.fila ?? 0) && (n.asalto || n.id === previo?.id)).map((n) => n.id);
  run.phase = 'map';
  runAction(run, { t: 'ir', nodo: id });
}
/** V40 1e · Entra al asalto de `run.stage` desde el Mapa. */
function alAsalto(run: Run): void {
  // en el Trono infinito, el Mapa crece hasta el asalto pedido
  for (let t = Math.max(...run.mapa.nodos.map((n) => n.tramo)) + 1; t <= run.stage; t++) agregaTramo(run.mapa, run.id, t, true);
  const a = asaltoDe(run.mapa, run.stage);
  if (a) alNodo(run, a.id);
}
/** V40 1e · Entra a un nodo del tipo pedido en el tramo de `run.stage` (si el tramo no lo tiene, la QA lo pone en la fila A). */
function alTipo(run: Run, tipo: TipoNodo): void {
  const tramo = run.mapa.nodos.filter((n) => n.tramo === run.stage && !n.asalto);
  const n = tramo.find((x) => x.tipo === tipo) ?? tramo[0];
  if (!n) return;
  n.tipo = tipo;
  alNodo(run, n.id);
}
/** V40 1e · Cobra el oro del Botín, salta el resto y vuelve al Mapa (tramo siguiente). */
function cierraBotin(run: Run): void {
  run.botin.forEach((r, i) => runAction(run, r.k === 'oro' ? { t: 'cobrar', i } : { t: 'saltar', i }));
  runAction(run, { t: 'seguir' });
}
function show(run: Run, state: GameState | null = null, key = 'qa'): void {
  clean();
  S.campaign = { run, online: false, state, key };
}
/** V8: cada mesa con monarca es una campaña nueva para la presentación: su voz de entrada (voces.ts) vuelve a
 *  sonar y el temporizador de la anterior queda anulado, en vez de esconder el bocadillo de la siguiente. */
let monarchRuns = 0;

async function mesa(firstRun = false, input: InputMode = 'pointer', turn = 6, boss: string | null = null, stage = 0, depth = 0): Promise<void> {
  setMode(input);
  // los Susurros solo salen en la primera campaña de un perfil
  meta.runs = firstRun ? 0 : Math.max(1, meta.runs);
  // V11: la mesa de siempre es el asalto 4 (La Galería real: cuatro tronos con Sota, Reina y Rey); con monarca,
  // ese monarca en su trono. Con `stage` 1 o 2, la mesa corta de dos o tres tronos (los ausentes no se pintan).
  const at = depth ? 5 + depth : stage || 4;
  const run = baseRun(at);
  // V12: el Trono infinito (mesa-cifras): la campaña ya ganada y abierta hacia abajo
  if (depth) run.endless = true;
  if (boss) run.bosses[at] = boss;
  alAsalto(run);
  let state = startStage(run, [{ id: RUN_PLAYER, name: 'Tú' }]);
  // V40 1d: la Manga de dos huecos que daba la Pasarela (retirada); las medidas de la mesa de la QA son con ella
  state.config.reserveSize = 2;
  // la mano que se quiere ver: trío de sietes, cartas marcadas, un as, una especial y el comodín
  const p = state.players[0];
  const all = [...p.hand, ...state.deck];
  const hand = [...MARKS.map(([s, r]) => find(all, s, r)), all.find((c) => c.sp), all.find((c) => c.suit === 'X' && !c.sp)].filter((c): c is Card => !!c);
  state.deck = all.filter((c) => !hand.includes(c));
  p.hand = hand;
  // un asalto ya empezado: daño, un guardia abatido, estados y algo de Escudo
  const hp = state.config.floorHp;
  // V35 · un enemigo a la vez: la Casa activa ya perdió a su Sota y su Reina va tocada; la fila, entera
  const [a, b] = ordenDe(state.config).filter((s) => !state.towers[s].away);
  if (state.towers[a].floors.length > 1) state.towers[a].floors.shift();
  state.towers[a].damage = Math.floor(hp[state.towers[a].floors[0]] * 0.35);
  // un diamante salpicó a la siguiente Casa
  if (b) state.towers[b].damage = Math.floor(hp[state.towers[b].floors[0]] * 0.12);
  // los dos estados de la V11: Expuesto y Aturdido, en el enemigo que tenés delante
  state.towers[a].fx = { fractura: true, sobrecarga: true };
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
  // V12 · la voz de entrada del monarca del asalto 4 sale en cuanto se quitan las ventanas y dura 2,5 s: la foto la
  // pillaba o no según lo que tardase (qa:determinista). Fuera de las mesas que la enseñan a propósito
  if (!boss) {
    await new Promise((ok) => setTimeout(ok, 160));
    hideBark();
  }
  // la previsualización en vivo: el trío de sietes elegido
  S.selected = (['S', 'D', 'H'] as Suit[]).map((s) => find(state.players[0].hand, s, 7)?.id).filter((id): id is string => !!id);
  renderInteractive();
}

/** V11: apunta a un trono como lo hace el puntero (la cuenta y el trono apuntado siguen al foco). */
function apunta(s: Suit): void {
  const t = document.querySelector<HTMLElement>(`.tower[data-suit="${s}"]`);
  t?.dispatchEvent(new PointerEvent('pointerenter'));
}

/** V7 · la mesa de un asalto con monarca: retrato, placa del decreto, la maldición marcada y su bocadillo de entrada. */
async function mesaMonarca(boss: string): Promise<void> {
  await mesa(false, 'pointer', 6, boss);
  const id = bossIdentity(boss);
  if (id) showBark(esRey(boss) ? t(fraseRey(S.campaign?.run.bendiciones, boss)) : id.barks.entrada);
}

/**
 * V40 1c · un Rey jefe al frente: las otras Casas ya cayeron, el Rey va tocado, su Furia lleva dos turnos subiendo y
 * su frase de entrada (según las Bendiciones que llevás) a la vista.
 */
async function mesaRey(rey: ReyId): Promise<void> {
  await mesa(false, 'pointer', 6, rey);
  const st = S.campaign?.state;
  if (!st) return;
  const palo = PALO_DE_REY[rey];
  for (const s of SUITS) if (s !== palo) st.towers[s].floors = [];
  const tr = st.towers[palo];
  tr.floors = [REY];
  tr.damage = Math.floor(st.config.floorHp[REY] * 0.3);
  tr.fx = {};
  st.furiaRey = 2 * (st.config.jefe?.furia ?? 0);
  if (rey === 'oros') st.dado = 4;
  S.queue.push({ view: viewFor(st, RUN_PLAYER), events: [] });
  await pump();
  S.selected.length = 0;
  renderInteractive();
  showBark(t(fraseRey(S.campaign?.run.bendiciones, rey)));
}

/** V40 1c · la oferta de los Reyes antes del asalto 3: ya llevás una de Espadas y una de Oros (puede salir su Dual). */
function bendicion(): void {
  const run = baseRun(3);
  for (const rey of ['espadas', 'oros'] as ReyId[]) {
    const b = bendicionesDe(rey).find((d) => !run.bendiciones.some((x) => x.id === d.id));
    if (b && !run.bendiciones.some((x) => BENDICION[x.id]?.rey === rey)) tomaBendicion(run, b.id);
  }
  run.bendiciones[0].n = 3;
  run.phase = 'bendicion';
  run.ofertaDe = run.stage;
  run.oferta = ofertaBendiciones(run.id, run.stage, run.bendiciones, reyesEnOferta(false));
  show(run);
  setScreen('run');
}

/** V40 · la mesa de la primera campaña con la frase n del Bufón (palo, cuenta o Golpe exacto) a la vista. */
async function bufonEn(id: ConsejoBufon): Promise<void> {
  await STATES.mesa();
  document.querySelector('.whisper')?.remove();
  bufonSays(id);
}

/** Da por ganado el asalto en curso y deja la campaña en el Botín. */
/** V12: el Botín de un asalto ganado con lo que cayó en él y la tirada pintada en su fase final. */
function huesos(dos: boolean): void {
  const run = baseRun(2);
  if (dos) run.up = { ...run.up, hueso_tallado: 1, cara_rey: 1, segundo_hueso: 1 };
  alAsalto(run);
  const state = startStage(run, [{ id: RUN_PLAYER, name: 'Tú' }]);
  run.caida = { oro: 12, esquirlas: 140, gotas: 1 };
  for (const s of SUITS) state.towers[s].floors = [];
  state.phase = 'won';
  state.turnCount = 9;
  finishBattle(run, state);
  show(run);
  setScreen('run');
  ritualNuevo();
  if (run.ritual) pintarRitual(run.ritual, 'final');
}

function winStage(run: Run): void {
  alAsalto(run);
  const state = startStage(run, [{ id: RUN_PLAYER, name: 'Tú' }]);
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

/** V33: la Crónica de prueba cobra como una de verdad (100 por asalto superado y lo recogido en la mesa) y el perfil queda con eso. */
function cobra(n: number): void {
  qaCobro(n);
  meta.renown = n;
}

/** La campaña perdida de acta-derrota (y de acta-feedback): causa de la derrota y semilla con enlace. */
function derrota(): Run {
  const run = baseRun(4);
  run.phase = 'lost';
  run.integrity = 0;
  run.stats.turns = 41;
  run.stats.gold = 103;
  run.stats.contracts = 2;
  run.death = { kind: 'sirena', title: 'Contraataque de ESPADAS: ⚔ 14 contra Escudo 3 → entran 11', detail: 'Te quedaban 9 de Vida. Faltaron 2 de Escudo (Bastos); un Golpe exacto también lo paraba.', before: 9, threat: 14, blocked: 3, taken: 11, tower: 'S' };
  return run;
}

/** V12: el Árbol con rangos comprados en las cuatro ramas y 12.345 esquirlas. */
function arbol(): void {
  clean();
  setMode('pointer');
  meta.renown = 12345;
  for (const a of ACHIEVEMENTS.slice(0, 9)) meta.ach[a.id] = true;
  meta.up = { ...meta.up, caja: 2, vale: 1, tienda: 2, tasador: 1, caja_espadas: 1, caja_bastos: 1, tampones: 1, piedra_iman: 1, esq_golpe: 3, esq_guardia: 2, esq_monarca: 1, esq_derrota: 1, hueso_tallado: 2, cara_rey: 1, corona_hierro: 1, pendon: 1 };
  openGuild('ups');
}

function toShop(run: Run): void {
  winStage(run);
  cierraBotin(run);
  alTipo(run, 'pulperia');
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
  // V10: el interruptor ES | EN junto al candado, con el foco de teclado en el idioma que no está puesto
  'portada-idioma': () => {
    clean();
    S.campaign = null;
    setScreen('home');
    setMode('keys');
    document.querySelector<HTMLElement>(`#home-lang [data-lang="${getLang() === 'es' ? 'en' : 'es'}"]`)?.focus();
  },
  // V10: Alto contraste puesto, para comparar sus cajas con las de mesa (regla «contraste-alto»)
  'mesa-contraste': async () => {
    await mesa();
    settings.contrast = true;
    applySettings();
  },
  // V10: las 2 tintas clásicas (rojo y negro): las tramas siguen distinguiendo el palo
  'mesa-2tintas': async () => {
    await mesa();
    settings.paleta = 'dos';
    applySettings();
  },
  // V11: la paleta clásica de la 10.0 (con el ocre de Diamantes), opción de Ajustes
  'mesa-clasica': async () => {
    await mesa();
    settings.paleta = 'clasica';
    applySettings();
  },
  // V11: el asalto 1 (dos tronos) y el 2 (tres tronos, con monarca): la fila se reparte entre los que hay
  'mesa-2tronos': () => mesa(false, 'pointer', 4, null, 1),
  'mesa-3tronos': () => mesa(false, 'pointer', 4, null, 2),
  // V12: la mesa de dos tronos con el 7♠ del sello de pólvora elegido contra el enemigo activo: la vista previa
  // enseña «+n» en la Casa de al lado (vecinosPresentes) y la cuenta, «Pólvora +n al lado»
  'mesa-polvora': async () => {
    await mesa(false, 'pointer', 4, null, 1);
    const state = S.campaign?.state;
    if (!state) return;
    const siete = find(state.players[0].hand, 'S', 7);
    S.selected.splice(0, S.selected.length, ...(siete ? [siete.id] : []));
    renderInteractive();
    // V35 · se golpea al enemigo activo; la pólvora salpica a la Casa que viene después
    const frente = ordenDe(state.config).find((x) => !state.towers[x].away && state.towers[x].floors.length);
    if (frente) apunta(frente);
  },
  // V12: el Trono infinito hondo (Trono infinito 18): Vida de los guardias de seis cifras, un Golpe de cuatro con
  // una Racha de 8 Golpes exactos y los tronos Expuestos, y 1.234 de oro: todo en notación compacta (regla «compacto»)
  'mesa-cifras': async () => {
    await mesa(false, 'pointer', 6, null, 0, 18);
    const c = S.campaign;
    const state = c?.state;
    if (!c || !state) return;
    c.run.gold = 1234;
    state.chain = 8;
    // V40 1d: sin los multiplicadores de antes en la tira, una carga de Daño lleva el golpe a 4 cifras
    state.charge = 200;
    for (const x of SUITS) if (!state.towers[x].away) state.towers[x].fx = { fractura: true };
    const keep = [...S.selected];
    S.queue.push({ view: viewFor(state, RUN_PLAYER), events: [] });
    await pump();
    S.selected.splice(0, S.selected.length, ...keep);
    renderInteractive();
  },
  // V11: los dos estados a la vista, sin jugada elegida: un trono Expuesto y otro Aturdido
  'mesa-estados': async () => {
    await mesa();
    S.selected.length = 0;
    renderInteractive();
  },
  // V11: cartas del palo del trono apuntado (V35: el trío de sietes contra el enemigo activo, Corazones): placa
  // Inmune en el enemigo y, con la cuenta abierta, la línea «Inmune · 0» del 7♥
  'mesa-inmune': async () => {
    await mesa();
    const { pinReceipt } = await import('./cuenta');
    pinReceipt();
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
  // V11: el Mapa de cinco asaltos en el asalto 2: los palos de los asaltos 1 y 2 a la vista y el Rey Tirano en el 5
  plano: () => {
    show(baseRun(2));
    setScreen('run');
  },
  // V40 1e · el Mapa de caminos en el tramo 3: el asalto 2 hecho, la fila A alcanzable y la B y el asalto 3 por delante
  'mapa-ramas': () => {
    const run = baseRun(2);
    winStage(run);
    cierraBotin(run);
    show(run);
    setScreen('run');
  },
  // V40 1e · el Botín de un asalto de Rey: el oro ya cobrado, la «Elegí una» de Bendición, la de Trampa y el Cofre
  botin: () => {
    const run = baseRun(2);
    winStage(run);
    const oro = run.botin.findIndex((r) => r.k === 'oro');
    if (oro >= 0) runAction(run, { t: 'cobrar', i: oro });
    show(run);
    setScreen('run');
    ritualNuevo();
  },
  // V40 1e · la «Elegí una» abierta (la de Trampa o carta), con Saltar y Volver al Botín
  'elegi-una': () => {
    const run = baseRun(2);
    winStage(run);
    const i = run.botin.findIndex((r) => r.k === 'elegi' && r.tipo === 'trampa');
    if (i >= 0) runAction(run, { t: 'cobrar', i });
    show(run);
    setScreen('run');
    ritualNuevo();
  },
  // V40 1e · La Pulpería con sus servicios: Purgar ya usado una vez (su precio subió) y Curar a la vista
  'pulperia-servicios': () => {
    const run = baseRun(2);
    toShop(run);
    run.integrity = 11;
    const carta = run.deck.find((c) => !c.sp && c.suit !== 'X');
    if (carta) runAction(run, { t: 'burn', card: carta.id });
    run.gold = 64;
    show(run);
    setScreen('run');
  },
  // V40 1e · el Fogón: Curar o Purgar gratis
  fogon: () => {
    const run = baseRun(2);
    winStage(run);
    cierraBotin(run);
    run.up = { ...run.up, rutas: 0 };
    run.integrity = 10;
    alTipo(run, 'fogon');
    show(run);
    setScreen('run');
  },
  cobro: () => {
    const run = baseRun(2);
    winStage(run);
    show(run);
    setScreen('run');
    ritualNuevo(); // el Botín sin la tirada encima (la tirada tiene sus estados)
  },
  // V12 · la tirada de huesos del Botín, ya tirada: el Dado de oro y uno de la Corona
  ritual: () => huesos(false),
  // con Segundo hueso: dos Dados de la Corona (sus caras se multiplican)
  'ritual-dos': () => huesos(true),
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
  // V29 · la primera pantalla de una campaña nueva: el Sobre con sus tres cartas y el Don de la Conjura
  don: () => {
    show(newRun({ seedText: 'QA-CORONA', deck: 'escoba', ascension: 0 }, 7));
    setScreen('run');
  },
  hallazgo: () => {
    const run = baseRun(2);
    toShop(run);
    run.events = ['horno', ...run.events.filter((e) => e !== 'horno')];
    runAction(run, { t: 'next' });
    alTipo(run, 'santuario');
    show(run);
    setScreen('run');
  },
  // V7: los otros cuatro secretos de la cripta (hallazgo-caja, hallazgo-planos…), para la QA a demanda
  ...Object.fromEntries(
    EVENTS.filter((e) => e.id !== 'horno').map((e) => [
      `hallazgo-${e.id}`,
      () => {
        const run = baseRun(2);
        toShop(run);
        run.events = [e.id, ...run.events.filter((x) => x !== e.id)];
        runAction(run, { t: 'next' });
        alTipo(run, 'santuario');
        show(run);
        setScreen('run');
      },
    ]),
  ),
  // V12: el Árbol de la Conjura a zum de serie, con rangos en las cuatro ramas y un saldo de cinco cifras
  gremio: () => arbol(),
  // el Árbol ampliado hasta las tarjetas completas sobre la Bolsa, con un nodo enfocado con teclado
  'arbol-zoom': () => {
    arbol();
    setMode('keys');
    arbolVista.detalle('esq_guardia');
    const n = document.querySelector<HTMLElement>('.nodo[data-nodo="esq_guardia"]');
    n?.setAttribute('data-foco', '');
    n?.focus({ preventScroll: true });
  },
  // el aviso de la migración de la 11.0: 37 Coronas son ahora 3.700 esquirlas y 9 mejoras siguen en el Arsenal
  'arbol-aviso': () => {
    clean();
    meta.renown = 3700;
    meta.up = { ...meta.up, caja: 2, vale: 1, tienda: 1, rutas: 1, tampones: 1, caja_espadas: 1, caja_bastos: 1, bronce: 1 };
    meta.aviso = { id: 'arbol-v12', coronas: 37, esquirlas: 3700, rangos: 9 };
    setMode('pointer');
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
    meta.seen.specials = ['barreno', 'sierra', 'pico', 'grua', 'mordaza', 'bola', 'nitro', 'gemelo'];
    meta.seen.bosses = ['espadas', 'bastos', 'oros'];
    meta.mastery = { tools: { piqueta: 2, gemelos: 5, dinamita: 8, calibre: 1, cinta: 4 }, decks: { escoba: 3, truco: 7 } };
    openGuild('col');
  },
  acta: () => {
    const run = baseRun(4);
    run.phase = 'lost';
    run.integrity = 0;
    run.stats.turns = 41;
    run.stats.gold = 103;
    run.stats.contracts = 2;
    logged(run);
    show(run);
    cobra(340);
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
  // un asalto que se alarga: V35 · el Mazo agotado dos veces, la Furia a +4 junto al Ataque del enemigo
  'mesa-fatiga': async () => {
    await mesa(false, 'pointer', 12);
    const state = S.campaign?.state;
    if (!state) return;
    state.fatigue = 2 * state.config.collapseSiege;
    const keep = [...S.selected];
    S.queue.push({ view: viewFor(state, RUN_PLAYER), events: [] });
    await pump();
    S.selected.splice(0, S.selected.length, ...keep);
    renderInteractive();
  },
  // V11: Ajustes con la fila «Colores de la baraja» enfocada (Cuatro colores, Clásica o Dos tintas)
  // V12 · Auto-saquear encendido y Auto-taberna apagado, cada uno con su línea
  'ajustes-auto': () => {
    clean();
    S.campaign = null;
    setMode('keys');
    setScreen('home');
    settings.autoSaquear = true;
    settings.autoTaberna = false;
    showSettings();
    const row = document.querySelector<HTMLElement>('#set-toggles .set-auto-saquear');
    row?.scrollIntoView({ block: 'center' });
    row?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  },
  'ajustes-paleta': () => {
    clean();
    S.campaign = null;
    setMode('keys');
    setScreen('home');
    showSettings();
    const row = document.querySelector<HTMLElement>('#set-toggles .set-tintas');
    row?.scrollIntoView({ block: 'center' });
    row?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  },
  archivo: () => {
    clean();
    archive.length = 0;
    // V11: las actas nuevas llevan `de` (5 asaltos); la última es de la 10.0, sin `de`: «asalto 7 de 8», sin sala
    const sample = (i: number, won: boolean, stage: number, boss: string | null, tools: string[], seed: string, deck = 'escoba', level = 1, death: Autopsy | null = null, de: number | undefined = 5) => ({
      key: `qa:${i}`,
      when: new Date(Date.UTC(2026, 10, 12 - i, 20, 0)).toISOString(),
      won,
      de,
      cleared: won ? (de ?? 8) : stage - 1,
      stage,
      boss,
      depth: 0,
      turns: won ? 48 : 9 * stage + i,
      maxHit: 120 + 37 * ((i * 5) % 7),
      tools,
      seed,
      deck,
      level,
      online: false,
      gain: won ? 13 : stage - 1,
      text: `${FULL_TITLE} · Crónica`,
      death,
    });
    archive.push(
      sample(0, true, 5, 'El Rey de Espadas', ['piqueta', 'gemelos', 'calibre', 'contragolpe', 'sacos', 'dinamita'], 'ALBA-7', 'escoba', 2),
      sample(1, false, 4, 'El Rey de Bastos', ['maza', 'sacos', 'contragolpe', 'encofrado'], 'K3QX91', 'chinchon', 1, {
        kind: 'sirena',
        title: 'Contraataque de BASTOS: ⚔ 18 contra Escudo 4 → entran 14',
        detail: 'Te quedaban 11 de Vida. Faltaron 3 de Escudo (Bastos); un Golpe exacto también lo paraba.',
        before: 11,
        threat: 18,
        blocked: 4,
        taken: 14,
        tower: 'C',
      }),
      sample(2, false, 5, 'El Rey de Copas', ['cincel', 'calibre', 'cizalla', 'plano_maestro'], 'PLOMO', 'truco', 3, {
        kind: 'colapso',
        title: 'Mazo agotado: te quitó 4 de Vida y el Escudo no lo frena',
        detail: 'Te quedaba 3 de Vida. Cada vez que se agota el Mazo quita 1 más: cuenta el Mazo antes de robar.',
        before: 3,
        threat: 4,
        blocked: 0,
        taken: 4,
      }),
      sample(3, true, 5, 'El Rey de Oros', ['paleta', 'botiquin', 'casco', 'cinta', 'ultimo', 'andamio'], 'Z81MM0', 'mentiroso', 1),
      sample(4, false, 7, 'El Rey de Oros', ['hucha', 'cinta'], '4HH2PA', 'chancho', 1, null, undefined),
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
    // V35 · un enemigo Aturdido no contraataca: aquí el que tenés delante está despierto
    for (const s of SUITS) delete state.towers[s].fx.sobrecarga;
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
    cobra(340);
    setScreen('run');
  },
  // la crónica de una campaña ganada: sello «Corte vencida», el más ancho, junto a la ficha de la baraja y el Reinado
  'acta-victoria': () => {
    const run = baseRun(5);
    run.phase = 'won';
    run.conquered = true; // como en una partida de verdad: la lámina y la crónica copiada lo leen de aquí
    run.stats.turns = 52;
    run.stats.gold = 120;
    run.stats.contracts = 2;
    logged(run);
    show(run);
    cobra(640);
    setScreen('run');
  },
  // ── arte-ui V7: partida guiada, monarcas y su maldición ──
  // el foco de los pasos 1 (el poder del palo), 3 (La Manga) y 5 (el Golpe exacto)
  'bufon-palo': () => bufonEn('palo'),
  'bufon-cuenta': () => bufonEn('cuenta'),
  'bufon-exacto': () => bufonEn('exacto'),
  // un asalto con La Dama del Cáliz: su retrato, la placa «Tus ♥ no curan», el cáliz tachado en cada ♥ y su bocadillo
  // V40 1c · la oferta de Bendiciones y un Rey jefe al frente (con su Furia y su frase)
  bendicion: () => bendicion(),
  'mesa-rey': () => mesaRey('espadas'),
  ...Object.fromEntries(REY_IDS.map((r) => [`mesa-rey-${r}`, () => mesaRey(r)])),
  'mesa-monarca': () => mesaMonarca('copas'),
  // el mismo asalto con cada Rey (mesa-monarca-espadas, …-oros…): la QA los corre a demanda
  ...Object.fromEntries(BOSSES.map((b) => [`mesa-monarca-${b.id}`, () => mesaMonarca(b.id)])),
  // ── arte-ui V8: las piezas de la caída, congeladas a mano (sin fx.ts) ──
  // el trono de Diamantes caído con la corona hecha esquirlas, y el guardia de Picas cortado por el tajo
  // V12 · lo que cae, quieto: monedas, esquirlas y gotas junto a sus tronos y la bolsa con las tres cuentas
  'mesa-caida': async () => {
    await mesa();
    const c = S.campaign;
    if (!c) return;
    c.run.esquirlas = 1240;
    c.run.gotas = 2;
    renderHud();
    const piezas: Pieza[] = [];
    for (const s of SUITS) {
      if (c.state?.towers[s].away) continue;
      piezas.push({ tipo: 'esquirla', n: 1, trono: s, de: 'golpe' }, { tipo: 'moneda', n: 1, trono: s, de: 'guardia' }, { tipo: 'esquirla', n: 2, trono: s, de: 'guardia' });
    }
    piezas.push({ tipo: 'esquirla', n: 5, trono: 'H', de: 'exacto' }, { tipo: 'gota', n: 1, trono: 'H', de: 'exacto' }, { tipo: 'moneda', n: 3, trono: null, de: 'oro' });
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    colocarCaida(piezas);
  },
  // V12 · AUTO encendido (luz maciza, botón hundido) junto a la velocidad a 8×, sin nada elegido
  'mesa-auto': async () => {
    await mesa();
    S.selected.length = 0;
    settings.speed = 8;
    refreshSpeed();
    conmutaAuto(true);
    congelaAuto();
    renderInteractive();
  },
  // V12 · Mejor jugada pulsada: las cartas elegidas y su trono marcados, y las coronas del Golpe exacto en la mano
  'mesa-mejor': async () => {
    await mesa();
    // un Golpe exacto a mano: el as contra el enemigo activo deja su guardia justo a cero
    const st = S.campaign?.state;
    if (st) {
      const as = st.players[0].hand.find((c) => c.rank === 1 && !c.sp);
      const frente = ordenDe(st.config).find((s) => !st.towers[s].away && st.towers[s].floors.length) ?? 'C';
      const tr = st.towers[frente];
      if (as && tr.floors.length) {
        tr.damage = 0;
        const dealt = previewStrike(st, [as], frente).dealt[frente] ?? 0;
        tr.damage = Math.max(0, st.config.floorHp[tr.floors[0]] - dealt);
      }
      S.queue.push({ view: viewFor(st, RUN_PLAYER), events: [] });
      await pump();
    }
    S.selected.length = 0;
    renderInteractive();
    usarMejor();
  },
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
      // V35 · la Casa caída se recoge en la fila (sin escombro a la vista): la corona salta de su rótulo, como en fx.ts
      const rr = rub.getBoundingClientRect();
      const r = rr.width > 0 ? rr : (document.querySelector('.tower[data-suit="D"] .tower-tag') ?? rub).getBoundingClientRect();
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
    // V35 · el tajo, en el guardia del enemigo activo (el de la fila es una ficha sin carta en el móvil)
    const guard = document.querySelector<HTMLElement>('.tower.activa .floor-slot .card');
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
    app.innerHTML = `<div class="run"><div class="run-head"><h1>${L('ui.qa.laminas')}</h1></div><div class="qa-limpias"></div><div class="qa-laminas"></div></div>`;
    // V40: las treinta y seis numeradas de cara limpia, del As al 9 de cada palo (las mide la regla «cara-limpia»)
    const sheet = app.querySelector('.qa-limpias')!;
    for (const suit of ['S', 'H', 'D', 'C'] as Suit[]) for (let rank = 1; rank <= MAX_NUM; rank++) sheet.appendChild(cardEl({ id: `lim-${suit}${rank}`, suit, rank }, { tilt: false }));
    const host = app.querySelector('.qa-laminas')!;
    ([['forjado', 'C', 9, 52], ['templado', 'D', 8, 78], ['policromado', 'H', 7, 104], ['agrietado', 'S', 4, 64]] as [Treatment, Suit, number, number][]).forEach(([tr, suit, rank, at]) => {
      const fig = document.createElement('figure');
      const c = cardEl({ id: `lam-${tr}`, suit, rank, tr }, { tilt: false });
      const band = c.querySelector<HTMLElement>('.foil-band');
      band?.style.setProperty('--foil-x', `${at}%`);
      band?.style.setProperty('--foil-o', '0.95');
      fig.append(c);
      fig.insertAdjacentHTML('beforeend', `<figcaption>${acabN(tr)}</figcaption>`);
      host.appendChild(fig);
    });
    // y una figura junto a las numeradas: el Caballo conserva su grabado
    const fig = document.createElement('figure');
    fig.append(cardEl({ id: 'lam-figura', suit: 'H', rank: CABALLO }, { tilt: false }));
    fig.insertAdjacentHTML('beforeend', `<figcaption>${L('ui.carta.caballo')}</figcaption>`);
    host.appendChild(fig);
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
    app.innerHTML = `<div class="run monarcas-qa"><div class="run-head"><h1>${L('ui.qa.monarcas')}</h1></div>${monarchGallery()}</div>`;
  },
  // ── arte-ui V9: Feedback de prueba y foco del mando en La Taberna ──
  // la Crónica de una derrota con el botón «Enviar Crónica / Feedback de Prueba» ya pulsado y su confirmación
  // (se pinta la respuesta «copiado» sin llamar a shareFeedback: la QA visual no comparte ni descarga nada)
  'acta-feedback': () => {
    setMode('pointer');
    const run = derrota();
    logged(run);
    show(run);
    cobra(340);
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
    const won = baseRun(5);
    won.id = 9102;
    won.seedText = 'QA-VICTORIA';
    won.phase = 'won';
    won.conquered = true;
    won.stats.turns = 52;
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
    // V10: en el idioma de la mesa (scripts/og-card.ts hace una por idioma; og-card.png es la española)
    app.innerHTML = `<div class="og-card">${hero()}<div class="og-txt">${brandLockup(getLang())}<small>${L('ui.og.sub')}</small></div><div class="og-cards"></div></div>`;
    const fan = app.querySelector('.og-cards')!;
    ([['S', REY], ['D', CABALLO], ['H', SOTA], ['C', REY]] as [Suit, number][]).forEach(([suit, rank], i) => {
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
        // V12 · QA determinista: cada estado empieza con el mismo azar, pase lo que pase en los anteriores
        (window as unknown as { __qaSemilla?: (t: string) => void }).__qaSemilla?.(name);
        await STATES[name]?.();
        settle(); // todo quieto y en su sitio antes de la foto
        return name in STATES;
      },
      settle,
      /** Steam Deck: la pantalla tal como se ve con mando (modo mando y el foco donde lo pone la primera pulsación de la cruceta). */
      mando: () => {
        setMode('pad');
        if (!document.querySelector('[data-foco]')) moveFocus(0, 1);
        settle();
      },
      /** V10: el idioma de la pasada (visual-qa --lang=en); no toca el guardado real (platform es de quita y pon). */
      lang: (l: string) => {
        if (isLang(l)) setLang(l);
        return getLang();
      },
      /** Semilla de la próxima campaña (el mando no escribe). */
      seed: (text: string) => void (prefs.seed = text),
      /** Lo que el bot de referencia haría ahora en el asalto en curso (la prueba lo ejecuta con el mando). */
      bot: () => (S.campaign?.state && S.campaign.state.phase === 'playing' ? chooseAction(S.campaign.state) : null),
      /** Resumen de la campaña en curso, para comprobar lo que hizo el mando. */
      run: () => {
        const run = S.campaign?.run;
        return run ? { phase: run.phase, stage: run.stage, gold: run.gold, tools: run.tools.map((t) => t.id), marks: run.deck.filter((c) => c.seal || c.tr).length, pending: run.pending?.kind ?? null, shop: run.shop.map((o) => o.kind), combate: run.combate, deck: run.deck.length, bendiciones: run.bendiciones.length, elegi: run.elegi } : null;
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
      /** V27 · en una pantalla de campaña: quita la última Reliquia, pinta, y la hace llegar de nuevo: se coloca sola (para comprobar su aviso). */
      llega: () => {
        const run = S.campaign?.run;
        const fuera = run?.tools.pop();
        if (!run || !fuera) return null;
        renderRun();
        const hueco = placeTool(run.tools, { id: fuera.id, n: 0 }) + 1;
        renderRun();
        return { id: fuera.id, hueco };
      },
    },
  });
}
