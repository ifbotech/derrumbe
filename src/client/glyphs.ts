// Emblemas linograbados para herramientas, cartas especiales y servicios de la ferretería.
// Cada uno se dibuja en una caja de 100 × 100 con las tintas de la baraja
// (.ink .pp .rd .gd .gl .ol .cut .thin) y pasa por el filtro de borde irregular.
const INK = '#151311';
const bar = (d: string, w = 8) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

export const GLYPH: Record<string, string> = {
  // ── herramientas ──
  piqueta: `<path class="ink" d="M45,44 L54,36 L86,84 L77,90 Z"/><path class="gl ol" d="M12,42 C28,14 62,10 88,26 C64,22 40,30 22,52 Z"/>`,
  cortavidrios: `<rect class="ink" x="44" y="58" width="12" height="36"/><path class="gl ol" d="M50,6 L78,32 L50,64 L22,32 Z"/><path class="thin" d="M22,32 H78 M36,19 L50,32 L64,19 M50,32 V62"/>`,
  paleta: `<path class="pp ol" d="M50,6 L82,48 L50,60 L18,48 Z"/><path class="thin" d="M50,14 V54"/><rect class="ink" x="45" y="58" width="10" height="14"/><rect class="rd ol" x="39" y="70" width="22" height="24" rx="4"/>`,
  maza: `<rect class="ink" x="45" y="36" width="10" height="58"/><rect class="ink" x="14" y="8" width="72" height="32" rx="3"/><path class="cut" d="M26,16 V32 M74,16 V32"/><rect class="gd ol" x="40" y="40" width="20" height="8"/>`,
  dinamita: `<rect class="rd ol" x="20" y="34" width="19" height="56"/><rect class="rd ol" x="40.5" y="34" width="19" height="56"/><rect class="rd ol" x="61" y="34" width="19" height="56"/><rect class="ink" x="15" y="52" width="70" height="11"/><path class="thin" d="M50,34 C50,18 64,24 66,12"/><path class="gd ol" d="M66,0 l4,7 l8,-2 l-5,7 l5,6 l-8,-1 l-4,8 l-3,-8 l-8,-1 l6,-6 Z"/>`,
  acido: `<path class="gl ol" d="M40,12 H60 V36 L84,80 C86,88 82,94 72,94 H28 C18,94 14,88 16,80 L40,36 Z"/><path class="ink" d="M29,62 H71 L81,81 C82,88 78,91 72,91 H28 C22,91 18,88 19,81 Z"/><circle class="pp" cx="42" cy="74" r="4.5"/><circle class="pp" cx="60" cy="82" r="3.2"/><circle class="pp" cx="56" cy="68" r="2.2"/><rect class="ink" x="34" y="6" width="32" height="8"/>`,
  taladro: `<path class="ink" d="M10,28 H60 V58 H44 V90 H24 V58 H10 Z"/><path class="pp ol" d="M60,35 H72 L94,43 L72,51 H60 Z"/><path class="thin" d="M66,35 L69,51 M73,36 L76,50"/><rect class="rd" x="16" y="35" width="24" height="9"/><path class="cut" d="M30,66 V82"/>`,
  andamio: `${bar('M22,8 V94 M78,8 V94 M22,58 H78 M22,90 H78 M22,28 L78,58 M78,58 L22,90', 7)}<rect class="gd ol" x="10" y="18" width="80" height="11"/>`,
  sacos: `<rect class="gd ol" x="8" y="62" width="40" height="28" rx="11"/><rect class="gd ol" x="52" y="62" width="40" height="28" rx="11"/><rect class="gd ol" x="29" y="34" width="42" height="28" rx="11"/><path class="thin" d="M17,71 h9 M61,71 h9 M38,43 h9"/><path class="ink" d="M44,20 l6,-12 l6,12 Z"/>`,
  botiquin: `<path class="thin" d="M36,28 V16 H64 V28"/><rect class="pp ol" x="12" y="28" width="76" height="60" rx="6"/><path class="rd" d="M42,38 H58 V50 H72 V66 H58 V78 H42 V66 H28 V50 H42 Z"/>`,
  metralla: `<path class="ink" d="M50,2 L58,36 L92,16 L66,46 L98,58 L62,60 L70,96 L50,66 L30,96 L38,60 L2,58 L34,46 L8,16 L42,36 Z"/><circle class="rd" cx="50" cy="50" r="11"/><circle class="pp" cx="50" cy="50" r="4"/>`,
  casco: `<path class="gd ol" d="M12,68 C12,30 30,14 50,14 C70,14 88,30 88,68 Z"/><path class="thin" d="M50,14 V66 M33,20 V66 M67,20 V66"/><rect class="ink" x="4" y="66" width="92" height="13" rx="3"/>`,
  encofrado: `<rect class="ink" x="10" y="10" width="80" height="80"/><path class="cut" d="M10,37 H90 M10,63 H90 M37,10 V90 M63,10 V90"/><rect class="gd" x="40" y="40" width="20" height="20"/><circle class="pp" cx="23" cy="23" r="3"/><circle class="pp" cx="77" cy="23" r="3"/><circle class="pp" cx="23" cy="77" r="3"/><circle class="pp" cx="77" cy="77" r="3"/>`,
  plomada: `<path class="thin" d="M50,2 V42"/><rect class="ink" x="28" y="36" width="44" height="10"/><path class="gd ol" d="M32,46 H68 L50,96 Z"/><path class="thin" d="M50,52 V84"/>`,
  sordina: `<path class="ink" d="M8,38 H32 L66,14 V86 L32,62 H8 Z"/><path class="cut" d="M40,40 V60"/>${bar('M76,34 C84,44 84,56 76,66', 6)}<path d="M12,12 L90,90" fill="none" stroke="#e30613" stroke-width="11"/>`,
  puntales: `${bar('M20,90 L44,22 M80,90 L56,22', 9)}<rect class="gd ol" x="10" y="8" width="80" height="15"/><rect class="ink" x="4" y="86" width="92" height="9"/>`,
  gemelos: `<circle class="ink" cx="31" cy="24" r="14"/><circle class="ink" cx="69" cy="24" r="14"/><path class="ink" d="M8,94 L16,44 H46 L52,94 Z M48,94 L54,44 H84 L92,94 Z"/><path class="cut" d="M50,46 V94"/><circle class="rd" cx="27" cy="22" r="3.5"/><circle class="rd" cx="65" cy="22" r="3.5"/>`,
  cinta: `<rect class="ink" x="4" y="54" width="92" height="22" rx="11"/><circle class="pp" cx="20" cy="65" r="5.5"/><circle class="pp" cx="50" cy="65" r="5.5"/><circle class="pp" cx="80" cy="65" r="5.5"/><rect class="rd ol" x="14" y="30" width="22" height="22"/><rect class="gd ol" x="46" y="24" width="28" height="28"/>${bar('M28,80 V94 M72,80 V94', 6)}`,
  cincel: `<rect class="rd ol" x="36" y="6" width="28" height="34" rx="4"/><path class="pp ol" d="M41,40 H59 V72 L50,96 L41,72 Z"/><path class="thin" d="M50,46 V72"/>`,
  estandarte: `<rect class="ink" x="16" y="4" width="8" height="92"/><path class="rd ol" d="M24,10 H88 L72,32 L88,54 H24 Z"/><path class="cut" d="M34,22 H60 M34,42 H60"/>`,
  dados: `<rect class="pp ol" x="8" y="34" width="46" height="46" rx="6" transform="rotate(-10 31 57)"/><rect class="rd ol" x="46" y="18" width="46" height="46" rx="6" transform="rotate(12 69 41)"/><circle class="ink" cx="22" cy="50" r="4.5"/><circle class="ink" cx="38" cy="66" r="4.5"/><circle class="pp" cx="60" cy="32" r="4"/><circle class="pp" cx="70" cy="42" r="4"/><circle class="pp" cx="80" cy="52" r="4"/>`,
  hucha: `<circle class="gd ol" cx="50" cy="20" r="14"/><path class="thin" d="M50,12 V28"/><rect class="ink" x="10" y="36" width="80" height="56" rx="7"/><rect class="pp" x="34" y="46" width="32" height="7"/><path class="cut" d="M22,64 H78 M22,78 H78"/>`,
  // ── cartas especiales ──
  barreno: `<rect class="ink" x="34" y="2" width="32" height="12"/><path class="pp ol" d="M42,14 H58 L63,26 L37,36 L63,46 L37,56 L63,66 L50,96 L37,66 Z"/>`,
  martillo: `<rect class="ink" x="14" y="6" width="72" height="13" rx="6"/><rect class="ink" x="32" y="19" width="36" height="42"/><path class="cut" d="M39,30 H61 M39,40 H61 M39,50 H61"/><path class="pp ol" d="M43,61 H57 V78 L50,96 L43,78 Z"/>`,
  saboteador: `<path d="M2,72 H98" fill="none" stroke="${INK}" stroke-width="6" stroke-dasharray="34 12"/><path class="pp ol" d="M28,6 L57,62 L46,68 Z M72,6 L43,62 L54,68 Z"/><circle class="rd ol" cx="38" cy="82" r="12"/><circle class="rd ol" cx="62" cy="82" r="12"/>`,
  palanca: `${bar('M24,92 L62,22 C68,8 86,10 84,26', 11)}<path class="rd" d="M16,98 l11,-21 l10,5 l-11,21 Z"/>`,
  grua: `${bar('M24,94 V14 H88 M24,40 L50,14', 7)}<path class="thin" d="M76,14 V50"/><rect class="gd ol" x="66" y="50" width="20" height="16"/><rect class="ink" x="8" y="86" width="44" height="9"/>`,
  mordaza: `<path class="gd ol" d="M50,8 C72,8 76,36 80,64 H20 C24,36 28,8 50,8 Z"/><rect class="ink" x="12" y="62" width="76" height="11"/><circle class="ink" cx="50" cy="84" r="9"/><path d="M6,36 H94" fill="none" stroke="${INK}" stroke-width="14"/><path class="cut" d="M14,36 H86" stroke-dasharray="5 7"/>`,
  clavos: `<path class="ink" d="M47,96 L43,28 H57 L53,96 Z M16,88 L31,24 L43,28 L26,92 Z M84,88 L69,24 L57,28 L74,92 Z"/><rect class="ink" x="35" y="18" width="30" height="11"/><rect class="ink" x="19" y="13" width="28" height="11" transform="rotate(14 33 18)"/><rect class="ink" x="53" y="13" width="28" height="11" transform="rotate(-14 67 18)"/>`,
  chatarrero: `<path class="rd ol" d="M16,10 H40 V52 C40,62 60,62 60,52 V10 H84 V54 C84,92 16,92 16,54 Z"/><rect class="pp ol" x="16" y="10" width="24" height="15"/><rect class="pp ol" x="60" y="10" width="24" height="15"/>`,
  pico: `<path class="ink" d="M45,44 L54,36 L86,84 L77,90 Z"/><path class="gd ol" d="M12,42 C28,14 62,10 88,26 C64,22 40,30 22,52 Z"/><circle class="gd ol" cx="26" cy="80" r="11"/><path class="thin" d="M26,74 V86"/>`,
  botica: `<rect class="ink" x="39" y="4" width="22" height="15"/><path class="pp ol" d="M33,19 H67 V33 L78,46 V94 H22 V46 L33,33 Z"/><path class="rd" d="M44,52 H56 V63 H67 V75 H56 V86 H44 V75 H33 V63 H44 Z"/>`,
  gemelo: `<rect class="pp ol" x="14" y="12" width="42" height="58" transform="rotate(-10 35 41)"/><rect class="rd ol" x="42" y="30" width="42" height="58" transform="rotate(8 63 59)"/><path class="cut" d="M52,50 l22,3 M50,62 l22,3 M49,74 l14,2"/>`,
  nitro: `<path class="rd ol" d="M50,4 C66,34 82,48 82,66 C82,84 67,96 50,96 C33,96 18,84 18,66 C18,48 34,34 50,4 Z"/><path class="pp" d="M55,34 L37,64 H50 L43,86 L65,56 H52 Z"/>`,
  bola: `<path d="M50,2 V38" fill="none" stroke="${INK}" stroke-width="6" stroke-dasharray="7 5"/><circle class="ink" cx="50" cy="66" r="30"/><path class="cut" d="M30,58 C34,45 45,40 55,40"/><circle class="rd" cx="62" cy="76" r="5"/>`,
  hormigonera: `<path class="gd ol" d="M20,30 L64,12 L86,44 L46,68 Z"/><path class="thin" d="M35,25 L60,56 M50,19 L73,48"/>${bar('M30,90 L46,64 M70,90 L56,60', 7)}<circle class="ink" cx="30" cy="88" r="9"/><circle class="ink" cx="70" cy="88" r="9"/>`,
  cemento: `<path class="pp ol" d="M20,12 H80 L86,92 H14 Z"/><path class="ink" d="M20,12 H80 L81,28 H19 Z"/><path class="thin" d="M30,46 H70 M30,59 H70 M30,72 H56"/>`,
  sierra: `<path class="ink" d="M50,4 L58,19 L75,11 L75,28 L92,30 L81,44 L96,54 L81,61 L88,78 L71,75 L67,92 L54,81 L42,94 L38,77 L21,82 L26,65 L8,59 L21,48 L8,36 L26,34 L23,17 L40,22 Z"/><circle class="pp" cx="50" cy="50" r="17"/><circle class="ink" cx="50" cy="50" r="5.5"/>`,
  // ── servicios ──
  forja: `<path class="ink" d="M10,28 H74 C86,28 92,36 94,44 H70 C66,54 60,58 56,60 V72 H72 V88 H20 V72 H36 V60 C24,56 14,46 10,28 Z"/><path class="cut" d="M20,35 H70"/><path class="gd ol" d="M40,4 l4,8 l9,-2 l-6,7 l6,7 l-9,-2 l-4,8 l-4,-8 l-9,2 l6,-7 l-6,-7 l9,2 Z"/>`,
  plano: `<rect x="12" y="14" width="76" height="72" fill="#2c5fa3" class="ol"/><path class="cut" d="M24,72 V40 H50 V72 M50,54 H76 V72 M18,72 H82 M24,28 H44"/>`,
  reparacion: `<path class="thin" d="M36,28 V16 H64 V28"/><rect class="rd ol" x="12" y="28" width="76" height="60" rx="6"/><path class="pp" d="M42,38 H58 V50 H72 V66 H58 V78 H42 V66 H28 V50 H42 Z"/>`,
  comodin: `<path class="rd ol" d="M50,4 L63,36 L96,36 L69,56 L79,90 L50,69 L21,90 L31,56 L4,36 L37,36 Z"/>`,
  retirar: `<path class="rd ol" d="M50,4 C58,26 82,36 78,64 C76,84 63,96 50,96 C37,96 24,84 22,64 C20,48 31,42 33,29 C42,36 44,45 44,51 C50,40 52,24 50,4 Z"/><path class="gd" d="M50,54 C58,64 63,71 61,80 C59,88 54,92 50,92 C46,92 41,88 39,80 C37,71 44,65 50,54 Z"/>`,
  incognita: `<path class="ink" d="M30,34 C30,14 42,6 52,6 C66,6 76,16 76,30 C76,42 68,48 62,54 C58,58 56,62 56,70 H42 C42,58 46,52 52,46 C57,41 61,37 61,30 C61,23 57,19 51,19 C45,19 43,24 43,34 Z"/><rect class="rd" x="41" y="78" width="16" height="16"/>`,
  sobre: `<rect class="pp ol" x="8" y="22" width="84" height="60"/><path class="thin" d="M8,22 L50,58 L92,22"/><circle class="rd ol" cx="50" cy="60" r="10"/>`,
};

export function glyphSvg(id: string, cls = ''): string {
  return `<svg class="art lino emblem ${cls}" viewBox="0 0 100 100" aria-hidden="true"><g filter="url(#rough)">${GLYPH[id] ?? GLYPH.comodin}</g></svg>`;
}
