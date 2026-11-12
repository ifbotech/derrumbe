---
name: autonomous-sprint-loop
description: Bucle autónomo de versiones de DERRUMBE (V6 a V10). Explica scripts/estudio-autonomo.ps1 y ROADMAP_V5_V10.md, cómo se escribe una especificación con celdas, las puertas de CPU y de GPU, y cuándo una versión se etiqueta o se aparta. Úsala para lanzar el bucle, retomarlo, preparar la especificación de una versión o entender por qué una se rechazó.
---

# Bucle autónomo de sprints

Una versión de DERRUMBE es un sprint con tema. El bucle las construye una tras otra sin nadie delante y solo deja pasar la que no empeora.

| Pieza | Dónde |
|---|---|
| Hoja de ruta | `ROADMAP_V5_V10.md` |
| Especificación de cada versión | `SPECS/V{n}.md` |
| Orquestador | `scripts/estudio-autonomo.ps1` |
| Subagentes (celdas) | `.claude/agents/{director,reglas-balance,arte-ui,juice-ux}.md` |
| Panel simulado (puerta de GPU) | `..\panelAgentesGaming` |
| Rastro de cada versión | `artifacts/estudio/v{n}/` |

## Los sprints

| Versión | Tema |
|---|---|
| V6 | Los tres primeros minutos: enseñanza invisible |
| V7 | Identidad de jefes y hallazgos del subsuelo |
| V8 | Sensación cinética y tres horas de audio sin repetirse |
| V9 | Cooperativo a prueba de balas + `balance-config.json` + telemetría anónima |
| V10 | Congelación de funciones y pulido de candidata a lanzamiento |

## Lanzarlo

```powershell
.\scripts\estudio-autonomo.ps1 -Ensayo                     # qué haría, sin tocar nada
.\scripts\estudio-autonomo.ps1                             # V6 a V10; etiqueta, no publica
.\scripts\estudio-autonomo.ps1 -Publicar -ReiniciarOllama  # y publica cada versión aceptada
.\scripts\estudio-autonomo.ps1 -Desde 7 -Hasta 7           # solo una versión
.\scripts\estudio-autonomo.ps1 -SinGpu                     # solo puertas de CPU (sin panel)
```

Antes: rama `main`, árbol de trabajo limpio y `claude`, `node`, `npm` y `git` en el PATH. Para la puerta de GPU, el entorno del panel creado (`..\panelAgentesGaming\.venv`) y Ollama con sus dos modelos. Una versión completa tarda varias horas: las celdas, el laboratorio (unos 25 minutos) y el panel (unos 90–105 minutos).

Parámetros que importan:

- `-Intentos` (2): rondas de reparación por puerta de CPU antes de apartar la versión.
- `-MargenAprobacion` (3) y `-MargenClaridad` (0,15): cuánto puede bajar el panel sin contarse como regresión.
- `-BasePanel <run_id>`: corrida del panel con la que se compara la primera versión.
- `-Permisos` (`acceptEdits`): modo de permisos de las sesiones sin ventana. Llevan una lista corta de órdenes permitidas (npm, node, npx y git de solo lectura); no pueden hacer commit.
- `-Publicar`: `git push origin main --follow-tags` tras cada versión aceptada (publica en GitHub Pages).

## Qué hace con cada versión

1. **Rama** `estudio/v{n}` desde `main`.
2. **Celdas de obra**: por cada bloque `### Celda: <subagente>` de `SPECS/V{n}.md`, en orden y de una en una, una sesión `claude -p --agent <subagente>` con el encargo por la entrada estándar. Antes pone `DUNGEON_HERO=<Sala>`: los ganchos globales de Pixel Dungeon encienden la sala de ese subagente (`Reglas-Balance`, `Arte-UI`, `Juice-UX`) mientras trabaja.
3. **Puertas de CPU**, en orden. La primera que falla manda el final de su registro a la celda responsable:

   | Puerta | Orden | Pasa si | Responsable |
   |---|---|---|---|
   | tipos | `npm run typecheck` | sale con 0 | según el archivo del error |
   | pruebas | `npm test` | sale con 0 (incluye las invariantes anticomplejidad) | `reglas-balance` |
   | laboratorio | `npm run analyze:meta` | `scripts/meta-report.json` sin avisos | `reglas-balance` |
   | documentos | `npm run docs` | sale con 0 | `reglas-balance` |
   | capturas | `npm run qa:visual` | cero fallos en las cuatro ventanas | `arte-ui` |
   | humo | `npm run qa:smoke` | «Todo en orden», mando virtual incluido | `juice-ux` |

4. **Cierre**: las celdas `director` corren ahora, con las medidas de las puertas delante, y escriben el registro de cambios.
5. **Commit candidato** `DERRUMBE {n}.0: <tema>`, con la autoría de quien lanza el bucle.
6. **Puerta de GPU**: snapshot del commit y corrida del panel (`python -m panel_gaming run --preset v4-completo --commit-esperado <sha> --comparar-con <corrida anterior>`). Mientras corre, la sala `QA-3090` enseña la última línea de su avance (`node %USERPROFILE%\.claude\dungeon_hook.mjs set QA-3090 working "…"`), y al acabar queda en `done` con la aprobación y la claridad.
7. **Veredicto**: compara **aprobación por persona** y **claridad media** con la versión anterior.
   - Sin regresión: `git merge --ff-only`, etiqueta `v{n}.0.0` (con el veredicto en su nota) y, con `-Publicar`, push.
   - Con regresión, o con una puerta de CPU que no pasa tras los reintentos: `main` queda como estaba, la rama se renombra a `rechazado/v{n}-<fecha>` y **el bucle se detiene** (la versión siguiente parte de la anterior).

Nunca reescribe `main`: ni `reset --hard` ni `push --force`. «Revertir» aquí es no fusionar.

## Leer el veredicto

- La aprobación del panel con 240 personas tiene un intervalo de confianza de unos ±6 puntos. El margen por defecto (3 puntos) es más estricto a propósito: aparta versiones dudosas. Si una versión cae entre −3 y −6, mira el informe antes de darla por mala; puede ser ruido y merecer otra corrida.
- Una subida menor de 6 puntos tampoco es mejora probada. Lo que una versión demuestra de verdad son sus puertas de CPU.
- El panel es una **simulación** con modelos locales: ordena prioridades y encuentra fricciones probables. No sustituye a jugadores.
- Los objetivos por estrato de una especificación (claridad del casual, fatiga a las 4 h) se leen en `salidas\<run_id>\INFORME_EJECUTIVO.md`; no bloquean solos.

## Escribir la especificación de una versión

La escribe `director`. El orquestador solo entiende esto:

```markdown
# V7 · Identidad de jefes y hallazgos del subsuelo

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
- Constitución anticomplejidad en cada versión: ≤ 6 palabras clave, ≤ 56 herramientas, descripciones ≤ 115 caracteres, P95 ≤ 19 turnos. Una versión no añade un sistema sin retirar o simplificar otro.

## Cuando algo se tuerce

| Síntoma | Qué mirar | Qué hacer |
|---|---|---|
| «Hay cambios sin guardar» al lanzar | `git status` | commit o descartar antes; el bucle no pisa trabajo a medias |
| Una celda sale con error | `artifacts/estudio/v{n}/celda-*.log` | suele ser permisos (una orden fuera de la lista) o falta de sesión de `claude` |
| Una puerta no pasa tras los reintentos | `artifacts/estudio/v{n}/puerta-*.log` y `arreglo-*.log` | la rama apartada conserva el trabajo: se puede retomar a mano |
| El panel se corta | `artifacts/estudio/v{n}/panel.log` | en `..\panelAgentesGaming`: `python -m panel_gaming run --resume <run_id>`, y relanzar con `-Desde {n} -BasePanel <run anterior>` |
| Ollama atiende de a uno (panel 40 % más lento) | log de `ollama serve` | `-ReiniciarOllama` |
| Versión rechazada por el panel | `veredicto.json` y el informe del panel | corregir la especificación y relanzar `-Desde {n}` |

Para retomar tras un rechazo: borra o renombra la rama apartada si ya no hace falta, ajusta `SPECS/V{n}.md` y lanza `-Desde {n}`. La línea base del panel de cada versión aceptada queda en `artifacts/estudio/estado.json`.
