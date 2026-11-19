// V11 · la campaña de cinco asaltos, entera, para la prueba de humo. El bot de referencia decide cada
// jugada y la prueba la hace con el ratón, a 1×, sobre la mesa de verdad: el asalto de dos tronos, el de
// tres, los Secretos de la cripta tras los asaltos 2 y 4 y el Salón del Trono con su Rey Tirano (o Reina
// Tirana). Mide el **tiempo de jugada a 1×** (desde que se confirma la jugada hasta que la mano vuelve a
// aceptar entrada) y el **tiempo de máquina de cada entreacto** (de que se levanta la mesa a que vuelve a
// estar puesta, con los clics al instante: lo que se anima y se pinta, sin el tiempo de leer ni de decidir).
// Son las constantes medidas de la duración de la campaña (SPECS/V11.md, apartado 1.10).
//
// Para que llegue siempre al final, antes de cada jugada se devuelve la Vida al tope (__qaJuice.heal, solo con
// ?qa): el bot juega igual, nadie muere por el camino. La campaña no toca el guardado real.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright';
import { LOCALE, T } from './gamepad-qa';
import { NAME_SHIM } from './web';

type Check = (ok: unknown, what: string) => void;
type BotAction = { type: string; cards?: string[]; card?: string; target?: string } | null;
interface CampWin {
  __qa: { seed(t: string): void; bot(): BotAction; run(): { phase: string; stage: number } | null };
  __qaJuice: { heal(): boolean; thrones(): number; stage(): number };
}

export interface CampaignTimes {
  /** Mediana del tiempo de jugada a 1× (s) y número de jugadas medidas. */
  play: number;
  plays: number;
  /** Tiempo de máquina de cada entreacto (s), del 1 → 2 al 4 → 5. */
  between: number[];
  /** Turnos y duración real de cada asalto (s). */
  stages: { stage: number; thrones: number; turns: number; secs: number }[];
  /** Duración total de la campaña jugada por el bot, con los clics al instante (s). */
  total: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

/** Pulsa algo y mide, dentro de la página, cuánto tarda la mano en volver a aceptar entrada (ms). */
const timed = (page: Page, sel: string) =>
  page.evaluate(async (s) => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const el = document.querySelector<HTMLElement>(s);
    if (!el) return -1;
    const t0 = performance.now();
    el.click();
    // la mano se cierra en cuanto se confirma; si no se llega a cerrar (jugada sin animación), cuenta 0
    while (!document.querySelector('.handrow.locked') && document.querySelector('.table-screen') && performance.now() - t0 < 400) await frame();
    while (document.querySelector('.handrow.locked') && document.querySelector('.table-screen') && !document.querySelector('.end') && performance.now() - t0 < 30_000) await frame();
    return performance.now() - t0;
  }, sel);

/**
 * Humo por secciones: la campaña entera a 1× pasa de 170 s (≈ 435 s), así que se juega en tramos de un asalto, cada
 * uno en su propia invocación (`--solo=campana-<n>`). Al llegar al Mapa del asalto siguiente, el tramo deja en
 * `archivo` lo guardado (con ?qa, el guardado de quita y pon) y lo medido; el siguiente lo carga, pulsa «Continuar» y
 * sigue. Las comprobaciones salen todas en el último tramo, con lo medido en todos: las mismas que la campaña de un tirón.
 */
export interface Tramo {
  /** Tramo de 1 a `de`: el tramo n juega el asalto n (el último, hasta el final de la campaña). */
  n: number;
  de: number;
  archivo: string;
}
interface Arrastre {
  guardado: Record<string, string>;
  plays: number[];
  stages: CampaignTimes['stages'];
  between: number[];
  phases: string[];
  tirano: string;
  total: number;
  /** Segundos del entreacto que ya iban corridos al cortar el tramo (de la mesa levantada al Mapa). */
  entreParcial: number | null;
}

export async function campaignSuite(browser: Browser, url: string, check: Check, problems: string[], tramo?: Tramo): Promise<CampaignTimes | null> {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, locale: LOCALE });
  await context.addInitScript({ content: NAME_SHIM });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`[campaña] error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`[campaña] consola: ${m.text()}`));
  await page.goto(`${url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as Partial<CampWin>).__qa && !!(window as unknown as Partial<CampWin>).__qaJuice);
  await page.evaluate(() => (window as unknown as CampWin).__qa.seed('CAMPANA-QA'));
  const run = () => page.evaluate(() => (window as unknown as CampWin).__qa.run());
  const has = async (sel: string) => (await page.locator(sel).count()) > 0;

  let prev: Arrastre | null = null;
  if (tramo && tramo.n > 1) {
    prev = existsSync(tramo.archivo) ? (JSON.parse(readFileSync(tramo.archivo, 'utf8')) as Arrastre) : null;
    if (!prev) {
      check(false, `[campaña] el tramo ${tramo.n} encuentra la campaña que dejó el tramo ${tramo.n - 1} (${tramo.archivo})`);
      await context.close();
      return null;
    }
    // lo guardado del tramo anterior entra en el guardado de quita y pon, y la Portada lo ofrece con «Continuar»
    await page.evaluate((g) => {
      const p = (window as unknown as { __qaPlatform: () => { save(k: string, v: string): void } }).__qaPlatform();
      for (const [k, v] of Object.entries(g)) p.save(k, v);
    }, prev.guardado);
    await page.evaluate(() => (window as unknown as { __qa: { go(s: string): Promise<boolean> } }).__qa.go('portada'));
    await page.locator('#resume').click();
    await page.waitForSelector('.run');
  } else {
    // portada → preparación → nueva campaña (V40: sin partida guiada, empieza por el sobre)
    await page.locator('#m-camp').click();
    await page.locator('#new').click();
    await page.waitForSelector('.run');
  }
  const t0 = Date.now();

  const plays: number[] = prev?.plays ?? [];
  const stages: CampaignTimes['stages'] = prev?.stages ?? [];
  const between: number[] = prev?.between ?? [];
  const phases: string[] = prev?.phases ?? [];
  let leftTable = prev?.entreParcial != null ? Date.now() - prev.entreParcial * 1000 : 0;
  let tirano = prev?.tirano ?? '';
  let guard = 0;
  for (; guard < 400; guard++) {
    const r = await run();
    if (!r || r.phase === 'won' || r.phase === 'lost') break;
    // fin del tramo: ya se ve el Mapa del asalto siguiente. Se deja lo guardado y lo medido para el tramo que sigue
    if (tramo && tramo.n < tramo.de && r.phase === 'map' && r.stage > tramo.n) {
      const guardado = await page.evaluate(() => {
        const p = (window as unknown as { __qaPlatform: () => { load(k: string): string | null; keys(pre: string): string[] } }).__qaPlatform();
        return Object.fromEntries(p.keys('derrumbe:').map((k) => [k, p.load(k) ?? '']));
      });
      const deja: Arrastre = { guardado, plays, stages, between, phases, tirano, total: (prev?.total ?? 0) + (Date.now() - t0) / 1000, entreParcial: leftTable ? (Date.now() - leftTable) / 1000 : null };
      writeFileSync(tramo.archivo, JSON.stringify(deja));
      const st = stages[stages.length - 1];
      console.log(`  tramo ${tramo.n} de ${tramo.de}: ${st ? `asalto ${st.stage} (${st.thrones} tronos) ${st.turns} turnos en ${st.secs.toFixed(0)} s` : 'sin asalto'} · sigue en el Mapa del asalto ${r.stage}`);
      await context.close();
      return null;
    }
    if (phases[phases.length - 1] !== `${r.phase}:${r.stage}`) phases.push(`${r.phase}:${r.stage}`);
    // una ventana encima (premio del Juramento, carta sellada, elegir cartas de un Secreto): se resuelve o se cierra
    if (await has('.modal')) {
      if (await has('.modal .card.pickable')) await page.locator('.modal .card.pickable').first().click();
      else if (await has('.modal #yes')) await page.locator('.modal #yes').click();
      else await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      continue;
    }
    // V12 · la tirada de huesos (al ganar un asalto): se tira y se sigue con el ratón
    if (await has('#ritual')) {
      const boton = (await has('#ritual #ritual-tirar')) ? '#ritual #ritual-tirar' : '#ritual #ritual-seguir';
      await page.locator(boton).click({ timeout: 5_000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      continue;
    }
    if (r.phase === 'pack') await page.locator('#go').click();
    // V40 1c · la oferta de los Reyes: el bot del ratón se queda con la primera Bendición
    else if (r.phase === 'bendicion') {
      await page.waitForTimeout(400); // las tarjetas se dan la vuelta de una en una
      const b = page.locator('#bends .choice.pick').first();
      if (await b.count()) await b.click();
    } else if (r.phase === 'map') {
      // el Mapa del Salón del Trono lleva la estampilla «Rey Tirano» (o «Reina Tirana») en su asalto
      if (r.stage === 5) tirano = (await page.locator('.bp-node.tirano .s-tirano').first().textContent().catch(() => null)) ?? '';
      const route = page.locator('#routes .choice.pick:not(.skip)').first();
      if (await route.count()) await route.click();
    } else if (r.phase === 'reward') {
      if (await has('#picks .choice.pick')) await page.locator('#picks .choice.pick').first().click();
      else if (await has('#loot .choice.pick')) await page.locator('#loot .choice.pick').first().click();
    } else if (r.phase === 'shop') await page.locator('#go').click();
    else if (r.phase === 'event') {
      // la última opción de cada Secreto es la que no pide elegir cartas («Sigue tu camino», «Caliéntate y sigue»…)
      const opt = page.locator('#opts > button:not(:disabled)').last();
      await page.waitForTimeout(500); // las opciones se dan la vuelta de una en una
      if (await opt.count()) await opt.click();
    } else if (r.phase === 'battle') {
      await page.waitForSelector('.table-screen');
      if (leftTable) between.push((Date.now() - leftTable) / 1000);
      const s0 = Date.now();
      const thrones = await page.evaluate(() => (window as unknown as CampWin).__qaJuice.thrones());
      let turns = 0;
      for (let i = 0; i < 80; i++) {
        await page.waitForFunction(() => !document.querySelector('.table-screen') || !document.querySelector('.handrow.locked') || !!document.querySelector('.end, .modal'), null, { timeout: 40_000 });
        if (!(await has('.table-screen')) || (await run())?.phase !== 'battle') break;
        await page.evaluate(() => (window as unknown as CampWin).__qaJuice.heal());
        const a = await page.evaluate(() => (window as unknown as CampWin).__qa.bot());
        if (!a) break;
        if (await has('.handrow .card.sel')) await page.keyboard.press('Escape');
        const pick = async (ids: string[]) => {
          for (const id of ids) await page.locator(`.handrow .card[data-id="${id}"]`).click();
        };
        let ms = -1;
        if (a.type === 'attack' || a.type === 'joker') {
          await pick(a.type === 'joker' ? [a.card!] : a.cards!);
          ms = await timed(page, `.tower[data-suit="${a.target}"]`);
          turns++;
        } else if (a.type === 'discard') {
          await pick(a.cards!);
          ms = await timed(page, '#btn-discard');
          turns++;
        } else if (a.type === 'stash') {
          await pick([a.card!]);
          // V35 · La Manga se usa desde su hueco (ya no hay botón)
          await page.locator('#reserve .reserve-slot.empty').first().click();
        } else if (a.type === 'pass') {
          ms = await timed(page, '#btn-pass');
          turns++;
        } else break;
        if (ms >= 0) plays.push(ms);
      }
      stages.push({ stage: r.stage, thrones, turns, secs: (Date.now() - s0) / 1000 });
      await page.waitForFunction(() => !document.querySelector('.table-screen'), null, { timeout: 20_000 }).catch(() => undefined);
      leftTable = Date.now();
      continue;
    }
    await page.waitForTimeout(300);
  }
  const end = await run();
  const total = (prev?.total ?? 0) + (Date.now() - t0) / 1000;
  const won = end?.phase === 'won' || (await has('.end.won'));
  const st = new Map(stages.map((s) => [s.stage, s]));
  check(won && stages.length === 5, `[campaña] el bot juega los cinco asaltos con el ratón y gana la campaña (${stages.map((s) => `${s.stage}: ${s.turns} t`).join(' · ')}${won ? '' : ` — fase «${end?.phase}»`})`);
  check(st.get(1)?.thrones === 2 && st.get(2)?.thrones === 3 && [3, 4, 5].every((n) => st.get(n)?.thrones === 4), `[campaña] tronos por asalto 2 / 3 / 4 / 4 / 4 (${stages.map((s) => s.thrones).join(' / ')})`);
  const events = phases.filter((p) => p.startsWith('event:')).map((p) => Number(p.split(':')[1]));
  check(events.join() === '2,4', `[campaña] Secretos de la cripta tras los asaltos 2 y 4 (${events.join(', ') || 'ninguno'})`);
  const bends = phases.filter((p) => p.startsWith('bendicion:')).map((p) => Number(p.split(':')[1]));
  check(bends.join() === '1,2,3,4,5', `[campaña] los Reyes ofrecen una Bendición antes de cada asalto (${bends.join(', ') || 'ninguna'})`);
  check([T('asalto.tirano.m'), T('asalto.tirano.f')].includes(tirano.trim()), `[campaña] el Mapa del asalto 5 lleva la estampilla del Rey Tirano o la Reina Tirana («${tirano.trim()}»)`);
  const play = median(plays) / 1000;
  check(plays.length >= 20 && play > 0 && play < 12, `[campaña] tiempo de jugada a 1× medido en ${plays.length} jugadas: mediana ${play.toFixed(2)} s`);
  console.log(`  campaña: ${total.toFixed(0)} s con los clics al instante · jugada a 1× (mediana) ${play.toFixed(2)} s · entreactos ${between.map((b) => b.toFixed(1)).join(' · ')} s`);
  console.log(`  asaltos: ${stages.map((s) => `${s.stage} (${s.thrones} tronos) ${s.turns} turnos en ${s.secs.toFixed(0)} s`).join(' · ')}`);
  await context.close();
  return { play, plays: plays.length, between, stages, total };
}
