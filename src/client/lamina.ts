// La lámina de la crónica: un grabado de 1200 × 630 para compartir una campaña terminada, y el enlace con
// su semilla para que otro la juegue igual.
//
//  · El fondo es un SVG dibujado en código (papel, marco de tinta, sol rojo y los cuatro tronos con
//    sus tramas de palo, en pie o caídos). No lleva texto: dentro de un SVG rasterizado las
//    fuentes de la página no cargan.
//  · El texto se escribe encima en el <canvas> con las fuentes ya cargadas en el documento (gótica
//    solo en el título; las cifras, en Archivo Black y sobre placa).
//  · Descargar pasa por platform.saveFile; copiar usa ClipboardItem con el PNG y, si no se puede,
//    copia la crónica en texto con el enlace.
//  · Enlace: <dirección del juego>?seed=<SEMILLA>&baraja=<id>&nivel=<n>. Al abrirlo, el juego va a la
//    preparación de campaña con todo cargado y un aviso; no arranca solo ni pisa una campaña en curso.
import { fileName as brandFile } from '../shared/brand';
import { deckUnlocked } from '../rules/achievements';
import type { Autopsy } from '../rules/autopsy';
import { BOSS, DECK, LAST_STAGE, Run, depthOf, stagesCleared } from '../rules/run';
import { TOOL } from '../rules/tools';
import { deathIn } from './causa';
import { L as Lg, Ln, asaltoN, barN, marca, monN, relN } from './lengua';
import { pickDeck, prefs } from './campaign';
import { S, app, esc, toast } from './core';
import { meta } from './guild';
import { platform } from './platform';
import { setScreen } from './router';

/** Lo que cuenta la lámina. */
export interface Lamina {
  won: boolean;
  where: string;
  boss: string | null;
  maxHit: number;
  turns: number;
  floors: number;
  cleans: number;
  tools: string[];
  deck: string;
  level: number;
  seed: string;
  link: string | null;
  death: Autopsy | null;
}

const INK = '#181614';
const PIT = '#0d0c0b';
const PAPER = '#eae0ce';
const PAPER2 = '#dfd3bc';
const RED = '#ae2d24';
const HAZARD = '#e09b3d';
const BLUE = '#1f4e63';
const DIM = '#4d463c';

// ───────────────────────── Enlace con semilla ─────────────────────────

/** El enlace que repite la campaña: semilla, baraja y Reinado. null en sala o en el Asalto diario. */
export function seedLink(run: Run, online: boolean): string | null {
  if (online || run.daily || !run.seedText) return null;
  const q = new URLSearchParams({ seed: run.seedText, baraja: run.deckId, nivel: String(run.ascension + 1) });
  return `${location.href.split(/[?#]/)[0]}?${q}`;
}

/** El último monarca al que llegó la campaña: el del asalto en curso o el del último asalto con monarca ya pasado. */
function bossOf(run: Run): string | null {
  const stops = Object.entries(run.bosses ?? {})
    .map(([s, id]) => [Number(s), id] as const)
    .filter(([s]) => s <= run.stage)
    .sort((a, b) => a[0] - b[0]);
  const last = stops[stops.length - 1];
  if (!last) return null;
  if (!BOSS[last[1]]) return null;
  const who = monN(last[1]);
  return last[0] === run.stage && run.phase === 'lost' ? Lg('ui.lam.ante', { x: who }) : Lg('ui.lam.monarca', { x: who });
}

export function laminaOf(run: Run, online: boolean): Lamina {
  const won = run.conquered;
  const depth = depthOf(run);
  const cleared = Math.min(stagesCleared(run), LAST_STAGE);
  const where = won
    ? `${Lg('ui.lam.cayo')}${depth ? Lg('ui.lam.cayo.inf', { n: depth }) : ''}`
    : depth
      ? Lg('ui.lam.caida.inf', { n: depth + 1 })
      : `${Lg('ui.lam.donde', { n: Math.min(run.stage, LAST_STAGE), total: LAST_STAGE, nombre: asaltoN(run.stage) })}${Ln(cleared, 'ui.lam.superada.1', 'ui.lam.superada.n')}`;
  return {
    won,
    where,
    boss: bossOf(run),
    maxHit: run.stats.maxHit,
    turns: run.stats.turns,
    floors: run.stats.floors,
    cleans: run.stats.cleans,
    tools: run.tools.map((t) => (TOOL[t.id] ? relN(t.id) : t.id)),
    deck: DECK[run.deckId] ? barN(run.deckId) : run.deckId,
    level: run.ascension + 1,
    seed: run.daily ? Lg('ui.lam.diaria', { d: run.daily }) : online ? Lg('ui.lam.servidor') : run.seedText,
    link: seedLink(run, online),
    death: !won && run.phase === 'lost' && run.death ? deathIn(run.death) : null,
  };
}

// ───────────────────────── El grabado de fondo (SVG, sin texto) ─────────────────────────

const PATTERNS = `
  <pattern id="l-S" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="${BLUE}"/><rect width="3.4" height="10" fill="${PAPER}"/></pattern>
  <pattern id="l-D" width="11" height="11" patternUnits="userSpaceOnUse"><rect width="11" height="11" fill="${PAPER2}"/><circle cx="3" cy="3" r="2" fill="${INK}"/><circle cx="8.5" cy="8.5" r="2" fill="${INK}"/></pattern>
  <pattern id="l-H" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="${RED}"/><path d="M0,0.8 H24 M0,6.8 H24 M6,1 V6.5 M18,7 V12" stroke="${PAPER}" stroke-width="1.8"/></pattern>
  <pattern id="l-C" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${HAZARD}"/><path d="M0,0 L10,10 M10,0 L0,10" stroke="${INK}" stroke-width="1.5"/></pattern>
  <pattern id="l-raya" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="9" fill="${PIT}"/><rect width="2.2" height="9" fill="${INK}"/></pattern>`;

/** Una torre de pisos con su trama; en pie, o caída en un montón. */
function tower(x: number, base: number, w: number, floors: number, pat: string, down: boolean): string {
  if (down) {
    const h = 34 + floors * 4;
    return `<path d="M${x - 14},${base} L${x + w * 0.2},${base - h} L${x + w * 0.55},${base - h * 0.62} L${x + w * 0.8},${base - h * 0.9} L${x + w + 14},${base} Z" fill="url(#${pat})" stroke="${PAPER}" stroke-width="4" stroke-linejoin="round"/>`;
  }
  const fh = 46;
  let out = '';
  for (let i = 0; i < floors; i++) {
    const y = base - (i + 1) * fh;
    const inset = i * 3;
    out += `<rect x="${x + inset}" y="${y}" width="${w - inset * 2}" height="${fh}" fill="url(#${pat})" stroke="${PAPER}" stroke-width="4"/>`;
    // ventana de tinta con su ojo
    out += `<rect x="${x + w / 2 - 9}" y="${y + 14}" width="18" height="18" fill="${PAPER}" stroke="${INK}" stroke-width="3"/><circle cx="${x + w / 2}" cy="${y + 23}" r="4" fill="${RED}"/>`;
  }
  return out;
}

function backdropSvg(d: Lamina): string {
  const W = 1200;
  const H = 630;
  // el cuadro del grabado, a la derecha
  const gx = 770;
  const gy = 34;
  const gw = W - gx - 34;
  const gh = H - gy - 34;
  const base = gy + gh - 38;
  const rays = Array.from({ length: 15 }, (_, i) => {
    const a = Math.PI + (i + 0.5) * (Math.PI / 15);
    const cx = gx + gw / 2;
    const r = 520;
    const a2 = a + Math.PI / 32;
    return `<path d="M${cx},${base} L${cx + Math.cos(a) * r},${base + Math.sin(a) * r} L${cx + Math.cos(a2) * r},${base + Math.sin(a2) * r} Z" fill="${PAPER}"/>`;
  }).join('');
  const down = d.won;
  const w = 62;
  const step = (gw - 40 - w) / 3;
  const towers = (['S', 'D', 'H', 'C'] as const).map((s, i) => tower(gx + 20 + i * step, base, w, [4, 3, 5, 3][i], `l-${s}`, down)).join('');
  // el búnker: entero si se ganó, partido si se perdió
  const bx = gx + gw / 2 - 46;
  const bunker = d.won
    ? `<path d="M${bx},${base} V${base - 30} Q${bx + 46},${base - 64} ${bx + 92},${base - 30} V${base} Z" fill="${INK}" stroke="${PAPER}" stroke-width="4"/>`
    : `<path d="M${bx},${base} V${base - 24} L${bx + 30},${base - 40} L${bx + 40},${base - 18} L${bx + 54},${base - 44} L${bx + 92},${base - 22} V${base} Z" fill="${INK}" stroke="${RED}" stroke-width="4"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${PATTERNS}
      <clipPath id="l-cuadro"><rect x="${gx}" y="${gy}" width="${gw}" height="${gh}"/></clipPath>
    </defs>
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    <rect x="12" y="12" width="${W - 24}" height="${H - 24}" fill="none" stroke="${INK}" stroke-width="8"/>
    <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${INK}" stroke-width="2"/>
    <g clip-path="url(#l-cuadro)">
      <rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="url(#l-raya)"/>
      <g opacity="0.16">${rays}</g>
      <circle cx="${gx + gw / 2}" cy="${base}" r="${d.won ? 150 : 120}" fill="${d.won ? HAZARD : RED}"/>
      ${towers}
      ${bunker}
      <rect x="${gx}" y="${base}" width="${gw}" height="${H}" fill="${INK}"/>
      <path d="M${gx},${base} H${gx + gw}" stroke="${PAPER}" stroke-width="4"/>
    </g>
    <rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="none" stroke="${INK}" stroke-width="6"/>
  </svg>`;
}

// ───────────────────────── El texto, en el canvas ─────────────────────────

const FONTS = ["900 120px 'Grenze Gotisch'", "400 80px 'Archivo Black'", "700 24px 'Archivo'", "500 20px 'Archivo'", "700 20px 'Space Mono'"];

async function fontsReady(): Promise<void> {
  try {
    await Promise.all(FONTS.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch {
    /* sin fuentes propias: el canvas usa las de respaldo */
  }
}

/** Escribe un texto a lo sumo de `max` de ancho, encogiendo la letra hasta `min` y cortando con «…» si aun así no cabe. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, font: (px: number) => string, size: number, min = 14): number {
  let px = size;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > max) ctx.font = font(--px);
  let t = text;
  while (t.length > 1 && ctx.measureText(t).width > max) t = t.slice(0, -2) + '…';
  ctx.fillText(t, x, y);
  return ctx.measureText(t).width;
}

/** Texto en varias líneas dentro de `max` de ancho; devuelve la altura usada. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, lines = 2): number {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  const shown = out.slice(0, lines);
  if (out.length > lines) {
    let last = shown[lines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > max) last = last.slice(0, -1);
    shown[lines - 1] = `${last}…`;
  }
  shown.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return shown.length * lh;
}

/** Placa de tinta con texto: devuelve su ancho. */
function plate(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, font: string, bg: string, fg: string, pad = 10): number {
  ctx.font = font;
  const w = ctx.measureText(text).width + pad * 2;
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + pad, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return w;
}

function drawText(ctx: CanvasRenderingContext2D, d: Lamina): void {
  const L = 54;
  const R = 740;
  const maxW = R - L;
  ctx.textBaseline = 'alphabetic';
  // cabecera
  let x = L + plate(ctx, Lg('ui.acta.cronica'), L, 46, 34, "700 19px 'Space Mono', monospace", RED, PAPER, 12);
  x += plate(ctx, marca().title, x, 46, 34, "400 19px 'Archivo Black', sans-serif", INK, HAZARD, 12);
  // el sello: el nombre del otro idioma, en papel sobre lacre oscuro (la cinta de la portada)
  x += plate(ctx, marca().seal, x, 46, 34, "700 17px 'Space Mono', monospace", '#7d1a13', PAPER, 12);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(L + 1, 47, x - L - 2, 32);
  // título en gótica (sin cifras)
  ctx.fillStyle = d.won ? INK : RED;
  fitText(ctx, d.won ? Lg('ui.fin.corte') : Lg('ui.fin.conjura'), L - 4, 174, maxW, (px) => `900 ${px}px 'Grenze Gotisch', serif`, 108, 64);
  // dónde acabó
  ctx.fillStyle = INK;
  fitText(ctx, d.where, L, 214, maxW, (px) => `700 ${px}px 'Archivo', sans-serif`, 25, 17);
  let y = 242;
  if (d.boss) {
    ctx.fillStyle = DIM;
    fitText(ctx, `${d.boss[0].toUpperCase()}${d.boss.slice(1)}`, L, y, maxW, (px) => `500 ${px}px 'Archivo', sans-serif`, 21, 16);
  }
  // mayor golpe: la cifra grande, sobre su placa
  y = 258;
  const hitTxt = String(d.maxHit);
  ctx.font = "400 66px 'Archivo Black', sans-serif";
  const hitW = Math.max(ctx.measureText(hitTxt).width, 150) + 36;
  ctx.fillStyle = INK;
  ctx.fillRect(L + 6, y + 6, hitW, 104);
  ctx.fillStyle = HAZARD;
  ctx.fillRect(L, y, hitW, 104);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(L + 1.5, y + 1.5, hitW - 3, 101);
  ctx.fillStyle = INK;
  ctx.font = "700 17px 'Space Mono', monospace";
  ctx.fillText(Lg('ui.lam.mayor'), L + 18, y + 26);
  ctx.font = "400 66px 'Archivo Black', sans-serif";
  ctx.fillText(hitTxt, L + 18, y + 90);
  // turnos, guardias, golpes exactos
  const sx = L + hitW + 26;
  const stats: [string, number][] = [
    [Lg('ui.lam.turnos'), d.turns],
    [Lg('ui.lam.guardias'), d.floors],
    [Lg('ui.lam.exactos'), d.cleans],
  ];
  stats.forEach(([k, v], i) => {
    const yy = y + i * 35;
    ctx.fillStyle = INK;
    ctx.font = "700 16px 'Space Mono', monospace";
    ctx.fillText(k, sx, yy + 24);
    const kw = ctx.measureText(k).width;
    ctx.font = "400 24px 'Archivo Black', sans-serif";
    const vw = ctx.measureText(String(v)).width;
    const px = Math.min(R - vw - 16, Math.max(sx + kw + 14, sx + 210));
    ctx.fillStyle = INK;
    ctx.fillRect(px, yy + 2, vw + 16, 32);
    ctx.fillStyle = PAPER;
    ctx.fillText(String(v), px + 8, yy + 28);
  });
  // reliquias
  y = 394;
  ctx.fillStyle = INK;
  ctx.font = "700 16px 'Space Mono', monospace";
  ctx.fillText(Lg('ui.lam.reliquias'), L, y);
  let tx = L + ctx.measureText(Lg('ui.lam.reliquias')).width + 14;
  let ty = y - 22;
  ctx.font = "700 17px 'Archivo', sans-serif";
  const tools = d.tools.length ? d.tools : [Lg('ui.orden.sin.reliquias')];
  for (const name of tools) {
    const w = ctx.measureText(name).width + 18;
    if (tx + w > R) {
      tx = L;
      ty += 36;
      if (ty > y + 20) break; // dos renglones como mucho
    }
    ctx.fillStyle = d.tools.length ? INK : PAPER2;
    ctx.fillRect(tx, ty, w, 30);
    ctx.fillStyle = d.tools.length ? PAPER : INK;
    ctx.fillText(name, tx + 9, ty + 21);
    tx += w + 8;
  }
  // causa de la derrota: su primera línea
  y = 470;
  if (d.death) {
    ctx.fillStyle = RED;
    ctx.fillRect(L, y - 24, 8, 54);
    ctx.font = "700 15px 'Space Mono', monospace";
    ctx.fillText(Lg('ui.lam.causa'), L + 18, y - 8);
    ctx.fillStyle = INK;
    ctx.font = "700 19px 'Archivo', sans-serif";
    wrapText(ctx, d.death.title, L + 18, y + 18, maxW - 18, 22, 1);
  }
  // pie: semilla, baraja y nivel, y el enlace
  const fy = 528;
  ctx.fillStyle = INK;
  ctx.fillRect(L, fy, R - L, 70);
  ctx.fillStyle = PAPER;
  ctx.font = "700 15px 'Space Mono', monospace";
  ctx.fillText(Lg('ui.lam.semilla'), L + 14, fy + 26);
  ctx.fillStyle = HAZARD;
  const seedW = fitText(ctx, d.seed, L + 14 + ctx.measureText(Lg('ui.lam.semilla')).width + 12, fy + 30, 300, (px) => `400 ${px}px 'Archivo Black', sans-serif`, 26, 16);
  ctx.fillStyle = PAPER;
  ctx.font = "700 15px 'Space Mono', monospace";
  const meta2 = Lg('ui.lam.pie', { baraja: d.deck, n: d.level });
  const mx = L + 14 + ctx.measureText(Lg('ui.lam.semilla')).width + 12 + seedW + 18;
  fitText(ctx, meta2, mx, fy + 28, R - 14 - mx, (px) => `500 ${px}px 'Archivo', sans-serif`, 17, 13);
  ctx.fillStyle = PAPER;
  fitText(ctx, d.link ? d.link.replace(/^https?:\/\//, '') : Lg('ui.lam.rejugar'), L + 14, fy + 56, R - L - 28, (px) => `500 ${px}px 'Archivo', sans-serif`, 15, 12);
}

/** La lámina en PNG (1200 × 630). */
export async function laminaBlob(d: Lamina): Promise<Blob> {
  const W = 1200;
  const H = 630;
  await fontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('sin canvas');
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(backdropSvg(d))}`;
  await img.decode();
  ctx.drawImage(img, 0, 0, W, H);
  drawText(ctx, d);
  return new Promise((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('sin PNG'))), 'image/png'));
}

const fileName = (d: Lamina) => brandFile('lamina', 'png', (d.seed || 'cronica').replace(/[^A-Za-z0-9-]+/g, '-').toLowerCase());

/** «Descargar lámina»: el PNG, entregado por la plataforma (descarga en la web; diálogo de guardar en escritorio). */
export async function downloadLamina(d: Lamina): Promise<void> {
  try {
    platform.saveFile(fileName(d), await laminaBlob(d));
    toast(Lg('ui.lam.descargada'));
  } catch {
    toast(Lg('ui.lam.no.dibujar'));
  }
}

/**
 * «Copiar lámina»: la imagen al portapapeles; si el navegador no deja copiar imágenes, la crónica en texto
 * con el enlace. Devuelve qué se copió.
 */
export async function copyLamina(d: Lamina, text: string): Promise<'png' | 'text' | 'none'> {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      // la promesa va dentro del ClipboardItem: así Safari no da por caducado el gesto del jugador
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': laminaBlob(d) })]);
      return 'png';
    }
  } catch {
    /* sin permiso para imágenes: va el texto */
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'text';
  } catch {
    return 'none';
  }
}

// ───────────────────────── Abrir un enlace con semilla ─────────────────────────

let linkNote = '';
let watcher: MutationObserver | null = null;

/** Pone el aviso «vienes de una crónica» arriba de la preparación de campaña (y lo repone si la pantalla se repinta). */
function placeNote(): void {
  const host = app.querySelector('.camp .camp-run .scroll');
  if (!host) {
    if (S.screen !== 'camp') {
      watcher?.disconnect();
      watcher = null;
    }
    return;
  }
  if (host.querySelector('.semilla-aviso') || !linkNote) return;
  const p = document.createElement('p');
  p.className = 'semilla-aviso';
  p.setAttribute('role', 'status');
  p.innerHTML = linkNote;
  host.prepend(p);
}

/**
 * Lee ?seed=, &baraja= y &nivel= de la dirección. Si hay semilla, deja cargada la preparación de
 * campaña con ella y avisa de dónde viene. «Nueva campaña» sigue preguntando antes de abandonar la que
 * haya a medias. Devuelve true si atendió un enlace.
 */
export function openSeedLink(): boolean {
  const q = new URLSearchParams(location.search);
  const raw = q.get('seed');
  if (raw === null || q.has('qa')) return false;
  // igual que la lee la campaña (run.ts): sin filtrar caracteres, o la almohadilla de una semilla
  // al azar («#1A2B3C») se perdería y el enlace llevaría a otra campaña
  const seed = raw.trim().slice(0, 24).toUpperCase();
  const deck = q.get('baraja') ?? '';
  const level = Number.parseInt(q.get('nivel') ?? '', 10);
  for (const k of ['seed', 'baraja', 'nivel']) q.delete(k);
  history.replaceState(null, '', `${location.pathname}${q.toString() ? `?${q}` : ''}${location.hash}`);
  if (!seed) return false;
  const notes: string[] = [];
  prefs.seed = seed;
  if (deck && DECK[deck]) {
    if (deckUnlocked(meta, deck)) pickDeck(deck);
    else notes.push(Lg('ui.lam.cerrada', { x: barN(deck).toLowerCase() }));
  }
  if (Number.isFinite(level) && level >= 1) {
    const want = Math.min(level - 1, 7);
    prefs.ascension = Math.min(want, meta.ascMax);
    if (want > meta.ascMax) notes.push(Lg('ui.lam.reinado', { n: level, m: prefs.ascension + 1 }));
  }
  linkNote = `${Lg('ui.lam.vienes', { s: esc(seed) })}<span>${notes.length ? Lg('ui.lam.ojo', { x: esc(notes.join('; ')) }) : Lg('ui.lam.cargados')}${Lg('ui.lam.pulsa')}</span>`;
  setScreen('camp');
  watcher?.disconnect();
  watcher = new MutationObserver(placeNote);
  watcher.observe(app, { childList: true });
  placeNote();
  return true;
}
