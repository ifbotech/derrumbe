// V40 · fase 2 · Las láminas de muestra (scripts/lamina-pixel.ts): cada pieza del pixel-art a varios tamaños, para
// mirarlas juntas. Solo cadenas de SVG, sin DOM.
import type { Suit } from '../../rules/engine';
import { EXPRESIONES, bufonSvg } from './bufon';
import { caraComodin, caraPalo, dorsoSvg } from './naipes';
import { pintaSimbolos, pintaSvg } from './pintas';
import { REYES_PX, reySvg } from './reyes';
import { MOTIVO_AMULETO, MOTIVO_BENDICION, MOTIVO_TRAMPA, amuletoSvg, bendicionSvg, trampaSvg } from './iconos';

const PALOS: Suit[] = ['S', 'C', 'D', 'H'];
const pz = (svg: string, pie: string, lado: number, alto = lado) =>
  `<div class="pz">${svg.replace('<svg ', `<svg width="${lado}" height="${alto}" `)}<span>${pie}</span></div>`;
const defs = () => `<svg width="0" height="0" style="position:absolute"><defs>${pintaSimbolos()}</defs></svg>`;
/** Un naipe suelto: marfil con su borde de tinta y la cara encima. */
const naipe = (cara: string, w: number) =>
  `<div style="position:relative;width:${w}px;height:${(w * 1.4).toFixed(0)}px;background:#efe6d5;border:3px solid #1d1a17;border-radius:${Math.round(w * 0.06)}px;box-sizing:border-box;overflow:hidden">${cara.replace('<svg ', '<svg style="position:absolute;inset:0;width:100%;height:100%" ')}</div>`;

export const LAMINAS: Record<string, () => string> = {
  pintas: () =>
    [300, 96, 48, 24]
      .map((lado) => `<h2>${lado} px</h2><div class="fila">${PALOS.map((s) => pz(pintaSvg(s), s, lado)).join('')}</div>`)
      .join(''),
  naipes: () =>
    defs() +
    PALOS.map((s) => `<div class="fila">${Array.from({ length: 12 }, (_, i) => `<div class="pz">${naipe(caraPalo(s, i + 1), 110)}<span>${s}${i + 1}</span></div>`).join('')}</div>`).join('') +
    `<div class="fila"><div class="pz">${naipe(caraComodin(), 110)}<span>Comodín</span></div>${['escoba', 'truco', 'chinchon', 'mentiroso', 'chancho'].map((m) => `<div class="pz">${naipe(dorsoSvg(m), 110)}<span>${m}</span></div>`).join('')}</div>`,
  figuras: () =>
    defs() +
    `<div class="fila">${PALOS.flatMap((s) => [10, 11, 12].map((r) => `<div class="pz">${naipe(caraPalo(s, r), 250)}<span>${s}${r}</span></div>`)).join('')}</div>` +
    `<div class="fila">${PALOS.map((s) => `<div class="pz">${naipe(caraPalo(s, 1), 250)}<span>${s}1</span></div>`).join('')}<div class="pz">${naipe(caraComodin(), 250)}<span>X</span></div></div>`,
  bufon: () =>
    [300, 120, 48].map((lado) => `<div class="fila">${EXPRESIONES.map((e) => pz(bufonSvg(e), e, lado)).join('')}</div>`).join('') +
    `<div class="fila mesa">${EXPRESIONES.map((e) => pz(bufonSvg(e), e, 160)).join('')}</div>`,
  reyes: () =>
    [300, 96, 48, 24].map((lado) => `<div class="fila">${REYES_PX.flatMap((r) => (['calma', 'vencido'] as const).map((a) => pz(reySvg(r, a), `${r} ${a}`, lado))).join('')}</div>`).join(''),
  iconos: () =>
    [96, 48, 24]
      .map(
        (lado) =>
          `<h2>${lado} px</h2><div class="fila">${Object.keys(MOTIVO_AMULETO).map((id) => pz(amuletoSvg(id), lado > 24 ? id : '', lado)).join('')}</div>` +
          `<div class="fila">${Object.keys(MOTIVO_TRAMPA).map((id) => pz(trampaSvg(id), lado > 24 ? id : '', lado)).join('')}</div>` +
          `<div class="fila">${Object.keys(MOTIVO_BENDICION).map((id) => pz(bendicionSvg(id), lado > 24 ? id : '', lado)).join('')}</div>`,
      )
      .join(''),
};
