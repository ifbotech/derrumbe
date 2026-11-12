// Genera REGLAS.md a partir de los datos del propio motor, para que el reglamento escrito
// nunca se desincronice de lo que el juego hace de verdad:  npm run docs
// De paso pone al día en README.md las tablas de balance (desde scripts/meta-report.json) y la de
// controles, que van entre marcas <!-- …:inicio --> y <!-- …:fin -->.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { DIFFICULTY, FORM, FORMATIONS, FORMATION_NAME, Formation, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../src/rules/engine';
import { ACHIEVEMENTS, unlocksOf } from '../src/rules/achievements';
import { KEYWORDS } from '../src/rules/keywords';
import { ASCENSIONS, BOSSES, CONTRACTS, DECKS, EVENTS, EVENT_AFTER, FATIGUE, LAST_STAGE, MIN_DECK, STAGES, TAGS, UPGRADES, stageDef } from '../src/rules/run';
import { MAX_SPECIALS, SPECIALS } from '../src/rules/specials';
import { ARCH, Arch, RARITY, TOOLS, TOOL_SLOTS } from '../src/rules/tools';
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
const KIND = { f: '+F suma Fuerza', r: '+R suma Resonancia', x: '×R multiplica', copy: '⇉ copia', p: '• pasiva' } as const;

// la tabla de controles es la de prompts.ts: la misma que enseñan Ajustes y las insignias de cada botón
const CONTROLS_TABLE = table(['Acción', 'Teclado y ratón', 'Mando'], CONTROL_ROWS);

const md = `# DERRUMBE — Reglas

> Este archivo se genera con \`npm run docs\` a partir de los datos del motor (\`src/rules\`). No lo edites a mano.

Juego cooperativo de demolición para 1 a 4 jugadores con baraja francesa (52 cartas + 2 comodines).
Sois una cuadrilla: hay que echar abajo las **cuatro torres** antes de que sepulten vuestro **búnker**.
Se gana o se pierde en equipo. La partida clásica también se puede jugar en mesa con una baraja real.

## Preparación

1. Separa las 12 figuras y forma 4 **torres**, una por palo. Cada torre tiene 3 pisos apilados:
   la **J** arriba (se demuele primero), luego la **Q** y al final la **K**.
2. Baraja las 40 cartas numerales (del As al 10) con los 2 comodines: es la **cantera** (mazo).
   Deja sitio al lado para la **escombrera** (descartes).
3. Cada jugador roba su mano de **${cfg.handSize[1]}** cartas.
4. El **búnker** empieza con **${cfg.maxIntegrity} de integridad** y **0 de muro** (máximo ${cfg.wallCap}).

${table(['Piso', 'Resistencia', 'Amenaza'], [11, 12, 13].map((r) => ['JQK'[r - 11], String(cfg.floorHp[r]), String(cfg.floorThreat[r])]))}

Cada palo es un material: ♠ **ACERO**, ♦ **VIDRIO**, ♥ **LADRILLO**, ♣ **HORMIGÓN**.

## El turno

1. **Acción** (elige una): **golpear** una torre con una formación, **descartar** las cartas que quieras o jugar un **comodín** (huelga). Solo se puede **pasar** con la mano vacía.
2. **Sirena**: se voltea la carta superior de la cantera. La torre de ese palo golpea al búnker con la **amenaza** de su piso actual. El **muro** absorbe primero; el resto baja la integridad. Si esa torre ya es ruina, o sale un comodín, no pasa nada.
3. **Robar** hasta completar la mano. Turno del siguiente.

## Fuerza × Resonancia

Todo golpe se calcula igual:

> **Daño = Fuerza × Resonancia** (redondeado)

Se resuelve de izquierda a derecha, y cada paso se ve en la mesa:

1. **La formación** pone la base de Fuerza y de Resonancia.
2. **Lo que arrastra la mesa**: la racha de golpes limpios (onda sísmica), la Fuerza cargada y el estado de la torre.
3. **Cada carta**, en el orden en que la elegiste, suma su número como Fuerza (por la ventaja de material). Enseguida actúan su **tratamiento** y su **sello**.
4. **Las cartas especiales** que acompañan al golpe (hasta ${MAX_SPECIALS}).
5. **El cinturón de herramientas**, hueco a hueco.

Lo que **suma** cuenta donde está. Lo que **multiplica** la Resonancia multiplica todo lo acumulado hasta ese momento: conviene sumar primero y multiplicar al final. El **As** vale **11** y enlaza escaleras por abajo (A-2-3) y por arriba (9-10-A).

${table(['Formación', 'Cartas', 'Fuerza base', 'Resonancia', 'Por nivel de plano'], FORMATIONS.map((f) => [FORMATION_NAME[f], FORM_CARDS[f], `+${FORM[f].f}`, `×${n(FORM[f].r)}`, `+${FORM[f].lf} F · +${n(FORM[f].lr)} R`]))}

### Materiales

${table(['Torre', 'Fuerza doble (×2)', 'Sin Fuerza (×0)'], [['♠ ACERO', '♣ tréboles', '♠ picas'], ['♦ VIDRIO', '♠ picas', '♦ diamantes'], ['♥ LADRILLO', '♦ diamantes', '♥ corazones'], ['♣ HORMIGÓN', '♥ corazones', '♣ tréboles']])}

Ciclo: ♠ rompe ♦ · ♦ corta ♥ · ♥ agrieta ♣ · ♣ sepulta ♠.

### Poder de cada palo

Además de su Fuerza, las cartas de cada palo activan su poder (aunque no sumen nada):

- ♠ **Perforar**: si la formación lleva alguna pica, el daño sobrante al tirar un piso pasa al piso siguiente.
- ♦ **Esquirlas**: las demás torres reciben un tercio (hacia abajo) del valor de tus diamantes.
- ♥ **Reparar**: el búnker recupera un tercio (hacia arriba) del valor de tus corazones.
- ♣ **Muro**: levantas un tercio (hacia arriba) del valor de tus tréboles como muro.

### Golpe limpio

Tirar un piso con el **daño exacto** es la jugada maestra del juego. Cuando lo consigues:

- la **sirena calla** ese turno,
- cobras **1 de oro** y **robas 1 carta** de más,
- el piso de debajo pierde **un cuarto de su resistencia** (la onda del golpe sigue torre abajo),
- y empiezas una **racha**: tu próximo golpe resuena +0,5 por cada golpe limpio seguido (hasta +2). La racha se corta si el golpe no es limpio.

La mesa te lo avisa antes de golpear: la previsualización de cada torre dice si el golpe sería limpio.

### Estados de las torres

- **${TOWER_FX.fractura.name}**: la provoca un golpe de un solo material (2 o más cartas, todas del mismo palo). ${TOWER_FX.fractura.desc}
- **${TOWER_FX.sobrecarga.name}**: la provoca un golpe que mezcla 3 palos o más. ${TOWER_FX.sobrecarga.desc}
- **${TOWER_FX.apuntalado.name}**: lo traen algunos jefes y niveles de obra. ${TOWER_FX.apuntalado.desc}

### Reglas especiales

- **Comodín · Huelga**: se juega solo sobre una torre. Su piso actual queda **desarmado** (amenaza 0 hasta que caiga) y la sirena no suena. El comodín sale de la obra.
- **Fatiga de cimientos**: ninguna obra aguanta eternamente. En campaña, desde el turno ${FATIGUE.start + 1} de cada obra y cada ${FATIGUE.every} turnos, la fatiga sube un nivel; cada nivel da **+${n(FATIGUE.res)} de Resonancia** a todos los golpes y **+1 de amenaza** a todas las torres. La obra se acelera en los dos sentidos: pegas más y la sirena también. La mesa avisa tres turnos antes. En cuadrilla empieza más tarde, en proporción a lo que aguantan las obras; en la partida clásica, en el turno ${(cfg.fatigueStart ?? 0) + 1} y cada ${cfg.fatigueEvery} turnos.
- **Colapso**: si la cantera se agota, la escombrera se baraja y vuelve a ser cantera, pero el búnker pierde **${cfg.collapseLoss}** de integridad (el muro no lo evita). Cada vuelta completa de la cuadrilla a la cantera encarece el colapso en 1: las obras no se pueden estirar sin fin.
- **As de compañía**: un As forma jugada con **cualquier otra carta** (×${n(FORM.compania.r)} de Resonancia) y aporta el poder de su palo. Es la manera de colar un poder en un golpe: un As de ♣ para levantar muro, uno de ♥ para reparar, uno de ♠ para perforar.
- **Andamio**: junto a la mano hay un hueco de reserva. Una vez por turno, y sin gastar el turno, puedes guardar en él una carta de tu mano: no cuenta para el tamaño de la mano (robas hasta completarla igual) y se juega desde ahí como si estuviera en ella. Si el hueco está ocupado, la carta guardada vuelve a la mano. La herramienta *Pasarela* añade un segundo hueco. En la partida guiada no hay andamio.
- **Tiza de replanteo** (solo en campaña en solitario): una vez por obra puedes **deshacer tu última jugada**. La mesa vuelve a como estaba y la cantera se baraja de nuevo, así que lo que viste salir ya no vale. Mover el andamio no gasta la tiza. En sala no hay tiza: toda jugada es definitiva, y la mesa lo indica.
- Las cartas de baraja nunca bajan de 12 en el mazo: lo que las destruye deja de hacerlo al llegar a ese mínimo.
- **Victoria**: las cuatro torres en ruinas. **Derrota**: la integridad del búnker llega a 0.
- Modo **BRUTAL** (partida clásica): búnker de ${DIFFICULTY.brutal.maxIntegrity} y colapsos de ${DIFFICULTY.brutal.collapseLoss}.
- **Partida clásica en cuadrilla**: el colapso se ajusta a cuántos jugáis, porque con más manos la cantera se agota antes: ${[1, 2, 3, 4].map((p) => `${cfg.collapseLoss - (cfg.collapseRelief?.[p - 1] ?? 0)} con ${p}`).join(', ')}.

## Campaña

Un roguelike de construcción de mazo: **${LAST_STAGE} obras** cada vez más duras, ${STAGES.filter((s) => s.boss).length} de ellas con **jefe**. Empiezas con un sobre de 3 cartas especiales y 4 de oro; entre obra y obra mejoras el mazo y el cinturón. La resistencia base de los pisos es 20 / 30 / 40 y cada obra la multiplica.

${table(['Obra', 'Nombre', 'Pisos por torre', 'Resistencia', 'Amenaza', 'Jefe'], STAGES.map((s, i) => [String(i + 1), s.name, String(s.floors.length), `×${n(s.hp)}`, s.threat === 0 ? 'base' : s.threat > 0 ? `+${s.threat}` : String(s.threat), s.boss ? 'sí' : '—']))}

En cuadrilla (2 a 4 jugadores) las obras aguantan un 30 % más.

### El plano de demolición

El plano enseña **desde el principio** qué jefe espera en cada obra y cuál es su maldición. En las obras sin jefe eliges:

- una **ruta** (dos a elegir; tres con el Topógrafo del gremio), cada una con su **contrato**;
- o el **atajo**: te saltas la obra (sin cobro, sin selección y sin ferretería) a cambio de una **etiqueta sindical**.

**Contratos.** Los normales piden una condición y pagan si la cumples; los de **riesgo** endurecen la obra y pagan siempre que la termines.

${table(['Contrato', 'Condición', 'Premio', 'Tipo'], CONTRACTS.map((c) => [c.name, c.desc, c.reward, c.risk ? 'riesgo' : 'condición']))}

**Etiquetas sindicales** (una al azar por cada obra con atajo):

${table(['Etiqueta', 'Efecto'], TAGS.map((t) => [t.name, t.desc]))}

**Jefes de obra** (${BOSSES.length}; cada campaña sortea ${STAGES.filter((s) => s.boss).length}). Al caer dejan botín: una de dos herramientas de oficio o mejor.

${table(['Jefe', 'Maldición', 'Efecto'], BOSSES.map((b) => [b.who, b.name, b.desc]))}

### Al cobrar

Tras cada obra cobras oro (obra demolida, golpes limpios, búnker en pie e interés de 1 por cada 5 de oro guardado), el búnker recupera 4 de integridad y eliges **una de tres opciones a la vista** —dos cartas especiales y una carta de baraja ya marcada con un sello o un tratamiento— o pasas a cambio de 3 de oro.

### La ferretería

- **Herramientas** (su precio depende de la rareza: ${(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((r) => `${RARITY[r].name.toLowerCase()} ~${RARITY[r].cost}`).join(', ')}). Se pueden vender por la mitad.
- **Sobre de especiales**: lo abres ahí mismo y te quedas con 1 de 3.
- **Sobre clandestino**: una especial a ciegas, más barata.
- **Mesa de forja**: estampa el sello o el tratamiento en oferta sobre la carta de tu mazo que elijas.
- **Plano**: sube de nivel una formación.
- **Reparar** (+6 de integridad), **Quemador** (destruye una carta; el mazo no baja de ${MIN_DECK}) y **Revolver cajones** (cambia el surtido), los tres con coste creciente.

### Hallazgos en los cimientos

Tras los jefes de las obras ${EVENT_AFTER.join(', ')} aparece un dilema. Cada campaña ve ${EVENT_AFTER.length} de estos ${EVENTS.length}:

${EVENTS.map((e) => `- **${e.name}.** ${e.text}\n${e.options.map((o) => `  - *${o.label}*: ${o.desc}`).join('\n')}`).join('\n')}

### Cimientos abisales, semillas y niveles de obra

- Después de la obra ${LAST_STAGE} puedes seguir a los **cimientos abisales**: obras sin final, siempre con jefe, cada una un 45 % más resistente que la anterior (la primera, ×${n(stageDef(LAST_STAGE + 1).hp)}).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Obra diaria**: usa la fecha como semilla, con la baraja de obra, en el nivel 1 y sin nada del gremio. Igual para todo el mundo.
- **Niveles de obra**: hay ${ASCENSIONS.length}. Ganar una campaña abre el nivel siguiente; cada nivel añade **un giro** a todos los anteriores y da un 25 % más de renombre.

${table(['Nivel', 'Nombre', 'Giro'], ASCENSIONS.map((a, i) => [String(i + 1), a.name, a.desc]))}

- **Sellos de maestría**: al ganar, la baraja usada y cada herramienta que llevabas en el cinturón quedan marcadas en la colección con el nivel de obra más alto que has ganado con ellas: remache de **bronce** (niveles 1–3), de **hierro** (4–6) o de **oro** (7–8).
- **Reinicio rápido**: mantén pulsada la **R** (o Select en el mando) 0,7 segundos para volver a empezar la campaña con la misma baraja y el mismo nivel de obra. La que dejas no cuenta como derrota ni cobra renombre.

## Cinturón de herramientas

Llevas hasta **${TOOL_SLOTS} herramientas**, y se activan **de izquierda a derecha**. Puedes reordenarlas cuando quieras —arrastrando, o pulsando una y luego su hueco de destino—, incluso en plena obra. Hay ${TOOLS.length}: ${TOOLS.filter((t) => !t.box).length} en el surtido de salida y ${TOOLS.filter((t) => t.box).length} más en las cajas del gremio.

${(Object.keys(ARCH) as Arch[])
  .map((a) => `### ${ARCH[a]}\n\n${table(['Herramienta', 'Rareza', 'Tipo', 'Efecto', 'Surtido'], TOOLS.filter((t) => t.arch === a).map((t) => [t.name, RARITY[t.rarity].name, KIND[t.kind], t.desc, t.box ? 'caja del gremio' : 'de salida']))}`)
  .join('\n\n')}

## Sellos y tratamientos

Una carta de baraja puede llevar un sello y un tratamiento a la vez.

${table(['Sello', 'Efecto'], SEALS.map((s) => [SEAL[s].name, SEAL[s].desc]))}

${table(['Tratamiento', 'Efecto'], TREATMENTS.map((t) => [TREATMENT[t].name, TREATMENT[t].desc]))}

Las cartas destruidas (agrietadas que se hacen añicos, quemadas o fundidas) salen del mazo para siempre; algunas herramientas (la familia de la trituradora) se ceban con cada carta destruida.

## Cartas especiales

No tienen palo ni número: acompañan a cualquier golpe (hasta ${MAX_SPECIALS} por golpe) o se juegan solas. Las legendarias salen cuatro veces menos y hay que desbloquearlas con su logro.

${table(['Carta', 'Efecto', 'Tipo'], SPECIALS.map((s) => [s.name, s.desc, s.locked ? 'legendaria' : 'común']))}

## Barajas iniciales

${table(['Baraja', 'Cómo cambia la campaña', 'Se desbloquea con'], DECKS.map((d) => [d.name, d.desc, d.unlock ? (ACHIEVEMENTS.find((a) => a.id === d.unlock)?.name ?? d.unlock) : '—']))}

## El gremio

Ganes o pierdas, cada campaña deja **renombre**. En el gremio se gasta en **abrir surtidos**, no en fuerza bruta. El surtido base es corto a propósito (${TOOLS.filter((t) => !t.box).length} herramientas); las cajas abren las otras ${TOOLS.filter((t) => t.box).length}, cada una con su manera de jugar:

${table(['Mejora', 'Efecto', 'Coste'], UPGRADES.map((u) => [u.name, u.desc, u.costs.map((c) => `${c} ✦`).join(' · ')]))}

### Archivo de actas y copia de seguridad

- El gremio guarda las **25 últimas campañas terminadas**: cómo acabaron, en qué obra y ante qué jefe, turnos, mayor golpe, herramientas y semilla. Desde ahí se puede **copiar el acta** o **rejugar la semilla** con la misma baraja y el mismo nivel de obra.
- En **Ajustes**, *Exportar progreso* guarda gremio, colección, actas y ajustes en un archivo .json, e *Importar progreso* lo recupera en otro navegador, otro equipo o la versión de escritorio.

### Logros

${table(['Logro', 'Cómo', 'Renombre', 'Desbloquea'], ACHIEVEMENTS.map((a) => [a.name, a.desc, `+${a.renown}`, unlocksOf(a.id) ?? '—']))}

## Palabras clave

El juego usa solo seis palabras con significado propio. Todo lo demás se dice con palabras llanas. En pantalla van en negrita y, al pasar el puntero sobre cualquier texto que las mencione, el globo de ayuda encadena su definición.

${KEYWORDS.map((k) => `- **${k.name}**: ${k.desc}`).join('\n')}

## Controles

${CONTROLS_TABLE}

Los botones de la mesa enseñan su atajo: la tecla si juegas con teclado, el botón (A, B, X, Y, LB, RB, LT, RT, L3, R3) si lo último que tocaste fue un mando, y nada con ratón o pantalla táctil. Junto a los poderes de palo, la **rueda de materiales** (♠ → ♦ → ♥ → ♣ → ♠) se enciende con lo que llevas elegido: flecha de latón si pegas con ventaja, aspa de hierro si esa torre es inmune a tu palo.

La **lupa de grabador** abre cualquier carta, herramienta, piso de torre o jefe a tamaño de lámina, con la cuenta exacta de lo que aporta en ese momento. En sala, pulsar una torre cuando no es tu turno (o cualquier ruta, oferta o carta con Alt) deja una **marca de tiza** con tus iniciales para la cuadrilla: no decide nada, solo señala.
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
    `Medido con \`npm run analyze:meta\`: **${r.campaigns.toLocaleString('es-ES')} campañas** con semilla jugadas por el bot de referencia (rutas, contratos, selección, ferretería, forja, hallazgos, andamio y orden del cinturón). El informe completo —cada herramienta, carta especial, sello y tratamiento— queda en [scripts/meta-report.json](scripts/meta-report.json). Cada porcentaje es una muestra: con 1.500 campañas, el margen es de unos ±2,5 puntos, así que dos medidas que difieran menos que eso no se distinguen.`,
    '',
    `Campañas ganadas por nivel de obra (baraja de obra, ${levels[0]?.n ?? 0} campañas por celda). Objetivos: nivel 1 entre el 24 y el 30 % con el gremio vacío y entre el 40 y el 48 % con el gremio lleno; nivel 8 entre el 6 y el 9 % con el gremio vacío y entre el 12 y el 17 % con el gremio lleno; y cada nivel, más difícil que el anterior.`,
    '',
    table(['Nivel', 'Gremio vacío', 'Gremio lleno'], levels.map((l) => [`${l.level} · ${l.name}`, p(l.vacio), p(l.lleno)])),
    '',
    `Por baraja inicial (nivel 1, ${decks[1]?.n ?? 0} campañas por celda). Objetivo: todas entre el 24 y el 31 % sin gremio y entre el 40 y el 45 % con él.`,
    '',
    table(['Baraja', 'Gremio vacío', 'Gremio lleno', 'Lo que suma el gremio'], decks.map((d) => [d.name, p(d.vacio), p(d.lleno), `+${n(Math.round((d.lleno - d.vacio) * 10) / 10)}`])),
    '',
    `Jefes: de cada vez que una campaña llega a uno, cuántas acaba ahí (media ${p(r.avgLethality)}). Objetivo: todos entre 0,8× y 1,3× de la media.`,
    '',
    table(['Jefe', 'Letalidad', 'Frente a la media'], r.bosses.map((b) => [b.who, p(b.lethality), `×${n(Math.round((b.lethality / (r.avgLethality || 1)) * 100) / 100)}`])),
    '',
    'Turnos por obra. Objetivo: obra 1 de 5 a 7 turnos de mediana (P95 ≤ 10); obras 2 y 3 de 8 a 10 (P95 ≤ 15); obras 4 a 8 de 9 a 13 (P95 ≤ 19), con cualquier baraja.',
    '',
    table(['Obra', 'Mediana', 'P95'], r.pacing.map((x) => [`${x.stage} · ${x.name}`, String(x.p50), String(x.p95)])),
    '',
    r.pacingByDeck?.length ? `Peor percentil 95 de las obras 4 a 8, por baraja: ${r.pacingByDeck.map((d) => `${d.name.replace('Baraja ', '')} ${d.worstP95}`).join(' · ')}.` : '',
    '',
    r.classic?.length ? `Partida clásica (una obra, ${r.classic[0].n} partidas por celda; objetivo 58–65 %): ${r.classic.map((c) => `${c.players} jugador${c.players > 1 ? 'es' : ''} ${p(c.winrate)}`).join(' · ')}.` : '',
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
