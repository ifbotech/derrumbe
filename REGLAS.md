# DERRUMBE — Reglas

> Este archivo se genera con `npm run docs` a partir de los datos del motor (`src/rules`). No lo edites a mano.

Juego cooperativo de demolición para 1 a 4 jugadores con baraja francesa (52 cartas + 2 comodines).
Sois una cuadrilla: hay que echar abajo las **cuatro torres** antes de que sepulten vuestro **búnker**.
Se gana o se pierde en equipo. La partida clásica también se puede jugar en mesa con una baraja real.

## Preparación

1. Separa las 12 figuras y forma 4 **torres**, una por palo. Cada torre tiene 3 pisos apilados:
   la **J** arriba (se demuele primero), luego la **Q** y al final la **K**.
2. Baraja las 40 cartas numerales (del As al 10) con los 2 comodines: es la **cantera** (mazo).
   Deja sitio al lado para la **escombrera** (descartes).
3. Cada jugador roba su mano de **6** cartas.
4. El **búnker** empieza con **20 de integridad** y **0 de muro** (máximo 8).

| Piso | Resistencia | Amenaza |
|---|---|---|
| J | 80 | 3 |
| Q | 115 | 5 |
| K | 150 | 7 |

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
4. **Las cartas especiales** que acompañan al golpe (hasta 2).
5. **El cinturón de herramientas**, hueco a hueco.

Lo que **suma** cuenta donde está. Lo que **multiplica** la Resonancia multiplica todo lo acumulado hasta ese momento: conviene sumar primero y multiplicar al final. El **As** vale **11** y enlaza escaleras por abajo (A-2-3) y por arriba (9-10-A).

| Formación | Cartas | Fuerza base | Resonancia | Por nivel de plano |
|---|---|---|---|---|
| Carta sola | 1 carta | +0 | ×1 | +4 F · +0,15 R |
| Grupo | 2 o 3 del mismo número | +2 | ×1,2 | +3 F · +0,2 R |
| Escalera | 3 o más números seguidos, de cualquier palo | +4 | ×1,3 | +3 F · +0,2 R |
| Doble par | 2 parejas | +6 | ×1,5 | +3 F · +0,2 R |
| Color | 5 o más del mismo palo | +8 | ×1,8 | +3 F · +0,2 R |
| Full | un trío y una pareja | +10 | ×2 | +3 F · +0,2 R |
| Escalera de color | 3 o más seguidas del mismo palo | +10 | ×2 | +3 F · +0,2 R |
| Póker | 4 del mismo número | +14 | ×2,5 | +3 F · +0,2 R |

### Materiales

| Torre | Fuerza doble (×2) | Sin Fuerza (×0) |
|---|---|---|
| ♠ ACERO | ♣ tréboles | ♠ picas |
| ♦ VIDRIO | ♠ picas | ♦ diamantes |
| ♥ LADRILLO | ♦ diamantes | ♥ corazones |
| ♣ HORMIGÓN | ♥ corazones | ♣ tréboles |

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

- **Fractura expuesta**: la provoca un golpe de un solo material (2 o más cartas, todas del mismo palo). El próximo golpe contra esta torre resuena ×1,5.
- **Sobrecarga**: la provoca un golpe que mezcla 3 palos o más. Esta torre se salta su próximo golpe de sirena.
- **Apuntalado**: lo traen algunos jefes y ascensos. El primer golpe contra este piso resuena a la mitad.

### Reglas especiales

- **Comodín · Huelga**: se juega solo sobre una torre. Su piso actual queda **desarmado** (amenaza 0 hasta que caiga) y la sirena no suena. El comodín sale de la obra.
- **Colapso**: si la cantera se agota, la escombrera se baraja y vuelve a ser cantera, pero el búnker pierde **5** de integridad (el muro no lo evita).
- **Victoria**: las cuatro torres en ruinas. **Derrota**: la integridad del búnker llega a 0.
- Modo **BRUTAL** (partida clásica): búnker de 16 y colapsos de 6.

## Campaña

Un roguelike de construcción de mazo: **8 obras** cada vez más duras, 4 de ellas con **jefe**. Empiezas con un sobre de 3 cartas especiales y 4 de oro; entre obra y obra mejoras el mazo y el cinturón. La resistencia base de los pisos es 20 / 30 / 40 y cada obra la multiplica.

| Obra | Nombre | Pisos por torre | Resistencia | Amenaza | Jefe |
|---|---|---|---|---|---|
| 1 | Caseta de obra | 1 | ×2,4 | -1 | — |
| 2 | Bloque de pisos | 2 | ×3,1 | -1 | — |
| 3 | Torre del capataz | 3 | ×3,8 | base | sí |
| 4 | Polígono | 3 | ×5 | base | — |
| 5 | Ciudadela | 3 | ×6,5 | base | sí |
| 6 | Rascacielos | 3 | ×8,4 | +1 | — |
| 7 | Fortaleza | 3 | ×10,8 | +1 | sí |
| 8 | La Torre Madre | 3 | ×14 | +1 | sí |

En cuadrilla (2 a 4 jugadores) las obras aguantan un 30 % más.

### El plano de demolición

El plano enseña **desde el principio** qué jefe espera en cada obra y cuál es su maldición. En las obras sin jefe eliges:

- una **ruta** (dos a elegir; tres con el Topógrafo del gremio), cada una con su **contrato**;
- o el **atajo**: te saltas la obra (sin cobro, sin selección y sin ferretería) a cambio de una **etiqueta sindical**.

**Contratos.** Los normales piden una condición y pagan si la cumples; los de **riesgo** endurecen la obra y pagan siempre que la termines.

| Contrato | Condición | Premio | Tipo |
|---|---|---|---|
| Sin un rasguño | Termina la obra sin que el búnker pierda integridad. | +8 de oro | condición |
| Pulso firme | Da 3 golpes limpios. | Un sello al azar | condición |
| A destajo | Demuele la obra en pocos turnos (4 por piso, más 3). | +6 de oro | condición |
| Cantera medida | Termina sin provocar ningún colapso. | +5 de oro | condición |
| Sin huelgas | No juegues ningún comodín. | Un tratamiento al azar | condición |
| Jugada maestra | Juega un color, un full, un póker o una escalera de color. | Un plano al azar | condición |
| Horas extra | La amenaza de todas las torres sube 1. | +10 de oro | riesgo |
| Sin red | El muro no puede pasar de 2. | Una herramienta de oficio o mejor | riesgo |
| Cuadrilla corta | Jugáis con 1 carta menos en la mano. | +12 de oro | riesgo |

**Etiquetas sindicales** (una al azar por cada obra con atajo):

| Etiqueta | Efecto |
|---|---|
| Vale de ferretería | En la próxima ferretería, herramientas, sobres y forja son gratis. |
| Envío urgente | Recibes ya una herramienta de capataz o una reliquia. |
| Molde | Duplicas una carta de tu mazo, la que elijas. |
| Liquidación | +15 de oro. |
| Timbrado | Dos cartas al azar de tu mazo reciben un sello. |

**Jefes de obra** (7; cada campaña sortea 4). Al caer dejan botín: una de dos herramientas de oficio o mejor.

| Jefe | Maldición | Efecto |
|---|---|---|
| La Sirena | Doble sirena | La sirena voltea 2 cartas cada turno. |
| El Usurero | Escasez | Jugáis con 1 carta menos en la mano. |
| El Matasanos | Sin botiquín | Los ♥ no reparan el búnker. |
| La Ventisca | Intemperie | El muro no puede pasar de 2. |
| El Coloso | Blindaje | Todos los pisos empiezan apuntalados: el primer golpe contra cada uno resuena a la mitad. |
| La Furia | Furia | La amenaza de todas las torres sube 1. |
| El Topo | Suelo inestable | Los colapsos quitan el doble. |

### Al cobrar

Tras cada obra cobras oro (obra demolida, golpes limpios, búnker en pie e interés de 1 por cada 5 de oro guardado), el búnker recupera 4 de integridad y eliges **una de tres opciones a la vista** —dos cartas especiales y una carta de baraja ya marcada con un sello o un tratamiento— o pasas a cambio de 3 de oro.

### La ferretería

- **Herramientas** (su precio depende de la rareza: común ~5, oficio ~8, capataz ~11, reliquia ~15). Se pueden vender por la mitad.
- **Sobre de especiales**: lo abres ahí mismo y te quedas con 1 de 3.
- **Sobre clandestino**: una especial a ciegas, más barata.
- **Mesa de forja**: estampa el sello o el tratamiento en oferta sobre la carta de tu mazo que elijas.
- **Plano**: sube de nivel una formación.
- **Reparar** (+6 de integridad), **Quemador** (destruye una carta; el mazo no baja de 12) y **Revolver cajones** (cambia el surtido), los tres con coste creciente.

### Hallazgos en los cimientos

Tras los jefes de las obras 3, 5, 7 aparece un dilema. Cada campaña ve 3 de estos 5:

- **La caja fuerte sepultada.** Bajo un forjado partido asoma una caja fuerte del antiguo contratista. Forzarla hará temblar medio búnker.
  - *Forzarla*: El búnker pierde 5 de integridad. Te llevas una herramienta de capataz o una reliquia.
  - *Vendérsela al chatarrero*: +8 de oro.
- **El horno de fundición.** Un horno que nadie apagó sigue al rojo en el segundo sótano. Lo que entre, sale convertido en otra cosa.
  - *Fundir dos cartas*: Eliges dos cartas: se destruyen y nace una con el número más alto de las dos, en Bronce vivo y con el sello que llevaran.
  - *Calentarse y seguir*: +4 de integridad.
- **El contrato maldito.** Clavado en un puntal hay un contrato con la tinta aún fresca y una cifra obscena. La letra pequeña habla de la próxima obra.
  - *Firmar*: +20 de oro ahora. En la próxima obra, la amenaza de todas las torres sube 1.
  - *Romperlo*: El papel vale para la estufa: +3 de oro.
- **El gremio clandestino.** Tres timbradores trabajan a la luz de un candil. Sellan lo que les pongas delante, y no aceptan regateos.
  - *Pagar con sangre*: El búnker pierde 6 de integridad. Tres cartas al azar reciben un sello.
  - *Pagar con oro*: 8 de oro. Tu carta más alta recibe Bronce vivo.
  - *Seguir de largo*: Nada cambia.
- **Los planos del arquitecto.** Empotrados en el muro maestro están los planos originales. Arrancarlos debilita lo poco que os sostiene.
  - *Arrancarlos*: El búnker pierde 3 de integridad máxima para siempre. Dos formaciones al azar suben 2 niveles.
  - *Copiarlos a mano*: 5 de oro. Una formación al azar sube 1 nivel.
  - *Dejarlos donde están*: Nada cambia.

### Cimientos abisales, semillas y ascenso

- Después de la obra 8 puedes seguir a los **cimientos abisales**: obras sin final, siempre con jefe, cada una un 45 % más resistente que la anterior (la primera, ×20,3).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Obra diaria**: usa la fecha como semilla, con la baraja de obra, sin ascenso y sin nada del gremio. Igual para todo el mundo.
- **Ascenso**: cada victoria abre un nivel más. Cada nivel: torres +10 % y renombre +25 %; desde el 2 las K llegan apuntaladas, desde el 3 la amenaza sube 1 y desde el 4 los colapsos quitan 2 más.

## Cinturón de herramientas

Llevas hasta **6 herramientas**, y se activan **de izquierda a derecha**. Puedes reordenarlas cuando quieras —arrastrando, o pulsando una y luego su hueco de destino—, incluso en plena obra. Hay 46: 30 en el surtido de salida y 16 más en las cajas del gremio.

### Obra general

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Piqueta | Común | +F suma Fuerza | +3 de Fuerza por cada ♠ del golpe. | de salida |
| Diamante de corte | Común | +F suma Fuerza | +3 de Fuerza por cada ♦ del golpe. | de salida |
| Paleta de albañil | Común | +F suma Fuerza | +3 de Fuerza por cada ♥ del golpe. | de salida |
| Maza de hierro | Común | +F suma Fuerza | +3 de Fuerza por cada ♣ del golpe. | de salida |
| Cincel | Común | +F suma Fuerza | +8 de Fuerza si juegas una carta sola. | de salida |
| Cuadrilla doble | Común | +R suma Resonancia | +0,5 de Resonancia en grupos, doble par, full y póker. | de salida |
| Cinta transportadora | Común | +R suma Resonancia | +0,5 de Resonancia en escaleras. | de salida |
| Sacos terreros | Común | • pasiva | El muro sube la mitad de tus ♣ y su tope crece +4. | de salida |
| Botiquín | Común | • pasiva | Reparas la mitad de tus ♥ en vez de un tercio. | de salida |
| Encofrado | Común | • pasiva | Cada piso demolido: +2 de muro. | de salida |
| Casco | Común | • pasiva | Cada piso demolido: +1 de integridad. | de salida |
| Puntales | Común | • pasiva | Los colapsos quitan 3 menos. | de salida |
| Hucha | Común | • pasiva | +3 de oro al terminar cada obra. | de salida |
| Taladro | Oficio | • pasiva | Todos tus golpes perforan, lleven o no picas. | de salida |
| Estandarte | Oficio | +R suma Resonancia | +1 de Resonancia en color y escalera de color. | de salida |
| Dados cargados | Oficio | +R suma Resonancia | +1 de Resonancia en doble par y full. | de salida |
| Dinamita | Capataz | • pasiva | La ventaja de material multiplica ×3 en vez de ×2. | de salida |
| Ácido | Capataz | • pasiva | Tus cartas ya no son inmunes: ×1 contra la torre de su palo. | de salida |
| Andamio | Capataz | • pasiva | +1 carta en la mano. | de salida |
| Sordina | Capataz | • pasiva | La amenaza de todas las torres baja 1. | de salida |
| Plano maestro | Reliquia | ×R multiplica | ×2 de Resonancia en el primer golpe contra cada piso. | de salida |

### Precisión quirúrgica

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Plomada | Común | • pasiva | Cada golpe limpio: +4 de integridad. | de salida |
| Nivel de burbuja | Oficio | • pasiva | El golpe limpio admite un margen de ±1. | de salida |
| Tiralíneas | Común | • pasiva | Cada golpe limpio: +2 de oro. | caja del gremio |
| Calibre | Oficio | +R suma Resonancia | Gana +0,2 de Resonancia para siempre con cada golpe limpio. | caja del gremio |
| Cizalla hidráulica | Capataz | • pasiva | Tras un golpe limpio, el piso siguiente pierde la mitad de su resistencia. | caja del gremio |

### Sismo y vibración

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Metralla | Oficio | • pasiva | Las esquirlas hacen la mitad de tus ♦ en vez de un tercio. | de salida |
| Percutor | Oficio | +F suma Fuerza | Vuelve a activar la primera carta del golpe. | de salida |
| Resonador | Capataz | ×R multiplica | ×1,5 de Resonancia si el golpe lleva 4 cartas o más. | de salida |
| Diapasón de obra | Oficio | ⇉ copia | Copia la herramienta que tenga a su derecha. | caja del gremio |
| Vibrador de hormigón | Oficio | • pasiva | Con grupo, doble par, full o póker, la mitad del daño salpica a las otras torres. | caja del gremio |
| Timbre del gremio | Reliquia | • pasiva | Los sellos de las cartas se activan dos veces. | caja del gremio |

### Alquimia de materiales

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Prisma | Oficio | +R suma Resonancia | +1 de Resonancia si todas las cartas del golpe (2 o más) son del mismo palo. | de salida |
| Mosaico | Oficio | +F suma Fuerza | +10 de Fuerza si el golpe mezcla 3 palos o más. | caja del gremio |
| Crisol | Capataz | • pasiva | La fractura expuesta multiplica ×2 y los golpes de 3 palos también fracturan. | caja del gremio |
| Catalizador | Reliquia | ×R multiplica | ×1,25 de Resonancia por cada estado activo en las torres. | caja del gremio |

### Búnker al límite

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Sismógrafo | Oficio | +R suma Resonancia | +0,1 de Resonancia por cada punto de integridad que le falte al búnker. | de salida |
| Megáfono | Oficio | • pasiva | Cuando la sirena daña al búnker, la torre que golpeó recibe 8. | caja del gremio |
| Piquete | Oficio | • pasiva | Cada huelga (comodín): +3 de oro y robas 2 cartas. | caja del gremio |
| Último turno | Capataz | ×R multiplica | ×2 de Resonancia con el búnker a la mitad o menos. | caja del gremio |
| Corazón de la torre | Reliquia | ×R multiplica | ×2,5 de Resonancia, pero cada golpe le cuesta 1 al búnker. | caja del gremio |

### Trituradora

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Trituradora | Oficio | • pasiva | Al descartar, la primera carta se destruye: sale del mazo para siempre. | de salida |
| Montacargas | Oficio | +F suma Fuerza | +2 de Fuerza por cada escombro (carta destruida en la campaña). | de salida |
| Horno | Común | • pasiva | Cada carta destruida: +2 de oro. | caja del gremio |
| Contenedor | Oficio | • pasiva | Las cartas que descartas se agotan y cada una carga +4 de Fuerza al próximo golpe. | caja del gremio |
| Prensa de chatarra | Capataz | ×R multiplica | ×(1 + 0,05 por escombro) de Resonancia. | caja del gremio |

## Sellos y tratamientos

Una carta de baraja puede llevar un sello y un tratamiento a la vez.

| Sello | Efecto |
|---|---|
| Sello de dinamita | Al golpear, las torres vecinas reciben el valor de esta carta. |
| Sello de eco | Su impacto y el poder de su palo se repiten una vez más. |
| Sello de jornal | +2 de oro si el golpe derriba un piso. |
| Sello sindical | Robas 1 carta extra al jugarla o descartarla. |

| Tratamiento | Efecto |
|---|---|
| Forjado | +6 de Fuerza. |
| Templado | +0,3 de Resonancia. |
| Bronce vivo | ×1,5 de Resonancia. |
| Agrietado | ×2,5 de Resonancia, pero 1 de cada 4 veces se hace añicos. |

Las cartas destruidas (agrietadas que se hacen añicos, quemadas o fundidas) salen del mazo para siempre y cuentan como **escombros**, que ceban a las herramientas de la trituradora.

## Cartas especiales

No tienen palo ni número: acompañan a cualquier golpe (hasta 2 por golpe) o se juegan solas. Las legendarias salen cuatro veces menos y hay que desbloquearlas con su logro.

| Carta | Efecto | Tipo |
|---|---|---|
| Barreno | El golpe perfora y suma +8 de Fuerza. | común |
| Martillo neumático | La carta más alta del golpe cuenta dos veces. | común |
| Saboteador | Desarma el piso que golpeas. | común |
| Palanca | +3 de Fuerza por cada carta del golpe. | común |
| Grúa | Robas 2 cartas extra este turno. | común |
| Mordaza | La sirena no suena este turno. | común |
| Pistola de clavos | 6 de daño a cada una de las otras torres. | común |
| Chatarrero | +3 de oro. | común |
| Pico de oro | Si el golpe tira un piso, +5 de oro. | común |
| Botica | +5 de integridad. | común |
| Gemelo | Todas las cartas del golpe valen como la más alta. | común |
| Nitroglicerina | ×2 de Resonancia, pero el búnker pierde 3. | común |
| Bola de demolición | ×1,5 de Resonancia. | común |
| Hormigonera | +5 de muro. | común |
| Cemento rápido | +2 de muro por cada carta del golpe. | común |
| Sierra radial | Todo el golpe pega con ventaja, sea cual sea la torre. | común |
| El Ferretero | +4 de oro y robas 1 carta extra. | legendaria |
| La Sirena | La sirena no suena y robas 1 carta extra. | legendaria |
| El Usurero | +6 de oro. | legendaria |
| El Matasanos | +7 de integridad. | legendaria |
| La Ventisca | +3 de muro y la sirena no suena. | legendaria |
| El Coloso | ×1,75 de Resonancia. | legendaria |
| La Furia | +14 de Fuerza y el golpe perfora. | legendaria |
| El Topo | 9 de daño a cada una de las otras torres. | legendaria |

## Barajas iniciales

| Baraja | Cómo cambia la campaña | Se desbloquea con |
|---|---|---|
| Baraja de obra | La de siempre: 40 cartas, 2 comodines y un sobre de 3 especiales. | — |
| Baraja negra | Solo ♠ y ♣, por duplicado. Empiezas con Ácido (nada te es inmune), +6 de oro y un búnker reforzado (+8). | Adiós, capataz |
| Baraja del prestamista | +12 de oro inicial y el interés rinde el doble, pero el búnker tiene 2 menos. | Media ciudad |
| Baraja de ases | Ocho ases y ningún 2. Más pegada, pero el búnker tiene 5 menos. | La Torre Madre |
| Baraja corta | Sin doses ni treses. Golpes gordos, pero la cantera se agota enseguida y el búnker tiene 7 menos. | De un solo golpe |
| Baraja del caos | Un solo comodín, pero el sobre inicial trae 6 cartas especiales. | Coleccionista |

## El gremio

Ganes o pierdas, cada campaña deja **renombre**. En el gremio se gasta en **abrir surtidos**, no en fuerza bruta:

| Mejora | Efecto | Coste |
|---|---|---|
| Caja de precisión | Añade al surtido: Tiralíneas, Calibre, Cizalla hidráulica. | 4 ✦ |
| Caja sísmica | Añade al surtido: Diapasón de obra, Vibrador de hormigón, Timbre del gremio. | 4 ✦ |
| Caja de alquimia | Añade al surtido: Mosaico, Crisol, Catalizador. | 4 ✦ |
| Caja de riesgo | Añade al surtido: Megáfono, Piquete, Último turno, Corazón de la torre. | 4 ✦ |
| Caja de chatarra | Añade al surtido: Horno, Contenedor, Prensa de chatarra. | 4 ✦ |
| Tampones nuevos | La forja también ofrece los sellos de dinamita y sindical. | 5 ✦ |
| Taller de bronce | La forja también ofrece Bronce vivo y Agrietado. | 6 ✦ |
| Vale de remesa | Un «Revolver cajones» gratis en cada ferretería, por nivel. | 4 ✦ · 8 ✦ |
| Proveedor | +1 herramienta en oferta en cada ferretería. | 8 ✦ |
| Caja chica | +2 de oro inicial por nivel. | 3 ✦ · 6 ✦ |
| Topógrafo | Cada obra sin jefe ofrece 3 rutas con contrato en vez de 2. | 6 ✦ |

### Logros

| Logro | Cómo | Renombre | Desbloquea |
|---|---|---|---|
| Primera piedra | Demuele tu primera obra de campaña. | +1 | — |
| Adiós, capataz | Supera la obra 3. | +2 | Baraja negra |
| Media ciudad | Supera la obra 5. | +3 | Baraja del prestamista |
| La Torre Madre | Gana una campaña. | +5 | Baraja de ases |
| Maestro de obras | Gana una campaña en ascenso 3 o más. | +8 | — |
| Más abajo | Supera un cimiento abisal. | +4 | — |
| Sin fondo | Supera tres cimientos abisales en una campaña. | +8 | — |
| Parte diario | Termina una Obra diaria. | +2 | — |
| Dos y dos | Juega un doble par. | +1 | — |
| Todo al mismo palo | Juega un color. | +1 | — |
| Casa llena | Juega un full. | +2 | — |
| Póker | Juega un póker. | +3 | — |
| Escalera real | Juega una escalera de color de 5 cartas o más. | +3 | — |
| De un solo golpe | Haz 100 o más de daño con un golpe. | +2 | Baraja corta |
| Terremoto | Haz 500 o más de daño con un golpe. | +4 | — |
| Cataclismo | Haz 2000 o más de daño con un golpe. | +8 | — |
| Cirujano | Da 10 golpes limpios. | +2 | — |
| Pulso de relojero | Da 50 golpes limpios. | +5 | — |
| Cien pisos | Demuele 100 pisos. | +3 | — |
| Demoledor | Demuele 500 pisos. | +6 | — |
| Ni un rasguño | Termina una obra con el búnker entero. | +2 | — |
| Tacaño | Junta 30 de oro a la vez. | +2 | — |
| Cinturón lleno | Lleva 6 herramientas a la vez. | +3 | — |
| Timbrador | Estampa 10 sellos o tratamientos. | +3 | — |
| Hombre de palabra | Cumple 10 contratos. | +3 | — |
| Por la puerta de atrás | Salta 3 obras. | +2 | — |
| Coleccionista | Consigue las 16 cartas especiales comunes, entre todas tus campañas. | +5 | Baraja del caos |
| Cliente del mes | Lleva 30 herramientas distintas, entre todas tus campañas. | +8 | Carta legendaria: El Ferretero |
| Trofeo: La Sirena | Derrota a La Sirena (doble sirena). | +2 | Carta legendaria: La Sirena |
| Trofeo: El Usurero | Derrota a El Usurero (escasez). | +2 | Carta legendaria: El Usurero |
| Trofeo: El Matasanos | Derrota a El Matasanos (sin botiquín). | +2 | Carta legendaria: El Matasanos |
| Trofeo: La Ventisca | Derrota a La Ventisca (intemperie). | +2 | Carta legendaria: La Ventisca |
| Trofeo: El Coloso | Derrota a El Coloso (blindaje). | +2 | Carta legendaria: El Coloso |
| Trofeo: La Furia | Derrota a La Furia (furia). | +2 | Carta legendaria: La Furia |
| Trofeo: El Topo | Derrota a El Topo (suelo inestable). | +2 | Carta legendaria: El Topo |
| Cazajefes | Derrota a los 7 jefes de obra. | +8 | — |

## Atajos de teclado

**1–9** eligen carta · **← →** apuntan a una torre · **Espacio** o **Enter** golpean · **Supr** descarta · **Esc** suelta la selección · **Tab** abre la cantera y la escombrera.
