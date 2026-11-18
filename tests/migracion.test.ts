// V11 · lo que llega guardado de la 10.0 (SPECS/V11.md, 1.9). El guardado de tests/fixtures/guardado-10.0.json
// lo generó el código de v10.0.0 (extraído con `git archive v10.0.0`, solo lectura) jugando campañas con el bot:
// una Meta con mejoras, logros, maestrías, mejor marca 8 y alcance 8; una campaña a medias en el Mapa del
// asalto 4; y un acta del archivo de crónicas sin `de`. El generador: artifacts/mision/v11/gen-guardado-10.ts.
// La prueba de red (el servidor rechaza un cliente sin `v` y acepta uno con la versión) va en
// tests/coop-estres.test.ts, con el resto de pruebas que abren un servidor de salas.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASALTOS_10, abonoCampanaVieja, dondeActa, recortaMeta10 } from '../src/rules/migracion';
import { ESQUIRLAS_POR_CORONA, META_38, META_40, RUN_11, RUN_38, RUN_40, abonoFrancesa, campanaFrancesa, mazoDe, migraMeta38, migraMeta40 } from '../src/rules/migracion';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { applyAction, currentPlayer } from '../src/rules/engine';
import { DECK, LAST_STAGE, META_VERSION, Meta, RUN_VERSION, Run, cargaRun, finishBattle, loadMeta, newMeta, newRun, runAction, settle, startStage, trackEvents } from '../src/rules/run';
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

describe('una Meta de la 10.0 en la V12: se conserva todo el progreso (y sus Coronas pasan a esquirlas)', () => {
  const old = structuredClone(G.meta);
  const meta = loadMeta(structuredClone(G.meta));

  it('La Orden (mejoras), logros, colección, maestrías y contadores, intactos; Coronas × 100', () => {
    expect(meta.v).toBe(META_VERSION);
    expect(META_VERSION).toBe(6);
    expect(meta.renown).toBe(old.renown * ESQUIRLAS_POR_CORONA); // no se devuelve nada: las mejoras siguen compradas
    expect(meta.up).toEqual(old.up);
    expect(meta.ach).toEqual(old.ach);
    expect(meta.seen).toEqual(old.seen);
    // V40 (1b): la maestría de cada baraja vieja pasa a su Mazo
    expect(meta.mastery).toEqual(migraMeta40(structuredClone({ mastery: old.mastery })).mastery);
    expect(meta).toMatchObject({ runs: old.runs, wins: old.wins, ascMax: old.ascMax, last: old.last });
    const { reach: _r, dailies: _d, ...stats } = old.stats as typeof old.stats & { dailies?: number }; // V40: sin Asalto diario
    expect(meta.stats).toMatchObject(stats);
  });

  it('lo que contaba asaltos se recorta a cinco (mejor marca y alcance) y el Asalto diario se va (V40)', () => {
    expect(meta.best).toBe(LAST_STAGE);
    expect(meta.stats.reach).toBe(LAST_STAGE);
    expect('daily' in meta).toBe(false);
    expect('dailies' in meta.stats).toBe(false);
  });

  it('cargarla otra vez (ya en la V12) no cambia nada', () => {
    expect(loadMeta(JSON.parse(JSON.stringify(meta)))).toEqual(meta);
  });

  it('el recorte no sube lo que ya era pequeño', () => {
    const m = recortaMeta10({ best: 2, stats: { ...newMeta().stats, reach: 3 } }, LAST_STAGE);
    expect([m.best, m.stats.reach]).toEqual([2, 3]);
  });
});

describe('un perfil de antes de la 2: se devuelven las Coronas y se vacían las mejoras, como siempre', () => {
  it('devuelve lo gastado en mejoras retiradas y recorta a cinco', () => {
    const viejo = { renown: 2, up: { cimientos: 2, seguro: 1 }, runs: 9, wins: 1, best: 8, ascMax: 1, ach: { madre: true }, stats: { floors: 80, reach: 8 }, seen: { relics: ['piqueta'], specials: [], bosses: [], forms: [] } };
    const m = loadMeta(viejo);
    expect(m).toMatchObject({ v: META_VERSION, renown: (2 + 3 + 5 + 4) * ESQUIRLAS_POR_CORONA, up: {}, runs: 9, best: LAST_STAGE, ach: { madre: true } });
    expect(m.stats.reach).toBe(LAST_STAGE);
    expect(m.seen.tools).toEqual(['piqueta']);
  });
});

describe('la campaña a medias de la 10.0 se cierra y cobra lo superado', () => {
  it('su versión ya no es la de ahora: no se puede continuar', () => {
    expect(G.campaign.run.v).not.toBe(RUN_VERSION);
    expect(RUN_VERSION).toBe(7);
    expect(cargaRun(structuredClone(G.campaign.run))).toBeNull();
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
  it('es la 12, y el rechazo se entiende en los dos idiomas', () => {
    expect(PROTOCOL_VERSION).toBe(12);
    expect(errorFor('es', 'Esta sala es de otra versión del juego.')).toBe('Esta sala es de otra versión del juego.');
    expect(errorFor('en', 'Esta sala es de otra versión del juego.')).toBe('This room is from another version of the game.');
  });
});

// ───────────────────────── V12 · el guardado de la 11.0 (SPECS/V12.md, apartado 1.11) ─────────────────────────
// tests/fixtures/guardado-11.0.json lo generó el código de v11.0.0 (git archive, solo lectura) con
// artifacts/mision/v12/gen-guardado-11.ts: La Orden a medias, Coronas sueltas y una campaña en el Mapa del asalto 3.
const G11 = JSON.parse(readFileSync(new URL('./fixtures/guardado-11.0.json', import.meta.url), 'utf8')) as {
  version: string;
  RUN_VERSION: number;
  META_VERSION: number;
  meta: Meta;
  campaign: { run: Run; key: string };
};

describe('un perfil de la 11.0 en la V12: Coronas → Esquirlas de Corona, mejoras en el Arsenal', () => {
  const old = structuredClone(G11.meta);
  const meta = loadMeta(structuredClone(G11.meta));

  it('el guardado es de verdad de la 11.0', () => {
    expect(G11).toMatchObject({ version: '11.0.0', RUN_VERSION: RUN_11, META_VERSION: 3 });
    expect(old.v).toBe(3);
    expect(old.renown).toBeGreaterThan(0);
    expect(Object.keys(old.up).length).toBeGreaterThan(2);
  });

  it('0 rangos perdidos, saldo × 100 y el aviso para el Árbol', () => {
    expect(meta.v).toBe(META_VERSION);
    expect(meta.up).toEqual(old.up);
    expect(meta.renown).toBe(old.renown * 100);
    const rangos = Object.values(old.up).reduce((a, b) => a + b, 0);
    expect(meta.aviso).toEqual({ id: 'arbol-v12', coronas: old.renown, esquirlas: old.renown * 100, rangos });
    expect(meta.ach).toEqual(old.ach);
    expect(meta.seen).toEqual(old.seen);
    expect(meta).toMatchObject({ runs: old.runs, wins: old.wins, best: old.best, ascMax: old.ascMax });
  });

  it('cargarlo otra vez no vuelve a multiplicar; sin aviso, no se inventa uno', () => {
    const again = loadMeta(JSON.parse(JSON.stringify(meta)));
    expect(again).toEqual(meta);
    delete again.aviso;
    expect(loadMeta(JSON.parse(JSON.stringify(again))).aviso).toBeUndefined();
    expect(loadMeta({ v: 3, renown: 0, up: {} }).aviso).toBeUndefined();
  });

  it('un rango que no cabe en su nodo se devuelve en esquirlas (no pasa con la 11.0: el tope de la Bolsa sube a 5)', () => {
    const m = loadMeta({ v: 3, renown: 1, up: { vale: 5, caja: 2 } });
    expect(m.up).toMatchObject({ vale: 2, caja: 2 });
    expect(m.renown).toBe(100); // los rangos 3 a 5 de «vale» no existían: no había nada gastado que devolver
  });
});

describe('V40 · la campaña a medias de la baraja francesa (11.0 a 38.0) se descarta con aviso', () => {
  it('la de la 11.0 ya no se carga: es de la baraja francesa', () => {
    const raw = structuredClone(G11.campaign.run);
    expect(raw.v).toBe(RUN_11);
    expect(cargaRun(raw)).toBeNull();
    expect(campanaFrancesa(raw, RUN_VERSION)).toBe(true);
  });

  it('la de la 38.0 (v = 5) tampoco; la de ahora sí se carga', () => {
    expect(RUN_38).toBe(5);
    expect(RUN_VERSION).toBeGreaterThan(RUN_38);
    expect(campanaFrancesa({ v: RUN_38 }, RUN_VERSION)).toBe(true);
    expect(campanaFrancesa({ v: RUN_VERSION }, RUN_VERSION)).toBe(false);
    expect(campanaFrancesa(null, RUN_VERSION)).toBe(false);
    expect(campanaFrancesa({ v: 'cinco' }, RUN_VERSION)).toBe(false);
    // una campaña nueva, guardada y vuelta a cargar, sigue entera
    const run = newRun({ seedText: 'ESPADAS' }, 1);
    expect(cargaRun(JSON.parse(JSON.stringify(run)))).toEqual(run);
  });

  it('abona las esquirlas que llevaba juntadas; si ya estaba cerrada, nada', () => {
    expect(abonoFrancesa({ v: RUN_38, phase: 'map', esquirlas: 37.9 })).toBe(37);
    expect(abonoFrancesa({ v: RUN_38, phase: 'battle' })).toBe(0);
    expect(abonoFrancesa({ v: RUN_38, phase: 'won', esquirlas: 50 })).toBe(0);
    expect(abonoFrancesa({ v: RUN_38, phase: 'lost', esquirlas: 50 })).toBe(0);
    expect(abonoFrancesa(null)).toBe(0);
  });
});

describe('V40 · una Meta de la 38.0: se conserva todo el progreso y solo se va el Asalto diario', () => {
  const vieja = { ...structuredClone(newMeta()), v: META_38, renown: 1234, up: { vale: 2 }, runs: 7, wins: 2, daily: { date: '2026-11-15', cleared: 3, won: false }, stats: { ...newMeta().stats, dailies: 4, floors: 40 } };
  const meta = loadMeta(structuredClone(vieja));

  it('Altar, esquirlas, logros y contadores intactos; sin daily ni dailies', () => {
    expect(meta.v).toBe(META_VERSION);
    expect(meta).toMatchObject({ renown: 1234, up: { vale: 2 }, runs: 7, wins: 2 });
    expect(meta.stats.floors).toBe(40);
    expect('daily' in meta).toBe(false);
    expect('dailies' in meta.stats).toBe(false);
  });

  it('migrar dos veces no cambia nada, y migraMeta38 no toca lo demás', () => {
    expect(loadMeta(JSON.parse(JSON.stringify(meta)))).toEqual(meta);
    const m = migraMeta38({ renown: 5, daily: 1, stats: { floors: 2, dailies: 3 } });
    expect(m).toEqual({ renown: 5, stats: { floors: 2 } });
  });
});

describe('V40 (tramo 1b) · de las seis barajas de inicio a los 5 Mazos', () => {
  it('cada baraja vieja cae en su Mazo; un Mazo se queda; lo desconocido, en la Escoba', () => {
    expect(META_VERSION).toBeGreaterThan(META_40);
    expect(RUN_VERSION).toBeGreaterThan(RUN_40);
    expect(['obra', 'acero', 'prestamista', 'ases', 'corta', 'caos'].map(mazoDe)).toEqual(['escoba', 'truco', 'chinchon', 'mentiroso', 'chancho', 'escoba']);
    expect(mazoDe('chancho')).toBe('chancho');
    expect(mazoDe(undefined)).toBe('escoba');
    expect(mazoDe('inventada')).toBe('escoba');
    // y el Mazo que sustituye a cada baraja se desbloquea con el mismo logro que ella
    const viejo: Record<string, string> = { acero: 'capataz', prestamista: 'media', ases: 'madre', corta: 'golpe100' };
    for (const [b, logro] of Object.entries(viejo)) expect(DECK[mazoDe(b)].unlock, b).toBe(logro);
  });

  it('la Meta del tramo 1a conserva la maestría de cada baraja en su Mazo (la más alta de las que caen juntas)', () => {
    const vieja = { ...structuredClone(newMeta()), v: META_40, renown: 77, mastery: { tools: { piqueta: 3 }, decks: { obra: 2, caos: 5, acero: 4, corta: 1 } } };
    const meta = loadMeta(structuredClone(vieja));
    expect(meta.v).toBe(META_VERSION);
    expect(meta.renown).toBe(77);
    expect(meta.mastery.tools).toEqual({ piqueta: 3 });
    expect(meta.mastery.decks).toEqual({ escoba: 5, truco: 4, chancho: 1 });
    expect(loadMeta(JSON.parse(JSON.stringify(meta)))).toEqual(meta); // migrar dos veces no cambia nada
    expect(migraMeta40({ mastery: { decks: { ases: '3' as unknown as number, mentiroso: 2 } } }).mastery.decks).toEqual({ mentiroso: 3 });
  });

  it('la campaña a medias del tramo 1a sigue, con su Mazo y las cargas a cero', () => {
    const run = newRun({ seedText: 'ACERO', deck: 'truco' }, 9) as Run & { cargas?: unknown };
    const vieja = JSON.parse(JSON.stringify({ ...run, v: RUN_40, deckId: 'acero' }));
    delete vieja.cargas;
    const cargada = cargaRun(vieja)!;
    expect(cargada).not.toBeNull();
    expect(cargada.v).toBe(RUN_VERSION);
    expect(cargada.deckId).toBe('truco');
    expect(cargada.cargas).toEqual({});
    // y la de la baraja francesa (antes del tramo 1a) no se continúa
    expect(campanaFrancesa({ v: RUN_38 }, RUN_40)).toBe(true);
    expect(campanaFrancesa({ v: RUN_40 }, RUN_40)).toBe(false);
    expect(cargaRun({ ...vieja, v: RUN_38 })).toBeNull();
  });
});
