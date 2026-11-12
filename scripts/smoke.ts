// Prueba de humo en el navegador: juega de verdad unos turnos sobre el juego construido
// (dist/web) y falla si algo lanza un error. Cubre lo que las pruebas del motor no ven: la mesa,
// el andamio, la tiza, la lupa, el foco de teclado, el reinicio con R y una campaña del bot entera.
//
//   npm run qa:smoke          (construye antes; NO_BUILD=1 para saltarse la construcción)
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium, Page } from 'playwright';

const ROOT = resolve('dist/web');
const OUT = resolve('artifacts/visual-qa/smoke');
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };

function serve(): Promise<{ url: string; close: () => void }> {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([/\\])+/, '');
    let file = join(ROOT, path || 'index.html');
    if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`, close: () => server.close() })));
}

const problems: string[] = [];
const check = (ok: unknown, what: string) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) problems.push(what);
};
const go = (page: Page, state: string) => page.evaluate((s) => (window as unknown as { __qa: { go: (s: string) => Promise<boolean> } }).__qa.go(s), state);
const count = (page: Page, sel: string) => page.locator(sel).count();
/** Espera a que la mesa termine de animar y vuelva a dejar jugar. */
const settled = (page: Page) => page.waitForFunction(() => !document.querySelector('.handrow.locked') || !!document.querySelector('.end, .run, .modal'), null, { timeout: 30_000 });

async function main(): Promise<void> {
  if (!process.env.NO_BUILD) {
    const built = spawnSync('npm run build:web', { stdio: 'inherit', shell: true });
    if (built.status !== 0) process.exit(built.status ?? 1);
  }
  const site = await serve();
  // GPU=1 usa Chromium completo con aceleración: es como de verdad se mide la fluidez. Sin ella, el
  // navegador sin ventana lo pinta todo por CPU y los tiempos de fotograma solo son orientativos.
  const gpu = !!process.env.GPU;
  const browser = await chromium.launch(gpu ? { channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-zero-copy'] } : {});
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript({ content: 'globalThis.__name = (f) => f;' });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`consola: ${m.text()}`));
  mkdirSync(OUT, { recursive: true });
  await page.goto(`${site.url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);

  // ── un golpe de verdad: el trío de sietes contra la torre apuntada ──
  await go(page, 'mesa');
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
  if (gpu) check(perf.avg < 18 && perf.p95 < 34, 'el golpe se anima a 60 fotogramas por segundo (media < 18 ms, p95 < 34 ms)');
  else console.log('  (pintado por CPU: para medir la fluidez real, GPU=1 npm run qa:smoke)');
  const hpAfter = await page.locator('.tower[data-suit="H"] .hp span').textContent();
  check(hpBefore !== hpAfter, `el golpe cambia la torre (${hpBefore} → ${hpAfter})`);
  check((await count(page, '#hand .card')) >= 5, 'la mano se repone tras el golpe');
  await page.screenshot({ path: join(OUT, 'tras-el-golpe.png') });

  // ── tiza de replanteo: Z deshace el golpe ──
  check(await page.locator('#btn-undo').isEnabled(), 'la tiza queda disponible tras jugar');
  await page.keyboard.press('z');
  await page.waitForTimeout(400);
  await settled(page);
  check((await page.locator('.tower[data-suit="H"] .hp span').textContent()) === hpBefore, 'la tiza devuelve la torre a como estaba');
  check(await page.locator('#btn-undo').isDisabled(), 'la tiza se gasta (una por obra)');

  // ── andamio: Y guarda la carta elegida ──
  const inReserve = await count(page, '#reserve .card');
  await page.locator('#hand .card').first().click();
  await page.keyboard.press('y');
  await page.waitForTimeout(300);
  await settled(page);
  check((await count(page, '#reserve .card')) === inReserve + 1, 'Y guarda una carta en el andamio');

  // ── foco de teclado y lupa ──
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  check((await count(page, '.focus-ring.on')) === 1, 'las flechas encienden el foco de latón');
  check(await page.evaluate(() => document.querySelector('.bar')!.getBoundingClientRect().top === 0 && document.scrollingElement!.scrollTop === 0), 'enfocar con el teclado no desplaza la mesa');
  await page.locator('#beltbar .belt-slot.tool').first().click({ button: 'right' });
  check((await count(page, '.lupa')) === 1, 'el clic derecho abre la lupa de grabador');
  await page.keyboard.press('Escape');
  check((await count(page, '.lupa')) === 0, 'Esc cierra la lupa');
  await page.locator('#hand .card').first().hover();
  await page.keyboard.press('l');
  check((await count(page, '.lupa')) === 1, 'L abre la lupa sobre la carta señalada');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  check((await count(page, '.deck-modal')) === 1, 'Tab abre el mazo');
  await page.keyboard.press('Escape');

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
  check((await count(page, '.run')) === 1 && (await page.locator('.deck-head h1').textContent())?.includes('sobre'), 'mantener R 0,7 s reinicia la campaña (vuelve al sobre)');

  // ── dos tintas clásicas y ajustes ──
  await go(page, 'ajustes');
  await page.locator('#set-toggles button').nth(2).click();
  check(await page.evaluate(() => document.documentElement.classList.contains('inks2')), 'el ajuste cambia a 2 tintas clásicas');
  await page.locator('#set-toggles button').nth(2).click();
  check(await page.evaluate(() => !document.documentElement.classList.contains('inks2')), '…y vuelve a 4 tintas de taller');
  await page.keyboard.press('Escape');

  // ── colección: la lupa abre también barajas y jefes, con su sello de maestría ──
  await go(page, 'coleccion');
  await page.locator('.col-sec .choice .card[data-lupa^="deck:"]').first().click({ button: 'right' });
  check((await count(page, '.lupa .mastery')) === 1, 'la lupa de una baraja ganada enseña su sello de maestría');
  await page.keyboard.press('Escape');
  await page.locator('.col-sec .card[data-lupa^="boss:"]').first().click({ button: 'right' });
  check((await count(page, '.lupa .lupa-epi')) === 1, 'la lupa de un jefe trae su epígrafe');
  await page.screenshot({ path: join(OUT, 'lupa-jefe.png') });
  await page.keyboard.press('Escape');

  // ── la partida guiada arranca y el capataz habla ──
  await go(page, 'portada');
  await page.locator('#m-tuto').click();
  await page.waitForSelector('.table-screen');
  await page.waitForTimeout(600);
  check((await count(page, '#coach:not([hidden])')) === 1, 'la partida guiada enseña al capataz');
  for (let i = 0; i < 4 && (await count(page, '#coach button')) > 0; i++) {
    await page.locator('#coach button').first().click();
    await page.waitForTimeout(250);
  }
  check((await count(page, '#reserve:not([hidden])')) === 0, 'en la partida guiada no hay andamio');
  await page.screenshot({ path: join(OUT, 'partida-guiada.png') });

  // ── una obra entera jugada con el teclado: 1–9 eligen, espacio golpea ──
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
  check(turns > 3 && turns < 60, `una obra entera a teclado termina (${turns} turnos)`);
  check((await count(page, '.run, .end')) > 0, 'al terminar la obra se pasa al cobro o al acta');
  await page.screenshot({ path: join(OUT, 'fin-de-obra.png') });

  await browser.close();
  site.close();
  for (const p of [...new Set(problems)]) console.log(`! ${p}`);
  console.log(problems.length ? `\n${new Set(problems).size} problemas` : '\nTodo en orden.');
  process.exit(problems.length ? 1 : 0);
}

void main();
