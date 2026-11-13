// Sonido del juego: todo sintetizado con WebAudio (sin archivos ni dependencias).
// V8 · La partitura sale del generador puro (audio-frases.ts): de (semilla, escena, asalto, compás) sale cada
// compás, y aquí solo se toca. Los efectos repetidos varían tono, ataque y panorama con ese mismo azar
// sembrado (variacion), así qa:audio mide exactamente lo que suena. La semilla vive solo en este cliente.
// Efectos de piedra, hierro y cuerno de guerra, y una marcha en re menor armónico (bordón grave,
// tambores, laúd, coro, cuernos y campana) que nunca suena dos veces igual: cada vuelta varía la
// melodía y entran o callan instrumentos según la presión de la obra.
//
// Mezcla pensada para sesiones largas:
//   efectos ─┐                       ┌─ sala de hormigón (reverberación corta y oscura)
//   música ──┴─► máster ─► estante de agudos (−5 dB) ─► compresor ─► salida
//
// Acierto y fallo se distinguen sin mirar: el golpe limpio resuelve hacia arriba (campana y dos notas
// que suben), el piso que cae sin limpio se queda en un golpe sordo que baja, la jugada inválida son
// dos toques de madera hacia abajo, la sirena que el muro frena entera es piedra contra piedra con un
// respiro que sube, y la que entra es hierro, un cuerno que se desploma y cascotes. Lo que se repite
// (elegir carta, mover el foco) nunca suena dos veces igual: cambia unos cents, el ataque y la nota.
import { PAN, campana, compas, flujo, mezcla, variacion, type Escena, type Evento, type Voz } from './audio-frases';
import { loadJson, platform, saveJson } from './platform';

/** La semilla de la música y de las variaciones: una por sesión (con ?qa, siempre 1). */
const QA = new URLSearchParams(location.search).has('qa');
const SEMILLA = QA ? 1 : crypto.getRandomValues(new Uint32Array(1))[0] || 1;
/** Azar sembrado para los detalles internos de cada efecto (nada de Math.random en lo que suena). */
const azar = flujo(mezcla(SEMILLA, 77));
/** Cuántas veces ha sonado cada efecto: la vez n pide su variación al generador. */
const vez: Record<string, number> = {};
const vario = (efecto: string) => variacion(SEMILLA, efecto, (vez[efecto] = (vez[efecto] ?? 0) + 1));
const cents = (c: number) => 2 ** (c / 1200);

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
  if (timer !== null) musicBus?.gain.setTargetAtTime(MUSIC_GAIN * gainOf(volume.music), t, 0.1);
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
      // sala de piedra: cola corta, primeras reflexiones marcadas y agudos apagados
      const len = Math.floor(ctx.sampleRate * 2.3);
      const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const white = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
          last = last * 0.72 + white * 0.28; // paso bajo de un polo: la piedra se come los agudos
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

function fx(play: (a: AudioContext, out: AudioNode, t: number) => void, pan = 0): void {
  if (volume.sfx <= 0 || document.hidden) return;
  const a = ac();
  if (!a || !sfxBus) return;
  let out: AudioNode = sfxBus;
  if (pan) {
    const p = a.createStereoPanner();
    p.pan.value = pan;
    p.connect(sfxBus);
    out = p;
  }
  play(a, out, a.currentTime + 0.01);
}

const horn = (out: AudioNode, f: number, t: number, dur: number, vol: number, slide?: number) => {
  note(out, f, t, dur, { type: 'sawtooth', vol, attack: 0.09, cutoff: 900, detune: -7, slide });
  note(out, f, t, dur, { type: 'sawtooth', vol, attack: 0.09, cutoff: 900, detune: 7, slide });
  note(out, f / 2, t, dur, { type: 'square', vol: vol * 0.5, attack: 0.12, cutoff: 500, slide: slide ? slide / 2 : undefined });
};

/** Semitonos → factor de frecuencia. */
const semi = (n: number) => 2 ** (n / 12);
/** Desafinación leve (± cents) para lo que se repite: ningún toque sale idéntico al anterior. */
const drift = (c = 12) => 2 ** (((azar() * 2 - 1) * c) / 1200);
/** Entre 1 − a y 1 + a: para variar un poco el volumen o el ataque. */
const sway = (a = 0.12) => 1 + (azar() * 2 - 1) * a;
/** Re menor pentatónico: cada carta que se suma a la selección sube un peldaño. */
const PENTA = [0, 3, 5, 7, 10, 12, 15];
/** Tres alturas para el paso del foco; se van turnando para no repetir la misma dos veces. */
const STEP_TONES = [0, -2, 3];
let stepTone = 0;

/**
 * V7 · motivo de cada monarca: notas [semitonos sobre re3, duración] cada `gap` segundos. Al caer se
 * toca del revés y más grave. Todos caben en 2 s (con el golpe sordo del final).
 */
interface Motif {
  notes: [number, number][];
  gap: number;
  type: OscillatorType;
  vol: number;
  attack: number;
  cutoff?: number;
  vibrato?: number;
  octave?: boolean;
  /** frecuencia de un golpe de ruido con cada nota (monedas, engranaje) */
  knock?: number;
}
const MOTIF: Record<string, Motif> = {
  // Dos Caras: la misma frase arriba y abajo, como un naipe que se da vuelta
  doble: { notes: [[12, 0.18], [7, 0.18], [12, 0.18], [0, 0.18], [5, 0.18], [0, 0.3]], gap: 0.17, type: 'triangle', vol: 0.09, attack: 0.004, cutoff: 1800 },
  // El Usurero: monedas contadas de una en una, cada vez menos
  escasez: { notes: [[19, 0.1], [17, 0.1], [15, 0.1], [12, 0.3]], gap: 0.24, type: 'sine', vol: 0.07, attack: 0.002, octave: true, knock: 3200 },
  // La Dama del Cáliz: un brindis lento que se derrama
  sequia: { notes: [[7, 0.5], [8, 0.4], [3, 0.7]], gap: 0.38, type: 'sine', vol: 0.09, attack: 0.08, vibrato: 3 },
  // La Reina Helada: carámbanos agudos, de vidrio fino
  intemperie: { notes: [[24, 0.25], [27, 0.25], [22, 0.25], [31, 0.45]], gap: 0.2, type: 'sine', vol: 0.05, attack: 0.002, octave: true },
  // El Inquisidor: un órgano de capilla, tres acordes de quinta
  blindaje: { notes: [[0, 0.45], [7, 0.45], [1, 0.6]], gap: 0.36, type: 'square', vol: 0.045, attack: 0.05, cutoff: 900 },
  // El Verdugo: tambor y cuerno, dos golpes y el hachazo
  furia: { notes: [[-5, 0.16], [-5, 0.16], [0, 0.5]], gap: 0.26, type: 'sawtooth', vol: 0.06, attack: 0.01, cutoff: 700, knock: 180 },
  // El Relojero: tic, tac, cada vez más rápido... y la campanada
  inestable: { notes: [[12, 0.05], [7, 0.05], [12, 0.05], [7, 0.05], [12, 0.05], [19, 0.4]], gap: 0.15, type: 'triangle', vol: 0.06, attack: 0.001, cutoff: 2400, knock: 2400 },
};

/** Lo último que ha sonado (nombres de efecto). Solo lo lee la prueba de humo, con ?qa. */
const heard: string[] = [];
function logged<T extends object>(raw: T): T {
  const table = raw as Record<string, (...args: unknown[]) => void>;
  for (const name of Object.keys(table)) {
    const play = table[name];
    table[name] = (...args: unknown[]) => {
      heard.push(name);
      if (heard.length > 240) heard.shift();
      play(...args);
    };
  }
  return raw;
}

export const sfx = logged({
  /** campanilla de la cuenta: cada activación sube un semitono (2^(n/12)) */
  tick: (n: number) =>
    fx((_, o, t) => {
      const f = 392 * semi(Math.min(n, 30));
      note(o, f, t, 0.16, { type: 'triangle', vol: 0.11 });
      note(o, f * 2, t, 0.09, { type: 'sine', vol: 0.04 });
    }),
  /** naipe que sale de la mano */
  flick: () => {
    const v = vario('flick');
    fx((_, o, t) => {
      noise(o, t, 0.05, 0.16, 'highpass', 3400 * cents(v.cents));
      note(o, 900 * cents(v.cents), t, 0.05, { type: 'triangle', vol: 0.03, slide: 420, attack: v.ataque });
    }, v.pan);
  },
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
  coins: (n: number) => {
    const v = vario('coins');
    fx((_, o, t) => {
      for (let i = 0; i < Math.min(10, Math.max(2, n)); i++) {
        const at = t + i * 0.055 + azar() * 0.02;
        // cada moneda que cae: canto agudo y un rebote más grave, en re menor (la, re, fa)
        const f = [1760, 2349.3, 2793.8, 3520][Math.floor(azar() * 4)] * cents(v.cents);
        note(o, f, at, 0.14, { type: 'sine', vol: 0.05, attack: v.ataque });
        note(o, f * 0.749, at + 0.03, 0.08, { type: 'triangle', vol: 0.015, attack: 0.002 });
        noise(o, at, 0.02, 0.05, 'highpass', 5000);
      }
    }, v.pan);
  },
  /**
   * Golpe exacto: campana de capilla, breve. Parciales de campana de iglesia (zumbido, fundamental,
   * tercera menor, quinta, nominal) y, como firma del acierto, una quinta que sube. Cada vez un pelo
   * desafinada para que una racha de exactos no suene a la misma grabación.
   */
  bell: (cadena = 1) => {
    // V8: un semitono más por cada Golpe exacto seguido (tope +7); la cadena la cuenta fx.ts
    const v = vario('bell');
    const f = 698.46 * semi(campana(cadena)) * cents(v.cents);
    fx((_, o, t) => {
      [[0.5, 0.9, 0.05], [1, 0.75, 0.12], [1.19, 0.55, 0.06], [1.5, 0.45, 0.045], [2, 0.38, 0.05], [2.66, 0.2, 0.018]].forEach(([m, d, vol]) =>
        note(o, f * m, t, d, { type: 'sine', vol: vol * sway(0.1), attack: v.ataque }),
      );
      noise(o, t, 0.02, 0.1, 'highpass', 3600);
      note(o, f * 1.5, t + 0.12, 0.38, { type: 'sine', vol: 0.06 });
      note(o, f * 2, t + 0.12, 0.2, { type: 'triangle', vol: 0.015 });
    }, v.pan);
  },
  /** varios guardias a la vez: el suelo de la sala retumba */
  rumble: (floors: number) =>
    fx((_, o, t) => {
      const dur = 0.9 + 0.35 * Math.min(4, floors);
      noise(o, t, dur, 0.6, 'lowpass', 180);
      note(o, 52, t, dur, { type: 'sine', vol: 0.55, slide: 30 });
      for (let i = 0; i < 6 + floors * 3; i++) noise(o, t + azar() * dur, 0.08, 0.2, 'bandpass', 300 + azar() * 900);
    }),
  /**
   * cuerda pulsada breve. `n` es cuántas cartas quedan elegidas: cada una sube un peldaño de la escala,
   * así un trío suena a tres notas y no a la misma tres veces. Al soltar una carta (`on` = false) la
   * cuerda baja y se apaga antes.
   */
  select: (n = 1, on = true) =>
    fx((_, o, t) => {
      const f = 587.33 * semi(PENTA[Math.max(0, Math.min(PENTA.length - 1, on ? n - 1 : n))]) * drift(9);
      if (on) {
        note(o, f, t, 0.13 * sway(), { vol: 0.05 * sway(), attack: 0.003 + azar() * 0.006 });
        note(o, f * 2, t, 0.05, { type: 'sine', vol: 0.012 });
      } else note(o, f, t, 0.1, { vol: 0.04 * sway(), attack: 0.004, slide: f * 0.84, cutoff: 1500 });
    }),
  /**
   * paso del foco (flechas, cruceta o palanca): un toque de latón muy corto y muy bajo. Sube un poco
   * hacia la derecha o hacia arriba y baja hacia el otro lado, y va turnando tres alturas.
   */
  focus: (dx = 0, dy = 0) =>
    fx((_, o, t) => {
      stepTone = (stepTone + 1 + Math.floor(azar() * 2)) % STEP_TONES.length;
      const f = 1046.5 * semi(STEP_TONES[stepTone] + (dx - dy) * 2) * drift(10);
      note(o, f, t, 0.035, { type: 'triangle', vol: 0.026 * sway(0.2), attack: 0.002 + azar() * 0.003 });
      noise(o, t, 0.012, 0.018, 'highpass', 5200);
    }),
  /** el foco no tiene adónde ir por ese lado: un toque apagado, sin nota */
  edge: () => fx((_, o, t) => noise(o, t, 0.04, 0.07 * sway(0.2), 'lowpass', 420 * drift(80))),
  /** jugada inválida: dos toques de madera que bajan. Nunca se confunde con un acierto */
  deny: () =>
    fx((_, o, t) => {
      const k = drift(18);
      note(o, 196 * k, t, 0.07, { type: 'square', vol: 0.07, cutoff: 720, slide: 150 * k });
      note(o, 147 * k, t + 0.09, 0.12, { type: 'square', vol: 0.08, cutoff: 620, slide: 104 * k });
      noise(o, t, 0.03, 0.09, 'lowpass', 520);
    }),
  /** tiza sobre la pizarra (susurros): dos trazos cortos y un punto, cada vez con otra mano */
  chalk: () =>
    fx((_, o, t) => {
      const k = drift(140);
      noise(o, t, 0.07, 0.1, 'bandpass', 2400 * k);
      noise(o, t + 0.09, 0.09, 0.12, 'bandpass', 1900 * k);
      noise(o, t + 0.21, 0.025, 0.09, 'bandpass', 3100 * k);
    }),
  /** pergamino */
  card: () => fx((_, o, t) => noise(o, t, 0.07, 0.12, 'highpass', 2600)),
  /** mazo contra piedra, con el canto del hierro */
  hit: () => {
    const v = vario('hit');
    const k = cents(v.cents);
    fx((_, o, t) => {
      noise(o, t, 0.2, 0.5, 'lowpass', 700 * k);
      note(o, 120 * k, t, 0.25, { type: 'sine', vol: 0.4, slide: 46, attack: v.ataque });
      [1, 2.76, 5.4].forEach((m, i) => note(o, 330 * k * m, t, 0.35 - i * 0.08, { type: 'sine', vol: 0.05 / (i + 1), attack: v.ataque }));
    }, v.pan);
  },
  /** V8 · tajo de hoja (el naipe partido en diagonal): el filo que silba y corta, y el papel que se abre */
  slash: () => {
    const v = vario('slash');
    const k = cents(v.cents);
    fx((a, o, t) => {
      const air = a.createBiquadFilter();
      air.type = 'bandpass';
      air.Q.value = 1.4;
      air.frequency.setValueAtTime(6200 * k, t);
      air.frequency.exponentialRampToValueAtTime(1800 * k, t + 0.13);
      air.connect(o);
      noise(air, t, 0.16, 0.42, 'highpass', 900);
      [1, 2.41, 3.73].forEach((m, i) => note(o, 1318.5 * k * m, t + 0.05, 0.22 - i * 0.05, { type: 'sine', vol: 0.03 / (i + 1), attack: v.ataque }));
      noise(o, t + 0.07, 0.09, 0.14, 'bandpass', 2600 * k);
    }, v.pan);
  },
  /** V8 · una carta que se desliza a La Manga: roce de papel contra la tela y un toque al quedar guardada */
  stash: (back = false) => {
    const v = vario('stash');
    const k = cents(v.cents);
    fx((a, o, t) => {
      const cloth = a.createBiquadFilter();
      cloth.type = 'bandpass';
      cloth.Q.value = 0.8;
      cloth.frequency.setValueAtTime(2400 * k, t);
      cloth.frequency.exponentialRampToValueAtTime(700 * k, t + 0.2);
      cloth.connect(o);
      noise(cloth, t, 0.22, 0.24, 'highpass', 400);
      note(o, (back ? 392 : 293.66) * k, t + 0.2, 0.09, { type: 'triangle', vol: 0.04, cutoff: 1500, attack: v.ataque });
      if (back) note(o, 293.66 * k, t + 0.27, 0.1, { type: 'triangle', vol: 0.035, cutoff: 1400 });
    }, v.pan);
  },
  /** V8 · sello de lacre caliente: la prensa que aplasta, el siseo de la cera y el lacre que se asienta */
  seal: () => {
    const v = vario('seal');
    const k = cents(v.cents);
    fx((_, o, t) => {
      note(o, 130 * k, t, 0.16, { type: 'sine', vol: 0.42, slide: 58, attack: v.ataque });
      noise(o, t, 0.06, 0.24, 'lowpass', 800);
      noise(o, t + 0.04, 0.34, 0.06, 'highpass', 5200 * k); // la cera que sisea
      noise(o, t + 0.12, 0.1, 0.07, 'bandpass', 620 * k);
    }, v.pan);
  },
  /** V8 · la lámina que brilla al cruzar la carta (un acabado en la cuenta): tres parciales finos que suben */
  foil: () => {
    const v = vario('foil');
    const k = cents(v.cents);
    fx((_, o, t) => {
      [2349.3, 2793.8, 3520].forEach((f, i) => note(o, f * k, t + i * 0.045, 0.18, { type: 'sine', vol: 0.014, attack: v.ataque + 0.004 }));
    }, v.pan);
  },
  /**
   * Guardia abatido: un estandarte que cae. Tela que azota el aire (ruido que barre de agudo a grave),
   * el asta que golpea la losa y un roce final. Con `clean` = true se recoge pronto para dejar sitio a
   * la campana; con false (cae, pero habrá Contraataque) el asta rebota una vez más. Sin argumento es el
   * Mazo agotado: piedra que retumba y cascotes, más pesado.
   */
  crash: (clean?: boolean) =>
    fx((a, o, t) => {
      if (clean === undefined) {
        noise(o, t, 1.3, 0.7, 'lowpass', 320);
        note(o, 80, t, 1.1, { type: 'sine', vol: 0.5, slide: 28 });
        for (let i = 0; i < 9; i++) noise(o, t + 0.12 + azar() * 0.8, 0.07, 0.25, 'bandpass', 500 + azar() * 1800);
        return;
      }
      // la tela: un paso de banda que baja de 2,6 kHz a 500 Hz mientras dura el azote
      const k = drift(60);
      const cloth = a.createBiquadFilter();
      cloth.type = 'bandpass';
      cloth.Q.value = 0.9;
      cloth.frequency.setValueAtTime(2600 * k, t);
      cloth.frequency.exponentialRampToValueAtTime(500 * k, t + 0.42);
      cloth.connect(o);
      noise(cloth, t, 0.46, 0.5 * sway(), 'highpass', 300);
      noise(cloth, t + 0.08, 0.3, 0.3 * sway(), 'highpass', 600);
      // el asta contra la losa: madera, seca
      const at = t + 0.36 + azar() * 0.04;
      note(o, 140 * k, at, 0.16, { type: 'sine', vol: 0.42, slide: 70 });
      noise(o, at, 0.05, 0.22, 'bandpass', 900 * k);
      note(o, 420 * k, at, 0.05, { type: 'triangle', vol: 0.05, cutoff: 1400 });
      if (clean === false) {
        note(o, 120 * k, at + 0.17, 0.12, { type: 'sine', vol: 0.2, slide: 66 });
        noise(o, at + 0.17, 0.04, 0.1, 'bandpass', 800);
        noise(o, at + 0.24, 0.5, 0.08, 'lowpass', 900);
      } else noise(o, at + 0.08, 0.22, 0.05, 'lowpass', 1200);
    }),
  /**
   * Trono caído: la corona que se parte. Primero el metal (parciales inarmónicos que se quiebran y
   * bajan), luego la piedra del trono (golpe grave, grieta y cascotes). Suena una vez por trono.
   */
  crownBreak: () =>
    fx((_, o, t) => {
      const k = drift(25);
      [1, 2.76, 4.07, 5.4, 6.8].forEach((m, i) => note(o, 880 * k * m, t, 0.5 - i * 0.07, { type: 'sine', vol: 0.06 / (i + 1), attack: 0.001, slide: 880 * k * m * 0.94 }));
      noise(o, t, 0.05, 0.3, 'highpass', 4200);
      noise(o, t + 0.07, 0.03, 0.2, 'highpass', 3000);
      note(o, 1320 * k, t + 0.07, 0.18, { type: 'square', vol: 0.02, cutoff: 2600, slide: 990 * k });
      const st = t + 0.16;
      note(o, 70, st, 0.9, { type: 'sine', vol: 0.5, slide: 34 });
      noise(o, st, 0.8, 0.5, 'lowpass', 300);
      noise(o, st + 0.02, 0.12, 0.22, 'bandpass', 1500 * k);
      for (let i = 0; i < 7; i++) noise(o, st + 0.15 + azar() * 0.7, 0.06, 0.16, 'bandpass', 600 + azar() * 1600);
    }),
  /** Motín: redoble de tambor que acelera y remata con un golpe, como quien llama a la revuelta */
  mutiny: () =>
    fx((_, o, t) => {
      let at = t;
      for (let i = 0; i < 12; i++) {
        const v = (0.08 + i * 0.012) * sway(0.15);
        noise(o, at, 0.05, v, 'bandpass', 1900 * drift(80));
        note(o, 210 * drift(30), at, 0.04, { type: 'triangle', vol: v * 0.4, cutoff: 900 });
        at += Math.max(0.035, 0.075 - i * 0.004);
      }
      noise(o, at, 0.16, 0.34, 'bandpass', 1600);
      note(o, 98, at, 0.3, { type: 'sine', vol: 0.45, slide: 52 });
    }),
  /**
   * Aviso de Contraataque (y entrada de un monarca): dos golpes de tambor de guardia y el acero que
   * sale de la vaina. Cada vez el parche suena un poco distinto. (El nombre «siren» es interno.)
   */
  siren: () =>
    fx((_, o, t) => {
      const k = drift(30);
      [0, 0.2].forEach((d, i) => {
        note(o, (i ? 98 : 110) * k, t + d, 0.32, { type: 'sine', vol: 0.42 * sway(0.1), slide: 62 * k, attack: 0.002 });
        noise(o, t + d, 0.09, 0.22, 'lowpass', 700);
        noise(o, t + d, 0.03, 0.1, 'bandpass', 2200);
      });
      // la hoja que sale: un roce que sube con un canto metálico
      noise(o, t + 0.42, 0.34, 0.1, 'highpass', 5200);
      [1, 2.4, 3.9].forEach((m, i) => note(o, 1480 * k * m, t + 0.46, 0.4 - i * 0.08, { type: 'sine', vol: 0.025 / (i + 1), attack: 0.06 }));
    }),
  /**
   * El Contraataque llega. Si tu Escudo lo frena entero, espada contra escudo: el canto del acero sobre
   * la madera reforzada y dos notas que suben (un respiro). Si entra, un golpe sordo, más grave y más
   * largo cuanto más Vida quita. Frenado a medias suena a las dos cosas: primero el escudo, luego el golpe.
   */
  sirenLand: (taken: number, blocked = 0): void => (taken > 0 ? sfx.sirenHit(taken, blocked) : sfx.sirenBlocked()),
  sirenBlocked: () => {
    const v = vario('sirenBlocked');
    fx((_, o, t) => {
      const k = cents(v.cents);
      // acero: parciales inarmónicos cortos, de ataque instantáneo
      [1, 2.32, 3.86, 5.1].forEach((m, i) => note(o, 740 * k * m, t, 0.42 - i * 0.08, { type: 'sine', vol: 0.07 / (i + 1), attack: 0.001 }));
      noise(o, t, 0.04, 0.26, 'highpass', 3800);
      // el escudo: madera que encaja el golpe
      note(o, 180 * k, t, 0.12, { type: 'sine', vol: 0.3, slide: 120 });
      noise(o, t, 0.07, 0.2, 'bandpass', 700);
      note(o, 392 * k, t + 0.2, 0.16, { type: 'triangle', vol: 0.05, cutoff: 1600, attack: v.ataque });
      note(o, 523.25 * k, t + 0.32, 0.3, { type: 'triangle', vol: 0.06, cutoff: 1800, attack: v.ataque });
    }, v.pan);
  },
  sirenHit: (taken: number, blocked = 0) =>
    fx((_, o, t) => {
      const power = Math.max(0.35, Math.min(1, taken / 7));
      const k = drift(25);
      let at = t;
      if (blocked > 0) {
        // el escudo para una parte: un canto de acero más corto antes de ceder
        [1, 2.32, 3.86].forEach((m, i) => note(o, 740 * k * m, t, 0.2 - i * 0.04, { type: 'sine', vol: 0.05 / (i + 1), attack: 0.001 }));
        note(o, 170 * k, t, 0.09, { type: 'sine', vol: 0.22, slide: 110 });
        at = t + 0.11;
      }
      // golpe sordo: cuerpo grave, sin brillo, y un eco de cuero
      note(o, 92 * k, at, 0.3 + 0.25 * power, { type: 'sine', vol: 0.4 + 0.22 * power, slide: 40, attack: 0.003 });
      noise(o, at, 0.18 + 0.12 * power, 0.35 + 0.25 * power, 'lowpass', 380);
      note(o, 61 * k, at + 0.02, 0.4 + 0.3 * power, { type: 'sine', vol: 0.2 * power, slide: 34 });
      noise(o, at + 0.12, 0.2, 0.08 * power, 'bandpass', 500);
    }),
  /**
   * una reliquia de defensa se cobra: breve y con voz propia.
   * Daño: dos martillazos que suben · golpe a un trono: un latigazo · cura: dos notas templadas ·
   * carga: un resorte que se tensa.
   */
  proc: (what: 'fuerza' | 'dano' | 'repara' | 'carga' = 'fuerza') =>
    fx((_, o, t) => {
      const k = drift(10);
      if (what === 'fuerza') {
        noise(o, t, 0.02, 0.14, 'highpass', 3000);
        note(o, 659.25 * k, t, 0.14, { type: 'triangle', vol: 0.1 });
        note(o, 987.77 * k, t + 0.07, 0.2, { type: 'triangle', vol: 0.11 });
        note(o, 1975.5 * k, t + 0.07, 0.1, { type: 'sine', vol: 0.03 });
      } else if (what === 'dano') {
        noise(o, t, 0.05, 0.26, 'highpass', 2500);
        note(o, 520 * k, t, 0.1, { type: 'square', vol: 0.08, cutoff: 1800, slide: 170 });
        note(o, 110, t + 0.03, 0.14, { type: 'sine', vol: 0.26, slide: 60 });
      } else if (what === 'repara') {
        noise(o, t, 0.05, 0.12, 'bandpass', 1100);
        note(o, 329.63 * k, t, 0.15, { type: 'triangle', vol: 0.1, cutoff: 1500 });
        note(o, 440 * k, t + 0.08, 0.24, { type: 'triangle', vol: 0.1, cutoff: 1700 });
      } else {
        note(o, 220 * k, t, 0.2, { type: 'sine', vol: 0.12, slide: 660 * k });
        note(o, 880 * k, t + 0.17, 0.08, { type: 'triangle', vol: 0.05 });
      }
    }),
  /** monedas sobre el mostrador */
  coin: () =>
    fx((_, o, t) => {
      note(o, 1568, t, 0.18, { type: 'sine', vol: 0.09 });
      note(o, 2093, t + 0.07, 0.3, { type: 'sine', vol: 0.09 });
      note(o, 3136, t + 0.07, 0.16, { type: 'triangle', vol: 0.03 });
    }),
  /** el Tratante gruñe: dos o tres sílabas graves */
  grunt: () =>
    fx((a, o, t) => {
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 520 + azar() * 260;
      f.Q.value = 3.5;
      f.connect(o);
      const base = 92 + azar() * 34;
      const n = 2 + Math.floor(azar() * 2);
      for (let i = 0; i < n; i++) note(f, base * (1 + (azar() - 0.5) * 0.24), t + i * 0.15, 0.13, { type: 'sawtooth', vol: 0.5, attack: 0.02, slide: base * 0.8 });
    }),
  /** piedra sobre piedra */
  build: () =>
    fx((_, o, t) => {
      note(o, 190, t, 0.12, { type: 'sine', vol: 0.3, slide: 110 });
      noise(o, t, 0.06, 0.25, 'bandpass', 1200);
    }),
  /**
   * V7 · firma de un monarca (≤ 2 s, por el bus de efectos): su motivo al entrar y, al caer, el mismo
   * motivo vuelto del revés, más grave y que se deshace. Cada uno con su timbre; nada de archivos.
   */
  monarch: (id: string, mood: 'entrada' | 'caida' = 'entrada') => {
    heard.push(`monarch:${id}:${mood}`);
    fx((_, o, t) => {
      const fall = mood === 'caida';
      const m = MOTIF[id] ?? MOTIF.doble;
      const k = (fall ? 0.84 : 1) * drift(8);
      const notes = fall ? [...m.notes].reverse() : m.notes;
      notes.forEach(([n, d], i) => {
        const f = 146.83 * semi(n) * k;
        const at = t + i * m.gap;
        const len = d * (fall ? 1.25 : 1);
        note(o, f, at, len, { type: m.type, vol: m.vol * sway(0.08), attack: m.attack, cutoff: m.cutoff, slide: fall && i === notes.length - 1 ? f * 0.7 : undefined, vibrato: m.vibrato });
        if (m.octave) note(o, f * 2, at, len * 0.6, { type: 'sine', vol: m.vol * 0.25, attack: m.attack });
      });
      if (m.knock) notes.forEach((_, i) => noise(o, t + i * m.gap, 0.04, 0.12, 'bandpass', m.knock! * k));
      // el golpe sordo del final: al entrar, un paso firme; al caer, el cuerpo contra el suelo
      note(o, fall ? 62 : 82, t + notes.length * m.gap * (fall ? 1 : 0.2), fall ? 0.6 : 0.3, { type: 'sine', vol: fall ? 0.4 : 0.25, slide: fall ? 34 : 50 });
    });
  },
  /** V7 · un naipe que se da vuelta: cada opción de un Secreto de la cripta al revelarse (sube un peldaño cada una) */
  reveal: (i = 0) =>
    fx((_, o, t) => {
      noise(o, t, 0.05, 0.16 * sway(0.2), 'bandpass', 1900 * drift(60));
      note(o, 220 * semi(PENTA[Math.min(i, PENTA.length - 1)]) * drift(10), t + 0.01, 0.12, { type: 'triangle', vol: 0.06 * sway(), attack: 0.002 + azar() * 0.004, cutoff: 1600 });
    }),
  /** V7 · paso de la partida guiada cumplido: dos trazos que suben (distinto del error, que baja) */
  learnt: () =>
    fx((_, o, t) => {
      note(o, 587.33 * drift(), t, 0.12, { type: 'triangle', vol: 0.07, cutoff: 2000 });
      note(o, 880 * drift(), t + 0.09, 0.2, { type: 'triangle', vol: 0.07, cutoff: 2200 });
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
});
// la prueba de humo comprueba de oído: con ?qa, lo que ha sonado queda a la vista (solo nombres)
// (y __qaSfx deja tocar cada efecto a mano, para comprobar que se sintetiza sin errores)
if (new URLSearchParams(location.search).has('qa')) Object.assign(window, { __qaSounds: heard, __qaSfx: sfx });

// ───────────────────────── Música ─────────────────────────

/** La música va por debajo de los efectos (y los ajustes de volumen y silencio siguen mandando). */
const MUSIC_GAIN = 0.55;
/** Dónde suena la música: portada, Mapa del castillo, La Taberna o la mesa (con su asalto y su monarca). */
interface Scene {
  kind: Escena;
  stage: number;
  boss: boolean;
}
let scene: Scene = { kind: 'menu', stage: 1, boss: false };
/** La escena siguiente entra al acabar el compás que suena: transiciones de una frase, sin cortes. */
let pending: Scene | null = null;
let timer: number | null = null;
/** Compás global: no se reinicia nunca en la sesión, así el generador nunca da dos veces el mismo. */
let bar = 0;
let sceneStart = 0;
let nextTime = 0;
let drone: OscillatorNode[] = [];
/** Presión de la mesa, de 0 (pensando con calma) a 1 (la Vida se acaba): decide qué capas suenan. */
let pressure = 0.3;
let pressureNow = 0.3;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/** Un panoramizador por voz (el panorama de cada voz lo fija el generador). */
const voiceBus: Partial<Record<Voz, AudioNode>> = {};
function voiceOut(v: Voz): AudioNode {
  let n = voiceBus[v];
  if (!n) {
    const p = ctx!.createStereoPanner();
    p.pan.value = PAN[v];
    p.connect(musicBus!);
    n = voiceBus[v] = p;
  }
  return n;
}

/** Toca un evento de la partitura. Solo se le añade el drift de afinación sembrado (que qa:audio ignora). */
function play(e: Evento, t: number, sx: number, kind: Escena): void {
  const o = voiceOut(e.voz);
  const f = hz(e.nota) * drift(4);
  const d = e.dur * sx;
  const v = e.vel;
  switch (e.voz) {
    case 'tambor':
      note(o, f, t, 0.6, { type: 'sine', vol: 0.6 * v, slide: 30, attack: e.ataque });
      noise(o, t, 0.14, 0.22 * v, 'lowpass', 170);
      break;
    case 'guerra':
      // tambor de guerra: parche grave y largo, con el chasquido de la baqueta
      note(o, f, t, 0.5, { type: 'sine', vol: 0.5 * v, slide: f * 0.55, attack: e.ataque });
      noise(o, t, 0.2, 0.28 * v, 'lowpass', 260);
      noise(o, t, 0.04, 0.07 * v, 'bandpass', 1900);
      break;
    case 'cadenas':
      noise(o, t, 0.09, 0.09 * v, 'bandpass', f);
      break;
    case 'campana':
      [1, 2, 2.4, 3, 4.5].forEach((m, i) => note(o, f * m, t, 4.5 - i * 0.6, { type: 'sine', vol: (0.16 * v) / (i + 1), attack: e.ataque }));
      break;
    case 'cuernos':
      for (const det of [-7, 7]) note(o, f, t, d * 0.97, { type: 'sawtooth', vol: 0.075 * v, attack: e.ataque, cutoff: 400, detune: det });
      break;
    case 'metales':
      // metales de guerra: dos sierras abiertas y una cuadrada una octava abajo, golpe corto
      for (const det of [-6, 6]) note(o, f, t, Math.max(0.25, d), { type: 'sawtooth', vol: 0.03 * v, attack: e.ataque, cutoff: 1500, detune: det });
      note(o, f / 2, t, Math.max(0.25, d), { type: 'square', vol: 0.014 * v, attack: e.ataque + 0.01, cutoff: 700 });
      break;
    case 'bajo':
      note(o, f, t, Math.max(0.4, Math.min(0.9, d)), { type: 'triangle', vol: 0.14 * v, cutoff: 900, attack: e.ataque });
      break;
    case 'laud':
      note(o, f, t, Math.min(1.1, Math.max(0.35, d + 0.4)), { type: 'triangle', vol: 0.15 * v, cutoff: kind === 'shop' ? 2600 : kind === 'map' ? 2200 : 1500, attack: e.ataque });
      note(o, f / 2, t, Math.min(0.9, Math.max(0.3, d + 0.2)), { type: 'triangle', vol: 0.06 * v, cutoff: 900 });
      break;
    case 'eco':
      note(o, f, t, 0.8, { type: 'triangle', vol: 0.13 * v, cutoff: 1100, attack: e.ataque });
      break;
    case 'punteo':
      note(o, f, t, 0.35, { type: 'triangle', vol: 0.07 * v, cutoff: 2400, attack: e.ataque });
      break;
    case 'coro':
      note(o, f, t, d, { type: 'sawtooth', vol: 0.045 * v, attack: e.ataque, cutoff: 520, vibrato: 2.5, detune: -5 });
      note(o, f, t, d, { type: 'sine', vol: 0.08 * v, attack: e.ataque, vibrato: 2.5, detune: 5 });
      break;
  }
}

/** Programa el compás que empieza en t y devuelve lo que dura. */
function scheduleBar(t: number): number {
  if (pending) {
    scene = pending;
    pending = null;
    sceneStart = bar;
  }
  pressureNow += (pressure - pressureNow) * 0.35; // la música no salta: sube y baja poco a poco
  const c = compas({ semilla: SEMILLA, escena: scene.kind, asalto: scene.stage, monarca: scene.boss, presion: pressureNow, compas: bar, inicio: sceneStart });
  const sx = 60 / c.bpm / 4; // semicorchea
  for (const e of c.eventos) play(e, t + e.t * sx, sx, scene.kind);
  bar++;
  return c.segundos;
}

const DRONE = [36.71, 73.42, 110];

/**
 * Cambia la escena musical: 'menu' (portada, la Orden, la sala), 'map' (Mapa del castillo), 'shop'
 * (La Taberna, el Botín, el sobre) o 'battle' (la mesa, con su asalto y su monarca). Entra al acabar el
 * compás que suena.
 */
export function setScene(kind: Escena, stage = 3, boss = false): void {
  const next: Scene = { kind, stage: Math.max(1, Math.min(8, stage)), boss: kind === 'battle' && boss };
  const now = pending ?? scene;
  if (now.kind === next.kind && now.stage === next.stage && now.boss === next.boss) return;
  if (timer === null) {
    // sin música en marcha, la escena cambia ya (y arranca por su principio)
    scene = next;
    pending = null;
    sceneStart = bar;
  } else pending = next;
}
// la prueba de humo mira en qué escena está la música (con ?qa)
if (QA) Object.assign(window, { __qaMusica: () => ({ ...(pending ?? scene), bar }) });

function startLoop(): void {
  const a = ac();
  if (!a || !musicBus || timer !== null) return;
  musicBus.gain.cancelScheduledValues(a.currentTime);
  musicBus.gain.setTargetAtTime(MUSIC_GAIN * gainOf(volume.music), a.currentTime, 0.8);
  // bordón de quinta: re + la (siempre en re: la tonalidad no se mueve)
  drone = DRONE.map((base, i) => {
    const f = base;
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
  nextTime = a.currentTime + 0.15;
  // Se programa con 1,6 s de margen: los navegadores frenan los temporizadores en segundo plano.
  const tick = () => {
    while (nextTime < a.currentTime + 1.6) nextTime += scheduleBar(nextTime);
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
 * Presión de la mesa, de 0 a 1. Con calma suenan el bordón, un latido, el bajo y el laúd; al subir entran
 * el ritmo de tambor, las cadenas, los cuernos y el coro; por encima de 0,6 (o ante un monarca), los
 * tambores de guerra y los metales; por encima de 0,7 los tambores redoblan.
 */
export function setPressure(level: number): void {
  pressure = clamp01(level);
}
