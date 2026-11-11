// DERRUMBE — arranque del cliente. Cada pantalla vive en su módulo:
//   core (estado y ajustes) · net (servidor) · router · home · lobby · guild · campaign · runscreens
//   table (mesa de combate) · tutorial-ui · widgets · fx · card / art / glyphs (linograbado) · audio
import '@fontsource/archivo-black';
import '@fontsource/unifrakturcook/700.css';
import '@fontsource/grenze-gotisch/900.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/700.css';
import '@fontsource/space-mono/700.css';
import './styles.css';
import './juice.css';
import './campaign.css';
import { startMusic } from './audio';
import { bindEyes, ensureDefs } from './card';
import { retireOldSave } from './campaign';
import { S, applySettings, bindClacks, bindTips, closeModal, topModal } from './core';
import { connect } from './net';
import { setScreen } from './router';
import { onTableKey } from './table';

ensureDefs();
bindEyes();
bindTips();
bindClacks();
applySettings();
addEventListener('pointerdown', startMusic, { once: true });
addEventListener('keydown', (e) => {
  // Escape cierra la ventana de arriba, salvo que sea una decisión pendiente
  const top = topModal() as HTMLElement | null;
  if (e.key === 'Escape' && top && !top.dataset.sticky) return closeModal(top);
  onTableKey(e);
});
// en desarrollo, el estado queda a mano en la consola para depurar
if (import.meta.env.DEV) Object.assign(window, { __derrumbe: S });
retireOldSave();
setScreen('home');
connect();
