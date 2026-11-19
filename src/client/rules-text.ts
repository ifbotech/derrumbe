// El reglamento dentro del juego (Reglas en la portada, la mesa y la sala). Corto y claro: si algo
// necesita explicación larga, está mal contado. Las cifras salen siempre de las reglas del motor.
import { CABALLO, Config, DIFFICULTY, FORM, FORMATIONS, FORMATION_NAME, Formation, REY, SEAL, SEALS, SOTA, TOWER_FX, TREATMENT, TREATMENTS } from '../rules/engine';
import { KEYWORDS } from '../rules/keywords';
import { BALANCE } from '../rules/balance-config';
import { ASCENSIONS, FURIA, LAST_STAGE, STAGES } from '../rules/run';
import { TOOL_SLOTS } from '../rules/tools';
import { BALANCE as B } from '../rules/balance-config';
import { REY_IDS, UMBRALES_REY } from '../rules/reyes';
import { SUBTITLE, TITLE } from '../shared/brand';
import { tFor } from '../shared/i18n';
import { RAMAS } from '../rules/arbol';
import { suitSvg } from './card';

/** «Mejor jugada: …» con el nombre en negrita (la regla es de reglas-balance: `regla.mejor`). */
const mejor = (l: 'es' | 'en') => tFor(l, 'regla.mejor').replace(/^([^:]+):/, '<b>$1</b>:');
const ramas = (l: 'es' | 'en') => RAMAS.map((r) => tFor(l, `rama.${r.id}.nombre`)).join(', ');

/** V12 · lo que cae, la tirada de huesos y el Altar, en pocas líneas. */
const caeEs = () => `<h3>Lo que cae, los huesos y el Altar</h3>
  <ul>
    <li><b>Lo que cae</b>: cada golpe suelta <b>Esquirlas de Corona</b>; cada guardia abatido, una moneda y más esquirlas; cada Golpe exacto, esquirlas y una <b>gota de lacre</b>. Todo va solo a tu bolsa: no se pierde nada por no recogerlo.</li>
    <li><b>Gotas de lacre</b>: ${tFor('es', 'pieza.gota.desc')}</li>
    <li><b>Tirada de huesos</b>: al ganar un asalto, el <b>Dado de oro</b> multiplica las monedas que cayeron en él y el <b>Dado de la Corona</b>, las esquirlas.</li>
    <li><b>Altar</b>: las esquirlas se guardan aunque pierdas y se gastan en mejoras para siempre, rama a rama (${ramas('es')}). Cada rango pide el anterior.</li>
    <li>${mejor('es')}</li>
  </ul>`;
const caeEn = () => `<h3>What drops, the bones and the Altar</h3>
  <ul>
    <li><b>What drops</b>: every hit drops <b>Crown Shards</b>; every guard you take down, a coin and more shards; every Exact Hit, shards and a <b>wax drop</b>. It all goes to your purse on its own: nothing is lost by not picking it up.</li>
    <li><b>Wax drops</b>: ${tFor('en', 'pieza.gota.desc')}</li>
    <li><b>Bone roll</b>: when you win an assault, the <b>Gold Die</b> multiplies the coins that dropped in it and the <b>Crown Die</b>, the shards.</li>
    <li><b>The Altar</b>: shards stay with you even if you lose and buy upgrades for good, branch by branch (${ramas('en')}). Each rank needs the one before.</li>
    <li>${mejor('en')}</li>
  </ul>`;
import { acabD, acabN, formN, fxD, fxN, getLang, marca, numL, palabraD, palabraN, reinD, reinN, selloD, selloN } from './lengua';

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
  parpalo: '2 del mismo palo (solo en el Truco)',
  quince: '2 o más que suman 15 (solo en la Escoba)',
};
const n = (x: number) => String(x).replace('.', ',');
/** Cifras que el reglamento lee de la configuración (V11: todas enteras). */
const RACHA = BALANCE.golpe.racha;
const RACHA_TOPE = BALANCE.golpe.racha * BALANCE.golpe.rachaTope;
const MONARCAS = STAGES.filter((s) => s.boss).length;
/** V40 1c · la tabla de los 4 Reyes, con sus bonos de nivel con 2 y 4 piezas. */
const reyesTabla = (l: 'es' | 'en') =>
  `<table><tr><th>${l === 'es' ? 'Rey' : 'King'}</th>${UMBRALES_REY.map((u) => `<th>${u}</th>`).join('')}</tr>${REY_IDS.map(
    (r) => `<tr><td><b>${tFor(l, `rey.${r}.nombre`)}</b></td>${[1, 2].map((i) => `<td>${tFor(l, `rey.${r}.bono.${i}`)}</td>`).join('')}</tr>`,
  ).join('')}</table>`;

function rulesEs(cfg: Config): string {
  const S = suitSvg('S');
  const D = suitSvg('D');
  const H = suitSvg('H');
  const C = suitSvg('C');
  const hand = Object.values(cfg.handSize);
  return `
  <p><b>${TITLE}</b> · ${SUBTITLE}. Un juego cooperativo de 1 a 4 jugadores con baraja española. Sois una <b>conjura</b>:
  tienen que hacer caer los <b>tronos</b> de la corte antes de quedarse sin <b>Vida</b>. Se gana o se pierde en equipo.</p>
  <p><b>Un enemigo a la vez</b>: las Casas se asaltan de una en una. En el centro de la mesa está el <b>enemigo activo</b> (el guardia que tenés delante) y, a su lado, la <b>fila</b> con los que vienen después.</p>

  <h3>La mesa</h3>
  <ul>
    <li>Las figuras forman hasta <b>cuatro tronos</b>, uno por palo: la Casa de Espadas, la de Oros, la de Copas y la de Bastos. Cada trono tiene su <b>guardia</b>: primero la <b>Sota</b> (10), luego el <b>Caballo</b> (11) y al final el <b>Rey</b> (12). En campaña, el primer asalto tiene dos tronos y el segundo, tres.</li>
    <li>Las 36 cartas de número (del 1 al 9 de cada palo) y 2 Comodines forman el <b>Mazo</b>. Cada jugador roba su mano (${Math.max(...hand)} cartas${hand.length > 1 ? ` en solitario, ${Math.min(...hand)} en conjura` : ''}).</li>
    <li>Empezás con <b>${cfg.maxIntegrity} de Vida</b> y sin <b>Escudo</b> 🛡.</li>
  </ul>
  <table>
    <tr><th>Guardia</th><th>Vida</th><th>Ataque ⚔</th></tr>
    <tr><td>Sota (10)</td><td>${cfg.floorHp[SOTA]}</td><td>${cfg.floorThreat[SOTA]}</td></tr>
    <tr><td>Caballo (11)</td><td>${cfg.floorHp[CABALLO]}</td><td>${cfg.floorThreat[CABALLO]}</td></tr>
    <tr><td>Rey (12)</td><td>${cfg.floorHp[REY]}</td><td>${cfg.floorThreat[REY]}</td></tr>
  </table>

  <h3>Tu turno</h3>
  <ul>
    <li><b>1 · Golpea</b> al enemigo activo con una <b>formación</b>. Antes de golpear, la mesa te enseña la cuenta.</li>
    <li>En vez de golpear podés <b>descartar</b> las cartas que quieras, o jugar un <b>Comodín</b>.</li>
    <li><b>2 · Contraataque</b> ⚔: si no lo has abatido, el enemigo activo te pega con su Ataque (más su <b>Furia</b>). Primero gasta tu Escudo; lo que sobra te quita Vida.</li>
    <li><b>3 · Roba</b> hasta completar tu mano. Turno del siguiente.</li>
  </ul>

  <h3>Daño × Multi = Golpe</h3>
  <p>Cada jugada se cuenta igual: <b>Golpe = Daño × Multi</b>, y el Multi siempre es entero. <b>El orden no importa</b>: la mesa hace la cuenta y te la enseña antes de golpear.</p>
  <ul>
    <li><b>Daño</b>: se suma todo. La base de la formación, el número de cada carta y lo que añadan <b>acabados</b>, <b>Trampas del Bufón</b> y <b>Amuletos</b>. El <b>As</b> (el 1) vale <b>11</b> y enlaza escaleras por abajo (1-2-3) y por arriba (8-9-1).</li>
    <li><b>Multi</b>: se suma todo (la formación, la Racha y lo que añadan acabados, Trampas y Amuletos) y, al final, se aplican los multiplicadores (×2, ×3…).</li>
  </ul>
  <table>
    <tr><th>Formación</th><th>Cartas</th><th>Daño</th><th>Multi</th></tr>
    ${FORMATIONS.map((f) => `<tr><td>${FORMATION_NAME[f]}</td><td>${FORM_CARDS[f]}</td><td>+${FORM[f].f}</td><td>×${n(FORM[f].r)}</td></tr>`).join('')}
  </table>

  <h3>Inmune a su propio palo</h3>
  <p>Una sola regla de palos: contra el trono de su propio palo, una carta hace <b>0</b> de Daño (ese trono es <b>Inmune</b> a su palo y lo dice su placa de hierro). Contra los demás tronos, su número. Su poder de palo cuenta siempre.</p>

  <h3>El poder de cada palo</h3>
  <p>Además de su Daño, las cartas de cada palo hacen su poder (aunque no sumen nada):</p>
  <table>
    <tr><td>${S} <b>PERFORA</b></td><td>Si la jugada lleva alguna carta de Espadas, lo que sobra al abatir a un guardia pasa al siguiente.</td></tr>
    <tr><td>${D} <b>SALPICA</b></td><td>Cada carta de Oros del golpe hace ${cfg.salpicaPorCarta} a cada uno de los otros tronos.</td></tr>
    <tr><td>${H} <b>CURA</b></td><td>Cada carta de Copas del golpe te cura ${cfg.curaPorCarta} de Vida. Máximo ${cfg.maxIntegrity}.</td></tr>
    <tr><td>${C} <b>ESCUDO</b></td><td>Cada carta de Bastos del golpe da +${cfg.escudoPorCarta} de Escudo. Máximo ${cfg.wallCap}.</td></tr>
  </table>

  <h3>Golpe exacto</h3>
  <p>Abatir a un guardia con el <b>Golpe justo</b> es la jugada maestra (¡EXACTO!). La mesa te avisa antes de golpear.</p>
  <ul>
    <li>Ese turno <b>no hay Contraataque</b>, cobrás <b>1 de oro</b> y <b>robás 1 carta</b> de más.</li>
    <li><b>Impulso</b>: el guardia siguiente pierde <b>un cuarto de su Vida</b>.</li>
    <li><b>Racha</b>: tu próximo Golpe suma +${RACHA} de Multi por cada Golpe exacto seguido (hasta +${RACHA_TOPE}). Se corta si el Golpe no es exacto.</li>
  </ul>

  <h3>Estados de los tronos</h3>
  <table>
    <tr><td><b>${TOWER_FX.fractura.name}</b></td><td>La deja una jugada de un solo palo (2 cartas o más). ${TOWER_FX.fractura.desc}</td></tr>
    <tr><td><b>${TOWER_FX.sobrecarga.name}</b></td><td>Lo deja una jugada que mezcla 3 palos o más. ${TOWER_FX.sobrecarga.desc}</td></tr>
  </table>

  <h3>Más reglas</h3>
  <ul>
    <li><b>Comodín · Motín</b>: se juega solo sobre un trono. Ese trono queda <b>Aturdido</b> (se salta su próximo Contraataque) y este turno no hay Contraataque. El Comodín sale del asalto.</li>
    <li><b>Furia</b>: cada punto de Furia es <b>+1 de Ataque</b> en todos los Contraataques; se ve junto al ⚔ del enemigo. Sube con cada <b>Mazo agotado</b> y, contra un monarca, cada turno (<b>Furia del Rey</b>).${cfg.fatigueStart === undefined ? '' : ` En el Asalto único sube además desde el turno ${cfg.fatigueStart + 1}, cada ${cfg.fatigueEvery} turnos.`}</li>
    <li><b>Mazo agotado</b>: el Descarte se baraja y vuelve a ser el Mazo. <b>Barajar no te quita Vida</b>, pero la <b>Furia</b> sube ${cfg.collapseSiege ? cfg.collapseSiege : FURIA.mazo} (en campaña, ${FURIA.mazo}).</li>
    <li><b>As cómplice</b>: un As forma jugada con <b>cualquier otra carta</b> (×${n(FORM.compania.r)}) y aporta el poder de su palo.</li>
    <li><b>La Manga</b>: una vez por turno, sin gastarlo, te guardás una carta de la mano en la manga. No cuenta para el tamaño de la mano y se juega desde ahí. Si la manga está llena, la carta guardada vuelve a la mano.</li>
    <li><b>Rebobinar</b> ↩ (campaña en solitario): una vez por asalto deshaces tu última jugada. El Mazo se baraja de nuevo. En sala toda jugada es definitiva.</li>
    <li>Solo se puede <b>pasar</b> con la mano vacía.</li>
    <li><b>Victoria</b>: caen todos los tronos (<b>Corte vencida</b>). <b>Derrota</b>: tu Vida llega a 0 (<b>Conjura deshecha</b>).</li>
    <li>Modo <b>BRUTAL</b> (Asalto único): ${DIFFICULTY.brutal.maxIntegrity} de Vida y cada Mazo agotado sube la Furia ${DIFFICULTY.brutal.collapseSiege}.</li>
  </ul>

  <h3>Campaña</h3>
  <p>Un roguelike de mazo: <b>${LAST_STAGE} asaltos</b>, cada uno una sala del castillo y cada vez más duro; ${MONARCAS} con <b>monarca</b>, y el último, en el Salón del Trono, con el <b>Rey Tirano</b>. Empezás con un <b>Sobre lacrado</b> de cartas especiales y con un <b>Don de la Conjura</b> que elegís entre tres (un Amuleto, un sello de lacre o una bolsa de oro) y, entre asalto y asalto, mejorás el mazo y tus Amuletos.</p>
  <ul>
    <li><b>El Mapa</b>: antes de cada asalto (desde el 2) elegís un camino. <b>Guardia Bravo</b>: un guardia solo y más duro que paga con oro, un Amuleto y una Bendición. <b>Santuario del Bufón</b>: un trato. <b>Fogón</b>: Curar o Purgar gratis. <b>La Pulpería</b>, siempre al alcance: comprar, Purgar y Curar con oro. Tras cada combate, el <b>Botín</b>: cada parte se cobra o se salta, y la «Elegí una» ofrece tres.</li>
    <li><b>En el Botín</b> elegís una de tres opciones a la vista (dos cartas especiales y una carta de baraja ya marcada), o pasás por 3 de oro. Al caer, cada monarca abre su <b>Cofre</b>: elegís uno de tres Amuletos, Raros o mejores.</li>
    <li><b>Monarcas</b>: el monarca es uno de los <b>4 Reyes</b>, el último guardia de la Casa de su palo. Llega con retrato y rasgo propio, tiene ×${FURIA.jefeVida} de Vida y, mientras lo tenés delante, su <b>Furia del Rey</b> sube cada turno: hay que tumbarlo deprisa. Te habla según las Bendiciones que llevás.</li>
    <li><b>La Pulpería</b> del Tratante vende Amuletos, Sobres lacrados (abrís uno y elegís 1 de 3), un <b>Sobre a ciegas</b> más barato, <b>Pergaminos</b> que suben de nivel una formación y la <b>Mesa de lacre</b>, que pone un sello de lacre o un acabado en la carta que elijas. También cura, quema cartas en <b>la hoguera</b> y, pagando, <b>renueva la mesa</b>.</li>
    <li>Tras cada monarca intermedio hay un <b>Santuario de la cripta</b>: una apuesta (la Rueda del destino, doble o nada de esquirlas, un dado bendito o maldito, el altar de sangre que cambia Vida por una Bendición) o un dilema con premio y precio.</li>
    <li>Después del último asalto podés seguir al <b>Trono infinito</b>: asaltos sin final, cada uno más duro.</li>
    <li><b>Semilla</b>: la misma semilla y las mismas decisiones dan la misma campaña.</li>
    <li><b>Reinicio rápido</b>: mantené <b>R</b> 0,7 segundos para empezar de nuevo con la misma baraja y el mismo Reinado. No cuenta como derrota.</li>
  </ul>

  ${caeEs()}

  <h3>Reinados</h3>
  <p>Ganar una campaña abre el Reinado siguiente. Cada uno añade un giro a todos los anteriores y da un 25 % más de <b>esquirlas</b> ✦. Al ganar, la baraja y tus Amuletos reciben su <b>sello de maestría</b> (bronce, hierro u oro) en la colección.</p>
  <table>
    <tr><th>Reinado</th><th>Nombre</th><th>Giro</th></tr>
    ${ASCENSIONS.map((a, i) => `<tr><td>${i + 1}</td><td>${a.name}</td><td>${a.desc}</td></tr>`).join('')}
  </table>

  <h3>Amuletos</h3>
  <p>Llevás hasta <b>${TOOL_SLOTS} Amuletos</b> (uno más por nivel de la <b>Faja ancha</b> del Altar). <b>No se ordenan</b>: cada uno nuevo va al final de la tira y ninguno depende de su hueco. En la cuenta primero se suma todo y al final se multiplica.
  Cada uno es de la familia de un Rey y cuenta como pieza suya para los niveles [2/4]. Su letra <b>S</b>, <b>A</b> o <b>B</b> es su sello de nivel (lo mide el laboratorio) y <b>★</b> avisa de que encaja con tu Mazo o con un nivel. <b>+D</b> suma Daño, <b>+M</b> suma Multi, <b>×M</b> multiplica el Multi acumulado y <b>•</b> es pasivo.</p>

  <h3>Los 4 Reyes y sus Bendiciones</h3>
  <p>Al empezar la campaña ofrecen ${B.oferta.inicio} Reyes y, antes de cada asalto, ${B.oferta.entre}: cada uno pone una <b>Bendición</b> suya y te quedás con una. Cada Bendición tiene un efecto y una <b>condición de carga</b>: cada vez que se cumple suma una carga para toda la campaña (la mesa lo enseña como «Espadas +6»). Con <b>${UMBRALES_REY.join(' y ')}</b> piezas de un mismo Rey se encienden sus bonos. Las <b>Duales</b> son de dos Reyes y solo salen si ya llevás una de cada uno.</p>
  ${reyesTabla('es')}

  <h3>Sellos de lacre y acabados</h3>
  <table>
    <tr><th colspan="2">Sellos de lacre (gota abajo a la izquierda)</th></tr>
    ${SEALS.map((s) => `<tr><td><b>${SEAL[s].name}</b></td><td>${SEAL[s].desc}</td></tr>`).join('')}
    <tr><th colspan="2">Acabados (esquina de arriba a la derecha)</th></tr>
    ${TREATMENTS.map((t) => `<tr><td><b>${TREATMENT[t].name}</b></td><td>${TREATMENT[t].desc}</td></tr>`).join('')}
  </table>
  <p>Una carta puede llevar un sello y un acabado a la vez. Las cartas destruidas (las de cristal que se hacen añicos o las quemadas) salen del mazo para siempre.</p>

  <h3>Las ${KEYWORDS.length === 5 ? 'cinco' : KEYWORDS.length} palabras clave</h3>
  <p>Solo estas palabras tienen significado propio; van en negrita y los globos de ayuda encadenan su definición.</p>
  <table>
    ${KEYWORDS.map((k) => `<tr><td><b>${k.name}</b></td><td>${k.desc}</td></tr>`).join('')}
  </table>

  <h3>Controles</h3>
  <p><b>1–9</b> eligen carta · <b>flechas</b> mueven el foco · <b>Enter</b> elige · <b>Espacio</b> golpea al enemigo activo · <b>Y</b> guarda en la manga · <b>Z</b> rebobina · <b>Q</b> Mejor jugada · <b>A</b> AUTO · <b>Supr</b> descarta · <b>Esc</b> suelta o vuelve atrás · <b>Tab</b> abre el mazo · <b>F</b> pantalla completa.</p>
  <p><b>Lupa</b>: clic derecho, pulsación larga o <b>L</b> sobre cualquier carta, Amuleto, guardia o monarca. Con mando: cruceta o palanca, A elegir, X golpear, Y manga, B atrás, LB mazo, RB lupa, LT rebobinar, RT velocidad, Start ajustes. Los botones de la mesa enseñan su atajo según juegues con teclado o con mando. La tabla completa está en Ajustes.</p>

  <h3>Consejos de la conjura</h3>
  <ul>
    <li>Abatir a la Sota deja paso a un Caballo con más Ataque: mira la fila antes de gastar la mano.</li>
    <li>Seguí a un Rey y buscá su bono de 4: es lo que gana las campañas.</li>
    <li>Jugar muchas cartas acelera el asalto, pero vacía el Mazo y acerca el Mazo agotado.</li>
    <li>Contra el monarca, la Furia del Rey no espera: guarda tu mejor mano para él.</li>
  </ul>`;
}

// ───────────── V10 · el mismo reglamento en inglés ─────────────
// Mismas cifras (salen del motor) y mismo orden; los nombres propios, de los diccionarios (lengua.ts).
const FORM_CARDS_EN: Record<Formation, string> = {
  solo: '1 card',
  compania: 'an Ace with any other card',
  grupo: '2 or 3 of the same number',
  escalera: '3 or more numbers in a row, any suit',
  doblepar: '2 pairs',
  color: '5 or more of the same suit',
  full: 'three of a kind and a pair',
  escaleracolor: '3 or more in a row of the same suit',
  poker: '4 of the same number',
  parpalo: '2 of the same suit (Truco only)',
  quince: '2 or more adding up to 15 (Escoba only)',
};

function rulesEn(cfg: Config): string {
  const S = suitSvg('S');
  const D = suitSvg('D');
  const H = suitSvg('H');
  const C = suitSvg('C');
  const hand = Object.values(cfg.handSize);
  const b = marca();
  const x = (v: number) => numL(v);
  return `
  <p><b>${b.title}</b> · ${b.subtitle}. A co-op game for 1 to 4 players with a Spanish deck of cards. You are a <b>conspiracy</b>:
  you must bring down the <b>thrones</b> of the court before you run out of <b>Health</b>. You win or lose as a team.</p>
  <p><b>One enemy at a time</b>: the Houses are stormed one by one. In the middle of the table is the <b>active enemy</b> (the guard in front of you) and, beside it, the <b>queue</b> with those coming next.</p>

  <h3>The table</h3>
  <ul>
    <li>The face cards form up to <b>four thrones</b>, one per suit: the House of Swords, of Coins, of Cups and of Clubs. Each throne has its <b>guard</b>: first the <b>Knave</b> (10), then the <b>Knight</b> (11) and last the <b>King</b> (12). In a campaign, the first assault has two thrones and the second, three.</li>
    <li>The 36 number cards (1 to 9 of each suit) and 2 Jokers form the <b>Deck</b>. Each player draws a hand (${Math.max(...hand)} cards${hand.length > 1 ? ` solo, ${Math.min(...hand)} with a crew` : ''}).</li>
    <li>You start with <b>${cfg.maxIntegrity} Health</b> and no <b>Shield</b> 🛡.</li>
  </ul>
  <table>
    <tr><th>Guard</th><th>Health</th><th>Attack ⚔</th></tr>
    <tr><td>Knave (10)</td><td>${cfg.floorHp[SOTA]}</td><td>${cfg.floorThreat[SOTA]}</td></tr>
    <tr><td>Knight (11)</td><td>${cfg.floorHp[CABALLO]}</td><td>${cfg.floorThreat[CABALLO]}</td></tr>
    <tr><td>King (12)</td><td>${cfg.floorHp[REY]}</td><td>${cfg.floorThreat[REY]}</td></tr>
  </table>

  <h3>Your turn</h3>
  <ul>
    <li><b>1 · Hit</b> the active enemy with a <b>formation</b>. Before you hit, the table shows you the tally.</li>
    <li>Instead of hitting you can <b>discard</b> any cards you like, or play a <b>Joker</b>.</li>
    <li><b>2 · Counterattack</b> ⚔: if you did not defeat it, the active enemy hits you with its Attack (plus its <b>Fury</b>). Your Shield is spent first; whatever is left takes Health.</li>
    <li><b>3 · Draw</b> up to your full hand. Next player's turn.</li>
  </ul>

  <h3>Damage × Mult = Hit</h3>
  <p>Every play is counted the same way: <b>Hit = Damage × Mult</b>, and Mult is always a whole number. <b>Order does not matter</b>: the table does the count and shows it before you strike.</p>
  <ul>
    <li><b>Damage</b>: everything is added up. The formation’s base, the number on each card and whatever <b>finishes</b>, <b>Jester’s Tricks</b> and <b>Amulets</b> add. The <b>Ace</b> (the 1) is worth <b>11</b> and links straights at the bottom (1-2-3) and at the top (8-9-1).</li>
    <li><b>Mult</b>: everything is added up (the formation, the Streak and whatever finishes, Tricks and Amulets add) and, at the end, the multipliers apply (×2, ×3…).</li>
  </ul>
  <table>
    <tr><th>Formation</th><th>Cards</th><th>Damage</th><th>Mult</th></tr>
    ${FORMATIONS.map((f) => `<tr><td>${formN(f)}</td><td>${FORM_CARDS_EN[f]}</td><td>+${FORM[f].f}</td><td>×${x(FORM[f].r)}</td></tr>`).join('')}
  </table>

  <h3>Immune to its own suit</h3>
  <p>A single suit rule: against the throne of its own suit, a card deals <b>0</b> Damage (that throne is <b>Immune</b> to its suit, and its iron plate says so). Against the other thrones, its number. Its suit power always counts.</p>

  <h3>The power of each suit</h3>
  <p>Besides their Damage, the cards of each suit trigger their power (even if they add nothing):</p>
  <table>
    <tr><td>${S} <b>PIERCE</b></td><td>If the play has any Swords card, what is left over after defeating a guard passes to the next one.</td></tr>
    <tr><td>${D} <b>SPLASH</b></td><td>Each Coins card in the hit deals ${cfg.salpicaPorCarta} to each of the other thrones.</td></tr>
    <tr><td>${H} <b>HEAL</b></td><td>Each Cups card in the hit heals you ${cfg.curaPorCarta} Health. Up to ${cfg.maxIntegrity}.</td></tr>
    <tr><td>${C} <b>SHIELD</b></td><td>Each Clubs card in the hit gives +${cfg.escudoPorCarta} Shield. Up to ${cfg.wallCap}.</td></tr>
  </table>

  <h3>Exact Hit</h3>
  <p>Defeating a guard with the <b>exact Hit</b> is the master play (EXACT!). The table warns you before you hit.</p>
  <ul>
    <li>That turn there is <b>no Counterattack</b>, you collect <b>1 gold</b> and <b>draw 1 extra card</b>.</li>
    <li><b>Momentum</b>: the next guard loses <b>a quarter of its Health</b>.</li>
    <li><b>Streak</b>: your next Hit adds +${RACHA} Mult for each Exact Hit in a row (up to +${RACHA_TOPE}). It breaks if the Hit is not exact.</li>
  </ul>

  <h3>Throne states</h3>
  <table>
    <tr><td><b>${fxN('fractura')}</b></td><td>Left by a play of a single suit (2 cards or more). ${fxD('fractura')}</td></tr>
    <tr><td><b>${fxN('sobrecarga')}</b></td><td>Left by a play mixing 3 suits or more. ${fxD('sobrecarga')}</td></tr>
  </table>

  <h3>More rules</h3>
  <ul>
    <li><b>Joker · Mutiny</b>: played alone on a throne. That throne is <b>Stunned</b> (it skips its next Counterattack) and there is no Counterattack this turn. The Joker leaves the assault.</li>
    <li><b>Fury</b>: each point of Fury is <b>+1 Attack</b> on every Counterattack; it shows next to the enemy’s ⚔. It rises each time the <b>Deck runs out</b> and, against a monarch, every turn (<b>King’s Fury</b>).${cfg.fatigueStart === undefined ? '' : ` In the Single Assault it also rises from turn ${cfg.fatigueStart + 1}, every ${cfg.fatigueEvery} turns.`}</li>
    <li><b>Deck run out</b>: the Discard is shuffled and becomes the Deck again. <b>Shuffling costs no Health</b>, but <b>Fury</b> rises ${cfg.collapseSiege ? cfg.collapseSiege : FURIA.mazo} (in a campaign, ${FURIA.mazo}).</li>
    <li><b>Accomplice Ace</b>: an Ace makes a play with <b>any other card</b> (×${x(FORM.compania.r)}) and brings the power of its suit.</li>
    <li><b>Up the Sleeve</b>: once per turn, without spending it, you keep a card from your hand Up the Sleeve. It does not count towards hand size and is played from there. If the sleeve is full, the stored card goes back to your hand.</li>
    <li><b>Rewind</b> ↩ (solo campaign): once per assault you undo your last play. The Deck is shuffled again. In a room every play is final.</li>
    <li>You can only <b>pass</b> with an empty hand.</li>
    <li><b>Victory</b>: every throne falls (<b>Court Defeated</b>). <b>Defeat</b>: your Health reaches 0 (<b>Conspiracy Undone</b>).</li>
    <li><b>BRUTAL</b> mode (Single Assault): ${DIFFICULTY.brutal.maxIntegrity} Health and each time the Deck runs out Fury rises ${DIFFICULTY.brutal.collapseSiege}.</li>
  </ul>

  <h3>Campaign</h3>
  <p>A deck-building roguelike: <b>${LAST_STAGE} assaults</b>, each one a hall of the castle and each harder than the last; ${MONARCAS} of them with a <b>monarch</b>, and the last one, in the Throne Room, with the <b>Tyrant King</b>. You start with a <b>Sealed Pack</b> of special cards and a <b>Conspiracy’s Gift</b> you choose from three (an Amulet, a wax seal or a purse of gold) and, between assaults, you improve your deck and your Amulets.</p>
  <ul>
    <li><b>The Map</b>: before each assault (from the 2nd on) you choose a path. <b>Elite Guard</b>: a lone, tougher guard that pays with gold, an amulet and a Blessing. <b>Jester's Shrine</b>: a deal. <b>Campfire</b>: Heal or Purge for free. <b>The General Store</b>, always within reach: buy, Purge and Heal with gold. After each fight, the <b>Spoils</b>: each part is collected or skipped, and “Choose one” offers three.</li>
    <li><b>In the Spoils</b> you pick one of three options in view (two special cards and one already marked deck card), or pass for 3 gold. When a monarch falls it opens its <b>Chest</b>: you pick one of three Amulets, Rare or better.</li>
    <li><b>Monarchs</b>: the monarch is one of the <b>4 Kings</b>, the last guard of the House of his suit. He arrives with a portrait and his own trait, has ×${FURIA.jefeVida} Health and, while he is in front of you, his <b>King’s Fury</b> rises every turn: bring him down fast. He speaks to you according to the Blessings you carry.</li>
    <li>In <b>The General Store</b>, the Storekeeper sells amulets, Sealed Packs (you open one and pick 1 of 3), a cheaper <b>Blind Pack</b>, <b>Scrolls</b> that level up a formation and the <b>Wax Table</b>, which puts a wax seal or a finish on the card you choose. It also heals, burns cards in <b>the Bonfire</b> and, for a price, <b>refreshes the table</b>.</li>
    <li>After each middle monarch there is a <b>Crypt Shrine</b>: a gamble (the Wheel of Fate, double or nothing on shards, a blessed or cursed die, the Altar of Blood that trades Health for a Blessing) or a dilemma with a reward and a price.</li>
    <li>After the last assault you can go on to the <b>Endless Throne</b>: assaults without end, each one harder.</li>
    <li><b>Seed</b>: the same seed and the same choices give the same campaign.</li>
    <li><b>Quick restart</b>: hold <b>R</b> for ${x(0.7)} seconds to start again with the same deck and the same Reign. It does not count as a defeat.</li>
  </ul>

  ${caeEn()}

  <h3>Reigns</h3>
  <p>Winning a campaign opens the next Reign. Each one adds a twist to all the previous ones and gives 25 % more <b>shards</b> ✦. When you win, the deck and your Amulets get their <b>mastery seal</b> (bronze, iron or gold) in the collection.</p>
  <table>
    <tr><th>Reign</th><th>Name</th><th>Twist</th></tr>
    ${ASCENSIONS.map((_, i) => `<tr><td>${i + 1}</td><td>${reinN(i)}</td><td>${reinD(i)}</td></tr>`).join('')}
  </table>

  <h3>Amulets</h3>
  <p>You carry up to <b>${TOOL_SLOTS} amulets</b> (one more per level of the Altar’s <b>Wide Sash</b>). <b>You never sort them</b>: each new one goes to the end of the row and none depends on its slot. In the count everything is added first and multiplied at the end.
  Each one belongs to a King’s family and counts as one of his pieces for the [2/4] levels. Its letter <b>S</b>, <b>A</b> or <b>B</b> is its tier seal (measured by the lab) and <b>★</b> warns that it fits your Deck or a level. <b>+D</b> adds Damage, <b>+M</b> adds Mult, <b>×M</b> multiplies the Mult so far and <b>•</b> is passive.</p>

  <h3>The 4 Kings and their Blessings</h3>
  <p>At the start of the campaign ${B.oferta.inicio} Kings make an offer and, before each assault, ${B.oferta.entre}: each one puts forward a <b>Blessing</b> of his and you keep one. Each Blessing has an effect and a <b>charge condition</b>: every time it is met it adds a charge for the whole campaign (the table shows it as “Swords +6”). With <b>${UMBRALES_REY.join(' and ')}</b> pieces of the same King his bonuses light up. <b>Dual</b> Blessings belong to two Kings and only appear once you carry one of each.</p>
  ${reyesTabla('en')}

  <h3>Wax Seals and Finishes</h3>
  <table>
    <tr><th colspan="2">Wax seals (drop at the bottom left)</th></tr>
    ${SEALS.map((s) => `<tr><td><b>${selloN(s)}</b></td><td>${selloD(s)}</td></tr>`).join('')}
    <tr><th colspan="2">Finishes (top right corner)</th></tr>
    ${TREATMENTS.map((t) => `<tr><td><b>${acabN(t)}</b></td><td>${acabD(t)}</td></tr>`).join('')}
  </table>
  <p>A card can carry a seal and a finish at once. Destroyed cards (glass ones that shatter or burnt ones) leave the deck for good.</p>

  <h3>The ${KEYWORDS.length === 5 ? 'five' : KEYWORDS.length} keywords</h3>
  <p>Only these words have a meaning of their own; they go in bold and the help bubbles chain their definition.</p>
  <table>
    ${KEYWORDS.map((k) => `<tr><td><b>${palabraN(k.id)}</b></td><td>${palabraD(k.id)}</td></tr>`).join('')}
  </table>

  <h3>Controls</h3>
  <p><b>1–9</b> pick a card · <b>arrows</b> move the focus · <b>Enter</b> picks · <b>Space</b> hits the active enemy · the Y key keeps a card Up the Sleeve · <b>Z</b> rewinds · <b>Q</b> Best Play · the A key turns AUTO on or off · <b>Delete</b> discards · <b>Esc</b> drops or goes back · <b>Tab</b> opens the deck · <b>F</b> full screen.</p>
  <p><b>Loupe</b>: right click, long press or <b>L</b> on any card, amulet, guard or monarch. With a controller: d-pad or stick, A picks, X hits, the Y button keeps Up the Sleeve, B back, LB deck, RB loupe, LT rewind, RT speed, Start settings. The table buttons show their shortcut for keyboard or controller. The full table is in Settings.</p>

  <h3>Crew tips</h3>
  <ul>
    <li>Defeating the Knave lets through a Knight with more Attack: check the queue before you spend your hand.</li>
    <li>Follow one King and go for his 4 bonus: that is what wins campaigns.</li>
    <li>Playing many cards speeds up the assault, but empties the Deck and brings it closer to running out.</li>
    <li>Against the monarch, King’s Fury does not wait: save your best hand for it.</li>
  </ul>`;
}

export function rulesHtml(cfg: Config = DIFFICULTY.obra): string {
  return getLang() === 'en' ? rulesEn(cfg) : rulesEs(cfg);
}
