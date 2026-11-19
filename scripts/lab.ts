// Banco de pruebas compartido por los simuladores: juega una campaña entera con el bot de
// referencia y deja anotado todo lo que el laboratorio de balance necesita medir.
// El parche del afinador (BALANCE_PATCH) va lo primero: tiene que tocar los números antes de que se carguen las reglas.
import './balance-patch';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { FIGURAS, applyAction, currentPlayer } from '../src/rules/engine';
import type { Seal, Treatment } from '../src/rules/engine';
import { RunPolicy, chooseAction, chooseRunAction } from '../src/rules/bot';
import { LAST_STAGE, Run, RunOpts, UPGRADES, addSpecial, finishBattle, newRun, runAction, stagesCleared, startStage, trackEvents, BOSS, CLAUSURA, DECKS, FURIA, STAGES, TIMBRE } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';

export interface Spec {
  seed: number;
  deck: string;
  ascension: number;
  /** Gremio lleno: todas las mejoras y todas las legendarias. */
  full: boolean;
  players?: number;
  /** Herramienta o carta especial de regalo al empezar (para medir cuánto vale por sí sola). */
  giveTool?: string;
  giveSpecial?: string;
  /** V40 1c · Bendición de regalo al empezar (con 0 cargas), para medir cuánto vale por sí sola. */
  giveBendicion?: string;
  /** Campaña de control: las mismas semillas que las de regalo, pero sin regalo. */
  control?: 'tool' | 'special' | 'bendicion';
  /** Con gremio lleno, solo estas mejoras (y «legendarias»). */
  only?: string[];
  policy?: RunPolicy;
  /** Rangos del Árbol tal cual (manda sobre `full`/`only`): para medir nodos sueltos, p. ej. los incrementales. */
  up?: Record<string, number>;
}

/** Lo que se apunta de cada campaña. */
export interface Log {
  spec: Spec;
  won: boolean;
  cleared: number;
  /** Obra en la que cayó el búnker (null si ganó) y jefe que la guardaba. */
  diedAt: number | null;
  diedBoss: string | null;
  /** Jefes a los que se llegó a enfrentar. */
  faced: string[];
  stageTurns: number[];
  /** V40 · jugadas de cada asalto: los turnos más las que no gastan el turno (Pasar, Comodín de El Mentiroso, andamio). */
  stageJugadas: number[];
  /** Cinturón y mazo al entrar a la obra 5 (null si no se llegó). */
  mid: { tools: string[]; specials: string[]; seals: Seal[]; treats: Treatment[] } | null;
  toolsEnd: string[];
  toolUse: Record<string, number>;
  /** Veces que cada cosa se ofreció y se eligió (ferretería, botín y selección). */
  offered: Record<string, number>;
  taken: Record<string, number>;
  maxHit: number;
  gold: number;
  /** Golpes del jugador en la campaña (eventos `impact`). */
  golpes: number;
  /** V40 1c · las Bendiciones al acabar, con sus cargas. */
  bendEnd: { id: string; n: number }[];
}

// Mandos de ajuste (variables de entorno): valen para el laboratorio entero, también en sus procesos hijos.
//   HPS=3.9,3.9,…  resistencia de cada obra · HPX=0.8 escala todas · LATE=0.2 inclina hacia las últimas
//   THR=2,2,3,…    amenaza de cada obra · FUR=1,1,2  Furia: por Mazo agotado, por turno del monarca, Vida del monarca (× la de su guardia)
//   BARAJA=corta:1:-3  prueba una baraja con más o menos búnker y oro inicial de los que tiene
//   TIMBRE=2  cartas que sella el Timbre del gremio al empezar cada obra · VENTISCA=4:1  tope de muro de La Ventisca (y amenaza que suma)
//   CLAUSURA=5:1  asaltos en los que el Reinado 8 sube el Ataque, y cuánto (2,4,5:1 es «en los asaltos con monarca»)
const env = process.env;
if (env.HPS) env.HPS.split(',').forEach((v, i) => STAGES[i] && (STAGES[i].hp = Number(v)));
if (env.THR) env.THR.split(',').forEach((v, i) => STAGES[i] && (STAGES[i].threat = Number(v)));
if (env.HPX || env.LATE) STAGES.forEach((st, i) => (st.hp = Math.round(st.hp * Number(env.HPX ?? 1) * (1 + Number(env.LATE ?? 0) * (i / Math.max(1, STAGES.length - 1))) * 100) / 100));
if (env.BARAJA) {
  const [id, bunker, gold] = env.BARAJA.split(':');
  const deck = DECKS.find((d) => d.id === id);
  if (!deck) throw new Error(`BARAJA: no existe la baraja «${id}»`);
  const build = deck.build;
  deck.build = (run) => {
    build(run);
    run.maxIntegrity += Number(bunker) || 0;
    run.integrity = run.maxIntegrity;
    run.gold += Number(gold) || 0;
  };
}
if (env.TIMBRE) TIMBRE.stamps = Number(env.TIMBRE);
if (env.VENTISCA) {
  const [cap, up] = env.VENTISCA.split(':').map(Number);
  BOSS.intemperie.apply = (c) => {
    c.wallCap = Math.min(c.wallCap, cap);
    if (up) FIGURAS.forEach((r) => (c.floorThreat[r] = Math.max(1, c.floorThreat[r] + up)));
  };
}
if (env.CLAUSURA) {
  const [stages, threat] = env.CLAUSURA.split(':');
  Object.assign(CLAUSURA, { stages: stages.split(',').map(Number), threat: Number(threat ?? 1) });
}
if (env.FUR) {
  const [mazo, rey, jefeVida] = env.FUR.split(',').map(Number);
  Object.assign(FURIA, { mazo, rey: rey ?? FURIA.rey, jefeVida: jefeVida || FURIA.jefeVida });
}

const bump = (rec: Record<string, number>, key: string) => void (rec[key] = (rec[key] ?? 0) + 1);

/** Archivos cuyas reglas decide el laboratorio: si cambian, el informe publicado deja de valer. */
// V12: también el Árbol, lo que cae y los huesos (mueven el oro y los nodos de combate de la campaña).
const RULE_FILES = ['engine', 'run', 'tools', 'specials', 'bot', 'arbol', 'caida', 'huesos', 'mazos', 'reyes'];
/** Y los números con que juegan: balance-config.json (sin espacios: solo cuentan sus valores). */
const RULE_DATA = 'balance-config.json';
/**
 * Huella de las reglas: el código de `src/rules` que juega las campañas, sin comentarios, sin espacios y sin
 * los textos (desc, name, who), que no cambian ninguna partida. La guarda `meta-report.json` y la comprueba
 * `tests/invariantes.test.ts`: así se sabe que el informe publicado es de estas reglas. Las palancas de
 * entorno de arriba (TIMBRE, CLAUSURA…) y el parche del afinador (BALANCE_PATCH) no entran: la huella dice
 * qué hay en disco. Desde la 9.0 entran también los números de balance-config.json.
 */
export function fingerprint(): string {
  const hash = createHash('sha256');
  for (const f of RULE_FILES) {
    const src = readFileSync(new URL(`../src/rules/${f}.ts`, import.meta.url), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1')
      .replace(/\b(desc|name|who)\s*:\s*(['"`])(?:\\.|(?!\2)[^\\])*\2/g, '$1:""')
      .replace(/\s+/g, '');
    hash.update(`${f}\n${src}\n`);
  }
  const data = JSON.stringify(JSON.parse(readFileSync(new URL(`../src/rules/${RULE_DATA}`, import.meta.url), 'utf8')));
  hash.update(`${RULE_DATA}\n${data}\n`);
  return hash.digest('hex').slice(0, 16);
}

export function optsFor(spec: Spec): RunOpts {
  // V12: «Árbol lleno» = los 30 nodos al máximo (UPGRADES es el Árbol); los incrementales no mueven el combate
  const up = spec.up ? { ...spec.up } : spec.full ? Object.fromEntries(UPGRADES.filter((u) => !spec.only || spec.only.includes(u.id)).map((u) => [u.id, u.costs.length])) : {};
  const pool = spec.full && (!spec.only || spec.only.includes('legendarias')) ? SPECIALS.map((s) => s.id) : [];
  return { up, deck: spec.deck, pool, ascension: spec.ascension };
}

export function playCampaign(spec: Spec): { run: Run; log: Log } {
  const players = Array.from({ length: spec.players ?? 1 }, (_, i) => ({ id: `p${i}`, name: `p${i}` }));
  const run = newRun(optsFor(spec), spec.seed);
  if (spec.giveTool) run.tools.push({ id: spec.giveTool, n: 0 });
  if (spec.giveSpecial) addSpecial(run, spec.giveSpecial);
  if (spec.giveBendicion) run.bendiciones.push({ id: spec.giveBendicion, n: 0 });
  const log: Log = { spec, won: false, cleared: 0, diedAt: null, diedBoss: null, faced: [], stageTurns: [], stageJugadas: [], mid: null, toolsEnd: [], toolUse: {}, offered: {}, taken: {}, maxHit: 0, gold: 0, golpes: 0, bendEnd: [] };
  let shop: unknown = null;
  let rewardFor = 0;
  for (let guard = 0; guard < 6000; guard++) {
    if (run.phase === 'won' || run.phase === 'lost') break;
    if (run.phase === 'battle') {
      if (run.boss) log.faced.push(run.boss);
      // a mitad de campaña (el asalto 3 de 5): lo que se lleva para medir «con» y «sin» cada pieza
      if (!log.mid && run.stage >= Math.ceil((LAST_STAGE + 1) / 2))
        log.mid = {
          tools: run.tools.map((t) => t.id),
          specials: [...new Set(run.deck.filter((c) => c.sp).map((c) => c.sp!))],
          seals: [...new Set(run.deck.filter((c) => c.seal).map((c) => c.seal!))],
          treats: [...new Set(run.deck.filter((c) => c.tr).map((c) => c.tr!))],
        };
      let state = startStage(run, players);
      let jugadas = 0;
      for (; state.phase === 'playing'; jugadas++) {
        if (jugadas > 4000) throw new Error(`asalto sin fin (${JSON.stringify(spec)}, asalto ${run.stage})`);
        const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
        trackEvents(run, res.events);
        for (const ev of res.events) if (ev.e === 'impact') log.golpes++;
        state = res.state;
      }
      log.stageJugadas.push(jugadas);
      const boss = run.boss;
      const stage = run.stage;
      finishBattle(run, state);
      if ((run.phase as Run['phase']) === 'lost') {
        log.diedAt = stage;
        log.diedBoss = boss;
      }
      continue;
    }
    // lo que se pone a la vista antes de decidir
    if (run.phase === 'shop' && run.shop !== shop) {
      shop = run.shop;
      for (const o of run.shop) bump(log.offered, o.kind === 'tool' ? `tool:${o.id}` : o.kind === 'forja' ? `mark:${o.seal ?? o.tr}` : `shop:${o.kind}`);
    }
    if (run.phase === 'reward' && rewardFor !== run.stage) {
      rewardFor = run.stage;
      for (const id of run.loot) bump(log.offered, `tool:${id}`);
      for (const o of run.draft) bump(log.offered, o.kind === 'special' ? `special:${o.id}` : `mark:${o.card.seal ?? o.card.tr}`);
    }
    if (run.phase === 'bendicion') for (const o of run.oferta ?? []) bump(log.offered, `bend:${o.id}`);
    const action = chooseRunAction(run, spec.policy);
    if (!action) throw new Error(`el bot no sabe qué hacer en la fase ${run.phase}`);
    if (action.t === 'bendicion') {
      const o = run.oferta?.[action.i];
      if (o) bump(log.taken, `bend:${o.id}`);
    }
    if (action.t === 'buy') {
      const o = run.shop[action.i];
      if (o) bump(log.taken, o.kind === 'tool' ? `tool:${o.id}` : o.kind === 'forja' ? `mark:${o.seal ?? o.tr}` : `shop:${o.kind}`);
    } else if (action.t === 'loot' && action.id) bump(log.taken, `tool:${action.id}`);
    else if (action.t === 'draft' && action.i !== null) {
      const o = run.draft[action.i];
      if (o) bump(log.taken, o.kind === 'special' ? `special:${o.id}` : `mark:${o.card.seal ?? o.card.tr}`);
    }
    const err = runAction(run, action);
    if (err) throw new Error(`decisión rechazada (${JSON.stringify(action)}): ${err}`);
  }
  log.won = run.conquered;
  log.cleared = Math.min(LAST_STAGE, stagesCleared(run));
  log.stageTurns = run.stats.stageTurns;
  log.toolsEnd = run.tools.map((t) => t.id);
  log.bendEnd = run.bendiciones.map((b) => ({ ...b }));
  log.toolUse = run.stats.toolUse;
  log.maxHit = run.stats.maxHit;
  log.gold = run.stats.gold;
  return { run, log };
}
