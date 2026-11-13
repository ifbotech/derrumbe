// V8 · npm run qa:audio — tres horas de música sin escucharlas. Solo CPU: importa el generador puro
// (src/client/audio-frases.ts), que es la misma partitura que toca el WebAudio, y recorre un guion fijo de
// 3 h × 3 semillas: seis campañas de ~30 min por semilla (portada, Mapa antes de cada asalto, La Taberna
// tras los asaltos 2, 4 y 6, combate en el 1–8, monarca en el 4 y el 8, y la presión que sube de 0 a 1 en
// los dos últimos combates), con los efectos de un registro de partida sembrado.
//
// Falla (código 1, al primer fallo) si:
//   · en una misma semilla se repite idéntico un tramo de más de 30 s (todas las voces a la vez, comparando
//     intervalos y no alturas: una melodía transportada cuenta como repetida; el bordón no es un evento);
//   · salen más de 8 efectos idénticos seguidos (mismo efecto, tono a < 5 cents, ataque a < 1 ms, panorama a < 0,05);
//   · dos asaltos comparten el motivo principal (intervalos y ritmo);
//   · el Mapa o La Taberna suenan sin laúd y bajo;
//   · un compás con monarca, o con presión > 0,6, sale sin tambores de guerra y metales;
//   · la campana de 8 Golpes exactos seguidos no sube 7 semitonos, o no vuelve al tono base tras romperse la cadena;
//   · suena una nota fuera de re menor (re eólico; el do♯ solo en las cadencias).
import { MOTIVOS_ASALTO, RE_MENOR, SENSIBLE, campana, cadenaTras, compas, flujo, mezcla, variacion, type Compas, type Escena, type Evento } from '../src/client/audio-frases';

const T0 = Date.now();
const LIMITE_MS = 120_000;
let fallos = 0;
function check(ok: boolean, msg: string): void {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) {
    fallos++;
    console.log('\nFALLO: la música no pasa.');
    process.exit(1);
  }
}
const tiempo = () => {
  if (Date.now() - T0 > LIMITE_MS) {
    console.log(`✗ qa:audio pasa de ${LIMITE_MS / 1000} s`);
    process.exit(1);
  }
};

interface Tramo {
  escena: Escena;
  asalto: number;
  monarca: boolean;
  /** Presión al principio y al final del tramo (sube en línea). */
  p0: number;
  p1: number;
  segundos: number;
}

/** El guion de una semilla: seis campañas de ~30 min (3 h en total). */
function guion(semilla: number): Tramo[] {
  const r = flujo(mezcla(semilla, 101));
  const out: Tramo[] = [];
  for (let c = 0; c < 6; c++) {
    out.push({ escena: 'menu', asalto: 1, monarca: false, p0: 0, p1: 0, segundos: 60 });
    for (let a = 1; a <= 8; a++) {
      out.push({ escena: 'map', asalto: a, monarca: false, p0: 0, p1: 0, segundos: 60 });
      const sube = a >= 7;
      const base = 0.1 + r() * 0.35;
      out.push({ escena: 'battle', asalto: a, monarca: a === 4 || a === 8, p0: sube ? (a === 7 ? 0 : 0.5) : base, p1: sube ? (a === 7 ? 0.5 : 1) : base + r() * 0.15, segundos: 110 + r() * 20 });
      if (a === 2 || a === 4 || a === 6) out.push({ escena: 'shop', asalto: a, monarca: false, p0: 0, p1: 0, segundos: 120 });
    }
  }
  return out;
}

interface CompasSonado extends Compas {
  escena: Escena;
  asalto: number;
  monarca: boolean;
  presion: number;
}

/** La música de una semilla, compás a compás, como la programa audio.ts. */
function tocar(semilla: number): CompasSonado[] {
  const out: CompasSonado[] = [];
  let global = 0;
  for (const tr of guion(semilla)) {
    const inicio = global;
    let t = 0;
    while (t < tr.segundos) {
      const presion = tr.p0 + (tr.p1 - tr.p0) * (t / tr.segundos);
      const c = compas({ semilla, escena: tr.escena, asalto: tr.asalto, monarca: tr.monarca, presion, compas: global, inicio });
      out.push({ ...c, escena: tr.escena, asalto: tr.asalto, monarca: tr.monarca, presion });
      t += c.segundos;
      global++;
    }
  }
  return out;
}

/**
 * Huella de un compás invariante al transporte: por voz, el ritmo, la duración, la velocidad (en décimas)
 * y el intervalo con la nota anterior de esa misma voz (la primera de cada voz no lleva altura). Todas las
 * voces a la vez. Un compás sin eventos (solo el bordón) no se parece a nada.
 */
function huella(c: Compas, i: number, dinamica = true): string {
  if (!c.eventos.length) return `vacío#${i}`;
  const porVoz = new Map<string, Evento[]>();
  for (const e of c.eventos) (porVoz.get(e.voz) ?? porVoz.set(e.voz, []).get(e.voz)!).push(e);
  const partes: string[] = [];
  for (const [voz, evs] of [...porVoz.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const s = [...evs].sort((a, b) => a.t - b.t || a.nota - b.nota);
    partes.push(`${voz}:${s.map((e, k) => `${Math.round(e.t)}/${Math.round(e.dur)}/${dinamica ? e.vel.toFixed(1) : ""}/${k ? e.nota - s[k - 1].nota : '·'}`).join(',')}`);
  }
  return partes.join('|');
}

/** El tramo repetido más largo (en segundos): dos sitios distintos donde todos los compases coinciden. */
function repeticionMasLarga(cs: CompasSonado[], dinamica = true): { seg: number; compases: number; en: number; y: number } {
  const ids: number[] = [];
  const dic = new Map<string, number>();
  cs.forEach((c, i) => {
    const h = huella(c, i, dinamica);
    if (!dic.has(h)) dic.set(h, dic.size);
    ids.push(dic.get(h)!);
  });
  let best = { seg: 0, compases: 0, en: -1, y: -1 };
  const n = ids.length;
  for (let d = 1; d < n; d++) {
    let run = 0;
    let seg = 0;
    for (let i = 0; i + d < n; i++) {
      if (ids[i] === ids[i + d]) {
        run++;
        seg += cs[i].segundos;
        if (seg > best.seg) best = { seg, compases: run, en: i - run + 1, y: i - run + 1 + d };
      } else {
        run = 0;
        seg = 0;
      }
    }
  }
  return best;
}

// ───────────────────────── efectos de un registro de partida sembrado ─────────────────────────

interface Sonido {
  efecto: string;
  /** Tono total en cents (los semitonos de la campana incluidos). */
  cents: number;
  ataque: number;
  pan: number;
  semis?: number;
}
function efectos(semilla: number): { lista: Sonido[]; cadenas: number[] } {
  const r = flujo(mezcla(semilla, 202));
  const n: Record<string, number> = {};
  const lista: Sonido[] = [];
  const cadenas: number[] = [];
  let cadena = 0;
  const suena = (efecto: string, semis = 0) => {
    const v = variacion(semilla, efecto, (n[efecto] = (n[efecto] ?? 0) + 1));
    lista.push({ efecto, cents: semis * 100 + v.cents, ataque: v.ataque, pan: v.pan, semis });
  };
  // seis campañas × 8 combates, unos 30 golpes por combate
  for (let b = 0; b < 48; b++) {
    for (let g = 0; g < 30; g++) {
      suena('flick');
      if (r() < 0.25) suena('seal');
      if (r() < 0.3) suena('foil');
      // una racha de exactos de 0 a 9 de vez en cuando; si no, un golpe que no es exacto
      if (r() < 0.12) {
        const largo = Math.floor(r() * 10);
        for (let k = 0; k < largo; k++) {
          suena('hit');
          suena('slash');
          cadena = cadenaTras(cadena, true);
          suena('bell', campana(cadena));
          cadenas.push(cadena);
          suena('coins');
        }
      }
      suena('hit');
      if (r() < 0.5) suena('slash');
      cadena = cadenaTras(cadena, false);
      cadenas.push(cadena);
      if (r() < 0.4) suena('sirenBlocked');
      if (r() < 0.2) suena('stash');
    }
    if (b % 8 === 1 || b % 8 === 3 || b % 8 === 5) for (let k = 0; k < 6; k++) suena('coins');
  }
  return { lista, cadenas };
}
const igual = (a: Sonido, b: Sonido) => a.efecto === b.efecto && Math.abs(a.cents - b.cents) < 5 && Math.abs(a.ataque - b.ataque) < 0.001 && Math.abs(a.pan - b.pan) < 0.05;
function rachaIdentica(lista: Sonido[]): { largo: number; efecto: string } {
  let best = { largo: lista.length ? 1 : 0, efecto: lista[0]?.efecto ?? '' };
  // seguidos en el orden en que suenan, y también dentro de cada efecto (lo más estricto)
  const grupos = new Map<string, Sonido[]>();
  for (const x of lista) (grupos.get(x.efecto) ?? grupos.set(x.efecto, []).get(x.efecto)!).push(x);
  const series = [lista, ...grupos.values()];
  for (const s of series) {
    let run = 1;
    for (let i = 1; i < s.length; i++) {
      run = igual(s[i], s[i - 1]) ? run + 1 : 1;
      if (run > best.largo) best = { largo: run, efecto: s[i].efecto };
    }
  }
  return best;
}

// ───────────────────────── las comprobaciones ─────────────────────────

console.log('qa:audio · 3 h simuladas × 3 semillas sobre el generador puro (src/client/audio-frases.ts)\n');

// motivos: ningún asalto comparte el principal
{
  const firma = (m: [number, number][]) => m.map(([g, d], k) => `${k ? g - m[k - 1][0] : 0}/${d}`).join(' ');
  const firmas = MOTIVOS_ASALTO.map((j) => firma(j.cabeza));
  check(new Set(firmas).size === 8, `cada asalto tiene su motivo principal (${new Set(firmas).size} distintos de 8)`);
}

// la campana de la cadena
{
  const semis: number[] = [];
  let c = 0;
  for (let k = 0; k < 9; k++) semis.push(campana((c = cadenaTras(c, true))));
  c = cadenaTras(c, false);
  const tras = campana((c = cadenaTras(c, true)));
  check(semis.slice(0, 8).join() === '0,1,2,3,4,5,6,7' && semis[8] === 7, `la campana de 8 Golpes exactos seguidos sube +1 por exacto hasta +7 (${semis.join(' ')})`);
  check(tras === 0, `y vuelve al tono base con el primer golpe que no es exacto (${tras})`);
}

const resumen: string[] = [];
for (const semilla of [1, 2, 3]) {
  const t = Date.now();
  const cs = tocar(semilla);
  const horas = cs.reduce((a, c) => a + c.segundos, 0) / 3600;
  tiempo();
  // tonalidad
  let fuera = 0;
  let sensibles = 0;
  let ejemplo = '';
  for (const c of cs)
    for (const e of c.eventos) {
      const pc = ((e.nota % 12) + 12) % 12;
      if (pc === SENSIBLE && e.cadencia) sensibles++;
      else if (!RE_MENOR.has(pc)) {
        fuera++;
        ejemplo ||= `${e.voz} ${e.nota} en ${c.escena}`;
      }
    }
  check(fuera === 0, `[semilla ${semilla}] todas las notas en re menor; el do♯ solo en cadencias (${sensibles} sensibles${fuera ? ` · ${fuera} fuera, p. ej. ${ejemplo}` : ''})`);
  // laúd y bajo en el Mapa y La Taberna (en cada minuto)
  for (const esc of ['map', 'shop'] as const) {
    let sinLaud = 0;
    let sinBajo = 0;
    let tramos = 0;
    for (let i = 0; i < cs.length; ) {
      if (cs[i].escena !== esc) {
        i++;
        continue;
      }
      let j = i;
      while (j < cs.length && cs[j].escena === esc) j++;
      // por ventanas de ~15 s dentro del tramo
      for (let k = i; k < j; k += 4) {
        const w = cs.slice(k, Math.min(j, k + 4)).flatMap((c) => c.eventos);
        tramos++;
        if (!w.some((e) => e.voz === 'laud' || e.voz === 'punteo')) sinLaud++;
        if (!w.some((e) => e.voz === 'bajo')) sinBajo++;
      }
      i = j;
    }
    check(sinLaud === 0 && sinBajo === 0, `[semilla ${semilla}] ${esc === 'map' ? 'el Mapa' : 'La Taberna'} lleva laúd y bajo en cada ventana de 15 s (${tramos} ventanas${sinLaud + sinBajo ? ` · ${sinLaud} sin laúd, ${sinBajo} sin bajo` : ''})`);
  }
  // guerra: tambores y metales con monarca o con presión > 0,6
  {
    const tensos = cs.filter((c) => c.escena === 'battle' && (c.monarca || c.presion > 0.6));
    const sin = tensos.filter((c) => !c.eventos.some((e) => e.voz === 'guerra') || !c.eventos.some((e) => e.voz === 'metales'));
    check(tensos.length > 0 && sin.length === 0, `[semilla ${semilla}] tambores de guerra y metales en cada compás con monarca o presión > 0,6 (${tensos.length} compases${sin.length ? ` · ${sin.length} sin ellos` : ''})`);
    const calma = cs.filter((c) => c.escena === 'battle' && !c.monarca && c.presion < 0.5);
    check(calma.every((c) => !c.eventos.some((e) => e.voz === 'guerra' || e.voz === 'metales')), `[semilla ${semilla}] y nunca con calma (presión < 0,5, sin monarca)`);
  }
  // repetición
  const rep = repeticionMasLarga(cs);
  tiempo();
  check(rep.seg <= 30, `[semilla ${semilla}] ningún tramo de más de 30 s se repite (el más largo: ${rep.seg.toFixed(1)} s, ${rep.compases} compases${rep.compases ? `, ${cs[rep.en].escena} ${rep.en} ↔ ${cs[rep.y].escena} ${rep.y}` : ''})`);
  // diagnóstico (no falla): lo mismo sin contar la dinámica, para ver que la variedad no es solo de volumen
  const repNotas = repeticionMasLarga(cs, false);
  console.log(`  [semilla ${semilla}] sin contar la dinámica, el tramo repetido más largo es de ${repNotas.seg.toFixed(1)} s (${repNotas.compases} compases)`);
  // motivos distintos que suenan por asalto (compases de laúd con huella distinta)
  const porAsalto = Array.from({ length: 8 }, (_, a) => {
    const s = new Set(cs.filter((c) => c.escena === 'battle' && c.asalto === a + 1).map((c, i) => huella({ ...c, eventos: c.eventos.filter((e) => e.voz === 'laud') }, -1 - i)).filter((h) => !h.startsWith('vacío')));
    return s.size;
  });
  // efectos
  const fx = efectos(semilla);
  const racha = rachaIdentica(fx.lista);
  check(racha.largo <= 8, `[semilla ${semilla}] ninguna secuencia de efectos idénticos pasa de 8 (la más larga: ${racha.largo}, «${racha.efecto}»; ${fx.lista.length} efectos)`);
  const maxCadena = Math.max(...fx.cadenas);
  check(maxCadena >= 8, `[semilla ${semilla}] el registro trae cadenas de hasta ${maxCadena} Golpes exactos`);
  resumen.push(`semilla ${semilla}: ${horas.toFixed(2)} h · ${cs.length} compases · tramo repetido más largo ${rep.seg.toFixed(1)} s (${rep.compases} compases; ${repNotas.seg.toFixed(1)} s sin la dinámica) · racha de efectos idénticos ${racha.largo} · motivos distintos por asalto ${porAsalto.join('/')} · ${((Date.now() - t) / 1000).toFixed(1)} s`);
}

console.log('\nResumen');
for (const l of resumen) console.log(`  ${l}`);
console.log(`  tiempo total: ${((Date.now() - T0) / 1000).toFixed(1)} s`);
console.log(fallos ? `\n${fallos} fallos` : '\nLa música no cansa: todo en orden.');
process.exit(fallos ? 1 : 0);
