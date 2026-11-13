// La marca vive en src/shared/brand.ts. Dos archivos estáticos no pueden importarla (index.html y el
// manifest) y package.json tampoco: si alguien cambia el título, esta prueba dice dónde falta tocarlo.
// Desde la 6.1 la marca es dual: SANGRE Y PALO en español (sello BLOOD & SUITS) y BLOOD & SUITS en
// inglés (sello SANGRE Y PALO).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRAND, FULL_TITLE, LOCALE, SEAL, SLUG, SUBTITLE, TAGLINE, TITLE, TITLE_PROSE, brandLocale, fileName } from '../src/shared/brand';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const ES = 'SANGRE Y PALO';
const EN = 'BLOOD & SUITS';
/** Los dos títulos, sin distinguir mayúsculas y con el «&» escrito como entidad o tal cual. */
const conLosDos = (s: string | undefined) => {
  const t = (s ?? '').replace(/&amp;/g, '&').toLowerCase();
  return t.includes(ES.toLowerCase()) && t.includes(EN.toLowerCase());
};

describe('marca dual', () => {
  it('las dos caras: cada idioma lleva su título y, de sello, el del otro', () => {
    expect(BRAND.es.title).toBe(ES);
    expect(BRAND.es.seal).toBe(EN);
    expect(BRAND.en.title).toBe(EN);
    expect(BRAND.en.seal).toBe(ES);
    expect(BRAND.es.subtitle).toBe('La conjura de los naipes');
    expect(BRAND.en.subtitle).toBe('A card conspiracy against the court');
    for (const cara of Object.values(BRAND)) expect(cara.tagline.length).toBeGreaterThan(0);
  });

  it('el idioma de marca: «es…» es español, todo lo demás inglés, y sin navegador español', () => {
    expect(brandLocale('es-AR')).toBe('es');
    expect(brandLocale('es')).toBe('es');
    expect(brandLocale('ES-es')).toBe('es');
    expect(brandLocale('en-US')).toBe('en');
    expect(brandLocale('pt-BR')).toBe('en');
    expect(brandLocale('fr')).toBe('en');
    expect(brandLocale()).toBe('es');
    expect(brandLocale('')).toBe('es');
    // las pruebas corren sin navegador: la sesión es española
    expect(LOCALE).toBe('es');
    expect(TITLE).toBe(ES);
    expect(SEAL).toBe(EN);
  });

  it('el título no es el de un juego ajeno ni el viejo', () => {
    // «Regicide» es un juego comercial que ya existe: ni como título ni como lema
    for (const cara of Object.values(BRAND)) {
      const t = `${cara.title} ${cara.seal} ${cara.subtitle} ${cara.tagline}`.toLowerCase();
      expect(t).not.toMatch(/regicid|corona rota|derrumbe/);
    }
  });

  it('las piezas derivadas salen del título y del sello', () => {
    expect(FULL_TITLE).toBe('SANGRE Y PALO · Blood & Suits');
    expect(TITLE_PROSE).toBe('Sangre y Palo');
    expect(TITLE_PROSE.toLowerCase()).toBe(TITLE.toLowerCase());
    expect(SUBTITLE).toBe(BRAND.es.subtitle);
    expect(TAGLINE).toBe(BRAND.es.tagline);
    expect(SLUG).toBe('sangre-y-palo');
    expect(fileName('progreso', 'json', '2026-11-12')).toBe('sangre-y-palo-progreso-2026-11-12.json');
    expect(fileName('cronica', '.svg', undefined, 3)).toBe('sangre-y-palo-cronica-3.svg');
  });

  it('index.html lleva la marca dual en <title>, en la descripción y en las etiquetas para compartir', () => {
    const html = read('index.html');
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]?.replace(/&amp;/g, '&')).toBe(FULL_TITLE);
    expect(conLosDos(html.match(/name="description" content="([^"]*)"/)?.[1])).toBe(true);
    expect(conLosDos(html.match(/property="og:title" content="([^"]*)"/)?.[1])).toBe(true);
    expect(conLosDos(html.match(/property="og:description" content="([^"]*)"/)?.[1])).toBe(true);
  });

  it('el manifest lleva la marca dual', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest')) as { name: string; short_name: string };
    expect(manifest.name).toBe(FULL_TITLE);
    expect(manifest.short_name).toBe(TITLE_PROSE);
  });

  it('package.json y el README usan el nombre del juego', () => {
    const pkg = JSON.parse(read('package.json')) as { name: string; description: string };
    expect(pkg.name).toBe(SLUG);
    expect(conLosDos(pkg.description)).toBe(true);
    expect(read('README.md').split('\n')[0].trim()).toBe(`# ${ES} · ${EN}`);
  });
});
