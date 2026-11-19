// Objetivos de balance, como datos: los lee el laboratorio (npm run analyze:meta) para sus avisos y el
// afinador (npm run balance:tune) para saber qué arreglar y cuánto margen queda. Una sola lista, sin copias.
// `revisar` recorre un informe (el objeto que escribe analyze:meta en meta-report.json) y devuelve, en el
// orden de siempre, una comprobación por objetivo: el texto del aviso, si se cumple y sus números.

/** Los rangos. Todo en % de campañas ganadas, salvo el ritmo (turnos) y la letalidad (veces la media). */
export const OBJETIVOS = {
  /**
   * Reinado 1 y Reinado 8 «Puertas selladas», con el Altar vacío y lleno (con el Mazo inicial). V40: con la baraja
   * española, el Reinado 1 vacío pasa a 28–34; con los 5 Mazos (decisión de dirección) el lleno puede subir a 42–50.
   */
  reinado1: { vacio: [28, 34], lleno: [42, 50] },
  reinado8: { vacio: [6, 10], lleno: [12, 18] },
  /**
   * V40 · Los 5 Mazos en el Reinado 1: cada uno 28–34 con el Altar vacío y los cinco a 5 puntos o menos entre sí
   * (`dispersion`: el mejor menos el peor); con el Altar lleno, ≤ 50 (avisa por debajo de 40) y el Altar suma ≥ 6.
   */
  mazos: { lleno: [40, 50], llenoObjetivo: '42–50', vacio: [28, 34], vacioObjetivo: '28–34', dispersion: 5, sumaMinima: 6 },
  /**
   * Amuletos y Trampas del Bufón dados de salida: trampa por debajo, victoria regalada por encima. V40 1d: ningún
   * Amuleto elegido más de `sobreMedia` veces la media de elección (con al menos `ofertasMinimas` ofertas).
   */
  regalo: { trampa: 35, maximo: 68, eleccionMinima: 5, ofertasMinimas: 40, sobreMedia: 2 },
  /** Letalidad de cada Rey jefe respecto a la media (con al menos `enfrentados` encuentros). V40 1c: 0,8×–1,25×. */
  monarcas: { ratio: [0.8, 1.25], enfrentados: 150 },
  /**
   * V40 1c · Bendiciones: ninguna elegida por el bot más de `sobreMedia` veces la media de elección (con al menos
   * `ofertasMinimas` ofertas), y ninguna que empeore el resultado si se da de salida (más allá del ruido).
   */
  bendiciones: { sobreMedia: 2, ofertasMinimas: 40 },
  /** Turnos por asalto: hasta qué asalto vale cada tramo, rango de la mediana y tope del percentil 95. */
  ritmo: [
    // V35 · duelo Casa por Casa: los enemigos van en fila (2, 6, 8, 12 y 12) y el monarca cierra los asaltos 2, 4 y 5
    { hasta: 1, mediana: [3, 5], p95: 8 },
    { hasta: 3, mediana: [7, 11], p95: 16 },
    { hasta: Infinity, mediana: [8, 12], p95: 19 },
  ],
  /** Peor percentil 95 de los cinco asaltos, en cada baraja. */
  ritmoBaraja: 19,
  /** Campañas que mueren en el asalto 1 (Reinado 1, Árbol vacío), en %: el asalto de dos tronos enseña, no mata. */
  muertesAsalto1: 8,
  /**
   * Duración estimada de una campaña, en minutos: (inicio + 4 entreactos + 2 Secretos + 5 tiradas de huesos +
   * jugada × Σ medianas de jugadas de los cinco asaltos) / 60. Las constantes (segundos) son un supuesto declarado
   * (SPECS/V11.md 1.10; la tirada, SPECS/V12.md 1.12).
   *
   * V40 1b · se cuentan jugadas, no turnos: un turno es una jugada que recibe el Contraataque, y no cuenta la que
   * abate ni las que no gastan el turno (Pasar de Chancho Va, el Comodín de El Mentiroso). Con los 5 Mazos esas
   * jugadas pesan mucho más (Chancho Va: 36 turnos y 84 jugadas). `jugada` (12 s) deja la baraja española de la 1a
   * en los mismos minutos que daba el supuesto viejo (Σ turnos 42 × 18 s ≈ Σ jugadas 62 × 12 s). `turno` (18 s) es
   * ese supuesto viejo, para los informes que no traen las jugadas.
   *
   * V40 1e · con el Mapa de caminos, el entreacto (`entreacto`: el Botín por partes y elegir camino) se separa de lo
   * que se hace en cada nodo (`nodo`: La Pulpería, un Santuario del Bufón, el Fogón y el Botín de un Guardia Bravo),
   * contado con la media de nodos por campaña del informe (`mapa.nodos`), y las jugadas de los Guardias Bravos
   * (`mapa.bravoJugadas`, media por campaña) se suman a las de los asaltos. Sin `mapa`, el supuesto de la 1b.
   */
  duracion: { minutos: [18, 22], inicio: 30, entreacto: 60, secreto: 20, ritual: 5, jugada: 12, turno: 18, mapa: { entreacto: 40, nodo: { pulperia: 40, santuario: 20, fogon: 10, bravo: 20 } } },
  /** Asalto único (partida clásica): victorias del bot con 1, 2, 3 y 4 jugadores. */
  clasica: [58, 65],
  /**
   * V40 1f · Ninguna muerte de un golpe con la Vida llena (lo comprueba tests/golpe-unico.test.ts con los números de
   * balance-config.json): en el Reinado 1, el Contraataque de un guardia o de un Guardia Bravo, con la Furia típica de
   * su asalto, quita como mucho `tope` de la Vida máxima del Mazo más frágil, y el Rey jefe no mata de un golpe con la
   * Vida llena en sus `turnosRey` primeros turnos. `furiaTipica`: la mediana de la Furia en los Contraataques de los
   * guardias de cada asalto (`npm run analyze:meta -- golpes`; el laboratorio avisa si la mediana medida la pasa).
   */
  golpeUnico: { tope: 0.6, turnosRey: 3, furiaTipica: [0, 0, 0, 0, 0] },
} as const;

/** Un número frente a su rango (`lo`/`hi` pueden faltar: sin límite por ese lado). */
export interface Parte {
  valor: number;
  lo?: number;
  hi?: number;
}
export interface Comprobacion {
  /** Estable: `reinado1.vacio`, `ritmo.4`, `monarca.furia`, `amuleto.horno.trampa`… */
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
  bendiciones?: Pieza[];
  bosses: { id: string; who: string; faced: number; deaths: number; lethality: number }[];
  avgLethality: number;
  /** `j50`: mediana de jugadas del asalto (los turnos más las jugadas que abaten o no gastan el turno; V40 1b). */
  pacing: { stage: number; name: string; p50: number; p95: number; n: number; j50?: number }[];
  pacingByDeck: { deck: string; name: string; worstP95: number; n: number }[];
  /** V40 1e · el Mapa (Reinado 1, todos los Mazos): media de nodos por campaña por tipo y de jugadas en Guardias Bravos. */
  mapa?: { nodos: Record<string, number>; bravoJugadas: number; muereBravo: number; gastoPulperia: number };
  /** % de campañas (Reinado 1, Árbol vacío) que caen en cada asalto. */
  deaths?: number[];
  /** V40 1f · los Contraataques por asalto y por quién pega (modos con golpes: barajas, golpes, foco, niveles). */
  golpes?: { filas: { asalto: number; quien: string; furia50: number; unGolpe: number; n: number }[]; porMazo: { deck: string; unGolpe: number; reyTemprano: number }[] };
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

import { MAZO_INICIAL } from '../src/rules/mazos';

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
    rango('reinado1.vacio', l1.vacio, O.reinado1.vacio, `Reinado 1 con el Altar vacío: ${l1.vacio} % (objetivo ${O.reinado1.vacio.join('–')})`);
    rango('reinado1.lleno', l1.lleno, O.reinado1.lleno, `Reinado 1 con el Altar lleno: ${l1.lleno} % (objetivo ${O.reinado1.lleno.join('–')})`);
  }
  if (l8 && has(l8)) {
    rango('reinado8.vacio', l8.vacio, O.reinado8.vacio, `Reinado 8 con el Altar vacío: ${l8.vacio} % (objetivo ${O.reinado8.vacio.join('–')})`);
    rango('reinado8.lleno', l8.lleno, O.reinado8.lleno, `Reinado 8 con el Altar lleno: ${l8.lleno} % (objetivo ${O.reinado8.lleno.join('–')})`);
  }
  // cada nivel tiene que ser más difícil que el anterior, con el Árbol vacío y con el lleno
  for (let i = 1; i < r.winrate.levels.length; i++) {
    const a = r.winrate.levels[i - 1];
    const b = r.winrate.levels[i];
    if (!has(a) || !has(b)) continue;
    out.push({ id: `escalera.${b.level}.vacio`, texto: `Reinados ${a.level} → ${b.level} con el Altar vacío: ${a.vacio} % → ${b.vacio} % (no baja)`, ok: b.vacio < a.vacio, partes: [{ valor: a.vacio - b.vacio, lo: 0.1 }] });
    out.push({ id: `escalera.${b.level}.lleno`, texto: `Reinados ${a.level} → ${b.level} con el Altar lleno: ${a.lleno} % → ${b.lleno} % (no baja)`, ok: b.lleno < a.lleno, partes: [{ valor: a.lleno - b.lleno, lo: 0.1 }] });
  }
  for (const d of r.winrate.decks) {
    if (!has(d) || d.deck === MAZO_INICIAL) continue;
    rango(`baraja.${d.deck}.lleno`, d.lleno, O.mazos.lleno, `${d.name}: ${d.lleno} % con el Altar lleno (objetivo ${O.mazos.llenoObjetivo}, margen ${O.mazos.lleno.join('–')})`);
    rango(`baraja.${d.deck}.vacio`, d.vacio, O.mazos.vacio, `${d.name}: ${d.vacio} % con el Altar vacío (objetivo ${O.mazos.vacioObjetivo})`);
    const suma = d.lleno - d.vacio;
    out.push({ id: `baraja.${d.deck}.orden`, texto: `${d.name}: el Altar lleno solo le suma ${Math.round(suma * 10) / 10} puntos`, ok: !(suma < O.mazos.sumaMinima), partes: [{ valor: suma, lo: O.mazos.sumaMinima }] });
  }
  // V40 · ningún Mazo domina: con el Altar vacío, del mejor al peor hay 5 puntos o menos (el inicial incluido)
  const vacios = r.winrate.decks.filter(has);
  if (vacios.length > 1) {
    const hi = vacios.reduce((a, b) => (b.vacio > a.vacio ? b : a));
    const lo = vacios.reduce((a, b) => (b.vacio < a.vacio ? b : a));
    const d = Math.round((hi.vacio - lo.vacio) * 10) / 10;
    out.push({ id: 'mazos.dispersion', texto: `Mazos con el Altar vacío: de ${hi.name} (${hi.vacio} %) a ${lo.name} (${lo.vacio} %) hay ${d} puntos (objetivo ≤ ${O.mazos.dispersion})`, ok: d <= O.mazos.dispersion, partes: [{ valor: d, hi: O.mazos.dispersion }] });
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
  const amuOfrecidos = r.tools.filter((t) => t.offered >= G.ofertasMinimas);
  const mediaAmu = amuOfrecidos.length ? amuOfrecidos.reduce((a, b) => a + b.pick, 0) / amuOfrecidos.length : 0;
  const topeAmu = Math.round(mediaAmu * G.sobreMedia * 10) / 10;
  for (const t of r.tools) {
    const [won, n] = final(t);
    if (won !== null) {
      out.push({ id: `amuleto.${t.id}.regalada`, completo: true, texto: `Amuleto ${t.name}: ${won} % ganadas si se da de salida en ${n} campañas (> ${G.maximo}: victoria regalada)`, ok: !(won > G.maximo), partes: [{ valor: won, hi: G.maximo }] });
      out.push({ id: `amuleto.${t.id}.trampa`, completo: true, texto: `Amuleto ${t.name}: ${won} % ganadas si se da de salida en ${n} campañas (< ${G.trampa}: trampa)`, ok: !(won < G.trampa), partes: [{ valor: won, lo: G.trampa }] });
    }
    if (t.offered >= G.ofertasMinimas) {
      out.push({ id: `amuleto.${t.id}.eleccion`, completo: true, texto: `Amuleto ${t.name}: casi nunca se elige (${t.pick} %) y no ayuda (${t.delta})`, ok: !(t.pick < G.eleccionMinima && (t.delta ?? 0) <= 0), partes: [{ valor: t.pick, lo: G.eleccionMinima }] });
      out.push({ id: `amuleto.${t.id}.favorito`, completo: true, texto: `Amuleto ${t.name}: el bot lo elige el ${t.pick} % de las veces (más de ${G.sobreMedia}× la media: ${topeAmu} %)`, ok: t.pick <= topeAmu, partes: [{ valor: t.pick, hi: topeAmu }] });
    }
    worse('Amuleto', t);
  }
  for (const sp of r.specials) {
    const [won, n] = final(sp);
    if (won !== null) out.push({ id: `trampa.${sp.id}.regalada`, completo: true, texto: `Trampa ${sp.name}: ${won} % ganadas si se da de salida en ${n} campañas (> ${G.maximo})`, ok: !(won > G.maximo), partes: [{ valor: won, hi: G.maximo }] });
    if (won !== null) out.push({ id: `trampa.${sp.id}.trampa`, completo: true, texto: `Trampa ${sp.name}: ${won} % ganadas si se da de salida en ${n} campañas (< ${G.trampa}: trampa)`, ok: !(won < G.trampa), partes: [{ valor: won, lo: G.trampa }] });
    worse('Trampa', sp);
  }
  // V40 1c · Bendiciones: ninguna se elige más del doble de la media, y ninguna empeora el resultado dada de salida
  const bend = r.bendiciones ?? [];
  const ofrecidas = bend.filter((b) => b.offered >= O.bendiciones.ofertasMinimas);
  const mediaPick = ofrecidas.length ? ofrecidas.reduce((a, b) => a + b.pick, 0) / ofrecidas.length : 0;
  for (const b of ofrecidas) {
    const tope = Math.round(mediaPick * O.bendiciones.sobreMedia * 10) / 10;
    out.push({ id: `bendicion.${b.id}.eleccion`, texto: `Bendición ${b.name}: el bot la elige el ${b.pick} % de las veces (más de ${O.bendiciones.sobreMedia}× la media: ${tope} %)`, ok: b.pick <= tope, partes: [{ valor: b.pick, hi: tope }] });
  }
  for (const b of bend) worse('Bendición', b);
  // Reyes jefe: todos entre 0,8× y 1,25× de la letalidad media
  const fr = (x: number) => String(x).replace('.', ',');
  for (const b of r.bosses) {
    if (b.faced < O.monarcas.enfrentados) continue;
    const ratio = r.avgLethality ? b.lethality / r.avgLethality : 1;
    out.push({ id: `monarca.${b.id}`, texto: `Rey jefe ${b.who}: letalidad ${b.lethality} % (×${ratio.toFixed(2)} de la media; objetivo ${fr(O.monarcas.ratio[0])}×–${fr(O.monarcas.ratio[1])}×)`, ok: !(ratio < O.monarcas.ratio[0] || ratio > O.monarcas.ratio[1]), partes: [{ valor: ratio, lo: O.monarcas.ratio[0], hi: O.monarcas.ratio[1] }] });
  }
  // ritmo: asalto 1 de 4 a 6 turnos (P95 ≤ 9), asaltos 2 y 3 de 7 a 10 (P95 ≤ 13), asaltos 4 y 5 de 9 a 12 (P95 ≤ 15)
  for (const p of r.pacing) {
    if (!p.n) continue;
    const tramo = O.ritmo.find((t) => p.stage <= t.hasta)!;
    const [lo, hi] = tramo.mediana;
    const top = tramo.p95;
    out.push({ id: `ritmo.${p.stage}`, texto: `Asalto ${p.stage} (${p.name}): mediana ${p.p50} y percentil 95 ${p.p95} (objetivo ${lo}–${hi} y ≤ ${top})`, ok: !(p.p50 < lo || p.p50 > hi || p.p95 > top), partes: [{ valor: p.p50, lo, hi }, { valor: p.p95, hi: top }] });
  }
  for (const d of r.pacingByDeck) out.push({ id: `ritmo.baraja.${d.deck}`, texto: `${d.name}: percentil 95 de ${d.worstP95} turnos en algún asalto (objetivo ≤ ${O.ritmoBaraja})`, ok: !(d.worstP95 > O.ritmoBaraja), partes: [{ valor: d.worstP95, hi: O.ritmoBaraja }] });
  // el asalto 1 (dos tronos) no mata a más del 8 % de las campañas
  const m1 = r.deaths?.[0];
  if (m1 !== undefined && l1 && has(l1)) out.push({ id: 'muertes.1', texto: `Asalto 1: mueren ahí el ${m1} % de las campañas con el Altar vacío (objetivo ≤ ${O.muertesAsalto1})`, ok: m1 <= O.muertesAsalto1, partes: [{ valor: m1, hi: O.muertesAsalto1 }] });
  // V40 1f · ninguna muerte de un golpe con la Vida llena: la Furia típica medida no pasa la de objetivos.ts y ningún
  // guardia, Bravo o Rey jefe en sus primeros turnos mata de un golpe con la Vida llena
  if (r.golpes) {
    const GU = O.golpeUnico;
    for (const f of r.golpes.filas) {
      if (f.quien === 'rey') continue;
      const tipica = GU.furiaTipica[f.asalto - 1] ?? 0;
      out.push({ id: `golpe.furia.${f.asalto}.${f.quien}`, texto: `Asalto ${f.asalto} (${f.quien}): Furia mediana ${f.furia50} en los Contraataques (objetivos.ts supone ${tipica})`, ok: f.furia50 <= tipica, partes: [{ valor: f.furia50, hi: tipica }] });
      out.push({ id: `golpe.unico.${f.asalto}.${f.quien}`, texto: `Asalto ${f.asalto} (${f.quien}): ${f.unGolpe} muertes de un golpe con la Vida llena en ${f.n} Contraataques`, ok: f.unGolpe === 0, partes: [{ valor: f.unGolpe, hi: 0 }] });
    }
    for (const m of r.golpes.porMazo) out.push({ id: `golpe.rey.${m.deck}`, texto: `${m.deck}: el Rey jefe mata de un golpe con la Vida llena en sus ${GU.turnosRey} primeros turnos en el ${m.reyTemprano} % de las campañas`, ok: m.reyTemprano === 0, partes: [{ valor: m.reyTemprano, hi: 0 }] });
  }
  // duración estimada de la campaña con las medianas de turnos de los cinco asaltos
  const min = duracion(r);
  if (min !== null) out.push({ id: 'duracion', texto: `Duración estimada de la campaña: ${min} minutos (objetivo ${O.duracion.minutos.join('–')})`, ok: inRange(min, O.duracion.minutos), partes: [{ valor: min, lo: O.duracion.minutos[0], hi: O.duracion.minutos[1] }] });
  return out;
}

/** Minutos estimados de una campaña (con un decimal), o null si el informe no trae el ritmo de los cinco asaltos. */
export function duracion(r: Pick<InformeMeta, 'pacing' | 'mapa'>): number | null {
  const D = OBJETIVOS.duracion;
  const p = r.pacing.filter((x) => x.n > 0 && x.stage <= 5);
  if (p.length < 5) return null;
  // con las jugadas de cada asalto si el informe las trae; si no, el supuesto viejo sobre los turnos
  const jugadas = p.every((x) => typeof x.j50 === 'number');
  const juego = jugadas ? D.jugada * p.reduce((a, x) => a + x.j50!, 0) : D.turno * p.reduce((a, x) => a + x.p50, 0);
  if (jugadas && r.mapa) {
    const M = D.mapa;
    const nodos = Object.entries(M.nodo).reduce((a, [k, s]) => a + s * (r.mapa!.nodos[k] ?? 0), 0);
    return Math.round(((D.inicio + 4 * M.entreacto + nodos + 5 * D.ritual + juego + D.jugada * r.mapa.bravoJugadas) / 60) * 10) / 10;
  }
  return Math.round(((D.inicio + 4 * D.entreacto + 2 * D.secreto + 5 * D.ritual + juego) / 60) * 10) / 10;
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
