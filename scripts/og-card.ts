// Tarjetas para compartir: fotografía el estado «og» del propio juego (el grabado de la portada, el
// título y cuatro figuras) a 1200 × 630, una por idioma: public/og-card-es.png y public/og-card-en.png.
// public/og-card.png sigue siendo la española: es la que enseñan Discord, WhatsApp, X o Reddit al pegar
// el enlace (ver las etiquetas og: de index.html, que va en español).
//
//   npm run og        (construye antes; NO_BUILD=1 para saltarse la construcción)
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';

ensureBuilt();
const site = await serveWeb();
const browser = await chromium.launch();
for (const lang of ['es', 'en'] as const) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, locale: lang === 'en' ? 'en-US' : 'es-ES' });
  await context.addInitScript({ content: NAME_SHIM });
  const page = await context.newPage();
  await page.goto(`${site.url}?qa=1`);
  await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
  await page.evaluate((l) => (window as unknown as { __qa: { lang(l: string): string } }).__qa.lang(l), lang);
  await page.evaluate(() => (window as unknown as { __qa: { go(s: string): Promise<boolean> } }).__qa.go('og'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  const out = resolve(`public/og-card-${lang}.png`);
  await page.screenshot({ path: out });
  console.log(`${out} · 1200 × 630`);
  await context.close();
}
copyFileSync(resolve('public/og-card-es.png'), resolve('public/og-card.png'));
console.log(`${resolve('public/og-card.png')} · 1200 × 630 (la española)`);
await browser.close();
site.close();
