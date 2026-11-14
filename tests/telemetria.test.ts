// V9 · Datos de prueba (src/client/telemetry.ts): solo en este equipo, con una lista cerrada de claves, y
// nada sale si no se pulsa el botón en una versión construida con VITE_TELEMETRY_URL. Se juega una
// campaña entera con el bot y se le pasa a la telemetría lo mismo que le pasaría la mesa.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chooseAction, chooseRunAction } from '../src/rules/bot';
import { Action, PlayerView, applyAction, currentPlayer, viewFor } from '../src/rules/engine';
import { Run, finishBattle, newRun, runAction, startStage, trackEvents } from '../src/rules/run';
import { KEY, KEYS, TelemetryDeps, createTelemetry } from '../src/client/telemetry';

type Step = { t: number } & ({ k: 'run'; run: Run } | { k: 'turn'; view: PlayerView } | { k: 'act'; type: Action['type'] });

/** Una campaña del bot, apuntada como la vería la mesa: cada cambio de campaña, cada turno y cada jugada. */
function campaign(seed: number): { steps: Step[]; run: Run } {
  const run = newRun({ seedText: `QA-${seed}`, deck: 'obra' }, seed);
  const steps: Step[] = [];
  let t = Date.UTC(2026, 10, 13, 21, 45, 12);
  const note = () => steps.push({ t, k: 'run', run: structuredClone(run) });
  note();
  for (let guard = 0; guard < 3000 && run.phase !== 'won' && run.phase !== 'lost'; guard++) {
    if (run.phase === 'battle') {
      let state = startStage(run, [{ id: 'tu', name: 'TÚ' }]);
      note();
      for (let n = 0; state.phase === 'playing' && n < 4000; n++) {
        steps.push({ t, k: 'turn', view: viewFor(state, 'tu') });
        // un jugador que piensa 1–3 s y, una vez por asalto, se queda 30 s mirando la mesa
        t += n === 5 ? 30_000 : 1000 + (n % 3) * 1000;
        const action = chooseAction(state);
        steps.push({ t, k: 'act', type: action.type });
        const res = applyAction(state, currentPlayer(state).id, action);
        trackEvents(run, res.events);
        state = res.state;
        t += 400;
      }
      finishBattle(run, state);
      note();
      continue;
    }
    const a = chooseRunAction(run);
    if (!a) break;
    runAction(run, a);
    t += 2000;
    note();
  }
  return { steps, run };
}

/** La primera campaña perdida (para tener causa de la derrota). Determinista: siempre la misma semilla. */
const lost = (() => {
  for (let seed = 1; seed < 60; seed++) {
    const c = campaign(seed);
    if (c.run.phase === 'lost') return c;
  }
  throw new Error('el bot no perdió ninguna campaña');
})();

function rig(url?: string, ok = true) {
  const mem = new Map<string, string>();
  const calls: { url: string; init: RequestInit }[] = [];
  const saved: { name: string; body: string }[] = [];
  let now = 0;
  const deps: TelemetryDeps = {
    url,
    storage: { load: (k) => mem.get(k) ?? null, save: (k, v) => void mem.set(k, v), remove: (k) => void mem.delete(k) },
    net: async (u, init) => {
      calls.push({ url: u, init });
      if (!ok) throw new Error('sin red');
      return { ok: true };
    },
    now: () => now,
    env: () => ({ entrada: 'mando', ventana: '1280x800' }),
    copy: async () => true,
    save: (name, body) => void saved.push({ name, body }),
    base: 'https://juego.test/',
    community: 'https://github.com/alguien/juego/issues',
  };
  const tel = createTelemetry(deps);
  const play = (steps: Step[]) => {
    for (const s of steps) {
      now = s.t;
      if (s.k === 'run') tel.noteRun(s.run);
      else if (s.k === 'turn') tel.noteTurn(s.view);
      else tel.noteAction(s.type);
    }
  };
  return { tel, mem, calls, saved, play };
}

describe('datos de prueba: solo en este equipo y solo al pulsar', () => {
  it('sin URL, una campaña entera y el botón hacen 0 llamadas de red (copia el resumen y descarga el archivo)', async () => {
    const r = rig();
    r.play(lost.steps);
    expect(await r.tel.shareFeedback()).toBe('copiado');
    expect(r.calls).toHaveLength(0);
    expect(r.saved).toHaveLength(1);
    expect(r.saved[0].name).toMatch(/^sangre-y-palo-feedback-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(r.saved[0].body)).toEqual(r.tel.telemetryLog().at(-1));
    expect(r.tel.telemetryRemote()).toBe(false);
  });

  it('con URL, una campaña entera sin pulsar hace 0 llamadas', () => {
    const r = rig('https://recoge.test/datos');
    r.play(lost.steps);
    expect(r.calls).toHaveLength(0);
    expect(r.tel.telemetryRemote()).toBe(true);
  });

  it('con URL y una pulsación, exactamente 1 llamada, POST con keepalive y < 5 KB', async () => {
    const r = rig('https://recoge.test/datos');
    r.play(lost.steps);
    expect(await r.tel.shareFeedback()).toBe('enviado');
    expect(r.calls).toHaveLength(1);
    const { url, init } = r.calls[0];
    expect(url).toBe('https://recoge.test/datos');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    const body = String(init.body);
    expect(Buffer.byteLength(body)).toBeLessThan(5000);
    expect(JSON.parse(body)).toEqual(r.tel.telemetryLog().at(-1));
    expect(r.saved).toHaveLength(0);
  });

  it('si el envío falla, una sola llamada y sigue como sin la variable (descarga)', async () => {
    const r = rig('https://recoge.test/datos', false);
    r.play(lost.steps);
    expect(await r.tel.shareFeedback()).toBe('copiado');
    expect(r.calls).toHaveLength(1);
    expect(r.saved).toHaveLength(1);
  });

  it('ningún campo fuera de la lista blanca y ninguna fecha con hora', async () => {
    const r = rig('https://recoge.test/datos');
    r.play(lost.steps);
    await r.tel.shareFeedback();
    const stored = JSON.parse(r.mem.get(KEY)!) as Record<string, unknown>[];
    const sent = JSON.parse(String(r.calls[0].init.body)) as Record<string, unknown>;
    for (const rec of [...stored, sent]) {
      expect(Object.keys(rec).filter((k) => !KEYS.includes(k))).toEqual([]);
      if (rec.causa) expect(Object.keys(rec.causa as object).sort()).toEqual(['texto', 'tipo']);
      expect(rec.dia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const text = JSON.stringify(rec);
      expect(text).not.toMatch(/\d{1,2}:\d{2}|T\d{2}:|\b\d{12,}\b/); // ni hora, ni marca de tiempo
    }
    expect(KEYS).not.toContain('nombre');
    expect(KEYS).not.toContain('sala');
  });

  it('el registro de la campaña: resultado, asalto, turnos, causa, reliquias, La Manga, Rebobinar y picos de duda', async () => {
    const r = rig();
    r.play(lost.steps);
    const rec = r.tel.telemetryLog().at(-1)!;
    expect(rec).toMatchObject({ modo: 'campana', jug: 1, baraja: 'obra', reinado: 1, semilla: lost.run.seedText, resultado: 'derrota', asalto: lost.run.stage, turnos: lost.run.stats.turns, entrada: 'mando', ventana: '1280x800' });
    expect(rec.causa?.tipo).toBe(lost.run.death?.kind);
    expect(rec.causa?.texto).toBe(lost.run.death?.title);
    // una duda de 30 s por asalto jugado, en su asalto
    expect(rec.dudas.length).toBeGreaterThanOrEqual(1);
    expect(rec.dudas.every((a) => a >= 1 && a <= rec.asalto)).toBe(true);
    expect(rec.manga).toBe(lost.steps.filter((s) => s.k === 'act' && s.type === 'stash').length);
    expect(rec.ofrecidas.length).toBeGreaterThan(0);
    expect([...rec.elegidas, ...rec.saltadas].sort()).toEqual([...rec.ofrecidas].sort());
    expect(Buffer.byteLength(JSON.stringify(rec))).toBeLessThan(5000);
    expect(r.tel.telemetryBytes()).toBe(Buffer.byteLength(r.mem.get(KEY)!));
    // el aviso de GitHub lleva el resumen (≤ 6 líneas), no el JSON
    const issue = new URL(r.tel.feedbackIssueUrl()!);
    expect(issue.pathname).toBe('/alguien/juego/issues/new');
    const body = issue.searchParams.get('body')!;
    expect(body.split('\n').length).toBeLessThanOrEqual(6);
    expect(body).toContain('SANGRE Y PALO');
    expect(body).toContain(`?seed=${lost.run.seedText}`);
    expect(body).not.toContain('{');
  });

  it('la partida guiada: si se terminó y cuánto duró; y solo se guardan las 10 últimas', () => {
    const g = rig();
    // sin campaña, una jugada (la de la partida guiada) no se apunta en ningún registro
    g.play([{ t: 0, k: 'act', type: 'stash' }]);
    expect(g.tel.telemetryLog()).toEqual([]);
    g.tel.noteGuide('start');
    // el reloj avanza 95 s mientras se juega la partida guiada
    g.play([{ t: 95_000, k: 'turn', view: viewFor(startStage(newRun({}, 1), [{ id: 'tu', name: 'TÚ' }]), 'tu') }]);
    g.tel.noteGuide('victoria', 7);
    const guide = g.tel.telemetryLog().at(-1)!;
    expect(guide).toMatchObject({ modo: 'guia', resultado: 'victoria', turnos: 7, guia: 'victoria', guiaS: 95 });
    // una campaña nueva lleva cómo acabó la partida guiada
    for (let i = 0; i < 12; i++) g.play([{ t: 100_000 + i, k: 'run', run: newRun({ seedText: `OTRA-${i}` }, 100 + i) }]);
    const log = g.tel.telemetryLog();
    expect(log).toHaveLength(10);
    expect(log.at(-1)).toMatchObject({ guia: 'victoria', guiaS: 95, semilla: 'OTRA-11' });
  });

  it('clearTelemetry() deja la clave vacía', () => {
    const r = rig();
    r.play(lost.steps);
    expect(r.mem.has(KEY)).toBe(true);
    r.tel.clearTelemetry();
    expect(r.mem.has(KEY)).toBe(false);
    expect(r.tel.telemetryLog()).toEqual([]);
    expect(r.tel.telemetryBytes()).toBe(0);
  });

  it('el módulo no envía por su cuenta: fetch solo en shareFeedback, y nada de sendBeacon, XMLHttpRequest ni temporizadores', () => {
    const src = readFileSync(new URL('../src/client/telemetry.ts', import.meta.url), 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, '');
    expect(src).not.toMatch(/sendBeacon|XMLHttpRequest|setTimeout|setInterval|requestIdleCallback|addEventListener|onbeforeunload|visibilitychange/);
    expect(src.match(/\bfetch\b/g)).toHaveLength(1);
    const share = src.slice(src.indexOf('async shareFeedback'), src.indexOf('feedbackIssueUrl()'));
    expect(share).toMatch(/\bfetch\b/);
  });
});
