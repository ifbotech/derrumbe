// Cifras con que se rellenan las plantillas de los textos (V10). Son las mismas cuentas que hacen
// tools.ts, specials.ts y run.ts al rellenar sus descripciones en español; aquí se repiten, puras y sobre
// los mismos números de `BALANCE`, para rellenar las plantillas inglesas sin tocar los archivos de la huella.
// tests/i18n.test.ts comprueba que cada texto inglés lleva exactamente las cifras del español.
import { BALANCE, relic } from './balance-config';

/** Cifras de la descripción de una reliquia (`reliquias.<id>` más las derivadas de tools.ts). */
export function cifrasReliquia(id: string): Record<string, number> {
  const V = BALANCE.reliquias;
  const derivadas: Record<string, Record<string, number>> = {
    timbre: { sellos: BALANCE.timbre.stamps },
    prensa: { x1: 1 + V.prensa.multi, x4: 1 + 4 * V.prensa.multi },
    contragolpe: { ej: 4 * V.contragolpe.factor },
  };
  return { ...relic(id), ...derivadas[id] };
}

/** Cifras de una carta especial: los números de su efecto (`especiales.<id>`). */
export function cifrasEspecial(id: string): Record<string, number> {
  const fx = BALANCE.especiales[id] ?? {};
  return Object.fromEntries(Object.entries(fx).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
}

/** Cifras del decreto de un monarca, para su descripción y su placa (como `BOSS_NUMS` de run.ts). */
export function cifrasMonarca(id: string): Record<string, number> {
  const M = BALANCE.monarcas as unknown as Record<string, Record<string, number>>;
  if (id === 'doble') return { ...M.doble, pct: Math.round((1 - BALANCE.monarcas.doble.ataque) * 100) };
  return M[id] ?? {};
}

/** Cifras de los Reinados (como el relleno de `ASCENSIONS` en run.ts). */
export function cifrasReinado(): Record<string, number | string> {
  const R = BALANCE.reinados;
  return {
    pct: Math.round((R.corazas - 1) * 100),
    impuesto: R.impuesto,
    rey: R.reyColerico,
    heridas: R.heridasViejas,
    noche: R.guardiaNoche,
    asaltos: BALANCE.clausura.stages.join(', '),
    clausura: BALANCE.clausura.threat,
  };
}

/** Cifras de una baraja inicial (como `DECK_NUMS` de run.ts). */
export function cifrasBaraja(id: string): Record<string, number> {
  const B = BALANCE.barajas as unknown as Record<string, Record<string, number>>;
  if (id === 'obra') return { sobre: BALANCE.inicio.sobre };
  if (id === 'caos') return { ...B.caos, total: BALANCE.inicio.sobre + BALANCE.barajas.caos.especiales };
  return B[id] ?? {};
}

/** Cifras de sellos, acabados y estados de trono (como engine.ts). */
export const CIFRAS_MESA = {
  jornal: { oro: BALANCE.sellos.jornal },
  forjado: { n: BALANCE.acabados.forjado },
  templado: { n: BALANCE.acabados.templado },
  policromado: { n: BALANCE.acabados.policromado },
  agrietado: { n: BALANCE.acabados.agrietado, cada: 1 / BALANCE.acabados.agrietadoRompe },
  fractura: { n: BALANCE.golpe.brecha },
  apuntalado: { n: BALANCE.golpe.enGuardia },
} as const;
