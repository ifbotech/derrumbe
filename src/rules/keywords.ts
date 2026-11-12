// Las seis palabras clave del juego. Todo lo demás se dice con palabras llanas.
// La interfaz las resalta en negrita allí donde aparezcan y encadena su definición en los globos
// de ayuda; el reglamento (REGLAS.md) las lista desde aquí.

export interface Keyword {
  id: string;
  name: string;
  /** Cómo aparece escrita en los textos del juego. */
  match: RegExp;
  desc: string;
}

export const KEYWORDS: Keyword[] = [
  { id: 'fuerza', name: 'Fuerza', match: /\bFuerza\b/g, desc: 'Lo que suman tus cartas: su número, doblado con ventaja de material y anulado contra la torre de su propio palo.' },
  { id: 'resonancia', name: 'Resonancia', match: /\bResonancia\b/g, desc: 'Lo que multiplica a la Fuerza. La pone la formación; lo que la suma cuenta donde está y lo que la multiplica, multiplica todo lo anterior.' },
  {
    id: 'limpio',
    name: 'Golpe limpio',
    match: /\bgolpes? limpios?\b/gi,
    desc: 'Tirar un piso con el daño exacto. La sirena calla, cobras 1 de oro, robas 1 carta, el piso de abajo pierde un cuarto de su resistencia y tu próximo golpe resuena +0,5 (la racha se acumula hasta +2).',
  },
  { id: 'fractura', name: 'Fractura', match: /\bfractura(?:s|n)?\b/gi, desc: 'La deja un golpe de un solo palo (2 cartas o más). El próximo golpe contra esa torre resuena ×1,5.' },
  { id: 'apuntalado', name: 'Apuntalado', match: /\bapuntalad[oa]s?\b/gi, desc: 'El primer golpe contra ese piso resuena a la mitad. Lo traen algunos jefes y niveles de obra.' },
  {
    id: 'desarmada',
    name: 'Desarmada',
    match: /\bdesarm(?:ad[oa]s?|ar|an|a)\b/gi,
    desc: 'Una torre desarmada no golpea cuando la sirena saca su palo. La huelga (comodín) la desarma hasta que caiga el piso; un golpe que mezcla 3 palos, solo para su próxima sirena (×1).',
  },
];

/** Palabras clave que aparecen en un texto (sin etiquetas HTML). */
export function keywordsIn(text: string): Keyword[] {
  const plain = text.replace(/<[^>]*>/g, ' ');
  return KEYWORDS.filter((k) => new RegExp(k.match.source, k.match.flags).test(plain));
}

/** Envuelve cada palabra clave en <b class="kw">, sin tocar lo que ya va dentro de una etiqueta. */
export function markKeywords(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith('<')) return part;
      let out = part;
      for (const k of KEYWORDS) out = out.replace(new RegExp(k.match.source, k.match.flags), (m) => `\u0001${k.id}\u0002${m}\u0003`);
      return out;
    })
    .join('')
    .replace(/\u0001(\w+)\u0002/g, '<b class="kw" data-kw="$1">')
    .replace(/\u0003/g, '</b>');
}
