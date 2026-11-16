import { guardian } from './guardian';
guardian('qa:fps', 300); // tope duro: ver scripts/guardian.ts
// V8 · npm run qa:fps — 60 fotogramas por segundo, medidos con aceleración gráfica de verdad.
// Lanza Chromium con los mismos argumentos que usaba GPU=1 en la prueba de humo y, si el renderizador de
// WebGL es por software (SwiftShader, llvmpipe) o no hay WebGL, falla: la medida no valdría.
//
// En 1920×1080, 1280×800 y 390×844 (es-ES, velocidad 1×) mide cinco escenarios pesados: golpe con tajo,
// caída de un trono con esquirlas, sello caliente en la cuenta, monedas en La Taberna y barrido del foco
// por la mano con el mando virtual. Sonda: los deltas de requestAnimationFrame desde que empieza el efecto
// hasta que acaba su última animación, sin los 2 primeros; al menos 60 fotogramas (si no, se repite).
// Antes de cada ventana, 1 s en reposo: la mediana es el refresco de la pantalla. Cada escenario se juega
// antes una vez en frío (no cuenta, va a enFrio en el informe): en un perfil nuevo la GPU compila sus
// sombreadores la primera vez que ve cada efecto, y eso no es lo que siente quien juega una partida.
//
// V12: un sexto escenario, «caida», solo en 1280×800 y 390×844: 40 piezas que saltan de los tronos, se posan, el
// cursor las aspira y el imán se lleva el resto a la bolsa (iman.ts).
//
// V11: antes de todo, una pasada en frío que SÍ cuenta: navegador recién lanzado, contexto nuevo en
// 1920×1080 y el primer sello de lacre de la sesión (con su lámina); falla si un fotograma pasa de 50 ms.
//
// Falla si en un escenario el p95 pasa de max(16,7 ms; refresco en reposo) + 0,5 ms, o si un fotograma
// pasa de 50 ms. Deja artifacts/mision/v8/fps.json. Tarda ≤ 3 min (sin contar la construcción); a los 5, falla.
//
//   npm run qa:fps          (construye antes; NO_BUILD=1 para saltarse la construcción)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { VIRTUAL_GAMEPAD } from './gamepad-qa';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';

const OUT = resolve('artifacts/mision/v8/fps.json');
const VIEWS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844 },
];
const LIMIT_MS = 5 * 60_000;

/** La sonda, dentro de la página: mide desde que se dispara el efecto hasta que acaba su última animación. */
const PROBE = `(() => {
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  // fotogramas largos con su atribución (Long Animation Frames), para el informe
  window.__fpsLoaf = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > 50) window.__fpsLoaf.push({ ms: Math.round(e.duration), bloqueo: Math.round(e.blockingDuration), guion: (e.scripts || []).map((x) => (x.invoker || '?') + ' ' + Math.round(x.duration) + ' ms') }); }).observe({ type: 'long-animation-frame' }); } catch {}
  window.__fpsIdle = async (ms) => {
    const d = [];
    let last = await raf();
    const t0 = last;
    while (last - t0 < ms) { const t = await raf(); d.push(t - last); last = t; }
    return d;
  };
  // antes de medir, la pantalla quieta: nada finito animándose (un aviso, un reparto de cartas)
  window.__fpsSettle = async (ms) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms && document.getAnimations().some((a) => a.playState === 'running' && Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity))) await raf();
  };
  // V12 · una mesa recién montada en un navegador nuevo sigue pintándose (la GPU compila sus sombreadores) aunque
  // ya no haya nada animándose: la pasada en frío del sello medía a veces ese montaje y no el sello (1 de cada 4).
  // Se espera a que lleve ms milisegundos seguidos pintando fotogramas de menos de 34 ms (por tiempo, no por número
  // de fotogramas: la pantalla puede ir a 165 Hz), o al tope, y se devuelve cuánto tardó en EMPEZAR ese tramo quieto.
  // Los 800 ms dejan terminar el calentamiento de los lacres del juego (warmSeals, que arranca a los 150 ms de
  // quietud y dura 240 ms): nadie puede sellar una carta antes de un segundo con la mesa recién puesta.
  window.__fpsQuieta = async (ms, tope) => {
    const t0 = performance.now();
    let last = await raf();
    let desde = last;
    while (last - desde < ms && performance.now() - t0 < tope) { const t = await raf(); if (t - last >= 34) desde = t; last = t; }
    return Math.round(Math.max(0, desde - t0));
  };
  window.__fpsMeasure = async (trigger, minMs, reset) => {
    const deltas = [];
    let reps = 0;
    window.__fpsLoaf.length = 0;
    while (deltas.length < 60 && reps < 10) {
      reps++;
      if (reset) await reset();
      await raf(); await raf();
      const before = new Set(document.getAnimations());
      let last = await raf();
      const t0 = last;
      const local = [];
      const done = Promise.resolve(trigger());
      let finished = false;
      done.then(() => (finished = true));
      let quiet = 0;
      for (let f = 0; f < 600; f++) {
        const t = await raf();
        local.push(t - last);
        last = t;
        // los avisos de logro (sus temporizadores son del juego, no del efecto) no alargan la medida
        const live = document.getAnimations().filter((a) => !before.has(a) && (a.playState === 'running' || a.pending) && !(a.effect?.target)?.closest?.('.ach-stack, .toast'));
        quiet = live.length ? 0 : quiet + 1;
        if (finished && t - t0 >= minMs && quiet >= 2) break;
      }
      deltas.push(...local.slice(2, local.length - Math.min(2, quiet)));
    }
    return { deltas, reps, loaf: window.__fpsLoaf.slice(0, 6) };
  };
})();`;

interface Medida {
  n: number;
  media: number;
  p95: number;
  max: number;
  largos: number;
  repeticiones: number;
}
const stats = (d: number[], reps: number): Medida => {
  const s = [...d].sort((a, b) => a - b);
  const r = (x: number) => Math.round(x * 100) / 100;
  return { n: s.length, media: r(s.reduce((a, b) => a + b, 0) / Math.max(1, s.length)), p95: r(s[Math.floor(s.length * 0.95)] ?? 0), max: r(s[s.length - 1] ?? 0), largos: s.filter((x) => x > 50).length, repeticiones: reps };
};

type Q = { __qa: { go(s: string): Promise<boolean> }; __qaFx: Record<string, (...a: unknown[]) => unknown> & { settings: { speed: number } }; __qaSfx: Record<string, (...a: unknown[]) => void>; __qaGamepad: { connect(): void; press(i: number, ms?: number): Promise<void> }; __fpsMeasure(trigger: () => unknown, minMs: number, reset?: () => unknown): Promise<{ deltas: number[]; reps: number; loaf?: unknown[] }>; __fpsIdle(ms: number): Promise<number[]> };
const go = (page: Page, s: string) => page.evaluate((x) => (window as unknown as Q).__qa.go(x), s);

/** Los cinco escenarios: cada uno prepara su pantalla y dispara el efecto como lo dispara el juego. */
const SCENARIOS: { name: string; label: string; views?: string[]; prep: (p: Page) => Promise<unknown>; run: (p: Page) => Promise<{ deltas: number[]; reps: number; loaf?: unknown[] }> }[] = [
  {
    name: 'tajo',
    label: 'golpe con tajo',
    prep: (p) => go(p, 'mesa'),
    run: (p) =>
      p.evaluate(() => {
        const w = window as unknown as Q;
        const guard = () => document.querySelector<HTMLElement>('.tower[data-suit="S"] .floor-slot .card')!;
        return w.__fpsMeasure(
          async () => {
            const g = guard();
            const r = g.getBoundingClientRect();
            await w.__qaFx.hitstop(1);
            w.__qaFx.tear(g);
            w.__qaFx.burst(r.left + r.width / 2, r.top + r.height / 2, 12, [0, -20]);
            w.__qaFx.quake(0.5, 0, 60);
            w.__qaSfx.hit();
          },
          800,
          () => (guard().style.visibility = ''),
        );
      }),
  },
  {
    name: 'trono',
    label: 'caída de un trono con esquirlas',
    prep: async (p) => {
      await go(p, 'mesa-esquirlas');
      await p.evaluate(() => document.querySelectorAll('body > .pieza, body > .esquirlas').forEach((n) => n.remove()));
    },
    run: (p) =>
      p.evaluate(() => {
        const w = window as unknown as Q;
        const tower = () => document.querySelector<HTMLElement>('.tower[data-suit="D"]')!;
        return w.__fpsMeasure(
          () => w.__qaFx.throneFall(tower()),
          1200,
          () => tower().querySelectorAll<SVGElement>('.crn-l, .crn-r').forEach((h) => (h.style.opacity = '')),
        );
      }),
  },
  {
    name: 'lacre',
    label: 'sello caliente y lámina en la cuenta',
    prep: (p) => go(p, 'mesa'),
    run: (p) =>
      p.evaluate(() => {
        const w = window as unknown as Q;
        const card = () => document.querySelector<HTMLElement>('#hand .card.z-dinamita, #hand .card.z-eco, #hand .card.z-jornal, #hand .card.z-sindical') ?? document.querySelector<HTMLElement>('#hand .card')!;
        const foil = () => document.querySelector<HTMLElement>('#hand .card.t-policromado, #hand .card.t-forjado, #hand .card.t-templado, #hand .card.t-agrietado');
        return w.__fpsMeasure(async () => {
          w.__qaFx.sealStep('seal', card());
          w.__qaSfx.tick(3);
          await new Promise((r) => setTimeout(r, 200));
          w.__qaFx.sealStep('treat', foil());
          w.__qaSfx.tick(4);
        }, 1150);
      }),
  },
  {
    name: 'monedas',
    label: 'monedas en La Taberna',
    prep: (p) => go(p, 'ferreteria'),
    run: (p) =>
      p.evaluate(() => {
        const w = window as unknown as Q;
        return w.__fpsMeasure(() => {
          w.__qaFx.coins('#npc', '.purse b', 8);
          w.__qaSfx.coins(8);
        }, 1000);
      }),
  },
  {
    // V12 · juice-ux B: lo que cae. 40 piezas saltan desde los tronos y se posan; el cursor pasa por encima de la mitad
    // (las aspira) y el imán se lleva el resto al segundo. Solo transform y opacity, con el depósito de 40.
    name: 'caida',
    label: '40 piezas que caen y se aspiran',
    views: ['1280x800', '390x844'],
    prep: async (p) => {
      await go(p, 'mesa');
      await p.evaluate(() => document.querySelectorAll('.whisper').forEach((w) => w.remove()));
    },
    run: (p) =>
      p.evaluate(() => {
        const w = window as unknown as Q & { __qaIman: { soltar(n: number): number; quietas(): { x: number; y: number }[]; estado(): { vivas: number } } };
        const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
        return w.__fpsMeasure(async () => {
          w.__qaIman.soltar(40);
          // el cursor barre la mesa cuando ya hay piezas posadas: aspira las que pilla
          await pausa(900);
          const q = w.__qaIman.quietas().slice(0, 20);
          for (const pt of q) {
            dispatchEvent(new PointerEvent('pointermove', { clientX: pt.x + 6, clientY: pt.y + 4, pointerType: 'mouse', bubbles: true }));
            await pausa(16);
          }
          const t0 = performance.now();
          while (w.__qaIman.estado().vivas > 0 && performance.now() - t0 < 5000) await pausa(50);
        }, 2000);
      }),
  },
  {
    name: 'foco',
    label: 'barrido del foco por la mano con el mando',
    prep: async (p) => {
      await go(p, 'mesa');
      await p.evaluate(async () => {
        const w = window as unknown as Q;
        w.__qaGamepad.connect();
        document.querySelector<HTMLElement>('#hand .card')?.focus({ preventScroll: true });
        await w.__qaGamepad.press(13); // el mando enciende el foco
        document.querySelector<HTMLElement>('#hand .card')?.focus({ preventScroll: true });
      });
    },
    run: (p) =>
      p.evaluate(() => {
        const w = window as unknown as Q;
        return w.__fpsMeasure(
          async () => {
            const n = document.querySelectorAll('#hand .card').length;
            for (let i = 0; i < n - 1; i++) await w.__qaGamepad.press(15, 40);
            for (let i = 0; i < n - 1; i++) await w.__qaGamepad.press(14, 40);
          },
          600,
          () => document.querySelector<HTMLElement>('#hand .card')?.focus({ preventScroll: true }),
        );
      }),
  },
];

async function renderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  });
}

async function main(): Promise<void> {
  ensureBuilt();
  const T0 = Date.now();
  const kill = setTimeout(() => {
    console.log('✗ qa:fps pasa de 5 min: falla');
    process.exit(1);
  }, LIMIT_MS);
  const site = await serveWeb();
  let browser: Browser | null = null;
  const fails: string[] = [];
  const report: Record<string, unknown> = { fecha: new Date().toISOString(), umbral: 'p95 ≤ max(16,7; refresco en reposo) + 0,5 ms · ningún fotograma > 50 ms', ventanas: {} };
  try {
    browser = await chromium.launch({ channel: 'chromium', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-zero-copy'] });
    // V11 · la pasada en frío del sello, la primera de todas: navegador recién lanzado (perfil y caché de
    // sombreadores nuevos), contexto nuevo en 1920×1080, la mesa puesta como al empezar un asalto y el PRIMER
    // sello de lacre de la sesión. Falla si un solo fotograma pasa de 50 ms.
    {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, locale: 'es-ES' });
      await ctx.addInitScript({ content: NAME_SHIM });
      await ctx.addInitScript({ content: PROBE });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => fails.push(`[frío] error de página: ${e.message}`));
      await page.goto(`${site.url}?qa=1`);
      await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
      await page.evaluate(() => ((window as unknown as Q).__qaFx.settings.speed = 1));
      await go(page, 'mesa');
      await page.mouse.click(960, 12);
      await page.evaluate(() => (window as unknown as { __fpsSettle(ms: number): Promise<void> }).__fpsSettle(6000));
      // el sello se mide con la mesa ya quieta: lo que tarda en asentarse el montaje en frío se informa aparte
      const asentado = await page.evaluate(() => (window as unknown as { __fpsQuieta(ms: number, tope: number): Promise<number> }).__fpsQuieta(800, 6000));
      report.frioMontajeAsentadoMs = asentado;
      console.log(`  en frío (1920×1080): la mesa recién montada queda quieta ${asentado} ms después del reparto; el sello se mide desde ahí`);
      const cold = await page.evaluate(async () => {
        const w = window as unknown as Q & { __fpsLoaf: unknown[] };
        const raf = () => new Promise<number>((r) => requestAnimationFrame(r));
        const card = document.querySelector<HTMLElement>('#hand .card.z-dinamita, #hand .card.z-eco, #hand .card.z-jornal, #hand .card.z-sindical');
        if (!card) return null;
        w.__fpsLoaf.length = 0;
        await raf();
        let last = await raf();
        const t0 = last;
        const d: number[] = [];
        // como en la cuenta de verdad: el lacre cae y, 200 ms después, pasa la lámina de un acabado
        w.__qaFx.sealStep('seal', card);
        w.__qaSfx.tick(3);
        let foiled = false;
        while (last - t0 < 1400) {
          const t = await raf();
          d.push(t - last);
          last = t;
          if (!foiled && t - t0 >= 200) {
            foiled = true;
            w.__qaFx.sealStep('treat', document.querySelector<HTMLElement>('#hand .card.t-policromado, #hand .card.t-forjado, #hand .card.t-templado, #hand .card.t-agrietado'));
            w.__qaSfx.tick(4);
          }
        }
        return { d, loaf: w.__fpsLoaf.slice(0, 4) };
      });
      if (!cold) fails.push('[frío] la mesa no tiene ninguna carta con sello');
      else {
        const m = stats(cold.d, 1);
        const ok = m.largos === 0;
        console.log(`${ok ? '✓' : '✗'} en frío (1920×1080, primer sello de la sesión): n ${m.n} · media ${m.media} ms · p95 ${m.p95} ms · máx ${m.max} ms · > 50 ms: ${m.largos}`);
        report.frioSello = { ...m, ...(m.largos ? { largosDetalle: cold.loaf } : {}) };
        if (!ok) fails.push(`[frío] primer sello de la sesión en 1920×1080: ${m.largos} fotogramas > 50 ms (máx ${m.max} ms)`);
      }
      await ctx.close();
    }
    for (const view of VIEWS) {
      const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, locale: 'es-ES' });
      await ctx.addInitScript({ content: NAME_SHIM });
      await ctx.addInitScript({ content: VIRTUAL_GAMEPAD });
      await ctx.addInitScript({ content: PROBE });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => fails.push(`[${view.name}] error de página: ${e.message}`));
      await page.goto(`${site.url}?qa=1`);
      await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
      if (!report.renderer) {
        const r = await renderer(page);
        report.renderer = r;
        console.log(`renderizador: ${r || 'sin WebGL'}`);
        if (!r || /swiftshader|llvmpipe|software|basic render/i.test(r)) {
          console.log('✗ sin aceleración gráfica: la medida no vale');
          fails.push('sin aceleración gráfica');
          break;
        }
      }
      await page.evaluate(() => ((window as unknown as Q).__qaFx.settings.speed = 1));
      // el audio arranca como en una partida (el primer clic lo enciende)
      await go(page, 'mesa');
      await page.mouse.click(Math.round(view.width / 2), 12);
      await page.waitForTimeout(600);
      const idle = await page.evaluate(() => (window as unknown as Q).__fpsIdle(1000));
      const sorted = [...idle].sort((a, b) => a - b);
      const refresh = Math.round((sorted[Math.floor(sorted.length / 2)] ?? 16.7) * 100) / 100;
      const limit = Math.max(16.7, refresh) + 0.5;
      console.log(`\n${view.name} · refresco en reposo ${refresh} ms (umbral p95 ${limit.toFixed(1)} ms)`);
      const out: Record<string, Medida> = {};
      const frio: Record<string, { max: number; largos: number; largosDetalle?: unknown[] }> = {};
      for (const sc of SCENARIOS) {
        if (sc.views && !sc.views.includes(view.name)) continue;
        // una pasada en frío, que no cuenta: el perfil de Playwright es nuevo en cada lanzamiento y la GPU
        // compila sus sombreadores la primera vez que ve cada efecto (en un jugador, una vez y a disco)
        await sc.prep(page);
        await page.evaluate(() => (window as unknown as { __fpsSettle(ms: number): Promise<void> }).__fpsSettle(6000));
        const coldRun = await sc.run(page);
        const cold = stats(coldRun.deltas, 1);
        // V11 (cierre): la primera vez también cuenta. Un fotograma en frío de más de 50 ms es un fallo.
        frio[sc.name] = { max: cold.max, largos: cold.largos, ...(cold.largos && coldRun.loaf?.length ? { largosDetalle: coldRun.loaf } : {}) };
        if (cold.largos) fails.push(`[${view.name}] ${sc.label} en frío: ${cold.largos} fotogramas > 50 ms (máx ${cold.max} ms)`);
        await sc.prep(page);
        await page.evaluate(() => (window as unknown as { __fpsSettle(ms: number): Promise<void> }).__fpsSettle(6000));
        const { deltas, reps, loaf } = await sc.run(page);
        const m: Medida & { largosDetalle?: unknown[] } = stats(deltas, reps);
        if (m.largos && loaf?.length) m.largosDetalle = loaf;
        out[sc.name] = m;
        const ok = m.n >= 60 && m.p95 <= limit && m.largos === 0;
        console.log(`${ok ? '✓' : '✗'} ${sc.label}: n ${m.n} · media ${m.media} ms · p95 ${m.p95} ms · máx ${m.max} ms · > 50 ms: ${m.largos} (${reps} pasadas; en frío, máx ${cold.max} ms)`);
        if (!ok) fails.push(`[${view.name}] ${sc.label}: p95 ${m.p95} ms (umbral ${limit.toFixed(1)}), ${m.largos} fotogramas > 50 ms, n ${m.n}`);
      }
      (report.ventanas as Record<string, unknown>)[view.name] = { reposo: refresh, umbral: Math.round(limit * 100) / 100, escenarios: out, enFrio: frio };
      await ctx.close();
    }
  } finally {
    // cierre con tope (infra/rapido): un navegador que no contesta no deja la puerta esperando
    await Promise.race([browser?.close().catch(() => undefined), new Promise((r) => (setTimeout(r, 10_000) as unknown as { unref(): void }).unref())]);
    site.close();
    clearTimeout(kill);
  }
  report.segundos = Math.round((Date.now() - T0) / 100) / 10;
  report.resultado = fails.length ? 'falla' : 'pasa';
  report.fallos = fails;
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${OUT.replace(/\\/g, '/').replace(/^.*?artifacts/, 'artifacts')} · ${report.segundos} s`);
  for (const f of fails) console.log(`! ${f}`);
  console.log(fails.length ? `\n${fails.length} fallos` : '\n60 fps: todo en orden.');
  process.exit(fails.length ? 1 : 0);
}

// cierre garantizado: también si algo lanza, la salida es explícita (sin depender del guardián)
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
