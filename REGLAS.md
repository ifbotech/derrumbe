# CORONA ROTA — Reglas

> Este archivo se genera con `npm run docs` a partir de los datos del motor (`src/rules`). No lo edites a mano.

*La conjura de los naipes.* Juego cooperativo para 1 a 4 jugadores con baraja francesa (52 cartas + 2 comodines).
Sois una conjura: hay que hacer caer **los cuatro tronos** de la corte antes de que su guardia acabe con **tu Vida**.
Se gana o se pierde en equipo. El Asalto único también se puede jugar en mesa con una baraja real.

## Preparación

1. Separa las 12 figuras y forma los **cuatro tronos**, una casa por palo (Casa de Picas, Casa de Diamantes…).
   Cada trono tiene 3 **guardias** en fila: la **Sota** (J) delante, que es la primera en caer, luego la **Reina** (Q) y al final el **Rey** (K).
2. Baraja las 40 cartas numerales (del As al 10) con los 2 comodines: es el **Mazo**.
   Deja sitio al lado para el **Descarte**.
3. Cada jugador roba su mano de **6** cartas.
4. La conjura empieza con **20 de Vida** y **0 de Escudo** (máximo 8).

| Guardia | Vida | Ataque |
|---|---|---|
| Sota (J) | 124 | ⚔ 3 |
| Reina (Q) | 177 | ⚔ 5 |
| Rey (K) | 231 | ⚔ 7 |

Cada palo es una casa de la corte: ♠ **PICAS**, ♦ **DIAMANTES**, ♥ **CORAZONES**, ♣ **TRÉBOLES**.

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
4. **Las cartas especiales** que acompañan al golpe (hasta 2).
5. **Tus reliquias**, hueco a hueco.

Lo que **suma** cuenta donde está. Lo que **multiplica** el Multi multiplica todo lo acumulado hasta ese momento: conviene sumar primero y multiplicar al final. El **As** vale **11** y enlaza escaleras por abajo (A-2-3) y por arriba (9-10-A).

| Formación | Cartas | Daño base | Multi | Por nivel de Pergamino |
|---|---|---|---|---|
| Carta sola | 1 carta | +0 | ×1 | +4 D · +0,15 M |
| As cómplice | un As con cualquier otra carta | +0 | ×1,1 | +3 D · +0,15 M |
| Grupo | 2 o 3 del mismo número | +2 | ×1,2 | +3 D · +0,2 M |
| Escalera | 3 o más números seguidos, de cualquier palo | +4 | ×1,3 | +3 D · +0,2 M |
| Doble par | 2 parejas | +6 | ×1,5 | +3 D · +0,2 M |
| Color | 5 o más del mismo palo | +8 | ×1,8 | +3 D · +0,2 M |
| Full | un trío y una pareja | +10 | ×2 | +3 D · +0,2 M |
| Escalera de color | 3 o más seguidas del mismo palo | +10 | ×2 | +3 D · +0,2 M |
| Póker | 4 del mismo número | +14 | ×2,5 | +3 D · +0,2 M |

### La rueda de palos

| Trono | Daño doble (×2) | Sin Daño (×0, Inmune) |
|---|---|---|
| ♠ PICAS | ♣ tréboles | ♠ picas |
| ♦ DIAMANTES | ♠ picas | ♦ diamantes |
| ♥ CORAZONES | ♦ diamantes | ♥ corazones |
| ♣ TRÉBOLES | ♥ corazones | ♣ tréboles |

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
- cobras **1 de oro** y **robas 1 carta** de más,
- el guardia siguiente pierde **un cuarto de su Vida** (el **Impulso** del golpe),
- y empiezas una **Racha**: tu próximo golpe lleva +0,5 de Multi por cada Golpe exacto seguido (hasta +2). La Racha se corta si el golpe no es exacto.

La mesa te lo avisa antes de golpear: la previsualización de cada trono dice si el golpe sería exacto.

### Estados de los tronos

- **Brecha**: la deja un golpe de un solo palo (2 o más cartas, todas del mismo palo). El próximo golpe contra este trono hace ×1,5 de Multi.
- **Desarmado ×1**: lo deja un golpe que mezcla 3 palos o más. Este trono se salta su próximo Contraataque.
- **En guardia**: lo traen algunos monarcas y Reinados. ×0,5 de Multi en el primer golpe contra este guardia.

### Reglas especiales

- **Comodín · Motín**: se juega solo sobre un trono. Su guardia de delante queda **Desarmado** (no ataca hasta que caiga) y no hay Contraataque. El comodín no vuelve en este asalto.
- **Asedio final**: ningún asalto dura para siempre. En campaña, desde el turno 9 de cada asalto y cada 2 turnos, el asedio sube un nivel; cada nivel da **+0,25 de Multi** a todos los golpes y **+1 de Ataque** a los cuatro tronos. El asalto se acelera en los dos sentidos: pegas más y te pegan más. La mesa avisa tres turnos antes. En conjura de varios empieza más tarde, en proporción a lo que aguantan los guardias; en el Asalto único, en el turno 33 y cada 3 turnos.
- **Mazo agotado**: si el Mazo se acaba, el Descarte se baraja y vuelve a ser Mazo, pero pierdes **5** de Vida (el Escudo no lo frena). Cada vuelta completa de la conjura al Mazo lo encarece en 1: los asaltos no se pueden estirar sin fin.
- **As cómplice**: un As forma jugada con **cualquier otra carta** (×1,1 de Multi) y aporta el poder de su palo. Es la manera de colar un poder en un golpe: un As de ♣ para levantar Escudo, uno de ♥ para curar, uno de ♠ para perforar.
- **La Manga**: junto a la mano hay un hueco aparte. Una vez por turno, y sin gastar el turno, puedes guardarte en la manga una carta de tu mano: no cuenta para el tamaño de la mano (robas hasta completarla igual) y se juega desde ahí como si estuviera en ella. Si el hueco está ocupado, la carta guardada vuelve a la mano. La reliquia *Manga doble* añade un segundo hueco. En la partida guiada no hay Manga.
- **Rebobinar** (↩ Deshacer; solo en campaña en solitario): una vez por asalto puedes **deshacer tu última jugada**. La mesa vuelve a como estaba y el Mazo se baraja de nuevo, así que lo que viste salir ya no vale. Usar la Manga no gasta el rebobinado. En sala no se rebobina: toda jugada es definitiva, y la mesa lo indica.
- Las cartas de baraja nunca bajan de 12 en el Mazo: lo que las quema deja de hacerlo al llegar a ese mínimo.
- **Victoria** (*Corona rota*): los cuatro tronos caídos. **Derrota** (*Conjura deshecha*): tu Vida llega a 0.
- Modo **BRUTAL** (Asalto único): 16 de Vida y el Mazo agotado quita 6.
- **Asalto único en conjura de varios**: lo que quita el Mazo agotado se ajusta a cuántos jugáis, porque con más manos el Mazo se acaba antes: 5 con 1, 6 con 2, 5 con 3, 4 con 4.

## Campaña

Un roguelike de construcción de mazo: **8 asaltos** cada vez más duros, una sala del castillo cada uno, 4 de ellos con **monarca**. Empiezas con un Sobre lacrado de 3 cartas especiales y 4 de oro; entre asalto y asalto mejoras el Mazo y tus reliquias. La Vida base de los guardias es 20 / 30 / 40 y cada asalto la multiplica.

| Asalto | Sala | Guardias por trono | Vida | Ataque | Monarca |
|---|---|---|---|---|---|
| 1 | El Puente levadizo | Sota | ×3,93 | +2 | — |
| 2 | El Patio de armas | Sota, Reina | ×2,8 | +3 | — |
| 3 | La Armería | Sota, Reina | ×3,35 | +4 | sí |
| 4 | Las Cocinas | Sota, Reina, Rey | ×4,05 | +5 | — |
| 5 | La Capilla | Sota, Reina, Rey | ×4,5 | +5 | sí |
| 6 | La Biblioteca | Sota, Reina, Rey | ×5 | +6 | — |
| 7 | La Galería de espejos | Sota, Reina, Rey | ×5,3 | +5 | sí |
| 8 | El Salón del Trono | Sota, Reina, Rey | ×6,25 | +6 | sí |

En conjura de 2 a 4 jugadores los guardias aguantan un 30 % más.

### El Mapa del castillo

El Mapa enseña **desde el principio** qué monarca espera en cada asalto y cuál es su decreto. En los asaltos sin monarca eliges:

- una **ruta** (dos a elegir; tres con el Cartógrafo de la Orden), cada una con su **Juramento**;
- o el **Atajo**: te saltas el asalto (sin Botín, sin selección y sin Mercado clandestino) a cambio de un **Atajo de conspirador**.

**Juramentos.** Los normales piden una condición y pagan si la cumples; los de **riesgo** endurecen el asalto y pagan siempre que lo ganes.

| Juramento | Condición | Premio | Tipo |
|---|---|---|---|
| Piel intacta | Termina el asalto sin perder Vida. | +8 de oro | condición |
| Pulso firme | Da 3 Golpes exactos. | Un sello de lacre al azar | condición |
| Al galope | Gana el asalto en 3 turnos + 4 por guardia de cada trono, o menos (3 guardias: 15). | +6 de oro | condición |
| Mazo medido | Termina sin que se agote el Mazo. | +5 de oro | condición |
| Sin motines | No juegues ningún Comodín. | Un acabado al azar | condición |
| Jugada maestra | Juega un color, un full, un póker o una escalera de color. | Un Pergamino al azar | condición |
| Noche larga | El Ataque de los cuatro tronos sube 1. | +10 de oro | riesgo |
| Sin escudo | El Escudo no puede pasar de 2. | Una reliquia Rara o mejor | riesgo |
| Conjura corta | Jugáis con 1 carta menos en la mano. | +12 de oro | riesgo |

**Atajos de conspirador** (uno al azar por cada asalto con Atajo):

| Atajo | Efecto |
|---|---|
| Llave del mercado | En el próximo Mercado clandestino, reliquias, sobres y Mesa de lacre son gratis. |
| Contrabando | Recibes ya una reliquia Noble o Regia. |
| Molde de cera | Duplicas la carta de tu Mazo que elijas. |
| Botín escondido | +15 de oro. |
| Lacre doble | Dos cartas al azar de tu Mazo reciben un sello de lacre. |

**Monarcas** (7; cada campaña sortea 4). Cada uno impone un **decreto**. Al caer dejan botín: una de dos reliquias Raras o mejores.

| Monarca | Decreto | Efecto |
|---|---|---|
| El Rey de Dos Caras | Doble Contraataque | Hay 2 Contraataques cada turno, pero cada uno ataca un 40 % menos. |
| El Usurero | Escasez | Jugáis con 1 carta menos en la mano. |
| La Dama del Cáliz | Cáliz envenenado | Tus ♥ no curan. |
| La Reina Helada | Escarcha | El Escudo no puede pasar de 4. |
| El Inquisidor | Guardia de hierro | Todos los guardias llegan En guardia y, mientras lo estén, su Ataque sube 1. |
| El Verdugo | Furia | El Ataque de los cuatro tronos sube 2. |
| El Relojero | Arena rápida | El Asedio final empieza 3 turnos antes, y cada guardia abatido sin Golpe exacto te quita 1 de Vida. |

### El Botín

Tras cada asalto cobras oro (asalto ganado, Golpes exactos, la Vida que te queda e interés de 1 por cada 5 de oro guardado), recuperas 4 de Vida y eliges **una de tres opciones a la vista** —dos cartas especiales y una carta de baraja ya marcada con un sello de lacre o un acabado— o pasas a cambio de 3 de oro.

### El Mercado clandestino

Lo atiende el Tratante.

- **Reliquias** (su precio depende de la rareza: común ~5, rara ~8, noble ~11, regia ~15). Se pueden vender por la mitad.
- **Sobre lacrado**: lo abres ahí mismo y te quedas con 1 de 3.
- **Sobre a ciegas**: una especial sin verla, más barata.
- **Mesa de lacre**: pone el sello de lacre o el acabado en oferta sobre la carta de tu Mazo que elijas.
- **Pergamino**: sube de nivel una formación.
- **Curar** (+6 de Vida), **La hoguera** (quema una carta; el Mazo no baja de 12) y **Renovar mesa** (cambia lo que hay en oferta), los tres con coste creciente.

### Secretos de la cripta

Tras los monarcas de los asaltos 3, 5, 7 aparece un dilema. Cada campaña ve 3 de estos 5:

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

### Trono infinito, semillas y Reinados

- Después del asalto 8 puedes seguir al **Trono infinito**: asaltos sin final, siempre con monarca, cada uno un 45 % más resistente que el anterior (el primero, ×9,1).
- **Semilla**: la misma semilla y las mismas decisiones dan exactamente la misma campaña. Puedes escribir la tuya al empezar.
- **Asalto diario**: usa la fecha como semilla, con la baraja de la conjura, en el Reinado 1 y sin nada de la Orden. Igual para todo el mundo.
- **Reinados**: hay 8. Ganar una campaña abre el Reinado siguiente; cada uno añade **un giro** a todos los anteriores y da un 25 % más de Coronas.

| Reinado | Nombre | Giro |
|---|---|---|
| 1 | Reinado de paz | Las reglas de siempre. |
| 2 | Corazas finas | Todos los guardias tienen un 5 % más de Vida. |
| 3 | Impuesto real | Todo en el Mercado clandestino cuesta 2 de oro más. |
| 4 | Reyes en guardia | En los asaltos con monarca, los Reyes llegan En guardia. |
| 5 | Rey colérico | El Ataque de los Reyes sube 1. |
| 6 | Heridas viejas | Tienes 1 punto menos de Vida. |
| 7 | Guardia de noche | El Ataque de las Sotas y las Reinas sube 1. |
| 8 | Puertas selladas | Solo en el asalto 8, el Ataque de los cuatro tronos sube 1. |

- **Sellos de maestría**: al ganar, la baraja usada y cada reliquia que llevabas quedan marcadas en la colección con el Reinado más alto que has ganado con ellas: sello de **bronce** (Reinados 1–3), de **hierro** (4–6) o de **oro** (7–8).
- **Reinicio rápido**: mantén pulsada la **R** (o Select en el mando) 0,7 segundos para volver a empezar la campaña con la misma baraja y el mismo Reinado. La que dejas no cuenta como derrota ni da Coronas.

## Reliquias

Llevas hasta **6 reliquias**, y se activan **de izquierda a derecha**. Puedes reordenarlas cuando quieras —arrastrando, o pulsando una y luego su hueco de destino—, incluso en pleno asalto. Hay 52: 28 en el surtido de salida y 24 más en los arcones de la Orden.

### El Arsenal

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Daga de Picas | Común | +D suma Daño | +3 de Daño por cada ♠ que juegues. | de salida |
| Anillo de Diamantes | Común | +D suma Daño | +3 de Daño por cada ♦ que juegues. | de salida |
| Cáliz de Corazones | Común | +D suma Daño | +3 de Daño por cada ♥ que juegues. | de salida |
| Maza de Tréboles | Común | +D suma Daño | +3 de Daño por cada ♣ que juegues. | de salida |
| Estilete | Común | +D suma Daño | +8 de Daño si juegas una carta sola. | de salida |
| Dagas gemelas | Común | +M suma Multi | +0,5 de Multi con grupo, doble par, full o póker. | de salida |
| Escalinata | Común | +M suma Multi | +0,7 de Multi con escalera o escalera de color. | de salida |
| Pavés | Común | • pasiva | El Escudo sube la mitad de tus ♣ en vez de un tercio, y su tope crece +4. | de salida |
| Bálsamo | Común | • pasiva | Curas la mitad de tus ♥ en vez de un tercio. | de salida |
| Broquel | Común | • pasiva | Cada guardia abatido: +2 de Escudo. | de salida |
| Yelmo | Común | • pasiva | Cada guardia abatido: +1 de Vida. | de salida |
| Baraja de reserva | Común | • pasiva | Cuando se agota el Mazo, pierdes 3 de Vida menos. | de salida |
| Bolsa de monedas | Común | • pasiva | +4 de oro al terminar cada asalto. | de salida |
| Lanza | Rara | • pasiva | Todos tus golpes Perforan, lleven o no ♠. | de salida |
| Estandarte | Rara | +M suma Multi | +1,5 de Multi con color o escalera de color. | de salida |
| Dados cargados | Rara | +M suma Multi | +1 de Multi con doble par o full. | de salida |
| Barril de pólvora | Noble | • pasiva | La ventaja de palo multiplica ×3 en vez de ×2. | arcón de la Orden |
| Gota de veneno | Noble | • pasiva | Ningún trono es Inmune: tus cartas pegan ×1 contra el trono de su palo. | de salida |
| Guantelete | Noble | • pasiva | +1 carta en la mano. | arcón de la Orden |
| Manga doble | Noble | • pasiva | +1 hueco en La Manga: guardas dos cartas aparte de la mano. | de salida |
| Máscara de traidor | Regia | • pasiva | Inmune se invierte: las cartas del palo del trono pegan con ventaja contra él. | de salida |
| Pócima de sueño | Noble | • pasiva | El Ataque de todos los guardias baja 1. | arcón de la Orden |
| Llave maestra | Regia | ×M multiplica | ×2 de Multi en el primer golpe contra cada guardia. | arcón de la Orden |

### Mano precisa

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Péndulo | Común | • pasiva | Cada Golpe exacto: +4 de Vida. | de salida |
| Balanza | Rara | • pasiva | El Golpe exacto admite un margen de ±1. | de salida |
| Ganzúa | Común | • pasiva | Cada Golpe exacto: +2 de oro. | arcón de la Orden |
| Compás | Rara | +M suma Multi | Gana +0,15 de Multi para siempre con cada Golpe exacto. | arcón de la Orden |
| Tijeras de sastre | Noble | • pasiva | Tras un Golpe exacto, el guardia siguiente pierde la mitad de su Vida. | arcón de la Orden |

### Eco y repetición

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Collar roto | Rara | • pasiva | Salpica hace la mitad de tus ♦ en vez de un tercio. | de salida |
| Campana | Rara | +D suma Daño | Vuelve a activar la primera carta del golpe. | de salida |
| Cuerno de guerra | Noble | ×M multiplica | ×1,5 de Multi si juegas 4 cartas o más. | de salida |
| Espejo de mano | Rara | ⇉ copia | Copia la reliquia que tenga a su derecha. | arcón de la Orden |
| Tambor de guerra | Rara | • pasiva | Con grupo, doble par, full o póker, la mitad del Golpe salpica a los otros tronos. | arcón de la Orden |
| Anillo de sello | Regia | • pasiva | Al empezar cada asalto, sella 1 carta de tu Mazo al azar. Los sellos se activan dos veces. | arcón de la Orden |

### Alquimia de palos

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Prisma | Rara | +M suma Multi | +0,5 de Multi por cada carta del golpe que comparta palo con otra (hasta +2). | de salida |
| Vitral | Rara | +D suma Daño | +10 de Daño si el golpe mezcla 3 palos o más. | arcón de la Orden |
| Caldero | Noble | • pasiva | La Brecha multiplica ×2, y los golpes de 3 palos también dejan Brecha. | arcón de la Orden |
| Piedra filosofal | Regia | ×M multiplica | ×1,5 de Multi por cada trono con Brecha, En guardia o Desarmado ×1 (se suman). | arcón de la Orden |

### Vida al filo

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Vela gastada | Rara | +M suma Multi | +0,1 de Multi por cada punto de Vida que te falte. | de salida |
| Rosa de espinas | Rara | • pasiva | Cuando un Contraataque te quita Vida, el trono que atacó recibe 8. | arcón de la Orden |
| Antorcha | Rara | • pasiva | Cada Motín (Comodín): +3 de oro y robas 2 cartas. | arcón de la Orden |
| Último aliento | Noble | ×M multiplica | ×2 de Multi si tu Vida está al 50 % o menos. | arcón de la Orden |
| Corazón de piedra | Regia | ×M multiplica | ×2 de Multi. Si el golpe no abate a ningún guardia, pierdes 1 de Vida. | arcón de la Orden |

### Fuego y ceniza

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Brasero | Rara | • pasiva | Al descartar, la primera carta arde: sale de tu Mazo para siempre. | de salida |
| Urna de cenizas | Rara | +D suma Daño | +2 de Daño por cada carta quemada en la campaña. | de salida |
| Fuelle | Común | • pasiva | +3 de oro cada vez que arde una carta en un asalto (Brasero, Cristal maldito). | arcón de la Orden |
| Cofre cerrado | Rara | • pasiva | Lo que descartas no vuelve en este asalto, y cada carta da +6 de Daño a tu próximo golpe. | arcón de la Orden |
| Cetro de ceniza | Noble | ×M multiplica | ×1,05 de Multi por cada carta quemada en la campaña (se suman: 4 cartas, ×1,2). | arcón de la Orden |

### Escudo y réplica

| Reliquia | Rareza | Tipo | Efecto | Surtido |
|---|---|---|---|---|
| Ariete | Rara | +D suma Daño | +4 de Daño por cada punto de Escudo en pie. | arcón de la Orden |
| Rodela de púas | Rara | • pasiva | Si el Escudo frena entero un Contraataque, su trono recibe 3 × lo frenado. Ej.: frena 4 → recibe 12. | arcón de la Orden |
| Copa rebosante | Rara | • pasiva | Escudo que no cabe: cada 2 curan 1. Cura que no cabe: +3 de Daño por punto a tu próximo golpe. | arcón de la Orden |
| Baluarte | Noble | ×M multiplica | ×1,5 de Multi con el Escudo al 50 % de su tope o más. | arcón de la Orden |

## Sellos de lacre y acabados

Una carta de baraja puede llevar un sello de lacre y un acabado a la vez.

| Sello de lacre | Efecto |
|---|---|
| Sello de pólvora | Al golpear, los tronos vecinos (orden ♠ ♦ ♥ ♣) reciben el valor de esta carta. |
| Sello de eco | Su Daño y el poder de su palo cuentan 2 veces. |
| Sello de oro real | +2 de oro si el golpe abate a un guardia. |
| Sello de la manga | Robas 1 carta extra al jugarla o descartarla. |

| Acabado | Efecto |
|---|---|
| Filo de plata | +6 de Daño. |
| Templado | +0,3 de Multi. |
| Lacre policromo | ×1,5 de Multi. |
| Cristal maldito | ×2,5 de Multi, pero 1 de cada 4 veces la carta se hace añicos. |

Las cartas que arden (de Cristal maldito que se hacen añicos, quemadas en la hoguera o fundidas) salen del Mazo para siempre; algunas reliquias (la familia del Brasero) se ceban con cada carta quemada.

## Cartas especiales

No tienen palo ni número: acompañan a cualquier golpe (hasta 2 por golpe) o se juegan solas. Las legendarias salen cuatro veces menos y hay que desbloquearlas con su logro.

| Carta | Efecto | Tipo |
|---|---|---|
| Ballesta | El golpe Perfora y suma +12 de Daño. | común |
| Martillo de guerra | La carta de mayor valor del golpe cuenta 2 veces. | común |
| El Espía | Desarma al guardia que golpeas. | común |
| Garfio | +4 de Daño por cada carta del golpe. | común |
| Paloma mensajera | Robas 2 cartas extra este turno. | común |
| Tregua | No hay Contraataque este turno. | común |
| Lluvia de flechas | 9 puntos a cada uno de los otros tronos. | común |
| Carterista | +3 de oro. | común |
| Rescate | Si el golpe abate a un guardia, +5 de oro. | común |
| Elixir | +5 de Vida. | común |
| Naipe trucado | Todas las cartas del golpe valen lo que la de mayor valor. | común |
| Pacto oscuro | ×2 de Multi, pero pierdes 2 de Vida. | común |
| Clarín | ×1,5 de Multi. | común |
| Puerta atrancada | +5 de Escudo. | común |
| Cota de malla | +2 de Escudo por cada carta del golpe. | común |
| Embestida | +4 de Daño, y +3 más por cada punto de Escudo en pie. | común |
| Pasadizo | Todo el golpe pega con ventaja, sea cual sea el trono. | común |
| El Tratante | +4 de oro y robas 1 carta extra. | legendaria |
| El Rey de Dos Caras | No hay Contraataque y robas 1 carta extra. | legendaria |
| El Usurero | +6 de oro. | legendaria |
| La Dama del Cáliz | +7 de Vida. | legendaria |
| La Reina Helada | +3 de Escudo y no hay Contraataque. | legendaria |
| El Inquisidor | ×1,75 de Multi. | legendaria |
| El Verdugo | +14 de Daño y el golpe Perfora. | legendaria |
| El Relojero | 14 puntos a cada uno de los otros tronos. | legendaria |

## Barajas iniciales

| Baraja | Cómo cambia la campaña | Se desbloquea con |
|---|---|---|
| Baraja de la conjura | La de siempre: 40 cartas, 2 Comodines y un Sobre lacrado de 3 especiales. | — |
| Baraja negra | Solo ♠ y ♣, dobles: sin Cura ni Salpica. Gota de veneno, Pavés y +5 de Vida (+Baluarte con su arcón). | Adiós, carcelero |
| Baraja del prestamista | +12 de oro inicial y el interés rinde el doble, pero tienes 1 de Vida menos. | Medio castillo |
| Baraja de ases | Ocho ases y ningún 2: más Ases cómplices y más pegada, pero tienes 4 de Vida menos. | Fin del reinado |
| Baraja corta | Sin doses ni treses: golpes gordos, el Mazo se agota antes y tienes 6 de Vida menos. +3 de oro inicial. | De un solo golpe |
| Baraja del caos | Un solo Comodín, pero el Sobre lacrado inicial trae 5 cartas especiales. | Coleccionista |

## La Orden

Ganes o pierdas, cada campaña deja **Coronas**. En la Orden se gastan en **abrir arcones**, no en subir números. El surtido de salida es corto a propósito (28 reliquias); los arcones abren las otras 24, cada uno con su manera de jugar:

| Mejora | Efecto | Coste |
|---|---|---|
| Arcón de precisión | Añade al surtido: Llave maestra, Ganzúa, Compás, Tijeras de sastre. | 4 ✦ |
| Arcón del eco | Añade al surtido: Barril de pólvora, Espejo de mano, Tambor de guerra, Anillo de sello. | 4 ✦ |
| Arcón de alquimia | Añade al surtido: Vitral, Caldero, Piedra filosofal. | 4 ✦ |
| Arcón del filo | Añade al surtido: Pócima de sueño, Rosa de espinas, Antorcha, Último aliento, Corazón de piedra. | 4 ✦ |
| Arcón de cenizas | Añade al surtido: Fuelle, Cofre cerrado, Cetro de ceniza. | 4 ✦ |
| Arcón del escudo | Añade al surtido: Guantelete, Ariete, Rodela de púas, Copa rebosante, Baluarte. | 4 ✦ |
| Lacres nuevos | La Mesa de lacre también ofrece los sellos de pólvora y de la manga. | 5 ✦ |
| Cristalero real | La Mesa de lacre también ofrece Lacre policromo y Cristal maldito. | 6 ✦ |
| Favor del Tratante | Un «Renovar mesa» gratis en cada Mercado clandestino, por nivel. | 4 ✦ · 8 ✦ |
| Puesto grande | +1 reliquia en oferta en cada Mercado clandestino, por nivel. | 8 ✦ · 12 ✦ |
| Bolsa de la Orden | +2 de oro inicial por nivel. | 3 ✦ · 6 ✦ |
| Cartógrafo | Cada asalto sin monarca ofrece 3 rutas con Juramento en vez de 2. | 6 ✦ |

### Archivo de crónicas y copia de seguridad

- La Orden guarda las **25 últimas campañas terminadas**: cómo acabaron, en qué asalto y ante qué monarca, turnos, mayor Golpe, reliquias y semilla. Desde ahí se puede **copiar la Crónica** o **rejugar la semilla** con la misma baraja y el mismo Reinado.
- En **Ajustes**, *Exportar progreso* guarda la Orden, la colección, las crónicas y los ajustes en un archivo .json, e *Importar progreso* lo recupera en otro navegador, otro equipo o la versión de escritorio.

### Logros

| Logro | Cómo | Coronas | Desbloquea |
|---|---|---|---|
| Primer paso | Gana tu primer asalto de campaña. | +1 | — |
| Adiós, carcelero | Supera el asalto 3. | +2 | Baraja negra |
| Medio castillo | Supera el asalto 5. | +3 | Baraja del prestamista |
| Fin del reinado | Gana una campaña. | +5 | Baraja de ases |
| Gran conspirador | Gana una campaña en el Reinado 4 o superior. | +8 | — |
| Más allá del trono | Supera un Trono infinito. | +4 | — |
| Sin fin | Supera tres Tronos infinitos en una campaña. | +8 | — |
| Ronda diaria | Termina un Asalto diario. | +2 | — |
| Dos y dos | Juega un doble par. | +1 | — |
| Todo al mismo palo | Juega un color. | +1 | — |
| Casa llena | Juega un full. | +2 | — |
| Póker | Juega un póker. | +3 | — |
| Escalera real | Juega una escalera de color de 5 cartas o más. | +3 | — |
| De un solo golpe | Haz un Golpe de 100 o más. | +2 | Baraja corta |
| Trueno | Haz un Golpe de 500 o más. | +4 | — |
| Cataclismo | Haz un Golpe de 2000 o más. | +8 | — |
| Mano firme | Da 10 Golpes exactos. | +2 | — |
| Pulso de ladrón | Da 50 Golpes exactos. | +5 | — |
| Cien guardias | Abate a 100 guardias. | +3 | — |
| Azote de la corte | Abate a 500 guardias. | +6 | — |
| Ni un rasguño | Termina un asalto con la Vida entera. | +2 | — |
| Tacaño | Junta 30 de oro a la vez. | +2 | — |
| Relicario lleno | Lleva 6 reliquias a la vez. | +3 | — |
| Lacrador | Estampa 10 sellos de lacre o acabados. | +3 | — |
| De palabra | Cumple 10 Juramentos. | +3 | — |
| Por la puerta de atrás | Salta 3 asaltos. | +2 | — |
| Coleccionista | Consigue las 17 cartas especiales comunes, entre todas tus campañas. | +5 | Baraja del caos |
| Cliente del Tratante | Lleva 30 reliquias distintas, entre todas tus campañas. | +8 | Carta legendaria: El Tratante |
| Trofeo: El Rey de Dos Caras | Vence al Rey de Dos Caras (doble contraataque). | +2 | Carta legendaria: El Rey de Dos Caras |
| Trofeo: El Usurero | Vence al Usurero (escasez). | +2 | Carta legendaria: El Usurero |
| Trofeo: La Dama del Cáliz | Vence a la Dama del Cáliz (cáliz envenenado). | +2 | Carta legendaria: La Dama del Cáliz |
| Trofeo: La Reina Helada | Vence a la Reina Helada (escarcha). | +2 | Carta legendaria: La Reina Helada |
| Trofeo: El Inquisidor | Vence al Inquisidor (guardia de hierro). | +2 | Carta legendaria: El Inquisidor |
| Trofeo: El Verdugo | Vence al Verdugo (furia). | +2 | Carta legendaria: El Verdugo |
| Trofeo: El Relojero | Vence al Relojero (arena rápida). | +2 | Carta legendaria: El Relojero |
| Ningún rey en pie | Vence a los 7 monarcas. | +8 | — |

## Palabras clave

El juego usa solo seis palabras con significado propio. Todo lo demás se dice con palabras llanas. En pantalla van en negrita y, al pasar el puntero sobre cualquier texto que las mencione, el globo de ayuda encadena su definición.

- **Daño**: Lo que suman tus cartas: su número, el doble con ventaja de palo y nada contra el trono de su palo (Inmune).
- **Multi**: Lo que multiplica al Daño: Daño × Multi = Golpe. Lo pone la formación; lo que suma cuenta donde está y lo que multiplica, multiplica todo lo anterior.
- **Golpe exacto**: Abatir a un guardia con el Golpe justo (igual a su Vida): sin Contraataque, +1 de oro, robas 1, Impulso (el siguiente guardia pierde ¼ de su Vida) y Racha (+0,5 de Multi al próximo golpe, hasta +2).
- **Brecha**: La deja un golpe de un solo palo (2 cartas o más). El próximo golpe contra ese trono hace ×1,5 de Multi.
- **En guardia**: El primer golpe contra ese guardia hace la mitad de Multi (×0,5). Lo traen algunos monarcas y Reinados.
- **Desarmado**: Un trono Desarmado no ataca cuando el Contraataque saca su palo. El Motín (Comodín) lo desarma hasta que caiga su guardia; un golpe de 3 palos, solo para su próximo Contraataque (×1).

## Controles

| Acción | Teclado y ratón | Mando |
|---|---|---|
| Mover el foco | Flechas | Cruceta o palanca izquierda |
| Elegir | Enter · 1–9 en la mano · clic | A |
| Golpear el trono apuntado | Espacio · clic en el trono | X |
| Guardar en La Manga | Y | Y |
| Rebobinar (deshacer) | Z | LT |
| Descartar lo elegido | Supr | L3 (pulsar la palanca izquierda) |
| Atrás / soltar la selección | Esc | B |
| Ver el Mazo y el Descarte | Tab | LB |
| Lupa | L · clic derecho · pulsación larga | RB |
| Reordenar las reliquias | Arrastrar · Mayús + flechas | LB / RB con el foco en la reliquia |
| Cambiar la velocidad (1× → 2× → 4×) | botón de la barra | RT |
| Pantalla completa | F | R3 (pulsar la palanca derecha) |
| Reiniciar la campaña | Mantener R | Mantener Select |
| Ajustes | botón de la barra | Start |

Los botones de la mesa enseñan su atajo: la tecla si juegas con teclado, el botón (A, B, X, Y, LB, RB, LT, RT, L3, R3) si lo último que tocaste fue un mando, y nada con ratón o pantalla táctil. Junto a los poderes de palo, la **rueda de palos** (♠ → ♦ → ♥ → ♣ → ♠) se enciende con lo que llevas elegido: una flecha si pegas con ventaja, un aspa si ese trono es Inmune a tu palo.

La **Lupa** abre cualquier carta, reliquia, guardia o monarca a tamaño de lámina, con la cuenta exacta de lo que aporta en ese momento. En sala, pulsar un trono cuando no es tu turno (o cualquier ruta, oferta o carta con Alt) deja una **seña** con tus iniciales para la conjura: no decide nada, solo señala.
