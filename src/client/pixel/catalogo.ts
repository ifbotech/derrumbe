// V40 · fase 2b · El catálogo del pixel-art: cada pieza dibujada como mapa de celdas, con su grupo y su nombre. Lo leen
// el linter (scripts/pixel-lint.ts, dentro de `npm run forja`), la hoja de contacto (scripts/lamina-pixel.ts) y las
// pruebas. Solo funciones puras, sin DOM.
import type { Suit } from '../../rules/engine';
import { asMapa } from './ases';
import { EXPRESIONES, bufonMapa } from './bufon';
import { dorsoMapa, MAZOS } from './dorsos';
import { figuraLienzo } from './figuras';
import { MOTIVO_AMULETO, MOTIVO_BENDICION, MOTIVO_TRAMPA, amuletoMapa, bendicionMapa, trampaMapa } from './iconos';
import { pintasColocadas } from './naipes';
import { HUD_ICONO, TIPOS_NODO, nodoMapa } from './nodos';
import { Lienzo } from './pincel';
import { pintaMapa, pintaNaipe } from './pintas';
import { REYES_PX, reyMapa } from './reyes';

export interface Pieza {
  grupo: 'pintas' | 'glifos' | 'naipes' | 'figuras' | 'dorsos' | 'bufon' | 'reyes' | 'amuletos' | 'trampas' | 'bendiciones' | 'nodos';
  id: string;
  mapa: string[];
}

const PALOS: Suit[] = ['S', 'C', 'D', 'H'];

/** La cara de un naipe del 1 al 9 como un solo mapa (96 × 140). */
export function caraMapa(s: Suit, rango: number): string[] {
  if (rango === 1) return asMapa(s);
  const l = new Lienzo(96, 140);
  for (const p of pintasColocadas(s, rango)) l.pegar(p.m, p.x, p.y);
  return l.mapa();
}

/** Todas las piezas, en el orden de la hoja de contacto. */
export function catalogo(): Pieza[] {
  const out: Pieza[] = [];
  for (const s of PALOS) {
    out.push({ grupo: 'glifos', id: s, mapa: [...pintaMapa(s)] });
    out.push({ grupo: 'pintas', id: `${s}-chica`, mapa: pintaNaipe(s, 'chica', 0) });
    if (s === 'C') out.push({ grupo: 'pintas', id: `${s}-chica-2`, mapa: pintaNaipe(s, 'chica', 1) });
    out.push({ grupo: 'pintas', id: `${s}-grande`, mapa: pintaNaipe(s, 'grande', 0) });
    if (s === 'C') out.push({ grupo: 'pintas', id: `${s}-grande-2`, mapa: pintaNaipe(s, 'grande', 1) }, { grupo: 'pintas', id: `${s}-grande-3`, mapa: pintaNaipe(s, 'grande', 2) });
  }
  for (const s of PALOS) for (let r = 1; r <= 9; r++) out.push({ grupo: 'naipes', id: `${s}${r}`, mapa: caraMapa(s, r) });
  for (const s of PALOS) for (const r of [10, 11, 12] as const) out.push({ grupo: 'figuras', id: `${s}${r}`, mapa: figuraLienzo(s, r) });
  for (const m of MAZOS) out.push({ grupo: 'dorsos', id: m, mapa: dorsoMapa(m) });
  for (const e of EXPRESIONES) out.push({ grupo: 'bufon', id: e, mapa: bufonMapa(e) });
  for (const r of REYES_PX) for (const a of ['calma', 'vencido'] as const) out.push({ grupo: 'reyes', id: `${r}-${a}`, mapa: reyMapa(r, a) });
  for (const id of Object.keys(MOTIVO_AMULETO)) out.push({ grupo: 'amuletos', id, mapa: amuletoMapa(id)! });
  for (const id of Object.keys(MOTIVO_TRAMPA)) out.push({ grupo: 'trampas', id, mapa: trampaMapa(id)! });
  for (const id of Object.keys(MOTIVO_BENDICION)) out.push({ grupo: 'bendiciones', id, mapa: bendicionMapa(id)! });
  for (const t of TIPOS_NODO) out.push({ grupo: 'nodos', id: t, mapa: nodoMapa(t) });
  for (const [id, m] of Object.entries(HUD_ICONO)) out.push({ grupo: 'nodos', id: `hud-${id}`, mapa: [...m] });
  return out;
}
