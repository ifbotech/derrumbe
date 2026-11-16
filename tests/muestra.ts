// Tamaño de las muestras de las pruebas de Monte Carlo (misión V12 → V26).
//
// Por defecto, el del bucle rápido: `npm test` tiene que acabar en menos de 25 segundos. Con
// PRUEBAS_COMPLETAS=1 (`npm run test:full`), el de siempre: es el que se corre en la coronación de un Campeón
// y cada vez que se quiere toda la red. Las pruebas son las mismas; solo cambia cuántas campañas o golpes juegan.
export const COMPLETAS = process.env.PRUEBAS_COMPLETAS === '1';

/** `completa` campañas (o golpes, o mesas) en la pasada completa; `rapida` en la del bucle. */
export const muestra = (completa: number, rapida: number): number => (COMPLETAS ? completa : rapida);
