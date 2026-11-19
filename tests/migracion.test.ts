// V11 · lo que llega guardado de la 10.0 (SPECS/V11.md, 1.9). El guardado de tests/fixtures/guardado-10.0.json
// lo generó el código de v10.0.0 (extraído con `git archive v10.0.0`, solo lectura) jugando campañas con el bot:
// una Meta con mejoras, logros, maestrías, mejor marca 8 y alcance 8; una campaña a medias en el Mapa del
// asalto 4; y un acta del archivo de crónicas sin `de`. El generador: artifacts/mision/v11/gen-guardado-10.ts.
// La prueba de red (el servidor rechaza un cliente sin `v` y acepta uno con la versión) va en
// tests/coop-estres.test.ts, con el resto de pruebas que abren un servidor de salas.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASALTOS_10, abonoCampanaVieja, dondeActa, recortaMeta10 } from '../src/rules/migracion';
import { ARCONES_40C, ESQUIRLAS_POR_CORONA, META_38, META_40, META_40C, RUN_11, RUN_38, RUN_40, RUN_40C, abonoFrancesa, campanaConReliquias, campanaFrancesa, campanaSinReyes, mazoDe, migraMeta38, migraMeta40, migraMeta40c, migraMeta40d } from '../src/rules/migracion';
import { TOOL } from '../src/rules/tools';
import { SPECIAL } from '../src/rules/specials';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { applyAction, currentPlayer } from '../src/rules/engine';
import { DECK, LAST_STAGE, META_VERSION, MONARCAS_VIEJOS, Meta, RUN_VERSION, Run, cargaRun, finishBattle, loadMeta, newMeta, newRun, runAction, settle, startStage, trackEvents } from '../src/rules/run';
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

/** V40 1d · los rangos del Altar sin los seis arcones viejos, y las esquirlas con que se devuelven. */
const sinArcones = (up: Record<string, number>) => Object.fromEntries(Object.entries(up).filter(([id]) => !(id in ARCONES_40C)));
const abonoArcones = (up: Record<string, number>) => Object.entries(ARCONES_40C).reduce((a, [id, c]) => a + ((up[id] ?? 0) > 0 ? c : 0), 0);
/** V40 1d · lo visto en la Colección, sin las Reliquias ni las especiales que se fueron. */
const vistos = <S extends { tools: string[]; specials: string[] }>(seen: S): S => ({ ...seen, tools: seen.tools.filter((id) => TOOL[id]), specials: seen.specials.filter((id) => SPECIAL[id]) });

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
    expect(META_VERSION).toBe(8);
    // no se devuelve nada salvo los arcones viejos (V40 1d): las demás mejoras siguen compradas
    expect(meta.renown).toBe(old.renown * ESQUIRLAS_POR_CORONA + abonoArcones(old.up));
    expect(meta.up).toEqual(sinArcones(old.up));
    // V40 1c · los trofeos y los monarcas vistos de los siete monarcas viejos pasan al Rey de su palo
    const conReyes = migraMeta40c(structuredClone({ ach: old.ach, seen: old.seen }), MONARCAS_VIEJOS);
    expect(meta.ach).toEqual(conReyes.ach);
    expect(meta.seen).toEqual(vistos(conReyes.seen));
    // V40 (1b): la maestría de cada baraja vieja pasa a su Mazo
    const maestria = migraMeta40(structuredClone({ mastery: old.mastery })).mastery;
    // V40 1d · y la de las Reliquias que se fueron se va con ellas
    expect(meta.mastery).toEqual({ ...maestria, tools: Object.fromEntries(Object.entries(maestria.tools ?? {}).filter(([id]) => TOOL[id])) });
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
    expect(RUN_VERSION).toBe(10);
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
    expect(meta.up).toEqual(sinArcones(old.up));
    expect(meta.renown).toBe(old.renown * 100 + abonoArcones(old.up));
    // V40 1d · el arcón viejo ya no existe en el Árbol: la migración de la V12 lo devuelve al pasar (y no cuenta como rango)
    const rangos = Object.values(sinArcones(old.up)).reduce((a, b) => a + b, 0);
    expect(meta.aviso).toEqual({ id: 'arbol-v12', coronas: old.renown, esquirlas: old.renown * 100 + abonoArcones(old.up), rangos });
    // V40 1c · los trofeos y los monarcas vistos de los siete monarcas viejos pasan al Rey de su palo
    const conReyes = migraMeta40c(structuredClone({ ach: old.ach, seen: old.seen }), MONARCAS_VIEJOS);
    expect(meta.ach).toEqual(conReyes.ach);
    expect(meta.seen).toEqual(vistos(conReyes.seen));
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

  it('la campaña a medias del tramo 1a ya no sigue (V40 1c: llegaron los 4 Reyes); la Meta la cobra al abrir', () => {
    const run = newRun({ seedText: 'ACERO', deck: 'truco' }, 9) as Run & { cargas?: unknown };
    const vieja = JSON.parse(JSON.stringify({ ...run, v: RUN_40, deckId: 'acero' }));
    delete vieja.cargas;
    expect(cargaRun(vieja)).toBeNull();
    expect(campanaSinReyes(vieja)).toBe(true);
    expect(abonoFrancesa({ ...vieja, esquirlas: 340 })).toBe(340);
    // el Mazo de una baraja de inicio vieja sigue resolviéndose (lo usa la Meta y la preparación)
    expect(mazoDe('acero')).toBe('truco');
    // y la de la baraja francesa (antes del tramo 1a) no se continúa
    expect(campanaFrancesa({ v: RUN_38 }, RUN_40)).toBe(true);
    expect(campanaFrancesa({ v: RUN_40 }, RUN_40)).toBe(false);
    expect(cargaRun({ ...vieja, v: RUN_38 })).toBeNull();
  });
});

describe('V40 (tramo 1d) · de las 52 Reliquias a los 22 Amuletos y de las 25 especiales a las 8 Trampas', () => {
  it('la Meta del tramo 1c se queda con lo que sigue existiendo y cobra los arcones viejos en esquirlas', () => {
    const vieja = {
      ...structuredClone(newMeta()),
      v: META_40C,
      renown: 100,
      up: { caja: 2, caja_precision: 1, caja_aguante: 1, tasador: 1 },
      seen: { ...newMeta().seen, tools: ['piqueta', 'ariete', 'andamio', 'rebosadero'], specials: ['gemelo', 'embestida', 'bola'] },
      mastery: { tools: { piqueta: 3, ariete: 5 }, decks: { escoba: 2 } },
    };
    const meta = loadMeta(structuredClone(vieja));
    expect(meta.v).toBe(META_VERSION);
    expect(meta.up).toEqual({ caja: 2, tasador: 1 });
    expect(meta.renown).toBe(100 + 800);
    expect(meta.seen.tools).toEqual(['piqueta', 'andamio']);
    expect(meta.seen.specials).toEqual(['gemelo', 'bola']);
    expect(meta.mastery.tools).toEqual({ piqueta: 3 });
    expect(meta.mastery.decks).toEqual({ escoba: 2 });
    expect(meta.avisoAmuletos).toEqual({ id: 'amuletos-v40', arcones: 2, esquirlas: 800 });
    // migrar dos veces no cambia nada (y el aviso se queda para que el cliente lo enseñe una vez)
    expect(loadMeta(JSON.parse(JSON.stringify(meta)))).toEqual(meta);
  });

  it('sin nada que devolver, no hay aviso', () => {
    const m = migraMeta40d({ renown: 5, up: { caja: 1 } }, (id) => !!TOOL[id], (id) => !!SPECIAL[id]);
    expect(m).toEqual({ renown: 5, up: { caja: 1 } });
  });

  it('la campaña a medias del tramo 1c (con Reliquias) ya no sigue y se cobra', () => {
    const run = newRun({ seedText: 'RELIQUIA', deck: 'escoba' }, 9);
    const vieja = JSON.parse(JSON.stringify({ ...run, v: RUN_40C, tools: [{ id: 'ariete', n: 0 }] }));
    expect(RUN_VERSION).toBeGreaterThan(RUN_40C);
    expect(campanaConReliquias(vieja)).toBe(true);
    expect(campanaConReliquias(JSON.parse(JSON.stringify(run)))).toBe(false);
    expect(cargaRun(vieja)).toBeNull();
    expect(abonoFrancesa({ ...vieja, esquirlas: 120 })).toBe(120);
  });
});
