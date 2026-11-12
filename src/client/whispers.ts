// Susurros de tiza: una línea al margen, en el momento exacto en que el jugador se encuentra algo por
// primera vez. Una sola vez por perfil, de uno en uno, con «No mostrar más» a un clic (y reversible
// desde Ajustes). Aquí vive todo: el catálogo, cuándo se puede decir cada uno, dónde se escribe en cada
// pantalla y su sonido. Las pantallas solo llaman a whisper('id') en el punto donde ocurre la cosa.
//
// Cuándo salen: los tres de lo básico de la mesa (palo inmune, andamio, golpe limpio) solo en la
// primera campaña del perfil, que es cuando se aprende a golpear; los otros cinco (forja, atajo, primer
// jefe, fatiga, cantera baja) la primera vez que se ven, sea en la campaña que sea, porque mucha gente
// no llega a la fatiga ni a la forja en la primera. Nunca en la partida guiada: ahí habla el capataz.
import { nextCollapse } from '../rules/engine';
import { BOSS } from '../rules/run';
import { sfx } from './audio';
import { S, topModal } from './core';
import { meta } from './guild';
import { loadJson, saveJson } from './platform';
import { hint } from './prompts';

export type WhisperId = 'inmune' | 'andamio' | 'limpio' | 'forja' | 'atajo' | 'jefe' | 'fatiga' | 'cantera';

/** El catálogo: una línea cada uno. `{x}` se rellena con `vars`. */
const TEXT: Record<WhisperId, string> = {
  inmune: '<b>Placa de hierro:</b> la torre de {material} no recibe Fuerza de tus {glyph}. Prueba contra otra.',
  andamio: `<b>Viene un sirenazo:</b> guarda en el andamio${hint('stash')} la carta que no quieras gastar; al reponer robas una más.`,
  limpio: '<b>Daño exacto:</b> si golpeas ahora es limpio. La sirena calla, cobras 1 de oro y robas una más.',
  forja: '<b>Mesa de forja:</b> la carta que elijas queda marcada para siempre. Cancelar no gasta nada.',
  atajo: '<b>Atajo:</b> te saltas la obra sin cobro ni ferretería, pero te llevas «{tag}».',
  jefe: '<b>Jefe de obra:</b> {who} cambia una regla de esta obra. Su ficha de la barra la recuerda.',
  fatiga: '<b>Fatiga de cimientos:</b> desde ahora tus golpes resuenan más, pero las sirenas también pegan más.',
  cantera: '<b>Cantera baja ({n}):</b> cuando se acabe llega un colapso de −{loss} y el muro no lo frena.',
};
/** Lo que se aprende en la primera campaña; el resto sale la primera vez que se ve, en cualquiera. */
const BASIC = new Set<WhisperId>(['inmune', 'andamio', 'limpio']);
/** Cuánto se queda a la vista (ms). Con el foco o el puntero encima, espera. */
const SHOW_MS = 9000;

const SEEN_KEY = 'derrumbe:susurros';
const OFF_KEY = 'derrumbe:susurros-off';
let seen: Set<string> | null = null;
const seenSet = () => (seen ??= new Set<string>(loadJson<string[]>(SEEN_KEY) ?? []));
const isOff = () => loadJson<boolean>(OFF_KEY) === true;

/** Con ?qa: la prueba puede forzar que salgan (true) o que no (false); null sigue la regla de QA. */
let qaForce: boolean | null = null;
const qa = new URLSearchParams(location.search).has('qa');

function allowed(id: WhisperId): boolean {
  if (S.tutorial || isOff() || seenSet().has(id)) return false;
  // en el control de calidad los estados se montan a mano: solo la mesa de «primera campaña» susurra
  if (qa) return qaForce ?? (S.screen === 'table' && meta.runs === 0);
  return BASIC.has(id) ? meta.runs === 0 : true;
}

/** Dónde se escribe cada susurro: al margen de la mesa, dentro de la mesa de forja o sobre las rutas del plano. */
function place(id: WhisperId, el: HTMLElement): boolean {
  if (id === 'forja') {
    const box = document.querySelector('.pending-modal .modal-box h2');
    if (!box) return false;
    el.classList.add('inline');
    box.after(el);
    return true;
  }
  if (id === 'atajo') {
    const routes = document.getElementById('routes');
    if (!routes) return false;
    el.classList.add('inline');
    routes.before(el);
    return true;
  }
  const side = document.querySelector('.table-screen .side');
  if (!side || topModal()) return false; // con una ventana abierta en la mesa, espera a la próxima ocasión
  side.appendChild(el);
  return true;
}

function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}

/**
 * Escribe un susurro si toca: la primera vez, de uno en uno (si ya hay uno a la vista, este espera a la
 * próxima ocasión y no se da por leído) y nunca si el jugador pidió no verlos.
 */
export function whisper(id: WhisperId, vars: Record<string, string> = {}): void {
  if (document.querySelector('.whisper') || !allowed(id)) return;
  const el = document.createElement('div');
  el.className = 'whisper';
  el.dataset.w = id;
  el.setAttribute('role', 'status');
  el.innerHTML = `<p>${fill(TEXT[id], vars)}</p><button type="button" class="whisper-off">No mostrar más</button>`;
  if (!place(id, el)) return;
  seenSet().add(id);
  saveJson(SEEN_KEY, [...seenSet()]);
  sfx.chalk();
  el.querySelector<HTMLButtonElement>('.whisper-off')!.onclick = (e) => {
    e.stopPropagation();
    saveJson(OFF_KEY, true);
    sfx.card();
    el.remove();
  };
  // se borra solo, salvo mientras se lee con el foco o el puntero encima
  let left = SHOW_MS;
  let since = performance.now();
  let timer = 0;
  const hold = () => el.matches(':hover, :focus-within');
  const tick = () => {
    if (!el.isConnected) return;
    if (hold()) {
      since = performance.now();
      timer = window.setTimeout(tick, 400);
      return;
    }
    left -= performance.now() - since;
    since = performance.now();
    if (left > 0) {
      timer = window.setTimeout(tick, Math.min(left, 400));
      return;
    }
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 600);
  };
  timer = window.setTimeout(tick, 400);
  void timer;
}

/** Los susurros que dependen del estado de la mesa (jefe, fatiga, cantera baja). La mesa lo llama al repintarse. */
export function tableWhispers(): void {
  const v = S.shown;
  if (!v || v.phase !== 'playing' || S.screen !== 'table') return;
  const boss = S.campaign?.run.boss ? BOSS[S.campaign.run.boss] : null;
  if (boss) whisper('jefe', { who: boss.who });
  if ((v.fatigue ?? 0) > 0) whisper('fatiga');
  if (v.deckCount <= 3 && v.turnPlayer === v.you) whisper('cantera', { n: String(v.deckCount), loss: String(nextCollapse(v, v.players.length)) });
}

/** La fila de Ajustes: [nombre, explicación, valor, cambiar]. Encenderlos de nuevo no repite los ya leídos. */
export function whisperSetting(): [string, string, string, () => void] {
  return [
    'Susurros de tiza',
    'Una línea de ayuda la primera vez que te encuentras algo (palo inmune, andamio, forja, fatiga…).',
    isOff() ? 'No' : 'Sí',
    () => saveJson(OFF_KEY, !isOff()),
  ];
}

if (qa)
  Object.assign(window, {
    __whispers: {
      force: (on: boolean | null) => void (qaForce = on),
      seen: () => [...seenSet()],
      off: isOff,
      reset: () => {
        seenSet().clear();
        saveJson(SEEN_KEY, []);
        saveJson(OFF_KEY, false);
      },
    },
  });
