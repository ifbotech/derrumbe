// Cifras con que se rellenan las plantillas de los textos (V10). Son las mismas cuentas que hacen
// tools.ts, specials.ts y run.ts al rellenar sus descripciones en español; aquí se repiten, puras y sobre
// los mismos números de `BALANCE`, para rellenar las plantillas inglesas sin tocar los archivos de la huella.
// tests/i18n.test.ts comprueba que cada texto inglés lleva exactamente las cifras del español.
import { CIFRAS_MAZO } from './mazos';
import { BALANCE, relic } from './balance-config';

/** Cifras de la descripción de una reliquia (`reliquias.<id>` más las derivadas de tools.ts). */
export function cifrasReliquia(id: string): Record<string, number> {
  const derivadas: Record<string, Record<string, number>> = {
    timbre: { sellos: BALANCE.timbre.stamps },
    contragolpe: { ej: 4 * BALANCE.reliquias.contragolpe.factor },
    crisol: { base: BALANCE.golpe.expuesto },
  };
  return { ...relic(id), ...derivadas[id] };
}

/** Cifras de una carta especial: los números de su efecto (`especiales.<id>`). */
export function cifrasEspecial(id: string): Record<string, number> {
  const fx = BALANCE.especiales[id] ?? {};
  return Object.fromEntries(Object.entries(fx).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
}

/** Cifras del rasgo de combate de un Rey jefe, para su descripción y su placa (como `BOSS_NUMS` de run.ts). */
export function cifrasMonarca(id: string): Record<string, number> {
  const M = BALANCE.reyes as unknown as Record<string, Record<string, number>>;
  const c = M[id] ?? {};
  // V40 1f · el dado del Rey de Oros va de +⌈caras/6⌉ a +caras (la cara 1 a 6, a escala: ver `threatOf`)
  return c.dado ? { ...c, dadoMin: Math.ceil(c.dado / 6) } : c;
}

/** Cifras de los Reinados (como el relleno de `ASCENSIONS` en run.ts). */
export function cifrasReinado(): Record<string, number | string> {
  const R = BALANCE.reinados;
  return {
    pct: Math.round((R.corazas - 1) * 100),
    reyes: Math.round((R.reyesAcorazados - 1) * 100),
    furia: R.furia,
    rey: R.reyColerico,
    heridas: R.heridasViejas,
    noche: R.guardiaNoche,
    asaltos: BALANCE.clausura.stages.length > 1 ? `assaults ${BALANCE.clausura.stages.join(' and ')}` : `assault ${BALANCE.clausura.stages[0]}`,
    clausura: BALANCE.clausura.threat,
  };
}

/** Cifras de la descripción de un Mazo (como en run.ts). */
export function cifrasBaraja(id: string): Record<string, number> {
  return (CIFRAS_MAZO as Record<string, Record<string, number>>)[id] ?? {};
}

/** Una fracción como la lee el jugador: «¼», «½», «¾»; si no es una de esas, en tanto por ciento («30 %»). */
export function fraccion(n: number): string {
  const f: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
  return f[String(n)] ?? `${Math.round(n * 100)} %`;
}

/** Cifras de las definiciones de las palabras clave (Golpe exacto y Expuesto), en los dos idiomas. */
export function cifrasPalabra(): Record<string, number | string> {
  const G = BALANCE.golpe;
  return { oro: G.oroExacto, impulso: fraccion(G.onda), racha: G.racha, tope: G.racha * G.rachaTope, expuesto: G.expuesto };
}

/** Cifras de sellos, acabados y estados de trono (como engine.ts). */
export const CIFRAS_MESA = {
  jornal: { oro: BALANCE.sellos.jornal },
  forjado: { n: BALANCE.acabados.forjado },
  templado: { n: BALANCE.acabados.templado },
  policromado: { n: BALANCE.acabados.policromado },
  agrietado: { n: BALANCE.acabados.agrietado, cada: 1 / BALANCE.acabados.agrietadoRompe },
  expuesto: { n: BALANCE.golpe.expuesto },
} as const;
