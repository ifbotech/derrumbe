// V8 · La partitura de la corte, pura: sin WebAudio ni DOM. De (semilla, escena, asalto, compás) sale la
// lista de notas de un compás; audio.ts solo la toca y scripts/audio-variedad.ts (npm run qa:audio) la
// mide con el guion de tres horas. Lo que suena y lo que se mide es lo mismo.
//
// Todo en re menor: re eólico (re mi fa sol la si♭ do) y el do♯ de la menor armónica solo en las
// cadencias (los compases de dominante, La mayor), marcadas con `cadencia`. Cada asalto tiene su juego de
// motivos; tempo, registro y densidad suben del 1 al 8. Nada sale de Math.random: el azar va sembrado.

export type Escena = 'menu' | 'map' | 'shop' | 'battle';
/** Voces de la música. El bordón (re y la graves, continuo) no es un evento: no cuenta como repetición. */
export type Voz = 'tambor' | 'guerra' | 'cadenas' | 'campana' | 'cuernos' | 'metales' | 'bajo' | 'laud' | 'eco' | 'punteo' | 'coro';

export interface Evento {
  /** Inicio, en semicorcheas desde el principio del compás (0–15). */
  t: number;
  voz: Voz;
  /** Altura MIDI (62 = re4). */
  nota: number;
  /** Duración, en semicorcheas. */
  dur: number;
  /** Intensidad, de 0 a 1 (en décimas). */
  vel: number;
  /** Ataque de la envolvente, en segundos. */
  ataque: number;
  /** Panorama, de −1 (izquierda) a 1. */
  pan: number;
  /** Nota de la dominante (do♯): solo vale aquí. */
  cadencia?: boolean;
}

export interface EstadoMusica {
  semilla: number;
  escena: Escena;
  /** Asalto de la campaña (1–8); fuera del combate, el último jugado o 1. */
  asalto: number;
  monarca: boolean;
  /** Presión de la mesa, de 0 a 1 (ya suavizada por quien llama). */
  presion: number;
  /** Compás global desde que empezó la música (no se reinicia nunca: así nada vuelve a ser igual). */
  compas: number;
  /** Compás global en que empezó la escena actual (la frase arranca por su principio). */
  inicio: number;
}

export interface Compas {
  eventos: Evento[];
  bpm: number;
  /** Lo que dura el compás (8 corcheas), en segundos. */
  segundos: number;
}

// ───────────────────────── azar sembrado ─────────────────────────

/** Mezcla enteros en una semilla de 32 bits (cada combinación da otra). */
export function mezcla(...xs: number[]): number {
  let h = 0x9e3779b9;
  for (const x of xs) {
    h = Math.imul(h ^ (Math.floor(x) | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}
/** Flujo de azar sembrado (mulberry32). */
export function flujo(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ESCENA_N: Record<Escena, number> = { menu: 1, map: 2, shop: 3, battle: 4 };

// ───────────────────────── tonalidad ─────────────────────────

/** Re eólico, en semitonos sobre re. */
const EOLIO = [0, 2, 3, 5, 7, 8, 10];
/** Clases de altura permitidas (re eólico) y la sensible, que solo vale en cadencia. */
export const RE_MENOR = new Set([2, 4, 5, 7, 9, 10, 0]);
export const SENSIBLE = 1;
const RE4 = 62;
const mod = (n: number, m: number) => ((n % m) + m) % m;
/** Grado de re menor (0 = re4, 7 = re5, −7 = re3) → MIDI. En la dominante, el séptimo grado sube a do♯. */
function grado(g: number, dominante: boolean): { nota: number; cadencia: boolean } {
  const d = mod(g, 7);
  const nota = RE4 + 12 * Math.floor(g / 7) + EOLIO[d] + (dominante && d === 6 ? 1 : 0);
  return { nota, cadencia: dominante && d === 6 };
}

/** Acordes por su fundamental (grado). 'V' es La mayor (con do♯); 4 es la menor natural. */
type Acorde = number | 'V';
const PROGRESIONES: Acorde[][] = [
  [0, 5, 3, 'V', 0, 5, 'V', 0], // i – VI – iv – V | i – VI – V – i
  [0, 3, 6, 2, 5, 3, 'V', 0], // i – iv – VII – III | VI – iv – V – i
  [0, 4, 5, 2, 3, 0, 'V', 0], // i – v – VI – III | iv – i – V – i
  [0, 5, 2, 6, 3, 5, 'V', 0], // i – VI – III – VII | iv – VI – V – i
];
const raiz = (a: Acorde) => (a === 'V' ? 4 : a);
/** La fundamental, llevada cerca de re para que la melodía no salte de registro. */
const cerca = (r: number) => (r > 3 ? r - 7 : r);

// ───────────────────────── motivos ─────────────────────────

/** Un motivo: [grado relativo a la fundamental del acorde, duración en semicorcheas], 16 semicorcheas. */
export type Motivo = [number, number][];
export interface JuegoDeMotivos {
  /** El motivo principal (lo que distingue un asalto de otro). */
  cabeza: Motivo;
  respuesta: Motivo;
  cierre: Motivo;
}
/** Asaltos 1–8: cada uno el suyo. Del 1 al 8, más notas y más cortas. */
export const MOTIVOS_ASALTO: JuegoDeMotivos[] = [
  { cabeza: [[0, 6], [2, 2], [4, 4], [2, 4]], respuesta: [[4, 4], [3, 4], [2, 8]], cierre: [[2, 4], [0, 12]] },
  { cabeza: [[0, 4], [1, 2], [2, 2], [4, 6], [2, 2]], respuesta: [[5, 4], [4, 2], [2, 2], [0, 8]], cierre: [[4, 4], [0, 12]] },
  { cabeza: [[4, 4], [2, 4], [0, 2], [1, 2], [2, 4]], respuesta: [[2, 2], [3, 2], [4, 4], [7, 4], [4, 4]], cierre: [[1, 2], [2, 2], [0, 12]] },
  { cabeza: [[0, 2], [0, 2], [4, 4], [3, 2], [2, 2], [1, 4]], respuesta: [[2, 6], [0, 2], [-1, 4], [0, 4]], cierre: [[-1, 4], [0, 12]] },
  { cabeza: [[7, 4], [6, 2], [4, 2], [5, 4], [4, 4]], respuesta: [[2, 2], [4, 2], [2, 2], [0, 2], [1, 8]], cierre: [[2, 2], [1, 2], [0, 12]] },
  { cabeza: [[0, 3], [2, 1], [4, 2], [2, 2], [5, 4], [4, 4]], respuesta: [[4, 2], [5, 2], [4, 2], [2, 2], [0, 8]], cierre: [[4, 2], [2, 2], [0, 12]] },
  { cabeza: [[0, 2], [4, 2], [7, 2], [4, 2], [6, 4], [4, 4]], respuesta: [[3, 2], [2, 2], [1, 2], [0, 2], [-3, 8]], cierre: [[2, 2], [-1, 2], [0, 12]] },
  { cabeza: [[0, 1], [0, 1], [0, 2], [4, 2], [4, 2], [5, 2], [4, 2], [2, 4]], respuesta: [[7, 2], [6, 2], [4, 2], [2, 2], [4, 8]], cierre: [[4, 1], [2, 1], [1, 2], [0, 12]] },
];
/** El Mapa (laúd punteado), La Taberna y la portada, con sus propias frases. */
export const MOTIVOS_ESCENA: Record<Exclude<Escena, 'battle'>, JuegoDeMotivos> = {
  map: { cabeza: [[0, 2], [2, 2], [4, 2], [2, 2], [1, 4], [0, 4]], respuesta: [[4, 2], [5, 2], [4, 4], [2, 8]], cierre: [[2, 2], [1, 2], [0, 12]] },
  shop: { cabeza: [[4, 2], [2, 1], [3, 1], [4, 4], [7, 4], [4, 4]], respuesta: [[5, 2], [4, 2], [3, 2], [2, 2], [0, 8]], cierre: [[1, 2], [2, 2], [0, 12]] },
  menu: { cabeza: [[0, 8], [2, 4], [1, 4]], respuesta: [[4, 8], [2, 8]], cierre: [[0, 16]] },
};

/** Ritmos de tambor por corchea (8 por compás), como en la 7.0. */
const D_MARCH = [1, 0, 0, 1, 0, 0, 1, 0];
const D_SLOW = [1, 0, 0, 0, 1, 0, 0, 0];
const D_GALLOP = [1, 0, 1, 1, 0, 1, 1, 0];
const D_WAR = [1, 1, 0, 1, 1, 0, 1, 1];
const D_SHOP = [1, 0, 0, 0, 0, 0, 1, 0];
/** Transportes de la 7.0, ahora diatónicos (en grados de re menor, para no salir nunca de la tonalidad). */
export const STAGE_SHIFT = [0, 2, -2, 3, 5, -3, 7, 0];
export const STAGE_DRUMS = [D_SLOW, D_MARCH, D_MARCH, D_GALLOP, D_MARCH, D_GALLOP, D_WAR, D_WAR];
const giro = (i: number) => Math.round((STAGE_SHIFT[i] * 7) / 12);

/** Tempo de cada escena: la subida de la 7.0 (72 + 3 por asalto, +6 ante un monarca). */
export function bpmDe(escena: Escena, asalto: number, monarca: boolean): number {
  const i = Math.max(0, Math.min(7, asalto - 1));
  return escena === 'menu' ? 66 : escena === 'map' ? 78 : escena === 'shop' ? 86 : 72 + i * 3 + (monarca ? 6 : 0);
}

/** Panorama fijo de cada voz (audio.ts monta un panoramizador por voz). */
export const PAN: Record<Voz, number> = { tambor: 0, guerra: -0.12, cadenas: 0.35, campana: -0.25, cuernos: 0.1, metales: 0.28, bajo: 0, laud: -0.18, eco: 0.3, punteo: 0.22, coro: -0.05 };

// ───────────────────────── variaciones ─────────────────────────

/** Velocidad redondeada a décimas. */
const dec = (v: number) => Math.round(Math.max(0.1, Math.min(1, v)) * 10) / 10;

function variar(m: Motivo, rnd: () => number, densidad: number, invertir: boolean): Motivo {
  let out: Motivo = m.map(([g, d]) => [g, d]);
  if (invertir) out = out.map(([g, d]) => [out[0][0] * 2 - g, d]);
  if (rnd() < 0.25) {
    const s = rnd() < 0.5 ? 1 : -1; // secuencia: la frase entera un grado arriba o abajo
    out = out.map(([g, d]) => [g + s, d]);
  }
  const res: Motivo = [];
  for (let i = 0; i < out.length; i++) {
    const [g, d] = out[i];
    const next = out[i + 1];
    if (next && d >= 2 && d % 2 === 0 && Math.abs(next[0] - g) === 2 && rnd() < densidad) {
      // nota de paso entre dos vecinas de la escala
      res.push([g, d / 2], [(g + next[0]) / 2, d / 2]);
    } else if (d >= 4 && d % 4 === 0 && rnd() < densidad * 0.8) {
      // la nota larga se parte: bordadura arriba o abajo
      const b = rnd() < 0.5 ? 1 : -1;
      res.push([g, d / 2], [g + b, d / 4], [g, d / 4]);
    } else if (i > 0 && rnd() < 0.1) {
      res.push([NaN, d]); // un silencio donde había nota
    } else if (i > 0 && rnd() < 0.1) {
      res.push([g + (rnd() < 0.5 ? 7 : -7), d]); // una nota salta de octava
    } else res.push([g, d]);
  }
  return res;
}

// ───────────────────────── el compás ─────────────────────────

/**
 * La partitura de un compás. Función pura: lo mismo da lo mismo. `compas` es global (no se reinicia
 * entre escenas), así que tres horas de juego no vuelven a dar el mismo compás.
 */
export function compas(e: EstadoMusica): Compas {
  const i = Math.max(0, Math.min(7, e.asalto - 1));
  const bpm = bpmDe(e.escena, e.asalto, e.monarca);
  const segundos = 240 / bpm;
  const enEscena = Math.max(0, e.compas - e.inicio);
  const pos = enEscena % 8;
  const frase = Math.floor(enEscena / 8);
  const sc = ESCENA_N[e.escena];
  const rFrase = flujo(mezcla(e.semilla, sc, i, e.inicio, frase, 7));
  const rnd = flujo(mezcla(e.semilla, sc, i, e.compas, 11));
  const prog = PROGRESIONES[Math.floor(rFrase() * PROGRESIONES.length)];
  const eco = rFrase() < 0.35;
  const acorde = prog[pos];
  const dom = acorde === 'V';
  const r = cerca(raiz(acorde));
  const battle = e.escena === 'battle';
  const p = battle ? (e.monarca ? Math.max(0.55, e.presion) : e.presion) : e.escena === 'shop' ? 0.2 : e.escena === 'map' ? 0.25 : 0.35;
  const guerra = battle && (e.monarca || e.presion > 0.6);
  const respiro = (battle || e.escena === 'menu') && frase % 5 === 4 && !guerra && p < 0.6;
  const ev: Evento[] = [];
  const add = (t: number, voz: Voz, g: number, dur: number, vel: number, ataque: number) => {
    const { nota, cadencia } = grado(g, dom);
    ev.push({ t, voz, nota, dur, vel: dec(vel), ataque: Math.round(ataque * 1000) / 1000, pan: PAN[voz], ...(cadencia ? { cadencia } : {}) });
  };
  // un toque humano por compás: ningún compás tiene exactamente la misma dinámica que otro
  const toque = () => 0.1 * Math.floor(rnd() * 4) - 0.15;

  // ── tambores ──
  if (!respiro && e.escena !== 'map') {
    const pat = e.escena === 'menu' ? D_SLOW : e.escena === 'shop' ? D_SHOP : e.monarca ? D_WAR : STAGE_DRUMS[i];
    for (let c = 0; c < 8; c++) {
      const on = p < 0.28 ? c === 0 : pat[c] === 1 || (p > 0.7 && c % 2 === 0) || (battle && pos === 7 && c >= 5 && p > 0.4);
      if (!on) continue;
      const fuerte = battle ? 0.55 + 0.4 * p : 0.4;
      add(c * 2, 'tambor', c === 0 ? -11 : -14, 4, fuerte * (c === 0 ? 1 : 0.65) + toque() * 0.5, 0.004);
    }
  }
  // ── tambores de guerra: ante un monarca o con la Vida en las últimas ──
  if (guerra) {
    for (let c = 0; c < 8; c++) if (D_WAR[c]) add(c * 2, 'guerra', c % 3 === 0 ? -17 : -14, 3, 0.6 + 0.3 * p + toque() * 0.4, 0.003);
    // redoble de cierre en semicorcheas, distinto cada compás
    const fill = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < fill; k++) add(15 - k, 'guerra', -11, 1, 0.4 + 0.1 * k + toque() * 0.3, 0.002);
  }
  // ── cadenas: un roce en los contratiempos cuando aprieta ──
  if (battle && p > 0.45) for (const t of [4, 12]) if (rnd() < 0.85) add(t, 'cadenas', 11, 1, 0.4 + 0.5 * p, 0.002);
  // ── campana a lo lejos al abrir cada frase (ante un monarca, también a media frase) ──
  if (e.escena !== 'shop' && (pos === 0 || (e.monarca && pos === 4))) add(0, 'campana', -14, 16, 0.6 + toque() * 0.5, 0.002);
  // ── cuernos graves: fundamental y quinta todo el compás ──
  if (!respiro && (battle || e.escena === 'menu')) {
    const fuerza = e.monarca ? 1 : battle ? 0.45 + 0.5 * p : 0.55;
    add(0, 'cuernos', r - 14, 16, fuerza + toque() * 0.3, 0.45);
    add(0, 'cuernos', r - 10, 16, fuerza * 0.6 + toque() * 0.3, 0.45);
  }
  // ── metales: golpes de acorde, solo con la guerra encima ──
  if (guerra) {
    const golpes = rnd() < 0.5 ? [0, 8] : rnd() < 0.5 ? [0, 6, 12] : [0, 10];
    for (const t of golpes) for (const [k, g] of [r - 7, r - 5, r - 3].entries()) add(t, 'metales', g, t === 0 ? 4 : 3, (0.55 + 0.3 * p) * (k === 0 ? 1 : 0.75) + toque() * 0.3, 0.03);
  }
  // ── bajo: en el Mapa y en La Taberna siempre; en la mesa, mientras se piensa con calma ──
  if (e.escena === 'map' || e.escena === 'shop' || respiro || (battle && p < 0.45) || e.escena === 'menu') {
    const pats = e.escena === 'map' ? [[0, 8, 12], [0, 6, 8], [0, 8], [0, 4, 8, 12]] : [[0, 6, 12], [0, 6, 10], [0, 8, 12], [0, 6]];
    const pat = pats[Math.floor(rnd() * pats.length)];
    pat.forEach((t, k) => {
      const g = k === 0 ? r - 14 : rnd() < 0.7 ? r - 10 : r - 12; // fundamental, luego quinta o tercera
      add(t, 'bajo', g, k === pat.length - 1 ? 16 - t : (pat[k + 1] ?? 16) - t, (e.escena === 'shop' ? 0.75 : 0.65) + toque(), 0.008);
    });
  }
  // ── laúd del Mapa: arpegio punteado del acorde, en corcheas o semicorcheas ──
  if (e.escena === 'map') {
    const arps = [[0, 2, 4, 2], [0, 4, 2, 4], [4, 2, 0, 2], [0, 2, 4, 7]];
    const arp = arps[Math.floor(rnd() * arps.length)];
    const paso = rnd() < 0.3 ? 1 : 2;
    for (let t = 0, k = 0; t < 16; t += paso, k++) if (paso === 2 || k % 4 !== 3) add(t, 'punteo', r - 7 + arp[k % 4], paso, 0.45 + (t % 8 === 0 ? 0.15 : 0) + toque() * 0.5, 0.003);
  }

  // ── melodía: el laúd. En la mesa entra en la segunda frase (ante un monarca, desde el principio) ──
  if (respiro) return { eventos: ev, bpm, segundos };
  if (battle && frase === 0 && !e.monarca) return { eventos: ev, bpm, segundos };
  if (e.escena === 'map' && pos % 2 === 1 && rnd() < 0.6) return { eventos: ev, bpm, segundos }; // el Mapa respira entre frases
  const juego = battle ? MOTIVOS_ASALTO[i] : MOTIVOS_ESCENA[e.escena as Exclude<Escena, 'battle'>];
  const papel = pos === 7 ? juego.cierre : pos % 2 === 0 ? juego.cabeza : juego.respuesta;
  const densidad = battle ? 0.12 + 0.05 * i : e.escena === 'menu' ? 0.08 : 0.18;
  const registro = battle ? Math.floor(i / 2) + giro(i) : e.escena === 'shop' ? giro(4) : 0;
  const motivo = variar(papel, rnd, densidad, pos >= 4 && pos < 7 && rFrase() < 0.5);
  const corto = e.escena === 'map'; // punteado
  const coro = (battle && (e.monarca || p > 0.55)) || (e.escena === 'menu' && frase % 2 === 1);
  let t = 0;
  for (const [k, [g, d]] of motivo.entries()) {
    if (!Number.isNaN(g)) {
      const gg = registro + r + g;
      const v = 0.65 + (k === 0 ? 0.15 : 0) + toque();
      add(t, 'laud', gg, corto ? Math.min(d, 2) : d, v, 0.003 + 0.001 * Math.floor(rnd() * 4));
      if (e.escena === 'shop' && rnd() < 0.5) add(t, 'punteo', gg + 7, Math.min(d, 2), 0.35 + toque() * 0.5, 0.002);
      if (eco && t + 4 < 16) add(t + 4, 'eco', gg, Math.min(d, 4), 0.3, 0.004);
      if (coro) add(t, 'coro', gg - 7, Math.min(16 - t, d * 2), 0.55 + 0.3 * p + toque() * 0.5, 0.18);
    }
    t += d;
  }
  return { eventos: ev, bpm, segundos };
}

// ───────────────────────── efectos: variación sembrada ─────────────────────────

export interface Variacion {
  /** Desafinación, en cents. */
  cents: number;
  /** Ataque, en segundos. */
  ataque: number;
  /** Panorama, de −1 a 1. */
  pan: number;
}
const EFECTO_N = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
/**
 * La variación de la vez `n` de un efecto: cada repetición cambia de tono, de ataque y de panorama.
 * audio.ts la pide en cada `sfx.*`; qa:audio comprueba que nunca salen más de 8 seguidas iguales.
 */
export function variacion(semilla: number, efecto: string, n: number): Variacion {
  const r = flujo(mezcla(semilla, EFECTO_N(efecto), n, 3));
  // el panorama alterna de lado y el tono de signo: dos seguidas nunca caen juntas
  const lado = n % 2 ? 1 : -1;
  return {
    cents: Math.round(lado * (4 + r() * 10) * 10) / 10,
    ataque: Math.round((0.001 + r() * 0.007) * 10000) / 10000,
    pan: Math.round((lado * (0.06 + r() * 0.22) + (r() - 0.5) * 0.04) * 100) / 100,
  };
}

/** La cadena de Golpes exactos tras un golpe: sube con cada exacto y vuelve a 0 con uno que no lo es. */
export const cadenaTras = (antes: number, exacto: boolean) => (exacto ? antes + 1 : 0);
/** Semitonos de la campana para la cadena `n` (1 = el primer exacto, tono base): +1 por exacto, tope +7. */
export const campana = (n: number) => (n <= 1 ? 0 : Math.min(7, n - 1));
