# Registro de cambios

Todas las versiones notables de SANGRE Y PALO · BLOOD & SUITS (la 6.0 se llamó CORONA ROTA; hasta la 5.0, DERRUMBE). Las cifras de balance salen del laboratorio (`npm run analyze:meta`). Las del panel salen de una simulación: con n = 240 tienen unos ±6 puntos de ruido; con la auditoría rápida de 60 personas, unos ±12.

## 20.0.1 — 2026-11-16

- **Arreglo**: en inglés, con mando y un monarca en la mesa, la barra de arriba se pisaba 5 px a 1280 px (Steam Deck). Si no cabe, tu ficha se queda en la flecha del turno y las cartas que llevas.
- **Por dentro**: la QA visual fotografía la ventana de 1280×800 como se ve en Steam Deck, jugando con mando (antes, con ratón salvo dos pantallas). Así se encontró el arreglo de arriba.

## 20.0.0 — 2026-11-16

La guía se escribe a tiza. La placa de cada paso de la Partida guiada deja de ser un rótulo amarillo de aviso y pasa a pizarra con letra de tiza, como los Susurros. Ninguna regla cambia.

### Partida guiada
- **La placa del paso**: fondo de pizarra, texto en tiza, un filete de tiza y la carta nombrada en papel. Mismo tamaño y mismo sitio. El aro que señala la carta o el trono del paso sigue en ámbar.

## 19.0.0 — 2026-11-16

La cuenta que cuadra. El Golpe se escribe con todas sus cifras y la cuenta se lee como una fórmula; con mando, la carta enfocada es la más grande de la fila. Ninguna regla cambia. (La 17.0 y la 18.0 fueron candidatas que el panel rechazó; lo que funcionó de ellas está aquí.)

### En la mesa
- **Todas las cifras**: el Golpe, el Daño, el aviso rojo de cada trono y la pólvora se escriben enteros mientras sean menores que 100.000 («1.036», no «1K»). La bolsa, el Árbol y la Vida de los guardias siguen en notación corta.
- **La cuenta es una fórmula**: «1.036 = Daño 148 × Multi ×7», con el signo igual entre el total y sus factores (en el móvil la línea ya iba justa y se queda sin el signo).

### Con mando
- **La carta enfocada de la mano crece** a 1,3 veces su tamaño, anclada abajo a la derecha: crece hacia arriba y hacia la izquierda y no tapa el índice de la carta siguiente (sí el borde derecho de la anterior mientras está enfocada). En el móvil no crece.
- **Ya no lleva la etiqueta «A Elegir / A Soltar»** que estrenó la 16.0: pegada a la carta se leía como si la tapara. La Taberna conserva su «A Comprar».

### Por dentro
- La regla «compacto» de la QA visual exige la cuenta entera y lo demás compacto. El humo rápido comprueba el foco por escala (32 comprobaciones).
- Sin cambios de reglas: misma huella de combate que la 12.0.

## 16.0.0 — 2026-11-16

El foco del mando se ve. Jugando con mando (Steam Deck), lo enfocado lleva un marco claro más grueso con un halo de luz, la carta enfocada de la mano sube sobre la fila y dice qué hace el botón A. Ninguna regla cambia; con ratón, teclado y pantalla táctil el juego se ve igual que en la 12.0. (La 13.0, la 14.0 y la 15.0 fueron candidatas que el panel rechazó; no se publicaron.)

### Con mando
- **El marco del foco**: 6 px de papel entre dos filetes de tinta de 3 px y un halo de luz fijo alrededor (antes, 4 px y sin halo).
- **En la mesa**, la carta enfocada de la mano sube 20 px sobre la fila y lleva encima la etiqueta del botón A con lo que hace: «A Elegir» o, si ya está elegida, «A Soltar» (en inglés, «A Pick» y «A Drop»). En el móvil sigue subiendo 4 px.
- **En La Taberna**, la cifra de cada precio mide 22 px dentro de su etiqueta, los botones del lateral 16 px y la línea de estado 15 px. La etiqueta «A Comprar» va encima de la oferta enfocada cuando hay otra fila debajo (antes tapaba el precio de la oferta de abajo).

### Por dentro
- El humo rápido comprueba la etiqueta del botón A sobre la mano (`v16-foco`): 32 comprobaciones.
- Sin cambios de reglas: el laboratorio no se repite (misma huella de combate que la 12.0).

## 12.0.0 — 2026-11-16

Cimiento incremental y cero fricción. Una tecla que propone la mejor jugada, un AUTO que juega por ti, monedas, esquirlas y gotas de lacre que caen a la mesa y se recogen solas, una tirada de dados de hueso tras cada asalto y el **Árbol de la Conjura** en lugar de La Orden. Las reglas de combate de la 11.0 no cambian.

### Si ya jugabas
- **Tus Coronas son ahora Esquirlas de Corona** (1 Corona = 100 esquirlas) y **lo que compraste en La Orden sigue comprado**: está en la rama del Arsenal del Árbol. Un aviso te lo dice la primera vez.
- **Una campaña a medias de la 11.0 se sigue jugando.**
- **El mando cambia tres botones**: Rebobinar pasa a R3, reiniciar pide Select + Start a la vez y la pantalla completa está en Ajustes. LT es ahora Mejor jugada y Select, AUTO.
- El cooperativo usa el protocolo 12: un cliente de la 11.0 no entra en una sala de la 12.0.

### Jugar sin fricción
- **Mejor jugada** (botón junto a Golpear, `Q`, LT): elige las cartas y el trono; tú confirmas con Golpear. Su regla: si puedes dar un Golpe exacto, lo elige; si no, tu Golpe más alto. No usa cartas especiales ni el Comodín.
- **Marca de corona** en las cartas de la mano que pueden dar un Golpe exacto ya.
- **AUTO** (conmutador junto a la velocidad, `A`, Select): juega el mismo bot que usa el laboratorio de balance. Apagado al abrir; cualquier clic, toque, tecla o botón te devuelve el control (mediana de 13–17 ms). **Auto-saquear** y **Auto-taberna** son dos opciones aparte en Ajustes. No existe en el Asalto diario ni en cooperativo.
- **Velocidad 8×** (1× → 2× → 4× → 8×).

### Lo que cae, los huesos y el Árbol
- **Lo que cae a la mesa**: cada golpe suelta 1 esquirla; cada guardia abatido, 1 moneda y 2 esquirlas; cada Golpe exacto, 5 esquirlas y 1 gota de lacre; cada monarca vencido, 25 esquirlas. Se recoge pasando el cursor o el dedo, o solo a 1,0 s. Con mando y con AUTO, siempre solo. Ya está cobrado antes de recogerlo.
- **La bolsa** de la barra cuenta monedas, esquirlas y gotas. Con **3 gotas de lacre**, la Mesa de lacre sella gratis.
- **Tirada de huesos** tras cada asalto ganado: el Dado de oro (×1 o ×2) multiplica las monedas que cayeron y el Dado de la Corona (×1 a ×3 de serie) las esquirlas. Multiplicadores enteros, decididos por la semilla; se puede saltar sin perder nada.
- **Árbol de la Conjura**: 30 nodos en cuatro ramas alrededor de «La corona quebrada». **El Arsenal** (13 nodos: las 12 mejoras de La Orden y el Ojo del tasador; la Bolsa de la conjura pasa a 5 rangos) es lo único que ayuda a ganar la campaña. **La Bolsa**, **Los Huesos** y **La Corona de hierro** dan más esquirlas, mejores dados y poder en el Trono infinito. Las esquirlas se cobran también al perder. Vista general con los 30 sellos y un panel con «Comprar»; se arrastra y se amplía con ratón, dedo, teclado y mando.

### Deuda de la 11.0
- **Golpear** es de latón (ya no choca con el carmesí de Corazones). La placa **«Inmune»** va sobre tinta maciza. Las **barras de Vida** son lisas.
- **Cifras compactas**: 1,2K · 45K · 1,8M (en inglés, 1.2K), con el número entero para lectores de pantalla.
- **Sello de pólvora**: alcanza a los tronos que tiene al lado en la mesa también con 2 y 3 tronos (antes, con tronos ausentes, no hacía nada), y la mesa lo enseña antes de golpear.
- La cuenta dice el **Impulso** del Golpe exacto sobre el guardia siguiente («Impulso −58 al siguiente»): el aviso del trono y la cuenta ya suman lo mismo.
- La portada inglesa dice **«Original edition · SANGRE Y PALO»**.
- Toda descripción cabe en **100 caracteres** en los dos idiomas (antes 115).

### Balance (laboratorio, 51.640 campañas, sin avisos)
- Reinado 1: **30,2 %** con el Árbol vacío y **46,5 %** con el lleno. Reinado 8: 7,3 % y 14,8 %. Campaña estimada: **19,1 minutos**.
- La línea «Asalto ganado» del Botín paga menos (0, 1, 2, 3 y 4 en los asaltos 1 a 5): ese oro llega ahora como monedas que caen y por el Dado de oro. Oro medio por campaña: +4,1 % sobre la 11.0.
- La Bolsa de la conjura da 1 de oro inicial por rango (5 rangos). Llenar el Arsenal cuesta 11.500 esquirlas: una mediana de 7 campañas.
- Una primera derrota deja unas 500 esquirlas entre el cobro y lo que cayó: compra varios rangos.

### Por dentro
- **QA visual reproducible**: dos corridas seguidas dan las mismas capturas byte a byte salvo 1 a 4 de 236 con un puñado de píxeles de borde (`npm run qa:determinista`).
- 60 fps con 40 piezas en pantalla; sin fotograma en frío de más de 50 ms (el primer golpe del móvil baja de ~250 ms a 12 ms).
- **Guardianes anti-cuelgue**: cada script de puertas tiene tope duro (`scripts/guardian.ts`) y cualquier orden se puede lanzar con `node scripts/con-tope.mjs <segundos> …`, que mata el árbol de procesos si se pasa.
- 365 pruebas más 9 de cooperativo; humo en español y en inglés con una campaña entera jugada en AUTO.

### Lo que no mejoró o quedó a medias
- **«Buen ojo»** (Golpe exacto aunque te pases por 1 o 2) y **«Manga honda»** (2 cartas en La Manga) solo actúan en el **Trono infinito**: dentro de la campaña subían el Árbol lleno al 70 % de victorias (objetivo 42–48 %). Buen ojo solo, sobre el Árbol vacío, llevaba el Reinado 1 de 30,2 a 41,8 % y los Golpes exactos por asalto de 0,84 a 1,51: queda como candidato a regla base para una versión futura.
- Los Golpes exactos por asalto siguen como en la 11.0 (0,82 con el Árbol vacío).
- La Mejor jugada no sabe usar cartas especiales ni el Comodín.
- En un navegador recién abierto, la primera mesa puede tardar unos 2 segundos en asentarse.
- El Árbol tiene 14 nodos de cinco rangos; los otros 16 son llaves de uno a tres rangos.
- Sigue sin probarse con personas ni en una Steam Deck física, y el inglés sin revisar por un hablante nativo.

## 11.0.0 — 2026-11-15

Simplificación radical. Por primera vez desde la 6.0 cambian las reglas, y cambian para quitar cosas: Multi siempre entero, una sola regla de palos, dos estados, cartas numeradas de cara limpia con cuatro colores y una campaña de cinco asaltos. Motivo: siete versiones de interfaz con las reglas congeladas subieron la claridad (4,62 → 5,01) y no la aprobación (28,8 → 29,2 %, censos de 240). Encargo del usuario en `artifacts/mision/MISION-V11.md`; especificación y cierre en `SPECS/V11.md`; candidata `16fe20a`; puertas en `artifacts/mision/v11/puertas.md`.

### Si ya jugabas
- **La rueda de ventaja ya no existe.** Ningún palo pega doble a otro. Queda una regla: contra el trono de su palo, una carta hace 0 (es Inmune); contra los demás, su número.
- **Tres estados pasan a dos.** Brecha pasa a llamarse **Expuesto** y ahora dobla el Daño. Desarmado pasa a ser **Aturdido**: se salta un solo Contraataque. En guardia desaparece.
- **Ocho asaltos pasan a cinco.** La campaña dura unos 19 minutos (antes, unos 32).
- **Tu progreso se conserva**: La Orden, las Coronas y lo comprado, la colección, los logros, las maestrías, los ajustes y el Archivo de crónicas.
- **Una campaña a medias de la 10.0 se cierra** al abrir el juego: cobras las Coronas de lo que superaste y un aviso te lo dice. Los récords de asalto alcanzado pasan a contar sobre 5.

### Reglas
- **Multi siempre entero**: carta sola ×1; As cómplice, grupo, escalera y doble par ×2; color, full y escalera de color ×3; póker ×4. Golpe = Daño × Multi, sin redondeo. El Pergamino solo sube Daño.
- Racha de Golpes exactos: +1 de Multi por eslabón, hasta +3. **Asedio final**: desde el turno 10, cada 2 turnos, +40 de Daño y +1 de Ataque por nivel (antes, +0,25 de Multi). Acabados: Templado +1 de Multi, Lacre policromo ×2, Cristal maldito ×3.
- **Poderes de palo sin dividir**: cada ♣ da +2 de Escudo, cada ♥ cura 2, cada ♦ salpica 2 a los otros tronos; ♠ sigue perforando. Un 2♥ cura lo mismo que un 10♥.
- **Expuesto** (lo deja un golpe de un solo palo con 2 cartas o más): el próximo golpe contra ese trono hace ×2 de Daño. **Aturdido** (lo dejan un golpe de 3 palos, el Motín del Comodín y El Espía): se salta su próximo Contraataque.
- **Cinco palabras clave** (antes seis): Daño, Multi, Golpe exacto, Expuesto, Aturdido.
- **52 reliquias**, 13 rediseñadas y ninguna retirada. El Barril de pólvora ya no lee la ventaja: cada guardia abatido salpica 6 a los otros tronos. El Pasadizo hace que un golpe no respete Inmune. Gota de veneno y Máscara de traidor siguen perforando o invirtiendo la inmunidad. Descripción más larga: 100 caracteres en español, 104 en inglés.
- **El Inquisidor**: «Ningún trono queda Aturdido» (antes, todos llegaban En guardia). **Reinado 4**: «Reyes acorazados», los Reyes de los asaltos con monarca tienen un 25 % más de Vida.

### Campaña
- **Cinco asaltos**: El Puente levadizo (2 tronos), El Patio de armas (3, monarca), La Cripta (4), La Galería real (4, monarca) y El Salón del Trono (4, el monarca como **Rey Tirano** o **Reina Tirana**). En los asaltos 1 y 2 los palos presentes se sortean al empezar y se ven en el Mapa; un trono ausente no se pinta y su Contraataque no hace nada.
- Tres monarcas por campaña (antes cuatro), sin repetir. **Secretos de la cripta** tras los asaltos 2 y 4. **Atajo** solo antes del 3. Juramentos en el 1 y el 3. Cuatro visitas a La Taberna, con 4 reliquias en oferta. El **Trono infinito** empieza en el asalto 6 y el **Asalto diario** es la campaña de cinco.
- La Vida de cada guardia se redondea al múltiplo de 5 más cercano (Sota 190 en el asalto 1).
- Logros: los mismos 36 `id`. Cambian dos condiciones: «Adiós, carcelero» pide superar el asalto 2 (antes el 3) y «Medio castillo», el 3 (antes el 5).

### Balance
Laboratorio completo: **53.240 campañas, 0 avisos** con los objetivos nuevos (huella `bb2760153dc4d238`, cuarto informe completo del rebalanceo).
- Reinado 1: **29,2 % / 43,4 %** (objetivo 26–32 / 42–48). Reinado 8: 6,5 / 13,5 %. Cada Reinado gana menos que el anterior.
- Barajas: 29,2–32,1 % sin la Orden y 41,3–44,4 % con ella; la Orden suma 9,8–14,7 puntos.
- Monarcas: de ×0,84 (El Relojero) a ×1,25 (El Inquisidor) de la media (23,9 %).
- Ritmo (mediana / P95): 6/9 · 9/12 · 10/13 · 10/14 · 10/15. Peor P95 por baraja, 15 (tope 15). Nadie muere en el asalto 1; casi el 70 % de las muertes caen en el 4 y el 5.
- **Duración estimada: 18,2 minutos** con el tiempo de jugada medido en la prueba de humo (5,4 s de animación a 1×); 18,7 con el supuesto inicial. El supuesto de 12 s para decidir cada jugada sigue sin medir con personas.
- Asalto único: 62,5 · 63,6 · 59,5 · 64,3 % con 1 a 4 jugadores. Ninguna reliquia ni especial trampa o regalada.
- Palancas finales: Vida por asalto ×7,5 · 5,6 · 5,72 · 5,72 · 7,28; Ataque 2 · 2 · 3 · 5 · 5; Vida inicial 21; La Taberna más barata (4 · 6 · 8 · 11) y más oro por asalto (9). La escalera de Multi de las formaciones no se tocó.

### Cartas y mesa
- **Cartas numeradas de cara limpia** (A a 10): papel marfil en el 75,6–83,5 % de la cara, un índice grande arriba a la izquierda y un palo grande y macizo en el centro, con contorno de tinta. Las figuras, los monarcas, las reliquias y los marcos conservan el grabado. Rango de la esquina: 35,4 / 23,0 / 20,6 / 20 px en 1920 / 1366 / 1280 / 390 (+33 a +40 %), con la carta del mismo tamaño.
- **Baraja de cuatro colores** de serie: Picas negro `#161514`, Corazones carmesí `#C8232C`, Diamantes azul cobalto `#1B5E9E`, Tréboles verde `#1B6B46`. En **Ajustes → Colores de la baraja**: Cuatro colores · Clásica (la de la 10.0) · Dos tintas. Con «Alto contraste», los cuatro se oscurecen hasta ≥ 7:1.
- **Fuera de la mesa**: la rueda de palos, los sellos ×0 / ×2 / ×3 de cada carta de la mano y la placa «débil a». Inmune se ve en dos sitios: la placa «Inmune ♠» del trono y la línea «Inmune · 0» de la cuenta.
- **Tronos**: Vida 15 → 21,6 px y Ataque 20 → 27,2 px en 1280×800; 14 → 20 y 15 → 21 px en 390×844. El trono apuntado crece un 10 %. Con 2 o 3 tronos la fila se reparte entre los que hay.
- **Mapa de cinco asaltos** con los palos de cada asalto y la estampilla del Rey Tirano. La Taberna con nueve ofertas parte en dos filas.
- Tres Susurros nuevos (trono ausente, Expuesto, Aturdido): once en total. La partida guiada juega con dos tronos y cuentas enteras.
- Fluidez: el primer sello de lacre de la sesión baja de unos 55 ms a 6–12 ms; el primer tajo en móvil queda en 12–18 ms (ver Incidencias). Ningún fotograma en frío pasa de 50 ms, y `qa:fps` ahora falla si pasa.

### Inglés
- **Las 14 correcciones** de la lista para un hablante nativo: Royal Straight, False Bottom, Alchemist's Stone, Prismatic Wax, The Tally, Full House, Deadeye, Chest of Blades, Crown Jeweler, Black Market, Never Run Dry y Steady Hand, The Tavern Keeper, el orden natural de tres frases («Your max Health drops by…», «Kings' Attack rises by…», «… fewer card in hand») y el lema «A conspiracy roguelike played with a standard 52-card deck». Cero nombres viejos en `src/`.
- Partida guiada en inglés: 26,2 s con teclado, 27,3 s con ratón y 28,8 s con mando.
- Sigue sin revisarlo un hablante nativo.

### Guardado y red
- `RUN_VERSION` 4 y `META_VERSION` 3. La carga de una Meta de la 10.0 conserva mejoras, Coronas, logros, colección y maestrías; solo recorta a 5 el mejor asalto, los alcances y el diario. La devolución de Coronas sigue reservada a los perfiles de antes de la 2. Probado con un guardado real de la 10.0 (`tests/migracion.test.ts`, 11 pruebas).
- La campaña a medias de la 10.0 se cierra y abona las Coronas de lo superado (mínimo 1, tope 8), con el aviso «Tu campaña a medias era de la 10.0, de ocho asaltos…».
- Las actas viejas del Archivo se enseñan «asalto n de 8», sin nombre de sala.
- **Protocolo con versión** (`PROTOCOL_VERSION` 11): una sala rechaza a un cliente de otra versión, con el mensaje en el idioma de la mesa. Un cliente de la 10.0 no puede entrar en una sala de la 11.0.

### Puertas
- `typecheck` limpio. **314 pruebas + 9 de cooperativo** en 21 archivos. Se retira `tests/congelacion.test.ts`; nacen `tests/v11.test.ts` (Multi entero en 5.000 golpes, cinco palabras clave, campaña de cinco, 36 logros, ningún texto con ventaja ni Multi decimal) y `tests/migracion.test.ts`.
- `forja` limpia (169 piezas × 2 tamaños). `docs`, `og`, `build` y `build:web` en verde.
- QA visual: **196 capturas** (49 estados × 4 ventanas) en español y otras 196 en inglés, 0 fallos, 0 recortes. Reglas nuevas: «cara-limpia», «paleta», «daltonismo», «inmune», «estados», «ataque», «apuntado» y «tronos». 14 avisos de «daltonismo», por diseño: la forma del palo va siempre con el color.
- Prueba de humo: **322 comprobaciones** en español y 322 en inglés, «Todo en orden», con una campaña entera de cinco asaltos jugada por el bot con el ratón.
- `qa:fps` «60 fps: todo en orden»; frío máximo 42,5 ms. `qa:audio` «La música no cansa: todo en orden».

### Panel en español y en inglés
Panel adaptado a la 11.0 antes de correr (lector y 19 escenas validados contra el motor; modo `--idioma en`; 124 pruebas). Mismas 60 personas y misma escena por persona que en la línea base; pruebas pareadas. Con n = 60 el ruido de la aprobación es de unos ±12 puntos.

**Español, 11.0 contra 10.0** (`rapido-60-20261115-135642` contra `rapido-60-20261114-185031`; 298 evaluaciones, 0 fallidas):

| | 10.0 | 11.0 | ¿Se distingue del azar? |
|---|---:|---:|---|
| Aprobación | 28,3 % (17 de 60) | **36,7 %** (22 de 60; IC95 25,6–49,3) | No: 7 pasan a aprobar y 2 dejan (McNemar p = 0,18) |
| Claridad (1–10) | 4,92 | **5,40** | **Sí**: t pareada = 2,81 |
| Diversión (1–10) | 6,32 | 6,57 | No (t = 1,45) |
| Claridad del casual (n = 12) | 4,33 | 4,83 | No (t = 1,11; hacían falta unos 0,8 puntos) |
| Steam Deck que aprueba (n = 9) | 2 de 9 | 4 de 9 | No |
| Quejas de contraste de palos | 60 menciones, 44 personas | 70 menciones, 45 personas | No baja: 7 dejan de citarlo y 8 empiezan |

- Es la aprobación más alta medida en la misión, y la claridad es el primer movimiento estadísticamente claro desde la 6.1. Ninguna de las dos cosas está confirmada con personas reales.
- Por dispositivo (aprueban · claridad): PC 7 → 9 de 21 · 4,90 → 5,52; portátil 2 → 4 de 15 · 5,13 → 5,33; móvil 6 → 5 de 15 · 5,07 → 5,67; Steam Deck 2 → 4 de 9 · 4,33 → 4,78.
- Duelos: «Una demo antes de comprar» 75 %; «El Asalto diario entre amigos» 77,5 %; «Un Golpe exacto con margen» empate (40 % a favor del margen, 50 % de pares con sesgo de posición).
- Precio justo 8,0 USD; óptimo de Van Westendorp 8,25 → 6,25; en deseados 66,7 %.
- Puerta (aprobación ≥ 18,5 %, claridad ≥ 4,56): **pasa**.

**Inglés, 11.0 contra 11.0 en español** (`rapido-60-en-20261115-142907`; 295 evaluaciones, 0 fallidas):
- Aprobación **40,0 %** (24 de 60) y claridad **5,28** (t pareada = −0,58): **el inglés se entiende igual que el español**.
- Steam Deck da **0 de 9** con las mismas nueve personas que daban 4 de 9 en español: es la medida de cuánto baila ese estrato.
- 10 menciones de traducción; de las 5 quejas explícitas, 4 son por el sello «SANGRE Y PALO» de la portada inglesa, que es la marca dual y se queda.
- El clasificador de quejas del panel busca palabras en castellano: en la corrida inglesa, las cubetas que dependen de un término del juego (Inmune, La Manga) caen por el instrumento, no por el juego.

### Lo que no mejoró
- **Las quejas de contraste no bajan** (60 → 70). Cambian de tema: las de palos y cartas bajan (25 → 20; las de la mano, 11 → 7) y aparecen otras: el botón Golpear rojo junto al carmesí de Corazones, la placa «Inmune» sobre el grabado del trono, las barras de Vida con trama. La baraja de cuatro colores casi no se cita.
- **Texto chico** sube de 62 a 82 menciones, con Golpes de tres y cuatro cifras. Reglas confusas, 42 → 53; palo Inmune, 28 → 45.
- **Golpes exactos**: de 1,6–2,1 a 0,7–1,1 por asalto. Se publica así; la V12 lo mira con datos de personas (decisión en `SPECS/V11.md`, 7.3).
- **El Golpe crece mucho más**: P99 del último asalto 944 (asalto 5 de la 10.0: 413; su asalto 8: 605), por el +40 de Daño del Asedio.
- **El Comodín se usa menos**: de 8,9 a 5,6 veces por campaña.
- Steam Deck sigue sin probarse en el aparato, y el estrato de 9 personas no permite concluir nada.

### Incidencias
- La primera sesión de `juice-ux` se cortó a medias; la segunda la retomó desde el commit de la celda anterior. `arte-ui` se quedó parada esperando un trabajo suyo y hubo que despertarla.
- **Regresión del fotograma en frío**, encontrada en la certificación: el primer tajo en 390×844 daba 237–243 ms. Causa: el calentamiento del sello se pintaba en el mismo fotograma que la mesa, el parón de golpe invalidaba el estilo de toda la mesa y solo se calentaba la primera mesa de la sesión. Arreglado en `fx.ts` y `juice.css`; candidata final `16fe20a`.
- Las marcas de maldición sobre la mesa (`src/client/guia.ts`) llevaban las cifras escritas a mano («+2» del Verdugo, «−3» del Relojero) y el rebalanceo las había cambiado; ahora salen de la configuración. Lo encontró la celda del panel.
- La caída nativa de Node en las pruebas de cooperativo repitió una vez la pasada, como prevé `scripts/test.mjs`.
- Pendiente: el bloque de balance del `README.md` aún dice los objetivos de la 10.0 (lo escribe `scripts/reglas.ts` con los números a mano). Celda de cierre para `reglas-balance` en `SPECS/V11.md`.

### Estudio
- Orden: director → reglas-balance (bloques A, B y C) → arte-ui → juice-ux → puertas → dos auditorías del panel → arreglo del frío → cierre. Commit local tras cada celda y entre bloques. Bitácoras en `artifacts/mision/v11/`.
- Constitución de la V11 (`tests/invariantes.test.ts` y `tests/v11.test.ts`): ≤ 5 palabras clave, ≤ 56 reliquias, descripciones ≤ 115 en los dos idiomas, P95 ≤ 15 en los cinco asaltos y por baraja, Multi siempre entero. La V11 añade una idea (tronos ausentes en los asaltos 1 y 2) y retira cuatro sistemas: la rueda, En guardia, los divisores de los poderes y tres asaltos.
- Los reglamentos de `.claude/` siguen con la constitución de la V10. El cambio se le propone al usuario, listo en `artifacts/mision/v11/parche-reglamentos.mjs`.
- Documentos: [`ROADMAP_V11.md`](ROADMAP_V11.md) y [`EVOLUCION_V11.md`](EVOLUCION_V11.md).

## 10.0.0 — 2026-11-14

Candidata de lanzamiento con funciones congeladas: el juego entero en español y en inglés, alto contraste, arreglos de Steam Deck y portátil, y la envoltura de escritorio preparada para Steam. **Ninguna mecánica nueva y ningún número cambiado**: los seis archivos de la huella del laboratorio no se tocaron (`git diff v9.0.0` vacío) y el laboratorio sale idéntico al de la 9.0. Motivo: el paso 5 del encargo; los duelos de la 9.0 («Jugar en inglés», 86,7 %; «Modo de alto contraste», 100 %); y Steam Deck, 0 de 9 en cuatro corridas seguidas. Candidata `20dbf5f`, arreglos del censo en `edbbf4c`; puertas en `artifacts/mision/v10/puertas.md`.

### Español e inglés
- **`src/shared/i18n.ts`** con tipos: `getLang`, `setLang`, `onLangChange`, `t`, `numFor`. El idioma se decide en un solo sitio, no en la constante `LOCALE` fijada al cargar.
- **1.479 claves por idioma**: 618 de reglas (reliquias, especiales, monarcas, palabras clave, partida guiada, causas, errores), 768 de pantalla y 93 de avisos, guía y voces.
- **El español es letra por letra el de la 9.0** (`tests/textos-es.json`). El inglés se escribió a mano con el glosario de `SPECS/V10.md` (1.3): Spades / Diamonds / Hearts / Clubs, Health, Shield, Counterattack, Damage × Mult, Exact Hit, Up the Sleeve. En inglés la coma decimal pasa a punto (×3.65).
- Las descripciones inglesas con cifras son plantillas que se rellenan con los mismos números de `BALANCE`: texto y motor no se pueden separar.
- **Paridad** (`tests/i18n.test.ts`, 24 pruebas): mismas claves, ninguna vacía, mismas variables, mismas cifras, descripciones inglesas ≤ 115 caracteres (la más larga, 104), nombres ingleses ≤ 24, cero restos de español.
- **Conmutador ES | EN** en la Portada y en Ajustes («Idioma · Language»). Cambia al instante, sin recargar, y se recuerda (`derrumbe:idioma`). Por defecto, el idioma del navegador; en pruebas, español. El candado sigue al idioma: en inglés, BLOOD & SUITS con la cinta SANGRE Y PALO.
- Tarjetas para compartir en los dos idiomas: `public/og-card-es.png` y `public/og-card-en.png` (1200 × 630). `og-card.png` sigue siendo la española.
- Sin traducir, a propósito: `REGLAS.md`, `README.md`, `index.html`, el manifest y el nombre por defecto CONJURADO.
- **Del inglés no hay ninguna medida de jugadores, ni simulados**: el panel lee el juego en español. Ningún hablante nativo ha revisado los textos.

### Accesibilidad
- **«Alto contraste»** (ajuste nuevo, `settings.contrast`, clase `contraste` en `<html>`): tinta negra sobre papel claro, bordes y tramas más gruesos, mesa sin textura. Arranca encendido con `prefers-contrast: more`. No mueve la maquetación: los bloques principales quedan a ± 1 px de `mesa`. Texto de juego ≥ 7:1 (regla «contraste-alto» en `mesa-contraste`).
- Comprobados y en verde: 4 tintas y 2 clásicas con tramas (`mesa-2tintas`), «Reducir movimiento», contraste AA en todo texto y ≥ 7:1 en cifras y palos, nombre y rol en cada control, orden de tabulación igual al de lectura.
- Conmutador de idioma y «Alto contraste», alcanzables y pulsables con teclado y con mando.

### Steam Deck y portátil
- **SD1 · Mesa de lacre entera**: las 40 cartas sin desplazar en 1920, 1366 y 1280 (regla «forja-entera»).
- **SD2 · Ajustes en dos columnas** desde 1200 px: todas las filas a la vista sin desplazar, también las dos nuevas (regla «ajustes-entero»).
- **SD3 · Tres pesos** para Golpear, Descartar y Soltar, a 12 px entre sí. Golpear 48 px de alto; en 1366×768 las demás, 44 px (con 48 la bandeja pisaba «Tu Vida»). Regla «acciones».
- **SD4 · Placas de ventaja** «×3» / «×0» opacas, con cifra ≥ 16 px y ≥ 7:1; Daño y Multi de la cuenta ≥ 20 px (reglas «ventaja» y «cuenta»).
- **SD5 · Insignias del mando en La Taberna**: lo enfocado lleva Ⓐ y su verbo (Comprar, Elegir…) y la insignia se mueve con el foco.

### Escritorio y Steam
- **`tauri/`**: configuración de Tauri v2 (`tauri.conf.json`, `Cargo.toml`, `build.rs`, `src/main.rs` sin Steam, permisos e iconos). Empaqueta `dist/web`. **No se compiló**: no se instaló Rust.
- **Puente de escritorio** en `src/client/platform.ts`: `tauriPlatform()` llama a seis comandos `steam_*` (logros, idioma, capa, presencia, subir y bajar la nube) solo si existe `window.__TAURI__`. Si un comando falta o falla, hace lo de la web. El título de la ventana sigue al idioma.
- 15 pruebas: `tests/tauri.test.ts` (6) y `tests/platform.test.ts` (9, con un `invoke` falso).
- Falta todo lo que pide una cuenta de Steamworks: AppID, SDK, logros dados de alta, depósitos, compilación y firma. Detalle y pasos en [`STEAM_BUILD.md`](STEAM_BUILD.md).

### Pulido
- V7-1: el total de la cuenta deja el amarillo y pasa a papel con tinta y filete rojo (≥ 7:1).
- V7-2: rótulos con unidad («−12 DE VIDA», «ASEDIO EN 2 TURNOS»).
- V7-3 a V7-5: índices de la mano ≥ 15 px en móvil, cifras del HUD ≥ 16 px, ninguna insignia del trono partida con guion.
- V7-7: con «Alto contraste», la mesa va sin textura. V7-8 y V8-8: la forja, sin esos avisos.
- V8-5: la pasada de lámina con el foco, también en móvil (p95 6,2 ms en 390×844). V8-6: sombra pintada en vez de `drop-shadow`. V8-9: el hueco de la mesa en 390 se reparte.
- V8-7: el primer temblor de la mesa en frío baja de 230 ms a 30–42 ms (`warmTable()`). Queda un fotograma de unos 55 ms la primera vez que cae un sello caliente en 1920×1080 (una vez por sesión; no puntúa).

### Arreglos del censo (`edbbf4c`)
Triaje del Director sobre los 3 P0 de la síntesis y los 107 de las auditorías, medidos en las capturas y en el DOM (`artifacts/mision/v10/triaje-medidas.json`):
- **La cuenta no cuadraba.** La línea plegada decía «54 × 3,7» con un Golpe de 197; el Multi real era 3,65. Ahora, con dos decimales: «54 × 3,65 = 197». Lo citaban 24 de 36 personas de Steam Deck, 24 de 48 casuales y 37 de 60 de portátil.
- **Palos de la esquina chicos.** El contraste cumplía (7,9:1 a 13,8:1), pero el palo medía de 7 a 13 px y la insignia de orden, 13 px. Ahora, ≥ 14 px (10 en móvil) y ≥ 16 px (14 en móvil), sin cambiar la carta.
- **Pie de la Crónica tapado** en 1366 y 1280: se veían de 11 a 39 px de los 44 de cada botón. Ahora la fila queda pegada al pie de la hoja.
- Sin base, medidos: barras de la causa (14 px, 13,8:1) y dianas en móvil (48 px, a 12 px del borde).
- Reglas nuevas de QA: «cuenta» ampliada, «esquina» y «acta-pie». Contra el código de antes dan 20, 64 y 24 fallos.

### Puertas
- `typecheck` limpio. **309 pruebas** en 20 archivos (antes 254 en 16).
- `forja`: 169 piezas × 2 tamaños, limpia (6 avisos de densidad ya conocidos). `docs`: sin cambios. `og`, `build` y `build:web` compilan.
- `analyze:meta`, corrido entero: 55.640 campañas en 1.441 s, 0 avisos, peor P95 de los asaltos 4–8 por baraja 18 (tope 19). **Idéntico número a número al de la 9.0**; huella `aed6a8feb2f230d1`, sin cambios.
- Constitución, en los dos idiomas: 6 palabras clave, 52 reliquias, toda descripción ≤ 115 caracteres. `tests/congelacion.test.ts`: cero identificadores añadidos o quitados.
- QA visual: **172 capturas** (43 estados × 4 ventanas) en español y otras 172 en inglés (`artifacts/visual-qa-en/`), 0 fallos, 0 recortes, 0 avisos; regla «fuga» sin excepciones. Estados nuevos: `portada-idioma`, `mesa-contraste` y `mesa-2tintas`.
- Prueba de humo: **306 comprobaciones** en español y 306 en inglés, «Todo en orden». Partida guiada (tras los arreglos): 29,0 s con teclado, 29,2 s con ratón y 32,3 s con mando en español; 29,1 · 29,1 · 32,8 s en inglés (tope 60 s).
- `qa:fps`: «60 fps: todo en orden» en tres pasadas seguidas. `qa:audio`: «La música no cansa: todo en orden».
- Segunda certificación tras los arreglos: todas las anteriores salvo `analyze:meta`, `docs`, `og` y `qa:audio` (no se tocó nada de lo que miden), en verde.

### Incidencia: Node se cae en las pruebas de cooperativo (Windows)
- Síntoma: `npm test` daba a veces 307 de 309. El proceso de `tests/coop-estres.test.ts` moría con el código `0xC0000409`, sin mensaje (5 de 24 pasadas sueltas).
- Diagnóstico: se reproduce fuera de Vitest (2 de 30). Muere siempre al abrir una conexión WebSocket de cliente. Con el servidor de salas en su propio proceso, en 22 pasadas murió 4 veces el de los clientes y ninguna el servidor; 3.000 conexiones contra el servidor del juego, sin caída. Es Node 24.15.0 en Windows al abrir conexiones salientes, que el servidor real no hace.
- Arreglo: `npm test` es ahora `node scripts/test.mjs`. Corre todo menos cooperativo y después cooperativo aparte; si esa pasada muere con esa firma exacta, la repite (hasta 3 veces). Una aserción fallida o un tiempo agotado no se repiten. 14 pasadas seguidas en verde, 2 tras un reintento. Margen de 30 s por prueba. **No comprobado en Linux.**

### Panel simulado: censo de 240
Corrida `v6-completo-20261114-041529` sobre `20dbf5f`: 1.014 evaluaciones, 0 fallidas, 103,5 min (cortada en la 64 por un reinicio de la máquina y retomada con `--resume`). El panel se adaptó a la 10.0 antes de correr (conmutador, alto contraste, tres hipótesis de lanzamiento). Las personas leen el juego en español.
- **Aprobación: 29,2 %** (70 de 240; IC95 23,8–35,2). Puerta ≥ 17,1 %: **pasa**.
- **Claridad media: 5,01** (IC95 de las reseñas 4,85–5,17). Puerta ≥ 4,93: **pasa**, por poco.
- **Contra el censo de la V4** (las mismas 240 personas, otro juego y otro instrumento): aprobación 28,8 → 29,2 %, **no se mueve**; claridad 4,62 → 5,01, **sube** (IC95 4,47–4,76 contra 4,85–5,17: no se tocan).
- **Las mismas 60 de las auditorías rápidas**, dentro del censo: aprobación 26,7 → **30,0 %** (18 de 60; IC95 19,9–42,5); claridad 5,30 → **5,10**, dentro del ruido de n = 60. 46 de las 60 vieron la misma escena que en la 9.0.

| Dispositivo | Aprobación | IC95 | n | Claridad |
|---|---:|---|---:|---:|
| PC 1080p con ratón | 41,7 % | 31,7–52,3 | 84 | 5,27 |
| Portátil 1366×768 | 23,3 % | 14,4–35,4 | 60 | 4,88 |
| Móvil 390×844 | 28,3 % | 18,5–40,8 | 60 | 4,78 |
| Steam Deck 1280×800 | 11,1 % (4 de 36) | 4,4–25,3 | 36 | 4,97 |

| Arquetipo | Aprobación | IC95 | n | Claridad |
|---|---:|---|---:|---:|
| Streamer / creador | 47,4 % | 32,5–62,7 | 38 | 5,16 |
| Veterano de mazos | 34,9 % | 22,4–49,8 | 43 | 5,26 |
| Especialista de interfaz | 32,4 % | 19,1–49,2 | 34 | 5,29 |
| Adicto al combo | 30,2 % | 18,6–45,1 | 43 | 5,30 |
| Casual de navegador | 16,7 % | 8,7–29,6 | 48 | 4,29 |
| Purista de mesa | 14,7 % | 6,4–30,1 | 34 | 4,88 |

- **Steam Deck: 4 de 36, igual que en la V4.** Con las nueve de las auditorías rápidas, 0 de 9 por quinta corrida seguida.
- Quejas (menciones en 240 reseñas): contraste y color de palos 290 · texto chico 247 · fatiga visual 183 · palo Inmune 165 · reglas confusas 153 · objetivos táctiles 65. En la V4: contraste 205 · texto chico 355 · fatiga 205 · reglas confusas 187 · táctiles 86. El contraste sube aunque las medidas cumplen.
- Precio justo (mediana): 8,0 USD. Van Westendorp: óptimo 8,19, indiferencia 8,13, piso 4,25, techo 14,82 USD. En deseados: 62,5 %.
- Hipótesis de lanzamiento (V11), a favor de la propuesta: demo con los tres primeros asaltos **81,2 %**, Asalto diario entre amigos **70,0 %**, campaña corta de cuatro asaltos **63,1 %**. Sesgo de posición alto, 38,8 % de los pares: son pistas.
- El panel no se repitió tras los arreglos: son de presentación, con su regla de DOM, y una auditoría de 60 (±12 puntos) no los distinguiría.

### Estudio
- Orden de celdas: director → reglas-balance → arte-ui → juice-ux; después, puertas, censo, triaje, arreglos de `arte-ui` (a `juice-ux` no le tocó ninguno) y segunda certificación. Bitácoras en `artifacts/mision/v10/`.
- Regla nueva para quien toque `src/rules/`: ningún archivo que importe el motor y que el motor importe puede importar `src/shared/i18n` (ciclo de importación; ver la bitácora de `reglas-balance`).
- Documento de evolución de la misión: [`EVOLUCION_V4_V10.md`](EVOLUCION_V4_V10.md).

### Abierto
- **Steam Deck**: 4 de 36 en el censo; nadie lo ha probado en el aparato.
- **Contraste percibido**: la queja sube (205 → 290) con las medidas en verde.
- **El casual**: 16,7 % de aprobación.
- **El inglés**: sin revisión de un hablante nativo y sin ninguna medida de jugadores.
- **La envoltura de escritorio**: sin compilar ni probar; sin cuenta de Steamworks.
- El fotograma de ~55 ms del primer sello caliente en 1920×1080.
- La caída de Node en Windows: rodeada, no resuelta; sin comprobar en Linux.
- En la Crónica de 1366×768, el bloque de feedback queda a medias bajo el pie pegado (se alcanza desplazando la hoja).

## 9.0.0 — 2026-11-13

El balance vive en un archivo, una herramienta propone ajustes acotados, amigos y familia mandan su partida en un toque y la conjura de cuatro aguanta un corte de red. Ningún número de juego cambió: el laboratorio sale idéntico al de la 8.0. Motivo: el paso 4 del encargo y lo que la 8.0 dejó abierto en las capturas de Steam Deck. Candidata `76f628c`; puertas en `artifacts/mision/v9/puertas.md`.

### Balance en un archivo
- **`src/rules/balance-config.json`: 244 números**, tipados en `src/rules/balance-config.ts` (`BalanceConfig`, `BALANCE`). Salen de `STAGES`, `ASCENSIONS`, `FATIGUE`, `CLAUSURA`, `TIMBRE`, los decretos de los siete monarcas, los precios de La Taberna, las mejoras de La Orden, las barajas, las formaciones, la mesa, el golpe, los acabados, el Asalto único, 39 reliquias (44 cifras) y 25 especiales (23 cifras).
- Las descripciones con cifras son plantillas `{campo}` que se rellenan con esos mismos números: texto y valor no se pueden separar.
- `tests/balance-config.test.ts` (17 pruebas): tipos y rangos de cada sección, constitución con los textos ya rellenos y, con todos los números +1, que el motor y los textos leen los nuevos.
- **Laboratorio idéntico al de la 8.0**, número a número: 55.640 campañas en 1.565 s, 0 avisos, peor P95 de los asaltos 4–8 por baraja 18 · 18 · 18 · 17 · 16 · 17 (tope 19). Solo cambia la huella de las reglas (`e04abd9ae124f715` → `aed6a8feb2f230d1`), porque desde la 9.0 también suma los valores del JSON.

### Autoajuste
- **`npm run balance:tune`** (`scripts/auto-balance.ts`): un campo cada vez, de 23 afinables, dentro de ±15 %; sondeos con n = 200 y confirmación con n = 1.500. Lee los objetivos de la misma lista que los avisos del laboratorio (`scripts/objetivos.ts`). Por defecto **solo propone** (`artifacts/balance-tune/propuesta.json` y `.md`) y comprueba que la suma SHA-256 de `balance-config.json` no cambia; escribe solo con `--aplicar`.
- **Ejecución real (`--minutos=30`): 1 s, propuesta vacía.** Todos los objetivos se cumplen en el punto de partida (n = 1.500). Márgenes más justos: Reinado 1 con la Orden vacía 29,7 % (0,3 hasta 30), Reinado 8 vacía 6,8 % (0,8), ritmo del asalto 2 en el borde (mediana 8), Asalto único con 2 y 3 jugadores a 0,5 puntos. **No se aplicó nada.**
- Coste medido: una confirmación con n = 1.500, 17,6 min; un sondeo, unos 2,5 min.
- **Hipótesis del panel descartada** (`STAGES[0].hp` 3,93 → 3,0 y `FATIGUE.start` 8 → 10, fuera de ±15 %, medida con `--probar` y n = 1.500): saca 5 objetivos de su rango (Reinado 1 vacía 34,5 %, mediana del asalto 1 de 6 a 4 turnos, baraja negra 33,1 y 48,4 %, baraja corta 33,5 %) y no arregla ninguno.
- `tests/auto-balance.test.ts` (10 pruebas, sin laboratorio): nunca pasa de ±15 %, sin `--aplicar` no escribe y con `--aplicar` solo escribe lo confirmado.

### Telemetría de prueba
- **`src/client/telemetry.ts`**: un registro por campaña, guardado **solo en este equipo** (`derrumbe:telemetria`, las 10 últimas). Lista cerrada de 21 campos: versión, día (sin hora), modo, jugadores, baraja, Reinado, semilla, resultado, asalto, turnos, partida guiada y sus segundos, picos de duda por asalto, reliquias ofrecidas, elegidas y saltadas, La Manga, Rebobinar, causa de la derrota, tipo de entrada y tamaño de ventana (redondeado a 10 px). Ni nombres, ni código de sala, ni identificadores, ni texto libre.
- Medido: un registro de una campaña entera, **657 bytes** (tope 5 KB); el módulo minificado, 4.988 bytes.
- **Botón «Enviar Crónica / Feedback de Prueba»** en la Crónica (victoria y derrota) y en Ajustes, con ratón, teclado y mando. Fila **«Datos de prueba»** en Ajustes: cuántas campañas y cuántos kB, «Ver» (el JSON tal cual, de solo lectura) y «Borrar». Sin interruptor de envío: el único envío es el botón.
- **Red**: 0 peticiones sin pulsar, en cualquier compilación. Con la compilación normal, 0 también al pulsar: copia un resumen de ≤ 6 líneas y descarga `sangre-y-palo-feedback-AAAA-MM-DD.json` (en móvil, la hoja de compartir). Con `VITE_TELEMETRY_URL`, exactamente 1 POST por pulsación, con el registro y nada más. Lo comprueban `tests/telemetria.test.ts` (9 pruebas) y la prueba de humo con la red cortada, pulsando los botones de verdad.

### Cooperativo
- `startServer({ port, botDelayMs, seed })`: importar el servidor ya no abre ningún puerto; `npm start` y `npm run dev:server` siguen igual.
- Cada estado viaja con su resumen (`stateHash`, `src/rules/state-hash.ts`). Si el del cliente no cuadra, pide el estado entero (`resync`) y avisa «Mesa puesta al día con el servidor».
- **`tests/coop-estres.test.ts`, 8 pruebas con WebSocket de verdad, 6,6 s**: partidas de 2, 3 y 4 hasta el final; señas en el Mapa y en La Taberna para todos los asientos; corte a mitad de turno → bot → vuelta con su mano y su Manga; **50 partidas con un corte sembrado: 50 reconexiones, 0 desincronizaciones**; misma semilla, misma partida. Verde dos veces seguidas.
- Quien entra sin nombre se llama **CONJURADO** (antes «OBRERO», del tema viejo).

### Abierto de la 8.0
- La placa «−n CAE» ya no pisa la placa de ventaja de los tronos (regla «placas»).
- En «Tu Vida», cada rótulo va encima de su barra (regla «bunker»).
- Estado nuevo `ferreteria-mando`: La Taberna con el foco del mando. Regla «foco» ampliada a él. Existe en las cuatro ventanas.
- Retirado lo que quedaba de la partida guiada vieja: `TUTORIAL_INTRO`, `say`, `after`, el modo `'intro'` y «la Maestra».
- Las cifras de La Taberna que la interfaz escribía a mano («+6 de Vida», «cada vez cuesta 1 más») salen de `BALANCE`.

### Puertas
- `typecheck` limpio. **254 pruebas** en 16 archivos, 22 s (antes 205 en 11). `build` y `build:web` compilan, con el JSON empaquetado.
- Forja: 169 piezas × 2 tamaños, limpia, 9 avisos ya conocidos. `npm run docs`: sin cambios.
- QA visual: **160 capturas** (40 estados × 4 ventanas), 0 fallos, 0 recortes. Estados nuevos: `acta-feedback`, `ajustes-prueba` y `ferreteria-mando`. Reglas nuevas: «placas», «bunker» y «feedback».
- Prueba de humo: **272 comprobaciones**, «Todo en orden» (ratón, teclado, mando virtual, «Reducir movimiento» y telemetría con la red cortada). Partida guiada: 29,1 s con teclado y ratón, 33,0 s con mando.
- `qa:fps`: «60 fps: todo en orden». `qa:audio`: «La música no cansa: todo en orden».

### Panel simulado contra la 8.0
Corrida `rapido-60-20261113-222433` (commit `76f628c`) contra `rapido-60-20261113-164104` (8.0): mismas 60 personas y mismo reparto de escenas. 286 evaluaciones, 0 fallidas, 31,9 min.
- **Cambios del instrumento.** El lector del juego se rehízo: la 9.0 sacó los números a `balance-config.json` y el panel ahora le pide al juego sus datos ya resueltos (comprobado clave por clave contra la 8.0: 0 defectos). Audita 3 pantallas nuevas (`acta-feedback`, `ajustes-prueba`, `ferreteria-mando`). El duelo de enviar la Crónica ya no se vota, porque el juego lo trae.
- **Aprobación: 25,0 % → 26,7 %** (15 → 16 de 60; IC95 17,1–39,0; el de la 8.0, 15,8–37,2).
- **Claridad media: 5,20 → 5,30** (IC95 calculado de las 60 reseñas: 4,91–5,49 en la 8.0 y 4,93–5,67 en la 9.0).
- **Veredicto: sin regresión.** Las dos suben dentro del ruido de n = 60: no es una mejora probada. La 9.0 es de infraestructura y no prometía mover estas cifras.
- Por dispositivo (claridad · aprobación): PC (n 21) 5,33 → 5,48 · 33,3 → 28,6 %. Portátil (n 15) 5,20 → 5,07 · 13,3 → 13,3 %. Móvil (n 15) 5,47 → 5,27 · 40,0 → 53,3 %. Con n ≤ 21, nada de esto es una diferencia probada.
- **Steam Deck, aparte (n 9): 0 de 9 por cuarta corrida seguida.** Su claridad pasa de 4,44 a 5,33 (IC95 4,07–6,60), pero **no es comparable**: desde la 9.0 su escena enseña solo capturas con mando (`mesa-mando`, `ferreteria-mando`, `ajustes`), y en la 8.0 enseñaba `mesa` y La Taberna con ratón. La subida no se atribuye al juego.
- Quejas por cubeta: **texto chico 75 → 87** · contraste 68 → 59 · fatiga visual 53 → 46 · reglas confusas 38 → 43 · palo Inmune 38 → 40 · La Manga 14 → 23 · mando / foco 10 → 17 · objetivos táctiles 18 → 16 · Reliquias 9 → 13. La de texto chico es la que más sube y sigue siendo la primera.
- Precio justo (mediana): 8,0 → 8,0 USD. Van Westendorp: óptimo 6,0 → 6,25 USD; indiferencia 8,22 → 8,82 USD. En deseados: 58,3 → 61,7 %.
- Duelos A/B (los dos miran a la V10): «Jugar en inglés», 86,7 % por la propuesta (IC95 78,3–93,3); «Modo de alto contraste», 100 %. Sesgo de posición: 13,3 % de los pares.
- La propuesta de balance del panel (Ariete 4 → 3, peso de las Comunes 50 → 40) pasa de ±15 % y no arregla ningún objetivo roto: descartada.

### Estudio
- Orden de celdas: director → reglas-balance → juice-ux → arte-ui. Bitácoras en `artifacts/mision/v9/`. La prueba de humo de `juice-ux` llamaba a la telemetría por un enganche de QA, y `arte-ui` añadió después la pasada que pulsa los botones de verdad.
- La primera sesión de `arte-ui` se cortó por un fallo de autenticación. Se retomó desde el árbol guardado y terminó con todas sus puertas en verde.
- Corrección del Director: en el cierre de la 8.0 se dio por «sin base» la «fila de Tréboles cortada». Las capturas `forja` de 1366×768 y 1280×800 la enseñan: la Mesa de lacre no cabe sin desplazar. Pasa a la V10 (`SPECS/V10.md`, SD1).
- Pendiente para la V10 (`SPECS/V10.md`, apartado 1.2): Steam Deck no aprueba y la queja de texto chico sube. Arreglos concretos, con su captura y su regla de QA.

## 8.0.0 — 2026-11-13

Golpes con tajo, esquirlas y lacre a 60 FPS, música por generador y foco del mando de papel y tinta. Sin cambios de reglas: `src/rules/` no se tocó y el laboratorio sigue idéntico al de la 6.1 y la 7.0. Motivo: el paso 3 del encargo (sensación de golpe y tres horas de música sin fatiga) y lo que dejó abierto la 7.0 (foco del mando en Steam Deck, bocadillo del monarca sobre los tronos, barra del pulgar en móvil).

### Coreografía del golpe
- **Guardia abatido**: el naipe se parte en diagonal en dos mitades grabadas y tres astillas de papel (760 ms a 1×). Sustituye al clon con `clip-path` y a los cuadrados de color. Pausa de impacto de 60–80 ms (antes 45–65), sin filtro. En un Golpe exacto, temblor contenido (0,5).
- **Trono caído**: la corona se parte en dos y estalla en 10 esquirlas con la trama de su palo. Medido en la prueba de humo: **1.142 ms a 1×, 595 ms a 2× y 311 ms a 4×** (tope 1,2 s a 1×; a 2× y 4×, proporcional ± 15 %).
- **Reserva de piezas**: tras el primer golpe, diez golpes más crean 0 nodos nuevos y no dejan ninguna pieza suelta.
- **Cadena de Golpes exactos** contada en el cliente: sube de uno en uno sin el tope 4 del motor y vuelve a 0 con un golpe no exacto.

### Lacre y lámina
- **Sello de lacre caliente** en la cuenta: cae sobre la carta con rebote corto y se enfría por opacidad. Uno por sello: de pólvora, de eco, de oro real y de la manga.
- **Lámina** en las cuatro cartas con acabado (Filo de plata, Templado, Lacre policromo y Cristal maldito; antes solo dos tenían brillo): una banda pintada una vez que cruza la carta con `transform`. Sustituye a `.ly.sheen`, que animaba `background-position` con `mix-blend-mode`.
- **Monedas grabadas** con canto y cara: vuelan en combate y, por primera vez, en La Taberna al comprar y al vender. Sustituyen a los cuadrados `.coin`.
- Con «Reducir movimiento», nada vuela ni tiembla, la lámina no pasa y el foco no rebota: solo fundidos y sonido (pasada propia dentro de `npm run qa:smoke`).

### Banda sonora
- Generador puro con semilla (`src/client/audio-frases.ts`): da la partitura compás a compás y el WebAudio solo la toca. Re menor eólico; el do♯ solo en las cadencias.
- Un juego de motivos por asalto (antes, la misma melodía transportada en los 8). Escena nueva para el **Mapa del castillo** (antes sonaba como la portada); laúd y bajo en el Mapa y en La Taberna; tambores de guerra y metales ante un monarca o con presión > 0,6.
- Foley nuevo: tajo, carta a La Manga y de vuelta, sello de lacre y lámina. La campana del Golpe exacto **sube un semitono por exacto seguido, hasta +7**.
- `npm run qa:audio` (nuevo, solo CPU, 0,5 s): guion de unas 3 h × 3 semillas (1, 2 y 3). **Tramo repetido más largo: 3,3 s** (un compás; tope 30 s, comparación invariante al transporte). **Secuencia idéntica de efectos más larga: 1** (tope 8). Todas las notas en re menor. Motivos distintos en cada asalto.

### Rendimiento
- `npm run qa:fps` (nuevo): Chromium con aceleración real (ANGLE, RTX 3090, D3D11); falla si el renderizador es por software. Refresco en reposo 6,1 ms; umbral p95 ≤ 17,2 ms y ningún fotograma > 50 ms. 52,6 s. Sustituye al umbral de `GPU=1` de la prueba de humo.
- Media / p95 / máximo en ms (`artifacts/mision/v8/fps.json`). **0 fotogramas > 50 ms** en las 15 medidas que puntúan:

| Escenario | 1920×1080 | 1280×800 | 390×844 |
|---|---|---|---|
| Golpe con tajo | 6,73 / 12,1 / 24,3 | 6,62 / 6,2 / 42,5 | 6,58 / 6,2 / 42,6 |
| Caída de un trono | 6,93 / 12,2 / 12,3 | 7,01 / 12,2 / 18,2 | 6,26 / 6,2 / 12,2 |
| Sello y lámina en la cuenta | 6,07 / 6,2 / 6,3 | 6,1 / 6,2 / 12,0 | 6,07 / 6,2 / 6,2 |
| Monedas en La Taberna | 6,07 / 6,2 / 6,3 | 6,07 / 6,2 / 6,3 | 6,07 / 6,1 / 6,2 |
| Barrido del foco con el mando | 6,1 / 6,2 / 12,1 | 6,07 / 6,2 / 6,3 | 6,07 / 6,2 / 6,3 |

- En frío (primera pasada en un perfil nuevo, no puntúa): un fotograma de 60,8 ms en 1920×1080, sello y lámina, al compilar los sombreadores. `warmUp()` lo reduce; no lo quita.
- Regla nueva «anima» en la QA visual: ninguna animación toca algo distinto de `transform` u `opacity` y ningún nodo animado lleva `filter` ni `mix-blend-mode`. Se limpiaron `styles.css`, `campaign.css` y `juice.css`; la lista de pendientes quedó vacía.

### Abierto de la V7
- **A1 · foco del mando.** El marco de latón de 3 px pasa a papel de 4 px con filete de tinta (8 px en total). La carta enfocada se eleva. Prueba de humo: el foco llega en 1 fotograma en cada pulsación de la cruceta y `data-foco` está solo en la carta nueva. Regla «foco» de la QA visual en verde.
- **A2 · bocadillo del monarca.** En escritorio va en la columna lateral, junto a la placa del monarca; en 390×844, bajo la fila del monarca. Regla «voz»: no pisa ningún trono en `mesa-monarca` ni en sus siete variantes, en las cuatro ventanas.
- **A3 · 390×844.** Botones a ≥ 12 px del borde inferior y ≥ 8 px entre sí; las filas Q y K de los guardias se ven enteras. Reglas «pulgar» y «guardias» en verde.

### Puertas
- `typecheck` limpio; **205 pruebas** en verde; `build` y `build:web` compilan.
- Laboratorio: no se repitió, porque las reglas no cambiaron. `tests/invariantes.test.ts` da la misma huella y el informe sigue idéntico al de la 6.1 (0 avisos, peor P95 de los asaltos 4–8: 18).
- Forja: 169 piezas × 2 tamaños (grupo nuevo `piezas`), limpia, 9 avisos (1 nuevo: `piezas/tajo` a 24 px, un tamaño al que nunca se ve).
- QA visual: **148 capturas** (37 estados × 4 ventanas), 0 fallos, 0 recortes. Estados nuevos: `mesa-esquirlas`, `cartas-lamina`, `taberna-monedas` y `mesa-lacre`. Reglas nuevas: «anima», «foco», «pulgar», «guardias» y «piezas»; «voz», ampliada.
- Prueba de humo: **213 comprobaciones**, «Todo en orden» con ratón, teclado, mando virtual y la pasada con «Reducir movimiento». Partida guiada con los efectos nuevos: 29,1 s con teclado, 29,2 s con ratón y 33,1 s con mando (tope 60 s).

### Panel simulado contra la 7.0
Corrida `rapido-60-20261113-164104` (commit `c12191c`) contra la base `rapido-60-20261113-141123` (7.0): mismas 60 personas y mismo reparto de escenas. 274 evaluaciones, 0 fallidas.
- **Límite de la comparación.** El panel no oye ni ve movimiento: juzga capturas quietas. Nada de lo que diga se puede atribuir a la música, al tajo o a las esquirlas. Desde la 8.0 audita además la captura `mesa-mando`, que es donde se ve A1. Así, las personas de Steam Deck reciben una auditoría más que en la 7.0: en ese estrato las dos corridas no se miden con la misma vara.
- **Aprobación: 25,0 % → 25,0 %** (15 de 60 las dos veces; IC95 15,8–37,2).
- **Claridad media: 4,93 → 5,20** (IC95 calculado de las 60 reseñas: 4,62–5,25 en la 7.0 y 4,91–5,49 en la 8.0).
- **Veredicto: sin regresión y sin mejora medible.** La aprobación no se mueve. La claridad sube 0,27 pero se queda dentro del intervalo de la 7.0.
- Por dispositivo (claridad media con su IC95 · aprobación):
  - Móvil (n 15): 4,60 → **5,47** (IC95 de la 8.0: 4,78–6,15) · 33,3 → 40,0 %. Es donde se trabajó A3. Con n = 15, la mejora no está probada.
  - Steam Deck (n 9): 5,00 → **4,44** (IC95 de la 8.0: 3,71–5,18) · **0 de 9 por tercera corrida** (6.1, 7.0 y 8.0). La bajada cae dentro del ruido y tiene el límite de arriba.
  - PC (n 21): 5,10 → 5,33 · 38,1 → 33,3 %. Portátil (n 15): 5,00 → 5,20 · 13,3 → 13,3 %.
- Quejas por cubeta: mando / foco 19 → 10 · texto chico 84 → 75 · contraste 67 → 68 · fatiga visual 46 → 53 · reglas confusas 38 → 38 · palo Inmune 33 → 38 · La Manga 17 → 14.
- Steam Deck, leído reseña a reseña: 8 de 9 siguen diciendo que no se ve el foco. Pero la auditoría de `mesa-mando` a 1280×800 no lo marca. Lo marcan las de `mesa` y La Taberna, que son capturas con ratón y no tienen foco que ver. Lo que sí tiene base en la captura pasa a la V9 (`SPECS/V9.md`, apartado 1.2).
- Precio justo (mediana): 8,0 → 8,0 USD. En deseados: 55,0 → 58,3 %.
- Duelos A/B: miran a la V9 y la V10 y no se comparan con la 7.0. Gana la propuesta en los tres: «Mandar la Crónica en un toque» (85 %, IC95 75–95; 30 % de pares con sesgo de posición), «Jugar en inglés» (87,5 %, IC95 77,5–97,5; sesgo 25 %) y «Modo de alto contraste» (100 %; sin sesgo). Sesgo de posición global: 18,3 %.

### Estudio
- Orden de celdas: director → arte-ui → juice-ux. Bitácoras en `artifacts/mision/v8/`. Arte-UI pintó las piezas (`engraving.ts`) y el reposo; Juice-UX, la coreografía, el sonido y los medidores. Juice-UX solo puso enganches de una línea en los archivos de Arte-UI, todos listados en su bitácora.
- Lo que no convive: `.ly.sheen` sale y entra `.ly.foil`; `.coin` y `.debris` salen y entran las piezas grabadas; el anillo de latón sale y entra el de papel y tinta.
- Abierto para la V9 y la V10: la pasada de lámina con el foco solo en pantallas anchas (en 390 px la capa daba un parón de GPU); un `filter: drop-shadow` quieto en `.stage .card`; el fotograma en frío de los sombreadores.

## 7.0.0 — 2026-11-13

Partida guiada que se juega y Mesa brava. Sin cambios de reglas. Motivo: la queja «reglas confusas / tutorial» y la claridad del casual (3,50 sobre 10 en la línea base de la 6.1), y unos monarcas que solo eran un decreto de una línea.

### Partida guiada
- Cinco pasos de una línea (≤ 60 caracteres), haciendo y sin ventanas de texto: poder del palo, trono Inmune, La Manga, Daño × Multi = Golpe y Golpe exacto. Cada paso atenúa la mesa, enciende un foco sobre lo que hay que mirar y escribe su línea con el botón del dispositivo en uso.
- Cinco jugadas, una por paso (el tope era 7). La última gana el asalto con un Golpe exacto. 400 partidas de jugadas legales al azar, con semilla fija: ninguna derrota.
- Medido a 1×, pensando 1,5 s cada jugada: **29,1 s con teclado, 29,1 s con ratón, 32,5 s con mando** (la prueba de humo falla por encima de 60 s). Ninguna animación se acortó.
- «Saltar» siempre a mano (Esc / B), con su fila en la tabla de controles. La Manga se abre en la partida guiada (`reserveSize` 1).
- Se retiran las tres ventanas de texto (`TUTORIAL_INTRO` queda vacío) y el cuadro de la Maestra.

### Monarcas
- Siete retratos de grabado, cada uno con dos caras (calma y vencido), distintos por silueta y objeto: naipe partido, balanza, cáliz, corona de carámbanos, llave, hacha y reloj de arena. La forja los separa a 24 px (diferencia mínima 0,114; el tope es 0,1).
- Maldición a la vista: placa con el decreto junto al retrato y la parte de la mesa que castiga marcada con la misma tinta (doble ⚔, hueco en la mano, cáliz tachado sobre las ♥, tope del Escudo, guardias En guardia, +2 de Ataque, Asedio final adelantado).
- Voz de mesa brava: 21 frases (entrada, primer Contraataque y uno de cada tres después, caída), de ≤ 70 caracteres, sin cifras ni palabras de mecánica. Bocadillo de 2,5 s a 1× (1,77 s a 2×, 1,25 s a 4×), solo fundido con «Reducir movimiento».
- Un motivo sonoro de ≤ 2 s por monarca al entrar y al caer.
- Letalidad por monarca, igual que en la 6.1 (52.158 asaltos con monarca): de 13,6 % (La Dama del Cáliz, ×0,91) a 16,4 % (El Usurero, ×1,10); media 14,9 %; objetivo 0,8×–1,3×.

### Secretos de la cripta
- Las 12 opciones se leen como cartas: icono, «Da» en verdín y «Cuesta» en carmesí (o «Nada»), cifras de 15 a 20 px, la descripción larga detrás. Se dan vuelta de una en una con su sonido; con teclado y mando el foco cae en la primera opción.

### Fricciones de la 6.1
- **F1 · palo Inmune.** Con un trono apuntado, cada carta de la mano y de La Manga lleva el sello de su factor contra él: hierro «×0» o latón «×2»/«×3». Nada si es ×1 o es un comodín. Con mando, el sello cambia al cambiar de trono.
- **F2 · texto chico.** La cuenta en dos renglones: arriba el Golpe y contra qué trono; abajo Daño × Multi, cifras de 16 a 20 px y etiquetas de 14 a 16 px, con las palabras enteras también en móvil.
- **F3 · contraste.** La Vida del trono sale de las rayas: placa propia de papel con borde de tinta de 2 px, 14 a 18 px, contraste ≥ 7:1.
- Reglas nuevas de la QA visual: «sello», «cuenta», «vida», «guia», «voz» y «secreto».

### Puertas
- Laboratorio completo (55.640 campañas, 1.543 s): sin avisos, **idéntico** número a número al de la 6.1; peor P95 de los asaltos 4–8 por baraja: 18 (tope 19).
- 205 pruebas en verde (nuevas: `tests/monarcas.test.ts`; `tests/tutorial.test.ts`, reescrita). Forja limpia: 159 piezas, 14 bustos nuevos, 8 avisos (2 nuevos, de deriva de tinta).
- QA visual: 33 estados × 4 ventanas = 132 capturas, cero fallos y cero recortes (estados nuevos: `guia-palo`, `guia-manga`, `guia-exacto`, `mesa-monarca`, `monarcas`).
- Prueba de humo: 193 comprobaciones, «Todo en orden» con ratón, teclado y mando virtual (dos pasadas seguidas en la celda y una en la puerta).

### Panel simulado contra la 6.1
Corrida `rapido-60-20261113-141123` contra la base `rapido-60-20261113-112234`: mismas 60 personas y mismo reparto de escenas.
- **Aprobación: 23,3 % → 25,0 %** (IC95 de la 6.1: 14,4–35,4; de la 7.0: 15,8–37,2).
- **Claridad media: 4,93 → 4,93.** El panel no publica su IC95. Calculado a partir de las 60 reseñas: 4,63–5,24 en la 6.1 y 4,62–5,25 en la 7.0.
- **Veredicto: sin regresión, y tampoco hay mejora medible.** Las dos diferencias caen dentro del ruido de n = 60.
- Lo que no se movió:
  - Quejas de texto chico: 82 → 84. De contraste: 61 → 67. Las tres fricciones están arregladas en el código y pasan sus reglas de QA, pero el panel no lo nota.
  - Claridad en móvil: 4,93 → 4,60 (n = 15; IC95 de 4,10 a 5,10, dentro del ruido). PC: 4,81 → 5,10 (n = 21). Laptop: 5,07 → 5,00 (n = 15). Steam Deck: 5,00 → 5,00 (n = 9).
  - Aprobación en Steam Deck: **0 de 9**, igual que en la 6.1.
- Lo que más repiten las reseñas:
  - En Steam Deck, que con el mando no se ve qué carta tiene el foco.
  - En móvil, que la barra de acciones va pegada al borde inferior y los botones están muy juntos.
  - En `mesa-monarca`, que el bocadillo tapa parte de los tronos.
- Esos tres puntos pasan a la V8 (`SPECS/V8.md`, apartado 1.2), cada uno con su dueño y una comprobación.
- Precio justo (mediana): 8,0 → 8,0 USD. En deseados: 61,7 → 55,0 %.
- Los duelos A/B no se comparan con la 6.1, porque cada corrida votó las hipótesis de su versión. Aun así, la de la 7.0 da una señal para la V8: «La racha de Golpes exactos se oye» gana con el 95 %, y los otros dos duelos empatan. Ojo: el 41,7 % de los pares tienen sesgo de posición.

### Estudio
- Orden de celdas: director → reglas-balance → arte-ui → juice-ux. Cada una dejó su bitácora en `artifacts/mision/v7/`.
- El clasificador de quejas del panel convertía «×0» en «0», así que contaba como «palo Inmune» cualquier queja que llevara un cero. Esa cubeta tenía 87 menciones y las reales eran 32. Arreglado en el panel. La base se reclasificó con el clasificador nuevo, así que las dos corridas se comparan con la misma vara.
- Pendiente para la V9: retirar `TUTORIAL_INTRO`, `say`, `after` y los modos `intro` y `explain` del cliente. Ya no los usa nadie.

## 6.1.0 — 2026-11-13

Marca dual y La Taberna. Sin cambios de reglas. Motivo: el usuario no quería «CORONA ROTA» como título, y un nombre en cada idioma sirve a la vez a la mesa rioplatense y a la búsqueda en Steam.

### Marca
- Dos caras, una marca: en español, **SANGRE Y PALO** con el sello «BLOOD & SUITS»; en cualquier otro idioma, **BLOOD & SUITS** con el sello de origen «SANGRE Y PALO». Lemas: «La conjura de los naipes» y «A card conspiracy against the court».
- Todo sale de `src/shared/brand.ts` (`BRAND`, `brandLocale`, `LOCALE`, `TITLE`, `SEAL`, `SLUG`). La cara se elige por el idioma del navegador; fuera del navegador (pruebas, scripts, servidor), la española.
- Portada: candado de grabado con el título en grande y, cosida debajo, una cinta de lacre con el otro nombre y su sello. Estado de QA nuevo `portada-en` para la cara inglesa.
- `index.html` (`SANGRE Y PALO · Blood & Suits`), descripción y etiquetas `og:`/`twitter:` con los dos títulos; manifest (`Sangre y Palo`); `package.json` (`sangre-y-palo`); tarjeta para compartir regenerada con el candado.
- Lámina y Crónica con título y sello. Los archivos que se descargan se llaman `sangre-y-palo-…`.

### Vocabulario
- La tienda pasa de «Mercado clandestino» a **La Taberna** (y la Llave del mercado, a Llave de la Taberna).
- El final de victoria pasa a llamarse **«Corte vencida»**. La derrota sigue siendo «Conjura deshecha».
- «corona rota» y «mercado clandestino» entran en la lista prohibida de `tests/vocabulario.test.ts` y de la regla «jerga» de la QA visual.
- No cambian, a propósito: claves `derrumbe:*`, la semilla de la diaria, el marcador `app: 'derrumbe'` de la copia de seguridad, la dirección `/derrumbe/` y los `id` de datos.

### Pruebas
- `tests/marca.test.ts`: las dos caras de `BRAND`, `brandLocale` (`es-AR` → es; `en-US` y `pt-BR` → en; sin idioma → es), `index.html`, manifest, `package.json` y la primera línea del README.
- QA visual, regla nueva «marca»: en `portada` y `portada-en` la cinta dice el otro nombre, mide ≥ 13 px (14 en móvil), va cosida al título y cabe en la ventana.
- Las pruebas con navegador fijan `locale: 'es-ES'`: el Chromium de Playwright puede venir en inglés.
- La prueba de humo comprueba la marca dual en la portada y la copia `sangre-y-palo-progreso-AAAA-MM-DD.json`.

Medidas de la 6.1: informe completo del laboratorio sin avisos e **idéntico** al de la 6.0 (`node artifacts/v6/comparar-meta.mjs`); 188 pruebas en verde; QA visual con 28 estados × 4 ventanas = 112 capturas y cero fallos; prueba de humo con 164 comprobaciones, «Todo en orden» en dos pasadas seguidas. Panel: la auditoría `rapido-60-20261113-112234` de la 6.1 es la línea base de la V7 (aprobación 23,3 %, IC95 14,4–35,4; claridad media 4,93).

## 6.0.0 — 2026-11-12

Cambio de tema 360° y claridad universal, sin tocar una cuenta. Motivo: en la auditoría V4 del panel simulado, «reglas confusas / tutorial» sumó 187 menciones y el casual dio 3,58/10 de claridad; la jerga de obra (35 términos) no era de baraja.

### Tema y vocabulario
- El juego pasa a llamarse CORONA ROTA («La conjura de los naipes»). El título vive solo en `src/shared/brand.ts`.
- No se adoptó «Regicidio» como título: es el nombre de un juego comercial que ya existe. Tampoco sus nombres propios: la tienda es «Mercado clandestino».
- Vocabulario universal en todo lo que lee el jugador (glosario en `SPECS/V6-normas-y-glosario.md`): palos por su nombre, tronos y guardias, Vida, Escudo, Mazo, Descarte, Contraataque ⚔, Daño × Multi = Golpe, Golpe exacto, Impulso, Motín, Asedio final, La Manga, Rebobinar, Reliquias, Sellos de lacre, Acabados, monarcas y decretos, Mercado clandestino, Mesa de lacre, Mapa del castillo, Juramentos, La Orden, Coronas, Reinado, Trono infinito, Asalto diario, Crónica.
- 226 piezas renombradas en las reglas (185 nombres y 171 descripciones): 52 reliquias, 25 especiales, 7 monarcas, 8 asaltos, 8 Reinados, juramentos, atajos, secretos, logros… Biblia en `SPECS/V6-biblia-de-nombres.md`.
- Las seis palabras clave: Daño, Multi, Golpe exacto, Brecha, En guardia, Desarmado.
- Tres redes contra la jerga vieja: `tests/vocabulario.test.ts`, la regla «jerga» de la QA visual y `tests/marca.test.ts`.
- No cambian, a propósito: identificadores de datos, clases CSS, protocolo de red, claves de guardado `derrumbe:*`, la semilla del Asalto diario y la dirección de la página.

### Grabado
- Portada: sala del trono con la corona de piedra partida, dagas cruzadas, cuatro estandartes con la trama de cada palo, antorchas y sello de lacre. Tarjeta para compartir e icono nuevos.
- Los cuatro tronos: cabecera de cada casa, escudo de inmunidad, insignia de Ataque «⚔ n» sobre placa, paños de guardia con su tocado (Sota, Reina, Rey).
- 52 reliquias, 17 especiales y 17 iconos de servicio grabados de nuevo. 8 retratos (los siete monarcas y el Tratante), reconocibles por su objeto y su silueta. 6 dorsos de baraja.
- Títulos en Cinzel (romana de inscripción, en versales) en vez de la gótica.
- Animaciones: estandarte rasgado al caer un guardia y corona que se parte al caer un trono.
- Forja: en las reliquias, tinta fuera de 22–58 % o silueta por debajo del 55 % a 24 px ya es fallo. Quedan entre 23,6 % y 56,9 %. Grupos nuevos `especiales` y `servicios`.

### Mesa y pantallas
- Todas las pantallas con el vocabulario nuevo. Píldoras `+D`, `+M`, `×M`; cuenta `Daño × Multi = Golpe`.
- Insignias «¡Exacto!», «Cae el guardia», «Cae el trono», «Ventaja», «Inmune», «Habrá Contraataque ⚔ n».
- La preparación de campaña cabe entera sin desplazar en 1366×768 y 1280×800: «Semilla» al pie del panel (era una nota de la 5.0), título más corto y barajas con alto mínimo en vez de fijo (una descripción larga se montaba sobre la fila de abajo).
- En el Mercado clandestino, a 1280 y 1366 de ancho, el nombre de cada oferta va en la letra de rótulos y cabe entero («ESTANDARTE» ya no se parte con guion).
- Aviso de último turno en móvil en un renglón de 28 px (era una nota de la 5.0). Antes restaba 60 px a los tronos; ahora unos 33.
- QA visual: reglas nuevas «jerga» y «texto pisado». Cazó títulos partidos y textos fuera de su botón en el Mercado a 1280.

Certificación final: QA visual con 27 estados × 4 ventanas = 108 capturas y cero fallos; prueba de humo con 162 comprobaciones, «Todo en orden» en tres pasadas seguidas; con aceleración gráfica, 7,1 ms de media por fotograma durante un golpe (p95 12,1 ms); banco de grabado con 145 piezas sin fallos; 186 pruebas en verde; barrido de jerga con cero palabras del tema viejo en lo que lee el jugador.

### Mando y sonido
- LB/RB sobre las reliquias, comprobado también en combate dentro de la prueba de humo (era una nota de la 5.0).
- La prueba encontró un fallo real: al reordenar en combate, la cuenta del golpe no se repintaba. Arreglado.
- Prueba de humo: de 143 a 162 comprobaciones.
- Sonido del tema nuevo, todo sintetizado: tambor de guardia y acero en el Contraataque, espada contra escudo si lo frena el Escudo, campana en el Golpe exacto, estandarte que cae, corona que se parte, redoble en el Motín.
- Los ocho Susurros y la partida guiada (ahora habla la Maestra), reescritos.

### Reglas (sin cambios de balance)
- Ni una cuenta cambió: el informe del laboratorio (55.640 campañas, sin avisos) es idéntico número a número al de la 5.0 (`artifacts/v6/comparar-meta.mjs`).
- `omen()` expone sus cifras en campos propios para el aviso corto.

### Panel y estudio
- `..\panelAgentesGaming` habla el vocabulario nuevo: preset `v6-completo` (`v4-completo` queda de alias).
- 11 duelos A/B ya resueltos, retirados; 3 propuestos para la V7, como hipótesis.
- `pytest` de 62 a 73 pruebas, en verde. Copia de respaldo en `archivo_v5/`.
- Circuito en seco limpio. No se lanzó ninguna corrida real.
- Hoja de ruta renumerada: V6 es este cambio de tema; V7, enseñanza de 60 segundos y personalidad de los monarcas; V8, jugo y audio de corte; V9, cooperativo, `balance-config.json` y telemetría con la privacidad primero; V10, candidata a lanzamiento.
- El bucle `scripts/estudio-autonomo.ps1` arranca en la V7.
- Reglamentos de los subagentes y skills, al día.

### Sin hacer o por comprobar
- El panel no se ha corrido sobre la 5.0 ni sobre la 6.0: no hay medida de aprobación ni de claridad de ninguna de las dos. El bucle audita `main` como línea base antes de la V7.
- `scripts/estudio-autonomo.ps1` solo se ha probado en modo ensayo.
- En móvil, el aviso de último turno aún resta unos 33 px a los tronos.
- `index.html` y el manifest llevan el título escrito a mano (son estáticos). `tests/marca.test.ts` falla si alguien cambia la marca y se los deja.
- La página sigue en `/derrumbe/` y el repositorio se sigue llamando así.

## 5.0.0 — 2026-11-12

Claridad de cristal, ergonomía y balance con datos. Motivo: la auditoría V4 del panel simulado dio 28,8 % de aprobación (IC95 23,4–34,8) con 5–7/10 de diversión, y señaló la interfaz como causa.

### Legibilidad
- Ningún texto por debajo de 13 px, en CSS ni en SVG (tamaño efectivo en pantalla). En móvil, cifras y descripciones a 14 px. 126 tamaños subidos en las hojas de estilo.
- Ninguna cifra en gótica. Fuente «Derrumbe Cifras» (solo los dígitos de Archivo Black) puesta la primera en la familia de títulos: un número dentro de un título gótico sale en palo seco. Variable `--num` para toda cifra, con cifras tabulares y placa opaca.
- En las cartas en miniatura (rejilla de la forja, visor del mazo) el texto del grabado se retira; rango y palo quedan grandes.
- Cuenta central: daño final entero en grande sobre placa, torre de destino, Fuerza y Resonancia en pequeño (Resonancia con un decimal) e insignias por orden de peso: golpe limpio, cae el piso, ventaja ×n, inmune ×0, búnker −n, sirena, muro, repara, oro, robas, tiza.
- Recibo bajo demanda (ratón encima, foco con teclado o mando, o toque): cinco fichas `Base + Cartas + Cinturón × Resonancia = Daño`, con una línea por cada paso. No tapa la mano ni las torres. En móvil es una hoja con botón de cerrar de 48 px.
- El título «Sepultados» pasa a una gótica más abierta y sin filtro rugoso. La auditoría lo había leído «SEPUETADOS»; el texto del código siempre fue correcto.
- Corrector de erratas sobre todos los textos: tres encontradas y corregidas («Enconfra» → «Encofra», «el daño que sobre pasa» → «el daño que sobra pasa», una tilde en un documento).

### Palos y contraste
- Cuatro tramas de grabado: ♠ rayado diagonal, ♦ punteado, ♥ aparejo de ladrillo, ♣ rayado cruzado. Van en el marco de las cartas, en el rótulo de cada torre y en la rueda de materiales.
- Contraste del glifo de cada palo sobre el papel crema ≥ 7:1 (antes: ♦ 3,22:1, ♥ 5,02:1, ♣ 6,63:1). Glifos con contorno de tinta e índice de carta sobre placa de papel.
- La forja (`npm run forja`) lo mide: 92 piezas a 24 y 300 px, sin fallos. Las seis parejas de tramas se distinguen en luminancia. Quedan 13 avisos de densidad de tinta en iconos de herramienta (no son fallos).
- Lo atenuado o desactivado baja de tono, no de opacidad. «Copiar acta», «Pasar», «Cerrar», barras del búnker, índices de la mano y píldoras del cinturón llevan placa y más contraste. El botón «No mostrar más» de los susurros pasó de 1,2:1 a unos 12,9:1.

### Maquetación y ergonomía
- Mano con huecos de al menos 12 px entre cartas. Todo lo pulsable mide al menos 44 × 44 px, con 8 px de aire.
- Botones de acción «Golpear», «Andamio», «Tiza», «Descartar» y «Soltar» (y «Pasar»), cada uno con su insignia de tecla o de mando. El número de cartas a descartar va en un sello aparte sobre el botón.
- Móvil 390×844: barra del pulgar de cuatro botones de 48 px (Golpear, Andamio, Descartar, Tiza), mano encima, torres y búnker arriba.
- Cero recortes: gremio, colección y archivo se desplazan dentro de su panel en móvil. Aviso de tinta desvanecida (`tinta.ts`) en toda caja con desplazamiento mientras quede contenido.
- Las tarjetas de opción (cobro, hallazgo, ferretería, colección) ya no cortan la última línea de una descripción larga: llevan alto mínimo en vez de alto fijo, y sus botones quedan en línea. La QA comprueba también el texto cortado por su propia caja, que antes se le escapaba.
- El registro lateral de la mesa solo se enseña si caben dos renglones enteros (en 1366×768 y 1280×800 se oculta).
- QA visual: 25 estados × 4 ventanas = 100 capturas, cero fallos (la línea base con la QA nueva, antes de tocar estilos, eran 2.719). Doce reglas: texto, gótica, recorte, tinta, diana, aire, mano, pulgar, trama, contraste, placa y maqueta. Prueba estática `tests/imprenta.test.ts` (23 comprobaciones).

### Mando
- Descartar en L3, reordenar el cinturón con LB/RB con el foco en la herramienta (fuera del cinturón siguen abriendo mazo y lupa), pantalla completa en R3. Ninguna fila de la tabla de controles queda sin mando.
- Marco de foco de 3 px, latón entre filetes de marfil, con salto de escala. Sigue al elemento y sobrevive a los redibujados. Respeta «reducir movimiento».
- Con teclado o mando, el globo de ayuda ya no sale al enfocar cartas de la mano (tapaba la cuenta). La lupa (L / RB) sigue ahí.
- La tabla de controles sale de un solo sitio (`CONTROL_ROWS` en `prompts.ts`): Ajustes, README y REGLAS.md.
- Navegación con cruceta fila a fila. En la certificación la prueba de humo fallaba a ratos: desde la derecha de la mesa, «arriba» saltaba a la barra superior en vez de a las torres. Ahora manda la fila más cercana (huecos entre bordes, no entre centros), y un barrido comprueba que desde cualquier elemento de la mesa se llega a cada torre en 6 pulsaciones o menos.
- Prueba de humo: 143 comprobaciones con teclado, ratón y mando virtual; «Todo en orden» en cinco pasadas seguidas tras el arreglo. La latencia del foco se mide con la mediana de cinco pulsaciones (12–27 ms; límite 50).

### Enseñanza y derrota
- «Causa del derrumbe» en dos líneas con una barra (lo que venía, lo que frenó el muro, lo que entró, lo que quedaba). Sale en la mesa al caer el golpe final, en el acta de campaña, en el final de la partida clásica, en «Copiar acta» y en el archivo de actas. Cuatro causas: sirena, colapso de cantera, herida propia y sin cartas.
- Aviso de último turno cuando una sola sirena o el colapso siguiente pueden tirar el búnker.
- Ocho susurros de tiza de una línea (palo inmune, andamio, golpe limpio, forja, atajo, jefe, fatiga, cantera baja), de uno en uno y una vez por perfil, con «No mostrar más» y una fila en Ajustes para volver a encenderlos. Los tres básicos de la mesa solo salen en la primera campaña; los otros cinco, la primera vez que se ven.
- Insignias flotantes cuando disparan Ariete, Contragolpe y Rebosadero, con sonido propio. Sonidos distintos para golpe limpio, piso que cae sin limpio, jugada inválida, sirena frenada y sirena que entra.

### Compartir
- Lámina del acta de 1200 × 630 (PNG) para descargar o copiar: resultado, obra y jefe, mayor golpe, turnos, cinturón, causa, semilla, baraja y nivel.
- Enlace `?seed=<semilla>&baraja=<id>&nivel=<1..8>`: abre la preparación de campaña con todo cargado y un aviso. No arranca solo ni pisa una campaña en curso.
- Arreglo: una campaña con semilla al azar ahora se puede repetir. La semilla al azar se enseña como `#` + base 36 y se lee tal cual; antes «Rejugar semilla» no reproducía esas campañas. Las semillas escritas con palabra no cambian.

### Balance
Laboratorio: 55.640 campañas, informe sin avisos, 1.500 por celda. Victorias en %, gremio vacío / lleno.

| Celda | 4.0 | 5.0 |
|---|---|---|
| Nivel 1 | 29,1 / 44,1 | 29,7 / 45,1 |
| Nivel 5 | 14,3 / 27,7 | 14,1 / 29,1 |
| Nivel 6 | 12,0 / 24,5 | 12,3 / 24,9 |
| Nivel 7 | 7,3 / 16,9 | 7,9 / 16,9 |
| Nivel 8 «Clausura» | 4,1 / 10,9 | 6,8 / 15,3 |
| La Ventisca (letalidad) | 17,6 %, ×1,14 | 14,0 %, ×0,94 |
| Los siete jefes | ×0,90 a ×1,14 | ×0,91 a ×1,10 |
| Peor P95 de turnos, obras 4–8, por baraja | 18/18/18/17/16/17 | 18/18/18/17/16/17 |
| Timbre del gremio dado de salida | 30,0 % | 49,4 % (49,1 % con 800 campañas) |
| Partida clásica 1/2/3/4 jugadores | — | 59,3 / 58,5 / 64,5 / 63,1 |

- Timbre del gremio rediseñado (era una trampa: 56,5 % de elección y 30,0 % de victorias dado de salida): «Al empezar cada obra, sella 1 carta de tu mazo al azar. Los sellos se activan dos veces.» Se midió con 1, 2 y 3 sellos (49,1 %, 62,9 %, 67,3 %): se queda en 1.
- Clausura: «Solo en la obra 8, la amenaza de todas las torres sube 1.»
- La Ventisca: «El muro no puede pasar de 4.» (antes 3). La variante «tope 4 y amenaza +1» se descartó: con las seis barajas subía a ×1,27.
- Ariete 3 → 4 de Fuerza por punto de muro. Horno 2 → 3 de oro (no 4: ya ganaba 54,4 % dado; su problema era de claridad). Con 800 campañas dadas de salida: Ariete 47,4 %, Horno 45,0 %, Contragolpe 47,5 %, Rebosadero 44,9 % (referencia 41,4 %).
- Textos nuevos. Contragolpe: «Si el muro frena entera una sirena, su torre recibe 3 × lo frenado. Ej.: frena 4 → la torre recibe 12.» Rebosadero: «Muro que no cabe: cada 2 reparan 1. Reparación que no cabe: +3 de Fuerza por punto para tu próximo golpe.» Cinco textos más reescritos para decir su cifra (Último turno, Bastión, Martillo neumático, Gemelo, Sello de eco), sin cambiar números.
- `FATIGUE.every` se queda en 2: el panel prefirió 3, pero no estaba en el encargo y arriesga el P95 ≤ 19.
- Márgenes justos: nivel 1 con gremio vacío a 0,3 del techo de 30; Paleta de albañil 38,1 % con solo 160 campañas.
- El laboratorio avisa ahora de nivel 8 fuera de 6–9 / 12–17 y de cualquier herramienta dada de salida por debajo del 35 % o por encima del 68 % (con segunda vuelta de 800). `meta-report.json` guarda una huella de las reglas y `npm test` falla si el informe publicado no es de las reglas actuales.

### Estudio
- Cuatro subagentes en `.claude/agents/` (`director`, `reglas-balance`, `arte-ui`, `juice-ux`).
- Cinco skills en `.claude/skills/`: `brutalist-print-ui`, `engraving-svg-forge`, `playwright-deck-qa`, `regicide-synergy-math`, `autonomous-sprint-loop`.
- `scripts/estudio-autonomo.ps1`: bucle V6→V10 con puertas de CPU y de GPU. Probado solo con `-Ensayo`.
- `npm run forja`, `tests/invariantes.test.ts`, `tests/imprenta.test.ts` y `tests/autopsy.test.ts`. 177 pruebas en verde.
- `QA_DIR` y `LAB_HILOS`, para que varias celdas construyan y midan a la vez sin pisarse.
- Hoja de ruta de la V5 a la V10 (`ROADMAP_V5_V10.md`) y especificaciones en `SPECS/`.

### Sin hacer o por comprobar
- La puerta de GPU no se ha corrido sobre la 5.0: no hay medida de aprobación ni de claridad del panel para esta versión. El orquestador la corre como línea base al lanzar la V6 (unos 90–105 minutos de la 3090).
- `scripts/estudio-autonomo.ps1` solo se ha probado en modo ensayo: ninguna versión ha pasado aún por el bucle real.
- Con un susurro de tiza a la vista, ir de «Soltar» a la torre de acero cuesta 7 pulsaciones de cruceta en vez de 6 (el susurro es una parada más del camino).
- En 1366×768 la sección «Semilla» de la preparación queda bajo el pliegue: se llega desplazando el panel, que avisa con la tinta desvanecida.
- LB/RB sobre el cinturón en la mesa no lo cubre la prueba de humo (la obra 1 no llega a tener dos herramientas). Sí se cubre en la ferretería y, con teclado, en la mesa.
- En 390×844 el aviso de último turno resta unos 60 px de alto a las torres.
- El final de la partida clásica pinta la causa del derrumbe pero no tiene estado de QA propio.
- 13 avisos de densidad de tinta en iconos de herramienta (forja).

## 4.0.0

Según el historial (`DERRUMBE 4.0`): fatiga de cimientos, aguante, mando completo, archivo de actas y despliegue. Después, una corrección de CI: acciones al día (checkout y setup-node v7, Pages v5).

## 3.0.0

Según el historial (`DERRUMBE 3.0`): taller de grabado, andamio, tiza, niveles de obra y balance con datos.

## 2.0.0

Según el historial (`DERRUMBE 2.0`): Fuerza × Resonancia, cinturón, sellos, plano y gremio horizontal.
