# Informe evolutivo final · de la 10.0 a la 20.0

**SANGRE Y PALO · BLOOD & SUITS.** Estado al 2026-11-16. Campeón publicado: **20.0** (`v20.0.0`, commit `c19e864` en `origin/main`), jugable en <https://ifbotech.github.io/derrumbe/>.

## En corto

- **Ninguno de los seis objetivos norte se cumple todavía.** El Campeón queda en 54,2 % de aprobación (objetivo 75), 37,5 % de críticos duros (45), claridad 6,38 (7,60), diversión 7,21 (8,00), 37,5 % de impulsivos (65), 50 % en Steam Deck y 66,7 % en móvil (70 cada uno).
- **Sí hay mejora medida desde la 11.0**: con las mismas 24 personas y las mismas preguntas, la aprobación en español pasa de 37,5 % a 54,2 %, la claridad de 5,67 a 6,38 y la diversión de 6,71 a 7,21.
- **De la 12.0 a la 20.0 se construyeron nueve versiones**: cuatro publicadas (12.0, 16.0, 19.0, 20.0) y cinco rechazadas y guardadas en ramas (13.0, 14.0, 15.0, 17.0, 18.0).
- **El efecto más firme de la misión es la cuenta entera** («1.036 = Daño 148 × Multi ×7» en vez de «1K»): sube la claridad unas seis décimas en dos corridas seguidas (p ≈ 0,05–0,08).
- **El instrumento tiene más ruido que casi todos los cambios**: con 24 personas, una corrida se mueve ±10–15 puntos de F sin que cambie nada. Dos de las tres aceptaciones recientes (16.0 y 20.0) dependen de un solo voto de Steam Deck; en la 20.0 ese voto es ajeno al cambio.
- **No se corrió la réplica en inglés ni el `rapido-60` ni el censo de 240**: estaban reservados para cuando una corrida pasara los seis objetivos.

## 1. Trayectoria

Todas las filas son del panel simulado (`..\panelAgentesGaming`). Las cifras de filas con instrumentos distintos no se comparan entre sí; cada bloque dice el suyo. «Impulsivos» es el estrato casual de la misión (`cero_tutorial_impulsivo`). El precio es el óptimo de Van Westendorp en USD.

### Instrumento `rapido-60` (60 personas, reseña larga)

| Versión | Aprob. ES | Aprob. EN | Críticos | Casual | Deck | Móvil | Claridad | Diversión | Precio óptimo |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10.0 | 28,3 | — | — | 8,3 (1 de 12) | 22,2 (2 de 9) | 40,0 (6 de 15) | 4,92 | 6,32 | 8,19 (censo de 240) |
| 11.0 | 36,7 | 40,0 | 15,0 / 20,0 | 38,1 / 38,1 | 44,4 / 0,0 | 33,3 / 53,3 | 5,40 / 5,28 | 6,57 / 6,63 | 6,25 / 8,50 |

(Donde hay dos cifras son español / inglés. La 10.0 no se midió en inglés ni con el estrato de críticos; su casual es «casuales que aprueban» de aquel informe.)

### Instrumento `pulso-24` rápido (24 personas fijas, reseña corta), cuatro corridas agrupadas

| Versión | Aprob. ES | Aprob. EN | Críticos | Casual | Deck | Móvil | Claridad | Diversión | F | Precio óptimo (ES · EN) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 11.0 | 41,7 | 35,4 | 15,6 | 31,2 | 12,5 | 50,0 | 5,70 | 6,75 | 118,94 | 5,25 · 7,00 |
| **12.0** (publicada) | 47,9 | 33,3 | 18,8 | 37,5 | 12,5 | 54,2 | 5,81 | 6,80 | 123,23 | 5,25–8,25 · 7,81–8,00 |

### Instrumento `pulso-24` rápido, una corrida en español por versión (regla del bucle desde la 13.0)

| Versión | Decisión | Aprob. ES | Críticos | Casual | Deck | Móvil | Claridad | Diversión | F | Precio óptimo |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 11.0 (referencia) | — | 37,5 | 12,5 | 12,5 | 0,0 | 50,0 | 5,67 | 6,71 | — | 5,25 |
| 12.0 (listón) | publicada | 50,0 | 37,5 | 37,5 | 0,0 | 50,0 | 6,33 | 7,04 | 138,18 | 5,25 |
| 13.0 | rechazada | 50,0 | 25,0 | 25,0 | 0,0 | 50,0 | 6,29 | 7,00 | 132,74 | 8,00 |
| 14.0 | rechazada | 39,1 | 25,0 | 25,0 | 0,0 | 40,0 | 6,09 | 6,78 | 119,54 | 8,25 |
| 15.0 | rechazada | 41,7 | 25,0 | 25,0 | 0,0 | 50,0 | 6,46 | 6,75 | 124,21 | 7,92 |
| **16.0** | **publicada** | 54,2 | 25,0 | 37,5 | 25,0 | 50,0 | 5,88 | 6,92 | 146,58 | 5,25 |
| 17.0 | rechazada | 41,7 | 25,0 | 25,0 | 0,0 | 33,3 | 5,92 | 6,79 | 121,17 | 5,25 |
| 18.0 | rechazada | 50,0 | 25,0 | 37,5 | 0,0 | 66,7 | 6,46 | 7,12 | 134,36 | 8,00 |
| **19.0** | **publicada** | 54,2 | 25,0 | 37,5 | 25,0 | 66,7 | 6,50 | 7,17 | 151,55 | 8,00 |
| **20.0** | **publicada (Campeón)** | 54,2 | 37,5 | 37,5 | 50,0 | 66,7 | 6,38 | 7,21 | **162,28** | 5,25 |

Notas de lectura:

- **Inglés**: desde la 13.0 no se midió (una sola corrida española por versión). El último dato inglés es el de la 12.0: 33,3 %.
- **Precio**: el óptimo salta entre 5,25 y 8,00–8,25 USD de una corrida a otra porque las curvas se cruzan en dos sitios casi empatados; el precio de indiferencia es estable (8,0–8,9 USD en todas las corridas) y el rango aceptable va de unos 4–5 a unos 15 USD. La lectura prudente sigue siendo la de la 10.0: **unos 8 USD**.
- **F** = aprobación + 0,4 × críticos + 6 × claridad + 5 × diversión + 0,5 × el menor de (casual, Deck, móvil). Con 4 personas en Steam Deck, un voto mueve F 12,5 puntos por el último término.

## 2. Avances y experimentos revertidos

### Lo que entró (publicado)

| Versión | Qué cambió | Qué midió el panel | Qué tan firme es |
|---|---|---|---|
| **11.0** | Reglas simplificadas (Multi entero, Inmune de un solo palo, cinco palabras clave) | Aprobación 28,3 → 36,7 %, claridad 4,92 → 5,40 (60 personas) | La claridad sí se distingue del azar (t = 2,81); la aprobación, no (p = 0,18) |
| **12.0** | Mejor jugada, AUTO, botín que cae y se recoge solo, tirada de dados, Árbol de la Conjura | F 118,94 → 123,23 en cuatro corridas agrupadas | Dentro del ruido; se publicó por la regla |
| **16.0** | Con mando, marco del foco más grueso con halo; La Taberna con mando con precios y botones más grandes | F 138,18 → 146,58; Steam Deck de 0 a 1 de 4 | Un voto; no significativo |
| **19.0** | La cuenta con todas sus cifras y con signo igual; con mando, la carta enfocada crece 1,3× sin etiqueta encima | F 146,58 → 151,55; claridad 5,88 → 6,50 (p = 0,053) | **El más firme**: la 18.0 ya había dado 6,46 con la misma cuenta, y F se había predicho en 151 antes de medir |
| **20.0** | La placa de la Partida guiada pasa de amarillo a pizarra con tiza | F 151,55 → 162,28 | **No atribuible al cambio**: quita un P0 del auditor, pero los dos votos que cambian son de personas que vieron lo mismo que en la 19.0 |

### Lo que se revirtió (cinco candidatas rechazadas, cada una en su rama `rechazado/vN-20261116`)

| Versión | Hipótesis | Resultado | Por qué falló |
|---|---|---|---|
| **13.0** | Inmune sin excepciones (el poder del palo tampoco actúa) y Vida 22, más varios retoques de claridad | F 132,74 frente a 138,18 | Muchos cambios chicos a la vez: ninguno supera el ruido y cada captura tocada re-sortea la lista de problemas del auditor. Una primera medida se anuló porque las escenas contaban «qué cambió» en vez del estado del juego |
| **14.0** | «Bolsillo primero»: zona de acción rehecha, fila del pulgar en móvil, foco del mando en latón | F 119,54 | Tocar toda la mesa re-sortea unas 50 auditorías; el latón no contrasta con cartas de marfil; el P0 de «botones chicos» en portátil no depende de la maqueta (sale en 11 de 11 auditorías en todas las versiones, y en 0 de 11 en PC con la misma maqueta a escala) |
| **15.0** | El Golpe exacto perdona pasarse por 1 (más exactos, más diversión) | F 124,21; diversión 7,04 → 6,75 | El exacto vale porque es exacto: ablandarlo confunde («la tolerancia de +1 es confusa») y no divierte más |
| **17.0** | Con mando, la carta enfocada crece (con la etiqueta «A Elegir» encima) | F 121,17 frente a 146,58 | El auditor cambió su P0 de «el marco se pierde» a «la etiqueta tapa la carta». De los tres votos perdidos, dos eran de personas que vieron lo mismo que en la 16.0 (ruido) |
| **18.0** | La cuenta con todas sus cifras | F 134,36 frente a 146,58 | La predicción se cumplió (claridad 6,46, diversión y móvil arriba), pero Steam Deck volvió a 0 de 4 y eso solo cuesta 16,7 puntos de F. Sus ingredientes entraron en la 19.0 |

También se descartó por el camino, sin llegar a medirse: atenuar las cartas no enfocadas (baja su contraste de 4,5:1) y agrandar el monedero de la barra con mando (en inglés no cabe a 1280 px y esconde el rótulo de AUTO).

### Lo aprendido sobre el instrumento

1. **Una corrida de 24 personas no distingue mejoras chicas.** La misma persona, con las mismas capturas y el mismo texto, cambia de voto entre corridas. El estrato de Steam Deck (4 personas) se mueve de 25 en 25 puntos.
2. **La regla «F de una corrida mayor que F del Campeón» hace de trinquete con la suerte**: cada corrida afortunada sube el listón. El 162,28 actual incluye un voto de Steam Deck que no se puede atribuir a la 20.0.
3. **El auditor visual tiene manías por dispositivo**: en portátil escribe siempre «botones chicos y pegados para trackpad»; en Steam Deck, siempre algo sobre el foco. Perseguir esas frases captura a captura no converge. Sí es señal lo que repite en dos re-sorteos seguidos (así se encontró la etiqueta pegada a la carta).
4. **Las capturas de 1280×800 se auditan como «Steam Deck solo con mando», pero salvo dos están tomadas con ratón** (sin marco de foco ni insignias de botón). El auditor marca «no hay foco» en pantallas donde el juego, con mando, sí lo enseña. Corregirlo es cambiar el instrumento y pide volver a medir el Campeón; quedó sin hacer.
5. **Dos escenas del panel describen de menos el juego**: dicen que las Reliquias «se reordenan arrastrando», y el juego también las mueve con dos clics (una Reliquia y luego el hueco) y con Mayús + flechas. Tres personas de portátil votan en contra citando el arrastre. Misma advertencia: es una corrección del instrumento, no del juego.
6. **Lo que funcionó como método**: leer primero qué capturas ve el estrato que hace de piso; cambiar solo lo que se ve con `data-input=pad` para no tocar las capturas de los demás; recombinar lo que subió en candidatas rechazadas; y escribir la predicción de F antes de medir.

### Qué haría falta para acercarse a los objetivos

- **Medir mejor antes de cambiar más**: dos o tres corridas por candidata (o el `rapido-60`) para decidir, y volver a medir el Campeón con cada corrección del instrumento. Con una sola corrida, la mitad de las decisiones son suerte.
- **Los frentes con más votos en contra hoy** (11 de 24 en la última corrida): portátil (3 de 6 a favor: puntería con trackpad en la zona de acción), los primeros minutos y la primera derrota (el mazo que se agota quita Vida «sin entender por qué»), la cuenta en pantalla chica (Steam Deck: «la fórmula está apretada contra el total») y La Taberna del móvil (la segunda fila queda cortada sin señal de que se desliza).
- **La distancia a los objetivos es grande**: 21 puntos de aprobación, 1,2 de claridad y 0,8 de diversión. Los retoques de interfaz de esta misión movieron décimas; lo único que movió más fue cambiar reglas (11.0) y la cuenta (19.0).

## 3. Lista de prueba para amigos y familia

Enlace: <https://ifbotech.github.io/derrumbe/> (versión 20.0). Unos 25 minutos por persona. Lo ideal: no explicar nada, mirar y apuntar dónde se traban.

**Antes de empezar**

- [ ] Abre el enlace en el dispositivo que uses a diario (PC, portátil, móvil en vertical o Steam Deck). Apunta cuál.
- [ ] Si la página ofrece una versión guardada antigua, recarga una vez. En Ajustes debe verse la versión 20.0.

**Primeros tres minutos (la Partida guiada)**

- [ ] ¿Se lee la placa de pizarra de cada paso sin acercarte a la pantalla?
- [ ] Tras los cinco pasos, di con tus palabras qué es un trono **Inmune** y qué es un **Golpe exacto**. (Apuntar la frase literal.)
- [ ] ¿En algún paso no supiste qué tocar? ¿Cuál?

**Primer asalto de la campaña**

- [ ] Mira la cuenta del centro («1.036 = Daño 148 × Multi ×7»). ¿Sabes de dónde sale cada número? ¿Hay alguno que no entiendas?
- [ ] Antes de golpear, ¿ves cuánta Vida le quitarás al guardia y si caerá?
- [ ] Prueba **Mejor** una vez. ¿Entiendes por qué propuso esa jugada?
- [ ] Guarda una carta en **La Manga** y úsala después. ¿Te salió a la primera?
- [ ] Si pierdes: ¿la pantalla de derrota te dice por qué? En especial si fue por quedarte sin mazo.

**La Taberna y las Reliquias**

- [ ] Compra una Reliquia. ¿Leíste bien los precios?
- [ ] **En móvil**: ¿te diste cuenta de que hay más ofertas deslizando hacia abajo?
- [ ] Cambia el orden de dos Reliquias. ¿Cómo lo hiciste (arrastrando, con dos toques o con teclas)? ¿Sabías que el orden importa?

**AUTO y el Árbol**

- [ ] Enciende **AUTO** un asalto y apágalo. ¿Se entiende qué hace y cómo se para?
- [ ] Tras la campaña, abre el **Árbol de la Conjura** y compra un nodo. ¿Costó apuntar al nodo que querías?

**Según tu dispositivo**

- [ ] **Steam Deck o mando**: ¿sabes siempre qué carta o botón está enfocado? ¿La carta que crece te tapa algo que necesitas ver?
- [ ] **Portátil con trackpad**: ¿fallaste algún clic entre Golpear, Mejor, Deshacer y Soltar? ¿Cuántas veces?
- [ ] **Móvil**: ¿llegas con el pulgar a Golpear y a Descartar sin cambiar el agarre? ¿Algún toque cayó en el botón de al lado?
- [ ] **Inglés**: juega cinco minutos en inglés y apunta cualquier texto raro o en español. (Ningún hablante nativo ha revisado los textos.)

**Al terminar (tres preguntas)**

- [ ] ¿Lo recomendarías tal como está? Sí o no, y la razón en una frase.
- [ ] Del 1 al 10: ¿cuánto entendiste las reglas? ¿Cuánto te divertiste?
- [ ] ¿Cuánto pagarías en Steam? ¿A qué precio te parecería caro?

Con ocho o diez personas reales, esas tres respuestas dicen más que otra vuelta del panel simulado: sirven para comprobar si la aprobación del 54 % y el precio de unos 8 USD se parecen a la realidad.

## Dónde está cada cosa

- **Bitácora completa de hipótesis, medidas y lecciones**: [MEMORIA_EVOLUTIVA.md](MEMORIA_EVOLUTIVA.md).
- **Cambios por versión para quien juega**: [CHANGELOG.md](CHANGELOG.md).
- **Historia anterior**: [EVOLUCION_V4_V10.md](EVOLUCION_V4_V10.md) y [EVOLUCION_V11.md](EVOLUCION_V11.md).
- **Candidatas rechazadas**: ramas locales `rechazado/v13-20261116`, `v14`, `v15`, `v17` y `v18` (no están en GitHub).
- **Pendiente de la coronación completa del Campeón**: la pasada bilingüe entera de QA visual y de humo, `test:full` y el laboratorio completo de 55.000 campañas. La 20.0 pasó las puertas rápidas (365 + 9 pruebas, QA visual de 236 capturas en español y las pantallas tocadas en inglés, humo rápido de 32 comprobaciones); las reglas de combate no cambian desde la 12.0, que sí pasó el laboratorio completo.
