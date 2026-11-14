// V7 · la voz de los monarcas: cuándo habla cada uno y cuánto se queda su bocadillo (el bocadillo lo
// pinta guia.ts; aquí solo va la coreografía y el sonido).
//
//   entrada       al empezar el asalto del monarca, cuando ya no queda ninguna ventana encima
//   contraataque  en su primer Contraataque y, después, como mucho uno de cada tres
//   caida         cuando cae su último trono (y el retrato pasa a «vencido»)
//
// Un bocadillo cada vez: el nuevo sustituye al anterior, nunca se apilan. Dura 2,5 s a 1× y menos a 2×
// y 4×; se va solo, y se retira antes si aparece una ventana o una decisión (no tapa nada que haya que
// leer para elegir). Con «Reducir movimiento» entra sin animación (guia.css).
import { SUITS, type GameEvent } from '../rules/engine';
import { bossIdentity } from '../rules/run';
import { sfx } from './audio';
import { S, settings } from './core';
import { hideBark, setMonarchMood, showBark } from './guia';
import { t } from '../shared/i18n';

type Kind = 'entrada' | 'contraataque' | 'caida';

/** Cuánto se queda un bocadillo: 2,5 s a 1×, ~1,8 s a 2× y 1,25 s a 4×. */
export const barkMs = () => Math.round(2500 / Math.sqrt(settings.speed));

/** Lo que tapa una decisión: una ventana, la lupa, el final de la mesa o la causa de una derrota. */
const blocking = () => !!document.querySelector('.modal, .lupa, .end');

let token = 0;
let timer = 0;
/** Contraataques del monarca en este asalto (para hablar en el primero y luego uno de cada tres). */
let strikes = 0;
const heard: string[] = [];

function speak(bossId: string, kind: Kind, sound = false): void {
  const b = bossIdentity(bossId);
  if (!b) return;
  const mine = ++token;
  clearTimeout(timer);
  const since = performance.now();
  const go = () => {
    if (mine !== token || S.screen !== 'table') return;
    if (blocking()) {
      // se espera a que se cierre la ventana (sin pasarse: una voz tardía ya no viene a cuento)
      if (performance.now() - since < 12_000) timer = window.setTimeout(go, 120);
      return;
    }
    heard.push(`${bossId}:${kind}`);
    if (heard.length > 60) heard.shift();
    showBark(t(`monarca.${bossId}.bark.${kind}`)); // V10: la voz en el idioma de la mesa
    if (sound) sfx.monarch(bossId, kind === 'caida' ? 'caida' : 'entrada');
    const until = performance.now() + barkMs();
    const watch = () => {
      if (mine !== token) return;
      const bark = document.getElementById('bark');
      if (!bark || bark.hidden) return;
      if (blocking() || performance.now() >= until) return hideBark();
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
    // por si la pestaña está en segundo plano y no hay fotogramas: el temporizador lo retira igual
    timer = window.setTimeout(() => mine === token && hideBark(), barkMs() + 50);
  };
  go();
}

/** Enganche de campaign.ts (stageIntro): el monarca se presenta al empezar su asalto. */
export function voiceEnter(bossId: string | null | undefined): void {
  strikes = 0;
  if (bossId) speak(bossId, 'entrada', true);
}

/** Enganche de table.ts (pump): mira cada evento que se va a animar por si al monarca le toca hablar. */
export function voiceOn(ev: GameEvent): void {
  const bossId = S.campaign?.run.boss;
  const v = S.shown;
  if (!bossId || !v) return;
  if (ev.e === 'siren' && ev.card && ev.reason === 'strike') {
    strikes++;
    if (strikes === 1 || (strikes - 1) % 3 === 0) speak(bossId, 'contraataque');
  } else if (ev.e === 'floorDown' && ev.towerDown && SUITS.every((s) => s === ev.tower || v.towers[s].floors.length === 0)) {
    setMonarchMood('vencido');
    speak(bossId, 'caida', true);
  }
}

// la prueba de humo: qué ha dicho cada monarca y un atajo para hacerle hablar
if (new URLSearchParams(location.search).has('qa'))
  Object.assign(window, { __qaVoz: { heard, ms: barkMs, say: (id: string, kind: Kind) => speak(id, kind, true) } });
