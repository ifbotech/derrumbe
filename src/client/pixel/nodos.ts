// V40 · fase 3a · Iconos pixel-art de la interfaz mínima: los seis nodos del Mapa (Guardia, Guardia Bravo, La Pulpería,
// Santuario del Bufón, Fogón y Rey) y las dos cifras del HUD que no tienen pieza propia (la gota de la Vida y el
// Escudo). Los nodos son medallones de 40 × 40 con el marco de los Amuletos (iconos.ts); la gota y el Escudo, motivos
// sueltos de 12 × 14 que se leen a 20 px junto a su cifra. Sin contorno negro, luz arriba a la izquierda.
import type { TipoNodo } from '../../rules/mapa';
import { BANDAS, medallon, type FormaMarco } from './iconos';
import { tintas } from './paleta';
import { medida, rects, type Mapa } from './rejilla';

const T = tintas();

/** Motivo (≤ 12 × 12) y marco de cada nodo del Mapa. */
const NODO: Record<TipoNodo, { forma: FormaMarco; banda: keyof typeof BANDAS; banda2?: keyof typeof BANDAS; m: Mapa }> = {
  // Guardia: el morrión de acero con su visera
  guardia: {
    forma: 'octogono',
    banda: 'espadas',
    m: ['.....CC.....', '....CCCC....', '...CCCCCc...', '..CCCCCCcc..', '..CCCCCCcc..', '..kkkkkkkk..', '..CCCcCCcc..', '..CCCcCCcc..', '..CCCcCCcc..', '...cccccc...', '....bbbb....'],
  },
  // Guardia Bravo: el morrión con penacho de lacre, sobre lacre
  bravo: {
    forma: 'octogono',
    banda: 'copas',
    m: ['..eeee......', '.eerrre.....', '..rrrRRe....', '....rRCC....', '...CCCCCc...', '..CCCCCCcc..', '..kkkkkkkk..', '..CCCcCCcc..', '..CCCcCCcc..', '...cccccc...', '....bbbb....'],
  },
  // La Pulpería: el mate con su bombilla de plata
  pulperia: {
    forma: 'cuadro',
    banda: 'bastos',
    m: ['.........C..', '........C...', '.......C....', '..ggggCggg..', '.nnnnCnnnnn.', 'nnnnnnnnnnnn', 'nNnnnnnnnnnn', 'nNnnnnnnnnnn', 'nnnnnnnnnnnn', '.nnnnnnnnnn.', '..nnnnnnnn..', '...yyyyyy...'],
  },
  // Santuario del Bufón: el gorro de dos puntas, carmesí y azul, con sus cascabeles
  santuario: {
    forma: 'rombo',
    banda: 'copas',
    banda2: 'cinta',
    m: ['y..........y', 'yr........ty', '.rr......tt.', '.rrr....ttt.', '..rrr..ttt..', '..rrrrtttt..', '..rrrrtttt..', '.yyyyyyyyyy.', '.oyoyoyoyoy.'],
  },
  // Fogón: el fuego sobre los leños
  fogon: {
    forma: 'arco',
    banda: 'madera',
    m: ['.....r......', '....rr......', '....rre.....', '...rreer....', '...reeYer...', '..rreYYer...', '..reYYYYer..', '..reYYYYer..', '...reYYer...', 'nnnnnnnnnnnn', '.NNnnnnnnNN.'],
  },
  // Rey: la corona de puntas con sus perlas de lacre
  rey: {
    forma: 'circulo',
    banda: 'oros',
    m: ['Y....YY....Y', 'y...yyyy...y', 'yy..yyyy..yy', 'yyy.yyyy.yyy', 'yyyyyyyyyyyy', 'yyyyyyyyyyyy', 'oyrryyyyrryo', 'oyrryyyyrryo', 'oooooooooooo'],
  },
};

export const TIPOS_NODO = Object.keys(NODO) as TipoNodo[];

/** El mapa de un nodo del Mapa (40 × 40). */
export function nodoMapa(tipo: TipoNodo): string[] {
  const n = NODO[tipo];
  return medallon(n.forma, BANDAS[n.banda], n.m, n.banda2 ? BANDAS[n.banda2] : undefined);
}

/** Las cifras del HUD: la gota de la Vida y el Escudo (12 × 14, sin marco). */
export const HUD_ICONO = {
  vida: ['.....r......', '.....rr.....', '....rrr.....', '....rrrr....', '...rerrrr...', '...rerrrrR..', '..rerrrrrR..', '..rerrrrrR..', '..rrrrrrRR..', '..rrrrrRRR..', '...rrrRRR...', '....RRRR....'],
  escudo: ['cccccccccccb', 'cCCCCCCCCCcb', 'cCcccccccccb', 'cCcccyycccbb', 'cCccyyyycc.b', 'cCcccyyccccb', '.cCcccccccb.', '.cCcccccccb.', '..cCcccccb..', '...cCcccb...', '....cccb....', '.....cb.....'],
} as const satisfies Record<string, Mapa>;
export type HudIcono = keyof typeof HUD_ICONO;

const svg = (m: Mapa, cls: string) => {
  const [w, h] = medida(m);
  return `<svg class="px icono ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(m, T)}</svg>`;
};

/** El icono de un nodo del Mapa. Clases: `.px .icono .ic-nodo .n-<tipo>`. */
export const nodoSvg = (tipo: TipoNodo, cls = '') => svg(nodoMapa(tipo), `ic-nodo n-${tipo} ${cls}`);
/** La gota de la Vida o el Escudo del HUD. Clases: `.px .icono .ic-hud .h-<que>`. */
export const hudSvg = (que: HudIcono, cls = '') => svg(HUD_ICONO[que], `ic-hud h-${que} ${cls}`);
