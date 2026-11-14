// Navegación sin ratón: flechas, cruceta o palanca mueven un foco de papel y tinta al elemento más cercano en
// esa dirección; A / Enter lo pulsa. Sirve igual en todas las pantallas porque no conoce ninguna: solo
// mira qué se puede pulsar y dónde está.
//
//   Teclado   flechas · Enter elegir · Espacio golpear · Y La Manga · Z Rebobinar · Supr descartar · L lupa
//             Tab mazo · Esc atrás · F pantalla completa · Mayús + flechas reordena las reliquias
//             · mantener R reinicia la campaña
//   Mando     cruceta o palanca · A elegir · X golpear · Y La Manga · B atrás · L3 descartar · LB mazo
//             · RB lupa (con el foco en una reliquia, LB / RB la mueven a izquierda y derecha)
//             · LT Rebobinar · RT velocidad · R3 pantalla completa · Start ajustes · mantener Select reinicia
//
// El foco responde en el mismo fotograma de la pulsación (marco, salto de escala y un toque de latón)
// y marca lo enfocado con data-foco (V8 · A1: la carta enfocada de la mano se levanta, theme.css),
// y nunca espera a que la mesa acabe de animar. Si la pantalla se redibuja bajo el foco, el foco vuelve
// al mismo elemento redibujado (o al más cercano): con mando nunca se queda en el aire.
//
// También lleva la cuenta de con qué se está jugando (ratón, teclado o mando) y lo deja en
// <html data-input="…">: las indicaciones de cada botón (prompts.ts) cambian solas con eso.
import { sfx } from './audio';
import { platform } from './platform';
import { t } from '../shared/i18n';

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select, [tabindex="0"]';
/** Lo que tiene desplazamiento propio: solo ahí dentro se mueve la vista para enseñar lo enfocado. */
const SCROLLERS = '.scroll, .run-body, .modal-box, .lupa-sheet, .lupa-box, .home-right, .lobby-side, .camp-grid, .acta-sheet, .deck-rows';
/** Atributos que identifican un elemento aunque se vuelva a pintar (para devolverle el foco). */
const KEYS = ['id', 'data-id', 'data-slot', 'data-suit', 'data-tab', 'data-set', 'data-vol', 'data-i', 'data-opt', 'data-lang'];

export type InputMode = 'pointer' | 'keys' | 'pad';
let mode: InputMode = 'pointer';
let ring: HTMLDivElement | null = null;
/** Dónde está pintado el marco ahora mismo (para no tocar el DOM si nada se ha movido). */
let ringAt = '';

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

function ringEl(): HTMLDivElement {
  if (!ring) {
    ring = document.createElement('div');
    ring.className = 'focus-ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = '<i></i><span class="pad-hint" hidden></span>';
    document.body.appendChild(ring);
  }
  return ring;
}

/** Lo que lleva data-foco ahora mismo (una sola cosa a la vez). */
let marked: Element | null = null;
/** V8 · A1: data-foco va en lo enfocado con teclado o mando, y se le quita a lo anterior. */
function mark(el: Element | null): void {
  if (marked === el) return;
  marked?.removeAttribute('data-foco');
  marked = el;
  el?.setAttribute('data-foco', '');
}

/** Coloca el marco sobre el elemento. Solo cambia transform, ancho y alto: nada de reflujo en la página. */
function place(el: Element): void {
  const r = el.getBoundingClientRect();
  const at = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
  if (at === ringAt) return;
  ringAt = at;
  const box = ringEl();
  box.style.transform = `translate(${r.left - 6}px, ${r.top - 6}px)`;
  box.style.width = `${r.width + 12}px`;
  box.style.height = `${r.height + 12}px`;
  // la insignia del mando (SD5) va debajo del marco; arriba si no cabe, y pegada al lado si el marco toca el borde
  box.classList.toggle('hint-up', r.bottom + 56 > innerHeight);
  box.classList.toggle('hint-l', r.left + r.width / 2 < 130);
  box.classList.toggle('hint-r', r.left + r.width / 2 > innerWidth - 130);
}

// ── SD5 (V10): en La Taberna, con el mando, lo enfocado lleva Ⓐ y su verbo ──
/** [selector, verbo]: lo que se enfoca en La Taberna y qué hace A sobre ello. Ninguna acción nueva. */
const SHOP_VERBS: [string, string][] = [
  ['#offers .choice', 'ui.pad.comprar'],
  ['.belt-slot.tool', 'ui.pad.elegir'],
  ['#heal', 'ui.pad.curar'],
  ['#burn', 'ui.pad.quemar'],
  ['#reroll', 'ui.pad.renovar'],
  ['#go', 'ui.pad.seguir'],
  ['#deck-view', 'ui.pad.ver'],
];
const padKey = (b: string) => `<kbd class="kh pd b-${b.toLowerCase()}">${b}</kbd>`;
/** La insignia de lo enfocado: vacía sin mando, fuera de La Taberna o con una ventana encima. */
export function padPrompt(el: Element | null): string {
  if (mode !== 'pad' || !el || !el.closest('.run-body.shop') || el.closest('.modal')) return '';
  const hit = SHOP_VERBS.find(([sel]) => el.matches(sel));
  if (!hit) return '';
  const a = `<b>${padKey('A')}${t(hit[1])}</b>`;
  // sobre una reliquia, LB / RB la mueven (beltLeft / beltRight de prompts.ts)
  return el.matches('.belt-slot.tool') && el.closest('.belt.can-order') ? `${a}<b>${padKey('LB')}${padKey('RB')}${t('ui.pad.mover')}</b>` : a;
}
let hintNow = '';
function paintPrompt(el: Element | null): void {
  const html = padPrompt(el);
  if (html === hintNow) return;
  hintNow = html;
  const span = ringEl().querySelector<HTMLElement>('.pad-hint')!;
  span.innerHTML = html;
  span.hidden = !html;
}

function showRing(el: Element | null, hop = false): void {
  const box = ringEl();
  if (!el || mode === 'pointer' || el === document.body) {
    box.classList.remove('on');
    ringAt = '';
    mark(null);
    paintPrompt(null);
    return;
  }
  mark(el);
  place(el);
  paintPrompt(el);
  box.classList.add('on');
  if (hop) {
    // salto de escala leve al llegar: se reinicia la animación aunque el anterior no hubiera acabado
    box.classList.remove('hop');
    void box.offsetWidth;
    box.classList.add('hop');
  }
}

// ── el foco sobrevive a los redibujados ──

/** Lo último enfocado con teclado o mando, con lo que hace falta para encontrarlo si se vuelve a pintar. */
let last: { el: HTMLElement; sel: string; x: number; y: number; lost: number } | null = null;
/** Un destino pedido a mano (la reliquia que se acaba de mover): gana a todo lo demás. */
let wanted: { sel: string; until: number } | null = null;

function signature(el: HTMLElement): string {
  const attrs = KEYS.filter((k) => el.hasAttribute(k)).map((k) => (k === 'id' ? `#${CSS.escape(el.id)}` : `[${k}="${CSS.escape(el.getAttribute(k)!)}"]`));
  if (!attrs.length) return '';
  const cls = el.classList[0] ? `.${CSS.escape(el.classList[0])}` : el.tagName.toLowerCase();
  return `${cls}${attrs.join('')}`;
}

function remember(el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  last = { el, sel: signature(el), x: r.left + r.width / 2, y: r.top + r.height / 2, lost: 0 };
}

/** Pide que el foco vaya a este selector en cuanto exista (lo usa el cinturón al reordenar). */
export function expectFocus(sel: string, ms = 900): void {
  wanted = { sel, until: performance.now() + ms };
}

/** Cada fotograma: el marco sigue a lo enfocado y, si lo enfocado desaparece, el foco busca su sitio. */
function keepFocus(now: number): void {
  if (mode === 'pointer') return;
  if (wanted) {
    const hit = [...scope().querySelectorAll<HTMLElement>(wanted.sel)].find((el) => candidates().includes(el));
    if (hit) {
      wanted = null;
      reveal(hit, true);
      hit.classList.remove('pop');
      void hit.offsetWidth;
      hit.classList.add('pop');
      return;
    }
    if (now > wanted.until) wanted = null;
  }
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body && active.isConnected) {
    if (ring?.classList.contains('on')) place(active);
    return;
  }
  if (!last || last.el.isConnected) return;
  // lo enfocado se ha vuelto a pintar: primero se busca el mismo elemento, luego el más cercano
  last.lost++;
  const list = candidates();
  const same = last.sel ? list.find((el) => el.matches(last!.sel)) : undefined;
  if (same) return reveal(same, false);
  if (last.lost < 8) return; // se le da un momento al redibujado
  let best: HTMLElement | null = null;
  let dist = Infinity;
  for (const el of list) {
    const r = el.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - last.x, r.top + r.height / 2 - last.y);
    if (d < dist) {
      dist = d;
      best = el;
    }
  }
  if (best) reveal(best, false);
  else last = null;
}

/** Enfoca sin que el navegador desplace la pantalla (la mesa no se mueve nunca). */
function reveal(el: HTMLElement, hop = true): void {
  el.focus({ preventScroll: true });
  if (el.closest(SCROLLERS)) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  remember(el);
  showRing(el, hop);
}

/**
 * El vecino en la dirección (dx, dy), fila a fila, con huecos entre BORDES (una torre alta queda cerca
 * aunque su centro esté lejos):
 *   1. Si algo queda en línea (su franja lateral se solapa con la nuestra) y su hueco no pasa de
 *      2,5 × el hueco más corto + 80 px, gana el de menor hueco en línea.
 *   2. Si no, gana el de menor «hueco + 1,5 × desvío lateral entre bordes» (la fila siguiente, aunque
 *      quede a un lado, antes que un botón en la vertical al otro extremo de la pantalla).
 * Solo cuenta lo que queda hacia ese lado (centro a 8 px o más). Lo que está «al lado» —solapado en la
 * dirección más de media altura y en diagonal, como las cartas del abanico— solo cuenta si no hay nada más.
 * A igualdad, el de centro más alineado.
 */
function nearest(a: DOMRect, list: HTMLElement[], dx: number, dy: number): HTMLElement | null {
  const ax = a.left + a.width / 2;
  const ay = a.top + a.height / 2;
  type Option = { el: HTMLElement; gap: number; side: number; off: number; beside: boolean };
  const all: Option[] = [];
  for (const el of list) {
    const b = el.getBoundingClientRect();
    const along = (b.left + b.width / 2 - ax) * dx + (b.top + b.height / 2 - ay) * dy;
    if (along < 8) continue; // tiene que estar hacia ese lado
    // hueco en la dirección (negativo si se solapan) y desvío lateral entre bordes (0 si están en línea)
    const gap = dx > 0 ? b.left - a.right : dx < 0 ? a.left - b.right : dy > 0 ? b.top - a.bottom : a.top - b.bottom;
    const side = dx ? Math.max(0, b.top - a.bottom, a.top - b.bottom) : Math.max(0, b.left - a.right, a.left - b.right);
    const size = dx ? Math.min(a.width, b.width) : Math.min(a.height, b.height);
    const off = Math.abs((b.left + b.width / 2 - ax) * dy) + Math.abs((b.top + b.height / 2 - ay) * dx);
    all.push({ el, gap: Math.max(0, gap), side, off, beside: -gap > size / 2 && side > 0 });
  }
  const ahead = all.filter((o) => !o.beside);
  const pool = ahead.length ? ahead : all;
  if (!pool.length) return null;
  const pick = (score: (o: Option) => number, from: Option[]) =>
    from.reduce((best, o) => {
      const d = score(o) - score(best);
      return d < -0.5 || (Math.abs(d) <= 0.5 && o.off < best.off) ? o : best;
    }).el;
  const minGap = Math.min(...pool.map((o) => o.gap));
  const inline = pool.filter((o) => o.side === 0 && o.gap <= minGap * 2.5 + 80);
  return inline.length ? pick((o) => o.gap, inline) : pick((o) => o.gap + o.side * 1.5, pool);
}

/**
 * Mueve el foco al elemento pulsable más cercano en la dirección (dx, dy) (ver `nearest`). Si el foco está en un
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
    sfx.focus(dx, 0);
    return;
  }
  if (!from) {
    const first = list.find((el) => el.matches('.primary, .choice.pick, #hand .card')) ?? list[0];
    if (first) {
      reveal(first);
      sfx.focus();
    }
    return;
  }
  const best = nearest(from.getBoundingClientRect(), list.filter((el) => el !== from), dx, dy);
  if (best) {
    reveal(best);
    sfx.focus(dx, dy);
    return;
  }
  const scroller = from.closest<HTMLElement>(SCROLLERS) ?? layer.querySelector<HTMLElement>(SCROLLERS);
  const before = scroller ? scroller.scrollTop + scroller.scrollLeft : 0;
  scroller?.scrollBy({ top: dy * 140, left: dx * 140 });
  if (!scroller || scroller.scrollTop + scroller.scrollLeft === before) sfx.edge();
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

// ───────────────────────── Reliquias (el cinturón, .belt) ─────────────────────────

/** La reliquia que tiene el foco (o que es el destino de una tecla), si la hay. */
export function beltSlot(el: Element | null): HTMLElement | null {
  return el instanceof HTMLElement ? el.closest<HTMLElement>('.belt-slot.tool') : null;
}

/**
 * Mueve la herramienta enfocada un hueco a la izquierda (−1) o a la derecha (+1). El cinturón
 * (widgets.ts) ya sabe moverla con Mayús + flechas: se le manda esa misma tecla y el foco viaja con la
 * herramienta a su hueco nuevo. Con el mando es LB / RB; con el teclado, Mayús + flechas.
 */
export function shiftBelt(slot: HTMLElement, dir: -1 | 1, viaKeyboard = false): void {
  const belt = slot.closest('.belt');
  const from = Number(slot.dataset.slot);
  const tools = belt ? belt.querySelectorAll('.belt-slot.tool').length : 0;
  const to = from + dir;
  if (!belt?.classList.contains('can-order') || to < 0 || to >= tools) {
    sfx.edge();
    showRing(slot, true);
    return;
  }
  const host = slot.closest('#beltbar') ? '#beltbar' : slot.closest('.run-belt') ? '.run-belt' : '';
  expectFocus(`${host} .belt-slot[data-slot="${to}"][data-id="${CSS.escape(slot.dataset.id ?? '')}"]`.trim());
  // con el teclado, el propio cinturón ya ha recibido la tecla: solo queda seguir a la herramienta
  if (!viaKeyboard) slot.dispatchEvent(new KeyboardEvent('keydown', { key: dir < 0 ? 'ArrowLeft' : 'ArrowRight', shiftKey: true, bubbles: true, cancelable: true }));
}

// ───────────────────────── Mando ─────────────────────────

type Handler = (key: string) => void;
let handler: Handler = () => undefined;
let release: Handler = () => undefined;
/** Tecla → instante en que toca repetirla (solo se repiten las direcciones). */
const held = new Map<string, number>();

/** Zona muerta de la palanca, primera repetición al mantener y ritmo de las siguientes (ms). */
export const PAD = { deadzone: 0.28, first: 320, repeat: 110 };
/**
 * Botones del mando estándar (W3C) y la tecla a la que equivalen. LB y RB llegan como Tab y l: sobre
 * una herramienta del cinturón main.ts los convierte en «moverla» (beltLeft / beltRight de prompts.ts).
 */
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
  [10, 'Delete'], // L3: pulsar la palanca izquierda descarta lo elegido
  [11, 'f'], // R3: pulsar la palanca derecha, pantalla completa
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
  keepFocus(now);
  requestAnimationFrame(poll);
}

/** Arranca la navegación. `onKey` recibe las teclas del mando como si fueran del teclado. */
export function bindNav(onKey: Handler, onKeyUp: Handler = () => undefined): void {
  handler = onKey;
  release = onKeyUp;
  document.documentElement.dataset.input = mode;
  addEventListener('gamepadconnected', () => platform.vibrate(60, 0.4));
  requestAnimationFrame(poll);
  document.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    if (mode !== 'pointer' && el instanceof HTMLElement && el !== document.body) remember(el);
    showRing(el);
  });
  document.addEventListener('focusout', () => showRing(null));
  // Mayús + flechas sobre el cinturón: el cinturón mueve la herramienta y aquí el foco se va con ella
  addEventListener(
    'keydown',
    (e) => {
      const slot = e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? beltSlot(e.target as Element) : null;
      if (slot) shiftBelt(slot, e.key === 'ArrowLeft' ? -1 : 1, true);
    },
    true,
  );
  document.addEventListener('pointerdown', () => {
    setMode('pointer');
    last = null;
  });
  document.addEventListener('pointermove', (e) => (e.movementX || e.movementY) && mode !== 'pointer' && e.pointerType === 'mouse' && setMode('pointer'));
  addEventListener('resize', () => showRing(document.activeElement));
  addEventListener('scroll', () => showRing(document.activeElement), true);
}
/** El teclado también enciende el foco de latón. */
export function keysInUse(): void {
  setMode('keys');
}
