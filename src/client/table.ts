// La mesa de combate: torres, búnker, cinturón, marcador Fuerza × Resonancia, mano y la cola
// de eventos que anima cada jugada paso a paso.
import { BEATS, Card, FORMATION_NAME, GameEvent, MATERIAL, RANK_LABEL, SUITS, SUIT_GLYPH, StrikeResult, Suit, TOWER_FX, TowerFx, cardLabel, classify, previewStrike } from '../rules/engine';
import { BOSS, CONTRACT, LAST_STAGE, stageDef } from '../rules/run';
import { SPECIAL } from '../rules/specials';
import { TOOL } from '../rules/tools';
import type { ClientMsg } from '../shared/protocol';
import { bunkerArt, rubble, skyline, strip } from './art';
import { setScene, setTension, sfx } from './audio';
import { afterBatch, campaignAct, isRunHost, routeRun, runDo, stageIntro } from './campaign';
import { backEl, cardEl, setDeckBack, suitSvg } from './card';
import { $, $$, S, cap, closeModal, cycleSpeed, hideTip, nameOf, num, sortHand, speedLabel, toast, topModal } from './core';
import { CRACKS, banner, burst, chipAt, coins, dealIn, flash, floatText, fly, hitstop, pop, quake, restart, ribbon, shake, tear, wait } from './fx';
import { trackMeta } from './guild';
import { forget, sendMsg } from './net';
import { setScreen } from './router';
import { guidedStep, renderCoach, showTutorialEnd, skipTutorial, tutorialAct } from './tutorial-ui';
import { beltEl, deckModal, showRules, showSettings } from './widgets';

const handEls = new Map<string, HTMLDivElement>();
let towerEls = {} as Record<Suit, HTMLElement>;
/** Torre a la que se apunta (la que está bajo el puntero o se eligió con las flechas). */
let aim: Suit | null = null;
/** Pasos resueltos en el golpe en curso: marca el tono de la campanilla. */
let stepN = 0;

const WEAK_TO = Object.fromEntries(SUITS.map((s) => [BEATS[s], s])) as Record<Suit, Suit>; // torre → palo que la dobla
const FLOOR = (r: number) => RANK_LABEL[r];
const fmt = (cards: Card[]) => cards.map((c) => (c.sp ? `[${SPECIAL[c.sp].name}]` : cardLabel(c))).join(' ');

// ───────────────────────── Montaje ─────────────────────────

export function buildTable(): void {
  const c = S.campaign;
  const t = S.tutorial;
  setDeckBack(c?.run.deckId ?? 'obra');
  setScene('battle', c ? Math.min(c.run.stage, LAST_STAGE) : t ? 1 : 3, !!c?.run.boss);
  handEls.clear();
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
      <div class="beltbar" id="beltbar" hidden></div>
      <div class="status score" id="score"></div>
      <div class="hand" id="hand"></div>
      <div class="actions">
        <button id="btn-discard">Descartar</button>
        <button id="btn-clear">Soltar</button>
        <button id="btn-pass" hidden>Pasar</button>
      </div>
    </footer>
  </div>`;
  const towers = $('#towers');
  towerEls = {} as Record<Suit, HTMLElement>;
  for (const s of SUITS) {
    const el = document.createElement('div');
    el.className = 'tower';
    el.dataset.suit = s;
    el.innerHTML = `
      <div class="tower-tag"><span>${cap(MATERIAL[s])}</span>${suitSvg(s)}</div>
      ${strip(s)}
      <div class="tower-weak"><span>Débil a ${suitSvg(WEAK_TO[s])}</span><span>inmune a ${suitSvg(s)}</span></div>
      <div class="ladder"></div>
      <div class="floor-slot"></div>
      <div class="tower-fx"></div>
      <div class="hp"><div class="hp-fill"></div><span></span></div>
      <div class="threat"></div>`;
    el.onclick = () => onTower(s);
    el.onpointerenter = () => {
      if (aim === s) return;
      aim = s;
      renderScore();
    };
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
  $('#btn-pass').onclick = () => canAct() && act({ t: 'action', action: { type: 'pass' } });
  renderHud();
}

// ───────────────────────── Acciones ─────────────────────────

export const canAct = () => {
  const v = S.shown;
  const t = S.tutorial;
  return !!v && !S.busy && !S.waiting && S.queue.length === 0 && v.phase === 'playing' && v.turnPlayer === v.you && (!t || t.mode === 'do' || t.mode === 'free');
};
/** Las cartas elegidas, en el orden en que se eligieron. */
const selCards = (): Card[] => (S.shown ? S.selected.map((id) => S.shown!.hand.find((c) => c.id === id)).filter((c): c is Card => !!c) : []);
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

function onTower(s: Suit): void {
  const v = S.shown;
  if (!canAct() || !v || v.towers[s].floors.length === 0) return;
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

/** Cabecera: dónde estamos y cuánto oro hay. */
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
      boss ? `<div class="chip boss-chip" data-tip="<b>${boss.who} · ${boss.name}</b>${boss.desc}"><span>Jefe</span><b>${boss.who}</b></div>` : '',
      contract ? `<div class="chip contract-chip ${contract.risk ? 'risk' : ''}" data-tip="<b>Contrato · ${contract.name}</b>${contract.desc}<hr>Premio: ${contract.reward}."><span>${contract.risk ? 'Riesgo' : 'Contrato'}</span><b>${contract.name}</b></div>` : '',
      c.run.curse ? '<div class="chip boss-chip" data-tip="<b>Contrato maldito</b>La amenaza de todas las torres sube 1 en esta obra."><span>Maldito</span><b>+1 amenaza</b></div>' : '',
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
  if (v?.chain) carry.push(`<em class="carry chain" data-tip="<b>Onda sísmica</b>Racha de ${v.chain} golpe${v.chain > 1 ? 's' : ''} limpio${v.chain > 1 ? 's' : ''}: tu próximo golpe resuena +${num(0.5 * v.chain)}. Se corta si el golpe no es limpio.">Onda +${num(0.5 * v.chain)}</em>`);
  if (v?.charge) carry.push(`<em class="carry charge" data-tip="<b>Carga</b>Fuerza acumulada para tu próximo golpe.">Carga +${v.charge}</em>`);
  if (v?.scrap) carry.push(`<em class="carry scrap" data-tip="<b>Escombros</b>Cartas destruidas en esta campaña. Algunas herramientas se ceban con ellos.">Escombros ${v.scrap}</em>`);
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
      return `<div class="chip ${cls}" data-p="${p.id}"><span>${p.name}${off ? ' (bot)' : ''}</span><b>${p.handCount}</b></div>`;
    })
    .join('');
}

function renderTower(s: Suit): void {
  const v = S.shown;
  if (!v) return;
  const t = v.towers[s];
  const cfg = v.config;
  const el = towerEls[s];
  const top = t.floors[0];
  el.classList.toggle('fallen', top === undefined);
  el.classList.toggle('disarmed', t.disarmed);
  const all = S.campaign ? stageDef(S.campaign.run.stage).floors : [11, 12, 13];
  $('.ladder', el).innerHTML = all.map((r) => `<span class="${!t.floors.includes(r) ? 'down' : r === top ? 'now' : ''}">${FLOOR(r)}</span>`).join('');
  const key = String(top ?? 'ruin');
  if (el.dataset.floor !== key) {
    el.dataset.floor = key;
    const slot = $('.floor-slot', el);
    slot.innerHTML = '';
    if (top === undefined) slot.innerHTML = `${rubble(s, 'rubble')}<div class="ruin">Ruinas</div>`;
    else {
      const c = cardEl({ id: `${s}${top}`, suit: s, rank: top });
      dealIn(c, 0);
      $('.card-front', c).insertAdjacentHTML('beforeend', CRACKS);
      slot.appendChild(c);
    }
  }
  const fx = (Object.keys(TOWER_FX) as (keyof TowerFx)[]).filter((k) => top !== undefined && t.fx?.[k]);
  $('.tower-fx', el).innerHTML = fx.map((k) => `<em class="fx fx-${k}" data-tip="<b>${TOWER_FX[k].name}</b>${TOWER_FX[k].desc}">${TOWER_FX[k].name}</em>`).join('');
  if (top !== undefined) {
    const hp = cfg.floorHp[top];
    const left = Math.max(0, hp - t.damage);
    $('.hp-fill', el).style.width = `${(left / hp) * 100}%`;
    $('.hp span', el).textContent = `${left} / ${hp}`;
    $('.cracks', el)?.setAttribute('data-level', String(Math.min(3, Math.ceil((3 * t.damage) / hp))));
    const threat = cfg.floorThreat[top];
    $('.threat', el).innerHTML = t.disarmed ? '<span>Desarmada</span><b>0</b>' : `<span>Amenaza ${threat}</span><b>${'▮'.repeat(Math.min(threat, 12))}</b>`;
  }
}

function renderBunker(): void {
  const v = S.shown;
  if (!v) return;
  const cfg = v.config;
  const int = Math.max(0, v.integrity);
  const blocks = $('#int-blocks');
  blocks.innerHTML = Array.from({ length: cfg.maxIntegrity }, (_, i) => `<i class="${i < int ? '' : 'off'}"></i>`).join('');
  blocks.classList.toggle('danger', int <= 6);
  setTension(v.phase === 'playing' && int <= 6);
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

function renderHand(): void {
  const v = S.shown;
  if (!v) return;
  const hand = $('#hand');
  const cards = sortHand(v.hand);
  const ids = new Set(cards.map((c) => c.id));
  for (const [id, el] of handEls) {
    if (ids.has(id)) continue;
    el.remove();
    handEls.delete(id);
  }
  S.selected = S.selected.filter((id) => ids.has(id));
  let fresh = 0;
  const mid = (cards.length - 1) / 2;
  cards.forEach((c, i) => {
    let el = handEls.get(c.id);
    if (!el) {
      el = cardEl(c);
      const node = el;
      dealIn(node, fresh++ * 80);
      node.addEventListener('click', () => toggleCard(c.id));
      handEls.set(c.id, node);
    }
    if (hand.children[i] !== el) hand.insertBefore(el, hand.children[i] ?? null);
    // abanico: cada carta gira y baja un poco según lo lejos que esté del centro
    el.style.setProperty('--rot', `${((i - mid) * 2).toFixed(2)}deg`);
    el.style.setProperty('--dy', `${(Math.abs(i - mid) ** 1.5 * 1.2).toFixed(1)}px`);
    const at = S.selected.indexOf(c.id);
    el.classList.toggle('sel', at >= 0);
    el.dataset.key = i < 9 ? String(i + 1) : i === 9 ? '0' : '';
    if (at >= 0 && S.selected.length > 1) el.dataset.n = String(at + 1);
    else delete el.dataset.n;
  });
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
  if (v.phase !== 'playing') {
    tag = '<span class="tag">Obra terminada</span>';
    body = S.campaign ? '' : '<button id="btn-end">Ver resultado</button>';
  } else if (v.turnPlayer !== v.you) {
    tag = `<span class="tag">Turno de ${nameOf(v.turnPlayer)}</span>`;
    body = '<span class="hint">Mira la mesa y planea tu próxima jugada.</span>';
  } else if (!can) {
    tag = '<span class="tag">Tu turno</span>';
    body = '<span class="hint">…</span>';
  } else if (cards.length === 0) {
    tag = '<span class="tag go">Tu turno</span>';
    body = v.hand.length ? '<span class="hint">Elige cartas y pulsa una torre. Teclas: 1–9 eligen, flechas apuntan, espacio golpea.</span>' : '<span class="hint">No tienes cartas: pulsa PASAR.</span>';
  } else if (joker) {
    tag = '<span class="tag go">Huelga</span>';
    body = '<span class="marks"><em class="m good">Desarma el piso</em><em class="m good">La sirena calla</em></span><span class="hint">Pulsa una torre.</span>';
  } else if (!formation) {
    tag = '<span class="tag">Formación inválida</span>';
    body = '<span class="hint">No forman ninguna jugada. Puedes descartarlas.</span>';
  } else {
    const pv = previews(cards);
    const target = aim && pv[aim] ? aim : bestTarget(pv);
    const r = target ? pv[target]! : null;
    tag = `<span class="tag go">${FORMATION_NAME[formation]}</span>`;
    if (r && target) {
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
      ].join('');
      body = `<div class="calc" data-tip="<b>Previsualización de impacto</b>Fuerza × Resonancia = daño estimado contra ${MATERIAL[target]}. Las cartas se resuelven en el orden en que las elegiste.">
        <b class="f">${r.fuerza}</b><i>×</i><b class="r">${num(r.res)}</b><i>=</i><b class="t">${r.total}</b><span class="vs">contra ${MATERIAL[target]}</span></div>
        <span class="marks">${marks}</span>`;
    }
  }
  el.innerHTML = tag + body;
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
  $('#btn-pass').hidden = !(can && v.hand.length === 0);
  const guide = can ? guidedStep() : null;
  for (const [id, el] of handEls) el.classList.toggle('hint', !!guide && guide.cards!.includes(id) && !S.selected.includes(id));
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
}

// ───────────────────────── Mazo y teclado ─────────────────────────

/** Abre (o cierra) el visor de cantera y escombrera. El orden real de la cantera nunca se enseña. */
export function toggleInspector(): void {
  const open = document.querySelector('.deck-modal');
  if (open) return closeModal(open);
  const v = S.shown;
  if (!v) return;
  const crew = v.players.length > 1 ? ' y las manos de tu cuadrilla' : '';
  const tabs = [
    { label: 'Cantera', cards: v.unseen, note: `Lo que aún no has visto: la cantera${crew}. Va ordenado por palo y número: el orden de robo es secreto.` },
    { label: 'Escombrera', cards: v.discard, note: 'Lo ya jugado. Volverá a la cantera en el próximo colapso.' },
  ];
  if (S.campaign) tabs.push({ label: 'Mazo de campaña', cards: S.campaign.run.deck, note: `Todas tus cartas. Destruidas en esta obra: ${v.burned}. Agotadas hasta la próxima obra: ${v.exhausted}.` });
  deckModal('Mazo', tabs);
}

/** Atajos: 1–9 eligen carta, flechas apuntan, espacio o Enter golpea, Tab abre el mazo, Esc suelta. */
export function onTableKey(e: KeyboardEvent): void {
  if (S.screen !== 'table' || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === 'Tab') {
    e.preventDefault();
    return toggleInspector();
  }
  if (topModal() || document.querySelector('.end')) return;
  const v = S.shown;
  if (!v) return;
  if (/^[0-9]$/.test(e.key)) {
    const i = e.key === '0' ? 9 : Number(e.key) - 1;
    const card = sortHand(v.hand)[i];
    if (card) toggleCard(card.id);
    return;
  }
  if (e.key === 'Escape') return clearSelection();
  if (e.key === 'Delete' || e.key === 'Backspace') return discardSelection();
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const list = standingTargets();
    if (!list.length) return;
    const cards = selCards();
    const at = list.indexOf(aim ?? (classify(cards) ? bestTarget(previews(cards)) : null) ?? list[0]);
    aim = list[(at + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    return renderScore();
  }
  if (e.key === ' ' || e.key === 'Enter') {
    if ((e.target as HTMLElement | null)?.closest?.('button, .choice, .belt-slot')) return;
    e.preventDefault();
    if (!canAct()) return;
    const cards = selCards();
    if (v.hand.length === 0) return act({ t: 'action', action: { type: 'pass' } });
    const target = aim && v.towers[aim].floors.length ? aim : isJoker(cards) ? (guidedStep()?.target ?? standingTargets()[0]) : classify(cards) ? bestTarget(previews(cards)) : null;
    if (target) onTower(target);
  }
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
    let el = mine ? handEls.get(c.id) : undefined;
    let from: DOMRect;
    if (el) {
      from = el.getBoundingClientRect();
      handEls.delete(c.id);
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
  if (mine) v.hand = v.hand.filter((h) => !cards.some((c) => c.id === h.id));
  else v.players.find((p) => p.id === player)!.handCount -= cards.length;
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
      await hitstop(Math.min(1, ev.total / hp));
      break;
    }
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
      const doomed = $('.floor-slot .card', towerEls[ev.tower]);
      const falls = batch.filter((b) => b.e === 'floorDown');
      const [x] = towerMid(ev.tower);
      await hitstop(1);
      if (doomed) tear(doomed);
      if (falls.length > 1 && falls[0] === ev) sfx.rumble(falls.length);
      else sfx.crash();
      quake(Math.min(1, 0.45 + 0.2 * falls.length), x - innerWidth / 2, 60);
      if (ev.clean) {
        sfx.bell();
        floatText(towerEls[ev.tower], 'Limpio', 'clean');
      }
      logLine(`¡Cae la ${FLOOR(ev.rank)} de ${MATERIAL[ev.tower]}!${ev.clean ? ' Golpe limpio.' : ''}`, 'yel');
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
      floatText(towerEls[ev.tower], 'Onda sísmica', 'clean small');
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
      logLine(`${cardLabel(ev.card)} se destruye: un escombro más.`, 'red');
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
      const glyph = `${RANK_LABEL[ev.card.rank]}${SUIT_GLYPH[ev.card.suit]}`;
      if (ev.reason === 'strike' && ev.tower) {
        restart(towerEls[ev.tower], 'strike');
        const striker = $('.floor-slot .card', towerEls[ev.tower]);
        if (striker) {
          restart(striker, 'attack');
          setTimeout(() => striker.classList.remove('attack'), 800);
        }
        if (ev.taken) {
          flash();
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
        const why = ev.reason === 'joker' ? 'comodín, silencio' : ev.reason === 'ruin' ? `${MATERIAL[ev.tower!]} ya es ruina` : ev.reason === 'sobrecarga' ? `${MATERIAL[ev.tower!]} está sobrecargada y se salta el golpe` : `${MATERIAL[ev.tower!]} está desarmada`;
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
      logLine(`COLAPSO: se rebaraja la escombrera. Búnker −${ev.loss}`, 'red');
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
