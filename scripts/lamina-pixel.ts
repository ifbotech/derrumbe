// V40 · fase 2b · Láminas de muestra del pixel-art, sin construir el juego: monta las piezas de src/client/pixel/ en una
// página suelta y la fotografía. Es el bucle corto de dibujar y mirar (la medida la hacen el linter y la forja).
//
//   npx tsx scripts/lamina-pixel.ts [lamina…]     (contact-sheet, pintas, figuras, numeros, bufon, reyes, iconos)
//
// Deja artifacts/forja/<nombre>.png (la hoja de contacto: artifacts/forja/contact-sheet.png) y su versión en gris,
// <nombre>-gris.png, para la prueba de daltonismo a ojo. Las cifras del índice usan la fuente del juego (Archivo Black).
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { LAMINAS } from '../src/client/pixel/laminas';

const OUT = resolve('artifacts/forja');
const pedidas = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const nombres = Object.keys(LAMINAS).filter((n) => !pedidas.length || pedidas.includes(n));
const FUENTE = pathToFileURL(resolve('node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2')).href;

async function main(): Promise<number> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const html = join(OUT, '_lamina.html');
  try {
    const page = await browser.newPage({ viewport: { width: 1560, height: 900 }, deviceScaleFactor: 1 });
    for (const n of nombres) {
      for (const gris of [false, true]) {
        writeFileSync(
          html,
          `<!doctype html><html><head><meta charset="utf-8"><style>
          @font-face{font-family:'Corona Cifras';src:url('${FUENTE}') format('woff2');font-display:block}
          body{margin:0;padding:16px;background:#6a82ad;font:700 14px/1.2 system-ui,sans-serif;color:#f8f3e9;${gris ? 'filter:grayscale(1);' : ''}}
          .fila{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-bottom:16px}
          .pz{display:flex;flex-direction:column;align-items:center;gap:4px}
          svg{display:block;image-rendering:pixelated}
          .mesa{background:#1f2a25;padding:14px;border-radius:6px}
          h2{font-size:16px;margin:10px 0 8px}
        </style></head><body>${LAMINAS[n]()}</body></html>`,
        );
        await page.goto(pathToFileURL(html).href);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: join(OUT, `${n}${gris ? '-gris' : ''}.png`), fullPage: true });
      }
      console.log(`${n}.png`);
    }
    return 0;
  } finally {
    rmSync(html, { force: true });
    await Promise.race([browser.close(), new Promise((ok) => setTimeout(ok, 10_000).unref())]);
  }
}

main().then(
  (c) => process.exit(c),
  (e) => {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    process.exit(1);
  },
);
