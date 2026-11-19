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
import { beltEl, bindFeedback, choice, deckModal, feedbackHtml, spCard, toolTile } from './widgets';
import { ritualDelBotin } from './ritual';
import { opcionTexto, reyesPills } from './reyes-ui';
import { fraseBufonOferta } from '../rules/reyes';
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
function head(run: Run, h1: string, sub: string): string {
  return `<header class="deck-head"><div><h1>${h1}</h1><p class="sub">${sub} · ${barN(run.deckId)} · ${L('ui.run.cabeza', { v: run.integrity, max: run.maxIntegrity, n: run.deck.length })}</p></div><div class="purse">${cifraEl(run.gold, 'oro', 'b', 'id="purse-n"')}<span>${L('ui.run.de.oro')}</span></div></header>`;
}
/** V27 · las Reliquias que había la última vez que se pintó la tira: la que llega nueva se marca y se dice dónde se colocó. */
let beltAntes: string[] | null = null;
/** Las Reliquias en las pantallas de campaña: aquí se reordenan con calma (y en la Taberna se venden). */
function beltStrip(run: Run, sell = false): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'run-belt';
  const ids = run.tools.map((t) => t.id);
  const nuevas = beltAntes ? ids.filter((id) => !beltAntes!.includes(id)) : [];
  beltAntes = ids;
  wrap.innerHTML = `<span class="belt-label">${L('ui.mesa.reliquias')} <small>${L('ui.run.reliquias.orden', { n: run.tools.length, total: toolSlots(run) })}</small></span>`;
  wrap.appendChild(
    beltEl(run.tools, {
      slots: toolSlots(run),
      onSell: sell && host() ? (i) => confirmSell(run, i) : undefined,
      sellValue,
    }),
  );
  wrap.insertAdjacentHTML('beforeend', `<button id="deck-view">${L('ui.run.ver.mazo', { n: run.deck.length })}</button>`);
  // la Reliquia recién llegada lleva un filete de latón (V31: su hueco ya no cambia la cuenta, así que no se anuncia)
  for (const n of nuevas) wrap.querySelector(`.belt-slot[data-id="${CSS.escape(n)}"]`)?.classList.add('recien');
  return wrap;
}
function confirmSell(run: Run, i: number): void {
  const t = run.tools[i];
  if (!t) return;
  const el = modal(`<div class="modal-box confirm"><h2>${L('ui.run.vender.titulo', { x: relN(t.id) })}</h2><p>${L('ui.run.vender.texto', { n: sellValue(t.id) })} ${relD(t.id)}</p><div class="row"><button class="x">${L('ui.no')}</button><button class="primary" id="yes">${L('ui.run.vender')}</button></div></div>`);
  $('#yes', el).onclick = () => {
    el.remove();
    runDo({ t: 'sell', i });
    sfx.coins(sellValue(t.id)), coins('#npc', '.purse b', sellValue(t.id)); // juice-ux V8: del Tratante a la bolsa
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
  app.innerHTML = `<div class="run">${head(run, L('ui.run.sobre.titulo'), `${L('ui.run.sobre.sub', { n: run.ascension + 1 })}${run.seedText ? L('ui.run.sobre.semilla', { s: run.seedText }) : ''}`)}
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

// ───────────────────────── La oferta de Bendiciones (V40 1c) ─────────────────────────

/**
 * Los Reyes ofrecen: una tarjeta por Bendición con su Rey, su efecto, su condición de carga y el nivel que deja. Se
 * elige con el ratón, con Enter/Espacio sobre la que tiene el foco o con el mando (A); las flechas y la cruceta
 * mueven el foco (nav.ts, que conoce `.choice.pick`).
 */
function bendicionScreen(run: Run): void {
  const op = run.oferta ?? [];
  const mias = reyesPills(run.bendiciones, run.tools);
  app.innerHTML = `<div class="run">${head(run, L('ui.run.bend.titulo'), `${L('ui.run.bend.sub')} · ${asaltoN(run.stage)}`)}
    <div class="run-body"><p class="lead">${L('ui.run.bend.texto')}</p>
    <p class="bufon-dice"><i>${t(fraseBufonOferta(run.id, run.stage))}</i></p>
    <div class="choices" id="bends"></div>
    ${mias ? `<section class="bend-mias"><h3 class="sec">${L('ui.run.bend.llevas')}</h3><div class="rasgos">${mias}</div></section>` : ''}${waitNote()}
    <div class="row end-row"><button id="deck-view">${L('ui.run.ver.mazo', { n: run.deck.length })}</button></div></div></div>`;
  bendTarjetas(run, op, $('#bends'), host() ? (i) => runDo({ t: 'bendicion', i }) : null);
}

/** Las tarjetas de Bendición (la oferta de los Reyes y la «Elegí una» del Botín): Rey, efecto, carga, nivel, sello y ★. */
function bendTarjetas(run: Run, op: OpcionBend[], host_: HTMLElement, pick: ((i: number) => void) | null): void {
  op.forEach((o, i) => {
    const tx = opcionTexto(run.bendiciones, o, run.tools, marcaPieza({ tipo: 'bendicion', id: o.id }, contextoDe(run)));
    const box = choice(tileEl('jefe', tx.titulo, 'service'), tx.titulo, tx.desc, L('ui.run.bend.tomar'), pick ? () => pick(i) : null, `bend r-${o.rey}${tx.info.dual ? ' dual' : ''}`);
    box.dataset.bend = o.id;
    box.dataset.i = String(i);
    box.style.setProperty('--i', String(i));
    host_.appendChild(box);
  });
}

// ───────────────────────── El Mapa de caminos (V40 1e) ─────────────────────────

/** El emblema de cada tipo de nodo (de GLYPH; arte-ui los dibujará propios). */
const NODO_GLIFO: Record<TipoNodo, string> = { guardia: 'bastion', bravo: 'escudo_roto', pulperia: 'cajones', santuario: 'comodin', fogon: 'horno', rey: 'jefe' };
const tipoN = (t: TipoNodo) => L(`ui.mapa.tipo.${t}` as ClaveUi);

/** Lo que dice un nodo del Mapa: qué es y qué Botín deja (botinPrevisto, de las reglas). */
function nodoTexto(run: Run, n: NodoMapa): string {
  const def = stageDef(n.tramo);
  if (n.tipo === 'bravo') return L('ui.mapa.desc.bravo', { palo: n.palo ? paloN(n.palo) : '', v: num(MAPA_CFG.bravo.vida), a: MAPA_CFG.bravo.ataque });
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
 * El Mapa: el tramo que lleva al próximo asalto, de abajo (el asalto anterior) arriba (el que viene), con sus aristas.
 * Cada nodo es un botón (`#mn-<id>`, `data-tipo`); los alcanzables (`.alcanzable`) se pulsan con ratón, Enter o A, y
 * la cruceta va de uno a otro (nav.ts no conoce el Mapa: busca el pulsable más cercano).
 */
function mapScreen(run: Run): void {
  const m = run.mapa;
  const lo = filaAsalto(Math.max(1, run.stage - 1));
  const hi = filaAsalto(Math.max(2, run.stage));
  const filas = hi - lo + 1;
  const vis = m.nodos.filter((n) => n.fila >= lo && n.fila <= hi);
  const ya = new Set(m.hechos);
  const puede = new Set(alcanzables(m));
  const x = (n: NodoMapa) => n.col * 100 + 50;
  const y = (n: NodoMapa) => (hi - n.fila) * 100 + 50;
  const lineas = vis
    .flatMap((n) => n.hacia.map((h) => [n, m.nodos[h]] as const))
    .filter(([, h]) => h && h.fila <= hi)
    .map(([a, b]) => `<line class="${ya.has(a.id) && (ya.has(b.id) || puede.has(b.id)) ? 'hecha' : ''}" x1="${x(a)}" y1="${y(a)}" x2="${x(b)}" y2="${y(b)}" vector-effect="non-scaling-stroke"/>`)
    .join('');
  const can = host();
  const nodos = vis
    .map((n) => {
      const estado = n.id === m.en ? 'aqui' : ya.has(n.id) ? 'hecho' : puede.has(n.id) ? 'alcanzable' : 'lejos';
      const tip = `<b>${tipoN(n.tipo)}</b>${nodoTexto(run, n)}${nodoBotin(run, n) ? `<hr>${nodoBotin(run, n)}` : ''}`;
      const palo = n.palo ? `<i class="s-${n.palo}">${suitSvg(n.palo)}</i>` : '';
      return `<button type="button" id="mn-${n.id}" class="nodo-mapa t-${n.tipo} ${estado}" data-tipo="${n.tipo}" data-mn="${n.id}" style="grid-row:${hi - n.fila + 1};grid-column:${n.col + 1}" ${estado === 'alcanzable' && can ? '' : 'disabled'} ${estado === 'aqui' ? 'aria-current="step"' : ''} data-tip="${esc(tip)}" aria-label="${esc(`${tipoN(n.tipo)}. ${nodoBotin(run, n)}`)}">${glyphSvg(NODO_GLIFO[n.tipo], 'stamp-ico')}<b>${tipoN(n.tipo)}${n.asalto ? ` ${n.tramo}` : ''}</b>${palo}${estado === 'aqui' ? `<small>${L('ui.mapa.aqui')}</small>` : ''}</button>`;
    })
    .join('');
  // la lista de lo alcanzable, con su Botín a la vista (para leer sin globos)
  app.innerHTML = `<div class="run map">${head(run, L('ui.mapa.titulo'), `${L('ui.mapa.sub', { n: run.stage })}${run.stage <= LAST_STAGE ? L('ui.run.mapa.de', { n: LAST_STAGE }) : ''} · ${asaltoN(run.stage)}`)}
    <div class="run-body">
      <div class="desk"><div class="blueprint mapa-ramas"><div class="bp-title">${L('ui.mapa.titulo')}${run.endless ? L('ui.run.mapa.infinito') : ''}</div>
        <div class="mapa-grid" style="--filas:${filas}"><svg class="mapa-aristas" viewBox="0 0 300 ${filas * 100}" preserveAspectRatio="none" aria-hidden="true">${lineas}</svg>${nodos}</div></div></div>
      <h3 class="sec">${L('ui.mapa.elegi')}</h3>
      <div class="choices routes" id="routes"></div>${waitNote()}
      <div id="belt-host"></div>
    </div></div>`;
  $('#belt-host').appendChild(beltStrip(run));
  const ir = (id: number) => (sfx.stamp(), runDo({ t: 'ir', nodo: id }));
  $$('.nodo-mapa.alcanzable').forEach((b) => (b.onclick = () => ir(Number(b.dataset.mn))));
  const routes = $('#routes');
  for (const id of alcanzables(m)) {
    const n = m.nodos[id];
    const box = choice(tileEl(NODO_GLIFO[n.tipo], tipoN(n.tipo), 'service'), tipoN(n.tipo), `${nodoTexto(run, n)}${nodoBotin(run, n) ? ` <b>${nodoBotin(run, n)}.</b>` : ''}`, L('ui.mapa.ir'), can ? () => ir(id) : null, `nodo t-${n.tipo}${n.tipo === 'bravo' ? ' risk' : ''}`);
    box.dataset.tipo = n.tipo;
    box.dataset.i = String(id);
    routes.appendChild(box);
  }
  if (run.stage === 2 && m.en >= 0 && m.nodos[m.en]?.asalto) whisper('atajo');
}

// ───────────────────────── El Botín y la «Elegí una» (V40 1e) ─────────────────────────

function draftChoice(run: Run, o: DraftOpt, i: number): HTMLElement {
  const click = host() ? () => runDo({ t: 'elegir', j: i }) : null;
  if (o.kind === 'special') return choice(cardEl(spCard(o.id)), espN(o.id), `${espD(o.id)}${marcaPieza({ tipo: 'trampa', id: o.id }, contextoDe(run))}`, L('ui.run.llevar'), click);
  const c = o.card;
  const what = [c.tr ? `<b>${acabN(c.tr)}.</b> ${acabD(c.tr)}` : '', c.seal ? `<b>${selloN(c.seal)}.</b> ${selloD(c.seal)}` : ''].filter(Boolean).join(' ');
  return choice(cardEl(c), cartaN(c), what, L('ui.run.llevar'), click);
}

/** Cómo se nombra una recompensa del Botín. */
function recompensaN(run: Run, r: Recompensa): { glifo: string; titulo: string; desc: string } {
  if (r.k === 'oro') return { glifo: 'oro', titulo: L('ui.botin.oro'), desc: L('ui.run.total.oro', { n: r.n }) };
  if (r.k === 'amuleto') return { glifo: r.id, titulo: relN(r.id), desc: relD(r.id) };
  const que = L(`ui.elegi.${r.tipo}` as ClaveUi);
  return { glifo: r.tipo === 'bendicion' ? 'jefe' : r.tipo === 'amuleto' ? 'contenedor' : 'naipes_par', titulo: `${L('ui.elegi.titulo')}: ${que}`, desc: L('ui.elegi.sub', { x: r.opciones.length === 1 ? que : `${r.opciones.length} · ${que}` }) };
}

/** El Botín tras un combate: cada recompensa se cobra (o se abre su «Elegí una») o se salta; «Seguir» vuelve al Mapa. */
function rewardScreen(run: Run): void {
  if (run.elegi !== null) return elegiScreen(run);
  const total = run.pay.reduce((a, [, n]) => a + n, 0);
  const bravo = run.combate === 'bravo';
  const can = host();
  app.innerHTML = `<div class="run">${head(run, L('ui.run.botin.titulo'), bravo ? L('ui.botin.bravo') : run.endless && run.stage === LAST_STAGE ? L('ui.run.botin.infinito') : L('ui.run.botin.sub', { n: run.stage, nombre: asaltoN(run.stage) }))}
    <div class="run-body two">
      <section class="panel paybox"><h3><span>${L('ui.run.botin')}</span><span>+${total}</span></h3>
        <table class="pay">${run.pay.map(([l, n]) => `<tr><td>${cobroFor(getLang(), l)}</td><td>+${n}</td></tr>`).join('')}<tr class="sum"><td>${L('ui.run.total')}</td><td>${L('ui.run.total.oro', { n: total })}</td></tr></table>
      </section>
      <section>
        <h3 class="sec">${L('ui.run.botin')}</h3>
        <div class="botin-lista" id="botin"></div>
        <p class="lead">${L('ui.botin.pierde')}</p>
        ${waitNote()}
        <div class="row end-row"><button class="primary" id="seguir" ${can ? '' : 'disabled'}>${L('ui.botin.seguir')}</button></div>
        <div id="belt-host"></div>
      </section>
    </div></div>`;
  if (lastPhase !== 'reward') sfx.coins(total);
  // V12: la tirada de huesos del asalto recién ganado, una vez, sobre el Botín
  if (!bravo) ritualDelBotin(`${run.id}:${run.stage}`, run.ritual?.asalto === run.stage ? run.ritual : null);
  $('#belt-host').appendChild(beltStrip(run));
  const full = run.tools.length >= toolSlots(run);
  run.botin.forEach((r, i) => {
    const tx = recompensaN(run, r);
    const fila = document.createElement('div');
    fila.className = `botin-fila k-${r.k} ${r.estado}`;
    fila.dataset.i = String(i);
    const ico = r.k === 'amuleto' ? toolTile(r.id) : tileEl(tx.glifo, tx.titulo, 'service');
    fila.appendChild(ico);
    fila.insertAdjacentHTML('beforeend', `<div class="botin-tx"><b>${tx.titulo}</b><small>${tx.desc}</small></div>`);
    if (r.estado === 'abierta') {
      const bloqueado = r.k === 'amuleto' && full;
      fila.insertAdjacentHTML('beforeend', `<div class="botin-acc"><button class="primary cobrar" ${can && !bloqueado ? '' : 'disabled'}>${bloqueado ? L('ui.run.llenas') : r.k === 'elegi' ? L('ui.botin.abrir') : L('ui.botin.cobrar')}</button><button class="saltar" ${can ? '' : 'disabled'}>${r.k === 'elegi' && r.tipo === 'trampa' ? L('ui.elegi.saltar.oro', { n: BALANCE.cobro.sinSeleccion }) : L('ui.botin.saltar')}</button></div>`);
      $('.cobrar', fila).onclick = () => (sfx.stamp(), runDo({ t: 'cobrar', i }));
      $('.saltar', fila).onclick = () => runDo({ t: 'saltar', i });
    } else fila.insertAdjacentHTML('beforeend', `<i class="inkstamp ${r.estado === 'tomada' ? 's-done' : 's-skip'}">${r.estado === 'tomada' ? L('ui.botin.tomada') : L('ui.botin.saltada')}</i>`);
    $('#botin').appendChild(fila);
  });
  $('#seguir').onclick = () => runDo({ t: 'seguir' });
}

/**
 * La «Elegí una» abierta (`run.elegi`): tres opciones con su sello S·A·B y su ★ Sinergia (marcaPieza), «Saltar» y
 * «Volver al Botín». La de Bendición pinta las mismas tarjetas que la oferta de los Reyes (bendTarjetas).
 */
function elegiScreen(run: Run): void {
  const r = run.botin[run.elegi!];
  if (!r || r.k !== 'elegi') return;
  const can = host();
  const que = L(`ui.elegi.${r.tipo}` as ClaveUi);
  app.innerHTML = `<div class="run elegi-una">${head(run, L('ui.elegi.titulo'), L('ui.elegi.sub', { x: que }))}
    <div class="run-body">${r.tipo === 'bendicion' ? `<p class="bufon-dice"><i>${t(fraseBufonOferta(run.id, run.stage))}</i></p>` : ''}
    <div class="choices" id="${r.tipo === 'bendicion' ? 'bends' : r.tipo === 'amuleto' ? 'loot' : 'picks'}"></div>${waitNote()}
    <div class="row end-row"><button id="volver" ${can ? '' : 'disabled'}>${L('ui.elegi.volver')}</button><button id="saltar" ${can ? '' : 'disabled'}>${r.tipo === 'trampa' ? L('ui.elegi.saltar.oro', { n: BALANCE.cobro.sinSeleccion }) : L('ui.elegi.saltar')}</button><button id="deck-view">${L('ui.run.ver.mazo', { n: run.deck.length })}</button></div>
    <div id="belt-host"></div></div></div>`;
  $('#belt-host').appendChild(beltStrip(run));
  if (r.tipo === 'bendicion') bendTarjetas(run, r.opciones, $('#bends'), can ? (j) => runDo({ t: 'elegir', j }) : null);
  else if (r.tipo === 'trampa')
    r.opciones.forEach((o, j) => {
      const el = draftChoice(run, o, j);
      dealIn($('.card', el), 120 + j * 160);
      $('#picks').appendChild(el);
    });
  else {
    const full = run.tools.length >= toolSlots(run);
    $('#loot').classList.add('cofre');
    r.opciones.forEach((id, j) => {
      const box = choice(toolTile(id), relN(id), `${relD(id)}${marcaPieza({ tipo: 'amuleto', id }, contextoDe(run))}`, full ? L('ui.run.llenas') : L('ui.run.llevar'), can && !full ? () => runDo({ t: 'elegir', j }) : null);
      box.style.setProperty('--i', String(j));
      $('#loot').appendChild(box);
    });
    if (full) $('#loot').insertAdjacentHTML('afterend', `<p class="lead">${L('ui.run.caben.llenas', { n: toolSlots(run) })}</p>`);
  }
  $('#volver').onclick = () => runDo({ t: 'volver' });
  $('#saltar').onclick = () => runDo({ t: 'elegir', j: null });
}

// ───────────────────────── El Fogón (V40 1e) ─────────────────────────

/** El Fogón: Curar o Purgar gratis, uno de los dos (con el Cartógrafo del Altar, los dos); los datos, de serviciosFogon. */
function fogonScreen(run: Run): void {
  const sv = serviciosFogon(run);
  const can = host();
  app.innerHTML = `<div class="run fogon">${head(run, L('ui.fogon.titulo'), sv.ambos ? L('ui.fogon.ambos') : L('ui.fogon.sub'))}
    <div class="run-body"><div class="choices" id="fogon-opts"></div>${waitNote()}
    <div class="row end-row"><button id="deck-view">${L('ui.run.ver.mazo', { n: run.deck.length })}</button><button class="primary" id="go" ${can ? '' : 'disabled'}>${L('ui.fogon.seguir')}</button></div>
    <div id="belt-host"></div></div></div>`;
  $('#belt-host').appendChild(beltStrip(run));
  const usado = (ok: boolean) => (ok ? L('ui.run.gratis') : L('ui.fogon.usado'));
  const curar = choice(tileEl('reparacion', L('ui.fogon.curar'), 'service'), L('ui.fogon.curar'), L('ui.fogon.curar.desc', { n: sv.curar.vida, i: run.integrity, max: run.maxIntegrity }), usado(sv.curar.puede), can && sv.curar.puede ? () => (sfx.build(), runDo({ t: 'fogon', que: 'curar' })) : null, 'fogon-curar');
  curar.id = 'fogon-curar';
  const purgar = choice(tileEl('retirar', L('ui.fogon.purgar'), 'service'), L('ui.fogon.purgar'), L('ui.fogon.purgar.desc'), usado(sv.purgar.puede), can && sv.purgar.puede ? () => purgarModal(run, L('ui.fogon.purgar.titulo'), (id) => runDo({ t: 'fogon', que: 'purgar', card: id })) : null, 'fogon-purgar');
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

// ───────────────────────── La Taberna ─────────────────────────

/** El sello sin su «Sello de…» delante: «Lacre: rojo» / «Wax: Red». */
const selloCorto = (id: string) => (getLang() === 'es' ? selloN(id).replace('Sello de lacre ', '').replace('Sello de ', '').replace('Sello ', '') : selloN(id).replace(/ (wax )?seal$/i, ''));

function offerChoice(run: Run, o: Offer, i: number): HTMLElement {
  const cost = offerCost(run, o);
  const can = host() && !o.sold && run.gold >= cost;
  const buy = can ? () => runDo({ t: 'buy', i }) : null;
  let el: HTMLElement;
  let title: string;
  let desc: string;
  if (o.kind === 'tool') {
    el = toolTile(o.id!);
    title = relN(o.id!);
    desc = `${relD(o.id!)} <small>${rarN(TOOL[o.id!].rarity)}</small>${marcaPieza({ tipo: 'amuleto', id: o.id! }, contextoDe(run))}`;
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
  const box = choice(el, title, desc, null, buy, o.sold ? 'sold hang' : 'hang');
  box.insertAdjacentHTML('afterbegin', `<span class="price-tag ${cost === 0 && !o.sold ? 'free' : ''} ${!o.sold && run.gold < cost ? 'dear' : ''}">${o.sold ? L('ui.run.vendido') : cost === 0 ? L('ui.run.gratis') : `<b>${cost}</b> ${L('ui.run.de.oro')}`}</span>`);
  if (o.sold) stampOn(box, L('ui.run.vendido'), 's-skip');
  return box;
}

function shopScreen(run: Run): void {
  const nextN = run.stage;
  const sv = serviciosPulperia(run);
  const next = stageDef(nextN);
  const boss = run.bosses[nextN] ? BOSS[run.bosses[nextN]] : null;
  const can = host();
  app.innerHTML = `<div class="run">${head(run, L('ui.run.taberna'), `${L('ui.run.taberna.sub', { n: run.stage })}`)}
    <div class="run-body shop">
      <aside class="keeper"><div id="npc"></div><p class="say" id="say">…</p></aside>
      <section class="stock"><div class="rail"></div><div class="choices hangers" id="offers"></div>${waitNote()}<div id="belt-host"></div></section>
      <aside class="shop-side">
        <div class="panel next"><h3><span>${L('ui.run.siguiente')}</span><span>${nextN}${nextN <= LAST_STAGE ? `/${LAST_STAGE}` : ''}</span></h3>
          <div class="next-row"><div id="next-boss"></div><div>
          <p><b>${asaltoN(nextN)}</b> · ${Ln(next.floors.length, 'ui.run.guardias.1', 'ui.run.guardias.n')}${L('ui.run.vida.x', { n: num(next.hp) })}</p>
          ${boss ? `<p class="boss"><b>${monN(boss.id)} · ${monDec(boss.id)}</b>${monD(boss.id)}</p>` : next.boss ? L('ui.run.monarca.sabra') : L('ui.run.sin.monarca')}</div></div></div>
        <div class="grid2">
          <button id="heal" data-tip="${L('ui.run.curar.tip', { v: sv.curar.vida, i: run.integrity, max: run.maxIntegrity, p: sv.curar.paso })}" ${can && sv.curar.puede ? '' : 'disabled'}>${L('ui.run.curar', { n: sv.curar.precio })}</button>
          <button id="burn" data-tip="${L('ui.run.hoguera.tip', { p: sv.purgar.paso })}" ${can && sv.purgar.puede ? '' : 'disabled'}>${L('ui.run.hoguera', { n: sv.purgar.precio })}</button>
          <button id="reroll" data-tip="${L('ui.run.renovar.tip', { p: sv.renovar.paso })}${sv.renovar.vales ? L('ui.run.renovar.vales', { n: sv.renovar.vales }) : ''}." ${can && sv.renovar.puede ? '' : 'disabled'}>${L('ui.run.renovar', { x: sv.renovar.precio || L('ui.run.vale') })}</button>
          <button class="primary" id="go" ${can ? '' : 'disabled'}>${L('ui.run.al.mapa')}</button>
        </div>
      </aside>
    </div></div>`;
  $('#npc').appendChild(ferreteroEl());
  $('#belt-host').appendChild(beltStrip(run, true));
  if (boss) $('#next-boss').appendChild(portraitEl(`j-${boss.id}`, monN(boss.id)));
  $('#offers').style.setProperty('--n', String(run.shop.length));
  $('#offers').style.setProperty('--n2', String(Math.ceil(run.shop.length / 2))); // V11: en dos filas si no caben
  run.shop.forEach((o, i) => $('#offers').appendChild(offerChoice(run, o, i)));
  if (lastPhase === 'shop' && lastGold >= 0 && run.gold < lastGold) {
    sfx.coins(lastGold - run.gold), coins('.purse b', '#npc', lastGold - run.gold); // juice-ux V8: de la bolsa al Tratante
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
  app.innerHTML = `<div class="run event">${head(run, L('ui.run.secreto'), L('ui.run.secreto.sub', { n: run.stage }))}
    <div class="run-body"><div class="event-box">
      <div class="event-art">${glyphSvg(EVENT_GLYPH[ev.id] ?? 'incognita', 'event-ico')}</div>
      <div class="event-txt"><h3 class="sec">${secN(ev.id)}</h3><p class="lead">${secT(ev.id)}</p>
        <div class="event-opts" id="opts"></div>${waitNote()}</div>
    </div><div id="belt-host"></div></div></div>`;
  $('#belt-host').appendChild(beltStrip(run));
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
