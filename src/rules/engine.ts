// Motor de reglas puro (sin dependencias, determinista con semilla).
// Lo usan el servidor (autoridad), el cliente (validar y previsualizar jugadas), el bot y los tests.
//
// Cada golpe se resuelve en dos ejes, de izquierda a derecha:
//
//     Golpe = Daño × Multi      (en el código: fuerza × res; los dos, siempre enteros)
//
// La formación pone la base; cada carta suma su Daño (0 contra el trono de su palo: Inmune); acabados,
// sellos de lacre, Trampas del Bufón y Amuletos suman Daño, suman Multi o lo multiplican, en ese orden.
// Al final, si el trono estaba Expuesto, el Daño se multiplica.
// Cada aportación sale en el flujo de eventos como un `step`, para que el cliente la anime.
import { BALANCE, fill } from './balance-config';
import { MAX_SPECIALS, SPECIAL } from './specials';
import { ENGANO_MODOS, MZ, REGLA, bravoDe, enganoCambia, enganoCartas, esEnvido, esEscoba, formacionMazo } from './mazos';
import type { Cargas, EnganoEstado, EnganoModo, MazoId } from './mazos';
import { TOOL, espejada } from './tools';
import { BENDICION, REY_NOMBRE, dadoSalva, fuentesDe, nivelesAfter, nivelesReyes, nivelesStrike, usaDado } from './reyes';
import type { BendInst, ReyId } from './reyes';
import type { ToolInst } from './tools';

// ───────────────────────── Cartas ─────────────────────────

export type Suit = 'S' | 'D' | 'H' | 'C';
export type CardSuit = Suit | 'X'; // X = comodín o carta especial
export type Seal = 'dinamita' | 'eco' | 'jornal' | 'sindical';
export type Treatment = 'forjado' | 'templado' | 'policromado' | 'agrietado';

export interface Card {
  id: string;
  suit: CardSuit;
  rank: number; // 0 comodín / especial · 1-9 numerales (baraja española, sin 10) · 10-12 figuras (Sota, Caballo, Rey)
  /** Carta especial (campaña): id en SPECIAL. */
  sp?: string;
  /** Sello de obra estampado en la carta. */
  seal?: Seal;
  /** Tratamiento del material de la carta. */
  tr?: Treatment;
}

export const SUITS: Suit[] = ['S', 'D', 'H', 'C'];
/**
 * V40 · baraja española. Los códigos internos de palo no cambian: S = Espadas, C = Bastos, D = Oros y H = Copas,
 * con sus mismos poderes. Este es el único sitio donde las reglas escriben el nombre de un palo; la interfaz lo pide
 * con `paloNombre` (o la clave `palo.<S|C|D|H>` del diccionario) y pinta la pinta (el dibujo del palo) por su cuenta.
 */
export const PALO_NOMBRE: Record<Suit, string> = { S: 'Espadas', D: 'Oros', H: 'Copas', C: 'Bastos' };
/** Nombre del palo en mayúsculas, tal como se escribe en la mesa («Contraataque de ESPADAS»). */
export const MATERIAL: Record<Suit, string> = { S: 'ESPADAS', D: 'OROS', H: 'COPAS', C: 'BASTOS' };
/** El nombre de un palo para leer («Espadas»); con `mayus`, como en la mesa («ESPADAS»). */
export const paloNombre = (s: Suit, mayus = false): string => (mayus ? MATERIAL[s] : PALO_NOMBRE[s]);

/** V40 · las cartas jugables van del 1 (el As) al 9: la baraja española de 36 más los Comodines, sin 10 numerado. */
export const MAX_NUM = 9;
/** V40 · las figuras de la Corte, que son los enemigos: 10 Sota, 11 Caballo y 12 Rey (también por dentro). */
export const SOTA = 10;
export const CABALLO = 11;
export const REY = 12;
export const FIGURAS: readonly number[] = [SOTA, CABALLO, REY];
/** ¿Es una figura de la Corte (un enemigo) y no una carta jugable? */
export const esFigura = (rank: number): boolean => rank >= SOTA;
/** Dónde se pone el As cuando enlaza por arriba en una escalera (8-9-1): justo detrás del 9. */
export const AS_ALTO = MAX_NUM + 1;
/** Índice de cada rango tal como se lee: ★ el Comodín, 1 a 9 las numeradas y 10, 11 y 12 las figuras. */
export const RANK_LABEL = ['★', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
/** Nombre de cada figura de la Corte. */
export const FIGURA_NOMBRE: Record<number, string> = { [SOTA]: 'Sota', [CABALLO]: 'Caballo', [REY]: 'Rey' };

export const SEALS: Seal[] = ['dinamita', 'eco', 'jornal', 'sindical'];
export const SEAL: Record<Seal, { name: string; desc: string }> = {
  dinamita: { name: 'Sello de pólvora', desc: 'Al golpear, los tronos al lado del golpeado en la mesa reciben el valor de esta carta.' },
  eco: { name: 'Sello de eco', desc: 'Su Daño y el poder de su palo cuentan 2 veces.' },
  jornal: { name: 'Sello de oro real', desc: fill('+{oro} de oro si el golpe abate a un guardia.', { oro: BALANCE.sellos.jornal }) },
  sindical: { name: 'Sello de la manga', desc: 'Robás 1 carta extra al jugarla o descartarla.' },
};
export const TREATMENTS: Treatment[] = ['forjado', 'templado', 'policromado', 'agrietado'];
export const TREATMENT: Record<Treatment, { name: string; desc: string }> = {
  forjado: { name: 'Filo de plata', desc: fill('+{n} de Daño.', { n: BALANCE.acabados.forjado }) },
  templado: { name: 'Templado', desc: fill('+{n} de Multi.', { n: BALANCE.acabados.templado }) },
  policromado: { name: 'Lacre policromo', desc: fill('×{n} de Multi.', { n: BALANCE.acabados.policromado }) },
  agrietado: { name: 'Cristal maldito', desc: fill('×{n} de Multi, pero 1 de cada {cada} veces la carta se hace añicos.', { n: BALANCE.acabados.agrietado, cada: 1 / BALANCE.acabados.agrietadoRompe }) },
};

/** Valor de una carta para el Daño y los poderes. El As es la carta fuerte: vale 11 (más que el 9, la más alta). */
export const cardValue = (c: Card): number => (c.rank === 1 ? 11 : c.rank);
/** Etiqueta de una carta en la cuenta: «7 de Espadas», «Comodín» o el nombre de la especial. */
export const cardLabel = (c: Card): string => (c.sp ? (SPECIAL[c.sp]?.name ?? '?') : c.suit === 'X' ? 'Comodín' : `${RANK_LABEL[c.rank]} de ${PALO_NOMBRE[c.suit]}`);
/** Orden estable de lectura (palo y número): sirve para mostrar montones sin revelar su orden real. */
export function sortCards(cards: Card[]): Card[] {
  const suit = 'SDHCX';
  return [...cards].sort((a, b) => Number(!!a.sp) - Number(!!b.sp) || suit.indexOf(a.suit) - suit.indexOf(b.suit) || a.rank - b.rank || a.id.localeCompare(b.id));
}

// ───────────────────────── Formaciones ─────────────────────────

export type Formation = 'solo' | 'compania' | 'grupo' | 'doblepar' | 'escalera' | 'color' | 'full' | 'poker' | 'escaleracolor' | 'parpalo' | 'quince';
export const FORMATIONS: Formation[] = ['solo', 'compania', 'grupo', 'escalera', 'doblepar', 'color', 'full', 'escaleracolor', 'poker'];
export const FORMATION_NAME: Record<Formation, string> = {
  solo: 'Carta sola',
  compania: 'As cómplice',
  grupo: 'Grupo',
  doblepar: 'Doble par',
  escalera: 'Escalera',
  color: 'Color',
  full: 'Full',
  poker: 'Póker',
  escaleracolor: 'Escalera de color',
  parpalo: 'Par de palo',
  quince: 'Quince',
};
/** V40 · Formaciones propias de un Mazo (no salen en el Pergamino): Par de palo (Truco) y Quince (Escoba). */
export const FORMACIONES_MAZO: Formation[] = ['parpalo', 'quince'];
/** Base de cada formación (f Daño, r Multi entero) y el Daño que gana por nivel de Pergamino (lf): `formaciones` de balance-config.json. */
export const FORM: Record<Formation, { f: number; r: number; lf: number }> = BALANCE.formaciones as Record<Formation, { f: number; r: number; lf: number }>;
/** V40 · Base de las formaciones de Mazo (`mazos.formaciones` de balance-config.json). */
export const FORM_MAZO: Partial<Record<Formation, { f: number; r: number; lf: number }>> = MZ.formaciones;
/** Base de cualquier formación, también las de Mazo. */
export const baseDe = (f: Formation): { f: number; r: number; lf: number } => FORM[f] ?? FORM_MAZO[f]!;

/**
 * Devuelve el tipo de formación o null si las cartas no forman una jugada legal de ataque.
 *  solo · as de compañía (un As con cualquier otra carta) · grupo (2-3 iguales) · póker (4 iguales)
 *  doble par · full (trío + par)
 *  escalera (3+ seguidas) · escalera de color (3+ seguidas del mismo palo) · color (5+ del mismo palo)
 * El As enlaza por abajo (1-2-3) y por arriba (8-9-1). Las cartas especiales no cuentan para la
 * formación: acompañan al golpe (hasta MAX_SPECIALS) o se juegan solas.
 * V40 · con `cfg` (la mesa), el Mazo de la campaña acepta además su formación propia (ver `formacionMazo`).
 */
export function classify(all: Card[], cfg?: { mazo?: MazoId }): Formation | null {
  const base = clasifica(all);
  if (base || !cfg?.mazo) return base;
  const specials = all.filter((c) => c.sp);
  return specials.length > MAX_SPECIALS ? null : formacionMazo(cfg.mazo, all.filter((c) => !c.sp));
}

/** Las formaciones de siempre (sin las de Mazo). */
function clasifica(all: Card[]): Formation | null {
  const specials = all.filter((c) => c.sp);
  const cards = all.filter((c) => !c.sp);
  if (specials.length > MAX_SPECIALS) return null;
  const n = cards.length;
  if (n === 0) return specials.length ? 'solo' : null;
  if (cards.some((c) => c.suit === 'X')) return null;
  if (n === 1) return 'solo';
  const sameSuit = cards.every((c) => c.suit === cards[0].suit);
  if (cards.every((c) => c.rank === cards[0].rank)) return n >= 4 ? 'poker' : 'grupo';
  if (n === 2 && cards.some((c) => c.rank === 1)) return 'compania';
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
  const seq = (rs: number[]) => rs.every((r, i) => i === 0 || r === rs[i - 1] + 1);
  const high = cards.map((c) => (c.rank === 1 ? AS_ALTO : c.rank)).sort((a, b) => a - b);
  if (n >= 3 && (seq(ranks) || seq(high))) return sameSuit ? 'escaleracolor' : 'escalera';
  const counts = [...new Set(ranks)].map((r) => ranks.filter((x) => x === r).length).sort();
  if (n === 4 && counts.join() === '2,2') return 'doblepar';
  if (n === 5 && counts.join() === '2,3') return 'full';
  if (n >= 5 && sameSuit) return 'color';
  return null;
}

// ───────────────────────── Configuración y estado ─────────────────────────

export interface Config {
  maxIntegrity: number;
  wallCap: number;
  /** V35 · Mazo agotado: el Descarte se baraja sin quitar Vida y la Furia del asalto sube esto (a la vista en el ⚔ del enemigo). */
  collapseSiege: number;
  /** Mazos agotados por asalto que no suben la Furia (Baraja de reserva). */
  collapseFree?: number;
  /** V35 · El orden en que se asaltan las Casas (los tronos del asalto): se combate solo la primera que quede en pie. */
  orden?: Suit[];
  /**
   * V35 · El monarca del asalto: el último guardia de la Casa `suit`. Su Vida se multiplica por `vida` y, mientras es
   * el enemigo activo, la Furia sube `furia` al acabar cada turno (la «Furia del Rey»).
   */
  jefe?: {
    suit: Suit;
    vida: number;
    furia: number;
    /** V40 1c · El Rey jefe (src/rules/reyes.ts) y su rasgo de combate: lo que su Contraataque atraviesa del Escudo
     *  (Espadas), que no queda Expuesto ni Aturdido (Bastos), las caras del dado que suma a su Contraataque (Oros), lo
     *  que se cura cada turno al frente (Copas). */
    rey?: ReyId;
    perfora?: number;
    sinFx?: true;
    dado?: number;
    cura?: number;
    /** Ataque de más (o de menos) del jefe sobre el de su rango (el Rey del asalto 2 ocupa el sitio del Caballo). */
    ataque?: number;
  };
  /** V35 · Furia con la que empieza el asalto (decreto del Relojero). */
  furiaInicial?: number;
  /** El enemigo que quede con esta fracción de su Vida o menos, cae (0,1 = 10 %; Remate del Rey de Espadas). */
  ejecuta?: number;
  /** Toda ejecución cuenta como Golpe exacto. */
  ejecutaExacta?: boolean;
  /** Escudo con el que empieza el asalto (Bendiciones y nivel de Bastos). */
  wallStart?: number;
  /** Poderes de palo, por carta (sea cual sea su rango): Escudo por cada Basto, Cura por cada Copa y Salpica por cada Oro. */
  escudoPorCarta: number;
  curaPorCarta: number;
  salpicaPorCarta: number;
  floorHp: Record<number, number>;
  floorThreat: Record<number, number>;
  handSize: Record<number, number>;
  /** Cartas que voltea la sirena cada turno (1 por defecto). */
  sirenCount?: number;
  /** Lo que multiplica una carta contra el trono de su palo (0 por defecto: Inmune). */
  ownMult?: number;
  /** Margen del golpe limpio: el piso cae y cuenta como limpio a ±cleanTol de su resistencia. */
  cleanTol?: number;
  /** Gracia del Golpe exacto por arriba (V12, Buen ojo): también es exacto si el Daño se pasa por cleanTol + cleanOver o menos. */
  cleanOver?: number;
  /** V40 1d · Facón de plata: el guardia que cae de un solo golpe (sin Daño de antes) de hasta tantas cartas, cae con Golpe exacto. */
  deUnGolpe?: number;
  /** Todo golpe perfora, lleve o no Espadas. */
  alwaysPierce?: boolean;
  /** Niveles de plano por formación. */
  formLevel?: Partial<Record<Formation, number>>;
  /** Lo que multiplica el Daño de un golpe contra un trono Expuesto (`golpe.expuesto` por defecto; el Caldero lo sube). */
  expuestoMult?: number;
  /** Los golpes de 3 palos o más también dejan Expuesto (Caldero). */
  polyExpuesto?: boolean;
  /** Ningún trono queda en ese estado (true: en ninguno). El decreto del Inquisidor quita Aturdido. */
  noFx?: boolean | keyof TowerFx;
  /** Los sellos de las cartas se activan dos veces. */
  sealTwice?: boolean;
  /** Las cartas descartadas se agotan (no vuelven esta obra) y cargan Fuerza para el próximo golpe. */
  discardExhaust?: number;
  /** Huecos de andamio: cartas que cada jugador puede guardar aparte de su mano (1 por defecto). */
  reserveSize?: number;
  /**
   * Reloj de turnos (solo la partida clásica): desde este turno, y cada `fatigueEvery` turnos, la Furia sube 1.
   * Sin definir (la campaña), la Furia solo sube por los Mazos agotados y por los turnos del monarca.
   */
  fatigueStart?: number;
  fatigueEvery?: number;
  /** V35 · Asalto único: la Vida de los guardias ×cuadrilla[jugadores − 1] (redondeada a 5: el Golpe exacto vive de esas cifras). */
  cuadrilla?: number[];
  /** Fuerza que se guarda para el próximo golpe por cada punto reparado de más con el búnker lleno. */
  overhealCharge?: number;
  /** Puntos de muro sobrante (por encima del tope) que hacen falta para reparar 1 de integridad. */
  overwallRepair?: number;
  /** V40 · El Mazo de la campaña: sus reglas se suman a las de siempre (src/rules/mazos.ts). Sin él, ninguna. */
  mazo?: MazoId;
}

/** Furia que corresponde a un turno por el reloj de turnos (0 si la mesa no lo tiene). */
export function fatigueAt(cfg: Config, turnCount: number): number {
  if (cfg.fatigueStart === undefined || turnCount < cfg.fatigueStart) return 0;
  return 1 + Math.floor((turnCount - cfg.fatigueStart) / Math.max(1, cfg.fatigueEvery ?? 2));
}

/** La mesa por defecto: `mesa` de balance-config.json (copiada: quien la toque no cambia el archivo). */
export const DEFAULT_CONFIG: Config = structuredClone(BALANCE.mesa);

export type Difficulty = 'obra' | 'brutal';
/** Partida clásica (una obra). Balanceado por simulación (npm run simulate): el bot gana ~60 % en OBRA y ~40 % en BRUTAL. */
const OBRA: Config = { ...DEFAULT_CONFIG, ...structuredClone(BALANCE.clasica.obra) };
export const DIFFICULTY: Record<Difficulty, Config> = {
  obra: OBRA,
  brutal: { ...OBRA, ...BALANCE.clasica.brutal },
};

/** Los dos estados de un trono (los deja la mezcla de palos del golpe, el Motín o El Espía). */
export interface TowerFx {
  /** Expuesto: el próximo golpe contra él hace ×`golpe.expuesto` de Daño. */
  fractura?: boolean;
  /** Aturdido: se salta su próximo Contraataque. */
  sobrecarga?: boolean;
}
export const TOWER_FX: Record<keyof TowerFx, { name: string; desc: string }> = {
  fractura: { name: 'Expuesto', desc: fill('El próximo golpe contra este trono hace ×{n} de Daño.', { n: BALANCE.golpe.expuesto }) },
  sobrecarga: { name: 'Aturdido', desc: 'Este trono se salta su próximo Contraataque.' },
};

export interface Tower {
  suit: Suit;
  /** Pisos restantes; el índice 0 es el piso activo. */
  floors: number[];
  damage: number;
  fx: TowerFx;
  /** No está en este asalto (los asaltos 1 y 2 tienen 2 y 3 tronos): sin guardias, no cuenta para ganar y su Contraataque no hace nada. */
  away?: true;
  /** V40 · El Mentiroso, Cara de piedra: el próximo Contraataque de este guardia no llega (sin quedar Aturdido). */
  piedra?: true;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  /** El andamio: cartas guardadas aparte de la mano. Se juegan como si estuvieran en ella. */
  reserve: Card[];
}

export type Phase = 'playing' | 'won' | 'lost';

export interface GameState {
  config: Config;
  rng: number;
  players: Player[];
  deck: Card[];
  discard: Card[];
  towers: Record<Suit, Tower>;
  integrity: number;
  wall: number;
  turn: number;
  turnCount: number;
  collapses: number;
  /** V35 · Furia del Rey: lo que ha subido la Furia por los turnos que el monarca lleva de enemigo activo. */
  furiaRey?: number;
  /** La cara del dado de este turno (1 a 6), a la vista antes de golpear: solo con la Taba cargada o con Oros [4]. */
  dado?: number;
  phase: Phase;
  /** Cinturón de herramientas, de izquierda a derecha (campaña). */
  tools: ToolInst[];
  /** Racha de Golpes exactos: cada eslabón da +`golpe.racha` de Multi al siguiente golpe (hasta `golpe.rachaTope`). */
  chain: number;
  /** Fuerza cargada para el próximo golpe. */
  charge: number;
  /** Escombros: cartas destruidas en toda la campaña. */
  scrap: number;
  /** Cartas destruidas en esta obra (salen del mazo de la campaña). */
  burned: string[];
  /** Cartas agotadas: fuera de juego hasta la obra siguiente. */
  exhausted: Card[];
  /** El jugador de turno ya movió el andamio este turno. */
  stashed: boolean;
  /** Tizas de replanteo: jugadas que aún se pueden deshacer en esta obra (solo en solitario). */
  chalk: number;
  /** La mesa justo antes de la última jugada, mientras quede tiza. */
  undo: GameState | null;
  /** V35 · La Furia del asalto: Ataque de más de todos sus enemigos (ver `siegeLevel`). */
  fatigue: number;
  /** V40 · Cargas permanentes del Mazo (Escoba, Mano larga): llegan de la campaña y vuelven a ella al acabar el asalto. */
  cargas?: Cargas;
  /** V40 1c · Las Bendiciones de la campaña con sus cargas (`n`): llegan de la campaña y vuelven a ella al acabar. */
  bendiciones?: BendInst[];
  /** V40 · El Mentiroso: el Engaño de este asalto (disponible o usado, y cómo). */
  engano?: EnganoEstado;
  /** V40 · Chancho Va: ya se pasó una carta este turno. */
  pasado?: boolean;
  /** V40 · Chancho: Contraataques que aún no llegan (el póker aturde en cadena). */
  cadena?: number;
  /** V40 · Furia que suma el Mazo (un Engaño elegido a mano que no abatió). */
  furiaMazo?: number;
  /** V40 · Cartas de más que se roban al reponer la mano (las ganadas en una jugada que no gastó el turno). */
  robo?: number;
}

export type Action =
  /** `engano` (El Mentiroso): sin él, el motor lo usa solo si convierte el golpe en uno que abate; un modo lo pide a mano; false, no. */
  | { type: 'attack'; cards: string[]; target: Suit; engano?: EnganoModo | false }
  | { type: 'discard'; cards: string[] }
  | { type: 'joker'; card: string; target: Suit }
  | { type: 'pass' }
  /** Guarda una carta de la mano en el andamio (si está lleno, la más antigua vuelve a la mano). No gasta el turno. */
  | { type: 'stash'; card: string }
  /** Gasta una tiza de replanteo: deshace la última jugada y vuelve a barajar la cantera. */
  | { type: 'undo' };

export type StepSrc = 'form' | 'chain' | 'state' | 'card' | 'treat' | 'seal' | 'special' | 'tool' | 'mazo' | 'bendicion' | 'rey';
/**
 * Aviso de herramienta que dispara: qué hizo (sumó Fuerza al golpe, pegó a una torre, reparó el búnker
 * o cargó Fuerza para el golpe siguiente) y cuánto. Lo llevan los `step` de las herramientas cuya cuenta
 * no se ve en las cartas: la interfaz lo pinta como insignia sobre la herramienta.
 */
export interface Proc {
  what: 'fuerza' | 'dano' | 'repara' | 'carga';
  n: number;
  /** La torre que recibe el daño, si `what` es 'dano'. */
  tower?: Suit;
}

export type GameEvent =
  | { e: 'play'; player: string; cards: Card[]; target: Suit; formation: Formation }
  /** Un paso de la resolución: quién aporta (src + id, y slot si es una herramienta) y cuánto. */
  | { e: 'step'; src: StepSrc; id: string; slot?: number; label: string; df?: number; dr?: number; mr?: number; fuerza: number; res: number; proc?: Proc }
  | { e: 'impact'; tower: Suit; fuerza: number; res: number; total: number }
  /** `libre` (Chancho Va, Pasar): el descarte no gastó el turno. */
  | { e: 'discard'; player: string; cards: Card[]; libre?: true }
  | { e: 'joker'; player: string; card: Card; target: Suit }
  | { e: 'pass'; player: string }
  | { e: 'stash'; player: string; card?: Card; back?: Card | null }
  | { e: 'undo'; chalk: number }
  | { e: 'fatigue'; level: number }
  | { e: 'hit'; tower: Suit; amount: number; splash: boolean; damage: number; hp: number }
  | { e: 'floorDown'; tower: Suit; rank: number; clean: boolean; towerDown: boolean; damage: number; exec?: true }
  | { e: 'onda'; tower: Suit; amount: number }
  | { e: 'state'; tower: Suit; fx: keyof TowerFx; on: boolean }
  | { e: 'wall'; amount: number; total: number }
  | { e: 'repair'; amount: number; total: number }
  | { e: 'hurt'; amount: number; integrity: number }
  | { e: 'gold'; amount: number }
  | { e: 'burn'; card: Card }
  /** El Contraataque del enemigo activo. `tower` es null si no lo hubo (`reason`: Golpe exacto, Motín o carta que lo anula). `asedio`: cuánto del Ataque era Furia. */
  | { e: 'siren'; tower: Suit | null; threat: number; blocked: number; taken: number; integrity: number; wall: number; reason: 'strike' | 'sobrecarga' | 'clean' | 'huelga'; asedio?: number }
  /** Mazo agotado: el Descarte se barajó. `sube`: Furia que sumó (0 si salió gratis); `asedio`: la Furia que queda. */
  | { e: 'collapse'; sube: number; asedio: number }
  | { e: 'draw'; player: string; count: number; cards?: Card[] }
  | { e: 'turn'; player: string }
  /** `was`: integridad del búnker al empezar la jugada que cerró la obra (para la autopsia de la derrota). */
  | { e: 'end'; result: 'won' | 'lost'; was?: number };

export class RuleError extends Error {}

// ───────────────────────── RNG ─────────────────────────

export function nextRandom(state: { rng: number }): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffle<T>(arr: T[], state: { rng: number }): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(state) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Convierte cualquier texto (una semilla escrita, una fecha) en una semilla numérica. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h | 0;
}

// ───────────────────────── Preparación ─────────────────────────

export function standardDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (let r = 1; r <= MAX_NUM; r++) deck.push({ id: `${s}${r}`, suit: s, rank: r });
  deck.push({ id: 'X1', suit: 'X', rank: 0 }, { id: 'X2', suit: 'X', rank: 0 });
  return deck;
}

/** Los cuatro tronos con sus guardias. Con `palos`, solo esos están en el asalto: los demás salen sin guardias y con `away`. */
export function newTowers(floors: number[], _cfg?: Config, palos?: Suit[]): Record<Suit, Tower> {
  return Object.fromEntries(
    SUITS.map((s) => [s, palos && !palos.includes(s) ? { suit: s, floors: [], damage: 0, fx: {}, away: true } : { suit: s, floors: [...floors], damage: 0, fx: {} }]),
  ) as Record<Suit, Tower>;
}

export function createGame(players: { id: string; name: string }[], seed: number, config: Config = DEFAULT_CONFIG): GameState {
  if (players.length < 1 || players.length > 4) throw new RuleError('Se juega de 1 a 4 jugadores.');
  const k = config.cuadrilla?.[players.length - 1] ?? 1;
  if (k !== 1) config = { ...config, floorHp: Object.fromEntries(Object.entries(config.floorHp).map(([r, hp]) => [r, Math.round((hp * k) / 5) * 5])) as Config['floorHp'] };
  const state: GameState = {
    config,
    rng: seed | 0,
    players: players.map((p) => ({ id: p.id, name: p.name, hand: [], reserve: [] })),
    deck: standardDeck(),
    discard: [],
    towers: newTowers([...FIGURAS], config),
    integrity: config.maxIntegrity,
    wall: 0,
    turn: 0,
    turnCount: 0,
    collapses: 0,
    phase: 'playing',
    tools: [],
    chain: 0,
    charge: 0,
    scrap: 0,
    burned: [],
    exhausted: [],
    stashed: false,
    chalk: 0,
    undo: null,
    fatigue: 0,
  };
  shuffle(state.deck, state);
  const size = config.handSize[players.length];
  for (const p of state.players) p.hand = state.deck.splice(0, size);
  return state;
}

// ───────────────────────── El golpe ─────────────────────────

/** Una sola regla de palos: contra el trono de su palo, una carta hace 0 (Inmune; `ownMult` lo cambia); contra los demás, su número. */
export function multiplier(card: CardSuit, tower: Suit, cfg: Config = DEFAULT_CONFIG): number {
  if (card === 'X') return 0;
  if (card === tower) return cfg.ownMult ?? 0;
  return 1;
}

export function standing(t: Tower): boolean {
  return t.floors.length > 0;
}

/**
 * Los tronos al lado de `target` en la mesa (V12): el de su izquierda y el de su derecha en la fila S D H C (Espadas, Oros, Copas, Bastos),
 * saltándose los que no están en el asalto (`away`). Un trono ya caído sigue en la mesa y cuenta. Con 4
 * tronos son los vecinos de siempre; con 2, el otro; con 3, uno o dos. Lo usa el sello de pólvora.
 */
export function vecinosPresentes(towers: Record<Suit, Tower>, target: Suit): Suit[] {
  const fila = SUITS.filter((s) => s === target || !towers[s].away);
  const i = fila.indexOf(target);
  return [fila[i - 1], fila[i + 1]].filter((s): s is Suit => s !== undefined);
}
/** V35 · El orden de las Casas del asalto. */
export const ordenDe = (cfg: Config): readonly Suit[] => cfg.orden ?? SUITS;

/** V35 · El enemigo activo: la primera Casa en pie. Solo a ella se la golpea y solo ella contraataca; las demás esperan. */
export function activo(env: { config: Config; towers: Record<Suit, Tower> }): Tower | null {
  for (const s of ordenDe(env.config)) if (standing(env.towers[s])) return env.towers[s];
  return null;
}

/** V35 · ¿El guardia al frente de este trono es el monarca del asalto? (el último de su Casa) */
export const esJefe = (cfg: Config, t: Tower | null): boolean => !!t && !!cfg.jefe && cfg.jefe.suit === t.suit && t.floors.length === 1;

/** Vida del guardia al frente de un trono. La del monarca va multiplicada y redondeada a 5. */
export const floorHp = (t: Tower, cfg: Config): number => {
  const hp = cfg.floorHp[t.floors[0]];
  return esJefe(cfg, t) ? Math.max(5, Math.round((hp * cfg.jefe!.vida) / 5) * 5) : hp;
};


/** Lo que un golpe necesita saber del estado. Lo cumplen tanto GameState como PlayerView. */
export interface StrikeEnv {
  config: Config;
  towers: Record<Suit, Tower>;
  tools: ToolInst[];
  chain: number;
  charge: number;
  scrap: number;
  integrity: number;
  wall: number;
  fatigue?: number;
  /** La cara del dado este turno (Taba cargada, Oros [4]). */
  dado?: number;
  /** V40 1c · Las Bendiciones con sus cargas. */
  bendiciones?: BendInst[];
  /** V40 · Cargas permanentes del Mazo y Engaño del asalto (solo los leen las reglas de Mazo). */
  cargas?: Cargas;
  engano?: EnganoEstado;
}

/** V35 · Vida que le queda a un trono entero: la de todos sus guardias (la del monarca, multiplicada) menos el daño del que está al frente. */
export function vidaTotal(t: Tower, cfg: Config): number {
  const n = t.floors.length;
  return t.floors.reduce((a, r, i) => a + (cfg.jefe && cfg.jefe.suit === t.suit && i === n - 1 ? Math.max(5, Math.round((cfg.floorHp[r] * cfg.jefe.vida) / 5) * 5) : cfg.floorHp[r]), 0) - (n ? t.damage : 0);
}

/** Ataque de un trono ahora mismo: el de su guardia más la Furia del asalto. */
export function threatOf(env: { config: Config; fatigue?: number; dado?: number }, t: Tower): number {
  if (!t.floors.length) return 0;
  const j = esJefe(env.config, t) ? env.config.jefe! : null;
  // V40 1c · el Rey de Oros suma el dado del turno, a escala de sus caras (de +⌈caras/6⌉ a +caras)
  const dado = j?.dado && env.dado ? Math.ceil((env.dado * j.dado) / 6) : 0;
  // el Ataque de más o de menos del jefe nunca lo deja por debajo de 1 (un guardia sin Ataque sigue sin él)
  const base = env.config.floorThreat[t.floors[0]];
  return (j?.ataque ? Math.max(1, base + j.ataque) : base) + dado + (env.fatigue ?? 0);
}

/** El dado que suma el Rey de Oros jefe a su Contraataque este turno (0 si no es él o no hay dado). */
export function dadoDelRey(env: { config: Config; dado?: number }, t: Tower): number {
  const j = esJefe(env.config, t) ? env.config.jefe! : null;
  return j?.dado && env.dado ? Math.ceil((env.dado * j.dado) / 6) : 0;
}

/** El golpe en curso, tal como lo ven las cartas especiales y las herramientas. */
export interface Strike {
  env: StrikeEnv;
  cfg: Config;
  /** Cartas de baraja del golpe, en orden de izquierda a derecha. */
  cards: Card[];
  specials: Card[];
  formation: Formation;
  target: Suit;
  /** V40 1c · El Daño que ya llevaba el guardia golpeado antes de este golpe (0: es el primero contra él). */
  previo: number;
  fuerza: number;
  res: number;
  /** 2+ cartas, todas del mismo palo. */
  mono: boolean;
  /** 3+ palos distintos. */
  poly: boolean;
  /** Impacto que hizo cada carta (para repetirlas). */
  impacts: number[];
  pierce: boolean;
  /** Daño fijo a cada una de las otras torres. */
  splash: number;
  /** Parte del daño final que salpica a las otras torres. */
  splashPct: number;
  wall: number;
  heal: number;
  hurt: number;
  gold: number;
  draw: number;
  noSiren: boolean;
  disarm: boolean;
  /** Daño adicional tras el golpe: fracción de la Vida del guardia activo de un trono. */
  extra: { tower: Suit; pct: number }[];
  /** Daño fijo adicional tras el golpe a un trono (cuenta como Salpica). */
  burst: { tower: Suit; n: number }[];
  /** +n de Daño. */
  F(n: number): void;
  /** +n de Multi (entero). */
  R(n: number): void;
  /** ×n de Multi (entero). */
  X(n: number): void;
  /** Aviso sin números (un efecto que no toca Fuerza ni Resonancia). */
  note(text: string): void;
}

/** Cómo quedó el golpe: lo reciben las herramientas en su gancho `after`. */
export interface Outcome {
  total: number;
  /** Pisos derribados (en cualquier torre). */
  fallen: number;
  clean: boolean;
  /** `exec`: cayó por ejecución (Remate), sin que el Daño llegara a su Vida. */
  fell: { tower: Suit; rank: number; clean: boolean; exec?: true }[];
}

/**
 * V40 · Lo que el golpe deja hecho por las reglas del Mazo, para que `applyAction` lo apunte en el estado: una Escoba
 * o una Mano larga (suman su carga), un Chancho (aturde en cadena), el Engaño usado y el alivio del Contraataque.
 */
export interface MazoFx {
  escoba?: true;
  larga?: true;
  chancho?: true;
  engano?: EnganoModo;
  /** Lo que baja el Contraataque de este turno (Mano larga). */
  alivio?: number;
}

export interface StrikeResult extends Outcome {
  events: GameEvent[];
  /** V40 · Lo que hicieron las reglas del Mazo. */
  mazo: MazoFx;
  formation: Formation | null;
  fuerza: number;
  res: number;
  wallGain: number;
  repair: number;
  hurt: number;
  gold: number;
  draw: number;
  noSiren: boolean;
  /** Daño aplicado a cada torre y pisos caídos (para previsualizar). */
  dealt: Partial<Record<Suit, number>>;
  fallenBy: Partial<Record<Suit, number>>;
  /** Cartas agrietadas que se hicieron añicos (solo con azar real, nunca en la previsualización). */
  shattered: Card[];
}

interface Tally {
  events: GameEvent[];
  dealt: Partial<Record<Suit, number>>;
  fallenBy: Partial<Record<Suit, number>>;
  fell: { tower: Suit; rank: number; clean: boolean; exec?: true }[];
}

/** Deja un estado en un trono en pie (si no lo tiene ya y la mesa lo permite) y lo anuncia. */
function setFx(t: Tower, fx: keyof TowerFx, events: GameEvent[], cfg?: Config): void {
  if (!standing(t) || t.fx[fx] || cfg?.noFx === true || cfg?.noFx === fx) return;
  // V40 1c · el Rey de Bastos, mientras está al frente, no queda Expuesto ni Aturdido
  if (cfg?.jefe?.sinFx && esJefe(cfg, t)) return;
  t.fx[fx] = true;
  events.push({ e: 'state', tower: t.suit, fx, on: true });
}

function applyDamage(t: Tower, amount: number, pierce: boolean, splash: boolean, cfg: Config, out: Tally, cartas?: number): void {
  if (amount <= 0 || !standing(t)) return;
  const tol = cfg.cleanTol ?? 0;
  // el guardia que entra sin Daño de antes y cae con este golpe, cae de un solo golpe (los que siguen, también)
  const corto = !splash && cartas !== undefined && cartas <= (cfg.deUnGolpe ?? 0);
  let deUno = corto && t.damage === 0;
  out.dealt[t.suit] = (out.dealt[t.suit] ?? 0) + amount;
  t.damage += amount;
  out.events.push({ e: 'hit', tower: t.suit, amount, splash, damage: t.damage, hp: floorHp(t, cfg) });
  // ejecución (Remate): también cae el que queda con `ejecuta` de su Vida o menos
  const rematable = (hp: number) => !!cfg.ejecuta && hp - t.damage <= Math.floor(hp * cfg.ejecuta);
  while (standing(t) && (t.damage >= floorHp(t, cfg) - tol || rematable(floorHp(t, cfg)))) {
    const hp = floorHp(t, cfg);
    const exec = t.damage < hp - tol;
    // exacto a ±cleanTol; por arriba, también hasta cleanTol + cleanOver (Buen ojo). Una ejecución lo es si la mesa lo dice
    const justo = t.damage - hp >= -tol && t.damage - hp <= tol + (cfg.cleanOver ?? 0);
    const clean = exec ? !!cfg.ejecutaExacta : justo || deUno;
    // lo que sobra sigue perforando aunque el Facón lo cuente como exacto
    const excess = justo || exec ? 0 : t.damage - hp;
    deUno = corto;
    const rank = t.floors.shift()!;
    out.fallenBy[t.suit] = (out.fallenBy[t.suit] ?? 0) + 1;
    out.fell.push({ tower: t.suit, rank, clean, ...(exec ? { exec: true as const } : {}) });
    t.fx = {};
    delete t.piedra;
    t.damage = pierce && standing(t) ? excess : 0;
    out.events.push({ e: 'floorDown', tower: t.suit, rank, clean, towerDown: !standing(t), damage: t.damage, ...(exec ? { exec: true as const } : {}) });
  }
}

/** ¿Pega más la formación `a` que la `b`? (más Multi; a igual Multi, más Daño de base) */
const mejorForma = (a: Formation, b: Formation) => baseDe(a).r > baseDe(b).r || (baseDe(a).r === baseDe(b).r && baseDe(a).f > baseDe(b).f);

/**
 * V40 · La formación de un golpe con el Engaño (El Mentiroso): con `palo` o `numero`, la mejor entre la de las cartas
 * y la de las cartas contadas como de un solo palo o número. null si ni así es una jugada.
 */
export function formaConEngano(all: Card[], cfg: { mazo?: MazoId }, engano?: EnganoModo): Formation | null {
  const formation = classify(all, cfg);
  if (!engano || engano === 'inmune') return formation;
  const alt = classify(enganoCartas(engano, all), cfg);
  return alt && (!formation || mejorForma(alt, formation)) ? alt : formation;
}

/**
 * Resuelve un golpe sobre `env` (muta sus torres, su carga y los contadores de sus herramientas).
 * Con `rng` las cartas agrietadas pueden hacerse añicos; sin él (previsualización) nunca.
 * V40 · `opts.engano`: el golpe usa el Engaño de El Mentiroso de ese modo (lo decide `applyAction`, ver `eligeEngano`).
 */
export function strike(env: StrikeEnv, all: Card[], target: Suit, rng?: { rng: number }, opts: { engano?: EnganoModo } = {}): StrikeResult {
  const cfg = env.config;
  const engano = opts.engano && cfg.mazo === 'mentiroso' ? opts.engano : undefined;
  const formation = formaConEngano(all, cfg, engano);
  const tally: Tally = { events: [], dealt: {}, fallenBy: {}, fell: [] };
  const mz: MazoFx = {};
  const out: StrikeResult = { ...tally, mazo: mz, formation, fuerza: 0, res: 1, total: 0, fallen: 0, clean: false, wallGain: 0, repair: 0, hurt: 0, gold: 0, draw: 0, noSiren: false, shattered: [] };
  if (!formation) return out;
  const tower = env.towers[target];
  const cards = all.filter((c) => !c.sp);
  const specials = all.filter((c) => c.sp);
  const suits = [...new Set(cards.map((c) => c.suit as Suit))];

  let cur: { src: StepSrc; id: string; slot?: number; label: string; loud?: boolean } = { src: 'form', id: formation, label: FORMATION_NAME[formation] };
  const emit = (d: { df?: number; dr?: number; mr?: number }) => {
    const proc: { proc?: Proc } = cur.loud && d.df ? { proc: { what: 'fuerza', n: d.df } } : {};
    tally.events.push({ e: 'step', src: cur.src, id: cur.id, slot: cur.slot, label: cur.label, ...d, fuerza: x.fuerza, res: x.res, ...proc });
  };
  /** V31 · los multiplicadores de Multi (×2, ×3…) del golpe, en el orden en que aparecieron: se aplican al final. */
  const porMultiplicar: { cur: typeof cur; n: number }[] = [];
  const x: Strike = {
    env,
    cfg,
    cards,
    specials,
    formation,
    target,
    previo: tower.damage,
    fuerza: 0,
    res: 1,
    mono: cards.length >= 2 && (suits.length === 1 || engano === 'palo'),
    poly: suits.length >= 3,
    impacts: [],
    pierce: !!cfg.alwaysPierce,
    splash: 0,
    splashPct: 0,
    wall: 0,
    heal: 0,
    hurt: 0,
    gold: 0,
    draw: 0,
    noSiren: false,
    disarm: false,
    extra: [],
    burst: [],
    F(n) {
      if (!n) return;
      x.fuerza += n;
      emit({ df: n });
    },
    R(n) {
      if (!n) return;
      x.res += n;
      emit({ dr: n });
    },
    X(n) {
      if (n === 1) return;
      // V31 · el orden no importa: un multiplicador no actúa donde está; se guarda y se aplica al final, cuando ya se
      // sumó todo el Multi (lo mismo que antes daba el mejor orden posible)
      porMultiplicar.push({ cur, n });
    },
    note(text) {
      tally.events.push({ e: 'step', src: cur.src, id: cur.id, slot: cur.slot, label: `${cur.label}: ${text}`, fuerza: x.fuerza, res: x.res });
    },
  };

  // 1 · la formación pone la base (el Pergamino solo sube su Daño)
  const level = cfg.formLevel?.[formation] ?? 0;
  const base = baseDe(formation);
  x.fuerza = base.f + level * base.lf;
  x.res = base.r;
  emit({ df: x.fuerza, dr: x.res - 1 });
  // V40 · el Engaño de El Mentiroso, si este golpe lo usa
  if (engano) {
    cur = { src: 'mazo', id: 'engano', label: REGLA.engano.name };
    x.note(engano === 'inmune' ? 'sin Inmune' : engano === 'palo' ? 'como de un solo palo' : 'como de un solo número');
    mz.engano = engano;
  }

  // 2 · lo que arrastra la mesa: Racha de Golpes exactos y Daño cargado
  if (env.chain > 0) {
    cur = { src: 'chain', id: 'onda', label: 'Racha' };
    x.R(BALANCE.golpe.racha * env.chain);
  }
  if (env.charge > 0) {
    cur = { src: 'state', id: 'carga', label: 'Carga' };
    x.F(env.charge);
    env.charge = 0;
  }

  // 3 · las cartas, de izquierda a derecha
  const riders = specials.map((c) => SPECIAL[c.sp!]?.fx ?? {});
  const allHigh = riders.some((fx) => fx.allHigh);
  const noImmune = riders.some((fx) => fx.noImmune) || engano === 'inmune';
  const highest = Math.max(0, ...cards.map(cardValue));
  const sealReps = cfg.sealTwice ? 2 : 1;
  /** Cartas de cada palo en el golpe (el sello de eco cuenta su carta dos veces): de aquí salen los poderes. */
  const power: Record<Suit, number> = { S: 0, D: 0, H: 0, C: 0 };
  let adjacent = 0;
  let jornal = 0;
  const cracked: Card[] = [];
  for (const c of cards) {
    const suit = c.suit as Suit;
    const v = allHigh ? highest : cardValue(c);
    const m = multiplier(suit, target, cfg);
    const impact = v * (noImmune ? Math.max(1, m) : m);
    cur = { src: 'card', id: c.id, label: cardLabel(c) };
    x.impacts.push(impact);
    if (impact) x.F(impact);
    else x.note('inmune');
    power[suit] += 1;
    if (c.tr) {
      cur = { src: 'treat', id: c.id, label: `${cardLabel(c)} · ${TREATMENT[c.tr].name}` };
      if (c.tr === 'forjado') x.F(BALANCE.acabados.forjado);
      else if (c.tr === 'templado') x.R(BALANCE.acabados.templado);
      else if (c.tr === 'policromado') x.X(BALANCE.acabados.policromado);
      else {
        x.X(BALANCE.acabados.agrietado);
        cracked.push(c);
      }
    }
    if (c.seal) {
      cur = { src: 'seal', id: c.id, label: `${cardLabel(c)} · ${SEAL[c.seal].name}` };
      for (let i = 0; i < sealReps; i++) {
        if (c.seal === 'eco') {
          if (impact) x.F(impact);
          else x.note('eco');
          power[suit] += 1;
        } else if (c.seal === 'dinamita') {
          adjacent += v;
          x.note(`${v} a los tronos vecinos`);
        } else if (c.seal === 'jornal') {
          jornal++;
          x.note(`+${BALANCE.sellos.jornal} de oro si cae un guardia`);
        } else {
          x.draw++;
          x.note('robás 1');
        }
      }
    }
  }
  if (power.S > 0) x.pierce = true;

  // 3 bis · V40: las reglas del Mazo de la campaña
  const regla = (id: keyof typeof REGLA, label: string = REGLA[id].name) => void (cur = { src: 'mazo', id, label });
  if (cfg.mazo === 'truco') {
    // los bravos pegan con su bono (si la carta pega: contra el trono de su palo es Inmune y no suma)
    cards.forEach((c, i) => {
      const b = bravoDe(c);
      if (!b || !x.impacts[i]) return;
      regla('bravo', `${cardLabel(c)} · ${REGLA.bravo.name}`);
      x.F(b);
    });
    if (esEnvido(cards)) {
      regla('envido');
      x.F(MZ.truco.envido);
    }
  } else if (cfg.mazo === 'escoba' && esEscoba(cards)) {
    regla('escoba');
    x.R(MZ.escoba.multi);
    x.F((env.cargas?.escoba ?? 0) * MZ.escoba.carga);
    mz.escoba = true;
  } else if (cfg.mazo === 'chinchon') {
    if (formation === 'grupo' && cards.length === 3) {
      regla('pierna');
      x.R(MZ.chinchon.pierna);
    }
    if (formation === 'escaleracolor') {
      regla('escalera');
      x.F(MZ.chinchon.escalera);
    }
    if (cards.length >= MZ.chinchon.cartas) {
      regla('larga');
      x.F((env.cargas?.larga ?? 0) * MZ.chinchon.carga);
      mz.larga = true;
      mz.alivio = MZ.chinchon.alivio;
      x.note(`−${MZ.chinchon.alivio} al Contraataque`);
    }
  } else if (cfg.mazo === 'chancho' && formation === 'poker') {
    regla('chancho');
    mz.chancho = true;
    x.note(`los ${MZ.chancho.cadena} Contraataques siguientes no llegan`);
  }

  // 4 · las cartas especiales que acompañan
  const best = Math.max(0, ...x.impacts);
  let goldOnKill = 0;
  specials.forEach((c, i) => {
    const fx = riders[i];
    cur = { src: 'special', id: c.id, label: cardLabel(c) };
    const before = tally.events.length;
    x.F((fx.flat ?? 0) + (fx.flatPerCard ?? 0) * cards.length + (fx.highDouble ? best : 0) + (fx.wallForce ?? 0) * env.wall);
    x.R(fx.multi ?? 0);
    x.X(fx.strikeMult ?? 1);
    if (fx.pierce) x.pierce = true;
    x.wall += (fx.wall ?? 0) + (fx.wallPerCard ?? 0) * all.length;
    x.heal += fx.heal ?? 0;
    x.hurt += fx.hurt ?? 0;
    x.gold += fx.gold ?? 0;
    x.draw += fx.draw ?? 0;
    x.splash += fx.splash ?? 0;
    goldOnKill += fx.goldOnKill ?? 0;
    if (fx.noSiren) x.noSiren = true;
    if (fx.disarm) x.disarm = true;
    if (tally.events.length === before) x.note(SPECIAL[c.sp!]?.desc ?? '');
  });

  // 5 · el cinturón de herramientas, de izquierda a derecha
  env.tools.forEach((t, slot) => {
    const def = TOOL[t.id];
    if (!def) return;
    if (def.kind === 'copy') {
      // V34: copia el Amuleto más reciente que no sea pasiva (antes, la de su derecha): el hueco ya no cuenta
      const next = espejada(env.tools);
      const copied = next && TOOL[next.id];
      if (!next || !copied?.strike) return;
      cur = { src: 'tool', id: t.id, slot, label: `${def.name} → ${copied.name}`, loud: copied.loud };
      copied.strike(x, next);
      return;
    }
    cur = { src: 'tool', id: t.id, slot, label: def.name, loud: def.loud };
    def.strike?.(x, t);
  });

  // 5 bis · V40 1c: las Bendiciones (con sus cargas) y los niveles de los Reyes [2/4]
  const bend = env.bendiciones ?? [];
  bend.forEach((b) => {
    const def = BENDICION[b.id];
    if (!def?.strike) return;
    cur = { src: 'bendicion', id: b.id, label: def.name };
    def.strike(x, b);
  });
  const nv = nivelesReyes(fuentesDe(bend, env.tools));
  const marca = (rey: ReyId) => void (cur = { src: 'rey', id: rey, label: REY_NOMBRE[rey] });
  nivelesStrike(x, nv, marca);

  // 5 ter · V31: ahora sí, los multiplicadores de Multi, sobre todo el Multi ya sumado
  for (const m of porMultiplicar) {
    cur = m.cur;
    x.res *= m.n;
    emit({ mr: m.n });
  }

  // 6 · Expuesto, al final de la columna de Daño: el golpe hace ×n de Daño (se suma otro tanto)
  if (standing(tower) && tower.fx.fractura) {
    const mult = cfg.expuestoMult ?? BALANCE.golpe.expuesto;
    cur = { src: 'state', id: 'fractura', label: `Expuesto ×${mult}` };
    x.F(x.fuerza * (mult - 1));
    tower.fx.fractura = false;
    tally.events.push({ e: 'state', tower: target, fx: 'fractura', on: false });
  }

  // 7 · Daño × Multi = Golpe, todo entero
  const total = Math.max(0, x.fuerza * x.res);
  tally.events.push({ e: 'impact', tower: target, fuerza: x.fuerza, res: x.res, total });
  applyDamage(tower, total, x.pierce, false, cfg, tally, x.cards.length);
  const shards = power.D * cfg.salpicaPorCarta + x.splash + Math.round(total * x.splashPct);
  const vecinos = adjacent ? vecinosPresentes(env.towers, target) : [];
  SUITS.forEach((s) => {
    if (s === target) return;
    const near = vecinos.includes(s) ? adjacent : 0;
    applyDamage(env.towers[s], shards + near, false, true, cfg, tally);
  });

  // 8 · Golpe exacto: Impulso sobre el guardia siguiente, oro y una carta
  if (tally.fell.some((f) => f.clean)) x.draw += 1;
  for (const f of [...tally.fell]) {
    if (!f.clean) continue;
    x.gold += BALANCE.golpe.oroExacto;
    const t = env.towers[f.tower];
    if (!standing(t)) continue;
    const amount = Math.ceil(floorHp(t, cfg) * BALANCE.golpe.onda);
    tally.events.push({ e: 'onda', tower: f.tower, amount });
    applyDamage(t, amount, false, true, cfg, tally);
  }

  // 9 · los Amuletos reaccionan a cómo quedó el golpe
  const outcome = (): Outcome => ({ total, fallen: tally.fell.length, clean: tally.fell.some((f) => f.clean), fell: tally.fell });
  const seen = outcome();
  env.tools.forEach((t, slot) => {
    const def = TOOL[t.id];
    if (!def?.after) return;
    cur = { src: 'tool', id: t.id, slot, label: def.name };
    def.after(x, t, seen);
  });
  // V40 1c · las Bendiciones reaccionan y suman sus cargas (para siempre); luego, los niveles
  bend.forEach((b) => {
    const def = BENDICION[b.id];
    if (!def?.after) return;
    cur = { src: 'bendicion', id: b.id, label: def.name };
    const k = def.after(x, b, seen);
    if (k > 0) {
      b.n += k;
      x.note(`carga ${b.n}`);
    }
  });
  nivelesAfter(x, seen, nv, marca);
  for (const e of x.extra) {
    const t = env.towers[e.tower];
    if (standing(t)) applyDamage(t, Math.ceil(floorHp(t, cfg) * e.pct), false, true, cfg, tally);
  }
  for (const b of x.burst) applyDamage(env.towers[b.tower], b.n, false, true, cfg, tally);
  if (tally.fell.length > 0) x.gold += goldOnKill + BALANCE.sellos.jornal * jornal;

  // 10 · los estados que deja la mezcla de palos: un solo palo deja Expuesto; tres palos (o El Espía), Aturdido
  if (standing(tower)) {
    if (x.mono || (x.poly && cfg.polyExpuesto)) setFx(tower, 'fractura', tally.events, cfg);
    if (x.poly || x.disarm) setFx(tower, 'sobrecarga', tally.events, cfg);
  }

  // 11 · las cartas de Cristal maldito pueden hacerse añicos
  if (rng) for (const c of cracked) if (nextRandom(rng) < BALANCE.acabados.agrietadoRompe) out.shattered.push(c);

  return {
    ...out,
    ...outcome(),
    fuerza: x.fuerza,
    res: x.res,
    wallGain: x.wall + power.C * cfg.escudoPorCarta,
    repair: x.heal + power.H * cfg.curaPorCarta,
    hurt: x.hurt,
    gold: x.gold,
    draw: x.draw,
    noSiren: x.noSiren,
    mazo: mz,
  };
}

/** Lo mismo que `strike`, sin tocar el estado: para previsualizar y para que el bot compare jugadas. */
export function previewStrike(env: StrikeEnv, cards: Card[], target: Suit, opts: { engano?: EnganoModo } = {}): StrikeResult {
  return strike({ ...env, towers: structuredClone(env.towers), tools: env.tools.map((t) => ({ ...t })), ...(env.bendiciones ? { bendiciones: env.bendiciones.map((b) => ({ ...b })) } : {}) }, cards, target, undefined, opts);
}

/** ¿El golpe abate al guardia del trono apuntado? */
const abate = (r: StrikeResult, target: Suit) => (r.fallenBy[target] ?? 0) > 0;

/**
 * V40 · El Engaño de El Mentiroso para este golpe: el modo con que se usa, o undefined si no se usa. Solo con el Engaño
 * del asalto aún sin usar. `pedido` (la acción): un modo lo pide a mano (si cambia algo); false, no se usa; sin él,
 * automático: solo si el golpe no abatía y con el Engaño sí abate (prueba Inmune, luego palo, luego número).
 */
export function eligeEngano(env: StrikeEnv, cards: Card[], target: Suit, pedido?: EnganoModo | false): EnganoModo | undefined {
  if (env.config.mazo !== 'mentiroso' || !env.engano || env.engano.usado || pedido === false) return undefined;
  if (pedido) return enganoCambia(pedido, cards, target) ? pedido : undefined;
  if (!classify(cards, env.config) || abate(previewStrike(env, cards, target), target)) return undefined;
  return ENGANO_MODOS.find((m) => enganoCambia(m, cards, target) && abate(previewStrike(env, cards, target, { engano: m }), target));
}

// ───────────────────────── Turno ─────────────────────────

/** Lo que una herramienta puede hacer fuera de un golpe (sirena, huelga, descartes, cartas destruidas). */
export interface Hook {
  state: GameState;
  gold(n: number): void;
  heal(n: number): void;
  wall(n: number): void;
  /** Roba n cartas extra al final del turno. */
  draw(n: number): void;
  /** Carga Fuerza para el próximo golpe. */
  charge(n: number): void;
  /** Daño directo a una torre. `why` es la cuenta que lo explica en mesa («3 × 4 frenado»). */
  hit(tower: Suit, n: number, why?: string): void;
  /** Destruye una carta: sale del mazo de la campaña. */
  burn(card: Card): void;
}

interface Turn {
  state: GameState;
  events: GameEvent[];
  draw: number;
  /** V40 · Lo que baja el Contraataque de este turno (Mano larga del Chinchón). */
  alivio?: number;
}

function hookFor(turn: Turn, slot: number): Hook {
  const t = turn.state.tools[slot];
  return hookCon(turn, (label, proc) => turn.events.push({ e: 'step', src: 'tool', id: t.id, slot, label: `${TOOL[t.id]?.name ?? t.id}: ${label}`, fuerza: 0, res: 0, ...(proc ? { proc } : {}) }));
}

/** V40 1c · El gancho de la Bendición i (como el de un Amuleto, con sus pasos a nombre de la Bendición). */
function hookBend(turn: Turn, i: number): Hook {
  const b = turn.state.bendiciones![i];
  return hookCon(turn, (label, proc) => turn.events.push({ e: 'step', src: 'bendicion', id: b.id, label: `${BENDICION[b.id]?.name ?? b.id}: ${label}`, fuerza: 0, res: 0, ...(proc ? { proc } : {}) }));
}

function hookCon(turn: Turn, mark: (label: string, proc?: Proc) => void): Hook {
  const { state, events } = turn;
  return {
    state,
    gold(n) {
      mark(`+${n} de oro`);
      events.push({ e: 'gold', amount: n });
    },
    heal(n) {
      const before = state.integrity;
      state.integrity = Math.min(state.config.maxIntegrity, state.integrity + n);
      mark(`+${state.integrity - before} de Vida`, { what: 'repara', n: state.integrity - before });
      events.push({ e: 'repair', amount: state.integrity - before, total: state.integrity });
    },
    wall(n) {
      const before = state.wall;
      state.wall = Math.min(state.config.wallCap, state.wall + n);
      mark(`+${state.wall - before} de Escudo`);
      events.push({ e: 'wall', amount: state.wall - before, total: state.wall });
    },
    draw(n) {
      mark(`robás ${n}`);
      turn.draw += n;
    },
    charge(n) {
      mark(`+${n} de Daño cargado`, { what: 'carga', n });
      state.charge += n;
    },
    hit(tower, n, why) {
      mark(`${why ? `${why} = ` : ''}${n} a ${MATERIAL[tower]}`, { what: 'dano', n, tower });
      const tally: Tally = { events, dealt: {}, fallenBy: {}, fell: [] };
      applyDamage(state.towers[tower], n, false, true, state.config, tally);
    },
    burn(card) {
      if (destroy(turn, card)) mark(`destruye ${cardLabel(card)}`);
    },
  };
}

/** Cartas de baraja que como mínimo quedan siempre en juego: por debajo, ninguna se destruye. */
export const MIN_PLAIN = 12;
const isPlain = (c: Card) => !c.sp && c.suit !== 'X';

/**
 * Destruye una carta para toda la campaña: suma un escombro y avisa a las herramientas.
 * Devuelve false (y no hace nada) si con ello el mazo se quedaría sin cartas de baraja suficientes.
 */
function destroy(turn: Turn, card: Card): boolean {
  const { state, events } = turn;
  if (state.burned.includes(card.id)) return true;
  if (isPlain(card)) {
    const left = [...state.deck, ...state.discard, ...state.exhausted, ...state.players.flatMap((p) => [...p.hand, ...p.reserve])].filter((c) => isPlain(c) && c.id !== card.id).length;
    if (left < MIN_PLAIN) return false;
  }
  state.burned.push(card.id);
  state.scrap++;
  events.push({ e: 'burn', card });
  state.tools.forEach((t, slot) => TOOL[t.id]?.burn?.(hookFor(turn, slot), t, card));
  return true;
}

/** V35 · Furia que deben los Mazos agotados de este asalto (los gratis no cuentan). */
export function deckSiege(env: { config: Config; collapses: number }): number {
  return Math.max(0, env.collapses - (env.config.collapseFree ?? 0)) * env.config.collapseSiege;
}

/** Furia que subirá el próximo Mazo agotado (0 si sale gratis). Barajar no quita Vida. */
export function nextCollapse(env: { config: Config; collapses: number }): number {
  return deckSiege({ config: env.config, collapses: env.collapses + 1 }) - deckSiege(env);
}

/**
 * V35 · La Furia del asalto: Ataque de más de todos sus enemigos. Suma la inicial (decreto), la de los Mazos agotados,
 * la Furia del Rey (un punto por cada turno que el monarca lleva de enemigo activo) y, en la partida clásica, el reloj.
 */
export function siegeLevel(env: { config: Config; collapses: number; turnCount: number; furiaRey?: number; furiaMazo?: number }): number {
  return (env.config.furiaInicial ?? 0) + fatigueAt(env.config, env.turnCount) + deckSiege(env) + (env.furiaRey ?? 0) + (env.furiaMazo ?? 0);
}

function reshuffleIfNeeded(state: GameState, events: GameEvent[]): void {
  if (state.deck.length > 0 || state.discard.length === 0) return;
  state.deck = state.discard;
  state.discard = [];
  shuffle(state.deck, state);
  const sube = nextCollapse(state);
  state.collapses++;
  // barajar el Descarte no quita Vida: sube la Furia, a la vista en el ⚔ del enemigo
  events.push({ e: 'collapse', sube, asedio: siegeLevel(state) });
  if (sube > 0) {
    state.fatigue = siegeLevel(state);
    events.push({ e: 'fatigue', level: state.fatigue });
  }
}

function drawOne(state: GameState, events: GameEvent[]): Card | null {
  reshuffleIfNeeded(state, events);
  return state.deck.shift() ?? null;
}

type SirenReason = Extract<GameEvent, { e: 'siren' }>['reason'];

function siren(turn: Turn, skip: 'clean' | 'huelga' | null): void {
  const { state, events } = turn;
  const say = (tower: Suit | null, reason: SirenReason): void => {
    events.push({ e: 'siren', tower, blocked: 0, taken: 0, threat: 0, integrity: state.integrity, wall: state.wall, reason });
  };
  if (skip) return say(null, skip);
  // V35 · contraataca el enemigo activo (ya no se voltea una carta del Mazo para ver qué trono ataca)
  const t = activo(state);
  if (!t) return say(null, 'huelga');
  if (t.fx.sobrecarga) {
    t.fx.sobrecarga = false;
    events.push({ e: 'state', tower: t.suit, fx: 'sobrecarga', on: false });
    return say(t.suit, 'sobrecarga');
  }
  // V40 · El Mentiroso, Cara de piedra: el Contraataque de este guardia no llega (se pierde si cae antes)
  if (t.piedra) {
    delete t.piedra;
    events.push({ e: 'step', src: 'mazo', id: 'piedra', label: REGLA.piedra.name, fuerza: 0, res: 0 });
    return say(t.suit, 'sobrecarga');
  }
  // V40 · Chancho: el póker aturde en cadena (los Contraataques siguientes no llegan, sea quien sea el enemigo)
  if ((state.cadena ?? 0) > 0) {
    state.cadena = state.cadena! - 1;
    events.push({ e: 'step', src: 'mazo', id: 'chancho', label: `${REGLA.chancho.name}: quedan ${state.cadena}`, fuerza: 0, res: 0 });
    return say(t.suit, 'sobrecarga');
  }
  // V40 1c · el Rey de Oros [2] y [4]: con el dado del turno alto, el Contraataque no llega
  const suerte = dadoSalva(state.bendiciones, state.dado, state.tools);
  if (suerte) {
    events.push({ e: 'step', src: 'rey', id: 'oros', label: `${REY_NOMBRE.oros}: el dado sacó ${state.dado}`, fuerza: 0, res: 0 });
    return say(t.suit, 'sobrecarga');
  }
  // V40 · Mano larga (Chinchón): el Contraataque de este turno llega más flojo
  const threat = Math.max(0, threatOf(state, t) - (turn.alivio ?? 0));
  // V40 1c · el Rey de Espadas: su Contraataque atraviesa parte del Escudo
  const atraviesa = state.config.jefe?.perfora && esJefe(state.config, t) ? Math.min(threat, state.config.jefe.perfora) : 0;
  const blocked = Math.min(state.wall, threat - atraviesa);
  state.wall -= blocked;
  const taken = threat - blocked;
  state.integrity -= taken;
  const furia = Math.min(threat, state.fatigue ?? 0);
  events.push({ e: 'siren', tower: t.suit, threat, blocked, taken, integrity: Math.max(0, state.integrity), wall: state.wall, reason: 'strike', ...(furia > 0 ? { asedio: furia } : {}) });
  state.tools.forEach((tool, slot) => TOOL[tool.id]?.siren?.(hookFor(turn, slot), tool, { tower: t.suit, threat, blocked, taken }));
  // V40 1c · las Bendiciones que reaccionan al Contraataque (y suman sus cargas)
  (state.bendiciones ?? []).forEach((b, i) => {
    const def = BENDICION[b.id];
    if (!def?.siren) return;
    const k = def.siren(hookBend(turn, i), b, { tower: t.suit, threat, blocked, taken });
    if (k > 0) {
      b.n += k;
      events.push({ e: 'step', src: 'bendicion', id: b.id, label: `${def.name}: carga ${b.n}`, fuerza: 0, res: 0 });
    }
  });
}

function refill(state: GameState, p: Player, events: GameEvent[], extra = 0): void {
  const size = Math.max(p.hand.length, state.config.handSize[state.players.length]) + extra;
  const drawn: Card[] = [];
  while (p.hand.length < size) {
    const c = drawOne(state, events);
    if (!c) break;
    p.hand.push(c);
    drawn.push(c);
  }
  if (drawn.length) events.push({ e: 'draw', player: p.id, count: drawn.length, cards: drawn });
}

/** Quita de la mano y del andamio las cartas jugadas. */
function spend(p: Player, ids: string[]): void {
  p.hand = p.hand.filter((c) => !ids.includes(c.id));
  p.reserve = p.reserve.filter((c) => !ids.includes(c.id));
}

function takeFromHand(p: Player, ids: string[]): Card[] {
  if (new Set(ids).size !== ids.length) throw new RuleError('Cartas repetidas.');
  return ids.map((id) => {
    const c = p.hand.find((h) => h.id === id) ?? p.reserve.find((h) => h.id === id);
    if (!c) throw new RuleError('Esa carta no está en tu mano.');
    return c;
  });
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.turn];
}

const allDown = (state: GameState) => SUITS.every((s) => !standing(state.towers[s]));

/** Aplica una acción. No muta el estado recibido. Lanza RuleError si la jugada es ilegal. */
export function applyAction(prev: GameState, playerId: string, action: Action): { state: GameState; events: GameEvent[] } {
  if (prev.phase !== 'playing') throw new RuleError('La partida ya terminó.');
  if (currentPlayer(prev).id !== playerId) throw new RuleError('No es tu turno.');
  if (action.type === 'undo') return rewind(prev);
  const state = structuredClone({ ...prev, undo: null }) as GameState;
  // mientras quede tiza se guarda la mesa anterior (sin su propia historia) para poder deshacer
  state.undo = prev.chalk > 0 ? (structuredClone({ ...prev, undo: null }) as GameState) : null;
  const p = currentPlayer(state);
  const events: GameEvent[] = [];
  if (action.type === 'stash') {
    if (state.stashed) throw new RuleError('Ya usaste la Manga este turno.');
    const card = p.hand.find((c) => c.id === action.card);
    if (!card) throw new RuleError('Esa carta no está en tu mano.');
    const size = state.config.reserveSize ?? 1;
    if (size <= 0) throw new RuleError('En este asalto no hay Manga.');
    p.hand = p.hand.filter((c) => c !== card);
    const back = p.reserve.length >= size ? p.reserve.shift()! : null;
    if (back) p.hand.push(back);
    p.reserve.push(card);
    state.stashed = true;
    // mover el andamio no gasta el punto de replanteo: la tiza sigue apuntando a la última jugada de verdad
    state.undo = prev.undo ?? null;
    return { state, events: [{ e: 'stash', player: p.id, card, back }] };
  }
  const turn: Turn = { state, events, draw: 0 };
  let skip: 'clean' | 'huelga' | null = null;
  const win = () => {
    state.phase = 'won';
    events.push({ e: 'end', result: 'won' });
    return { state, events };
  };

  if (action.type === 'attack') {
    const cards = takeFromHand(p, action.cards);
    // V40 · un Engaño pedido a mano puede hacer jugada lo que no lo era (cuatro cartas sueltas «son» un póker)
    const pedido = action.engano && state.config.mazo === 'mentiroso' && state.engano && !state.engano.usado ? action.engano : undefined;
    const formation = classify(cards, state.config) ?? (pedido ? formaConEngano(cards, state.config, pedido) : null);
    if (!formation) throw new RuleError('Formación inválida: carta sola, grupo, doble par, full, póker, escalera o color.');
    const tower = state.towers[action.target];
    if (!tower || !standing(tower)) throw new RuleError('Ese trono ya cayó.');
    if (tower !== activo(state)) throw new RuleError('Solo podés golpear al enemigo que tenés delante.');
    const engano = eligeEngano(state, cards, action.target, action.engano);
    spend(p, action.cards);
    events.push({ e: 'play', player: p.id, cards, target: action.target, formation });
    const res = strike(state, cards, action.target, state, { engano });
    events.push(...res.events);
    mazoTrasGolpe(turn, res, action.target, engano, action.engano === undefined);
    let repair = res.repair;
    if (res.wallGain > 0) {
      const before = state.wall;
      state.wall = Math.min(state.config.wallCap, state.wall + res.wallGain);
      events.push({ e: 'wall', amount: state.wall - before, total: state.wall });
      // el muro que no cabe no se pierde si alguien lo recoge: repara el búnker
      const spill = before + res.wallGain - state.wall;
      const mend = state.config.overwallRepair ? Math.floor(spill / state.config.overwallRepair) : 0;
      if (mend > 0) {
        repair += mend;
        // V40 1d · lo pone el Fogón (Bendición de Bastos y Copas)
        events.push({ e: 'step', src: 'bendicion', id: 'fogon', label: `${BENDICION.fogon?.name ?? 'Fogón'}: ${spill} de Escudo que no cabe ÷ ${state.config.overwallRepair} = cura ${mend}`, fuerza: 0, res: 0, proc: { what: 'repara', n: mend } });
      }
    }
    if (repair > 0) {
      const before = state.integrity;
      state.integrity = Math.min(state.config.maxIntegrity, state.integrity + repair);
      events.push({ e: 'repair', amount: state.integrity - before, total: state.integrity });
      // lo reparado de más con el búnker lleno no se pierde si alguien lo recoge
      const over = before + repair - state.integrity;
      if (over > 0 && state.config.overhealCharge) {
        const gain = over * state.config.overhealCharge;
        state.charge += gain;
        // V40 1d · lo pone el Cáliz rebosante (Bendición de Copas)
        events.push({ e: 'step', src: 'bendicion', id: 'caliz', label: `${BENDICION.caliz?.name ?? 'Cáliz rebosante'}: ${over} de curación que no cabe × ${state.config.overhealCharge} = +${gain} de Daño cargado`, fuerza: 0, res: 0, proc: { what: 'carga', n: gain } });
      }
    }
    if (res.hurt > 0) {
      state.integrity -= res.hurt;
      events.push({ e: 'hurt', amount: res.hurt, integrity: Math.max(0, state.integrity) });
    }
    if (res.gold > 0) events.push({ e: 'gold', amount: res.gold });
    turn.draw += res.draw;
    state.chain = res.clean ? Math.min(BALANCE.golpe.rachaTope, state.chain + 1) : 0;
    state.discard.push(...cards.filter((c) => !res.shattered.includes(c)));
    for (const c of res.shattered) if (!destroy(turn, c)) state.discard.push(c);
    if (res.clean) skip = 'clean';
    else if (res.noSiren) skip = 'huelga';
    if (allDown(state)) return win();
  } else if (action.type === 'discard') {
    const cards = takeFromHand(p, action.cards);
    if (cards.length === 0) throw new RuleError('Elegí al menos una carta para descartar.');
    // V40 · Chancho Va, Pasar: la primera carta suelta que se descarta en el turno no lo gasta
    const libre = state.config.mazo === 'chancho' && !state.pasado && cards.length === 1;
    spend(p, action.cards);
    events.push({ e: 'discard', player: p.id, cards, ...(libre ? { libre: true as const } : {}) });
    turn.draw += cards.filter((c) => c.seal === 'sindical').length * (state.config.sealTwice ? 2 : 1);
    state.tools.forEach((t, slot) => TOOL[t.id]?.discard?.(hookFor(turn, slot), t, cards));
    const rest = cards.filter((c) => !state.burned.includes(c.id));
    if (state.config.discardExhaust) {
      state.exhausted.push(...rest);
      state.charge += rest.length * state.config.discardExhaust;
    } else state.discard.push(...rest);
    if (libre) {
      // se roba una carta nueva en el acto y se sigue jugando el turno (lo que roban los sellos, al reponer)
      state.pasado = true;
      events.push({ e: 'step', src: 'mazo', id: 'pasar', label: REGLA.pasar.name, fuerza: 0, res: 0 });
      if (allDown(state)) return win();
      const nueva = drawOne(state, events);
      if (nueva) {
        p.hand.push(nueva);
        events.push({ e: 'draw', player: p.id, count: 1, cards: [nueva] });
      }
      state.robo = (state.robo ?? 0) + turn.draw;
      return { state, events };
    }
  } else if (action.type === 'joker') {
    const [card] = takeFromHand(p, [action.card]);
    if (card.suit !== 'X' || card.sp) throw new RuleError('Esa carta no es un Comodín.');
    const tower = state.towers[action.target];
    if (!tower || !standing(tower)) throw new RuleError('Ese trono ya cayó.');
    if (tower !== activo(state)) throw new RuleError('Solo podés golpear al enemigo que tenés delante.');
    spend(p, [card.id]);
    state.exhausted.push(card); // el comodín no vuelve esta obra
    skip = 'huelga';
    events.push({ e: 'joker', player: p.id, card, target: action.target });
    // V40 · El Mentiroso, Cara de piedra: el Comodín no gasta el turno; el próximo Contraataque de ese guardia no
    // llega (sin quedar Aturdido: no cuenta para lo que premia a los Aturdidos) y el golpe siguiente suma Daño
    if (state.config.mazo === 'mentiroso') {
      skip = null;
      tower.piedra = true;
      state.tools.forEach((t, slot) => TOOL[t.id]?.joker?.(hookFor(turn, slot), t));
      state.charge += MZ.mentiroso.dano;
      events.push({ e: 'step', src: 'mazo', id: 'piedra', label: `${REGLA.piedra.name}: +${MZ.mentiroso.dano} de Daño cargado`, fuerza: 0, res: 0, proc: { what: 'carga', n: MZ.mentiroso.dano } });
      if (allDown(state)) return win();
      // lo que se roba (la Antorcha) llega con el resto al reponer la mano, al final del turno
      state.robo = (state.robo ?? 0) + turn.draw;
      return { state, events };
    }
    // el Motín: ese trono queda Aturdido y este turno no hay Contraataque
    setFx(tower, 'sobrecarga', events, state.config);
    state.tools.forEach((t, slot) => TOOL[t.id]?.joker?.(hookFor(turn, slot), t));
  } else if (action.type === 'pass') {
    if (p.hand.length + p.reserve.length > 0) throw new RuleError('Solo podés pasar con la mano vacía.');
    events.push({ e: 'pass', player: p.id });
    // nadie tiene cartas y no queda cantera ni escombrera: no hay con qué seguir
    if (state.deck.length + state.discard.length === 0 && state.players.every((q) => q.hand.length + q.reserve.length === 0)) state.integrity = 0;
  } else {
    throw new RuleError('Acción desconocida.');
  }

  const sirens = skip ? 1 : (state.config.sirenCount ?? 1);
  for (let i = 0; i < sirens && state.integrity > 0; i++) siren(turn, skip);
  if (allDown(state)) return win(); // una herramienta puede rematar durante la sirena
  // V40 · más lo que se robó en las jugadas que no gastan el turno (Pasar, Cara de piedra)
  if (state.integrity > 0) refill(state, p, events, turn.draw + (state.robo ?? 0));
  if (state.robo) state.robo = 0;
  if (state.integrity <= 0) {
    state.integrity = 0;
    state.phase = 'lost';
    events.push({ e: 'end', result: 'lost', was: prev.integrity });
    return { state, events };
  }
  state.turn = (state.turn + 1) % state.players.length;
  state.turnCount++;
  state.stashed = false;
  if (state.pasado) state.pasado = false;
  // V35 · Furia del Rey: cada turno que el monarca sigue de enemigo activo (ya lo era al empezar el turno), la Furia sube
  if (state.config.jefe && esJefe(prev.config, activo(prev)) && esJefe(state.config, activo(state))) {
    state.furiaRey = (state.furiaRey ?? 0) + state.config.jefe.furia;
    // V40 1c · el Rey de Copas se cura al final de cada turno que sigue al frente
    const rey = activo(state)!;
    const cura = Math.min(rey.damage, state.config.jefe.cura ?? 0);
    if (cura > 0) {
      rey.damage -= cura;
      events.push({ e: 'step', src: 'rey', id: state.config.jefe.rey ?? 'copas', label: `${REY_NOMBRE[state.config.jefe.rey ?? 'copas']}: se cura ${cura}`, fuerza: 0, res: 0 });
    }
  }
  const fatigue = siegeLevel(state);
  if (fatigue !== (state.fatigue ?? 0)) {
    state.fatigue = fatigue;
    events.push({ e: 'fatigue', level: fatigue });
  }
  tiraDado(state);
  events.push({ e: 'turn', player: currentPlayer(state).id });
  return { state, events };
}

/**
 * V40 · Lo que un golpe deja en el estado por las reglas del Mazo: el Engaño usado (y la Furia si no abatió), las
 * cargas permanentes (Escoba, Mano larga), el Chancho en cadena, el alivio del Contraataque y el bono De arranque.
 */
function mazoTrasGolpe(turn: Turn, res: StrikeResult, target: Suit, engano: EnganoModo | undefined, auto: boolean): void {
  const { state, events } = turn;
  const mark = (id: string, label: string, proc?: Proc) => events.push({ e: 'step', src: 'mazo', id, label, fuerza: 0, res: 0, ...(proc ? { proc } : {}) });
  if (engano) {
    const abatio = (res.fallenBy[target] ?? 0) > 0;
    const furia = abatio ? 0 : MZ.mentiroso.furia;
    state.engano = { usado: true, modo: engano, turno: state.turnCount, auto, abatio, ...(furia ? { furia } : {}) };
    if (furia) {
      state.furiaMazo = (state.furiaMazo ?? 0) + furia;
      mark('engano', `${REGLA.engano.name}: la Furia sube ${furia}`);
    }
  }
  for (const id of ['escoba', 'larga'] as const) {
    if (!res.mazo[id]) continue;
    state.cargas = { ...state.cargas, [id]: (state.cargas?.[id] ?? 0) + 1 };
    mark(id, `${REGLA[id].name}: carga ${state.cargas[id]}`);
  }
  if (res.mazo.chancho) state.cadena = (state.cadena ?? 0) + MZ.chancho.cadena;
  if (res.mazo.alivio) turn.alivio = res.mazo.alivio;
  if (state.config.mazo === 'chancho' && state.turnCount < MZ.chancho.turnos && res.fell.length) {
    const n = res.fell.length * MZ.chancho.dano;
    state.charge += n;
    mark('arranque', `${REGLA.arranque.name}: +${n} de Daño cargado`, { what: 'carga', n });
  }
}

/** Tira el dado para el turno que empieza (solo con la Taba cargada o con Oros [4]: sin ellos no se gasta azar). */
export function tiraDado(state: GameState): void {
  if (usaDado(state.bendiciones, state.tools) || state.config.jefe?.dado) state.dado = 1 + Math.floor(nextRandom(state) * 6);
  else delete state.dado;
}

/**
 * Tiza de replanteo: vuelve a la mesa de antes de la última jugada. Para que deshacer no enseñe nada,
 * la cantera se baraja de nuevo: lo que viste salir ya no vale.
 */
function rewind(prev: GameState): { state: GameState; events: GameEvent[] } {
  if (prev.chalk <= 0 || !prev.undo) throw new RuleError('No te quedan rebobinados.');
  const state = structuredClone(prev.undo);
  state.undo = null;
  state.chalk = prev.chalk - 1;
  state.rng = (prev.rng ^ 0x2545f491) | 0;
  shuffle(state.deck, state);
  return { state, events: [{ e: 'undo', chalk: state.chalk }] };
}

// ───────────────────────── Vista por jugador (información oculta) ─────────────────────────

export interface PlayerView extends StrikeEnv {
  you: string;
  players: { id: string; name: string; handCount: number; reserveCount: number }[];
  hand: Card[];
  /** Tu andamio. */
  reserve: Card[];
  reserveSize: number;
  /** Ya moviste el andamio este turno. */
  stashed: boolean;
  /** Tizas de replanteo que quedan, y si hay una jugada que deshacer. */
  chalk: number;
  canUndo: boolean;
  /** La Furia del asalto. */
  fatigue: number;
  deckCount: number;
  discardCount: number;
  turnPlayer: string;
  turnCount: number;
  collapses: number;
  /** V35 · Lo que la Furia debe a los turnos del monarca (la «Furia del Rey»). */
  furiaRey: number;
  /** V40 · Chancho Va: ya se pasó una carta este turno. Chancho: Contraataques que aún no llegan. Furia del Engaño. */
  pasado?: boolean;
  cadena?: number;
  furiaMazo?: number;
  phase: Phase;
  /** Lo que aún no has visto (cantera y manos ajenas), ordenado: no revela el orden de robo. */
  unseen: Card[];
  /** La escombrera, ordenada. */
  discard: Card[];
  exhausted: number;
  burned: number;
}

export function viewFor(state: GameState, playerId: string): PlayerView {
  const me = state.players.find((p) => p.id === playerId);
  return {
    you: playerId,
    config: state.config,
    players: state.players.map((p) => ({ id: p.id, name: p.name, handCount: p.hand.length, reserveCount: p.reserve.length })),
    hand: me?.hand ?? [],
    reserve: me?.reserve ?? [],
    reserveSize: state.config.reserveSize ?? 1,
    stashed: state.stashed,
    chalk: state.chalk,
    canUndo: state.chalk > 0 && !!state.undo,
    fatigue: state.fatigue ?? 0,
    towers: state.towers,
    tools: state.tools,
    chain: state.chain,
    charge: state.charge,
    scrap: state.scrap,
    integrity: state.integrity,
    wall: state.wall,
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    turnPlayer: currentPlayer(state).id,
    turnCount: state.turnCount,
    collapses: state.collapses,
    furiaRey: state.furiaRey ?? 0,
    ...(state.dado ? { dado: state.dado } : {}),
    ...(state.bendiciones ? { bendiciones: state.bendiciones } : {}),
    // V40 · lo del Mazo (cargas, Engaño, Pasar, Chancho), para que la interfaz lo enseñe
    ...(state.cargas ? { cargas: state.cargas } : {}),
    ...(state.engano ? { engano: state.engano } : {}),
    ...(state.pasado ? { pasado: true } : {}),
    ...(state.cadena ? { cadena: state.cadena } : {}),
    ...(state.furiaMazo ? { furiaMazo: state.furiaMazo } : {}),
    phase: state.phase,
    unseen: sortCards([...state.deck, ...state.players.filter((p) => p.id !== playerId).flatMap((p) => [...p.hand, ...p.reserve])]),
    discard: sortCards(state.discard),
    exhausted: state.exhausted.length,
    burned: state.burned.length,
  };
}

/** Oculta a quien no es su dueño las cartas robadas y las que pasan por el andamio. */
export function eventsFor(events: GameEvent[], playerId: string): GameEvent[] {
  return events.map((ev) => {
    if (ev.e === 'draw' && ev.player !== playerId) return { e: 'draw', player: ev.player, count: ev.count };
    if (ev.e === 'stash' && ev.player !== playerId) return { e: 'stash', player: ev.player };
    return ev;
  });
}
