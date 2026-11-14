// Objetivos de balance, como datos: los lee el laboratorio (npm run analyze:meta) para sus avisos y el
// afinador (npm run balance:tune) para saber qué arreglar y cuánto margen queda. Una sola lista, sin copias.
// `revisar` recorre un informe (el objeto que escribe analyze:meta en meta-report.json) y devuelve, en el
// orden de siempre, una comprobación por objetivo: el texto del aviso, si se cumple y sus números.

/** Los rangos. Todo en % de campañas ganadas, salvo el ritmo (turnos) y la letalidad (veces la media). */
export const OBJETIVOS = {
  /** Reinado 1 y Reinado 8 «Puertas selladas», con la Orden vacía y llena. */
  reinado1: { vacio: [24, 30], lleno: [40, 48] },
  reinado8: { vacio: [6, 9], lleno: [12, 17] },
  /** Barajas en el Reinado 1. El objetivo de la Orden llena es 40–45; avisa fuera de 38–48. */
  barajas: { lleno: [38, 48], llenoObjetivo: '40–45', vacio: [22, 32], vacioObjetivo: '24–31', sumaMinima: 6 },
  /** Reliquias y especiales dados de salida: trampa por debajo, victoria regalada por encima. */
  regalo: { trampa: 35, maximo: 68, eleccionMinima: 5, ofertasMinimas: 40 },
  /** Letalidad de cada monarca respecto a la media (con al menos `enfrentados` encuentros). */
  monarcas: { ratio: [0.8, 1.3], enfrentados: 150 },
  /** Turnos por asalto: hasta qué asalto vale cada tramo, rango de la mediana y tope del percentil 95. */
  ritmo: [
    { hasta: 1, mediana: [5, 7], p95: 10 },
    { hasta: 3, mediana: [8, 10], p95: 15 },
    { hasta: Infinity, mediana: [9, 13], p95: 19 },
  ],
  /** Peor percentil 95 de los asaltos 4 a 8, en cada baraja. */
  ritmoBaraja: 19,
  /** Asalto único (partida clásica): victorias del bot con 1, 2, 3 y 4 jugadores. */
  clasica: [58, 65],
} as const;

/** Un número frente a su rango (`lo`/`hi` pueden faltar: sin límite por ese lado). */
export interface Parte {
  valor: number;
  lo?: number;
  hi?: number;
}
export interface Comprobacion {
  /** Estable: `reinado1.vacio`, `ritmo.4`, `monarca.furia`, `reliquia.horno.trampa`… */
  id: string;
  /** El texto del aviso tal como sale en el informe (si no se cumple). */
  texto: string;
  ok: boolean;
  partes: Parte[];
  /** Solo lo mide el informe completo (piezas de regalo): el afinador no lo puede seguir con sondeos. */
  completo?: boolean;
}

/** Lo que se necesita del informe (la forma de meta-report.json). */
export interface InformeMeta {
  winrate: { levels: { level: number; vacio: number; lleno: number; n: number }[]; decks: { deck: string; name: string; vacio: number; lleno: number; n: number }[] };
  tools: Pieza[];
  specials: Pieza[];
  bosses: { id: string; who: string; faced: number; deaths: number; lethality: number }[];
  avgLethality: number;
  pacing: { stage: number; name: string; p50: number; p95: number; n: number }[];
  pacingByDeck: { deck: string; name: string; worstP95: number; n: number }[];
  giftBaseline: number;
  giftBaselineN: number;
  classic?: { players: number; winrate: number; n: number }[];
}
export interface Pieza {
  id: string;
  name: string;
  pick: number;
  offered: number;
  given: number | null;
  givenN: number;
  delta: number | null;
  confirmN: number;
  confirm: number | null;
  confirmDelta: number | null;
}

/**
 * Cuánto tiene que empeorar una pieza para avisar: tres desviaciones típicas de la diferencia entre dos
 * proporciones, la de la pieza (n campañas) y la de referencia (nRef campañas sin regalo). Son unas 77
 * comparaciones por informe: con dos desviaciones saldrían casi dos avisos falsos cada vez; con tres,
 * uno de cada diez informes.
 */
export const noise = (n: number, nRef: number, refPct: number) => {
  const p = Math.min(0.9, Math.max(0.1, refPct / 100));
  return Math.round(3 * Math.sqrt(p * (1 - p) * (1 / Math.max(1, n) + 1 / Math.max(1, nRef))) * 1000) / 10;
};

const inRange = (v: number, [lo, hi]: readonly number[]) => v >= lo && v <= hi;

/** Todas las comprobaciones del informe, en el orden en que salen los avisos (sin la partida clásica). */
export function revisar(r: InformeMeta): Comprobacion[] {
  const out: Comprobacion[] = [];
  const O = OBJETIVOS;
  const has = (c: { n: number }) => c.n > 0;
  const l1 = r.winrate.levels[0];
  const l8 = r.winrate.levels[7];
  const rango = (id: string, v: number, rg: readonly number[], texto: string) => out.push({ id, texto, ok: inRange(v, rg), partes: [{ valor: v, lo: rg[0], hi: rg[1] }] });
  if (l1 && has(l1)) {
    rango('reinado1.vacio', l1.vacio, O.reinado1.vacio, `Reinado 1 con la Orden vacía: ${l1.vacio} % (objetivo ${O.reinado1.vacio.join('–')})`);
    rango('reinado1.lleno', l1.lleno, O.reinado1.lleno, `Reinado 1 con la Orden llena: ${l1.lleno} % (objetivo ${O.reinado1.lleno.join('–')})`);
  }
  if (l8 && has(l8)) {
    rango('reinado8.vacio', l8.vacio, O.reinado8.vacio, `Reinado 8 con la Orden vacía: ${l8.vacio} % (objetivo ${O.reinado8.vacio.join('–')})`);
    rango('reinado8.lleno', l8.lleno, O.reinado8.lleno, `Reinado 8 con la Orden llena: ${l8.lleno} % (objetivo ${O.reinado8.lleno.join('–')})`);
  }
  // cada nivel tiene que ser más difícil que el anterior, con la Orden vacía y con la llena
  for (let i = 1; i < r.winrate.levels.length; i++) {
    const a = r.winrate.levels[i - 1];
    const b = r.winrate.levels[i];
    if (!has(a) || !has(b)) continue;
    out.push({ id: `escalera.${b.level}.vacio`, texto: `Reinados ${a.level} → ${b.level} con la Orden vacía: ${a.vacio} % → ${b.vacio} % (no baja)`, ok: b.vacio < a.vacio, partes: [{ valor: a.vacio - b.vacio, lo: 0.1 }] });
    out.push({ id: `escalera.${b.level}.lleno`, texto: `Reinados ${a.level} → ${b.level} con la Orden llena: ${a.lleno} % → ${b.lleno} % (no baja)`, ok: b.lleno < a.lleno, partes: [{ valor: a.lleno - b.lleno, lo: 0.1 }] });
  }
  for (const d of r.winrate.decks) {
    if (!has(d) || d.deck === 'obra') continue;
    rango(`baraja.${d.deck}.lleno`, d.lleno, O.barajas.lleno, `${d.name}: ${d.lleno} % con la Orden llena (objetivo ${O.barajas.llenoObjetivo}, margen ${O.barajas.lleno.join('–')})`);
    rango(`baraja.${d.deck}.vacio`, d.vacio, O.barajas.vacio, `${d.name}: ${d.vacio} % con la Orden vacía (objetivo ${O.barajas.vacioObjetivo})`);
    const suma = d.lleno - d.vacio;
    out.push({ id: `baraja.${d.deck}.orden`, texto: `${d.name}: la Orden llena solo le suma ${Math.round(suma * 10) / 10} puntos`, ok: !(suma < O.barajas.sumaMinima), partes: [{ valor: suma, lo: O.barajas.sumaMinima }] });
  }
  const ref = r.giftBaselineN;
  const refPct = r.giftBaseline;
  /** Lo que ganó la pieza dada de salida: manda la segunda vuelta si la hubo. */
  const final = (x: Pieza) => (x.confirmN ? [x.confirm, x.confirmN] : [x.given, x.givenN]) as [number | null, number];
  /** Llevarla de salida empeora el resultado más allá del ruido (con segunda vuelta, manda ella). */
  const worse = (kind: string, x: Pieza) => {
    if (!x.givenN || (x.delta ?? 0) > -noise(x.givenN, ref, refPct)) return;
    const [delta, n] = x.confirmN ? [x.confirmDelta ?? 0, x.confirmN] : [x.delta ?? 0, x.givenN];
    const ruido = noise(n, ref, refPct);
    out.push({ id: `${kind.toLowerCase()}.${x.id}.empeora`, completo: true, texto: `${kind} ${x.name}: llevarla de salida empeora el resultado (${delta} puntos en ${n} campañas; ruido ±${ruido})`, ok: !(delta <= -ruido), partes: [{ valor: delta, lo: -ruido }] });
  };
  const G = O.regalo;
  for (const t of r.tools) {
    const [won, n] = final(t);
    if (won !== null) {
      out.push({ id: `reliquia.${t.id}.regalada`, completo: true, texto: `Reliquia ${t.name}: ${won} % ganadas si se da de salida en ${n} campañas (> ${G.maximo}: victoria regalada)`, ok: !(won > G.maximo), partes: [{ valor: won, hi: G.maximo }] });
      out.push({ id: `reliquia.${t.id}.trampa`, completo: true, texto: `Reliquia ${t.name}: ${won} % ganadas si se da de salida en ${n} campañas (< ${G.trampa}: trampa)`, ok: !(won < G.trampa), partes: [{ valor: won, lo: G.trampa }] });
    }
    if (t.offered >= G.ofertasMinimas) out.push({ id: `reliquia.${t.id}.eleccion`, completo: true, texto: `Reliquia ${t.name}: casi nunca se elige (${t.pick} %) y no ayuda (${t.delta})`, ok: !(t.pick < G.eleccionMinima && (t.delta ?? 0) <= 0), partes: [{ valor: t.pick, lo: G.eleccionMinima }] });
    worse('Reliquia', t);
  }
  for (const sp of r.specials) {
    const [won, n] = final(sp);
    if (won !== null) out.push({ id: `especial.${sp.id}.regalada`, completo: true, texto: `Especial ${sp.name}: ${won} % ganadas si se da de salida en ${n} campañas (> ${G.maximo})`, ok: !(won > G.maximo), partes: [{ valor: won, hi: G.maximo }] });
    worse('Especial', sp);
  }
  // monarcas: todos entre 0,8× y 1,3× de la letalidad media
  for (const b of r.bosses) {
    if (b.faced < O.monarcas.enfrentados) continue;
    const ratio = r.avgLethality ? b.lethality / r.avgLethality : 1;
    out.push({ id: `monarca.${b.id}`, texto: `Monarca ${b.who}: letalidad ${b.lethality} % (×${ratio.toFixed(2)} de la media; objetivo 0,8×–1,3×)`, ok: !(ratio < O.monarcas.ratio[0] || ratio > O.monarcas.ratio[1]), partes: [{ valor: ratio, lo: O.monarcas.ratio[0], hi: O.monarcas.ratio[1] }] });
  }
  // ritmo: asalto 1 de 5 a 7 turnos (P95 ≤ 10), asaltos 2 y 3 de 8 a 10 (P95 ≤ 15), asaltos 4 a 8 de 9 a 13 (P95 ≤ 19)
  for (const p of r.pacing) {
    if (!p.n) continue;
    const tramo = O.ritmo.find((t) => p.stage <= t.hasta)!;
    const [lo, hi] = tramo.mediana;
    const top = tramo.p95;
    out.push({ id: `ritmo.${p.stage}`, texto: `Asalto ${p.stage} (${p.name}): mediana ${p.p50} y percentil 95 ${p.p95} (objetivo ${lo}–${hi} y ≤ ${top})`, ok: !(p.p50 < lo || p.p50 > hi || p.p95 > top), partes: [{ valor: p.p50, lo, hi }, { valor: p.p95, hi: top }] });
  }
  for (const d of r.pacingByDeck) out.push({ id: `ritmo.baraja.${d.deck}`, texto: `${d.name}: percentil 95 de ${d.worstP95} turnos en algún asalto del 4 al 8 (objetivo ≤ ${O.ritmoBaraja})`, ok: !(d.worstP95 > O.ritmoBaraja), partes: [{ valor: d.worstP95, hi: O.ritmoBaraja }] });
  return out;
}

/** La partida clásica: del 58 al 65 % con 1, 2, 3 y 4 jugadores. */
export function revisarClasica(rows: { players: number; winrate: number }[]): Comprobacion[] {
  return rows.map((c) => ({
    id: `clasica.${c.players}`,
    texto: `Asalto único con ${c.players} jugador${c.players > 1 ? 'es' : ''}: ${c.winrate} % (objetivo ${OBJETIVOS.clasica.join('–')})`,
    ok: inRange(c.winrate, OBJETIVOS.clasica),
    partes: [{ valor: c.winrate, lo: OBJETIVOS.clasica[0], hi: OBJETIVOS.clasica[1] }],
  }));
}

/** Los avisos de un informe: el texto de cada comprobación que no se cumple, en orden. */
export function avisos(r: InformeMeta): string[] {
  return [...revisar(r), ...revisarClasica(r.classic ?? [])].filter((c) => !c.ok).map((c) => c.texto);
}

/** Cuánto le sobra a una comprobación hasta el borde más cercano de su rango (negativo: fuera). */
export function margen(c: Comprobacion): number {
  return Math.min(...c.partes.map((p) => Math.min(p.lo === undefined ? Infinity : p.valor - p.lo, p.hi === undefined ? Infinity : p.hi - p.valor)));
}

/** Distancia total fuera de rango (0 si todo se cumple): lo que el afinador intenta bajar. */
export function distancia(cs: Comprobacion[]): number {
  return cs.filter((c) => !c.ok).reduce((a, c) => a + Math.max(0, -margen(c)) + 0.1, 0);
}
