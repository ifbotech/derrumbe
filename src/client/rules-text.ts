// El reglamento dentro del juego (Reglas en la portada, la mesa y la sala). Corto y claro: si algo
// necesita explicación larga, está mal contado. Las cifras salen siempre de las reglas del motor.
import { Config, DIFFICULTY, FORM, FORMATIONS, FORMATION_NAME, Formation, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../rules/engine';
import { KEYWORDS } from '../rules/keywords';
import { ASCENSIONS, FATIGUE } from '../rules/run';
import { TOOL_SLOTS } from '../rules/tools';
import { SUBTITLE, TITLE } from '../shared/brand';
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
  <p><b>${TITLE}</b> · ${SUBTITLE}. Un juego cooperativo de 1 a 4 jugadores con baraja francesa. Sois una <b>conjura</b>:
  tenéis que hacer caer los <b>cuatro tronos</b> de la corte antes de quedaros sin <b>Vida</b>. Se gana o se pierde en equipo.</p>

  <h3>La mesa</h3>
  <ul>
    <li>Las figuras forman <b>cuatro tronos</b>, uno por palo: la Casa de Picas, la de Diamantes, la de Corazones y la de Tréboles. Cada trono tiene su <b>guardia</b>: primero la <b>Sota</b>, luego la <b>Reina</b> y al final el <b>Rey</b>.</li>
    <li>Las 40 cartas de número y 2 Comodines forman el <b>Mazo</b>. Cada jugador roba su mano (${Math.max(...hand)} cartas${hand.length > 1 ? ` en solitario, ${Math.min(...hand)} en conjura` : ''}).</li>
    <li>Empiezas con <b>${cfg.maxIntegrity} de Vida</b> ♥ y sin <b>Escudo</b> 🛡.</li>
  </ul>
  <table>
    <tr><th>Guardia</th><th>Vida</th><th>Ataque ⚔</th></tr>
    <tr><td>Sota (J)</td><td>${cfg.floorHp[11]}</td><td>${cfg.floorThreat[11]}</td></tr>
    <tr><td>Reina (Q)</td><td>${cfg.floorHp[12]}</td><td>${cfg.floorThreat[12]}</td></tr>
    <tr><td>Rey (K)</td><td>${cfg.floorHp[13]}</td><td>${cfg.floorThreat[13]}</td></tr>
  </table>

  <h3>Tu turno</h3>
  <ul>
    <li><b>1 · Golpea</b> un trono con una <b>formación</b>. Antes de golpear, la mesa te enseña la cuenta.</li>
    <li>En vez de golpear puedes <b>descartar</b> las cartas que quieras, o jugar un <b>Comodín</b>.</li>
    <li><b>2 · Contraataque</b> ⚔: se voltea una carta del Mazo y ataca el trono de ese palo, con el Ataque de su guardia. Primero gasta tu Escudo; lo que sobra te quita Vida. Si ese trono ya cayó o sale un Comodín, no pasa nada.</li>
    <li><b>3 · Roba</b> hasta completar tu mano. Turno del siguiente.</li>
  </ul>

  <h3>Daño × Multi = Golpe</h3>
  <p>Cada jugada se cuenta igual: <b>Golpe = Daño × Multi</b>, redondeado. Se resuelve de izquierda a derecha y cada paso se ve en la mesa:</p>
  <ul>
    <li><b>La formación</b> pone la base de Daño y de Multi.</li>
    <li><b>Cada carta</b> suma su número como Daño, en el orden en que la elegiste. El <b>As</b> vale <b>11</b> y enlaza escaleras por abajo (A-2-3) y por arriba (9-10-A).</li>
    <li>Después actúan sus <b>acabados</b> y <b>sellos de lacre</b>, las <b>cartas especiales</b> que la acompañan y, por último, tus <b>Reliquias</b>.</li>
    <li>Lo que <b>suma</b> cuenta donde está. Lo que <b>multiplica</b> el Multi multiplica todo lo de antes: primero suma, al final multiplica.</li>
  </ul>
  <table>
    <tr><th>Formación</th><th>Cartas</th><th>Daño</th><th>Multi</th></tr>
    ${FORMATIONS.map((f) => `<tr><td>${FORMATION_NAME[f]}</td><td>${FORM_CARDS[f]}</td><td>+${FORM[f].f}</td><td>×${n(FORM[f].r)}</td></tr>`).join('')}
  </table>

  <h3>La rueda de palos</h3>
  <p>${S} corta ${D} · ${D} compra ${H} · ${H} doblega ${C} · ${C} quiebra ${S}. Con ventaja, cada carta suma el <b>doble</b> de Daño. Contra el trono de su propio palo no suma nada: ese trono es <b>Inmune</b>.</p>
  <table>
    <tr><th>Trono</th><th>Daño doble (×2)</th><th>Inmune (×0)</th></tr>
    <tr><td>${S} Picas</td><td>${C} tréboles</td><td>${S} picas</td></tr>
    <tr><td>${D} Diamantes</td><td>${S} picas</td><td>${D} diamantes</td></tr>
    <tr><td>${H} Corazones</td><td>${D} diamantes</td><td>${H} corazones</td></tr>
    <tr><td>${C} Tréboles</td><td>${H} corazones</td><td>${C} tréboles</td></tr>
  </table>

  <h3>El poder de cada palo</h3>
  <p>Además de su Daño, las cartas de cada palo hacen su poder (aunque no sumen nada):</p>
  <table>
    <tr><td>${S} <b>PERFORA</b></td><td>Si la jugada lleva alguna pica, lo que sobra al abatir a un guardia pasa al siguiente.</td></tr>
    <tr><td>${D} <b>SALPICA</b></td><td>Los demás tronos reciben un tercio (hacia abajo) del valor de tus diamantes.</td></tr>
    <tr><td>${H} <b>CURA</b></td><td>Recuperas un tercio (hacia arriba) del valor de tus corazones en Vida. Máximo ${cfg.maxIntegrity}.</td></tr>
    <tr><td>${C} <b>ESCUDO</b></td><td>Ganas un tercio (hacia arriba) del valor de tus tréboles en Escudo. Máximo ${cfg.wallCap}.</td></tr>
  </table>

  <h3>Golpe exacto</h3>
  <p>Abatir a un guardia con el <b>Golpe justo</b> es la jugada maestra (¡EXACTO!). La mesa te avisa antes de golpear.</p>
  <ul>
    <li>Ese turno <b>no hay Contraataque</b>, cobras <b>1 de oro</b> y <b>robas 1 carta</b> de más.</li>
    <li><b>Impulso</b>: el guardia siguiente pierde <b>un cuarto de su Vida</b>.</li>
    <li><b>Racha</b>: tu próximo Golpe suma +0,5 de Multi por cada Golpe exacto seguido (hasta +2). Se corta si el Golpe no es exacto.</li>
  </ul>

  <h3>Estados de los tronos</h3>
  <table>
    <tr><td><b>${TOWER_FX.fractura.name}</b></td><td>La deja una jugada de un solo palo (2 cartas o más). ${TOWER_FX.fractura.desc}</td></tr>
    <tr><td><b>${TOWER_FX.sobrecarga.name}</b></td><td>Lo deja una jugada que mezcla 3 palos o más. ${TOWER_FX.sobrecarga.desc}</td></tr>
    <tr><td><b>${TOWER_FX.apuntalado.name}</b></td><td>Lo traen algunos monarcas y Reinados. ${TOWER_FX.apuntalado.desc}</td></tr>
  </table>

  <h3>Más reglas</h3>
  <ul>
    <li><b>Comodín · Motín</b>: se juega solo sobre un trono. Su guardia queda <b>Desarmado</b> (Ataque 0 hasta que caiga) y no hay Contraataque. El Comodín sale del asalto.</li>
    <li><b>Asedio final</b>: ningún asedio dura para siempre. ${cfg.fatigueStart === undefined ? `En campaña, desde el turno ${FATIGUE.start + 1}` : `Desde el turno ${cfg.fatigueStart + 1}`} y cada ${cfg.fatigueEvery ?? FATIGUE.every} turnos sube un nivel: <b>+${n(cfg.fatigueRes ?? FATIGUE.res)} de Multi</b> a todos los Golpes y <b>+1 de Ataque</b> a todos los tronos. La mesa avisa tres turnos antes.</li>
    <li><b>Mazo agotado</b>: el Descarte se baraja y vuelve a ser el Mazo, pero pierdes <b>${cfg.collapseLoss} de Vida</b> (el Escudo no lo frena). Cada vez cuesta 1 más.</li>
    <li><b>As cómplice</b>: un As forma jugada con <b>cualquier otra carta</b> (×${n(FORM.compania.r)}) y aporta el poder de su palo.</li>
    <li><b>La Manga</b>: una vez por turno, sin gastarlo, te guardas una carta de la mano en la manga. No cuenta para el tamaño de la mano y se juega desde ahí. Si la manga está llena, la carta guardada vuelve a la mano.</li>
    <li><b>Rebobinar</b> ↩ (campaña en solitario): una vez por asalto deshaces tu última jugada. El Mazo se baraja de nuevo. En sala toda jugada es definitiva.</li>
    <li>Solo se puede <b>pasar</b> con la mano vacía.</li>
    <li><b>Victoria</b>: caen los cuatro tronos (<b>Corte vencida</b>). <b>Derrota</b>: tu Vida llega a 0 (<b>Conjura deshecha</b>).</li>
    <li>Modo <b>BRUTAL</b> (Asalto único): ${DIFFICULTY.brutal.maxIntegrity} de Vida y el Mazo agotado cuesta ${DIFFICULTY.brutal.collapseLoss}.</li>
  </ul>

  <h3>Campaña</h3>
  <p>Un roguelike de mazo: <b>ocho asaltos</b>, cada uno una sala del castillo y cada vez más duro; cuatro con <b>monarca</b>. Empiezas con un <b>Sobre lacrado</b> de cartas especiales y, entre asalto y asalto, mejoras el mazo y tus Reliquias.</p>
  <ul>
    <li><b>El Mapa del castillo</b> enseña desde el principio qué monarca espera en cada asalto y su <b>decreto</b>. En los asaltos sin monarca eliges <b>ruta</b>: cada una trae un <b>Juramento</b> (una condición con premio; los de riesgo endurecen el asalto y pagan siempre). O tomas el <b>Atajo</b>: te saltas el asalto (sin Botín ni Taberna) a cambio de un <b>Atajo de conspirador</b>.</li>
    <li><b>En el Botín</b> eliges una de tres opciones a la vista (dos cartas especiales y una carta de baraja ya marcada), o pasas por 3 de oro. Los monarcas dejan además una reliquia.</li>
    <li><b>La Taberna</b> del Tratante vende reliquias, Sobres lacrados (abres uno y eliges 1 de 3), un <b>Sobre a ciegas</b> más barato, <b>Pergaminos</b> que suben de nivel una formación y la <b>Mesa de lacre</b>, que pone un sello de lacre o un acabado en la carta que elijas. También cura, quema cartas en <b>la hoguera</b> y, pagando, <b>renueva la mesa</b>.</li>
    <li>Tras cada monarca intermedio hay un <b>Secreto de la cripta</b>: un dilema con premio y precio.</li>
    <li>Después del octavo asalto puedes seguir al <b>Trono infinito</b>: asaltos sin final, cada uno más duro.</li>
    <li><b>Semilla</b>: la misma semilla y las mismas decisiones dan la misma campaña. El <b>Asalto diario</b> usa la fecha como semilla, con la baraja de la conjura y sin mejoras de la Orden.</li>
    <li><b>Reinicio rápido</b>: mantén <b>R</b> 0,7 segundos para empezar de nuevo con la misma baraja y el mismo Reinado. No cuenta como derrota.</li>
  </ul>

  <h3>Reinados</h3>
  <p>Ganar una campaña abre el Reinado siguiente. Cada uno añade un giro a todos los anteriores y da un 25 % más de <b>Coronas</b> ✦. Al ganar, la baraja y tus Reliquias reciben su <b>sello de maestría</b> (bronce, hierro u oro) en la colección.</p>
  <table>
    <tr><th>Reinado</th><th>Nombre</th><th>Giro</th></tr>
    ${ASCENSIONS.map((a, i) => `<tr><td>${i + 1}</td><td>${a.name}</td><td>${a.desc}</td></tr>`).join('')}
  </table>

  <h3>Reliquias</h3>
  <p>Llevas hasta <b>${TOOL_SLOTS} reliquias</b>, y se activan <b>de izquierda a derecha</b>. Puedes reordenarlas cuando quieras (arrastrando, o pulsando una y luego su hueco), incluso en pleno asalto.
  Cada una dice lo que hace: <b>+D</b> suma Daño, <b>+M</b> suma Multi, <b>×M</b> multiplica el Multi acumulado, <b>⇉</b> copia a la de su derecha y <b>•</b> es pasiva. Regla de oro: primero lo que suma, al final lo que multiplica.</p>

  <h3>Sellos de lacre y acabados</h3>
  <table>
    <tr><th colspan="2">Sellos de lacre (gota abajo a la izquierda)</th></tr>
    ${SEALS.map((s) => `<tr><td><b>${SEAL[s].name}</b></td><td>${SEAL[s].desc}</td></tr>`).join('')}
    <tr><th colspan="2">Acabados (esquina de arriba a la derecha)</th></tr>
    ${TREATMENTS.map((t) => `<tr><td><b>${TREATMENT[t].name}</b></td><td>${TREATMENT[t].desc}</td></tr>`).join('')}
  </table>
  <p>Una carta puede llevar un sello y un acabado a la vez. Las cartas destruidas (las de cristal que se hacen añicos o las quemadas) salen del mazo para siempre; algunas reliquias se ceban con cada carta destruida.</p>

  <h3>Las seis palabras clave</h3>
  <p>Solo estas seis palabras tienen significado propio; van en negrita y los globos de ayuda encadenan su definición.</p>
  <table>
    ${KEYWORDS.map((k) => `<tr><td><b>${k.name}</b></td><td>${k.desc}</td></tr>`).join('')}
  </table>

  <h3>Controles</h3>
  <p><b>1–9</b> eligen carta · <b>flechas</b> mueven el foco · <b>Enter</b> elige · <b>Espacio</b> golpea el trono apuntado · <b>Y</b> guarda en la manga · <b>Z</b> rebobina · <b>Supr</b> descarta · <b>Esc</b> suelta o vuelve atrás · <b>Tab</b> abre el mazo · <b>F</b> pantalla completa.</p>
  <p><b>Lupa</b>: clic derecho, pulsación larga o <b>L</b> sobre cualquier carta, reliquia, guardia o monarca. Con mando: cruceta o palanca, A elegir, X golpear, Y manga, B atrás, LB mazo, RB lupa, LT rebobinar, RT velocidad, Start ajustes. Los botones de la mesa enseñan su atajo según juegues con teclado o con mando. La tabla completa está en Ajustes.</p>

  <h3>Consejos de la conjura</h3>
  <ul>
    <li>Abatir a la Sota deja paso a una Reina con más Ataque: un trono a medias es más peligroso que uno entero.</li>
    <li>Un trono caído ya no contraataca. Acabar tronos te da turnos seguros.</li>
    <li>Jugar muchas cartas acelera el asalto, pero vacía el Mazo y acerca el Mazo agotado.</li>
    <li>El orden importa dos veces: el de las cartas dentro de la jugada y el de tus Reliquias.</li>
  </ul>`;
}
