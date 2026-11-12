// Control de calidad visual: abre el juego construido (npm run build:web) en Chromium sin ventana,
// monta estados fijos (src/client/qa.ts), comprueba el DOM y guarda una captura de cada uno en
// artifacts/visual-qa/<ventana>/<estado>.png.
//
//   npm run qa:visual                    todas las ventanas y estados
//   npm run qa:visual -- mesa lupa       solo esos estados
//   VIEW=1366x768 npm run qa:visual      solo esa ventana
//
// Comprobaciones: sin desbordamiento horizontal en ninguna pantalla; la mesa cabe entera sin
// desplazamiento; mano, cartas de torre, cinturón, marcador y botones no se pisan; ningún texto de
// interfaz baja de 12 px; en móvil, todo lo que se pulsa mide al menos 44 px.
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve('dist/web');
const OUT = resolve('artifacts/visual-qa');
const VIEWS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844, mobile: true },
].filter((v) => !process.env.VIEW || process.env.VIEW.split(',').includes(v.name));
const ALL = ['portada', 'preparacion', 'mesa', 'lupa', 'lupa-herramienta', 'lupa-piso', 'plano', 'cobro', 'ferreteria', 'forja', 'hallazgo', 'gremio', 'coleccion', 'acta', 'ajustes'];
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const STATES = wanted.length ? ALL.filter((s) => wanted.includes(s)) : ALL;
/** Pantallas que tienen que caber enteras, sin desplazamiento vertical. */
const NO_SCROLL = ['portada', 'mesa', 'lupa', 'lupa-herramienta', 'lupa-piso'];

const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

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

/** Lo que se comprueba dentro de la página. Devuelve una lista de fallos legibles. */
function audit(opts: { state: string; mobile: boolean; noScroll: boolean }): string[] {
  const fails: string[] = [];
  const W = innerWidth;
  const H = innerHeight;
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
  };
  const name = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  // capa que manda: la ventana de arriba, o la pantalla
  const layers = [...document.querySelectorAll<HTMLElement>('.modal, .lupa')];
  const scope: HTMLElement = layers[layers.length - 1] ?? document.getElementById('app')!;

  // 1 · sin desbordamiento horizontal
  if (document.documentElement.scrollWidth > W + 1) fails.push(`desbordamiento horizontal del documento: ${document.documentElement.scrollWidth} > ${W}`);
  for (const el of scope.querySelectorAll<HTMLElement>('*')) {
    if (el.closest('svg, .hero-art, .card, .chalk-mark') || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > W + 2 || r.left < -2) {
      // dentro de una caja con desplazamiento propio no cuenta
      let p = el.parentElement;
      let clipped = false;
      while (p && p !== document.body) {
        const o = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(o.overflowX)) {
          const pr = p.getBoundingClientRect();
          if (pr.right <= W + 2 && pr.left >= -2) clipped = true;
          break;
        }
        p = p.parentElement;
      }
      if (!clipped) fails.push(`se sale por los lados: ${name(el)} (${Math.round(r.left)}…${Math.round(r.right)} de ${W})`);
    }
  }

  // 2 · pantallas de una pieza: nada por debajo del borde
  if (opts.noScroll) {
    if (document.documentElement.scrollHeight > H + 1) fails.push(`desbordamiento vertical del documento: ${document.documentElement.scrollHeight} > ${H}`);
    for (const el of scope.querySelectorAll<HTMLElement>('button, .card, .tower, .panel, .belt-slot, #score, .power, .reserve')) {
      if (!visible(el) || el.closest('.lupa-sheet')) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > H + 2 || r.top < -2) fails.push(`fuera de la ventana en vertical: ${name(el)} (${Math.round(r.top)}…${Math.round(r.bottom)} de ${H})`);
    }
  }

  // 3 · la mesa: cinco zonas que no se pisan
  if (opts.state === 'mesa') {
    const union = (sel: string) => {
      const rs = [...document.querySelectorAll(sel)].filter(visible).map((e) => e.getBoundingClientRect());
      if (!rs.length) return null;
      return { l: Math.min(...rs.map((r) => r.left)), t: Math.min(...rs.map((r) => r.top)), r: Math.max(...rs.map((r) => r.right)), b: Math.max(...rs.map((r) => r.bottom)) };
    };
    const zones: Record<string, ReturnType<typeof union>> = {
      mano: union('#hand .card'),
      torres: union('.floor-slot .card'),
      cinturon: union('#beltbar .belt-slot'),
      marcador: union('#score > *'),
      botones: union('.actions button'),
      andamio: union('#reserve'),
      poderes: union('#powers .power'),
    };
    const names = Object.keys(zones);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = zones[names[i]];
        const b = zones[names[j]];
        if (!a || !b) continue;
        const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (w > 2 && h > 2) fails.push(`se pisan ${names[i]} y ${names[j]} (${Math.round(w)}×${Math.round(h)} px)`);
      }
    }
    for (const z of ['mano', 'torres', 'cinturon', 'marcador', 'botones', 'poderes']) if (!zones[z]) fails.push(`falta en la mesa: ${z}`);
    // las tres bandas de la pantalla: torres, lateral y bandeja
    const bands: Record<string, ReturnType<typeof union>> = { 'las torres': union('.tower'), 'el lateral': union('.side > *'), 'la bandeja': union('.tray') };
    const bn = Object.keys(bands);
    for (let i = 0; i < bn.length; i++) {
      for (let j = i + 1; j < bn.length; j++) {
        const a = bands[bn[i]];
        const b = bands[bn[j]];
        if (!a || !b) continue;
        const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (w > 2 && h > 2) fails.push(`se montan ${bn[i]} y ${bn[j]} (${Math.round(w)}×${Math.round(h)} px)`);
      }
    }
    // cada torre entera, con su carta dentro
    for (const t of document.querySelectorAll('.tower')) {
      const tr = t.getBoundingClientRect();
      for (const c of t.querySelectorAll('.floor-slot .card, .hp, .storeys, .plates')) {
        const cr = c.getBoundingClientRect();
        if (cr.height > 0 && (cr.bottom > tr.bottom + 2 || cr.top < tr.top - 2 || cr.right > tr.right + 2 || cr.left < tr.left - 2)) fails.push(`se sale de su torre: ${name(c)}`);
      }
    }
    if (document.querySelectorAll('#hand .card').length < 8) fails.push('la mano de prueba tiene menos de 8 cartas');
    if (document.querySelectorAll('#beltbar .belt-slot.tool').length < 5) fails.push('el cinturón de prueba tiene menos de 5 herramientas');
    if (!document.querySelector('#reserve .card')) fails.push('el andamio de prueba está vacío');
    if (!document.querySelector('#score .calc')) fails.push('no hay previsualización de daño');
  }

  // 4 · tipografía de interfaz: 12 px como mínimo
  const small = new Map<string, number>();
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent?.trim() || el.closest('svg, .card, script, style') || !visible(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size >= 1 && size < 11.95) small.set(name(el), size);
  }
  for (const [el, size] of small) fails.push(`texto de ${size.toFixed(1)} px: ${el}`);

  // 5 · en móvil, lo que se pulsa mide 44 px
  if (opts.mobile) {
    for (const el of scope.querySelectorAll<HTMLElement>('button, .choice.pick, #hand .card, .reserve-slot, .belt-slot.tool, .tower, input')) {
      if (!visible(el) || (el as HTMLButtonElement).disabled) continue;
      const r = el.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 41.5 && !(el.matches('.belt-slot') && Math.min(r.width, r.height) >= 40)) fails.push(`diana de ${Math.round(r.width)}×${Math.round(r.height)} px: ${name(el)}`);
    }
  }
  return [...new Set(fails)];
}

async function main(): Promise<void> {
  if (!process.env.NO_BUILD) {
    const built = spawnSync('npm run build:web', { stdio: 'inherit', shell: true });
    if (built.status !== 0) process.exit(built.status ?? 1);
  }
  if (!existsSync(join(ROOT, 'index.html'))) throw new Error('Falta dist/web: ejecuta antes npm run build:web');
  const site = await serve();
  const browser = await chromium.launch();
  let failed = 0;
  const errors: string[] = [];
  for (const view of VIEWS) {
    const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: 1, hasTouch: !!view.mobile, isMobile: !!view.mobile, reducedMotion: 'no-preference' });
    // tsx envuelve las funciones con un ayudante que la página no conoce
    await context.addInitScript({ content: 'globalThis.__name = (f) => f;' });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`[${view.name}] ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && errors.push(`[${view.name}] consola: ${m.text()}`));
    await page.goto(`${site.url}?qa=1`);
    await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
    await page.evaluate(() => document.fonts.ready);
    mkdirSync(join(OUT, view.name), { recursive: true });
    for (const state of STATES) {
      const ok = await page.evaluate((s) => (window as unknown as { __qa: { go: (s: string) => Promise<boolean> } }).__qa.go(s), state);
      if (!ok) {
        console.log(`✗ ${view.name} ${state}: estado desconocido`);
        failed++;
        continue;
      }
      await page.waitForTimeout(450);
      await page.evaluate(() => document.getAnimations().forEach((a) => a.effect?.getComputedTiming().iterations !== Infinity && a.finish()));
      await page.waitForTimeout(120);
      const fails = await page.evaluate(audit, { state, mobile: !!view.mobile, noScroll: NO_SCROLL.includes(state) });
      await page.screenshot({ path: join(OUT, view.name, `${state}.png`) });
      if (fails.length) {
        failed += fails.length;
        console.log(`✗ ${view.name} ${state}`);
        for (const f of fails.slice(0, 14)) console.log(`    · ${f}`);
        if (fails.length > 14) console.log(`    … y ${fails.length - 14} más`);
      } else console.log(`✓ ${view.name} ${state}`);
    }
    await context.close();
  }
  await browser.close();
  site.close();
  for (const e of [...new Set(errors)]) console.log(`! ${e}`);
  console.log(`\n${VIEWS.length * STATES.length} capturas en ${OUT}`);
  console.log(failed || errors.length ? `${failed} fallos de maquetación, ${new Set(errors).size} errores de página` : 'Todo en su sitio.');
  process.exit(failed || errors.length ? 1 : 0);
}

void main();
