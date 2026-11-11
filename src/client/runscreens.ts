// Pantallas de campaña: el sobre, el plano de demolición, el cobro con su selección, la ferretería,
// los hallazgos en los cimientos y el acta final.
import { Card, FORM, FORMATION_NAME, SEAL, TREATMENT, cardLabel } from '../rules/engine';
import { BOSS, CONTRACT, DECK, DraftOpt, EVENT, LAST_STAGE, MIN_DECK, Offer, Run, TAG, depthOf, formBase, healCost, mvpTool, offerCost, removeCost, rerollCost, sellValue, stageDef, stagesCleared } from '../rules/run';
import { SPECIAL } from '../rules/specials';
import { RARITY, TOOL, TOOL_SLOTS } from '../rules/tools';
import { rubble, skyline } from './art';
import { setScene, sfx } from './audio';
import { isRunHost, runDo } from './campaign';
import { cardEl, ferreteroEl, portraitEl, setDeckBack, tileEl } from './card';
import { $, $$, S, app, modal, num, toast } from './core';
import { burst, dealIn, restart, stampOn } from './fx';
import { glyphSvg } from './glyphs';
import { lastGain } from './guild';
import { sendMsg } from './net';
import { setScreen } from './router';
import { beltEl, choice, deckModal, spCard, toolTile } from './widgets';

const isPlain = (c: Card) => !c.sp && c.suit !== 'X';
const CONTRACT_GLYPH: Record<string, string> = { intacto: 'casco', limpios: 'plomada', rapido: 'cinta', sincolapso: 'puntales', austero: 'comodin', maestra: 'dados', horas: 'megafono', sinred: 'sacos', corta: 'gemelos' };
const TAG_GLYPH: Record<string, string> = { vale: 'sobre', envio: 'montacargas', molde: 'gemelo', liquidacion: 'oro', timbrado: 'sello' };
const EVENT_GLYPH: Record<string, string> = { caja: 'hucha', horno: 'horno', contrato: 'pergamino', clandestino: 'timbre', planos: 'plano_maestro' };

// ───────────────────────── El Ferretero ─────────────────────────

const SAY: Record<string, string[]> = {
  hello: ['¿Qué va a ser?', 'Tengo género nuevo.', 'Mira sin tocar. Bueno, toca.', 'Otra vez tú. Bien.'],
  buy: ['Buena elección.', 'Eso no falla.', 'Con eso tiras una catedral.', 'Hmm. Vendido.', 'Me dolía venderla.'],
  poor: ['Con eso no te llega.', 'Aquí no se fía.', 'Vuelve con más oro.'],
  reroll: ['A ver qué queda en la trastienda…', 'Te saco lo otro.', 'Revuelvo, revuelvo…'],
  burn: ['Menos lastre, mejor obra.', 'Al fuego con ella.'],
  forge: ['Eso ya no se borra.', 'Tinta buena. No destiñe.', 'Queda marcada para siempre.'],
  sell: ['Te la recompro. A mi precio.', 'Hmm. Algo le sacaré.'],
  free: ['Hoy invita el sindicato.', 'Con ese vale, llévate lo que quieras.'],
};
export function ferreteroSays(kind: keyof typeof SAY): void {
  const el = $('#say');
  if (!el) return;
  const lines = SAY[kind];
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
  setScene(over ? 'menu' : 'shop');
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
  if (dv) dv.onclick = () => deckModal(`Tu mazo · ${run.deck.length} cartas`, [{ label: 'Mazo', cards: run.deck }]);
  if (isRunHost()) {
    if (run.sobre) openSobre(run);
    else if (run.pending) openPending(run);
  }
}

const host = () => isRunHost();
const waitNote = () => (host() ? '' : '<p class="wait">El anfitrión decide por la cuadrilla.</p>');
function head(run: Run, h1: string, sub: string): string {
  return `<header class="deck-head"><div><h1>${h1}</h1><p class="sub">${sub} · ${run.daily ? `Obra diaria ${run.daily}` : DECK[run.deckId].name} · búnker ${run.integrity}/${run.maxIntegrity} · mazo ${run.deck.length}</p></div><div class="purse"><b id="purse-n">${run.gold}</b><span>de oro</span></div></header>`;
}
/** El cinturón en las pantallas de campaña: aquí se reordena con calma (y en la ferretería se vende). */
function beltStrip(run: Run, sell = false): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'run-belt';
  wrap.innerHTML = `<span class="belt-label">Cinturón <small>${run.tools.length}/${TOOL_SLOTS} · de izquierda a derecha</small></span>`;
  wrap.appendChild(
    beltEl(run.tools, {
      onReorder: host() && run.tools.length > 1 ? (order) => runDo({ t: 'reorder', order }) : undefined,
      onSell: sell && host() ? (i) => confirmSell(run, i) : undefined,
      sellValue,
    }),
  );
  wrap.insertAdjacentHTML('beforeend', `<button id="deck-view">Ver mazo (${run.deck.length})</button>`);
  return wrap;
}
function confirmSell(run: Run, i: number): void {
  const t = run.tools[i];
  if (!t) return;
  const el = modal(`<div class="modal-box confirm"><h2>¿Vender ${TOOL[t.id].name}?</h2><p>El Ferretero te da ${sellValue(t.id)} de oro. ${TOOL[t.id].desc}</p><div class="row"><button class="x">No</button><button class="primary" id="yes">Vender</button></div></div>`);
  $('#yes', el).onclick = () => {
    el.remove();
    runDo({ t: 'sell', i });
    sfx.coins(sellValue(t.id));
    ferreteroSays('sell');
  };
}

// ───────────────────────── Sobre inicial ─────────────────────────

function packScreen(run: Run): void {
  app.innerHTML = `<div class="run">${head(run, 'El sobre', `Campaña nueva · ascenso ${run.ascension}${run.seedText && !run.daily ? ` · semilla ${run.seedText}` : ''}`)}
    <div class="run-body"><p class="lead">Tu cuadrilla llega con estas cartas especiales. No tienen palo ni número: acompañan a cualquier golpe (hasta dos por golpe) o se juegan solas, y hacen su efecto.</p>
    <div class="choices" id="picks"></div>${waitNote()}
    <div class="row end-row"><button id="deck-view">Ver mazo (${run.deck.length})</button><button class="primary big" id="go" ${host() ? '' : 'disabled'}>Al plano<small>${stageDef(1).name}</small></button></div></div></div>`;
  run.pack.forEach((id, i) => {
    const el = cardEl(spCard(id));
    dealIn(el, 200 + i * 220);
    $('#picks').appendChild(choice(el, SPECIAL[id].name, SPECIAL[id].desc, null, null));
  });
  $('#go').onclick = () => runDo({ t: 'begin' });
}

// ───────────────────────── Plano de demolición ─────────────────────────

function mapScreen(run: Run): void {
  const st = stageDef(run.stage);
  const first = run.stage > LAST_STAGE ? run.stage - 3 : 1;
  const last = run.stage > LAST_STAGE ? run.stage + 1 : LAST_STAGE;
  const nodes: string[] = [];
  for (let n = first; n <= last; n++) {
    const def = stageDef(n);
    const boss = run.bosses[n] ? BOSS[run.bosses[n]] : null;
    const state = n < run.stage ? (run.skipped.includes(n) ? 'skip' : 'done') : n === run.stage ? 'now' : 'next';
    const mark = state === 'done' ? '<i class="inkstamp s-done">Demolido</i>' : state === 'skip' ? '<i class="inkstamp s-skip">Clausurado</i>' : def.boss ? '<i class="inkstamp s-boss">Jefe</i>' : '';
    const tip = `<b>${def.name}</b>${def.floors.length} piso${def.floors.length > 1 ? 's' : ''} por torre · resistencia ×${num(def.hp)}${boss ? `<hr><b>${boss.who} · ${boss.name}</b>${boss.desc}` : def.boss ? '<hr>Con jefe de obra: se sabrá al llegar.' : '<hr>Dos rutas con contrato, o un atajo con etiqueta sindical.'}`;
    nodes.push(`<div class="bp-node ${state} ${def.boss ? 'boss' : ''}" data-tip="${tip.replace(/"/g, '&quot;')}">
      <span class="bp-n">${n}</span><b>${def.name}</b>
      ${boss ? `<span class="bp-boss" data-boss="${boss.id}"></span><em>${boss.who}<small>${boss.name}</small></em>` : def.boss ? '<em>¿?<small>jefe por conocer</small></em>' : '<em class="plain">rutas</em>'}
      ${mark}</div>`);
  }
  const boss = st.boss ? BOSS[run.bosses[run.stage]] : null;
  app.innerHTML = `<div class="run map">${head(run, 'El plano', `Obra ${run.stage}${run.stage <= LAST_STAGE ? ` de ${LAST_STAGE}` : ''} · ${st.name}`)}
    <div class="run-body">
      <div class="desk"><div class="blueprint"><div class="bp-title">Plano de demolición${run.endless ? ' · cimientos abisales' : ''}</div><div class="bp-path">${nodes.join('<span class="bp-link"></span>')}</div></div></div>
      <h3 class="sec">${boss ? 'El jefe te espera' : 'Elige por dónde entrar'}</h3>
      <div class="choices routes" id="routes"></div>${waitNote()}
      <div id="belt-host"></div>
    </div></div>`;
  $$('[data-boss]').forEach((slot) => slot.appendChild(portraitEl(`j-${slot.dataset.boss}`, BOSS[slot.dataset.boss!].who)));
  $('#belt-host').appendChild(beltStrip(run));
  const routes = $('#routes');
  const can = host();
  if (boss) {
    routes.appendChild(choice(portraitEl(`j-${boss.id}`, boss.who), boss.who, `<b>${boss.name}.</b> ${boss.desc}`, 'A demoler', can ? () => runDo({ t: 'route', i: 0 }) : null, 'wide boss-route'));
    routes.insertAdjacentHTML('beforeend', `<div class="route-note"><p class="lead">${st.name}: ${st.floors.length} pisos por torre, resistencia ×${num(st.hp)}. Las obras con jefe no tienen atajo, y al caer dejan botín: una de dos herramientas de oficio o mejor.</p></div>`);
  } else {
    run.node.routes.forEach((id, i) => {
      const k = CONTRACT[id];
      routes.appendChild(
        choice(tileEl(CONTRACT_GLYPH[id] ?? 'pergamino', k.risk ? 'Riesgo' : 'Contrato', 'relic', k.risk ? 'capataz' : 'oficio'), k.name, `${k.desc} <b>Premio: ${k.reward}.</b>`, k.risk ? 'Aceptar el riesgo' : 'Tomar la ruta', can ? () => runDo({ t: 'route', i }) : null, k.risk ? 'risk' : ''),
      );
    });
    const tag = run.node.tag ? TAG[run.node.tag] : null;
    if (tag) {
      routes.appendChild(
        choice(tileEl(TAG_GLYPH[tag.id] ?? 'atajo', 'Atajo', 'service'), `Saltar la obra`, `Sin cobro, sin selección y sin ferretería. A cambio, etiqueta sindical: <b>${tag.name}.</b> ${tag.desc}`, 'Saltar', can ? () => (sfx.stamp(), runDo({ t: 'skip' })) : null, 'skip'),
      );
    }
  }
}

// ───────────────────────── Cobro y selección ─────────────────────────

function draftChoice(run: Run, o: DraftOpt, i: number): HTMLElement {
  const click = host() ? () => runDo({ t: 'draft', i }) : null;
  if (o.kind === 'special') return choice(cardEl(spCard(o.id)), SPECIAL[o.id].name, SPECIAL[o.id].desc, 'Llevar', click);
  const c = o.card;
  const what = [c.tr ? `<b>${TREATMENT[c.tr].name}.</b> ${TREATMENT[c.tr].desc}` : '', c.seal ? `<b>${SEAL[c.seal].name}.</b> ${SEAL[c.seal].desc}` : ''].filter(Boolean).join(' ');
  return choice(cardEl(c), cardLabel(c), what, 'Llevar', click);
}

function rewardScreen(run: Run): void {
  const total = run.pay.reduce((a, [, n]) => a + n, 0);
  const contract = run.contract ? CONTRACT[run.contract] : null;
  const boss = run.boss ? BOSS[run.boss] : null;
  app.innerHTML = `<div class="run">${head(run, 'A cobrar', run.endless && run.stage === LAST_STAGE ? 'La Torre Madre cayó: seguís hacia los cimientos' : `Obra ${run.stage} demolida · ${stageDef(run.stage).name}`)}
    <div class="run-body two">
      <section class="panel paybox"><h3><span>La paga</span><span>+${total}</span></h3>
        <table class="pay">${run.pay.map(([l, n]) => `<tr><td>${l}</td><td>+${n}</td></tr>`).join('')}<tr class="sum"><td>Total</td><td>+${total} de oro</td></tr></table>
        ${contract ? `<div class="contract-res ${run.contractDone ? 'ok' : 'ko'}" id="contract-res"><b>Contrato · ${contract.name}</b><span>${run.contractDone ? `Premio: ${contract.reward}.` : 'Sin premio esta vez.'}</span></div>` : ''}
      </section>
      <section>
        <h3 class="sec">${run.drafted ? 'Selección hecha' : 'Elige una para tu mazo'}</h3>
        <div class="choices" id="picks"></div>
        ${run.loot.length ? `<h3 class="sec">${run.looted ? 'Botín repartido' : `Botín de ${boss?.who ?? 'jefe'}: elige una herramienta`}</h3><div class="choices" id="loot"></div>` : ''}
        ${waitNote()}
        <div id="belt-host"></div>
      </section>
    </div></div>`;
  if (contract) stampOn($('#contract-res'), run.contractDone ? 'Cumplido' : 'Incumplido', run.contractDone ? 's-done' : 's-skip');
  if (lastPhase !== 'reward') sfx.coins(total);
  $('#belt-host').appendChild(beltStrip(run));
  if (!run.drafted) {
    run.draft.forEach((o, i) => {
      const el = draftChoice(run, o, i);
      dealIn($('.card', el), 120 + i * 160);
      $('#picks').appendChild(el);
    });
    $('#picks').appendChild(choice(tileEl('oro', 'Pasar', 'service'), 'Ninguna', 'No siempre conviene engordar el mazo. A cambio, +3 de oro.', 'Pasar', host() ? () => runDo({ t: 'draft', i: null }) : null));
  }
  const loot = $('#loot');
  if (loot && !run.looted) {
    const full = run.tools.length >= TOOL_SLOTS;
    run.loot.forEach((id) => loot.appendChild(choice(toolTile(id), TOOL[id].name, TOOL[id].desc, full ? 'Cinturón lleno' : 'Llevar', host() && !full ? () => runDo({ t: 'loot', id }) : null)));
    loot.appendChild(choice(tileEl('retirar', 'Ninguna', 'service'), 'Pasar', full ? `Caben ${TOOL_SLOTS} herramientas: vende una en la ferretería la próxima vez.` : `Caben ${TOOL_SLOTS} herramientas; llevas ${run.tools.length}.`, 'Pasar', host() ? () => runDo({ t: 'loot', id: null }) : null));
  }
}

// ───────────────────────── Ferretería ─────────────────────────

function offerChoice(run: Run, o: Offer, i: number): HTMLElement {
  const cost = offerCost(run, o);
  const can = host() && !o.sold && run.gold >= cost;
  const buy = can ? () => runDo({ t: 'buy', i }) : null;
  let el: HTMLElement;
  let title: string;
  let desc: string;
  if (o.kind === 'tool') {
    el = toolTile(o.id!);
    title = TOOL[o.id!].name;
    desc = `${TOOL[o.id!].desc} <small>${RARITY[TOOL[o.id!].rarity].name}</small>`;
  } else if (o.kind === 'sobre') {
    el = tileEl('sobre', 'Sobre', 'service');
    title = 'Sobre de especiales';
    desc = 'Se abre aquí mismo: tres cartas especiales a la vista y te quedas con una.';
  } else if (o.kind === 'clandestino') {
    el = tileEl('incognita', 'Incógnita', 'service');
    title = 'Sobre clandestino';
    desc = 'Una carta especial a ciegas, de saldo. No sabrás cuál hasta pagarla.';
  } else if (o.kind === 'forja') {
    el = cardEl({ id: `forja-${i}`, suit: o.seal ? 'H' : 'S', rank: 7, seal: o.seal, tr: o.tr });
    title = o.seal ? `Sellado: ${SEAL[o.seal].name.replace('Sello de ', '').replace('Sello ', '')}` : `Forja: ${TREATMENT[o.tr!].name}`;
    desc = `Eliges una carta de tu mazo y queda marcada para siempre. ${o.seal ? SEAL[o.seal].desc : TREATMENT[o.tr!].desc}`;
  } else {
    const f = o.form!;
    const now = formBase(run, f);
    el = tileEl('plano', 'Plano', 'service');
    title = `Plano: ${FORMATION_NAME[f]}`;
    desc = `Sube de nivel: base ${now.f} de Fuerza y ×${num(now.r)} → ${now.f + FORM[f].lf} y ×${num(now.r + FORM[f].lr)}.`;
  }
  const box = choice(el, title, desc, null, buy, o.sold ? 'sold hang' : 'hang');
  box.insertAdjacentHTML('afterbegin', `<span class="price-tag ${cost === 0 && !o.sold ? 'free' : ''} ${!o.sold && run.gold < cost ? 'dear' : ''}">${o.sold ? 'Vendido' : cost === 0 ? 'Gratis' : `${cost} de oro`}</span>`);
  if (o.sold) stampOn(box, 'Vendido', 's-skip');
  return box;
}

function shopScreen(run: Run): void {
  const nextN = run.stage + 1;
  const next = stageDef(nextN);
  const boss = run.bosses[nextN] ? BOSS[run.bosses[nextN]] : null;
  const can = host();
  app.innerHTML = `<div class="run">${head(run, 'La ferretería', `Obra ${run.stage} superada${run.freeShop ? ' · vale sindical: hoy todo el surtido es gratis' : ''}`)}
    <div class="run-body shop">
      <aside class="keeper"><div id="npc"></div><p class="say" id="say">…</p></aside>
      <section class="stock"><div class="rail"></div><div class="choices hangers" id="offers"></div>${waitNote()}<div id="belt-host"></div></section>
      <aside class="shop-side">
        <div class="panel next"><h3><span>Siguiente obra</span><span>${nextN}${nextN <= LAST_STAGE ? `/${LAST_STAGE}` : ''}</span></h3>
          <div class="next-row"><div id="next-boss"></div><div>
          <p><b>${next.name}</b> · ${next.floors.length} piso${next.floors.length > 1 ? 's' : ''} por torre · resistencia ×${num(next.hp)}</p>
          ${boss ? `<p class="boss"><b>${boss.who} · ${boss.name}</b>${boss.desc}</p>` : next.boss ? '<p class="boss"><b>Jefe de obra</b>Se sabrá al llegar.</p>' : '<p>Sin jefe: rutas con contrato o atajo.</p>'}</div></div></div>
        <div class="grid2">
          <button id="heal" data-tip="<b>Reparación</b>+6 de integridad. El búnker está en ${run.integrity}/${run.maxIntegrity}. Cada vez cuesta 1 más." ${can && run.gold >= healCost(run) && run.integrity < run.maxIntegrity ? '' : 'disabled'}>Reparar · ${healCost(run)}</button>
          <button id="burn" data-tip="<b>Quemador</b>Destruye una carta de tu mazo para siempre. Suma un escombro. Cada vez cuesta 2 más." ${can && run.gold >= removeCost(run) && run.deck.length > MIN_DECK ? '' : 'disabled'}>Quemador · ${removeCost(run)}</button>
          <button id="reroll" data-tip="<b>Revolver cajones</b>Cambia todo el surtido. Cada vez cuesta 1 más${run.vouchers ? `; te quedan ${run.vouchers} vales del gremio` : ''}." ${can && run.gold >= rerollCost(run) ? '' : 'disabled'}>Revolver cajones · ${rerollCost(run) || 'vale'}</button>
          <button class="primary" id="go" ${can ? '' : 'disabled'}>${!run.endless && [3, 5, 7].includes(run.stage) && run.events.length ? 'Bajar a los cimientos' : 'Al plano'}</button>
        </div>
      </aside>
    </div></div>`;
  $('#npc').appendChild(ferreteroEl());
  $('#belt-host').appendChild(beltStrip(run, true));
  if (boss) $('#next-boss').appendChild(portraitEl(`j-${boss.id}`, boss.who));
  $('#offers').style.setProperty('--n', String(run.shop.length));
  run.shop.forEach((o, i) => $('#offers').appendChild(offerChoice(run, o, i)));
  if (lastPhase === 'shop' && lastGold >= 0 && run.gold < lastGold) {
    sfx.coins(lastGold - run.gold);
    ferreteroSays('buy');
  } else if (lastPhase !== 'shop') ferreteroSays(run.freeShop ? 'free' : 'hello');
  else $('#say').textContent = '…';
  $('#heal').onclick = () => (sfx.build(), runDo({ t: 'heal' }));
  $('#burn').onclick = () =>
    deckModal(`Quemador · ${removeCost(run)} de oro`, [{ label: 'Mazo', cards: run.deck, note: 'Elige la carta que va al fuego. No vuelve.' }], {
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

/** Sobre de especiales recién abierto: tres cartas a la vista, te quedas con una. */
function openSobre(run: Run): void {
  const el = modal(`<div class="reveal-box"><small>Sobre de especiales · elige una</small><div class="choices"></div></div>`, { cls: 'reveal sobre-modal', sticky: true });
  run.sobre!.forEach((id, i) => {
    const ce = cardEl(spCard(id));
    dealIn(ce, 150 + i * 220);
    $('.choices', el).appendChild(choice(ce, SPECIAL[id].name, SPECIAL[id].desc, 'Quedármela', () => (el.remove(), sfx.stamp(), runDo({ t: 'open', i }))));
  });
  sfx.flick();
}

/** Una decisión de campaña espera cartas: forja, molde o fundición. */
function openPending(run: Run): void {
  const p = run.pending!;
  const cancel = () => runDo({ t: 'cancel' });
  if (p.kind === 'forge') {
    const o = run.shop[p.i];
    const mark = o.seal ? SEAL[o.seal].name : TREATMENT[o.tr!].name;
    const el = deckModal(`Mesa de forja · ${mark}`, [{ label: 'Mazo', cards: run.deck, note: `Elige la carta que recibe ${o.seal ? 'el sello' : 'el tratamiento'}. Si ya tenía ${o.seal ? 'uno' : 'otro'}, se sustituye.` }], {
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
  } else if (p.kind === 'dup') {
    deckModal('Molde · duplica una carta', [{ label: 'Mazo', cards: run.deck, note: 'Elige la carta que quieres tener dos veces.' }], { pick: 1, sticky: true, onCancel: cancel, onPick: ([card]) => runDo({ t: 'target', cards: [card.id] }) }).classList.add('pending-modal');
  } else {
    deckModal('El horno · funde dos cartas', [{ label: 'Mazo', cards: run.deck, note: 'Elige dos cartas de baraja. Se destruyen y nace una con el número más alto de las dos, el palo de la primera, en Bronce vivo y con el sello que llevaran.' }], {
      pick: 2,
      sticky: true,
      can: isPlain,
      confirm: 'Fundir',
      onCancel: cancel,
      onPick: (cards) => (sfx.forge(), runDo({ t: 'target', cards: cards.map((c) => c.id) })),
    }).classList.add('pending-modal');
  }
}

/** La carta sale de la forja con su marca recién estampada. */
function showForged(card: Card, mark: string): void {
  const el = modal(`<div class="reveal-box"><small>Mesa de forja</small><div class="choices"></div><button class="primary x">Al mazo</button></div>`, { cls: 'reveal forged' });
  const ce = cardEl(card);
  ce.classList.add('stamped');
  $('.choices', el).appendChild(choice(ce, cardLabel(card), mark, null, null));
  sfx.forge();
  setTimeout(() => sfx.stamp(), 380);
  ferreteroSays('forge');
}

/** La carta arde en el quemador y se va. */
function showBurned(card: Card): void {
  const el = modal(`<div class="reveal-box"><small>Al quemador</small><div class="choices"></div></div>`, { cls: 'reveal burned' });
  const ce = cardEl(card, { tilt: false });
  ce.classList.add('burning');
  $('.choices', el).appendChild(choice(ce, cardLabel(card), 'Sale del mazo para siempre. Un escombro más.', null, null));
  sfx.hiss();
  ferreteroSays('burn');
  const r = ce.getBoundingClientRect();
  setTimeout(() => burst(r.left + r.width / 2, r.top + r.height * 0.7, 14, [0, -90]), 350);
  setTimeout(() => el.remove(), 1500);
}

// ───────────────────────── Hallazgos ─────────────────────────

function eventScreen(run: Run): void {
  const ev = EVENT[run.event!];
  app.innerHTML = `<div class="run event">${head(run, 'Hallazgo', `Bajo la obra ${run.stage} · en los cimientos`)}
    <div class="run-body"><div class="event-box">
      <div class="event-art">${glyphSvg(EVENT_GLYPH[ev.id] ?? 'incognita', 'event-ico')}</div>
      <div class="event-txt"><h3 class="sec">${ev.name}</h3><p class="lead">${ev.text}</p>
        <div class="event-opts" id="opts"></div>${waitNote()}</div>
    </div><div id="belt-host"></div></div></div>`;
  $('#belt-host').appendChild(beltStrip(run));
  ev.options.forEach((o, i) => {
    const ok = host() && (!o.can || o.can(run));
    const b = document.createElement('button');
    b.className = 'stamp-btn opt';
    b.disabled = !ok;
    b.innerHTML = `<span><b>${o.label}</b><small>${o.desc}</small></span>`;
    b.onclick = () => (sfx.stamp(), runDo({ t: 'event', i }));
    $('#opts').appendChild(b);
  });
}

// ───────────────────────── Acta de demolición ─────────────────────────

/** El acta en texto, para pegarla donde quieras. */
export function actaText(run: Run): string {
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
    `🏗️ DERRUMBE · Acta de demolición${run.daily ? ` · Obra diaria ${run.daily}` : ''}`,
    `${row} ${run.conquered ? '👑 Torre Madre demolida' : `Obra ${Math.min(cleared, LAST_STAGE)}/${LAST_STAGE}`}${depth ? ` · 🕳️ ${depth} cimiento${depth > 1 ? 's' : ''} abisal${depth > 1 ? 'es' : ''}` : ''}`,
    `💥 Mayor golpe: ${run.stats.maxHit}`,
    `🏢 Pisos: ${run.stats.floors} · 🎯 Golpes limpios: ${run.stats.cleans}`,
    mvp ? `🔧 Herramienta más activa: ${TOOL[mvp]?.name ?? mvp} (${run.stats.toolUse[mvp]})` : '🔧 Sin herramientas',
    `📜 Contratos: ${run.stats.contracts} · 🔥 Cartas destruidas: ${run.stats.burned} · ⏱️ Turnos: ${run.stats.turns}`,
    `🃏 ${DECK[run.deckId].name}${run.ascension ? ` · ascenso ${run.ascension}` : ''}${run.seedText ? ` · 🌱 ${run.seedText}` : ''}`,
  ].join('\n');
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
    ['Obras superadas', `${Math.min(cleared, LAST_STAGE)} de ${LAST_STAGE}${depth ? ` + ${depth} abisal${depth > 1 ? 'es' : ''}` : ''}`],
    ['Mayor golpe', String(run.stats.maxHit)],
    ['Pisos demolidos', String(run.stats.floors)],
    ['Golpes limpios', String(run.stats.cleans)],
    ['Herramienta más activa', mvp ? `${TOOL[mvp]?.name ?? mvp} · ${run.stats.toolUse[mvp]}` : '—'],
    ['Contratos cumplidos', String(run.stats.contracts)],
    ['Obras saltadas', String(run.stats.skips)],
    ['Sellos y tratamientos', String(run.stats.forged)],
    ['Cartas destruidas', String(run.stats.burned)],
    ['Turnos', String(run.stats.turns)],
    ['Oro ganado', String(run.stats.gold)],
    ['Semilla', run.seedText || (c.online ? 'la del servidor' : '—')],
  ];
  app.innerHTML = `<div class="end ${won ? 'won' : 'lost'} in-page acta">
    ${won ? rubble('H', 'end-art') : skyline('end-art')}
    <div class="acta-sheet">
      <div class="meta"><span class="hot">ACTA DE DEMOLICIÓN</span><span>${run.daily ? `OBRA DIARIA ${run.daily}` : `${DECK[run.deckId].name}${run.ascension ? ` · ASCENSO ${run.ascension}` : ''}`}</span></div>
      <h1>${won ? 'Demolido' : 'Sepultados'}</h1>
      <p>${won ? 'Cayó la Torre Madre. Debajo aún hay cimientos, si os quedan ganas.' : depth ? `Los cimientos os tragaron en el abisal ${depth + 1}.` : `El búnker cedió en la obra ${run.stage}: ${stageDef(run.stage).name}.`}</p>
      <table class="acta-stats">${stats.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
      <p class="gain">+${lastGain} ✦ de renombre${won && !run.endless ? ` · ascenso ${run.ascension + 1} desbloqueado` : ''}</p>
      <div class="row">
        <button id="copy">Copiar acta</button>
        ${won && canBack ? '<button id="deeper">Cimientos abisales<small>seguir sin final</small></button>' : ''}
        ${c.online ? (canBack ? '<button class="primary" id="c-room">Volver a la sala</button>' : '<button disabled>Esperando al anfitrión…</button>') : '<button class="primary" id="c-hub">Volver a la portada</button>'}
      </div>
    </div>
  </div>`;
  stampOn($('.acta-sheet'), won ? 'Demolido' : 'Clausurado', won ? 's-done big' : 's-skip big');
  $('#copy').onclick = () => {
    const text = actaText(run);
    const done = () => toast('Acta copiada');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  };
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
    toast('No se pudo copiar');
  }
  ta.remove();
}
