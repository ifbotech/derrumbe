// Partida guiada (V7): se aprende jugando, sin ventanas de texto. Cada paso de TUTORIAL_STEPS enciende
// el foco de la mesa (guia.ts) sobre lo que hay que tocar, con una línea y la indicación del botón del
// dispositivo en uso (prompts.ts). El jugador hace la jugada; si `done(view, events)` se cumple, el foco
// se retira mientras la mesa anima y vuelve sobre el paso siguiente en cuanto la mesa deja jugar.
// «Saltar» (Esc / B, o el botón de la barra) está siempre a mano.
import { Action, RuleError, applyAction, viewFor } from '../rules/engine';
import { TUTORIAL_PLAYER, TUTORIAL_STEPS, TutorialStep, createTutorial } from '../rules/tutorial';
import { rubble, skyline } from './art';
import { sfx } from './audio';
import { $, S, toast } from './core';
import { clearSpotlight, spotlight } from './guia';
import { forget } from './net';
import { Act, hint } from './prompts';
import { setScreen } from './router';
import { pump } from './table';
import { showRules } from './widgets';
import { platform } from './platform';
import { noteGuide } from './telemetry';
import { L, getLang } from './lengua';
import { t } from '../shared/i18n';
import { errorFor } from '../rules/textos';

const TUTO_KEY = 'derrumbe:tutorial';
/** Pausa entre el foco de un paso cumplido y el del siguiente (ms). */
const BREATH_MS = 400;
let breathUntil = 0;
export const tutorialDone = () => platform.load(TUTO_KEY) === '1';
/** El paso que se está enseñando (null si no hay partida guiada o ya se cumplieron todos). */
export const guidedStep = (): TutorialStep | null => (S.tutorial && S.tutorial.mode === 'do' ? (TUTORIAL_STEPS[S.tutorial.step] ?? null) : null);

export function startTutorial(then?: () => void): void {
  S.tutorial = { state: createTutorial(), step: 0, mode: 'do', then };
  noteGuide('start'); // datos de prueba: cuánto dura la partida guiada
  S.campaign = null;
  S.session = null;
  S.lobby = null;
  S.shown = null;
  S.queue.length = 0;
  S.screen = null;
  document.querySelectorAll('.end').forEach((e) => e.remove());
  history.replaceState(null, '', location.pathname);
  S.queue.push({ view: viewFor(S.tutorial.state, TUTORIAL_PLAYER), events: [] });
  setScreen('table');
  void pump();
}

/** Salta el tutorial previo a la primera campaña y sigue con ella. */
export function skipTutorial(): void {
  const go = S.tutorial?.then;
  if (S.tutorial) noteGuide('saltada', S.tutorial.state.turnCount);
  platform.save(TUTO_KEY, '1');
  clearSpotlight();
  S.tutorial = null;
  go?.();
}

/** «Saltar»: con campaña detrás, sigue con ella; si se entró desde la portada, vuelve a la portada. */
export function leaveTutorial(): void {
  if (!S.tutorial) return;
  sfx.select(1, false);
  if (S.tutorial.then) return skipTutorial();
  noteGuide('saltada', S.tutorial.state.turnCount);
  platform.save(TUTO_KEY, '1');
  clearSpotlight();
  forget();
}

export function tutorialAct(action: Action): void {
  const t = S.tutorial!;
  try {
    const res = applyAction(t.state, TUTORIAL_PLAYER, action);
    t.state = res.state;
    S.selected.length = 0;
    const view = viewFor(res.state, TUTORIAL_PLAYER);
    const step = guidedStep();
    if (step?.done(view, res.events)) {
      // paso cumplido: el foco se retira al instante y vuelve, sobre el siguiente, cuando la mesa deja jugar
      t.step++;
      if (t.step >= TUTORIAL_STEPS.length) t.mode = 'free';
      clearSpotlight();
      // una pausa corta entre foco y foco, aunque la jugada no tenga nada que animar (La Manga)
      breathUntil = performance.now() + BREATH_MS;
      window.setTimeout(renderCoach, BREATH_MS + 10);
      sfx.learnt();
    }
    S.queue.push({ view, events: res.events });
    void pump();
  } catch (err) {
    toast(err instanceof RuleError ? errorFor(getLang(), err.message) : L('ui.tuto.invalida'));
  }
}

/** La línea del paso con la indicación del botón que toca ahora (tecla o botón del mando; nada con ratón). */
function stepLine(step: TutorialStep): string {
  const want = step.cards ?? [];
  const ready = want.length > 0 && S.selected.length === want.length && want.every((id) => S.selected.includes(id));
  const act: Act = step.id === 'manga' ? 'stash' : ready ? 'strike' : 'choose';
  return `${t(`guia.${step.id}.linea`)}<span class="guia-kh">${hint(act)}</span>`;
}

/**
 * Pinta (o retira) el foco de la partida guiada. table.ts lo llama tras cada repintado de la mesa: con
 * la mesa animando o fuera de la partida guiada no hay foco; con la mesa quieta, el del paso en curso.
 * El viejo cuadro de la Maestra (#coach) ya no se enseña nunca.
 */
export function renderCoach(): void {
  const coach = $('#coach');
  if (coach) coach.hidden = true;
  const step = guidedStep();
  const v = S.shown;
  if (!step || !v || S.screen !== 'table' || S.busy || S.queue.length > 0 || v.phase !== 'playing' || performance.now() < breathUntil || document.querySelector('.end')) {
    if (document.documentElement.dataset.guia) clearSpotlight();
    return;
  }
  spotlight(step.focus, stepLine(step));
  followDeal();
}

/**
 * Mientras las cartas aún entran en la mano (o un guardia se recoloca), el hueco del foco las sigue: se
 * recoloca cada 150 ms hasta que la mesa se queda quieta (como mucho ~2 s). Solo mueve el hueco y el aro.
 */
let follow = 0;
function followDeal(): void {
  clearTimeout(follow);
  let n = 0;
  const tick = () => {
    const step = guidedStep();
    if (!step || !document.documentElement.dataset.guia || S.busy) return;
    spotlight(step.focus, stepLine(step));
    const moving = document.getAnimations().some((a) => {
      const el = (a.effect as KeyframeEffect | null)?.target;
      return a.playState === 'running' && el instanceof Element && a.effect?.getComputedTiming().iterations !== Infinity && !!el.closest('#hand, #reserve, #towers, #score');
    });
    if (moving && n++ < 14) follow = window.setTimeout(tick, 150);
  };
  follow = window.setTimeout(tick, 150);
}

export function showTutorialEnd(): void {
  const v = S.shown;
  if (!v) return;
  clearSpotlight();
  const won = v.phase === 'won';
  won ? sfx.win() : sfx.lose();
  noteGuide(won ? 'victoria' : 'derrota', v.turnCount);
  const then = S.tutorial?.then;
  const el = document.createElement('div');
  el.className = `end ${won ? 'won' : 'lost'}`;
  el.innerHTML = `
    <div class="meta"><span class="hot">${L(won ? 'ui.tuto.ganada' : 'ui.tuto.fallida')}</span></div>
    ${won ? rubble('D', 'end-art') : skyline('end-art')}
    <h1>${L(won ? 'ui.tuto.lista' : 'ui.tuto.deshecha')}</h1>
    <p>${L(won ? 'ui.tuto.lista.texto' : 'ui.tuto.deshecha.texto')}</p>
    <div class="row"><button class="primary" id="t-home">${L(then ? 'ui.tuto.campana' : 'ui.tuto.jugar')}</button><button id="t-again">${L('ui.tuto.repetir')}</button><button id="t-rules">${L('ui.reglas')}</button></div>`;
  document.body.appendChild(el);
  if (won) platform.save(TUTO_KEY, '1');
  $('#t-home', el).onclick = () => {
    el.remove();
    if (!then) return forget();
    skipTutorial();
  };
  $('#t-again', el).onclick = () => startTutorial(then);
  $('#t-rules', el).onclick = showRules;
}
