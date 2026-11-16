// V12 · bloque B de arte: lo que cae a la mesa y la bolsa (SPECS/V12.md, apartado 1.3).
//
// Las piezas son la VISTA de lo que ya se cobró (`trackEvents` abona en el acto): monedas, esquirlas de corona
// de hierro y gotas de lacre, grabadas en SVG (`grabado12.ts`). Aquí vive el DOM quieto:
//   · la capa `#caida` (fija, sin punteros) con un depósito de 40 piezas reutilizables `.caida-pieza`
//     (`.caida-moneda`, `.caida-esquirla`, `.caida-gota`), que nunca se crean ni se destruyen en caliente;
//   · `crearPieza(tipo, n)` toma una pieza del depósito; `colocarCaida(piezas)` las deja en reposo junto a su
//     trono, en un hueco que no tapa la mano, la cuenta, Golpear, las cifras de los tronos ni la bolsa;
//   · la bolsa `#bolsa` (en la barra de arriba, sustituye al oro: un solo sitio para el oro) con
//     `#bolsa-oro`, `#bolsa-esquirlas` y `#bolsa-gotas` en notación compacta.
// El vuelo de las piezas a la bolsa (el imán), su sonido y su ritmo los pone juice-ux (`iman.ts`): solo
// `transform` y `opacity` sobre estas mismas piezas.
import type { Pieza } from '../rules/caida';
import type { Suit } from '../rules/engine';
import { cifraEl } from './cifra';
import { L } from './lengua';
import { PIEZA_SVG } from './grabado12';
import { t } from '../shared/i18n';

export type TipoPieza = Pieza['tipo'];
const POOL = 40;

/** Lo que cayó en la última tanda y aún no se ha hecho volar: lo llena la campaña y lo vacía juice-ux. */
export const caidaPendiente: Pieza[] = [];

let capa: HTMLElement | null = null;
let piezas: HTMLElement[] = [];
let turno = 0;

/** La capa `#caida` con su depósito de 40 piezas (se monta una vez; si la mesa se rehace, se vuelve a colgar). */
export function capaCaida(): HTMLElement {
  if (capa && capa.isConnected) return capa;
  capa = document.getElementById('caida') ?? document.createElement('div');
  capa.id = 'caida';
  capa.setAttribute('aria-hidden', 'true');
  if (!piezas.length) {
    for (let i = 0; i < POOL; i++) {
      const p = document.createElement('div');
      p.className = 'caida-pieza';
      p.hidden = true;
      p.dataset.i = String(i);
      piezas.push(p);
    }
  }
  capa.replaceChildren(...piezas);
  document.body.appendChild(capa);
  return capa;
}

/** Toma una pieza libre del depósito (si no hay, la más antigua) y la viste de `tipo`. Queda oculta hasta colocarla. */
export function crearPieza(tipo: TipoPieza, n: number): HTMLElement {
  capaCaida();
  const libre = piezas.find((p) => p.hidden) ?? piezas[turno++ % POOL];
  libre.className = `caida-pieza caida-${tipo}`;
  libre.dataset.tipo = tipo;
  libre.dataset.n = String(n);
  libre.innerHTML = PIEZA_SVG[tipo];
  libre.style.transform = '';
  libre.style.opacity = '';
  libre.hidden = true;
  return libre;
}

/** Devuelve todas las piezas al depósito (ocultas). */
export function recogerCaida(): void {
  for (const p of piezas) {
    p.hidden = true;
    p.removeAttribute('style');
  }
}

/** Lo que una pieza en reposo no puede tapar nunca. */
const PROHIBIDO = '.tower .floor-slot, .hand, .handrow, #score, .actions, #btn-strike, #btn-mejor, #bolsa, .bar, .tower .preview, .tower .plates, .tower .threat, .tower .hp, .tower .storey, .tower .tower-tag, .powers, .bunker .stat, .bunker .blocks, .piles, #stage, .beltbar, .monarch, .coach, .say';

/** La caja de maquetación de un elemento en la ventana, sin las transformaciones de paso (temblores, entradas): las piezas se posan donde la mesa queda quieta. */
function caja(el: HTMLElement): DOMRect {
  let x = 0;
  let y = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) {
    x += e.offsetLeft - (e !== el ? e.scrollLeft : 0) + (e !== el ? e.clientLeft : 0);
    y += e.offsetTop - (e !== el ? e.scrollTop : 0) + (e !== el ? e.clientTop : 0);
    if (getComputedStyle(e).position === 'fixed') break;
  }
  return new DOMRect(x, y, el.offsetWidth, el.offsetHeight);
}

const corta = (a: DOMRect, x: number, y: number, s: number) => x < a.right && x + s > a.left && y < a.bottom && y + s > a.top;

/** Un hueco determinista (sin azar: misma mesa, mismo sitio) para la pieza `k` dentro de `zona`. */
function hueco(zona: DOMRect, s: number, k: number, malas: DOMRect[], puestas: DOMRect[]): { x: number; y: number } | null {
  const cols = Math.max(1, Math.floor((zona.width - 4) / (s * 0.8)));
  const filas = Math.max(1, Math.floor((zona.height - 4) / (s * 0.8)));
  const total = cols * filas;
  for (let j = 0; j < total; j++) {
    // recorrido de abajo arriba, con un salto primo para que el montón no salga en fila
    const c = (j * 7 + k * 3) % total;
    const col = c % cols;
    const fila = filas - 1 - Math.floor(c / cols);
    const x = zona.left + 2 + col * s * 0.8 + ((fila * 5 + k) % 4);
    const y = zona.bottom - 2 - s - (filas - 1 - fila) * s * 0.8; // las filas cuentan desde el pie
    if (x + s > zona.right || y + s > zona.bottom) continue;
    if (malas.some((m) => corta(m, x, y, s))) continue;
    // se apilan como un montón: pueden rozarse, pero no esconderse una a otra entera
    if (puestas.some((p) => Math.abs(p.left - x) < s * 0.45 && Math.abs(p.top - y) < s * 0.45)) continue;
    return { x, y };
  }
  return null;
}

/**
 * Deja las piezas en reposo junto a su trono (las de la mesa, sobre la fila de tronos) y las devuelve en su orden.
 * Una pieza que no encuentra hueco libre no se enseña (ya está cobrada: la bolsa la cuenta igual).
 */
export function colocarCaida(lista: Pieza[]): HTMLElement[] {
  const capa = capaCaida();
  const movil = matchMedia('(max-width: 640px), (max-aspect-ratio: 1/1)').matches;
  const s = movil ? 20 : 28;
  // un trono apuntado crece un 10 % (theme.css, .tower.aimed): lo que lleva dentro se prohíbe también a ese tamaño
  const malas: DOMRect[] = [];
  for (const e of document.querySelectorAll<HTMLElement>(PROHIBIDO)) {
    if (e.offsetParent === null) continue;
    const r = caja(e);
    malas.push(r);
    const t = e.closest<HTMLElement>('.tower');
    if (!t) continue;
    const c = caja(t);
    const cx = c.left + c.width / 2;
    const cy = c.top + c.height / 2;
    malas.push(new DOMRect(cx + (r.left - cx) * 1.1, cy + (r.top - cy) * 1.1, r.width * 1.1, r.height * 1.1));
  }
  const puestas: DOMRect[] = [];
  const out: HTMLElement[] = [];
  capa.classList.toggle('movil', movil);
  lista.slice(-POOL).forEach((pz, k) => {
    const torre = pz.trono ? document.querySelector<HTMLElement>(`.tower[data-suit="${pz.trono as Suit}"]`) : null;
    // el trono entero y su pie: las piezas caen a sus pies, en el hueco que dejan sus cifras
    const base = torre ?? document.getElementById('towers');
    if (!base || !base.offsetWidth) return;
    const c = caja(base);
    const zona = new DOMRect(c.left, c.top, c.width, c.height + s * 0.6);
    const h = hueco(zona, s, k, malas, puestas);
    if (!h) return;
    const el = crearPieza(pz.tipo, pz.n);
    el.style.left = `${Math.round(h.x)}px`;
    el.style.top = `${Math.round(h.y)}px`;
    el.style.width = el.style.height = `${s}px`;
    if (pz.trono) el.dataset.trono = pz.trono;
    el.dataset.de = pz.de;
    el.hidden = false;
    puestas.push(new DOMRect(h.x, h.y, s, s));
    out.push(el);
  });
  return out;
}

// ───────────────────────── La bolsa ─────────────────────────

/** La bolsa de la barra: oro, esquirlas y gotas, cada contador con su forma (el color nunca va solo). */
export function bolsaHtml(oro: number, esquirlas: number, gotas: number): string {
  const c = (tipo: TipoPieza, id: string, n: number, k: string, extra = '') =>
    `<span class="bolsa-c bolsa-${tipo}" ${extra} data-tip="<b>${t(`pieza.${tipo}.nombre`)}</b>${tipo === 'moneda' ? L('ui.mesa.oro.tip') : t(`pieza.${tipo}.desc`)}">${PIEZA_SVG[tipo].replace('caida-svg', 'bolsa-svg')}${cifraEl(n, k, 'b', `id="${id}"`)}</span>`;
  return `<div class="chip bolsa" id="bolsa" role="group" aria-label="${L('ui.bolsa')}">${c('moneda', 'bolsa-oro', oro, 'oro', 'id="gold-chip"')}${c('esquirla', 'bolsa-esquirlas', esquirlas, 'esquirlas')}${c('gota', 'bolsa-gotas', gotas, 'gotas')}</div>`;
}
