// V11 · la campaña de cinco asaltos, entera, para la prueba de humo. El bot de referencia decide cada
// jugada y la prueba la hace con el ratón, a 1×, sobre la mesa de verdad: el asalto de dos tronos, el de
// tres y, desde la V40 1e, el Mapa de caminos (prefiere La Pulpería, luego el Fogón y el Santuario del Bufón, y
// evita los Guardias Bravos), el Botín por partes con su «Elegí una», Purgar en La Pulpería o el Fogón y el Rey
// del Salón del Trono. Mide el **tiempo de jugada a 1×** (desde que se confirma la jugada hasta que la mano vuelve a
// aceptar entrada) y el **tiempo de máquina de cada entreacto** (de que se levanta la mesa a que vuelve a
// estar puesta, con los clics al instante: lo que se anima y se pinta, sin el tiempo de leer ni de decidir).
// Son las constantes medidas de la duración de la campaña (SPECS/V11.md, apartado 1.10).
//
// Para que llegue siempre al final, antes de cada jugada se devuelve la Vida al tope (__qaJuice.heal, solo con
// ?qa): el bot juega igual, nadie muere por el camino. La campaña no toca el guardado real.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Browser, Page } from 'playwright';
import { LOCALE } from './gamepad-qa';
import { NAME_SHIM } from './web';

type Check = (ok: unknown, what: string) => void;
type BotAction = { type: string; cards?: string[]; card?: string; target?: string } | null;
interface CampWin {
  __qa: { seed(t: string): void; bot(): BotAction; run(): { phase: string; stage: number; combate: string | null; deck: number; bendiciones: number; elegi: number | null } | null };
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
  /** V40 1e · lo que se vio del Mapa y del Botín: nodos visitados, cobros, «Elegí una» elegidas, cartas purgadas, Rey. */
  nodos: string[];
  cobros: number;
  elegidas: number;
  purgas: number;
  rey: number;
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
  const nodos: string[] = prev?.nodos ?? [];
  let cobros = prev?.cobros ?? 0;
  let elegidas = prev?.elegidas ?? 0;
  let purgas = prev?.purgas ?? 0;
  let rey = prev?.rey ?? 0;
  /** El tamaño del mazo antes de Purgar (para contar la carta que se fue) y dónde se purgó por última vez. */
  let mazoAntes = -1;
  let purgadoEn = '';
  let guard = 0;
  for (; guard < 500; guard++) {
    const r = await run();
    if (!r || r.phase === 'won' || r.phase === 'lost') break;
    // la carta purgada se va al elegirla en la ventana del mazo: se cuenta cuando baja el mazo o se sale del servicio
    if (mazoAntes >= 0 && r.deck < mazoAntes) {
      purgas++;
      mazoAntes = -1;
    } else if (mazoAntes >= 0 && r.phase !== 'shop' && r.phase !== 'fogon') mazoAntes = -1;
    // fin del tramo: en el Mapa del tramo siguiente, con el asalto ya al alcance (las paradas del camino van en este
    // tramo). Se deja lo guardado y lo medido para el tramo que sigue
    if (tramo && tramo.n < tramo.de && r.phase === 'map' && r.stage > tramo.n && (await has('#routes .choice.pick[data-tipo="guardia"], #routes .choice.pick[data-tipo="rey"]'))) {
      const guardado = await page.evaluate(() => {
        const p = (window as unknown as { __qaPlatform: () => { load(k: string): string | null; keys(pre: string): string[] } }).__qaPlatform();
        return Object.fromEntries(p.keys('derrumbe:').map((k) => [k, p.load(k) ?? '']));
      });
      const deja: Arrastre = { guardado, plays, stages, between, phases, nodos, cobros, elegidas, purgas, rey, total: (prev?.total ?? 0) + (Date.now() - t0) / 1000, entreParcial: leftTable ? (Date.now() - leftTable) / 1000 : null };
      writeFileSync(tramo.archivo, JSON.stringify(deja));
      const st = stages[stages.length - 1];
      console.log(`  tramo ${tramo.n} de ${tramo.de}: ${st ? `asalto ${st.stage} (${st.thrones} tronos) ${st.turns} turnos en ${st.secs.toFixed(0)} s` : 'sin asalto'} · sigue en el Mapa del asalto ${r.stage}`);
      await context.close();
      return null;
    }
    if (phases[phases.length - 1] !== `${r.phase}:${r.stage}`) phases.push(`${r.phase}:${r.stage}`);
    // una ventana encima (Purgar, carta sellada, elegir cartas de un Santuario): se resuelve o se cierra
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
      // V40 1e · el Mapa de caminos: el Salón del Trono acaba en el nodo del Rey; la ruta prefiere las paradas
      if (r.stage === 5) rey = Math.max(rey, await page.locator('.nodo-mapa.t-rey').count());
      for (const tipo of ['pulperia', 'fogon', 'santuario', 'guardia', 'rey', 'bravo']) {
        const route = page.locator(`#routes .choice.pick[data-tipo="${tipo}"]`).first();
        if (!(await route.count())) continue;
        nodos.push(tipo);
        await route.click();
        break;
      }
    } else if (r.phase === 'reward') {
      // V40 1e · el Botín por partes: se cobra cada recompensa (la «Elegí una» se abre y se elige la primera)
      if (await has('.elegi-una')) {
        await page.waitForTimeout(300);
        const op = page.locator('.elegi-una :is(#bends, #picks, #loot) .choice.pick').first();
        if (await op.count()) {
          await op.click();
          elegidas++;
        } else await page.locator('#saltar').click();
      } else if (await has('.botin-fila.abierta .cobrar:not(:disabled)')) {
        await page.locator('.botin-fila.abierta .cobrar:not(:disabled)').first().click();
        cobros++;
      } else if (await has('.botin-fila.abierta .saltar:not(:disabled)')) await page.locator('.botin-fila.abierta .saltar:not(:disabled)').first().click();
      else await page.locator('#seguir').click();
    } else if (r.phase === 'shop') {
      // La Pulpería: Purgar una vez por visita, si llega el oro; luego, al Mapa
      const aqui = `${r.stage}:${nodos.length}`;
      if (purgadoEn !== aqui && (await has('#burn:not(:disabled)'))) {
        purgadoEn = aqui;
        mazoAntes = r.deck;
        await page.locator('#burn').click();
      } else await page.locator('#go').click();
    } else if (r.phase === 'fogon') {
      // el Fogón: Purgar gratis (o Curar si ya no se puede); sin el Cartógrafo se cierra solo
      if (await has('#fogon-purgar.pick')) {
        mazoAntes = r.deck;
        await page.locator('#fogon-purgar').click();
      } else if (await has('#fogon-curar.pick')) await page.locator('#fogon-curar').click();
      else await page.locator('#go').click();
    } else if (r.phase === 'event') {
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
      // los Guardias Bravos no son asaltos: cuentan sus jugadas y su entreacto, no su fila
      if (r.combate !== 'bravo') stages.push({ stage: r.stage, thrones, turns, secs: (Date.now() - s0) / 1000 });
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
  // V40 1e · el Mapa, el Botín y los servicios, con el ratón
  const visto = (t: string) => nodos.filter((n) => n === t).length;
  check(visto('pulperia') >= 4, `[campaña] el Mapa lleva a La Pulpería en cada tramo del 2 al 5 (${visto('pulperia')}; ruta: ${nodos.join(' · ')})`);
  check(nodos.length > stages.length, `[campaña] la ruta pasa por paradas además de los asaltos (${nodos.length} nodos elegidos para ${stages.length} asaltos)`);
  check(cobros >= 5 && elegidas >= 2, `[campaña] el Botín se cobra por partes y la «Elegí una» se elige (${cobros} cobros, ${elegidas} elegidas)`);
  check(purgas >= 1, `[campaña] Purgar (en La Pulpería o el Fogón) saca cartas del mazo (${purgas})`);
  const bends = phases.filter((p) => p.startsWith('bendicion:')).length;
  check(bends >= 1 && ((end as { bendiciones?: number } | null)?.bendiciones ?? 1) >= 1, `[campaña] los Reyes ofrecen su Bendición (${bends} ofertas de entrada)`);
  check(rey >= 1, `[campaña] el Mapa del asalto 5 acaba en el nodo del Rey (${rey})`);
  const play = median(plays) / 1000;
  check(plays.length >= 20 && play > 0 && play < 12, `[campaña] tiempo de jugada a 1× medido en ${plays.length} jugadas: mediana ${play.toFixed(2)} s`);
  console.log(`  campaña: ${total.toFixed(0)} s con los clics al instante · jugada a 1× (mediana) ${play.toFixed(2)} s · entreactos ${between.map((b) => b.toFixed(1)).join(' · ')} s`);
  console.log(`  asaltos: ${stages.map((s) => `${s.stage} (${s.thrones} tronos) ${s.turns} turnos en ${s.secs.toFixed(0)} s`).join(' · ')}`);
  await context.close();
  return { play, plays: plays.length, between, stages, total };
}
