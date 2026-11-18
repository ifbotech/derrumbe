// Arranque del cliente (el título vive en shared/brand.ts). Cada pantalla vive en su módulo:
//   core (estado y ajustes) · platform (guardado, pantalla, vibración) · net (servidor de salas)
//   router · home · lobby · guild · campaign · runscreens · table (mesa de combate) · tutorial-ui
//   widgets · lupa · pings · nav (teclado y mando) · fx · card / art / glyphs / engraving · audio
import '@fontsource/archivo-black';
import '@fontsource/unifrakturcook/700.css';
import '@fontsource/grenze-gotisch/900.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/700.css';
import '@fontsource/space-mono/700.css';
import './styles.css';
import './juice.css';
import './campaign.css';
import './theme.css';
import './cuenta.css';
import './acta.css';
import './conjura.css';
import './taberna.css';
import './movil.css';
import './legible.css';
import './duelo.css'; // V35 · un enemigo grande y la fila
import './tinta';
import { sfx, startMusic } from './audio';
import { canRestart, isRunHost, restartCampaign, retireOldSave } from './campaign';
import { bindEyes, ensureDefs } from './card';
import { S, applySettings, bindClacks, bindTips, closeModal, cycleSpeed, speedLabel, toast, topModal } from './core';
import { bakeGrain } from './engraving';
import { bindLupa, closeLupa, lupaOpen, openLupa } from './lupa';
import { activate, bindNav, enfoca, focused, keysInUse, moveFocus, onRightStick, padHeld } from './nav';
import { alternaAuto, bindAuto, entradaMando } from './auto';
import { bindTirada, terminaTirada } from './tirada';
import { whisper } from './whispers';
import { arbolVista } from './arbol';
import { connect } from './net';
import { openSeedLink } from './lamina';
import { bindPings } from './pings';
import { platform, startDesktop, tauriInvoke } from './platform';
import { CLAVE_IDIOMA, getLang, initLang, onLangChange, setLang } from '../shared/i18n';
import { brandFor } from '../shared/brand';
import { setScreen } from './router';
import { onTableKey, refreshSpeed, usarMejor } from './table';
import { showSettings } from './widgets';
import { L } from './lengua';

// V10 · escritorio (Tauri + Steamworks): solo si la envoltura deja window.__TAURI__; en la web no hace nada
if (tauriInvoke()) void startDesktop({ initLang, getLang, setLang, onLangChange, titleFor: (l) => brandFor(l).fullTitle, key: CLAVE_IDIOMA });
bakeGrain();
ensureDefs();
bindEyes();
bindTips();
bindClacks();
bindLupa();
bindPings(() => !S.campaign || isRunHost());
applySettings();
bindAuto();
bindTirada();
// V12 · el primer uso de Mejor jugada con el ratón o el dedo (con Q y LT, en onKey): su Susurro
document.addEventListener('click', (e) => (e.target as Element | null)?.closest?.('#btn-mejor') && setTimeout(() => S.selected.length && whisper('mejor')));
addEventListener('pointerdown', startMusic, { once: true });
addEventListener('keydown', startMusic, { once: true });

// ───────────────────────── Mantener R: reinicio rápido ─────────────────────────

let holdTimer = 0;
let holdRing: HTMLElement | null = null;
const HOLD_MS = 700;

/** `pad`: con el mando el reinicio es Select + Start a la vez (el anillo lo dice). */
function startHold(pad = false): void {
  if (holdTimer || !canRestart() || topModal() || lupaOpen()) return;
  holdRing = document.createElement('div');
  holdRing.className = `hold-ring${pad ? ' chord' : ''}`;
  holdRing.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="42"/><circle class="prog" cx="50" cy="50" r="42" pathLength="100" transform="rotate(-90 50 50)"/></svg><b>${pad ? L('ui.main.reiniciar.pad') : 'R'}</b><span>${L('ui.main.reiniciar')}</span>`;
  document.body.appendChild(holdRing);
  holdTimer = window.setTimeout(() => {
    endHold();
    sfx.stamp();
    platform.vibrate(80, 0.7);
    restartCampaign();
  }, HOLD_MS);
}
function endHold(): void {
  clearTimeout(holdTimer);
  holdTimer = 0;
  holdRing?.remove();
  holdRing = null;
}

// ───────────────────────── Teclado y mando ─────────────────────────

/** Lo último que señaló el puntero: la tecla L abre la lupa ahí si el foco no está en nada. */
let hovered: Element | null = null;
addEventListener('pointermove', (e) => (hovered = e.target as Element), { passive: true });

const typing = (el: Element | null) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
const ARROWS: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

/** Atrás: cierra lo que haya abierto, suelta la selección o vuelve a la pantalla anterior. */
function back(): boolean {
  if (lupaOpen()) {
    closeLupa();
    return true;
  }
  const top = topModal() as HTMLElement | null;
  if (top) {
    if (!top.dataset.sticky) closeModal(top);
    else top.querySelector<HTMLElement>('.cancel')?.click(); // una decisión pendiente solo se cancela si se puede
    return true;
  }
  if (onTableKey('Escape', focused())) return true;
  const btn = document.querySelector<HTMLElement>('#app #back');
  if (btn) btn.click();
  return !!btn;
}

// ───────────────────────── V12 · el Árbol de la Conjura con teclado y mando ─────────────────────────

/** El Árbol está a la vista y nada encima. */
const arbolAqui = () => !!document.querySelector('.arbol-vista') && !topModal() && !lupaOpen();
/** Amplía o aleja alrededor del nodo enfocado (o del centro del pergamino). */
function zumArbol(f: number): void {
  const vp = document.querySelector<HTMLElement>('.arbol-vista');
  const el = focused()?.closest<HTMLElement>('[data-nodo], [data-raiz]');
  if (!vp) return;
  const v = vp.getBoundingClientRect();
  const r = el && vp.contains(el) ? el.getBoundingClientRect() : null;
  arbolVista.zum(f, r ? r.left + r.width / 2 - v.left : undefined, r ? r.top + r.height / 2 - v.top : undefined);
  sfx.focus(f > 1 ? 1 : -1, 0);
}
/** Teclas propias del Árbol. A / Enter sobre un nodo lo elige y lleva el foco a «Comprar» (comprar es otro A). */
function arbolKey(key: string, e?: KeyboardEvent): boolean {
  if (!arbolAqui()) return false;
  const target = focused();
  if (e?.shiftKey && key in ARROWS) {
    const [dx, dy] = ARROWS[key];
    arbolVista.mover(-dx * 90, -dy * 90);
    return true;
  }
  if (key === '+' || key === '=' || (!e && key === 'Speed')) return zumArbol(1.3), true;
  if (key === '-' || key === '−' || (!e && key === 'q')) return zumArbol(1 / 1.3), true;
  if (key === 'Enter' && target?.matches('[data-nodo], [data-raiz]')) {
    target.click(); // lo elige (el panel de detalle lo enseña)
    const buy = document.querySelector<HTMLElement>('#arbol-comprar');
    if (buy && target.matches('[data-nodo]')) enfoca(buy);
    sfx.focus(0, 1);
    return true;
  }
  if (key === 'Escape' && target?.id === 'arbol-comprar') {
    // B / Esc desde «Comprar» vuelve al nodo elegido; otra vez, sale del Árbol
    const nodo = document.querySelector<HTMLElement>('.arbol [data-nodo][aria-current], .arbol [data-raiz][aria-current]');
    if (nodo) return enfoca(nodo), true;
  }
  return false;
}
// la palanca derecha mueve la vista del Árbol (unos 900 px por segundo con la palanca a fondo)
onRightStick((x, y, dt) => {
  if (!arbolAqui()) return false;
  arbolVista.mover(-x * dt * 0.9, -y * dt * 0.9);
  return true;
});

// ───────────────────────── V12 · la tirada de huesos: cualquier tecla la salta ─────────────────────────

/** Con la tirada a la vista: cualquier tecla (salvo moverse) la salta; Esc / B, en el resultado, sigue. */
function ritualKey(key: string): boolean {
  const capa = document.getElementById('ritual');
  if (!capa || topModal()) return false;
  // V12 · los dados rodando: cualquier tecla o botón (también moverse) los para en la cara que salió
  if (terminaTirada()) return true;
  if (key in ARROWS) return false;
  const saltar = capa.querySelector<HTMLElement>('#ritual-saltar');
  if (saltar) {
    // Enter / A sobre «Tirar» tira (es lo mismo: el resultado ya está decidido)
    if (key === 'Enter' && focused()?.id === 'ritual-tirar') return false;
    saltar.click();
    return true;
  }
  if (key === 'Escape') {
    capa.querySelector<HTMLElement>('#ritual-seguir')?.click();
    return true;
  }
  return false;
}

function toggleSettings(): void {
  const open = document.querySelector('.settings-modal');
  if (open) closeModal(open);
  else showSettings();
}

/**
 * Una tecla, venga del teclado o del mando (que llega sin evento). Devuelve true si se atendió.
 * El mando reutiliza las teclas: A = Enter, B = Escape, X = espacio, Y = y, LB = Tab, RB = l, LT = z,
 * L3 = Supr (descartar) y R3 = f (pantalla completa); RT llega como «Speed» y Start como «Start».
 * Con el foco en una herramienta del cinturón, LB y RB la mueven (y el foco viaja con ella).
 */
function onKey(key: string, e?: KeyboardEvent): boolean {
  const target = focused();
  if (ritualKey(key)) return true;
  if (arbolKey(key, e)) return true;
  if (key in ARROWS) {
    // con el teclado, izquierda y derecha dentro de un campo son del campo; el mando no escribe, así que mueve (o ajusta el deslizador)
    if (e && typing(target) && (key === 'ArrowLeft' || key === 'ArrowRight')) return false;
    moveFocus(...ARROWS[key]);
    return true;
  }
  if (key === 'Escape') return back();
  if (e && typing(target)) return false;
  if (key === 'Speed') {
    // gatillo derecho: 1× → 2× → 4× → 8×
    cycleSpeed();
    refreshSpeed();
    toast(L('ui.main.velocidad', { v: speedLabel() }));
    return true;
  }
  // V12 · mando: Select + Start mantenidos a la vez reinician la campaña; Select solo es AUTO, Start solo, Ajustes
  if ((key === 'Start' && padHeld('Select')) || (key === 'Select' && padHeld('Start'))) {
    document.querySelector('.settings-modal')?.remove(); // si Start llegó primero, su ventana se quita
    startHold(true);
    return true;
  }
  if (key === 'Start') {
    toggleSettings();
    return true;
  }
  // V12 · AUTO: A (teclado) o Select (mando), en una campaña
  if ((key === 'Select' || key === 'a' || key === 'A') && S.campaign && !lupaOpen()) {
    alternaAuto();
    return true;
  }
  // V12 · Mejor jugada: Q (teclado) o LT (mando), en la mesa
  if ((key === 'q' || key === 'Q') && S.screen === 'table' && !topModal() && !lupaOpen()) {
    const m = usarMejor();
    if (m) sfx.select(m.cards.length, true);
    if (m) whisper('mejor');
    return true;
  }
  if (key === 'Enter') {
    if (!e) {
      if (!activate()) moveFocus(0, 1); // sin foco todavía: el primer A lo enciende
      return true;
    }
    // el teclado ya pulsa los botones por sí mismo; el resto de cosas enfocables, aquí
    if (!target || target === document.body || target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return false;
    target.click();
    return true;
  }
  if (key === 'l' || key === 'L') {
    if (lupaOpen()) closeLupa();
    else openLupa(target && target !== document.body ? target : hovered);
    return true;
  }
  if (lupaOpen()) return false;
  if (key === 'f' || key === 'F') {
    void platform.toggleFullscreen();
    return true;
  }
  if (key === 'r' || key === 'R') {
    if (!canRestart()) return false;
    startHold();
    return true;
  }
  if (!onTableKey(key, target)) return false;
  // el espacio no debe pulsar, además, el botón que tuviera el foco
  if (key === ' ' && target instanceof HTMLButtonElement) target.blur();
  return true;
}

addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
  if (e.repeat && !(e.key in ARROWS)) return void (e.key === ' ' && !typing(focused()) && S.screen === 'table' && e.preventDefault());
  keysInUse();
  if (onKey(e.key, e)) e.preventDefault();
});
addEventListener('keyup', (e) => {
  if (e.key === 'r' || e.key === 'R') endHold();
});
addEventListener('blur', endHold);
bindNav(
  (key) => {
    entradaMando(key); // V12: cualquier botón (salvo Select y RT) apaga AUTO, en la misma pulsación
    void onKey(key);
  },
  (key) => (key === 'Select' || key === 'Start') && endHold(),
);

// en desarrollo, el estado queda a mano en la consola para depurar
if (import.meta.env.DEV) Object.assign(window, { __derrumbe: S });
retireOldSave();
setScreen('home');
openSeedLink(); // enlace de un acta (?seed=…&baraja=…&nivel=…): a la preparación de campaña, con todo cargado
connect();
// control de calidad visual: estados montados a mano, solo si la dirección lleva ?qa
if (new URLSearchParams(location.search).has('qa')) {
  void import('./qa').then((m) => m.installQa());
  // V11: la campaña de cinco asaltos de la prueba de humo (scripts/campana-qa.ts)
  void import('./qa-juice').then((m) => m.installQaJuice());
  // el banco de la forja de grabado (npm run forja): cada pieza del arte, suelta
  void import('./forja-qa').then((m) => m.installForja());
}
