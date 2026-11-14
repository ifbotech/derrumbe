// CAMPAÑA — roguelike de construcción de mazo. Sirve igual en solitario (corre en el cliente)
// y en sala online (corre en el servidor): es un reductor puro y determinista. Con la misma
// semilla y las mismas decisiones, la campaña es idéntica.
//
//   Sobre lacrado → [ Mapa del castillo: ruta con Juramento · o Atajo → asalto → Botín + selección
//                     (+ botín de monarca) → La Taberna → (Secreto de la cripta tras cada
//                     monarca) ] × 8 → Trono infinito
// En el código los nombres internos siguen siendo los de antes (stage, boss, contract, shop, event…).
import { Autopsy, autopsy } from './autopsy';
import { BALANCE, fill } from './balance-config';
import { Card, Config, DEFAULT_CONFIG, FORM, FORMATIONS, Formation, GameEvent, GameState, SEALS, Seal, SUITS, Suit, TREATMENTS, Treatment, cardValue, newTowers, nextRandom, reorder, seedFrom, shuffle, standardDeck } from './engine';
import { BASE_POOL, SPECIAL } from './specials';
import { Arch, BOXES, RARITY, Rarity, TOOL, TOOL_SLOTS, ToolInst, toolPool } from './tools';

export const MIN_DECK = 12;
export const LAST_STAGE = 8;
/** Versión del formato de campaña guardada: una campaña de otra versión no se puede continuar. */
export const RUN_VERSION = 3;

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
  { name: 'Impuesto real', desc: 'Todo en la Taberna cuesta {impuesto} de oro más.' },
  { name: 'Reyes en guardia', desc: 'En los asaltos con monarca, los Reyes llegan En guardia.' },
  { name: 'Rey colérico', desc: 'El Ataque de los Reyes sube {rey}.' },
  { name: 'Heridas viejas', desc: 'Tienes {heridas} punto menos de Vida.' },
  { name: 'Guardia de noche', desc: 'El Ataque de las Sotas y las Reinas sube {noche}.' },
  { name: 'Puertas selladas', desc: 'Solo en el asalto {asaltos}, el Ataque de los cuatro tronos sube {clausura}.' },
];
export const MAX_ASCENSION = ASCENSIONS.length - 1;

// ───────────────────────── Obras y jefes ─────────────────────────

export interface StageDef {
  name: string;
  floors: number[];
  /** Multiplicador de la resistencia base de los pisos. */
  hp: number;
  /** Se suma a la amenaza base. */
  threat: number;
  boss: boolean;
}
/**
 * Balanceado con el laboratorio (npm run analyze:meta). Las obras son cortas (de 6 a 12 turnos de mediana,
 * y casi ninguna pasa de 18): la dificultad sube por la amenaza de la sirena y por la fatiga de cimientos,
 * no por pisos interminables.
 */
const STAGE_DEFS: Omit<StageDef, 'hp' | 'threat'>[] = [
  { name: 'El Puente levadizo', floors: [11], boss: false },
  { name: 'El Patio de armas', floors: [11, 12], boss: false },
  { name: 'La Armería', floors: [11, 12], boss: true },
  { name: 'Las Cocinas', floors: [11, 12, 13], boss: false },
  { name: 'La Capilla', floors: [11, 12, 13], boss: true },
  { name: 'La Biblioteca', floors: [11, 12, 13], boss: false },
  { name: 'La Galería de espejos', floors: [11, 12, 13], boss: true },
  { name: 'El Salón del Trono', floors: [11, 12, 13], boss: true },
];
/** Los ocho asaltos: su Vida (`hp`) y su Ataque (`threat`) salen de `asaltos` en balance-config.json. */
export const STAGES: StageDef[] = STAGE_DEFS.map((s, i) => {
  const { hp, threat } = BALANCE.asaltos[i];
  return { name: s.name, floors: s.floors, hp, threat, boss: s.boss };
});
/** La obra n. Más allá de la octava empiezan los Cimientos abisales: siempre con jefe y cada vez más duros. */
export function stageDef(n: number): StageDef {
  if (n <= LAST_STAGE) return STAGES[n - 1];
  const depth = n - LAST_STAGE;
  return { name: `Trono infinito ${depth}`, floors: [11, 12, 13], hp: Math.round(STAGES[LAST_STAGE - 1].hp * BALANCE.tronoInfinito.hpCrece ** depth * 10) / 10, threat: STAGES[LAST_STAGE - 1].threat + Math.ceil(depth / 2), boss: true };
}
/** Tras estas obras aparece un hallazgo en los cimientos. */
export const EVENT_AFTER = [3, 5, 7];

export interface Boss {
  id: string;
  /** El personaje. */
  who: string;
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
const eachThreat = (c: Config, n: number) => void [11, 12, 13].forEach((r) => (c.floorThreat[r] = Math.max(1, c.floorThreat[r] + n)));
/** Cifras de los decretos (`monarcas` de balance-config.json). */
const MON = BALANCE.monarcas;
export const BOSSES: Boss[] = [
  {
    id: 'doble',
    who: 'El Rey de Dos Caras',
    name: 'Doble Contraataque',
    desc: 'Hay {contraataques} Contraataques cada turno, pero cada uno ataca un {pct} % menos.',
    barks: { entrada: '¿Envido? Tengo dos caras y canto con las dos.', contraataque: '¡Retruco! Y cuando te des vuelta, retruco otra vez.', caida: 'Se me dio vuelta el naipe... y por los dos lados.' },
    curse: { mark: 'contraataque', badge: '{contraataques} Contraataques por turno' },
    apply: (c) => void ((c.sirenCount = MON.doble.contraataques), [11, 12, 13].forEach((r) => (c.floorThreat[r] = Math.max(1, Math.ceil(c.floorThreat[r] * MON.doble.ataque))))),
  },
  {
    id: 'escasez',
    who: 'El Usurero',
    name: 'Escasez',
    desc: 'Jugáis con {cartas} carta menos en la mano.',
    barks: { entrada: 'Acá no se fía, querido. Jugá con lo justo y gracias.', contraataque: 'Vengo a cobrar los intereses. ¿Quiero? Siempre quiero.', caida: 'Me dejaron sin un cobre... anotá la deuda, che.' },
    curse: { mark: 'mano', badge: '{cartas} carta menos en la mano' },
    apply: (c) => eachHand(c, -MON.escasez.cartas),
  },
  {
    id: 'sequia',
    who: 'La Dama del Cáliz',
    name: 'Cáliz envenenado',
    desc: 'Tus ♥ no curan.',
    barks: { entrada: 'Brindemos, tesoro. Mi copa no le sana el pecho a nadie.', contraataque: 'Un sorbito más... ¿no querés? Igual te lo sirvo.', caida: 'Se me volcó el cáliz sobre el paño. Qué desprolijo.' },
    curse: { mark: 'corazones', badge: 'Tus ♥ no curan' },
    apply: (c) => void (c.repairDiv = 9999),
  },
  {
    id: 'intemperie',
    who: 'La Reina Helada',
    name: 'Escarcha',
    desc: 'El Escudo no puede pasar de {escudoTope}.',
    barks: { entrada: 'Abrigate, naipe. En mi mesa ni la manta te tapa entero.', contraataque: 'Quiero retruco, y te lo canto con escarcha en la boca.', caida: 'Me derrito... y vos con las manos tibias. Qué injusto.' },
    curse: { mark: 'escudo', badge: 'Escudo máx. {escudoTope}' },
    apply: (c) => void (c.wallCap = Math.min(c.wallCap, MON.intemperie.escudoTope)),
  },
  {
    id: 'blindaje',
    who: 'El Inquisidor',
    name: 'Guardia de hierro',
    desc: 'Todos los guardias llegan En guardia y, mientras lo estén, su Ataque sube {ataque}.',
    barks: { entrada: 'Mis guardias rezan con los ojos abiertos. Nadie los sorprende.', contraataque: 'Confesá tu jugada, hereje. El naipe bravo nunca miente.', caida: '¡Herejía! Me ganaron con las cartas marcadas.' },
    curse: { mark: 'guardias', badge: 'En guardia: +{ataque} de Ataque' },
    apply: (c) => void ((c.apuntalado = [11, 12, 13]), (c.bracedThreat = MON.blindaje.ataque)),
  },
  {
    id: 'furia',
    who: 'El Verdugo',
    name: 'Furia',
    desc: 'El Ataque de los cuatro tronos sube {ataque}.',
    barks: { entrada: 'Afilé el hacha toda la noche. ¡Vale cuatro, y sin piedad!', contraataque: '¡Truco! Y esta vez no me tiembla el pulso.', caida: 'Se me cayó la capucha. Mala mano, la mía.' },
    curse: { mark: 'ataque', badge: '+{ataque} de Ataque en cada trono' },
    apply: (c) => eachThreat(c, MON.furia.ataque),
  },
  {
    id: 'inestable',
    who: 'El Relojero',
    name: 'Arena rápida',
    desc: 'El Asedio final empieza {antes} turnos antes, y cada guardia abatido sin Golpe exacto te quita {vida} de Vida.',
    barks: { entrada: 'Tic, tac. Cada grano de arena juega de mi lado.', contraataque: 'Se te acaba la arena, compadre. Yo no apuro: espero.', caida: 'Se me paró el reloj... justo a tu hora.' },
    curse: { mark: 'asedio', badge: 'Asedio final {antes} turnos antes' },
    apply: (c) => void ((c.crumbleHurt = MON.inestable.vida), (c.fatigueStart = Math.max(1, (c.fatigueStart ?? BALANCE.asedio.start) - MON.inestable.antes))),
  },
];
/** Cifras de cada decreto para su texto y su placa. */
const BOSS_NUMS: Record<string, Record<string, number>> = { ...MON, doble: { ...MON.doble, pct: Math.round((1 - MON.doble.ataque) * 100) } };
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
  { id: 'intacto', name: 'Piel intacta', desc: 'Termina el asalto sin perder Vida.', reward: '+8 de oro', done: (b) => b.taken === 0, pay: (run) => void (run.gold += 8) },
  { id: 'limpios', name: 'Pulso firme', desc: 'Da 3 Golpes exactos.', reward: 'Un sello de lacre al azar', done: (b) => b.cleans >= 3, pay: (run) => void stampRandom(run, 1) },
  { id: 'rapido', name: 'Al galope', desc: 'Gana el asalto en 3 turnos + 4 por guardia de cada trono, o menos (3 guardias: 15).', reward: '+6 de oro', done: (_, s, run) => s.turnCount < turnLimit(run), pay: (run) => void (run.gold += 6) },
  { id: 'sincolapso', name: 'Mazo medido', desc: 'Termina sin que se agote el Mazo.', reward: '+5 de oro', done: (_, s) => s.collapses === 0, pay: (run) => void (run.gold += 5) },
  { id: 'austero', name: 'Sin motines', desc: 'No juegues ningún Comodín.', reward: 'Un acabado al azar', done: (b) => b.jokers === 0, pay: (run) => void treatRandom(run) },
  { id: 'maestra', name: 'Jugada maestra', desc: 'Juega un color, un full, un póker o una escalera de color.', reward: 'Un Pergamino al azar', done: (b) => b.forms.some((f) => ['color', 'full', 'poker', 'escaleracolor'].includes(f)), pay: (run) => void run.levels[pick(run, FORMATIONS, 1)[0]]++ },
  { id: 'horas', name: 'Noche larga', desc: 'El Ataque de los cuatro tronos sube 1.', reward: '+10 de oro', risk: true, cfg: (c) => eachThreat(c, 1), pay: (run) => void (run.gold += 10) },
  { id: 'sinred', name: 'Sin escudo', desc: 'El Escudo no puede pasar de 2.', reward: 'Una reliquia Rara o mejor', risk: true, cfg: (c) => void (c.wallCap = Math.min(c.wallCap, 2)), pay: (run) => void grantTool(run, ['oficio', 'capataz', 'reliquia']) },
  { id: 'corta', name: 'Conjura corta', desc: 'Jugáis con 1 carta menos en la mano.', reward: '+12 de oro', risk: true, cfg: (c) => eachHand(c, -1), pay: (run) => void (run.gold += 12) },
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
  { id: 'vale', name: 'Llave de la Taberna', desc: 'En la próxima Taberna, reliquias, sobres y Mesa de lacre son gratis.', apply: (run) => void (run.freeShop = true) },
  { id: 'envio', name: 'Contrabando', desc: 'Recibes ya una reliquia Noble o Regia.', apply: (run) => void (grantTool(run, ['capataz', 'reliquia']) || (run.gold += 12)) },
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
      { label: 'Forzarlo', read: { gain: 'Reliquia Noble o Regia', cost: '−5 de Vida', glyph: 'contenedor' }, desc: 'Pierdes 5 de Vida. Te llevas una reliquia Noble o Regia.', can: (run) => run.integrity > 5 && run.tools.length < TOOL_SLOTS, apply: (run) => void ((run.integrity -= 5), grantTool(run, ['capataz', 'reliquia'])) },
      { label: 'Vendérselo al Tratante', read: { gain: '+8 de oro', cost: '', glyph: 'oro' }, desc: '+8 de oro.', apply: (run) => void (run.gold += 8) },
    ],
  },
  {
    id: 'horno',
    name: 'El caldero del alquimista',
    text: 'Un caldero hierve solo en un rincón. Lo que entra, sale convertido en otra cosa.',
    options: [
      { label: 'Fundir dos cartas', read: { gain: 'Carta en Lacre policromo', cost: 'Dos cartas arden', glyph: 'crisol' }, desc: 'Eliges dos: arden y nace una con el número más alto, en Lacre policromo y con el sello que llevaran.', can: (run) => run.deck.filter(isPlain).length > MIN_DECK, apply: (run) => void (run.pending = { kind: 'fuse' }) },
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
      { label: 'Pagar con Vida', read: { gain: '3 cartas con sello', cost: '−6 de Vida', glyph: 'sello' }, desc: 'Pierdes 6 de Vida. Tres cartas al azar reciben un sello de lacre.', can: (run) => run.integrity > 6, apply: (run) => void ((run.integrity -= 6), stampRandom(run, 3)) },
      { label: 'Pagar con oro', read: { gain: 'Tu mejor carta policroma', cost: '−8 de oro', glyph: 'forja' }, desc: '8 de oro. Tu carta más alta recibe Lacre policromo.', can: (run) => run.gold >= 8, apply: (run) => void ((run.gold -= 8), treatBest(run, 'policromado')) },
      { label: 'Seguir de largo', read: { gain: 'Nada cambia', cost: '', glyph: 'atajo' }, desc: 'Nada cambia.', apply: () => {} },
    ],
  },
  {
    id: 'planos',
    name: 'Los mapas escondidos',
    text: 'Tras una losa están los mapas del castillo. Arrancarlos hace crujir lo poco que os protege.',
    options: [
      { label: 'Arrancarlos', read: { gain: '2 formaciones +2 niveles', cost: '−3 de Vida máxima', glyph: 'plano' }, desc: 'Pierdes 3 de Vida máxima para siempre. Dos formaciones al azar suben 2 niveles.', can: (run) => run.maxIntegrity > 8, apply: (run) => void ((run.maxIntegrity -= 3), (run.integrity = Math.min(run.integrity, run.maxIntegrity)), pick(run, FORMATIONS, 2).forEach((f) => (run.levels[f] += 2))) },
      { label: 'Copiarlos a mano', read: { gain: '1 formación +1 nivel', cost: '−5 de oro', glyph: 'pergamino' }, desc: '5 de oro. Una formación al azar sube 1 nivel.', can: (run) => run.gold >= 5, apply: (run) => void ((run.gold -= 5), run.levels[pick(run, FORMATIONS, 1)[0]]++) },
      { label: 'Dejarlos donde están', read: { gain: 'Nada cambia', cost: '', glyph: 'atajo' }, desc: 'Nada cambia.', apply: () => {} },
    ],
  },
];
export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

// ───────────────────────── Gremio (progreso permanente, horizontal) ─────────────────────────

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  costs: number[];
  /** Emblema con que se dibuja. */
  glyph: string;
}
const boxUp = (arch: Arch, name: string, glyph: string): Upgrade => ({
  id: `caja_${arch}`,
  name,
  glyph,
  costs: BALANCE.orden.costes[`caja_${arch}`],
  desc: `Añade al surtido: ${Object.values(TOOL).filter((t) => t.box === arch).map((t) => t.name).join(', ')}.`,
});
export const UPGRADES: Upgrade[] = [
  boxUp('precision', 'Arcón de precisión', 'calibre'),
  boxUp('sismo', 'Arcón del eco', 'diapason'),
  boxUp('alquimia', 'Arcón de alquimia', 'crisol'),
  boxUp('limite', 'Arcón del filo', 'megafono'),
  boxUp('trituradora', 'Arcón de cenizas', 'prensa'),
  boxUp('aguante', 'Arcón del escudo', 'ariete'),
  { id: 'tampones', name: 'Lacres nuevos', desc: 'La Mesa de lacre también ofrece los sellos de pólvora y de la manga.', costs: BALANCE.orden.costes.tampones, glyph: 'sello' },
  { id: 'bronce', name: 'Cristalero real', desc: 'La Mesa de lacre también ofrece Lacre policromo y Cristal maldito.', costs: BALANCE.orden.costes.bronce, glyph: 'forja' },
  { id: 'vale', name: 'Favor del Tratante', desc: 'Un «Renovar mesa» gratis en cada Taberna, por nivel.', costs: BALANCE.orden.costes.vale, glyph: 'cinta' },
  { id: 'tienda', name: 'Puesto grande', desc: '+1 reliquia en oferta en cada Taberna, por nivel.', costs: BALANCE.orden.costes.tienda, glyph: 'andamio' },
  { id: 'caja', name: 'Bolsa de la Orden', desc: fill('+{oro} de oro inicial por nivel.', { oro: BALANCE.orden.oroPorNivel }), costs: BALANCE.orden.costes.caja, glyph: 'hucha' },
  { id: 'rutas', name: 'Cartógrafo', desc: 'Cada asalto sin monarca ofrece 3 rutas con Juramento en vez de 2.', costs: BALANCE.orden.costes.rutas, glyph: 'plano' },
];
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
  stats: { floors: number; cleans: number; maxHit: number; maxGold: number; reach: number; winAsc: number; intact: number; depth: number; forged: number; contracts: number; skips: number; maxTools: number; dailies: number };
  /** Colección: lo que alguna vez pasó por tus manos. */
  seen: { tools: string[]; specials: string[]; bosses: string[]; forms: string[] };
  /** Para no contar dos veces lo que acumula una campaña en curso. */
  last: { id: number; forged: number; contracts: number; skips: number };
  /** Sellos de maestría: el nivel de obra más alto ganado con cada herramienta en el cinturón y con cada baraja. */
  mastery: { tools: Record<string, number>; decks: Record<string, number> };
  /** Mejor resultado en la Obra diaria. */
  daily: { date: string; cleared: number; won: boolean };
}
export const META_VERSION = 2;
export const newMeta = (): Meta => ({
  v: META_VERSION,
  renown: 0,
  up: {},
  runs: 0,
  wins: 0,
  best: 0,
  ascMax: 0,
  ach: {},
  stats: { floors: 0, cleans: 0, maxHit: 0, maxGold: 0, reach: 0, winAsc: -1, intact: 0, depth: 0, forged: 0, contracts: 0, skips: 0, maxTools: 0, dailies: 0 },
  seen: { tools: [], specials: [], bosses: [], forms: [] },
  last: { id: 0, forged: 0, contracts: 0, skips: 0 },
  mastery: { tools: {}, decks: {} },
  daily: { date: '', cleared: 0, won: false },
});

/** Carga un gremio guardado (de esta versión o de una anterior) sobre uno nuevo. */
export function loadMeta(saved: unknown): Meta {
  const base = newMeta();
  if (!saved || typeof saved !== 'object') return base;
  const old = saved as Partial<Meta> & { seen?: { relics?: string[] } & Partial<Meta['seen']> };
  const meta: Meta = { ...base, ...old, ach: { ...old.ach }, stats: { ...base.stats, ...old.stats }, seen: { ...base.seen, ...old.seen }, last: { ...base.last, ...old.last }, daily: { ...base.daily, ...old.daily }, up: { ...old.up }, mastery: { tools: { ...old.mastery?.tools }, decks: { ...old.mastery?.decks } } };
  meta.ascMax = Math.max(0, Math.min(MAX_ASCENSION, meta.ascMax));
  if ((old.v ?? 1) < META_VERSION) {
    // las mejoras cambiaron de arriba abajo: se devuelve todo lo gastado y se empieza de cero
    for (const [id, level] of Object.entries(meta.up)) for (let i = 0; i < level; i++) meta.renown += RETIRED[id]?.[i] ?? 0;
    meta.up = {};
    meta.seen.tools = [...new Set([...(old.seen?.relics ?? []), ...meta.seen.tools])].filter((id) => TOOL[id]);
    meta.v = META_VERSION;
  }
  delete (meta.seen as { relics?: unknown }).relics;
  return meta;
}

/** Niveles válidos de mejora (lo que llega de un cliente se recorta a su máximo). */
export function cleanUp(up: unknown): Record<string, number> {
  const src = (up && typeof up === 'object' ? up : {}) as Record<string, unknown>;
  return Object.fromEntries(UPGRADES.map((u) => [u.id, Math.max(0, Math.min(u.costs.length, Math.floor(Number(src[u.id]) || 0)))]));
}

export function buyUpgrade(meta: Meta, id: string): boolean {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return false;
  const level = meta.up[id] ?? 0;
  const cost = u.costs[level];
  if (cost === undefined || meta.renown < cost) return false;
  meta.renown -= cost;
  meta.up[id] = level + 1;
  return true;
}

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

export type RunAction =
  | { t: 'begin' }
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
  /** Cinturón: nuevo orden de las herramientas (permutación de índices). */
  | { t: 'reorder'; order: number[] }
  /** Tras la obra 8: seguir en los Cimientos abisales. */
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
  /** Obra diaria (AAAA-MM-DD): misma semilla para todos, sin mejoras del gremio. */
  daily?: string;
}

export interface Run {
  /** Versión del formato (RUN_VERSION). */
  v: number;
  id: number;
  /** La semilla, tal como se muestra y se comparte. */
  seedText: string;
  daily: string | null;
  rng: number;
  ascension: number;
  deckId: string;
  up: Record<string, number>;
  /** Surtidos de esta campaña. */
  pool: string[];
  toolPool: string[];
  seals: Seal[];
  treats: Treatment[];
  stage: number;
  phase: 'pack' | 'map' | 'battle' | 'reward' | 'shop' | 'event' | 'won' | 'lost';
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
  boss: string | null;
  node: MapNode;
  contract: string | null;
  /** Lo que pasó con el contrato de la última obra. */
  contractDone: boolean | null;
  /** El contrato maldito: la próxima obra tiene +1 de amenaza. */
  curse: boolean;
  freeShop: boolean;
  pack: string[];
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
  stats: { floors: number; cleans: number; turns: number; gold: number; maxHit: number; burned: number; forged: number; contracts: number; skips: number; toolUse: Record<string, number>; stageTurns: number[] };
  /** Cartas (ids) que el Timbre del gremio selló al entrar a la obra en curso; vacío si no lo llevas. */
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

function grantTool(run: Run, rarities: Rarity[]): boolean {
  if (run.tools.length >= TOOL_SLOTS) return false;
  const id = rollTool(run, rarities) ?? rollTool(run, ALL_RARITIES);
  if (!id) return false;
  run.tools.push({ id, n: 0 });
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

// ───────────────────────── Barajas iniciales ─────────────────────────

export interface DeckDef {
  id: string;
  name: string;
  desc: string;
  /** Logro que la desbloquea (null: disponible desde el principio). */
  unlock: string | null;
  build(run: Run): void;
}
const copyOf = (c: Card): Card => ({ ...c, id: `${c.id}b` });
/** Cifras de cada baraja (`barajas` de balance-config.json). */
const BAR = BALANCE.barajas;
export const DECKS: DeckDef[] = [
  { id: 'obra', name: 'Baraja de la conjura', desc: 'La de siempre: 40 cartas, 2 Comodines y un Sobre lacrado de {sobre} especiales.', unlock: null, build: () => {} },
  {
    id: 'acero',
    name: 'Baraja negra',
    desc: 'Solo ♠ y ♣, dobles: sin Cura ni Salpica. Gota de veneno, Pavés y +{vida} de Vida (+Baluarte con su arcón).',
    unlock: 'capataz',
    build: (run) => {
      const black = run.deck.filter((c) => c.suit === 'S' || c.suit === 'C');
      run.deck = [...black, ...black.map(copyOf), ...run.deck.filter((c) => c.suit === 'X')];
      run.tools.push({ id: 'acido', n: 0 }, { id: 'sacos', n: 0 });
      // la caja de aguante del gremio le da con qué cobrar tanto muro: el Bastión
      if (run.toolPool.includes('bastion')) run.tools.push({ id: 'bastion', n: 0 });
      run.maxIntegrity += BAR.acero.vida;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'prestamista',
    name: 'Baraja del prestamista',
    desc: '+{oro} de oro inicial y el interés rinde el doble, pero tienes {vida} de Vida menos.',
    unlock: 'media',
    build: (run) => {
      run.gold += BAR.prestamista.oro;
      run.interestCap += BAR.prestamista.interes;
      run.maxIntegrity -= BAR.prestamista.vida;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'ases',
    name: 'Baraja de ases',
    desc: 'Ocho ases y ningún 2: más Ases cómplices y más pegada, pero tienes {vida} de Vida menos.',
    unlock: 'madre',
    build: (run) => {
      const aces = run.deck.filter((c) => c.rank === 1);
      run.deck = [...run.deck.filter((c) => c.rank !== 2), ...aces.map(copyOf)];
      run.maxIntegrity -= BAR.ases.vida;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'corta',
    name: 'Baraja corta',
    desc: 'Sin doses ni treses: golpes gordos, el Mazo se agota antes y tienes {vida} de Vida menos. +{oro} de oro inicial.',
    unlock: 'golpe100',
    build: (run) => {
      run.deck = run.deck.filter((c) => c.rank < 2 || c.rank > 3);
      run.gold += BAR.corta.oro;
      run.maxIntegrity -= BAR.corta.vida;
      run.integrity = run.maxIntegrity;
    },
  },
  {
    id: 'caos',
    name: 'Baraja del caos',
    desc: 'Un solo Comodín, pero el Sobre lacrado inicial trae {total} cartas especiales.',
    unlock: 'coleccion',
    build: (run) => {
      run.deck = run.deck.filter((c) => c.id !== 'X2');
      for (const id of rollSpecials(run, BAR.caos.especiales)) {
        run.pack.push(id);
        addSpecial(run, id);
      }
    },
  },
];
const DECK_NUMS: Record<string, Record<string, number>> = { ...BAR, obra: { sobre: BALANCE.inicio.sobre }, caos: { total: BALANCE.inicio.sobre + BAR.caos.especiales } };
for (const d of DECKS) d.desc = fill(d.desc, DECK_NUMS[d.id] ?? {});
export const DECK: Record<string, DeckDef> = Object.fromEntries(DECKS.map((d) => [d.id, d]));

/** Semilla de la Obra diaria: la misma para todo el mundo ese día. */
export const dailySeed = (date: string) => seedFrom(`derrumbe-diaria-${date}`);

export function newRun(opts: RunOpts, fallbackSeed = 1): Run {
  const daily = typeof opts.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(opts.daily) ? opts.daily : null;
  const seedText = daily ?? (typeof opts.seedText === 'string' && opts.seedText.trim() ? opts.seedText.trim().slice(0, 24).toUpperCase() : '');
  // «#K3F9QZ» es una semilla al azar tal como se enseña (base 36): se lee tal cual, sin hash, para que se repita
  const seed = daily ? dailySeed(daily) : /^#[0-9A-Z]{1,7}$/.test(seedText) ? parseInt(seedText.slice(1), 36) | 0 : seedText ? seedFrom(seedText) : ((Number.isFinite(opts.seed) ? Number(opts.seed) : fallbackSeed) | 0);
  const up = daily ? cleanUp({}) : cleanUp(opts.up);
  const boxes = BOXES.filter((b) => up[`caja_${b}`]);
  const maxIntegrity = BALANCE.inicio.vida;
  const run: Run = {
    v: RUN_VERSION,
    id: seed,
    seedText: seedText || `#${(seed >>> 0).toString(36).toUpperCase()}`,
    daily,
    rng: seed,
    ascension: daily ? 0 : Math.max(0, Math.min(MAX_ASCENSION, Math.floor(opts.ascension ?? 0) || 0)),
    deckId: !daily && DECK[opts.deck ?? ''] ? opts.deck! : 'obra',
    up,
    pool: [...new Set([...BASE_POOL, ...(!daily && Array.isArray(opts.pool) ? opts.pool.filter((id) => typeof id === 'string' && SPECIAL[id]) : [])])],
    toolPool: toolPool(boxes),
    seals: up.tampones ? [...SEALS] : ['eco', 'jornal'],
    treats: up.bronce ? [...TREATMENTS] : ['forjado', 'templado'],
    stage: 1,
    phase: 'pack',
    gold: BALANCE.inicio.oro + BALANCE.orden.oroPorNivel * up.caja,
    integrity: maxIntegrity,
    maxIntegrity,
    tools: [],
    deck: standardDeck(),
    levels: Object.fromEntries(FORMATIONS.map((f) => [f, 0])) as Record<Formation, number>,
    handBonus: 0,
    interestCap: BALANCE.inicio.interesTope,
    scrap: 0,
    bosses: {},
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
    stats: { floors: 0, cleans: 0, turns: 0, gold: 0, maxHit: 0, burned: 0, forged: 0, contracts: 0, skips: 0, toolUse: {}, stageTurns: [] },
  };
  run.pack = rollSpecials(run, BALANCE.inicio.sobre);
  for (const id of run.pack) addSpecial(run, id);
  if (run.ascension >= 5) run.maxIntegrity -= REIN.heridasViejas;
  run.integrity = Math.min(run.integrity, run.maxIntegrity);
  DECK[run.deckId].build(run);
  // los jefes se sortean ya: el plano los enseña desde el primer momento
  const bosses = pick(run, BOSSES, 4).map((b) => b.id);
  STAGES.forEach((s, i) => s.boss && (run.bosses[i + 1] = bosses.shift()!));
  run.events = pick(run, EVENTS, EVENT_AFTER.length).map((e) => e.id);
  return run;
}

/** Cuánto más aguantan las obras según el tamaño de la cuadrilla (1 a 4 jugadores). */
const COOP_HP = BALANCE.cuadrilla;
/** Fatiga de cimientos en campaña: turno en que empieza (en solitario), cada cuántos turnos sube y cuánta Resonancia da cada nivel. */
export const FATIGUE: { start: number; every: number; res: number } = BALANCE.asedio;

/** Timbre del gremio: cartas del mazo que sella al empezar cada obra (además de activar dos veces todos los sellos). */
export const TIMBRE: { stamps: number } = BALANCE.timbre;
/** Nivel 8 «Clausura»: obras en las que sube la amenaza de todas las torres, y cuánto. */
export const CLAUSURA: { stages: number[]; threat: number } = BALANCE.clausura;
ASCENSIONS.forEach((a) => (a.desc = fill(a.desc, { pct: Math.round((REIN.corazas - 1) * 100), impuesto: REIN.impuesto, rey: REIN.reyColerico, heridas: REIN.heridasViejas, noche: REIN.guardiaNoche, asaltos: CLAUSURA.stages.join(', '), clausura: CLAUSURA.threat })));

/** Reglas efectivas de la obra actual: base + nivel de obra + planos + herramientas + jefe + contrato. */
export function stageConfig(run: Run, players = 1): Config {
  const st = stageDef(run.stage);
  const cfg: Config = structuredClone(DEFAULT_CONFIG);
  cfg.maxIntegrity = run.maxIntegrity;
  cfg.handSize = { [players]: 7 + run.handBonus };
  // en cuadrilla hay más manos entre las que elegir: las obras aguantan más
  const a = run.ascension;
  const scale = st.hp * (a >= 1 ? REIN.corazas : 1) * COOP_HP[Math.min(players, 4) - 1];
  for (const r of [11, 12, 13]) {
    cfg.floorHp[r] = Math.round(DEFAULT_CONFIG.floorHp[r] * scale);
    cfg.floorThreat[r] = Math.max(1, DEFAULT_CONFIG.floorThreat[r] + st.threat + (a >= 4 && r === 13 ? REIN.reyColerico : 0) + (a >= 6 && r !== 13 ? REIN.guardiaNoche : 0) + (a >= 7 && CLAUSURA.stages.includes(run.stage) ? CLAUSURA.threat : 0));
  }
  if (a >= 3 && st.boss) cfg.apuntalado = [13];
  // fatiga de cimientos: en cuadrilla las obras duran más turnos y empieza en proporción
  cfg.fatigueStart = Math.round(FATIGUE.start * COOP_HP[Math.min(players, 4) - 1]);
  cfg.fatigueEvery = FATIGUE.every;
  cfg.fatigueRes = FATIGUE.res;
  cfg.formLevel = { ...run.levels };
  for (const t of run.tools) TOOL[t.id]?.cfg?.(cfg);
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
  return {
    config,
    rng: (run.rng ^ 0x5bd1e995) | 0,
    players: players.map((p) => ({ id: p.id, name: p.name, hand: deck.splice(0, size), reserve: [] })),
    deck,
    discard: [],
    towers: newTowers(stageDef(run.stage).floors, config),
    integrity: Math.min(run.integrity, config.maxIntegrity),
    wall: 0,
    turn: 0,
    turnCount: 0,
    collapses: 0,
    phase: 'playing',
    lastSiren: null,
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
    fatigue: 0,
  };
}

/** Anota lo que la campaña necesita de cada jugada: oro, golpes limpios, contratos y estadísticas. */
export function trackEvents(run: Run, events: GameEvent[]): void {
  for (const ev of events) {
    if (ev.e === 'floorDown') {
      run.stats.floors++;
      if (ev.clean) {
        run.battle.cleans++;
        run.stats.cleans++;
      }
    } else if (ev.e === 'gold') {
      run.gold += ev.amount;
      run.stats.gold += ev.amount;
    } else if (ev.e === 'siren') run.battle.taken += ev.taken;
    else if (ev.e === 'collapse') run.battle.taken += ev.loss;
    else if (ev.e === 'hurt') run.battle.taken += ev.amount;
    else if (ev.e === 'joker') run.battle.jokers++;
    else if (ev.e === 'play') run.battle.forms.includes(ev.formation) || run.battle.forms.push(ev.formation);
    else if (ev.e === 'impact') run.stats.maxHit = Math.max(run.stats.maxHit, ev.total);
    else if (ev.e === 'burn') run.stats.burned++;
    else if (ev.e === 'step' && ev.src === 'tool') run.stats.toolUse[ev.id] = (run.stats.toolUse[ev.id] ?? 0) + 1;
    else if (ev.e === 'end' && ev.result === 'lost') run.death = autopsy(events, stageConfig(run));
  }
}

export const removeCost = (run: Run) => BALANCE.taberna.hoguera.base + BALANCE.taberna.hoguera.paso * run.removals;
export const healCost = (run: Run) => BALANCE.taberna.curar.base + BALANCE.taberna.curar.paso * run.heals;
export const rerollCost = (run: Run) => (run.vouchers > 0 ? 0 : BALANCE.taberna.renovar.base + BALANCE.taberna.renovar.paso * run.rerolls);
export const offerCost = (run: Run, o: Offer) => (run.freeShop ? 0 : o.cost);
export const sellValue = (id: string) => Math.max(1, Math.floor(RARITY[TOOL[id]?.rarity ?? 'comun'].cost / 2));

function generateShop(run: Run): Offer[] {
  const offers = stock(run);
  if (run.ascension >= 2) for (const o of offers) o.cost += REIN.impuesto;
  return offers;
}

function stock(run: Run): Offer[] {
  const offers: Offer[] = [];
  const seen: string[] = [];
  for (let i = 0; i < BALANCE.taberna.reliquias + lvl(run, 'tienda'); i++) {
    const id = rollTool(run, ALL_RARITIES, seen);
    if (!id) break;
    seen.push(id);
    offers.push({ kind: 'tool', id, cost: vary(run, RARITY[TOOL[id].rarity].cost) });
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
  // la primera ruta nunca es de riesgo; el Topógrafo del gremio añade una tercera
  const [safe] = pick(run, CONTRACTS.filter((c) => !c.risk), 1);
  const others = pick(run, CONTRACTS.filter((c) => c.id !== safe.id), 1 + lvl(run, 'rutas'));
  run.node = { routes: [safe.id, ...others.map((c) => c.id)], tag: pick(run, TAGS, 1)[0].id };
}

function advance(run: Run): void {
  run.stage++;
  run.curse = run.curse && run.phase === 'event'; // el contrato maldito pesa sobre la obra que viene
  run.shop = [];
  run.event = null;
  run.freeShop = false;
  toMap(run);
}

function draftOptions(run: Run): DraftOpt[] {
  const specials = rollSpecials(run, 2).map((id): DraftOpt => ({ kind: 'special', id }));
  const card: Card = { id: `c-${++run.serial}`, suit: pick<Suit>(run, SUITS, 1)[0], rank: pick(run, [1, 6, 7, 8, 9, 10], 1)[0] };
  if (roll(run, 2)) card.seal = pick(run, run.seals, 1)[0];
  else card.tr = pick(run, run.treats, 1)[0];
  return [...specials, { kind: 'card', card }];
}

/** Cierra la batalla: sincroniza mazo y cinturón, y si se ganó cobra y abre la selección. */
export function finishBattle(run: Run, state: GameState): void {
  if (run.phase !== 'battle' || state.phase === 'playing') return;
  run.tools = state.tools.map((t) => ({ ...t }));
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
    ['Asalto ganado', C.asalto + Math.min(run.stage, LAST_STAGE)],
    ['Golpes exactos', Math.min(C.exactosTope, run.battle.cleans)],
    [fill('Vida que te queda (1 por cada {n})', { n: C.vidaCada }), Math.floor(state.integrity / C.vidaCada)],
    [fill('Interés (1 por cada {n} de oro)', { n: C.interesCada }), Math.min(run.interestCap, Math.floor(run.gold / C.interesCada))],
  ];
  if (run.tools.some((t) => t.id === 'hucha')) lines.push([TOOL.hucha?.name ?? 'Hucha', BALANCE.reliquias.hucha.oro]);
  run.pay = lines.filter(([, n]) => n > 0);
  const total = run.pay.reduce((a, [, n]) => a + n, 0);
  run.gold += total;
  run.stats.gold += total;
  if (state.integrity >= run.maxIntegrity) run.intact++;
  if (run.boss) run.beaten.includes(run.boss) || run.beaten.push(run.boss);
  run.integrity = Math.min(run.maxIntegrity, state.integrity + BALANCE.cobro.curaTrasAsalto);
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
    run.phase = 'won';
    return;
  }
  run.phase = 'reward';
  run.draft = draftOptions(run);
  run.drafted = false;
  const lootA = st.boss ? rollTool(run, ['oficio', 'capataz', 'reliquia']) : null;
  const lootB = lootA ? rollTool(run, ['oficio', 'capataz', 'reliquia'], [lootA]) : null;
  run.loot = [lootA, lootB].filter((id): id is string => !!id);
  run.looted = run.loot.length === 0;
}

/** Aplica una decisión de campaña. Devuelve un mensaje de error legible, o null si se aplicó. */
export function runAction(run: Run, a: RunAction): string | null {
  if (a.t === 'reorder') {
    const next = reorder(run.tools, a.order);
    if (!next) return 'Ese orden no es válido.';
    run.tools = next;
    return null;
  }
  if (run.pending && a.t !== 'target' && a.t !== 'cancel') return 'Antes elige las cartas pendientes.';
  switch (a.t) {
    case 'begin':
      if (run.phase !== 'pack') return 'La campaña ya empezó.';
      toMap(run);
      return null;
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
      toMap(run);
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
        run.tools.push({ id: a.id, n: 0 });
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
        if (!run.deck.some(isPlain)) return 'No tienes cartas que sellar.';
        run.pending = { kind: 'forge', i: a.i }; // se cobra al elegir la carta
        return null;
      }
      if (o.kind === 'tool') {
        if (run.tools.length >= TOOL_SLOTS) return `Solo caben ${TOOL_SLOTS} reliquias. Vende una antes.`;
        run.tools.push({ id: o.id!, n: 0 });
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
      if (run.phase !== 'shop') return 'Solo se queman cartas en la hoguera de la Taberna.';
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
      if (run.phase !== 'shop') return 'Solo en la Taberna.';
      if (run.integrity >= run.maxIntegrity) return 'Tu Vida ya está al máximo.';
      if (run.gold < healCost(run)) return 'No te alcanza el oro.';
      run.gold -= healCost(run);
      run.heals++;
      run.integrity = Math.min(run.maxIntegrity, run.integrity + BALANCE.taberna.curar.vida);
      return null;
    case 'sell': {
      if (run.phase === 'battle') return 'En pleno asalto no se vende.';
      const t = run.tools[a.i];
      if (!t) return 'No llevas esa reliquia.';
      run.gold += sellValue(t.id);
      run.tools.splice(a.i, 1);
      return null;
    }
    case 'reroll':
      if (run.phase !== 'shop') return 'Solo en la Taberna.';
      if (run.sobre) return 'Antes elige una carta del sobre abierto.';
      if (run.gold < rerollCost(run)) return 'No te alcanza el oro.';
      run.gold -= rerollCost(run);
      if (run.vouchers > 0) run.vouchers--;
      else run.rerolls++;
      run.shop = generateShop(run);
      return null;
    case 'next':
      if (run.phase !== 'shop') return 'Aún no puedes seguir.';
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
      if (opt.can && !opt.can(run)) return 'No puedes elegir eso ahora.';
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
    if (chosen.length !== 1 || !isPlain(chosen[0])) return 'Elige una carta de baraja.';
    if (!o || o.sold) return 'Esa oferta ya no está.';
    const cost = offerCost(run, o);
    if (run.gold < cost) return 'No te alcanza el oro.';
    if (o.seal) chosen[0].seal = o.seal;
    if (o.tr) chosen[0].tr = o.tr;
    run.gold -= cost;
    o.sold = true;
    run.stats.forged++;
  } else if (p.kind === 'dup') {
    if (chosen.length !== 1) return 'Elige una carta.';
    run.deck.push({ ...chosen[0], id: `c-${++run.serial}` });
  } else {
    if (chosen.length !== 2 || !chosen.every(isPlain)) return 'Elige dos cartas de baraja.';
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
export const stagesCleared = (run: Run) => (run.phase === 'battle' || run.phase === 'map' || run.phase === 'pack' || run.phase === 'lost' ? run.stage - 1 : run.stage);
export const depthOf = (run: Run) => Math.max(0, stagesCleared(run) - LAST_STAGE);

export function renownFor(run: Run): number {
  const base = Math.min(LAST_STAGE, stagesCleared(run)) + (run.conquered ? 5 : 0) + depthOf(run);
  return Math.max(1, Math.ceil(base * (1 + 0.25 * run.ascension)));
}

/** Abona al gremio el renombre de una campaña terminada. */
export function settle(meta: Meta, run: Run): number {
  const gained = renownFor(run);
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
  if (run.daily) {
    const cleared = stagesCleared(run);
    if (meta.daily.date !== run.daily || cleared > meta.daily.cleared) meta.daily = { date: run.daily, cleared, won: run.conquered };
    meta.stats.dailies++;
  }
  return gained;
}

/** Reordena el cinturón de la campaña y, si hay obra en curso, el de la mesa (misma permutación). */
export function reorderBelt(run: Run, state: GameState | null, order: number[]): string | null {
  const err = runAction(run, { t: 'reorder', order });
  if (err) return err;
  if (state && state.phase === 'playing') state.tools = reorder(state.tools, order) ?? state.tools;
  return null;
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
export const formBase = (run: Run, f: Formation) => ({ f: FORM[f].f + run.levels[f] * FORM[f].lf, r: Math.round((FORM[f].r + run.levels[f] * FORM[f].lr) * 100) / 100 });
