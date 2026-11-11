import { Config, DIFFICULTY } from '../rules/engine';
import { suitSvg } from './card';

export function rulesHtml(cfg: Config = DIFFICULTY.obra): string {
  const S = suitSvg('S');
  const D = suitSvg('D');
  const H = suitSvg('H');
  const C = suitSvg('C');
  return `
  <p><b>DERRUMBE</b> es un juego cooperativo para 1 a 4 jugadores con baraja francesa. Sois una cuadrilla de demolición:
  hay que echar abajo las <b>cuatro torres</b> antes de que sepulten vuestro <b>búnker</b>. Se gana o se pierde en equipo.</p>

  <h3>Preparación</h3>
  <ul>
    <li>Las 12 figuras forman 4 torres, una por palo. Cada torre tiene 3 pisos: primero la <b>J</b>, luego la <b>Q</b> y al final la <b>K</b>.</li>
    <li>Las 40 cartas numerales (A = 1 … 10) y 2 comodines forman la <b>cantera</b> (mazo). Cada jugador roba su mano
    (${cfg.handSize[1]} cartas en solitario, ${cfg.handSize[2]} con 2 o más jugadores).</li>
    <li>El búnker empieza con <b>${cfg.maxIntegrity} de integridad</b> y sin muro.</li>
  </ul>
  <table>
    <tr><th>Piso</th><th>Resistencia</th><th>Amenaza</th></tr>
    <tr><td>J</td><td>${cfg.floorHp[11]}</td><td>${cfg.floorThreat[11]}</td></tr>
    <tr><td>Q</td><td>${cfg.floorHp[12]}</td><td>${cfg.floorThreat[12]}</td></tr>
    <tr><td>K</td><td>${cfg.floorHp[13]}</td><td>${cfg.floorThreat[13]}</td></tr>
  </table>

  <h3>Tu turno</h3>
  <ul>
    <li><b>1 · Golpea</b> una torre con una <b>formación</b> (tabla de abajo).</li>
    <li>En vez de golpear puedes <b>descartar</b> las cartas que quieras, o jugar un <b>comodín</b>.</li>
    <li><b>2 · Suena la sirena</b>: se voltea la carta superior de la cantera. La torre de ese palo golpea al búnker con la amenaza de su piso actual.
    El muro absorbe primero; el resto baja la integridad. Si esa torre ya es ruina o sale un comodín, no pasa nada.</li>
    <li><b>3 · Roba</b> hasta completar tu mano. Turno del siguiente.</li>
  </ul>

  <h3>Formaciones</h3>
  <table>
    <tr><th>Formación</th><th>Cartas</th><th>Golpe</th></tr>
    <tr><td>Carta sola</td><td>1 carta</td><td>×1</td></tr>
    <tr><td>Grupo</td><td>2 o 3 del mismo número</td><td>×1</td></tr>
    <tr><td>Escalera</td><td>3 o más números seguidos, de cualquier palo</td><td>×1</td></tr>
    <tr><td>Doble par</td><td>2 parejas</td><td>×1,25</td></tr>
    <tr><td>Color</td><td>5 o más del mismo palo</td><td>×1,5</td></tr>
    <tr><td>Full</td><td>un trío y una pareja</td><td>×1,5</td></tr>
    <tr><td>Escalera de color</td><td>3 o más seguidas del mismo palo</td><td>×1,5</td></tr>
    <tr><td>Póker</td><td>4 del mismo número</td><td>×2</td></tr>
  </table>

  <h3>Daño y materiales</h3>
  <p>Cada carta hace tanto daño como su número. El <b>As</b> es la carta fuerte: vale <b>11</b> y enlaza escaleras por abajo (A-2-3) y por arriba (9-10-A). El material de la torre modifica el daño:</p>
  <table>
    <tr><th>Torre</th><th>Daño doble (×2)</th><th>Sin daño (×0)</th></tr>
    <tr><td>${S} ACERO</td><td>${C} tréboles</td><td>${S} picas</td></tr>
    <tr><td>${D} VIDRIO</td><td>${S} picas</td><td>${D} diamantes</td></tr>
    <tr><td>${H} LADRILLO</td><td>${D} diamantes</td><td>${H} corazones</td></tr>
    <tr><td>${C} HORMIGÓN</td><td>${H} corazones</td><td>${C} tréboles</td></tr>
  </table>
  <p>Ciclo: ${S} rompe ${D} · ${D} corta ${H} · ${H} agrieta ${C} · ${C} sepulta ${S}.</p>

  <h3>Poder de cada palo</h3>
  <p>Además del daño, las cartas de cada palo que juegues activan su poder (aunque no hagan daño):</p>
  <table>
    <tr><td>${S} <b>PERFORAR</b></td><td>Si la formación lleva alguna pica, el daño sobrante al tirar un piso pasa al piso siguiente.</td></tr>
    <tr><td>${D} <b>ESQUIRLAS</b></td><td>Las demás torres reciben un tercio (hacia abajo) del valor de tus diamantes.</td></tr>
    <tr><td>${H} <b>REPARAR</b></td><td>El búnker recupera un tercio (hacia arriba) del valor de tus corazones. Máximo ${cfg.maxIntegrity}.</td></tr>
    <tr><td>${C} <b>MURO</b></td><td>Levantas un tercio (hacia arriba) del valor de tus tréboles como muro. Máximo ${cfg.wallCap}.</td></tr>
  </table>

  <h3>Reglas especiales</h3>
  <ul>
    <li><b>Golpe limpio</b>: si tiras un piso con el daño exacto, la sirena no suena este turno.</li>
    <li><b>Comodín · Huelga</b>: se juega solo sobre una torre. Su piso actual queda <b>desarmado</b> (amenaza 0 hasta que caiga) y la sirena no suena. El comodín sale del juego.</li>
    <li><b>Colapso</b>: si la cantera se agota, la escombrera se baraja y vuelve a ser cantera, pero el búnker pierde <b>${cfg.collapseLoss}</b> de integridad (el muro no lo evita).</li>
    <li>Solo se puede <b>pasar</b> con la mano vacía.</li>
  </ul>

  <h3>Final</h3>
  <ul>
    <li><b>Victoria</b>: las cuatro torres en ruinas.</li>
    <li><b>Derrota</b>: la integridad del búnker llega a 0.</li>
    <li>Modo <b>BRUTAL</b>: búnker de ${DIFFICULTY.brutal.maxIntegrity} y colapsos de ${DIFFICULTY.brutal.collapseLoss}.</li>
  </ul>

  <h3>Consejos de obra</h3>
  <ul>
    <li>Tirar una J destapa una Q con más amenaza: una torre a medio demoler es más peligrosa que una intacta.</li>
    <li>Una torre en ruinas convierte su palo en sirenas mudas. Terminar torres da turnos seguros.</li>
    <li>Jugar muchas cartas acelera la obra, pero agota la cantera y acerca el colapso.</li>
  </ul>`;
}
