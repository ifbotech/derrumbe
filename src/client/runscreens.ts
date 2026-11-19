// Pantallas de campaña: el sobre lacrado, la oferta de los Reyes, el Mapa de caminos, el Botín con su «Elegí una»,
// La Pulpería, el Fogón, los Santuarios del Bufón y la Crónica final.
import { whisper } from './whispers';
import { Card, FORM } from '../rules/engine';
import { BOSS, Don, DraftOpt, EVENT, LAST_STAGE, MAPA_CFG, Offer, Recompensa, Run, botinPrevisto, depthOf, formBase, mvpTool, offerCost, sellValue, serviciosFogon, serviciosPulperia, stageDef, stagesCleared, toolSlots } from '../rules/run';
import { alcanzables, filaAsalto, type NodoMapa, type TipoNodo } from '../rules/mapa';
import type { OpcionBend } from '../rules/reyes';
import type { ClaveUi } from '../shared/i18n/es';
import { BALANCE } from '../rules/balance-config';
import { TOOL } from '../rules/tools';
import { contextoDe, marcaPieza } from './piezas-ui';
import { cobroFor } from '../rules/textos';
import { rubble, skyline } from './art';
import { setScene, sfx } from './audio';
import { isRunHost, runDo } from './campaign';
import { cardEl, ferreteroEl, portraitEl, setDeckBack, suitSvg, tileEl } from './card';
import { $, $$, S, app, esc, modal, num, toast } from './core';
import { causeHtml, causeText, validDeath } from './causa';
import { copyLamina, downloadLamina, laminaOf, seedLink } from './lamina';
import { burst, coins, dealIn, restart, revealOptions, stampOn } from './fx';
import { glyphSvg } from './glyphs';
import { cifra, cifraEl } from './cifra';
import { lastGain, meta, openGuild } from './guild';
import { abrirEn, efectoSiguiente } from './arbol';
import { siguienteMejora } from '../rules/arbol';
import { sendMsg } from './net';
import { setScreen } from './router';
import { renderPings } from './pings';
import { L, Ln, acabD, acabN, asaltoN, barN, cartaN, espD, espN, formN, getLang, marca, mejN, monD, monDec, monN, numL, paloN, rarN, relD, relN, secN, secO, secT, selloD, selloN, tiranoN } from './lengua';
import { beltEl, bindFeedback, choice, deckModal, feedbackHtml, showSettings, spCard, toolTile, toolTip } from './widgets';
import { type HudDatos, hudHtml, montaTira } from './hud';
import { ritualDelBotin } from './ritual';
import { opcionTexto, reyesPills } from './reyes-ui';
import { fraseBufonOferta } from '../rules/reyes';
import { bufonSvg } from './pixel/bufon';
import { alElegirBend, bufonTientaHtml } from './bufon-vivo';
import { uiIconoSvg } from './pixel/ui-iconos';
import { amuletoSvg, bendicionSvg, trampaSvg } from './pixel/iconos';
import { hudSvg, nodoSvg } from './pixel/nodos';
import { pintaHalo } from './pixel/pintas';
import { reySvg, type ReyPx } from './pixel/reyes';
import { type Pieza, selloDe, sinergia } from '../rules/piezas';
import { sinergiaFor } from '../rules/textos';
import { UMBRALES_REY, infoOpcion } from '../rules/reyes';

import { t } from '../shared/i18n';

const isPlain = (c: Card) => !c.sp && c.suit !== 'X';
// Iconos de los Secretos: el emblema de GLYPH que mejor dice la imagen de la biblia de nombres (§11).
const EVENT_GLYPH: Record<string, string> = {
  caja: 'contenedor', // cofre con candado (El cofre enterrado)
  horno: 'crisol', // caldero (El caldero del alquimista)
  contrato: 'nitro', // pergamino con lacre negro (El decreto maldito)
  clandestino: 'sismografo', // vela (Los lacradores ciegos)
  planos: 'plano', // mapa del castillo (Los mapas escondidos)
};

// ───────────────────────── El Tratante ─────────────────────────

// V10: las frases van en ui-arte.ts, separadas por «|», en el idioma de la mesa
const SAY = {
  hello: 'ui.tratante.hello',
  buy: 'ui.tratante.buy',
  poor: 'ui.tratante.poor',
  reroll: 'ui.tratante.reroll',
  burn: 'ui.tratante.burn',
  forge: 'ui.tratante.forge',
  sell: 'ui.tratante.sell',
  free: 'ui.tratante.free',
} as const;
export function ferreteroSays(kind: keyof typeof SAY): void {
  const el = $('#say');
  if (!el) return;
  const lines = L(SAY[kind]).split('|');
  el.textContent = lines[Math.floor(Math.random() * lines.length)];
  sfx.grunt();
  restart($('.k-npc'), 'talk');
}

// ───────────────────────── Común ─────────────────────────

let lastGold = -1;
let lastPhase = '';

export function renderRun(): void {
  const c = S.campaign;
  if (!c) return setScreen('camp');
  const run = c.run;
  setDeckBack(run.deckId);
  const over = run.phase === 'won' || run.phase === 'lost';
  setScene(over ? 'menu' : run.phase === 'map' ? 'map' : 'shop', run.stage); // juice-ux V8: el Mapa tiene su música
  document.querySelectorAll('.pending-modal, .sobre-modal').forEach((m) => m.remove());
  if (run.phase === 'pack') packScreen(run);
  else if (run.phase === 'bendicion') bendicionScreen(run);
  else if (run.phase === 'map') mapScreen(run);
  else if (run.phase === 'reward') rewardScreen(run);
  else if (run.phase === 'shop') shopScreen(run);
  else if (run.phase === 'event') eventScreen(run);
  else if (run.phase === 'fogon') fogonScreen(run);
  else if (over) actaScreen(run);
  else return;
  if (lastPhase === 'event' && run.phase !== 'event' && run.suerte) suerteCartel(run);
  lastGold = run.gold;
  lastPhase = run.phase;
  const dv = $('#deck-view');
  if (dv) dv.onclick = () => deckModal(L('ui.run.tu.mazo', { n: run.deck.length }), [{ label: L('ui.mesa.mazo'), cards: run.deck }]);
  // lo que la conjura puede señalar con señas en sala
  const tag = (sel: string, name: string) => $$(sel).forEach((el, i) => (el.dataset.ping = el.classList.contains('skip') ? 'skip:0' : `${name}:${i}`));
  tag('#routes > .choice', 'route');
  tag('#bends > .choice', 'bend');
  tag('#picks > .choice', 'pick');
  tag('#loot > .choice', 'loot');
  tag('#offers > .choice', 'offer');
  tag('#opts > button', 'event');
  renderPings();
  if (isRunHost()) {
    if (run.sobre) openSobre(run);
    else if (run.pending) openPending(run);
  }
}

const host = () => isRunHost();
const waitNote = () => (host() ? '' : `<p class="wait">${L('ui.run.espera')}</p>`);
/** Lo que el HUD enseña de la campaña. */
const hudDe = (run: Run): HudDatos => ({ vida: run.integrity, vidaMax: run.maxIntegrity, oro: run.gold, esquirlas: run.esquirlas, gotas: run.gotas, mazo: run.deck.length, mazoId: run.deckId, tools: run.tools, slots: toolSlots(run), bendiciones: run.bendiciones });
/**
 * V40 · fase 3a · La cabecera de toda pantalla de campaña: el HUD único arriba y, debajo, el título en una línea.
 * Fuera los subtítulos: lo que decían (Vida, Mazo, oro) ya está en el HUD. `sub` queda para el lector de pantalla.
 */
function head(run: Run, h1: string, sub = ''): string {
  return `${hudHtml(hudDe(run), { mazoId: 'deck-view', derecha: `<button type="button" class="hud-btn" id="btn-set" aria-label="${L('ui.ajustes')}" data-tip="${L('ui.ajustes')}">${uiIconoSvg('engranaje')}</button>` })}<header class="deck-head pant-cab"><h1 class="pant-t"${sub ? ` aria-description="${esc(sub.replace(/<[^>]+>/g, ''))}"` : ''}>${h1}</h1></header>`;
}
/** V27 · las Reliquias que había la última vez que se pintó la tira: la que llega nueva se marca y se dice dónde se colocó. */
let beltAntes: string[] | null = null;
/** V40 · fase 3a · La tira del HUD (Amuletos y Bendiciones): aquí se inspeccionan con calma (y en La Pulpería se venden). */
function montaHud(run: Run, sell = false): void {
  const ids = run.tools.map((t) => t.id);
  const nuevas = beltAntes ? ids.filter((id) => !beltAntes!.includes(id)) : [];
  beltAntes = ids;
  const belt = beltEl(run.tools, { slots: toolSlots(run), onSell: sell && host() ? (i) => confirmSell(run, i) : undefined, sellValue });
  montaTira(app, hudDe(run), belt);
  $('.hud-tira-in')?.classList.add('run-belt');
  // la Reliquia recién llegada lleva un filete de latón (V31: su hueco ya no cambia la cuenta, así que no se anuncia)
  for (const n of nuevas) belt.querySelector(`.belt-slot[data-id="${CSS.escape(n)}"]`)?.classList.add('recien');
  const set = $('#btn-set');
  if (set) set.onclick = () => showSettings();
}
function confirmSell(run: Run, i: number): void {
  const t = run.tools[i];
  if (!t) return;
  const el = modal(`<div class="modal-box confirm"><h2>${L('ui.run.vender.titulo', { x: relN(t.id) })}</h2><p>${L('ui.run.vender.texto', { n: sellValue(t.id) })} ${relD(t.id)}</p><div class="row"><button class="x">${L('ui.no')}</button><button class="primary" id="yes">${L('ui.run.vender')}</button></div></div>`);
  $('#yes', el).onclick = () => {
    el.remove();
    runDo({ t: 'sell', i });
    sfx.coins(sellValue(t.id)), coins('#npc', '#bolsa-oro', sellValue(t.id)); // juice-ux V8: del Tratante a la bolsa
    ferreteroSays('sell');
  };
}

// ───────────────────────── Sobre lacrado inicial ─────────────────────────

/** V29 · El Don de la Conjura: cómo se llama y qué hace cada uno de los tres regalos de la campaña. */
function donTexto(run: Run, d: Don): { glifo: string; nombre: string; desc: string } {
  if (d.kind === 'tool') return { glifo: d.id, nombre: relN(d.id), desc: relD(d.id) };
  if (d.kind === 'oro') return { glifo: 'oro', nombre: L('ui.run.don.oro', { n: d.n }), desc: L('ui.run.don.oro.desc') };
  const carta = run.deck.find((c) => c.id === d.card);
  return { glifo: 'sello', nombre: L('ui.run.don.sello', { sello: selloN(d.seal), carta: carta ? cartaN(carta) : '' }), desc: selloD(d.seal) };
}

function packScreen(run: Run): void {
  const dones = run.don ?? [];
  let elegido = 0;
  app.innerHTML = `<div class="run m40 sobre40">${head(run, L('ui.run.sobre.titulo'), `${L('ui.run.sobre.sub', { n: run.ascension + 1 })}${run.seedText ? L('ui.run.sobre.semilla', { s: run.seedText }) : ''}`)}
    <div class="run-body"><p class="lead">${L('ui.run.sobre.texto')}</p>
    <div class="choices" id="picks"></div>
    ${dones.length ? `<section class="don"><h3 class="sec">${L('ui.run.don.titulo')}</h3><p class="don-sub">${L('ui.run.don.texto')}</p><div class="don-opts" id="don-opts" role="radiogroup" aria-label="${L('ui.run.don.titulo')}"></div></section>` : ''}${waitNote()}
    <div class="row end-row"><button id="deck-view">${L('ui.run.ver.mazo', { n: run.deck.length })}</button><button class="primary big" id="go" ${host() ? '' : 'disabled'}>${L('ui.run.al.mapa')}<small>${asaltoN(1)}</small></button></div></div></div>`;
  run.pack.forEach((id, i) => {
    const el = cardEl(spCard(id));
    dealIn(el, 200 + i * 220);
    $('#picks').appendChild(choice(el, espN(id), espD(id), null, null));
  });
  // el Don: tres botones, uno marcado (el primero de salida); «Al mapa» empieza la campaña con el marcado
  const marca = (): void => {
    document.querySelectorAll<HTMLElement>('#don-opts .don-opt').forEach((b, i) => {
      b.classList.toggle('on', i === elegido);
      b.setAttribute('aria-checked', String(i === elegido));
    });
  };
  dones.forEach((d, i) => {
    const tx = donTexto(run, d);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stamp-btn don-opt';
    b.setAttribute('role', 'radio');
    b.disabled = !host();
    b.innerHTML = `${glyphSvg(tx.glifo, 'stamp-ico')}<span><b>${tx.nombre}</b><small>${tx.desc}</small></span>`;
    b.onclick = () => {
      elegido = i;
      marca();
    };
    $('#don-opts').appendChild(b);
  });
  marca();
  $('#go').onclick = () => runDo(dones.length ? { t: 'begin', don: elegido } : { t: 'begin' });
}

// ───────────────────────── «Elegí una» (V40 · fase 3a) ─────────────────────────

/**
 * El sello de una pieza en grande: la letra S · A · B en su lacre o, si la pieza encaja con lo que llevás (★ Sinergia),
 * la estrella con su etiqueta de dos o tres palabras debajo del nombre. Datos: selloDe y sinergia (src/rules/piezas.ts).
 */
function sello40(p: Pieza, run: Run): { sello: string; sin: string } {
  const s = selloDe(p);
  const sin = sinergia(p, contextoDe(run));
  const sello = sin
    ? `<span class="sello40 estrella" data-sello="${s ?? ''}" data-sinergia="${sin.tipo}" aria-label="★"><b>★</b></span>`
    : s
      ? `<span class="sello40 s-${s}" data-sello="${s}" aria-label="${L('ui.pieza.sello', { s })}"><b>${s}</b></span>`
      : '';
  return { sello, sin: sin ? `<span class="sin40">${sinergiaFor(getLang(), sin).replace(/^★\s*/, '★ ')}</span>` : '' };
}

/** El icono grande de una opción (pixel-art), con su globo y su Lupa. */
function ico40(svg: string, tip = '', lupa = ''): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ico40';
  el.innerHTML = svg;
  if (tip) el.dataset.tip = tip;
  if (lupa) el.dataset.lupa = lupa;
  return el;
}

/**
 * Una opción grande de «Elegí una» (también la oferta de los Reyes y las bandejas de La Pulpería): el sello arriba, el
 * icono, el nombre y una línea por efecto. Usa `choice` (foco, Enter, A del mando y la clase `.choice.pick`).
 */
function opcion40(el: HTMLElement, titulo: string, lineas: string[], p: Pieza | null, run: Run, onPick: (() => void) | null, cls = ''): HTMLElement {
  const box = choice(el, titulo, lineas.filter(Boolean).join('<br>'), null, onPick, `op40 ${cls}`);
  if (p) {
    const s = sello40(p, run);
    box.insertAdjacentHTML('afterbegin', s.sello);
    if (s.sin) box.querySelector('h4')?.insertAdjacentHTML('afterend', s.sin);
  }
  return box;
}

/** La pantalla limpia de «Elegí una»: HUD, el título rotundo, las opciones y «Saltar» abajo. */
function elegiHtml(run: Run, idOpciones: string, botones: string, previo = ''): string {
  return `<div class="run m40 elegi-una">${head(run, L('ui.elegi40.titulo'))}
    <div class="run-body elegi40">${previo}<div class="choices op-fila" id="${idOpciones}"></div>${waitNote()}
    ${botones ? `<div class="row elegi-pie">${botones}</div>` : ''}</div></div>`;
}

// ───────────────────────── La oferta de Bendiciones (V40 1c) ─────────────────────────

/**
 * Los Reyes ofrecen: la misma pantalla de «Elegí una», una opción por Rey con su retrato pixel-art, la Bendición, su
 * efecto, su condición de carga, el nivel [2/4] que encendería y su sello. Se elige con el ratón, con Enter/Espacio
 * sobre la que tiene el foco o con el mando (A); las flechas y la cruceta mueven el foco (nav.ts conoce `.choice.pick`).
 */
function bendicionScreen(run: Run): void {
  const op = run.oferta ?? [];
  app.innerHTML = elegiHtml(run, 'bends', '', `<p class="bufon-dice"><span class="bufon-mini">${bufonSvg('brillo')}</span><i>${t(fraseBufonOferta(run.id, run.stage))}</i></p>`);
  montaHud(run);
  bendTarjetas(run, op, $('#bends'), host() ? (i) => runDo({ t: 'bendicion', i }) : null);
}

const metaRey = (n: number) => UMBRALES_REY.find((u) => u > n) ?? UMBRALES_REY[UMBRALES_REY.length - 1];

/** Las tarjetas de Bendición (la oferta de los Reyes y la «Elegí una» del Botín): Rey, efecto, carga, nivel, sello y ★. */
function bendTarjetas(run: Run, op: OpcionBend[], host_: HTMLElement, pick: ((i: number) => void) | null): void {
  op.forEach((o, i) => {
    const info = infoOpcion(run.bendiciones, o, run.tools);
    const nombre = t(`bendicion.${o.id}.nombre`);
    const nivel = info.reyes
      .map((r) => `<span class="nivel40 r-${r.rey}${r.enciende ? ' enciende' : ''}">${L('ui.elegi40.nivel', { r: t(`rey.${r.rey}.palo`), n: r.n, m: metaRey(r.n - 1) })}</span>`)
      .join('');
    const ico = document.createElement('div');
    ico.className = 'ico40 ico-bend';
    ico.innerHTML = `<span class="rey40" aria-hidden="true">${info.reyes.map((r) => reySvg(r.rey as ReyPx)).join('')}</span>${bendicionSvg(o.id)}`;
    ico.dataset.tip = `<b>${t(`rey.${o.rey}.nombre`)}</b>${L('ui.elegi40.rey')}: ${nombre}`;
    const box = opcion40(ico, nombre, [t(`bendicion.${o.id}.desc`), `<small class="carga40">${t(`bendicion.${o.id}.carga`)}</small>`, nivel], { tipo: 'bendicion', id: o.id }, run, pick ? () => (alElegirBend(box), pick(i)) : null, `bend r-${o.rey}${info.dual ? ' dual' : ''}`);
    box.dataset.bend = o.id;
    box.dataset.i = String(i);
    box.style.setProperty('--i', String(i));
    host_.appendChild(box);
  });
}

// ───────────────────────── El Mapa de caminos (V40 1e · fase 3a) ─────────────────────────

const tipoN = (t: TipoNodo) => L(`ui.mapa.tipo.${t}` as ClaveUi);

/** Lo que dice un nodo del Mapa: qué es y qué Botín deja (botinPrevisto, de las reglas). */
function nodoTexto(run: Run, n: NodoMapa): string {
  const def = stageDef(n.tramo);
  if (n.tipo === 'bravo') return L('ui.mapa.desc.bravo', { palo: n.palo ? paloN(n.palo) : '', v: num(MAPA_CFG.bravo.vida), k: MAPA_CFG.bravo.amuletos, o: MAPA_CFG.bravo.oro });
  if (n.tipo === 'fogon') return L('ui.mapa.desc.fogon', { n: MAPA_CFG.fogon.curar });
  if (n.tipo === 'rey') {
    const boss = run.bosses[n.tramo] ? BOSS[run.bosses[n.tramo]] : null;
    return boss ? `<b>${monN(boss.id)} · ${monDec(boss.id)}.</b> ${monD(boss.id)}` : L('ui.mapa.desc.rey');
  }
  if (n.tipo === 'guardia') return `${L('ui.mapa.desc.guardia')} ${Ln(def.floors.length, 'ui.run.guardias.1', 'ui.run.guardias.n')}${L('ui.run.vida.x', { n: num(def.hp) })}`;
  return L(`ui.mapa.desc.${n.tipo}` as ClaveUi);
}
function nodoBotin(run: Run, n: NodoMapa): string {
  const b = botinPrevisto(run, n.tipo, n.tramo);
  const partes = [
    b.oro ? L('ui.mapa.previo.oro', { n: b.oro }) : '',
    ...b.elegi.map((e) => `${L('ui.elegi.titulo')} (${L(`ui.elegi.${e}` as ClaveUi)})`),
    b.amuleto ? L('ui.mapa.previo.amuleto') : '',
    n.tipo === 'bravo' && MAPA_CFG.bravo.bendicion ? L('ui.mapa.previo.bend') : '',
  ].filter(Boolean);
  return partes.length ? L('ui.mapa.previo', { x: partes.join(' · ') }) : '';
}

/**
 * El Mapa entero, de abajo (el asalto 1) arriba (el último), en una vista que se desplaza con la rueda, el dedo, el
 * arrastre del ratón y la cruceta (el foco lleva la vista). Cada nodo es su icono pixel-art (`#mn-<id>`, `data-tipo`,
 * `.t-<tipo>`); los alcanzables son además `.choice.pick` dentro de `#routes` (el humo y el mando los buscan ahí) y se
 * pulsan con ratón, Enter o A. La ficha enseña el nodo que tiene el ratón o el foco, con su Botín.
 */
function mapScreen(run: Run): void {
  const m = run.mapa;
  const hi = Math.max(...m.nodos.map((n) => n.fila), filaAsalto(Math.max(2, run.stage)));
  const filas = hi + 1;
  const ya = new Set(m.hechos);
  const puede = new Set(alcanzables(m));
  const x = (n: NodoMapa) => n.col * 100 + 50;
  const y = (n: NodoMapa) => (hi - n.fila) * 100 + 50;
  const lineas = m.nodos
    .flatMap((n) => n.hacia.map((h) => [n, m.nodos[h]] as const))
    .filter(([, h]) => !!h)
    .map(([a, b]) => {
      const cls = ya.has(a.id) && ya.has(b.id) ? 'hecha' : a.id === m.en && puede.has(b.id) ? 'abierta' : '';
      return `<line class="${cls}" x1="${x(a)}" y1="${y(a)}" x2="${x(b)}" y2="${y(b)}" vector-effect="non-scaling-stroke"/>`;
    })
    .join('');
  const can = host();
  app.innerHTML = `<div class="run m40 map mapa40">${head(run, L('ui.mapa40.titulo'), L('ui.mapa.sub', { n: run.stage }))}
    <div class="run-body mapa-cuerpo">
      <div class="mapa-scroll" id="mapa-scroll"><div class="mapa-lienzo" style="--filas:${filas}">
        <svg class="mapa-aristas" viewBox="0 0 300 ${filas * 100}" preserveAspectRatio="none" aria-hidden="true">${lineas}</svg>
        <div class="mapa-nodos" id="routes" role="group" aria-label="${L('ui.mapa.elegi')}"></div>
      </div></div>
      <aside class="mapa-ficha" id="mapa-ficha" aria-live="polite"></aside>
      ${waitNote()}
    </div></div>`;
  montaHud(run);
  const ir = (id: number) => (sfx.stamp(), runDo({ t: 'ir', nodo: id }));
  const host_ = $('#routes');
  const ficha = $('#mapa-ficha');
  const enseña = (n: NodoMapa) => {
    const b = nodoBotin(run, n);
    // V40 · 3b (juice-ux): lo que decía el globo flotante (tapaba otro nodo) va aquí, en el panel lateral
    ficha.innerHTML = `<div class="ficha-ico">${nodoSvg(n.tipo)}</div><div class="ficha-tx"><b>${tipoN(n.tipo)}${n.asalto ? ` · ${L('ui.mapa40.tramo', { n: n.tramo })}` : ''}</b><span class="ficha-desc">${nodoTexto(run, n)}</span>${b ? `<span class="ficha-botin">${b.replace(/^[^:]*:\s*/, '')}</span>` : ''}</div>`;
    ficha.dataset.tipo = n.tipo;
  };
  for (const n of m.nodos) {
    const estado = n.id === m.en ? 'aqui' : ya.has(n.id) ? 'hecho' : puede.has(n.id) ? 'alcanzable' : 'lejos';
    const b = document.createElement('button');
    b.type = 'button';
    b.id = `mn-${n.id}`;
    b.className = `nodo-mapa t-${n.tipo} ${estado}${estado === 'alcanzable' && can ? ' choice pick' : ''}`;
    b.dataset.tipo = n.tipo;
    b.dataset.mn = String(n.id);
    b.dataset.i = String(n.id);
    b.style.gridRow = String(hi - n.fila + 1);
    b.style.gridColumn = String(n.col + 1);
    b.disabled = !(estado === 'alcanzable' && can);
    if (estado === 'aqui') b.setAttribute('aria-current', 'step');
    const botin = nodoBotin(run, n);
    b.setAttribute('aria-label', `${tipoN(n.tipo)}${n.asalto ? ` ${n.tramo}` : ''}. ${botin}`);
    b.innerHTML = `${nodoSvg(n.tipo)}${n.palo ? `<i class="nodo-palo s-${n.palo}">${suitSvg(n.palo)}</i>` : ''}${estado === 'aqui' ? `<i class="nodo-aqui" aria-hidden="true">${bufonSvg('reposo')}</i>` : ''}`;
    if (estado === 'alcanzable' && can) b.onclick = () => ir(n.id);
    b.addEventListener('pointerenter', () => enseña(n));
    b.addEventListener('focus', () => enseña(n));
    host_.appendChild(b);
  }
  const primero = alcanzables(m)[0];
  enseña(m.nodos[primero ?? Math.max(0, m.en)] ?? m.nodos[0]);
  // la vista: el primero alcanzable (o el actual) centrado; arrastre con el ratón; el foco la lleva
  const sc = $('#mapa-scroll');
  const foco = $(`#mn-${primero ?? m.en}`) ?? $('.nodo-mapa');
  if (foco) {
    const r = foco.getBoundingClientRect();
    const s = sc.getBoundingClientRect();
    sc.scrollTop += r.top - s.top - (s.height - r.height) / 2;
  }
  sc.addEventListener('focusin', (e) => (e.target as HTMLElement).scrollIntoView?.({ block: 'nearest', inline: 'nearest' }));
  let arrastre: { y: number; top: number } | null = null;
  sc.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || (e.target as HTMLElement).closest('.nodo-mapa.pick')) return;
    arrastre = { y: e.clientY, top: sc.scrollTop };
    sc.setPointerCapture(e.pointerId);
    sc.classList.add('arrastra');
  });
  sc.addEventListener('pointermove', (e) => {
    if (arrastre) sc.scrollTop = arrastre.top - (e.clientY - arrastre.y);
  });
  const suelta = () => {
    arrastre = null;
    sc.classList.remove('arrastra');
  };
  sc.addEventListener('pointerup', suelta);
  sc.addEventListener('pointercancel', suelta);
  if (run.stage === 2 && m.en >= 0 && m.nodos[m.en]?.asalto) whisper('atajo');
}

// ───────────────────────── El Botín y la «Elegí una» (V40 1e · fase 3a) ─────────────────────────

function draftChoice(run: Run, o: DraftOpt, i: number): HTMLElement {
  const click = host() ? () => runDo({ t: 'elegir', j: i }) : null;
  if (o.kind === 'special') return opcion40(trampaSvg(o.id) ? ico40(trampaSvg(o.id), `<b>${espN(o.id)}</b>${espD(o.id)}`, `special:${o.id}`) : cardEl(spCard(o.id)), espN(o.id), [espD(o.id)], { tipo: 'trampa', id: o.id }, run, click, 'trampa');
  const c = o.card;
  const what = [c.tr ? `<b>${acabN(c.tr)}.</b> ${acabD(c.tr)}` : '', c.seal ? `<b>${selloN(c.seal)}.</b> ${selloD(c.seal)}` : ''].filter(Boolean);
  return opcion40(cardEl(c), cartaN(c), what, null, run, click, 'carta');
}

/** El icono y la línea de cada recompensa del Botín. */
function recompensa40(run: Run, r: Recompensa): { ico: string; titulo: string; tip: string } {
  if (r.k === 'oro') return { ico: pintaHalo('D', 'ico-oro'), titulo: L('ui.botin40.cobrar.oro', { n: r.n }), tip: run.pay.map(([l, n]) => `${cobroFor(getLang(), l)} +${n}`).join('<br>') };
  if (r.k === 'amuleto') return { ico: amuletoSvg(r.id), titulo: relN(r.id), tip: `<b>${relN(r.id)}</b>${relD(r.id)}` };
  const que = L(`ui.elegi.${r.tipo}` as ClaveUi);
  const ico =
    r.tipo === 'bendicion'
      ? bendicionSvg((r.opciones as OpcionBend[])[0]?.id ?? '')
      : r.tipo === 'amuleto'
        ? amuletoSvg(String(r.opciones[0] ?? ''))
        : trampaSvg(String((r.opciones as DraftOpt[]).find((o) => o.kind === 'special')?.id ?? 'gemelo'));
  return { ico, titulo: L('ui.botin40.elegi', { x: que }), tip: L('ui.elegi.sub', { x: `${r.opciones.length} · ${que}` }) };
}

/**
 * El Botín tras un combate: una lista vertical centrada. Cada fila es un botón grande que cobra (o abre su «Elegí
 * una») y una cruz chica para saltarla; abajo, un solo botón claro: «Seguir» (o «Saltar», si queda algo por cobrar).
 */
function rewardScreen(run: Run): void {
  if (run.elegi !== null) return elegiScreen(run);
  const bravo = run.combate === 'bravo';
  const can = host();
  const total = run.pay.reduce((a, [, n]) => a + n, 0);
  const quedan = run.botin.some((r) => r.estado === 'abierta');
  app.innerHTML = `<div class="run m40 botin40">${head(run, L('ui.botin40.titulo'), bravo ? L('ui.botin.bravo') : L('ui.run.botin.sub', { n: run.stage, nombre: asaltoN(run.stage) }))}
    <div class="run-body botin-cuerpo">
      <div class="botin-lista" id="botin"></div>${waitNote()}
      <div class="row botin-pie"><button class="primary" id="seguir" ${can ? '' : 'disabled'}>${quedan ? L('ui.botin40.saltar') : L('ui.botin40.seguir')}</button></div>
    </div></div>`;
  if (lastPhase !== 'reward') sfx.coins(total);
  // V12: la tirada de huesos del asalto recién ganado, una vez, sobre el Botín
  if (!bravo) ritualDelBotin(`${run.id}:${run.stage}`, run.ritual?.asalto === run.stage ? run.ritual : null);
  montaHud(run);
  const full = run.tools.length >= toolSlots(run);
  run.botin.forEach((r, i) => {
    const tx = recompensa40(run, r);
    const fila = document.createElement('div');
    fila.className = `botin-fila k-${r.k} ${r.estado}`;
    fila.dataset.i = String(i);
    const bloqueado = r.k === 'amuleto' && full;
    const cuerpo = `<span class="botin-ico">${tx.ico}</span><b class="botin-tx">${bloqueado ? `${tx.titulo} · ${L('ui.run.llenas')}` : tx.titulo}</b>`;
    if (r.estado === 'abierta') {
      fila.innerHTML = `<button class="cobrar" data-tip="${esc(tx.tip)}" ${can && !bloqueado ? '' : 'disabled'}>${cuerpo}</button><button class="saltar" aria-label="${L('ui.botin.saltar')}" data-tip="${r.k === 'elegi' && r.tipo === 'trampa' ? L('ui.elegi.saltar.oro', { n: BALANCE.cobro.sinSeleccion }) : L('ui.botin.saltar')}" ${can ? '' : 'disabled'}>✕</button>`;
      $('.cobrar', fila).onclick = () => (sfx.stamp(), runDo({ t: 'cobrar', i }));
      $('.saltar', fila).onclick = () => runDo({ t: 'saltar', i });
    } else fila.innerHTML = `<div class="cobrar hecha">${cuerpo}<i class="botin-estado" aria-label="${r.estado === 'tomada' ? L('ui.botin.tomada') : L('ui.botin.saltada')}">${r.estado === 'tomada' ? '✓' : '—'}</i></div>`;
    $('#botin').appendChild(fila);
  });
  $('#seguir').onclick = () => runDo({ t: 'seguir' });
}

/**
 * La «Elegí una» abierta (`run.elegi`): pantalla limpia, el título rotundo, tres opciones grandes con su sello S·A·B o
 * ★ Sinergia (selloDe, sinergia) y «Saltar» abajo; «Volver» al Botín, discreto. La de Bendición pinta las mismas
 * tarjetas que la oferta de los Reyes (bendTarjetas).
 */
function elegiScreen(run: Run): void {
  const r = run.botin[run.elegi!];
  if (!r || r.k !== 'elegi') return;
  const can = host();
  const id = r.tipo === 'bendicion' ? 'bends' : r.tipo === 'amuleto' ? 'loot' : 'picks';
  const saltar = r.tipo === 'trampa' ? L('ui.elegi.saltar.oro', { n: BALANCE.cobro.sinSeleccion }) : L('ui.elegi.saltar');
  app.innerHTML = elegiHtml(run, id, `<button id="volver" class="discreto" ${can ? '' : 'disabled'}>${L('ui.elegi.volver')}</button><button id="saltar" ${can ? '' : 'disabled'}>${saltar}</button>`, bufonTientaHtml());
  montaHud(run);
  if (r.tipo === 'bendicion') bendTarjetas(run, r.opciones, $('#bends'), can ? (j) => runDo({ t: 'elegir', j }) : null);
  else if (r.tipo === 'trampa')
    r.opciones.forEach((o, j) => {
      const el = draftChoice(run, o, j);
      const carta = el.querySelector<HTMLElement>('.card');
      if (carta) dealIn(carta, 120 + j * 160);
      $('#picks').appendChild(el);
    });
  else {
    const full = run.tools.length >= toolSlots(run);
    $('#loot').classList.add('cofre');
    r.opciones.forEach((tid, j) => {
      const box = opcion40(ico40(amuletoSvg(tid), toolTip(tid), `tool:${tid}`), relN(tid), [relD(tid)], { tipo: 'amuleto', id: tid }, run, can && !full ? () => runDo({ t: 'elegir', j }) : null, 'amuleto');
      box.style.setProperty('--i', String(j));
      $('#loot').appendChild(box);
    });
    if (full) $('#loot').insertAdjacentHTML('afterend', `<p class="lead">${L('ui.run.caben.llenas', { n: toolSlots(run) })}</p>`);
  }
  $('#volver').onclick = () => runDo({ t: 'volver' });
  $('#saltar').onclick = () => runDo({ t: 'elegir', j: null });
}

// ───────────────────────── El Fogón (V40 1e · fase 3a) ─────────────────────────

/** El Fogón: dos opciones grandes, Curar o Purgar gratis (con el Cartógrafo del Altar, los dos); datos de serviciosFogon. */
function fogonScreen(run: Run): void {
  const sv = serviciosFogon(run);
  const can = host();
  app.innerHTML = `<div class="run m40 fogon">${head(run, L('ui.fogon40.titulo'), sv.ambos ? L('ui.fogon.ambos') : L('ui.fogon.sub'))}
    <div class="run-body fogon40"><div class="choices op-fila" id="fogon-opts"></div>${waitNote()}
    <div class="row elegi-pie"><button class="primary" id="go" ${can ? '' : 'disabled'}>${L('ui.botin40.seguir')}</button></div></div></div>`;
  montaHud(run);
  const curar = opcion40(ico40(hudSvg('vida')), L('ui.fogon40.curar', { n: sv.curar.vida }), [`${run.integrity} → ${Math.min(run.maxIntegrity, run.integrity + sv.curar.vida)} / ${run.maxIntegrity}`], null, run, can && sv.curar.puede ? () => (sfx.build(), runDo({ t: 'fogon', que: 'curar' })) : null, `fogon-curar${sv.curar.puede ? '' : ' usado'}`);
  curar.id = 'fogon-curar';
  const purgar = opcion40(ico40(glyphSvg('retirar', 'stamp-ico')), L('ui.fogon40.purgar'), [L('ui.run.gratis')], null, run, can && sv.purgar.puede ? () => purgarModal(run, L('ui.fogon.purgar.titulo'), (id) => runDo({ t: 'fogon', que: 'purgar', card: id })) : null, `fogon-purgar${sv.purgar.puede ? '' : ' usado'}`);
  purgar.id = 'fogon-purgar';
  $('#fogon-opts').append(curar, purgar);
  $('#go').onclick = () => runDo({ t: 'next' });
}

/** Elegir la carta que se purga (La Pulpería o el Fogón). */
function purgarModal(run: Run, titulo: string, onPick: (id: string) => void): void {
  deckModal(titulo, [{ label: L('ui.mesa.mazo'), cards: run.deck, note: L('ui.run.hoguera.nota') }], {
    pick: 1,
    onPick: ([card]) => {
      onPick(card.id);
      showBurned(card);
    },
  });
}

// ───────────────────────── La Pulpería (V40 · fase 3a) ─────────────────────────

/** El sello sin su «Sello de…» delante: «Lacre: rojo» / «Wax: Red». */
const selloCorto = (id: string) => (getLang() === 'es' ? selloN(id).replace('Sello de lacre ', '').replace('Sello de ', '').replace('Sello ', '') : selloN(id).replace(/ (wax )?seal$/i, ''));

/** Una pieza de la bandeja: su icono, el nombre, su sello y el precio gigante debajo; el detalle, en el globo. */
function offerChoice(run: Run, o: Offer, i: number): HTMLElement {
  const cost = offerCost(run, o);
  const can = host() && !o.sold && run.gold >= cost;
  const buy = can ? () => runDo({ t: 'buy', i }) : null;
  let el: HTMLElement;
  let title: string;
  let desc: string;
  let p: Pieza | null = null;
  if (o.kind === 'tool') {
    el = ico40(amuletoSvg(o.id!), '', `tool:${o.id}`);
    title = relN(o.id!);
    desc = relD(o.id!);
    p = { tipo: 'amuleto', id: o.id! };
  } else if (o.kind === 'sobre') {
    el = tileEl('sobre', L('ui.run.sobre'), 'service');
    title = L('ui.run.sobre');
    desc = L('ui.run.sobre.desc');
  } else if (o.kind === 'clandestino') {
    el = tileEl('incognita', L('ui.run.incognita'), 'service');
    title = L('ui.run.ciegas');
    desc = L('ui.run.ciegas.desc');
  } else if (o.kind === 'forja') {
    el = cardEl({ id: `forja-${i}`, suit: o.seal ? 'H' : 'S', rank: 7, seal: o.seal, tr: o.tr });
    title = o.seal ? L('ui.run.lacre', { x: selloCorto(o.seal) }) : L('ui.run.acabado', { x: acabN(o.tr!) });
    desc = L('ui.run.marca.desc', { x: o.seal ? selloD(o.seal) : acabD(o.tr!) });
  } else {
    const f = o.form!;
    const now = formBase(run, f);
    el = tileEl('pergamino', L('ui.run.pergamino'), 'service');
    title = L('ui.run.pergamino.de', { x: formN(f) });
    // V11: el Pergamino solo sube el Daño de la formación; su Multi no cambia
    desc = L('ui.run.pergamino.desc', { f: now.f, f2: now.f + FORM[f].lf, r: now.r });
  }
  const tip = `<b>${title}</b>${desc}${o.kind === 'tool' ? `<small>${rarN(TOOL[o.id!].rarity)}</small>` : ''}`;
  el.dataset.tip = tip;
  const box = opcion40(el, title, [], p, run, buy, `${o.kind === 'tool' ? 'k-tool' : 'k-otra'}${o.sold ? ' sold' : ''}`);
  box.dataset.tip = tip;
  box.insertAdjacentHTML('beforeend', `<span class="price-tag precio40 ${cost === 0 && !o.sold ? 'free' : ''} ${!o.sold && run.gold < cost ? 'dear' : ''}">${o.sold ? L('ui.pulp40.vendido') : cost === 0 ? L('ui.pulp40.gratis') : `${pintaHalo('D', 'precio-oro')}<b>${cost}</b>`}</span>`);
  return box;
}

/** Un servicio de La Pulpería: icono, nombre y precio gigante; un botón con su id de siempre (#heal, #burn, #reroll). */
function servicio40(id: string, ico: string, nombre: string, precio: number | string, tip: string, ok: boolean): string {
  return `<button type="button" class="servicio40" id="${id}" data-tip="${esc(tip)}" ${ok ? '' : 'disabled'}><span class="ico40">${ico}</span><b class="serv-n">${nombre}</b><span class="price-tag precio40">${typeof precio === 'number' ? `${pintaHalo('D', 'precio-oro')}<b>${precio}</b>` : `<b>${precio}</b>`}</span></button>`;
}

function shopScreen(run: Run): void {
  const sv = serviciosPulperia(run);
  const can = host();
  app.innerHTML = `<div class="run m40 pulp40">${head(run, L('ui.pulp40.titulo'), L('ui.run.taberna.sub', { n: run.stage }))}
    <div class="run-body shop">
      <div class="pulp-cab"><div class="pulpero" id="npc">${bufonSvg('brillo')}</div><p class="say" id="say" role="status">…</p></div>
      <div class="choices hangers bandejas" id="offers"><h3 class="bandeja-t t-amuletos">${L('ui.pulp40.amuletos')}</h3><h3 class="bandeja-t t-cartas">${L('ui.pulp40.cartas')}</h3></div>${waitNote()}
      <div class="pulp-pie">
        <div class="servicios40" role="group" aria-label="${L('ui.pulp40.servicios')}">
          ${servicio40('burn', glyphSvg('retirar', 'stamp-ico'), L('ui.pulp40.purgar'), sv.purgar.precio, L('ui.run.hoguera.tip', { p: sv.purgar.paso }), can && sv.purgar.puede)}
          ${servicio40('heal', hudSvg('vida'), `${L('ui.pulp40.curar')} +${sv.curar.vida}`, sv.curar.precio, L('ui.run.curar.tip', { v: sv.curar.vida, i: run.integrity, max: run.maxIntegrity, p: sv.curar.paso }), can && sv.curar.puede)}
          ${servicio40('reroll', glyphSvg('cajones', 'stamp-ico'), L('ui.pulp40.renovar'), sv.renovar.precio || L('ui.run.vale'), `${L('ui.run.renovar.tip', { p: sv.renovar.paso })}${sv.renovar.vales ? L('ui.run.renovar.vales', { n: sv.renovar.vales }) : ''}.`, can && sv.renovar.puede)}
        </div>
        <button class="primary" id="go" ${can ? '' : 'disabled'}>${L('ui.pulp40.volver')}</button>
      </div>
    </div></div>`;
  montaHud(run, true);
  const offers = $('#offers');
  run.shop.forEach((o, i) => offers.appendChild(offerChoice(run, o, i)));
  if (lastPhase === 'shop' && lastGold >= 0 && run.gold < lastGold) {
    sfx.coins(lastGold - run.gold), coins('#bolsa-oro', '#npc', lastGold - run.gold); // juice-ux V8: de la bolsa al Pulpero
    ferreteroSays('buy');
  } else if (lastPhase !== 'shop') ferreteroSays('hello');
  else $('#say').textContent = '…';
  $('#heal').onclick = () => (sfx.build(), runDo({ t: 'heal' }));
  $('#burn').onclick = () => purgarModal(run, L('ui.run.hoguera.titulo', { n: sv.purgar.precio }), (id) => runDo({ t: 'burn', card: id }));
  $('#reroll').onclick = () => {
    runDo({ t: 'reroll' });
    ferreteroSays('reroll');
  };
  $('#go').onclick = () => runDo({ t: 'next' });
}

/** Sobre lacrado recién abierto: tres cartas a la vista, te quedas con una. */
function openSobre(run: Run): void {
  const el = modal(`<div class="reveal-box"><small>${L('ui.run.sobre.elige')}</small><div class="choices"></div></div>`, { cls: 'reveal sobre-modal', sticky: true });
  run.sobre!.forEach((id, i) => {
    const ce = cardEl(spCard(id));
    dealIn(ce, 150 + i * 220);
    $('.choices', el).appendChild(choice(ce, espN(id), espD(id), L('ui.run.quedarmela'), () => (el.remove(), sfx.stamp(), runDo({ t: 'open', i }))));
  });
  sfx.flick();
}

/** Una decisión de campaña espera cartas: Mesa de lacre, molde o fundición. */
function openPending(run: Run): void {
  const p = run.pending!;
  const cancel = () => runDo({ t: 'cancel' });
  if (p.kind === 'forge') {
    const o = run.shop[p.i];
    const mark = o.seal ? selloN(o.seal) : acabN(o.tr!);
    const el = deckModal(L('ui.run.mesa.lacre', { x: mark }), [{ label: L('ui.mesa.mazo'), cards: run.deck, note: o.seal ? L('ui.run.mesa.lacre.sello') : L('ui.run.mesa.lacre.acabado') }], {
      pick: 1,
      sticky: true,
      can: isPlain,
      onCancel: cancel,
      onPick: ([card]) => {
        runDo({ t: 'target', cards: [card.id] });
        showForged({ ...card, ...(o.seal ? { seal: o.seal } : { tr: o.tr }) }, mark);
      },
    });
    el.classList.add('pending-modal');
    whisper('forja');
  } else if (p.kind === 'dup') {
    deckModal(L('ui.run.molde'), [{ label: L('ui.mesa.mazo'), cards: run.deck, note: L('ui.run.molde.nota') }], { pick: 1, sticky: true, onCancel: cancel, onPick: ([card]) => runDo({ t: 'target', cards: [card.id] }) }).classList.add('pending-modal');
  } else {
    deckModal(L('ui.run.caldero'), [{ label: L('ui.mesa.mazo'), cards: run.deck, note: L('ui.run.caldero.nota') }], {
      pick: 2,
      sticky: true,
      can: isPlain,
      confirm: L('ui.run.fundir'),
      onCancel: cancel,
      onPick: (cards) => (sfx.forge(), runDo({ t: 'target', cards: cards.map((c) => c.id) })),
    }).classList.add('pending-modal');
  }
}

/** La carta sale de la Mesa de lacre con su marca recién estampada. */
function showForged(card: Card, mark: string): void {
  const el = modal(`<div class="reveal-box"><small>${L('ui.run.mesa.lacre.solo')}</small><div class="choices"></div><button class="primary x">${L('ui.run.al.mazo')}</button></div>`, { cls: 'reveal forged' });
  const ce = cardEl(card);
  ce.classList.add('stamped');
  $('.choices', el).appendChild(choice(ce, cartaN(card), mark, null, null));
  sfx.forge();
  setTimeout(() => sfx.stamp(), 380);
  ferreteroSays('forge');
}

/** La carta arde en la hoguera y se va. */
function showBurned(card: Card): void {
  const el = modal(`<div class="reveal-box"><small>${L('ui.run.a.hoguera')}</small><div class="choices"></div></div>`, { cls: 'reveal burned' });
  const ce = cardEl(card, { tilt: false });
  ce.classList.add('burning');
  $('.choices', el).appendChild(choice(ce, cartaN(card), L('ui.run.para.siempre'), null, null));
  sfx.hiss();
  ferreteroSays('burn');
  const r = ce.getBoundingClientRect();
  setTimeout(() => burst(r.left + r.width / 2, r.top + r.height * 0.7, 14, [0, -90]), 350);
  setTimeout(() => el.remove(), 1500);
}

// ───────────────────────── Secretos de la cripta ─────────────────────────

function eventScreen(run: Run): void {
  const ev = EVENT[run.event!];
  app.innerHTML = `<div class="run m40 event">${head(run, L('ui.run.secreto'), L('ui.run.secreto.sub', { n: run.stage }))}
    <div class="run-body"><div class="event-box">
      <div class="event-art">${glyphSvg(EVENT_GLYPH[ev.id] ?? 'incognita', 'event-ico')}</div>
      <div class="event-txt"><h3 class="sec">${secN(ev.id)}</h3><p class="lead">${secT(ev.id)}</p>${bufonTientaHtml()}
        <div class="event-opts" id="opts"></div>${waitNote()}</div>
    </div></div></div>`;
  montaHud(run);
  ev.options.forEach((o, i) => {
    const ok = host() && (!o.can || o.can(run));
    const b = document.createElement('button');
    const et = secO(ev.id, i, 'etiqueta');
    const gana = secO(ev.id, i, 'gana');
    const cuesta = o.read.cost ? secO(ev.id, i, 'cuesta') : '';
    // V7: cada opción es una carta grabada: su emblema, lo que da (verdín) y lo que cuesta (carmesí) en
    // letra grande, y la descripción larga en segundo plano
    b.className = 'stamp-btn opt secreto';
    b.disabled = !ok;
    b.setAttribute('aria-label', `${L('ui.run.secreto.aria', { x: et, gana })}${cuesta ? L('ui.run.secreto.cuesta', { x: cuesta }) : L('ui.run.secreto.gratis')}`);
    b.innerHTML = `<span class="sec-art">${glyphSvg(o.read.glyph, 'sec-ico')}</span><span class="sec-txt"><b>${et}</b><span class="sec-da"><i>${L('ui.run.da')}</i>${gana}</span><span class="sec-cuesta${cuesta ? '' : ' gratis'}"><i>${L('ui.run.cuesta')}</i>${cuesta || L('ui.run.nada')}</span><small>${secO(ev.id, i, 'desc')}</small></span>`;
    b.onclick = () => (sfx.stamp(), runDo({ t: 'event', i }));
    $('#opts').appendChild(b);
  });
  revealOptions($('#opts')); // juice-ux: se dan vuelta de una en una y el foco cae en la primera
}

/** V35 · lo que dio el santuario: el gajo de la rueda, el doble o nada, el altar o el dado. */
function suerteCartel(run: Run): void {
  const s = run.suerte!;
  const k = `suerte.${s.clave}`;
  const vals = { ...s.datos, x: s.bendicion ? t(`bendicion.${s.bendicion}.nombre`) : s.reliquia ? relN(s.reliquia) : '', r: s.rey ? t(`rey.${s.rey}.nombre`) : '' };
  const el = modal(
    `<div class="reveal-box suerte ${s.buena ? 'buena' : 'mala'}"><small>${L('ui.run.suerte')}</small><h2>${t(`${k}.titulo`, vals)}</h2><p class="lead">${t(`${k}.texto`, vals)}</p>${s.reliquia ? '<div class="choices"></div>' : ''}<button class="primary x">${L('ui.run.suerte.ok')}</button></div>`,
    { cls: 'reveal suerte-modal' },
  );
  if (s.reliquia) $('.choices', el).appendChild(choice(toolTile(s.reliquia), relN(s.reliquia), relD(s.reliquia), null, null));
  if (s.buena) sfx.coins(12);
  else sfx.hiss();
}

// ───────────────────────── Crónica ─────────────────────────

/** La crónica en texto, para pegarla donde quieras. */
export function actaText(run: Run, online = false): string {
  const link = seedLink(run, online);
  const cleared = stagesCleared(run);
  const row = Array.from({ length: LAST_STAGE }, (_, i) => {
    const n = i + 1;
    if (n <= cleared) return '🟥';
    return n === cleared + 1 && !run.conquered ? '💀' : '⬛';
  }).join('');
  const mvp = mvpTool(run);
  const depth = depthOf(run);
  return [
    `${L('ui.acta.texto.cab', { marca: marca().fullTitle })}`,
    `${row} ${run.conquered ? L('ui.acta.texto.corte') : L('ui.acta.texto.asalto', { n: Math.min(cleared, LAST_STAGE), total: LAST_STAGE })}${depth ? L('ui.acta.texto.infinito', { n: depth }) : ''}`,
    L('ui.acta.texto.mayor', { n: run.stats.maxHit }),
    L('ui.acta.texto.guardias', { g: run.stats.floors, e: run.stats.cleans }),
    mvp ? L('ui.acta.texto.mvp', { x: TOOL[mvp] ? relN(mvp) : mvp, n: run.stats.toolUse[mvp] }) : L('ui.acta.texto.sin'),
    L('ui.acta.texto.jur', { j: run.stats.contracts, q: run.stats.burned, t: run.stats.turns }),
    `🃏 ${barN(run.deckId)}${run.ascension ? L('ui.acta.texto.reinado', { n: run.ascension + 1 }) : ''}${run.seedText ? ` · 🌱 ${run.seedText}` : ''}`,
    ...(run.phase === 'lost' && validDeath(run.death) ? [causeText(run.death)] : []),
    ...(link ? [L('ui.acta.texto.link', { x: link })] : []),
  ].join('\n');
}

/** Tinta desvanecida al pie de la crónica mientras quede por leer (data-mas, como pide la QA). */
function inkFade(el: HTMLElement): void {
  const mark = () => {
    const more = [el.scrollTop > 2 ? 'arriba' : '', el.scrollTop + el.clientHeight < el.scrollHeight - 2 ? 'abajo' : ''].filter(Boolean).join(' ');
    if (more) el.dataset.mas = more;
    else delete el.dataset.mas;
  };
  el.addEventListener('scroll', mark, { passive: true });
  addEventListener('resize', mark);
  mark();
}

function actaScreen(run: Run): void {
  const won = run.phase === 'won';
  if (lastPhase !== run.phase) won ? sfx.win() : sfx.lose();
  const c = S.campaign!;
  const canBack = !c.online || S.lobby?.host === S.session?.playerId;
  const mvp = mvpTool(run);
  const cleared = stagesCleared(run);
  const depth = depthOf(run);
  const stats: [string, string][] = [
    [L('ui.acta.superados'), `${L('ui.acta.superados.v', { n: Math.min(cleared, LAST_STAGE), total: LAST_STAGE })}${depth ? L('ui.acta.superados.inf', { n: depth }) : ''}`],
    [L('ui.acta.mayor'), cifraEl(run.stats.maxHit, 'record')],
    [L('ui.acta.guardias'), String(run.stats.floors)],
    [L('ui.acta.exactos'), String(run.stats.cleans)],
    [L('ui.acta.mvp'), mvp ? `${TOOL[mvp] ? relN(mvp) : mvp} · ${run.stats.toolUse[mvp]}` : '—'],
    [L('ui.acta.juramentos'), String(run.stats.contracts)],
    [L('ui.acta.saltados'), String(run.stats.skips)],
    [L('ui.acta.sellos'), String(run.stats.forged)],
    [L('ui.acta.destruidas'), String(run.stats.burned)],
    [L('ui.acta.turnos'), String(run.stats.turns)],
    [L('ui.acta.oro'), cifraEl(run.stats.gold, 'oro')],
  ];
  // la causa de la derrota (si la campaña cayó en la mesa) y el enlace para jugar la misma
  const death = !won && validDeath(run.death) ? run.death : null;
  const link = seedLink(run, c.online);
  const seed = run.seedText || (c.online ? L('ui.acta.servidor') : '—');
  // V33: del cobro al Árbol en un clic (en solitario: en conjura de varios se vuelve a la sala)
  const sig = c.online ? null : siguienteMejora(meta);
  app.innerHTML = `<div class="end ${won ? 'won' : 'lost'} in-page acta">
    ${won ? rubble('H', 'end-art') : skyline('end-art')}
    <div class="acta-sheet">
      <div class="meta"><span class="hot">${L('ui.acta.cronica')}</span><span>${barN(run.deckId)}${run.ascension ? L('ui.acta.reinado.cab', { n: run.ascension + 1 }) : ''}</span></div>
      <h1>${won ? L('ui.fin.corte') : L('ui.fin.conjura')}</h1>
      <div class="acta-cols">
        <div class="acta-izq">
          <p>${won ? L('ui.acta.ganada') : depth ? L('ui.acta.infinito', { n: depth + 1 }) : L('ui.acta.perdida', { n: run.stage, nombre: asaltoN(run.stage) })}</p>
          ${death ? causeHtml(death) : ''}
          ${cobroHtml(run, won, sig)}
          <p class="acta-semilla"><span>${L('ui.acta.semilla')}</span><b>${esc(seed)}</b>${link ? `<small>${L('ui.acta.semilla.nota')}</small>` : ''}</p>
        </div>
        <table class="acta-stats">${stats.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
      </div>
      ${feedbackHtml('acta')}
      <div class="row acta-acciones">
        <button class="tinta" id="lamina-dl">${L('ui.acta.descargar')}</button>
        <button class="tinta" id="lamina-copy">${L('ui.acta.copiar.lamina')}</button>
        <button class="tinta" id="copy">${L('ui.acta.copiar')}</button>
        ${won && canBack ? `<button id="deeper">${L('ui.acta.infinito.btn')}<small>${L('ui.acta.infinito.sub')}</small></button>` : ''}
        ${c.online ? (canBack ? `<button class="primary" id="c-room">${L('ui.acta.sala')}</button>` : `<button disabled>${L('ui.fin.esperando')}</button>`) : `<button class="${sig && !sig.falta ? 'tinta' : 'primary'}" id="c-hub">${L('ui.acta.portada')}</button>`}
      </div>
    </div>
  </div>`;
  const sheet = $('.acta-sheet');
  stampOn(sheet, won ? L('ui.fin.corte') : L('ui.acta.deshecha'), won ? 's-done big' : 's-skip big');
  inkFade(sheet);
  const copyText = (text: string, ok: string) => {
    const done = () => toast(ok);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  };
  $('#copy').onclick = () => copyText(actaText(run, c.online), L('ui.acta.copiada'));
  bindFeedback(sheet);
  const lamina = laminaOf(run, c.online);
  $('#lamina-dl').onclick = () => void downloadLamina(lamina);
  $('#lamina-copy').onclick = () =>
    void copyLamina(lamina, actaText(run, c.online)).then((what) => {
      if (what === 'png') toast(L('ui.acta.lamina.copiada'));
      else if (what === 'text') toast(L('ui.acta.lamina.texto'));
      else copyText(actaText(run, c.online), L('ui.acta.copiada.texto'));
    });
  const deeper = $('#deeper');
  if (deeper) deeper.onclick = () => runDo({ t: 'endless' });
  const hub = $('#c-hub');
  if (hub)
    hub.onclick = () => {
      S.campaign = null;
      setScreen('home');
    };
  const room = $('#c-room');
  if (room) room.onclick = () => sendMsg({ t: 'lobby' });
  const arbol = $('#c-arbol');
  if (arbol && sig)
    arbol.onclick = () => {
      S.campaign = null;
      abrirEn(sig.id);
      openGuild('ups');
    };
}

/**
 * V33 · El cobro de la campaña y lo que se puede hacer con él: cuántas esquirlas hay, qué mejora del Árbol se propone
 * (la más barata que ya se puede pagar; si no alcanza para ninguna, la más barata abierta y cuánto falta) y el botón que
 * abre el Árbol con esa mejora elegida.
 */
function cobroHtml(run: Run, won: boolean, sig: ReturnType<typeof siguienteMejora>): string {
  const gain = `<p class="gain">${L('ui.acta.coronas', { n: lastGain })}${won && !run.endless && run.ascension < 7 ? L('ui.acta.desbloqueado', { n: run.ascension + 2 }) : ''}</p>`;
  if (!sig) return gain;
  const datos = { s: cifra(meta.renown), x: mejN(sig.id), n: cifra(sig.coste), f: cifra(sig.falta), e: efectoSiguiente(meta, sig.id) };
  const pct = Math.round((100 * Math.min(meta.renown, sig.coste)) / Math.max(1, sig.coste));
  return `<div class="acta-cobro${sig.falta ? '' : ' alcanza'}">
            ${gain}
            <p class="cobro-sig">${L(sig.falta ? 'ui.acta.arbol.falta' : 'ui.acta.arbol.alcanza', datos)}</p>
            ${sig.falta ? `<i class="cobro-barra" aria-hidden="true" style="--p:${pct}%"></i>` : ''}
            <button id="c-arbol" class="${sig.falta ? 'tinta' : 'primary'}">${L(sig.falta ? 'ui.acta.arbol.ver' : 'ui.acta.arbol.btn')}<small>${L('ui.acta.arbol.sub', { s: datos.s })}</small></button>
          </div>`;
}

function fallbackCopy(text: string, done: () => void): void {
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    toast(L('ui.acta.no.copiar'));
  }
  ta.remove();
}
