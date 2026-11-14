// V9 · Datos de prueba en el navegador, con la red bloqueada. Los botones aún no existen (los pinta arte-ui):
// aquí «pulsar» es llamar a shareFeedback() por el enganche de QA window.__qaTelemetry (?qa=1). Se le pasa a
// la telemetría de la página, por sus mismos enganches (noteRun, noteTurn, noteAction), una campaña entera
// jugada por el bot de referencia, y se cuentan las peticiones que salen de la página:
//   · compilación normal: una campaña entera y una llamada a shareFeedback → cero peticiones; descarga el archivo;
//   · compilación con VITE_TELEMETRY_URL de prueba: sin llamarla, ninguna; al llamarla, exactamente una.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Browser, Page } from 'playwright';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { applyAction, currentPlayer } from '../src/rules/engine';
import { Run, finishBattle, newRun, runAction, startStage, trackEvents } from '../src/rules/run';
import { NAME_SHIM, WEB_ROOT, serveWeb } from './web';

type Check = (ok: unknown, what: string) => void;
/** Dirección de prueba: no existe (.invalid); la página nunca llega a ella porque la prueba corta antes. */
export const TEST_URL = 'https://telemetria.invalid/recoger';

type Step = ['run', Partial<Run>] | ['turn', number] | ['act', string];

/** Una campaña del bot, con lo que la mesa le diría a la telemetría (solo los campos que lee). */
function botCampaign(seed: number): { steps: Step[]; run: Run } {
  const run = newRun({ seedText: `HUMO-${seed}`, deck: 'obra' }, seed);
  const steps: Step[] = [];
  const note = () => steps.push(['run', structuredClone({ id: run.id, seedText: run.seedText, deckId: run.deckId, ascension: run.ascension, stage: run.stage, phase: run.phase, loot: run.loot, shop: run.shop, tools: run.tools, stats: run.stats, death: run.death })]);
  note();
  for (let guard = 0; guard < 3000 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
    if (run.phase === 'battle') {
      let state = startStage(run, [{ id: 'tu', name: 'TÚ' }]);
      note();
      while (state.phase === 'playing') {
        steps.push(['turn', state.turnCount]);
        const action = chooseAction(state);
        steps.push(['act', action.type]);
        const res = applyAction(state, currentPlayer(state).id, action);
        trackEvents(run, res.events);
        state = res.state;
      }
      finishBattle(run, state);
      note();
      continue;
    }
    const a = chooseRunAction(run);
    if (!a) break;
    runAction(run, a);
    note();
  }
  return { steps, run };
}

type Tel = { noteRun(r: unknown): void; noteTurn(v: unknown): void; noteAction(t: string): void; shareFeedback(): Promise<string>; telemetryLog(): Record<string, unknown>[]; telemetryBytes(): number; telemetryRemote(): boolean };
const feed = (page: Page, steps: Step[]) =>
  page.evaluate((steps) => {
    const t = (window as unknown as { __qaTelemetry: Tel }).__qaTelemetry;
    for (const [k, v] of steps) {
      if (k === 'run') t.noteRun(v);
      else if (k === 'turn') t.noteTurn({ turnCount: v, phase: 'playing', turnPlayer: 'tu', you: 'tu' });
      else t.noteAction(v as string);
    }
    const log = t.telemetryLog();
    return { n: log.length, last: log.at(-1) ?? null, bytes: t.telemetryBytes(), remote: t.telemetryRemote() };
  }, steps);

/** Construye la versión estática con la URL de prueba en su carpeta (salvo NO_BUILD=1 si ya existe). */
function buildWithUrl(): string {
  const dir = `${WEB_ROOT}-telemetria`;
  if (!process.env.NO_BUILD || !existsSync(join(dir, 'index.html'))) {
    const built = spawnSync(`npx vite build --mode web --outDir "${dir}" --logLevel warn`, { stdio: 'inherit', shell: true, env: { ...process.env, VITE_TELEMETRY_URL: TEST_URL } });
    if (built.status !== 0) throw new Error('no se pudo construir la versión con VITE_TELEMETRY_URL');
  }
  return resolve(dir);
}

/** Abre la página con la red bloqueada: lo que no es del propio sitio se apunta y no sale. */
async function blocked(browser: Browser, url: string, problems: string[], tag: string) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: 'es-ES', acceptDownloads: true });
  await ctx.addInitScript({ content: NAME_SHIM });
  const out: { url: string; method: string; body: string }[] = [];
  await ctx.route(
    (u) => !u.href.startsWith(url),
    async (route) => {
      const req = route.request();
      out.push({ url: req.url(), method: req.method(), body: req.postData() ?? '' });
      // la dirección de prueba «responde» sin salir del equipo; todo lo demás se corta
      if (req.url() === TEST_URL) await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' }, body: '' });
      else await route.abort();
    },
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${tag}] error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon|ERR_FAILED/.test(m.text()) && problems.push(`[${tag}] consola: ${m.text()}`));
  await page.goto(`${url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as { __qaTelemetry?: unknown }).__qaTelemetry);
  return { ctx, page, out };
}

export async function telemetrySuite(browser: Browser, url: string, check: Check, problems: string[]): Promise<void> {
  // la primera campaña perdida del bot (con causa de la derrota): siempre la misma
  let camp = botCampaign(1);
  for (let seed = 2; camp.run.phase !== 'lost' && seed < 40; seed++) camp = botCampaign(seed);
  const acts = camp.steps.filter((s) => s[0] === 'act').length;

  // ── compilación normal: nada sale ──
  {
    const { ctx, page, out } = await blocked(browser, url, problems, 'datos');
    const rec = await feed(page, camp.steps);
    check(!rec.remote, 'la compilación normal no lleva dirección de envío');
    check(rec.last?.resultado === 'derrota' && rec.last?.asalto === camp.run.stage && (rec.last?.causa as { tipo?: string } | null)?.tipo === camp.run.death?.kind, `una campaña entera del bot (${acts} jugadas) queda en un registro: derrota en el asalto ${rec.last?.asalto}, con su causa`);
    const size = Buffer.byteLength(JSON.stringify(rec.last));
    check(size < 5000, `el registro de una campaña entera mide < 5 KB (${size} bytes; ${rec.bytes} bytes guardados en total)`);
    const [download, result] = await Promise.all([page.waitForEvent('download', { timeout: 10_000 }), page.evaluate(() => (window as unknown as { __qaTelemetry: Tel }).__qaTelemetry.shareFeedback())]);
    check(result === 'copiado' || result === 'descargado', `shareFeedback sin dirección copia o descarga («${result}»)`);
    check(/^sangre-y-palo-feedback-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), `descarga sangre-y-palo-feedback-AAAA-MM-DD.json (${download.suggestedFilename()})`);
    const file = await download.path();
    const body = file ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>) : null;
    check(body && JSON.stringify(body) === JSON.stringify(rec.last), 'el archivo descargado es el registro de la última campaña, tal cual');
    check(out.length === 0, `con la compilación normal, una campaña entera y shareFeedback hacen cero peticiones (${out.length})`);
    await ctx.close();
  }

  // ── compilación con VITE_TELEMETRY_URL de prueba: una petición por pulsación, y ninguna sin pulsar ──
  {
    const root = buildWithUrl();
    const site = await serveWeb(root);
    try {
      const { ctx, page, out } = await blocked(browser, site.url, problems, 'datos con URL');
      const rec = await feed(page, camp.steps);
      check(rec.remote, 'la compilación con VITE_TELEMETRY_URL lo sabe (telemetryRemote)');
      check(out.length === 0, `con la dirección puesta, una campaña entera sin pulsar no hace ninguna petición (${out.length})`);
      const result = await page.evaluate(() => (window as unknown as { __qaTelemetry: Tel }).__qaTelemetry.shareFeedback());
      check(result === 'enviado', `al pulsar, se envía («${result}»)`);
      check(out.length === 1 && out[0].url === TEST_URL && out[0].method === 'POST', `exactamente una petición, POST a la dirección de prueba (${out.length})`);
      const sent = out[0]?.body ?? '';
      check(Buffer.byteLength(sent) < 5000 && sent === JSON.stringify(rec.last), `lo enviado es el registro de la última campaña y nada más (${Buffer.byteLength(sent)} bytes)`);
      await ctx.close();
    } finally {
      site.close();
    }
  }
}
