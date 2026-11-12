// Partida guiada: conduce el asalto de prácticas paso a paso con la Maestra.
import { Action, RuleError, applyAction, viewFor } from '../rules/engine';
import { TUTORIAL_INTRO, TUTORIAL_PLAYER, TUTORIAL_STEPS, createTutorial } from '../rules/tutorial';
import { rubble, skyline } from './art';
import { sfx } from './audio';
import { $, S, toast } from './core';
import { forget } from './net';
import { setScreen } from './router';
import { pump, renderInteractive } from './table';
import { showRules } from './widgets';
import { platform } from './platform';

const TUTO_KEY = 'derrumbe:tutorial';
export const tutorialDone = () => platform.load(TUTO_KEY) === '1';
export const guidedStep = () => (S.tutorial && S.tutorial.mode === 'do' ? TUTORIAL_STEPS[S.tutorial.step] : null);

export function startTutorial(then?: () => void): void {
  S.tutorial = { state: createTutorial(), step: 0, intro: 0, mode: 'intro', then };
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
  platform.save(TUTO_KEY, '1');
  S.tutorial = null;
  go?.();
}

export function tutorialAct(action: Action): void {
  const t = S.tutorial!;
  try {
    const res = applyAction(t.state, TUTORIAL_PLAYER, action);
    t.state = res.state;
    S.selected.length = 0;
    if (t.mode === 'do') t.mode = 'explain';
    S.queue.push({ view: viewFor(res.state, TUTORIAL_PLAYER), events: res.events });
    renderCoach();
    void pump();
  } catch (err) {
    toast(err instanceof RuleError ? err.message : 'Jugada inválida');
  }
}

export function renderCoach(): void {
  const el = $('#coach');
  if (!el) return;
  const t = S.tutorial;
  el.hidden = !t;
  if (!t) return;
  const moving = S.busy || S.queue.length > 0;
  let head: string;
  let title: string;
  let body: string;
  let btn = '';
  if (t.mode === 'intro') {
    const s = TUTORIAL_INTRO[t.intro];
    head = `Intro ${t.intro + 1}/${TUTORIAL_INTRO.length}`;
    title = s.title;
    body = s.text;
    btn = t.intro + 1 < TUTORIAL_INTRO.length ? 'Siguiente' : 'Empezar';
  } else {
    const s = TUTORIAL_STEPS[t.step];
    head = `Paso ${t.step + 1}/${TUTORIAL_STEPS.length}`;
    title = s.title;
    if (t.mode === 'explain') {
      body = moving ? 'Mira lo que pasa en la mesa…' : s.after!;
      btn = moving ? '' : 'Continuar';
    } else body = s.say;
  }
  el.innerHTML = `<div class="who">La Maestra<small>${head}</small></div><div><h4>${title}</h4><p>${body}</p></div>${btn ? `<button class="primary" id="coach-next">${btn}</button>` : '<span></span>'}`;
  const next = $('#coach-next', el);
  if (next) next.onclick = coachNext;
}

function coachNext(): void {
  const t = S.tutorial;
  if (!t) return;
  if (t.mode === 'intro') {
    if (++t.intro >= TUTORIAL_INTRO.length) t.mode = 'do';
  } else if (t.mode === 'explain') {
    t.step = Math.min(t.step + 1, TUTORIAL_STEPS.length - 1);
    t.mode = TUTORIAL_STEPS[t.step].cards ? 'do' : 'free';
  }
  sfx.select();
  renderCoach();
  renderInteractive();
}

export function showTutorialEnd(): void {
  const v = S.shown;
  if (!v) return;
  const won = v.phase === 'won';
  won ? sfx.win() : sfx.lose();
  const then = S.tutorial?.then;
  const el = document.createElement('div');
  el.className = `end ${won ? 'won' : 'lost'}`;
  el.innerHTML = `
    <div class="meta"><span class="hot">TUTORIAL ${won ? 'COMPLETADO' : 'FALLIDO'}</span></div>
    ${won ? rubble('D', 'end-art') : skyline('end-art')}
    <h1>${won ? 'Lista la<br>conjura' : 'Conjura deshecha'}</h1>
    <p>${won ? 'Ya conoces la cuenta Daño × Multi, la rueda de palos, el poder de cada palo, el Contraataque, el Escudo, el Golpe exacto y el Motín. En campaña se suman las Reliquias, los Sellos de lacre y los Acabados, La Manga (un hueco para guardarte una carta) y Rebobinar (deshacer una jugada por asalto). Pasa el puntero sobre cualquier cosa para ver qué hace, o ábrela con clic derecho en la Lupa.' : 'Pasa hasta en las mejores conjuras. Repite el tutorial con calma.'}</p>
    <div class="row"><button class="primary" id="t-home">${then ? 'A la campaña' : 'Jugar de verdad'}</button><button id="t-again">Repetir tutorial</button><button id="t-rules">Reglas</button></div>`;
  document.body.appendChild(el);
  if (won) platform.save(TUTO_KEY, '1');
  $('#t-home', el).onclick = () => {
    if (!then) return forget();
    el.remove();
    skipTutorial();
  };
  $('#t-again', el).onclick = () => startTutorial(then);
  $('#t-rules', el).onclick = showRules;
}
