// Señas: en sala, cualquiera de la conjura señala un trono, una ruta, una oferta o una carta y
// los demás ven sus iniciales garabateadas encima. No deciden nada (en campaña sigue
// mandando el anfitrión): solo sirven para ponerse de acuerdo sin hablar.
import { sfx } from './audio';
import { $$, S, nameOf } from './core';
import { sendMsg } from './net';

/** Cuánto dura una marca si nadie la borra. */
const LIFE = 20_000;
const timers: Record<string, number> = {};

const inSala = () => !!S.session && !!S.lobby;
const seatOf = (player: string) => Math.max(0, S.lobby?.players.findIndex((p) => p.id === player) ?? 0);
const initials = (name: string) => name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?';

/** Marca (o desmarca, si ya era la mía) un elemento de la pantalla. Solo en sala. */
export function sendPing(target: string): void {
  if (!inSala()) return;
  const mine = S.pings[S.session!.playerId];
  sendMsg({ t: 'ping', target: mine === target ? '' : target });
}

/** Llega la marca de un jugador (vacía: la borra). */
export function applyPing(player: string, target: string): void {
  clearTimeout(timers[player]);
  if (target) {
    S.pings[player] = target;
    timers[player] = window.setTimeout(() => applyPing(player, ''), LIFE);
    sfx.chalk();
  } else delete S.pings[player];
  renderPings();
}

/** Pinta las marcas vigentes sobre lo que haya en pantalla con ese `data-ping`. */
export function renderPings(): void {
  $$('.chalk-mark').forEach((n) => n.remove());
  if (!inSala()) return;
  for (const [player, target] of Object.entries(S.pings)) {
    const host = document.querySelector<HTMLElement>(`[data-ping="${CSS.escape(target)}"]`);
    if (!host) continue;
    const mark = document.createElement('i');
    const n = host.querySelectorAll(':scope > .chalk-mark').length;
    mark.className = `chalk-mark c${seatOf(player) % 4}`;
    mark.style.setProperty('--i', String(n));
    mark.textContent = initials(nameOf(player));
    mark.title = nameOf(player);
    host.appendChild(mark);
  }
}

/**
 * Fuera de la mesa (mapa, Botín, Mercado clandestino): quien no decide marca con un clic; quien
 * decide, con Alt + clic. Los tronos de la mesa (.tower) llevan su propia lógica.
 */
export function bindPings(canDecide: () => boolean): void {
  document.addEventListener(
    'click',
    (e) => {
      if (!inSala()) return;
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-ping]');
      if (!el || el.classList.contains('tower')) return;
      if (!e.altKey && canDecide()) return;
      e.preventDefault();
      e.stopPropagation();
      sendPing(el.dataset.ping!);
    },
    true,
  );
}
