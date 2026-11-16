// V12 · El Árbol de la Conjura (SPECS/V12.md 1.5): sustituye a La Orden en la pantalla de progreso.
//
// Primero el conjunto, luego el detalle:
//   · de serie, el árbol ENTERO cabe en su pergamino sin arrastrar (las cuatro ventanas): la raíz «La corona
//     quebrada» con el saldo, las ramas de tinta, los cuatro estandartes y los 30 nodos como sellos compactos
//     (emblema y rango «2/5»; el estado se lee por la forma: filete de latón si se puede comprar, candado si falta
//     el anterior, apagado si falta saldo, lacre estampado si está lleno). Donde cabe a ≥ 13 px (escritorio
//     ancho) el sello lleva también su nombre y su coste;
//   · un panel de detalle fijo (a la derecha en ventanas anchas, hoja inferior en el móvil) con el nodo elegido:
//     nombre, rama, rango, efecto con su cifra, coste del rango siguiente, el porqué si no se puede y «Comprar».
//     Tocar, hacer clic o enfocar un sello lo elige; al entrar viene elegido el rango comprable más barato;
//   · zum semántico: ampliar separa los sellos (el texto no se escala nunca) y, cuando hay sitio, cada sello
//     crece a su tarjeta completa (nombre, efecto, rango, coste y motivo).
// En ventanas estrechas (390×844) las `pos` del motor no caben en vertical: se usa un mapa propio de rejilla
// (seis columnas) con la misma forma de árbol (la raíz en medio, los Huesos encima, el Arsenal a la izquierda,
// la Bolsa y la Corona a la derecha).
//
// Contrato con juice-ux (1.13): cada nodo es un `button.nodo[data-nodo]` que se enfoca aunque no se pueda
// comprar (`aria-disabled`); `arbolVista.mover(dx, dy)`, `arbolVista.zum(f, x?, y?)`, `arbolVista.enfocar(id)`
// y `arbolVista.elegir(id)`; el botón de compra es `#arbol-comprar`. Todo se coloca con `transform`.
import { ARBOL, Nodo, RAIZ, RAMAS, Rama, cifraDe, comprarNodo, costeDe, nodo, puedeComprar, rangoDe } from '../rules/arbol';
import type { Meta } from '../rules/run';
import { t } from '../shared/i18n';
import { sfx } from './audio';
import { cifra, cifraEl } from './cifra';
import { esc, modal } from './core';
import { glyphSvg } from './glyphs';
import { CANDADO, estandarteSvg } from './grabado12';
import { L, mejD, mejN } from './lengua';

type P = { x: number; y: number };
type Lod = 'sello' | 'nombre' | 'tarjeta';
const LODS: Lod[] = ['tarjeta', 'nombre', 'sello'];
const AIRE = 9;
/** Lado del sello de la vista general: el mayor (de 44 o 48 en el móvil a 56) que deja aire entre todos los sellos. */
let selloPx = 56;
const ZMIN = 1;
const ZMAX = 6;

/** Tamaño (px) de cada pieza según el nivel de detalle y la ventana. */
function tam(lod: Lod, que: 'nodo' | 'raiz' | 'bandera', movil: boolean): { w: number; h: number } {
  if (que === 'bandera') return lod === 'tarjeta' ? { w: 240, h: 104 } : movil ? { w: 76, h: 30 } : { w: 150, h: 40 };
  if (que === 'raiz') return lod === 'tarjeta' ? { w: 230, h: 172 } : lod === 'nombre' ? { w: 160, h: 112 } : movil ? { w: selloPx, h: selloPx } : { w: selloPx + 4, h: selloPx + 4 };
  return lod === 'tarjeta' ? { w: 204, h: 170 } : lod === 'nombre' ? { w: 118, h: 104 } : { w: selloPx, h: selloPx };
}

/** Una tabla del motor para los emblemas que no dicen bien lo que son (los mismos retoques que tenía La Orden). */
const GLIFO: Record<string, string> = { vale: 'cajones', tienda: 'toldo' };

/** Mapa ancho: las `pos` del motor (los Huesos, en la vertical de la raíz para dejar aire a la Piedra imán). */
const ANCHO: Record<string, P> = { ...Object.fromEntries(ARBOL.map((n) => [n.id, n.rama === 'huesos' ? { x: 0, y: n.pos.y } : n.pos])), bronce: { x: -1.6, y: 2.5 }, [RAIZ.id]: RAIZ.pos };
const BANDERA_ANCHO: Record<Rama, P> = { arsenal: { x: -3.5, y: -2.5 }, bolsa: { x: 3.7, y: 1.6 }, huesos: { x: -1.75, y: -3.3 }, corona: { x: 6.7, y: -2.4 } };
/** Mapa estrecho (móvil): rejilla de seis columnas; la raíz en la fila 3, los estandartes en una fila de leyenda. */
const ESTRECHO: Record<string, P> = {
  [RAIZ.id]: { x: 2.5, y: 3 },
  hueso_tallado: { x: 2.5, y: 2 }, cara_rey: { x: 2.5, y: 1 }, segundo_hueso: { x: 2.5, y: 0 },
  caja: { x: 1, y: 3 }, tienda: { x: 0, y: 2 }, vale: { x: 1, y: 2 }, rutas: { x: 0, y: 3 },
  tasador: { x: 0, y: 1 }, caja_precision: { x: 1, y: 1 }, caja_alquimia: { x: 0, y: 0 }, caja_limite: { x: 1, y: 0 },
  caja_sismo: { x: 0, y: 4 }, caja_trituradora: { x: 1, y: 4 }, caja_aguante: { x: 0, y: 5 }, tampones: { x: 2, y: 4 }, bronce: { x: 2, y: 5 },
  esq_golpe: { x: 4, y: 3 }, esq_monarca: { x: 5, y: 3 }, esq_derrota: { x: 3, y: 4 }, esq_guardia: { x: 4, y: 4 }, esq_exacto: { x: 5, y: 4 },
  piedra_iman: { x: 3, y: 5 }, esq_formacion: { x: 4, y: 5 }, esq_racha: { x: 5, y: 5 },
  corona_hierro: { x: 4, y: 2 }, sangre_real: { x: 5, y: 2 }, manga: { x: 4, y: 1 }, trono_huesos: { x: 5, y: 1 }, gracia: { x: 4, y: 0 }, pendon: { x: 5, y: 0 },
};
const BANDERA_ESTRECHO: Record<Rama, P> = { arsenal: { x: 0.25, y: 5.85 }, huesos: { x: 1.75, y: 5.85 }, bolsa: { x: 3.25, y: 5.85 }, corona: { x: 4.75, y: 5.85 } };

type Pieza = { id: string; que: 'nodo' | 'raiz' | 'bandera'; el: HTMLElement; p: P };

/** La vista: desplazamiento (px), zum y nodo elegido. Se conserva entre repintados (al comprar). */
const vista = { x: 0, y: 0, z: 1, lista: false, elegido: '' };
let vp: HTMLElement | null = null;
let ramasEl: SVGSVGElement | null = null;
let piezas: Pieza[] = [];
let lod: Lod = 'sello';
let estrecho = false;
/** Escala de serie (px por unidad de mapa) y origen, calculados para que el árbol entero quepa a zum 1. */
let base = { sx: 1, sy: 1, x0: 0, y0: 0 };

const mapa = (id: string): P => (estrecho ? ESTRECHO : ANCHO)[id];
const bandera = (r: Rama): P => (estrecho ? BANDERA_ESTRECHO : BANDERA_ANCHO)[r];

/** El encaje de serie: separa x e y para que el árbol llene el pergamino sin salirse. */
function encaje(l: Lod = 'sello'): void {
  if (!vp) return;
  const W = vp.clientWidth;
  const H = vp.clientHeight;
  estrecho = W < 640 || W / Math.max(1, H) < 1.1;
  const ps = piezas.map((q) => q.p);
  const xs = ps.map((p) => p.x);
  const ys = ps.map((p) => p.y);
  const [mx, my] = [Math.min(...xs), Math.min(...ys)];
  const sx = (Math.max(...xs) - mx) || 1;
  const sy = (Math.max(...ys) - my) || 1;
  // márgenes: medio sello o media bandera por cada lado, y 8 px de papel
  const b = tam(l, 'bandera', estrecho);
  // en el móvil los estandartes van en su fila de leyenda, dentro del ancho de las columnas: no ensanchan el margen
  const padX = Math.max(estrecho && l === 'sello' ? 0 : b.w / 2, tam(l, 'raiz', estrecho).w / 2, tam(l, 'nodo', estrecho).w / 2) + (estrecho ? 3 : 8);
  const padY = Math.max(b.h / 2, tam(l, 'raiz', estrecho).h / 2, tam(l, 'nodo', estrecho).h / 2) + (estrecho ? 3 : 8);
  base = { sx: (W - 2 * padX) / sx, sy: (H - 2 * padY) / sy, x0: mx - padX / ((W - 2 * padX) / sx), y0: my - padY / ((H - 2 * padY) / sy) };
  // el sello más grande que deja aire entre cada par de sellos (y la raíz, 4 px mayor)
  if (l === 'sello') {
    let s = 56;
    for (let i = 0; i < piezas.length; i++) {
      for (let j = i + 1; j < piezas.length; j++) {
        const a = piezas[i];
        const b = piezas[j];
        if (a.que === 'bandera' || b.que === 'bandera') continue;
        const m = Math.max(Math.abs(a.p.x - b.p.x) * base.sx, Math.abs(a.p.y - b.p.y) * base.sy) - AIRE - (a.que === 'raiz' || b.que === 'raiz' ? 2 : 0);
        s = Math.min(s, Math.floor(m));
      }
    }
    selloPx = Math.max(estrecho ? 48 : 44, s);
  }
  // en el móvil, la leyenda de estandartes se reparte a partes iguales en el ancho del pergamino
  if (estrecho) piezas.filter((q) => q.que === 'bandera').forEach((q, i) => (q.p = { x: base.x0 + (W * (i + 0.5)) / 4 / base.sx, y: q.p.y }));
}

/** El encaje de serie con el mayor nivel de detalle que quepa entero a zum 1. */
function encajar(): void {
  encaje('sello');
  const l = nivel(1);
  if (l === 'sello') return;
  encaje(l);
  if (nivel(1) !== l) encaje('sello');
}

/** El mayor nivel de detalle que cabe sin que dos piezas se monten (con 10 px de aire). */
function nivel(z = vista.z): Lod {
  const sx = base.sx * z;
  const sy = base.sy * z;
  for (const l of LODS) {
    let cabe = true;
    for (let i = 0; i < piezas.length && cabe; i++) {
      const a = piezas[i];
      const ta = tam(l, a.que, estrecho);
      for (let j = i + 1; j < piezas.length; j++) {
        const b = piezas[j];
        const tb = tam(l, b.que, estrecho);
        if (Math.abs(a.p.x - b.p.x) * sx >= (ta.w + tb.w) / 2 + AIRE) continue;
        if (Math.abs(a.p.y - b.p.y) * sy >= (ta.h + tb.h) / 2 + AIRE) continue;
        cabe = false;
        break;
      }
    }
    if (cabe) return l;
  }
  return 'sello';
}

/** Centro de una posición de mapa en píxeles del pergamino. */
const enPx = (p: P): P => ({ x: vista.x + (p.x - base.x0) * base.sx * vista.z, y: vista.y + (p.y - base.y0) * base.sy * vista.z });

function aplica(): void {
  if (!vp) return;
  const W = vp.clientWidth;
  const H = vp.clientHeight;
  // a zum 1 todo cabe: sin desplazamiento; ampliado, el centro de la ventana no sale del árbol
  const mw = W * vista.z;
  const mh = H * vista.z;
  // ampliado, se puede llevar al centro hasta la tarjeta del borde (media tarjeta de margen)
  const mg = vista.z > 1 ? tam(nivel(), 'nodo', estrecho) : { w: 0, h: 0 };
  vista.x = Math.min(mg.w / 2, Math.max(W - mw - mg.w / 2, vista.x));
  vista.y = Math.min(mg.h / 2, Math.max(H - mh - mg.h / 2, vista.y));
  lod = nivel();
  vp.dataset.lod = lod;
  vp.dataset.zum = String(Math.round(vista.z * 100) / 100);
  for (const q of piezas) {
    const c = enPx(q.p);
    const s = tam(lod, q.que, estrecho);
    q.el.style.width = `${s.w}px`;
    q.el.style.height = `${s.h}px`;
    q.el.style.transform = `translate(${(c.x - s.w / 2).toFixed(1)}px, ${(c.y - s.h / 2).toFixed(1)}px)`;
  }
  if (ramasEl) {
    ramasEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    ramasEl.querySelectorAll<SVGPathElement>('.rama').forEach((r) => {
      const n = nodo(r.dataset.de!)!;
      const a = enPx(mapa(n.padre ?? RAIZ.id));
      const b = enPx(mapa(n.id));
      const mx = (a.x + b.x) / 2;
      r.setAttribute('d', `M${a.x.toFixed(0)},${a.y.toFixed(0)} C${mx.toFixed(0)},${a.y.toFixed(0)} ${mx.toFixed(0)},${b.y.toFixed(0)} ${b.x.toFixed(0)},${b.y.toFixed(0)}`);
    });
  }
}

/** Mover, ampliar, enfocar y elegir en el Árbol (ratón, rueda, dedo y pellizco aquí; teclado y mando, juice-ux). */
export const arbolVista = {
  mover(dx: number, dy: number): void {
    vista.x += dx;
    vista.y += dy;
    aplica();
  },
  zum(f: number, x?: number, y?: number): void {
    if (!vp) return;
    const cx = x ?? vp.clientWidth / 2;
    const cy = y ?? vp.clientHeight / 2;
    const z = Math.min(ZMAX, Math.max(ZMIN, vista.z * f));
    vista.x = cx - ((cx - vista.x) * z) / vista.z;
    vista.y = cy - ((cy - vista.y) * z) / vista.z;
    vista.z = z;
    aplica();
  },
  /** Centra la vista en un nodo (o la raíz) sin cambiar el zum. */
  enfocar(id: string): void {
    if (!vp || !(estrecho ? ESTRECHO : ANCHO)[id]) return;
    const p = mapa(id);
    vista.x = vp.clientWidth / 2 - (p.x - base.x0) * base.sx * vista.z;
    vista.y = vp.clientHeight / 2 - (p.y - base.y0) * base.sy * vista.z;
    aplica();
  },
  /** Amplía hasta que los sellos son tarjetas completas y centra ese nodo. */
  detalle(id: string): void {
    if (!vp) return;
    vista.z = 1;
    aplica();
    while (lod !== 'tarjeta' && vista.z < ZMAX) {
      vista.z = Math.min(ZMAX, vista.z * 1.15);
      aplica();
    }
    arbolVista.enfocar(id);
  },
  /** Vuelve a la vista general (el árbol entero). */
  deSerie(): void {
    vista.z = 1;
    vista.x = 0;
    vista.y = 0;
    aplica();
  },
  /** Elige un nodo (o la raíz) para el panel de detalle. */
  elegir(id: string): void {
    vista.elegido = id;
    pintaDetalle();
  },
  get zumActual(): number {
    return vista.z;
  },
  get nivel(): Lod {
    return lod;
  },
};

/** El rango comprable más barato (lo que viene elegido de entrada); la raíz si no hay ninguno. */
export function masBarato(meta: Pick<Meta, 'up' | 'renown'>): string {
  let best: Nodo | null = null;
  for (const n of ARBOL) if (puedeComprar(meta, n.id) === null && (!best || costeDe(meta, n.id)! < costeDe(meta, best.id)!)) best = n;
  return best?.id ?? RAIZ.id;
}

/** Efecto del nodo con la cifra del rango siguiente (o la del actual si está lleno). */
function efecto(n: Nodo, r: number): string {
  if (!n.plantilla) return mejD(n.id);
  return t(`mejora.${n.id}.plantilla`, cifraDe(n.id, Math.min(n.rangos, r + 1)));
}

/** Por qué no se puede comprar (vacío si se puede). */
function motivoDe(meta: Pick<Meta, 'up' | 'renown'>, n: Nodo): string {
  const por = puedeComprar(meta, n.id);
  const coste = costeDe(meta, n.id);
  return por === 'saldo' ? L('ui.arbol.faltan', { n: cifra(coste! - meta.renown) }) : por === 'padre' && n.padre ? L('ui.arbol.antes', { x: mejN(n.padre) }) : por === 'tope' ? L('ui.arbol.completo') : '';
}

function nodoHtml(meta: Pick<Meta, 'up' | 'renown'>, n: Nodo): string {
  const r = rangoDe(meta.up, n.id);
  const por = puedeComprar(meta, n.id);
  const coste = costeDe(meta, n.id);
  const estado = por === null ? 'comprable' : por;
  const motivo = por === 'tope' ? '' : motivoDe(meta, n);
  const precio = coste === null ? L('ui.arbol.completo') : `${cifraEl(coste, 'coste')} ✦`;
  const aria = `${mejN(n.id)} · ${L('ui.arbol.rango', { r, n: n.rangos })} · ${efecto(n, r)} · ${coste === null ? L('ui.arbol.completo') : L('ui.arbol.cuesta', { n: coste })}${motivo ? ` · ${motivo}` : ''}`;
  return `<button class="nodo r-${n.rama} es-${estado}${r ? ' con-rango' : ''}" data-nodo="${n.id}" ${por === null ? '' : 'aria-disabled="true"'} aria-label="${esc(aria)}">
    <span class="nodo-cab"><span class="nodo-sello">${glyphSvg(GLIFO[n.id] ?? n.glyph, 'nodo-glifo')}${por === 'padre' ? CANDADO : ''}</span><b class="nodo-nombre">${mejN(n.id)}</b></span>
    <span class="nodo-efecto">${efecto(n, r)}</span>
    <span class="nodo-pie"><b class="nodo-rango" aria-hidden="true">${r}/${n.rangos}</b><b class="nodo-coste">${precio}</b></span>
    ${motivo ? `<span class="nodo-motivo">${motivo}</span>` : ''}
  </button>`;
}

function raizHtml(meta: Pick<Meta, 'renown'>): string {
  return `<button class="arbol-raiz" data-raiz aria-label="${esc(`${t('arbol.raiz.nombre')} · ${meta.renown} ✦`)}">
    <span class="raiz-sello">${glyphSvg(RAIZ.glyph, 'raiz-glifo')}</span>
    <b class="raiz-nombre">${t('arbol.raiz.nombre')}</b>
    <span class="raiz-saldo">${cifraEl(meta.renown, 'esquirlas', 'b')} <i>✦</i></span>
    <span class="raiz-desc">${t('arbol.raiz.desc')}</span>
  </button>`;
}

/** El nombre corto de una rama para la leyenda del móvil: sin artículo y sin complemento («La Corona de hierro» → «Corona»). */
function corto(nombre: string): string {
  let s = nombre.replace(/^(El|La|Los|Las|The)\s+/i, '').split(/\s+(?:de|del|of)\s+/i)[0];
  if (s.length > 8 && s.includes(' ')) s = s.split(' ').pop()!;
  return s;
}

/** Panel de detalle del nodo elegido (o de la raíz). */
let metaVista: Meta | null = null;
let comprar: (() => void) | null = null;
function pintaDetalle(): void {
  const host = document.querySelector<HTMLElement>('.arbol-detalle');
  const meta = metaVista;
  if (!host || !meta) return;
  document.querySelectorAll('.arbol [aria-current]').forEach((e) => e.removeAttribute('aria-current'));
  const id = vista.elegido;
  const el = id === RAIZ.id ? document.querySelector('.arbol-raiz') : document.querySelector(`.nodo[data-nodo="${id}"]`);
  el?.setAttribute('aria-current', 'true');
  const n = nodo(id);
  if (!n) {
    host.innerHTML = `<div class="det-cab"><span class="det-sello raiz">${glyphSvg(RAIZ.glyph, 'det-glifo')}</span><div><b class="det-nombre">${t('arbol.raiz.nombre')}</b><span class="det-rama">${t('arbol.nombre')}</span></div></div>
      <p class="det-efecto">${t('arbol.raiz.desc')}</p>
      <div class="det-cifras"><span>${L('ui.bolsa')} <b class="det-coste">${cifraEl(meta.renown, 'esquirlas')} ✦</b></span></div>`;
    return;
  }
  const r = rangoDe(meta.up, n.id);
  const por = puedeComprar(meta, n.id);
  const coste = costeDe(meta, n.id);
  const motivo = motivoDe(meta, n);
  host.innerHTML = `<div class="det-cab"><span class="det-sello r-${n.rama}">${glyphSvg(GLIFO[n.id] ?? n.glyph, 'det-glifo')}</span><div><b class="det-nombre">${mejN(n.id)}</b><span class="det-rama">${t(`rama.${n.rama}.nombre`)}</span></div></div>
    <p class="det-efecto">${efecto(n, r)}</p>
    <div class="det-cifras"><span>${L('ui.arbol.rango.lbl')} <b class="det-rango">${r}/${n.rangos}</b></span><span>${L('ui.arbol.coste.lbl')} <b class="det-coste">${coste === null ? L('ui.arbol.completo') : `${cifraEl(coste, 'coste')} ✦`}</b></span></div>
    ${motivo ? `<p class="det-motivo">${motivo}</p>` : ''}
    <button id="arbol-comprar" class="primary" ${por === null ? '' : 'aria-disabled="true"'}>${L('ui.arbol.comprar')}</button>`;
  host.querySelector<HTMLButtonElement>('#arbol-comprar')!.onclick = () => {
    if (!comprarNodo(meta, n.id)) return sfx.deny();
    sfx.stamp();
    comprar?.();
  };
}

/**
 * Pinta el Árbol en `host` (la caja de la pestaña). `alComprar` guarda el perfil y repinta. La primera vez la vista
 * enseña el árbol entero (zum 1) con el rango comprable más barato elegido.
 */
export function pintarArbol(host: HTMLElement, meta: Meta, alComprar: () => void): void {
  metaVista = meta;
  comprar = alComprar;
  host.innerHTML = `<div class="arbol">
    <div class="arbol-lienzo">
      <div class="arbol-vista" data-lienzo tabindex="-1">
        <svg class="arbol-ramas" aria-hidden="true">${ARBOL.map((n) => `<path class="rama r-${n.rama}${rangoDe(meta.up, n.id) > 0 ? ' viva' : ''}" data-de="${n.id}"/>`).join('')}</svg>
        ${RAMAS.map((r) => `<div class="estandarte r-${r.id}" data-rama="${r.id}" title="${esc(t(`rama.${r.id}.desc`))}">${estandarteSvg(r.id)}<b class="largo">${t(`rama.${r.id}.nombre`)}</b><b class="corto" aria-hidden="true">${corto(t(`rama.${r.id}.nombre`))}</b><span>${t(`rama.${r.id}.desc`)}</span></div>`).join('')}
        ${raizHtml(meta)}${ARBOL.map((n) => nodoHtml(meta, n)).join('')}
      </div>
    </div>
    <div class="arbol-lado">
      <aside class="arbol-detalle" aria-live="polite"></aside>
      <div class="arbol-barra">
        <button id="arbol-menos" aria-label="${L('ui.arbol.alejar')}">−</button>
        <button id="arbol-mas" aria-label="${L('ui.arbol.acercar')}">+</button>
        <button id="arbol-centro">${L('ui.arbol.centrar')}</button>
        <span class="arbol-ayuda">${L('ui.arbol.ayuda')}</span>
      </div>
    </div>
  </div>`;
  vp = host.querySelector<HTMLElement>('.arbol-vista');
  ramasEl = host.querySelector<SVGSVGElement>('.arbol-ramas');
  if (!vp) return;
  const W = vp.clientWidth;
  estrecho = W < 640 || W / Math.max(1, vp.clientHeight) < 1.1;
  piezas = [
    ...ARBOL.map((n) => ({ id: n.id, que: 'nodo' as const, el: vp!.querySelector<HTMLElement>(`.nodo[data-nodo="${n.id}"]`)!, p: mapa(n.id) })),
    { id: RAIZ.id, que: 'raiz' as const, el: vp.querySelector<HTMLElement>('.arbol-raiz')!, p: mapa(RAIZ.id) },
    ...RAMAS.map((r) => ({ id: r.id, que: 'bandera' as const, el: vp!.querySelector<HTMLElement>(`.estandarte[data-rama="${r.id}"]`)!, p: bandera(r.id) })),
  ];
  pintaDetalle(); // antes del encaje: en el móvil su alto decide el del pergamino
  encajar();
  if (!vista.lista) {
    vista.lista = true;
    vista.z = 1;
    vista.x = 0;
    vista.y = 0;
    vista.elegido = masBarato(meta);
  }
  aplica();
  pintaDetalle();
  host.querySelector<HTMLButtonElement>('#arbol-menos')!.onclick = () => arbolVista.zum(1 / 1.3);
  host.querySelector<HTMLButtonElement>('#arbol-mas')!.onclick = () => arbolVista.zum(1.3);
  host.querySelector<HTMLButtonElement>('#arbol-centro')!.onclick = () => arbolVista.deSerie();
  arrastre(vp);
  // el pergamino se coloca con transform: si el foco lo desplaza (scrollIntoView), se devuelve y se lleva la vista al sello
  const lienzo = vp;
  lienzo.addEventListener('scroll', () => {
    lienzo.scrollTop = 0;
    lienzo.scrollLeft = 0;
  });
  lienzo.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-nodo], [data-raiz]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const v = lienzo.getBoundingClientRect();
    if (r.left < v.left || r.right > v.right || r.top < v.top || r.bottom > v.bottom) arbolVista.enfocar(el.dataset.nodo ?? RAIZ.id);
  });
  const elige = (id: string) => () => arbolVista.elegir(id);
  for (const q of piezas) {
    if (q.que === 'bandera') continue;
    q.el.onclick = elige(q.id);
    q.el.onfocus = elige(q.id);
  }
  // si la ventana cambia de tamaño, el encaje se rehace
  new ResizeObserver(() => {
    if (!vp?.isConnected) return;
    // el mismo punto del mapa sigue en el centro de la ventana tras rehacer el encaje
    const W0 = vp.clientWidth;
    const H0 = vp.clientHeight;
    const cx = (W0 / 2 - vista.x) / (base.sx * vista.z) + base.x0;
    const cy = (H0 / 2 - vista.y) / (base.sy * vista.z) + base.y0;
    encajar();
    if (vista.z > 1) {
      vista.x = W0 / 2 - (cx - base.x0) * base.sx * vista.z;
      vista.y = H0 / 2 - (cy - base.y0) * base.sy * vista.z;
    }
    aplica();
  }).observe(vp);
}

/** Arrastre con un dedo o el ratón, pellizco con dos dedos y rueda. Un arrastre no elige el nodo donde empezó. */
function arrastre(el: HTMLElement): void {
  const dedos = new Map<number, { x: number; y: number }>();
  let movido = 0;
  let pellizco = 0;
  el.addEventListener('pointerdown', (e) => {
    if (dedos.size === 0) movido = 0;
    dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.size === 2) {
      const [a, b] = [...dedos.values()];
      pellizco = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  el.addEventListener('pointermove', (e) => {
    const antes = dedos.get(e.pointerId);
    if (!antes) return;
    const ahora = { x: e.clientX, y: e.clientY };
    if (dedos.size === 1) {
      const dx = ahora.x - antes.x;
      const dy = ahora.y - antes.y;
      movido += Math.abs(dx) + Math.abs(dy);
      if (movido > 6) {
        if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
        arbolVista.mover(dx, dy);
      }
    } else if (dedos.size === 2) {
      dedos.set(e.pointerId, ahora);
      const [a, b] = [...dedos.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = el.getBoundingClientRect();
      if (pellizco > 0) arbolVista.zum(d / pellizco, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pellizco = d;
      movido = 99;
      return;
    }
    dedos.set(e.pointerId, ahora);
  });
  const suelta = (e: PointerEvent) => {
    dedos.delete(e.pointerId);
    pellizco = 0;
  };
  el.addEventListener('pointerup', suelta);
  el.addEventListener('pointercancel', suelta);
  el.addEventListener(
    'click',
    (e) => {
      if (movido > 6) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true,
  );
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      arbolVista.zum(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    },
    { passive: false },
  );
}

/** El aviso de la migración de la 11.0 (Coronas → Esquirlas), una sola vez: se borra del perfil al enseñarlo. */
export function avisoMigracion(meta: Meta, guarda: () => void): void {
  const a = meta.aviso;
  if (!a || a.id !== 'arbol-v12') return;
  delete meta.aviso;
  guarda();
  const el = modal(
    `<div class="modal-box confirm arbol-aviso" role="dialog" aria-labelledby="arbol-aviso-t"><h2 id="arbol-aviso-t">${t('arbol.nombre')}</h2>
      <p class="arbol-aviso-cifras"><span>${cifraEl(a.coronas, 'coronas', 'b')}</span><i aria-hidden="true">→</i><span>${cifraEl(a.esquirlas, 'esquirlas', 'b')} ✦</span></p>
      <p>${t('arbol.aviso', { coronas: cifra(a.coronas), esquirlas: cifra(a.esquirlas), rangos: a.rangos })}</p>
      <div class="row"><button class="primary x" id="arbol-aviso-ok">${L('ui.arbol.entendido')}</button></div></div>`,
    { cls: 'arbol-aviso-modal' },
  );
  el.querySelector<HTMLButtonElement>('#arbol-aviso-ok')?.focus({ preventScroll: true });
}

/** Para la QA: la vista vuelve a empezar (el próximo pintado enseña el árbol entero con el más barato elegido). */
export function vistaNueva(): void {
  vista.lista = false;
  vista.z = 1;
}
