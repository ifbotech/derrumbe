// Susurros: una línea al margen, en el momento exacto en que el jugador se encuentra algo por primera
// vez. Una sola vez por perfil, de uno en uno, con «No mostrar más» a un clic (y reversible desde
// Ajustes). Aquí vive todo: el catálogo, cuándo se puede decir cada uno, dónde se escribe en cada
// pantalla y su sonido. Las pantallas solo llaman a whisper('id') en el punto donde ocurre la cosa.
//
// Cuándo salen: los tres de lo básico de la mesa (trono Inmune, La Manga, Golpe exacto) solo en la
// primera campaña del perfil, que es cuando se aprende a golpear; los demás (Mesa de lacre, Atajo, primer
// monarca, Asedio final, Mazo bajo y, desde la V11, trono que falta, Expuesto y Aturdido) la primera vez que
// se ven, sea en la campaña que sea: mucha gente no llega al Asedio final en la primera, y quien viene de la
// 10.0 no conoce los dos estados nuevos ni la mesa de dos tronos. (Los id internos —andamio, forja,
// cantera…— no cambian: son el guardado.)
//
// V40 · el Bufón: en los tres primeros golpes del Asalto 1 de la primera campaña dice una frase corta (el palo
// e Inmune, la cuenta, el Golpe exacto) en el mismo hueco de los Susurros, sin ventana ni pausa: la mano se
// sigue jugando. Cuándo habla lo decide src/rules/bufon.ts (consejoBufon); aquí solo se escribe. Se apaga en
// Ajustes. Con el Bufón encendido, los Susurros de Inmune y Golpe exacto callan: ya lo dice él.
import { SUITS, type TowerFx, nextCollapse } from '../rules/engine';
import { consejoBufon, type ConsejoBufon } from '../rules/bufon';
import { t as tx } from '../shared/i18n';
import { BALANCE } from '../rules/balance-config';
import { BOSS } from '../rules/run';
import { sfx } from './audio';
import { S, topModal } from './core';
import { meta } from './guild';
import { loadJson, saveJson } from './platform';
import { hint } from './prompts';
import { bufonAnimo } from './bufon-vivo';
import { L, monN, paloN } from './lengua';
import type { ClaveUi } from '../shared/i18n/es';

export type WhisperId = 'inmune' | 'andamio' | 'limpio' | 'forja' | 'atajo' | 'jefe' | 'fatiga' | 'cantera' | 'ausente' | 'expuesto' | 'aturdido' | 'caida' | 'tirada' | 'arbol' | 'mejor' | 'auto' | 'gotas';

/** El catálogo: una línea cada uno, por su clave (src/shared/i18n/ui-juice.ts). `{x}` se rellena con `vars`. */
const TEXT: Record<WhisperId, ClaveUi> = {
  inmune: 'ui.w.inmune',
  andamio: 'ui.w.andamio',
  limpio: 'ui.w.limpio',
  forja: 'ui.w.forja',
  atajo: 'ui.w.atajo',
  jefe: 'ui.w.jefe',
  fatiga: 'ui.w.fatiga',
  cantera: 'ui.w.cantera',
  ausente: 'ui.w.ausente',
  expuesto: 'ui.w.expuesto',
  aturdido: 'ui.w.aturdido',
  // V12
  caida: 'ui.w.caida',
  tirada: 'ui.w.tirada',
  arbol: 'ui.w.arbol',
  mejor: 'ui.w.mejor',
  auto: 'ui.w.auto',
  gotas: 'ui.w.gotas',
};
/** Lo que se aprende en la primera campaña; el resto sale la primera vez que se ve, en cualquiera. */
const BASIC = new Set<WhisperId>(['inmune', 'andamio', 'limpio']);
/** V12: lo que cae, la tirada, el Árbol, Mejor jugada, AUTO y las gotas (en ?qa, solo si la prueba los fuerza). */
const V12 = new Set<WhisperId>(['caida', 'tirada', 'arbol', 'mejor', 'auto', 'gotas']);
/** Cuánto se queda a la vista (ms). Con el foco o el puntero encima, espera. */
const SHOW_MS = 9000;

const SEEN_KEY = 'derrumbe:susurros';
const OFF_KEY = 'derrumbe:susurros-off';
let seen: Set<string> | null = null;
const seenSet = () => (seen ??= new Set<string>(loadJson<string[]>(SEEN_KEY) ?? []));
const isOff = () => loadJson<boolean>(OFF_KEY) === true;

/** Con ?qa: la prueba puede forzar que salgan (true) o que no (false); null sigue la regla de QA. */
let qaForce: boolean | null | Set<string> = null;
const qa = new URLSearchParams(location.search).has('qa');

const BUFON_SEEN = 'derrumbe:bufon';
const BUFON_OFF = 'derrumbe:bufon-off';
let bufonSeen: Set<string> | null = null;
const bufonSet = () => (bufonSeen ??= new Set<string>(loadJson<string[]>(BUFON_SEEN) ?? []));
const bufonOff = () => loadJson<boolean>(BUFON_OFF) === true;

function allowed(id: WhisperId): boolean {
  if (isOff() || seenSet().has(id)) return false;
  // V40: lo que enseña el Bufón (Inmune y Golpe exacto) no se repite en un Susurro
  if ((id === 'inmune' || id === 'limpio') && !bufonOff()) return false;
  // en el control de calidad los estados se montan a mano: solo la mesa de «primera campaña» susurra (y nunca
  // los de la V12, que saltan con cosas que las pruebas hacen a propósito: solo si la prueba los pide)
  if (qa) return qaForce instanceof Set ? qaForce.has(id) : (qaForce ?? (S.screen === 'table' && meta.runs === 0 && !V12.has(id)));
  return BASIC.has(id) ? meta.runs === 0 : true;
}

/** Dónde se escribe cada susurro: al margen de la mesa, dentro de la Mesa de lacre o sobre las rutas del mapa. */
function place(id: WhisperId, el: HTMLElement): boolean {
  if (id === 'forja') {
    const box = document.querySelector('.pending-modal .modal-box h2');
    if (!box) return false;
    el.classList.add('inline');
    box.after(el);
    return true;
  }
  // V12 · la tirada: dentro de su caja, debajo del título (la capa tapa la mesa)
  if (id === 'tirada') {
    const h = document.querySelector('#ritual .ritual-caja h2');
    if (!h) return false;
    el.classList.add('inline');
    h.after(el);
    return true;
  }
  // V12 · el Árbol: arriba en el pergamino, sobre las ramas (ni el panel ni «Comprar» quedan debajo)
  if (id === 'arbol') {
    const lienzo = document.querySelector('.arbol-lienzo');
    if (!lienzo || topModal()) return false;
    el.classList.add('sobre-arbol');
    lienzo.appendChild(el);
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
  el.innerHTML = `<p>${fill(L(TEXT[id]), { kh: hint(id === 'mejor' ? 'strike' : 'stash'), ...vars })}</p><button type="button" class="whisper-off">${L('ui.w.off')}</button>`;
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

/**
 * V40 · escribe la frase del Bufón en el hueco de los Susurros (aparta el Susurro que hubiera: el Bufón va
 * primero). Cada frase sale una sola vez por perfil y se borra sola como un Susurro.
 */
export function bufonSays(id: ConsejoBufon): boolean {
  const side = document.querySelector('.table-screen .side');
  if (!side || topModal()) return false;
  document.querySelector('.whisper')?.remove();
  document.querySelector('.bufon-dicho')?.remove();
  const el = document.createElement('div');
  el.className = 'whisper bufon';
  el.dataset.w = `bufon-${id}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<p><b>${L('ui.bufon.quien')}:</b> ${tx(`bufon.${id}`)}</p><button type="button" class="whisper-off">${L('ui.w.off')}</button>`;
  side.appendChild(el);
  bufonSet().add(id);
  saveJson(BUFON_SEEN, [...bufonSet()]);
  sfx.chalk();
  el.querySelector<HTMLButtonElement>('.whisper-off')!.onclick = (e) => {
    e.stopPropagation();
    saveJson(BUFON_OFF, true);
    sfx.card();
    el.remove();
  };
  const fuera = () => {
    if (!el.isConnected) return;
    if (el.matches(':hover, :focus-within')) return void window.setTimeout(fuera, 400);
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 600);
  };
  window.setTimeout(fuera, SHOW_MS);
  return true;
}

/** Si toca, el Bufón habla (la mesa lo pregunta en cada repintado, antes que los Susurros). */
function bufon(): boolean {
  const v = S.shown;
  const run = S.campaign?.run;
  if (!v || !run || (qa && !(qaForce instanceof Set && qaForce.has('bufon')))) return false;
  const id = consejoBufon({ campanas: meta.runs, asalto: run.stage, jugadas: v.turnCount, apagado: bufonOff(), ajeno: S.campaign?.online });
  if (!id || bufonSet().has(id) || document.querySelector(`.whisper[data-w="bufon-${id}"]`)) return false;
  return bufonSays(id);
}

/**
 * Los susurros que dependen del estado de la mesa (trono que falta, Expuesto, Aturdido, monarca, Asedio
 * final, Mazo bajo). La mesa lo llama al repintarse, justo después de enseñar el estado nuevo.
 */
export function tableWhispers(): void {
  bufonAnimo(); // V40 3b: la cara de fondo del Bufón (sombría con poca Vida o en el último turno)
  const v = S.shown;
  if (!v || v.phase !== 'playing' || S.screen !== 'table') return;
  if (bufon()) return;
  // V11: los estados, la primera vez que un trono queda Expuesto o Aturdido (con el palo del trono)
  const fx = (k: keyof TowerFx) => SUITS.find((s) => !v.towers[s].away && v.towers[s].fx[k]);
  const exp = fx('fractura');
  if (exp) whisper('expuesto', { glyph: paloN(exp), n: String(BALANCE.golpe.expuesto) });
  const stun = fx('sobrecarga');
  if (stun) whisper('aturdido', { glyph: paloN(stun) });
  // V36: el duelo Casa por Casa, la primera vez que se ve (un enemigo a la vez; la fila espera)
  const here = SUITS.filter((s) => !v.towers[s].away).length;
  if (here > 1) whisper('ausente', { n: String(here) });
  const boss = S.campaign?.run.boss ? BOSS[S.campaign.run.boss] : null;
  if (boss) whisper('jefe', { who: monN(boss.id) });
  if ((v.fatigue ?? 0) > 0) whisper('fatiga');
  if (v.deckCount <= 3 && v.turnPlayer === v.you) whisper('cantera', { n: String(v.deckCount), efecto: nextCollapse(v) > 0 ? L('ui.w.cantera.sube', { n: nextCollapse(v) }) : L('ui.w.cantera.gratis') });
}

/** La fila de Ajustes: [nombre, explicación, valor, cambiar]. Encenderlos de nuevo no repite los ya leídos. */
export function whisperSetting(): [string, string, string, () => void] {
  return [
    L('ui.w.ajuste'),
    L('ui.w.ajuste.texto'),
    isOff() ? 'No' : 'Sí',
    () => saveJson(OFF_KEY, !isOff()),
  ];
}

/** V40 · la fila del Bufón en Ajustes, con la misma forma que la de los Susurros. */
export function bufonSetting(): [string, string, string, () => void] {
  return [L('ui.bufon.ajuste'), L('ui.bufon.ajuste.texto'), bufonOff() ? 'No' : 'Sí', () => saveJson(BUFON_OFF, !bufonOff())];
}

if (qa)
  Object.assign(window, {
    __whispers: {
      // con una lista, solo esos (V12: la prueba de cada Susurro nuevo sin que otro le quite el sitio)
      force: (on: boolean | null | string[]) => void (qaForce = Array.isArray(on) ? new Set(on) : on),
      seen: () => [...seenSet()],
      off: isOff,
      reset: () => {
        seenSet().clear();
        saveJson(SEEN_KEY, []);
        saveJson(OFF_KEY, false);
        bufonSet().clear();
        saveJson(BUFON_SEEN, []);
        saveJson(BUFON_OFF, false);
      },
      // V40: el control de calidad pinta una frase del Bufón a mano
      bufon: (id: ConsejoBufon) => bufonSays(id),
    },
  });
