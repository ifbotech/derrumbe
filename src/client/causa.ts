// Causa de la derrota: el gráfico de dos líneas que explica por qué cayó la conjura (qué se llevó tu
// Vida y por qué no se evitó) y la barra pequeña que lo enseña en números: lo que venía, lo que frenó
// el Escudo, lo que entró y la Vida que te quedaba. Lo pintan igual la mesa, el final del asalto
// único, la crónica de campaña y el archivo. Los estilos están en acta.css.
import type { Autopsy } from '../rules/autopsy';
import { DICCIONARIOS, tFor } from '../shared/i18n';
import { esc } from './core';
import { L, getLang } from './lengua';

// ───────────── V10 · la causa en el idioma de la mesa ─────────────
// La causa se guarda con la campaña (y en el archivo de crónicas) ya escrita en español. Para leerla en
// inglés se reconoce contra las plantillas españolas de autopsy.ts (`causa.*`) y se rehace con las
// inglesas, con sus nombres propios traducidos. Lo que no se reconoce se deja como está.

/** Plantilla española → expresión que la reconoce, con un grupo con nombre por `{campo}`. */
const reDe = (plantilla: string) =>
  new RegExp(`^${plantilla.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === '{' || c === '}' ? c : `\\${c}`)).replace(/\{(\w+)\}/g, '(?<$1>.+?)')}$`, 'u');
let plantillas: [string, RegExp][] | null = null;
let nombres: Map<string, string> | null = null;
function tablas(): { plantillas: [string, RegExp][]; nombres: Map<string, string> } {
  if (!plantillas || !nombres) {
    const es = DICCIONARIOS.es;
    const fijas = (s: string) => s.replace(/\{\w+\}/g, '').length;
    plantillas = Object.keys(es)
      .filter((k) => k.startsWith('causa.'))
      .sort((a, b) => fijas(es[b]) - fijas(es[a]))
      .map((k) => [k, reDe(es[k])]);
    nombres = new Map();
    for (const [k, v] of Object.entries(es)) if (/^(?:palo\.[SDHC]|especial\.[^.]+\.nombre|reliquia\.[^.]+\.nombre|monarca\.[^.]+\.decreto)$/.test(k) && !nombres.has(v)) nombres.set(v, k);
  }
  return { plantillas, nombres };
}
/**
 * Formas de la causa que guardaron versiones anteriores (V8: «⚔ 14 contra Escudo 3», «te quitó», «lo
 * evitaban»): siguen en el archivo de crónicas y en campañas a medias. Plantilla española → inglesa.
 */
const LEGADO: [RegExp, string][] = [
  [reDe('{desde}: ⚔ {ataque} contra Escudo {frena} → entran {entra}'), '{desde}: Attack {ataque} against Shield {frena} → {entra} got through'],
  [reDe('{desde}: ⚔ {ataque} y ningún Escudo → entran {entra}'), '{desde}: Attack {ataque} and no Shield → {entra} got through'],
  [reDe('{queda}. Un ♣ más o un Golpe exacto lo evitaban.'), '{queda}. One more ♣ or an Exact Hit would have stopped it.'],
  [reDe('{queda}. Un ♣ más o un Golpe exacto lo evitaba.'), '{queda}. One more ♣ or an Exact Hit would have stopped it.'],
  [reDe('Mazo agotado: te quitó {n} de Vida y el Escudo no lo frena'), 'Deck ran out: it took {n} Health and Shield does not stop it'],
  [reDe('{queda}. Cada vez que se agota el Mazo quita 1 más: cuenta el Mazo antes de robar.'), '{queda}. Each time the Deck runs out it takes 1 more: count the Deck before drawing.'],
];
const rellena = (plantilla: string, v: Record<string, string | number>) => plantilla.replace(/\{(\w+)\}/g, (_, c: string) => String(v[c] ?? `{${c}}`));

/** Los campos de una plantilla reconocida: cifras, nombres o trozos que a su vez se reconocen. null si alguno no. */
function campos(m: RegExpExecArray, hondo: number): Record<string, string | number> | null {
  const out: Record<string, string | number> = {};
  for (const [c, v] of Object.entries(m.groups ?? {})) {
    if (/^\d+$/.test(v)) out[c] = Number(v);
    else {
      const r = rehacer(v, hondo + 1);
      if (r === null) return null;
      out[c] = r;
    }
  }
  return out;
}
function rehacer(texto: string, hondo = 0): string | null {
  const { plantillas: ps, nombres: ns } = tablas();
  const nombre = ns.get(texto);
  if (nombre) return tFor('en', nombre);
  if (/^\d+$/.test(texto) || hondo > 3) return null;
  for (const [k, re] of ps) {
    const m = re.exec(texto);
    const valores = m && campos(m, hondo);
    if (valores) return tFor('en', k, valores);
  }
  for (const [re, en] of LEGADO) {
    const m = re.exec(texto);
    const valores = m && campos(m, hondo);
    if (valores) return rellena(en, valores);
  }
  return null;
}
/** La causa en el idioma actual (en español, tal cual). */
export function deathIn(d: Autopsy): Autopsy {
  if (getLang() === 'es') return d;
  return { ...d, title: rehacer(d.title) ?? d.title, detail: rehacer(d.detail) ?? d.detail };
}

const KIND = { sirena: 'ui.causa.sirena', colapso: 'ui.causa.colapso', herida: 'ui.causa.herida', sin_cartas: 'ui.causa.sin_cartas' } as const satisfies Record<Autopsy['kind'], string>;

/** Una autopsia guardada (acta de archivo, campaña de otra versión) puede venir incompleta: solo se pinta si trae sus dos líneas. */
export const validDeath = (d: unknown): d is Autopsy => {
  const a = d as Partial<Autopsy> | null;
  return !!a && typeof a === 'object' && typeof a.title === 'string' && !!a.title && typeof a.detail === 'string';
};

const n = (x: unknown) => Math.max(0, Math.round(Number(x) || 0));

/**
 * La barra: arriba el ataque (Escudo que frena + lo que entra), debajo la Vida que te quedaba,
 * alineado con lo que entra para que se vea por cuánto no llegó. Las cifras van en la leyenda, no
 * dentro de los tramos: un tramo de 1 sobre 40 no tiene sitio para su número.
 */
export function causeBar(d: Autopsy): string {
  const threat = n(d.threat);
  const blocked = Math.min(n(d.blocked), threat);
  const taken = n(d.taken);
  const before = n(d.before);
  if (threat <= 0) {
    return `<div class="causa-barra solo" role="img" aria-label="${L('ui.causa.solo.aria', { n: before })}">
      <div class="cb-fila"><span>${L('ui.causa.vida')}</span><div class="cb-pista"><i class="cb-queda" style="flex:1 1 0"></i></div></div>
      <p class="cb-ley"><span class="l-queda"><i></i>${L('ui.causa.quedaba', { n: before })}</span><span class="l-nada">${L('ui.causa.nada')}</span></p>
    </div>`;
  }
  const max = Math.max(threat, blocked + before, 1);
  const seg = (cls: string, v: number) => (v > 0 ? `<i class="${cls}" style="flex:${v} 1 0"></i>` : '');
  return `<div class="causa-barra" role="img" aria-label="${L('ui.causa.aria', { t: threat, b: blocked, e: taken, v: before })}">
    <div class="cb-fila"><span>${L('ui.causa.ataque')}</span><div class="cb-pista">${seg('cb-muro', blocked)}${seg('cb-entra', taken)}${seg('cb-aire', max - blocked - taken)}</div></div>
    <div class="cb-fila"><span>${L('ui.causa.vida')}</span><div class="cb-pista">${seg('cb-aire', blocked)}${seg('cb-queda', before)}${seg('cb-aire', max - blocked - before)}</div></div>
    <p class="cb-ley"><span class="l-viene">${L('ui.causa.venia', { n: threat })}</span><span class="l-muro"><i></i>${L('ui.causa.frena', { n: blocked })}</span><span class="l-entra"><i></i>${L('ui.causa.entro', { n: taken })}</span><span class="l-queda"><i></i>${L('ui.causa.quedaba', { n: before })}</span></p>
  </div>`;
}

/** El bloque entero: rótulo, las dos líneas y la barra. */
export function causeHtml(d0: Autopsy, cls = ''): string {
  const d = deathIn(d0);
  return `<section class="causa k-${d.kind} ${cls}" aria-label="${L('ui.causa.titulo')}">
    <h2><span>${L('ui.causa.titulo')}</span><em>${KIND[d.kind] ? L(KIND[d.kind]) : ''}</em></h2>
    <p class="causa-1">${esc(d.title)}</p>
    <p class="causa-2">${esc(d.detail)}</p>
    ${causeBar(d)}
  </section>`;
}

/** Las dos líneas en texto llano, para el acta que se copia. */
export const causeText = (d0: Autopsy): string => {
  const d = deathIn(d0);
  return `${L('ui.causa.texto', { t: d.title })}\n   ${d.detail}`;
};
