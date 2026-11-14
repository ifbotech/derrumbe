// Piezas de interfaz que se repiten en varias pantallas: la opción-carta, las Reliquias, el visor
// de mazos, las reglas y los ajustes.
import { Card, SUITS, SUIT_GLYPH, MATERIAL, sortCards } from '../rules/engine';
import { SPECIAL } from '../rules/specials';
import { ARCH, RARITY, TOOL, TOOL_SLOTS, ToolInst } from '../rules/tools';
import { Volume, getVolume, setVolume, sfx } from './audio';
import { cardEl, suitSvg, tileEl } from './card';
import { $, $$, S, applySettings, closeModal, cycleSpeed, kw, modal, settings, speedLabel, toast } from './core';
import { glyphSvg } from './glyphs';
import { reconnect } from './net';
import { applyBackup, describeBackup, exportProgress, readBackup } from './backup';
import { COMMUNITY_URL, customServer, platform, setCustomServer } from './platform';
import { rulesHtml } from './rules-text';
import { CONTROL_ROWS } from './prompts';
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
export const KIND_NAME = { f: 'Suma Daño', r: 'Suma Multi', x: 'Multiplica el Multi', copy: 'Copia a su derecha', p: 'Pasiva' } as const;

/** Globo de ayuda de una reliquia. */
export function toolTip(id: string, extra = ''): string {
  const t = TOOL[id];
  if (!t) return '';
  return `<b>${t.name}</b>${t.desc}<small>${RARITY[t.rarity].name} · ${ARCH[t.arch]} · ${KIND_NAME[t.kind]}</small>${extra}`;
}

/** Ficha de reliquia con el color de su rareza. */
export function toolTile(id: string): HTMLDivElement {
  const el = tileEl(id, TOOL[id]?.name ?? id, 'relic', TOOL[id]?.rarity);
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
    const count = def.count?.(t) ?? '';
    slot.className = `belt-slot tool r-${def.rarity} k-${def.kind}`;
    slot.dataset.slot = String(i);
    slot.dataset.id = t.id;
    slot.dataset.lupa = `tool:${t.id}`;
    slot.tabIndex = 0;
    const sell = opts.onSell ? `<hr>Pulsa dos veces para venderla por ${opts.sellValue?.(t.id) ?? 0} de oro.` : '';
    const order = opts.onReorder ? '<hr>Arrástrala, o púlsala y luego pulsa otro hueco, para cambiar el orden (con teclado: Mayús + flechas; con mando: LB / RB).' : '';
    slot.dataset.tip = toolTip(t.id, `<small>Hueco ${i + 1} de ${TOOL_SLOTS}: se activa ${i === 0 ? 'la primera' : `después de ${i}`}.</small>${order}${sell}`);
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
    `<div class="modal-box deck-box"><h2>${title} ${opts.sticky ? (opts.onCancel ? '<button class="cancel">CANCELAR</button>' : '') : '<button class="x">CERRAR</button>'}</h2>
     <div class="row tabs deck-tabs"></div><p class="col-note deck-note"></p><div class="deck-rows"></div>
     ${opts.pick && opts.pick > 1 ? `<div class="row end-row"><button class="primary" id="deck-ok" disabled>${opts.confirm ?? 'Confirmar'}</button></div>` : ''}</div>`,
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
    const groups: [string, Card[]][] = [...SUITS.map((s): [string, Card[]] => [`${suitSvg(s)} ${MATERIAL[s]}`, sorted.filter((c) => !c.sp && c.suit === s)]), [`${SUIT_GLYPH.X} Comodines y especiales`, sorted.filter((c) => c.sp || c.suit === 'X')]];
    for (const [label, cards] of groups) {
      if (!cards.length) continue;
      const row = document.createElement('div');
      row.className = 'deck-row';
      row.innerHTML = `<h4>${label} <span>${cards.length}</span></h4><div class="deck-mini"></div>`;
      for (const c of cards) {
        const ce = cardEl(c);
        if (c.sp && !ce.dataset.tip) ce.dataset.tip = `<b>${SPECIAL[c.sp].name}</b>${SPECIAL[c.sp].desc}`;
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
    if (!rows.children.length) rows.innerHTML = '<p class="col-note">Vacío.</p>';
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
  modal(`<div class="modal-box"><h2>Reglas <button class="x">CERRAR</button></h2>${rulesHtml(S.shown?.config)}</div>`);
}

// la tabla de controles sale de prompts.ts (CONTROL_ROWS): la misma que el README y la prueba de humo

/** Ajustes: mezcla de sonido, ritmo de la mesa, tintas, pantalla y controles. */
// ───────────── V9 · Feedback de prueba ─────────────
// Un botón de un toque que dice la verdad: con VITE_TELEMETRY_URL manda la última campaña (y nada más) al
// pulsar; sin ella, comparte, copia o descarga. Nada se envía al abrir una pantalla.

/** Lo que va a pasar al pulsar, según cómo se construyó esta versión. */
export const feedbackPromise = (): string =>
  telemetryRemote() ? 'Al pulsar se manda tu última campaña (solo cifras de la partida) y nada más.' : 'Copia un resumen y descarga un archivo .json con tu última campaña. Nada sale de este equipo.';

/** La línea llana de Ajustes (fila «Datos de prueba»). */
const feedbackPlain = (): string => (telemetryRemote() ? 'Al pulsar Enviar se manda tu última campaña, y nada más.' : 'Nada sale de este equipo: el botón copia o descarga.');

/** Lo que pasó al pulsar, en palabras del jugador. */
export function feedbackDone(r: ShareResult): string {
  const miss = telemetryRemote() && r !== 'enviado' ? 'No se pudo enviar. ' : '';
  const text: Record<ShareResult, string> = {
    enviado: 'Enviado: tu última campaña ha salido, y nada más. ¡Gracias!',
    compartido: 'Compartido: tu última campaña va donde la hayas mandado.',
    copiado: 'Copiado: pega el resumen donde quieras. El archivo .json también se ha descargado.',
    descargado: 'Descargado: el archivo .json está en tus descargas.',
  };
  return miss + text[r];
}

/** El bloque del botón (Crónica y Ajustes). `where` solo cambia la clase, para la maqueta de cada pantalla. */
export function feedbackHtml(where: 'acta' | 'ajustes'): string {
  const issue = feedbackIssueUrl();
  const empty = !telemetryLog().length;
  return `<div class="fb fb-${where}" id="fb-${where}">
    <button class="fb-send" id="fb-send" ${empty ? 'disabled' : ''}>Enviar Crónica / Feedback de Prueba</button>
    ${issue ? '<button class="fb-issue" id="fb-issue" data-tip="<b>Abrir aviso</b>Abre la página de comentarios con el resumen ya escrito: lo lees y decides si lo publicas.">Abrir aviso</button>' : ''}
    <p class="fb-estado" id="fb-estado" role="status" aria-live="polite">${empty ? 'Aún no hay ninguna campaña guardada: juega una y vuelve.' : feedbackPromise()}</p>
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
      out.textContent = telemetryRemote() ? 'Enviando…' : 'Un momento…';
      try {
        const r = await shareFeedback();
        feedbackShow(root, r);
        sfx.stamp();
      } catch {
        out.textContent = 'No se pudo: prueba otra vez.';
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
  const kb = (telemetryBytes() / 1024).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${runs} ${runs === 1 ? 'campaña' : 'campañas'}${guides ? ` y ${guides} ${guides === 1 ? 'partida guiada' : 'partidas guiadas'}` : ''} · ${kb} kB, guardadas en este equipo`;
}

/** «Ver»: lo guardado, tal cual, en un cuadro de solo lectura. */
function showTelemetry(): void {
  const json = JSON.stringify(telemetryLog(), null, 2);
  const el = modal(
    `<div class="modal-box fb-ver"><h2>Datos de prueba <button class="x">CERRAR</button></h2>
      <p>Esto es todo lo guardado en este equipo (${telemetryBytes().toLocaleString('es-ES')} bytes): cifras de partida, sin nombres ni salas.</p>
      <textarea readonly spellcheck="false" aria-label="Datos de prueba guardados"></textarea></div>`,
    { cls: 'fb-ver-modal' },
  );
  $<HTMLTextAreaElement>('textarea', el).value = json;
}

export function showSettings(onChange?: () => void): void {
  if (document.querySelector('.settings-modal')) return;
  const el = modal(
    `<div class="modal-box settings"><h2>Ajustes <button class="x">CERRAR</button></h2>
      ${feedbackHtml('ajustes')}
      <div class="set fb-datos"><div><b>Datos de prueba</b><span id="fb-cuenta"></span><span class="fb-llana">${feedbackPlain()}</span></div>
        <span class="server-edit"><button id="fb-ver">Ver</button><button id="fb-borrar">Borrar</button></span></div>
      <div class="set-list" id="set-vol"></div><div class="set-list" id="set-toggles"></div>
      <div class="set server-row"><div><b>Servidor de salas</b><span>Solo para el cooperativo en línea. Vacío: el de esta misma página, si lo hay.</span></div>
        <span class="server-edit"><input id="set-server" autocomplete="off" spellcheck="false" placeholder="wss://mi-servidor/ws" /><button id="set-server-ok">Usar</button></span></div>
      <div class="set"><div><b>Progreso</b><span>La Orden, colección, crónicas y ajustes en un archivo .json: para no perderlos y para llevarlos a otro equipo o a la versión de escritorio.</span></div>
        <span class="server-edit"><button id="set-export">Exportar progreso</button><button id="set-import">Importar progreso</button><input type="file" id="set-file" accept="application/json,.json" hidden /></span></div>
      <div class="set"><div><b>Comunidad y comentarios</b><span>Errores, ideas y partidas memorables: aquí se leen.</span></div><button id="set-community">Abrir</button></div>
      <h3 class="sec">Controles</h3>
      <table class="keys"><tr><th></th><th>Teclado y ratón</th><th>Mando</th></tr>${CONTROL_ROWS.map(([what, key, pad]) => `<tr><td>${what}</td><td>${key}</td><td>${pad}</td></tr>`).join('')}</table>
    </div>`,
    { cls: 'settings-modal' },
  );
  // la mezcla: tres deslizadores independientes
  const vol = getVolume();
  const sliders: [keyof Volume, string, string][] = [
    ['master', 'Volumen maestro', 'Todo lo que suena.'],
    ['music', 'Música', 'Medieval, oscura y hecha al vuelo: cambia con cada asalto y con lo que te quede de Vida.'],
    ['sfx', 'Efectos', 'Golpes, Contraataques, sellos y monedas.'],
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
  const draw = () => {
    const rows: [string, string, string, () => void][] = [
      ['Velocidad', 'Lo rápido que se resuelven los Golpes en la mesa.', speedLabel(), () => void cycleSpeed()],
      ['Reducir movimiento', 'Sin temblores, destellos ni partículas.', settings.calm ? 'Sí' : 'No', () => ((settings.calm = !settings.calm), applySettings())],
      ['Tintas de la baraja', 'Cuatro tintas reales (una por palo) o las dos clásicas, rojo y negro.', settings.inks === 4 ? '4 tintas' : '2 clásicas', () => ((settings.inks = settings.inks === 4 ? 2 : 4), applySettings())],
      ['Pantalla completa', 'También con la tecla F (o R3 en el mando).', platform.isFullscreen() ? 'Sí' : 'No', () => void platform.toggleFullscreen().then(draw)],
      whisperSetting(),
    ];
    const list = $('#set-toggles', el);
    list.innerHTML = rows.map(([name, desc, value], i) => `<div class="set"><div><b>${name}</b><span>${desc}</span></div><button data-set="${i}" class="${value === 'No' ? '' : 'on'}">${value}</button></div>`).join('');
    $$('[data-set]', list).forEach(
      (b) =>
        (b.onclick = () => {
          rows[Number(b.dataset.set)][3]();
          draw();
          onChange?.();
        }),
    );
  };
  draw();
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
    $('#fb-estado', el).textContent = 'Borrado: ya no queda nada guardado.';
    $('.fb', el).dataset.hecho = 'borrado';
    $('#fb-issue', el)?.remove();
    $<HTMLButtonElement>('#fb-ver', el).focus();
  };
  $('#set-export', el).onclick = () => toast(`Progreso guardado en ${exportProgress()}`);
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
      `<div class="modal-box confirm"><h2>¿Importar este progreso?</h2><p>${describeBackup(backup)}.</p><p>Sustituye todo lo que hay guardado en este equipo (la Orden, colección, crónicas, campaña en curso y ajustes). No se puede deshacer: si dudas, exporta antes lo que tienes.</p>
       <div class="row"><button class="x">Cancelar</button><button class="primary" id="yes">Importar y recargar</button></div></div>`,
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
