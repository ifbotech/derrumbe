// Genera REGLAS.md a partir de los datos del propio motor, para que el reglamento escrito
// nunca se desincronice de lo que el juego hace de verdad:  npm run docs
import { writeFileSync } from 'node:fs';
import { DIFFICULTY, FORM, FORMATIONS, FORMATION_NAME, Formation, SEAL, SEALS, TOWER_FX, TREATMENT, TREATMENTS } from '../src/rules/engine';
import { ACHIEVEMENTS, unlocksOf } from '../src/rules/achievements';
import { BOSSES, CONTRACTS, DECKS, EVENTS, EVENT_AFTER, LAST_STAGE, MIN_DECK, STAGES, TAGS, UPGRADES, stageDef } from '../src/rules/run';
import { MAX_SPECIALS, SPECIALS } from '../src/rules/specials';
import { ARCH, Arch, RARITY, TOOLS, TOOL_SLOTS } from '../src/rules/tools';

const cfg = DIFFICULTY.obra;
const n = (x: number) => String(Math.round(x * 100) / 100).replace('.', ',');
const table = (head: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const FORM_CARDS: Record<Formation, string> = {
  solo: '1 carta',
  grupo: '2 o 3 del mismo número',
  escalera: '3 o más números seguidos, de cualquier palo',
  doblepar: '2 parejas',
  color: '5 o más del mismo palo',
  full: 'un trío y una pareja',
  escaleracolor: '3 o más seguidas del mismo palo',
  poker: '4 del mismo número',
};
const KIND = { f: '+F suma Fuerza', r: '+R suma Resonancia', x: '×R multiplica', copy: '⇉ copia', p: '• pasiva' } as const;

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

### Golpe limpio y onda sísmica

- **Golpe limpio**: tirar un piso con el daño exacto. La sirena no suena ese turno y cobras 1 de oro.
- **Onda sísmica**: el piso de debajo pierde un cuarto de su resistencia, y empiezas una **racha**: tu próximo golpe resuena +0,5 por cada golpe limpio seguido (hasta +2). La racha se corta si el golpe no es limpio.

### Estados de las torres

- **${TOWER_FX.fractura.name}**: la provoca un golpe de un solo material (2 o más cartas, todas del mismo palo). ${TOWER_FX.fractura.desc}
- **${TOWER_FX.sobrecarga.name}**: la provoca un golpe que mezcla 3 palos o más. ${TOWER_FX.sobrecarga.desc}
- **${TOWER_FX.apuntalado.name}**: lo traen algunos jefes y ascensos. ${TOWER_FX.apuntalado.desc}

### Reglas especiales

- **Comodín · Huelga**: se juega solo sobre una torre. Su piso actual queda **desarmado** (amenaza 0 hasta que caiga) y la sirena no suena. El comodín sale de la obra.
- **Colapso**: si la cantera se agota, la escombrera se baraja y vuelve a ser cantera, pero el búnker pierde **${cfg.collapseLoss}** de integridad (el muro no lo evita).
- **Victoria**: las cuatro torres en ruinas. **Derrota**: la integridad del búnker llega a 0.
- Modo **BRUTAL** (partida clásica): búnker de ${DIFFICULTY.brutal.maxIntegrity} y colapsos de ${DIFFICULTY.brutal.collapseLoss}.

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

### Cimientos abisales, semillas y ascenso

- Después de la obra ${LAST_STAGE} puedes seguir a los **cimientos abisales**: obras sin final, siempre con jefe, cada una un 45 % más resistente que la anterior (la primera, ×${n(stageDef(LAST_STAGE + 1).hp)}).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Obra diaria**: usa la fecha como semilla, con la baraja de obra, sin ascenso y sin nada del gremio. Igual para todo el mundo.
- **Ascenso**: cada victoria abre un nivel más. Cada nivel: torres +10 % y renombre +25 %; desde el 2 las K llegan apuntaladas, desde el 3 la amenaza sube 1 y desde el 4 los colapsos quitan 2 más.

## Cinturón de herramientas

Llevas hasta **${TOOL_SLOTS} herramientas**, y se activan **de izquierda a derecha**. Puedes reordenarlas cuando quieras —arrastrando, o pulsando una y luego su hueco de destino—, incluso en plena obra. Hay ${TOOLS.length}: ${TOOLS.filter((t) => !t.box).length} en el surtido de salida y ${TOOLS.filter((t) => t.box).length} más en las cajas del gremio.

${(Object.keys(ARCH) as Arch[])
  .map((a) => `### ${ARCH[a]}\n\n${table(['Herramienta', 'Rareza', 'Tipo', 'Efecto', 'Surtido'], TOOLS.filter((t) => t.arch === a).map((t) => [t.name, RARITY[t.rarity].name, KIND[t.kind], t.desc, t.box ? 'caja del gremio' : 'de salida']))}`)
  .join('\n\n')}

## Sellos y tratamientos

Una carta de baraja puede llevar un sello y un tratamiento a la vez.

${table(['Sello', 'Efecto'], SEALS.map((s) => [SEAL[s].name, SEAL[s].desc]))}

${table(['Tratamiento', 'Efecto'], TREATMENTS.map((t) => [TREATMENT[t].name, TREATMENT[t].desc]))}

Las cartas destruidas (agrietadas que se hacen añicos, quemadas o fundidas) salen del mazo para siempre y cuentan como **escombros**, que ceban a las herramientas de la trituradora.

## Cartas especiales

No tienen palo ni número: acompañan a cualquier golpe (hasta ${MAX_SPECIALS} por golpe) o se juegan solas. Las legendarias salen cuatro veces menos y hay que desbloquearlas con su logro.

${table(['Carta', 'Efecto', 'Tipo'], SPECIALS.map((s) => [s.name, s.desc, s.locked ? 'legendaria' : 'común']))}

## Barajas iniciales

${table(['Baraja', 'Cómo cambia la campaña', 'Se desbloquea con'], DECKS.map((d) => [d.name, d.desc, d.unlock ? (ACHIEVEMENTS.find((a) => a.id === d.unlock)?.name ?? d.unlock) : '—']))}

## El gremio

Ganes o pierdas, cada campaña deja **renombre**. En el gremio se gasta en **abrir surtidos**, no en fuerza bruta:

${table(['Mejora', 'Efecto', 'Coste'], UPGRADES.map((u) => [u.name, u.desc, u.costs.map((c) => `${c} ✦`).join(' · ')]))}

### Logros

${table(['Logro', 'Cómo', 'Renombre', 'Desbloquea'], ACHIEVEMENTS.map((a) => [a.name, a.desc, `+${a.renown}`, unlocksOf(a.id) ?? '—']))}

## Atajos de teclado

**1–9** eligen carta · **← →** apuntan a una torre · **Espacio** o **Enter** golpean · **Supr** descarta · **Esc** suelta la selección · **Tab** abre la cantera y la escombrera.
`;

writeFileSync(new URL('../REGLAS.md', import.meta.url), md);
console.log(`REGLAS.md · ${md.split('\n').length} líneas`);
