// Los números del balance, en un solo archivo de datos: `balance-config.json`. Aquí se declaran sus tipos,
// qué campos puede mover el afinador (`npm run balance:tune`) y cómo se escriben las cifras en los textos.
// El motor (engine, run, tools, specials) lee de `BALANCE`; ningún número que se afina vive en su código.
// Las descripciones con cifras son plantillas con `{campo}` que se rellenan con estos mismos números
// (`fill`), para que texto y valor no se separen nunca.
import raw from './balance-config.json';

/** Base de una formación: f Daño, r Multi (entero) y el Daño que gana por nivel de Pergamino (lf). */
export interface FormBase {
  f: number;
  r: number;
  lf: number;
}
/** Vida, Ataque y mano por rango (10 Sota, 11 Caballo, 12 Rey) o por número de jugadores. */
type PorClave = Record<string, number>;
/** Lo que hace una carta especial (ver `Fx` en specials.ts). */
export interface FxConfig {
  flat?: number;
  flatPerCard?: number;
  wallForce?: number;
  highDouble?: boolean;
  allHigh?: boolean;
  /** Este golpe no respeta Inmune. */
  noImmune?: boolean;
  /** Multiplica el Multi del golpe (entero). */
  strikeMult?: number;
  /** Suma al Multi del golpe (entero). */
  multi?: number;
  pierce?: boolean;
  wall?: number;
  wallPerCard?: number;
  heal?: number;
  hurt?: number;
  splash?: number;
  noSiren?: boolean;
  draw?: number;
  disarm?: boolean;
  gold?: number;
  goldOnKill?: number;
}

export interface BalanceConfig {
  /** Campaña nueva: Vida máxima, oro, tope de interés y cartas del Sobre lacrado inicial. */
  inicio: { vida: number; oro: number; interesTope: number; sobre: number; donOro: number };
  /** Los cinco asaltos: multiplicador de la Vida de los guardias (redondeada a 5) y Ataque que se suma al base. */
  asaltos: { hp: number; threat: number }[];
  /** Trono infinito: la Vida crece ×hpCrece por cada asalto más allá del quinto. */
  tronoInfinito: { hpCrece: number };
  /** Vida de los guardias según el tamaño de la conjura (1 a 4 jugadores); también retrasa el Asedio final. */
  cuadrilla: number[];
  /** Giros de los Reinados 2, 3, 5, 6 y 7 (el 8 es `clausura`). */
  reinados: { corazas: number; furia: number; reyesAcorazados: number; reyColerico: number; heridasViejas: number; guardiaNoche: number };
  /** V35 · Furia: lo que sube con cada Mazo agotado, lo que sube cada turno del monarca y por cuánto se multiplica la Vida del monarca. */
  furia: { mazo: number; rey: number; jefeVida: number };
  /** Reinado 8 «Puertas selladas»: asaltos en los que sube el Ataque de todos los tronos, y cuánto. */
  clausura: { stages: number[]; threat: number };
  /** Anillo de sello: cartas que sella al empezar cada asalto. */
  timbre: { stamps: number };
  /** Cifras de los decretos de los monarcas. */
  monarcas: {
    doble: { contraataques: number; ataque: number };
    escasez: { cartas: number; ataque: number };
    intemperie: { escudoTope: number };
    furia: { ataque: number };
    inestable: { furia: number; vida: number };
    /** V35 · lo que quita cada ♥ jugada contra la Dama del Cáliz. */
    sequia: { veneno: number };
    /** V35 · cuánto Ataque de menos tienen los guardias del Inquisidor (sin Aturdido el duelo se le hace largo). */
    blindaje: { ataque: number };
  };
  /** Precios de La Taberna. */
  taberna: {
    rarezas: Record<'comun' | 'oficio' | 'capataz' | 'reliquia', { cost: number; weight: number }>;
    /** Reliquias en oferta (más las del Puesto grande). */
    reliquias: number;
    sobre: number;
    sobreCiego: number;
    mesaLacre: number;
    pergamino: { base: number; porNivel: number };
    hoguera: { base: number; paso: number };
    curar: { base: number; paso: number; vida: number };
    renovar: { base: number; paso: number };
  };
  /** Oro al ganar un asalto, y la Vida que se recupera después. */
  cobro: { asalto: number; vidaCada: number; interesCada: number; curaTrasAsalto: number; sinSeleccion: number };
  /**
   * Árbol de la Conjura (V12, sustituye a `orden`): esquirlas de cada rango de los nodos de combate (`costes`),
   * base de coste de los incrementales (rango r: base × crece^(r−1), a dos cifras significativas), oro inicial
   * por rango de la Bolsa de la conjura y la cifra por rango de cada nodo (`cifras`, ver `cifraDe` en arbol.ts).
   */
  arbol: { oroPorNivel: number; costes: Record<string, number[]>; bases: Record<string, number>; crece: number; cifras: Record<string, number> };
  /** Lo que cae a la mesa (V12): esquirlas por golpe, guardia, Golpe exacto y monarca; moneda por guardia; gotas; imán. */
  caida: { esquirlaGolpe: number; esquirlaGuardia: number; esquirlaExacto: number; esquirlaMonarca: number; oroGuardia: number; gotaExacto: number; gotasPorSello: number; formacionCartas: number; imanSegundos: number; maxPiezas: number };
  /** Caras de los dados de hueso (enteras): el Dado de oro y el Dado de la Corona. */
  huesos: { oro: number[]; corona: number[] };
  /**
   * V40 · Los 5 Mazos (ver src/rules/mazos.ts): las bases de sus formaciones propias (Par de palo del Truco, Quince de
   * la Escoba) y las cifras de cada regla. `vida`: lo que el Mazo suma o quita a la Vida inicial; `mano`, al tamaño de la mano.
   */
  mazos: {
    formaciones: Record<'parpalo' | 'quince', FormBase>;
    truco: { vida: number; mano: number; bravo: Record<'S1' | 'C1' | 'S7' | 'D7', number>; envido: number };
    escoba: { vida: number; mano: number; multi: number; carga: number };
    chinchon: { vida: number; mano: number; pierna: number; escalera: number; cartas: number; carga: number; alivio: number };
    mentiroso: { vida: number; mano: number; comodines: number; dano: number; furia: number };
    chancho: { vida: number; mano: number; cadena: number; turnos: number; dano: number };
  };
  formaciones: Record<string, FormBase>;
  /** La mesa por defecto (DEFAULT_CONFIG del motor). */
  mesa: { maxIntegrity: number; wallCap: number; collapseSiege: number; escudoPorCarta: number; curaPorCarta: number; salpicaPorCarta: number; floorHp: PorClave; floorThreat: PorClave; handSize: PorClave };
  /** Racha de Golpes exactos (Multi por eslabón y tope de eslabones), Expuesto (×Daño), onda del Golpe exacto y su oro. */
  golpe: { racha: number; rachaTope: number; expuesto: number; onda: number; oroExacto: number };
  acabados: { forjado: number; templado: number; policromado: number; agrietado: number; agrietadoRompe: number };
  sellos: { jornal: number };
  /** V35 · Cifras de los bonos de cada rasgo de build (con 2, 4 y 6 Reliquias). */
  rasgos: {
    sangre: { vida: number; cada: number; multi: number; x: number };
    tahur: { oro: number; x: number };
    verdugo: { pct: number; pct2: number; dano: number };
    bastion: { escudo: number; dano: number; dano2: number; tope: number };
    horda: { multi: number; cartas: number };
  };
  /** Asalto único (partida clásica): lo que cambia sobre la mesa por defecto. */
  clasica: {
    obra: { floorHp: PorClave; floorThreat: PorClave; handSize: PorClave; collapseSiege: number; cuadrilla: number[]; fatigueStart: number; fatigueEvery: number };
    brutal: { maxIntegrity: number; collapseSiege: number };
  };
  /** Cifras de cada reliquia, por `id`. */
  reliquias: Record<string, Record<string, number>>;
  /** Efecto de cada carta especial, por `id`. */
  especiales: Record<string, FxConfig>;
}

/** Los números del balance. Lo que lee el motor; se puede leer, no se debe escribir fuera del afinador. */
export const BALANCE: BalanceConfig = raw as BalanceConfig;

/** Cifras de una reliquia (vacío si no tiene). */
export const relic = (id: string): Record<string, number> => BALANCE.reliquias[id] ?? {};

/** Un número como lo lee el jugador: coma decimal y como mucho dos decimales («0,15», «1,5», «12»). */
export function num(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

/** Rellena una plantilla: cada `{clave}` se cambia por su número (con `num`) o su texto. Falla si falta una clave. */
export function fill(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = values[k];
    if (v === undefined) throw new Error(`plantilla «${template}»: falta el valor «${k}»`);
    return typeof v === 'number' ? num(v) : v;
  });
}

/** Idioma de un texto (el mismo `Lang` de src/shared/i18n.ts; aquí sin importarlo, para que las reglas no dependan de shared). */
export type Lengua = 'es' | 'en';

/**
 * Un número como lo lee el jugador en ese idioma: en español coma decimal («1,5»), en inglés punto
 * («1.5»); como mucho dos decimales en los dos. En español sale igual que `num`.
 */
export function numFor(lang: Lengua, n: number): string {
  const s = String(Math.round(n * 100) / 100);
  return lang === 'es' ? s.replace('.', ',') : s;
}

/** `fill` en un idioma: las cifras con `numFor(lang, …)`. En español sale idéntico a `fill`. Falla si falta una clave. */
export function fillFor(lang: Lengua, template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = values[k];
    if (v === undefined) throw new Error(`plantilla «${template}»: falta el valor «${k}»`);
    return typeof v === 'number' ? numFor(lang, v) : v;
  });
}

/** Un campo que el afinador puede mover, por su ruta en el JSON (`asaltos.0.hp`). */
export interface Afinable {
  ruta: string;
  /** Entero (se mueve de uno en uno) o real (se redondea a `paso`). */
  entero: boolean;
  /** Para los reales: la precisión del redondeo (0,01 por defecto). */
  paso?: number;
}

/**
 * Los campos que busca `npm run balance:tune`, siempre dentro de ±15 % de su valor de partida. Son las
 * palancas de dureza y ritmo de la campaña: los precios y las cifras de las reliquias no entran (sus
 * objetivos son de cada pieza y los mide solo el informe completo).
 */
export const AFINABLES: Afinable[] = [
  ...BALANCE.asaltos.map((_, i): Afinable => ({ ruta: `asaltos.${i}.hp`, entero: false })),
  ...BALANCE.asaltos.map((_, i): Afinable => ({ ruta: `asaltos.${i}.threat`, entero: true })),
  { ruta: 'furia.jefeVida', entero: false, paso: 0.1 },
  { ruta: 'reinados.corazas', entero: false },
  { ruta: 'reinados.reyesAcorazados', entero: false },
  { ruta: 'cuadrilla.1', entero: false },
  { ruta: 'cuadrilla.2', entero: false },
  { ruta: 'cuadrilla.3', entero: false },
  { ruta: 'inicio.vida', entero: true },
];

/** Lee un número por su ruta (`asaltos.0.hp`). Falla si la ruta no lleva a un número. */
export function getPath(cfg: unknown, ruta: string): number {
  const v = ruta.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), cfg);
  if (typeof v !== 'number') throw new Error(`«${ruta}» no es un número de balance-config.json`);
  return v;
}

/** Escribe un número por su ruta, en el sitio (la ruta tiene que existir y ser un número). */
export function setPath(cfg: unknown, ruta: string, value: number): void {
  getPath(cfg, ruta);
  const keys = ruta.split('.');
  const last = keys.pop()!;
  const parent = keys.reduce<Record<string, unknown>>((o, k) => o[k] as Record<string, unknown>, cfg as Record<string, unknown>);
  parent[last] = value;
}
