// Forja de grabado: renderiza cada pieza del arte suelta (palos, tramas de palo, cartas, reliquias
// —grupo «herramientas»—, especiales y monarcas —grupo «jefes»—) a 24 y a 300 px sobre papel crema, mide su tinta y comprueba que los cuatro palos se
// distinguen sin color. Abre el juego construido con ?qa=1 y usa el banco de src/client/forja-qa.ts.
//
//   npm run forja                        todas las piezas
//   npm run forja -- palos tramas        solo esos grupos (palos, tramas, cartas, herramientas, especiales, servicios, jefes)
//   NO_BUILD=1 npm run forja             sin reconstruir · QA_DIR=dist/qa-forja para construcción propia
//
// Deja en artifacts/svg-forge/: <grupo>/<id>@24.png y @300.png, informe.json, hoja.png (hoja de
// contacto) y hoja-gris.png (la misma en escala de grises: la prueba de daltonismo a ojo).
//
// Falla (código 1) si: dos tramas de palo no se distinguen, un glifo de palo no llega a 7:1 sobre el
// papel, o una pieza queda en blanco o hecha una mancha. Las reliquias (grupo «herramientas») son más
// estrictas: fallan con la tinta a 300 px fuera de 22–58 % o con la silueta a 24 px por debajo del 55 %.
// Lo demás son avisos para mirar la hoja.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { chromium } from 'playwright';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';

/** FORJA_OUT=artifacts/svg-forge-loquesea: dos celdas forjando a la vez no se pisan las hojas. */
const OUT = resolve(process.env.FORJA_OUT?.trim() || 'artifacts/svg-forge');
const SIZES = [24, 300] as const;
const GROUPS = ['palos', 'tramas', 'cartas', 'herramientas', 'especiales', 'servicios', 'jefes', 'monarcas'];
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const groups = wanted.length ? GROUPS.filter((g) => wanted.includes(g)) : GROUPS;

/** Umbrales. Los de «falla» son los que rompen la lectura; los de «aviso» piden mirar la pieza. */
const LIMITS = {
  /**
   * Densidad de tinta a 300 px (fracción de píxeles oscuros dentro de la caja de la pieza). Los límites
   * de fallo valen para iconos (palos y herramientas); cartas y retratos van a sangre y solo fallan si
   * se quedan sin tinta.
   */
  inkFail: [0.03, 0.93],
  inkWarn: [0.12, 0.62],
  /** Reliquias (grupo «herramientas»): fuera de este margen de tinta a 300 px, falla. Ni hilo suelto ni borrón. */
  relicInk: [0.22, 0.58],
  /** Reliquias: a 24 px el mayor cuerpo de tinta tiene que ocupar al menos esto, o falla. */
  relicBody: 0.55,
  /** Cuánto puede cambiar la densidad al bajar a 24 px antes de avisar de empaste. */
  driftWarn: 0.18,
  /** A 24 px, el mayor cuerpo conexo de tinta ocupa al menos esta parte del alto o del ancho de la pieza. */
  bodyWarn: 0.55,
  /** Contraste WCAG del glifo de un palo contra el papel. */
  suitContrast: 7,
  /** Dos tramas son distintas si difieren en estructura (dirección de sus trazos) o en esta fracción de píxeles. */
  patternShape: 0.12,
  patternPixels: 0.25,
  /**
   * V7 · monarcas: a 24 px, dos bustos en calma son distintos si su diferencia media en grises (0–1) llega a
   * esto. Por debajo, falla: la mesa los enseña a ese tamaño y se tienen que reconocer por silueta y objeto.
   */
  monarchApart: 0.1,
};

interface Image {
  w: number;
  h: number;
  /** RGBA, 8 bits por canal. */
  px: Uint8Array;
}

/** Decodifica un PNG de 8 bits sin entrelazar (lo que da Playwright). */
function decodePng(buf: Buffer): Image {
  let at = 8;
  let w = 0;
  let h = 0;
  let type = 6;
  const idat: Buffer[] = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const name = buf.toString('ascii', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (name === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      type = data[9];
      if (data[8] !== 8 || data[12] !== 0 || (type !== 2 && type !== 6)) throw new Error('PNG no admitido (solo RGB o RGBA de 8 bits sin entrelazar)');
    } else if (name === 'IDAT') idat.push(Buffer.from(data));
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const bpp = type === 6 ? 4 : 3;
  const stride = w * bpp;
  const out = new Uint8Array(w * h * 4);
  const cur = new Uint8Array(stride);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 255;
    }
    for (let x = 0; x < w; x++) {
      out[(y * w + x) * 4] = cur[x * bpp];
      out[(y * w + x) * 4 + 1] = cur[x * bpp + 1];
      out[(y * w + x) * 4 + 2] = cur[x * bpp + 2];
      out[(y * w + x) * 4 + 3] = bpp === 4 ? cur[x * bpp + 3] : 255;
    }
    prev = Uint8Array.from(cur);
  }
  return { w, h, px: out };
}

const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;

interface Measure {
  /** Fracción de tinta dentro de la caja de la pieza. */
  ink: number;
  /** Caja de lo que no es papel: [x0, y0, x1, y1]. */
  box: [number, number, number, number];
  /** Máscara de tinta de toda la imagen. */
  mask: Uint8Array;
  /** Luminancia mediana de la tinta. */
  inkLum: number;
}

/** Separa tinta de papel: tinta es lo que tiene, como mucho, la mitad de la luminancia del papel. */
function measure(img: Image, paperLum: number, paper: [number, number, number]): Measure {
  const mask = new Uint8Array(img.w * img.h);
  const lums: number[] = [];
  let x0 = img.w;
  let y0 = img.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      const [r, g, b] = [img.px[i], img.px[i + 1], img.px[i + 2]];
      const l = lum(r, g, b);
      if (Math.abs(r - paper[0]) + Math.abs(g - paper[1]) + Math.abs(b - paper[2]) > 24) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
      if (l <= paperLum * 0.5) {
        mask[y * img.w + x] = 1;
        lums.push(l);
      }
    }
  }
  if (x1 < 0) return { ink: 0, box: [0, 0, 0, 0], mask, inkLum: paperLum };
  let dark = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) dark += mask[y * img.w + x];
  lums.sort((a, b) => a - b);
  return { ink: dark / ((x1 - x0 + 1) * (y1 - y0 + 1)), box: [x0, y0, x1, y1], mask, inkLum: lums.length ? lums[lums.length >> 1] : paperLum };
}

/** Parte del alto o del ancho de la pieza que ocupa su mayor cuerpo conexo de tinta (vecindad de 8). */
function biggestBody(m: Measure, w: number, h: number): number {
  const seen = new Uint8Array(w * h);
  const [bx0, by0, bx1, by1] = m.box;
  let best = 0;
  for (let start = 0; start < w * h; start++) {
    if (!m.mask[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (m.mask[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
      }
    }
    best = Math.max(best, Math.max((x1 - x0 + 1) / Math.max(1, bx1 - bx0 + 1), (y1 - y0 + 1) / Math.max(1, by1 - by0 + 1)));
  }
  return Math.min(1, best);
}

/**
 * Firma de una trama: longitud media de los trazos de tinta en cuatro direcciones (—, |, \, /),
 * normalizada. Un rayado diagonal tiene trazos largos en una diagonal; un punteado, cortos en todas;
 * un aparejo de ladrillo, largos en horizontal; un rayado cruzado, largos en dos.
 */
function shape(mask: Uint8Array, w: number, h: number): number[] {
  const dirs: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const runs = dirs.map(([dx, dy]) => {
    let total = 0;
    let count = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        const px = x - dx;
        const py = y - dy;
        if (px >= 0 && py >= 0 && px < w && py < h && mask[py * w + px]) continue; // solo el arranque de cada trazo
        let len = 0;
        for (let cx = x, cy = y; cx >= 0 && cy >= 0 && cx < w && cy < h && mask[cy * w + cx]; cx += dx, cy += dy) len++;
        total += len;
        count++;
      }
    }
    return count ? total / count : 0;
  });
  const sum = runs.reduce((a, b) => a + b, 0) || 1;
  return runs.map((r) => r / sum);
}

interface Row {
  grupo: string;
  id: string;
  ink300: number;
  ink24: number;
  drift: number;
  body24: number;
  contrast?: number;
  shape?: number[];
  fails: string[];
  warns: string[];
}
interface Forja {
  lista(): { grupo: string; id: string }[];
  montar(grupo: string, id: string, lado: number): boolean;
  hoja(gris: boolean, grupos?: string[]): number;
  limpiar(): void;
  papel: string;
}

async function main(): Promise<void> {
  ensureBuilt();
  const site = await serveWeb();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1, locale: 'es-ES' });
  await context.addInitScript({ content: NAME_SHIM });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${site.url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as { __forja?: unknown }).__forja);
  await page.evaluate(() => document.fonts.ready);

  const paperHex = await page.evaluate(() => (window as unknown as { __forja: Forja }).__forja.papel);
  const paper = [1, 3, 5].map((i) => parseInt(paperHex.slice(i, i + 2), 16)) as [number, number, number];
  const paperLum = lum(...paper);
  const pieces = (await page.evaluate(() => (window as unknown as { __forja: Forja }).__forja.lista())).filter((p) => groups.includes(p.grupo));
  const banco = page.locator('#forja-banco');
  const rows: Row[] = [];
  const masks = new Map<string, { mask: Uint8Array; w: number; h: number }>();
  /** Los bustos en calma a 24 px, en grises (0–1), para compararlos dos a dos. */
  const busts = new Map<string, Float32Array>();

  for (const p of pieces) {
    mkdirSync(join(OUT, p.grupo), { recursive: true });
    const got: Partial<Record<24 | 300, { m: Measure; img: Image }>> = {};
    for (const size of SIZES) {
      await page.evaluate(([g, id, lado]) => (window as unknown as { __forja: Forja }).__forja.montar(g as string, id as string, lado as number), [p.grupo, p.id, size]);
      const png = await banco.screenshot({ animations: 'disabled' });
      writeFileSync(join(OUT, p.grupo, `${p.id}@${size}.png`), png);
      const img = decodePng(png);
      got[size] = { m: measure(img, paperLum, paper), img };
    }
    const big = got[300]!;
    const small = got[24]!;
    const row: Row = { grupo: p.grupo, id: p.id, ink300: round(big.m.ink), ink24: round(small.m.ink), drift: round(Math.abs(big.m.ink - small.m.ink)), body24: round(biggestBody(small.m, small.img.w, small.img.h)), fails: [], warns: [] };
    if (p.grupo === 'monarcas' && p.id.endsWith('-calma')) {
      const g = new Float32Array(small.img.w * small.img.h);
      for (let k = 0; k < g.length; k++) g[k] = (0.299 * small.img.px[k * 4] + 0.587 * small.img.px[k * 4 + 1] + 0.114 * small.img.px[k * 4 + 2]) / 255;
      busts.set(p.id, g);
    }
    if (p.grupo === 'tramas') {
      row.shape = shape(big.m.mask, big.img.w, big.img.h).map((n) => round(n));
      masks.set(p.id, { mask: big.m.mask, w: big.img.w, h: big.img.h });
    } else {
      const icon = p.grupo === 'palos' || p.grupo === 'herramientas' || p.grupo === 'especiales' || p.grupo === 'servicios';
      const relic = p.grupo === 'herramientas';
      if (row.ink300 < (icon ? LIMITS.inkFail[0] : 0.01)) row.fails.push(`casi sin tinta a 300 px (${(row.ink300 * 100).toFixed(1)} %)`);
      else if (icon && row.ink300 > LIMITS.inkFail[1]) row.fails.push(`mancha a 300 px (${(row.ink300 * 100).toFixed(1)} % de tinta)`);
      else if (relic && (row.ink300 < LIMITS.relicInk[0] || row.ink300 > LIMITS.relicInk[1])) row.fails.push(`densidad de tinta ${(row.ink300 * 100).toFixed(1)} % (una reliquia va entre ${Math.round(LIMITS.relicInk[0] * 100)} y ${Math.round(LIMITS.relicInk[1] * 100)} %)`);
      else if (icon && (row.ink300 < LIMITS.inkWarn[0] || row.ink300 > LIMITS.inkWarn[1])) row.warns.push(`densidad de tinta ${(row.ink300 * 100).toFixed(1)} % (cómodo entre ${LIMITS.inkWarn[0] * 100} y ${LIMITS.inkWarn[1] * 100} %)`);
      if (row.ink24 === 0) row.fails.push('a 24 px no queda tinta');
      else if (relic && row.body24 < LIMITS.relicBody) row.fails.push(`a 24 px la silueta se deshace (mayor cuerpo: ${(row.body24 * 100).toFixed(0)} % de la pieza; mínimo ${Math.round(LIMITS.relicBody * 100)} %)`);
      else if (row.body24 < LIMITS.bodyWarn) row.warns.push(`a 24 px la silueta se deshace (mayor cuerpo: ${(row.body24 * 100).toFixed(0)} % de la pieza)`);
      if (row.drift > LIMITS.driftWarn) row.warns.push(`la tinta cambia ${(row.drift * 100).toFixed(0)} puntos entre 300 y 24 px (trazos demasiado finos)`);
    }
    if (p.grupo === 'palos') {
      row.contrast = round(contrast(paperLum, big.m.inkLum), 2);
      if (row.contrast < LIMITS.suitContrast) row.fails.push(`contraste del glifo ${row.contrast}:1 sobre el papel (mínimo ${LIMITS.suitContrast}:1)`);
    }
    rows.push(row);
  }

  // las cuatro tramas, dos a dos: tienen que diferir en estructura o en píxeles
  const tramas = rows.filter((r) => r.grupo === 'tramas');
  const pairs: { a: string; b: string; forma: number; pixeles: number; ok: boolean }[] = [];
  for (let i = 0; i < tramas.length; i++) {
    for (let j = i + 1; j < tramas.length; j++) {
      const a = tramas[i];
      const b = tramas[j];
      const forma = a.shape!.reduce((s, v, k) => s + Math.abs(v - b.shape![k]), 0);
      const ma = masks.get(a.id)!;
      const mb = masks.get(b.id)!;
      let diff = 0;
      for (let k = 0; k < ma.mask.length; k++) diff += ma.mask[k] ^ mb.mask[k];
      const pixeles = diff / ma.mask.length;
      const ok = forma >= LIMITS.patternShape || pixeles >= LIMITS.patternPixels;
      pairs.push({ a: a.id, b: b.id, forma: round(forma), pixeles: round(pixeles), ok });
      if (!ok) a.fails.push(`la trama de ${a.id} no se distingue de la de ${b.id} (forma ${forma.toFixed(2)}, píxeles ${(pixeles * 100).toFixed(0)} %)`);
    }
  }
  for (const t of tramas) if (t.ink300 < 0.08 || t.ink300 > 0.92) t.fails.push(`la trama de ${t.id} es casi lisa (${(t.ink300 * 100).toFixed(0)} % de tinta): no distingue el palo`);

  // V7 · los siete bustos en calma, dos a dos a 24 px: ninguno se confunde con otro
  const bustPairs: { a: string; b: string; diferencia: number; ok: boolean }[] = [];
  const ids = [...busts.keys()];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = busts.get(ids[i])!;
      const b = busts.get(ids[j])!;
      let d = 0;
      for (let k = 0; k < Math.min(a.length, b.length); k++) d += Math.abs(a[k] - b[k]);
      const diferencia = round(d / Math.min(a.length, b.length));
      const ok = diferencia >= LIMITS.monarchApart;
      bustPairs.push({ a: ids[i], b: ids[j], diferencia, ok });
      if (!ok) rows.find((r) => r.grupo === 'monarcas' && r.id === ids[i])?.fails.push(`a 24 px se confunde con ${ids[j]} (diferencia ${diferencia}; mínimo ${LIMITS.monarchApart})`);
    }
  }

  // hojas de contacto, en color y en gris
  for (const gris of [false, true]) {
    await page.evaluate(([g, gs]) => (window as unknown as { __forja: Forja }).__forja.hoja(g as boolean, gs as string[]), [gris, groups] as [boolean, string[]]);
    await page.waitForTimeout(150);
    await banco.screenshot({ path: join(OUT, gris ? 'hoja-gris.png' : 'hoja.png'), animations: 'disabled' });
  }
  await page.evaluate(() => (window as unknown as { __forja: Forja }).__forja.limpiar());
  await browser.close();
  site.close();

  const fails = rows.flatMap((r) => r.fails.map((f) => `${r.grupo}/${r.id}: ${f}`));
  const warns = rows.flatMap((r) => r.warns.map((f) => `${r.grupo}/${r.id}: ${f}`));
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'informe.json'), JSON.stringify({ generado: 'npm run forja', limites: LIMITS, papel: paperHex, piezas: rows, tramas: pairs, monarcas: bustPairs, fallos: fails, avisos: warns, errores: errors }, null, 1) + '\n');

  const pct = (n: number) => `${(n * 100).toFixed(1).padStart(5)} %`;
  for (const g of groups) {
    const list = rows.filter((r) => r.grupo === g);
    if (!list.length) continue;
    console.log(`\n${g} (${list.length})   tinta@300  tinta@24  cuerpo@24${g === 'palos' ? '  contraste' : ''}`);
    for (const r of list) console.log(`  ${r.fails.length ? '✗' : r.warns.length ? '!' : '✓'} ${r.id.padEnd(16)} ${pct(r.ink300)}   ${pct(r.ink24)}   ${pct(r.body24)}${r.contrast ? `   ${r.contrast}:1` : ''}`);
  }
  if (bustPairs.length) console.log(`\nMonarcas dos a dos a 24 px: menor diferencia ${Math.min(...bustPairs.map((p) => p.diferencia))} (mínimo ${LIMITS.monarchApart}) ${bustPairs.every((p) => p.ok) ? '✓' : '✗'}`);
  if (pairs.length) console.log(`\nTramas dos a dos: ${pairs.map((p) => `${p.a}–${p.b} forma ${p.forma} · píxeles ${(p.pixeles * 100).toFixed(0)} % ${p.ok ? '✓' : '✗'}`).join(' | ')}`);
  for (const w of warns) console.log(`! ${w}`);
  for (const f of fails) console.log(`✗ ${f}`);
  for (const e of [...new Set(errors)]) console.log(`✗ error de página: ${e}`);
  console.log(`\n${rows.length} piezas × ${SIZES.length} tamaños en ${OUT} (hoja.png y hoja-gris.png para mirarlas juntas)`);
  console.log(fails.length || errors.length ? `${fails.length} fallos, ${warns.length} avisos` : `Forja limpia${warns.length ? ` (${warns.length} avisos para mirar)` : ''}.`);
  process.exit(fails.length || errors.length ? 1 : 0);
}

void main();
