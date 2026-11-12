// Aviso de tinta desvanecida. Toda caja con desplazamiento propio que esconde contenido lo dice: lleva
// data-mas="arriba", "abajo" o "arriba abajo" mientras quede algo por ver, y theme.css pinta el borde
// correspondiente desvanecido con una máscara. Al llegar al final, el aviso se va.
// Se recalcula al desplazar, al cambiar la pantalla y al cambiar el tamaño de la ventana. Solo lee
// cajas: no toca la partida ni guarda nada.

/** Lo que nunca se desplaza por sí mismo (el arte de las cartas y los SVG). */
const SKIP = 'svg, .card, .focus-ring';

function mark(el: HTMLElement): void {
  const up = el.scrollTop > 2;
  const down = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
  const v = [up ? 'arriba' : '', down ? 'abajo' : ''].filter(Boolean).join(' ');
  if ((el.dataset.mas ?? '') === v) return;
  if (v) el.dataset.mas = v;
  else delete el.dataset.mas;
}

const scrolls = (el: HTMLElement) => {
  if (el.scrollHeight <= el.clientHeight + 1) return false;
  return /(auto|scroll)/.test(getComputedStyle(el).overflowY);
};

function scan(): void {
  for (const el of document.querySelectorAll<HTMLElement>('[data-mas]')) if (!el.isConnected || !scrolls(el)) delete el.dataset.mas;
  for (const el of document.body.querySelectorAll<HTMLElement>('div, section, aside, article, main, ul, ol, form, nav')) {
    if (el.closest(SKIP)) continue;
    if (scrolls(el)) mark(el);
  }
}

let timer = 0;
/** Pide un recuento: se agrupan los cambios seguidos en uno solo. */
export function refreshInk(): void {
  if (timer) return;
  timer = window.setTimeout(() => {
    timer = 0;
    scan();
  }, 90);
}

function install(): void {
  addEventListener('scroll', (e) => e.target instanceof HTMLElement && e.target.dataset.mas !== undefined ? mark(e.target) : refreshInk(), { capture: true, passive: true });
  addEventListener('resize', refreshInk);
  new MutationObserver(refreshInk).observe(document.body, { childList: true, subtree: true });
  refreshInk();
}

if (typeof document !== 'undefined') {
  if (document.body) install();
  else addEventListener('DOMContentLoaded', install, { once: true });
}
