// Cambia de pantalla. Cada pantalla ocupa la ventana entera y se pinta de cero.
import { setScene } from './audio';
import { S, Screen, hideTip } from './core';
import { renderGuild } from './guild';
import { renderCamp, renderHome } from './home';
import { renderLobby } from './lobby';
import { renderRun } from './runscreens';
import { buildTable } from './table';

export function setScreen(next: Screen): void {
  if (S.screen === next && next === 'table') return;
  S.screen = next;
  hideTip();
  document.querySelectorAll('.end:not(.in-page), .banner, .fly, .flash, .ribbon, .stepchip').forEach((e) => e.remove());
  if (next !== 'table' && next !== 'run') setScene('menu');
  if (next === 'home') renderHome();
  else if (next === 'guild') renderGuild();
  else if (next === 'camp') renderCamp();
  else if (next === 'run') renderRun();
  else if (next === 'lobby') renderLobby();
  else buildTable();
}
