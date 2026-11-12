// La marca vive en src/shared/brand.ts. Dos archivos estáticos no pueden importarla (index.html y el
// manifest) y package.json tampoco: si alguien cambia el título, esta prueba dice dónde falta tocarlo.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FULL_TITLE, SLUG, SUBTITLE, TITLE, TITLE_PROSE, fileName } from '../src/shared/brand';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

describe('marca', () => {
  it('el título no es el de un juego ajeno', () => {
    // «Regicide» es un juego comercial que ya existe: ni como título ni como lema
    expect(`${TITLE} ${SUBTITLE}`.toLowerCase()).not.toMatch(/regicid/);
  });

  it('las piezas derivadas salen del título', () => {
    expect(FULL_TITLE).toContain(TITLE);
    expect(FULL_TITLE).toContain(SUBTITLE);
    expect(TITLE_PROSE.toLowerCase()).toBe(TITLE.toLowerCase());
    expect(SLUG).toBe(TITLE.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'));
    expect(fileName('progreso', 'json', '2026-11-12')).toBe(`${SLUG}-progreso-2026-11-12.json`);
  });

  it('index.html lleva el título en <title> y en las etiquetas para compartir', () => {
    const html = read('index.html');
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toContain(TITLE);
    expect(html.match(/property="og:title" content="([^"]*)"/)?.[1]).toContain(TITLE);
  });

  it('el manifest lleva el título', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest')) as { name: string; short_name: string };
    expect(manifest.name).toBe(TITLE);
    expect(manifest.short_name).toBe(TITLE);
  });

  it('package.json y el README usan el nombre del juego', () => {
    const pkg = JSON.parse(read('package.json')) as { name: string; description: string };
    expect(pkg.name).toBe(SLUG);
    expect(pkg.description).toContain(TITLE);
    expect(read('README.md').split('\n')[0]).toBe(`# ${TITLE}`);
  });
});
