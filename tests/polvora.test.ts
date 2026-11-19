// Sello de pólvora entre tronos presentes (V12, SPECS/V12.md 1.8, fila 4). Los vecinos del golpeado son los
// tronos que están en el asalto (no los ausentes) a su izquierda y a su derecha en la fila ♠ ♦ ♥ ♣.
//   · con 4 tronos no cambia nada: 2.000 golpes con semilla dan lo mismo que la regla de la 11.0
//     (tests/fixtures/polvora-4-tronos.json se grabó con el código de la 11.0 y se regrabó en la V40 1d, con los
//     Amuletos nuevos, con GRABAR_POLVORA=1)
//   · con 2 tronos el vecino es el otro; con 3, uno o dos
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Card, Config, DEFAULT_CONFIG, SEAL, SUITS, StrikeEnv, Suit, TREATMENTS, newTowers, nextRandom, seedFrom, strike, vecinosPresentes as vp } from '../src/rules/engine';
import { canonical } from '../src/rules/state-hash';
import { TOOLS } from '../src/rules/tools';
import { DICCIONARIOS } from '../src/shared/i18n';

const MESA: Partial<Config> = { floorHp: { 10: 20, 11: 30, 12: 40 } };
const FIXTURE = new URL('./fixtures/polvora-4-tronos.json', import.meta.url);

function env(palos?: Suit[], tools: string[] = []): StrikeEnv {
  const config: Config = { ...structuredClone(DEFAULT_CONFIG), ...MESA };
  return { config, towers: newTowers([10, 11, 12], config, palos), tools: tools.map((id) => ({ id, n: 0 })), chain: 0, charge: 0, scrap: 0, integrity: 20, wall: 0 };
}

/** 2.000 golpes en mesas de 4 tronos, con muchas cartas con sello de pólvora: el resumen de cada uno. */
function golpes4(): string[] {
  const azar = { rng: seedFrom('polvora-v12') };
  const r = () => nextRandom(azar);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const out: string[] = [];
  for (let i = 0; i < 2000; i++) {
    const e = env(undefined, r() < 0.5 ? [pick(TOOLS).id, pick(TOOLS).id] : []);
    for (const s of SUITS) {
      if (r() < 0.4) e.towers[s].damage = Math.floor(r() * 19);
      if (r() < 0.15) e.towers[s].floors = []; // un trono ya caído sigue en la mesa
    }
    const target = pick(SUITS.filter((s) => e.towers[s].floors.length));
    if (!target) continue;
    // una carta sola, un grupo o una escalera corta, con pólvora en alguna
    const n = 1 + Math.floor(r() * 3);
    const palo = () => pick(SUITS);
    const rango = 1 + Math.floor(r() * 9);
    const cartas: Card[] = Array.from({ length: n }, (_, k) => {
      const c: Card = { id: `c${k}`, suit: palo(), rank: n === 3 ? Math.min(rango, 7) + k : rango };
      if (r() < 0.6) c.seal = 'dinamita';
      else if (r() < 0.2) c.tr = pick(TREATMENTS);
      return c;
    });
    const res = strike(e, cartas, target);
    out.push(createHash('sha256').update(canonical({ towers: e.towers, total: res.total, dealt: res.dealt, fallenBy: res.fallenBy, fell: res.fell, clean: res.clean })).digest('hex').slice(0, 10));
  }
  return out;
}

describe('sello de pólvora', () => {
  // La referencia se volvió a grabar con la 31.0 (GRABAR_POLVORA=1): los multiplicadores se aplican al final de la cuenta;
  // y con la 34.0: el Espejo de mano copia la última Reliquia que no sea pasiva, no la de su derecha. V40: con la baraja
  // española (números del 1 al 9 y guardias 10, 11 y 12) se grabó otra vez. V40 1c: sin los bonos de los rasgos de las Reliquias (los
  // sustituyen los niveles de los Reyes), otra vez.
  it('con 4 tronos, 2.000 golpes dan exactamente lo mismo que la referencia grabada', () => {
    const ahora = golpes4();
    if (process.env.GRABAR_POLVORA) writeFileSync(FIXTURE, `${JSON.stringify(ahora)}\n`);
    const antes = JSON.parse(readFileSync(FIXTURE, 'utf8')) as string[];
    expect(ahora.length).toBeGreaterThan(1500);
    expect(ahora).toEqual(antes);
  });

  it('vecinosPresentes: la fila ♠ ♦ ♥ ♣ sin los ausentes', () => {
    expect(vp(env().towers, 'S')).toEqual(['D']);
    expect(vp(env().towers, 'D')).toEqual(['S', 'H']);
    expect(vp(env().towers, 'C')).toEqual(['H']);
    expect(vp(env(['S', 'H']).towers, 'S')).toEqual(['H']);
    expect(vp(env(['S', 'H']).towers, 'H')).toEqual(['S']);
    expect(vp(env(['S', 'H', 'C']).towers, 'H')).toEqual(['S', 'C']);
    expect(vp(env(['S', 'H', 'C']).towers, 'S')).toEqual(['H']);
    expect(vp(env(['D', 'C']).towers, 'C')).toEqual(['D']);
    // un trono caído sigue en la mesa: es vecino (y no recibe nada, porque no le quedan guardias)
    const e = env();
    e.towers.D.floors = [];
    expect(vp(e.towers, 'S')).toEqual(['D']);
  });

  it('con 2 tronos, el otro trono recibe el valor de la carta', () => {
    const e = env(['S', 'H']);
    // un 6 de Tréboles (no salpica) con pólvora contra Picas: Corazones, que en la 11.0 no era vecino, recibe 6
    strike(e, [{ id: 'C6', suit: 'C', rank: 6, seal: 'dinamita' }], 'S');
    expect(e.towers.S.damage).toBe(6);
    expect(e.towers.H.damage).toBe(6);
    expect(e.towers.D.damage + e.towers.C.damage).toBe(0);
  });

  it('con 3 tronos, uno o dos vecinos según el golpeado', () => {
    const medio = env(['S', 'H', 'C']);
    strike(medio, [{ id: 'D7', suit: 'D', rank: 7, seal: 'dinamita' }], 'H');
    // ♦ salpica 2 a cada trono además de los 7 de la pólvora
    const s = medio.config.salpicaPorCarta;
    expect(medio.towers.S.damage).toBe(7 + s);
    expect(medio.towers.C.damage).toBe(7 + s);
    const borde = env(['S', 'H', 'C']);
    strike(borde, [{ id: 'C5', suit: 'C', rank: 5, seal: 'dinamita' }], 'S');
    expect(borde.towers.H.damage).toBe(5);
    expect(borde.towers.C.damage).toBe(0);
  });

  it('el texto nuevo, en español y en inglés', () => {
    expect(SEAL.dinamita.desc).toBe('Al golpear, los tronos al lado del golpeado en la mesa reciben el valor de esta carta.');
    expect(DICCIONARIOS.es['sello.dinamita.desc']).toBe(SEAL.dinamita.desc);
    expect(DICCIONARIOS.en['sello.dinamita.desc']).toBe("When it strikes, the thrones beside the target on the table take this card's value.");
  });
});
