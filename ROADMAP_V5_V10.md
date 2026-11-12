# Hoja de ruta DERRUMBE · V5 a V10

Escrita por el Director el 2026-11-12, sobre DERRUMBE 4.0.0 (commit `f616e73`).

## Cómo leer los números

- Las cifras del panel salen de una **simulación** con modelos locales (240 personas ficticias, `..\panelAgentesGaming`). Ordena prioridades. No sustituye a jugadores reales.
- Con n = 240 el intervalo de confianza del 95 % de la aprobación es de unos ±6 puntos. **Una diferencia menor que eso entre dos corridas es ruido**: ni regresión ni mejora probada.
- Los estratos son más pequeños (casual n = 48, Steam Deck n = 36): ahí el ruido es de ±10 puntos o más. Para esos estratos la puerta mira la **claridad media** y la dirección, no el porcentaje.
- Los números de balance (victorias, ritmo, letalidad) no vienen del panel: vienen del laboratorio (`npm run analyze:meta`). Si el panel y el laboratorio chocan, manda el laboratorio.
- Fuente de la V4: `panelAgentesGaming\salidas\v4-completo-20261112-084346\` (`INFORME_EJECUTIVO.md`, `PROPUESTA_BALANCE.json`, `agregados.json`) y `artifacts/auditoria-v4/`.

## Tabla resumen

| Versión | Tema | Métrica que debe mover | Puerta |
|---|---|---|---|
| V5 | Claridad de cristal, ergonomía y balance con datos | Aprobación 28,8 % (IC 23,4–34,8); Steam Deck 11,1 %; claridad media por arquetipo 3,6–5,1 | CPU verde + GPU: aprobación y claridad media no bajan del ruido |
| V6 | Los tres primeros minutos: enseñanza invisible | Claridad del casual 3,58/10 (aprobación 10,4 %); queja «reglas confusas / tutorial» (187) | CPU + GPU: claridad del casual ≥ 4,5 y la media global no baja |
| V7 | Identidad de jefes y hallazgos del subsuelo | Letalidad de cada jefe en 0,8×–1,3× de la media (hoy 14,4–17,6 % sobre 15,4 %) y sentimiento por jefe en el panel (hoy La Ventisca −0,48) | CPU + GPU + letalidad en rango en el laboratorio |
| V8 | Sensación cinética y tres horas de audio sin repetirse | `riesgo_fatiga_4h` de las auditorías (3–6 de 10 en V4) y queja «fatiga visual / textura» | CPU + GPU + prueba de audio de 3 h sin repeticiones |
| V9 | Cooperativo a prueba de balas, `balance-config.json` y telemetría anónima | Cero desincronizaciones en 200 partidas cooperativas simuladas; balance en un solo JSON validado | CPU + GPU + prueba de reconexión y de esquema |
| V10 | Congelación de funciones y pulido de candidata a lanzamiento | Cero defectos P0/P1 abiertos; 60 fps; accesibilidad AA | CPU + GPU + lista de salida firmada por el Director |

Regla común: **ninguna versión añade un sistema nuevo sin retirar o simplificar otro**, y todas respetan la constitución anticomplejidad (≤ 6 palabras clave, ≤ 56 herramientas, descripciones ≤ 115 caracteres, P95 ≤ 19 turnos en las obras 4 a 8 con las seis barajas).

## Cómo corre el bucle

`scripts/estudio-autonomo.ps1` ejecuta una versión de principio a fin. Para cada versión `n`:

1. Crea la rama `estudio/v{n}` desde `main`.
2. Pone `DUNGEON_HERO` (el héroe del Pixel Dungeon) para que cada sala se vea en el calabozo.
3. Lee `SPECS/V{n}.md` y, por cada bloque `### Celda: <nombre>` de obra (`reglas-balance`, `arte-ui`, `juice-ux`), en el orden en que aparecen y **una detrás de otra**, lanza una sesión `claude -p --agent <nombre>` con el texto del bloque como encargo.
4. Pasa las **puertas de CPU**, en este orden: `npm run typecheck`, `npm test`, `npm run analyze:meta` (sin avisos), `npm run docs`, `npm run qa:visual` (cero fallos), `npm run qa:smoke` (cero problemas). Si una falla, la celda responsable recibe el final del registro y lo arregla; dos intentos (`-Intentos`). Al tercero, la versión se aparta.
5. **Cierre**: las celdas `director` corren después de las puertas, con las medidas reales delante, y escriben la entrada del registro de cambios.
6. Hace el **commit candidato** en `estudio/v{n}`, solo con la autoría del usuario (sin `Co-Authored-By`).
7. Dispara la **puerta de GPU** en `..\panelAgentesGaming`: el panel de 240 personas sobre el commit candidato, en la RTX 3090, con la sala `QA-3090` enseñando su avance.
8. **Compara** la aprobación por persona y la claridad media contra la corrida de la versión anterior (si no hay ninguna guardada, audita `main` antes de empezar). Regresión es bajar más de `-MargenAprobacion` puntos (3 por defecto) o más de `-MargenClaridad` (0,15 por defecto). El margen es más estricto que el ruido (unos 6 puntos): prefiere apartar una versión dudosa a publicar una peor. Los objetivos por estrato de cada especificación (claridad del casual, fatiga a las 4 h…) se leen en el informe del panel; no bloquean solos.
9. Si pasa: fusiona `estudio/v{n}` en `main` y etiqueta `v{n}.0.0` con el veredicto del panel en la nota de la etiqueta (y publica si se lanzó con `-Publicar`). Si no pasa: renombra la rama a `rechazado/v{n}-<fecha>`, `main` queda como estaba y el bucle se detiene. Nunca `git reset --hard` ni `push --force` sobre `main`.

Cada versión deja su rastro en `artifacts/estudio/v{n}/`: un registro por celda y por puerta, y `veredicto.json`. Para ver qué haría sin tocar nada: `.\scripts\estudio-autonomo.ps1 -Ensayo`.

La V5 la hace a mano el orquestador con cinco celdas en paralelo (normas en `SPECS/V5-normas-de-celda.md`); el bucle automático arranca en la V6.

---

## V5 · Claridad de cristal, ergonomía y balance con datos

**Estado: hecha (2026-11-12). Puerta de GPU pendiente.**

**Tema.** Que todo número, palo y botón se lea y se alcance a la primera, y que el balance se corrija con medidas.

**Evidencia.**
- Aprobación simulada 28,8 % (n = 240, IC95 23,4–34,8) con diversión de 5 a 7/10: el problema es la interfaz, no el núcleo (INFORME_EJECUTIVO).
- «Texto chico / legibilidad»: 355 quejas; A/B «texto de 13 px»: 100 % (22 pares).
- «Contraste / color de palos»: 205 quejas; A/B «palos aptos para daltonismo»: 97,6 %.
- «Objetivos táctiles»: 86 quejas; A/B «botones al pulgar»: 100 %.
- Steam Deck 11,1 % (n = 36); casual 10,4 % (n = 48); claridad por arquetipo 3,58–5,12.
- Crónica c03: claridad 3,0 tras la primera derrota; A/B «cuenta paso a paso» 81,8 %, «susurros» 84,1 %, «acta para compartir» 90,5 %.
- Laboratorio (1.500 campañas por nivel): `timbre` se elige 56,5 % y gana 30,0 % dado de salida (trampa); `horno` se elige 9,2 % y gana 54,4 % (claridad); Clausura gana 4,1 % vacío y 10,9 % lleno, con objetivo 6–9 % y 12–17 %.

**Entregables.**
1. Legibilidad: ningún texto < 13 px (14 px en móvil para números y descripciones), ningún número en gótica, placas de respaldo. Celda `arte-ui` (A).
2. Palos con cuatro tramas, contorno de tinta, ♥ ≥ 7:1 sobre crema; contraste +30 % en botones, barras del búnker, índices y píldoras. Celda `arte-ui` (A).
3. Maquetación y dianas ≥ 44 px, barra del pulgar de 48 px, cero recortes; QA visual con cajas del DOM. Celda `arte-ui` (A).
4. Previsualización central con daño final entero e insignias, recibo paso a paso, «Causa del derrumbe», aviso de último turno y lámina del acta con `?seed=`. Celda `arte-ui` (B).
5. Mando: foco de 3 px, Descartar en L3, reordenar con LB/RB, pantalla completa en R3; ocho susurros de tiza con «No mostrar más»; insignias flotantes de herramienta. Celda `juice-ux`.
6. Balance: Timbre rediseñado, Ariete 3→4, Horno 2→3, textos de Contragolpe y Rebosadero, Clausura, La Ventisca; autopsia y aviso (`autopsy`, `omen`). Celda `reglas-balance`.
7. Estudio: subagentes, skills, `scripts/estudio-autonomo.ps1`, pruebas de invariantes, hoja de ruta, especificaciones y registro de cambios. Celda `director`.

**Criterios de aceptación.**
- `qa:visual`: cero textos < 13 px y cero recortes en las cuatro ventanas.
- `qa:smoke`: todas las acciones del mando, incluidas las nuevas.
- Laboratorio: Clausura 6–9 % / 12–17 %, 5>6>7>8 estricto, Timbre dentro de 35–68 % de victorias, P95 ≤ 19.
- Panel: aprobación y claridad media no bajan más allá del ruido; Steam Deck y casual suben en claridad.

**Fuera de alcance.** Cambiar `FATIGUE.every` (el panel prefirió 3 con 75 %, pero no estaba en el encargo y arriesga el P95 ≤ 19), tocar el Horno más allá de 2→3, rediseñar la enseñanza inicial (V6), jefes (V7), audio (V8), servidor (V9).

**Resultado.**
- QA visual: 100 capturas (25 estados × 4 ventanas), cero fallos; la línea base con la QA nueva eran 2.719. Texto ≥ 13 px, ♠♦♥♣ ≥ 7:1 sobre crema, dianas de 44 px. 177 pruebas en verde.
- Laboratorio (55.640 campañas, sin avisos): Clausura 6,8 % vacío y 15,3 % lleno (antes 4,1 / 10,9) con 5>6>7>8 estricto; Timbre 49,4 % dado de salida (antes 30,0); La Ventisca ×0,94 (antes ×1,14); jefes entre ×0,91 y ×1,10; peor P95 de turnos 18.
- Prueba de humo del mando: 143 comprobaciones, en verde tras corregir la navegación con cruceta (en la certificación fallaba a ratos al subir a las torres desde la derecha de la mesa).
- Abierto para la V6: el panel no se ha corrido sobre la 5.0, así que no hay línea base de aprobación ni de claridad. Se corre al lanzar la V6 (unos 90–105 minutos). El bucle real (`estudio-autonomo.ps1`) solo se ha probado con `-Ensayo`.

---

## V6 · Los tres primeros minutos: enseñanza invisible

**Tema.** La primera obra enseña jugando, sin tutorial aparte obligatorio.

**Evidencia.**
- Casual: aprobación 10,4 % (n = 48), claridad 3,58/10, la más baja de los seis arquetipos.
- «Reglas confusas / tutorial»: 187 quejas; el casual y el veterano la ponen entre las tres primeras.
- Hilo del foro «Primeros pasos»: ante el parche de susurros, 16 personas simuladas lo rechazan y 1 lo apoya; los mensajes piden entender el ciclo de materiales antes de la primera derrota.
- Defecto oculto repetido: «ausencia de un modo tutorial interactivo que explique causa y efecto de los materiales».
- Laboratorio: obra 1 con mediana de 6 turnos (P95 9) y 0 % de muertes; sobra margen para enseñar sin tocar el balance.

**Entregables.**
1. Obra 1 guiada por el propio tablero: el primer golpe se propone resaltando la carta y la torre correcta, sin ventana aparte. Celda `juice-ux`.
2. Rueda de materiales visible desde la primera mano y atenuada tras el primer acierto. Celda `arte-ui`.
3. Guion de la obra 1 en `src/rules/tutorial.ts` como estados verificables (primer golpe, primer golpe limpio, primera sirena) con pruebas. Celda `reglas-balance`.
4. Primera derrota a salvo: «Causa del derrumbe» y la tiza se ofrecen una vez, con repetición rápida. Celda `juice-ux`.
5. Medida de la enseñanza en el laboratorio: un bot «novato» que sigue solo las pistas de pantalla debe ganar la obra 1 ≥ 90 %. Celda `reglas-balance`.
6. Hoja de ruta y registro al día. Celda `director`.

**Criterios de aceptación.**
- Panel: claridad del casual ≥ 4,5 (desde 3,58) y claridad media global sin bajar. El porcentaje de aprobación del casual se reporta pero con n = 48 es orientativo.
- Laboratorio: bot novato con pistas gana la obra 1 ≥ 90 %; balance de la V5 intacto.
- `qa:smoke`: una partida nueva llega al primer golpe limpio sin abrir ninguna ventana de tutorial.

**Fuera de alcance.** Cambiar reglas de las obras 2 a 8, jefes, música, cooperativo.

Queda abierto de la V5: con un susurro a la vista, un camino de cruceta cuesta 7 pulsaciones en vez de 6; la «Semilla» de la preparación queda bajo el pliegue en 1366×768; LB/RB sobre el cinturón en la mesa sin cubrir (la obra 1 no tiene dos herramientas); el aviso de último turno resta unos 60 px a las torres en 390×844; el final de la partida clásica sin estado de QA propio; 13 avisos de densidad de tinta en iconos de herramienta. La línea base del panel sobre la 5.0 es el primer paso de la V6.

---

## V7 · Identidad de jefes y hallazgos del subsuelo

**Tema.** Cada jefe se reconoce por su firma visual, sonora y de reglas, y cada hallazgo es un momento que se recuerda.

**Evidencia.**
- Letalidad medida (laboratorio, 54.840 campañas): La Ventisca 17,6 %, La Sirena 15,1 %, El Topo 14,4 %, media 15,4 %. Hoy todos caben en 0,8×–1,3×; el riesgo es romperlo al darles identidad.
- La Ventisca tiene el peor sentimiento entre los jefes (−0,48, 23 menciones).
- Auditoría visual: en `hallazgo` y `plano` aparecen P0/P1 de texto cortado (descripción de «Fundir dos cartas» cortada a 1366×768) y microcopy confuso («Bronce vivo», nombres de jefes sin jerarquía).
- Los jefes ya tienen retrato propio (commit `aed9f9f`); falta una firma sonora y de reglas reconocible a simple vista.

**Entregables.**
1. Una regla de firma por jefe, expresada en ≤ 115 caracteres, sin palabra clave nueva. Celda `reglas-balance`.
2. Retrato y entrada del jefe con su paleta y marco propios en el plano y en la mesa. Celda `arte-ui`.
3. Firma sonora por jefe (motivo de 2 s sintetizado) y golpe de cámara contenido al entrar. Celda `juice-ux`.
4. Hallazgos: pantalla sin recortes en las cuatro ventanas, microcopy corregido, y una animación de revelado de 1 s. Celda `arte-ui`.
5. Seis hallazgos nuevos o reescritos con consecuencias visibles en la mesa (sin añadir sistemas: reutilizan herramientas, cartas especiales y reparaciones existentes). Celda `reglas-balance`.
6. Registro y revisión del reparto de letalidad. Celda `director`.

**Criterios de aceptación.**
- Laboratorio: letalidad de cada jefe entre 0,8× y 1,3× de la media (`analyze:meta`, sección jefes), sin avisos.
- `qa:visual`: cero recortes en `hallazgo` y `plano`.
- Panel: sentimiento medio de cada jefe ≥ 0 en el cruce `meta_vs_personas` (el panel no tiene una pregunta propia de «identidad»); aprobación sin bajar de su margen.

**Fuera de alcance.** Nuevas obras o niveles, nuevas palabras clave, música de fondo (V8).

---

## V8 · Sensación cinética y tres horas de audio sin repetirse

**Tema.** Cada golpe se siente, y una sesión larga no cansa el oído ni la vista.

**Evidencia.**
- `riesgo_fatiga_4h` en las auditorías por pantalla: valores de 3 a 6 sobre 10; el plano llega a 6.
- Queja «fatiga visual / textura»: segunda o tercera queja de purista, especialista de arte y streamer.
- Defecto oculto: «no hay audio diferenciado para errores de cálculo vs. aciertos».
- Auditorías de `hallazgo` y `plano`: fondos oscuros con texto pequeño como riesgo de fatiga.

**Entregables.**
1. Variación del audio: cada efecto repetido cambia tono, ataque y panorama con una semilla; ninguna secuencia idéntica de más de 8 golpes. Celda `juice-ux`.
2. Música por nivel en cuatro capas que entran y salen según la tensión; 3 h sin una repetición audible de más de 30 s. Celda `juice-ux`.
3. Acierto y fallo con timbres distintos y retorno háptico opcional en móvil. Celda `juice-ux`.
4. Reducción de ruido visual: opción «Grano suave» en Ajustes y descanso de animaciones tras 45 min de sesión. Celda `arte-ui`.
5. Medidor de variedad en `scripts/` que simula 3 h de eventos y cuenta repeticiones (lo escribe `juice-ux`; lo consume la puerta de humo). Celda `juice-ux`.
6. Registro. Celda `director`.

**Criterios de aceptación.**
- Medidor de variedad: cero repeticiones exactas de más de 30 s en 3 h simuladas, ninguna secuencia de efectos idéntica > 8.
- `qa:smoke`: sigue en verde con la velocidad 1×, 2× y 4×.
- Panel: `riesgo_fatiga_4h` medio ≤ 4 en todas las pantallas.

**Fuera de alcance.** Archivos de audio (todo se sintetiza), reglas, balance.

---

## V9 · Cooperativo a prueba de balas, `balance-config.json` y telemetría anónima

**Tema.** Una cuadrilla no pierde la partida por la red, y el balance vive en un solo archivo.

**Evidencia.**
- README: el servidor es autoritativo y las salas van por código; `src/server/index.ts` ya tiene un mensaje `rejoin`, pero ninguna prueba cubre cortes de red ni desincronización.
- Los números de balance están repartidos en `src/rules/run.ts` (`STAGES`, `FATIGUE`), `tools.ts` y `specials.ts`; el panel propuso cambios (`FATIGUE.every`, Horno, Ariete, `STAGES[7].threat`) que hubo que aplicar a mano.
- El propio informe lo deja claro: la simulación no mide latencia real; hace falta telemetría de verdad para validar el panel.

**Entregables.**
1. Reconexión: quien pierde la conexión recupera su asiento con el estado completo durante 120 s. Celda `juice-ux` (red y servidor, por ampliación de dominio de esta especificación).
2. Comprobación de desincronización: resumen (hash) del estado cada jugada; si no coincide, el servidor reenvía el estado. Celda `reglas-balance` (hash puro) y `juice-ux` (red).
3. `src/rules/balance-config.json`: `STAGES`, `FATIGUE`, tablas de herramientas y niveles, validado por esquema en `tests/`. El motor lo lee. Celda `reglas-balance`.
4. Telemetría anónima: **opcional, apagada por defecto, con consentimiento explícito** en una pantalla propia. Solo cuenta eventos agregados (resultado de obra, herramienta elegida) sin identificadores. Celda `juice-ux` (cliente y envío) y `arte-ui` (pantalla de consentimiento).
5. Prueba de 200 partidas cooperativas simuladas con cortes de red aleatorios. Celda `reglas-balance`.
6. Registro y política de privacidad en el README. Celda `director`.

**Criterios de aceptación.**
- Prueba cooperativa simulada: 0 desincronizaciones y 100 % de reconexiones dentro de la ventana.
- Esquema: una prueba falla si `balance-config.json` rompe un objetivo de balance o la constitución.
- Telemetría: por defecto no se envía ni una petición (prueba de humo con red bloqueada); activarla pide un sí explícito.
- Laboratorio: resultados idénticos a la V8 (el JSON solo mueve los números de sitio).

**Fuera de alcance.** Cuentas de usuario, tablas de clasificación, cambios de reglas.

---

## V10 · Congelación de funciones y pulido de candidata a lanzamiento

**Tema.** Cero funciones nuevas: defectos, rendimiento, accesibilidad y textos.

**Evidencia.**
- La suma de las versiones anteriores deja la superficie completa del juego; lo que falta es robustez.
- Auditorías por pantalla: 76 revisiones (19 estados × 4 ventanas) que se repiten cada versión.
- Constitución anticomplejidad: P95 de turnos y límites de herramientas verificados en la puerta.

**Entregables.**
1. Revisión de textos: ortografía, tono, descripciones ≤ 115 caracteres, sin jerga. Celda `reglas-balance` (reglas) y `arte-ui` (interfaz).
2. Accesibilidad: roles y nombres de los controles, orden de tabulación, `prefers-reduced-motion`, contraste AA en todas las pantallas. Celda `arte-ui`.
3. Rendimiento: 60 fps en una portátil de gama baja con 4 jugadores, carga inicial < 3 s en `build:web`. Celda `juice-ux`.
4. Defectos: cero P0/P1 abiertos en la QA visual y en la de humo; barrido de todos los estados. Celda `juice-ux`.
5. Equilibrio final: informe completo del laboratorio y `npm run docs`. Celda `reglas-balance`.
6. Lista de salida firmada, `CHANGELOG.md` y etiqueta `v10.0.0`. Celda `director`.

**Criterios de aceptación.**
- Cero diferencias en el número de herramientas, palabras clave y cartas respecto a la V9 (`tests/invariantes.test.ts` compara).
- `qa:visual` y `qa:smoke` en verde dos corridas seguidas.
- Panel: aprobación por persona sin bajar del ruido respecto a la V9.

**Fuera de alcance.** Funciones nuevas de cualquier tipo, cambios de reglas, nuevos jefes o herramientas.
