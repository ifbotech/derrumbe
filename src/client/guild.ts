// El gremio: progreso permanente del jugador (renombre, mejoras, logros y colección).
// Vive en el navegador de cada uno, así que cuenta igual en solitario y en sala online.
import { Card, FORMATIONS, FORMATION_NAME, SEAL, SEALS, TREATMENT, TREATMENTS } from '../rules/engine';
import { ACHIEVEMENTS, claim, deckUnlocked, noteRun, unlocksOf } from '../rules/achievements';
import { BOSSES, DECKS, Meta, UPGRADES, buyUpgrade, depthOf, loadMeta, settle, stagesCleared } from '../rules/run';
import { SPECIALS } from '../rules/specials';
import { ARCH, Arch, TOOLS } from '../rules/tools';
import { sfx } from './audio';
import { ALL_CARDS, backEl, cardEl, ferreteroEl, portraitEl } from './card';
import { $, $$, Campaign, S, app, loadJson } from './core';
import { glyphSvg } from './glyphs';
import { setScreen } from './router';
import { choice, toolTile } from './widgets';

const META_KEY = 'derrumbe:meta';
const SETTLED_KEY = 'derrumbe:settled';

export const meta: Meta = loadMeta(loadJson(META_KEY));
export const saveMeta = () => localStorage.setItem(META_KEY, JSON.stringify(meta));
saveMeta(); // deja guardada la migración, si la hubo

/** Renombre que dio la última campaña cerrada (para el acta). */
export let lastGain = 0;

/**
 * Abona el renombre de una campaña terminada, una sola vez. Quien gana y sigue a los cimientos
 * abisales cobra la victoria al ganar y, al caer, solo lo que bajó de más.
 */
export function maybeSettle(c: Campaign): void {
  const run = c.run;
  if (run.phase !== 'won' && run.phase !== 'lost') return;
  const mark = run.endless ? c.key + ':abismo' : c.key;
  if (localStorage.getItem(SETTLED_KEY) === mark) return;
  localStorage.setItem(SETTLED_KEY, mark);
  if (run.daily && meta.daily.date === run.daily && !run.endless) {
    // la Obra diaria paga una vez al día; repetirla solo puede mejorar la marca
    lastGain = 0;
    const cleared = stagesCleared(run);
    if (cleared > meta.daily.cleared) meta.daily = { date: run.daily, cleared, won: run.conquered };
    return saveMeta();
  }
  if (run.endless) {
    lastGain = depthOf(run);
    meta.renown += lastGain;
  } else lastGain = settle(meta, run);
  saveMeta();
}

/** Pasa al gremio lo que ha ocurrido y avisa de los logros nuevos. */
export function trackMeta(): void {
  if (S.campaign) noteRun(meta, S.campaign.run);
  const fresh = claim(meta);
  saveMeta();
  fresh.forEach((a, i) => setTimeout(() => achToast(a.name, a.renown, unlocksOf(a.id)), i * 900));
}

function achToast(name: string, renown: number, unlock: string | null): void {
  let stack = $('.ach-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'ach-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = 'ach-toast';
  el.innerHTML = `<small>Logro</small><b>${name}</b><span>+${renown} ✦${unlock ? ` · ${unlock}` : ''}</span>`;
  stack.appendChild(el);
  sfx.stamp();
  setTimeout(() => el.remove(), 5200);
}

const ACH_GLYPH: Record<string, string> = {
  primera: 'maza', capataz: 'casco', media: 'andamio', madre: 'estandarte', asc3: 'plomada', abismo: 'abismo', abismo3: 'abismo', diaria: 'diaria',
  doblepar: 'gemelos', color: 'cortavidrios', full: 'dados', poker: 'comodin', real: 'cinta', golpe100: 'bola', golpe500: 'nitro', golpe2000: 'resonador',
  limpio10: 'cincel', limpio50: 'calibre', pisos100: 'taladro', pisos500: 'dinamita', intacto: 'sacos', rico: 'hucha', cinturon: 'engranaje', forja: 'forja',
  contratos: 'pergamino', atajo: 'atajo', coleccion: 'incognita', ferretero: 'paleta', jefes: 'jefe', 'j-doble': 'sordina', 'j-escasez': 'chatarrero',
  'j-sequia': 'botiquin', 'j-intemperie': 'acido', 'j-blindaje': 'encofrado', 'j-furia': 'dinamita', 'j-inestable': 'piqueta',
};

type Tab = 'ups' | 'ach' | 'col';
let tab: Tab = 'ups';
export const openGuild = (t: Tab) => {
  tab = t;
  setScreen('guild');
};

export function renderGuild(): void {
  const done = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
  app.innerHTML = `
  <div class="camp guild">
    <header class="deck-head"><div><h1>El gremio</h1><p class="sub">Lo que se queda contigo entre campañas: surtidos nuevos, no más fuerza bruta.</p></div>
      <div class="purse"><b>${meta.renown} ✦</b><span>renombre · ${meta.runs} campañas · ${meta.wins} ganadas</span></div></header>
    <div class="guild-body">
      <div class="row tabs">
        <button data-tab="ups" class="${tab === 'ups' ? 'on' : ''}">Mejoras</button>
        <button data-tab="ach" class="${tab === 'ach' ? 'on' : ''}">Logros ${done}/${ACHIEVEMENTS.length}</button>
        <button data-tab="col" class="${tab === 'col' ? 'on' : ''}">Colección</button>
        <button id="back">Volver</button>
      </div>
      <section class="panel guild-panel"><div class="scroll" id="guild-list"></div></section>
    </div>
  </div>`;
  const list = $('#guild-list');
  if (tab === 'ups') list.innerHTML = upgradesHtml();
  else if (tab === 'ach') list.innerHTML = achievementsHtml();
  else collection(list);
  $('#back').onclick = () => setScreen('home');
  $$<HTMLButtonElement>('[data-tab]').forEach(
    (b) =>
      (b.onclick = () => {
        tab = b.dataset.tab as Tab;
        renderGuild();
      }),
  );
  $$<HTMLButtonElement>('[data-up]').forEach(
    (b) =>
      (b.onclick = () => {
        if (!buyUpgrade(meta, b.dataset.up!)) return;
        saveMeta();
        sfx.stamp();
        renderGuild();
      }),
  );
}

function upgradesHtml(): string {
  return `<div class="two-col">${UPGRADES.map((u) => {
    const level = meta.up[u.id] ?? 0;
    const cost = u.costs[level];
    const pips = u.costs.map((_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
    return `<div class="up ${cost === undefined ? 'maxed' : ''}">${glyphSvg(u.glyph, 'badge')}<div><b>${u.name}</b><span>${u.desc}</span><div class="pips">${pips}</div></div>
      <button data-up="${u.id}" ${cost === undefined || meta.renown < cost ? 'disabled' : ''}>${cost === undefined ? 'Hecho' : `${cost} ✦`}</button></div>`;
  }).join('')}</div>`;
}

function achievementsHtml(): string {
  return `<div class="two-col">${ACHIEVEMENTS.map((a) => {
    const [now, goal] = a.progress(meta);
    const ok = !!meta.ach[a.id];
    const unlock = unlocksOf(a.id);
    return `<div class="ach ${ok ? 'ok' : ''}">${glyphSvg(ACH_GLYPH[a.id] ?? 'estandarte', 'badge')}<div><b>${a.name}</b><span>${a.desc}${unlock ? ` <em>Desbloquea: ${unlock}.</em>` : ''}</span>
      <div class="bar-prog"><i style="width:${Math.round((Math.min(now, goal) / goal) * 100)}%"></i></div></div>
      <div class="ach-r">${ok ? 'Hecho' : goal > 1 ? `${now}/${goal}` : ''}<b>+${a.renown} ✦</b></div></div>`;
  }).join('')}</div>`;
}

function collection(list: HTMLElement): void {
  const have = (seen: string[], id: string) => seen.includes(id);
  const achName = (id: string | null | undefined) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? '';
  const sec = (title: string, n: number, of: number, note: string) => {
    const s = document.createElement('section');
    s.className = 'col-sec';
    s.innerHTML = `<h3 class="sec">${title} <span>${n}/${of}</span></h3><p class="col-note">${note}</p><div class="deck-grid"></div>`;
    list.appendChild(s);
    return $('.deck-grid', s);
  };
  const hidden = (title: string, desc: string, deck?: string) => {
    const box = choice(backEl(deck), title, desc, null, null);
    box.classList.add('unknown');
    return box;
  };

  const decks = sec('Barajas', DECKS.filter((d) => deckUnlocked(meta, d.id)).length, DECKS.length, 'Cada baraja inicial tiene su dorso. Se desbloquean con logros y se eligen al empezar una campaña.');
  for (const d of DECKS) decks.appendChild(deckUnlocked(meta, d.id) ? choice(backEl(d.id), d.name, d.desc, null, null) : hidden(d.name, `Bloqueada. Logro: ${achName(d.unlock)}.`, d.id));

  const seenSp = SPECIALS.filter((s) => have(meta.seen.specials, s.id)).length;
  const specials = sec('Cartas especiales', seenSp, SPECIALS.length, 'Aparecen aquí cuando te tocan en una campaña. Las ocho últimas son legendarias: raras de ver, y hay que ganárselas.');
  for (const s of SPECIALS) {
    specials.appendChild(
      have(meta.seen.specials, s.id) ? choice(cardEl({ id: `g-${s.id}`, suit: 'X', rank: 0, sp: s.id }), s.name, s.desc, null, null) : hidden(s.locked ? 'Legendaria' : '???', s.locked ? `Logro: ${achName(s.locked)}.` : 'Aún no te ha tocado.'),
    );
  }

  const seenTools = TOOLS.filter((t) => have(meta.seen.tools, t.id)).length;
  const tools = sec('Herramientas', seenTools, TOOLS.length, 'Las que has llevado en el cinturón. Su color dice la rareza: común, de oficio, de capataz o reliquia.');
  const boxes = (Object.keys(ARCH) as Arch[]).flatMap((a) => TOOLS.filter((t) => t.arch === a));
  for (const t of boxes) {
    const locked = t.box && !meta.up[`caja_${t.box}`];
    tools.appendChild(have(meta.seen.tools, t.id) ? choice(toolTile(t.id), t.name, t.desc, ARCH[t.arch], null) : hidden('???', locked ? `En una caja del gremio: ${ARCH[t.box!]}.` : `${ARCH[t.arch]}. Aún no la has llevado.`));
  }

  const marks = sec('Sellos y tratamientos', SEALS.length + TREATMENTS.length, SEALS.length + TREATMENTS.length, 'Marcas que se estampan en las cartas de baraja: en la forja de la ferretería, en la selección tras cada obra o como premio de un contrato.');
  const sample: Card = { id: 'm', suit: 'S', rank: 7 };
  SEALS.forEach((s, i) => marks.appendChild(choice(cardEl({ ...sample, id: `m-s${i}`, suit: (['H', 'S', 'D', 'C'] as const)[i], seal: s }), SEAL[s].name, SEAL[s].desc, null, null)));
  TREATMENTS.forEach((t, i) => marks.appendChild(choice(cardEl({ ...sample, id: `m-t${i}`, rank: 9 + (i % 2), suit: (['C', 'D', 'H', 'S'] as const)[i], tr: t }), TREATMENT[t].name, TREATMENT[t].desc, null, null)));

  const seenForms = FORMATIONS.filter((f) => have(meta.seen.forms, f)).length;
  const forms = sec('Formaciones', seenForms, FORMATIONS.length, 'Las jugadas que has llegado a hacer en campaña.');
  forms.classList.add('chips');
  forms.innerHTML = FORMATIONS.map((f) => `<span class="form-chip ${have(meta.seen.forms, f) ? 'on' : ''}">${FORMATION_NAME[f]}</span>`).join('');

  const seenBoss = BOSSES.filter((b) => have(meta.seen.bosses, b.id)).length;
  const people = sec('Personajes', 1 + seenBoss, 1 + BOSSES.length, 'El Ferretero y los jefes de obra que has derrotado.');
  people.appendChild(choice(ferreteroEl(), 'El Ferretero', 'Vende, gruñe y cobra.', null, null));
  for (const b of BOSSES) people.appendChild(have(meta.seen.bosses, b.id) ? choice(portraitEl(`j-${b.id}`, b.who), b.who, `${b.name}: ${b.desc}`, null, null) : hidden('???', 'Un jefe de obra que aún no has derrotado.'));

  const french = sec('Baraja francesa', 54, 54, 'Las 52 cartas de siempre y dos comodines.');
  const order = (c: Card) => (c.rank > 10 ? 0 : c.rank === 1 ? 1 : c.rank === 0 ? 3 : 2);
  [...ALL_CARDS].sort((a, b) => order(a) - order(b)).forEach((c) => french.appendChild(cardEl(c)));
}
