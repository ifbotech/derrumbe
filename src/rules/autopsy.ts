// Autopsia de la derrota y aviso de último turno. Puro y sin DOM: lee el lote de eventos de la jugada
// final (o la vista de la mesa) y lo cuenta en dos líneas llanas, con los números de verdad.
//
//   autopsy(events, cfg)  qué tiró el búnker: una sirena que superó muro + integridad, un colapso de
//                         cantera (el muro no lo frena), una herida que se hizo el propio golpe, o
//                         quedarse sin cartas.
//   omen(view)            lo que puede tirarlo en la próxima sirena o el próximo colapso.
import { Card, Config, GameEvent, MATERIAL, PlayerView, SUITS, Suit, nextCollapse, standing, threatOf } from './engine';
import { SPECIAL } from './specials';
import { TOOL } from './tools';

export type DeathKind = 'sirena' | 'colapso' | 'herida' | 'sin_cartas';

export interface Autopsy {
  kind: DeathKind;
  /** Línea 1, texto llano ≤ 90 caracteres: qué tiró el búnker, con sus números. */
  title: string;
  /** Línea 2, texto llano ≤ 110 caracteres: por qué el muro o la reparación no lo evitaron y qué mirar la próxima vez. */
  detail: string;
  /**
   * Para el gráfico: integridad antes del golpe final, lo que venía, lo que frenó el muro y lo que entró.
   * En un colapso y en una herida propia nada pasa por el muro (`blocked` es 0 y entra todo); sin cartas
   * no llega ningún golpe (`threat`, `blocked` y `taken` son 0).
   */
  before: number;
  threat: number;
  blocked: number;
  taken: number;
  /** Torre que dio el golpe final, si fue una sirena. */
  tower?: Suit;
}

const left = (n: number) => `Al búnker le ${n === 1 ? 'quedaba' : 'quedaban'} ${n}`;
const list = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : names.length === 2 ? names.join(' y ') : `${names[0]}, ${names[1]} y más`);

/** De dónde vino la herida que se hizo el propio golpe: especiales que cuestan búnker, suelo inestable y herramientas que cobran. */
function hurtSources(batch: GameEvent[]): string[] {
  const names: string[] = [];
  for (const ev of batch) {
    if (ev.e === 'play') for (const c of ev.cards) if (c.sp && SPECIAL[c.sp]?.fx.hurt) names.push(SPECIAL[c.sp].name);
    if (ev.e !== 'step') continue;
    if (ev.src === 'state' && ev.id === 'inestable') names.push('Suelo inestable');
    else if (ev.src === 'tool' && ev.df === undefined && ev.dr === undefined && ev.mr === undefined && /búnker pierde/.test(ev.label)) names.push(TOOL[ev.id]?.name ?? ev.id);
  }
  return [...new Set(names)];
}

/** Lee el lote de eventos de la jugada final. null si no acaba en derrota. */
export function autopsy(events: GameEvent[], cfg: Config): Autopsy | null {
  const end = events.filter((ev): ev is Extract<GameEvent, { e: 'end' }> => ev.e === 'end').pop();
  if (!end || end.result !== 'lost') return null;
  // integridad que se va conociendo a lo largo del lote: la de partida (si el motor la dejó anotada) y cada reparación
  let hp: number | null = typeof end.was === 'number' ? end.was : null;
  /** Sirenas que ya habían entrado al búnker en esta misma jugada (doble sirena). */
  let earlier = 0;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.e === 'repair') {
      hp = ev.total;
      continue;
    }
    const amount = ev.e === 'siren' ? ev.taken : ev.e === 'collapse' ? ev.loss : ev.e === 'hurt' ? ev.amount : 0;
    if (amount <= 0 || (ev.e !== 'siren' && ev.e !== 'collapse' && ev.e !== 'hurt')) continue;
    if (ev.integrity > 0) {
      // un golpe que el búnker aguantó
      hp = ev.integrity;
      if (ev.e === 'siren') earlier++;
      continue;
    }
    // el golpe final: lo que quedaba no puede ser más de lo que entró
    const before = Math.max(0, Math.min(hp ?? cfg.maxIntegrity, amount));
    if (ev.e === 'siren') {
      const tower = ev.tower ?? undefined;
      const from = tower ? `Sirena de ${MATERIAL[tower]}` : 'Sirena';
      const need = ev.taken - before + 1;
      const wall = `${need === 1 ? 'Faltó' : 'Faltaron'} ${need} de muro (♣)`;
      return {
        kind: 'sirena',
        title: ev.blocked > 0 ? `${from}: amenaza ${ev.threat} contra muro ${ev.blocked} → entran ${ev.taken}` : `${from}: amenaza ${ev.threat} y ningún muro → entran ${ev.taken}`,
        detail: earlier > 0 ? `Era la ${earlier + 1}.ª sirena del turno. ${left(before)}. ${wall} o un golpe limpio.` : `${left(before)}. ${wall}; un golpe limpio también la callaba.`,
        before,
        threat: ev.threat,
        blocked: ev.blocked,
        taken: ev.taken,
        tower,
      };
    }
    if (ev.e === 'collapse') {
      return {
        kind: 'colapso',
        title: `Cantera agotada: el colapso quitó ${ev.loss} y el muro no lo frena`,
        detail: `${left(before)}. Cada colapso quita 1 más que el anterior: cuenta la cantera antes de robar.`,
        before,
        threat: ev.loss,
        blocked: 0,
        taken: ev.loss,
      };
    }
    const who = list(hurtSources(events.slice(0, i))) || 'Herida propia';
    return {
      kind: 'herida',
      title: `${who}: tu propio golpe le costó ${ev.amount} al búnker`,
      detail: `${left(before)}. El muro no frena lo que cuesta tu golpe: repara (♥) antes de arriesgar.`,
      before,
      threat: ev.amount,
      blocked: 0,
      taken: ev.amount,
    };
  }
  // nada golpeó: no quedaba con qué seguir
  const before = Math.max(0, hp ?? 0);
  return {
    kind: 'sin_cartas',
    title: 'Sin cartas: ni mano, ni cantera, ni escombrera para seguir',
    detail: `${left(before)}, pero no hay con qué golpear: lo agotado y lo destruido no vuelve.`,
    before,
    threat: 0,
    blocked: 0,
    taken: 0,
  };
}

/** Aviso de último turno: lo que puede tirar el búnker en la próxima sirena o el próximo colapso. null si no hay peligro inmediato. */
export interface Omen {
  kind: 'sirena' | 'colapso';
  title: string;
  detail: string;
}

export function omen(v: PlayerView): Omen | null {
  if (v.phase !== 'playing' || v.integrity <= 0) return null;
  // colapso: a la cantera le quedan 2 cartas o menos y el siguiente se lleva lo que queda de búnker
  const loss = nextCollapse(v, v.players.length);
  if (v.deckCount <= 2 && loss >= v.integrity) {
    const deck = v.deckCount === 0 ? 'la cantera está vacía' : v.deckCount === 1 ? 'queda 1 carta en la cantera' : `quedan ${v.deckCount} cartas en la cantera`;
    return {
      kind: 'colapso',
      title: `Último turno: ${deck} y el colapso quita ${loss}`,
      detail: `Te ${v.integrity === 1 ? 'queda' : 'quedan'} ${v.integrity} y el muro no frena un colapso: repara (♥) ya o remata la obra antes de robar.`,
    };
  }
  // sirena: la mayor amenaza en pie que de verdad puede sonar (torre armada y con cartas de su palo por salir)
  const pool: Card[] = v.deckCount > 0 ? v.unseen : [...v.discard, ...v.hand, ...v.reserve];
  let worst: Suit | null = null;
  for (const s of SUITS) {
    const t = v.towers[s];
    if (!standing(t) || t.disarmed || t.fx.sobrecarga) continue;
    if (!pool.some((c) => c.suit === s)) continue;
    if (worst === null || threatOf(v, t) > threatOf(v, v.towers[worst])) worst = s;
  }
  if (worst === null) return null;
  const threat = threatOf(v, v.towers[worst]);
  if (threat < v.integrity + v.wall) return null;
  return {
    kind: 'sirena',
    title: `Último turno: la sirena de ${MATERIAL[worst]} (${threat}) puede tirar el búnker`,
    detail: `Te ${v.integrity === 1 ? 'queda' : 'quedan'} ${v.integrity} y ${v.wall > 0 ? `${v.wall} de muro` : 'no hay muro'}. Sube el muro (♣), repara (♥), desarma esa torre o da un golpe limpio.`,
  };
}
