// Efectos de la mesa: tiempos, vuelos de cartas, golpes, temblores, astillas y rótulos.
// Todo respeta dos ajustes: la velocidad (1×, 2×, 4×) y «Reducir movimiento».
import type { GameEvent } from '../rules/engine';
import { sfx } from './audio';
import { $, S, settings } from './core';
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

/** Escombros que saltan desde un punto de la pantalla, con un empuje opcional (dx, dy). */
export function burst(x: number, y: number, n = 16, push: [number, number] = [0, 0]): void {
  if (settings.calm) return;
  const colors = ['var(--ink)', 'var(--red)', '#f1ebdc', 'var(--hazard)'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'debris';
    const size = 5 + Math.random() * 12;
    d.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size * (0.5 + Math.random())}px;background:${colors[i % colors.length]}`;
    document.body.appendChild(d);
    const ang = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 150;
    const dx = Math.cos(ang) * dist + push[0];
    const dy = Math.sin(ang) * dist - 60 + push[1];
    const spin = (Math.random() - 0.5) * 720;
    d.animate(
      [
        { transform: 'translate(-50%,-50%)' },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) rotate(${spin * 0.6}deg)`, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy + 170}px) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(0.2, 0.6, 0.6, 1)', fill: 'forwards' },
    );
    setTimeout(() => d.remove(), 1050);
  }
}

/** La figura se rasga por su costura diagonal y las dos mitades caen. */
export function tear(card: HTMLElement): void {
  const r = card.getBoundingClientRect();
  card.style.visibility = 'hidden';
  if (settings.calm) return;
  const half = (clip: string, frames: Keyframe[]) => {
    const c = card.cloneNode(true) as HTMLElement;
    c.classList.remove('deal', 'attack');
    c.classList.add('fly');
    c.style.cssText = `left:${r.left}px;top:${r.top}px;--w:${r.width}px;clip-path:${clip};`;
    document.body.appendChild(c);
    c.animate(frames, { duration: 820, easing: 'cubic-bezier(0.5, 0, 0.85, 0.4)', fill: 'forwards' });
    setTimeout(() => c.remove(), 840);
  };
  half('polygon(-10% -10%, 110% -10%, 110% 43.4%, -10% 56.6%)', [{ transform: 'none' }, { transform: 'translate(-16px,-20px) rotate(-6deg)', offset: 0.22 }, { transform: 'translate(-80px,180px) rotate(-40deg)', opacity: 0 }]);
  half('polygon(-10% 56.6%, 110% 43.4%, 110% 110%, -10% 110%)', [{ transform: 'none' }, { transform: 'translate(16px,16px) rotate(5deg)', offset: 0.22 }, { transform: 'translate(70px,210px) rotate(32deg)', opacity: 0 }]);
  burst(r.left + r.width / 2, r.top + r.height / 2, 22);
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

/** Golpe seco: la mesa se congela un instante (45–65 ms) antes de que todo salte. */
export async function hitstop(power = 0.5): Promise<void> {
  if (settings.calm) return;
  const el = $('.table-screen');
  el?.classList.add('hitstop');
  await real(45 + 20 * Math.max(0, Math.min(1, power)));
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

/** Monedas que saltan de un punto hacia el contador de oro. */
export function coins(from: Element | null, to: Element | null, n: number): void {
  if (!from || !to || settings.calm) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  for (let i = 0; i < Math.min(10, Math.max(1, n)); i++) {
    const c = document.createElement('div');
    c.className = 'coin';
    c.style.left = `${a.left + a.width / 2}px`;
    c.style.top = `${a.top + a.height / 2}px`;
    document.body.appendChild(c);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const side = (Math.random() - 0.5) * 120;
    c.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${side}px), calc(-50% - ${40 + Math.random() * 50}px)) scale(1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 0.9 },
      ],
      { duration: 620, delay: i * 55, easing: 'cubic-bezier(0.3, 0, 0.6, 1)', fill: 'both' },
    );
    setTimeout(() => c.remove(), 700 + i * 55);
  }
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
export function guardFall(tower: HTMLElement | null): void {
  if (!tower || settings.calm) return;
  restart(tower, 'banner-torn');
  setTimeout(() => tower.classList.remove('banner-torn'), 900 * Math.max(0.5, speed()) + 100);
}

/**
 * Trono caído: la corona que se parte. Suena (metal y piedra) y marca el trono con `.crown-split`
 * (~1,2 s) para la animación de arte-ui. Con «Reducir movimiento» suena pero no marca.
 */
export function throneFall(tower: HTMLElement | null): void {
  sfx.crownBreak();
  if (!tower || settings.calm) return;
  restart(tower, 'crown-split');
  setTimeout(() => tower.classList.remove('crown-split'), 1200 * Math.max(0.5, speed()) + 100);
}

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
if (new URLSearchParams(location.search).has('qa')) Object.assign(window, { __qaProc: procBadge });

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