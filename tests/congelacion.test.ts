// Congelación de funciones de la V10: ningún identificador de pieza entra ni sale. La lista guardada
// (tests/congelacion.json) se sacó de la 9.0 con artifacts/mision/v10/congelacion-gen.ts. Si una versión
// añade o quita una reliquia, especial, monarca, asalto, Reinado, baraja, juramento, atajo, secreto,
// mejora, logro, palabra clave, formación, sello o acabado, esta prueba falla: eso es una función nueva.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../src/rules/achievements';
import { FORMATIONS, SEALS, TREATMENTS } from '../src/rules/engine';
import { KEYWORDS } from '../src/rules/keywords';
import { ASCENSIONS, BOSSES, CONTRACTS, DECKS, EVENTS, STAGES, TAGS, UPGRADES } from '../src/rules/run';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';

const guardada = JSON.parse(readFileSync(new URL('./congelacion.json', import.meta.url), 'utf8')) as Record<string, string[]>;

const hoy: Record<string, string[]> = {
  reliquias: TOOLS.map((t) => t.id),
  especiales: SPECIALS.map((s) => s.id),
  monarcas: BOSSES.map((b) => b.id),
  asaltos: STAGES.map((s) => s.name),
  reinados: ASCENSIONS.map((a) => a.name),
  barajas: DECKS.map((d) => d.id),
  juramentos: CONTRACTS.map((c) => c.id),
  atajos: TAGS.map((t) => t.id),
  secretos: EVENTS.map((e) => `${e.id}:${e.options.length}`),
  mejoras: UPGRADES.map((u) => u.id),
  logros: ACHIEVEMENTS.map((a) => a.id),
  palabras: KEYWORDS.map((k) => k.id),
  formaciones: [...FORMATIONS],
  sellos: [...SEALS],
  acabados: [...TREATMENTS],
};

describe('congelación de funciones (V10)', () => {
  it('los mismos bloques que en la 9.0', () => {
    expect(Object.keys(hoy).sort()).toEqual(Object.keys(guardada).sort());
  });
  for (const bloque of Object.keys(guardada)) {
    it(`${bloque}: ni uno más ni uno menos`, () => {
      expect(hoy[bloque]).toEqual(guardada[bloque]);
    });
  }
});
