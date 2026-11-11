// Sonido de DERRUMBE: todo sintetizado con WebAudio (sin archivos ni dependencias).
// Efectos de piedra, hierro y cuerno de guerra, y una marcha fúnebre en re menor armónico
// (bordón grave, tambores, laúd, coro, cuernos y campana) que se genera en bucle.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxOn = localStorage.getItem('derrumbe:sound') !== '0';
let musicOn = localStorage.getItem('derrumbe:music') !== '0';

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      // reverberación de nave de piedra: ruido con caída exponencial
      const len = Math.floor(ctx.sampleRate * 3.8);
      const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = impulse.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.2;
      }
      const hall = ctx.createConvolver();
      hall.buffer = impulse;
      wet = ctx.createGain();
      wet.gain.value = 0.42;
      wet.connect(hall).connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(master);
      musicBus.connect(wet);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

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
  if (!sfxOn) return;
  const a = ac();
  if (!a || !master || !wet) return;
  const out = a.createGain();
  out.connect(master);
  out.connect(wet);
  play(a, out, a.currentTime + 0.01);
}

const horn = (out: AudioNode, f: number, t: number, dur: number, vol: number, slide?: number) => {
  note(out, f, t, dur, { type: 'sawtooth', vol, attack: 0.09, cutoff: 900, detune: -7, slide });
  note(out, f, t, dur, { type: 'sawtooth', vol, attack: 0.09, cutoff: 900, detune: 7, slide });
  note(out, f / 2, t, dur, { type: 'square', vol: vol * 0.5, attack: 0.12, cutoff: 500, slide: slide ? slide / 2 : undefined });
};

export const sfx = {
  /** cuerda pulsada breve */
  select: () => fx((_, o, t) => note(o, 587, t, 0.12, { vol: 0.05 })),
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
const BPM = 74;
const STEP = 60 / BPM / 2; // corchea
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
let tense = false;

function schedule(t: number, s: number): void {
  const out = musicBus!;
  const bar = Math.floor(s / 8) % 8;
  const pos = s % 8;
  const loop = Math.floor(s / 64);
  const section = loop % 4; // 0 entrada · 1 laúd · 2 laúd + coro · 3 segunda voz grave
  // tambores de piel floja, graves
  const fill = bar === 7 && pos >= 5;
  if (DRUM[pos] || fill || (tense && pos % 2 === 0)) {
    note(out, pos === 0 ? 92 : 74, t, 0.6, { type: 'sine', vol: pos === 0 ? 0.62 : 0.4, slide: 30 });
    noise(out, t, 0.14, 0.24, 'lowpass', 170);
  }
  // cadenas: un roce metálico apagado en los contratiempos
  if (section > 0 && pos % 4 === 2) noise(out, t, 0.09, tense ? 0.07 : 0.04, 'bandpass', 820);
  // campana a lo lejos al abrir cada vuelta
  if (s % 64 === 0) [1, 2, 2.4, 3, 4.5].forEach((m, i) => note(out, 73.42 * m, t, 4.5 - i * 0.6, { type: 'sine', vol: 0.11 / (i + 1) }));
  // cuernos graves: fundamental y quinta por compás
  if (pos === 0) {
    const [root, fifth] = CHORDS[bar];
    const dur = STEP * 8 * 0.97;
    for (const [n, vol] of [[root, 0.075], [fifth, 0.045]] as [string, number][]) {
      note(out, F[n], t, dur, { type: 'sawtooth', vol, attack: 0.45, cutoff: 380, detune: -7 });
      note(out, F[n], t, dur, { type: 'sawtooth', vol, attack: 0.45, cutoff: 380, detune: 7 });
    }
  }
  // melodía
  if (section === 0) return;
  const line = section === 3 ? SECOND : MELODY;
  const n = line[s % 64];
  if (n === '.') return;
  note(out, F[n], t, 1.1, { type: 'triangle', vol: 0.12, cutoff: 1500 }); // laúd, apagado
  note(out, F[n] / 2, t, 0.9, { type: 'triangle', vol: 0.05, cutoff: 900 });
  // coro de monjes: la misma línea, una octava abajo, con ataque lento
  if (section >= 2) {
    note(out, F[n] / 2, t, STEP * 2.6, { type: 'sawtooth', vol: 0.035, attack: 0.18, cutoff: 520, vibrato: 2.5, detune: -5 });
    note(out, F[n] / 2, t, STEP * 2.6, { type: 'sine', vol: 0.06, attack: 0.18, vibrato: 2.5, detune: 5 });
  }
}

function startLoop(): void {
  const a = ac();
  if (!a || !musicBus || timer !== null) return;
  musicBus.gain.cancelScheduledValues(a.currentTime);
  musicBus.gain.setTargetAtTime(0.55, a.currentTime, 0.8);
  // bordón de quinta: re + la
  drone = [36.71, 73.42, 110].map((f, i) => {
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
      nextTime += STEP;
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
  if (musicOn) startLoop();
}

/** Con el búnker en peligro los tambores redoblan. */
export function setTension(on: boolean): void {
  tense = on;
}

export const soundOn = () => sfxOn;
export const musicIsOn = () => musicOn;
export function toggleSound(): boolean {
  sfxOn = !sfxOn;
  localStorage.setItem('derrumbe:sound', sfxOn ? '1' : '0');
  return sfxOn;
}
export function toggleMusic(): boolean {
  musicOn = !musicOn;
  localStorage.setItem('derrumbe:music', musicOn ? '1' : '0');
  if (musicOn) startLoop();
  else stopLoop();
  return musicOn;
}
