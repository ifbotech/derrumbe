import '@fontsource/archivo-black';
import '@fontsource/unifrakturcook/700.css';
import '@fontsource/grenze-gotisch/900.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/700.css';
import '@fontsource/space-mono/700.css';
import './styles.css';
import { Action, BEATS, Card, GameEvent, GameState, MATERIAL, PlayerView, RANK_LABEL, FORMATION_NAME, RuleError, SUITS, SUIT_GLYPH, Suit, applyAction, cardValue, classify, previewStrike, viewFor } from '../rules/engine';
import { ACHIEVEMENTS, claim, deckUnlocked, noteEvents, noteRun, unlockedPool, unlocksOf } from '../rules/achievements';
import { BOSS, BOSSES, DECK, DECKS, Meta, RELIC, RELICS, RELIC_SLOTS, Run, RunAction, STAGES, UPGRADES, buyUpgrade, finishBattle, newMeta, newRun, removeCost, rerollCost, runAction, settle, stagesCleared, startStage, trackEvents } from '../rules/run';
import { SPECIAL, SPECIALS } from '../rules/specials';
import { glyphSvg } from './glyphs';
import { TUTORIAL_INTRO, TUTORIAL_PLAYER, TUTORIAL_STEPS, createTutorial } from '../rules/tutorial';
import type { ClientMsg, LobbyInfo, ServerMsg } from '../shared/protocol';
import { ALL_CARDS, backEl, bindEyes, cardEl, ensureDefs, ferreteroEl, portraitEl, setDeckBack, suitSvg, tileEl } from './card';
import { bunkerArt, rubble, skyline, strip } from './art';
import { musicIsOn, setScene, setTension, sfx, soundOn, startMusic, toggleMusic, toggleSound } from './audio';
import { rulesHtml } from './rules-text';

// ───────────────────────── Estado ─────────────────────────

interface Session {
  room: string;
  playerId: string;
  token: string;
}
const app = document.getElementById('app')!;
const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;

let session: Session | null = JSON.parse(sessionStorage.getItem('derrumbe') ?? 'null');
let lobby: LobbyInfo | null = null;
let shown: PlayerView | null = null;
type Screen = 'home' | 'lobby' | 'table' | 'deck' | 'camp' | 'run';
const RUN_PLAYER = 'tu';
let screen: Screen | null = null;
let connected = false;
let busy = false;
let waiting = false; // acción enviada, esperando al servidor
const queue: { view: PlayerView; events: GameEvent[] }[] = [];
const selected = new Set<string>();
const handEls = new Map<string, HTMLDivElement>();
let towerEls = {} as Record<Suit, HTMLElement>;

/** Partida guiada: corre en local con el mismo motor, sin servidor. */
interface Tutorial {
  state: GameState;
  step: number;
  intro: number;
  mode: 'intro' | 'do' | 'explain' | 'free';
  /** Qué hacer al terminar (o saltar) el tutorial; por ejemplo, empezar la primera campaña. */
  then?: () => void;
}
const TUTO_KEY = 'derrumbe:tutorial';
const tutorialDone = () => localStorage.getItem(TUTO_KEY) === '1';
let tutorial: Tutorial | null = null;
const guidedStep = () => (tutorial && tutorial.mode === 'do' ? TUTORIAL_STEPS[tutorial.step] : null);

const WEAK_TO = Object.fromEntries(SUITS.map((s) => [BEATS[s], s])) as Record<Suit, Suit>; // torre → palo que la dobla
const FLOOR = (r: number) => RANK_LABEL[r];
/** 'ACERO' → 'Acero': la gótica solo se lee bien en caja baja. */
const cap = (s: string) => s[0] + s.slice(1).toLowerCase();
const fmt = (cards: Card[]) => cards.map((c) => (c.sp ? `[${SPECIAL[c.sp].name}]` : `${RANK_LABEL[c.rank]}${SUIT_GLYPH[c.suit]}${c.plus ? `+${c.plus}` : ''}`)).join(' ');
const nameOf = (id: string) => (shown?.players.find((p) => p.id === id) ?? lobby?.players.find((p) => p.id === id))?.name ?? '???';
const speed = () => (queue.length > 0 ? 0.3 : 1);
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms * speed()));

// ───────────────────────── Red ─────────────────────────

let ws: WebSocket | null = null;
let retry = 0;

function sendMsg(msg: ClientMsg): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  else toast('Sin conexión con el servidor');
}

function connect(): void {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onopen = () => {
    connected = true;
    retry = 0;
    if (session) sendMsg({ t: 'rejoin', ...session });
    updateConn();
  };
  ws.onclose = (ev) => {
    connected = false;
    updateConn();
    if (ev.code === 4000) {
      forget();
      toast('Sesión abierta en otra pestaña');
    }
    setTimeout(connect, Math.min(5000, 400 * 2 ** retry++));
  };
  ws.onmessage = (e) => onMsg(JSON.parse(e.data as string) as ServerMsg);
}

function forget(): void {
  session = null;
  tutorial = null;
  campaign = null;
  sessionStorage.removeItem('derrumbe');
  lobby = null;
  shown = null;
  queue.length = 0;
  setScreen('home');
}

function onMsg(msg: ServerMsg): void {
  switch (msg.t) {
    case 'joined':
      session = { room: msg.room, playerId: msg.playerId, token: msg.token };
      sessionStorage.setItem('derrumbe', JSON.stringify(session));
      history.replaceState(null, '', `?sala=${msg.room}`);
      break;
    case 'run':
      applyRun(msg.run);
      break;
    case 'lobby':
      lobby = msg.lobby;
      if (!lobby.inGame) {
        if (campaign?.online) campaign = null;
        shown = null;
        queue.length = 0;
        screen = null;
        setScreen('lobby');
      } else if (screen === 'table' && shown) renderPlayers();
      break;
    case 'state':
      queue.push({ view: msg.view, events: msg.events });
      if (screen !== 'table') setScreen('table');
      void pump();
      break;
    case 'left':
      forget();
      break;
    case 'error':
      waiting = false;
      toast(msg.message);
      if (screen === 'table' && shown) renderInteractive();
      break;
  }
}

function updateConn(): void {
  const el = $('.conn');
  if (!el) return;
  el.textContent = connected ? '● servidor en línea' : '○ conectando con el servidor…';
  el.classList.toggle('bad', !connected);
}

function toast(text: string): void {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showRules(): void {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-box"><h2>Reglas <button class="x">CERRAR</button></h2>${rulesHtml(shown?.config)}</div>`;
  modal.addEventListener('click', (e) => {
    if (e.target === modal || (e.target as HTMLElement).classList.contains('x')) modal.remove();
  });
  document.body.appendChild(modal);
}

// ───────────────────────── Pantallas ─────────────────────────

function setScreen(next: Screen): void {
  if (screen === next && next === 'table') return;
  screen = next;
  document.querySelectorAll('.end, .banner, .fly, .flash').forEach((e) => e.remove());
  if (next !== 'table' && next !== 'run') setScene('menu');
  if (next === 'home') renderHome();
  else if (next === 'deck') renderDeck();
  else if (next === 'camp') renderCamp();
  else if (next === 'run') renderRun();
  else if (next === 'lobby') renderLobby();
  else buildTable();
}

function renderHome(): void {
  const savedName = localStorage.getItem('derrumbe:name') ?? '';
  const code = new URLSearchParams(location.search).get('sala') ?? '';
  app.innerHTML = `
  <div class="home">
    <section class="home-left">
      ${skyline('hero-bg')}
      <h1 class="title"><span>Derr</span><span class="cut">umbe</span></h1>
    </section>
    <section class="home-right">
      <h2>Entrar a la obra</h2>
      <button class="primary big" id="camp">Campaña<small>roguelike · en solitario</small></button>
      <button id="tutorial">Partida guiada (tutorial)</button>
      <div class="or">en línea, 1 a 4</div>
      <div class="row"><input id="name" maxlength="12" autocomplete="off" placeholder="NOMBRE" value="${savedName.replace(/"/g, '')}" /><button id="create">Crear sala</button></div>
      <div class="row"><input id="code" maxlength="4" autocomplete="off" placeholder="CÓDIGO" value="${code.replace(/[^A-Za-z]/g, '').slice(0, 4)}" /><button id="join">Unirse</button></div>
      <div class="row"><button class="ghost" id="rules">Reglas</button><button class="ghost" id="deck">Colección</button><button class="ghost" id="music"></button></div>
      <p class="conn"></p>
    </section>
  </div>`;
  const name = () => {
    const v = $<HTMLInputElement>('#name').value.trim();
    localStorage.setItem('derrumbe:name', v);
    return v;
  };
  $('#create').onclick = () => sendMsg({ t: 'create', name: name() });
  const join = () => sendMsg({ t: 'join', room: $<HTMLInputElement>('#code').value, name: name() });
  $('#join').onclick = join;
  $('#code').onkeydown = (e) => e.key === 'Enter' && join();
  $('#rules').onclick = showRules;
  $('#deck').onclick = () => setScreen('deck');
  $('#tutorial').onclick = () => startTutorial();
  $('#camp').onclick = () => setScreen('camp');
  const music = $('#music');
  const musicLabel = () => (music.textContent = musicIsOn() ? 'Música: sí' : 'Música: no');
  musicLabel();
  music.onclick = () => {
    toggleMusic();
    musicLabel();
  };
  updateConn();
}

function renderLobby(): void {
  if (!lobby || !session) return;
  const isHost = lobby.host === session.playerId;
  const seats = [0, 1, 2, 3]
    .map((i) => {
      const p = lobby!.players[i];
      if (!p) return '<div class="seat empty">— libre —</div>';
      const tags = [p.id === lobby!.host ? 'ANFITRIÓN' : '', p.id === session!.playerId ? 'TÚ' : '', p.connected ? '' : 'DESCONECTADO'].filter(Boolean);
      return `<div class="seat ${p.connected ? '' : 'off'}"><span>${p.name}</span><span>${tags.map((t) => `<small>${t}</small>`).join(' ')}</span></div>`;
    })
    .join('');
  app.innerHTML = `
  <div class="lobby">
    <div class="lobby-code">
      <div><div class="meta"><span class="hot">SALA</span><span>${lobby.players.length}/4 EN OBRA</span></div><h1>${lobby.room}</h1></div>
      <p>Comparte este código o el enlace con tu cuadrilla. Podéis jugar de 1 a 4.</p>
    </div>
    <div class="seats">${seats}</div>
    <div class="lobby-side">
      <div class="panel">
        <h3>Modo</h3>
        <div class="row">
          <button data-m="clasica" class="${lobby.mode === 'clasica' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>Clásica</button>
          <button data-m="campana" class="${lobby.mode === 'campana' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>Campaña</button>
        </div>
        <p class="note">${lobby.mode === 'campana' ? 'Roguelike cooperativo: 8 obras con mazo, oro y herramientas compartidos. Se juega con las mejoras y la baraja del anfitrión (' + DECK[runOpts().deck].name + '), y todos ganáis renombre y logros.' : 'Una sola obra: cuatro torres de tres pisos.'}</p>
      </div>
      <div class="panel" ${lobby.mode === 'campana' ? 'hidden' : ''}>
        <h3>Dificultad</h3>
        <div class="row">
          <button data-d="obra" class="${lobby.difficulty === 'obra' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>Obra</button>
          <button data-d="brutal" class="${lobby.difficulty === 'brutal' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>Brutal</button>
        </div>
      </div>
      <button class="primary" id="start" ${isHost ? '' : 'disabled'}>${isHost ? 'Empezar demolición' : 'Espera al anfitrión'}</button>
      <button id="copy">Copiar enlace</button>
      <button id="rules">Reglas</button>
      <button class="ghost" id="leave">Salir de la sala</button>
    </div>
  </div>`;
  app.querySelectorAll<HTMLButtonElement>('[data-d]').forEach((b) => (b.onclick = () => sendMsg({ t: 'difficulty', value: b.dataset.d as 'obra' | 'brutal' })));
  app.querySelectorAll<HTMLButtonElement>('[data-m]').forEach((b) => (b.onclick = () => sendMsg({ t: 'mode', value: b.dataset.m as 'clasica' | 'campana' })));
  $('#start').onclick = () => sendMsg({ t: 'start', ...runOpts() });
  $('#copy').onclick = () => {
    void navigator.clipboard?.writeText(`${location.origin}/?sala=${lobby!.room}`);
    toast('Enlace copiado');
  };
  $('#rules').onclick = showRules;
  $('#leave').onclick = () => sendMsg({ t: 'leave' });
}

// ───────────────────────── Mesa ─────────────────────────

function buildTable(): void {
  setDeckBack(campaign?.run.deckId ?? 'obra');
  setScene('battle', campaign ? campaign.run.stage : tutorial ? 1 : 3, !!campaign?.run.boss);
  handEls.clear();
  selected.clear();
  app.innerHTML = `
  <div class="table-screen">
    <header class="bar">
      <div class="brand">Derrumbe</div>
      <div class="room">${tutorial ? 'TUTORIAL' : campaign ? `OBRA ${campaign.run.stage}/${STAGES.length} · ${STAGES[campaign.run.stage - 1].name}` : `SALA ${session?.room ?? ''}`}</div>
      ${campaign ? `<div class="chip gold"><span>Oro</span><b id="gold-n">${campaign.run.gold}</b></div>` : ''}
      <div class="players" id="players"></div>
      <button id="btn-music"></button>
      <button id="btn-sound"></button>
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
        ${campaign ? toolsPanel(campaign.run) : ''}
        <div class="panel log" id="log"></div>
      </aside>
    </div>
    <footer class="tray">
      <div class="coach" id="coach" hidden></div>
      <div class="status" id="status"></div>
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
      <div class="hp"><div class="hp-fill"></div><span></span></div>
      <div class="threat"></div>`;
    el.onclick = () => onTower(s);
    towers.appendChild(el);
    towerEls[s] = el;
  }
  $('#deck-slot').appendChild(backEl());
  const soundBtn = $('#btn-sound');
  const soundLabel = () => (soundBtn.textContent = soundOn() ? 'Sonido: sí' : 'Sonido: no');
  soundLabel();
  soundBtn.onclick = () => {
    toggleSound();
    soundLabel();
  };
  const musicBtn = $('#btn-music');
  const musicLabel = () => (musicBtn.textContent = musicIsOn() ? 'Música: sí' : 'Música: no');
  musicLabel();
  musicBtn.onclick = () => {
    toggleMusic();
    musicLabel();
  };
  $('#btn-rules').onclick = showRules;
  const leave = $('#btn-leave');
  if (tutorial?.then) leave.textContent = 'Saltar tutorial';
  leave.onclick = () => {
    if (campaign && !campaign.online) return setScreen('camp');
    if (tutorial?.then) {
      // saltar el tutorial previo a la campaña
      const go = tutorial.then;
      localStorage.setItem(TUTO_KEY, '1');
      tutorial = null;
      return go();
    }
    if (leave.dataset.sure) return tutorial ? forget() : sendMsg({ t: 'leave' });
    leave.dataset.sure = '1';
    leave.textContent = '¿Seguro?';
    setTimeout(() => {
      delete leave.dataset.sure;
      leave.textContent = 'Salir';
    }, 2500);
  };
  $('#btn-clear').onclick = () => {
    selected.clear();
    renderInteractive();
  };
  $('#btn-discard').onclick = () => {
    if (!canAct() || selected.size === 0) return;
    if (guidedStep()) return toast('Ahora no: sigue el paso del tutorial');
    act({ t: 'action', action: { type: 'discard', cards: [...selected] } });
  };
  $('#btn-pass').onclick = () => canAct() && act({ t: 'action', action: { type: 'pass' } });
}

const canAct = () => !!shown && !busy && !waiting && queue.length === 0 && shown.phase === 'playing' && shown.turnPlayer === shown.you && (!tutorial || tutorial.mode === 'do' || tutorial.mode === 'free');
const selCards = () => (shown ? shown.hand.filter((c) => selected.has(c.id)) : []);

function act(msg: ClientMsg): void {
  if (tutorial && msg.t === 'action') return tutorialAct(msg.action);
  if (campaign && !campaign.online && msg.t === 'action') return campaignAct(msg.action);
  waiting = true;
  sendMsg(msg);
  selected.clear();
  renderInteractive();
}

function onTower(s: Suit): void {
  if (!canAct() || !shown || shown.towers[s].floors.length === 0) return;
  const cards = selCards();
  const step = guidedStep();
  if (step) {
    const ok = step.target === s && cards.length === step.cards!.length && cards.every((c) => step.cards!.includes(c.id));
    if (!ok) return toast(cards.length === step.cards!.length ? 'Casi: golpea la torre marcada' : 'Primero selecciona las cartas marcadas');
  }
  if (cards.length === 1 && cards[0].suit === 'X' && !cards[0].sp) return act({ t: 'action', action: { type: 'joker', card: cards[0].id, target: s } });
  if (!classify(cards)) return;
  act({ t: 'action', action: { type: 'attack', cards: cards.map((c) => c.id), target: s } });
}

function log(html: string, cls = ''): void {
  const el = $('#log');
  if (!el) return;
  const p = document.createElement('p');
  p.className = cls;
  p.innerHTML = html;
  el.appendChild(p);
  while (el.children.length > 80) el.firstChild!.remove();
  el.scrollTop = el.scrollHeight;
}

function setNum(id: string, text: string): void {
  const el = $(id);
  if (!el || el.textContent === text) return;
  const first = el.textContent === '';
  el.textContent = text;
  if (first) return;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
}

function renderPlayers(): void {
  if (!shown) return;
  $('#players').innerHTML = shown.players
    .map((p) => {
      const off = lobby?.players.find((l) => l.id === p.id)?.connected === false;
      const cls = [p.id === shown!.turnPlayer && shown!.phase === 'playing' ? 'turn' : '', p.id === shown!.you ? 'me' : '', off ? 'off' : ''].join(' ');
      return `<div class="chip ${cls}" data-p="${p.id}"><span>${p.name}${off ? ' (bot)' : ''}</span><b>${p.handCount}</b></div>`;
    })
    .join('');
}

function renderTower(s: Suit): void {
  if (!shown) return;
  const t = shown.towers[s];
  const cfg = shown.config;
  const el = towerEls[s];
  const top = t.floors[0];
  el.classList.toggle('fallen', top === undefined);
  el.classList.toggle('disarmed', t.disarmed);
  $('.ladder', el).innerHTML = [11, 12, 13].map((r) => `<span class="${!t.floors.includes(r) ? 'down' : r === top ? 'now' : ''}">${FLOOR(r)}</span>`).join('');
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
  if (top !== undefined) {
    const hp = cfg.floorHp[top];
    const left = Math.max(0, hp - t.damage);
    $('.hp-fill', el).style.width = `${(left / hp) * 100}%`;
    $('.hp span', el).textContent = `${left} / ${hp}`;
    $('.cracks', el)?.setAttribute('data-level', String(Math.min(3, Math.ceil((3 * t.damage) / hp))));
    const threat = cfg.floorThreat[top];
    $('.threat', el).innerHTML = t.disarmed ? '<span>Desarmada</span><b>0</b>' : `<span>Amenaza ${threat}</span><b>${'▮'.repeat(threat)}</b>`;
  }
}

function renderBunker(): void {
  if (!shown) return;
  const cfg = shown.config;
  const int = Math.max(0, shown.integrity);
  const blocks = $('#int-blocks');
  blocks.innerHTML = Array.from({ length: cfg.maxIntegrity }, (_, i) => `<i class="${i < int ? '' : 'off'}"></i>`).join('');
  blocks.classList.toggle('danger', int <= 6);
  setTension(shown.phase === 'playing' && int <= 6);
  $('.bunker-art')?.setAttribute('data-level', String(Math.min(3, Math.floor((1 - int / cfg.maxIntegrity) * 4))));
  $('#wall-blocks').innerHTML = Array.from({ length: cfg.wallCap }, (_, i) => `<i class="${i < shown!.wall ? '' : 'off'}"></i>`).join('');
  setNum('#int-num', `${int}/${cfg.maxIntegrity}`);
  setNum('#wall-num', `${shown.wall}/${cfg.wallCap}`);
  setNum('#deck-n', String(Math.max(0, shown.deckCount)));
  setNum('#disc-n', String(Math.max(0, shown.discardCount)));
  $('#collapses').textContent = shown.collapses ? `Colapsos ${shown.collapses}` : '';
  const slot = $('#siren-slot');
  const id = shown.lastSiren?.id ?? '';
  if (slot.dataset.card !== id) {
    slot.dataset.card = id;
    slot.innerHTML = '';
    if (shown.lastSiren) {
      const c = cardEl(shown.lastSiren, { faceDown: true });
      slot.appendChild(c);
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('flipped')));
    }
  }
}

function sortedHand(): Card[] {
  const order = 'SDHCX';
  return [...shown!.hand].sort((a, b) => (a.rank || 99) - (b.rank || 99) || order.indexOf(a.suit) - order.indexOf(b.suit));
}

function renderHand(): void {
  if (!shown) return;
  const hand = $('#hand');
  const cards = sortedHand();
  const ids = new Set(cards.map((c) => c.id));
  for (const [id, el] of handEls) {
    if (!ids.has(id)) {
      el.remove();
      handEls.delete(id);
      selected.delete(id);
    }
  }
  let fresh = 0;
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
    el.classList.toggle('sel', selected.has(c.id));
  });
  hand.classList.toggle('locked', !canAct());
}

function toggleCard(id: string): void {
  if (!canAct()) return;
  const step = guidedStep();
  if (step && !step.cards!.includes(id)) return toast('En este paso usa las cartas marcadas');
  if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  sfx.select();
  renderInteractive();
}

/** Estado de turno, selección, previsualización de daño y botones. */
function renderInteractive(): void {
  if (!shown) return;
  renderHand();
  const status = $('#status');
  const can = canAct();
  const cards = selCards();
  const joker = cards.length === 1 && cards[0].suit === 'X' && !cards[0].sp;
  const formation = classify(cards);
  document.querySelectorAll('.preview').forEach((p) => p.remove());
  for (const s of SUITS) towerEls[s].classList.remove('targetable');

  if (shown.phase !== 'playing') {
    status.innerHTML = '<span class="tag">Obra terminada</span><button id="btn-end">Ver resultado</button>';
    $('#btn-end').onclick = showEnd;
  } else if (shown.turnPlayer !== shown.you) status.innerHTML = `<span class="tag">Turno de ${nameOf(shown.turnPlayer)}</span><span class="hint">Mira la mesa y planea tu próxima jugada.</span>`;
  else if (!can) status.innerHTML = '<span class="tag">Tu turno</span><span class="hint">…</span>';
  else if (cards.length === 0)
    status.innerHTML = shown.hand.length
      ? '<span class="tag go">Tu turno</span><span class="hint">Elige cartas (sola, grupo, doble par, full, póker, escalera o color) y pulsa una torre.</span>'
      : '<span class="tag go">Tu turno</span><span class="hint">No tienes cartas: pulsa PASAR.</span>';
  else if (joker) status.innerHTML = '<span class="tag go">Huelga</span><span class="hint">Pulsa una torre: su piso queda desarmado y la sirena no suena.</span>';
  else if (formation) {
    const total = cards.reduce((a, c) => a + (c.sp ? 0 : cardValue(c)), 0);
    const target = SUITS.find((s) => shown!.towers[s].floors.length > 0)!;
    const mult = previewStrike(shown.towers, cards, target, shown.config).mult;
    const sp = cards.filter((c) => c.sp).map((c) => `<b>${SPECIAL[c.sp!].name}:</b> ${SPECIAL[c.sp!].desc}`).join(' ');
    status.innerHTML = `<span class="tag go">${FORMATION_NAME[formation]}${mult !== 1 ? ` ×${mult}` : ''} · ${total}</span><span class="hint">${sp || 'Pulsa una torre para golpear.'}</span>`;
  } else status.innerHTML = '<span class="tag">Formación inválida</span><span class="hint">No es grupo ni escalera. Puedes descartarlas.</span>';

  if (can && (joker || formation)) {
    for (const s of SUITS) {
      const t = shown.towers[s];
      if (!t.floors.length) continue;
      const el = towerEls[s];
      el.classList.add('targetable');
      const pv = document.createElement('div');
      pv.className = 'preview';
      if (joker) pv.innerHTML = 'Desarmar';
      else {
        const res = previewStrike(shown.towers, cards, s, shown.config);
        const dealt = res.dealt[s] ?? 0;
        const fallen = res.fallen[s] ?? 0;
        const extra = [fallen ? `cae${fallen > 1 ? 'n ' + fallen : ''}` : '', res.clean && fallen ? 'limpio' : '', res.wallGain ? `muro +${res.wallGain}` : '', res.repair ? `repara +${res.repair}` : ''].filter(Boolean);
        pv.innerHTML = `−${dealt}${extra.length ? `<small>${extra.join(' · ')}</small>` : ''}`;
        pv.classList.toggle('zero', dealt === 0);
      }
      el.appendChild(pv);
    }
  }
  $<HTMLButtonElement>('#btn-discard').disabled = !can || cards.length === 0;
  $('#btn-discard').textContent = cards.length ? `Descartar (${cards.length})` : 'Descartar';
  $<HTMLButtonElement>('#btn-clear').disabled = cards.length === 0;
  $('#btn-pass').hidden = !(can && shown.hand.length === 0);
  const guide = can ? guidedStep() : null;
  for (const [id, el] of handEls) el.classList.toggle('hint', !!guide && guide.cards!.includes(id) && !selected.has(id));
  const ready = !!guide && cards.length === guide.cards!.length;
  for (const s of SUITS) towerEls[s].classList.toggle('hint-target', ready && guide!.target === s);
}

function renderAll(): void {
  if (!shown || screen !== 'table') return;
  renderPlayers();
  for (const s of SUITS) renderTower(s);
  renderBunker();
  renderInteractive();
}

// ───────────────────────── Efectos ─────────────────────────

const CRACKS = `<svg class="cracks" viewBox="0 0 250 350" data-level="0">${[
  ['c1', 'M152,4 L139,58 L161,92 L133,138 L149,178'],
  ['c2', 'M4,252 L52,237 L79,263 L118,241 L131,202'],
  ['c3', 'M246,302 L197,287 L177,245 L150,231 M177,245 L205,214 L196,188'],
]
  .map(([c, d]) => `<path class="${c}" d="${d}"/><path class="${c} in" d="${d}"/>`)
  .join('')}</svg>`;

/** Entrada de carta: vuela boca abajo, se voltea y estampa sus pintas. */
function dealIn(el: HTMLElement, delay: number): void {
  el.style.setProperty('--d', `${delay}ms`);
  el.classList.add('deal');
  setTimeout(() => el.classList.remove('deal'), delay + 1700);
}

/** Escombros que saltan desde un punto de la pantalla. */
function burst(x: number, y: number, n = 16): void {
  const colors = ['var(--ink)', 'var(--red)', '#f1ebdc', 'var(--hazard)'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'debris';
    const size = 5 + Math.random() * 12;
    d.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size * (0.5 + Math.random())}px;background:${colors[i % colors.length]}`;
    document.body.appendChild(d);
    const ang = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 150;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - 60;
    const spin = (Math.random() - 0.5) * 720;
    d.animate(
      [
        { transform: 'translate(-50%,-50%)' },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) rotate(${spin * 0.6}deg)`, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy + 170}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(0.2, 0.6, 0.6, 1)', fill: 'forwards' },
    );
    setTimeout(() => d.remove(), 1050);
  }
}

/** La figura se rasga por su costura diagonal y las dos mitades caen. */
function tear(card: HTMLElement): void {
  const r = card.getBoundingClientRect();
  const half = (clip: string, frames: Keyframe[]) => {
    const c = card.cloneNode(true) as HTMLElement;
    c.classList.remove('deal', 'attack');
    c.classList.add('fly');
    c.style.cssText = `left:${r.left}px;top:${r.top}px;--w:${r.width}px;clip-path:${clip};`;
    document.body.appendChild(c);
    c.animate(frames, { duration: 820, easing: 'cubic-bezier(0.5, 0, 0.85, 0.4)', fill: 'forwards' });
    setTimeout(() => c.remove(), 840);
  };
  half('polygon(-10% -10%, 110% -10%, 110% 43.4%, -10% 56.6%)', [{ transform: 'none' }, { transform: 'translate(-16px,-20px) rotate(-6deg)', offset: 0.22 }, { transform: 'translate(-80px,180px) rotate(-40deg)', opacity: 0 }]);
  half('polygon(-10% 56.6%, 110% 43.4%, 110% 110%, -10% 110%)', [{ transform: 'none' }, { transform: 'translate(16px,16px) rotate(5deg)', offset: 0.22 }, { transform: 'translate(70px,210px) rotate(32deg)', opacity: 0 }]);
  card.style.visibility = 'hidden';
  burst(r.left + r.width / 2, r.top + r.height / 2, 22);
}

function restart(el: Element, cls: string): void {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

function floatText(host: HTMLElement, text: string, cls = ''): void {
  const f = document.createElement('div');
  f.className = `float ${cls}`;
  f.textContent = text;
  host.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

function banner(text: string, cls = '', small = ''): void {
  const b = document.createElement('div');
  b.className = `banner ${cls}`;
  b.innerHTML = `<div>${text}${small ? `<small>${small}</small>` : ''}</div>`;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1050);
}

/** Aviso suave: una cinta que baja, se queda un momento y se va. */
function ribbon(text: string): void {
  document.querySelectorAll('.ribbon').forEach((r) => r.remove());
  const r = document.createElement('div');
  r.className = 'ribbon';
  r.textContent = text;
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 1700);
}

function flash(): void {
  const f = document.createElement('div');
  f.className = 'flash';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 520);
}

const quake = () => restart($('.table-screen'), 'quake');

function fly(el: HTMLElement, from: DOMRect, to: DOMRect, delay: number): Promise<void> {
  el.classList.remove('sel', 'deal');
  el.classList.add('fly');
  el.style.cssText = `left:${from.left}px;top:${from.top}px;--w:${from.width}px;`;
  document.body.appendChild(el);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const spin = (Math.random() - 0.5) * 50;
  const anim = el.animate(
    [
      { transform: 'none' },
      { transform: `translate(${dx * 0.1}px, ${dy * 0.1 - 40}px) rotate(${-spin / 3}deg) scale(1.12)`, offset: 0.3 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.8)` },
    ],
    { duration: 420 * speed(), delay: delay * speed(), easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)', fill: 'forwards' },
  );
  // El temporizador garantiza que la partida avance aunque la pestaña esté en segundo plano
  // (los navegadores pausan las animaciones de pestañas ocultas).
  const total = (420 + delay) * speed() + 60;
  return Promise.race([anim.finished.catch(() => undefined), new Promise((r) => setTimeout(r, total))]).then(() => el.remove());
}

/** Las cartas salen de la mano (si son mías) o de la ficha del jugador y vuelan al destino. */
async function flyCards(player: string, cards: Card[], dest: HTMLElement): Promise<void> {
  const to = dest.getBoundingClientRect();
  const mine = player === shown!.you;
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
    sfx.card();
    return fly(el, from, to, i * 70);
  });
  if (mine) shown!.hand = shown!.hand.filter((h) => !cards.some((c) => c.id === h.id));
  else shown!.players.find((p) => p.id === player)!.handCount -= cards.length;
  await Promise.all(jobs);
  renderHand();
  renderPlayers();
}

async function animate(ev: GameEvent): Promise<void> {
  const v = shown!;
  switch (ev.e) {
    case 'play':
      log(`<b>${nameOf(ev.player)}</b> golpea ${MATERIAL[ev.target]} con ${fmt(ev.cards)} <i>(${FORMATION_NAME[ev.formation].toLowerCase()})</i>`);
      await flyCards(ev.player, ev.cards, $('.floor-slot', towerEls[ev.target]));
      v.discardCount += ev.cards.length;
      break;
    case 'discard':
      log(`<b>${nameOf(ev.player)}</b> descarta ${fmt(ev.cards)}`, 'dim');
      await flyCards(ev.player, ev.cards, $('#disc-slot'));
      v.discardCount += ev.cards.length;
      renderBunker();
      break;
    case 'joker':
      log(`<b>${nameOf(ev.player)}</b> declara HUELGA en ${MATERIAL[ev.target]}: piso desarmado`, 'yel');
      await flyCards(ev.player, [ev.card], $('.floor-slot', towerEls[ev.target]));
      v.towers[ev.target].disarmed = true;
      renderTower(ev.target);
      banner('Huelga', 'yel', 'la sirena no suena');
      sfx.build();
      await wait(800);
      break;
    case 'pass':
      log(`<b>${nameOf(ev.player)}</b> pasa`, 'dim');
      break;
    case 'hit': {
      const t = v.towers[ev.tower];
      t.damage = Math.min(ev.damage, ev.hp);
      renderTower(ev.tower);
      restart(towerEls[ev.tower], 'hit');
      floatText(towerEls[ev.tower], `−${ev.amount}`, ev.splash ? 'splash' : '');
      {
        const r = $('.floor-slot', towerEls[ev.tower]).getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, ev.splash ? 5 : 10);
      }
      sfx.hit();
      log(ev.splash ? `Esquirlas: ${MATERIAL[ev.tower]} −${ev.amount}` : `${MATERIAL[ev.tower]} recibe −${ev.amount}`, 'dim');
      await wait(ev.splash ? 220 : 420);
      break;
    }
    case 'floorDown': {
      const t = v.towers[ev.tower];
      const doomed = $('.floor-slot .card', towerEls[ev.tower]);
      if (doomed) tear(doomed);
      sfx.crash();
      quake();
      if (ev.clean) floatText(towerEls[ev.tower], 'Limpio');
      log(`¡Cae la ${FLOOR(ev.rank)} de ${MATERIAL[ev.tower]}!${ev.clean ? ' Golpe limpio.' : ''}`, 'yel');
      await wait(760);
      t.floors.shift();
      t.damage = ev.damage;
      t.disarmed = false;
      renderTower(ev.tower);
      if (ev.towerDown) {
        banner(cap(MATERIAL[ev.tower]), 'yel', 'torre en ruinas');
        await wait(900);
      }
      break;
    }
    case 'wall':
      v.wall = ev.total;
      renderBunker();
      sfx.build();
      log(`Muro +${ev.amount} (${ev.total})`, 'dim');
      await wait(220);
      break;
    case 'hurt':
      v.integrity = ev.integrity;
      renderBunker();
      restart($('#bunker'), 'shake');
      floatText($('#bunker'), `−${ev.amount}`);
      log(`La carga le cuesta ${ev.amount} al búnker.`, 'red');
      await wait(300);
      break;
    case 'gold':
      if (campaign?.online) campaign.run.gold += ev.amount;
      refreshRunHud();
      sfx.coin();
      log(`+${ev.amount} de oro`, 'yel');
      await wait(200);
      break;
    case 'repair':
      v.integrity = ev.total;
      renderBunker();
      sfx.build();
      if (ev.amount) log(`Búnker reparado +${ev.amount} (${ev.total})`, 'dim');
      await wait(220);
      break;
    case 'siren': {
      if (!ev.card) {
        log(ev.reason === 'clean' ? 'Golpe limpio: la sirena calla.' : ev.reason === 'huelga' ? 'Huelga: la sirena calla.' : 'No quedan cartas: la sirena calla.', 'dim');
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
        flash();
        restart($('#bunker'), 'shake');
        if (ev.taken) floatText($('#bunker'), `−${ev.taken}`);
        sfx.hit();
        v.integrity = ev.integrity;
        v.wall = ev.wall;
        renderBunker();
        log(`SIRENA ${glyph}: ${MATERIAL[ev.tower]} golpea ${ev.threat}${ev.blocked ? ` · el muro frena ${ev.blocked}` : ''} → ${ev.taken ? `búnker −${ev.taken}` : 'búnker a salvo'}`, ev.taken ? 'red' : 'dim');
        await wait(650);
      } else {
        const why = ev.reason === 'joker' ? 'comodín, silencio' : ev.reason === 'ruin' ? `${MATERIAL[ev.tower!]} ya es ruina` : `${MATERIAL[ev.tower!]} está desarmada`;
        log(`Sirena ${glyph}: ${why}.`, 'dim');
        await wait(300);
      }
      break;
    }
    case 'collapse':
      banner('Colapso', 'red', `la escombrera vuelve a la cantera · búnker −${ev.loss}`);
      sfx.crash();
      quake();
      v.integrity = ev.integrity;
      v.deckCount = v.discardCount;
      v.discardCount = 0;
      v.collapses += 1;
      renderBunker();
      log(`COLAPSO: se rebaraja la escombrera. Búnker −${ev.loss}`, 'red');
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
      await wait(260);
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

async function pump(): Promise<void> {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const batch = queue.shift()!;
    waiting = false;
    if (shown && batch.events.length && screen === 'table') {
      renderInteractive(); // bloquea la mano mientras se anima
      if (campaign) noteEvents(meta, batch.events);
      for (const ev of batch.events) {
        try {
          await animate(ev);
        } catch (err) {
          console.error(err);
        }
        if (screen !== 'table') break;
      }
    }
    if (screen !== 'table') break;
    const first = !shown;
    shown = batch.view;
    if (first) log(tutorial ? 'Obra de prácticas: sigue al capataz.' : campaign ? `Obra ${campaign.run.stage} de ${STAGES.length}: ${STAGES[campaign.run.stage - 1].name}.` : `Empieza la obra. Sala ${session?.room ?? ''}.`, 'yel');
    renderAll();
  }
  busy = false;
  if (!shown || screen !== 'table') return;
  renderCoach();
  renderInteractive();
  if (campaign) {
    trackMeta();
    bossIntro();
  }
  if (campaign && campaign.run.phase !== 'battle') {
    setTimeout(routeRun, 900); // deja ver el último derrumbe antes de cambiar de pantalla
    return;
  }
  if (shown.phase !== 'playing') showEnd();
}

function showEnd(): void {
  if (!shown || document.querySelector('.end')) return;
  if (tutorial) return showTutorialEnd();
  if (campaign || lobby?.mode === 'campana') return; // en campaña el final lo pinta la pantalla de campaña
  const won = shown.phase === 'won';
  won ? sfx.win() : sfx.lose();
  const floors = 12 - SUITS.reduce((a, s) => a + shown!.towers[s].floors.length, 0);
  const isHost = lobby?.host === shown.you;
  const el = document.createElement('div');
  el.className = `end ${won ? 'won' : 'lost'}`;
  el.innerHTML = `
    <div class="meta"><span class="hot">${won ? 'OBRA COMPLETADA' : 'BÚNKER PERDIDO'}</span><span>SALA ${session?.room ?? ''}</span></div>
    ${won ? rubble('H', 'end-art') : skyline('end-art')}
    <h1>${won ? 'Demolido' : 'Sepultados'}</h1>
    <p>${won ? 'Las cuatro torres son escombro. La cuadrilla sale caminando.' : 'El búnker cedió antes que las torres. Volved a intentarlo.'}</p>
    <p>Pisos demolidos ${floors}/12 · Turnos ${shown.turnCount} · Colapsos ${shown.collapses} · Integridad final ${shown.integrity}/${shown.config.maxIntegrity}</p>
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

function renderDeck(): void {
  const have = (list: string[], id: string) => list.includes(id);
  const achName = (id: string | null | undefined) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? '';
  const sec = (title: string, n: number, of: number, note: string) =>
    `<section class="col-sec"><h3 class="sec">${title} <span>${n}/${of}</span></h3><p class="col-note">${note}</p><div class="deck-grid"></div></section>`;
  const seenSp = SPECIALS.filter((s) => have(meta.seen.specials, s.id)).length;
  const seenRel = RELICS.filter((r) => have(meta.seen.relics, r.id)).length;
  const seenBoss = BOSSES.filter((b) => have(meta.seen.bosses, b.id)).length;
  app.innerHTML = `
  <div class="deck">
    <header class="deck-head"><div><h1>Colección</h1><p class="sub">Lo que has descubierto jugando. Lo que falta espera boca abajo.</p></div><button id="back">Volver</button></header>
    ${sec('Barajas', DECKS.filter((d) => deckUnlocked(meta, d.id)).length, DECKS.length, 'Cada baraja inicial tiene su dorso. Se desbloquean con logros y se eligen en el gremio.')}
    ${sec('Baraja francesa', 54, 54, 'Las 52 cartas de siempre y dos comodines.')}
    ${sec('Cartas especiales', seenSp, SPECIALS.length, 'Aparecen aquí cuando te tocan en una campaña. Las ocho últimas son legendarias.')}
    ${sec('Herramientas', seenRel, RELICS.length, 'Las que has llevado alguna vez. Llévalas todas y el Ferretero se unirá a tu mazo.')}
    ${sec('Personajes', 1 + seenBoss, 1 + BOSSES.length, 'El Ferretero y los jefes de obra que has derrotado.')}
  </div>`;
  const grids = app.querySelectorAll<HTMLElement>('.deck-grid');
  const hidden = (title: string, desc: string, deck?: string) => {
    const box = choice(backEl(deck), title, desc, null, null);
    box.classList.add('unknown');
    return box;
  };
  for (const d of DECKS) {
    grids[0].appendChild(deckUnlocked(meta, d.id) ? choice(backEl(d.id), d.name, d.desc, null, null) : hidden(d.name, `Bloqueada. Logro: ${achName(d.unlock)}.`, d.id));
  }
  const order = (c: Card) => (c.rank > 10 ? 0 : c.rank === 1 ? 1 : c.rank === 0 ? 3 : 2);
  [...ALL_CARDS].sort((a, b) => order(a) - order(b)).forEach((c) => grids[1].appendChild(cardEl(c)));
  for (const s of SPECIALS) {
    grids[2].appendChild(
      have(meta.seen.specials, s.id) ? choice(cardEl({ id: `g-${s.id}`, suit: 'X', rank: 0, sp: s.id }), s.name, s.desc, null, null) : hidden(s.locked ? 'Legendaria' : '???', s.locked ? `Logro: ${achName(s.locked)}.` : 'Aún no te ha tocado.'),
    );
  }
  for (const r of RELICS) grids[3].appendChild(have(meta.seen.relics, r.id) ? choice(tileEl(r.id, r.name, 'relic'), r.name, r.desc, null, null) : hidden('???', 'Aún no la has llevado.'));
  grids[4].appendChild(choice(ferreteroEl(), 'El Ferretero', 'Vende, gruñe y cobra.', null, null));
  for (const b of BOSSES) grids[4].appendChild(have(meta.seen.bosses, b.id) ? choice(portraitEl(`j-${b.id}`, b.who), b.who, `${b.name}: ${b.desc}`, null, null) : hidden('???', 'Un jefe de obra que aún no has derrotado.'));
  $('#back').onclick = () => setScreen('home');
}

ensureDefs();
bindEyes();
addEventListener('pointerdown', startMusic, { once: true });
setScreen(new URLSearchParams(location.search).has('baraja') ? 'deck' : 'home');
connect();

// ───────────────────────── Partida guiada ─────────────────────────

function startTutorial(then?: () => void): void {
  tutorial = { state: createTutorial(), step: 0, intro: 0, mode: 'intro', then };
  session = null;
  lobby = null;
  shown = null;
  queue.length = 0;
  screen = null;
  history.replaceState(null, '', location.pathname);
  queue.push({ view: viewFor(tutorial.state, TUTORIAL_PLAYER), events: [] });
  setScreen('table');
  void pump();
}

function tutorialAct(action: Action): void {
  const t = tutorial!;
  try {
    const res = applyAction(t.state, TUTORIAL_PLAYER, action);
    t.state = res.state;
    selected.clear();
    if (t.mode === 'do') t.mode = 'explain';
    queue.push({ view: viewFor(res.state, TUTORIAL_PLAYER), events: res.events });
    renderCoach();
    void pump();
  } catch (err) {
    toast(err instanceof RuleError ? err.message : 'Jugada inválida');
  }
}

function renderCoach(): void {
  const el = $('#coach');
  if (!el) return;
  el.hidden = !tutorial;
  if (!tutorial) return;
  const t = tutorial;
  const moving = busy || queue.length > 0;
  let head: string;
  let title: string;
  let body: string;
  let btn = '';
  if (t.mode === 'intro') {
    const s = TUTORIAL_INTRO[t.intro];
    head = `Intro ${t.intro + 1}/${TUTORIAL_INTRO.length}`;
    title = s.title;
    body = s.text;
    btn = t.intro + 1 < TUTORIAL_INTRO.length ? 'Siguiente' : 'Empezar';
  } else {
    const s = TUTORIAL_STEPS[t.step];
    head = `Paso ${t.step + 1}/${TUTORIAL_STEPS.length}`;
    title = s.title;
    if (t.mode === 'explain') {
      body = moving ? 'Mira lo que pasa en la mesa…' : s.after!;
      btn = moving ? '' : 'Continuar';
    } else body = s.say;
  }
  el.innerHTML = `<div class="who">Capataz<small>${head}</small></div><div><h4>${title}</h4><p>${body}</p></div>${btn ? `<button class="primary" id="coach-next">${btn}</button>` : '<span></span>'}`;
  const next = $('#coach-next', el);
  if (next) next.onclick = coachNext;
}

function coachNext(): void {
  const t = tutorial;
  if (!t) return;
  if (t.mode === 'intro') {
    if (++t.intro >= TUTORIAL_INTRO.length) t.mode = 'do';
  } else if (t.mode === 'explain') {
    t.step = Math.min(t.step + 1, TUTORIAL_STEPS.length - 1);
    t.mode = TUTORIAL_STEPS[t.step].cards ? 'do' : 'free';
  }
  sfx.select();
  renderCoach();
  renderInteractive();
}

function showTutorialEnd(): void {
  if (!shown) return;
  const won = shown.phase === 'won';
  won ? sfx.win() : sfx.lose();
  const el = document.createElement('div');
  el.className = `end ${won ? 'won' : 'lost'}`;
  el.innerHTML = `
    <div class="meta"><span class="hot">TUTORIAL ${won ? 'COMPLETADO' : 'FALLIDO'}</span></div>
    ${won ? rubble('D', 'end-art') : skyline('end-art')}
    <h1>${won ? 'Listo para<br>la obra' : 'Sepultados'}</h1>
    <p>${won ? 'Ya conoces los golpes, los materiales, los poderes de cada palo, la sirena, el muro, el golpe limpio y la huelga. En una obra real las torres tienen tres pisos y pegan más fuerte: coordina con tu cuadrilla.' : 'Pasa hasta en las mejores cuadrillas. Repite el tutorial con calma.'}</p>
    <div class="row"><button class="primary" id="t-home">${tutorial?.then ? 'A la campaña' : 'Jugar de verdad'}</button><button id="t-again">Repetir tutorial</button><button id="t-rules">Reglas</button></div>`;
  document.body.appendChild(el);
  const then = tutorial?.then;
  if (won) localStorage.setItem(TUTO_KEY, '1');
  $('#t-home', el).onclick = () => {
    if (!then) return forget();
    localStorage.setItem(TUTO_KEY, '1');
    tutorial = null;
    then();
  };
  $('#t-again', el).onclick = () => startTutorial(then);
  $('#t-rules', el).onclick = showRules;
}

// ───────────────────────── Campaña (roguelike) ─────────────────────────
// En solitario corre en local (como el tutorial) y se guarda en localStorage; en sala online
// la lleva el servidor y aquí solo se pinta lo que llega. El gremio (mejoras, logros, colección)
// vive siempre en el navegador de cada jugador.

const META_KEY = 'derrumbe:meta';
const RUN_KEY = 'derrumbe:run';
const SETTLED_KEY = 'derrumbe:settled';
const DECK_KEY = 'derrumbe:deck';

interface Campaign {
  run: Run;
  online: boolean;
  state: GameState | null;
}
let campaign: Campaign | null = null;
let ascensionPick = 0;
let deckPick = localStorage.getItem(DECK_KEY) ?? 'obra';
let hubTab: 'ups' | 'ach' = 'ups';
let lastGold = -1;
let lastGain = 0;
/** Para descubrir cartas nuevas y presentar al jefe una sola vez. */
let seenRun = 0;
let seenSerial = 0;
let seenStage = 0;

function loadJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
const meta: Meta = (() => {
  const base = newMeta();
  const old = loadJson<Partial<Meta>>(META_KEY) ?? {};
  return { ...base, ...old, ach: { ...old.ach }, stats: { ...base.stats, ...old.stats }, seen: { ...base.seen, ...old.seen } };
})();
const saveMeta = () => localStorage.setItem(META_KEY, JSON.stringify(meta));
function savedCampaign(): Campaign | null {
  const c = loadJson<Campaign>(RUN_KEY);
  return c && c.run && Array.isArray(c.run.pool) ? c : null; // descarta guardados de versiones viejas
}
function saveCampaign(): void {
  const c = campaign;
  if (!c || c.online) return;
  if (c.run.phase === 'won' || c.run.phase === 'lost') localStorage.removeItem(RUN_KEY);
  else localStorage.setItem(RUN_KEY, JSON.stringify(c));
}
const isRunHost = () => !!campaign && (!campaign.online || lobby?.host === session?.playerId);
const runOpts = () => ({ up: meta.up, ascension: Math.min(ascensionPick, meta.ascMax), deck: deckUnlocked(meta, deckPick) ? deckPick : 'obra', pool: unlockedPool(meta) });

const UP_GLYPH: Record<string, string> = { cimientos: 'encofrado', caja: 'hucha', seguro: 'puntales', interes: 'chatarrero', tienda: 'cinta', manos: 'gemelo' };
const ACH_GLYPH: Record<string, string> = {
  primera: 'maza', capataz: 'casco', media: 'andamio', madre: 'estandarte', asc3: 'plomada', doblepar: 'gemelos', color: 'cortavidrios', full: 'dados',
  poker: 'comodin', golpe100: 'bola', golpe300: 'nitro', limpio10: 'cincel', pisos100: 'taladro', pisos500: 'dinamita', intacto: 'sacos', rico: 'hucha',
  coleccion: 'incognita', ferretero: 'paleta', jefes: 'metralla', 'j-doble': 'sordina', 'j-escasez': 'chatarrero', 'j-sequia': 'botiquin',
  'j-intemperie': 'acido', 'j-blindaje': 'encofrado', 'j-furia': 'dinamita', 'j-inestable': 'piqueta',
};

/** Abona el renombre de una campaña terminada, una sola vez por campaña. */
function maybeSettle(run: Run): void {
  if (run.phase !== 'won' && run.phase !== 'lost') return;
  if (localStorage.getItem(SETTLED_KEY) === String(run.id)) return;
  localStorage.setItem(SETTLED_KEY, String(run.id));
  lastGain = settle(meta, run);
  saveMeta();
}

/** Pasa al gremio lo que ha ocurrido y avisa de los logros nuevos. */
function trackMeta(): void {
  if (campaign) noteRun(meta, campaign.run);
  const fresh = claim(meta);
  saveMeta();
  fresh.forEach((a, i) => setTimeout(() => achToast(a.name, a.renown, unlocksOf(a.id)), i * 900));
}

function achToast(name: string, renown: number, unlock: string | null): void {
  let stack = $('.ach-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'ach-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = 'ach-toast';
  el.innerHTML = `<small>Logro</small><b>${name}</b><span>+${renown} ✦${unlock ? ` · ${unlock}` : ''}</span>`;
  stack.appendChild(el);
  sfx.coin();
  setTimeout(() => el.remove(), 5200);
}

function toolsPanel(run: Run, withBoss = true): string {
  const boss = withBoss && run.boss ? BOSS[run.boss] : null;
  const tools = run.relics.map((id) => `<li title="${RELIC[id].desc}">${glyphSvg(id, 'ico')}<div><b>${RELIC[id].name}</b><span>${RELIC[id].desc}</span></div></li>`).join('');
  return `<div class="panel tools"><h3><span>Herramientas</span><span>${run.relics.length}/${RELIC_SLOTS}</span></h3>
    ${boss ? `<p class="boss"><b>${boss.who} · ${boss.name}</b> ${boss.desc}</p>` : ''}
    <ul>${tools || '<li class="none">Aún no tienes ninguna.</li>'}</ul></div>`;
}

function refreshRunHud(): void {
  const el = $('#gold-n');
  if (el && campaign) el.textContent = String(campaign.run.gold);
}

// ── gremio ──

function renderCamp(): void {
  campaign = null;
  const saved = savedCampaign();
  ascensionPick = Math.min(ascensionPick, meta.ascMax);
  if (!deckUnlocked(meta, deckPick)) deckPick = 'obra';
  const ups = UPGRADES.map((u) => {
    const level = meta.up[u.id] ?? 0;
    const cost = u.costs[level];
    const pips = u.costs.map((_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
    return `<div class="up">${glyphSvg(UP_GLYPH[u.id] ?? 'encofrado', 'badge')}<div><b>${u.name}</b><span>${u.desc}</span><div class="pips">${pips}</div></div>
      <button data-up="${u.id}" ${cost === undefined || meta.renown < cost ? 'disabled' : ''}>${cost === undefined ? 'Máx.' : `${cost} ✦`}</button></div>`;
  }).join('');
  const done = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
  const achs = ACHIEVEMENTS.map((a) => {
    const [now, goal] = a.progress(meta);
    const ok = !!meta.ach[a.id];
    const unlock = unlocksOf(a.id);
    return `<div class="ach ${ok ? 'ok' : ''}">${glyphSvg(ACH_GLYPH[a.id] ?? 'estandarte', 'badge')}<div><b>${a.name}</b><span>${a.desc}${unlock ? ` <em>Desbloquea: ${unlock}.</em>` : ''}</span>
      <div class="bar-prog"><i style="width:${Math.round((Math.min(now, goal) / goal) * 100)}%"></i></div></div>
      <div class="ach-r">${ok ? 'Hecho' : goal > 1 ? `${now}/${goal}` : ''}<b>+${a.renown} ✦</b></div></div>`;
  }).join('');
  const decks = DECKS.map((d) => {
    const open = deckUnlocked(meta, d.id);
    const need = d.unlock ? ACHIEVEMENTS.find((a) => a.id === d.unlock)?.name : '';
    return `<button class="deck-opt ${d.id === deckPick ? 'on' : ''}" data-deck="${d.id}" ${open ? '' : 'disabled'}><span class="deck-back" data-back="${d.id}"></span><span class="deck-txt"><b>${d.name}</b><span>${open ? d.desc : `Bloqueada. Logro: ${need}.`}</span></span></button>`;
  }).join('');
  const asc = meta.ascMax > 0 ? `<div class="asc"><span>Ascenso</span>${Array.from({ length: meta.ascMax + 1 }, (_, i) => `<button data-asc="${i}" class="${i === ascensionPick ? 'on' : ''}">${i}</button>`).join('')}<small>Cada ascenso: torres +15 % y renombre +25 %.</small></div>` : '';
  app.innerHTML = `
  <div class="camp">
    <header class="deck-head"><div><h1>El gremio</h1></div><div class="purse"><b>${meta.renown} ✦</b><span>renombre · ${meta.runs} campañas · ${meta.wins} ganadas</span></div></header>
    <div class="camp-grid">
      <section class="panel camp-run"><div class="scroll">
        <p>Abres un <b>sobre</b> de cartas especiales y sales a demoler <b>ocho obras</b>. Tras cada una cobras oro, te llevas una carta incógnita y pasas por la <b>ferretería</b>. Ganes o pierdas, vuelves con <b>renombre</b>.</p>
        <div class="route">${STAGES.map((s, i) => `<div class="stop ${i < meta.best ? 'done' : ''} ${s.boss ? 'boss' : ''}" title="${s.name}"><b>${i + 1}</b><span>${s.name}</span></div>`).join('')}</div>
        <h3 class="sec">Baraja inicial</h3>
        <div class="deck-opts">${decks}</div>
        ${asc}
        </div>
        <div class="row">
          <button id="back">Volver</button>
          ${saved ? `<button class="primary big" id="resume">Continuar<small>obra ${saved.run.stage} · ${saved.run.gold} de oro</small></button>` : ''}
          <button class="${saved ? '' : 'primary'} big" id="new">Nueva campaña<small>${saved ? 'abandona la actual' : DECK[deckPick].name}</small></button>
        </div>
      </section>
      <section class="panel camp-ups">
        <div class="row tabs"><button data-tab="ups" class="${hubTab === 'ups' ? 'on' : ''}">Mejoras</button><button data-tab="ach" class="${hubTab === 'ach' ? 'on' : ''}">Logros ${done}/${ACHIEVEMENTS.length}</button></div>
        <div class="scroll">${hubTab === 'ups' ? ups : achs}</div>
      </section>
    </div>
  </div>`;
  $('#back').onclick = () => setScreen('home');
  app.querySelectorAll<HTMLElement>('[data-back]').forEach((slot) => slot.appendChild(backEl(slot.dataset.back)));
  const on = (sel: string, fn: (b: HTMLButtonElement) => void) => app.querySelectorAll<HTMLButtonElement>(sel).forEach((b) => (b.onclick = () => fn(b)));
  on('[data-up]', (b) => {
    if (buyUpgrade(meta, b.dataset.up!)) {
      saveMeta();
      sfx.build();
      renderCamp();
    }
  });
  on('[data-asc]', (b) => {
    ascensionPick = Number(b.dataset.asc);
    renderCamp();
  });
  on('[data-tab]', (b) => {
    hubTab = b.dataset.tab as 'ups' | 'ach';
    renderCamp();
  });
  on('[data-deck]', (b) => {
    deckPick = b.dataset.deck!;
    localStorage.setItem(DECK_KEY, deckPick);
    renderCamp();
  });
  const resume = $('#resume');
  if (resume) resume.onclick = () => {
    campaign = savedCampaign();
    if (!campaign) return renderCamp();
    if (campaign.run.phase === 'battle' && campaign.state) enterStage(false);
    else setScreen('run');
  };
  $('#new').onclick = () => {
    if (saved) {
      saved.run.phase = 'lost'; // abandonar cobra el renombre de lo ya superado
      maybeSettle(saved.run);
    }
    const begin = () => {
      campaign = { run: newRun(runOpts(), (Math.random() * 2 ** 31) | 0), online: false, state: null };
      lastGold = -1;
      saveCampaign();
      setScreen('run');
    };
    // la primera campaña empieza por la partida guiada (se puede saltar)
    if (tutorialDone()) begin();
    else startTutorial(begin);
  };
}

// ── decisiones: van al servidor en sala online, o al reductor local ──

function runDo(a: RunAction): void {
  const c = campaign;
  if (!c) return;
  if (!isRunHost()) return toast('En campaña decide el anfitrión.');
  if (c.online) return sendMsg({ t: 'run', action: a });
  const err = runAction(c.run, a);
  if (err) {
    if (err.includes('oro')) ferreteroSays('poor');
    return toast(err);
  }
  saveCampaign();
  if (c.run.phase === 'battle') return enterStage(true);
  renderRun();
  afterRunChange();
}

/** Llega una campaña del servidor (sala online). */
function applyRun(run: Run): void {
  campaign = { run, online: true, state: null };
  routeRun();
}

/** Al cambiar de campaña, se olvida lo ya mostrado de la anterior. */
function syncSeen(run: Run): void {
  if (seenRun === run.id) return;
  seenRun = run.id;
  seenSerial = run.serial;
  seenStage = 0;
}

/** Tras cualquier cambio de campaña: logros y cartas recién llegadas. */
function afterRunChange(): void {
  const c = campaign;
  if (!c) return;
  const run = c.run;
  syncSeen(run);
  const fresh = run.deck.filter((d) => d.sp && Number(d.id.split('-').pop()) > seenSerial);
  seenSerial = run.serial;
  if (fresh.length && run.phase !== 'pack') revealCards(fresh);
  trackMeta();
}

/** Lleva a la pantalla que toca según la fase de la campaña. */
function routeRun(): void {
  const c = campaign;
  if (!c || busy || queue.length) return; // si hay animaciones, la cola vuelve a llamar al terminar
  maybeSettle(c.run);
  afterRunChange();
  if (c.run.phase === 'battle') return refreshRunHud();
  if (screen === 'run') renderRun();
  else setScreen('run');
}

/** Presenta al jefe de la obra, una vez por obra. */
function bossIntro(): void {
  const run = campaign?.run;
  if (!run || run.phase !== 'battle') return;
  syncSeen(run);
  if (seenStage === run.stage) return;
  seenStage = run.stage;
  ribbon(`Obra ${run.stage} · ${STAGES[run.stage - 1].name}`);
  if (!run.boss) return;
  const boss = BOSS[run.boss];
  const el = document.createElement('div');
  el.className = 'modal boss-intro';
  el.innerHTML = `<div class="boss-box"><div class="boss-card"></div><div><small>Jefe de obra</small><h2>${boss.who}</h2><h3>${boss.name}</h3><p>${boss.desc}</p><button class="primary">A demoler</button></div></div>`;
  const card = portraitEl(`j-${boss.id}`, boss.who);
  dealIn(card, 0);
  $('.boss-card', el).appendChild(card);
  el.onclick = () => el.remove();
  document.body.appendChild(el);
  sfx.siren();
  log(`<b>Jefe de obra: ${boss.who}.</b> ${boss.desc}`, 'red');
}

/** Entra a la mesa con la obra actual (solo en local). */
function enterStage(fresh: boolean): void {
  const c = campaign!;
  if (fresh || !c.state) c.state = startStage(c.run, [{ id: RUN_PLAYER, name: 'TÚ' }]);
  saveCampaign();
  tutorial = null;
  session = null;
  lobby = null;
  shown = null;
  queue.length = 0;
  screen = null;
  history.replaceState(null, '', location.pathname);
  queue.push({ view: viewFor(c.state, RUN_PLAYER), events: [] });
  setScreen('table');
  void pump();
}

function campaignAct(action: Action): void {
  const c = campaign!;
  if (!c.state) return;
  try {
    const res = applyAction(c.state, RUN_PLAYER, action);
    c.state = res.state;
    trackEvents(c.run, res.events);
    if (res.state.phase !== 'playing') finishBattle(c.run, res.state);
    selected.clear();
    saveCampaign();
    queue.push({ view: viewFor(res.state, RUN_PLAYER), events: res.events });
    void pump();
  } catch (err) {
    toast(err instanceof RuleError ? err.message : 'Jugada inválida');
  }
}

// ── pantallas de campaña ──

const spCard = (id: string): Card => ({ id: `show-${id}`, suit: 'X', rank: 0, sp: id });

/** Una opción uniforme: carta o ficha arriba, nombre y texto debajo. Si se puede elegir, se pulsa la carta. */
function choice(el: HTMLElement, title: string, desc: string, tag: string | null, onClick: (() => void) | null, cls = ''): HTMLElement {
  const box = document.createElement('div');
  box.className = `choice ${cls}`;
  box.appendChild(el);
  box.insertAdjacentHTML('beforeend', `<h4>${title}</h4><p>${desc}</p>${tag ? `<span class="tag-act">${tag}</span>` : ''}`);
  if (onClick) {
    box.classList.add('pick');
    box.tabIndex = 0;
    box.onclick = onClick;
    box.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && onClick();
  } else if (tag) box.classList.add('no-pick');
  return box;
}

/** Descubre las cartas especiales que acaban de tocar. */
function revealCards(cards: Card[]): void {
  document.querySelector('.reveal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal reveal';
  modal.innerHTML = `<div class="reveal-box"><small>Te ha tocado</small><div class="choices"></div><button class="primary">Al mazo</button></div>`;
  cards.forEach((c, i) => {
    const el = cardEl(c);
    dealIn(el, 150 + i * 250);
    $('.choices', modal).appendChild(choice(el, SPECIAL[c.sp!].name, SPECIAL[c.sp!].desc, null, null));
  });
  modal.onclick = (e) => {
    if (e.target === modal || (e.target as HTMLElement).tagName === 'BUTTON') modal.remove();
  };
  document.body.appendChild(modal);
  sfx.build();
}

const SAY: Record<string, string[]> = {
  hello: ['¿Qué va a ser?', 'Tengo género nuevo.', 'Mira sin tocar. Bueno, toca.', 'Otra vez tú. Bien.'],
  buy: ['Buena elección.', 'Eso no falla.', 'Con eso tiras una catedral.', 'Hmm. Vendido.', 'Me dolía venderla.'],
  poor: ['Con eso no te llega.', 'Aquí no se fía.', 'Vuelve con más oro.'],
  reroll: ['A ver qué queda en la trastienda…', 'Te saco lo otro.'],
  burn: ['Menos lastre, mejor obra.', 'Al fuego con ella.'],
};
function ferreteroSays(kind: keyof typeof SAY): void {
  const el = $('#say');
  const lines = SAY[kind];
  if (el) el.textContent = lines[Math.floor(Math.random() * lines.length)];
  sfx.grunt();
  const npc = $('.k-npc');
  if (npc) {
    npc.classList.remove('talk');
    void npc.offsetWidth;
    npc.classList.add('talk');
  }
}

function deckModal(title: string, cards: Card[], onPick?: (c: Card) => void): void {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-box deck-box"><h2>${title} <button class="x">CERRAR</button></h2><div class="deck-mini"></div></div>`;
  const grid = $('.deck-mini', modal);
  const order = 'SDHCX';
  [...cards]
    .sort((a, b) => Number(!!a.sp) - Number(!!b.sp) || order.indexOf(a.suit) - order.indexOf(b.suit) || a.rank - b.rank)
    .forEach((c) => {
      const el = cardEl(c);
      if (onPick) {
        el.classList.add('pickable');
        el.onclick = () => {
          modal.remove();
          onPick(c);
        };
      }
      grid.appendChild(el);
    });
  modal.addEventListener('click', (e) => {
    if (e.target === modal || (e.target as HTMLElement).classList.contains('x')) modal.remove();
  });
  document.body.appendChild(modal);
}

function renderRun(): void {
  const c = campaign;
  if (!c) return setScreen('camp');
  const run = c.run;
  setDeckBack(run.deckId);
  setScene(run.phase === 'won' || run.phase === 'lost' ? 'menu' : 'shop');
  const host = isRunHost();
  const wait = host ? '' : '<p class="wait">El anfitrión decide por la cuadrilla.</p>';
  const head = (h1: string, sub: string) =>
    `<header class="deck-head"><div><h1>${h1}</h1><p class="sub">${sub} · ${DECK[run.deckId].name} · búnker ${run.integrity}/${run.maxIntegrity} · mazo ${run.deck.length}</p></div><div class="purse"><b>${run.gold}</b><span>de oro</span></div></header>`;

  if (run.phase === 'pack') {
    app.innerHTML = `<div class="run">${head('El sobre', `Campaña nueva · ascenso ${run.ascension}`)}
      <div class="run-body"><p class="lead">Tu cuadrilla llega con estas cartas especiales. No tienen palo ni número: acompañan a cualquier golpe (hasta dos por golpe) o se juegan solas, y hacen su efecto.</p>
      <div class="choices" id="picks"></div>${wait}
      <div class="row end-row"><button id="deck-view">Ver mazo (${run.deck.length})</button><button class="primary big" id="go" ${host ? '' : 'disabled'}>A la obra 1<small>${STAGES[0].name}</small></button></div></div></div>`;
    run.pack.forEach((id, i) => {
      const el = cardEl(spCard(id));
      dealIn(el, 200 + i * 220);
      $('#picks').appendChild(choice(el, SPECIAL[id].name, SPECIAL[id].desc, null, null));
    });
    $('#go').onclick = () => runDo({ t: 'begin' });
  } else if (run.phase === 'reward') {
    const total = run.pay.reduce((a, [, n]) => a + n, 0);
    app.innerHTML = `<div class="run">${head('A cobrar', `Obra ${run.stage} demolida · ${STAGES[run.stage - 1].name}`)}
      <div class="run-body two">
        <section class="panel"><h3><span>La paga</span><span>+${total}</span></h3>
          <table class="pay">${run.pay.map(([l, n]) => `<tr><td>${l}</td><td>+${n}</td></tr>`).join('')}<tr class="sum"><td>Total</td><td>+${total} de oro</td></tr></table></section>
        <section>
          <h3 class="sec">${run.picked ? 'Carta resuelta' : 'Una carta para tu mazo'}</h3>
          <div class="choices" id="picks"></div>
          ${run.relicPicks.length ? `<h3 class="sec">${run.relicPicked ? 'Botín repartido' : `Botín de ${BOSS[run.boss ?? '']?.who ?? 'jefe'}: elige una herramienta`}</h3><div class="choices" id="relics"></div>` : ''}
          ${wait}
        </section>
      </div></div>`;
    if (!run.picked) {
      $('#picks').appendChild(choice(tileEl('incognita', 'Incógnita', 'service'), 'Carta incógnita', 'Una carta especial al azar. No sabrás cuál hasta llevártela.', 'Llevar', host ? () => runDo({ t: 'pick', take: true }) : null));
      $('#picks').appendChild(choice(tileEl('retirar', 'Ninguna', 'service'), 'Pasar', 'No siempre conviene engordar el mazo.', 'Saltar', host ? () => runDo({ t: 'pick', take: false }) : null));
    }
    const relics = $('#relics');
    if (relics && !run.relicPicked) {
      run.relicPicks.forEach((id) => relics.appendChild(choice(tileEl(id, RELIC[id].name, 'relic'), RELIC[id].name, RELIC[id].desc, 'Llevar', host ? () => runDo({ t: 'pickRelic', id }) : null)));
      relics.appendChild(choice(tileEl('retirar', 'Ninguna', 'service'), 'Pasar', `Caben ${RELIC_SLOTS} herramientas; llevas ${run.relics.length}.`, 'Saltar', host ? () => runDo({ t: 'pickRelic', id: null }) : null));
    }
  } else if (run.phase === 'shop') {
    const next = STAGES[run.stage];
    const boss = run.nextBoss ? BOSS[run.nextBoss] : null;
    app.innerHTML = `<div class="run">${head('La ferretería', `Obra ${run.stage} superada`)}
      <div class="run-body shop">
        <aside class="keeper"><div id="npc"></div><p class="say" id="say">…</p></aside>
        <section><div class="choices" id="offers"></div>${wait}</section>
        <aside class="shop-side">
          ${toolsPanel(run, false)}
          <div class="panel next"><h3><span>Siguiente obra</span><span>${run.stage + 1}/${STAGES.length}</span></h3>
            <div class="next-row"><div id="next-boss"></div><div>
            <p><b>${next.name}</b> · ${next.floors.length} piso${next.floors.length > 1 ? 's' : ''} por torre · resistencia ×${next.hp}</p>
            ${boss ? `<p class="boss"><b>${boss.who} · ${boss.name}</b> ${boss.desc}</p>` : '<p>Sin jefe de obra.</p>'}</div></div></div>
          <div class="grid2">
            <button id="burn" ${host && run.gold >= removeCost(run) ? '' : 'disabled'}>Quemar carta · ${removeCost(run)}</button>
            <button id="reroll" ${host && run.gold >= rerollCost(run) ? '' : 'disabled'}>Otra remesa · ${rerollCost(run)}</button>
            <button id="deck-view">Ver mazo (${run.deck.length})</button>
            <button class="primary" id="go" ${host ? '' : 'disabled'}>Siguiente obra</button>
          </div>
        </aside>
      </div></div>`;
    $('#npc').appendChild(ferreteroEl());
    if (boss) $('#next-boss').appendChild(portraitEl(`j-${boss.id}`, boss.who));
    run.shop.forEach((o, i) => {
      const can = host && !o.sold && run.gold >= o.cost;
      const label = o.sold ? 'Vendido' : `${o.cost} de oro`;
      let el: HTMLElement;
      let title: string;
      let desc: string;
      let click: (() => void) | null = can ? () => runDo({ t: 'buy', i }) : null;
      if (o.kind === 'relic') {
        el = tileEl(o.id!, RELIC[o.id!].name, 'relic');
        title = RELIC[o.id!].name;
        desc = RELIC[o.id!].desc;
      } else if (o.kind === 'sobre') {
        el = tileEl('incognita', 'Incógnita', 'service');
        title = 'Carta incógnita';
        desc = 'Una carta especial al azar para tu mazo.';
      } else if (o.kind === 'forja') {
        el = tileEl('forja', 'Forja', 'service');
        title = 'Forja';
        desc = 'Una carta gana +3 de valor para siempre. Eliges entre tres.';
        if (can) click = () => deckModal('Forja: elige una carta', run.deck.filter((d) => o.cards!.includes(d.id)), (card) => runDo({ t: 'buy', i, choice: card.id }));
      } else if (o.kind === 'plano') {
        el = tileEl('plano', 'Plano', 'service');
        title = `Plano: ${FORMATION_NAME[o.form!]}`;
        desc = `Cada carta jugada así hace +${o.form === 'solo' ? 3 : 2}. Nivel ${run.levels[o.form!]} → ${run.levels[o.form!] + 1}.`;
      } else if (o.kind === 'reparacion') {
        el = tileEl('reparacion', 'Reparación', 'service');
        title = 'Reparación';
        desc = `+6 de integridad. El búnker está en ${run.integrity}/${run.maxIntegrity}.`;
      } else {
        el = tileEl('comodin', 'Comodín', 'service');
        title = 'Comodín';
        desc = 'Añade un comodín más a tu mazo.';
      }
      $('#offers').appendChild(choice(el, title, desc, label, click, o.sold ? 'sold' : ''));
    });
    if (lastGold >= 0 && run.gold < lastGold) {
      sfx.coin();
      ferreteroSays('buy');
    } else ferreteroSays('hello');
    $('#burn').onclick = () =>
      deckModal(`Quemar una carta · ${removeCost(run)} de oro`, run.deck, (card) => {
        runDo({ t: 'remove', card: card.id });
        ferreteroSays('burn');
      });
    $('#reroll').onclick = () => {
      runDo({ t: 'reroll' });
      ferreteroSays('reroll');
    };
    $('#go').onclick = () => runDo({ t: 'next' });
  } else {
    const won = run.phase === 'won';
    won ? sfx.win() : sfx.lose();
    const canBack = !c.online || lobby?.host === session?.playerId;
    app.innerHTML = `<div class="end ${won ? 'won' : 'lost'} in-page">
      ${won ? rubble('H', 'end-art') : skyline('end-art')}
      <div class="meta"><span class="hot">${won ? 'CAMPAÑA COMPLETADA' : 'CAMPAÑA PERDIDA'}</span><span>${won ? `ASCENSO ${run.ascension}` : `OBRA ${run.stage} · ${STAGES[run.stage - 1].name}`}</span></div>
      <h1>${won ? 'Demolido' : 'Sepultados'}</h1>
      <p>${won ? 'Cayó la Torre Madre.' : `Superasteis ${stagesCleared(run)} de ${STAGES.length} obras.`} ${run.stats.floors} pisos demolidos en ${run.stats.turns} turnos, con ${run.stats.cleans} golpes limpios y ${run.relics.length} herramientas.</p>
      <p class="gain">+${lastGain} ✦ de renombre${won ? ` · Ascenso ${run.ascension + 1} desbloqueado` : ''}</p>
      <div class="row">${c.online ? (canBack ? '<button class="primary" id="c-room">Volver a la sala</button>' : '<button disabled>Esperando al anfitrión…</button>') : '<button class="primary" id="c-hub">Volver al gremio</button>'}</div>
    </div>`;
    const hub = $('#c-hub');
    if (hub) hub.onclick = () => setScreen('camp');
    const room = $('#c-room');
    if (room) room.onclick = () => sendMsg({ t: 'lobby' });
  }
  lastGold = run.gold;
  const dv = $('#deck-view');
  if (dv) dv.onclick = () => deckModal(`Tu mazo · ${run.deck.length} cartas`, run.deck);
}
