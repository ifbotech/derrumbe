// Baraja del juego — ilustrada en SVG a mano, estilo linograbado: masas de tinta,
// líneas talladas en color papel, tintas planas por palo y textura de imprenta.
// Lienzo de cada carta: 250 × 350. Las figuras son de doble cabeza, unidas por una costura diagonal.
import { Card, CardSuit, MATERIAL, RANK_LABEL, SEAL, Seal, Suit, TREATMENT, Treatment } from '../rules/engine';
import { SPECIAL } from '../rules/specials';
import { SEAL_ICON, engravingDefs, plateFrame, shade, suitWeaves } from './engraving';
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
    <path class="gd ol" d="M88,72 L81,34 L100,52 L112,24 L125,48 L138,24 L150,52 L171,34 L164,72 Z"/><circle class="gd ol" cx="112" cy="24" r="4"/><circle class="gd ol" cx="138" cy="24" r="4"/>
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
      <text class="cap" transform="translate(23 188) rotate(-90)">MOTÍN</text><g transform="rotate(180 125 175)"><text class="cap" transform="translate(23 188) rotate(-90)">MOTÍN</text></g>
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
/** Emblema de la conjura: una daga que atraviesa una corona. */
const CONJURA = `<path d="M92,204 L88,164 L105,182 L125,152 L145,182 L162,164 L158,204 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M92,192 H158" stroke="${INK}" stroke-width="3"/>
  <g transform="translate(125 178) rotate(35)"><path d="M-6,-64 L0,-80 L6,-64 V24 H-6 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3"/><path d="M-20,24 H20 V32 H-20 Z" fill="${INK}" stroke="${PAPER}" stroke-width="1.5"/><rect x="-4" y="32" width="8" height="22" fill="${INK}"/><circle cy="60" r="7" fill="${PAPER}" stroke="${INK}" stroke-width="3"/></g>`;
const BACKS: Record<string, BackDef> = {
  obra: { field: INK, dark: true, diamond: '#ae2d24', emblem: CONJURA },
  acero: { field: 'url(#pat-S)', dark: true, diamond: INK, emblem: `<g transform="translate(125 158) scale(2.5)" fill="${PAPER}">${PIP.S}</g><g transform="translate(125 206) scale(1.7)" fill="${PAPER}">${PIP.C}</g>` },
  prestamista: { field: '#f0b415', dark: false, diamond: INK, emblem: `<path d="M110,142 C100,132 104,124 112,128 L125,136 L138,128 C146,124 150,132 140,142 C168,154 172,214 125,216 C78,214 82,154 110,142 Z" fill="#f0b415" stroke="${PAPER}" stroke-width="3.5" stroke-linejoin="round"/><path d="M108,146 H142" stroke="${INK}" stroke-width="5"/><circle cx="125" cy="184" r="14" fill="none" stroke="${INK}" stroke-width="4"/><path d="M125,176 V192" stroke="${INK}" stroke-width="4"/>` },
  ases: { field: '#ae2d24', dark: true, diamond: PAPER, emblem: `<path d="M100,134 L97,112 L110,124 L125,104 L140,124 L153,112 L150,134 Z" fill="#ae2d24" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><text x="125" y="212" text-anchor="middle" font-family="'Archivo Black', sans-serif" font-size="96" fill="${INK}">A</text><g transform="translate(125 232) scale(1.3)" fill="#ae2d24">${PIP.S}</g>` },
  corta: { field: PAPER, dark: false, diamond: '#f0b415', emblem: `<g stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"><path d="M96,132 H124 L118,152 L128,170 L114,218 H96 Z" fill="${PAPER}" transform="rotate(-8 110 175)"/><path d="M130,132 H154 V218 H122 L136,170 L126,152 Z" fill="${PAPER}" transform="rotate(8 140 175)"/></g><g transform="translate(108 150) scale(0.9)" fill="#ae2d24">${PIP.H}</g>` },
  caos: { field: '#2a6359', dark: false, diamond: PAPER, emblem: `<path d="M125,175 C125,168 135,168 135,176 C135,188 115,188 115,174 C115,154 147,154 147,176 C147,200 103,200 103,174 C103,142 159,142 159,176 C159,212 91,212 91,174" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` },
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
    <rect x="16" y="16" width="218" height="20" fill="#7d1d17"/><rect x="16" y="314" width="218" height="20" fill="#7d1d17"/><path d="M16,26 H234 M16,324 H234" stroke="#e0a43a" stroke-width="2.5" stroke-dasharray="10 5"/>
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

// ── retratos: el Tratante y los siete monarcas. A cada uno se le reconoce por su objeto y su silueta
// (sombrero y farol, naipe de dos caras, balanza, cáliz, corona de carámbanos, llave, hacha al hombro,
// reloj de arena), nunca por rasgos de la cara. `still` pasa por el filtro de gubia; `live` son los
// ojos, que siguen al puntero.

const CLOAK = (fill: string, d: string) => `<path ${fill.startsWith('url') ? `fill="${fill}"` : `class="${fill}"`} stroke="#181614" stroke-width="4" stroke-linejoin="round" d="${d}"/>`;
const iris = (x: number, y: number) => `<g transform="translate(${x} ${y})"><g class="lid"><g class="iris"><circle class="rd" r="6"/><circle class="pp" r="2.2"/></g></g></g>`;
/** Rostro de frente, sereno: óvalo de papel, nariz y boca de buril. */
const FACE = (x1: number, x2: number, top: number, chin: number) => {
  const mid = (x1 + x2) / 2;
  return `<path class="pp ol" d="M${x1},${top} C${x1 - 2},${top + 48} ${mid - 22},${chin - 2} ${mid},${chin} C${mid + 22},${chin - 2} ${x2 + 2},${top + 48} ${x2},${top} C${x2},${top - 24} ${x1},${top - 24} ${x1},${top} Z"/>
    <path class="thin" d="M${mid},${top + 22} V${top + 46} l-6,4 M${mid - 9},${top + 62} Q${mid},${top + 66} ${mid + 9},${top + 62}"/>`;
};
const ERMINE = (pts: [number, number][]) => pts.map(([x, y]) => `<path class="ink" d="M${x},${y} l3,9 l3,-9 Z"/>`).join('');

interface Portrait {
  bg: string;
  rays: boolean;
  still: string;
  live: string;
}
const KING_STILL = king('D')[0];
const PORTRAIT: Record<string, Portrait> = {
  // El Tratante: sombrero de ala ancha con una moneda en la cinta y un farol colgado
  ferretero: {
    bg: 'gl',
    rays: false,
    still: `<path class="thin" d="M44,10 V60"/>
      <path class="ink" d="M30,60 H58 L62,70 H26 Z"/><rect class="gd ol" x="28" y="70" width="32" height="42"/><rect class="pp" x="35" y="77" width="18" height="28"/><path class="ink" d="M26,112 H62 L56,120 H32 Z"/>
      ${CLOAK('url(#pat-D)', 'M14,312 L36,222 C70,198 180,198 214,222 L236,312 Z')}
      <path class="rd ol" d="M82,198 C100,216 150,216 168,198 L174,216 C150,236 100,236 76,216 Z"/>
      ${FACE(92, 158, 116, 196)}
      <path class="ink" d="M92,116 H158 V132 C140,126 110,126 92,132 Z"/>
      <path class="ink" d="M76,108 C74,54 176,54 174,108 Z"/>
      <path class="gd ol" d="M76,94 H174 V108 H76 Z"/><circle class="gd ol" cx="152" cy="101" r="11"/><path class="thin" d="M152,95 V107"/>
      <path class="ink" d="M12,118 C60,98 190,98 238,118 C190,134 60,134 12,118 Z"/>
      <path class="cut" d="M40,116 C90,107 160,107 210,116"/>`,
    live: eye(111, 142, 9, 6) + eye(139, 142, 9, 6),
  },
  // El Rey de Dos Caras: un rey de naipe con una cara arriba y otra abajo, cada una mirando a un lado
  'j-doble': {
    bg: 'ink',
    rays: false,
    still: `<rect class="pp ol" x="22" y="18" width="206" height="314" rx="10"/>
      <g clip-path="url(#half)">${KING_STILL}</g>
      <g transform="rotate(180 125 175)"><g clip-path="url(#half)">${KING_STILL}</g></g>
      <path class="belt" d="M-6,199.1 L256,150.9"/><path class="stitch" d="M-6,199.1 L256,150.9"/>`,
    live: `${eye(106, 98)}<g transform="rotate(180 125 175)" data-sx="-1" data-sy="-1">${eye(106, 98)}</g>`,
  },
  // El Usurero: recaudador flaco de cuello de armiño que pesa monedas en una balanza de mano
  'j-escasez': {
    bg: 'gd',
    rays: true,
    still: `${CLOAK('url(#pat-C)', 'M62,312 L78,228 C98,212 152,212 172,228 L188,312 Z')}
      <path class="ink" d="M113,186 H137 V214 H113 Z"/>
      <path class="pp ol" d="M70,232 C90,204 160,204 180,232 C160,248 90,248 70,232 Z"/>${ERMINE([[88, 222], [108, 216], [134, 216], [154, 222]])}
      ${FACE(102, 148, 112, 196)}
      <path class="rd ol" d="M96,106 C78,92 88,62 125,60 C164,62 174,92 154,106 Z"/><path class="ink" d="M97,100 H153 V112 H97 Z"/><circle class="gd ol" cx="146" cy="78" r="6"/>
      <path class="ink" d="M121,234 H129 V264 H121 Z"/><g transform="translate(125 238) scale(0.8)">${FIST}</g>
      <path class="ink" d="M56,262 H194 V269 H56 Z"/><circle class="gd ol" cx="125" cy="265" r="6"/>
      <path class="thin" d="M60,269 L48,296 M60,269 L72,296 M190,269 L178,296 M190,269 L202,296"/>
      <path class="gd ol" d="M42,296 H78 C76,308 44,308 42,296 Z M172,296 H208 C206,308 174,308 172,296 Z"/>
      <ellipse class="gd ol" cx="52" cy="292" rx="8" ry="3.5"/><ellipse class="gd ol" cx="68" cy="292" rx="8" ry="3.5"/><ellipse class="gd ol" cx="60" cy="285" rx="8" ry="3.5"/>`,
    live: eye(113, 138, 7, 5) + eye(137, 138, 7, 5),
  },
  // La Dama del Cáliz: dama velada que ofrece un cáliz del que sube un humo verde
  'j-sequia': {
    // fondo de veneno (verde oscuro): el lacre queda para El Inquisidor
    bg: 'vd',
    rays: false,
    still: `${CLOAK('url(#pat-H)', 'M30,312 L52,228 C84,206 166,206 198,228 L220,312 Z')}
      <path class="pp ol" d="M125,28 C80,32 66,90 64,150 C62,200 50,240 40,282 L84,264 C92,234 100,216 125,214 C150,216 158,234 166,264 L210,282 C200,240 188,200 186,150 C184,90 170,32 125,28 Z"/>
      <path class="thin" d="M86,80 C78,140 76,200 62,262 M164,80 C172,140 174,200 188,262"/>
      <path class="ink" d="M96,104 C96,160 106,190 125,192 C144,190 154,160 154,104 C154,80 96,80 96,104 Z"/>
      <path d="M97,116 H153 M96,130 H154 M97,160 H153 M100,174 H150" fill="none" stroke="#eae0ce" stroke-width="1.6" opacity="0.5"/>
      <path class="gd ol" d="M92,62 C110,50 140,50 158,62 L154,72 C138,64 112,64 96,72 Z"/>
      <path d="M114,226 C104,210 122,202 112,186 M126,224 C134,208 120,200 130,182 M138,226 C146,212 136,204 142,190" fill="none" style="stroke:var(--verd-lit)" stroke-width="5" stroke-linecap="round"/>
      <path class="gd ol" d="M98,226 H152 C152,254 140,264 125,264 C110,264 98,254 98,226 Z"/><path class="rd" d="M118,238 C118,234 124,234 125,238 C126,234 132,234 132,238 C132,244 125,248 125,250 C125,248 118,244 118,238 Z"/>
      <path class="gd ol" d="M121,264 H129 V288 H121 Z"/><path class="gd ol" d="M102,300 C108,286 142,286 148,300 Z"/>`,
    live: eye(112, 144, 7, 5) + eye(138, 144, 7, 5),
  },
  // La Reina Helada: reina pálida con corona de carámbanos y capa de armiño
  'j-intemperie': {
    bg: 'gl',
    rays: false,
    still: `<circle class="pp" cx="40" cy="92" r="4"/><circle class="pp" cx="214" cy="56" r="5"/><circle class="pp" cx="206" cy="150" r="3.5"/><circle class="pp" cx="30" cy="166" r="3"/><circle class="pp" cx="196" cy="26" r="3"/>
      ${CLOAK('pp', 'M22,312 L46,226 C80,202 170,202 204,226 L228,312 Z')}${ERMINE([[44, 268], [62, 240], [70, 290], [176, 240], [188, 290], [204, 266], [56, 300], [196, 300]])}
      <path d="M96,312 L104,228 H146 L154,312 Z" fill="url(#pat-S)" class="ol"/>
      <path class="ink" d="M84,110 C80,170 78,212 68,242 H182 C172,212 170,170 166,110 C166,70 84,70 84,110 Z"/>
      ${FACE(98, 152, 110, 188)}
      <path class="pp ol" d="M86,98 L90,52 L99,86 L108,28 L116,82 L125,10 L134,82 L142,28 L151,86 L160,52 L164,98 Z"/>
      <path class="thin" d="M108,40 V80 M125,24 V80 M142,40 V80"/>`,
    live: eye(113, 136, 8, 5.5) + eye(137, 136, 8, 5.5),
  },
  // El Inquisidor: capucha puntiaguda, ojos en sombra y una gran llave al cuello
  'j-blindaje': {
    bg: 'rd',
    rays: true,
    still: `${CLOAK('url(#pat-S)', 'M24,312 L48,224 C80,202 170,202 202,224 L226,312 Z')}
      <path class="ink" d="M125,10 L180,178 C184,206 160,220 125,222 C90,220 66,206 70,178 Z" stroke="#eae0ce" stroke-width="2.5"/>
      <path class="cut" d="M125,24 L94,162 M125,24 L156,162"/>
      <path d="M96,146 h24 v16 h-24 Z M130,146 h24 v16 h-24 Z" fill="#26231f" stroke="#eae0ce" stroke-width="2.5"/>
      <path d="M84,204 Q125,244 166,204" fill="none" stroke="#c98a1e" stroke-width="5" stroke-dasharray="7 4"/>
      <circle class="gd ol" cx="125" cy="240" r="16"/><circle class="ink" cx="125" cy="240" r="6"/>
      <path class="gd ol" d="M120,255 H130 V304 H120 Z"/><path class="gd ol" d="M130,282 H148 V290 H140 V300 H130 Z"/>`,
    live: iris(108, 154) + iris(142, 154),
  },
  // El Verdugo: encapuchado corpulento con el hacha apoyada al hombro, de espaldas al filo
  'j-furia': {
    bg: 'gd',
    rays: false,
    still: `${CLOAK('url(#pat-H)', 'M8,312 V248 C8,208 60,192 125,192 C190,192 242,208 242,248 V312 Z')}
      <path class="ink" d="M78,208 C70,142 76,72 125,64 C174,72 180,142 172,208 Z" stroke="#eae0ce" stroke-width="2.5"/>
      <path class="pp ol" d="M98,120 C102,110 116,110 120,122 C112,127 104,127 98,120 Z M130,122 C134,110 148,110 152,120 C146,127 138,127 130,122 Z"/>
      <path class="cut" d="M125,74 V104"/>
      <!-- el hacha, delante de la capucha y al hombro: la hoja ancha entera a la vista -->
      <g transform="translate(176 100) rotate(20) scale(1.1)">
        <rect class="ink" x="-5.5" y="-14" width="11" height="196" stroke="#eae0ce" stroke-width="2"/>
        <path class="ink" d="M4,-6 C22,-8 38,-16 48,-30 C60,-4 62,36 52,66 C42,54 24,46 4,44 Z" stroke="#eae0ce" stroke-width="3" stroke-linejoin="round"/>
        <path d="M46,-20 C55,2 56,36 49,58" fill="none" stroke="#eae0ce" stroke-width="3" stroke-linecap="round"/>
        <path class="ink" d="M-4,6 L-26,18 L-4,30 Z" stroke="#eae0ce" stroke-width="2.5" stroke-linejoin="round"/>
        <path class="gd ol" d="M-7,-20 H7 V-12 H-7 Z"/>
      </g>
      <g transform="translate(114 278) rotate(-18)">${FIST}</g>`,
    live: iris(110, 119) + iris(141, 119),
  },
  // El Relojero: anciano con lupa al ojo y un reloj de arena en la mano
  'j-inestable': {
    bg: 'gl',
    rays: true,
    still: `${CLOAK('url(#pat-C)', 'M24,312 L46,228 C80,206 170,206 204,228 L226,312 Z')}
      ${FACE(92, 158, 102, 180)}
      <path class="ink" d="M90,102 C92,64 158,64 160,102 Z"/>
      <path class="pp ol" d="M96,160 C96,202 110,238 125,252 C140,238 154,202 154,160 C142,174 108,174 96,160 Z"/>
      <path class="thin" d="M112,182 L118,228 M125,184 V242 M138,182 L132,228"/>
      <circle cx="141" cy="130" r="16" class="gl" stroke="#181614" stroke-width="5"/><path class="thin" d="M155,140 L172,156"/>
      <g transform="translate(62 252)"><rect class="gd ol" x="-26" y="-42" width="52" height="9"/><rect class="gd ol" x="-26" y="33" width="52" height="9"/>
        <path class="pp ol" d="M-19,-33 H19 C19,-12 4,-6 4,0 C4,6 19,12 19,33 H-19 C-19,12 -4,6 -4,0 C-4,-6 -19,-12 -19,-33 Z"/>
        <path class="gd" d="M-15,31 C-12,19 -4,14 0,8 C4,14 12,19 15,31 Z"/><path class="thin" d="M0,0 V22"/></g>
      <g transform="translate(96 262)">${FIST}</g>`,
    live: eye(109, 130, 7, 5) + eye(141, 130, 10, 7.5),
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
export const ferreteroEl = () => portraitEl('ferretero', 'El Tratante');

// ───────────────────────── Sellos y tratamientos ─────────────────────────
// El sello es un tampón de goma abajo a la izquierda; el tratamiento, un cartabón de tinta arriba a la
// derecha más un acabado sobre toda la carta. Las esquinas con el índice quedan siempre libres.

const SEAL_INK: Record<Seal, string> = { dinamita: '#ae2d24', eco: '#1f4e63', jornal: '#a06a10', sindical: '#181614' };

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
  </g></svg>`;
}

/**
 * V8 · brillo de lámina de las cuatro cartas con acabado (Filo de plata, Templado, Lacre policromo y Cristal
 * maldito): una banda de brillo pintada una vez (degradado quieto; policromo en el Lacre policromo) dentro
 * de la carta, que recorta su capa. La banda (.foil-band) solo se mueve con transform y opacity (la pasada
 * es de juice-ux); con «Reducir movimiento», quieta y tenue. Va bajo el índice: no toca las cifras.
 */
const foilLayer = (tr: Treatment) => `<div class="ly foil f-${tr}" aria-hidden="true"><i class="foil-band"></i></div>`;

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
        ${card.tr ? treatLayer(card.tr) + foilLayer(card.tr) : ''}${card.seal ? sealLayer(card.seal) : ''}
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
