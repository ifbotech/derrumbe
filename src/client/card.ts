// Baraja DERRUMBE — ilustrada en SVG a mano, estilo linograbado: masas de tinta,
// líneas talladas en color papel, tintas planas por palo y textura de imprenta.
// Lienzo de cada carta: 250 × 350. Las figuras son de doble cabeza, unidas por una costura diagonal.
import { Card, CardSuit, MATERIAL, RANK_LABEL, Suit } from '../rules/engine';

// ───────────────────────── Palos ─────────────────────────

/** Pintas talladas, centradas en (0,0), ~21 unidades de alto. */
const PIP: Record<Suit, string> = {
  H: '<path d="M0,9.6 C-3,6 -10,1.6 -10,-4 C-10,-8 -7.2,-10 -4.6,-10 C-2.3,-10 -0.8,-8.7 0,-6.8 C0.8,-8.7 2.3,-10 4.6,-10 C7.2,-10 10,-8 10,-4 C10,1.6 3,6 0,9.6 Z"/><path class="pcut" d="M-7,-4.4 C-7,-6.6 -5.7,-7.9 -3.9,-7.9"/>',
  S: '<path d="M0,-10.2 C3,-6 10,-2 10,3.2 C10,6.6 7.4,8.4 5,8.4 C3.2,8.4 1.8,7.6 0.9,6.2 C1.2,8 2,9.3 3.7,10.2 L-3.7,10.2 C-2,9.3 -1.2,8 -0.9,6.2 C-1.8,7.6 -3.2,8.4 -5,8.4 C-7.4,8.4 -10,6.6 -10,3.2 C-10,-2 -3,-6 0,-10.2 Z"/><path class="pcut" d="M-6.9,3.6 C-6.7,0.9 -4.7,-1.4 -2.3,-3.6"/>',
  D: '<path d="M0,-10.6 C2,-6.5 5,-3 8.2,0 C5,3 2,6.5 0,10.6 C-2,6.5 -5,3 -8.2,0 C-5,-3 -2,-6.5 0,-10.6 Z"/><path class="pcut" d="M-4.9,-0.3 C-3.3,-2.2 -1.9,-4.1 -0.9,-6.2"/>',
  C: '<circle cx="0" cy="-5.3" r="4.8"/><circle cx="-5.5" cy="1.6" r="4.8"/><circle cx="5.5" cy="1.6" r="4.8"/><path d="M-2.2,-2 H2.2 V2.4 C1.3,6 2,8.9 3.7,10.2 H-3.7 C-2,8.9 -1.3,6 -2.2,2.4 Z"/><path class="pcut" d="M-2.9,-6.8 C-2.3,-8 -1.2,-8.7 0,-8.7"/><path class="pcut" d="M-8.5,0.5 C-8,-0.7 -7,-1.5 -5.8,-1.6"/><path class="pcut" d="M2.6,0.3 C3.1,-0.8 4.1,-1.5 5.3,-1.6"/>',
};

export function suitSvg(suit: Suit, cls = ''): string {
  return `<svg class="glyph s-${suit} ${cls}" viewBox="-11 -11.5 22 23" aria-hidden="true">${PIP[suit]}</svg>`;
}

const FILL: Record<Suit, string> = { S: 'ink', C: 'ink', H: 'rd', D: 'rd' };
const pipAt = (suit: Suit, x: number, y: number, scale: number, cls = FILL[suit], rot = 0) =>
  `<g transform="translate(${x} ${y})${rot ? ` rotate(${rot})` : ''} scale(${scale})" class="${cls}">${PIP[suit]}</g>`;

// ───────────────────────── Definiciones compartidas ─────────────────────────

const PAPER = '#f1ebdc';
const INK = '#151311';
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
    <pattern id="pat-S" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#2c5fa3"/><path d="M7,0 V14" stroke="${PAPER}" stroke-width="1.5"/><circle cx="2.6" cy="3.5" r="1.3" fill="${INK}"/><circle cx="11.4" cy="10.5" r="1.3" fill="${INK}"/></pattern>
    <pattern id="pat-H" width="24" height="16" patternUnits="userSpaceOnUse"><rect width="24" height="16" fill="#e2231a"/><path d="M0,0.8 H24 M0,8.8 H24 M6,0.8 V8.8 M18,8.8 V16.8" stroke="${PAPER}" stroke-width="1.7"/></pattern>
    <pattern id="pat-D" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#3fae9f"/><path d="M0,18 L18,0 M-2,2 L2,-2 M16,20 L20,16" stroke="${PAPER}" stroke-width="1.5"/><path d="M0,0 L18,18" stroke="${INK}" stroke-width="0.8" opacity="0.55"/></pattern>
    <pattern id="pat-C" width="22" height="18" patternUnits="userSpaceOnUse"><rect width="22" height="18" fill="#8d8b7e"/><circle cx="4" cy="5" r="1.4" fill="${INK}"/><circle cx="14" cy="3" r="0.9" fill="${INK}"/><circle cx="9" cy="12" r="1.6" fill="${INK}"/><circle cx="18" cy="13" r="1" fill="${INK}"/><path d="M0,17.2 H22" stroke="${PAPER}" stroke-width="1.3"/></pattern>
    <pattern id="pat-back" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0,20 L20,0 M0,0 L20,20" stroke="${PAPER}" stroke-width="1" opacity="0.5"/><rect x="8" y="8" width="4" height="4" fill="${PAPER}"/></pattern>
    <pattern id="pat-haz" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="20" height="20" fill="#f2b90f"/><rect width="10" height="20" fill="${INK}"/></pattern>
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
    <circle class="gd" cx="147" cy="120" r="6" stroke="#f1ebdc" stroke-width="2"/>
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
  const halves = (body: string, extra = '') => `
    <g clip-path="url(#half)" data-sx="${sx}" data-sy="1"><g${mirror}${extra}>${body}</g></g>
    <g transform="rotate(180 125 175)"><g clip-path="url(#half)" data-sx="${-sx}" data-sy="-1"><g${mirror}${extra}>${body}</g></g></g>`;
  return `
    <svg class="ly art still" viewBox="0 0 250 350" aria-hidden="true">
      <g filter="url(#rough)">
        <g clip-path="url(#inframe)">${halves(still)}</g>
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
    .map(([c, y], i) => `<g transform="translate(${X[c]} ${y})${y > 176 ? ' rotate(180)' : ''}"><g class="stamp" style="--i:${i}"><g class="pip" style="--i:${i}"><g class="${FILL[suit]}" transform="scale(${rank >= 7 ? 1.95 : 2.3})">${PIP[suit]}</g></g></g></g>`)
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
    <text class="banner-txt" x="123" y="307" text-anchor="middle" transform="rotate(-3.1 123 301)">${MATERIAL[suit]}</text>
    <g transform="translate(125 168)"><g class="stamp" style="--i:1"><g class="pip ace-pip" style="--i:0"><g class="${FILL[suit]}" transform="scale(4.6)">${PIP[suit]}</g></g></g></g>
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

const BACK = `
  <svg viewBox="0 0 250 350" aria-hidden="true">
    <rect width="250" height="350" fill="${INK}"/>
    <rect x="16" y="16" width="218" height="318" fill="url(#pat-back)"/>
    <rect x="16" y="16" width="218" height="20" fill="url(#pat-haz)"/><rect x="16" y="314" width="218" height="20" fill="url(#pat-haz)"/>
    <g filter="url(#rough)">
      <rect x="10" y="10" width="230" height="330" fill="none" stroke="${PAPER}" stroke-width="3"/>
      <path d="M125,84 L196,175 L125,266 L54,175 Z" fill="#e2231a" stroke="${PAPER}" stroke-width="4"/>
      <path d="M101,214 h48 v-24 h-8 v-24 h-8 v-26 h-16 v26 h-8 v24 h-8 Z" fill="${PAPER}"/>
      <path d="M125,140 l-5,22 l8,10 l-6,18 l7,10 l-3,14" fill="none" stroke="${INK}" stroke-width="2.4"/>
    </g>
  </svg>`;

// ───────────────────────── Carta ─────────────────────────

function corner(suit: CardSuit, rank: number, cls: string): string {
  const glyph = suit === 'X' ? '<span class="star-mini">★</span>' : suitSvg(suit);
  return `<div class="corner ${cls}${rank === 10 ? ' wide' : ''}"><b>${RANK_LABEL[rank]}</b>${glyph}</div>`;
}

export function cardEl(card: Card, opts: { faceDown?: boolean; tilt?: boolean } = {}): HTMLDivElement {
  ensureDefs();
  const el = document.createElement('div');
  const kind = card.suit === 'X' ? 'joker' : card.rank > 10 ? 'figure' : card.rank === 1 ? 'ace' : 'number';
  el.className = `card s-${card.suit} k-${kind}${opts.faceDown ? ' flipped' : ''}`;
  el.dataset.id = card.id;
  const art = card.suit === 'X' ? jokerArt() : card.rank > 10 ? figure(card.suit, card.rank) : card.rank === 1 ? aceArt(card.suit) : numberArt(card.suit, card.rank);
  el.innerHTML = `
    <div class="card-in">
      <div class="card-front">
        <div class="ly paper"></div>
        ${art}
        <div class="ly idx">${corner(card.suit, card.rank, 'tl')}${corner(card.suit, card.rank, 'br')}${card.plus ? `<div class="plus">+${card.plus}</div>` : ''}</div>
        <div class="ly grain"></div>
        <div class="ly glare"></div>
      </div>
      <div class="card-back">${BACK}</div>
    </div>`;
  if (opts.tilt !== false) attachTilt(el);
  return el;
}

export function backEl(): HTMLDivElement {
  ensureDefs();
  const el = document.createElement('div');
  el.className = 'card flipped';
  el.innerHTML = `<div class="card-in"><div class="card-front"><div class="ly paper"></div></div><div class="card-back">${BACK}</div></div>`;
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
