// Humo rápido (npm run qa:smoke -- --fast): una pasada de menos de 60 s de reloj, construcción incluida, por lo que
// se puede romper sin avisar. No sustituye al humo completo (npm run qa:smoke:todo): es la puerta de cada vuelta del
// bucle de versiones.
//
//   · arranque sin errores de página ni de consola, y en el idioma del navegador
//   · la portada con su marca
//   · un golpe con el ratón, otro con el teclado y otro con el mando
//   · Mejor jugada (Q) + Golpear (Espacio)
//   · lo que cae llega a la bolsa y la bolsa cuadra
//   · una compra en el Árbol de la Conjura con el teclado
//   · el interruptor de idioma con el teclado, sin recargar
//   · AUTO: se apaga con un clic, una tecla y un botón (una medida de cada, ≤ 50 ms) y juega el asalto 1 a 8× con
//     Auto-saquear y Auto-taberna hasta la tirada de huesos y el Botín
//   · al final, ningún error de página ni de consola en toda la pasada
//
// CÓMO SE AÑADE LA COMPROBACIÓN DE UNA VERSIÓN: una función `async function vNN_loQueSea(r: Rapido, e: Estado)` que
// llame a `r.check(…)` (una o pocas comprobaciones, sobre `e.page` o en un contexto propio que cierre ella misma) y
// una línea al final de COMPROBACIONES con su id, su presupuesto de segundos y la función. El resumen imprime los
// segundos de cada una contra su presupuesto; la suma de presupuestos más la construcción no pasa de 55 s.
import type { Browser, Page } from 'playwright';
import { BRAND } from '../src/shared/brand';
import { BTN, LANG, LOCALE, OTHER, T, VIRTUAL_GAMEPAD, langState, markPage, press, walkKeys } from './gamepad-qa';
import { apagados, mejorSuite } from './v12-qa';
import { NAME_SHIM } from './web';

type Check = (ok: unknown, what: string) => void;
export interface Rapido {
  browser: Browser;
  url: string;
  check: Check;
  problems: string[];
  out: string;
  /** Segundos que tardó la construcción (cuentan para los 60 s). */
  build: number;
  /** Cuándo empezó la invocación (Date.now()). */
  t0: number;
}
/** Lo que comparten las comprobaciones: la página de la pasada (perfil limpio, ?qa, mando virtual inyectado). */
export interface Estado {
  page: Page;
}
interface Comprobacion {
  id: string;
  /** Segundos que se le dan (solo se avisa si se pasa: el tope duro es el guardián de 150 s). */
  presupuesto: number;
  fn: (r: Rapido, e: Estado) => Promise<void>;
}

interface W {
  __qa: { go(s: string): Promise<boolean>; seed(t: string): void; run(): { phase: string; stage: number } | null };
  __qaJuice: {
    heal(): boolean;
    auto(): { on: boolean; saquear: boolean; taberna: boolean; rituales: number; pausas: string[] };
    meta(): { renown: number; up: Record<string, number> };
    bolsa(): { oro: number; esquirlas: number; ve: { oro: string; esquirlas: string } };
    autoOpts(o: { speed?: 1 | 2 | 4 | 8 }): void;
  };
  __qaIman: { estado(): { lanzadas: number; llegadas: number; vivas: number; esperan: number }; reset(): void };
  __qaGamepad: { connect(): void };
}
const go = (page: Page, s: string) => page.evaluate((x) => (window as unknown as W).__qa.go(x), s);
const run = (page: Page) => page.evaluate(() => (window as unknown as W).__qa.run());
const auto = (page: Page) => page.evaluate(() => (window as unknown as W).__qaJuice.auto());
const velocidad = (page: Page, speed: 1 | 2 | 4 | 8) => page.evaluate((v) => (window as unknown as W).__qaJuice.autoOpts({ speed: v }), speed);
const vidaH = (page: Page) => page.locator('.tower[data-suit="H"] .hp span').textContent();
/** La mesa vuelve a dejar jugar (con tope). */
const quieta = (page: Page) => page.waitForFunction(() => !document.querySelector('.handrow.locked') || !!document.querySelector('.end, .run, .modal'), null, { timeout: 15_000 });
/** Una cifra compacta de la bolsa a número (12 · 1,2K · 1.2K). */
const num = (s: string) => {
  const m = s.replace(/\s/g, '').match(/^([\d.,]+)([KM]?)$/i);
  if (!m) return NaN;
  return Math.round(parseFloat(m[1].replace(',', '.')) * (m[2].toUpperCase() === 'K' ? 1000 : m[2].toUpperCase() === 'M' ? 1e6 : 1));
};

/** Un perfil limpio de Playwright en ?qa con el mando virtual inyectado (sin conectar) y los errores apuntados. */
async function abre(r: Rapido, tag: string): Promise<Page> {
  const ctx = await r.browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
  await ctx.addInitScript({ content: NAME_SHIM });
  await ctx.addInitScript({ content: VIRTUAL_GAMEPAD });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15_000);
  page.on('pageerror', (e) => r.problems.push(`[${tag}] error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && r.problems.push(`[${tag}] consola: ${m.text()}`));
  await page.goto(`${r.url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as Partial<W>).__qa && !!(window as unknown as Partial<W>).__qaJuice && !!(window as unknown as Partial<W>).__qaIman);
  return page;
}

// ───────────────────────── las comprobaciones ─────────────────────────

async function arranque(r: Rapido, e: Estado): Promise<void> {
  const antes = r.problems.length;
  const t = Date.now();
  e.page = await abre(r, 'rápido');
  const ms = Date.now() - t;
  await e.page.waitForTimeout(250); // lo que la consola diga al terminar de arrancar
  r.check(r.problems.length === antes, `el juego arranca sin errores de página ni de consola (${ms} ms hasta los ganchos de QA)`);
  r.check((await e.page.evaluate(() => document.documentElement.lang)) === LANG, `sin nada guardado, el idioma sale del navegador (${LOCALE} → <html lang="${LANG}">)`);
}

async function portada(r: Rapido, { page }: Estado): Promise<void> {
  await go(page, 'portada');
  const title = await page.locator('.home h1.title').getAttribute('aria-label');
  const seal = (await page.locator('.home .brand-seal .seal-ribbon').textContent())?.trim();
  r.check(title === BRAND[LANG].title && seal === BRAND[LANG].emblema, `la portada enseña la marca dual: «${title}» con la cinta «${seal}»`);
  const menu = await page.evaluate(() => ['#m-camp', '#m-daily', '#m-tuto', '#m-guild', '#m-set', '#home-lang'].filter((s) => (document.querySelector(s)?.getBoundingClientRect().width ?? 0) > 0).length);
  r.check(menu === 6, `y su menú a la vista: Campaña, Asalto diario, Partida guiada, La Orden, Ajustes e idioma (${menu} de 6)`);
}

/** Un golpe con el trío de sietes de la mesa de QA contra el trono apuntado (a 8×, para no esperar a la animación). */
async function golpe(r: Rapido, { page }: Estado, how: 'ratón' | 'teclado' | 'mando'): Promise<void> {
  await go(page, 'mesa');
  await velocidad(page, 8);
  const hp0 = await vidaH(page);
  if (how === 'ratón') await page.locator('#btn-strike').click();
  else if (how === 'teclado') await page.keyboard.press('Space');
  else {
    await page.evaluate(() => (window as unknown as W).__qaGamepad.connect());
    if ((await page.evaluate(() => document.documentElement.dataset.input)) !== 'pad') await press(page, BTN.DOWN);
    await press(page, BTN.X);
  }
  await page.waitForTimeout(150);
  await quieta(page);
  const hp1 = await vidaH(page);
  const mano = await page.locator('#hand .card').count();
  const boton = { ratón: 'clic en «Golpear»', teclado: 'Espacio', mando: 'X en el mando' }[how];
  r.check(hp0 !== hp1 && mano >= 5, `[${how}] ${boton} golpea: la Vida del guardia ${hp0} → ${hp1} y la mano se repone (${mano} cartas)`);
  await velocidad(page, 1);
}

/** V19 · Steam Deck: con mando, la carta enfocada de la mano es la más grande de la fila; A la elige y la suelta. */
async function v16_foco(r: Rapido, { page }: Estado): Promise<void> {
  await go(page, 'mesa');
  await page.evaluate(() => (window as unknown as W).__qaGamepad.connect());
  await press(page, BTN.DOWN);
  await page.waitForTimeout(250);
  const lee = () =>
    page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('#hand .card[data-foco]');
      const otra = [...document.querySelectorAll<HTMLElement>('#hand .card')].find((x) => x !== c);
      const h = document.querySelector<HTMLElement>('.focus-ring .pad-hint');
      return {
        modo: document.documentElement.dataset.input,
        carta: !!c,
        elegida: !!c?.classList.contains('sel'),
        razon: c && otra ? c.getBoundingClientRect().width / otra.getBoundingClientRect().width : 0,
        pista: h && !h.hidden ? (h.textContent ?? '').trim() : '',
      };
    });
  let v = await lee();
  r.check(v.modo === 'pad' && v.carta && v.razon > 1.2 && !v.pista, `[v19] con mando, la carta enfocada es la más grande de la fila (×${v.razon.toFixed(2)}) y no lleva nada encima (pista: «${v.pista}»)`);
  const antes = v.elegida;
  await press(page, BTN.A);
  await page.waitForTimeout(150);
  v = await lee();
  r.check(v.carta && v.elegida !== antes, `[v19] A sobre la carta enfocada la ${antes ? 'suelta' : 'elige'}`);
}

async function mejorGolpear(r: Rapido, { page }: Estado): Promise<void> {
  // Q elige la Mejor jugada en el mismo fotograma y no golpea; Espacio (Golpear) la confirma (a 8×: el golpe de la
  // Mejor jugada de la mesa de QA es una cadena larga que a 1× tarda ≈ 12 s en animarse)
  await mejorSuite(page, 'keys', r.check, 8);
  await velocidad(page, 1);
}

async function loQueCae(r: Rapido, { page }: Estado): Promise<void> {
  await go(page, 'mesa');
  await velocidad(page, 8);
  await page.mouse.move(4, 400); // el cursor lejos: las recoge el imán
  await page.evaluate(() => (window as unknown as W).__qaIman.reset());
  const b0 = await page.evaluate(() => (window as unknown as W).__qaJuice.bolsa());
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  await quieta(page);
  await page.waitForFunction(() => {
    const s = (window as unknown as W).__qaIman.estado();
    return s.lanzadas > 0 && s.vivas === 0 && s.esperan === 0;
  }, null, { timeout: 8_000 }).catch(() => undefined);
  const s = await page.evaluate(() => (window as unknown as W).__qaIman.estado());
  const b1 = await page.evaluate(() => (window as unknown as W).__qaJuice.bolsa());
  r.check(s.lanzadas > 0 && s.llegadas === s.lanzadas && s.vivas === 0, `lo que cae de un golpe llega entero a la bolsa (${s.lanzadas} salen, ${s.llegadas} llegan)`);
  r.check(b1.esquirlas > b0.esquirlas && num(b1.ve.esquirlas) === b1.esquirlas && num(b1.ve.oro) === b1.oro, `y la bolsa cuadra con el saldo (esquirlas ${b0.esquirlas} → ${b1.esquirlas}, «${b1.ve.esquirlas}»; oro «${b1.ve.oro}» = ${b1.oro})`);
  await velocidad(page, 1);
}

async function arbolTeclado(r: Rapido, { page }: Estado): Promise<void> {
  const meta = () => page.evaluate(() => (window as unknown as W).__qaJuice.meta());
  const active = (sel: string) => page.evaluate((s) => !!document.activeElement?.matches(s), sel);
  await go(page, 'gremio');
  await page.waitForSelector('.arbol-vista');
  await page.keyboard.press('ArrowDown');
  const m0 = await meta();
  const id = await page.evaluate(() => document.querySelector<HTMLElement>('.nodo.es-comprable')?.dataset.nodo ?? '');
  let reached = false;
  for (let i = 0; i < 40 && id && !reached; i++) {
    reached = await active(`.nodo[data-nodo="${id}"]`);
    if (reached) break;
    // a lo voraz, como una persona: hacia donde queda el nodo
    const k = await page.evaluate((s) => {
      const a = document.activeElement!.getBoundingClientRect();
      const b = document.querySelector(s)!.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      return Math.abs(dy) > Math.max(a.height, b.height) * 0.5 ? (dy > 0 ? 'ArrowDown' : 'ArrowUp') : dx > 0 ? 'ArrowRight' : 'ArrowLeft';
    }, `.nodo[data-nodo="${id}"]`);
    await page.keyboard.press(k);
  }
  const m1 = await meta();
  r.check(!!id && reached && m1.renown === m0.renown, `[Árbol · teclado] las flechas llegan a un nodo que se puede comprar («${id}») sin comprar nada por el camino`);
  const r0 = m1.up[id] ?? 0;
  await page.keyboard.press('Enter');
  const enComprar = await active('#arbol-comprar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const m2 = await meta();
  r.check(enComprar && (m2.up[id] ?? 0) === r0 + 1 && m2.renown < m1.renown, `[Árbol · teclado] Enter lo elige y Enter en «Comprar» compra un rango (${id} ${r0} → ${m2.up[id] ?? 0}; saldo ${m1.renown} → ${m2.renown})`);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  r.check((await page.locator('.arbol-vista').count()) === 0, '[Árbol · teclado] Esc vuelve al nodo y otro Esc sale del Árbol');
}

async function idioma(r: Rapido, { page }: Estado): Promise<void> {
  await go(page, 'portada');
  await page.waitForSelector('#home-lang');
  await markPage(page);
  await page.keyboard.press('ArrowDown');
  for (const to of [OTHER, LANG]) {
    const reached = await walkKeys(page, `#home-lang [data-lang="${to}"]`);
    if (reached) await page.keyboard.press('Enter');
    await page.waitForTimeout(120);
    const s = await langState(page, '#home-lang', to);
    r.check(reached && s.lang === to && s.title === BRAND[to].title && s.same && s.focus, `[teclado] el interruptor de idioma pasa a ${to.toUpperCase()} al instante y sin recargar («${s.title}», «${s.tuto.trim().slice(0, 24)}»)`);
  }
}

/** AUTO en su propio perfil: se apaga al instante y juega el asalto 1 a 8× hasta la tirada de huesos y el Botín. */
async function autoAsalto(r: Rapido, e: Estado): Promise<void> {
  // la página de la pasada se cierra mientras se mide (otra página viva en el mismo navegador falsea los tiempos de
  // apagado) y se vuelve a abrir al acabar, para las comprobaciones que vengan detrás
  await e.page?.context().close();
  const page = await abre(r, 'rápido · AUTO');
  try {
    await page.evaluate(() => {
      const w = window as unknown as W;
      w.__qa.seed('AUTO-QA');
      w.__qaGamepad.connect();
    });
    await page.locator('#m-set').click();
    await page.locator('#set-toggles .set-auto-saquear button').click();
    await page.locator('#set-toggles .set-auto-taberna button').click();
    const a1 = await auto(page);
    r.check(a1.saquear && a1.taberna, `Ajustes enciende Auto-saquear y Auto-taberna («${T('auto.saquear.nombre')}», «${T('auto.taberna.nombre')}»)`);
    await page.keyboard.press('Escape');
    await page.locator('#m-camp').click();
    await page.locator('#new').click();
    await page.waitForSelector('.table-screen');
    await page.locator('#btn-leave').click();
    await page.waitForSelector('.run');
    await page.keyboard.press('a');
    await page.waitForSelector('.table-screen', { timeout: 15_000 }).catch(() => undefined);
    await page.waitForFunction(() => document.getElementById('btn-auto')?.getAttribute('aria-pressed') === 'true', null, { timeout: 10_000 }).catch(() => undefined);
    r.check((await run(page))?.phase === 'battle', 'A enciende AUTO en el Sobre y AUTO entra solo a la mesa');    // ── se apaga con un clic, una tecla y un botón: una medida de cada ──
    const tiempos = [...(await apagados(page, 'clic', r.check, 1)), ...(await apagados(page, 'tecla', r.check, 1)), ...(await apagados(page, 'mando', r.check, 1))];
    const max = Math.max(...tiempos);
    r.check(tiempos.length === 3 && tiempos.every((x) => x >= 0) && max <= 50, `el control vuelve en ≤ 50 ms tras un clic, una tecla y un botón (${tiempos.map((x) => (x < 0 ? '—' : x.toFixed(1))).join(' · ')} ms)`);
    // ── el asalto 1 a 8× con Auto-saquear y Auto-taberna ──
    await page.keyboard.press('a');
    await velocidad(page, 8);
    const t0 = Date.now();
    const fases: string[] = [];
    while (Date.now() - t0 < 45_000) {
      await page.evaluate(() => (window as unknown as W).__qaJuice.heal());
      const x = await run(page);
      const k = `${x?.phase}:${x?.stage}`;
      if (fases[fases.length - 1] !== k) fases.push(k);
      const a = await auto(page);
      // pasado el Botín: La Taberna del asalto 1 o más allá
      if (!a.on || (x?.stage ?? 0) > 1 || x?.phase === 'shop' || x?.phase === 'won' || x?.phase === 'lost') break;
      await page.waitForTimeout(200);
    }
    const fin = await auto(page);
    const secs = (Date.now() - t0) / 1000;
    r.check(fases.includes('battle:1') && fases.includes('reward:1') && fin.rituales >= 1 && fin.pausas.length === 0, `AUTO juega el asalto 1 a 8× y tira los huesos en el Botín sin pararse (${fin.rituales} tirada${fin.rituales === 1 ? '' : 's'}, ${fin.pausas.length} pausas, ${secs.toFixed(1)} s: ${fases.join(' → ')})`);
    r.check(fases.some((f) => f === 'shop:1' || /^(map|battle):2$/.test(f)), 'con Auto-saquear, AUTO coge el Botín y sigue hasta La Taberna');
  } finally {
    await page.context().close();
    e.page = await abre(r, 'rápido');
  }
}

async function sinErrores(r: Rapido): Promise<void> {
  const errores = r.problems.filter((p) => /error de página|consola:/.test(p));
  r.check(errores.length === 0, `ningún error de página ni de consola en toda la pasada${errores.length ? ` (${errores.length}: ${errores[0].slice(0, 80)})` : ''}`);
}

/** El orden importa: «arranque» abre la página que usan las siguientes. Las nuevas, al final (antes de «consola»). */
export const COMPROBACIONES: Comprobacion[] = [
  { id: 'arranque', presupuesto: 3, fn: arranque },
  { id: 'portada', presupuesto: 1, fn: portada },
  { id: 'golpe-raton', presupuesto: 4, fn: (r, e) => golpe(r, e, 'ratón') },
  { id: 'golpe-teclado', presupuesto: 4, fn: (r, e) => golpe(r, e, 'teclado') },
  { id: 'golpe-mando', presupuesto: 4, fn: (r, e) => golpe(r, e, 'mando') },
  { id: 'mejor-golpear', presupuesto: 6, fn: mejorGolpear },
  { id: 'lo-que-cae', presupuesto: 4, fn: loQueCae },
  { id: 'arbol-teclado', presupuesto: 3, fn: arbolTeclado },
  { id: 'idioma', presupuesto: 2, fn: idioma },
  { id: 'auto', presupuesto: 22, fn: autoAsalto },
  { id: 'v16-foco', presupuesto: 3, fn: v16_foco },
  // ← aquí, la comprobación de lo que estrene cada versión: { id: 'v13-…', presupuesto: n, fn: v13_… },
  { id: 'consola', presupuesto: 1, fn: sinErrores },
];

export async function humoRapido(r: Rapido): Promise<void> {
  const e = {} as Estado;
  const hechas: { id: string; s: number; presupuesto: number }[] = [];
  for (const c of COMPROBACIONES) {
    const t = Date.now();
    console.log(`· ${c.id}`);
    try {
      await c.fn(r, e);
    } catch (err) {
      // una comprobación que se rompe no se lleva por delante a las demás
      r.check(false, `[${c.id}] se cortó: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    }
    hechas.push({ id: c.id, s: (Date.now() - t) / 1000, presupuesto: c.presupuesto });
  }
  await e.page?.context().close().catch(() => undefined);
  const total = (Date.now() - r.t0) / 1000;
  console.log('\nHumo rápido · segundos de cada comprobación (presupuesto)');
  for (const h of hechas) console.log(`  ${h.id.padEnd(16)} ${h.s.toFixed(1).padStart(5)} s  (${h.presupuesto} s)${h.s > h.presupuesto ? '  ← se pasa' : ''}`);
  const presupuesto = hechas.reduce((a, h) => a + h.presupuesto, 0);
  console.log(`  construcción ${r.build.toFixed(1)} s · comprobaciones ${hechas.reduce((a, h) => a + h.s, 0).toFixed(1)} s (presupuesto ${presupuesto} s) · total ${total.toFixed(1)} s de 60`);
  r.check(total < 60, `el humo rápido cabe en 60 s de reloj, construcción incluida (${total.toFixed(1)} s)`);
}
