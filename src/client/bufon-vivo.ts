// V40 · fase 3b · El Bufón vivo (constitución, apartado 3): la mesa le da motivos y él reacciona.
//
//   Cara     reposo respirando; risa con Golpe exacto, ¡Escoba!, ¡Envido!, ¡Chancho!, un bravo del Truco, Pierna o
//            Escalera; burla cuando te contraatacan; brillo con el Engaño (y en La Pulpería, «Elegí una» y los
//            Santuarios, que lo pintan así); sombría en el último turno o con poca Vida. Los cuadros y su respiración son
//            de pixel/bufon.ts y pixel.css (solo transform y opacity); con «Reducir movimiento», cuadro fijo.
//   Frase    una línea corta (≤ 64 caracteres) en un bocadillo pegado a él: debajo en el escritorio y a su derecha en el
//            móvil, donde no tapa la mano, al enemigo ni los botones. No es modal, no bloquea nada, se va sola y no repite
//            ninguna de las últimas que dijo. Calla si hay un Susurro o un consejo suyo a la vista, y si se apagó
//            «Consejos del Bufón» en Ajustes (la cara sigue reaccionando).
//   Sonido   cascabeles al reírse y un «na-na» al burlarse (audio.ts), por el bus de efectos.
//
// Enganches de una línea: table.ts llama a `bufonVe(ev)` por cada evento de la cola (junto a la voz del monarca) y
// whispers.ts a `bufonAnimo()` en cada repintado de la mesa; runscreens.ts a `bufonTienta()` en los Santuarios y en la
// «Elegí una» del Botín.
import type { GameEvent } from '../rules/engine';
import { omen } from '../rules/autopsy';
import { sfx } from './audio';
import { S, settings, topModal } from './core';
import { loadJson } from './platform';
import { momento } from './fx';
import { L } from './lengua';
import { EXPRESIONES, bufonSvg, type Expresion } from './pixel/bufon';
import type { ClaveUi } from '../shared/i18n/es';

/** Los motivos por los que habla (cada uno con su clave de frases en ui-juice.ts). */
export type Motivo = 'exacto' | 'escoba' | 'envido' | 'chancho' | 'bravo' | 'engano' | 'jugada' | 'carga' | 'nivel' | 'contra' | 'salvo' | 'sombria' | 'victoria' | 'derrota' | 'tienta';
/** La cara que pone con cada motivo. */
const CARA: Record<Motivo, Expresion> = {
  exacto: 'risa',
  escoba: 'risa',
  envido: 'risa',
  chancho: 'risa',
  bravo: 'risa',
  jugada: 'risa',
  engano: 'brillo',
  carga: 'brillo',
  nivel: 'brillo',
  tienta: 'brillo',
  contra: 'burla',
  salvo: 'reposo',
  sombria: 'sombria',
  victoria: 'risa',
  derrota: 'burla',
};
/** Lo que pesa cada motivo: uno más flojo no le quita la palabra a uno más fuerte que todavía se lee. */
const PESO: Record<Motivo, number> = { exacto: 3, escoba: 3, envido: 3, chancho: 3, engano: 3, nivel: 3, victoria: 4, derrota: 4, contra: 2, sombria: 2, bravo: 2, jugada: 2, carga: 1, salvo: 1, tienta: 1 };

const QA = new URLSearchParams(location.search).has('qa');
/** Con ?qa la frase sale solo si la prueba la pide (las capturas fijas no deben cambiar por una reacción). */
let qaFrases = false;
const apagado = () => loadJson<boolean>('derrumbe:bufon-off') === true;

// ── la cara ──

const svgDe = new Map<Expresion, string>();
const cuadro = (e: Expresion) => svgDe.get(e) ?? (svgDe.set(e, bufonSvg(e)), svgDe.get(e)!);
/** Dibuja de antemano, en los ratos libres y de a una, las caras que faltan: la primera risa no cuesta un fotograma. */
let precalentado = false;
function precalienta(): void {
  if (precalentado) return;
  precalentado = true;
  const ocio = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(() => fn(), { timeout: 2000 }) : setTimeout(fn, 200));
  const siguiente = () => {
    const falta = EXPRESIONES.find((e) => !svgDe.has(e));
    if (!falta) return;
    cuadro(falta);
    ocio(siguiente);
  };
  ocio(siguiente);
}
let base: Expresion = 'reposo';
let gesto: Expresion | null = null;
let gestoHasta = 0;
let gestoTimer = 0;

/** Pinta la cara en la mesa, si cambia (el cuadro se guarda ya dibujado: cambiar de cara es un innerHTML). */
function pinta(e: Expresion): void {
  const host = document.getElementById('bufon-mesa');
  if (!host || host.dataset.cara === e) return;
  host.dataset.cara = e;
  const dicho = host.querySelector('.bufon-dicho');
  host.innerHTML = cuadro(e);
  if (dicho) host.appendChild(dicho);
}

/** Pone una cara un rato y vuelve a la de fondo. */
function gesticula(e: Expresion, ms = 1500): void {
  gesto = e;
  gestoHasta = performance.now() + ms;
  pinta(e);
  const host = document.getElementById('bufon-mesa');
  if (host && !settings.calm) {
    host.classList.remove('bv-salta');
    void host.offsetWidth;
    host.classList.add('bv-salta');
  }
  clearTimeout(gestoTimer);
  gestoTimer = window.setTimeout(() => {
    gesto = null;
    pinta(base);
  }, ms / Math.sqrt(settings.speed));
}

/**
 * La cara de fondo según la mesa: sombría si el próximo Contraataque o el Mazo agotado pueden dejarte sin Vida, o si te
 * queda ≤ 1/4 de la Vida; si no, en reposo. La primera vez que se pone sombría en un asalto, lo dice.
 */
let sombriaDicha = '';
export function bufonAnimo(): void {
  const v = S.shown;
  if (!v || S.screen !== 'table') return;
  const poca = v.phase === 'playing' && (v.integrity <= v.config.maxIntegrity / 4 || !!omen(v));
  base = poca ? 'sombria' : 'reposo';
  if (!gesto || performance.now() > gestoHasta) pinta(base);
  precalienta();
  const asalto = `${S.campaign?.run.id ?? ''}:${S.campaign?.run.stage ?? 0}`;
  if (poca && sombriaDicha !== asalto) {
    sombriaDicha = asalto;
    dice('sombria');
  }
}

// ── la frase ──

/** Las últimas frases dichas (no se repite ninguna de las 6 últimas). */
const dichas: string[] = [];
let dichoHasta = 0;
let pesoDicho = 0;
let dichoTimer = 0;

/** Una frase del motivo que no dijo hace poco. */
function frase(m: Motivo): string {
  const todas = L(`ui.bufon.r.${m}` as ClaveUi).split('|');
  const nuevas = todas.filter((f) => !dichas.includes(f));
  const pool = nuevas.length ? nuevas : todas;
  const f = pool[Math.floor(Math.random() * pool.length)];
  dichas.push(f);
  if (dichas.length > 6) dichas.shift();
  return f;
}

/** Escribe la frase en su bocadillo, junto a él. Devuelve si la dijo. */
function dice(m: Motivo): boolean {
  if (apagado() || (QA && !qaFrases)) return false;
  const host = document.getElementById('bufon-mesa');
  if (!host || topModal() || document.querySelector('.table-screen .side > .whisper:not(.out)')) return false;
  const ahora = performance.now();
  if (ahora < dichoHasta && PESO[m] <= pesoDicho) return false;
  host.querySelector('.bufon-dicho')?.remove();
  const el = document.createElement('p');
  el.className = 'bufon-dicho';
  el.setAttribute('role', 'status');
  el.dataset.motivo = m;
  el.textContent = frase(m);
  host.appendChild(el);
  host.closest('.field')?.classList.add('con-dicho');
  const ms = Math.round(2600 / Math.sqrt(settings.speed));
  dichoHasta = ahora + ms;
  pesoDicho = PESO[m];
  clearTimeout(dichoTimer);
  dichoTimer = window.setTimeout(() => {
    el.classList.add('out');
    window.setTimeout(() => {
      el.remove();
      if (!host.querySelector('.bufon-dicho')) host.closest('.field')?.classList.remove('con-dicho');
    }, 300);
  }, ms);
  return true;
}

/** Reacciona a un motivo: cara, frase y su sonido. */
export function bufonReacciona(m: Motivo): void {
  const cara = CARA[m];
  if (cara !== 'reposo' && cara !== 'sombria') gesticula(cara, cara === 'brillo' ? 1800 : 1500);
  if (cara === 'risa') sfx.bufonRie();
  else if (cara === 'burla') sfx.bufonBurla();
  dice(m);
}

// ── lo que ve en la cola de eventos ──

/** Los pasos del Mazo que lo hacen reír (y su momento grande en la mesa, fx.ts). */
const DEL_MAZO: Partial<Record<string, Motivo>> = { escoba: 'escoba', envido: 'envido', chancho: 'chancho', bravo: 'bravo', engano: 'engano', pierna: 'jugada', escalera: 'jugada', larga: 'jugada' };
/** Para no reír dos veces en el mismo golpe por dos bravos: un motivo por golpe. */
let vistosEnGolpe = new Set<Motivo>();

/** Lo llama la mesa por cada evento que anima (table.ts, `pump`). */
export function bufonVe(ev: GameEvent): void {
  if (S.screen !== 'table') return;
  if (ev.e === 'play') vistosEnGolpe = new Set();
  if (ev.e === 'step') {
    const m = ev.src === 'mazo' ? DEL_MAZO[ev.id] : ev.src === 'bendicion' && /:\s*carga \d+$/.test(ev.label) ? 'carga' : undefined;
    if (!m) return;
    momento(m, ev); // el sello, la sacudida, la cifra que salta y su sonido
    if (vistosEnGolpe.has(m)) return;
    vistosEnGolpe.add(m);
    bufonReacciona(m);
  } else if (ev.e === 'floorDown' && ev.clean) {
    if (!vistosEnGolpe.has('exacto')) {
      vistosEnGolpe.add('exacto');
      // la campana y el sello «Golpe exacto» ya los pone la mesa; él se ríe con ellos
      window.setTimeout(() => bufonReacciona('exacto'), 120);
    }
  } else if (ev.e === 'siren' && ev.tower && ev.reason === 'strike') {
    // el Contraataque llega tras su aviso (table.ts espera ~380 ms): la burla, cuando pega
    const m: Motivo = ev.taken > 0 ? 'contra' : 'salvo';
    window.setTimeout(() => bufonReacciona(m), 400 * (S.queue.length ? 0.3 : 1) / settings.speed);
  } else if (ev.e === 'end' && S.campaign) {
    bufonReacciona(ev.result === 'won' ? 'victoria' : 'derrota');
  }
}

/**
 * Fuera de la mesa: el Bufón tienta (Santuarios y la «Elegí una» del Botín): un renglón con su busto de ojos que brillan
 * y una frase, antes de las opciones. Devuelve el HTML (la pantalla lo pone donde le toca).
 */
export function bufonTientaHtml(): string {
  const f = apagado() ? '' : frase('tienta');
  return `<p class="bufon-dice bufon-tienta"><span class="bufon-mini">${cuadro('brillo')}</span>${f ? `<i>${f}</i>` : ''}</p>`;
}

/** Al elegir una Bendición que enciende el nivel [2/4] de un Rey: su momento (sello y acorde) sobre la opción. */
export function alElegirBend(box: HTMLElement | null): void {
  if (box?.querySelector('.enciende')) momento('nivel', null, box);
}

if (QA)
  Object.assign(window, {
    __bufonVivo: {
      /** Con true, la prueba deja que diga frases (con ?qa callan de serie). */
      frases: (on: boolean) => void (qaFrases = on),
      /** Reacciona a mano a un motivo (como si lo hubiera visto en la mesa). */
      reacciona: (m: Motivo) => bufonReacciona(m),
      /** La cara que tiene puesta en la mesa y su frase a la vista. */
      estado: () => {
        const host = document.getElementById('bufon-mesa');
        return { cara: host?.dataset.cara ?? null, frase: host?.querySelector('.bufon-dicho:not(.out)')?.textContent ?? null, expresiones: EXPRESIONES.length };
      },
      dichas: () => [...dichas],
    },
  });
