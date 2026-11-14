// Vestíbulo de la sala online.
import { runOpts } from './campaign';
import { $, $$, S, app, toast } from './core';
import { sendMsg } from './net';
import { showRules } from './widgets';
import { L, barN } from './lengua';

export function renderLobby(): void {
  const lobby = S.lobby;
  const session = S.session;
  if (!lobby || !session) return;
  const isHost = lobby.host === session.playerId;
  const seats = [0, 1, 2, 3]
    .map((i) => {
      const p = lobby.players[i];
      if (!p) return `<div class="seat empty">${L('ui.sala.libre')}</div>`;
      const tags = [p.id === lobby.host ? L('ui.sala.anfitrion') : '', p.id === session.playerId ? L('ui.mesa.tu') : '', p.connected ? '' : L('ui.sala.desconectado')].filter(Boolean);
      return `<div class="seat ${p.connected ? '' : 'off'}"><span>${p.name}</span><span>${tags.map((t) => `<small>${t}</small>`).join(' ')}</span></div>`;
    })
    .join('');
  const opts = runOpts();
  app.innerHTML = `
  <div class="lobby">
    <div class="lobby-code">
      <div><div class="meta"><span class="hot">${L('ui.sala.sala')}</span><span>${L('ui.sala.conjura', { n: lobby.players.length })}</span></div><h1>${lobby.room}</h1></div>
      <p>${L('ui.sala.comparte')}</p>
    </div>
    <div class="seats">${seats}</div>
    <div class="lobby-side">
      <div class="panel">
        <h3>${L('ui.sala.modo')}</h3>
        <div class="row">
          <button data-m="clasica" class="${lobby.mode === 'clasica' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>${L('ui.sala.unico')}</button>
          <button data-m="campana" class="${lobby.mode === 'campana' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>${L('ui.sala.campana')}</button>
        </div>
        <p class="note">${
          lobby.mode === 'campana'
            ? L('ui.sala.campana.nota', { baraja: isHost ? ` (${barN(opts.deck ?? 'obra')})` : '' })
            : L('ui.sala.unico.nota')
        }</p>
      </div>
      <div class="panel" ${lobby.mode === 'campana' ? 'hidden' : ''}>
        <h3>${L('ui.sala.dificultad')}</h3>
        <div class="row">
          <button data-d="obra" class="${lobby.difficulty === 'obra' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>${L('ui.sala.normal')}</button>
          <button data-d="brutal" class="${lobby.difficulty === 'brutal' ? 'on' : ''}" ${isHost ? '' : 'disabled'}>${L('ui.sala.brutal')}</button>
        </div>
      </div>
      <button class="primary" id="start" ${isHost ? '' : 'disabled'}>${isHost ? L('ui.sala.empezar') : L('ui.sala.espera')}</button>
      <button id="copy">${L('ui.sala.copiar')}</button>
      <button id="rules">${L('ui.reglas')}</button>
      <button class="ghost" id="leave">${L('ui.sala.salir')}</button>
    </div>
  </div>`;
  $$<HTMLButtonElement>('[data-d]').forEach((b) => (b.onclick = () => sendMsg({ t: 'difficulty', value: b.dataset.d as 'obra' | 'brutal' })));
  $$<HTMLButtonElement>('[data-m]').forEach((b) => (b.onclick = () => sendMsg({ t: 'mode', value: b.dataset.m as 'clasica' | 'campana' })));
  // en sala, la semilla la pone el servidor: nadie de la conjura puede adivinar el Mazo
  $('#start').onclick = () => sendMsg({ t: 'start', up: opts.up, ascension: opts.ascension, deck: opts.deck, pool: opts.pool });
  $('#copy').onclick = () => {
    void navigator.clipboard?.writeText(`${location.origin}/?sala=${lobby.room}`);
    toast(L('ui.sala.copiado'));
  };
  $('#rules').onclick = showRules;
  $('#leave').onclick = () => sendMsg({ t: 'leave' });
}
