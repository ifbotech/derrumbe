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

// ── 11 · el Caballo: jinete con sombrero sobre un caballo castaño con gualdrapa, de perfil hacia la izquierda; con el
// brazo en alto levanta la pinta de su palo ──
const JINETE = [
  '...QQQQQQ.........',
  '..QQQQQQQQ........',
  'AAAAAAAAAAA.......',
  '...pppphh.........',
  '...pkppph.........',
  '..pppppph......pp.',
  '...ppppp......PP..',
  '....ppp......PP...',
  '..QPPPPPPPPPPP....',
  '.QQPPAPPPPQ.......',
  '.QQPPAPPPQQ.......',
  '.QQPPAPPPQQ.......',
  '.QQPPAPPPQQ.......',
  '.QQyyyyyyQQ.......',
  '..PPPPPPPPP.......',
  '...QQPPPPP........',
  '....QQPP..........',
  '....QQPP..........',
  '....QQPP..........',
  '...NNNNN..........',
];
/** El caballo castaño (n, con la crin, la cola y los cascos oscuros), la gualdrapa del palo y medias blancas. */
const CABALLO_ANIMAL = [
  '...NN',
  '..NnnN',
  '..nnnnNN',
  '.nknnnnNN',
  'nnnnnnnnNN',
  'nnnnnnnnnNN',
  'NnnnnnnnnnNN',
  '.nn..nnnnnnNN',
  '......nnnnnnNN',
  '......nnnnnnnNN',
  '.......nnnnnnnPPPPPPPPPPPPPn',
  '.......nnnnnnnPPPPPPPPPPPPPnnN',
  '.......nnnnnnnPPPPPPPPPPPPPnnnN',
  '.......nnnnnnnPPPPPPPPPPPPPnnnNN',
  '.......nnnnnnnPPPPPPPPPPPPPnnnnN',
  '.......nnnnnnnAAAAAAAAAAAAAnnnnN',
  '.......nnnnnnnnnnnnnnnnnnnnnnnnN',
  '........nnnnnnnnnnnnnnnnnnnnnn.N',
  '........nnnnnnnnnnnnnnnnnnnnnn.N',
  '.........NnnnnnnnnnnnnnnnnnnnN.N',
  '.........nnn...nnn...nnn...nnn.N',
  '.........nnn...nnn...nnn...nnn.N',
  '.........nn.....nn...nn.....nn.N',
  '.........nn.....nn...nn.....nn..',
  '.........nn.....nn...nn.....nn..',
  '.........nn.....nn...nn.....nn..',
  '.........ww.....ww...ww.....ww..',
  '........kkk....kkk..kkk....kkk..',
].map((r) => r.padEnd(32, '.'));
/** Arriba queda lugar para la pinta en alto; el jinete se sienta sobre la gualdrapa (fila 10 del caballo). */
const CABALLO_CUERPO = contorno(pegar(pegar(lienzo(32, 48), CABALLO_ANIMAL, 0, 20), JINETE, 12, 16));

/**
 * Dónde empuña cada figura su pinta. Sota y Rey: esquina de arriba a la izquierda del mapa de la pinta. Caballo
 * (`puño`): la mano en alto; la pinta se centra sobre ella y apoya su pie en la mano.
 */
const MANO: Record<10 | 11 | 12, { cuerpo: Mapa; x: number; y: number; puño?: boolean }> = {
  10: { cuerpo: SOTA_CUERPO, x: 19, y: 4 },
  11: { cuerpo: CABALLO_CUERPO, x: 29, y: 22, puño: true },
  12: { cuerpo: REY_CUERPO, x: 21, y: 6 },
};

/** La figura entera de un palo y un rango (10, 11 o 12), con su pinta en la mano y sus colores. */
export function figuraMapa(s: Suit, rango: 10 | 11 | 12): string[] {
  const { cuerpo, puño } = MANO[rango];
  const [w, h] = medida(cuerpo);
  const pinta = pintaMapa(s);
  const [pw, ph] = medida(pinta);
  const x = puño ? MANO[rango].x - Math.floor(pw / 2) : MANO[rango].x;
  const y = puño ? Math.max(0, MANO[rango].y - ph + 1) : MANO[rango].y;
  // la pinta en la mano, delante del cuerpo; el lienzo crece a la derecha si hace falta
  const ancho = Math.max(w, x + pw);
  let m = pegar(lienzo(ancho, h), cuerpo, 0, 0);
  m = pegar(m, pinta, x, y);
  const ropa = ROPA[s];
  return m.map((r) => [...r].map((c) => (c === 'P' ? ropa.P : c === 'Q' ? ropa.Q : c === 'A' ? ropa.A : c)).join(''));
}

/** Para el Caballo mirando a la derecha, si alguna pantalla lo necesita. */
export const figuraEspejo = (s: Suit, rango: 10 | 11 | 12) => espejo(figuraMapa(s, rango));
