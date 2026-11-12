// Emblemas linograbados de CORONA ROTA: las reliquias, las cartas especiales y los iconos de servicio
// (Mercado clandestino, Mesa de lacre, la Orden, el mapa). Cada uno se dibuja en una caja de 100 × 100
// con las tintas de la baraja (.ink .pp .rd .gd .gl .ol .cut .thin) y pasa por el filtro de borde
// irregular. Un solo objeto por emblema, sin texto, con silueta cerrada que se lea a 24 px; la forja
// (npm run forja -- herramientas) exige a las reliquias entre 22 y 58 % de tinta y silueta entera a 24 px.
// Las claves son los `id` de los datos y no cambian aunque nombren la versión vieja.
const INK = '#181614';
const GOLD = '#c98a1e';
const VERD = '#1d544b';
const NIGHT = '#1f4e63';
const bar = (d: string, w = 8) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line = (d: string, color: string, w: number) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
/** Daga en alzado con el puño en (0,0) y la hoja hacia arriba. */
const DAGGER = `<path class="ink" d="M-6,0 V-44 L0,-58 L6,-44 V0 Z"/><path class="cut" d="M0,-6 V-44"/><path class="gd ol" d="M-17,0 H17 V7 H-17 Z"/><rect class="ink" x="-4" y="7" width="8" height="17"/><circle class="ink" cx="0" cy="28" r="6"/>`;
/** Pinta de picas centrada en (0,0), unas 20 unidades de alto. */
const SPADE = 'M0,-10 C3,-6 10,-2 10,3 C10,7 7,8 5,8 C3,8 2,7 1,6 L3,10 H-3 L-1,6 C-2,7 -3,8 -5,8 C-7,8 -10,7 -10,3 C-10,-2 -3,-6 0,-10 Z';
const HEART = 'M0,9 C-3,6 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.3,-10 -0.8,-8.7 0,-6.8 C0.8,-8.7 2.3,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,6 0,9 Z';
/** Corona de cinco puntas en una caja 0..60 × 0..34. */
const CROWN = 'M0,34 V8 L12,20 L22,2 L30,16 L38,2 L48,20 L60,8 V34 Z';
const DIAMOND = 'M0,-11 L8,0 L0,11 L-8,0 Z';
/** Pinta de un palo centrada en (0,0), unas 20 unidades, con su tinta: ♠ y ♣ en tinta, ♥ en lacre, ♦ en ámbar. */
const PIP: Record<string, string> = {
  S: `<path class="ink" d="${SPADE}"/>`,
  H: `<path class="rd" d="${HEART}"/>`,
  D: `<path class="gd ol" d="${DIAMOND}"/>`,
  C: `<circle class="ink" cx="0" cy="-5" r="5"/><circle class="ink" cx="-5.5" cy="3" r="5"/><circle class="ink" cx="5.5" cy="3" r="5"/><path class="ink" d="M-1.5,2 H1.5 L3,11 H-3 Z"/>`,
};
/**
 * Abanico de naipes que giran sobre un mismo punto, cada uno con la pinta de su palo arriba. `hueco`
 * deja el último sitio con el naipe que falta, en trazo discontinuo. `paso` es el giro entre naipes.
 */
const fan = (palos: string, paso = 15, hueco = false) => {
  const n = palos.length + (hueco ? 1 : 0);
  return Array.from({ length: n }, (_, i) => {
    const a = (i - (n - 1) / 2) * paso;
    if (hueco && i === n - 1) return `<rect x="36" y="24" width="28" height="44" rx="3" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="5 4" transform="rotate(${a} 50 96)"/>`;
    return `<g transform="rotate(${a} 50 96)"><rect class="pp ol" x="36" y="24" width="28" height="44" rx="3"/><g transform="translate(50 38) scale(0.78)">${PIP[palos[i]]}</g><path class="thin" d="M41,56 H59"/></g>`;
  }).join('') + `<path class="ink" d="M30,74 C38,70 62,70 70,74 L64,98 H36 Z"/><path class="cut" d="M40,82 H60"/>`;
};

export const GLYPH: Record<string, string> = {
  // ───────────── reliquias · El Arsenal ─────────────
  // Daga de Picas: daga recta con el pomo en forma de pica
  piqueta: `<path class="pp ol" d="M43,44 H57 V80 L50,97 L43,80 Z"/><path class="thin" d="M50,48 V86"/><path class="gd ol" d="M24,35 H76 V44 H24 Z"/><rect class="ink" x="44" y="22" width="12" height="14"/><g transform="translate(50 13) scale(1.45)"><path class="ink" d="${SPADE}"/></g>`,
  // Anillo de Diamantes: aro de oro con una gema tallada en rombo
  cortavidrios: `<circle cx="50" cy="64" r="26" fill="none" stroke="${INK}" stroke-width="15"/><circle cx="50" cy="64" r="26" fill="none" stroke="${GOLD}" stroke-width="8"/><path class="ink" d="M36,36 H64 L59,46 H41 Z"/><path class="gl ol" d="M50,2 L72,22 L50,44 L28,22 Z"/><path class="thin" d="M28,22 H72 M50,2 V44 M39,12 L50,22 L61,12"/>`,
  // Cáliz de Corazones: cáliz con un corazón grabado en la copa
  paleta: `<rect class="ink" x="16" y="6" width="68" height="8"/><path class="pp ol" d="M20,14 H80 C80,40 68,54 50,56 C32,54 20,40 20,14 Z"/><g transform="translate(50 31) scale(1.3)"><path class="rd" d="${HEART}"/></g><rect class="ink" x="44" y="55" width="12" height="24"/><rect class="gd ol" x="38" y="64" width="24" height="7"/><path class="pp ol" d="M26,94 C28,84 38,79 50,79 C62,79 72,84 74,94 Z"/>`,
  // Maza de Tréboles: maza con la cabeza en forma de trébol
  maza: `<rect class="ink" x="45" y="50" width="10" height="40"/><circle class="gd ol" cx="50" cy="92" r="6"/><path class="cut" d="M46,62 L54,66 M46,72 L54,76"/><circle class="ink" cx="50" cy="18" r="15"/><circle class="ink" cx="33" cy="36" r="15"/><circle class="ink" cx="67" cy="36" r="15"/><rect class="ink" x="44" y="28" width="12" height="16"/><path class="cut" d="M44,12 C45,8 48,6 51,6 M27,32 C28,28 31,26 34,26 M61,32 C62,28 65,26 68,26"/><rect class="gd ol" x="38" y="46" width="24" height="8"/>`,
  // Estilete: estilete fino, punta abajo
  cincel: `<circle class="ink" cx="50" cy="9" r="8"/><rect class="ink" x="44" y="14" width="12" height="26"/><path class="cut" d="M45,20 L55,24 M45,28 L55,32"/><path class="gd ol" d="M32,38 H68 V47 H32 Z"/><circle class="gd ol" cx="30" cy="42" r="5"/><circle class="gd ol" cx="70" cy="42" r="5"/><path class="ink" d="M44,47 H56 L50,98 Z"/><path class="cut" d="M50,52 V84"/>`,
  // Dagas gemelas: dos dagas cruzadas en aspa
  gemelos: `<g transform="translate(41.5 58.5) rotate(45)">${DAGGER}</g><g transform="translate(58.5 58.5) rotate(-45)">${DAGGER}</g>`,
  // Escalinata: tramo de cinco escalones de piedra
  cinta: `<path class="ink" d="M6,94 V78 H24 V62 H42 V46 H60 V30 H78 V14 H94 V94 Z"/><path class="cut heavy" d="M10,86 H90 M28,70 H90 M46,54 H90 M64,38 H90 M82,22 H90 M18,86 V94 M54,86 V94 M36,70 V78 M72,70 V78 M56,54 V62 M84,38 V46"/>`,
  // Pavés: escudo alto y rectangular, de pie
  sacos: `<path class="pp ol" d="M22,8 Q50,1 78,8 V86 Q50,97 22,86 Z"/><path class="rd" d="M42,5 H58 V93 H42 Z"/><path class="thin" d="M30,16 V80 M70,16 V80"/><circle class="ink" cx="30" cy="12" r="3.5"/><circle class="ink" cx="70" cy="12" r="3.5"/><circle class="ink" cx="30" cy="86" r="3.5"/><circle class="ink" cx="70" cy="86" r="3.5"/><circle class="gd ol" cx="50" cy="48" r="9"/>`,
  // Bálsamo: frasco panzudo con tapón de corcho
  botiquin: `<rect class="gd ol" x="39" y="3" width="22" height="15" rx="3"/><path class="pp ol" d="M42,18 H58 V30 C76,36 86,50 86,64 C86,84 70,96 50,96 C30,96 14,84 14,64 C14,50 24,36 42,30 Z"/><path class="rd" d="M17,62 H83 C82,80 68,92 50,92 C32,92 18,80 17,62 Z"/><path class="cut" d="M26,72 C27,79 31,84 36,86"/><path class="thin" d="M42,30 H58"/>`,
  // Broquel: escudo pequeño y redondo con umbo
  encofrado: `<circle class="pp ol" cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="33" fill="none" stroke="${INK}" stroke-width="5"/><path class="thin" d="M50,6 V30 M50,70 V94 M6,50 H30 M70,50 H94 M19,19 L36,36 M81,19 L64,36 M19,81 L36,64 M81,81 L64,64"/><circle class="gd ol" cx="50" cy="50" r="14"/><circle class="ink" cx="50" cy="50" r="4"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<circle class="ink" cx="${(50 + 39 * Math.cos((a + 22.5) * Math.PI / 180)).toFixed(1)}" cy="${(50 + 39 * Math.sin((a + 22.5) * Math.PI / 180)).toFixed(1)}" r="3"/>`).join('')}`,
  // Yelmo: yelmo cerrado con visera de rendija
  casco: `<path class="pp ol" d="M18,92 V46 C18,20 32,6 50,6 C68,6 82,20 82,46 V92 Z"/><rect class="ink" x="18" y="34" width="64" height="22"/><rect class="pp" x="26" y="42" width="48" height="5"/><path class="thin" d="M50,8 V34 M50,56 V92"/>${[30, 40, 60, 70].map((x) => `<circle class="ink" cx="${x}" cy="70" r="3"/><circle class="ink" cx="${x}" cy="80" r="3"/>`).join('')}<path class="ink" d="M16,88 H84 V96 H16 Z"/>`,
  // Baraja de reserva: mazo de naipes atado con una cinta
  puntales: `<rect class="pp ol" x="16" y="18" width="54" height="74" rx="5" transform="rotate(-8 43 55)"/><rect class="pp ol" x="28" y="10" width="54" height="76" rx="5"/><path class="thin" d="M32,90 H84 M34,94 H82"/><rect class="rd" x="51" y="10" width="8" height="76"/><rect class="rd" x="28" y="45" width="54" height="8"/><path class="rd ol" d="M55,49 C44,36 36,42 42,50 C36,58 44,62 55,49 C66,36 74,42 68,50 C74,58 66,62 55,49 Z"/><g transform="translate(40 24) scale(0.7)"><path class="ink" d="${SPADE}"/></g>`,
  // Bolsa de monedas: bolsa de cuero atada, con una moneda asomando
  hucha: `<circle class="gd ol" cx="62" cy="13" r="10"/><path class="pp ol" d="M34,22 L26,6 L40,14 L50,4 L58,14 L74,8 L66,22 Z"/><path class="pp ol" d="M36,30 C20,40 12,58 14,74 C16,90 30,96 50,96 C70,96 84,90 86,74 C88,58 80,40 64,30 Z"/><path d="M50,32 C66,34 84,52 84,74 C82,88 70,94 50,94 Z" fill="url(#hatch-ink)"/><path class="ink" d="M30,21 H70 L64,33 H36 Z"/><path class="rd ol" d="M48,26 L36,44 L44,46 Z M52,26 L62,46 L56,48 Z"/><circle class="gd ol" cx="36" cy="72" r="9"/>`,
  // Lanza: lanza de punta ancha, en diagonal
  taladro: `<g transform="rotate(26 50 52)"><path class="ink" d="M50,0 C61,12 63,26 57,38 H43 C37,26 39,12 50,0 Z"/><path class="cut heavy" d="M50,8 V32"/><rect class="ink" x="45" y="40" width="10" height="56"/><rect class="gd ol" x="41" y="36" width="18" height="9"/><path class="rd ol" d="M45,47 L20,50 L28,56 L20,63 L45,61 Z"/><circle class="ink" cx="50" cy="96" r="7"/></g>`,
  // Estandarte: banderín de dos puntas en un asta
  estandarte: `<rect class="ink" x="14" y="10" width="8" height="88"/><circle class="gd ol" cx="18" cy="8" r="6"/><path class="rd ol" d="M22,14 H92 L76,36 L92,58 H22 Z"/><path class="cut" d="M32,24 H66 M32,48 H66"/><circle class="pp ol" cx="44" cy="36" r="7"/>`,
  // Dados cargados: dos dados juntos, uno inclinado
  dados: `<rect class="pp ol" x="8" y="36" width="46" height="46" rx="6" transform="rotate(-10 31 59)"/><rect class="rd ol" x="46" y="18" width="46" height="46" rx="6" transform="rotate(12 69 41)"/><circle class="ink" cx="20" cy="50" r="5"/><circle class="ink" cx="31" cy="60" r="5"/><circle class="ink" cx="42" cy="70" r="5"/><circle class="pp" cx="58" cy="30" r="4.5"/><circle class="pp" cx="80" cy="34" r="4.5"/><circle class="pp" cx="56" cy="50" r="4.5"/><circle class="pp" cx="78" cy="54" r="4.5"/>`,
  // Barril de pólvora: barril con una mecha encendida
  dinamita: `<path class="pp ol" d="M20,34 C15,52 15,78 20,96 H80 C85,78 85,52 80,34 Z"/><path class="thin" d="M34,34 C31,54 31,76 34,96 M50,34 V96 M66,34 C69,54 69,76 66,96"/><rect class="ink" x="16" y="42" width="68" height="8"/><rect class="ink" x="15" y="62" width="70" height="8"/><rect class="ink" x="16" y="82" width="68" height="8"/><ellipse class="ink" cx="50" cy="34" rx="30" ry="6"/>${line('M50,30 C50,18 62,22 64,12', INK, 3.5)}<path class="gd ol" d="M66,0 l4,7 l8,-2 l-5,7 l5,6 l-8,-1 l-4,8 l-3,-8 l-8,-1 l6,-6 Z"/>`,
  // Gota de veneno: frasco estrecho con una gota cayendo
  acido: `<rect class="ink" x="23" y="4" width="18" height="10"/><path class="pp ol" d="M26,14 H38 V36 C46,42 50,52 50,64 V86 C50,92 46,96 40,96 H24 C18,96 14,92 14,86 V64 C14,52 18,42 26,36 Z"/><path fill="${VERD}" d="M17,62 H47 V86 C47,90 44,93 40,93 H24 C20,93 17,90 17,86 Z"/><path class="cut" d="M22,68 V84"/><path fill="${VERD}" class="ol" d="M76,40 C82,52 90,60 90,72 C90,82 84,88 76,88 C68,88 62,82 62,72 C62,60 70,52 76,40 Z"/><path class="cut" d="M68,72 C68,66 70,62 73,58"/><circle fill="${VERD}" cx="76" cy="24" r="5"/>`,
  // Guantelete: guantelete abierto, palma al frente
  andamio: `<rect class="ink" x="34" y="12" width="9" height="40" rx="4"/><rect class="ink" x="45" y="5" width="9" height="46" rx="4"/><rect class="ink" x="56" y="9" width="9" height="44" rx="4"/><rect class="ink" x="67" y="18" width="9" height="38" rx="4"/><path class="cut" d="M35,24 H42 M35,36 H42 M46,18 H53 M46,32 H53 M57,22 H64 M57,36 H64 M68,30 H75 M68,42 H75"/><rect class="ink" x="14" y="44" width="9" height="30" rx="4" transform="rotate(-40 18 59)"/><path class="pp ol" d="M30,48 H78 V70 C78,80 72,84 66,84 H40 C34,84 30,80 30,72 Z"/><path class="thin" d="M40,58 C48,64 60,64 68,58"/><path class="gd ol" d="M32,82 H76 L80,97 H28 Z"/>`,
  // Manga doble: manga de jubón con dos naipes asomando
  pasarela: `<rect class="pp ol" x="58" y="10" width="28" height="40" rx="3" transform="rotate(-16 72 30)"/><g transform="translate(70 28) scale(0.8)"><path class="ink" d="${SPADE}"/></g><rect class="pp ol" x="62" y="40" width="28" height="40" rx="3" transform="rotate(10 76 60)"/><g transform="translate(76 58) scale(0.8)"><path class="rd" d="${HEART}"/></g><path class="rd ol" d="M4,30 C22,18 40,22 54,32 L60,72 C42,82 20,82 4,76 Z"/><path class="cut" d="M14,38 C26,34 38,38 46,44 M14,56 C26,54 38,56 50,60"/><path class="pp ol" d="M50,30 L60,24 L64,32 L72,30 L72,78 L64,76 L60,82 L56,74 Z"/>`,
  // Máscara de traidor: máscara veneciana de media cara
  contrapeso: `<path class="gd ol" d="M48,36 C42,24 46,10 58,4 C56,16 62,22 56,34 Z"/><path class="ink" d="M4,38 C20,26 36,28 50,36 C64,28 80,26 96,38 C94,58 82,68 66,64 C58,62 54,56 50,52 C46,56 42,62 34,64 C18,68 6,58 4,38 Z"/><ellipse class="pp" cx="30" cy="45" rx="11" ry="6.5"/><ellipse class="pp" cx="70" cy="45" rx="11" ry="6.5"/><path class="cut" d="M10,40 C20,34 32,34 40,38 M60,38 C68,34 80,34 90,40"/><path class="rd ol" d="M88,60 L92,62 L82,97 L77,96 Z"/>`,
  // Pócima de sueño: frasco redondo con una luna creciente
  sordina: `<rect class="ink" x="40" y="2" width="20" height="10"/><path class="pp ol" d="M42,12 H58 V32 C74,37 84,50 84,64 C84,82 68,96 50,96 C32,96 16,82 16,64 C16,50 26,37 42,32 Z"/><path fill="${NIGHT}" d="M19,62 H81 C81,80 67,93 50,93 C33,93 19,80 19,62 Z"/><path class="pp" d="M56,68 C48,70 44,78 48,86 C40,84 36,76 40,70 C42,66 48,64 56,68 Z"/><circle class="pp" cx="66" cy="74" r="2.5"/><circle class="pp" cx="30" cy="70" r="2"/>`,
  // Llave maestra: llave grande de paletón labrado
  plano_maestro: `${bar('M34,34 L82,82', 10)}<circle class="ink" cx="24" cy="24" r="12"/><circle class="ink" cx="36" cy="14" r="9"/><circle class="ink" cx="14" cy="36" r="9"/><circle class="pp" cx="24" cy="24" r="5"/><path class="gd ol" d="M36,30 L44,38 L38,44 L30,36 Z"/><path class="ink" d="M76,70 L88,58 L94,64 L88,70 L94,76 L82,88 Z"/><path class="cut" d="M84,66 L88,70"/>`,
  // ───────────── reliquias · Mano precisa ─────────────
  // Péndulo: péndulo colgando de un hilo
  plomada: `<rect class="ink" x="20" y="4" width="60" height="9"/><path class="thin" d="M50,13 V58"/><circle class="gd ol" cx="50" cy="72" r="20"/><circle class="ink" cx="50" cy="72" r="7"/><path class="cut" d="M38,66 C40,60 44,58 48,57"/>${line('M14,58 C18,74 26,86 36,94 M86,58 C82,74 74,86 64,94', INK, 4)}`,
  // Balanza: balanza de dos platos, nivelada
  nivel: `<path class="ink" d="M30,96 L36,84 H64 L70,96 Z"/><rect class="ink" x="46" y="16" width="8" height="70"/><circle class="gd ol" cx="50" cy="12" r="7"/><rect class="ink" x="8" y="24" width="84" height="7"/><path class="thin" d="M14,31 L6,58 M14,31 L26,58 M86,31 L74,58 M86,31 L94,58"/><path class="gd ol" d="M2,58 H30 C30,68 24,72 16,72 C8,72 2,68 2,58 Z M70,58 H98 C98,68 92,72 84,72 C76,72 70,68 70,58 Z"/>`,
  // Ganzúa: ganzúa de punta curva
  tiralineas: `<circle cx="50" cy="14" r="10" fill="none" stroke="${INK}" stroke-width="7"/><rect class="ink" x="40" y="24" width="20" height="30" rx="3"/><path class="cut" d="M42,32 H58 M42,40 H58 M42,48 H58"/><rect class="gd ol" x="38" y="52" width="24" height="6"/>${bar('M50,58 V84 C50,94 42,96 36,90', 7)}`,
  // Compás: compás abierto en V invertida
  calibre: `<path class="ink" d="M46,16 L54,16 L28,94 L20,94 Z"/><path class="ink" d="M46,16 L54,16 L80,94 L72,94 Z"/><path class="rd" d="M76,82 L84,82 L82,96 Z"/>${line('M26,72 C40,80 60,80 74,72', INK, 4)}<circle class="gd ol" cx="50" cy="14" r="10"/><circle class="ink" cx="50" cy="14" r="3.5"/><rect class="ink" x="46" y="0" width="8" height="6"/>`,
  // Tijeras de sastre: tijeras abiertas
  cizalla: `<path class="pp ol" d="M14,6 L60,56 L52,64 L8,16 Z"/><path class="pp ol" d="M86,6 L40,56 L48,64 L92,16 Z"/><path class="thin" d="M18,14 L54,54 M82,14 L46,54"/>${bar('M45,63 L33,76 M55,63 L67,76', 7)}<circle class="ink" cx="50" cy="59" r="7"/><circle class="rd ol" cx="29" cy="84" r="12"/><circle class="rd ol" cx="71" cy="84" r="12"/><circle class="pp" cx="29" cy="84" r="5"/><circle class="pp" cx="71" cy="84" r="5"/>`,
  // ───────────── reliquias · Eco y repetición ─────────────
  // Collar roto: collar partido con cuentas cayendo
  metralla: `${[180, 165, 150, 135, 120, 105, 90, 75, 60, 45, 30].map((a) => `<circle class="ink" cx="${(50 + 38 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(28 + 46 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="7.5"/>`).join('')}<circle class="ink" cx="12" cy="14" r="7"/><path class="rd ol" d="M50,78 L60,88 L50,99 L40,88 Z"/><circle class="gd ol" cx="88" cy="46" r="6"/><circle class="gd ol" cx="92" cy="66" r="5"/><circle class="gd ol" cx="84" cy="84" r="5"/>`,
  // Campana: campana de bronce con badajo
  percutor: `<path class="ink" d="M42,4 H58 V14 H42 Z"/><path class="gd ol" d="M50,12 C30,12 24,28 24,48 C24,64 18,72 12,80 H88 C82,72 76,64 76,48 C76,28 70,12 50,12 Z"/><path class="cut heavy" d="M34,28 C32,40 32,52 30,64 M26,58 H74"/><rect class="ink" x="10" y="78" width="80" height="7"/><circle class="ink" cx="50" cy="92" r="7"/>`,
  // Cuerno de guerra: cuerno curvo con boquilla
  resonador: `${line('M14,22 C26,4 58,2 72,26', INK, 3.5)}<path class="ink" d="M6,26 C14,68 52,90 88,64 L74,30 C58,54 30,50 16,20 Z"/><path class="cut heavy" d="M24,42 L33,34 M44,64 L50,52 M64,72 L66,58"/><ellipse class="pp ol" cx="82" cy="47" rx="7" ry="18" transform="rotate(-24 82 47)"/><path class="gd ol" d="M2,18 L16,12 L20,24 L6,30 Z"/>`,
  // Espejo de mano: espejo de mano ovalado
  diapason: `<rect class="ink" x="45" y="66" width="10" height="24"/><circle class="gd ol" cx="50" cy="92" r="6"/><ellipse cx="50" cy="38" rx="28" ry="33" fill="none" stroke="${INK}" stroke-width="13"/><ellipse cx="50" cy="38" rx="28" ry="33" fill="none" stroke="${GOLD}" stroke-width="6"/><ellipse class="gl" cx="50" cy="38" rx="21" ry="26"/><path class="cut" d="M38,30 L52,18 M40,44 L60,26"/>`,
  // Tambor de guerra: tambor con dos baquetas cruzadas encima
  vibrador: `${bar('M18,8 L66,40 M82,8 L34,40', 6)}<circle class="pp ol" cx="18" cy="8" r="6"/><circle class="pp ol" cx="82" cy="8" r="6"/><path class="rd ol" d="M14,46 V84 C14,92 86,92 86,84 V46 Z"/><path class="cut" d="M14,52 L28,82 L42,52 L56,82 L70,52 L84,82"/><ellipse class="pp ol" cx="50" cy="46" rx="36" ry="9"/><path d="M14,82 C14,90 86,90 86,82" fill="none" stroke="${INK}" stroke-width="6"/>`,
  // Anillo de sello: anillo de sello con el chatón plano
  timbre: `<circle cx="50" cy="68" r="24" fill="none" stroke="${INK}" stroke-width="10"/><circle cx="50" cy="68" r="24" fill="none" stroke="${GOLD}" stroke-width="4"/><path class="ink" d="M30,10 H70 L76,22 V34 L70,42 H30 L24,34 V22 Z"/><path class="pp" d="M36,34 L34,18 L42,25 L50,14 L58,25 L66,18 L64,34 Z"/><path class="gd ol" d="M40,42 H60 L57,50 H43 Z"/>`,
  // ───────────── reliquias · Alquimia de palos ─────────────
  // Prisma: prisma triangular con un rayo que se abre en tres
  prisma: `${line('M0,64 L36,54', INK, 6)}<path class="gl ol" d="M50,8 L88,84 H12 Z"/><path class="thin" d="M50,8 V84"/><path d="M50,8 L88,84 H50 Z" fill="url(#hatch-ink)"/><path class="rd" d="M64,46 L100,32 V42 L66,54 Z"/><path class="gd" d="M67,56 L100,52 V62 L68,63 Z"/><path class="ink" d="M69,66 L100,72 V82 L70,72 Z"/>`,
  // Vitral: ventana ojival partida en cuatro colores
  mosaico: `<path class="rd" d="M50,8 C34,16 24,30 22,50 H50 Z"/><path class="gl" d="M50,8 C66,16 76,30 78,50 H50 Z"/><path class="gd" d="M22,50 H50 V92 H22 Z"/><path class="pp" d="M50,50 H78 V92 H50 Z"/><path d="M22,92 V50 C24,30 34,16 50,8 C66,16 76,30 78,50 V92 Z" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>${line('M50,8 V92 M22,50 H78', INK, 5)}<path class="ink" d="M14,90 H86 V98 H14 Z"/>`,
  // Caldero: caldero de tres patas con burbujas
  crisol: `<circle class="pp ol" cx="36" cy="14" r="6"/><circle class="pp ol" cx="56" cy="8" r="5"/><circle class="pp ol" cx="64" cy="22" r="4"/><path class="ink" d="M14,36 H86 C86,70 72,84 50,84 C28,84 14,70 14,36 Z"/><path fill="${VERD}" class="ol" d="M10,30 H90 V40 H10 Z"/><path class="cut" d="M24,48 C26,62 32,70 40,74"/>${bar('M24,76 L18,96 M76,76 L82,96 M50,84 V96', 7)}`,
  // Piedra filosofal: piedra tallada con un brillo en cruz
  catalizador: `<path class="rd ol" d="M30,24 H70 L88,48 L50,94 L12,48 Z"/><path class="cut" d="M12,48 H88 M30,24 L40,48 L50,94 M70,24 L60,48 L50,94 M40,48 L50,24 L60,48"/><path class="gd ol" d="M80,2 L84,14 L96,18 L84,22 L80,34 L76,22 L64,18 L76,14 Z"/>`,
  // ───────────── reliquias · Vida al filo ─────────────
  // Vela gastada: vela a medio consumir con cera chorreada
  sismografo: `<path class="rd ol" d="M50,8 C58,20 62,28 58,36 C56,40 53,42 50,42 C47,42 44,40 42,36 C38,28 42,20 50,8 Z"/><path class="gd" d="M50,20 C54,27 55,31 53,35 C52,37 48,37 47,35 C45,31 46,27 50,20 Z"/><path class="ink" d="M48,40 H52 V48 H48 Z"/><path class="pp ol" d="M34,48 C40,46 46,50 50,48 C56,46 60,48 66,48 V88 H34 Z"/><path class="pp ol" d="M36,50 C34,58 34,64 37,68 C40,64 40,58 40,52 Z M60,50 C60,60 62,66 64,72 C67,68 66,58 64,50 Z"/><path class="ink" d="M10,86 H90 C88,94 80,98 70,98 H30 C20,98 12,94 10,86 Z"/><path class="ink" d="M84,86 C96,82 98,72 90,70 C86,70 84,74 86,78" fill="none" stroke="${INK}" stroke-width="5"/>`,
  // Rosa de espinas: rosa con el tallo lleno de espinas
  megafono: `${bar('M50,40 C48,60 56,76 46,98', 6)}<path class="ink" d="M51,52 L62,48 L54,58 Z M49,66 L38,64 L48,72 Z M52,80 L62,80 L52,86 Z"/><path fill="${VERD}" class="ol" d="M52,62 C62,52 78,54 84,60 C74,68 62,70 52,62 Z M48,76 C38,68 22,70 16,78 C26,84 38,84 48,76 Z"/><circle class="rd ol" cx="50" cy="24" r="21"/><path class="cut" d="M50,24 C56,20 56,14 50,12 C42,10 36,18 38,26 C40,34 52,38 60,30 M40,12 C34,16 32,22 34,28"/>`,
  // Antorcha: antorcha encendida, en vertical
  piquete: `<path class="rd ol" d="M50,2 C62,18 74,30 68,46 C65,54 58,58 50,58 C42,58 35,54 32,46 C26,30 40,20 50,2 Z"/><path class="gd" d="M50,20 C57,30 62,38 58,47 C56,52 52,54 50,54 C48,54 44,52 42,47 C38,38 44,30 50,20 Z"/><path class="pp" d="M50,36 C53,41 54,45 52,49 C51,51 49,51 48,49 C46,45 47,41 50,36 Z"/><path class="ink" d="M32,56 H68 L62,68 H38 Z"/><path class="ink" d="M40,68 H60 L55,98 H45 Z"/><path class="cut" d="M43,76 L57,80 M44,86 L56,90"/>`,
  // Último aliento: reloj de arena casi vacío
  ultimo: `<path class="pp ol" d="M24,14 H76 C76,38 56,42 56,50 C56,58 76,62 76,86 H24 C24,62 44,58 44,50 C44,42 24,38 24,14 Z"/><path class="rd" d="M44,26 H56 C54,32 52,34 50,36 C48,34 46,32 44,26 Z"/><path class="rd" d="M30,84 C32,70 44,66 50,60 C56,66 68,70 70,84 Z"/><path class="thin" d="M50,38 V60"/><rect class="ink" x="14" y="5" width="72" height="9"/><rect class="ink" x="14" y="86" width="72" height="9"/>${bar('M18,14 V86 M82,14 V86', 4)}`,
  // Corazón de piedra: corazón de piedra con una grieta
  corazon: `<path class="pp ol" d="M50,92 C16,66 8,47 8,32 C8,16 20,8 32,8 C40,8 46,12 50,20 C54,12 60,8 68,8 C80,8 92,16 92,32 C92,47 84,66 50,92 Z"/><path class="ink" d="M50,20 C54,12 60,8 68,8 C80,8 92,16 92,32 C92,47 84,66 50,92 L52,84 L44,64 L56,50 L42,38 Z"/><path class="cut heavy" d="M64,30 H84 M60,52 H80 M72,30 V52"/>${line('M16,40 H34 M24,40 V54 M20,26 H32', INK, 4)}${line('M50,20 L42,38 L56,50 L44,64 L52,84', INK, 6)}`,
  // ───────────── reliquias · Fuego y ceniza ─────────────
  // Brasero: brasero de hierro con llama alta
  trituradora: `<path class="rd ol" d="M50,2 C56,16 72,22 70,40 C69,48 66,52 62,54 C64,46 60,40 56,38 C58,46 52,54 46,54 C40,54 34,48 36,40 C30,44 30,50 32,54 C26,50 24,44 26,36 C30,24 46,20 50,2 Z"/><path class="gd" d="M50,28 C54,36 60,40 58,48 C56,52 52,54 48,54 C44,54 40,50 42,44 C44,38 48,36 50,28 Z"/><path class="ink" d="M12,52 H88 C86,70 70,78 50,78 C30,78 14,70 12,52 Z"/><path class="cut" d="M22,58 H78 M30,66 H70"/>${bar('M30,74 L18,96 M70,74 L82,96 M50,78 V96', 7)}`,
  // Urna de cenizas: urna con tapa y dos asas
  montacargas: `<circle class="ink" cx="50" cy="6" r="5"/><path class="ink" d="M32,10 H68 L64,22 H36 Z"/><path class="pp ol" d="M36,22 H64 C62,28 76,36 76,56 C76,74 64,84 58,86 H42 C36,84 24,74 24,56 C24,36 38,28 36,22 Z"/><rect class="ink" x="25" y="44" width="50" height="7"/><rect class="ink" x="26" y="64" width="48" height="5"/>${line('M27,36 C10,34 10,58 25,58 M73,36 C90,34 90,58 75,58', INK, 6)}<path class="ink" d="M36,86 H64 L70,96 H30 Z"/>`,
  // Fuelle: fuelle de cuero con boquilla
  horno: `<circle cx="50" cy="10" r="8" fill="none" stroke="${INK}" stroke-width="6"/><rect class="ink" x="45" y="16" width="10" height="12"/><path class="rd" d="M50,22 C82,22 94,44 86,62 L58,92 H42 L14,62 C6,44 18,22 50,22 Z"/><path class="cut" d="M14,46 L20,50 L12,56 M86,46 L80,50 L88,56 M22,66 L28,66 L26,74 M78,66 L72,66 L74,74"/><path class="pp ol" d="M50,28 C74,28 84,44 78,58 L56,84 H44 L22,58 C16,44 26,28 50,28 Z"/><circle class="ink" cx="50" cy="50" r="8"/><path class="thin" d="M34,40 C40,36 46,34 50,34"/><path class="ink" d="M44,84 H56 L53,99 H47 Z"/>`,
  // Cofre cerrado: cofre con un candado grande
  contenedor: `<path class="pp ol" d="M10,40 C10,22 22,14 50,14 C78,14 90,22 90,40 Z"/><path class="pp ol" d="M10,40 H90 V88 H10 Z"/><rect class="ink" x="10" y="36" width="80" height="8"/><path class="thin" d="M24,16 V40 M76,16 V40 M24,44 V88 M76,44 V88"/><path class="ink" d="M6,84 H94 V92 H6 Z"/><path d="M40,58 V48 C40,40 60,40 60,48 V58" fill="none" stroke="${INK}" stroke-width="6"/><rect class="gd ol" x="34" y="56" width="32" height="24" rx="3"/><circle class="ink" cx="50" cy="65" r="4"/><path class="ink" d="M48,66 H52 L53,74 H47 Z"/>`,
  // Cetro de ceniza: cetro corto con una brasa en la punta
  prensa: `<g transform="rotate(18 50 54)"><rect class="ink" x="45" y="34" width="10" height="56"/><rect class="gd ol" x="41" y="44" width="18" height="6"/><rect class="gd ol" x="41" y="70" width="18" height="6"/><circle class="gd ol" cx="50" cy="92" r="6"/><path class="gd ol" d="M34,34 L36,18 L44,26 L50,14 L56,26 L64,18 L66,34 Z"/><circle class="rd ol" cx="50" cy="18" r="11"/><path class="gd" d="M50,10 C54,15 55,19 52,23 C50,25 47,23 47,20 C47,17 49,14 50,10 Z"/></g><path class="rd" d="M76,6 l3,6 l-6,-2 Z M84,18 l4,4 l-6,1 Z M70,0 l2,4 l-4,-1 Z"/>`,
  // ───────────── reliquias · Escudo y réplica ─────────────
  // Ariete: ariete con cabeza de carnero
  ariete: `<rect class="ink" x="4" y="6" width="80" height="7"/>${line('M24,13 L30,44 M64,13 L58,44', INK, 3)}<rect class="ink" x="6" y="42" width="66" height="20" rx="4"/><path class="cut" d="M14,48 H44 M22,56 H60"/><rect class="gd ol" x="54" y="40" width="8" height="24"/><path class="ink" d="M66,38 H82 C92,40 98,48 96,58 C94,66 86,68 80,66 H66 Z"/><circle class="pp ol" cx="74" cy="44" r="9"/><circle class="ink" cx="74" cy="44" r="3.5"/><circle class="pp" cx="88" cy="50" r="2.5"/><path class="ink" d="M4,82 H88 V90 H4 Z"/>`,
  // Rodela de púas: escudo redondo erizado de púas
  contragolpe: `${Array.from({ length: 12 }, (_, i) => `<path class="ink" d="M-5,-32 L0,-48 L5,-32 Z" transform="translate(50 50) rotate(${i * 30})"/>`).join('')}<circle class="pp ol" cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="24" fill="none" stroke="${INK}" stroke-width="5"/><circle class="gd ol" cx="50" cy="50" r="11"/><path class="ink" d="M46,50 L50,34 L54,50 Z"/>`,
  // Copa rebosante: copa de la que cae un hilo por el borde
  rebosadero: `<path class="ink" d="M12,10 H74 V16 H12 Z"/><path class="pp ol" d="M16,16 H70 C70,38 60,50 43,52 C26,50 16,38 16,16 Z"/><path class="rd" d="M19,18 H67 C67,24 66,28 64,32 H22 C20,28 19,24 19,18 Z"/>${line('M72,14 C82,16 84,30 82,50 C80,66 82,74 84,80', '#ae2d24', 5)}<ellipse class="rd" cx="84" cy="90" rx="13" ry="5"/><rect class="ink" x="38" y="52" width="10" height="24"/><path class="pp ol" d="M22,94 C24,84 32,78 43,78 C54,78 62,84 64,94 Z"/>`,
  // Baluarte: almena de tres merlones
  bastion: `<path class="pp ol" d="M8,94 V38 H8 V14 H28 V38 H40 V14 H60 V38 H72 V14 H92 V94 Z"/><path class="ink" d="M80,14 H92 V94 H80 Z M48,14 H60 V38 H48 Z M16,14 H28 V38 H16 Z"/>${line('M8,56 H92 M8,76 H92 M34,38 V56 M64,38 V56 M24,56 V76 M56,56 V76', INK, 5)}<path class="ink" d="M42,94 V82 C42,74 58,74 58,82 V94 Z"/>`,

  // ───────────── cartas especiales ─────────────
  // Ballesta: ballesta cargada, de frente
  barreno: `${line('M6,34 C24,18 76,18 94,34', INK, 8)}${line('M8,36 L50,56 L92,36', INK, 2)}<rect class="ink" x="44" y="22" width="12" height="74"/><path class="pp ol" d="M50,2 L58,16 H42 Z"/><rect class="pp ol" x="47" y="14" width="6" height="44"/><path class="gd ol" d="M38,70 H62 V78 H38 Z"/>`,
  // Martillo de guerra: martillo de cabeza cuadrada
  martillo: `<rect class="ink" x="45" y="30" width="10" height="66"/><path class="cut" d="M46,70 L54,74 M46,80 L54,84"/><rect class="ink" x="14" y="8" width="58" height="28" rx="2"/><path class="ink" d="M72,14 L94,22 L72,30 Z"/><path class="cut" d="M22,14 V30 M64,14 V30"/><rect class="gd ol" x="40" y="34" width="20" height="8"/>`,
  // El Espía: antifaz negro sobre una capucha
  saboteador: `<path class="pp ol" d="M50,4 C24,4 10,30 10,58 C10,80 20,94 20,94 H80 C80,94 90,80 90,58 C90,30 76,4 50,4 Z"/><path class="ink" d="M50,22 C32,22 24,40 24,58 C24,74 32,88 50,88 C68,88 76,74 76,58 C76,40 68,22 50,22 Z"/><path class="pp" d="M28,46 C36,40 44,42 50,46 C56,42 64,40 72,46 C70,54 62,58 56,54 C54,52 52,50 50,50 C48,50 46,52 44,54 C38,58 30,54 28,46 Z"/><path class="ink" d="M36,48 h7 v3 h-7 Z M57,48 h7 v3 h-7 Z"/>`,
  // Garfio: garfio de abordaje de tres puntas
  palanca: `${line('M50,4 V12', INK, 4)}<circle cx="50" cy="10" r="6" fill="none" stroke="${INK}" stroke-width="4"/><rect class="ink" x="45" y="16" width="10" height="56"/>${bar('M50,70 C30,72 18,80 16,92 M50,70 C70,72 82,80 84,92 M50,70 V96', 8)}<path class="ink" d="M10,86 L16,98 L22,88 Z M78,88 L84,98 L90,86 Z"/>`,
  // Paloma mensajera: paloma con un rollito atado a la pata
  grua: `<path class="pp ol" d="M8,46 C20,40 32,40 40,46 L58,18 C66,8 80,6 92,10 C82,16 76,28 70,44 C78,52 82,62 80,72 C66,78 46,76 32,64 C22,62 14,56 8,46 Z"/><path class="ink" d="M40,46 L58,18 C66,8 80,6 92,10 C82,16 76,28 70,44 Z"/><circle class="ink" cx="24" cy="48" r="3"/><path class="gd" d="M6,46 L0,50 L8,52 Z"/>${line('M50,74 L46,86 M60,74 L60,86', INK, 3)}<rect class="pp ol" x="50" y="84" width="22" height="10" rx="5"/><path class="rd" d="M60,84 h3 v10 h-3 Z"/>`,
  // Tregua: bandera blanca en un asta corta
  mordaza: `<rect class="ink" x="20" y="10" width="8" height="86"/><circle class="gd ol" cx="24" cy="8" r="6"/><path class="pp ol" d="M28,14 C46,8 60,22 92,14 C86,30 88,44 92,58 C60,66 46,52 28,58 Z"/><path class="thin" d="M40,26 C54,24 64,32 80,28 M40,44 C54,42 64,50 80,46"/><path class="ink" d="M10,92 H38 V98 H10 Z"/>`,
  // Lluvia de flechas: tres flechas cayendo en abanico
  clavos: `${[-24, 0, 24].map((r) => `<g transform="rotate(${r} 50 96)"><rect class="ink" x="47" y="18" width="6" height="58"/><path class="ink" d="M50,98 L40,76 H60 Z"/><path class="pp ol" d="M44,4 L50,12 L56,4 V22 L50,28 L44,22 Z"/></g>`).join('')}`,
  // Carterista: mano que se lleva un monedero
  chatarrero: `<path class="ink" d="M4,58 H30 C38,58 42,50 50,48 L70,44 C76,44 76,52 70,54 L56,58 L80,56 C86,56 86,64 80,66 L56,70 C50,78 40,82 30,82 H4 Z"/><path class="cut" d="M58,62 H78"/><path class="rd ol" d="M58,20 C70,14 86,20 88,32 C90,42 80,48 70,46 C60,44 52,36 58,20 Z"/><path class="ink" d="M58,20 C62,14 70,12 76,14 L72,22 Z"/><circle class="gd ol" cx="74" cy="32" r="5"/>`,
  // Rescate: moneda grande con una corona
  pico: `<circle cx="50" cy="50" r="40" fill="none" stroke="${INK}" stroke-width="11"/><circle cx="50" cy="50" r="40" fill="none" stroke="${GOLD}" stroke-width="5"/><circle class="pp" cx="50" cy="50" r="34"/><circle cx="50" cy="50" r="28" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="3 5"/><g transform="translate(30 34)"><path class="ink" d="${CROWN.replace(/(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/g, (_, x, y) => `${(Number(x) * 0.67).toFixed(1)},${(Number(y) * 0.9).toFixed(1)}`)}"/></g>`,
  // Elixir: redoma de cuello largo con un brillo
  botica: `<rect class="ink" x="42" y="2" width="16" height="9"/><path class="pp ol" d="M44,11 H56 V44 C72,50 82,62 82,74 C82,88 68,97 50,97 C32,97 18,88 18,74 C18,62 28,50 44,44 Z"/><path class="rd" d="M21,72 H79 C78,86 66,94 50,94 C34,94 22,86 21,72 Z"/><path class="gd ol" d="M70,20 L73,28 L81,31 L73,34 L70,42 L67,34 L59,31 L67,28 Z"/><path class="cut" d="M28,78 C30,84 34,88 40,90"/>`,
  // Naipe trucado: naipe con una esquina doblada
  gemelo: `<path class="pp ol" d="M18,6 H82 V72 L62,94 H18 Z"/><path class="ink" d="M82,72 L62,94 V72 Z"/><g transform="translate(50 46) scale(2)"><path class="rd" d="${HEART}"/></g><g transform="translate(28 18) scale(0.6)"><path class="rd" d="${HEART}"/></g>`,
  // Pacto oscuro: pergamino enrollado con lacre negro
  nitro: `<path class="pp ol" d="M14,20 H78 V80 H14 Z"/><rect class="pp ol" x="6" y="12" width="16" height="76" rx="8"/><rect class="pp ol" x="72" y="12" width="16" height="76" rx="8"/><path class="thin" d="M30,32 H64 M30,44 H64 M30,56 H52"/><path class="ink" d="M58,58 l6,4 6,-2 2,6 6,4 -4,6 2,6 -6,2 -2,6 -6,-2 -6,4 -4,-6 -6,-2 2,-6 -4,-6 6,-4 2,-6 Z"/><path class="rd" d="M66,90 L60,99 L64,99 L68,94 L72,99 L76,99 L70,90 Z"/>`,
  // Clarín: trompeta recta con banderola
  bola: `<path class="gd ol" d="M6,40 H16 V48 H6 Z"/><rect class="gd ol" x="16" y="40" width="50" height="8"/><path class="gd ol" d="M64,40 L94,22 V66 L64,48 Z"/><path class="rd ol" d="M26,48 H58 V70 L50,64 L42,72 L34,64 L26,70 Z"/><path class="cut" d="M32,54 H52"/><rect class="ink" x="36" y="36" width="6" height="16"/>`,
  // Puerta atrancada: puerta de tablones con una tranca
  hormigonera: `<path class="pp ol" d="M14,96 V34 C14,14 30,4 50,4 C70,4 86,14 86,34 V96 Z"/><path class="thin" d="M32,8 V96 M50,4 V96 M68,8 V96"/><path class="ink" d="M4,46 H96 V58 H4 Z"/><rect class="ink" x="10" y="40" width="8" height="24"/><rect class="ink" x="82" y="40" width="8" height="24"/><circle class="gd ol" cx="64" cy="76" r="5"/>`,
  // Cota de malla: cota de malla extendida
  cemento: `<path class="ink" d="M26,6 H74 L96,28 L84,42 L76,34 V96 H24 V34 L16,42 L4,28 Z"/><path d="M28,14 H72 L90,30 L84,36 L72,26 V92 H28 V26 L16,36 L10,30 Z" fill="url(#tone-paper)"/><path class="pp" d="M40,6 C44,14 56,14 60,6 Z"/>`,
  // Embestida: caballo encabritado de cuerpo entero, de perfil: patas traseras en el suelo, manos al
  // aire, cuello erguido y la cola al viento, con la gualdrapa de lacre
  embestida: `<path class="ink" d="M23,54 C10,56 4,68 6,88 C9,80 12,74 15,71 C13,79 13,87 17,93 C17,80 21,68 28,60 Z"/><path class="ink" d="M30,48 C40,40 48,32 54,26 C56,18 60,10 66,6 L69,0 L72,7 C78,10 84,16 90,22 C93,26 89,31 84,30 C80,29 76,27 72,27 C70,32 68,38 66,44 C64,52 58,58 52,62 C46,68 42,70 38,70 C32,72 24,70 20,64 C16,56 22,48 30,48 Z"/>${bar('M38,66 C43,74 45,80 40,86 L42,94', 8)}${bar('M24,64 C27,74 25,80 20,86 L22,94', 8)}<path class="ink" d="M15,92 H29 V99 H15 Z M35,92 H49 V99 H35 Z"/>${bar('M63,44 L78,39 L83,52', 7)}${bar('M57,52 L72,56 L70,68', 7)}<path class="rd ol" d="M34,46 L48,36 L56,48 L42,58 Z"/><path class="cut" d="M56,24 C58,18 61,13 65,9 M60,28 C62,22 64,18 68,14"/><circle class="pp" cx="75" cy="15" r="2.4"/>`,
  // Pasadizo: puertecilla en arco, entreabierta
  sierra: `<path class="pp ol" d="M4,96 V4 H96 V96 Z"/>${line('M4,24 H96 M4,46 H96 M4,70 H96 M30,4 V24 M70,4 V24 M16,24 V46 M84,24 V46 M14,46 V70 M86,46 V70 M30,70 V96 M70,70 V96', INK, 3)}<path class="ink" d="M24,96 V48 C24,30 38,20 50,20 C62,20 76,30 76,48 V96 Z"/><path class="gd ol" d="M50,26 C60,28 68,36 68,48 V96 H56 L54,32 Z"/><circle class="ink" cx="62" cy="64" r="3"/>`,

  // ───────────── la Orden, el mapa y la portada ─────────────
  // sello de lacre: gota de lacre con una corona en relieve
  sello: `<path class="rd ol" d="M50,6 l8,6 10,-2 4,9 10,4 -1,10 7,8 -6,8 2,10 -9,5 -3,10 -10,-1 -8,7 -8,-7 -10,1 -3,-10 -9,-5 2,-10 -6,-8 7,-8 -1,-10 10,-4 4,-9 10,2 Z"/><circle cx="50" cy="50" r="28" fill="none" stroke="#eae0ce" stroke-width="3"/><g transform="translate(32 36)"><path class="pp" d="${CROWN.replace(/(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/g, (_, x, y) => `${(Number(x) * 0.6).toFixed(1)},${(Number(y) * 0.8).toFixed(1)}`)}"/></g>`,
  // renovar mesa: dos flechas en círculo
  cajones: `${line('M18,52 C18,30 34,16 54,16 C64,16 72,20 78,26', INK, 10)}<path class="ink" d="M72,8 L92,30 L66,36 Z"/>${line('M82,48 C82,70 66,84 46,84 C36,84 28,80 22,74', '#ae2d24', 10)}<path class="rd" d="M28,92 L8,70 L34,64 Z"/>`,
  // atajo: puerta pequeña en una muralla
  atajo: `<path class="pp ol" d="M4,94 V22 H16 V10 H30 V22 H42 V10 H58 V22 H70 V10 H84 V22 H96 V94 Z"/>${line('M4,40 H96 M4,58 H96 M4,76 H96 M24,22 V40 M76,22 V40 M14,40 V58 M86,40 V58', INK, 3)}<path class="ink" d="M36,94 V64 C36,54 64,54 64,64 V94 Z"/><path class="rd ol" d="M42,80 H54 V72 L66,84 L54,96 V88 H42 Z"/>`,
  // oro: pila de monedas
  oro: `<ellipse class="gd ol" cx="50" cy="78" rx="36" ry="13"/><ellipse class="gd ol" cx="50" cy="61" rx="36" ry="13"/><ellipse class="gd ol" cx="50" cy="44" rx="36" ry="13"/><ellipse cx="50" cy="44" rx="26" ry="8" fill="none" stroke="#eae0ce" stroke-width="2.5"/><path class="cut" d="M20,64 V70 M32,68 V74 M68,68 V74 M80,64 V70 M20,81 V87 M32,85 V91 M68,85 V91 M80,81 V87"/><circle class="gd ol" cx="80" cy="18" r="12"/><circle cx="80" cy="18" r="6" fill="none" stroke="#eae0ce" stroke-width="2"/>`,
  // monarca: corona de cinco puntas
  jefe: `<g transform="translate(8 14) scale(1.4 1.6)"><path class="rd ol" d="${CROWN}"/></g><path class="cut heavy" d="M20,58 L30,44 M48,58 L50,36 M80,58 L70,44"/><rect class="ink" x="8" y="70" width="84" height="16"/><circle class="gd ol" cx="39" cy="14" r="6"/><circle class="gd ol" cx="61" cy="14" r="6"/><circle class="pp" cx="30" cy="78" r="4"/><circle class="pp" cx="50" cy="78" r="4"/><circle class="pp" cx="70" cy="78" r="4"/>`,
  // Trono infinito: trono visto de frente con una escalera que baja tras él
  abismo: `<path class="ink" d="M6,98 H94 V88 H84 V78 H74 V68 H26 V78 H16 V88 H6 Z"/><path class="cut" d="M10,92 H90 M20,82 H80 M30,72 H70"/><path class="rd ol" d="M30,68 V16 L40,24 L50,6 L60,24 L70,16 V68 Z"/><path class="ink" d="M24,50 H76 V60 H24 Z"/><path class="pp" d="M40,32 H60 V48 H40 Z"/>`,
  // Asalto diario: calendario de la ronda
  diaria: `<rect class="pp ol" x="10" y="16" width="80" height="78"/><rect class="rd" x="10" y="16" width="80" height="21"/><rect class="ink" x="25" y="5" width="9" height="22"/><rect class="ink" x="66" y="5" width="9" height="22"/><circle class="gd ol" cx="50" cy="66" r="15"/><path class="thin" d="M50,44 V50 M50,82 V88 M28,66 H34 M66,66 H72"/>`,
  // la conjura: tres encapuchados
  cuadrilla: `<path class="pp ol" d="M4,96 C4,70 10,52 22,44 C14,34 18,20 28,18 C38,18 42,32 34,44 C42,50 44,70 44,96 Z"/><path class="pp ol" d="M56,96 C56,70 58,50 66,44 C58,32 62,18 72,18 C82,20 86,34 78,44 C90,52 96,70 96,96 Z"/><path class="ink" d="M22,28 C24,24 32,24 34,30 C32,34 24,34 22,28 Z M66,30 C68,24 76,24 78,28 C76,34 68,34 66,30 Z"/><path class="rd ol" d="M26,98 C26,66 32,46 42,40 C34,28 40,8 50,8 C60,8 66,28 58,40 C68,46 74,66 74,98 Z"/><path class="ink" d="M42,30 C44,22 56,22 58,30 C56,36 44,36 42,30 Z"/>`,
  // la Orden: escudo con una daga y una llave cruzadas
  engranaje: `<path class="pp ol" d="M10,8 H90 V50 C90,74 72,88 50,96 C28,88 10,74 10,50 Z"/>${bar('M28,24 L72,72', 7)}<path class="ink" d="M64,76 L76,64 L82,70 L76,76 L82,82 L76,88 Z"/><circle cx="24" cy="20" r="7" fill="none" stroke="${INK}" stroke-width="5"/><path class="rd ol" d="M74,16 L82,24 L40,66 L30,70 L34,60 Z"/><path class="gd ol" d="M30,56 L44,70 L40,74 L26,60 Z"/><rect class="ink" x="20" y="68" width="8" height="12" transform="rotate(45 24 74)"/>`,
  // pergamino: Pergamino enrollado con cinta
  pergamino: `<path class="pp ol" d="M20,10 H84 V78 C84,88 76,92 68,92 H20 C28,88 28,80 28,74 V24 C28,14 20,14 20,10 Z"/><path class="thin" d="M38,28 H74 M38,42 H74 M38,56 H62"/><circle class="rd ol" cx="68" cy="72" r="9"/>`,
  // ───────────── servicios ─────────────
  // Mesa de lacre: vela, barra de lacre y sello
  forja: `<path class="rd ol" d="M24,4 C30,12 32,18 28,24 C26,26 22,26 20,24 C16,18 18,12 24,4 Z"/><rect class="pp ol" x="16" y="28" width="16" height="50"/><path class="ink" d="M8,78 H40 V86 H8 Z"/><rect class="rd ol" x="48" y="10" width="12" height="52" rx="2" transform="rotate(20 54 36)"/><path class="ink" d="M64,40 H86 V52 H80 V64 H70 V52 H64 Z"/><path class="rd ol" d="M76,70 l6,4 7,-1 2,6 6,4 -3,6 2,6 -6,3 -2,6 -7,-2 -5,4 -5,-4 -7,2 -2,-6 -6,-3 2,-6 -3,-6 6,-4 2,-6 7,1 Z"/>`,
  // Mapa del castillo: pergamino desplegado con un castillo
  plano: `<path class="pp ol" d="M6,16 L34,8 L66,16 L94,8 V84 L66,92 L34,84 L6,92 Z"/><path class="thin" d="M34,8 V84 M66,16 V92"/><path class="ink" d="M38,72 V44 H44 V36 H50 V44 H56 V36 H62 V44 H62 V72 Z"/><path class="pp" d="M47,72 V62 C47,58 53,58 53,62 V72 Z"/>${line('M12,80 C20,70 26,74 32,66 M70,30 C76,40 82,34 88,44', '#ae2d24', 3)}<path class="rd" d="M84,46 l6,6 M90,46 l-6,6" stroke="#ae2d24" stroke-width="3"/>`,
  // curar: frasco con un corazón
  reparacion: `<path class="thin" d="M36,28 V16 H64 V28"/><rect class="pp ol" x="12" y="28" width="76" height="60" rx="6"/><g transform="translate(50 58) scale(2.2)"><path class="rd" d="M0,9 C-3,6 -10,1 -10,-4 C-10,-8 -7,-10 -4.5,-10 C-2.3,-10 -0.8,-8.7 0,-6.8 C0.8,-8.7 2.3,-10 4.5,-10 C7,-10 10,-8 10,-4 C10,1 3,6 0,9 Z"/></g>`,
  // La hoguera
  retirar: `<path class="rd ol" d="M50,4 C58,26 82,36 78,60 C76,74 66,80 50,80 C34,80 24,74 22,60 C20,46 31,40 33,27 C42,34 44,43 44,49 C50,38 52,22 50,4 Z"/><path class="gd" d="M50,40 C58,50 63,57 61,66 C59,74 54,78 50,78 C46,78 41,74 39,66 C37,57 44,51 50,40 Z"/>${bar('M10,92 L90,74 M10,74 L90,92', 9)}`,
  // la incógnita (especial por descubrir)
  incognita: `<path class="ink" d="M30,34 C30,14 42,6 52,6 C66,6 76,16 76,30 C76,42 68,48 62,54 C58,58 56,62 56,70 H42 C42,58 46,52 52,46 C57,41 61,37 61,30 C61,23 57,19 51,19 C45,19 43,24 43,34 Z"/><rect class="rd" x="41" y="78" width="16" height="16"/>`,
  // Sobre lacrado
  sobre: `<rect class="pp ol" x="8" y="22" width="84" height="60"/><path class="thin" d="M8,22 L50,58 L92,22"/><circle class="rd ol" cx="50" cy="60" r="11"/><path class="pp" d="M44,62 L43,56 L47,59 L50,54 L53,59 L57,56 L56,62 Z"/>`,
  // Comodín · Motín: un puño en alto
  // ───────────── logros, juramentos, atajos y portada (V6) ─────────────
  // Fin del reinado · corona rota: corona de oro partida en dos mitades que se separan
  corona_rota: `<g transform="rotate(-9 26 86)"><path class="gd ol" d="M6,86 V40 L19,56 L30,30 L40,50 L45,42 L39,60 L47,70 L41,86 Z"/><rect class="ink" x="6" y="72" width="35" height="10"/><circle class="rd ol" cx="22" cy="62" r="5"/></g><g transform="rotate(9 74 86)"><path class="gd ol" d="M59,86 L53,70 L61,60 L55,42 L60,50 L70,30 L81,56 L94,40 V86 Z"/><rect class="ink" x="59" y="72" width="35" height="10"/><circle class="rd ol" cx="78" cy="62" r="5"/></g>${line('M50,20 L46,34 L54,44 L48,56', INK, 3)}<path class="ink" d="M8,94 H92 V99 H8 Z"/>`,
  // Sin fin: tres coronas apiladas
  coronas: `${[0, 1, 2].map((k) => `<g transform="translate(${20 - k * 2} ${64 - k * 30}) scale(${1 + k * 0.03} 0.82)"><path class="${['ink', 'rd ol', 'gd ol'][k]}" d="${CROWN}"/></g>`).join('')}<path class="cut" d="M24,86 H76"/><circle class="pp" cx="50" cy="86" r="3"/>`,
  // Dos y dos: dos parejas de naipes
  naipes_par: fan('HHSS', 17),
  // Todo al mismo palo: cinco picas en abanico
  naipes_color: fan('SSSSS'),
  // Casa llena: tres y dos naipes
  naipes_full: fan('HHHSS'),
  // Póker: cuatro ases, uno de cada palo
  naipes_poker: fan('SDHC', 18),
  // Escalera real: cinco corazones en abanico bajo una corona
  naipes_real: `${fan('HHHHH', 13)}<g transform="translate(35 1) scale(0.5 0.46)"><path class="gd ol" d="${CROWN}"/></g>`,
  // Jugada maestra: abanico de cinco naipes de palos distintos
  abanico: fan('SDHCS'),
  // Conjura corta: cuatro naipes y el hueco del que falta
  abanico_corto: fan('SDHC', 15, true),
  // Trueno: rayo
  rayo: `<path class="ink" d="M60,0 L16,56 H44 L28,100 L86,36 H56 L76,0 Z"/><path class="gd" d="M60,8 L26,50 H52 L40,84 L76,42 H48 L64,8 Z"/>`,
  // Cataclismo: cometa con cola de fuego
  cometa: `<path class="ink" d="M56,18 C40,40 20,62 0,98 C26,74 50,58 82,46 Z"/><path class="rd" d="M58,30 C46,46 32,62 16,86 C34,70 50,58 72,46 Z"/><circle class="gd ol" cx="72" cy="30" r="20"/><path class="cut" d="M62,24 C64,18 70,14 76,14"/>`,
  // Relicario lleno: estuche con seis huecos ocupados
  relicario: `<rect class="pp ol" x="8" y="22" width="84" height="70" rx="4"/><path class="ink" d="M8,22 H92 V36 H8 Z"/><rect class="gd ol" x="42" y="14" width="16" height="14" rx="2"/>${[26, 50, 74].map((x, i) => `<circle class="${['rd', 'gd', 'gl'][i]} ol" cx="${x}" cy="52" r="9"/><circle class="${['gl', 'rd', 'gd'][i]} ol" cx="${x}" cy="76" r="9"/>`).join('')}${line('M38,40 V90 M62,40 V90 M10,64 H90', INK, 3)}`,
  // Trofeo de La Reina Helada: carámbanos colgando de una cornisa
  carambano: `<rect class="ink" x="4" y="6" width="92" height="14"/><path class="cut" d="M10,13 H90"/><path class="gl ol" d="M10,20 L20,74 L30,20 Z M32,20 L42,96 L54,20 Z M56,20 L64,62 L72,20 Z M74,20 L83,84 L92,20 Z"/><path class="thin" d="M40,28 L42,72 M80,28 L82,62"/>`,
  // Al galope: herradura con sus clavos
  herradura: `<path d="M24,94 C6,64 10,12 50,10 C90,12 94,64 76,94" fill="none" stroke="${INK}" stroke-width="22"/><path d="M24,94 C6,64 10,12 50,10 C90,12 94,64 76,94" fill="none" stroke="${GOLD}" stroke-width="8"/>${[[22, 74], [17, 50], [26, 28], [74, 28], [83, 50], [78, 74]].map(([x, y]) => `<circle class="pp" cx="${x}" cy="${y}" r="3"/>`).join('')}<path class="ink" d="M12,90 H34 V99 H12 Z M66,90 H88 V99 H66 Z"/>`,
  // Noche larga: luna llena sobre una almena
  luna: `<circle class="gd ol" cx="58" cy="32" r="26"/><circle cx="48" cy="26" r="5" fill="none" stroke="${INK}" stroke-width="2.5"/><circle cx="66" cy="40" r="4" fill="none" stroke="${INK}" stroke-width="2.5"/><path class="ink" d="M2,99 V60 H16 V48 H30 V60 H44 V48 H58 V60 H72 V48 H86 V60 H98 V99 Z"/><path class="cut" d="M2,74 H98 M2,88 H98 M22,60 V74 M50,60 V74 M78,60 V74 M36,74 V88 M64,74 V88"/>`,
  // Sin escudo: pavés partido en dos
  escudo_roto: `<g transform="rotate(-8 30 90)"><path class="pp ol" d="M14,8 H48 L42,30 L52,48 L40,66 L46,92 Q30,94 14,86 Z"/><path class="rd" d="M28,10 H40 V88 H28 Z"/><circle class="ink" cx="20" cy="16" r="3.5"/><circle class="ink" cx="20" cy="78" r="3.5"/></g><g transform="rotate(8 70 90)"><path class="pp ol" d="M56,8 H88 V86 Q72,94 58,94 L50,66 L62,48 L52,30 Z"/><path class="ink" d="M64,10 H76 V92 H64 Z"/><circle class="ink" cx="82" cy="16" r="3.5"/><circle class="ink" cx="82" cy="78" r="3.5"/></g>`,
  // Contrabando: fardo atado con cuerda
  fardo: `<path class="pp ol" d="M8,32 L50,16 L92,32 V80 L50,96 L8,80 Z"/><path class="ink" d="M50,48 L92,32 V80 L50,96 Z"/><path class="thin" d="M8,32 L50,48 V96"/>${line('M26,25 L68,41 M8,56 L50,72 L92,56 M30,40 V88', GOLD, 6)}<circle class="gd ol" cx="50" cy="20" r="6"/>`,
  // Partida guiada · la Maestra: mano que señala con el índice
  senal: `<rect class="rd ol" x="4" y="34" width="20" height="44" rx="3"/><path class="ink" d="M24,36 H54 C60,36 62,40 62,44 H92 C99,44 99,56 92,56 H62 V60 C66,62 66,70 60,71 C64,73 63,82 56,82 H24 Z"/><path class="cut" d="M30,46 C40,44 48,48 54,56 M40,64 H58 M40,74 H54"/><path class="pp" d="M66,48 H90"/>`,
  // Puesto grande: toldo de puesto de mercado sobre un mostrador
  toldo: `<rect class="ink" x="12" y="20" width="7" height="78"/><rect class="ink" x="81" y="20" width="7" height="78"/><path class="rd ol" d="M4,40 L14,8 H86 L96,40 Z"/><path class="pp" d="M26,8 H40 L36,40 H22 Z M56,8 H70 L74,40 H60 Z"/><path class="rd ol" d="M4,40 Q11,52 18,40 Q25,52 32,40 Q39,52 46,40 Q53,52 60,40 Q67,52 74,40 Q81,52 88,40 Q92,48 96,40 Z"/><path class="ink" d="M6,70 H94 V82 H6 Z"/><circle class="gd ol" cx="36" cy="62" r="7"/><circle class="gd ol" cx="58" cy="62" r="7"/><path class="gl ol" d="M70,68 V54 H82 V68 Z"/>`,
  comodin: `<path class="ink" d="M30,96 V66 C24,62 22,54 24,46 L26,30 C26,24 34,24 34,30 V24 C34,18 42,18 42,24 V20 C42,14 50,14 50,20 V24 C50,18 58,18 58,24 V34 C62,30 70,32 70,40 C70,52 66,60 62,66 V96 Z"/><path class="cut" d="M34,30 V44 M42,24 V44 M50,24 V44 M58,34 V48"/><path class="rd ol" d="M80,4 L83,12 L92,13 L85,19 L87,28 L80,23 L73,28 L75,19 L68,13 L77,12 Z"/>`,
};

export function glyphSvg(id: string, cls = ''): string {
  return `<svg class="art lino emblem ${cls}" viewBox="0 0 100 100" aria-hidden="true"><g filter="url(#rough)">${GLYPH[id] ?? GLYPH.comodin}</g></svg>`;
}
