// Mando virtual para la prueba de humo. No hace falta un mando físico: se inyecta en la página un
// mando estándar del W3C (17 botones, 4 ejes) que sustituye a navigator.getGamepads(), y la prueba
// lo maneja con press / hold / stick. El juego lo lee por su camino normal (nav.ts).
//
// Con él se juega una campaña de principio a fin sin tocar teclado ni ratón: portada → preparación
// → plano → una obra entera (el bot de referencia decide la jugada; el mando la ejecuta) → cobro →
// ferretería, donde se reordena el cinturón y se forja una carta, y un hallazgo. Por el camino abre
// y cierra cada ventana (mazo, ajustes, reglas, lupa) para comprobar que ninguna atrapa el foco.
import type { Browser, Page } from 'playwright';
import { NAME_SHIM } from './web';

export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 } as const;

/** Se ejecuta en la página antes que el juego. Va como texto para que nada lo transforme por el camino. */
export const VIRTUAL_GAMEPAD = `(() => {
  const button = (down) => ({ pressed: down, touched: down, value: down ? 1 : 0 });
  const pad = {
    id: 'DERRUMBE QA Virtual Gamepad (STANDARD GAMEPAD)', index: 0, connected: false, mapping: 'standard', timestamp: 0,
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
  __qaGamepad: { connect(): void; press(i: number, ms?: number): Promise<void>; hold(i: number, ms: number): Promise<void>; stick(x: number, y: number, ms?: number): Promise<void> };
}

const press = (page: Page, i: number, ms?: number) => page.evaluate(([b, t]) => (window as unknown as QaWindow).__qaGamepad.press(b as number, t), [i, ms] as const);
const hold = (page: Page, i: number, ms: number) => page.evaluate(([b, t]) => (window as unknown as QaWindow).__qaGamepad.hold(b, t), [i, ms] as const);
const count = (page: Page, sel: string) => page.locator(sel).count();
const run = (page: Page) => page.evaluate(() => (window as unknown as QaWindow).__qa.run());
const inputMode = (page: Page) => page.evaluate(() => document.documentElement.dataset.input);

/**
 * Lleva el foco hasta un elemento usando solo la cruceta (o la palanca): mira dónde queda el destino
 * respecto a lo enfocado y pulsa hacia allí, como haría una persona. Devuelve false si no llega.
 */
function focusOn(page: Page, selector: string, stick = false): Promise<boolean> {
  return page.evaluate(
    async ([sel, useStick]) => {
      const pad = (window as unknown as QaWindow).__qaGamepad;
      const center = (el: Element) => {
        const r = el.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2, r.width, r.height];
      };
      const go = async (dir: 'U' | 'D' | 'L' | 'R') => {
        if (useStick) await pad.stick(dir === 'R' ? 0.9 : dir === 'L' ? -0.9 : 0, dir === 'D' ? 0.9 : dir === 'U' ? -0.9 : 0);
        else await pad.press({ U: 12, D: 13, L: 14, R: 15 }[dir]);
      };
      let stuck = 0;
      for (let i = 0; i < 60; i++) {
        const target = document.querySelector(sel);
        if (!target) return false;
        const from = document.activeElement;
        if (from === target) return true;
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
        if (stuck > 6) return false;
      }
      return document.activeElement === document.querySelector(sel);
    },
    [selector, stick] as const,
  );
}

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

export async function gamepadSuite(browser: Browser, url: string, check: Check, problems: string[], shot: (page: Page, name: string) => Promise<unknown>): Promise<void> {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
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

  // ── el sobre → el plano → la obra ──
  const toTable = async () => {
    if (!(await focusOn(page, '#go'))) return false;
    await A();
    if (!(await focusOn(page, '#routes .choice.pick'))) return false;
    await A();
    await page.waitForSelector('.table-screen');
    await settled(page);
    return (await run(page))?.phase === 'battle';
  };
  check(await toTable(), 'sobre → plano → ruta → mesa, todo con A y la cruceta');

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
  check((await count(page, '.lupa')) === 1, 'RB abre la lupa de grabador sobre la carta enfocada');
  await B();
  check((await count(page, '.lupa')) === 0, 'B cierra la lupa');
  check((await count(page, '.actions .kh.pd:visible, .bar .kh.pd:visible')) >= 3, 'la mesa enseña insignias de botón (LB, RT, Start, B…)');
  await shot(page, 'mando-mesa');

  // ── andamio con Y ──
  const inReserve = await count(page, '#reserve .card');
  check(await focusOn(page, '#hand .card'), 'el foco vuelve a una carta de la mano');
  await press(page, BTN.Y);
  await page.waitForTimeout(250);
  await settled(page);
  check((await count(page, '#reserve .card')) === inReserve + 1, 'Y guarda la carta enfocada en el andamio');

  // ── la obra entera: el bot decide, el mando ejecuta ──
  let turns = 0;
  let undone = false;
  let navFails = 0;
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
    } else if (action.type === 'discard') {
      ok = (await select(action.cards!)) && (await focusOn(page, '#btn-discard', stick));
      if (ok) await A();
    } else await press(page, BTN.X); // pasar
    if (!ok) {
      navFails++;
      if (navFails > 3) break;
      continue;
    }
    await page.waitForTimeout(150);
    await settled(page);
    // una vez, tras el primer golpe: LT deshace con la tiza de replanteo
    if (!undone && action.type === 'attack' && (await run(page))?.phase === 'battle' && (await page.locator('#btn-undo').isEnabled())) {
      const hp = await page.locator('.tower .hp span').allTextContents();
      await press(page, BTN.LT);
      await page.waitForTimeout(300);
      await settled(page);
      const back = await page.locator('.tower .hp span').allTextContents();
      check(hp.join() !== back.join() && (await page.locator('#btn-undo').isDisabled()), 'LT gasta la tiza de replanteo y deshace el golpe');
      undone = true;
    }
  }
  check(navFails === 0, `la cruceta y la palanca llegan siempre a la carta y a la torre que tocan${navFails ? ` (${navFails} fallos)` : ''}`);
  check(undone, 'la tiza se probó con LT durante la obra');
  await page.waitForFunction(() => !document.querySelector('.table-screen'), null, { timeout: 20_000 }).catch(() => undefined);
  const after = await run(page);
  check(after?.phase === 'reward', `la obra 1 se gana jugando solo con el mando (${turns} turnos${after ? `, fase «${after.phase}»` : ''})`);
  await shot(page, 'mando-cobro');

  // ── cobro: elegir una carta ──
  if (after?.phase === 'reward') {
    check(await focusOn(page, '#picks .choice.pick'), 'en el cobro, el foco llega a la selección');
    await A();
    await page.waitForTimeout(300);
    check((await run(page))?.phase === 'shop', 'A elige la carta y abre la ferretería');
  }

  // ── ferretería: reordenar el cinturón y forjar una carta ──
  if ((await run(page))?.phase === 'shop') {
    await page.evaluate(() => (window as unknown as QaWindow).__qa.boost());
    const tools = (await run(page))!.tools;
    check((await focusOn(page, '.run-belt .belt-slot[data-slot="0"]')) && true, 'el foco llega al cinturón');
    await A();
    check(await focusOn(page, '.run-belt .belt-slot[data-slot="1"]'), 'y a su segundo hueco');
    await A();
    await page.waitForTimeout(200);
    const reordered = (await run(page))!.tools;
    check(reordered[0] === tools[1] && reordered[1] === tools[0], 'A sobre una herramienta y A sobre otro hueco las cambia de sitio');
    const marks = (await run(page))!.marks;
    check(await focusOn(page, '#offers .choice.pick:has(.card[data-id^="forja-"])'), 'el foco llega a la oferta de forja');
    await A();
    await page.waitForSelector('.pending-modal');
    check(await focusOn(page, '.pending-modal .card.pickable'), 'en la mesa de forja, el foco llega a una carta del mazo');
    await A();
    await page.waitForTimeout(400);
    check((await run(page))!.marks === marks + 1, 'A estampa la marca en la carta elegida');
    await shot(page, 'mando-forja');
    await B();
    await page.waitForTimeout(200);
    check((await count(page, '.modal')) === 0 && (await focusIsSane(page)), 'B cierra la carta forjada y no queda ninguna ventana atrapando el foco');
    check(await focusOn(page, '#go'), 'el foco llega a «Al plano» para seguir la campaña');
  }

  // ── un hallazgo en los cimientos: se elige con el mando y la campaña sigue ──
  await page.evaluate(() => (window as unknown as QaWindow).__qa.go('hallazgo'));
  await page.waitForSelector('.run.event');
  check(await focusOn(page, '#opts .opt:nth-child(2)'), 'en un hallazgo, el foco llega a sus opciones');
  await press(page, BTN.UP);
  await press(page, BTN.DOWN);
  check(await focusIsSane(page), 'el foco se mueve entre las opciones del hallazgo sin perderse');
  check(await focusOn(page, '#opts .opt:nth-child(2)'), 'y vuelve a la opción elegida');
  await A();
  await page.waitForTimeout(400);
  check((await run(page))?.phase !== 'event', 'A resuelve el hallazgo y la campaña sigue');
  check(await focusIsSane(page), 'tras el hallazgo el foco sigue en la pantalla');
  await shot(page, 'mando-hallazgo');

  // ── las indicaciones siguen al último dispositivo usado ──
  check((await inputMode(page)) === 'pad', 'jugando con mando, las indicaciones son de mando');
  await page.keyboard.press('ArrowDown');
  check((await inputMode(page)) === 'keys', 'al tocar el teclado pasan a ser de teclado');
  await page.mouse.move(400, 300);
  await page.mouse.move(420, 320);
  check((await inputMode(page)) === 'pointer', 'y al mover el ratón desaparecen');
  await press(page, BTN.DOWN);
  check((await inputMode(page)) === 'pad', 'un toque del mando las devuelve');
  await context.close();
}
