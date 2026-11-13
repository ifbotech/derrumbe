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
import { LIVE_HTML, Preview, closeReceipt, paintScore, previewHtml, stageOver } from './cuenta';
import { TITLE } from '../shared/brand';
import { $, $$, S, cap, closeModal, cycleSpeed, hideTip, nameOf, num, sortHand, speedLabel, toast, topModal } from './core';
import { storeySvg } from './engraving';
import { CRACKS, banner, burst, chipAt, coins, dealIn, flash, floatText, fly, guardFall, hitstop, pop, quake, restart, ribbon, shake, procBadge, stampOn, tear, throneFall, wait } from './fx';
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
const GUARD = (r: number) => ({ 11: 'la Sota', 12: 'la Reina', 13: 'el Rey' })[r] ?? `el ${FLOOR(r)}`;
/** «Casa de Picas»: el trono de un palo, como se lee en pantalla. */
const HOUSE = (s: Suit) => `Casa de ${cap(MATERIAL[s])}`;
const fmt = (cards: Card[]) => cards.map((c) => (c.sp ? `[${SPECIAL[c.sp].name}]` : cardLabel(c))).join(' ');
const POWER: Record<Suit, [string, string]> = {
  S: ['Perfora', 'Con alguna ♠ en el Golpe, lo que sobra al abatir a un guardia pasa al siguiente.'],
  D: ['Salpica', 'Los demás tronos reciben una parte del valor de tus ♦.'],
  H: ['Cura', 'Recuperas Vida: una parte del valor de tus ♥.'],
  C: ['Escudo', 'Ganas Escudo: una parte del valor de tus ♣. El Escudo frena el Contraataque.'],
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
      <div class="brand">${TITLE}</div>
      <div class="room" id="room"></div>
      ${c ? `<div class="chip gold" id="gold-chip" data-tip="<b>Oro</b>Se gasta en la Taberna. Cada 5 de oro guardado da 1 de interés al cobrar."><span>Oro</span><b id="gold-n">${c.run.gold}</b></div>` : ''}
      <div class="obra-chips" id="obra"></div>
      <div class="players" id="players"></div>
      <button id="btn-deck" data-tip="<b>Mazo y Descarte</b>Qué cartas quedan por salir.">Mazo${hint('deck')}</button>
      <button id="btn-speed" data-tip="<b>Velocidad</b>1×, 2× o 4× Turbo."></button>
      <button id="btn-set">Ajustes${hint('settings')}</button>
      <button id="btn-rules">Reglas</button>
      <button id="btn-leave">Salir</button>
    </header>
    <div class="field">
      <section class="towers" id="towers"></section>
      <aside class="side">
        <div class="panel bunker" id="bunker">
          <h3><span>Tu Vida</span><span id="collapses"></span></h3>
          ${bunkerArt()}
          <div class="blocks" id="int-blocks"></div>
          <div class="stat"><span>Vida ♥</span><b id="int-num"></b></div>
          <div class="blocks wall" id="wall-blocks"></div>
          <div class="stat"><span>Escudo 🛡</span><b id="wall-num"></b></div>
          <div class="piles">
            <div class="pile"><div class="slot" id="deck-slot"></div>Mazo <b id="deck-n"></b></div>
            <div class="pile"><div class="slot" id="siren-slot"></div>Contraataque</div>
            <div class="pile"><div class="slot" id="disc-slot"><span class="count" id="disc-n"></span></div>Descarte</div>
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
        <div class="wheel" id="wheel" data-tip="<b>Rueda de palos</b>♠ corta ♦ · ♦ compra ♥ · ♥ doblega ♣ · ♣ quiebra ♠. Con ventaja, cada carta suma el doble de Daño; contra el trono de su propio palo, nada: ese trono es Inmune. La rueda se enciende con lo que llevas elegido."></div>
        <div class="power fatigue" id="fatigue" hidden></div>
      </div>
      <div class="status score" id="score"></div>
      <div class="playrow">
      <div class="handrow">
        <div class="reserve" id="reserve" hidden></div>
        <div class="hand" id="hand"></div>
      </div>
      <div class="actions">
        <button id="btn-strike" class="primary" data-tip="<b>Golpear</b>Golpea el trono apuntado con las cartas elegidas (o el que más Golpe recibe)."><span class="lbl">Golpear</span>${hint('strike')}</button>
        <button id="btn-stash" data-tip="<b>La Manga</b>Te guardas en la manga la carta elegida. Una vez por turno y sin gastar el turno."><span class="lbl">Manga</span>${hint('stash')}</button>
        <button id="btn-undo" hidden data-tip="<b>Rebobinar</b>Deshace tu última jugada. El Mazo se baraja de nuevo: lo que viste salir ya no vale. Una vez por asalto, solo en solitario."><span class="lbl">↩ Deshacer</span>${hint('undo')}</button>
        <button id="btn-discard"><span class="lbl">Descartar</span><b class="sel-n" id="discard-n" hidden></b>${hint('discard')}</button>
        <button id="btn-clear">Soltar${hint('back')}</button>
        <button id="btn-pass" hidden>Pasar${hint('strike')}</button>
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
      <div class="tower-tag"><span>${cap(MATERIAL[s])}</span>${suitSvg(s)}<svg class="tag-weave" aria-hidden="true"><rect width="100%" height="100%" fill="url(#pat-${s})"/></svg></div>
      <div class="floor-slot"><div class="facade"></div><div class="plates"></div></div>
      <div class="tower-fx"></div>
      <div class="hp"><div class="hp-fill"></div><span></span></div>
      <div class="threat" data-tip="<b>Ataque ⚔</b>Lo que este guardia te quita de Vida cada vez que el Contraataque saca su palo. Tu Escudo lo frena antes."></div>
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
  if (t) leave.innerHTML = `Saltar${hint('back')}`; // juice-ux: la partida guiada se salta siempre de un toque (Esc / B)
  leave.onclick = () => {
    if (c && !c.online) return setScreen('home'); // la campaña queda guardada
    if (t) return leaveTutorial();
    if (leave.dataset.sure) return t ? forget() : sendMsg({ t: 'leave' });
    leave.dataset.sure = '1';
    leave.textContent = '¿Seguro?';
    setTimeout(() => {
      delete leave.dataset.sure;
      leave.textContent = 'Salir';
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
  if (guidedStep()) return toast('Ahora no: sigue el paso del tutorial');
  act({ t: 'action', action: { type: 'discard', cards: [...S.selected] } });
}

/** Guarda en el andamio la carta elegida (o la que tenga el foco). */
function stash(id?: string): void {
  const v = S.shown;
  if (!canAct() || !v) return;
  if (!v.reserveSize) return;
  const step = guidedStep(); // juice-ux: en el paso «manga» se guarda su carta; en los demás, La Manga espera
  if (step && (step.id !== 'manga' || !step.cards?.includes(id ?? S.selected[0] ?? ''))) return toast(step.id === 'manga' ? 'Guarda la carta marcada' : 'Ahora no: sigue el paso del tutorial');
  if (v.stashed) return toast('Ya usaste la Manga este turno');
  const pick = id ?? (S.selected.length === 1 ? S.selected[0] : undefined);
  const card = v.hand.find((c) => c.id === pick);
  if (!card) return toast('Elige una sola carta de tu mano para guardarla en la manga');
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
    if (!ok) return toast(cards.length === step.cards!.length ? 'Casi: golpea el trono marcado' : 'Primero selecciona las cartas marcadas');
  }
  if (isJoker(cards)) return act({ t: 'action', action: { type: 'joker', card: cards[0].id, target: s } });
  if (!classify(cards)) return sfx.deny();
  act({ t: 'action', action: { type: 'attack', cards: cards.map((c) => c.id), target: s } });
}

function toggleCard(id: string): void {
  if (!canAct()) return;
  const step = guidedStep();
  if (step && !step.cards!.includes(id)) return toast('En este paso usa las cartas marcadas');
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
  room.textContent = S.tutorial ? 'TUTORIAL' : c ? `ASALTO ${c.run.stage}${c.run.stage <= LAST_STAGE ? `/${LAST_STAGE}` : ''} · ${stageDef(c.run.stage).name}` : `SALA ${S.session?.room ?? ''}`;
  if (c) setNum('#gold-n', String(c.run.gold));
  const obra = $('#obra');
  if (obra && c) {
    const boss = c.run.boss ? BOSS[c.run.boss] : null;
    const contract = c.run.contract ? CONTRACT[c.run.contract] : null;
    obra.innerHTML = [
      boss ? `<div class="chip boss-chip" data-lupa="boss:${boss.id}" data-tip="<b>${boss.who} · ${boss.name}</b>${boss.desc}"><span>Monarca</span><b>${boss.who}</b></div>` : '',
      contract ? `<div class="chip contract-chip ${contract.risk ? 'risk' : ''}" data-tip="<b>Juramento · ${contract.name}</b>${contract.desc}<hr>Premio: ${contract.reward}."><span>${contract.risk ? 'Riesgo' : 'Juramento'}</span><b>${contract.name}</b></div>` : '',
      c.run.curse ? '<div class="chip boss-chip" data-tip="<b>Juramento maldito</b>El Ataque de todos los tronos sube 1 en este asalto."><span>Maldito</span><b>+1 ⚔</b></div>' : '',
      c.run.ascension ? `<div class="chip level-chip" data-tip="<b>Reinado ${c.run.ascension + 1}</b>Los giros de este Reinado y de los anteriores están activos."><span>Reinado</span><b>${c.run.ascension + 1}</b></div>` : '',
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
  bar.innerHTML = '<span class="belt-label">Reliquias</span>';
  bar.appendChild(beltEl(tools, { onReorder: canOrder ? (order) => runDo({ t: 'reorder', order }) : undefined }));
  const carry: string[] = [];
  if (v?.chain) carry.push(`<em class="carry chain" data-tip="<b>Racha</b>${v.chain} Golpe${v.chain > 1 ? 's' : ''} exacto${v.chain > 1 ? 's' : ''} seguido${v.chain > 1 ? 's' : ''}: tu próximo Golpe suma +${num(0.5 * v.chain)} de Multi. Se corta si el Golpe no es exacto.">Racha +${num(0.5 * v.chain)}</em>`);
  if (v?.charge) carry.push(`<em class="carry charge" data-tip="<b>Daño guardado</b>Se suma entero a tu próximo Golpe.">+${v.charge} D</em>`);
  if (v?.scrap) carry.push(`<em class="carry scrap" data-tip="<b>Cartas destruidas</b>Las que han salido del mazo en esta campaña. Algunas reliquias se ceban con ellas.">Destruidas ${v.scrap}</em>`);
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

/** Las dos placas del guardia: de qué palo es inmune (hierro) y a cuál es débil (latón). */
function plates(s: Suit): string {
  const cfg = S.shown!.config;
  const own = cfg.ownMult ?? 0;
  const adv = cfg.advMult ?? 2;
  const immune =
    own === 0
      ? `<i class="plate iron" data-tip="<b>Inmune a ${SUIT_GLYPH[s]}</b>Las cartas de ${MATERIAL[s].toLowerCase()} no suman Daño contra su propio trono (sus poderes sí cuentan).">${suitSvg(s)}<b>×0</b></i>`
      : `<i class="plate ${own > 1 ? 'brass' : 'open'}" data-tip="<b>Sin inmunidad</b>Una reliquia la ha anulado: las cartas de ${MATERIAL[s].toLowerCase()} pegan ×${own} contra su trono.">${suitSvg(s)}<b>×${own}</b></i>`;
  const w = WEAK_TO[s];
  return `${immune}<i class="plate brass" data-tip="<b>Débil a ${SUIT_GLYPH[w]}</b>Las cartas de ${MATERIAL[w].toLowerCase()} suman el ${adv === 2 ? 'doble' : 'triple'} de Daño contra este trono.">${suitSvg(w)}<b>×${adv}</b></i>`;
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
      slot.insertAdjacentHTML('beforeend', `${rubble(s, 'rubble')}<div class="ruin">Trono caído</div>`);
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
      .map((r) => `<div class="storey" data-tip="<b>${cap(GUARD(r))} · ${HOUSE(s)}</b>Vida ${cfg.floorHp[r]} · Ataque ⚔ ${cfg.floorThreat[r]}. Sale cuando abates al que tiene delante.">${storeySvg(s, r)}<b>${FLOOR(r)}</b><span>${cfg.floorHp[r]}</span></div>`)
      .join('');
  }
  // guiones blandos: en la torre estrecha del móvil la etiqueta parte por sílaba y no se recorta
  const shy = (txt: string) => txt.replace(/Desarmado|Brecha/g, (w) => ({ Desarmado: 'Desar&shy;mado', Brecha: 'Bre&shy;cha' })[w]!);
  const fx = (Object.keys(TOWER_FX) as (keyof TowerFx)[]).filter((k) => top !== undefined && t.fx?.[k]);
  $('.tower-fx', el).innerHTML = [...(t.disarmed && top !== undefined ? ['<em class="fx fx-sobrecarga" data-tip="<b>Desarmado</b>Motín: este guardia no ataca hasta que caiga.">' + shy('Desarmado') + '</em>'] : []), ...fx.map((k) => `<em class="fx fx-${k}" data-tip="<b>${TOWER_FX[k].name}</b>${TOWER_FX[k].desc}">${shy(TOWER_FX[k].name)}</em>`)].join('');
  if (top !== undefined) {
    const hp = cfg.floorHp[top];
    const left = Math.max(0, hp - t.damage);
    const level = String(Math.min(3, Math.ceil((3 * t.damage) / hp)));
    $('.hp-fill', el).style.transform = `scaleX(${left / hp})`;
    $('.hp span', el).textContent = `${left} / ${hp}`;
    $('.cracks', el)?.setAttribute('data-level', level);
    $('.facade .storey-art', el)?.setAttribute('data-level', level);
    const threat = threatOf(v, t);
    $('.threat', el).innerHTML = t.disarmed ? '<span>Ataque</span><b class="off">⚔ 0</b>' : `<span>Ataque</span><b>⚔ ${threat}</b>`;
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
  $('#collapses').textContent = v.collapses ? `Mazo agotado ×${v.collapses}` : '';
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
      res.innerHTML = '<span class="reserve-label">Manga</span>';
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
    res.dataset.tip = `<b>La Manga</b>Te guardas aquí una carta de tu mano: no cuenta para el tamaño de la mano y se juega como si estuviera en ella. Una vez por turno y sin gastar el turno${v.reserveSize > 1 ? '' : '; si está lleno, la carta guardada vuelve a la mano'}. Elige una carta y pulsa el hueco (o la tecla Y).${v.stashed ? '<hr>Ya la usaste este turno.' : ''}`;
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
    S: (has('S') || cfg.alwaysPierce) && r ? 'sí' : '',
    D: shards ? `${shards}` : '',
    H: r?.repair ? `+${r.repair}` : '',
    C: r?.wallGain ? `+${r.wallGain}` : '',
  };
  const part: Record<Suit, string> = { S: '', D: `1/${cfg.shardDiv}`, H: cfg.repairDiv > 99 ? 'anulado' : `1/${cfg.repairDiv}`, C: `1/${cfg.wallDiv}` };
  el.innerHTML = SUITS.map(
    (s) =>
      `<span class="power s-${s} ${value[s] ? 'on' : ''}" data-tip="<b>${SUIT_GLYPH[s]} ${POWER[s][0]}</b>${POWER[s][1]}${part[s] ? ` Ahora: ${part[s]}.` : ''}<hr>Además de su Daño, cada palo activa su poder aunque no sume nada.">${suitSvg(s)}<b>${POWER[s][0]}</b>${value[s] ? `<em>${value[s]}</em>` : ''}</span>`,
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
  const final = v.players.length === 1 && S.campaign ? (v.chalk > 0 ? '<em class="m dim">↩ Se puede deshacer</em>' : '<em class="m dim">Sin Rebobinar: jugada definitiva</em>') : '';
  if (v.phase !== 'playing') {
    tag = '<span class="tag">Asalto terminado</span>';
    body = S.campaign ? '' : '<button id="btn-end">Ver resultado</button>';
  } else if (v.turnPlayer !== v.you) {
    tag = `<span class="tag">Turno de ${nameOf(v.turnPlayer)}</span>`;
    body = `<span class="hint">Mira la mesa y planea tu jugada${v.players.length > 1 ? '. Pulsa un trono para hacer una seña a tu conjura' : ''}.</span>`;
  } else if (!can) {
    tag = '<span class="tag">Tu turno</span>';
    body = '<span class="hint">…</span>';
  } else if (cards.length === 0) {
    tag = '<span class="tag go">Tu turno</span>';
    body = held().length ? '<span class="hint">Elige cartas y pulsa un trono.<span class="only-keys"> Teclas: 1–9 eligen, flechas mueven el foco, espacio golpea.</span><span class="only-pad"> Mando: A elige, X golpea, Y guarda en la manga.</span></span>' : '<span class="hint">No tienes cartas: pulsa PASAR.</span>';
  } else if (joker) {
    tag = '<span class="tag go">Motín</span>';
    body = `<span class="marks"><em class="m good">Desarma al guardia</em><em class="m good">Sin Contraataque</em>${final}</span><span class="hint">Pulsa un trono.</span>`;
  } else if (!formation) {
    tag = '<span class="tag">Formación inválida</span>';
    body = '<span class="hint">No forman ninguna jugada. Puedes descartarlas o guardar una en la manga.</span>';
  } else {
    const pv = previews(cards);
    const target = aim && pv[aim] ? aim : bestTarget(pv);
    const r = target ? pv[target]! : null;
    tag = `<span class="tag go">${FORMATION_NAME[formation]}</span>`;
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
    whisper('inmune', { material: MATERIAL[shownTarget].toLowerCase(), glyph: SUIT_GLYPH[shownTarget] });
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
        const extra = [fallen ? `cae${fallen > 1 ? 'n ' + fallen : ''}` : '', mine ? 'exacto' : ''].filter(Boolean);
        // en móvil la etiqueta ocupa el pie de un trono estrecho: va la forma corta (el amarillo ya dice «exacto»)
        const short = fallen ? `cae${fallen > 1 ? ` ${fallen}` : ''}` : 'exacto';
        tag.innerHTML = `−${dealt}${extra.length ? `<small data-short="${short}">${extra.join(' · ')}</small>` : ''}`;
        tag.classList.toggle('zero', dealt === 0);
        tag.classList.toggle('clean', mine);
      }
      el.appendChild(tag);
    }
  }
  $<HTMLButtonElement>('#btn-discard').disabled = !can || cards.length === 0;
  // cuántas cartas se descartarían: en un sello aparte, para que la etiqueta quepa siempre en un renglón
  const discardN = $('#discard-n');
  discardN.textContent = cards.length ? String(cards.length) : '';
  discardN.hidden = !cards.length;
  $('#btn-discard').setAttribute('aria-label', cards.length ? `Descartar ${cards.length} ${cards.length === 1 ? 'carta' : 'cartas'}` : 'Descartar');
  $<HTMLButtonElement>('#btn-clear').disabled = cards.length === 0;
  $('#btn-pass').hidden = !(can && held().length === 0);
  $('#btn-strike').hidden = !$('#btn-pass').hidden;
  $<HTMLButtonElement>('#btn-strike').disabled = !can || cards.length === 0;
  $<HTMLButtonElement>('#btn-stash').hidden = !v.reserveSize;
  $<HTMLButtonElement>('#btn-stash').disabled = !can || v.stashed || cards.length !== 1 || !v.hand.some((c) => c.id === cards[0].id);
  const undoBtn = $<HTMLButtonElement>('#btn-undo');
  undoBtn.hidden = !(S.campaign && v.players.length === 1);
  undoBtn.disabled = !can || !v.canUndo;
  $('.lbl', undoBtn).textContent = v.chalk > 0 ? '↩ Deshacer' : 'Sin deshacer';
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
  el.innerHTML = level > 0 ? `<b>Asedio</b><em>${level}</em>` : `<b>Asedio en</b><em>${Math.max(1, left)}</em>`;
  el.dataset.tip = `<b>Asedio final</b>Ningún asedio dura para siempre. Desde el turno ${start + 1}, y cada ${v.config.fatigueEvery ?? 2} turnos, sube un nivel: cada nivel da +${num(res)} de Multi a todos los Golpes y +1 de Ataque a todos los tronos.${level ? `<hr>Ahora: +${num(res * level)} de Multi y +${level} de Ataque.` : ''}`;
}

// ───────────────────────── Mazo y teclado ─────────────────────────

/** Abre (o cierra) el visor de cantera y escombrera. El orden real de la cantera nunca se enseña. */
export function toggleInspector(): void {
  const open = document.querySelector('.deck-modal');
  if (open) return closeModal(open);
  const v = S.shown;
  if (!v) return;
  const crew = v.players.length > 1 ? ', las manos y las mangas de tu conjura' : '';
  const tabs = [
    { label: 'Mazo', cards: v.unseen, note: `Lo que aún no has visto: el Mazo${crew}. Va ordenado por palo y número: el orden de robo es secreto.` },
    { label: 'Descarte', cards: v.discard, note: 'Lo ya jugado. Vuelve al Mazo la próxima vez que se agote.' },
  ];
  if (S.campaign) tabs.push({ label: 'Mazo de campaña', cards: S.campaign.run.deck, note: `Todas tus cartas. Destruidas en este asalto: ${v.burned}. Fuera de juego hasta el próximo asalto: ${v.exhausted}.` });
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
    el.innerHTML = LIVE_HTML;
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
const SIREN_QUIET: Record<string, string> = { clean: 'Golpe exacto: sin Contraataque.', huelga: 'Motín: sin Contraataque.', empty: 'No quedan cartas: sin Contraataque.' };

async function animate(ev: GameEvent, batch: GameEvent[]): Promise<void> {
  const v = S.shown!;
  switch (ev.e) {
    case 'play': {
      stepN = 0;
      logLine(`<b>${nameOf(ev.player)}</b> golpea la ${HOUSE(ev.target)} con ${fmt(ev.cards)} <i>(${FORMATION_NAME[ev.formation].toLowerCase()})</i>`);
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
      logLine(`<b>${nameOf(ev.player)}</b> se guarda una carta en la manga${ev.back ? ' y recupera la que había' : ''}.`, 'dim');
      sfx.flick();
      break;
    case 'fatigue':
      v.fatigue = ev.level;
      for (const s of SUITS) renderTower(s);
      renderFatigue();
      if (ev.level > 0) {
        banner(`Asedio ${ev.level}`, 'red', 'el asedio aprieta · Golpes y Contraataques pegan más');
        sfx.rumble(1 + ev.level);
        logLine(`Asedio final ${ev.level}: tus Golpes suman +${num((v.config.fatigueRes ?? 0.25) * ev.level)} de Multi y el Ataque de todos los tronos sube ${ev.level}.`, 'red');
        await wait(650);
      }
      break;
    case 'undo':
      banner('Rebobinar', 'yel', 'la jugada se deshace · el Mazo se baraja');
      sfx.stamp();
      logLine('Rebobinar: la última jugada se deshace y el Mazo se baraja de nuevo.', 'yel');
      await wait(700);
      break;
    case 'discard':
      logLine(`<b>${nameOf(ev.player)}</b> descarta ${fmt(ev.cards)}`, 'dim');
      await flyCards(ev.player, ev.cards, () => $('#disc-slot').getBoundingClientRect());
      v.discardCount += ev.cards.length;
      renderBunker();
      break;
    case 'joker':
      logLine(`<b>${nameOf(ev.player)}</b> desata un MOTÍN en la ${HOUSE(ev.target)}: guardia desarmado`, 'yel');
      await flyCards(ev.player, [ev.card], () => $('.floor-slot', towerEls[ev.target]).getBoundingClientRect());
      v.towers[ev.target].disarmed = true;
      renderTower(ev.target);
      banner('Motín', 'yel', 'no hay Contraataque');
      sfx.mutiny();
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
      logLine(ev.splash ? `Salpica: ${HOUSE(ev.tower)} −${ev.amount}` : `${HOUSE(ev.tower)} recibe −${ev.amount}`, 'dim');
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
      guardFall(el); // juice-ux: marca .banner-torn para el estandarte rasgado
      if (falls.length > 1 && falls[0] === ev) sfx.rumble(falls.length);
      else sfx.crash(ev.clean);
      platform.vibrate(90, 0.9);
      quake(Math.min(1, 0.45 + 0.2 * falls.length), x - innerWidth / 2, 60);
      if (ev.clean) {
        // el golpe maestro del juego: campana y sello de tinta sobre el trono
        sfx.bell();
        stampOn(el, '¡Exacto!', 's-clean');
        setTimeout(() => el.querySelector('.s-clean')?.remove(), 1600);
      }
      logLine(`¡Cae ${GUARD(ev.rank)} de la ${HOUSE(ev.tower)}!${ev.clean ? ' Golpe exacto: sin Contraataque, +1 de oro y robas 1.' : ''}`, 'yel');
      await wait(720);
      t.floors.shift();
      t.damage = ev.damage;
      t.disarmed = false;
      t.fx = {};
      if (t.floors.length && v.config.apuntalado?.includes(t.floors[0])) t.fx.apuntalado = true;
      renderTower(ev.tower);
      if (ev.towerDown) {
        throneFall(el); // juice-ux: corona que se parte (sonido y .crown-split)
        banner(HOUSE(ev.tower), 'yel', 'trono caído');
        await wait(900);
      }
      break;
    }
    case 'onda':
      floatText(towerEls[ev.tower], `Impulso −${ev.amount}`, 'clean small');
      logLine(`Impulso: el guardia siguiente de la ${HOUSE(ev.tower)} pierde ${ev.amount}.`, 'yel');
      await wait(260);
      break;
    case 'state': {
      const t = v.towers[ev.tower];
      t.fx = { ...t.fx, [ev.fx]: ev.on };
      renderTower(ev.tower);
      if (ev.on) {
        pop($(`.fx-${ev.fx}`, towerEls[ev.tower]));
        sfx.stamp();
        logLine(`${HOUSE(ev.tower)}: ${TOWER_FX[ev.fx].name.toLowerCase()}. ${TOWER_FX[ev.fx].desc}`, 'yel');
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
      if (ev.amount) logLine(`Escudo +${ev.amount} (${ev.total})`, 'dim');
      await wait(200);
      break;
    case 'hurt':
      v.integrity = ev.integrity;
      renderBunker();
      shake($('#bunker'), 0.4, 1, 0);
      floatText($('#bunker'), `−${ev.amount}`);
      logLine(`El Golpe te cuesta ${ev.amount} de Vida.`, 'red');
      await wait(280);
      break;
    case 'gold':
      // en sala, el oro del asalto se va sumando aquí; al cerrar el asalto llega la cuenta buena del servidor
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
      if (ev.amount) logLine(`Curas +${ev.amount} de Vida (${ev.total})`, 'dim');
      await wait(200);
      break;
    case 'siren': {
      endLive();
      if (!ev.card) {
        logLine(SIREN_QUIET[ev.reason] ?? 'Sin Contraataque.', 'dim');
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
          if (ev.taken >= 4 && v.reserveSize > 0 && v.reserve.length === 0) whisper('andamio');
        }
        sfx.sirenLand(ev.taken, ev.blocked);
        v.integrity = ev.integrity;
        v.wall = ev.wall;
        renderBunker();
        logLine(`CONTRAATAQUE ${glyph}: la ${HOUSE(ev.tower)} ataca ⚔ ${ev.threat}${ev.blocked ? ` · tu Escudo frena ${ev.blocked}` : ''} → ${ev.taken ? `Vida −${ev.taken}` : 'Vida a salvo'}`, ev.taken ? 'red' : 'dim');
        await wait(650);
      } else {
        const why = ev.reason === 'joker' ? 'sin palo, no ataca nadie' : ev.reason === 'ruin' ? `la ${HOUSE(ev.tower!)} ya ha caído` : ev.reason === 'sobrecarga' ? `la ${HOUSE(ev.tower!)} estaba desarmada ×1 y se salta el ataque` : `el guardia de la ${HOUSE(ev.tower!)} está desarmado`;
        logLine(`Contraataque ${glyph}: ${why}.`, 'dim');
        await wait(300);
      }
      break;
    }
    case 'collapse':
      banner('Mazo agotado', 'red', `el Descarte vuelve al Mazo · Vida −${ev.loss}`);
      sfx.crash();
      quake(0.8);
      v.integrity = ev.integrity;
      v.deckCount = v.discardCount;
      v.discardCount = 0;
      v.collapses += 1;
      renderBunker();
      logLine(`MAZO AGOTADO: se baraja el Descarte. Vida −${ev.loss}. La próxima vez costará más.`, 'red');
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
    if (first) logLine(S.tutorial ? 'Asalto de prácticas: sigue a la Maestra.' : c ? `Asalto ${c.run.stage}: ${stageDef(c.run.stage).name}.` : `Empieza el asalto. Sala ${S.session?.room ?? ''}.`, 'yel');
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
    <div class="meta"><span class="hot">${won ? 'ASALTO GANADO' : 'SIN VIDA'}</span><span>SALA ${S.session?.room ?? ''}</span></div>
    ${won ? rubble('H', 'end-art') : skyline('end-art')}
    <h1>${won ? 'Corte vencida' : 'Conjura deshecha'}</h1>
    <p>${won ? 'Los cuatro tronos han caído. La conjura sale del castillo por la puerta grande.' : 'Te quedaste sin Vida antes de que cayeran los tronos. Volved a intentarlo.'}</p>
    ${death ? causeHtml(death) : ''}
    <p>Guardias abatidos ${floors}/12 · Turnos ${v.turnCount} · Mazo agotado ×${v.collapses} · Vida final ${v.integrity}/${v.config.maxIntegrity}</p>
    <div class="row">
      ${isHost ? '<button class="primary" id="again">Otro asalto</button>' : '<button disabled>Esperando al anfitrión…</button>'}
      <button id="see">Ver la mesa</button>
      <button id="quit">Salir</button>
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
      return `${cap(MATERIAL[s])} <b>${cardValue(c) * m}</b>`;
    })
    .join(' · ');
}
