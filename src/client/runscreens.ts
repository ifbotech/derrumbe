// Pantallas de campaña: el sobre lacrado, el Mapa del castillo, el Botín con su selección, la Taberna
// clandestino, los Secretos de la cripta y la Crónica final.
import { whisper } from './whispers';
import { Card, FORM } from '../rules/engine';
import { BOSS, CONTRACT, DraftOpt, EVENT, LAST_STAGE, MIN_DECK, Offer, Run, TAG, depthOf, formBase, healCost, mvpTool, offerCost, removeCost, rerollCost, sellValue, stageDef, stagesCleared } from '../rules/run';
import { BALANCE } from '../rules/balance-config';
import { TOOL, TOOL_SLOTS } from '../rules/tools';
import { cobroFor } from '../rules/textos';
import { rubble, skyline } from './art';
import { setScene, sfx } from './audio';
import { isRunHost, runDo } from './campaign';
import { cardEl, ferreteroEl, portraitEl, setDeckBack, tileEl } from './card';
import { $, $$, S, app, esc, modal, num, toast } from './core';
import { causeHtml, causeText, validDeath } from './causa';
import { copyLamina, downloadLamina, laminaOf, seedLink } from './lamina';
import { burst, coins, dealIn, restart, revealOptions, stampOn } from './fx';
import { glyphSvg } from './glyphs';
import { lastGain } from './guild';
import { sendMsg } from './net';
import { setScreen } from './router';
import { renderPings } from './pings';
import { L, Ln, acabD, acabN, asaltoN, atajoD, atajoN, barN, cartaN, espD, espN, formN, getLang, juraD, juraN, juraP, marca, monD, monDec, monN, numL, rarN, relD, relN, secN, secO, secT, selloD, selloN } from './lengua';
import { beltEl, bindFeedback, choice, deckModal, feedbackHtml, spCard, toolTile } from './widgets';

const isPlain = (c: Card) => !c.sp && c.suit !== 'X';
// Iconos de juramentos, atajos y secretos: el emblema de GLYPH que mejor dice la imagen de la biblia de
// nombres (§9, §10, §11). Las claves de GLYPH nombran la pieza vieja; el dibujo va en el comentario.
const CONTRACT_GLYPH: Record<string, string> = {
  intacto: 'andamio', // guantelete limpio (guante blanco sin mancha)
  limpios: 'plomada', // péndulo quieto (pulso firme)
  rapido: 'herradura', // herradura
  sincolapso: 'puntales', // mazo de naipes atado, entero
  austero: 'comodin', // el Motín: puño en alto (el Comodín)
  maestra: 'abanico', // abanico de cinco naipes
  horas: 'luna', // luna llena sobre una almena
  sinred: 'escudo_roto', // escudo partido en dos
  corta: 'abanico_corto', // cuatro naipes y el hueco del que falta
};
const TAG_GLYPH: Record<string, string> = {
  vale: 'plano_maestro', // llave (Llave de la Taberna)
  envio: 'fardo', // fardo atado (Contrabando)
  molde: 'gemelo', // naipe con la esquina doblada (Molde de cera)
  liquidacion: 'oro', // monedas (Botín escondido)
  timbrado: 'sello', // lacre (Lacre doble)
};
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
  else if (run.phase === 'map') mapScreen(run);
  else if (run.phase === 'reward') rewardScreen(run);
  else if (run.phase === 'shop') shopScreen(run);
  else if (run.phase === 'event') eventScreen(run);
  else if (over) actaScreen(run);
  else return;
  lastGold = run.gold;
  lastPhase = run.phase;
  const dv = $('#deck-view');
  if (dv) dv.onclick = () => deckModal(L('ui.run.tu.mazo', { n: run.deck.length }), [{ label: L('ui.mesa.mazo'), cards: run.deck }]);
  // lo que la conjura puede señalar con señas en sala
  const tag = (sel: string, name: string) => $$(sel).forEach((el, i) => (el.dataset.ping = el.classList.contains('skip') ? 'skip:0' : `${name}:${i}`));
  tag('#routes > .choice', 'route');
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
  return `<header class="deck-head"><div><h1>${h1}</h1><p class="sub">${sub} · ${run.daily ? L('ui.run.diaria', { d: run.daily }) : barN(run.deckId)} · ${L('ui.run.cabeza', { v: run.integrity, max: run.maxIntegrity, n: run.deck.length })}</p></div><div class="purse"><b id="purse-n">${run.gold}</b><span>${L('ui.run.de.oro')}</span></div></header>`;
}
/** Las Reliquias en las pantallas de campaña: aquí se reordenan con calma (y en la Taberna se venden). */
function beltStrip(run: Run, sell = false): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'run-belt';
  wrap.innerHTML = `<span class="belt-label">${L('ui.mesa.reliquias')} <small>${L('ui.run.reliquias.orden', { n: run.tools.length, total: TOOL_SLOTS })}</small></span>`;
  wrap.appendChild(
    beltEl(run.tools, {
      onReorder: host() && run.tools.length > 1 ? (order) => runDo({ t: 'reorder', order }) : undefined,
      onSell: sell && host() ? (i) => confirmSell(run, i) : undefined,
      sellValue,
    }),
  );
  wrap.insertAdjacentHTML('beforeend', `<button id="deck-view">${L('ui.run.ver.mazo', { n: run.deck.length })}</button>`);
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

function packScreen(run: Run): void {
  app.innerHTML = `<div class="run">${head(run, L('ui.run.sobre.titulo'), `${L('ui.run.sobre.sub', { n: run.ascension + 1 })}${run.seedText && !run.daily ? L('ui.run.sobre.semilla', { s: run.seedText }) : ''}`)}
    <div class="run-body"><p class="lead">${L('ui.run.sobre.texto')}</p>
    <div class="choices" id="picks"></div>${waitNote()}
    <div class="row end-row"><button id="deck-view">${L('ui.run.ver.mazo', { n: run.deck.length })}</button><button class="primary big" id="go" ${host() ? '' : 'disabled'}>${L('ui.run.al.mapa')}<small>${asaltoN(1)}</small></button></div></div></div>`;
  run.pack.forEach((id, i) => {
    const el = cardEl(spCard(id));
    dealIn(el, 200 + i * 220);
    $('#picks').appendChild(choice(el, espN(id), espD(id), null, null));
  });
  $('#go').onclick = () => runDo({ t: 'begin' });
}

// ───────────────────────── Mapa del castillo ─────────────────────────

function mapScreen(run: Run): void {
  const st = stageDef(run.stage);
  const first = run.stage > LAST_STAGE ? run.stage - 3 : 1;
  const last = run.stage > LAST_STAGE ? run.stage + 1 : LAST_STAGE;
  const nodes: string[] = [];
  for (let n = first; n <= last; n++) {
    const def = stageDef(n);
    const boss = run.bosses[n] ? BOSS[run.bosses[n]] : null;
    const nombre = asaltoN(n);
    const state = n < run.stage ? (run.skipped.includes(n) ? 'skip' : 'done') : n === run.stage ? 'now' : 'next';
    const mark = state === 'done' ? `<i class="inkstamp s-done">${L('ui.run.tomado')}</i>` : state === 'skip' ? `<i class="inkstamp s-skip">${L('ui.run.esquivado')}</i>` : def.boss ? `<i class="inkstamp s-boss">${L('ui.run.monarca')}</i>` : '';
    const tip = `<b>${nombre}</b>${Ln(def.floors.length, 'ui.run.guardias.1', 'ui.run.guardias.n')}${L('ui.run.vida.x', { n: num(def.hp) })}${boss ? `<hr><b>${monN(boss.id)} · ${monDec(boss.id)}</b>${monD(boss.id)}` : def.boss ? L('ui.run.monarca.llegar') : L('ui.run.dos.rutas')}`;
    nodes.push(`<div class="bp-node ${state} ${def.boss ? 'boss' : ''}" data-tip="${tip.replace(/"/g, '&quot;')}">
      <span class="bp-n">${n}</span><b>${nombre}</b>
      ${boss ? `<span class="bp-boss" data-boss="${boss.id}"></span><em>${monN(boss.id)}<small>${monDec(boss.id)}</small></em>` : def.boss ? `<em>¿?<small>${L('ui.run.por.conocer')}</small></em>` : `<em class="plain">${L('ui.run.rutas')}</em>`}
      ${mark}</div>`);
  }
  const boss = st.boss ? BOSS[run.bosses[run.stage]] : null;
  app.innerHTML = `<div class="run map">${head(run, L('ui.run.mapa.titulo'), `${L('ui.run.mapa.sub', { n: run.stage })}${run.stage <= LAST_STAGE ? L('ui.run.mapa.de', { n: LAST_STAGE }) : ''} · ${asaltoN(run.stage)}`)}
    <div class="run-body">
      <div class="desk"><div class="blueprint"><div class="bp-title">${L('ui.run.mapa.castillo')}${run.endless ? L('ui.run.mapa.infinito') : ''}</div><div class="bp-path">${nodes.join('<span class="bp-link"></span>')}</div></div></div>
      <h3 class="sec">${boss ? L('ui.run.monarca.espera') : L('ui.run.elige.entrar')}</h3>
      <div class="choices routes" id="routes"></div>${waitNote()}
      <div id="belt-host"></div>
    </div></div>`;
  $$('[data-boss]').forEach((slot) => slot.appendChild(portraitEl(`j-${slot.dataset.boss}`, monN(slot.dataset.boss!))));
  $('#belt-host').appendChild(beltStrip(run));
  const routes = $('#routes');
  const can = host();
  if (boss) {
    routes.appendChild(choice(portraitEl(`j-${boss.id}`, monN(boss.id)), monN(boss.id), `<b>${monDec(boss.id)}.</b> ${monD(boss.id)}`, L('ui.run.al.asalto'), can ? () => runDo({ t: 'route', i: 0 }) : null, 'wide boss-route'));
    routes.insertAdjacentHTML('beforeend', `<div class="route-note"><p class="lead">${L('ui.run.ruta.monarca', { nombre: asaltoN(run.stage), n: st.floors.length, hp: num(st.hp) })}</p></div>`);
  } else {
    run.node.routes.forEach((id, i) => {
      const k = CONTRACT[id];
      routes.appendChild(
        choice(tileEl(CONTRACT_GLYPH[id] ?? 'pergamino', k.risk ? L('ui.run.riesgo') : L('ui.run.juramento'), 'relic', k.risk ? 'capataz' : 'oficio'), juraN(id), `${juraD(id)} <b>${L('ui.run.premio', { x: juraP(id) })}</b>`, k.risk ? L('ui.run.aceptar.riesgo') : L('ui.run.tomar.ruta'), can ? () => runDo({ t: 'route', i }) : null, k.risk ? 'risk' : ''),
      );
    });
    const tag = run.node.tag ? TAG[run.node.tag] : null;
    if (tag) {
      routes.appendChild(
        choice(tileEl(TAG_GLYPH[tag.id] ?? 'atajo', L('ui.run.atajo'), 'service'), L('ui.run.saltar.asalto'), L('ui.run.saltar.texto', { nombre: atajoN(tag.id), desc: atajoD(tag.id) }), L('ui.run.saltar'), can ? () => (sfx.stamp(), runDo({ t: 'skip' })) : null, 'skip'),
      );
      whisper('atajo', { tag: atajoN(tag.id) });
    }
  }
}

// ───────────────────────── Botín y selección ─────────────────────────

function draftChoice(run: Run, o: DraftOpt, i: number): HTMLElement {
  const click = host() ? () => runDo({ t: 'draft', i }) : null;
  if (o.kind === 'special') return choice(cardEl(spCard(o.id)), espN(o.id), espD(o.id), L('ui.run.llevar'), click);
  const c = o.card;
  const what = [c.tr ? `<b>${acabN(c.tr)}.</b> ${acabD(c.tr)}` : '', c.seal ? `<b>${selloN(c.seal)}.</b> ${selloD(c.seal)}` : ''].filter(Boolean).join(' ');
  return choice(cardEl(c), cartaN(c), what, L('ui.run.llevar'), click);
}

function rewardScreen(run: Run): void {
  const total = run.pay.reduce((a, [, n]) => a + n, 0);
  const contract = run.contract ? CONTRACT[run.contract] : null;
  const boss = run.boss ? BOSS[run.boss] : null;
  app.innerHTML = `<div class="run">${head(run, L('ui.run.botin.titulo'), run.endless && run.stage === LAST_STAGE ? L('ui.run.botin.infinito') : L('ui.run.botin.sub', { n: run.stage, nombre: asaltoN(run.stage) }))}
    <div class="run-body two">
      <section class="panel paybox"><h3><span>${L('ui.run.botin')}</span><span>+${total}</span></h3>
        <table class="pay">${run.pay.map(([l, n]) => `<tr><td>${cobroFor(getLang(), l)}</td><td>+${n}</td></tr>`).join('')}<tr class="sum"><td>${L('ui.run.total')}</td><td>${L('ui.run.total.oro', { n: total })}</td></tr></table>
        ${contract ? `<div class="contract-res ${run.contractDone ? 'ok' : 'ko'}" id="contract-res"><b>${L('ui.run.juramento')} · ${juraN(contract.id)}</b><span>${run.contractDone ? L('ui.run.premio', { x: juraP(contract.id) }) : L('ui.run.sin.premio')}</span></div>` : ''}
      </section>
      <section>
        <h3 class="sec">${run.drafted ? L('ui.run.seleccion.hecha') : L('ui.run.elige.una')}</h3>
        <div class="choices" id="picks"></div>
        ${run.loot.length ? `<h3 class="sec">${run.looted ? L('ui.run.botin.repartido') : L('ui.run.botin.de', { quien: boss ? monN(boss.id) : L('ui.run.el.monarca') })}</h3><div class="choices" id="loot"></div>` : ''}
        ${waitNote()}
        <div id="belt-host"></div>
      </section>
    </div></div>`;
  if (contract) stampOn($('#contract-res'), run.contractDone ? L('ui.run.cumplido') : L('ui.run.incumplido'), run.contractDone ? 's-done' : 's-skip');
  if (lastPhase !== 'reward') sfx.coins(total);
  $('#belt-host').appendChild(beltStrip(run));
  if (!run.drafted) {
    run.draft.forEach((o, i) => {
      const el = draftChoice(run, o, i);
      dealIn($('.card', el), 120 + i * 160);
      $('#picks').appendChild(el);
    });
    $('#picks').appendChild(choice(tileEl('oro', L('ui.run.pasar'), 'service'), L('ui.run.ninguna'), L('ui.run.ninguna.texto'), L('ui.run.pasar'), host() ? () => runDo({ t: 'draft', i: null }) : null));
  }
  const loot = $('#loot');
  if (loot && !run.looted) {
    const full = run.tools.length >= TOOL_SLOTS;
    run.loot.forEach((id) => loot.appendChild(choice(toolTile(id), relN(id), relD(id), full ? L('ui.run.llenas') : L('ui.run.llevar'), host() && !full ? () => runDo({ t: 'loot', id }) : null)));
    loot.appendChild(choice(tileEl('retirar', L('ui.run.ninguna'), 'service'), L('ui.run.pasar'), full ? L('ui.run.caben.llenas', { n: TOOL_SLOTS }) : L('ui.run.caben', { n: TOOL_SLOTS, m: run.tools.length }), L('ui.run.pasar'), host() ? () => runDo({ t: 'loot', id: null }) : null));
  }
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
    desc = `${relD(o.id!)} <small>${rarN(TOOL[o.id!].rarity)}</small>`;
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
    desc = L('ui.run.pergamino.desc', { f: now.f, r: num(now.r), f2: now.f + FORM[f].lf, r2: num(now.r + FORM[f].lr) });
  }
  const box = choice(el, title, desc, null, buy, o.sold ? 'sold hang' : 'hang');
  box.insertAdjacentHTML('afterbegin', `<span class="price-tag ${cost === 0 && !o.sold ? 'free' : ''} ${!o.sold && run.gold < cost ? 'dear' : ''}">${o.sold ? L('ui.run.vendido') : cost === 0 ? L('ui.run.gratis') : `${cost} ${L('ui.run.de.oro')}`}</span>`);
  if (o.sold) stampOn(box, L('ui.run.vendido'), 's-skip');
  return box;
}

function shopScreen(run: Run): void {
  const nextN = run.stage + 1;
  const next = stageDef(nextN);
  const boss = run.bosses[nextN] ? BOSS[run.bosses[nextN]] : null;
  const can = host();
  app.innerHTML = `<div class="run">${head(run, L('ui.run.taberna'), `${L('ui.run.taberna.sub', { n: run.stage })}${run.freeShop ? L('ui.run.taberna.vale') : ''}`)}
    <div class="run-body shop">
      <aside class="keeper"><div id="npc"></div><p class="say" id="say">…</p></aside>
      <section class="stock"><div class="rail"></div><div class="choices hangers" id="offers"></div>${waitNote()}<div id="belt-host"></div></section>
      <aside class="shop-side">
        <div class="panel next"><h3><span>${L('ui.run.siguiente')}</span><span>${nextN}${nextN <= LAST_STAGE ? `/${LAST_STAGE}` : ''}</span></h3>
          <div class="next-row"><div id="next-boss"></div><div>
          <p><b>${asaltoN(nextN)}</b> · ${Ln(next.floors.length, 'ui.run.guardias.1', 'ui.run.guardias.n')}${L('ui.run.vida.x', { n: num(next.hp) })}</p>
          ${boss ? `<p class="boss"><b>${monN(boss.id)} · ${monDec(boss.id)}</b>${monD(boss.id)}</p>` : next.boss ? L('ui.run.monarca.sabra') : L('ui.run.sin.monarca')}</div></div></div>
        <div class="grid2">
          <button id="heal" data-tip="${L('ui.run.curar.tip', { v: BALANCE.taberna.curar.vida, i: run.integrity, max: run.maxIntegrity, p: BALANCE.taberna.curar.paso })}" ${can && run.gold >= healCost(run) && run.integrity < run.maxIntegrity ? '' : 'disabled'}>${L('ui.run.curar', { n: healCost(run) })}</button>
          <button id="burn" data-tip="${L('ui.run.hoguera.tip', { p: BALANCE.taberna.hoguera.paso })}" ${can && run.gold >= removeCost(run) && run.deck.length > MIN_DECK ? '' : 'disabled'}>${L('ui.run.hoguera', { n: removeCost(run) })}</button>
          <button id="reroll" data-tip="${L('ui.run.renovar.tip', { p: BALANCE.taberna.renovar.paso })}${run.vouchers ? L('ui.run.renovar.vales', { n: run.vouchers }) : ''}." ${can && run.gold >= rerollCost(run) ? '' : 'disabled'}>${L('ui.run.renovar', { x: rerollCost(run) || L('ui.run.vale') })}</button>
          <button class="primary" id="go" ${can ? '' : 'disabled'}>${!run.endless && [3, 5, 7].includes(run.stage) && run.events.length ? L('ui.run.cripta.bajar') : L('ui.run.al.mapa')}</button>
        </div>
      </aside>
    </div></div>`;
  $('#npc').appendChild(ferreteroEl());
  $('#belt-host').appendChild(beltStrip(run, true));
  if (boss) $('#next-boss').appendChild(portraitEl(`j-${boss.id}`, monN(boss.id)));
  $('#offers').style.setProperty('--n', String(run.shop.length));
  run.shop.forEach((o, i) => $('#offers').appendChild(offerChoice(run, o, i)));
  if (lastPhase === 'shop' && lastGold >= 0 && run.gold < lastGold) {
    sfx.coins(lastGold - run.gold), coins('.purse b', '#npc', lastGold - run.gold); // juice-ux V8: de la bolsa al Tratante
    ferreteroSays('buy');
  } else if (lastPhase !== 'shop') ferreteroSays(run.freeShop ? 'free' : 'hello');
  else $('#say').textContent = '…';
  $('#heal').onclick = () => (sfx.build(), runDo({ t: 'heal' }));
  $('#burn').onclick = () =>
    deckModal(L('ui.run.hoguera.titulo', { n: removeCost(run) }), [{ label: L('ui.mesa.mazo'), cards: run.deck, note: L('ui.run.hoguera.nota') }], {
      pick: 1,
      onPick: ([card]) => {
        runDo({ t: 'burn', card: card.id });
        showBurned(card);
      },
    });
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

// ───────────────────────── Crónica ─────────────────────────

/** La crónica en texto, para pegarla donde quieras. */
export function actaText(run: Run, online = false): string {
  const link = seedLink(run, online);
  const cleared = stagesCleared(run);
  const row = Array.from({ length: LAST_STAGE }, (_, i) => {
    const n = i + 1;
    if (run.skipped.includes(n)) return '⏭️';
    if (n <= cleared) return '🟥';
    return n === cleared + 1 && !run.conquered ? '💀' : '⬛';
  }).join('');
  const mvp = mvpTool(run);
  const depth = depthOf(run);
  return [
    `${L('ui.acta.texto.cab', { marca: marca().fullTitle })}${run.daily ? L('ui.acta.texto.diaria', { d: run.daily }) : ''}`,
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
    [L('ui.acta.mayor'), String(run.stats.maxHit)],
    [L('ui.acta.guardias'), String(run.stats.floors)],
    [L('ui.acta.exactos'), String(run.stats.cleans)],
    [L('ui.acta.mvp'), mvp ? `${TOOL[mvp] ? relN(mvp) : mvp} · ${run.stats.toolUse[mvp]}` : '—'],
    [L('ui.acta.juramentos'), String(run.stats.contracts)],
    [L('ui.acta.saltados'), String(run.stats.skips)],
    [L('ui.acta.sellos'), String(run.stats.forged)],
    [L('ui.acta.destruidas'), String(run.stats.burned)],
    [L('ui.acta.turnos'), String(run.stats.turns)],
    [L('ui.acta.oro'), String(run.stats.gold)],
  ];
  // la causa de la derrota (si la campaña cayó en la mesa) y el enlace para jugar la misma
  const death = !won && validDeath(run.death) ? run.death : null;
  const link = seedLink(run, c.online);
  const seed = run.daily ? L('ui.acta.diaria', { d: run.daily }) : run.seedText || (c.online ? L('ui.acta.servidor') : '—');
  app.innerHTML = `<div class="end ${won ? 'won' : 'lost'} in-page acta">
    ${won ? rubble('H', 'end-art') : skyline('end-art')}
    <div class="acta-sheet">
      <div class="meta"><span class="hot">${L('ui.acta.cronica')}</span><span>${run.daily ? L('ui.acta.diaria.cab', { d: run.daily }) : `${barN(run.deckId)}${run.ascension ? L('ui.acta.reinado.cab', { n: run.ascension + 1 }) : ''}`}</span></div>
      <h1>${won ? L('ui.fin.corte') : L('ui.fin.conjura')}</h1>
      <div class="acta-cols">
        <div class="acta-izq">
          <p>${won ? L('ui.acta.ganada') : depth ? L('ui.acta.infinito', { n: depth + 1 }) : L('ui.acta.perdida', { n: run.stage, nombre: asaltoN(run.stage) })}</p>
          ${death ? causeHtml(death) : ''}
          <p class="acta-semilla"><span>${L('ui.acta.semilla')}</span><b>${esc(seed)}</b>${link ? `<small>${L('ui.acta.semilla.nota')}</small>` : ''}</p>
          <p class="gain">${L('ui.acta.coronas', { n: lastGain })}${won && !run.endless && run.ascension < 7 ? L('ui.acta.desbloqueado', { n: run.ascension + 2 }) : ''}</p>
        </div>
        <table class="acta-stats">${stats.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
      </div>
      ${feedbackHtml('acta')}
      <div class="row acta-acciones">
        <button class="tinta" id="lamina-dl">${L('ui.acta.descargar')}</button>
        <button class="tinta" id="lamina-copy">${L('ui.acta.copiar.lamina')}</button>
        <button class="tinta" id="copy">${L('ui.acta.copiar')}</button>
        ${won && canBack ? `<button id="deeper">${L('ui.acta.infinito.btn')}<small>${L('ui.acta.infinito.sub')}</small></button>` : ''}
        ${c.online ? (canBack ? `<button class="primary" id="c-room">${L('ui.acta.sala')}</button>` : `<button disabled>${L('ui.fin.esperando')}</button>`) : `<button class="primary" id="c-hub">${L('ui.acta.portada')}</button>`}
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
