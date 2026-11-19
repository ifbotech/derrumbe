// CAMPAÑA — roguelike de construcción de mazo. Sirve igual en solitario (corre en el cliente)
// y en sala online (corre en el servidor): es un reductor puro y determinista. Con la misma
// semilla y las mismas decisiones, la campaña es idéntica.
//
//   Sobre lacrado → [ Mapa del castillo: ruta con Juramento (o Atajo, solo en el asalto 3) → asalto →
//                     Botín + selección (+ botín de monarca) → La Taberna → (Secreto de la cripta tras
//                     los monarcas de los asaltos 2 y 4) ] × 5 → Trono infinito
// Los asaltos 1 y 2 tienen menos tronos (2 y 3): los palos presentes se sortean al crear la campaña.
// En el código los nombres internos siguen siendo los de antes (stage, boss, contract, shop, event…).
import { Autopsy, autopsy } from './autopsy';
import { BALANCE, fill } from './balance-config';
import { ARBOL, Nodo, cifraDe, cleanUp as limpiaArbol, comprarNodo, rangoDe } from './arbol';
import { Caida, Pieza, caidaDe, caidaVacia, sumaPiezas } from './caida';
import { Tirada, multiplicadores, tirarHuesos } from './huesos';
import { AvisoArbol, ESQUIRLAS_POR_CORONA, META_11, META_38, META_40, META_40B, RUN_11, mazoDe, migraMeta11, migraMeta38, migraMeta40, migraMeta40c, migraRun11, recortaMeta10 } from './migracion';
import { CIFRAS_MAZO, MANO_BASE, MAZO_INICIAL, MZ, TRUCO_MAX, esMazo } from './mazos';
import type { Cargas, MazoId, ReglaId } from './mazos';
import { CABALLO, Card, Config, DEFAULT_CONFIG, FIGURAS, FORM, FORMATIONS, Formation, GameEvent, GameState, MAX_NUM, REY, SEALS, SOTA, Seal, SUITS, Suit, TREATMENTS, Treatment, cardValue, newTowers, nextRandom, seedFrom, shuffle, standardDeck, tiraDado } from './engine';
import { ES_PLANTILLAS } from './plantillas';
import { BASE_POOL, SPECIAL } from './specials';
import { Arch, BOXES, RARITY, Rarity, TOOL, TOOL_SLOTS, ToolInst, toolPool, placeTool } from './tools';
import { BENDICION, PALO_DE_REY, REY_IDS, REY_NOMBRE, bendicionesDe, cierreBendiciones, escudoInicial, esDe, nivelesCfg, nivelesReyes, ofertaBendiciones, reyesEnOferta } from './reyes';
import type { BendInst, OpcionBend, ReyId } from './reyes';

export const MIN_DECK = 12;
export const LAST_STAGE = 5;
/**
 * Versión del formato de campaña guardada. 8 desde el tramo 1c de la V40 (los 4 Reyes: `bendiciones`, `oferta`, y los
 * monarcas son Reyes). Una de la 6 o la 7 (tramos 1a y 1b, con rasgos y monarcas viejos) no se puede seguir: se
 * descarta con un aviso (`campanaSinReyes`). Una de antes (5, o la 4 de la 11.0) se jugaba con la baraja francesa: se
 * descarta igual (`campanaFrancesa`).
 */
export const RUN_VERSION = 8;

/**
 * Niveles de obra (ascensos). El nivel 1 es la obra limpia; cada nivel siguiente añade un giro
 * a todos los anteriores. `run.ascension` es el índice: 0 para el nivel 1, 7 para el nivel 8.
 */
export interface Ascension {
  name: string;
  desc: string;
}
/** Cifras de los Reinados (`reinados` y `clausura` de balance-config.json). */
const REIN = BALANCE.reinados;
export const ASCENSIONS: Ascension[] = [
  { name: 'Reinado de paz', desc: 'Las reglas de siempre.' },
  { name: 'Corazas finas', desc: 'Todos los guardias tienen un {pct} % más de Vida.' },
  { name: 'Corte airada', desc: 'Cada Mazo agotado sube la Furia {furia} más.' },
  { name: 'Reyes acorazados', desc: 'En los asaltos con monarca, los Reyes tienen un {reyes} % más de Vida.' },
  { name: 'Rey colérico', desc: 'El Ataque de los Reyes sube {rey}.' },
  { name: 'Heridas viejas', desc: 'Tu Vida máxima baja {heridas}.' },
  { name: 'Guardia de noche', desc: 'El Ataque de las Sotas y los Caballos sube {noche}.' },
  { name: 'Puertas selladas', desc: 'Solo en el asalto {asaltos}, el Ataque de los cuatro tronos sube {clausura}.' },
];
export const MAX_ASCENSION = ASCENSIONS.length - 1;

// ───────────────────────── Obras y jefes ─────────────────────────

export interface StageDef {
  name: string;
  floors: number[];
  /** Tronos en pie al empezar (2 a 4). Los que faltan se crean sin guardias y con `away`. */
  thrones: number;
  /** El Mapa ofrece Atajo (saltar el asalto a cambio de un premio). */
  atajo: boolean;
  /** El monarca de este asalto lleva el título de Rey Tirano (o Reina Tirana). */
  tirano?: true;
  /** Multiplicador de la resistencia base de los pisos. */
  hp: number;
  /** Se suma a la amenaza base. */
  threat: number;
  boss: boolean;
}
/**
 * Cinco asaltos (SPECS/V11.md, apartado 1.6): el primero, de dos tronos, enseña; el quinto es el Salón del
 * Trono, con su Rey Tirano. La Vida y el Ataque de cada uno salen de `asaltos` en balance-config.json.
 */
const STAGE_DEFS: Omit<StageDef, 'hp' | 'threat'>[] = [
  { name: 'El Puente levadizo', floors: [SOTA], thrones: 2, atajo: false, boss: false },
  { name: 'El Patio de armas', floors: [SOTA, CABALLO], thrones: 3, atajo: false, boss: true },
  { name: 'La Cripta', floors: [SOTA, CABALLO], thrones: 4, atajo: true, boss: false },
  { name: 'La Galería real', floors: [...FIGURAS], thrones: 4, atajo: false, boss: true },
  { name: 'El Salón del Trono', floors: [...FIGURAS], thrones: 4, atajo: false, boss: true, tirano: true },
];
/** Los cinco asaltos: su Vida (`hp`) y su Ataque (`threat`) salen de `asaltos` en balance-config.json. */
export const STAGES: StageDef[] = STAGE_DEFS.map((s, i) => {
  const { hp, threat } = BALANCE.asaltos[i];
  return { ...s, floors: [...s.floors], hp, threat };
});
/** El asalto n. Más allá del quinto empieza el Trono infinito: cuatro tronos, siempre con monarca y cada vez más duro. */
export function stageDef(n: number): StageDef {
  if (n <= LAST_STAGE) return STAGES[n - 1];
  const depth = n - LAST_STAGE;
  return { name: `Trono infinito ${depth}`, floors: [...FIGURAS], thrones: 4, atajo: false, hp: Math.round(STAGES[LAST_STAGE - 1].hp * BALANCE.tronoInfinito.hpCrece ** depth * 10) / 10, threat: STAGES[LAST_STAGE - 1].threat + Math.ceil(depth / 2), boss: true };
}
/** Tras estos asaltos (los de los dos primeros monarcas) aparece un Secreto de la cripta. */
export const EVENT_AFTER = [2, 4];

/** El título del monarca del Salón del Trono, según su género (claves `asalto.tirano.m` y `asalto.tirano.f`). */
export const TIRANO: Record<'m' | 'f', string> = { m: 'Rey Tirano', f: 'Reina Tirana' };
/** La clave del título de Tirano que lleva un monarca (`asalto.tirano.f` si es una reina). */
export const tiranoKey = (bossId: string): 'asalto.tirano.m' | 'asalto.tirano.f' => (BOSS[bossId]?.fem ? 'asalto.tirano.f' : 'asalto.tirano.m');

/** Vida de un guardia redondeada al múltiplo de 5 más cercano, nunca menos de 5: «25 × 4 = 100» se lee de un vistazo. */
export const roundHp = (hp: number): number => Math.max(5, Math.round(hp / 5) * 5);

export interface Boss {
  /** V40 1c · El id del Rey (`espadas`, `bastos`, `oros`, `copas`): también su clave `monarca.<id>.*` y `rey.<id>.*`. */
  id: ReyId;
  /** El palo de su Casa: en su asalto, esa Casa va la última y él es su último guardia. */
  palo: Suit;
  /** El personaje. */
  who: string;
  /** Es una reina: en el Salón del Trono se la llama «Reina Tirana». */
  fem?: true;
  /** Su maldición. */
  name: string;
  desc: string;
  /** Su voz de mesa (≤ 70 caracteres, sin cifras ni palabras de reglas): al entrar, al contraatacar y al caer. */
  barks: BossBarks;
  /** La maldición a la vista: qué parte de la mesa toca y su placa (≤ 28 caracteres). */
  curse: BossCurse;
  apply(cfg: Config): void;
}
export interface BossBarks {
  entrada: string;
  contraataque: string;
  caida: string;
}
/** La parte de la mesa que castiga cada maldición (una distinta por monarca). */
export type CurseMark = 'contraataque' | 'mano' | 'corazones' | 'escudo' | 'guardias' | 'ataque' | 'asedio';
export interface BossCurse {
  mark: CurseMark;
  badge: string;
}
const eachHand = (c: Config, n: number) => void (c.handSize = Object.fromEntries(Object.entries(c.handSize).map(([k, v]) => [k, Math.max(3, v + n)])));
const eachThreat = (c: Config, n: number) => void FIGURAS.forEach((r) => (c.floorThreat[r] = Math.max(1, c.floorThreat[r] + n)));
/** Cifras de los Reyes (`reyes` de balance-config.json). */
const RY = BALANCE.reyes;
/**
 * V40 1c · Los 4 Reyes jefe (src/rules/reyes.ts). Cada uno cierra su Casa en los asaltos 2, 4 y 5, con la Furia que
 * sube cada turno que sigue al frente (`reyes.<id>.furia`) y un rasgo de combate propio, a la vista en su placa.
 */
export const BOSSES: Boss[] = [
  {
    id: 'espadas',
    palo: 'S',
    who: 'El Rey de Espadas',
    name: 'Filo del Rey',
    desc: 'Mientras está al frente, su Contraataque atraviesa {perfora} de tu Escudo.',
    barks: { entrada: 'Desenvainá, si te da el pulso. Yo canto truco con la espada.', contraataque: '¡Quiero retruco! Y te lo firmo con la punta.', caida: 'Me ganaste de mano... guardá ese filo, que era el mío.' },
    curse: { mark: 'escudo', badge: 'Atraviesa {perfora} de Escudo' },
    apply: (c) => void (c.jefe && (c.jefe.perfora = RY.espadas.perfora)),
  },
  {
    id: 'bastos',
    palo: 'C',
    who: 'El Rey de Bastos',
    name: 'Corteza de roble',
    desc: 'Mientras está al frente, no queda Expuesto ni Aturdido.',
    barks: { entrada: 'Soy de madera dura, pibe. Acá no entra ni el envido.', contraataque: 'Un garrotazo de los de antes. ¿Quiero vale cuatro?', caida: 'Me partiste el palo... nunca supe que era de astillas.' },
    curse: { mark: 'guardias', badge: 'Ni Expuesto ni Aturdido' },
    apply: (c) => void (c.jefe && (c.jefe.sinFx = true)),
  },
  {
    id: 'oros',
    palo: 'D',
    who: 'El Rey de Oros',
    name: 'Diezmo',
    desc: 'Mientras está al frente, cada turno tira un dado: su Contraataque suma de +1 a +{dado}.',
    barks: { entrada: 'Todo tiene precio en mi mesa, hasta tu suerte. ¿Apostamos?', contraataque: 'La casa siempre cobra, querido. Y hoy la casa soy yo.', caida: 'Me vaciaste el arcón... llevate el naipe bravo, ya fue.' },
    curse: { mark: 'contraataque', badge: 'Suma un dado de +1 a +{dado}' },
    apply: (c) => void (c.jefe && (c.jefe.dado = RY.oros.dado)),
  },
  {
    id: 'copas',
    palo: 'H',
    who: 'El Rey de Copas',
    name: 'Brindis del Rey',
    desc: 'Cada turno que sigue al frente, se cura {cura} de Vida.',
    barks: { entrada: 'Pasá, sentate. La primera copa siempre la invito yo.', contraataque: '¿No brindás conmigo? Entonces tomá esto, a tu salud.', caida: 'Se me volcó la copa en el paño... qué final tan seco.' },
    curse: { mark: 'asedio', badge: 'Se cura {cura} por turno' },
    apply: (c) => void (c.jefe && (c.jefe.cura = RY.copas.cura)),
  },
];
/** V40 1c · Los siete monarcas sueltos de antes (ya no existen): sus ids, para migrar trofeos y Colección. */
export const MONARCAS_VIEJOS: Record<string, ReyId> = { doble: 'espadas', furia: 'espadas', blindaje: 'bastos', intemperie: 'bastos', escasez: 'oros', inestable: 'oros', sequia: 'copas' };
/** Cifras de cada decreto para su texto y su placa. */
const BOSS_NUMS: Record<string, Record<string, number>> = RY as unknown as Record<string, Record<string, number>>;
for (const b of BOSSES) {
  b.desc = fill(b.desc, BOSS_NUMS[b.id] ?? {});
  b.curse.badge = fill(b.curse.badge, BOSS_NUMS[b.id] ?? {});
}
export const BOSS: Record<string, Boss> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

/** Lo que la mesa necesita para reconocer a un monarca: quién es, su maldición, su voz y su placa. */
export interface BossIdentity {
  who: string;
  name: string;
  desc: string;
  barks: BossBarks;
  curse: BossCurse;
}
/** La identidad de un monarca por su `id`; null si no existe. Pura: copia los datos, no los comparte. */
export function bossIdentity(id: string): BossIdentity | null {
  const b = BOSS[id];
  if (!b) return null;
  return { who: b.who, name: b.name, desc: b.desc, barks: { ...b.barks }, curse: { ...b.curse } };
}

// ───────────────────────── Contratos (rutas del plano) ─────────────────────────

/** Lo que pasó en la obra en curso, para comprobar contratos. */
export interface BattleStats {
  taken: number;
  cleans: number;
  jokers: number;
  forms: Formation[];
}

export interface Contract {
  id: string;
  name: string;
  /** La condición (o la traba, si es de riesgo). */
  desc: string;
  reward: string;
  /** De riesgo: endurece la obra y paga siempre que la termines. */
  risk?: boolean;
  cfg?(c: Config): void;
  done?(b: BattleStats, state: GameState, run: Run): boolean;
  pay(run: Run): void;
}
const turnLimit = (run: Run) => 3 + 4 * stageDef(run.stage).floors.length;
export const CONTRACTS: Contract[] = [
  { id: 'intacto', name: 'Piel intacta', desc: 'Terminá el asalto sin perder Vida.', reward: '+8 de oro', done: (b) => b.taken === 0, pay: (run) => void (run.gold += 8) },
  { id: 'limpios', name: 'Pulso firme', desc: 'Da 3 Golpes exactos.', reward: 'Un sello de lacre al azar', done: (b) => b.cleans >= 3, pay: (run) => void stampRandom(run, 1) },
  { id: 'rapido', name: 'Al galope', desc: 'Ganá el asalto en 3 turnos + 4 por guardia de cada trono, o menos (3 guardias: 15).', reward: '+6 de oro', done: (_, s, run) => s.turnCount < turnLimit(run), pay: (run) => void (run.gold += 6) },
  { id: 'sincolapso', name: 'Mazo medido', desc: 'Terminá sin que se agote el Mazo.', reward: '+5 de oro', done: (_, s) => s.collapses === 0, pay: (run) => void (run.gold += 5) },
  { id: 'austero', name: 'Sin motines', desc: 'No juegues ningún Comodín.', reward: 'Un acabado al azar', done: (b) => b.jokers === 0, pay: (run) => void treatRandom(run) },
  { id: 'maestra', name: 'Jugada maestra', desc: 'Jugá un color, un full, un póker o una escalera de color.', reward: 'Un Pergamino al azar', done: (b) => b.forms.some((f) => ['color', 'full', 'poker', 'escaleracolor'].includes(f)), pay: (run) => void run.levels[pick(run, FORMATIONS, 1)[0]]++ },
  { id: 'horas', name: 'Noche larga', desc: 'El Ataque de todos los tronos sube 1.', reward: '+10 de oro', risk: true, cfg: (c) => eachThreat(c, 1), pay: (run) => void (run.gold += 10) },
  { id: 'sinred', name: 'Sin escudo', desc: 'El Escudo no puede pasar de 2.', reward: 'Una reliquia Rara o mejor', risk: true, cfg: (c) => void (c.wallCap = Math.min(c.wallCap, 2)), pay: (run) => void grantTool(run, ['oficio', 'capataz', 'reliquia']) },
  { id: 'corta', name: 'Conjura corta', desc: 'Juegan con 1 carta menos en la mano.', reward: '+12 de oro', risk: true, cfg: (c) => eachHand(c, -1), pay: (run) => void (run.gold += 12) },
];
export const CONTRACT: Record<string, Contract> = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));

// ───────────────────────── Etiquetas sindicales (premio por saltar una obra) ─────────────────────────

export interface Tag {
  id: string;
  name: string;
  desc: string;
  apply(run: Run): void;
}
export const TAGS: Tag[] = [
  { id: 'vale', name: 'Llave de la Pulpería', desc: 'En la próxima Pulpería, reliquias, sobres y Mesa de lacre son gratis.', apply: (run) => void (run.freeShop = true) },
  { id: 'envio', name: 'Contrabando', desc: 'Recibís ya una reliquia Noble o Regia.', apply: (run) => void (grantTool(run, ['capataz', 'reliquia']) || (run.gold += 12)) },
  { id: 'molde', name: 'Molde de cera', desc: 'Duplicas la carta de tu Mazo que elijas.', apply: (run) => void (run.pending = { kind: 'dup' }) },
  { id: 'liquidacion', name: 'Botín escondido', desc: '+15 de oro.', apply: (run) => void (run.gold += 15) },
  { id: 'timbrado', name: 'Lacre doble', desc: 'Dos cartas al azar de tu Mazo reciben un sello de lacre.', apply: (run) => void stampRandom(run, 2) },
];
export const TAG: Record<string, Tag> = Object.fromEntries(TAGS.map((t) => [t.id, t]));

// ───────────────────────── Hallazgos en los cimientos ─────────────────────────

/** Una opción leída en dos segundos: lo que da y lo que cuesta (≤ 24 caracteres; `cost` vacío si es gratis) y su emblema. */
export interface EventRead {
  gain: string;
  cost: string;
  /** Clave del emblema en el arte (GLYPH de src/client/glyphs.ts). */
  glyph: string;
}
export interface EventOption {
  label: string;
  desc: string;
  read: EventRead;
  can?(run: Run): boolean;
  apply(run: Run): void;
}
export interface EventDef {
  id: string;
  name: string;
  text: string;
  options: EventOption[];
}
export const EVENTS: EventDef[] = [
  {
    id: 'caja',
    name: 'El cofre enterrado',
    text: 'Entre dos tumbas asoma un cofre con candado. Forzarlo hará temblar media cripta.',
    options: [
      { label: 'Forzarlo', read: { gain: 'Reliquia Noble o Regia', cost: '−5 de Vida', glyph: 'contenedor' }, desc: 'Perdés 5 de Vida. Te llevás una reliquia Noble o Regia.', can: (run) => run.integrity > 5 && run.tools.length < TOOL_SLOTS, apply: (run) => void ((run.integrity -= 5), grantTool(run, ['capataz', 'reliquia'])) },
      { label: 'Vendérselo al Tratante', read: { gain: '+8 de oro', cost: '', glyph: 'oro' }, desc: '+8 de oro.', apply: (run) => void (run.gold += 8) },
    ],
  },
  {
    id: 'horno',
    name: 'El caldero del alquimista',
    text: 'Un caldero hierve solo en un rincón. Lo que entra, sale convertido en otra cosa.',
    options: [
      { label: 'Fundir dos cartas', read: { gain: 'Carta en Lacre policromo', cost: 'Dos cartas arden', glyph: 'crisol' }, desc: 'Elegís dos: arden y nace una con el número más alto, en Lacre policromo y con el sello que llevaran.', can: (run) => run.deck.filter(isPlain).length > MIN_DECK, apply: (run) => void (run.pending = { kind: 'fuse' }) },
      { label: 'Calentarse y seguir', read: { gain: '+4 de Vida', cost: '', glyph: 'reparacion' }, desc: '+4 de Vida.', apply: (run) => void (run.integrity = Math.min(run.maxIntegrity, run.integrity + 4)) },
    ],
  },
  {
    id: 'contrato',
    name: 'El decreto maldito',
    text: 'Un decreto clavado en la puerta promete una cifra enorme. La letra pequeña habla del próximo asalto.',
    options: [
      { label: 'Firmar', read: { gain: '+20 de oro', cost: '+1 Ataque próximo asalto', glyph: 'nitro' }, desc: '+20 de oro ahora. En el próximo asalto, el Ataque de los cuatro tronos sube 1.', apply: (run) => void ((run.gold += 20), (run.curse = true)) },
      { label: 'Romperlo', read: { gain: '+3 de oro', cost: '', glyph: 'retirar' }, desc: 'El papel arde bien: +3 de oro.', apply: (run) => void (run.gold += 3) },
    ],
  },
  {
    id: 'clandestino',
    name: 'Los lacradores ciegos',
    text: 'Tres monjes sellan a la luz de una vela lo que les pongas delante, y no aceptan regateos.',
    options: [
      { label: 'Pagar con Vida', read: { gain: '3 cartas con sello', cost: '−6 de Vida', glyph: 'sello' }, desc: 'Perdés 6 de Vida. Tres cartas al azar reciben un sello de lacre.', can: (run) => run.integrity > 6, apply: (run) => void ((run.integrity -= 6), stampRandom(run, 3)) },
      { label: 'Pagar con oro', read: { gain: 'Tu mejor carta policroma', cost: '−8 de oro', glyph: 'forja' }, desc: '8 de oro. Tu carta más alta recibe Lacre policromo.', can: (run) => run.gold >= 8, apply: (run) => void ((run.gold -= 8), treatBest(run, 'policromado')) },
      { label: 'Seguir de largo', read: { gain: 'Nada cambia', cost: '', glyph: 'atajo' }, desc: 'Nada cambia.', apply: () => {} },
    ],
  },
  {
    id: 'planos',
    name: 'Los mapas escondidos',
    text: 'Tras una losa están los mapas del castillo. Arrancarlos hace crujir lo poco que los protege.',
    options: [
      { label: 'Arrancarlos', read: { gain: '2 formaciones +2 niveles', cost: '−3 de Vida máxima', glyph: 'plano' }, desc: 'Perdés 3 de Vida máxima para siempre. Dos formaciones al azar suben 2 niveles.', can: (run) => run.maxIntegrity > 8, apply: (run) => void ((run.maxIntegrity -= 3), (run.integrity = Math.min(run.integrity, run.maxIntegrity)), pick(run, FORMATIONS, 2).forEach((f) => (run.levels[f] += 2))) },
      { label: 'Copiarlos a mano', read: { gain: '1 formación +1 nivel', cost: '−5 de oro', glyph: 'pergamino' }, desc: '5 de oro. Una formación al azar sube 1 nivel.', can: (run) => run.gold >= 5, apply: (run) => void ((run.gold -= 5), run.levels[pick(run, FORMATIONS, 1)[0]]++) },
      { label: 'Dejarlos donde están', read: { gain: 'Nada cambia', cost: '', glyph: 'atajo' }, desc: 'Nada cambia.', apply: () => {} },
    ],
  },
];
/** V35 · Apunta lo que salió en un santuario, para enseñarlo. */
const sale = (run: Run, clave: string, buena: boolean, datos: Record<string, number> = {}, mas: { reliquia?: string; rey?: ReyId; bendicion?: string } = {}) => void (run.suerte = { clave, datos, buena, ...mas });
EVENTS.push(
  {
    id: 'rueda',
    name: 'La rueda de la fortuna',
    text: 'Una rueda de carro cuelga del techo, pintada en cuatro gajos. Alguien dejó la manivela puesta.',
    options: [
      {
        label: 'Girar la rueda',
        read: { gain: 'Oro, Vida o Reliquia', cost: '1 de 4: −4 de Vida', glyph: 'dados' },
        desc: 'Sale un gajo al azar: +12 de oro, +6 de Vida, una Reliquia Rara o −4 de Vida.',
        can: (run) => run.integrity > 4,
        apply: (run) => {
          const gajo = Math.floor(nextRandom(run) * 4);
          if (gajo === 0) (run.gold += 12), sale(run, 'rueda.oro', true, { n: 12 });
          else if (gajo === 1) (run.integrity = Math.min(run.maxIntegrity, run.integrity + 6)), sale(run, 'rueda.vida', true, { n: 6 });
          else if (gajo === 2 && grantTool(run, ['oficio'])) sale(run, 'rueda.reliquia', true, {}, { reliquia: run.tools[run.tools.length - 1].id });
          else if (gajo === 2) (run.gold += 12), sale(run, 'rueda.lleno', true, { n: 12 });
          else (run.integrity -= 4), sale(run, 'rueda.negro', false, { n: 4 });
        },
      },
      { label: 'No tocarla', read: { gain: '+3 de oro', cost: '', glyph: 'oro' }, desc: 'Te llevás las monedas del suelo: +3 de oro.', apply: (run) => void (run.gold += 3) },
    ],
  },
  {
    id: 'doble',
    name: 'Los huesos del diablo',
    text: 'Un tahúr sin rostro agita dos huesos en un cubilete. Mira tu bolsa de esquirlas y sonríe.',
    options: [
      {
        label: 'Doble o nada',
        read: { gain: 'Esquirlas ×2', cost: '1 de 2: las perdés', glyph: 'dados' },
        desc: 'Te jugás las esquirlas de esta campaña: 1 de cada 2 veces se doblan; si no, las perdés.',
        can: (run) => run.esquirlas > 0,
        apply: (run) => {
          const antes = run.esquirlas;
          if (nextRandom(run) < 0.5) (run.esquirlas = antes * 2), sale(run, 'doble.si', true, { a: antes, b: antes * 2 });
          else (run.esquirlas = 0), sale(run, 'doble.no', false, { a: antes });
        },
      },
      { label: 'Guardar la bolsa', read: { gain: 'Nada cambia', cost: '', glyph: 'atajo' }, desc: 'Nada cambia.', apply: () => {} },
    ],
  },
  {
    id: 'altar',
    name: 'El altar de sangre',
    text: 'Un altar con cuatro coronas. El cuenco del centro pide algo tuyo antes de dar nada.',
    options: [
      {
        label: 'Ofrecer tu sangre',
        read: { gain: 'Bendición de tu Rey', cost: '−3 de Vida máxima', glyph: 'corazon' },
        desc: 'Perdés 3 de Vida máxima para siempre. El Rey del que más Bendiciones llevás te da otra.',
        can: (run) => run.maxIntegrity > 8 && !!reyMayor(run),
        apply: (run) => {
          const rey = reyMayor(run)!;
          const libres = bendicionesDe(rey).filter((b) => !run.bendiciones.some((x) => x.id === b.id));
          run.maxIntegrity -= 3;
          run.integrity = Math.min(run.integrity, run.maxIntegrity);
          if (libres.length) {
            const id = libres[Math.floor(nextRandom(run) * libres.length)].id;
            tomaBendicion(run, id);
            sale(run, 'altar.si', true, { n: nivelesReyes({ bendiciones: run.bendiciones })[rey].n }, { rey, bendicion: id });
          } else (run.gold += 10), sale(run, 'altar.no', true, { n: 10 }, { rey });
        },
      },
      { label: 'Rezar y seguir', read: { gain: '+3 de Vida', cost: '', glyph: 'reparacion' }, desc: '+3 de Vida.', apply: (run) => void (run.integrity = Math.min(run.maxIntegrity, run.integrity + 3)) },
    ],
  },
  {
    id: 'dado',
    name: 'El dado de dos caras',
    text: 'Sobre una losa hay un dado de hueso: tres caras blancas, tres negras. Solo se puede tirar una vez.',
    options: [
      {
        label: 'Tirarlo',
        read: { gain: '2 formaciones +1 nivel', cost: '1 de 2: +1 Ataque', glyph: 'dados' },
        desc: 'Blanca: 2 formaciones suben 1 nivel. Negra: +10 de oro y +1 de Ataque en el próximo asalto.',
        apply: (run) => {
          if (nextRandom(run) < 0.5) {
            for (const fo of pick(run, FORMATIONS, 2)) run.levels[fo] += 1;
            sale(run, 'dado.blanca', true);
          } else {
            run.gold += 10;
            run.curse = true;
            sale(run, 'dado.negra', false, { n: 10 });
          }
        },
      },
      { label: 'Dejarlo quieto', read: { gain: '+2 de Vida', cost: '', glyph: 'reparacion' }, desc: '+2 de Vida.', apply: (run) => void (run.integrity = Math.min(run.maxIntegrity, run.integrity + 2)) },
    ],
  },
);
export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

// ───────────────────────── Árbol de la Conjura (progreso permanente) ─────────────────────────
// Los 30 nodos viven en arbol.ts. `UPGRADES`, `buyUpgrade` y `cleanUp` quedan como alias para el laboratorio,
// el cooperativo y el cliente de la 11.0.

/** Un nodo del Árbol (alias de la 11.0: las mejoras de La Orden son nodos del Arsenal con su mismo `id`). */
export type Upgrade = Nodo;
/** Los 30 nodos del Árbol (alias de la 11.0). */
export const UPGRADES: Upgrade[] = ARBOL;
/** Mejoras de versiones anteriores que ya no existen: se devuelve el renombre gastado en ellas. */
const RETIRED: Record<string, number[]> = { seguro: [4, 8, 14], interes: [3, 6, 10], manos: [18], caja: [2, 4, 7, 11, 16], cimientos: [3, 5, 8, 12, 17], tienda: [8, 15] };

export interface Meta {
  /** Versión del gremio: al cambiar las mejoras se devuelve el renombre de las retiradas. */
  v: number;
  renown: number;
  up: Record<string, number>;
  runs: number;
  wins: number;
  best: number;
  ascMax: number;
  /** Logros conseguidos. */
  ach: Record<string, boolean>;
  /** Contadores acumulados entre campañas. */
  stats: { floors: number; cleans: number; maxHit: number; maxGold: number; reach: number; winAsc: number; intact: number; depth: number; forged: number; contracts: number; skips: number; maxTools: number };
  /** Colección: lo que alguna vez pasó por tus manos. */
  seen: { tools: string[]; specials: string[]; bosses: string[]; forms: string[] };
  /** Para no contar dos veces lo que acumula una campaña en curso. */
  last: { id: number; forged: number; contracts: number; skips: number };
  /** Sellos de maestría: el nivel de obra más alto ganado con cada herramienta en el cinturón y con cada baraja. */
  mastery: { tools: Record<string, number>; decks: Record<string, number> };
  /** Aviso de la migración a la V12 (Coronas → Esquirlas): el Árbol lo enseña una vez y lo borra. */
  aviso?: AvisoArbol;
}
/**
 * 7 desde los 4 Reyes de la V40 (los trofeos y la Colección de monarcas pasan a los Reyes); 6 desde los 5 Mazos de la V40 (la maestría va por Mazo); 5 desde la V40 (sin Asalto diario: se van `daily` y `stats.dailies`); 4 desde la V12 (Árbol de la Conjura, `renown`
 * en Esquirlas de Corona). Ver `loadMeta` y src/rules/migracion.ts.
 */
export const META_VERSION = 7;
export const newMeta = (): Meta => ({
  v: META_VERSION,
  renown: 0,
  up: {},
  runs: 0,
  wins: 0,
  best: 0,
  ascMax: 0,
  ach: {},
  stats: { floors: 0, cleans: 0, maxHit: 0, maxGold: 0, reach: 0, winAsc: -1, intact: 0, depth: 0, forged: 0, contracts: 0, skips: 0, maxTools: 0 },
  seen: { tools: [], specials: [], bosses: [], forms: [] },
  last: { id: 0, forged: 0, contracts: 0, skips: 0 },
  mastery: { tools: {}, decks: {} },
});

/** Carga un gremio guardado (de esta versión o de una anterior) sobre uno nuevo. */
export function loadMeta(saved: unknown): Meta {
  const base = newMeta();
  if (!saved || typeof saved !== 'object') return base;
  const old = saved as Partial<Meta> & { seen?: { relics?: string[] } & Partial<Meta['seen']>; daily?: { date: string; cleared: number; won: boolean } };
  const meta: Meta = { ...base, ...old, ach: { ...old.ach }, stats: { ...base.stats, ...old.stats }, seen: { ...base.seen, ...old.seen }, last: { ...base.last, ...old.last }, up: { ...old.up }, mastery: { tools: { ...old.mastery?.tools }, decks: { ...old.mastery?.decks } } };
  meta.ascMax = Math.max(0, Math.min(MAX_ASCENSION, meta.ascMax));
  const v = Number(old.v ?? 1) || 1;
  if (v < 2) {
    // perfiles de antes de la 2: las mejoras cambiaron de arriba abajo, se devuelve todo lo gastado y se empieza de cero
    for (const [id, level] of Object.entries(meta.up)) for (let i = 0; i < level; i++) meta.renown += RETIRED[id]?.[i] ?? 0;
    meta.up = {};
    meta.seen.tools = [...new Set([...(old.seen?.relics ?? []), ...meta.seen.tools])].filter((id) => TOOL[id]);
  }
  // perfiles de la 10.0 (y anteriores): se conserva todo; solo lo que contaba asaltos se recorta a cinco
  if (v < 3) recortaMeta10(meta, LAST_STAGE);
  // perfiles de la 11.0 (y anteriores): Coronas × 100 y las mejoras de La Orden, tal cual, en el Arsenal
  if (v <= META_11) migraMeta11(meta, Object.fromEntries(ARBOL.map((n) => [n.id, n.rangos])));
  // perfiles de la 38.0 (y anteriores): fuera el Asalto diario; el Altar, los logros y la Colección siguen
  if (v <= META_38) migraMeta38(meta);
  // perfiles del tramo 1a de la V40: la maestría de cada baraja de inicio pasa a su Mazo
  if (v <= META_40) migraMeta40(meta);
  // perfiles del tramo 1b de la V40: los trofeos y los monarcas vistos pasan a los 4 Reyes
  if (v <= META_40B) migraMeta40c(meta, MONARCAS_VIEJOS);
  meta.v = META_VERSION;
  delete (meta.seen as { relics?: unknown }).relics;
  return meta;
}

/** Rangos válidos de cada nodo del Árbol (lo que llega de un cliente se recorta a su tope). Ver arbol.ts. */
export const cleanUp = limpiaArbol;

/** Compra el rango siguiente de un nodo (alias de `comprarNodo`: mira saldo, padre y tope). */
export const buyUpgrade = (meta: Meta, id: string): boolean => comprarNodo(meta, id);

// ───────────────────────── Campaña ─────────────────────────

export type OfferKind = 'tool' | 'sobre' | 'clandestino' | 'forja' | 'plano';
export interface Offer {
  kind: OfferKind;
  cost: number;
  sold?: boolean;
  /** tool: herramienta */
  id?: string;
  /** forja: lo que estampa */
  seal?: Seal;
  tr?: Treatment;
  /** plano: formación que sube de nivel */
  form?: Formation;
}

export type DraftOpt = { kind: 'special'; id: string } | { kind: 'card'; card: Card };
export type Pending = { kind: 'forge'; i: number } | { kind: 'dup' } | { kind: 'fuse' };

export interface MapNode {
  /** Contratos entre los que elegir (vacío en las obras con jefe). */
  routes: string[];
  /** Etiqueta que se cobra por saltar la obra (null si no se puede saltar). */
  tag: string | null;
}

/**
 * V29 · El Don de la Conjura: lo que se elige (uno de tres) al abrir la campaña. Una Reliquia común, un sello de lacre
 * sobre una carta numerada del Mazo o una bolsa de oro. Se sortea con la semilla de la campaña, aparte del resto
 * (no mueve ningún otro sorteo), así que la misma semilla ofrece siempre los mismos tres.
 */
export type Don = { kind: 'tool'; id: string } | { kind: 'sello'; seal: Seal; card: string } | { kind: 'oro'; n: number };

export type RunAction =
  /** Sobre: empezar la campaña con el Don i (sin `don`, sin regalo: la pantalla siempre manda uno). */
  | { t: 'begin'; don?: number }
  /** Plano: tomar la ruta i (su contrato) y entrar a la obra. */
  | { t: 'route'; i: number }
  /** Plano: saltar la obra a cambio de la etiqueta. */
  | { t: 'skip' }
  /** Cobro: llevarse la opción i de la selección, o ninguna (bonifica oro). */
  | { t: 'draft'; i: number | null }
  | { t: 'loot'; id: string | null }
  | { t: 'buy'; i: number }
  /** Sobre abierto: quedarse con la carta i. */
  | { t: 'open'; i: number }
  /** Resolver una elección pendiente de cartas (forja, molde, fundición). */
  | { t: 'target'; cards: string[] }
  | { t: 'cancel' }
  | { t: 'burn'; card: string }
  | { t: 'heal' }
  | { t: 'sell'; i: number }
  | { t: 'reroll' }
  | { t: 'next' }
  | { t: 'event'; i: number }
  /** V40 1c · Oferta de Bendiciones: tomar la opción i. */
  | { t: 'bendicion'; i: number }
  /** Cinturón: nuevo orden de las herramientas (permutación de índices). */
  /** Tras el asalto 5: seguir en el Trono infinito. */
  | { t: 'endless' };

/** Con qué se monta una campaña: lo aporta el jugador (o el anfitrión de la sala). */
export interface RunOpts {
  up?: Record<string, number>;
  ascension?: number;
  deck?: string;
  /** Cartas especiales legendarias que el jugador tiene desbloqueadas. */
  pool?: string[];
  /** Semilla numérica, o un texto del que sacarla. */
  seed?: number;
  seedText?: string;
}

export interface Run {
  /** Versión del formato (RUN_VERSION). */
  v: number;
  id: number;
  /** La semilla, tal como se muestra y se comparte. */
  seedText: string;
  rng: number;
  ascension: number;
  /** V40 · El Mazo de la campaña (src/rules/mazos.ts). */
  deckId: string;
  /** V40 · Cargas permanentes de su Mazo (Escoba, Mano larga): crecen en los golpes y duran toda la campaña. */
  cargas: Cargas;
  /** V40 1c · Las Bendiciones tomadas, con sus cargas (`n`), en el orden en que llegaron. */
  bendiciones: BendInst[];
  /** V40 1c · La oferta en curso (en la fase `bendicion`), o null. */
  oferta: OpcionBend[] | null;
  /** V40 1c · El asalto de la última oferta (cada asalto ofrece una vez). */
  ofertaDe: number;
  up: Record<string, number>;
  /** Surtidos de esta campaña. */
  pool: string[];
  toolPool: string[];
  seals: Seal[];
  treats: Treatment[];
  stage: number;
  /** `bendicion` (V40 1c): la oferta de Bendiciones, al empezar la campaña y antes de cada asalto 2 a 5. */
  phase: 'pack' | 'bendicion' | 'map' | 'battle' | 'reward' | 'shop' | 'event' | 'won' | 'lost';
  gold: number;
  integrity: number;
  maxIntegrity: number;
  tools: ToolInst[];
  deck: Card[];
  levels: Record<Formation, number>;
  handBonus: number;
  interestCap: number;
  scrap: number;
  /** Jefes ya sorteados, a la vista en el plano desde el principio. */
  bosses: Record<number, string>;
  /** Palos de los tronos presentes en los asaltos que no tienen los cuatro (1 y 2), sorteados al crear la campaña. */
  palos: Record<number, Suit[]>;
  boss: string | null;
  node: MapNode;
  contract: string | null;
  /** Lo que pasó con el contrato de la última obra. */
  contractDone: boolean | null;
  /** El contrato maldito: la próxima obra tiene +1 de amenaza. */
  curse: boolean;
  freeShop: boolean;
  pack: string[];
  /** V29 · los tres Dones que ofrece la conjura al abrir la campaña (una campaña guardada antes de la 29.0 no los trae). */
  don?: Don[];
  /** El Don elegido (su índice), ya aplicado. */
  donTaken?: number;
  pay: [string, number][];
  draft: DraftOpt[];
  drafted: boolean;
  loot: string[];
  looted: boolean;
  shop: Offer[];
  /** Sobre abierto, esperando que elijas una de sus cartas. */
  sobre: string[] | null;
  pending: Pending | null;
  event: string | null;
  events: string[];
  /**
   * V35 · Lo que salió en el último santuario de azar (la pantalla siguiente lo enseña una vez): la clave de sus textos
   * (`suerte.<clave>.titulo` y `.texto` de plantillas.ts), sus cifras y, si los hay, la Reliquia, el Rey y la
   * Bendición que nombra.
   */
  suerte?: { clave: string; datos: Record<string, number>; reliquia?: string; rey?: ReyId; bendicion?: string; buena: boolean } | null;
  rerolls: number;
  vouchers: number;
  removals: number;
  heals: number;
  serial: number;
  battle: BattleStats;
  endless: boolean;
  /** Ya cayó la Torre Madre. */
  conquered: boolean;
  /** Obras que se saltaron por el atajo (para sellarlas en el plano). */
  skipped: number[];
  /** Jefes derrotados y obras terminadas con el búnker entero. */
  beaten: string[];
  intact: number;
  stats: { floors: number; cleans: number; turns: number; gold: number; maxHit: number; burned: number; forged: number; contracts: number; skips: number; toolUse: Record<string, number>; stageTurns: number[]; esquirlas: number; gotas: number; sellosGratis: number };
  /** Esquirlas de Corona de la mesa y de los huesos en esta campaña (se cobran al cerrarla, también al perder). */
  esquirlas: number;
  /** Gotas de lacre: con `caida.gotasPorSello`, la Mesa de lacre sella gratis. */
  gotas: number;
  /** Lo que cayó a la mesa en el asalto en curso (o en el último). */
  caida: Caida;
  /** La tirada de huesos del último asalto ganado (null hasta la primera o al empezar otro asalto). */
  ritual: Tirada | null;
  /** Esquirlas que llevaba la campaña al vencer a la corte (las ya cobradas si sigue al Trono infinito). */
  esquirlasCorte: number;
  /** Cartas (ids) que el Timbre del gremio selló al entrar a la obra en curso; vacío si no lo llevás. */
  stamped?: string[];
  /** Autopsia de la derrota: qué tiró el búnker en la última obra. La rellena `trackEvents` y se limpia al empezar otra obra. */
  death?: Autopsy | null;
}

const isPlain = (c: Card) => !c.sp && c.suit !== 'X';
const lvl = (run: Run, id: string) => run.up[id] ?? 0;
function pick<T>(run: Run, pool: T[], n: number): T[] {
  const copy = [...pool];
  shuffle(copy, run);
  return copy.slice(0, n);
}
const roll = (run: Run, n: number) => Math.floor(nextRandom(run) * n);
const vary = (run: Run, base: number) => Math.max(2, base + roll(run, 3) - 1);

/** n cartas especiales distintas del surtido. Las legendarias salen cuatro veces menos que las comunes. */
function rollSpecials(run: Run, n: number): string[] {
  const pool = [...run.pool];
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const weights = pool.map((id) => (SPECIAL[id]?.locked ? 1 : 4));
    let at = nextRandom(run) * weights.reduce((a, b) => a + b, 0);
    const i = weights.findIndex((w) => (at -= w) <= 0);
    out.push(...pool.splice(i < 0 ? pool.length - 1 : i, 1));
  }
  return out;
}

/** Una herramienta al azar del surtido, ponderada por rareza. */
function rollTool(run: Run, rarities: Rarity[], exclude: string[] = []): string | null {
  const owned = run.tools.map((t) => t.id);
  const pool = run.toolPool.filter((id) => !owned.includes(id) && !exclude.includes(id) && rarities.includes(TOOL[id].rarity));
  const total = pool.reduce((a, id) => a + RARITY[TOOL[id].rarity].weight, 0);
  if (!pool.length) return null;
  let at = nextRandom(run) * total;
  for (const id of pool) if ((at -= RARITY[TOOL[id].rarity].weight) <= 0) return id;
  return pool[pool.length - 1];
}
const ALL_RARITIES: Rarity[] = ['comun', 'oficio', 'capataz', 'reliquia'];

/**
 * V40 1c · El Rey del que más piezas llevás (a igualdad, el de la Bendición más reciente); null si no llevás ninguna.
 */
export function reyMayor(run: Pick<Run, 'bendiciones'>): ReyId | null {
  const nv = nivelesReyes({ bendiciones: run.bendiciones });
  let mejor: ReyId | null = null;
  for (const b of [...(run.bendiciones ?? [])].reverse()) {
    const r = BENDICION[b.id]?.rey;
    if (r && (!mejor || nv[r].n > nv[mejor].n)) mejor = r;
  }
  return mejor;
}

/** V40 1c · Toma una Bendición: entra con sus cargas a cero y hace su efecto inmediato (oro, Vida máxima…). */
export function tomaBendicion(run: Run, id: string): void {
  const d = BENDICION[id];
  if (!d || run.bendiciones.some((b) => b.id === id)) return;
  run.bendiciones.push({ id, n: 0 });
  d.toma?.(run);
}

/** El Cofre del monarca: tres Reliquias a elegir una, Raras, Nobles o Regias al azar. */
function cofreDelMonarca(run: Run): string[] {
  const out: string[] = [];
  while (out.length < 3) {
    const id = rollTool(run, ['oficio', 'capataz', 'reliquia'], out) ?? rollTool(run, ALL_RARITIES, out);
    if (!id) break;
    out.push(id);
  }
  return out;
}

function grantTool(run: Run, rarities: Rarity[]): boolean {
  if (run.tools.length >= TOOL_SLOTS) return false;
  const id = rollTool(run, rarities) ?? rollTool(run, ALL_RARITIES);
  if (!id) return false;
  placeTool(run.tools, { id, n: 0 });
  return true;
}
/** Sella n cartas de baraja al azar (de las que aún no llevan sello) y las devuelve. */
function stampRandom(run: Run, n: number): Card[] {
  const cards = pick(run, run.deck.filter((d) => isPlain(d) && !d.seal), n);
  for (const c of cards) {
    c.seal = pick(run, run.seals, 1)[0];
    run.stats.forged++;
  }
  return cards;
}
function treatRandom(run: Run): void {
  const [c] = pick(run, run.deck.filter((d) => isPlain(d) && !d.tr), 1);
  if (!c) return;
  c.tr = pick(run, run.treats, 1)[0];
  run.stats.forged++;
}
function treatBest(run: Run, tr: Treatment): void {
  const best = run.deck.filter((d) => isPlain(d) && !d.tr).sort((a, b) => cardValue(b) - cardValue(a))[0];
  if (!best) return;
  best.tr = tr;
  run.stats.forged++;
}

/** Añade una carta especial al mazo de la campaña. */
export function addSpecial(run: Run, spId: string): Card {
  const card: Card = { id: `sp-${spId}-${++run.serial}`, suit: 'X', rank: 0, sp: spId };
  run.deck.push(card);
  return card;
}

// ───────────────────────── Los 5 Mazos ─────────────────────────

/**
 * V40 · Un Mazo de inicio (SPECS/V40-REFUNDACION.md, apartado 5): la baraja con que se empieza y sus reglas, que el
 * motor aplica con `cfg.mazo` (src/rules/mazos.ts). Sustituye a las seis barajas de la baraja francesa.
 */
export interface DeckDef {
  id: MazoId;
  name: string;
  /** Lema de dos o tres palabras («Mesa barrida»). */
  lema: string;
  desc: string;
  /** Logro que lo desbloquea (null: disponible desde el principio). */
  unlock: string | null;
  /** Sus reglas, en el orden en que se explican. */
  reglas: ReglaId[];
  build(run: Run): void;
}
/** Suma (o quita) la Vida inicial propia de un Mazo (`mazos.<id>.vida`). */
const vidaMazo = (run: Run, n: number) => {
  run.maxIntegrity += n;
  run.integrity = run.maxIntegrity;
};
export const DECKS: DeckDef[] = [
  {
    id: 'escoba',
    name: 'Escoba',
    lema: 'Mesa barrida',
    desc: fill('Mano de {mano}. Si las cartas del golpe suman 15, ¡Escoba!: +{multi} de Multi y una carga de Daño.', CIFRAS_MAZO.escoba),
    unlock: null,
    reglas: ['escoba'],
    build: (run) => vidaMazo(run, MZ.escoba.vida),
  },
  {
    id: 'truco',
    name: 'Truco',
    lema: 'Envido y bravas',
    desc: fill('Del 1 al 7, mano de {mano} y {vida} de Vida. Los bravos pegan más; 2 del mismo palo cantan Envido.', CIFRAS_MAZO.truco),
    unlock: 'capataz',
    reglas: ['bravo', 'envido'],
    build: (run) => {
      run.deck = run.deck.filter((c) => c.suit === 'X' || c.rank <= TRUCO_MAX);
      vidaMazo(run, MZ.truco.vida);
    },
  },
  {
    id: 'chinchon',
    name: 'Chinchón',
    lema: 'Pierna y escalera',
    desc: fill('Tríos y escaleras del palo pegan más; las manos largas cargan Daño. Empezás con {vida} de Vida.', CIFRAS_MAZO.chinchon),
    unlock: 'media',
    reglas: ['pierna', 'escalera', 'larga'],
    build: (run) => vidaMazo(run, MZ.chinchon.vida),
  },
  {
    id: 'mentiroso',
    name: 'El Mentiroso',
    lema: 'Cara de piedra',
    desc: fill('Mano de {mano}, {n} Comodines que no gastan el turno y un Engaño por asalto. {vida} de Vida.', CIFRAS_MAZO.mentiroso),
    unlock: 'madre',
    reglas: ['piedra', 'engano'],
    build: (run) => {
      for (let i = 0; i < MZ.mentiroso.comodines; i++) run.deck.push({ id: `X${3 + i}`, suit: 'X', rank: 0 });
      vidaMazo(run, MZ.mentiroso.vida);
    },
  },
  {
    id: 'chancho',
    name: 'Chancho Va',
    lema: 'Mano al centro',
    desc: fill('Pasá 1 carta por turno y robá otra; el póker aturde en cadena. Empezás con {vida} de Vida.', CIFRAS_MAZO.chancho),
    unlock: 'golpe100',
    reglas: ['pasar', 'chancho', 'arranque'],
    build: (run) => vidaMazo(run, MZ.chancho.vida),
  },
];
export const DECK: Record<string, DeckDef> = Object.fromEntries(DECKS.map((d) => [d.id, d]));


/** Los tres Dones de una campaña: sorteo propio (un generador aparte sembrado con la semilla), sin tocar `run.rng`. */
function rollDon(run: Run): Don[] {
  let s = (run.id ^ 0x9e3779b9) >>> 0;
  const azar = (n: number): number => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0;
    return ((s ^ (s >>> 13)) >>> 0) % n;
  };
  const comunes = run.toolPool.filter((id) => TOOL[id]?.rarity === 'comun');
  const numeradas = run.deck.filter((c) => !c.sp && c.suit !== 'X' && !c.seal);
  const don: Don[] = [];
  if (comunes.length) don.push({ kind: 'tool', id: comunes[azar(comunes.length)] });
  if (numeradas.length && run.seals.length) don.push({ kind: 'sello', seal: run.seals[azar(run.seals.length)], card: numeradas[azar(numeradas.length)].id });
  don.push({ kind: 'oro', n: BALANCE.inicio.donOro });
  return don;
}

/** Aplica el Don i (una sola vez por campaña). */
function takeDon(run: Run, i: number): void {
  const d = run.don?.[i];
  if (!d || run.donTaken !== undefined) return;
  run.donTaken = i;
  if (d.kind === 'tool') placeTool(run.tools, { id: d.id, n: 0 });
  else if (d.kind === 'oro') run.gold += d.n;
  else {
    const c = run.deck.find((x) => x.id === d.card);
    if (c) c.seal = d.seal;
  }
}

export function newRun(opts: RunOpts, fallbackSeed = 1): Run {
  const seedText = typeof opts.seedText === 'string' && opts.seedText.trim() ? opts.seedText.trim().slice(0, 24).toUpperCase() : '';
  // «#K3F9QZ» es una semilla al azar tal como se enseña (base 36): se lee tal cual, sin hash, para que se repita
  const seed = /^#[0-9A-Z]{1,7}$/.test(seedText) ? parseInt(seedText.slice(1), 36) | 0 : seedText ? seedFrom(seedText) : ((Number.isFinite(opts.seed) ? Number(opts.seed) : fallbackSeed) | 0);
  const up = cleanUp(opts.up);
  const boxes = BOXES.filter((b) => up[`caja_${b}`]);
  const maxIntegrity = BALANCE.inicio.vida;
  const run: Run = {
    v: RUN_VERSION,
    id: seed,
    seedText: seedText || `#${(seed >>> 0).toString(36).toUpperCase()}`,
    rng: seed,
    ascension: Math.max(0, Math.min(MAX_ASCENSION, Math.floor(opts.ascension ?? 0) || 0)),
    deckId: DECK[mazoDe(opts.deck)] ? mazoDe(opts.deck) : MAZO_INICIAL,
    up,
    pool: [...new Set([...BASE_POOL, ...(Array.isArray(opts.pool) ? opts.pool.filter((id) => typeof id === 'string' && SPECIAL[id]) : [])])],
    toolPool: toolPool(boxes),
    seals: up.tampones ? [...SEALS] : ['eco', 'jornal'],
    treats: up.bronce ? [...TREATMENTS] : ['forjado', 'templado'],
    stage: 1,
    phase: 'pack',
    gold: BALANCE.inicio.oro + BALANCE.arbol.oroPorNivel * up.caja,
    integrity: maxIntegrity,
    maxIntegrity,
    tools: [],
    deck: standardDeck(),
    cargas: {},
    bendiciones: [],
    oferta: null,
    ofertaDe: 0,
    levels: Object.fromEntries(FORMATIONS.map((f) => [f, 0])) as Record<Formation, number>,
    handBonus: 0,
    interestCap: BALANCE.inicio.interesTope,
    scrap: 0,
    bosses: {},
    palos: {},
    boss: null,
    node: { routes: [], tag: null },
    contract: null,
    contractDone: null,
    curse: false,
    freeShop: false,
    pack: [],
    pay: [],
    draft: [],
    drafted: true,
    loot: [],
    looted: true,
    shop: [],
    sobre: null,
    pending: null,
    event: null,
    events: [],
    rerolls: 0,
    vouchers: 0,
    removals: 0,
    heals: 0,
    serial: 2,
    battle: { taken: 0, cleans: 0, jokers: 0, forms: [] },
    endless: false,
    conquered: false,
    skipped: [],
    beaten: [],
    intact: 0,
    stats: { floors: 0, cleans: 0, turns: 0, gold: 0, maxHit: 0, burned: 0, forged: 0, contracts: 0, skips: 0, toolUse: {}, stageTurns: [], esquirlas: 0, gotas: 0, sellosGratis: 0 },
    esquirlas: 0,
    gotas: 0,
    caida: caidaVacia(),
    ritual: null,
    esquirlasCorte: 0,
  };
  run.pack = rollSpecials(run, BALANCE.inicio.sobre);
  for (const id of run.pack) addSpecial(run, id);
  run.don = rollDon(run);
  if (run.ascension >= 5) run.maxIntegrity -= REIN.heridasViejas;
  run.integrity = Math.min(run.integrity, run.maxIntegrity);
  DECK[run.deckId].build(run);
  // los Reyes jefe (tres distintos) y los palos de los asaltos cortos se sortean ya: el Mapa los enseña desde el
  // principio. V40 1c: en un asalto corto con Rey, su palo siempre está (su Casa va la última)
  const bosses = pick(run, BOSSES, STAGES.filter((s) => s.boss).length).map((b) => b.id);
  STAGES.forEach((s, i) => s.boss && (run.bosses[i + 1] = bosses.shift()!));
  STAGES.forEach((s, i) => {
    if (s.thrones >= SUITS.length) return;
    const rey = run.bosses[i + 1] ? BOSS[run.bosses[i + 1]].palo : null;
    const chosen = rey ? [rey, ...pick(run, SUITS.filter((x) => x !== rey), s.thrones - 1)] : pick(run, SUITS, s.thrones);
    run.palos[i + 1] = SUITS.filter((x) => chosen.includes(x));
  });
  run.events = pick(run, EVENTS, EVENT_AFTER.length).map((e) => e.id);
  return run;
}

/** Cuánto más aguantan las obras según el tamaño de la cuadrilla (1 a 4 jugadores). */
const COOP_HP = BALANCE.cuadrilla;
/** V35 · Furia en campaña: lo que sube con cada Mazo agotado, con cada turno del monarca, y la Vida del monarca (× la de su guardia). */
export const FURIA: { mazo: number; rey: number; jefeVida: number } = BALANCE.furia;

/**
 * V35 · El orden en que se asaltan las Casas de un asalto: los tronos presentes, empezando por uno que depende de la
 * campaña y del asalto (así no se abre siempre por Espadas). V40 1c: en un asalto con Rey jefe, la Casa de su palo va
 * la última, y él es su último guardia.
 */
export function ordenCasas(run: Pick<Run, 'id' | 'stage' | 'palos'> & { bosses?: Record<number, string> }): Suit[] {
  const presentes = run.palos?.[run.stage] ?? [...SUITS];
  const k = Math.abs((run.id | 0) + run.stage * 7) % presentes.length;
  const orden = [...presentes.slice(k), ...presentes.slice(0, k)];
  const palo = stageDef(run.stage).boss ? BOSS[run.bosses?.[run.stage] ?? '']?.palo : undefined;
  return palo && orden.includes(palo) ? [...orden.filter((s) => s !== palo), palo] : orden;
}

/** Timbre del gremio: cartas del mazo que sella al empezar cada obra (además de activar dos veces todos los sellos). */
export const TIMBRE: { stamps: number } = BALANCE.timbre;
/** Nivel 8 «Clausura»: obras en las que sube la amenaza de todas las torres, y cuánto. */
export const CLAUSURA: { stages: number[]; threat: number } = BALANCE.clausura;
ASCENSIONS.forEach((a) => (a.desc = fill(a.desc, { pct: Math.round((REIN.corazas - 1) * 100), reyes: Math.round((REIN.reyesAcorazados - 1) * 100), furia: REIN.furia, rey: REIN.reyColerico, heridas: REIN.heridasViejas, noche: REIN.guardiaNoche, asaltos: CLAUSURA.stages.join(', '), clausura: CLAUSURA.threat })));

/** Reglas efectivas de la obra actual: base + nivel de obra + planos + herramientas + jefe + contrato. */
export function stageConfig(run: Run, players = 1): Config {
  const st = stageDef(run.stage);
  const cfg: Config = structuredClone(DEFAULT_CONFIG);
  cfg.maxIntegrity = run.maxIntegrity;
  // V40 · cada Mazo puede jugar con una carta más o menos en la mano (`mazos.<id>.mano`)
  const manoMazo = esMazo(run.deckId) ? MZ[run.deckId].mano : 0;
  cfg.handSize = { [players]: MANO_BASE + run.handBonus + manoMazo };
  // en cuadrilla hay más manos entre las que elegir: las obras aguantan más
  const a = run.ascension;
  const scale = st.hp * (a >= 1 ? REIN.corazas : 1) * COOP_HP[Math.min(players, 4) - 1];
  for (const r of FIGURAS) {
    // Reinado 4 «Reyes acorazados»: en los asaltos con monarca, los Reyes tienen más Vida
    const reyes = a >= 3 && st.boss && r === REY ? REIN.reyesAcorazados : 1;
    // la Vida final, redondeada al múltiplo de 5 más cercano (asalto, Reinado y conjura ya aplicados)
    cfg.floorHp[r] = roundHp(DEFAULT_CONFIG.floorHp[r] * scale * reyes);
    cfg.floorThreat[r] = Math.max(1, DEFAULT_CONFIG.floorThreat[r] + st.threat + (a >= 4 && r === REY ? REIN.reyColerico : 0) + (a >= 6 && r !== REY ? REIN.guardiaNoche : 0) + (a >= 7 && CLAUSURA.stages.includes(run.stage) ? CLAUSURA.threat : 0));
  }
  // V35 · duelo Casa por Casa: se combate la primera en pie de `orden`. Sin reloj de turnos: la Furia sube con cada
  // Mazo agotado y, contra el monarca (el último guardia del asalto), con cada turno
  // Corte airada (Reinado 3+): cada Mazo agotado sube la Furia un poco más
  cfg.collapseSiege = FURIA.mazo + (a >= 2 ? REIN.furia : 0);
  cfg.orden = ordenCasas(run);
  // V40 1c · el Rey jefe: su Vida (× la del monarca) y su Furia propia; en el asalto 2 ocupa el sitio del Caballo
  const rey = st.boss ? BOSS[run.bosses[run.stage]] : undefined;
  if (st.boss) {
    const r = rey ? RY[rey.id] : { vida: 1, furia: FURIA.rey };
    const corto = !st.floors.includes(REY);
    cfg.jefe = {
      suit: cfg.orden[cfg.orden.length - 1],
      vida: Math.round(FURIA.jefeVida * r.vida * (corto ? RY.asalto2.vida : 1) * 100) / 100,
      furia: r.furia,
      ...(rey ? { rey: rey.id } : {}),
      ...(corto ? { ataque: RY.asalto2.ataque } : {}),
    };
  }
  cfg.formLevel = { ...run.levels };
  // V40 · las reglas del Mazo de la campaña
  if (esMazo(run.deckId)) cfg.mazo = run.deckId;
  // Árbol (Corona de hierro), solo en el Trono infinito: Manga honda guarda 2 cartas; Buen ojo da Golpe exacto
  // pasándose por poco (solo por arriba). En los cinco asaltos no tocan la mesa (V12-C).
  if (run.endless && rangoDe(run.up, 'manga') > 0) cfg.reserveSize = 2;
  if (run.endless && rangoDe(run.up, 'gracia') > 0) cfg.cleanOver = cifraDe('gracia', rangoDe(run.up, 'gracia')).n;
  for (const t of run.tools) TOOL[t.id]?.cfg?.(cfg);
  // V40 1c · las Bendiciones, los niveles de los Reyes y el Escudo con que se empieza
  const bend = run.bendiciones ?? [];
  for (const b of bend) BENDICION[b.id]?.cfg?.(cfg, b);
  nivelesCfg(cfg, nivelesReyes({ bendiciones: bend }));
  const escudo = escudoInicial(bend);
  if (escudo) cfg.wallStart = (cfg.wallStart ?? 0) + escudo;
  if (run.boss) BOSS[run.boss]?.apply(cfg);
  if (run.contract) CONTRACT[run.contract]?.cfg?.(cfg);
  if (run.curse) eachThreat(cfg, 1);
  return cfg;
}

/** Prepara la partida de la obra actual con el mazo y el cinturón de la campaña. */
export function startStage(run: Run, players: { id: string; name: string }[]): GameState {
  const config = stageConfig(run, players.length);
  const deck = run.deck.map((c) => ({ ...c }));
  shuffle(deck, run);
  const size = config.handSize[players.length];
  run.battle = { taken: 0, cleans: 0, jokers: 0, forms: [] };
  run.death = null;
  run.caida = caidaVacia();
  run.ritual = null;
  const towers = newTowers(stageDef(run.stage).floors, config, run.palos?.[run.stage]);
  // V40 1c · el último guardia de la Casa del jefe es su Rey (en el asalto 2, en el sitio del Caballo)
  if (config.jefe) {
    const t = towers[config.jefe.suit];
    if (t.floors.length) t.floors[t.floors.length - 1] = REY;
  }
  const state: GameState = {
    config,
    rng: (run.rng ^ 0x5bd1e995) | 0,
    players: players.map((p) => ({ id: p.id, name: p.name, hand: deck.splice(0, size), reserve: [] })),
    deck,
    discard: [],
    towers,
    integrity: Math.min(run.integrity, config.maxIntegrity),
    // el asalto puede empezar con Escudo (Bendiciones de Bastos y su nivel)
    wall: Math.min(config.wallCap, config.wallStart ?? 0),
    turn: 0,
    turnCount: 0,
    collapses: 0,
    phase: 'playing',
    tools: run.tools.map((t) => ({ ...t })),
    chain: 0,
    charge: 0,
    scrap: run.scrap,
    burned: [],
    exhausted: [],
    stashed: false,
    // una tiza de replanteo por obra, solo en solitario
    chalk: players.length === 1 ? 1 : 0,
    undo: null,
    fatigue: config.furiaInicial ?? 0,
    // V40 · las cargas del Mazo vienen de la campaña; el Engaño de El Mentiroso, uno por asalto
    cargas: { ...run.cargas },
    // V40 1c · las Bendiciones con sus cargas: crecen en la mesa y vuelven a la campaña al acabar
    bendiciones: (run.bendiciones ?? []).map((b) => ({ ...b })),
    ...(config.mazo === 'mentiroso' ? { engano: { usado: false } } : {}),
  };
  tiraDado(state);
  return state;
}

/**
 * Anota lo que la campaña necesita de cada jugada (golpes limpios, Juramentos, estadísticas) y abona en el acto
 * lo que cae a la mesa (`caidaDe`): monedas a `run.gold`, esquirlas a `run.esquirlas`, gotas a `run.gotas`, y lo
 * del asalto a `run.caida`. Devuelve las piezas, para que el cliente las haga volar.
 */
export function trackEvents(run: Run, events: GameEvent[]): Pieza[] {
  for (const ev of events) {
    if (ev.e === 'floorDown') {
      run.stats.floors++;
      if (ev.clean) {
        run.battle.cleans++;
        run.stats.cleans++;
      }
    } else if (ev.e === 'siren') run.battle.taken += ev.taken;
    else if (ev.e === 'hurt') run.battle.taken += ev.amount;
    else if (ev.e === 'joker') run.battle.jokers++;
    else if (ev.e === 'play') run.battle.forms.includes(ev.formation) || run.battle.forms.push(ev.formation);
    else if (ev.e === 'impact') run.stats.maxHit = Math.max(run.stats.maxHit, ev.total);
    else if (ev.e === 'burn') run.stats.burned++;
    else if (ev.e === 'step' && ev.src === 'tool') run.stats.toolUse[ev.id] = (run.stats.toolUse[ev.id] ?? 0) + 1;
    else if (ev.e === 'end' && ev.result === 'lost') run.death = autopsy(events, stageConfig(run));
  }
  const piezas = caidaDe(run, events);
  abona(run, sumaPiezas(piezas));
  return piezas;
}

/** Abona lo que cae: monedas, esquirlas y gotas, a la campaña y a lo del asalto en curso. */
function abona(run: Run, c: Caida): void {
  run.gold += c.oro;
  run.stats.gold += c.oro;
  run.esquirlas += c.esquirlas;
  run.stats.esquirlas += c.esquirlas;
  run.gotas += c.gotas;
  run.stats.gotas += c.gotas;
  run.caida.oro += c.oro;
  run.caida.esquirlas += c.esquirlas;
  run.caida.gotas += c.gotas;
}

export const removeCost = (run: Run) => BALANCE.taberna.hoguera.base + BALANCE.taberna.hoguera.paso * run.removals;
export const healCost = (run: Run) => BALANCE.taberna.curar.base + BALANCE.taberna.curar.paso * run.heals;
export const rerollCost = (run: Run) => (run.vouchers > 0 ? 0 : BALANCE.taberna.renovar.base + BALANCE.taberna.renovar.paso * run.rerolls);
/** La Mesa de lacre sella gratis si llevás `caida.gotasPorSello` gotas de lacre (y las gasta al sellar). */
export const selloGratis = (run: Run, o: Offer): boolean => !run.freeShop && o.kind === 'forja' && run.gotas >= BALANCE.caida.gotasPorSello;
export const offerCost = (run: Run, o: Offer) => (run.freeShop || selloGratis(run, o) ? 0 : o.cost);
export const sellValue = (id: string) => Math.max(1, Math.floor(RARITY[TOOL[id]?.rarity ?? 'comun'].cost / 2));

function generateShop(run: Run): Offer[] {
  return stock(run);
}

function stock(run: Run): Offer[] {
  const offers: Offer[] = [];
  const seen: string[] = [];
  // el Puesto grande (Árbol): por nivel, una Reliquia más, y dos de las ofrecidas son Raras o mejores
  for (let i = 0; i < BALANCE.taberna.reliquias + lvl(run, 'tienda'); i++) {
    const id = (i < 2 * lvl(run, 'tienda') ? rollTool(run, ['oficio', 'capataz', 'reliquia'], seen) : null) ?? rollTool(run, ALL_RARITIES, seen);
    if (!id) break;
    seen.push(id);
    // Ojo del tasador (Árbol): las reliquias cuestan menos, nunca menos de 1
    offers.push({ kind: 'tool', id, cost: Math.max(1, vary(run, RARITY[TOOL[id].rarity].cost) - cifraDe('tasador', lvl(run, 'tasador')).n) });
  }
  offers.push({ kind: 'sobre', cost: vary(run, BALANCE.taberna.sobre) }, { kind: 'clandestino', cost: vary(run, BALANCE.taberna.sobreCiego) });
  if (roll(run, 2)) offers.push({ kind: 'forja', cost: vary(run, BALANCE.taberna.mesaLacre), seal: pick(run, run.seals, 1)[0] });
  else offers.push({ kind: 'forja', cost: vary(run, BALANCE.taberna.mesaLacre), tr: pick(run, run.treats, 1)[0] });
  const form = pick(run, FORMATIONS, 1)[0];
  offers.push({ kind: 'plano', cost: vary(run, BALANCE.taberna.pergamino.base + BALANCE.taberna.pergamino.porNivel * run.levels[form]), form });
  return offers;
}

function openShop(run: Run): void {
  run.phase = 'shop';
  run.rerolls = 0;
  run.vouchers = lvl(run, 'vale');
  run.shop = generateShop(run);
}

/** Entra al plano de la obra en curso: sus rutas, su atajo o su jefe. */
function toMap(run: Run): void {
  run.phase = 'map';
  run.contract = null;
  run.contractDone = null;
  run.boss = null;
  const st = stageDef(run.stage);
  if (st.boss) {
    if (!run.bosses[run.stage]) run.bosses[run.stage] = pick(run, BOSSES.filter((b) => b.id !== run.bosses[run.stage - 1]), 1)[0].id;
    run.node = { routes: [], tag: null };
    return;
  }
  // la primera ruta nunca es de riesgo; el Cartógrafo de la Orden añade una tercera. El Atajo, solo donde lo hay (asalto 3)
  const [safe] = pick(run, CONTRACTS.filter((c) => !c.risk), 1);
  const others = pick(run, CONTRACTS.filter((c) => c.id !== safe.id), 1 + lvl(run, 'rutas'));
  run.node = { routes: [safe.id, ...others.map((c) => c.id)], tag: st.atajo ? pick(run, TAGS, 1)[0].id : null };
}

/**
 * V40 1c · Entra al asalto en curso: antes, si toca, la oferta de Bendiciones (al empezar la campaña, de `oferta.inicio`
 * Reyes; antes de los asaltos 2 a 5, de `oferta.entre`); si no, el Mapa. Cada asalto ofrece una sola vez.
 */
function entra(run: Run): void {
  if (!run.endless && run.stage <= LAST_STAGE && run.ofertaDe !== run.stage) {
    run.ofertaDe = run.stage;
    const op = ofertaBendiciones(run.id, run.stage, run.bendiciones, reyesEnOferta(run.stage === 1));
    if (op.length) {
      run.phase = 'bendicion';
      run.oferta = op;
      return;
    }
  }
  toMap(run);
}

function advance(run: Run): void {
  run.stage++;
  run.curse = run.curse && run.phase === 'event'; // el contrato maldito pesa sobre la obra que viene
  run.shop = [];
  run.event = null;
  run.freeShop = false;
  entra(run);
}

function draftOptions(run: Run): DraftOpt[] {
  const specials = rollSpecials(run, 2).map((id): DraftOpt => ({ kind: 'special', id }));
  // V40 · el Truco no reparte 8 ni 9
  const card: Card = { id: `c-${++run.serial}`, suit: pick<Suit>(run, SUITS, 1)[0], rank: pick(run, run.deckId === 'truco' ? [1, 5, 6, 7, TRUCO_MAX] : [1, 6, 7, 8, MAX_NUM], 1)[0] };
  if (roll(run, 2)) card.seal = pick(run, run.seals, 1)[0];
  else card.tr = pick(run, run.treats, 1)[0];
  return [...specials, { kind: 'card', card }];
}

/** Cierra la batalla: sincroniza mazo y cinturón, y si se ganó cobra y abre la selección. */
export function finishBattle(run: Run, state: GameState): void {
  if (run.phase !== 'battle' || state.phase === 'playing') return;
  run.tools = state.tools.map((t) => ({ ...t }));
  run.cargas = { ...state.cargas };
  if (state.bendiciones) run.bendiciones = state.bendiciones.map((b) => ({ ...b }));
  run.deck = run.deck.filter((c) => !state.burned.includes(c.id));
  run.scrap = state.scrap;
  run.stats.turns += state.turnCount;
  run.stats.stageTurns.push(state.turnCount);
  if (state.phase === 'lost') {
    run.integrity = 0;
    run.phase = 'lost';
    return;
  }
  const st = stageDef(run.stage);
  const C = BALANCE.cobro;
  const lines: [string, number][] = [
    // V12: la moneda del guardia y el Dado de oro dan oro nuevo; cobro.asalto puede ser negativo para compensar (nunca menos de 0)
    ['Asalto ganado', Math.max(0, C.asalto + Math.min(run.stage, LAST_STAGE))],
    [fill('Vida que te queda (1 por cada {n})', { n: C.vidaCada }), Math.floor(state.integrity / C.vidaCada)],
    [fill('Interés (1 por cada {n} de oro)', { n: C.interesCada }), Math.min(run.interestCap, Math.floor(run.gold / C.interesCada))],
  ];
  if (run.tools.some((t) => t.id === 'hucha')) lines.push([TOOL.hucha?.name ?? 'Hucha', BALANCE.reliquias.hucha.oro]);
  // V40 1c · lo que cobran las Bendiciones (y el nivel de Oros): el oro, a la cuenta; la Vida, tras curar
  const cierre = cierreBendiciones(run.bendiciones ?? []);
  for (const c of cierre) if (c.oro > 0) lines.push([c.label, c.oro]);
  const vidaBend = cierre.reduce((a, c) => a + c.vida, 0);
  // la tirada de huesos (azar propio: no toca run.rng): el Dado de oro multiplica las monedas que cayeron en el
  // asalto y el de la Corona, sus esquirlas; lo extra se abona en el acto
  run.ritual = tirarHuesos(run);
  const dados = multiplicadores(run.ritual);
  lines.push([fill(ES_PLANTILLAS['cuenta.dado'], { n: dados.oro }), run.ritual.oro.extra]);
  run.esquirlas += run.ritual.esquirlas.extra;
  run.stats.esquirlas += run.ritual.esquirlas.extra;
  run.pay = lines.filter(([, n]) => n > 0);
  const total = run.pay.reduce((a, [, n]) => a + n, 0);
  run.gold += total;
  run.stats.gold += total;
  if (state.integrity >= run.maxIntegrity) run.intact++;
  if (run.boss) run.beaten.includes(run.boss) || run.beaten.push(run.boss);
  run.integrity = Math.min(run.maxIntegrity, state.integrity + BALANCE.cobro.curaTrasAsalto + vidaBend);
  const contract = run.contract ? CONTRACT[run.contract] : null;
  if (contract) {
    run.contractDone = contract.risk ? true : !!contract.done?.(run.battle, state, run);
    if (run.contractDone) {
      contract.pay(run);
      run.stats.contracts++;
    }
  }
  run.curse = false;
  if (run.stage === LAST_STAGE && !run.endless) {
    run.conquered = true;
    run.esquirlasCorte = run.esquirlas;
    run.phase = 'won';
    return;
  }
  run.phase = 'reward';
  run.draft = draftOptions(run);
  run.drafted = false;
  run.loot = st.boss ? cofreDelMonarca(run) : [];
  run.looted = run.loot.length === 0;
}

/** Aplica una decisión de campaña. Devuelve un mensaje de error legible, o null si se aplicó. */
export function runAction(run: Run, a: RunAction): string | null {
  if (run.pending && a.t !== 'target' && a.t !== 'cancel') return 'Antes elige las cartas pendientes.';
  switch (a.t) {
    case 'begin':
      if (run.phase !== 'pack') return 'La campaña ya empezó.';
      if (a.don !== undefined) takeDon(run, a.don);
      entra(run);
      return null;
    case 'bendicion': {
      if (run.phase !== 'bendicion' || !run.oferta) return 'No hay Bendiciones que elegir.';
      const o = run.oferta[a.i];
      if (!o) return 'Esa Bendición no está en la oferta.';
      tomaBendicion(run, o.id);
      run.oferta = null;
      toMap(run);
      return null;
    }
    case 'route': {
      if (run.phase !== 'map') return 'No estás en el Mapa del castillo.';
      const boss = stageDef(run.stage).boss;
      if (!boss && !run.node.routes[a.i]) return 'Esa ruta no existe.';
      run.contract = boss ? null : run.node.routes[a.i];
      run.boss = boss ? run.bosses[run.stage] : null;
      run.phase = 'battle';
      // el Timbre del gremio sella cartas del mazo antes de cada obra
      run.stamped = run.tools.some((t) => t.id === 'timbre') ? stampRandom(run, TIMBRE.stamps).map((c) => c.id) : [];
      if (run.stamped.length) run.stats.toolUse.timbre = (run.stats.toolUse.timbre ?? 0) + run.stamped.length;
      return null;
    }
    case 'skip': {
      if (run.phase !== 'map' || !run.node.tag) return 'Este asalto no tiene Atajo.';
      const tag = TAG[run.node.tag];
      run.stats.skips++;
      run.skipped.push(run.stage);
      tag.apply(run);
      run.stage++;
      entra(run);
      return null;
    }
    case 'draft': {
      if (run.phase !== 'reward' || run.drafted) return 'No hay selección pendiente.';
      if (a.i === null) run.gold += BALANCE.cobro.sinSeleccion;
      else {
        const opt = run.draft[a.i];
        if (!opt) return 'Esa carta no está en la selección.';
        if (opt.kind === 'special') addSpecial(run, opt.id);
        else run.deck.push({ ...opt.card });
      }
      run.drafted = true;
      if (run.looted) openShop(run);
      return null;
    }
    case 'loot':
      if (run.phase !== 'reward' || run.looted) return 'No hay botín que elegir.';
      if (a.id !== null) {
        if (!run.loot.includes(a.id)) return 'Esa reliquia no está en el botín.';
        if (run.tools.length >= TOOL_SLOTS) return `Solo caben ${TOOL_SLOTS} reliquias.`;
        placeTool(run.tools, { id: a.id, n: 0 });
      }
      run.looted = true;
      if (run.drafted) openShop(run);
      return null;
    case 'buy': {
      const o = run.shop[a.i];
      if (run.phase !== 'shop' || !o || o.sold) return 'Esa oferta ya no está.';
      if (run.sobre) return 'Antes elige una carta del sobre abierto.';
      const cost = offerCost(run, o);
      if (run.gold < cost) return 'No te alcanza el oro.';
      if (o.kind === 'forja') {
        if (!run.deck.some(isPlain)) return 'No tenés cartas que sellar.';
        run.pending = { kind: 'forge', i: a.i }; // se cobra al elegir la carta
        return null;
      }
      if (o.kind === 'tool') {
        if (run.tools.length >= TOOL_SLOTS) return `Solo caben ${TOOL_SLOTS} reliquias. Vendé una antes.`;
        placeTool(run.tools, { id: o.id!, n: 0 });
      } else if (o.kind === 'sobre') run.sobre = rollSpecials(run, 3);
      else if (o.kind === 'clandestino') addSpecial(run, rollSpecials(run, 1)[0]);
      else run.levels[o.form!]++;
      run.gold -= cost;
      o.sold = true;
      return null;
    }
    case 'open': {
      if (!run.sobre) return 'No hay ningún sobre abierto.';
      const id = run.sobre[a.i];
      if (!id) return 'Esa carta no está en el sobre.';
      addSpecial(run, id);
      run.sobre = null;
      return null;
    }
    case 'target':
      return resolvePending(run, a.cards);
    case 'cancel':
      if (!run.pending) return 'No hay nada pendiente.';
      run.pending = null;
      if (run.phase === 'event') advance(run);
      return null;
    case 'burn': {
      if (run.phase !== 'shop') return 'Solo se queman cartas en la hoguera de la Pulpería.';
      if (run.gold < removeCost(run)) return 'No te alcanza el oro.';
      if (run.deck.length <= MIN_DECK) return `El mazo no puede bajar de ${MIN_DECK} cartas.`;
      const i = run.deck.findIndex((c) => c.id === a.card);
      if (i < 0) return 'Esa carta no está en el mazo.';
      run.deck.splice(i, 1);
      run.gold -= removeCost(run);
      run.removals++;
      run.scrap++;
      run.stats.burned++;
      return null;
    }
    case 'heal':
      if (run.phase !== 'shop') return 'Solo en la Pulpería.';
      if (run.integrity >= run.maxIntegrity) return 'Tu Vida ya está al máximo.';
      if (run.gold < healCost(run)) return 'No te alcanza el oro.';
      run.gold -= healCost(run);
      run.heals++;
      run.integrity = Math.min(run.maxIntegrity, run.integrity + BALANCE.taberna.curar.vida);
      return null;
    case 'sell': {
      if (run.phase === 'battle') return 'En pleno asalto no se vende.';
      const t = run.tools[a.i];
      if (!t) return 'No llevás esa reliquia.';
      run.gold += sellValue(t.id);
      run.tools.splice(a.i, 1);
      return null;
    }
    case 'reroll':
      if (run.phase !== 'shop') return 'Solo en la Pulpería.';
      if (run.sobre) return 'Antes elige una carta del sobre abierto.';
      if (run.gold < rerollCost(run)) return 'No te alcanza el oro.';
      run.gold -= rerollCost(run);
      if (run.vouchers > 0) run.vouchers--;
      else run.rerolls++;
      run.shop = generateShop(run);
      return null;
    case 'next':
      if (run.phase !== 'shop') return 'Aún no podés seguir.';
      if (run.sobre) return 'Antes elige una carta del sobre abierto.';
      if (!run.endless && EVENT_AFTER.includes(run.stage) && run.events.length) {
        run.phase = 'event';
        run.event = run.events.shift()!;
        run.shop = [];
        run.freeShop = false;
        return null;
      }
      advance(run);
      return null;
    case 'event': {
      if (run.phase !== 'event' || !run.event) return 'No hay ningún Secreto de la cripta.';
      const opt = EVENT[run.event].options[a.i];
      if (!opt) return 'Esa opción no existe.';
      if (opt.can && !opt.can(run)) return 'No podés elegir eso ahora.';
      run.suerte = null;
      opt.apply(run);
      if (!run.pending) advance(run);
      return null;
    }
    case 'endless':
      if (run.phase !== 'won' || run.endless) return 'El Trono infinito se abre al ganar la campaña.';
      run.endless = true;
      run.draft = draftOptions(run);
      run.drafted = false;
      run.loot = [];
      run.looted = true;
      run.phase = 'reward';
      return null;
  }
}

function resolvePending(run: Run, ids: string[]): string | null {
  const p = run.pending;
  if (!p) return 'No hay nada pendiente.';
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) return 'Elección inválida.';
  const cards = ids.map((id) => run.deck.find((c) => c.id === id));
  if (cards.some((c) => !c)) return 'Esa carta no está en el mazo.';
  const chosen = cards as Card[];
  if (p.kind === 'forge') {
    const o = run.shop[p.i];
    if (chosen.length !== 1 || !isPlain(chosen[0])) return 'Elegí una carta de baraja.';
    if (!o || o.sold) return 'Esa oferta ya no está.';
    const cost = offerCost(run, o);
    if (run.gold < cost) return 'No te alcanza el oro.';
    if (o.seal) chosen[0].seal = o.seal;
    if (o.tr) chosen[0].tr = o.tr;
    if (selloGratis(run, o)) {
      run.gotas -= BALANCE.caida.gotasPorSello;
      run.stats.sellosGratis++;
    }
    run.gold -= cost;
    o.sold = true;
    run.stats.forged++;
  } else if (p.kind === 'dup') {
    if (chosen.length !== 1) return 'Elegí una carta.';
    run.deck.push({ ...chosen[0], id: `c-${++run.serial}` });
  } else {
    if (chosen.length !== 2 || !chosen.every(isPlain)) return 'Elegí dos cartas de baraja.';
    if (run.deck.length - 1 < MIN_DECK) return `El mazo no puede bajar de ${MIN_DECK} cartas.`;
    const [a, b] = chosen;
    const high = cardValue(a) >= cardValue(b) ? a : b;
    const fused: Card = { id: `c-${++run.serial}`, suit: a.suit, rank: high.rank, tr: 'policromado' };
    const seal = a.seal ?? b.seal;
    if (seal) fused.seal = seal;
    run.deck = run.deck.filter((c) => c !== a && c !== b);
    run.deck.push(fused);
    run.scrap += 2;
    run.stats.burned += 2;
    run.stats.forged++;
  }
  run.pending = null;
  if (run.phase === 'event') advance(run);
  return null;
}

/** Obras superadas (las saltadas no cuentan como demolidas, pero sí como camino recorrido). */
export const stagesCleared = (run: Run) => (run.phase === 'battle' || run.phase === 'map' || run.phase === 'pack' || run.phase === 'bendicion' || run.phase === 'lost' ? run.stage - 1 : run.stage);
export const depthOf = (run: Run) => Math.max(0, stagesCleared(run) - LAST_STAGE);

export function renownFor(run: Run): number {
  const base = Math.min(LAST_STAGE, stagesCleared(run)) + (run.conquered ? 5 : 0) + depthOf(run);
  return Math.max(1, Math.ceil(base * (1 + 0.25 * run.ascension)));
}

/** Esquirlas del cobro de la conjura: las Coronas de `renownFor` × 100 y las esquirlas que cayeron a la mesa (también al perder). */
export const cobroDe = (run: Run): number => renownFor(run) * ESQUIRLAS_POR_CORONA + (run.esquirlas ?? 0);

/** Abona al perfil el cobro de la conjura de una campaña terminada (en esquirlas, también al perder) y lo devuelve. */
export function settle(meta: Meta, run: Run): number {
  const gained = cobroDe(run);
  meta.renown += gained;
  meta.runs++;
  meta.best = Math.max(meta.best, Math.min(LAST_STAGE, stagesCleared(run)));
  if (run.conquered) {
    meta.wins++;
    meta.ascMax = Math.min(MAX_ASCENSION, Math.max(meta.ascMax, run.ascension + 1));
    // sellos de maestría: el nivel más alto ganado con cada herramienta puesta y con esta baraja
    const level = run.ascension + 1;
    for (const t of run.tools) meta.mastery.tools[t.id] = Math.max(meta.mastery.tools[t.id] ?? 0, level);
    meta.mastery.decks[run.deckId] = Math.max(meta.mastery.decks[run.deckId] ?? 0, level);
  }
  return gained;
}

/**
 * El cobro al caer en el Trono infinito (tras cobrar la victoria con `settle`): 100 esquirlas por cada Trono
 * infinito superado y las esquirlas que cayeron desde que se venció a la corte. Lo abona y lo devuelve.
 */
export function cobroAbismo(meta: Meta, run: Run): number {
  const gained = depthOf(run) * ESQUIRLAS_POR_CORONA + Math.max(0, (run.esquirlas ?? 0) - (run.esquirlasCorte ?? 0));
  meta.renown += gained;
  return gained;
}

/**
 * Una campaña guardada lista para seguir: la de esta versión tal cual; si no, null. Las de antes de la V40 (la 11.0
 * y la 12.0 a la 38.0) eran de la baraja francesa, y las de los tramos 1a y 1b (6 y 7) tenían rasgos y monarcas
 * viejos: no se continúan (el cliente las retira con `campanaFrancesa` y `campanaSinReyes`).
 */
export function cargaRun(raw: unknown): Run | null {
  const r = raw as Run | null;
  if (!r || typeof r !== 'object' || !r.stats) return null;
  return r.v === RUN_VERSION && Array.isArray(r.bendiciones) ? r : null;
}

/**
 * La campaña tal como viaja a los clientes de una sala: sin el estado del azar ni la semilla
 * (con ellos se podría deducir el orden de la cantera), y sin los hallazgos que aún no salieron.
 * La semilla se revela cuando la campaña termina (si luego se sigue a los Cimientos abisales,
 * el servidor vuelve a sembrar el azar).
 */
export function publicRun(run: Run, uid: number): Run {
  const over = run.phase === 'lost' || run.phase === 'won';
  return { ...run, id: uid, rng: 0, events: [], seedText: over ? run.seedText : '' };
}

/** La herramienta que más veces se activó: la MVP del acta. */
export function mvpTool(run: Run): string | null {
  const best = Object.entries(run.stats.toolUse).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

/** Base de Fuerza y Resonancia de una formación con los planos de la campaña. */
/** Daño y Multi de una formación con su nivel de Pergamino: el Pergamino solo sube el Daño; el Multi es el de la formación. */
export const formBase = (run: Run, f: Formation) => ({ f: FORM[f].f + run.levels[f] * FORM[f].lf, r: FORM[f].r });
