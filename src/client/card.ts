// Baraja DERRUMBE — ilustrada en SVG a mano, estilo linograbado: masas de tinta,
// líneas talladas en color papel, tintas planas por palo y textura de imprenta.
// Lienzo de cada carta: 250 × 350. Las figuras son de doble cabeza, unidas por una costura diagonal.
import { Card, CardSuit, MATERIAL, RANK_LABEL, SEAL, Seal, Suit, TREATMENT, Treatment } from '../rules/engine';
import { SPECIAL } from '../rules/specials';
import { engravingDefs, plateFrame, shade, suitWeaves } from './engraving';
import { GLYPH } from './glyphs';

// ───────────────────────── Palos ─────────────────────────

/** Pintas talladas, centradas en (0,0), ~21 unidades de alto. */
const PIP: Record<Suit, string> = {
  H: '<path d="M0,9.6 C-3,6 -10,1.6 -10,-4 C-10,-8 -7.2,-10 -4.6,-10 C-2.3,-10 -0.8,-8.7 0,-6.8 C0.8,-8.7 2.3,-10 4.6,-10 C7.2,-10 10,-8 10,-4 C10,1.6 3,6 0,9.6 Z"/><path class="pcut" d="M-7,-4.4 C-7,-6.6 -5.7,-7.9 -3.9,-7.9"/>',
  S: '<path d="M0,-10.2 C3,-6 10,-2 10,3.2 C10,6.6 7.4,8.4 5,8.4 C3.2,8.4 1.8,7.6 0.9,6.2 C1.2,8 2,9.3 3.7,10.2 L-3.7,10.2 C-2,9.3 -1.2,8 -0.9,6.2 C-1.8,7.6 -3.2,8.4 -5,8.4 C-7.4,8.4 -10,6.6 -10,3.2 C-10,-2 -3,-6 0,-10.2 Z"/><path class="pcut" d="M-6.9,3.6 C-6.7,0.9 -4.7,-1.4 -2.3,-3.6"/>',
  D: '<path d="M0,-10.6 C2,-6.5 5,-3 8.2,0 C5,3 2,6.5 0,10.6 C-2,6.5 -5,3 -8.2,0 C-5,-3 -2,-6.5 0,-10.6 Z"/><path class="pcut" d="M-4.9,-0.3 C-3.3,-2.2 -1.9,-4.1 -0.9,-6.2"/>',
  C: '<circle cx="0" cy="-5.3" r="4.8"/><circle cx="-5.5" cy="1.6" r="4.8"/><circle cx="5.5" cy="1.6" r="4.8"/><path d="M-2.2,-2 H2.2 V2.4 C1.3,6 2,8.9 3.7,10.2 H-3.7 C-2,8.9 -1.3,6 -2.2,2.4 Z"/><path class="pcut" d="M-2.9,-6.8 C-2.3,-8 -1.2,-8.7 0,-8.7"/><path class="pcut" d="M-8.5,0.5 C-8,-0.7 -7,-1.5 -5.8,-1.6"/><path class="pcut" d="M2.6,0.3 C3.1,-0.8 4.1,-1.5 5.3,-1.6"/>',
};

/** El trazo de una pinta, centrado en (0,0), para incrustarlo en otro dibujo. */
export const pipPath = (suit: Suit) => PIP[suit];

export function suitSvg(suit: Suit, cls = ''): string {
  return `<svg class="glyph s-${suit} ${cls}" viewBox="-11 -11.5 22 23" aria-hidden="true">${PIP[suit]}</svg>`;
}

const FILL: Record<Suit, string> = { S: 'kS', C: 'kC', H: 'kH', D: 'kD' };
/** La pinta tal como se estampa: las picas llevan además un contrarrayado, para distinguirlas sin depender del color. */
const SPADE_D = PIP.S.match(/d="([^"]+)"/)![1];
const pipInk = (suit: Suit) => PIP[suit] + (suit === 'S' ? `<path class="xh" d="${SPADE_D}" fill="url(#hatch-pip)"/>` : '');
const pipAt = (suit: Suit, x: number, y: number, scale: number, cls = FILL[suit], rot = 0) =>
  `<g transform="translate(${x} ${y})${rot ? ` rotate(${rot})` : ''} scale(${scale})" class="${cls}">${PIP[suit]}</g>`;

// ───────────────────────── Definiciones compartidas ─────────────────────────

const PAPER = '#eae0ce';
const INK = '#181614';
/** Qué carta representa cada elemento pintado (para la lupa de grabador). */
export const cardOf = new WeakMap<Element, Card>();
export function ensureDefs(): void {
  if (document.getElementById('deck-defs')) return;
  const holder = document.createElement('div');
  holder.innerHTML = `
  <svg id="deck-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <filter id="rough" x="-4%" y="-4%" width="108%" height="108%">
      <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <clipPath id="half"><path d="M0,0 H250 V152 L0,198 Z"/></clipPath>
    <clipPath id="inframe"><path d="M54,10 H240 V254 H196 V340 H10 V96 H54 Z"/></clipPath>
    <filter id="rough-ui" x="-20%" y="-30%" width="140%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    ${suitWeaves()}
    ${engravingDefs()}
    <pattern id="hatch-pip" width="2.4" height="2.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,1.2 H2.4 M1.2,0 V2.4" stroke="${PAPER}" stroke-width="0.3" opacity="0.55"/></pattern>
    <pattern id="pat-back" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0,20 L20,0 M0,0 L20,20" stroke="${PAPER}" stroke-width="1" opacity="0.5"/><rect x="8" y="8" width="4" height="4" fill="${PAPER}"/></pattern>
    <pattern id="pat-back-ink" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0,20 L20,0 M0,0 L20,20" stroke="${INK}" stroke-width="1" opacity="0.45"/><rect x="8" y="8" width="4" height="4" fill="${INK}"/></pattern>
    <pattern id="pat-haz" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="20" fill="#e0a43a"/><rect width="10" height="20" fill="${INK}"/></pattern>
  </defs></svg>`;
  document.body.appendChild(holder.firstElementChild!);
}

// ───────────────────────── Atributos (lo que empuña cada figura) ─────────────────────────

const FIST = '<rect class="fist" x="-14" y="-12" width="28" height="24" rx="6"/><path class="cut" d="M-7,-10 V-1 M0,-10 V-1 M7,-10 V-1 M-12,4 H3"/>';

/** Arma larga (rey y sota). Coordenadas locales: el puño está en (0,0). */
function longArm(suit: Suit): string {
  const staff = '<rect class="ink" x="-3" y="-70" width="6" height="100"/><rect class="gd ol" x="-8" y="-72" width="16" height="7"/>';
  switch (suit) {
    case 'S':
      return '<path class="pp ol" d="M0,-106 L8.5,-90 L7.5,-21 H-7.5 L-8.5,-90 Z"/><path class="thin" d="M0,-93 V-25"/><rect class="gd ol" x="-18" y="-23" width="36" height="8"/><rect class="ink" x="-4" y="-15" width="8" height="38"/><circle class="gd ol" cy="27" r="5.5"/>';
    case 'H':
      return `${staff}<g transform="translate(0 -91) scale(2.15)" class="rd pst">${PIP.H}</g>`;
    case 'D':
      return '<rect class="ink" x="-3" y="-40" width="6" height="70"/><path class="gl ol" d="M0,-110 L13.5,-73 L0,-34 L-13.5,-73 Z"/><path class="thin" d="M0,-108 V-36 M-12.5,-73 H12.5"/><rect class="gd ol" x="-7" y="-38" width="14" height="6"/>';
    case 'C':
      return `${staff}<g transform="translate(0 -92) scale(2.3)" class="ink pst">${PIP.C}</g>`;
  }
}

/** Atributo corto (reina): daga, rosa, espejo o brote. */
function shortArm(suit: Suit): string {
  const stem = '<rect class="ink" x="-2.5" y="-36" width="5" height="62"/>';
  switch (suit) {
    case 'S':
      return '<path class="pp ol" d="M0,-66 L7.5,-15 H-7.5 Z"/><path class="thin" d="M0,-56 V-18"/><rect class="gd ol" x="-13" y="-16" width="26" height="6"/><rect class="ink" x="-3.5" y="-10" width="7" height="32"/>';
    case 'H':
      return `${stem}<path class="ink" d="M0,-22 C-10,-28 -16,-22 -18,-14 C-10,-12 -4,-14 0,-22 Z M0,-28 C8,-36 16,-32 19,-24 C11,-20 4,-22 0,-28 Z"/><g transform="translate(0 -50) scale(1.75)" class="rd pst">${PIP.H}</g>`;
    case 'D':
      return `${stem}<path class="gl ol" d="M0,-74 L13,-50 L0,-26 L-13,-50 Z"/><path class="thin" d="M-5,-52 L3,-66"/><rect class="gd ol" x="-6" y="-28" width="12" height="5"/>`;
    case 'C':
      return `${stem}<path class="ink" d="M0,-20 C-9,-26 -15,-20 -17,-13 C-10,-11 -4,-13 0,-20 Z"/><g transform="translate(0 -50) scale(1.8)" class="ink pst">${PIP.C}</g>`;
  }
}

const eye = (x: number, y: number, rx = 10, ry = 7.5) =>
  `<g transform="translate(${x} ${y})"><g class="lid"><ellipse class="pp" rx="${rx}" ry="${ry}"/><g class="iris"><circle class="rd" r="4.9"/><circle class="ink" r="2.2"/><circle class="pp" cx="1.6" cy="-1.6" r="0.9"/></g></g></g>`;

const ROBE = 'M40,236 L60,146 C84,134 166,130 192,138 L214,236 Z';

// ───────────────────────── Bustos ─────────────────────────
// Cada busto devuelve [capa estática, capa viva]. La estática lleva el filtro de borde irregular;
// la viva (ojos, joyas, arma) se anima sin obligar a repintar el filtro.

function king(s: Suit): [string, string] {
  const still = `
    <path d="${ROBE}" fill="url(#pat-${s})" class="ol"/>
    <path class="ink" d="M60,146 C84,134 166,130 192,138 L197,157 C170,148 84,152 56,165 Z"/>
    <path class="dash" d="M59,155 C84,143 168,139 194,147"/>
    <path class="ink" d="M108,150 L144,146 L150,236 L104,236 Z"/>
    ${pipAt(s, 127, 214, 0.75, 'pp')}
    <path d="M172,156 L188,112 L224,118 L226,166 Z" fill="url(#pat-${s})" class="ol"/>
    <path class="ink" d="M187,113 L225,119 L225,133 L183,126 Z"/>
    <path class="ink" d="M94,70 L89,96 L77,113 L88,117 L86,125 L92,129 L82,136 C74,146 72,164 80,172 C80,184 88,192 98,190 C104,200 118,202 124,194 C134,198 146,190 146,180 C156,172 160,160 158,146 L162,104 L158,70 Z"/>
    <path class="pp" d="M88,123 C102,115 121,117 134,131 C119,124 104,126 92,132 Z"/>
    <path class="cut" d="M97,136 C90,150 90,166 96,182 M108,135 C102,152 104,172 112,190 M120,133 C116,152 122,174 130,188 M132,131 C132,146 138,164 146,174 M144,124 C147,136 151,148 155,154"/>
    <path class="cut" d="M116,104 C122,110 124,116 122,122 M148,96 c-7,-2 -10,8 -4,13 c3,2 6,0 5,-4 M152,76 L154,92 M84,113 l5,-1"/>
    <path class="cut heavy" d="M93,88 L120,82"/>
    <path class="gd ol" d="M88,72 L83,52 V38 H96 V50 H108 V33 H120 V50 H132 V33 H144 V50 H156 V38 H169 V52 L164,72 Z"/>
    <path class="thin" d="M85,60 H167"/>`;
  const live = `
    ${eye(106, 98)}
    <circle class="gem" style="--i:0" cx="100" cy="66" r="3.2"/><circle class="gem" style="--i:1" cx="126" cy="66" r="3.2"/><circle class="gem" style="--i:2" cx="152" cy="66" r="3.2"/>
    <g transform="translate(206 124)"><g class="weapon">${longArm(s)}${FIST}</g></g>`;
  return [still, live];
}

function queen(s: Suit): [string, string] {
  const still = `
    <path d="${ROBE}" fill="url(#pat-${s})" class="ol"/>
    <path class="ink" d="M150,60 C176,72 186,116 180,156 C178,176 184,194 192,206 L138,206 C150,182 150,150 146,120 Z"/>
    <path class="cut" d="M160,80 C174,106 174,140 168,170 C166,182 170,194 175,202 M152,88 C163,112 163,146 157,176 C155,186 157,196 161,203"/>
    <path class="ink" d="M60,146 C84,134 166,130 192,138 L197,157 C170,148 84,152 56,165 Z"/>
    <path class="pearl" d="M59,155 C84,143 168,139 194,147"/>
    <path d="M168,196 L190,152 L226,158 L226,210 Z" fill="url(#pat-${s})" class="ol"/>
    <path class="ink" d="M189,153 L226,159 L226,173 L184,165 Z"/>
    <path class="ink" d="M96,70 L91,96 L80,111 L90,116 L88,123 L93,127 L90,134 C92,142 100,148 112,150 L118,172 L150,172 L156,140 L160,100 L156,68 Z"/>
    <path class="rd" d="M86.5,121.5 L96,120 L93.5,127 L97,133 L89,135.5 L91.5,128 Z"/>
    <path class="cut" d="M112,116 C118,119 121,125 119,131"/>
    <path class="cut" d="M95,87 C104,80 115,80 123,85 M98,77 C118,66 144,70 157,94 M150,72 C158,86 160,102 158,120 M84,111 l5,-1 M100,90 l-3,-5 M107,88 l-1,-6 M114,89 l2,-5"/>
    <path class="pearl" d="M119,160 C128,166 142,166 151,158"/>
    <circle class="gd" cx="147" cy="120" r="6" stroke="#eae0ce" stroke-width="2"/>
    <path class="gd ol" d="M92,60 L101,34 L110,60 Z M114,60 L125,23 L136,60 Z M140,60 L149,34 L158,60 Z"/>
    <path class="gd ol" d="M90,73 L87,59 H163 L160,73 Z"/>`;
  const live = `
    ${eye(107, 99, 10, 7)}
    <circle class="gem" style="--i:0" cx="101" cy="32" r="4"/><circle class="gem" style="--i:1" cx="125" cy="21" r="4.4"/><circle class="gem" style="--i:2" cx="149" cy="32" r="4"/>
    <g transform="translate(207 168)"><g class="weapon">${shortArm(s)}${FIST}</g></g>`;
  return [still, live];
}

function jack(s: Suit): [string, string] {
  const still = `
    <path d="${ROBE}" fill="url(#pat-${s})" class="ol"/>
    <path class="pp ol" d="M60,146 L74,172 L90,143 L105,174 L121,140 L137,173 L153,139 L169,168 L185,139 L192,138 C166,130 84,134 60,146 Z"/>
    <path d="M172,156 L188,112 L224,118 L226,166 Z" fill="url(#pat-${s})" class="ol"/>
    <path class="ink" d="M187,113 L225,119 L225,133 L183,126 Z"/>
    <path class="ink" d="M138,66 L168,72 C177,96 179,120 173,140 C167,151 152,151 146,142 Z"/>
    <path class="ink" d="M96,74 L92,98 L82,111 L91,116 L89,123 L94,127 L92,135 C94,142 102,147 114,149 L120,168 L150,168 L152,74 Z"/>
    <path class="cut" d="M150,86 C160,102 164,120 160,138 M159,80 C168,98 172,118 168,136 M150,141 c4,6 12,6 16,0 M95,90 L119,88 M90,129 l10,1.5 M116,106 C121,111 122,117 120,122 M85,111 l5,-1"/>
    <path class="gd ol" d="M82,77 C79,52 112,39 146,43 C167,47 175,61 171,77 Z"/>
    <path class="ink" d="M79,72 H173 V81 H79 Z"/>
    <path class="thin" d="M98,54 C118,45 144,46 160,57"/>
    <path class="pp ol" d="M112,50 C106,27 86,15 62,19 C77,28 90,40 98,55 Z"/>
    <path class="thin" d="M68,21 C85,29 98,41 106,52 M80,24 l-2,7 M88,29 l-3,7 M96,36 l-4,6"/>`;
  const live = `
    ${eye(106, 100, 9.5, 7.5)}
    <circle class="gem" style="--i:0" cx="112" cy="52" r="4.4"/>
    <g transform="translate(206 126) rotate(7)"><g class="weapon">${longArm(s)}${FIST}</g></g>`;
  return [still, live];
}

const TITLE: Record<number, string> = { 11: 'SOTA', 12: 'REINA', 13: 'REY' };

function figure(suit: Suit, rank: number): string {
  const [still, live] = rank === 13 ? king(suit) : rank === 12 ? queen(suit) : jack(suit);
  const zoom = 'translate(125 40) scale(1.13) translate(-125 -40)';
  const mirror = rank === 12 ? ` transform="translate(250 0) scale(-1 1) ${zoom}"` : ` transform="${zoom}"`;
  const sx = rank === 12 ? -1 : 1;
  const cap = `<text class="cap" transform="translate(23 188) rotate(-90)">${TITLE[rank]} · ${MATERIAL[suit]}</text>`;
  // capas de estampación: el sangrado de la tinta detrás del busto y la sombra tallada sobre el ropaje
  const bleed = '<circle cx="128" cy="104" r="96" fill="url(#tone-ink)" opacity="0.32"/><path d="M10,10 H96 L10,118 Z" fill="url(#hatch-fine)" opacity="0.5"/>';
  const carve = shade('M150,146 C170,138 184,136 192,138 L214,236 H150 Z', 'hatch-paper', 0.55) + shade('M40,236 L48,200 H98 L96,236 Z', 'hatch-cross', 0.5);
  const halves = (body: string, extra = '') => `
    <g clip-path="url(#half)" data-sx="${sx}" data-sy="1"><g${mirror}${extra}>${body}</g></g>
    <g transform="rotate(180 125 175)"><g clip-path="url(#half)" data-sx="${-sx}" data-sy="-1"><g${mirror}${extra}>${body}</g></g></g>`;
  return `
    <svg class="ly art still" viewBox="0 0 250 350" aria-hidden="true">
      <g filter="url(#rough)">
        <g clip-path="url(#inframe)">${halves(bleed + still + carve)}</g>
        <path class="belt" d="M-6,199.1 L256,150.9"/><path class="stitch" d="M-6,199.1 L256,150.9"/>
      </g>
      ${cap}<g transform="rotate(180 125 175)">${cap}</g>
    </svg>
    <svg class="ly art live" viewBox="0 0 250 350" aria-hidden="true"><g clip-path="url(#inframe)">${halves(live)}</g></svg>`;
}

// ───────────────────────── Numerales, ases y comodín ─────────────────────────

const X = [78, 125, 172];
const LAYOUT: Record<number, [number, number][]> = {
  2: [[1, 64], [1, 286]],
  3: [[1, 64], [1, 175], [1, 286]],
  4: [[0, 64], [2, 64], [0, 286], [2, 286]],
  5: [[0, 64], [2, 64], [1, 175], [0, 286], [2, 286]],
  6: [[0, 64], [2, 64], [0, 175], [2, 175], [0, 286], [2, 286]],
  7: [[0, 64], [2, 64], [0, 175], [1, 175], [2, 175], [0, 286], [2, 286]],
  8: [[0, 64], [2, 64], [1, 119.5], [0, 175], [2, 175], [1, 230.5], [0, 286], [2, 286]],
  9: [[0, 64], [2, 64], [0, 138], [2, 138], [1, 175], [0, 212], [2, 212], [0, 286], [2, 286]],
  10: [[0, 64], [2, 64], [1, 101], [0, 138], [2, 138], [0, 212], [2, 212], [1, 249], [0, 286], [2, 286]],
};

function numberArt(suit: Suit, rank: number): string {
  const pips = LAYOUT[rank]
    .map(([c, y], i) => `<g transform="translate(${X[c]} ${y})${y > 176 ? ' rotate(180)' : ''}"><g class="stamp" style="--i:${i}"><g class="pip" style="--i:${i}"><g class="${FILL[suit]}" transform="scale(${rank >= 7 ? 1.95 : 2.3})">${pipInk(suit)}</g></g></g></g>`)
    .join('');
  const marks = '<path class="reg" d="M125,12 v9 M125,329 v9 M12,175 h9 M229,175 h9"/>';
  return `<svg class="ly art" viewBox="0 0 250 350" aria-hidden="true">${marks}${pips}</svg>`;
}

function aceArt(suit: Suit): string {
  const rays = Array.from({ length: 24 }, (_, i) => `<path d="M0,-58 L3.4,-98 L-3.4,-98 Z" transform="rotate(${i * 15})"/>`).join('');
  return `<svg class="ly art" viewBox="0 0 250 350" aria-hidden="true">
    <g filter="url(#rough)">
      <g transform="translate(125 168)"><g class="burst ink">${rays}</g><circle class="ring" r="56"/><circle class="ring thin2" r="104"/></g>
      <path class="ink" d="M60,291 L190,284 L187,311 L57,318 Z"/>
    </g>
    <text class="banner-txt" x="123" y="307" text-anchor="middle" transform="rotate(-3.1 123 301)"${MATERIAL[suit].length > 6 ? ' textLength="118" lengthAdjust="spacingAndGlyphs"' : ''}>${MATERIAL[suit]}</text>
    <g transform="translate(125 168)"><g class="stamp" style="--i:1"><g class="pip ace-pip" style="--i:0"><g class="${FILL[suit]}" transform="scale(4.6)">${pipInk(suit)}</g></g></g></g>
  </svg>`;
}

function jokerArt(): string {
  const body = `
    <path class="ink" d="M98,236 L104,128 L150,124 L158,236 Z"/>
    <path class="rd" d="M103,140 L151,136 L152,150 L102,154 Z"/>
    <path class="ink" d="M92,58 H156 a9,9 0 0 1 9,9 V112 a9,9 0 0 1 -9,9 H92 a9,9 0 0 1 -9,-9 V67 a9,9 0 0 1 9,-9 Z"/>
    <path class="cut" d="M104,60 V92 M124,60 V92 M144,60 V92 M84,96 H138 a9,9 0 0 1 0,18 H92"/>
    <path class="cut" d="M94,70 h4 M112,70 h4 M132,70 h4 M152,70 h4"/>`;
  const rays = Array.from({ length: 9 }, (_, i) => `<path d="M0,-74 L5,-112 L-5,-112 Z" transform="rotate(${-80 + i * 20})"/>`).join('');
  const half = `<g clip-path="url(#half)">${body}<g transform="translate(124 96)" class="ink">${rays}</g></g>`;
  return `
    <svg class="ly art still" viewBox="0 0 250 350" aria-hidden="true">
      <path class="haz" d="M54,10 H240 V254 H196 V340 H10 V96 H54 Z"/>
      <g filter="url(#rough)"><g clip-path="url(#inframe)">${half}<g transform="rotate(180 125 175)">${half}</g></g>
        <path class="belt" d="M-6,199.1 L256,150.9"/><path class="stitch" d="M-6,199.1 L256,150.9"/>
      </g>
      <text class="cap" transform="translate(23 188) rotate(-90)">HUELGA GENERAL</text><g transform="rotate(180 125 175)"><text class="cap" transform="translate(23 188) rotate(-90)">HUELGA GENERAL</text></g>
    </svg>
    <svg class="ly art live" viewBox="0 0 250 350" aria-hidden="true">
      <g transform="translate(206 60)"><path class="star" d="M0,-20 L5.5,-6.5 L20,-6.5 L8.5,2.5 L12.5,17 L0,8.5 L-12.5,17 L-8.5,2.5 L-20,-6.5 L-5.5,-6.5 Z"/></g>
      <g transform="rotate(180 125 175)"><g transform="translate(206 60)"><path class="star" d="M0,-20 L5.5,-6.5 L20,-6.5 L8.5,2.5 L12.5,17 L0,8.5 L-12.5,17 L-8.5,2.5 L-20,-6.5 L-5.5,-6.5 Z"/></g></g>
    </svg>`;
}

// ── dorsos: cada baraja inicial tiene el suyo ──

interface BackDef {
  field: string;
  /** Celosía clara (sobre fondo oscuro) u oscura. */
  dark: boolean;
  diamond: string;
  emblem: string;
}
const TOWER = `<path d="M101,214 h48 v-24 h-8 v-24 h-8 v-26 h-16 v26 h-8 v24 h-8 Z" fill="${PAPER}"/><path d="M125,140 l-5,22 l8,10 l-6,18 l7,10 l-3,14" fill="none" stroke="${INK}" stroke-width="2.4"/>`;
const inDiamond = (glyph: string) => `<svg x="85" y="135" width="80" height="80" viewBox="0 0 100 100">${GLYPH[glyph]}</svg>`;
const BACKS: Record<string, BackDef> = {
  obra: { field: INK, dark: true, diamond: '#ae2d24', emblem: TOWER },
  acero: { field: 'url(#pat-S)', dark: true, diamond: INK, emblem: `<g transform="translate(125 158) scale(2.5)" fill="${PAPER}">${PIP.S}</g><g transform="translate(125 206) scale(1.7)" fill="${PAPER}">${PIP.C}</g>` },
  prestamista: { field: '#f0b415', dark: false, diamond: INK, emblem: `<ellipse cx="125" cy="204" rx="34" ry="11" fill="#f0b415" stroke="${PAPER}" stroke-width="3"/><ellipse cx="125" cy="188" rx="34" ry="11" fill="#f0b415" stroke="${PAPER}" stroke-width="3"/><ellipse cx="125" cy="172" rx="34" ry="11" fill="#f0b415" stroke="${PAPER}" stroke-width="3"/><circle cx="125" cy="140" r="17" fill="#f0b415" stroke="${PAPER}" stroke-width="3"/><path d="M125,130 V150" stroke="${INK}" stroke-width="4"/>` },
  ases: { field: '#ae2d24', dark: true, diamond: PAPER, emblem: `<text x="125" y="208" text-anchor="middle" font-family="'Archivo Black', sans-serif" font-size="96" fill="${INK}">A</text><g transform="translate(125 232) scale(1.3)" fill="#ae2d24">${PIP.S}</g>` },
  corta: { field: PAPER, dark: false, diamond: '#f0b415', emblem: inDiamond('sierra') },
  caos: { field: '#2a6359', dark: false, diamond: PAPER, emblem: inDiamond('incognita') },
};
let currentBack = 'obra';
/** Dorso con el que se dibujan las cartas a partir de ahora (la baraja de la campaña en curso). */
export function setDeckBack(id: string): void {
  currentBack = BACKS[id] ? id : 'obra';
}
export function backSvg(id = currentBack): string {
  const b = BACKS[id] ?? BACKS.obra;
  const line = b.dark ? PAPER : INK;
  return `
  <svg class="art" viewBox="0 0 250 350" aria-hidden="true">
    <rect width="250" height="350" fill="${INK}"/>
    <rect x="10" y="10" width="230" height="330" fill="${b.field}"/>
    <rect x="16" y="16" width="218" height="318" fill="url(#pat-back${b.dark ? '' : '-ink'})"/>
    <rect x="16" y="16" width="218" height="20" fill="url(#pat-haz)"/><rect x="16" y="314" width="218" height="20" fill="url(#pat-haz)"/>
    <g filter="url(#rough)">
      <rect x="10" y="10" width="230" height="330" fill="none" stroke="${line}" stroke-width="3"/>
      <path d="M125,84 L196,175 L125,266 L54,175 Z" fill="${b.diamond}" stroke="${b.diamond === PAPER || b.diamond === '#f0b415' ? INK : PAPER}" stroke-width="4"/>
      ${b.emblem}
    </g>
  </svg>`;
}

// ───────────────────────── Cartas especiales, herramientas y el Ferretero ─────────────────────────

const RAYS = Array.from({ length: 16 }, (_, i) => `<path d="M0,-70 L5,-112 L-5,-112 Z" transform="rotate(${i * 22.5})"/>`).join('');
// el nombre va en letra grande (25 unidades): se lee desde una carta de 132 px; por debajo se retira (theme.css)
const nameText = (name: string, cls: string) =>
  `<text class="banner-txt ${cls}" x="124" y="270" text-anchor="middle" transform="rotate(-2.7 124 262)"${name.length > 9 ? ' textLength="192" lengthAdjust="spacingAndGlyphs"' : ''}>${name.toUpperCase()}</text>`;

/** Carta especial: campo de tinta, emblema en un sol de papel y su nombre en una banda. */
function specialArt(card: Card): string {
  const s = SPECIAL[card.sp!];
  return `<svg class="ly art" viewBox="0 0 250 350" aria-hidden="true">
    <g filter="url(#rough)">
      <rect class="ink" x="10" y="10" width="230" height="330"/>
      <rect x="10" y="10" width="230" height="330" fill="url(#tone-paper)" opacity="0.13"/>
      <path d="M10,10 H74 L10,74 Z M240,340 H176 L240,276 Z" fill="url(#hatch-paper)" opacity="0.55"/>
      ${PORTRAIT[s.id] ? '<rect class="pp" x="44" y="22" width="162" height="212"/>' : `<g transform="translate(125 142)"><g class="pp burst">${RAYS}</g><circle class="pp" r="70"/><circle class="sp-ring" r="62"/></g>`}
      ${PORTRAIT[s.id] ? '' : `<svg x="67" y="84" width="116" height="116" viewBox="0 0 100 100">${GLYPH[s.id] ?? ''}</svg>`}
    </g>
    ${PORTRAIT[s.id] ? `<svg x="50" y="28" width="150" height="200" viewBox="10 10 230 302" preserveAspectRatio="xMidYMid slice">${portraitBody(s.id)}</svg>` : ''}
    <g filter="url(#rough)"><path class="${s.locked ? 'rd' : 'gd'}" d="M24,246 L226,236 L223,273 L21,283 Z"/></g>
    ${nameText(s.name, s.locked ? 'on-red' : 'on-gold')}
  </svg><div class="ly sp-desc">${s.desc}</div>`;
}

/** Ficha con forma de carta: las herramientas van en chapa estampada (el metal dice la rareza); los servicios, en cartón de obra. */
export function tileEl(glyph: string, name: string, kind: 'relic' | 'service', rarity = 'capataz'): HTMLDivElement {
  ensureDefs();
  const el = document.createElement('div');
  const tone = kind === 'service' ? 'service' : rarity;
  el.className = `card k-tile t-${kind} r-${tone}`;
  const ground = kind === 'service' ? '<rect class="gd" x="10" y="10" width="230" height="330"/><rect x="10" y="10" width="230" height="330" fill="url(#hatch-fine)" opacity="0.28"/>' : plateFrame(rarity);
  el.innerHTML = `
    <div class="card-in"><div class="card-front">
      <div class="ly paper"></div>
      <svg class="ly art" viewBox="0 0 250 350" aria-hidden="true">
        <g filter="url(#rough)">
          ${ground}
          <g transform="translate(125 150)"><g class="ink burst">${RAYS}</g><circle class="pp" r="72"/><circle r="72" fill="url(#tone-ink)" opacity="0.2"/><circle class="sp-ring" r="63"/></g>
          <path class="ink" d="M30,250 L222,241 L219,278 L27,287 Z"/>
          <svg x="65" y="90" width="120" height="120" viewBox="0 0 100 100">${GLYPH[glyph] ?? ''}</svg>
        </g>
        ${nameText(name, 'on-ink').replace('y="264"', 'y="271"').replace('124 258', '124 265')}
      </svg>
      <div class="ly grain"></div><div class="ly glare"></div>
    </div><div class="card-back">${backSvg()}</div></div>`;
  attachTilt(el);
  return el;
}

// ── retratos: el Ferretero y los jefes de obra. Cada uno tiene su propia silueta ──
// (perfil o de frente, máscara, casco, hocico…) para reconocerlo de un vistazo.
// `still` pasa por el filtro de gubia; `live` son los ojos, que siguen al puntero.

const HEAD_OLD = `
    <path class="ink" d="M94,70 L89,96 L77,113 L88,117 L86,125 L92,129 L82,136 C74,146 72,164 80,172 C80,184 88,192 98,190 C104,200 118,202 124,194 C134,198 146,190 146,180 C156,172 160,160 158,146 L162,104 L158,70 Z"/>
    <path class="pp" d="M84,121 C100,110 124,113 138,133 C120,123 102,126 88,134 Z"/>
    <path class="cut" d="M97,138 C90,150 90,166 96,182 M108,137 C102,152 104,172 112,190 M120,135 C116,152 122,174 130,188 M132,133 C132,146 138,164 146,174 M144,126 C147,136 151,148 155,154"/>
    <path class="cut" d="M116,104 C122,110 124,116 122,120 M148,96 c-7,-2 -10,8 -4,13 c3,2 6,0 5,-4 M84,113 l5,-1"/>
    <path class="cut heavy" d="M93,89 L120,85"/>`;
const HEAD_YOUNG = `
    <path class="ink" d="M96,72 L91,97 L80,111 L90,116 L88,123 L93,127 L90,134 C92,142 100,148 112,150 L118,186 L152,186 L156,140 L160,100 L156,70 Z"/>
    <path class="cut" d="M84,111 l5,-1 M116,106 C121,111 122,117 120,122"/>
    <path class="cut heavy" d="M94,90 L120,84"/>`;
const CLOAK = (fill: string, d: string) => `<path ${fill.startsWith('url') ? `fill="${fill}"` : `class="${fill}"`} stroke="#181614" stroke-width="4" stroke-linejoin="round" d="${d}"/>`;
const iris = (x: number, y: number) => `<g transform="translate(${x} ${y})"><g class="lid"><g class="iris"><circle class="rd" r="6"/><circle class="pp" r="2.2"/></g></g></g>`;
const mirrored = (body: string, live = false) => `<g transform="translate(250 0) scale(-1 1)"${live ? ' data-sx="-1" data-sy="1"' : ''}><g transform="translate(-52 -50) scale(1.5)">${body}</g></g>`;

interface Portrait {
  bg: string;
  rays: boolean;
  still: string;
  live: string;
}
const PORTRAIT: Record<string, Portrait> = {
  // El Ferretero: perfil con barba, boina y delantal
  ferretero: {
    bg: 'gl',
    rays: false,
    still: `<path class="thin" d="M10,66 H240 M10,124 H240"/>
      <rect class="rd ol" x="24" y="24" width="24" height="40"/><rect class="pp ol" x="52" y="34" width="18" height="30"/><rect class="ink" x="182" y="28" width="30" height="36"/><rect class="gd ol" x="216" y="38" width="16" height="26"/>
      ${CLOAK('ink', 'M14,312 L40,216 C70,192 180,192 210,216 L236,312 Z')}
      <path class="pp ol" d="M68,312 L78,234 H172 L182,312 Z"/>
      ${mirrored(HEAD_OLD + '<path class="rd ol" d="M82,77 C79,50 112,37 146,41 C167,45 175,61 171,77 Z"/><path class="ink" d="M58,72 H173 V82 H58 Z"/><path class="thin" d="M98,54 C118,45 144,46 160,57"/>')}
      <g transform="translate(46 250) rotate(-10)"><rect class="pp ol" x="-5" y="-98" width="10" height="112"/><rect class="ink" x="-32" y="-126" width="64" height="32" rx="3"/><path class="cut" d="M-22,-118 V-102 M22,-118 V-102"/>${FIST}</g>`,
    live: mirrored(eye(106, 99), true),
  },
  // La Sirena: grita por un megáfono, con la melena al viento
  'j-doble': {
    bg: 'rd',
    rays: false,
    still: `<path class="ink" d="M150,66 C204,58 236,110 228,170 C224,220 236,270 240,312 H146 C170,262 160,200 150,170 Z"/>
      <path class="cut" d="M178,90 C208,122 206,182 200,232 C198,262 206,290 214,308 M162,112 C188,142 186,202 180,252 C178,276 182,296 188,310"/>
      ${CLOAK('url(#pat-D)', 'M60,312 L84,240 C110,222 180,222 206,244 L226,312 Z')}
      <g transform="translate(10 -42) scale(1.45)">${HEAD_YOUNG}<path class="rd" d="M88,120 L99,118 L99,132 L90,135 Z"/><path class="gd ol" d="M92,72 L96,52 L106,66 L114,46 L124,66 L134,46 L142,66 L152,52 L158,72 Z"/></g>
      <path class="gd ol" d="M134,126 L134,156 L46,200 V84 Z"/><path class="ink" d="M36,76 H50 V208 H36 Z"/><path class="thin" d="M72,100 V184 M102,114 V170"/>
      <path class="thin" d="M28,108 C19,126 19,158 28,176 M19,92 C6,120 6,164 19,192"/>
      <g transform="translate(116 186)">${FIST}</g>`,
    live: `<g transform="translate(10 -42) scale(1.45)">${eye(107, 99, 10, 7)}</g>`,
  },
  // El Usurero: de frente, gordo, con chistera, monóculo y bigote
  'j-escasez': {
    bg: 'gd',
    rays: true,
    still: `${CLOAK('url(#pat-C)', 'M20,312 L40,238 C70,216 180,216 210,238 L230,312 Z')}
      <path class="ink" d="M98,226 L125,292 L152,226 L172,312 H78 Z"/>
      <ellipse class="ink" cx="125" cy="152" rx="68" ry="70"/>
      <rect class="ink" x="82" y="16" width="86" height="72"/><rect class="rd" x="82" y="66" width="86" height="12"/><rect class="ink" x="54" y="84" width="142" height="15" rx="4"/>
      <path class="cut" d="M70,176 C80,208 110,220 125,220 C140,220 170,208 180,176 M118,162 C118,148 132,148 132,162 M80,120 L112,124 M138,114 L172,110"/>
      <path class="cut heavy" d="M84,134 H110"/>
      <path class="pp" d="M125,170 C108,158 84,162 68,182 C90,174 108,180 125,188 C142,180 160,174 182,182 C166,162 142,158 125,170 Z"/>
      <path class="rd ol" d="M103,230 L125,242 L147,230 V256 L125,244 L103,256 Z"/>
      <circle cx="154" cy="136" r="21" fill="none" stroke="#c98a1e" stroke-width="5.5"/><path d="M171,150 C188,172 188,204 178,228" fill="none" stroke="#c98a1e" stroke-width="3" stroke-dasharray="4 3"/>
      <rect class="gd ol" x="22" y="284" width="48" height="11" rx="4"/><rect class="gd ol" x="26" y="272" width="48" height="11" rx="4"/><rect class="gd ol" x="20" y="260" width="48" height="11" rx="4"/><circle class="gd ol" cx="54" cy="244" r="12"/>`,
    live: eye(154, 136, 13, 10),
  },
  // El Matasanos: máscara de pico, gafas redondas y sombrero de ala
  'j-sequia': {
    bg: 'pp',
    rays: true,
    still: `${CLOAK('url(#pat-H)', 'M28,312 L52,234 C80,214 170,214 196,238 L216,312 Z')}
      <path class="ink" d="M68,240 C54,182 60,112 110,94 C150,84 174,110 174,150 V184 C152,202 132,216 128,242 Z"/>
      <path class="pp ol" d="M150,128 C192,134 224,160 237,198 C204,190 176,182 152,178 Z"/><path class="thin" d="M160,154 C190,162 212,176 228,192"/><circle class="ink" cx="178" cy="150" r="3.4"/>
      <circle class="pp ol" cx="134" cy="138" r="21"/>
      <path class="cut" d="M96,152 C110,172 130,180 152,178 M86,202 C100,216 116,224 128,228"/>
      <path class="ink" d="M36,94 H204 V110 H36 Z M76,96 C76,36 164,36 164,96 Z"/>
      <path class="pp" d="M108,50 h24 v16 h16 v22 h-16 v8 h-24 v-8 h-16 v-22 h16 Z"/><path class="rd" d="M112,54 h16 v16 h16 v14 h-16 v8 h-16 v-8 h-16 v-14 h16 Z"/>
      <path class="thin" d="M34,150 V312"/><rect class="gd ol" x="22" y="150" width="24" height="34"/><path class="thin" d="M34,150 V138"/>`,
    live: eye(134, 138, 12, 12),
  },
  // La Ventisca: de frente, solo dos ojos en el fondo de una capucha helada
  'j-intemperie': {
    bg: 'gl',
    rays: false,
    still: `<path class="thin" d="M14,62 L72,40 M176,30 L236,12 M14,206 L48,192 M198,98 L236,84 M20,130 L44,122"/>
      <circle class="pp" cx="40" cy="92" r="4"/><circle class="pp" cx="214" cy="56" r="5"/><circle class="pp" cx="206" cy="150" r="3.5"/><circle class="pp" cx="30" cy="166" r="3"/>
      ${CLOAK('url(#pat-S)', 'M22,312 L46,232 C80,208 170,208 204,232 L228,312 Z')}
      <path class="pp ol" d="M96,48 L104,10 L114,38 L125,4 L136,38 L146,10 L154,48 Z"/>
      <path class="pp ol" d="M125,30 C70,50 50,120 56,192 C60,226 84,246 125,248 C166,246 190,226 194,192 C200,120 180,50 125,30 Z"/>
      <path class="ink" d="M125,62 C92,78 78,124 82,178 C86,208 102,224 125,226 C148,224 164,208 168,178 C172,124 158,78 125,62 Z"/>
      <path class="thin" d="M64,120 l10,6 M60,150 l11,3 M186,120 l-10,6 M190,150 l-11,3 M125,36 V56"/>
      <path class="pp ol" d="M58,198 l8,36 l8,-32 Z M84,230 l7,30 l8,-26 Z M152,232 l8,30 l7,-28 Z M176,202 l8,36 l8,-34 Z"/>
      <path class="cut" d="M110,198 q15,10 30,0"/>`,
    live: eye(104, 142, 11, 8) + eye(146, 142, 11, 8),
  },
  // El Coloso: yelmo cerrado, hombreras enormes y dos brasas en la visera
  'j-blindaje': {
    bg: 'rd',
    rays: true,
    still: `${CLOAK('url(#pat-S)', 'M12,312 V252 C12,214 62,206 94,222 V312 Z')}${CLOAK('url(#pat-S)', 'M238,312 V252 C238,214 188,206 156,222 V312 Z')}
      <circle class="pp" cx="36" cy="246" r="4"/><circle class="pp" cx="64" cy="236" r="4"/><circle class="pp" cx="214" cy="246" r="4"/><circle class="pp" cx="186" cy="236" r="4"/>
      <path class="ink" d="M80,312 L88,214 H162 L170,312 Z"/><path class="cut" d="M125,224 V312 M100,254 H150"/>
      <path class="rd ol" d="M125,26 C152,0 194,10 204,42 C178,30 156,38 138,54 Z"/>
      <path class="ink" d="M66,216 V98 C66,38 184,38 184,98 V216 Z"/>
      <path class="gd ol" d="M112,54 C112,22 138,22 138,54 V100 H112 Z"/>
      <path class="cut" d="M66,114 H184"/>
      <path class="pp" d="M82,126 H168 V144 H133 V204 H117 V144 H82 Z"/>
      <circle class="pp" cx="96" cy="172" r="3.4"/><circle class="pp" cx="96" cy="188" r="3.4"/><circle class="pp" cx="154" cy="172" r="3.4"/><circle class="pp" cx="154" cy="188" r="3.4"/>`,
    live: iris(102, 135) + iris(148, 135),
  },
  // La Furia: de frente, melena de llamas, boca abierta y puños en alto
  'j-furia': {
    bg: 'gd',
    rays: true,
    still: `${CLOAK('url(#pat-H)', 'M22,312 L28,208 H54 L72,312 Z')}${CLOAK('url(#pat-H)', 'M228,312 L222,208 H196 L178,312 Z')}
      ${CLOAK('url(#pat-H)', 'M56,312 L70,238 C96,222 154,222 180,238 L194,312 Z')}
      <g transform="translate(41 192) scale(1.5)">${FIST}</g><g transform="translate(209 192) scale(1.5)">${FIST}</g>
      <path class="rd ol" d="M58,152 C40,112 62,98 56,58 C76,72 84,88 90,98 C88,64 108,46 106,14 C128,34 132,64 138,82 C146,60 164,48 166,24 C188,52 186,86 182,102 C192,92 204,86 208,72 C218,106 206,136 192,152 Z"/>
      <path class="ink" d="M64,142 C64,112 186,112 186,142 V208 C186,238 64,238 64,208 Z"/>
      <path class="cut heavy" d="M80,138 L114,152 M170,138 L136,152"/>
      <path class="rd" d="M90,186 H160 V214 C160,226 90,226 90,214 Z"/>
      <path class="pp" d="M90,186 H160 L152,200 L143,186 L134,200 L125,186 L116,200 L107,186 L98,200 Z M100,224 L107,212 L116,224 L125,212 L134,224 L143,212 L150,224 Z"/>`,
    live: eye(100, 164, 10, 7) + eye(150, 164, 10, 7),
  },
  // El Topo: hocico largo, gafitas, dientes y casco de minero con lámpara
  'j-inestable': {
    bg: 'gl',
    rays: false,
    still: `<path class="pp" d="M160,78 L238,36 V104 L164,96 Z"/>
      ${CLOAK('url(#pat-C)', 'M18,312 L44,238 C70,216 150,216 176,238 L198,312 Z')}
      <path class="ink" d="M54,240 C38,172 58,104 116,100 C150,98 170,116 184,136 C206,146 228,158 236,172 C228,186 204,192 182,192 C170,216 150,234 126,242 Z"/>
      <circle class="rd ol" cx="230" cy="170" r="9"/>
      <path class="pp ol" d="M184,190 h10 v18 h-10 Z M197,189 h10 v15 h-10 Z"/>
      <path class="thin" d="M206,160 L238,138 M208,174 L240,190 M202,150 L230,120"/>
      <circle class="pp ol" cx="146" cy="142" r="17"/><path class="cut" d="M129,140 L98,132 M84,152 c-10,-4 -14,10 -6,16"/>
      <path class="gd ol" d="M50,118 C50,58 152,54 174,112 Z"/><rect class="ink" x="42" y="108" width="144" height="13" rx="4"/><circle class="pp ol" cx="152" cy="84" r="13"/>
      <circle class="pp ol" cx="44" cy="270" r="30"/><svg x="22" y="248" width="44" height="44" viewBox="0 0 100 100">${GLYPH.piqueta}</svg>`,
    live: eye(146, 142, 9, 9),
  },
};

/** Cuerpo de un retrato para incrustarlo donde haga falta (250 × 312, sin la banda del nombre). */
function portraitBody(id: string): string {
  const p = PORTRAIT[id];
  return `<g filter="url(#rough)"><rect class="${p.bg}" x="10" y="10" width="230" height="330"/>${p.rays ? `<g transform="translate(125 150)" class="${p.bg === 'rd' ? 'ink' : 'pp'} port-rays">${RAYS}${RAYS.replace(/rotate\\((\\d+\\.?\\d*)\\)/g, (_, a) => `rotate(${Number(a) + 11.25}) scale(1.45)`)}</g>` : ''}${p.still}${shade('M240,312 H128 L240,170 Z', 'tone-ink', 0.3)}${shade('M10,10 H104 L10,126 Z', 'hatch-fine', 0.42)}</g>${p.live}`;
}

/** Carta de personaje: el Ferretero ('ferretero') o un jefe de obra ('j-' + id del jefe). */
export function portraitEl(id: string, name: string): HTMLDivElement {
  ensureDefs();
  const el = document.createElement('div');
  el.className = 'card k-npc';
  el.dataset.lupa = id.startsWith('j-') ? `boss:${id.slice(2)}` : `npc:${id}`;
  el.innerHTML = `
    <div class="card-in"><div class="card-front">
      <div class="ly paper"></div>
      <svg class="ly art" viewBox="0 0 250 350" aria-hidden="true">${portraitBody(id)}
        <g filter="url(#rough)"><path class="ink" d="M10,312 H240 V340 H10 Z"/></g>
        <text class="banner-txt on-ink npc-name" x="125" y="334" text-anchor="middle"${name.length > 11 ? ' textLength="214" lengthAdjust="spacingAndGlyphs"' : ''}>${name.toUpperCase()}</text></svg>
      <div class="ly grain"></div><div class="ly glare"></div>
    </div><div class="card-back">${backSvg()}</div></div>`;
  attachTilt(el);
  return el;
}
export const ferreteroEl = () => portraitEl('ferretero', 'El Ferretero');

// ───────────────────────── Sellos y tratamientos ─────────────────────────
// El sello es un tampón de goma abajo a la izquierda; el tratamiento, un cartabón de tinta arriba a la
// derecha más un acabado sobre toda la carta. Las esquinas con el índice quedan siempre libres.

const SEAL_INK: Record<Seal, string> = { dinamita: '#ae2d24', eco: '#1f4e63', jornal: '#a06a10', sindical: '#181614' };
const SEAL_ICON: Record<Seal, string> = {
  dinamita: '<path d="M-9,-2 H9 V16 H-9 Z"/><path d="M0,-2 C0,-12 9,-8 10,-17" fill="none" stroke-width="3.4"/><path d="M10,-24 l3,5 l6,-1 l-4,5 l3,5 l-6,-1 l-3,5 l-2,-6 l-6,-1 l5,-4 Z"/>',
  eco: '<circle r="4.5"/><path d="M-11,-11 C-17,-4 -17,4 -11,11 M11,-11 C17,-4 17,4 11,11 M-19,-17 C-28,-6 -28,6 -19,17 M19,-17 C28,-6 28,6 19,17" fill="none" stroke-width="3.4"/>',
  jornal: '<circle r="15" fill="none" stroke-width="4"/><path d="M-5,-8 V8 M0,-8 V8 M5,-8 V8 M-9,5 L9,-5" fill="none" stroke-width="3"/>',
  sindical: '<path d="M-11,16 V-2 C-11,-8 -6,-8 -6,-3 V-12 C-6,-17 -1,-17 -1,-12 V-14 C-1,-19 4,-19 4,-14 V-11 C4,-16 9,-16 9,-11 V4 C9,12 6,16 2,16 Z"/>',
};

function sealLayer(seal: Seal): string {
  const ink = SEAL_INK[seal];
  return `<svg class="ly art seal" viewBox="0 0 250 350" aria-hidden="true"><g filter="url(#rough)" transform="translate(60 286) rotate(-13)">
    <circle r="37" fill="${PAPER}" opacity="0.9"/>
    <circle r="33" fill="none" stroke="${ink}" stroke-width="5.5"/>
    <circle r="25.5" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="3 4.2"/>
    <g fill="${ink}" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round" stroke-width="0">${SEAL_ICON[seal]}</g>
  </g></svg>`;
}

const TREAT_FILL: Record<Treatment, string> = { forjado: '#33363a', templado: '#1f4e63', policromado: '#c98a1e', agrietado: '#ae2d24' };
const TREAT_ICON: Record<Treatment, string> = {
  forjado: `<circle cx="218" cy="26" r="5" fill="${PAPER}"/><circle cx="226" cy="46" r="4" fill="${PAPER}"/><circle cx="202" cy="20" r="4" fill="${PAPER}"/>`,
  templado: `<path d="M196,22 q7,-9 14,0 t14,0 M208,38 q6,-8 12,0 t12,0" fill="none" stroke="${PAPER}" stroke-width="3.6" stroke-linecap="round"/>`,
  policromado: `<g transform="translate(217 31)" fill="${INK}"><circle r="7.5"/>${Array.from({ length: 8 }, (_, i) => `<rect x="-1.8" y="-17" width="3.6" height="7" transform="rotate(${i * 45})"/>`).join('')}</g>`,
  agrietado: `<path d="M228,14 L214,28 L224,34 L210,50" fill="none" stroke="${PAPER}" stroke-width="4" stroke-linejoin="bevel"/>`,
};
const TREAT_BODY: Record<Treatment, string> = {
  // largueros de acero remachados a los lados
  forjado: `<path fill="#33363a" d="M10,92 H19 V262 H10 Z M231,96 H240 V258 H231 Z"/>${[108, 150, 192, 234].map((y) => `<circle cx="14.5" cy="${y}" r="2.4" fill="${PAPER}"/><circle cx="235.5" cy="${y + 4}" r="2.4" fill="${PAPER}"/>`).join('')}`,
  // la línea de temple cruza la carta
  templado: `<path d="M10,214 q20,-16 40,0 t40,0 t40,0 t40,0 t40,0 t30,-6" fill="none" stroke="#1f4e63" stroke-width="3.2" opacity="0.8"/><path d="M10,224 q20,-16 40,0 t40,0 t40,0 t40,0 t40,0 t30,-6" fill="none" stroke="#1f4e63" stroke-width="1.4" opacity="0.6"/>`,
  policromado: `<rect x="14" y="14" width="222" height="322" fill="none" stroke="#c98a1e" stroke-width="4" stroke-dasharray="14 5"/>`,
  agrietado: `<path d="M152,10 L140,62 L161,96 L134,140 L150,182 L120,226 L138,270 L112,340 M134,140 L96,160 L70,150 M150,182 L190,204 L206,244" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="bevel"/><path d="M152,10 L140,62 L161,96 L134,140 L150,182 L120,226 L138,270 L112,340 M134,140 L96,160 L70,150 M150,182 L190,204 L206,244" fill="none" stroke="${PAPER}" stroke-width="1.6" stroke-linejoin="bevel"/>`,
};

function treatLayer(tr: Treatment): string {
  return `<svg class="ly art treat" viewBox="0 0 250 350" aria-hidden="true"><g filter="url(#rough)">
    ${TREAT_BODY[tr]}
    <path d="M176,10 H240 V74 Z" fill="${TREAT_FILL[tr]}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    ${TREAT_ICON[tr]}
  </g></svg>${tr === 'policromado' || tr === 'templado' ? '<div class="ly sheen"></div>' : ''}`;
}

/** Lo que dice el globo de ayuda de una carta: su efecto especial, su sello y su tratamiento. */
export function cardTip(card: Card): string {
  const parts: string[] = [];
  if (card.sp) parts.push(`<b>${SPECIAL[card.sp].name}</b>${SPECIAL[card.sp].desc}`);
  if (card.tr) parts.push(`<b>${TREATMENT[card.tr].name}</b>${TREATMENT[card.tr].desc}`);
  if (card.seal) parts.push(`<b>${SEAL[card.seal].name}</b>${SEAL[card.seal].desc}`);
  return parts.join('<hr>');
}

// ───────────────────────── Carta ─────────────────────────

/** Marco de la carta con la trama de su palo: el palo se reconoce en gris por el borde. Las esquinas llevan placa encima. */
const weaveFrame = (suit: Suit) =>
  `<svg class="ly weave" viewBox="0 0 250 350" preserveAspectRatio="none" aria-hidden="true"><path fill-rule="evenodd" d="M7,7 H243 V343 H7 Z M21,21 V329 H229 V21 Z" fill="url(#trama-${suit})"/></svg>`;

function corner(suit: CardSuit, rank: number, cls: string): string {
  const glyph = suit === 'X' ? '<span class="star-mini">★</span>' : suitSvg(suit);
  return `<div class="corner ${cls}${rank === 10 ? ' wide' : ''}"><b>${RANK_LABEL[rank]}</b>${glyph}</div>`;
}

export function cardEl(card: Card, opts: { faceDown?: boolean; tilt?: boolean } = {}): HTMLDivElement {
  ensureDefs();
  const el = document.createElement('div');
  const kind = card.sp ? 'special' : card.suit === 'X' ? 'joker' : card.rank > 10 ? 'figure' : card.rank === 1 ? 'ace' : 'number';
  el.className = `card s-${card.suit} k-${kind}${card.tr ? ` t-${card.tr}` : ''}${card.seal ? ` z-${card.seal}` : ''}${opts.faceDown ? ' flipped' : ''}`;
  el.dataset.id = card.id;
  cardOf.set(el, card);
  const tip = cardTip(card);
  if (tip) el.dataset.tip = tip;
  const art = card.sp ? specialArt(card) : card.suit === 'X' ? jokerArt() : card.rank > 10 ? figure(card.suit, card.rank) : card.rank === 1 ? aceArt(card.suit) : numberArt(card.suit, card.rank);
  el.innerHTML = `
    <div class="card-in">
      <div class="card-front">
        <div class="ly paper"></div>
        ${card.sp || card.suit === 'X' ? '' : weaveFrame(card.suit)}
        ${art}
        <div class="ly idx">${card.sp ? '' : corner(card.suit, card.rank, 'tl') + corner(card.suit, card.rank, 'br')}</div>
        ${card.tr ? treatLayer(card.tr) : ''}${card.seal ? sealLayer(card.seal) : ''}
        <div class="ly grain"></div>
        <div class="ly glare"></div>
      </div>
      <div class="card-back">${backSvg()}</div>
    </div>`;
  if (opts.tilt !== false) attachTilt(el);
  return el;
}

export function backEl(deck?: string): HTMLDivElement {
  ensureDefs();
  const el = document.createElement('div');
  el.className = 'card flipped';
  el.innerHTML = `<div class="card-in"><div class="card-front"><div class="ly paper"></div></div><div class="card-back">${backSvg(deck)}</div></div>`;
  return el;
}

/** Inclinación 3D con paralaje de capas y brillo que sigue al puntero. */
function attachTilt(el: HTMLElement): void {
  el.addEventListener('pointermove', (e) => {
    if (el.classList.contains('flipped') || el.classList.contains('fly')) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.classList.add('tilting');
    el.style.setProperty('--ry', `${(px - 0.5) * 26}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * 22}deg`);
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
  });
  el.addEventListener('pointerleave', () => {
    el.classList.remove('tilting');
    el.style.removeProperty('--ry');
    el.style.removeProperty('--rx');
  });
}

/** Los ojos de todas las figuras siguen al puntero. */
let eyesBound = false;
export function bindEyes(): void {
  if (eyesBound) return;
  eyesBound = true;
  let x = 0;
  let y = 0;
  let pending = false;
  addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      document.querySelectorAll<SVGGElement>('.card:not(.flipped) .iris, .lino .iris').forEach((iris) => {
        const half = iris.closest<SVGGElement>('[data-sx]');
        const box = (iris.parentNode as SVGGElement).getBoundingClientRect();
        const dx = x - (box.left + box.width / 2);
        const dy = y - (box.top + box.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, d / 160) * 3.4;
        const sx = Number(half?.dataset.sx ?? 1);
        const sy = Number(half?.dataset.sy ?? 1);
        iris.style.transform = `translate(${((dx / d) * reach * sx).toFixed(2)}px, ${((dy / d) * reach * 0.7 * sy).toFixed(2)}px)`;
      });
    });
  });
}

export const ALL_CARDS: Card[] = [
  ...(['S', 'D', 'H', 'C'] as Suit[]).flatMap((s) => Array.from({ length: 13 }, (_, i) => ({ id: `${s}${i + 1}`, suit: s, rank: i + 1 }))),
  { id: 'X1', suit: 'X', rank: 0 },
  { id: 'X2', suit: 'X', rank: 0 },
];
