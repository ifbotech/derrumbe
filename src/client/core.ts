// Núcleo del cliente: el estado que comparten las pantallas, los ajustes del jugador
// y las piezas de interfaz que usa todo el mundo (avisos, ventanas, globos de ayuda).
import type { Card, GameEvent, GameState, PlayerView } from '../rules/engine';
import type { Run } from '../rules/run';
import { KEYWORDS, keywordsIn, markKeywords } from '../rules/keywords';
import type { LobbyInfo } from '../shared/protocol';
import { sfx } from './audio';
import { loadJson, platform } from './platform';

export { loadJson };

export const app = document.getElementById('app')!;
export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

export interface Session {
  room: string;
  playerId: string;
  token: string;
}
/** Partida guiada: corre en local con el mismo motor, sin servidor. */
export interface Tutorial {
  state: GameState;
  step: number;
  intro: number;
  mode: 'intro' | 'do' | 'explain' | 'free';
  /** Qué hacer al terminar (o saltar) el tutorial; por ejemplo, empezar la primera campaña. */
  then?: () => void;
}
/** Campaña en curso: local (se guarda en el navegador) o la que lleva el servidor de la sala. */
export interface Campaign {
  run: Run;
  online: boolean;
  state: GameState | null;
  /** Identifica esta campaña a efectos de cobrar el renombre una sola vez. */
  key: string;
  /** La campaña tal como estaba antes de la última jugada, por si se gasta la tiza de replanteo. */
  undoRun?: Run | null;
}
export type Screen = 'home' | 'lobby' | 'table' | 'guild' | 'camp' | 'run';
export interface Batch {
  view: PlayerView;
  events: GameEvent[];
}

/** Estado vivo del cliente. Las pantallas lo leen y lo cambian; no hay más fuente de verdad. */
export const S = {
  session: JSON.parse(sessionStorage.getItem('derrumbe') ?? 'null') as Session | null,
  lobby: null as LobbyInfo | null,
  /** Lo que se ve en la mesa (va por detrás del estado real mientras se animan los eventos). */
  shown: null as PlayerView | null,
  screen: null as Screen | null,
  connected: false,
  busy: false,
  /** Acción enviada, esperando al servidor. */
  waiting: false,
  queue: [] as Batch[],
  /** Cartas elegidas, en el orden en que se eligieron: así se resuelven, de izquierda a derecha. */
  selected: [] as string[],
  tutorial: null as Tutorial | null,
  campaign: null as Campaign | null,
  /** Marcas de tiza de la cuadrilla en sala: jugador → lo que señala. */
  pings: {} as Record<string, string>,
};

export const RUN_PLAYER = 'tu';
/** 'ACERO' → 'Acero': la gótica solo se lee bien en caja baja. */
export const cap = (s: string) => s[0] + s.slice(1).toLowerCase();
export const nameOf = (id: string) => (S.shown?.players.find((p) => p.id === id) ?? S.lobby?.players.find((p) => p.id === id))?.name ?? '???';
/** 1,5 en vez de 1.5. */
export const num = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ───────────────────────── Ajustes ─────────────────────────

export interface Settings {
  /** Velocidad de las animaciones de la mesa. */
  speed: 1 | 2 | 4;
  /** Reducir movimiento: sin temblores, partículas ni destellos. */
  calm: boolean;
  /** Tintas de la baraja: 4 de taller (una por palo) o las 2 clásicas (rojo y negro). */
  inks: 4 | 2;
}
const SETTINGS_KEY = 'derrumbe:settings';
export const settings: Settings = { speed: 1, inks: 4, calm: matchMedia('(prefers-reduced-motion: reduce)').matches, ...loadJson<Partial<Settings>>(SETTINGS_KEY) };
if (![1, 2, 4].includes(settings.speed)) settings.speed = 1;
if (settings.inks !== 2) settings.inks = 4;

export function applySettings(): void {
  platform.save(SETTINGS_KEY, JSON.stringify(settings));
  document.documentElement.classList.toggle('calm', settings.calm);
  document.documentElement.classList.toggle('inks2', settings.inks === 2);
  document.documentElement.dataset.speed = String(settings.speed);
}
/** 1× → 2× → 4× (Turbo) → 1×. */
export function cycleSpeed(): number {
  settings.speed = settings.speed === 1 ? 2 : settings.speed === 2 ? 4 : 1;
  applySettings();
  return settings.speed;
}
export const speedLabel = () => (settings.speed === 4 ? '4× Turbo' : `${settings.speed}×`);

// ───────────────────────── Avisos y ventanas ─────────────────────────

export function toast(text: string): void {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/**
 * Ventana sobre la pantalla. Se cierra con su botón, pulsando fuera o con Escape,
 * salvo que sea `sticky` (una decisión que hay que tomar).
 */
export function modal(html: string, opts: { cls?: string; sticky?: boolean; onClose?: () => void } = {}): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `modal ${opts.cls ?? ''}`;
  el.innerHTML = html;
  const close = () => {
    if (!el.isConnected) return;
    el.remove();
    opts.onClose?.();
  };
  if (!opts.sticky) {
    el.addEventListener('click', (e) => {
      if (e.target === el || (e.target as HTMLElement).closest('.x')) close();
    });
  }
  (el as HTMLDivElement & { close: () => void }).close = close;
  el.dataset.sticky = opts.sticky ? '1' : '';
  document.body.appendChild(el);
  return el;
}
export const closeModal = (el: Element | null) => (el as (Element & { close?: () => void }) | null)?.close?.();
export const topModal = () => [...document.querySelectorAll('.modal')].pop() ?? null;

// ───────────────────────── Globos de ayuda ─────────────────────────
// Cualquier elemento con data-tip (HTML) enseña su globo al pasar el puntero, al enfocarlo
// o, en pantallas táctiles, al mantenerlo pulsado.

let tipEl: HTMLDivElement | null = null;
let tipFor: HTMLElement | null = null;
let tipTimer = 0;

/** Resalta las palabras clave de un texto (negrita de tinta, con su propio globo). */
export const kw = markKeywords;

/** Lo que dice el globo: el texto del elemento y, encadenada debajo, la definición de cada palabra clave que menciona. */
function tipHtml(target: HTMLElement): string {
  if (target.matches('.kw')) {
    const k = KEYWORDS.find((x) => x.id === target.dataset.kw);
    return k ? `<b>${k.name}</b>${k.desc}` : '';
  }
  const raw = target.dataset.tip ?? '';
  if (!raw) return '';
  const chained = keywordsIn(raw)
    .map((k) => `<div class="kwdef"><b>${k.name}</b>${k.desc}</div>`)
    .join('');
  return markKeywords(raw) + (chained ? `<div class="chain">${chained}</div>` : '');
}

function showTip(target: HTMLElement): void {
  const html = tipHtml(target);
  if (!html) return;
  tipFor = target;
  tipEl ??= Object.assign(document.createElement('div'), { className: 'tip' });
  tipEl.innerHTML = html;
  document.body.appendChild(tipEl);
  const r = target.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  const x = Math.max(8, Math.min(innerWidth - t.width - 8, r.left + r.width / 2 - t.width / 2));
  const above = r.top - t.height - 10;
  tipEl.style.left = `${x}px`;
  tipEl.style.top = `${above > 6 ? above : Math.min(innerHeight - t.height - 8, r.bottom + 10)}px`;
}
export function hideTip(): void {
  clearTimeout(tipTimer);
  tipEl?.remove();
  tipFor = null;
}
export function bindTips(): void {
  const find = (e: Event) => (e.target as HTMLElement | null)?.closest?.<HTMLElement>('.kw, [data-tip]') ?? null;
  document.addEventListener('pointerover', (e) => {
    if ((e as PointerEvent).pointerType === 'touch') return;
    const t = find(e);
    if (t && t !== tipFor) showTip(t);
    else if (!t) hideTip();
  });
  document.addEventListener('pointerdown', (e) => {
    hideTip();
    if ((e as PointerEvent).pointerType !== 'touch') return;
    const t = find(e);
    if (t) tipTimer = window.setTimeout(() => showTip(t), 380);
  });
  document.addEventListener('pointerup', () => clearTimeout(tipTimer));
  document.addEventListener('focusin', (e) => {
    const t = find(e);
    if (t) showTip(t);
  });
  document.addEventListener('focusout', hideTip);
  addEventListener('scroll', hideTip, true);
}

/** Los botones-sello suenan al pulsarlos. */
export function bindClacks(): void {
  document.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement | null)?.closest?.('button:not(:disabled), .choice.pick, .stamp-btn')) sfx.clack();
  });
}

/** Orden de lectura de una mano: por número y palo, con las especiales y el comodín al final. */
export function sortHand(cards: Card[]): Card[] {
  const order = 'SDHCX';
  return [...cards].sort((a, b) => (a.rank || 99) - (b.rank || 99) || order.indexOf(a.suit) - order.indexOf(b.suit) || a.id.localeCompare(b.id));
}
