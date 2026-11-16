// V12 · juice-ux, bloque B: la sensación de lo nuevo, jugada de verdad en la prueba de humo (npm run qa:smoke).
//
//   · Lo que cae: un golpe de verdad suelta sus piezas desde el trono, se posan, el imán las lleva a la bolsa a los
//     1,0 s y el contador sube cuando llegan (antes, no); solo transform y opacity, sin filtro; el cursor las aspira
//     dentro de su radio; con mando, siempre el imán; más de 40 se juntan («×n»); «Piedra imán» acorta la espera; a
//     8× no queda nada en vuelo al acabar la jugada; con «Reducir movimiento» no se ve ninguna y la bolsa cuadra.
//     Mide el tiempo de jugada a 1× con lo que cae en pantalla (para la duración de la campaña).
//   · La tirada de huesos: ruedan unos 5 s a 1× (mediana de tres), botan con su golpe de hueso, se paran en la cara
//     que decidió el motor; una tecla, un clic o B la terminan; a 2×, la mitad; con «Reducir movimiento», directa.
//   · Los seis Susurros nuevos: salen la primera vez, de uno en uno, con «No mostrar más», y no tapan la mano ni la
//     cuenta (ni, en el Árbol, el panel ni «Comprar»).
import type { Browser, Page } from 'playwright';
import { BTN, LOCALE, T, VIRTUAL_GAMEPAD, press } from './gamepad-qa';
import { NAME_SHIM } from './web';

type Check = (ok: unknown, what: string) => void;
interface ImanEstado {
  lanzadas: number;
  llegadas: number;
  aspiradas: number;
  imanes: number;
  directas: number;
  juntadas: number;
  sinSitio: number;
  maxVivas: number;
  props: string[];
  vida: number[];
  esperas: number[];
  vivas: number;
  quietas: number;
  esperan: number;
  pendientes: number;
  enCamino: { moneda: number; esquirla: number; gota: number };
}
interface Bolsa {
  oro: number;
  esquirlas: number;
  gotas: number;
  ve: { oro: string; esquirlas: string; gotas: string };
}
interface W {
  __qa: { go(s: string): Promise<boolean> };
  __qaIman: { estado(): ImanEstado; soltar(n: number): number; quietas(): { x: number; y: number }[]; reset(): void };
  __qaTirada: { estado(): { rodando: boolean; tiradas: { ms: number; saltada: boolean; dados: number }[]; botes: number }; abre(): boolean };
  __qaJuice: { bolsa(): Bolsa; campana(o: { up?: Record<string, number>; gotas?: number }): boolean; autoOpts(o: { speed?: 1 | 2 | 4 | 8 }): void; mejor(): unknown };
  __qaFx: { settings: { speed: number; calm: boolean } };
  __qaSounds: string[];
  __whispers: { force(on: boolean | null | string[]): void; reset(): void; seen(): string[] };
  __qaGamepad: { connect(): void };
}
const go = (page: Page, s: string) => page.evaluate((x) => (window as unknown as W).__qa.go(x), s);
const iman = (page: Page) => page.evaluate(() => (window as unknown as W).__qaIman.estado());
const bolsa = (page: Page) => page.evaluate(() => (window as unknown as W).__qaJuice.bolsa());
const tirada = (page: Page) => page.evaluate(() => (window as unknown as W).__qaTirada.estado());
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};
/** Una cifra compacta de la bolsa a número (12 · 1,2K · 1.2K). */
const num = (s: string) => {
  const m = s.replace(/\s/g, '').match(/^([\d.,]+)([KM]?)$/i);
  if (!m) return NaN;
  const base = parseFloat(m[1].replace(',', '.'));
  return Math.round(base * (m[2].toUpperCase() === 'K' ? 1000 : m[2].toUpperCase() === 'M' ? 1e6 : 1));
};

async function pagina(browser: Browser, url: string, problems: string[], tag: string, opts: { reducedMotion?: 'reduce'; width?: number; height?: number } = {}): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 1366, height: opts.height ?? 768 }, locale: LOCALE, reducedMotion: opts.reducedMotion });
  await ctx.addInitScript({ content: NAME_SHIM });
  await ctx.addInitScript({ content: VIRTUAL_GAMEPAD });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${tag}] error de página: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && problems.push(`[${tag}] consola: ${m.text()}`));
  await page.goto(`${url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as Partial<W>).__qaIman && !!(window as unknown as Partial<W>).__qaJuice);
  await page.evaluate(() => (window as unknown as W).__qaGamepad.connect());
  return { page, close: () => ctx.close() };
}

/**
 * Golpea con la Mejor jugada (Q y Espacio) y sigue la tanda hasta que la mesa vuelve a dejar jugar y no queda nada en
 * vuelo. Devuelve lo que se vio: piezas a la vista, si la bolsa iba por detrás del saldo y cuánto tardó la jugada.
 */
type Susurro = { texto: string; off: boolean; tapa: string } | null;
async function golpea(page: Page): Promise<{ ok: boolean; jugadaMs: number; restoMs: number; maxVistas: number; detras: boolean; filtro: string; adelante: boolean; susurro: Susurro }> {
  const m = await page.evaluate(() => (window as unknown as W).__qaJuice.mejor());
  if (!m) return { ok: false, jugadaMs: 0, restoMs: 0, maxVistas: 0, detras: false, filtro: '', adelante: false, susurro: null };
  await page.keyboard.press('q');
  await page.waitForTimeout(80);
  // el Susurro de Mejor jugada tiene su prueba: aquí no tapa el de lo que cae (salen de uno en uno)
  await page.evaluate(() => document.querySelector('.whisper[data-w="mejor"]')?.remove());
  return page.evaluate(async () => {
    const w = window as unknown as W;
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const t0 = performance.now();
    dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true }));
    // la mesa se bloquea mientras anima
    while (!document.querySelector('.handrow.locked') && performance.now() - t0 < 1500) await raf();
    let maxVistas = 0;
    let detras = false;
    let adelante = false;
    let filtro = '';
    let jugadaMs = -1;
    let fin = -1;
    // el Susurro de lo que cae, en cuanto sale (se borra solo a los 9 s)
    let susurro: { texto: string; off: boolean; tapa: string } | null = null;
    while (performance.now() - t0 < 20_000) {
      await raf();
      const vistas = [...document.querySelectorAll<HTMLElement>('#caida .caida-pieza:not([hidden])')];
      maxVistas = Math.max(maxVistas, vistas.length);
      const wc: HTMLElement | null = susurro ? null : document.querySelector<HTMLElement>('.whisper[data-w="caida"]');
      // medido ya quieto: la tiza entra girando y grande (chalkin)
      if (wc && !wc.getAnimations().some((x) => x.playState === 'running')) {
        const r = wc.getBoundingClientRect();
        const tapa = ['#hand', '#score', '#btn-strike']
          .filter((s) => {
            const o = document.querySelector(s)?.getBoundingClientRect();
            return !!o && o.width > 0 && r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top;
          })
          .join(' ');
        susurro = { texto: wc.querySelector('p')?.textContent ?? '', off: !!wc.querySelector('.whisper-off'), tapa };
      }
      if (vistas.length && !filtro) filtro = getComputedStyle(vistas[0]).filter;
      const e = w.__qaIman.estado();
      const b = w.__qaJuice.bolsa();
      const n = (s: string) => Number(s.replace(/\D/g, '')) || 0;
      // mientras algo vuela, el contador va por detrás del saldo; nunca por delante
      if (e.enCamino.esquirla > 0 && b.esquirlas < 1000 && n(b.ve.esquirlas) < b.esquirlas) detras = true;
      if (b.esquirlas < 1000 && n(b.ve.esquirlas) > b.esquirlas) adelante = true;
      if (jugadaMs < 0 && !document.querySelector('.handrow.locked')) jugadaMs = performance.now() - t0;
      if (jugadaMs >= 0 && e.vivas === 0 && e.esperan === 0) {
        fin = performance.now() - t0;
        break;
      }
    }
    return { ok: jugadaMs >= 0 && fin >= 0, jugadaMs, restoMs: fin - jugadaMs, maxVistas, detras, filtro, adelante, susurro };
  });
}

/** Lo que cae, de punta a punta. Devuelve el tiempo de jugada a 1× (mediana) para la bitácora. */
export async function caidaSuite(browser: Browser, url: string, check: Check, problems: string[]): Promise<{ jugada: number; jugadas: number[]; resto: number[] }> {
  const { page, close } = await pagina(browser, url, problems, 'lo que cae');
  await page.evaluate(() => {
    const w = (window as unknown as W).__whispers;
    w.reset();
    w.force(['caida', 'tirada', 'arbol', 'mejor', 'auto', 'gotas']);
  });
  await go(page, 'mesa');
  await page.mouse.move(4, 400); // el cursor lejos de la mesa: aquí manda el imán
  await page.waitForTimeout(300);
  await page.evaluate(() => (window as unknown as W).__qaIman.reset());
  const b0 = await bolsa(page);
  const jugadas: number[] = [];
  const resto: number[] = [];
  // ── un golpe de verdad, a 1× ──
  const g = await golpea(page);
  const e1 = await iman(page);
  const b1 = await bolsa(page);
  check(g.ok && e1.lanzadas > 0 && e1.llegadas === e1.lanzadas, `un golpe suelta sus piezas y todas llegan a la bolsa (${e1.lanzadas} salen, ${e1.llegadas} llegan, ${g.maxVistas} a la vista a la vez)`);
  if (g.ok) jugadas.push(g.jugadaMs), resto.push(g.restoMs);
  check(b1.esquirlas > b0.esquirlas && num(b1.ve.esquirlas) === b1.esquirlas && num(b1.ve.oro) === b1.oro, `la bolsa cuadra al final con el saldo (esquirlas ${b0.esquirlas} → ${b1.esquirlas}, «${b1.ve.esquirlas}»; oro «${b1.ve.oro}» = ${b1.oro})`);
  check(g.detras && !g.adelante, `mientras vuelan, el contador va por detrás del saldo y sube al llegar cada pieza (nunca por delante)`);
  check(e1.imanes > 0 && e1.aspiradas === 0, `sin cursor encima, las recoge el imán (${e1.imanes} con el imán)`);
  const esp = median(e1.esperas);
  check(Math.abs(esp - 1000) <= 120, `el imán espera 1,0 s desde que se posan (mediana ${esp.toFixed(0)} ms)`);
  check(e1.props.length > 0 && e1.props.every((p) => p === 'transform' || p === 'opacity'), `las piezas solo animan transform y opacity (${e1.props.join(', ')})`);
  check(g.filtro === 'none', `y sin filtro mientras se mueven (filter: ${g.filtro || 'sin pieza a la vista'})`);
  check(e1.maxVivas <= 40, `nunca más de 40 en pantalla (${e1.maxVivas})`);
  // el Susurro de lo que cae
  const w1 = g.susurro;
  check(!!w1 && w1.off && !w1.tapa && w1.texto.length > 20, `Susurro «lo que cae» con la primera pieza, con «No mostrar más», sin tapar la mano ni la cuenta («${w1?.texto ?? 'no salió'}»${w1?.tapa ? ` · tapa ${w1.tapa}` : ''}${w1 && !w1.off ? ' · sin «No mostrar más»' : ''})`);
  // ── dos golpes más a 1× (para la medida de la jugada) ──
  for (let i = 0; i < 2; i++) {
    const gi = await golpea(page);
    if (gi.ok) jugadas.push(gi.jugadaMs), resto.push(gi.restoMs);
  }
  check((await page.locator('.whisper[data-w="caida"]').count()) <= 1 && (await page.evaluate(() => (window as unknown as W).__whispers.seen().filter((s) => s === 'caida').length)) === 1, 'el Susurro de lo que cae sale una sola vez');
  // ── el cursor aspira lo que está posado (antes del imán) ──
  await page.evaluate(() => (window as unknown as W).__qaIman.reset());
  await page.evaluate(() => (window as unknown as W).__qaIman.soltar(6));
  await page.waitForFunction(() => (window as unknown as W).__qaIman.quietas().length > 0, null, { timeout: 3000 }).catch(() => undefined);
  const q = await page.evaluate(() => (window as unknown as W).__qaIman.quietas());
  if (q.length) {
    await page.mouse.move(q[0].x + 10, q[0].y + 8, { steps: 2 });
    await page.waitForTimeout(120);
  }
  const e2 = await iman(page);
  check(q.length > 0 && e2.aspiradas >= 1, `el cursor que pasa a menos de su radio aspira la pieza al instante (${e2.aspiradas} aspiradas de ${q.length} posadas)`);
  await page.mouse.move(4, 400);
  await page.waitForFunction(() => (window as unknown as W).__qaIman.estado().vivas === 0, null, { timeout: 5000 }).catch(() => undefined);
  // ── más de 40: se juntan ──
  await page.evaluate(() => (window as unknown as W).__qaIman.reset());
  const salen = await page.evaluate(() => (window as unknown as W).__qaIman.soltar(70));
  await page.waitForTimeout(250);
  const juntas = await page.evaluate(() => [...document.querySelectorAll('#caida .caida-pieza:not([hidden]) .caida-n')].map((b) => b.textContent ?? ''));
  const e3 = await iman(page);
  check(salen <= 40 && e3.juntadas > 0 && e3.maxVivas <= 40 && juntas.length > 0 && juntas.every((t) => /^×\d+$/.test(t)), `70 piezas a la vez se juntan en ${salen} (${e3.juntadas} juntadas; marcas ${[...new Set(juntas)].join(' ')})`);
  await page.waitForFunction(() => (window as unknown as W).__qaIman.estado().vivas === 0, null, { timeout: 6000 }).catch(() => undefined);
  // ── con el mando: siempre el imán ──
  await press(page, BTN.DOWN);
  await page.evaluate(() => (window as unknown as W).__qaIman.reset());
  await page.evaluate(() => (window as unknown as W).__qaIman.soltar(8));
  await page.waitForFunction(() => (window as unknown as W).__qaIman.estado().vivas === 0, null, { timeout: 6000 }).catch(() => undefined);
  const e4 = await iman(page);
  const modo = await page.evaluate(() => document.documentElement.dataset.input);
  check(modo === 'pad' && e4.imanes === e4.lanzadas && e4.lanzadas > 0 && Math.abs(median(e4.esperas) - 1000) <= 120, `con el mando las recoge el imán, todas (${e4.imanes} de ${e4.lanzadas}, espera ${median(e4.esperas).toFixed(0)} ms)`);
  // ── «Piedra imán» al máximo: medio segundo antes ──
  await page.evaluate(() => (window as unknown as W).__qaJuice.campana({ up: { piedra_iman: 5 } }));
  await page.evaluate(() => (window as unknown as W).__qaIman.reset());
  await page.evaluate(() => (window as unknown as W).__qaIman.soltar(6));
  await page.waitForFunction(() => (window as unknown as W).__qaIman.estado().vivas === 0, null, { timeout: 6000 }).catch(() => undefined);
  const e5 = await iman(page);
  check(Math.abs(median(e5.esperas) - 500) <= 100, `con «Piedra imán» 5/5 el imán recoge medio segundo antes (${median(e5.esperas).toFixed(0)} ms)`);
  await page.evaluate(() => (window as unknown as W).__qaJuice.campana({ up: { piedra_iman: 0 } }));
  // ── 8×: al acabar la jugada no queda cola (en una mesa nueva: la de antes puede haber acabado) ──
  await go(page, 'mesa');
  await page.mouse.move(4, 400);
  await page.evaluate(() => (window as unknown as W).__qaJuice.autoOpts({ speed: 8 }));
  await page.evaluate(() => (window as unknown as W).__qaIman.reset());
  const g8 = await golpea(page);
  check(g8.ok && g8.restoMs <= 450, `a 8×, lo que cae llega a la bolsa casi a la vez que acaba la jugada (jugada ${g8.jugadaMs.toFixed(0)} ms, lo último llega ${g8.restoMs.toFixed(0)} ms después)`);
  await page.evaluate(() => (window as unknown as W).__qaJuice.autoOpts({ speed: 1 }));
  // ── la gota que hace tres: su Susurro ──
  await page.evaluate(() => document.querySelectorAll('.whisper').forEach((w) => w.remove()));
  await go(page, 'mesa-mejor');
  await page.mouse.move(4, 400);
  await page.evaluate(() => (window as unknown as W).__qaJuice.campana({ gotas: 2 }));
  const gx = await golpea(page);
  const wg = await page.evaluate(() => document.querySelector('.whisper[data-w="gotas"] p')?.textContent ?? '');
  const bx = await bolsa(page);
  check(gx.ok && bx.gotas >= 3 && wg.length > 10, `con la tercera gota de lacre, su Susurro (gotas ${bx.gotas}: «${wg || 'no salió'}»)`);
  await close();
  // ── «Reducir movimiento»: nada salta ni vuela, la bolsa cuadra ──
  {
    const { page: pc, close: cc } = await pagina(browser, url, problems, 'lo que cae · calma', { reducedMotion: 'reduce' });
    await go(pc, 'mesa');
    await pc.evaluate(() => (window as unknown as W).__qaIman.reset());
    const gc = await golpea(pc);
    const ec = await iman(pc);
    const bc = await bolsa(pc);
    check(gc.ok && gc.maxVistas === 0 && ec.directas === ec.lanzadas && ec.lanzadas > 0 && num(bc.ve.esquirlas) === bc.esquirlas, `con «Reducir movimiento» no se ve ninguna pieza y todo va directo a la bolsa (${ec.directas} directas; «${bc.ve.esquirlas}» = ${bc.esquirlas})`);
    await cc();
  }
  console.log(`  jugada a 1× con lo que cae: ${jugadas.map((x) => (x / 1000).toFixed(1)).join(' · ')} s (mediana ${(median(jugadas) / 1000).toFixed(1)} s); lo último llega ${resto.map((x) => x.toFixed(0)).join(' · ')} ms después de que la mesa vuelve a dejar jugar`);
  return { jugada: median(jugadas), jugadas, resto };
}

/** La tirada de huesos animada. Devuelve la duración medida a 1× (mediana de tres). */
export async function tiradaSuite(browser: Browser, url: string, check: Check, problems: string[]): Promise<{ mediana: number; medidas: number[] }> {
  const { page, close } = await pagina(browser, url, problems, 'tirada');
  await page.evaluate(() => {
    const w = (window as unknown as W).__whispers;
    w.reset();
    w.force(['caida', 'tirada', 'arbol', 'mejor', 'auto', 'gotas']);
  });
  const abre = async () => {
    await go(page, 'cobro');
    await page.evaluate(() => (window as unknown as W).__qaTirada.abre());
    await page.waitForSelector('#ritual #ritual-tirar', { timeout: 5000 }).catch(() => undefined);
    return (await page.locator('#ritual #ritual-tirar').count()) === 1;
  };
  const medidas: number[] = [];
  for (let i = 0; i < 3; i++) {
    if (!(await abre())) {
      check(false, 'el Botín enseña la tirada con «Tirar»');
      break;
    }
    const sounds0 = await page.evaluate(() => (window as unknown as W).__qaSounds.length);
    await page.locator('#ritual-tirar').click();
    await page.waitForTimeout(400);
    const mid = await page.evaluate(() => {
      const anims = [...document.querySelectorAll('#ritual .hueso-dado')].flatMap((d) => d.getAnimations());
      const props = new Set<string>();
      for (const a of anims) for (const k of (a.effect as KeyframeEffect).getKeyframes()) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p);
      const total = document.getElementById('ritual-total');
      return { rodando: document.getElementById('ritual')?.classList.contains('rodando') ?? false, anims: anims.length, props: [...props], total: total ? Number(getComputedStyle(total).opacity) : -1, boton: document.getElementById('ritual-seguir')?.textContent ?? '' };
    });
    await page.waitForFunction(() => !(window as unknown as W).__qaTirada.estado().rodando, null, { timeout: 9000 }).catch(() => undefined);
    const st = await tirada(page);
    const last = st.tiradas[st.tiradas.length - 1];
    if (last && !last.saltada) medidas.push(last.ms);
    if (i === 0) {
      check(mid.rodando && mid.anims > 0 && mid.props.every((p) => p === 'transform' || p === 'opacity'), `«Tirar» hace rodar los dados (${mid.anims} animaciones; ${mid.props.join(', ')})`);
      check(mid.total === 0 && mid.boton === T('ui.ritual.saltar'), `mientras ruedan, el resultado espera y el botón de abajo dice «${mid.boton}»`);
      const fin = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('#ritual .hueso')].map((h) => ({ cara: h.querySelector('.hueso-cara')?.textContent ?? '', sale: h.querySelector<HTMLElement>('.cara.sale')?.textContent ?? '', k: h.querySelector<HTMLElement>('.cara.sale')?.dataset.k ?? '', dato: h.dataset.sale ?? '' })),
      );
      check(fin.length > 0 && fin.every((d) => d.cara === d.sale && d.k === d.dato), `se paran en la cara que decidió el motor (${fin.map((d) => `${d.cara} = cara ${d.dato}`).join(' · ')})`);
      const sonidos = await page.evaluate((n) => (window as unknown as W).__qaSounds.slice(n), sounds0);
      const botes = sonidos.filter((s) => s === 'hueso').length;
      check(botes >= 4 * fin.length, `cada dado bota con su golpe de hueso sobre madera (${botes} golpes para ${fin.length} dados)`);
      const after = await page.evaluate(() => ({ total: Number(getComputedStyle(document.getElementById('ritual-total')!).opacity), boton: document.getElementById('ritual-seguir')?.textContent ?? '' }));
      check(after.total > 0.95 && after.boton === T('ui.ritual.seguir'), `al pararse, el resultado a la vista (opacidad ${after.total.toFixed(2)}) y «${after.boton}»`);
      const wt = await page.evaluate(() => document.querySelector('#ritual .whisper[data-w="tirada"] p')?.textContent ?? '');
      check(wt.length > 10, `Susurro de la primera tirada, dentro de la tirada («${wt || 'no salió'}»)`);
    }
  }
  const med = median(medidas);
  check(medidas.length === 3 && Math.abs(med - 5000) <= 250, `a 1× la tirada dura unos 5 s (${medidas.map((m) => (m / 1000).toFixed(2)).join(' · ')} s; mediana ${(med / 1000).toFixed(2)} s)`);
  // ── cualquier tecla la termina ──
  for (const how of ['tecla', 'clic', 'mando'] as const) {
    await abre();
    if (how === 'mando') await press(page, BTN.A);
    else await page.locator('#ritual-tirar').click();
    await page.waitForTimeout(700);
    const rodaba = (await tirada(page)).rodando;
    const t0 = Date.now();
    if (how === 'tecla') await page.keyboard.press('x');
    else if (how === 'clic') await page.mouse.click(30, 30);
    else await press(page, BTN.B);
    await page.waitForTimeout(60);
    const st = await tirada(page);
    const last = st.tiradas[st.tiradas.length - 1];
    const sigue = await page.locator('#ritual').count();
    const fin = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#ritual .hueso')].every((h) => h.querySelector('.hueso-cara')?.textContent === h.querySelector('.cara.sale')?.textContent));
    check(rodaba && !st.rodando && !!last?.saltada && sigue === 1 && fin, `${how === 'tecla' ? 'una tecla' : how === 'clic' ? 'un clic' : 'B en el mando'} termina la tirada en el acto y enseña el resultado (en ${Date.now() - t0} ms; ${how === 'mando' ? 'A la tiró' : 'sigue abierta'})`);
  }
  // ── a 2×, la mitad ──
  await abre();
  await page.evaluate(() => (window as unknown as W).__qaJuice.autoOpts({ speed: 2 }));
  await page.locator('#ritual-tirar').click();
  await page.waitForFunction(() => !(window as unknown as W).__qaTirada.estado().rodando, null, { timeout: 9000 }).catch(() => undefined);
  const d2 = (await tirada(page)).tiradas.at(-1);
  check(!!d2 && !d2.saltada && Math.abs(d2.ms - 2500) <= 200, `a 2× dura la mitad (${((d2?.ms ?? 0) / 1000).toFixed(2)} s)`);
  // ── «Saltar» antes de tirar: directa ──
  await abre();
  await page.locator('#ritual-saltar').click();
  await page.waitForTimeout(60);
  const ds = (await tirada(page)).tiradas.at(-1);
  check(!!ds && ds.saltada && ds.ms === 0 && (await page.locator('#ritual #ritual-seguir').count()) === 1, '«Saltar» antes de tirar enseña el resultado sin rodar');
  await close();
  // ── «Reducir movimiento»: sin giros ──
  {
    const { page: pc, close: cc } = await pagina(browser, url, problems, 'tirada · calma', { reducedMotion: 'reduce' });
    await go(pc, 'cobro');
    await pc.evaluate(() => (window as unknown as W).__qaTirada.abre());
    await pc.waitForSelector('#ritual #ritual-tirar', { timeout: 5000 }).catch(() => undefined);
    await pc.locator('#ritual-tirar').click();
    await pc.waitForTimeout(60);
    const st = await pc.evaluate(() => ({ ...(window as unknown as W).__qaTirada.estado(), anims: [...document.querySelectorAll('#ritual .hueso-dado')].flatMap((d) => d.getAnimations()).length }));
    check(!st.rodando && st.anims === 0 && (await pc.locator('#ritual-total').count()) === 1, 'con «Reducir movimiento» la tirada enseña el resultado sin rodar');
    await cc();
  }
  return { mediana: med, medidas };
}

/** Los Susurros del Árbol, de Mejor jugada y de AUTO (los de lo que cae, la tirada y las gotas, en sus suites). */
export async function susurrosSuite(browser: Browser, url: string, check: Check, problems: string[]): Promise<void> {
  const { page, close } = await pagina(browser, url, problems, 'susurros');
  await page.evaluate(() => {
    const w = (window as unknown as W).__whispers;
    w.reset();
    w.force(['caida', 'tirada', 'arbol', 'mejor', 'auto', 'gotas']);
  });
  // el Árbol
  await go(page, 'gremio');
  await page.waitForSelector('.arbol-vista');
  await page.waitForTimeout(200);
  const wa = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.whisper[data-w="arbol"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const tapa = ['.arbol-detalle', '#arbol-comprar'].some((s) => {
      const o = document.querySelector(s)?.getBoundingClientRect();
      return o && o.width && r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top;
    });
    return { texto: el.querySelector('p')?.textContent ?? '', tapa, dentro: !!el.closest('.arbol-lienzo') };
  });
  check(!!wa && wa.dentro && !wa.tapa, `Susurro del Árbol en el pergamino, sin tapar el panel ni «Comprar» («${wa?.texto ?? 'no salió'}»)`);
  // «No mostrar más» a un clic: ya no sale ninguno
  await page.locator('.whisper[data-w="arbol"] .whisper-off').click().catch(() => undefined);
  const off = await page.evaluate(() => !document.querySelector('.whisper'));
  check(off, '«No mostrar más» lo quita a un clic');
  await page.evaluate(() => {
    const w = (window as unknown as W).__whispers;
    w.reset();
    w.force(['caida', 'tirada', 'arbol', 'mejor', 'auto', 'gotas']);
  });
  // Mejor jugada (Q)
  await go(page, 'mesa');
  await page.keyboard.press('Escape');
  await page.keyboard.press('q');
  await page.waitForTimeout(120);
  const wm = await page.evaluate(() => document.querySelector('.whisper[data-w="mejor"] p')?.textContent ?? '');
  check(wm.length > 10, `Susurro de la primera Mejor jugada («${wm || 'no salió'}»)`);
  // AUTO (A): el Susurro, y una tecla lo apaga
  await page.evaluate(() => document.querySelectorAll('.whisper').forEach((w) => w.remove()));
  await page.keyboard.press('a');
  await page.waitForTimeout(120);
  const wu = await page.evaluate(() => document.querySelector('.whisper[data-w="auto"] p')?.textContent ?? '');
  await page.keyboard.press('Escape');
  check(wu.length > 10, `Susurro del primer AUTO («${wu || 'no salió'}»)`);
  // una sola vez: otra Mejor jugada ya no lo dice
  await page.evaluate(() => document.querySelectorAll('.whisper').forEach((w) => w.remove()));
  await go(page, 'mesa');
  await page.keyboard.press('Escape');
  await page.keyboard.press('q');
  await page.waitForTimeout(120);
  check((await page.locator('.whisper[data-w="mejor"]').count()) === 0, 'y cada uno sale una sola vez');
  await close();
}
