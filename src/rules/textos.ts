// Textos que el motor deja escritos en español dentro del estado y de los eventos (V10), puestos en otro
// idioma sin tocar el motor: los pasos de la cuenta (`step.label`), las líneas del cobro (`run.pay`) y los
// errores que devuelven las reglas. Puro. En español devuelve el texto tal cual, letra por letra.
//
//   pasoFor(lang, ev)       la etiqueta de un paso de la cuenta («Broquel: +2 de Escudo» → «Buckler: +2 Shield»)
//   cobroFor(lang, label)   una línea de `run.pay` («Asalto ganado» → «Assault won»)
//   errorFor(lang, msg)     un error de `applyAction` / `runAction` («No es tu turno.» → «It is not your turn.»)
//   autopsyFor / omenFor    la causa de la derrota y el aviso de último turno (autopsy.ts) en un idioma
//
// Lo que no reconoce no lo inventa: un paso con una nota desconocida se queda en su cabecera traducida,
// y un error desconocido sale en español (la prueba de paridad recorre todos los que hay hoy).
import { DICCIONARIOS, type Lang, tFor } from '../shared/i18n';
import { type Autopsy, type Omen, type TextosAutopsia, TEXTOS_ES, autopsyWith, omenWith } from './autopsy';
import type { Config, GameEvent, PlayerView } from './engine';
import { ES_PLANTILLAS } from './plantillas';

type Paso = Extract<GameEvent, { e: 'step' }>;

/** Prefijos de clave cuyo valor español es un nombre propio que puede ir en la cabecera de un paso. */
const NOMBRES = /^(?:reliquia\.[^.]+\.nombre|especial\.[^.]+\.nombre|formacion\.[^.]+|sello\.[^.]+\.nombre|acabado\.[^.]+\.nombre|estado\.[^.]+\.nombre|monarca\.[^.]+\.decreto|paso\.(?:racha|carga|asedio))$/;

let nombresEs: Map<string, string> | null = null;
/** Nombre español → clave («Broquel» → «reliquia.encofrado.nombre»). */
function nombres(): Map<string, string> {
  if (nombresEs) return nombresEs;
  nombresEs = new Map();
  for (const [k, v] of Object.entries(DICCIONARIOS.es)) if (NOMBRES.test(k) && !nombresEs.has(v)) nombresEs.set(v, k);
  return nombresEs;
}

/** Plantilla española → expresión que la reconoce, con un grupo con nombre por `{campo}`. */
const reDe = (plantilla: string) =>
  new RegExp(`^${plantilla.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '{' || c === '}' ? c : `\\${c}`)).replace(/\{(\w+)\}/g, '(?<$1>.+?)')}$`, 'u');

/** Letras fijas de una plantilla (sin sus `{campo}`): cuantas más, más concreta. */
const fijas = (plantilla: string) => plantilla.replace(/\{\w+\}/g, '').length;
/** Las plantillas de un prefijo, de la más concreta a la más general («{n} a los tronos vecinos» antes que «{n} a {palo}»). */
const grupo = (prefijo: string) =>
  Object.entries(ES_PLANTILLAS)
    .filter(([k]) => k.startsWith(prefijo))
    .sort((a, b) => fijas(b[1]) - fijas(a[1]));

/** Reconoce un texto español contra un grupo de plantillas (por prefijo de clave) y lo rehace en `lang`. */
function rehacer(lang: Lang, prefijo: string, texto: string, traducir: (campo: string, valor: string) => string = (_c, v) => v): string | null {
  for (const [k, plantilla] of grupo(prefijo)) {
    const m = reDe(plantilla).exec(texto);
    if (!m) continue;
    const valores = Object.fromEntries(Object.entries(m.groups ?? {}).map(([c, v]) => [c, traducir(c, v)]));
    return tFor(lang, k, valores);
  }
  return null;
}

/** Un nombre propio en `lang` («Broquel» → «Buckler»); las etiquetas de carta (7♠, A♦) no cambian. */
function nombreEn(lang: Lang, es: string): string {
  const k = nombres().get(es);
  return k ? tFor(lang, k) : es;
}

/** Cabecera de un paso: nombres separados por « · » (carta y su acabado) o « → » (Espejo de mano y lo que copia). */
const cabecera = (lang: Lang, es: string) =>
  es
    .split(' → ')
    .map((a) => a.split(' · ').map((b) => nombreEn(lang, b)).join(' · '))
    .join(' → ');

/** El nombre del palo en mayúsculas («PICAS» → «SPADES»). */
function paloEn(lang: Lang, es: string): string {
  for (const s of ['S', 'D', 'H', 'C']) if (tFor('es', `palo.${s}`) === es) return tFor(lang, `palo.${s}`);
  return es;
}

/** La nota de un paso («+2 de Escudo», «12 a PICAS», la descripción de una especial). */
function nota(lang: Lang, es: string): string | null {
  // la descripción de una carta especial que no dejó otro rastro
  for (const [k, v] of Object.entries(DICCIONARIOS.es)) if (/^especial\.[^.]+\.desc$/.test(k) && v === es) return tFor(lang, k);
  return rehacer(lang, 'paso.', es, (campo, valor) => {
    if (campo === 'palo') return paloEn(lang, valor);
    if (campo === 'carta') return nombreEn(lang, valor);
    if (campo === 'por') return rehacer(lang, 'paso.frenado', valor) ?? valor;
    return valor;
  });
}

/** La etiqueta de un paso de la cuenta en `lang`. En español, la del motor tal cual. */
export function pasoFor(lang: Lang, ev: Paso): string {
  if (lang === 'es') return ev.label;
  // la cabecera es un nombre conocido, y lo que sigue a «: », su nota
  const i = ev.label.indexOf(': ');
  if (i < 0) return cabecera(lang, ev.label);
  const head = ev.label.slice(0, i);
  const tail = ev.label.slice(i + 2);
  const n = nota(lang, tail);
  return n === null ? cabecera(lang, head) : `${cabecera(lang, head)}: ${n}`;
}

/** Una línea del cobro (`run.pay`) en `lang`. Las de cifra fija y el nombre de la Bolsa de monedas. */
export function cobroFor(lang: Lang, label: string): string {
  if (lang === 'es') return label;
  for (const k of ['cuenta.asalto', 'cuenta.exactos', 'cuenta.vida', 'cuenta.interes']) if (tFor('es', k) === label) return tFor(lang, k);
  return nombreEn(lang, label);
}

/** Un error de las reglas en `lang`. Desconocido: tal cual. */
export function errorFor(lang: Lang, msg: string): string {
  if (lang === 'es') return msg;
  return rehacer(lang, 'error.', msg) ?? msg;
}

/** Los textos de la autopsia en `lang` (en español, los de siempre). */
function textosAutopsia(lang: Lang): TextosAutopsia {
  if (lang === 'es') return TEXTOS_ES;
  return {
    t: (clave, valores) => tFor(lang, clave, valores),
    especial: (id) => tFor(lang, `especial.${id}.nombre`),
    reliquia: (id) => tFor(lang, `reliquia.${id}.nombre`),
    palo: (s) => tFor(lang, `palo.${s}`),
    arena: () => tFor(lang, 'monarca.inestable.decreto'),
  };
}

/** La causa de la derrota en `lang` (ver `autopsy`). */
export const autopsyFor = (lang: Lang, events: GameEvent[], cfg: Config): Autopsy | null => autopsyWith(textosAutopsia(lang), events, cfg);

/** El aviso de último turno en `lang` (ver `omen`). */
export const omenFor = (lang: Lang, v: PlayerView): Omen | null => omenWith(textosAutopsia(lang), v);
