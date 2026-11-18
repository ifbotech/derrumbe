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

1. **Daño**: se suma todo. La base de la formación, el número de cada carta (0 contra el trono de su palo: es **Inmune**), el Daño cargado y lo que añadan acabados, cartas especiales (hasta 2 por golpe) y reliquias. Si el trono está **Expuesto**, ese Daño vale ×2.
2. **Multi**: se suma todo (la base de la formación, la Racha de Golpes exactos y lo que añadan acabados, especiales, reliquias y rasgos) y, al final, se aplican los multiplicadores (×2, ×3…).

El **As** vale **11** y enlaza escaleras por abajo (A-2-3) y por arriba (9-10-A).

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
- **Furia**: cada punto es **+1 de Ataque** en todos los Contraataques, y se ve junto al ⚔ del enemigo activo. En campaña sube **2** con cada Mazo agotado y, contra un monarca, **1** cada turno que sigue en pie (la **Furia del Rey**). En el Asalto único sube además sola, desde el turno 30 y cada 3 turnos.
- **Mazo agotado**: si el Mazo se acaba, el Descarte se baraja y vuelve a ser Mazo. **Barajar no te quita Vida**, pero sube la **Furia** (2 en campaña): los asaltos no se pueden estirar sin fin.
- **As cómplice**: un As forma jugada con **cualquier otra carta** (×2 de Multi) y aporta el poder de su palo. Es la manera de colar un poder en un golpe: un As de Bastos para levantar Escudo, uno de Copas para curar, uno de Espadas para perforar.
- **La Manga**: junto a la mano hay un hueco aparte. Una vez por turno, y sin gastar el turno, puedes guardarte en la manga una carta de tu mano: no cuenta para el tamaño de la mano (robas hasta completarla igual) y se juega desde ahí como si estuviera en ella. Si el hueco está ocupado, la carta guardada vuelve a la mano. La reliquia *Manga doble* añade un segundo hueco.
- **Rebobinar** (↩ Deshacer; solo en campaña en solitario): una vez por asalto puedes **deshacer tu última jugada**. La mesa vuelve a como estaba y el Mazo se baraja de nuevo, así que lo que viste salir ya no vale. Usar la Manga no gasta el rebobinado. En sala no se rebobina: toda jugada es definitiva, y la mesa lo indica.
- Las cartas de baraja nunca bajan de 12 en el Mazo: lo que las quema deja de hacerlo al llegar a ese mínimo.
- **Victoria** (*Corte vencida*): todos los tronos caídos (en los primeros asaltos de la campaña hay menos de cuatro). **Derrota** (*Conjura deshecha*): tu Vida llega a 0.
- Modo **BRUTAL** (Asalto único): 16 de Vida y cada Mazo agotado sube la Furia 1.

## Campaña

Un roguelike de construcción de mazo: **5 asaltos** cada vez más duros, una sala del castillo cada uno, 3 de ellos con **monarca** (el del último es el **Rey Tirano** o la **Reina Tirana**). Empiezas con un Sobre lacrado de 3 cartas especiales, 4 de oro y un **Don de la Conjura** que eliges entre tres (una Reliquia común, un sello de lacre en una carta de tu Mazo o una bolsa de 5 de oro); entre asalto y asalto mejoras el Mazo y tus reliquias. La Vida base de los guardias es 35 / 45 / ; cada asalto la multiplica y la Vida final se redondea al múltiplo de 5 más cercano.

Los primeros asaltos tienen menos tronos: los palos que faltan se sortean al empezar la campaña y el Mapa los enseña desde el principio.

| Asalto | Sala | Tronos | Guardias por trono | Vida | Ataque | Monarca | Atajo |
|---|---|---|---|---|---|---|---|
| 1 | El Puente levadizo | 2 | Sota | ×5,9 | +1 | — | — |
| 2 | El Patio de armas | 3 | Sota, Caballo | ×4,4 | +1 | sí | — |
| 3 | La Cripta | 4 | Sota, Caballo | ×5,8 | +2 | — | sí |
| 4 | La Galería real | 4 | Sota, Caballo, Rey | ×4,2 | +3 | sí | — |
| 5 | El Salón del Trono | 4 | Sota, Caballo, Rey | ×4,8 | +4 | sí, Rey Tirano | — |

En conjura de 2 a 4 jugadores los guardias aguantan un 30 % más.

### El Mapa del castillo

El Mapa enseña **desde el principio** qué monarca espera en cada asalto y cuál es su decreto. En los asaltos sin monarca eliges:

- una **ruta** (dos a elegir; tres con el Cartógrafo del Altar), cada una con su **Juramento**;
- o, solo en el asalto 3, el **Atajo**: te saltas el asalto (sin Botín, sin selección y sin Pulpería) a cambio de un **Atajo de conspirador**.

**Juramentos.** Los normales piden una condición y pagan si la cumples; los de **riesgo** endurecen el asalto y pagan siempre que lo ganes.

| Juramento | Condición | Premio | Tipo |
|---|---|---|---|
| Piel intacta | Termina el asalto sin perder Vida. | +8 de oro | condición |
| Pulso firme | Da 3 Golpes exactos. | Un sello de lacre al azar | condición |
| Al galope | Gana el asalto en 3 turnos + 4 por guardia de cada trono, o menos (3 guardias: 15). | +6 de oro | condición |
| Mazo medido | Termina sin que se agote el Mazo. | +5 de oro | condición |
| Sin motines | No juegues ningún Comodín. | Un acabado al azar | condición |
| Jugada maestra | Juega un color, un full, un póker o una escalera de color. | Un Pergamino al azar | condición |
| Noche larga | El Ataque de todos los tronos sube 1. | +10 de oro | riesgo |
| Sin escudo | El Escudo no puede pasar de 2. | Una reliquia Rara o mejor | riesgo |
| Conjura corta | Jugáis con 1 carta menos en la mano. | +12 de oro | riesgo |

**Atajos de conspirador** (uno al azar por cada asalto con Atajo):

| Atajo | Efecto |
|---|---|
| Llave de la Pulpería | En la próxima Pulpería, reliquias, sobres y Mesa de lacre son gratis. |
| Contrabando | Recibes ya una reliquia Noble o Regia. |
| Molde de cera | Duplicas la carta de tu Mazo que elijas. |
| Botín escondido | +15 de oro. |
| Lacre doble | Dos cartas al azar de tu Mazo reciben un sello de lacre. |

**Monarcas** (7; cada campaña sortea 3). El monarca es el **último guardia** del asalto: llega con retrato, tiene ×2 de Vida y, mientras lo tienes delante, su **Furia del Rey** sube 1 cada turno. Cada uno impone además un **decreto**. Al caer abre su **Cofre**: una de tres Reliquias, una de ellas de tu rasgo principal.

| Monarca | Decreto | Efecto |
|---|---|---|
| El Rey de Dos Caras | Doble Contraataque | Hay 2 Contraataques cada turno, pero cada uno ataca un 50 % menos. |
| El Usurero | Escasez | Jugáis con 1 carta menos en la mano. |
| La Dama del Cáliz | Cáliz envenenado | Tus Copas no curan: cada una que juegas te quita 1 de Vida. |
| La Reina Helada | Escarcha | El Escudo no puede pasar de 1. |
| El Inquisidor | Guardia de hierro | Ningún guardia queda Aturdido, pero pegan 1 menos. |
| El Carnicero | Hacha afilada | El Ataque de todos los guardias sube 3. |
| El Relojero | Arena rápida | El asalto empieza con 1 de Furia, y cada guardia abatido sin Golpe exacto te quita 1 de Vida. |

### El Botín

Tras cada asalto cobras oro (asalto ganado, Golpes exactos, la Vida que te queda e interés de 1 por cada 5 de oro guardado), recuperas 4 de Vida y eliges **una de tres opciones a la vista** —dos cartas especiales y una carta de baraja ya marcada con un sello de lacre o un acabado— o pasas a cambio de 3 de oro.

### La Pulpería

Lo atiende el Tratante.

- **Reliquias** (su precio depende de la rareza: común ~4, rara ~6, noble ~8, regia ~11). Se pueden vender por la mitad.
- **Sobre lacrado**: lo abres ahí mismo y te quedas con 1 de 3.
- **Sobre a ciegas**: una especial sin verla, más barata.
- **Mesa de lacre**: pone el sello de lacre o el acabado en oferta sobre la carta de tu Mazo que elijas.
- **Pergamino**: sube de nivel una formación.
- **Curar** (+6 de Vida), **La hoguera** (quema una carta; el Mazo no baja de 12) y **Renovar mesa** (cambia lo que hay en oferta), los tres con coste creciente.

### Santuarios de la cripta

Tras los monarcas de los asaltos 2 y 4 aparece un santuario: una apuesta de azar o un dilema con premio y precio. Cada campaña ve 2 de estos 9:

- **El cofre enterrado.** Entre dos tumbas asoma un cofre con candado. Forzarlo hará temblar media cripta.
  - *Forzarlo*: Pierdes 5 de Vida. Te llevas una reliquia Noble o Regia.
  - *Vendérselo al Tratante*: +8 de oro.
- **El caldero del alquimista.** Un caldero hierve solo en un rincón. Lo que entra, sale convertido en otra cosa.
  - *Fundir dos cartas*: Eliges dos: arden y nace una con el número más alto, en Lacre policromo y con el sello que llevaran.
  - *Calentarse y seguir*: +4 de Vida.
- **El decreto maldito.** Un decreto clavado en la puerta promete una cifra enorme. La letra pequeña habla del próximo asalto.
  - *Firmar*: +20 de oro ahora. En el próximo asalto, el Ataque de los cuatro tronos sube 1.
  - *Romperlo*: El papel arde bien: +3 de oro.
- **Los lacradores ciegos.** Tres monjes sellan a la luz de una vela lo que les pongas delante, y no aceptan regateos.
  - *Pagar con Vida*: Pierdes 6 de Vida. Tres cartas al azar reciben un sello de lacre.
  - *Pagar con oro*: 8 de oro. Tu carta más alta recibe Lacre policromo.
  - *Seguir de largo*: Nada cambia.
- **Los mapas escondidos.** Tras una losa están los mapas del castillo. Arrancarlos hace crujir lo poco que os protege.
  - *Arrancarlos*: Pierdes 3 de Vida máxima para siempre. Dos formaciones al azar suben 2 niveles.
  - *Copiarlos a mano*: 5 de oro. Una formación al azar sube 1 nivel.
  - *Dejarlos donde están*: Nada cambia.
- **La rueda de la fortuna.** Una rueda de carro cuelga del techo, pintada en cuatro gajos. Alguien dejó la manivela puesta.
  - *Girar la rueda*: Sale un gajo al azar: +12 de oro, +6 de Vida, una Reliquia Rara o −4 de Vida.
  - *No tocarla*: Te llevas las monedas del suelo: +3 de oro.
- **Los huesos del diablo.** Un tahúr sin rostro agita dos huesos en un cubilete. Mira tu bolsa de esquirlas y sonríe.
  - *Doble o nada*: Te juegas las esquirlas de esta campaña: 1 de cada 2 veces se doblan; si no, las pierdes.
  - *Guardar la bolsa*: Nada cambia.
- **El altar de sangre.** Un altar con cinco estandartes. El cuenco del centro pide algo tuyo antes de dar nada.
  - *Ofrecer tu sangre*: Pierdes 3 de Vida máxima para siempre. Te llevas una Reliquia del rasgo del que llevas más.
  - *Rezar y seguir*: +3 de Vida.
- **El dado de dos caras.** Sobre una losa hay un dado de hueso: tres caras blancas, tres negras. Solo se puede tirar una vez.
  - *Tirarlo*: Blanca: 2 formaciones suben 1 nivel. Negra: +10 de oro y +1 de Ataque en el próximo asalto.
  - *Dejarlo quieto*: +2 de Vida.

### Trono infinito, semillas y Reinados

- Después del asalto 5 puedes seguir al **Trono infinito**: asaltos sin final, de cuatro tronos y siempre con monarca, cada uno un 45 % más resistente que el anterior (el primero, ×7).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Reinados**: hay 8. Ganar una campaña abre el Reinado siguiente; cada uno añade **un giro** a todos los anteriores y sube un 25 % el cobro de la conjura (sin contar lo que cae a la mesa).

| Reinado | Nombre | Giro |
|---|---|---|
| 1 | Reinado de paz | Las reglas de siempre. |
| 2 | Corazas finas | Todos los guardias tienen un 10 % más de Vida. |
| 3 | Corte airada | Cada Mazo agotado sube la Furia 1 más. |
| 4 | Reyes acorazados | En los asaltos con monarca, los Reyes tienen un 28 % más de Vida. |
| 5 | Rey colérico | El Ataque de los Reyes sube 1. |
| 6 | Heridas viejas | Tu Vida máxima baja 2. |
| 7 | Guardia de noche | El Ataque de las Sotas y los Caballos sube 1. |
| 8 | Puertas selladas | Solo en el asalto 5, el Ataque de los cuatro tronos sube 1. |

- **Sellos de maestría**: al ganar, la baraja usada y cada reliquia que llevabas quedan marcadas en la colección con el Reinado más alto que has ganado con ellas: sello de **bronce** (Reinados 1–3), de **hierro** (4–6) o de **oro** (7–8).
- **Reinicio rápido**: mantén pulsada la **R** (o Select en el mando) 0,7 segundos para volver a empezar la campaña con la misma baraja y el mismo Reinado. La que dejas no cuenta como derrota ni da esquirlas.

## Reliquias

Llevas hasta **6 reliquias**. **No se ordenan**: cada una nueva va al final de la tira y ninguna depende de su hueco. En la cuenta primero se suma todo y al final se multiplica. Hay 52: 28 en el surtido de salida y 24 más en los arcones del Altar.

### Rasgos de build

Cada Reliquia es de uno de **cinco rasgos**. Con **2, 4 y 6** Reliquias del mismo rasgo se encienden sus bonos (se suman a los de las Reliquias). La píldora de la mesa lleva la cuenta y La Pulpería marca lo que te acerca al siguiente.

| Rasgo | Lema | Con 2 | Con 4 | Con 6 |
|---|---|---|---|---|
| **Sangre** | Pacto de sangre | Cada guardia abatido te cura 1 de Vida. | +1 de Multi por cada 4 de Vida que te falten. | ×2 de Multi con la Vida a la mitad o menos. |
| **Tahúr** | Azar y dados | Dado del Tahúr: cada turno da de +1 a +3 de Multi. | El dado da de +1 a +6 de Multi. Con un 6, +3 de oro al golpear. | Con un 5 o un 6, el dado da además ×2 de Multi. |
| **Verdugo** | Ejecución | Ejecuta: el enemigo que quede con 15 % de Vida o menos, cae. | Ejecuta con 25 % o menos. Tras ejecutar, +20 de Daño al próximo golpe. | Toda ejecución cuenta como Golpe exacto. |
| **Bastión** | Muralla de hierro | Empiezas cada asalto con 4 de Escudo. | +3 de Daño por cada punto de Escudo. | +6 de Daño por cada punto de Escudo, y su tope sube 4. |
| **Horda** | Cascada de naipes | +1 de Multi si juegas 3 cartas o más. | La primera carta del golpe se activa otra vez. | Todas las cartas del golpe se activan otra vez. |

### Sangre

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Cáliz de Copas | Común | +D suma Daño | +3 de Daño por cada carta de Copas que juegues. | de salida |
| Bálsamo | Común | • pasiva | Cada carta de Copas cura +1 más. | de salida |
| Yelmo | Común | • pasiva | Cada guardia abatido: +1 de Vida. | de salida |
| Gota de veneno | Noble | • pasiva | Ningún trono es Inmune: contra el trono de su palo, tus cartas hacen su Daño. | de salida |
| Péndulo | Común | • pasiva | Cada Golpe exacto: +4 de Vida. | de salida |
| Vela gastada | Rara | +D suma Daño | +1 de Daño por cada punto de Vida que te falte. | de salida |
| Rosa de espinas | Rara | • pasiva | Cuando un Contraataque te quita Vida, el trono que atacó recibe 8. | arcón del Altar |
| Antorcha | Rara | • pasiva | Cada Motín (Comodín): +3 de oro y robas 2 cartas. | arcón del Altar |
| Último aliento | Noble | ×M multiplica | ×2 de Multi si tu Vida está al 50 % o menos. | arcón del Altar |
| Corazón de piedra | Regia | ×M multiplica | ×2 de Multi. Si el golpe no abate a ningún guardia, pierdes 1 de Vida. | arcón del Altar |

### Tahúr

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Anillo de Oros | Común | +D suma Daño | +3 de Daño por cada carta de Oros que juegues. | de salida |
| Bolsa de monedas | Común | • pasiva | +4 de oro al terminar cada asalto. | de salida |
| Dados cargados | Rara | +M suma Multi | +1 de Multi con doble par o full. | de salida |
| Máscara de traidor | Regia | • pasiva | Inmune se invierte: contra el trono de su palo, tus cartas hacen el doble de Daño. | de salida |
| Ganzúa | Común | • pasiva | Cada Golpe exacto: +2 de oro. | arcón del Altar |
| Espejo de mano | Rara | ⇉ copia | Copia tu última reliquia que no sea pasiva. | arcón del Altar |
| Prisma | Rara | +M suma Multi | +1 de Multi por cada carta del golpe que comparta palo con otra (hasta +2). | de salida |
| Vitral | Rara | +D suma Daño | +10 de Daño si el golpe mezcla 3 palos o más. | arcón del Altar |
| Caldero | Noble | • pasiva | Expuesto hace ×3 de Daño en vez de ×2, y los golpes de 3 palos también dejan Expuesto. | arcón del Altar |
| Piedra filosofal | Regia | +M suma Multi | +1 de Multi por cada trono Expuesto o Aturdido. | arcón del Altar |
| Fuelle | Común | • pasiva | +3 de oro cada vez que arde una carta en un asalto (Brasero, Cristal maldito). | arcón del Altar |

### Verdugo

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Daga de Espadas | Común | +D suma Daño | +3 de Daño por cada carta de Espadas que juegues. | de salida |
| Estilete | Común | +D suma Daño | +14 de Daño si juegas una carta sola. | de salida |
| Lanza | Rara | • pasiva | Todos tus golpes Perforan, lleven o no Espadas. | de salida |
| Llave maestra | Regia | ×M multiplica | ×2 de Multi en el primer golpe contra cada guardia. | arcón del Altar |
| Balanza | Rara | • pasiva | El Golpe exacto admite un margen de ±1. | de salida |
| Compás | Rara | +D suma Daño | Gana +2 de Daño para siempre con cada Golpe exacto. | arcón del Altar |
| Tijeras de sastre | Noble | • pasiva | Tras un Golpe exacto, el guardia siguiente pierde la mitad de su Vida. | arcón del Altar |
| Brasero | Rara | • pasiva | Al descartar, la primera carta arde: sale de tu Mazo para siempre. | de salida |
| Urna de cenizas | Rara | +D suma Daño | +2 de Daño por cada carta quemada en la campaña. | de salida |
| Cetro de ceniza | Noble | ×M multiplica | ×2 de Multi si en la campaña ya ardieron 5 cartas o más. | arcón del Altar |

### Bastión

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Maza de Bastos | Común | +D suma Daño | +3 de Daño por cada carta de Bastos que juegues. | de salida |
| Pavés | Común | • pasiva | Cada carta de Bastos da +1 de Escudo más, y el tope del Escudo sube +4. | de salida |
| Broquel | Común | • pasiva | Cada guardia abatido: +2 de Escudo. | de salida |
| Baraja de reserva | Común | • pasiva | 1 Mazo agotado por asalto no sube la Furia. | de salida |
| Manga doble | Noble | • pasiva | +1 hueco en La Manga: guardas dos cartas aparte de la mano. | de salida |
| Pócima de sueño | Noble | • pasiva | El Ataque de todos los guardias baja 1. | arcón del Altar |
| Ariete | Rara | +D suma Daño | +4 de Daño por cada punto de Escudo en pie. | arcón del Altar |
| Rodela de púas | Rara | • pasiva | Si el Escudo frena entero un Contraataque, su trono recibe 3 × lo frenado. Ej.: frena 4 → recibe 12. | arcón del Altar |
| Copa rebosante | Rara | • pasiva | Escudo que no cabe: cada 2 curan 1. Cura que no cabe: +3 de Daño por punto a tu próximo golpe. | arcón del Altar |
| Baluarte | Noble | +M suma Multi | +1 de Multi si tu Escudo está a la mitad de su tope o por encima. | arcón del Altar |

### Horda

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Dagas gemelas | Común | +M suma Multi | +1 de Multi con grupo, doble par, full o póker. | de salida |
| Escalinata | Común | +M suma Multi | +1 de Multi con escalera o escalera de color. | de salida |
| Estandarte | Rara | +M suma Multi | +2 de Multi con color o escalera de color. | de salida |
| Barril de pólvora | Noble | • pasiva | Cada guardia abatido: los otros tronos reciben 6. | arcón del Altar |
| Guantelete | Noble | • pasiva | +1 carta en la mano. | arcón del Altar |
| Collar roto | Rara | • pasiva | Cada carta de Oros salpica +1 más a los otros tronos. | de salida |
| Campana | Rara | +D suma Daño | Vuelve a activar la primera carta del golpe. | de salida |
| Cuerno de guerra | Noble | ×M multiplica | ×2 de Multi si juegas 4 cartas o más. | de salida |
| Tambor de guerra | Rara | • pasiva | Con grupo, doble par, full o póker, la mitad del Golpe salpica a los otros tronos. | arcón del Altar |
| Anillo de sello | Regia | • pasiva | Al empezar cada asalto, sella 1 carta de tu Mazo al azar. Los sellos se activan dos veces. | arcón del Altar |
| Cofre cerrado | Rara | • pasiva | Lo que descartas no vuelve en este asalto, y cada carta da +6 de Daño a tu próximo golpe. | arcón del Altar |

## Sellos de lacre y acabados

Una carta de baraja puede llevar un sello de lacre y un acabado a la vez.

| Sello de lacre | Efecto |
|---|---|
| Sello de pólvora | Al golpear, los tronos al lado del golpeado en la mesa reciben el valor de esta carta. |
| Sello de eco | Su Daño y el poder de su palo cuentan 2 veces. |
| Sello de oro real | +2 de oro si el golpe abate a un guardia. |
| Sello de la manga | Robas 1 carta extra al jugarla o descartarla. |

| Acabado | Efecto |
|---|---|
| Filo de plata | +6 de Daño. |
| Templado | +1 de Multi. |
| Lacre policromo | ×2 de Multi. |
| Cristal maldito | ×3 de Multi, pero 1 de cada 4 veces la carta se hace añicos. |

Las cartas que arden (de Cristal maldito que se hacen añicos, quemadas en la hoguera o fundidas) salen del Mazo para siempre; algunas reliquias (la familia del Brasero) se ceban con cada carta quemada.

## Cartas especiales

No tienen palo ni número: acompañan a cualquier golpe (hasta 2 por golpe) o se juegan solas. Las legendarias salen cuatro veces menos y hay que desbloquearlas con su logro.

| Carta | Efecto | Tipo |
|---|---|---|
| Ballesta | El golpe Perfora y suma +12 de Daño. | común |
| Martillo de guerra | La carta de mayor valor del golpe cuenta 2 veces. | común |
| El Espía | El trono que golpeas queda Aturdido. | común |
| Garfio | +4 de Daño por cada carta del golpe. | común |
| Paloma mensajera | Robas 2 cartas extra este turno. | común |
| Tregua | No hay Contraataque este turno. | común |
| Lluvia de flechas | 9 puntos a cada uno de los otros tronos. | común |
| Carterista | +3 de oro. | común |
| Rescate | Si el golpe abate a un guardia, +5 de oro. | común |
| Elixir | +5 de Vida. | común |
| Naipe trucado | Todas las cartas del golpe valen lo que la de mayor valor. | común |
| Pacto oscuro | ×2 de Multi, pero pierdes 2 de Vida. | común |
| Clarín | +1 de Multi. | común |
| Puerta atrancada | +5 de Escudo. | común |
| Cota de malla | +2 de Escudo por cada carta del golpe. | común |
| Embestida | +4 de Daño, y +3 más por cada punto de Escudo en pie. | común |
| Pasadizo | Este golpe no respeta Inmune: tus cartas hacen su Daño contra cualquier trono. | común |
| El Tratante | +4 de oro y robas 1 carta extra. | legendaria |
| El Rey de Dos Caras | No hay Contraataque y robas 1 carta extra. | legendaria |
| El Usurero | +6 de oro. | legendaria |
| La Dama del Cáliz | +7 de Vida. | legendaria |
| La Reina Helada | +3 de Escudo y no hay Contraataque. | legendaria |
| El Inquisidor | ×2 de Multi. | legendaria |
| El Verdugo | +14 de Daño y el golpe Perfora. | legendaria |
| El Relojero | 14 puntos a cada uno de los otros tronos. | legendaria |

## Barajas iniciales

| Baraja | Cómo cambia la campaña | Se desbloquea con |
|---|---|---|
| Baraja de la conjura | La española de siempre: 36 cartas del 1 al 9, 2 Comodines y un Sobre lacrado de 3 especiales. | — |
| Baraja negra | Solo Espadas y Bastos, dobles: sin Cura ni Salpica. Gota de veneno, Pavés y +6 de Vida (+Baluarte con su arcón). | Adiós, carcelero |
| Baraja del prestamista | +7 de oro inicial y el interés rinde el doble, pero tienes 1 de Vida menos. | Medio castillo |
| Baraja de ases | Ocho ases y ningún 2: más Ases cómplices y más pegada, pero tienes 2 de Vida menos. | Fin del reinado |
| Baraja corta | Sin doses ni treses: golpes gordos, el Mazo se agota antes y tienes 4 de Vida menos. +3 de oro inicial. | De un solo golpe |
| Baraja del caos | Un solo Comodín, pero el Sobre lacrado inicial trae 6 cartas especiales. | Coleccionista |

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

Las esquirlas se gastan en el Altar, que crece desde su raíz, «La corona quebrada», en cuatro ramas. Un nodo pide tener antes su padre. Solo **el Arsenal** cambia la campaña de cinco asaltos; la Bolsa y los Huesos solo dan más esquirlas, y la Corona de hierro solo actúa en el Trono infinito. El surtido de salida es corto a propósito (28 reliquias); los arcones del Arsenal abren las otras 24, cada uno con su manera de jugar.

### El Arsenal

Mejoras que te ayudan a ganar.

| Nodo | Efecto | Rangos | Coste de cada rango |
|---|---|---|---|
| Bolsa de la conjura | +2 de oro inicial por rango. | 5 | 300 ✦ · 600 ✦ · 700 ✦ · 800 ✦ · 900 ✦ |
| Favor del Tratante | Un «Renovar mesa» gratis en cada Pulpería, por nivel. | 2 | 400 ✦ · 800 ✦ |
| Puesto grande | Por nivel: +1 reliquia en La Pulpería, y 2 de las que ofrece son de tu rasgo principal. | 2 | 800 ✦ · 1200 ✦ |
| Cartógrafo | Cada asalto sin monarca ofrece 3 rutas con Juramento en vez de 2. | 1 | 600 ✦ |
| Ojo del tasador | Las reliquias de La Pulpería cuestan 1 de oro menos (mínimo 1). | 3 | 200 ✦ · 300 ✦ · 400 ✦ |
| Arcón de precisión | Añade al surtido: Llave maestra, Ganzúa, Compás, Tijeras de sastre. | 1 | 400 ✦ |
| Arcón del eco | Añade al surtido: Barril de pólvora, Espejo de mano, Tambor de guerra, Anillo de sello. | 1 | 400 ✦ |
| Arcón de alquimia | Añade al surtido: Vitral, Caldero, Piedra filosofal. | 1 | 400 ✦ |
| Arcón del filo | Añade al surtido: Pócima de sueño, Rosa de espinas, Antorcha, Último aliento, Corazón de piedra. | 1 | 400 ✦ |
| Arcón de cenizas | Añade al surtido: Fuelle, Cofre cerrado, Cetro de ceniza. | 1 | 400 ✦ |
| Arcón del escudo | Añade al surtido: Guantelete, Ariete, Rodela de púas, Copa rebosante, Baluarte. | 1 | 400 ✦ |
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
| Segundo hueso | Tiras dos Dados de la Corona y sus caras se multiplican. | 1 | 5000 ✦ |

### La Corona de hierro

Más esquirlas y más poder en el Trono infinito.

| Nodo | Efecto | Rangos | Coste de cada rango |
|---|---|---|---|
| Corona de hierro | En el Trono infinito, las esquirlas de la mesa valen ×2. | 5 | 700 ✦ · 2100 ✦ · 6300 ✦ · 19000 ✦ · 57000 ✦ |
| Pendón negro | +100 esquirlas por cada Trono infinito que superas. | 5 | 1000 ✦ · 3000 ✦ · 9000 ✦ · 27000 ✦ · 81000 ✦ |
| Sangre real | En el Trono infinito, cada cara del Dado de la Corona sube 1. | 5 | 1600 ✦ · 4800 ✦ · 14000 ✦ · 43000 ✦ · 130000 ✦ |
| Trono de huesos | En el Trono infinito tiras un Dado de la Corona más. | 1 | 30000 ✦ |
| Manga honda | En el Trono infinito, La Manga guarda 2 cartas en vez de 1. | 1 | 800 ✦ |
| Buen ojo | En el Trono infinito, Golpe exacto también si te pasas por 1 o menos. | 2 | 600 ✦ · 1200 ✦ |

### Archivo de crónicas y copia de seguridad

- El archivo guarda las **25 últimas campañas terminadas**: cómo acabaron, en qué asalto y ante qué monarca, turnos, mayor Golpe, reliquias y semilla. Desde ahí se puede **copiar la Crónica** o **rejugar la semilla** con la misma baraja y el mismo Reinado.
- En **Ajustes**, *Exportar progreso* guarda el Altar, la colección, las crónicas y los ajustes en un archivo .json, e *Importar progreso* lo recupera en otro navegador, otro equipo o la versión de escritorio.

### Logros

| Logro | Cómo | Esquirlas | Desbloquea |
|---|---|---|---|
| Primer paso | Gana tu primer asalto de campaña. | +100 ✦ | — |
| Adiós, carcelero | Supera el asalto 2. | +200 ✦ | Baraja negra |
| Medio castillo | Supera el asalto 3. | +300 ✦ | Baraja del prestamista |
| Fin del reinado | Gana una campaña. | +500 ✦ | Baraja de ases |
| Gran conspirador | Gana una campaña en el Reinado 4 o superior. | +800 ✦ | — |
| Más allá del trono | Supera un Trono infinito. | +400 ✦ | — |
| Sin fin | Supera tres Tronos infinitos en una campaña. | +800 ✦ | — |
| Dos y dos | Juega un doble par. | +100 ✦ | — |
| Todo al mismo palo | Juega un color. | +100 ✦ | — |
| Casa llena | Juega un full. | +200 ✦ | — |
| Póker | Juega un póker. | +300 ✦ | — |
| Escalera real | Juega una escalera de color de 5 cartas o más. | +300 ✦ | — |
| De un solo golpe | Haz un Golpe de 100 o más. | +200 ✦ | Baraja corta |
| Trueno | Haz un Golpe de 500 o más. | +400 ✦ | — |
| Cataclismo | Haz un Golpe de 2000 o más. | +800 ✦ | — |
| Mano firme | Da 10 Golpes exactos. | +200 ✦ | — |
| Pulso de ladrón | Da 50 Golpes exactos. | +500 ✦ | — |
| Cien guardias | Abate a 100 guardias. | +300 ✦ | — |
| Azote de la corte | Abate a 500 guardias. | +600 ✦ | — |
| Ni un rasguño | Termina un asalto con la Vida entera. | +200 ✦ | — |
| Tacaño | Junta 30 de oro a la vez. | +200 ✦ | — |
| Relicario lleno | Lleva 6 reliquias a la vez. | +300 ✦ | — |
| Lacrador | Estampa 10 sellos de lacre o acabados. | +300 ✦ | — |
| De palabra | Cumple 10 Juramentos. | +300 ✦ | — |
| Por la puerta de atrás | Salta 3 asaltos. | +200 ✦ | — |
| Coleccionista | Consigue las 17 cartas especiales comunes, entre todas tus campañas. | +500 ✦ | Baraja del caos |
| Cliente del Tratante | Lleva 30 reliquias distintas, entre todas tus campañas. | +800 ✦ | Carta legendaria: El Tratante |
| Trofeo: El Rey de Dos Caras | Vence al Rey de Dos Caras (doble contraataque). | +200 ✦ | Carta legendaria: El Rey de Dos Caras |
| Trofeo: El Usurero | Vence al Usurero (escasez). | +200 ✦ | Carta legendaria: El Usurero |
| Trofeo: La Dama del Cáliz | Vence a la Dama del Cáliz (cáliz envenenado). | +200 ✦ | Carta legendaria: La Dama del Cáliz |
| Trofeo: La Reina Helada | Vence a la Reina Helada (escarcha). | +200 ✦ | Carta legendaria: La Reina Helada |
| Trofeo: El Inquisidor | Vence al Inquisidor (guardia de hierro). | +200 ✦ | Carta legendaria: El Inquisidor |
| Trofeo: El Carnicero | Vence al Carnicero (hacha afilada). | +200 ✦ | Carta legendaria: El Verdugo |
| Trofeo: El Relojero | Vence al Relojero (arena rápida). | +200 ✦ | Carta legendaria: El Relojero |
| Ningún rey en pie | Vence a los 7 monarcas. | +800 ✦ | — |

## Palabras clave

El juego usa solo seis palabras con significado propio. Todo lo demás se dice con palabras llanas. En pantalla van en negrita y, al pasar el puntero sobre cualquier texto que las mencione, el globo de ayuda encadena su definición.

- **Daño**: Lo que suman tus cartas: su número, del 1 al 9 (el As vale 11). Contra el trono de su palo, 0: es Inmune.
- **Multi**: Lo que multiplica al Daño: Daño × Multi = Golpe. Siempre es entero. Lo pone la formación y lo suben reliquias y acabados.
- **Golpe exacto**: Abatir a un guardia con el Golpe justo: sin Contraataque, +1 de oro, robas 1, Impulso (el siguiente pierde ¼ de su Vida) y Racha (+1 de Multi al próximo golpe, hasta +3).
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

La **Lupa** abre cualquier carta, reliquia, guardia o monarca a tamaño de lámina, con la cuenta exacta de lo que aporta en ese momento. En sala, pulsar un trono cuando no es tu turno (o cualquier ruta, oferta o carta con Alt) deja una **seña** con tus iniciales para la conjura: no decide nada, solo señala.
