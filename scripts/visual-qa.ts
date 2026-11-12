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
//   pulgar    en móvil: Golpear, Andamio, Descartar y Tiza abajo, la mano encima y las torres arriba
//   trama     las cuatro tramas de palo existen, se distinguen en grises a 24 px y se usan
//   contraste texto ≥ 4,5:1; cifras críticas y palos sobre papel ≥ 7:1 (cuentas WCAG)
//   placa     las cifras críticas llevan placa de respaldo opaca
//   maqueta   sin desbordamiento, zonas de la mesa que no se pisan
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
const ALL = ['portada', 'preparacion', 'mesa', 'lupa', 'lupa-herramienta', 'lupa-piso', 'lupa-especial', 'plano', 'cobro', 'ferreteria', 'forja', 'mazo', 'hallazgo', 'gremio', 'coleccion', 'archivo', 'acta', 'ajustes', 'reglas', 'mesa-mando', 'mesa-susurro', 'mesa-fatiga', 'mesa-cuenta', 'mesa-peligro', 'acta-derrota'];
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const STATES = wanted.length ? ALL.filter((s) => wanted.includes(s)) : ALL;
/** Pantallas que tienen que caber enteras, sin desplazamiento vertical. */
const NO_SCROLL = ['portada', 'mesa', 'mesa-mando', 'mesa-fatiga', 'lupa', 'lupa-herramienta', 'lupa-piso', 'mesa-cuenta', 'mesa-peligro'];

interface Fail {
  regla: string;
  msg: string;
  /** El fallo cae en la zona de otra celda (cuenta central, finales, acta, susurro, foco). */
  ajeno: boolean;
}

/** Lo que se comprueba dentro de la página. Devuelve la lista de fallos, cada uno con su regla. */
async function audit(opts: { state: string; mobile: boolean; noScroll: boolean }): Promise<Fail[]> {
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
      const need = el.closest(PLACA) && !opts.state.startsWith('x') ? (el.closest('.corner b') ? 7 : 4.5) : 4.5;
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
  if (!document.fonts.check("800 16px 'Derrumbe Cifras'", '0123456789')) fail('gotica', 'la fuente de cifras (Derrumbe Cifras) no está cargada: los títulos góticos pintarían sus números en gótica');

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
      for (const id of ['lamina-dl', 'lamina-copy', 'copy']) if (!document.getElementById(id)) fail('causa', `falta el botón #${id} en el acta`, document.querySelector('.acta-sheet'));
      // botones del acta separados ≥ 12 px
      const bs = [...document.querySelectorAll('.acta-acciones button')].filter(visible).map((b) => b.getBoundingClientRect());
      for (let i = 0; i < bs.length; i++)
        for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i];
          const b = bs[j];
          const gx = Math.max(a.left - b.right, b.left - a.right);
          const gy = Math.max(a.top - b.bottom, b.top - a.bottom);
          if (Math.max(gx, gy) < 11.5) fail('aire', `botones del acta a ${Math.round(Math.max(gx, gy))} px (mínimo 12)`, document.querySelector('.acta-sheet'));
        }
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
    const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: 1, hasTouch: !!view.mobile, isMobile: !!view.mobile, reducedMotion: 'no-preference' });
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
      const fails = await page.evaluate(audit, { state, mobile: !!view.mobile, noScroll: NO_SCROLL.includes(state) });
      await page.screenshot({ path: join(OUT, view.name, `${state}.png`) });
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
