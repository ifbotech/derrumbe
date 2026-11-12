# Registro de cambios

Todas las versiones notables de DERRUMBE. Las cifras de balance salen del laboratorio (`npm run analyze:meta`); las del panel salen de una simulación con n = 240 y tienen unos ±6 puntos de ruido.

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
