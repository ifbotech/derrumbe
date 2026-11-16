// V12 · arte grabado de lo nuevo (SPECS/V12.md 1.10): lo que cae a la mesa (monedas de oro con canto, esquirlas de
// corona de hierro rota, gotas de lacre rojo sangre), los dados de hueso marfil viejo con las caras talladas, los
// estandartes de las cuatro ramas del Árbol y los iconos de Mejor jugada (rayo) y AUTO (rueda dentada). Todo en
// SVG dibujado aquí, con las tintas del tema y sin filtros (lo que vuela lo anima juice-ux con transform/opacity).
import type { Rama } from '../rules/arbol';

const INK = '#181614';

/** Moneda de oro con su canto grabado y una corona en relieve (la de la bolsa y la que cae). */
export const MONEDA_SVG = `<svg class="caida-svg" viewBox="0 0 40 40" aria-hidden="true">
  <ellipse cx="20" cy="23.5" rx="16" ry="14.5" fill="#7a5208" stroke="${INK}" stroke-width="2.6"/>
  <path d="M8,27 V31 M12,30 V34 M16,31.5 V36 M20,32 V36.5 M24,31.5 V36 M28,30 V34 M32,27 V31" stroke="${INK}" stroke-width="1.6"/>
  <ellipse cx="20" cy="19" rx="16" ry="14.5" fill="#d9a43a" stroke="${INK}" stroke-width="2.6"/>
  <ellipse cx="20" cy="19" rx="11.5" ry="10.2" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="2 2.4"/>
  <path d="M13,24 L12.5,14 L16.5,18 L20,11 L23.5,18 L27.5,14 L27,24 Z" fill="${INK}"/>
  <path d="M9.5,13 C11.5,9 15,7 19,6.5" fill="none" stroke="#fff1c4" stroke-width="2" stroke-linecap="round"/>
</svg>`;

/** Esquirla de Corona: un pico de corona de hierro partido, con el filo de la rotura y su trama de tajos. */
export const ESQUIRLA_SVG = `<svg class="caida-svg" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M5,34 L9,13 L16,22 L21,4 L27,19 L35,12 L33,26 L24,30 L19,37 Z" fill="#4c4c4f" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M11,30 L14,24 M16,32 L19,25 M22,28 L24,22 M27,25 L30,19" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M9,13 L16,22 L21,4" fill="none" stroke="#b9b6ad" stroke-width="1.6" stroke-linejoin="round"/>
  <circle cx="21" cy="15" r="2.6" fill="#d9a43a" stroke="${INK}" stroke-width="1.2"/>
  <path d="M24,30 L33,26" stroke="#d9a43a" stroke-width="1.6"/>
</svg>`;

/** Gota de lacre rojo sangre con su brillo. */
export const GOTA_SVG = `<svg class="caida-svg" viewBox="0 0 40 40" aria-hidden="true">
  <path d="M20,3 C24,12 33,19 33,27 C33,34.5 27,38 20,38 C13,38 7,34.5 7,27 C7,19 16,12 20,3 Z" fill="#8e1b17" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M13,26 C13,21 16,17 19,13" fill="none" stroke="#f0b4a4" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M24,33 C27,32 29,30 29.5,27" fill="none" stroke="#4a0c0a" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export const PIEZA_SVG = { moneda: MONEDA_SVG, esquirla: ESQUIRLA_SVG, gota: GOTA_SVG } as const;

/**
 * Un dado de hueso visto desde arriba y un poco de frente: la cara de arriba grande (un trapecio de marfil viejo
 * con los cantos redondeados, donde va tallada la cara que salió: «×n» en HTML encima, para que se lea con la
 * letra de las cifras), el canto de delante más oscuro con la sombra de buril y dos puntos, y su sombra en el suelo.
 * `corona`: el Dado de la Corona lleva una corona grabada arriba; el de oro, una moneda.
 */
export function huesoSvg(tipo: 'oro' | 'corona'): string {
  const marca =
    tipo === 'corona'
      ? `<path d="M48,23 L47,12 L53,17 L58,8 L63,17 L69,12 L68,23 Z" fill="#4c4c4f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`
      : `<ellipse cx="58" cy="16" rx="8" ry="7" fill="#d9a43a" stroke="${INK}" stroke-width="2"/><ellipse cx="58" cy="16" rx="4.4" ry="3.6" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
  return `<svg class="hueso-svg" viewBox="0 0 116 112" aria-hidden="true">
    <ellipse cx="60" cy="104" rx="50" ry="6" fill="rgba(0,0,0,0.45)"/>
    <path d="M12,74 H104 Q110,74 109,80 L106,96 Q105,102 99,102 H17 Q11,102 10,96 L7,80 Q6,74 12,74 Z" fill="#b9a679" stroke="${INK}" stroke-width="3"/>
    <path d="M14,80 L20,98 M24,80 L29,98 M86,80 L92,98 M96,80 L101,98 M34,96 C50,99 70,99 84,96" fill="none" stroke="#7d6b45" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="44" cy="88" r="4.2" fill="${INK}"/><circle cx="74" cy="88" r="4.2" fill="${INK}"/>
    <path d="M22,4 H94 Q101,4 102,11 L108,68 Q109,76 101,76 H15 Q7,76 8,68 L14,11 Q15,4 22,4 Z" fill="#e6d8b4" stroke="${INK}" stroke-width="3"/>
    <path d="M23,10 H93 Q97,10 97,14 L102,66 Q102,70 98,70 H18 Q14,70 14,66 L19,14 Q19,10 23,10 Z" fill="#efe4c6"/>
    <path d="M100,16 C102,34 103,50 104,66 M20,68 C44,71 74,71 100,68" fill="none" stroke="#b09c70" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M26,20 C29,24 27,28 30,31 M88,52 C91,54 89,58 92,60" fill="none" stroke="#b09c70" stroke-width="1.3" stroke-linecap="round"/>
    ${marca}
  </svg>`;
}

/** Rayo grabado (Mejor jugada). Hereda el color del texto del botón. */
export const ICONO_MEJOR = `<svg class="ico-btn" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5,1.5 L4,13.5 H11 L8.5,22.5 L20,9.5 H13 Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`;

/** Rueda dentada del autómata (AUTO). Hereda el color del texto del botón. */
export const ICONO_AUTO = `<svg class="ico-btn" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M10,1.5 H14 L14.6,4.4 L16.8,5.4 L19.3,3.7 L20.3,4.7 L22,7.2 L20.4,9.6 L20.6,10 L22.5,10.6 V13.4 L20.6,14 L19.6,16.4 L21.2,18.9 L18.9,21.2 L16.4,19.6 L14,20.6 L13.4,22.5 H10.6 L10,20.6 L7.6,19.6 L5.1,21.2 L2.8,18.9 L4.4,16.4 L3.4,14 L1.5,13.4 V10.6 L3.4,10 L4.4,7.6 L2.8,5.1 L5.1,2.8 L7.6,4.4 L9.4,3.6 Z M12,8 A4,4 0 1 0 12.01,8 Z"/></svg>`;

/** El fondo de cada estandarte de rama: color de su paño (oscuro, la letra marfil encima ≥ 7:1). */
export const PANO: Record<Rama, string> = { arsenal: '#5e1a15', bolsa: '#5a3f0c', huesos: '#463f35', corona: '#262b30' };

/** El paño de un estandarte: tela con cola de golondrina, asta de madera y su filete. Va detrás del texto. */
export function estandarteSvg(rama: Rama): string {
  const c = PANO[rama];
  return `<svg class="estandarte-pano" viewBox="0 0 240 110" preserveAspectRatio="none" aria-hidden="true">
    <rect x="0" y="2" width="240" height="7" rx="3" fill="#6b4a26" stroke="${INK}" stroke-width="2"/>
    <path d="M6,9 H234 V104 L212,90 L190,104 L168,90 L146,104 L124,90 L102,104 L80,90 L58,104 L36,90 L14,104 L6,98 Z" fill="${c}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M14,16 H226" stroke="#d9a43a" stroke-width="2" opacity="0.85"/>
  </svg>`;
}

/** La insignia del Golpe exacto en la carta: una corona maciza de tinta sobre lacre de latón. */
export const INSIGNIA_EXACTA = `<i class="insignia-exacta" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M2.5,15.5 L3.5,6 L7.5,10 L10,3.5 L12.5,10 L16.5,6 L17.5,15.5 Z" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg></i>`;

/** Candado de tinta para los nodos que esperan a su anterior (forma, además del sello apagado). */
export const CANDADO = `<svg class="candado" viewBox="0 0 20 20" aria-hidden="true"><path d="M6,9 V6.5 a4,4 0 0 1 8,0 V9" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="3.5" y="8.5" width="13" height="10" rx="1.5" fill="currentColor"/><rect x="9" y="11.5" width="2" height="4" fill="#efe6d5"/></svg>`;
