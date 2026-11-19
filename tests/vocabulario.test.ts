// Red 1 contra la jerga vieja (V6): nada de lo que lee una persona usa el vocabulario de obra y
// demolición. Recorre:
//   · los datos de src/rules (cada nombre, descripción, etiqueta, opción…),
//   · los literales de texto con aspecto de frase de src/**/*.ts (con algún espacio y alguna letra;
//     se quitan etiquetas HTML salvo los atributos que se leen, interpolaciones, selectores, rutas
//     e identificadores),
//   · README.md, REGLAS.md e index.html.
// Falla con archivo y texto. Los identificadores internos (`id`, claves `derrumbe:*` del guardado,
// la ruta `/derrumbe/` de GitHub Pages) no se leen y no cuentan.
// V40: además, la baraja es la española: ni los palos franceses (en español ni en inglés) ni sus signos ♠♥♦♣, ni
// la Taberna (hoy La Pulpería) ni el Árbol (hoy el Altar).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as achievements from '../src/rules/achievements';
import * as engine from '../src/rules/engine';
import * as keywords from '../src/rules/keywords';
import * as run from '../src/rules/run';
import * as specials from '../src/rules/specials';
import * as tools from '../src/rules/tools';
import * as bufon from '../src/rules/bufon';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Palabras prohibidas, sobre el texto en minúsculas y sin tildes. Por palabra entera donde la palabra es corriente. */
const PROHIBIDAS: [string, RegExp][] = [
  ['derrumbe', /\bderrumb/],
  ['búnker', /\bbunker/],
  ['escombrera', /\bescombrera/],
  ['cantera', /\bcantera/],
  ['ferretería / ferretero', /\bferreter/],
  ['andamio', /\bandamio/],
  ['hormigón', /\bhormigon/],
  ['ladrillo', /\bladrillo/],
  ['acero', /\baceros?\b/],
  ['vidrio', /\bvidrio/],
  ['sirena', /\bsirena/],
  ['obra', /\bobras?\b/],
  ['demolición / demoler', /\bdemol|\bdemuel/],
  ['capataz', /\bcapata(?:z|ces)\b/],
  ['gremio', /\bgremio/],
  ['sindical', /\bsindical/],
  ['cimientos', /\bcimiento/],
  ['tiza', /\btizas?\b/],
  ['forja', /\bforjas?\b/],
  ['quemador', /\bquemador/],
  ['piso', /\bpisos?\b/],
  ['torre', /\btorres?\b/],
  ['muro', /\bmuros?\b/],
  ['integridad', /\bintegridad/],
  ['Fuerza', /\bfuerza/],
  ['Resonancia', /\bresonan/],
  ['golpe limpio', /\bgolpes? limpios?\b/],
  ['fractura', /\bfractura/],
  ['apuntalad', /\bapuntala/],
  ['huelga', /\bhuelga/],
  ['herramienta', /\bherramienta/],
  ['cinturón', /\bcinturon/],
  ['regicid', /\bregicid/],
  // desde la 6.1: el título viejo y el nombre viejo de la tienda
  ['Corona rota (título viejo)', /\bcorona rota\b/],
  ['Mercado clandestino (hoy La Pulpería)', /\bmercado clandestino\b/],
  // V40: la baraja española y los nombres nuevos
  ['Picas (hoy Espadas)', /\bpicas\b/],
  ['Corazones (hoy Copas)', /\bcorazones\b/],
  ['Diamantes (hoy Oros)', /\bdiamantes\b/],
  ['Tréboles (hoy Bastos)', /\btrebol(?:es)?\b/],
  ['Spades (hoy Swords)', /\bspades\b/],
  ['Hearts (hoy Cups)', /\bhearts\b/],
  ['Diamonds (hoy Coins)', /\bdiamonds\b/],
  ['signo de palo francés', /[♠♥♦♣♤♡♢♧]/],
  ['Taberna (hoy La Pulpería)', /\btabernas?\b/],
  ['Tavern (hoy General Store)', /\btaverns?\b/],
  ['Árbol (hoy el Altar)', /\barbol\b/],
  ['Conspiracy Tree (hoy the Altar)', /\bconspiracy tree\b/],
  // V40 (1b): las seis barajas de inicio pasaron a ser los 5 Mazos
  ['Baraja de la conjura (hoy la Escoba)', /\bbaraja de la conjura\b/],
  ['Baraja negra (hoy el Truco)', /\bbaraja negra\b/],
  ['Baraja del prestamista (hoy el Chinchón)', /\bbaraja del prestamista\b/],
  ['Baraja de ases (hoy El Mentiroso)', /\bbaraja de ases\b/],
  ['Baraja corta (hoy Chancho Va)', /\bbaraja corta\b/],
  ['Baraja del caos', /\bbaraja del caos\b/],
  ['las barajas de inicio en inglés (hoy los Decks)', /\b(?:conspiracy|black|moneylender'?s|chaos|short) deck\b|\bdeck of aces\b/],
  // V40 (1c): los siete monarcas sueltos y los cinco rasgos de build se fueron; los sustituyen los 4 Reyes y sus Bendiciones
  ['los siete monarcas (hoy los 4 Reyes)', /\b(?:rey de dos caras|usurero|dama del caliz|reina helada|inquisidor|verdugo|relojero)\b/],
  ['los siete monarcas en inglés (hoy the 4 Kings)', /\b(?:two-faced king|usurer|chalice lady|frost queen|inquisitor|butcher|clockmaker)\b/],
  ['los rasgos de build (hoy las Bendiciones)', /\b(?:rasgos? de build|dado del tahur|bastion|horda)\b/],
  ['los rasgos de build en inglés (hoy the Blessings)', /\b(?:build traits?|gambler'?s die|executioner|bastion|horde)\b/],
  // V40 (1d): las 52 Reliquias pasaron a ser los 22 Amuletos (y las 25 especiales, las 8 Trampas del Bufón)
  ['Reliquia (hoy Amuleto)', /\breliquias?\b/],
  ['Relic (hoy Amulet)', /\brelics?\b/],
  ['relicario (hoy la faja)', /\brelicario|\breliquary\b/],
];

/**
 * Excepciones justificadas: [archivo (sufijo de ruta), trozo exacto del texto]. Cada una dice por qué.
 * Mantener corta: si algo de aquí lo lee un jugador, no es una excepción, es una errata.
 */
const EXCEPCIONES: [string, string, string][] = [
  // V40: las causas que guardaron las crónicas de la V8 llevan el signo ♣; esta plantilla solo se lee para reconocerlas y
  // traducirlas (lo que se enseña en inglés ya dice «Clubs card»)
  ['src/client/causa.ts', 'Un ♣ más o un Golpe exacto', 'legado: así lo guardaron las actas de la V8'],
  // V40 1d: las claves de diccionario de los Amuletos conservan su prefijo (`reliquia.<id>.nombre`); son claves, no texto
  ['src/rules/textos.ts', 'reliquia. ·', 'clave de diccionario, no se lee'],
  ['src/shared/i18n/en.ts', 'reliquia. ·', 'clave de diccionario, no se lee'],
  ['src/shared/i18n/es.ts', 'reliquia. ·', 'clave de diccionario, no se lee'],
  ['src/client/fx.ts', 'reliquia. ·', 'clave de diccionario, no se lee'],
  ['src/client/lengua.ts', 'reliquia. ·', 'clave de diccionario, no se lee'],
];

const llano = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function prohibidasEn(texto: string): string[] {
  const t = llano(texto);
  return PROHIBIDAS.filter(([, re]) => re.test(t)).map(([w]) => w);
}

const excepcion = (archivo: string, texto: string) => EXCEPCIONES.some(([f, trozo]) => archivo.replace(/\\/g, '/').endsWith(f) && texto.includes(trozo));

function informe(archivo: string, textos: string[]): string[] {
  const malas: string[] = [];
  for (const t of textos) {
    const w = prohibidasEn(t);
    if (w.length && !excepcion(archivo, t)) malas.push(`${archivo}: «${t.trim().slice(0, 140)}» → ${w.join(', ')}`);
  }
  return malas;
}

// ───────────── 1 · datos de src/rules ─────────────

/** Todas las cadenas de un valor exportado, menos las que son identificadores (`piqueta`, `obra`, `S`, `j-blindaje`). */
function cadenas(v: unknown, out: string[], visto = new Set<unknown>()): string[] {
  if (typeof v === 'string') {
    if (!/^[a-z0-9_-]*$/i.test(v) || /^\p{Lu}/u.test(v)) out.push(v);
  } else if (v && typeof v === 'object' && !visto.has(v) && !(v instanceof RegExp)) {
    visto.add(v);
    for (const x of Object.values(v)) cadenas(x, out, visto);
  }
  return out;
}

// ───────────── 2 · literales de src/**/*.ts ─────────────

/** Saca los literales de cadena de un archivo TypeScript (sin comentarios ni expresiones regulares). */
export function literales(src: string): string[] {
  const out: string[] = [];
  const n = src.length;
  let i = 0;
  let ultimo = '';
  const comillas = (q: string): string => {
    let s = '';
    i++;
    while (i < n && src[i] !== q && src[i] !== '\n') {
      if (src[i] === '\\') {
        s += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      s += src[i++];
    }
    i++;
    return s;
  };
  const plantilla = (): string => {
    let s = '';
    i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') {
        s += src[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (src[i] === '$' && src[i + 1] === '{') {
        i += 2;
        codigo(true);
        s += ' · ';
        continue;
      }
      s += src[i++];
    }
    i++;
    return s;
  };
  const regex = () => {
    i++;
    let clase = false;
    while (i < n && src[i] !== '\n') {
      const d = src[i];
      if (d === '\\') {
        i += 2;
        continue;
      }
      if (d === '[') clase = true;
      else if (d === ']') clase = false;
      else if (d === '/' && !clase) break;
      i++;
    }
    i++;
    while (i < n && /[a-z]/i.test(src[i])) i++;
  };
  function codigo(hastaLlave: boolean): void {
    let prof = 0;
    while (i < n) {
      const c = src[i];
      if (c === '}' && hastaLlave && prof === 0) {
        i++;
        return;
      }
      if (c === '/' && src[i + 1] === '/') {
        while (i < n && src[i] !== '\n') i++;
        continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        const e = src.indexOf('*/', i + 2);
        i = e < 0 ? n : e + 2;
        continue;
      }
      if (c === "'" || c === '"') {
        out.push(comillas(c));
        ultimo = 'a';
        continue;
      }
      if (c === '`') {
        out.push(plantilla());
        ultimo = 'a';
        continue;
      }
      if (c === '/' && (ultimo === '' || '(,=:[!&|?{};+-*%<>~^'.includes(ultimo) || /\b(?:return|typeof|case|in|of|void)\s*$/.test(src.slice(Math.max(0, i - 9), i)))) {
        regex();
        ultimo = 'a';
        continue;
      }
      if (c === '{') prof++;
      else if (c === '}') prof--;
      if (!/\s/.test(c)) ultimo = c;
      i++;
    }
  }
  codigo(false);
  return out;
}

/** Lo que de verdad se lee de un literal: sin etiquetas (salvo atributos legibles), rutas, selectores ni identificadores. */
function legible(s: string): string {
  return s
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, (tag) => [...tag.matchAll(/\b(?:title|aria-label|alt|placeholder|data-tip|content|label)\s*=\s*"([^"]*)"/g)].map((m) => ` ${m[1]} `).join(''))
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\bderrumbe:[\w:.-]*/gi, ' ') // claves de localStorage
    .replace(/\/derrumbe\//gi, ' ') // ruta de GitHub Pages
    .replace(/(^|[\s(,])[.#][\w-]+/g, '$1 ') // selectores
    .replace(/\b[\w]+(?:[-_:/.][\w]+)+\b/g, ' ') // identificadores compuestos, rutas, archivos
    .replace(/\b\w+[-_:] · /g, ' ') // prefijos de clase o de clave con interpolación («forja-${x}»)
    .replace(/\b\p{Ll}+\p{Lu}[\p{L}\d]*\b/gu, ' '); // camelCase
}

const pareceFrase = (s: string) => /\s/.test(s.trim()) && /\p{L}{2,}/u.test(s);

function archivosTs(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return archivosTs(p);
    return /\.ts$/.test(f) && !/\.d\.ts$/.test(f) ? [p] : [];
  });
}

// ───────────── 3 · documentos ─────────────

function textoMarkdown(md: string): string[] {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .split('\n')
    .map((l) => legible(l.replace(/`[^`]*`/g, ' ').replace(/\]\([^)]*\)/g, '] ')))
    .filter((l) => /\p{L}/u.test(l));
}

function textoHtml(html: string): string[] {
  return legible(html.replace(/<!--[\s\S]*?-->/g, ' '))
    .split('\n')
    .filter((l) => /\p{L}/u.test(l));
}

describe('vocabulario del juego: nada de jerga vieja en lo que se lee', () => {
  it('el detector reconoce las palabras prohibidas y deja en paz las nuevas', () => {
    expect(prohibidasEn('El búnker aguanta')).toEqual(['búnker']);
    expect(prohibidasEn('Cada golpe limpio suma')).toEqual(['golpe limpio']);
    expect(prohibidasEn('La Torre de ESPADAS')).toEqual(['torre']);
    expect(prohibidasEn('Contraataque de ESPADAS: Ataque 14 contra Escudo 3 → entran 11')).toEqual([]);
    // V40: los palos franceses y sus signos, fuera; el corazón suelto (Corazón de piedra) no es un palo
    expect(prohibidasEn('Contraataque de PICAS')).toEqual(['Picas (hoy Espadas)']);
    expect(prohibidasEn('+3 de Daño por cada ♥')).toEqual(['signo de palo francés']);
    expect(prohibidasEn('Corazón de piedra')).toEqual([]);
    expect(prohibidasEn('Mazo agotado: pierdes 5 de Vida; el Escudo no lo frena')).toEqual([]);
    // palabra entera: «obrar», «pisotón» o «torreón» no son el piso ni la torre de antes
    expect(prohibidasEn('Maniobra, pisotón y refuerzas')).toEqual([]);
    expect(prohibidasEn('CORONA ROTA · La conjura')).toEqual(['Corona rota (título viejo)']);
    expect(prohibidasEn('Todo en el Mercado clandestino')).toEqual(['Mercado clandestino (hoy La Pulpería)']);
    expect(prohibidasEn('Las Coronas de la Orden; en la Pulpería, el Tratante')).toEqual([]);
    expect(prohibidasEn('en la Taberna, el Tratante')).toEqual(['Taberna (hoy La Pulpería)']);
    expect(literales("const a = 'hola mundo'; // 'comentario con torre'\nconst b = `x ${'dentro de plantilla'} y`; const r = /'no'/g;")).toEqual(['hola mundo', 'dentro de plantilla', 'x  ·  y']);
  });

  it('los datos de src/rules (nombres, descripciones, etiquetas, opciones)', () => {
    const modulos: [string, object][] = [
      ['src/rules/engine.ts', engine],
      ['src/rules/keywords.ts', keywords],
      ['src/rules/tools.ts', tools],
      ['src/rules/specials.ts', specials],
      ['src/rules/run.ts', run],
      ['src/rules/achievements.ts', achievements],
      ['src/rules/bufon.ts', bufon],
    ];
    const malas = modulos.flatMap(([f, m]) => informe(f, cadenas(m, [])));
    expect(malas).toEqual([]);
  });

  it('la voz de los monarcas, sus placas y la lectura rápida de los secretos (V7)', () => {
    const textos = [
      ...run.BOSSES.flatMap((b) => [b.barks.entrada, b.barks.contraataque, b.barks.caida, b.curse.badge]),
      ...run.EVENTS.flatMap((e) => e.options.flatMap((o) => [o.read.gain, o.read.cost])),
      ...bufon.FRASES_BUFON.map((f) => f.texto),
    ].filter(Boolean);
    expect(textos.length).toBeGreaterThan(40);
    expect(informe('src/rules/run.ts', textos)).toEqual([]);
  });

  it('los literales con aspecto de frase de src/**/*.ts', () => {
    const malas = archivosTs(join(ROOT, 'src')).flatMap((p) => {
      const f = relative(ROOT, p).replace(/\\/g, '/');
      const textos = literales(readFileSync(p, 'utf8')).map(legible).filter(pareceFrase);
      return informe(f, textos);
    });
    expect(malas).toEqual([]);
  });

  it('README.md, REGLAS.md e index.html', () => {
    const malas = [
      ...informe('README.md', textoMarkdown(readFileSync(join(ROOT, 'README.md'), 'utf8'))),
      ...informe('REGLAS.md', textoMarkdown(readFileSync(join(ROOT, 'REGLAS.md'), 'utf8'))),
      ...informe('index.html', textoHtml(readFileSync(join(ROOT, 'index.html'), 'utf8'))),
    ];
    expect(malas).toEqual([]);
  });
});
