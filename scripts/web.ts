// Lo que comparten los scripts que abren el juego construido (dist/web) en un navegador sin ventana:
// la construcción previa y un servidor estático mínimo en un puerto libre.
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve } from 'node:path';

/**
 * Dónde se construye y desde dónde se sirve. Por defecto, dist/web. Con QA_DIR=dist/qa-loquesea cada
 * celda del estudio construye en su propia carpeta y dos pruebas a la vez no se pisan la construcción.
 */
const QA_DIR = process.env.QA_DIR?.trim();
export const WEB_ROOT = resolve(QA_DIR || 'dist/web');
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
};

/** Construye la versión estática (salvo con NO_BUILD=1) y comprueba que está. */
export function ensureBuilt(): void {
  if (!process.env.NO_BUILD) {
    const built = spawnSync(QA_DIR ? `npx vite build --mode web --outDir "${QA_DIR}"` : 'npm run build:web', { stdio: 'inherit', shell: true });
    if (built.status !== 0) process.exit(built.status ?? 1);
  }
  if (!existsSync(join(WEB_ROOT, 'index.html'))) throw new Error(`Falta ${QA_DIR || 'dist/web'}: ejecuta antes npm run build:web`);
}

/** Sirve dist/web (u otra construcción, `root`) en 127.0.0.1 y devuelve su dirección. */
export function serveWeb(root = WEB_ROOT): Promise<{ url: string; close: () => void }> {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^([/\\])+/, '');
    let file = join(root, path || 'index.html');
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/`, close: () => server.close() })));
}

/** tsx envuelve las funciones con un ayudante que la página no conoce: se le da uno que no hace nada. */
export const NAME_SHIM = 'globalThis.__name = (f) => f;';
