import '@fontsource/archivo-black';
import '@fontsource/unifrakturcook/700.css';
import '@fontsource/grenze-gotisch/900.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/700.css';
import '@fontsource/space-mono/700.css';
import './styles.css';
import { Action, BEATS, Card, GameEvent, GameState, MATERIAL, PlayerView, RANK_LABEL, RuleError, SUITS, SUIT_GLYPH, Suit, applyAction, cardValue, classify, previewStrike, viewFor } from '../rules/engine';
import { BOSS, Meta, RELIC, RELIC_SLOTS, RUN_PLAYER, Run, STAGES, UPGRADES, advance, buy, buyUpgrade, completeStage, newMeta, newRun, renownFor, rerollCost, reroll, settle, stagesCleared, startStage } from '../rules/run';
import { TUTORIAL_INTRO, TUTORIAL_PLAYER, TUTORIAL_STEPS, createTutorial } from '../rules/tutorial';
import type { ClientMsg, LobbyInfo, ServerMsg } from '../shared/protocol';
import { ALL_CARDS, backEl, bindEyes, cardEl, ensureDefs, suitSvg } from './card';
import { bunkerArt, rubble, skyline, strip } from './art';
import { musicIsOn, setTension, sfx, soundOn, startMusic, toggleMusic, toggleSound } from './audio';
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
type Screen = 'home' | 'lobby' | 'table' | 'deck' | 'camp' | 'shop';
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
}
let tutorial: Tutorial | null = null;
const guidedStep = () => (tutorial && tutorial.mode === 'do' ? TUTORIAL_STEPS[tutorial.step] : null);

const WEAK_TO = Object.fromEntries(SUITS.map((s) => [BEATS[s], s])) as Record<Suit, Suit>; // torre → palo que la dobla
const FLOOR = (r: number) => RANK_LABEL[r];
/** 'ACERO' → 'Acero': la gótica solo se lee bien en caja baja. */
const cap = (s: string) => s[0] + s.slice(1).toLowerCase();
const fmt = (cards: Card[]) => cards.map((c) => `${RANK_LABEL[c.rank]}${SUIT_GLYPH[c.suit]}${c.plus ? `+${c.plus}` : ''}`).join(' ');
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
    case 'lobby':
      lobby = msg.lobby;
      if (!lobby.inGame) {
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
  if (next === 'home') renderHome();
  else if (next === 'deck') renderDeck();
  else if (next === 'camp') renderCamp();
  else if (next === 'shop') renderShop();
  else if (next === 'lobby') renderLobby();
  else buildTable();
}

function renderHome(): void {
  const savedName = localStorage.getItem('derrumbe:name') ?? '';
  const code = new URLSearchParams(location.search).get('sala') ?? '';
  app.innerHTML = `
  <div class="home">
    <section class="home-left">
      <div class="meta"><span class="hot">COOPERATIVO</span><span>1–4 JUGADORES</span><span>BARAJA FRANCESA</span><span>ONLINE</span></div>
      <h1 class="title"><span>Derr</span><span class="cut">umbe</span></h1>
      <div class="mid"><p class="tagline">Cuatro torres. Doce pisos. Un búnker que se agrieta con cada sirena. Demoledlo todo antes de quedar sepultados.</p>${skyline('hero')}</div>
      <div class="fan"></div>
    </section>
    <section class="home-right">
      <h2>Entrar a la obra</h2>
      <button class="primary big" id="camp">Campaña<small>roguelike · en solitario</small></button>
      <button id="tutorial">Partida guiada (tutorial)</button>
      <div class="or">en línea, 1 a 4</div>
      <div class="row"><input id="name" maxlength="12" autocomplete="off" placeholder="TU NOMBRE" value="${savedName.replace(/"/g, '')}" /><button id="create">Crear sala</button></div>
      <div class="row"><input id="code" maxlength="4" autocomplete="off" placeholder="CÓDIGO" value="${code.replace(/[^A-Za-z]/g, '').slice(0, 4)}" /><button id="join">Unirse</button></div>
      <div class="row"><button class="ghost" id="rules">Reglas</button><button class="ghost" id="deck">Ver la baraja</button><button class="ghost" id="music"></button></div>
      <p class="conn"></p>
    </section>
  </div>`;
  const fan = $('.fan');
  const show: Card[] = [
    { id: 'S1', suit: 'S', rank: 1 },
    { id: 'H13', suit: 'H', rank: 13 },
    { id: 'D7', suit: 'D', rank: 7 },
    { id: 'C12', suit: 'C', rank: 12 },
    { id: 'H9', suit: 'H', rank: 9 },
    { id: 'X1', suit: 'X', rank: 0 },
  ];
  show.forEach((c, i) => {
    const el = cardEl(c);
    dealIn(el, i * 110);
    fan.appendChild(el);
  });
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
  $('#tutorial').onclick = startTutorial;
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
  $('#start').onclick = () => sendMsg({ t: 'start' });
  $('#copy').onclick = () => {
    void navigator.clipboard?.writeText(`${location.origin}/?sala=${lobby!.room}`);
    toast('Enlace copiado');
  };
  $('#rules').onclick = showRules;
  $('#leave').onclick = () => sendMsg({ t: 'leave' });
}

// ───────────────────────── Mesa ─────────────────────────

function buildTable(): void {
  handEls.clear();
  selected.clear();
  app.innerHTML = `
  <div class="table-screen">
    <header class="bar">
      <div class="brand">Derrumbe</div>
      <div class="room">${tutorial ? 'TUTORIAL' : campaign ? `OBRA ${campaign.run.stage}/${STAGES.length} · ${STAGES[campaign.run.stage - 1].name}` : `SALA ${session?.room ?? ''}`}</div>
      ${campaign ? `<div class="chip gold"><span>Oro</span><b>${campaign.run.gold}</b></div>` : ''}
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
  leave.onclick = () => {
    if (campaign) return setScreen('camp');
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
  if (campaign && msg.t === 'action') return campaignAct(msg.action);
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
  if (cards.length === 1 && cards[0].suit === 'X') return act({ t: 'action', action: { type: 'joker', card: cards[0].id, target: s } });
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
  const joker = cards.length === 1 && cards[0].suit === 'X';
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
      ? '<span class="tag go">Tu turno</span><span class="hint">Elige 1 carta, un grupo del mismo número o una escalera de 3+, y pulsa una torre.</span>'
      : '<span class="tag go">Tu turno</span><span class="hint">No tienes cartas: pulsa PASAR.</span>';
  else if (joker) status.innerHTML = '<span class="tag go">Huelga</span><span class="hint">Pulsa una torre: su piso queda desarmado y la sirena no suena.</span>';
  else if (formation) {
    const total = cards.reduce((a, c) => a + cardValue(c), 0);
    status.innerHTML = `<span class="tag go">${formation} · ${total}</span><span class="hint">Pulsa una torre para golpear.</span>`;
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
      log(`<b>${nameOf(ev.player)}</b> golpea ${MATERIAL[ev.target]} con ${fmt(ev.cards)} <i>(${ev.formation})</i>`);
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
  if (shown.phase !== 'playing') showEnd();
}

function showEnd(): void {
  if (!shown || document.querySelector('.end')) return;
  if (tutorial) return showTutorialEnd();
  if (campaign) return campaignStageEnd();
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
  app.innerHTML = `
  <div class="deck">
    <header class="deck-head"><div><div class="meta"><span class="hot">54 CARTAS</span><span>LINOGRABADO DIGITAL</span></div><h1>La baraja</h1></div><button id="back">Volver</button></header>
    <div class="deck-grid"></div>
  </div>`;
  const grid = $('.deck-grid');
  const order = (c: Card) => (c.rank > 10 ? 0 : c.rank === 1 ? 1 : c.rank === 0 ? 2 : 3);
  [...ALL_CARDS].sort((a, b) => order(a) - order(b)).forEach((c) => grid.appendChild(cardEl(c)));
  grid.appendChild(backEl());
  $('#back').onclick = () => setScreen('home');
}

ensureDefs();
bindEyes();
addEventListener('pointerdown', startMusic, { once: true });
setScreen(new URLSearchParams(location.search).has('baraja') ? 'deck' : 'home');
connect();

// ───────────────────────── Partida guiada ─────────────────────────

function startTutorial(): void {
  tutorial = { state: createTutorial(), step: 0, intro: 0, mode: 'intro' };
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
    <div class="row"><button class="primary" id="t-home">Jugar de verdad</button><button id="t-again">Repetir tutorial</button><button id="t-rules">Reglas</button></div>`;
  document.body.appendChild(el);
  $('#t-home', el).onclick = forget;
  $('#t-again', el).onclick = startTutorial;
  $('#t-rules', el).onclick = showRules;
}

// ───────────────────────── Campaña (roguelike) ─────────────────────────
// Corre en local, como el tutorial. El progreso permanente (gremio) y la campaña en curso
// se guardan en localStorage, así que se puede cerrar la pestaña y seguir otro día.

const META_KEY = 'derrumbe:meta';
const RUN_KEY = 'derrumbe:run';

interface Campaign {
  run: Run;
  state: GameState | null;
  cleans: number;
}
let campaign: Campaign | null = null;
let ascensionPick = 0;

function loadJson<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
const meta: Meta = { ...newMeta(), ...(loadJson<Meta>(META_KEY) ?? {}) };
const saveMeta = () => localStorage.setItem(META_KEY, JSON.stringify(meta));
const savedCampaign = () => loadJson<Campaign>(RUN_KEY);
function saveCampaign(): void {
  if (campaign && (campaign.run.phase === 'battle' || campaign.run.phase === 'shop')) localStorage.setItem(RUN_KEY, JSON.stringify(campaign));
  else localStorage.removeItem(RUN_KEY);
}

function toolsPanel(run: Run): string {
  const boss = run.boss ? BOSS[run.boss] : null;
  const tools = run.relics.map((id) => `<li title="${RELIC[id].desc}"><b>${RELIC[id].name}</b><span>${RELIC[id].desc}</span></li>`).join('');
  return `<div class="panel tools"><h3><span>Herramientas</span><span>${run.relics.length}/${RELIC_SLOTS}</span></h3>
    ${boss ? `<p class="boss"><b>Jefe · ${boss.name}</b> ${boss.desc}</p>` : ''}
    <ul>${tools || '<li class="none">Aún no tienes ninguna. Se compran en la ferretería.</li>'}</ul></div>`;
}

function renderCamp(): void {
  campaign = null;
  const saved = savedCampaign();
  ascensionPick = Math.min(ascensionPick, meta.ascMax);
  const ups = UPGRADES.map((u) => {
    const level = meta.up[u.id] ?? 0;
    const cost = u.costs[level];
    const pips = u.costs.map((_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
    return `<div class="up"><div><b>${u.name}</b><span>${u.desc}</span><div class="pips">${pips}</div></div>
      <button data-up="${u.id}" ${cost === undefined || meta.renown < cost ? 'disabled' : ''}>${cost === undefined ? 'Máx.' : `${cost} ✦`}</button></div>`;
  }).join('');
  const asc = meta.ascMax > 0 ? `<div class="asc"><span>Ascenso</span>${Array.from({ length: meta.ascMax + 1 }, (_, i) => `<button data-asc="${i}" class="${i === ascensionPick ? 'on' : ''}">${i}</button>`).join('')}<small>Cada ascenso: torres +15 % y renombre +25 %.</small></div>` : '';
  app.innerHTML = `
  <div class="camp">
    <header class="deck-head"><div><div class="meta"><span class="hot">CAMPAÑA</span><span>ROGUELIKE · ${STAGES.length} OBRAS</span><span>${meta.renown} ✦ RENOMBRE</span></div><h1>El gremio</h1></div><button id="back">Volver</button></header>
    <div class="camp-grid">
      <section class="panel camp-run">
        <h3><span>La campaña</span><span>${meta.runs} jugadas · ${meta.wins} ganadas</span></h3>
        <p>Ocho obras, cada una más dura. Entre obra y obra cobras <b>oro</b> y compras en la <b>ferretería</b>: herramientas que cambian las reglas, forja de cartas y planos de formación. El búnker no se repara solo. Ganes o pierdas, vuelves al gremio con <b>renombre</b> para mejoras que duran para siempre.</p>
        <div class="route">${STAGES.map((s, i) => `<div class="stop ${i < meta.best ? 'done' : ''} ${s.boss ? 'boss' : ''}" title="${s.name}"><b>${i + 1}</b><span>${s.name}</span></div>`).join('')}</div>
        ${asc}
        <div class="row">
          ${saved ? `<button class="primary big" id="resume">Continuar<small>obra ${saved.run.stage} · ${saved.run.gold} de oro</small></button>` : ''}
          <button class="${saved ? '' : 'primary'} big" id="new">Nueva campaña<small>${saved ? 'abandona la actual' : 'mazo de 42 cartas'}</small></button>
        </div>
      </section>
      <section class="panel camp-ups"><h3><span>Mejoras permanentes</span><span>${meta.renown} ✦</span></h3>${ups}</section>
    </div>
  </div>`;
  $('#back').onclick = () => setScreen('home');
  app.querySelectorAll<HTMLButtonElement>('[data-up]').forEach((b) => (b.onclick = () => {
    if (buyUpgrade(meta, b.dataset.up!)) {
      saveMeta();
      sfx.build();
      renderCamp();
    }
  }));
  app.querySelectorAll<HTMLButtonElement>('[data-asc]').forEach((b) => (b.onclick = () => {
    ascensionPick = Number(b.dataset.asc);
    renderCamp();
  }));
  const resume = $('#resume');
  if (resume) resume.onclick = () => {
    campaign = savedCampaign();
    if (!campaign) return renderCamp();
    if (campaign.run.phase === 'shop') setScreen('shop');
    else enterStage(false);
  };
  $('#new').onclick = () => {
    if (saved) {
      // abandonar cuenta como campaña terminada: cobra el renombre de lo ya superado
      saved.run.phase = 'lost';
      settle(meta, saved.run);
      saveMeta();
    }
    campaign = { run: newRun(meta, (Math.random() * 2 ** 31) | 0, ascensionPick), state: null, cleans: 0 };
    enterStage(true);
  };
}

/** Entra a la mesa con la obra actual (nueva, o la guardada si fresh es false). */
function enterStage(fresh: boolean): void {
  const c = campaign!;
  if (fresh || !c.state) {
    c.state = startStage(c.run, meta);
    c.cleans = 0;
  }
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
  void pump().then(() => {
    const st = STAGES[c.run.stage - 1];
    ribbon(`Obra ${c.run.stage} · ${st.name}`);
    if (c.run.boss) log(`<b>Jefe de obra: ${BOSS[c.run.boss].name}.</b> ${BOSS[c.run.boss].desc}`, 'red');
  });
}

function campaignAct(action: Action): void {
  const c = campaign!;
  if (!c.state) return;
  try {
    const res = applyAction(c.state, RUN_PLAYER, action);
    c.state = res.state;
    c.cleans += res.events.filter((e) => e.e === 'floorDown' && e.clean).length;
    selected.clear();
    saveCampaign();
    queue.push({ view: viewFor(res.state, RUN_PLAYER), events: res.events });
    void pump();
  } catch (err) {
    toast(err instanceof RuleError ? err.message : 'Jugada inválida');
  }
}

function campaignStageEnd(): void {
  const c = campaign;
  if (!c || !c.state || !shown) return;
  const state = c.state;
  const run = c.run;
  const won = state.phase === 'won';
  const el = document.createElement('div');
  let body: string;
  if (won) {
    const lines = completeStage(run, state, c.cleans, meta);
    const total = lines.reduce((a, [, n]) => a + n, 0);
    c.state = null;
    if (run.phase === 'won') {
      const gained = settle(meta, run);
      saveMeta();
      sfx.win();
      body = `${rubble('H', 'end-art')}<div class="meta"><span class="hot">CAMPAÑA COMPLETADA</span><span>ASCENSO ${run.ascension}</span></div><h1>Demolido</h1>
        <p>Cayó la Torre Madre. ${run.stats.floors} pisos demolidos en ${run.stats.turns} turnos, con ${run.stats.cleans} golpes limpios.</p>
        <p class="gain">+${gained} ✦ de renombre · Ascenso ${run.ascension + 1} desbloqueado</p>
        <div class="row"><button class="primary" id="c-hub">Volver al gremio</button></div>`;
    } else {
      sfx.win();
      body = `${rubble('S', 'end-art')}<div class="meta"><span class="hot">OBRA ${run.stage} DEMOLIDA</span><span>${STAGES[run.stage - 1].name}</span></div><h1>A cobrar</h1>
        <table class="pay">${lines.map(([l, n]) => `<tr><td>${l}</td><td>+${n}</td></tr>`).join('')}<tr class="sum"><td>Total</td><td>+${total} de oro</td></tr></table>
        <p>Tienes ${run.gold} de oro. El búnker queda en ${run.integrity}/${run.maxIntegrity}.</p>
        <div class="row"><button class="primary" id="c-shop">A la ferretería</button></div>`;
    }
  } else {
    run.phase = 'lost';
    const gained = settle(meta, run);
    saveMeta();
    c.state = null;
    sfx.lose();
    body = `${skyline('end-art')}<div class="meta"><span class="hot">CAMPAÑA PERDIDA</span><span>OBRA ${run.stage} · ${STAGES[run.stage - 1].name}</span></div><h1>Sepultados</h1>
      <p>Superaste ${stagesCleared(run)} de ${STAGES.length} obras con ${run.relics.length} herramientas.</p>
      <p class="gain">+${gained} ✦ de renombre para el gremio</p>
      <div class="row"><button class="primary" id="c-hub">Volver al gremio</button></div>`;
  }
  saveCampaign();
  el.className = `end ${won ? 'won' : 'lost'}`;
  el.innerHTML = body;
  document.body.appendChild(el);
  const hub = $('#c-hub', el);
  if (hub) hub.onclick = () => setScreen('camp');
  const shop = $('#c-shop', el);
  if (shop) shop.onclick = () => setScreen('shop');
}
void renownFor;

const FORM_NAME: Record<string, string> = { solo: 'carta sola', grupo: 'grupo', escalera: 'escalera' };

function renderShop(): void {
  const c = campaign;
  if (!c) return setScreen('camp');
  const run = c.run;
  const next = STAGES[run.stage];
  const boss = run.nextBoss ? BOSS[run.nextBoss] : null;
  const offers = run.shop
    .map((o, i) => {
      let title = '';
      let desc = '';
      let tag = 'Servicio';
      let extra = '';
      if (o.kind === 'relic') {
        title = RELIC[o.id!].name;
        desc = RELIC[o.id!].desc;
        tag = 'Herramienta';
      } else if (o.kind === 'forja') {
        title = 'Forja';
        desc = 'Una carta gana +3 de valor para siempre. Elige cuál:';
        extra = `<div class="forge" data-forge="${i}"></div>`;
      } else if (o.kind === 'plano') {
        title = `Plano de ${FORM_NAME[o.form!]}`;
        desc = `Cada carta jugada en ${FORM_NAME[o.form!]} hace +${o.form === 'solo' ? 3 : 2}. Nivel ${run.levels[o.form!]} → ${run.levels[o.form!] + 1}.`;
        tag = 'Plano';
      } else if (o.kind === 'reparacion') {
        title = 'Reparación';
        desc = `+6 de integridad. El búnker está en ${run.integrity}/${run.maxIntegrity}.`;
      } else {
        title = 'Comodín';
        desc = 'Añade un comodín más a tu mazo para toda la campaña.';
      }
      const cant = o.sold || run.gold < o.cost;
      return `<div class="offer k-${o.kind} ${o.sold ? 'sold' : ''}"><small>${tag}</small><h4>${title}</h4><p>${desc}</p>${extra}
        ${o.kind === 'forja' ? `<span class="price">${o.sold ? 'Vendido' : `${o.cost} de oro`}</span>` : `<button data-buy="${i}" ${cant ? 'disabled' : ''}>${o.sold ? 'Vendido' : `Comprar · ${o.cost}`}</button>`}</div>`;
    })
    .join('');
  app.innerHTML = `
  <div class="shop">
    <header class="deck-head"><div><div class="meta"><span class="hot">OBRA ${run.stage} SUPERADA</span><span>BÚNKER ${run.integrity}/${run.maxIntegrity}</span></div><h1>La ferretería</h1></div><div class="purse"><b>${run.gold}</b><span>de oro</span></div></header>
    <div class="shop-grid">
      <section class="offers">${offers}</section>
      <aside class="shop-side">
        ${toolsPanel({ ...run, boss: null })}
        <div class="panel next"><h3><span>Siguiente obra</span><span>${run.stage + 1}/${STAGES.length}</span></h3>
          <p><b>${next.name}</b> · ${next.floors.length} piso${next.floors.length > 1 ? 's' : ''} por torre${next.hp > 1 ? ` · resistencia ×${next.hp}` : ''}</p>
          ${boss ? `<p class="boss"><b>Jefe · ${boss.name}</b> ${boss.desc}</p>` : '<p>Sin jefe de obra.</p>'}
          <p>Planos: sola ${run.levels.solo} · grupo ${run.levels.grupo} · escalera ${run.levels.escalera}</p>
        </div>
        <div class="row"><button id="reroll" ${run.gold < rerollCost(run) ? 'disabled' : ''}>Otra remesa · ${rerollCost(run)}</button><button class="primary" id="go">Siguiente obra</button></div>
      </aside>
    </div>
  </div>`;
  app.querySelectorAll<HTMLElement>('[data-forge]').forEach((box) => {
    const i = Number(box.dataset.forge);
    const o = run.shop[i];
    for (const id of o.cards ?? []) {
      const card = run.deck.find((d) => d.id === id);
      if (!card) continue;
      const el = cardEl(card);
      if (!o.sold && run.gold >= o.cost) el.onclick = () => purchase(i, id);
      else el.classList.add('off');
      box.appendChild(el);
    }
  });
  app.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((b) => (b.onclick = () => purchase(Number(b.dataset.buy))));
  $('#reroll').onclick = () => {
    if (reroll(run, meta)) {
      sfx.card();
      saveCampaign();
      renderShop();
    }
  };
  $('#go').onclick = () => {
    advance(run);
    enterStage(true);
  };
}

function purchase(i: number, choice?: string): void {
  if (!campaign) return;
  const err = buy(campaign.run, i, choice);
  if (err) return toast(err);
  sfx.build();
  saveCampaign();
  renderShop();
}
