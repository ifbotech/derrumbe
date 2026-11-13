// Vestíbulo de la sala online.
import { DECK } from '../rules/run';
import { runOpts } from './campaign';
import { $, $$, S, app, toast } from './core';
import { sendMsg } from './net';
import { showRules } from './widgets';

export function renderLobby(): void {
  const lobby = S.lobby;
  const session = S.session;
  if (!lobby || !session) return;
  const isHost = lobby.host === session.playerId;
  const seats = [0, 1, 2, 3]
    .map((i) => {
      const p = lobby.players[i];
      if (!p) return '<div class="seat empty">— libre —</div>';
      const tags = [p.id === lobby.host ? 'ANFITRIÓN' : '', p.id === session.playerId ? 'TÚ' : '', p.connected ? '' : 'DESCONECTADO'].filter(Boolean);
      return `<div class="seat ${p.connected ? '' : 'off'}"><span>${p.name}</span><span>${tags.map((t) => `<small>${t}</small>`).join(' ')}</span></div>`;
    })
    .join('');
  const opts = runOpts();
  app.innerHTML = `
  <div class="lobby">
    <div class="lobby-code">
      <div><div class="meta"><span class="hot">SALA</span><span>${lobby.players.length}/4 EN LA CONJURA</span></div><h1>${lobby.room}</h1></div>
      <p>Comparte este código o el enlace con tu conjura. Podéis jugar de 1 a 4.</p>
    </div>
    <div class="seats">${seats}</div>
    <div class="lobby-side">
      <div class="panel">
        <h3>Modo</h3>
        <div class="row">
          <button data-m="clasica" class="${lobby.mode === 'clasica' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>Asalto único</button>
          <button data-m="campana" class="${lobby.mode === 'campana' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>Campaña</button>
        </div>
        <p class="note">${
          lobby.mode === 'campana'
            ? `Roguelike cooperativo: ocho asaltos con mazo, oro y Reliquias compartidos. Se juega con el surtido de la Orden y la baraja del anfitrión${isHost ? ` (${DECK[opts.deck ?? 'obra'].name})` : ''}; el anfitrión decide la ruta y las compras en la Taberna, y todos ganáis Coronas y logros.`
            : 'Un solo asalto: los cuatro tronos con su guardia de Sota, Reina y Rey, sin reliquias ni sellos.'
        }</p>
      </div>
      <div class="panel" ${lobby.mode === 'campana' ? 'hidden' : ''}>
        <h3>Dificultad</h3>
        <div class="row">
          <button data-d="obra" class="${lobby.difficulty === 'obra' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>Normal</button>
          <button data-d="brutal" class="${lobby.difficulty === 'brutal' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>Brutal</button>
        </div>
      </div>
      <button class="primary" id="start" ${isHost ? '' : 'disabled'}>${isHost ? 'Empezar el asalto' : 'Espera al anfitrión'}</button>
      <button id="copy">Copiar enlace</button>
      <button id="rules">Reglas</button>
      <button class="ghost" id="leave">Salir de la sala</button>
    </div>
  </div>`;
  $$<HTMLButtonElement>('[data-d]').forEach((b) => (b.onclick = () => sendMsg({ t: 'difficulty', value: b.dataset.d as 'obra' | 'brutal' })));
  $$<HTMLButtonElement>('[data-m]').forEach((b) => (b.onclick = () => sendMsg({ t: 'mode', value: b.dataset.m as 'clasica' | 'campana' })));
  // en sala, la semilla la pone el servidor: nadie de la conjura puede adivinar el Mazo
  $('#start').onclick = () => sendMsg({ t: 'start', up: opts.up, ascension: opts.ascension, deck: opts.deck, pool: opts.pool });
  $('#copy').onclick = () => {
    void navigator.clipboard?.writeText(`${location.origin}/?sala=${lobby.room}`);
    toast('Enlace copiado');
  };
  $('#rules').onclick = showRules;
  $('#leave').onclick = () => sendMsg({ t: 'leave' });
}
