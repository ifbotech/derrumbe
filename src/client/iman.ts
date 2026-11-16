// V12 · juice-ux, bloque B: lo que cae a la mesa, en movimiento (SPECS/V12.md, apartado 1.3).
//
// El motor ya abonó cada pieza (`trackEvents`); aquí solo se ve llegar. El DOM quieto es de arte (`caida.ts`: la
// capa `#caida`, su depósito de 40 piezas y `colocarCaida`, que sabe dónde se puede posar una pieza sin tapar la
// mano, la cuenta, Golpear ni las cifras). Lo de aquí:
//   · la campaña deja las piezas de cada jugada en `caidaPendiente` (enganche en campaign.ts) y la mesa, al terminar
//     de animar cada evento, llama a `caeDe(evento, tanda)` (enganche en table.ts): las piezas de ESE evento saltan
//     desde su trono o su guardia, botan y se posan;
//   · el cursor o el dedo que pasa a menos de su radio las aspira; si nadie las toca, a los `imanDe(up).espera`
//     segundos (1,0 de serie; menos con «Piedra imán», que además alarga el radio) el imán las lleva solas a la
//     bolsa. Con mando y con AUTO no hay cursor: siempre el imán. Todo a la velocidad elegida (a 8×, un octavo);
//   · la bolsa enseña lo que ya llegó (`run − lo que aún vuela`; enganche de una línea al final de `renderHud`):
//     cada contador sube cuando su pieza llega, con un latido y su nota (audio.ts, `sfx.recoge`);
//   · nunca más de 40 piezas en pantalla: si una tanda no cabe, las del mismo trono y tipo se juntan en una («×5»);
//   · «Reducir movimiento»: nada salta ni vuela, lo que cae va directo a la bolsa (con su nota).
// Solo `transform` y `opacity`, sin filtros (juice.css quita la sombra de filtro a las piezas que se mueven), y
// nada de esto bloquea la entrada: la mesa no espera a que una pieza llegue.
import { imanDe } from '../rules/arbol';
import { BALANCE } from '../rules/balance-config';
import { caidaDe, type Pieza } from '../rules/caida';
import type { GameEvent } from '../rules/engine';
import { pasoRecogida } from './audio-frases';
import { sfx } from './audio';
import { caidaPendiente, colocarCaida, crearPieza, type TipoPieza } from './caida';
import { cifra } from './cifra';
import { S, settings } from './core';
import { speed } from './fx';
import { whisper } from './whispers';

/** Tiempos a 1× (ms): el salto desde el trono hasta posarse, el escalonado entre piezas y lo que tarda en volar. */
export const IMAN_MS = { salto: 560, escalon: 55, vuelo: 320, vueloPorPx: 0.32, vueloMax: 720 } as const;
/** Radio del cursor (px, de serie): en escritorio y en el móvil; el dedo tapa más, así que llega un poco más lejos. */
const RADIO = { ancho: 56, movil: 42, dedo: 14 } as const;
const POOL = 40;
/** Donde va cada pieza en la bolsa. */
const DESTINO: Record<TipoPieza, string> = { moneda: '.bolsa-moneda', esquirla: '.bolsa-esquirla', gota: '.bolsa-gota' };
const CONTADOR: Record<TipoPieza, string> = { moneda: '#bolsa-oro', esquirla: '#bolsa-esquirlas', gota: '#bolsa-gotas' };
/** Giro de reposo de cada pieza (el de caida.ts / conjura.css, que el transform de la animación sustituye). */
const GIRO: Record<TipoPieza, number> = { moneda: 0, esquirla: -12, gota: 6 };

type Fase = 'espera' | 'salta' | 'quieta' | 'vuela';
interface Vuelo {
  el: HTMLElement | null;
  tipo: TipoPieza;
  n: number;
  /** Cuántas piezas lleva juntas («×k»). */
  k: number;
  trono: Pieza['trono'];
  /** Índice del evento de la tanda que la soltó. */
  ev: number;
  /** Centro en reposo (px de la ventana). */
  x: number;
  y: number;
  giro: number;
  fase: Fase;
  /** Cuenta para la bolsa (en cooperativo, solo se ve: el saldo lo trae el servidor). */
  cuenta: boolean;
  timer: number;
  id: number;
}

/** Piezas de la tanda en curso que aún no han salido (por evento) y piezas en pantalla. */
let esperan: Vuelo[] = [];
const vivas: Vuelo[] = [];
let tanda: GameEvent[] | null = null;
let mesa: Element | null = null;
let ids = 0;
let pasoNota = 0;
let ultimaNota = -1e9;
let ultimaLlegada = -1e9;
let puntero: { x: number; y: number; dedo: boolean } | null = null;
let rafPuntero = 0;

/** Lo que mide la prueba de humo y qa:fps (con ?qa). */
export const imanQa = {
  lanzadas: 0,
  llegadas: 0,
  aspiradas: 0,
  imanes: 0,
  directas: 0,
  juntadas: 0,
  sinSitio: 0,
  maxVivas: 0,
  /** Propiedades que han animado las piezas (debe ser solo transform y opacity). */
  props: new Set<string>(),
  /** Del salto a la llegada a la bolsa (ms reales), las últimas 200. */
  vida: [] as number[],
  /** Esperas reales del imán (de posarse a salir volando), las últimas 200. */
  esperas: [] as number[],
};

const suma = (xs: { tipo: TipoPieza; n: number }[], tipo: TipoPieza) => xs.reduce((a, p) => a + (p.tipo === tipo ? p.n : 0), 0);

/** Lo que aún no ha llegado a la bolsa, por tipo (lo que cuenta: en local). */
function enCamino(tipo: TipoPieza): number {
  const c = S.campaign;
  if (!c || c.online) return 0;
  return suma(caidaPendiente, tipo) + suma(esperan.filter((v) => v.cuenta), tipo) + suma(vivas.filter((v) => v.cuenta), tipo);
}

const saldo = (tipo: TipoPieza): number => {
  const run = S.campaign?.run;
  if (!run) return 0;
  return tipo === 'moneda' ? run.gold : tipo === 'esquirla' ? run.esquirlas : run.gotas;
};

/** Escribe un contador de la bolsa con lo que ya llegó. */
function escribe(tipo: TipoPieza): void {
  const el = document.querySelector(CONTADOR[tipo]);
  if (!el) return;
  const txt = cifra(Math.max(0, saldo(tipo) - enCamino(tipo)));
  if (el.textContent !== txt) el.textContent = txt;
}

/**
 * La bolsa con lo que ya llegó (enganche al final de `renderHud`): si algo vuela todavía, su contador se queda
 * en lo de antes y sube al llegar. Si se cambió de mesa con piezas a medio camino, se dan por llegadas.
 */
export function pintaBolsa(): void {
  revisaMesa();
  for (const tipo of ['moneda', 'esquirla', 'gota'] as const) if (enCamino(tipo) > 0) escribe(tipo);
}

/** La mesa se rehízo (otro asalto, otra pantalla): lo que esperaba o volaba ya está en la bolsa. */
function revisaMesa(): void {
  const ahora = document.querySelector('.table-screen');
  if (ahora === mesa) return;
  mesa = ahora;
  vacia();
}

/** Todo lo pendiente, a la bolsa sin animar (cambio de mesa, Rebobinar). */
function vacia(): void {
  for (const v of [...vivas]) termina(v, false);
  esperan = [];
  caidaPendiente.length = 0;
  tanda = null;
}

/** Junta piezas (mismo tipo y trono primero; si no, mismo tipo) hasta que quepan en `max`. */
function junta(lista: Vuelo[], max: number): Vuelo[] {
  const out = [...lista];
  while (out.length > Math.max(1, max)) {
    let a = -1;
    let b = -1;
    // se juntan las últimas de una pareja igual: la primera de cada trono sigue saliendo en su momento
    for (let i = out.length - 1; i > 0 && a < 0; i--)
      for (let j = i - 1; j >= 0; j--)
        if (out[j].tipo === out[i].tipo && out[j].trono === out[i].trono) {
          a = j;
          b = i;
          break;
        }
    if (a < 0)
      for (let i = out.length - 1; i > 0 && a < 0; i--)
        for (let j = i - 1; j >= 0; j--)
          if (out[j].tipo === out[i].tipo) {
            a = j;
            b = i;
            break;
          }
    if (a < 0) {
      // tres tipos y nada más: no hay con quién juntar; lo que sobra va directo a la bolsa
      out.length = Math.max(1, max);
      break;
    }
    out[a].n += out[b].n;
    out[a].k += out[b].k;
    out.splice(b, 1);
    imanQa.juntadas++;
  }
  return out;
}

/**
 * Lo que una pieza en juego no tapa nunca (cuando `colocarCaida` no encuentra hueco en el trono, que en mitad de
 * un golpe pasa a menudo: la tarima crece y el pie del trono queda ocupado): la mano, la cuenta, Golpear, la
 * botonera, la bolsa y las barras, las cifras y placas de los tronos y las cartas de la tarima.
 */
const NO_TAPA = '.hand, .handrow, #score, .actions, #btn-strike, #btn-mejor, #bolsa, .bar, .beltbar, .piles, .side, .whisper, .tower .preview, .tower .plates, .tower .threat, .tower .hp, .tower .tower-tag, .tower .floor-slot, #stage .card, .monarch, .coach, .say';

/** Un sitio de reposo para la pieza junto al pie de su trono (o de la fila de tronos), fuera de lo de arriba. */
function huecoJunto(v: Vuelo, s: number, malas: DOMRect[], puestas: DOMRect[]): { x: number; y: number } | null {
  const base = (v.trono && document.querySelector<HTMLElement>(`.tower[data-suit="${v.trono}"]`)) || document.getElementById('towers');
  if (!base) return null;
  const t = base.getBoundingClientRect();
  const paso = s * 0.8;
  const cols = Math.max(1, Math.floor((t.width - s) / paso) + 1);
  // de la mitad del trono hacia los lados, y del pie hacia abajo (y un poco hacia dentro, si no hay más)
  const filas = [0, 1, 2, -1, 3, -2];
  for (const fila of filas)
    for (let c = 0; c < cols; c++) {
      const col = Math.floor(cols / 2) + (c % 2 ? -1 : 1) * Math.ceil(c / 2);
      if (col < 0 || col >= cols) continue;
      const x = t.left + col * paso + ((fila * 5 + col * 3) % 6);
      const y = t.bottom - s * 0.5 + fila * paso;
      if (x < 4 || y < 4 || x + s > innerWidth - 4 || y + s > innerHeight - 4) continue;
      const r = new DOMRect(x, y, s, s);
      const corta = (a: DOMRect) => r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top;
      if (malas.some(corta)) continue;
      if (puestas.some((p) => Math.abs(p.left - x) < s * 0.5 && Math.abs(p.top - y) < s * 0.5)) continue;
      return { x, y };
    }
  return null;
}

/** Prepara las piezas de una tanda: cuáles suelta cada evento, juntas si no caben, colocadas y ocultas. */
function abreTanda(batch: GameEvent[]): void {
  revisaMesa();
  // lo que quedó sin salir de la tanda anterior (la mesa cortó la animación) ya está en la bolsa
  esperan = [];
  tanda = batch;
  const c = S.campaign;
  if (!c) return;
  if (batch.some((e) => e.e === 'undo')) return vacia();
  const run = c.run;
  // cuántas piezas suelta cada evento: el motor las da en el orden de los eventos
  const porEvento: number[] = [];
  let antes = 0;
  for (let i = 0; i < batch.length; i++) {
    const n = caidaDe(run, batch.slice(0, i + 1)).length;
    porEvento.push(n - antes);
    antes = n;
  }
  let lista: Pieza[];
  if (c.online) lista = caidaDe(run, batch);
  else {
    // las de las tandas que esperan en la cola van detrás; lo que hay delante de esta tanda no se llegó a animar
    const despues = S.queue.reduce((a, b) => a + caidaDe(run, b.events).length, 0);
    const sobra = caidaPendiente.length - antes - despues;
    if (sobra > 0) caidaPendiente.splice(0, sobra);
    lista = caidaPendiente.splice(0, Math.min(antes, caidaPendiente.length));
  }
  if (!lista.length) return;
  let ev = 0;
  let quedan = porEvento[0] ?? 0;
  const vuelos: Vuelo[] = lista.map((p) => {
    while (quedan <= 0 && ev < porEvento.length - 1) quedan = porEvento[++ev];
    quedan--;
    return { el: null, tipo: p.tipo, n: p.n, k: 1, trono: p.trono, ev, x: 0, y: 0, giro: GIRO[p.tipo], fase: 'espera', cuenta: !c.online, timer: 0, id: ++ids };
  });
  if (settings.calm) {
    esperan = vuelos;
    return;
  }
  const libres = POOL - vivas.length;
  const juntas = junta(vuelos, libres);
  // las que no caben ni juntas (más de 40 en vuelo a la vez): directas a la bolsa al salir su evento
  const colocadas = colocarCaida(juntas.map((v) => ({ tipo: v.tipo, n: v.n, trono: v.trono, de: 'golpe' as const })));
  coloca(juntas, colocadas);
  esperan = juntas;
}

/** Empareja las piezas con lo que colocó `colocarCaida` (en orden; las que no cupieron, junto al pie de su trono). */
function coloca(juntas: Vuelo[], colocadas: HTMLElement[]): void {
  let j = 0;
  const sueltas: Vuelo[] = [];
  const puestas: DOMRect[] = [];
  for (const v of juntas) {
    const el = colocadas[j];
    if (el && el.dataset.tipo === v.tipo && Number(el.dataset.n) === v.n) {
      j++;
      prepara(v, el);
      const s = parseFloat(el.style.width) || 28;
      puestas.push(new DOMRect(v.x - s / 2, v.y - s / 2, s, s));
    } else sueltas.push(v);
  }
  if (sueltas.length) colocaSueltas(sueltas, puestas);
  // ocultas hasta que salga su evento (hasta aquí, a la vista para que crearPieza no las vuelva a tomar: nada se pinta en medio)
  for (const v of juntas) if (v.el) v.el.hidden = true;
}

function colocaSueltas(sueltas: Vuelo[], puestas: DOMRect[]): void {
  const s = matchMedia('(max-width: 640px), (max-aspect-ratio: 1/1)').matches ? 20 : 28;
  const malas = [...document.querySelectorAll<HTMLElement>(NO_TAPA)].filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
  for (const v of sueltas) {
    const h = huecoJunto(v, s, malas, puestas);
    if (!h) {
      imanQa.sinSitio++;
      continue;
    }
    const el = crearPieza(v.tipo, v.n);
    el.style.left = `${Math.round(h.x)}px`;
    el.style.top = `${Math.round(h.y)}px`;
    el.style.width = el.style.height = `${s}px`;
    if (v.trono) el.dataset.trono = v.trono;
    el.hidden = false;
    prepara(v, el);
    puestas.push(new DOMRect(h.x, h.y, s, s));
  }
}

function prepara(v: Vuelo, el: HTMLElement): void {
  el.classList.add('iman');
  el.dataset.vuelo = String(v.id);
  if (v.k > 1) el.insertAdjacentHTML('beforeend', `<b class="caida-n">×${v.k}</b>`);
  const s = parseFloat(el.style.width) || 28;
  v.x = parseFloat(el.style.left) + s / 2;
  v.y = parseFloat(el.style.top) + s / 2;
  v.el = el;
}

/**
 * Enganche de la mesa (table.ts, `pump`): el evento `ev` de la tanda `batch` acaba de animarse; sus piezas
 * saltan ahora. No espera a nada: la mesa sigue con el evento siguiente.
 */
export function caeDe(ev: GameEvent, batch: GameEvent[]): void {
  if (!S.campaign) return;
  if (batch !== tanda) abreTanda(batch);
  if (!esperan.length) return;
  const i = batch.indexOf(ev);
  const salen = esperan.filter((v) => v.ev <= i);
  if (!salen.length) return;
  esperan = esperan.filter((v) => v.ev > i);
  whisper('caida');
  salen.forEach((v, k) => lanza(v, k, salen.length));
}

/** El origen de una pieza: el guardia de su trono (o el trono entero), o la tarima si es de la mesa. */
function origen(v: Vuelo): { x: number; y: number } {
  const el =
    (v.trono && (document.querySelector(`.tower[data-suit="${v.trono}"] .floor-slot`) ?? document.querySelector(`.tower[data-suit="${v.trono}"]`))) ||
    document.querySelector('#stage .card') ||
    document.getElementById('towers');
  if (!el) return { x: v.x, y: v.y - 80 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.45 };
}

/** Del azar del cliente solo sale el giro y el bote (en QA, Math.random va sembrado). */
const giro = () => Math.round((Math.random() - 0.5) * 50);

function lanza(v: Vuelo, k: number, de = 1): void {
  imanQa.lanzadas++;
  const el = v.el;
  if (settings.calm || !el || el.dataset.vuelo !== String(v.id)) {
    imanQa.directas++;
    llega(v, true);
    return;
  }
  vivas.push(v);
  imanQa.maxVivas = Math.max(imanQa.maxVivas, vivas.length);
  const f = speed();
  const o = origen(v);
  const dx = o.x - v.x;
  const dy = o.y - v.y;
  const g0 = v.giro + giro() * 3;
  v.giro += giro();
  const alto = 40 + Math.random() * 40;
  // escalonadas, pero una tanda grande no tarda más de ~0,7 s en soltarlo todo
  const delay = k * Math.min(IMAN_MS.escalon, 700 / Math.max(1, de)) * f;
  const dur = IMAN_MS.salto * f;
  el.hidden = false;
  const kf: Keyframe[] = [
    { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${g0}deg) scale(0.45)`, opacity: 0 },
    { transform: `translate(${(dx * 0.4).toFixed(1)}px, ${(Math.min(dy, 0) * 0.4 - alto).toFixed(1)}px) rotate(${(g0 + v.giro) / 2}deg) scale(1.05)`, opacity: 1, offset: 0.42 },
    { transform: `translate(0px, 0px) rotate(${v.giro}deg) scale(1)`, opacity: 1, offset: 0.76 },
    { transform: `translate(0px, -6px) rotate(${v.giro}deg) scale(1)`, opacity: 1, offset: 0.87 },
    { transform: `translate(0px, 0px) rotate(${v.giro}deg) scale(1)`, opacity: 1 },
  ];
  anota(kf);
  el.animate(kf, { duration: dur, delay, easing: 'cubic-bezier(0.3, 0.55, 0.5, 1)', fill: 'both' });
  v.fase = 'salta';
  const nace = performance.now();
  el.dataset.nace = String(nace);
  v.timer = window.setTimeout(() => posa(v), delay + dur);
}

function anota(kf: Keyframe[]): void {
  for (const k of kf) for (const p of Object.keys(k)) if (p !== 'offset' && p !== 'easing' && p !== 'composite') imanQa.props.add(p);
}

/** Posada en la mesa: el imán cuenta desde aquí (el cursor ya la puede aspirar). */
function posa(v: Vuelo): void {
  if (v.fase !== 'salta') return;
  v.fase = 'quieta';
  const espera = imanDe(S.campaign?.run.up).espera * 1000 * speed();
  const t0 = performance.now();
  v.timer = window.setTimeout(() => {
    imanQa.imanes++;
    imanQa.esperas.push(performance.now() - t0);
    if (imanQa.esperas.length > 200) imanQa.esperas.shift();
    vuela(v);
  }, espera);
  if (puntero) aspira();
}

/** El destino en la bolsa (su icono); sin bolsa, hacia arriba y fuera. */
function destino(tipo: TipoPieza): { x: number; y: number } {
  const el = document.querySelector(`#bolsa ${DESTINO[tipo]} svg`) ?? document.querySelector(`#bolsa ${DESTINO[tipo]}`) ?? document.getElementById('bolsa');
  if (!el) return { x: innerWidth / 2, y: -40 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function vuela(v: Vuelo): void {
  if (v.fase === 'vuela' || !v.el) return;
  clearTimeout(v.timer);
  v.fase = 'vuela';
  const el = v.el;
  const f = speed();
  const d = destino(v.tipo);
  const dx = d.x - v.x;
  const dy = d.y - v.y;
  const dur = Math.min(IMAN_MS.vueloMax, IMAN_MS.vuelo + Math.hypot(dx, dy) * IMAN_MS.vueloPorPx) * f;
  const kf: Keyframe[] = [
    { transform: `translate(0px, 0px) rotate(${v.giro}deg) scale(1)`, opacity: 1 },
    { transform: `translate(${(dx * 0.06).toFixed(1)}px, ${(dy * 0.06 + 10).toFixed(1)}px) rotate(${v.giro}deg) scale(1.12)`, opacity: 1, offset: 0.16 },
    { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${v.giro + giro() * 4}deg) scale(0.55)`, opacity: 0.9 },
  ];
  anota(kf);
  const viejas = el.getAnimations();
  el.animate(kf, { duration: dur, easing: 'cubic-bezier(0.55, 0, 0.8, 0.45)', fill: 'forwards' });
  viejas.forEach((a) => a.cancel());
  v.timer = window.setTimeout(() => termina(v, true), dur + 16);
}

/** La pieza deja la mesa: con `llego`, entra en la bolsa con su latido y su nota; sin él, se da por llegada en silencio. */
function termina(v: Vuelo, llego: boolean): void {
  clearTimeout(v.timer);
  const i = vivas.indexOf(v);
  if (i >= 0) vivas.splice(i, 1);
  const el = v.el;
  if (el && el.dataset.vuelo === String(v.id)) {
    el.getAnimations().forEach((a) => a.cancel());
    el.hidden = true;
    el.querySelector('.caida-n')?.remove();
    el.classList.remove('iman');
    delete el.dataset.vuelo;
    const nace = Number(el.dataset.nace);
    if (nace) {
      imanQa.vida.push(performance.now() - nace);
      if (imanQa.vida.length > 200) imanQa.vida.shift();
    }
  }
  v.el = null;
  v.fase = 'vuela';
  if (llego) llega(v, false);
  else if (v.cuenta) escribe(v.tipo);
}

/** Llega a la bolsa: el contador sube, late, suena su nota (la escala sube si se recoge seguido). */
function llega(v: Vuelo, directa: boolean): void {
  imanQa.llegadas++;
  if (v.cuenta) escribe(v.tipo);
  const ahora = performance.now();
  // la escala: un peldaño más si la anterior llegó hace poco; vuelve abajo tras una pausa
  pasoNota = pasoRecogida(pasoNota, ahora - ultimaLlegada);
  ultimaLlegada = ahora;
  // si llegan muchas en el mismo instante, una nota cada 40 ms (las demás suben la escala sin sonar)
  if (ahora - ultimaNota >= 40) {
    ultimaNota = ahora;
    sfx.recoge(v.tipo, pasoNota);
  }
  if (!directa) late(v.tipo);
  if (v.tipo === 'gota' && v.cuenta && saldo('gota') - enCamino('gota') >= BALANCE.caida.gotasPorSello) whisper('gotas', { n: String(BALANCE.caida.gotasPorSello) });
}

/** El latido del contador al llegar su pieza (y, con una gota, la bolsa se sacude un poco). Sin relleno: no deja nada puesto. */
function late(tipo: TipoPieza): void {
  if (settings.calm) return;
  const c = document.querySelector<HTMLElement>(`#bolsa ${DESTINO[tipo]}`);
  if (!c) return;
  c.getAnimations().forEach((a) => a.cancel());
  c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
  if (tipo !== 'gota') return;
  const b = document.getElementById('bolsa');
  if (!b || b.getAnimations().length) return;
  b.animate(
    [{ transform: 'none' }, { transform: 'translateX(-2px) rotate(-1.5deg)', offset: 0.25 }, { transform: 'translateX(2px) rotate(1.5deg)', offset: 0.55 }, { transform: 'translateX(-1px)', offset: 0.8 }, { transform: 'none' }],
    { duration: 300, easing: 'ease-out' },
  );
}

/** El cursor o el dedo: aspira las piezas posadas dentro de su radio. */
function aspira(): void {
  rafPuntero = 0;
  const p = puntero;
  if (!p || !vivas.length) return;
  const base = matchMedia('(max-width: 640px), (max-aspect-ratio: 1/1)').matches ? RADIO.movil : RADIO.ancho;
  const r = (base + (p.dedo ? RADIO.dedo : 0)) * imanDe(S.campaign?.run.up).radio;
  for (const v of [...vivas])
    if (v.fase === 'quieta' && Math.hypot(v.x - p.x, v.y - p.y) < r) {
      imanQa.aspiradas++;
      vuela(v);
    }
}
function alMover(e: PointerEvent): void {
  if (!vivas.length) return;
  puntero = { x: e.clientX, y: e.clientY, dedo: e.pointerType === 'touch' };
  if (!rafPuntero) rafPuntero = requestAnimationFrame(aspira);
}
addEventListener('pointermove', alMover, { passive: true });
addEventListener('pointerdown', alMover, { passive: true });
// el dedo que se levanta ya no está encima de nada
addEventListener('pointerup', (e) => e.pointerType === 'touch' && (puntero = null), { passive: true });

if (new URLSearchParams(location.search).has('qa'))
  Object.assign(window, {
    __qaIman: {
      estado: () => ({
        ...imanQa,
        props: [...imanQa.props],
        vida: [...imanQa.vida],
        esperas: [...imanQa.esperas],
        vivas: vivas.length,
        quietas: vivas.filter((v) => v.fase === 'quieta').length,
        esperan: esperan.length,
        pendientes: caidaPendiente.length,
        enCamino: { moneda: enCamino('moneda'), esquirla: enCamino('esquirla'), gota: enCamino('gota') },
      }),
      /**
       * qa:fps y el humo: suelta `n` piezas de prueba desde los tronos de la mesa (no cuentan para la bolsa) como
       * las suelta un golpe de verdad, en una sola tanda (si son más de 40, se juntan).
       */
      soltar: (n: number) => {
        const tronos = [...document.querySelectorAll<HTMLElement>('.tower:not([hidden])')].map((t) => t.dataset.suit as Pieza['trono']).filter(Boolean);
        const tipos: TipoPieza[] = ['esquirla', 'moneda', 'esquirla', 'gota'];
        const lista: Vuelo[] = Array.from({ length: n }, (_, i) => ({ el: null, tipo: tipos[i % 4], n: 1, k: 1, trono: tronos[i % Math.max(1, tronos.length)] ?? null, ev: 0, x: 0, y: 0, giro: GIRO[tipos[i % 4]], fase: 'espera' as Fase, cuenta: false, timer: 0, id: ++ids }));
        const juntas = junta(lista, POOL - vivas.length);
        const colocadas = colocarCaida(juntas.map((v) => ({ tipo: v.tipo, n: v.n, trono: v.trono, de: 'golpe' as const })));
        coloca(juntas, colocadas);
        const salen = juntas.filter((v) => v.el);
        salen.forEach((v, k) => lanza(v, k, salen.length));
        return salen.length;
      },
      /** Las posadas, con su centro (para pasar el cursor por encima). */
      quietas: () => vivas.filter((v) => v.fase === 'quieta').map((v) => ({ x: Math.round(v.x), y: Math.round(v.y) })),
      reset: () => {
        for (const k of ['lanzadas', 'llegadas', 'aspiradas', 'imanes', 'directas', 'juntadas', 'sinSitio', 'maxVivas'] as const) imanQa[k] = 0;
        imanQa.props.clear();
        imanQa.vida.length = 0;
        imanQa.esperas.length = 0;
      },
    },
  });
