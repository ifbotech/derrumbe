// Efectos de la mesa: tiempos, vuelos de cartas, golpes, temblores, astillas y rótulos.
// Todo respeta dos ajustes: la velocidad (1×, 2×, 4×) y «Reducir movimiento».
//
// V8 · Lo que vuela son las piezas grabadas de engraving.ts (esquirlas de corona, naipe cortado, astillas,
// lacre y monedas) y solo se mueve con transform y opacity. Salen de una reserva: una vez caliente, ningún
// golpe crea piezas nuevas. Con «Reducir movimiento» no vuela ni tiembla nada: quedan fundidos y el sonido.
import type { GameEvent, Seal, Suit } from '../rules/engine';
import { sfx } from './audio';
import { cardEl } from './card';
import { $, S, settings } from './core';
import { coinPieces, crownShards, crownShardsHost, slashPieces, waxStamp } from './engraving';
import { inputMode } from './nav';

/** Factor de tiempo: más rápido si hay jugadas en cola o el jugador eligió 2× / 4×. */
export const speed = () => (S.queue.length > 0 ? 0.3 : 1) / settings.speed;
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms * speed()));
const real = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function restart(el: Element | null, cls: string): void {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}

export const CRACKS = `<svg class="cracks" viewBox="0 0 250 350" data-level="0">${[
  ['c1', 'M152,4 L139,58 L161,92 L133,138 L149,178'],
  ['c2', 'M4,252 L52,237 L79,263 L118,241 L131,202'],
  ['c3', 'M246,302 L197,287 L177,245 L150,231 M177,245 L205,214 L196,188'],
]
  .map(([c, d]) => `<path class="${c}" d="${d}"/><path class="${c} in" d="${d}"/>`)
  .join('')}</svg>`;

/** Entrada de carta: vuela boca abajo, se voltea y estampa sus pintas. */
export function dealIn(el: HTMLElement, delay: number): void {
  el.style.setProperty('--d', `${delay}ms`);
  el.classList.add('deal');
  setTimeout(() => el.classList.remove('deal'), delay + 1700);
}

// ───────────── la reserva de piezas ─────────────
/** Piezas creadas en toda la sesión (la prueba de humo comprueba que deja de crecer). */
let made = 0;
const slashFree: HTMLElement[][] = [];
const shardFree: HTMLDivElement[] = [];
const splinterFree: HTMLElement[] = [];
const coinFree: HTMLElement[] = [];
const waxFree: Partial<Record<Seal, SVGSVGElement[]>> = {};
const SEALS: Seal[] = ['dinamita', 'eco', 'jornal', 'sindical'];
/** Retira una pieza al acabar su vuelo y la devuelve a su reserva (sin animaciones colgando). */
function release<T extends Element>(el: T, pool: T[]): void {
  el.getAnimations().forEach((a) => a.cancel());
  el.remove();
  pool.push(el);
}
/** Una variable CSS numérica de la pieza (--vx, --vy, --giro…). */
const v = (el: Element, name: string) => parseFloat((el as HTMLElement).style.getPropertyValue(name)) || 0;
/** El vuelo dura lo que dicte la velocidad, y la pestaña en segundo plano no lo deja colgado. */
const after = (ms: number, fn: () => void) => window.setTimeout(fn, ms + 40);

/**
 * La reserva se calienta una vez al cargar: una pieza de cada (naipe cortado, corona, astillas, monedas,
 * lacres y una lámina que pasa) se pinta unos fotogramas en una esquina, casi transparente, y se guarda.
 * Así el primer golpe de verdad no paga ni los nodos ni el primer pintado en la GPU. Nada se ve.
 */
function warmUp(): void {
  if (settings.calm || !document.body) return;
  const box = document.createElement('div');
  box.className = 'calentar';
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;left:0;top:0;width:120px;height:120px;opacity:0.01;pointer-events:none;z-index:1;overflow:hidden;';
  const card = cardEl({ id: 'calentar', suit: 'H', rank: 7, tr: 'policromado', seal: 'dinamita' }, { tilt: false });
  card.style.setProperty('--w', '80px');
  box.appendChild(card);
  document.body.appendChild(box);
  const slash = slashPieces(card);
  const host = crownShardsHost('H');
  const coinsW = coinPieces(10);
  const waxes = SEALS.map((x) => waxStamp(x));
  const splinters = Array.from({ length: 12 }, () => splinter());
  made += slash.length + host.children.length + coinsW.length + waxes.length;
  const ring = document.createElement('i');
  ring.style.cssText = 'position:absolute;left:8px;top:8px;width:60px;height:60px;border:4px solid #f3ead2;border-radius:6px;box-shadow:0 0 0 2px #0d0c0b, inset 0 0 0 2px #0d0c0b;';
  const all: Element[] = [...slash, host, ...coinsW, ...splinters, ring];
  for (const el of all) {
    (el as HTMLElement).style.position = 'absolute';
    box.appendChild(el);
  }
  waxes.forEach((w) => (w.classList.add('caliente'), card.appendChild(w)));
  const move = [{ transform: 'translate(0, 0) rotate(0deg)', opacity: 1 }, { transform: 'translate(2px, 3px) rotate(8deg)', opacity: 0.9 }];
  // las cuatro láminas (cada degradado se pinta la primera vez que pasa: que no sea en mitad de un barrido del foco)
  // dentro de una mano de verdad (.hand), con las mismas reglas de capa que las cartas de la mesa
  const hand = document.createElement('div');
  hand.className = 'hand';
  hand.style.cssText = 'position:absolute;left:0;top:0;width:120px;height:120px;';
  box.appendChild(hand);
  const foils = (['forjado', 'templado', 'agrietado', 'policromado'] as const).map((tr, i) => {
    const c = cardEl({ id: `calentar-${tr}`, suit: 'S', rank: 2 + i, tr }, { tilt: false });
    c.style.setProperty('--w', '60px');
    c.setAttribute('data-foco', '');
    hand.appendChild(c);
    return c;
  });
  for (const el of [...all, ...waxes, ...[card, ...foils].map((c) => c.querySelector('.foil-band'))]) el?.animate(move, { duration: 140 });
  window.setTimeout(() => {
    box.remove();
    for (const el of [...all, ...waxes]) {
      el.getAnimations().forEach((a) => a.cancel());
      (el as HTMLElement).style.position = '';
      el.remove();
    }
    ring.remove();
    slashFree.push(slash);
    shardFree.push(host);
    coinFree.push(...coinsW);
    splinterFree.push(...splinters);
    waxes.forEach((w, i) => (w.classList.remove('caliente'), (waxFree[SEALS[i]] ??= []).push(w)));
  }, 160);
}

/** Astillas de papel grabadas (las del tajo, sueltas): de tres en tres, de un naipe que no se pinta. */
function splinter(): HTMLElement {
  if (!splinterFree.length) {
    const [, , ...three] = slashPieces(document.createElement('div'));
    made += three.length;
    splinterFree.push(...three);
  }
  return splinterFree.pop()!;
}

/** Astillas que saltan desde un punto de la pantalla, con un empuje opcional (dx, dy). */
export function burst(x: number, y: number, n = 16, push: [number, number] = [0, 0]): void {
  if (settings.calm) return;
  const k = speed();
  for (let i = 0; i < Math.min(12, n); i++) {
    const d = splinter();
    const w = 12 + Math.random() * 16;
    d.style.cssText = `--x:${(x - w / 2).toFixed(1)}px;--y:${y.toFixed(1)}px;--w:${w.toFixed(1)}px;--r:${Math.round(Math.random() * 180)}deg`;
    document.body.appendChild(d);
    const ang = Math.random() * Math.PI * 2;
    const dist = 50 + Math.random() * 130;
    const dx = Math.cos(ang) * dist + push[0];
    const dy = Math.sin(ang) * dist - 60 + push[1];
    const spin = (Math.random() - 0.5) * 540;
    const dur = (620 + Math.random() * 260) * k;
    d.animate(
      [
        { transform: 'scale(0.6)', opacity: 1 },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy + 150}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: dur, easing: 'cubic-bezier(0.2, 0.6, 0.6, 1)', fill: 'forwards' },
    );
    after(dur, () => release(d, splinterFree));
  }
}

/**
 * Guardia abatido: tajo de naipe. La carta se corta en diagonal (slashPieces): las dos mitades se separan
 * por el filo y caen girando, y tres astillas de papel saltan del corte. ~0,76 s a 1×, con su silbido de
 * hoja. Con «Reducir movimiento», la carta solo se va (y suena el tajo).
 */
export function tear(card: HTMLElement): void {
  sfx.slash();
  if (settings.calm) {
    card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' });
    window.setTimeout(() => (card.style.visibility = 'hidden'), 170);
    return;
  }
  const reuse = slashFree.pop();
  const pieces = slashPieces(card, reuse); // mide la carta antes de esconderla
  if (!reuse) made += pieces.length;
  card.style.visibility = 'hidden';
  const W = v(pieces[0], '--w') || card.getBoundingClientRect().width || 80;
  const k = speed();
  const dur = 760 * k;
  pieces.forEach((p, i) => {
    document.body.appendChild(p);
    const half = i < 2;
    const dx = v(p, '--vx') * W * (half ? 0.8 : 1.7);
    const dy = v(p, '--vy') * W * (half ? 0.35 : 0.9);
    const g = v(p, '--giro');
    p.animate(
      half
        ? [
            { transform: 'none', opacity: 1 },
            { transform: `translate(${(dx * 0.18).toFixed(1)}px, ${(dy * 0.4).toFixed(1)}px) rotate(${(g * 0.15).toFixed(1)}deg)`, opacity: 1, offset: 0.2 },
            { transform: `translate(${dx.toFixed(1)}px, ${(dy + W * 1.7).toFixed(1)}px) rotate(${g}deg)`, opacity: 0 },
          ]
        : [
            { transform: 'scale(0.5)', opacity: 0 },
            { transform: `translate(${(dx * 0.55).toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${(g * 0.4).toFixed(1)}deg)`, opacity: 1, offset: 0.3 },
            { transform: `translate(${dx.toFixed(1)}px, ${(dy + W * 1.3).toFixed(1)}px) rotate(${g}deg)`, opacity: 0 },
          ],
      { duration: half ? dur : dur * 0.85, easing: half ? 'cubic-bezier(0.45, 0, 0.8, 0.5)' : 'cubic-bezier(0.2, 0.6, 0.55, 1)', fill: 'forwards' },
    );
  });
  after(dur, () => {
    pieces.forEach((p) => {
      p.getAnimations().forEach((a) => a.cancel());
      p.remove();
    });
    slashFree.push(pieces);
  });
}

/** Número o rótulo que salta sobre un elemento y se va. */
export function floatText(host: HTMLElement | null, text: string, cls = ''): void {
  if (!host) return;
  const f = document.createElement('div');
  f.className = `float ${cls}`;
  f.textContent = text;
  host.appendChild(f);
  setTimeout(() => f.remove(), 950);
}

/** Etiqueta pequeña que sube desde un punto de la pantalla (las aportaciones de cada paso del golpe). */
export function chipAt(target: Element | null, text: string, cls = ''): void {
  if (!target) return;
  const r = target.getBoundingClientRect();
  const c = document.createElement('div');
  c.className = `stepchip ${cls}`;
  c.textContent = text;
  c.style.left = `${r.left + r.width / 2}px`;
  c.style.top = `${r.top}px`;
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 900);
}

export function banner(text: string, cls = '', small = ''): void {
  const b = document.createElement('div');
  b.className = `banner ${cls}`;
  b.innerHTML = `<div>${text}${small ? `<small>${small}</small>` : ''}</div>`;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1050);
}

/** Aviso suave: una cinta que baja, se queda un momento y se va. */
export function ribbon(text: string): void {
  document.querySelectorAll('.ribbon').forEach((r) => r.remove());
  const r = document.createElement('div');
  r.className = 'ribbon';
  r.textContent = text;
  document.body.appendChild(r);
  setTimeout(() => r.remove(), 1700);
}

export function flash(): void {
  if (settings.calm) return;
  const f = document.createElement('div');
  f.className = 'flash';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 520);
}

/**
 * Temblor proporcional y con dirección: `power` de 0 a 1 decide cuánto, (dx, dy) hacia dónde
 * empuja el primer golpe (después rebota y se apaga).
 */
export function shake(el: Element | null, power: number, dx = 0, dy = 1): void {
  if (!el || settings.calm) return;
  const amp = 3 + 15 * Math.max(0, Math.min(1, power));
  const len = Math.hypot(dx, dy) || 1;
  const x = (dx / len) * amp;
  const y = (dy / len) * amp;
  el.animate(
    [
      { transform: 'none' },
      { transform: `translate(${x}px, ${y}px)`, offset: 0.12 },
      { transform: `translate(${-x * 0.7}px, ${-y * 0.7}px)`, offset: 0.3 },
      { transform: `translate(${y * 0.4}px, ${-x * 0.4}px)`, offset: 0.5 },
      { transform: `translate(${-y * 0.25}px, ${x * 0.25}px)`, offset: 0.72 },
      { transform: 'none' },
    ],
    { duration: 240 + 260 * power, easing: 'ease-out' },
  );
}
export const quake = (power = 0.5, dx = 0, dy = 1) => shake($('.table-screen'), power, dx, dy);

/** Golpe seco: la mesa se congela un instante (60–80 ms) antes de que todo salte. */
export async function hitstop(power = 0.5): Promise<void> {
  if (settings.calm) return;
  const el = $('.table-screen');
  el?.classList.add('hitstop');
  await real(60 + 20 * Math.max(0, Math.min(1, power)));
  el?.classList.remove('hitstop');
}

/** Mueve un elemento de un rectángulo a otro y lo retira (o lo deja donde `keep` diga). */
export function fly(el: HTMLElement, from: DOMRect, to: DOMRect, delay: number, opts: { scale?: number; remove?: boolean } = {}): Promise<void> {
  el.classList.remove('sel', 'deal', 'hint');
  el.classList.add('fly');
  el.style.cssText = `left:${from.left}px;top:${from.top}px;--w:${from.width}px;`;
  document.body.appendChild(el);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const spin = settings.calm ? 0 : (Math.random() - 0.5) * 50;
  const scale = opts.scale ?? 0.8;
  const anim = el.animate(
    [
      { transform: 'none' },
      { transform: `translate(${dx * 0.1}px, ${dy * 0.1 - 40}px) rotate(${-spin / 3}deg) scale(1.12)`, offset: 0.3 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(${scale})` },
    ],
    { duration: 420 * speed(), delay: delay * speed(), easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)', fill: 'forwards' },
  );
  // El temporizador garantiza que la partida avance aunque la pestaña esté en segundo plano
  // (los navegadores pausan las animaciones de pestañas ocultas).
  const total = (420 + delay) * speed() + 60;
  return Promise.race([anim.finished.catch(() => undefined), real(total)]).then(() => {
    if (opts.remove !== false) el.remove();
  });
}

/** Salto breve (un 12 %) de lo que acaba de activarse. */
export function pop(el: Element | null): void {
  if (!el) return;
  restart(el, 'pop');
}

/**
 * Monedas grabadas (coinPieces) que saltan de un punto y caen en arco sobre el contador de oro: en la mesa
 * al cobrar, y en La Taberna al comprar (de la bolsa al Tratante) y al vender (del Tratante a la bolsa).
 * Acepta elementos o selectores y mide en el fotograma siguiente (la Taberna se acaba de volver a pintar).
 * Con «Reducir movimiento» no vuela nada: solo suena.
 */
export function coins(from: Element | string | null, to: Element | string | null, n: number): void {
  if (settings.calm || !from || !to) return;
  requestAnimationFrame(() => {
    const pick = (x: Element | string) => (typeof x === 'string' ? document.querySelector(x) : x);
    const fa = pick(from);
    const fb = pick(to);
    if (!fa?.isConnected || !fb?.isConnected) return;
    const a = fa.getBoundingClientRect();
    const b = fb.getBoundingClientRect();
    const [ax, ay] = [a.left + a.width / 2, a.top + a.height / 2];
    const dx = b.left + b.width / 2 - ax;
    const dy = b.top + b.height / 2 - ay;
    const k = speed();
    const total = Math.min(10, Math.max(1, n));
    for (let i = 0; i < total; i++) {
      let c = coinFree.pop();
      if (!c) {
        [c] = coinPieces(1);
        made++;
      }
      c.style.setProperty('--x', `${ax.toFixed(1)}px`);
      c.style.setProperty('--y', `${ay.toFixed(1)}px`);
      c.style.setProperty('--r', `${Math.round((Math.random() - 0.5) * 70)}deg`);
      document.body.appendChild(c);
      const side = (Math.random() - 0.5) * 110;
      const up = 50 + Math.random() * 60;
      const dur = 640 * k;
      const delay = i * 55 * k;
      c.animate(
        [
          { transform: 'scale(0.4)', opacity: 0 },
          { transform: `translate(${side.toFixed(1)}px, ${(-up).toFixed(1)}px) rotate(${Math.round(side * 2)}deg) scale(1)`, opacity: 1, offset: 0.32 },
          { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${Math.round(side * 4)}deg) scale(0.62)`, opacity: 1, offset: 0.9 },
          { transform: `translate(${dx.toFixed(1)}px, ${(dy - 6).toFixed(1)}px) rotate(${Math.round(side * 4)}deg) scale(0.7)`, opacity: 0 },
        ],
        { duration: dur, delay, easing: 'cubic-bezier(0.3, 0, 0.6, 1)', fill: 'both' },
      );
      after(dur + delay, () => release(c, coinFree));
    }
  });
}

// ───────────── sello y acabado en la cuenta ─────────────
/**
 * Un paso de sello o de acabado del recibo (enganche de una línea en la mesa, case 'step'). Sello: el lacre
 * caliente (waxStamp) cae sobre la carta, de 1,4 a 1 con un rebote corto, y se enfría por opacidad. Acabado:
 * la banda de lámina (.ly.foil) cruza la carta una vez. Con «Reducir movimiento», solo fundidos.
 */
export function sealStep(src: string, target: Element | null): void {
  if (src === 'seal') waxOn(target);
  else if (src === 'treat') foilPass(target);
}
function waxOn(card: Element | null): void {
  sfx.seal();
  const seal = card && SEALS.find((x) => card.classList.contains(`z-${x}`));
  if (!card || !seal) return;
  const pool = (waxFree[seal] ??= []);
  let w = pool.pop();
  if (!w) {
    w = waxStamp(seal);
    made++;
  }
  const k = speed();
  w.classList.add('caliente');
  card.appendChild(w);
  if (settings.calm) w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140 });
  else
    w.animate(
      [
        { transform: 'scale(1.4) rotate(-8deg)', opacity: 0 },
        { transform: 'scale(0.92) rotate(1deg)', opacity: 1, offset: 0.5 },
        { transform: 'scale(1.04)', offset: 0.75 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 300 * k, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' },
    );
  const stamp = w;
  window.setTimeout(() => stamp.classList.remove('caliente'), 380 * k); // se enfría (opacity, juice.css)
  after(1100 * k, () => release(stamp, pool));
}
function foilPass(card: Element | null): void {
  const band = card?.querySelector<HTMLElement>('.foil-band');
  if (!band) return;
  sfx.foil();
  if (settings.calm) return;
  band.animate(
    [
      { transform: 'translateX(-160%) rotate(20deg)', opacity: 0 },
      { opacity: 0.95, offset: 0.25 },
      { opacity: 0.95, offset: 0.7 },
      { transform: 'translateX(260%) rotate(20deg)', opacity: 0 },
    ],
    { duration: 520 * speed(), easing: 'cubic-bezier(0.4, 0, 0.3, 1)' },
  );
}

/** Un sello de tinta que cae sobre un elemento (ABATIDO, CUMPLIDO, VENDIDO…). */
export function stampOn(host: HTMLElement | null, text: string, cls = ''): void {
  if (!host) return;
  const s = document.createElement('div');
  s.className = `inkstamp ${cls}`;
  s.textContent = text;
  host.appendChild(s);
}

/**
 * Guardia abatido: marca el trono con `.banner-torn` mientras dura la caída (~0,9 s), para que el
 * grabado (arte-ui) anime el estandarte rasgado con transform y opacity. El sonido (estandarte que cae)
 * ya lo pone sfx.crash en la mesa. Con «Reducir movimiento» no marca nada.
 */
export function guardFall(tower: HTMLElement | null, clean?: boolean, batch?: object): void {
  if (clean !== undefined) countChain(tower, clean, batch);
  if (!tower || settings.calm) return;
  restart(tower, 'banner-torn');
  setTimeout(() => tower.classList.remove('banner-torn'), 900 * Math.max(0.5, speed()) + 100);
}

/**
 * Trono caído: la corona se parte en dos mitades (`.crown-split`, el grabado de arte-ui) y, al asentarse,
 * estalla en sus diez esquirlas (crownShards), que saltan hacia fuera y caen girando. Todo en 1,1 s a 1× (con
 * margen bajo el tope de 1,2 s aunque el fotograma llegue tarde), y a 2× y 4× en proporción. Suena (metal
 * y piedra). Con «Reducir movimiento» suena y no se mueve nada.
 */
export const THRONE_MS = { split: 380, shards: 720 };
export function throneFall(tower: HTMLElement | null): void {
  sfx.crownBreak();
  if (!tower || settings.calm) return;
  const k = speed();
  const halves = [...tower.querySelectorAll<SVGElement>('.rubble .crn-l, .rubble .crn-r')];
  // las mitades llegan en lo que dura su tiempo, a la velocidad elegida (el grabado dura 1 s a 1×)
  halves.forEach((h) => (h.style.animationDuration = `${Math.round(THRONE_MS.split * k)}ms`));
  restart(tower, 'crown-split');
  window.setTimeout(() => shatter(tower, halves, THRONE_MS.shards * k), THRONE_MS.split * k);
  after((THRONE_MS.split + THRONE_MS.shards) * k, () => tower.classList.remove('crown-split'));
}
function shatter(tower: HTMLElement, halves: SVGElement[], dur: number): void {
  if (!tower.isConnected) return;
  // la caja de la corona: donde quedaron las dos mitades (o, sin escombro, la cabecera del trono)
  const rs = halves.filter((h) => h.isConnected).map((h) => h.getBoundingClientRect()).filter((r) => r.width > 0);
  const head = tower.querySelector('.rubble, .floor-slot, .tower-tag')?.getBoundingClientRect() ?? tower.getBoundingClientRect();
  const left = rs.length ? Math.min(...rs.map((r) => r.left)) : head.left + head.width * 0.2;
  const right = rs.length ? Math.max(...rs.map((r) => r.right)) : head.right - head.width * 0.2;
  const top = rs.length ? Math.min(...rs.map((r) => r.top)) : head.top;
  const suit = (tower.dataset.suit ?? 'S') as Suit;
  let host = shardFree.pop();
  if (host) crownShards(suit, [...host.querySelectorAll<SVGSVGElement>('.esquirla')]);
  else {
    host = crownShardsHost(suit);
    made += host.children.length;
  }
  host.dataset.suit = suit;
  const w = Math.max(24, right - left);
  host.style.cssText = `position:fixed;z-index:56;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${w.toFixed(1)}px;`;
  document.body.appendChild(host);
  halves.forEach((h) => (h.style.opacity = '0'));
  host.querySelectorAll<SVGElement>('.esquirla').forEach((sh, i) => {
    const d = w * (0.45 + (i % 3) * 0.16);
    const vx = v(sh, '--vx');
    const vy = v(sh, '--vy');
    const g = v(sh, '--giro');
    sh.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: `translate(${(vx * d * 0.55).toFixed(1)}px, ${(vy * d * 0.55 - w * 0.14).toFixed(1)}px) rotate(${(g * 0.4).toFixed(1)}deg)`, opacity: 1, offset: 0.32 },
        { transform: `translate(${(vx * d).toFixed(1)}px, ${(vy * d + w * 0.85).toFixed(1)}px) rotate(${g}deg)`, opacity: 0 },
      ],
      { duration: dur * (0.85 + (i % 4) * 0.05), easing: 'cubic-bezier(0.25, 0.6, 0.55, 1)', fill: 'forwards' },
    );
  });
  const used = host;
  after(dur, () => release(used, shardFree));
}

// ───────────── la cadena de Golpes exactos ─────────────
// El motor la topa en 4 (view.chain): aquí se cuenta entera, con los floorDown y su `clean`. Sube una vez por
// golpe con algún guardia abatido en exacto y vuelve a 0 con un golpe que abate sin exacto. Empieza de cero
// en cada mesa nueva.
let chain = 0;
let chainBatch: object | null = null;
let chainTable: Element | null = null;
function countChain(tower: HTMLElement | null, clean: boolean, batch?: object): void {
  const table = tower?.closest('.table-screen') ?? null;
  if (table !== chainTable) {
    chainTable = table;
    chain = 0;
    chainBatch = null;
  }
  if (batch && batch === chainBatch) return; // un golpe cuenta una vez, aunque abata a varios
  if (!clean && batch && Array.isArray(batch) && batch.some((b) => b?.e === 'floorDown' && b.clean)) return;
  chainBatch = batch ?? null;
  chain = clean ? chain + 1 : 0;
}
/** Cuántos Golpes exactos seguidos lleva la mesa (para la campana: sfx.bell(exactChain())). */
export const exactChain = () => chain;

/**
 * Insignia flotante cuando una reliquia se cobra: lee el campo `proc` del paso del golpe.
 * «+12 Daño · <reliquia>» junto a la cuenta, «−12 · <reliquia>» sobre el trono que recibe y
 * «+2 Vida · <reliquia>» sobre tu Vida (#bunker). ~1,2 s, solo transform y opacity, y su sonido.
 * La mesa la llama en cada paso (`case 'step'` de animate); sin `proc` no hace nada.
 */
export function procBadge(ev: GameEvent): void {
  if (ev.e !== 'step' || !ev.proc) return;
  const { what, n, tower } = ev.proc;
  const who = ev.label.includes(': ') ? ev.label.slice(0, ev.label.indexOf(': ')) : ev.label;
  const [num, word, at] =
    what === 'fuerza' ? [`+${n}`, 'Daño', $('#score .calc') ?? $('#score')]
    : what === 'carga' ? [`+${n}`, 'Daño guardado', $('#score .calc') ?? $('#score')]
    : what === 'repara' ? [`+${n}`, 'Vida', $('#bunker')]
    : [`−${n}`, '', (tower && $(`.tower[data-suit="${tower}"] .floor-slot`)) || $('#score')];
  if (!at) return;
  const r = at.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `proc-badge ${what}`;
  el.innerHTML = `<b>${num}</b> <span>${word ? `${word} · ` : '· '}${who}</span>`;
  // junto a la cuenta va a su derecha; sobre el trono y sobre tu Vida, centrada encima
  const x = what === 'fuerza' || what === 'carga' ? r.right + 90 : r.left + r.width / 2;
  el.style.setProperty('--x', `${Math.round(Math.max(90, Math.min(innerWidth - 90, x)))}px`);
  el.style.setProperty('--y', `${Math.round(Math.max(40, r.top + (what === 'dano' ? r.height * 0.3 : 0)))}px`);
  el.style.animationDuration = `${Math.round(1200 * Math.max(0.5, speed()))}ms`;
  document.body.appendChild(el);
  sfx.proc(what);
  setTimeout(() => el.remove(), 1250);
}
// la prueba de humo dispara insignias a mano (con ?qa): no depende de que el azar traiga la reliquia
// la reserva se calienta en cuanto la página pinta su primer fotograma
requestAnimationFrame(() => requestAnimationFrame(warmUp));
if (new URLSearchParams(location.search).has('qa'))
  Object.assign(window, {
    __qaProc: procBadge,
    // V8 · la prueba de humo y qa:fps disparan los efectos a mano, sin depender del azar de la partida
    __qaFx: { tear, throneFall, coins, sealStep, burst, hitstop, quake, guardFall, exactChain, made: () => made, settings },
  });

/**
 * V7 · Secreto de la cripta: las opciones se dan vuelta de una en una (solo transform y opacity, con su
 * golpe de naipe cada una) y, jugando con teclado o mando, el foco cae en la primera que se puede elegir.
 * Enganche de una línea al final de eventScreen (runscreens.ts).
 */
export function revealOptions(root: HTMLElement | null): void {
  if (!root) return;
  const opts = [...root.querySelectorAll<HTMLButtonElement>('.opt')];
  const step = 110 / settings.speed;
  opts.forEach((el, i) => {
    el.style.setProperty('--rv', `${Math.round(i * step)}ms`);
    el.classList.add('revela');
    window.setTimeout(() => sfx.reveal(i), i * step);
  });
  const first = opts.find((o) => !o.disabled);
  if (first && inputMode() !== 'pointer') first.focus({ preventScroll: true });
}