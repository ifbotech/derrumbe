// V40 · fase 2 · La Corte de la baraja española en pixel-art, de cuerpo entero: 10 Sota (de pie), 11 Caballo (a
// caballo) y 12 Rey (con corona). Un cuerpo por figura, vestido con los colores de cada palo, y en la mano la pinta de
// su palo (la espada, el basto, el oro o la copa). Dibujos originales; sin texto.
//
// Letras propias de los cuerpos (se tiñen por palo): P ropa · Q ropa en sombra · A adorno.
import type { Suit } from '../../rules/engine';
import { pintaMapa } from './pintas';
import { contorno, espejo, lienzo, medida, pegar, simetrico, type Mapa } from './rejilla';

/** Ropa, sombra y adorno de cada palo (letras de la paleta común). */
export const ROPA: Record<Suit, { P: string; Q: string; A: string }> = {
  S: { P: 'b', Q: 'B', A: 'y' },
  C: { P: 'g', Q: 'G', A: 'e' },
  D: { P: 'y', Q: 'o', A: 'R' },
  H: { P: 'r', Q: 'R', A: 'Y' },
};

// ── 12 · el Rey: corona, barba blanca, cuello de armiño, manto y túnica larga hasta los pies ──
const REY_CUERPO = contorno(
  simetrico([
    '.........Y..Y.',
    '.........YyYyY',
    '.........yyRyy',
    '.........yyyyy',
    '........hhpppp',
    '........hppkpp',
    '........hppppp',
    '........hwppps',
    '........wwwwwk',
    '.........wwwww',
    '..........wwww',
    '.....QQQQwkwww',
    '....QQQQwwwwkw',
    '...QQQQQwkwwww',
    '...QQQQPPPPPPA',
    '..QQQQQPPPPPPA',
    '..QQQQPPPPPPPA',
    '..QQQQPPPPPPPA',
    '..QQQQPPPPPPPA',
    '..QQQQPPPPPPPA',
    '..QQQQPPPPPPPA',
    '..QQQQyyyyyyyy',
    '..QQQQPPPPPPPA',
    '..QQQQPPPPPPPA',
    '..QQQQPPPPPPPA',
    '..QQQQPPPPPPPA',
    '.QQQQQPPPPPPPA',
    '.QQQQQPPPPPPPA',
    '.QQQQQPPPPPPPA',
    '.QQQQQPPPPPPPA',
    '.QQQQPPPPPPPPA',
    'QQQQQPPPPPPPPA',
    'QQQQQPPPPPPPPA',
    'QQQQQPPPPPPPPA',
    'QQQQQPPPPPPPPA',
    'QQQQPPPPPPPPPA',
    'QQQQPPPPPPPPPA',
    'QQQQAAAAAAAAAA',
    '......NNNN....',
    '.....NNNNN....',
  ]),
);

// ── 10 · la Sota: paje de pie con bonete y pluma, jubón con cinto, calzas y zapatos ──
const SOTA_CUERPO = (() => {
  const cuerpo = simetrico([
    '......QQQQQQ',
    '.....QQQQQQQ',
    '....AAAAAAAA',
    '......hhpppp',
    '......hppkpp',
    '......hppppp',
    '.......pppps',
    '........pppk',
    '.........ppp',
    '.....QQQAAAA',
    '....QQQPPPPP',
    '...QQQPPPPPA',
    '...QQPPPPPPA',
    '...QQPPPPPPA',
    '...QQPPPPPPA',
    '...QQPPPPPPA',
    '...QQPPPPPPA',
    '...QQPPPPPPA',
    '...QQyyyyyyy',
    '...QQPPPPPPA',
    '...QQPPPPPPA',
    '..QQQPPPPPPA',
    '..QQPPPPPPPA',
    '..QAAAAAAAAA',
    '......QQQ...',
    '......QQQ...',
    '......PPP...',
    '......PPP...',
    '......PPP...',
    '......PPP...',
    '......PPP...',
    '......PPP...',
    '......PPP...',
    '......PPP...',
    '.....NNNN...',
    '....NNNNN...',
  ]);
  // la pluma del bonete, a un lado
  return contorno(pegar(cuerpo, ['...www', '..www.', '.www..', 'ww....'], 15, 0).map((r, i) => (i < 4 ? r : r)));
})();

// ── 11 · el Caballo: jinete con sombrero sobre un caballo blanco con gualdrapa, de perfil hacia la izquierda ──
const JINETE = [
  '....QQQQQ.....',
  '...QQQQQQQ....',
  '..AAAAAAAAA...',
  '....hpppp.....',
  '....pkpkp.....',
  '....ppppp..pp.',
  '.....pkp...PP.',
  '.....ppp...PP.',
  '...QPPPPPQPPP.',
  '..QQPPAPPQQ...',
  '..QQPPAPPQQ...',
  '..QQPPAPPQQ...',
  '..QQyyyyyQQ...',
  '...PPPPPPP....',
  '...PPPPPPPP...',
  '.......PPP....',
  '.......PPP....',
  '.......NNNN...',
];
const CABALLO_ANIMAL = [
  '...Nw.............................',
  '..Nwww............................',
  '..wkwwN...........................',
  '.wwwwwNN..........................',
  'wwwwwwwNN.........................',
  'ww..wwwwNN........................',
  '.....wwwwNN.......................',
  '.....wwwwwNN......................',
  '......wwwwwN......................',
  '......wwwwwwPPPPPPPPPPPPPPPPP.....',
  '.......wwwwPPPPPPPPPPPPPPPPPPw....',
  '.......wwwwPPPPPPPPPPPPPPPPPPww...',
  '.......wwwwAAAAAAAAAAAAAAAAAAwwN..',
  '.......wwwwwwwwwwwwwwwwwwwwwwwwNN.',
  '........wwwwwwwwwwwwwwwwwwwwwwwN.N',
  '........wwwwwwwwwwwwwwwwwwwwwww..N',
  '........ww.ww...........ww.www...N',
  '........ww..ww..........ww..ww....',
  '........ww..ww..........ww..ww....',
  '........ww...ww.........ww...ww...',
  '.......kkk..kkk........kkk..kkk...',
];
const CABALLO_CUERPO = contorno(pegar(pegar(lienzo(34, 34), CABALLO_ANIMAL, 0, 13), JINETE, 10, 9));

/** Dónde empuña cada figura su pinta: esquina del mapa de la pinta sobre el cuerpo. */
const MANO: Record<10 | 11 | 12, { cuerpo: Mapa; x: number; y: number }> = {
  10: { cuerpo: SOTA_CUERPO, x: 19, y: 4 },
  11: { cuerpo: CABALLO_CUERPO, x: 20, y: 0 },
  12: { cuerpo: REY_CUERPO, x: 21, y: 6 },
};

/** La figura entera de un palo y un rango (10, 11 o 12), con su pinta en la mano y sus colores. */
export function figuraMapa(s: Suit, rango: 10 | 11 | 12): string[] {
  const { cuerpo, x, y } = MANO[rango];
  const [w, h] = medida(cuerpo);
  const pinta = pintaMapa(s);
  const [pw] = medida(pinta);
  // la pinta en la mano, delante del cuerpo; el lienzo crece a la derecha si hace falta
  const ancho = Math.max(w, x + pw);
  let m = pegar(lienzo(ancho, h), cuerpo, 0, 0);
  m = pegar(m, pinta, x, y);
  const ropa = ROPA[s];
  return m.map((r) => [...r].map((c) => (c === 'P' ? ropa.P : c === 'Q' ? ropa.Q : c === 'A' ? ropa.A : c)).join(''));
}

/** Para el Caballo mirando a la derecha, si alguna pantalla lo necesita. */
export const figuraEspejo = (s: Suit, rango: 10 | 11 | 12) => espejo(figuraMapa(s, rango));
