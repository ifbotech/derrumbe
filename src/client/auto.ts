// V12 · AUTO (SPECS/V12.md, apartado 1.7): el juego juega solo con el bot de referencia del laboratorio, paso a
// paso, a través de `pasoAuto` (src/rules/auto.ts). Aquí solo se decide CUÁNDO dar el paso y se aplica por el mismo
// camino que usa el jugador (`campaignAct` en la mesa, `runDo` en la campaña).
//
//   · Encendido con su botón (#btn-auto, table.ts), la tecla A o Select en el mando. Nunca arranca encendido.
//   · Entre paso y paso, una pausa que se escala con la velocidad (1× · 2× · 4× · 8×); lo que se anima en la mesa
//     ya va a su velocidad (fx.ts), y AUTO espera a que la mesa vuelva a dejar jugar.
//   · Cualquier clic, toque, tecla o botón del mando lo APAGA al instante (salvo la velocidad y el propio AUTO): lo
//     programado se cancela y el botón se apaga en la misma pulsación (≤ 50 ms). Si una jugada se estaba animando,
//     termina, y la siguiente es tuya.
//   · Donde `pasoAuto` pide pausa (Botín sin Auto-saquear; Taberna, Mapa o Secreto sin Auto-taberna) sigue
//     encendido y espera con un aviso de una línea: lo que hagas ahí no lo apaga, y en cuanto vuelve a haber algo que
//     cubrir, sigue. Al acabar la campaña se apaga. En el Asalto diario y en cooperativo no hay AUTO.
//   · Con AUTO, la tirada de huesos se tira sola, y las ventanas que solo informan (presentación del monarca, cartas
//     llegadas) se cierran solas.
import { avisoPausa, pasoAuto, type MotivoPausa } from '../rules/auto';
import type { Action } from '../rules/engine';
import { t } from '../shared/i18n';
import { sfx } from './audio';
import { campaignAct, runDo } from './campaign';
import { RUN_PLAYER, S, settings, toast } from './core';
import { autoVetado, canAct, conmutaAuto, refreshAuto, renderInteractive } from './table';
import { tiradaRodando } from './tirada';
import { whisper } from './whispers';

/** Pausa entre pasos a 1× (ms): en la mesa, de una jugada a la siguiente; fuera, de pantalla a pantalla. */
const PAUSA = { mesa: 900, campana: 1100 } as const;
/** Cada cuánto se vuelve a mirar si ya se puede dar el paso (la mesa animando, una pantalla entrando…). */
const SONDEO = 120;
/** Ventanas que abre el jugador: con ellas encima AUTO espera (y abrirlas ya lo apagó). */
const DEL_JUGADOR = '.settings-modal, .deck-modal:not(.pending-modal), .lupa, .fb-ver-modal, .arbol-aviso-modal, .modal-box.confirm';
/** Ventanas que solo informan: AUTO las cierra. */
const SOLO_INFORMAN = '.modal.boss-intro, .modal.reveal:not(.sobre-modal)';
/** Teclas que no apagan AUTO: la suya y las que solas no hacen nada (Mayús, Control… al cambiar de ventana). */
const EXENTAS = new Set(['a', 'A', 'Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'OS']);
/** Botones del mando que no lo apagan: el suyo (Select) y la velocidad (RT). */
const PAD_EXENTOS = new Set(['Select', 'Speed']);

let timer = 0;
/** Cada encendido y cada apagado cambia la generación: lo programado con otra generación no se ejecuta. */
let gen = 0;
/** La pausa en la que espera (null: jugando). */
let pausa: MotivoPausa | null = null;
/** Las cartas que AUTO dejó elegidas antes de golpear (se sueltan si el jugador toma el mando entre medias). */
let eligio = false;

/** Lo que mide la prueba de humo (solo se lee con ?qa). */
export const autoQa = {
  pasos: 0,
  mesa: 0,
  campana: 0,
  rituales: 0,
  pausas: [] as string[],
  /** Del evento de entrada (su timeStamp) al botón apagado en el DOM, y al fotograma pintado después (ms). */
  apagados: [] as { por: string; dom: number; visible: number; en: number }[],
};

const ritmo = (ms: number) => ms / Math.max(1, settings.speed);

function programa(ms: number): void {
  clearTimeout(timer);
  const g = gen;
  timer = window.setTimeout(() => g === gen && paso(), ms);
}

/** El aviso de una línea de la pausa (arriba en el centro; no tapa nada que se pulse). */
function aviso(texto: string | null): void {
  let el = document.getElementById('auto-aviso');
  if (!texto) return void el?.remove();
  if (!el) {
    el = document.createElement('div');
    el.id = 'auto-aviso';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  if (el.textContent !== texto) el.textContent = texto;
}

/** Enciende AUTO desde fuera de la mesa o con su tecla: lo mismo que su botón, con la razón si no se puede. */
export function alternaAuto(): void {
  const veto = autoVetado();
  if (veto && !settings.auto) {
    sfx.deny();
    toast(veto);
    return;
  }
  conmutaAuto(!settings.auto);
  // en la mesa lo dice su botón; fuera, una línea
  if (!document.getElementById('btn-auto')) toast(t(settings.auto ? 'ui.auto.on' : 'ui.auto.off'));
}

/** Apaga AUTO: cancela lo programado, suelta lo que había elegido y apaga el botón en la misma pulsación. */
export function apagaAuto(por = 'código', desde?: number): void {
  if (!settings.auto && !timer && !pausa) return;
  const estaba = settings.auto;
  settings.auto = false;
  gen++;
  clearTimeout(timer);
  timer = 0;
  pausa = null;
  refreshAuto();
  aviso(null);
  if (eligio) {
    eligio = false;
    S.selected.length = 0;
    if (S.screen === 'table') renderInteractive();
  }
  if (!estaba || desde === undefined) return;
  const dom = performance.now() - desde;
  requestAnimationFrame(() => autoQa.apagados.push({ por, dom, visible: performance.now() - desde, en: performance.now() }));
  if (!document.getElementById('btn-auto')) toast(t('ui.auto.off'));
}

/** Solo QA (estados fijos de la QA visual): AUTO se queda encendido a la vista, pero no da ningún paso. */
export function congelaAuto(): void {
  gen++;
  clearTimeout(timer);
  timer = 0;
}

/** Una entrada del jugador (clic, toque o tecla): si AUTO está jugando, toma el mando. En una pausa, no. */
function alEntrar(e: Event): void {
  if (!settings.auto || pausa) return;
  if (e.type === 'keydown') {
    const k = e as KeyboardEvent;
    if (EXENTAS.has(k.key) || k.repeat) return;
  } else {
    // La velocidad y el propio AUTO no lo apagan (se tocan con AUTO en marcha).
    const el = e.target instanceof Element ? e.target : (e.target as Node | null)?.parentElement;
    if (el?.closest('#btn-auto, #btn-speed')) return;
  }
  apagaAuto(e.type === 'keydown' ? 'tecla' : 'clic', e.timeStamp);
}

/** Un botón del mando (nav.ts lo traduce a tecla). `desde`: el instante en que se leyó pulsado. */
export function entradaMando(key: string, desde = performance.now()): void {
  if (!settings.auto || pausa || PAD_EXENTOS.has(key)) return;
  apagaAuto('mando', desde);
}

/** Da el paso que toque, o vuelve a mirar en un momento si todavía no se puede. */
function paso(): void {
  timer = 0;
  if (!settings.auto) return;
  const c = S.campaign;
  const veto = autoVetado();
  if (!c || veto) {
    apagaAuto();
    if (veto) toast(veto);
    return;
  }
  // la campaña terminó (o se salió de ella a otra pantalla): AUTO se apaga
  if (c.run.phase === 'won' || c.run.phase === 'lost') {
    apagaAuto();
    toast(t(avisoPausa('fin')));
    return;
  }
  if (S.screen !== null && S.screen !== 'table' && S.screen !== 'run') return apagaAuto();
  // la tirada de huesos se tira sola, y su resultado se enseña un momento antes de seguir
  const ritual = document.getElementById('ritual');
  // los dados rodando: se espera a que se paren (y se deja leer el resultado un momento)
  if (ritual && tiradaRodando(ritmo(PAUSA.campana / 2))) return programa(SONDEO);
  if (ritual) {
    const tirar = ritual.querySelector<HTMLButtonElement>('#ritual-tirar');
    const seguir = ritual.querySelector<HTMLButtonElement>('#ritual-seguir');
    const b = tirar ?? seguir;
    if (b) {
      aviso(null);
      if (tirar) autoQa.rituales++;
      b.click();
      return programa(tirar ? SONDEO : ritmo(PAUSA.campana / 2));
    }
  }
  // lo que solo informa se cierra; lo que abrió el jugador, se espera
  const info = document.querySelector<HTMLElement>(SOLO_INFORMAN);
  if (info) {
    (info.querySelector<HTMLElement>('.x, .primary') ?? info).click();
    return programa(ritmo(PAUSA.campana / 2));
  }
  if (document.querySelector(DEL_JUGADOR) || S.busy || S.queue.length) return programa(SONDEO);
  const enMesa = S.screen === 'table';
  // entre la mesa y la campaña (el último trono cayendo, la pantalla que entra) se espera
  if (enMesa !== (c.run.phase === 'battle') || S.screen === null) return programa(SONDEO);
  const p = pasoAuto({ run: c.run, state: enMesa ? c.state : null, playerId: RUN_PLAYER, diaria: false, coop: false }, { saquear: settings.autoSaquear, taberna: settings.autoTaberna });
  if (!p) return programa(SONDEO);
  if (p.t === 'pausa') {
    if (p.motivo === 'fin' || p.motivo === 'diaria' || p.motivo === 'coop') {
      apagaAuto();
      toast(t(avisoPausa(p.motivo)));
      return;
    }
    if (pausa !== p.motivo) autoQa.pausas.push(p.motivo);
    pausa = p.motivo;
    aviso(t(avisoPausa(p.motivo)));
    return programa(SONDEO * 2);
  }
  pausa = null;
  aviso(null);
  autoQa.pasos++;
  if (p.t === 'campana') {
    autoQa.campana++;
    runDo(p.action);
    return programa(ritmo(PAUSA.campana));
  }
  if (!canAct()) return programa(SONDEO);
  juega(p.action);
}

/** En la mesa: deja a la vista las cartas que va a jugar y, media pausa después, juega. */
function juega(action: Action): void {
  const cards = action.type === 'attack' || action.type === 'discard' ? action.cards : action.type === 'joker' ? [action.card] : [];
  const g = gen;
  const hazlo = () => {
    if (g !== gen || !settings.auto) return;
    eligio = false;
    autoQa.mesa++;
    campaignAct(action);
    programa(ritmo(PAUSA.mesa / 2));
  };
  if (!cards.length) return hazlo();
  S.selected.length = 0;
  S.selected.push(...cards);
  eligio = true;
  renderInteractive();
  clearTimeout(timer);
  timer = window.setTimeout(hazlo, ritmo(PAUSA.mesa / 2));
}

/** Solo QA: por qué AUTO no da el paso ahora mismo (para cuando una prueba se atasca). */
export function autoDiag(): Record<string, unknown> {
  const c = S.campaign;
  const del = document.querySelector(DEL_JUGADOR);
  const enMesa = S.screen === 'table';
  let p: unknown = null;
  try {
    p = c ? pasoAuto({ run: c.run, state: enMesa ? c.state : null, playerId: RUN_PLAYER, diaria: false, coop: false }, { saquear: settings.autoSaquear, taberna: settings.autoTaberna }) : null;
  } catch (e) {
    p = String(e);
  }
  return { on: settings.auto, pausa, timer: !!timer, screen: S.screen, phase: c?.run.phase, busy: S.busy, cola: S.queue.length, del: del?.className ?? null, ritual: !!document.getElementById('ritual'), modales: [...document.querySelectorAll('.modal')].map((m) => m.className), paso: p };
}

/** Arranca la escucha: el botón (derrumbe:auto) y cualquier entrada del jugador. */
export function bindAuto(): void {
  document.addEventListener('derrumbe:auto', (e) => {
    const on = (e as CustomEvent<boolean>).detail;
    if (!on) return apagaAuto();
    gen++;
    pausa = null;
    whisper('auto');
    programa(ritmo(PAUSA.mesa / 3));
  });
  addEventListener('pointerdown', alEntrar, true);
  addEventListener('keydown', alEntrar, true);
}
