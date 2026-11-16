// V12 · juice-ux, bloque B: la tirada de huesos, animada (SPECS/V12.md, apartado 1.4).
//
// El resultado ya lo decidió el motor (`run.ritual`, `sale` es el índice de la cara) y arte pinta la imagen quieta
// (`ritual.ts`: `#ritual`, `.hueso[data-i]`, `.hueso-cara`, `pintarRitual`). Al pulsar «Tirar» (clic, Enter, A del
// mando o AUTO), ritual.ts emite `derrumbe:ritual` y pinta el resultado; aquí, sobre ese mismo DOM, los dados caen
// sobre la mesa, botan tres veces (un golpe de hueso sobre madera en cada bote, cada vez más flojo), las caras van
// pasando y se paran en la que salió; luego se enciende la cara en la tabla de seis y entra la línea del resultado.
// Unos 5 s a 1× (a 2×, la mitad; a 8×, un octavo). «Saltar» (el botón de abajo mientras ruedan), cualquier tecla o
// cualquier clic sobre la tirada la terminan al instante: no se pierde nada. «Reducir movimiento»: sin giros, el
// resultado directo con un golpe de hueso.
// Solo transform y opacity. AUTO tira solo y espera a que acabe (auto.ts, `tiradaRodando`).
import { sfx } from './audio';
import { S, settings } from './core';
import { pintarRitual } from './ritual';
import { L } from './lengua';
import { whisper } from './whispers';

/** Tiempos a 1× (ms): cuándo cae el primer dado, cuánto más tarda cada uno, cuándo entra el resultado y cuándo acaba. */
export const TIRADA_MS = { cae: 3600, porDado: 200, revela: 4400, total: 5000 } as const;
/** Dónde, dentro del vuelo de un dado, toca la mesa (fracción): el primer golpe, dos botes y el asiento. */
const BOTES = [0.3, 0.6, 0.82, 1] as const;
const FUERZA = [1, 0.6, 0.35, 0.15] as const;

let rodando = false;
let acabo = -1e9;
let pidio: 'tirar' | 'saltar' | null = null;
const timers: number[] = [];
let alTerminar: (() => void) | null = null;

/** Lo que mide la prueba de humo: cada tirada con su duración real (ms) y si se saltó. */
export const tiradaQa = { tiradas: [] as { ms: number; saltada: boolean; dados: number }[], botes: 0 };

/** Si los dados están rodando ahora mismo (o acaban de pararse: AUTO deja leer el resultado un momento). */
export const tiradaRodando = (margen = 0) => rodando || performance.now() - acabo < margen;

const ritmo = () => 1 / Math.max(1, settings.speed);
const despues = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

/** Termina la tirada en el acto (tecla, clic, «Saltar»): las caras de verdad, el resultado a la vista. */
export function terminaTirada(): boolean {
  if (!rodando) return false;
  alTerminar?.();
  return true;
}

function rueda(capa: HTMLElement): void {
  const f = ritmo();
  const t0 = performance.now();
  const dados = [...capa.querySelectorAll<HTMLElement>('.hueso')];
  const seguir = capa.querySelector<HTMLButtonElement>('#ritual-seguir');
  const total = capa.querySelector<HTMLElement>('#ritual-total');
  const textoSeguir = seguir?.textContent ?? '';
  const caras = dados.map((d) => [...d.querySelectorAll<HTMLElement>('.hueso-caras .cara')].map((c) => c.textContent ?? ''));
  const finales = dados.map((d) => d.querySelector<HTMLElement>('.hueso-cara')?.textContent ?? '');
  rodando = true;
  capa.classList.add('rodando');
  if (seguir) seguir.textContent = L('ui.ritual.saltar');
  const anims: Animation[] = [];
  let hecho = false;
  const acaba = (saltada: boolean) => {
    if (hecho) return;
    hecho = true;
    timers.splice(0).forEach((t) => clearTimeout(t));
    if (saltada) anims.forEach((a) => a.cancel());
    dados.forEach((d, i) => {
      const c = d.querySelector<HTMLElement>('.hueso-cara');
      if (c) c.textContent = finales[i];
    });
    capa.classList.remove('rodando');
    if (seguir) seguir.textContent = textoSeguir;
    rodando = false;
    acabo = performance.now();
    alTerminar = null;
    tiradaQa.tiradas.push({ ms: Math.round(acabo - t0), saltada, dados: dados.length });
  };
  // todos en la mesa: la cara que salió se enciende en la tabla de seis y la línea del resultado entra
  const revela = () => {
    capa.classList.remove('rodando');
    for (const c of capa.querySelectorAll<HTMLElement>('.hueso-caras .cara.sale')) c.animate([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 260 * f, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)' });
  };
  alTerminar = () => acaba(true);
  dados.forEach((d, i) => {
    const dado = d.querySelector<HTMLElement>('.hueso-dado');
    const cara = d.querySelector<HTMLElement>('.hueso-cara');
    if (!dado) return;
    const cae = (TIRADA_MS.cae + i * TIRADA_MS.porDado) * f;
    const lado = i % 2 ? 1 : -1;
    const g = 200 + Math.round(Math.random() * 160);
    const kf: Keyframe[] = [
      { transform: `translate(${lado * 150}px, -170px) rotate(${-lado * (g + 120)}deg) scale(0.8)`, opacity: 0 },
      { opacity: 1, offset: 0.08 },
      { transform: `translate(${lado * 46}px, 0px) rotate(${-lado * g}deg) scale(1)`, opacity: 1, offset: BOTES[0] },
      { transform: `translate(${lado * 18}px, -54px) rotate(${-lado * (g * 0.45)}deg) scale(1.04)`, offset: 0.45 },
      { transform: `translate(${-lado * 8}px, 0px) rotate(${lado * 14}deg) scale(1)`, offset: BOTES[1] },
      { transform: `translate(${-lado * 12}px, -18px) rotate(${lado * 22}deg) scale(1.02)`, offset: 0.72 },
      { transform: `translate(${-lado * 4}px, 0px) rotate(${-lado * 5}deg) scale(1)`, offset: BOTES[2] },
      { transform: `translate(${-lado * 1}px, -4px) rotate(${lado * 2}deg) scale(1)`, offset: 0.91 },
      { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1 },
    ];
    if (!settings.calm) anims.push(dado.animate(kf, { duration: cae, easing: 'linear', fill: 'backwards' }));
    BOTES.forEach((b, k) =>
      despues(cae * b, () => {
        tiradaQa.botes++;
        sfx.hueso(FUERZA[k]);
      }),
    );
    // las caras pasan mientras rueda, cada vez más despacio, y se paran en la que salió
    if (cara && caras[i].length && !settings.calm) {
      let t = 0;
      let paso = 70 * f;
      let n = Math.floor(Math.random() * caras[i].length);
      while (t + paso < cae * BOTES[2]) {
        const txt = caras[i][n++ % caras[i].length];
        despues(t, () => (cara.textContent = txt));
        t += paso;
        paso *= 1.12;
      }
      despues(cae * BOTES[2], () => (cara.textContent = finales[i]));
    }
  });
  if (total && !settings.calm) // la línea del resultado entra en 0,4 s tras la revelación y queda entera antes de que acabe la tirada
    anims.push(total.animate([{ opacity: 0 }, { opacity: 0, offset: TIRADA_MS.revela / (TIRADA_MS.revela + 400) }, { opacity: 1 }], { duration: (TIRADA_MS.revela + 400) * f, easing: 'linear' }));
  despues(TIRADA_MS.revela * f, revela);
  despues(TIRADA_MS.total * f, () => acaba(false));
}

/** Arranca la escucha: «Tirar» rueda; «Saltar», no. Cualquier clic sobre la tirada que rueda la termina. */
export function bindTirada(): void {
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target instanceof Element ? e.target : null;
      if (rodando && el?.closest('#ritual')) {
        // mientras rueda, un clic (también en «Saltar», que es el botón de abajo) termina la tirada y nada más
        e.preventDefault();
        e.stopPropagation();
        terminaTirada();
        return;
      }
      const b = el?.closest('#ritual-tirar, #ritual-saltar');
      if (b) pidio = b.id === 'ritual-tirar' ? 'tirar' : 'saltar';
    },
    true,
  );
  document.addEventListener('derrumbe:ritual', () => {
    const quiso = pidio;
    pidio = null;
    // ritual.ts pinta el resultado justo después de avisar: se anima sobre esa imagen
    queueMicrotask(() => {
      const capa = document.getElementById('ritual');
      if (!capa || capa.dataset.fase !== 'final') return;
      if (quiso === 'tirar' && !settings.calm) rueda(capa);
      else {
        sfx.hueso(1);
        tiradaQa.tiradas.push({ ms: 0, saltada: true, dados: capa.querySelectorAll('.hueso').length });
      }
      whisper('tirada');
    });
  });
}

if (new URLSearchParams(location.search).has('qa')) Object.assign(window, {
    __qaTirada: {
      estado: () => ({ rodando, tiradas: [...tiradaQa.tiradas], botes: tiradaQa.botes }),
      /** En el Botín (estado «cobro»): la tirada del asalto, antes de tirar (como la enseña el juego al entrar). */
      abre: () => {
        const r = S.campaign?.run.ritual;
        if (!r) return false;
        pintarRitual(r, 'antes');
        return true;
      },
    },
  });
