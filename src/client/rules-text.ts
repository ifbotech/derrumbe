import { Config, DIFFICULTY, FORM, FORMATIONS, FORMATION_NAME, Formation, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../rules/engine';
import { KEYWORDS } from '../rules/keywords';
import { ASCENSIONS, FATIGUE } from '../rules/run';
import { TOOL_SLOTS } from '../rules/tools';
import { suitSvg } from './card';

const FORM_CARDS: Record<Formation, string> = {
  solo: '1 carta',
  compania: 'un As con cualquier otra carta',
  grupo: '2 o 3 del mismo número',
  escalera: '3 o más números seguidos, de cualquier palo',
  doblepar: '2 parejas',
  color: '5 o más del mismo palo',
  full: 'un trío y una pareja',
  escaleracolor: '3 o más seguidas del mismo palo',
  poker: '4 del mismo número',
};
const n = (x: number) => String(x).replace('.', ',');

export function rulesHtml(cfg: Config = DIFFICULTY.obra): string {
  const S = suitSvg('S');
  const D = suitSvg('D');
  const H = suitSvg('H');
  const C = suitSvg('C');
  const hand = Object.values(cfg.handSize);
  return `
  <p><b>DERRUMBE</b> es un juego cooperativo para 1 a 4 jugadores con baraja francesa. Sois una cuadrilla de demolición:
  hay que echar abajo las <b>cuatro torres</b> antes de que sepulten vuestro <b>búnker</b>. Se gana o se pierde en equipo.</p>

  <h3>Preparación</h3>
  <ul>
    <li>Las figuras forman 4 torres, una por palo. Cada torre tiene hasta 3 pisos: primero la <b>J</b>, luego la <b>Q</b> y al final la <b>K</b>.</li>
    <li>Las 40 cartas numerales y 2 comodines forman la <b>cantera</b> (mazo). Cada jugador roba su mano (${Math.max(...hand)} cartas${hand.length > 1 ? ` en solitario, ${Math.min(...hand)} en cuadrilla` : ''}).</li>
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
    <li><b>1 · Golpea</b> una torre con una <b>formación</b>. Antes de golpear, el marcador te enseña la cuenta.</li>
    <li>En vez de golpear puedes <b>descartar</b> las cartas que quieras, o jugar un <b>comodín</b>.</li>
    <li><b>2 · Suena la sirena</b>: se voltea la carta superior de la cantera. La torre de ese palo golpea al búnker con la amenaza de su piso actual.
    El muro absorbe primero; el resto baja la integridad. Si esa torre ya es ruina o sale un comodín, no pasa nada.</li>
    <li><b>3 · Roba</b> hasta completar tu mano. Turno del siguiente.</li>
  </ul>

  <h3>Fuerza × Resonancia</h3>
  <p>Todo golpe se calcula igual: <b>daño = Fuerza × Resonancia</b>, redondeado. Se resuelve de izquierda a derecha y cada paso se ve en la mesa:</p>
  <ul>
    <li><b>La formación</b> pone la base de Fuerza y de Resonancia.</li>
    <li><b>Cada carta</b> suma su número como Fuerza, en el orden en que la elegiste. El <b>As</b> vale <b>11</b> y enlaza escaleras por abajo (A-2-3) y por arriba (9-10-A).</li>
    <li>Después actúan sus <b>tratamientos</b> y <b>sellos</b>, las <b>cartas especiales</b> que acompañan y, por último, el <b>cinturón de herramientas</b>.</li>
    <li>Lo que <b>suma</b> cuenta donde está. Lo que <b>multiplica</b> la Resonancia multiplica todo lo acumulado hasta ese momento: por eso conviene sumar primero y multiplicar al final.</li>
  </ul>
  <table>
    <tr><th>Formación</th><th>Cartas</th><th>Fuerza</th><th>Resonancia</th></tr>
    ${FORMATIONS.map((f) => `<tr><td>${FORMATION_NAME[f]}</td><td>${FORM_CARDS[f]}</td><td>+${FORM[f].f}</td><td>×${n(FORM[f].r)}</td></tr>`).join('')}
  </table>

  <h3>Materiales</h3>
  <p>El material de la torre cambia la Fuerza que suma cada carta:</p>
  <table>
    <tr><th>Torre</th><th>Fuerza doble (×2)</th><th>Sin Fuerza (×0)</th></tr>
    <tr><td>${S} ACERO</td><td>${C} tréboles</td><td>${S} picas</td></tr>
    <tr><td>${D} VIDRIO</td><td>${S} picas</td><td>${D} diamantes</td></tr>
    <tr><td>${H} LADRILLO</td><td>${D} diamantes</td><td>${H} corazones</td></tr>
    <tr><td>${C} HORMIGÓN</td><td>${H} corazones</td><td>${C} tréboles</td></tr>
  </table>
  <p>Ciclo: ${S} rompe ${D} · ${D} corta ${H} · ${H} agrieta ${C} · ${C} sepulta ${S}.</p>

  <h3>Poder de cada palo</h3>
  <p>Además de su Fuerza, las cartas de cada palo activan su poder (aunque no sumen nada):</p>
  <table>
    <tr><td>${S} <b>PERFORAR</b></td><td>Si la formación lleva alguna pica, el daño sobrante al tirar un piso pasa al piso siguiente.</td></tr>
    <tr><td>${D} <b>ESQUIRLAS</b></td><td>Las demás torres reciben un tercio (hacia abajo) del valor de tus diamantes.</td></tr>
    <tr><td>${H} <b>REPARAR</b></td><td>El búnker recupera un tercio (hacia arriba) del valor de tus corazones. Máximo ${cfg.maxIntegrity}.</td></tr>
    <tr><td>${C} <b>MURO</b></td><td>Levantas un tercio (hacia arriba) del valor de tus tréboles como muro. Máximo ${cfg.wallCap}.</td></tr>
  </table>

  <h3>Golpe limpio</h3>
  <p>Tirar un piso con el <b>daño exacto</b> es la jugada maestra. La mesa te avisa antes de golpear.</p>
  <ul>
    <li>La <b>sirena calla</b> ese turno, cobras <b>1 de oro</b> y <b>robas 1 carta</b> de más.</li>
    <li>El piso de debajo pierde <b>un cuarto de su resistencia</b>.</li>
    <li>Empiezas una <b>racha</b>: tu próximo golpe resuena +0,5 por cada golpe limpio seguido (hasta +2). Se corta si el golpe no es limpio.</li>
  </ul>

  <h3>Estados de las torres</h3>
  <table>
    <tr><td><b>${TOWER_FX.fractura.name}</b></td><td>La provoca un golpe de un solo material (2 o más cartas, todas del mismo palo). ${TOWER_FX.fractura.desc}</td></tr>
    <tr><td><b>${TOWER_FX.sobrecarga.name}</b></td><td>La provoca un golpe que mezcla 3 palos o más. ${TOWER_FX.sobrecarga.desc}</td></tr>
    <tr><td><b>${TOWER_FX.apuntalado.name}</b></td><td>Lo traen algunos jefes y niveles de obra. ${TOWER_FX.apuntalado.desc}</td></tr>
  </table>

  <h3>Reglas especiales</h3>
  <ul>
    <li><b>Comodín · Huelga</b>: se juega solo sobre una torre. Su piso actual queda <b>desarmado</b> (amenaza 0 hasta que caiga) y la sirena no suena. El comodín sale de la obra.</li>
    <li><b>Fatiga de cimientos</b>: ninguna obra aguanta eternamente. ${cfg.fatigueStart === undefined ? `En campaña, desde el turno ${FATIGUE.start + 1}` : `Desde el turno ${cfg.fatigueStart + 1}`} y cada ${cfg.fatigueEvery ?? FATIGUE.every} turnos sube un nivel: cada nivel da <b>+${n(cfg.fatigueRes ?? FATIGUE.res)} de Resonancia</b> a todos los golpes y <b>+1 de amenaza</b> a todas las torres. La mesa avisa tres turnos antes.</li>
    <li><b>Colapso</b>: si la cantera se agota, la escombrera se baraja y vuelve a ser cantera, pero el búnker pierde <b>${cfg.collapseLoss}</b> de integridad (el muro no lo evita). Cada vuelta completa a la cantera lo encarece en 1.</li>
    <li><b>As de compañía</b>: un As forma jugada con <b>cualquier otra carta</b> (×${n(FORM.compania.r)}) y aporta el poder de su palo.</li>
    <li><b>Andamio</b>: una vez por turno, sin gastarlo, guardas una carta de tu mano en el hueco de reserva. No cuenta para el tamaño de la mano y se juega desde ahí. Si está ocupado, la guardada vuelve a la mano.</li>
    <li><b>Tiza de replanteo</b> (campaña en solitario): una vez por obra deshaces tu última jugada. La cantera se baraja de nuevo. En sala toda jugada es definitiva.</li>
    <li>Solo se puede <b>pasar</b> con la mano vacía.</li>
    <li><b>Victoria</b>: las cuatro torres en ruinas. <b>Derrota</b>: la integridad del búnker llega a 0.</li>
    <li>Modo <b>BRUTAL</b> (partida clásica): búnker de ${DIFFICULTY.brutal.maxIntegrity} y colapsos de ${DIFFICULTY.brutal.collapseLoss}.</li>
  </ul>

  <h3>Campaña</h3>
  <p>Un roguelike de construcción de mazo: <b>ocho obras</b> cada vez más duras, cuatro con <b>jefe</b>. Empiezas con un sobre de cartas especiales y, entre obra y obra, mejoras el mazo y el cinturón.</p>
  <ul>
    <li><b>El plano</b> enseña desde el principio qué jefe espera en cada obra y cuál es su maldición. En las obras sin jefe eliges <b>ruta</b>: cada una trae un <b>contrato</b> (una condición con premio; los de riesgo endurecen la obra y pagan siempre). O tomas el <b>atajo</b>: te saltas la obra (sin cobro ni ferretería) a cambio de una <b>etiqueta sindical</b>.</li>
    <li><b>Al cobrar</b> eliges una de tres opciones a la vista (dos cartas especiales y una carta de baraja ya marcada), o pasas por 3 de oro. Los jefes dejan además una herramienta de botín.</li>
    <li><b>La ferretería</b> vende herramientas, sobres de especiales (los abres y eliges 1 de 3), un sobre clandestino a ciegas y más barato, planos que suben de nivel una formación y la <b>mesa de forja</b>, que estampa un sello o un tratamiento en la carta que elijas. También repara el búnker, quema cartas y, pagando, <b>revuelve los cajones</b> para cambiar el surtido.</li>
    <li>Tras cada jefe intermedio hay un <b>hallazgo en los cimientos</b>: un dilema con premio y precio.</li>
    <li>Después de la octava obra puedes seguir a los <b>cimientos abisales</b>: obras sin final, cada una más dura.</li>
    <li><b>Semilla</b>: la misma semilla y las mismas decisiones dan exactamente la misma campaña. La <b>Obra diaria</b> usa la fecha como semilla, con la baraja de obra y sin mejoras del gremio.</li>
    <li><b>Reinicio rápido</b>: mantén <b>R</b> 0,7 segundos para volver a empezar con la misma baraja y el mismo nivel. No cuenta como derrota.</li>
  </ul>

  <h3>Niveles de obra</h3>
  <p>Ganar una campaña abre el nivel siguiente. Cada nivel añade un giro a todos los anteriores y da un 25 % más de renombre. Al ganar, la baraja y las herramientas del cinturón reciben su <b>sello de maestría</b> (bronce, hierro u oro) en la colección.</p>
  <table>
    <tr><th>Nivel</th><th>Nombre</th><th>Giro</th></tr>
    ${ASCENSIONS.map((a, i) => `<tr><td>${i + 1}</td><td>${a.name}</td><td>${a.desc}</td></tr>`).join('')}
  </table>

  <h3>Cinturón de herramientas</h3>
  <p>Llevas hasta <b>${TOOL_SLOTS} herramientas</b>, y se activan <b>de izquierda a derecha</b>. Puedes reordenarlas cuando quieras (arrastrando, o pulsando una y luego su hueco de destino), incluso en plena obra.
  Cada una dice lo que hace: <b>+F</b> suma Fuerza, <b>+R</b> suma Resonancia, <b>×R</b> multiplica la Resonancia acumulada, <b>⇉</b> copia a la de su derecha y <b>•</b> es pasiva. Regla de oro: primero lo que suma, al final lo que multiplica.</p>

  <h3>Sellos y tratamientos</h3>
  <table>
    <tr><th colspan="2">Sellos (tampón abajo a la izquierda)</th></tr>
    ${SEALS.map((s) => `<tr><td><b>${SEAL[s].name}</b></td><td>${SEAL[s].desc}</td></tr>`).join('')}
    <tr><th colspan="2">Tratamientos (cartabón arriba a la derecha)</th></tr>
    ${TREATMENTS.map((t) => `<tr><td><b>${TREATMENT[t].name}</b></td><td>${TREATMENT[t].desc}</td></tr>`).join('')}
  </table>
  <p>Una carta puede llevar un sello y un tratamiento a la vez. Las cartas destruidas (agrietadas que se hacen añicos, o quemadas) salen del mazo para siempre; algunas herramientas se ceban con cada carta destruida.</p>

  <h3>Las seis palabras clave</h3>
  <p>Solo estas seis palabras tienen significado propio; van en negrita y los globos de ayuda encadenan su definición.</p>
  <table>
    ${KEYWORDS.map((k) => `<tr><td><b>${k.name}</b></td><td>${k.desc}</td></tr>`).join('')}
  </table>

  <h3>Controles</h3>
  <p><b>1–9</b> eligen carta · <b>flechas</b> mueven el foco · <b>Enter</b> elige · <b>Espacio</b> golpea la torre apuntada · <b>Y</b> guarda en el andamio · <b>Z</b> gasta la tiza · <b>Supr</b> descarta · <b>Esc</b> suelta o vuelve atrás · <b>Tab</b> abre el mazo · <b>F</b> pantalla completa.</p>
  <p><b>Lupa de grabador</b>: clic derecho, pulsación larga o <b>L</b> sobre cualquier carta, herramienta, piso o jefe. Con mando: cruceta o palanca, A elegir, X golpear, Y andamio, B atrás, LB mazo, RB lupa, LT tiza, RT velocidad, Start ajustes. Los botones de la mesa enseñan su atajo según juegues con teclado o con mando. La tabla completa está en Ajustes.</p>

  <h3>Consejos de obra</h3>
  <ul>
    <li>Tirar una J destapa una Q con más amenaza: una torre a medio demoler es más peligrosa que una intacta.</li>
    <li>Una torre en ruinas convierte su palo en sirenas mudas. Terminar torres da turnos seguros.</li>
    <li>Jugar muchas cartas acelera la obra, pero agota la cantera y acerca el colapso.</li>
    <li>El orden importa dos veces: el de las cartas dentro del golpe y el de las herramientas en el cinturón.</li>
  </ul>`;
}
