// Las cinco palabras clave del juego (V11). Todo lo demás se dice con palabras llanas.
// La interfaz las resalta en negrita allí donde aparezcan y encadena su definición en los globos
// de ayuda; el reglamento (REGLAS.md) las lista desde aquí.
import { fill } from './balance-config';
import { cifrasPalabra } from './cifras';

export interface Keyword {
  id: string;
  name: string;
  /** Cómo aparece escrita en los textos del juego. */
  match: RegExp;
  /** Cómo aparece escrita en los textos ingleses (V10). El nombre y la definición inglesa viven en src/shared/i18n/en.ts. */
  matchEn: RegExp;
  desc: string;
}

/** Cifras de las definiciones (`golpe` de balance-config.json): ninguna se escribe a mano. */
const C = cifrasPalabra();

export const KEYWORDS: Keyword[] = [
  // Los `id` no cambian (los usa el cliente para el globo de ayuda); el nombre y el texto, sí.
  // «Daño» solo es palabra clave con mayúscula inicial: «daño» en minúscula es la palabra corriente.
  {
    id: 'fuerza',
    name: 'Daño',
    match: /(?<![\p{L}\p{N}])Daño(?![\p{L}\p{N}])/gu,
    matchEn: /(?<![\p{L}\p{N}])Damage(?![\p{L}\p{N}])/gu,
    desc: 'Lo que suman tus cartas: su número, del 1 al 9 (el As vale 11). Contra el trono de su palo, 0: es Inmune.',
  },
  {
    id: 'resonancia',
    name: 'Multi',
    match: /(?<![\p{L}\p{N}])Multi(?![\p{L}\p{N}])/gu,
    matchEn: /(?<![\p{L}\p{N}])Mult(?![\p{L}\p{N}])/gu,
    desc: 'Lo que multiplica al Daño: Daño × Multi = Golpe. Siempre es entero. Lo pone la formación y lo suben reliquias y acabados.',
  },
  {
    id: 'limpio',
    name: 'Golpe exacto',
    match: /(?<![\p{L}\p{N}])(?:golpes? exactos?|¡EXACTO!)(?![\p{L}\p{N}])/giu,
    matchEn: /(?<![\p{L}\p{N}])(?:exact hits?|EXACT!)(?![\p{L}\p{N}])/giu,
    desc: fill('Abatir a un guardia con el Golpe justo: sin Contraataque, +{oro} de oro, robás 1, Impulso (el siguiente pierde {impulso} de su Vida) y Racha (+{racha} de Multi al próximo golpe, hasta +{tope}).', C),
  },
  {
    id: 'fractura',
    name: 'Expuesto',
    match: /(?<![\p{L}\p{N}])expuest[oa]s?(?![\p{L}\p{N}])/giu,
    matchEn: /(?<![\p{L}\p{N}])exposed(?![\p{L}\p{N}])/giu,
    desc: fill('Lo deja un golpe de un solo palo (2 cartas o más). El próximo golpe contra ese trono hace ×{expuesto} de Daño.', C),
  },
  {
    id: 'desarmada',
    name: 'Aturdido',
    match: /(?<![\p{L}\p{N}])aturdid[oa]s?(?![\p{L}\p{N}])/giu,
    matchEn: /(?<![\p{L}\p{N}])stun(?:ned|s)?(?![\p{L}\p{N}])/giu,
    desc: 'Un trono Aturdido se salta su próximo Contraataque. Lo dejan un golpe de 3 palos, el Motín (Comodín) y El Espía.',
  },
];
/** El patrón de una palabra clave en ese idioma. */
const patron = (k: Keyword, lang: 'es' | 'en') => (lang === 'en' ? k.matchEn : k.match);

/** Palabras clave que aparecen en un texto (sin etiquetas HTML). */
export function keywordsIn(text: string): Keyword[] {
  return keywordsInFor('es', text);
}

/** `keywordsIn` en un idioma: en inglés busca «Damage», «Mult», «Exact Hit»… */
export function keywordsInFor(lang: 'es' | 'en', text: string): Keyword[] {
  const plain = text.replace(/<[^>]*>/g, ' ');
  return KEYWORDS.filter((k) => new RegExp(patron(k, lang).source, patron(k, lang).flags).test(plain));
}

/** Envuelve cada palabra clave en <b class="kw">, sin tocar lo que ya va dentro de una etiqueta. */
export function markKeywords(html: string): string {
  return markKeywordsFor('es', html);
}

/** `markKeywords` en un idioma: el mismo `data-kw` (el `id`) en los dos, para que el globo de ayuda no cambie. */
export function markKeywordsFor(lang: 'es' | 'en', html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith('<')) return part;
      let out = part;
      for (const k of KEYWORDS) out = out.replace(new RegExp(patron(k, lang).source, patron(k, lang).flags), (m) => `\u0001${k.id}\u0002${m}\u0003`);
      return out;
    })
    .join('')
    .replace(/\u0001(\w+)\u0002/g, '<b class="kw" data-kw="$1">')
    .replace(/\u0003/g, '</b>');
}

/**
 * Vocabulario de mesa que se escribe con mayúscula pero NO es palabra clave (no lleva definición
 * encadenada ni cuenta para el límite de cinco): las partes de la mesa, los poderes de palo y las
 * jugadas con nombre propio. La constitución (tests/invariantes.test.ts) las acepta en mitad de frase.
 */
export const TERMS: string[] = [
  'Vida',
  'Escudo',
  'Ataque',
  'Golpe',
  'Golpes',
  'Mazo',
  'Descarte',
  'Contraataque',
  'Contraataques',
  'Impulso',
  'Racha',
  'Perfora',
  'Perforan',
  'Salpica',
  'Cura',
  'Inmune',
  'Comodín',
  'Comodines',
  'Motín',
  'Manga',
  'Furia',
  'Reliquia',
  'Reliquias',
  'Ases',
  'Sotas',
  'Caballos',
  'Reyes',
  'Sota',
  'Caballo',
  'Rey',
  'Bufón',
  'Reinado',
  'Juramento',
  'Juramentos',
  'Pergamino',
  'Sobre',
  'Pulpería',
  'Altar',
  'Mesa',
  'Tratante',
  'Orden',
  'Coronas',
  'Trono',
  'Tronos',
  'Asalto',
  'Atajo',
  'Secreto',
  'Lacre',
  'Cristal',
  'Espadas',
  'Bastos',
  'Oros',
  'Copas',
  'ESPADAS',
  'BASTOS',
  'OROS',
  'COPAS',
];
