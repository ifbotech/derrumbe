// Campaña (roguelike). En solitario corre en local con el mismo reductor que usa el servidor
// y se guarda en el navegador; en sala online la lleva el servidor y aquí solo se pinta lo que llega.
import { Action, Card, RuleError, applyAction, cardLabel, viewFor } from '../rules/engine';
import { deckUnlocked, noteEvents, unlockedPool } from '../rules/achievements';
import { BOSS, CONTRACT, Run, RunAction, RunOpts, finishBattle, newRun, reorderBelt, runAction, stageDef, startStage, trackEvents } from '../rules/run';
import { SPECIAL } from '../rules/specials';
import { TOOL } from '../rules/tools';
import { sfx } from './audio';
import { cardEl, portraitEl } from './card';
import { $, Campaign, RUN_PLAYER, S, loadJson, modal, toast } from './core';
import { dealIn, ribbon } from './fx';
import { maybeSettle, meta, saveMeta, trackMeta } from './guild';
import { sendMsg } from './net';
import { setScreen } from './router';
import { ferreteroSays, renderRun } from './runscreens';
import { logLine, pump, renderBelt, renderHud } from './table';
import { choice, toolTile } from './widgets';

const RUN_KEY = 'derrumbe:run';
const DECK_KEY = 'derrumbe:deck';

/** Con qué se montará la próxima campaña. */
export const prefs = { ascension: 0, deck: localStorage.getItem(DECK_KEY) ?? 'obra', seed: '' };
export function pickDeck(id: string): void {
  prefs.deck = id;
  localStorage.setItem(DECK_KEY, id);
}

export function savedCampaign(): Campaign | null {
  const c = loadJson<Campaign>(RUN_KEY);
  // descarta guardados de versiones anteriores del juego
  return c && c.run && c.key && Array.isArray(c.run.tools) && c.run.node && c.run.stats?.toolUse ? c : null;
}
export function saveCampaign(): void {
  const c = S.campaign;
  if (!c || c.online) return;
  if (c.run.phase === 'lost') localStorage.removeItem(RUN_KEY);
  else localStorage.setItem(RUN_KEY, JSON.stringify(c));
}
export const forgetSaved = () => localStorage.removeItem(RUN_KEY);

/**
 * Una campaña guardada con las reglas de la versión anterior no se puede continuar:
 * se da por cerrada y se cobra el renombre de las obras que llevaba superadas.
 */
export function retireOldSave(): void {
  const old = loadJson<{ run?: { stage?: number; relics?: unknown } }>(RUN_KEY);
  if (!old?.run || savedCampaign()) return;
  localStorage.removeItem(RUN_KEY);
  if (!Array.isArray(old.run.relics)) return;
  const gain = Math.max(1, Math.min(8, Math.floor(Number(old.run.stage) || 1) - 1));
  meta.renown += gain;
  saveMeta();
  setTimeout(() => toast(`Tu campaña anterior era de otra versión: se cerró y cobras ${gain} ✦`), 600);
}
export const isRunHost = () => !!S.campaign && (!S.campaign.online || S.lobby?.host === S.session?.playerId);
export const runOpts = (): RunOpts => ({ up: meta.up, ascension: Math.min(prefs.ascension, meta.ascMax), deck: deckUnlocked(meta, prefs.deck) ? prefs.deck : 'obra', pool: unlockedPool(meta), seedText: prefs.seed.trim() || undefined });
/** La fecha local de hoy (AAAA-MM-DD): la semilla de la Obra diaria. */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Empieza una campaña local. Si había otra a medias, se abandona y cobra el renombre de lo ya superado. */
export function newCampaign(opts: RunOpts): void {
  const saved = savedCampaign();
  if (saved && saved.run.phase !== 'won') {
    saved.run.phase = 'lost';
    maybeSettle(saved);
  }
  const run = newRun(opts, (Math.random() * 2 ** 31) | 0);
  S.campaign = { run, online: false, state: null, key: run.daily ? `diaria:${run.daily}` : `local:${Date.now()}` };
  saveCampaign();
  setScreen('run');
}

export function resumeCampaign(): void {
  S.campaign = savedCampaign();
  if (!S.campaign) return setScreen('camp');
  if (S.campaign.run.phase === 'battle' && S.campaign.state) enterStage(false);
  else setScreen('run');
}

// ── decisiones: van al servidor en sala online, o al reductor local ──

export function runDo(a: RunAction): void {
  const c = S.campaign;
  if (!c) return;
  if (!isRunHost()) return toast('En campaña decide el anfitrión.');
  if (c.online) return sendMsg({ t: 'run', action: a });
  const prev = structuredClone(c.run);
  const err = a.t === 'reorder' ? reorderBelt(c.run, c.state, a.order) : runAction(c.run, a);
  if (err) {
    if (err.includes('oro')) ferreteroSays('poor');
    return toast(err);
  }
  saveCampaign();
  if (a.t === 'reorder' && S.screen === 'table') {
    if (S.shown && c.state) S.shown.tools = c.state.tools;
    return renderBelt();
  }
  if (c.run.phase === 'battle' && a.t === 'route') return enterStage(true);
  renderRun();
  afterRunChange(prev);
}

/** Llega una campaña del servidor (sala online). */
export function applyRun(run: Run): void {
  const prev = S.campaign?.online ? S.campaign.run : null;
  S.campaign = { run, online: true, state: null, key: `sala:${run.id}` };
  routeRun(prev);
}

/** Lleva a la pantalla que toca según la fase de la campaña. */
export function routeRun(prev: Run | null = null): void {
  const c = S.campaign;
  if (!c || S.busy || S.queue.length) return; // si hay animaciones, la cola vuelve a llamar al terminar
  maybeSettle(c);
  if (c.run.phase === 'battle') {
    lastRouted = structuredClone(c.run); // foto de la campaña al entrar a la obra
    trackMeta();
    renderHud();
    return renderBelt();
  }
  if (S.screen === 'run') renderRun();
  else setScreen('run');
  afterRunChange(prev ?? lastRouted);
  lastRouted = structuredClone(c.run);
}
/** La campaña tal como estaba la última vez que se pintó (para avisar de lo que cambió en la obra). */
let lastRouted: Run | null = null;

/** Tras cualquier cambio de campaña: logros, y un aviso de lo que llegó sin haberlo elegido a la vista. */
function afterRunChange(prev: Run | null): void {
  const run = S.campaign?.run;
  if (!run) return;
  trackMeta();
  if (!prev || prev.id !== run.id || run.phase === 'pack') return;
  const surprise = prev.phase === 'map' || prev.phase === 'event' || prev.phase === 'battle';
  const blind = prev.phase === 'shop' && run.phase === 'shop' && !prev.sobre && !run.sobre && prev.shop.some((o, i) => o.kind === 'clandestino' && !o.sold && run.shop[i]?.sold);
  if (!surprise && !blind) return;
  const before = new Map(prev.deck.map((c) => [c.id, c]));
  const cards = run.deck.filter((c) => {
    const old = before.get(c.id);
    return old ? old.seal !== c.seal || old.tr !== c.tr : surprise ? !!(c.seal || c.tr || c.sp) || prev.pending?.kind === 'dup' : !!c.sp;
  });
  const tools = surprise ? run.tools.filter((t) => !prev.tools.some((o) => o.id === t.id)).map((t) => t.id) : [];
  if (cards.length || tools.length) reveal(cards, tools, blind ? 'Del sobre clandestino' : 'Ha llegado');
  const gold = run.gold - prev.gold;
  if (surprise && prev.phase !== 'battle' && gold > 0) {
    sfx.coins(gold);
    toast(`+${gold} de oro`);
  }
}

/** Enseña cartas y herramientas recién llegadas. */
export function reveal(cards: Card[], tools: string[], title: string): void {
  document.querySelector('.reveal')?.remove();
  const el = modal(`<div class="reveal-box"><small>${title}</small><div class="choices"></div><button class="primary x">Entendido</button></div>`, { cls: 'reveal' });
  const box = $('.choices', el);
  cards.slice(0, 6).forEach((c, i) => {
    const ce = cardEl(c);
    dealIn(ce, 150 + i * 220);
    box.appendChild(choice(ce, c.sp ? SPECIAL[c.sp].name : cardLabel(c), ce.dataset.tip?.replace(/<[^>]+>/g, ' ') ?? '', null, null));
  });
  tools.forEach((id, i) => {
    const te = toolTile(id);
    dealIn(te, 150 + (cards.length + i) * 220);
    box.appendChild(choice(te, TOOL[id].name, TOOL[id].desc, null, null));
  });
  sfx.stamp();
}

// ── la obra ──

/** Entra a la mesa con la obra actual (solo en local). */
export function enterStage(fresh: boolean): void {
  const c = S.campaign!;
  if (fresh || !c.state) c.state = startStage(c.run, [{ id: RUN_PLAYER, name: 'TÚ' }]);
  lastRouted = structuredClone(c.run);
  saveCampaign();
  S.tutorial = null;
  S.session = null;
  S.lobby = null;
  S.shown = null;
  S.queue.length = 0;
  S.screen = null;
  history.replaceState(null, '', location.pathname);
  S.queue.push({ view: viewFor(c.state, RUN_PLAYER), events: [] });
  setScreen('table');
  void pump();
}

export function campaignAct(action: Action): void {
  const c = S.campaign!;
  if (!c.state) return;
  try {
    const res = applyAction(c.state, RUN_PLAYER, action);
    c.state = res.state;
    trackEvents(c.run, res.events);
    if (res.state.phase !== 'playing') finishBattle(c.run, res.state);
    S.selected.length = 0;
    saveCampaign();
    S.queue.push({ view: viewFor(res.state, RUN_PLAYER), events: res.events });
    void pump();
  } catch (err) {
    toast(err instanceof RuleError ? err.message : 'Jugada inválida');
  }
}

/** Lo que la mesa hace al terminar de animar una tanda, si hay campaña. */
export function afterBatch(events: Parameters<typeof noteEvents>[1]): void {
  noteEvents(meta, events);
}

/** Presenta la obra (y a su jefe), una vez por obra. */
let introFor = '';
export function stageIntro(): void {
  const c = S.campaign;
  const run = c?.run;
  if (!c || !run || run.phase !== 'battle') return;
  const mark = `${c.key}:${run.stage}`;
  if (introFor === mark) return;
  introFor = mark;
  const st = stageDef(run.stage);
  ribbon(`Obra ${run.stage} · ${st.name}`);
  if (run.contract) logLine(`<b>Contrato: ${CONTRACT[run.contract].name}.</b> ${CONTRACT[run.contract].desc} Premio: ${CONTRACT[run.contract].reward}.`, 'yel');
  if (!run.boss) return;
  const boss = BOSS[run.boss];
  const el = modal(`<div class="boss-box"><div class="boss-card"></div><div><small>Jefe de obra</small><h2>${boss.who}</h2><h3>${boss.name}</h3><p>${boss.desc}</p><button class="primary x">A demoler</button></div></div>`, { cls: 'boss-intro' });
  const card = portraitEl(`j-${boss.id}`, boss.who);
  dealIn(card, 0);
  $('.boss-card', el).appendChild(card);
  el.addEventListener('click', () => el.remove());
  sfx.siren();
  logLine(`<b>Jefe de obra: ${boss.who}.</b> ${boss.desc}`, 'red');
}
