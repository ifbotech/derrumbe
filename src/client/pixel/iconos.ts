// V40 · fase 2 · Iconos pixel-art de las piezas: los 22 Amuletos (4 familias, una por Rey y palo), las 8 Trampas del
// Bufón y las 26 Bendiciones de los Reyes. Cada icono es un marco de su familia (forma y tinta) con un motivo dentro,
// en 22 × 22 celdas: se lee a 24 px (la silueta del marco) y a 48 px (el motivo).
//
//   Amuletos de Espadas: octógono de acero · de Bastos: cuadro de roble con brotes · de Oros: moneda · de Copas: arco.
//   Trampas del Bufón: rombo de arlequín, mitad rojo y mitad azul, con un cascabel.
//   Bendiciones: medallón redondo con la corona de su Rey encima (las Duales, con el medallón partido en dos tintas).
import { tintas } from './paleta';
import { contorno, medida, pegar, lienzo, rects, type Mapa } from './rejilla';

export type Familia = 'espadas' | 'bastos' | 'oros' | 'copas';
const T = tintas();
/** Lado del lienzo del marco antes del contorno. */
const N = 20;
const C = (N - 1) / 2;

type Forma = (dx: number, dy: number, m: number) => boolean;
const FORMA: Record<string, Forma> = {
  // octógono de esquinas cortadas
  octogono: (dx, dy, m) => Math.abs(dx) <= C - m && Math.abs(dy) <= C - m && Math.abs(dx) + Math.abs(dy) <= 13.2 - m * 1.42,
  // cuadro de esquinas redondas
  cuadro: (dx, dy, m) => {
    const r = 3;
    const ax = Math.abs(dx) - (C - m - r);
    const ay = Math.abs(dy) - (C - m - r);
    return Math.abs(dx) <= C - m && Math.abs(dy) <= C - m && (ax <= 0 || ay <= 0 || Math.hypot(ax, ay) <= r + 0.2);
  },
  circulo: (dx, dy, m) => Math.hypot(dx, dy) <= C + 0.35 - m,
  // arco de medio punto sobre un pie recto
  arco: (dx, dy, m) => Math.abs(dx) <= C - 1 - m && dy <= C - m && (dy >= -1 || Math.hypot(dx, dy + 1) <= C - 1 - m),
  rombo: (dx, dy, m) => Math.abs(dx) + Math.abs(dy) <= C + 0.6 - m * 1.42,
};

/**
 * Un marco: banda de dos celdas, la de fuera en la tinta de la familia (`banda`, o dos tintas partidas a izquierda y
 * derecha) y la de dentro en su tono claro (`luz`), e interior claro. El tono claro aligera la tinta del icono.
 */
function marco(forma: string, banda: string, otra = banda, interior = 'w', alto = N): string[] {
  const f = FORMA[forma];
  const cy = (alto - 1) / 2;
  return Array.from({ length: alto }, (_, y) =>
    Array.from({ length: N }, (_, x) => {
      const dx = x - C;
      const dy = y - cy;
      if (!f(dx, dy, 0)) return '.';
      if (f(dx, dy, 2)) return interior;
      const fuera = !f(dx, dy, 1);
      const tinta = x < C ? banda : otra;
      return fuera ? tinta : (LUZ[tinta] ?? tinta);
    }).join(''),
  );
}
/** El tono claro de cada tinta de familia (la banda de dentro del marco). */
const LUZ: Record<string, string> = { b: 'C', g: 'l', o: 'y', r: 'Y', t: 'C' };

/** Coloca un motivo (con su contorno) en el centro del interior del marco. */
function conMotivo(base: Mapa, motivo: Mapa, oy = 0): string[] {
  const m = contorno(motivo);
  const [w, h] = medida(m);
  const [bw, bh] = medida(base);
  return pegar(base, m, Math.round((bw - w) / 2), Math.round((bh - h) / 2) + oy);
}

// ── adornos de familia ──

/** Brotes de roble en las esquinas de arriba del cuadro de Bastos. */
const BROTE = ['G.', 'GG'];
/** Cascabel del rombo del Bufón. */
const CASCABEL = ['.y.', 'yYy', 'yky'];
/** Coronas de los Reyes, encima de su medallón. */
const CORONA: Record<Familia, Mapa> = {
  espadas: ['c.c.c', 'ccccc', 'yyyyy'],
  bastos: ['g.g.g', 'ggggg', 'yyyyy'],
  oros: ['Y.Y.Y', 'YYYYY', 'yyyyy'],
  copas: ['y.y.y', 'yyyyy', 'yRyRy'],
};
const BANDA: Record<Familia, string> = { espadas: 'b', bastos: 'g', oros: 'o', copas: 'r' };
const FORMA_FAM: Record<Familia, string> = { espadas: 'octogono', bastos: 'cuadro', oros: 'circulo', copas: 'arco' };

function marcoAmuleto(f: Familia): string[] {
  let m = contorno(marco(FORMA_FAM[f], BANDA[f]));
  if (f === 'bastos') m = pegar(pegar(m, BROTE, 1, 0), ['.G', 'GG'], 19, 0);
  return m;
}

function marcoTrampa(): string[] {
  const m = contorno(marco('rombo', 'r', 't'));
  return pegar(m, contorno(CASCABEL), 8, 17);
}

function marcoBendicion(f: Familia, duo?: Familia): string[] {
  const base = marco('circulo', BANDA[f], duo ? BANDA[duo] : BANDA[f], 'w', N);
  let m = pegar(lienzo(N, N + 3), base, 0, 3);
  m = contorno(m);
  m = pegar(m, contorno(CORONA[f]), duo ? 4 : 7, 0);
  if (duo) m = pegar(m, contorno(CORONA[duo]), 11, 0);
  return m;
}

// ── motivos (≤ 12 × 12 celdas, sin contorno: se lo pone conMotivo) ──

export const MOTIVO_AMULETO: Record<string, { fam: Familia; m: Mapa }> = {
  // Cuchillo criollo: hoja ancha en diagonal y cabo de madera con virola de oro
  piqueta: { fam: 'espadas', m: ['.........CC', '........CCc', '.......CCc.', '......CCc..', '.....CCc...', '....CCc....', '...yyy.....', '..nyy......', '.nnn.......', 'nnN........', 'nN.........'] },
  // Cortaplumas: navaja abierta de cachas rojas
  cincel: { fam: 'espadas', m: ['.......CC.', '......CCc.', '.....CCc..', '....CCc...', '...CCc....', '..yCc.....', '.rrrrrrrr.', 'rrRrrrrrrr', '.rrrrrrrr.'] },
  // Piedra de afilar: la piedra sobre su taco y las chispas
  calibre: { fam: 'espadas', m: ['Y........Y', '.Y......Y.', '..Y....Y..', '..........', 'cccccccccc', 'bbbbbbbbbb', 'bbbbbbbbbb', 'nnnnnnnnnn', 'NNNNNNNNNN'] },
  // Tijera de esquila: dos hojas en V y el muelle de oro
  cizalla: { fam: 'espadas', m: ['CC......CC', 'CCc....cCC', '.CCc..cCC.', '.CCc..cCC.', '..CCccCC..', '...CCCC...', '...yyyy...', '..yy..yy..', '..y....y..', '..yy..yy..', '...yyyy...'] },
  // Facón de plata: hoja larga, gavilán en S y cabo de plata
  plano_maestro: { fam: 'espadas', m: ['....C...', '....CC..', '....CCc.', '....CCc.', '....CCc.', '....CCc.', '....CCc.', '.wwwwwww', '..w.cc..', '....hh..', '....cc..', '...CCCC.'] },
  // Rebenque: cabo trenzado y la lonja en lazo
  maza: { fam: 'bastos', m: ['...NNNNN..', '..NN...NN.', '.NN.....NN', '.N.......N', '.NN......N', '..nn.....N', '..nn....NN', '.nnn...NN.', '.yyy......', '.nnn......', '.nnn......', '.yyy......'] },
  // Guardamonte: las dos alas de cuero con sus tachas
  sacos: { fam: 'bastos', m: ['.nnnn..nnnn.', 'nnnnnnnnnnnn', 'nnynnnnnnynn', 'nnnnnnnnnnnn', 'nnnnnNNnnnnn', '.nnnnNNnnnn.', '.nnnnNNnnnn.', '..nnn..nnn..', '..nnn..nnn..', '...nn..nn...'] },
  // Poncho: paño rojo con guardas y flecos
  encofrado: { fam: 'bastos', m: ['....kk....', 'RRRRkkRRRR', 'RRRRRRRRRR', 'kkkkkkkkkk', 'RRRRRRRRRR', 'RRRRRRRRRR', 'kkkkkkkkkk', 'RRRRRRRRRR', 'R.R.R.R.R.'] },
  // Talero: el cabo grueso en diagonal y la azotera corta
  contragolpe: { fam: 'bastos', m: ['.........NN', '........NN.', '.......NN..', '......nnn..', '.....nnn...', '....nnn....', '...nnn.....', '..ynn......', '.yyy.......', 'nny........', 'nn.........'] },
  // Boleadoras: tres bolas de cuero unidas por sus guascas
  sordina: { fam: 'bastos', m: ['....nnn.....', '...nnnnn....', '...nNnnn....', '....nnn.....', '.....N......', '.....N......', '....N.N.....', '...N...N....', '.nnn...nnn..', 'nnNnn.nNnnn.', 'nnnnn.nnnnn.', '.nnn...nnn..'] },
  // Moneda falsa: la moneda rajada de arriba abajo
  cortavidrios: { fam: 'oros', m: ['..yyyyyy..', '.yYYyyyyy.', 'yYyyykyyyy', 'yyyyykyyyy', 'yyyykkyyyy', 'yyyykyyyyy', 'yyyykkyyyy', '.yyyykyyy.', '..yyyyyy..'] },
  // Alcancía: chanchito de barro con la ranura y una moneda que entra
  hucha: { fam: 'oros', m: ['....yyy.....', '....yyy.....', '..eekkkee...', '.eeeeeeeeee.', 'eeeeeeeeeeee', 'eekeeeeeeeee', 'eeeeeeeeeeRe', '.eeeeeeeeee.', '.ee......ee.'] },
  // Naipes marcados: un dorso y un naipe con su marca roja
  gemelos: { fam: 'oros', m: ['BBBBBBB....', 'BbBbBbB....', 'BBBBwwwwwww', 'BbBbwRwwwww', 'BBBBwwwwwww', 'BbBbwwwRRww', 'BBBBwwwRRww', 'BbBbwwwwwww', 'BBBBwwwwwRw', '....wwwwwww'] },
  // Farol: el farol encendido
  piquete: { fam: 'oros', m: ['...yyy...', '..y...y..', '..yyyyy..', '.yYYYYYy.', '.yYwwwYy.', '.yYwwwYy.', '.yYYYYYy.', '..yyyyy..', '...yyy...'] },
  // Cubilete: el vaso de cuero volcado y su dado
  dados: { fam: 'oros', m: ['nnnnnnn....', 'nNnnnnn....', '.nnnnn.....', '.nnnnn.....', '.nnnnn.wwww', '..nnn..wkww', '..nnn..wwww', '.nnnnn.wwkw', '.......wwww'] },
  // Cañita voladora: el cohete rojo, su varilla y la estela
  dinamita: { fam: 'oros', m: ['......RR..', '.....RRRR.', '.....RyRR.', '.....RRRR.', '.....RRRR.', '......n...', '.....n....', '....n.....', '.Y.n......', 'YwY.......', '.Y........'] },
  // Mate curado: la calabaza con su bombilla de plata
  paleta: { fam: 'copas', m: ['........CC', '.......CC.', '......CC..', '..gggCgg..', '.nnnCnnnn.', 'nnnnnnnnnn', 'nNnnnnnnnn', 'nNnnnnnnnn', 'nnnnnnnnnn', '.nnnnnnnn.', '..nnnnnn..', '...yyyy...'] },
  // Bota de vino: el cuero panzón con su pico rojo
  botiquin: { fam: 'copas', m: ['....RR....', '....nn....', '...nnnn...', '..nnnnnn..', '.nnnnnnnn.', 'nnnnnnnnnn', 'nnNnnnnnnn', 'nnNnnnnnnn', '.nnnnnnnnn', '..nnnnnnn.', '...nnnnn..'] },
  // Asado: la parrilla, la carne y las brasas
  casco: { fam: 'copas', m: ['.eeeeeeeee.', 'eeReeeeReee', 'eeeeeeeeeee', 'kkkkkkkkkkk', '.k..k..k..k', '..Y..Y..Y..', '.YYYYYYYYY.', '.RRRRRRRRR.'] },
  // Guitarra: caja, boca y mástil
  cinta: { fam: 'copas', m: ['.........NN', '........NN.', '.......NN..', '......NN...', '..nnnNN....', '.nnnnNnn...', 'nnnkkNnnn..', 'nnkkknnnn..', 'nnnkknnnn..', '.nnnnnnn...', '..nnnnn....'] },
  // Último trago: el vaso casi vacío y la última gota
  ultimo: { fam: 'copas', m: ['CCCCCCCC', 'C......C', 'C......C', 'C......C', 'CRRRRRRC', 'CCCCCCCC', '...RR...', '...RR...'] },
  // Alpargatas: lona azul y suela de yute
  andamio: { fam: 'copas', m: ['....tttttt.', '...tttttttt', '..ttwwtttTt', '.ttttttttTt', 'tttttttttTt', 'YYYYYYYYYYY', '.ooooooooo.'] },
};

export const MOTIVO_TRAMPA: Record<string, Mapa> = {
  // Cuento del tío: dos naipes iguales, el mismo número repetido
  gemelo: ['wwwww.....', 'wRRww.....', 'wwwRw.....', 'wwRww.wwww', 'wRwww.wRRw', 'wRRRw.wwRw', 'wwwww.wRww', '......wRRR', '......wwww'],
  // Zancadilla: la bota que se cruza en el camino
  mordaza: ['....NN....', '....NN....', '....NN....', '....NN....', '....NNNNN.', '...NNNNNNN', '...NNNNNNN', 'Y.........', '.Y........'],
  // Mano negra: la mano de tinta abierta
  nitro: ['..k.k.k...', '..k.k.k.k.', '..k.k.k.k.', '..kkkkkkk.', 'k.kkkkkkk.', 'kkkkkkkkk.', '.kkkkkkkk.', '..kkkkkk..', '...kkkk...'],
  // Disfraz: el antifaz con sus cintas
  sierra: ['..........', 'RRRRRRRRRR', 'RRwwRRwwRR', 'RRwkRRwkRR', 'RRRRRRRRRR', '.RRR..RRR.', 't........t', '.t......t.'],
  // Pase mágico: la varita con su chispa
  grua: ['......Y...', '.....YwY..', '......Y...', '....kk....', '...kk.....', '..kk......', '.kk.......', 'wk........'],
  // Mordida: la moneda mordida
  pico: ['..yyyy....', '.yyyyyy...', 'yyYyyy....', 'yyyyy.....', 'yyyyy.....', 'yyyyyy....', '.yyyyyy...', '..yyyy....'],
  // Puñal oculto: la manga azul y la punta que asoma
  barreno: ['........C.', '.......CC.', '......CC..', 'ttttttCt..', 'tttttttt..', 'tTtttttt..', 'tTtttttt..', 'tttttttt..'],
  // ¡Retruco!: el estallido de oro con su centro rojo
  bola: ['....Y.....', '.Y..Y..Y..', '..YYYYY...', '.YYRRRYY..', 'YYRRRRRYY.', '.YYRRRYY..', '..YYYYY...', '.Y..Y..Y..', '....Y.....'],
};

export const MOTIVO_BENDICION: Record<string, { fam: Familia; duo?: Familia; m: Mapa }> = {
  // Espadas · filo
  filo: { fam: 'espadas', m: ['.......CC', '......CCc', '.....CCc.', '....CCc..', '...CCc...', 'Y.yyc....', '.Yyy.....', '.nn......', 'nn.......'] },
  estocada: { fam: 'espadas', m: ['.........', 'k.k......', '.........', 'nyyCCCCCC', 'nyyCCCCCc', '.........', 'k.k......'] },
  tajo: { fam: 'espadas', m: ['RR....RR', '.RR....R', '..RR....', 'R..RR...', 'RR..RR..', '.RR..RR.', '..RR..RR', '...RR..R'] },
  duelo: { fam: 'espadas', m: ['C.......C', 'CC.....CC', '.CC...CC.', '..CC.CC..', '...CCC...', '..yCRCy..', '.yy.R.yy.', 'nn.....nn'] },
  remate: { fam: 'espadas', m: ['...nn...', '..yyyy..', '...CC...', '...CC...', '...CC...', '...CC...', 'Y..CC..Y', '.Y.CC.Y.', 'kkkkkkkk'] },
  // Bastos · aguante
  garrote: { fam: 'bastos', m: ['...lll...', '..lllll..', '..lGlll..', '...llll..', '...lll...', '...lll...', '...lll...', '...lll...', '...yyy...'] },
  empalizada: { fam: 'bastos', m: ['n..n..n..n', 'nn.nn.nn.n', 'nn.nn.nn.n', 'NNNNNNNNNN', 'nn.nn.nn.n', 'nn.nn.nn.n', 'NNNNNNNNNN', 'nn.nn.nn.n'] },
  replica: { fam: 'bastos', m: ['.ggggggg.', 'gglllllgg', 'gllllllYg', 'gllllYYYg', 'glllllYlg', '.glllllg.', '..glllg..', '...ggg...'] },
  porra: { fam: 'bastos', m: ['ll.....ll', 'lll...lll', '.lll.lll.', '..lllll..', '...lll...', '..lllll..', '.yy...yy.', 'yy.....yy'] },
  aguante: { fam: 'bastos', m: ['ggggggggg', 'gGGgggGGg', 'ggggYgggg', 'gggYYYggg', 'ggggYgggg', '.ggggggg.', '..ggggg..', '...ggg...'] },
  // Oros · fortuna
  moneda: { fam: 'oros', m: ['..yyyyy..', '.yYYyyyy.', 'yYyRRRyyy', 'yyRRRRRyy', 'yyyRRRyyy', 'yyyyRyyyy', '.yyyyyyy.', '..yyyyy..'] },
  lluvia: { fam: 'oros', m: ['.yyy.....', 'yYyyy....', '.yyy..yyy', '.....yYyyy', '.yyy..yyy.', 'yYyyy.....', '.yyy......'].map((r) => r.slice(0, 9)) },
  taba: { fam: 'oros', m: ['.hhh..hhh.', 'hhhhhhhhhh', '.hhhhhhhh.', '..hhkkhh..', '..hhkkhh..', '.hhhhhhhh.', 'hhhhhhhhhh', '.hhh..hhh.'] },
  arcon: { fam: 'oros', m: ['.nnnnnnnn.', 'nnnnnnnnnn', 'yyyyyyyyyy', 'nnnnyynnnn', 'nnnnykynnn', 'nnnnnnnnnn', 'yyyyyyyyyy'] },
  envite: { fam: 'oros', m: ['...yyyy...', '..yYyyyy..', '...yyyy...', '.yyyyyyyy.', '.oooooooo.', '.yyyyyyyy.', '.oooooooo.', '.yyyyyyyy.'] },
  // Copas · brindis
  brindis: { fam: 'copas', m: ['Y..Y..Y..', 'RRRR.RRRR', 'RRRR.RRRR', '.RR...RR.', '..R...R..', '..R...R..', '.yyy.yyy.'] },
  porron: { fam: 'copas', m: ['....CC....', '....CC....', '...CCCC..C', '..CRRRRCC.', '.CRRRRRRC.', '.CRRRRRRC.', '..CCCCCC..'] },
  ronda: { fam: 'copas', m: ['CCC.CCC.CCC', 'CRC.CRC.CRC', 'CRC.CRC.CRC', 'CRC.CRC.CRC', 'CCC.CCC.CCC'] },
  caliz: { fam: 'copas', m: ['.R.R..R.', 'yyyyyyyy', 'RRRRRRRR', '.RRRRRR.', '..RRRR..', '...yy...', '...yy...', '.yyyyyy.'] },
  sobremesa: { fam: 'copas', m: ['..GG.....', '..GG.....', '.GGGG....', '.GGGG.RRR', '.GGGG.RRR', '.GGGG..R.', 'nnnnnnnnn', 'n.......n'] },
  // Duales
  hoja: { fam: 'espadas', duo: 'bastos', m: ['.......C.', '......CC.', '.....CC..', 'gggg.C...', 'gYYgC....', 'gYYgg....', 'gggg.....', '.gg......'] },
  filodorado: { fam: 'espadas', duo: 'oros', m: ['.......YY', '......YYy', '.....YYy.', '....YYy..', '...YYy...', '..yyy....', '.nyy.....', 'nn.......'] },
  sangria: { fam: 'espadas', duo: 'copas', m: ['.......CC', '......CCc', '.....CCc.', '....CCc..', '...RRR...', '..RRRRR..', '...RRR...', '....R....'] },
  peaje: { fam: 'bastos', duo: 'oros', m: ['......yyy', '.....yYyy', '......yyy', 'nnnnnnnnn', 'NyyNyyNyy', 'nnnnnnnnn', 'n.......n'] },
  fogon: { fam: 'bastos', duo: 'copas', m: ['..kkkkk..', '.kkkkkkk.', '..kkkkk..', '...Y.Y...', '..YRYRY..', '.YRRYRRY.', 'nnnnnnnnn', '.n.n.n.n.'] },
  convite: { fam: 'oros', duo: 'copas', m: ['.yyy..RR.', 'yYyyy.RR.', '.yyy..RR.', '.......y.', 'hhhhhhhhh', '.hhhhhhh.'] },
};

/** El mapa de un icono de Amuleto (22 × 22 celdas), o null si el id no tiene dibujo. */
export function amuletoMapa(id: string): string[] | null {
  const a = MOTIVO_AMULETO[id];
  return a ? conMotivo(marcoAmuleto(a.fam), a.m) : null;
}
/** El mapa de una Trampa del Bufón (22 × 22), o null. */
export function trampaMapa(id: string): string[] | null {
  const m = MOTIVO_TRAMPA[id];
  return m ? conMotivo(marcoTrampa(), m, -1) : null;
}
/** El mapa de una Bendición (22 × 25: el medallón y la corona de su Rey), o null. */
export function bendicionMapa(id: string): string[] | null {
  const b = MOTIVO_BENDICION[id];
  return b ? conMotivo(marcoBendicion(b.fam, b.duo), b.m, 1) : null;
}

const svg = (m: string[] | null, cls: string) => {
  if (!m) return '';
  const [w, h] = medida(m);
  return `<svg class="px icono ${cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects(m, T)}</svg>`;
};

/** El icono de un Amuleto (id de `TOOLS`). Cadena vacía si no existe. Clases: `.px .icono .ic-amuleto .fam-<familia>`. */
export const amuletoSvg = (id: string, cls = '') => svg(amuletoMapa(id), `ic-amuleto fam-${MOTIVO_AMULETO[id]?.fam ?? ''} ${cls}`);
/** El icono de una Trampa del Bufón (id de `SPECIAL`). Clases: `.px .icono .ic-trampa`. */
export const trampaSvg = (id: string, cls = '') => svg(trampaMapa(id), `ic-trampa ${cls}`);
/** El icono de una Bendición (id de `BENDICIONES`). Clases: `.px .icono .ic-bendicion .fam-<rey>`. */
export const bendicionSvg = (id: string, cls = '') => svg(bendicionMapa(id), `ic-bendicion fam-${MOTIVO_BENDICION[id]?.fam ?? ''}${MOTIVO_BENDICION[id]?.duo ? ' dual' : ''} ${cls}`);
