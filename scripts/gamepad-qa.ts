// Mando virtual para la prueba de humo. No hace falta un mando físico: se inyecta en la página un
// mando estándar del W3C (17 botones, 4 ejes) que sustituye a navigator.getGamepads(), y la prueba
// lo maneja con press / hold / stick. El juego lo lee por su camino normal (nav.ts).
//
// Con él se juega una campaña de principio a fin sin tocar teclado ni ratón: portada → preparación
// → mapa → un asalto entero (el bot de referencia decide la jugada; el mando la ejecuta) → Botín →
// La Taberna, donde se reordenan las reliquias (A sobre A, y LB / RB con el foco en la
// reliquia) y se sella una carta en la Mesa de lacre, y un Secreto de la cripta. Por el camino abre y
// cierra cada ventana (mazo, ajustes, reglas, Lupa) para comprobar que ninguna atrapa el foco, descarta
// con L3, pide pantalla completa con R3, mide que el foco responda en menos de 50 ms (también mientras
// la mesa anima, por mediana de cinco pulsaciones) y que el marco de latón se vea, barre la mesa (desde
// cada cosa enfocable se llega a cada trono, y de cada trono a la mano, en seis pulsaciones como mucho)
// y cierra un susurro con «No mostrar más». Al final, en una mesa con seis reliquias, LB / RB las
// reordenan en pleno combate y la cuenta del golpe sigue el orden nuevo.
import type { Browser, Page } from 'playwright';
import { BRAND } from '../src/shared/brand';
import { NAME_SHIM } from './web';

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const;

/** Se ejecuta en la página antes que el juego. Va como texto para que nada lo transforme por el camino. */
export const VIRTUAL_GAMEPAD = `(() => {
  const button = (down) => ({ pressed: down, touched: down, value: down ? 1 : 0 });
  const pad = {
    id: 'QA Virtual Gamepad (STANDARD GAMEPAD)', index: 0, connected: false, mapping: 'standard', timestamp: 0,
    buttons: Array.from({ length: 17 }, () => button(false)), axes: [0, 0, 0, 0],
    vibrationActuator: { playEffect: () => Promise.resolve('complete') },
  };
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const frames = (n) => new Promise((done) => { const step = () => (n-- > 0 ? requestAnimationFrame(step) : done()); step(); });
  const set = (i, down) => { pad.buttons[i] = button(down); pad.timestamp = performance.now(); };
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => (pad.connected ? [pad, null, null, null] : [null, null, null, null]) });
  window.__qaGamepad = {
    pad,
    connect() {
      pad.connected = true;
      const ev = new Event('gamepadconnected');
      Object.defineProperty(ev, 'gamepad', { value: pad });
      window.dispatchEvent(ev);
    },
    async press(i, ms = 60) { set(i, true); await wait(ms); await frames(2); set(i, false); await frames(2); },
    async hold(i, ms) { set(i, true); await wait(ms); set(i, false); await frames(2); },
    async stick(x, y, ms = 90) { pad.axes[0] = x; pad.axes[1] = y; pad.timestamp = performance.now(); await wait(ms); await frames(2); pad.axes[0] = 0; pad.axes[1] = 0; await frames(2); },
  };
})();`;

type Check = (ok: unknown, what: string) => void;
interface QaWindow {
  __qa: {
    go(state: string): Promise<boolean>;
    seed(text: string): void;
    bot(): { type: string; cards?: string[]; card?: string; target?: string } | null;
    run(): { phase: string; stage: number; gold: number; tools: string[]; marks: number; pending: string | null; shop: string[] } | null;
    boost(): boolean;
  };
  __qaGamepad: { pad: { buttons: { pressed: boolean; touched: boolean; value: number }[] }; connect(): void; press(i: number, ms?: number): Promise<void>; hold(i: number, ms: number): Promise<void>; stick(x: number, y: number, ms?: number): Promise<void> };
  __whispers: { force(on: boolean | null): void; seen(): string[]; off(): boolean; reset(): void };
  __qaSounds: string[];
  __fs: number;
}

const press = (page: Page, i: number, ms?: number) => page.evaluate(([b, t]) => (window as unknown as QaWindow).__qaGamepad.press(b as number, t), [i, ms] as const);
const hold = (page: Page, i: number, ms: number) => page.evaluate(([b, t]) => (window as unknown as QaWindow).__qaGamepad.hold(b, t), [i, ms] as const);
const count = (page: Page, sel: string) => page.locator(sel).count();
const run = (page: Page) => page.evaluate(() => (window as unknown as QaWindow).__qa.run());
const inputMode = (page: Page) => page.evaluate(() => document.documentElement.dataset.input);
const active = (page: Page, sel: string) => page.evaluate((s) => !!document.activeElement?.matches(s), sel);

/**
 * Pulsa un botón del mando y mide cuánto tarda el foco en moverse (ms). Lo hace dentro de la página,
 * fotograma a fotograma, sin pasar por Playwright: es la latencia que siente quien juega.
 */
const latency = (page: Page, button: number) =>
  page.evaluate(async (b) => {
    const g = (window as unknown as QaWindow).__qaGamepad;
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const from = document.activeElement;
    const t0 = performance.now();
    g.pad.buttons[b] = { pressed: true, touched: true, value: 1 };
    while (document.activeElement === from && performance.now() - t0 < 600) await frame();
    const dt = performance.now() - t0;
    g.pad.buttons[b] = { pressed: false, touched: false, value: 0 };
    await frame();
    await frame();
    return document.activeElement === from ? -1 : dt;
  }, button);

/** El foco está encendido, es un marco de papel de 4 px con filetes de tinta (≥ 6 px) y abraza lo enfocado. */
const ringOk = (page: Page) =>
  page.evaluate(() => {
    const ring = document.querySelector<HTMLElement>('.focus-ring.on');
    const a = document.activeElement;
    if (!ring || !a || a === document.body) return false;
    const r = ring.getBoundingClientRect();
    const t = a.getBoundingClientRect();
    const frame = getComputedStyle(ring.querySelector('i')!);
    const spreads = [...frame.boxShadow.matchAll(/0px 0px 0px (\d+(?:\.\d+)?)px/g)].reduce((n, m) => n + parseFloat(m[1]), 0);
    return parseFloat(frame.borderTopWidth) >= 4 && parseFloat(frame.borderTopWidth) + spreads >= 6 && Math.abs(r.left + 6 - t.left) < 3 && Math.abs(r.top + 6 - t.top) < 3 && Math.abs(r.width - 12 - t.width) < 3;
  });
const ms = (n: number) => (n < 0 ? 'no se movió' : `${Math.round(n)} ms`);

/**
 * Lleva el foco hasta un elemento usando solo la cruceta (o la palanca): mira dónde queda el destino
 * respecto a lo enfocado y pulsa hacia allí, como haría una persona (a lo voraz). Devuelve cuántas
 * pulsaciones hicieron falta (−1 si no llega en `limit`) y el camino, para el diagnóstico.
 */
function walk(page: Page, selector: string, stick = false, limit = 60, ms = 0): Promise<{ steps: number; path: string[] }> {
  return page.evaluate(
    async ([sel, useStick, max, hold]) => {
      const pad = (window as unknown as QaWindow).__qaGamepad;
      const center = (el: Element) => {
        const r = el.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height];
      };
      const name = (el: Element | null) => {
        const h = el as HTMLElement | null;
        if (!h || h === document.body) return '∅';
        return `${h.id ? `#${h.id}` : `.${h.classList[0] ?? h.tagName.toLowerCase()}`}${h.dataset.suit ? `[${h.dataset.suit}]` : h.dataset.id ? `[${h.dataset.id}]` : ''}`;
      };
      const path: string[] = [name(document.activeElement)];
      const go = async (dir: 'U' | 'D' | 'L' | 'R') => {
        if (useStick) await pad.stick(dir === 'R' ? 0.9 : dir === 'L' ? -0.9 : 0, dir === 'D' ? 0.9 : dir === 'U' ? -0.9 : 0, hold || undefined);
        else await pad.press({ U: 12, D: 13, L: 14, R: 15 }[dir], hold || undefined);
        path.push(`${dir}→${name(document.activeElement)}`);
      };
      let stuck = 0;
      for (let i = 0; i <= max; i++) {
        const target = document.querySelector(sel);
        if (!target) return { steps: -1, path: [...path, `(no existe ${sel})`] };
        const from = document.activeElement;
        if (from === target) return { steps: i, path };
        if (i === max) break;
        if (!from || from === document.body || !document.body.contains(from)) {
          await go('D'); // el primer toque enciende el foco
          continue;
        }
        const [ax, ay, , ah] = center(from);
        const [tx, ty, , th] = center(target);
        const dx = tx - ax;
        const dy = ty - ay;
        const sameRow = Math.abs(dy) < Math.max(ah, th) * 0.5;
        let dir: 'U' | 'D' | 'L' | 'R' = sameRow ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
        // si el último intento no movió el foco, se prueba por el otro eje
        if (stuck % 2 === 1) dir = dir === 'U' || dir === 'D' ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
        await go(dir);
        stuck = document.activeElement === from ? stuck + 1 : 0;
        if (stuck > 6) break;
      }
      return { steps: -1, path };
    },
    [selector, stick, limit, ms] as const,
  );
}
const focusOn = async (page: Page, selector: string, stick = false) => (await walk(page, selector, stick)).steps >= 0;

/**
 * Lo enfocable de la mesa, cada cosa con un selector que sobrevive a los redibujados (la cuenta y las
 * cartas se vuelven a pintar al elegir). `only` limita a lo que encaje con ese selector.
 */
const tableFocusables = (page: Page, only = '') =>
  page.evaluate((only) => {
    const app = document.getElementById('app')!;
    const els = [...app.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, [tabindex="0"]')].filter((el) => {
      if (el.closest('[hidden]') || (only && !el.matches(only))) return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    });
    return els.map((el) => {
      if (el.id) return `#${CSS.escape(el.id)}`;
      if (el.classList.contains('tower')) return `.tower[data-suit="${el.dataset.suit}"]`;
      if (el.classList.contains('belt-slot')) return `#beltbar .belt-slot[data-slot="${el.dataset.slot}"]`;
      if (el.dataset.id) return `.handrow .card[data-id="${CSS.escape(el.dataset.id)}"]`;
      return `#app .${CSS.escape(el.classList[0])}`;
    });
  }, only);

/** Enfoca un elemento como si se hubiera llegado con el mando (sin pulsar nada). */
const focusDirect = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const el = document.querySelector<HTMLElement>(s);
    el?.focus({ preventScroll: true });
    return !!el && document.activeElement === el;
  }, sel);

/** Espera a que la mesa termine de animar y vuelva a dejar jugar (o a que la obra acabe). */
const settled = (page: Page) => page.waitForFunction(() => !document.querySelector('.table-screen') || !document.querySelector('.handrow.locked') || !!document.querySelector('.end'), null, { timeout: 40_000 });

/** El foco no puede quedar fuera de la capa de arriba (ventana abierta o pantalla). */
const focusIsSane = (page: Page) =>
  page.evaluate(() => {
    const layers = [...document.querySelectorAll('.modal, .end, .lupa')];
    const top = layers[layers.length - 1] ?? document.getElementById('app');
    const a = document.activeElement;
    return !a || a === document.body || !!top?.contains(a);
  });

/**
 * LB / RB sobre las reliquias en combate. El primer asalto de la campaña no tiene dos, así que se monta
 * la mesa de QA (seis reliquias, el orden se puede cambiar) y se juega con el mando: con el foco en una
 * reliquia, RB la mueve a la derecha y LB a la izquierda, el foco y el marco viajan con ella, el orden
 * nuevo es el que usa la cuenta del golpe y en los extremos solo suena el tope.
 */
export async function combatRelics(page: Page, check: Check): Promise<void> {
  const tools = () => run(page).then((r) => r?.tools ?? []);
  // lo que ha sonado desde una marca (la lista de sonidos tiene tope y se recorta por delante: se marca, no se cuenta)
  const sounds = () => page.evaluate(() => (window as unknown as QaWindow).__qaSounds.push('·marca'));
  const heardSince = (_: number) => page.evaluate(() => { const h = (window as unknown as QaWindow).__qaSounds; return h.slice(h.lastIndexOf('·marca') + 1); });
  const calc = () => page.evaluate(() => {
    const c = document.querySelector('#score .calc');
    return c ? [...c.querySelectorAll('.f, .r, .t')].map((e) => e.textContent?.trim()).join(' · ') : '';
  });
  const slot = (i: number, id?: string) => `#beltbar .belt-slot[data-slot="${i}"]${id ? `[data-id="${id}"]` : ''}`;
  // como haría una persona: por la mano hasta la carta que queda debajo, y de ahí hacia arriba
  const reach = async (sel: string) => {
    const under = await page.evaluate((s) => {
      const t = document.querySelector(s)?.getBoundingClientRect();
      if (!t) return null;
      const x = t.left + t.width / 2;
      const cards = [...document.querySelectorAll<HTMLElement>('#hand .card')];
      cards.sort((a, b) => Math.abs(a.getBoundingClientRect().left + a.getBoundingClientRect().width / 2 - x) - Math.abs(b.getBoundingClientRect().left + b.getBoundingClientRect().width / 2 - x));
      return cards[0]?.dataset.id ?? null;
    }, sel);
    if (under) await walk(page, `#hand .card[data-id="${under}"]`);
    const r = await walk(page, sel);
    if (r.steps < 0) console.log(`  · camino a ${sel}: ${r.path.slice(-14).join(' ')}`);
    return r.steps >= 0;
  };
  await page.evaluate(() => (window as unknown as QaWindow).__qa.go('mesa'));
  await page.waitForSelector('.table-screen #beltbar .belt.can-order');
  await settled(page);
  await press(page, BTN.DOWN); // el mando vuelve a ser el dispositivo en uso
  const start = await tools();
  check(start.length >= 3, `la mesa de combate tiene al menos tres reliquias (${start.length})`);

  // un doble par de sietes y dieces: cuatro cartas, así el ×M que pide «4 cartas o más» entra en la cuenta
  await press(page, BTN.B);
  const ids = await page.evaluate(() =>
    [['S', '7'], ['D', '7'], ['H', '10'], ['D', '10']].map(([s, r]) =>
      [...document.querySelectorAll<HTMLElement>(`#hand .card.s-${s}`)].find((c) => c.querySelector('.corner b')?.textContent?.trim() === r)?.dataset.id ?? ''),
  );
  let picked = ids.every(Boolean);
  for (const id of ids) {
    if (!picked || !(await focusOn(page, `#hand .card[data-id="${id}"]`))) { picked = false; break; }
    await press(page, BTN.A);
  }
  const p0 = await calc();
  check(picked && /\d/.test(p0) && !p0.endsWith('?'), `con el mando se eligen cuatro cartas y la cuenta se previsualiza (${p0 || 'sin cuenta'})`);

  // RB y LB sobre la primera reliquia
  check(await reach(slot(0)), 'el foco llega a la primera reliquia de la mesa');
  await press(page, BTN.RB);
  await page.waitForTimeout(250);
  let now = await tools();
  check(now[0] === start[1] && now[1] === start[0] && now.slice(2).join() === start.slice(2).join(), 'en combate, RB mueve la reliquia enfocada un hueco a la derecha');
  check(await active(page, slot(1, start[0])), 'y el foco viaja con ella a su hueco nuevo');
  await page.waitForTimeout(150);
  check(await ringOk(page), 'con el foco abrazándola');
  check((await count(page, '.lupa')) === 0, 'RB sobre una reliquia no abre la lupa');
  await press(page, BTN.LB);
  await page.waitForTimeout(250);
  check((await tools()).join() === start.join() && (await active(page, slot(0, start[0]))), 'LB la devuelve a la izquierda, con el foco');
  check((await count(page, '.deck-modal')) === 0, 'LB sobre una reliquia no abre el mazo');

  // el tope de la izquierda
  let mark = await sounds();
  await press(page, BTN.LB);
  await page.waitForTimeout(200);
  check((await heardSince(mark)).includes('edge') && (await tools()).join() === start.join(), 'en el primer hueco, LB solo da el toque de tope');
  check((await active(page, slot(0, start[0]))) && (await count(page, '.deck-modal, .lupa')) === 0, 'y no mueve el foco ni abre nada');

  // el tope de la derecha
  const last = start.length - 1;
  check(await reach(slot(last)), 'el foco llega a la última reliquia');
  mark = await sounds();
  await press(page, BTN.RB);
  await page.waitForTimeout(200);
  check((await heardSince(mark)).includes('edge') && (await tools()).join() === start.join(), 'en el último hueco, RB solo da el toque de tope');
  check((await active(page, slot(last, start[last]))) && (await count(page, '.deck-modal, .lupa')) === 0, 'y no mueve el foco ni abre la lupa');

  // el orden manda en la cuenta: el ×M de la derecha, llevado a la izquierda, multiplica menos
  const xm = start[last];
  let changed = '';
  for (let i = 0; i < last; i++) {
    await press(page, BTN.LB);
    await page.waitForTimeout(220);
    const c = await calc();
    if (c !== p0) changed = changed || c;
  }
  now = await tools();
  check(now[0] === xm && now.slice(1).join() === start.slice(0, last).join(), `LB repetido lleva la reliquia de la derecha hasta el primer hueco (${now.join(', ')})`);
  check(await active(page, slot(0, xm)), 'y el foco la acompaña todo el camino');
  check(!!changed, `la previsualización del golpe usa el orden nuevo (${p0} → ${changed || 'igual'})`);
  for (let i = 0; i < last; i++) {
    await press(page, BTN.RB);
    await page.waitForTimeout(220);
  }
  check((await tools()).join() === start.join() && (await calc()) === p0, 'RB repetido la devuelve a su sitio y la cuenta vuelve a la de antes');
  await press(page, BTN.B);
}

// ───────────────────────── V7 · partida guiada, sello F1 y voces ─────────────────────────

type How = 'pad' | 'keys' | 'mouse';
/** Lo que tarda en decidir cada jugada alguien que juega por primera vez. */
export const THINK_MS = 1500;
/** Límite de la partida guiada a 1×: desde que aparece la mesa hasta que acaba de animarse el Golpe exacto. */
export const GUIDED_MAX_S = 60;

/**
 * Lleva el foco con las flechas del teclado, a lo voraz y como haría una persona (el mismo criterio que
 * `walk` con la cruceta). Devuelve si llegó.
 */
export async function walkKeys(page: Page, selector: string, limit = 40): Promise<boolean> {
  let stuck = 0;
  for (let i = 0; i <= limit; i++) {
    const r = await page.evaluate(
      ([sel, st]) => {
        const target = document.querySelector(sel);
        if (!target) return { dir: 'x', sig: '' };
        const a = document.activeElement as HTMLElement | null;
        if (a === target) return { dir: 'ok', sig: '' };
        if (!a || a === document.body) return { dir: 'D', sig: '∅' };
        const A = a.getBoundingClientRect();
        const T = target.getBoundingClientRect();
        const dx = T.left + T.width / 2 - (A.left + A.width / 2);
        const dy = T.top + T.height / 2 - (A.top + A.height / 2);
        const sameRow = Math.abs(dy) < Math.max(A.height, T.height) * 0.5;
        let dir = sameRow ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
        if (st % 2 === 1) dir = dir === 'U' || dir === 'D' ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
        return { dir, sig: `${a.id}|${a.dataset.id ?? ''}|${a.dataset.suit ?? ''}|${a.className}|${Math.round(A.left)},${Math.round(A.top)}` };
      },
      [selector, stuck] as const,
    );
    if (r.dir === 'ok') return true;
    if (r.dir === 'x' || i === limit) return false;
    await page.keyboard.press({ U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' }[r.dir]!);
    const now = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return a ? `${a.id}|${a.dataset.id ?? ''}|${a.dataset.suit ?? ''}|${a.className}|${Math.round(a.getBoundingClientRect().left)},${Math.round(a.getBoundingClientRect().top)}` : '∅';
    });
    stuck = now === r.sig ? stuck + 1 : 0;
    if (stuck > 6) return false;
  }
  return false;
}

/** Lleva el foco con el dispositivo que toca (mando o teclado) y pulsa A / Enter. */
async function reachAndChoose(page: Page, how: 'pad' | 'keys', sel: string): Promise<boolean> {
  const ok = how === 'pad' ? await focusOn(page, sel) : await walkKeys(page, sel);
  if (!ok) return false;
  if (how === 'pad') await press(page, BTN.A);
  else await page.keyboard.press('Enter');
  return true;
}

/**
 * La partida guiada entera, desde la portada, con el ratón, el teclado o el mando: espera 1,5 s antes de
 * cada jugada y hace la que pide el foco. Comprueba que no hay ninguna ventana de texto, que cada paso
 * enciende su foco con su línea (y con la indicación del botón, con teclado o mando), que el foco se retira
 * al cumplirse el paso y que todo cabe en ≤ 60 s a 1×. Devuelve los segundos medidos.
 */
export async function guidedRun(page: Page, how: How, check: Check, shot?: (page: Page, name: string) => Promise<unknown>): Promise<number> {
  const { TUTORIAL_STEPS, stepAction } = await import('../src/rules/tutorial');
  const name = { pad: 'mando', keys: 'teclado', mouse: 'ratón' }[how];
  await page.evaluate(() => (window as unknown as QaWindow).__qa.go('portada'));
  await page.waitForSelector('#m-tuto');
  if (how === 'mouse') await page.locator('#m-tuto').click();
  else check(await reachAndChoose(page, how, '#m-tuto'), `[${name}] el foco llega a «Partida guiada» en la portada y la abre`);
  await page.waitForSelector('.table-screen');
  // se mide a 1× (otra parte de la prueba pudo dejar la mesa a 4×); el clic va por programa para no cambiar de dispositivo
  for (let i = 0; i < 3 && (await page.evaluate(() => document.documentElement.dataset.speed)) !== '1'; i++) await page.evaluate(() => document.getElementById('btn-speed')?.click());
  const t0 = Date.now();
  const problems: string[] = [];
  let lit = 0;
  let retreated = 0;
  let hinted = 0;
  for (const [i, step] of TUTORIAL_STEPS.entries()) {
    const on = await page
      .waitForFunction(() => document.documentElement.dataset.guia === '1' && !document.querySelector('.handrow.locked') && !!document.querySelector('#guia:not([hidden]) .guia-placa'), null, { timeout: 20_000 })
      .then(() => true, () => false);
    if (!on) {
      problems.push(`paso ${i + 1}: el foco no se enciende`);
      break;
    }
    const seen = await page.evaluate(() => ({
      placa: document.querySelector('#guia .guia-placa')?.textContent ?? '',
      kh: [...document.querySelectorAll('#guia .guia-placa .kh')].some((k) => getComputedStyle(k).display !== 'none'),
      windows: document.querySelectorAll('.modal, #coach:not([hidden])').length,
    }));
    const want = step.line.replace(/<[^>]+>/g, '');
    if (seen.placa.includes(want)) lit++;
    else problems.push(`paso ${i + 1}: la placa dice «${seen.placa}»`);
    if (seen.windows) problems.push(`paso ${i + 1}: hay una ventana de texto`);
    if (seen.kh) hinted++;
    await page.waitForTimeout(THINK_MS);
    // (la captura va después de pensar: si acaso, alarga la medida)
    if ((i === 0 || i === 2) && shot) await shot(page, `guiada-${how}-${step.id}`);
    const a = stepAction(step)!;
    const cards = a.type === 'stash' || a.type === 'joker' ? [a.card] : a.type === 'attack' ? a.cards : [];
    const card = (id: string) => `.handrow .card[data-id="${id}"]`;
    let done = true;
    if (how === 'mouse') {
      for (const id of cards) await page.locator(card(id)).click();
      if (a.type === 'stash') await page.locator('#btn-stash').click();
      else if ('target' in a) await page.locator(`.tower[data-suit="${a.target}"]`).click();
    } else if (a.type === 'stash') {
      // La Manga: Y sobre la carta enfocada, sin elegirla antes
      done = how === 'pad' ? await focusOn(page, card(a.card)) : await walkKeys(page, card(a.card));
      if (done) await (how === 'pad' ? press(page, BTN.Y) : page.keyboard.press('y'));
    } else {
      for (const id of cards) done &&= await reachAndChoose(page, how, card(id));
      if (done) await (how === 'pad' ? press(page, BTN.X) : page.keyboard.press('Space'));
    }
    if (!done) {
      problems.push(`paso ${i + 1}: el ${name} no llegó a las cartas del paso`);
      break;
    }
    // al cumplirse el paso, el foco se retira enseguida (vuelve sobre el siguiente cuando la mesa deja jugar)
    const gone = await page.waitForFunction(() => !document.documentElement.dataset.guia, null, { timeout: 1500 }).then(() => true, () => false);
    if (gone) retreated++;
    else problems.push(`paso ${i + 1}: el foco no se retira al cumplirse`);
  }
  const ended = await page.waitForSelector('.end.won', { timeout: 30_000 }).then(() => true, () => false);
  const secs = (Date.now() - t0) / 1000;
  for (const p of problems) console.log(`  · [${name}] ${p}`);
  const n = TUTORIAL_STEPS.length;
  check(lit === n, `[${name}] cada paso enciende su foco con su línea (${lit}/${n}) y sin ninguna ventana de texto`);
  if (how !== 'mouse') check(hinted === n, `[${name}] la línea de cada paso enseña el botón del ${name} (${hinted}/${n})`);
  check(retreated === n, `[${name}] el foco se retira al cumplir cada paso (${retreated}/${n})`);
  check(ended, `[${name}] la partida guiada se completa entera y se gana`);
  check(ended && secs <= GUIDED_MAX_S, `[${name}] la partida guiada dura ≤ ${GUIDED_MAX_S} s a 1× pensando 1,5 s cada jugada (${secs.toFixed(1)} s)`);
  console.log(`  partida guiada con ${name}: ${secs.toFixed(1)} s`);
  return secs;
}

/**
 * F1 con teclado o mando: al apuntar un trono (con el foco encima), las cartas de su palo en la mano
 * enseñan el sello de hierro «×0» y ninguna otra; al pasar al trono de al lado, el sello se va con él.
 */
export async function sealCheck(page: Page, how: 'pad' | 'keys', check: Check): Promise<void> {
  const name = how === 'pad' ? 'mando' : 'teclado';
  await page.evaluate(() => (window as unknown as QaWindow).__qa.go('guia-palo'));
  await page.waitForSelector('.table-screen #hand .card');
  if (how === 'pad') await press(page, BTN.DOWN);
  else await page.keyboard.press('ArrowDown');
  const seals = () =>
    page.evaluate(() => {
      const t = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.tower')?.dataset.suit ?? null;
      const cards = [...document.querySelectorAll<HTMLElement>('#hand .card')];
      const iron = cards.filter((c) => c.querySelector('.plate.factor.iron')).map((c) => c.dataset.id!);
      const ok = !!t && cards.every((c) => {
        const own = c.classList.contains(`s-${t}`) && !c.classList.contains('k-special');
        const plate = c.querySelector('.plate.factor.iron');
        return own ? plate?.textContent?.includes('×0') : !plate;
      });
      return { t, iron, ok };
    });
  const go = (sel: string) => (how === 'pad' ? focusOn(page, sel) : walkKeys(page, sel));
  const first = (await go('.tower[data-suit="H"]')) ? await seals() : null;
  check(first?.t === 'H' && first.ok && first.iron.length > 0, `[${name}] al apuntar CORAZONES, sus ♥ de la mano llevan el sello de hierro «×0» (${first?.iron.join(' ') || 'ninguna'})`);
  const next = (await go('.tower[data-suit="C"]')) ? await seals() : null;
  check(next?.t === 'C' && next.ok && next.iron.length > 0 && next.iron.join() !== first?.iron.join(), `[${name}] al pasar a TRÉBOLES, el sello se va a sus ♣ (${next?.iron.join(' ') || 'ninguna'})`);
}

export async function gamepadSuite(browser: Browser, url: string, check: Check, problems: string[], shot: (page: Page, name: string) => Promise<unknown>): Promise<void> {
  // La marca sale de navigator.language: se fija el español para ver siempre «SANGRE Y PALO».
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'es-ES' });
  await context.addInitScript({ content: NAME_SHIM });
  await context.addInitScript({ content: VIRTUAL_GAMEPAD });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`[mando] error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`[mando] consola: ${m.text()}`));
  await page.goto(`${url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
  await page.evaluate(() => {
    const w = window as unknown as QaWindow;
    w.__qa.seed('MANDO-QA');
    w.__qaGamepad.connect();
  });
  const A = () => press(page, BTN.A);
  const B = () => press(page, BTN.B);

  // ── portada → preparación ──
  {
    // el título se compone en versalitas por CSS: se lee su nombre accesible, y el sello tal cual
    const title = await page.locator('.home h1.title').getAttribute('aria-label');
    const seal = (await page.locator('.home .brand-seal .seal-ribbon').textContent())?.trim();
    check(title === BRAND.es.title && seal === BRAND.es.seal,`la portada enseña la marca dual: «${BRAND.es.title}» con el sello «${BRAND.es.seal}»`);
  }
  await press(page, BTN.DOWN);
  check((await inputMode(page)) === 'pad', 'el primer toque del mando cambia las indicaciones a botones');
  check(await focusOn(page, '#m-camp'), 'la cruceta lleva el foco a «Campaña» en la portada');
  await A();
  check((await count(page, '.camp')) === 1, 'A abre la preparación de campaña');
  check(await focusOn(page, '#new'), 'el foco llega a «Nueva campaña»');
  await A();
  // un perfil nuevo pasa antes por la partida guiada: se salta con el mando
  await page.waitForSelector('.table-screen');
  await page.waitForTimeout(500);
  check(await focusOn(page, '#btn-leave'), 'el foco llega a «Saltar tutorial» en la barra');
  await A();
  await page.waitForSelector('.run');
  check((await run(page))?.phase === 'pack', 'saltar la partida guiada lleva al sobre de la campaña');

  // ── el sobre → el mapa → el asalto ──
  const toTable = async () => {
    if (!(await focusOn(page, '#go'))) return false;
    await A();
    if (!(await focusOn(page, '#routes .choice.pick'))) return false;
    await A();
    await page.waitForSelector('.table-screen');
    await settled(page);
    return (await run(page))?.phase === 'battle';
  };
  check(await toTable(), 'sobre → mapa → ruta → mesa, todo con A y la cruceta');

  // ── mantener Select: reinicio rápido ──
  const holding = hold(page, BTN.SELECT, 950);
  await page.waitForTimeout(300);
  check((await count(page, '.hold-ring')) === 1, 'mantener Select enseña el anillo de reinicio');
  await holding;
  await page.waitForTimeout(300);
  check((await run(page))?.phase === 'pack', 'mantener Select reinicia la campaña (vuelve al sobre)');
  check(await toTable(), 'tras el reinicio se vuelve a la mesa con el mando');

  // ── gatillos y botones superiores ──
  await press(page, BTN.RT);
  await press(page, BTN.RT);
  check((await page.locator('#btn-speed').textContent())?.includes('4×'), 'RT cambia la velocidad (1× → 2× → 4×)');
  await press(page, BTN.LB);
  check((await count(page, '.deck-modal')) === 1, 'LB abre el mazo');
  await press(page, BTN.DOWN);
  check(await focusIsSane(page), 'dentro del mazo el foco se queda en la ventana');
  await B();
  check((await count(page, '.deck-modal')) === 0, 'B cierra el mazo');
  await press(page, BTN.START);
  check((await count(page, '.settings-modal')) === 1, 'Start abre los ajustes');
  for (let i = 0; i < 4; i++) await press(page, BTN.DOWN);
  const before = await page.locator('[data-vol="master"]').inputValue();
  check(await focusOn(page, '[data-vol="master"]'), 'el foco llega al deslizador de volumen');
  await press(page, BTN.LEFT);
  check((await page.locator('[data-vol="master"]').inputValue()) !== before, 'izquierda y derecha mueven el deslizador');
  for (let i = 0; i < 14; i++) await press(page, BTN.DOWN);
  check(await focusIsSane(page), 'en ajustes el foco no se escapa de la ventana ni se queda atrapado');
  await B();
  check((await count(page, '.settings-modal')) === 0, 'B cierra los ajustes');
  check(await focusOn(page, '#btn-rules'), 'el foco llega a «Reglas» en la barra');
  await A();
  check((await count(page, '.modal .modal-box')) === 1, 'A abre las reglas');
  const scrolled = () => page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('.modal, .modal *')].map((e) => e.scrollTop)));
  const top = await scrolled();
  for (let i = 0; i < 8; i++) await press(page, BTN.DOWN);
  check((await scrolled()) > top, 'en las reglas, la cruceta baja por el texto');
  check(await focusIsSane(page), 'y el foco no se sale de la ventana de reglas');
  await B();
  check((await count(page, '.modal')) === 0, 'B cierra las reglas');
  check(await focusOn(page, '#hand .card'), 'tras cerrar ventanas, el foco vuelve a la mano');
  await press(page, BTN.RB);
  check((await count(page, '.lupa')) === 1, 'RB abre la Lupa sobre la carta enfocada');
  await B();
  check((await count(page, '.lupa')) === 0, 'B cierra la Lupa');
  check((await count(page, '.actions .kh.pd:visible, .bar .kh.pd:visible')) >= 3, 'la mesa enseña insignias de botón (LB, RT, Start, B…)');
  check((await page.locator('#btn-discard .kh.pd').textContent()) === 'L3', '«Descartar» enseña su insignia L3');

  // ── foco: marco visible y respuesta en menos de 50 ms ──
  check(await focusOn(page, '#hand .card'), 'el foco está en la mano');
  await page.waitForTimeout(200); // el marco se desliza en 70 ms y la carta enfocada se alza: se mide ya quieto
  check(await ringOk(page), 'el foco de papel y tinta abraza la carta enfocada');
  const quick = await latency(page, BTN.RIGHT);
  check(quick >= 0 && quick < 50, `el foco responde a la cruceta en menos de 50 ms (${ms(quick)})`);
  check((await page.evaluate(() => (window as unknown as QaWindow).__qaSounds.slice(-3))).includes('focus'), 'mover el foco suena (toque de latón)');
  {
    // V8 · A1: tras cada pulsación de la cruceta en la mano, en el fotograma siguiente al cambio de foco el
    // marco ya rodea la carta nueva y esa carta (y solo esa) lleva data-foco
    await focusOn(page, '#hand .card');
    const a1 = await page.evaluate(async (btns) => {
      const g = (window as unknown as QaWindow).__qaGamepad;
      const raf = () => new Promise((r) => requestAnimationFrame(r));
      const frames: number[] = [];
      const bad: string[] = [];
      for (const b of btns) {
        const from = document.activeElement;
        g.pad.buttons[b] = { pressed: true, touched: true, value: 1 };
        let f = 0;
        while (document.activeElement === from && f < 40) {
          await raf();
          f++;
        }
        await raf(); // el fotograma siguiente al cambio
        const a = document.activeElement as HTMLElement;
        const ring = document.querySelector<HTMLElement>('.focus-ring.on');
        const marked = document.querySelectorAll('[data-foco]');
        const r = ring?.getBoundingClientRect();
        const t = a.getBoundingClientRect();
        const around = !!r && r.left <= t.left + 1 && r.right >= t.right - 1 && Math.abs(r.left + 6 - t.left) < 3 && Math.abs(r.width - 12 - t.width) < 3;
        if (a === from || !a.matches('#hand .card')) bad.push(`botón ${b}: el foco no pasó a otra carta`);
        else if (!around) bad.push(`botón ${b}: el marco no rodea la carta nueva`);
        else if (marked.length !== 1 || marked[0] !== a) bad.push(`botón ${b}: data-foco en ${marked.length} elementos`);
        frames.push(f);
        g.pad.buttons[b] = { pressed: false, touched: false, value: 0 };
        await raf();
        await raf();
      }
      const cs = getComputedStyle(document.querySelector('.focus-ring i')!);
      const spreads = [...cs.boxShadow.matchAll(/0px 0px 0px (\d+(?:\.\d+)?)px/g)].reduce((n, m) => n + parseFloat(m[1]), 0);
      return { frames, bad, border: parseFloat(cs.borderTopWidth), total: parseFloat(cs.borderTopWidth) + spreads };
    }, [BTN.RIGHT, BTN.RIGHT, BTN.LEFT, BTN.RIGHT, BTN.LEFT, BTN.LEFT]);
    check(!a1.bad.length && Math.max(...a1.frames) <= 2, `A1: en cada pulsación de la cruceta el foco llega a la carta nueva en ${Math.max(...a1.frames)} fotograma(s) como mucho (${a1.frames.join(' ')}), con el marco alrededor y data-foco solo en ella${a1.bad.length ? ` — ${a1.bad[0]}` : ''}`);
    console.log(`  (A1: marco de ${a1.border} px de papel, ${a1.total} px con los filetes de tinta)`);
  }

  // ── R3: pantalla completa (se comprueba la llamada, no el modo real) ──
  await page.evaluate(() => {
    const w = window as unknown as QaWindow;
    w.__fs = 0;
    document.documentElement.requestFullscreen = () => ((w.__fs += 1), Promise.resolve());
  });
  await press(page, BTN.R3);
  check((await page.evaluate(() => (window as unknown as QaWindow).__fs)) === 1, 'R3 pide pantalla completa, como la tecla F');

  // (LB / RB sobre las reliquias de la mesa se prueban al final, en la mesa de QA con seis)
  check(await focusOn(page, '#hand .card'), 'fuera de las reliquias…');
  await press(page, BTN.LB);
  check((await count(page, '.deck-modal')) === 1, '…LB sigue abriendo el mazo');
  await B();
  await press(page, BTN.RB);
  check((await count(page, '.lupa')) === 1, '…y RB la lupa');
  await B();

  // ── L3: descartar lo elegido ──
  {
    await B();
    const id = await page.locator('#hand .card').last().getAttribute('data-id');
    check(await focusOn(page, `#hand .card[data-id="${id}"]`), 'el foco llega a la última carta de la mano');
    await A();
    check((await count(page, '#hand .card.sel')) === 1, 'A la elige');
    await press(page, BTN.L3);
    await page.waitForTimeout(250);
    await settled(page);
    check((await count(page, `.handrow .card[data-id="${id}"]`)) === 0, 'L3 descarta lo elegido (pulsar la palanca izquierda)');
  }
  await shot(page, 'mando-mesa');

  // ── La Manga con Y ──
  const inReserve = await count(page, '#reserve .card');
  check(await focusOn(page, '#hand .card'), 'el foco vuelve a una carta de la mano');
  await press(page, BTN.Y);
  await page.waitForTimeout(250);
  await settled(page);
  check((await count(page, '#reserve .card')) === inReserve + 1, 'Y guarda la carta enfocada en La Manga');

  // ── la mesa, fila a fila: desde cualquier sitio se llega a cada trono, y de cada trono a la mano ──
  // (el mismo focusOn voraz del asalto, con 6 pulsaciones como mucho y sin reintentos)
  {
    const towers = ['S', 'D', 'H', 'C'].map((s) => `.tower[data-suit="${s}"]`);
    const misses: string[] = [];
    let tries = 0;
    const reach = async (from: string, to: string) => {
      if (!(await focusDirect(page, from))) return; // lo que no existe ahora (p. ej. una carta ya jugada) no cuenta
      tries++;
      const r = await walk(page, to, false, 6, 30);
      if (r.steps < 0) misses.push(`${from} → ${to}: ${r.path.join(' ')}`);
    };
    const handEnds = async () => {
      const ids = await page.locator('#hand .card').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id!));
      return [...new Set([ids[0], ids[ids.length - 1]])].map((id) => `.handrow .card[data-id="${id}"]`);
    };
    // de un trono a la mano: solo «abajo», como mucho 6 veces (reliquias, cuenta… y una carta)
    const backToHand = async (t: string) => {
      if (!(await focusDirect(page, t))) return;
      tries++;
      const path: string[] = [t];
      for (let i = 0; i < 6; i++) {
        await press(page, BTN.DOWN, 30);
        const at = await page.evaluate(() => {
          const a = document.activeElement as HTMLElement | null;
          return { hand: !!a?.matches('#hand .card'), name: a ? `${a.id ? `#${a.id}` : `.${a.classList[0]}`}${a.dataset.id ? `[${a.dataset.id}]` : ''}` : '∅' };
        });
        path.push(`D→${at.name}`);
        if (at.hand) return;
      }
      misses.push(`${t} → la mano: ${path.join(' ')}`);
    };
    const sweep = async (sources: string[]) => {
      for (const from of sources) for (const t of towers) if (from !== t) await reach(from, t);
      for (const t of towers) await backToHand(t);
    };
    await B();
    await settled(page);
    // un susurro al margen es una parada más del camino (su «No mostrar más» se alcanza con el
    // mando): si hay uno, se comprueba que se llega a él desde el trono de la derecha y se aparta. Durante el barrido no
    // se escriben más, para medir la mesa y no el susurro de turno.
    if (await count(page, '.table-screen .side > .whisper')) {
      await focusDirect(page, '.tower[data-suit="C"]');
      const w = await walk(page, '.side > .whisper .whisper-off', false, 2, 30);
      if (w.steps < 0) console.log(`  · trono de la derecha → susurro: ${w.path.join(' ')}`);
      check(w.steps >= 0, 'con un susurro al margen, su «No mostrar más» queda a una o dos pulsaciones del trono de la derecha');
    }
    await page.evaluate(() => {
      (window as unknown as QaWindow).__whispers.force(false);
      document.querySelectorAll('.table-screen .side > .whisper').forEach((w) => w.remove());
    });
    await sweep(await tableFocusables(page));
    // y con cartas elegidas (se alzan y la cuenta se abre): desde los extremos de la mano y las acciones
    const ends = await handEnds();
    for (const c of ends) {
      await focusDirect(page, c);
      await A();
    }
    await sweep([...(await handEnds()), ...(await tableFocusables(page, '.actions button, .calc'))]);
    await B();
    await page.evaluate(() => (window as unknown as QaWindow).__whispers.force(null));
    for (const m of misses.slice(0, 8)) console.log(`  · ${m}`);
    check(tries > 40 && misses.length === 0, `desde cada sitio de la mesa se llega a cada trono, y de ellos a la mano, en ≤ 6 pulsaciones (${tries - misses.length}/${tries})`);
  }

  // ── el asalto entero: el bot decide, el mando ejecuta ──
  let turns = 0;
  let undone = false;
  let navFails = 0;
  let animLag: number | null = null;
  let animSamples: number[] = [];
  for (; turns < 45; turns++) {
    await settled(page);
    const state = await run(page);
    if (state?.phase !== 'battle' || (await count(page, '.table-screen')) === 0) break;
    const action = await page.evaluate(() => (window as unknown as QaWindow).__qa.bot());
    if (!action) break;
    const stick = turns % 2 === 1; // un turno con cruceta, el siguiente con palanca
    await B(); // suelta cualquier selección anterior
    const select = async (ids: string[]) => {
      for (const id of ids) {
        if (!(await focusOn(page, `.handrow .card[data-id="${id}"]`, stick))) return false;
        await A();
      }
      return true;
    };
    let ok = true;
    if (action.type === 'stash') {
      ok = await focusOn(page, `#hand .card[data-id="${action.card}"]`, stick);
      if (ok) await press(page, BTN.Y);
    } else if (action.type === 'attack' || action.type === 'joker') {
      ok = (await select(action.type === 'joker' ? [action.card!] : action.cards!)) && (await focusOn(page, `.tower[data-suit="${action.target}"]`, stick));
      if (ok) await press(page, BTN.X);
      // mientras la mesa anima el golpe, la cruceta sigue moviendo el foco (sin esperar a la animación)
      // (hacia el lado que tiene vecino: en el trono de la izquierda, LEFT topa y no mueve nada)
      // cinco pulsaciones de ida y vuelta entre tronos vecinos; cuenta la mediana (una sola muestra pintando
      // por CPU da falsos fallos). Solo valen las que empiezan con la mesa aún animando.
      if (ok && animLag === null && (await count(page, '.handrow.locked')) > 0) {
        const samples: number[] = [];
        let right = await page.evaluate(() => document.activeElement === document.querySelector('.tower'));
        for (let i = 0; i < 5 && (await count(page, '.handrow.locked')) > 0; i++) {
          samples.push(await latency(page, right ? BTN.RIGHT : BTN.LEFT));
          right = !right;
        }
        if (samples.length) {
          const sorted = [...samples].sort((p, q) => (p < 0 ? Infinity : p) - (q < 0 ? Infinity : q));
          animLag = sorted[Math.floor((sorted.length - 1) / 2)];
          animSamples = samples;
        }
      }
    } else if (action.type === 'discard') {
      ok = (await select(action.cards!)) && (await focusOn(page, '#btn-discard', stick));
      if (ok) await A();
    } else await press(page, BTN.X); // pasar
    if (!ok) {
      navFails++;
      const where = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        const box = a?.getBoundingClientRect();
        const sel = [...document.querySelectorAll<HTMLElement>('.handrow .card.sel')].map((c) => c.dataset.id).join(',');
        return `${a?.tagName.toLowerCase()}${a?.id ? `#${a.id}` : ''}.${a?.className ?? ''}${a?.dataset.id ? `[${a.dataset.id}]` : ''} «${(a?.textContent ?? '').trim().slice(0, 20)}» en ${a?.parentElement?.className ?? ''} @${Math.round(box?.left ?? 0)},${Math.round(box?.top ?? 0)} · elegidas: ${sel || 'ninguna'} · capas: ${document.querySelectorAll('.modal, .end, .lupa').length} · susurro: ${document.querySelector('.whisper') ? 'sí' : 'no'}`;
      });
      console.log(`  · el mando no llegó (${action.type} ${JSON.stringify(action.cards ?? action.card ?? '')} → ${action.target ?? ''}); foco en ${where}`);
      if (navFails > 3) break;
      continue;
    }
    await page.waitForTimeout(150);
    await settled(page);
    // una vez, tras el primer golpe: LT deshace con Rebobinar
    if (!undone && action.type === 'attack' && (await run(page))?.phase === 'battle' && (await page.locator('#btn-undo').isEnabled())) {
      const hp = await page.locator('.tower .hp span').allTextContents();
      await press(page, BTN.LT);
      await page.waitForTimeout(300);
      await settled(page);
      const back = await page.locator('.tower .hp span').allTextContents();
      check(hp.join() !== back.join() && (await page.locator('#btn-undo').isDisabled()), 'LT gasta Rebobinar y deshace el golpe');
      undone = true;
    }
  }
  check(navFails === 0, `la cruceta y la palanca llegan siempre a la carta y al trono que tocan${navFails ? ` (${navFails} fallos)` : ''}`);
  check(undone, 'Rebobinar se probó con LT durante el asalto');
  if (animLag !== null)
    check(animLag >= 0 && animLag < 50, `con la mesa animando, el foco responde en menos de 50 ms (mediana ${ms(animLag)} de ${animSamples.map((n) => ms(n)).join(' · ')})`);
  else console.log('  (no se pilló ningún golpe animando para medir el foco)');
  await page.waitForFunction(() => !document.querySelector('.table-screen'), null, { timeout: 20_000 }).catch(() => undefined);
  const after = await run(page);
  check(after?.phase === 'reward', `el asalto 1 se gana jugando solo con el mando (${turns} turnos${after ? `, fase «${after.phase}»` : ''})`);
  await shot(page, 'mando-botin');

  // ── Botín: elegir una carta ──
  if (after?.phase === 'reward') {
    // si el Juramento premió con una carta, su ventana llega primero: B la cierra
    for (let i = 0; i < 3 && (await count(page, '.modal')) > 0; i++) {
      await B();
      await page.waitForTimeout(200);
    }
    check((await count(page, '.modal')) === 0, 'B cierra la ventana del premio del Juramento (si la hay)');
    check(await focusOn(page, '#picks .choice.pick'), 'en el Botín, el foco llega a la selección');
    await A();
    await page.waitForTimeout(300);
    check((await run(page))?.phase === 'shop', 'A elige la carta y abre La Taberna');
  }

  // ── La Taberna: reordenar las reliquias y sellar una carta en la Mesa de lacre ──
  if ((await run(page))?.phase === 'shop') {
    await page.evaluate(() => (window as unknown as QaWindow).__qa.boost());
    const tools = (await run(page))!.tools;
    check((await focusOn(page, '.run-belt .belt-slot[data-slot="0"]')) && true, 'el foco llega a las reliquias');
    await A();
    check(await focusOn(page, '.run-belt .belt-slot[data-slot="1"]'), 'y a su segundo hueco');
    await A();
    await page.waitForTimeout(200);
    const reordered = (await run(page))!.tools;
    check(reordered[0] === tools[1] && reordered[1] === tools[0], 'A sobre una reliquia y A sobre otro hueco las cambia de sitio');
    check(await focusOn(page, '.run-belt .belt-slot[data-slot="0"]'), 'el foco vuelve al primer hueco');
    await press(page, BTN.RB);
    await page.waitForTimeout(250);
    check((await run(page))!.tools.slice(0, 2).join() === tools.slice(0, 2).join(), 'en La Taberna, RB mueve la reliquia enfocada a la derecha');
    check(await active(page, `.run-belt .belt-slot[data-slot="1"][data-id="${reordered[0]}"]`), 'el foco viaja con la reliquia a su hueco nuevo');
    check(await ringOk(page), 'y el foco la sigue');
    await press(page, BTN.LB);
    await page.waitForTimeout(250);
    check((await run(page))!.tools.slice(0, 2).join() === reordered.slice(0, 2).join() && (await active(page, '.run-belt .belt-slot[data-slot="0"]')), 'LB la devuelve a la izquierda, con el foco');
    await press(page, BTN.LB);
    await page.waitForTimeout(150);
    check((await count(page, '.deck-modal')) === 0 && (await run(page))!.tools.slice(0, 2).join() === reordered.slice(0, 2).join(), 'en el primer hueco, LB no hace nada (ni abre el mazo)');
    // la Mesa de lacre estrena su susurro: se fuerza (en QA solo susurra la mesa de primera campaña)
    await page.evaluate(() => (window as unknown as QaWindow).__whispers.force(true));
    const marks = (await run(page))!.marks;
    check(await focusOn(page, '#offers .choice.pick:has(.card[data-id^="forja-"])'), 'el foco llega a la oferta de la Mesa de lacre');
    await A();
    await page.waitForSelector('.pending-modal');
    check((await count(page, '.pending-modal .whisper')) === 1, 'la Mesa de lacre trae su susurro, dentro de la ventana');
    check(await focusOn(page, '.pending-modal .whisper-off'), 'el foco llega a «No mostrar más»');
    await A();
    check((await count(page, '.whisper')) === 0 && (await page.evaluate(() => (window as unknown as QaWindow).__whispers.off())), 'A en «No mostrar más» lo cierra y queda guardado');
    await page.evaluate(() => {
      const w = (window as unknown as QaWindow).__whispers;
      w.reset();
      w.force(null);
    });
    check(await focusOn(page, '.pending-modal .card.pickable'), 'en la Mesa de lacre, el foco llega a una carta del Mazo');
    // la rejilla del mazo se recorre fila a fila con la cruceta sin perder el foco
    const rowsOk = await page.evaluate(async () => {
      const g = (window as unknown as QaWindow).__qaGamepad;
      const seen = new Set<Element>();
      for (const b of [15, 15, 13, 13, 14, 12]) {
        await g.press(b);
        const a = document.activeElement;
        if (!a?.matches('.pending-modal .card.pickable, .pending-modal button')) return false;
        seen.add(a);
      }
      return seen.size >= 4;
    });
    check(rowsOk, 'la cruceta recorre la rejilla de la Mesa de lacre (derecha, abajo, izquierda, arriba) sin salirse');
    check(await focusOn(page, '.pending-modal .card.pickable'), 'y vuelve a una carta elegible');
    check(await ringOk(page), 'con el foco sobre la carta');
    await A();
    // el lacre se estampa tras su animación: se sondea hasta 2 s en vez de una espera fija
    let stamped = false;
    for (let t = 0; t < 20 && !stamped; t++) {
      await page.waitForTimeout(100);
      stamped = (await run(page))!.marks === marks + 1;
    }
    check(stamped, 'A estampa el lacre en la carta elegida');
    await shot(page, 'mando-lacre');
    await B();
    await page.waitForTimeout(200);
    check((await count(page, '.modal')) === 0 && (await focusIsSane(page)), 'B cierra la carta sellada y no queda ninguna ventana atrapando el foco');
    check(await focusOn(page, '#go'), 'el foco llega al botón de seguir hacia el mapa');
  }

  // ── un Secreto de la cripta: se elige con el mando y la campaña sigue ──
  await page.evaluate(() => (window as unknown as QaWindow).__qa.go('hallazgo'));
  await page.waitForSelector('.run.event');
  check(await active(page, '#opts .opt'), 'al entrar en un Secreto de la cripta con mando, el foco cae primero en sus opciones');
  await page.waitForTimeout(450);
  {
    const heard = await page.evaluate(() => (window as unknown as QaWindow).__qaSounds.slice(-30));
    const opts = await count(page, '#opts .opt');
    check(heard.filter((s) => s === 'reveal').length >= opts, `cada opción del secreto suena al revelarse (${heard.filter((s) => s === 'reveal').length} de ${opts})`);
  }
  check(await focusOn(page, '#opts .opt:nth-child(2)'), 'en un Secreto de la cripta, el foco llega a sus opciones');
  await press(page, BTN.UP);
  await press(page, BTN.DOWN);
  check(await focusIsSane(page), 'el foco se mueve entre las opciones del secreto sin perderse');
  check(await focusOn(page, '#opts .opt:nth-child(2)'), 'y vuelve a la opción elegida');
  await A();
  await page.waitForTimeout(400);
  check((await run(page))?.phase !== 'event', 'A resuelve el secreto y la campaña sigue');
  check(await focusIsSane(page), 'tras el secreto el foco sigue en la pantalla');
  await shot(page, 'mando-secreto');

  await combatRelics(page, check);
  await shot(page, 'mando-reliquias');

  // ── las indicaciones siguen al último dispositivo usado ──
  check((await inputMode(page)) === 'pad', 'jugando con mando, las indicaciones son de mando');
  await page.keyboard.press('ArrowDown');
  check((await inputMode(page)) === 'keys', 'al tocar el teclado pasan a ser de teclado');
  await page.mouse.move(400, 300);
  await page.mouse.move(420, 320);
  check((await inputMode(page)) === 'pointer', 'y al mover el ratón desaparecen');
  await press(page, BTN.DOWN);
  check((await inputMode(page)) === 'pad', 'un toque del mando las devuelve');

  // ── V7 · F1 con el mando y la partida guiada entera, a 1× ──
  await sealCheck(page, 'pad', check);
  await guidedRun(page, 'pad', check, shot);
  await context.close();
}
