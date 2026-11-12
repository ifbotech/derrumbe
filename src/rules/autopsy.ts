// Autopsia de la derrota y aviso de último turno. Puro y sin DOM: lee el lote de eventos de la jugada
// final (o la vista de la mesa) y lo cuenta en dos líneas llanas, con los números de verdad.
//
//   autopsy(events, cfg)  qué acabó con la conjura: un Contraataque que superó Escudo + Vida, el Mazo
//                         agotado (el Escudo no lo frena), una herida que se hizo el propio golpe, o
//                         quedarse sin cartas. (Los `kind` conservan sus nombres internos.)
//   omen(view)            lo que puede acabar con ella en el próximo Contraataque o al agotarse el Mazo.
import { CRUMBLE_LABEL, Card, Config, GameEvent, MATERIAL, PlayerView, SUITS, Suit, nextCollapse, standing, threatOf } from './engine';
import { SPECIAL } from './specials';
import { TOOL } from './tools';

export type DeathKind = 'sirena' | 'colapso' | 'herida' | 'sin_cartas';

export interface Autopsy {
  kind: DeathKind;
  /** Línea 1, texto llano ≤ 90 caracteres: qué acabó con tu Vida, con sus números. */
  title: string;
  /** Línea 2, texto llano ≤ 110 caracteres: por qué el Escudo o la curación no lo evitaron y qué mirar la próxima vez. */
  detail: string;
  /**
   * Para el gráfico: Vida antes del golpe final, el Ataque que venía, lo que frenó el Escudo y lo que entró.
   * Con el Mazo agotado y en una herida propia nada pasa por el Escudo (`blocked` es 0 y entra todo); sin cartas
   * no llega ningún golpe (`threat`, `blocked` y `taken` son 0).
   */
  before: number;
  threat: number;
  blocked: number;
  taken: number;
  /** Trono que dio el golpe final, si fue un Contraataque. */
  tower?: Suit;
}

const left = (n: number) => `Te ${n === 1 ? 'quedaba' : 'quedaban'} ${n} de Vida`;
const list = (names: string[]) => (names.length <= 1 ? (names[0] ?? '') : names.length === 2 ? names.join(' y ') : `${names[0]}, ${names[1]} y más`);

/** De dónde vino la herida que se hizo el propio golpe: especiales que cuestan Vida, el decreto «inestable» y reliquias que cobran. */
function hurtSources(batch: GameEvent[]): string[] {
  const names: string[] = [];
  for (const ev of batch) {
    if (ev.e === 'play') for (const c of ev.cards) if (c.sp && SPECIAL[c.sp]?.fx.hurt) names.push(SPECIAL[c.sp].name);
    if (ev.e !== 'step') continue;
    if (ev.src === 'state' && ev.id === 'inestable') names.push(CRUMBLE_LABEL);
    else if (ev.src === 'tool' && ev.df === undefined && ev.dr === undefined && ev.mr === undefined && /pierdes \d+ de Vida/.test(ev.label)) names.push(TOOL[ev.id]?.name ?? ev.id);
  }
  return [...new Set(names)];
}

/** Lee el lote de eventos de la jugada final. null si no acaba en derrota. */
export function autopsy(events: GameEvent[], cfg: Config): Autopsy | null {
  const end = events.filter((ev): ev is Extract<GameEvent, { e: 'end' }> => ev.e === 'end').pop();
  if (!end || end.result !== 'lost') return null;
  // Vida que se va conociendo a lo largo del lote: la de partida (si el motor la dejó anotada) y cada reparación
  let hp: number | null = typeof end.was === 'number' ? end.was : null;
  /** Contraataques que ya habían entrado en esta misma jugada (decreto de doble Contraataque). */
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
      // un golpe que se aguantó
      hp = ev.integrity;
      if (ev.e === 'siren') earlier++;
      continue;
    }
    // el golpe final: lo que quedaba no puede ser más de lo que entró
    const before = Math.max(0, Math.min(hp ?? cfg.maxIntegrity, amount));
    if (ev.e === 'siren') {
      const tower = ev.tower ?? undefined;
      const from = tower ? `Contraataque de ${MATERIAL[tower]}` : 'Contraataque';
      const need = ev.taken - before + 1;
      const wall = `${need === 1 ? 'Faltó' : 'Faltaron'} ${need} de Escudo (♣)`;
      return {
        kind: 'sirena',
        title: ev.blocked > 0 ? `${from}: Ataque ${ev.threat} contra Escudo ${ev.blocked} → entran ${ev.taken}` : `${from}: Ataque ${ev.threat} y ningún Escudo → entran ${ev.taken}`,
        detail: earlier > 0 ? `Era el ${earlier + 1}.º Contraataque del turno. ${left(before)}. ${wall} o un Golpe exacto.` : `${left(before)}. ${wall}; un Golpe exacto también lo paraba.`,
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
        title: `Mazo agotado: pierdes ${ev.loss} de Vida; el Escudo no lo frena`,
        detail: `${left(before)}. Cada vez que se agota el Mazo pierdes 1 más: cuenta el Mazo antes de robar.`,
        before,
        threat: ev.loss,
        blocked: 0,
        taken: ev.loss,
      };
    }
    const who = list(hurtSources(events.slice(0, i))) || 'Herida propia';
    return {
      kind: 'herida',
      title: `${who}: tu propio golpe te costó ${ev.amount} de Vida`,
      detail: `${left(before)}. El Escudo no frena lo que cuesta tu golpe: cura (♥) antes de arriesgar.`,
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
    title: 'Sin cartas: ni mano, ni Mazo, ni Descarte para seguir',
    detail: `${left(before)}, pero no hay con qué golpear: lo agotado y lo destruido no vuelve.`,
    before,
    threat: 0,
    blocked: 0,
    taken: 0,
  };
}

/** Aviso de último turno: lo que puede acabar con tu Vida en el próximo Contraataque o al agotarse el Mazo. null si no hay peligro inmediato. */
export interface Omen {
  kind: 'sirena' | 'colapso';
  title: string;
  detail: string;
  /** Tu Vida ahora mismo (los dos casos). */
  life: number;
  /** 'sirena': el mayor Ataque que puede llegar en el próximo Contraataque. */
  threat?: number;
  /** 'sirena': el palo del trono que lo daría. */
  tower?: Suit;
  /** 'sirena': tu Escudo ahora mismo. */
  shield?: number;
  /** 'colapso': la Vida que quita el Mazo agotado. */
  loss?: number;
  /** 'colapso': cartas que quedan en el Mazo (0, 1 o 2). */
  deck?: number;
}

export function omen(v: PlayerView): Omen | null {
  if (v.phase !== 'playing' || v.integrity <= 0) return null;
  // Mazo agotado: le quedan 2 cartas o menos y el rebarajado se lleva la Vida que queda
  const loss = nextCollapse(v, v.players.length);
  if (v.deckCount <= 2 && loss >= v.integrity) {
    const deck = v.deckCount === 0 ? 'el Mazo está vacío' : v.deckCount === 1 ? 'queda 1 carta en el Mazo' : `quedan ${v.deckCount} cartas en el Mazo`;
    return {
      kind: 'colapso',
      title: `Último turno: ${deck} y agotarlo quita ${loss} de Vida`,
      detail: `Te ${v.integrity === 1 ? 'queda' : 'quedan'} ${v.integrity} y el Escudo no frena el Mazo agotado: cura (♥) ya o gana el asalto antes de robar.`,
      life: v.integrity,
      loss,
      deck: v.deckCount,
    };
  }
  // Contraataque: el mayor Ataque en pie que de verdad puede salir (trono armado y con cartas de su palo por salir)
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
    title: `Último turno: el Contraataque de ${MATERIAL[worst]} (⚔ ${threat}) puede acabar contigo`,
    detail: `Te ${v.integrity === 1 ? 'queda' : 'quedan'} ${v.integrity} de Vida y ${v.wall > 0 ? `${v.wall} de Escudo` : 'ningún Escudo'}. Sube el Escudo (♣), cura (♥), desarma ese trono o da un Golpe exacto.`,
    life: v.integrity,
    threat,
    tower: worst,
    shield: v.wall,
  };
}
