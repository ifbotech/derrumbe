// Navegación sin ratón: flechas, cruceta o palanca mueven un foco con cantoneras de latón al elemento
// más cercano en esa dirección; A / Enter lo pulsa. Sirve igual en todas las pantallas porque no
// conoce ninguna: solo mira qué se puede pulsar y dónde está.
//
//   Teclado   flechas · Enter elegir · Espacio golpear · Y andamio · Z tiza · L lupa · Tab mazo
//             Esc atrás · F pantalla completa · mantener R reinicia la campaña
//   Mando     cruceta o palanca · A elegir · X golpear · Y andamio · B atrás · LB mazo · RB lupa
//             LT tiza · RT velocidad · Start ajustes · mantener Select reinicia la campaña
//
// También lleva la cuenta de con qué se está jugando (ratón, teclado o mando) y lo deja en
// <html data-input="…">: las indicaciones de cada botón (prompts.ts) cambian solas con eso.
import { platform } from './platform';

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select, [tabindex="0"]';
/** Lo que tiene desplazamiento propio: solo ahí dentro se mueve la vista para enseñar lo enfocado. */
const SCROLLERS = '.scroll, .run-body, .modal-box, .lupa-sheet, .lupa-box, .home-right, .lobby-side, .camp-grid, .acta-sheet';

export type InputMode = 'pointer' | 'keys' | 'pad';
let mode: InputMode = 'pointer';
let ring: HTMLDivElement | null = null;

export const inputMode = (): InputMode => mode;
/** Con qué se está jugando: decide qué indicaciones se enseñan (tecla, botón del mando o ninguna). */
export function setMode(next: InputMode): void {
  if (mode === next) return;
  mode = next;
  document.documentElement.dataset.input = next;
  if (next === 'pointer') showRing(null);
}

/** La capa en la que se navega: la ventana de arriba si hay alguna, o la pantalla. */
function scope(): HTMLElement {
  const layers = [...document.querySelectorAll<HTMLElement>('.modal, .end, .lupa')];
  return layers[layers.length - 1] ?? document.getElementById('app') ?? document.body;
}

function candidates(): HTMLElement[] {
  return [...scope().querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.closest('[hidden]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  });
}

function showRing(el: Element | null): void {
  if (!ring) {
    ring = document.createElement('div');
    ring.className = 'focus-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
  }
  if (!el || mode === 'pointer' || el === document.body) {
    ring.classList.remove('on');
    return;
  }
  const r = el.getBoundingClientRect();
  ring.style.transform = `translate(${r.left - 6}px, ${r.top - 6}px)`;
  ring.style.width = `${r.width + 12}px`;
  ring.style.height = `${r.height + 12}px`;
  ring.classList.add('on');
}

/** Enfoca sin que el navegador desplace la pantalla (la mesa no se mueve nunca). */
function reveal(el: HTMLElement): void {
  el.focus({ preventScroll: true });
  if (el.closest(SCROLLERS)) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  showRing(el);
}

/**
 * Mueve el foco al elemento pulsable más cercano en la dirección (dx, dy). Si el foco está en un
 * deslizador, izquierda y derecha cambian su valor; si no queda nada hacia ese lado, se desplaza la
 * ventana (así se leen las reglas con el mando y ninguna ventana atrapa el foco).
 */
export function moveFocus(dx: number, dy: number): void {
  if (mode === 'pointer') setMode('keys');
  const layer = scope();
  const list = candidates();
  const active = document.activeElement;
  const from = active instanceof HTMLElement && layer.contains(active) && list.includes(active) ? active : null;
  if (from instanceof HTMLInputElement && from.type === 'range' && dx) {
    const step = Number(from.step) || 1;
    from.value = String(Math.max(Number(from.min), Math.min(Number(from.max), Number(from.value) + dx * step)));
    from.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  if (!from) {
    const first = list.find((el) => el.matches('.primary, .choice.pick, #hand .card')) ?? list[0];
    if (first) reveal(first);
    return;
  }
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === from) continue;
    const b = el.getBoundingClientRect();
    const along = (b.left + b.width / 2 - ax) * dx + (b.top + b.height / 2 - ay) * dy;
    const across = Math.abs((b.left + b.width / 2 - ax) * dy) + Math.abs((b.top + b.height / 2 - ay) * dx);
    if (along < 8) continue; // tiene que estar hacia ese lado
    const score = along + across * 2.4; // se prefiere lo que queda en línea
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) return reveal(best);
  const scroller = from.closest<HTMLElement>(SCROLLERS) ?? layer.querySelector<HTMLElement>(SCROLLERS);
  scroller?.scrollBy({ top: dy * 140, left: dx * 140 });
  showRing(from);
}

/** Pulsa lo que tiene el foco. */
export function activate(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || el === document.body || !scope().contains(el)) return false;
  el.click();
  return true;
}

export const focused = () => (document.activeElement instanceof HTMLElement ? document.activeElement : null);

// ───────────────────────── Mando ─────────────────────────

type Handler = (key: string) => void;
let handler: Handler = () => undefined;
let release: Handler = () => undefined;
/** Tecla → instante en que toca repetirla (solo se repiten las direcciones). */
const held = new Map<string, number>();

/** Zona muerta de la palanca, primera repetición al mantener y ritmo de las siguientes (ms). */
export const PAD = { deadzone: 0.28, first: 320, repeat: 110 };
/** Botones del mando estándar (W3C) y la tecla a la que equivalen. */
const BUTTONS: [number, string][] = [
  [12, 'ArrowUp'],
  [13, 'ArrowDown'],
  [14, 'ArrowLeft'],
  [15, 'ArrowRight'],
  [0, 'Enter'], // A
  [1, 'Escape'], // B
  [2, ' '], // X
  [3, 'y'], // Y
  [4, 'Tab'], // LB
  [5, 'l'], // RB
  [6, 'z'], // LT
  [7, 'Speed'], // RT
  [8, 'r'], // Select
  [9, 'Start'],
];

/** Convierte botones y palanca en las mismas teclas que usa el teclado. */
function poll(now: number): void {
  const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected);
  if (pad) {
    const down = (i: number) => !!pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5);
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    // la palanca cuenta en su eje dominante, y solo fuera de la zona muerta
    const tilt = Math.hypot(x, y) > PAD.deadzone;
    const horizontal = Math.abs(x) >= Math.abs(y);
    const state: Record<string, boolean> = Object.fromEntries(BUTTONS.map(([i, key]) => [key, down(i)]));
    state.ArrowUp ||= tilt && !horizontal && y < 0;
    state.ArrowDown ||= tilt && !horizontal && y > 0;
    state.ArrowLeft ||= tilt && horizontal && x < 0;
    state.ArrowRight ||= tilt && horizontal && x > 0;
    for (const [key, on] of Object.entries(state)) {
      const next = held.get(key);
      if (!on) {
        if (next !== undefined) release(key);
        held.delete(key);
      } else if (next === undefined) {
        setMode('pad');
        held.set(key, now + PAD.first);
        handler(key);
      } else if (key.startsWith('Arrow') && now >= next) {
        held.set(key, now + PAD.repeat);
        handler(key);
      }
    }
  }
  requestAnimationFrame(poll);
}

/** Arranca la navegación. `onKey` recibe las teclas del mando como si fueran del teclado. */
export function bindNav(onKey: Handler, onKeyUp: Handler = () => undefined): void {
  handler = onKey;
  release = onKeyUp;
  document.documentElement.dataset.input = mode;
  addEventListener('gamepadconnected', () => platform.vibrate(60, 0.4));
  requestAnimationFrame(poll);
  document.addEventListener('focusin', (e) => showRing(e.target as Element));
  document.addEventListener('focusout', () => showRing(null));
  document.addEventListener('pointerdown', () => setMode('pointer'));
  document.addEventListener('pointermove', (e) => (e.movementX || e.movementY) && mode !== 'pointer' && e.pointerType === 'mouse' && setMode('pointer'));
  addEventListener('resize', () => showRing(document.activeElement));
  addEventListener('scroll', () => showRing(document.activeElement), true);
}
/** El teclado también enciende el foco de latón. */
export function keysInUse(): void {
  setMode('keys');
}
