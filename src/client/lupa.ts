// Lupa: clic derecho, pulsación larga o la tecla L sobre cualquier carta, reliquia o monarca
// abre la pieza a tamaño de lámina, con su epígrafe, su texto de reglas, la cuenta exacta de
// lo que aporta ahora mismo y, si lo tiene, su sello de maestría.
import { BEATS, Card, MATERIAL, RANK_LABEL, SEAL, SUITS, SUIT_GLYPH, Suit, TOWER_FX, TREATMENT, TowerFx, cardLabel, cardValue, threatOf } from '../rules/engine';
import { keywordsIn } from '../rules/keywords';
import { BOSS, DECK, sellValue } from '../rules/run';
import { SPECIAL } from '../rules/specials';
import { ARCH, RARITY, TOOL, TOOL_SLOTS } from '../rules/tools';
import { sfx } from './audio';
import { backEl, cardEl, cardOf, portraitEl, suitSvg } from './card';
import { S, cap, hideTip, kw, num } from './core';
import { masteryBadge } from './engraving';
import { bossFlavor, cardFlavor, toolFlavor } from './flavor';
import { meta } from './guild';
import { KIND_NAME, toolTile } from './widgets';

const INSPECTABLE = '.card, .belt-slot.tool, [data-lupa]';
const POWER: Record<Suit, string> = {
  S: 'Perfora: lo que sobra al abatir a un guardia pasa al siguiente.',
  D: 'Salpica: los demás tronos reciben una parte de su valor.',
  H: 'Cura: recuperas Vida, una parte de su valor.',
  C: 'Escudo: ganas Escudo, una parte de su valor.',
};
const WEAK_TO = Object.fromEntries(SUITS.map((s) => [BEATS[s], s])) as Record<Suit, Suit>;

interface Sheet {
  art: HTMLElement;
  kicker: string;
  name: string;
  epi: string;
  rules: string;
  rows: [string, string][];
  badge?: string;
}

const row = (k: string, v: string): [string, string] => [k, v];
const glyph = (s: Suit) => `${suitSvg(s)} ${cap(MATERIAL[s])}`;

function cardSheet(c: Card, host: HTMLElement): Sheet {
  const v = S.shown;
  const rows: [string, string][] = [];
  const art = cardEl({ ...c, id: `lupa-${c.id}` });
  if (c.sp) {
    const sp = SPECIAL[c.sp];
    rows.push(row('Cómo se juega', 'Sola, o acompañando a un Golpe (hasta dos especiales por Golpe). No tiene palo ni número.'));
    if (sp.locked) rows.push(row('Legendaria', 'Solo aparece si has derrotado a su monarca.'));
    return { art, kicker: sp.locked ? 'Carta especial · legendaria' : 'Carta especial', name: sp.name, epi: cardFlavor(c), rules: sp.desc, rows };
  }
  if (c.suit === 'X') {
    rows.push(row('Daño', '0: no golpea.'));
    return { art, kicker: 'Comodín', name: 'Motín', epi: cardFlavor(c), rules: 'Juégala sola contra un trono: su guardia queda Desarmado hasta que caiga, y este turno no hay Contraataque.', rows };
  }
  const s = c.suit;
  const val = cardValue(c);
  const own = v?.config.ownMult ?? 0;
  const adv = v?.config.advMult ?? 2;
  const tower = host.closest<HTMLElement>('.tower');
  if (tower && v) {
    // un piso de torre: lo que aguanta y lo que amenaza
    const t = v.towers[s];
    const hp = v.config.floorHp[c.rank] ?? 0;
    rows.push(row('Vida', `<b>${Math.max(0, hp - t.damage)}</b> de ${hp}`));
    rows.push(row('Ataque', t.disarmed ? '⚔ 0 (Desarmado)' : `<b>⚔ ${threatOf(v, t)}</b> a tu Vida cada vez que el Contraataque saque ${SUIT_GLYPH[s]}${v.fatigue ? ` (incluye +${v.fatigue} del Asedio final)` : ''}`));
    rows.push(row('Inmune', own === 0 ? `${glyph(s)}: sus cartas no suman Daño aquí (×0)` : `Anulada: ${glyph(s)} pega ×${own}`));
    rows.push(row('Débil', `${glyph(WEAK_TO[s])}: sus cartas suman ×${adv}`));
    const fx = (Object.keys(TOWER_FX) as (keyof TowerFx)[]).filter((k) => t.fx?.[k]);
    if (fx.length) rows.push(row('Estado', fx.map((k) => `${TOWER_FX[k].name}: ${TOWER_FX[k].desc}`).join(' ')));
    if (t.floors.length > 1) rows.push(row('Detrás', t.floors.slice(1).map((r) => `${RANK_LABEL[r]} (${v.config.floorHp[r]})`).join(' · ')));
    return { art, kicker: `Guardia · Casa de ${cap(MATERIAL[s])}`, name: cardLabel(c), epi: cardFlavor(c), rules: 'Abátelo dejando su Vida en 0. Con el Golpe justo es un Golpe exacto.', rows };
  }
  rows.push(row('Valor', `<b>${val}</b>${c.rank === 1 ? ' (el as vale 11)' : ''}`));
  const standing = v ? SUITS.filter((x) => v.towers[x].floors.length) : SUITS;
  rows.push(
    row(
      'Daño que suma',
      standing
        .map((x) => {
          const m = x === s ? own : BEATS[s] === x ? adv : 1;
          return `<span class="vs-t ${m === 0 ? 'zero' : m > 1 ? 'adv' : ''}">${suitSvg(x)} <b>${val * m}</b><small>×${m}</small></span>`;
        })
        .join(''),
    ),
  );
  rows.push(row(`Poder de ${SUIT_GLYPH[s]}`, POWER[s] + (v ? ` Ahora: ${s === 'S' ? 'siempre que el Golpe lleve alguna ♠' : s === 'D' ? `1/${v.config.shardDiv}` : s === 'H' ? (v.config.repairDiv > 99 ? 'anulado por el monarca' : `1/${v.config.repairDiv}`) : `1/${v.config.wallDiv}`}.` : '')));
  if (c.rank === 1) rows.push(row('As cómplice', 'Con cualquier otra carta forma jugada (Multi ×1,1) y aporta el poder de su palo.'));
  if (c.tr) rows.push(row(TREATMENT[c.tr].name, TREATMENT[c.tr].desc));
  if (c.seal) rows.push(row(SEAL[c.seal].name, SEAL[c.seal].desc));
  const kind = c.rank > 10 ? 'Figura' : c.rank === 1 ? 'As' : 'Carta de número';
  return { art, kicker: `${kind} · ${cap(MATERIAL[s])}`, name: cardLabel(c), epi: cardFlavor(c), rules: `Carta de ${MATERIAL[s].toLowerCase()}: gana a ${MATERIAL[BEATS[s]].toLowerCase()} y no sirve contra su propio trono.`, rows };
}

function toolSheet(id: string): Sheet | null {
  const def = TOOL[id];
  if (!def) return null;
  const run = S.campaign?.run;
  const tools = S.shown?.tools ?? run?.tools ?? [];
  const slot = tools.findIndex((t) => t.id === id);
  const rows: [string, string][] = [row('Qué hace', KIND_NAME[def.kind]), row('Rareza', `${RARITY[def.rarity].name} · ${ARCH[def.arch]}`)];
  if (slot >= 0) {
    rows.push(row('En tus Reliquias', `Hueco ${slot + 1} de ${TOOL_SLOTS}: se activa ${slot === 0 ? 'la primera' : `después de ${slot}`}.`));
    const count = def.count?.(tools[slot]);
    if (count !== undefined && count !== '') rows.push(row('Acumulado', `<b>${count}</b>`));
  }
  if (run?.stats.toolUse[id]) rows.push(row('En esta campaña', `Activada <b>${run.stats.toolUse[id]}</b> veces`));
  rows.push(row('Venta', `${sellValue(id)} de oro`));
  const level = meta.mastery.tools[id] ?? 0;
  rows.push(row('Maestría', level ? `Campaña ganada en el Reinado ${level} con ella puesta.` : 'Gana una campaña con ella puesta para estamparle el sello.'));
  return { art: toolTile(id), kicker: `Reliquia · ${RARITY[def.rarity].name}`, name: def.name, epi: toolFlavor(id), rules: def.desc, rows, badge: masteryBadge(level) };
}

function bossSheet(id: string): Sheet | null {
  if (id === 'ferretero') return { art: portraitEl('ferretero', 'El Tratante'), kicker: 'Personaje', name: 'El Tratante', epi: bossFlavor('ferretero'), rules: 'Tras cada asalto abre el Mercado clandestino: reliquias, sobres, lacre y pergaminos. No fía.', rows: [] };
  const b = BOSS[id];
  if (!b) return null;
  const beaten = meta.seen.bosses.includes(id);
  const rows: [string, string][] = [row('Su regla', b.name), row('En tu Orden', beaten ? 'Ya lo has derrotado: su carta legendaria puede salir en tus campañas.' : 'Aún no lo has derrotado.')];
  return { art: portraitEl(`j-${id}`, b.who), kicker: 'Monarca', name: b.who, epi: bossFlavor(id), rules: b.desc, rows };
}

function deckSheet(id: string): Sheet | null {
  const d = DECK[id];
  if (!d) return null;
  const level = meta.mastery.decks[id] ?? 0;
  const rows: [string, string][] = [row('Maestría', level ? `Campaña ganada en el Reinado ${level} con esta baraja.` : 'Gana una campaña con esta baraja para estamparle el sello.')];
  return { art: backEl(id), kicker: 'Baraja inicial', name: d.name, epi: '', rules: d.desc, rows, badge: masteryBadge(level) };
}

function sheetFor(el: HTMLElement): Sheet | null {
  const ref = el.dataset.lupa ?? (el.classList.contains('belt-slot') ? `tool:${el.dataset.id}` : '');
  if (ref) {
    const [kind, id] = ref.split(':');
    if (kind === 'tool') return toolSheet(id);
    if (kind === 'boss' || kind === 'npc') return bossSheet(id);
    if (kind === 'deck') return deckSheet(id);
  }
  const card = cardOf.get(el);
  return card && !el.classList.contains('flipped') ? cardSheet(card, el) : null;
}

export const lupaOpen = () => !!document.querySelector('.lupa');
export function closeLupa(): void {
  document.querySelectorAll('.lupa').forEach((n) => n.remove());
}

/** Abre la lupa sobre el elemento (o su antepasado inspeccionable). Devuelve false si no hay nada que mirar. */
export function openLupa(target: Element | null): boolean {
  const el = target?.closest?.<HTMLElement>(INSPECTABLE);
  if (!el || el.closest('.lupa')) return false;
  const sheet = sheetFor(el);
  if (!sheet) return false;
  closeLupa();
  hideTip();
  const chain = keywordsIn(`${sheet.rules} ${sheet.rows.map((r) => r[1]).join(' ')}`)
    .map((k) => `<div class="kwdef"><b>${k.name}</b>${k.desc}</div>`)
    .join('');
  const box = document.createElement('div');
  box.className = 'lupa';
  box.innerHTML = `
    <div class="lupa-box" role="dialog" aria-label="${sheet.name}">
      <div class="lupa-art"></div>
      <div class="lupa-sheet">
        <small class="lupa-kicker">${sheet.kicker}</small>
        <h2>${sheet.name}${sheet.badge ?? ''}</h2>
        ${sheet.epi ? `<p class="lupa-epi">«${sheet.epi}»</p>` : ''}
        <p class="lupa-rules">${kw(sheet.rules)}</p>
        ${sheet.rows.length ? `<dl class="lupa-math">${sheet.rows.map(([k, v]) => `<dt>${k}</dt><dd>${kw(v)}</dd>`).join('')}</dl>` : ''}
        ${chain ? `<div class="lupa-chain">${chain}</div>` : ''}
        <button class="x lupa-close">Cerrar</button>
      </div>
    </div>`;
  sheet.art.removeAttribute('data-tip');
  sheet.art.removeAttribute('data-lupa');
  box.querySelector('.lupa-art')!.appendChild(sheet.art);
  box.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.lupa-art .card')) closeLupa();
  });
  document.body.appendChild(box);
  box.querySelector<HTMLButtonElement>('.lupa-close')?.focus({ preventScroll: true });
  sfx.flick();
  return true;
}

/** Clic derecho y pulsación larga abren la lupa en cualquier pantalla. */
export function bindLupa(): void {
  document.addEventListener('contextmenu', (e) => {
    if (lupaOpen()) {
      e.preventDefault();
      return closeLupa();
    }
    if (openLupa(e.target as Element)) e.preventDefault();
  });
  let timer = 0;
  let swallow = false;
  let sx = 0;
  let sy = 0;
  const cancel = () => clearTimeout(timer);
  document.addEventListener('pointerdown', (e) => {
    cancel();
    if (e.pointerType !== 'touch') return;
    const target = e.target as Element;
    sx = e.clientX;
    sy = e.clientY;
    timer = window.setTimeout(() => {
      if (openLupa(target)) {
        swallow = true;
        setTimeout(() => (swallow = false), 700);
      }
    }, 560);
  });
  document.addEventListener('pointermove', (e) => {
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 12) cancel();
  });
  document.addEventListener('pointerup', cancel);
  document.addEventListener('pointercancel', cancel);
  // el clic que suelta la pulsación larga no debe elegir la carta ni cerrar la lupa
  document.addEventListener(
    'click',
    (e) => {
      if (!swallow) return;
      swallow = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );
}
