// V40 1d · Los sellos de nivel S · A · B de cada pieza (Amuleto, Trampa del Bufón y Bendición), tal como los calcula
// el laboratorio: `npm run analyze:meta -- sellos` (por tramos: `-- sellos --tramo=1/3` … y `-- sellos --juntar`).
//
// Cada pieza se da de salida en las mismas campañas que la de control (mismas semillas, los 5 Mazos por turno, Altar
// vacío y lleno a medias, Reinado 1) y su efecto es la diferencia de victorias con el control. Dentro de cada clase, el
// tercio de arriba lleva S, el de abajo B y el resto A (a igualdad, por `id`). Puro: lo usa analyze-meta.ts y lo prueba
// tests/piezas.test.ts. El resultado va a balance-config.json (`sellosNivel`) y el detalle a scripts/sellos-report.json.
import type { SelloNivel } from '../src/rules/balance-config';

/** Una pieza medida: su `id`, su efecto (puntos de victoria frente al control) y con cuántas campañas. */
export interface Medida {
  id: string;
  delta: number;
  n: number;
}

/** La parte de cada clase que lleva S (y la que lleva B). */
export const TERCIO = 0.3;

/** Los sellos de una clase: el tercio de mejor efecto S, el de peor B y el resto A. Nunca todo S. */
export function repartoSellos(filas: readonly Medida[]): Record<string, SelloNivel> {
  const orden = [...filas].sort((a, b) => b.delta - a.delta || a.id.localeCompare(b.id));
  const k = Math.max(1, Math.round(orden.length * TERCIO));
  const out: Record<string, SelloNivel> = {};
  orden.forEach((f, i) => (out[f.id] = orden.length < 3 ? 'A' : i < k ? 'S' : i >= orden.length - k ? 'B' : 'A'));
  return Object.fromEntries(Object.keys(out).sort().map((id) => [id, out[id]]));
}

/** El bloque `sellosNivel` de balance-config.json, con una línea por clase (el resto del archivo no se toca). */
export function bloqueSellos(sellos: Record<'amuletos' | 'trampas' | 'bendiciones', Record<string, SelloNivel>>): string {
  const linea = (k: keyof typeof sellos) => `    "${k}": { ${Object.entries(sellos[k]).map(([id, s]) => `"${id}": "${s}"`).join(', ')} }`;
  return `  "sellosNivel": {\n${linea('amuletos')},\n${linea('trampas')},\n${linea('bendiciones')}\n  }`;
}

/** balance-config.json con el bloque `sellosNivel` nuevo (tiene que ser el último del archivo). */
export function conSellos(json: string, bloque: string): string {
  const i = json.indexOf('  "sellosNivel": {');
  if (i < 0) throw new Error('balance-config.json no tiene el bloque «sellosNivel» al final');
  return `${json.slice(0, i)}${bloque}\n}\n`;
}
