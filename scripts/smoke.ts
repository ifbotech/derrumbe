// Prueba de humo en el navegador: juega de verdad unos turnos sobre el juego construido
// (dist/web) y falla si algo lanza un error. Cubre lo que las pruebas del motor no ven: la mesa,
// el andamio, la tiza, la lupa, el foco de teclado, el reinicio con R y una campaña del bot entera.
//
//   npm run qa:smoke          (construye antes; NO_BUILD=1 para saltarse la construcción)
//   NO_PAD=1 se salta la parte del mando virtual · GPU=1 mide la fluidez con aceleración
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, Page } from 'playwright';
import { gamepadSuite } from './gamepad-qa';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';

const OUT = resolve('artifacts/visual-qa/smoke');

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
  ensureBuilt();
  const site = await serveWeb();
  // GPU=1 usa Chromium completo con aceleración: es como de verdad se mide la fluidez. Sin ella, el
  // navegador sin ventana lo pinta todo por CPU y los tiempos de fotograma solo son orientativos.
  const gpu = !!process.env.GPU;
  const browser = await chromium.launch(gpu ? { channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-zero-copy'] } : {});
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript({ content: NAME_SHIM });
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

  // ── la campaña jugada solo con un mando (virtual): menú, obra entera, cobro y ferretería ──
  if (!process.env.NO_PAD) {
    console.log('Mando virtual');
    await gamepadSuite(browser, site.url, check, problems, (p, name) => p.screenshot({ path: join(OUT, `${name}.png`) }));
  }

  // ── copia de seguridad, con el guardado de verdad (sin ?qa): exportar, perderlo todo e importar ──
  console.log('Copia de seguridad');
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
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
      localStorage.setItem('derrumbe:meta', JSON.stringify({ ...meta, renown: 77 }));
      localStorage.setItem('derrumbe:name', 'Capataz QA');
    });
    await p.reload();
    await p.waitForSelector('#m-guild');
    check((await guild())?.includes('77 ✦'), 'el perfil de prueba tiene 77 de renombre');
    await p.locator('#m-set').click();
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('#set-export').click()]);
    const saved = join(OUT, 'copia.json');
    await download.saveAs(saved);
    const copy = JSON.parse(readFileSync(saved, 'utf8')) as { app: string; data: Record<string, string> };
    check(/^derrumbe-progreso-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), 'Exportar progreso descarga un .json con la fecha');
    check(copy.app === 'derrumbe' && JSON.parse(copy.data['derrumbe:meta']).renown === 77 && copy.data['derrumbe:name'] === 'Capataz QA', 'la copia lleva el gremio y el nombre');
    check(!Object.keys(copy.data).includes('derrumbe:server'), 'la copia no se lleva la dirección del servidor de esta instalación');
    // se pierde todo…
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForSelector('#m-guild');
    check((await guild())?.includes('0 ✦') && !(await guild())?.includes('77'), 'tras borrar el navegador, el gremio vuelve a cero');
    await p.locator('#m-set').click();
    // …un archivo cualquiera no cuela…
    await p.locator('#set-file').setInputFiles({ name: 'otra-cosa.json', mimeType: 'application/json', buffer: Buffer.from('{"app":"otro","data":{}}') });
    await p.waitForTimeout(300);
    check((await p.locator('.modal-box.confirm').count()) === 0 && (await p.locator('.toast').last().textContent())?.includes('no es una copia'), 'Importar rechaza un archivo que no es una copia del juego');
    await p.locator('#set-file').setInputFiles({ name: 'rota.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'derrumbe', data: { 'derrumbe:meta': '{rota' } })) });
    await p.waitForTimeout(300);
    check((await p.locator('.modal-box.confirm').count()) === 0, 'y una copia dañada, sin tocar lo guardado');
    // …y la copia buena lo devuelve todo, previa confirmación
    await p.locator('#set-file').setInputFiles(saved);
    await p.waitForSelector('.modal-box.confirm');
    check((await p.locator('.modal-box.confirm').textContent())?.includes('77 ✦ de renombre'), 'antes de importar se enseña qué trae la copia');
    await Promise.all([p.waitForEvent('load'), p.locator('#yes').click()]);
    await p.waitForSelector('#m-guild');
    check((await guild())?.includes('77 ✦'), 'Importar progreso recupera el gremio tras recargar');
    check((await p.evaluate(() => localStorage.getItem('derrumbe:name'))) === 'Capataz QA', 'y el resto de lo guardado');
    await ctx.close();
  }

  await browser.close();
  site.close();
  for (const p of [...new Set(problems)]) console.log(`! ${p}`);
  console.log(problems.length ? `\n${new Set(problems).size} problemas` : '\nTodo en orden.');
  process.exit(problems.length ? 1 : 0);
}

void main();
