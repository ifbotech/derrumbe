// Genera REGLAS.md a partir de los datos del propio motor, para que el reglamento escrito
// nunca se desincronice de lo que el juego hace de verdad:  npm run docs
// De paso pone al día en README.md las tablas de balance (desde scripts/meta-report.json) y la de
// controles, que van entre marcas <!-- …:inicio --> y <!-- …:fin -->.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { DIFFICULTY, FORM, FORMATIONS, FORMATION_NAME, Formation, MATERIAL, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../src/rules/engine';
import { ACHIEVEMENTS, unlocksOf } from '../src/rules/achievements';
import { BALANCE } from '../src/rules/balance-config';
import { KEYWORDS } from '../src/rules/keywords';
import { ASCENSIONS, BOSSES, CONTRACTS, DECK, DECKS, EVENTS, EVENT_AFTER, FATIGUE, LAST_STAGE, MIN_DECK, STAGES, TAGS, UPGRADES, stageDef } from '../src/rules/run';
import { MAX_SPECIALS, SPECIALS } from '../src/rules/specials';
import { ARCH, Arch, RARITY, TOOL, TOOLS, TOOL_SLOTS } from '../src/rules/tools';
import { TITLE, SUBTITLE } from '../src/shared/brand';
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
};
const KIND = { f: '+D suma Daño', r: '+M suma Multi', x: '×M multiplica', copy: '⇉ copia', p: '• pasiva' } as const;
/** Nombre de una pieza por su id, para que la prosa no se desincronice de la biblia. */
const tool = (id: string) => TOOL[id]?.name ?? id;
const up = (id: string) => UPGRADES.find((u) => u.id === id)?.name ?? id;
const GUARD = ['Sota', 'Reina', 'Rey'];

// la tabla de controles es la de prompts.ts: la misma que enseñan Ajustes y las insignias de cada botón
const CONTROLS_TABLE = table(['Acción', 'Teclado y ratón', 'Mando'], CONTROL_ROWS);

const md = `# ${TITLE} — Reglas

> Este archivo se genera con \`npm run docs\` a partir de los datos del motor (\`src/rules\`). No lo edites a mano.

*${SUBTITLE}.* Juego cooperativo para 1 a 4 jugadores con baraja francesa (52 cartas + 2 comodines).
Sois una conjura: hay que hacer caer **los cuatro tronos** de la corte antes de que su guardia acabe con **tu Vida**.
Se gana o se pierde en equipo. El Asalto único también se puede jugar en mesa con una baraja real.

## Preparación

1. Separa las 12 figuras y forma los **cuatro tronos**, una casa por palo (Casa de Picas, Casa de Diamantes…).
   Cada trono tiene 3 **guardias** en fila: la **Sota** (J) delante, que es la primera en caer, luego la **Reina** (Q) y al final el **Rey** (K).
2. Baraja las 40 cartas numerales (del As al 10) con los 2 comodines: es el **Mazo**.
   Deja sitio al lado para el **Descarte**.
3. Cada jugador roba su mano de **${cfg.handSize[1]}** cartas.
4. La conjura empieza con **${cfg.maxIntegrity} de Vida** y **0 de Escudo** (máximo ${cfg.wallCap}).

${table(['Guardia', 'Vida', 'Ataque'], [11, 12, 13].map((r) => [`${GUARD[r - 11]} (${'JQK'[r - 11]})`, String(cfg.floorHp[r]), `⚔ ${cfg.floorThreat[r]}`]))}

Cada palo es una casa de la corte: ♠ **${MATERIAL.S}**, ♦ **${MATERIAL.D}**, ♥ **${MATERIAL.H}**, ♣ **${MATERIAL.C}**.

## El turno

1. **Acción** (elige una): **Golpear** un trono con una formación, **Descartar** las cartas que quieras o jugar un **Comodín** (Motín). Solo se puede **Pasar** con la mano vacía.
2. **Contraataque**: se voltea la carta superior del Mazo. El trono de ese palo te ataca con el **Ataque** (⚔) de su guardia de delante. El **Escudo** frena primero; el resto te quita **Vida**. Si ese trono ya cayó, o sale un comodín, no pasa nada.
3. **Robar** hasta completar la mano. Turno del siguiente.

## Daño × Multi

Todo golpe se calcula igual:

> **Golpe = Daño × Multi** (redondeado)

Se resuelve de izquierda a derecha, y cada paso se ve en la mesa:

1. **La formación** pone la base de Daño y de Multi.
2. **Lo que arrastra la mesa**: la Racha de Golpes exactos, el Daño cargado, el Asedio final y el estado del trono.
3. **Cada carta**, en el orden en que la elegiste, suma su número como Daño (doble si su palo tiene ventaja). Enseguida actúan su **acabado** y su **sello de lacre**.
4. **Las cartas especiales** que acompañan al golpe (hasta ${MAX_SPECIALS}).
5. **Tus reliquias**, hueco a hueco.

Lo que **suma** cuenta donde está. Lo que **multiplica** el Multi multiplica todo lo acumulado hasta ese momento: conviene sumar primero y multiplicar al final. El **As** vale **11** y enlaza escaleras por abajo (A-2-3) y por arriba (9-10-A).

${table(['Formación', 'Cartas', 'Daño base', 'Multi', 'Por nivel de Pergamino'], FORMATIONS.map((f) => [FORMATION_NAME[f], FORM_CARDS[f], `+${FORM[f].f}`, `×${n(FORM[f].r)}`, `+${FORM[f].lf} D · +${n(FORM[f].lr)} M`]))}

### La rueda de palos

${table(['Trono', 'Daño doble (×2)', 'Sin Daño (×0, Inmune)'], [['♠ ' + MATERIAL.S, '♣ tréboles', '♠ picas'], ['♦ ' + MATERIAL.D, '♠ picas', '♦ diamantes'], ['♥ ' + MATERIAL.H, '♦ diamantes', '♥ corazones'], ['♣ ' + MATERIAL.C, '♥ corazones', '♣ tréboles']])}

Rueda: ♠ corta ♦ · ♦ compra ♥ · ♥ doblega ♣ · ♣ quiebra ♠. Contra el trono de su propio palo, una carta no hace nada: ese trono es **Inmune** a ella.

### Poder de cada palo

Además de su Daño, las cartas de cada palo activan su poder (aunque no sumen nada):

- ♠ **Perfora**: si la formación lleva alguna pica, los puntos que sobran al abatir a un guardia pasan al siguiente.
- ♦ **Salpica**: los otros tronos reciben un tercio (hacia abajo) del valor de tus diamantes.
- ♥ **Cura**: recuperas un tercio (hacia arriba) del valor de tus corazones en Vida.
- ♣ **Escudo**: levantas un tercio (hacia arriba) del valor de tus tréboles como Escudo.

### Golpe exacto

Abatir a un guardia con un Golpe **igual a su Vida** es la jugada maestra del juego (¡EXACTO!). Cuando lo consigues:

- **no hay Contraataque** ese turno,
- cobras **${BALANCE.golpe.oroExacto} de oro** y **robas 1 carta** de más,
- el guardia siguiente pierde **un cuarto de su Vida** (el **Impulso** del golpe),
- y empiezas una **Racha**: tu próximo golpe lleva +${n(BALANCE.golpe.racha)} de Multi por cada Golpe exacto seguido (hasta +2). La Racha se corta si el golpe no es exacto.

La mesa te lo avisa antes de golpear: la previsualización de cada trono dice si el golpe sería exacto.

### Estados de los tronos

- **${TOWER_FX.fractura.name}**: la deja un golpe de un solo palo (2 o más cartas, todas del mismo palo). ${TOWER_FX.fractura.desc}
- **${TOWER_FX.sobrecarga.name}**: lo deja un golpe que mezcla 3 palos o más. ${TOWER_FX.sobrecarga.desc}
- **${TOWER_FX.apuntalado.name}**: lo traen algunos monarcas y Reinados. ${TOWER_FX.apuntalado.desc}

### Reglas especiales

- **Comodín · Motín**: se juega solo sobre un trono. Su guardia de delante queda **Desarmado** (no ataca hasta que caiga) y no hay Contraataque. El comodín no vuelve en este asalto.
- **Asedio final**: ningún asalto dura para siempre. En campaña, desde el turno ${FATIGUE.start + 1} de cada asalto y cada ${FATIGUE.every} turnos, el asedio sube un nivel; cada nivel da **+${n(FATIGUE.res)} de Multi** a todos los golpes y **+1 de Ataque** a los cuatro tronos. El asalto se acelera en los dos sentidos: pegas más y te pegan más. La mesa avisa tres turnos antes. En conjura de varios empieza más tarde, en proporción a lo que aguantan los guardias; en el Asalto único, en el turno ${(cfg.fatigueStart ?? 0) + 1} y cada ${cfg.fatigueEvery} turnos.
- **Mazo agotado**: si el Mazo se acaba, el Descarte se baraja y vuelve a ser Mazo, pero pierdes **${cfg.collapseLoss}** de Vida (el Escudo no lo frena). Cada vuelta completa de la conjura al Mazo lo encarece en 1: los asaltos no se pueden estirar sin fin.
- **${FORMATION_NAME.compania}**: un As forma jugada con **cualquier otra carta** (×${n(FORM.compania.r)} de Multi) y aporta el poder de su palo. Es la manera de colar un poder en un golpe: un As de ♣ para levantar Escudo, uno de ♥ para curar, uno de ♠ para perforar.
- **La Manga**: junto a la mano hay un hueco aparte. Una vez por turno, y sin gastar el turno, puedes guardarte en la manga una carta de tu mano: no cuenta para el tamaño de la mano (robas hasta completarla igual) y se juega desde ahí como si estuviera en ella. Si el hueco está ocupado, la carta guardada vuelve a la mano. La reliquia *${tool('pasarela')}* añade un segundo hueco. La partida guiada te enseña a usarla en su tercer paso.
- **Rebobinar** (↩ Deshacer; solo en campaña en solitario): una vez por asalto puedes **deshacer tu última jugada**. La mesa vuelve a como estaba y el Mazo se baraja de nuevo, así que lo que viste salir ya no vale. Usar la Manga no gasta el rebobinado. En sala no se rebobina: toda jugada es definitiva, y la mesa lo indica.
- Las cartas de baraja nunca bajan de 12 en el Mazo: lo que las quema deja de hacerlo al llegar a ese mínimo.
- **Victoria** (*Corte vencida*): los cuatro tronos caídos. **Derrota** (*Conjura deshecha*): tu Vida llega a 0.
- Modo **BRUTAL** (Asalto único): ${DIFFICULTY.brutal.maxIntegrity} de Vida y el Mazo agotado quita ${DIFFICULTY.brutal.collapseLoss}.
- **Asalto único en conjura de varios**: lo que quita el Mazo agotado se ajusta a cuántos jugáis, porque con más manos el Mazo se acaba antes: ${[1, 2, 3, 4].map((p) => `${cfg.collapseLoss - (cfg.collapseRelief?.[p - 1] ?? 0)} con ${p}`).join(', ')}.

## Campaña

Un roguelike de construcción de mazo: **${LAST_STAGE} asaltos** cada vez más duros, una sala del castillo cada uno, ${STAGES.filter((s) => s.boss).length} de ellos con **monarca**. Empiezas con un Sobre lacrado de ${BALANCE.inicio.sobre} cartas especiales y ${BALANCE.inicio.oro} de oro; entre asalto y asalto mejoras el Mazo y tus reliquias. La Vida base de los guardias es ${[11, 12, 13].map((r) => BALANCE.mesa.floorHp[r]).join(' / ')} y cada asalto la multiplica.

${table(['Asalto', 'Sala', 'Guardias por trono', 'Vida', 'Ataque', 'Monarca'], STAGES.map((s, i) => [String(i + 1), s.name, s.floors.map((r) => GUARD[r - 11]).join(', '), `×${n(s.hp)}`, s.threat === 0 ? 'base' : s.threat > 0 ? `+${s.threat}` : String(s.threat), s.boss ? 'sí' : '—']))}

En conjura de 2 a 4 jugadores los guardias aguantan un 30 % más.

### El Mapa del castillo

El Mapa enseña **desde el principio** qué monarca espera en cada asalto y cuál es su decreto. En los asaltos sin monarca eliges:

- una **ruta** (dos a elegir; tres con el ${up('rutas')} de la Orden), cada una con su **Juramento**;
- o el **Atajo**: te saltas el asalto (sin Botín, sin selección y sin Taberna) a cambio de un **Atajo de conspirador**.

**Juramentos.** Los normales piden una condición y pagan si la cumples; los de **riesgo** endurecen el asalto y pagan siempre que lo ganes.

${table(['Juramento', 'Condición', 'Premio', 'Tipo'], CONTRACTS.map((c) => [c.name, c.desc, c.reward, c.risk ? 'riesgo' : 'condición']))}

**Atajos de conspirador** (uno al azar por cada asalto con Atajo):

${table(['Atajo', 'Efecto'], TAGS.map((t) => [t.name, t.desc]))}

**Monarcas** (${BOSSES.length}; cada campaña sortea ${STAGES.filter((s) => s.boss).length}). Cada uno impone un **decreto**. Al caer dejan botín: una de dos reliquias Raras o mejores.

${table(['Monarca', 'Decreto', 'Efecto'], BOSSES.map((b) => [b.who, b.name, b.desc]))}

### El Botín

Tras cada asalto cobras oro (asalto ganado, Golpes exactos, la Vida que te queda e interés de 1 por cada ${BALANCE.cobro.interesCada} de oro guardado), recuperas ${BALANCE.cobro.curaTrasAsalto} de Vida y eliges **una de tres opciones a la vista** —dos cartas especiales y una carta de baraja ya marcada con un sello de lacre o un acabado— o pasas a cambio de ${BALANCE.cobro.sinSeleccion} de oro.

### La Taberna

Lo atiende el Tratante.

- **Reliquias** (su precio depende de la rareza: ${(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((r) => `${RARITY[r].name.toLowerCase()} ~${RARITY[r].cost}`).join(', ')}). Se pueden vender por la mitad.
- **Sobre lacrado**: lo abres ahí mismo y te quedas con 1 de 3.
- **Sobre a ciegas**: una especial sin verla, más barata.
- **Mesa de lacre**: pone el sello de lacre o el acabado en oferta sobre la carta de tu Mazo que elijas.
- **Pergamino**: sube de nivel una formación.
- **Curar** (+${BALANCE.taberna.curar.vida} de Vida), **La hoguera** (quema una carta; el Mazo no baja de ${MIN_DECK}) y **Renovar mesa** (cambia lo que hay en oferta), los tres con coste creciente.

### Secretos de la cripta

Tras los monarcas de los asaltos ${EVENT_AFTER.join(', ')} aparece un dilema. Cada campaña ve ${EVENT_AFTER.length} de estos ${EVENTS.length}:

${EVENTS.map((e) => `- **${e.name}.** ${e.text}\n${e.options.map((o) => `  - *${o.label}*: ${o.desc}`).join('\n')}`).join('\n')}

### Trono infinito, semillas y Reinados

- Después del asalto ${LAST_STAGE} puedes seguir al **Trono infinito**: asaltos sin final, siempre con monarca, cada uno un 45 % más resistente que el anterior (el primero, ×${n(stageDef(LAST_STAGE + 1).hp)}).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Asalto diario**: usa la fecha como semilla, con la ${DECK.obra.name.toLowerCase()}, en el Reinado 1 y sin nada de la Orden. Igual para todo el mundo.
- **Reinados**: hay ${ASCENSIONS.length}. Ganar una campaña abre el Reinado siguiente; cada uno añade **un giro** a todos los anteriores y da un 25 % más de Coronas.

${table(['Reinado', 'Nombre', 'Giro'], ASCENSIONS.map((a, i) => [String(i + 1), a.name, a.desc]))}

- **Sellos de maestría**: al ganar, la baraja usada y cada reliquia que llevabas quedan marcadas en la colección con el Reinado más alto que has ganado con ellas: sello de **bronce** (Reinados 1–3), de **hierro** (4–6) o de **oro** (7–8).
- **Reinicio rápido**: mantén pulsada la **R** (o Select en el mando) 0,7 segundos para volver a empezar la campaña con la misma baraja y el mismo Reinado. La que dejas no cuenta como derrota ni da Coronas.

## Reliquias

Llevas hasta **${TOOL_SLOTS} reliquias**, y se activan **de izquierda a derecha**. Puedes reordenarlas cuando quieras —arrastrando, o pulsando una y luego su hueco de destino—, incluso en pleno asalto. Hay ${TOOLS.length}: ${TOOLS.filter((t) => !t.box).length} en el surtido de salida y ${TOOLS.filter((t) => t.box).length} más en los arcones de la Orden.

${(Object.keys(ARCH) as Arch[])
  .map((a) => `### ${ARCH[a]}\n\n${table(['Reliquia', 'Rareza', 'Tipo', 'Efecto', 'Surtido'], TOOLS.filter((t) => t.arch === a).map((t) => [t.name, RARITY[t.rarity].name, KIND[t.kind], t.desc, t.box ? 'arcón de la Orden' : 'de salida']))}`)
  .join('\n\n')}

## Sellos de lacre y acabados

Una carta de baraja puede llevar un sello de lacre y un acabado a la vez.

${table(['Sello de lacre', 'Efecto'], SEALS.map((s) => [SEAL[s].name, SEAL[s].desc]))}

${table(['Acabado', 'Efecto'], TREATMENTS.map((t) => [TREATMENT[t].name, TREATMENT[t].desc]))}

Las cartas que arden (de ${TREATMENT.agrietado.name} que se hacen añicos, quemadas en la hoguera o fundidas) salen del Mazo para siempre; algunas reliquias (la familia del ${tool('trituradora')}) se ceban con cada carta quemada.

## Cartas especiales

No tienen palo ni número: acompañan a cualquier golpe (hasta ${MAX_SPECIALS} por golpe) o se juegan solas. Las legendarias salen cuatro veces menos y hay que desbloquearlas con su logro.

${table(['Carta', 'Efecto', 'Tipo'], SPECIALS.map((s) => [s.name, s.desc, s.locked ? 'legendaria' : 'común']))}

## Barajas iniciales

${table(['Baraja', 'Cómo cambia la campaña', 'Se desbloquea con'], DECKS.map((d) => [d.name, d.desc, d.unlock ? (ACHIEVEMENTS.find((a) => a.id === d.unlock)?.name ?? d.unlock) : '—']))}

## La Orden

Ganes o pierdas, cada campaña deja **Coronas**. En la Orden se gastan en **abrir arcones**, no en subir números. El surtido de salida es corto a propósito (${TOOLS.filter((t) => !t.box).length} reliquias); los arcones abren las otras ${TOOLS.filter((t) => t.box).length}, cada uno con su manera de jugar:

${table(['Mejora', 'Efecto', 'Coste'], UPGRADES.map((u) => [u.name, u.desc, u.costs.map((c) => `${c} ✦`).join(' · ')]))}

### Archivo de crónicas y copia de seguridad

- La Orden guarda las **25 últimas campañas terminadas**: cómo acabaron, en qué asalto y ante qué monarca, turnos, mayor Golpe, reliquias y semilla. Desde ahí se puede **copiar la Crónica** o **rejugar la semilla** con la misma baraja y el mismo Reinado.
- En **Ajustes**, *Exportar progreso* guarda la Orden, la colección, las crónicas y los ajustes en un archivo .json, e *Importar progreso* lo recupera en otro navegador, otro equipo o la versión de escritorio.

### Logros

${table(['Logro', 'Cómo', 'Coronas', 'Desbloquea'], ACHIEVEMENTS.map((a) => [a.name, a.desc, `+${a.renown}`, unlocksOf(a.id) ?? '—']))}

## Palabras clave

El juego usa solo seis palabras con significado propio. Todo lo demás se dice con palabras llanas. En pantalla van en negrita y, al pasar el puntero sobre cualquier texto que las mencione, el globo de ayuda encadena su definición.

${KEYWORDS.map((k) => `- **${k.name}**: ${k.desc}`).join('\n')}

## Controles

${CONTROLS_TABLE}

Los botones de la mesa enseñan su atajo: la tecla si juegas con teclado, el botón (A, B, X, Y, LB, RB, LT, RT, L3, R3) si lo último que tocaste fue un mando, y nada con ratón o pantalla táctil. Junto a los poderes de palo, la **rueda de palos** (♠ → ♦ → ♥ → ♣ → ♠) se enciende con lo que llevas elegido: una flecha si pegas con ventaja, un aspa si ese trono es Inmune a tu palo.

La **Lupa** abre cualquier carta, reliquia, guardia o monarca a tamaño de lámina, con la cuenta exacta de lo que aporta en ese momento. En sala, pulsar un trono cuando no es tu turno (o cualquier ruta, oferta o carta con Alt) deja una **seña** con tus iniciales para la conjura: no decide nada, solo señala.
`;

writeFileSync(new URL('../REGLAS.md', import.meta.url), md);

// ── README: bloques generados ──
interface Report {
  campaigns: number;
  winrate: { levels: { level: number; name: string; vacio: number; lleno: number; n: number }[]; decks: { name: string; vacio: number; lleno: number; n: number }[] };
  bosses: { who: string; lethality: number; faced: number }[];
  avgLethality: number;
  pacing: { stage: number; name: string; p50: number; p95: number }[];
  pacingByDeck?: { name: string; worstP95: number }[];
  classic?: { players: number; winrate: number; turns: number; n: number }[];
  flags: string[];
}
const p = (x: number) => `${n(Math.round(x * 10) / 10)} %`;
function balanceMd(r: Report): string {
  const levels = r.winrate.levels.filter((l) => l.n);
  const decks = r.winrate.decks.filter((d) => d.n);
  return [
    `Medido con \`npm run analyze:meta\`: **${r.campaigns.toLocaleString('es-ES')} campañas** con semilla jugadas por el bot de referencia (rutas, Juramentos, selección, la Taberna, Mesa de lacre, Secretos de la cripta, la Manga y orden de las reliquias). El informe completo —cada reliquia, carta especial, sello de lacre y acabado— queda en [scripts/meta-report.json](scripts/meta-report.json). Cada porcentaje es una muestra: con 1.500 campañas, el margen es de unos ±2,5 puntos, así que dos medidas que difieran menos que eso no se distinguen.`,
    '',
    `Campañas ganadas por Reinado (${DECK.obra.name.toLowerCase()}, ${levels[0]?.n ?? 0} campañas por celda). Objetivos: Reinado 1 entre el 24 y el 30 % con la Orden vacía y entre el 40 y el 48 % con la Orden llena; Reinado 8 entre el 6 y el 9 % con la Orden vacía y entre el 12 y el 17 % con la Orden llena; y cada Reinado, más difícil que el anterior.`,
    '',
    table(['Reinado', 'Orden vacía', 'Orden llena'], levels.map((l) => [`${l.level} · ${l.name}`, p(l.vacio), p(l.lleno)])),
    '',
    `Por baraja inicial (Reinado 1, ${decks[1]?.n ?? 0} campañas por celda). Objetivo: todas entre el 24 y el 31 % sin la Orden y entre el 40 y el 45 % con ella.`,
    '',
    table(['Baraja', 'Orden vacía', 'Orden llena', 'Lo que suma la Orden'], decks.map((d) => [d.name, p(d.vacio), p(d.lleno), `+${n(Math.round((d.lleno - d.vacio) * 10) / 10)}`])),
    '',
    `Monarcas: de cada vez que una campaña llega a uno, cuántas acaban ahí (media ${p(r.avgLethality)}). Objetivo: todos entre 0,8× y 1,3× de la media.`,
    '',
    table(['Monarca', 'Letalidad', 'Frente a la media'], r.bosses.map((b) => [b.who, p(b.lethality), `×${n(Math.round((b.lethality / (r.avgLethality || 1)) * 100) / 100)}`])),
    '',
    'Turnos por asalto. Objetivo: asalto 1 de 5 a 7 turnos de mediana (P95 ≤ 10); asaltos 2 y 3 de 8 a 10 (P95 ≤ 15); asaltos 4 a 8 de 9 a 13 (P95 ≤ 19), con cualquier baraja.',
    '',
    table(['Asalto', 'Mediana', 'P95'], r.pacing.map((x) => [`${x.stage} · ${x.name}`, String(x.p50), String(x.p95)])),
    '',
    r.pacingByDeck?.length ? `Peor percentil 95 de los asaltos 4 a 8, por baraja: ${r.pacingByDeck.map((d) => `${d.name.replace('Baraja ', '')} ${d.worstP95}`).join(' · ')}.` : '',
    '',
    r.classic?.length ? `Asalto único (${r.classic[0].n} partidas por celda; objetivo 58–65 %): ${r.classic.map((c) => `${c.players} jugador${c.players > 1 ? 'es' : ''} ${p(c.winrate)}`).join(' · ')}.` : '',
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
