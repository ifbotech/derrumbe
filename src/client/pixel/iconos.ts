// V40 · fase 2b · Iconos pixel-art «sin línea» de las piezas: los 22 Amuletos (4 familias, una por Rey y palo), las 8
// Trampas del Bufón y las 26 Bendiciones de los Reyes. Cada icono es un marco de su familia (forma y tono) con un motivo
// dentro, en 40 × 40 celdas (las Bendiciones, 40 × 46 con la corona de su Rey encima). Sin contorno negro: el marco
// lleva su bisel (luz arriba a la izquierda, sombra abajo a la derecha), el motivo se dibuja al doble con su lado de
// sombra, y una sombra arrojada de hueso lo despega del campo de marfil. Se lee a 24 px (la silueta del marco) y a
// 48 px (el motivo).
//
//   Amuletos de Espadas: octógono de acero · de Bastos: cuadro de oliva con brotes · de Oros: moneda · de Copas: arco.
//   Trampas del Bufón: rombo de arlequín, mitad carmesí y mitad azul, con un cascabel.
//   Bendiciones: medallón redondo con la corona de su Rey encima (las Duales, con el medallón partido en dos tonos).
import { tintas } from './paleta';
import { Lienzo } from './pincel';
import { medida, rects, type Mapa } from './rejilla';

export type Familia = 'espadas' | 'bastos' | 'oros' | 'copas';
const T = tintas();
/** Lado del icono, en celdas. */
const N = 40;
const C = (N - 1) / 2;

type Forma = (dx: number, dy: number, m: number) => boolean;
const FORMA: Record<string, Forma> = {
  octogono: (dx, dy, m) => Math.abs(dx) <= C - m && Math.abs(dy) <= C - m && Math.abs(dx) + Math.abs(dy) <= 27 - m * 1.42,
  cuadro: (dx, dy, m) => {
    const r = 6;
    const ax = Math.abs(dx) - (C - m - r);
    const ay = Math.abs(dy) - (C - m - r);
    return Math.abs(dx) <= C - m && Math.abs(dy) <= C - m && (ax <= 0 || ay <= 0 || Math.hypot(ax, ay) <= r + 0.3);
  },
  circulo: (dx, dy, m) => Math.hypot(dx, dy) <= C + 0.4 - m,
  arco: (dx, dy, m) => Math.abs(dx) <= C - 1 - m && dy <= C - m && (dy >= -2 || Math.hypot(dx, dy + 2) <= C - 1 - m),
  rombo: (dx, dy, m) => Math.abs(dx) + Math.abs(dy) <= C + 1 - m * 1.42,
};

/** Tono de la banda de cada familia: [sombra, base, luz]. */
const BANDA: Record<Familia, [string, string, string]> = {
  espadas: ['B', 'b', 'c'],
  bastos: ['G', 'g', 'l'],
  oros: ['z', 'o', 'y'],
  copas: ['v', 'R', 'r'],
};
const FORMA_FAM: Record<Familia, string> = { espadas: 'octogono', bastos: 'cuadro', oros: 'circulo', copas: 'arco' };

/** Un marco: banda de cuatro celdas con bisel (luz arriba a la izquierda, sombra abajo a la derecha) y campo de marfil. */
function marco(l: Lienzo, forma: string, izq: [string, string, string], der: [string, string, string] = izq, oy = 0): void {
  const f = FORMA[forma];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = x - C;
      const dy = y - C;
      if (!f(dx, dy, 0)) continue;
      const t = x < C ? izq : der;
      l.set(x, y + oy, f(dx, dy, 4) ? 'w' : t[1]);
    }
  // bisel: la banda se aclara arriba a la izquierda y se ahonda abajo a la derecha
  const banda = izq[1] + der[1];
  for (const t of [izq, der]) {
    l.sombra(t[1], t[0], 1, 1, 1, banda + 'w');
    l.sombra(t[1], t[2], -1, -1, 1, banda + 'w' + izq[0] + der[0]);
  }
  // el campo, con su sombra interior arriba a la izquierda (la banda le hace sombra)
  l.sombra('w', 'm', -1, -1, 1, 'w');
}

/** El tono de sombra de cada letra (un paso abajo en su rampa). */
const SOMBRA: Record<string, string> = {
  Y: 'y', y: 'o', o: 'z', e: 'r', r: 'R', R: 'v', C: 'c', c: 'b', b: 'B', L: 'l', l: 'g', g: 'G', t: 'T', x: 'd', d: 'n', n: 'N', P: 'p', p: 's', w: 'h', u: 'J', J: 'j', j: 'i', h: 'J',
};

/** Coloca un motivo al doble en el centro del campo, con su lado de sombra y su sombra arrojada sobre el marfil. */
function conMotivo(l: Lienzo, motivo: Mapa, oy = 0): void {
  const [w, h] = medida(motivo);
  const x0 = Math.round((N - 2 * w) / 2);
  const y0 = Math.round((l.h - 2 * h) / 2) + oy;
  const m = new Lienzo(N, l.h);
  motivo.forEach((f, y) => [...f].forEach((k, x) => k !== '.' && k !== ' ' && m.rect(x0 + 2 * x, y0 + 2 * y, 2, 2, k)));
  // cada masa de color, con su sombra abajo a la derecha (contra lo que no es ella)
  // (solo las celdas que no son el canto de arriba a la izquierda: un trazo de dos celdas queda mitad luz, mitad sombra)
  const base = m.mapa();
  const es = (x: number, y: number, k: string) => base[y]?.[x] === k;
  for (let y = 0; y < l.h; y++)
    for (let x = 0; x < N; x++) {
      const k = base[y][x];
      if (k === '.' || !SOMBRA[k]) continue;
      if (!es(x + 1, y + 1, k) && es(x - 1, y - 1, k)) m.set(x, y, SOMBRA[k]);
    }
  // sombra arrojada sobre el campo de marfil
  const lleno = m.mapa();
  for (let y = 0; y < l.h; y++)
    for (let x = 0; x < N; x++) if (lleno[y]?.[x] === '.' && lleno[y - 1]?.[x - 1] && lleno[y - 1][x - 1] !== '.' && 'wm'.includes(l.get(x, y))) l.set(x, y, 'h');
  l.pegar(lleno, 0, 0);
}

// ── adornos de familia ──

/** Brotes de oliva en las esquinas de arriba del cuadro de Bastos. */
function brotes(l: Lienzo): void {
  for (const [x, s] of [[3, 1], [36, -1]] as [number, number][]) {
    l.elipse(x, 2, 2.2, 1.6, 'l');
    l.elipse(x + 3 * s, 1, 1.8, 1.4, 'L');
  }
}
/** Coronas de los Reyes, encima de su medallón. */
function corona(l: Lienzo, f: Familia, cx: number): void {
  const [o, b, c] = f === 'espadas' ? ['b', 'c', 'C'] : f === 'bastos' ? ['g', 'l', 'L'] : ['o', 'y', 'Y'];
  l.rect(cx - 7, 4, 15, 4, 'y').rect(cx - 7, 7, 15, 1, 'o');
  for (const dx of [-7, -1, 5]) {
    l.rect(cx + dx, 0, 3, 4, b);
    l.set(cx + dx, 0, c).set(cx + dx + 2, 3, o);
  }
  l.rect(cx - 1, 5, 2, 2, f === 'oros' ? 't' : 'r');
}

// ── motivos (≤ 12 × 12 celdas; conMotivo los dibuja al doble con su sombra) ──

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
  sacos: { fam: 'bastos', m: ['.nnnn..nnnn.', '.nnnnnnnnnn.', 'nnynnnnnnynn', '.nnnnnnnnnn.', 'nnnnnNNnnnnn', '.nnnnNNnnnn.', '.nnnnNNnnnn.', '..nnn..nnn..', '..nnn..nnn..', '...nn..nn...'] },
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
  lluvia: { fam: 'oros', m: ['.ooo.....', 'oyooo....', '.ooo..ooo', '.....oyooo', '.ooo..ooo.', 'oyooo.....', '.ooo......'].map((r) => r.slice(0, 9)) },
  taba: { fam: 'oros', m: ['.jjj..jjj.', 'jJjjjjjjjj', '.jjjjjjjj.', '..jjkkjj..', '..jjkkjj..', '.jjjjjjjj.', 'jjjjjjjjjj', '.jjj..jjj.'] },
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

/** El mapa de un icono de Amuleto (40 × 40 celdas), o null si el id no tiene dibujo. */
export function amuletoMapa(id: string): string[] | null {
  const a = MOTIVO_AMULETO[id];
  if (!a) return null;
  const l = new Lienzo(N, N);
  marco(l, FORMA_FAM[a.fam], BANDA[a.fam]);
  if (a.fam === 'bastos') brotes(l);
  conMotivo(l, a.m);
  return l.mapa();
}
/** El mapa de una Trampa del Bufón (40 × 40), o null. */
export function trampaMapa(id: string): string[] | null {
  const m = MOTIVO_TRAMPA[id];
  if (!m) return null;
  const l = new Lienzo(N, N);
  marco(l, 'rombo', ['v', 'R', 'r'], ['T', 't', 'c']);
  conMotivo(l, m, -1);
  // el cascabel en la punta de abajo
  l.elipse(C + 0.5, N - 3.5, 2.6, 2.6, 'y');
  l.sombra('y', 'o', 1, 1, 1, 'yo');
  l.set(Math.round(C), N - 5, 'Y');
  return l.mapa();
}
/** El mapa de una Bendición (40 × 46: el medallón y la corona de su Rey), o null. */
export function bendicionMapa(id: string): string[] | null {
  const b = MOTIVO_BENDICION[id];
  if (!b) return null;
  const l = new Lienzo(N, N + 6);
  marco(l, 'circulo', BANDA[b.fam], b.duo ? BANDA[b.duo] : BANDA[b.fam], 6);
  corona(l, b.fam, b.duo ? 13 : 20);
  if (b.duo) corona(l, b.duo, 27);
  conMotivo(l, b.m, 3);
  return l.mapa();
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
