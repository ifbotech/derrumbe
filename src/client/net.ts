// Conexión con el servidor de salas (WebSocket /ws): reconecta sola y reparte lo que llega.
// El juego en solitario no la necesita: si esta instalación no tiene servidor (versión estática,
// escritorio sin conexión), simplemente no se abre y el cooperativo queda apagado.
import type { ClientMsg, ServerMsg } from '../shared/protocol';
import { stateHash } from '../rules/state-hash';
import { applyRun } from './campaign';
import { $, S, toast } from './core';
import { applyPing } from './pings';
import { platform } from './platform';
import { setScreen } from './router';
import { pump, renderAll, renderInteractive } from './table';
import { L, getLang } from './lengua';
import { tFor } from '../shared/i18n';
import { UI_JUICE, type ClaveJuice } from '../shared/i18n/ui-juice';
import { errorFor } from '../rules/textos';

/** V10: un aviso del servidor (en español: el protocolo no cambia) en el idioma de la mesa. */
const SRV = (Object.keys(UI_JUICE) as ClaveJuice[]).filter((k) => k.startsWith('ui.red.srv.'));
export function serverText(msg: string): string {
  const k = SRV.find((c) => tFor('es', c) === msg);
  return k ? L(k) : errorFor(getLang(), msg);
}

let ws: WebSocket | null = null;
let retry = 0;
let retryTimer = 0;

export const hasServer = () => !!platform.serverUrl();

export function sendMsg(msg: ClientMsg): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  else if (msg.t !== 'ping') toast(L(hasServer() ? 'ui.red.sin' : 'ui.red.sin.servidor'));
}

export function connect(): void {
  clearTimeout(retryTimer);
  const url = platform.serverUrl();
  if (!url) {
    S.connected = false;
    return updateConn();
  }
  let socket: WebSocket;
  try {
    socket = new WebSocket(url);
  } catch {
    S.connected = false;
    return updateConn();
  }
  ws = socket;
  socket.onopen = () => {
    S.connected = true;
    retry = 0;
    if (S.session) sendMsg({ t: 'rejoin', ...S.session });
    updateConn();
  };
  socket.onclose = (ev) => {
    if (ws !== socket) return; // se cambió de servidor: esta conexión ya no cuenta
    S.connected = false;
    updateConn();
    if (ev.code === 4000) {
      forget();
      toast(L('ui.red.otra'));
    }
    retryTimer = window.setTimeout(connect, Math.min(8000, 400 * 2 ** retry++));
  };
  socket.onmessage = (e) => onMsg(JSON.parse(e.data as string) as ServerMsg);
}

/** Vuelve a conectar (al cambiar la dirección del servidor en Ajustes). */
export function reconnect(): void {
  const old = ws;
  ws = null;
  retry = 0;
  try {
    old?.close();
  } catch {
    /* ya estaba cerrada */
  }
  connect();
}

/** Olvida la sala (o la partida local) y vuelve a la portada. */
export function forget(): void {
  S.session = null;
  S.tutorial = null;
  S.campaign = null;
  sessionStorage.removeItem('derrumbe');
  S.lobby = null;
  S.shown = null;
  S.pings = {};
  S.queue.length = 0;
  history.replaceState(null, '', location.pathname);
  setScreen('home');
}

function onMsg(msg: ServerMsg): void {
  switch (msg.t) {
    case 'joined':
      S.session = { room: msg.room, playerId: msg.playerId, token: msg.token };
      S.tutorial = null;
      S.pings = {};
      if (S.campaign && !S.campaign.online) S.campaign = null; // la campaña local sigue guardada
      sessionStorage.setItem('derrumbe', JSON.stringify(S.session));
      history.replaceState(null, '', `?sala=${msg.room}`);
      document.querySelectorAll('.modal').forEach((m) => m.remove());
      break;
    case 'run':
      applyRun(msg.run);
      break;
    case 'lobby':
      S.lobby = msg.lobby;
      if (!S.lobby.inGame) {
        if (S.campaign?.online) S.campaign = null;
        S.shown = null;
        S.queue.length = 0;
        S.screen = null;
        setScreen('lobby');
      } else if (S.screen === 'table' && S.shown) renderAll();
      break;
    case 'state':
      // V9: si lo que llegó no es lo que el servidor resumió, se pide el estado entero y este se descarta
      if (msg.hash && stateHash(msg.view) !== msg.hash) {
        sendMsg({ t: 'resync' });
        toast(L('ui.red.resync'));
        break;
      }
      S.queue.push({ view: msg.view, events: msg.events });
      if (S.screen !== 'table') setScreen('table');
      void pump();
      break;
    case 'ping':
      applyPing(msg.player, msg.target);
      break;
    case 'left':
      forget();
      break;
    case 'error':
      S.waiting = false;
      toast(serverText(msg.message));
      if (S.screen === 'table' && S.shown) renderInteractive();
      break;
  }
}

export function updateConn(): void {
  const el = $('.conn');
  if (!el) return;
  el.textContent = L(!hasServer() ? 'ui.red.local' : S.connected ? 'ui.red.online' : 'ui.red.conectando');
  el.classList.toggle('bad', hasServer() && !S.connected);
}
