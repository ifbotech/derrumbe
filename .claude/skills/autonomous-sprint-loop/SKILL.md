---
name: autonomous-sprint-loop
description: Bucle autónomo de versiones de SANGRE Y PALO. Desde la V40, la refundación hasta `v40.0.0` sin panel y luego el bucle V41 → V50 con el panel y su listón promediado; explica cómo se escribe una especificación con celdas, las puertas técnicas y la del panel, y cuándo una versión se corona y se publica o se aparta a `rechazado/vXX`. Incluye el orquestador histórico de la V7–V10 (scripts/estudio-autonomo.ps1). Úsala para lanzar el bucle, retomarlo, preparar la especificación de una versión o entender por qué una se rechazó.
---

# Bucle autónomo de sprints

Una versión de SANGRE Y PALO es un sprint con tema. El bucle las construye una tras otra sin nadie delante y solo deja pasar la que no empeora.

| Pieza | Dónde |
|---|---|
| Constitución vigente | `SPECS/V40-REFUNDACION.md` (manda sobre las especificaciones anteriores donde choquen) |
| Mandato del bucle | `artifacts/mision/v40/MANDATO-NOCTURNO.md` |
| Especificación de cada versión | `SPECS/V{n}.md` |
| Subagentes (celdas) | `.claude/agents/{director,reglas-balance,arte-ui,juice-ux}.md` |
| Panel simulado (puerta de GPU) | `..\panelAgentesGaming` |
| Lección de cada versión | `MEMORIA_EVOLUTIVA.md` |
| Rastro de cada versión | `artifacts/mision/v{n}/` (bitácoras por tramo) |
| Orquestador histórico (V7–V10) | `scripts/estudio-autonomo.ps1` y `ROADMAP_V5_V10.md` |

## Los sprints

| Versión | Tema |
|---|---|
| V40 · fase 1 (1a–1e) | Reglas y poda: baraja española (1 a 9, 2 Comodines, Corte de 10 Sota, 11 Caballo y 12 Rey), 5 Mazos, 4 Reyes con Bendiciones, cargas, niveles [2/4] y Duales, Amuletos y Trampas del Bufón, sellos S · A · B, fuera Asalto diario y Partida guiada; 1e, reglas del mapa ramificado, el botín y los servicios de La Pulpería |
| V40 · fase 2 | Forja pixel-art y el Bufón: naipes, pintas del marco, Reyes, iconos de Amuletos, Bufón animado |
| V40 · fase 3 | Interfaz mínima y jugo: HUD superior único, mapa ramificado, botín y «ELEGÍ UNA», La Pulpería en bandejas, Bendiciones con sellos, frases y reacciones del Bufón, mínimo texto |
| V40 · fase 4 | Puertas, documentos y despliegue: `v40.0.0` y GitHub Pages |
| V41 → V50 | Una hipótesis cohesiva por versión, en orden: claridad ≥ 8,2 y cero fricción visual; diversión ≥ 8,5 y jugo del Bufón (¡Escoba!, ¡Envido!, ¡Chancho!, Golpe exacto, sinergias); Steam Deck ≥ 85 % y móvil ≥ 85 % |

Historia: la V6 cambió el tema de obra y demolición a la conjura; de la V7 a la V10 corrió el orquestador de abajo; de la 11.0 a la 38.0, bucles a mano con el panel; la 38.0 (baraja francesa) queda intacta en `legado/baraja-francesa-v38` (`v38.0.0`). Las especificaciones nuevas escriben con el vocabulario de la V40: Espadas, Bastos, Oros y Copas; La Pulpería; el Altar.

## El bucle vigente (mandato del 2026-11-18)

Lo orquesta el Director en la sesión, **en primer plano y en serie**, sin preguntas: decide con los números.

1. **V40 sin panel**: tema, baraja, modos e interfaz cambian enteros, y medir contra placebos de la V35–V38 no tiene sentido. Mandan las puertas técnicas y el UAT del usuario en la web. Cada tramo trabaja en `refundacion/v40`; al cerrar la fase 4, fusión a `main`, etiqueta `v40.0.0` y `git push origin main --tags`.
2. **Paso A** (tras `v40.0.0`): `escenas_v40.py` en `..\panelAgentesGaming` (lector del juego y pytest al día, fiel y con guardia de honestidad); línea base `pulso-60` de la V40 y 2–3 **placebos nulos** para el listón promediado.
3. **Paso B**: una hipótesis por versión (tabla de arriba), en la rama `estudio/v{n}`.
4. **Puertas** (abajo) en verde.
5. **Veredicto** contra el listón promediado y el placebo emparejado (abajo).
6. **Coronada**: CHANGELOG y `MEMORIA_EVOLUTIVA.md`, fusión a `main`, etiqueta `v{n}.0.0` y `git push origin main --tags` en el acto. **Rechazada**: la rama queda como `rechazado/v{n}`, la lección va a `MEMORIA_EVOLUTIVA.md` y se pasa a la hipótesis siguiente desde el Campeón.
7. Al final: `main` limpio y subido, y un **Resumen Ejecutivo Matutino** (versiones que entraron, métricas, qué probar primero).

Nunca reescribe `main`: ni `reset --hard` ni `push --force`. «Revertir» aquí es no fusionar.

### Puertas

| Puerta | Orden | Pasa si | Responsable |
|---|---|---|---|
| tipos | `npm run typecheck` | sale con 0 | según el archivo del error |
| pruebas | `npm test` (dos pasadas: todo y el cooperativo aparte, que se repite solo si Node cae con `0xC0000409`) | sale con 0 (incluye vocabulario, marca e invariantes anticomplejidad) | `reglas-balance` |
| textos | `npm run i18n:check` | sale con 0 | `reglas-balance` |
| laboratorio | `npm run analyze:meta` por tramos (`--tramo=k/n`, `--previo=…`, `--juntar`); en el bucle, `-- --fast` si cambian números | `scripts/meta-report.json` sin avisos | `reglas-balance` |
| documentos | `npm run docs` | sale con 0 | `reglas-balance` |
| forja | `npm run forja` | sin fallos | `arte-ui` |
| capturas | `npm run qa:visual` y `-- --lang=en` | cero fallos en las cuatro ventanas, texto ≥ 14 px | `arte-ui` |
| humo | `npm run qa:smoke:todo` y `-- --lang=en` (en cada vuelta, `qa:smoke -- --fast`) | «Todo en orden», mando virtual incluido | `juice-ux` |
| fluidez | `npm run qa:fps` | 60 fps | `juice-ux` |
| web | `npm run build:web` | sale con 0 | `arte-ui` |

### Veredicto del panel

- Snapshot del commit candidato (con las capturas de `npm run qa:visual` en español rehechas justo antes: el snapshot lee `artifacts/visual-qa`) y corrida `pulso-60` por tramos de ≤ 600 s (`run --resume`).
- `python -m panel_gaming placebo --campeon snapshots/<campeón> --candidata snapshots/<cand>` arma el placebo emparejado (un sinónimo por escena tocada), que se mide igual que la candidata.
- `python -m panel_gaming veredicto <run cand> <run placebo> --campeon <run_campeón> <nulo_1> …` acepta solo si (1) la candidata bate a su placebo, (2) ΔF contra el **listón** (la media del Campeón y sus placebos nulos) ≥ −5,0 y (3) ningún piso se hunde: claridad o diversión −0,10 con p < 0,05, aprobación −5, críticos, impulsivos, Steam Deck o móvil más de una persona neta; salvo que siga en su meta y ΔF ≥ +5.
- También se corona la versión que resuelve un P0 visual real (medido en la captura, no dicho por la síntesis) sin hundir pisos.

## Leer el veredicto

- El voto del panel se mueve casi solo por azar: el mismo juego dio F 162 y 140 en dos corridas, y un placebo nulo ya baja F unos 5 puntos. Por eso el listón se promedia y cada candidata lleva su placebo.
- Una subida menor que la deriva de los placebos no es mejora probada. Lo que una versión demuestra de verdad son sus puertas técnicas.
- El panel es una **simulación** con modelos locales: ordena prioridades y encuentra fricciones probables. No sustituye a jugadores.
- Los objetivos por estrato (claridad del casual, Steam Deck, móvil) se leen en `salidas\<run_id>\INFORME_EJECUTIVO.md`; los estratos de 9–12 personas son orientativos.

## Escribir la especificación de una versión

La escribe `director`. El formato (el orquestador histórico lo lee igual):

```markdown
# V41 · <tema en una frase>

## 1. Tema y evidencia
…

## 2. Celdas

### Celda: reglas-balance
<encargo autosuficiente: archivos, qué cambia, qué no se toca y con qué orden se comprueba>

### Celda: arte-ui
…

### Celda: director
<lo que escribe al cierre, con las medidas de las puertas>

## 3. Criterios de aceptación
…
```

Reglas:

- El título de primer nivel es el tema: acaba en el mensaje del commit.
- Nombres válidos de celda: `reglas-balance`, `arte-ui`, `juice-ux`, `director`. Un bloque termina en la celda siguiente o en un `## `.
- Las celdas corren **en serie** y comparten rama: la que expone un dato (reglas) va antes que la que lo pinta (arte, juice). Las de `director` siempre van al cierre, estén donde estén.
- Cada encargo se entiende solo: quien lo lee no ha visto nada más. Di los archivos, el contrato con las otras celdas y la orden que lo comprueba.
- Constitución anticomplejidad en cada versión: ≤ 5 palabras clave; 20–24 Amuletos y 8 Trampas del Bufón (tramo 1d; hasta entonces, ≤ 56 Reliquias); descripciones ≤ 115 caracteres en los dos idiomas y frases del Bufón y de los Reyes ≤ 90; Multi siempre entero; P95 de turnos dentro de los topes de `scripts/objetivos.ts` (hoy 8 · 16 · 19, y 19 por Mazo); los 5 Mazos a ±5 puntos; sellos S · A · B sacados del laboratorio.
- Cada encargo pide lo que las misiones demostraron: Bitácora al día al cerrar **cada bloque**, no solo al final (una sesión cortada se retoma desde ella); todo en **primer plano** y en serie, sin órdenes en segundo plano ni esperas de archivos de señal; topes duros de **300 s** por orden de Node o Playwright y **600 s** por orden del panel (`node scripts/con-tope.mjs <segundos> <orden…>`), y lo que no cabe va en tramos; nunca `git worktree` ni enlaces (junctions) a `node_modules`. Una versión no añade un sistema sin retirar o simplificar otro.
- Vocabulario en cada encargo: el título del juego solo se escribe en `src/shared/brand.ts`, y ninguna palabra del tema viejo ni de la baraja francesa puede aparecer en lo que lee el jugador (`tests/vocabulario.test.ts` y la regla «jerga» de `npm run qa:visual`).
- Commits solo con la autoría del usuario, sin coautoría ni menciones a asistentes.

## El orquestador histórico (V7–V10)

`scripts/estudio-autonomo.ps1` lanzaba una sesión `claude -p --agent <subagente>` por celda, pasaba las puertas de CPU y luego el panel (`--preset v6-completo`, con márgenes de aprobación y claridad que ya no se usan). Sigue en el repositorio, pero sus esperas largas en sesiones sin ventana chocan con la regla de primer plano: el bucle vigente lo lleva el Director a mano.

```powershell
.\scripts\estudio-autonomo.ps1 -Ensayo                     # qué haría, sin tocar nada
.\scripts\estudio-autonomo.ps1 -Desde 7 -Hasta 7 -SinGpu   # una versión, solo puertas de CPU
```

## Cuando algo se tuerce

| Síntoma | Qué mirar | Qué hacer |
|---|---|---|
| «Hay cambios sin guardar» al empezar | `git status` | commit o descartar antes; el bucle no pisa trabajo a medias |
| Una orden pasa del tope | `scripts/con-tope.mjs` la mata con su árbol | partirla en tramos (`--tramo`, `--solo`, `VIEW=`, lista de estados) |
| Una puerta no pasa tras dos intentos | la bitácora del tramo | la versión se aparta; la rama conserva el trabajo y se puede retomar a mano |
| `node_modules` vacío o roto | ¿hubo un `git worktree` o un enlace? | `npm ci` (mismo `package-lock.json`); no volver a usar worktrees ni junctions |
| El panel se corta | el registro de la corrida | en `..\panelAgentesGaming`: `python -m panel_gaming run --resume <run_id>` |
| Ollama atiende de a uno (panel 40 % más lento) | log de `ollama serve` | reiniciarlo con sus variables antes de cada corrida |
| Versión rechazada por el panel | el veredicto y el informe del panel | lección en `MEMORIA_EVOLUTIVA.md`, rama `rechazado/v{n}` y siguiente hipótesis |
