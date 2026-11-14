// Datos de prueba (V9): un registro corto por campaña, guardado solo en este equipo (derrumbe:telemetria,
// las 10 últimas). Nada que identifique a nadie: cifras de partida y una lista cerrada de claves. Solo
// sale algo del equipo si la versión se construyó con VITE_TELEMETRY_URL y el jugador pulsa el botón
// (shareFeedback): sin temporizadores, sin envíos al cerrar. Sin la variable, el botón comparte, copia
// o descarga. Enganches de una línea: campaign.ts (noteRun), table.ts (noteTurn, noteAction).
import { fileName, TITLE } from '../shared/brand';
import { version } from '../../package.json';
import { DECK, type Run } from '../rules/run';
import type { Action, PlayerView } from '../rules/engine';
import { COMMUNITY_URL, platform } from './platform';

export interface TelemetryRun {
  v: string; dia: string; modo: 'campana' | 'sala' | 'guia'; jug: number;
  baraja: string; reinado: number; semilla: string;
  resultado: 'en curso' | 'victoria' | 'derrota' | 'saltada';
  asalto: number; turnos: number;
  /** Partida guiada: cómo acabó la última y cuántos segundos duró. */
  guia: 'victoria' | 'derrota' | 'saltada' | null; guiaS: number | null;
  /** Asalto de cada pico de duda (primera acción > 8 s y > 2 × la mediana). */
  dudas: number[];
  ofrecidas: string[]; elegidas: string[]; saltadas: string[];
  manga: number; rebobinar: number;
  causa: { tipo: string; texto: string } | null;
  entrada: 'raton' | 'tactil' | 'teclado' | 'mando'; ventana: string;
}
export type ShareResult = 'enviado' | 'compartido' | 'copiado' | 'descargado';
export interface TelemetryDeps {
  url?: string;
  storage: { load(k: string): string | null; save(k: string, v: string): void; remove(k: string): void };
  net?: (url: string, init: RequestInit) => Promise<{ ok: boolean }>;
  now: () => number;
  env?: () => Pick<TelemetryRun, 'entrada' | 'ventana'>;
  share?: (text: string, name: string, body: string) => Promise<boolean>;
  copy?: (text: string) => Promise<boolean>;
  save?: (name: string, body: string) => void;
  base?: string;
  community?: string;
}

export const KEY = 'derrumbe:telemetria';
/** Las únicas claves que puede llevar un registro (y `causa`: tipo y texto). */
const blank = (dia: string, modo: TelemetryRun['modo'] = 'campana', jug = 1): TelemetryRun => ({ v: version, dia, modo, jug, baraja: '', reinado: 0, semilla: '', resultado: 'en curso', asalto: 0, turnos: 0, guia: null, guiaS: null, dudas: [], ofrecidas: [], elegidas: [], saltadas: [], manga: 0, rebobinar: 0, causa: null, entrada: 'raton', ventana: '' });
export const KEYS = Object.keys(blank(''));
const day = (t: number) => new Date(t).toLocaleDateString('sv-SE');
/** Como mucho 40 por lista: así un registro nunca pasa de 5 KB. */
const add = (a: string[], ids: (string | undefined)[]) => ids.forEach((id) => id && a.length < 40 && !a.includes(id) && a.push(id));
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1] ?? 0;

export function createTelemetry(d: TelemetryDeps) {
  let log: TelemetryRun[] | null = null;
  let guideAt: number | null = null;
  let cur: { id: number; rec: TelemetryRun; lat: number[]; turn: string; at: number } | null = null;
  const env = () => d.env?.() ?? {};
  const rev = () => [...read()].reverse();
  const read = (): TelemetryRun[] => {
    if (!log) try { log = [...(JSON.parse(d.storage.load(KEY) ?? '[]') as TelemetryRun[])]; } catch { log = []; }
    return log;
  };
  const write = () => d.storage.save(KEY, JSON.stringify(read()));
  const fresh = (modo: TelemetryRun['modo'], jug = 1): TelemetryRun => {
    const g = rev().find((r) => r.guia);
    const all = read();
    const rec: TelemetryRun = { ...blank(day(d.now()), modo, jug), guia: g?.guia ?? null, guiaS: g?.guiaS ?? null, ...env() };
    all.push(rec);
    all.splice(0, Math.max(0, all.length - 10));
    return rec;
  };
  const last = () => rev().find((r) => r.modo !== 'guia') ?? read().at(-1) ?? null;

  function summary(r: TelemetryRun | null): string {
    if (!r) return `${TITLE} · ${version}: sin campañas guardadas`;
    const lines = [`${TITLE} · ${version} · Feedback de prueba`, `${r.resultado[0].toUpperCase() + r.resultado.slice(1)} · Asalto ${r.asalto} · ${r.turnos} turnos · Reinado ${r.reinado} · ${DECK[r.baraja]?.name ?? 'Partida guiada'}`];
    if (r.causa) lines.push(`Causa: ${r.causa.texto}`);
    lines.push(`Dudas: ${r.dudas.length} · La Manga: ${r.manga} · Rebobinar: ${r.rebobinar}`);
    if (r.semilla && d.base) lines.push(`${d.base}?${new URLSearchParams({ seed: r.semilla, baraja: r.baraja, nivel: String(r.reinado) })}`);
    return lines.join('\n');
  }

  return {
    /** Tras cada cambio de la campaña (local o en sala). */
    noteRun(run: Run, jug = 1): void {
      let rec = cur?.id === run.id ? cur.rec : undefined;
      // una campaña que se reanuda tras recargar sigue en su registro
      rec ??= run.seedText ? rev().find((r) => r.resultado === 'en curso' && r.semilla === run.seedText && r.baraja === run.deckId) : undefined;
      if (!rec) rec = fresh(jug > 1 ? 'sala' : 'campana', jug);
      if (cur?.rec !== rec) cur = { id: run.id, rec, lat: [], turn: '', at: 0 };
      const offered = run.phase === 'reward' ? run.loot : run.phase === 'shop' ? run.shop.filter((o) => o.kind === 'tool').map((o) => o.id) : [];
      add(rec.ofrecidas, offered);
      add(rec.elegidas, run.tools.map((t) => t.id).filter((id) => rec!.ofrecidas.includes(id)));
      const lost = run.phase === 'lost';
      const next = { ...rec, ...env(), baraja: run.deckId, reinado: run.ascension + 1, semilla: run.seedText || rec.semilla, asalto: run.stage, turnos: run.stats.turns, resultado: run.phase === 'won' ? 'victoria' : lost ? 'derrota' : 'en curso', saltadas: rec.ofrecidas.filter((id) => !rec!.elegidas.includes(id)), causa: lost && run.death ? { tipo: run.death.kind, texto: run.death.title } : null } as TelemetryRun;
      if (JSON.stringify(next) === JSON.stringify(rec)) return;
      Object.assign(rec, next);
      write();
    },
    /** La mesa deja jugar: empieza a contar la duda de este turno (una vez por turno). */
    noteTurn(view: PlayerView): void {
      const key = `${cur?.rec.asalto}:${view.turnCount}`;
      if (!cur || cur.turn === key || view.phase !== 'playing' || view.turnPlayer !== view.you) return;
      cur.turn = key;
      cur.at = d.now();
    },
    /** Una jugada del jugador: la primera del turno mide la duda; La Manga y Rebobinar se cuentan. */
    noteAction(type: Action['type']): void {
      if (!cur) return;
      const r = cur.rec;
      if (cur.at) {
        const ms = d.now() - cur.at;
        cur.at = 0;
        cur.lat.push(ms);
        if (ms > 8000 && ms > 2 * median(cur.lat) && r.dudas.length < 40) r.dudas.push(r.asalto);
      }
      if (type === 'stash') r.manga++;
      if (type === 'undo') r.rebobinar++;
      write();
    },
    /** La partida guiada: empieza, o acaba con su resultado (la duración va en segundos). */
    noteGuide(result: 'start' | 'victoria' | 'derrota' | 'saltada', turns = 0): void {
      if (result === 'start') return void (guideAt = d.now());
      if (guideAt === null) return;
      const rec = fresh('guia');
      Object.assign(rec, { resultado: result, turnos: turns, guia: result, guiaS: Math.round((d.now() - guideAt) / 1000) });
      guideAt = null;
      write();
    },
    telemetryLog: (): TelemetryRun[] => structuredClone(read()),
    telemetryBytes: (): number => new Blob([d.storage.load(KEY) ?? '']).size,
    clearTelemetry(): void {
      d.storage.remove(KEY);
      log = [];
      cur = null;
    },
    telemetryRemote: (): boolean => !!d.url,
    /** El botón «Enviar Crónica / Feedback de Prueba»: la única vía por la que algo sale del equipo. */
    async shareFeedback(): Promise<ShareResult> {
      const r = last();
      const body = JSON.stringify(r);
      if (d.url && r) {
        try {
          const res = await (d.net ?? fetch)(d.url, { method: 'POST', keepalive: true, body });
          if (res.ok) return 'enviado';
        } catch {
          /* sin red: se comparte, se copia o se descarga */
        }
      }
      const text = summary(r);
      const name = fileName('feedback', 'json', day(d.now()));
      try {
        if (await d.share?.(text, name, body)) return 'compartido';
      } catch {
        /* cancelado: sigue */
      }
      let copied = false;
      try {
        copied = !!(await d.copy?.(text));
      } catch {
        /* sin portapapeles */
      }
      d.save?.(name, body);
      return copied ? 'copiado' : 'descargado';
    },
    /** Con la comunidad en GitHub: un aviso nuevo con título y cuerpo rellenos con el resumen. */
    feedbackIssueUrl(): string | null {
      const m = /^(https:\/\/github\.com\/[^/?#]+\/[^/?#]+\/issues)\/?$/.exec(d.community ?? '');
      const r = last();
      if (!m || !r) return null;
      return `${m[1]}/new?${new URLSearchParams({ title: 'Feedback de prueba', body: summary(r) })}`;
    },
  };
}

const web = typeof window !== 'undefined' && typeof document !== 'undefined';
const INPUT = { pointer: 'raton', keys: 'teclado', pad: 'mando' } as const;
export const telemetry = createTelemetry({
  url: ((import.meta.env?.VITE_TELEMETRY_URL as string | undefined) ?? '').trim() || undefined,
  storage: platform,
  now: () => Date.now(),
  base: web ? location.href.split(/[?#]/)[0] : undefined,
  community: COMMUNITY_URL,
  env: () => {
    const mode = INPUT[(document.documentElement.dataset.input ?? 'pointer') as keyof typeof INPUT] ?? 'raton';
    return { entrada: mode === 'raton' && matchMedia('(pointer: coarse)').matches ? 'tactil' : mode, ventana: `${innerWidth - (innerWidth % 10)}x${innerHeight - (innerHeight % 10)}` };
  },
  async share(text, name, body) {
    const file = new File([body], name, { type: 'application/json' });
    if (!matchMedia('(pointer: coarse)').matches || !navigator.canShare?.({ files: [file] })) return false;
    await navigator.share({ files: [file], text, title: TITLE });
    return true;
  },
  async copy(text) {
    await navigator.clipboard.writeText(text);
    return true;
  },
  save: (name, body) => platform.saveFile(name, body),
});
export const { noteRun, noteTurn, noteAction, noteGuide, telemetryLog, telemetryBytes, clearTelemetry, telemetryRemote, shareFeedback, feedbackIssueUrl } = telemetry;

if (web && new URLSearchParams(location.search).has('qa')) Object.assign(window, { __qaTelemetry: telemetry });
