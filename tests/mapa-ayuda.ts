// V40 1e · Atajos de prueba para moverse por el Mapa de caminos sin recorrerlo: las pruebas de campaña que no son del
// Mapa entran directo al asalto del tramo (desde un nodo que lleva a él), cobran el oro del Botín y saltan lo demás.
import { expect } from 'vitest';
import { Run, runAction } from '../src/rules/run';
import { agregaTramo, asaltoDe, type TipoNodo } from '../src/rules/mapa';

const hace = (run: Run, a: Parameters<typeof runAction>[1]) => expect(runAction(run, a), JSON.stringify(a)).toBeNull();

/** Pone la campaña en el Mapa en un nodo que lleva a `id` y entra en él. */
export function alNodo(run: Run, id: number): void {
  const m = run.mapa;
  const previo = m.nodos.find((n) => n.hacia.includes(id));
  m.en = previo ? previo.id : -1;
  if (previo && !m.hechos.includes(previo.id)) m.hechos.push(previo.id);
  run.phase = 'map';
  hace(run, { t: 'ir', nodo: id });
}

/** Entra al asalto de `run.stage` (en el Trono infinito, el Mapa crece hasta él). */
export function alAsalto(run: Run): void {
  for (let t = Math.max(...run.mapa.nodos.map((n) => n.tramo)) + 1; t <= run.stage; t++) agregaTramo(run.mapa, run.id, t, true);
  const a = asaltoDe(run.mapa, run.stage);
  if (!a) throw new Error(`sin asalto ${run.stage}`);
  alNodo(run, a.id);
}

/** Entra a un nodo del tipo pedido en el tramo de `run.stage` (si el tramo no lo tiene, lo pone en la fila A). */
export function alTipo(run: Run, tipo: TipoNodo): void {
  const tramo = run.mapa.nodos.filter((n) => n.tramo === run.stage && !n.asalto);
  const n = tramo.find((x) => x.tipo === tipo) ?? tramo[0];
  if (!n) throw new Error(`sin tramo ${run.stage}`);
  n.tipo = tipo;
  alNodo(run, n.id);
}

/** Cobra el oro del Botín, salta lo demás y sigue al Mapa. */
export function cierraBotin(run: Run): void {
  run.botin.forEach((r, i) => r.estado === 'abierta' && hace(run, r.k === 'oro' ? { t: 'cobrar', i } : { t: 'saltar', i }));
  hace(run, { t: 'seguir' });
}

/** Cobra el oro del Botín (si lo hay) sin cerrarlo. */
export function cobraOroBotin(run: Run): void {
  const i = run.botin.findIndex((r) => r.k === 'oro' && r.estado === 'abierta');
  if (i >= 0) hace(run, { t: 'cobrar', i });
}
