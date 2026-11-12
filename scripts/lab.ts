// Banco de pruebas compartido por los simuladores: juega una campaña entera con el bot de
// referencia y deja anotado todo lo que el laboratorio de balance necesita medir.
import { applyAction, currentPlayer } from '../src/rules/engine';
import type { Seal, Treatment } from '../src/rules/engine';
import { RunPolicy, chooseAction, chooseRunAction } from '../src/rules/bot';
import { LAST_STAGE, Run, RunOpts, UPGRADES, addSpecial, finishBattle, newRun, runAction, stagesCleared, startStage, trackEvents } from '../src/rules/run';
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
  /** Con gremio lleno, solo estas mejoras (y «legendarias»). */
  only?: string[];
  policy?: RunPolicy;
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
  /** Cinturón y mazo al entrar a la obra 5 (null si no se llegó). */
  mid: { tools: string[]; specials: string[]; seals: Seal[]; treats: Treatment[] } | null;
  toolsEnd: string[];
  toolUse: Record<string, number>;
  /** Veces que cada cosa se ofreció y se eligió (ferretería, botín y selección). */
  offered: Record<string, number>;
  taken: Record<string, number>;
  maxHit: number;
  gold: number;
}

const bump = (rec: Record<string, number>, key: string) => void (rec[key] = (rec[key] ?? 0) + 1);

export function optsFor(spec: Spec): RunOpts {
  const up = spec.full ? Object.fromEntries(UPGRADES.filter((u) => !spec.only || spec.only.includes(u.id)).map((u) => [u.id, u.costs.length])) : {};
  const pool = spec.full && (!spec.only || spec.only.includes('legendarias')) ? SPECIALS.map((s) => s.id) : [];
  return { up, deck: spec.deck, pool, ascension: spec.ascension };
}

export function playCampaign(spec: Spec): { run: Run; log: Log } {
  const players = Array.from({ length: spec.players ?? 1 }, (_, i) => ({ id: `p${i}`, name: `p${i}` }));
  const run = newRun(optsFor(spec), spec.seed);
  if (spec.giveTool) run.tools.push({ id: spec.giveTool, n: 0 });
  if (spec.giveSpecial) addSpecial(run, spec.giveSpecial);
  const log: Log = { spec, won: false, cleared: 0, diedAt: null, diedBoss: null, faced: [], stageTurns: [], mid: null, toolsEnd: [], toolUse: {}, offered: {}, taken: {}, maxHit: 0, gold: 0 };
  let shop: unknown = null;
  let rewardFor = 0;
  for (let guard = 0; guard < 6000; guard++) {
    if (run.phase === 'won' || run.phase === 'lost') break;
    if (run.phase === 'battle') {
      if (run.boss) log.faced.push(run.boss);
      if (!log.mid && run.stage >= 5)
        log.mid = {
          tools: run.tools.map((t) => t.id),
          specials: [...new Set(run.deck.filter((c) => c.sp).map((c) => c.sp!))],
          seals: [...new Set(run.deck.filter((c) => c.seal).map((c) => c.seal!))],
          treats: [...new Set(run.deck.filter((c) => c.tr).map((c) => c.tr!))],
        };
      let state = startStage(run, players);
      for (let turns = 0; state.phase === 'playing'; turns++) {
        if (turns > 4000) throw new Error(`obra sin fin (${JSON.stringify(spec)}, obra ${run.stage})`);
        const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
        trackEvents(run, res.events);
        state = res.state;
      }
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
    const action = chooseRunAction(run, spec.policy);
    if (!action) throw new Error(`el bot no sabe qué hacer en la fase ${run.phase}`);
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
  log.toolUse = run.stats.toolUse;
  log.maxHit = run.stats.maxHit;
  log.gold = run.stats.gold;
  return { run, log };
}
