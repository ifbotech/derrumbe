# Evolución de la V4 a la V10

**SANGRE Y PALO · BLOOD & SUITS.** Este documento cuenta, con cifras, qué cambió entre la 4.0 (cuando el juego se llamaba DERRUMBE) y la 10.0, qué mejoró, qué no se movió y cómo sacar el juego a una prueba con amigos y familia.

Escrito el 14 de noviembre de 2026, al cerrar la 10.0. Las cifras de jugadores salen de un **panel simulado**: 240 personas de ficción interpretadas por modelos de lenguaje que corren en la máquina del estudio. Sirve para ordenar prioridades y para no romper lo que funcionaba. **No es una medida de jugadores reales**; para eso está la guía del final.

## 1. En una página

- **La aprobación simulada no se movió: 28,8 % en la V4 y 29,2 % en la V10** (240 personas las dos veces; la diferencia cabe de sobra en el ruido). Seis versiones de trabajo no convencieron al panel de recomendar más el juego.
- **La claridad sí subió: de 4,62 a 5,01 sobre 10** (intervalos del 95 %: 4,47–4,76 y 4,85–5,17, que no se tocan). Donde más, en PC (4,54 → 5,27) y entre los jugadores casuales (3,58 → 4,29).
- **Steam Deck sigue siendo el punto rojo: 4 aprobaciones de 36, igual que en la V4.** Portátil (23,3 %) y móvil (28,3 %) tampoco mejoran.
- **El balance no cambió desde la 6.0 y cumple todos sus objetivos.** El laboratorio de 55.640 campañas sale idéntico, número a número, en la 6.1, la 7.0, la 8.0, la 9.0 y la 10.0.
- **El juego está en español y en inglés**, con conmutador en la Portada y en Ajustes, sin una cadena recortada en ninguna de las cuatro ventanas. Ningún angloparlante lo ha revisado todavía.
- **El precio que el panel considera justo sigue en 8 USD** (óptimo de Van Westendorp, 8,19 USD).
- **Lo publicado**: `v6.1.0`, `v7.0.0`, `v8.0.0`, `v9.0.0` y `v10.0.0` en `main`, cada una con sus puertas pasadas. La web se despliega sola en https://ifbotech.github.io/derrumbe/.

## 2. Qué trajo cada versión

| Versión | Tema | Lo que cambió para quien juega |
|---|---|---|
| 4.0 | Balance con datos | Asedio final, aguante, mando completo, archivo de crónicas y despliegue en la web |
| 5.0 | Claridad | Texto mínimo de 13 px, palos con trama para daltonismo, mando sin huecos, causa de la derrota explicada |
| 6.0 | Tema nuevo | De la obra en demolición a la conjura contra una corte de naipes; vocabulario universal (Picas, Diamantes, Corazones, Tréboles, Vida, Escudo, Daño × Multi) |
| 6.1 | Marca dual | SANGRE Y PALO en español con el sello BLOOD & SUITS, y al revés en inglés; la tienda pasa a ser La Taberna |
| 7.0 | Aprender jugando | Partida guiada de cinco jugadas (29 s con teclado, 33 s con mando), siete monarcas con retrato, maldición a la vista y voz propia, sello ×0 / ×2 / ×3 en cada carta de la mano |
| 8.0 | Sensación y sonido | Tajo de naipe, corona en esquirlas, lacre caliente y monedas a 60 FPS; música generativa en re menor que no repite más de 3,3 s en tres horas; foco del mando rediseñado |
| 9.0 | Infraestructura | Los 244 números de balance en un archivo de configuración con afinador automático; telemetría solo local con botón de feedback; cooperativo probado con cortes y reconexiones |
| 10.0 | Para todo el mundo | Español e inglés, alto contraste, arreglos de Steam Deck y portátil, envoltura de escritorio preparada (Tauri) y puente para Steam |

## 3. Aprobación en Steam (simulada)

«Aprobación» es el porcentaje de personas del panel que dejarían un pulgar arriba. Hay dos tipos de corrida: el **censo** de 240 personas (ruido de unos ±6 puntos) y la **auditoría rápida** de 60 personas fijas (ruido de unos ±12).

| Versión | Corrida | n | Aprobación | IC 95 % | Claridad (1–10) |
|---|---|---:|---:|---|---:|
| 4.0 | censo | 240 | 28,8 % | 23,4–34,8 | 4,62 |
| 6.1 | rápida | 60 | 23,3 % | 14,4–35,4 | 4,93 |
| 7.0 | rápida | 60 | 25,0 % | 15,8–37,2 | 4,93 |
| 8.0 | rápida | 60 | 25,0 % | 15,8–37,2 | 5,20 |
| 9.0 | rápida | 60 | 26,7 % | 17,1–39,0 | 5,30 |
| **10.0** | **censo** | **240** | **29,2 %** | **23,8–35,2** | **5,01** |
| 10.0 | las mismas 60 de las rápidas, dentro del censo | 60 | 30,0 % | 19,9–42,5 | 5,10 |

Cómo leerlo:

- De la 6.1 a la 10.0, con las mismas 60 personas, la aprobación pasa de 23,3 % a 30,0 %. Ninguno de los pasos intermedios se distingue del ruido; el recorrido entero apunta hacia arriba, sin poder afirmarlo.
- Censo contra censo (V4 y V10, las mismas 240 personas), la aprobación es la misma. Entre medias cambió el juego entero (tema, vocabulario, tutorial) y también el instrumento (las escenas que lee cada persona describen cada versión), así que la comparación es orientativa.
- La 5.0 y la 6.0 no se auditaron.

### Por tipo de jugador (censos, n = 240)

| Arquetipo | n | V4 | V10 | Claridad V4 → V10 |
|---|---:|---:|---:|---|
| Streamer / creador | 38 | 36,8 % | 47,4 % | 4,71 → 5,16 |
| Veterano de mazos | 43 | 39,5 % | 34,9 % | 5,02 → 5,26 |
| Especialista de interfaz | 34 | 41,2 % | 32,4 % | 5,12 → 5,29 |
| Adicto al combo | 43 | 27,9 % | 30,2 % | 4,65 → 5,30 |
| Casual de navegador | 48 | 10,4 % | 16,7 % | 3,58 → 4,29 |
| Purista de juegos de mesa | 34 | 20,6 % | 14,7 % | 4,91 → 4,88 |

Con grupos de 34 a 48 personas, cada porcentaje tiene un ruido de unos ±14 puntos: solo la subida de claridad del casual y del adicto al combo es clara.

## 4. Claridad por dispositivo

«Claridad» es la nota de 1 a 10 que cada persona pone a «entiendo las reglas y lo que pasa en pantalla».

| Dispositivo | n | Claridad V4 | Claridad V10 | Aprobación V4 | Aprobación V10 |
|---|---:|---:|---:|---:|---:|
| PC 1080p con ratón | 84 | 4,54 | **5,27** | 35,7 % | 41,7 % |
| Portátil 1366×768 con trackpad | 60 | 4,62 | 4,88 | 26,7 % | 23,3 % |
| Móvil 390×844 táctil | 60 | 4,65 | 4,78 | 31,7 % | 28,3 % |
| Steam Deck 1280×800 con mando | 36 | 4,75 | 4,97 | 11,1 % | **11,1 %** |
| **Todos** | 240 | 4,62 | **5,01** | 28,8 % | 29,2 % |

Camino por las auditorías rápidas (60 personas; 21 en PC, 15 en portátil, 15 en móvil, 9 en Steam Deck):

| Versión | PC | Portátil | Móvil | Steam Deck |
|---|---:|---:|---:|---:|
| 6.1 | 4,81 | 5,07 | 4,93 | 5,00 |
| 7.0 | 5,10 | 5,00 | 4,60 | 5,00 |
| 8.0 | 5,33 | 5,20 | 5,47 | 4,44 |
| 9.0 | 5,48 | 5,07 | 5,27 | 5,33 (escena distinta: no comparable) |
| 10.0 (subconjunto del censo) | 5,10 | 5,00 | 5,00 | 5,44 |

Las quejas, de censo a censo (menciones entre 240 reseñas): texto chico 355 → 247 · reglas confusas 187 → 153 · fatiga visual 205 → 183 · objetivos táctiles 86 → 65 · **contraste y color de palos 205 → 290** (sube).

### Lo que el censo marcó como grave y qué se hizo

La síntesis del censo de la V10 señaló tres problemas de prioridad máxima. El Director los midió sobre las capturas antes de aceptar ninguno:

| Lo señalado | ¿Tiene base? | Qué se hizo |
|---|---|---|
| Contraste de palos y tramas | En parte. El contraste cumple (de 7,9:1 a 13,8:1) y las tramas se distinguen; lo que sí era chico es el palo de la esquina de la carta (7 a 13 px) y su insignia de orden (13 px) | Palo de la esquina de 14 px o más (10 en móvil) e insignia de 16 px o más, sin cambiar el tamaño de la carta |
| Barras de Ataque y Vida ilegibles | No. Miden 14 px con filete de tinta y contraste de 13,8:1 | Nada |
| Dianas táctiles chicas en móvil | No. Los botones miden 48 px de alto y están a 12 px del borde | Nada |
| La cuenta no cuadra (encontrado en las auditorías) | Sí. La línea plegada decía «54 × 3,7» con un Golpe de 197; el Multi real era 3,65. Lo citan 24 de las 36 personas de Steam Deck | El Multi se enseña con dos decimales, como en la ficha abierta |
| El pie de la Crónica queda tapado en 1366 y 1280 (encontrado en las auditorías) | Sí. De los 44 px de cada botón se veían entre 12 y 39 | La fila de botones queda pegada al pie de la hoja |

Cada arreglo tiene su regla en la QA visual, en español y en inglés. El panel no se volvió a correr después: son cambios de presentación que una auditoría de 60 personas, con su ruido, no distinguiría.

## 5. Precio

Método de Van Westendorp sobre las 240 personas (cuatro preguntas: a qué precio es tan barato que desconfías, barato, caro y demasiado caro).

| | V4 | V10 |
|---|---:|---:|
| Precio justo (mediana) | 8,0 USD | 8,0 USD |
| Precio óptimo | 8,17 USD | 8,19 USD |
| Punto de indiferencia | 8,16 USD | 8,13 USD |
| Piso (por debajo, desconfianza) | 4,66 USD | 4,25 USD |
| Techo (por encima, demasiado caro) | 14,80 USD | 14,82 USD |
| Lo pondrían en deseados | 57,1 % | 62,5 % |

Conversión simulada por precio en la V10 (y el ingreso relativo que daría cada precio):

| Precio | Comprarían | Ingreso relativo |
|---:|---:|---:|
| 4,99 USD | 23,5 % | 1,17 |
| 7,99 USD | 13,0 % | 1,04 |
| 9,99 USD | 12,9 % | **1,29** |
| 12,99 USD | 8,5 % | 1,10 |
| 14,99 USD | 3,5 % | 0,52 |
| 19,99 USD | 0,2 % | 0,04 |

Lectura: el rango cómodo va de 8 a 10 USD. A 9,99 USD el panel compra casi lo mismo que a 7,99, así que es el precio que más ingreso deja en la simulación. Por encima de 13 USD la compra se desploma. Es una simulación: un precio real se decide con datos de lista de deseados reales.

## 6. Balance: las tablas de Monte Carlo

`npm run analyze:meta` juega **55.640 campañas** con semilla con el bot de referencia. Informe de la 10.0: **sin avisos**, e idéntico número a número al de la 6.1 (el cambio de tema, la partida guiada, los efectos, el traslado de los números a configuración y la traducción no movieron ni una cifra).

Campañas ganadas por Reinado (1.500 campañas por celda):

| Reinado | Orden vacía | Orden llena | Objetivo |
|---|---:|---:|---|
| 1 · Reinado de paz | 29,7 % | 45,1 % | 24–30 % y 40–48 % |
| 2 · Corazas finas | 25,6 % | 41,5 % | |
| 3 · Impuesto real | 23,5 % | 35,9 % | |
| 4 · Reyes en guardia | 18,3 % | 34,3 % | |
| 5 · Rey colérico | 14,1 % | 29,1 % | del 5 al 8, siempre a menos |
| 6 · Heridas viejas | 12,3 % | 24,9 % | |
| 7 · Guardia de noche | 7,9 % | 16,9 % | |
| 8 · Puertas selladas | 6,8 % | 15,3 % | 6–9 % y 12–17 % |

Por baraja inicial (Reinado 1):

| Baraja | Orden vacía | Orden llena |
|---|---:|---:|
| De la conjura | 29,7 % | 45,1 % |
| Negra | 29,3 % | 45,1 % |
| Del prestamista | 28,7 % | 43,3 % |
| De ases | 26,3 % | 41,6 % |
| Corta | 29,6 % | 42,5 % |
| Del caos | 28,0 % | 44,0 % |

Monarcas (de cada campaña que llega a uno, cuántas acaban ahí; media 14,9 %; objetivo entre 0,8× y 1,3× la media):

| Monarca | Letalidad | Frente a la media |
|---|---:|---:|
| El Rey de Dos Caras | 15,0 % | ×1,01 |
| El Usurero | 16,4 % | ×1,10 |
| La Dama del Cáliz | 13,6 % | ×0,91 |
| La Reina Helada | 14,0 % | ×0,94 |
| El Inquisidor | 15,9 % | ×1,07 |
| El Verdugo | 15,0 % | ×1,01 |
| El Relojero | 14,4 % | ×0,97 |

Ritmo (turnos por asalto):

| Asalto | Mediana | Percentil 95 | Objetivo |
|---|---:|---:|---|
| 1 · El Puente levadizo | 6 | 9 | mediana 5–7, P95 ≤ 10 |
| 2 · El Patio de armas | 8 | 11 | mediana 8–10, P95 ≤ 15 |
| 3 · La Armería | 9 | 12 | |
| 4 · Las Cocinas | 11 | 15 | mediana 9–13, P95 ≤ 19 |
| 5 · La Capilla | 11 | 17 | |
| 6 · La Biblioteca | 11 | 16 | |
| 7 · La Galería de espejos | 11 | 17 | |
| 8 · El Salón del Trono | 11 | 17 | |

Peor percentil 95 de los asaltos 4 a 8, por baraja: 18 · 18 · 18 · 17 · 16 · 17 (tope 19). Asalto único con 1 a 4 jugadores: 59,3 % · 58,5 % · 64,5 % · 63,1 % (objetivo 58–65 %).

Márgenes más justos, para quien toque el balance: Reinado 1 con la Orden vacía está a 0,3 puntos de su techo, y el Asalto único de 2 y de 3 jugadores, a 0,5 de sus bordes. El afinador (`npm run balance:tune`) propone hoy no tocar nada. Las dos propuestas de balance que hizo el panel se midieron y se descartaron: sacaban al Reinado 1 de su rango (29,7 → 34,5 %) y dejaban el primer asalto en 4 turnos.

Constitución, sin cambios: 6 palabras clave, 52 reliquias (tope 56), toda descripción en 115 caracteres o menos, en los dos idiomas.

## 7. Español e inglés: qué está listo

| | Estado |
|---|---|
| Textos | 1.479 claves por idioma (618 de reglas, 768 de pantalla, 93 de avisos, guía y voces), con prueba de paridad: mismas claves, mismas variables y mismas cifras |
| Conmutador | ES \| EN en la Portada y en Ajustes; cambia al instante, sin recargar, y se recuerda. Español por defecto en navegadores en español; inglés en los demás |
| Glosario | Spades, Diamonds, Hearts, Clubs · Health · Shield · Counterattack · Damage × Mult · Exact Hit · Up the Sleeve |
| Marca | BLOOD & SUITS con el sello SANGRE Y PALO; tarjetas para redes en los dos idiomas |
| Recortes | 172 capturas en inglés y 172 en español, en cuatro ventanas: cero textos recortados y cero restos de español en la versión inglesa |
| Jugabilidad | La partida guiada dura lo mismo en los dos idiomas (29 s con teclado, 33 s con mando); 306 comprobaciones de la prueba de humo en cada idioma, con ratón, teclado y mando |
| El español | Letra por letra el de la 9.0 (hay una prueba que lo compara) |

Lo que **no** está hecho: ningún hablante nativo de inglés ha leído los textos (los escribió el estudio de agentes: nombres de reliquias, frases de los monarcas y chistes de mesa incluidos); el panel simulado lee el juego en español, así que **no hay ninguna medida de la versión inglesa**; el reglamento (`REGLAS.md`) y el `README.md` siguen solo en español.

## 8. Escritorio y Steam: qué está listo

- `tauri/` trae la configuración de una envoltura de escritorio (Tauri v2) que empaqueta la misma web. **No se ha compilado**: hace falta instalar Rust y la herramienta de Tauri.
- El juego tiene un puente de escritorio (`src/client/platform.ts`) con seis ganchos para Steam (logros, idioma, capa de Steam, presencia y guardado en la nube) que solo se activan dentro de la envoltura. En la web no hacen nada. Tienen sus pruebas con un puente simulado.
- Falta todo lo que necesita una cuenta de Steamworks: identificador de la aplicación, el SDK, dar de alta los 36 logros y los depósitos. `STEAM_BUILD.md` lo detalla, con los nombres por idioma (SANGRE Y PALO para español y Latinoamérica, BLOOD & SUITS para el resto).

## 9. Lo que sigue en rojo

1. **Steam Deck: 4 de 36.** Con las nueve personas de Steam Deck de las auditorías rápidas, cero aprobaciones en cinco corridas seguidas. Lo que más citan es la cuenta que no cuadraba (arreglado al cierre de la V10, sin volver a medir) y el tamaño de lo que se lee en una pantalla de 7 pulgadas. Nadie ha probado el juego en una Steam Deck de verdad.
2. **Contraste y color de palos: la queja sube de 205 a 290 menciones** aunque las medidas cumplen. O el panel repite la queja por costumbre, o la estética de grabado cansa de una forma que las reglas de contraste no miden. Solo jugadores reales lo dirán.
3. **El casual sigue lejos: 16,7 % de aprobación**, pese a la partida guiada y a la subida de claridad.
4. **La aprobación global no se mueve.** Si el panel acierta, lo que falta no es pulido de interfaz, sino razones para volver: las tres ideas que votó al final van por ahí (ver la sección 11).
5. **Un fotograma lento** (unos 55 ms) la primera vez que cae un sello de lacre en cada sesión, en 1920×1080.
6. **Las pruebas de cooperativo tumban a veces a Node en Windows.** No es el servidor del juego (se comprobó con el servidor en su propio proceso: 0 caídas de 22; los clientes de prueba, 4). `npm test` repite esa pasada si ocurre. No está comprobado en Linux.

## 10. Guía para la prueba con amigos y familia

El objetivo es cambiar el panel simulado por 15 a 25 personas reales durante dos semanas y contestar tres preguntas: ¿se entiende sin ayuda?, ¿se lee en pantallas chicas? y ¿vuelven al día siguiente?

**Antes de invitar a nadie**

1. Abrí https://ifbotech.github.io/derrumbe/ en tu teléfono y en una pantalla grande y jugá la partida guiada en español y en inglés. Es lo primero que va a ver cada invitado.
2. Si querés recibir los datos de prueba sin que nadie te mande archivos, compilá con `VITE_TELEMETRY_URL` apuntando a un recolector tuyo (el `README.md` explica qué necesita). Sin eso todo funciona igual: el botón copia un resumen y descarga un archivo que la persona te manda.
3. Para probar el cooperativo, levantá el servidor de salas (`npm start` o la imagen de Docker) y pasales la dirección: se pega en Ajustes, en «Servidor de salas».

**A quién invitar** (cubrí primero lo que está en rojo)

| Grupo | Cuántos | Por qué |
|---|---:|---|
| Con Steam Deck u otra consola portátil de PC | 3 o más | Es el estrato que nunca aprueba, y nadie lo ha probado en el aparato de verdad |
| Con portátil chico (1366×768) | 3 o más | Segundo peor dispositivo |
| Solo desde el teléfono | 4 o más | La claridad en móvil apenas subió |
| Que no jueguen a juegos de cartas | 4 o más | El casual es el arquetipo más lejos |
| Que hablen inglés de nacimiento | 2 o más | Nadie ha revisado el inglés |
| Que jueguen mucho a juegos de mazos | 3 o más | Para saber si engancha a quien ya le gusta el género |

**Qué pedirle a cada uno** (media hora, sin explicarle nada antes)

1. Entrá al enlace y jugá la partida guiada.
2. Jugá una campaña hasta ganar o perder.
3. En la pantalla del final, tocá **«Enviar Crónica / Feedback de Prueba»** y mandame lo que te copie.
4. Contestame tres cosas: ¿lo recomendarías?, del 1 al 10 ¿cuánto entendiste lo que pasaba?, y ¿en qué momento te trabaste?

A los dos o tres días, preguntales si volvieron a abrirlo sin que se lo pidieras. Es el dato que el panel simulado no puede dar.

**Qué mirar al final**

| Pregunta | Con qué se contesta | Para comparar con el panel |
|---|---|---|
| ¿Se entiende? | La nota de claridad de cada uno y dónde se trabaron | Panel: 5,01 de 10; casual 4,29 |
| ¿Se lee? | Lo que digan los de Steam Deck, portátil y móvil; si alguien activó «Alto contraste» y se quedó con él | Panel: Steam Deck 11 %, portátil 23 %, móvil 28 % |
| ¿Lo recomendarían? | Sí o no | Panel: 29 %. Los amigos son más amables que un desconocido: mirá más lo que dicen que el porcentaje |
| ¿Vuelven? | Cuántos lo abrieron otra vez sin pedírselo | Sin dato del panel |
| ¿Hasta dónde llegan? | El asalto alcanzado y los turnos, en el archivo de feedback | Laboratorio: el bot gana el 29,7 % de las campañas en el Reinado 1 |
| ¿Dónde dudan? | El campo «dudas» del archivo (asaltos donde tardaron en jugar) | Sin dato del panel |
| ¿El inglés suena bien? | Lo que marquen los angloparlantes | Sin dato del panel |

**Privacidad, para decírselo tal cual**: el juego no manda nada solo. Guarda en el propio equipo un resumen de las últimas diez partidas (asalto alcanzado, turnos, baraja, qué reliquias se eligieron), sin nombres ni identificadores, y solo sale cuando la persona toca el botón. En Ajustes puede verlo y borrarlo.

**Después de la prueba**: con lo que digan los de Steam Deck y los casuales se decide si la siguiente versión es de legibilidad o de contenido. No conviene abrir la página de Steam ni fijar precio hasta tener esa respuesta.

## 11. Qué votó el panel para después del lanzamiento

Tres ideas, votadas por las 240 personas (cada una, una idea en los dos órdenes). El sesgo de posición fue alto (38,8 % de los pares), así que son pistas, no mandatos.

| Idea | A favor | IC 95 % |
|---|---:|---|
| Una demo gratuita con la partida guiada y los tres primeros asaltos | 81,2 % | 75,6–86,9 |
| El Asalto diario con una tabla entre amigos, sin cuentas | 70,0 % | 63,7–76,9 |
| Una campaña corta de cuatro asaltos para un rato de quince minutos | 63,1 % | 54,4–71,3 |

## 12. Cómo se midió y qué no dice este documento

- **El panel**: 240 personas de ficción (seis arquetipos y cuatro dispositivos), cada una con una escena del juego y las capturas de su ventana; un modelo de visión audita las capturas y otro escribe la reseña. Corre en una RTX 3090 con Ollama. El censo de la V10 fueron 1.014 evaluaciones en 103,5 minutos; se cortó en la 64 porque la máquina se reinició y se retomó desde ahí.
- **El instrumento cambió con el juego**: las escenas describen cada versión con sus datos reales, y varias veces hubo que arreglar el propio panel (un clasificador de quejas que contaba de más, capturas con ratón enseñadas a jugadores de mando, un lector que dejó de entender los números al pasarlos a configuración). Cada cambio está anotado en las puertas de su versión.
- **El panel no oye ni ve movimiento**: de la música y de los efectos de la V8 solo juzgó capturas quietas.
- **El laboratorio** juega con un bot. Dice si los números están donde se quiere; no dice si una persona se divierte.
- **Las puertas de cada versión** (tipos, pruebas, laboratorio, QA visual en cuatro ventanas, prueba de humo con ratón, teclado y mando, 60 FPS, variedad de la música, compilaciones) están en el `CHANGELOG.md`, con sus cifras.
