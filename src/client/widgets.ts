// Piezas de interfaz que se repiten en varias pantallas: la opción-carta, el cinturón de
// herramientas, el visor de mazos, las reglas y los ajustes.
import { Card, SUITS, SUIT_GLYPH, MATERIAL, sortCards } from '../rules/engine';
import { SPECIAL } from '../rules/specials';
import { ARCH, RARITY, TOOL, TOOL_SLOTS, ToolInst } from '../rules/tools';
import { musicIsOn, sfx, soundOn, toggleMusic, toggleSound } from './audio';
import { cardEl, suitSvg, tileEl } from './card';
import { $, $$, S, applySettings, closeModal, cycleSpeed, modal, settings, speedLabel } from './core';
import { glyphSvg } from './glyphs';
import { rulesHtml } from './rules-text';

export const spCard = (id: string): Card => ({ id: `show-${id}`, suit: 'X', rank: 0, sp: id });

/** Una opción uniforme: carta o ficha arriba, nombre y texto debajo. Si se puede elegir, se pulsa la carta. */
export function choice(el: HTMLElement, title: string, desc: string, tag: string | null, onClick: (() => void) | null, cls = ''): HTMLElement {
  const box = document.createElement('div');
  box.className = `choice ${cls}`;
  box.appendChild(el);
  box.insertAdjacentHTML('beforeend', `<h4>${title}</h4><p>${desc}</p>${tag ? `<span class="tag-act">${tag}</span>` : ''}`);
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

// ───────────────────────── Herramientas ─────────────────────────

const KIND_LABEL = { f: '+F', r: '+R', x: '×R', copy: '⇉', p: '•' } as const;
const KIND_NAME = { f: 'Suma Fuerza', r: 'Suma Resonancia', x: 'Multiplica la Resonancia', copy: 'Copia a su derecha', p: 'Pasiva' } as const;

/** Globo de ayuda de una herramienta. */
export function toolTip(id: string, extra = ''): string {
  const t = TOOL[id];
  if (!t) return '';
  return `<b>${t.name}</b>${t.desc}<small>${RARITY[t.rarity].name} · ${ARCH[t.arch]} · ${KIND_NAME[t.kind]}</small>${extra}`;
}

/** Ficha de herramienta con el color de su rareza. */
export function toolTile(id: string): HTMLDivElement {
  const el = tileEl(id, TOOL[id]?.name ?? id, 'relic', TOOL[id]?.rarity);
  el.dataset.tip = toolTip(id);
  return el;
}

/** Permutación que mueve la herramienta `from` al hueco `to`. */
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
 * El cinturón: las herramientas de izquierda a derecha, que es el orden en que se activan.
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
    slot.tabIndex = 0;
    const sell = opts.onSell ? `<hr>Pulsa dos veces para venderla por ${opts.sellValue?.(t.id) ?? 0} de oro.` : '';
    const order = opts.onReorder ? '<hr>Arrástrala, o púlsala y luego pulsa otro hueco, para cambiar el orden.' : '';
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
      } else if (e.key === 'ArrowLeft' && i > 0) move(i, i - 1);
      else if (e.key === 'ArrowRight' && i < tools.length - 1) move(i, i + 1);
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

export function showSettings(onChange?: () => void): void {
  const el = modal(`<div class="modal-box settings"><h2>Ajustes <button class="x">CERRAR</button></h2><div class="set-list"></div></div>`);
  const draw = () => {
    const rows: [string, string, string, () => void][] = [
      ['Sonido', 'Golpes, sirenas, sellos y monedas.', soundOn() ? 'Sí' : 'No', () => void toggleSound()],
      ['Música', 'Medieval, oscura y hecha al vuelo: cambia con cada obra.', musicIsOn() ? 'Sí' : 'No', () => void toggleMusic()],
      ['Velocidad', 'Lo rápido que se resuelven los golpes en la mesa.', speedLabel(), () => void cycleSpeed()],
      ['Reducir movimiento', 'Sin temblores, destellos ni partículas.', settings.calm ? 'Sí' : 'No', () => ((settings.calm = !settings.calm), applySettings())],
    ];
    const list = $('.set-list', el);
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
}
