// Banco de la forja pixel-art (antes, de grabado). Solo se carga con ?qa: enseña cada pieza del arte suelta (pinta,
// trama, naipe, Amuleto, Trampa, Bendición, Rey, el Bufón) sobre papel marfil y al tamaño que se pida, para que
// scripts/svg-forge.ts la fotografíe a 24 y a 300 px y mida su tinta. No guarda nada ni toca la partida.
import { BOSSES } from '../rules/run';
import { SUITS, type Card, type Suit } from '../rules/engine';
import { TOOLS } from '../rules/tools';
import { SPECIAL } from '../rules/specials';
import { ALL_CARDS, backEl, cardEl, ensureDefs, portraitEl, suitSvg } from './card';
import { glyphSvg } from './glyphs';
import { monarchSvg, type MonarchMood } from './art';
import { BENDICIONES } from '../rules/reyes';
import { bendicionSvg } from './pixel/iconos';
import { EXPRESIONES, bufonSvg, type Expresion } from './pixel/bufon';
import { REYES_PX } from './pixel/reyes';
import { pintaNaipeSvg } from './pixel/pintas';
import { coinPieces, crownShardsHost, slashPieces, waxStamp } from './engraving';
import type { Seal } from '../rules/engine';

export interface Pieza {
  grupo: 'palos' | 'pintas' | 'tramas' | 'cartas' | 'herramientas' | 'especiales' | 'bendiciones' | 'servicios' | 'jefes' | 'monarcas' | 'bufon' | 'piezas';
  id: string;
}

/** El papel sobre el que se mide todo: el del naipe (V40 · fase 2b: marfil luminoso). */
const PAPEL = '#f4efe2';
/** V40 · todos los naipes: del 1 al 9 y la Corte (10 Sota, 11 Caballo, 12 Rey) de cada palo, el Comodín y los dorsos. */
const RANGOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const DORSOS = ['escoba', 'truco', 'chinchon', 'mentiroso', 'chancho'];
const carta = (id: string): Card | undefined => ALL_CARDS.find((c) => c.id === id);

/** Iconos de servicio, de la Orden, del mapa, de los logros y de los juramentos (no son reliquias: solo avisos). */
const SERVICIOS = ['sello', 'cajones', 'atajo', 'oro', 'jefe', 'abismo', 'diaria', 'cuadrilla', 'engranaje', 'pergamino', 'forja', 'plano', 'reparacion', 'retirar', 'incognita', 'sobre', 'comodin',
  // V6: logros, juramentos, atajos y portada
  'corona_rota', 'coronas', 'naipes_par', 'naipes_color', 'naipes_full', 'naipes_poker', 'naipes_real', 'abanico', 'abanico_corto', 'rayo', 'cometa', 'relicario', 'carambano', 'herradura', 'luna', 'escudo_roto', 'fardo', 'senal', 'toldo'];

const SELLOS: Seal[] = ['dinamita', 'eco', 'jornal', 'sindical'];

/** V8 · una pieza de la caída, suelta y en reposo (el naipe cortado, con sus mitades algo abiertas). */
function pieza(id: string): HTMLElement {
  const box = document.createElement('div');
  box.style.cssText = 'display:inline-block;line-height:0;position:relative;';
  if (id.startsWith('esquirlas-')) {
    const host = crownShardsHost(id.slice(-1) as Suit);
    host.style.cssText = 'position:relative;width:240px;';
    box.appendChild(host);
  } else if (id.startsWith('lacre-')) {
    const s = waxStamp(id.slice(6) as Seal);
    s.style.cssText = 'width:200px;';
    box.appendChild(s);
  } else if (id === 'moneda') {
    const c = coinPieces(1)[0];
    c.style.cssText = 'position:relative;display:block;width:200px;translate:none;rotate:-12deg;';
    box.appendChild(c);
  } else {
    // el naipe se mide en el documento y se retira: sus piezas se colocan aquí a mano, abiertas por el tajo
    const card = cardEl(carta('S9') ?? ALL_CARDS[0], { tilt: false });
    card.style.setProperty('--w', '200px');
    document.body.appendChild(card);
    const parts = slashPieces(card);
    card.remove();
    box.style.width = '260px';
    box.style.height = '330px';
    const at: [number, number, number][] = [[14, 8, -5], [40, 34, 4], [18, 150, -30], [110, 148, 40], [196, 132, -15]];
    parts.forEach((p, i) => {
      p.style.position = 'absolute';
      p.style.translate = 'none';
      p.style.left = `${at[i][0]}px`;
      p.style.top = `${at[i][1]}px`;
      p.style.rotate = `${at[i][2]}deg`;
      box.appendChild(p);
    });
  }
  return box;
}

/** Un retal de la trama de un palo: lo que distingue el material sin mirar el color. */
const retal = (s: Suit) => `<svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true"><rect width="96" height="96" fill="url(#pat-${s})"/></svg>`;

function lista(): Pieza[] {
  return [
    ...SUITS.map((s): Pieza => ({ grupo: 'palos', id: s })),
    // V40 · fase 2b: las pintas del naipe, la chica (4 a 9) y la grande (2 y 3)
    ...SUITS.flatMap((s) => (['chica', 'grande'] as const).map((t): Pieza => ({ grupo: 'pintas', id: `${s}-${t}` }))),
    ...SUITS.map((s): Pieza => ({ grupo: 'tramas', id: s })),
    ...SUITS.flatMap((s) => RANGOS.map((r): Pieza => ({ grupo: 'cartas', id: `${s}${r}` }))),
    { grupo: 'cartas', id: 'X1' },
    ...DORSOS.map((d): Pieza => ({ grupo: 'cartas', id: `dorso-${d}` })),
    ...TOOLS.map((t): Pieza => ({ grupo: 'herramientas', id: t.id })),
    // especiales del sorteo con emblema propio (las legendarias llevan retrato)
    ...Object.keys(SPECIAL).filter((id) => !id.startsWith('j-') && id !== 'ferretero').map((id): Pieza => ({ grupo: 'especiales', id })),
    // V40 · las 26 Bendiciones de los Reyes (medallón con la corona de su Rey)
    ...BENDICIONES.map((b): Pieza => ({ grupo: 'bendiciones', id: b.id })),
    ...SERVICIOS.map((id): Pieza => ({ grupo: 'servicios', id })),
    ...BOSSES.map((b): Pieza => ({ grupo: 'jefes', id: b.id })),
    // V40: los bustos de los 4 Reyes jefe, en calma y vencidos (espadas-calma, espadas-vencido…)
    ...REYES_PX.flatMap((id) => (['calma', 'vencido'] as const).map((m): Pieza => ({ grupo: 'monarcas', id: `${id}-${m}` }))),
    // V40: el Bufón en sus cinco expresiones (cuadro fijo)
    ...EXPRESIONES.map((e): Pieza => ({ grupo: 'bufon', id: e })),
    // V8: las piezas de la caída (esquirlas de corona por palo, naipe cortado, sellos de lacre y moneda)
    ...SUITS.map((s): Pieza => ({ grupo: 'piezas', id: `esquirlas-${s}` })),
    { grupo: 'piezas', id: 'tajo' },
    ...SELLOS.map((s): Pieza => ({ grupo: 'piezas', id: `lacre-${s}` })),
    { grupo: 'piezas', id: 'moneda' },
  ];
}

/** El nodo de una pieza, a su tamaño natural. */
function nodo(p: Pieza): HTMLElement {
  const box = document.createElement('div');
  box.style.cssText = 'display:inline-block;line-height:0;';
  if (p.grupo === 'piezas') return pieza(p.id);
  if (p.grupo === 'palos') {
    box.innerHTML = suitSvg(p.id as Suit);
    const svg = box.firstElementChild as SVGElement;
    svg.style.width = '220px';
    svg.style.height = '230px';
  } else if (p.grupo === 'pintas') {
    const [s, t] = p.id.split('-') as [Suit, 'chica' | 'grande'];
    box.innerHTML = pintaNaipeSvg(s, t);
    const svg = box.firstElementChild as SVGElement;
    svg.style.height = '230px';
    svg.style.width = 'auto';
  } else if (p.grupo === 'tramas') box.innerHTML = retal(p.id as Suit);
  else if (p.grupo === 'monarcas') {
    const [id, mood] = p.id.split('-') as [string, MonarchMood];
    box.innerHTML = monarchSvg(id, mood);
    const svg = box.firstElementChild as SVGElement;
    svg.style.width = '200px';
    svg.style.height = '200px';
  } else if (p.grupo === 'bufon') {
    box.innerHTML = bufonSvg(p.id as Expresion, 'forja-quieto');
    const svg = box.firstElementChild as SVGElement;
    svg.style.width = '200px';
    svg.style.height = '200px';
  } else if (p.grupo === 'bendiciones') {
    box.innerHTML = bendicionSvg(p.id);
    const svg = box.firstElementChild as SVGElement;
    svg.style.width = '200px';
    svg.style.height = '200px';
  } else if (p.grupo === 'cartas' && p.id.startsWith('dorso-')) {
    const el = backEl(p.id.slice(6));
    el.style.setProperty('--w', '250px');
    el.style.width = '250px';
    box.appendChild(el);
  } else if (p.grupo === 'herramientas' || p.grupo === 'especiales' || p.grupo === 'servicios') {
    box.innerHTML = glyphSvg(p.id);
    const svg = box.firstElementChild as SVGElement;
    svg.style.width = '200px';
    svg.style.height = '200px';
  } else {
    const el = p.grupo === 'jefes' ? portraitEl(`j-${p.id}`, BOSSES.find((b) => b.id === p.id)?.who ?? p.id) : cardEl(carta(p.id) ?? ALL_CARDS[0], { tilt: false });
    el.style.setProperty('--w', '250px');
    el.style.width = '250px';
    box.appendChild(el);
  }
  return box;
}

function escenario(): HTMLElement {
  let el = document.getElementById('forja-banco');
  if (!el) {
    el = document.createElement('div');
    el.id = 'forja-banco';
    document.body.appendChild(el);
  }
  el.style.cssText = `position:fixed;left:0;top:0;z-index:99999;background:${PAPEL};overflow:hidden;`;
  el.innerHTML = '';
  return el;
}

/** Encaja un nodo en un cuadrado de `lado` px, centrado y sin deformarlo. */
function encajar(host: HTMLElement, n: HTMLElement, lado: number, margen: number): void {
  host.appendChild(n);
  const r = n.getBoundingClientRect();
  const k = (lado - 2 * margen) / Math.max(r.width, r.height, 1);
  n.style.transformOrigin = '0 0';
  n.style.position = 'absolute';
  n.style.left = `${(lado - r.width * k) / 2}px`;
  n.style.top = `${(lado - r.height * k) / 2}px`;
  n.style.transform = `scale(${k})`;
}

/** Monta una pieza sola en el banco, a `lado` × `lado` px. Devuelve false si no existe. */
function montar(grupo: Pieza['grupo'], id: string, lado: number): boolean {
  const p = lista().find((x) => x.grupo === grupo && x.id === id);
  if (!p) return false;
  ensureDefs();
  const el = escenario();
  el.style.width = `${lado}px`;
  el.style.height = `${lado}px`;
  // las tramas se miden a sangre: el retal llena el cuadrado
  encajar(el, nodo(p), lado, p.grupo === 'tramas' ? 0 : Math.max(1, Math.round(lado * 0.04)));
  return true;
}

/** Hoja de contacto: todas las piezas a 96 px con su versión de 24 px al lado. `gris` la pasa a escala de grises. */
function hoja(gris: boolean, grupos: string[] = []): number {
  ensureDefs();
  const el = escenario();
  const piezas = lista().filter((p) => !grupos.length || grupos.includes(p.grupo));
  el.style.cssText += `padding:12px;display:grid;grid-template-columns:repeat(10,126px);gap:12px 10px;font:700 13px/1.2 system-ui,sans-serif;color:#181614;${gris ? 'filter:grayscale(1);' : ''}`;
  for (const p of piezas) {
    const celda = document.createElement('div');
    celda.style.cssText = 'display:grid;grid-template-columns:96px 24px;gap:6px;align-items:end;';
    // la celda entra en el documento antes de encajar nada: fuera de él no hay medidas
    el.appendChild(celda);
    for (const lado of [96, 24]) {
      const marco = document.createElement('div');
      marco.style.cssText = `position:relative;width:${lado}px;height:${lado}px;overflow:hidden;`;
      celda.appendChild(marco);
      encajar(marco, nodo(p), lado, p.grupo === 'tramas' ? 0 : 2);
    }
    const pie = document.createElement('span');
    pie.style.cssText = 'grid-column:1 / -1;overflow-wrap:anywhere;';
    pie.textContent = `${p.grupo.slice(0, 4)} · ${p.id}`;
    celda.appendChild(pie);
  }
  return piezas.length;
}

export function installForja(): void {
  Object.assign(window, { __forja: { lista, montar, hoja, limpiar: () => document.getElementById('forja-banco')?.remove(), papel: PAPEL } });
}
