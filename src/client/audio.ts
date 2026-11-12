// Sonido de DERRUMBE: todo sintetizado con WebAudio (sin archivos ni dependencias).
// Efectos de piedra, hierro y cuerno de guerra, y una marcha en re menor armónico (bordón grave,
// tambores, laúd, coro, cuernos y campana) que nunca suena dos veces igual: cada vuelta varía la
// melodía y entran o callan instrumentos según la presión de la obra.
//
// Mezcla pensada para sesiones largas:
//   efectos ─┐                       ┌─ sala de hormigón (reverberación corta y oscura)
//   música ──┴─► máster ─► estante de agudos (−5 dB) ─► compresor ─► salida
import { loadJson, platform, saveJson } from './platform';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;

export interface Volume {
  master: number;
  music: number;
  sfx: number;
}
const VOLUME_KEY = 'derrumbe:volume';
// ajustes de versiones anteriores: sonido y música eran interruptores
const legacy = { sfx: platform.load('derrumbe:sound') === '0' ? 0 : 0.9, music: platform.load('derrumbe:music') === '0' ? 0 : 0.7 };
const volume: Volume = { master: 0.8, ...legacy, ...loadJson<Partial<Volume>>(VOLUME_KEY) };
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
/** Los deslizadores van de 0 a 1; el oído no es lineal, así que la ganancia va al cuadrado. */
const gainOf = (v: number) => clamp01(v) ** 2;

export const getVolume = (): Volume => ({ ...volume });
export function setVolume(kind: keyof Volume, value: number): void {
  volume[kind] = clamp01(value);
  saveJson(VOLUME_KEY, volume);
  if (!ctx) return;
  const t = ctx.currentTime;
  master?.gain.setTargetAtTime(gainOf(volume.master), t, 0.05);
  sfxBus?.gain.setTargetAtTime(gainOf(volume.sfx), t, 0.05);
  if (kind === 'music') {
    if (volume.music > 0) startLoop();
    else stopLoop();
  }
  if (timer !== null) musicBus?.gain.setTargetAtTime(0.6 * gainOf(volume.music), t, 0.1);
}

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      // máster → estante de agudos → compresor → salida: nada chilla y nada satura
      master = ctx.createGain();
      master.gain.value = gainOf(volume.master);
      const shelf = ctx.createBiquadFilter();
      shelf.type = 'highshelf';
      shelf.frequency.value = 5200;
      shelf.gain.value = -5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 20;
      comp.ratio.value = 3.5;
      comp.attack.value = 0.006;
      comp.release.value = 0.24;
      master.connect(shelf).connect(comp).connect(ctx.destination);
      // sala de hormigón: cola corta, primeras reflexiones marcadas y agudos apagados
      const len = Math.floor(ctx.sampleRate * 2.3);
      const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const white = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
          last = last * 0.72 + white * 0.28; // paso bajo de un polo: el hormigón se come los agudos
          d[i] = last + (i < 2400 && i % (311 + ch * 47) === 0 ? 0.5 * (1 - i / 2400) : 0);
        }
      }
      const hall = ctx.createConvolver();
      hall.buffer = impulse;
      wet = ctx.createGain();
      wet.gain.value = 0.34;
      wet.connect(hall).connect(master);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = gainOf(volume.sfx);
      sfxBus.connect(master);
      sfxBus.connect(wet);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);
      musicBus.connect(wet);
    }
    if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// con la pestaña en segundo plano el audio se suspende entero (ni suena ni gasta)
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) void ctx.suspend();
  else void ctx.resume();
});

interface Voice {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  slide?: number;
  cutoff?: number;
  detune?: number;
  vibrato?: number;
}

/** Una nota: oscilador → filtro → envolvente. `out` decide si va a la música o a los efectos. */
function note(out: AudioNode, freq: number, t: number, dur: number, v: Voice = {}): void {
  const a = ctx!;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = v.type ?? 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  if (v.slide) osc.frequency.exponentialRampToValueAtTime(v.slide, t + dur);
  if (v.detune) osc.detune.value = v.detune;
  if (v.vibrato) {
    const lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = 5.2;
    depth.gain.value = v.vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  }
  const vol = v.vol ?? 0.1;
  const attack = v.attack ?? 0.006;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.02));
  let node: AudioNode = osc;
  if (v.cutoff) {
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = v.cutoff;
    node = osc.connect(f);
  }
  node.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(out: AudioNode, t: number, dur: number, vol: number, type: BiquadFilterType, freq: number): void {
  const a = ctx!;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = a.createBufferSource();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  f.type = type;
  f.frequency.value = freq;
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

// ───────────────────────── Efectos ─────────────────────────

function fx(play: (a: AudioContext, out: AudioNode, t: number) => void): void {
  if (volume.sfx <= 0 || document.hidden) return;
  const a = ac();
  if (!a || !sfxBus) return;
  play(a, sfxBus, a.currentTime + 0.01);
}

const horn = (out: AudioNode, f: number, t: number, dur: number, vol: number, slide?: number) => {
  note(out, f, t, dur, { type: 'sawtooth', vol, attack: 0.09, cutoff: 900, detune: -7, slide });
  note(out, f, t, dur, { type: 'sawtooth', vol, attack: 0.09, cutoff: 900, detune: 7, slide });
  note(out, f / 2, t, dur, { type: 'square', vol: vol * 0.5, attack: 0.12, cutoff: 500, slide: slide ? slide / 2 : undefined });
};

/** Semitonos → factor de frecuencia. */
const semi = (n: number) => 2 ** (n / 12);

export const sfx = {
  /** campanilla de la cuenta: cada activación sube un semitono (2^(n/12)) */
  tick: (n: number) =>
    fx((_, o, t) => {
      const f = 392 * semi(Math.min(n, 30));
      note(o, f, t, 0.16, { type: 'triangle', vol: 0.11 });
      note(o, f * 2, t, 0.09, { type: 'sine', vol: 0.04 });
    }),
  /** naipe que sale de la mano */
  flick: () =>
    fx((_, o, t) => {
      noise(o, t, 0.05, 0.16, 'highpass', 3400);
      note(o, 900, t, 0.05, { type: 'triangle', vol: 0.03, slide: 420 });
    }),
  /** tampón de goma contra el papel */
  stamp: () =>
    fx((_, o, t) => {
      note(o, 150, t, 0.11, { type: 'sine', vol: 0.5, slide: 60 });
      noise(o, t, 0.05, 0.3, 'lowpass', 900);
      noise(o, t + 0.07, 0.04, 0.08, 'highpass', 2600);
    }),
  /** botón-sello: golpe seco y corto */
  clack: () =>
    fx((_, o, t) => {
      note(o, 210, t, 0.05, { type: 'square', vol: 0.06, slide: 120 });
      noise(o, t, 0.03, 0.14, 'bandpass', 1800);
    }),
  /** martillo sobre el yunque */
  forge: () =>
    fx((_, o, t) => {
      noise(o, t, 0.04, 0.3, 'highpass', 2200);
      [1, 2.32, 3.9, 5.1].forEach((m, i) => note(o, 520 * m, t, 0.7 - i * 0.14, { type: 'sine', vol: 0.11 / (i + 1) }));
      note(o, 95, t, 0.16, { type: 'sine', vol: 0.3, slide: 50 });
    }),
  /** carta al quemador */
  hiss: () =>
    fx((_, o, t) => {
      noise(o, t, 0.7, 0.2, 'highpass', 4200);
      noise(o, t + 0.05, 0.5, 0.14, 'bandpass', 1500);
      note(o, 320, t, 0.5, { type: 'sawtooth', vol: 0.02, slide: 90 });
    }),
  /** cascada de monedas: una por cada pieza de oro (hasta 10) */
  coins: (n: number) =>
    fx((_, o, t) => {
      for (let i = 0; i < Math.min(10, Math.max(2, n)); i++) {
        const at = t + i * 0.055 + Math.random() * 0.02;
        note(o, 1400 + Math.random() * 1500, at, 0.14, { type: 'sine', vol: 0.06 });
        noise(o, at, 0.02, 0.05, 'highpass', 5000);
      }
    }),
  /** campana del golpe limpio */
  bell: () =>
    fx((_, o, t) => {
      [1, 2, 2.4, 3, 4.2, 5.4].forEach((m, i) => note(o, 587.33 * m, t, 1.5 - i * 0.2, { type: 'sine', vol: 0.13 / (i + 1) }));
      noise(o, t, 0.03, 0.12, 'highpass', 3000);
    }),
  /** varios pisos a la vez: el suelo retumba */
  rumble: (floors: number) =>
    fx((_, o, t) => {
      const dur = 0.9 + 0.35 * Math.min(4, floors);
      noise(o, t, dur, 0.6, 'lowpass', 180);
      note(o, 52, t, dur, { type: 'sine', vol: 0.55, slide: 30 });
      for (let i = 0; i < 6 + floors * 3; i++) noise(o, t + Math.random() * dur, 0.08, 0.2, 'bandpass', 300 + Math.random() * 900);
    }),
  /** cuerda pulsada breve */
  select: () => fx((_, o, t) => note(o, 587, t, 0.12, { vol: 0.05 })),
  /** tiza sobre el plano: dos trazos cortos */
  chalk: () =>
    fx((_, o, t) => {
      noise(o, t, 0.07, 0.1, 'bandpass', 2400);
      noise(o, t + 0.09, 0.09, 0.12, 'bandpass', 1900);
    }),
  /** pergamino */
  card: () => fx((_, o, t) => noise(o, t, 0.07, 0.12, 'highpass', 2600)),
  /** mazo contra piedra, con el canto del hierro */
  hit: () =>
    fx((_, o, t) => {
      noise(o, t, 0.2, 0.5, 'lowpass', 700);
      note(o, 120, t, 0.25, { type: 'sine', vol: 0.4, slide: 46 });
      [1, 2.76, 5.4].forEach((m, i) => note(o, 330 * m, t, 0.35 - i * 0.08, { type: 'sine', vol: 0.05 / (i + 1) }));
    }),
  /** derrumbe: estruendo grave y cascotes */
  crash: () =>
    fx((_, o, t) => {
      noise(o, t, 1.3, 0.7, 'lowpass', 320);
      note(o, 80, t, 1.1, { type: 'sine', vol: 0.5, slide: 28 });
      for (let i = 0; i < 9; i++) noise(o, t + 0.12 + Math.random() * 0.8, 0.07, 0.25, 'bandpass', 500 + Math.random() * 1800);
    }),
  /** la sirena de este mundo es un cuerno de guerra */
  siren: () =>
    fx((_, o, t) => {
      horn(o, 146.83, t, 0.55, 0.11);
      horn(o, 220, t + 0.42, 0.9, 0.13, 207);
    }),
  /** monedas sobre el mostrador */
  coin: () =>
    fx((_, o, t) => {
      note(o, 1568, t, 0.18, { type: 'sine', vol: 0.09 });
      note(o, 2093, t + 0.07, 0.3, { type: 'sine', vol: 0.09 });
      note(o, 3136, t + 0.07, 0.16, { type: 'triangle', vol: 0.03 });
    }),
  /** el Ferretero gruñe: dos o tres sílabas graves */
  grunt: () =>
    fx((a, o, t) => {
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 520 + Math.random() * 260;
      f.Q.value = 3.5;
      f.connect(o);
      const base = 92 + Math.random() * 34;
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) note(f, base * (1 + (Math.random() - 0.5) * 0.24), t + i * 0.15, 0.13, { type: 'sawtooth', vol: 0.5, attack: 0.02, slide: base * 0.8 });
    }),
  /** piedra sobre piedra */
  build: () =>
    fx((_, o, t) => {
      note(o, 190, t, 0.12, { type: 'sine', vol: 0.3, slide: 110 });
      noise(o, t, 0.06, 0.25, 'bandpass', 1200);
    }),
  win: () =>
    fx((_, o, t) => {
      [293.66, 349.23, 440, 587.33].forEach((f, i) => horn(o, f, t + i * 0.22, 0.5, 0.07));
      [293.66, 440, 587.33, 880].forEach((f) => horn(o, f, t + 0.95, 1.8, 0.05));
      [0, 0.22, 0.44, 0.66, 0.95].forEach((d) => note(o, 110, t + d, 0.4, { type: 'sine', vol: 0.5, slide: 45 }));
    }),
  /** campana a muerto */
  lose: () =>
    fx((_, o, t) => {
      [0, 1.1, 2.2].forEach((d) => [1, 2, 2.4, 3, 4.5].forEach((m, i) => note(o, 110 * m, t + d, 2.4 - i * 0.3, { type: 'sine', vol: 0.16 / (i + 1) })));
    }),
};

// ───────────────────────── Música ─────────────────────────

const F: Record<string, number> = {
  D2: 73.42, G2: 98, A2: 110, Bb2: 116.54, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, Bb3: 233.08,
  'C#4': 277.18, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440,
};
/**
 * Escena musical. La música no es un bucle fijo: cada lugar del juego tiene su tempo, su tono,
 * su ritmo de tambor y sus instrumentos, y cada obra de la campaña suena distinta a la anterior.
 */
interface Scene {
  kind: 'menu' | 'shop' | 'battle';
  bpm: number;
  /** Transporte en semitonos sobre re menor. */
  shift: number;
  drums: number[];
  /** Qué línea lleva la melodía principal. */
  lead: 'a' | 'b';
  boss: boolean;
}
const D_MARCH = [1, 0, 0, 1, 0, 0, 1, 0]; // 3 + 3 + 2
const D_SLOW = [1, 0, 0, 0, 1, 0, 0, 0];
const D_GALLOP = [1, 0, 1, 1, 0, 1, 1, 0];
const D_WAR = [1, 1, 0, 1, 1, 0, 1, 1];
const D_SHOP = [1, 0, 0, 0, 0, 0, 1, 0];
let scene: Scene = { kind: 'menu', bpm: 66, shift: 0, drums: D_SLOW, lead: 'a', boss: false };
const stepLen = () => 60 / scene.bpm / 2; // corchea
const tr = () => 2 ** (scene.shift / 12);
// Melodía (8 compases de 8 corcheas). '.' = silencio.
// Re menor armónico: el si bemol y el do sostenido le dan el color sombrío.
const MELODY = [
  'D4 . F4 . E4 . D4 .',
  'Bb3 . . D4 F4 . D4 .',
  'G4 . F4 . D4 . Bb3 .',
  'A3 . . . C#4 . E4 .',
  'F4 . A4 . G4 . F4 .',
  'D4 . F4 D4 Bb3 . D4 .',
  'E4 . C#4 . A3 . C#4 .',
  'D4 . . . . . . .',
].flatMap((bar) => bar.split(' '));
const SECOND = [
  'A3 . . . D4 . . .',
  'Bb3 . . . F3 . . .',
  'G3 . Bb3 . D4 . . .',
  'C#4 . . . A3 . . .',
  'D4 . . F4 . . A4 .',
  'Bb3 . D4 . F4 . . .',
  'E4 . . C#4 . . A3 .',
  'D3 . . . . . . .',
].flatMap((bar) => bar.split(' '));
// i – VI – iv – V | i – VI – V – i
const CHORDS: [string, string][] = [['D2', 'A2'], ['Bb2', 'F3'], ['G2', 'D3'], ['A2', 'E3'], ['D2', 'A2'], ['Bb2', 'F3'], ['A2', 'E3'], ['D2', 'A2']];
const DRUM = [1, 0, 0, 1, 0, 0, 1, 0]; // 3 + 3 + 2

let timer: number | null = null;
let step = 0;
let nextTime = 0;
let drone: OscillatorNode[] = [];
/** Presión de la obra, de 0 (pensando con calma) a 1 (el búnker se cae): decide qué capas suenan. */
let pressure = 0.3;
let pressureNow = 0.3;

// Escala de re menor armónico, para adornar la melodía con notas de paso.
const SCALE = ['D3', 'E3', 'F3', 'G3', 'A3', 'Bb3', 'C#4', 'D4', 'E4', 'F4', 'G4', 'A4'];
/** Azar con semilla: cada vuelta tiene su variación, pero siempre la misma para esa vuelta. */
function seeded(seed: number): () => number {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => ((x = (Math.imul(x ^ (x >>> 15), x | 1) + 0x6d2b79f5) >>> 0) / 4294967296);
}
/** Lo que suena en una vuelta de 8 compases. */
interface Loop {
  phrase: string[];
  /** Compases en los que el laúd calla. */
  rest: boolean[];
  /** Compases que el laúd toca una octava abajo. */
  low: boolean[];
  /** Vuelta de respiro: solo bordón, bajo y campana. */
  breath: boolean;
  /** El eco: la frase vuelve un tiempo después, más floja. */
  echo: boolean;
}
let current: Loop | null = null;
let currentKey = '';

function makeLoop(index: number): Loop {
  const rnd = seeded(index * 31 + scene.bpm * 7 + scene.shift * 13 + 5);
  const base = (index + (scene.lead === 'a' ? 0 : 1)) % 3 === 2 ? SECOND : MELODY;
  const phrase = [...base];
  const rest = Array.from({ length: 8 }, () => false);
  const low = Array.from({ length: 8 }, () => false);
  for (let bar = 0; bar < 8; bar++) {
    const r = rnd();
    const at = bar * 8;
    if (bar !== 0 && bar !== 7 && r < 0.14) rest[bar] = true; // un compás de silencio
    else if (r < 0.26) low[bar] = true; // el compás baja una octava
    else if (r < 0.44) {
      // nota de paso entre dos notas vecinas de la escala
      for (let p = 0; p < 6; p++) {
        const a = SCALE.indexOf(phrase[at + p]);
        const b = SCALE.indexOf(phrase[at + p + 2]);
        if (a >= 0 && b >= 0 && phrase[at + p + 1] === '.' && Math.abs(a - b) === 2) phrase[at + p + 1] = SCALE[(a + b) / 2];
      }
    } else if (r < 0.54 && bar < 7) {
      // el compás se toca del revés
      const notes = phrase.slice(at, at + 8).reverse();
      const shift = notes.findIndex((n) => n !== '.');
      for (let p = 0; p < 8; p++) phrase[at + p] = notes[(p + Math.max(0, shift)) % 8];
    }
  }
  return { phrase, rest, low, breath: index % 5 === 4 && !scene.boss, echo: rnd() < 0.35 };
}

function schedule(t: number, s: number): void {
  const out = musicBus!;
  const sc = scene;
  const k = tr();
  const STEP = stepLen();
  const bar = Math.floor(s / 8) % 8;
  const pos = s % 8;
  const index = Math.floor(s / 64);
  const key = `${sc.kind}:${sc.bpm}:${sc.shift}:${index}`;
  if (!current || currentKey !== key) {
    current = makeLoop(index);
    currentKey = key;
  }
  const loop = current;
  pressureNow += (pressure - pressureNow) * 0.06; // la música no salta: sube y baja poco a poco
  const battle = sc.kind === 'battle';
  const p = battle ? (sc.boss ? Math.max(0.55, pressureNow) : pressureNow) : sc.kind === 'shop' ? 0.2 : 0.35;
  const breath = loop.breath && p < 0.6;

  // tambores: latido suelto con calma, el ritmo de la obra a media presión, redoble cuando aprieta
  const beat = p < 0.28 ? pos === 0 : sc.drums[pos] === 1 || (p > 0.7 && pos % 2 === 0) || (battle && bar === 7 && pos >= 5 && p > 0.4);
  if (beat && !breath) {
    const soft = (battle ? 0.55 + 0.6 * p : 0.4) * (0.9 + 0.2 * Math.sin(s * 1.7)); // cada golpe, un poco distinto
    note(out, pos === 0 ? 92 : 74, t, 0.6, { type: 'sine', vol: (pos === 0 ? 0.6 : 0.38) * soft, slide: 30 });
    noise(out, t, 0.14, 0.22 * soft, 'lowpass', 170);
  }
  // cadenas: un roce metálico apagado en los contratiempos, solo cuando hay tensión
  if (battle && p > 0.45 && pos % 4 === 2) noise(out, t, 0.09, 0.03 + 0.05 * p, 'bandpass', 820);
  // campana a lo lejos al abrir cada vuelta (con jefe, cada cuatro compases)
  if (sc.kind !== 'shop' && (s % 64 === 0 || (sc.boss && s % 32 === 0))) [1, 2, 2.4, 3, 4.5].forEach((m, i) => note(out, 73.42 * k * m, t, 4.5 - i * 0.6, { type: 'sine', vol: 0.1 / (i + 1) }));
  // cuernos graves: fundamental y quinta por compás; crecen con la presión
  if (pos === 0 && sc.kind !== 'shop' && !breath) {
    const [root, fifth] = CHORDS[bar];
    const dur = STEP * 8 * 0.97;
    const loud = sc.boss ? 1.25 : battle ? 0.45 + 0.8 * p : 0.55;
    for (const [n, vol] of [[root, 0.075], [fifth, 0.045]] as [string, number][]) {
      note(out, F[n] * k, t, dur, { type: 'sawtooth', vol: vol * loud, attack: 0.45, cutoff: sc.boss ? 460 : 380, detune: -7 });
      note(out, F[n] * k, t, dur, { type: 'sawtooth', vol: vol * loud, attack: 0.45, cutoff: sc.boss ? 460 : 380, detune: 7 });
    }
  }
  // bajo de laúd a contratiempo: en la ferretería siempre; en la obra, mientras se piensa con calma
  if ((sc.kind === 'shop' || breath || (battle && p < 0.45)) && (pos === 0 || pos === 3 || pos === 6)) note(out, F[CHORDS[bar][pos === 0 ? 0 : 1]] * k, t, 0.7, { type: 'triangle', vol: sc.kind === 'shop' ? 0.11 : 0.08, cutoff: 900 });
  // melodía: el laúd entra en la segunda vuelta, y respira
  if (index === 0 && !sc.boss && sc.kind === 'battle') return;
  if (breath || loop.rest[bar]) return;
  const n = loop.phrase[s % 64];
  if (n === '.') return;
  const f = F[n] * k * (loop.low[bar] ? 0.5 : 1);
  const bright = sc.kind === 'shop' ? 2600 : 1300 + 500 * p;
  const touch = 0.85 + 0.3 * Math.abs(Math.sin(s * 2.3)); // pulsación humana
  note(out, f, t, 1.1, { type: 'triangle', vol: 0.115 * touch, cutoff: bright }); // laúd
  note(out, f / 2, t, 0.9, { type: 'triangle', vol: 0.05, cutoff: 900 });
  if (loop.echo) note(out, f, t + STEP * 2, 0.8, { type: 'triangle', vol: 0.04, cutoff: 1100 });
  if (sc.kind === 'shop') note(out, f * 2, t, 0.35, { type: 'sine', vol: 0.03 }); // un punteo agudo, de mercado
  // coro de monjes: solo cuando la obra aprieta (o hay jefe); la misma línea, una octava abajo
  if (sc.kind !== 'shop' && (sc.boss || p > 0.55 || (sc.kind === 'menu' && index % 2 === 1))) {
    const amt = sc.kind === 'menu' ? 0.7 : Math.min(1, 0.5 + p * 0.6);
    note(out, f / 2, t, STEP * 2.6, { type: 'sawtooth', vol: 0.035 * amt, attack: 0.18, cutoff: 520, vibrato: 2.5, detune: -5 });
    note(out, f / 2, t, STEP * 2.6, { type: 'sine', vol: 0.06 * amt, attack: 0.18, vibrato: 2.5, detune: 5 });
  }
}

const DRONE = [36.71, 73.42, 110];
/** Transportes de las 8 obras: ninguna suena en el mismo tono que la anterior. */
const STAGE_SHIFT = [0, 2, -2, 3, 5, -3, 7, 0];
const STAGE_DRUMS = [D_SLOW, D_MARCH, D_MARCH, D_GALLOP, D_MARCH, D_GALLOP, D_WAR, D_WAR];

/** Cambia la escena musical: 'menu' (portada, gremio, sala), 'shop' (campaña entre obras) o 'battle'. */
export function setScene(kind: Scene['kind'], stage = 3, boss = false): void {
  const i = Math.max(0, Math.min(7, stage - 1));
  const next: Scene =
    kind === 'menu'
      ? { kind, bpm: 66, shift: 0, drums: D_SLOW, lead: 'a', boss: false }
      : kind === 'shop'
        ? { kind, bpm: 86, shift: 5, drums: D_SHOP, lead: 'b', boss: false }
        : { kind, bpm: 72 + i * 3 + (boss ? 6 : 0), shift: STAGE_SHIFT[i], drums: boss ? D_WAR : STAGE_DRUMS[i], lead: i % 2 ? 'b' : 'a', boss };
  if (next.kind === scene.kind && next.bpm === scene.bpm && next.shift === scene.shift && next.boss === scene.boss) return;
  scene = next;
  step = 0; // la escena nueva entra por su principio
  if (ctx) drone.forEach((o, n) => o.frequency.setTargetAtTime(DRONE[n] * tr(), ctx!.currentTime, 0.6));
}

function startLoop(): void {
  const a = ac();
  if (!a || !musicBus || timer !== null) return;
  musicBus.gain.cancelScheduledValues(a.currentTime);
  musicBus.gain.setTargetAtTime(0.6 * gainOf(volume.music), a.currentTime, 0.8);
  // bordón de quinta: re + la
  drone = DRONE.map((base, i) => {
    const f = base * tr();
    const o = a.createOscillator();
    const lp = a.createBiquadFilter();
    const g = a.createGain();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = i * 4 - 4;
    lp.type = 'lowpass';
    lp.frequency.value = 210;
    g.gain.value = i === 0 ? 0.09 : i === 1 ? 0.06 : 0.03;
    o.connect(lp).connect(g).connect(musicBus!);
    o.start();
    return o;
  });
  step = 0;
  nextTime = a.currentTime + 0.15;
  // Se programa con 1,6 s de margen: los navegadores frenan los temporizadores en segundo plano.
  const tick = () => {
    while (nextTime < a.currentTime + 1.6) {
      schedule(nextTime, step++);
      nextTime += stepLen();
    }
  };
  tick();
  timer = window.setInterval(tick, 200);
}

function stopLoop(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  if (ctx && musicBus) musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  const old = drone;
  drone = [];
  setTimeout(() => old.forEach((o) => o.stop()), 900);
}

/** Llamar tras un gesto del usuario (los navegadores bloquean el audio hasta entonces). */
export function startMusic(): void {
  if (volume.music > 0) startLoop();
}

/**
 * Presión de la obra, de 0 a 1. Con calma suenan el bordón, un latido y el laúd; al subir entran
 * el ritmo de tambor, las cadenas, los cuernos y el coro, y por encima de 0,7 los tambores redoblan.
 */
export function setPressure(level: number): void {
  pressure = clamp01(level);
}
