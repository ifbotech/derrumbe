// La mesa de combate: los cuatro tronos, tu Vida, las Reliquias, poderes de palo, marcador
// Daño × Multi = Golpe, la Manga, mano y la cola de eventos que anima cada jugada paso a paso.
import { BEATS, Card, FORMATION_NAME, GameEvent, MATERIAL, RANK_LABEL, SUITS, SUIT_GLYPH, StrikeResult, Suit, TOWER_FX, TowerFx, cardLabel, cardValue, classify, multiplier, previewStrike, threatOf } from '../rules/engine';
import { autopsy } from '../rules/autopsy';
import { BOSS, CONTRACT, LAST_STAGE, stageDef } from '../rules/run';
import { SPECIAL } from '../rules/specials';
import type { ClientMsg } from '../shared/protocol';
import { bunkerArt, rubble, skyline } from './art';
import { setPressure, setScene, sfx } from './audio';
import { afterBatch, campaignAct, isRunHost, routeRun, runDo, stageIntro } from './campaign';
import { backEl, cardEl, pipPath, setDeckBack, suitSvg } from './card';
import { causeHtml } from './causa';
import { liveHtml, Preview, closeReceipt, paintScore, previewHtml, stageOver } from './cuenta';
import { L, Ln, asaltoN, espN, formN, fxD, fxN, juraD, juraN, juraP, marca, monD, monDec, monN, paloN } from './lengua';
import { $, $$, RUN_PLAYER, S, cap, closeModal, cycleSpeed, hideTip, nameOf, num, sortHand, speedLabel, toast, topModal } from './core';
import { storeySvg } from './engraving';
import { CRACKS, exactChain, sealStep, banner, burst, chipAt, coins, dealIn, flash, floatText, fly, guardFall, hitstop, pop, quake, restart, ribbon, shake, procBadge, stampOn, tear, throneFall, wait } from './fx';
import { maybeSettle, trackMeta } from './guild';
import { forget, sendMsg } from './net';
import { renderPings, sendPing } from './pings';
import { platform } from './platform';
import { hint } from './prompts';
import { setScreen } from './router';
import { paintMonarch } from './guia';
import { guidedStep, leaveTutorial, renderCoach, showTutorialEnd, tutorialAct } from './tutorial-ui';
import { voiceOn } from './voces';
import { beltEl, deckModal, showRules, showSettings } from './widgets';
import { tableWhispers, whisper } from './whispers';
import { noteAction, noteTurn } from './telemetry';

/** Cartas de la mano y del andamio que están pintadas. */
const cardEls = new Map<string, HTMLDivElement>();
let towerEls = {} as Record<Suit, HTMLElement>;
/** Torre a la que se apunta (la que está bajo el puntero o tiene el foco). */
let aim: Suit | null = null;
/** Pasos resueltos en el golpe en curso: marca el tono de la campanilla. */
let stepN = 0;
/** El último lote de eventos animado: de ahí sale la causa del derrumbe cuando la obra acaba en derrota. */
let lastEvents: GameEvent[] = [];

const WEAK_TO = Object.fromEntries(SUITS.map((s) => [BEATS[s], s])) as Record<Suit, Suit>; // torre → palo que la dobla
const FLOOR = (r: number) => RANK_LABEL[r];
/** Nombre del guardia con su artículo: «la Sota», «la Reina», «el Rey». */
const GUARD = (r: number) => (r === 11 ? L('ui.mesa.la.sota') : r === 12 ? L('ui.mesa.la.reina') : r === 13 ? L('ui.mesa.el.rey') : L('ui.mesa.el.x', { x: FLOOR(r) }));
/** «Casa de Picas»: el trono de un palo, como se lee en pantalla. */
const HOUSE = (s: Suit) => L('ui.mesa.casa', { palo: paloN(s) });
/** «la Casa de Picas», con su artículo (en inglés, «the House of Spades»). */
const LA_HOUSE = (s: Suit) => L('ui.mesa.la.casa', { palo: paloN(s) });
const fmt = (cards: Card[]) => cards.map((c) => (c.sp ? `[${espN(c.sp)}]` : cardLabel(c))).join(' ');
const POWER = (s: Suit): [string, string] =>
  s === 'S' ? [L('ui.mesa.poder.S'), L('ui.mesa.poder.S.texto')] : s === 'D' ? [L('ui.mesa.poder.D'), L('ui.mesa.poder.D.texto')] : s === 'H' ? [L('ui.mesa.poder.H'), L('ui.mesa.poder.H.texto')] : [L('ui.mesa.poder.C'), L('ui.mesa.poder.C.texto')];

// ───────────────────────── Montaje ─────────────────────────

export function buildTable(): void {
  const c = S.campaign;
  const t = S.tutorial;
  setDeckBack(c?.run.deckId ?? 'obra');
  setScene('battle', c ? Math.min(c.run.stage, LAST_STAGE) : t ? 1 : 3, !!c?.run.boss);
  cardEls.clear();
  S.selected.length = 0;
  aim = null;
  $('#app').innerHTML = `
  <div class="table-screen ${c ? 'is-run' : ''}">
    <header class="bar">
      <div class="brand">${marca().title}</div>
      <div class="room" id="room"></div>
      ${c ? `<div class="chip gold" id="gold-chip" data-tip="<b>${L('ui.mesa.oro')}</b>${L('ui.mesa.oro.tip')}"><span>${L('ui.mesa.oro')}</span><b id="gold-n">${c.run.gold}</b></div>` : ''}
      <div class="obra-chips" id="obra"></div>
      <div class="players" id="players"></div>
      <button id="btn-deck" data-tip="${L('ui.mesa.mazo.tip')}">${L('ui.mesa.mazo')}${hint('deck')}</button>
      <button id="btn-speed" data-tip="${L('ui.mesa.velocidad.tip')}"></button>
      <button id="btn-set">${L('ui.ajustes')}${hint('settings')}</button>
      <button id="btn-rules">${L('ui.reglas')}</button>
      <button id="btn-leave">${L('ui.salir')}</button>
    </header>
    <div class="field">
      <section class="towers" id="towers"></section>
      <aside class="side">
        <div class="panel bunker" id="bunker">
          <h3><span>${L('ui.mesa.vida.tuya')}</span><span id="collapses"></span></h3>
          ${bunkerArt()}
          <!-- V9 · V8-2: cada rótulo va encima de su barra (leído de arriba abajo, «Vida» y luego sus celdas) -->
          <div class="stat"><span>${L('ui.mesa.vida')}</span><b id="int-num"></b></div>
          <div class="blocks" id="int-blocks"></div>
          <div class="stat stat-wall"><span>${L('ui.mesa.escudo')}</span><b id="wall-num"></b></div>
          <div class="blocks wall" id="wall-blocks"></div>
          <div class="piles">
            <div class="pile"><div class="slot" id="deck-slot"></div>${L('ui.mesa.mazo')} <b id="deck-n"></b></div>
            <div class="pile"><div class="slot" id="siren-slot"></div>${L('ui.mesa.contraataque')}</div>
            <div class="pile"><div class="slot" id="disc-slot"><span class="count" id="disc-n"></span></div>${L('ui.mesa.descarte')}</div>
          </div>
        </div>
        <div class="monarch" id="monarch" hidden></div>
        <div class="panel log" id="log"></div>
      </aside>
    </div>
    <footer class="tray">
      <div class="stage" id="stage"></div>
      <div class="coach" id="coach" hidden></div>
      <div class="hudrow">
        <div class="beltbar" id="beltbar" hidden></div>
        <div class="powers" id="powers"></div>
        <div class="wheel" id="wheel" data-tip="${L('ui.mesa.rueda.tip')}"></div>
        <div class="power fatigue" id="fatigue" hidden></div>
      </div>
      <div class="status score" id="score"></div>
      <div class="playrow">
      <div class="handrow">
        <div class="reserve" id="reserve" hidden></div>
        <div class="hand" id="hand"></div>
      </div>
      <div class="actions">
        <button id="btn-strike" class="primary" data-tip="${L('ui.mesa.golpear.tip')}"><span class="lbl">${L('ui.mesa.golpear')}</span>${hint('strike')}</button>
        <button id="btn-stash" data-tip="${L('ui.mesa.manga.tip')}"><span class="lbl">${L('ui.mesa.manga')}</span>${hint('stash')}</button>
        <button id="btn-undo" hidden data-tip="${L('ui.mesa.deshacer.tip')}"><span class="lbl">${L('ui.mesa.deshacer')}</span>${hint('undo')}</button>
        <button id="btn-discard"><span class="lbl">${L('ui.mesa.descartar')}</span><b class="sel-n" id="discard-n" hidden></b>${hint('discard')}</button>
        <button id="btn-clear">${L('ui.mesa.soltar')}${hint('back')}</button>
        <button id="btn-pass" hidden>${L('ui.mesa.pasar')}${hint('strike')}</button>
      </div>
      </div>
    </footer>
  </div>`;
  const towers = $('#towers');
  towerEls = {} as Record<Suit, HTMLElement>;
  for (const s of SUITS) {
    const el = document.createElement('div');
    el.className = 'tower';
    el.dataset.suit = s;
    el.dataset.ping = `tower:${s}`;
    el.tabIndex = 0;
    el.innerHTML = `
      <div class="tower-tag"><span>${paloN(s)}</span>${suitSvg(s)}<svg class="tag-weave" aria-hidden="true"><rect width="100%" height="100%" fill="url(#pat-${s})"/></svg></div>
      <div class="floor-slot"><div class="facade"></div><div class="plates"></div></div>
      <div class="tower-fx"></div>
      <div class="hp"><div class="hp-fill"></div><span></span></div>
      <div class="threat" data-tip="${L('ui.mesa.ataque.tip')}"></div>
      <div class="storeys"></div>
      <div class="footing"></div>`;
    el.onclick = (e) => onTower(s, e.altKey);
    const point = () => {
      if (aim === s) return;
      aim = s;
      renderScore();
    };
    el.onpointerenter = point;
    el.onfocus = point;
    towers.appendChild(el);
    towerEls[s] = el;
  }
  towers.onpointerleave = () => {
    aim = null;
    renderScore();
  };
  $('#deck-slot').appendChild(backEl());
  const speedBtn = $('#btn-speed');
  refreshSpeed();
  speedBtn.onclick = () => {
    cycleSpeed();
    refreshSpeed();
  };
  $('#btn-set').onclick = () => showSettings(refreshSpeed);
  $('#btn-rules').onclick = showRules;
  $('#btn-deck').onclick = toggleInspector;
  $('#deck-slot').onclick = toggleInspector;
  $('#disc-slot').onclick = toggleInspector;
  const leave = $('#btn-leave');
  if (t) leave.innerHTML = `${L('ui.mesa.saltar')}${hint('back')}`; // juice-ux: la partida guiada se salta siempre de un toque (Esc / B)
  leave.onclick = () => {
    if (c && !c.online) return setScreen('home'); // la campaña queda guardada
    if (t) return leaveTutorial();
    if (leave.dataset.sure) return t ? forget() : sendMsg({ t: 'leave' });
    leave.dataset.sure = '1';
    leave.textContent = L('ui.mesa.seguro');
    setTimeout(() => {
      delete leave.dataset.sure;
      leave.textContent = L('ui.salir');
    }, 2500);
  };
  $('#btn-clear').onclick = clearSelection;
  $('#btn-strike').onclick = () => onTableKey(' ', null);
  $('#btn-stash').onclick = () => stash();
  $('#btn-discard').onclick = discardSelection;
  $('#btn-undo').onclick = undo;
  $('#btn-pass').onclick = () => canAct() && act({ t: 'action', action: { type: 'pass' } });
  renderHud();
}

// ───────────────────────── Acciones ─────────────────────────

export const canAct = () => {
  const v = S.shown;
  const t = S.tutorial;
  return !!v && !S.busy && !S.waiting && S.queue.length === 0 && v.phase === 'playing' && v.turnPlayer === v.you && (!t || t.mode === 'do' || t.mode === 'free');
};
/** Lo que se tiene a mano: la mano y el andamio. */
const held = (): Card[] => (S.shown ? [...S.shown.hand, ...S.shown.reserve] : []);
/** Las cartas elegidas, en el orden en que se eligieron. */
const selCards = (): Card[] => {
  const all = held();
  return S.selected.map((id) => all.find((c) => c.id === id)).filter((c): c is Card => !!c);
};
const isJoker = (cards: Card[]) => cards.length === 1 && cards[0].suit === 'X' && !cards[0].sp;

function act(msg: ClientMsg): void {
  if (msg.t !== 'action') return;
  if (S.tutorial) return tutorialAct(msg.action);
  if (S.campaign) noteAction(msg.action.type); // juice-ux: datos de prueba (duda, La Manga, Rebobinar)
  if (S.campaign && !S.campaign.online) return campaignAct(msg.action);
  S.waiting = true;
  sendMsg(msg);
  S.selected.length = 0;
  renderInteractive();
}

function clearSelection(): void {
  S.selected.length = 0;
  renderInteractive();
}

function discardSelection(): void {
  if (!canAct() || S.selected.length === 0) return sfx.deny();
  if (guidedStep()) return toast(L('ui.mesa.toast.tutorial'));
  act({ t: 'action', action: { type: 'discard', cards: [...S.selected] } });
}

/** Guarda en el andamio la carta elegida (o la que tenga el foco). */
function stash(id?: string): void {
  const v = S.shown;
  if (!canAct() || !v) return;
  if (!v.reserveSize) return;
  const step = guidedStep(); // juice-ux: en el paso «manga» se guarda su carta; en los demás, La Manga espera
  if (step && (step.id !== 'manga' || !step.cards?.includes(id ?? S.selected[0] ?? ''))) return toast(step.id === 'manga' ? L('ui.mesa.toast.marcada') : L('ui.mesa.toast.tutorial'));
  if (v.stashed) return toast(L('ui.mesa.toast.manga.usada'));
  const pick = id ?? (S.selected.length === 1 ? S.selected[0] : undefined);
  const card = v.hand.find((c) => c.id === pick);
  if (!card) return toast(L('ui.mesa.toast.manga.una'));
  act({ t: 'action', action: { type: 'stash', card: card.id } });
}

function undo(): void {
  if (!canAct() || !S.shown?.canUndo) return;
  act({ t: 'action', action: { type: 'undo' } });
}

function onTower(s: Suit, ping = false): void {
  const v = S.shown;
  if (!v) return;
  // quien no puede jugar ahora (o pulsa con Alt) marca la torre con tiza para su cuadrilla
  if (ping || (!canAct() && v.players.length > 1)) return sendPing(`tower:${s}`);
  if (!canAct() || v.towers[s].floors.length === 0) return;
  const cards = selCards();
  const step = guidedStep();
  if (step) {
    const ok = step.target === s && cards.length === step.cards!.length && cards.every((c) => step.cards!.includes(c.id));
    if (!ok) return toast(cards.length === step.cards!.length ? L('ui.mesa.toast.casi') : L('ui.mesa.toast.marcadas'));
  }
  if (isJoker(cards)) return act({ t: 'action', action: { type: 'joker', card: cards[0].id, target: s } });
  if (!classify(cards)) return sfx.deny();
  act({ t: 'action', action: { type: 'attack', cards: cards.map((c) => c.id), target: s } });
}

function toggleCard(id: string): void {
  if (!canAct()) return;
  const step = guidedStep();
  if (step && !step.cards!.includes(id)) return toast(L('ui.mesa.toast.paso'));
  const at = S.selected.indexOf(id);
  if (at >= 0) S.selected.splice(at, 1);
  else S.selected.push(id);
  sfx.select(S.selected.length, at < 0);
  renderInteractive();
}

export function logLine(html: string, cls = ''): void {
  const el = $('#log');
  if (!el) return;
  const p = document.createElement('p');
  p.className = cls;
  p.innerHTML = html;
  el.appendChild(p);
  while (el.children.length > 80) el.firstChild!.remove();
  el.scrollTop = el.scrollHeight;
}

// ───────────────────────── Pintado ─────────────────────────

function setNum(sel: string, text: string): void {
  const el = $(sel);
  if (!el || el.textContent === text) return;
  const first = el.textContent === '';
  el.textContent = text;
  if (!first) restart(el, 'pulse');
}

/** Cabecera: dónde estamos, cuánto oro hay y qué jefe o contrato pesa sobre la obra. */
export function renderHud(): void {
  const room = $('#room');
  if (!room) return;
  const c = S.campaign;
  room.textContent = S.tutorial ? L('ui.mesa.tutorial') : c ? `${L('ui.mesa.asalto', { n: c.run.stage })}${c.run.stage <= LAST_STAGE ? `/${LAST_STAGE}` : ''} · ${asaltoN(c.run.stage)}` : L('ui.mesa.sala', { sala: S.session?.room ?? '' });
  if (c) setNum('#gold-n', String(c.run.gold));
  const obra = $('#obra');
  if (obra && c) {
    const boss = c.run.boss ? BOSS[c.run.boss] : null;
    const contract = c.run.contract ? CONTRACT[c.run.contract] : null;
    obra.innerHTML = [
      boss ? `<div class="chip boss-chip" data-lupa="boss:${boss.id}" data-tip="<b>${monN(boss.id)} · ${monDec(boss.id)}</b>${monD(boss.id)}"><span>${L('ui.mesa.monarca')}</span><b>${monN(boss.id)}</b></div>` : '',
      contract ? `<div class="chip contract-chip ${contract.risk ? 'risk' : ''}" data-tip="<b>${L('ui.mesa.juramento')} · ${juraN(contract.id)}</b>${juraD(contract.id)}<hr>${L('ui.mesa.premio', { x: juraP(contract.id) })}"><span>${contract.risk ? L('ui.mesa.riesgo') : L('ui.mesa.juramento')}</span><b>${juraN(contract.id)}</b></div>` : '',
      c.run.curse ? `<div class="chip boss-chip" data-tip="${L('ui.mesa.maldito.tip')}"><span>${L('ui.mesa.maldito')}</span><b>+1 ⚔</b></div>` : '',
      c.run.ascension ? `<div class="chip level-chip" data-tip="${L('ui.mesa.reinado.tip', { n: c.run.ascension + 1 })}"><span>${L('ui.mesa.reinado')}</span><b>${c.run.ascension + 1}</b></div>` : '',
    ].join('');
  }
}

/** El cinturón de herramientas y lo que la mesa arrastra de golpe en golpe. */
export function renderBelt(): void {
  const bar = $('#beltbar');
  const v = S.shown;
  if (!bar) return;
  const tools = v?.tools ?? S.campaign?.run.tools ?? [];
  bar.hidden = !S.campaign && tools.length === 0;
  if (bar.hidden) return;
  hideTip();
  const canOrder = !!S.campaign && isRunHost() && !S.busy && !S.waiting && S.queue.length === 0 && tools.length > 1;
  bar.innerHTML = `<span class="belt-label">${L('ui.mesa.reliquias')}</span>`;
  bar.appendChild(beltEl(tools, { onReorder: canOrder ? (order) => runDo({ t: 'reorder', order }) : undefined }));
  const carry: string[] = [];
  if (v?.chain) carry.push(`<em class="carry chain" data-tip="${Ln(v.chain, 'ui.mesa.racha.tip.1', 'ui.mesa.racha.tip.n', { m: 0.5 * v.chain })}">${L('ui.mesa.racha', { m: 0.5 * v.chain })}</em>`);
  if (v?.charge) carry.push(`<em class="carry charge" data-tip="${L('ui.mesa.carga.tip')}">${L('ui.mesa.carga', { n: v.charge })}</em>`);
  if (v?.scrap) carry.push(`<em class="carry scrap" data-tip="${L('ui.mesa.destruidas.tip')}">${L('ui.mesa.destruidas', { n: v.scrap })}</em>`);
  bar.insertAdjacentHTML('beforeend', `<span class="carries">${carry.join('')}</span>`);
}

function renderPlayers(): void {
  const v = S.shown;
  const el = $('#players');
  if (!v || !el) return;
  el.innerHTML = v.players
    .map((p) => {
      const off = S.lobby?.players.find((l) => l.id === p.id)?.connected === false;
      const cls = [p.id === v.turnPlayer && v.phase === 'playing' ? 'turn' : '', p.id === v.you ? 'me' : '', off ? 'off' : ''].join(' ');
      return `<div class="chip ${cls}" data-p="${p.id}"><span>${p.id === RUN_PLAYER && p.name === 'TÚ' ? L('ui.mesa.tu') : p.name}${off ? L('ui.mesa.bot') : ''}</span><b>${p.handCount}${p.reserveCount ? `+${p.reserveCount}` : ''}</b></div>`;
    })
    .join('');
}

/** Las dos placas del guardia: de qué palo es inmune (hierro) y a cuál es débil (latón). */
function plates(s: Suit): string {
  const cfg = S.shown!.config;
  const own = cfg.ownMult ?? 0;
  const adv = cfg.advMult ?? 2;
  const immune =
    own === 0
      ? `<i class="plate iron" data-tip="${L('ui.mesa.inmune.tip', { g: SUIT_GLYPH[s], palo: paloN(s).toLowerCase() })}">${suitSvg(s)}<b>×0</b></i>`
      : `<i class="plate ${own > 1 ? 'brass' : 'open'}" data-tip="${L('ui.mesa.sininmune.tip', { palo: paloN(s).toLowerCase(), n: own })}">${suitSvg(s)}<b>×${own}</b></i>`;
  const w = WEAK_TO[s];
  return `${immune}<i class="plate brass" data-tip="${L(adv === 2 ? 'ui.mesa.debil.tip.2' : 'ui.mesa.debil.tip.3', { g: SUIT_GLYPH[w], palo: paloN(w).toLowerCase() })}">${suitSvg(w)}<b>×${adv}</b></i>`;
}

function renderTower(s: Suit): void {
  const v = S.shown;
  if (!v) return;
  const t = v.towers[s];
  const cfg = v.config;
  const el = towerEls[s];
  const top = t.floors[0];
  el.classList.toggle('fallen', top === undefined);
  // todas las torres reservan sitio para los mismos pisos: así sus cartas miden igual
  el.parentElement?.style.setProperty('--below', String(Math.max(0, ...SUITS.map((x) => v.towers[x].floors.length - 1))));
  el.classList.toggle('disarmed', t.disarmed);
  const key = `${t.floors.join('-') || 'ruin'}|${cfg.ownMult ?? 0}|${cfg.advMult ?? 2}`;
  if (el.dataset.floor !== key) {
    const sameTop = el.dataset.top === String(top);
    el.dataset.floor = key;
    el.dataset.top = String(top);
    const slot = $('.floor-slot', el);
    $('.facade', slot).classList.remove('shear');
    if (top === undefined) {
      slot.querySelectorAll('.card, .rubble, .ruin').forEach((n) => n.remove());
      $('.facade', slot).innerHTML = '';
      $('.plates', slot).innerHTML = '';
      slot.insertAdjacentHTML('beforeend', `${rubble(s, 'rubble')}<div class="ruin">${L('ui.mesa.caido')}</div>`);
    } else {
      $('.plates', slot).innerHTML = plates(s);
      if (!sameTop) {
        slot.querySelectorAll('.card, .rubble, .ruin').forEach((n) => n.remove());
        $('.facade', slot).innerHTML = storeySvg(s, top);
        const c = cardEl({ id: `${s}${top}`, suit: s, rank: top });
        dealIn(c, 0);
        $('.card-front', c).insertAdjacentHTML('beforeend', CRACKS);
        slot.insertBefore(c, $('.plates', slot));
      }
    }
    // los pisos que quedan debajo, en alzado
    $('.storeys', el).innerHTML = t.floors
      .slice(1)
      .map((r) => `<div class="storey" data-tip="${L('ui.mesa.guardia.tip', { guardia: cap(GUARD(r)), casa: HOUSE(s), vida: cfg.floorHp[r], ataque: cfg.floorThreat[r] })}">${storeySvg(s, r)}<b>${FLOOR(r)}</b><span>${cfg.floorHp[r]}</span></div>`)
      .join('');
  }
  // V10 · V7-5: la insignia de estado va sin guiones blandos y no se parte nunca (antes salía «DESAR-MADO»)
  const fx = (Object.keys(TOWER_FX) as (keyof TowerFx)[]).filter((k) => top !== undefined && t.fx?.[k]);
  $('.tower-fx', el).innerHTML = [...(t.disarmed && top !== undefined ? [`<em class="fx fx-sobrecarga" data-tip="${L('ui.mesa.desarmado.tip')}">${L('ui.mesa.desarmado')}</em>`] : []), ...fx.map((k) => `<em class="fx fx-${k}" data-tip="<b>${fxN(k)}</b>${fxD(k)}">${fxN(k).replace(/ (×\d+)$/, '<span class="fx-n"> $1</span>')}</em>`)].join('');
  if (top !== undefined) {
    const hp = cfg.floorHp[top];
    const left = Math.max(0, hp - t.damage);
    const level = String(Math.min(3, Math.ceil((3 * t.damage) / hp)));
    $('.hp-fill', el).style.transform = `scaleX(${left / hp})`;
    $('.hp span', el).textContent = `${left} / ${hp}`;
    $('.cracks', el)?.setAttribute('data-level', level);
    $('.facade .storey-art', el)?.setAttribute('data-level', level);
    const threat = threatOf(v, t);
    $('.threat', el).innerHTML = t.disarmed ? `<span>${L('ui.mesa.ataque')}</span><b class="off">⚔ 0</b>` : `<span>${L('ui.mesa.ataque')}</span><b>⚔ ${threat}</b>`;
  }
}

function renderBunker(): void {
  const v = S.shown;
  if (!v) return;
  const cfg = v.config;
  const int = Math.max(0, v.integrity);
  const blocks = $('#int-blocks');
  blocks.style.setProperty('--cap', String(Math.min(cfg.maxIntegrity, 15)));
  blocks.innerHTML = Array.from({ length: cfg.maxIntegrity }, (_, i) => `<i class="${i < int ? '' : 'off'}"></i>`).join('');
  blocks.classList.toggle('danger', int <= 6);
  // la música sigue a la obra: cuanto más herido el búnker, más capas y más tambor
  setPressure(v.phase === 'playing' ? 0.12 + 0.95 * (1 - int / cfg.maxIntegrity) ** 1.2 : 0.15);
  $('.bunker-art')?.setAttribute('data-level', String(Math.min(3, Math.floor((1 - int / cfg.maxIntegrity) * 4))));
  const wall = $('#wall-blocks');
  wall.style.setProperty('--cap', String(cfg.wallCap));
  // la fila del Escudo mide siempre 8 casillas: con un tope menor (Escarcha, Sin escudo) se acorta, no engorda
  wall.style.setProperty('--cols', String(Math.max(8, cfg.wallCap)));
  wall.innerHTML = Array.from({ length: cfg.wallCap }, (_, i) => `<i class="${i < v.wall ? '' : 'off'}"></i>`).join('');
  setNum('#int-num', `${int}/${cfg.maxIntegrity}`);
  setNum('#wall-num', `${v.wall}/${cfg.wallCap}`);
  setNum('#deck-n', String(Math.max(0, v.deckCount)));
  setNum('#disc-n', String(Math.max(0, v.discardCount)));
  $('#collapses').textContent = v.collapses ? L('ui.mesa.agotado', { n: v.collapses }) : '';
  const slot = $('#siren-slot');
  const id = v.lastSiren?.id ?? '';
  if (slot.dataset.card !== id) {
    slot.dataset.card = id;
    slot.innerHTML = '';
    if (v.lastSiren) {
      const c = cardEl(v.lastSiren, { faceDown: true });
      slot.appendChild(c);
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('flipped')));
    }
  }
}

/** Crea (o recupera) la carta pintada de la mano o del andamio. */
function cardNode(c: Card, delay: number): HTMLDivElement {
  let el = cardEls.get(c.id);
  if (!el) {
    el = cardEl(c);
    el.tabIndex = 0;
    dealIn(el, delay);
    el.addEventListener('click', () => toggleCard(c.id));
    cardEls.set(c.id, el);
  }
  return el;
}

function renderHand(): void {
  const v = S.shown;
  if (!v) return;
  const hand = $('#hand');
  const cards = sortHand(v.hand);
  const ids = new Set(held().map((c) => c.id));
  for (const [id, el] of cardEls) {
    if (ids.has(id)) continue;
    el.remove();
    cardEls.delete(id);
  }
  S.selected = S.selected.filter((id) => ids.has(id));
  let fresh = 0;
  const mid = (cards.length - 1) / 2;
  cards.forEach((c, i) => {
    const known = cardEls.has(c.id);
    const el = cardNode(c, known ? 0 : fresh++ * 80);
    if (hand.children[i] !== el) hand.insertBefore(el, hand.children[i] ?? null);
    // abanico: cada carta gira y baja un poco según lo lejos que esté del centro (giro corto: las cartas
    // vecinas no se pisan y cada una deja su franja limpia para el puntero)
    const off = mid ? (i - mid) / mid : 0; // de −1 a 1
    el.style.setProperty('--rot', `${(off * Math.min(1, mid * 0.3)).toFixed(2)}deg`);
    el.style.setProperty('--dy', `${(Math.abs(off) ** 1.5 * Math.min(5, mid * 1.3)).toFixed(1)}px`);
    el.dataset.key = i < 9 ? String(i + 1) : i === 9 ? '0' : '';
  });
  hand.dataset.count = String(cards.length);
  hand.toggleAttribute('data-crowd', cards.length > 10);
  // el ancho de las cartas sale de cuántas hay y de cuántos huecos tiene el andamio
  const rowEl = $('.handrow');
  rowEl?.style.setProperty('--n', String(Math.max(6, cards.length)));
  rowEl?.style.setProperty('--rs', String(v.reserveSize));
  // el andamio: uno o dos huecos junto a la mano
  const res = $('#reserve');
  res.hidden = v.reserveSize <= 0;
  if (!res.hidden) {
    const want = Array.from({ length: v.reserveSize }, (_, i) => v.reserve[i]?.id ?? `hueco-${i}`).join(',');
    if (res.dataset.key !== want) {
      res.dataset.key = want;
      res.innerHTML = `<span class="reserve-label">${L('ui.mesa.manga.lbl')}</span>`;
      for (let i = 0; i < v.reserveSize; i++) {
        const c = v.reserve[i];
        const slot = document.createElement('div');
        slot.className = 'reserve-slot';
        if (c) {
          const el = cardNode(c, 0);
          el.style.removeProperty('--rot');
          el.style.removeProperty('--dy');
          el.dataset.key = '';
          slot.appendChild(el);
        } else {
          slot.tabIndex = 0;
          slot.classList.add('empty');
          slot.innerHTML = `<i class="plus">+</i>${hint('stash')}`;
          slot.onclick = () => stash();
        }
        res.appendChild(slot);
      }
    }
    res.classList.toggle('used', v.stashed);
    res.dataset.tip = `${L('ui.mesa.manga.hueco.tip')}${v.reserveSize > 1 ? '' : L('ui.mesa.manga.lleno')}${L('ui.mesa.manga.como')}${v.stashed ? L('ui.mesa.manga.usada') : ''}`;
  }
  for (const [id, el] of cardEls) {
    const at = S.selected.indexOf(id);
    el.classList.toggle('sel', at >= 0);
    if (at >= 0 && S.selected.length > 1) el.dataset.n = String(at + 1);
    else delete el.dataset.n;
  }
  $('.handrow')?.classList.toggle('locked', !canAct());
  hand.classList.toggle('locked', !canAct());
}

/** Torres a las que se puede golpear con la selección actual, con el resultado previsto de cada una. */
function previews(cards: Card[]): Partial<Record<Suit, StrikeResult>> {
  const v = S.shown!;
  const out: Partial<Record<Suit, StrikeResult>> = {};
  for (const s of SUITS) if (v.towers[s].floors.length) out[s] = previewStrike(v, cards, s);
  return out;
}
/** La mejor torre para esta jugada: la que más pisos tira y, a igualdad, la que más daño recibe. */
function bestTarget(pv: Partial<Record<Suit, StrikeResult>>): Suit | null {
  let best: Suit | null = null;
  for (const s of SUITS) {
    const r = pv[s];
    if (!r) continue;
    const b = best ? pv[best]! : null;
    if (!b || r.fallen > b.fallen || (r.fallen === b.fallen && (r.dealt[s] ?? 0) > (b.dealt[best!] ?? 0))) best = s;
  }
  return best;
}
const standingTargets = () => SUITS.filter((s) => S.shown!.towers[s].floors.length > 0);

/**
 * F1 · sello de factor: con un trono apuntado, cada carta de la mano y de La Manga lleva la misma placa
 * que el trono: hierro «×0» si es Inmune, latón «×2»/«×3» si tiene ventaja; nada si es ×1, un comodín
 * o una especial (`multiplier('X', …)` da 0 y no debe salir «×0»). Va en el centro de la carta, fuera
 * de las esquinas, y solo se repinta si cambia el factor.
 */
function renderFactorSeals(target: Suit | null): void {
  const v = S.shown;
  if (!v) return;
  const all = held();
  for (const [id, el] of cardEls) {
    const c = all.find((x) => x.id === id);
    const m = c && target && !c.sp && c.suit !== 'X' ? multiplier(c.suit, target, v.config) : 1;
    const key = m === 1 ? '' : `${target}:${m}`;
    if ((el.dataset.factor ?? '') === key) continue;
    el.querySelector(':scope > .factor')?.remove();
    if (!key || !c || c.suit === 'X') {
      delete el.dataset.factor;
      continue;
    }
    el.dataset.factor = key;
    el.insertAdjacentHTML('beforeend', `<i class="plate factor ${m === 0 ? 'iron' : 'brass'}" aria-hidden="true">${suitSvg(c.suit)}<b>×${num(m)}</b></i>`);
  }
}

/** Los cuatro poderes de palo, siempre a la vista; se encienden con lo que aporta la jugada elegida. */
function renderPowers(cards: Card[], r: StrikeResult | null, target: Suit | null): void {
  const el = $('#powers');
  const v = S.shown;
  if (!el || !v) return;
  const cfg = v.config;
  const has = (s: Suit) => cards.some((c) => !c.sp && c.suit === s);
  const shards = r && target ? Math.max(0, ...SUITS.filter((s) => s !== target).map((s) => r.dealt[s] ?? 0)) : 0;
  const value: Record<Suit, string> = {
    S: (has('S') || cfg.alwaysPierce) && r ? L('ui.mesa.si') : '',
    D: shards ? `${shards}` : '',
    H: r?.repair ? `+${r.repair}` : '',
    C: r?.wallGain ? `+${r.wallGain}` : '',
  };
  const part: Record<Suit, string> = { S: '', D: `1/${cfg.shardDiv}`, H: cfg.repairDiv > 99 ? L('ui.mesa.anulado') : `1/${cfg.repairDiv}`, C: `1/${cfg.wallDiv}` };
  el.innerHTML = SUITS.map(
    (s) =>
      `<span class="power s-${s} ${value[s] ? 'on' : ''}" data-tip="<b>${SUIT_GLYPH[s]} ${POWER(s)[0]}</b>${POWER(s)[1]}${part[s] ? L('ui.mesa.poder.ahora', { x: part[s] }) : ''}${L('ui.mesa.poder.nota')}">${suitSvg(s)}<b>${POWER(s)[0]}</b>${value[s] ? `<em>${value[s]}</em>` : ''}</span>`,
  ).join('');
}

/** El marcador: de quién es el turno y, con cartas elegidas, la cuenta Fuerza × Resonancia = daño. */
function renderScore(): void {
  const v = S.shown;
  const el = $('#score');
  if (!v || !el || el.classList.contains('live')) return;
  const can = canAct();
  const cards = selCards();
  const joker = isJoker(cards);
  const formation = classify(cards);
  for (const s of SUITS) towerEls[s].classList.remove('aimed');
  let tag = '';
  let body = '';
  let shown: StrikeResult | null = null;
  let shownTarget: Suit | null = null;
  let preview: Preview | null = null;
  // con tiza la jugada se puede deshacer; sin ella (o en sala) es definitiva
  const final = v.players.length === 1 && S.campaign ? (v.chalk > 0 ? `<em class="m dim">${L('ui.mesa.deshacer.puede')}</em>` : `<em class="m dim">${L('ui.mesa.definitiva')}</em>`) : '';
  if (v.phase !== 'playing') {
    tag = `<span class="tag">${L('ui.mesa.terminado')}</span>`;
    body = S.campaign ? '' : `<button id="btn-end">${L('ui.mesa.resultado')}</button>`;
  } else if (v.turnPlayer !== v.you) {
    tag = `<span class="tag">${L('ui.mesa.turno.de', { nombre: nameOf(v.turnPlayer) })}</span>`;
    body = `<span class="hint">${L('ui.mesa.planea')}${v.players.length > 1 ? L('ui.mesa.planea.sena') : ''}.</span>`;
  } else if (!can) {
    tag = `<span class="tag">${L('ui.mesa.tu.turno')}</span>`;
    body = '<span class="hint">…</span>';
  } else if (cards.length === 0) {
    tag = `<span class="tag go">${L('ui.mesa.tu.turno')}</span>`;
    body = held().length ? `<span class="hint">${L('ui.mesa.elige')}<span class="only-keys">${L('ui.mesa.elige.teclas')}</span><span class="only-pad">${L('ui.mesa.elige.mando')}</span></span>` : `<span class="hint">${L('ui.mesa.sin.cartas')}</span>`;
  } else if (joker) {
    tag = `<span class="tag go">${L('ui.mesa.motin')}</span>`;
    body = `<span class="marks"><em class="m good">${L('ui.mesa.motin.desarma')}</em><em class="m good">${L('ui.mesa.sin.contra')}</em>${final}</span><span class="hint">${L('ui.mesa.pulsa.trono')}</span>`;
  } else if (!formation) {
    tag = `<span class="tag">${L('ui.mesa.invalida')}</span>`;
    body = `<span class="hint">${L('ui.mesa.invalida.texto')}</span>`;
  } else {
    const pv = previews(cards);
    const target = aim && pv[aim] ? aim : bestTarget(pv);
    const r = target ? pv[target]! : null;
    tag = `<span class="tag go">${formN(formation)}</span>`;
    if (r && target) {
      shown = r;
      shownTarget = target;
      towerEls[target].classList.add('aimed');
      // la cuenta: daño final en grande con sus insignias; el recibo paso a paso se abre bajo demanda (cuenta.ts)
      preview = { v, cards, r, target, formation };
      body = previewHtml(preview, final);
    }
  }
  paintScore(el, tag + body, preview, v);
  // F1: con un trono apuntado (el puntero o el foco encima, o el que elige la cuenta), cada carta lleva su factor
  renderFactorSeals(aim && v.towers[aim].floors.length ? aim : shownTarget);
  renderPowers(cards, shown, shownTarget);
  renderWheel(cards, shownTarget);
  if (shown?.clean) whisper('limpio');
  if (shownTarget && (v.config.ownMult ?? 0) === 0 && cards.some((c) => !c.sp && c.suit === shownTarget))
    whisper('inmune', { material: paloN(shownTarget).toLowerCase(), glyph: SUIT_GLYPH[shownTarget] });
  // antes de un sirenazo serio con el andamio sin usar: todavía se está a tiempo de guardar una carta
  if (shown && shownTarget && !shown.clean && !shown.noSiren && v.reserveSize > 0 && v.reserve.length === 0) {
    const incoming = threatOf(v, v.towers[shownTarget]) - v.wall - Math.max(0, Math.min(shown.wallGain, v.config.wallCap - v.wall));
    if (incoming >= 4) whisper('andamio');
  }
  const end = $('#btn-end', el);
  if (end) end.onclick = showEnd;
}

/** Estado de turno, selección, previsualización de daño y botones. */
export function renderInteractive(): void {
  const v = S.shown;
  if (!v || S.screen !== 'table') return;
  renderHand();
  const can = canAct();
  if (can && S.campaign && !S.tutorial) noteTurn(v); // juice-ux: la duda del turno empieza a contar
  const cards = selCards();
  const joker = isJoker(cards);
  const formation = classify(cards);
  $$('.preview').forEach((p) => p.remove());
  for (const s of SUITS) towerEls[s].classList.remove('targetable');
  renderScore();

  if (can && (joker || formation)) {
    const pv = joker ? {} : previews(cards);
    for (const s of standingTargets()) {
      const el = towerEls[s];
      el.classList.add('targetable');
      const tag = document.createElement('div');
      tag.className = 'preview';
      if (joker) tag.innerHTML = L('ui.mesa.desarmar');
      else {
        const res = (pv as Partial<Record<Suit, StrikeResult>>)[s]!;
        const dealt = res.dealt[s] ?? 0;
        const fallen = res.fallenBy[s] ?? 0;
        const mine = res.fell.some((f) => f.tower === s && f.clean);
        const extra = [fallen ? (fallen > 1 ? L('ui.mesa.caen', { n: fallen }) : L('ui.mesa.cae')) : '', mine ? L('ui.mesa.exacto') : ''].filter(Boolean);
        // en móvil la etiqueta ocupa el pie de un trono estrecho: va la forma corta (el amarillo ya dice «exacto»)
        const short = fallen ? (fallen > 1 ? L('ui.mesa.caen.corto', { n: fallen }) : L('ui.mesa.cae')) : L('ui.mesa.exacto');
        // V10 · V7-2: con unidad; si el guardia no cae, «de Vida» dice qué se le quita
        const pie = extra.length ? extra.join(' · ') : L('ui.mesa.de.vida');
        tag.innerHTML = `−${dealt}<small data-short="${extra.length ? short : pie}">${pie}</small>`;
        tag.classList.toggle('zero', dealt === 0);
        tag.classList.toggle('clean', mine);
      }
      // V9 · V8-1: la placa del golpe va dentro del hueco de la carta, bajo la fila de placas (no las pisa)
      ($('.floor-slot', el) ?? el).appendChild(tag);
    }
  }
  $<HTMLButtonElement>('#btn-discard').disabled = !can || cards.length === 0;
  // cuántas cartas se descartarían: en un sello aparte, para que la etiqueta quepa siempre en un renglón
  const discardN = $('#discard-n');
  discardN.textContent = cards.length ? String(cards.length) : '';
  discardN.hidden = !cards.length;
  $('#btn-discard').setAttribute('aria-label', cards.length ? Ln(cards.length, 'ui.mesa.descartar.1', 'ui.mesa.descartar.n') : L('ui.mesa.descartar'));
  $<HTMLButtonElement>('#btn-clear').disabled = cards.length === 0;
  $('#btn-pass').hidden = !(can && held().length === 0);
  $('#btn-strike').hidden = !$('#btn-pass').hidden;
  $<HTMLButtonElement>('#btn-strike').disabled = !can || cards.length === 0;
  $<HTMLButtonElement>('#btn-stash').hidden = !v.reserveSize;
  $<HTMLButtonElement>('#btn-stash').disabled = !can || v.stashed || cards.length !== 1 || !v.hand.some((c) => c.id === cards[0].id);
  const undoBtn = $<HTMLButtonElement>('#btn-undo');
  undoBtn.hidden = !(S.campaign && v.players.length === 1);
  undoBtn.disabled = !can || !v.canUndo;
  $('.lbl', undoBtn).textContent = v.chalk > 0 ? L('ui.mesa.deshacer') : L('ui.mesa.deshacer.no');
  const guide = can ? guidedStep() : null;
  for (const [id, el] of cardEls) el.classList.toggle('hint', !!guide && guide.cards!.includes(id) && !S.selected.includes(id));
  const ready = !!guide && cards.length === guide.cards!.length;
  for (const s of SUITS) towerEls[s].classList.toggle('hint-target', ready && guide!.target === s);
  // el trono del paso, aunque aún no estén elegidas sus cartas: lo que alumbra el foco de la guía (guia.ts)
  for (const s of SUITS) towerEls[s].classList.toggle('guia-target', !!guide && guide.target === s);
  tableWhispers(); // susurros que dependen del estado de la mesa: jefe, fatiga, cantera baja
  // V7: el monarca del asalto, su placa y la parte de la mesa que castiga su maldición (guia.ts)
  paintMonarch(S.campaign?.run.boss ?? null, v);
  renderCoach(); // juice-ux: el foco de la partida guiada se repinta con la mesa
}

export function renderAll(): void {
  if (!S.shown || S.screen !== 'table') return;
  renderPlayers();
  for (const s of SUITS) renderTower(s);
  renderBunker();
  renderHud();
  renderBelt();
  renderInteractive();
  renderPings();
  renderFatigue();
}

/** La velocidad de la mesa, en su botón (con su indicación de mando). */
export function refreshSpeed(): void {
  const btn = $('#btn-speed');
  if (btn) btn.innerHTML = `${speedLabel()}${hint('speed')}`;
}

// ── rueda de materiales: ♠ → ♦ → ♥ → ♣ → ♠ ──
const WHEEL_AT: Record<Suit, number> = { S: -90, D: 0, H: 90, C: 180 };
function wheelSvg(): string {
  const at = (deg: number, r: number): [number, number] => [32 + r * Math.cos((deg * Math.PI) / 180), 32 + r * Math.sin((deg * Math.PI) / 180)];
  const f = (n: number) => n.toFixed(1);
  const arcs = SUITS.map((s) => {
    const from = WHEEL_AT[s] + 27;
    const to = WHEEL_AT[s] + 63;
    const [x1, y1] = at(from, 23);
    const [x2, y2] = at(to, 23);
    // punta de flecha, tangente al final del arco
    const [tx, ty] = at(to + 9, 23);
    const [ax, ay] = at(to - 3, 27.5);
    const [bx, by] = at(to - 3, 18.5);
    return `<g class="wa a-${s}"><path d="M${f(x1)},${f(y1)} A23,23 0 0 1 ${f(x2)},${f(y2)}"/><path class="head" d="M${f(tx)},${f(ty)} L${f(ax)},${f(ay)} L${f(bx)},${f(by)} Z"/></g>`;
  }).join('');
  const nodes = SUITS.map((s) => {
    const [x, y] = at(WHEEL_AT[s], 23);
    return `<g class="wn n-${s}" transform="translate(${f(x)} ${f(y)})"><path class="wt" d="M-11,0 a11,11 0 1 0 22,0 a11,11 0 1 0 -22,0 Z" fill="url(#pat-${s})"/><circle r="7.8"/><g class="wg" transform="scale(0.6)">${pipPath(s)}</g><path class="wx" d="M-5.4,-5.4 L5.4,5.4 M5.4,-5.4 L-5.4,5.4"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${arcs}${nodes}</svg>`;
}

/** Enciende en la rueda lo que hace la jugada elegida: ventaja (flecha de latón) o inmunidad (aspa de hierro). */
function renderWheel(cards: Card[], target: Suit | null): void {
  const el = $('#wheel');
  const v = S.shown;
  if (!el || !v) return;
  if (!el.firstChild) el.innerHTML = wheelSvg();
  const own = v.config.ownMult ?? 0;
  const suits = new Set(cards.filter((c) => !c.sp && c.suit !== 'X').map((c) => c.suit as Suit));
  let adv = false;
  let blocked = false;
  for (const s of SUITS) {
    const wins = !!target && suits.has(s) && BEATS[s] === target;
    const immune = target === s && suits.has(s) && own === 0;
    adv ||= wins;
    blocked ||= immune;
    el.querySelector(`.a-${s}`)?.classList.toggle('on', wins);
    const node = el.querySelector(`.n-${s}`);
    node?.classList.toggle('lit', suits.has(s));
    node?.classList.toggle('aim', target === s);
    node?.classList.toggle('immune', immune);
  }
  el.classList.toggle('adv', adv);
  el.classList.toggle('blocked', blocked);
}

/** Fatiga de cimientos: avisa tres turnos antes de empezar y luego enseña su nivel. */
function renderFatigue(): void {
  const el = $('#fatigue');
  const v = S.shown;
  if (!el || !v) return;
  const start = v.config.fatigueStart;
  const res = v.config.fatigueRes ?? 0.25;
  const level = v.fatigue ?? 0;
  const left = start === undefined ? Infinity : start - v.turnCount;
  el.hidden = start === undefined || v.phase !== 'playing' || (level === 0 && left > 3);
  if (el.hidden || start === undefined) return;
  el.classList.toggle('on', level > 0);
  el.innerHTML = level > 0 ? `<b>${L('ui.mesa.asedio')}</b><em>${level}</em>` : `<b>${L('ui.mesa.asedio.en')}</b><em>${Math.max(1, left)}</em><b>${Math.max(1, left) === 1 ? L('ui.mesa.turno') : L('ui.mesa.turnos')}</b>`;
  el.dataset.tip = `${L('ui.mesa.asedio.tip', { t: start + 1, c: v.config.fatigueEvery ?? 2, m: res })}${level ? L('ui.mesa.asedio.ahora', { m: res * level, n: level }) : ''}`;
}

// ───────────────────────── Mazo y teclado ─────────────────────────

/** Abre (o cierra) el visor de cantera y escombrera. El orden real de la cantera nunca se enseña. */
export function toggleInspector(): void {
  const open = document.querySelector('.deck-modal');
  if (open) return closeModal(open);
  const v = S.shown;
  if (!v) return;
  const crew = v.players.length > 1 ? L('ui.mesa.insp.conjura') : '';
  const tabs = [
    { label: L('ui.mesa.mazo'), cards: v.unseen, note: L('ui.mesa.insp.mazo', { crew }) },
    { label: L('ui.mesa.descarte'), cards: v.discard, note: L('ui.mesa.insp.descarte') },
  ];
  if (S.campaign) tabs.push({ label: L('ui.mesa.insp.campana'), cards: S.campaign.run.deck, note: L('ui.mesa.insp.campana.nota', { q: v.burned, f: v.exhausted }) });
  deckModal(L('ui.mesa.mazo'), tabs);
}

/**
 * Atajos de la mesa: 1–9 eligen carta, espacio (o X en el mando) golpea, Y guarda en el andamio,
 * Z gasta la tiza, Supr descarta, Tab abre el mazo y Esc suelta. Devuelve true si atendió la tecla.
 */
export function onTableKey(key: string, target: HTMLElement | null): boolean {
  if (S.screen !== 'table') return false;
  if (key === 'Tab') {
    toggleInspector();
    return true;
  }
  if (topModal() || document.querySelector('.end, .lupa')) return false;
  const v = S.shown;
  if (!v) return false;
  if (/^[0-9]$/.test(key)) {
    const card = sortHand(v.hand)[key === '0' ? 9 : Number(key) - 1];
    if (card) toggleCard(card.id);
    return true;
  }
  if (key === 'Escape') {
    if (closeReceipt()) return true; // el recibo de la cuenta se repliega antes de soltar la selección
    if (!S.selected.length) return S.tutorial ? (leaveTutorial(), true) : false; // juice-ux: Esc / B salta la partida guiada
    clearSelection();
    return true;
  }
  if (key === 'Delete' || key === 'Backspace') {
    discardSelection();
    return true;
  }
  if (key === 'y' || key === 'Y') {
    stash(target?.closest<HTMLElement>('#hand .card')?.dataset.id);
    return true;
  }
  if (key === 'z' || key === 'Z') {
    undo();
    return true;
  }
  if (key === ' ') {
    if (!canAct()) return true;
    const cards = selCards();
    if (held().length === 0) {
      act({ t: 'action', action: { type: 'pass' } });
      return true;
    }
    const focusTower = target?.closest<HTMLElement>('.tower')?.dataset.suit as Suit | undefined;
    const want = focusTower ?? guidedStep()?.target ?? aim; // juice-ux: en la partida guiada, sin trono enfocado, el del paso
    const best = want && v.towers[want].floors.length ? want : guidedStep()?.target ?? (isJoker(cards) ? (guidedStep()?.target ?? standingTargets()[0]) : classify(cards) ? bestTarget(previews(cards)) : null);
    if (best) onTower(best);
    return true;
  }
  return false;
}

// ───────────────────────── Animación de eventos ─────────────────────────

/** Pone el marcador en modo «cuenta en vivo» con estos valores. */
function liveScore(label: string, fuerza: number, res: number, total: number | null): void {
  const el = $('#score');
  if (!el) return;
  if (!el.classList.contains('live')) {
    el.classList.add('live');
    closeReceipt();
    el.innerHTML = liveHtml();
  }
  if (label) $('#live-tag', el).textContent = label;
  const set = (sel: string, text: string) => {
    const b = $(sel, el);
    if (b.textContent === text) return;
    b.textContent = text;
    pop(b);
  };
  set('.calc .f', String(fuerza));
  set('.calc .r', num(res));
  set('.calc .t', total === null ? '?' : String(total));
  $('.calc', el).classList.toggle('slam', total !== null);
}
function endLive(): void {
  $('#score')?.classList.remove('live');
  const stage = $('#stage');
  if (stage) stage.innerHTML = '';
}

/** Las cartas salen de la mano (si son mías) o de la ficha del jugador y vuelan al destino. */
async function flyCards(player: string, cards: Card[], dest: (c: Card, i: number) => DOMRect, keep?: (c: Card, el: HTMLElement) => void): Promise<void> {
  const v = S.shown!;
  const mine = player === v.you;
  const chip = document.querySelector(`.chip[data-p="${player}"]`)?.getBoundingClientRect();
  const jobs = cards.map((c, i) => {
    let el = mine ? cardEls.get(c.id) : undefined;
    let from: DOMRect;
    if (el) {
      from = el.getBoundingClientRect();
      cardEls.delete(c.id);
    } else {
      el = cardEl(c);
      const w = 96;
      from = new DOMRect((chip?.left ?? innerWidth / 2) + (chip?.width ?? 0) / 2 - w / 2 + i * 14, (chip?.bottom ?? 0) + 6, w, w * 1.4);
    }
    sfx.flick();
    const to = dest(c, i);
    const node = el;
    return fly(node, from, to, i * 70, { scale: keep ? to.width / from.width : 0.8 }).then(() => keep?.(c, node));
  });
  if (mine) {
    const gone = (h: Card) => cards.some((c) => c.id === h.id);
    const fromReserve = v.reserve.filter(gone).length;
    v.hand = v.hand.filter((h) => !gone(h));
    v.reserve = v.reserve.filter((h) => !gone(h));
    if (fromReserve) $('#reserve').dataset.key = '';
  } else v.players.find((p) => p.id === player)!.handCount -= cards.length;
  await Promise.all(jobs);
  renderHand();
  renderPlayers();
}

const towerMid = (s: Suit) => {
  const r = $('.floor-slot', towerEls[s]).getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2] as const;
};
const SIREN_QUIET = { clean: 'ui.log.quieto.clean', huelga: 'ui.log.quieto.huelga', empty: 'ui.log.quieto.empty' } as const;

async function animate(ev: GameEvent, batch: GameEvent[]): Promise<void> {
  const v = S.shown!;
  switch (ev.e) {
    case 'play': {
      stepN = 0;
      logLine(L('ui.log.golpea', { nombre: nameOf(ev.player), casa: LA_HOUSE(ev.target), cartas: fmt(ev.cards), forma: formN(ev.formation).toLowerCase() }));
      // las cartas suben a la tarima, en el orden en que se resuelven
      const stage = $('#stage');
      stage.innerHTML = '';
      const ghosts = ev.cards.map((c) => {
        const g = cardEl(c);
        g.style.visibility = 'hidden';
        stage.appendChild(g);
        return g;
      });
      await flyCards(ev.player, ev.cards, (_, i) => ghosts[i].getBoundingClientRect(), (c) => (ghosts[ev.cards.indexOf(c)].style.visibility = ''));
      v.discardCount += ev.cards.length;
      liveScore(formN(ev.formation), 0, 1, null);
      break;
    }
    case 'step': {
      procBadge(ev); // insignia flotante si una herramienta se cobra (Ariete, Contragolpe, Rebosadero)
      const inStrike = ev.fuerza !== 0 || ev.res !== 0;
      const text = ev.mr ? `×${num(ev.mr)}` : [ev.df ? `${ev.df > 0 ? '+' : ''}${ev.df}` : '', ev.dr ? `${ev.dr > 0 ? '+' : ''}${num(ev.dr)}` : ''].filter(Boolean).join(' · ');
      const kind = ev.mr ? 'x' : ev.dr && !ev.df ? 'r' : 'f';
      const note = ev.label.includes(': ') ? ev.label.slice(ev.label.indexOf(': ') + 2) : '';
      let target: Element | null = null;
      if (ev.src === 'tool') target = $(`#beltbar .belt-slot[data-slot="${ev.slot}"]`);
      else if (ev.src === 'form' || ev.src === 'chain' || ev.src === 'state') target = $('#score .calc');
      else target = $(`#stage .card[data-id="${ev.id}"]`);
      if (ev.src !== 'form') {
        stepN++;
        sfx.tick(stepN);
        pop(target);
        chipAt(target, text || note || ev.label, text ? kind : 'note');
        sealStep(ev.src, target); // juice-ux V8: lacre caliente (sello) o pasada de lámina (acabado), con su sonido
      }
      if (inStrike) liveScore('', ev.fuerza, ev.res, null);
      if (ev.src === 'tool' || ev.src === 'chain' || ev.src === 'state' || ev.src === 'special') logLine(`${ev.label}${text ? ` <b>${text}</b>` : ''}`, 'dim');
      await wait(ev.src === 'form' ? 120 : Math.max(110, 230 - stepN * 10));
      break;
    }
    case 'impact': {
      liveScore('', ev.fuerza, ev.res, ev.total);
      sfx.tick(stepN + 3);
      await wait(260);
      // las cartas de la tarima se lanzan contra la torre
      const to = $('.floor-slot', towerEls[ev.tower]).getBoundingClientRect();
      await Promise.all($$('#stage .card').map((c, i) => fly(c, c.getBoundingClientRect(), to, i * 30)));
      const t = v.towers[ev.tower];
      const hp = t.floors.length ? v.config.floorHp[t.floors[0]] : 1;
      const power = Math.min(1, ev.total / hp);
      platform.vibrate(20 + 40 * power, 0.3 + 0.6 * power);
      await hitstop(power);
      break;
    }
    case 'stash':
      logLine(`${L('ui.log.manga', { nombre: nameOf(ev.player) })}${ev.back ? L('ui.log.manga.vuelve') : ''}.`, 'dim');
      sfx.stash(!!ev.back); // juice-ux V8: la carta se desliza a La Manga
      break;
    case 'fatigue':
      v.fatigue = ev.level;
      for (const s of SUITS) renderTower(s);
      renderFatigue();
      if (ev.level > 0) {
        banner(L('ui.log.asedio.banner', { n: ev.level }), 'red', L('ui.log.asedio.sub'));
        sfx.rumble(1 + ev.level);
        logLine(L('ui.log.asedio', { n: ev.level, m: (v.config.fatigueRes ?? 0.25) * ev.level }), 'red');
        await wait(650);
      }
      break;
    case 'undo':
      banner(L('ui.log.rebobinar'), 'yel', L('ui.log.rebobinar.sub'));
      sfx.stamp();
      logLine(L('ui.log.rebobinar.texto'), 'yel');
      await wait(700);
      break;
    case 'discard':
      logLine(L('ui.log.descarta', { nombre: nameOf(ev.player), cartas: fmt(ev.cards) }), 'dim');
      await flyCards(ev.player, ev.cards, () => $('#disc-slot').getBoundingClientRect());
      v.discardCount += ev.cards.length;
      renderBunker();
      break;
    case 'joker':
      logLine(L('ui.log.motin', { nombre: nameOf(ev.player), casa: LA_HOUSE(ev.target) }), 'yel');
      await flyCards(ev.player, [ev.card], () => $('.floor-slot', towerEls[ev.target]).getBoundingClientRect());
      v.towers[ev.target].disarmed = true;
      renderTower(ev.target);
      banner(L('ui.mesa.motin'), 'yel', L('ui.log.motin.sub'));
      sfx.mutiny();
      await wait(800);
      break;
    case 'pass':
      logLine(L('ui.log.pasa', { nombre: nameOf(ev.player) }), 'dim');
      break;
    case 'hit': {
      const t = v.towers[ev.tower];
      t.damage = Math.min(ev.damage, ev.hp);
      renderTower(ev.tower);
      const power = Math.min(1, ev.amount / ev.hp);
      const [x, y] = towerMid(ev.tower);
      const dx = x - innerWidth / 2;
      shake(towerEls[ev.tower], ev.splash ? power * 0.5 : power, dx, -40);
      floatText(towerEls[ev.tower], `−${ev.amount}`, ev.splash ? 'splash' : '');
      burst(x, y, ev.splash ? 5 : 8 + Math.round(10 * power), [dx * 0.15, -20]);
      sfx.hit();
      logLine(ev.splash ? L('ui.log.salpica', { casa: HOUSE(ev.tower), n: ev.amount }) : L('ui.log.recibe', { casa: HOUSE(ev.tower), n: ev.amount }), 'dim');
      await wait(ev.splash ? 200 : 380);
      break;
    }
    case 'floorDown': {
      const t = v.towers[ev.tower];
      const el = towerEls[ev.tower];
      const doomed = $('.floor-slot .card', el);
      const falls = batch.filter((b) => b.e === 'floorDown');
      const [x] = towerMid(ev.tower);
      await hitstop(1);
      if (doomed) tear(doomed);
      restart($('.facade', el), 'shear'); // la fachada se parte y se viene abajo
      guardFall(el, ev.clean, batch); // juice-ux: .banner-torn y la cuenta de la cadena de Golpes exactos
      if (falls.length > 1 && falls[0] === ev) sfx.rumble(falls.length);
      else sfx.crash(ev.clean);
      platform.vibrate(90, 0.9);
      quake(Math.min(ev.clean ? 0.5 : 1, 0.45 + 0.2 * falls.length), x - innerWidth / 2, 60); // juice-ux V8: en un exacto, contenida
      if (ev.clean) {
        // el golpe maestro del juego: campana y sello de tinta sobre el trono
        sfx.bell(exactChain()); // juice-ux V8: sube un semitono por exacto seguido
        stampOn(el, L('ui.log.exacto.sello'), 's-clean');
        setTimeout(() => el.querySelector('.s-clean')?.remove(), 1600);
      }
      logLine(`${L('ui.log.cae', { guardia: GUARD(ev.rank), casa: LA_HOUSE(ev.tower) })}${ev.clean ? L('ui.log.cae.exacto') : ''}`, 'yel');
      await wait(720);
      t.floors.shift();
      t.damage = ev.damage;
      t.disarmed = false;
      t.fx = {};
      if (t.floors.length && v.config.apuntalado?.includes(t.floors[0])) t.fx.apuntalado = true;
      renderTower(ev.tower);
      if (ev.towerDown) {
        throneFall(el); // juice-ux: corona que se parte (sonido y .crown-split)
        banner(HOUSE(ev.tower), 'yel', L('ui.log.trono.caido'));
        await wait(900);
      }
      break;
    }
    case 'onda':
      floatText(towerEls[ev.tower], L('ui.log.impulso', { n: ev.amount }), 'clean small');
      logLine(L('ui.log.impulso.texto', { casa: LA_HOUSE(ev.tower), n: ev.amount }), 'yel');
      await wait(260);
      break;
    case 'state': {
      const t = v.towers[ev.tower];
      t.fx = { ...t.fx, [ev.fx]: ev.on };
      renderTower(ev.tower);
      if (ev.on) {
        pop($(`.fx-${ev.fx}`, towerEls[ev.tower]));
        sfx.stamp();
        logLine(`${HOUSE(ev.tower)}: ${fxN(ev.fx).toLowerCase()}. ${fxD(ev.fx)}`, 'yel');
        await wait(260);
      }
      break;
    }
    case 'burn': {
      v.scrap += 1;
      sfx.hiss();
      banner(L('ui.log.anicos'), 'red', L('ui.log.anicos.sub', { carta: cardLabel(ev.card) }));
      logLine(L('ui.log.destruye', { carta: cardLabel(ev.card) }), 'red');
      renderBelt();
      await wait(700);
      break;
    }
    case 'wall':
      v.wall = ev.total;
      renderBunker();
      sfx.build();
      if (ev.amount) logLine(L('ui.log.escudo', { n: ev.amount, total: ev.total }), 'dim');
      await wait(200);
      break;
    case 'hurt':
      v.integrity = ev.integrity;
      renderBunker();
      shake($('#bunker'), 0.4, 1, 0);
      floatText($('#bunker'), `−${ev.amount}`);
      logLine(L('ui.log.cuesta', { n: ev.amount }), 'red');
      await wait(280);
      break;
    case 'gold':
      // en sala, el oro del asalto se va sumando aquí; al cerrar el asalto llega la cuenta buena del servidor
      if (S.campaign?.online && S.campaign.run.phase === 'battle') S.campaign.run.gold += ev.amount;
      coins($('#stage').firstElementChild ?? $('#score'), $('#gold-chip'), ev.amount);
      sfx.coins(ev.amount);
      renderHud();
      logLine(L('ui.log.oro', { n: ev.amount }), 'yel');
      await wait(260);
      break;
    case 'repair':
      v.integrity = ev.total;
      renderBunker();
      sfx.build();
      if (ev.amount) logLine(L('ui.log.curas', { n: ev.amount, total: ev.total }), 'dim');
      await wait(200);
      break;
    case 'siren': {
      endLive();
      if (!ev.card) {
        logLine(L(SIREN_QUIET[ev.reason as keyof typeof SIREN_QUIET] ?? 'ui.log.sin.contra'), 'dim');
        await wait(200);
        break;
      }
      v.deckCount -= 1;
      v.discardCount += 1;
      v.lastSiren = ev.card;
      sfx.siren();
      renderBunker();
      await wait(700);
      const glyph = ev.card.sp ? espN(ev.card.sp) : `${RANK_LABEL[ev.card.rank]}${SUIT_GLYPH[ev.card.suit]}`;
      if (ev.reason === 'strike' && ev.tower) {
        restart(towerEls[ev.tower], 'strike');
        const striker = $('.floor-slot .card', towerEls[ev.tower]);
        if (striker) {
          restart(striker, 'attack');
          setTimeout(() => striker.classList.remove('attack'), 800);
        }
        if (ev.taken) {
          flash();
          platform.vibrate(60, Math.min(1, ev.taken / 8));
          shake($('#bunker'), Math.min(1, ev.taken / 6), 1, 0.4);
          floatText($('#bunker'), `−${ev.taken}`);
          if (ev.taken >= 4 && v.reserveSize > 0 && v.reserve.length === 0) whisper('andamio');
        }
        sfx.sirenLand(ev.taken, ev.blocked);
        v.integrity = ev.integrity;
        v.wall = ev.wall;
        renderBunker();
        logLine(`${L('ui.log.contra', { g: glyph, casa: LA_HOUSE(ev.tower), n: ev.threat })}${ev.blocked ? L('ui.log.contra.frena', { n: ev.blocked }) : ''} → ${ev.taken ? L('ui.log.contra.vida', { n: ev.taken }) : L('ui.log.contra.salvo')}`, ev.taken ? 'red' : 'dim');
        await wait(650);
      } else {
        const why = ev.reason === 'joker' ? L('ui.log.por.joker') : ev.reason === 'ruin' ? L('ui.log.por.ruin', { casa: LA_HOUSE(ev.tower!) }) : ev.reason === 'sobrecarga' ? L('ui.log.por.sobrecarga', { casa: LA_HOUSE(ev.tower!) }) : L('ui.log.por.desarmado', { casa: LA_HOUSE(ev.tower!) });
        logLine(L('ui.log.contra.otro', { g: glyph, por: why }), 'dim');
        await wait(300);
      }
      break;
    }
    case 'collapse':
      banner(L('ui.log.agotado'), 'red', L('ui.log.agotado.sub', { n: ev.loss }));
      sfx.crash();
      quake(0.8);
      v.integrity = ev.integrity;
      v.deckCount = v.discardCount;
      v.discardCount = 0;
      v.collapses += 1;
      renderBunker();
      logLine(L('ui.log.agotado.texto', { n: ev.loss }), 'red');
      await wait(1000);
      break;
    case 'draw':
      v.deckCount -= ev.count;
      if (ev.player === v.you && ev.cards) {
        v.hand.push(...ev.cards);
        renderHand();
        sfx.card();
      } else v.players.find((p) => p.id === ev.player)!.handCount += ev.count;
      renderPlayers();
      renderBunker();
      await wait(240);
      break;
    case 'turn':
      v.turnPlayer = ev.player;
      renderPlayers();
      if (ev.player === v.you && v.players.length > 1) {
        ribbon(L('ui.mesa.tu.turno'));
        await wait(250);
      }
      break;
    case 'end':
      v.phase = ev.result;
      break;
  }
}

export async function pump(): Promise<void> {
  if (S.busy) return;
  S.busy = true;
  while (S.queue.length) {
    const batch = S.queue.shift()!;
    S.waiting = false;
    if (S.shown && batch.events.length && S.screen === 'table') {
      renderInteractive(); // bloquea la mano mientras se anima
      renderBelt();
      if (S.campaign) afterBatch(batch.events);
      lastEvents = batch.events;
      for (const ev of batch.events) {
        try {
          voiceOn(ev); // juice-ux: la voz del monarca (Contraataque, caída)
          await animate(ev, batch.events);
        } catch (err) {
          console.error(err);
        }
        if (S.screen !== 'table') break;
      }
      endLive();
    }
    if (S.screen !== 'table') break;
    const first = !S.shown;
    if (first) lastEvents = [];
    S.shown = batch.view;
    const c = S.campaign;
    if (first) logLine(S.tutorial ? L('ui.log.practicas') : c ? L('ui.log.asalto', { n: c.run.stage, nombre: asaltoN(c.run.stage) }) : L('ui.log.empieza', { sala: S.session?.room ?? '' }), 'yel');
    const res = $('#reserve');
    if (res) res.dataset.key = '';
    renderAll();
  }
  S.busy = false;
  if (!S.shown || S.screen !== 'table') return;
  renderCoach();
  renderBelt();
  renderInteractive();
  const c = S.campaign;
  if (c) {
    trackMeta();
    stageIntro();
    if (c.run.phase !== 'battle') {
      // victoria: un momento para ver caer el último trono. Derrota: la causa se queda sobre la mesa hasta que se lee
      const death = c.run.phase === 'lost' ? (c.run.death ?? autopsy(lastEvents, S.shown.config)) : null;
      if (death) maybeSettle(c); // Coronas y crónica quedan guardadas aunque se cierre la ventana leyendo la causa
      void stageOver(death).then(() => S.campaign && S.screen === 'table' && routeRun());
      return;
    }
  }
  if (S.shown.phase !== 'playing') showEnd();
}

function showEnd(): void {
  const v = S.shown;
  if (!v || document.querySelector('.end')) return;
  if (S.tutorial) return showTutorialEnd();
  if (S.campaign || S.lobby?.mode === 'campana') return; // en campaña el final lo pinta el acta
  const won = v.phase === 'won';
  won ? sfx.win() : sfx.lose();
  const floors = 12 - SUITS.reduce((a, s) => a + v.towers[s].floors.length, 0);
  const isHost = S.lobby?.host === v.you;
  // la causa de la derrota sale del último lote de eventos (si se vio caer: tras reconectar no lo hay)
  const death = won ? null : autopsy(lastEvents, v.config);
  const el = document.createElement('div');
  el.className = `end ${won ? 'won' : 'lost'}`;
  el.innerHTML = `
    <div class="meta"><span class="hot">${won ? L('ui.fin.ganado') : L('ui.fin.sinvida')}</span><span>${L('ui.mesa.sala', { sala: S.session?.room ?? '' })}</span></div>
    ${won ? rubble('H', 'end-art') : skyline('end-art')}
    <h1>${won ? L('ui.fin.corte') : L('ui.fin.conjura')}</h1>
    <p>${won ? L('ui.fin.ganado.texto') : L('ui.fin.perdido.texto')}</p>
    ${death ? causeHtml(death) : ''}
    <p>${L('ui.fin.resumen', { g: floors, t: v.turnCount, c: v.collapses, v: v.integrity, max: v.config.maxIntegrity })}</p>
    <div class="row">
      ${isHost ? `<button class="primary" id="again">${L('ui.fin.otro')}</button>` : `<button disabled>${L('ui.fin.esperando')}</button>`}
      <button id="see">${L('ui.fin.mesa')}</button>
      <button id="quit">${L('ui.salir')}</button>
    </div>`;
  document.body.appendChild(el);
  const again = $('#again', el);
  if (again) again.onclick = () => sendMsg({ t: 'lobby' });
  $('#see', el).onclick = () => el.remove();
  $('#quit', el).onclick = () => sendMsg({ t: 'leave' });
}

/** Lo que una carta suma contra cada trono en pie (para la Lupa). */
export function cardMath(c: Card): string {
  const v = S.shown;
  if (!v || c.sp || c.suit === 'X') return '';
  const cfg = v.config;
  return SUITS.filter((s) => v.towers[s].floors.length)
    .map((s) => {
      const m = s === c.suit ? (cfg.ownMult ?? 0) : BEATS[c.suit as Suit] === s ? (cfg.advMult ?? 2) : 1;
      return `${paloN(s)} <b>${cardValue(c) * m}</b>`;
    })
    .join(' · ');
}
