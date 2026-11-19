// V40 1d · Lo que la interfaz enseña de cada pieza que se puede llevar (Amuleto, Trampa del Bufón o Bendición) y que el
// bot usa para comprar (SPECS/V40-REFUNDACION.md, apartado 6):
//
//   · su sello de nivel S · A · B, que calcula el laboratorio (`npm run analyze:meta -- sellos`) con el efecto de la
//     pieza en la tasa de victoria y guarda en balance-config.json (`sellosNivel`); nunca se escribe a mano;
//   · su ★ Sinergia: una etiqueta de 2–3 palabras cuando la pieza enciende un nivel [2/4] de su Rey («★ Bastos [4]»),
//     encaja con el Mazo de la campaña («★ Para Escoba») o deja a un Rey a una pieza de su nivel [4] («★ Bastos 3/4»).
//
// Puro: sin azar, sin fechas y sin DOM. Las etiquetas salen en español (`texto`) y con su clave y sus datos para el
// otro idioma (`clave`, `datos`; ver `sinergiaFor` en textos.ts).
import { BALANCE, SelloNivel } from './balance-config';
import { MAZO_NOMBRE } from './mazos';
import type { MazoId } from './mazos';
import { BENDICION, BendInst, REY_PALO, ReyId, UMBRALES_REY, fuentesDe, nivelesReyes, reyesDe } from './reyes';
import { ES_PLANTILLAS } from './plantillas';
import { SPECIAL } from './specials';
import { TOOL } from './tools';

/** Las tres clases de pieza que llevan sello. */
export type TipoPieza = 'amuleto' | 'trampa' | 'bendicion';
/** Una pieza: su clase y su `id` (el de `TOOLS`, `SPECIALS` o `BENDICIONES`). */
export interface Pieza {
  tipo: TipoPieza;
  id: string;
}
/** Dónde guarda balance-config.json los sellos de cada clase. */
export const CLASE_SELLO: Record<TipoPieza, keyof typeof BALANCE.sellosNivel> = { amuleto: 'amuletos', trampa: 'trampas', bendicion: 'bendiciones' };
export const SELLOS: SelloNivel[] = ['S', 'A', 'B'];

/** ¿Existe la pieza? */
export const existePieza = (p: Pieza): boolean => (p.tipo === 'amuleto' ? !!TOOL[p.id] : p.tipo === 'trampa' ? !!SPECIAL[p.id] : !!BENDICION[p.id]);

/** El sello de nivel de una pieza (S, A o B), o null si el laboratorio aún no lo calculó. */
export function selloDe(p: Pieza): SelloNivel | null {
  const s = BALANCE.sellosNivel?.[CLASE_SELLO[p.tipo]]?.[p.id];
  return s === 'S' || s === 'A' || s === 'B' ? s : null;
}

/** Los Reyes de los que es pieza: el de su familia (Amuleto), el suyo o los dos de una Dual (Bendición), ninguno (Trampa). */
export function reyesDePieza(p: Pieza): ReyId[] {
  if (p.tipo === 'amuleto') return TOOL[p.id] ? [TOOL[p.id].arch] : [];
  if (p.tipo === 'bendicion') return BENDICION[p.id] ? reyesDe(BENDICION[p.id]) : [];
  return [];
}

/** Los Mazos con los que encaja una pieza (los Amuletos y las Trampas lo dicen; las Bendiciones van con su Rey). */
export function mazosDePieza(p: Pieza): MazoId[] {
  if (p.tipo === 'amuleto') return TOOL[p.id]?.mazos ?? [];
  if (p.tipo === 'trampa') return SPECIAL[p.id]?.mazos ?? [];
  return [];
}

/** Lo que se lleva en la campaña, para saber si una pieza encaja. */
export interface ContextoSinergia {
  /** El Mazo de la campaña (`run.deckId`). */
  mazo?: string;
  bendiciones?: readonly BendInst[];
  /** Los Amuletos que se llevan (`run.tools`). */
  tools?: readonly { id: string }[];
}

/** La etiqueta ★ de una pieza: por qué encaja, con su clave de diccionario, sus datos y el texto en español. */
export type Sinergia =
  | { tipo: 'nivel'; rey: ReyId; umbral: number; clave: 'sinergia.nivel'; datos: { rey: ReyId; n: number }; texto: string }
  | { tipo: 'mazo'; mazo: MazoId; clave: 'sinergia.mazo'; datos: { mazo: MazoId }; texto: string }
  | { tipo: 'acerca'; rey: ReyId; umbral: number; clave: 'sinergia.acerca'; datos: { rey: ReyId; k: number; n: number }; texto: string };

/** Las plantillas en español (`sinergia.*` de plantillas.ts; el inglés, en EN_PLANTILLAS). */
const SINERGIA_ES = ES_PLANTILLAS as Record<Sinergia['clave'], string>;

/**
 * ¿Encaja esta pieza con lo que llevás? En este orden: enciende un nivel [2/4] de uno de sus Reyes; encaja con el Mazo
 * de la campaña; o deja a uno de sus Reyes a una pieza de su nivel [4] (con 3 de 4). Si no, null. Una pieza que ya se
 * lleva no se mira (no se puede volver a tomar).
 */
export function sinergia(p: Pieza, ctx: ContextoSinergia): Sinergia | null {
  if (!existePieza(p)) return null;
  const bend = ctx.bendiciones ?? [];
  const tools = ctx.tools ?? [];
  if (p.tipo === 'amuleto' && tools.some((t) => t.id === p.id)) return null;
  if (p.tipo === 'bendicion' && bend.some((b) => b.id === p.id)) return null;
  const antes = nivelesReyes(fuentesDe(bend, tools));
  const despues = nivelesReyes(p.tipo === 'amuleto' ? fuentesDe(bend, [...tools, { id: p.id }]) : p.tipo === 'bendicion' ? fuentesDe([...bend, { id: p.id, n: 0 }], tools) : fuentesDe(bend, tools));
  const reyes = reyesDePieza(p);
  for (const rey of reyes)
    if (despues[rey].nivel > antes[rey].nivel) {
      const umbral = UMBRALES_REY[despues[rey].nivel - 1];
      return { tipo: 'nivel', rey, umbral, clave: 'sinergia.nivel', datos: { rey, n: umbral }, texto: SINERGIA_ES['sinergia.nivel'].replace('{palo}', REY_PALO[rey]).replace('{n}', String(umbral)) };
    }
  const mazo = mazosDePieza(p).find((m) => m === ctx.mazo);
  if (mazo) return { tipo: 'mazo', mazo, clave: 'sinergia.mazo', datos: { mazo }, texto: SINERGIA_ES['sinergia.mazo'].replace('{mazo}', MAZO_NOMBRE[mazo]) };
  const alto = UMBRALES_REY[UMBRALES_REY.length - 1];
  for (const rey of reyes)
    if (despues[rey].n === alto - 1 && antes[rey].n === alto - 2) {
      const k = despues[rey].n;
      return { tipo: 'acerca', rey, umbral: alto, clave: 'sinergia.acerca', datos: { rey, k, n: alto }, texto: SINERGIA_ES['sinergia.acerca'].replace('{palo}', REY_PALO[rey]).replace('{k}', String(k)).replace('{n}', String(alto)) };
    }
  return null;
}
