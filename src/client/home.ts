// Portada y preparación de campaña.
import { ACHIEVEMENTS, deckUnlocked, unlockedPool } from '../rules/achievements';
import { ASCENSIONS, BOSSES, DECKS, LAST_STAGE, STAGES, newRun } from '../rules/run';
import { MAZO_INICIAL } from '../rules/mazos';
import { waxSeal } from './art';
import { backEl } from './card';
import { masteryBadge } from './engraving';
import { Locale } from '../shared/brand';
import { $, $$, S, app, cap, esc, modal } from './core';
import { forgetSaved, newCampaign, pickDeck, prefs, resumeCampaign, runOpts, savedCampaign } from './campaign';
import { glyphSvg } from './glyphs';
import { cifra, cifraEl } from './cifra';
import { meta, openGuild } from './guild';
import { L, Ln, acabN, asaltoN, barD, barL, barN, getLang, logN, reinD, reinN, selloN, tiranoN } from './lengua';
import { brandFor } from '../shared/brand';
import { hasServer, sendMsg, updateConn } from './net';
import { setScreen } from './router';
import { bindLangSwitch, langSwitch, showRules, showSettings } from './widgets';
import { platform } from './platform';
import { bufonSvg } from './pixel/bufon';
import { dorsoSvg } from './pixel/dorsos';
import { nodoSvg } from './pixel/nodos';

/** V40 · fase 3a: botón de la portada mínima, icono grande y una palabra; el detalle va en el globo (data-tip). */
const stamp40 = (id: string, ico: string, title: string, tip: string, cls = '', cifra40 = '') =>
  `<button class="stamp-btn st40 ${cls}" id="${id}" data-tip="<b>${esc(title)}</b>${esc(tip)}"><span class="st40-ico">${ico}</span><b>${title}</b>${cifra40 ? `<em class="st40-n">${cifra40}</em>` : ''}</button>`;


/**
 * Candado de la marca: el título del idioma en grande (primera palabra en un renglón, el resto en
 * lacre debajo) y, cosida a él, la cinta grabada con su sello de lacre que lleva el nombre del otro
 * idioma; debajo, el lema. Así cualquier captura enseña los dos nombres. `face` fuerza una cara; por
 * defecto, la del idioma elegido (`getLang()`).
 */
export function brandLockup(face: Locale = getLang()): string {
  const b = brandFor(face);
  const other: Locale = face === 'es' ? 'en' : 'es';
  const [head, ...rest] = b.title.split(' ');
  const word = (w: string) => esc(w.length > 1 ? cap(w) : w);
  // V12: la cinta lleva el emblema de la cara (brand.ts): en español, el sello suelto; en inglés, la frase
  // «Original edition · SANGRE Y PALO», con el nombre español marcado en su idioma
  const suelto = b.emblema === b.seal;
  const cinta = suelto ? esc(b.seal) : esc(b.emblema).replace(esc(b.seal), `<span lang="${other}">${esc(b.seal)}</span>`);
  return `<h1 class="title" lang="${face}" aria-label="${esc(b.title)}"><span>${word(head)}</span>${rest.length ? `<span class="cut">${rest.map(word).join(' ')}</span>` : ''}</h1>
      <p class="brand-seal" lang="${suelto ? other : face}">${waxSeal('brand-wax')}<span class="seal-ribbon${suelto ? '' : ' largo'}">${cinta}</span></p>
      <p class="tagline" lang="${face}">${esc(b.subtitle)}</p>`;
}

/** Si hay una campaña a medias, pregunta antes de abandonarla. */
export function confirmAbandon(then: () => void): void {
  const saved = savedCampaign();
  if (!saved || saved.run.phase === 'won') return then();
  const el = modal(
    `<div class="modal-box confirm"><h2>${L('ui.home.abandonar.titulo')}</h2><p>${L('ui.home.abandonar.texto', { n: saved.run.stage })}</p>
     <div class="row"><button class="x">${L('ui.home.abandonar.no')}</button><button class="primary" id="yes">${L('ui.home.abandonar.si')}</button></div></div>`,
  );
  $('#yes', el).onclick = () => {
    el.remove();
    then();
  };
}

export function renderHome(face: Locale = getLang()): void {
  const saved = savedCampaign();
  const done = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
  const wonRun = saved?.run.phase === 'won';
  const resumeSub = saved ? (wonRun ? L('ui.home.resume.ganada') : `${L('ui.home.resume.sub', { n: saved.run.stage, oro: cifra(saved.run.gold), baraja: barN(saved.run.deckId) })}`) : '';
  // V40 · fase 3a · portada mínima: el Bufón y el título; cuatro botones grandes de icono y una palabra (Jugar · Altar ·
  // Colección · Ajustes; el detalle, en el globo) y, aparte y discreto, el cooperativo y las reglas. Sin cajas de texto.
  app.innerHTML = `
  <div class="home m40">
    <section class="home-left">
      <div class="bufon-portada" aria-hidden="true">${bufonSvg('brillo')}</div>
      ${brandLockup(face)}
      ${langSwitch('home-lang')}
    </section>
    <section class="home-right">
      ${saved ? `<button class="resume" id="resume" data-tip="${esc(resumeSub)}"><b>${wonRun ? L('ui.home.resume.b.ganada') : L('ui.home40.seguir')}</b><span>${resumeSub}</span></button>` : ''}
      <nav class="menu">
        ${stamp40('m-camp', nodoSvg('rey'), L('ui.home.camp'), L('ui.home.camp.sub'), 'primary')}
        ${stamp40('m-guild', nodoSvg('santuario'), L('ui.home.orden'), L('ui.home.orden.sub', { coronas: cifra(meta.renown), hechos: done, total: ACHIEVEMENTS.length }), '', `${cifra(meta.renown)} ✦`)}
        ${stamp40('m-col', `<span class="dorso40">${dorsoSvg(prefs.deck)}</span>`, L('ui.home.coleccion'), L('ui.home.coleccion.sub'))}
        ${stamp40('m-set', glyphSvg('engranaje', 'stamp-ico'), L('ui.ajustes'), L('ui.home.ajustes.sub'))}
      </nav>
      <div class="row foot"><button class="ghost" id="m-coop">${L('ui.home40.coop')}</button><button class="ghost" id="m-rules">${L('ui.reglas')}</button><p class="conn"></p></div>
    </section>
  </div>`;
  const resume = $('#resume');
  if (resume) resume.onclick = resumeCampaign;
  $('#m-camp').onclick = () => setScreen('camp');
  $('#m-coop').onclick = () => coopModal();
  $('#m-guild').onclick = () => openGuild('ups');
  $('#m-col').onclick = () => openGuild('col');
  $('#m-rules').onclick = showRules;
  $('#m-set').onclick = () => showSettings();
  bindLangSwitch(app);
  updateConn();
  const code = new URLSearchParams(location.search).get('sala');
  if (code && !S.session) coopModal(code);
}

function coopModal(code = ''): void {
  const savedName = platform.load('derrumbe:name') ?? '';
  const el = modal(
    `<div class="modal-box coop"><h2>${L('ui.coop.titulo')} <button class="x">${L('ui.cerrar')}</button></h2>
      <p>${L('ui.coop.texto')}</p>
      <label>${L('ui.coop.nombre')}</label>
      <input id="name" maxlength="12" autocomplete="off" placeholder="${L('ui.coop.nombre.ph')}" value="${esc(savedName)}" />
      <button class="primary" id="create">${L('ui.coop.crear')}</button>
      <div class="or">${L('ui.coop.o')}</div>
      <div class="row"><input id="code" maxlength="4" autocomplete="off" placeholder="${L('ui.coop.codigo')}" value="${esc(code.replace(/[^A-Za-z]/g, '').slice(0, 4))}" /><button id="join">${L('ui.coop.unirse')}</button></div>
      ${hasServer() ? '' : `<p class="note">${L('ui.coop.sinserver')}</p>`}
      <p class="conn"></p></div>`,
    { onClose: () => history.replaceState(null, '', location.pathname) },
  );
  const name = () => {
    const v = $<HTMLInputElement>('#name', el).value.trim();
    platform.save('derrumbe:name', v);
    return v;
  };
  $('#create', el).onclick = () => sendMsg({ t: 'create', name: name() });
  const join = () => sendMsg({ t: 'join', room: $<HTMLInputElement>('#code', el).value, name: name() });
  $('#join', el).onclick = join;
  $('#code', el).onkeydown = (e) => e.key === 'Enter' && join();
  updateConn();
  $<HTMLInputElement>(code ? '#name' : '#name', el).focus();
}

/** Preparación de campaña: baraja inicial, Reinado y semilla. */
export function renderCamp(): void {
  S.campaign = null;
  const saved = savedCampaign();
  prefs.ascension = Math.min(prefs.ascension, meta.ascMax);
  if (!deckUnlocked(meta, prefs.deck)) pickDeck(MAZO_INICIAL);
  const decks = DECKS.map((d) => {
    const open = deckUnlocked(meta, d.id);
    const need = d.unlock && ACHIEVEMENTS.some((a) => a.id === d.unlock) ? logN(d.unlock) : '';
    return `<button class="deck-opt ${d.id === prefs.deck ? 'on' : ''}" data-deck="${d.id}" ${open ? '' : 'disabled'}><span class="deck-back" data-back="${d.id}"></span><span class="deck-txt"><b>${barN(d.id)}</b><i class="deck-lema">${barL(d.id)}</i><span>${open ? barD(d.id) : L('ui.camp.bloqueada', { logro: need })}</span></span>${masteryBadge(meta.mastery.decks[d.id] ?? 0)}</button>`;
  }).join('');
  // Reinados: cada uno suma un giro a todos los anteriores
  const level = prefs.ascension;
  const asc = `<h3 class="sec">${L('ui.camp.reinado')}</h3>
        <div class="levels">${ASCENSIONS.map((_, i) => `<button class="level ${i === level ? 'on' : i < level ? 'in' : ''}" data-asc="${i}" ${i > meta.ascMax ? 'disabled' : ''} data-tip="<b>${L('ui.camp.reinado.n', { n: i + 1, nombre: reinN(i) })}</b>${reinD(i)}${i > meta.ascMax ? `<hr>${L('ui.camp.reinado.cerrado')}` : ''}"><b>${i + 1}</b><span>${reinN(i)}</span></button>`).join('')}</div>
        <ul class="level-twists">${level === 0 ? `<li>${L('ui.camp.reinado.base', { nombre: reinN(0) })}</li>` : ASCENSIONS.slice(1, level + 1).map((_, i) => `<li><b>${i + 2}</b>${reinD(i + 1)}</li>`).join('')}</ul>`;
  // lo que la Orden aporta a esta campaña, calculado con el mismo reductor
  const probe = newRun(runOpts(), 1);
  const legends = unlockedPool(meta).length;
  const sello = (s: string) => (getLang() === 'es' ? selloN(s).replace('Sello de lacre ', '').replace('Sello ', '') : selloN(s).replace(/ (wax )?seal$/i, ''));
  app.innerHTML = `
  <div class="camp">
    <header class="deck-head"><div><h1>${L('ui.camp.titulo')}</h1><p class="sub">${L('ui.camp.sub')}</p></div><div class="purse"><b>${cifraEl(meta.renown, 'esquirlas', 'i')} ✦</b><span>${L('ui.camp.bolsa', { n: meta.best, total: LAST_STAGE })}</span></div></header>
    <div class="camp-grid">
      <section class="panel camp-run"><div class="scroll">
        <div class="route">${STAGES.map((s, i) => `<div class="stop ${i < meta.best ? 'done' : ''} ${s.boss ? 'boss' : ''} ${s.tirano ? 'tirano' : ''}" data-tip="<b>${asaltoN(i + 1)}</b>${L('ui.run.tronos', { n: s.thrones })}${Ln(s.floors.length, 'ui.camp.parada.1', 'ui.camp.parada.n')}${s.tirano ? L('ui.camp.parada.tirano', { x: tiranoN(null) }) : s.boss ? L('ui.camp.parada.monarca') : i > 0 ? L('ui.camp.parada.rutas') : L('ui.camp.parada.juramento')}"><b>${i + 1}</b><span>${asaltoN(i + 1)}</span></div>`).join('')}</div>
        <h3 class="sec">${L('ui.camp.baraja')}</h3>
        <div class="deck-opts">${decks}</div>
        ${asc}
        </div>
        <div class="seed-row seed-foot"><label for="seed">${L('ui.camp.semilla')}</label><input id="seed" maxlength="24" autocomplete="off" placeholder="${L('ui.camp.semilla.ph')}" aria-describedby="seed-note" value="${esc(prefs.seed)}" /><p class="note" id="seed-note">${L('ui.camp.semilla.nota')}</p></div>
        <div class="row">
          <button id="back">${L('ui.volver')}</button>
          ${saved ? `<button class="primary big" id="resume">${L('ui.camp.continuar')}<small>${L('ui.camp.continuar.sub', { n: saved.run.stage, oro: cifra(saved.run.gold) })}</small></button>` : ''}
          <button class="${saved ? '' : 'primary'} big" id="new">${L('ui.camp.nueva')}<small>${saved ? L('ui.camp.nueva.abandona') : barN(prefs.deck)}</small></button>
        </div>
      </section>
      <section class="panel camp-ups"><div class="scroll">
        <h3 class="sec">${L('ui.camp.surtido')}</h3>
        <p class="note">${L('ui.camp.surtido.nota')}</p>
        <ul class="kit">
          <li>${glyphSvg('relicario', 'ico')}<div><b>${L('ui.camp.kit.reliquias', { n: probe.toolPool.length })}</b><span>${L('ui.camp.kit.reliquias.sub')}</span></div></li>
          <li>${glyphSvg('sello', 'ico')}<div><b>${L('ui.camp.kit.sellos')}</b><span>${probe.seals.map(sello).join(', ')}.</span></div></li>
          <li>${glyphSvg('forja', 'ico')}<div><b>${L('ui.camp.kit.acabados')}</b><span>${probe.treats.map((t) => acabN(t)).join(', ')}.</span></div></li>
          <li>${glyphSvg('incognita', 'ico')}<div><b>${L('ui.camp.kit.especiales', { n: probe.pool.length })}</b><span>${legends ? L('ui.camp.kit.legendarias', { n: legends }) : L('ui.camp.kit.legendarias.no')}</span></div></li>
          <li>${glyphSvg('jefe', 'ico')}<div><b>${L('ui.camp.kit.monarcas')}</b><span>${L('ui.camp.kit.monarcas.sub', { n: BOSSES.length })}</span></div></li>
          <li>${glyphSvg('oro', 'ico')}<div><b>${L('ui.oro.n', { n: probe.gold })}</b><span>${L('ui.camp.kit.oro')}${probe.up.vale ? L('ui.camp.kit.vale', { n: probe.up.vale }) : ''}${probe.up.tienda ? L('ui.camp.kit.tienda', { n: probe.up.tienda }) : ''}${probe.up.rutas ? L('ui.camp.kit.rutas') : ''}.</span></div></li>
        </ul>
        </div>
        <div class="row"><button id="guild">${L('ui.camp.orden')}</button></div>
      </section>
    </div>
  </div>`;
  $('#back').onclick = () => setScreen('home');
  $('#guild').onclick = () => openGuild('ups');
  $$('[data-back]').forEach((slot) => slot.appendChild(backEl(slot.dataset.back)));
  const seed = $<HTMLInputElement>('#seed');
  seed.oninput = () => (prefs.seed = seed.value);
  $$<HTMLButtonElement>('[data-asc]').forEach(
    (b) =>
      (b.onclick = () => {
        prefs.ascension = Number(b.dataset.asc);
        renderCamp();
      }),
  );
  $$<HTMLButtonElement>('[data-deck]').forEach(
    (b) =>
      (b.onclick = () => {
        pickDeck(b.dataset.deck!);
        renderCamp();
      }),
  );
  const resume = $('#resume');
  if (resume) resume.onclick = resumeCampaign;
  $('#new').onclick = () =>
    confirmAbandon(() => {
      if (saved?.run.phase === 'won') forgetSaved();
      newCampaign(runOpts());
    });
}

