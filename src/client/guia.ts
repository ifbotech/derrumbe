// V7 · lo que la mesa enseña sin ventanas: el foco de la partida guiada, el monarca con su maldición a la
// vista y su bocadillo de voz. Aquí solo se pinta; la coreografía y los tiempos son de juice-ux.
//
//  · spotlight(focus, line) / clearSpotlight(): vela la mesa (una capa con opacity), deja a la vista lo que
//    señala el paso (cartas, trono, hueco de La Manga, cuenta o escudo de inmunidad), lo rodea con un aro
//    que late solo con transform y escribe `line` en una placa fija de una línea que no tapa la mano ni la
//    cuenta y no desplaza la mesa. Nada recibe clics: se sigue jugando a través del velo.
//  · paintMonarch(bossId, view): retrato, nombre y placa del decreto en el lateral de la mesa, y la parte
//    de la mesa que castiga la maldición marcada con la misma tinta (morado de veneno, --curse).
//  · showBark(text) / hideBark(): bocadillo de grabado junto al retrato, una línea ≥ 14 px.
//  · setMonarchMood(mood): el retrato de la mesa pasa a «vencido» (o vuelve a «calma»).
import './guia.css';
import type { PlayerView } from '../rules/engine';
import { BOSSES, bossIdentity, type CurseMark } from '../rules/run';
import type { TutorialFocus } from '../rules/tutorial';
import { MonarchMood, monarchSvg } from './art';

// ───────────────────────── iconos de la maldición ─────────────────────────
// Pequeños, de trazo grueso y en currentColor: van en la placa del decreto y en las marcas de la mesa.

const ICON_BODY: Record<CurseMark, string> = {
  // dos espadas cruzadas, dos veces
  contraataque: '<path d="M3,3 L13,13 M13,3 L3,13 M11,11 L21,21 M21,11 L11,21" stroke-width="2.6"/>',
  // un naipe que falta: contorno a trazos y una raya
  mano: '<rect x="5" y="2.5" width="14" height="19" rx="1.5" stroke-dasharray="3 2.4" stroke-width="2.2"/><path d="M8,12 H16" stroke-width="3"/>',
  // el cáliz tachado
  corazones: '<path d="M6,3 H18 C18,10 15,13 12,13 C9,13 6,10 6,3 Z M12,13 V19 M8,20.5 H16" stroke-width="2.2"/><path d="M3,21 L21,3" stroke-width="2.8"/>',
  // escudo con su tope
  escudo: '<path d="M5,6 H19 V12 C19,17 15,20 12,21.5 C9,20 5,17 5,12 Z" stroke-width="2.2"/><path d="M2,3 H22" stroke-width="3.2"/>',
  // casco cerrado de guardia
  guardias: '<path d="M5,20 V11 C5,6 8,3 12,3 C16,3 19,6 19,11 V20 Z" stroke-width="2.2"/><path d="M5,12 H19 M12,12 V20" stroke-width="2.2"/>',
  // espada y un signo más
  ataque: '<path d="M3,21 L14,10 M12,8 L16,12 M14,10 L19,5" stroke-width="2.6"/><path d="M17,15 V23 M13,19 H21" stroke-width="2.4"/>',
  // reloj de arena
  asedio: '<path d="M6,3 H18 M6,21 H18 M7,3 C7,9 12,10 12,12 C12,14 7,15 7,21 M17,3 C17,9 12,10 12,12 C12,14 17,15 17,21" stroke-width="2.2"/>',
};
/** El icono de una maldición (24 × 24, trazo en currentColor). */
export const curseIcon = (mark: CurseMark, cls = '') => `<svg class="curse-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ICON_BODY[mark]}</g></svg>`;

/** La placa del decreto: icono y `badge`, en la tinta de la maldición. */
export function cursePlate(id: string): string {
  const b = bossIdentity(id);
  if (!b) return '';
  return `<span class="curse-plate" data-mark="${b.curse.mark}">${curseIcon(b.curse.mark)}<b>${b.curse.badge}</b></span>`;
}

// ───────────────────────── el monarca en la mesa ─────────────────────────

let shownBoss: string | null = null;

/**
 * Retrato, nombre y placa del decreto en el lateral (#monarch), y la marca de la maldición sobre la parte
 * de la mesa que castiga. Se llama tras cada repintado de la mesa (table.ts renderAll): las marcas que
 * viven dentro de piezas que se repintan (Ataque de los tronos, cartas de la mano) se vuelven a poner.
 */
export function paintMonarch(bossId: string | null, v: PlayerView | null): void {
  const screen = document.querySelector<HTMLElement>('.table-screen');
  const host = document.getElementById('monarch');
  if (!screen || !host) return;
  const b = bossId ? bossIdentity(bossId) : null;
  if (!b || !bossId) {
    host.hidden = true;
    host.innerHTML = '';
    delete screen.dataset.curse;
    shownBoss = null;
    document.querySelectorAll('.curse-tag, .curse-ghost, .curse-chalice').forEach((n) => n.remove());
    return;
  }
  if (shownBoss !== bossId || !host.firstElementChild) {
    shownBoss = bossId;
    host.hidden = false;
    host.dataset.boss = bossId;
    host.innerHTML = `<div class="mon-port" data-lupa="boss:${bossId}" data-tip="<b>${b.who} · ${b.name}</b>${b.desc}">${monarchSvg(bossId, 'calma')}</div>
      <div class="mon-txt"><span class="mon-who">${b.who}</span>${cursePlate(bossId)}</div>`;
  }
  screen.dataset.curse = b.curse.mark;
  markTable(b.curse.mark, v);
}

/** La parte de la mesa que castiga la maldición, con la misma tinta que la placa. */
function markTable(mark: CurseMark, v: PlayerView | null): void {
  const tag = (host: Element | null, text: string, cls = '') => {
    if (!host || host.querySelector(':scope > .curse-tag')) return;
    host.insertAdjacentHTML('beforeend', `<em class="curse-tag ${cls}">${curseIcon(mark)}${text}</em>`);
  };
  if (mark === 'contraataque') tag(document.getElementById('siren-slot')?.closest('.pile') ?? null, '×2');
  if (mark === 'ataque') for (const t of document.querySelectorAll('.tower:not(.fallen) .threat')) tag(t, '+2', 'mini');
  if (mark === 'escudo') tag(document.getElementById('wall-num')?.closest('.stat') ?? null, 'Tope');
  if (mark === 'asedio') {
    const f = document.getElementById('fatigue');
    if (f && !f.hidden) tag(f, '−3', 'mini');
  }
  if (mark === 'mano') {
    const hand = document.getElementById('hand');
    if (hand && !hand.querySelector(':scope > .curse-ghost')) hand.insertAdjacentHTML('beforeend', `<div class="curse-ghost" aria-hidden="true">${curseIcon('mano')}</div>`);
    // el hueco va siempre el último, tras las cartas que reparte la mesa
    const ghost = hand?.querySelector(':scope > .curse-ghost');
    if (ghost && ghost !== hand?.lastElementChild) hand!.appendChild(ghost);
    // el hueco cuenta como una carta más para el ancho de la fila: la mano no empuja a La Manga fuera
    const row = hand?.closest<HTMLElement>('.handrow');
    if (row && hand) row.style.setProperty('--n', String(Math.max(6, hand.querySelectorAll(':scope > .card').length + 1)));
  }
  if (mark === 'corazones' && v) {
    for (const c of document.querySelectorAll<HTMLElement>('#hand .card.s-H:not(.k-special), #reserve .card.s-H:not(.k-special)'))
      if (!c.querySelector(':scope > .curse-chalice')) c.insertAdjacentHTML('beforeend', `<i class="curse-chalice" aria-hidden="true">${curseIcon('corazones')}</i>`);
  }
}

/** El retrato de la mesa en calma o vencido (al caer el monarca). */
export function setMonarchMood(mood: MonarchMood): void {
  const port = document.querySelector('#monarch .mon-port');
  const id = document.getElementById('monarch')?.dataset.boss;
  if (!port || !id) return;
  port.innerHTML = monarchSvg(id, mood);
}

/** Galería de los siete (estado de QA `monarcas` y quien la quiera): retrato en calma y vencido, nombre y placa. */
export function monarchGallery(): string {
  return `<div class="monarcas-galeria">${BOSSES.map(
    (b) => `<figure class="mon-ficha" data-boss="${b.id}">
      <div class="mon-pareja">${monarchSvg(b.id, 'calma')}${monarchSvg(b.id, 'vencido', 'mini')}</div>
      <figcaption><span class="mon-who">${b.who}</span>${cursePlate(b.id)}</figcaption>
    </figure>`,
  ).join('')}</div>`;
}

// ───────────────────────── bocadillo de voz ─────────────────────────

const box = (el: Element | null) => (el && (el as HTMLElement).offsetParent !== null ? el.getBoundingClientRect() : null);
const hits = (a: DOMRect | { left: number; top: number; right: number; bottom: number }, b: DOMRect | null) => !!b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
const handBox = () => {
  const rs = [...document.querySelectorAll('#hand .card, #reserve, .actions')].map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
  if (!rs.length) return null;
  return new DOMRect(Math.min(...rs.map((r) => r.left)), Math.min(...rs.map((r) => r.top)), Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.left)), Math.max(...rs.map((r) => r.bottom)) - Math.min(...rs.map((r) => r.top)));
};

/**
 * El bocadillo del monarca: una línea de mesa brava junto a su retrato. No tapa la mano ni la cuenta;
 * en escritorio sale a la izquierda del retrato, con el pico hacia él; en el móvil, bajo la barra.
 * Se queda hasta hideBark() (los tiempos los pone juice-ux).
 */
export function showBark(text: string): void {
  let el = document.getElementById('bark');
  if (!el) {
    el = document.createElement('div');
    el.id = 'bark';
    el.className = 'bark';
    el.setAttribute('role', 'status');
    el.innerHTML = '<p></p>';
    (document.getElementById('app') ?? document.body).appendChild(el);
  }
  el.querySelector('p')!.textContent = text;
  el.hidden = false;
  el.classList.remove('sale');
  placeBark(el);
  void el.offsetWidth;
  el.classList.add('sale');
  // V8 · A2: si la mesa aún se está colocando (la fila del monarca, la franja de Reliquias), se recoloca
  // cuando cambie su caja, mientras el bocadillo siga a la vista
  barkWatch?.disconnect();
  const bark = el;
  barkWatch = new ResizeObserver(() => !bark.hidden && placeBark(bark));
  for (const sel of ['#monarch', '.table-screen .side', '#towers', '.tray .hudrow']) {
    const n = document.querySelector(sel);
    if (n) barkWatch.observe(n);
  }
}
let barkWatch: ResizeObserver | null = null;

export function hideBark(): void {
  barkWatch?.disconnect();
  barkWatch = null;
  const el = document.getElementById('bark');
  if (!el) return;
  el.classList.remove('sale');
  el.hidden = true;
}

function placeBark(el: HTMLElement): void {
  const W = innerWidth;
  const H = innerHeight;
  const port = box(document.querySelector('#monarch .mon-port')) ?? box(document.querySelector('.boss-chip'));
  const score = box(document.getElementById('score'));
  const hand = handBox();
  el.style.maxWidth = '';
  el.dataset.pico = 'derecha';
  const narrow = W < 641 || W / H < 1;
  // V8 · A2: con el monarca en la mesa, el bocadillo va pegado a su placa y nunca sobre un trono.
  // Escritorio: dentro de la columna lateral (debajo de la placa si cabe; si no, encima, sobre los
  // montones), con el pico hacia el retrato. Móvil: a lo ancho, justo debajo de la fila del monarca,
  // sobre la franja de Reliquias y poderes.
  const mon = box(document.getElementById('monarch'));
  const monPort = box(document.querySelector('#monarch .mon-port'));
  if (mon && monPort) {
    const side = narrow ? null : box(document.querySelector('.table-screen .side'));
    const colL = side ? side.left : 8;
    const colR = side ? side.right : W - 8;
    el.style.maxWidth = `${Math.max(200, colR - colL)}px`;
    const r = el.getBoundingClientRect();
    const left = Math.max(colL, Math.min(colR - r.width, mon.left));
    const lo = box(document.querySelector('.table-screen .bar'))?.bottom ?? 8;
    const hi = narrow ? (score?.top ?? H) : Math.min(side?.bottom ?? H, H - 8);
    const below = mon.bottom + 12;
    const above = mon.top - 12 - r.height;
    const free = (t: number) => {
      const a = { left, top: t, right: left + r.width, bottom: t + r.height };
      return !hits(a, score) && !hits(a, hand);
    };
    const down = below + r.height <= hi && free(below);
    const top = down || above < lo ? below : above;
    el.dataset.pico = down || above < lo ? 'arriba' : 'abajo';
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.style.setProperty('--pico-x', `${Math.round(Math.max(16, Math.min(r.width - 16, monPort.left + monPort.width / 2 - left)))}px`);
    return;
  }
  if (port && !narrow) {
    // a la izquierda del retrato, centrado con él
    const maxW = Math.min(600, port.left - 28);
    el.style.maxWidth = `${Math.max(220, maxW)}px`;
    const r = el.getBoundingClientRect();
    let top = port.top + port.height / 2 - r.height / 2;
    const left = Math.max(8, port.left - 16 - r.width);
    const at = () => ({ left, top, right: left + r.width, bottom: top + r.height });
    // si tocara la cuenta o la mano, sube hasta que no las toque
    while ((hits(at(), score) || hits(at(), hand)) && top > 60) top -= 8;
    el.style.left = `${left}px`;
    el.style.top = `${Math.max(8, Math.min(H - r.height - 8, top))}px`;
    el.style.setProperty('--pico-y', `${Math.round(port.top + port.height / 2 - Math.max(8, top))}px`);
    return;
  }
  // móvil o sin retrato: a lo ancho, bajo la barra y con el pico hacia arriba
  el.dataset.pico = 'arriba';
  const bar = box(document.querySelector('.table-screen .bar'));
  el.style.maxWidth = `${W - 16}px`;
  const r = el.getBoundingClientRect();
  const top = (bar?.bottom ?? 8) + 10;
  el.style.left = `${Math.max(8, (W - r.width) / 2)}px`;
  el.style.top = `${top}px`;
  const ax = port ? port.left + port.width / 2 - Math.max(8, (W - r.width) / 2) : r.width / 2;
  el.style.setProperty('--pico-x', `${Math.round(Math.max(16, Math.min(r.width - 16, ax)))}px`);
}

// ───────────────────────── foco de la partida guiada ─────────────────────────

let current: { focus: TutorialFocus; line: string } | null = null;

/** Los nodos que señala un foco, en la mesa de ahora. */
function focusTargets(focus: TutorialFocus): Element[] {
  const all = (sel: string) => [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0);
  if (focus === 'cards') {
    const cards = all('#hand .card.hint, #hand .card.sel, #reserve .card.hint, #reserve .card.sel');
    return cards.length ? cards : all('#hand');
  }
  if (focus === 'target') {
    for (const sel of ['.tower.hint-target', '.tower.guia-target', '.tower.aimed', '.tower.targetable']) {
      const t = all(sel);
      if (t.length) return t.slice(0, 1);
    }
    return all('#towers');
  }
  // La Manga: el hueco y la carta que se guarda
  if (focus.ui === 'manga') return [...all('#reserve'), ...all('#hand .card.hint, #hand .card.sel')];
  if (focus.ui === 'cuenta') {
    const c = all('#score .calc');
    return c.length ? c : all('#score');
  }
  // inmune: el escudo de hierro del trono del palo de las cartas que se señalan (o el primero en pie)
  const hinted = document.querySelector('#hand .card.hint, #hand .card.sel');
  const suit = hinted ? [...hinted.classList].find((k) => /^s-[SDHC]$/.test(k))?.slice(2) : null;
  const plate = (suit && all(`.tower[data-suit="${suit}"]:not(.fallen) .plate.iron`)) || [];
  return plate.length ? plate : all('.tower:not(.fallen) .plate.iron').slice(0, 1);
}

function union(els: Element[]): DOMRect | null {
  const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0);
  if (!rs.length) return null;
  const l = Math.min(...rs.map((r) => r.left));
  const t = Math.min(...rs.map((r) => r.top));
  return new DOMRect(l, t, Math.max(...rs.map((r) => r.right)) - l, Math.max(...rs.map((r) => r.bottom)) - t);
}

/**
 * Vela la mesa y deja a la vista lo que señala `focus`, con su aro, y escribe `line` en la placa.
 * Se puede volver a llamar con el mismo paso tras un repintado: recoloca sin parpadear.
 */
export function spotlight(focus: TutorialFocus, line: string): void {
  current = { focus, line };
  let root = document.getElementById('guia');
  if (!root) {
    root = document.createElement('div');
    root.id = 'guia';
    root.className = 'guia';
    root.innerHTML = '<div class="guia-hueco"></div><div class="guia-aro"></div><p class="guia-placa" role="status" aria-live="polite"></p>';
    (document.getElementById('app') ?? document.body).appendChild(root);
  }
  const placa = root.querySelector<HTMLElement>('.guia-placa')!;
  if (placa.innerHTML !== line) placa.innerHTML = line;
  root.hidden = false;
  document.documentElement.dataset.guia = '1';
  placeSpotlight(root);
  requestAnimationFrame(() => root!.classList.add('on'));
}

export function clearSpotlight(): void {
  current = null;
  delete document.documentElement.dataset.guia;
  const root = document.getElementById('guia');
  if (!root) return;
  root.classList.remove('on');
  root.hidden = true;
}

function placeSpotlight(root: HTMLElement): void {
  if (!current) return;
  const W = innerWidth;
  const H = innerHeight;
  const r = union(focusTargets(current.focus));
  const hole = root.querySelector<HTMLElement>('.guia-hueco')!;
  const ring = root.querySelector<HTMLElement>('.guia-aro')!;
  const pad = 8;
  // el hueco y su aro, con su margen, sin salirse de la ventana
  const l = r ? Math.max(3, r.left - pad) : W / 2;
  const t = r ? Math.max(3, r.top - pad) : H / 2;
  const rect = r ? { left: l, top: t, width: Math.min(W - 3, r.right + pad) - l, height: Math.min(H - 3, r.bottom + pad) - t } : { left: l, top: t, width: 0, height: 0 };
  for (const n of [hole, ring]) {
    n.style.left = `${rect.left}px`;
    n.style.top = `${rect.top}px`;
    n.style.width = `${rect.width}px`;
    n.style.height = `${rect.height}px`;
  }
  ring.hidden = !r;
  // la placa: sobre la franja de Reliquias y poderes; si tocara la mano, la cuenta o el hueco, bajo la barra
  const placa = root.querySelector<HTMLElement>('.guia-placa')!;
  placa.style.maxWidth = `${W - 16}px`;
  const p = placa.getBoundingClientRect();
  const avoid = [handBox(), box(document.getElementById('score')), r ? new DOMRect(rect.left, rect.top, rect.width, rect.height) : null];
  const hud = box(document.querySelector('.tray .hudrow'));
  const bar = box(document.querySelector('.table-screen .bar'));
  const towers = box(document.getElementById('towers'));
  const spots = [hud ? hud.top + hud.height / 2 - p.height / 2 : null, (bar?.bottom ?? 0) + 8, towers ? towers.bottom - p.height - 8 : null, hud ? hud.top - p.height - 6 : null].filter((y): y is number => y !== null);
  const left = Math.max(8, (W - p.width) / 2);
  const free = spots.find((top) => avoid.every((a) => !hits({ left, top, right: left + p.width, bottom: top + p.height }, a)));
  placa.style.left = `${left}px`;
  placa.style.top = `${Math.max(8, Math.min(H - p.height - 8, free ?? spots[0] ?? 8))}px`;
}

addEventListener('resize', () => {
  const root = document.getElementById('guia');
  if (root && current) placeSpotlight(root);
  const bark = document.getElementById('bark');
  if (bark && !bark.hidden) placeBark(bark);
});
