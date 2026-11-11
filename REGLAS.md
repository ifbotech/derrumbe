# DERRUMBE — Reglas

Juego cooperativo de demolición para 1 a 4 jugadores con baraja francesa (52 cartas + 2 comodines).
Sois una cuadrilla: hay que echar abajo las **cuatro torres** antes de que sepulten vuestro **búnker**.
Se gana o se pierde en equipo. También se puede jugar en mesa con una baraja real.

## Preparación

1. Separa las 12 figuras y forma 4 **torres**, una por palo. Cada torre tiene 3 pisos apilados:
   la **J** arriba (se demuele primero), luego la **Q** y al final la **K**.
2. Baraja las 40 cartas numerales (del As al 10) con los 2 comodines: es la **cantera** (mazo).
   Deja sitio al lado para la **escombrera** (descartes).
3. Cada jugador roba su mano de **6** cartas.
4. El **búnker** empieza con **20 de integridad** y **0 de muro** (máximo 8).

| Piso | Resistencia | Amenaza |
|------|-------------|---------|
| J    | 32          | 3       |
| Q    | 46          | 5       |
| K    | 62          | 7       |

Cada palo es un material: ♠ **ACERO**, ♦ **VIDRIO**, ♥ **LADRILLO**, ♣ **HORMIGÓN**.

## El turno

### 1. Acción (elige una)

- **Golpear** una torre con una *formación*:

  | Formación         | Cartas                                         | Golpe |
  |-------------------|------------------------------------------------|-------|
  | Carta sola        | 1 carta                                        | ×1    |
  | Grupo             | 2 o 3 del mismo número                         | ×1    |
  | Escalera          | 3 o más números seguidos                       | ×1    |
  | Doble par         | 2 parejas                                      | ×1,25 |
  | Color             | 5 o más del mismo palo                         | ×1,5  |
  | Full              | un trío y una pareja                           | ×1,5  |
  | Escalera de color | 3 o más seguidas del mismo palo                | ×1,5  |
  | Póker             | 4 del mismo número                             | ×2    |

  El multiplicador se aplica al golpe entero, después de la ventaja de material de cada carta.
- **Descartar** las cartas que quieras (al menos una).
- **Huelga**: jugar un comodín sobre una torre.
- **Pasar**: solo si tienes la mano vacía.

### 2. Sirena

Voltea la carta superior de la cantera a la escombrera. La torre de ese palo golpea al búnker
con la **amenaza** de su piso actual: el muro absorbe primero (y se gasta), el resto baja la integridad.
No pasa nada si esa torre ya está en ruinas, si su piso está desarmado o si sale un comodín.

### 3. Robar

Roba hasta completar tu mano. Juega el siguiente jugador.

## Daño

Cada carta hace tanto daño como su número. El **As** es la carta fuerte: vale **11**, y en las
escaleras enlaza por abajo (A-2-3) y por arriba (9-10-A). El material de la torre modifica el daño:

| Torre        | Daño doble (×2) | Sin daño (×0) |
|--------------|-----------------|---------------|
| ♠ ACERO      | ♣               | ♠             |
| ♦ VIDRIO     | ♠               | ♦             |
| ♥ LADRILLO   | ♦               | ♥             |
| ♣ HORMIGÓN   | ♥               | ♣             |

Ciclo: ♠ rompe ♦ · ♦ corta ♥ · ♥ agrieta ♣ · ♣ sepulta ♠.

El daño se acumula en el piso actual. Cuando iguala o supera su resistencia, el piso cae
y el siguiente queda al descubierto. El daño sobrante se pierde (salvo con ♠).

## Poder de cada palo

Además del daño, las cartas que juegues activan el poder de su palo, aunque no hagan daño:

| Palo | Poder         | Efecto |
|------|---------------|--------|
| ♠    | **Perforar**  | Si la formación lleva alguna pica, el daño sobrante pasa al piso siguiente de esa torre. |
| ♦    | **Esquirlas** | Cada una de las otras torres recibe ⅓ (redondeando hacia abajo) del valor total de tus diamantes. |
| ♥    | **Reparar**   | El búnker recupera ⅓ (hacia arriba) del valor total de tus corazones. Máximo 20. |
| ♣    | **Muro**      | Levantas ⅓ (hacia arriba) del valor total de tus tréboles como muro. Máximo 8. |

## Reglas especiales

- **Golpe limpio**: si un piso cae con el daño exacto, la sirena no suena ese turno.
- **Huelga (comodín)**: el piso actual de la torre elegida queda **desarmado** (amenaza 0 hasta que caiga)
  y la sirena no suena ese turno. El comodín sale del juego.
- **Colapso**: si hay que robar o voltear y la cantera está vacía, baraja la escombrera para formar
  una cantera nueva y el búnker pierde **5** de integridad (el muro no lo evita).

## Final

- **Victoria**: las cuatro torres están en ruinas.
- **Derrota**: la integridad del búnker llega a 0.

## Dificultad

| Modo   | Búnker | Colapso | Victorias del bot de referencia |
|--------|--------|---------|---------------------------------|
| OBRA   | 20     | −5      | ≈ 60 %                          |
| BRUTAL | 16     | −6      | ≈ 40 %                          |

Los valores están ajustados por simulación (`npm run simulate`), de modo que la dificultad
sea pareja de 1 a 4 jugadores.

## Consejos

- Tirar una J destapa una Q con más amenaza: una torre a medias es más peligrosa que una intacta.
- Una torre en ruinas convierte su palo en sirenas mudas: terminar torres da turnos seguros.
- Jugar muchas cartas acelera la obra, pero agota la cantera y acerca el colapso.
- Las cartas "inmunes" a una torre siguen sirviendo por su poder: un ♣ contra HORMIGÓN no daña, pero levanta muro.

## Campaña (roguelike de construcción de mazo)

Se juega en solitario o en sala online (el anfitrión elige **Campaña** al crear la sala). Las reglas de
mesa son las mismas, pero la partida es una cadena de **8 obras** y el mazo, el oro y las herramientas
se conservan de una a otra. En cooperativo todo es compartido y las decisiones las toma el anfitrión.

### El recorrido

1. **La baraja.** Eliges una baraja inicial de las que tengas desbloqueadas.
2. **El sobre.** Empiezas con **3 cartas especiales** al azar.
3. **La obra.** Se juega con mano de 7. Si tiene jefe, se presenta antes de empezar.
4. **El cobro.** 4 + número de obra, +1 por golpe limpio (máx. 5), +1 por cada 5 de integridad y
   +1 de interés por cada 5 de oro ahorrado (tope 3).
5. **La recompensa.** Una **carta incógnita** gratis: te la llevas o no. Tras un jefe, además eliges
   1 de 2 herramientas.
6. **La ferretería.** Poco y distinto cada vez: 2 herramientas, 1 carta incógnita y 1 servicio al azar
   (forja, plano, reparación o comodín), con precios que varían. Puedes pagar por **otra remesa**
   y por **quemar** una carta del mazo (3 de oro, +2 cada vez; el mazo no baja de 12 cartas).

El búnker no se cura solo: recupera 4 al terminar cada obra y lo que repares tú.

| Obra | Nombre             | Pisos por torre | Resistencia | Jefe |
|------|--------------------|-----------------|-------------|------|
| 1    | Caseta de obra     | J               | ×1          | —    |
| 2    | Bloque de pisos    | J, Q            | ×1          | —    |
| 3    | Torre del capataz  | J, Q, K         | ×1          | sí   |
| 4    | Polígono           | J, Q, K         | ×1,3        | —    |
| 5    | Ciudadela          | J, Q, K         | ×1,6        | sí   |
| 6    | Rascacielos        | J, Q, K         | ×2          | —    |
| 7    | Fortaleza          | J, Q, K         | ×2,45       | sí   |
| 8    | La Torre Madre     | J, Q, K         | ×3          | sí   |

La resistencia base de campaña es 20 / 30 / 40 (J / Q / K) y la amenaza 3 / 4 / 6.

### Cartas especiales

No son de la baraja francesa: **no tienen palo ni número**. Se añaden a cualquier golpe como apoyo
(hasta **dos** por golpe, sin alterar la formación) o se juegan solas. Se consiguen **a ciegas**:
la carta incógnita te da una al azar.

| Carta               | Efecto |
|---------------------|--------|
| Barreno             | El golpe perfora y hace +8 de daño. |
| Martillo neumático  | La carta más alta del golpe cuenta dos veces. |
| Saboteador          | Desarma el piso que golpeas. |
| Palanca             | Cada carta del golpe hace +3. |
| Grúa                | Robas 2 cartas extra este turno. |
| Mordaza             | La sirena no suena este turno. |
| Pistola de clavos   | 6 de daño a cada una de las otras torres. |
| Chatarrero          | +3 de oro. |
| Pico de oro         | Si el golpe tira un piso, +5 de oro. |
| Botica              | +5 de integridad. |
| Gemelo              | Todas las cartas del golpe valen como la más alta. |
| Nitroglicerina      | El golpe entero ×2, pero el búnker pierde 3. |
| Bola de demolición  | El golpe entero ×1,5. |
| Hormigonera         | +5 de muro. |
| Cemento rápido      | +2 de muro por cada carta del golpe. |
| Sierra radial       | Todo el golpe pega con ventaja, sea cual sea la torre. |

**Legendarias** (solo entran en el sorteo cuando desbloqueas su logro):

| Carta         | Efecto | Se desbloquea |
|---------------|--------|---------------|
| El Ferretero  | +5 de oro y robas 2 cartas extra. | Llevando las 22 herramientas, entre todas tus campañas. |
| La Sirena     | La sirena no suena y robas 2 cartas extra. | Derrotando a La Sirena. |
| El Usurero    | +8 de oro. | Derrotando a El Usurero. |
| El Matasanos  | +10 de integridad. | Derrotando a El Matasanos. |
| La Ventisca   | +8 de muro y la sirena no suena. | Derrotando a La Ventisca. |
| El Coloso     | El golpe entero ×2,5. | Derrotando a El Coloso. |
| La Furia      | +20 de daño y el golpe perfora. | Derrotando a La Furia. |
| El Topo       | 12 de daño a cada una de las otras torres. | Derrotando a El Topo. |

### Jefes de obra

Las obras 3, 5, 7 y 8 las guarda un jefe al azar, con su carta y su maldición:

| Jefe          | Maldición |
|---------------|-----------|
| La Sirena     | Doble sirena: voltea 2 cartas cada turno. |
| El Usurero    | Escasez: jugáis con 1 carta menos en la mano. |
| El Matasanos  | Sin botiquín: los ♥ no reparan el búnker. |
| La Ventisca   | Intemperie: el muro no puede pasar de 2. |
| El Coloso     | Blindaje: todos los pisos resisten un 25 % más. |
| La Furia      | Furia: la amenaza de todas las torres sube 1. |
| El Topo       | Suelo inestable: los colapsos quitan el doble. |

### Barajas iniciales

| Baraja                  | Qué cambia | Se desbloquea |
|-------------------------|------------|---------------|
| Baraja de obra          | La de siempre: 40 cartas, 2 comodines y un sobre de 3. | Desde el principio. |
| Baraja negra            | Solo ♠ y ♣, por duplicado. Empiezas con Ácido y +6 de oro. | Superando la obra 3. |
| Baraja del prestamista  | +12 de oro y +3 al tope de interés; búnker −4. | Superando la obra 5. |
| Baraja de ases          | Ocho ases y ningún 2 ni 3. | Ganando una campaña. |
| Baraja corta            | Sin cartas del 2 al 5; búnker −4. | Haciendo 100 de daño de un golpe. |
| Baraja del caos         | Un solo comodín, sobre de 6 especiales y mano +1. | Consiguiendo las 16 especiales comunes. |

### Herramientas y servicios

- **Herramientas** (22, caben 6): cambian las reglas mientras dure la campaña. Daño extra por palo,
  ventaja ×3, fin de la inmunidad, perforar siempre, mano más grande, mejor muro, mejor reparación,
  esquirlas más fuertes, curas y muro al demoler, bonos por formación, más oro…
- **Forja**: una carta del mazo gana +3 de valor para siempre (eliges entre tres).
- **Plano**: una formación sube de nivel; cada carta jugada así hace +2 (+3 en carta sola).

### El gremio: mejoras, logros y ascensos

- **Renombre.** Al terminar una campaña, ganes o pierdas, cada jugador gana renombre (1 por obra
  superada, +5 por ganar). Los logros dan más.
- **Mejoras permanentes.** Integridad, oro inicial, colapsos más suaves, más interés, más oferta en la
  ferretería y una carta más en la mano. En sala online se juega con las del anfitrión.
- **Logros** (26). Metas como superar obras, jugar un póker, hacer 100 de daño de un golpe, demoler
  500 pisos, completar la colección o derrotar a cada jefe. Cada uno da renombre, y varios
  desbloquean barajas y cartas legendarias. El progreso se guarda entre campañas.
- **Ascensos.** Cada victoria abre un nivel más: +15 % de resistencia a las torres y +25 % de renombre.
