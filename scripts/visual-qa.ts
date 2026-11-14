// Control de calidad visual: abre el juego construido (npm run build:web) en Chromium sin ventana,
// monta estados fijos (src/client/qa.ts), comprueba el DOM y guarda una captura de cada uno en
// artifacts/visual-qa/<ventana>/<estado>.png, más un resumen en artifacts/visual-qa/report.json.
//
//   npm run qa:visual                    todas las ventanas y estados
//   npm run qa:visual -- mesa lupa       solo esos estados
//   VIEW=1366x768 npm run qa:visual      solo esa ventana
//   QA_OUT=dist/capturas npm run …       capturas e informe en otra carpeta (bucle corto de una celda)
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
//   contraste texto ≥ 4,5:1; cifras críticas y palos sobre papel ≥ 7:1 (cuentas WCAG)
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
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { NAME_SHIM, ensureBuilt, serveWeb } from './web';

const OUT = resolve(process.env.QA_OUT?.trim() || 'artifacts/visual-qa');
const VIEWS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '390x844', width: 390, height: 844, mobile: true },
].filter((v) => !process.env.VIEW || process.env.VIEW.split(',').includes(v.name));
const ALL = ['portada', 'portada-en', 'preparacion', 'mesa', 'lupa', 'lupa-herramienta', 'lupa-piso', 'lupa-especial', 'plano', 'cobro', 'ferreteria', 'forja', 'mazo', 'hallazgo', 'gremio', 'logros', 'coleccion', 'archivo', 'acta', 'ajustes', 'reglas', 'mesa-mando', 'mesa-susurro', 'mesa-fatiga', 'mesa-cuenta', 'mesa-peligro', 'acta-derrota', 'acta-victoria', 'guia-palo', 'guia-manga', 'guia-exacto', 'mesa-monarca', 'monarcas', 'mesa-esquirlas', 'cartas-lamina', 'taberna-monedas', 'mesa-lacre', 'acta-feedback', 'ajustes-prueba', 'ferreteria-mando'];
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
/** Variantes que no van en la pasada completa y se piden por su nombre: mesa-monarca-<id> y hallazgo-<secreto>. */
const EXTRA = /^(mesa-monarca|hallazgo)-[a-z]+$/;
const STATES = wanted.length ? [...ALL.filter((s) => wanted.includes(s)), ...wanted.filter((s) => EXTRA.test(s) && !ALL.includes(s))] : ALL;
/** Pantallas que tienen que caber enteras, sin desplazamiento vertical. */
const NO_SCROLL = ['portada', 'portada-en', 'mesa', 'mesa-mando', 'mesa-fatiga', 'lupa', 'lupa-herramienta', 'lupa-piso', 'mesa-cuenta', 'mesa-peligro', 'guia-palo', 'guia-manga', 'guia-exacto', 'mesa-monarca', 'mesa-esquirlas', 'mesa-lacre'];
const noScroll = (s: string) => NO_SCROLL.includes(s) || s.startsWith('mesa-monarca-');

/**
 * V8 · regla «anima»: lo que se anima solo cambia transform y opacity. Los casos que viven en juice.css no
 * son de arte-ui: van aquí, uno a uno (`@keyframes <nombre>` o el selector de la regla con su transition),
 * y salen como aviso, no como fallo. juice-ux los arregla y deja la lista vacía. Un caso que no esté en la
 * lista es fallo.
 */
const ANIMA_PENDIENTE_JUICE: string[] = [];

interface Fail {
  regla: string;
  msg: string;
  /** El fallo cae en la zona de otra celda (cuenta central, finales, acta, susurro, foco). */
  ajeno: boolean;
  /** Solo aviso: se imprime y va al informe, pero no hace fallar la orden (ANIMA_PENDIENTE_JUICE). */
  aviso?: boolean;
}

/** Lo que se comprueba dentro de la página. Devuelve la lista de fallos, cada uno con su regla. */
async function audit(opts: { state: string; mobile: boolean; noScroll: boolean; pendiente: string[] }): Promise<Fail[]> {
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
    if (el.closest('svg, .hero-art, .card, .chalk-mark') || !visible(el)) continue;
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
      if (!visible(el) || el.closest('.lupa-sheet')) continue;
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
      rueda: union('#wheel'),
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
    for (const z of ['mano', 'torres', 'cinturon', 'marcador', 'botones', 'poderes', 'rueda']) if (!zones[z]) fail('maqueta', `falta en la mesa: ${z}`, z === 'marcador' ? document.querySelector('#score') : null);
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
      const cs = getComputedStyle(p);
      // un absoluto no lo recorta un antepasado estático; un fijo, solo la ventana
      const skip = (pos === 'absolute' && cs.position === 'static' && cs.transform === 'none') || (pos === 'fixed' && cs.transform === 'none' && cs.filter === 'none');
      if (skip) continue;
      pos = cs.position;
      const ox = cs.overflowX;
      const oy = cs.overflowY;
      if (ox === 'visible' && oy === 'visible') continue;
      const pr = p.getBoundingClientRect();
      const top = pr.top + p.clientTop;
      const left = pr.left + p.clientLeft;
      const bottom = top + p.clientHeight;
      const right = left + p.clientWidth;
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
      const need = el.closest(PLACA) && !opts.state.startsWith('x') ? (el.closest('.corner b, .hp span') ? 7 : 4.5) : 4.5;
      if (k < need - 0.05 && !contrasts.has(id)) {
        contrasts.set(id, '');
        fail('contraste', `contraste ${k.toFixed(1)}:1 (mínimo ${need}:1): ${id} «${node.textContent.trim().slice(0, 18)}»`, el);
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
    // márgenes de seguridad: nada pulsable pegado al borde físico
    if (inView(r) && r.top >= 0 && r.bottom <= H) {
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
  if (['mesa', 'mesa-mando', 'mesa-peligro', 'mesa-cuenta'].includes(opts.state)) {
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
    const send = scope.querySelector<HTMLButtonElement>('#fb-send');
    const out = scope.querySelector<HTMLElement>('.fb .fb-estado');
    if (!send || !visible(send)) fail('feedback', 'falta el botón «Enviar Crónica / Feedback de Prueba»');
    else {
      if (send.textContent?.trim() !== 'Enviar Crónica / Feedback de Prueba') fail('feedback', `el botón dice «${send.textContent?.trim()}»`, send);
      if (send.disabled) fail('feedback', 'el botón está desactivado con una campaña guardada', send);
    }
    if (!out || out.getAttribute('role') !== 'status' || !out.textContent?.trim()) fail('feedback', 'la línea de lo que va a pasar no está o no lleva role="status"');
    else if (!/Nada sale de este equipo|se manda tu última campaña|^(Copiado|Descargado|Compartido|Enviado)/.test(out.textContent.trim())) fail('feedback', `la línea no dice qué va a pasar: «${out.textContent.trim()}»`, out);
    if (scope.querySelector('.fb input[type="checkbox"], .fb-datos input[type="checkbox"]')) fail('feedback', 'hay una casilla junto al botón de feedback');
    const issue = scope.querySelector<HTMLElement>('#fb-issue');
    if (issue && issue.textContent?.trim() !== 'Abrir aviso') fail('feedback', `el botón del aviso dice «${issue.textContent?.trim()}»`, issue);
    if (opts.state === 'acta-feedback') {
      const box = scope.querySelector<HTMLElement>('.fb');
      if (box?.dataset.hecho !== 'copiado' || !/^Copiado: pega el resumen donde quieras/.test(out?.textContent?.trim() ?? '')) fail('feedback', 'en acta-feedback no se ve la confirmación «Copiado: pega el resumen donde quieras»');
    }
    if (opts.state.startsWith('ajustes')) {
      const n = opts.state === 'ajustes-prueba' ? 2 : 1;
      const count = scope.querySelector<HTMLElement>('#fb-cuenta')?.textContent?.trim() ?? '';
      if (!new RegExp(`^${n} campañas? · \\d+,\\d kB, guardadas en este equipo$`).test(count)) fail('feedback', `la fila «Datos de prueba» dice «${count}» (se esperaban ${n})`);
      for (const id of ['fb-ver', 'fb-borrar']) {
        const b = scope.querySelector<HTMLButtonElement>(`#${id}`);
        if (!b || !visible(b) || b.disabled) fail('feedback', `falta «${id === 'fb-ver' ? 'Ver' : 'Borrar'}» en la fila «Datos de prueba»`);
      }
      const plain = scope.querySelector<HTMLElement>('.fb-llana')?.textContent?.trim() ?? '';
      if (!/^(Nada sale de este equipo: el botón copia o descarga\.|Al pulsar Enviar se manda tu última campaña, y nada más\.)$/.test(plain)) fail('feedback', `la línea llana de «Datos de prueba» dice «${plain}»`);
    }
  }

  // ───────── tinta: las zonas con desplazamiento avisan mientras quede contenido ─────────
  for (const s of new Set([...scrollers, ...scope.querySelectorAll<HTMLElement>('[data-mas]')])) {
    if (!visible(s)) continue;
    const more = s.dataset.mas ?? '';
    const down = s.scrollTop + s.clientHeight < s.scrollHeight - 2;
    const up = s.scrollTop > 2;
    const cs = getComputedStyle(s);
    const drawn = (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') || getComputedStyle(s, '::after').content !== 'none' || getComputedStyle(s, '::before').content !== 'none';
    if (opts.noScroll && down && !s.matches('.log, .lupa-sheet, .lupa-box')) fail('maqueta', `esta pantalla no se desplaza, pero ${name(s)} esconde contenido (${s.scrollHeight} > ${s.clientHeight})`, s);
    if (down && !/abajo/.test(more)) fail('tinta', `${name(s)} esconde contenido abajo y no lo avisa (data-mas="${more}")`, s);
    if (up && !/arriba/.test(more)) fail('tinta', `${name(s)} esconde contenido arriba y no lo avisa (data-mas="${more}")`, s);
    if (!down && /abajo/.test(more)) fail('tinta', `${name(s)} avisa de contenido abajo y ya no queda`, s);
    if ((down || up) && !drawn) fail('tinta', `${name(s)} lleva data-mas="${more}" pero no pinta el aviso de tinta`, s);
  }

  // ───────── palos: tinta ≥ 7:1 sobre el papel y contorno de tinta ─────────
  for (const g of scope.querySelectorAll<SVGElement>('.card .corner .glyph')) {
    if (!visible(g)) continue;
    const cs = getComputedStyle(g);
    const fill = rgb(cs.fill);
    const bg = bgOf(g.parentElement!);
    if (fill && bg) {
      const k = ratio(fill, bg);
      if (k < 6.95) fail('contraste', `palo ${[...g.classList].find((c) => c.startsWith('s-'))} a ${k.toFixed(1)}:1 sobre el papel (mínimo 7:1)`);
    }
    if (cs.stroke === 'none' || parseFloat(cs.strokeWidth) <= 0) fail('trama', `palo sin contorno de tinta: ${name(g)}`);
    break;
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
      // en uso: etiqueta de la torre, rueda de materiales y fondo de las cartas
      const uses: [string, Element | null][] = [['la etiqueta de la torre', document.querySelector(`.tower[data-suit="${s}"] .tower-tag`)], ['la rueda de materiales', document.querySelector(`#wheel .n-${s}`)], ['el fondo de las cartas', document.querySelector(`#hand .card.s-${s}:not(.k-special), .floor-slot .card.s-${s}`)]];
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
    const want = opts.state === 'portada-en' ? ['BLOOD & SUITS', 'SANGRE Y PALO'] : ['SANGRE Y PALO', 'BLOOD & SUITS'];
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

  // ── arte-ui V7 · fricciones F1 (sello), F2 (cuenta) y F3 (vida) ──
  {
    const tier = opts.mobile ? 'movil' : W >= 1900 ? 'grande' : 'portatil';
    const pxOf = (el: Element) => parseFloat(getComputedStyle(el).fontSize) * scaleOf(el);
    const over = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    // F1 · sello: en mesa-peligro (trono apuntado: CORAZONES) cada ♥ de la mano lleva hierro «×0», cada ♦ latón
    // con su factor, ninguna otra carta lleva sello; cifra ≥ 13 px (14 en móvil) con placa, sin pisar las esquinas
    if (opts.state === 'mesa-peligro') {
      const aimed = document.querySelector('.tower.aimed')?.getAttribute('data-suit');
      if (aimed !== 'H') fail('sello', `en mesa-peligro el trono apuntado debía ser CORAZONES y es ${aimed ?? 'ninguno'}`);
      const cards = [...document.querySelectorAll<HTMLElement>('#hand .card, #reserve .card')].filter(visible);
      for (const c of cards) {
        const suit = [...c.classList].find((k) => /^s-[SDHCX]$/.test(k))?.slice(2) ?? 'X';
        const special = c.matches('.k-special, .k-joker') || suit === 'X';
        const seal = c.querySelector<HTMLElement>(':scope > .plate.factor');
        const label = `${c.querySelector('.corner.tl b')?.textContent ?? '?'}${suit}`;
        const want = special ? null : suit === 'H' ? 'iron' : suit === 'D' ? 'brass' : null;
        if (!want) {
          if (seal && visible(seal)) fail('sello', `la carta ${special ? 'especial' : label} lleva sello de factor y no debía (${seal.textContent?.trim()})`, c);
          continue;
        }
        if (!seal || !visible(seal) || !seal.classList.contains(want)) {
          fail('sello', `la carta ${label} no lleva el sello .plate.${want}`, c);
          continue;
        }
        const b = seal.querySelector('b');
        const txt = b?.textContent?.trim() ?? '';
        if (want === 'iron' && txt !== '×0') fail('sello', `el sello de ${label} dice «${txt}» y debía decir «×0»`, c);
        if (want === 'brass' && !/^×[23]$/.test(txt)) fail('sello', `el sello de ${label} dice «${txt}» y debía decir «×2» o «×3»`, c);
        if (b) {
          const px = pxOf(b);
          if (px < (opts.mobile ? 13.95 : 12.95)) fail('sello', `la cifra del sello de ${label} mide ${px.toFixed(1)} px`, c);
          if ((rgb(getComputedStyle(seal).backgroundColor)?.a ?? 0) < 0.9) fail('sello', `el sello de ${label} no tiene placa opaca`, c);
        }
        const sr = seal.getBoundingClientRect();
        for (const k of c.querySelectorAll('.corner')) if (visible(k) && over(sr, k.getBoundingClientRect())) fail('sello', `el sello de ${label} pisa la esquina de la carta`, c);
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
    // F3 · vida: la cifra de la Vida de cada trono en su placa, ≥ 16 / 15 / 14 px, y la barra con su borde de tinta
    if (opts.state.startsWith('mesa')) {
      const need = { grande: 16, portatil: 15, movil: 14 }[tier];
      for (const s of document.querySelectorAll<HTMLElement>('.tower .hp span')) {
        if (!visible(s) || !s.textContent?.trim()) continue;
        const suit = s.closest('.tower')?.getAttribute('data-suit');
        const px = pxOf(s);
        if (px < need - 0.05) fail('vida', `la Vida del trono ${suit} mide ${px.toFixed(1)} px (mínimo ${need})`, s);
        if ((rgb(getComputedStyle(s).backgroundColor)?.a ?? 0) < 0.9) fail('vida', `la Vida del trono ${suit} no tiene placa propia`, s);
        const bar = s.closest('.hp')!;
        if (parseFloat(getComputedStyle(bar).borderTopWidth) < 1.95) fail('vida', `la barra de Vida del trono ${suit} no lleva borde de tinta de 2 px`, s);
        const sr = s.getBoundingClientRect();
        const br = bar.getBoundingClientRect();
        if (Math.abs(sr.left + sr.width / 2 - (br.left + br.width / 2)) > 3) fail('vida', `la placa de la Vida del trono ${suit} no va centrada sobre la barra`, s);
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
      const marked: Record<string, string> = { contraataque: '.pile .curse-tag', mano: '#hand > .curse-ghost', corazones: '#hand .card.s-H > .curse-chalice', escudo: '.stat .curse-tag', guardias: '.tower .fx-apuntalado', ataque: '.tower .threat .curse-tag', asedio: '#fatigue .curse-tag' };
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

  return out;
}

async function main(): Promise<void> {
  ensureBuilt();
  const site = await serveWeb();
  const browser = await chromium.launch();
  let failed = 0;
  let foreign = 0;
  const errors: string[] = [];
  /** Avisos que no hacen fallar (ANIMA_PENDIENTE_JUICE), sin repetir entre ventanas. */
  const warns = new Set<string>();
  const report: { cuando: string; ventanas: string[]; estados: string[]; total: number; propios: number; ajenos: number; porRegla: Record<string, number>; fallos: Record<string, Record<string, Fail[]>>; errores: string[] } = {
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
  for (const view of VIEWS) {
    const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: 1, locale: 'es-ES', hasTouch: !!view.mobile, isMobile: !!view.mobile, reducedMotion: 'no-preference' });
    // tsx envuelve las funciones con un ayudante que la página no conoce
    await context.addInitScript({ content: NAME_SHIM });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`[${view.name}] ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && !/WebSocket|favicon/.test(m.text()) && errors.push(`[${view.name}] consola: ${m.text()}`));
    await page.goto(`${site.url}?qa=1`);
    await page.waitForFunction(() => !!(window as unknown as { __qa?: unknown }).__qa);
    await page.evaluate(() => document.fonts.ready);
    mkdirSync(join(OUT, view.name), { recursive: true });
    report.fallos[view.name] = {};
    for (const state of STATES) {
      const ok = await page.evaluate((s) => (window as unknown as { __qa: { go: (s: string) => Promise<boolean> } }).__qa.go(s), state);
      if (!ok) {
        console.log(`✗ ${view.name} ${state}: estado desconocido`);
        failed++;
        report.fallos[view.name][state] = [{ regla: 'maqueta', msg: 'estado desconocido', ajeno: false }];
        continue;
      }
      await page.waitForTimeout(450);
      await page.evaluate(() => document.getAnimations().forEach((a) => a.effect?.getComputedTiming().iterations !== Infinity && a.finish()));
      await page.waitForTimeout(120);
      await page.evaluate(() => document.fonts.ready);
      const all = await page.evaluate(audit, { state, mobile: !!view.mobile, noScroll: noScroll(state), pendiente: ANIMA_PENDIENTE_JUICE });
      await page.screenshot({ path: join(OUT, view.name, `${state}.png`) });
      const fails = all.filter((f) => !f.aviso);
      for (const w of all.filter((f) => f.aviso)) warns.add(`[${w.regla}] ${w.msg}`);
      report.fallos[view.name][state] = fails;
      for (const f of fails) report.porRegla[f.regla] = (report.porRegla[f.regla] ?? 0) + 1;
      const own = fails.filter((f) => !f.ajeno);
      failed += own.length;
      foreign += fails.length - own.length;
      if (fails.length) {
        console.log(`✗ ${view.name} ${state}${own.length ? '' : ' (solo en zonas de otra celda)'}`);
        const max = Number(process.env.QA_MAX ?? 14);
        for (const f of fails.slice(0, max)) console.log(`    · [${f.regla}${f.ajeno ? ' · ajeno' : ''}] ${f.msg}`);
        if (fails.length > max) console.log(`    … y ${fails.length - max} más`);
      } else console.log(`✓ ${view.name} ${state}`);
    }
    await context.close();
  }
  await browser.close();
  site.close();
  for (const e of [...new Set(errors)]) console.log(`! ${e}`);
  for (const w of warns) console.log(`! aviso ${w}`);
  (report as typeof report & { avisos: string[] }).avisos = [...warns];
  report.total = failed + foreign;
  report.propios = failed;
  report.ajenos = foreign;
  report.errores = [...new Set(errors)];
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\n${VIEWS.length * STATES.length} capturas en ${OUT} · informe en ${join(OUT, 'report.json')}`);
  console.log(Object.entries(report.porRegla).map(([k, n]) => `${k} ${n}`).join(' · ') || 'sin fallos por regla');
  console.log(failed || foreign || errors.length ? `${failed} fallos propios, ${foreign} en zonas de otra celda, ${new Set(errors).size} errores de página` : 'Todo en su sitio.');
  process.exit(failed || foreign || errors.length ? 1 : 0);
}

void main();
