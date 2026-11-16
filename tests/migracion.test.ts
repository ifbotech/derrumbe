// V11 · lo que llega guardado de la 10.0 (SPECS/V11.md, 1.9). El guardado de tests/fixtures/guardado-10.0.json
// lo generó el código de v10.0.0 (extraído con `git archive v10.0.0`, solo lectura) jugando campañas con el bot:
// una Meta con mejoras, logros, maestrías, mejor marca 8 y alcance 8; una campaña a medias en el Mapa del
// asalto 4; y un acta del archivo de crónicas sin `de`. El generador: artifacts/mision/v11/gen-guardado-10.ts.
// La prueba de red (el servidor rechaza un cliente sin `v` y acepta uno con la versión) va en
// tests/coop-estres.test.ts, con el resto de pruebas que abren un servidor de salas.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ASALTOS_10, abonoCampanaVieja, dondeActa, recortaMeta10 } from '../src/rules/migracion';
import { ESQUIRLAS_POR_CORONA, RUN_11 } from '../src/rules/migracion';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { applyAction, currentPlayer } from '../src/rules/engine';
import { LAST_STAGE, META_VERSION, Meta, RUN_VERSION, Run, cargaRun, finishBattle, loadMeta, newMeta, runAction, settle, startStage, trackEvents } from '../src/rules/run';
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
    expect(META_VERSION).toBe(4);
    expect(meta.renown).toBe(old.renown * ESQUIRLAS_POR_CORONA); // no se devuelve nada: las mejoras siguen compradas
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

  it('cargarla otra vez (ya en la V12) no cambia nada', () => {
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
    expect(m).toMatchObject({ v: META_VERSION, renown: (2 + 3 + 5 + 4) * ESQUIRLAS_POR_CORONA, up: {}, runs: 9, best: LAST_STAGE, ach: { madre: true } });
    expect(m.stats.reach).toBe(LAST_STAGE);
    expect(m.seen.tools).toEqual(['piqueta']);
  });
});

describe('la campaña a medias de la 10.0 se cierra y cobra lo superado', () => {
  it('su versión ya no es la de ahora: no se puede continuar', () => {
    expect(G.campaign.run.v).not.toBe(RUN_VERSION);
    expect(RUN_VERSION).toBe(5);
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

describe('la campaña a medias de la 11.0 se sigue jugando', () => {
  it('se carga con los campos nuevos a cero y el bot la termina', () => {
    const raw = structuredClone(G11.campaign.run);
    expect(raw.v).toBe(RUN_11);
    const run = cargaRun(raw)!;
    expect(run).not.toBeNull();
    expect(run.v).toBe(RUN_VERSION);
    expect(run).toMatchObject({ esquirlas: 0, gotas: 0, caida: { oro: 0, esquirlas: 0, gotas: 0 }, ritual: null, esquirlasCorte: 0, stage: 3, phase: 'map' });
    expect(run.stats).toMatchObject({ esquirlas: 0, gotas: 0, sellosGratis: 0 });
    const P = [{ id: 'a', name: 'A' }];
    for (let guard = 0; guard < 4000 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
      if (run.phase === 'battle') {
        let state = startStage(run, P);
        while (state.phase === 'playing') {
          const res = applyAction(state, currentPlayer(state).id, chooseAction(state));
          trackEvents(run, res.events);
          state = res.state;
        }
        finishBattle(run, state);
      } else expect(runAction(run, chooseRunAction(run)!)).toBeNull();
    }
    expect(['won', 'lost']).toContain(run.phase);
    expect(run.esquirlas).toBeGreaterThan(0);
    const m = newMeta();
    expect(settle(m, run)).toBeGreaterThan(run.esquirlas);
  });
});
