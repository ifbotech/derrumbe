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
//
// V10: `--lang=en` (o QA_LANG=en) juega todo en inglés: contexto con locale en-US y el idioma elegido en el
// interruptor. En las dos pasadas se cambia ES → EN → ES con el mando en la Portada y en Ajustes (sin
// recargar y sin perder el foco), se enciende «Alto contraste» y, en La Taberna, lo enfocado lleva Ⓐ y su verbo (SD5).
import type { Browser, Page } from 'playwright';
import { BRAND } from '../src/shared/brand';
import { tFor, type Lang } from '../src/shared/i18n';
import { NAME_SHIM } from './web';

/** V10: idioma de la pasada (`--lang=en` o QA_LANG=en) y el locale del navegador que le corresponde. */
export const LANG: Lang = process.argv.includes('--lang=en') || process.env.QA_LANG?.trim() === 'en' ? 'en' : 'es';
export const LOCALE = LANG === 'en' ? 'en-US' : 'es-ES';
/** El otro idioma (el que se prueba a cambiar con el interruptor). */
export const OTHER: Lang = LANG === 'en' ? 'es' : 'en';
/** Un texto del juego en el idioma de la pasada, sin etiquetas. */
export const T = (clave: string, valores?: Record<string, string | number>, lang: Lang = LANG) => tFor(lang, clave, valores).replace(/<[^>]+>/g, '');

/** Lo que se lee tras pulsar un idioma del interruptor (`where`: #home-lang o #set-lang). */
export const langState = (page: Page, where: string, to: Lang) =>
  page.evaluate(
    ([w, l]) => {
      const btn = document.querySelector<HTMLElement>(`${w} [data-lang="${l}"]`);
      return {
        lang: document.documentElement.lang,
        // con ?qa el guardado es de quita y pon: se lee a través del puente
        stored: (window as unknown as { __qaPlatform?: () => { load(k: string): string | null } }).__qaPlatform?.().load('derrumbe:idioma') ?? localStorage.getItem('derrumbe:idioma'),
        focus: !!btn && document.activeElement === btn,
        pressed: btn?.getAttribute('aria-pressed') === 'true',
        ring: !!document.querySelector('.focus-ring.on'),
        same: (window as unknown as { __sinRecarga?: number }).__sinRecarga === 1,
        title: document.querySelector('.home h1.title')?.getAttribute('aria-label') ?? null,
        jugar: document.querySelector('#m-camp')?.textContent ?? '',
        settings: document.querySelector('.settings-modal h2')?.textContent ?? '',
        modals: document.querySelectorAll('.settings-modal').length,
      };
    },
    [where, to] as const,
  );
/** Marca la página: si recarga o navega, la marca se pierde. */
export const markPage = (page: Page) => page.evaluate(() => void ((window as unknown as { __sinRecarga?: number }).__sinRecarga = 1));

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

export const press = (page: Page, i: number, ms?: number) => page.evaluate(([b, t]) => (window as unknown as QaWindow).__qaGamepad.press(b as number, t), [i, ms] as const);
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
      // V11: como walkKeys, si vuelve por segunda vez a un sitio ya pisado (va y viene entre dos filas), prueba por el otro eje
      const visits = new Map<Element, number>();
      let flip = false;
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
        if (flip || stuck % 2 === 1) dir = dir === 'U' || dir === 'D' ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U';
        await go(dir);
        const now = document.activeElement;
        stuck = now === from ? stuck + 1 : 0;
        if (now) visits.set(now, (visits.get(now) ?? 0) + 1);
        flip = stuck === 0 && !!now && (visits.get(now) ?? 0) >= 2;
        if (stuck > 6) break;
      }
      return { steps: -1, path };
    },
    [selector, stick, limit, ms] as const,
  );
}
export const focusOn = async (page: Page, selector: string, stick = false) => (await walk(page, selector, stick)).steps >= 0;

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
 * V34 · Las reliquias en combate con el mando. Las Reliquias no se ordenan: con el foco en una, RB y LB hacen lo de
 * siempre (la Lupa y el Mazo), la tira no cambia y la cuenta del golpe tampoco. Se monta la mesa de QA (seis reliquias).
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
  await page.waitForSelector('.table-screen #beltbar .belt');
  await settled(page);
  await press(page, BTN.DOWN); // el mando vuelve a ser el dispositivo en uso
  const start = await tools();
  check(start.length >= 3, `la mesa de combate tiene al menos tres reliquias (${start.length})`);

  // un doble par de sietes y nueves (V40: ya no hay dieces de número): cuatro cartas, así el ×M que pide «4 cartas o más» entra en la cuenta
  await press(page, BTN.B);
  const ids = await page.evaluate(() =>
    [['S', '7'], ['D', '7'], ['H', '9'], ['C', '9']].map(([s, r]) =>
      [...document.querySelectorAll<HTMLElement>(`#hand .card.s-${s}`)].find((c) => c.querySelector('.corner b')?.textContent?.trim() === r)?.dataset.id ?? ''),
  );
  let picked = ids.every(Boolean);
  for (const id of ids) {
    if (!picked || !(await focusOn(page, `#hand .card[data-id="${id}"]`))) { picked = false; break; }
    await press(page, BTN.A);
  }
  const p0 = await calc();
  check(picked && /\d/.test(p0) && !p0.endsWith('?'), `con el mando se eligen cuatro cartas y la cuenta se previsualiza (${p0 || 'sin cuenta'})`);

  // RB y LB sobre la primera reliquia: la Lupa y el Mazo, como en el resto de la mesa
  check(await reach(slot(0)), 'el foco llega a la primera reliquia de la mesa');
  await press(page, BTN.RB);
  await page.waitForTimeout(250);
  check((await tools()).join() === start.join(), 'en combate, RB sobre una reliquia no la mueve: las Reliquias no se ordenan');
  check((await count(page, '.lupa')) === 1, 'RB abre su Lupa');
  await press(page, BTN.B);
  await page.waitForTimeout(200);
  check((await count(page, '.lupa')) === 0 && (await calc()) === p0, 'B la cierra y la cuenta del golpe sigue igual');
  check(await reach(slot(0)), 'el foco vuelve a la reliquia');
  await press(page, BTN.LB);
  await page.waitForTimeout(250);
  check((await tools()).join() === start.join() && (await count(page, '.deck-modal')) === 1, 'LB sobre una reliquia abre el Mazo y tampoco la mueve');
  await press(page, BTN.B);
  await page.waitForTimeout(200);
  check((await count(page, '.deck-modal')) === 0 && (await calc()) === p0, 'B lo cierra con la misma cuenta');
  await press(page, BTN.B);
}

// ───────────────────────── V7 · teclado: cómo se recorre la mesa ─────────────────────────

type How = 'pad' | 'keys' | 'mouse';

/**
 * Lleva el foco con las flechas del teclado, a lo voraz y como haría una persona (el mismo criterio que
 * `walk` con la cruceta). Devuelve si llegó.
 */
export async function walkKeys(page: Page, selector: string, limit = 40, trace?: string[]): Promise<boolean> {
  let stuck = 0;
  // V10: si vuelve a un sitio ya pisado dos veces (va y viene entre dos botones), prueba por el otro eje
  const visits = new Map<string, number>();
  let flip = false;
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
      [selector, flip ? 1 : stuck] as const,
    );
    if (r.dir === 'ok') return true;
    if (r.dir === 'x' || i === limit) return false;
    await page.keyboard.press({ U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' }[r.dir]!);
    trace?.push(`${r.dir}:${r.sig.split('|').slice(0, 1).join('')}${r.sig.split('|')[3]?.slice(0, 12) ?? ''}`);
    const now = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return a ? `${a.id}|${a.dataset.id ?? ''}|${a.dataset.suit ?? ''}|${a.className}|${Math.round(a.getBoundingClientRect().left)},${Math.round(a.getBoundingClientRect().top)}` : '∅';
    });
    stuck = now === r.sig ? stuck + 1 : 0;
    visits.set(now, (visits.get(now) ?? 0) + 1);
    flip = stuck % 2 === 0 && (visits.get(now) ?? 0) >= 2;
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
 * V10 · el interruptor ES | EN y «Alto contraste», solo con el mando o solo con el teclado: en la Portada
 * y en Ajustes se cambia al otro idioma y se vuelve, al instante y sin recargar (la página no navega), con el
 * candado y los textos cambiados, la elección guardada y el foco en el botón pulsado. En Ajustes, además,
 * «Alto contraste» se enciende y se apaga, y B / Esc cierra la ventana. Empieza y acaba en la Portada.
 */
export async function langSwitchSuite(page: Page, how: 'pad' | 'keys', check: Check): Promise<void> {
  const name = how === 'pad' ? 'mando' : 'teclado';
  const reach = (sel: string) => (how === 'pad' ? focusOn(page, sel) : walkKeys(page, sel));
  const ok = () => (how === 'pad' ? press(page, BTN.A) : page.keyboard.press('Enter'));
  const back = () => (how === 'pad' ? press(page, BTN.B) : page.keyboard.press('Escape'));
  await page.evaluate(() => (window as unknown as QaWindow).__qa.go('portada'));
  await page.waitForSelector('#home-lang');
  await markPage(page);
  if (how === 'pad') await press(page, BTN.DOWN);
  else await page.keyboard.press('ArrowDown');
  const flip = async (where: string, to: Lang) => {
    const reached = await reach(`${where} [data-lang="${to}"]`);
    if (reached) await ok();
    await page.waitForTimeout(120);
    return { reached, ...(await langState(page, where, to)) };
  };
  // ── en la Portada ──
  for (const to of [OTHER, LANG]) {
    const s = await flip('#home-lang', to);
    check(
      s.reached && s.lang === to && s.stored === to && s.pressed && s.same && s.title === BRAND[to].title && s.jugar.includes(T('ui.home.camp', undefined, to)),
      `[${name}] en la Portada, el interruptor pasa a ${to.toUpperCase()} al instante y sin recargar: candado «${s.title}», «${s.jugar.trim().slice(0, 24)}» y la elección guardada`,
    );
    check(s.focus && s.ring, `[${name}] tras cambiar a ${to.toUpperCase()} el foco sigue en el botón pulsado, con su marco`);
  }
  // ── en Ajustes ──
  if (how === 'pad') await press(page, BTN.START);
  else if (await walkKeys(page, '#m-set')) await page.keyboard.press('Enter');
  await page.waitForSelector('.settings-modal');
  for (const to of [OTHER, LANG]) {
    const s = await flip('#set-lang', to);
    check(
      s.reached && s.lang === to && s.stored === to && s.pressed && s.same && s.modals === 1 && s.settings.includes(T('ui.ajustes', undefined, to)),
      `[${name}] en Ajustes, la fila «Idioma · Language» pasa a ${to.toUpperCase()} sin recargar ni cerrar la ventana («${s.settings.trim().slice(0, 20)}»)`,
    );
    check(s.focus && s.ring, `[${name}] y el foco se queda en el botón ${to.toUpperCase()} de Ajustes`);
  }
  const contrast = async () => {
    const trace: string[] = [];
    // con el teclado, las flechas izquierda y derecha dentro de un campo (dirección del servidor, deslizadores) son
    // del campo: como haría una persona, se baja por la columna del idioma hasta pasar a la de los interruptores
    if (how === 'keys')
      for (let i = 0; i < 14 && !(await page.evaluate(() => !!document.activeElement?.closest('.set-col-b'))); i++) await page.keyboard.press('ArrowDown');
    const reached = how === 'pad' ? await focusOn(page, '.set-contraste button') : await walkKeys(page, '.set-contraste button', 40, trace);
    if (!reached) console.log(`  · camino a Alto contraste: ${trace.join(' ')}`);
    if (reached) await ok();
    await page.waitForTimeout(80);
    return page.evaluate((r) => ({ reached: r, at: (document.activeElement as HTMLElement | null)?.outerHTML.slice(0, 60) ?? '', on: document.documentElement.classList.contains('contraste'), focus: !!document.activeElement?.matches('.set-contraste button'), saved: (JSON.parse((window as unknown as { __qaPlatform: () => { load(k: string): string | null } }).__qaPlatform().load('derrumbe:settings') ?? '{}') as { contrast?: boolean }).contrast === true }), reached);
  };
  const on = await contrast();
  check(on.on && on.saved && on.focus, `[${name}] «Alto contraste» se alcanza y se enciende (clase contraste y guardado), con el foco en su botón${on.on && on.saved && on.focus ? '' : ` — ${JSON.stringify(on)}`}`);
  const off = await contrast();
  check(!off.on && !off.saved && off.focus, `[${name}] y se apaga igual`);
  await back();
  await page.waitForTimeout(150);
  check((await count(page, '.settings-modal')) === 0 && (await page.evaluate(() => (window as unknown as { __sinRecarga?: number }).__sinRecarga === 1)), `[${name}] ${how === 'pad' ? 'B' : 'Esc'} cierra Ajustes y la página nunca se recargó`);
}

/** V11 · los tronos de la mesa que están en el asalto (los ausentes van `hidden`), de izquierda a derecha. */
export const presentTowers = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.tower:not([hidden])')]
      .filter((t) => t.getBoundingClientRect().width > 0)
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      .map((t) => `.tower[data-suit="${t.dataset.suit}"]`),
  );

/**
 * V11 (sustituye al sello «×0» de la V7): en una mesa de dos tronos, con teclado o mando, las flechas
 * recorren solo los tronos presentes (nunca un ausente) y, al apuntar cada uno, su placa «Inmune» de hierro
 * se ve y ninguna carta de la mano lleva sello de factor. Con una carta de su palo elegida, la cuenta lo dice:
 * «Inmune · 0».
 */
export async function immuneCheck(page: Page, how: 'pad' | 'keys', check: Check): Promise<void> {
  const name = how === 'pad' ? 'mando' : 'teclado';
  const key = (k: 'L' | 'R' | 'D' | 'A' | 'B') =>
    how === 'pad' ? press(page, { L: BTN.LEFT, R: BTN.RIGHT, D: BTN.DOWN, A: BTN.A, B: BTN.B }[k]) : page.keyboard.press({ L: 'ArrowLeft', R: 'ArrowRight', D: 'ArrowDown', A: 'Enter', B: 'Escape' }[k]);
  const go = (sel: string) => (how === 'pad' ? focusOn(page, sel) : walkKeys(page, sel));
  // con 2, 3 y 4 tronos: de un trono a otro con izquierda y derecha, solo los presentes, y en los extremos no se sale a un ausente
  let towers: string[] = [];
  for (const [state, n] of [['mesa', 4], ['mesa-3tronos', 3], ['mesa-2tronos', 2]] as const) {
    await page.evaluate((s) => (window as unknown as QaWindow).__qa.go(s), state);
    await page.waitForSelector('.table-screen #hand .card');
    await page.waitForTimeout(150);
    await key('D');
    towers = await presentTowers(page);
    // de cada trono al de al lado con una pulsación (→ y ←), sin pisar nunca uno ausente (oculto o sin caja)
    const at = () =>
      page.evaluate(() => {
        const t = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.tower');
        return t ? `${t.dataset.suit}${t.hidden || t.getBoundingClientRect().width === 0 ? '!' : ''}` : '·';
      });
    const path: string[] = [];
    let reachedAll = true;
    let hops = true;
    for (const t of towers) reachedAll &&= await go(t);
    // V35 · el duelo: el enemigo activo a un lado y la fila al otro; → lleva del enemigo a la fila y ← lo devuelve
    const activa = await page.evaluate(() => document.querySelector<HTMLElement>('.tower.activa')?.dataset.suit ?? '');
    const fila = towers.map((t) => t.slice(18, 19)).filter((x) => x !== activa);
    await go(`.tower[data-suit="${activa}"]`);
    await key('R');
    const r = await at();
    await key('L');
    const l = await at();
    path.push(`${activa}→${r}←${l}`);
    hops &&= fila.includes(r) && l === activa;
    check(towers.length === n && reachedAll && hops && !path.join().includes('!'), `[${name}] con ${n} tronos (${state}), el foco llega a cada uno y → / ← van del enemigo activo a la fila y vuelven (${path.join(' · ')})`);
  }
  const plate = () =>
    page.evaluate(() => {
      const tower = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.tower');
      const iron = tower?.querySelector<HTMLElement>('.plate.iron');
      const r = iron?.getBoundingClientRect();
      return { t: tower?.dataset.suit ?? null, iron: !!r && r.width > 0 && getComputedStyle(iron!).visibility !== 'hidden', text: iron?.textContent?.trim() ?? '', factor: document.querySelectorAll('#hand .plate.factor, #reserve .plate.factor').length };
    });
  const seen: string[] = [];
  let platesOk = true;
  // V35 · la placa Inmune va en el enemigo activo (las fichas de la fila no llevan placas)
  for (const t of ['.tower.activa']) {
    await go(t);
    const p = await plate();
    seen.push(`${p.t}: «${p.text}»`);
    platesOk &&= p.iron && p.factor === 0 && p.text.includes(T('ui.mesa.inmune'));
  }
  check(platesOk, `[${name}] al apuntar al enemigo activo se ve su placa «${T('ui.mesa.inmune')}» y ninguna carta lleva sello de factor (${seen.join(' · ')})`);
  // una carta del palo del enemigo activo elegida, apuntándolo: la cuenta dice «Inmune · 0»
  const pick = await page.evaluate(() => {
    const t = document.querySelector<HTMLElement>('.tower.activa');
    const c = t && document.querySelector<HTMLElement>(`#hand .card.s-${t.dataset.suit}:not(.k-special)`);
    return t && c ? { suit: t.dataset.suit!, id: c.dataset.id! } : null;
  });
  let line = '';
  // la mesa de QA trae un trío ya elegido: se suelta antes (B / Esc deshace la elección)
  for (let i = 0; i < 4 && (await page.locator('#hand .card.sel').count()); i++) await key('B');
  if (pick && (await go(`.handrow .card[data-id="${pick.id}"]`))) {
    await key('A');
    if (await go(`.tower[data-suit="${pick.suit}"]`)) line = await page.evaluate(() => document.querySelector('#score')?.textContent?.replace(/\s+/g, ' ').trim() ?? '');
  }
  check(line.includes(T('ui.cuenta.inmune')), `[${name}] con una carta de su palo elegida y su trono apuntado (${pick?.suit ?? '—'}), la cuenta dice «${T('ui.cuenta.inmune')}» (${line.slice(0, 60) || 'sin cuenta'})`);
  await key('B');
}

export async function gamepadSuite(browser: Browser, url: string, check: Check, problems: string[], shot: (page: Page, name: string) => Promise<unknown>): Promise<void> {
  // La marca sale de navigator.language: se fija el español para ver siempre «SANGRE Y PALO».
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
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
    check(title === BRAND[LANG].title && seal === BRAND[LANG].emblema, `la portada enseña la marca dual: «${BRAND[LANG].title}» con la cinta «${BRAND[LANG].emblema}»`); // V12 arte A: la cinta lleva el emblema
  }
  await press(page, BTN.DOWN);
  check((await inputMode(page)) === 'pad', 'el primer toque del mando cambia las indicaciones a botones');
  // ── V10 · el interruptor ES | EN y «Alto contraste» con el mando ──
  await langSwitchSuite(page, 'pad', check);
  check(await focusOn(page, '#m-camp'), 'la cruceta lleva el foco a «Jugar» en la portada');
  await A();
  check((await count(page, '.camp')) === 1, 'A abre la preparación de campaña');
  check(await focusOn(page, '#new'), 'el foco llega a «Nueva campaña»');
  await A();
  // V40: sin partida guiada, la campaña nueva empieza por el sobre (el Bufón enseña en la mesa)
  await page.waitForSelector('.run');
  check((await run(page))?.phase === 'pack', 'la campaña nueva empieza por el sobre');

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

  // ── V12 · mantener Select + Start: reinicio rápido (Select solo es AUTO; Start solo, Ajustes) ──
  await page.evaluate((b) => ((window as unknown as QaWindow).__qaGamepad.pad.buttons[b] = { pressed: true, touched: true, value: 1 }), BTN.SELECT);
  await page.waitForTimeout(120);
  const holding = hold(page, BTN.START, 950);
  await page.waitForTimeout(300);
  check((await count(page, '.hold-ring')) === 1 && (await count(page, '.settings-modal')) === 0, 'mantener Select + Start enseña el anillo de reinicio (y no abre Ajustes)');
  await holding;
  await page.evaluate((b) => ((window as unknown as QaWindow).__qaGamepad.pad.buttons[b] = { pressed: false, touched: false, value: 0 }), BTN.SELECT);
  await page.waitForTimeout(300);
  check((await run(page))?.phase === 'pack', 'mantener Select + Start reinicia la campaña (vuelve al sobre)');
  check(!(await page.evaluate(() => (window as unknown as { __qaJuice: { auto(): { on: boolean } } }).__qaJuice.auto().on)), 'y AUTO no queda encendido por el Select del reinicio');
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

  // ── V12 · pantalla completa desde Ajustes (Start → Pantalla completa; se comprueba la llamada, no el modo real) ──
  await page.evaluate(() => {
    const w = window as unknown as QaWindow;
    w.__fs = 0;
    document.documentElement.requestFullscreen = () => ((w.__fs += 1), Promise.resolve());
  });
  await press(page, BTN.START);
  check(await focusOn(page, '#set-toggles .set-pantalla button'), 'en Ajustes, el foco llega a «Pantalla completa»');
  await A();
  check((await page.evaluate(() => (window as unknown as QaWindow).__fs)) === 1, 'Start → Ajustes → Pantalla completa la pide, como la tecla F');
  await B();
  check((await count(page, '.settings-modal')) === 0, 'B vuelve a cerrar los ajustes');

  // (LB / RB con el foco en una reliquia se prueban al final, en la mesa de QA con seis)
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
    // V11: solo los tronos de este asalto (en el 1 hay dos; los ausentes van `hidden` y no se enfocan)
    const towers = await presentTowers(page);
    check(towers.length >= 2 && towers.length <= 4, `la mesa del asalto tiene de 2 a 4 tronos a la vista (${towers.length})`);
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
      // V35 (duelo): la mesa ya no es una fila de tronos; el susurro queda a la derecha de la cola y del trono
      // activo, así que basta con que su «No mostrar más» quede a una o dos pulsaciones de alguno de los tronos a la vista
      const visibles = await page.evaluate(
        ([list]) => list.filter((sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return !!r && r.width > 0; }),
        [towers] as const,
      );
      let w = { steps: -1, path: [] as string[] };
      const tried: string[] = [];
      for (const from of visibles) {
        await focusDirect(page, from);
        w = await walk(page, '.side > .whisper .whisper-off', false, 2, 30);
        if (w.steps >= 0) break;
        tried.push(w.path.join(' '));
        // el margen queda a la derecha de la mesa: también vale llegar con «derecha» una o dos veces
        await focusDirect(page, from);
        w = await page.evaluate(async () => {
          const pad = (window as unknown as QaWindow).__qaGamepad;
          const target = document.querySelector('.side > .whisper .whisper-off');
          const path: string[] = [];
          for (let i = 1; i <= 2; i++) {
            await pad.press(15, 30);
            const a = document.activeElement as HTMLElement | null;
            path.push(`R→${a ? `.${a.classList[0] ?? a.tagName}${a.dataset.suit ? `[${a.dataset.suit}]` : ''}` : '∅'}`);
            if (a === target) return { steps: i, path };
          }
          return { steps: -1, path };
        });
        if (w.steps >= 0) break;
        tried.push(`${from} ${w.path.join(' ')}`);
      }
      if (w.steps < 0) console.log(`  · tronos → susurro: ${tried.join(' | ')}`);
      check(w.steps >= 0, 'con un susurro al margen, su «No mostrar más» queda a una o dos pulsaciones de un trono');
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
    // una vez, tras el primer golpe: R3 deshace con Rebobinar (V12: LT es la Mejor jugada)
    if (!undone && action.type === 'attack' && (await run(page))?.phase === 'battle' && (await page.locator('#btn-undo').isEnabled())) {
      const hp = await page.locator('.tower .hp span').allTextContents();
      await press(page, BTN.R3);
      await page.waitForTimeout(300);
      await settled(page);
      const back = await page.locator('.tower .hp span').allTextContents();
      check(hp.join() !== back.join() && (await page.locator('#btn-undo').isDisabled()), 'R3 gasta Rebobinar y deshace el golpe');
      undone = true;
    }
  }
  check(navFails === 0, `la cruceta y la palanca llegan siempre a la carta y al trono que tocan${navFails ? ` (${navFails} fallos)` : ''}`);
  check(undone, 'Rebobinar se probó con R3 durante el asalto');
  if (animLag !== null)
    check(animLag >= 0 && animLag < 50, `con la mesa animando, el foco responde en menos de 50 ms (mediana ${ms(animLag)} de ${animSamples.map((n) => ms(n)).join(' · ')})`);
  else console.log('  (no se pilló ningún golpe animando para medir el foco)');
  await page.waitForFunction(() => !document.querySelector('.table-screen'), null, { timeout: 20_000 }).catch(() => undefined);
  const after = await run(page);
  check(after?.phase === 'reward', `el asalto 1 se gana jugando solo con el mando (${turns} turnos${after ? `, fase «${after.phase}»` : ''})`);
  await shot(page, 'mando-botin');

  // ── Botín: elegir una carta ──
  if (after?.phase === 'reward') {
    // V12 · la tirada de huesos (si la hay): A tira, y en el resultado B sigue. Una ventana encima de la tirada (el
    // premio del Juramento) va primero: se cierra con B
    for (let i = 0; i < 3 && (await count(page, '.modal')) > 0 && (await count(page, '#ritual')) > 0; i++) {
      await B();
      await page.waitForTimeout(200);
    }
    let tiradas = 0;
    for (let i = 0; i < 4 && (await count(page, '#ritual')) > 0; i++) {
      if ((await count(page, '#ritual #ritual-tirar')) > 0) {
        check(await focusOn(page, '#ritual-tirar'), 'en la tirada de huesos, el foco llega a «Tirar»');
        await A();
        tiradas++;
        await page.waitForSelector('#ritual #ritual-seguir', { timeout: 8_000 }).catch(() => undefined);
        const visto = await page.evaluate(() => ({ fase: document.getElementById('ritual')?.dataset.fase ?? 'sin capa', foco: document.activeElement?.id || document.activeElement?.className || '∅', capas: [...document.querySelectorAll('.modal, .end, .lupa, .whisper')].map((m) => m.className).join(' · ') }));
        check(visto.fase === 'final' || visto.fase === 'sin capa', `A tira los huesos y enseña lo que cae${visto.fase === 'antes' ? ` (sigue en «antes»; foco en ${visto.foco}; capas: ${visto.capas || 'ninguna'})` : ''}`);
        // V12 · juice-ux B: los dados ruedan (unos 5 s a 1×) y B los para en la cara que salió; otra B sigue
        if (tiradas === 1 && visto.fase === 'final') {
          const rueda = await page.evaluate(() => document.getElementById('ritual')?.classList.contains('rodando') ?? false);
          await B();
          await page.waitForTimeout(80);
          const parado = await page.evaluate(() => {
            const capa = document.getElementById('ritual');
            return !!capa && !capa.classList.contains('rodando') && [...capa.querySelectorAll<HTMLElement>('.hueso')].every((h) => h.querySelector('.hueso-cara')?.textContent === h.querySelector('.cara.sale')?.textContent);
          });
          check(rueda && parado, `A hace rodar los dados y B los para en la cara que salió, sin cerrar la tirada (${rueda ? 'rodaban' : 'no rodaban'})`);
        }
      }
      await B();
      await page.waitForTimeout(300);
    }
    if (tiradas) check((await count(page, '#ritual')) === 0, 'B sigue tras la tirada de huesos');
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

  // ── La Taberna: las reliquias (no se ordenan) y sellar una carta en la Mesa de lacre ──
  if ((await run(page))?.phase === 'shop') {
    await page.evaluate(() => (window as unknown as QaWindow).__qa.boost());
    const tools = (await run(page))!.tools;
    check((await focusOn(page, '.run-belt .belt-slot[data-slot="0"]')) && true, 'el foco llega a las reliquias');
    await press(page, BTN.RB);
    await page.waitForTimeout(250);
    check((await run(page))!.tools.join() === tools.join() && (await count(page, '.lupa')) === 1, 'en La Taberna, RB sobre una reliquia abre su Lupa y no la mueve');
    await press(page, BTN.B);
    await page.waitForTimeout(200);
    check((await count(page, '.lupa')) === 0, 'B cierra la Lupa');
    // la Mesa de lacre estrena su susurro: se fuerza (en QA solo susurra la mesa de primera campaña)
    await page.evaluate(() => (window as unknown as QaWindow).__whispers.force(true));
    const marks = (await run(page))!.marks;
    // ── SD5 (V10): con el mando, lo enfocado en La Taberna lleva la insignia Ⓐ y su verbo, y se mueve con el foco ──
    const hintAt = () =>
      page.evaluate(() => {
        const h = document.querySelector<HTMLElement>('.focus-ring.on .pad-hint:not([hidden])');
        const f = document.querySelector<HTMLElement>('[data-foco]');
        if (!h || !f) return null;
        const r = h.getBoundingClientRect();
        const b = f.getBoundingClientRect();
        const a = [...h.querySelectorAll<HTMLElement>('.kh.pd')].find((k) => k.textContent === 'A');
        return {
          text: h.textContent ?? '',
          a: !!a && getComputedStyle(a).display !== 'none' && a.getBoundingClientRect().width > 0,
          x: r.left + r.width / 2,
          // pegada al elemento enfocado: a menos de 12 px por arriba o por abajo, y en su franja
          stuck: (Math.abs(r.top - b.bottom) <= 14 || Math.abs(b.top - r.bottom) <= 14) && r.right > b.left - 4 && r.left < b.right + 4,
          inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
        };
      });
    check(await focusOn(page, '#offers .choice.pick'), '[SD5] el foco llega a la primera oferta de La Taberna');
    const h1 = await hintAt();
    check(h1?.a && h1.text.includes(T('ui.pad.comprar')) && h1.stuck && h1.inside, `[SD5] la oferta enfocada lleva la insignia Ⓐ «${T('ui.pad.comprar')}», pegada a ella y dentro de la pantalla (${h1?.text ?? 'sin insignia'})`);
    await press(page, BTN.RIGHT);
    await page.waitForTimeout(60);
    const h2 = await hintAt();
    check(h2?.a && h2.stuck && Math.abs((h2?.x ?? 0) - (h1?.x ?? 0)) > 20, `[SD5] al mover el foco, la insignia se mueve con él (${Math.round(h1?.x ?? 0)} → ${Math.round(h2?.x ?? 0)} px)`);
    const verbs: [string, string][] = [['.run-belt .belt-slot[data-slot="0"]', 'ui.pad.elegir'], ['#reroll', 'ui.pad.renovar'], ['#go', 'ui.pad.seguir'], ['#deck-view', 'ui.pad.ver']];
    const seen: string[] = [];
    let belt: Awaited<ReturnType<typeof hintAt>> = null;
    for (const [sel, key] of verbs) {
      const reached = await focusOn(page, sel);
      const h = reached ? await hintAt() : null;
      if (key === 'ui.pad.elegir') belt = h;
      if (h?.a && h.text.includes(T(key)) && h.stuck && h.inside) seen.push(T(key));
      else console.log(`  · [SD5] ${sel}: ${reached ? 'enfocado' : 'no llega'} · ${JSON.stringify(h)} · foco en ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 90))}`);
    }
    check(seen.length === verbs.length && !/LB|RB/.test(belt?.text ?? ''), `[SD5] cada botón de La Taberna enseña su insignia (${seen.join(' · ')}) y la reliquia ya no ofrece LB / RB`);
    check(await focusOn(page, '#offers .choice.pick:has(.card[data-id^="forja-"])'), 'el foco llega a la oferta de la Mesa de lacre');
    const gold0 = (await run(page))!.gold;
    const h3 = await hintAt();
    check(h3?.a && h3.text.includes(T('ui.pad.comprar')), `[SD5] la Mesa de lacre enfocada dice «${T('ui.pad.comprar')}»`);
    await A();
    await page.waitForSelector('.pending-modal');
    check(!(await hintAt()), '[SD5] Ⓐ abre la compra y, con la ventana abierta, la insignia de La Taberna se retira');
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
    check((await run(page))!.gold < gold0, `[SD5] y la compra se cobra (oro ${gold0} → ${(await run(page))!.gold})`);
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

  // ── V11 · Inmune y tronos presentes con el mando ──
  await immuneCheck(page, 'pad', check);
  await context.close();
}
