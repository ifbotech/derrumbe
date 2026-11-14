// Parche de balance para medir sin tocar el archivo: BALANCE_PATCH='{"asaltos.0.hp":3.5,"asedio.start":9}'.
// Lo usa el afinador (scripts/auto-balance.ts) para que el laboratorio juegue con otros números; vale
// también en los procesos hijos del laboratorio, que heredan el entorno. Se importa ANTES que las reglas
// (primera línea de lab.ts y de analyze-meta.ts): los módulos de src/rules leen BALANCE al cargarse.
// Sin la variable no hace nada. Nunca escribe balance-config.json.
import { BALANCE, setPath } from '../src/rules/balance-config';

/** Aplica un parche `{ ruta: valor }` sobre un objeto de balance, en el sitio. */
export function applyPatch(cfg: unknown, patch: Record<string, number>): void {
  for (const [ruta, valor] of Object.entries(patch)) {
    if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new Error(`BALANCE_PATCH: «${ruta}» no es un número`);
    setPath(cfg, ruta, valor);
  }
}

const env = typeof process !== 'undefined' ? process.env.BALANCE_PATCH : undefined;
if (env) applyPatch(BALANCE, JSON.parse(env) as Record<string, number>);
