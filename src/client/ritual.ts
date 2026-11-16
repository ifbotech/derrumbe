// V12 · bloque B de arte: la tirada de huesos (SPECS/V12.md, apartado 1.4) sobre la pantalla del Botín.
//
// Lo importante, grande y solo: la cara que sale de cada dado («×n», ≥ 20 px) y la línea del resultado
// («Monedas 12 × 2 = 24», «Esquirlas 140 × 3 = 420»). Lo secundario (las seis caras de cada dado), pequeño debajo,
// con la que salió marcada. Botones «Tirar» y «Saltar» antes; «Seguir» después.
//
// Contrato con juice-ux: `#ritual`, `.hueso[data-i]` (con `data-tipo` y `data-sale`), `.hueso-cara` (la cifra) y
// `pintarRitual(tirada, fase)`, que deja la imagen quieta. El giro de los dados y su sonido los pone juice-ux entre
// 'antes' y 'final' (solo transform y opacity). Al pulsar «Tirar» o «Saltar» se emite `derrumbe:ritual` con la fase.
import type { Tirada } from '../rules/huesos';
import { multiplicadores } from '../rules/huesos';
import { t } from '../shared/i18n';
import { cifra } from './cifra';
import { huesoSvg } from './grabado12';
import { L } from './lengua';

export type FaseRitual = 'antes' | 'final';

/** Qué asaltos ya enseñaron su tirada (una vez por asalto y campaña; no se guarda). */
const vistos = new Set<string>();

function quitar(): void {
  document.getElementById('ritual')?.remove();
}

/** Pinta la tirada en su fase y la deja quieta. Devuelve la capa `#ritual`. */
export function pintarRitual(tirada: Tirada, fase: FaseRitual, alSeguir: () => void = quitar): HTMLElement {
  let capa = document.getElementById('ritual');
  if (!capa) {
    capa = document.createElement('div');
    capa.id = 'ritual';
    capa.setAttribute('role', 'dialog');
    capa.setAttribute('aria-modal', 'true');
    capa.setAttribute('aria-labelledby', 'ritual-t');
    document.body.appendChild(capa);
  }
  capa.dataset.fase = fase;
  const m = multiplicadores(tirada);
  const final = fase === 'final';
  const dados = tirada.huesos
    .map((h, i) => {
      const x = h.caras[h.sale];
      // las seis caras del dado, en pequeño y siempre; en la fase final, la que salió va marcada (fondo de latón y marco)
      const caras = h.caras
        .map((c, k) => `<span class="cara${final && k === h.sale ? ' sale' : ''}" data-k="${k}">×${c}</span>`)
        .join('');
      return `<div class="hueso hueso-${h.tipo}" data-i="${i}" data-tipo="${h.tipo}" data-sale="${final ? h.sale : ''}">
        <div class="hueso-dado">${huesoSvg(h.tipo)}<b class="hueso-cara" aria-label="${final ? `×${x}` : '?'}">${final ? `×${x}` : '?'}</b></div>
        <span class="hueso-nombre">${t(`hueso.${h.tipo}.nombre`)}</span>
        <span class="hueso-caras" role="img" aria-label="${h.caras.map((c) => `×${c}`).join(' ')}">${caras}</span>
      </div>`;
    })
    .join('');
  const oroT = tirada.oro.base + tirada.oro.extra;
  const esqT = tirada.esquirlas.base + tirada.esquirlas.extra;
  const linea = final
    ? `<p class="ritual-total" id="ritual-total"><span class="ritual-oro">${L('ui.ritual.monedas', { b: cifra(tirada.oro.base), m: m.oro, t: cifra(oroT) })}</span><span class="ritual-esq">${L('ui.ritual.esquirlas', { b: cifra(tirada.esquirlas.base), m: m.corona, t: cifra(esqT) })}</span></p>`
    : `<p class="ritual-desc">${t('ritual.desc')}</p>`;
  const botones = final
    ? `<button class="primary" id="ritual-seguir">${L('ui.ritual.seguir')}</button>`
    : `<button class="primary" id="ritual-tirar">${L('ui.ritual.tirar')}</button><button id="ritual-saltar">${L('ui.ritual.saltar')}</button>`;
  capa.innerHTML = `<div class="ritual-caja">
    <h2 id="ritual-t">${t('ritual.nombre')}</h2>
    <div class="ritual-dados" data-n="${tirada.huesos.length}">${dados}</div>
    ${linea}
    <div class="ritual-botones">${botones}</div>
  </div>`;
  const ir = (f: FaseRitual) => () => {
    document.dispatchEvent(new CustomEvent('derrumbe:ritual', { detail: f }));
    pintarRitual(tirada, 'final', alSeguir);
  };
  if (final) capa.querySelector<HTMLButtonElement>('#ritual-seguir')!.onclick = () => alSeguir();
  else {
    capa.querySelector<HTMLButtonElement>('#ritual-tirar')!.onclick = ir('final');
    capa.querySelector<HTMLButtonElement>('#ritual-saltar')!.onclick = ir('final');
  }
  capa.querySelector<HTMLButtonElement>('button.primary')?.focus({ preventScroll: true });
  return capa;
}

/** En el Botín: enseña la tirada del asalto recién ganado una sola vez (la campaña ya la abonó). */
export function ritualDelBotin(clave: string, tirada: Tirada | null): void {
  if (!tirada || vistos.has(clave)) return;
  vistos.add(clave);
  pintarRitual(tirada, 'antes');
}

/** Para la QA: olvida lo visto y quita la capa. */
export function ritualNuevo(): void {
  vistos.clear();
  quitar();
}
