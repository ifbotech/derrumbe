# Hoja de ruta SANGRE Y PALO · V12 → V26

Escrita por el Director el 2026-11-15, al abrir la V12 sobre `v11.0.0` + reglamentos (`4e3cb1b`). Viene de `ROADMAP_V11.md`. Encargo literal del usuario: `artifacts/mision/MISION-V12-V26.md`. Normas: `artifacts/mision/NORMAS-V12.md`. Especificación de la primera versión: `SPECS/V12.md`.

## Tema de la misión

Un roguelike de baraja francesa con grabado medieval en madera que se juega casi solo si quieres (Mejor jugada, AUTO) y que suma algo en cada partida (lo que cae a la mesa, la tirada de huesos, el Árbol de la Conjura), sin perder la cuenta entera Daño × Multi ni la sencillez de la 11.0. La V12 pone el cimiento; de la V13 a la V26 el estudio itera contra el panel simulado hasta cumplir los seis objetivos o llegar a la V26.

## Los seis objetivos norte

Se miden con el panel simulado (`..\panelAgentesGaming`). Todos a la vez.

| # | Objetivo | Umbral |
|---|---|---|
| 1 | Aprobación global, en español y en inglés | ≥ 75,0 % |
| 2 | Aprobación de los críticos (`acido_exigente`) | ≥ 45,0 % |
| 3 | Claridad media | ≥ 7,60 / 10 |
| 4 | Diversión media | ≥ 8,00 / 10 |
| 5 | Aprobación de los impulsivos (`cero_tutorial_impulsivo`) | ≥ 65,0 % |
| 6 | Aprobación en Steam Deck (1280×800, mando) y en móvil (390×844, táctil) | ≥ 70,0 % cada uno |

Punto de partida: la fila 11.0 de la tabla de abajo (`artifacts/mision/ESTADO.md`).

## La fórmula

`F = Aprobación + 0,4 · Críticos + 6 · Claridad + 5 · Diversión + 0,5 · min(Impulsivos, Deck, Móvil)`

Cada versión se mide con `pulso-24` en español y en inglés, con dos semillas (4 corridas), y F se calcula agrupado y pareado contra las 4 corridas del Campeón. Entre réplicas que solo cambian la semilla, F baila 10–14 puntos con 24 personas: una diferencia pequeña se escribe «dentro del ruido».

## Aceptar o revertir (regla del usuario)

- **Se acepta** si F mejora al del Campeón, o si el segmento más bajo (min de impulsivos, Deck y móvil) sube ≥ 8 puntos sin bajar la aprobación global. Se fusiona a `main`, se etiqueta `vN.0.0`, se empuja con etiquetas y pasa a ser el Campeón.
- **Se revierte** si F empeora: la lección va a `MEMORIA_EVOLUTIVA.md` con su número, la rama vuelve al Campeón y la versión siguiente ataca por otro lado. `main` solo recibe versiones aceptadas.
- La V12 es la excepción escrita en el encargo: se etiqueta con las puertas de CPU y el panel decide si es el nuevo Campeón (`SPECS/V12.md`, apartado 6).
- Antes del panel, siempre las puertas de CPU: `typecheck`, `test`, `forja`, `analyze:meta` (0 avisos), `qa:visual` ES y EN (0 fallos), `qa:smoke` ES y EN, `qa:fps`, `qa:audio`, `build:web`.

## Escalera de escalada (la usa el Director al abrir cada versión)

| Aprobación del Campeón | Qué se ataca |
|---|---|
| < 55 % | Cirugía de experiencia y de bucle: quitar la regla pequeña que aún confunde, despejar pantallas cargadas, cartas y números más grandes en mano y móvil, más recompensa en los primeros 60 segundos |
| 55–68 % | Críticos y puristas: sinergias de reliquias y Árbol que se sientan, monarcas y Taberna con detalle de juego de autor, fuera repeticiones y clics muertos |
| 68–75 % o más | Pulido quirúrgico del segmento que va detrás y de los P0/P1 visuales que queden, hasta que los seis objetivos estén en verde |

Cuando `pulso-24` dé los seis objetivos: `rapido-60` en ES y EN (36 personas que `pulso-24` no ve); si confirma, el censo de 240 personas. Si el censo enseña un hueco, se sigue en la versión siguiente.

## Parada de seguridad

La misión para al cumplir los seis objetivos en el censo de 240, al llegar a `v26.0.0`, o tras **5 hipótesis de arquitectura distintas seguidas** que no baten al Campeón. Al parar: el Campeón publicado en `origin/main` (comprobado con `git ls-remote`) e `INFORME_EVOLUTIVO_FINAL.md`.

## Versiones

Se llena en cada cierre. Ninguna cifra se escribe antes de medirla.

| Versión | Hipótesis | Aprob. ES | Aprob. EN | Críticos | Claridad | Diversión | Impulsivos | Deck | Móvil | F | Decisión |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 11.0 (Campeón de partida) | — | 35,4 % | 31,2 % | 9,4 % | 5,28 | 6,43 | 31,2 % | 12,5 % | 54,2 % | 107,14 | línea base (`pulso-24`, 4 corridas) |
| 12.0 | Cimiento incremental y cero fricción (`SPECS/V12.md`) | | | | | | | | | | |
| 13.0 | | | | | | | | | | | |
| 14.0 | | | | | | | | | | | |
| 15.0 | | | | | | | | | | | |
| 16.0 | | | | | | | | | | | |
| 17.0 | | | | | | | | | | | |
| 18.0 | | | | | | | | | | | |
| 19.0 | | | | | | | | | | | |
| 20.0 | | | | | | | | | | | |
| 21.0 | | | | | | | | | | | |
| 22.0 | | | | | | | | | | | |
| 23.0 | | | | | | | | | | | |
| 24.0 | | | | | | | | | | | |
| 25.0 | | | | | | | | | | | |
| 26.0 | | | | | | | | | | | |

Las cifras del panel son de personas simuladas: ordenan prioridades y no sustituyen a jugadores reales.
