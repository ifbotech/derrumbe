// Los números del balance, en un solo archivo de datos: `balance-config.json`. Aquí se declaran sus tipos,
// qué campos puede mover el afinador (`npm run balance:tune`) y cómo se escriben las cifras en los textos.
// El motor (engine, run, tools, specials) lee de `BALANCE`; ningún número que se afina vive en su código.
// Las descripciones con cifras son plantillas con `{campo}` que se rellenan con estos mismos números
// (`fill`), para que texto y valor no se separen nunca.
import raw from './balance-config.json';

/** Base de una formación: f Daño, r Multi, y lo que gana por nivel de Pergamino (lf, lr). */
export interface FormBase {
  f: number;
  r: number;
  lf: number;
  lr: number;
}
/** Vida, Ataque y mano por rango (11 Sota, 12 Reina, 13 Rey) o por número de jugadores. */
type PorClave = Record<string, number>;
/** Lo que hace una carta especial (ver `Fx` en specials.ts). */
export interface FxConfig {
  flat?: number;
  flatPerCard?: number;
  wallForce?: number;
  highDouble?: boolean;
  allHigh?: boolean;
  allAdv?: boolean;
  strikeMult?: number;
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
  inicio: { vida: number; oro: number; interesTope: number; sobre: number };
  /** Los ocho asaltos: multiplicador de la Vida de los guardias y Ataque que se suma al base. */
  asaltos: { hp: number; threat: number }[];
  /** Trono infinito: la Vida crece ×hpCrece por cada asalto más allá del octavo. */
  tronoInfinito: { hpCrece: number };
  /** Vida de los guardias según el tamaño de la conjura (1 a 4 jugadores); también retrasa el Asedio final. */
  cuadrilla: number[];
  /** Giros de los Reinados 2, 3, 5, 6 y 7 (el 8 es `clausura`). */
  reinados: { corazas: number; impuesto: number; reyColerico: number; heridasViejas: number; guardiaNoche: number };
  /** Asedio final: turno en que empieza (en solitario), cada cuántos sube y Multi que da cada nivel. */
  asedio: { start: number; every: number; res: number };
  /** Reinado 8 «Puertas selladas»: asaltos en los que sube el Ataque de los cuatro tronos, y cuánto. */
  clausura: { stages: number[]; threat: number };
  /** Anillo de sello: cartas que sella al empezar cada asalto. */
  timbre: { stamps: number };
  /** Cifras de los decretos de los monarcas. */
  monarcas: {
    doble: { contraataques: number; ataque: number };
    escasez: { cartas: number };
    intemperie: { escudoTope: number };
    blindaje: { ataque: number };
    furia: { ataque: number };
    inestable: { antes: number; vida: number };
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
  cobro: { asalto: number; exactosTope: number; vidaCada: number; interesCada: number; curaTrasAsalto: number; sinSeleccion: number };
  /** Mejoras de la Orden: Coronas de cada nivel, y oro inicial por nivel de la Bolsa. */
  orden: { costes: Record<string, number[]>; oroPorNivel: number };
  /** Lo que suma o quita cada baraja inicial. */
  barajas: {
    acero: { vida: number };
    prestamista: { oro: number; interes: number; vida: number };
    ases: { vida: number };
    corta: { oro: number; vida: number };
    caos: { especiales: number };
  };
  formaciones: Record<string, FormBase>;
  /** La mesa por defecto (DEFAULT_CONFIG del motor). */
  mesa: { maxIntegrity: number; wallCap: number; collapseLoss: number; wallDiv: number; repairDiv: number; shardDiv: number; floorHp: PorClave; floorThreat: PorClave; handSize: PorClave };
  /** Racha de Golpes exactos, Brecha, En guardia, onda del Golpe exacto y su oro. */
  golpe: { racha: number; brecha: number; enGuardia: number; onda: number; oroExacto: number };
  acabados: { forjado: number; templado: number; policromado: number; agrietado: number; agrietadoRompe: number };
  sellos: { jornal: number };
  /** Asalto único (partida clásica): lo que cambia sobre la mesa por defecto. */
  clasica: {
    obra: { floorHp: PorClave; floorThreat: PorClave; handSize: PorClave; fatigueStart: number; fatigueEvery: number; fatigueRes: number; collapseRelief: number[] };
    brutal: { maxIntegrity: number; collapseLoss: number };
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
  { ruta: 'asedio.start', entero: true },
  { ruta: 'asedio.res', entero: false },
  { ruta: 'reinados.corazas', entero: false },
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
