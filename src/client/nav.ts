// Navegación sin ratón: flechas o cruceta mueven un foco con cantoneras de latón al elemento más
// cercano en esa dirección; A / Enter lo pulsa. Sirve igual en todas las pantallas porque no conoce
// ninguna: solo mira qué se puede pulsar y dónde está.
//
//   Teclado   flechas · Enter elegir · Espacio golpear · Y andamio · Esc atrás · F pantalla completa
//   Mando     cruceta o palanca · A elegir · X golpear · Y andamio · B atrás · LB mazo · RB lupa
//             Start ajustes · mantener Select reinicia la campaña
import { platform } from './platform';

const FOCUSABLE = 'button:not(:disabled), input, select, [tabindex="0"]';
let ring: HTMLDivElement | null = null;
let usingKeys = false;

/** La capa en la que se navega: la ventana de arriba si hay alguna, o la pantalla. */
function scope(): ParentNode {
  const layers = [...document.querySelectorAll<HTMLElement>('.modal, .end, .lupa')];
  return layers[layers.length - 1] ?? document.getElementById('app') ?? document;
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
  if (!el || !usingKeys || el === document.body) {
    ring.classList.remove('on');
    return;
  }
  const r = el.getBoundingClientRect();
  ring.style.transform = `translate(${r.left - 6}px, ${r.top - 6}px)`;
  ring.style.width = `${r.width + 12}px`;
  ring.style.height = `${r.height + 12}px`;
  ring.classList.add('on');
}

/** Lo que tiene desplazamiento propio: solo ahí dentro se mueve la vista para enseñar lo enfocado. */
const SCROLLERS = '.scroll, .run-body, .modal-box, .lupa-sheet, .lupa-box, .home-right, .lobby-side, .camp-grid, .acta-sheet';

/** Enfoca sin que el navegador desplace la pantalla (la mesa no se mueve nunca). */
function reveal(el: HTMLElement): void {
  el.focus({ preventScroll: true });
  if (el.closest(SCROLLERS)) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** Mueve el foco al elemento pulsable más cercano en la dirección (dx, dy). */
export function moveFocus(dx: number, dy: number): void {
  usingKeys = true;
  const list = candidates();
  if (!list.length) return;
  const from = document.activeElement instanceof HTMLElement && list.includes(document.activeElement) ? document.activeElement : null;
  if (!from) {
    const first = list.find((el) => el.matches('.primary, .choice.pick, #hand .card')) ?? list[0];
    reveal(first);
    return showRing(first);
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
  if (!best) return;
  reveal(best);
  showRing(best);
}

/** Pulsa lo que tiene el foco. */
export function activate(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || el === document.body) return false;
  el.click();
  return true;
}

export const focused = () => (document.activeElement instanceof HTMLElement ? document.activeElement : null);

// ───────────────────────── Mando ─────────────────────────

type Handler = (key: string) => void;
let handler: Handler = () => undefined;
let release: Handler = () => undefined;
const held = new Map<string, number>();

/** Convierte botones y palanca en las mismas teclas que usa el teclado. */
function poll(now: number): void {
  const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p && p.connected);
  if (pad) {
    const down = (i: number) => !!pad.buttons[i]?.pressed;
    const axis = (i: number) => pad.axes[i] ?? 0;
    const state: Record<string, boolean> = {
      ArrowUp: down(12) || axis(1) < -0.55,
      ArrowDown: down(13) || axis(1) > 0.55,
      ArrowLeft: down(14) || axis(0) < -0.55,
      ArrowRight: down(15) || axis(0) > 0.55,
      Enter: down(0),
      Escape: down(1),
      ' ': down(2),
      y: down(3),
      Tab: down(4),
      l: down(5),
      r: down(8),
      Start: down(9),
    };
    for (const [key, on] of Object.entries(state)) {
      const since = held.get(key);
      if (!on) {
        if (since !== undefined) release(key);
        held.delete(key);
      } else if (since === undefined) {
        held.set(key, now);
        handler(key);
      } else if (key.startsWith('Arrow') && now - since > 380) {
        held.set(key, now - 250); // repetición al mantener
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
  addEventListener('gamepadconnected', () => platform.vibrate(60, 0.4));
  requestAnimationFrame(poll);
  document.addEventListener('focusin', (e) => showRing(e.target as Element));
  document.addEventListener('focusout', () => showRing(null));
  document.addEventListener('pointerdown', () => {
    usingKeys = false;
    showRing(null);
  });
  addEventListener('resize', () => showRing(document.activeElement));
  addEventListener('scroll', () => showRing(document.activeElement), true);
}
/** El teclado también enciende el foco de latón. */
export function keysInUse(): void {
  usingKeys = true;
}
