// Conexión con el servidor de salas (WebSocket /ws): reconecta sola y reparte lo que llega.
import type { ClientMsg, ServerMsg } from '../shared/protocol';
import { applyRun } from './campaign';
import { $, S, toast } from './core';
import { setScreen } from './router';
import { pump, renderAll, renderInteractive } from './table';

let ws: WebSocket | null = null;
let retry = 0;

export function sendMsg(msg: ClientMsg): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  else toast('Sin conexión con el servidor');
}

export function connect(): void {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
  ws.onopen = () => {
    S.connected = true;
    retry = 0;
    if (S.session) sendMsg({ t: 'rejoin', ...S.session });
    updateConn();
  };
  ws.onclose = (ev) => {
    S.connected = false;
    updateConn();
    if (ev.code === 4000) {
      forget();
      toast('Sesión abierta en otra pestaña');
    }
    setTimeout(connect, Math.min(5000, 400 * 2 ** retry++));
  };
  ws.onmessage = (e) => onMsg(JSON.parse(e.data as string) as ServerMsg);
}

/** Olvida la sala (o la partida local) y vuelve a la portada. */
export function forget(): void {
  S.session = null;
  S.tutorial = null;
  S.campaign = null;
  sessionStorage.removeItem('derrumbe');
  S.lobby = null;
  S.shown = null;
  S.queue.length = 0;
  history.replaceState(null, '', location.pathname);
  setScreen('home');
}

function onMsg(msg: ServerMsg): void {
  switch (msg.t) {
    case 'joined':
      S.session = { room: msg.room, playerId: msg.playerId, token: msg.token };
      S.tutorial = null;
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
      S.queue.push({ view: msg.view, events: msg.events });
      if (S.screen !== 'table') setScreen('table');
      void pump();
      break;
    case 'left':
      forget();
      break;
    case 'error':
      S.waiting = false;
      toast(msg.message);
      if (S.screen === 'table' && S.shown) renderInteractive();
      break;
  }
}

export function updateConn(): void {
  const el = $('.conn');
  if (!el) return;
  el.textContent = S.connected ? '● servidor en línea' : '○ conectando con el servidor…';
  el.classList.toggle('bad', !S.connected);
}
