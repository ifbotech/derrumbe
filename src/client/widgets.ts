// Piezas de interfaz que se repiten en varias pantallas: la opción-carta, las Reliquias, el visor
// de mazos, las reglas y los ajustes.
import { Card, SUITS, SUIT_GLYPH, sortCards } from '../rules/engine';
import { TOOL, TOOL_SLOTS, ToolInst } from '../rules/tools';
import { isLang, onLangChange, setLang, tFor } from '../shared/i18n';
import { L, Ln, archN, espD, espN, getLang, palo, rarN, relD, relN } from './lengua';
import { Volume, getVolume, setVolume, sfx } from './audio';
import { cardEl, suitSvg, tileEl } from './card';
import { $, $$, S, applySettings, closeModal, cycleSpeed, kw, modal, settings, speedLabel, toast } from './core';
import { glyphSvg } from './glyphs';
import { reconnect } from './net';
import { applyBackup, describeBackup, exportProgress, readBackup } from './backup';
import { COMMUNITY_URL, customServer, platform, setCustomServer } from './platform';
import { rulesHtml } from './rules-text';
import { controlRows } from './prompts';
import { whisperSetting } from './whispers';
import { type ShareResult, clearTelemetry, feedbackIssueUrl, shareFeedback, telemetryBytes, telemetryLog, telemetryRemote } from './telemetry';

export const spCard = (id: string): Card => ({ id: `show-${id}`, suit: 'X', rank: 0, sp: id });

/** Una opción uniforme: carta o ficha arriba, nombre y texto debajo. Si se puede elegir, se pulsa la carta. */
export function choice(el: HTMLElement, title: string, desc: string, tag: string | null, onClick: (() => void) | null, cls = ''): HTMLElement {
  const box = document.createElement('div');
  box.className = `choice ${cls}`;
  box.appendChild(el);
  box.insertAdjacentHTML('beforeend', `<h4>${title}</h4><p>${kw(desc)}</p>${tag ? `<span class="tag-act">${tag}</span>` : ''}`);
  if (onClick) {
    box.classList.add('pick');
    box.tabIndex = 0;
    box.onclick = onClick;
    box.onkeydown = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      onClick();
    };
  } else if (tag) box.classList.add('no-pick');
  return box;
}

// ───────────────────────── Reliquias ─────────────────────────

const KIND_LABEL = { f: '+D', r: '+M', x: '×M', copy: '⇉', p: '•' } as const;
const KIND_KEY = { f: 'ui.rel.suma.d', r: 'ui.rel.suma.m', x: 'ui.rel.mult.m', copy: 'ui.rel.copia', p: 'ui.rel.pasiva' } as const;
/** Qué hace una reliquia, en palabras: «Suma Daño», «Multiplica el Multi»… */
export const kindName = (k: keyof typeof KIND_KEY): string => L(KIND_KEY[k]);

/** Globo de ayuda de una reliquia. */
export function toolTip(id: string, extra = ''): string {
  const t = TOOL[id];
  if (!t) return '';
  return `<b>${relN(id)}</b>${relD(id)}<small>${rarN(t.rarity)} · ${archN(t.arch)} · ${kindName(t.kind)}</small>${extra}`;
}

/** Ficha de reliquia con el color de su rareza. */
export function toolTile(id: string): HTMLDivElement {
  const el = tileEl(id, TOOL[id] ? relN(id) : id, 'relic', TOOL[id]?.rarity);
  el.dataset.tip = toolTip(id);
  el.dataset.lupa = `tool:${id}`;
  return el;
}

/** Permutación que mueve la reliquia `from` al hueco `to`. */
export function moveOrder(n: number, from: number, to: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  order.splice(to, 0, ...order.splice(from, 1));
  return order;
}

export interface BeltOpts {
  /** Se puede reordenar: recibe la permutación nueva. */
  onReorder?: (order: number[]) => void;
  /** Se puede vender: recibe el hueco. */
  onSell?: (slot: number) => void;
  sellValue?: (id: string) => number;
}

/**
 * Las Reliquias: de izquierda a derecha, que es el orden en que se activan.
 * Para reordenar, arrastra una sobre otra o pulsa una y luego el hueco de destino.
 */
export function beltEl(tools: ToolInst[], opts: BeltOpts = {}): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `belt${opts.onReorder ? ' can-order' : ''}`;
  let picked = -1;
  const move = (from: number, to: number) => {
    if (from === to || !opts.onReorder) return;
    sfx.flick();
    opts.onReorder(moveOrder(tools.length, from, to));
  };
  for (let i = 0; i < TOOL_SLOTS; i++) {
    const t = tools[i];
    const slot = document.createElement('div');
    if (!t || !TOOL[t.id]) {
      slot.className = 'belt-slot empty';
      slot.innerHTML = `<span>${i + 1}</span>`;
      el.appendChild(slot);
      continue;
    }
    const def = TOOL[t.id];
    const count = String(def.count?.(t) ?? '').replace(/(\d),(\d)/, getLang() === 'en' ? '$1.$2' : '$1,$2'); // juice-ux V10: la cifra de la pastilla con el punto inglés
    slot.className = `belt-slot tool r-${def.rarity} k-${def.kind}`;
    slot.dataset.slot = String(i);
    slot.dataset.id = t.id;
    slot.dataset.lupa = `tool:${t.id}`;
    slot.tabIndex = 0;
    const sell = opts.onSell ? `<hr>${L('ui.rel.vender', { n: opts.sellValue?.(t.id) ?? 0 })}` : '';
    const order = opts.onReorder ? `<hr>${L('ui.rel.orden')}` : '';
    slot.dataset.tip = toolTip(t.id, `<small>${i === 0 ? L('ui.rel.hueco.1', { n: i + 1, total: TOOL_SLOTS }) : L('ui.rel.hueco.n', { n: i + 1, total: TOOL_SLOTS, antes: i })}</small>${order}${sell}`);
    slot.innerHTML = `${glyphSvg(t.id, 'belt-ico')}<span class="kind">${KIND_LABEL[def.kind]}</span>${count ? `<span class="cnt">${count}</span>` : ''}<span class="pos">${i + 1}</span>`;
    if (opts.onReorder) {
      slot.draggable = true;
      slot.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', String(i));
        slot.classList.add('dragging');
      });
      slot.addEventListener('dragend', () => slot.classList.remove('dragging'));
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('over');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('over'));
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('over');
        const from = Number(e.dataTransfer?.getData('text/plain'));
        if (Number.isInteger(from)) move(from, i);
      });
    }
    const click = () => {
      if (picked >= 0 && picked !== i) return move(picked, i);
      if (picked === i) {
        picked = -1;
        slot.classList.remove('picked');
        if (opts.onSell) opts.onSell(i);
        return;
      }
      if (!opts.onReorder && !opts.onSell) return;
      picked = i;
      $$('.belt-slot', el).forEach((s) => s.classList.toggle('picked', s === slot));
    };
    slot.addEventListener('click', click);
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        click();
      } else if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        // Mayús + flechas mueven la reliquia; las flechas solas mueven el foco
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'ArrowLeft' && i > 0) move(i, i - 1);
        else if (e.key === 'ArrowRight' && i < tools.length - 1) move(i, i + 1);
      }
    });
    el.appendChild(slot);
  }
  return el;
}

// ───────────────────────── Visor de mazos ─────────────────────────

export interface DeckTab {
  label: string;
  cards: Card[];
  note?: string;
}

/**
 * Enseña uno o varios montones ordenados por palo y número (nunca en su orden real).
 * Con `pick`, deja elegir ese número de cartas y las devuelve.
 */
export function deckModal(title: string, tabs: DeckTab[], opts: { pick?: number; can?: (c: Card) => boolean; onPick?: (cards: Card[]) => void; onCancel?: () => void; sticky?: boolean; confirm?: string } = {}): HTMLDivElement {
  let tab = 0;
  const chosen: Card[] = [];
  const el = modal(
    `<div class="modal-box deck-box"><h2>${title} ${opts.sticky ? (opts.onCancel ? `<button class="cancel">${L('ui.cancelar')}</button>` : '') : `<button class="x">${L('ui.cerrar')}</button>`}</h2>
     <div class="row tabs deck-tabs"></div><p class="col-note deck-note"></p><div class="deck-rows"></div>
     ${opts.pick && opts.pick > 1 ? `<div class="row end-row"><button class="primary" id="deck-ok" disabled>${opts.confirm ?? L('ui.confirmar')}</button></div>` : ''}</div>`,
    { sticky: opts.sticky, cls: 'deck-modal' },
  );
  const done = () => {
    closeModal(el);
    el.remove();
    opts.onPick?.(chosen);
  };
  const draw = () => {
    const t = tabs[tab];
    $('.deck-tabs', el).innerHTML = tabs.length > 1 ? tabs.map((x, i) => `<button data-tab="${i}" class="${i === tab ? 'on' : ''}">${x.label} · ${x.cards.length}</button>`).join('') : '';
    $$('[data-tab]', el).forEach((b) => (b.onclick = () => ((tab = Number(b.dataset.tab)), draw())));
    $('.deck-note', el).textContent = t.note ?? '';
    const rows = $('.deck-rows', el);
    rows.innerHTML = '';
    const sorted = sortCards(t.cards);
    const groups: [string, Card[]][] = [...SUITS.map((s): [string, Card[]] => [`${suitSvg(s)} ${palo(s)}`, sorted.filter((c) => !c.sp && c.suit === s)]), [`${SUIT_GLYPH.X} ${L('ui.mazo.especiales')}`, sorted.filter((c) => c.sp || c.suit === 'X')]];
    for (const [label, cards] of groups) {
      if (!cards.length) continue;
      const row = document.createElement('div');
      row.className = 'deck-row';
      row.innerHTML = `<h4>${label} <span>${cards.length}</span></h4><div class="deck-mini"></div>`;
      for (const c of cards) {
        const ce = cardEl(c);
        if (c.sp && !ce.dataset.tip) ce.dataset.tip = `<b>${espN(c.sp)}</b>${espD(c.sp)}`;
        if (opts.pick) {
          const ok = !opts.can || opts.can(c);
          ce.classList.add(ok ? 'pickable' : 'unpickable');
          if (ok) ce.tabIndex = 0;
          ce.classList.toggle('sel', chosen.includes(c));
          if (ok)
            ce.onclick = () => {
              const at = chosen.indexOf(c);
              if (at >= 0) chosen.splice(at, 1);
              else if (chosen.length < opts.pick!) chosen.push(c);
              if (opts.pick === 1 && chosen.length === 1) return done();
              ce.classList.toggle('sel', chosen.includes(c));
              const ok2 = $<HTMLButtonElement>('#deck-ok', el);
              if (ok2) ok2.disabled = chosen.length !== opts.pick;
            };
        }
        $('.deck-mini', row).appendChild(ce);
      }
      rows.appendChild(row);
    }
    if (!rows.children.length) rows.innerHTML = `<p class="col-note">${L('ui.mazo.vacio')}</p>`;
  };
  draw();
  const ok = $('#deck-ok', el);
  if (ok) ok.onclick = done;
  const cancel = $('.cancel', el);
  if (cancel)
    cancel.onclick = () => {
      el.remove();
      opts.onCancel?.();
    };
  return el;
}

// ───────────────────────── Reglas y ajustes ─────────────────────────

export function showRules(): void {
  modal(`<div class="modal-box"><h2>${L('ui.reglas')} <button class="x">${L('ui.cerrar')}</button></h2>${rulesHtml(S.shown?.config)}</div>`);
}

// la tabla de controles sale de prompts.ts (CONTROL_ROWS): la misma que el README y la prueba de humo

// ───────────── V9 · Feedback de prueba ─────────────
// Un botón de un toque que dice la verdad: con VITE_TELEMETRY_URL manda la última campaña (y nada más) al
// pulsar; sin ella, comparte, copia o descarga. Nada se envía al abrir una pantalla.

/** Lo que va a pasar al pulsar, según cómo se construyó esta versión. */
export const feedbackPromise = (): string =>
  L(telemetryRemote() ? 'ui.set.feedback.remoto' : 'ui.set.feedback.local');

/** La línea llana de Ajustes (fila «Datos de prueba»). */
const feedbackPlain = (): string => L(telemetryRemote() ? 'ui.set.llana.remoto' : 'ui.set.llana.local');

/** Lo que pasó al pulsar, en palabras del jugador. */
export function feedbackDone(r: ShareResult): string {
  const miss = telemetryRemote() && r !== 'enviado' ? L('ui.fb.fallo') : '';
  const text = { enviado: 'ui.fb.enviado', compartido: 'ui.fb.compartido', copiado: 'ui.fb.copiado', descargado: 'ui.fb.descargado' } as const satisfies Record<ShareResult, string>;
  return miss + L(text[r]);
}

/** El bloque del botón (Crónica y Ajustes). `where` solo cambia la clase, para la maqueta de cada pantalla. */
export function feedbackHtml(where: 'acta' | 'ajustes'): string {
  const issue = feedbackIssueUrl();
  const empty = !telemetryLog().length;
  return `<div class="fb fb-${where}" id="fb-${where}">
    <button class="fb-send" id="fb-send" ${empty ? 'disabled' : ''}>${L('ui.fb.boton')}</button>
    ${issue ? `<button class="fb-issue" id="fb-issue" data-tip="<b>${L('ui.fb.aviso')}</b>${L('ui.fb.aviso.tip')}">${L('ui.fb.aviso')}</button>` : ''}
    <p class="fb-estado" id="fb-estado" role="status" aria-live="polite">${empty ? L('ui.fb.vacio') : feedbackPromise()}</p>
  </div>`;
}

/** Pinta en el bloque lo que pasó al pulsar (también lo usa la QA para fotografiar la confirmación). */
export function feedbackShow(root: ParentNode, r: ShareResult): void {
  const box = root.querySelector<HTMLElement>('.fb');
  const out = root.querySelector<HTMLElement>('.fb-estado');
  if (!box || !out) return;
  out.textContent = feedbackDone(r);
  box.dataset.hecho = r;
}

/** Engancha el botón y «Abrir aviso» del bloque. Un toque, una llamada: nada sale sin pulsar. */
export function bindFeedback(root: ParentNode, after?: () => void): void {
  const send = root.querySelector<HTMLButtonElement>('#fb-send');
  const out = root.querySelector<HTMLElement>('#fb-estado');
  if (send && out)
    send.onclick = async () => {
      if (send.getAttribute('aria-busy') === 'true') return;
      send.setAttribute('aria-busy', 'true');
      out.textContent = L(telemetryRemote() ? 'ui.fb.enviando' : 'ui.fb.momento');
      try {
        const r = await shareFeedback();
        feedbackShow(root, r);
        sfx.stamp();
      } catch {
        out.textContent = L('ui.fb.otra');
      } finally {
        send.removeAttribute('aria-busy');
        after?.();
      }
    };
  const issue = root.querySelector<HTMLButtonElement>('#fb-issue');
  if (issue)
    issue.onclick = () => {
      const url = feedbackIssueUrl();
      if (url) platform.openExternal(url);
    };
}

/** «N campañas · X kB, guardadas en este equipo». */
function telemetryCount(): string {
  const log = telemetryLog();
  const runs = log.filter((r) => r.modo !== 'guia').length;
  const guides = log.length - runs;
  const kb = (telemetryBytes() / 1024).toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${Ln(runs, 'ui.fb.campana.1', 'ui.fb.campana.n')}${guides ? Ln(guides, 'ui.fb.guia.1', 'ui.fb.guia.n') : ''}${L('ui.fb.kb', { kb })}`;
}

/** «Ver»: lo guardado, tal cual, en un cuadro de solo lectura. */
function showTelemetry(): void {
  const json = JSON.stringify(telemetryLog(), null, 2);
  const el = modal(
    `<div class="modal-box fb-ver"><h2>${L('ui.fb.datos')} <button class="x">${L('ui.cerrar')}</button></h2>
      <p>${L('ui.fb.datos.texto', { n: telemetryBytes().toLocaleString(getLang() === 'es' ? 'es-ES' : 'en-US') })}</p>
      <textarea readonly spellcheck="false" aria-label="${L('ui.fb.datos.aria')}"></textarea></div>`,
    { cls: 'fb-ver-modal' },
  );
  $<HTMLTextAreaElement>('textarea', el).value = json;
}

// ───────────── V10 · Idioma: el interruptor ES | EN ─────────────
// Dos botones a la vista, el activo marcado (aria-pressed). Cada uno lleva su `lang`, así que su nombre
// accesible («Español», «English») se lee en su idioma. Al pulsar, setLang repinta al instante (router.ts)
// y el foco vuelve al mismo botón en la pantalla nueva.

/** El interruptor ES | EN. `id` distingue el de la Portada del de Ajustes. */
export function langSwitch(id: string): string {
  const now = getLang();
  const btn = (l: 'es' | 'en', name: string) => `<button class="lang-opt${now === l ? ' on' : ''}" data-lang="${l}" lang="${l}" aria-pressed="${now === l}" aria-label="${name}">${l.toUpperCase()}</button>`;
  return `<div class="lang-switch" id="${id}" role="group" aria-label="${L('ui.idioma')}">${btn('es', 'Español')}<span class="lang-sep" aria-hidden="true">|</span>${btn('en', 'English')}</div>`;
}

/** Engancha los interruptores de `root`. */
export function bindLangSwitch(root: ParentNode): void {
  root.querySelectorAll<HTMLButtonElement>('.lang-switch [data-lang]').forEach((b) => {
    b.onclick = () => {
      const l = b.dataset.lang;
      const where = b.closest('.lang-switch')?.id;
      if (!isLang(l) || l === getLang()) return;
      sfx.stamp();
      setLang(l);
      // la pantalla ya está repintada: el foco vuelve al botón pulsado
      document.querySelector<HTMLElement>(`#${where} [data-lang="${l}"]`)?.focus();
    };
  });
}

/** Ajustes: idioma, mezcla de sonido, ritmo de la mesa, accesibilidad, pantalla y controles. */
export function showSettings(onChange?: () => void): void {
  if (document.querySelector('.settings-modal')) return;
  const el = modal(
    `<div class="modal-box settings"><h2>${L('ui.ajustes')} <button class="x">${L('ui.cerrar')}</button></h2>
      <div class="set-cols">
      <div class="set-col set-col-a">
      ${feedbackHtml('ajustes')}
      <div class="set fb-datos"><div><b>${L('ui.fb.datos')}</b><span id="fb-cuenta"></span><span class="fb-llana">${feedbackPlain()}</span></div>
        <span class="server-edit"><button id="fb-ver">${L('ui.fb.ver')}</button><button id="fb-borrar">${L('ui.fb.borrar')}</button></span></div>
      <div class="set set-idioma"><div><b>${L('ui.idioma')}</b><span>${L('ui.set.idioma.texto')} <span lang="${getLang() === 'es' ? 'en' : 'es'}">${tFor(getLang() === 'es' ? 'en' : 'es', 'ui.set.idioma.texto')}</span></span></div>${langSwitch('set-lang')}</div>
      <div class="set server-row"><div><b>${L('ui.set.servidor')}</b><span>${L('ui.set.servidor.texto')}</span></div>
        <span class="server-edit"><input id="set-server" autocomplete="off" spellcheck="false" placeholder="${L('ui.set.servidor.ph')}" aria-label="${L('ui.set.servidor')}" /><button id="set-server-ok">${L('ui.set.usar')}</button></span></div>
      <div class="set set-progreso"><div><b>${L('ui.set.progreso')}</b><span>${L('ui.set.progreso.texto')}</span></div>
        <span class="server-edit"><button id="set-export">${L('ui.set.exportar')}</button><button id="set-import">${L('ui.set.importar')}</button><input type="file" id="set-file" accept="application/json,.json" hidden /></span></div>
      <div class="set"><div><b>${L('ui.set.comunidad')}</b><span>${L('ui.set.comunidad.texto')}</span></div><button id="set-community">${L('ui.set.abrir')}</button></div>
      </div>
      <div class="set-col set-col-b">
      <div class="set-list" id="set-vol"></div><div class="set-list" id="set-toggles"></div>
      </div>
      </div>
      <h3 class="sec">${L('ui.set.controles')}</h3>
      <table class="keys"><tr><th></th><th>${L('ui.set.teclado')}</th><th>${L('ui.set.mando')}</th></tr>${controlRows(getLang(), true).map(([what, key, pad]) => `<tr><td>${what}</td><td>${key}</td><td>${pad}</td></tr>`).join('')}</table>
    </div>`,
    { cls: 'settings-modal' },
  );
  // V10: al cambiar de idioma, Ajustes se repinta en el idioma nuevo (la pantalla de debajo la repinta router.ts)
  const off = onLangChange(() => {
    off();
    if (!el.isConnected) return;
    el.remove();
    showSettings(onChange);
  });
  // la mezcla: tres deslizadores independientes
  const vol = getVolume();
  const sliders: [keyof Volume, string, string][] = [
    ['master', L('ui.set.maestro'), L('ui.set.maestro.texto')],
    ['music', L('ui.set.musica'), L('ui.set.musica.texto')],
    ['sfx', L('ui.set.efectos'), L('ui.set.efectos.texto')],
  ];
  $('#set-vol', el).innerHTML = sliders
    .map(([id, name, desc]) => `<div class="set"><div><b>${name}</b><span>${desc}</span></div><label class="slider"><input type="range" min="0" max="100" step="5" value="${Math.round(vol[id] * 100)}" data-vol="${id}" aria-label="${name}" /><output>${Math.round(vol[id] * 100)}</output></label></div>`)
    .join('');
  $$<HTMLInputElement>('[data-vol]', el).forEach((input) => {
    input.oninput = () => {
      setVolume(input.dataset.vol as keyof Volume, Number(input.value) / 100);
      input.nextElementSibling!.textContent = input.value;
    };
    input.onchange = () => input.dataset.vol !== 'music' && sfx.stamp();
  });
  const yes = (on: boolean) => (on ? L('ui.si') : L('ui.no'));
  const draw = () => {
    // la fila de Susurros es de juice-ux (whispers.ts): aquí solo se traduce su Sí / No
    const [wName, wDesc, wValue, wDo] = whisperSetting();
    const rows: [string, string, string, () => void, boolean, string][] = [
      [L('ui.set.velocidad'), L('ui.set.velocidad.texto'), speedLabel(), () => void cycleSpeed(), true, 'set-speed'],
      [L('ui.set.calma'), L('ui.set.calma.texto'), yes(settings.calm), () => ((settings.calm = !settings.calm), applySettings()), settings.calm, 'set-calma'],
      [L('ui.set.tintas'), L('ui.set.tintas.texto'), settings.inks === 4 ? L('ui.set.tintas.4') : L('ui.set.tintas.2'), () => ((settings.inks = settings.inks === 4 ? 2 : 4), applySettings()), true, 'set-tintas'],
      // V10: Alto contraste va detrás de Tintas, para que las filas de la 9.0 conserven su sitio
      [L('ui.set.contraste'), L('ui.set.contraste.texto'), yes(settings.contrast), () => ((settings.contrast = !settings.contrast), applySettings()), settings.contrast, 'set-contraste'],
      [L('ui.set.pantalla'), L('ui.set.pantalla.texto'), yes(platform.isFullscreen()), () => void platform.toggleFullscreen().then(draw), platform.isFullscreen(), 'set-pantalla'],
      [wName, wDesc, wValue === 'No' ? L('ui.no') : wValue === 'Sí' ? L('ui.si') : wValue, wDo, wValue !== 'No', 'set-susurros'],
    ];
    const list = $('#set-toggles', el);
    list.innerHTML = rows.map(([name, desc, value, , on, cls], i) => `<div class="set ${cls}"><div><b>${name}</b><span>${desc}</span></div><button data-set="${i}" class="${on ? 'on' : ''}">${value}</button></div>`).join('');
    $$('[data-set]', list).forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.set);
          rows[i][3]();
          draw();
          $<HTMLButtonElement>(`[data-set="${i}"]`, list)?.focus();
          onChange?.();
        }),
    );
  };
  draw();
  bindLangSwitch(el);
  // V9 · Feedback de prueba: el botón, la cuenta de lo guardado, «Ver» y «Borrar»
  const count = () => {
    $('#fb-cuenta', el).textContent = telemetryCount();
    $<HTMLButtonElement>('#fb-borrar', el).disabled = !telemetryLog().length;
  };
  count();
  bindFeedback(el, count);
  $('#fb-ver', el).onclick = () => showTelemetry();
  $('#fb-borrar', el).onclick = () => {
    clearTelemetry();
    count();
    $<HTMLButtonElement>('#fb-send', el).disabled = true;
    $('#fb-estado', el).textContent = L('ui.fb.borrado');
    $('.fb', el).dataset.hecho = 'borrado';
    $('#fb-issue', el)?.remove();
    $<HTMLButtonElement>('#fb-ver', el).focus();
  };
  $('#set-export', el).onclick = () => toast(L('ui.set.exportado', { archivo: exportProgress() }));
  $('#set-community', el).onclick = () => platform.openExternal(COMMUNITY_URL);
  const file = $<HTMLInputElement>('#set-file', el);
  $('#set-import', el).onclick = () => file.click();
  file.onchange = async () => {
    const picked = file.files?.[0];
    file.value = '';
    if (!picked) return;
    const backup = readBackup(await picked.text());
    if (typeof backup === 'string') return toast(backup);
    const ask = modal(
      `<div class="modal-box confirm"><h2>${L('ui.set.importar.titulo')}</h2><p>${describeBackup(backup)}.</p><p>${L('ui.set.importar.texto')}</p>
       <div class="row"><button class="x">${L('ui.set.importar.no')}</button><button class="primary" id="yes">${L('ui.set.importar.si')}</button></div></div>`,
    );
    $('#yes', ask).onclick = () => {
      applyBackup(backup);
      location.reload();
    };
  };
  const server = $<HTMLInputElement>('#set-server', el);
  server.value = customServer();
  $('#set-server-ok', el).onclick = () => {
    setCustomServer(server.value);
    reconnect();
    sfx.stamp();
  };
}
