// V10 · la envoltura de escritorio (tauri/) es configuración, no binario. Esta prueba lee el JSON y vigila
// rutas, nombres y CSP, y que el nombre del producto y el título de la ventana casen con src/shared/brand.ts
// (el título va escrito, como en index.html y el manifest).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRAND, SLUG, brandFor } from '../src/shared/brand';

const dir = new URL('../tauri/', import.meta.url);
const conf = JSON.parse(readFileSync(new URL('tauri.conf.json', dir), 'utf8')) as {
  productName: string;
  mainBinaryName: string;
  version: string;
  identifier: string;
  build: { frontendDist: string; beforeBuildCommand: string };
  app: { withGlobalTauri: boolean; windows: { label: string; title: string; width: number; height: number; resizable: boolean; fullscreen: boolean }[]; security: { csp: string; capabilities: string[] } };
  bundle: { icon: string[] };
};

describe('tauri/tauri.conf.json', () => {
  it('construye dist/web antes y lo sirve', () => {
    expect(conf.build.frontendDist).toBe('../dist/web');
    expect(conf.build.beforeBuildCommand).toBe('npm run build:web');
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['build:web']).toMatch(/vite build --mode web/);
  });

  it('nombres: binario = SLUG, producto = título en prosa de la cara española, identificador inverso', () => {
    expect(conf.mainBinaryName).toBe(SLUG);
    expect(conf.productName).toBe(brandFor('es').titleProse);
    expect(conf.productName).toBe('Sangre y Palo');
    expect(conf.identifier).toMatch(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/);
    expect(conf.version).toBe('../package.json');
  });

  it('una ventana de 1280 × 800, redimensionable, sin pantalla completa de entrada y con el título de brand.ts', () => {
    expect(conf.app.windows).toHaveLength(1);
    const w = conf.app.windows[0];
    expect(w.label).toBe('main');
    expect([w.width, w.height]).toEqual([1280, 800]);
    expect(w.resizable).toBe(true);
    expect(w.fullscreen).toBe(false);
    expect(w.title).toBe(brandFor('es').fullTitle);
    expect(w.title.startsWith(BRAND.es.title)).toBe(true);
    // el título de index.html es el mismo
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain(`<title>${w.title.replace('&', '&amp;')}</title>`);
  });

  it('el puente usa window.__TAURI__ (withGlobalTauri), sin dependencias npm de Tauri', () => {
    expect(conf.app.withGlobalTauri).toBe(true);
    const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    expect(pkg).not.toMatch(/@tauri-apps/);
  });

  it('CSP: sin comodines ni http:, scripts solo propios y conexiones ws:, wss: y https:', () => {
    const csp = conf.app.security.csp;
    expect(csp).not.toMatch(/\*/);
    expect(csp).not.toMatch(/http:/);
    expect(csp).not.toMatch(/unsafe-eval/);
    const dirs = Object.fromEntries(csp.split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
    expect(dirs['default-src']).toEqual(["'self'"]);
    expect(dirs['script-src']).toEqual(["'self'"]);
    expect(dirs['connect-src']).toEqual(["'self'", 'ws:', 'wss:', 'https:']);
    expect(dirs['object-src']).toEqual(["'none'"]);
  });

  it('lo mínimo de Rust y los permisos de la ventana están, y los iconos existen', () => {
    for (const f of ['Cargo.toml', 'build.rs', 'src/main.rs', 'capabilities/default.json']) expect(existsSync(new URL(f, dir)), f).toBe(true);
    const cap = JSON.parse(readFileSync(new URL('capabilities/default.json', dir), 'utf8')) as { identifier: string; windows: string[]; permissions: string[] };
    expect(conf.app.security.capabilities).toContain(cap.identifier);
    expect(cap.windows).toContain('main');
    expect(cap.permissions).toContain('core:window:allow-set-title');
    const cargo = readFileSync(new URL('Cargo.toml', dir), 'utf8');
    expect(cargo).toMatch(/name = "sangre-y-palo"/);
    expect(cargo).toMatch(/tauri = \{ version = "2"/);
    // sin Steam en el repositorio: ni el crate ni el SDK
    expect(cargo).not.toMatch(/steamworks/);
    for (const i of conf.bundle.icon) expect(existsSync(new URL(i, dir)), i).toBe(true);
    // ningún título de marca escrito a mano en el Rust
    const rs = readFileSync(new URL('src/main.rs', dir), 'utf8');
    expect(rs).not.toContain(BRAND.es.title);
    expect(rs).not.toContain(BRAND.en.title);
  });
});
