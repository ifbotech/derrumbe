import { guardian } from './guardian';
// infra/rapido: `--fast` (humo rápido, < 60 s con la construcción) y `--solo=<sección>[,<sección>…]` (humo por
// secciones: ninguna invocación pasa de 170 s; `npm run qa:smoke:todo` las lanza todas). Sin nada, todo de un tirón.
const ARGS = process.argv.slice(2);
const FAST = ARGS.includes('--fast');
const SOLO = ARGS.find((a) => a.startsWith('--solo='))?.slice('--solo='.length).trim() ?? '';
guardian('qa:smoke', FAST ? 150 : SOLO ? 170 : 1500); // tope duro: ver scripts/guardian.ts
// Prueba de humo en el navegador: juega de verdad unos turnos sobre el juego construido
// (dist/web) y falla si algo lanza un error. Cubre lo que las pruebas del motor no ven: la mesa,
// La Manga, Rebobinar, la Lupa, el foco de teclado (papel y tinta, ≥ 6 px, < 50 ms), Mayús + flechas
// sobre las reliquias, los susurros y su «No mostrar más», las insignias de reliquia, lo que suena, la
// tabla de controles de Ajustes, el reinicio con R y una campaña del bot entera.
// V9: los datos de prueba (telemetry-qa.ts) con la red bloqueada: cero peticiones sin pulsar, una al pulsar.
// V8: la reserva de piezas no crece, la caída del trono a 1×, 2× y 4×, la cadena de Golpes exactos, la
// música de cada escena, las monedas de La Taberna y una segunda pasada con «Reducir movimiento».
// (La fluidez se mide aparte, con aceleración gráfica: npm run qa:fps.)
//
//   npm run qa:smoke          (construye antes; NO_BUILD=1 para saltarse la construcción; de un tirón, ≈ 16 min)
//   npm run qa:smoke -- --fast           humo rápido (< 60 s, scripts/humo-rapido.ts): la puerta de cada vuelta
//   npm run qa:smoke -- --solo=mando     una sección (≤ 170 s); --secciones las lista
//   npm run qa:smoke:todo [-- --lang=en] todas las secciones, cada una en su invocación con tope (scripts/humo-todo.mjs)
//   NO_PAD=1 se salta la parte del mando virtual · GPU=1 lanza Chromium con aceleración
//   QA_DIR=dist/qa-<celda> construye aparte · QA_OUT=artifacts/visual-qa-<celda> guarda allí las capturas
//   --lang=en (o QA_LANG=en): la pasada en inglés (locale en-US); las capturas van a artifacts/visual-qa-en/smoke
// V10: en las dos pasadas, el interruptor ES | EN con teclado y con mando (Portada y Ajustes, sin recargar),
// «Alto contraste», que el idioma se recuerda al recargar y la insignia Ⓐ de La Taberna con mando (SD5).
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser, chromium, Page } from 'playwright';
import { campaignSuite } from './campana-qa';
import { LANG, LOCALE, OTHER, T, VIRTUAL_GAMEPAD, gamepadSuite, immuneCheck, langSwitchSuite } from './gamepad-qa';
import { controlRows } from '../src/client/prompts';
import { BRAND } from '../src/shared/brand';
import { telemetrySuite } from './telemetry-qa';
import { feedbackButtonsSuite } from './feedback-qa';
import { arbolSuite, autoPausaSuite, autoSuite, mejorSuite } from './v12-qa';
import { caidaSuite, susurrosSuite, tiradaSuite } from './v12-sensacion';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';
import { humoRapido } from './humo-rapido';

const OUT = resolve(process.env.QA_OUT?.trim() ? join(process.env.QA_OUT.trim(), 'smoke') : LANG === 'en' ? 'artifacts/visual-qa-en/smoke' : 'artifacts/visual-qa/smoke');

const problems: string[] = [];
/** Comprobaciones hechas en esta invocación (el lanzador del humo por secciones las suma). */
const cuenta = { ok: 0, ko: 0 };
const check = (ok: unknown, what: string) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (ok) cuenta.ok++;
  else {
    cuenta.ko++;
    problems.push(what);
  }
};
/** Lo que ha sonado (nombres de efecto; audio.ts lo deja a la vista con ?qa). */
const sounds = (page: Page) => page.evaluate(() => [...(window as unknown as { __qaSounds: string[] }).__qaSounds]);
const runTools = (page: Page) => page.evaluate(() => (window as unknown as { __qa: { run(): { tools: string[] } | null } }).__qa.run()?.tools ?? []);
type Whispers = { force(on: boolean | null): void; off(): boolean; reset(): void };
const whispers = <T>(page: Page, fn: (w: Whispers) => T) => page.evaluate(`(${fn.toString()})(window.__whispers)`) as Promise<T>;
const go = (page: Page, state: string) => page.evaluate((s) => (window as unknown as { __qa: { go: (s: string) => Promise<boolean> } }).__qa.go(s), state);
const count = (page: Page, sel: string) => page.locator(sel).count();
/** Espera a que la mesa termine de animar y vuelva a dejar jugar. */
const settled = (page: Page) => page.waitForFunction(() => !document.querySelector('.handrow.locked') || !!document.querySelector('.end, .run, .modal'), null, { timeout: 30_000 });

// GPU=1 usa Chromium completo con aceleración: es como de verdad se mide la fluidez. Sin ella, el
// navegador sin ventana lo pinta todo por CPU y los tiempos de fotograma solo son orientativos.
const gpu = !!process.env.GPU;

// ───────────────────────── secciones del humo completo ─────────────────────────
// Cada sección abre sus propias páginas sobre el navegador y el servidor de la invocación, y no depende de lo que
// haya hecho otra (salvo los tramos de la campaña, que se pasan la partida por un archivo y van en orden).
// `--solo=<id>` corre una; `--secciones` las lista (el lanzador scripts/humo-todo.mjs las lee de ahí).
interface Sesion {
  browser: Browser;
  site: { url: string; close: () => void };
}
interface Seccion {
  id: string;
  que: string;
  fn: (s: Sesion) => Promise<unknown>;
  /** Si se corre (NO_PAD=1 se salta el mando; NO_V12=1, lo de la V12). */
  si?: () => boolean;
}
const TRAMO = join(OUT, 'campana-tramo.json');
const TRAMOS = 5;
const SECCIONES: Seccion[] = [
  { id: 'mesa', que: 'la mesa con ratón y teclado, susurro, insignias, sonidos, jugo V8, Ajustes, colección, idioma, red y campaña vieja', fn: seccionMesa },
  { id: 'bufon', que: 'V40: las frases del Bufón sin tapar la mano, Inmune con teclado, la voz del monarca y un asalto a teclado', fn: seccionBufon },
  ...Array.from({ length: TRAMOS }, (_, i): Seccion => ({
    id: `campana-${i + 1}`,
    que: `la campaña de cinco asaltos con el bot y el ratón a 1×: ${i + 1 < TRAMOS ? `asalto ${i + 1}` : 'asalto 5 y las comprobaciones de la campaña'}`,
    fn: async ({ browser, site }) => {
      console.log(`Campaña de cinco asaltos (tramo ${i + 1} de ${TRAMOS})`);
      if (i === 0) rmSync(TRAMO, { force: true }); // nunca se sigue una campaña vieja
      return campaignSuite(browser, site.url, check, problems, { n: i + 1, de: TRAMOS, archivo: TRAMO });
    },
  })),
  { id: 'mando', que: 'la campaña jugada solo con el mando virtual: menú, asalto, Botín, La Pulpería, Secreto y reliquias', fn: seccionMando, si: () => !process.env.NO_PAD },
  { id: 'datos', que: 'los datos de prueba con la red bloqueada y el botón de feedback', fn: seccionDatos },
  { id: 'v12-entrada', que: 'V12: Mejor jugada (ratón, teclado y mando), el Altar con mando y teclado y AUTO en pausa', fn: seccionEntrada, si: () => !process.env.NO_V12 },
  { id: 'auto', que: 'V12: AUTO se apaga al instante (15 medidas) y juega la campaña entera a 8×', fn: seccionAuto, si: () => !process.env.NO_V12 },
  { id: 'v12-sensacion', que: 'V12: lo que cae, la tirada de huesos y los Susurros nuevos', fn: seccionSensacion, si: () => !process.env.NO_V12 },
  { id: 'calma', que: '«Reducir movimiento» y la copia de seguridad', fn: seccionCalma },
];

/** La página de las secciones «mesa» y «bufon»: un perfil limpio, en ?qa, con los errores apuntados. */
async function paginaPrincipal(browser: Browser, url: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
  await context.addInitScript({ content: NAME_SHIM });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`consola: ${m.text()}`));
  await page.goto(`${url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
  return page;
}

const seg = (desde: number) => (Date.now() - desde) / 1000;
/** Ninguna espera sin tope: lo que no acaba en `ms` se deja (cerrar el navegador, sobre todo). */
const conTope = <T>(p: Promise<T> | undefined, ms: number) => Promise.race([p, new Promise<undefined>((r) => (setTimeout(r, ms) as unknown as { unref(): void }).unref())]);

async function main(): Promise<number> {
  if (ARGS.includes('--secciones')) {
    console.log(SECCIONES.map((s) => s.id).join(' '));
    return 0;
  }
  const pedidas = SOLO ? SOLO.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const raras = pedidas.filter((p) => !SECCIONES.some((s) => s.id === p));
  if (raras.length) {
    console.error(`Sección desconocida: ${raras.join(', ')}. Hay: ${SECCIONES.map((s) => s.id).join(' ')}`);
    return 2;
  }
  const lista = pedidas.length ? SECCIONES.filter((s) => pedidas.includes(s.id)) : SECCIONES;
  const t0 = Date.now();
  ensureBuilt();
  const build = seg(t0);
  const site = await serveWeb();
  let browser: Browser | undefined;
  const hechas: { id: string; s: number; ok: number; ko: number }[] = [];
  try {
    browser = await chromium.launch(gpu ? { channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-zero-copy'] } : {});
    // La marca y el idioma salen de navigator.language: es-ES en la pasada española, en-US en la inglesa.
    console.log(`Pasada en ${LANG === 'en' ? 'inglés' : 'español'} (${LOCALE})${FAST ? ' · humo rápido' : pedidas.length ? ` · ${pedidas.join(', ')}` : ''}`);
    mkdirSync(OUT, { recursive: true });
    if (FAST) await humoRapido({ browser, url: site.url, check, problems, out: OUT, build, t0 });
    else
      for (const s of lista) {
        if (s.si && !s.si()) {
          console.log(`(sección ${s.id} saltada)`);
          continue;
        }
        const t = Date.now();
        const [ok0, ko0] = [cuenta.ok, cuenta.ko];
        console.log(`§ ${s.id} · ${s.que}`);
        try {
          await s.fn({ browser, site });
        } catch (e) {
          // una sección que se rompe no se lleva por delante a las demás (en la pasada de un tirón)
          problems.push(`[${s.id}] la sección se cortó: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
          console.error(e);
        }
        hechas.push({ id: s.id, s: seg(t), ok: cuenta.ok - ok0, ko: cuenta.ko - ko0 });
      }
  } catch (e) {
    problems.push(`la prueba se cortó: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`);
    console.error(e);
  } finally {
    await conTope(browser?.close().catch(() => undefined), 10_000);
    site.close();
  }
  for (const p of [...new Set(problems)]) console.log(`! ${p}`);
  if (hechas.length) console.log('');
  for (const h of hechas) console.log(`HUMO · sección ${h.id}: ${h.ok} ✓ · ${h.ko} ✗ · ${h.s.toFixed(1)} s`);
  console.log(`HUMO · total: ${cuenta.ok} ✓ · ${cuenta.ko} ✗ · ${seg(t0).toFixed(1)} s (construcción ${build.toFixed(1)} s)`);
  console.log(problems.length ? `\n${new Set(problems).size} problemas` : '\nTodo en orden.');
  return problems.length ? 1 : 0;
}

// ── sección «mesa» ──
async function seccionMesa({ browser, site }: Sesion): Promise<void> {
  const page = await paginaPrincipal(browser, site.url);
  check((await page.evaluate(() => document.documentElement.lang)) === LANG, `sin nada guardado, el idioma sale del navegador (${LOCALE} → <html lang="${LANG}">)`);

  // ── un golpe de verdad: el trío de sietes contra el trono apuntado ──
  await go(page, 'mesa');
  // V36 · la cuenta dice quién aporta: una placa sobre cada carta elegida y, bajo la fórmula, de dónde sale el Multi
  const quien = await page.evaluate(() => ({
    sel: document.querySelectorAll('#hand .card.sel').length,
    chips: [...document.querySelectorAll('#hand .card.sel > .aporte')].map((e) => e.textContent ?? ''),
    mde: document.querySelector('#score > .mde')?.textContent ?? '',
    multi: document.querySelector('#score .calc .fr-r b')?.textContent ?? '',
  }));
  check(quien.sel > 0 && quien.chips.length === quien.sel && quien.chips.every((t) => /^(\+\d+|0)/.test(t)), `cada carta elegida lleva lo que aporta (${quien.chips.join(' | ')})`);
  check(/Multi|Mult/.test(quien.mde) && quien.mde.length > 8, `bajo la fórmula se lee de dónde sale el Multi ${quien.multi} (${quien.mde})`);
  // V37 · con dos piezas o más, la línea acaba en el mismo Multi que la cuenta
  const piezasMulti = (quien.mde.match(/·/g) ?? []).length + 1;
  check(piezasMulti < 2 || quien.mde.replace(/\s+/g, '').endsWith(`=${quien.multi.replace(/\s+/g, '')}`), `la línea del Multi termina en «= ${quien.multi}» (${quien.mde})`);
  const hpBefore = await page.locator('.tower[data-suit="H"] .hp span').textContent();
  // como en una partida real, el audio ya está arrancado antes del primer golpe (el primer clic lo enciende)
  await page.mouse.click(700, 20);
  await page.waitForTimeout(1200);
  // sonda de fluidez: tiempos de fotograma y filtros en vivo mientras dura el golpe
  await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __live: string[] };
    w.__frames = [];
    w.__live = [];
    let last = performance.now();
    const tick = (t: number) => {
      w.__frames.push(t - last);
      last = t;
      for (const a of document.getAnimations()) {
        const el = (a.effect as KeyframeEffect | null)?.target;
        if (!el || a.playState !== 'running') continue;
        // un nodo que se mueve no puede llevar un filtro de ruido, ni estar dentro de un grupo SVG que lo lleve
        const css = getComputedStyle(el).filter.includes('url(');
        const svg = !!el.closest('svg') && !!el.parentElement?.closest('g[filter]');
        if (css || svg) w.__live.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') ?? ''}`);
      }
      if (w.__frames.length < 900) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.keyboard.press('Space');
  await page.waitForTimeout(900);
  // la captura detiene el pintado un instante: al medir la fluidez no se hace
  if (!gpu) await page.screenshot({ path: join(OUT, 'golpe-en-curso.png') });
  await settled(page);
  const perf = await page.evaluate(() => {
    const w = window as unknown as { __frames: number[]; __live: string[] };
    const f = w.__frames.slice(2).sort((a, b) => a - b);
    w.__frames.length = 900; // detiene la sonda
    return { n: f.length, avg: f.reduce((a, b) => a + b, 0) / Math.max(1, f.length), p95: f[Math.floor(f.length * 0.95)] ?? 0, max: f[f.length - 1] ?? 0, live: [...new Set(w.__live)] };
  });
  console.log(`  fotogramas durante el golpe: ${perf.n} · media ${perf.avg.toFixed(1)} ms · p95 ${perf.p95.toFixed(1)} ms · máx ${perf.max.toFixed(1)} ms`);
  check(perf.live.length === 0, `nada de lo que se anima lleva filtros de ruido en vivo${perf.live.length ? ` (${perf.live.slice(0, 4).join(', ')})` : ''}`);
  console.log('  (solo orientativo: los 60 fps los mide npm run qa:fps, con aceleración gráfica)');
  const hpAfter = await page.locator('.tower[data-suit="H"] .hp span').textContent();
  check(hpBefore !== hpAfter, `el golpe cambia la Vida del guardia (${hpBefore} → ${hpAfter})`);
  check((await count(page, '#hand .card')) >= 5, 'la mano se repone tras el golpe');
  await page.screenshot({ path: join(OUT, 'tras-el-golpe.png') });

  // ── Rebobinar: Z deshace el golpe ──
  check(await page.locator('#btn-undo').isEnabled(), 'Rebobinar queda disponible tras jugar');
  await page.keyboard.press('z');
  await page.waitForTimeout(400);
  await settled(page);
  check((await page.locator('.tower[data-suit="H"] .hp span').textContent()) === hpBefore, 'Rebobinar devuelve el trono a como estaba');
  check(await page.locator('#btn-undo').isDisabled(), 'Rebobinar se gasta (uno por asalto)');

  // ── La Manga: Y guarda la carta elegida ──
  const inReserve = await count(page, '#reserve .card');
  await page.locator('#hand .card').first().click();
  await page.keyboard.press('y');
  await page.waitForTimeout(300);
  await settled(page);
  check((await count(page, '#reserve .card')) === inReserve + 1, 'Y guarda una carta en La Manga');

  // ── foco de teclado y lupa ──
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  check((await count(page, '.focus-ring.on')) === 1, 'las flechas encienden el foco');
  {
    const ring = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.focus-ring i')!);
      const spreads = [...cs.boxShadow.matchAll(/0px 0px 0px (\d+(?:\.\d+)?)px/g)].reduce((a, m) => a + parseFloat(m[1]), 0);
      return { paper: parseFloat(cs.borderTopWidth), total: parseFloat(cs.borderTopWidth) + spreads, color: cs.borderTopColor };
    });
    check(ring.paper >= 4 && ring.total >= 6, `el foco es un marco de papel de ${ring.paper} px con filetes de tinta (${ring.total} px en total, ≥ 6)`);
    check(!/212, 163, 72/.test(ring.color), `y ya no es de latón (${ring.color})`);
  }
  const keyLag = await page.evaluate(() => {
    const from = document.activeElement;
    const t0 = performance.now();
    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    const moved = document.activeElement !== from && document.querySelector('.focus-ring.hop.on') !== null;
    return moved ? performance.now() - t0 : -1;
  });
  check(keyLag >= 0 && keyLag < 50, `una flecha mueve el foco y su marco en el mismo fotograma (${keyLag < 0 ? 'no se movió' : `${keyLag.toFixed(1)} ms`})`);
  check((await sounds(page)).slice(-4).includes('focus'), 'mover el foco suena (toque de latón que varía)');
  check(await page.evaluate(() => document.querySelector('.bar')!.getBoundingClientRect().top === 0 && document.scrollingElement!.scrollTop === 0), 'enfocar con el teclado no desplaza la mesa');
  await page.locator('#beltbar .belt-slot.tool').first().click({ button: 'right' });
  check((await count(page, '.lupa')) === 1, 'el clic derecho abre la Lupa');
  await page.keyboard.press('Escape');
  check((await count(page, '.lupa')) === 0, 'Esc cierra la lupa');
  await page.locator('#hand .card').first().hover();
  await page.keyboard.press('l');
  check((await count(page, '.lupa')) === 1, 'L abre la lupa sobre la carta señalada');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  check((await count(page, '.deck-modal')) === 1, 'Tab abre el mazo');
  await page.keyboard.press('Escape');

  // ── V34 · las Reliquias no se ordenan: ni Mayús + flechas ni arrastrarlas las mueven ──
  {
    const before = await runTools(page);
    await page.locator('#beltbar .belt-slot[data-slot="0"]').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(250);
    check((await runTools(page)).join() === before.join(), 'Mayús + → sobre una reliquia no la mueve: las Reliquias no se ordenan');
    const arrastrable = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#beltbar .belt-slot.tool')].some((e) => e.draggable));
    check(!arrastrable, 'y ninguna reliquia se puede arrastrar');
  }
  await page.keyboard.press('Escape');
  await page.keyboard.press('Delete');
  check((await sounds(page)).slice(-3).includes('deny'), 'Supr sin nada elegido suena a error (dos toques de madera), no a acierto');

  // ── globo con palabras clave encadenadas ──
  await page.locator('#beltbar .belt-slot.tool').nth(1).hover();
  await page.waitForTimeout(150);
  check((await count(page, '.tip')) === 1, 'el globo de ayuda aparece');
  await page.screenshot({ path: join(OUT, 'globo.png') });

  // ── mantener R: reinicio con anillo ──
  await page.mouse.move(5, 5);
  await page.keyboard.down('r');
  await page.waitForTimeout(250);
  check((await count(page, '.hold-ring')) === 1, 'mantener R enseña el anillo de reinicio');
  await page.screenshot({ path: join(OUT, 'anillo-reinicio.png') });
  await page.keyboard.up('r');
  check((await count(page, '.hold-ring')) === 0, 'soltar R antes de tiempo lo cancela');
  await page.keyboard.down('r');
  await page.waitForTimeout(950);
  await page.keyboard.up('r');
  await page.waitForTimeout(300);
  check((await count(page, '.run')) === 1 && ((await page.locator('.deck-head h1').textContent()) ?? '').includes(T('ui.run.sobre.titulo')), 'mantener R 0,7 s reinicia la campaña (vuelve al sobre)');

  // ── susurro: una línea, sin tapar mano ni cuenta, con «No mostrar más» ──
  await go(page, 'mesa-susurro');
  await page.waitForTimeout(300);
  const w = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.whisper');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const hit = (sel: string) => [...document.querySelectorAll(sel)].some((o) => {
      const b = o.getBoundingClientRect();
      return b.width > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
    });
    return { id: el.dataset.w, size: parseFloat(getComputedStyle(el).fontSize), covers: hit('#hand .card') || hit('#score'), off: !!el.querySelector('button.whisper-off') };
  });
  check(!!w, `la mesa de primera campaña enseña un susurro${w ? ` («${w.id}»)` : ''}`);
  check(w && w.size >= 13, 'el susurro se lee (≥ 13 px)');
  check(w && !w.covers, 'el susurro no tapa la mano ni la cuenta');
  check(w?.off, 'el susurro trae «No mostrar más»');
  check((await sounds(page)).includes('chalk'), 'el susurro suena (dos trazos y un punto)');
  check((await count(page, '.whisper')) === 1, 'de uno en uno: nunca dos susurros a la vez');
  await page.locator('.whisper-off').click();
  check((await count(page, '.whisper')) === 0 && (await whispers(page, (x) => x.off())), '«No mostrar más» lo borra a un clic y queda guardado');
  await whispers(page, (x) => x.reset());

  // ── insignias de reliquia: «+12 Daño · Ariete» junto a la cuenta, «−12 · Rodela de púas» sobre el trono ──
  await go(page, 'mesa');
  const badges = await page.evaluate(() => {
    const fire = (window as unknown as { __qaProc: (ev: unknown) => void }).__qaProc;
    const step = (id: string, label: string, proc: unknown) => ({ e: 'step', src: 'tool', id, label, fuerza: 0, res: 0, proc });
    fire(step('ariete', 'Ariete: +12 de Daño', { what: 'fuerza', n: 12 }));
    fire(step('contragolpe', 'Rodela de púas: devuelve 12', { what: 'dano', n: 12, tower: 'S' }));
    fire(step('rebosadero', 'Copa rebosante: cura 2', { what: 'repara', n: 2 }));
    const read = (cls: string) => {
      const el = document.querySelector<HTMLElement>(`.proc-badge.${cls}`);
      if (!el) return null;
      const b = el.querySelector('b')!;
      const r = el.getBoundingClientRect();
      return { text: el.textContent ?? '', font: getComputedStyle(b).fontFamily, size: parseFloat(getComputedStyle(b).fontSize), x: r.left + r.width / 2, dur: getComputedStyle(el).animationDuration };
    };
    const tower = document.querySelector('.tower[data-suit="S"]')!.getBoundingClientRect();
    const bunker = document.querySelector('#bunker')!.getBoundingClientRect();
    return { f: read('fuerza'), d: read('dano'), r: read('repara'), tower: [tower.left, tower.right], bunker: [bunker.left, bunker.right] };
  });
  const [ariete, rodela, dano, vida] = [T('reliquia.ariete.nombre'), T('reliquia.contragolpe.nombre'), T('ui.proc.dano'), T('ui.proc.vida')];
  check(badges.f?.text.includes('+12') && badges.f.text.includes(dano) && badges.f.text.includes(ariete), `${ariete} enseña «+12 ${dano} · ${ariete}» (${badges.f?.text})`);
  check(badges.d?.text.includes('−12') && badges.d.text.includes(rodela) && badges.d.x >= badges.tower[0] && badges.d.x <= badges.tower[1], `${rodela} enseña «−12 · ${rodela}» sobre su trono`);
  check(badges.r?.text.includes(`+2 ${vida}`) && badges.r.x >= badges.bunker[0] - 60 && badges.r.x <= badges.bunker[1] + 60, `la reliquia que cura enseña «+2 ${vida}» sobre tu Vida`);
  check([badges.f, badges.d, badges.r].every((b) => b && b.size >= 14 && !/Unifraktur|Grenze/i.test(b.font)), 'la cifra de las insignias va en sans de peso alto (≥ 14 px, nunca gótica)');
  check(badges.f?.dur === '1.2s', 'cada insignia dura 1,2 s a velocidad normal');
  check((await sounds(page)).filter((x) => x === 'proc').length >= 3, 'cada insignia trae su sonido');

  // ── los sonidos de la corte: se sintetizan sin errores y cada uno deja su nombre ──
  {
    const errs = problems.length;
    const theme = await page.evaluate(async () => {
      const w = window as unknown as { __qaSfx: Record<string, (...a: unknown[]) => void>; __qaSounds: string[] };
      const from = w.__qaSounds.length;
      const s = w.__qaSfx;
      try {
        s.siren(); // aviso de Contraataque: tambor de guardia y acero
        s.sirenLand(0, 3); // tu Escudo lo frena entero: espada contra escudo
        s.sirenLand(5, 2); // entra: golpe sordo (antes, el escudo cede)
        s.bell(); // Golpe exacto: campana de capilla
        s.crash(true); // guardia abatido: estandarte que cae
        s.crash(false);
        s.crownBreak(); // trono caído: corona que se parte
        s.mutiny(); // Motín: redoble
        s.slash(); // V8 · tajo de hoja
        s.stash(false); // V8 · carta que se desliza a La Manga
        s.seal(); // V8 · sello de lacre caliente
        s.foil(); // V8 · lámina que brilla
        s.bell(8); // V8 · campana con 8 Golpes exactos seguidos (+7 semitonos)
      } catch (e) {
        return [`error: ${(e as Error).message}`];
      }
      await new Promise((r) => setTimeout(r, 300));
      return w.__qaSounds.slice(Math.min(from, w.__qaSounds.length - 12));
    });
    const want = ['siren', 'sirenBlocked', 'sirenHit', 'bell', 'crash', 'crownBreak', 'mutiny', 'slash', 'stash', 'seal', 'foil'];
    check(want.every((n) => theme.includes(n)) && problems.length === errs, `los sonidos de la corte se sintetizan sin errores (${want.filter((n) => theme.includes(n)).join(', ')})`);
  }

  // ── V8 · jugo: reserva, caída del trono, cadena, música y monedas ──
  console.log('Jugo V8');
  await juiceChecks(page);

  // ── dos tintas clásicas y ajustes ──
  await go(page, 'ajustes');
  await page.locator('#set-toggles button').nth(2).click();
  check(await page.evaluate(() => document.documentElement.classList.contains('inks2')), 'el ajuste cambia a 2 tintas clásicas');
  await page.locator('#set-toggles button').nth(2).click();
  check(await page.evaluate(() => !document.documentElement.classList.contains('inks2')), '…y vuelve a 4 tintas de taller');
  const whisperRow = page.locator('#set-toggles .set-susurros').locator('button');
  const [si, no] = [T('ui.si'), T('ui.no')];
  check((await page.locator('#set-toggles .set-susurros b').textContent()) === T('ui.w.ajuste') && (await whisperRow.textContent()) === si, `Ajustes tiene la fila «${T('ui.w.ajuste')}» (encendidos)`);
  await whisperRow.click();
  check((await whisperRow.textContent()) === no && (await whispers(page, (x) => x.off())), 'se apagan desde Ajustes');
  await whisperRow.click();
  check((await whisperRow.textContent()) === si && !(await whispers(page, (x) => x.off())), 'y se vuelven a encender');
  const pads = await page.locator('.keys tr td:nth-child(3)').allTextContents();
  const rows = await page.locator('.keys tr td:nth-child(1)').allTextContents();
  check(pads.length >= 12 && !pads.some((t) => t.trim() === '—' || t.trim() === ''), 'en la tabla de controles ninguna acción se queda sin mando');
  check(pads.some((t) => t.includes('L3')) && pads.some((t) => t.includes('R3')) && !pads.some((t) => t.includes('LB / RB')), 'la tabla enseña L3 (descartar) y R3 (Rebobinar), y ya no LB / RB para las reliquias');
  check(pads.some((t) => t.trim() === 'LT') && pads.some((t) => t.trim() === 'Select') && pads.some((t) => t.includes('Select + Start')), 'V12: la tabla enseña LT (Mejor jugada), Select (AUTO) y Select + Start (reiniciar)');
  check(['ui.ctl.mejor', 'ui.ctl.auto', 'ui.ctl.ritual', 'ui.ctl.arbol.comprar', 'ui.ctl.arbol.zum', 'ui.ctl.arbol.mover'].every((k) => rows.includes(T(k))), 'V12: y las filas de Mejor jugada, AUTO, la tirada de huesos y el Árbol');
  const want = controlRows(LANG).map((r) => r.map((c) => c.replace(/<[^>]+>/g, '')));
  check(['ui.ctl.manga', 'ui.ctl.rebobinar', 'ui.ctl.golpear'].every((k) => rows.includes(T(k))), 'la tabla de controles habla de La Manga, Rebobinar y tronos');
  const shown = await page.locator('.keys tr').evaluateAll((trs) => trs.slice(1).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent ?? '')));
  check(JSON.stringify(shown) === JSON.stringify(want), `la tabla de Ajustes es la de prompts.ts en el idioma de la mesa (${shown.length} filas)`);
  check(await page.evaluate(() => [...document.querySelectorAll('.keys td kbd')].every((k) => k.classList.contains('kt')) && document.querySelectorAll('.keys td kbd').length >= 15), 'cada tecla y botón de la tabla va en su <kbd>');
  await page.keyboard.press('Escape');

  // ── colección: la Lupa abre también barajas y monarcas, con su sello de maestría ──
  await go(page, 'coleccion');
  await page.locator('.col-sec .choice .card[data-lupa^="deck:"]').first().click({ button: 'right' });
  check((await count(page, '.lupa .mastery')) === 1, 'la lupa de una baraja ganada enseña su sello de maestría');
  await page.keyboard.press('Escape');
  await page.locator('.col-sec .card[data-lupa^="boss:"]').first().click({ button: 'right' });
  check((await count(page, '.lupa .lupa-epi')) === 1, 'la Lupa de un monarca trae su epígrafe');
  await page.screenshot({ path: join(OUT, 'lupa-jefe.png') });
  await page.keyboard.press('Escape');

  // ── V10 · el interruptor ES | EN y «Alto contraste» con el teclado; el idioma se recuerda al recargar ──
  console.log('Idioma');
  await langSwitchSuite(page, 'keys', check);
  {
    // con el guardado de verdad (sin ?qa, que lo vuelve de quita y pon), en un perfil limpio de Playwright
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
    await ctx.addInitScript({ content: NAME_SHIM });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => problems.push(`[idioma] error de página: ${e.message}`));
    await p.goto(site.url);
    await p.waitForSelector('#home-lang');
    const pick = async (to: string) => {
      await p.locator(`#home-lang [data-lang="${to}"]`).focus();
      await p.keyboard.press('Enter');
      await p.waitForTimeout(100);
    };
    const reloaded = async () => {
      await p.reload();
      await p.waitForSelector('#home-lang');
      return p.evaluate(() => ({ lang: document.documentElement.lang, stored: localStorage.getItem('derrumbe:idioma'), title: document.querySelector('.home h1.title')?.getAttribute('aria-label') ?? '' }));
    };
    await pick(OTHER);
    const a = await reloaded();
    check(a.lang === OTHER && a.stored === OTHER && a.title === BRAND[OTHER].title, `al recargar, el juego sigue en ${OTHER.toUpperCase()} aunque el navegador diga ${LOCALE} («${a.title}»)`);
    await pick(LANG);
    const b = await reloaded();
    check(b.lang === LANG && b.stored === LANG && b.title === BRAND[LANG].title, `y vuelve a ${LANG.toUpperCase()} con el interruptor, también tras recargar («${b.title}»)`);
    await ctx.close();
  }

  // ── V11 · red: el rechazo de versión del servidor («otra versión del juego») sale en el idioma de la mesa ──
  {
    const said = await page.evaluate(async () => {
      (window as unknown as { __qaJuice: { serverError(m: string): void } }).__qaJuice.serverError('Esta sala es de otra versión del juego.');
      await new Promise((r) => setTimeout(r, 80));
      return document.querySelector('.toast:last-of-type')?.textContent?.trim() ?? '';
    });
    check(said === T('error.version'), `un cliente de otra versión que no entra en una sala ve el aviso en su idioma («${said}»)`);
  }

  // ── V11 · una campaña a medias de la 10.0 (guardado v 3, asalto 4) se cierra al abrir y lo dice, con lo cobrado ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
    await ctx.addInitScript({ content: NAME_SHIM });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('qa-vieja')) return;
      sessionStorage.setItem('qa-vieja', '1');
      localStorage.setItem('derrumbe:run', JSON.stringify({ key: 'qa-10', run: { v: 3, stage: 4, phase: 'map' } }));
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => problems.push(`[campaña vieja] error de página: ${e.message}`));
    await p.goto(site.url);
    await p.waitForSelector('.toast', { timeout: 4000 }).catch(() => undefined);
    const toastText = (await p.locator('.toast').last().textContent().catch(() => null))?.trim() ?? '';
    const gone = await p.evaluate(() => localStorage.getItem('derrumbe:run'));
    const head = T('ui.camp.vieja', { n: '§' }).split('§')[0];
    check(toastText.startsWith(head) && /\d+ ✦/.test(toastText) && gone === null, `una campaña a medias de la 10.0 se cierra al abrir y avisa en su idioma («${toastText}»)`);
    await ctx.close();
  }

  await page.context().close();
}

// ── sección «bufon» (V40: sustituye a la partida guiada) ──
async function seccionBufon({ browser, site }: Sesion): Promise<void> {
  const page = await paginaPrincipal(browser, site.url);
  {
    // lo que la sección «mesa» deja en los datos de prueba de este equipo y se comprueba al final de esta: un golpe,
    // Rebobinar y La Manga en la mesa de QA (sin comprobaciones: esas son de «mesa»)
    await go(page, 'mesa');
    await page.mouse.click(700, 20);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await settled(page);
    await page.keyboard.press('z');
    await page.waitForTimeout(300);
    await settled(page);
    await page.locator('#hand .card').first().click();
    await page.keyboard.press('y');
    await page.waitForTimeout(300);
    await settled(page);
  }
  // ── V40 · el Bufón: cada frase en el hueco de los Susurros, sin ventana, sin tapar la mano y con la mano viva ──
  console.log('Bufón');
  for (const id of ['palo', 'cuenta', 'exacto']) {
    await go(page, `bufon-${id}`);
    await page.waitForTimeout(250);
    const b = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.whisper.bufon');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const tapa = [...document.querySelectorAll('#hand .card, #score')].some((o) => {
        const q = o.getBoundingClientRect();
        return q.width > 0 && r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top;
      });
      return { texto: el.textContent ?? '', tapa, modales: document.querySelectorAll('.modal').length, bloqueada: !!document.querySelector('.handrow.locked') };
    });
    check(!!b && b.texto.includes(T(`bufon.${id}`).slice(0, 20)), `el Bufón dice su frase «${id}»${b ? ` («${b.texto.slice(0, 60)}»)` : ''}`);
    check(!!b && !b.tapa && b.modales === 0 && !b.bloqueada, `la frase «${id}» no abre ventana, no tapa la mano ni la cuenta y la mano sigue jugable`);
  }
  await page.screenshot({ path: join(OUT, 'bufon.png') });

  // ── V11 · con el teclado: dos tronos, las flechas solo pisan los presentes y la placa Inmune se ve ──
  await immuneCheck(page, 'keys', check);

  // ── V7 · la voz del monarca: su frase de entrada, sin tapar mano ni cuenta, y se va sola ──
  {
    await go(page, 'mesa-monarca');
    await page.waitForTimeout(400);
    const bark = await page.evaluate(() => {
      const el = document.getElementById('bark');
      const w = window as unknown as { __qaVoz: { heard: string[]; ms(): number } };
      if (!el || el.hidden) return null;
      const r = el.getBoundingClientRect();
      const hit = (sel: string) => [...document.querySelectorAll(sel)].some((o) => {
        const b = o.getBoundingClientRect();
        return b.width > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top;
      });
      return { text: el.textContent ?? '', heard: [...w.__qaVoz.heard], ms: w.__qaVoz.ms(), covers: hit('#hand .card') || hit('#score'), n: document.querySelectorAll('#bark, .bark').length };
    });
    check(bark?.heard.includes('copas:entrada'), `un asalto con monarca enseña su bocadillo de entrada${bark ? ` («${bark.text}»)` : ''}`);
    check(bark && !bark.covers && bark.n === 1, 'el bocadillo no tapa la mano ni la cuenta, y hay uno solo');
    check(bark && bark.ms <= 2500, `el bocadillo dura ≤ 2,5 s a 1× (${bark?.ms} ms)`);
    check((await sounds(page)).some((s) => s === 'monarch:copas:entrada'), 'el monarca entra con su firma sonora');
    await page.waitForTimeout(2900);
    check(await page.evaluate(() => document.getElementById('bark')?.hidden !== false), 'y se va solo');
    // con «Reducir movimiento» entra sin animación
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const calm = await page.evaluate(async () => {
      const w = window as unknown as { __qaVoz: { say(id: string, kind: string): void } };
      w.__qaVoz.say('espadas', 'contraataque');
      await new Promise((r) => setTimeout(r, 60));
      const el = document.getElementById('bark');
      return el && !el.hidden ? getComputedStyle(el).animationName : 'oculto';
    });
    check(calm === 'none', `con «Reducir movimiento» el bocadillo aparece sin animación (${calm})`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const stacked = await page.evaluate(async () => {
      const w = window as unknown as { __qaVoz: { say(id: string, kind: string): void } };
      w.__qaVoz.say('espadas', 'caida');
      w.__qaVoz.say('espadas', 'entrada');
      await new Promise((r) => setTimeout(r, 60));
      return { n: document.querySelectorAll('.bark:not([hidden])').length, text: document.getElementById('bark')?.textContent ?? '' };
    });
    check(stacked.n === 1, `las voces no se apilan: la nueva sustituye a la anterior («${stacked.text}»)`);
  }

  // ── un asalto entero jugado con el teclado: 1–9 eligen, espacio golpea ──
  await go(page, 'plano');
  await page.locator('#routes .choice.pick').first().click();
  await page.waitForSelector('.table-screen');
  await settled(page);
  let turns = 0;
  for (; turns < 60; turns++) {
    if ((await count(page, '.table-screen')) === 0 || (await count(page, '.end')) > 0) break;
    await settled(page);
    if ((await count(page, '.table-screen')) === 0) break;
    await page.keyboard.press('Escape');
    if ((await count(page, '#hand .card')) + (await count(page, '#reserve .card')) === 0) {
      await page.keyboard.press('Space');
    } else {
      await page.keyboard.press('1');
      const valid = (await count(page, '.tower.targetable')) > 0;
      if (valid) await page.keyboard.press('Space');
      else await page.keyboard.press('Delete');
    }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);
  check(turns > 3 && turns < 60, `un asalto entero a teclado termina (${turns} turnos)`);
  check((await count(page, '.run, .end')) > 0, 'al terminar el asalto se pasa al Botín o a la crónica');
  {
    // V9 · lo jugado con teclado queda en los datos de prueba de este equipo (enganches de la mesa)
    const log = await page.evaluate(() => (window as unknown as { __qaTelemetry: { telemetryLog(): { modo: string; manga: number; rebobinar: number; turnos: number; guia: string | null }[] } }).__qaTelemetry.telemetryLog());
    const camp = log.filter((r) => r.modo === 'campana');
    check(camp.some((r) => r.manga >= 1) && camp.some((r) => r.rebobinar >= 1), `los datos de prueba cuentan La Manga y Rebobinar de lo jugado (${camp.map((r) => `${r.manga}/${r.rebobinar}`).join(' · ')})`);
    check(camp.some((r) => r.turnos > 0), 'y los turnos del asalto jugado a teclado');
  }
  await page.screenshot({ path: join(OUT, 'fin-de-asalto.png') });
  await page.context().close();
}

// ── sección «mando»: la campaña jugada solo con un mando (virtual): menú, asalto entero, Botín y La Taberna ──
async function seccionMando({ browser, site }: Sesion): Promise<void> {
  console.log('Mando virtual');
  await gamepadSuite(browser, site.url, check, problems, (p, name) => p.screenshot({ path: join(OUT, `${name}.png`) }));
}

// ── sección «datos» ──
async function seccionDatos({ browser, site }: Sesion): Promise<void> {
  // ── V9 · datos de prueba con la red bloqueada: cero peticiones sin pulsar, una al pulsar ──
  console.log('Datos de prueba');
  await telemetrySuite(browser, site.url, check, problems);
  // arte-ui · el botón «Enviar Crónica / Feedback de Prueba» pulsado de verdad (ratón, teclado y mando)
  console.log('Botón de feedback');
  await feedbackButtonsSuite(browser, site.url, check, problems);
}

// ── sección «v12-entrada»: Mejor jugada (ratón, teclado y mando), el Árbol con mando y teclado, AUTO en pausa y en el diario ──
async function seccionEntrada({ browser, site }: Sesion): Promise<void> {
  console.log('Mejor jugada');
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
    await ctx.addInitScript({ content: NAME_SHIM });
    await ctx.addInitScript({ content: VIRTUAL_GAMEPAD });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => problems.push(`[mejor] error de página: ${e.message}`));
    await p.goto(`${site.url}?qa=1`);
    await p.waitForFunction(() => !!(window as unknown as { __qaJuice?: unknown }).__qaJuice);
    await p.evaluate(() => (window as unknown as { __qaGamepad: { connect(): void } }).__qaGamepad.connect());
    await mejorSuite(p, 'mouse', check);
    await mejorSuite(p, 'keys', check);
    await mejorSuite(p, 'pad', check);
    await ctx.close();
  }
  console.log('Árbol con mando y con teclado');
  await arbolSuite(browser, site.url, 'pad', check, problems);
  await arbolSuite(browser, site.url, 'keys', check, problems);
  console.log('AUTO');
  await autoPausaSuite(browser, site.url, check, problems);
}

// ── sección «auto»: AUTO se apaga al instante y juega la campaña entera a 8× ──
async function seccionAuto({ browser, site }: Sesion): Promise<void> {
  console.log('AUTO · apagado y campaña a 8×');
  await autoSuite(browser, site.url, check, problems);
}

// ── sección «v12-sensacion»: lo que cae y el imán, la tirada de huesos animada y los seis Susurros nuevos (juice-ux B) ──
async function seccionSensacion({ browser, site }: Sesion): Promise<void> {
  console.log('Lo que cae');
  const caida = await caidaSuite(browser, site.url, check, problems);
  console.log('Tirada de huesos');
  const huesos = await tiradaSuite(browser, site.url, check, problems);
  console.log(`  medidas para la duración (1×): tirada ${(huesos.mediana / 1000).toFixed(2)} s (mediana de ${huesos.medidas.length}) · jugada con lo que cae ${(caida.jugada / 1000).toFixed(1)} s (mediana de ${caida.jugadas.length})`);
  console.log('Susurros nuevos');
  await susurrosSuite(browser, site.url, check, problems);
}

// ── sección «calma» ──
async function seccionCalma({ browser, site }: Sesion): Promise<void> {
  // ── V8 · una segunda pasada con «Reducir movimiento»: nada vuela ni tiembla ──
  console.log('Reducir movimiento');
  await calmPass(browser, site.url);

  // ── copia de seguridad, con el guardado de verdad (sin ?qa): exportar, perderlo todo e importar ──
  console.log('Copia de seguridad');
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE, acceptDownloads: true });
    await ctx.addInitScript({ content: NAME_SHIM });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => problems.push(`[copia] error de página: ${e.message}`));
    p.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`[copia] consola: ${m.text()}`));
    const guild = () => p.locator('#m-guild').textContent();
    await p.goto(site.url);
    await p.waitForSelector('#m-guild');
    // un perfil con algo que perder
    await p.evaluate(() => {
      const meta = JSON.parse(localStorage.getItem('derrumbe:meta') ?? '{}') as Record<string, unknown>;
      localStorage.setItem('derrumbe:meta', JSON.stringify({ ...meta, renown: 7700 }));
      localStorage.setItem('derrumbe:name', 'Conjurada QA');
    });
    await p.reload();
    await p.waitForSelector('#m-guild');
    check(/7[,.]7K ✦/.test((await guild()) ?? ''), 'el perfil de prueba tiene 7700 esquirlas (7,7K en la portada)');
    await p.locator('#m-set').click();
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('#set-export').click()]);
    const saved = join(OUT, 'copia.json');
    await download.saveAs(saved);
    const copy = JSON.parse(readFileSync(saved, 'utf8')) as { app: string; data: Record<string, string> };
    check(/^sangre-y-palo-progreso-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), `Exportar progreso descarga sangre-y-palo-progreso-AAAA-MM-DD.json (${download.suggestedFilename()})`);
    check(copy.app === 'derrumbe' && JSON.parse(copy.data['derrumbe:meta']).renown === 7700 && copy.data['derrumbe:name'] === 'Conjurada QA', 'la copia lleva la Orden y el nombre (marcador interno app: «derrumbe»)');
    check(!Object.keys(copy.data).includes('derrumbe:server'), 'la copia no se lleva la dirección del servidor de esta instalación');
    // se pierde todo…
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForSelector('#m-guild');
    check((await guild())?.includes('0 ✦') && !/7[,.]7K/.test((await guild()) ?? ''), 'tras borrar el navegador, la Orden vuelve a cero');
    await p.locator('#m-set').click();
    // …un archivo cualquiera no cuela…
    await p.locator('#set-file').setInputFiles({ name: 'otra-cosa.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"otro","data":{}}') });
    await p.waitForTimeout(300);
    check((await p.locator('.modal-box.confirm').count()) === 0 && (await p.locator('.toast').last().textContent())?.includes(T('ui.copia.ajena', { titulo: '' }).split(' ').slice(0, 4).join(' ')), 'Importar rechaza un archivo que no es una copia del juego');
    await p.locator('#set-file').setInputFiles({ name: 'rota.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'derrumbe', data: { 'derrumbe:meta': '{rota' } })) });
    await p.waitForTimeout(300);
    check((await p.locator('.modal-box.confirm').count()) === 0, 'y una copia dañada, sin tocar lo guardado');
    // …y la copia buena lo devuelve todo, previa confirmación
    await p.locator('#set-file').setInputFiles(saved);
    await p.waitForSelector('.modal-box.confirm');
    check(/7700 ✦ (esquirlas|shards)/.test((await p.locator('.modal-box.confirm').textContent()) ?? ''), 'antes de importar se enseña qué trae la copia');
    await Promise.all([p.waitForEvent('load'), p.locator('#yes').click()]);
    await p.waitForSelector('#m-guild');
    check(/7[,.]7K ✦/.test((await guild()) ?? ''), 'Importar progreso recupera la Orden tras recargar');
    check((await p.evaluate(() => localStorage.getItem('derrumbe:name'))) === 'Conjurada QA', 'y el resto de lo guardado');
    await ctx.close();
  }
}

type Fx = Record<string, (...a: unknown[]) => unknown> & { settings: { speed: number; calm: boolean }; made(): number; exactChain(): number };
type FxWin = { __qaFx: Fx; __qaMusica(): { kind: string; stage: number; boss: boolean }; __qa: { go(s: string): Promise<boolean>; run(): { gold: number } | null } };

/** V8 · lo que vuela sale de una reserva, el trono cae en su tiempo, la cadena se cuenta entera y cada escena suena a lo suyo. */
async function juiceChecks(page: Page): Promise<void> {
  // ── la reserva: tras un golpe que la calienta, diez golpes más no crean ni una pieza ──
  await go(page, 'mesa');
  const pool = await page.evaluate(async () => {
    const fx = (window as unknown as FxWin).__qaFx;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    fx.settings.speed = 4;
    const guard = () => document.querySelector<HTMLElement>('.tower[data-suit="S"] .floor-slot .card')!;
    const sealed = () => document.querySelector<HTMLElement>('#hand .card.z-dinamita, #hand .card.z-eco, #hand .card.z-jornal, #hand .card.z-sindical') ?? document.querySelector<HTMLElement>('#hand .card')!;
    const golpe = async () => {
      const g = guard();
      g.style.visibility = '';
      const r = g.getBoundingClientRect();
      fx.tear(g);
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, 12);
      fx.coins(g, '#gold-chip', 8);
      fx.sealStep('seal', sealed());
      fx.throneFall(document.querySelector('.tower[data-suit="D"]'));
      let peak = 0;
      for (let i = 0; i < 20; i++) {
        await sleep(30);
        peak = Math.max(peak, document.querySelectorAll('.pieza').length);
      }
      await sleep(350);
      return peak;
    };
    const peak0 = await golpe();
    const made0 = fx.made();
    let peak = 0;
    for (let i = 0; i < 10; i++) peak = Math.max(peak, await golpe());
    fx.settings.speed = 1;
    guard().style.visibility = '';
    return { peak0, peak, made0, made: fx.made(), left: document.querySelectorAll('body > .pieza, body > .esquirlas').length };
  });
  check(pool.peak0 > 0, `un golpe lanza piezas grabadas (${pool.peak0} a la vez: naipe cortado, astillas, monedas, lacre y esquirlas)`);
  check(pool.made === pool.made0 && pool.peak <= pool.peak0, `la reserva no crece: diez golpes más, ${pool.made - pool.made0} piezas nuevas (${pool.made} en total; como mucho ${pool.peak} a la vez)`);
  check(pool.left === 0, 'al acabar no queda ninguna pieza suelta en la página');
  check((await count(page, '.coin, .debris')) === 0, 'ya no salen los cuadrados viejos (.coin, .debris)');

  // ── la caída del trono a 1×, 2× y 4×: de .crown-split al final de la última esquirla ──
  await go(page, 'mesa-esquirlas');
  const fall = await page.evaluate(async () => {
    const fx = (window as unknown as FxWin).__qaFx;
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    document.querySelectorAll('body > .pieza, body > .esquirlas').forEach((n) => n.remove());
    const out: Record<number, number> = {};
    let shards = 0;
    for (const sp of [1, 2, 4]) {
      fx.settings.speed = sp;
      const tower = document.querySelector<HTMLElement>('.tower[data-suit="D"]')!;
      tower.querySelectorAll<SVGElement>('.crn-l, .crn-r').forEach((h) => (h.style.opacity = ''));
      await new Promise((r) => setTimeout(r, 150));
      let t0 = 0;
      const mo = new MutationObserver(() => {
        if (!t0 && tower.classList.contains('crown-split')) t0 = performance.now();
      });
      mo.observe(tower, { attributes: true, attributeFilter: ['class'] });
      fx.throneFall(tower);
      let anims: Animation[] = [];
      const w0 = performance.now();
      while (!anims.length && performance.now() - w0 < 3000) {
        await raf();
        anims = [...document.querySelectorAll('body > .esquirlas .esquirla')].flatMap((e) => e.getAnimations());
      }
      shards = Math.max(shards, document.querySelectorAll('body > .esquirlas .esquirla').length);
      // (con tope: una animación que no acabe nunca no deja la prueba esperando)
      await Promise.race([Promise.all(anims.map((a) => a.finished.catch(() => undefined))), new Promise((r) => setTimeout(r, 4000))]);
      out[sp] = Math.round(performance.now() - t0);
      mo.disconnect();
      await new Promise((r) => setTimeout(r, 120));
    }
    fx.settings.speed = 1;
    return { out, shards };
  });
  const d1 = fall.out[1];
  console.log(`  caída del trono: 1× ${d1} ms · 2× ${fall.out[2]} ms · 4× ${fall.out[4]} ms (${fall.shards} esquirlas)`);
  check(fall.shards >= 6, `la corona estalla en esquirlas grabadas (${fall.shards})`);
  check(d1 > 0 && d1 <= 1200, `la caída del trono cabe en 1,2 s a 1× (${d1} ms)`);
  for (const sp of [2, 4]) {
    const want = d1 / sp;
    check(Math.abs(fall.out[sp] - want) <= want * 0.15, `a ${sp}× dura en proporción (${fall.out[sp]} ms; se esperaba ${Math.round(want)} ± 15 %)`);
  }

  // ── la cadena de Golpes exactos: se cuenta entera (el motor la topa en 4) ──
  await go(page, 'mesa');
  const chain = await page.evaluate(() => {
    const fx = (window as unknown as FxWin).__qaFx;
    const t = document.querySelector<HTMLElement>('.tower[data-suit="H"]')!;
    const seq: number[] = [];
    const down = (clean: boolean) => [{ e: 'floorDown', clean }];
    for (let i = 0; i < 9; i++) {
      fx.guardFall(t, true, down(true));
      seq.push(fx.exactChain());
    }
    fx.guardFall(t, false, down(false));
    seq.push(fx.exactChain());
    fx.guardFall(t, true, down(true));
    seq.push(fx.exactChain());
    const two = [{ e: 'floorDown', clean: true }, { e: 'floorDown', clean: true }];
    fx.guardFall(t, true, two);
    fx.guardFall(t, true, two);
    seq.push(fx.exactChain());
    return seq.join(' ');
  });
  check(chain === '1 2 3 4 5 6 7 8 9 0 1 2', `la cadena de exactos sube de uno en uno más allá de 4, vuelve a 0 con un golpe que no es exacto y un golpe con dos abatidos cuenta una vez (${chain})`);

  // ── la música de cada escena ──
  const scene = () => page.evaluate(() => (window as unknown as FxWin).__qaMusica());
  await go(page, 'plano');
  const map = await scene();
  await go(page, 'ferreteria');
  const shop = await scene();
  await go(page, 'mesa-monarca');
  const boss = await scene();
  check(map.kind === 'map' && shop.kind === 'shop' && boss.kind === 'battle' && boss.boss, `cada escena tiene su música: Mapa «${map.kind}», Taberna «${shop.kind}», monarca «${boss.kind}${boss.boss ? ' con monarca' : ''}»`);

  // ── La Taberna: al comprar, las monedas vuelan de la bolsa al Tratante ──
  await go(page, 'ferreteria');
  const before = await page.evaluate(() => (window as unknown as FxWin).__qa.run()?.gold ?? 0);
  // se paga algo que cueste oro sin abrir más ventanas: renovar la mesa (o la cura)
  const offer = page.locator('#reroll:not(:disabled), #heal:not(:disabled)').first();
  if (await offer.count()) {
    await offer.click();
    const flew = await page.evaluate(async () => {
      let n = 0;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        n = Math.max(n, document.querySelectorAll('body > .pieza.moneda').length);
      }
      return n;
    });
    const after = await page.evaluate(() => (window as unknown as FxWin).__qa.run()?.gold ?? 0);
    check(after < before && flew > 0, `al comprar en La Taberna vuelan monedas grabadas de la bolsa al Tratante (${flew}; oro ${before} → ${after})`);
    check((await sounds(page)).includes('coins'), 'y tintinean');
  } else console.log('  (La Taberna de QA no tiene nada que se pueda comprar)');
  await page.keyboard.press('Escape');

  // ── la Reliquia que llega queda marcada en la tira (V31: su hueco ya no cambia la cuenta y no se anuncia) ──
  await go(page, 'ferreteria');
  const llega = await page.evaluate(() => (window as unknown as { __qa: { llega(): { id: string; hueco: number } | null } }).__qa.llega());
  const marcadas = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.run-belt .belt-slot.recien')].map((e) => `${e.dataset.id}@${Number(e.dataset.slot) + 1}`));
  check(!!llega && marcadas.join() === `${llega.id}@${llega.hueco}`, `la Reliquia que llega queda marcada en la tira (${marcadas.join() || 'ninguna'})`);

  // ── V33: del cobro al Árbol en un clic ──
  await go(page, 'acta-derrota');
  const cobro = await page.evaluate(() => ({
    linea: document.querySelector('.acta-cobro .cobro-sig')?.textContent ?? '',
    boton: document.querySelector('#c-arbol')?.textContent ?? '',
    primario: !!document.querySelector('#c-arbol.primary'),
  }));
  check(/340/.test(cobro.linea) && /340/.test(cobro.boton) && cobro.primario, `la Crónica dice cuántas esquirlas hay y qué mejora alcanza (${cobro.linea.slice(0, 60)}…)`);
  await page.click('#c-arbol');
  await page.waitForSelector('.arbol .nodo[aria-current="true"]');
  const elegido = await page.evaluate(() => ({
    nodo: document.querySelector<HTMLElement>('.arbol .nodo[aria-current="true"]')?.dataset.nodo ?? '',
    comprable: !!document.querySelector('.arbol .nodo[aria-current="true"].es-comprable'),
    comprar: document.querySelector('#arbol-comprar')?.getAttribute('aria-disabled') !== 'true',
  }));
  check(!!elegido.nodo && elegido.comprable && elegido.comprar, `«Mejorar el Árbol» abre el Árbol con la mejora propuesta elegida y lista para comprar (${elegido.nodo})`);
}

/** V8 · «Reducir movimiento»: un contexto aparte con reducedMotion 'reduce'. Caída del trono, tajo y monedas sin nada en vuelo. */
async function calmPass(browser: Browser, url: string): Promise<void> {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE, reducedMotion: 'reduce' });
  await ctx.addInitScript({ content: NAME_SHIM });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[calma] error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`[calma] consola: ${m.text()}`));
  try {
    await page.goto(`${url}?qa=1`);
    await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
    check(await page.evaluate(() => document.documentElement.classList.contains('calm') && (window as unknown as FxWin).__qaFx.settings.calm), 'con «Reducir movimiento» en el sistema, el juego arranca en calma');
    await go(page, 'mesa-esquirlas');
    await page.mouse.click(700, 20);
    const r = await page.evaluate(async () => {
      const fx = (window as unknown as FxWin).__qaFx;
      document.querySelectorAll('body > .pieza, body > .esquirlas').forEach((n) => n.remove());
      const raf = () => new Promise((res) => requestAnimationFrame(res));
      const flying = new Set<string>();
      let shake = 0;
      let foil = 0;
      let stop = false;
      const made0 = fx.made();
      void (async () => {
        while (!stop) {
          await raf();
          for (const p of document.querySelectorAll('.pieza')) {
            const t = getComputedStyle(p).transform;
            if (t && t !== 'none') flying.add(String((p as HTMLElement).className?.toString()));
          }
          const ts = document.querySelector('.table-screen');
          if (ts && getComputedStyle(ts).transform !== 'none') shake++;
          for (const b of document.querySelectorAll('.ly.foil .foil-band')) if (b.getAnimations().length) foil++;
        }
      })();
      const tower = document.querySelector<HTMLElement>('.tower[data-suit="D"]')!;
      const guard = document.querySelector<HTMLElement>('.tower[data-suit="S"] .floor-slot .card') ?? document.querySelector<HTMLElement>('#hand .card')!;
      const r0 = guard.getBoundingClientRect();
      fx.throneFall(tower);
      await fx.hitstop(1);
      fx.tear(guard);
      fx.burst(r0.left + r0.width / 2, r0.top + r0.height / 2, 12);
      fx.quake(1, 0, 60);
      fx.coins('#hand .card', '#gold-chip', 8);
      const treated = document.querySelector('#hand .card.t-policromado, #hand .card.t-forjado, #hand .card.t-templado, #hand .card.t-agrietado');
      fx.sealStep('treat', treated);
      fx.sealStep('seal', document.querySelector('#hand .card'));
      await new Promise((res) => setTimeout(res, 1500));
      stop = true;
      return { flying: [...flying], shake, foil, split: tower.classList.contains('crown-split'), made: fx.made() - made0, treated: !!treated };
    });
    check(r.flying.length === 0, `con «Reducir movimiento», durante la caída del trono, el tajo y el vuelo de monedas no hay ninguna pieza en vuelo${r.flying.length ? ` (${r.flying.slice(0, 3).join(', ')})` : ''}`);
    check(r.shake === 0, `la mesa no tiembla (${r.shake} fotogramas con transform)`);
    check(r.foil === 0, `la lámina no pasa (${r.foil} fotogramas con la banda animada${r.treated ? '' : '; sin carta con acabado en la mano'})`);
    check(!r.split && r.made <= 1, `no se marca la corona partida ni se sacan piezas a volar (${r.made} piezas nuevas: a lo sumo el lacre, que solo se funde)`);
    // el foco salta sin rebote y el bocadillo y la cuenta ya se comprueban en la pasada normal
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    check(await page.evaluate(() => getComputedStyle(document.querySelector('.focus-ring i')!).animationName === 'none'), 'el foco llega sin rebote de escala');
    const hover = page.locator('#hand .card.t-policromado, #hand .card.t-forjado, #hand .card.t-templado, #hand .card.t-agrietado').first();
    if (await hover.count()) {
      await hover.hover();
      await page.waitForTimeout(120);
      check(await page.evaluate(() => [...document.querySelectorAll('.ly.foil .foil-band')].every((b) => !b.getAnimations().length)), 'pasar el ratón por una carta con lámina no la anima');
    }
  } finally {
    await ctx.close();
  }
}

// cierre garantizado: el código de salida es explícito (un zócalo o un intervalo vivo nunca deja a Node colgado)
main().then(
  (codigo) => process.exit(codigo),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
