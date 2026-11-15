// V11 · lo que llega guardado de la 10.0 (SPECS/V11.md, 1.9). El guardado de tests/fixtures/guardado-10.0.json
// lo generó el código de v10.0.0 (extraído con `git archive v10.0.0`, solo lectura) jugando campañas con el bot:
// una Meta con mejoras, logros, maestrías, mejor marca 8 y alcance 8; una campaña a medias en el Mapa del
// asalto 4; y un acta del archivo de crónicas sin `de`. El generador: artifacts/mision/v11/gen-guardado-10.ts.
// La prueba de red (el servidor rechaza un cliente sin `v` y acepta uno con la versión) va en
// tests/coop-estres.test.ts, con el resto de pruebas que abren un servidor de salas.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASALTOS_10, abonoCampanaVieja, dondeActa, recortaMeta10 } from '../src/rules/migracion';
import { LAST_STAGE, META_VERSION, Meta, RUN_VERSION, loadMeta, newMeta } from '../src/rules/run';
import { errorFor } from '../src/rules/textos';
import { PROTOCOL_VERSION } from '../src/shared/protocol';

const G = JSON.parse(readFileSync(new URL('./fixtures/guardado-10.0.json', import.meta.url), 'utf8')) as {
  version: string;
  RUN_VERSION: number;
  META_VERSION: number;
  LAST_STAGE: number;
  meta: Meta;
  campaign: { run: { v: number; stage: number; phase: string }; key: string };
  acta: { stage: number; de?: number };
};

describe('el guardado es de verdad de la 10.0', () => {
  it('versiones y marcas de la 10.0', () => {
    expect(G).toMatchObject({ version: '10.0.0', RUN_VERSION: 3, META_VERSION: 2, LAST_STAGE: 8 });
    expect(G.meta.v).toBe(2);
    expect(G.meta.best).toBe(8);
    expect(G.meta.stats.reach).toBe(8);
    expect(Object.keys(G.meta.up).length).toBeGreaterThan(0);
    expect(Object.keys(G.meta.ach).length).toBeGreaterThan(5);
    expect(G.campaign.run).toMatchObject({ v: 3, stage: 4, phase: 'map' });
    expect(G.acta.de).toBeUndefined();
    expect(ASALTOS_10).toBe(G.LAST_STAGE);
  });
});

describe('una Meta de la 10.0 en la V11: se conserva todo el progreso', () => {
  const old = structuredClone(G.meta);
  const meta = loadMeta(structuredClone(G.meta));

  it('La Orden (Coronas y mejoras), logros, colección, maestrías y contadores, intactos', () => {
    expect(meta.v).toBe(META_VERSION);
    expect(META_VERSION).toBe(3);
    expect(meta.renown).toBe(old.renown); // no se devuelve nada: las mejoras siguen compradas
    expect(meta.up).toEqual(old.up);
    expect(meta.ach).toEqual(old.ach);
    expect(meta.seen).toEqual(old.seen);
    expect(meta.mastery).toEqual(old.mastery);
    expect(meta).toMatchObject({ runs: old.runs, wins: old.wins, ascMax: old.ascMax, last: old.last });
    const { reach: _r, ...stats } = old.stats;
    expect(meta.stats).toMatchObject(stats);
  });

  it('lo que contaba asaltos se recorta a cinco: mejor marca, alcance y Asalto diario', () => {
    expect(meta.best).toBe(LAST_STAGE);
    expect(meta.stats.reach).toBe(LAST_STAGE);
    expect(meta.daily).toEqual({ ...old.daily, cleared: Math.min(old.daily.cleared, LAST_STAGE) });
  });

  it('cargarla otra vez (ya en la V11) no cambia nada', () => {
    expect(loadMeta(JSON.parse(JSON.stringify(meta)))).toEqual(meta);
  });

  it('el recorte no sube lo que ya era pequeño', () => {
    const m = recortaMeta10({ best: 2, stats: { ...newMeta().stats, reach: 3 }, daily: { date: '', cleared: 1, won: false } }, LAST_STAGE);
    expect([m.best, m.stats.reach, m.daily.cleared]).toEqual([2, 3, 1]);
  });
});

describe('un perfil de antes de la 2: se devuelven las Coronas y se vacían las mejoras, como siempre', () => {
  it('devuelve lo gastado en mejoras retiradas y recorta a cinco', () => {
    const viejo = { renown: 2, up: { cimientos: 2, seguro: 1 }, runs: 9, wins: 1, best: 8, ascMax: 1, ach: { madre: true }, stats: { floors: 80, reach: 8 }, seen: { relics: ['piqueta'], specials: [], bosses: [], forms: [] } };
    const m = loadMeta(viejo);
    expect(m).toMatchObject({ v: META_VERSION, renown: 2 + 3 + 5 + 4, up: {}, runs: 9, best: LAST_STAGE, ach: { madre: true } });
    expect(m.stats.reach).toBe(LAST_STAGE);
    expect(m.seen.tools).toEqual(['piqueta']);
  });
});

describe('la campaña a medias de la 10.0 se cierra y cobra lo superado', () => {
  it('su versión ya no es la de ahora: no se puede continuar', () => {
    expect(G.campaign.run.v).not.toBe(RUN_VERSION);
    expect(RUN_VERSION).toBe(4);
  });

  it('abona min(asalto − 1, 8) Coronas, y al menos 1', () => {
    expect(abonoCampanaVieja(G.campaign.run.stage)).toBe(3);
    expect(abonoCampanaVieja(1)).toBe(1);
    expect(abonoCampanaVieja(8)).toBe(7);
    expect(abonoCampanaVieja(12)).toBe(ASALTOS_10);
    expect(abonoCampanaVieja(undefined)).toBe(1);
    expect(abonoCampanaVieja('basura')).toBe(1);
  });
});

describe('el archivo de crónicas', () => {
  it('un acta sin `de` es de la 10.0: «asalto n de 8», sin nombre de sala', () => {
    expect(dondeActa(G.acta, LAST_STAGE)).toEqual({ n: 7, total: 8, sala: false });
  });

  it('un acta de la V11 guarda `de` y se enseña con su sala', () => {
    expect(dondeActa({ stage: 3, de: LAST_STAGE }, LAST_STAGE)).toEqual({ n: 3, total: 5, sala: true });
    expect(dondeActa({ stage: 7, de: LAST_STAGE }, LAST_STAGE)).toEqual({ n: 5, total: 5, sala: true });
  });
});

describe('red: la versión del protocolo', () => {
  it('es la 11, y el rechazo se entiende en los dos idiomas', () => {
    expect(PROTOCOL_VERSION).toBe(11);
    expect(errorFor('es', 'Esta sala es de otra versión del juego.')).toBe('Esta sala es de otra versión del juego.');
    expect(errorFor('en', 'Esta sala es de otra versión del juego.')).toBe('This room is from another version of the game.');
  });
});
