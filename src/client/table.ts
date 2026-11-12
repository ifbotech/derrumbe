// La mesa de combate: torres, búnker, cinturón, poderes de palo, marcador Fuerza × Resonancia,
// andamio, mano y la cola de eventos que anima cada jugada paso a paso.
import { BEATS, Card, FORMATION_NAME, GameEvent, MATERIAL, RANK_LABEL, SUITS, SUIT_GLYPH, StrikeResult, Suit, TOWER_FX, TowerFx, cardLabel, cardValue, classify, previewStrike } from '../rules/engine';
import { BOSS, CONTRACT, LAST_STAGE, stageDef } from '../rules/run';
import { SPECIAL } from '../rules/specials';
import type { ClientMsg } from '../shared/protocol';
import { bunkerArt, rubble, skyline } from './art';
import { setPressure, setScene, sfx } from './audio';
import { afterBatch, campaignAct, isRunHost, routeRun, runDo, stageIntro } from './campaign';
import { backEl, cardEl, setDeckBack, suitSvg } from './card';
import { $, $$, S, cap, closeModal, cycleSpeed, hideTip, nameOf, num, sortHand, speedLabel, toast, topModal } from './core';
import { storeySvg } from './engraving';
import { CRACKS, banner, burst, chipAt, coins, dealIn, flash, floatText, fly, hitstop, pop, quake, restart, ribbon, shake, stampOn, tear, wait } from './fx';
import { trackMeta } from './guild';
import { forget, sendMsg } from './net';
import { renderPings, sendPing } from './pings';
import { platform } from './platform';
import { setScreen } from './router';
import { guidedStep, renderCoach, showTutorialEnd, skipTutorial, tutorialAct } from './tutorial-ui';
import { beltEl, deckModal, showRules, showSettings } from './widgets';

/** Cartas de la mano y del andamio que están pintadas. */
const cardEls = new Map<string, HTMLDivElement>();
let towerEls = {} as Record<Suit, HTMLElement>;
/** Torre a la que se apunta (la que está bajo el puntero o tiene el foco). */
let aim: Suit | null = null;
/** Pasos resueltos en el golpe en curso: marca el tono de la campanilla. */
let stepN = 0;

const WEAK_TO = Object.fromEntries(SUITS.map((s) => [BEATS[s], s])) as Record<Suit, Suit>; // torre → palo que la dobla
const FLOOR = (r: number) => RANK_LABEL[r];
const fmt = (cards: Card[]) => cards.map((c) => (c.sp ? `[${SPECIAL[c.sp].name}]` : cardLabel(c))).join(' ');
const POWER: Record<Suit, [string, string]> = {
  S: ['Perfora', 'Con alguna ♠ en el golpe, el daño que sobra al tirar un piso pasa al piso siguiente.'],
  D: ['Esquirlas', 'Las demás torres reciben una parte del valor de tus ♦.'],
  H: ['Repara', 'El búnker recupera una parte del valor de tus ♥.'],
  C: ['Muro', 'Levantas como muro una parte del valor de tus ♣. El muro frena a la sirena.'],
};

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
      <div class="brand">Derrumbe</div>
      <div class="room" id="room"></div>
      ${c ? `<div class="chip gold" id="gold-chip" data-tip="<b>Oro</b>Se gasta en la ferretería. Cada 5 de oro guardado da 1 de interés al cobrar."><span>Oro</span><b id="gold-n">${c.run.gold}</b></div>` : ''}
      <div class="obra-chips" id="obra"></div>
      <div class="players" id="players"></div>
      <button id="btn-deck" data-tip="<b>Cantera y escombrera</b>Qué cartas quedan por salir. Tecla Tab.">Mazo</button>
      <button id="btn-speed" data-tip="<b>Velocidad</b>1×, 2× o 4× Turbo."></button>
      <button id="btn-set">Ajustes</button>
      <button id="btn-rules">Reglas</button>
      <button id="btn-leave">Salir</button>
    </header>
    <div class="field">
      <section class="towers" id="towers"></section>
      <aside class="side">
        <div class="panel bunker" id="bunker">
          <h3><span>Búnker</span><span id="collapses"></span></h3>
          ${bunkerArt()}
          <div class="blocks" id="int-blocks"></div>
          <div class="stat"><span>Integridad</span><b id="int-num"></b></div>
          <div class="blocks wall" id="wall-blocks"></div>
          <div class="stat"><span>Muro</span><b id="wall-num"></b></div>
          <div class="piles">
            <div class="pile"><div class="slot" id="deck-slot"></div>Cantera <b id="deck-n"></b></div>
            <div class="pile"><div class="slot" id="siren-slot"></div>Sirena</div>
            <div class="pile"><div class="slot" id="disc-slot"><span class="count" id="disc-n"></span></div>Escombrera</div>
          </div>
        </div>
        <div class="panel log" id="log"></div>
      </aside>
    </div>
    <footer class="tray">
      <div class="stage" id="stage"></div>
      <div class="coach" id="coach" hidden></div>
      <div class="hudrow">
        <div class="beltbar" id="beltbar" hidden></div>
        <div class="powers" id="powers"></div>
      </div>
      <div class="status score" id="score"></div>
      <div class="playrow">
      <div class="handrow">
        <div class="reserve" id="reserve" hidden></div>
        <div class="hand" id="hand"></div>
      </div>
      <div class="actions">
        <button id="btn-undo" hidden data-tip="<b>Tiza de replanteo</b>Deshace tu última jugada. La cantera se baraja de nuevo: lo que viste salir ya no vale. Una por obra, solo en solitario. Atajo: Z.">Tiza ↶</button>
        <button id="btn-discard">Descartar</button>
        <button id="btn-clear">Soltar</button>
        <button id="btn-pass" hidden>Pasar</button>
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
      <div class="tower-tag"><span>${cap(MATERIAL[s])}</span>${suitSvg(s)}</div>
      <div class="floor-slot"><div class="facade"></div><div class="plates"></div></div>
      <div class="tower-fx"></div>
      <div class="hp"><div class="hp-fill"></div><span></span></div>
      <div class="threat" data-tip="<b>Amenaza</b>Lo que este piso le quita al búnker cada vez que la sirena saca su palo. El muro lo frena antes."></div>
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
  speedBtn.textContent = speedLabel();
  speedBtn.onclick = () => {
    cycleSpeed();
    speedBtn.textContent = speedLabel();
  };
  $('#btn-set').onclick = () => showSettings(() => (speedBtn.textContent = speedLabel()));
  $('#btn-rules').onclick = showRules;
  $('#btn-deck').onclick = toggleInspector;
  $('#deck-slot').onclick = toggleInspector;
  $('#disc-slot').onclick = toggleInspector;
  const leave = $('#btn-leave');
  if (t?.then) leave.textContent = 'Saltar tutorial';
  leave.onclick = () => {
    if (c && !c.online) return setScreen('home'); // la campaña queda guardada
    if (t?.then) return skipTutorial();
    if (leave.dataset.sure) return t ? forget() : sendMsg({ t: 'leave' });
    leave.dataset.sure = '1';
    leave.textContent = '¿Seguro?';
    setTimeout(() => {
      delete leave.dataset.sure;
      leave.textContent = 'Salir';
    }, 2500);
  };
  $('#btn-clear').onclick = clearSelection;
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
  if (!canAct() || S.selected.length === 0) return;
  if (guidedStep()) return toast('Ahora no: sigue el paso del tutorial');
  act({ t: 'action', action: { type: 'discard', cards: [...S.selected] } });
}

/** Guarda en el andamio la carta elegida (o la que tenga el foco). */
function stash(id?: string): void {
  const v = S.shown;
  if (!canAct() || !v) return;
  if (!v.reserveSize) return;
  if (guidedStep()) return toast('Ahora no: sigue el paso del tutorial');
  if (v.stashed) return toast('Ya moviste el andamio este turno');
  const pick = id ?? (S.selected.length === 1 ? S.selected[0] : undefined);
  const card = v.hand.find((c) => c.id === pick);
  if (!card) return toast('Elige una sola carta de tu mano para guardarla en el andamio');
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
    if (!ok) return toast(cards.length === step.cards!.length ? 'Casi: golpea la torre marcada' : 'Primero selecciona las cartas marcadas');
  }
  if (isJoker(cards)) return act({ t: 'action', action: { type: 'joker', card: cards[0].id, target: s } });
  if (!classify(cards)) return;
  act({ t: 'action', action: { type: 'attack', cards: cards.map((c) => c.id), target: s } });
}

function toggleCard(id: string): void {
  if (!canAct()) return;
  const step = guidedStep();
  if (step && !step.cards!.includes(id)) return toast('En este paso usa las cartas marcadas');
  const at = S.selected.indexOf(id);
  if (at >= 0) S.selected.splice(at, 1);
  else S.selected.push(id);
  sfx.select();
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
  room.textContent = S.tutorial ? 'TUTORIAL' : c ? `OBRA ${c.run.stage}${c.run.stage <= LAST_STAGE ? `/${LAST_STAGE}` : ''} · ${stageDef(c.run.stage).name}` : `SALA ${S.session?.room ?? ''}`;
  if (c) setNum('#gold-n', String(c.run.gold));
  const obra = $('#obra');
  if (obra && c) {
    const boss = c.run.boss ? BOSS[c.run.boss] : null;
    const contract = c.run.contract ? CONTRACT[c.run.contract] : null;
    obra.innerHTML = [
      boss ? `<div class="chip boss-chip" data-lupa="boss:${boss.id}" data-tip="<b>${boss.who} · ${boss.name}</b>${boss.desc}"><span>Jefe</span><b>${boss.who}</b></div>` : '',
      contract ? `<div class="chip contract-chip ${contract.risk ? 'risk' : ''}" data-tip="<b>Contrato · ${contract.name}</b>${contract.desc}<hr>Premio: ${contract.reward}."><span>${contract.risk ? 'Riesgo' : 'Contrato'}</span><b>${contract.name}</b></div>` : '',
      c.run.curse ? '<div class="chip boss-chip" data-tip="<b>Contrato maldito</b>La amenaza de todas las torres sube 1 en esta obra."><span>Maldito</span><b>+1 amenaza</b></div>' : '',
      c.run.ascension ? `<div class="chip level-chip" data-tip="<b>Nivel de obra ${c.run.ascension + 1}</b>Los giros de este nivel y de los anteriores están activos."><span>Nivel</span><b>${c.run.ascension + 1}</b></div>` : '',
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
  bar.innerHTML = '<span class="belt-label">Cinturón</span>';
  bar.appendChild(beltEl(tools, { onReorder: canOrder ? (order) => runDo({ t: 'reorder', order }) : undefined }));
  const carry: string[] = [];
  if (v?.chain) carry.push(`<em class="carry chain" data-tip="<b>Racha limpia</b>${v.chain} golpe${v.chain > 1 ? 's' : ''} limpio${v.chain > 1 ? 's' : ''} seguido${v.chain > 1 ? 's' : ''}: tu próximo golpe resuena +${num(0.5 * v.chain)}. Se corta si el golpe no es limpio.">Racha +${num(0.5 * v.chain)}</em>`);
  if (v?.charge) carry.push(`<em class="carry charge" data-tip="<b>Fuerza guardada</b>Se suma entera a tu próximo golpe.">+${v.charge} F</em>`);
  if (v?.scrap) carry.push(`<em class="carry scrap" data-tip="<b>Cartas destruidas</b>Las que han salido del mazo en esta campaña. Algunas herramientas se ceban con ellas.">Destruidas ${v.scrap}</em>`);
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
      return `<div class="chip ${cls}" data-p="${p.id}"><span>${p.name}${off ? ' (bot)' : ''}</span><b>${p.handCount}${p.reserveCount ? `+${p.reserveCount}` : ''}</b></div>`;
    })
    .join('');
}

/** Las dos placas del piso: de qué palo es inmune (hierro) y a cuál es débil (latón). */
function plates(s: Suit): string {
  const cfg = S.shown!.config;
  const own = cfg.ownMult ?? 0;
  const adv = cfg.advMult ?? 2;
  const immune =
    own === 0
      ? `<i class="plate iron" data-tip="<b>Inmune a ${SUIT_GLYPH[s]}</b>Las cartas de ${MATERIAL[s].toLowerCase()} no suman Fuerza contra su propia torre (sus poderes sí cuentan).">${suitSvg(s)}<b>×0</b></i>`
      : `<i class="plate ${own > 1 ? 'brass' : 'open'}" data-tip="<b>Sin inmunidad</b>Una herramienta la ha anulado: las cartas de ${MATERIAL[s].toLowerCase()} pegan ×${own} contra su torre.">${suitSvg(s)}<b>×${own}</b></i>`;
  const w = WEAK_TO[s];
  return `${immune}<i class="plate brass" data-tip="<b>Débil a ${SUIT_GLYPH[w]}</b>Las cartas de ${MATERIAL[w].toLowerCase()} suman el ${adv === 2 ? 'doble' : 'triple'} de Fuerza contra esta torre.">${suitSvg(w)}<b>×${adv}</b></i>`;
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
      slot.insertAdjacentHTML('beforeend', `${rubble(s, 'rubble')}<div class="ruin">Ruinas</div>`);
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
      .map((r) => `<div class="storey" data-tip="<b>Piso ${FLOOR(r)} de ${cap(MATERIAL[s])}</b>Resistencia ${cfg.floorHp[r]} · amenaza ${cfg.floorThreat[r]}. Lo destapas al tirar el de arriba.">${storeySvg(s, r)}<b>${FLOOR(r)}</b><span>${cfg.floorHp[r]}</span></div>`)
      .join('');
  }
  const fx = (Object.keys(TOWER_FX) as (keyof TowerFx)[]).filter((k) => top !== undefined && t.fx?.[k]);
  $('.tower-fx', el).innerHTML = [...(t.disarmed && top !== undefined ? ['<em class="fx fx-sobrecarga" data-tip="<b>Desarmada</b>Huelga: este piso no golpea hasta que caiga.">Desarmada</em>'] : []), ...fx.map((k) => `<em class="fx fx-${k}" data-tip="<b>${TOWER_FX[k].name}</b>${TOWER_FX[k].desc}">${TOWER_FX[k].name}</em>`)].join('');
  if (top !== undefined) {
    const hp = cfg.floorHp[top];
    const left = Math.max(0, hp - t.damage);
    const level = String(Math.min(3, Math.ceil((3 * t.damage) / hp)));
    $('.hp-fill', el).style.transform = `scaleX(${left / hp})`;
    $('.hp span', el).textContent = `${left} / ${hp}`;
    $('.cracks', el)?.setAttribute('data-level', level);
    $('.facade .storey-art', el)?.setAttribute('data-level', level);
    const threat = cfg.floorThreat[top];
    $('.threat', el).innerHTML = t.disarmed ? '<span>Amenaza</span><b class="off">0</b>' : `<span>Amenaza</span><b>${threat}</b>`;
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
  wall.innerHTML = Array.from({ length: cfg.wallCap }, (_, i) => `<i class="${i < v.wall ? '' : 'off'}"></i>`).join('');
  setNum('#int-num', `${int}/${cfg.maxIntegrity}`);
  setNum('#wall-num', `${v.wall}/${cfg.wallCap}`);
  setNum('#deck-n', String(Math.max(0, v.deckCount)));
  setNum('#disc-n', String(Math.max(0, v.discardCount)));
  $('#collapses').textContent = v.collapses ? `Colapsos ${v.collapses}` : '';
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
    // abanico: cada carta gira y baja un poco según lo lejos que esté del centro
    const off = mid ? (i - mid) / mid : 0; // de −1 a 1
    el.style.setProperty('--rot', `${(off * Math.min(5.5, mid * 1.4)).toFixed(2)}deg`);
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
      res.innerHTML = '<span class="reserve-label">Andamio</span>';
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
          slot.innerHTML = '<i>Y</i>';
          slot.onclick = () => stash();
        }
        res.appendChild(slot);
      }
    }
    res.classList.toggle('used', v.stashed);
    res.dataset.tip = `<b>Andamio</b>Guarda aquí una carta de tu mano: no cuenta para el tamaño de la mano y se juega como si estuviera en ella. Una vez por turno y sin gastar el turno${v.reserveSize > 1 ? '' : '; si está lleno, la carta guardada vuelve a la mano'}. Elige una carta y pulsa el hueco (o la tecla Y).${v.stashed ? '<hr>Ya lo moviste este turno.' : ''}`;
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

/** Los cuatro poderes de palo, siempre a la vista; se encienden con lo que aporta la jugada elegida. */
function renderPowers(cards: Card[], r: StrikeResult | null, target: Suit | null): void {
  const el = $('#powers');
  const v = S.shown;
  if (!el || !v) return;
  const cfg = v.config;
  const has = (s: Suit) => cards.some((c) => !c.sp && c.suit === s);
  const shards = r && target ? Math.max(0, ...SUITS.filter((s) => s !== target).map((s) => r.dealt[s] ?? 0)) : 0;
  const value: Record<Suit, string> = {
    S: (has('S') || cfg.alwaysPierce) && r ? 'sí' : '',
    D: shards ? `${shards}` : '',
    H: r?.repair ? `+${r.repair}` : '',
    C: r?.wallGain ? `+${r.wallGain}` : '',
  };
  const part: Record<Suit, string> = { S: '', D: `1/${cfg.shardDiv}`, H: cfg.repairDiv > 99 ? 'anulado' : `1/${cfg.repairDiv}`, C: `1/${cfg.wallDiv}` };
  el.innerHTML = SUITS.map(
    (s) =>
      `<span class="power s-${s} ${value[s] ? 'on' : ''}" data-tip="<b>${SUIT_GLYPH[s]} ${POWER[s][0]}</b>${POWER[s][1]}${part[s] ? ` Ahora: ${part[s]}.` : ''}<hr>Además de su Fuerza, cada palo activa su poder aunque no sume nada.">${suitSvg(s)}<b>${POWER[s][0]}</b>${value[s] ? `<em>${value[s]}</em>` : ''}</span>`,
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
  // con tiza la jugada se puede deshacer; sin ella (o en sala) es definitiva
  const final = v.players.length === 1 && S.campaign ? (v.chalk > 0 ? '<em class="m dim">Con tiza: se puede deshacer</em>' : '<em class="m dim">Sin tiza: jugada definitiva</em>') : '';
  if (v.phase !== 'playing') {
    tag = '<span class="tag">Obra terminada</span>';
    body = S.campaign ? '' : '<button id="btn-end">Ver resultado</button>';
  } else if (v.turnPlayer !== v.you) {
    tag = `<span class="tag">Turno de ${nameOf(v.turnPlayer)}</span>`;
    body = `<span class="hint">Mira la mesa y planea tu jugada${v.players.length > 1 ? '. Pulsa una torre para marcarla con tiza' : ''}.</span>`;
  } else if (!can) {
    tag = '<span class="tag">Tu turno</span>';
    body = '<span class="hint">…</span>';
  } else if (cards.length === 0) {
    tag = '<span class="tag go">Tu turno</span>';
    body = held().length ? '<span class="hint">Elige cartas y pulsa una torre. Teclas: 1–9 eligen, flechas mueven el foco, espacio golpea.</span>' : '<span class="hint">No tienes cartas: pulsa PASAR.</span>';
  } else if (joker) {
    tag = '<span class="tag go">Huelga</span>';
    body = `<span class="marks"><em class="m good">Desarma el piso</em><em class="m good">La sirena calla</em>${final}</span><span class="hint">Pulsa una torre.</span>`;
  } else if (!formation) {
    tag = '<span class="tag">Formación inválida</span>';
    body = '<span class="hint">No forman ninguna jugada. Puedes descartarlas o guardar una en el andamio.</span>';
  } else {
    const pv = previews(cards);
    const target = aim && pv[aim] ? aim : bestTarget(pv);
    const r = target ? pv[target]! : null;
    tag = `<span class="tag go">${FORMATION_NAME[formation]}</span>`;
    if (r && target) {
      shown = r;
      shownTarget = target;
      towerEls[target].classList.add('aimed');
      const fallen = r.fallenBy[target] ?? 0;
      const wallGain = Math.min(r.wallGain, v.config.wallCap - v.wall);
      const repair = Math.min(r.repair, v.config.maxIntegrity - v.integrity);
      const marks = [
        r.clean ? '<em class="m gold">Golpe limpio</em>' : '',
        fallen ? `<em class="m red">${fallen > 1 ? `Caen ${fallen} pisos` : 'Cae el piso'}</em>` : '',
        wallGain > 0 ? `<em class="m">Muro +${wallGain}</em>` : '',
        repair > 0 ? `<em class="m">Repara +${repair}</em>` : '',
        r.gold ? `<em class="m gold">Oro +${r.gold}</em>` : '',
        r.draw ? `<em class="m">Robas +${r.draw}</em>` : '',
        r.hurt ? `<em class="m red">Búnker −${r.hurt}</em>` : '',
        r.clean || r.noSiren ? '<em class="m good">La sirena calla</em>' : '<em class="m dim">Sonará la sirena</em>',
        final,
      ].join('');
      body = `<div class="calc" data-tip="<b>Previsualización de impacto</b>Fuerza × Resonancia = daño estimado contra ${MATERIAL[target]}. Las cartas se resuelven en el orden en que las elegiste.">
        <b class="f">${r.fuerza}</b><i>×</i><b class="r">${num(r.res)}</b><i>=</i><b class="t">${r.total}</b><span class="vs">contra ${MATERIAL[target]}</span></div>
        <span class="marks">${marks}</span>`;
    }
  }
  el.innerHTML = tag + body;
  renderPowers(cards, shown, shownTarget);
  const end = $('#btn-end', el);
  if (end) end.onclick = showEnd;
}

/** Estado de turno, selección, previsualización de daño y botones. */
export function renderInteractive(): void {
  const v = S.shown;
  if (!v || S.screen !== 'table') return;
  renderHand();
  const can = canAct();
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
      if (joker) tag.innerHTML = 'Desarmar';
      else {
        const res = (pv as Partial<Record<Suit, StrikeResult>>)[s]!;
        const dealt = res.dealt[s] ?? 0;
        const fallen = res.fallenBy[s] ?? 0;
        const mine = res.fell.some((f) => f.tower === s && f.clean);
        const extra = [fallen ? `cae${fallen > 1 ? 'n ' + fallen : ''}` : '', mine ? 'limpio' : ''].filter(Boolean);
        tag.innerHTML = `−${dealt}${extra.length ? `<small>${extra.join(' · ')}</small>` : ''}`;
        tag.classList.toggle('zero', dealt === 0);
        tag.classList.toggle('clean', mine);
      }
      el.appendChild(tag);
    }
  }
  $<HTMLButtonElement>('#btn-discard').disabled = !can || cards.length === 0;
  $('#btn-discard').textContent = cards.length ? `Descartar (${cards.length})` : 'Descartar';
  $<HTMLButtonElement>('#btn-clear').disabled = cards.length === 0;
  $('#btn-pass').hidden = !(can && held().length === 0);
  const undoBtn = $<HTMLButtonElement>('#btn-undo');
  undoBtn.hidden = !(S.campaign && v.players.length === 1);
  undoBtn.disabled = !can || !v.canUndo;
  undoBtn.textContent = v.chalk > 0 ? 'Tiza ↶' : 'Sin tiza';
  const guide = can ? guidedStep() : null;
  for (const [id, el] of cardEls) el.classList.toggle('hint', !!guide && guide.cards!.includes(id) && !S.selected.includes(id));
  const ready = !!guide && cards.length === guide.cards!.length;
  for (const s of SUITS) towerEls[s].classList.toggle('hint-target', ready && guide!.target === s);
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
}

// ───────────────────────── Mazo y teclado ─────────────────────────

/** Abre (o cierra) el visor de cantera y escombrera. El orden real de la cantera nunca se enseña. */
export function toggleInspector(): void {
  const open = document.querySelector('.deck-modal');
  if (open) return closeModal(open);
  const v = S.shown;
  if (!v) return;
  const crew = v.players.length > 1 ? ', las manos y los andamios de tu cuadrilla' : '';
  const tabs = [
    { label: 'Cantera', cards: v.unseen, note: `Lo que aún no has visto: la cantera${crew}. Va ordenado por palo y número: el orden de robo es secreto.` },
    { label: 'Escombrera', cards: v.discard, note: 'Lo ya jugado. Volverá a la cantera en el próximo colapso.' },
  ];
  if (S.campaign) tabs.push({ label: 'Mazo de campaña', cards: S.campaign.run.deck, note: `Todas tus cartas. Destruidas en esta obra: ${v.burned}. Fuera de juego hasta la próxima obra: ${v.exhausted}.` });
  deckModal('Mazo', tabs);
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
    if (!S.selected.length) return false;
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
    const want = focusTower ?? aim;
    const best = want && v.towers[want].floors.length ? want : isJoker(cards) ? (guidedStep()?.target ?? standingTargets()[0]) : classify(cards) ? bestTarget(previews(cards)) : null;
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
    el.innerHTML = `<span class="tag go" id="live-tag"></span><div class="calc"><b class="f">0</b><i>×</i><b class="r">1</b><i>=</i><b class="t">?</b></div><span class="marks" id="live-marks"></span>`;
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
const SIREN_QUIET: Record<string, string> = { clean: 'Golpe limpio: la sirena calla.', huelga: 'Huelga: la sirena calla.', empty: 'No quedan cartas: la sirena calla.' };

async function animate(ev: GameEvent, batch: GameEvent[]): Promise<void> {
  const v = S.shown!;
  switch (ev.e) {
    case 'play': {
      stepN = 0;
      logLine(`<b>${nameOf(ev.player)}</b> golpea ${MATERIAL[ev.target]} con ${fmt(ev.cards)} <i>(${FORMATION_NAME[ev.formation].toLowerCase()})</i>`);
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
      liveScore(FORMATION_NAME[ev.formation], 0, 1, null);
      break;
    }
    case 'step': {
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
        if (ev.src === 'seal') sfx.stamp();
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
      logLine(`<b>${nameOf(ev.player)}</b> guarda una carta en el andamio${ev.back ? ' y recupera la que había' : ''}.`, 'dim');
      sfx.flick();
      break;
    case 'undo':
      banner('Replanteo', 'yel', 'la jugada se deshace · la cantera se baraja');
      sfx.stamp();
      logLine('Tiza de replanteo: la última jugada se deshace y la cantera se baraja de nuevo.', 'yel');
      await wait(700);
      break;
    case 'discard':
      logLine(`<b>${nameOf(ev.player)}</b> descarta ${fmt(ev.cards)}`, 'dim');
      await flyCards(ev.player, ev.cards, () => $('#disc-slot').getBoundingClientRect());
      v.discardCount += ev.cards.length;
      renderBunker();
      break;
    case 'joker':
      logLine(`<b>${nameOf(ev.player)}</b> declara HUELGA en ${MATERIAL[ev.target]}: piso desarmado`, 'yel');
      await flyCards(ev.player, [ev.card], () => $('.floor-slot', towerEls[ev.target]).getBoundingClientRect());
      v.towers[ev.target].disarmed = true;
      renderTower(ev.target);
      banner('Huelga', 'yel', 'la sirena no suena');
      sfx.stamp();
      await wait(800);
      break;
    case 'pass':
      logLine(`<b>${nameOf(ev.player)}</b> pasa`, 'dim');
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
      logLine(ev.splash ? `Salpica: ${MATERIAL[ev.tower]} −${ev.amount}` : `${MATERIAL[ev.tower]} recibe −${ev.amount}`, 'dim');
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
      if (falls.length > 1 && falls[0] === ev) sfx.rumble(falls.length);
      else sfx.crash();
      platform.vibrate(90, 0.9);
      quake(Math.min(1, 0.45 + 0.2 * falls.length), x - innerWidth / 2, 60);
      if (ev.clean) {
        // el golpe maestro del juego: campana y sello de tinta sobre la torre
        sfx.bell();
        stampOn(el, 'Golpe limpio', 's-clean');
        setTimeout(() => el.querySelector('.s-clean')?.remove(), 1600);
      }
      logLine(`¡Cae la ${FLOOR(ev.rank)} de ${MATERIAL[ev.tower]}!${ev.clean ? ' Golpe limpio: la sirena calla, +1 de oro y robas 1.' : ''}`, 'yel');
      await wait(720);
      t.floors.shift();
      t.damage = ev.damage;
      t.disarmed = false;
      t.fx = {};
      if (t.floors.length && v.config.apuntalado?.includes(t.floors[0])) t.fx.apuntalado = true;
      renderTower(ev.tower);
      if (ev.towerDown) {
        banner(cap(MATERIAL[ev.tower]), 'yel', 'torre en ruinas');
        await wait(900);
      }
      break;
    }
    case 'onda':
      floatText(towerEls[ev.tower], `Onda −${ev.amount}`, 'clean small');
      logLine(`Onda sísmica: el piso siguiente de ${MATERIAL[ev.tower]} pierde ${ev.amount}.`, 'yel');
      await wait(260);
      break;
    case 'state': {
      const t = v.towers[ev.tower];
      t.fx = { ...t.fx, [ev.fx]: ev.on };
      renderTower(ev.tower);
      if (ev.on) {
        pop($(`.fx-${ev.fx}`, towerEls[ev.tower]));
        sfx.stamp();
        logLine(`${MATERIAL[ev.tower]}: ${TOWER_FX[ev.fx].name.toLowerCase()}. ${TOWER_FX[ev.fx].desc}`, 'yel');
        await wait(260);
      }
      break;
    }
    case 'burn': {
      v.scrap += 1;
      sfx.hiss();
      banner('Añicos', 'red', `${cardLabel(ev.card)} sale del mazo para siempre`);
      logLine(`${cardLabel(ev.card)} se destruye.`, 'red');
      renderBelt();
      await wait(700);
      break;
    }
    case 'wall':
      v.wall = ev.total;
      renderBunker();
      sfx.build();
      if (ev.amount) logLine(`Muro +${ev.amount} (${ev.total})`, 'dim');
      await wait(200);
      break;
    case 'hurt':
      v.integrity = ev.integrity;
      renderBunker();
      shake($('#bunker'), 0.4, 1, 0);
      floatText($('#bunker'), `−${ev.amount}`);
      logLine(`El golpe le cuesta ${ev.amount} al búnker.`, 'red');
      await wait(280);
      break;
    case 'gold':
      // en sala, el oro de la obra se va sumando aquí; al cerrar la obra llega la cuenta buena del servidor
      if (S.campaign?.online && S.campaign.run.phase === 'battle') S.campaign.run.gold += ev.amount;
      coins($('#stage').firstElementChild ?? $('#score'), $('#gold-chip'), ev.amount);
      sfx.coins(ev.amount);
      renderHud();
      logLine(`+${ev.amount} de oro`, 'yel');
      await wait(260);
      break;
    case 'repair':
      v.integrity = ev.total;
      renderBunker();
      sfx.build();
      if (ev.amount) logLine(`Búnker reparado +${ev.amount} (${ev.total})`, 'dim');
      await wait(200);
      break;
    case 'siren': {
      endLive();
      if (!ev.card) {
        logLine(SIREN_QUIET[ev.reason] ?? 'La sirena calla.', 'dim');
        await wait(200);
        break;
      }
      v.deckCount -= 1;
      v.discardCount += 1;
      v.lastSiren = ev.card;
      sfx.siren();
      renderBunker();
      await wait(700);
      const glyph = ev.card.sp ? SPECIAL[ev.card.sp].name : `${RANK_LABEL[ev.card.rank]}${SUIT_GLYPH[ev.card.suit]}`;
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
        }
        sfx.hit();
        v.integrity = ev.integrity;
        v.wall = ev.wall;
        renderBunker();
        logLine(`SIRENA ${glyph}: ${MATERIAL[ev.tower]} golpea ${ev.threat}${ev.blocked ? ` · el muro frena ${ev.blocked}` : ''} → ${ev.taken ? `búnker −${ev.taken}` : 'búnker a salvo'}`, ev.taken ? 'red' : 'dim');
        await wait(650);
      } else {
        const why = ev.reason === 'joker' ? 'sin palo, silencio' : ev.reason === 'ruin' ? `${MATERIAL[ev.tower!]} ya es ruina` : ev.reason === 'sobrecarga' ? `${MATERIAL[ev.tower!]} estaba desarmada ×1 y se salta el golpe` : `${MATERIAL[ev.tower!]} está desarmada`;
        logLine(`Sirena ${glyph}: ${why}.`, 'dim');
        await wait(300);
      }
      break;
    }
    case 'collapse':
      banner('Colapso', 'red', `la escombrera vuelve a la cantera · búnker −${ev.loss}`);
      sfx.crash();
      quake(0.8);
      v.integrity = ev.integrity;
      v.deckCount = v.discardCount;
      v.discardCount = 0;
      v.collapses += 1;
      renderBunker();
      logLine(`COLAPSO: se rebaraja la escombrera. Búnker −${ev.loss}. El siguiente costará más.`, 'red');
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
        ribbon('Tu turno');
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
      for (const ev of batch.events) {
        try {
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
    S.shown = batch.view;
    const c = S.campaign;
    if (first) logLine(S.tutorial ? 'Obra de prácticas: sigue al capataz.' : c ? `Obra ${c.run.stage}: ${stageDef(c.run.stage).name}.` : `Empieza la obra. Sala ${S.session?.room ?? ''}.`, 'yel');
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
      setTimeout(() => routeRun(), 900); // deja ver el último derrumbe antes de cambiar de pantalla
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
  const el = document.createElement('div');
  el.className = `end ${won ? 'won' : 'lost'}`;
  el.innerHTML = `
    <div class="meta"><span class="hot">${won ? 'OBRA COMPLETADA' : 'BÚNKER PERDIDO'}</span><span>SALA ${S.session?.room ?? ''}</span></div>
    ${won ? rubble('H', 'end-art') : skyline('end-art')}
    <h1>${won ? 'Demolido' : 'Sepultados'}</h1>
    <p>${won ? 'Las cuatro torres son escombro. La cuadrilla sale caminando.' : 'El búnker cedió antes que las torres. Volved a intentarlo.'}</p>
    <p>Pisos demolidos ${floors}/12 · Turnos ${v.turnCount} · Colapsos ${v.collapses} · Integridad final ${v.integrity}/${v.config.maxIntegrity}</p>
    <div class="row">
      ${isHost ? '<button class="primary" id="again">Otra obra</button>' : '<button disabled>Esperando al anfitrión…</button>'}
      <button id="see">Ver la mesa</button>
      <button id="quit">Salir</button>
    </div>`;
  document.body.appendChild(el);
  const again = $('#again', el);
  if (again) again.onclick = () => sendMsg({ t: 'lobby' });
  $('#see', el).onclick = () => el.remove();
  $('#quit', el).onclick = () => sendMsg({ t: 'leave' });
}

/** Lo que una carta suma contra cada torre en pie (para la lupa de grabador). */
export function cardMath(c: Card): string {
  const v = S.shown;
  if (!v || c.sp || c.suit === 'X') return '';
  const cfg = v.config;
  return SUITS.filter((s) => v.towers[s].floors.length)
    .map((s) => {
      const m = s === c.suit ? (cfg.ownMult ?? 0) : BEATS[c.suit as Suit] === s ? (cfg.advMult ?? 2) : 1;
      return `${cap(MATERIAL[s])} <b>${cardValue(c) * m}</b>`;
    })
    .join(' · ');
}
