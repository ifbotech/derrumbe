// V40 · fase 2b · Las láminas de muestra (scripts/lamina-pixel.ts): cada pieza del pixel-art a tamaño de juego y a
// escala entera, para mirarlas juntas. La hoja de contacto junta todo: los 48 naipes con su índice, el Comodín, los
// dorsos, el Bufón, los Reyes y los iconos, más una mano a tamaño de mesa (130 px) y otra de móvil (70 px). Solo cadenas
// de HTML y SVG, sin DOM.
import type { Suit } from '../../rules/engine';
import { EXPRESIONES, bufonSvg } from './bufon';
import { MAZOS, dorsoSvg } from './dorsos';
import { MOTIVO_AMULETO, MOTIVO_BENDICION, MOTIVO_TRAMPA, amuletoSvg, bendicionSvg, trampaSvg } from './iconos';
import { caraComodin, caraPalo } from './naipes';
import { pintaHalo, pintaNaipeSvg, tallaDe } from './pintas';
import { REYES_PX, reySvg } from './reyes';

const PALOS: Suit[] = ['S', 'C', 'D', 'H'];
const TINTA: Record<Suit, string> = { S: '#1d3a66', C: '#34481a', D: '#633f06', H: '#8e1424' };
const NOMBRE: Record<number, string> = { 10: '10', 11: '11', 12: '12' };

/** El índice, como lo pone card.ts: el número en su placa y el glifo del palo debajo (abajo a la derecha, girado). */
function indice(s: Suit | 'X', r: number, w: number, abajo: boolean): string {
  const fs = Math.max(14, Math.round(w * 0.22));
  const glifo = s === 'X' ? '<span style="font-size:0.6em">★</span>' : pintaHalo(s).replace('<svg ', `<svg style="height:${Math.max(12, Math.round(w * 0.12))}px;width:auto;display:block" `);
  const pos = abajo ? 'right:3.4%;bottom:2.6%;transform:rotate(180deg)' : 'left:3.4%;top:2.6%';
  const num = s === 'X' ? '' : `<b style="background:#f8f3e9;padding:0 .05em;letter-spacing:${r >= 10 ? '-0.08em' : '-0.04em'}">${NOMBRE[r] ?? r}</b>`;
  return `<div style="position:absolute;${pos};display:flex;flex-direction:column;align-items:center;gap:${Math.round(w * 0.012)}px;font:400 ${fs}px/0.92 'Corona Cifras','Arial Black',sans-serif;color:${s === 'X' ? '#2a2220' : TINTA[s]}">${num}${glifo}</div>`;
}

/** Un naipe como en la mesa: marfil luminoso, esquinas redondeadas, filo fino, sombra suave y su índice. */
export function naipe(cara: string, w: number, s: Suit | 'X' = 'X', r = 0): string {
  const h = Math.round(w * 1.4);
  return `<div class="nh" style="position:relative;width:${w}px;height:${h}px;background:#f8f3e9;border:1px solid rgba(42,34,32,.3);border-radius:${Math.round(w * 0.07)}px;box-shadow:0 2px 0 rgba(10,9,8,.32),0 5px 12px rgba(10,9,8,.26);overflow:hidden;flex:none">${cara.replace('<svg ', '<svg style="position:absolute;inset:0;width:100%;height:100%" ')}${r ? indice(s, r, w, false) + indice(s, r, w, true) : s === 'X' ? indice('X', 0, w, false) + indice('X', 0, w, true) : ''}</div>`;
}
const dorso = (m: string, w: number) =>
  `<div style="position:relative;width:${w}px;height:${Math.round(w * 1.4)}px;border-radius:${Math.round(w * 0.07)}px;overflow:hidden;border:1px solid rgba(42,34,32,.45);box-shadow:0 2px 0 rgba(10,9,8,.32),0 5px 12px rgba(10,9,8,.26);flex:none">${dorsoSvg(m).replace('<svg ', '<svg style="position:absolute;inset:0;width:100%;height:100%" ')}</div>`;
const pie = (html: string, txt: string) => `<div class="pz">${html}<span>${txt}</span></div>`;
const tam = (svg: string, w: number, h = w) => svg.replace('<svg ', `<svg width="${w}" height="${h}" `);
const titulo = (t: string) => `<h2>${t}</h2>`;

/** Una mano de ejemplo para la mesa y el móvil. */
const MANO: [Suit, number][] = [['S', 1], ['C', 3], ['D', 7], ['H', 5], ['S', 9], ['C', 6], ['D', 11], ['H', 12]];

export const LAMINAS: Record<string, () => string> = {
  /** La hoja de contacto: todo junto. */
  'contact-sheet': () =>
    titulo('Mesa · naipes de 130 px') +
    `<div class="fila mesa">${MANO.map(([s, r]) => naipe(caraPalo(s, r), 130, s, r)).join('')}${naipe(caraComodin(), 130)}</div>` +
    titulo('Móvil · naipes de 70 px') +
    `<div class="fila mesa">${MANO.map(([s, r]) => naipe(caraPalo(s, r), 70, s, r)).join('')}${naipe(caraComodin(), 70)}</div>` +
    titulo('Los 48 naipes, el Comodín y los dorsos (110 px)') +
    PALOS.map((s) => `<div class="fila">${Array.from({ length: 12 }, (_, i) => naipe(caraPalo(s, i + 1), 110, s, i + 1)).join('')}</div>`).join('') +
    `<div class="fila">${naipe(caraComodin(), 110)}${MAZOS.map((m) => pie(dorso(m, 110), m)).join('')}</div>` +
    titulo('El Bufón y los Reyes') +
    `<div class="fila">${EXPRESIONES.map((e) => pie(tam(bufonSvg(e), 128, 160), e)).join('')}</div>` +
    `<div class="fila">${REYES_PX.flatMap((r) => (['calma', 'vencido'] as const).map((a) => pie(tam(reySvg(r, a), 112), `${r} ${a}`))).join('')}</div>` +
    titulo('Amuletos, Trampas y Bendiciones (56 px)') +
    `<div class="fila">${Object.keys(MOTIVO_AMULETO).map((id) => tam(amuletoSvg(id), 56)).join('')}</div>` +
    `<div class="fila">${Object.keys(MOTIVO_TRAMPA).map((id) => tam(trampaSvg(id), 56)).join('')}${Object.keys(MOTIVO_BENDICION).map((id) => tam(bendicionSvg(id), 56, 64)).join('')}</div>`,
  /** Las pintas sueltas a escala entera (×4 y ×2) y los glifos. */
  pintas: () =>
    `<div class="fila">${PALOS.flatMap((s) => (s === 'C' ? [0, 1] : [0]).map((v) => {
      const [w, h] = tallaDe(s, 'chica');
      return tam(pintaNaipeSvg(s, 'chica', v), w * 4, h * 4);
    })).join('')}</div>` +
    `<div class="fila">${PALOS.flatMap((s) => (s === 'C' ? [0, 1, 2] : [0]).map((v) => {
      const [w, h] = tallaDe(s, 'grande');
      return tam(pintaNaipeSvg(s, 'grande', v), w * 2, h * 2);
    })).join('')}</div>` +
    `<div class="fila">${PALOS.map((s) => tam(pintaHalo(s), 66, 114)).join('')}${PALOS.map((s) => tam(pintaHalo(s), 14, 24)).join('')}</div>`,
  /** Los 1, la Corte y el Comodín a escala ×3 (288 px). */
  figuras: () =>
    PALOS.map((s) => `<div class="fila">${[1, 10, 11, 12].map((r) => naipe(caraPalo(s, r), 288, s, r)).join('')}</div>`).join('') +
    `<div class="fila">${naipe(caraComodin(), 288)}${MAZOS.slice(0, 3).map((m) => dorso(m, 288)).join('')}</div><div class="fila">${MAZOS.slice(3).map((m) => dorso(m, 288)).join('')}</div>`,
  /** Los naipes del 2 al 9 a 192 px (escala ×2). */
  numeros: () => PALOS.map((s) => `<div class="fila">${[2, 3, 4, 5, 6, 7, 8, 9].map((r) => naipe(caraPalo(s, r), 192, s, r)).join('')}</div>`).join(''),
  bufon: () =>
    `<div class="fila">${EXPRESIONES.map((e) => pie(tam(bufonSvg(e), 240, 300), e)).join('')}</div>` +
    `<div class="fila mesa">${EXPRESIONES.map((e) => pie(tam(bufonSvg(e), 96, 120), e)).join('')}</div>`,
  reyes: () =>
    [256, 64, 24].map((lado) => `<div class="fila">${REYES_PX.flatMap((r) => (['calma', 'vencido'] as const).map((a) => tam(reySvg(r, a), lado))).join('')}</div>`).join(''),
  iconos: () =>
    [120, 48, 24]
      .map(
        (lado) =>
          `<div class="fila">${Object.keys(MOTIVO_AMULETO).map((id) => tam(amuletoSvg(id), lado)).join('')}</div>` +
          `<div class="fila">${Object.keys(MOTIVO_TRAMPA).map((id) => tam(trampaSvg(id), lado)).join('')}</div>` +
          `<div class="fila">${Object.keys(MOTIVO_BENDICION).map((id) => tam(bendicionSvg(id), lado, Math.round((lado * 46) / 40))).join('')}</div>`,
      )
      .join(''),
};
