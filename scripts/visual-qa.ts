import { guardian } from './guardian';
// infra/rapido · tope por modo: en paralelo (QA_HILOS > 1, lo de serie) ninguna invocación pasa de 170 s; con un
// solo navegador, la pasada de siempre (~12 min)
guardian('qa:visual', Number(process.env.QA_HILOS || 8) > 1 ? 170 : 1200); // tope duro: ver scripts/guardian.ts
// Control de calidad visual: abre el juego construido (npm run build:web) en Chromium sin ventana,
// monta estados fijos (src/client/qa.ts), comprueba el DOM y guarda una captura de cada uno en
// artifacts/visual-qa/<ventana>/<estado>.png, más un resumen en artifacts/visual-qa/report.json.
//
//   npm run qa:visual                    todas las ventanas y estados
//   npm run qa:visual -- mesa lupa       solo esos estados
//   VIEW=1366x768 npm run qa:visual      solo esa ventana
//   QA_OUT=dist/capturas npm run …       capturas e informe en otra carpeta (bucle corto de una celda)
//   npm run qa:visual -- --lang=en       la pasada en inglés (o QA_LANG=en): capturas e informe en
//                                        artifacts/visual-qa-en/, nunca encima de las españolas
//   npm run qa:visual -- --lang=en mesa  inglés solo de esos estados (el bucle: «las pantallas tocadas»)
//   QA_HILOS=4 npm run qa:visual         navegadores a la vez (de serie 8); con 1, uno solo y en fila, como antes
//
// Reglas de imprenta que se comprueban (y que hacen fallar la orden):
//   texto     ningún texto por debajo de 13 px efectivos (CSS × escala), tampoco los <text> de SVG ni
//             los de las cartas; en móvil, números críticos y descripciones ≥ 14 px
//   gotica    ninguna cifra en gótica (salvo dentro de h1/h2)
//   recorte   ningún texto ni botón cortado por un antepasado con overflow ni por el borde de la
//             ventana; dentro de una zona con desplazamiento vale si se llega desplazando…
//   tinta     …y esa zona enseña su aviso de tinta desvanecida (data-mas) mientras quede contenido
//   diana     dianas ≥ 44 × 44 px (48 en la barra del pulgar del móvil)
//   aire      ≥ 8 px entre dianas vecinas y nada pulsable a menos de 8 px del borde físico
//   mano      cartas de la mano separadas ≥ 8 px o con una franja visible ≥ 44 px
//   pulgar    en móvil: Golpear, Manga, Descartar y Deshacer abajo, la mano encima y los tronos arriba
//   trama     las cuatro tramas de palo existen, se distinguen en grises a 24 px y se usan
//   contraste texto ≥ 4,5:1; la Vida del trono ≥ 7:1 (cuentas WCAG); las tintas de palo, en «paleta»
//   placa     las cifras críticas llevan placa de respaldo opaca
//   maqueta   sin desbordamiento, zonas de la mesa que no se pisan
//             (y las dos notas de la 5.0: la semilla entera a la vista en 1366×768 y el aviso de
//             último turno de ≤ 28 px en móvil, o sin quitar altura a los tronos)
//   jerga     ningún texto visible, data-tip, aria-label, title, placeholder ni alt con una palabra
//             prohibida de las normas V6 (obra y demolición), sin distinguir mayúsculas ni tildes
//   marca     en portada y portada-en se leen los dos nombres: el título del idioma y, en la cinta de
//             lacre cosida a él, el del otro (≥ 13 px, 14 en móvil), con su sello y dentro de la ventana
//   cabecera  en la crónica (acta, acta-derrota, acta-victoria) el sello, las fichas de la cabecera y los
//             renglones del título no se pisan entre sí (cajas del DOM)
//   V8:
//   anima     ningún @keyframes ni transition de las hojas anima algo que no sea transform u opacity, y
//             ningún nodo con animación viva lleva filter o mix-blend-mode (los casos de juice.css van en
//             ANIMA_PENDIENTE_JUICE y salen como aviso)
//   foco      (A1) en mesa-mando, la carta con data-foco (no elegida) sube ≥ 6 px sobre sus vecinas no
//             elegidas (≥ 4 en móvil) y no pisa la cuenta
//   voz       (A2) además: el bocadillo del monarca no pisa ningún trono ni la barra de acciones
//   pulgar    (A3) además, en 390×844 y en mesa, mesa-peligro, mesa-monarca y mesa-cuenta: cada botón a
//             ≥ 12 px del borde de abajo y ≥ 8 px de los lados, ≥ 8 px entre botones, Golpear y Descartar
//             a ≥ 16 px o con otro botón en medio
//   guardias  (A3) cada fila de guardia de cada trono entra entera en la caja visible de su trono
//   piezas    los estados de la V8 (mesa-esquirlas, cartas-lamina, taberna-monedas, mesa-lacre) enseñan
//             sus piezas, sin filter ni mix-blend-mode y sin los cuadrados viejos .coin y .debris
//   V9:
//   placas    (V8-1) en mesa, mesa-mando, mesa-peligro y mesa-cuenta, la placa del golpe (.tower .preview) no
//             corta ninguna placa del trono (.plates > *) ni su Ataque (.threat), con tolerancia 0 px
//   bunker    (V8-2) en mesa, mesa-mando y mesa-peligro, donde se ven las barras: cada rótulo («Vida ♥»,
//             «Escudo 🛡») va justo encima de su barra (0–8 px) y entre la barra de Vida y el rótulo del
//             Escudo hay ≥ 12 px
//   foco      (V8-3) además, en ferreteria-mando: una oferta de La Taberna lleva data-foco, el .focus-ring se
//             ve y la rodea, mide ≥ 6 px de borde total y su filete de papel da ≥ 3:1 contra el fondo
//   feedback  en la Crónica (acta, acta-derrota, acta-victoria, acta-feedback) y en Ajustes (ajustes,
//             ajustes-prueba): el botón «Enviar Crónica / Feedback de Prueba» con ese texto, activo, con su
//             línea role="status" que dice lo que va a pasar según la compilación; ninguna casilla; en
//             acta-feedback la confirmación a la vista; en ajustes-prueba la fila «Datos de prueba» con
//             «2 campañas · X kB, guardadas en este equipo», «Ver» y «Borrar»
//   V10:
//   fuga      (solo en la pasada inglesa) ningún resto de español (RESTOS_ES con PERMITIDOS_EN, los mismos de
//             src/shared/i18n.ts) en el texto visible, data-tip, aria-label, title, placeholder ni alt; no
//             cuenta lo que va dentro de un lang="es" (el sello SANGRE Y PALO, el botón ES) ni el interruptor.
//             Lo que cae en zonas de juice-ux aún sin traducir (FUGA_PENDIENTE) sale como aviso
//   contraste-alto  en mesa-contraste: las cajas de la mesa son las mismas que sin Alto contraste (±1 px) y
//             todo el texto de la mesa da ≥ 7:1
//   idioma    en portada-idioma: el interruptor ES | EN se ve junto al candado, con las dos etiquetas, la
//             activa marcada (aria-pressed), dianas ≥ 44 px separadas ≥ 8 px y el foco de teclado visible
//   V10 · arreglos del censo:
//   cuenta    (P0-4 · V11) además, en todo estado con la cuenta plegada a la vista (#score .calc[role=button]) y
//             en las cuatro ventanas: el Multi es entero y Daño × Multi = Golpe sin margen, y el Multi entero en
//             su caja (.fr-r sin recorte)
//   esquina   (P0-1 · V11) en mesa, mesa-mando, mesa-2tintas, mesa-contraste y mesa-clasica: el rango de cada
//             .corner de la mano ≥ 34 / 22 / 20 / 20 px (1920 / 1366 / 1280 / 390; 1,35 × la 10.0); el svg del
//             palo mide min(ancho, alto) ≥ 14 px (≥ 10 en 390×844); la insignia de orden (::after de [data-n])
//             ≥ 16 px (≥ 14 en 390×844); y la carta de la mano mide lo mismo que en la 10.0, ± 1 px: 129×179
//             (1920), 84×116 (1366), 75×104 (1280) y 44×62 (390)
//   acta-pie  (P0-5) en acta, acta-derrota, acta-victoria y acta-feedback, en 1920, 1366 y 1280: con la hoja
//             sin desplazar, cada botón de .acta-acciones se ve entero dentro de la ventana, fuera de la
//             franja de tinta desvanecida, y en su centro document.elementFromPoint da el botón o un hijo
//   V11 (cara limpia, cuatro colores, dos estados y mesa de 2 a 4 tronos):
//   cara-limpia  en cartas-lamina (A a 10 de los cuatro palos) y en la mesa (la mano): cada carta numerada sin
//             acabado tiene ≥ 75 % de los píxeles de su cara a ΔE ≤ 6 del marfil #efe6d5, medido en la captura
//   paleta    (en mesa, una vez por ventana) con Cuatro colores, Clásica y Dos tintas, cada tinta de palo ≥ 4,5:1
//             sobre el papel y su variante clara ≥ 4,5:1 sobre --table; con Alto contraste, ≥ 7:1 las dos; la
//             paleta de serie es la pedida (#161514, #c8232c, #1b5e9e, #1b6b46 sobre #efe6d5); y el palo de la
//             esquina lleva contorno de tinta
//   daltonismo  en mesa, mesa-clasica y mesa-2tintas: ΔE2000 entre cada par de tintas de palo simuladas con
//             Machado (2009) (protanopía, deuteranopía y tritanopía, severidad 1); un par por debajo de 15 es aviso
//             si el color va siempre con la forma del palo, y fallo si en algún sitio de la mesa va solo (no
//             cuentan los usos de tintas generales del tema que la paleta Clásica reutiliza: --ink, --red-lit…)
//   inmune    en toda mesa, ninguna carta de la mano ni de La Manga lleva .plate.factor; en mesa-inmune, el trono
//             apuntado (PICAS) lleva la placa de hierro «Inmune ♠» (≥ 16 px, opaca, ≥ 7:1) y la cuenta abierta,
//             la línea «Inmune · 0»
//   estados   en toda mesa, las únicas insignias de estado son .fx-fractura «Expuesto» y .fx-sobrecarga
//             «Aturdido» (Exposed, Stunned), ≥ 14 px, la palabra entera en su caja y sin aviso de daño encima;
//             en mesa-estados se ven las dos
//   vida      (V11) la Vida que queda (.hp-n) ≥ 17,28 / 15 / 20,25 / 18,9 px (1920 / 1366 / 1280 / 390); el total
//             ≥ 13 px (14 en 390×844); placa opaca, barra con borde de 2 px y placa centrada
//   ataque    el Ataque del trono (.threat b) ≥ 26 / 19,2 / 27 / 20,25 px y su placa no tapa el palo del rótulo
//   campo     en toda mesa, nada del campo (tronos, lateral, monarca) baja bajo la bandeja (cinto, cuenta, mano)
//   apuntado  el trono apuntado va a escala ≥ 1,10 (transform), sin transición con «Reducir movimiento», dentro
//             de la ventana y sin pisar a otro trono ni la mano
//   tronos    en mesa-2tronos y mesa-3tronos se ven 2 y 3 tronos, los ausentes no se pintan y, con 2, cada trono
//             mide ≥ 1,4 × el ancho del trono de la mesa de cuatro en la misma ventana
//   V12 (bloque A de arte):
//   golpear   en toda mesa, Golpear (#btn-strike) es una placa de latón ámbar: tono HSL 35°–60°, ΔE2000 ≥ 30 frente
//             al carmesí de Corazones #c8232c y texto ≥ 7:1 sobre ella (también con Alto contraste y desactivado)
//   rojo      en todo estado, ningún botón (button, [role=button]) lleva de relleno el tono de Corazones: ΔE2000 ≥ 20
//             frente a #c8232c (el rojo de la mesa queda para el daño y el peligro)
//   inmune    además, medido en la captura (mesa, mesa-inmune, mesa-contraste, mesa-cifras): cada placa «Inmune ♠»
//             va sobre tinta maciza con 4 px de margen: en ese marco, ≥ 95 % de los píxeles a ΔE ≤ 6 de la tinta de la
//             placa o de su texto, y el fondo de la placa es esa tinta (≥ 50 % de sus píxeles; el resto, letra y palo)
//   vida      además, medido en la captura (mesa, mesa-inmune, mesa-contraste, mesa-cifras): el relleno de cada
//             barra de Vida es liso, ≥ 90 % de sus píxeles (sin la placa de la cifra) a ΔE ≤ 6 de su color medio
//   compacto  en mesa-cifras (Trono infinito 18): toda cifra marcada (data-cifra) ≤ 5 caracteres sin el signo, en
//             notación compacta desde 1.000 con el número entero en aria-label, del mismo tamaño de letra que esa
//             cifra en «mesa» (± 0,5 px) y dentro de su caja; se ven oro, Golpe, Vida, total de Vida y aviso del golpe
//   polvora   en mesa-polvora (2 tronos, 7♠ con sello de pólvora contra el otro): el trono de al lado enseña «+n»
//             (.preview.polvora) dentro de su trono, sin pisar la placa del golpe ni las placas, y la cuenta su marca
//   (mueren «sello» y «ventaja»: la mano ya no lleva sellos ×0 / ×2 / ×3 ni los tronos placas de ventaja; la
//   «trama» ya no se pide en el emblema de las numeradas, sí en tronos, figuras y poderes)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type Browser, chromium } from 'playwright';
import { PERMITIDOS_EN, RESTOS_ES } from '../src/shared/i18n';
import { BRAND } from '../src/shared/brand';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';

/** V10: idioma de la pasada. El inglés escribe en su propia carpeta. */
const LANG = process.argv.includes('--lang=en') || process.env.QA_LANG?.trim() === 'en' ? 'en' : 'es';
const OUT = resolve(process.env.QA_OUT?.trim() || (LANG === 'en' ? 'artifacts/visual-qa-en' : 'artifacts/visual-qa'));
const VIEWS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844, mobile: true },
].filter((v) => !process.env.VIEW || process.env.VIEW.split(',').includes(v.name));
const ALL = ['portada', 'portada-en', 'preparacion', 'mesa', 'lupa', 'lupa-herramienta', 'lupa-piso', 'lupa-especial', 'plano', 'cobro', 'ferreteria', 'forja', 'mazo', 'hallazgo', 'gremio', 'logros', 'coleccion', 'archivo', 'acta', 'ajustes', 'reglas', 'mesa-mando', 'mesa-susurro', 'mesa-fatiga', 'mesa-cuenta', 'mesa-peligro', 'acta-derrota', 'acta-victoria', 'guia-palo', 'guia-manga', 'guia-exacto', 'mesa-monarca', 'monarcas', 'mesa-esquirlas', 'cartas-lamina', 'taberna-monedas', 'mesa-lacre', 'acta-feedback', 'ajustes-prueba', 'ferreteria-mando', 'portada-idioma', 'mesa-contraste', 'mesa-2tintas', 'mesa-clasica', 'mesa-2tronos', 'mesa-3tronos', 'mesa-estados', 'mesa-inmune', 'ajustes-paleta', 'mesa-polvora', 'mesa-cifras', 'arbol-zoom', 'arbol-aviso', 'mesa-caida', 'mesa-auto', 'mesa-mejor', 'ritual', 'ritual-dos', 'ajustes-auto'];
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
/** Variantes que no van en la pasada completa y se piden por su nombre: mesa-monarca-<id> y hallazgo-<secreto>. */
const EXTRA = /^(mesa-monarca|hallazgo)-[a-z]+$/;
const STATES = wanted.length ? [...ALL.filter((s) => wanted.includes(s)), ...wanted.filter((s) => EXTRA.test(s) && !ALL.includes(s))] : ALL;
/** Pantallas que tienen que caber enteras, sin desplazamiento vertical. */
const NO_SCROLL = ['portada', 'portada-en', 'mesa', 'mesa-mando', 'mesa-fatiga', 'lupa', 'lupa-herramienta', 'lupa-piso', 'mesa-cuenta', 'mesa-peligro', 'guia-palo', 'guia-manga', 'guia-exacto', 'mesa-monarca', 'mesa-esquirlas', 'mesa-lacre', 'portada-idioma', 'mesa-contraste', 'mesa-2tintas', 'mesa-clasica', 'mesa-2tronos', 'mesa-3tronos', 'mesa-estados', 'mesa-inmune', 'mesa-polvora', 'mesa-cifras', 'gremio', 'arbol-zoom', 'arbol-aviso', 'mesa-caida', 'mesa-auto', 'mesa-mejor'];
const noScroll = (s: string) => NO_SCROLL.includes(s) || s.startsWith('mesa-monarca-');
/** infra/rapido · navegadores a la vez (QA_HILOS); cada uno es un proceso de Chromium aparte con las banderas de siempre. */
const HILOS = Math.max(1, Math.floor(Number(process.env.QA_HILOS || 8)) || 1);

/**
 * V8 · regla «anima»: lo que se anima solo cambia transform y opacity. Los casos que viven en juice.css no
 * son de arte-ui: van aquí, uno a uno (`@keyframes <nombre>` o el selector de la regla con su transition),
 * y salen como aviso, no como fallo. juice-ux los arregla y deja la lista vacía. Un caso que no esté en la
 * lista es fallo.
 */
const ANIMA_PENDIENTE_JUICE: string[] = [];

/**
 * V10 · regla «fuga»: zonas de juice-ux cuyos textos aún no tienen traducción (Susurros, voces, partida
 * guiada, avisos del mando, la tabla de controles, los avisos de la red y la fila de Susurros de Ajustes).
 * Un resto de español dentro de una de ellas sale como aviso, no como fallo. juice-ux las traduce y deja
 * la lista vacía.
 */
const FUGA_PENDIENTE: string[] = []; // juice-ux V10: vacía, sus textos ya van en los dos idiomas

interface Fail {
  regla: string;
  msg: string;
  /** El fallo cae en la zona de otra celda (cuenta central, finales, acta, susurro, foco). */
  ajeno: boolean;
  /** Solo aviso: se imprime y va al informe, pero no hace fallar la orden (ANIMA_PENDIENTE_JUICE). */
  aviso?: boolean;
}

/**
 * V12 · QA determinista: Math.random sale de una semilla (mulberry32). `__qaSemilla(texto)` la vuelve a poner a
 * partir de un texto (qa.ts la llama con el nombre de cada estado). Se instala antes de que cargue el juego.
 */
const AZAR_QA = `(() => {
  let a = 0x2545f491;
  const azar = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = azar;
  globalThis.__qaSemilla = (texto) => {
    let h = 2166136261;
    for (const ch of String(texto)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    a = h | 0;
  };
})();`;

/** Lo que se comprueba dentro de la página. Devuelve la lista de fallos, cada uno con su regla. */
async function audit(opts: { state: string; mobile: boolean; noScroll: boolean; pendiente: string[]; fuga: { re: string; permitidos: string[]; pendiente: string[] } | null; ref4?: number; emblemas?: Record<string, string>; refCifras?: Record<string, number> }): Promise<Fail[]> {
  const out: Fail[] = [];
  const seen = new Set<string>();
  const W = innerWidth;
  const H = innerHeight;
  const AJENO = '#score, .calc, .marks, .end, .acta-sheet, .whisper, .focus-ring, .omen, .lamina, #recibo';
  const fail = (regla: string, msg: string, el?: Element | null) => {
    const key = `${regla}|${msg}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ regla, msg, ajeno: !!el?.closest(AJENO) });
  };

  // ───────── anima (V8): solo transform y opacity en @keyframes, transition y animaciones vivas ─────────
  {
    const OK = /^(transform|opacity|translate|rotate|scale|offset|animation-timing-function|animation-composition)$/;
    const pend = new Set(opts.pendiente);
    const anima = (key: string, msg: string) => {
      if (pend.has(key)) {
        const k = `anima|${msg}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push({ regla: 'anima', msg: `${msg} (pendiente de juice-ux)`, ajeno: false, aviso: true });
        }
      } else fail('anima', msg);
    };
    // las hojas: una vez por ventana, en la mesa
    if (opts.state === 'mesa') {
      const walk = (rules: CSSRuleList) => {
        for (const r of rules) {
          if (r instanceof CSSKeyframesRule) {
            const bad = new Set<string>();
            for (const kf of r.cssRules) {
              const st = (kf as CSSKeyframeRule).style;
              for (let i = 0; i < st.length; i++) if (!OK.test(st[i])) bad.add(st[i]);
            }
            if (bad.size) anima(`@keyframes ${r.name}`, `@keyframes ${r.name} anima ${[...bad].join(', ')}`);
          } else if (r instanceof CSSStyleRule) {
            const tp = r.style.transitionProperty;
            if (tp && r.style.transitionDuration && !/^0s(,\s*0s)*$/.test(r.style.transitionDuration)) {
              const bad = tp.split(',').map((s) => s.trim()).filter((p) => p && p !== 'none' && !OK.test(p));
              if (bad.length) anima(r.selectorText, `la transition de «${r.selectorText}» anima ${bad.join(', ')}`);
            }
          }
          if ('cssRules' in r && !(r instanceof CSSKeyframesRule)) {
            try {
              walk((r as CSSGroupingRule).cssRules);
            } catch {
              /* hoja ajena */
            }
          }
        }
      };
      for (const s of document.styleSheets) {
        try {
          walk(s.cssRules);
        } catch {
          /* hoja de otro origen (fuentes) */
        }
      }
    }
    // lo que se está animando ahora mismo (lo infinito; lo finito ya se dio por acabado): sin filter ni mezcla
    for (const a of document.getAnimations()) {
      const fx = a.effect as KeyframeEffect | null;
      const el = fx?.target;
      if (!el || !el.isConnected) continue;
      const cs = getComputedStyle(el, fx.pseudoElement ?? undefined);
      const name = (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'animate()';
      const who = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}${fx.pseudoElement ?? ''}`;
      if (cs.filter && cs.filter !== 'none') anima(`vivo:${name}`, `${who} se anima («${name}») con filter: ${cs.filter.slice(0, 40)}`);
      if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') anima(`vivo:${name}`, `${who} se anima («${name}») con mix-blend-mode: ${cs.mixBlendMode}`);
    }
  }
  const name = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  const path = (el: Element) => {
    const up = el.parentElement?.closest('[id], .modal-box, .choice, .panel, .tower, .card, .set, .up, .ach, .acta-row, .run-body, .camp-grid');
    return up && up !== el ? `${name(up)} › ${name(el)}` : name(el);
  };
  const alphaCache = new WeakMap<Element, number>();
  /** Opacidad acumulada hasta la raíz (0 si algo está sin pintar). */
  const alpha = (el: Element): number => {
    const hit = alphaCache.get(el);
    if (hit !== undefined) return hit;
    const cs = getComputedStyle(el);
    let a = cs.display === 'none' ? 0 : Number(cs.opacity);
    if (a > 0 && el.parentElement) a *= alpha(el.parentElement);
    alphaCache.set(el, a);
    return a;
  };
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    if (getComputedStyle(el).visibility === 'hidden' || alpha(el) <= 0.05) return false;
    // la cara de una carta que mira hacia el otro lado no se ve
    const face = el.closest('.card-front, .card-back');
    if (face && face.classList.contains('card-front') === !!face.closest('.card')?.classList.contains('flipped')) return false;
    return true;
  };
  /** Escala acumulada de las transformaciones (las capas de una carta compensan su perspectiva: cuentan 1). */
  const scaleOf = (el: Element): number => {
    let s = 1;
    for (let p: Element | null = el; p && p !== document.documentElement; p = p.parentElement) {
      if (p.closest('.card-in')) p = p.closest('.card')!;
      const cs = getComputedStyle(p);
      if (cs.transform && cs.transform !== 'none') {
        const m = new DOMMatrixReadOnly(cs.transform);
        s *= Math.min(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
      }
      if (cs.scale && cs.scale !== 'none') s *= Math.min(...cs.scale.split(' ').map(Number).filter((n) => n > 0));
    }
    return s;
  };
  // capa que manda: la ventana de arriba, o la pantalla
  const layers = [...document.querySelectorAll<HTMLElement>('.modal, .lupa')];
  const scope: HTMLElement = layers[layers.length - 1] ?? document.getElementById('app')!;
  const mesa = opts.state === 'mesa' || opts.state === 'mesa-mando' || opts.state === 'mesa-fatiga';

  // ───────── maqueta · sin desbordamiento horizontal ─────────
  if (document.documentElement.scrollWidth > W + 1) fail('maqueta', `desbordamiento horizontal del documento: ${document.documentElement.scrollWidth} > ${W}`);
  for (const el of scope.querySelectorAll<HTMLElement>('*')) {
    if (el.closest('svg, .hero-art, .card, .chalk-mark, [data-lienzo]') || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > W + 2 || r.left < -2) {
      // dentro de una caja con desplazamiento propio no cuenta
      let p = el.parentElement;
      let clipped = false;
      while (p && p !== document.body) {
        const o = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(o.overflowX)) {
          const pr = p.getBoundingClientRect();
          if (pr.right <= W + 2 && pr.left >= -2) clipped = true;
          break;
        }
        p = p.parentElement;
      }
      if (!clipped) fail('maqueta', `se sale por los lados: ${name(el)} (${Math.round(r.left)}…${Math.round(r.right)} de ${W})`, el);
    }
  }

  // ───────── maqueta · pantallas de una pieza: nada por debajo del borde ─────────
  if (opts.noScroll) {
    if (document.documentElement.scrollHeight > H + 1) fail('maqueta', `desbordamiento vertical del documento: ${document.documentElement.scrollHeight} > ${H}`);
    for (const el of scope.querySelectorAll<HTMLElement>('button, .card, .tower, .panel, .belt-slot, #score, .power, .reserve')) {
      if (!visible(el) || el.closest('.lupa-sheet, [data-lienzo]')) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > H + 2 || r.top < -2) fail('maqueta', `fuera de la ventana en vertical: ${name(el)} (${Math.round(r.top)}…${Math.round(r.bottom)} de ${H})`, el);
    }
  }

  // ───────── maqueta · la mesa: zonas que no se pisan ─────────
  const union = (sel: string) => {
    const rs = [...document.querySelectorAll(sel)].filter(visible).map((e) => e.getBoundingClientRect());
    if (!rs.length) return null;
    return { l: Math.min(...rs.map((r) => r.left)), t: Math.min(...rs.map((r) => r.top)), r: Math.max(...rs.map((r) => r.right)), b: Math.max(...rs.map((r) => r.bottom)) };
  };
  if (mesa) {
    const zones: Record<string, ReturnType<typeof union>> = {
      mano: union('#hand .card'),
      torres: union('.floor-slot .card'),
      cinturon: union('#beltbar .belt-slot'),
      marcador: union('#score > *'),
      botones: union('.actions button'),
      andamio: union('#reserve'),
      poderes: union('#powers .power'),
    };
    const names = Object.keys(zones);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = zones[names[i]];
        const b = zones[names[j]];
        if (!a || !b) continue;
        const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (w > 2 && h > 2) fail('maqueta', `se pisan ${names[i]} y ${names[j]} (${Math.round(w)}×${Math.round(h)} px)`, names[i] === 'marcador' || names[j] === 'marcador' ? document.querySelector('#score') : null);
      }
    }
    for (const z of ['mano', 'torres', 'cinturon', 'marcador', 'botones', 'poderes']) if (!zones[z]) fail('maqueta', `falta en la mesa: ${z}`, z === 'marcador' ? document.querySelector('#score') : null);
    // las tres bandas de la pantalla: torres, lateral y bandeja
    const bands: Record<string, ReturnType<typeof union>> = { 'las torres': union('.tower'), 'el lateral': union('.side > *:not(.whisper)'), 'la bandeja': union('.tray') };
    const bn = Object.keys(bands);
    for (let i = 0; i < bn.length; i++) {
      for (let j = i + 1; j < bn.length; j++) {
        const a = bands[bn[i]];
        const b = bands[bn[j]];
        if (!a || !b) continue;
        const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
        const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
        if (w > 2 && h > 2) fail('maqueta', `se montan ${bn[i]} y ${bn[j]} (${Math.round(w)}×${Math.round(h)} px)`);
      }
    }
    // cada torre entera, con su carta dentro
    for (const t of document.querySelectorAll('.tower')) {
      const tr = t.getBoundingClientRect();
      for (const c of t.querySelectorAll('.floor-slot .card, .hp, .storeys, .plates')) {
        const cr = c.getBoundingClientRect();
        if (cr.height > 0 && (cr.bottom > tr.bottom + 2 || cr.top < tr.top - 2 || cr.right > tr.right + 2 || cr.left < tr.left - 2)) fail('maqueta', `se sale de su torre: ${name(c)}`);
      }
    }
    if (document.querySelectorAll('#hand .card').length < 8) fail('maqueta', 'la mano de prueba tiene menos de 8 cartas');
    if (document.querySelectorAll('#beltbar .belt-slot.tool').length < 5) fail('maqueta', 'el cinturón de prueba tiene menos de 5 herramientas');
    if (!document.querySelector('#reserve .card')) fail('maqueta', 'el andamio de prueba está vacío');
    if (!document.querySelector('#score .calc')) fail('maqueta', 'no hay previsualización de daño', document.querySelector('#score'));
    if (opts.state === 'mesa-fatiga' && !document.querySelector('#fatigue.on:not([hidden])')) fail('maqueta', 'con la obra alargada no se ve la fatiga de cimientos encendida');
    if (opts.state === 'mesa-mando' && !opts.mobile) {
      const shown = [...document.querySelectorAll('.actions .kh.pd, .bar .kh.pd')].filter(visible).length;
      if (shown < 4) fail('maqueta', `con mando solo se ven ${shown} insignias de botón en la mesa`);
      if ([...document.querySelectorAll('.kh.kb')].some(visible)) fail('maqueta', 'con mando siguen a la vista indicaciones de teclado');
    }
    // contrato C5: los seis botones de acción, con los id de siempre
    for (const id of ['btn-strike', 'btn-stash', 'btn-undo', 'btn-discard', 'btn-clear', 'btn-pass']) if (!document.querySelector(`.actions #${id}`)) fail('maqueta', `falta el botón de acción #${id}`);
  }

  // ───────── maqueta · la barra de arriba: ninguna ficha tapada por otra ni por un botón ─────────
  if (opts.state.startsWith('mesa')) {
    const bits = [...document.querySelectorAll('.bar .brand, .bar .room, .bar .chip, .bar button')].filter(visible);
    for (let i = 0; i < bits.length; i++) {
      const a = bits[i].getBoundingClientRect();
      if (bits[i].scrollWidth > bits[i].clientWidth + 2) fail('recorte', `recortado en la barra: ${name(bits[i])}`);
      for (let j = i + 1; j < bits.length; j++) {
        const b = bits[j].getBoundingClientRect();
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 1 && h > 1) fail('maqueta', `se pisan en la barra ${name(bits[i])} y ${name(bits[j])} (${Math.round(w)} px)`);
      }
    }
  }

  // ───────── el susurro de tiza se lee entero (zona de juice-ux) ─────────
  if (opts.state === 'mesa-susurro') {
    const w = document.querySelector<HTMLElement>('.whisper');
    if (!w) fail('maqueta', 'no hay susurro de tiza a la vista', document.querySelector('.whisper') ?? document.createElement('p'));
    else {
      const r = w.getBoundingClientRect();
      if (r.top < -2 || r.bottom > H + 2 || r.left < -2 || r.right > W + 2) fail('recorte', `el susurro se sale de la pantalla (${Math.round(r.top)}…${Math.round(r.bottom)} de ${H})`, w);
    }
  }

  // ───────── recorte matemático ─────────
  const scrollers = new Set<HTMLElement>();
  /**
   * ¿Algún antepasado (o la ventana) corta esta caja? Si se llega desplazando, apunta la zona y vale.
   * Con `self`, la comprobación empieza en el propio elemento: es lo que hace falta para un renglón de texto,
   * que también puede cortarlo la caja que lo contiene (un `<p>` de alto fijo con `overflow: hidden`).
   */
  const clipCheck = (el: Element, r: { left: number; top: number; right: number; bottom: number; height: number }, what: string, self = false): void => {
    const tolY = Math.max(2, r.height * 0.14);
    const tolX = 2;
    let pos = self ? 'static' : getComputedStyle(el).position;
    for (let p = self ? (el as HTMLElement) : el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      // V12 · un lienzo que se arrastra y se amplía (el Árbol): lo que corta se alcanza arrastrando (la regla «arbol»
      // pide aparte que cada nodo quepa entero en su caja y que el nodo enfocado se vea entero)
      if (p.hasAttribute('data-lienzo')) return;
      const cs = getComputedStyle(p);
      // un absoluto no lo recorta un antepasado estático; un fijo, solo la ventana
      const skip = (pos === 'absolute' && cs.position === 'static' && cs.transform === 'none') || (pos === 'fixed' && cs.transform === 'none' && cs.filter === 'none');
      if (skip) continue;
      pos = cs.position;
      const ox = cs.overflowX;
      const oy = cs.overflowY;
      if (ox === 'visible' && oy === 'visible') continue;
      const pr = p.getBoundingClientRect();
      // V12 · dentro de un lienzo ampliado (el Árbol) la caja va escalada: su interior también
      const k = p instanceof HTMLElement && p.offsetWidth ? pr.width / p.offsetWidth : 1;
      const top = pr.top + p.clientTop * k;
      const left = pr.left + p.clientLeft * k;
      const bottom = top + p.clientHeight * k;
      const right = left + p.clientWidth * k;
      if (oy !== 'visible' && (r.bottom > bottom + tolY || r.top < top - tolY)) {
        const scrollable = /(auto|scroll)/.test(oy) && p.scrollHeight > p.clientHeight + 1;
        if (scrollable && r.top - top + p.scrollTop > -tolY) return void scrollers.add(p as HTMLElement);
        return fail('recorte', `${what} cortado en vertical por ${name(p)} (${Math.round(r.top)}…${Math.round(r.bottom)} en ${Math.round(top)}…${Math.round(bottom)})`, el);
      }
      if (ox !== 'visible' && (r.right > right + tolX || r.left < left - tolX)) return fail('recorte', `${what} cortado en horizontal por ${name(p)} (${Math.round(r.left)}…${Math.round(r.right)} en ${Math.round(left)}…${Math.round(right)})`, el);
    }
    if (r.bottom > H + tolY || r.top < -tolY || r.right > W + tolX || r.left < -tolX) fail('recorte', `${what} cortado por el borde de la ventana (${Math.round(r.left)},${Math.round(r.top)} … ${Math.round(r.right)},${Math.round(r.bottom)})`, el);
  };

  // ───────── texto: tamaño efectivo, gótica, recorte y contraste, nodo a nodo ─────────
  const GOTHIC = /unifraktur|grenze|old english|fraktur/i;
  const first = (ff: string) => ff.split(',')[0].trim().replace(/['"]/g, '');
  /** Cifras críticas y descripciones: en móvil, 14 px. */
  const CRIT = '.corner b, .hp span, .threat b, .plate b, .storey b, .storey span, .stat b, .chip b, .pile b, .pile .count, .power em, .preview, .belt-slot .kind, .belt-slot .cnt, .price-tag, .purse b, .choice p, .lead, .note, .col-note, .stamp-btn small, .up span, .ach span, .kit li span, .acta-main span, .set span, .deck-opt span, .lupa-rules, .lupa-math dd, .say, .coach p, .level b, .bp-n, .pay td';
  /** Cifras que se leen de un vistazo: 7:1 y placa de respaldo. */
  const PLACA = '.corner b, .threat b, .plate b, .storey b, .storey span, .hp span, .belt-slot .kind, .belt-slot .cnt, .chip b, .power em, .preview';
  const rgb = (c: string) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  };
  const lum = (c: { r: number; g: number; b: number }) => {
    const f = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const FRAMED = 'button, .tower, .panel:not(.log), .coach, .seat:not(.empty), .stop';
  /** Color opaco sobre el que se pinta un elemento (el marco único pinta su fondo con --bg). null: no se sabe. */
  const bgOf = (el: Element): { r: number; g: number; b: number; a: number } | null => {
    for (let p: Element | null = el; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      let c = rgb(cs.backgroundColor);
      if ((!c || c.a < 0.6) && p.matches(FRAMED)) c = rgb(cs.getPropertyValue('--bg'));
      if (c && c.a >= 0.6) return c;
      if (p.classList.contains('card-front')) {
        const paper = p.querySelector(':scope > .ly.paper');
        const pc = paper && rgb(getComputedStyle(paper).backgroundColor);
        // en una carta especial o una ficha el arte tapa el papel: no se sabe
        if (p.closest('.k-special, .k-tile, .k-npc, .k-joker')) return null;
        if (pc && pc.a >= 0.6) return pc;
      }
      if (p.matches('.blueprint, .desk, .hero-art, .end')) return rgb(cs.backgroundColor);
    }
    return rgb(getComputedStyle(document.body).backgroundColor);
  };
  const mix = (fg: { r: number; g: number; b: number; a: number }, bg: { r: number; g: number; b: number }, a: number) => ({ r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) });
  const sizes = new Map<string, number>();
  const contrasts = new Map<string, string>();
  const range = document.createRange();
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent?.trim() || el.closest('script, style, .tip, .hero-art') || !visible(el)) continue;
    const cs = getComputedStyle(el);
    const px = parseFloat(cs.fontSize);
    if (px < 1) continue; // tamaño 0: texto retirado a propósito
    const inSvg = el instanceof SVGElement;
    let eff = px;
    if (inSvg) {
      const m = (el as unknown as SVGGraphicsElement).getScreenCTM?.();
      if (!m) continue;
      eff = px * Math.min(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
    } else eff = px * scaleOf(el);
    const crit = opts.mobile && !inSvg && el.closest(CRIT);
    const min = crit ? 14 : 13;
    const id = path(el);
    if (eff < min - 0.06 && (sizes.get(id) ?? 99) > eff) {
      sizes.set(id, eff);
      fail('texto', `texto de ${eff.toFixed(1)} px (mínimo ${min}): ${id} «${node.textContent.trim().slice(0, 18)}»`, el);
    }
    if (/\d/.test(node.textContent) && GOTHIC.test(first(cs.fontFamily)) && !el.closest('h1, h2')) fail('gotica', `cifra en gótica: ${id} «${node.textContent.trim().slice(0, 18)}»`, el);
    if (inSvg) continue;
    // recorte: cada línea del texto
    if (!el.closest('.card, .chalk-mark, .stage')) {
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) if (r.width >= 1 && r.height >= 1) clipCheck(el, r, `texto de ${id} «${node.textContent.trim().slice(0, 18)}»`, true);
    }
    // contraste
    const fg = rgb(cs.color);
    const bg = bgOf(el);
    if (fg && bg) {
      const k = ratio(mix(fg, bg, fg.a * alpha(el)), bg);
      // V7 · F3: la Vida del trono se lee de un vistazo, como el índice de la carta: 7:1 contra su placa
      const alto = opts.state === 'mesa-contraste';
      const need = alto ? 7 : el.closest(PLACA) && !opts.state.startsWith('x') ? (el.closest('.hp span') ? 7 : 4.5) : 4.5;
      if (k < need - 0.05 && !contrasts.has(id)) {
        contrasts.set(id, '');
        fail(alto ? 'contraste-alto' : 'contraste', `contraste ${k.toFixed(1)}:1 (mínimo ${need}:1): ${id} «${node.textContent.trim().slice(0, 18)}»${alto ? ` [${cs.color} sobre rgb(${bg.r}, ${bg.g}, ${bg.b})]` : ''}`, el);
      }
    }
  }
  // textos pintados con ::before / ::after (índices de la mano, flechas, comprobaciones)
  for (const el of scope.querySelectorAll<HTMLElement>('[data-n], [data-key], [data-short], .ach.ok b, .chip.me, .bp-title')) {
    if (!visible(el)) continue;
    for (const pseudo of ['::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (!cs.content || cs.content === 'none' || cs.content === 'normal' || cs.content === '""' || cs.display === 'none' || Number(cs.opacity) < 0.05) continue;
      const eff = parseFloat(cs.fontSize) * scaleOf(el);
      const min = opts.mobile && el.matches('[data-n]') ? 14 : 13;
      if (eff >= 1 && eff < min - 0.06) fail('texto', `texto de ${eff.toFixed(1)} px (mínimo ${min}): ${name(el)}${pseudo}`, el);
      if (/\d/.test(cs.content) && GOTHIC.test(first(cs.fontFamily))) fail('gotica', `cifra en gótica: ${name(el)}${pseudo}`, el);
    }
  }
  if (!document.fonts.check("800 16px 'Corona Cifras'", '0123456789')) fail('gotica', 'la fuente de cifras (Corona Cifras) no está cargada: los títulos góticos pintarían sus números en gótica');

  // ───────── placa: las cifras críticas no van nunca sobre la trama ─────────
  for (const el of scope.querySelectorAll<HTMLElement>(PLACA)) {
    if (!visible(el)) continue;
    const solid = (e: Element | null) => !!e && (rgb(getComputedStyle(e).backgroundColor)?.a ?? 0) >= 0.9;
    if (!solid(el) && !solid(el.parentElement) && !(el.parentElement?.matches(FRAMED) ?? false)) fail('placa', `cifra sin placa de respaldo: ${path(el)}`, el);
  }

  // ───────── dianas, aire y bordes ─────────
  const TARGETS = 'button, input:not([type="hidden"]):not([type="file"]), select, [tabindex="0"], .choice.pick';
  const inView = (r: DOMRect) => r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  const targets = [...scope.querySelectorAll<HTMLElement>(TARGETS)].filter((el) => visible(el) && !(el as HTMLButtonElement).disabled && !el.closest('.focus-ring'));
  const thumb = (el: Element) => opts.mobile && !!el.closest('.actions');
  for (const el of targets) {
    const r = el.getBoundingClientRect();
    const need = thumb(el) ? 48 : 44;
    const hand = el.matches('#hand .card');
    if (!hand && Math.min(r.width, r.height) < need - 0.5) fail('diana', `diana de ${Math.round(r.width)}×${Math.round(r.height)} px (mínimo ${need}): ${path(el)}`, el);
    if (!el.matches('.tower')) clipCheck(el, r, `diana ${path(el)}`);
    // márgenes de seguridad: nada pulsable pegado al borde físico (en un lienzo que se arrastra, cuenta su caja)
    if (inView(r) && r.top >= 0 && r.bottom <= H && !el.closest('[data-lienzo]')) {
      const scrolls = (() => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight + 1) return true;
        return false;
      })();
      const d = Math.min(r.left, W - r.right, scrolls ? 99 : r.top, scrolls ? 99 : H - r.bottom);
      if (d < 7.5) fail('aire', `diana a ${Math.max(0, Math.round(d))} px del borde de la pantalla (mínimo 8): ${path(el)}`, el);
    }
  }
  /** La parte de una diana que se ve: su caja recortada por las cajas con desplazamiento que la contienen. */
  const shown = (el: Element): DOMRect => {
    let { left, top, right, bottom } = el.getBoundingClientRect();
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const pr = p.getBoundingClientRect();
      left = Math.max(left, pr.left);
      top = Math.max(top, pr.top);
      right = Math.min(right, pr.right);
      bottom = Math.min(bottom, pr.bottom);
      // V10 P0-5: un pie (o una cabecera) pegado con sticky dentro de esa caja tapa lo que se desplaza por
      // debajo: esa parte tampoco se ve ni se pulsa (el pie de la Crónica)
      for (const c of p.children) {
        if (c.contains(el)) continue;
        const ccs = getComputedStyle(c);
        if (ccs.position !== 'sticky') continue;
        const cr = c.getBoundingClientRect();
        if (Math.min(right, cr.right) - Math.max(left, cr.left) <= 0) continue;
        if (ccs.bottom !== 'auto' && cr.top < bottom && cr.bottom >= top) bottom = Math.max(top, Math.min(bottom, cr.top));
        else if (ccs.top !== 'auto' && cr.bottom > top && cr.top <= bottom) top = Math.min(bottom, Math.max(top, cr.bottom));
      }
    }
    return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
  };
  // lo que queda escondido por el desplazamiento no se puede pulsar: solo cuenta la parte a la vista
  const near = targets.filter((el) => !el.matches('#hand .card') && inView(el.getBoundingClientRect()) && shown(el).height >= 4);
  for (let i = 0; i < near.length; i++) {
    for (let j = i + 1; j < near.length; j++) {
      const A = near[i];
      const B = near[j];
      if (A.contains(B) || B.contains(A)) continue;
      const a = shown(A);
      const b = shown(B);
      const gx = Math.max(a.left - b.right, b.left - a.right);
      const gy = Math.max(a.top - b.bottom, b.top - a.bottom);
      const ovx = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const ovy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const who = `${path(A)} y ${path(B)}`;
      if (ovx > 3 && ovy > 3) fail('aire', `dianas que se pisan (${Math.round(ovx)}×${Math.round(ovy)} px): ${who}`, A.closest(AJENO) ? A : B);
      else if (ovy > 0.4 * Math.min(a.height, b.height) && gx >= 0 && gx < 7.5) fail('aire', `dianas vecinas a ${Math.round(gx)} px (mínimo 8): ${who}`, A.closest(AJENO) ? A : B);
      else if (ovx > 0.4 * Math.min(a.width, b.width) && gy >= 0 && gy < 7.5) fail('aire', `dianas vecinas a ${Math.round(gy)} px en vertical (mínimo 8): ${who}`, A.closest(AJENO) ? A : B);
    }
  }

  // ───────── mano: separación limpia o franja pulsable ─────────
  const hand = [...document.querySelectorAll<HTMLElement>('#hand .card')].filter(visible).map((c) => c.getBoundingClientRect());
  const rows = new Map<number, DOMRect[]>();
  for (const r of hand) {
    const key = [...rows.keys()].find((k) => Math.abs(k - r.top) < r.height * 0.5) ?? r.top;
    rows.set(key, [...(rows.get(key) ?? []), r]);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => a.left - b.left);
    for (let i = 0; i < row.length; i++) {
      const next = row[i + 1];
      const strip = next ? Math.min(row[i].width, next.left - row[i].left) : row[i].width;
      const gap = next ? next.left - row[i].right : 99;
      if (strip < 43.5) fail('mano', `la carta ${i + 1} de la mano deja una franja pulsable de ${Math.round(strip)} px (mínimo 44)`);
      else if (gap >= 0 && gap < 7.5) fail('mano', `cartas ${i + 1} y ${i + 2} de la mano a ${Math.round(gap)} px (mínimo 8, o solaparlas dejando 44)`);
      if (Math.min(row[i].width, row[i].height) < 43.5) fail('diana', `carta de la mano de ${Math.round(row[i].width)}×${Math.round(row[i].height)} px`);
    }
  }

  // ───────── pulgar: en móvil las acciones van abajo, la mano encima y las torres arriba ─────────
  if (opts.mobile && opts.state.startsWith('mesa')) {
    const need: [string, string][] = [['#btn-strike', 'Golpear'], ['#btn-stash', 'Andamio'], ['#btn-discard', 'Descartar'], ['#btn-undo', 'Tiza']];
    let barTop = H;
    for (const [sel, label] of need) {
      const b = document.querySelector<HTMLElement>(sel);
      if (!b || !visible(b)) {
        fail('pulgar', `falta ${label} (${sel}) en la barra del pulgar`);
        continue;
      }
      const r = b.getBoundingClientRect();
      barTop = Math.min(barTop, r.top);
      if (Math.min(r.width, r.height) < 47.5) fail('pulgar', `${label} mide ${Math.round(r.width)}×${Math.round(r.height)} px en la barra del pulgar (mínimo 48)`);
      if (r.top < H * 0.8) fail('pulgar', `${label} no está al alcance del pulgar (arriba a ${Math.round(r.top)} de ${H})`);
    }
    const handBox = union('#hand .card');
    const towersBox = union('.tower');
    const bunker = document.querySelector('#bunker')?.getBoundingClientRect();
    if (handBox && handBox.b > barTop + 2) fail('pulgar', `la mano (hasta ${Math.round(handBox.b)}) se mete en la barra del pulgar (desde ${Math.round(barTop)})`);
    if (handBox && towersBox && towersBox.b > handBox.t + 2) fail('pulgar', 'las torres no quedan por encima de la mano');
    if (handBox && bunker && bunker.bottom > handBox.t + 2) fail('pulgar', 'el búnker no queda por encima de la mano');
    // V8 · A3: la barra respira. ≥ 12 px hasta el borde de abajo, ≥ 8 px entre botones y a los lados, y
    // Golpear y Descartar separados ≥ 16 px o con otro botón en medio
    if (['mesa', 'mesa-peligro', 'mesa-monarca', 'mesa-cuenta'].includes(opts.state)) {
      const bar = [...document.querySelectorAll<HTMLElement>('.actions > button')].filter(visible).map((b) => ({ id: b.id, r: b.getBoundingClientRect() })).sort((a, b) => a.r.left - b.r.left);
      for (const b of bar) {
        if (H - b.r.bottom < 11.5) fail('pulgar', `#${b.id} queda a ${Math.round(H - b.r.bottom)} px del borde de abajo (mínimo 12)`);
        if (b.r.left < 7.5 || W - b.r.right < 7.5) fail('pulgar', `#${b.id} queda a ${Math.round(Math.min(b.r.left, W - b.r.right))} px del borde lateral (mínimo 8)`);
      }
      for (let i = 0; i + 1 < bar.length; i++) {
        const gap = bar[i + 1].r.left - bar[i].r.right;
        if (gap < 7.5) fail('pulgar', `#${bar[i].id} y #${bar[i + 1].id} a ${Math.round(gap)} px (mínimo 8)`);
        const pair = [bar[i].id, bar[i + 1].id].sort().join('+');
        if (pair === 'btn-discard+btn-strike' && gap < 15.5) fail('pulgar', `Golpear y Descartar juntos a ${Math.round(gap)} px (mínimo 16 o un botón en medio)`);
      }
    }
  }

  // ───────── guardias (V8 · A3): cada fila de guardia entra entera en la caja visible de su trono ─────────
  if (['mesa', 'mesa-peligro', 'mesa-monarca', 'mesa-cuenta', 'mesa-mando'].includes(opts.state)) {
    for (const t of document.querySelectorAll<HTMLElement>('.tower')) {
      if (!visible(t)) continue;
      const tr = t.getBoundingClientRect();
      // la caja visible del trono: la suya, recortada por cada antepasado que recorta
      let top = tr.top;
      let bottom = tr.bottom;
      for (let p = t.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/(hidden|clip|auto|scroll)/.test(cs.overflowY)) {
          const pr = p.getBoundingClientRect();
          top = Math.max(top, pr.top);
          bottom = Math.min(bottom, pr.bottom);
        }
      }
      bottom = Math.min(bottom, H);
      // lo que se pinta encima del trono en la misma columna (la fila de Vida, el monarca) también tapa
      const covers = [...document.querySelectorAll('.side, .tray')].filter(visible).map((e) => e.getBoundingClientRect()).filter((c) => c.left < tr.right - 2 && c.right > tr.left + 2 && c.top > tr.top + 4);
      for (const c of covers) bottom = Math.min(bottom, c.top);
      const rows = [...t.querySelectorAll<HTMLElement>('.storeys > *')].filter((s) => s.getBoundingClientRect().height > 0);
      rows.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        if (r.top < top - 0.5 || r.bottom > bottom + 0.5) fail('guardias', `la fila ${i + 1} de guardias del trono ${t.dataset.suit} no entra entera (${Math.round(r.top)}…${Math.round(r.bottom)}; el trono se ve hasta ${Math.round(bottom)})`, s);
      });
    }
  }

  // ───────── piezas (V8): las piezas de la caída están, se ven y no llevan filtro ni mezcla ─────────
  {
    const need: Record<string, [string, number, number][]> = {
      'mesa-esquirlas': [['.esquirlas .esquirla', 6, 10], ['.pieza.mitad', 2, 2], ['.pieza.astilla', 2, 4]],
      'cartas-lamina': [['.ly.foil .foil-band', 4, 4]],
      'taberna-monedas': [['.pieza.moneda', 1, 10]],
      'mesa-lacre': [['.pieza.lacre.caliente .lacre-caliente', 1, 9], ['.pieza.lacre .lacre-frio', 2, 9]],
    };
    for (const [sel, lo, hi] of need[opts.state] ?? []) {
      const n = [...document.querySelectorAll(sel)].filter(visible).length;
      if (n < lo || n > hi) fail('piezas', `${sel}: ${n} a la vista (entre ${lo} y ${hi})`);
    }
    if (need[opts.state]) {
      for (const p of document.querySelectorAll('.pieza, .pieza *, .ly.foil, .foil-band, .esquirlas')) {
        const cs = getComputedStyle(p);
        if ((cs.filter && cs.filter !== 'none') || (cs.mixBlendMode && cs.mixBlendMode !== 'normal')) fail('piezas', `${p.tagName.toLowerCase()}.${(p.getAttribute('class') ?? '').split(' ')[0]} lleva filter o mix-blend-mode`);
      }
      if (document.querySelector('.coin, .debris')) fail('piezas', 'quedan cuadrados .coin o .debris junto a las piezas grabadas');
      // la banda de lámina va bajo el índice (no aclara las cifras) y queda dentro de su carta
      for (const f of document.querySelectorAll<HTMLElement>('.ly.foil')) if (getComputedStyle(f).overflow !== 'hidden') fail('piezas', 'la capa .ly.foil no recorta su banda (overflow)');
    }
  }

  // ───────── foco (V8 · A1): la carta con el foco del mando se levanta sobre sus vecinas no elegidas ─────────
  if (opts.state === 'mesa-mando') {
    const card = document.querySelector<HTMLElement>('#hand .card[data-foco], #reserve .card[data-foco]');
    if (!card || !visible(card)) fail('foco', 'ninguna carta de la mano lleva data-foco');
    else if (card.classList.contains('sel')) fail('foco', 'la carta con data-foco está elegida (tiene que ser una no elegida)', card);
    else {
      const r = card.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const peers = [...document.querySelectorAll<HTMLElement>('#hand > .card:not(.sel):not([data-foco])')].filter(visible).map((c) => c.getBoundingClientRect()).filter((c) => Math.abs(c.top + c.height / 2 - mid) < r.height * 0.6);
      const need = opts.mobile ? 3.95 : 5.95;
      if (!peers.length) fail('foco', 'la carta enfocada no tiene vecinas no elegidas en su fila para comparar', card);
      else {
        const lift = Math.min(...peers.map((p) => p.top)) - r.top;
        if (lift < need) fail('foco', `la carta enfocada sube ${lift.toFixed(1)} px sobre sus vecinas (mínimo ${Math.round(need)})`, card);
      }
      const score = union('#score > *');
      if (score && Math.min(r.right, score.r) - Math.max(r.left, score.l) > 2 && Math.min(r.bottom, score.b) - Math.max(r.top, score.t) > 2) fail('foco', 'la carta enfocada pisa la cuenta', card);
    }
  }

  // ───────── placas (V9 · V8-1): la placa del golpe no pisa las placas del trono ni su Ataque ─────────
  if (['mesa', 'mesa-mando', 'mesa-peligro', 'mesa-cuenta', 'mesa-inmune', 'mesa-2tronos', 'mesa-3tronos'].includes(opts.state)) {
    const cut = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0;
    const tags = [...document.querySelectorAll<HTMLElement>('.tower .preview')].filter(visible);
    if (!tags.length) fail('placas', 'no hay ninguna placa de golpe (.tower .preview) a la vista para comprobar');
    for (const p of tags) {
      const tower = p.closest('.tower')!;
      const suit = tower.getAttribute('data-suit') ?? '?';
      const r = p.getBoundingClientRect();
      for (const plate of tower.querySelectorAll<HTMLElement>('.plates > *')) if (visible(plate) && cut(r, plate.getBoundingClientRect())) fail('placas', `trono ${suit}: la placa del golpe «${p.textContent?.trim()}» pisa la placa «${plate.textContent?.trim()}»`, p);
      const atk = tower.querySelector<HTMLElement>('.threat');
      if (atk && visible(atk) && cut(r, atk.getBoundingClientRect())) fail('placas', `trono ${suit}: la placa del golpe pisa el Ataque del trono`, p);
    }
  }

  // ───────── bunker (V9 · V8-2): «Tu Vida», cada rótulo encima de su barra ─────────
  if (['mesa', 'mesa-mando', 'mesa-peligro'].includes(opts.state) && !opts.mobile) {
    const bar = (id: string) => document.getElementById(id);
    const label = (id: string) => document.getElementById(id)?.closest('.stat') ?? null;
    const [ib, wb, il, wl] = [bar('int-blocks'), bar('wall-blocks'), label('int-num'), label('wall-num')];
    if (!ib || !wb || !il || !wl || !visible(ib) || !visible(wb) || !visible(il) || !visible(wl)) fail('bunker', 'no se ven las dos barras de «Tu Vida» con sus rótulos');
    else {
      const [b1, b2, l1, l2] = [ib, wb, il, wl].map((e) => e.getBoundingClientRect());
      const g1 = b1.top - l1.bottom;
      const g2 = b2.top - l2.bottom;
      const g3 = l2.top - b1.bottom;
      if (g1 < -0.5 || g1 > 8.5) fail('bunker', `el rótulo «Vida» no queda justo encima de su barra (${g1.toFixed(1)} px; de 0 a 8)`, il);
      if (g2 < -0.5 || g2 > 8.5) fail('bunker', `el rótulo «Escudo» no queda justo encima de su barra (${g2.toFixed(1)} px; de 0 a 8)`, wl);
      if (g3 < 11.5) fail('bunker', `entre la barra de Vida y el rótulo del Escudo hay ${g3.toFixed(1)} px (mínimo 12)`, wl);
    }
  }

  // ───────── foco (V9 · V8-3): el marco del mando en La Taberna ─────────
  if (opts.state === 'ferreteria-mando') {
    const offer = document.querySelector<HTMLElement>('.run-body.shop .choice[data-foco]');
    const ring = document.querySelector<HTMLElement>('.focus-ring.on');
    if (!offer || !visible(offer)) fail('foco', 'ninguna oferta de La Taberna lleva data-foco');
    else if (!ring || !visible(ring)) fail('foco', 'el marco de foco (.focus-ring) no se ve en La Taberna');
    else {
      const o = offer.getBoundingClientRect();
      const r = ring.getBoundingClientRect();
      if (r.left > o.left + 0.5 || r.top > o.top + 0.5 || r.right < o.right - 0.5 || r.bottom < o.bottom - 0.5) fail('foco', 'el marco de foco no rodea la oferta enfocada', ring);
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) fail('foco', 'el marco de foco se sale de la ventana', ring);
      const i = ring.querySelector('i') ?? ring;
      const cs = getComputedStyle(i);
      const spreads = [...cs.boxShadow.matchAll(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/g)].map((m) => Math.max(0, Number(m[4])));
      const edge = parseFloat(cs.borderTopWidth) + spreads.reduce((a, b) => a + b, 0);
      if (edge < 5.95) fail('foco', `el marco de foco mide ${edge.toFixed(1)} px de borde total (mínimo 6)`, ring);
      const paper = rgb(cs.borderTopColor);
      const back = bgOf(offer.parentElement ?? offer);
      if (paper && back) {
        const k = ratio(paper, back);
        if (k < 2.95) fail('foco', `el filete de papel del marco da ${k.toFixed(1)}:1 contra el fondo de La Taberna (mínimo 3:1)`, ring);
      } else fail('foco', 'no se puede medir el contraste del marco de foco');
    }
  }

  // ───────── feedback (V9): «Enviar Crónica / Feedback de Prueba» en la Crónica y en Ajustes ─────────
  if (['acta', 'acta-derrota', 'acta-victoria', 'acta-feedback', 'ajustes', 'ajustes-prueba'].includes(opts.state)) {
    // V10: los mismos textos en la cara inglesa (ui.fb.*, ui.set.feedback.*, ui.set.llana.*)
    const en = document.documentElement.lang === 'en';
    const FB = en
      ? { boton: 'Send Chronicle / Playtest Feedback', aviso: 'Open report', linea: /Nothing leaves this device|sends your last campaign|^(Copied|Downloaded|Shared|Sent)/, copiado: /^Copied: paste the summary wherever you like/, cuenta: (n: string) => new RegExp(`^${n} campaigns? · \\d+\\.\\d kB, saved on this device$`), llana: /^(Nothing leaves this device: the button copies or downloads\.|Pressing Send sends your last campaign, and nothing else\.)$/ }
      : { boton: 'Enviar Crónica / Feedback de Prueba', aviso: 'Abrir aviso', linea: /Nada sale de este equipo|se manda tu última campaña|^(Copiado|Descargado|Compartido|Enviado)/, copiado: /^Copiado: pega el resumen donde quieras/, cuenta: (n: string) => new RegExp(`^${n} campañas? · \\d+,\\d kB, guardadas en este equipo$`), llana: /^(Nada sale de este equipo: el botón copia o descarga\.|Al pulsar Enviar se manda tu última campaña, y nada más\.)$/ };
    const send = scope.querySelector<HTMLButtonElement>('#fb-send');
    const out = scope.querySelector<HTMLElement>('.fb .fb-estado');
    if (!send || !visible(send)) fail('feedback', 'falta el botón «Enviar Crónica / Feedback de Prueba»');
    else {
      if (send.textContent?.trim() !== FB.boton) fail('feedback', `el botón dice «${send.textContent?.trim()}»`, send);
      if (send.disabled) fail('feedback', 'el botón está desactivado con una campaña guardada', send);
    }
    if (!out || out.getAttribute('role') !== 'status' || !out.textContent?.trim()) fail('feedback', 'la línea de lo que va a pasar no está o no lleva role="status"');
    else if (!FB.linea.test(out.textContent.trim())) fail('feedback', `la línea no dice qué va a pasar: «${out.textContent.trim()}»`, out);
    if (scope.querySelector('.fb input[type="checkbox"], .fb-datos input[type="checkbox"]')) fail('feedback', 'hay una casilla junto al botón de feedback');
    const issue = scope.querySelector<HTMLElement>('#fb-issue');
    if (issue && issue.textContent?.trim() !== FB.aviso) fail('feedback', `el botón del aviso dice «${issue.textContent?.trim()}»`, issue);
    if (opts.state === 'acta-feedback') {
      const box = scope.querySelector<HTMLElement>('.fb');
      if (box?.dataset.hecho !== 'copiado' || !FB.copiado.test(out?.textContent?.trim() ?? '')) fail('feedback', 'en acta-feedback no se ve la confirmación «Copiado: pega el resumen donde quieras»');
    }
    if (opts.state.startsWith('ajustes')) {
      // ajustes-prueba lleva exactamente dos; ajustes, las que haya dejado la pasada (al menos una)
      const n = opts.state === 'ajustes-prueba' ? '2' : '[1-9]\\d*';
      const count = scope.querySelector<HTMLElement>('#fb-cuenta')?.textContent?.trim() ?? '';
      if (!FB.cuenta(n).test(count)) fail('feedback', `la fila «Datos de prueba» dice «${count}» (se esperaban ${opts.state === 'ajustes-prueba' ? '2' : 'una o más'})`);
      for (const id of ['fb-ver', 'fb-borrar']) {
        const b = scope.querySelector<HTMLButtonElement>(`#${id}`);
        if (!b || !visible(b) || b.disabled) fail('feedback', `falta «${id === 'fb-ver' ? 'Ver' : 'Borrar'}» en la fila «Datos de prueba»`);
      }
      const plain = scope.querySelector<HTMLElement>('.fb-llana')?.textContent?.trim() ?? '';
      if (!FB.llana.test(plain)) fail('feedback', `la línea llana de «Datos de prueba» dice «${plain}»`);
    }
  }

  // ───────── tinta: las zonas con desplazamiento avisan mientras quede contenido ─────────
  for (const s of new Set([...scrollers, ...scope.querySelectorAll<HTMLElement>('[data-mas]')])) {
    if (!visible(s)) continue;
    const more = s.dataset.mas ?? '';
    const down = s.scrollTop + s.clientHeight < s.scrollHeight - 2;
    const up = s.scrollTop > 2;
    const cs = getComputedStyle(s);
    const drawn = (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') || getComputedStyle(s, '::after').content !== 'none' || getComputedStyle(s, '::before').content !== 'none'
      // V10 P0-5: o un pie pegado (sticky) que pinta la tinta encima de sí con su ::before (la Crónica)
      || [...s.children].some((c) => getComputedStyle(c).position === 'sticky' && getComputedStyle(c, '::before').content !== 'none');
    if (opts.noScroll && down && !s.matches('.log, .lupa-sheet, .lupa-box')) fail('maqueta', `esta pantalla no se desplaza, pero ${name(s)} esconde contenido (${s.scrollHeight} > ${s.clientHeight})`, s);
    if (down && !/abajo/.test(more)) fail('tinta', `${name(s)} esconde contenido abajo y no lo avisa (data-mas="${more}")`, s);
    if (up && !/arriba/.test(more)) fail('tinta', `${name(s)} esconde contenido arriba y no lo avisa (data-mas="${more}")`, s);
    if (!down && /abajo/.test(more)) fail('tinta', `${name(s)} avisa de contenido abajo y ya no queda`, s);
    if ((down || up) && !drawn) fail('tinta', `${name(s)} lleva data-mas="${more}" pero no pinta el aviso de tinta`, s);
  }

  // ───────── palos (V11): contorno de tinta en el palo de la esquina; las tintas las mide «paleta» ─────────
  for (const g of scope.querySelectorAll<SVGElement>('.card .corner .glyph')) {
    if (!visible(g)) continue;
    const cs = getComputedStyle(g);
    if (cs.stroke === 'none' || parseFloat(cs.strokeWidth) <= 0) fail('paleta', `palo sin contorno de tinta: ${name(g)}`);
    break;
  }

  // ───────── paleta (V11 · apartado 1.13): las tres paletas y Alto contraste, una vez por ventana ─────────
  // Tinta de cada palo sobre el papel ≥ 4,5:1 (≥ 7:1 con Alto contraste) y su variante clara sobre la mesa
  // (--table) ≥ 4,5:1 (≥ 7:1 con Alto contraste). La paleta de serie es la que pidió el usuario, al dígito.
  if (opts.state === 'mesa') {
    const html = document.documentElement;
    const before = [...html.classList];
    const probe = document.createElement('i');
    document.body.appendChild(probe);
    const tok = (v: string) => {
      probe.style.color = `var(${v})`;
      return rgb(getComputedStyle(probe).color);
    };
    const hex = (c: { r: number; g: number; b: number } | null) => (c ? `#${[c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, '0')).join('')}` : '?');
    const PALETAS: [string, string[]][] = [['cuatro colores', []], ['clásica', ['paleta-clasica']], ['dos tintas', ['inks2']]];
    for (const alto of [false, true]) {
      for (const [nombre, cls] of PALETAS) {
        html.classList.remove('paleta-clasica', 'inks2', 'contraste');
        for (const c of cls) html.classList.add(c);
        if (alto) html.classList.add('contraste');
        const papel = tok('--card-paper');
        const mesa = tok('--table');
        const need = alto ? 7 : 4.5;
        const tag = `${nombre}${alto ? ' · Alto contraste' : ''}`;
        if (!alto && !cls.length && hex(papel) !== '#efe6d5') fail('paleta', `el papel de las cartas es ${hex(papel)} y debía ser el marfil #efe6d5`);
        for (const s of ['S', 'H', 'D', 'C']) {
          const ink = tok(`--suit-${s}`);
          const lit = tok(`--suitd-${s}`);
          if (!ink || !lit || !papel || !mesa) {
            fail('paleta', `${tag}: no se leen las tintas del palo ${s}`);
            continue;
          }
          if (ratio(ink, papel) < need - 0.04) fail('paleta', `${tag}: el palo ${s} (${hex(ink)}) va a ${ratio(ink, papel).toFixed(2)}:1 sobre el papel (mínimo ${need}:1)`);
          if (ratio(lit, mesa) < need - 0.04) fail('paleta', `${tag}: la variante clara del palo ${s} (${hex(lit)}) va a ${ratio(lit, mesa).toFixed(2)}:1 sobre la mesa (mínimo ${need}:1)`);
        }
        if (!alto && !cls.length) {
          const pedidos: Record<string, string> = { S: '#161514', H: '#c8232c', D: '#1b5e9e', C: '#1b6b46' };
          for (const [s, want] of Object.entries(pedidos)) if (hex(tok(`--suit-${s}`)) !== want) fail('paleta', `cuatro colores: el palo ${s} es ${hex(tok(`--suit-${s}`))} y el pedido es ${want}`);
        }
      }
    }
    probe.remove();
    html.className = before.join(' ');
  }

  // ───────── daltonismo (V11 · apartado 1.13): Machado (2009), severidad 1, ΔE2000 entre cada par ─────────
  // Un par por debajo de 15 es aviso si el color va siempre con la forma del palo, y fallo si en algún sitio
  // de la mesa el color va solo (una franja, un borde o un punto sin glifo ni pinta).
  if (['mesa', 'mesa-clasica', 'mesa-2tintas'].includes(opts.state)) {
    const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    const MACHADO: Record<string, number[][]> = {
      protanopía: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
      deuteranopía: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
      tritanopía: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
    };
    const lab = (r: number, g: number, b: number) => {
      const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
      const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
      const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
      const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
      return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
    };
    const de2000 = (p: number[], q: number[]) => {
      const [L1, a1, b1] = p;
      const [L2, a2, b2] = q;
      const rad = Math.PI / 180;
      const C1 = Math.hypot(a1, b1);
      const C2 = Math.hypot(a2, b2);
      const Cm = (C1 + C2) / 2;
      const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
      const a1p = (1 + G) * a1;
      const a2p = (1 + G) * a2;
      const C1p = Math.hypot(a1p, b1);
      const C2p = Math.hypot(a2p, b2);
      const h = (b: number, a: number) => (b === 0 && a === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360);
      const h1 = h(b1, a1p);
      const h2 = h(b2, a2p);
      const dL = L2 - L1;
      const dC = C2p - C1p;
      let dh = 0;
      if (C1p * C2p !== 0) dh = Math.abs(h2 - h1) <= 180 ? h2 - h1 : h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 + 360;
      const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
      const Lm = (L1 + L2) / 2;
      const Cmp = (C1p + C2p) / 2;
      let hm = h1 + h2;
      if (C1p * C2p !== 0) hm = Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
      const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
      const dTh = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
      const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
      const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
      const Sc = 1 + 0.045 * Cmp;
      const Sh = 1 + 0.015 * Cmp * T;
      const Rt = -Math.sin(2 * dTh * rad) * Rc;
      return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
    };
    const sim = (c: { r: number; g: number; b: number }, m: number[][]) => {
      const v = [lin(c.r), lin(c.g), lin(c.b)];
      const o = m.map((row) => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])));
      return lab(o[0], o[1], o[2]);
    };
    const probe = document.createElement('i');
    document.body.appendChild(probe);
    const tok = (v: string) => {
      probe.style.color = `var(${v})`;
      return rgb(getComputedStyle(probe).color)!;
    };
    const SUITS4 = ['S', 'H', 'D', 'C'];
    const sets: [string, string][] = [['--suit-', 'sobre el papel'], ['--suitd-', 'sobre la mesa']];
    const flojos: { a: string; b: string; cols: string[]; msg: string }[] = [];
    for (const [pre, where] of sets) {
      const cols = Object.fromEntries(SUITS4.map((s) => [s, tok(`${pre}${s}`)]));
      for (let i = 0; i < 4; i++) {
        for (let j = i + 1; j < 4; j++) {
          const a = cols[SUITS4[i]];
          const b = cols[SUITS4[j]];
          let peor = Infinity;
          let cual = '';
          for (const [k, m] of Object.entries(MACHADO)) {
            const d = de2000(sim(a, m), sim(b, m));
            if (d < peor) [peor, cual] = [d, k];
          }
          if (peor < 15) flojos.push({ a: SUITS4[i], b: SUITS4[j], cols: [`rgb(${a.r}, ${a.g}, ${a.b})`, `rgb(${b.r}, ${b.g}, ${b.b})`], msg: `${SUITS4[i]}–${SUITS4[j]} ${where}: ΔE2000 ${peor.toFixed(1)} con ${cual}` });
        }
      }
    }
    probe.remove();
    if (flojos.length) {
      // ¿va el color solo en algún sitio? Se busca cada uso de esas tintas y, cerca, la forma del palo
      const FORMA = 'svg.glyph, svg.ly.art, .tower-tag, .corner';
      const PALO = /[♠♥♦♣]/;
      // la paleta clásica reutiliza tintas generales del tema (--ink, --red-lit, --hazard…): ahí el color no
      // codifica ningún palo, así que esos usos no cuentan como «color solo»
      const GENERALES = ['--ink', '--red', '--red-lit', '--ochre', '--hazard', '--gold', '--verd', '--verd-lit', '--blue', '--paper', '--card-paper'];
      probe.isConnected || document.body.appendChild(probe);
      const generales = new Set(GENERALES.map((v) => { const c = tok(v); return `rgb(${c.r}, ${c.g}, ${c.b})`; }));
      probe.remove();
      const tintas = new Set(flojos.flatMap((f) => f.cols).filter((c) => !generales.has(c)));
      const solos = new Set<string>();
      for (const el of scope.querySelectorAll<Element>('*')) {
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        const usos = [cs.color, cs.backgroundColor, cs.fill, cs.stroke, ...(['Top', 'Right', 'Bottom', 'Left'] as const).filter((k) => parseFloat(cs.getPropertyValue(`border-${k.toLowerCase()}-width`)) > 0).map((k) => cs.getPropertyValue(`border-${k.toLowerCase()}-color`))];
        const hit = usos.find((u) => tintas.has(u.replace(/rgba\(([^,]+), ([^,]+), ([^,]+), 1\)/, 'rgb($1, $2, $3)')));
        if (!hit) continue;
        if (cs.color === hit && !(el.textContent ?? '').trim()) {
          // el color del texto solo cuenta si hay texto o el elemento pinta con currentColor
          if (cs.fill !== hit && cs.backgroundColor !== hit && !usos.slice(4).includes(hit)) continue;
        }
        const host = el.closest('.card, .tower, .power, li, .chip, .plate, .lupa-math, .calc, .m, .bp-node, .route-stop, .glyph, svg') ?? el;
        if (host.matches(FORMA) || host.closest(FORMA) || host.querySelector(FORMA) || PALO.test(host.textContent ?? '')) continue;
        solos.add(`${name(el)} (${hit})`);
      }
      for (const f of flojos) {
        if (solos.size) fail('daltonismo', `${f.msg}, y el color va solo en ${[...solos].slice(0, 3).join(', ')}`);
        else {
          const k = `daltonismo|${f.msg}`;
          if (!seen.has(k)) {
            seen.add(k);
            out.push({ regla: 'daltonismo', msg: `${f.msg} (la forma del palo va siempre con el color)`, ajeno: false, aviso: true });
          }
        }
      }
    }
  }

  // ───────── trama: cuatro tramas de grabado, distintas en grises y en uso ─────────
  if (opts.state === 'mesa') {
    const root = getComputedStyle(document.documentElement);
    const gray: Record<string, Float32Array> = {};
    for (const s of ['S', 'D', 'H', 'C']) {
      const pat = document.querySelector(`pattern#pat-${s}`);
      const paper = document.querySelector(`pattern#trama-${s}`);
      if (!pat || !paper) {
        fail('trama', `falta la trama del palo ${s} (pattern#pat-${s} y pattern#trama-${s})`);
        continue;
      }
      const src = pat.outerHTML.replace(/var\((--[\w-]+)\)/g, (_, v: string) => root.getPropertyValue(v).trim() || '#888');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><defs>${src}</defs><rect width="48" height="48" fill="url(#pat-${s})"/></svg>`;
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 24;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, 24, 24).data;
      const g = new Float32Array(576);
      for (let i = 0; i < 576; i++) g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
      const mean = g.reduce((a, b) => a + b, 0) / 576;
      const sd = Math.sqrt(g.reduce((a, b) => a + (b - mean) ** 2, 0) / 576);
      if (sd < 16) fail('trama', `la trama del palo ${s} no se aprecia a 24 px en grises (desviación ${sd.toFixed(1)})`);
      gray[s] = g.map((v) => (v - mean) / (sd || 1));
      // en uso (V11): etiqueta del trono y figuras (las numeradas van de cara limpia, sin trama)
      const uses: [string, Element | null][] = [['la etiqueta del trono', document.querySelector(`.tower[data-suit="${s}"] .tower-tag`)], ['las figuras', document.querySelector(`.floor-slot .card.k-figure.s-${s}, #hand .card.k-figure.s-${s}`)]];
      for (const [where, host] of uses) if (!host || !new RegExp(`#(pat|trama)-${s}\\b`).test(host.outerHTML)) fail('trama', `la trama del palo ${s} no se usa en ${where}`);
    }
    const ks = Object.keys(gray);
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        // la misma trama desplazada no cuenta como distinta: se compara el espectro de vecindad en cuatro direcciones
        const sig = (g: Float32Array) => {
          const d = [0, 0, 0, 0];
          for (let y = 1; y < 23; y++) for (let x = 1; x < 23; x++) {
            const v = g[y * 24 + x];
            d[0] += Math.abs(v - g[y * 24 + x + 1]);
            d[1] += Math.abs(v - g[(y + 1) * 24 + x]);
            d[2] += Math.abs(v - g[(y + 1) * 24 + x + 1]);
            d[3] += Math.abs(v - g[(y - 1) * 24 + x + 1]);
          }
          const t = d.reduce((a, b) => a + b, 0) || 1;
          return d.map((v) => v / t);
        };
        const a = sig(gray[ks[i]]);
        const b = sig(gray[ks[j]]);
        const dist = a.reduce((acc, v, k) => acc + Math.abs(v - b[k]), 0);
        let mad = 0;
        for (let k = 0; k < 576; k++) mad += Math.abs(gray[ks[i]][k] - gray[ks[j]][k]);
        if (mad / 576 < 0.5 || dist < 0.05) fail('trama', `las tramas de ${ks[i]} y ${ks[j]} no se distinguen en grises (diferencia ${(mad / 576).toFixed(2)}, dirección ${dist.toFixed(2)})`);
      }
    }
  }

  // ───────── comprobaciones de otras celdas (arte-ui B, juice-ux): añadid las vuestras aquí, en bloque aparte ─────────

  // ── arte-ui 6.1 · candado de la marca dual: en la portada se leen los dos nombres ──
  // título del idioma y, en su cinta de lacre, el otro: visibles, dentro de la ventana, sin pisarse,
  // la cinta ≥ 13 px (14 en móvil) y en romana, y sin tapar las rodelas de los cuatro estandartes
  if (opts.state === 'portada' || opts.state === 'portada-en') {
    // V10: en la pasada inglesa la portada ya es la cara inglesa
    // V12: la cinta lleva el emblema de la cara (BRAND[cara].emblema): en inglés, «Original edition · SANGRE Y PALO»
    const cara = opts.state === 'portada-en' || document.documentElement.lang === 'en' ? 'en' : 'es';
    const want = cara === 'en' ? ['BLOOD & SUITS', (opts.emblemas?.en ?? 'SANGRE Y PALO').toUpperCase()] : ['SANGRE Y PALO', (opts.emblemas?.es ?? 'BLOOD & SUITS').toUpperCase()];
    const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
    const title = document.querySelector('.home-left .title');
    const ribbon = document.querySelector('.home-left .brand-seal .seal-ribbon');
    const wax = document.querySelector('.home-left .brand-seal .brand-wax');
    if (!title || !visible(title)) fail('marca', 'la portada no enseña el título', document.querySelector('.home-left'));
    // los renglones del título son cajas aparte: se comparan las letras, sin espacios
    else if (norm(title.textContent).replace(/ /g, '') !== want[0].replace(/ /g, '')) fail('marca', `el título dice «${norm(title.textContent)}» y debía decir «${want[0]}»`, title);
    if (!ribbon || !visible(ribbon)) fail('marca', 'la portada no enseña la cinta con el otro nombre', document.querySelector('.home-left'));
    else {
      if (norm(ribbon.textContent) !== want[1]) fail('marca', `la cinta dice «${norm(ribbon.textContent)}» y debía decir «${want[1]}»`, ribbon);
      const px = parseFloat(getComputedStyle(ribbon).fontSize) * scaleOf(ribbon);
      if (px < (opts.mobile ? 13.95 : 12.95)) fail('marca', `la cinta mide ${px.toFixed(1)} px`, ribbon);
      for (const el of [title, ribbon, wax]) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) fail('marca', `${path(el)} se sale de la ventana`, el);
      }
      if (title) {
        const t = title.getBoundingClientRect();
        const c = ribbon.getBoundingClientRect();
        // la cinta va cosida al título: pegada (≤ 24 px) pero sin montarse sobre las letras más de 6 px
        if (c.top - t.bottom > 24) fail('marca', `la cinta queda suelta, a ${Math.round(c.top - t.bottom)} px del título`, ribbon);
        if (t.bottom - c.top > 6 && Math.min(t.right, c.right) - Math.max(t.left, c.left) > 2) fail('marca', `la cinta pisa ${Math.round(t.bottom - c.top)} px del título`, ribbon);
      }
    }
    if (!wax || !visible(wax)) fail('marca', 'falta el sello de lacre de la cinta', document.querySelector('.home-left .brand-seal'));
  }

  // ── arte-ui B · cuenta central, recibo, aviso de último turno y causa del derrumbe ──
  {
    const box = (el: Element | null) => (el && visible(el) ? el.getBoundingClientRect() : null);
    const hits = (a: DOMRect, b: { l: number; t: number; r: number; b: number } | null) => !!b && Math.min(a.right, b.r) - Math.max(a.left, b.l) > 2 && Math.min(a.bottom, b.b) - Math.max(a.top, b.t) > 2;
    // cuenta: el daño final en grande (≥ 28 px) y nunca en gótica
    if (opts.state === 'mesa' || opts.state === 'mesa-cuenta' || opts.state === 'mesa-peligro') {
      const t = document.querySelector('#score .calc b.t');
      if (!t || !visible(t)) fail('cuenta', 'no se ve el daño final en la cuenta', document.querySelector('#score'));
      else {
        const cs = getComputedStyle(t);
        const px = parseFloat(cs.fontSize) * scaleOf(t);
        if (px < 27.95) fail('cuenta', `el daño final mide ${px.toFixed(1)} px (mínimo 28)`, t);
        if (GOTHIC.test(first(cs.fontFamily))) fail('cuenta', 'el daño final va en gótica', t);
      }
      if (!document.querySelector('#score .calc[tabindex="0"]')) fail('cuenta', 'la cuenta no es enfocable (tabindex="0")', document.querySelector('#score'));
    }
    // recibo desplegado: dentro de la ventana, sin pisar la mano ni las torres
    if (opts.state === 'mesa-cuenta') {
      const r = box(document.getElementById('recibo'));
      if (!r) fail('cuenta', 'el recibo paso a paso no está desplegado', document.querySelector('#score'));
      else {
        if (r.top < -1 || r.left < -1 || r.bottom > H + 1 || r.right > W + 1) fail('cuenta', `el recibo se sale de la ventana (${Math.round(r.left)},${Math.round(r.top)} … ${Math.round(r.right)},${Math.round(r.bottom)})`, document.getElementById('recibo'));
        if (hits(r, union('#hand .card'))) fail('cuenta', 'el recibo tapa la mano', document.getElementById('recibo'));
        if (hits(r, union('.tower'))) fail('cuenta', 'el recibo tapa las torres', document.getElementById('recibo'));
        for (const f of ['f-base', 'f-cartas', 'f-cinto', 'f-res', 'f-total']) if (!document.querySelector(`#recibo .${f}`)) fail('cuenta', `al recibo le falta la ficha .${f}`, document.getElementById('recibo'));
      }
    }
    // último turno: la banda de aviso, con sus dos líneas, sin tapar la mano
    if (opts.state === 'mesa-peligro') {
      const o = document.getElementById('omen');
      const r = box(o);
      if (!o || !r) fail('cuenta', 'con el búnker a 2 no sale el aviso de último turno', document.querySelector('#score'));
      else {
        if (!o.querySelector('b')?.textContent?.trim() || !o.querySelector('p span')?.textContent?.trim()) fail('cuenta', 'el aviso de último turno no trae sus dos líneas', o);
        if (hits(r, union('#hand .card'))) fail('cuenta', 'el aviso de último turno tapa la mano', o);
      }
    }
    // acta de una derrota: causa con sus dos líneas y su barra, y los botones de la lámina
    if (opts.state === 'acta-derrota') {
      const causa = document.querySelector('.acta-sheet .causa');
      if (!causa || !visible(causa)) fail('causa', 'el acta de la derrota no enseña la causa del derrumbe', document.querySelector('.acta-sheet'));
      else {
        for (const sel of ['.causa-1', '.causa-2']) if (!causa.querySelector(sel)?.textContent?.trim()) fail('causa', `a la causa le falta su línea ${sel}`, causa);
        if (!causa.querySelector('.causa-barra .cb-pista')) fail('causa', 'a la causa le falta la barra', causa);
      }
      for (const id of ['lamina-dl', 'lamina-copy', 'copy']) if (!document.getElementById(id)) fail('causa', `falta el botón #${id} en la crónica`, document.querySelector('.acta-sheet'));
      // botones del acta separados ≥ 12 px
      const bs = [...document.querySelectorAll('.acta-acciones button')].filter(visible).map((b) => b.getBoundingClientRect());
      for (let i = 0; i < bs.length; i++)
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i];
          const b = bs[j];
          const gx = Math.max(a.left - b.right, b.left - a.right);
          const gy = Math.max(a.top - b.bottom, b.top - a.bottom);
          if (Math.max(gx, gy) < 11.5) fail('aire', `botones de la crónica a ${Math.round(Math.max(gx, gy))} px (mínimo 12)`, document.querySelector('.acta-sheet'));
        }
    }
  }

  // ── arte-ui V7 · fricciones F2 (cuenta) y F3 (vida); V11 · inmune, estados, esquina, ataque, apuntado y tronos ──
  {
    const tier = opts.mobile ? 'movil' : W >= 1900 ? 'grande' : 'portatil';
    const pxOf = (el: Element) => parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    const over = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    // V11 · inmune: Inmune se señala en el trono (placa de hierro «Inmune ♠») y en la cuenta («Inmune · 0»),
    // y en ningún otro sitio: ninguna carta de la mano ni de La Manga lleva sello de factor (.plate.factor)
    if (opts.state.startsWith('mesa')) {
      for (const c of document.querySelectorAll<HTMLElement>('#hand .card, #reserve .card')) if (c.querySelector(':scope > .plate.factor')) fail('inmune', 'una carta de la mano lleva sello de factor (.plate.factor): Inmune solo va en el trono y en la cuenta', c);
    }
    if (opts.state === 'mesa-inmune') {
      const palabra = document.documentElement.lang === 'en' ? 'Immune' : 'Inmune';
      const aimed = document.querySelector<HTMLElement>('.tower.aimed');
      if (aimed?.dataset.suit !== 'S') fail('inmune', `en mesa-inmune el trono apuntado debía ser PICAS y es ${aimed?.dataset.suit ?? 'ninguno'}`);
      const plate = aimed?.querySelector<HTMLElement>('.plates .plate.iron');
      const b = plate?.querySelector('b');
      if (!plate || !b || !visible(plate)) fail('inmune', 'el trono apuntado no enseña su placa de hierro Inmune', aimed);
      else {
        if (b.textContent?.trim().toLowerCase() !== palabra.toLowerCase()) fail('inmune', `la placa dice «${b.textContent?.trim()}» y debía decir «${palabra}»`, plate);
        if (!plate.querySelector('svg.glyph')) fail('inmune', 'la placa Inmune no lleva el palo del trono', plate);
        const px = pxOf(b);
        if (px < 15.95) fail('inmune', `la palabra de la placa Inmune mide ${px.toFixed(1)} px (mínimo 16)`, b);
        const bg = rgb(getComputedStyle(plate).backgroundColor);
        const fg = rgb(getComputedStyle(b).color);
        if (!bg || bg.a < 0.95) fail('inmune', 'la placa Inmune no es opaca', plate);
        else if (!fg || ratio(fg, bg) < 6.95) fail('inmune', `la placa Inmune va a ${fg ? ratio(fg, bg).toFixed(1) : '?'}:1 (mínimo 7:1)`, plate);
      }
      const linea = [...document.querySelectorAll<HTMLElement>('#recibo li.inmune')].find(visible);
      if (!linea) fail('inmune', 'la cuenta abierta no lleva la línea Inmune de la carta del palo del trono');
      else if (!new RegExp(`${palabra}\\s*·\\s*0`, 'i').test(linea.textContent ?? '')) fail('inmune', `la línea Inmune de la cuenta dice «${linea.textContent?.trim()}» y debía decir «${palabra} · 0»`, linea);
    }
    // V11 · estados: solo hay dos, Expuesto (.fx-fractura) y Aturdido (.fx-sobrecarga), en el idioma de la mesa,
    // ≥ 14 px y sin «×1»; en mesa-estados se ven los dos
    if (opts.state.startsWith('mesa')) {
      const en = document.documentElement.lang === 'en';
      const want: Record<string, string> = { 'fx-fractura': en ? 'Exposed' : 'Expuesto', 'fx-sobrecarga': en ? 'Stunned' : 'Aturdido' };
      const seenFx = new Set<string>();
      for (const fx of [...document.querySelectorAll<HTMLElement>('.tower .fx')].filter(visible)) {
        const k = [...fx.classList].find((c) => c.startsWith('fx-'));
        if (!k || !want[k]) {
          fail('estados', `insignia de estado que ya no existe: ${name(fx)} «${fx.textContent?.trim()}»`, fx);
          continue;
        }
        seenFx.add(k);
        const txt = fx.textContent?.trim() ?? '';
        if (txt.toLowerCase() !== want[k].toLowerCase()) fail('estados', `la insignia ${k} dice «${txt}» y debía decir «${want[k]}»`, fx);
        const px = pxOf(fx);
        if (px < 13.95) fail('estados', `la insignia «${txt}» mide ${px.toFixed(1)} px (mínimo 14)`, fx);
        // la palabra cabe en su insignia y no la tapa el aviso de daño del trono
        if (fx.scrollWidth > fx.clientWidth + 1) fail('estados', `la insignia «${txt}» no cabe en su caja (${fx.scrollWidth} > ${fx.clientWidth} px)`, fx);
        const fr = fx.getBoundingClientRect();
        for (const pv of fx.closest('.tower')?.querySelectorAll<HTMLElement>('.preview') ?? []) {
          if (!visible(pv)) continue;
          const pr = pv.getBoundingClientRect();
          const ov = Math.min(fr.bottom, pr.bottom) - Math.max(fr.top, pr.top);
          if (ov > 1 && Math.min(fr.right, pr.right) - Math.max(fr.left, pr.left) > 1) fail('estados', `el aviso de daño tapa ${ov.toFixed(0)} px de la insignia «${txt}»`, fx);
        }
      }
      if (opts.state === 'mesa-estados') for (const k of Object.keys(want)) if (!seenFx.has(k)) fail('estados', `en mesa-estados no se ve la insignia «${want[k]}»`);
    }
    // V11 · esquina: el rango de la esquina ≥ 1,35 × el de la 10.0 (34 / 22 / 20 / 20 px), el palo de la esquina
    // ≥ 14 px (≥ 10 en 390×844), la insignia de orden ≥ 16 px (≥ 14) y la carta del mismo tamaño que en la 10.0
    if (['mesa', 'mesa-mando', 'mesa-2tintas', 'mesa-contraste', 'mesa-clasica'].includes(opts.state)) {
      const needPalo = opts.mobile ? 10 : 14;
      const needN = opts.mobile ? 14 : 16;
      const needRango = ({ 1920: 34, 1366: 22, 1280: 20, 390: 20 } as Record<number, number>)[W] ?? 20;
      for (const g of document.querySelectorAll('#hand .card .corner svg, .reserve .card .corner svg')) {
        if (!visible(g)) continue;
        const r = g.getBoundingClientRect();
        const lado = Math.min(r.width, r.height);
        if (lado < needPalo - 0.05) fail('esquina', `el palo de la esquina mide ${r.width.toFixed(1)}×${r.height.toFixed(1)} px (mínimo ${needPalo})`, g);
      }
      for (const b of document.querySelectorAll<HTMLElement>('#hand .card .corner b')) {
        if (!visible(b)) continue;
        const px = pxOf(b);
        if (px < needRango - 0.05) fail('esquina', `el rango «${b.textContent?.trim()}» de la esquina mide ${px.toFixed(1)} px (mínimo ${needRango})`, b);
      }
      for (const c of document.querySelectorAll<HTMLElement>('#hand .card[data-n], .reserve .card[data-n]')) {
        if (!visible(c) || !c.dataset.n) continue;
        const px = parseFloat(getComputedStyle(c, '::after').fontSize);
        if (px < needN - 0.05) fail('esquina', `la insignia de orden «${c.dataset.n}» mide ${px.toFixed(1)} px (mínimo ${needN})`, c);
      }
      const caja = ({ 1920: [129, 179], 1366: [84, 116], 1280: [75, 104], 390: [44, 62] } as Record<number, [number, number]>)[W];
      // la medida es la de la primera carta en reposo; si lleva el foco del mando (crece, V19), no se mide
      const c0 = [...document.querySelectorAll('#hand .card')].find(visible);
      if (caja && c0 && !c0.matches('[data-foco]')) {
        const r = c0.getBoundingClientRect();
        if (Math.abs(r.width - caja[0]) > 1.5 || Math.abs(r.height - caja[1]) > 1.5) fail('esquina', `la carta de la mano mide ${Math.round(r.width)}×${Math.round(r.height)} px (debe seguir en ${caja[0]}×${caja[1]} ± 1)`, c0);
      }
    }
    // V11 · vida: la Vida que queda (.hp-n) +35 % sobre la 10.0 en 1280 y 390 (20,25 y 18,9 px) y al menos lo de
    // la 10.0 en 1920 y 1366 (17,28 y 15); el «/ total» ≥ 13 px (14 en 390×844); placa propia, borde y centrada
    // V11 · ataque: el Ataque del trono ≥ 27 px en 1280, ≥ 20,25 en 390, ≥ 26 en 1920 y ≥ 19,2 en 1366
    if (opts.state.startsWith('mesa')) {
      const needVida = ({ 1920: 17.28, 1366: 15, 1280: 20.25, 390: 18.9 } as Record<number, number>)[W] ?? 15;
      const needAtk = ({ 1920: 26, 1366: 19.2, 1280: 27, 390: 20.25 } as Record<number, number>)[W] ?? 19.2;
      for (const s of document.querySelectorAll<HTMLElement>('.tower .hp span')) {
        if (!visible(s) || !s.textContent?.trim()) continue;
        const suit = s.closest('.tower')?.getAttribute('data-suit');
        const n = s.querySelector<HTMLElement>('.hp-n');
        const px = n ? parseFloat(getComputedStyle(n).fontSize) : 0;
        if (!n) fail('vida', `la Vida del trono ${suit} no separa la Vida que queda (.hp-n)`, s);
        else if (px < needVida - 0.05) fail('vida', `la Vida que queda del trono ${suit} mide ${px.toFixed(2)} px (mínimo ${needVida})`, n);
        const tot = s.querySelector<HTMLElement>('small');
        if (tot && visible(tot) && parseFloat(getComputedStyle(tot).fontSize) < (opts.mobile ? 13.95 : 12.95)) fail('vida', `el total de Vida del trono ${suit} mide ${getComputedStyle(tot).fontSize} (mínimo ${opts.mobile ? 14 : 13})`, tot);
        if ((rgb(getComputedStyle(s).backgroundColor)?.a ?? 0) < 0.9) fail('vida', `la Vida del trono ${suit} no tiene placa propia`, s);
        const bar = s.closest('.hp')!;
        if (parseFloat(getComputedStyle(bar).borderTopWidth) < 1.95) fail('vida', `la barra de Vida del trono ${suit} no lleva borde de tinta de 2 px`, s);
        const sr = s.getBoundingClientRect();
        const br = bar.getBoundingClientRect();
        if (Math.abs(sr.left + sr.width / 2 - (br.left + br.width / 2)) > 3 * scaleOf(s)) fail('vida', `la placa de la Vida del trono ${suit} no va centrada sobre la barra`, s);
      }
      for (const b of document.querySelectorAll<HTMLElement>('.tower .threat b')) {
        if (!visible(b)) continue;
        const px = parseFloat(getComputedStyle(b).fontSize);
        if (px < needAtk - 0.05) fail('ataque', `el Ataque del trono ${b.closest('.tower')?.getAttribute('data-suit')} mide ${px.toFixed(2)} px (mínimo ${needAtk})`, b);
        // la placa del Ataque no tapa el palo del rótulo (con dos cifras, en el móvil, lo tapaba)
        const g = b.closest('.tower')?.querySelector<Element>('.tower-tag .glyph');
        if (g && visible(g)) {
          const gr = g.getBoundingClientRect();
          const tr = (b.closest('.threat') ?? b).getBoundingClientRect();
          const ox = Math.min(gr.right, tr.right) - Math.max(gr.left, tr.left);
          if (ox > 1 && Math.min(gr.bottom, tr.bottom) - Math.max(gr.top, tr.top) > 1) fail('ataque', `la placa del Ataque tapa ${ox.toFixed(0)} px del palo del rótulo`, b);
        }
      }
    }
    // V11 · campo: lo de arriba de la mesa (tronos, lateral, monarca) no se mete bajo la bandeja (cinto, cuenta,
    // mano); con el aviso de último turno, en el móvil, el monarca quedaba 5 px bajo el cinto
    if (opts.state.startsWith('mesa')) {
      const tray = document.querySelector<HTMLElement>('.table-screen .tray');
      const trayTop = tray && visible(tray) ? tray.getBoundingClientRect().top : Infinity;
      for (const el of document.querySelectorAll<HTMLElement>('.table-screen .field > *, #monarch')) {
        if (!visible(el)) continue;
        const b = el.getBoundingClientRect().bottom;
        if (b > trayTop + 1) fail('campo', `${name(el)} baja ${(b - trayTop).toFixed(0)} px bajo la bandeja de la mesa`, el);
      }
    }
    // V11 · apuntado: el trono apuntado crece solo con transform (escala ≥ 1,10), sin transición con «Reducir
    // movimiento», dentro de la ventana y sin pisar a sus vecinos ni la mano
    if (opts.state.startsWith('mesa')) {
      const aimed = [...document.querySelectorAll<HTMLElement>('.tower.aimed')].find(visible);
      if (aimed) {
        const suit = aimed.dataset.suit;
        const m = new DOMMatrixReadOnly(getComputedStyle(aimed).transform === 'none' ? undefined : getComputedStyle(aimed).transform);
        const k = Math.hypot(m.a, m.b);
        if (k < 1.095) fail('apuntado', `el trono apuntado ${suit} va a escala ${k.toFixed(3)} (mínimo 1,10)`, aimed);
        // con «Reducir movimiento» (.calm): se mide un clon dentro de un .calm aparte, sin tocar la mesa (cambiar
        // la clase de <html> volvería a lanzar el reparto de la mano)
        const calm = document.createElement('div');
        calm.className = 'calm';
        calm.style.cssText = 'position:fixed;left:-9999px;top:0;width:200px;';
        const clone = aimed.cloneNode(false) as HTMLElement;
        calm.appendChild(clone);
        document.body.appendChild(calm);
        const dur = getComputedStyle(clone).transitionDuration.split(',').map(parseFloat);
        calm.remove();
        if (dur.some((d) => d > 0)) fail('apuntado', `con «Reducir movimiento» el trono apuntado aún lleva transición (${getComputedStyle(aimed).transitionDuration})`, aimed);
        const r = aimed.getBoundingClientRect();
        if (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) fail('apuntado', `el trono apuntado ${suit} se sale de la ventana`, aimed);
        for (const t of document.querySelectorAll<HTMLElement>('.tower')) {
          if (t === aimed || !visible(t)) continue;
          if (over(r, t.getBoundingClientRect())) fail('apuntado', `el trono apuntado ${suit} pisa el trono ${t.dataset.suit}`, aimed);
        }
        for (const c of document.querySelectorAll<HTMLElement>('#hand .card, #reserve .card')) if (visible(c) && over(r, c.getBoundingClientRect())) fail('apuntado', `el trono apuntado ${suit} pisa una carta de la mano`, aimed);
      }
    }
    // V11 · tronos: con 2 y 3 tronos los ausentes no se pintan y, con 2, cada trono mide ≥ 1,4 × el de la mesa
    // de cuatro en la misma ventana (ref4, medido en «mesa»)
    if (opts.state === 'mesa-2tronos' || opts.state === 'mesa-3tronos') {
      const n = opts.state === 'mesa-2tronos' ? 2 : 3;
      const shown = [...document.querySelectorAll<HTMLElement>('.tower')].filter(visible);
      if (shown.length !== n) fail('tronos', `se ven ${shown.length} tronos y el asalto tiene ${n}`);
      for (const t of document.querySelectorAll<HTMLElement>('.tower[hidden]')) if (t.getBoundingClientRect().width > 0) fail('tronos', `el trono ausente ${t.dataset.suit} se pinta`, t);
      if (opts.ref4) {
        const want = n === 2 ? 1.4 : 1;
        for (const t of shown) if (t.offsetWidth < opts.ref4 * want - 0.5) fail('tronos', `el trono ${t.dataset.suit} mide ${t.offsetWidth} px de ancho; con ${n} tronos, mínimo ${(opts.ref4 * want).toFixed(0)} (${want} × ${opts.ref4} de la mesa de cuatro)`, t);
      }
    }
    // F2 · cuenta: Daño y Multi en su renglón, cifras ≥ 18 / 16 / 15 px y palabras ≥ 14 px
    if (opts.state === 'mesa' || opts.state === 'mesa-cuenta' || opts.state === 'mesa-peligro') {
      const calc = document.querySelector('#score .calc[tabindex]');
      const need = { grande: 18, portatil: 16, movil: 15 }[tier];
      const nums = calc ? [...calc.querySelectorAll('.fr b')].filter(visible) : [];
      if (nums.length !== 2) fail('cuenta', `la cuenta enseña ${nums.length} cifras de Daño y Multi (deben ser 2)`, calc);
      for (const b of nums) {
        const px = pxOf(b);
        if (px < need - 0.05) fail('cuenta', `la cifra «${b.textContent?.trim()}» de la cuenta mide ${px.toFixed(1)} px (mínimo ${need})`, b);
      }
      const words = calc ? [...calc.querySelectorAll('.fr i.lg, .fr i.sh')].filter(visible) : [];
      if (words.length !== 2) fail('cuenta', `la cuenta enseña ${words.length} rótulos de Daño y Multi (deben ser 2)`, calc);
      for (const w of words) {
        const px = pxOf(w);
        if (px < 13.95) fail('cuenta', `el rótulo «${w.textContent?.trim()}» de la cuenta mide ${px.toFixed(1)} px (mínimo 14)`, w);
        if (!opts.mobile && w.matches('.sh')) fail('cuenta', `la cuenta abrevia «${w.textContent?.trim()}» fuera del móvil`, w);
      }
      // dos renglones: el Golpe y «contra» arriba, Daño y Multi debajo
      const vs = calc?.querySelector('.vs');
      const fr = calc?.querySelector('.fr');
      if (vs && fr && visible(vs) && visible(fr) && fr.getBoundingClientRect().top < vs.getBoundingClientRect().bottom - 2) fail('cuenta', 'Daño y Multi no van en el renglón de debajo de «contra»', calc);
    }
    // V11 · cuenta: la línea plegada cuadra. En todo estado con la cuenta plegada a la vista, el Multi es
    // entero y Daño × Multi = Golpe, sin margen; y el Multi entero en su caja
    {
      const calc = document.querySelector<HTMLElement>('#score .calc[role="button"]');
      if (calc && visible(calc)) {
        const cifra = (s: string | null | undefined) => parseFloat((s ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
        // V12: Daño y Golpe pueden ir en notación compacta: se lee el número entero que llevan en data-cifra
        const lee = (el: Element | null | undefined) => cifra(el?.getAttribute('data-cifra') ?? el?.textContent);
        const d = lee(calc.querySelector('.fr-f b'));
        const m = cifra(calc.querySelector('.fr-r b')?.textContent);
        const t = lee(calc.querySelector('b.t'));
        if (![d, m, t].every(Number.isFinite)) fail('cuenta', `no se leen Daño, Multi y Golpe en la cuenta plegada (${d} × ${m} = ${t})`, calc);
        else if (!Number.isInteger(m)) fail('cuenta', `el Multi de la cuenta plegada no es entero: ${m}`, calc);
        else if (d * m !== t) fail('cuenta', `la cuenta plegada no cuadra: ${d} × ${m} = ${d * m} contra ${t} en pantalla`, calc);
        const rr = calc.querySelector('.fr-r');
        const rb = rr?.querySelector('b');
        if (rr && rb && visible(rb)) {
          const a = rb.getBoundingClientRect();
          const box = shown(rb);
          if (box.width < a.width - 1 || box.height < a.height - 1 || a.right > W + 1 || rb.scrollWidth > rb.clientWidth + 1 && getComputedStyle(rb).overflow !== 'visible') fail('cuenta', `el Multi «${rb.textContent?.trim()}» de la cuenta plegada sale recortado`, rb);
        }
      }
    }
  }

  // ── arte-ui V7 · guía, monarcas y secretos de la cripta (reglas «guia», «voz» y «secreto») ──
  {
    const pxOf = (el: Element) => parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    type Box = { l: number; t: number; r: number; b: number };
    const over = (a: DOMRect, b: Box | null) => !!b && Math.min(a.right, b.r) - Math.max(a.left, b.l) > 2 && Math.min(a.bottom, b.b) - Math.max(a.top, b.t) > 2;
    const handZone = union('#hand .card, #reserve .card, #reserve .reserve-slot');
    const scoreZone = union('#score > *');
    const inside = (r: DOMRect) => r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1;
    // guía: placa de una línea ≥ 14 px (15 en móvil) que no pisa la mano ni la cuenta; velo y aro a la vista
    if (opts.state.startsWith('guia-')) {
      const placa = document.querySelector<HTMLElement>('#guia .guia-placa');
      if (!placa || !visible(placa) || !placa.textContent?.trim()) fail('guia', 'no se ve la placa de la guía');
      else {
        const r = placa.getBoundingClientRect();
        const px = pxOf(placa);
        if (px < (opts.mobile ? 14.95 : 13.95)) fail('guia', `la placa de la guía mide ${px.toFixed(1)} px`, placa);
        if (!opts.mobile && r.height > px * 1.25 * 1.6 + 26) fail('guia', `la placa de la guía no cabe en una línea (${Math.round(r.height)} px de alto)`, placa);
        if (over(r, handZone)) fail('guia', 'la placa de la guía pisa la mano', placa);
        if (over(r, scoreZone)) fail('guia', 'la placa de la guía pisa la cuenta', placa);
        if (!inside(r)) fail('guia', 'la placa de la guía se sale de la ventana', placa);
        if (/[<>]/.test(placa.textContent)) fail('guia', 'la placa de la guía enseña etiquetas HTML en crudo', placa);
      }
      const hueco = document.querySelector<HTMLElement>('#guia .guia-hueco');
      const aro = document.querySelector<HTMLElement>('#guia .guia-aro');
      if (!hueco || alpha(hueco) < 0.5) fail('guia', 'la mesa no se vela alrededor del foco');
      if (!aro || !visible(aro)) fail('guia', 'no hay aro de foco a la vista');
      else if (!inside(aro.getBoundingClientRect())) fail('guia', 'el aro de foco se sale de la ventana', aro);
      // lo que señala cada paso: la carta del paso, el hueco de La Manga y el trono del Golpe exacto
      const want: Record<string, string> = { 'guia-palo': '#hand .card[data-id="C6"]', 'guia-manga': '#reserve', 'guia-exacto': '.tower[data-suit="H"]' };
      const t = want[opts.state] ? document.querySelector(want[opts.state]) : null;
      if (want[opts.state] && !t) fail('guia', `no está en la mesa lo que señala el paso (${want[opts.state]})`);
      if (t && aro) {
        const a = aro.getBoundingClientRect();
        const b = t.getBoundingClientRect();
        if (!(b.left >= a.left - 2 && b.right <= a.right + 2 && b.top >= a.top - 2 && b.bottom <= a.bottom + 2)) fail('guia', `el aro no rodea ${want[opts.state]}`, aro);
      }
    }
    // monarca en la mesa: retrato, nombre y placa del decreto; la maldición marcada; bocadillo ≥ 14 px sin pisar mano ni cuenta
    if (opts.state === 'mesa-monarca' || opts.state.startsWith('mesa-monarca-')) {
      const mon = document.getElementById('monarch');
      if (!mon || !visible(mon)) fail('voz', 'no se ve el monarca en la mesa');
      else {
        if (!mon.querySelector('.mon-port svg.monarca.calma')) fail('voz', 'falta el retrato del monarca en calma', mon);
        const plate = mon.querySelector('.curse-plate');
        if (!plate || !visible(plate) || !plate.textContent?.trim()) fail('voz', 'falta la placa del decreto junto al retrato', mon);
        else if (!plate.querySelector('svg.curse-ico')) fail('voz', 'la placa del decreto no lleva su icono', mon);
        if (!inside(mon.getBoundingClientRect())) fail('voz', 'el monarca se sale de la ventana', mon);
      }
      const mark = document.querySelector<HTMLElement>('.table-screen')?.dataset.curse;
      const marked: Record<string, string> = { contraataque: '.pile .curse-tag', mano: '#hand > .curse-ghost', corazones: '#hand .card.s-H > .curse-chalice', escudo: '.stat .curse-tag', guardias: '.tower .curse-tag.sin-fx', ataque: '.tower .threat .curse-tag', asedio: '#fatigue .curse-tag' };
      if (!mark || !marked[mark]) fail('voz', `la mesa no lleva la marca de la maldición (data-curse=${mark ?? 'nada'})`);
      else if (![...document.querySelectorAll(marked[mark])].some(visible)) fail('voz', `no se ve la marca de la maldición «${mark}» (${marked[mark]})`);
      const bark = document.getElementById('bark');
      if (!bark || !visible(bark) || !bark.textContent?.trim()) fail('voz', 'no se ve el bocadillo del monarca');
      else {
        const r = bark.getBoundingClientRect();
        const px = pxOf(bark.querySelector('p') ?? bark);
        if (px < 13.95) fail('voz', `el bocadillo mide ${px.toFixed(1)} px`, bark);
        if (over(r, handZone)) fail('voz', 'el bocadillo pisa la mano', bark);
        if (over(r, scoreZone)) fail('voz', 'el bocadillo pisa la cuenta', bark);
        if (!inside(r)) fail('voz', 'el bocadillo se sale de la ventana', bark);
        // V8 · A2: ni sobre un trono ni sobre la barra de acciones
        for (const t of document.querySelectorAll<HTMLElement>('.tower')) {
          const tr = t.getBoundingClientRect();
          if (visible(t) && over(r, { l: tr.left, t: tr.top, r: tr.right, b: tr.bottom })) fail('voz', `el bocadillo pisa el trono ${t.dataset.suit}`, bark);
        }
        if (over(r, union('.actions > button'))) fail('voz', 'el bocadillo pisa la barra de acciones', bark);
      }
    }
    // galería: los siete, cada uno con su retrato en calma y vencido y la placa de su decreto
    if (opts.state === 'monarcas') {
      const fichas = [...document.querySelectorAll('.mon-ficha')];
      if (fichas.length !== 7) fail('voz', `la galería tiene ${fichas.length} monarcas (deben ser 7)`);
      for (const f of fichas) {
        const id = f.getAttribute('data-boss');
        if (!f.querySelector('svg.monarca.calma') || !f.querySelector('svg.monarca.vencido')) fail('voz', `a ${id} le falta una de sus dos caras`, f);
        if (!f.querySelector('.curse-plate b')?.textContent?.trim()) fail('voz', `a ${id} le falta la placa del decreto`, f);
      }
    }
    // secretos: lo que da y lo que cuesta cada opción, a la vista sin desplazar y a 15 px o más
    if (opts.state === 'hallazgo' || opts.state.startsWith('hallazgo-')) {
      const cards = [...document.querySelectorAll('#opts .secreto')];
      if (!cards.length) fail('secreto', 'las opciones del secreto no van como cartas (.secreto)');
      for (const o of cards) {
        const label = o.querySelector('b')?.textContent ?? '?';
        for (const sel of ['.sec-da', '.sec-cuesta', '.sec-ico']) {
          const e = o.querySelector(sel);
          if (!e || !visible(e)) {
            fail('secreto', `a la opción «${label}» le falta ${sel}`, o);
            continue;
          }
          const r = e.getBoundingClientRect();
          if (r.bottom > H + 1 || r.top < -1) fail('secreto', `${sel} de «${label}» no se ve sin desplazar (${Math.round(r.top)}…${Math.round(r.bottom)} de ${H})`, o);
          if (sel !== '.sec-ico' && pxOf(e) < 14.95) fail('secreto', `${sel} de «${label}» mide ${pxOf(e).toFixed(1)} px (mínimo 15)`, o);
        }
      }
    }
  }

  // ── cabecera de la crónica (V6) ──
  // en acta, acta-derrota y acta-victoria ningún sello (Corte vencida / Deshecha), ficha de la cabecera
  // (CRÓNICA, baraja · Reinado) ni renglón del título se pisa con otro. Cajas del DOM: el sello girado
  // cuenta con su caja entera; los renglones del título, con la caja de su texto (Range), no la del bloque.
  // Las fichas vecinas comparten el filete (≤ 3 px a propósito): se perdona un solape de hasta 4 px.
  if (opts.state === 'acta' || opts.state === 'acta-derrota' || opts.state === 'acta-victoria') {
    const sheet = document.querySelector('.acta-sheet');
    const piezas: { n: string; r: DOMRect }[] = [];
    const sello = sheet?.querySelector(':scope > .inkstamp');
    if (!sello || !visible(sello)) fail('cabecera', 'la crónica no lleva su sello', sheet);
    else piezas.push({ n: `sello «${sello.textContent?.trim()}»`, r: sello.getBoundingClientRect() });
    for (const f of sheet?.querySelectorAll('.meta span') ?? []) if (visible(f)) piezas.push({ n: `ficha «${f.textContent?.trim()}»`, r: f.getBoundingClientRect() });
    const h1 = sheet?.querySelector('h1');
    if (h1 && visible(h1)) {
      // la caja de un renglón (Range) mide el alto entero de la fuente, más que el interlineado corto
      // del título: se recorta a la tinta de verdad (ascendente y descendente medidas del texto)
      const cs = getComputedStyle(h1);
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText((h1.textContent ?? '').toUpperCase());
      const range = document.createRange();
      range.selectNodeContents(h1);
      [...range.getClientRects()]
        .filter((r) => r.width > 2 && r.height > 2)
        .forEach((r, i) => {
          const base = r.top + (r.height - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
          piezas.push({ n: `título (renglón ${i + 1})`, r: new DOMRect(r.left, base - m.actualBoundingBoxAscent, r.width, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) });
        });
    }
    for (let i = 0; i < piezas.length; i++)
      for (let j = i + 1; j < piezas.length; j++) {
        const a = piezas[i].r;
        const b = piezas[j].r;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 4 && h > 4) fail('cabecera', `en la crónica se pisan ${piezas[i].n} y ${piezas[j].n} (${Math.round(w)}×${Math.round(h)} px)`, sheet);
      }
  }

  // ── V10 P0-5 · acta-pie: la salida de la Crónica a la vista al llegar ──
  // En acta, acta-derrota, acta-victoria y acta-feedback, fuera del móvil: con la hoja sin desplazar, cada
  // botón de .acta-acciones se ve entero (ni el desplazamiento ni la ventana lo cortan), fuera de la franja
  // de tinta desvanecida (mask-image de [data-mas~=abajo]) y lo que hay en su centro es el botón.
  if (!opts.mobile && ['acta', 'acta-derrota', 'acta-victoria', 'acta-feedback'].includes(opts.state)) {
    const sheet = document.querySelector<HTMLElement>('.acta-sheet');
    const prev = sheet?.scrollTop ?? 0;
    if (sheet) sheet.scrollTop = 0;
    const btns = [...document.querySelectorAll<HTMLElement>('.acta-acciones button')].filter(visible);
    if (!btns.length) fail('acta-pie', 'la Crónica no enseña sus botones de salida', sheet);
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const v = shown(b);
      const txt = b.textContent?.trim();
      if (v.height < r.height - 1 || v.width < r.width - 1) fail('acta-pie', `«${txt}» se ve ${Math.round(v.height)} de ${Math.round(r.height)} px con la hoja sin desplazar`, b);
      else if (r.top < -1 || r.left < -1 || r.bottom > H + 1 || r.right > W + 1) fail('acta-pie', `«${txt}» se sale de la ventana`, b);
      else {
        for (let p = b.parentElement; p; p = p.parentElement) {
          if (!/abajo/.test(p.dataset.mas ?? '')) continue;
          const cs = getComputedStyle(p);
          if ((cs.maskImage || cs.webkitMaskImage || 'none') === 'none') continue;
          const pr = p.getBoundingClientRect();
          const banda = Math.min(38, pr.height * 0.22);
          if (r.bottom > pr.bottom - banda + 1) fail('acta-pie', `«${txt}» cae ${Math.round(r.bottom - (pr.bottom - banda))} px dentro de la tinta desvanecida`, b);
        }
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!hit || !(hit === b || b.contains(hit))) fail('acta-pie', `en el centro de «${txt}» hay otra cosa (${hit ? hit.tagName.toLowerCase() + (hit.className ? '.' + String(hit.className).split(' ')[0] : '') : 'nada'})`, b);
      }
    }
    if (sheet) sheet.scrollTop = prev;
  }

  // ── notas de maquetación de la 5.0 ──
  // preparación en 1366×768: el campo de la semilla, entero a la vista sin desplazar el panel
  if (opts.state === 'preparacion' && W === 1366 && H === 768) {
    const seed = document.getElementById('seed');
    if (!seed || !visible(seed)) fail('maqueta', 'no se ve el campo de la semilla (#seed)', seed);
    else {
      const r = seed.getBoundingClientRect();
      let hidden = r.top < 0 || r.left < 0 || r.bottom > H || r.right > W;
      for (let p = seed.parentElement; p && !hidden; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (!/(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX)) continue;
        const pr = p.getBoundingClientRect();
        if (r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5 || r.left < pr.left - 0.5 || r.right > pr.right + 0.5) hidden = true;
      }
      if (hidden) fail('maqueta', `la semilla (#seed) no está entera a la vista sin desplazar (${Math.round(r.top)}…${Math.round(r.bottom)} de ${H})`, seed);
    }
  }
  // móvil: el aviso de último turno, compacto (≤ 28 px) o sin quitar altura a los tronos respecto a la mesa
  const towersBox = document.querySelector('.towers')?.getBoundingClientRect();
  const memo = window as unknown as { __qaTowersH?: number };
  if (opts.state === 'mesa' && towersBox) memo.__qaTowersH = towersBox.height;
  if (opts.state === 'mesa-peligro' && opts.mobile) {
    const o = document.getElementById('omen');
    const r = o && visible(o) ? o.getBoundingClientRect() : null;
    const before = memo.__qaTowersH;
    const shrunk = before !== undefined && towersBox ? before - towersBox.height : 0;
    if (r && r.height > 28.5 && shrunk > 1) fail('maqueta', `el aviso de último turno mide ${Math.round(r.height)} px de alto (máximo 28) y quita ${Math.round(shrunk)} px a los tronos`, o);
  }

  // texto que se sale de su propia caja sin que nada lo recorte (y pisa lo de al lado): botones y las
  // fichas de oferta. Se mide el texto con un Range, no scrollWidth, para no contar insignias absolutas.
  for (const el of document.querySelectorAll('button, .choice h4, .choice p')) {
    if (!visible(el)) continue;
    const box = el.getBoundingClientRect();
    for (const node of el.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const t = range.getBoundingClientRect();
      // a lo ancho, 2 px; a lo alto se perdona el remonte de los rasgos de la romana sobre un interlineado
      // corto (≈ 0,1 em) y se cuenta como pisado un renglón que se sale (≥ 0,4 em)
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      const wide = Math.max(box.left - t.left, t.right - box.right);
      const tall = Math.max(box.top - t.top, t.bottom - box.bottom);
      const over = wide > 2 ? wide : tall > fs * 0.4 ? tall : 0;
      if (over) {
        fail('maqueta', `el texto «${node.textContent.trim().slice(0, 30)}» se sale ${Math.round(over)} px de ${path(el)} y pisa lo de al lado`, el);
        break;
      }
    }
  }

  // ── jerga: ninguna palabra de la obra vieja en lo que lee una persona (normas V6, red 2) ──
  // sin distinguir mayúsculas ni tildes; las raíces cogen sus derivadas, las palabras corrientes van enteras
  const ROOTS = ['derrumbe', 'bunker', 'escombrera', 'cantera', 'ferreteri', 'ferretero', 'andamio', 'hormigon', 'ladrillo', 'vidrio', 'sirena', 'demoli', 'demoler', 'capataz', 'gremio', 'sindical', 'cimiento', 'tiza', 'forja', 'quemador', 'integridad', 'resonancia', 'fractura', 'apuntalad', 'huelga', 'herramienta', 'cinturon', 'regicid'];
  // desde la 6.1, también el título viejo y el nombre viejo de la tienda (hoy La Taberna)
  const WORDS = ['acero', 'obras?', 'pisos?', 'torres?', 'muros?', 'fuerza', 'golpes? limpios?', 'corona rota', 'mercado clandestino'];
  const JERGA = new RegExp(`(?<![\\p{L}\\p{N}])(?:(?:${ROOTS.join('|')})\\p{L}*|(?:${WORDS.join('|')})(?![\\p{L}\\p{N}]))`, 'iu');
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');
  const jerga = (where: string, text: string | null | undefined, el: Element | null) => {
    if (!text) return;
    const plain = fold(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    const m = plain.match(JERGA);
    if (!m) return;
    const at = Math.max(0, (m.index ?? 0) - 24);
    fail('jerga', `«${m[0]}» en ${where}: …${plain.slice(at, (m.index ?? 0) + m[0].length + 24)}…`, el);
  };
  jerga('el título de la página', document.title, null);
  const jw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = jw.nextNode(); node; node = jw.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent?.trim() || el.closest('script, style, template')) continue;
    if (!visible(el)) continue;
    jerga(`el texto de ${path(el)}`, node.textContent, el);
  }
  for (const el of document.querySelectorAll('[data-tip], [aria-label], [title], [placeholder], [alt]')) {
    for (const attr of ['data-tip', 'aria-label', 'title', 'placeholder', 'alt']) if (el.hasAttribute(attr)) jerga(`${attr} de ${path(el)}`, el.getAttribute(attr), el);
  }
  // también el texto que pone el CSS (content de ::before y ::after), que el recorrido del DOM no ve
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    for (const pseudo of ['::before', '::after']) {
      const c = getComputedStyle(el, pseudo).content;
      if (c && c !== 'none' && c !== 'normal' && /^["'].*\p{L}/u.test(c)) jerga(`el ${pseudo} de ${path(el)}`, c.slice(1, -1), el);
    }
  }
  // ── esquirlas (V12): la moneda permanente se llama Esquirlas y la pantalla de progreso es el Árbol: ni «Coronas»
  // ni «La Orden» en lo que se lee (salvo el aviso de la migración, que dice de dónde vienen) ──
  const VIEJA = /(?<![\p{L}])(?:Coronas|Crowns|[Ll]a Orden|[Tt]he Order|de la Orden|Order upgrades)(?![\p{L}])/u;
  const vieja = (where: string, text: string | null | undefined, el: Element | null) => {
    if (!text || el?.closest('.arbol-aviso')) return;
    const m = text.replace(/<[^>]+>/g, ' ').match(VIEJA);
    if (m) fail('esquirlas', `«${m[0]}» en ${where} (desde la V12: esquirlas y el Árbol de la Conjura)`, el);
  };
  const vw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = vw.nextNode(); node; node = vw.nextNode()) {
    const el = node.parentElement;
    if (!el || !node.textContent?.trim() || el.closest('script, style, template') || !visible(el)) continue;
    vieja(`el texto de ${path(el)}`, node.textContent, el);
  }
  for (const el of document.querySelectorAll('[data-tip], [aria-label], [title]')) for (const attr of ['data-tip', 'aria-label', 'title']) if (el.hasAttribute(attr)) vieja(`${attr} de ${path(el)}`, el.getAttribute(attr), el);

  // ── fuga (V10, pasada inglesa): ningún resto de español en lo que lee una persona ──
  if (opts.fuga) {
    const fz = opts.fuga;
    const re = new RegExp(fz.re, 'giu');
    // lo de dentro de un lang="es", el interruptor y las teclas (<kbd>: «Y» es un botón, no la conjunción)
    const exento = (el: Element | null) => !!el && (el.closest('[lang]')?.getAttribute('lang') === 'es' || !!el.closest('.lang-switch, kbd'));
    const pendiente = (el: Element | null) => !!el && fz.pendiente.some((s) => el.closest(s));
    const avisos = new Set<string>();
    const fuga = (where: string, text: string | null | undefined, el: Element | null) => {
      if (!text || exento(el)) return;
      let limpio = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      for (const p of fz.permitidos) limpio = limpio.split(p).join(' ');
      const restos = [...limpio.matchAll(re)].map((m) => m[0]);
      if (!restos.length) return;
      const msg = `«${restos.slice(0, 3).join('», «')}» en ${where}: «${limpio.trim().slice(0, 60)}»`;
      if (pendiente(el)) {
        if (!avisos.has(msg)) {
          avisos.add(msg);
          out.push({ regla: 'fuga', msg: `${msg} (pendiente de juice-ux)`, ajeno: false, aviso: true });
        }
      } else fail('fuga', msg, el);
    };
    fuga('el título de la página', document.title, null);
    const fw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = fw.nextNode(); node; node = fw.nextNode()) {
      const el = node.parentElement;
      if (!el || !node.textContent?.trim() || el.closest('script, style, template') || !visible(el)) continue;
      fuga(`el texto de ${path(el)}`, node.textContent, el);
    }
    for (const el of document.querySelectorAll('[data-tip], [aria-label], [title], [placeholder], [alt]')) {
      for (const attr of ['data-tip', 'aria-label', 'title', 'placeholder', 'alt']) if (el.hasAttribute(attr)) fuga(`${attr} de ${path(el)}`, el.getAttribute(attr), el);
    }
    for (const el of document.body.querySelectorAll('*')) {
      if (!visible(el)) continue;
      for (const pseudo of ['::before', '::after']) {
        const c = getComputedStyle(el, pseudo).content;
        if (c && c !== 'none' && c !== 'normal' && /^["'].*\p{L}/u.test(c)) fuga(`el ${pseudo} de ${path(el)}`, c.slice(1, -1), el);
      }
    }
  }

  // ── contraste-alto (V10): Alto contraste no mueve la maqueta: las cajas de la mesa, ±1 px ──
  if (opts.state === 'mesa-contraste') {
    const html = document.documentElement;
    if (!html.classList.contains('contraste')) fail('contraste-alto', 'la mesa no lleva la clase contraste');
    const BLOQUES = ['#table', '#towers', '.tower', '#hand', '#hand > .card', '#score', '.actions', '.actions button', '.hud', '.belt', '.belt-slot', '.pile', '.log'];
    const cajas = () => BLOQUES.flatMap((s) => [...document.querySelectorAll(s)].filter(visible).map((el, i) => ({ k: `${s}#${i}`, r: el.getBoundingClientRect() })));
    const con = cajas();
    html.classList.remove('contraste');
    const sin = new Map(cajas().map((b) => [b.k, b.r]));
    html.classList.add('contraste');
    if (!con.length) fail('contraste-alto', 'no hay bloques de la mesa que medir');
    for (const b of con) {
      const r = sin.get(b.k);
      if (!r) {
        fail('contraste-alto', `${b.k} solo existe con Alto contraste`);
        continue;
      }
      const d = Math.max(Math.abs(b.r.left - r.left), Math.abs(b.r.top - r.top), Math.abs(b.r.width - r.width), Math.abs(b.r.height - r.height));
      if (d > 1) fail('contraste-alto', `${b.k} se mueve ${d.toFixed(1)} px con Alto contraste`);
    }
  }

  // ── idioma (V10): el interruptor ES | EN de la portada ──
  if (opts.state === 'portada-idioma') {
    const sw = document.querySelector('#home-lang');
    const lock = document.querySelector('.home-left .tagline') ?? document.querySelector('.home-left .title');
    if (!sw || !visible(sw)) fail('idioma', 'no se ve el interruptor ES | EN en la portada');
    else {
      const opts2 = [...sw.querySelectorAll<HTMLElement>('[data-lang]')];
      const labels = opts2.map((b) => b.textContent?.trim());
      if (labels.join('|') !== 'ES|EN') fail('idioma', `el interruptor enseña «${labels.join(' | ')}» en vez de «ES | EN»`, sw);
      if (opts2.filter((b) => b.getAttribute('aria-pressed') === 'true').length !== 1) fail('idioma', 'el idioma activo no va marcado (aria-pressed) o hay dos', sw);
      for (const b of opts2) {
        const r = b.getBoundingClientRect();
        if (r.width < 43.5 || r.height < 43.5) fail('idioma', `la diana ${b.textContent?.trim()} mide ${Math.round(r.width)}×${Math.round(r.height)} px`, b);
      }
      if (opts2.length === 2) {
        const [a, b] = opts2.map((o) => o.getBoundingClientRect());
        const gap = Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom);
        if (gap < 7.5) fail('idioma', `solo ${Math.round(gap)} px entre ES y EN`, sw);
      }
      if (lock) {
        const a = lock.getBoundingClientRect();
        const b = sw.getBoundingClientRect();
        const dist = Math.max(b.top - a.bottom, a.top - b.bottom, b.left - a.right, a.left - b.right, 0);
        if (dist > 48) fail('idioma', `el interruptor queda a ${Math.round(dist)} px del candado`, sw);
      }
      const f = document.activeElement as HTMLElement | null;
      if (!f || !sw.contains(f)) fail('idioma', 'el foco de teclado no está en el interruptor', sw);
      else {
        const cs = getComputedStyle(f);
        const ring = (parseFloat(cs.outlineWidth) || 0) + (cs.boxShadow !== 'none' ? 3 : 0);
        if (ring < 3) fail('idioma', 'el foco del interruptor no se ve (marco < 3 px)', f);
      }
    }
  }

  // ── V10 · Steam Deck y portátil (SD1–SD4) ──
  const portatil = !opts.mobile && (W === 1366 || W === 1280);
  const pxDe = (el: Element) => parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
  const dentro = (r: DOMRect, c: { left: number; top: number; right: number; bottom: number }) => r.left >= c.left - 1 && r.top >= c.top - 1 && r.right <= c.right + 1 && r.bottom <= c.bottom + 1;
  const VENTANA = { left: 0, top: 0, right: W, bottom: H };

  // acciones (SD3): Golpear la mayor; Descartar con tinta propia; Soltar sin relleno; 48 px de alto y 12 de aire
  if (portatil && ['mesa', 'mesa-mando', 'mesa-cuenta', 'mesa-peligro', 'mesa-monarca'].includes(opts.state)) {
    const bs = [...document.querySelectorAll<HTMLElement>('.actions button')].filter(visible);
    const main = bs.find((b) => b.id === 'btn-strike' || b.id === 'btn-pass');
    const dis = document.getElementById('btn-discard');
    const clr = document.getElementById('btn-clear');
    if (!main || !dis || !clr || !visible(dis) || !visible(clr)) fail('acciones', 'faltan Golpear, Descartar o Soltar en la mesa', document.querySelector('.actions'));
    else {
      const area = (b: Element) => b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      for (const b of bs) if (b !== main && area(b) >= area(main)) fail('acciones', `#${b.id} es tan grande como Golpear`, b);
      for (const b of bs) {
        // en 1366 × 768 SD3 admite 44 px en las secundarias (Golpear siempre 48)
        const h = b.getBoundingClientRect().height;
        const min = W === 1366 && b !== main ? 44 : 48;
        if (h < min - 0.5) fail('acciones', `#${b.id} mide ${Math.round(h)} px de alto (mínimo ${min})`, b);
      }
      const rs = bs.map((b) => ({ id: b.id, r: b.getBoundingClientRect() }));
      for (let i = 0; i < rs.length; i++)
        for (let j = i + 1; j < rs.length; j++) {
          const a = rs[i].r;
          const b = rs[j].r;
          const g = Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom);
          if (g < 11.5) fail('acciones', `#${rs[i].id} y #${rs[j].id} a ${Math.round(g)} px (mínimo 12)`, document.querySelector('.actions'));
        }
      // el marco único pinta el relleno con --bg
      const fondo = (b: Element) => {
        const cs = getComputedStyle(b);
        let c = rgb(cs.backgroundColor);
        if (!c || c.a < 0.1) {
          const v = cs.getPropertyValue('--bg').trim();
          const h = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
          const hx = h && (h.length === 3 ? [...h].map((d) => d + d).join('') : h);
          c = hx ? { r: parseInt(hx.slice(0, 2), 16), g: parseInt(hx.slice(2, 4), 16), b: parseInt(hx.slice(4, 6), 16), a: 1 } : rgb(v);
        }
        return c && c.a >= 0.1 ? c : null;
      };
      const fd = fondo(dis);
      const fc = fondo(clr);
      if (fd && fc && ratio(fd, fc) < 3) fail('acciones', `Descartar y Soltar tienen rellenos parecidos (${ratio(fd, fc).toFixed(1)}:1, mínimo 3:1)`, clr);
      if (!fd) fail('acciones', 'Descartar no tiene tinta propia (relleno transparente)', dis);
    }
  }

  // cuenta (SD4 y V7-1): Daño y Multi ≥ 20 px fuera del móvil; el total a 7:1 sobre su placa
  if (!opts.mobile && ['mesa', 'mesa-cuenta', 'mesa-peligro'].includes(opts.state)) {
    for (const b of [...document.querySelectorAll('#score .calc .fr b')].filter(visible)) {
      const px = pxDe(b);
      if (px < 19.95) fail('cuenta', `la cifra «${b.textContent?.trim()}» de Daño o Multi mide ${px.toFixed(1)} px (mínimo 20)`, b);
    }
    const t = document.querySelector('#score .calc b.t');
    if (t && visible(t)) {
      const bg = rgb(getComputedStyle(t).backgroundColor);
      const fg = rgb(getComputedStyle(t).color);
      if (bg && fg && bg.a >= 0.95 && ratio(fg, bg) < 7) fail('cuenta', `el total va a ${ratio(fg, bg).toFixed(1)}:1 (mínimo 7:1)`, t);
    }
  }

  // insignia (V7-5): ninguna insignia de estado del trono se parte en dos renglones
  if (opts.state.startsWith('mesa')) {
    for (const fx of [...document.querySelectorAll<HTMLElement>('.tower .fx')].filter(visible)) {
      const cs = getComputedStyle(fx);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const inner = fx.getBoundingClientRect().height - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - (parseFloat(cs.borderTopWidth) || 0) - (parseFloat(cs.borderBottomWidth) || 0);
      if (inner > lh * 1.5 * scaleOf(fx)) fail('texto pisado', `la insignia «${fx.textContent?.trim()}» del trono se parte en dos renglones`, fx);
    }
  }

  // forja-entera (SD1): las 40 cartas a la vista, dentro de la ventana y de su caja, sin desplazar
  if (opts.state === 'forja' && !opts.mobile && [1920, 1366, 1280].includes(W)) {
    const box = document.querySelector<HTMLElement>('.deck-box');
    const cs = [...document.querySelectorAll('.deck-box .deck-mini .card')];
    if (!box) fail('forja-entera', 'no se ve la caja de la forja');
    else {
      if (cs.length < 40) fail('forja-entera', `la forja enseña ${cs.length} cartas (se esperaban 40)`, box);
      const cr = box.getBoundingClientRect();
      const fuera = cs.filter((c) => !dentro(c.getBoundingClientRect(), VENTANA) || !dentro(c.getBoundingClientRect(), cr));
      if (fuera.length) fail('forja-entera', `${fuera.length} cartas quedan fuera de la ventana o de su caja`, fuera[0]);
      for (let p: HTMLElement | null = box; p; p = p.parentElement) if (p.scrollTop > 0) fail('forja-entera', `${path(p)} está desplazado ${p.scrollTop} px`, p);
      if (box.scrollHeight > box.clientHeight + 1) fail('forja-entera', `la caja necesita desplazarse (${box.scrollHeight - box.clientHeight} px)`, box);
    }
  }

  // ajustes-entero (SD2): cada fila de Ajustes y su control, dentro de la ventana y sin desplazar
  if ((opts.state === 'ajustes' || opts.state === 'ajustes-prueba') && !opts.mobile && [1920, 1366, 1280].includes(W)) {
    const sets = [...document.querySelectorAll<HTMLElement>('.set')].filter(visible);
    if (!sets.length) fail('ajustes-entero', 'no hay filas de Ajustes');
    for (const s of sets) {
      const els = [s, ...s.querySelectorAll('button, input, select, a, [role=switch]')].filter(visible);
      for (const el of els) if (!dentro(el.getBoundingClientRect(), VENTANA)) fail('ajustes-entero', `${path(el)} queda fuera de la ventana`, el);
    }
    // la tabla de Controles, debajo, puede quedar para desplazar; las filas no: se leen con scrollTop 0
    const root = sets[0]?.closest<HTMLElement>('.modal-box, .settings, .modal') ?? null;
    for (let p: HTMLElement | null = root; p; p = p.parentElement) if (p.scrollTop > 0) fail('ajustes-entero', `${path(p)} está desplazado ${p.scrollTop} px`, p);
    if (root) {
      const cr = root.getBoundingClientRect();
      for (const s of sets) if (!dentro(s.getBoundingClientRect(), cr)) fail('ajustes-entero', `la fila ${path(s)} se sale de la caja de Ajustes`, s);
    }
  }

  // ───────── V12 · bloque A de arte: golpear, rojo, compacto y pólvora ─────────
  {
    const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
    const labOf = (c: { r: number; g: number; b: number }) => {
      const [R, G, B] = [lin(c.r), lin(c.g), lin(c.b)];
      const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
      const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
      const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
      const fl = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
      return [116 * fl(y) - 16, 500 * (fl(x) - fl(y)), 200 * (fl(y) - fl(z))];
    };
    const de2000 = (p: number[], q: number[]) => {
      const [L1, a1, b1] = p;
      const [L2, a2, b2] = q;
      const rad = Math.PI / 180;
      const Cm = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
      const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
      const a1p = (1 + G) * a1;
      const a2p = (1 + G) * a2;
      const C1p = Math.hypot(a1p, b1);
      const C2p = Math.hypot(a2p, b2);
      const hh = (b: number, a: number) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
      const h1 = hh(b1, a1p);
      const h2 = hh(b2, a2p);
      let dh = 0;
      if (C1p * C2p !== 0) dh = Math.abs(h2 - h1) <= 180 ? h2 - h1 : h2 - h1 > 180 ? h2 - h1 - 360 : h2 - h1 + 360;
      const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad);
      const Lm = (L1 + L2) / 2;
      const Cmp = (C1p + C2p) / 2;
      let hm = h1 + h2;
      if (C1p * C2p !== 0) hm = Math.abs(h1 - h2) <= 180 ? (h1 + h2) / 2 : h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2;
      const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
      const dTh = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
      const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
      const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
      const Sc = 1 + 0.045 * Cmp;
      const Sh = 1 + 0.015 * Cmp * T;
      const Rt = -Math.sin(2 * dTh * rad) * Rc;
      return Math.sqrt(((L2 - L1) / Sl) ** 2 + ((C2p - C1p) / Sc) ** 2 + (dH / Sh) ** 2 + Rt * ((C2p - C1p) / Sc) * (dH / Sh));
    };
    const hueOf = (c: { r: number; g: number; b: number }) => {
      const [R, G, B] = [c.r / 255, c.g / 255, c.b / 255];
      const mx = Math.max(R, G, B);
      const d = mx - Math.min(R, G, B);
      if (!d) return 0;
      const h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
      return (h * 60 + 360) % 360;
    };
    const CORAZONES = labOf({ r: 0xc8, g: 0x23, b: 0x2c });
    /** El relleno de un botón: el --bg del marco único o, si no, su fondo. null si es transparente. */
    const relleno = (el: Element) => {
      const cs = getComputedStyle(el);
      let c = rgb(cs.getPropertyValue('--bg'));
      if (!c || c.a < 0.6) c = rgb(cs.backgroundColor);
      return c && c.a >= 0.6 ? c : null;
    };
    // golpear: latón ámbar, lejos del ♥ y con la tinta a 7:1
    if (opts.state.startsWith('mesa')) {
      const g = document.getElementById('btn-strike');
      if (g && visible(g)) {
        const bg = relleno(g);
        const fg = rgb(getComputedStyle(g).color);
        if (!bg) fail('golpear', 'Golpear no lleva placa de color propia', g);
        else {
          const h = hueOf(bg);
          const d = de2000(labOf(bg), CORAZONES);
          if (h < 35 || h > 60) fail('golpear', `Golpear va en tono ${h.toFixed(1)}° (latón ámbar: 35°–60°)`, g);
          if (d < 30) fail('golpear', `Golpear está a ΔE2000 ${d.toFixed(1)} del carmesí de Corazones (mínimo 30)`, g);
          if (!fg || ratio(fg, bg) < 6.995) fail('golpear', `el texto de Golpear va a ${fg ? ratio(fg, bg).toFixed(2) : '?'}:1 sobre su placa (mínimo 7:1)`, g);
        }
      }
    }
    // rojo: ningún botón con el tono de Corazones
    for (const b of document.querySelectorAll<HTMLElement>('button, [role="button"]')) {
      if (!visible(b) || b.closest('.card, svg')) continue;
      const bg = relleno(b);
      if (!bg) continue;
      const d = de2000(labOf(bg), CORAZONES);
      if (d < 20) fail('rojo', `${path(b)} va en el tono de Corazones (ΔE2000 ${d.toFixed(1)} frente a #c8232c; mínimo 20)`, b);
    }
    // compacto: el Trono infinito hondo, con todas sus cifras cortas, enteras en aria-label y del tamaño de siempre
    if (opts.state === 'mesa-cifras') {
      const els = [...document.querySelectorAll<HTMLElement>('[data-cifra]')].filter(visible);
      // en el trono estrecho del móvil (mesa de cuatro) el total de Vida se recoge: allí no se pide
      for (const k of ['oro', 'golpe', 'vida', ...(opts.mobile ? [] : ['vida-total']), 'aviso']) if (!els.some((e) => e.dataset.cifraK === k && Math.abs(Number(e.dataset.cifra)) >= 1000)) fail('compacto', `en mesa-cifras no se ve ninguna cifra «${k}» de 4 cifras o más`);
      for (const e of els) {
        const n = Number(e.dataset.cifra);
        const k = e.dataset.cifraK ?? '?';
        const txt = (e.textContent ?? '').trim();
        // V18 · la cuenta que cuadra: golpe, daño, aviso y pólvora van con todas sus cifras por debajo de 100.000
        const exacta = ['golpe', 'dano', 'aviso', 'polvora'].includes(k) && Math.abs(n) < 100_000;
        if (exacta) {
          if (txt.replace(/\D/g, '') !== String(Math.abs(Math.trunc(n)))) fail('compacto', `la cifra ${n} (${k}) de la cuenta no va entera: «${txt}»`, e);
          if (txt.replace(/^[−-]/, '').length > 6) fail('compacto', `la cifra «${txt}» (${k}) tiene más de 6 caracteres`, e);
        } else if (txt.replace(/^[−-]/, '').length > 5) fail('compacto', `la cifra «${txt}» (${k}) tiene más de 5 caracteres`, e);
        if (!exacta && Math.abs(n) >= 1000) {
          if (!/[KMBT]$/.test(txt)) fail('compacto', `la cifra ${n} (${k}) no va en notación compacta: «${txt}»`, e);
          if ((e.getAttribute('aria-label') ?? '').replace(/\D/g, '') !== String(Math.abs(Math.trunc(n)))) fail('compacto', `la cifra «${txt}» (${k}) no lleva el número entero ${n} en aria-label`, e);
        }
        const px = parseFloat(getComputedStyle(e).fontSize);
        const ref = opts.refCifras?.[k];
        if (ref === undefined) fail('compacto', `la cifra «${k}» no tiene medida de referencia en «mesa»`, e);
        else if (Math.abs(px - ref) > 0.5) fail('compacto', `la cifra «${txt}» (${k}) mide ${px.toFixed(2)} px y en «mesa» ${ref.toFixed(2)} px (± 0,5)`, e);
        const caja = e.closest('.tower, .chip, #score, .bar, .storey')?.getBoundingClientRect();
        const alto = (e.closest('.storey') ? e.closest('.tower') : null)?.getBoundingClientRect() ?? caja;
        const r = e.getBoundingClientRect();
        if (caja && alto && (r.left < caja.left - 1 || r.right > caja.right + 1 || r.top < alto.top - 1 || r.bottom > alto.bottom + 1)) fail('compacto', `la cifra «${txt}» (${k}) se sale de su caja`, e);
        if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) fail('compacto', `la cifra «${txt}» (${k}) se sale de la ventana`, e);
      }
    }
    // pólvora: con 2 tronos, el de al lado del apuntado enseña «+n»; dentro de su trono y sin pisar nada suyo
    if (opts.state === 'mesa-polvora' || [...document.querySelectorAll<HTMLElement>('.tower .preview.polvora')].some(visible)) {
      const aimed = document.querySelector<HTMLElement>('.tower.aimed');
      const pv = [...document.querySelectorAll<HTMLElement>('.tower .preview.polvora')].filter(visible);
      if (!aimed) fail('polvora', 'en mesa-polvora no hay trono apuntado');
      if (!pv.length) fail('polvora', 'en mesa-polvora ningún trono enseña la vista previa «+n» del sello de pólvora');
      for (const p of pv) {
        const t = p.closest<HTMLElement>('.tower')!;
        if (t === aimed) fail('polvora', 'la vista previa de la pólvora va en el trono apuntado y no en el de al lado', p);
        if (!/^\+\d/.test((p.textContent ?? '').trim())) fail('polvora', `la vista previa de la pólvora dice «${p.textContent?.trim()}» (debe empezar por «+n»)`, p);
        const r = p.getBoundingClientRect();
        const tr = t.getBoundingClientRect();
        if (r.left < tr.left - 4 || r.right > tr.right + 4 || r.top < tr.top - 1 || r.bottom > tr.bottom + 1) fail('polvora', 'la vista previa de la pólvora se sale de su trono', p);
        if (p.scrollWidth > p.clientWidth + 1) fail('polvora', `la vista previa de la pólvora no cabe en su placa (${p.scrollWidth} px de texto en ${p.clientWidth} px)`, p);
        for (const o of t.querySelectorAll<HTMLElement>('.preview:not(.polvora), .plates > *, .threat b, .hp, .tower-fx .fx')) {
          if (!visible(o)) continue;
          const q = o.getBoundingClientRect();
          if (Math.min(r.right, q.right) - Math.max(r.left, q.left) > 1 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 1) fail('polvora', `la vista previa de la pólvora pisa ${name(o)}`, p);
        }
      }
      const m = [...document.querySelectorAll<HTMLElement>('#score .marks .m.polvora')].find(visible);
      if (!m && opts.state === 'mesa-polvora') fail('polvora', 'la cuenta no enseña la marca «Pólvora +n»', document.querySelector('#score'));
    }
  }

  // ───────── arbol (V12): el Árbol de la Conjura entero de serie, el detalle en su panel y el zum semántico ─────────
  if (opts.state === 'gremio' || opts.state === 'arbol-zoom' || opts.state === 'arbol-aviso') {
    const vista = document.querySelector<HTMLElement>('.arbol-vista');
    const nodos = [...document.querySelectorAll<HTMLElement>('.arbol .nodo[data-nodo]')];
    const raiz = document.querySelector<HTMLElement>('.arbol .arbol-raiz');
    if (!vista || !raiz) fail('arbol', 'no hay pergamino del Árbol (.arbol-vista) con su raíz');
    else {
      if (vista.getAttribute('data-lienzo') === null) fail('arbol', 'el pergamino no se declara lienzo (data-lienzo)', vista);
      if (getComputedStyle(vista).touchAction !== 'none') fail('arbol', 'el pergamino no captura el dedo (touch-action: none): no se podría arrastrar ni pellizcar', vista);
      if (nodos.length !== 30) fail('arbol', `el Árbol tiene ${nodos.length} nodos (30)`);
      const banderas = [...document.querySelectorAll<HTMLElement>('.arbol .estandarte')];
      if (banderas.length !== 4) fail('arbol', `el Árbol tiene ${banderas.length} estandartes de rama (4)`);
      for (const b of banderas) if (!b.querySelector('b')?.textContent?.trim()) fail('arbol', 'un estandarte no dice el nombre de su rama', b);
      const z = Number(vista.dataset.zum ?? '0');
      const lod = vista.dataset.lod;
      if (opts.state !== 'arbol-zoom' && Math.abs(z - 1) > 0.001) fail('arbol', `el Árbol abre a zum ${z} (de serie, 1: el árbol entero)`);
      if (opts.state === 'arbol-zoom' && (z < 1.2 || lod !== 'tarjeta')) fail('arbol', `en arbol-zoom el zum es ${z} y el nivel «${lod}» (se piden tarjetas completas)`);
      const vr = vista.getBoundingClientRect();
      const dentro = (r: DOMRect) => r.left >= vr.left - 0.5 && r.right <= vr.right + 0.5 && r.top >= vr.top - 0.5 && r.bottom <= vr.bottom + 0.5;
      const ramaDe = new Set<string>();
      const need = opts.mobile ? 48 : 44;
      for (const n of nodos) {
        const id = n.dataset.nodo!;
        ramaDe.add([...n.classList].find((c) => c.startsWith('r-')) ?? '');
        const r = n.getBoundingClientRect();
        const rango = n.querySelector<HTMLElement>('.nodo-rango');
        if (!/^\d+\/\d+$/.test(rango?.textContent?.trim() ?? '')) fail('arbol', `el nodo ${id} no enseña su rango «r/n»`, n);
        if (rango && dentro(r)) {
          const fs = parseFloat(getComputedStyle(rango).fontSize);
          if (fs < (opts.mobile ? 13.95 : 12.95)) fail('arbol', `el rango del nodo ${id} mide ${fs} px (mínimo ${opts.mobile ? 14 : 13})`, rango);
        }
        if (!n.querySelector('.nodo-sello svg')) fail('arbol', `el nodo ${id} no lleva su emblema`, n);
        if (n.matches('.es-padre') && !n.querySelector('.candado')) fail('arbol', `el nodo ${id} espera a su anterior y no lleva candado`, n);
        if (n.matches('.es-saldo, .es-padre, .es-tope') !== n.hasAttribute('aria-disabled')) fail('arbol', `el nodo ${id} no marca aria-disabled como su estado`, n);
        const nombre = n.querySelector('.nodo-nombre')?.textContent?.trim() ?? '#';
        if (!(n.getAttribute('aria-label') ?? '').includes(nombre)) fail('arbol', `el nodo ${id} no lleva su nombre en aria-label`, n);
        if (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1) fail('arbol', `el contenido del nodo ${id} no cabe en él (${n.scrollWidth}×${n.scrollHeight} en ${n.clientWidth}×${n.clientHeight}, nivel ${lod})`, n);
        if (Math.min(r.width, r.height) < need - 0.5) fail('arbol', `el nodo ${id} mide ${Math.round(r.width)}×${Math.round(r.height)} px (diana mínima ${need})`, n);
        if (lod === 'tarjeta' && dentro(r)) {
          if (!n.querySelector('.nodo-efecto')?.textContent?.trim() || !visible(n.querySelector('.nodo-efecto')!)) fail('arbol', `la tarjeta del nodo ${id} no enseña su efecto`, n);
          if (!n.querySelector('.nodo-coste')?.textContent?.trim()) fail('arbol', `la tarjeta del nodo ${id} no enseña su coste`, n);
          if (n.matches('.es-saldo, .es-padre') && !n.querySelector('.nodo-motivo')?.textContent?.trim()) fail('arbol', `la tarjeta del nodo ${id} no dice por qué no se puede comprar`, n);
        }
      }
      if (ramaDe.size !== 4) fail('arbol', `los nodos son de ${ramaDe.size} ramas (4)`);
      // de serie, el árbol ENTERO: los 30 nodos, la raíz y los estandartes dentro del pergamino, sin montarse (8 px)
      const cajas = [...nodos, raiz, ...banderas].map((e) => ({ e, r: e.getBoundingClientRect() }));
      if (opts.state === 'gremio') {
        for (const { e, r } of cajas) if (!dentro(r)) fail('arbol', `de serie, ${e.dataset.nodo ?? e.className} no cabe en el pergamino (hay que arrastrar para verlo)`, e);
      }
      for (let i = 0; i < cajas.length; i++) {
        for (let j = i + 1; j < cajas.length; j++) {
          const a = cajas[i].r;
          const b = cajas[j].r;
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left) + 8;
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) + 8;
          if (w > 0 && h > 0) fail('arbol', `se montan (o quedan a menos de 8 px) ${cajas[i].e.dataset.nodo ?? cajas[i].e.className} y ${cajas[j].e.dataset.nodo ?? cajas[j].e.className}`, cajas[i].e);
        }
      }
      // la raíz enseña el saldo (en la vista general, en el panel si se elige la raíz)
      const saldo = document.querySelector<HTMLElement>('.arbol-raiz [data-cifra-k="esquirlas"]');
      if (!saldo) fail('arbol', 'la raíz no lleva el saldo de esquirlas');
      else if (Number(saldo.dataset.cifra) >= 1000 && !/[KMBT]$/.test((saldo.textContent ?? '').trim())) fail('arbol', `el saldo de la raíz no va en notación compacta: «${saldo.textContent}»`, saldo);
      // el panel de detalle: un nodo con su nombre, rango, efecto, coste y «Comprar»
      const det = document.querySelector<HTMLElement>('.arbol-detalle');
      if (!det || !visible(det)) fail('arbol', 'no hay panel de detalle del nodo elegido (.arbol-detalle)');
      else {
        const dr = det.getBoundingClientRect();
        if (dr.left < -0.5 || dr.right > innerWidth + 0.5 || dr.bottom > innerHeight + 0.5) fail('arbol', 'el panel de detalle se sale de la ventana', det);
        for (const [sel, que] of [['.det-nombre', 'el nombre'], ['.det-rango', 'el rango'], ['.det-efecto', 'el efecto'], ['.det-coste', 'el coste']] as const) {
          const e = det.querySelector<HTMLElement>(sel);
          if (!e?.textContent?.trim()) fail('arbol', `el panel de detalle no enseña ${que}`, det);
        }
        const btn = det.querySelector<HTMLElement>('#arbol-comprar');
        if (!btn || !visible(btn)) fail('arbol', 'el panel de detalle no tiene el botón «Comprar»', det);
        else {
          const br = btn.getBoundingClientRect();
          if (br.height < need - 0.5 || br.width < 44) fail('arbol', `«Comprar» mide ${Math.round(br.width)}×${Math.round(br.height)} px (mínimo 44, 48 en móvil)`, btn);
          if (btn.hasAttribute('aria-disabled') && !det.querySelector('.det-motivo')?.textContent?.trim()) fail('arbol', 'no se puede comprar y el panel no dice por qué', det);
        }
        const cur = document.querySelector<HTMLElement>('.arbol [aria-current="true"]');
        if (!cur) fail('arbol', 'ningún sello sale elegido (aria-current)');
        if (opts.state === 'gremio' && cur && !cur.matches('.es-comprable')) fail('arbol', 'de entrada no viene elegido un rango comprable', cur);
      }
      if (opts.mobile && opts.state === 'gremio') {
        const alto = vr.height + (det?.getBoundingClientRect().height ?? 0);
        if (alto < innerHeight * 0.65 - 0.5) fail('arbol', `en el móvil el pergamino y el detalle ocupan ${Math.round(alto)} px (${Math.round((alto / innerHeight) * 100)} %; mínimo 65 %)`);
      }
      if (opts.state === 'arbol-zoom') {
        const f = document.activeElement as HTMLElement | null;
        if (!f?.matches('.nodo[data-nodo]')) fail('arbol', 'en arbol-zoom el foco no está en un nodo');
        else {
          if (!dentro(f.getBoundingClientRect())) fail('arbol', `el nodo enfocado (${f.dataset.nodo}) no se ve entero`, f);
          const o = getComputedStyle(f);
          if (o.outlineStyle === 'none' || parseFloat(o.outlineWidth) < 3) fail('arbol', `el foco del nodo ${f.dataset.nodo} no lleva marco de 3 px`, f);
        }
      }
      if (opts.state === 'arbol-aviso') {
        const a = document.querySelector<HTMLElement>('.arbol-aviso');
        if (!a || !visible(a)) fail('arbol', 'en arbol-aviso no se ve el aviso de la migración');
        else if (!/37/.test(a.textContent ?? '') || !/3[.,]7K/.test(a.textContent ?? '')) fail('arbol', `el aviso no dice las Coronas y las esquirlas: «${(a.textContent ?? '').trim().slice(0, 80)}»`, a);
      }
    }
  }

  // ───────── caida (V12): la bolsa en la barra y lo que cae, quieto, sin tapar nada que se lea ─────────
  const corta = (a: DOMRect, b: DOMRect) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  if (document.querySelector('.table-screen.is-run')) {
    const bolsa = document.querySelector<HTMLElement>('#bolsa');
    if (!bolsa || !visible(bolsa)) fail('caida', 'la mesa de campaña no enseña la bolsa (#bolsa)');
    else {
      if (!bolsa.closest('.bar')) fail('caida', 'la bolsa no está en la barra de arriba', bolsa);
      if (document.querySelectorAll('.chip.gold, #gold-n').length) fail('caida', 'el oro sale dos veces: queda el indicador viejo de la barra además de la bolsa');
      for (const id of ['bolsa-oro', 'bolsa-esquirlas', 'bolsa-gotas']) {
        const b = document.getElementById(id);
        if (!b || !visible(b)) {
          fail('caida', `la bolsa no enseña #${id}`, bolsa);
          continue;
        }
        const fs = parseFloat(getComputedStyle(b).fontSize);
        if (fs < 13.95) fail('caida', `la cifra #${id} de la bolsa mide ${fs.toFixed(1)} px (mínimo 14)`, b);
        const n = Number(b.dataset.cifra);
        if (n >= 1000 && !/[KMBT]$/.test((b.textContent ?? '').trim())) fail('caida', `#${id} no va en notación compacta: «${b.textContent}»`, b);
        // cada contador lleva su forma (moneda, esquirla, gota): el color nunca va solo
        if (!b.parentElement?.querySelector('svg')) fail('caida', `#${id} no lleva el grabado de su pieza`, b);
      }
    }
  }
  if (opts.state === 'mesa-caida') {
    const capa = document.getElementById('caida');
    const todas = [...document.querySelectorAll<HTMLElement>('#caida > .caida-pieza')];
    if (!capa) fail('caida', 'no hay capa #caida');
    else {
      if (todas.length !== 40) fail('caida', `el depósito de piezas tiene ${todas.length} (40)`);
      if (getComputedStyle(capa).pointerEvents !== 'none') fail('caida', 'la capa #caida atrapa el puntero', capa);
    }
    const quietas = todas.filter((p) => !p.hidden);
    if (quietas.length < 4) fail('caida', `solo se ven ${quietas.length} piezas en la mesa (mínimo 4)`);
    const tipos = new Set(quietas.map((p) => p.dataset.tipo));
    if (tipos.size < 2) fail('caida', 'las piezas de la mesa son de un solo tipo');
    const nada = '.hand .card, .reserve, #score, #btn-strike, #btn-mejor, .actions button, #bolsa, .tower .preview, .tower .plates > *, .tower .threat, .tower .hp, .tower .storey, .tower .tower-tag';
    const malas = [...document.querySelectorAll<HTMLElement>(nada)].filter(visible);
    for (const p of quietas) {
      const r = p.getBoundingClientRect();
      if (r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight) fail('caida', 'una pieza se sale de la ventana', p);
      const m = malas.find((e) => corta(r, e.getBoundingClientRect()));
      if (m) fail('caida', `una ${p.dataset.tipo} tapa ${m.id ? '#' + m.id : m.className}`, p);
    }
  }

  // ───────── ritual (V12): la tirada de huesos sobre el Botín; la cara que sale y el total, grandes ─────────
  if (opts.state === 'ritual' || opts.state === 'ritual-dos') {
    const capa = document.querySelector<HTMLElement>('#ritual');
    if (!capa || !visible(capa)) fail('ritual', 'no se ve la tirada de huesos (#ritual)');
    else {
      if (!document.querySelector('.run')) fail('ritual', 'la tirada no está sobre la pantalla del Botín', capa);
      if (capa.dataset.fase !== 'final') fail('ritual', `la tirada no queda quieta en su fase final («${capa.dataset.fase}»)`, capa);
      const dados = [...capa.querySelectorAll<HTMLElement>('.hueso[data-i]')];
      const quiere = opts.state === 'ritual-dos' ? 3 : 2;
      if (dados.length !== quiere) fail('ritual', `hay ${dados.length} dados (se esperan ${quiere}: el de oro y ${quiere - 1} de la Corona)`, capa);
      const caja = capa.querySelector<HTMLElement>('.ritual-caja')!.getBoundingClientRect();
      for (const d of dados) {
        const cara = d.querySelector<HTMLElement>('.hueso-cara');
        const txt = cara?.textContent?.trim() ?? '';
        if (!/^×\d+$/.test(txt)) fail('ritual', `el dado ${d.dataset.i} no enseña la cara que sale («${txt}»)`, d);
        else {
          const fs = parseFloat(getComputedStyle(cara!).fontSize);
          if (fs < 20) fail('ritual', `la cara «${txt}» mide ${fs} px (mínimo 20)`, cara!);
          // la cara va tallada en la cara de arriba del cubo (dentro del dado, por encima de su canto de delante)
          const cd = cara!.getBoundingClientRect();
          const dd = d.querySelector<HTMLElement>('.hueso-dado')!.getBoundingClientRect();
          if (cd.left < dd.left || cd.right > dd.right || cd.top < dd.top || cd.bottom > dd.top + dd.height * 0.7)
            fail('ritual', `la cara «${txt}» del dado ${d.dataset.i} no cae sobre la cara de arriba del dado`, cara!);
        }
        // debajo, sus seis caras en pequeño, con la que salió marcada (y es la misma que está tallada arriba)
        const caras = [...d.querySelectorAll<HTMLElement>('.hueso-caras .cara')];
        const dichas = (d.querySelector<HTMLElement>('.hueso-caras')?.getAttribute('aria-label') ?? '').split(/\s+/).filter(Boolean);
        if (caras.length !== 6 || dichas.length !== 6)
          fail('ritual', `el dado ${d.dataset.i} enseña ${caras.length} caras (deben verse sus 6)`, d);
        for (const c of caras) {
          const fs = parseFloat(getComputedStyle(c).fontSize);
          if (fs < 13) fail('ritual', `la cara pequeña «${c.textContent}» mide ${fs} px (mínimo 13)`, c);
          if (!visible(c)) fail('ritual', `la cara pequeña «${c.textContent}» del dado ${d.dataset.i} no se ve`, c);
        }
        const sale = caras.filter((c) => c.classList.contains('sale'));
        if (sale.length !== 1) fail('ritual', `el dado ${d.dataset.i} marca ${sale.length} caras como la que salió (debe ser 1)`, d);
        else {
          if (sale[0].textContent?.trim() !== txt) fail('ritual', `la cara marcada «${sale[0].textContent}» no es la tallada «${txt}»`, sale[0]);
          if (sale[0].dataset.k !== d.dataset.sale) fail('ritual', `la cara marcada (${sale[0].dataset.k}) no es la que dice data-sale (${d.dataset.sale})`, sale[0]);
        }
        const r = d.getBoundingClientRect();
        if (r.left < caja.left - 0.5 || r.right > caja.right + 0.5) fail('ritual', `el dado ${d.dataset.i} se sale de la caja de la tirada`, d);
      }
      const total = capa.querySelector<HTMLElement>('#ritual-total');
      const t = total?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      if (!/\d+ × \d+ = \d+.*\d+ × \d+ = \d+/.test(t)) fail('ritual', `la línea del resultado no dice «base × dado = total» de monedas y esquirlas: «${t}»`, total ?? capa);
      else if (parseFloat(getComputedStyle(total!).fontSize) < 20) fail('ritual', 'la línea del resultado mide menos de 20 px', total!);
      if (total && /·/.test(total.textContent ?? '')) fail('ritual', 'la línea del resultado lleva un «·» suelto', total);
      const seguir = capa.querySelector<HTMLElement>('#ritual-seguir');
      if (!seguir || !visible(seguir)) fail('ritual', 'la tirada no tiene botón para seguir', capa);
      else if (seguir.getBoundingClientRect().height < (opts.mobile ? 47.5 : 43.5)) fail('ritual', 'el botón «Seguir» no llega a la diana mínima', seguir);
    }
  }

  // ───────── auto (V12): el conmutador junto a la velocidad, encendido sin depender del color ─────────
  if (opts.state === 'mesa-auto') {
    const a = document.querySelector<HTMLButtonElement>('#btn-auto');
    const v = document.querySelector<HTMLElement>('#btn-speed');
    if (!a || !visible(a)) fail('auto', 'no hay conmutador AUTO (#btn-auto)');
    else if (v) {
      if (a.getAttribute('aria-pressed') !== 'true') fail('auto', 'AUTO encendido no dice aria-pressed="true"', a);
      if (a.parentElement !== v.parentElement) fail('auto', 'AUTO y la velocidad no comparten zona', a);
      const ra = a.getBoundingClientRect();
      const rv = v.getBoundingClientRect();
      const gap = Math.max(ra.left - rv.right, rv.left - ra.right, ra.top - rv.bottom, rv.top - ra.bottom);
      if (gap > 16) fail('auto', `AUTO queda a ${Math.round(gap)} px de la velocidad (máximo 16)`, a);
      if (Math.min(ra.width, ra.height) < 43.5) fail('auto', `AUTO mide ${Math.round(ra.width)}×${Math.round(ra.height)} px (diana mínima 44)`, a);
      if (!/8×/.test(v.textContent ?? '')) fail('auto', `la velocidad no llega a 8×: «${v.textContent?.trim()}»`, v);
      // encendido se ve por la forma (luz maciza y redonda), no solo por el color
      const luz = a.querySelector<HTMLElement>('.luz');
      const cs = luz ? getComputedStyle(luz) : null;
      if (!cs || cs.backgroundColor === 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopLeftRadius) < 2) fail('auto', 'AUTO encendido no cambia de forma (la luz no sale maciza y redonda)', a);
    }
  }

  // ───────── cuadra (V12): la placa del trono apuntado y la cuenta dicen el mismo número ─────────
  // placa = Golpe de la cuenta + lo que la cuenta dice que se suma aparte (Impulso, reliquias: .m.mas)
  {
    const golpe = document.querySelector<HTMLElement>('#score [data-cifra-k="golpe"]');
    const placa = document.querySelector<HTMLElement>('.tower.aimed .preview [data-cifra-k="aviso"]');
    if (golpe && placa && visible(golpe) && visible(placa)) {
      const mas = [...document.querySelectorAll<HTMLElement>('#score .m.mas')].reduce((a, m) => a + Number(m.dataset.extra ?? 0), 0);
      const g = Number(golpe.dataset.cifra);
      const p = Number(placa.dataset.cifra);
      if (g + mas !== p) fail('cuadra', `la placa del trono apuntado dice −${p} y la cuenta ${g}${mas ? ` + ${mas}` : ''}: no cuadran`, placa);
    }
  }

  // ───────── mejor (V12): Mejor jugada secundario junto a Golpear, marcas legibles, nada tapa la mano ─────────
  if (opts.state === 'mesa-mejor') {
    const m = document.querySelector<HTMLElement>('#btn-mejor');
    const g = document.querySelector<HTMLElement>('#btn-strike');
    if (!m || !visible(m) || !g) fail('mejor', 'no hay botón Mejor jugada (#btn-mejor)');
    else {
      if (m.classList.contains('primary')) fail('mejor', 'Mejor jugada se pinta como botón principal (Golpear es el único)', m);
      const rm = m.getBoundingClientRect();
      const rg = g.getBoundingClientRect();
      const need = opts.mobile ? 48 : 44;
      if (Math.min(rm.width, rm.height) < need - 0.5) fail('mejor', `Mejor jugada mide ${Math.round(rm.width)}×${Math.round(rm.height)} px (diana mínima ${need})`, m);
      const gap = Math.max(rm.left - rg.right, rg.left - rm.right, rm.top - rg.bottom, rg.top - rm.bottom);
      if (gap > 16) fail('mejor', `Mejor jugada queda a ${Math.round(gap)} px de Golpear (máximo 16)`, m);
      for (const c of document.querySelectorAll<HTMLElement>('.hand .card, .reserve .card')) if (visible(c) && corta(rm, c.getBoundingClientRect())) fail('mejor', 'Mejor jugada tapa una carta de la mano', m);
      if (!m.getAttribute('aria-label')) fail('mejor', 'Mejor jugada no lleva aria-label', m);
    }
    const marcadas = [...document.querySelectorAll<HTMLElement>('.hand .card.mejor, .reserve .card.mejor')];
    if (!marcadas.length) fail('mejor', 'no hay cartas marcadas con la Mejor jugada (.mejor)');
    if (!document.querySelector('.tower.mejor')) fail('mejor', 'el trono de la Mejor jugada no va marcado (.tower.mejor)');
    const ins = [...document.querySelectorAll<HTMLElement>('.card .insignia-exacta')].filter(visible);
    if (!ins.length) fail('mejor', 'ninguna carta lleva la corona del Golpe exacto (.corona-exacta)');
    for (const i of ins) {
      const r = i.getBoundingClientRect();
      if (Math.min(r.width, r.height) < 14) fail('mejor', `la corona del Golpe exacto mide ${Math.round(r.width)} px (mínimo 14)`, i);
      const idx = i.closest('.card')?.querySelector<HTMLElement>('.corner');
      if (idx && corta(r, idx.getBoundingClientRect())) fail('mejor', 'la corona del Golpe exacto tapa el índice de la carta', i);
    }
  }

  return out;
}

/**
 * V12 · reglas «inmune» y «vida» medidas en la captura (la técnica de «cara-limpia»): el marco de 4 px alrededor de
 * cada placa «Inmune ♠» es tinta maciza (≥ 95 % de sus píxeles a ΔE ≤ 6 de la tinta de la placa o de su texto) y el
 * relleno de cada barra de Vida es liso (≥ 90 % a ΔE ≤ 6 de su color medio, sin la placa de la cifra).
 */
async function placasPx(png: string): Promise<{ fails: Fail[]; inmune: number; inmuneMarco: number; inmuneTinta: number; vida: number; nI: number; nV: number }> {
  const img = new Image();
  img.src = `data:image/png;base64,${png}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  const lab = (r: number, g: number, b: number) => {
    const [R, G, B] = [lin(r), lin(g), lin(b)];
    const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
    const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
    const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const dE = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  const col = (c: string) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    const p = m ? m[1].split(/[,\s/]+/).filter(Boolean).map(Number) : [0, 0, 0];
    return lab(p[0], p[1], p[2]);
  };
  const rect = (r: DOMRect, m = 0) => ({ x0: Math.max(0, Math.floor(r.left - m)), y0: Math.max(0, Math.floor(r.top - m)), x1: Math.min(canvas.width, Math.ceil(r.right + m)), y1: Math.min(canvas.height, Math.ceil(r.bottom + m)) });
  const fails: Fail[] = [];
  let inmune = 1;
  let inmuneMarco = 1;
  let inmuneTinta = 1;
  let vida = 1;
  let nI = 0;
  let nV = 0;
  const vis = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight;
  };
  for (const p of document.querySelectorAll<HTMLElement>('.tower .plates .plate.iron')) {
    if (!vis(p)) continue;
    const ink = col(getComputedStyle(p).backgroundColor);
    const txt = col(getComputedStyle(p.querySelector('b') ?? p).color);
    const pr = p.getBoundingClientRect();
    // solo los píxeles enteros del marco: el borde de fuera, a medio píxel, no cuenta
    const x0 = Math.max(0, Math.ceil(pr.left - 4));
    const y0 = Math.max(0, Math.ceil(pr.top - 4));
    const x1 = Math.min(canvas.width, Math.floor(pr.right + 4));
    const y1 = Math.min(canvas.height, Math.floor(pr.bottom + 4));
    const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    // el marco de 4 px que rodea la placa (lo que la separa del grabado y del rótulo) y, dentro, la placa: tinta
    // de fondo con su texto (el borde suavizado de las letras no es ni lo uno ni lo otro: se informa, no se pide)
    let ok = 0;
    let anillo = 0;
    let okAnillo = 0;
    let dentro = 0;
    let okTinta = 0;
    for (let i = 0; i < d.length; i += 4) {
      const c = lab(d[i], d[i + 1], d[i + 2]);
      const enTinta = dE(c, ink) <= 6;
      const bien = enTinta || dE(c, txt) <= 6;
      if (bien) ok++;
      const x = x0 + ((i / 4) % (x1 - x0)) + 0.5;
      const y = y0 + Math.floor(i / 4 / (x1 - x0)) + 0.5;
      if (x < pr.left || x > pr.right || y < pr.top || y > pr.bottom) {
        anillo++;
        if (bien) okAnillo++;
      } else {
        dentro++;
        if (enTinta) okTinta++;
      }
    }
    const frac = ok / (d.length / 4);
    const fracAnillo = anillo ? okAnillo / anillo : 1;
    const fracTinta = dentro ? okTinta / dentro : 0;
    nI++;
    inmune = Math.min(inmune, fracAnillo);
    inmuneMarco = Math.min(inmuneMarco, frac);
    inmuneTinta = Math.min(inmuneTinta, fracTinta);
    const suit = p.closest<HTMLElement>('.tower')?.dataset.suit;
    if (fracAnillo < 0.95) fails.push({ regla: 'inmune', msg: `el marco de 4 px de la placa Inmune del trono ${suit} es tinta o texto en un ${(fracAnillo * 100).toFixed(1)} % (mínimo 95 %): la placa toca el grabado o el rótulo`, ajeno: false });
    if (fracTinta < 0.5) fails.push({ regla: 'inmune', msg: `la placa Inmune del trono ${suit} no es de tinta maciza: solo un ${(fracTinta * 100).toFixed(1)} % de su fondo es la tinta (mínimo 50 %)`, ajeno: false });
  }
  for (const hp of document.querySelectorAll<HTMLElement>('.tower .hp')) {
    const fill = hp.querySelector<HTMLElement>('.hp-fill');
    if (!fill || !vis(hp) || !vis(fill)) continue;
    const fr = fill.getBoundingClientRect();
    const hr = hp.getBoundingClientRect();
    const bw = parseFloat(getComputedStyle(hp).borderTopWidth) || 0;
    // el relleno visible: dentro del borde de la barra, 1 px más adentro por el suavizado del filo
    const box = { left: Math.max(fr.left, hr.left + bw) + 1, top: Math.max(fr.top, hr.top + bw) + 1, right: Math.min(fr.right, hr.right - bw) - 1, bottom: Math.min(fr.bottom, hr.bottom - bw) - 1 } as DOMRect;
    if (box.right - box.left < 6 || box.bottom - box.top < 4) continue;
    const { x0, y0, x1, y1 } = rect(box);
    const plate = hp.querySelector('span')?.getBoundingClientRect();
    const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    const px: number[][] = [];
    for (let i = 0; i < d.length; i += 4) {
      const x = x0 + ((i / 4) % (x1 - x0));
      const y = y0 + Math.floor(i / 4 / (x1 - x0));
      if (plate && x >= plate.left - 2 && x <= plate.right + 2 && y >= plate.top - 2 && y <= plate.bottom + 2) continue;
      px.push(lab(d[i], d[i + 1], d[i + 2]));
    }
    if (px.length < 20) continue;
    const mean = [0, 1, 2].map((k) => px.reduce((a, c) => a + c[k], 0) / px.length);
    const frac = px.filter((c) => dE(c, mean) <= 6).length / px.length;
    nV++;
    vida = Math.min(vida, frac);
    const suit = hp.closest<HTMLElement>('.tower')?.dataset.suit;
    if (frac < 0.9) fails.push({ regla: 'vida', msg: `el relleno de la barra de Vida del trono ${suit} es liso en un ${(frac * 100).toFixed(1)} % (mínimo 90 %)`, ajeno: false });
  }
  return { fails, inmune, inmuneMarco, inmuneTinta, vida, nI, nV };
}

/**
 * V11 · regla «cara-limpia»: en cada carta numerada (A a 10, sin acabado) de la hoja de cartas-lamina y de la
 * mano, ≥ 75 % de los píxeles de la cara (dentro del filete de tinta) a ΔE ≤ 6 del marfil #efe6d5. Se mide
 * sobre la captura (lo que de verdad se pinta), con la técnica de lienzo de la regla «trama»: la imagen se
 * dibuja en un canvas de la página y se leen sus píxeles. Devuelve los fallos y el menor porcentaje medido.
 */
async function caraLimpia(png: string): Promise<{ fails: Fail[]; min: number; n: number }> {
  const img = new Image();
  img.src = `data:image/png;base64,${png}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
  const lab = (r: number, g: number, b: number) => {
    const [R, G, B] = [lin(r), lin(g), lin(b)];
    const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
    const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
    const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  // ΔE de 1976 (distancia en Lab): basta para decir «el mismo papel»
  const ivory = lab(0xef, 0xe6, 0xd5);
  const fails: Fail[] = [];
  let min = 1;
  let n = 0;
  const cards = [...document.querySelectorAll<HTMLElement>('.qa-limpias .card, #hand .card:not([data-foco])')].filter((c) => c.matches('.k-number, .k-ace') && ![...c.classList].some((k) => k.startsWith('t-'))); // sin la enfocada con mando (crece y lleva el marco)
  for (const c of cards) {
    const paper = c.querySelector<HTMLElement>('.ly.paper');
    if (!paper) continue;
    const r = paper.getBoundingClientRect();
    if (r.width < 20 || r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
    const bw = parseFloat(getComputedStyle(paper).borderTopWidth) || 0;
    // la carta de la mano va un poco girada: se mide el rectángulo recto inscrito en su cara
    const tf = getComputedStyle(c).transform;
    const m = new DOMMatrixReadOnly(tf === 'none' ? undefined : tf);
    const sin = Math.abs(Math.sin(Math.atan2(m.b, m.a)));
    const [w, h] = [paper.offsetWidth, paper.offsetHeight];
    const iw = w - h * sin - 2 * bw - 2;
    const ih = h - w * sin - 2 * bw - 2;
    const [cx, cy] = [(r.left + r.right) / 2, (r.top + r.bottom) / 2];
    const x0 = Math.ceil(cx - iw / 2);
    const y0 = Math.ceil(cy - ih / 2);
    const x1 = Math.floor(cx + iw / 2);
    const y1 = Math.floor(Math.min(innerHeight, cy + ih / 2));
    if (x1 - x0 < 8 || y1 - y0 < 8) continue;
    // el emblema, macizo y de ancho ≥ 40 % del de la carta (con su contorno de tinta)
    const emb = c.querySelector('svg.ly.art.face')?.querySelector('g.emb-ink')?.getBoundingClientRect();
    if (!emb) fails.push({ regla: 'cara-limpia', msg: `la carta numerada ${c.dataset.id} no lleva el emblema de la cara limpia`, ajeno: false });
    else if (emb.width < 0.4 * w - 0.5) fails.push({ regla: 'cara-limpia', msg: `el emblema de la carta ${c.dataset.id} mide ${emb.width.toFixed(1)} px de ancho (mínimo 40 % de ${w} px)`, ajeno: false });
    const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    // lo que va encima del papel no cuenta: el sello de lacre de las cartas selladas (su círculo, con el
    // margen del filtro rugoso) y la insignia de orden de las elegidas (::after de [data-n])
    const tapas: { l: number; t: number; r: number; b: number }[] = [];
    const sello = c.querySelector('svg.ly.art.seal > g')?.getBoundingClientRect();
    if (sello) tapas.push({ l: sello.left - 2, t: sello.top - 2, r: sello.right + 2, b: sello.bottom + 2 });
    if (c.dataset.n) {
      const a = getComputedStyle(c, '::after');
      const cr = c.getBoundingClientRect();
      const [aw, ah] = [parseFloat(a.width), parseFloat(a.height)];
      if (a.content !== 'none' && aw > 0 && ah > 0) {
        const top = parseFloat(a.top);
        const right = parseFloat(a.right);
        const left = parseFloat(a.left);
        const l = Number.isFinite(right) && a.right !== 'auto' ? cr.right - right - aw : cr.left + (Number.isFinite(left) ? left : 0);
        const t = cr.top + (Number.isFinite(top) ? top : 0);
        tapas.push({ l: l - 2, t: t - 2, r: l + aw + 2, b: t + ah + 2 });
      }
    }
    const fuera = (i: number) => {
      const px = x0 + ((i / 4) % (x1 - x0));
      const py = y0 + Math.floor(i / 4 / (x1 - x0));
      return tapas.some((k) => px >= k.l && px <= k.r && py >= k.t && py <= k.b);
    };
    let ok = 0;
    let total = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (fuera(i)) continue;
      total++;
      const [L, A, B] = lab(d[i], d[i + 1], d[i + 2]);
      if (Math.hypot(L - ivory[0], A - ivory[1], B - ivory[2]) <= 6) ok++;
    }
    const frac = ok / total;
    n++;
    min = Math.min(min, frac);
    const label = `${c.querySelector('.corner.tl b')?.textContent ?? '?'}${[...c.classList].find((k) => /^s-[SHDC]$/.test(k))?.slice(2) ?? ''}`;
    if (frac < 0.75) fails.push({ regla: 'cara-limpia', msg: `la carta ${label} ${c.closest('#hand') ? 'de la mano' : 'de la hoja'} tiene un ${(frac * 100).toFixed(1)} % de marfil (mínimo 75 %)`, ajeno: false });
  }
  if (!n) fails.push({ regla: 'cara-limpia', msg: 'no hay ninguna carta numerada que medir', ajeno: false });
  return { fails, min, n };
}

/** Un trozo de la pasada: una ventana y un tramo contiguo de estados, en el orden de siempre. */
interface Trabajo {
  view: (typeof VIEWS)[number];
  states: string[];
  /**
   * Los estados que van antes del tramo en la pasada de un solo navegador. El juego guarda memoria de una pantalla a
   * otra (logros ganados, kB de datos de prueba, la Orden): para que la captura sea la misma que en fila, la página
   * los recorre primero, sin foto ni auditoría (el «prólogo»).
   */
  previos: string[];
}

/** Lo que deja cada estado (se junta al final en el orden canónico: ventana, estado). */
interface Hecho {
  fails: Fail[];
  warns: string[];
  caras: string[];
  medidas: string[];
  captura: boolean;
}

/**
 * infra/rapido · reparto: cada ventana se parte en tramos contiguos de estados (el orden de siempre dentro del
 * tramo) y los tramos van a una cola de la que tiran HILOS navegadores a la vez. Con un hilo, un tramo por
 * ventana con todos los estados: la pasada de siempre. Con más, tramos de unos QA_TRAMO estados (de serie 10)
 * que NO dependen del número de hilos: dónde empieza un tramo cambia la memoria que trae su prólogo, y así la
 * misma pasada da las mismas capturas con 4, 8 o 12 navegadores.
 */
function reparto(): Trabajo[] {
  if (HILOS <= 1) return VIEWS.map((view) => ({ view, states: STATES, previos: [] }));
  const tam = Math.max(1, Number(process.env.QA_TRAMO || 10));
  const out: Trabajo[] = [];
  for (const view of VIEWS) {
    const n = Math.max(1, Math.round(STATES.length / tam));
    for (let i = 0; i < n; i++) {
      const desde = Math.floor((i * STATES.length) / n);
      const states = STATES.slice(desde, Math.floor(((i + 1) * STATES.length) / n));
      if (states.length) out.push({ view, states, previos: STATES.slice(0, desde) });
    }
  }
  return out;
}

/** Promesa con tope: ningún cierre ni espera de la QA puede colgar la orden. */
const conTope = <T>(p: Promise<T>, ms: number, que: string): Promise<T | undefined> =>
  Promise.race([p, new Promise<undefined>((ok) => setTimeout(() => (console.log(`  ! ${que}: pasó de ${ms / 1000} s, se sigue`), ok(undefined)), ms).unref())]);

const BANDERAS = ['--num-raster-threads=1', '--disable-lcd-text', '--disable-threaded-animation', ...(process.env.QA_BANDERAS?.split(/\s+/).filter(Boolean) ?? [])];
/** Espera (ms) para que el compositor vuelva a tramar las capas a su escala de reposo (QA_REPOSO; de serie 400). */
const REPOSO = Number(process.env.QA_REPOSO || 400);

/** Un tramo: contexto y página nuevos, el juego cargado con su azar y su reloj fijos, y sus estados en orden. */
async function correTramo(browser: Browser, site: { url: string }, t: Trabajo, hechos: Map<string, Hecho>, errors: string[]): Promise<void> {
  const { view } = t;
  const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: 1, locale: LANG === 'en' ? 'en-US' : 'es-ES', hasTouch: !!view.mobile, isMobile: !!view.mobile, reducedMotion: 'no-preference' });
  try {
    // ningún paso de Playwright espera sin tope (infra/rapido): 30 s es diez veces lo que tarda el más lento
    context.setDefaultTimeout(30_000);
    // tsx envuelve las funciones con un ayudante que la página no conoce
    await context.addInitScript({ content: NAME_SHIM });
    // V12 · QA determinista: el azar del cliente sale de una semilla (mulberry32) que qa.ts vuelve a poner al
    // empezar cada estado (__qaSemilla(nombre)); el reloj de pared queda fijo (Date.now, new Date)
    await context.addInitScript({ content: AZAR_QA });
    await context.clock.setFixedTime(new Date('2026-11-12T20:00:00Z'));
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`[${view.name}] ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && errors.push(`[${view.name}] consola: ${m.text()}`));
    await page.goto(`${site.url}?qa=1`);
    await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
    await page.evaluate((l) => (window as unknown as { __qa: { lang: (l: string) => string } }).__qa.lang(l), LANG);
    await page.evaluate(() => document.fonts.ready);
    // V12: todas las fuentes de la hoja cargadas antes de la primera foto (no solo las que ya se usaron)
    await page.evaluate(() => Promise.all([...document.fonts].map((f) => f.load().catch(() => null))));
    mkdirSync(join(OUT, view.name), { recursive: true });
    /** V11 · ancho de un trono de la mesa de cuatro en esta ventana (regla «tronos»). */
    let ref4 = 0;
    /** V12 · tamaño de letra de cada cifra marcada (data-cifra-k) en «mesa» (regla «compacto»). */
    let refCifras: Record<string, number> | undefined;
    const cifrasDe = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-cifra-k]')].reverse().map((e) => [e.dataset.cifraK, parseFloat(getComputedStyle(e).fontSize)])) as Record<string, number>);
    const anchoTrono = () => page.evaluate(() => (document.querySelector('.tower:not([hidden]):not(.aimed)') as HTMLElement | null)?.offsetWidth ?? 0);
    // el prólogo: la memoria que el juego habría ido juntando con los estados de antes, sin foto
    const prologo = Number(process.env.QA_PROLOGO_MS ?? 0);
    for (const state of t.previos) {
      await page.evaluate((s) => (window as unknown as { __qa: { go: (s: string) => Promise<boolean> } }).__qa.go(s), state);
      if (prologo) await page.waitForTimeout(prologo);
      if (state === 'mesa') {
        await page.waitForTimeout(300);
        ref4 = await anchoTrono();
        refCifras = await cifrasDe();
      }
    }
    for (const state of t.states) {
      const hecho: Hecho = { fails: [], warns: [], caras: [], medidas: [], captura: false };
      hechos.set(`${view.name}/${state}`, hecho);
      if ((!ref4 && (state === 'mesa-2tronos' || state === 'mesa-3tronos')) || (!refCifras && state === 'mesa-cifras')) {
        await page.evaluate(() => (window as unknown as { __qa: { go: (s: string) => Promise<boolean> } }).__qa.go('mesa'));
        await page.waitForTimeout(300);
        ref4 = await anchoTrono();
        refCifras = await cifrasDe();
      }
      const ok = await page.evaluate((s) => (window as unknown as { __qa: { go: (s: string) => Promise<boolean> } }).__qa.go(s), state);
      if (!ok) {
        console.log(`✗ ${view.name} ${state}: estado desconocido`);
        hecho.fails.push({ regla: 'maqueta', msg: 'estado desconocido', ajeno: false });
        continue;
      }
      // Steam Deck (1280×800): la foto se hace jugando con mando, como se ve en ese aparato (QA_DECK_RATON=1 la hace con ratón)
      if (process.env.QA_DECK_RATON !== '1' && view.name === '1280x800' && !/-mando$/.test(state)) await page.evaluate(() => (window as unknown as { __qa: { mando: () => void } }).__qa.mando());
      await page.waitForTimeout(450);
      await page.evaluate(() => document.getAnimations().forEach((a) => a.effect?.getComputedTiming().iterations !== Infinity && a.finish()));
      await page.waitForTimeout(120);
      await page.evaluate(() => document.fonts.ready);
      const all = await page.evaluate(audit, { state, mobile: !!view.mobile, noScroll: noScroll(state), pendiente: ANIMA_PENDIENTE_JUICE, fuga: LANG === 'en' ? { re: RESTOS_ES.source, permitidos: PERMITIDOS_EN, pendiente: FUGA_PENDIENTE } : null, ref4, emblemas: { es: BRAND.es.emblema, en: BRAND.en.emblema }, refCifras });
      await page.evaluate(() => document.getAnimations().forEach((a) => a.effect?.getComputedTiming().iterations !== Infinity && a.finish()));
      await page.evaluate(() => document.fonts.ready);
      // V12 · la foto, quieta: lo infinito vuelve a su primer fotograma y sin cursor de texto; las animaciones
      // SMIL de los SVG (el haz de la portada) no las para Playwright: se paran a mano en su segundo cero
      await page.evaluate(() => document.querySelectorAll('svg').forEach((s) => (s.pauseAnimations(), s.setCurrentTime(0))));
      // …y lo infinito del CSS (las figuras que respiran) se cancela y se espera a que el compositor vuelva a
      // tramar esas capas a su escala de reposo: mientras se animan las trama a otra escala, y la foto salía
      // con la trama de antes o la de después según el momento (qa:determinista)
      await page.evaluate(async (reposo) => {
        for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations === Infinity) a.cancel();
        // will-change: transform deja la trama de la capa a la escala que tenía al nacer (a media entrada de la
        // carta, según el momento): sin él, el compositor vuelve a tramarla a su escala de reposo
        const quieto = document.createElement('style');
        quieto.textContent = '*, *::before, *::after { will-change: auto !important; }';
        document.head.append(quieto);
        await new Promise((ok) => setTimeout(ok, reposo));
        // lo que haya echado a andar en esa espera (una transición de un piso, un retoque de la cuenta) se acaba
        for (const a of document.getAnimations()) {
          if (a.effect?.getComputedTiming().iterations === Infinity) a.cancel();
          else a.finish();
        }
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
        await new Promise((ok) => setTimeout(ok, 100));
        await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
      }, REPOSO);
      // y la foto se repite hasta que cuatro seguidas (600 ms) coinciden: la que se guarda es la de una pantalla ya
      // quieta (el reparto escalonado, el lacre aún caliente y las capas que el compositor suelta al acabar)
      let shot = await page.screenshot({ animations: 'disabled', caret: 'hide' });
      let iguales = 0;
      let intentos = 0;
      while (iguales < 3 && intentos++ < 25) {
        await page.waitForTimeout(200);
        const otra = await page.screenshot({ animations: 'disabled', caret: 'hide' });
        if (otra.equals(shot)) iguales++;
        else iguales = 0;
        shot = otra;
      }
      if (iguales < 3) console.log(`  ! ${view.name} ${state}: la pantalla no se queda quieta en 5 s (foto de la última)`);
      else if (process.env.QA_QUIETO) console.log(`  · ${view.name} ${state}: quieta tras ${intentos} fotos`);
      writeFileSync(join(OUT, view.name, `${state}.png`), shot);
      hecho.captura = true;
      if (state === 'mesa') {
        ref4 = await anchoTrono();
        refCifras = await cifrasDe();
      }
      if (['mesa', 'mesa-inmune', 'mesa-contraste', 'mesa-cifras', 'mesa-polvora'].includes(state)) {
        const px = await page.evaluate(placasPx, shot.toString('base64'));
        all.push(...px.fails);
        hecho.medidas.push(`${view.name} ${state}: Inmune ${px.nI ? `marco de 4 px ${(px.inmune * 100).toFixed(1)} %, fondo de tinta ${(px.inmuneTinta * 100).toFixed(1)} %, placa y marco ${(px.inmuneMarco * 100).toFixed(1)} % en ${px.nI} placas` : '—'} · Vida lisa ${px.nV ? `${(px.vida * 100).toFixed(1)} % en ${px.nV} barras` : '—'}`);
      }
      if (state === 'cartas-lamina' || state === 'mesa') {
        const cara = await page.evaluate(caraLimpia, shot.toString('base64'));
        all.push(...cara.fails);
        if (cara.n) hecho.caras.push(`${view.name} ${state}: ${cara.n} cartas, mínimo ${(cara.min * 100).toFixed(1)} % de marfil`);
      }
      hecho.fails = all.filter((f) => !f.aviso);
      hecho.warns = all.filter((f) => f.aviso).map((w) => `[${w.regla}] ${w.msg}`);
      const own = hecho.fails.filter((f) => !f.ajeno);
      if (hecho.fails.length) {
        // las líneas de un estado salen juntas aunque otros navegadores escriban a la vez
        const max = Number(process.env.QA_MAX ?? 14);
        const lineas = [`✗ ${view.name} ${state}${own.length ? '' : ' (solo en zonas de otra celda)'}`, ...hecho.fails.slice(0, max).map((f) => `    · [${f.regla}${f.ajeno ? ' · ajeno' : ''}] ${f.msg}`)];
        if (hecho.fails.length > max) lineas.push(`    … y ${hecho.fails.length - max} más`);
        console.log(lineas.join('\n'));
      } else console.log(`✓ ${view.name} ${state}`);
    }
  } finally {
    await conTope(context.close(), 10_000, `cerrar el contexto de ${view.name}`);
  }
}

async function main(): Promise<number> {
  const t0 = Date.now();
  ensureBuilt();
  const tBuild = (Date.now() - t0) / 1000;
  const site = await serveWeb();
  const browsers: Browser[] = [];
  const errors: string[] = [];
  const hechos = new Map<string, Hecho>();
  const trabajos = reparto();
  const hilos = Math.min(HILOS, trabajos.length);
  console.log(`Pasada en ${LANG === 'en' ? 'inglés' : 'español'} · ${OUT} · ${VIEWS.length * STATES.length} capturas en ${trabajos.length} tramos, ${hilos} ${hilos === 1 ? 'navegador' : 'navegadores a la vez'}`);
  try {
    // V12 · un solo hilo de trama: con varios, los bordes de las teselas con filtro SVG salían a ±1 de una
    // pasada a otra (qa:determinista). infra/rapido: un navegador (proceso aparte) por hilo, con las mismas banderas
    const cola = [...trabajos];
    const errTramos: string[] = [];
    await Promise.all(
      Array.from({ length: hilos }, async () => {
        const browser = await chromium.launch({ args: BANDERAS });
        browsers.push(browser);
        for (let t = cola.shift(); t; t = cola.shift()) {
          try {
            await correTramo(browser, site, t, hechos, errors);
          } catch (e) {
            // un tramo que se rompe no tumba a los demás: lo que no llegó a hacer sale como fallo
            const msg = `[${t.view.name}] tramo ${t.states[0]} … ${t.states[t.states.length - 1]}: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`;
            errTramos.push(msg);
            console.log(`✗ ${msg}`);
          }
        }
      }),
    );
    errors.push(...errTramos);
  } finally {
    await conTope(Promise.all(browsers.map((b) => b.close())), 15_000, 'cerrar los navegadores');
    site.close();
  }
  let failed = 0;
  let foreign = 0;
  let capturas = 0;
  /** Avisos que no hacen fallar (ANIMA_PENDIENTE_JUICE), sin repetir entre ventanas. */
  const warns = new Set<string>();
  /** V11 · lo medido por «cara-limpia» (va al informe y a la bitácora). */
  const caras: string[] = [];
  /** V12 · lo medido por «inmune» y «vida» en la captura (mínimos), para el informe y la bitácora. */
  const medidas: string[] = [];
  const report: { idioma?: string; cuando: string; ventanas: string[]; estados: string[]; total: number; propios: number; ajenos: number; porRegla: Record<string, number>; fallos: Record<string, Record<string, Fail[]>>; errores: string[] } = {
    idioma: LANG,
    cuando: new Date().toISOString(),
    ventanas: VIEWS.map((v) => v.name),
    estados: STATES,
    total: 0,
    propios: 0,
    ajenos: 0,
    porRegla: {},
    fallos: {},
    errores: [],
  };
  // el informe, en el orden de siempre (ventana, estado), lo haya hecho el navegador que lo haya hecho
  for (const view of VIEWS) {
    report.fallos[view.name] = {};
    for (const state of STATES) {
      const h = hechos.get(`${view.name}/${state}`);
      if (!h) {
        // el tramo se rompió antes de llegar aquí: cuenta como fallo, nunca como «en su sitio»
        report.fallos[view.name][state] = [{ regla: 'maqueta', msg: 'sin captura: el tramo se cortó antes', ajeno: false }];
        report.porRegla.maqueta = (report.porRegla.maqueta ?? 0) + 1;
        failed++;
        continue;
      }
      if (h.captura) capturas++;
      report.fallos[view.name][state] = h.fails;
      for (const f of h.fails) report.porRegla[f.regla] = (report.porRegla[f.regla] ?? 0) + 1;
      const own = h.fails.filter((f) => !f.ajeno).length;
      failed += own;
      foreign += h.fails.length - own;
      for (const w of h.warns) warns.add(w);
      caras.push(...h.caras);
      medidas.push(...h.medidas);
    }
  }
  for (const e of [...new Set(errors)]) console.log(`! ${e}`);
  for (const w of warns) console.log(`! aviso ${w}`);
  for (const c of caras) console.log(`· cara-limpia ${c}`);
  for (const m of medidas) console.log(`· placas ${m}`);
  (report as typeof report & { placas: string[] }).placas = medidas;
  (report as typeof report & { caraLimpia: string[] }).caraLimpia = caras;
  (report as typeof report & { avisos: string[] }).avisos = [...warns];
  report.total = failed + foreign;
  report.propios = failed;
  report.ajenos = foreign;
  report.errores = [...new Set(errors)];
  const seg = (Date.now() - t0) / 1000;
  (report as typeof report & { tiempo: unknown }).tiempo = { segundos: Math.round(seg * 10) / 10, construccion: Math.round(tBuild * 10) / 10, hilos, tramos: trabajos.length, capturas };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${capturas} de ${VIEWS.length * STATES.length} capturas en ${seg.toFixed(1)} s (construcción ${tBuild.toFixed(1)} s · ${hilos} ${hilos === 1 ? 'navegador' : 'navegadores'}) en ${OUT} · informe en ${join(OUT, 'report.json')}`);
  console.log(Object.entries(report.porRegla).map(([k, n]) => `${k} ${n}`).join(' · ') || 'sin fallos por regla');
  console.log(failed || foreign || errors.length ? `${failed} fallos propios, ${foreign} en zonas de otra celda, ${new Set(errors).size} errores de página` : 'Todo en su sitio.');
  return failed || foreign || errors.length ? 1 : 0;
}

// infra/rapido · salida explícita siempre: ningún zócalo ni temporizador que quede vivo en Windows deja a Node colgado
main().then(
  (codigo) => process.exit(codigo),
  (e) => {
    console.error(e instanceof Error ? (e.stack ?? e.message) : String(e));
    process.exit(1);
  },
);
