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
import './tinta';
import { sfx, startMusic } from './audio';
import { canRestart, isRunHost, restartCampaign, retireOldSave } from './campaign';
import { bindEyes, ensureDefs } from './card';
import { S, applySettings, bindClacks, bindTips, closeModal, cycleSpeed, speedLabel, toast, topModal } from './core';
import { bakeGrain } from './engraving';
import { bindLupa, closeLupa, lupaOpen, openLupa } from './lupa';
import { activate, beltSlot, bindNav, focused, keysInUse, moveFocus, shiftBelt } from './nav';
import { connect } from './net';
import { openSeedLink } from './lamina';
import { bindPings } from './pings';
import { platform } from './platform';
import { setScreen } from './router';
import { onTableKey, refreshSpeed } from './table';
import { showSettings } from './widgets';

bakeGrain();
ensureDefs();
bindEyes();
bindTips();
bindClacks();
bindLupa();
bindPings(() => !S.campaign || isRunHost());
applySettings();
addEventListener('pointerdown', startMusic, { once: true });
addEventListener('keydown', startMusic, { once: true });

// ───────────────────────── Mantener R: reinicio rápido ─────────────────────────

let holdTimer = 0;
let holdRing: HTMLElement | null = null;
const HOLD_MS = 700;

function startHold(): void {
  if (holdTimer || !canRestart() || topModal() || lupaOpen()) return;
  holdRing = document.createElement('div');
  holdRing.className = 'hold-ring';
  holdRing.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="track" cx="50" cy="50" r="42"/><circle class="prog" cx="50" cy="50" r="42" pathLength="100" transform="rotate(-90 50 50)"/></svg><b>R</b><span>Reiniciar campaña</span>`;
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
  if (key in ARROWS) {
    if (e?.shiftKey) return false; // Mayús + flechas reordena el cinturón
    // con el teclado, izquierda y derecha dentro de un campo son del campo; el mando no escribe, así que mueve (o ajusta el deslizador)
    if (e && typing(target) && (key === 'ArrowLeft' || key === 'ArrowRight')) return false;
    moveFocus(...ARROWS[key]);
    return true;
  }
  if (key === 'Escape') return back();
  // LB / RB sobre una herramienta del cinturón: moverla. Fuera de él siguen siendo mazo y lupa
  const slot = !e && (key === 'Tab' || key === 'l') ? beltSlot(target) : null;
  if (slot) {
    shiftBelt(slot, key === 'Tab' ? -1 : 1);
    return true;
  }
  if (e && typing(target)) return false;
  if (key === 'Speed') {
    // gatillo derecho: 1× → 2× → 4×
    cycleSpeed();
    refreshSpeed();
    toast(`Velocidad ${speedLabel()}`);
    return true;
  }
  if (key === 'Start') {
    toggleSettings();
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
  (key) => void onKey(key),
  (key) => key === 'r' && endHold(),
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
  // el banco de la forja de grabado (npm run forja): cada pieza del arte, suelta
  void import('./forja-qa').then((m) => m.installForja());
}
