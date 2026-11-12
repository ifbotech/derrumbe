// La Orden: progreso permanente del jugador (Coronas, mejoras, logros y colección).
// Vive en el navegador de cada uno, así que cuenta igual en solitario y en sala online.
import { Card, FORMATIONS, FORMATION_NAME, SEAL, SEALS, TREATMENT, TREATMENTS } from '../rules/engine';
import { ACHIEVEMENTS, claim, deckUnlocked, noteRun, unlocksOf } from '../rules/achievements';
import { BOSS, BOSSES, DECK, DECKS, LAST_STAGE, Meta, UPGRADES, buyUpgrade, depthOf, loadMeta, settle, stageDef, stagesCleared } from '../rules/run';
import { SPECIALS } from '../rules/specials';
import { ARCH, Arch, TOOLS } from '../rules/tools';
import type { Autopsy } from '../rules/autopsy';
import { sfx } from './audio';
import { ALL_CARDS, backEl, cardEl, ferreteroEl, portraitEl } from './card';
import { masteryBadge } from './engraving';
import { newCampaign, pickDeck, prefs, runOpts } from './campaign';
import { $, $$, Campaign, S, app, esc, loadJson, toast } from './core';
import { confirmAbandon } from './home';
import { actaText } from './runscreens';
import { glyphSvg } from './glyphs';
import { validDeath } from './causa';
import { setScreen } from './router';
import { choice, toolTile } from './widgets';
import { platform } from './platform';

const META_KEY = 'derrumbe:meta';
const SETTLED_KEY = 'derrumbe:settled';

export const meta: Meta = loadMeta(loadJson(META_KEY));
export const saveMeta = () => platform.save(META_KEY, JSON.stringify(meta));
saveMeta(); // deja guardada la migración, si la hubo

/** Coronas que dio la última campaña cerrada (para la crónica). */
export let lastGain = 0;

// ── archivo de crónicas: las 25 últimas campañas terminadas ──
const ARCHIVE_KEY = 'derrumbe:actas';
export const ARCHIVE_SIZE = 25;
export interface Acta {
  /** La campaña a la que pertenece (una que sigue a los cimientos abisales actualiza su acta). */
  key: string;
  when: string;
  won: boolean;
  /** Obras superadas y obra en la que terminó. */
  cleared: number;
  stage: number;
  boss: string | null;
  depth: number;
  turns: number;
  maxHit: number;
  tools: string[];
  seed: string;
  deck: string;
  level: number;
  daily: string | null;
  online: boolean;
  gain: number;
  /** El acta en texto, lista para copiar. */
  text: string;
  /** Causa del derrumbe, si la campaña cayó en la mesa (campo opcional: las actas viejas no la traen). */
  death?: Autopsy | null;
}
export const archive: Acta[] = (loadJson<Acta[]>(ARCHIVE_KEY) ?? []).filter((a) => a && typeof a.key === 'string' && Array.isArray(a.tools)).slice(0, ARCHIVE_SIZE);

function fileActa(c: Campaign, gain: number): void {
  const run = c.run;
  const entry: Acta = {
    key: c.key,
    when: new Date().toISOString(),
    won: run.conquered,
    cleared: stagesCleared(run),
    stage: run.stage,
    boss: run.boss ? (BOSS[run.boss]?.who ?? null) : null,
    depth: depthOf(run),
    turns: run.stats.turns,
    maxHit: run.stats.maxHit,
    tools: run.tools.map((t) => t.id),
    seed: c.online ? '' : run.seedText,
    deck: run.deckId,
    level: run.ascension + 1,
    daily: run.daily,
    online: c.online,
    gain,
    text: actaText(run, c.online),
    death: run.conquered ? null : (run.death ?? null),
  };
  const old = archive.findIndex((a) => a.key === c.key);
  if (old >= 0) archive.splice(old, 1);
  archive.unshift(entry);
  archive.length = Math.min(archive.length, ARCHIVE_SIZE);
  platform.save(ARCHIVE_KEY, JSON.stringify(archive));
}

/**
 * Abona el renombre de una campaña terminada, una sola vez. Quien gana y sigue a los cimientos
 * abisales cobra la victoria al ganar y, al caer, solo lo que bajó de más.
 */
export function maybeSettle(c: Campaign): void {
  const run = c.run;
  if (run.phase !== 'won' && run.phase !== 'lost') return;
  const mark = run.endless ? c.key + ':abismo' : c.key;
  if (platform.load(SETTLED_KEY) === mark) return;
  platform.save(SETTLED_KEY, mark);
  if (run.daily && meta.daily.date === run.daily && !run.endless) {
    // la Obra diaria paga una vez al día; repetirla solo puede mejorar la marca
    lastGain = 0;
    const cleared = stagesCleared(run);
    if (cleared > meta.daily.cleared) meta.daily = { date: run.daily, cleared, won: run.conquered };
    fileActa(c, 0);
    return saveMeta();
  }
  if (run.endless) {
    lastGain = depthOf(run);
    meta.renown += lastGain;
  } else lastGain = settle(meta, run);
  fileActa(c, lastGain);
  saveMeta();
}

/** Pasa a la Orden lo que ha ocurrido y avisa de los logros nuevos. */
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

// Icono de cada logro: el emblema de GLYPH que mejor dice la imagen de la biblia de nombres (§16).
// Los emblemas se regrabaron en la V6 con las mismas claves, así que la clave no dice el dibujo:
// el comentario de cada línea, sí.
const ACH_GLYPH: Record<string, string> = {
  primera: 'cinta', // escalinata (bota sobre un peldaño)
  capataz: 'contenedor', // cofre con candado (el carcelero)
  media: 'bastion', // almena (medio castillo)
  madre: 'corona_rota', // corona partida en dos
  asc3: 'gemelos', // dagas cruzadas (el gran conspirador)
  abismo: 'abismo', // trono con la escalera que baja
  abismo3: 'coronas', // tres coronas apiladas
  diaria: 'diaria', // calendario de la ronda
  doblepar: 'naipes_par', // dos parejas de naipes
  color: 'naipes_color', // cinco picas en abanico
  full: 'naipes_full', // tres y dos naipes
  poker: 'naipes_poker', // cuatro ases
  real: 'naipes_real', // escalera de corazones con corona
  golpe100: 'comodin', // puño en alto
  golpe500: 'rayo', // rayo
  golpe2000: 'cometa', // cometa
  limpio10: 'cincel', // estilete (la aguja de la mano firme)
  limpio50: 'tiralineas', // ganzúa
  pisos100: 'casco', // yelmo
  pisos500: 'maza', // maza (azote de la corte)
  intacto: 'reparacion', // corazón entero
  rico: 'oro', // montón de monedas
  cinturon: 'relicario', // relicario con seis huecos llenos
  forja: 'sello', // sello de lacre
  contratos: 'pergamino', // pergamino (la palabra dada)
  atajo: 'atajo', // puerta pequeña en una muralla
  coleccion: 'puntales', // mazo de naipes atado
  ferretero: 'hucha', // bolsa de monedas del Tratante
  jefes: 'jefe', // corona
  'j-doble': 'contrapeso', // máscara (el de dos caras)
  'j-escasez': 'nivel', // balanza del Usurero
  'j-sequia': 'paleta', // cáliz
  'j-intemperie': 'carambano', // carámbanos
  'j-blindaje': 'plano_maestro', // llave grande
  'j-furia': 'saboteador', // capucha negra
  'j-inestable': 'ultimo', // reloj de arena
};
/** Mejoras de la Orden cuyo emblema (`glyph` en run.ts, de reglas) ya no dice lo que son tras el regrabado. */
const UP_GLYPH: Record<string, string> = {
  vale: 'cajones', // Favor del Tratante: un «Renovar mesa» gratis (antes la escalinata)
  tienda: 'toldo', // Puesto grande (antes el guantelete)
};

type Tab = 'ups' | 'ach' | 'col' | 'arc';
let tab: Tab = 'ups';
export const openGuild = (t: Tab) => {
  tab = t;
  setScreen('guild');
};

export function renderGuild(): void {
  const done = ACHIEVEMENTS.filter((a) => meta.ach[a.id]).length;
  app.innerHTML = `
  <div class="camp guild">
    <header class="deck-head"><div><h1>La Orden</h1><p class="sub">Lo que se queda contigo entre campañas: reliquias nuevas, no más pegada.</p></div>
      <div class="purse"><b>${meta.renown} ✦</b><span>Coronas · ${meta.runs} campañas · ${meta.wins} ganadas</span></div></header>
    <div class="guild-body">
      <div class="row tabs">
        <button data-tab="ups" class="${tab === 'ups' ? 'on' : ''}">Mejoras</button>
        <button data-tab="ach" class="${tab === 'ach' ? 'on' : ''}">Logros ${done}/${ACHIEVEMENTS.length}</button>
        <button data-tab="col" class="${tab === 'col' ? 'on' : ''}">Colección</button>
        <button data-tab="arc" class="${tab === 'arc' ? 'on' : ''}">Archivo ${archive.length}</button>
        <button id="back">Volver</button>
      </div>
      <section class="panel guild-panel"><div class="scroll" id="guild-list"></div></section>
    </div>
  </div>`;
  const list = $('#guild-list');
  if (tab === 'ups') list.innerHTML = upgradesHtml();
  else if (tab === 'ach') list.innerHTML = achievementsHtml();
  else if (tab === 'arc') archiveTab(list);
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

/** Archivo de crónicas: cómo acabó cada una de las últimas campañas, con su semilla para volver a jugarla. */
function archiveTab(list: HTMLElement): void {
  if (!archive.length) {
    list.innerHTML = `<p class="col-note">Aún no hay crónicas. Cada campaña que termines, la ganes o no, queda archivada aquí (las ${ARCHIVE_SIZE} últimas), con su semilla para volver a jugarla.</p>`;
    return;
  }
  const wins = archive.filter((a) => a.won).length;
  const day = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  list.innerHTML = `<p class="col-note">${archive.length} crónicas · ${wins} ganadas · mayor Golpe ${Math.max(...archive.map((a) => a.maxHit))} · campaña más rápida ganada: ${wins ? `${Math.min(...archive.filter((a) => a.won).map((a) => a.turns))} turnos` : '—'}.</p>
  <div class="actas">${archive
    .map((a, i) => {
      const where = a.won ? (a.depth ? `Corona rota + Trono infinito ${a.depth}` : 'Corona rota') : `asalto ${Math.min(a.stage, LAST_STAGE)}/${LAST_STAGE} · ${stageDef(a.stage).name}${a.boss ? ` · ante ${a.boss}` : ''}`;
      const replay = !!a.seed && !a.daily && !a.online;
      // la causa de la derrota, con la voz de la crónica: rótulo rojo, título en mono gruesa y detalle debajo
      const death = !a.won && validDeath(a.death) ? a.death : null;
      const cause = death
        ? `<p class="acta-causa k-${death.kind}"><span class="ac-rot">Causa de la derrota</span><b>${esc(death.title)}</b>${death.detail ? `<small>${esc(death.detail)}</small>` : ''}</p>`
        : '';
      return `<article class="acta-row ${a.won ? 'won' : 'lost'}">
        <span class="acta-stamp">${a.won ? 'Corona rota' : 'Deshecha'}</span>
        <div class="acta-main">
          <b>${DECK[a.deck]?.name ?? a.deck} · Reinado ${a.level}${a.daily ? ` · diaria ${a.daily}` : ''}${a.online ? ' · en sala' : ''}</b>
          <span>${day(a.when)} · ${where} · ${a.turns} turnos · mayor Golpe ${a.maxHit}${a.gain ? ` · +${a.gain} ✦` : ''}</span>
          <span class="acta-tools">${a.tools.map((id) => glyphSvg(id, 'mini-ico')).join('') || '<em>sin reliquias</em>'}<em>${a.seed ? `semilla ${a.seed}` : 'semilla del servidor'}</em></span>
          ${cause}
        </div>
        <div class="acta-btns"><button data-replay="${i}" ${replay ? '' : 'disabled'} data-tip="<b>Rejugar semilla</b>${replay ? 'Empieza una campaña nueva con la misma semilla, baraja y Reinado: las mismas decisiones darán exactamente la misma campaña.' : a.daily ? 'El Asalto diario solo se juega en su día.' : 'En sala la semilla la pone el servidor.'}">Rejugar semilla</button><button data-copy="${i}">Copiar crónica</button></div>
      </article>`;
    })
    .join('')}</div>`;
  $$<HTMLButtonElement>('[data-copy]', list).forEach(
    (b) =>
      (b.onclick = () => {
        const text = archive[Number(b.dataset.copy)]?.text ?? '';
        void navigator.clipboard?.writeText(text).then(
          () => toast('Crónica copiada'),
          () => toast('No se pudo copiar'),
        );
      }),
  );
  $$<HTMLButtonElement>('[data-replay]', list).forEach(
    (b) =>
      (b.onclick = () => {
        const a = archive[Number(b.dataset.replay)];
        if (!a) return;
        confirmAbandon(() => {
          prefs.seed = a.seed;
          if (deckUnlocked(meta, a.deck)) pickDeck(a.deck);
          prefs.ascension = Math.min(a.level - 1, meta.ascMax);
          newCampaign(runOpts());
        });
      }),
  );
}

function upgradesHtml(): string {
  return `<div class="two-col">${UPGRADES.map((u) => {
    const level = meta.up[u.id] ?? 0;
    const cost = u.costs[level];
    const pips = u.costs.map((_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('');
    return `<div class="up ${cost === undefined ? 'maxed' : ''}">${glyphSvg(UP_GLYPH[u.id] ?? u.glyph, 'badge')}<div><b>${u.name}</b><span>${u.desc}</span><div class="pips">${pips}</div></div>
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

  const decks = sec('Barajas', DECKS.filter((d) => deckUnlocked(meta, d.id)).length, DECKS.length, 'Cada baraja inicial tiene su dorso. Se desbloquean con logros y se eligen al empezar una campaña. El sello marca el Reinado más alto que has ganado con ella.');
  for (const d of DECKS) {
    const back = backEl(d.id);
    back.dataset.lupa = `deck:${d.id}`;
    const box = decks.appendChild(deckUnlocked(meta, d.id) ? choice(back, d.name, d.desc, null, null) : hidden(d.name, `Bloqueada. Logro: ${achName(d.unlock)}.`, d.id));
    box.insertAdjacentHTML('beforeend', masteryBadge(meta.mastery.decks[d.id] ?? 0));
  }

  const seenSp = SPECIALS.filter((s) => have(meta.seen.specials, s.id)).length;
  const specials = sec('Cartas especiales', seenSp, SPECIALS.length, 'Aparecen aquí cuando te tocan en una campaña. Las ocho últimas son legendarias: raras de ver, y hay que ganárselas.');
  for (const s of SPECIALS) {
    specials.appendChild(
      have(meta.seen.specials, s.id) ? choice(cardEl({ id: `g-${s.id}`, suit: 'X', rank: 0, sp: s.id }), s.name, s.desc, null, null) : hidden(s.locked ? 'Legendaria' : '???', s.locked ? `Logro: ${achName(s.locked)}.` : 'Aún no te ha tocado.'),
    );
  }

  const seenTools = TOOLS.filter((t) => have(meta.seen.tools, t.id)).length;
  const tools = sec('Reliquias', seenTools, TOOLS.length, 'Las que has llevado contigo. El marco dice la rareza: liso (Común), con filete de plata (Rara), con flor de lis (Noble) o con corona (Regia). El sello de maestría marca el Reinado más alto que has ganado con ella puesta.');
  const boxes = (Object.keys(ARCH) as Arch[]).flatMap((a) => TOOLS.filter((t) => t.arch === a));
  for (const t of boxes) {
    const locked = t.box && !meta.up[`caja_${t.box}`];
    const box = tools.appendChild(have(meta.seen.tools, t.id) ? choice(toolTile(t.id), t.name, t.desc, ARCH[t.arch], null) : hidden('???', locked ? `En un arcón de la Orden: ${ARCH[t.box!]}.` : `${ARCH[t.arch]}. Aún no la has llevado.`));
    box.insertAdjacentHTML('beforeend', masteryBadge(meta.mastery.tools[t.id] ?? 0));
  }

  const marks = sec('Sellos de lacre y acabados', SEALS.length + TREATMENTS.length, SEALS.length + TREATMENTS.length, 'Marcas que se estampan en las cartas de baraja: en la Mesa de lacre del Mercado clandestino, en la selección tras cada asalto o como premio de un Juramento.');
  const sample: Card = { id: 'm', suit: 'S', rank: 7 };
  SEALS.forEach((s, i) => marks.appendChild(choice(cardEl({ ...sample, id: `m-s${i}`, suit: (['H', 'S', 'D', 'C'] as const)[i], seal: s }), SEAL[s].name, SEAL[s].desc, null, null)));
  TREATMENTS.forEach((t, i) => marks.appendChild(choice(cardEl({ ...sample, id: `m-t${i}`, rank: 9 + (i % 2), suit: (['C', 'D', 'H', 'S'] as const)[i], tr: t }), TREATMENT[t].name, TREATMENT[t].desc, null, null)));

  const seenForms = FORMATIONS.filter((f) => have(meta.seen.forms, f)).length;
  const forms = sec('Formaciones', seenForms, FORMATIONS.length, 'Las jugadas que has llegado a hacer en campaña.');
  forms.classList.add('chips');
  forms.innerHTML = FORMATIONS.map((f) => `<span class="form-chip ${have(meta.seen.forms, f) ? 'on' : ''}">${FORMATION_NAME[f]}</span>`).join('');

  const seenBoss = BOSSES.filter((b) => have(meta.seen.bosses, b.id)).length;
  const people = sec('Personajes', 1 + seenBoss, 1 + BOSSES.length, 'El Tratante y los monarcas que has derrotado.');
  people.appendChild(choice(ferreteroEl(), 'El Tratante', 'Vende, gruñe y cobra.', null, null));
  for (const b of BOSSES) people.appendChild(have(meta.seen.bosses, b.id) ? choice(portraitEl(`j-${b.id}`, b.who), b.who, `${b.name}: ${b.desc}`, null, null) : hidden('???', 'Un monarca que aún no has derrotado.'));

  const french = sec('Baraja francesa', 54, 54, 'Las 52 cartas de siempre y dos comodines.');
  const order = (c: Card) => (c.rank > 10 ? 0 : c.rank === 1 ? 1 : c.rank === 0 ? 3 : 2);
  [...ALL_CARDS].sort((a, b) => order(a) - order(b)).forEach((c) => french.appendChild(cardEl(c)));
}
