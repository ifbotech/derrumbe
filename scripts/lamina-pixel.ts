// V40 · fase 2 · Láminas de muestra del pixel-art, sin construir el juego: monta las piezas de src/client/pixel/ en una
// página suelta sobre el marfil y la fotografía. Es el bucle corto de dibujar y mirar; la medida la hace la forja
// (npm run forja), que fotografía las piezas dentro del juego construido.
//
//   npx tsx scripts/lamina-pixel.ts [lamina…]        (pintas, naipes, figuras, reyes, amuletos, trampas, bendiciones, bufon)
//
// Deja artifacts/forja/lamina-<nombre>.png y su versión en gris, lamina-<nombre>-gris.png.
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { LAMINAS } from '../src/client/pixel/laminas';

const OUT = resolve('artifacts/forja');
const pedidas = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const nombres = Object.keys(LAMINAS).filter((n) => !pedidas.length || pedidas.includes(n));

async function main(): Promise<number> {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 });
    for (const n of nombres) {
      for (const gris of [false, true]) {
        await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
          body{margin:0;padding:16px;background:#efe6d5;font:700 14px/1.2 system-ui,sans-serif;color:#1d1a17;${gris ? 'filter:grayscale(1);' : ''}}
          .fila{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;margin-bottom:18px}
          .pz{display:flex;flex-direction:column;align-items:center;gap:4px}
          .pz svg{display:block}
          .mesa{background:#151d1a;padding:12px;color:#efe6d5}
          h2{font-size:16px;margin:8px 0}
        </style></head><body>${LAMINAS[n]()}</body></html>`);
        await page.screenshot({ path: join(OUT, `lamina-${n}${gris ? '-gris' : ''}.png`), fullPage: true });
      }
      console.log(`lamina-${n}.png`);
    }
    return 0;
  } finally {
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
