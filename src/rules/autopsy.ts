// Autopsia de la derrota y aviso de último turno. Puro y sin DOM: lee el lote de eventos de la jugada
// final (o la vista de la mesa) y lo cuenta en dos líneas llanas, con los números de verdad.
//
//   autopsy(events, cfg)  qué acabó con la conjura: un Contraataque que superó Escudo + Vida, el Mazo
//                         agotado (el Escudo no lo frena), una herida que se hizo el propio golpe, o
//                         quedarse sin cartas. (Los `kind` conservan sus nombres internos.)
//   omen(view)            lo que puede acabar con ella en el próximo Contraataque o al agotarse el Mazo.
//   autopsyWith / omenWith  lo mismo con los textos de un idioma (V10): `autopsyFor` y `omenFor` de
//                         src/rules/textos.ts. Las plantillas españolas son las de src/rules/plantillas.ts
//                         (`causa.*`, `aviso.*`), letra por letra los textos de siempre.
import { fill } from './balance-config';
import { CRUMBLE_LABEL, Card, Config, GameEvent, MATERIAL, PlayerView, SUITS, Suit, nextCollapse, standing, threatOf } from './engine';
import { ES_PLANTILLAS } from './plantillas';
import { SPECIAL } from './specials';
import { TOOL } from './tools';

/** Los textos que necesita la autopsia, en un idioma. */
export interface TextosAutopsia {
  /** Una plantilla `causa.*` o `aviso.*` rellena. */
  t(clave: string, valores?: Record<string, number | string>): string;
  especial(id: string): string;
  reliquia(id: string): string;
  /** Nombre del palo en mayúsculas, como en la mesa: «PICAS». */
  palo(s: Suit): string;
  /** El decreto del Relojero («Arena rápida»). */
  arena(): string;
}

/** Los textos españoles: plantillas puras y nombres de los datos. */
export const TEXTOS_ES: TextosAutopsia = {
  t: (clave, valores = {}) => fill(ES_PLANTILLAS[clave] ?? clave, valores),
  especial: (id) => SPECIAL[id]?.name ?? id,
  reliquia: (id) => TOOL[id]?.name ?? id,
  palo: (s) => MATERIAL[s],
  arena: () => CRUMBLE_LABEL,
};

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

const left = (tx: TextosAutopsia, n: number) => tx.t(n === 1 ? 'causa.quedaba.1' : 'causa.quedaba.n', { n });
const list = (tx: TextosAutopsia, names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : tx.t(names.length === 2 ? 'causa.lista.2' : 'causa.lista.mas', { a: names[0], b: names[1] });

/** De dónde vino la herida que se hizo el propio golpe: especiales que cuestan Vida, el decreto «inestable» y reliquias que cobran. */
function hurtSources(tx: TextosAutopsia, batch: GameEvent[]): string[] {
  const names: string[] = [];
  for (const ev of batch) {
    if (ev.e === 'play') for (const c of ev.cards) if (c.sp && SPECIAL[c.sp]?.fx.hurt) names.push(tx.especial(c.sp));
    if (ev.e !== 'step') continue;
    if (ev.src === 'state' && ev.id === 'inestable') names.push(tx.arena());
    else if (ev.src === 'tool' && ev.df === undefined && ev.dr === undefined && ev.mr === undefined && /pierdes \d+ de Vida/.test(ev.label)) names.push(tx.reliquia(ev.id));
  }
  return [...new Set(names)];
}

/** Lee el lote de eventos de la jugada final. null si no acaba en derrota. */
export function autopsy(events: GameEvent[], cfg: Config): Autopsy | null {
  return autopsyWith(TEXTOS_ES, events, cfg);
}

/** `autopsy` con los textos de un idioma. */
export function autopsyWith(tx: TextosAutopsia, events: GameEvent[], cfg: Config): Autopsy | null {
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
      const from = tower ? tx.t('causa.desde', { palo: tx.palo(tower) }) : tx.t('causa.desde.sin');
      const need = ev.taken - before + 1;
      const wall = tx.t(need === 1 ? 'causa.falta.1' : 'causa.falta.n', { n: need });
      const golpe = { desde: from, ataque: ev.threat, frena: ev.blocked, entra: ev.taken };
      return {
        kind: 'sirena',
        title: ev.blocked > 0 ? tx.t('causa.sirena.titulo', golpe) : tx.t('causa.sirena.titulo.sin', golpe),
        detail:
          earlier > 0
            ? tx.t('causa.sirena.detalle.otra', { k: earlier + 1, queda: left(tx, before), falta: wall })
            : tx.t('causa.sirena.detalle', { queda: left(tx, before), falta: wall }),
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
        title: tx.t('causa.colapso.titulo', { n: ev.loss }),
        detail: tx.t('causa.colapso.detalle', { queda: left(tx, before) }),
        before,
        threat: ev.loss,
        blocked: 0,
        taken: ev.loss,
      };
    }
    const who = list(tx, hurtSources(tx, events.slice(0, i))) || tx.t('causa.herida.propia');
    return {
      kind: 'herida',
      title: tx.t('causa.herida.titulo', { quien: who, n: ev.amount }),
      detail: tx.t('causa.herida.detalle', { queda: left(tx, before) }),
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
    title: tx.t('causa.sin_cartas.titulo'),
    detail: tx.t('causa.sin_cartas.detalle', { queda: left(tx, before) }),
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
  return omenWith(TEXTOS_ES, v);
}

/** `omen` con los textos de un idioma. */
export function omenWith(tx: TextosAutopsia, v: PlayerView): Omen | null {
  if (v.phase !== 'playing' || v.integrity <= 0) return null;
  // Mazo agotado: le quedan 2 cartas o menos y el rebarajado se lleva la Vida que queda
  const loss = nextCollapse(v, v.players.length);
  if (v.deckCount <= 2 && loss >= v.integrity) {
    const deck = tx.t(v.deckCount === 0 ? 'aviso.mazo.0' : v.deckCount === 1 ? 'aviso.mazo.1' : 'aviso.mazo.n', { n: v.deckCount });
    return {
      kind: 'colapso',
      title: tx.t('aviso.colapso.titulo', { mazo: deck, n: loss }),
      detail: tx.t(v.integrity === 1 ? 'aviso.colapso.detalle.1' : 'aviso.colapso.detalle.n', { vida: v.integrity }),
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
    title: tx.t('aviso.sirena.titulo', { palo: tx.palo(worst), ataque: threat }),
    detail: tx.t(v.integrity === 1 ? 'aviso.sirena.detalle.1' : 'aviso.sirena.detalle.n', {
      vida: v.integrity,
      escudo: v.wall > 0 ? tx.t('aviso.sirena.escudo', { n: v.wall }) : tx.t('aviso.sirena.escudo.sin'),
    }),
    life: v.integrity,
    threat,
    tower: worst,
    shield: v.wall,
  };
}
