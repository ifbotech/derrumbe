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
//   npm run qa:smoke          (construye antes; NO_BUILD=1 para saltarse la construcción)
//   NO_PAD=1 se salta la parte del mando virtual · GPU=1 lanza Chromium con aceleración
//   QA_DIR=dist/qa-<celda> construye aparte · QA_OUT=artifacts/visual-qa-<celda> guarda allí las capturas
//   --lang=en (o QA_LANG=en): la pasada en inglés (locale en-US); las capturas van a artifacts/visual-qa-en/smoke
// V10: en las dos pasadas, el interruptor ES | EN con teclado y con mando (Portada y Ajustes, sin recargar),
// «Alto contraste», que el idioma se recuerda al recargar y la insignia Ⓐ de La Taberna con mando (SD5).
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Browser, chromium, Page } from 'playwright';
import { LANG, LOCALE, OTHER, T, gamepadSuite, guidedRun, langSwitchSuite, sealCheck } from './gamepad-qa';
import { controlRows } from '../src/client/prompts';
import { BRAND } from '../src/shared/brand';
import { telemetrySuite } from './telemetry-qa';
import { feedbackButtonsSuite } from './feedback-qa';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';

const OUT = resolve(process.env.QA_OUT?.trim() ? join(process.env.QA_OUT.trim(), 'smoke') : LANG === 'en' ? 'artifacts/visual-qa-en/smoke' : 'artifacts/visual-qa/smoke');

const problems: string[] = [];
const check = (ok: unknown, what: string) => {
  console.log(`${ok ? '✓' : '✗'} ${what}`);
  if (!ok) problems.push(what);
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

async function main(): Promise<void> {
  ensureBuilt();
  const site = await serveWeb();
  // GPU=1 usa Chromium completo con aceleración: es como de verdad se mide la fluidez. Sin ella, el
  // navegador sin ventana lo pinta todo por CPU y los tiempos de fotograma solo son orientativos.
  const gpu = !!process.env.GPU;
  const browser = await chromium.launch(gpu ? { channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-zero-copy'] } : {});
  // La marca y el idioma salen de navigator.language: es-ES en la pasada española, en-US en la inglesa.
  console.log(`Pasada en ${LANG === 'en' ? 'inglés' : 'español'} (${LOCALE})`);
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
  await context.addInitScript({ content: NAME_SHIM });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`consola: ${m.text()}`));
  mkdirSync(OUT, { recursive: true });
  await page.goto(`${site.url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
  check((await page.evaluate(() => document.documentElement.lang)) === LANG, `sin nada guardado, el idioma sale del navegador (${LOCALE} → <html lang="${LANG}">)`);

  // ── un golpe de verdad: el trío de sietes contra el trono apuntado ──
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

  // ── Mayús + flechas mueven la reliquia enfocada, y el foco va con ella ──
  {
    const before = await runTools(page);
    await page.locator('#beltbar .belt-slot[data-slot="0"]').focus();
    await page.keyboard.press('Shift+ArrowRight');
    await page.waitForTimeout(250);
    const after = await runTools(page);
    check(after[0] === before[1] && after[1] === before[0], 'Mayús + → mueve la reliquia a la derecha');
    check(await page.evaluate((id) => !!document.activeElement?.matches(`#beltbar .belt-slot[data-slot="1"][data-id="${id}"]`), before[0]), 'y el foco viaja con ella');
    await page.keyboard.press('Shift+ArrowLeft');
    await page.waitForTimeout(250);
    check((await runTools(page)).join() === before.join(), 'Mayús + ← la devuelve');
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
  check(pads.length >= 12 && !pads.some((t) => t.trim() === '—' || t.trim() === ''), 'en la tabla de controles ninguna acción se queda sin mando');
  check(pads.some((t) => t.includes('L3')) && pads.some((t) => t.includes('R3')) && pads.some((t) => t.includes('LB / RB')), 'la tabla enseña L3 (descartar), R3 (pantalla completa) y LB / RB (reliquias)');
  const rows = await page.locator('.keys tr td:nth-child(1)').allTextContents();
  const want = controlRows(LANG).map((r) => r.map((c) => c.replace(/<[^>]+>/g, '')));
  check(['ui.ctl.manga', 'ui.ctl.rebobinar', 'ui.ctl.reliquias', 'ui.ctl.golpear'].every((k) => rows.includes(T(k))), 'la tabla de controles habla de La Manga, Rebobinar, reliquias y tronos');
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

  // ── V7 · la partida guiada se juega entera: con el teclado (medida) y con el ratón ──
  console.log('Partida guiada');
  const shot = (p: Page, name: string) => p.screenshot({ path: join(OUT, `${name}.png`) });
  await page.keyboard.press('ArrowDown'); // el teclado vuelve a ser el dispositivo en uso
  await guidedRun(page, 'keys', check, shot);
  await page.screenshot({ path: join(OUT, 'partida-guiada.png') });
  await page.locator('#t-home').click();
  await page.waitForSelector('#m-tuto');
  check((await count(page, '.end')) === 0 && !(await page.evaluate(() => document.documentElement.dataset.guia)), '«Jugar de verdad» vuelve a la portada sin dejar el foco de la guía');
  await guidedRun(page, 'mouse', check);
  await page.locator('#t-again').click();
  await page.waitForSelector('.table-screen');
  await page.waitForFunction(() => document.documentElement.dataset.guia === '1', null, { timeout: 10_000 });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check((await count(page, '.table-screen')) === 0 && (await count(page, '#m-tuto')) === 1 && !(await page.evaluate(() => document.documentElement.dataset.guia)), 'Esc salta la partida guiada de un toque y vuelve a la portada');

  // ── V7 · F1 con el teclado: el sello «×0» sigue al trono enfocado ──
  await sealCheck(page, 'keys', check);

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
    check(bark?.heard.includes('sequia:entrada'), `un asalto con monarca enseña su bocadillo de entrada${bark ? ` («${bark.text}»)` : ''}`);
    check(bark && !bark.covers && bark.n === 1, 'el bocadillo no tapa la mano ni la cuenta, y hay uno solo');
    check(bark && bark.ms <= 2500, `el bocadillo dura ≤ 2,5 s a 1× (${bark?.ms} ms)`);
    check((await sounds(page)).some((s) => s === 'monarch:sequia:entrada'), 'el monarca entra con su firma sonora');
    await page.waitForTimeout(2900);
    check(await page.evaluate(() => document.getElementById('bark')?.hidden !== false), 'y se va solo');
    // con «Reducir movimiento» entra sin animación
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const calm = await page.evaluate(async () => {
      const w = window as unknown as { __qaVoz: { say(id: string, kind: string): void } };
      w.__qaVoz.say('furia', 'contraataque');
      await new Promise((r) => setTimeout(r, 60));
      const el = document.getElementById('bark');
      return el && !el.hidden ? getComputedStyle(el).animationName : 'oculto';
    });
    check(calm === 'none', `con «Reducir movimiento» el bocadillo aparece sin animación (${calm})`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const stacked = await page.evaluate(async () => {
      const w = window as unknown as { __qaVoz: { say(id: string, kind: string): void } };
      w.__qaVoz.say('furia', 'caida');
      w.__qaVoz.say('furia', 'entrada');
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
    check(log.some((r) => r.modo === 'guia' && r.guia === 'victoria') && log.some((r) => r.modo === 'guia' && r.guia === 'saltada'), 'la partida guiada queda apuntada: terminada y saltada');
  }
  await page.screenshot({ path: join(OUT, 'fin-de-asalto.png') });

  // ── la campaña jugada solo con un mando (virtual): menú, asalto entero, Botín y La Taberna ──
  if (!process.env.NO_PAD) {
    console.log('Mando virtual');
    await gamepadSuite(browser, site.url, check, problems, (p, name) => p.screenshot({ path: join(OUT, `${name}.png`) }));
  }

  // ── V9 · datos de prueba con la red bloqueada: cero peticiones sin pulsar, una al pulsar ──
  console.log('Datos de prueba');
  await telemetrySuite(browser, site.url, check, problems);
  // arte-ui · el botón «Enviar Crónica / Feedback de Prueba» pulsado de verdad (ratón, teclado y mando)
  console.log('Botón de feedback');
  await feedbackButtonsSuite(browser, site.url, check, problems);

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
      localStorage.setItem('derrumbe:meta', JSON.stringify({ ...meta, renown: 77 }));
      localStorage.setItem('derrumbe:name', 'Conjurada QA');
    });
    await p.reload();
    await p.waitForSelector('#m-guild');
    check((await guild())?.includes('77 ✦'), 'el perfil de prueba tiene 77 Coronas');
    await p.locator('#m-set').click();
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('#set-export').click()]);
    const saved = join(OUT, 'copia.json');
    await download.saveAs(saved);
    const copy = JSON.parse(readFileSync(saved, 'utf8')) as { app: string; data: Record<string, string> };
    check(/^sangre-y-palo-progreso-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), `Exportar progreso descarga sangre-y-palo-progreso-AAAA-MM-DD.json (${download.suggestedFilename()})`);
    check(copy.app === 'derrumbe' && JSON.parse(copy.data['derrumbe:meta']).renown === 77 && copy.data['derrumbe:name'] === 'Conjurada QA', 'la copia lleva la Orden y el nombre (marcador interno app: «derrumbe»)');
    check(!Object.keys(copy.data).includes('derrumbe:server'), 'la copia no se lleva la dirección del servidor de esta instalación');
    // se pierde todo…
    await p.evaluate(() => localStorage.clear());
    await p.reload();
    await p.waitForSelector('#m-guild');
    check((await guild())?.includes('0 ✦') && !(await guild())?.includes('77'), 'tras borrar el navegador, la Orden vuelve a cero');
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
    check(/77 ✦ (Coronas|Crowns)/.test((await p.locator('.modal-box.confirm').textContent()) ?? ''), 'antes de importar se enseña qué trae la copia');
    await Promise.all([p.waitForEvent('load'), p.locator('#yes').click()]);
    await p.waitForSelector('#m-guild');
    check((await guild())?.includes('77 ✦'), 'Importar progreso recupera la Orden tras recargar');
    check((await p.evaluate(() => localStorage.getItem('derrumbe:name'))) === 'Conjurada QA', 'y el resto de lo guardado');
    await ctx.close();
  }

  await browser.close();
  site.close();
  for (const p of [...new Set(problems)]) console.log(`! ${p}`);
  console.log(problems.length ? `\n${new Set(problems).size} problemas` : '\nTodo en orden.');
  process.exit(problems.length ? 1 : 0);
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
      await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
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

void main();
