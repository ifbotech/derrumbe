// Banco de la forja de grabado. Solo se carga con ?qa: enseña cada pieza del arte suelta (palo, trama,
// carta, herramienta, jefe) sobre papel crema y al tamaño que se pida, para que scripts/svg-forge.ts
// la fotografíe a 24 y a 300 px y mida su tinta. No guarda nada ni toca la partida.
import { BOSSES } from '../rules/run';
import { SUITS, type Card, type Suit } from '../rules/engine';
import { TOOLS } from '../rules/tools';
import { ALL_CARDS, cardEl, ensureDefs, portraitEl, suitSvg } from './card';
import { glyphSvg } from './glyphs';

export interface Pieza {
  grupo: 'palos' | 'tramas' | 'cartas' | 'herramientas' | 'jefes';
  id: string;
}

/** El papel sobre el que se mide todo: el de las cartas. */
const PAPEL = '#eae0ce';
/** Cartas de muestra: un as, un número bajo, uno alto y las tres figuras de cada palo, y el comodín. */
const RANGOS = [1, 7, 10, 11, 12, 13];
const carta = (id: string): Card | undefined => ALL_CARDS.find((c) => c.id === id);

/** Un retal de la trama de un palo: lo que distingue el material sin mirar el color. */
const retal = (s: Suit) => `<svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true"><rect width="96" height="96" fill="url(#pat-${s})"/></svg>`;

function lista(): Pieza[] {
  return [
    ...SUITS.map((s): Pieza => ({ grupo: 'palos', id: s })),
    ...SUITS.map((s): Pieza => ({ grupo: 'tramas', id: s })),
    ...SUITS.flatMap((s) => RANGOS.map((r): Pieza => ({ grupo: 'cartas', id: `${s}${r}` }))),
    { grupo: 'cartas', id: 'X1' },
    ...TOOLS.map((t): Pieza => ({ grupo: 'herramientas', id: t.id })),
    ...BOSSES.map((b): Pieza => ({ grupo: 'jefes', id: b.id })),
  ];
}

/** El nodo de una pieza, a su tamaño natural. */
function nodo(p: Pieza): HTMLElement {
  const box = document.createElement('div');
  box.style.cssText = 'display:inline-block;line-height:0;';
  if (p.grupo === 'palos') {
    box.innerHTML = suitSvg(p.id as Suit);
    const svg = box.firstElementChild as SVGElement;
    svg.style.width = '220px';
    svg.style.height = '230px';
  } else if (p.grupo === 'tramas') box.innerHTML = retal(p.id as Suit);
  else if (p.grupo === 'herramientas') {
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
