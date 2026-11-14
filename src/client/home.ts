// Portada y preparación de campaña.
import { ACHIEVEMENTS, deckUnlocked, unlockedPool } from '../rules/achievements';
import { SEAL, TREATMENT } from '../rules/engine';
import { ASCENSIONS, BOSSES, DECK, DECKS, LAST_STAGE, STAGES, newRun } from '../rules/run';
import { hero, waxSeal } from './art';
import { backEl } from './card';
import { masteryBadge } from './engraving';
import { BRAND, LOCALE, Locale } from '../shared/brand';
import { $, $$, S, app, cap, esc, modal } from './core';
import { forgetSaved, newCampaign, pickDeck, prefs, resumeCampaign, runOpts, savedCampaign, today } from './campaign';
import { glyphSvg } from './glyphs';
import { meta, openGuild } from './guild';
import { hasServer, sendMsg, updateConn } from './net';
import { setScreen } from './router';
import { startTutorial, tutorialDone } from './tutorial-ui';
import { showRules, showSettings } from './widgets';
import { platform } from './platform';

const stamp = (id: string, glyph: string, title: string, sub: string, cls = '') =>
  `<button class="stamp-btn ${cls}" id="${id}">${glyphSvg(glyph, 'stamp-ico')}<span><b>${title}</b><small>${sub}</small></span></button>`;

/**
 * Candado de la marca: el título del idioma en grande (primera palabra en un renglón, el resto en
 * lacre debajo) y, cosida a él, la cinta grabada con su sello de lacre que lleva el nombre del otro
 * idioma; debajo, el lema. Así cualquier captura enseña los dos nombres. `face` fuerza una cara (la
 * QA monta la inglesa en `portada-en`); por defecto, la del navegador.
 */
export function brandLockup(face: Locale = LOCALE): string {
  const b = BRAND[face];
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
    `<div class="modal-box confirm"><h2>¿Abandonar la campaña?</h2><p>Tienes una campaña a medias en el asalto ${saved.run.stage}. Si empiezas otra se da por terminada y cobras las Coronas de lo ya superado.</p>
     <div class="row"><button class="x">Seguir con la mía</button><button class="primary" id="yes">Abandonarla y empezar</button></div></div>`,
  );
  $('#yes', el).onclick = () => {
    el.remove();
    then();
  };
}

export function renderHome(face: Locale = LOCALE): void {
  const saved = savedCampaign();
  const date = today();
  const dailyDone = meta.daily.date === date;
  const dailyOn = saved?.run.daily === date;
  const done = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
  const [, month, day] = date.split('-');
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const wonRun = saved?.run.phase === 'won';
  const resumeSub = saved ? (wonRun ? 'El último trono cayó: aún puedes seguir al Trono infinito' : `${saved.run.daily ? 'Asalto diario · ' : ''}asalto ${saved.run.stage} · ${saved.run.gold} de oro · ${DECK[saved.run.deckId].name}`) : '';
  app.innerHTML = `
  <div class="home">
    <section class="home-left">
      ${hero()}
      ${brandLockup(face)}
    </section>
    <section class="home-right">
      ${saved ? `<button class="resume" id="resume"><small>${wonRun ? 'Campaña ganada' : 'Seguir donde lo dejaste'}</small><b>${wonRun ? 'Ver la crónica' : 'Continuar campaña'}</b><span>${resumeSub}</span></button>` : ''}
      <nav class="menu">
        ${stamp('m-camp', 'estandarte', 'Campaña', 'roguelike · ocho asaltos y el Trono infinito', 'primary')}
        ${stamp('m-daily', 'diaria', 'Asalto diario', `${Number(day)} ${MONTHS[Number(month) - 1]} · ${dailyOn ? 'en curso' : dailyDone ? (meta.daily.won ? 'ganada hoy' : `hoy: ${meta.daily.cleared} asaltos`) : 'la misma semilla para todos'}`)}
        ${stamp('m-coop', 'cuadrilla', 'Cooperativo online', 'de 1 a 4 · asalto único o campaña')}
        ${stamp('m-tuto', 'senal', 'Partida guiada', 'un asalto de prácticas, paso a paso')}
        ${stamp('m-guild', 'engranaje', 'La Orden y colección', `${meta.renown} ✦ Coronas · logros ${done}/${ACHIEVEMENTS.length}`)}
        ${stamp('m-rules', 'pergamino', 'Reglas', 'Daño × Multi = Golpe, sellos y Reliquias')}
      </nav>
      <div class="row foot"><button class="ghost" id="m-set">Ajustes</button><p class="conn"></p></div>
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
  updateConn();
  const code = new URLSearchParams(location.search).get('sala');
  if (code && !S.session) coopModal(code);
}

function coopModal(code = ''): void {
  const savedName = platform.load('derrumbe:name') ?? '';
  const el = modal(
    `<div class="modal-box coop"><h2>Conjura en línea <button class="x">CERRAR</button></h2>
      <p>Crea una sala y comparte el código, o entra en la de tu conjura. De 1 a 4 jugadores; quien crea la sala elige entre un asalto único y una campaña entera.</p>
      <label>Tu nombre</label>
      <input id="name" maxlength="12" autocomplete="off" placeholder="NOMBRE" value="${esc(savedName)}" />
      <button class="primary" id="create">Crear sala</button>
      <div class="or">o únete a una</div>
      <div class="row"><input id="code" maxlength="4" autocomplete="off" placeholder="CÓDIGO" value="${esc(code.replace(/[^A-Za-z]/g, '').slice(0, 4))}" /><button id="join">Unirse</button></div>
      ${hasServer() ? '' : '<p class="note">Esta instalación no tiene servidor de salas: escribe su dirección en Ajustes para jugar en línea. La campaña en solitario no lo necesita.</p>'}
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
    const need = d.unlock ? ACHIEVEMENTS.find((a) => a.id === d.unlock)?.name : '';
    return `<button class="deck-opt ${d.id === prefs.deck ? 'on' : ''}" data-deck="${d.id}" ${open ? '' : 'disabled'}><span class="deck-back" data-back="${d.id}"></span><span class="deck-txt"><b>${d.name}</b><span>${open ? d.desc : `Bloqueada. Logro: ${need}.`}</span></span>${masteryBadge(meta.mastery.decks[d.id] ?? 0)}</button>`;
  }).join('');
  // Reinados: cada uno suma un giro a todos los anteriores
  const level = prefs.ascension;
  const asc = `<h3 class="sec">Reinado</h3>
        <div class="levels">${ASCENSIONS.map((a, i) => `<button class="level ${i === level ? 'on' : i < level ? 'in' : ''}" data-asc="${i}" ${i > meta.ascMax ? 'disabled' : ''} data-tip="<b>Reinado ${i + 1} · ${a.name}</b>${a.desc}${i > meta.ascMax ? '<hr>Gana una campaña en el Reinado anterior para abrirlo.' : ''}"><b>${i + 1}</b><span>${a.name}</span></button>`).join('')}</div>
        <ul class="level-twists">${level === 0 ? `<li>${ASCENSIONS[0].name}: las reglas de siempre. Ganar un Reinado abre el siguiente, con un giro más y un 25 % más de Coronas.</li>` : ASCENSIONS.slice(1, level + 1).map((a, i) => `<li><b>${i + 2}</b>${a.desc}</li>`).join('')}</ul>`;
  // lo que la Orden aporta a esta campaña, calculado con el mismo reductor
  const probe = newRun(runOpts(), 1);
  const legends = unlockedPool(meta).length;
  app.innerHTML = `
  <div class="camp">
    <header class="deck-head"><div><h1>Campaña</h1><p class="sub">Ocho asaltos, cuatro monarcas y, si aguantas, el Trono infinito.</p></div><div class="purse"><b>${meta.renown} ✦</b><span>Coronas · mejor: asalto ${meta.best}/${LAST_STAGE}</span></div></header>
    <div class="camp-grid">
      <section class="panel camp-run"><div class="scroll">
        <div class="route">${STAGES.map((s, i) => `<div class="stop ${i < meta.best ? 'done' : ''} ${s.boss ? 'boss' : ''}" data-tip="<b>${s.name}</b>${s.floors.length} guardia${s.floors.length > 1 ? 's' : ''} por trono${s.boss ? ' · con monarca' : ' · rutas con Juramento o Atajo'}"><b>${i + 1}</b><span>${s.name}</span></div>`).join('')}</div>
        <h3 class="sec">Baraja inicial</h3>
        <div class="deck-opts">${decks}</div>
        ${asc}
        </div>
        <div class="seed-row seed-foot"><label for="seed">Semilla</label><input id="seed" maxlength="24" autocomplete="off" placeholder="AL AZAR" aria-describedby="seed-note" value="${esc(prefs.seed)}" /><p class="note" id="seed-note">Una palabra repite exactamente la misma campaña, o reta a alguien con ella. Vacía: al azar.</p></div>
        <div class="row">
          <button id="back">Volver</button>
          ${saved ? `<button class="primary big" id="resume">Continuar<small>asalto ${saved.run.stage} · ${saved.run.gold} de oro</small></button>` : ''}
          <button class="${saved ? '' : 'primary'} big" id="new">Nueva campaña<small>${saved ? 'abandona la actual' : DECK[prefs.deck].name}</small></button>
        </div>
      </section>
      <section class="panel camp-ups"><div class="scroll">
        <h3 class="sec">Tu surtido</h3>
        <p class="note">Lo que has abierto en la Orden no te hace más fuerte: te da más con qué conspirar.</p>
        <ul class="kit">
          <li>${glyphSvg('relicario', 'ico')}<div><b>${probe.toolPool.length} reliquias</b><span>pueden salir en la Taberna y en los botines. Llevas 6, y su orden importa.</span></div></li>
          <li>${glyphSvg('sello', 'ico')}<div><b>Sellos de lacre</b><span>${probe.seals.map((s) => SEAL[s].name.replace('Sello de lacre ', '').replace('Sello ', '')).join(', ')}.</span></div></li>
          <li>${glyphSvg('forja', 'ico')}<div><b>Acabados</b><span>${probe.treats.map((t) => TREATMENT[t].name).join(', ')}.</span></div></li>
          <li>${glyphSvg('incognita', 'ico')}<div><b>${probe.pool.length} cartas especiales</b><span>${legends ? `${legends} de ellas legendarias, raras de ver.` : 'Las legendarias se ganan derrotando monarcas.'}</span></div></li>
          <li>${glyphSvg('jefe', 'ico')}<div><b>Monarcas</b><span>${BOSSES.length} posibles; el mapa te dice desde el principio cuáles te tocan.</span></div></li>
          <li>${glyphSvg('oro', 'ico')}<div><b>${probe.gold} de oro</b><span>para empezar${probe.up.vale ? ` · ${probe.up.vale} «Renovar mesa» gratis en cada Taberna` : ''}${probe.up.tienda ? ' · una reliquia más en oferta' : ''}${probe.up.rutas ? ' · tres rutas por asalto' : ''}.</span></div></li>
        </ul>
        </div>
        <div class="row"><button id="guild">Abrir la Orden</button></div>
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
