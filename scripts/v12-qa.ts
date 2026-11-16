// V12 · juice-ux, bloque A: lo nuevo de la entrada, jugado de verdad en la prueba de humo (npm run qa:smoke).
//
//   · Mejor jugada con teclado (Q), ratón (#btn-mejor) y mando (LT): elige las cartas y el trono que dice el motor
//     (`mejorJugada`) y no golpea; responde en el mismo fotograma.
//   · AUTO: Auto-saquear y Auto-taberna desde Ajustes; se enciende con A en el Sobre y juega solo hasta la mesa; se
//     apaga con un clic, una tecla y un botón del mando (cinco veces cada uno, con su tiempo: ≤ 50 ms), lo programado
//     no sigue; la velocidad no lo apaga; y luego juega la campaña entera a 8× (huesos incluidos) y se apaga al ganar.
//   · AUTO apagado, con su razón, en el Asalto diario.
//   · El Árbol de la Conjura de punta a punta con el mando y con el teclado: el foco recorre los nodos (navegar no
//     compra), A elige y lleva a «Comprar», A compra, B vuelve al nodo, B sale; gatillos y + / − amplían; la palanca
//     derecha y Mayús + flechas mueven la vista.
// Para que la campaña de AUTO llegue al final, la Vida se repone desde la prueba (__qaJuice.heal, sin eventos de
// entrada: AUTO no se entera). Nada de esto toca el guardado real (?qa y perfiles limpios de Playwright).
import type { Browser, Page } from 'playwright';
import { BTN, LOCALE, T, VIRTUAL_GAMEPAD, focusOn, press } from './gamepad-qa';
import { NAME_SHIM } from './web';

type Check = (ok: unknown, what: string) => void;
type Mejor = { cards: string[]; target: string; total: number; exacto: boolean } | null;
type AutoQa = { on: boolean; saquear: boolean; taberna: boolean; speed: number; pasos: number; mesa: number; campana: number; rituales: number; pausas: string[]; apagados: { por: string; dom: number; visible: number; en: number }[] };
interface W {
  __qa: { go(s: string): Promise<boolean>; seed(t: string): void; run(): { phase: string; stage: number; gold: number } | null };
  __qaJuice: { heal(): boolean; mejor(): Mejor; mesa(): { selected: string[]; turn: number; phase: string | null }; auto(): AutoQa; meta(): { renown: number; up: Record<string, number> }; arbol(): { zum: number; nivel: string } };
  __qaGamepad: { pad: { buttons: { pressed: boolean; touched: boolean; value: number }[]; axes: number[] }; connect(): void };
}
const w = () => window as unknown as W;
const go = (page: Page, s: string) => page.evaluate((x) => (window as unknown as W).__qa.go(x), s);
const juice = <K extends keyof W['__qaJuice']>(page: Page, k: K) => page.evaluate((key) => (window as unknown as W).__qaJuice[key as keyof W['__qaJuice']]() as unknown, k as string) as Promise<ReturnType<W['__qaJuice'][K]>>;
const run = (page: Page) => page.evaluate(() => (window as unknown as W).__qa.run());
const count = (page: Page, sel: string) => page.locator(sel).count();
const active = (page: Page, sel: string) => page.evaluate((s) => !!document.activeElement?.matches(s), sel);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};
const ms = (n: number) => `${n.toFixed(1)} ms`;
void w;

/** Un contexto limpio con el mando virtual conectado, en ?qa. */
async function padPage(browser: Browser, url: string, problems: string[], tag: string): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
  await ctx.addInitScript({ content: NAME_SHIM });
  await ctx.addInitScript({ content: VIRTUAL_GAMEPAD });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${tag}] error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`[${tag}] consola: ${m.text()}`));
  await page.goto(`${url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as Partial<W>).__qa && !!(window as unknown as Partial<W>).__qaJuice);
  await page.evaluate(() => (window as unknown as W).__qaGamepad.connect());
  return { page, close: () => ctx.close() };
}

// ───────────────────────── Mejor jugada ─────────────────────────

/** Mejor jugada con `how` en la mesa de QA: elige lo que dice el motor, apunta su trono y no golpea. */
export async function mejorSuite(page: Page, how: 'keys' | 'mouse' | 'pad', check: Check, speed?: 8): Promise<void> {
  await go(page, 'mesa');
  // el humo rápido golpea a 8× (la Mejor jugada de la mesa de QA es una cadena larga que a 1× tarda ≈ 12 s en animarse)
  if (speed) await page.evaluate((v) => (window as unknown as { __qaJuice: { autoOpts(o: { speed: number }): void } }).__qaJuice.autoOpts({ speed: v }), speed);
  await page.waitForTimeout(250);
  // se suelta la selección de la mesa de QA (el trío de sietes)
  if (how === 'pad') await press(page, BTN.B);
  else if (how === 'keys') await page.keyboard.press('Escape');
  else await page.locator('#btn-clear').click();
  const m = await juice(page, 'mejor');
  check(!!m && m.cards.length > 0, `[${how}] la mesa de QA tiene una Mejor jugada (${m ? `${m.cards.length} cartas contra ${m.target}, Golpe ${m.total}${m.exacto ? ', exacto' : ''}` : 'ninguna'})`);
  if (!m) return;
  const hp0 = await page.locator('.tower .hp span').allTextContents();
  const mesa0 = await juice(page, 'mesa');
  let lag = -1;
  if (how === 'mouse') await page.locator('#btn-mejor').click();
  else
    lag = await page.evaluate(async (pad) => {
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      const t0 = performance.now();
      if (pad) (window as unknown as W).__qaGamepad.pad.buttons[6] = { pressed: true, touched: true, value: 1 };
      else dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true }));
      while (!document.querySelector('.handrow .card.mejor') && performance.now() - t0 < 600) await frame();
      const dt = document.querySelector('.handrow .card.mejor') ? performance.now() - t0 : -1;
      if (pad) (window as unknown as W).__qaGamepad.pad.buttons[6] = { pressed: false, touched: false, value: 0 };
      await frame();
      await frame();
      return dt;
    }, how === 'pad');
  await page.waitForTimeout(150);
  const mesa1 = await juice(page, 'mesa');
  const marked = await page.locator('.handrow .card.mejor').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id ?? ''));
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const key = how === 'pad' ? 'LT' : how === 'keys' ? 'Q' : 'clic';
  check(same(mesa1.selected, m.cards) && same(marked, m.cards), `[${how}] ${key} elige justo las cartas de la Mejor jugada (${mesa1.selected.length} elegidas, ${marked.length} con su marca)`);
  check((await count(page, `.tower[data-suit="${m.target}"].mejor`)) === 1, `[${how}] y apunta su trono (${m.target}), que lleva la marca`);
  const hp1 = await page.locator('.tower .hp span').allTextContents();
  check(hp0.join() === hp1.join() && mesa1.turn === mesa0.turn && mesa1.phase === 'playing' && (await count(page, '.handrow.locked')) === 0, `[${how}] Mejor jugada no golpea: la Vida de los tronos y el turno siguen igual`);
  if (how !== 'mouse') check(lag >= 0 && lag < 50, `[${how}] responde en el mismo fotograma (${lag < 0 ? 'no respondió' : ms(lag)})`);
  if (how === 'pad') {
    const badge = await page.evaluate(() => [...document.querySelectorAll('#btn-mejor .kh')].map((k) => `${k.classList.contains('pd') ? 'pd' : 'kb'}:${k.textContent}`).join(' '));
    check(badge.includes('pd:LT') && badge.includes('kb:Q'), `«Mejor jugada» lleva sus insignias LT y Q (${badge})`);
    const vis = await page.evaluate(() => {
      const k = document.querySelector<HTMLElement>('#btn-mejor .kh.pd');
      return !!k && getComputedStyle(k).display !== 'none' && k.getBoundingClientRect().width > 0;
    });
    check(vis, 'con el mando, la insignia LT se ve en el botón');
  }
  // Golpear confirma: la jugada que eligió Mejor jugada se puede golpear
  if (how === 'keys') {
    await page.keyboard.press('Space');
    await page.waitForFunction(() => !document.querySelector('.handrow.locked'), null, { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    const hp2 = await page.locator('.tower .hp span').allTextContents();
    check(hp2.join() !== hp1.join(), '[keys] tras Mejor jugada, Espacio (Golpear) confirma y el golpe entra');
  }
}

// ───────────────────────── AUTO ─────────────────────────

/**
 * Cinco apagados de AUTO con un método (`veces`: el humo rápido hace uno); devuelve los tiempos (ms) del evento de
 * entrada al botón apagado y pintado.
 */
export async function apagados(page: Page, how: 'clic' | 'tecla' | 'mando', check: Check, veces = 5): Promise<number[]> {
  const out: number[] = [];
  let leftovers = 0;
  for (let i = 0; i < veces; i++) {
    if (!(await juice(page, 'auto')).on) await page.keyboard.press('a');
    await page.waitForTimeout(260 + i * 90); // AUTO a mitad de lo suyo (pausa, cartas elegidas o mesa animando)
    const n0 = (await juice(page, 'auto')).apagados.length;
    let dt = -1;
    if (how === 'clic') {
      const log = await page.locator('#log').boundingBox();
      await page.mouse.click((log?.x ?? 1200) + 20, (log?.y ?? 400) + 20);
    } else if (how === 'tecla') await page.keyboard.press('ArrowDown');
    else
      dt = await page.evaluate(async () => {
        const g = (window as unknown as W).__qaGamepad;
        const frame = () => new Promise((r) => requestAnimationFrame(r));
        const btn = document.getElementById('btn-auto')!;
        const n0 = (window as unknown as W).__qaJuice.auto().apagados.length;
        const t0 = performance.now();
        g.pad.buttons[13] = { pressed: true, touched: true, value: 1 };
        while (btn.getAttribute('aria-pressed') !== 'false' && performance.now() - t0 < 600) await frame();
        const off = btn.getAttribute('aria-pressed') === 'false';
        await frame(); // el fotograma en el que ya se ve apagado
        await frame();
        // como el clic y la tecla: el registro del juego (el fotograma siguiente al cambio en el DOM), contado
        // desde que la prueba pulsó el botón (incluye lo que tarda el juego en leer el mando)
        const reg = (window as unknown as W).__qaJuice.auto().apagados;
        const t = reg.length > n0 ? reg[reg.length - 1].en - t0 : performance.now() - t0;
        g.pad.buttons[13] = { pressed: false, touched: false, value: 0 };
        await frame();
        await frame();
        return off ? t : -1;
      });
    await page.waitForTimeout(80);
    const a = await juice(page, 'auto');
    if (how !== 'mando') {
      const e = a.apagados[a.apagados.length - 1];
      dt = a.apagados.length > n0 && e ? e.visible : -1;
    }
    const pasos = a.pasos;
    await page.waitForTimeout(1100);
    const b = await juice(page, 'auto');
    if (b.on || b.pasos !== pasos || (await page.locator('#btn-auto').getAttribute('aria-pressed')) !== 'false') leftovers++;
    out.push(dt);
  }
  check(out.every((x) => x >= 0) && leftovers === 0, `AUTO se apaga con ${how === 'clic' ? 'un clic' : how === 'tecla' ? 'una tecla' : 'un botón del mando'} ${veces === 1 ? 'a la primera' : `las ${veces} veces`}, y lo que tenía programado no sigue${leftovers ? ` (${leftovers} veces siguió)` : ''}`);
  return out;
}

export async function autoSuite(browser: Browser, url: string, check: Check, problems: string[]): Promise<{ mediana: number; max: number; campana: number }> {
  const { page, close } = await padPage(browser, url, problems, 'auto');
  await page.evaluate(() => (window as unknown as W).__qa.seed('AUTO-QA'));
  // ── Ajustes: Auto-saquear y Auto-taberna (apagados de serie) ──
  check(!(await juice(page, 'auto')).on, 'AUTO arranca apagado');
  await page.locator('#m-set').click();
  const a0 = await juice(page, 'auto');
  check(!a0.saquear && !a0.taberna, 'Auto-saquear y Auto-taberna vienen apagados de serie');
  await page.locator('#set-toggles .set-auto-saquear button').click();
  await page.locator('#set-toggles .set-auto-taberna button').click();
  const a1 = await juice(page, 'auto');
  check(a1.saquear && a1.taberna, `Ajustes enciende Auto-saquear y Auto-taberna («${T('auto.saquear.nombre')}», «${T('auto.taberna.nombre')}»)`);
  await page.keyboard.press('Escape');
  // ── nueva campaña; un perfil nuevo pasa por la partida guiada (se salta) ──
  await page.locator('#m-camp').click();
  await page.locator('#new').click();
  await page.waitForSelector('.table-screen');
  check((await count(page, '#btn-auto')) === 0, 'en la partida guiada no hay botón AUTO');
  await page.locator('#btn-leave').click();
  await page.waitForSelector('.run');
  check((await run(page))?.phase === 'pack', 'saltar la guía lleva al Sobre');
  // ── A enciende AUTO en el Sobre: abre el Sobre, elige ruta y entra solo a la mesa ──
  await page.keyboard.press('a');
  const toast = (await page.locator('.toast').last().textContent().catch(() => '')) ?? '';
  check((await juice(page, 'auto')).on && toast.includes(T('ui.auto.on').split(':')[0]), `la tecla A enciende AUTO fuera de la mesa y lo dice («${toast.trim()}»)`);
  await page.waitForSelector('.table-screen', { timeout: 20_000 }).catch(() => undefined);
  await page.waitForFunction(() => document.getElementById('btn-auto')?.getAttribute('aria-pressed') === 'true', null, { timeout: 10_000 }).catch(() => undefined);
  check((await run(page))?.phase === 'battle' && (await page.locator('#btn-auto').getAttribute('aria-pressed')) === 'true', 'AUTO abre el Sobre, elige ruta y entra a la mesa con su botón encendido');
  {
    const badge = await page.evaluate(() => [...document.querySelectorAll('#btn-auto .kh')].map((k) => k.textContent).join(' '));
    check(badge.includes('Select') && badge.includes('A'), `el botón AUTO lleva sus insignias (A y Select: ${badge})`);
  }
  // ── se apaga con cualquier entrada, al instante ──
  const tiempos = [...(await apagados(page, 'clic', check)), ...(await apagados(page, 'tecla', check)), ...(await apagados(page, 'mando', check))];
  const buenos = tiempos.filter((x) => x >= 0);
  const med = median(buenos);
  const max = Math.max(...buenos);
  console.log(`  apagar AUTO (del evento al fotograma pintado): ${tiempos.map((x) => (x < 0 ? '—' : x.toFixed(1))).join(' · ')} ms`);
  check(buenos.length === 15 && max <= 50, `el control vuelve en ≤ 50 ms tras un clic, una tecla y un botón (mediana ${ms(med)}, máximo ${ms(max)}, 15 medidas)`);
  // ── la velocidad no lo apaga; 8× en el ciclo ──
  await page.keyboard.press('a');
  check((await juice(page, 'auto')).on, 'A vuelve a encender AUTO en la mesa');
  for (let i = 0; i < 4 && !((await page.locator('#btn-speed').textContent()) ?? '').includes('8×'); i++) {
    // pointerdown + clic sobre el propio botón (con AUTO jugando, el clic de Playwright a veces cae en el vecino)
    await page.locator('#btn-speed').dispatchEvent('pointerdown');
    await page.locator('#btn-speed').dispatchEvent('click');
  }
  const speed = (await page.locator('#btn-speed').textContent()) ?? '';
  check(speed.includes('8×') && (await juice(page, 'auto')).on, `el botón de velocidad llega a 8× y no apaga AUTO (${speed.replace(/\s+/g, ' ').trim()})`);
  // ── la campaña entera, a 8×, con Auto-saquear y Auto-taberna ──
  const t0 = Date.now();
  const fases: string[] = [];
  let desde = Date.now();
  let r = await run(page);
  // con tope por debajo del de la sección (170 s): la campaña a 8× tarda ≈ 85 s
  while (Date.now() - t0 < 140_000) {
    await page.evaluate(() => (window as unknown as W).__qaJuice.heal());
    r = await run(page);
    const k = `${r?.phase}:${r?.stage}`;
    if (fases[fases.length - 1] !== k) {
      fases.push(k);
      desde = Date.now();
    } else if (Date.now() - desde > 60_000) {
      // atascado un minuto en la misma pantalla: se dice por qué y se deja
      console.log(`  AUTO atascado en ${k}: ${JSON.stringify(await page.evaluate(() => (window as unknown as { __qaJuice: { autoDiag(): unknown } }).__qaJuice.autoDiag()))}`);
      break;
    }
    const a = await juice(page, 'auto');
    if (!a.on || r?.phase === 'won' || r?.phase === 'lost') break;
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(600);
  const fin = await juice(page, 'auto');
  r = await run(page);
  const secs = (Date.now() - t0) / 1000;
  const asaltos = [...new Set(fases.filter((f) => f.startsWith('battle:')).map((f) => f.split(':')[1]))];
  console.log(`  AUTO a 8×: ${secs.toFixed(0)} s · ${fin.mesa} jugadas · ${fin.campana} pasos de campaña · ${fin.rituales} tiradas · pausas: ${fin.pausas.join(', ') || 'ninguna'} · ${fases.join(' → ')}`);
  check(r?.phase === 'won' && asaltos.length === 5, `AUTO juega la campaña entera con Auto-saquear y Auto-taberna y la gana (asaltos ${asaltos.join(', ')}; fase «${r?.phase}», ${secs.toFixed(0)} s)`);
  check(!fin.on && (await count(page, '#auto-aviso')) === 0, 'al acabar la campaña, AUTO se apaga solo');
  check(fin.rituales >= 4 && fin.pausas.length === 0, `con AUTO la tirada de huesos se tira sola (${fin.rituales} tiradas) y con las dos opciones no se para nunca (${fin.pausas.length} pausas)`);
  // la ruta la elige AUTO: los Secretos salen o no según el camino (se cuentan, no se exigen)
  const secretos = fases.filter((f) => f.startsWith('event:')).length;
  check(fases.some((f) => f.startsWith('shop:')) && fases.some((f) => f.startsWith('reward:')), `por el camino AUTO pasó por el Botín y La Taberna (y por ${secretos} Secreto${secretos === 1 ? '' : 's'})`);
  await close();
  return { mediana: med, max, campana: secs };
}

/** AUTO sin Auto-saquear: espera en el Botín con su aviso, y lo que hace el jugador ahí no lo apaga. */
export async function autoPausaSuite(browser: Browser, url: string, check: Check, problems: string[]): Promise<void> {
  const { page, close } = await padPage(browser, url, problems, 'auto-pausa');
  await go(page, 'cobro');
  await page.waitForSelector('.run');
  // la tirada (si la hay) primero
  await page.evaluate(() => document.getElementById('ritual')?.remove());
  await page.keyboard.press('a');
  await page.waitForTimeout(700);
  const aviso = (await page.locator('#auto-aviso').textContent().catch(() => '')) ?? '';
  const a = await juice(page, 'auto');
  check(a.on && aviso === T('auto.pausa.botin'), `sin Auto-saquear, AUTO espera en el Botín con su aviso de una línea («${aviso}»)`);
  const lines = await page.evaluate(() => {
    const el = document.getElementById('auto-aviso');
    if (!el) return 0;
    const cs = getComputedStyle(el);
    return Math.round((el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / parseFloat(cs.lineHeight));
  });
  check(lines === 1, `el aviso ocupa una sola línea (${lines})`);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  check((await juice(page, 'auto')).on, 'en la pausa, lo que hace el jugador no apaga AUTO (espera a que elija)');
  await page.keyboard.press('a');
  await page.waitForTimeout(150);
  check(!(await juice(page, 'auto')).on && (await count(page, '#auto-aviso')) === 0, 'y A lo apaga, con el aviso');
  await close();
}

/** En el Asalto diario no hay AUTO: el botón sale apagado con su razón y ni A ni Select lo encienden. */
export async function autoDiariaSuite(browser: Browser, url: string, check: Check, problems: string[]): Promise<void> {
  const { page, close } = await padPage(browser, url, problems, 'diaria');
  await page.locator('#m-daily').click();
  await page.waitForSelector('.table-screen, .run');
  if (await count(page, '.table-screen #btn-leave')) {
    await page.locator('#btn-leave').click();
    await page.waitForSelector('.run');
  }
  await page.keyboard.press('a');
  await page.waitForTimeout(150);
  const said = (await page.locator('.toast').last().textContent().catch(() => '')) ?? '';
  check(!(await juice(page, 'auto')).on && said.includes(T('auto.pausa.diaria')), `en el Asalto diario, A no enciende AUTO y dice por qué («${said.trim()}»)`);
  await page.locator('#go').click();
  await page.locator('#routes .choice.pick').first().click();
  await page.waitForSelector('.table-screen');
  await page.waitForTimeout(400);
  const b = await page.evaluate(() => {
    const el = document.querySelector<HTMLButtonElement>('#btn-auto');
    return el ? { disabled: el.disabled, pressed: el.getAttribute('aria-pressed'), label: el.getAttribute('aria-label') ?? '', tip: el.dataset.tip ?? '' } : null;
  });
  check(b?.disabled && b.pressed === 'false' && b.label.includes(T('auto.pausa.diaria')), `en la mesa del diario el botón AUTO sale apagado con su razón («${b?.label ?? 'sin botón'}»)`);
  await press(page, BTN.SELECT);
  await page.waitForTimeout(150);
  check(!(await juice(page, 'auto')).on, 'y Select en el mando tampoco lo enciende');
  await close();
}

// ───────────────────────── El Árbol de la Conjura ─────────────────────────

/** El Árbol de punta a punta con el mando o con el teclado. */
export async function arbolSuite(browser: Browser, url: string, how: 'pad' | 'keys', check: Check, problems: string[]): Promise<void> {
  const { page, close } = await padPage(browser, url, problems, `árbol-${how}`);
  const tag = `[Árbol · ${how === 'pad' ? 'mando' : 'teclado'}]`;
  const key = async (k: 'U' | 'D' | 'L' | 'R' | 'A' | 'B' | 'in' | 'out') => {
    if (how === 'pad') await press(page, { U: BTN.UP, D: BTN.DOWN, L: BTN.LEFT, R: BTN.RIGHT, A: BTN.A, B: BTN.B, in: BTN.RT, out: BTN.LT }[k]);
    else await page.keyboard.press({ U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight', A: 'Enter', B: 'Escape', in: '+', out: '-' }[k]);
    await page.waitForTimeout(60);
  };
  await go(page, 'gremio');
  await page.waitForSelector('.arbol-vista');
  const meta0 = await juice(page, 'meta');
  await key('D');
  check(await active(page, '.arbol [data-nodo][aria-current]'), `${tag} el primer toque enciende el foco en el nodo elegido (no en «Comprar»)`);
  // navegar no compra: la cruceta recorre los nodos y el panel sigue al foco
  const path: string[] = [];
  let follow = 0;
  for (const d of ['R', 'R', 'D', 'L', 'L', 'U', 'U', 'R'] as const) {
    await key(d);
    const at = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return { nodo: a?.dataset.nodo ?? (a?.hasAttribute('data-raiz') ? 'raíz' : `fuera:${a?.id || a?.className}`), elegido: a?.getAttribute('aria-current') === 'true' };
    });
    path.push(at.nodo);
    if (at.elegido) follow++;
  }
  const meta1 = await juice(page, 'meta');
  check(path.filter((p) => !p.startsWith('fuera')).length >= 6, `${tag} la cruceta va de nodo en nodo (${path.join(' → ')})`);
  check(follow >= 6, `${tag} el nodo enfocado queda elegido en el panel (${follow} de ${path.length})`);
  check(meta1.renown === meta0.renown && JSON.stringify(meta1.up) === JSON.stringify(meta0.up), `${tag} navegar no compra nada (saldo ${meta0.renown} → ${meta1.renown})`);
  // a un nodo que se pueda comprar
  const id = await page.evaluate(() => document.querySelector<HTMLElement>('.nodo.es-comprable')?.dataset.nodo ?? '');
  let reached = false;
  if (how === 'pad') reached = await focusOn(page, `.nodo[data-nodo="${id}"]`);
  else
    for (let i = 0; i < 40 && !reached; i++) {
      reached = await active(page, `.nodo[data-nodo="${id}"]`);
      if (reached) break;
      const d = await page.evaluate((s) => {
        const a = document.activeElement!.getBoundingClientRect();
        const b = document.querySelector(s)!.getBoundingClientRect();
        const dx = b.left + b.width / 2 - (a.left + a.width / 2);
        const dy = b.top + b.height / 2 - (a.top + a.height / 2);
        return Math.abs(dy) > Math.max(a.height, b.height) * 0.5 ? (dy > 0 ? 'D' : 'U') : dx > 0 ? 'R' : 'L';
      }, `.nodo[data-nodo="${id}"]`);
      await key(d as 'U');
    }
  check(!!id && reached, `${tag} el foco llega a un nodo que se puede comprar («${id}»)`);
  const r0 = meta1.up[id] ?? 0;
  await key('A');
  check((await active(page, '#arbol-comprar')) && (await page.evaluate((x) => document.querySelector(`.nodo[data-nodo="${x}"]`)?.getAttribute('aria-current') === 'true', id)), `${tag} A / Enter sobre el nodo lo elige y lleva el foco a «Comprar»`);
  check(((await juice(page, 'meta')).up[id] ?? 0) === r0, `${tag} todavía sin comprar`);
  await key('A');
  await page.waitForTimeout(250);
  const meta2 = await juice(page, 'meta');
  check((meta2.up[id] ?? 0) === r0 + 1 && meta2.renown < meta1.renown, `${tag} A / Enter en «Comprar» compra un rango (${id} ${r0} → ${meta2.up[id] ?? 0}; saldo ${meta1.renown} → ${meta2.renown})`);
  check(await active(page, '#arbol-comprar'), `${tag} tras comprar, el foco sigue en «Comprar» (otro rango, otro A)`);
  await key('B');
  check(await active(page, `.nodo[data-nodo="${id}"]`), `${tag} B / Esc desde «Comprar» vuelve al nodo`);
  // ampliar y alejar alrededor del nodo enfocado
  const z0 = (await juice(page, 'arbol')).zum;
  await key('in');
  await key('in');
  const z1 = (await juice(page, 'arbol')).zum;
  check(z1 > z0 && (await active(page, '[data-nodo]')), `${tag} ${how === 'pad' ? 'RT' : '+'} amplía (zum ${z0} → ${z1.toFixed(2)}) sin perder el foco`);
  // mover la vista: palanca derecha o Mayús + flechas
  const pos = () => page.evaluate(() => document.querySelector<HTMLElement>('.arbol-raiz')?.style.transform ?? '');
  const p0 = await pos();
  if (how === 'pad')
    await page.evaluate(async () => {
      const g = (window as unknown as W).__qaGamepad;
      g.pad.axes[2] = 0.9;
      await new Promise((r) => setTimeout(r, 300));
      g.pad.axes[2] = 0;
      await new Promise((r) => requestAnimationFrame(r));
    });
  else for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
  const p1 = await pos();
  check(p0 !== p1, `${tag} ${how === 'pad' ? 'la palanca derecha' : 'Mayús + flechas'} mueve la vista del Árbol`);
  await key('out');
  await key('out');
  const z2 = (await juice(page, 'arbol')).zum;
  check(z2 < z1, `${tag} ${how === 'pad' ? 'LT' : '−'} aleja (zum ${z1.toFixed(2)} → ${z2.toFixed(2)})`);
  // ninguna ventana atrapa: B / Esc sale del Árbol
  if (!(await active(page, '[data-nodo], [data-raiz]'))) await key('D');
  await key('B');
  await page.waitForTimeout(250);
  check((await count(page, '.arbol-vista')) === 0, `${tag} B / Esc desde un nodo sale del Árbol`);
  await close();
}
