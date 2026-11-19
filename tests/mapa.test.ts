// V40 1e · El Mapa de caminos, el Botín por partes, los servicios de La Pulpería y del Fogón, y la migración de las
// campañas del tramo 1d.
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/rules/balance-config';
import { GameState, applyAction, currentPlayer } from '../src/rules/engine';
import { chooseAction, chooseRunAction, POLITICAS_RUTA } from '../src/rules/bot';
import { RUN_40D, abonoFrancesa, campanaSinMapa } from '../src/rules/migracion';
import { CENTRO, COLUMNAS, TIPOS_NODO, alcanceDe, alcanzables, asaltoDe, caminos, filaAsalto, generaMapa } from '../src/rules/mapa';
import { LAST_STAGE, MAPA_CFG, MIN_DECK, rangoBravo, RUN_VERSION, Run, RunAction, botinPrevisto, finishBattle, nodosAlcanzables, newRun, runAction, serviciosFogon, serviciosPulperia, stageConfig, stageDef, startStage, trackEvents } from '../src/rules/run';
import { alNodo, alTipo, cierraBotin } from './mapa-ayuda';

BALANCE.oferta.inicio = 0; // sin la oferta de salida: del Sobre al Mapa

const P = [{ id: 'a', name: 'A' }];
const act = (run: Run, a: RunAction) => expect(runAction(run, a), JSON.stringify(a)).toBeNull();
const jefe = (t: number) => stageDef(t).boss;

/** Gana el combate en curso sin jugarlo. */
function gana(run: Run): GameState {
  const st = startStage(run, P);
  for (const t of Object.values(st.towers)) t.floors = [];
  st.phase = 'won';
  finishBattle(run, st);
  return st;
}

describe('V40 1e · la forma del Mapa', () => {
  it('es un grafo válido: conexo, todo camino llega al asalto, ≥ 1 Bravo y una Pulpería al alcance en cada tramo', () => {
    for (let semilla = 1; semilla <= 300; semilla++) {
      const m = generaMapa(semilla, LAST_STAGE, jefe);
      // tramo 1: solo el asalto; tramos 2 a 5: 3 + 3 nodos y su asalto
      expect(m.nodos.length).toBe(1 + 7 * (LAST_STAGE - 1));
      expect(alcanzables(m)).toEqual([asaltoDe(m, 1)!.id]);
      // conexo: desde el comienzo se llega a todos los nodos
      expect(alcanceDe(m, -1).size).toBe(m.nodos.length);
      for (const n of m.nodos) {
        expect(TIPOS_NODO).toContain(n.tipo);
        expect(n.col).toBeGreaterThanOrEqual(0);
        expect(n.col).toBeLessThan(COLUMNAS);
        for (const h of n.hacia) expect(m.nodos[h].fila).toBe(n.fila + 1);
      }
      for (let t = 2; t <= LAST_STAGE; t++) {
        const previo = asaltoDe(m, t - 1)!;
        const asalto = asaltoDe(m, t)!;
        expect(asalto).toMatchObject({ fila: filaAsalto(t), col: CENTRO, tipo: jefe(t) ? 'rey' : 'guardia' });
        const cs = caminos(m, previo.id, asalto.id);
        expect(cs.length, `semilla ${semilla} tramo ${t}`).toBe(6);
        // todo nodo del tramo está en algún camino y todo camino acaba en el asalto (sin callejones)
        const tramo = m.nodos.filter((n) => n.tramo === t);
        for (const n of tramo) expect(cs.some((c) => c.includes(n.id))).toBe(true);
        for (const n of tramo.filter((x) => !x.asalto)) expect(alcanceDe(m, n.id).has(asalto.id)).toBe(true);
        // desde cualquier nodo de la primera fila hay una Pulpería al alcance antes del asalto
        for (const a of tramo.filter((n) => n.fila === filaAsalto(t - 1) + 1)) {
          const alcance = [a.id, ...alcanceDe(m, a.id)].map((id) => m.nodos[id]).filter((n) => n.tramo === t);
          expect(alcance.some((n) => n.tipo === 'pulperia'), `semilla ${semilla} tramo ${t}`).toBe(true);
        }
        expect(tramo.some((n) => n.tipo === 'bravo')).toBe(true);
        for (const b of tramo.filter((n) => n.tipo === 'bravo')) expect(['S', 'C', 'D', 'H']).toContain(b.palo);
      }
    }
  });

  it('la misma semilla da el mismo Mapa (y no depende de lo que se juegue); otra semilla, otro', () => {
    expect(JSON.stringify(generaMapa(42, LAST_STAGE, jefe))).toBe(JSON.stringify(generaMapa(42, LAST_STAGE, jefe)));
    expect(JSON.stringify(generaMapa(42, LAST_STAGE, jefe))).not.toBe(JSON.stringify(generaMapa(43, LAST_STAGE, jefe)));
    const a = newRun({ seedText: 'MAPA' }, 1);
    const b = newRun({ seedText: 'MAPA' }, 2);
    expect(a.mapa).toEqual(b.mapa);
    // el Mapa sale de la semilla, no del azar de la campaña
    expect(a.mapa).toEqual(generaMapa(a.id, LAST_STAGE, jefe));
    // es JSON: se guarda tal cual
    expect(JSON.parse(JSON.stringify(a.mapa))).toEqual(a.mapa);
  });

  it('solo se va a un nodo alcanzable; ir mueve el marcador, cuenta el nodo y abre lo que es', () => {
    const run = newRun({ seedText: 'RUTA' }, 1);
    act(run, { t: 'begin' });
    expect(nodosAlcanzables(run).map((n) => n.tipo)).toEqual(['guardia']);
    expect(runAction(run, { t: 'ir', nodo: 3 })).toMatch(/no sale de acá/);
    act(run, { t: 'ir', nodo: 0 });
    expect(run).toMatchObject({ phase: 'battle', combate: 'asalto', boss: null });
    expect(run.mapa).toMatchObject({ en: 0, hechos: [0] });
    expect(nodosAlcanzables(run)).toEqual([]);
    gana(run);
    cierraBotin(run);
    expect(run).toMatchObject({ phase: 'map', stage: 2 });
    expect(nodosAlcanzables(run).map((n) => n.fila)).toEqual([1, 1, 1]);
    for (const tipo of ['pulperia', 'fogon', 'santuario', 'bravo'] as const) {
      const r = structuredClone(run);
      alTipo(r, tipo);
      expect(r.phase).toBe({ pulperia: 'shop', fogon: 'fogon', santuario: 'event', bravo: 'battle' }[tipo]);
      expect(r.stats.nodos[tipo]).toBe(1);
    }
  });
});

describe('V40 1e · el Guardia Bravo', () => {
  it('un guardia solo (Vida ×mapa.bravo.vida, Ataque +mapa.bravo.ataque), sin jefe; paga oro, Amuleto y la Bendición de mapa.bravo.bendicion Reyes; no cura', () => {
    const run = newRun({ seedText: 'BRAVO' }, 1);
    act(run, { t: 'begin' });
    alNodo(run, 0);
    gana(run);
    cierraBotin(run);
    const asalto = stageConfig(run);
    alTipo(run, 'bravo');
    const nodo = run.mapa.nodos[run.mapa.en];
    expect(run).toMatchObject({ phase: 'battle', combate: 'bravo', boss: null });
    const cfg = stageConfig(run);
    const st = startStage(run, P);
    const conGuardias = Object.values(st.towers).filter((t) => t.floors.length);
    expect(conGuardias).toHaveLength(1);
    expect(conGuardias[0].floors).toHaveLength(1);
    expect(cfg.orden).toEqual([nodo.palo]);
    const r = rangoBravo(2);
    expect(cfg.floorThreat[r]).toBe(asalto.floorThreat[r] + MAPA_CFG.bravo.ataque);
    // la Vida se redondea a 5 después de multiplicar: a lo sumo 2,5 de diferencia
    expect(Math.abs(cfg.floorHp[r] - asalto.floorHp[r] * MAPA_CFG.bravo.vida)).toBeLessThanOrEqual(2.5);
    run.integrity = 10;
    gana(run);
    expect(run.integrity).toBe(10); // sin la cura de asalto
    expect(run.stats.contracts).toBe(1);
    expect(run.botin[0]).toEqual({ k: 'oro', n: MAPA_CFG.bravo.oro, estado: 'abierta' });
    expect(run.botin.some((x) => x.k === 'amuleto' || (x.k === 'elegi' && x.tipo === 'amuleto'))).toBe(true);
    const b = run.botin.find((x) => x.k === 'elegi' && x.tipo === 'bendicion');
    expect(b && b.k === 'elegi' ? b.opciones.length : 0).toBe(MAPA_CFG.bravo.bendicion);
    // tras el Bravo se sigue en el mismo tramo, hacia el asalto
    act(run, { t: 'seguir' });
    expect(run).toMatchObject({ phase: 'map', stage: 2, combate: null });
    expect(nodosAlcanzables(run).length).toBeGreaterThan(0);
  });

  it('el Botín previsto de cada tipo (para la vista previa del Mapa)', () => {
    const run = newRun({}, 3);
    expect(botinPrevisto(run, 'bravo')).toEqual({ oro: MAPA_CFG.bravo.oro, elegi: [], amuleto: true });
    expect(botinPrevisto(run, 'fogon').cura).toBe(MAPA_CFG.fogon.curar);
    expect(botinPrevisto(run, 'rey', 2).elegi).toEqual(['bendicion', 'trampa', 'amuleto']);
    expect(botinPrevisto(run, 'guardia', 3).elegi).toEqual(['bendicion', 'trampa']);
    expect(botinPrevisto(run, 'rey', LAST_STAGE)).toMatchObject({ oro: 0, elegi: [] });
    expect(botinPrevisto(run, 'pulperia')).toEqual({ oro: 0, elegi: [], amuleto: false });
  });
});

describe('V40 1e · La Pulpería y el Fogón', () => {
  const enPulperia = (): Run => {
    const run = newRun({ seedText: 'PULPERIA' }, 1);
    act(run, { t: 'begin' });
    alNodo(run, 0);
    gana(run);
    cierraBotin(run);
    alTipo(run, 'pulperia');
    run.gold = 60;
    return run;
  };

  it('Purgar saca la carta del mazo y su precio sube con cada uso; nunca por debajo del mazo mínimo', () => {
    const run = enPulperia();
    const sv = serviciosPulperia(run);
    expect(sv.purgar).toMatchObject({ precio: BALANCE.taberna.hoguera.base, paso: BALANCE.taberna.hoguera.paso, puede: true });
    const size = run.deck.length;
    act(run, { t: 'burn', card: 'S2' });
    expect(run.deck.length).toBe(size - 1);
    expect(run.deck.some((c) => c.id === 'S2')).toBe(false);
    expect(run.gold).toBe(60 - sv.purgar.precio);
    expect(serviciosPulperia(run).purgar.precio).toBe(sv.purgar.precio + sv.purgar.paso);
    run.deck = run.deck.slice(0, MIN_DECK);
    expect(serviciosPulperia(run).purgar.puede).toBe(false);
    expect(runAction(run, { t: 'burn', card: run.deck[0].id })).toMatch(/no puede bajar/);
  });

  it('Curar da Vida por oro, con el precio a la vista y creciente; con la Vida llena no se puede', () => {
    const run = enPulperia();
    expect(serviciosPulperia(run).curar.puede).toBe(false); // Vida llena
    run.integrity = 5;
    const sv = serviciosPulperia(run).curar;
    expect(sv).toMatchObject({ precio: BALANCE.taberna.curar.base, vida: BALANCE.taberna.curar.vida, puede: true });
    act(run, { t: 'heal' });
    expect(run.integrity).toBe(Math.min(run.maxIntegrity, 5 + sv.vida));
    expect(run.gold).toBe(60 - sv.precio);
    expect(serviciosPulperia(run).curar.precio).toBe(sv.precio + sv.paso);
    // al salir se vuelve al Mapa del mismo tramo
    act(run, { t: 'next' });
    expect(run).toMatchObject({ phase: 'map', stage: 2, shop: [] });
  });

  it('el Fogón: Curar o Purgar gratis, uno de los dos (con el Cartógrafo, los dos)', () => {
    const fogon = (up: Record<string, number>): Run => {
      const run = newRun({ seedText: 'FOGON', up }, 1);
      act(run, { t: 'begin' });
      alNodo(run, 0);
      gana(run);
      cierraBotin(run);
      run.integrity = 3;
      alTipo(run, 'fogon');
      return run;
    };
    const run = fogon({});
    const sv = serviciosFogon(run);
    expect(sv).toMatchObject({ curar: { precio: 0, vida: MAPA_CFG.fogon.curar, puede: true }, purgar: { precio: 0, puede: true }, ambos: false });
    const gold = run.gold;
    act(run, { t: 'fogon', que: 'curar' });
    expect(run.integrity).toBe(3 + MAPA_CFG.fogon.curar);
    expect(run.gold).toBe(gold);
    // V40 1f · usado: su Botín (una «Elegí una» Bendición) y, al cerrarlo, de vuelta al Mapa
    expect(run.phase).toBe(MAPA_CFG.fogon.bendicion ? 'reward' : 'map');
    if (MAPA_CFG.fogon.bendicion) expect(run.botin).toMatchObject([{ k: 'elegi', tipo: 'bendicion', estado: 'abierta' }]);
    if (run.phase === 'reward') cierraBotin(run);
    expect(run.phase).toBe('map');
    expect(runAction(run, { t: 'fogon', que: 'purgar', card: 'S2' })).toMatch(/Fogón/);

    const otra = fogon({});
    const size = otra.deck.length;
    act(otra, { t: 'fogon', que: 'purgar', card: 'S2' });
    expect(otra.deck.length).toBe(size - 1);
    expect(otra.removals).toBe(0); // gratis: no sube el precio de Purgar en La Pulpería
    expect(otra.phase).toBe(MAPA_CFG.fogon.bendicion ? 'reward' : 'map');

    const ambos = fogon({ rutas: 1 });
    expect(serviciosFogon(ambos).ambos).toBe(true);
    act(ambos, { t: 'fogon', que: 'curar' });
    expect(ambos.phase).toBe('fogon');
    expect(runAction(ambos, { t: 'fogon', que: 'curar' })).toMatch(/ya se usó/);
    act(ambos, { t: 'fogon', que: 'purgar', card: 'S3' });
    expect(ambos.phase).toBe(MAPA_CFG.fogon.bendicion ? 'reward' : 'map');
  });

  it('V40 1f · el Fogón da su Bendición también si se sale sin usarlo, y nunca en el Trono infinito', () => {
    const run = newRun({ seedText: 'FOGON', up: {} }, 1);
    act(run, { t: 'begin' });
    alNodo(run, 0);
    gana(run);
    cierraBotin(run);
    alTipo(run, 'fogon');
    expect(botinPrevisto(run, 'fogon').elegi).toEqual(MAPA_CFG.fogon.bendicion ? ['bendicion'] : []);
    act(run, { t: 'next' });
    expect(run.phase).toBe(MAPA_CFG.fogon.bendicion ? 'reward' : 'map');
    const b = run.botin[0];
    if (MAPA_CFG.fogon.bendicion) expect(b && b.k === 'elegi' && b.tipo === 'bendicion' ? b.opciones.length : 0).toBeGreaterThan(0);
    run.endless = true;
    expect(botinPrevisto(run, 'fogon').elegi).toEqual([]);
  });
});

describe('V40 1e · el bot recorre el Mapa con cada política de ruta', () => {
  it('cada política llega al final de la campaña, reproducible, y la sin Pulpería nunca entra en una', () => {
    for (const ruta of POLITICAS_RUTA) {
      const juega = (): Run => {
        const run = newRun({ seedText: `RUTA-${ruta}` }, 1);
        for (let guard = 0; guard < 5000 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
          if (run.phase === 'battle') {
            let st = startStage(run, P);
            while (st.phase === 'playing') {
              const res = applyAction(st, currentPlayer(st).id, chooseAction(st));
              trackEvents(run, res.events);
              st = res.state;
            }
            finishBattle(run, st);
          } else act(run, chooseRunAction(run, { ruta })!);
        }
        return run;
      };
      const a = juega();
      expect(['won', 'lost'], ruta).toContain(a.phase);
      expect(JSON.stringify(a)).toBe(JSON.stringify(juega()));
      if (ruta === 'sinPulperia') expect(a.stats.nodos.pulperia ?? 0).toBe(0);
      if (ruta === 'prudente') expect(a.stats.nodos.bravo ?? 0).toBe(0);
    }
  });
});

describe('V40 1e · las campañas del tramo 1d (sin Mapa) se cierran con abono', () => {
  it('se reconocen por su versión, no se cargan y abonan las esquirlas juntadas', () => {
    expect(RUN_VERSION).toBe(RUN_40D + 1);
    const vieja = { v: RUN_40D, stage: 3, phase: 'map', esquirlas: 140, stats: {}, node: { routes: ['intacto'], tag: null } };
    expect(campanaSinMapa(vieja)).toBe(true);
    expect(abonoFrancesa(vieja)).toBe(140);
    expect(abonoFrancesa({ ...vieja, phase: 'won' })).toBe(0);
    expect(campanaSinMapa(newRun({}, 1))).toBe(false);
    expect(campanaSinMapa({ v: RUN_40D - 1 })).toBe(false);
  });
});
