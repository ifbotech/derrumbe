# DERRUMBE — Reglas

Juego cooperativo de demolición para 1 a 4 jugadores con baraja francesa (52 cartas + 2 comodines).
Sois una cuadrilla: hay que echar abajo las **cuatro torres** antes de que sepulten vuestro **búnker**.
Se gana o se pierde en equipo. También se puede jugar en mesa con una baraja real.

## Preparación

1. Separa las 12 figuras y forma 4 **torres**, una por palo. Cada torre tiene 3 pisos apilados:
   la **J** arriba (se demuele primero), luego la **Q** y al final la **K**.
2. Baraja las 40 cartas numerales (A = 1 … 10) con los 2 comodines: es la **cantera** (mazo).
   Deja sitio al lado para la **escombrera** (descartes).
3. Cada jugador roba su mano: **7** cartas en solitario, **6** con 2, 3 o 4 jugadores.
4. El **búnker** empieza con **20 de integridad** y **0 de muro** (máximo 8).

| Piso | Resistencia | Amenaza |
|------|-------------|---------|
| J    | 20          | 3       |
| Q    | 30          | 4       |
| K    | 40          | 6       |

Cada palo es un material: ♠ **ACERO**, ♦ **VIDRIO**, ♥ **LADRILLO**, ♣ **HORMIGÓN**.

## El turno

### 1. Acción (elige una)

- **Golpear** una torre con una *formación*:
  - **Solo**: 1 carta.
  - **Grupo**: 2 a 4 cartas del mismo número.
  - **Escalera**: 3 o más números consecutivos, de cualquier palo (el As solo vale 1).
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

Cada carta hace tanto daño como su número, modificado por el material de la torre:

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

## Campaña (roguelike, en solitario)

Las reglas de mesa son las mismas, pero la partida es una cadena de **8 obras**:

| Obra | Nombre             | Pisos por torre | Resistencia | Jefe |
|------|--------------------|-----------------|-------------|------|
| 1    | Caseta de obra     | J               | ×1          | —    |
| 2    | Bloque de pisos    | J, Q            | ×1          | —    |
| 3    | Torre del capataz  | J, Q, K         | ×0,85       | sí   |
| 4    | Polígono           | J, Q, K         | ×1,3        | —    |
| 5    | Ciudadela          | J, Q, K         | ×1,6        | sí   |
| 6    | Rascacielos        | J, Q, K         | ×2          | —    |
| 7    | Fortaleza          | J, Q, K         | ×2,5        | sí   |
| 8    | La Torre Madre     | J, Q, K         | ×3,1        | sí   |

- **Lo que persiste** entre obras: la integridad del búnker (+4 al terminar cada obra), el mazo con sus cartas forjadas, las herramientas (máximo 6), los planos y el oro.
- **Paga** al demoler una obra: 4 + número de obra, +1 por golpe limpio (máx. 5), +1 por cada 5 de integridad y +1 de interés por cada 5 de oro ahorrado (tope 3).
- **Ferretería**: 3 herramientas, forja (+3 al valor de una carta a elegir entre tres), plano de formación (+3 por carta sola, +2 por carta en grupo o escalera), reparación (+6) y comodín extra. Se puede pedir otra remesa pagando.
- **Jefes**: doble sirena, escasez (una carta menos), sin botiquín, intemperie (muro máximo 2), blindaje (+25 % de resistencia), furia (+1 de amenaza) y suelo inestable (colapsos dobles).
- **Gremio**: al terminar la campaña ganas renombre (1 por obra superada, +5 por ganar) para mejoras permanentes: integridad, oro inicial, colapsos más suaves, más interés, más oferta en la ferretería y una carta más en la mano.
- **Ascensos**: cada victoria abre un nivel más; cada nivel da +15 % de resistencia a las torres y +25 % de renombre.
