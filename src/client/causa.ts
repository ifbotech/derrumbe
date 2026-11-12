// Causa de la derrota: el gráfico de dos líneas que explica por qué cayó la conjura (qué se llevó tu
// Vida y por qué no se evitó) y la barra pequeña que lo enseña en números: lo que venía, lo que frenó
// el Escudo, lo que entró y la Vida que te quedaba. Lo pintan igual la mesa, el final del asalto
// único, la crónica de campaña y el archivo. Los estilos están en acta.css.
import type { Autopsy } from '../rules/autopsy';
import { esc } from './core';

const KIND: Record<Autopsy['kind'], string> = { sirena: 'Contraataque', colapso: 'Mazo agotado', herida: 'Herida propia', sin_cartas: 'Sin cartas' };

/** Una autopsia guardada (acta de archivo, campaña de otra versión) puede venir incompleta: solo se pinta si trae sus dos líneas. */
export const validDeath = (d: unknown): d is Autopsy => {
  const a = d as Partial<Autopsy> | null;
  return !!a && typeof a === 'object' && typeof a.title === 'string' && !!a.title && typeof a.detail === 'string';
};

const n = (x: unknown) => Math.max(0, Math.round(Number(x) || 0));

/**
 * La barra: arriba el ataque (Escudo que frena + lo que entra), debajo la Vida que te quedaba,
 * alineado con lo que entra para que se vea por cuánto no llegó. Las cifras van en la leyenda, no
 * dentro de los tramos: un tramo de 1 sobre 40 no tiene sitio para su número.
 */
export function causeBar(d: Autopsy): string {
  const threat = n(d.threat);
  const blocked = Math.min(n(d.blocked), threat);
  const taken = n(d.taken);
  const before = n(d.before);
  if (threat <= 0) {
    return `<div class="causa-barra solo" role="img" aria-label="Te quedaba ${before} de Vida. No llegó ningún ataque.">
      <div class="cb-fila"><span>Vida</span><div class="cb-pista"><i class="cb-queda" style="flex:1 1 0"></i></div></div>
      <p class="cb-ley"><span class="l-queda"><i></i>Quedaba <b>${before}</b></span><span class="l-nada">No llegó ningún ataque</span></p>
    </div>`;
  }
  const max = Math.max(threat, blocked + before, 1);
  const seg = (cls: string, v: number) => (v > 0 ? `<i class="${cls}" style="flex:${v} 1 0"></i>` : '');
  return `<div class="causa-barra" role="img" aria-label="Venía ${threat}: el Escudo frenó ${blocked} y entró ${taken}. Te quedaba ${before} de Vida.">
    <div class="cb-fila"><span>Ataque</span><div class="cb-pista">${seg('cb-muro', blocked)}${seg('cb-entra', taken)}${seg('cb-aire', max - blocked - taken)}</div></div>
    <div class="cb-fila"><span>Vida</span><div class="cb-pista">${seg('cb-aire', blocked)}${seg('cb-queda', before)}${seg('cb-aire', max - blocked - before)}</div></div>
    <p class="cb-ley"><span class="l-viene">Venía <b>${threat}</b></span><span class="l-muro"><i></i>Escudo frenó <b>${blocked}</b></span><span class="l-entra"><i></i>Entró <b>${taken}</b></span><span class="l-queda"><i></i>Quedaba <b>${before}</b></span></p>
  </div>`;
}

/** El bloque entero: rótulo, las dos líneas y la barra. */
export function causeHtml(d: Autopsy, cls = ''): string {
  return `<section class="causa k-${d.kind} ${cls}" aria-label="Causa de la derrota">
    <h2><span>Causa de la derrota</span><em>${KIND[d.kind] ?? ''}</em></h2>
    <p class="causa-1">${esc(d.title)}</p>
    <p class="causa-2">${esc(d.detail)}</p>
    ${causeBar(d)}
  </section>`;
}

/** Las dos líneas en texto llano, para el acta que se copia. */
export const causeText = (d: Autopsy): string => `☠️ Causa de la derrota: ${d.title}\n   ${d.detail}`;
