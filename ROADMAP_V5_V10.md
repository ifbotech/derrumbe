# Hoja de ruta CORONA ROTA · V5 a V10

Escrita por el Director. Primera versión el 2026-11-12 sobre DERRUMBE 4.0.0 (commit `f616e73`); rehecha el mismo día, tras la 5.0 (commit `6d319ec`), para el cambio de tema de la V6. El juego se llamaba **DERRUMBE** hasta la 5.0; desde la 6.0 se llama **CORONA ROTA** (`src/shared/brand.ts`).

## Cómo leer los números

- Las cifras del panel salen de una **simulación** con modelos locales (240 personas ficticias, `..\panelAgentesGaming`). Ordena prioridades. No sustituye a jugadores reales.
- Con n = 240 el intervalo de confianza del 95 % de la aprobación es de unos ±6 puntos. **Una diferencia menor que eso entre dos corridas es ruido**: ni regresión ni mejora probada.
- Los estratos son más pequeños (casual n = 48, Steam Deck n = 36): ahí el ruido es de ±10 puntos o más. Para esos estratos la puerta mira la **claridad media** y la dirección, no el porcentaje.
- Los números de balance (victorias, ritmo, letalidad) no vienen del panel: vienen del laboratorio (`npm run analyze:meta`). Si el panel y el laboratorio chocan, manda el laboratorio.
- **No hay todavía auditoría del panel sobre la 5.0 ni sobre la 6.0.** La última corrida es la de la V4 (`panelAgentesGaming\salidas\v4-completo-20261112-084346\`). Las evidencias de panel que se citan abajo son de la V4 y hablan del juego viejo; el bucle audita `main` como línea base antes de la V7.
- Laboratorio de referencia: el informe de la 5.0 (`artifacts/v6/meta-report-5.0.json`, 55.640 campañas, sin avisos).

## Tabla resumen

| Versión | Tema | Métrica que debe mover | Puerta |
|---|---|---|---|
| V5 | Claridad de cristal, ergonomía y balance con datos (entonces DERRUMBE) | Legibilidad, mando y balance de Clausura | Hecha. CPU verde; GPU sin correr |
| V6 | Cambio de tema 360° y claridad universal | Cero jerga vieja; laboratorio idéntico al de la 5.0; las notas abiertas de la 5.0 cerradas | CPU + jerga en cero + laboratorio idéntico; GPU al arrancar la V7 (línea base) |
| V7 | Enseñanza interactiva de 60 segundos y personalidad de los monarcas | Claridad del casual (V4: 3,58/10) ≥ 4,5; letalidad de cada monarca en 0,8×–1,3× de la media | CPU + GPU + bot novato ≥ 90 % en el asalto 1 |
| V8 | Jugo de la caída de un trono, sellos de lacre con brillo y variaciones de audio de corte | `riesgo_fatiga_4h` (V4: 3–6 de 10) ≤ 4; cero repeticiones de audio > 30 s en 3 h | CPU + GPU + medidor de variedad |
| V9 | Cooperativo pulido, `balance-config.json` con autoajuste y telemetría con la privacidad primero | 0 desincronizaciones en 200 partidas con cortes; laboratorio idéntico; cero peticiones sin consentimiento | CPU + GPU + prueba de reconexión, de esquema y de red bloqueada |
| V10 | Candidata a lanzamiento con funciones congeladas: accesibilidad, preparación para traducir y empaquetado para Steam / Tauri v2 | Cero P0/P1; contraste AA; cero textos fuera del catálogo; ejecutable de escritorio que pasa la prueba de humo | CPU + GPU + lista de salida firmada |

Regla común: **ninguna versión añade un sistema nuevo sin retirar o simplificar otro**, y todas respetan la constitución anticomplejidad: ≤ 6 palabras clave, ≤ 56 reliquias (hoy 52), descripciones de reliquia, carta especial, monarca y Reinado ≤ 115 caracteres, P95 ≤ 19 turnos en los asaltos 4 a 8 con las seis barajas.

## Cómo corre el bucle

`scripts/estudio-autonomo.ps1` ejecuta una versión de principio a fin. **Arranca en la V7**: la V6 la hace a mano el orquestador con seis celdas en paralelo (normas en `SPECS/V6-normas-y-glosario.md`), igual que la V5. Hasta que el dueño de `scripts/` cambie el valor por defecto de `-Desde` (hoy 6), se lanza con `.\scripts\estudio-autonomo.ps1 -Desde 7`.

Antes de la primera versión, si no hay corrida guardada de la anterior, el bucle **audita `main` como línea base** (la 6.0 recién fusionada): son unos 90–105 minutos de panel en la RTX 3090. Esa corrida es la primera medida del juego con el tema nuevo; todo lo que se compare en la V7 se compara contra ella, no contra la V4.

Para cada versión `n`:

1. Crea la rama `estudio/v{n}` desde `main`.
2. Pone `DUNGEON_HERO` (el héroe del Pixel Dungeon) para que cada sala se vea en el calabozo.
3. Lee `SPECS/V{n}.md` y, por cada bloque `### Celda: <nombre>` de trabajo (`reglas-balance`, `arte-ui`, `juice-ux`), en el orden en que aparecen y **una detrás de otra**, lanza una sesión `claude -p --agent <nombre>` con el texto del bloque como encargo.
4. Pasa las **puertas de CPU**, en este orden: `npm run typecheck`, `npm test` (incluye `tests/vocabulario.test.ts`: cero jerga vieja), `npm run analyze:meta` (sin avisos), `npm run docs`, `npm run qa:visual` (cero fallos, incluida la regla «jerga») y `npm run qa:smoke` (cero problemas). Si una falla, la celda responsable recibe el final del registro y lo arregla; dos intentos (`-Intentos`). Al tercero, la versión se aparta.
5. **Cierre**: las celdas `director` corren después de las puertas, con las medidas reales delante, y escriben la entrada del registro de cambios.
6. Hace el **commit candidato** en `estudio/v{n}`, solo con la autoría del usuario (sin `Co-Authored-By`).
7. Dispara la **puerta de GPU** en `..\panelAgentesGaming`: el panel de 240 personas sobre el commit candidato, con la sala `QA-3090` enseñando su avance. El panel habla ya el vocabulario de CORONA ROTA (lo adapta la celda `panel` de la V6).
8. **Compara** la aprobación por persona y la claridad media contra la corrida de la versión anterior. Regresión es bajar más de `-MargenAprobacion` puntos (3 por defecto) o más de `-MargenClaridad` (0,15 por defecto). El margen es más estricto que el ruido (unos 6 puntos): prefiere apartar una versión dudosa a publicar una peor. Los objetivos por estrato de cada especificación (claridad del casual, fatiga a las 4 h…) se leen en el informe del panel; no bloquean solos.
9. Si pasa: fusiona `estudio/v{n}` en `main` y etiqueta `v{n}.0.0` con el veredicto del panel en la nota de la etiqueta (y publica si se lanzó con `-Publicar`). Si no pasa: renombra la rama a `rechazado/v{n}-<fecha>`, `main` queda como estaba y el bucle se detiene. Nunca `git reset --hard` ni `push --force` sobre `main`.

Cada versión deja su rastro en `artifacts/estudio/v{n}/`: un registro por celda y por puerta, y `veredicto.json`. Para ver qué haría sin tocar nada: `.\scripts\estudio-autonomo.ps1 -Desde 7 -Ensayo`.

---

## V5 · Claridad de cristal, ergonomía y balance con datos (entonces DERRUMBE)

**Estado: hecha (2026-11-12, commit `6d319ec`). Puerta de GPU sin correr.**

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

**Fuera de alcance.** Cambiar `FATIGUE.every`, tocar el Horno más allá de 2→3, rediseñar la enseñanza inicial, jefes, audio, servidor.

**Resultado.**
- QA visual: 100 capturas (25 estados × 4 ventanas), cero fallos; la línea base con la QA nueva eran 2.719. Texto ≥ 13 px, ♠♦♥♣ ≥ 7:1 sobre crema, dianas de 44 px. 177 pruebas en verde.
- Laboratorio (55.640 campañas, sin avisos): Clausura 6,8 % vacío y 15,3 % lleno (antes 4,1 / 10,9) con 5>6>7>8 estricto; Timbre 49,4 % dado de salida (antes 30,0); La Ventisca ×0,94 (antes ×1,14); jefes entre ×0,91 y ×1,10; peor P95 de turnos 18.
- Prueba de humo del mando: 143 comprobaciones, en verde.
- Abierto al cerrar la 5.0 (pasa a la V6): LB/RB sobre las herramientas en la mesa sin cubrir en la prueba de humo; la «Semilla» de la preparación bajo el pliegue en 1366×768; el aviso de último turno resta unos 60 px a las torres en 390×844; con un susurro a la vista, un camino de cruceta cuesta 7 pulsaciones en vez de 6; el final de la partida clásica sin estado de QA propio; 13 avisos de densidad de tinta en iconos. El panel no se ha corrido sobre la 5.0.

---

## V6 · Cambio de tema 360° y claridad universal

**Estado: en curso (a mano, seis celdas en paralelo).** Especificación: `SPECS/V6.md`. Ley del sprint: `SPECS/V6-normas-y-glosario.md`. Nombres: `SPECS/V6-biblia-de-nombres.md`.

**Tema.** El mismo juego, con otro mundo: de obra y demolición a conjura contra una corte de naipes, con el título **CORONA ROTA** y palabras que un niño entiende en dos segundos. Ni una cuenta cambia.

**Evidencia.**
- El vocabulario de obra obliga a traducir dos veces: «Fuerza × Resonancia», «sirena», «cantera», «escombrera» no son palabras de baraja. La queja «reglas confusas / tutorial» suma 187 menciones en la V4 y el casual da claridad 3,58/10 (panel simulado V4, n = 48).
- «Palo inmune / material» está entre las tres primeras quejas de los seis arquetipos (V4): «♠ Acero» pide aprender un material encima de un palo; «♠ Picas» no.
- La gótica de los títulos se lee mal («Sepultados» se leía «SEPUETADOS» en las capturas de la 5.0).
- «Regicide» es un juego comercial que ya existe: el título y los nombres propios deben ser nuestros (Mercado clandestino, Motín, As cómplice).
- Quedan seis notas abiertas de la 5.0 (arriba): la V6 cierra las tres que se pueden medir.

**Entregables.** Seis celdas a la vez: `reglas-balance` (datos y reglamento), `arte-ui` A (grabado y títulos), `arte-ui` B (textos y pantallas), `juice-ux` (susurros, guion, mando, red, sonido), `panel` (vocabulario del panel simulado) y `director` (biblia, hoja de ruta, especificaciones, registro).

**Criterios de aceptación.** Informe del laboratorio idéntico al de la 5.0; cero palabras prohibidas en las tres redes; forja limpia; QA visual sin fallos; LB/RB en combate dentro de la prueba de humo; «Semilla» sin desplazamiento en 1366×768; aviso de último turno compacto en 390×844. Detalle y órdenes en `SPECS/V6.md`.

**Fuera de alcance.** Reglas, números, identificadores, protocolo de red, claves de `localStorage`, la dirección `/derrumbe/`.

---

## V7 · Enseñanza interactiva de 60 segundos y personalidad de los monarcas

**Tema.** En el primer minuto se aprende la rueda de palos y el Golpe exacto jugando, y cada monarca se reconoce por su cara, su voz y su decreto.

**Evidencia.**
- Casual: claridad 3,58/10 y aprobación 10,4 % (V4, n = 48); «reglas confusas / tutorial»: 187 quejas; defecto oculto repetido: «no hay un modo interactivo que explique causa y efecto de los palos».
- Laboratorio 5.0: asalto 1 con mediana de 6 turnos (P95 9): sobra margen para enseñar sin tocar el balance.
- Letalidad por monarca (laboratorio 5.0, 55.640 campañas): de 13,6 % (La Dama del Cáliz) a 16,4 % (El Usurero), media 14,9 %. Hoy todos caben en 0,8×–1,3×; el riesgo es romperlo al darles personalidad.
- Sentimiento por jefe en la V4: La Ventisca (hoy La Reina Helada) −0,48. Hay que volver a medirlo con el tema nuevo antes de decidir nada.

**Entregables.** Guion del asalto 1 como hitos verificables y bot novato (`reglas-balance`); pistas sobre el propio tablero, partida guiada opcional, firma sonora de cada monarca (`juice-ux`); rueda de palos, retrato y marco de cada monarca, pantalla del secreto de la cripta sin recortes (`arte-ui`); registro (`director`). Se retira el guion de pasos obligatorios de la partida guiada a cambio de las pistas.

**Criterios de aceptación.** Bot novato ≥ 90 % en el asalto 1; letalidad de cada monarca en 0,8×–1,3×; partida nueva hasta el primer Golpe exacto sin ventanas; claridad del casual ≥ 4,5 en el panel y aprobación sin bajar del margen. Detalle en `SPECS/V7.md`.

**Fuera de alcance.** Monarcas, asaltos o Reinados nuevos; palabras clave nuevas; números de los asaltos 2 a 8; música; cooperativo.

---

## V8 · Jugo de la caída de un trono, sellos de lacre con brillo y variaciones de audio de corte

**Tema.** Que caiga un trono se sienta, que un sello de lacre brille cuando trabaja, y que tres horas de juego no cansen el oído ni la vista.

**Evidencia.**
- `riesgo_fatiga_4h` en las auditorías por pantalla de la V4: de 3 a 6 sobre 10 (el mapa llega a 6).
- Queja «fatiga visual / textura»: entre las tres primeras de purista, especialista de arte y streamer (V4).
- Defecto oculto: «no hay audio distinto para el acierto y el fallo».
- El sonido ya se sintetiza todo en `src/client/audio.ts` (escenas por asalto y presión): hay base para variar sin archivos.

**Entregables.** Caída de un trono con su secuencia propia (`juice-ux`); brillo del sello de lacre y del acabado cuando suman en la cuenta (`arte-ui`); audio de corte en cuatro capas con variación sembrada y medidor de variedad (`juice-ux`); «Grano suave» y descanso de animaciones (`arte-ui`); registro (`director`).

**Criterios de aceptación.** Cero repeticiones de más de 30 s en 3 h simuladas; ninguna secuencia de efectos idéntica de más de 8; la caída de un trono dura ≤ 1,2 s a 1× y respeta `prefers-reduced-motion`; `riesgo_fatiga_4h` medio ≤ 4. Detalle en `SPECS/V8.md`.

**Fuera de alcance.** Archivos de audio, reglas, balance.

---

## V9 · Cooperativo pulido, `balance-config.json` con autoajuste y telemetría con la privacidad primero

**Tema.** Una conjura de cuatro no pierde el asalto por la red; el balance vive en un solo archivo y se ajusta solo dentro de sus objetivos; y quien quiera ayudar con datos lo hace sin dar nada suyo.

**Evidencia.**
- El servidor es autoritativo y ya tiene `rejoin` (`src/server/index.ts`), pero ninguna prueba cubre cortes de red ni desincronización.
- Los números de balance están repartidos entre `run.ts`, `tools.ts` y `specials.ts`; los cambios que propuso el panel de la V4 se aplicaron a mano.
- El panel es una simulación: no mide latencia real ni cómo juega gente de verdad. Hace falta telemetría real, y solo vale si es **opcional, anónima y apagada por defecto**.

**Entregables.** `balance-config.json` con esquema y un autoajuste que propone cambios dentro de los objetivos y nunca los aplica solo (`reglas-balance`); reconexión de 120 s y comprobación de desincronización por resumen del estado (`juice-ux`, con el resumen puro de `reglas-balance`); pantalla de consentimiento (`arte-ui`); política de privacidad en el README (`director`).

**Criterios de aceptación.** 200 partidas cooperativas con cortes: 0 desincronizaciones y 100 % de reconexiones; laboratorio idéntico al de la V8 con el JSON; sin consentimiento, cero peticiones de red de telemetría. Detalle en `SPECS/V9.md`.

**Fuera de alcance.** Cuentas, clasificaciones, emparejamiento, cambios de reglas, cualquier dato que identifique a una persona.

---

## V10 · Candidata a lanzamiento con funciones congeladas: accesibilidad, preparación para traducir y empaquetado para Steam / Tauri v2

**Tema.** Cero funciones nuevas: que lo pueda jugar cualquiera, que se pueda traducir sin tocar código y que se instale como un juego de escritorio.

**Evidencia.**
- La superficie del juego queda completa en la V9; lo que falta es robustez.
- Las auditorías por pantalla se repiten cada versión (25 estados × 4 ventanas en la QA visual de la 5.0).
- Hoy los textos viven repartidos entre `src/rules` y `src/client`: traducir obliga a tocar código.
- El juego solo se distribuye como web (GitHub Pages en `/derrumbe/`).

**Entregables.** Accesibilidad AA, roles y orden de tabulación, `prefers-reduced-motion` y modo de alto contraste (`arte-ui`); catálogo de textos en español con claves, listo para traducir (`reglas-balance` para `src/rules`, `arte-ui` para el cliente); empaquetado con Tauri v2 para Windows, Linux y Steam Deck, con guardado propio y sin servidor obligatorio (`juice-ux`); rendimiento a 60 fps (`juice-ux`); lista de salida firmada (`director`).

**Criterios de aceptación.** Cero P0/P1 en QA visual y de humo dos corridas seguidas; contraste AA en todas las pantallas; cero textos visibles fuera del catálogo; el ejecutable de Tauri pasa la prueba de humo; mismas reliquias, palabras clave y cartas que la V9. Detalle en `SPECS/V10.md`.

**Fuera de alcance.** Funciones nuevas, cambios de reglas, traducciones hechas (solo se prepara), subir a Steam (solo se empaqueta).
