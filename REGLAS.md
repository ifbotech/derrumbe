# SANGRE Y PALO — Reglas

> Este archivo se genera con `npm run docs` a partir de los datos del motor (`src/rules`). No lo edites a mano.

*La conjura de los naipes.* Juego cooperativo para 1 a 4 jugadores con baraja española (48 cartas + 2 comodines).
Sois una conjura: hay que hacer caer **los cuatro tronos** de la corte antes de que su guardia acabe con **tu Vida**.
Se gana o se pierde en equipo. El Asalto único también se puede jugar en mesa con una baraja real.

## Preparación

1. Separa las 12 figuras y forma los **cuatro tronos**, una casa por palo (Casa de Espadas, Casa de Oros…).
   Cada trono tiene 3 **guardias** en fila: la **Sota** (10) delante, que es la primera en caer, luego el **Caballo** (11) y al final el **Rey** (12).
2. Baraja las 36 cartas de número (del As al 9) con los 2 comodines: es el **Mazo**.
   Deja sitio al lado para el **Descarte**.
3. Cada jugador roba su mano de **6** cartas.
4. La conjura empieza con **20 de Vida** y **0 de Escudo** (máximo 8).

| Guardia | Vida | Ataque |
|---|---|---|
| Sota (10) | 155 | ⚔ 3 |
| Caballo (11) | 220 | ⚔ 5 |
| Rey (12) | 285 | ⚔ 7 |

Cada palo es una casa de la corte: **ESPADAS**, **OROS**, **COPAS** y **BASTOS**.

**Un enemigo a la vez.** Las Casas se asaltan de una en una, en un orden que la campaña sortea: el **enemigo activo** es el guardia de delante de la primera Casa en pie, y el resto espera en la **fila**. Solo se golpea al enemigo activo.

## El turno

1. **Acción** (elige una): **Golpear** al enemigo activo con una formación, **Descartar** las cartas que quieras o jugar un **Comodín** (Motín). Solo se puede **Pasar** con la mano vacía.
2. **Contraataque**: si no lo has abatido, el enemigo activo te ataca con su **Ataque** (⚔) más la **Furia**. El **Escudo** frena primero; el resto te quita **Vida**.
3. **Robar** hasta completar la mano. Turno del siguiente.

## Daño × Multi

Todo golpe se calcula igual:

> **Golpe = Daño × Multi** (los dos, siempre números enteros)

**El orden no importa.** La mesa hace la cuenta y te la enseña antes de golpear:

1. **Daño**: se suma todo. La base de la formación, el número de cada carta (0 contra el trono de su palo: es **Inmune**), el Daño cargado y lo que añadan acabados, Trampas del Bufón (hasta 2 por golpe) y Amuletos. Si el trono está **Expuesto**, ese Daño vale ×2.
2. **Multi**: se suma todo (la base de la formación, la Racha de Golpes exactos y lo que añadan acabados, Trampas, Amuletos y Bendiciones) y, al final, se aplican los multiplicadores (×2, ×3…).

El **As** vale **11** y enlaza escaleras por abajo (A-2-3) y por arriba (8-9-A).

| Formación | Cartas | Daño base | Multi | Por nivel de Pergamino |
|---|---|---|---|---|
| Carta sola | 1 carta | +0 | ×1 | +4 de Daño |
| As cómplice | un As con cualquier otra carta | +0 | ×2 | +3 de Daño |
| Grupo | 2 o 3 del mismo número | +2 | ×2 | +3 de Daño |
| Escalera | 3 o más números seguidos, de cualquier palo | +4 | ×2 | +3 de Daño |
| Doble par | 2 parejas | +6 | ×2 | +3 de Daño |
| Color | 5 o más del mismo palo | +8 | ×3 | +3 de Daño |
| Full | un trío y una pareja | +10 | ×3 | +3 de Daño |
| Escalera de color | 3 o más seguidas del mismo palo | +10 | ×3 | +3 de Daño |
| Póker | 4 del mismo número | +14 | ×4 | +3 de Daño |
| Par de palo | 2 del mismo palo (solo en el Truco) | +0 | ×1 | +3 de Daño |
| Quince | 2 o más que suman 15 (solo en la Escoba) | +6 | ×1 | +3 de Daño |

### Inmune a su propio palo

Una sola regla de palos: **cada trono es Inmune a su propio palo**. Contra el trono de su palo, una carta hace 0 de Daño; contra los otros tres, su número.

### Poder de cada palo

Además de su Daño, las cartas de cada palo activan su poder (aunque no sumen nada). Cada carta da lo mismo, sea cual sea su número:

- **Perfora** (Espadas): si la formación lleva alguna carta de Espadas, los puntos que sobran al abatir a un guardia pasan al siguiente.
- **Salpica** (Oros): cada carta de Oros hace **2** a cada uno de los otros tronos.
- **Cura** (Copas): cada carta de Copas te cura **2** de Vida.
- **Escudo** (Bastos): cada carta de Bastos te da **+2** de Escudo.

### Golpe exacto

Abatir a un guardia con un Golpe **igual a su Vida** es la jugada maestra del juego (¡EXACTO!). Cuando lo consigues:

- **no hay Contraataque** ese turno,
- cobras **1 de oro** y **robas 1 carta** de más,
- el guardia siguiente pierde **¼ de su Vida** (el **Impulso** del golpe),
- y empiezas una **Racha**: tu próximo golpe lleva +1 de Multi por cada Golpe exacto seguido (hasta +3). La Racha se corta si el golpe no es exacto.

La mesa te lo avisa antes de golpear: la previsualización de cada trono dice si el golpe sería exacto.

### Estados de los tronos

Solo hay dos, y ninguno se acumula:

- **Expuesto**: lo deja un golpe de un solo palo (2 o más cartas, todas del mismo palo). El próximo golpe contra este trono hace ×2 de Daño.
- **Aturdido**: lo deja un golpe que mezcla 3 palos o más, el Motín (Comodín) o El Espía. Este trono se salta su próximo Contraataque.

Los dos desaparecen si cae el guardia.

### Reglas especiales

- **Comodín · Motín**: se juega solo sobre un trono. Ese trono queda **Aturdido** y este turno no hay Contraataque. El comodín no vuelve en este asalto.
- **Furia**: cada punto es **+1 de Ataque** en todos los Contraataques, y se ve junto al ⚔ del enemigo activo. En campaña sube **3** con cada Mazo agotado y, contra un monarca, **1** cada turno que sigue en pie (la **Furia del Rey**). En el Asalto único sube además sola, desde el turno 30 y cada 3 turnos.
- **Mazo agotado**: si el Mazo se acaba, el Descarte se baraja y vuelve a ser Mazo. **Barajar no te quita Vida**, pero sube la **Furia** (3 en campaña): los asaltos no se pueden estirar sin fin.
- **As cómplice**: un As forma jugada con **cualquier otra carta** (×2 de Multi) y aporta el poder de su palo. Es la manera de colar un poder en un golpe: un As de Bastos para levantar Escudo, uno de Copas para curar, uno de Espadas para perforar.
- **La Manga**: junto a la mano hay un hueco aparte. Una vez por turno, y sin gastar el turno, puedes guardarte en la manga una carta de tu mano: no cuenta para el tamaño de la mano (robas hasta completarla igual) y se juega desde ahí como si estuviera en ella. Si el hueco está ocupado, la carta guardada vuelve a la mano.
- **Rebobinar** (↩ Deshacer; solo en campaña en solitario): una vez por asalto puedes **deshacer tu última jugada**. La mesa vuelve a como estaba y el Mazo se baraja de nuevo, así que lo que viste salir ya no vale. Usar la Manga no gasta el rebobinado. En sala no se rebobina: toda jugada es definitiva, y la mesa lo indica.
- Las cartas de baraja nunca bajan de 12 en el Mazo: lo que las quema deja de hacerlo al llegar a ese mínimo.
- **Victoria** (*Corte vencida*): todos los tronos caídos (en los primeros asaltos de la campaña hay menos de cuatro). **Derrota** (*Conjura deshecha*): tu Vida llega a 0.
- Modo **BRUTAL** (Asalto único): 16 de Vida y cada Mazo agotado sube la Furia 1.

## Campaña

Un roguelike de construcción de mazo: **5 asaltos** cada vez más duros, una sala del castillo cada uno, 3 de ellos con **monarca** (el del último es el **Rey Tirano** o la **Reina Tirana**). Empiezas con un Sobre lacrado de 3 cartas especiales, 4 de oro y un **Don de la Conjura** que eliges entre tres (un Amuleto común, un sello de lacre en una carta de tu Mazo o una bolsa de 5 de oro); entre asalto y asalto mejoras el Mazo y tus Amuletos. La Vida base de los guardias es 35 / 45 / ; cada asalto la multiplica y la Vida final se redondea al múltiplo de 5 más cercano.

Los primeros asaltos tienen menos tronos: los palos que faltan se sortean al empezar la campaña y el Mapa los enseña desde el principio.

| Asalto | Sala | Tronos | Guardias por trono | Vida | Ataque | Monarca |
|---|---|---|---|---|---|---|
| 1 | El Puente levadizo | 2 | Sota | ×5,6 | +1 | — |
| 2 | El Patio de armas | 3 | Sota, Caballo | ×4 | +3 | sí |
| 3 | La Cripta | 4 | Sota, Caballo | ×5,2 | +9 | — |
| 4 | La Galería real | 4 | Sota, Caballo, Rey | ×4 | +12 | sí |
| 5 | El Salón del Trono | 4 | Sota, Caballo, Rey | ×5,9 | +13 | sí, Rey Tirano |

En conjura de 2 a 4 jugadores los guardias aguantan un 30 % más.

### El Mapa de caminos

Antes de cada asalto (desde el 2) se elige un camino en el **Mapa**: dos filas de tres nodos y, arriba, el asalto. Cada tramo tiene seis caminos, todos llegan al asalto y todos pueden pasar por **La Pulpería**, que va siempre en el centro de la segunda fila. El Mapa sale de la semilla: la misma semilla da el mismo Mapa.

- **Guardia Bravo** (al menos uno por tramo): un guardia solo, en una Casa de un palo que el Mapa enseña de antemano, con +4 de Ataque sobre el asalto que viene. No cura al ganar. Paga 8 de oro, un Amuleto Raro o mejor y una «Elegí una» Bendición de 2 Reyes.
- **Santuario del Bufón**: un trato (los Secretos de abajo).
- **Fogón**: Curar 7 de Vida o Purgar una carta, gratis; uno de los dos (con el Cartógrafo del Altar, los dos).
- **La Pulpería**: comprar, Purgar y Curar con oro.


**Reyes jefe** (4; cada campaña sortea 3). El monarca de cada asalto con jefe es uno de los 4 Reyes: es el **último guardia** de la Casa de su palo (que va la última), llega con retrato, tiene ×2 de Vida y, mientras lo tienes delante, su **Furia del Rey** sube cada turno. Cada uno tiene además su **rasgo de combate**, y te habla según cómo lo trataste: como aliado si llevas alguna Bendición suya, como rival si solo llevas de otros. En el asalto 2 el Rey ocupa el sitio del Caballo, con ×0,8 de su Vida y -2 de Ataque. Al caer abre su **Cofre**: uno de tres Amuletos, Raros o mejores.

| Rey jefe | Rasgo | Efecto | Furia por turno |
|---|---|---|---|
| El Rey de Espadas | Filo del Rey | Mientras está al frente, su Contraataque atraviesa 4 de tu Escudo. | 3 |
| El Rey de Bastos | Corteza de roble | Mientras está al frente, no queda Expuesto ni Aturdido. | 1 |
| El Rey de Oros | Diezmo | Mientras está al frente, cada turno tira un dado: su Contraataque suma de +1 a +6. | 1 |
| El Rey de Copas | Brindis del Rey | Cada turno que sigue al frente, se cura 12 de Vida. | 3 |

### El Botín

Tras cada combate, el **Botín** se cobra por partes; cada una se toma o se salta, y lo que no se cobra se pierde al seguir:

- **Oro**: asalto ganado, Golpes exactos, la Vida que te queda e interés de 1 por cada 5 de oro guardado. Tras un asalto recuperás 4 de Vida.
- **«Elegí una»**: tres opciones a la vista. Tras un asalto, dos Trampas del Bufón y una carta de baraja ya marcada con un sello de lacre o un acabado (saltarla paga 3 de oro); tras un asalto de Rey, también una Bendición y el **Cofre del Rey** (uno de tres Amuletos Raros o mejores).

### La Pulpería

Lo atiende el Tratante.

- **Amuletos** (su precio depende de la rareza: común ~4, raro ~6, noble ~8, regio ~11). Se pueden vender por la mitad.
- **Sobre lacrado**: lo abres ahí mismo y te quedas con 1 de 3.
- **Sobre a ciegas**: una especial sin verla, más barata.
- **Mesa de lacre**: pone el sello de lacre o el acabado en oferta sobre la carta de tu Mazo que elijas.
- **Pergamino**: sube de nivel una formación.
- **Curar** (+6 de Vida), **Purgar** (saca una carta; el Mazo no baja de 12) y **Renovar mesa** (cambia lo que hay en oferta), los tres con coste creciente.

### Santuarios del Bufón

En cada Santuario del Bufón del Mapa espera un trato: una apuesta de azar o un dilema con premio y precio. No se repiten hasta haber visto los 9:

- **El cofre enterrado.** Entre dos tumbas asoma un cofre con candado. Forzarlo hará temblar media cripta.
  - *Forzarlo*: Perdés 5 de Vida. Te llevás un Amuleto Noble o Regio.
  - *Vendérselo al Tratante*: +8 de oro.
- **El caldero del alquimista.** Un caldero hierve solo en un rincón. Lo que entra, sale convertido en otra cosa.
  - *Fundir dos cartas*: Elegís dos: arden y nace una con el número más alto, en Lacre policromo y con el sello que llevaran.
  - *Calentarse y seguir*: +4 de Vida.
- **El decreto maldito.** Un decreto clavado en la puerta promete una cifra enorme. La letra pequeña habla del próximo asalto.
  - *Firmar*: +20 de oro ahora. En el próximo asalto, el Ataque de los cuatro tronos sube 1.
  - *Romperlo*: El papel arde bien: +3 de oro.
- **Los lacradores ciegos.** Tres monjes sellan a la luz de una vela lo que les pongas delante, y no aceptan regateos.
  - *Pagar con Vida*: Perdés 6 de Vida. Tres cartas al azar reciben un sello de lacre.
  - *Pagar con oro*: 8 de oro. Tu carta más alta recibe Lacre policromo.
  - *Seguir de largo*: Nada cambia.
- **Los mapas escondidos.** Tras una losa están los mapas del castillo. Arrancarlos hace crujir lo poco que los protege.
  - *Arrancarlos*: Perdés 3 de Vida máxima para siempre. Dos formaciones al azar suben 2 niveles.
  - *Copiarlos a mano*: 5 de oro. Una formación al azar sube 1 nivel.
  - *Dejarlos donde están*: Nada cambia.
- **La rueda de la fortuna.** Una rueda de carro cuelga del techo, pintada en cuatro gajos. Alguien dejó la manivela puesta.
  - *Girar la rueda*: Sale un gajo al azar: +12 de oro, +6 de Vida, un Amuleto Raro o −4 de Vida.
  - *No tocarla*: Te llevás las monedas del suelo: +3 de oro.
- **Los huesos del diablo.** Un tahúr sin rostro agita dos huesos en un cubilete. Mira tu bolsa de esquirlas y sonríe.
  - *Doble o nada*: Te jugás las esquirlas de esta campaña: 1 de cada 2 veces se doblan; si no, las perdés.
  - *Guardar la bolsa*: Nada cambia.
- **El altar de sangre.** Un altar con cuatro coronas. El cuenco del centro pide algo tuyo antes de dar nada.
  - *Ofrecer tu sangre*: Perdés 3 de Vida máxima para siempre. El Rey del que más Bendiciones llevás te da otra.
  - *Rezar y seguir*: +3 de Vida.
- **El dado de dos caras.** Sobre una losa hay un dado de hueso: tres caras blancas, tres negras. Solo se puede tirar una vez.
  - *Tirarlo*: Blanca: 2 formaciones suben 1 nivel. Negra: +10 de oro y +1 de Ataque en el próximo asalto.
  - *Dejarlo quieto*: +2 de Vida.

### Trono infinito, semillas y Reinados

- Después del asalto 5 puedes seguir al **Trono infinito**: asaltos sin final, de cuatro tronos y siempre con monarca, cada uno un 45 % más resistente que el anterior (el primero, ×8,6).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Reinados**: hay 8. Ganar una campaña abre el Reinado siguiente; cada uno añade **un giro** a todos los anteriores y sube un 25 % el cobro de la conjura (sin contar lo que cae a la mesa).

| Reinado | Nombre | Giro |
|---|---|---|
| 1 | Reinado de paz | Las reglas de siempre. |
| 2 | Corazas finas | Todos los guardias tienen un 35 % más de Vida. |
| 3 | Corte airada | Cada Mazo agotado sube la Furia 2 más. |
| 4 | Reyes acorazados | En los asaltos con monarca, los Reyes tienen un 30 % más de Vida. |
| 5 | Rey colérico | El Ataque de los Reyes sube 2. |
| 6 | Heridas viejas | Tu Vida máxima baja 1. |
| 7 | Guardia de noche | El Ataque de las Sotas y los Caballos sube 1. |
| 8 | Puertas selladas | En los asaltos 4 y 5, el Ataque de los cuatro tronos sube 2. |

- **Sellos de maestría**: al ganar, el Mazo usado y cada Amuleto que llevabas quedan marcados en la colección con el Reinado más alto que has ganado con ellas: sello de **bronce** (Reinados 1–3), de **hierro** (4–6) o de **oro** (7–8).
- **Reinicio rápido**: mantén pulsada la **R** (o Select en el mando) 0,7 segundos para volver a empezar la campaña con el mismo Mazo y el mismo Reinado. La que dejas no cuenta como derrota ni da esquirlas.

## Amuletos

Llevas hasta **4 Amuletos**, y uno más por nivel de la **Faja ancha** del Altar (hasta 6). **No se ordenan**: cada uno nuevo va al final de la tira y ninguno depende de su hueco. En la cuenta primero se suma todo y al final se multiplica. Hay 22, en 4 familias, una por Rey: 12 en el surtido de salida y 10 más en los arcones del Altar (uno por Rey). **Cada Amuleto cuenta como pieza de su Rey** para los niveles [2/4], igual que una Bendición.

- **Sello de nivel** (S · A · B): lo calcula el laboratorio (`npm run analyze:meta -- sellos`) con cada pieza dada de salida frente a las mismas campañas sin ella: el tercio que más sube la victoria lleva **S**, el que menos **B** y el resto **A**. Lo llevan los Amuletos, las Trampas del Bufón y las Bendiciones.
- **★ Sinergia**: la pieza lleva una estrella cuando enciende un nivel de su Rey («★ Bastos [4]»), cuando está hecha para tu Mazo («★ Para Escoba») o cuando acerca el [4] («★ Copas 3/4»).

| Amuleto | Rey | Rareza | Tipo | Efecto | Sello | Surtido |
|---|---|---|---|---|---|---|
| Cuchillo criollo | Rey de Espadas | Común | +D suma Daño | +3 de Daño por cada carta de Espadas del golpe. | B | de salida |
| Cortaplumas | Rey de Espadas | Raro | +D suma Daño | +14 de Daño si jugás una carta sola. | B | de salida |
| Piedra de afilar | Rey de Espadas | Noble | • pasiva | Golpe exacto con margen: pasarte hasta 3 de la Vida del guardia también es exacto. | A | de salida |
| Tijera de esquila | Rey de Espadas | Noble | • pasiva | Tras un Golpe exacto, el guardia siguiente pierde la mitad de su Vida. | B | arcón del Altar |
| Facón de plata | Rey de Espadas | Regio | • pasiva | Abatir a un guardia de un solo golpe de 2 cartas o menos cuenta como Golpe exacto. | S | arcón del Altar |
| Rebenque | Rey de Bastos | Común | +D suma Daño | +3 de Daño por cada carta de Bastos del golpe. | S | de salida |
| Guardamonte | Rey de Bastos | Común | • pasiva | Cada carta de Bastos da +1 de Escudo más, y el tope del Escudo sube 4. | S | de salida |
| Poncho | Rey de Bastos | Raro | • pasiva | Cada guardia abatido: +2 de Escudo. | S | de salida |
| Talero | Rey de Bastos | Raro | • pasiva | Si el Escudo frena entero un Contraataque, ese guardia recibe 3 × lo frenado. | A | arcón del Altar |
| Boleadoras | Rey de Bastos | Noble | • pasiva | El Ataque de todos los guardias baja 1. | S | arcón del Altar |
| Moneda falsa | Rey de Oros | Común | +D suma Daño | +3 de Daño por cada carta de Oros del golpe. | A | de salida |
| Alcancía | Rey de Oros | Común | • pasiva | +4 de oro al cerrar cada asalto ganado. | A | de salida |
| Naipes marcados | Rey de Oros | Raro | +M suma Multi | +1 de Multi con grupo, doble par, full o póker. | A | arcón del Altar |
| Farol | Rey de Oros | Raro | • pasiva | Cada Comodín que jugás: +3 de oro y robás 2 cartas. | S | de salida |
| Cubilete | Rey de Oros | Raro | +M suma Multi | Cada turno se tira un dado: con 5 o más, +1 de Multi. | A | arcón del Altar |
| Cañita voladora | Rey de Oros | Noble | • pasiva | Cada guardia abatido: los otros tronos reciben 6. | A | arcón del Altar |
| Mate curado | Rey de Copas | Común | +D suma Daño | +3 de Daño por cada carta de Copas del golpe. | B | de salida |
| Bota de vino | Rey de Copas | Común | • pasiva | Cada carta de Copas cura +1 más. | B | de salida |
| Asado | Rey de Copas | Raro | • pasiva | Cada guardia abatido: +1 de Vida. | A | de salida |
| Guitarra | Rey de Copas | Raro | +M suma Multi | +1 de Multi con escalera o escalera de color. | B | arcón del Altar |
| Último trago | Rey de Copas | Noble | ×M multiplica | ×2 de Multi si tu Vida está al 50 % o menos. | B | arcón del Altar |
| Alpargatas | Rey de Copas | Regio | • pasiva | +1 carta en la mano. | S | arcón del Altar |

## Los 4 Reyes y sus Bendiciones

Cada palo tiene su **Rey**: el de Espadas (el filo: perforar, rematar, Golpe exacto), el de Bastos (el aguante: Escudo y frenar el Contraataque), el de Oros (la fortuna: oro, salpicadura y el dado) y el de Copas (el brindis: curación, Vida y robar). Hay 26 **Bendiciones**: 5 de cada Rey y 6 **Duales**, de dos Reyes a la vez.

- **La oferta.** Al empezar la campaña ofrecen 2 Reyes distintos, y antes de cada asalto siguiente ofrecen 3: cada uno pone una Bendición suya y te quedas con una. Una **Dual** solo se ofrece si ya llevas al menos una Bendición de cada uno de sus dos Reyes.
- **Las cargas.** Cada Bendición tiene un efecto que vale desde que la tomas y una **condición de carga**: cada vez que se cumple suma una carga para el resto de la campaña, y cada carga da lo que dice su texto. La mesa lo enseña como «Espadas +6».
- **Los niveles.** Con **2 y 4** piezas de un mismo Rey (las Duales cuentan para los dos) se encienden sus bonos:

| Rey | Con 2 | Con 4 |
|---|---|---|
| **Rey de Espadas** | El guardia cae con Golpe exacto aunque te quedes corto o te pases por 1 o menos. | Tus golpes con 2 cartas de Espadas o más hacen ×2 de Multi. |
| **Rey de Bastos** | Empezás cada asalto con 4 de Escudo. | El tope del Escudo sube 2. |
| **Rey de Oros** | Cada turno se tira un dado: con un 6, el Contraataque de ese turno no llega. | Con un 5 o más ya no llega, y +3 de oro al cerrar cada asalto ganado. |
| **Rey de Copas** | Cada guardia que abatís con Copas te cura 1. | Cada guardia abatido te cura 1, lleve Copas o no el golpe. |

| Bendición | Rey | Efecto | Carga |
|---|---|---|---|
| Filo templado | Rey de Espadas | +2 de Daño por cada carta de Espadas del golpe. | Cada Golpe exacto: +1 de Daño a todos tus golpes. |
| Estocada | Rey de Espadas | Golpe de una carta sola: +8 de Daño. | Cada guardia que abatís con una carta sola: +2 de Daño a esos golpes. |
| Tajo hondo | Rey de Espadas | Todos tus golpes perforan, lleven o no Espadas. | Cada golpe que abate a 2 guardias o más: +3 de Daño a todos tus golpes. |
| Primera sangre | Rey de Espadas | +10 de Daño en el primer golpe contra cada guardia. | Cada guardia que cae de un solo golpe: +2 de Daño a esos primeros golpes. |
| Remate | Rey de Espadas | El guardia que queda con 10 % de su Vida o menos, cae. | Cada guardia rematado así: +2 de Daño a todos tus golpes. |
| Garrote | Rey de Bastos | Tus golpes con Bastos dan +1 de Escudo. | Cada Contraataque que el Escudo frena entero: +1 de Escudo al empezar cada asalto. |
| Empalizada | Rey de Bastos | El tope del Escudo sube 2. | Cada golpe que te da 4 de Escudo o más: +1 de Escudo al empezar cada asalto. |
| Réplica | Rey de Bastos | Si el Escudo frena entero un Contraataque, ese guardia recibe 6. | Cada réplica: +2 de Daño a la réplica. |
| Palo y palo | Rey de Bastos | +1 de Daño por cada punto de Escudo en pie. | Cada Contraataque que el Escudo frena entero: +1 de Daño a todos tus golpes. |
| Aguante | Rey de Bastos | Empezás cada asalto con 3 de Escudo. | Cada guardia que abatís con Escudo en pie: +1 de Daño a tus golpes con Bastos. |
| Moneda de oro | Rey de Oros | Cada guardia abatido: +1 de oro. | Cada golpe con 3 cartas de Oros o más: +1 de oro al cerrar cada asalto. |
| Lluvia de oro | Rey de Oros | Cada carta de Oros salpica +1 más a los otros tronos. | Cada guardia que cae por salpicadura: +1 de salpicadura en todos tus golpes. |
| Taba cargada | Rey de Oros | Cada turno se tira un dado: tu golpe suma 2 × el dado de Daño. | Cada 6 del dado en un golpe: +2 de Daño a todos tus golpes. |
| Arcón del Rey | Rey de Oros | Ahora, +8 de oro, y el tope del interés sube 2. | Cada Golpe exacto: +1 de oro al cerrar cada asalto. |
| Envite | Rey de Oros | +1 de Multi si el golpe mezcla 3 palos o más. | Cada guardia que abatís con 3 palos o más: +2 de Daño a esos golpes. |
| Brindis | Rey de Copas | Tus golpes con Copas curan +1 más. | Cada golpe que te cura 4 o más: +1 de Vida al cerrar cada asalto. |
| Porrón | Rey de Copas | Ahora, +4 de Vida máxima (y de Vida). | Cada guardia que abatís con Copas: +2 de Daño a tus golpes con Copas. |
| Otra ronda | Rey de Copas | Cada guardia que abatís con Copas: robás 1 carta. | Cada golpe de 4 cartas o más: +1 de Vida al cerrar cada asalto. |
| Cáliz rebosante | Rey de Copas | La curación que no cabe: +2 de Daño por punto a tu golpe siguiente. | Cada golpe que cura de más: +1 de Daño a todos tus golpes. |
| Sobremesa | Rey de Copas | Al cerrar cada asalto ganado, curás 3 de Vida. | Cada guardia que abatís con la Vida llena: +1 de Daño a todos tus golpes. |
| Hoja y broquel | Rey de Espadas y Rey de Bastos | Cada Golpe exacto: +2 de Escudo. | Cada Contraataque que el Escudo frena entero: +1 de Daño a todos tus golpes. |
| Filo dorado | Rey de Espadas y Rey de Oros | Cada Golpe exacto: los otros tronos reciben 6. | Cada guardia que cae por salpicadura: +1 de Daño a todos tus golpes. |
| Sangría | Rey de Espadas y Rey de Copas | Cada Golpe exacto te cura 2. | Cada Golpe exacto con la Vida llena: +2 de Daño a todos tus golpes. |
| Peaje | Rey de Bastos y Rey de Oros | Cada Contraataque que el Escudo frena entero: +1 de oro. | Cada guardia que abatís con Bastos y Oros: +1 de Escudo al empezar cada asalto. |
| Fogón | Rey de Bastos y Rey de Copas | El Escudo que no cabe te cura: cada 2 de más, 1 de Vida. | Cada guardia que abatís con Bastos y Copas: +1 de Vida al cerrar cada asalto. |
| Convite | Rey de Oros y Rey de Copas | Cada golpe con Oros y Copas: +1 de oro y te curás 1. | Cada guardia que abatís con Oros y Copas: +1 de Daño a todos tus golpes. |

## Sellos de lacre y acabados

Una carta de baraja puede llevar un sello de lacre y un acabado a la vez.

| Sello de lacre | Efecto |
|---|---|
| Sello de pólvora | Al golpear, los tronos al lado del golpeado en la mesa reciben el valor de esta carta. |
| Sello de eco | Su Daño y el poder de su palo cuentan 2 veces. |
| Sello de oro real | +2 de oro si el golpe abate a un guardia. |
| Sello de la manga | Robás 1 carta extra al jugarla o descartarla. |

| Acabado | Efecto |
|---|---|
| Filo de plata | +6 de Daño. |
| Templado | +1 de Multi. |
| Lacre policromo | ×2 de Multi. |
| Cristal maldito | ×3 de Multi, pero 1 de cada 4 veces la carta se hace añicos. |

Las cartas que arden (de Cristal maldito que se hacen añicos, quemadas en la hoguera o fundidas) salen del Mazo para siempre.

## Trampas del Bufón

Las cartas especiales de la campaña son las 8 **Trampas del Bufón**: no tienen palo ni número, acompañan a cualquier golpe (hasta 2 por golpe) o se juegan solas. Salen en los Sobres lacrados, en el Botín y en La Pulpería, y todas están desde el principio.

| Trampa | Efecto | Sello |
|---|---|---|
| Cuento del tío | Cada carta del golpe vale lo que la de mayor número. | A |
| Zancadilla | Este turno no hay Contraataque. | S |
| Mano negra | ×2 de Multi, pero perdés 2 de Vida. | B |
| Disfraz | Este golpe no respeta Inmune: tus cartas hacen su Daño contra cualquiera. | A |
| Pase mágico | Robás 2 cartas más este turno. | S |
| Mordida | Si el golpe abate a un guardia, +6 de oro. | B |
| Puñal oculto | El golpe Perfora y suma +12 de Daño. | A |
| ¡Retruco! | +1 de Multi. | A |

## Los 5 Mazos

Cada campaña se juega con un **Mazo**: una fantasía de juego de naipes rioplatense con sus reglas propias, que se suman a las de siempre. La **Escoba** está desde el principio; los demás se desbloquean con logros. Las cargas (de la Escoba y de la Mano larga) duran toda la campaña.

| Mazo | Lema | Vida · mano | Cómo cambia la campaña | Se desbloquea con |
|---|---|---|---|---|
| Escoba | Mesa barrida | 15 · 6 | Mano de 6. Si las cartas del golpe suman 15, ¡Escoba!: +1 de Multi y una carga de Daño. | — |
| Truco | Envido y bravas | 9 · 8 | Del 1 al 7, mano de 8 y 9 de Vida. Los bravos pegan más; 2 del mismo palo cantan Envido. | Adiós, carcelero |
| Chinchón | Pierna y escalera | 12 · 7 | Tríos y escaleras del palo pegan más; las manos largas cargan Daño. Empezás con 12 de Vida. | Medio castillo |
| El Mentiroso | Cara de piedra | 13 · 7 | Mano de 7, 3 Comodines que no gastan el turno y un Engaño por asalto. 13 de Vida. | Fin del reinado |
| Chancho Va | Mano al centro | 16 · 6 | Mano de 6 y 16 de Vida. Pasá 1 carta por turno y robá otra; el póker aturde en cadena. | De un solo golpe |

| Regla | Mazo | Qué hace |
|---|---|---|
| Bravo | Truco | Los bravos suman Daño: 1 de Espadas +25, 1 de Bastos +20, 7 de Espadas +15 y 7 de Oros +10. |
| Envido | Truco | Golpe de 2 cartas del mismo palo (vale como jugada): +10 de Daño. |
| ¡Escoba! | Escoba | Si las cartas suman 15 (vale como jugada): +1 de Multi y +2 de Daño por cada Escoba ya hecha. |
| Pierna | Chinchón | Un grupo de 3 cartas iguales: +1 de Multi. |
| Escalera del palo | Chinchón | Una escalera de color: +8 de Daño. |
| Mano larga | Chinchón | Golpe de 4 cartas o más: −2 al Contraataque, y +1 de Daño para siempre a esas manos largas. |
| Cara de piedra | El Mentiroso | Jugar un Comodín no gasta el turno: el Contraataque de ese guardia no llega y tu golpe siguiente suma +28 de Daño. |
| Engaño | El Mentiroso | Una vez por asalto, el golpe que no abatía cuenta como de un palo, de un número o sin Inmune. |
| Pasar | Chancho Va | Una vez por turno, descartar 1 sola carta no gasta el turno: robás otra en el acto. |
| Chancho | Chancho Va | Un póker (4 iguales): los 2 Contraataques siguientes no llegan. |
| De arranque | Chancho Va | Abatir a un guardia en los 4 primeros turnos del asalto: +35 de Daño al golpe siguiente. |

## El Altar

Ganes o pierdas, cada campaña deja **Esquirlas de Corona** ✦: las que caen a la mesa durante los asaltos y el **cobro de la conjura** al cerrarla (100 por cada punto de la cuenta de siempre). Lo que cae a la mesa:

| Qué pasa | Monedas | Esquirlas | Gotas de lacre |
|---|---|---|---|
| Cada golpe | — | 1 | — |
| Cada guardia abatido | 1 | 2 | — |
| Cada Golpe exacto | 1 | 5 | 1 |
| Cada monarca vencido | — | 25 | — |

- Con **3 gotas de lacre**, la Mesa de lacre te sella gratis.
- **Tirada de huesos**: al ganar cada asalto se tiran dos dados. El **Dado de oro** (caras ×1 ×1 ×1 ×1 ×2 ×2) multiplica las monedas que cayeron en ese asalto; el **Dado de la Corona** (caras ×1 ×1 ×1 ×2 ×2 ×3) multiplica sus esquirlas. Al perder no hay tirada.

Las esquirlas se gastan en el Altar, que crece desde su raíz, «La corona quebrada», en cuatro ramas. Un nodo pide tener antes su padre. Solo **el Arsenal** cambia la campaña de cinco asaltos; la Bolsa y los Huesos solo dan más esquirlas, y la Corona de hierro solo actúa en el Trono infinito. El surtido de salida es corto a propósito (12 Amuletos); los arcones del Arsenal, uno por Rey, abren los otros 10.

### El Arsenal

Mejoras que te ayudan a ganar.

| Nodo | Efecto | Rangos | Coste de cada rango |
|---|---|---|---|
| Bolsa de la conjura | +1 de oro inicial por rango. | 5 | 300 ✦ · 600 ✦ · 700 ✦ · 800 ✦ · 900 ✦ |
| Favor del Tratante | Un «Renovar mesa» gratis en cada Pulpería, por nivel. | 2 | 400 ✦ · 800 ✦ |
| Faja ancha | Por nivel: +1 hueco de Amuleto (de 4 a 6). | 2 | 800 ✦ · 1200 ✦ |
| Cartógrafo | En el Fogón, Curar y Purgar a la vez. | 1 | 600 ✦ |
| Ojo del tasador | Los Amuletos de La Pulpería cuestan 1 de oro menos (mínimo 1). | 3 | 200 ✦ · 300 ✦ · 400 ✦ |
| Arcón de Espadas | Añade al surtido: Tijera de esquila, Facón de plata. | 1 | 400 ✦ |
| Arcón de Bastos | Añade al surtido: Talero, Boleadoras. | 1 | 400 ✦ |
| Arcón de Oros | Añade al surtido: Naipes marcados, Cubilete, Cañita voladora. | 1 | 400 ✦ |
| Arcón de Copas | Añade al surtido: Guitarra, Último trago, Alpargatas. | 1 | 400 ✦ |
| Lacres nuevos | La Mesa de lacre también ofrece los sellos de pólvora y de la manga. | 1 | 500 ✦ |
| Cristalero real | La Mesa de lacre también ofrece Lacre policromo y Cristal maldito. | 1 | 600 ✦ |

### La Bolsa

Más esquirlas con cada golpe.

| Nodo | Efecto | Rangos | Coste de cada rango |
|---|---|---|---|
| Piedra imán | El imán llega un 20 % más lejos y recoge 0,1 s antes. | 5 | 50 ✦ · 150 ✦ · 450 ✦ · 1400 ✦ · 4100 ✦ |
| Astillas de corona | +1 esquirlas por cada golpe. | 5 | 50 ✦ · 150 ✦ · 450 ✦ · 1400 ✦ · 4100 ✦ |
| Diezmo del guardia | +2 esquirlas por cada guardia abatido. | 5 | 100 ✦ · 300 ✦ · 900 ✦ · 2700 ✦ · 8100 ✦ |
| Corte limpio | +5 esquirlas por cada Golpe exacto. | 5 | 150 ✦ · 450 ✦ · 1400 ✦ · 4100 ✦ · 12000 ✦ |
| Rescate real | +25 esquirlas por cada monarca vencido. | 5 | 300 ✦ · 900 ✦ · 2700 ✦ · 8100 ✦ · 24000 ✦ |
| Ceniza del caído | Al perder, +1 esquirlas por cada guardia que abatiste. | 5 | 50 ✦ · 150 ✦ · 450 ✦ · 1400 ✦ · 4100 ✦ |
| Mano llena | +2 esquirlas por cada golpe de 3 cartas o más. | 5 | 200 ✦ · 600 ✦ · 1800 ✦ · 5400 ✦ · 16000 ✦ |
| Racha de sangre | +2 esquirlas por cada eslabón de Racha al golpear. | 5 | 300 ✦ · 900 ✦ · 2700 ✦ · 8100 ✦ · 24000 ✦ |

### Los Huesos

Dados que multiplican tus esquirlas.

| Nodo | Efecto | Rangos | Coste de cada rango |
|---|---|---|---|
| Hueso tallado | Mejoras de +1 a la cara más baja del Dado de la Corona: 1. | 5 | 200 ✦ · 600 ✦ · 1800 ✦ · 5400 ✦ · 16000 ✦ |
| Cara del rey | La cara más alta del Dado de la Corona vale ×4. | 5 | 500 ✦ · 1500 ✦ · 4500 ✦ · 14000 ✦ · 41000 ✦ |
| Segundo hueso | Tirás dos Dados de la Corona y sus caras se multiplican. | 1 | 5000 ✦ |

### La Corona de hierro

Más esquirlas y más poder en el Trono infinito.

| Nodo | Efecto | Rangos | Coste de cada rango |
|---|---|---|---|
| Corona de hierro | En el Trono infinito, las esquirlas de la mesa valen ×2. | 5 | 700 ✦ · 2100 ✦ · 6300 ✦ · 19000 ✦ · 57000 ✦ |
| Pendón negro | +100 esquirlas por cada Trono infinito que superás. | 5 | 1000 ✦ · 3000 ✦ · 9000 ✦ · 27000 ✦ · 81000 ✦ |
| Sangre real | En el Trono infinito, cada cara del Dado de la Corona sube 1. | 5 | 1600 ✦ · 4800 ✦ · 14000 ✦ · 43000 ✦ · 130000 ✦ |
| Trono de huesos | En el Trono infinito tirás un Dado de la Corona más. | 1 | 30000 ✦ |
| Manga honda | En el Trono infinito, La Manga guarda 2 cartas en vez de 1. | 1 | 800 ✦ |
| Buen ojo | En el Trono infinito, Golpe exacto también si te pasás por 1 o menos. | 2 | 600 ✦ · 1200 ✦ |

### Archivo de crónicas y copia de seguridad

- El archivo guarda las **25 últimas campañas terminadas**: cómo acabaron, en qué asalto y ante qué monarca, turnos, mayor Golpe, Amuletos y semilla. Desde ahí se puede **copiar la Crónica** o **rejugar la semilla** con el mismo Mazo y el mismo Reinado.
- En **Ajustes**, *Exportar progreso* guarda el Altar, la colección, las crónicas y los ajustes en un archivo .json, e *Importar progreso* lo recupera en otro navegador, otro equipo o la versión de escritorio.

### Logros

| Logro | Cómo | Esquirlas | Desbloquea |
|---|---|---|---|
| Primer paso | Ganá tu primer asalto de campaña. | +100 ✦ | — |
| Adiós, carcelero | Supera el asalto 2. | +200 ✦ | Truco |
| Medio castillo | Supera el asalto 3. | +300 ✦ | Chinchón |
| Fin del reinado | Ganá una campaña. | +500 ✦ | El Mentiroso |
| Gran conspirador | Ganá una campaña en el Reinado 4 o superior. | +800 ✦ | — |
| Más allá del trono | Supera un Trono infinito. | +400 ✦ | — |
| Sin fin | Supera tres Tronos infinitos en una campaña. | +800 ✦ | — |
| Dos y dos | Jugá un doble par. | +100 ✦ | — |
| Todo al mismo palo | Jugá un color. | +100 ✦ | — |
| Casa llena | Jugá un full. | +200 ✦ | — |
| Póker | Jugá un póker. | +300 ✦ | — |
| Escalera real | Jugá una escalera de color de 5 cartas o más. | +300 ✦ | — |
| De un solo golpe | Hacé un Golpe de 100 o más. | +200 ✦ | Chancho Va |
| Trueno | Hacé un Golpe de 500 o más. | +400 ✦ | — |
| Cataclismo | Hacé un Golpe de 2000 o más. | +800 ✦ | — |
| Mano firme | Da 10 Golpes exactos. | +200 ✦ | — |
| Pulso de ladrón | Da 50 Golpes exactos. | +500 ✦ | — |
| Cien guardias | Abatí a 100 guardias. | +300 ✦ | — |
| Azote de la corte | Abatí a 500 guardias. | +600 ✦ | — |
| Ni un rasguño | Terminá un asalto con la Vida entera. | +200 ✦ | — |
| Tacaño | Juntá 30 de oro a la vez. | +200 ✦ | — |
| Faja llena | Llevá 4 Amuletos a la vez. | +300 ✦ | — |
| Lacrador | Estampa 10 sellos de lacre o acabados. | +300 ✦ | — |
| De guapo | Vencé a 10 Guardias Bravos. | +300 ✦ | — |
| Al calor del fogón | Descansá en 3 Fogones. | +200 ✦ | — |
| Coleccionista | Conseguí las 8 Trampas del Bufón, entre todas tus campañas. | +500 ✦ | — |
| Cliente del Tratante | Llevá 16 Amuletos distintos, entre todas tus campañas. | +800 ✦ | — |
| Trofeo: El Rey de Espadas | Vence al Rey de Espadas (filo del rey). | +200 ✦ | — |
| Trofeo: El Rey de Bastos | Vence al Rey de Bastos (corteza de roble). | +200 ✦ | — |
| Trofeo: El Rey de Oros | Vence al Rey de Oros (diezmo). | +200 ✦ | — |
| Trofeo: El Rey de Copas | Vence al Rey de Copas (brindis del rey). | +200 ✦ | — |
| Ningún rey en pie | Vence a los 4 Reyes. | +800 ✦ | — |

## Palabras clave

El juego usa solo seis palabras con significado propio. Todo lo demás se dice con palabras llanas. En pantalla van en negrita y, al pasar el puntero sobre cualquier texto que las mencione, el globo de ayuda encadena su definición.

- **Daño**: Lo que suman tus cartas: su número, del 1 al 9 (el As vale 11). Contra el trono de su palo, 0: es Inmune.
- **Multi**: Lo que multiplica al Daño: Daño × Multi = Golpe. Siempre es entero. Lo pone la formación y lo suben Amuletos y acabados.
- **Golpe exacto**: Abatir a un guardia con el Golpe justo: sin Contraataque, +1 de oro, robás 1, Impulso (el siguiente pierde ¼ de su Vida) y Racha (+1 de Multi al próximo golpe, hasta +3).
- **Expuesto**: Lo deja un golpe de un solo palo (2 cartas o más). El próximo golpe contra ese trono hace ×2 de Daño.
- **Aturdido**: Un trono Aturdido se salta su próximo Contraataque. Lo dejan un golpe de 3 palos, el Motín (Comodín) y El Espía.

## Controles

| Acción | Teclado y ratón | Mando |
|---|---|---|
| Mover el foco | Flechas | Cruceta o palanca izquierda |
| Elegir | Enter · 1–9 en la mano · clic | A |
| Golpear al enemigo activo | Espacio · clic en el trono | X |
| Guardar en La Manga | Y | Y |
| Mejor jugada (elige; no golpea) | Q | LT |
| Rebobinar (deshacer) | Z | R3 (pulsar la palanca derecha) |
| Descartar lo elegido | Supr | L3 (pulsar la palanca izquierda) |
| Atrás / soltar la selección | Esc | B |
| ui.ctl.saltar | Esc | B |
| Ver el Mazo y el Descarte | Tab | LB |
| Lupa | L · clic derecho · pulsación larga | RB |
| Cambiar la velocidad (1× → 2× → 4× → 8×) | botón de la barra | RT |
| AUTO: encender o apagar | A | Select |
| Saltar la tirada de huesos | Cualquier tecla | Cualquier botón |
| Altar: elegir un nodo y comprarlo | Enter en el nodo · Enter en Comprar | A en el nodo · A en Comprar |
| Altar: alejar / ampliar | − / + | LT / RT |
| Altar: mover la vista | Arrastrar · Mayús + flechas | Palanca derecha |
| Pantalla completa | F | Start → Ajustes → Pantalla completa |
| Reiniciar la campaña | Mantener R | Mantener Select + Start |
| Ajustes | botón de la barra | Start |

Los botones de la mesa enseñan su atajo: la tecla si juegas con teclado, el botón (A, B, X, Y, LB, RB, LT, RT, L3, R3) si lo último que tocaste fue un mando, y nada con ratón o pantalla táctil. Cada trono lleva a la vista la placa de su palo: es **Inmune** a las cartas de ese palo.

La **Lupa** abre cualquier carta, Amuleto, guardia o monarca a tamaño de lámina, con la cuenta exacta de lo que aporta en ese momento. En sala, pulsar un trono cuando no es tu turno (o cualquier ruta, oferta o carta con Alt) deja una **seña** con tus iniciales para la conjura: no decide nada, solo señala.
