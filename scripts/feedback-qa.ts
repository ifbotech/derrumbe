// V9 · arte-ui · El botón «Enviar Crónica / Feedback de Prueba» pulsado de verdad, con la red bloqueada.
// En la Crónica (acta-derrota) y en Ajustes (ajustes), con ratón, con teclado y con el mando virtual:
//   · compilación normal: cero peticiones al abrir y al pulsar; la confirmación sale y se descarga el .json;
//   · compilación con VITE_TELEMETRY_URL de prueba (la deja construida telemetry-qa.ts): cero peticiones al
//     abrir cada pantalla y exactamente una por pulsación, con «Enviado» a la vista.
// Y en Ajustes, «Ver» enseña lo guardado tal cual y «Borrar» lo borra.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Page } from 'playwright';
import { BTN, VIRTUAL_GAMEPAD, focusOn, press, walkKeys } from './gamepad-qa';
import { TEST_URL } from './telemetry-qa';
import { NAME_SHIM, WEB_ROOT, serveWeb } from './web';

type Check = (ok: unknown, what: string) => void;
type How = 'raton' | 'teclado' | 'mando';
const SEND = '#fb-send';
const LABEL = 'Enviar Crónica / Feedback de Prueba';

/** Una página con la red cortada: lo que no es del sitio se apunta; la dirección de prueba «responde» sin salir. */
async function open(browser: Browser, url: string, problems: string[], tag: string) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'es-ES', acceptDownloads: true });
  await ctx.addInitScript({ content: NAME_SHIM });
  await ctx.addInitScript({ content: VIRTUAL_GAMEPAD });
  const out: { url: string; method: string; body: string }[] = [];
  await ctx.route(
    (u) => !u.href.startsWith(url),
    async (route) => {
      const req = route.request();
      out.push({ url: req.url(), method: req.method(), body: req.postData() ?? '' });
      if (req.url() === TEST_URL) await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' });
      else await route.abort();
    },
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${tag}] error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon|ERR_FAILED/.test(m.text()) && problems.push(`[${tag}] consola: ${m.text()}`));
  await page.goto(`${url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
  await page.evaluate(() => (window as unknown as { __qaGamepad: { connect(): void } }).__qaGamepad.connect());
  return { ctx, page, out };
}

const go = (page: Page, state: string) => page.evaluate((s) => (window as unknown as { __qa: { go(s: string): Promise<boolean> } }).__qa.go(s), state);
const estado = (page: Page) => page.evaluate(() => ({ hecho: document.querySelector<HTMLElement>('.fb')?.dataset.hecho ?? '', text: document.querySelector('#fb-estado')?.textContent?.trim() ?? '' }));

/** Pulsa el botón con el dispositivo pedido. Devuelve si se llegó a pulsar. */
async function pulsar(page: Page, how: How): Promise<boolean> {
  if (how === 'raton') {
    await page.click(SEND);
    return true;
  }
  if (how === 'teclado') {
    if (!(await walkKeys(page, SEND))) return false;
    await page.keyboard.press('Enter');
    return true;
  }
  if (!(await focusOn(page, SEND))) return false;
  await press(page, BTN.A);
  return true;
}

/** Abre la pantalla, comprueba que abrirla no envía nada, pulsa y espera la confirmación. */
async function una(page: Page, out: unknown[], state: string, how: How, check: Check, remote: boolean): Promise<void> {
  const where = state.startsWith('acta') ? 'la Crónica' : 'Ajustes';
  const before = out.length;
  await go(page, state);
  await page.waitForTimeout(300);
  check(out.length === before, `abrir ${where} no hace ninguna petición (${out.length - before})`);
  const label = (await page.locator(SEND).textContent())?.trim();
  check(label === LABEL, `${where}: el botón dice «${label}»`);
  const promise = (await page.locator('#fb-estado').textContent())?.trim() ?? '';
  check(remote ? /se manda tu última campaña/.test(promise) : /Nada sale de este equipo/.test(promise), `${where}: antes de pulsar dice lo que va a pasar («${promise.slice(0, 60)}…»)`);
  const download = remote ? null : page.waitForEvent('download', { timeout: 10_000 }).catch(() => null);
  const ok = await pulsar(page, how);
  check(ok, `${where}: el botón se alcanza y se pulsa con ${how === 'raton' ? 'el ratón' : how === 'teclado' ? 'el teclado' : 'el mando'}`);
  await page.waitForFunction(() => !!document.querySelector<HTMLElement>('.fb')?.dataset.hecho, null, { timeout: 10_000 }).catch(() => null);
  const s = await estado(page);
  if (remote) {
    check(s.hecho === 'enviado' && /^Enviado/.test(s.text), `${where} (${how}): la confirmación sale («${s.text}»)`);
    check(out.length === before + 1, `${where} (${how}), con la dirección puesta: exactamente una petición por pulsación (${out.length - before})`);
  } else {
    const file = await download;
    check(['copiado', 'descargado'].includes(s.hecho) && /^(Copiado|Descargado)/.test(s.text), `${where} (${how}): la confirmación sale («${s.text}»)`);
    check(file && /^sangre-y-palo-feedback-\d{4}-\d{2}-\d{2}\.json$/.test(file.suggestedFilename()), `${where} (${how}): se descarga el archivo (${file?.suggestedFilename() ?? 'nada'})`);
    check(out.length === before, `${where} (${how}), compilación normal: cero peticiones al pulsar (${out.length - before})`);
  }
}

export async function feedbackButtonsSuite(browser: Browser, url: string, check: Check, problems: string[]): Promise<void> {
  // ── compilación normal: nada sale, ni al abrir ni al pulsar ──
  {
    const { ctx, page, out } = await open(browser, url, problems, 'botón');
    await una(page, out, 'acta-derrota', 'raton', check, false);
    await una(page, out, 'acta-derrota', 'mando', check, false);
    await una(page, out, 'ajustes', 'teclado', check, false);
    // «Ver» enseña lo guardado tal cual; «Borrar» lo borra
    const saved = await page.evaluate(() => JSON.stringify((window as unknown as { __qaTelemetry: { telemetryLog(): unknown[] } }).__qaTelemetry.telemetryLog(), null, 2));
    await page.click('#fb-ver');
    const shown = await page.locator('.fb-ver textarea').inputValue();
    const ro = await page.locator('.fb-ver textarea').getAttribute('readonly');
    check(shown === saved && ro !== null && JSON.parse(shown).length >= 1, `«Ver» enseña lo guardado tal cual, en un cuadro de solo lectura (${Buffer.byteLength(shown)} bytes)`);
    await page.click('.fb-ver .x');
    await page.click('#fb-borrar');
    const after = await page.evaluate(() => ({ n: (window as unknown as { __qaTelemetry: { telemetryLog(): unknown[] } }).__qaTelemetry.telemetryLog().length, send: (document.querySelector('#fb-send') as HTMLButtonElement | null)?.disabled, count: document.querySelector('#fb-cuenta')?.textContent ?? '' }));
    check(after.n === 0 && after.send === true && /^0 campañas/.test(after.count), `«Borrar» deja los datos de prueba vacíos («${after.count}») y el botón sin nada que mandar`);
    check(out.length === 0, `compilación normal: cero peticiones en total (${out.length})`);
    await ctx.close();
  }

  // ── compilación con la dirección de prueba: una petición por pulsación, ninguna al abrir ──
  const dir = `${WEB_ROOT}-telemetria`;
  if (!existsSync(join(dir, 'index.html'))) {
    check(false, `falta la compilación con VITE_TELEMETRY_URL (${dir}); la deja telemetry-qa.ts`);
    return;
  }
  const site = await serveWeb(dir);
  try {
    const { ctx, page, out } = await open(browser, site.url, problems, 'botón con URL');
    await una(page, out, 'acta-derrota', 'raton', check, true);
    await una(page, out, 'acta-derrota', 'mando', check, true);
    await una(page, out, 'ajustes', 'teclado', check, true);
    const log = await page.evaluate(() => (window as unknown as { __qaTelemetry: { telemetryLog(): unknown[] } }).__qaTelemetry.telemetryLog());
    check(out.length === 3 && out.every((o) => o.url === TEST_URL && o.method === 'POST' && o.body === JSON.stringify(log.at(-1))), `tres pulsaciones, tres POST a la dirección de prueba con la última campaña y nada más (${out.length})`);
    await ctx.close();
  } finally {
    site.close();
  }
}
