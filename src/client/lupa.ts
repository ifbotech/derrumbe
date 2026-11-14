// Lupa: clic derecho, pulsación larga o la tecla L sobre cualquier carta, reliquia o monarca
// abre la pieza a tamaño de lámina, con su epígrafe, su texto de reglas, la cuenta exacta de
// lo que aporta ahora mismo y, si lo tiene, su sello de maestría.
import { BEATS, Card, RANK_LABEL, SUITS, SUIT_GLYPH, Suit, TOWER_FX, TowerFx, cardLabel, cardValue, threatOf } from '../rules/engine';
import { keywordsInFor } from '../rules/keywords';
import { BOSS, DECK, sellValue } from '../rules/run';
import { SPECIAL } from '../rules/specials';
import { TOOL, TOOL_SLOTS } from '../rules/tools';
import { L, acabD, acabN, archN, barD, barN, espD, espN, fxD, fxN, getLang, monDec, monD, monN, palabraD, palabraN, paloN, rarN, relD, relN, selloD, selloN } from './lengua';
import { sfx } from './audio';
import { backEl, cardEl, cardOf, portraitEl, suitSvg } from './card';
import { S, cap, hideTip, kw, num } from './core';
import { masteryBadge } from './engraving';
import { bossFlavor, cardFlavor, toolFlavor } from './flavor';
import { meta } from './guild';
import { kindName, toolTile } from './widgets';

const INSPECTABLE = '.card, .belt-slot.tool, [data-lupa]';
const POWER = { S: 'ui.poder.S', D: 'ui.poder.D', H: 'ui.poder.H', C: 'ui.poder.C' } as const;
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
const glyph = (s: Suit) => `${suitSvg(s)} ${paloN(s)}`;

function cardSheet(c: Card, host: HTMLElement): Sheet {
  const v = S.shown;
  const rows: [string, string][] = [];
  const art = cardEl({ ...c, id: `lupa-${c.id}` });
  if (c.sp) {
    const sp = SPECIAL[c.sp];
    rows.push(row(L('ui.lupa.como'), L('ui.lupa.como.texto')));
    if (sp.locked) rows.push(row(L('ui.lupa.legendaria'), L('ui.lupa.legendaria.texto')));
    return { art, kicker: sp.locked ? L('ui.lupa.especial.leg') : L('ui.lupa.especial'), name: espN(c.sp), epi: cardFlavor(c), rules: espD(c.sp), rows };
  }
  if (c.suit === 'X') {
    rows.push(row(L('ui.lupa.dano'), L('ui.lupa.dano.0')));
    return { art, kicker: L('ui.lupa.comodin'), name: L('ui.lupa.motin'), epi: cardFlavor(c), rules: L('ui.lupa.motin.texto'), rows };
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
    rows.push(row(L('ui.lupa.vida'), L('ui.lupa.vida.de', { n: Math.max(0, hp - t.damage), total: hp })));
    rows.push(row(L('ui.lupa.ataque'), t.disarmed ? L('ui.lupa.ataque.0') : `${L('ui.lupa.ataque.texto', { n: threatOf(v, t), palo: SUIT_GLYPH[s] })}${v.fatigue ? L('ui.lupa.ataque.asedio', { n: v.fatigue }) : ''}`));
    rows.push(row(L('ui.lupa.inmune'), own === 0 ? L('ui.lupa.inmune.texto', { palo: glyph(s) }) : L('ui.lupa.inmune.anulada', { palo: glyph(s), n: own })));
    rows.push(row(L('ui.lupa.debil'), L('ui.lupa.debil.texto', { palo: glyph(WEAK_TO[s]), n: adv })));
    const fx = (Object.keys(TOWER_FX) as (keyof TowerFx)[]).filter((k) => t.fx?.[k]);
    if (fx.length) rows.push(row(L('ui.lupa.estado'), fx.map((k) => `${fxN(k)}: ${fxD(k)}`).join(' ')));
    if (t.floors.length > 1) rows.push(row(L('ui.lupa.detras'), t.floors.slice(1).map((r) => `${RANK_LABEL[r]} (${v.config.floorHp[r]})`).join(' · ')));
    return { art, kicker: L('ui.lupa.guardia', { palo: paloN(s) }), name: cardLabel(c), epi: cardFlavor(c), rules: L('ui.lupa.guardia.texto'), rows };
  }
  rows.push(row(L('ui.lupa.valor'), `<b>${val}</b>${c.rank === 1 ? L('ui.lupa.valor.as') : ''}`));
  const standing = v ? SUITS.filter((x) => v.towers[x].floors.length) : SUITS;
  rows.push(
    row(
      L('ui.lupa.suma'),
      standing
        .map((x) => {
          const m = x === s ? own : BEATS[s] === x ? adv : 1;
          return `<span class="vs-t ${m === 0 ? 'zero' : m > 1 ? 'adv' : ''}">${suitSvg(x)} <b>${val * m}</b><small>×${m}</small></span>`;
        })
        .join(''),
    ),
  );
  rows.push(row(L('ui.lupa.poder', { palo: SUIT_GLYPH[s] }), L(POWER[s]) + (v ? L('ui.lupa.ahora', { x: s === 'S' ? L('ui.lupa.ahora.S') : s === 'D' ? `1/${v.config.shardDiv}` : s === 'H' ? (v.config.repairDiv > 99 ? L('ui.lupa.ahora.anulado') : `1/${v.config.repairDiv}`) : `1/${v.config.wallDiv}` }) : '')));
  if (c.rank === 1) rows.push(row(L('ui.lupa.as'), L('ui.lupa.as.texto')));
  if (c.tr) rows.push(row(acabN(c.tr), acabD(c.tr)));
  if (c.seal) rows.push(row(selloN(c.seal), selloD(c.seal)));
  const kind = c.rank > 10 ? L('ui.lupa.figura') : c.rank === 1 ? L('ui.lupa.asn') : L('ui.lupa.numero');
  return { art, kicker: `${kind} · ${paloN(s)}`, name: cardLabel(c), epi: cardFlavor(c), rules: L('ui.lupa.carta.texto', { palo: paloN(s).toLowerCase(), gana: paloN(BEATS[s]).toLowerCase() }), rows };
}

function toolSheet(id: string): Sheet | null {
  const def = TOOL[id];
  if (!def) return null;
  const run = S.campaign?.run;
  const tools = S.shown?.tools ?? run?.tools ?? [];
  const slot = tools.findIndex((t) => t.id === id);
  const rows: [string, string][] = [row(L('ui.lupa.que'), kindName(def.kind)), row(L('ui.lupa.rareza'), `${rarN(def.rarity)} · ${archN(def.arch)}`)];
  if (slot >= 0) {
    rows.push(row(L('ui.lupa.en.reliquias'), slot === 0 ? L('ui.rel.hueco.1', { n: slot + 1, total: TOOL_SLOTS }) : L('ui.rel.hueco.n', { n: slot + 1, total: TOOL_SLOTS, antes: slot })));
    const count = def.count?.(tools[slot]);
    if (count !== undefined && count !== '') rows.push(row(L('ui.lupa.acumulado'), `<b>${count}</b>`));
  }
  if (run?.stats.toolUse[id]) rows.push(row(L('ui.lupa.campana'), L('ui.lupa.activada', { n: run.stats.toolUse[id] })));
  rows.push(row(L('ui.lupa.venta'), L('ui.oro.n', { n: sellValue(id) })));
  const level = meta.mastery.tools[id] ?? 0;
  rows.push(row(L('ui.lupa.maestria'), level ? L('ui.lupa.maestria.si', { n: level }) : L('ui.lupa.maestria.no')));
  return { art: toolTile(id), kicker: L('ui.lupa.reliquia', { rareza: rarN(def.rarity) }), name: relN(id), epi: toolFlavor(id), rules: relD(id), rows, badge: masteryBadge(level) };
}

function bossSheet(id: string): Sheet | null {
  if (id === 'ferretero') return { art: portraitEl('ferretero', L('ui.lupa.tratante')), kicker: L('ui.lupa.personaje'), name: L('ui.lupa.tratante'), epi: bossFlavor('ferretero'), rules: L('ui.lupa.tratante.texto'), rows: [] };
  const b = BOSS[id];
  if (!b) return null;
  const beaten = meta.seen.bosses.includes(id);
  const rows: [string, string][] = [row(L('ui.lupa.regla'), monDec(id)), row(L('ui.lupa.orden'), beaten ? L('ui.lupa.orden.si') : L('ui.lupa.orden.no'))];
  return { art: portraitEl(`j-${id}`, monN(id)), kicker: L('ui.lupa.monarca'), name: monN(id), epi: bossFlavor(id), rules: monD(id), rows };
}

function deckSheet(id: string): Sheet | null {
  const d = DECK[id];
  if (!d) return null;
  const level = meta.mastery.decks[id] ?? 0;
  const rows: [string, string][] = [row(L('ui.lupa.maestria'), level ? L('ui.lupa.baraja.si', { n: level }) : L('ui.lupa.baraja.no'))];
  return { art: backEl(id), kicker: L('ui.lupa.baraja'), name: barN(id), epi: '', rules: barD(id), rows, badge: masteryBadge(level) };
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
  const chain = keywordsInFor(getLang(), `${sheet.rules} ${sheet.rows.map((r) => r[1]).join(' ')}`)
    .map((k) => `<div class="kwdef"><b>${palabraN(k.id)}</b>${palabraD(k.id)}</div>`)
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
        <button class="x lupa-close">${L('ui.lupa.cerrar')}</button>
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
