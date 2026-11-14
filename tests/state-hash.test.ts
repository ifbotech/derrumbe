// stateHash: resumen puro y determinista de una vista, para que el cooperativo detecte desincronizaciones.
import { describe, expect, it } from 'vitest';
import { applyAction, createGame, currentPlayer, viewFor } from '../src/rules/engine';
import { chooseAction } from '../src/rules/bot';
import { canonical, hashText, stateHash, tableHash } from '../src/rules/state-hash';

const players = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
];

describe('stateHash', () => {
  it('dos vistas iguales dan el mismo resumen, también con las claves en otro orden', () => {
    const s = createGame(players, 42);
    const v1 = viewFor(s, 'a');
    const v2 = viewFor(structuredClone(s), 'a');
    expect(stateHash(v1)).toBe(stateHash(v2));
    const reordenada = Object.fromEntries(Object.entries(structuredClone(v1)).reverse()) as typeof v1;
    expect(stateHash(reordenada)).toBe(stateHash(v1));
    expect(stateHash(v1)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('misma semilla y mismas jugadas: mismo resumen en cada paso', () => {
    const jugar = () => {
      let s = createGame(players, 7);
      const out: string[] = [];
      for (let i = 0; i < 12 && s.phase === 'playing'; i++) {
        s = applyAction(s, currentPlayer(s).id, chooseAction(s)).state;
        out.push(stateHash(viewFor(s, 'a')));
      }
      return out;
    };
    const a = jugar();
    expect(jugar()).toEqual(a);
    expect(new Set(a).size).toBe(a.length); // cada jugada cambia la mesa
  });

  it('cambiar una carta lo cambia', () => {
    const s = createGame(players, 42);
    const v = viewFor(s, 'a');
    const otra = structuredClone(v);
    otra.hand[0] = { ...otra.hand[0], rank: otra.hand[0].rank === 5 ? 6 : 5 };
    expect(stateHash(otra)).not.toBe(stateHash(v));
    const sello = structuredClone(v);
    sello.hand[1] = { ...sello.hand[1], seal: 'eco' };
    expect(stateHash(sello)).not.toBe(stateHash(v));
  });

  it('tableHash: igual en todos los asientos de la misma mesa; stateHash, propio de cada uno', () => {
    const s = createGame(players, 42);
    expect(tableHash(viewFor(s, 'a'))).toBe(tableHash(viewFor(s, 'b')));
    expect(stateHash(viewFor(s, 'a'))).not.toBe(stateHash(viewFor(s, 'b')));
    const t = structuredClone(s);
    t.towers.S.damage += 1;
    expect(tableHash(viewFor(t, 'a'))).not.toBe(tableHash(viewFor(s, 'a')));
  });

  it('canonical y hashText: estables y sin depender del orden de las claves', () => {
    expect(canonical({ b: 1, a: [1, { d: undefined, c: 'x' }] })).toBe('{"a":[1,{"c":"x"}],"b":1}');
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
    expect(hashText('')).toBe(hashText(''));
    expect(hashText('a')).not.toBe(hashText('b'));
  });
});
