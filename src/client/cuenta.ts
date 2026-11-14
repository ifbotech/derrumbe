// La cuenta central de la mesa.
//
//  · Por defecto, limpia: el Golpe final entero en grande, el trono contra el que va y las insignias
//    que deciden la jugada (exacto, cae el guardia, ventaja, inmune…). Daño y Multi, en pequeño.
//  · Bajo demanda, el recibo paso a paso: Base + Cartas + Reliquias × Multi = Golpe. Se despliega
//    al pasar el ratón, al enfocar la cuenta con teclado o mando y al tocarla; cada línea sale de los
//    eventos `step` de la previsualización, con el nombre de quien aporta. Sube desde la cuenta y
//    nunca tapa la mano ni los tronos (en móvil es una hoja con su botón de cerrar).
//  · El aviso de último turno (omen) y, cuando cae el golpe final, la causa de la derrota sobre la mesa.
//
// Los estilos están en cuenta.css. table.ts solo llama a paintScore(), LIVE_HTML y stageOver().
import type { Autopsy, Omen } from '../rules/autopsy';
import { omenFor, pasoFor } from '../rules/textos';
import { L, formN, getLang, numL, palo, paloN } from './lengua';
import { Card, FORMATION_NAME, Formation, MATERIAL, PlayerView, RANK_LABEL, SUITS, StrikeResult, Suit, multiplier, threatOf } from '../rules/engine';
import { SPECIAL } from '../rules/specials';
import { causeHtml } from './causa';
import { cap, esc, hideTip, num } from './core';
import { inputMode } from './nav';
import { hint } from './prompts';

/** Una jugada válida apuntando a un trono, con su resultado previsto. */
export interface Preview {
  v: PlayerView;
  cards: Card[];
  r: StrikeResult;
  target: Suit;
  formation: Formation;
}

const CHEVRON = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5,7.8 L6,4.2 L9.5,7.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/></svg>';
const CROSS = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5,3.5 L12.5,12.5 M12.5,3.5 L3.5,12.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/></svg>';
/** Guardia por rango, para el recibo. */
const GUARD_NAME = (r: number): string | undefined => (r === 11 ? L('ui.cuenta.sota') : r === 12 ? L('ui.cuenta.reina') : r === 13 ? L('ui.cuenta.rey') : undefined);
const WARN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12,2.5 L22.5,21 H1.5 Z" fill="currentColor"/><path d="M12,9 V15 M12,17.6 V18.4" fill="none" stroke="var(--hazard)" stroke-width="2.6" stroke-linecap="square"/></svg>';

/** Multi con un decimal como mucho: la línea por defecto no arrastra céntimos (el valor exacto va en el recibo). */
const res1 = (r: number) => numL(Math.round(r * 10) / 10);
const signed = (n: number, text = String(n)) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${text.replace('-', '')}`;

/** Con qué multiplicador pega la jugada contra ese trono: la mayor ventaja y si alguna carta se queda en ×0. */
function material(p: Preview): { adv: number; immune: boolean; own: number } {
  const cfg = p.v.config;
  const allAdv = p.cards.some((c) => c.sp && SPECIAL[c.sp]?.fx.allAdv);
  let adv = 0;
  let immune = false;
  for (const c of p.cards) {
    if (c.sp || c.suit === 'X') continue;
    const m = allAdv ? (cfg.advMult ?? 2) : multiplier(c.suit, p.target, cfg);
    if (m === 0) immune = true;
    else if (m > 1) adv = Math.max(adv, m);
  }
  return { adv, immune, own: cfg.ownMult ?? 0 };
}

/**
 * La línea por defecto: Golpe final en grande, contra qué trono, y las insignias por orden de peso
 * (lo que decide la jugada primero; lo que solo acompaña, después). `tail` son avisos de la mesa que
 * no salen del golpe (el Rebobinar).
 */
export function previewHtml(p: Preview, tail = ''): string {
  const { v, r, target } = p;
  const fallen = r.fallenBy[target] ?? 0;
  const wallGain = Math.min(r.wallGain, v.config.wallCap - v.wall);
  const repair = Math.min(r.repair, v.config.maxIntegrity - v.integrity);
  const { adv, immune } = material(p);
  const mat = paloN(target);
  // cae el trono entero si el golpe se lleva a todos los guardias que le quedan
  const throne = fallen > 0 && fallen >= v.towers[target].floors.length;
  // el Contraataque saca una carta al azar: se avisa del peor Ataque posible entre los tronos en pie
  const worst = Math.max(0, ...SUITS.filter((s) => v.towers[s].floors.length && !v.towers[s].disarmed).map((s) => threatOf(v, v.towers[s])));
  const marks = [
    r.clean ? `<em class="m gold">${L('ui.cuenta.exacto')}</em>` : '',
    fallen ? `<em class="m red">${throne ? L('ui.cuenta.cae.trono') : fallen > 1 ? L('ui.cuenta.caen', { n: fallen }) : L('ui.cuenta.cae')}</em>` : '',
    adv ? `<em class="m adv" data-tip="${L('ui.cuenta.ventaja.tip', { n: adv })}">${L('ui.cuenta.ventaja', { n: adv })}</em>` : '',
    immune ? `<em class="m inm" data-tip="${L('ui.cuenta.inmune.tip')}">${L('ui.cuenta.inmune')}</em>` : '',
    r.hurt ? `<em class="m red">${L('ui.cuenta.vida', { n: r.hurt })}</em>` : '',
    r.clean || r.noSiren ? `<em class="m good">${L('ui.cuenta.sin.contra')}</em>` : (v.config.sirenCount ?? 1) > 1
        ? `<em class="m dim curse" data-tip="${L('ui.cuenta.doble.tip', { n: worst })}">${L('ui.cuenta.doble', { n: worst })}</em>`
        : `<em class="m dim" data-tip="${L('ui.cuenta.contra.tip', { n: worst })}">${L('ui.cuenta.contra', { n: worst })}</em>`,
    wallGain > 0 ? `<em class="m">${L('ui.cuenta.escudo', { n: wallGain })}</em>` : '',
    repair > 0 ? `<em class="m">${L('ui.cuenta.cura', { n: repair })}</em>` : '',
    r.gold ? `<em class="m gold">${L('ui.cuenta.oro', { n: r.gold })}</em>` : '',
    r.draw ? `<em class="m">${L('ui.cuenta.robas', { n: r.draw })}</em>` : '',
    tail,
  ].join('');
  const open = why !== null;
  return `<div class="calc" tabindex="0" role="button" aria-expanded="${open}" aria-controls="recibo" aria-label="${L('ui.cuenta.aria', { t: r.total, palo: mat, forma: formN(p.formation), d: r.fuerza, m: r.res })}">
      <b class="t">${r.total}</b>
      <span class="calc-txt">
        <span class="vs"><span class="forma">${formN(p.formation)}</span><span>${L('ui.cuenta.contra.vs')}</span><strong>${palo(target)}</strong>${hint('strike')}</span>
        <span class="fr"><span class="fr-f"><i class="lg">${L('ui.cuenta.dano')}</i><i class="sh">${L('ui.cuenta.dano.corto')}</i><b>${r.fuerza}</b></span><i class="por" aria-hidden="true">×</i><span class="fr-r"><i class="lg">${L('ui.cuenta.multi')}</i><i class="sh">${L('ui.cuenta.multi.corto')}</i><b>×${res1(r.res)}</b></span><em class="abre">${L('ui.cuenta.abre')}${CHEVRON}</em></span>
      </span>
    </div>
    <span class="marks">${marks}</span>`;
}

/** El marcador mientras se resuelve un golpe: Daño × Multi = Golpe, con la misma tipografía de cifras. */
export const liveHtml = (): string =>
  `<span class="tag go" id="live-tag"></span><div class="calc"><small>${L('ui.cuenta.dano')}</small><b class="f">0</b><i>×</i><small>${L('ui.cuenta.multi')}</small><b class="r">1</b><i>=</i><small>${L('ui.cuenta.golpe')}</small><b class="t">?</b></div><span class="marks" id="live-marks"></span>`;

// ───────────────────────── El recibo ─────────────────────────

interface Line {
  who: string;
  /** La cifra de la línea (+7, ×1,5…). Vacía en un aviso sin números. */
  amount: string;
  kind: 'f' | 'r' | 'x' | 'n';
  note?: string;
  /** Clase extra: `repite` es una línea que en la hoja del móvil sobra (ya la dice la cuenta). */
  cls?: string;
}
interface Slip {
  base: Line[];
  cards: Line[];
  belt: Line[];
  res: Line[];
  after: Line[];
  nBase: number;
  nCards: number;
  nBelt: number;
}

/** Reparte los pasos de la previsualización entre las fichas del recibo. */
function slip(p: Preview): Slip {
  const cfg = p.v.config;
  const s: Slip = { base: [], cards: [], belt: [], res: [], after: [], nBase: 0, nCards: 0, nBelt: 0 };
  const byId = new Map(p.cards.map((c) => [c.id, c]));
  const allAdv = p.cards.some((c) => c.sp && SPECIAL[c.sp]?.fx.allAdv);
  let hit = false;
  for (const ev of p.r.events) {
    if (ev.e === 'impact') hit = true;
    if (ev.e !== 'step') continue;
    // el texto del motor en el idioma de la mesa; la nota española se guarda para reconocer «inmune»
    const label = pasoFor(getLang(), ev);
    const colon = label.indexOf(': ');
    const who = colon >= 0 ? label.slice(0, colon) : label;
    const note = colon >= 0 ? label.slice(colon + 2) : '';
    const noteEs = ev.label.includes(': ') ? ev.label.slice(ev.label.indexOf(': ') + 2) : '';
    if (hit) {
      // lo que las reliquias y la mesa hacen después del golpe: ya no cambia el Golpe
      s.after.push({ who, amount: '', kind: 'n', note: note || L('ui.cuenta.tras') });
      continue;
    }
    const group = ev.src === 'tool' ? 'belt' : ev.src === 'form' || ev.src === 'chain' || ev.src === 'state' ? 'base' : 'cards';
    const lines = s[group];
    if (ev.src === 'form') {
      // la formación pone la base de las dos mitades de la cuenta
      s.base.push({ who, amount: String(ev.df ?? 0), kind: 'f', note: L('ui.cuenta.formacion') });
      s.nBase += ev.df ?? 0;
      s.res.push({ who, amount: `×${num(1 + (ev.dr ?? 0))}`, kind: 'x', note: L('ui.cuenta.base') });
      continue;
    }
    if (ev.df !== undefined) {
      const card = ev.src === 'card' ? byId.get(ev.id) : undefined;
      const m = card && card.suit !== 'X' ? (allAdv ? (cfg.advMult ?? 2) : multiplier(card.suit, p.target, cfg)) : 1;
      lines.push({ who, amount: signed(ev.df), kind: 'f', note: m > 1 ? L('ui.cuenta.ventaja.nota', { n: m }) : undefined });
      if (group === 'base') s.nBase += ev.df;
      else if (group === 'cards') s.nCards += ev.df;
      else s.nBelt += ev.df;
    }
    if (ev.dr !== undefined) s.res.push({ who, amount: signed(ev.dr, num(ev.dr)), kind: 'r' });
    if (ev.mr !== undefined) s.res.push({ who, amount: `×${num(ev.mr)}`, kind: 'x' });
    if (ev.df === undefined && ev.dr === undefined && ev.mr === undefined) {
      const immune = ev.src === 'card' && noteEs === 'inmune';
      lines.push({ who, amount: immune ? '×0' : '', kind: 'n', note: immune ? L('ui.cuenta.inmune.nota') : note });
    }
  }
  // por si el motor suma algún día Daño por un camino sin paso: la Base absorbe la diferencia y la cuenta siempre cuadra
  s.nBase = p.r.fuerza - s.nCards - s.nBelt;
  return s;
}

function receiptHtml(p: Preview): string {
  const { v, r, target } = p;
  const s = slip(p);
  const li = (l: Line) => `<li class="l-${l.kind}${l.cls ? ` ${l.cls}` : ''}"><span>${esc(l.who)}${l.note ? ` <small>${esc(l.note)}</small>` : ''}</span>${l.amount ? `<b>${l.amount}</b>` : ''}</li>`;
  const ficha = (cls: string, op: string, label: string, value: string, lines: Line[], empty: string) =>
    `<section class="ficha ${cls}">${op ? `<i class="op" aria-hidden="true">${op}</i>` : ''}<h4><span>${label}</span><b>${value}</b></h4><ul>${lines.length ? lines.map(li).join('') : `<li class="l-n vacio"><span>${empty}</span></li>`}</ul></section>`;
  // el trono: lo que le queda al guardia y cómo sale del golpe
  const t = v.towers[target];
  const rank = t.floors[0];
  const hp = v.config.floorHp[rank] ?? 0;
  const left = Math.max(0, hp - t.damage);
  const fallen = r.fallenBy[target] ?? 0;
  const dealt = r.dealt[target] ?? 0;
  const fate = fallen > 1 ? L('ui.cuenta.fate.caen', { n: fallen }) : fallen ? (r.fell.some((f) => f.tower === target && f.clean) ? L('ui.cuenta.fate.exacto') : L('ui.cuenta.fate.cae')) : L('ui.cuenta.fate.quedan', { n: Math.max(0, left - dealt) });
  const total: Line[] = [
    { who: L('ui.cuenta.de', { guardia: GUARD_NAME(rank) ?? RANK_LABEL[rank] ?? '', palo: paloN(target) }), amount: `${left}`, kind: 'n', note: fate },
    ...s.after,
  ];
  // en el móvil el aviso de último turno va en un renglón: su explicación entera vive aquí, en el recibo
  const o = omenFor(getLang(), v);
  return `<header class="recibo-cab"><b>${L('ui.cuenta.paso')}</b><span>${L('ui.cuenta.contra.casa', { forma: formN(p.formation), palo: paloN(target) })}</span></header>
    ${o ? `<p class="recibo-omen" role="note"><b>${esc(o.title)}</b> ${esc(o.detail)}</p>` : ''}
    <div class="recibo-cuerpo">
      ${ficha('f-base', '', L('ui.cuenta.Base'), String(s.nBase), s.base, '—')}
      ${ficha('f-cartas', '+', L('ui.cuenta.cartas'), String(s.nCards), s.cards, L('ui.cuenta.solo.especiales'))}
      ${ficha('f-cinto', '+', L('ui.cuenta.reliquias'), String(s.nBelt), s.belt, v.tools.length ? L('ui.cuenta.no.suman') : L('ui.cuenta.sin.reliquias'))}
      ${ficha('f-res', '×', L('ui.cuenta.multi'), num(r.res), s.res, '—')}
      ${ficha('f-total', '=', L('ui.cuenta.golpe'), String(r.total), total, '')}
    </div>
    <button class="recibo-x" type="button" aria-label="${L('ui.cuenta.cerrar')}">${CROSS}</button>`;
}

/** Por qué está abierto el recibo: el ratón encima, el foco de teclado o mando, o fijado con un toque. */
let why: 'hover' | 'focus' | 'pin' | null = null;
let shown: Preview | null = null;
let hoverTimer = 0;
let refocusing = false;
let bound = false;

const MOBILE = matchMedia('(max-aspect-ratio: 1/1), (max-width: 640px)');
const GAP = 5;
const panel = () => document.getElementById('recibo');
const calc = () => document.querySelector<HTMLElement>('#score .calc[tabindex]');

function ensurePanel(): HTMLElement | null {
  let el = panel();
  if (el) return el;
  const host = document.querySelector('.table-screen');
  if (!host) return null;
  el = document.createElement('aside');
  el.id = 'recibo';
  el.className = 'recibo';
  el.hidden = true;
  el.setAttribute('aria-label', L('ui.cuenta.paso'));
  host.appendChild(el);
  return el;
}

/**
 * Coloca el recibo en la franja que queda entre el pie de las torres y la cuenta: crece hacia arriba
 * desde la cuenta. Si esa franja no da para leer nada, puede tapar la propia cuenta, pero nunca la mano.
 */
function place(): void {
  const el = panel();
  const score = document.getElementById('score');
  if (!el || el.hidden || !score) return;
  const sheet = MOBILE.matches;
  el.classList.toggle('hoja', sheet);
  const tops = [...document.querySelectorAll('#hand .card, #reserve:not([hidden])')].map((n) => n.getBoundingClientRect()).filter((b) => b.height > 0);
  const handTop = tops.length ? Math.min(...tops.map((b) => b.top)) : innerHeight;
  const towersBottom = Math.max(0, ...[...document.querySelectorAll('.tower')].map((n) => n.getBoundingClientRect().bottom));
  const sr = score.getBoundingClientRect();
  const top = towersBottom + GAP;
  if (sheet) {
    el.style.left = '6px';
    el.style.right = '6px';
    el.style.maxWidth = '';
    el.style.transform = '';
  }
  // a lo ancho: centrado en la cuenta, sin pisar los botones de acción que caigan a su altura
  const mid = Math.round(sr.left + sr.width / 2);
  let lo = 10;
  let hi = innerWidth - 10;
  if (!sheet) {
    const bandBottom = Math.min(handTop, innerHeight);
    for (const n of document.querySelectorAll('.actions button')) {
      const b = n.getBoundingClientRect();
      if (b.height <= 0 || b.top >= bandBottom || b.bottom <= top) continue;
      if (b.left >= mid) hi = Math.min(hi, b.left - 8);
      else if (b.right <= mid) lo = Math.max(lo, b.right + 8);
    }
    el.style.transform = 'none';
    el.style.right = 'auto';
    el.style.left = `${lo}px`;
    el.style.maxWidth = `${Math.max(280, hi - lo)}px`;
  }
  const head = el.querySelector('.ficha h4')?.getBoundingClientRect().height ?? 28;
  const line = el.querySelector('.ficha li')?.getBoundingClientRect().height ?? 19;
  const body = el.querySelector<HTMLElement>('.recibo-cuerpo');
  /** Coloca el recibo con su pie en `bottom`; devuelve si cabe entero, sin desplazamiento. */
  const at = (bottom: number): boolean => {
    const room = Math.max(64, bottom - top);
    el.style.bottom = `${Math.round(innerHeight - bottom)}px`;
    el.style.maxHeight = `${Math.floor(room)}px`;
    // cuántas líneas caben bajo la cabecera de cada ficha: las demás pasan a otra columna
    const fits = () => !body || (body.scrollHeight <= body.clientHeight + 1 && body.scrollWidth <= body.clientWidth + 1);
    if (sheet) return fits();
    const max = Math.max(2, Math.min(9, Math.floor((room - head - 22) / Math.max(14, line))));
    // una línea que se parte en dos ocupa dos renglones: se prueba con un renglón menos por columna mientras quepa a lo ancho;
    // si así no cabe, se repite con las notas en un solo renglón (.ancho), que gasta el ancho que sobre en lugar de alto
    for (const ancho of [false, true]) {
      el.classList.toggle('ancho', ancho);
      for (let rows = max; rows >= 2; rows--) {
        el.style.setProperty('--rows', String(rows));
        if (fits()) return true;
        if (body && body.scrollWidth > body.clientWidth + 1) break;
      }
    }
    el.classList.remove('ancho');
    el.style.setProperty('--rows', String(max));
    return fits();
  };
  // primero, en la franja entre las torres y la cuenta, sin taparla; si ahí no cabe, baja hasta la mano (nunca la pisa)
  const above = Math.min(sr.top, handTop) - GAP;
  const low = Math.max(above, Math.min(handTop, innerHeight) - GAP);
  if (above - top < 84 || !at(above)) at(low);
  if (!sheet) {
    const w = el.getBoundingClientRect().width;
    el.style.left = `${Math.round(Math.max(lo, Math.min(mid - w / 2, hi - w)))}px`;
  }
  fades();
}

/** Tinta desvanecida en el borde hacia el que queda recibo por leer. */
function fades(): void {
  const body = panel()?.querySelector<HTMLElement>('.recibo-cuerpo');
  if (!body) return;
  body.classList.toggle('mas-abajo', body.scrollTop + body.clientHeight < body.scrollHeight - 2);
  body.classList.toggle('mas-arriba', body.scrollTop > 2);
  body.classList.toggle('mas-der', body.scrollLeft + body.clientWidth < body.scrollWidth - 2);
  body.classList.toggle('mas-izq', body.scrollLeft > 2);
  // el mismo aviso, con el nombre que lee la QA visual
  const more = (['arriba', 'abajo'] as const).filter((k) => body.classList.contains(`mas-${k}`)).join(' ');
  if (more) body.dataset.mas = more;
  else delete body.dataset.mas;
}

function draw(fresh: boolean): void {
  const el = ensurePanel();
  if (!el || !shown) return;
  el.innerHTML = receiptHtml(shown);
  el.hidden = false;
  el.dataset.why = why ?? '';
  el.querySelector('.recibo-cuerpo')?.addEventListener('scroll', fades, { passive: true });
  if (fresh) {
    el.classList.remove('abre');
    void el.offsetWidth;
    el.classList.add('abre');
  }
  place();
  // la mesa puede terminar de asentarse (fuentes, mano recién repartida) después de abrirlo: se recoloca una vez más
  requestAnimationFrame(() => requestAnimationFrame(place));
  calc()?.setAttribute('aria-expanded', 'true');
  document.getElementById('score')?.classList.add('con-recibo');
}

function open(reason: 'hover' | 'focus' | 'pin'): void {
  if (!shown) return;
  const fresh = why === null;
  why = reason;
  hideTip();
  draw(fresh);
}

/** Cierra el recibo. Devuelve true si estaba abierto (Esc y B lo usan para saber si ya atendieron la tecla). */
export function closeReceipt(): boolean {
  clearTimeout(hoverTimer);
  const was = why !== null;
  why = null;
  const el = panel();
  if (el) {
    el.hidden = true;
    el.classList.remove('abre');
  }
  calc()?.setAttribute('aria-expanded', 'false');
  document.getElementById('score')?.classList.remove('con-recibo');
  return was;
}
export const receiptOpen = () => why !== null;

/** Para la QA y para quien quiera abrirlo por código: el recibo fijado, como tras un toque. */
export function pinReceipt(): void {
  bind();
  open('pin');
}

function bind(): void {
  if (bound) return;
  bound = true;
  const inCalc = (t: EventTarget | null) => !!(t as Element | null)?.closest?.('#score .calc[tabindex]');
  const inPanel = (t: EventTarget | null) => !!(t as Element | null)?.closest?.('#recibo');
  // ratón: se abre al detenerse encima (no al cruzar camino de una torre) y se repliega al salir
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const over = inCalc(e.target) || (why !== null && inPanel(e.target));
    clearTimeout(hoverTimer);
    if (over && why === null) hoverTimer = window.setTimeout(() => open('hover'), 190);
    else if (!over && why === 'hover') hoverTimer = window.setTimeout(closeReceipt, 170);
  });
  // teclado y mando: enfocar la cuenta la despliega; al irse el foco, se repliega
  document.addEventListener('focusin', (e) => {
    if (refocusing || !inCalc(e.target) || inputMode() === 'pointer') return;
    if (why !== 'pin') open('focus');
  });
  document.addEventListener('focusout', (e) => {
    if (refocusing || why !== 'focus' || !inCalc(e.target) || inPanel(e.relatedTarget)) return;
    closeReceipt();
  });
  // toque, clic, Enter o A: la fija abierta; otra vez, la repliega
  document.addEventListener('click', (e) => {
    if ((e.target as Element | null)?.closest?.('#recibo .recibo-x')) {
      closeReceipt();
      if (inputMode() !== 'pointer') calc()?.focus({ preventScroll: true });
      return;
    }
    if (!inCalc(e.target)) return;
    if (why === 'pin') closeReceipt();
    else open('pin');
  });
  addEventListener('resize', place);
}

/**
 * Pinta el marcador (lo llama renderScore con su HTML ya montado) sin perder lo que es de la cuenta:
 * el foco, si estaba en ella, y el recibo, que se pone al día con la jugada nueva o se cierra si ya
 * no hay ninguna. También refresca el aviso de último turno.
 */
export function paintScore(el: HTMLElement, html: string, preview: Preview | null, v: PlayerView): void {
  bind();
  const had = !!document.activeElement?.closest?.('#score .calc');
  el.innerHTML = html;
  shown = preview;
  if (!preview) closeReceipt();
  else if (why !== null) draw(false);
  if (had) {
    const next = calc();
    refocusing = true;
    next?.focus({ preventScroll: true });
    refocusing = false;
    if (!next && why === 'focus') closeReceipt();
  }
  renderOmen(v);
}

// ───────────────────────── Aviso de último turno ─────────────────────────

/** Banda fija junto a la cuenta mientras el próximo Contraataque o el Mazo agotado puedan dejarte sin Vida. */
export function renderOmen(v: PlayerView | null): void {
  const score = document.getElementById('score');
  if (!score) return;
  let band = document.getElementById('omen');
  const o = v ? omenFor(getLang(), v) : null;
  if (!o) {
    band?.remove();
    return;
  }
  if (!band) {
    band = document.createElement('div');
    band.id = 'omen';
    band.setAttribute('role', 'status');
  }
  // dentro de la cuenta, a su lado (en la misma fila si cabe): así no le roba una fila entera a las torres
  const anchor = score.querySelector(':scope > .calc');
  if (band.parentElement !== score) {
    if (anchor) anchor.after(band);
    else score.appendChild(band);
  }
  const key = `${o.kind}|${o.title}|${o.detail}`;
  if (band.dataset.key === key) return;
  band.dataset.key = key;
  band.className = `omen k-${o.kind}`;
  band.setAttribute('aria-label', `${o.title}. ${o.detail}`);
  band.innerHTML = `<span class="omen-ico">${WARN}</span><p><b>${esc(o.title)}</b><span>${esc(o.detail)}</span></p><span class="omen-corto" aria-hidden="true">${WARN}<b>${esc(omenShort(o, v?.integrity ?? 0))}</b></span>`;
}

/**
 * El aviso en un renglón, para el móvil: «Último turno · ⚔ 9 · Vida 2». Se corta por diseño (las cifras
 * que deciden), no con puntos suspensivos; la frase entera sigue en la banda para el lector de pantalla
 * y en el recibo de la cuenta.
 */
function omenShort(o: Omen, life: number): string {
  // las cifras vienen del motor en campos propios (autopsy.ts): no se leen de la frase
  const vida = o.life ?? life;
  if (o.kind === 'colapso') return `${L('ui.cuenta.ultimo.agotado')}${o.loss !== undefined ? ` −${o.loss}` : ''}${L('ui.cuenta.ultimo.vida', { n: vida })}`;
  return `${L('ui.cuenta.ultimo.contra')}${o.threat !== undefined ? ` ⚔ ${o.threat}` : ''}${L('ui.cuenta.ultimo.vida', { n: vida })}`;
}

// ───────────────────────── La causa, sobre la mesa ─────────────────────────

/**
 * Fin del asalto en campaña. Si se ganó, deja ver caer el último trono un momento. Si se perdió, la
 * causa de la derrota se queda sobre la mesa (sin tapar tronos ni la Vida) hasta que el jugador pasa
 * a la crónica: no hay cuenta atrás, se lee con calma.
 */
export function stageOver(death: Autopsy | null): Promise<void> {
  closeReceipt();
  document.getElementById('omen')?.remove();
  if (!death) return new Promise((done) => setTimeout(done, 900));
  return new Promise((done) => {
    document.querySelectorAll('.causa-mesa').forEach((n) => n.remove());
    const el = document.createElement('div');
    el.className = 'end causa-mesa';
    el.innerHTML = `<div class="causa-caja">${causeHtml(death)}<div class="row"><button class="primary" id="to-acta">${L('ui.cuenta.cronica')}</button></div></div>`;
    document.body.appendChild(el);
    const go = el.querySelector<HTMLButtonElement>('#to-acta')!;
    go.onclick = () => {
      el.remove();
      done();
    };
    if (inputMode() !== 'pointer') go.focus({ preventScroll: true });
  });
}
