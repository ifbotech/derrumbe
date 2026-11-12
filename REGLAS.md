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
| J | 124 | 3 |
| Q | 177 | 5 |
| K | 231 | 7 |

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
| As de compañía | un As con cualquier otra carta | +0 | ×1,1 | +3 F · +0,15 R |
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

### Golpe limpio

Tirar un piso con el **daño exacto** es la jugada maestra del juego. Cuando lo consigues:

- la **sirena calla** ese turno,
- cobras **1 de oro** y **robas 1 carta** de más,
- el piso de debajo pierde **un cuarto de su resistencia** (la onda del golpe sigue torre abajo),
- y empiezas una **racha**: tu próximo golpe resuena +0,5 por cada golpe limpio seguido (hasta +2). La racha se corta si el golpe no es limpio.

La mesa te lo avisa antes de golpear: la previsualización de cada torre dice si el golpe sería limpio.

### Estados de las torres

- **Fractura**: la provoca un golpe de un solo material (2 o más cartas, todas del mismo palo). El próximo golpe contra esta torre resuena ×1,5.
- **Desarmada ×1**: la provoca un golpe que mezcla 3 palos o más. Esta torre se salta su próxima sirena.
- **Apuntalado**: lo traen algunos jefes y niveles de obra. El primer golpe contra este piso resuena a la mitad.

### Reglas especiales

- **Comodín · Huelga**: se juega solo sobre una torre. Su piso actual queda **desarmado** (amenaza 0 hasta que caiga) y la sirena no suena. El comodín sale de la obra.
- **Fatiga de cimientos**: ninguna obra aguanta eternamente. En campaña, desde el turno 9 de cada obra y cada 2 turnos, la fatiga sube un nivel; cada nivel da **+0,25 de Resonancia** a todos los golpes y **+1 de amenaza** a todas las torres. La obra se acelera en los dos sentidos: pegas más y la sirena también. La mesa avisa tres turnos antes. En cuadrilla empieza más tarde, en proporción a lo que aguantan las obras; en la partida clásica, en el turno 33 y cada 3 turnos.
- **Colapso**: si la cantera se agota, la escombrera se baraja y vuelve a ser cantera, pero el búnker pierde **5** de integridad (el muro no lo evita). Cada vuelta completa de la cuadrilla a la cantera encarece el colapso en 1: las obras no se pueden estirar sin fin.
- **As de compañía**: un As forma jugada con **cualquier otra carta** (×1,1 de Resonancia) y aporta el poder de su palo. Es la manera de colar un poder en un golpe: un As de ♣ para levantar muro, uno de ♥ para reparar, uno de ♠ para perforar.
- **Andamio**: junto a la mano hay un hueco de reserva. Una vez por turno, y sin gastar el turno, puedes guardar en él una carta de tu mano: no cuenta para el tamaño de la mano (robas hasta completarla igual) y se juega desde ahí como si estuviera en ella. Si el hueco está ocupado, la carta guardada vuelve a la mano. La herramienta *Pasarela* añade un segundo hueco. En la partida guiada no hay andamio.
- **Tiza de replanteo** (solo en campaña en solitario): una vez por obra puedes **deshacer tu última jugada**. La mesa vuelve a como estaba y la cantera se baraja de nuevo, así que lo que viste salir ya no vale. Mover el andamio no gasta la tiza. En sala no hay tiza: toda jugada es definitiva, y la mesa lo indica.
- Las cartas de baraja nunca bajan de 12 en el mazo: lo que las destruye deja de hacerlo al llegar a ese mínimo.
- **Victoria**: las cuatro torres en ruinas. **Derrota**: la integridad del búnker llega a 0.
- Modo **BRUTAL** (partida clásica): búnker de 16 y colapsos de 6.
- **Partida clásica en cuadrilla**: el colapso se ajusta a cuántos jugáis, porque con más manos la cantera se agota antes: 5 con 1, 6 con 2, 5 con 3, 4 con 4.

## Campaña

Un roguelike de construcción de mazo: **8 obras** cada vez más duras, 4 de ellas con **jefe**. Empiezas con un sobre de 3 cartas especiales y 4 de oro; entre obra y obra mejoras el mazo y el cinturón. La resistencia base de los pisos es 20 / 30 / 40 y cada obra la multiplica.

| Obra | Nombre | Pisos por torre | Resistencia | Amenaza | Jefe |
|---|---|---|---|---|---|
| 1 | Caseta de obra | 1 | ×3,93 | +2 | — |
| 2 | Bloque de pisos | 2 | ×2,8 | +3 | — |
| 3 | Torre del capataz | 2 | ×3,35 | +4 | sí |
| 4 | Polígono | 3 | ×4,05 | +5 | — |
| 5 | Ciudadela | 3 | ×4,5 | +5 | sí |
| 6 | Rascacielos | 3 | ×5 | +6 | — |
| 7 | Fortaleza | 3 | ×5,3 | +5 | sí |
| 8 | La Torre Madre | 3 | ×6,25 | +6 | sí |

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
| La Sirena | Doble sirena | La sirena voltea 2 cartas cada turno, pero cada golpe pega un 40 % menos. |
| El Usurero | Escasez | Jugáis con 1 carta menos en la mano. |
| El Matasanos | Sin botiquín | Los ♥ no reparan el búnker. |
| La Ventisca | Intemperie | El muro no puede pasar de 3. |
| El Coloso | Blindaje | Todos los pisos llegan apuntalados y, mientras lo estén, su amenaza sube 1. |
| La Furia | Furia | La amenaza de todas las torres sube 2. |
| El Topo | Suelo inestable | La fatiga de cimientos empieza 3 turnos antes, y cada piso que cae sin golpe limpio le cuesta 1 al búnker. |

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

### Cimientos abisales, semillas y niveles de obra

- Después de la obra 8 puedes seguir a los **cimientos abisales**: obras sin final, siempre con jefe, cada una un 45 % más resistente que la anterior (la primera, ×9,1).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Obra diaria**: usa la fecha como semilla, con la baraja de obra, en el nivel 1 y sin nada del gremio. Igual para todo el mundo.
- **Niveles de obra**: hay 8. Ganar una campaña abre el nivel siguiente; cada nivel añade **un giro** a todos los anteriores y da un 25 % más de renombre.

| Nivel | Nombre | Giro |
|---|---|---|
| 1 | Obra limpia | Las reglas de siempre. |
| 2 | Hormigón armado | Todos los pisos aguantan un 5 % más. |
| 3 | Precios de obra | Todo en la ferretería cuesta 2 de oro más. |
| 4 | Vigas maestras | En las obras con jefe, las K llegan apuntaladas. |
| 5 | Sirena afinada | La amenaza de las K sube 1. |
| 6 | Búnker viejo | El búnker tiene 1 punto menos de integridad. |
| 7 | Turno de noche | La amenaza de las J y las Q sube 1. |
| 8 | Clausura | En las obras con jefe, la amenaza de todas las torres sube 1. |

- **Sellos de maestría**: al ganar, la baraja usada y cada herramienta que llevabas en el cinturón quedan marcadas en la colección con el nivel de obra más alto que has ganado con ellas: remache de **bronce** (niveles 1–3), de **hierro** (4–6) o de **oro** (7–8).
- **Reinicio rápido**: mantén pulsada la **R** (o Select en el mando) 0,7 segundos para volver a empezar la campaña con la misma baraja y el mismo nivel de obra. La que dejas no cuenta como derrota ni cobra renombre.

## Cinturón de herramientas

Llevas hasta **6 herramientas**, y se activan **de izquierda a derecha**. Puedes reordenarlas cuando quieras —arrastrando, o pulsando una y luego su hueco de destino—, incluso en plena obra. Hay 52: 28 en el surtido de salida y 24 más en las cajas del gremio.

### Obra general

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Piqueta | Común | +F suma Fuerza | +3 de Fuerza por cada ♠ del golpe. | de salida |
| Diamante de corte | Común | +F suma Fuerza | +3 de Fuerza por cada ♦ del golpe. | de salida |
| Paleta de albañil | Común | +F suma Fuerza | +3 de Fuerza por cada ♥ del golpe. | de salida |
| Maza de hierro | Común | +F suma Fuerza | +3 de Fuerza por cada ♣ del golpe. | de salida |
| Cincel | Común | +F suma Fuerza | +8 de Fuerza si juegas una carta sola. | de salida |
| Cuadrilla doble | Común | +R suma Resonancia | +0,5 de Resonancia en grupos, doble par, full y póker. | de salida |
| Cinta transportadora | Común | +R suma Resonancia | +0,7 de Resonancia en escaleras. | de salida |
| Sacos terreros | Común | • pasiva | El muro sube la mitad de tus ♣ y su tope crece +4. | de salida |
| Botiquín | Común | • pasiva | Reparas la mitad de tus ♥ en vez de un tercio. | de salida |
| Encofrado | Común | • pasiva | Cada piso demolido: +2 de muro. | de salida |
| Casco | Común | • pasiva | Cada piso demolido: +1 de integridad. | de salida |
| Puntales | Común | • pasiva | Los colapsos quitan 3 menos. | de salida |
| Hucha | Común | • pasiva | +4 de oro al terminar cada obra. | de salida |
| Taladro | Oficio | • pasiva | Todos tus golpes perforan, lleven o no picas. | de salida |
| Estandarte | Oficio | +R suma Resonancia | +1,5 de Resonancia en color y escalera de color. | de salida |
| Dados cargados | Oficio | +R suma Resonancia | +1 de Resonancia en doble par y full. | de salida |
| Dinamita | Capataz | • pasiva | La ventaja de material multiplica ×3 en vez de ×2. | caja del gremio |
| Ácido | Capataz | • pasiva | Tus cartas ya no son inmunes: ×1 contra la torre de su palo. | de salida |
| Barracón | Capataz | • pasiva | +1 carta en la mano. | caja del gremio |
| Pasarela | Capataz | • pasiva | +1 hueco de andamio: guardas dos cartas aparte de la mano. | de salida |
| Contrapeso | Reliquia | • pasiva | La inmunidad se invierte: las cartas del palo de la torre pegan con ventaja. | de salida |
| Sordina | Capataz | • pasiva | La amenaza de todas las torres baja 1. | caja del gremio |
| Plano maestro | Reliquia | ×R multiplica | ×2 de Resonancia en el primer golpe contra cada piso. | caja del gremio |

### Precisión quirúrgica

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Plomada | Común | • pasiva | Cada golpe limpio: +4 de integridad. | de salida |
| Nivel de burbuja | Oficio | • pasiva | El golpe limpio admite un margen de ±1. | de salida |
| Tiralíneas | Común | • pasiva | Cada golpe limpio: +2 de oro. | caja del gremio |
| Calibre | Oficio | +R suma Resonancia | Gana +0,15 de Resonancia para siempre con cada golpe limpio. | caja del gremio |
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
| Prisma | Oficio | +R suma Resonancia | +0,5 de Resonancia por cada carta del golpe que comparta palo con otra (hasta +2). | de salida |
| Mosaico | Oficio | +F suma Fuerza | +10 de Fuerza si el golpe mezcla 3 palos o más. | caja del gremio |
| Crisol | Capataz | • pasiva | La fractura multiplica ×2 y los golpes de 3 palos también dejan fractura. | caja del gremio |
| Catalizador | Reliquia | ×R multiplica | ×1,5 de Resonancia por cada torre con fractura, apuntalada o desarmada ×1 (se suman). | caja del gremio |

### Búnker al límite

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Sismógrafo | Oficio | +R suma Resonancia | +0,1 de Resonancia por cada punto de integridad que le falte al búnker. | de salida |
| Megáfono | Oficio | • pasiva | Cuando la sirena daña al búnker, la torre que golpeó recibe 8. | caja del gremio |
| Piquete | Oficio | • pasiva | Cada huelga (comodín): +3 de oro y robas 2 cartas. | caja del gremio |
| Último turno | Capataz | ×R multiplica | ×2 de Resonancia con el búnker a la mitad o menos. | caja del gremio |
| Corazón de la torre | Reliquia | ×R multiplica | ×2 de Resonancia. Si el golpe no derriba ningún piso, le cuesta 1 al búnker. | caja del gremio |

### Trituradora

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Trituradora | Oficio | • pasiva | Al descartar, la primera carta se destruye: sale del mazo para siempre. | de salida |
| Montacargas | Oficio | +F suma Fuerza | +2 de Fuerza por cada carta destruida en la campaña. | de salida |
| Horno | Común | • pasiva | Cada carta destruida: +2 de oro. | caja del gremio |
| Contenedor | Oficio | • pasiva | Las cartas que descartas no vuelven en esta obra, y cada una da +6 de Fuerza a tu próximo golpe. | caja del gremio |
| Prensa de chatarra | Capataz | ×R multiplica | ×1,05 de Resonancia por cada carta destruida en la campaña (se suman: 4 cartas, ×1,2). | caja del gremio |

### Aguante y contragolpe

| Herramienta | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Ariete | Oficio | +F suma Fuerza | +3 de Fuerza por cada punto de muro en pie. | caja del gremio |
| Contragolpe | Oficio | • pasiva | Cuando el muro frena entera una sirena, la torre que golpeó recibe el triple de lo frenado. | caja del gremio |
| Rebosadero | Oficio | • pasiva | Lo que sobra no se pierde: el muro que pase de su tope repara el búnker (1 por cada 2), y lo que repares de más con el búnker lleno carga +3 de Fuerza por punto para tu próximo golpe. | caja del gremio |
| Bastión | Capataz | ×R multiplica | ×1,5 de Resonancia con el muro a la mitad de su tope o más. | caja del gremio |

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

Las cartas destruidas (agrietadas que se hacen añicos, quemadas o fundidas) salen del mazo para siempre; algunas herramientas (la familia de la trituradora) se ceban con cada carta destruida.

## Cartas especiales

No tienen palo ni número: acompañan a cualquier golpe (hasta 2 por golpe) o se juegan solas. Las legendarias salen cuatro veces menos y hay que desbloquearlas con su logro.

| Carta | Efecto | Tipo |
|---|---|---|
| Barreno | El golpe perfora y suma +12 de Fuerza. | común |
| Martillo neumático | La carta más alta del golpe cuenta dos veces. | común |
| Saboteador | Desarma el piso que golpeas. | común |
| Palanca | +4 de Fuerza por cada carta del golpe. | común |
| Grúa | Robas 2 cartas extra este turno. | común |
| Mordaza | La sirena no suena este turno. | común |
| Pistola de clavos | 9 de daño a cada una de las otras torres. | común |
| Chatarrero | +3 de oro. | común |
| Pico de oro | Si el golpe tira un piso, +5 de oro. | común |
| Botica | +5 de integridad. | común |
| Gemelo | Todas las cartas del golpe valen como la más alta. | común |
| Nitroglicerina | ×2 de Resonancia, pero el búnker pierde 2. | común |
| Bola de demolición | ×1,5 de Resonancia. | común |
| Hormigonera | +5 de muro. | común |
| Cemento rápido | +2 de muro por cada carta del golpe. | común |
| Embestida | +4 de Fuerza, y +3 más por cada punto de muro en pie. | común |
| Sierra radial | Todo el golpe pega con ventaja, sea cual sea la torre. | común |
| El Ferretero | +4 de oro y robas 1 carta extra. | legendaria |
| La Sirena | La sirena no suena y robas 1 carta extra. | legendaria |
| El Usurero | +6 de oro. | legendaria |
| El Matasanos | +7 de integridad. | legendaria |
| La Ventisca | +3 de muro y la sirena no suena. | legendaria |
| El Coloso | ×1,75 de Resonancia. | legendaria |
| La Furia | +14 de Fuerza y el golpe perfora. | legendaria |
| El Topo | 14 de daño a cada una de las otras torres. | legendaria |

## Barajas iniciales

| Baraja | Cómo cambia la campaña | Se desbloquea con |
|---|---|---|
| Baraja de obra | La de siempre: 40 cartas, 2 comodines y un sobre de 3 especiales. | — |
| Baraja negra | Solo ♠ y ♣, por duplicado: ni reparas ni lanzas esquirlas. Empiezas con Ácido y Sacos terreros y un búnker reforzado (+5); con la Caja de aguante del gremio, también con el Bastión. | Adiós, capataz |
| Baraja del prestamista | +12 de oro inicial y el interés rinde el doble, pero el búnker tiene 1 menos. | Media ciudad |
| Baraja de ases | Ocho ases y ningún 2: más compañías y más pegada, pero el búnker tiene 4 menos. | La Torre Madre |
| Baraja corta | Sin doses ni treses. Golpes gordos, pero la cantera se agota enseguida y el búnker tiene 6 menos. Empiezas con +3 de oro. | De un solo golpe |
| Baraja del caos | Un solo comodín, pero el sobre inicial trae 5 cartas especiales. | Coleccionista |

## El gremio

Ganes o pierdas, cada campaña deja **renombre**. En el gremio se gasta en **abrir surtidos**, no en fuerza bruta. El surtido base es corto a propósito (28 herramientas); las cajas abren las otras 24, cada una con su manera de jugar:

| Mejora | Efecto | Coste |
|---|---|---|
| Caja de precisión | Añade al surtido: Plano maestro, Tiralíneas, Calibre, Cizalla hidráulica. | 4 ✦ |
| Caja sísmica | Añade al surtido: Dinamita, Diapasón de obra, Vibrador de hormigón, Timbre del gremio. | 4 ✦ |
| Caja de alquimia | Añade al surtido: Mosaico, Crisol, Catalizador. | 4 ✦ |
| Caja de riesgo | Añade al surtido: Sordina, Megáfono, Piquete, Último turno, Corazón de la torre. | 4 ✦ |
| Caja de chatarra | Añade al surtido: Horno, Contenedor, Prensa de chatarra. | 4 ✦ |
| Caja de aguante | Añade al surtido: Barracón, Ariete, Contragolpe, Rebosadero, Bastión. | 4 ✦ |
| Tampones nuevos | La forja también ofrece los sellos de dinamita y sindical. | 5 ✦ |
| Taller de bronce | La forja también ofrece Bronce vivo y Agrietado. | 6 ✦ |
| Vale de remesa | Un «Revolver cajones» gratis en cada ferretería, por nivel. | 4 ✦ · 8 ✦ |
| Proveedor | +1 herramienta en oferta en cada ferretería, por nivel. | 8 ✦ · 12 ✦ |
| Caja chica | +2 de oro inicial por nivel. | 3 ✦ · 6 ✦ |
| Topógrafo | Cada obra sin jefe ofrece 3 rutas con contrato en vez de 2. | 6 ✦ |

### Archivo de actas y copia de seguridad

- El gremio guarda las **25 últimas campañas terminadas**: cómo acabaron, en qué obra y ante qué jefe, turnos, mayor golpe, herramientas y semilla. Desde ahí se puede **copiar el acta** o **rejugar la semilla** con la misma baraja y el mismo nivel de obra.
- En **Ajustes**, *Exportar progreso* guarda gremio, colección, actas y ajustes en un archivo .json, e *Importar progreso* lo recupera en otro navegador, otro equipo o la versión de escritorio.

### Logros

| Logro | Cómo | Renombre | Desbloquea |
|---|---|---|---|
| Primera piedra | Demuele tu primera obra de campaña. | +1 | — |
| Adiós, capataz | Supera la obra 3. | +2 | Baraja negra |
| Media ciudad | Supera la obra 5. | +3 | Baraja del prestamista |
| La Torre Madre | Gana una campaña. | +5 | Baraja de ases |
| Maestro de obras | Gana una campaña en el nivel de obra 4 o superior. | +8 | — |
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
| Coleccionista | Consigue las 17 cartas especiales comunes, entre todas tus campañas. | +5 | Baraja del caos |
| Cliente del mes | Lleva 30 herramientas distintas, entre todas tus campañas. | +8 | Carta legendaria: El Ferretero |
| Trofeo: La Sirena | Derrota a La Sirena (doble sirena). | +2 | Carta legendaria: La Sirena |
| Trofeo: El Usurero | Derrota a El Usurero (escasez). | +2 | Carta legendaria: El Usurero |
| Trofeo: El Matasanos | Derrota a El Matasanos (sin botiquín). | +2 | Carta legendaria: El Matasanos |
| Trofeo: La Ventisca | Derrota a La Ventisca (intemperie). | +2 | Carta legendaria: La Ventisca |
| Trofeo: El Coloso | Derrota a El Coloso (blindaje). | +2 | Carta legendaria: El Coloso |
| Trofeo: La Furia | Derrota a La Furia (furia). | +2 | Carta legendaria: La Furia |
| Trofeo: El Topo | Derrota a El Topo (suelo inestable). | +2 | Carta legendaria: El Topo |
| Cazajefes | Derrota a los 7 jefes de obra. | +8 | — |

## Palabras clave

El juego usa solo seis palabras con significado propio. Todo lo demás se dice con palabras llanas. En pantalla van en negrita y, al pasar el puntero sobre cualquier texto que las mencione, el globo de ayuda encadena su definición.

- **Fuerza**: Lo que suman tus cartas: su número, doblado con ventaja de material y anulado contra la torre de su propio palo.
- **Resonancia**: Lo que multiplica a la Fuerza. La pone la formación; lo que la suma cuenta donde está y lo que la multiplica, multiplica todo lo anterior.
- **Golpe limpio**: Tirar un piso con el daño exacto. La sirena calla, cobras 1 de oro, robas 1 carta, el piso de abajo pierde un cuarto de su resistencia y tu próximo golpe resuena +0,5 (la racha se acumula hasta +2).
- **Fractura**: La deja un golpe de un solo palo (2 cartas o más). El próximo golpe contra esa torre resuena ×1,5.
- **Apuntalado**: El primer golpe contra ese piso resuena a la mitad. Lo traen algunos jefes y niveles de obra.
- **Desarmada**: Una torre desarmada no golpea cuando la sirena saca su palo. La huelga (comodín) la desarma hasta que caiga el piso; un golpe que mezcla 3 palos, solo para su próxima sirena (×1).

## Controles

| Acción | Teclado y ratón | Mando |
|---|---|---|
| Mover el foco | Flechas | Cruceta o palanca |
| Elegir | Enter · 1–9 en la mano | A |
| Golpear la torre apuntada | Espacio | X |
| Guardar en el andamio | Y | Y |
| Tiza de replanteo (deshacer) | Z | LT |
| Cambiar la velocidad (1× → 2× → 4×) | botón de la barra | RT |
| Lupa de grabador | L · clic derecho · pulsación larga | RB |
| Mazo (cantera y escombrera) | Tab | LB |
| Descartar lo elegido | Supr | — |
| Atrás / soltar la selección | Esc | B |
| Reordenar el cinturón | Arrastrar · Mayús + flechas | — |
| Reiniciar la campaña | Mantener R | Mantener Select |
| Pantalla completa | F | — |
| Ajustes | — | Start |

Los botones de la mesa enseñan su atajo: la tecla si juegas con teclado, el botón (A, B, X, Y, LB, RB, LT, RT) si lo último que tocaste fue un mando, y nada con ratón o pantalla táctil. Junto a los poderes de palo, la **rueda de materiales** (♠ → ♦ → ♥ → ♣ → ♠) se enciende con lo que llevas elegido: flecha de latón si pegas con ventaja, aspa de hierro si esa torre es inmune a tu palo.

La **lupa de grabador** abre cualquier carta, herramienta, piso de torre o jefe a tamaño de lámina, con la cuenta exacta de lo que aporta en ese momento. En sala, pulsar una torre cuando no es tu turno (o cualquier ruta, oferta o carta con Alt) deja una **marca de tiza** con tus iniciales para la cuadrilla: no decide nada, solo señala.
