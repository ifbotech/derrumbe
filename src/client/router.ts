// Cambia de pantalla. Cada pantalla ocupa la ventana entera y se pinta de cero.
import { setScene } from './audio';
import { S, Screen, hideTip } from './core';
import { renderGuild } from './guild';
import { renderCamp, renderHome } from './home';
import { renderLobby } from './lobby';
import { onLangChange } from '../shared/i18n';
import { renderRun } from './runscreens';
import { buildTable, renderAll } from './table';

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

/**
 * V10 · al cambiar de idioma, la pantalla de ahora se repinta al instante en el idioma nuevo (sin recargar
 * ni perder la partida) y `<html lang>` sigue al idioma. La mesa se rehace con lo que se está viendo.
 */
export function repaint(): void {
  const now = S.screen;
  hideTip();
  if (!now) return;
  if (now === 'table') {
    if (S.busy || !S.shown) return; // a mitad de una animación: la mesa se repinta sola al acabar el lote
    buildTable();
    renderAll();
    return;
  }
  if (now === 'home') renderHome();
  else if (now === 'guild') renderGuild();
  else if (now === 'camp') renderCamp();
  else if (now === 'run') renderRun();
  else if (now === 'lobby') renderLobby();
}

onLangChange((lang) => {
  document.documentElement.lang = lang;
  repaint();
});
