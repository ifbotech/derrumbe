// Portada y preparación de campaña.
import { ACHIEVEMENTS, deckUnlocked, unlockedPool } from '../rules/achievements';
import { ASCENSIONS, BOSSES, DECKS, LAST_STAGE, STAGES, newRun } from '../rules/run';
import { hero, waxSeal } from './art';
import { backEl } from './card';
import { masteryBadge } from './engraving';
import { Locale } from '../shared/brand';
import { $, $$, S, app, cap, esc, modal } from './core';
import { forgetSaved, newCampaign, pickDeck, prefs, resumeCampaign, runOpts, savedCampaign, today } from './campaign';
import { glyphSvg } from './glyphs';
import { meta, openGuild } from './guild';
import { L, Ln, acabN, asaltoN, barD, barN, getLang, logN, reinD, reinN, selloN } from './lengua';
import { brandFor } from '../shared/brand';
import { hasServer, sendMsg, updateConn } from './net';
import { setScreen } from './router';
import { startTutorial, tutorialDone } from './tutorial-ui';
import { bindLangSwitch, langSwitch, showRules, showSettings } from './widgets';
import { platform } from './platform';

const stamp = (id: string, glyph: string, title: string, sub: string, cls = '') =>
  `<button class="stamp-btn ${cls}" id="${id}">${glyphSvg(glyph, 'stamp-ico')}<span><b>${title}</b><small>${sub}</small></span></button>`;

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
  return `<h1 class="title" lang="${face}" aria-label="${esc(b.title)}"><span>${word(head)}</span>${rest.length ? `<span class="cut">${rest.map(word).join(' ')}</span>` : ''}</h1>
      <p class="brand-seal" lang="${other}">${waxSeal('brand-wax')}<span class="seal-ribbon">${esc(b.seal)}</span></p>
      <p class="tagline" lang="${face}">${esc(b.subtitle)}</p>`;
}

/** La primera campaña empieza por la partida guiada (se puede saltar). */
const withTutorial = (begin: () => void) => (tutorialDone() ? begin() : startTutorial(begin));

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
  const date = today();
  const dailyDone = meta.daily.date === date;
  const dailyOn = saved?.run.daily === date;
  const done = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
  const [, month, day] = date.split('-');
  const MONTHS = L('ui.meses').split(',');
  const wonRun = saved?.run.phase === 'won';
  const resumeSub = saved ? (wonRun ? L('ui.home.resume.ganada') : `${saved.run.daily ? L('ui.home.resume.diaria') : ''}${L('ui.home.resume.sub', { n: saved.run.stage, oro: saved.run.gold, baraja: barN(saved.run.deckId) })}`) : '';
  app.innerHTML = `
  <div class="home">
    <section class="home-left">
      ${hero()}
      ${brandLockup(face)}
      ${langSwitch('home-lang')}
    </section>
    <section class="home-right">
      ${saved ? `<button class="resume" id="resume"><small>${wonRun ? L('ui.home.resume.small.ganada') : L('ui.home.resume.small')}</small><b>${wonRun ? L('ui.home.resume.b.ganada') : L('ui.home.resume.b')}</b><span>${resumeSub}</span></button>` : ''}
      <nav class="menu">
        ${stamp('m-camp', 'estandarte', L('ui.home.camp'), L('ui.home.camp.sub'), 'primary')}
        ${stamp('m-daily', 'diaria', L('ui.home.diaria'), `${L('ui.home.fecha', { dia: Number(day), mes: MONTHS[Number(month) - 1] })} · ${dailyOn ? L('ui.home.diaria.curso') : dailyDone ? (meta.daily.won ? L('ui.home.diaria.ganada') : L('ui.home.diaria.hoy', { n: meta.daily.cleared })) : L('ui.home.diaria.semilla')}`)}
        ${stamp('m-coop', 'cuadrilla', L('ui.home.coop'), L('ui.home.coop.sub'))}
        ${stamp('m-tuto', 'senal', L('ui.home.tuto'), L('ui.home.tuto.sub'))}
        ${stamp('m-guild', 'engranaje', L('ui.home.orden'), L('ui.home.orden.sub', { coronas: meta.renown, hechos: done, total: ACHIEVEMENTS.length }))}
        ${stamp('m-rules', 'pergamino', L('ui.reglas'), L('ui.home.reglas.sub'))}
      </nav>
      <div class="row foot"><button class="ghost" id="m-set">${L('ui.ajustes')}</button><p class="conn"></p></div>
    </section>
  </div>`;
  const resume = $('#resume');
  if (resume) resume.onclick = resumeCampaign;
  $('#m-camp').onclick = () => setScreen('camp');
  $('#m-daily').onclick = () => {
    if (dailyOn) return resumeCampaign();
    confirmAbandon(() => withTutorial(() => newCampaign({ daily: date })));
  };
  $('#m-coop').onclick = () => coopModal();
  $('#m-tuto').onclick = () => startTutorial();
  $('#m-guild').onclick = () => openGuild('ups');
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
  if (!deckUnlocked(meta, prefs.deck)) pickDeck('obra');
  const decks = DECKS.map((d) => {
    const open = deckUnlocked(meta, d.id);
    const need = d.unlock && ACHIEVEMENTS.some((a) => a.id === d.unlock) ? logN(d.unlock) : '';
    return `<button class="deck-opt ${d.id === prefs.deck ? 'on' : ''}" data-deck="${d.id}" ${open ? '' : 'disabled'}><span class="deck-back" data-back="${d.id}"></span><span class="deck-txt"><b>${barN(d.id)}</b><span>${open ? barD(d.id) : L('ui.camp.bloqueada', { logro: need })}</span></span>${masteryBadge(meta.mastery.decks[d.id] ?? 0)}</button>`;
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
    <header class="deck-head"><div><h1>${L('ui.camp.titulo')}</h1><p class="sub">${L('ui.camp.sub')}</p></div><div class="purse"><b>${meta.renown} ✦</b><span>${L('ui.camp.bolsa', { n: meta.best, total: LAST_STAGE })}</span></div></header>
    <div class="camp-grid">
      <section class="panel camp-run"><div class="scroll">
        <div class="route">${STAGES.map((s, i) => `<div class="stop ${i < meta.best ? 'done' : ''} ${s.boss ? 'boss' : ''}" data-tip="<b>${asaltoN(i + 1)}</b>${Ln(s.floors.length, 'ui.camp.parada.1', 'ui.camp.parada.n')}${s.boss ? L('ui.camp.parada.monarca') : L('ui.camp.parada.rutas')}"><b>${i + 1}</b><span>${asaltoN(i + 1)}</span></div>`).join('')}</div>
        <h3 class="sec">${L('ui.camp.baraja')}</h3>
        <div class="deck-opts">${decks}</div>
        ${asc}
        </div>
        <div class="seed-row seed-foot"><label for="seed">${L('ui.camp.semilla')}</label><input id="seed" maxlength="24" autocomplete="off" placeholder="${L('ui.camp.semilla.ph')}" aria-describedby="seed-note" value="${esc(prefs.seed)}" /><p class="note" id="seed-note">${L('ui.camp.semilla.nota')}</p></div>
        <div class="row">
          <button id="back">${L('ui.volver')}</button>
          ${saved ? `<button class="primary big" id="resume">${L('ui.camp.continuar')}<small>${L('ui.camp.continuar.sub', { n: saved.run.stage, oro: saved.run.gold })}</small></button>` : ''}
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
          <li>${glyphSvg('oro', 'ico')}<div><b>${L('ui.oro.n', { n: probe.gold })}</b><span>${L('ui.camp.kit.oro')}${probe.up.vale ? L('ui.camp.kit.vale', { n: probe.up.vale }) : ''}${probe.up.tienda ? L('ui.camp.kit.tienda') : ''}${probe.up.rutas ? L('ui.camp.kit.rutas') : ''}.</span></div></li>
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
    confirmAbandon(() =>
      withTutorial(() => {
        if (saved?.run.phase === 'won') forgetSaved();
        newCampaign(runOpts());
      }),
    );
}

