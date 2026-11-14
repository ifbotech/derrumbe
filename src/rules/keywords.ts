// Las seis palabras clave del juego. Todo lo demás se dice con palabras llanas.
// La interfaz las resalta en negrita allí donde aparezcan y encadena su definición en los globos
// de ayuda; el reglamento (REGLAS.md) las lista desde aquí.

export interface Keyword {
  id: string;
  name: string;
  /** Cómo aparece escrita en los textos del juego. */
  match: RegExp;
  /** Cómo aparece escrita en los textos ingleses (V10). El nombre y la definición inglesa viven en src/shared/i18n/en.ts. */
  matchEn: RegExp;
  desc: string;
}

export const KEYWORDS: Keyword[] = [
  // Los `id` no cambian (los usa el cliente para el globo de ayuda); el nombre y el texto, sí.
  // «Daño» solo es palabra clave con mayúscula inicial: «daño» en minúscula es la palabra corriente.
  {
    id: 'fuerza',
    name: 'Daño',
    match: /(?<![\p{L}\p{N}])Daño(?![\p{L}\p{N}])/gu,
    matchEn: /(?<![\p{L}\p{N}])Damage(?![\p{L}\p{N}])/gu,
    desc: 'Lo que suman tus cartas: su número, el doble con ventaja de palo y nada contra el trono de su palo (Inmune).',
  },
  {
    id: 'resonancia',
    name: 'Multi',
    match: /(?<![\p{L}\p{N}])Multi(?![\p{L}\p{N}])/gu,
    matchEn: /(?<![\p{L}\p{N}])Mult(?![\p{L}\p{N}])/gu,
    desc: 'Lo que multiplica al Daño: Daño × Multi = Golpe. Lo pone la formación; lo que suma cuenta donde está y lo que multiplica, multiplica todo lo anterior.',
  },
  {
    id: 'limpio',
    name: 'Golpe exacto',
    match: /(?<![\p{L}\p{N}])(?:golpes? exactos?|¡EXACTO!)(?![\p{L}\p{N}])/giu,
    matchEn: /(?<![\p{L}\p{N}])(?:exact hits?|EXACT!)(?![\p{L}\p{N}])/giu,
    desc: 'Abatir a un guardia con el Golpe justo (igual a su Vida): sin Contraataque, +1 de oro, robas 1, Impulso (el siguiente guardia pierde ¼ de su Vida) y Racha (+0,5 de Multi al próximo golpe, hasta +2).',
  },
  {
    id: 'fractura',
    name: 'Brecha',
    match: /(?<![\p{L}\p{N}])brechas?(?![\p{L}\p{N}])/giu,
    matchEn: /(?<![\p{L}\p{N}])breach(?:es)?(?![\p{L}\p{N}])/giu,
    desc: 'La deja un golpe de un solo palo (2 cartas o más). El próximo golpe contra ese trono hace ×1,5 de Multi.',
  },
  {
    id: 'apuntalado',
    name: 'En guardia',
    match: /(?<![\p{L}\p{N}])en guardia(?![\p{L}\p{N}])/giu,
    matchEn: /(?<![\p{L}\p{N}])on guard(?![\p{L}\p{N}])/giu,
    desc: 'El primer golpe contra ese guardia hace la mitad de Multi (×0,5). Lo traen algunos monarcas y Reinados.',
  },
  {
    id: 'desarmada',
    name: 'Desarmado',
    match: /(?<![\p{L}\p{N}])desarm(?:ad[oa]s?|ar|an|a)(?![\p{L}\p{N}])/giu,
    matchEn: /(?<![\p{L}\p{N}])disarm(?:ed|s)?(?![\p{L}\p{N}])/giu,
    desc: 'Un trono Desarmado no ataca cuando el Contraataque saca su palo. El Motín (Comodín) lo desarma hasta que caiga su guardia; un golpe de 3 palos, solo para su próximo Contraataque (×1).',
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
 * encadenada ni cuenta para el límite de seis): las partes de la mesa, los poderes de palo y las
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
  'Asedio',
  'Ases',
  'Sotas',
  'Reinas',
  'Reyes',
  'Sota',
  'Reina',
  'Rey',
  'Reinado',
  'Juramento',
  'Juramentos',
  'Pergamino',
  'Sobre',
  'Taberna',
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
  'PICAS',
  'DIAMANTES',
  'CORAZONES',
  'TRÉBOLES',
];
