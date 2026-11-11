// Portada y preparación de campaña.
import { ACHIEVEMENTS, deckUnlocked, unlockedPool } from '../rules/achievements';
import { SEAL, TREATMENT } from '../rules/engine';
import { BOSSES, DECK, DECKS, LAST_STAGE, STAGES, newRun } from '../rules/run';
import { hero } from './art';
import { backEl } from './card';
import { $, $$, S, app, esc, modal } from './core';
import { forgetSaved, newCampaign, pickDeck, prefs, resumeCampaign, runOpts, savedCampaign, today } from './campaign';
import { glyphSvg } from './glyphs';
import { meta, openGuild } from './guild';
import { sendMsg, updateConn } from './net';
import { setScreen } from './router';
import { startTutorial, tutorialDone } from './tutorial-ui';
import { showRules, showSettings } from './widgets';

const stamp = (id: string, glyph: string, title: string, sub: string, cls = '') =>
  `<button class="stamp-btn ${cls}" id="${id}">${glyphSvg(glyph, 'stamp-ico')}<span><b>${title}</b><small>${sub}</small></span></button>`;

/** La primera campaña empieza por la partida guiada (se puede saltar). */
const withTutorial = (begin: () => void) => (tutorialDone() ? begin() : startTutorial(begin));

/** Si hay una campaña a medias, pregunta antes de abandonarla. */
function confirmAbandon(then: () => void): void {
  const saved = savedCampaign();
  if (!saved || saved.run.phase === 'won') return then();
  const el = modal(
    `<div class="modal-box confirm"><h2>¿Abandonar la campaña?</h2><p>Tienes una campaña a medias en la obra ${saved.run.stage}. Si empiezas otra se da por terminada y cobras el renombre de lo ya superado.</p>
     <div class="row"><button class="x">Seguir con la mía</button><button class="primary" id="yes">Abandonarla y empezar</button></div></div>`,
  );
  $('#yes', el).onclick = () => {
    el.remove();
    then();
  };
}

export function renderHome(): void {
  const saved = savedCampaign();
  const date = today();
  const dailyDone = meta.daily.date === date;
  const dailyOn = saved?.run.daily === date;
  const done = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
  const [, month, day] = date.split('-');
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const wonRun = saved?.run.phase === 'won';
  const resumeSub = saved ? (wonRun ? 'La Torre Madre cayó: aún puedes bajar a los cimientos abisales' : `${saved.run.daily ? 'Obra diaria · ' : ''}obra ${saved.run.stage} · ${saved.run.gold} de oro · ${DECK[saved.run.deckId].name}`) : '';
  app.innerHTML = `
  <div class="home">
    <section class="home-left">
      ${hero()}
      <h1 class="title"><span>Derr</span><span class="cut">umbe</span></h1>
    </section>
    <section class="home-right">
      ${saved ? `<button class="resume" id="resume"><small>${wonRun ? 'Campaña ganada' : 'Seguir donde lo dejaste'}</small><b>${wonRun ? 'Ver el acta' : 'Continuar campaña'}</b><span>${resumeSub}</span></button>` : ''}
      <nav class="menu">
        ${stamp('m-camp', 'estandarte', 'Campaña', 'roguelike · ocho obras y lo que haya debajo', 'primary')}
        ${stamp('m-daily', 'diaria', 'Obra diaria', `${Number(day)} ${MONTHS[Number(month) - 1]} · ${dailyOn ? 'en curso' : dailyDone ? (meta.daily.won ? 'ganada hoy' : `hoy: ${meta.daily.cleared} obras`) : 'la misma semilla para todos'}`)}
        ${stamp('m-coop', 'cuadrilla', 'Cooperativo online', 'de 1 a 4 · clásica o campaña')}
        ${stamp('m-tuto', 'casco', 'Partida guiada', 'una obra de prácticas con el capataz')}
        ${stamp('m-guild', 'engranaje', 'Gremio y colección', `${meta.renown} ✦ de renombre · logros ${done}/${ACHIEVEMENTS.length}`)}
        ${stamp('m-rules', 'pergamino', 'Reglas', 'Fuerza × Resonancia, sellos y cinturón')}
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
  const savedName = localStorage.getItem('derrumbe:name') ?? '';
  const el = modal(
    `<div class="modal-box coop"><h2>Cuadrilla en línea <button class="x">CERRAR</button></h2>
      <p>Crea una sala y comparte el código, o entra en la de tu cuadrilla. De 1 a 4 jugadores; quien crea la sala elige entre una obra clásica y una campaña entera.</p>
      <label>Tu nombre</label>
      <input id="name" maxlength="12" autocomplete="off" placeholder="NOMBRE" value="${esc(savedName)}" />
      <button class="primary" id="create">Crear sala</button>
      <div class="or">o únete a una</div>
      <div class="row"><input id="code" maxlength="4" autocomplete="off" placeholder="CÓDIGO" value="${esc(code.replace(/[^A-Za-z]/g, '').slice(0, 4))}" /><button id="join">Unirse</button></div>
      <p class="conn"></p></div>`,
    { onClose: () => history.replaceState(null, '', location.pathname) },
  );
  const name = () => {
    const v = $<HTMLInputElement>('#name', el).value.trim();
    localStorage.setItem('derrumbe:name', v);
    return v;
  };
  $('#create', el).onclick = () => sendMsg({ t: 'create', name: name() });
  const join = () => sendMsg({ t: 'join', room: $<HTMLInputElement>('#code', el).value, name: name() });
  $('#join', el).onclick = join;
  $('#code', el).onkeydown = (e) => e.key === 'Enter' && join();
  updateConn();
  $<HTMLInputElement>(code ? '#name' : '#name', el).focus();
}

/** Preparación de campaña: baraja inicial, ascenso y semilla. */
export function renderCamp(): void {
  S.campaign = null;
  const saved = savedCampaign();
  prefs.ascension = Math.min(prefs.ascension, meta.ascMax);
  if (!deckUnlocked(meta, prefs.deck)) pickDeck('obra');
  const decks = DECKS.map((d) => {
    const open = deckUnlocked(meta, d.id);
    const need = d.unlock ? ACHIEVEMENTS.find((a) => a.id === d.unlock)?.name : '';
    return `<button class="deck-opt ${d.id === prefs.deck ? 'on' : ''}" data-deck="${d.id}" ${open ? '' : 'disabled'}><span class="deck-back" data-back="${d.id}"></span><span class="deck-txt"><b>${d.name}</b><span>${open ? d.desc : `Bloqueada. Logro: ${need}.`}</span></span></button>`;
  }).join('');
  const asc =
    meta.ascMax > 0
      ? `<div class="asc"><span>Ascenso</span>${Array.from({ length: meta.ascMax + 1 }, (_, i) => `<button data-asc="${i}" class="${i === prefs.ascension ? 'on' : ''}">${i}</button>`).join('')}<small>Cada ascenso: torres +10 % y renombre +25 %. Desde el 2, las K llegan apuntaladas; desde el 3, +1 de amenaza.</small></div>`
      : '';
  // lo que el gremio aporta a esta campaña, calculado con el mismo reductor
  const probe = newRun(runOpts(), 1);
  const legends = unlockedPool(meta).length;
  app.innerHTML = `
  <div class="camp">
    <header class="deck-head"><div><h1>Campaña</h1><p class="sub">Ocho obras, cuatro jefes y, si aguantas, los cimientos abisales.</p></div><div class="purse"><b>${meta.renown} ✦</b><span>renombre · mejor: obra ${meta.best}/${LAST_STAGE}</span></div></header>
    <div class="camp-grid">
      <section class="panel camp-run"><div class="scroll">
        <div class="route">${STAGES.map((s, i) => `<div class="stop ${i < meta.best ? 'done' : ''} ${s.boss ? 'boss' : ''}" data-tip="<b>${s.name}</b>${s.floors.length} piso${s.floors.length > 1 ? 's' : ''} por torre${s.boss ? ' · con jefe de obra' : ' · rutas con contrato o atajo'}"><b>${i + 1}</b><span>${s.name}</span></div>`).join('')}</div>
        <h3 class="sec">Baraja inicial</h3>
        <div class="deck-opts">${decks}</div>
        ${asc}
        <h3 class="sec">Semilla</h3>
        <div class="seed-row"><input id="seed" maxlength="24" autocomplete="off" placeholder="AL AZAR" value="${esc(prefs.seed)}" /><p class="note">Escribe una palabra para repetir exactamente la misma campaña, o para retar a alguien con ella. Vacío: al azar.</p></div>
        </div>
        <div class="row">
          <button id="back">Volver</button>
          ${saved ? `<button class="primary big" id="resume">Continuar<small>obra ${saved.run.stage} · ${saved.run.gold} de oro</small></button>` : ''}
          <button class="${saved ? '' : 'primary'} big" id="new">Nueva campaña<small>${saved ? 'abandona la actual' : DECK[prefs.deck].name}</small></button>
        </div>
      </section>
      <section class="panel camp-ups"><div class="scroll">
        <h3 class="sec">Tu surtido</h3>
        <p class="note">Lo que has abierto en el gremio no te hace más fuerte: te da más con qué construir.</p>
        <ul class="kit">
          <li>${glyphSvg('engranaje', 'ico')}<div><b>${probe.toolPool.length} herramientas</b><span>pueden salir en ferreterías y botines. El cinturón lleva 6, y su orden importa.</span></div></li>
          <li>${glyphSvg('sello', 'ico')}<div><b>Sellos</b><span>${probe.seals.map((s) => SEAL[s].name.replace('Sello de ', '').replace('Sello ', '')).join(', ')}.</span></div></li>
          <li>${glyphSvg('forja', 'ico')}<div><b>Tratamientos</b><span>${probe.treats.map((t) => TREATMENT[t].name).join(', ')}.</span></div></li>
          <li>${glyphSvg('incognita', 'ico')}<div><b>${probe.pool.length} cartas especiales</b><span>${legends ? `${legends} de ellas legendarias, raras de ver.` : 'Las legendarias se ganan derrotando jefes.'}</span></div></li>
          <li>${glyphSvg('jefe', 'ico')}<div><b>Jefes de obra</b><span>${BOSSES.length} posibles; el plano te dice desde el principio cuáles te tocan.</span></div></li>
          <li>${glyphSvg('oro', 'ico')}<div><b>${probe.gold} de oro</b><span>para empezar${probe.up.vale ? ` · ${probe.up.vale} «Revolver cajones» gratis por ferretería` : ''}${probe.up.tienda ? ' · una herramienta más en oferta' : ''}${probe.up.rutas ? ' · tres rutas por obra' : ''}.</span></div></li>
        </ul>
        </div>
        <div class="row"><button id="guild">Abrir el gremio</button></div>
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
