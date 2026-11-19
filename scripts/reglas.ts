import { guardian } from './guardian';
guardian('docs', 120); // tope duro: ver scripts/guardian.ts
// Genera REGLAS.md a partir de los datos del propio motor, para que el reglamento escrito
// nunca se desincronice de lo que el juego hace de verdad:  npm run docs
// De paso pone al día en README.md las tablas de balance (desde scripts/meta-report.json) y la de
// controles, que van entre marcas <!-- …:inicio --> y <!-- …:fin -->.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { DIFFICULTY, FIGURAS, FIGURA_NOMBRE, FORM, FORMACIONES_MAZO, FORMATIONS, baseDe, FORMATION_NAME, Formation, MATERIAL, MAX_NUM, PALO_NOMBRE, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../src/rules/engine';
import { ACHIEVEMENTS, unlocksOf } from '../src/rules/achievements';
import { BALANCE } from '../src/rules/balance-config';
import { fraccion } from '../src/rules/cifras';
import { KEYWORDS } from '../src/rules/keywords';
import { ASCENSIONS, BOSSES, DECK, DECKS, EVENTS, FURIA, LAST_STAGE, MAPA_CFG, MIN_DECK, STAGES, TIRANO, UPGRADES, stageDef } from '../src/rules/run';
import { MAX_SPECIALS, SPECIALS } from '../src/rules/specials';
import { RARITY, TOOL, TOOLS, TOOL_SLOTS, huecosAmuleto } from '../src/rules/tools';
import { selloDe } from '../src/rules/piezas';
import { BENDICIONES, BONOS_REY, DUALES, REY_IDS, REY_NOMBRE, UMBRALES_REY, bendicionesDe } from '../src/rules/reyes';
import { TITLE, SUBTITLE } from '../src/shared/brand';
import { ARBOL, RAIZ, RAMAS } from '../src/rules/arbol';
import { ESQUIRLAS_POR_CORONA } from '../src/rules/migracion';
import { MAZO_INICIAL, REGLAS, perfilMazo } from '../src/rules/mazos';
import { CONTROL_ROWS } from '../src/client/prompts';

const cfg = DIFFICULTY.obra;
const n = (x: number) => String(Math.round(x * 100) / 100).replace('.', ',');
const table = (head: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
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
const KIND = { f: '+D suma Daño', r: '+M suma Multi', x: '×M multiplica', copy: '⇉ copia', p: '• pasiva' } as const;
/** Nombre de una pieza por su id, para que la prosa no se desincronice de la biblia. */
const tool = (id: string) => TOOL[id]?.name ?? id;
const up = (id: string) => UPGRADES.find((u) => u.id === id)?.name ?? id;

// la tabla de controles es la de prompts.ts: la misma que enseñan Ajustes y las insignias de cada botón
const CONTROLS_TABLE = table(['Acción', 'Teclado y ratón', 'Mando'], CONTROL_ROWS);

const md = `# ${TITLE} — Reglas

> Este archivo se genera con \`npm run docs\` a partir de los datos del motor (\`src/rules\`). No lo edites a mano.

*${SUBTITLE}.* Juego cooperativo para 1 a 4 jugadores con baraja española (48 cartas + 2 comodines).
Sois una conjura: hay que hacer caer **los cuatro tronos** de la corte antes de que su guardia acabe con **tu Vida**.
Se gana o se pierde en equipo. El Asalto único también se puede jugar en mesa con una baraja real.

## Preparación

1. Separa las 12 figuras y forma los **cuatro tronos**, una casa por palo (Casa de ${PALO_NOMBRE.S}, Casa de ${PALO_NOMBRE.D}…).
   Cada trono tiene 3 **guardias** en fila: la **Sota** (10) delante, que es la primera en caer, luego el **Caballo** (11) y al final el **Rey** (12).
2. Baraja las ${4 * MAX_NUM} cartas de número (del As al ${MAX_NUM}) con los 2 comodines: es el **Mazo**.
   Deja sitio al lado para el **Descarte**.
3. Cada jugador roba su mano de **${cfg.handSize[1]}** cartas.
4. La conjura empieza con **${cfg.maxIntegrity} de Vida** y **0 de Escudo** (máximo ${cfg.wallCap}).

${table(['Guardia', 'Vida', 'Ataque'], FIGURAS.map((r) => [`${FIGURA_NOMBRE[r]} (${r})`, String(cfg.floorHp[r]), `⚔ ${cfg.floorThreat[r]}`]))}

Cada palo es una casa de la corte: **${MATERIAL.S}**, **${MATERIAL.D}**, **${MATERIAL.H}** y **${MATERIAL.C}**.

**Un enemigo a la vez.** Las Casas se asaltan de una en una, en un orden que la campaña sortea: el **enemigo activo** es el guardia de delante de la primera Casa en pie, y el resto espera en la **fila**. Solo se golpea al enemigo activo.

## El turno

1. **Acción** (elige una): **Golpear** al enemigo activo con una formación, **Descartar** las cartas que quieras o jugar un **Comodín** (Motín). Solo se puede **Pasar** con la mano vacía.
2. **Contraataque**: si no lo has abatido, el enemigo activo te ataca con su **Ataque** (⚔) más la **Furia**. El **Escudo** frena primero; el resto te quita **Vida**.
3. **Robar** hasta completar la mano. Turno del siguiente.

## Daño × Multi

Todo golpe se calcula igual:

> **Golpe = Daño × Multi** (los dos, siempre números enteros)

**El orden no importa.** La mesa hace la cuenta y te la enseña antes de golpear:

1. **Daño**: se suma todo. La base de la formación, el número de cada carta (0 contra el trono de su palo: es **Inmune**), el Daño cargado y lo que añadan acabados, Trampas del Bufón (hasta ${MAX_SPECIALS} por golpe) y Amuletos. Si el trono está **${TOWER_FX.fractura.name}**, ese Daño vale ×${BALANCE.golpe.expuesto}.
2. **Multi**: se suma todo (la base de la formación, la Racha de Golpes exactos y lo que añadan acabados, Trampas, Amuletos y Bendiciones) y, al final, se aplican los multiplicadores (×2, ×3…).

El **As** vale **11** y enlaza escaleras por abajo (A-2-3) y por arriba (8-9-A).

${table(['Formación', 'Cartas', 'Daño base', 'Multi', 'Por nivel de Pergamino'], [...FORMATIONS, ...FORMACIONES_MAZO].map((f) => [FORMATION_NAME[f], FORM_CARDS[f], `+${baseDe(f).f}`, `×${baseDe(f).r}`, `+${baseDe(f).lf} de Daño`]))}

### Inmune a su propio palo

Una sola regla de palos: **cada trono es Inmune a su propio palo**. Contra el trono de su palo, una carta hace 0 de Daño; contra los otros tres, su número.

### Poder de cada palo

Además de su Daño, las cartas de cada palo activan su poder (aunque no sumen nada). Cada carta da lo mismo, sea cual sea su número:

- **Perfora** (${PALO_NOMBRE.S}): si la formación lleva alguna carta de ${PALO_NOMBRE.S}, los puntos que sobran al abatir a un guardia pasan al siguiente.
- **Salpica** (${PALO_NOMBRE.D}): cada carta de ${PALO_NOMBRE.D} hace **${BALANCE.mesa.salpicaPorCarta}** a cada uno de los otros tronos.
- **Cura** (${PALO_NOMBRE.H}): cada carta de ${PALO_NOMBRE.H} te cura **${BALANCE.mesa.curaPorCarta}** de Vida.
- **Escudo** (${PALO_NOMBRE.C}): cada carta de ${PALO_NOMBRE.C} te da **+${BALANCE.mesa.escudoPorCarta}** de Escudo.

### Golpe exacto

Abatir a un guardia con un Golpe **igual a su Vida** es la jugada maestra del juego (¡EXACTO!). Cuando lo consigues:

- **no hay Contraataque** ese turno,
- cobras **${BALANCE.golpe.oroExacto} de oro** y **robas 1 carta** de más,
- el guardia siguiente pierde **${fraccion(BALANCE.golpe.onda)} de su Vida** (el **Impulso** del golpe),
- y empiezas una **Racha**: tu próximo golpe lleva +${BALANCE.golpe.racha} de Multi por cada Golpe exacto seguido (hasta +${BALANCE.golpe.racha * BALANCE.golpe.rachaTope}). La Racha se corta si el golpe no es exacto.

La mesa te lo avisa antes de golpear: la previsualización de cada trono dice si el golpe sería exacto.

### Estados de los tronos

Solo hay dos, y ninguno se acumula:

- **${TOWER_FX.fractura.name}**: lo deja un golpe de un solo palo (2 o más cartas, todas del mismo palo). ${TOWER_FX.fractura.desc}
- **${TOWER_FX.sobrecarga.name}**: lo deja un golpe que mezcla 3 palos o más, el Motín (Comodín) o El Espía. ${TOWER_FX.sobrecarga.desc}

Los dos desaparecen si cae el guardia.

### Reglas especiales

- **Comodín · Motín**: se juega solo sobre un trono. Ese trono queda **${TOWER_FX.sobrecarga.name}** y este turno no hay Contraataque. El comodín no vuelve en este asalto.
- **Furia**: cada punto es **+1 de Ataque** en todos los Contraataques, y se ve junto al ⚔ del enemigo activo. En campaña sube **${FURIA.mazo}** con cada Mazo agotado y, contra un monarca, **${FURIA.rey}** cada turno que sigue en pie (la **Furia del Rey**). En el Asalto único sube además sola, desde el turno ${(cfg.fatigueStart ?? 0) + 1} y cada ${cfg.fatigueEvery} turnos.
- **Mazo agotado**: si el Mazo se acaba, el Descarte se baraja y vuelve a ser Mazo. **Barajar no te quita Vida**, pero sube la **Furia** (${FURIA.mazo} en campaña): los asaltos no se pueden estirar sin fin.
- **${FORMATION_NAME.compania}**: un As forma jugada con **cualquier otra carta** (×${n(FORM.compania.r)} de Multi) y aporta el poder de su palo. Es la manera de colar un poder en un golpe: un As de ${PALO_NOMBRE.C} para levantar Escudo, uno de ${PALO_NOMBRE.H} para curar, uno de ${PALO_NOMBRE.S} para perforar.
- **La Manga**: junto a la mano hay un hueco aparte. Una vez por turno, y sin gastar el turno, puedes guardarte en la manga una carta de tu mano: no cuenta para el tamaño de la mano (robas hasta completarla igual) y se juega desde ahí como si estuviera en ella. Si el hueco está ocupado, la carta guardada vuelve a la mano.
- **Rebobinar** (↩ Deshacer; solo en campaña en solitario): una vez por asalto puedes **deshacer tu última jugada**. La mesa vuelve a como estaba y el Mazo se baraja de nuevo, así que lo que viste salir ya no vale. Usar la Manga no gasta el rebobinado. En sala no se rebobina: toda jugada es definitiva, y la mesa lo indica.
- Las cartas de baraja nunca bajan de 12 en el Mazo: lo que las quema deja de hacerlo al llegar a ese mínimo.
- **Victoria** (*Corte vencida*): todos los tronos caídos (en los primeros asaltos de la campaña hay menos de cuatro). **Derrota** (*Conjura deshecha*): tu Vida llega a 0.
- Modo **BRUTAL** (Asalto único): ${DIFFICULTY.brutal.maxIntegrity} de Vida y cada Mazo agotado sube la Furia ${DIFFICULTY.brutal.collapseSiege}.

## Campaña

Un roguelike de construcción de mazo: **${LAST_STAGE} asaltos** cada vez más duros, una sala del castillo cada uno, ${STAGES.filter((s) => s.boss).length} de ellos con **monarca** (el del último es el **${TIRANO.m}** o la **${TIRANO.f}**). Empiezas con un Sobre lacrado de ${BALANCE.inicio.sobre} cartas especiales, ${BALANCE.inicio.oro} de oro y un **Don de la Conjura** que eliges entre tres (un Amuleto común, un sello de lacre en una carta de tu Mazo o una bolsa de ${BALANCE.inicio.donOro} de oro); entre asalto y asalto mejoras el Mazo y tus Amuletos. La Vida base de los guardias es ${[11, 12, 13].map((r) => BALANCE.mesa.floorHp[r]).join(' / ')}; cada asalto la multiplica y la Vida final se redondea al múltiplo de 5 más cercano.

Los primeros asaltos tienen menos tronos: los palos que faltan se sortean al empezar la campaña y el Mapa los enseña desde el principio.

${table(['Asalto', 'Sala', 'Tronos', 'Guardias por trono', 'Vida', 'Ataque', 'Monarca'], STAGES.map((s, i) => [String(i + 1), s.name, String(s.thrones), s.floors.map((r) => FIGURA_NOMBRE[r]).join(', '), `×${n(s.hp)}`, s.threat === 0 ? 'base' : s.threat > 0 ? `+${s.threat}` : String(s.threat), s.tirano ? `sí, ${TIRANO.m}` : s.boss ? 'sí' : '—']))}

En conjura de 2 a 4 jugadores los guardias aguantan un 30 % más.

### El Mapa de caminos

Antes de cada asalto (desde el 2) se elige un camino en el **Mapa**: dos filas de tres nodos y, arriba, el asalto. Cada tramo tiene seis caminos, todos llegan al asalto y todos pueden pasar por **La Pulpería**, que va siempre en el centro de la segunda fila. El Mapa sale de la semilla: la misma semilla da el mismo Mapa.

- **Guardia Bravo** (al menos uno por tramo): un guardia solo, en una Casa de un palo que el Mapa enseña de antemano, con Vida ×${n(MAPA_CFG.bravo.vida)} y +${MAPA_CFG.bravo.ataque} de Ataque sobre el asalto que viene. No cura al ganar. Paga ${MAPA_CFG.bravo.oro} de oro, un Amuleto Raro o mejor${MAPA_CFG.bravo.bendicion ? ` y una «Elegí una» Bendición de ${MAPA_CFG.bravo.bendicion} Reyes` : ''}.
- **Santuario del Bufón**: un trato (los Secretos de abajo).
- **Fogón**: Curar ${MAPA_CFG.fogon.curar} de Vida o Purgar una carta, gratis; uno de los dos (con el ${up('rutas')} del Altar, los dos).
- **La Pulpería**: comprar, Purgar y Curar con oro.


**Reyes jefe** (${BOSSES.length}; cada campaña sortea ${STAGES.filter((s) => s.boss).length}). El monarca de cada asalto con jefe es uno de los 4 Reyes: es el **último guardia** de la Casa de su palo (que va la última), llega con retrato, tiene ×${FURIA.jefeVida} de Vida y, mientras lo tienes delante, su **Furia del Rey** sube cada turno. Cada uno tiene además su **rasgo de combate**, y te habla según cómo lo trataste: como aliado si llevas alguna Bendición suya, como rival si solo llevas de otros. En el asalto ${STAGES.findIndex((s) => s.boss) + 1} el Rey ocupa el sitio del Caballo, con ×${n(BALANCE.reyes.asalto2.vida)} de su Vida y ${BALANCE.reyes.asalto2.ataque} de Ataque. Al caer abre su **Cofre**: uno de tres Amuletos, Raros o mejores.

${table(['Rey jefe', 'Rasgo', 'Efecto', 'Furia por turno'], BOSSES.map((b) => [b.who, b.name, b.desc, String(BALANCE.reyes[b.id].furia)]))}

### El Botín

Tras cada combate, el **Botín** se cobra por partes; cada una se toma o se salta, y lo que no se cobra se pierde al seguir:

- **Oro**: asalto ganado, Golpes exactos, la Vida que te queda e interés de 1 por cada ${BALANCE.cobro.interesCada} de oro guardado. Tras un asalto recuperás ${BALANCE.cobro.curaTrasAsalto} de Vida.
- **«Elegí una»**: tres opciones a la vista. Tras un asalto, dos Trampas del Bufón y una carta de baraja ya marcada con un sello de lacre o un acabado (saltarla paga ${BALANCE.cobro.sinSeleccion} de oro); tras un asalto de Rey, también una Bendición${MAPA_CFG.bendicionGuardia ? ' (y tras los de Guardia)' : ''} y el **Cofre del Rey** (uno de tres Amuletos Raros o mejores).

### La Pulpería

Lo atiende el Tratante.

- **Amuletos** (su precio depende de la rareza: ${(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((r) => `${RARITY[r].name.toLowerCase()} ~${RARITY[r].cost}`).join(', ')}). Se pueden vender por la mitad.
- **Sobre lacrado**: lo abres ahí mismo y te quedas con 1 de 3.
- **Sobre a ciegas**: una especial sin verla, más barata.
- **Mesa de lacre**: pone el sello de lacre o el acabado en oferta sobre la carta de tu Mazo que elijas.
- **Pergamino**: sube de nivel una formación.
- **Curar** (+${BALANCE.taberna.curar.vida} de Vida), **Purgar** (saca una carta; el Mazo no baja de ${MIN_DECK}) y **Renovar mesa** (cambia lo que hay en oferta), los tres con coste creciente.

### Santuarios del Bufón

En cada Santuario del Bufón del Mapa espera un trato: una apuesta de azar o un dilema con premio y precio. No se repiten hasta haber visto los ${EVENTS.length}:

${EVENTS.map((e) => `- **${e.name}.** ${e.text}\n${e.options.map((o) => `  - *${o.label}*: ${o.desc}`).join('\n')}`).join('\n')}

### Trono infinito, semillas y Reinados

- Después del asalto ${LAST_STAGE} puedes seguir al **Trono infinito**: asaltos sin final, de cuatro tronos y siempre con monarca, cada uno un ${Math.round((BALANCE.tronoInfinito.hpCrece - 1) * 100)} % más resistente que el anterior (el primero, ×${n(stageDef(LAST_STAGE + 1).hp)}).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Reinados**: hay ${ASCENSIONS.length}. Ganar una campaña abre el Reinado siguiente; cada uno añade **un giro** a todos los anteriores y sube un 25 % el cobro de la conjura (sin contar lo que cae a la mesa).

${table(['Reinado', 'Nombre', 'Giro'], ASCENSIONS.map((a, i) => [String(i + 1), a.name, a.desc]))}

- **Sellos de maestría**: al ganar, el Mazo usado y cada Amuleto que llevabas quedan marcados en la colección con el Reinado más alto que has ganado con ellas: sello de **bronce** (Reinados 1–3), de **hierro** (4–6) o de **oro** (7–8).
- **Reinicio rápido**: mantén pulsada la **R** (o Select en el mando) 0,7 segundos para volver a empezar la campaña con el mismo Mazo y el mismo Reinado. La que dejas no cuenta como derrota ni da esquirlas.

## Amuletos

Llevas hasta **${TOOL_SLOTS} Amuletos**, y uno más por nivel de la **${ARBOL.find((u) => u.id === 'tienda')!.name}** del Altar (hasta ${huecosAmuleto(2)}). **No se ordenan**: cada uno nuevo va al final de la tira y ninguno depende de su hueco. En la cuenta primero se suma todo y al final se multiplica. Hay ${TOOLS.length}, en ${REY_IDS.length} familias, una por Rey: ${TOOLS.filter((t) => !t.box).length} en el surtido de salida y ${TOOLS.filter((t) => t.box).length} más en los arcones del Altar (uno por Rey). **Cada Amuleto cuenta como pieza de su Rey** para los niveles [${UMBRALES_REY.join('/')}], igual que una Bendición.

- **Sello de nivel** (S · A · B): lo calcula el laboratorio (\`npm run analyze:meta -- sellos\`) con cada pieza dada de salida frente a las mismas campañas sin ella: el tercio que más sube la victoria lleva **S**, el que menos **B** y el resto **A**. Lo llevan los Amuletos, las Trampas del Bufón y las Bendiciones.
- **★ Sinergia**: la pieza lleva una estrella cuando enciende un nivel de su Rey («★ Bastos [4]»), cuando está hecha para tu Mazo («★ Para Escoba») o cuando acerca el [4] («★ Copas 3/4»).

${table(['Amuleto', 'Rey', 'Rareza', 'Tipo', 'Efecto', 'Sello', 'Surtido'], TOOLS.map((t) => [t.name, REY_NOMBRE[t.arch], RARITY[t.rarity].name, KIND[t.kind], t.desc, selloDe({ tipo: 'amuleto', id: t.id }) ?? '—', t.box ? 'arcón del Altar' : 'de salida']))}

## Los 4 Reyes y sus Bendiciones

Cada palo tiene su **Rey**: el de Espadas (el filo: perforar, rematar, Golpe exacto), el de Bastos (el aguante: Escudo y frenar el Contraataque), el de Oros (la fortuna: oro, salpicadura y el dado) y el de Copas (el brindis: curación, Vida y robar). Hay ${BENDICIONES.length} **Bendiciones**: ${bendicionesDe('espadas').length} de cada Rey y ${DUALES.length} **Duales**, de dos Reyes a la vez.

- **La oferta.** Al empezar la campaña ofrecen ${BALANCE.oferta.inicio} Reyes distintos, y antes de cada asalto siguiente ofrecen ${BALANCE.oferta.entre}: cada uno pone una Bendición suya y te quedas con una. Una **Dual** solo se ofrece si ya llevas al menos una Bendición de cada uno de sus dos Reyes.
- **Las cargas.** Cada Bendición tiene un efecto que vale desde que la tomas y una **condición de carga**: cada vez que se cumple suma una carga para el resto de la campaña, y cada carga da lo que dice su texto. La mesa lo enseña como «Espadas +6».
- **Los niveles.** Con **${UMBRALES_REY.join(' y ')}** piezas de un mismo Rey (las Duales cuentan para los dos) se encienden sus bonos:

${table(['Rey', `Con ${UMBRALES_REY[0]}`, `Con ${UMBRALES_REY[1]}`], REY_IDS.map((r) => [`**${REY_NOMBRE[r]}**`, ...BONOS_REY[r]]))}

${table(['Bendición', 'Rey', 'Efecto', 'Carga'], BENDICIONES.map((b) => [b.name, b.duo ? `${REY_NOMBRE[b.rey]} y ${REY_NOMBRE[b.duo]}` : REY_NOMBRE[b.rey], b.desc, b.carga]))}

## Sellos de lacre y acabados

Una carta de baraja puede llevar un sello de lacre y un acabado a la vez.

${table(['Sello de lacre', 'Efecto'], SEALS.map((s) => [SEAL[s].name, SEAL[s].desc]))}

${table(['Acabado', 'Efecto'], TREATMENTS.map((t) => [TREATMENT[t].name, TREATMENT[t].desc]))}

Las cartas que arden (de ${TREATMENT.agrietado.name} que se hacen añicos, quemadas en la hoguera o fundidas) salen del Mazo para siempre.

## Trampas del Bufón

Las cartas especiales de la campaña son las ${SPECIALS.length} **Trampas del Bufón**: no tienen palo ni número, acompañan a cualquier golpe (hasta ${MAX_SPECIALS} por golpe) o se juegan solas. Salen en los Sobres lacrados, en el Botín y en La Pulpería, y todas están desde el principio.

${table(['Trampa', 'Efecto', 'Sello'], SPECIALS.map((s) => [s.name, s.desc, selloDe({ tipo: 'trampa', id: s.id }) ?? '—']))}

## Los 5 Mazos

Cada campaña se juega con un **Mazo**: una fantasía de juego de naipes rioplatense con sus reglas propias, que se suman a las de siempre. La **${DECK[MAZO_INICIAL].name}** está desde el principio; los demás se desbloquean con logros. Las cargas (de la Escoba y de la Mano larga) duran toda la campaña.

${table(['Mazo', 'Lema', 'Vida · mano', 'Cómo cambia la campaña', 'Se desbloquea con'], DECKS.map((d) => [d.name, d.lema, `${perfilMazo(d.id).vida} · ${perfilMazo(d.id).mano}`, d.desc, d.unlock ? (ACHIEVEMENTS.find((a) => a.id === d.unlock)?.name ?? d.unlock) : '—']))}

${table(['Regla', 'Mazo', 'Qué hace'], REGLAS.map((r) => [r.name, DECK[r.mazo].name, r.desc]))}

## El Altar

Ganes o pierdas, cada campaña deja **Esquirlas de Corona** ✦: las que caen a la mesa durante los asaltos y el **cobro de la conjura** al cerrarla (${ESQUIRLAS_POR_CORONA} por cada punto de la cuenta de siempre). Lo que cae a la mesa:

${table(['Qué pasa', 'Monedas', 'Esquirlas', 'Gotas de lacre'], [
  ['Cada golpe', '—', String(BALANCE.caida.esquirlaGolpe), '—'],
  ['Cada guardia abatido', String(BALANCE.caida.oroGuardia), String(BALANCE.caida.esquirlaGuardia), '—'],
  ['Cada Golpe exacto', String(BALANCE.golpe.oroExacto), String(BALANCE.caida.esquirlaExacto), String(BALANCE.caida.gotaExacto)],
  ['Cada monarca vencido', '—', String(BALANCE.caida.esquirlaMonarca), '—'],
])}

- Con **${BALANCE.caida.gotasPorSello} gotas de lacre**, la Mesa de lacre te sella gratis.
- **Tirada de huesos**: al ganar cada asalto se tiran dos dados. El **Dado de oro** (caras ${BALANCE.huesos.oro.map((x) => `×${x}`).join(' ')}) multiplica las monedas que cayeron en ese asalto; el **Dado de la Corona** (caras ${BALANCE.huesos.corona.map((x) => `×${x}`).join(' ')}) multiplica sus esquirlas. Al perder no hay tirada.

Las esquirlas se gastan en el Altar, que crece desde su raíz, «${RAIZ.name}», en cuatro ramas. Un nodo pide tener antes su padre. Solo **el Arsenal** cambia la campaña de cinco asaltos; la Bolsa y los Huesos solo dan más esquirlas, y la Corona de hierro solo actúa en el Trono infinito. El surtido de salida es corto a propósito (${TOOLS.filter((t) => !t.box).length} Amuletos); los arcones del Arsenal, uno por Rey, abren los otros ${TOOLS.filter((t) => t.box).length}.

${RAMAS.map((r) => `### ${r.name}\n\n${r.desc}\n\n${table(['Nodo', 'Efecto', 'Rangos', 'Coste de cada rango'], ARBOL.filter((u) => u.rama === r.id).map((u) => [u.name, u.desc, String(u.rangos), u.costs.map((c) => `${c} ✦`).join(' · ')]))}`).join('\n\n')}

### Archivo de crónicas y copia de seguridad

- El archivo guarda las **25 últimas campañas terminadas**: cómo acabaron, en qué asalto y ante qué monarca, turnos, mayor Golpe, Amuletos y semilla. Desde ahí se puede **copiar la Crónica** o **rejugar la semilla** con el mismo Mazo y el mismo Reinado.
- En **Ajustes**, *Exportar progreso* guarda el Altar, la colección, las crónicas y los ajustes en un archivo .json, e *Importar progreso* lo recupera en otro navegador, otro equipo o la versión de escritorio.

### Logros

${table(['Logro', 'Cómo', 'Esquirlas', 'Desbloquea'], ACHIEVEMENTS.map((a) => [a.name, a.desc, `+${a.renown} ✦`, unlocksOf(a.id) ?? '—']))}

## Palabras clave

El juego usa solo seis palabras con significado propio. Todo lo demás se dice con palabras llanas. En pantalla van en negrita y, al pasar el puntero sobre cualquier texto que las mencione, el globo de ayuda encadena su definición.

${KEYWORDS.map((k) => `- **${k.name}**: ${k.desc}`).join('\n')}

## Controles

${CONTROLS_TABLE}

Los botones de la mesa enseñan su atajo: la tecla si juegas con teclado, el botón (A, B, X, Y, LB, RB, LT, RT, L3, R3) si lo último que tocaste fue un mando, y nada con ratón o pantalla táctil. Cada trono lleva a la vista la placa de su palo: es **Inmune** a las cartas de ese palo.

La **Lupa** abre cualquier carta, Amuleto, guardia o monarca a tamaño de lámina, con la cuenta exacta de lo que aporta en ese momento. En sala, pulsar un trono cuando no es tu turno (o cualquier ruta, oferta o carta con Alt) deja una **seña** con tus iniciales para la conjura: no decide nada, solo señala.
`;

writeFileSync(new URL('../REGLAS.md', import.meta.url), md);

// ── README: bloques generados ──
interface Report {
  campaigns: number;
  winrate: { levels: { level: number; name: string; vacio: number; lleno: number; n: number }[]; decks: { name: string; vacio: number; lleno: number; n: number }[] };
  bosses: { who: string; lethality: number; faced: number }[];
  avgLethality: number;
  pacing: { stage: number; name: string; p50: number; p95: number; n: number; j50?: number }[];
  pacingByDeck?: { name: string; worstP95: number }[];
  classic?: { players: number; winrate: number; turns: number; n: number }[];
  flags: string[];
}
import { OBJETIVOS, duracion } from './objetivos';
const p = (x: number) => `${n(Math.round(x * 10) / 10)} %`;
function balanceMd(r: Report): string {
  const levels = r.winrate.levels.filter((l) => l.n);
  const decks = r.winrate.decks.filter((d) => d.n);
  // Los objetivos salen de scripts/objetivos.ts: no se escriben a mano.
  const O = OBJETIVOS;
  const entre = (par: readonly number[]) => `entre el ${n(par[0])} y el ${n(par[1])} %`;
  const tramos = O.ritmo.map((t, i) => {
    const desde = i === 0 ? 1 : (O.ritmo[i - 1].hasta as number) + 1;
    const hasta = Number.isFinite(t.hasta) ? (t.hasta as number) : r.pacing.length;
    const cuales = desde === hasta ? `asalto ${desde}` : hasta === desde + 1 ? `asaltos ${desde} y ${hasta}` : `asaltos ${desde} a ${hasta}`;
    return `${cuales} de ${t.mediana[0]} a ${t.mediana[1]}${i === 0 ? ' turnos de mediana' : ''} (P95 ≤ ${t.p95})`;
  });
  return [
    `Medido con \`npm run analyze:meta\`: **${r.campaigns.toLocaleString('es-ES')} campañas** con semilla jugadas por el bot de referencia (camino en el Mapa, Botín y «Elegí una», la Pulpería, Mesa de lacre, Santuarios del Bufón, la Manga y orden de los Amuletos). El informe completo —cada Amuleto, Trampa, Bendición, sello de lacre y acabado— queda en [scripts/meta-report.json](scripts/meta-report.json). Cada porcentaje es una muestra: con 1.500 campañas, el margen es de unos ±2,5 puntos, así que dos medidas que difieran menos que eso no se distinguen.`,
    '',
    `Campañas ganadas por Reinado (con la ${DECK[MAZO_INICIAL].name}, ${levels[0]?.n ?? 0} campañas por celda). Objetivos: Reinado 1 ${entre(O.reinado1.vacio)} con el Altar vacío y ${entre(O.reinado1.lleno)} con el Altar lleno; Reinado 8 ${entre(O.reinado8.vacio)} con el Altar vacío y ${entre(O.reinado8.lleno)} con el Altar lleno; y cada Reinado, más difícil que el anterior.`,
    '',
    table(['Reinado', 'Altar vacío', 'Altar lleno'], levels.map((l) => [`${l.level} · ${l.name}`, p(l.vacio), p(l.lleno)])),
    '',
    `Por Mazo (Reinado 1, ${decks[1]?.n ?? 0} campañas por celda). Objetivo: todas entre el ${O.mazos.vacioObjetivo} % con el Altar vacío y entre el ${O.mazos.llenoObjetivo} % con el Altar lleno (el informe avisa fuera de ${O.mazos.vacio[0]}–${O.mazos.vacio[1]} y de ${O.mazos.lleno[0]}–${O.mazos.lleno[1]}).`,
    '',
    table(['Mazo', 'Altar vacío', 'Altar lleno', 'Lo que suma el Altar'], decks.map((d) => [d.name, p(d.vacio), p(d.lleno), `+${n(Math.round((d.lleno - d.vacio) * 10) / 10)}`])),
    '',
    `Monarcas: de cada vez que una campaña llega a uno, cuántas acaban ahí (media ${p(r.avgLethality)}). Objetivo: todos entre ${n(O.monarcas.ratio[0])}× y ${n(O.monarcas.ratio[1])}× de la media.`,
    '',
    table(['Monarca', 'Letalidad', 'Frente a la media'], r.bosses.map((b) => [b.who, p(b.lethality), `×${n(Math.round((b.lethality / (r.avgLethality || 1)) * 100) / 100)}`])),
    '',
    `Turnos por asalto. Objetivo: ${tramos.join('; ')}, con cualquier Mazo (peor P95 ≤ ${O.ritmoBaraja}).`,
    '',
    r.pacing.every((x) => typeof x.j50 === 'number')
      ? table(['Asalto', 'Mediana', 'P95', 'Jugadas (mediana)'], r.pacing.map((x) => [`${x.stage} · ${x.name}`, String(x.p50), String(x.p95), String(x.j50)]))
      : table(['Asalto', 'Mediana', 'P95'], r.pacing.map((x) => [`${x.stage} · ${x.name}`, String(x.p50), String(x.p95)])),
    '',
    duracion(r) !== null ? `Un turno es una jugada que recibe el Contraataque; las jugadas cuentan también la que abate y las que no gastan el turno. Duración estimada de la campaña: ${n(duracion(r)!)} minutos (objetivo ${O.duracion.minutos.join('–')}; ${O.duracion.jugada} s por jugada).` : '',
    '',
    r.pacingByDeck?.length ? `Peor percentil 95 de los ${r.pacing.length} asaltos, por Mazo: ${r.pacingByDeck.map((d) => `${d.name} ${d.worstP95}`).join(' · ')}.` : '',
    '',
    r.classic?.length ? `Asalto único (${r.classic[0].n} partidas por celda; objetivo ${O.clasica[0]}–${O.clasica[1]} %): ${r.classic.map((c) => `${c.players} jugador${c.players > 1 ? 'es' : ''} ${p(c.winrate)}`).join(' · ')}.` : '',
    '',
    r.flags.length ? `Avisos del informe (${r.flags.length}): ${r.flags.join('; ')}.` : 'El informe no deja ningún aviso: todos los objetivos se cumplen en la muestra.',
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n');
}
function block(text: string, name: string, body: string): string {
  const a = `<!-- ${name}:inicio -->`;
  const b = `<!-- ${name}:fin -->`;
  const i = text.indexOf(a);
  const j = text.indexOf(b);
  return i < 0 || j < i ? text : `${text.slice(0, i + a.length)}\n${body}\n${text.slice(j)}`;
}
const readmeUrl = new URL('../README.md', import.meta.url);
const reportUrl = new URL('./meta-report.json', import.meta.url);
if (existsSync(readmeUrl)) {
  let readme = readFileSync(readmeUrl, 'utf8');
  readme = block(readme, 'controles', CONTROLS_TABLE);
  if (existsSync(reportUrl)) readme = block(readme, 'balance', balanceMd(JSON.parse(readFileSync(reportUrl, 'utf8')) as Report));
  writeFileSync(readmeUrl, readme);
  console.log('README.md · tablas de balance y controles al día');
}
console.log(`REGLAS.md · ${md.split('\n').length} líneas`);
