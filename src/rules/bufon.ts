// V40 · El Bufón enseña la mesa (SPECS/V40-REFUNDACION.md, apartados 2 y 3). Sustituye a la Partida guiada: en los
// tres primeros golpes del Asalto 1 de la primera campaña dice una frase corta por golpe (palo e Inmune, la cuenta,
// Golpe exacto). Sin ventanas ni bloqueos: la interfaz la escribe al margen y se sigue jugando. Se apaga en Ajustes.
//
// Puro: aquí viven las frases (≤ 90 caracteres, rioplatense; el inglés va en src/shared/i18n/en.ts) y la regla de
// cuándo toca cada una. La interfaz (fase 3, arte-ui y juice-ux) decide cómo se ve el bocadillo.

/** Los tres consejos, en el orden en que salen. */
export type ConsejoBufon = 'palo' | 'cuenta' | 'exacto';

export interface FraseBufon {
  id: ConsejoBufon;
  /** Lo que dice el Bufón: una línea, ≤ 90 caracteres, sin HTML. */
  texto: string;
}

/** Lo que dice el Bufón antes de cada uno de los tres primeros golpes (clave `bufon.<id>` del diccionario). */
export const FRASES_BUFON: FraseBufon[] = [
  { id: 'palo', texto: 'Mirá el palo del enemigo: tus cartas de ese palo no le hacen nada. Es Inmune.' },
  { id: 'cuenta', texto: 'La cuenta es simple: Daño × Multi = Golpe. Juntá cartas para subir el Multi.' },
  { id: 'exacto', texto: 'Dejalo justo en cero y es Golpe exacto: no te contraataca y te llevás oro.' },
];

/** Tope de largo de una frase del Bufón (el bocadillo nunca tapa la mano). */
export const BUFON_MAX = 90;

/** Lo que hace falta saber de la partida para decidir si el Bufón habla. */
export interface CtxBufon {
  /** Campañas ya terminadas en este perfil (`meta.runs`): solo habla en la primera. */
  campanas: number;
  /** El asalto en curso (`run.stage`): solo en el 1. */
  asalto: number;
  /** Jugadas ya hechas en este asalto (`turnCount` de la mesa): antes de la 1.ª, la 2.ª y la 3.ª hay consejo. */
  jugadas: number;
  /** El jugador lo apagó en Ajustes. */
  apagado: boolean;
  /** Cooperativo o AUTO: nadie lee al margen. */
  ajeno?: boolean;
}

/** El consejo que toca ahora, o null si el Bufón calla. */
export function consejoBufon(ctx: CtxBufon): ConsejoBufon | null {
  if (ctx.apagado || ctx.ajeno || ctx.campanas > 0 || ctx.asalto !== 1) return null;
  return FRASES_BUFON[ctx.jugadas]?.id ?? null;
}
