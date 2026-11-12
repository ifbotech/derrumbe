// Tarjeta para compartir: fotografía el estado «og» del propio juego (el grabado de la portada, el
// título y cuatro figuras) a 1200 × 630 y lo deja en public/og-card.png, que es la imagen que
// enseñan Discord, WhatsApp, X o Reddit al pegar el enlace (ver las etiquetas og: de index.html).
//
//   npm run og        (construye antes; NO_BUILD=1 para saltarse la construcción)
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';

ensureBuilt();
const site = await serveWeb();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await context.addInitScript({ content: NAME_SHIM });
const page = await context.newPage();
await page.goto(`${site.url}?qa=1`);
await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
await page.evaluate(() => (window as unknown as { __qa: { go(s: string): Promise<boolean> } }).__qa.go('og'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(700);
const out = resolve('public/og-card.png');
await page.screenshot({ path: out });
await browser.close();
site.close();
console.log(`${out} · 1200 × 630`);
