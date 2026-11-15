# Memoria evolutiva · SANGRE Y PALO, de la V12 a la V26

Registro acumulado de la misión: cada versión con sus cifras, su hipótesis, lo que funcionó y lo que se revirtió. Lo lleva el orquestador; el Director añade la lectura de cada cierre. Encargo: `artifacts/mision/MISION-V12-V26.md`.

Todas las cifras de jugadores salen de un **panel simulado** (`..\panelAgentesGaming`, modelos locales en una RTX 3090). Ordena prioridades; no sustituye a personas.

## Los seis objetivos norte

| # | Objetivo | Umbral |
|---|---|---|
| 1 | Aprobación global, en español y en inglés (cada una) | ≥ 75,0 % |
| 2 | Aprobación de los críticos duros (`acido_exigente`) | ≥ 45,0 % |
| 3 | Claridad media (1–10) | ≥ 7,60 |
| 4 | Diversión media (1–10) | ≥ 8,00 |
| 5 | Aprobación de los impulsivos (`cero_tutorial_impulsivo`) | ≥ 65,0 % |
| 6 | Aprobación en Steam Deck y en móvil (cada una) | ≥ 70,0 % |

`F = Aprobación % + 0,4 × Críticos % + 6 × Claridad + 5 × Diversión + 0,5 × min(Impulsivos %, Deck %, Móvil %)`. Con los seis umbrales justos, F ≈ 211.

## Cómo se mide y se decide

- **`pulso-24`**: 24 personas fijas (subconjunto de las 60 de `rapido-60`): 8 PC, 6 portátil, 4 Steam Deck, 6 móvil; 8 críticos duros; 8 impulsivos. Una escena por persona, siempre la misma. Sin foro ni duelos.
- **Ruido medido** (2026-11-15, misma versión, solo cambia la semilla): F se mueve **10–14 puntos** entre dos réplicas; un estrato de 4 personas (Steam Deck) solo puede dar 0, 25, 50, 75 o 100 %. Claridad y diversión son estables (< 0,3).
- **Protocolo**: cada versión se mide con **cuatro corridas** (español e inglés, dos semillas cada una) y se decide con la orden `fitness`, agrupada y pareada contra las cuatro del Campeón.
- **Aceptar**: F agrupado mejora al del Campeón, o el piso mínimo (el menor de impulsivos, Deck y móvil) sube ≥ 8 puntos sin que baje la aprobación global. **Revertir**: F empeora; la rama no se fusiona y la lección se anota aquí.
- **Victoria en dos etapas**: si `pulso-24` pasa los seis, `rapido-60` en los dos idiomas (36 personas nunca vistas, bloque `retencion_36`); si confirma, censo de 240.
- **Parada**: `v26.0.0`, o cinco hipótesis de arquitectura distintas seguidas que no baten al Campeón.

## Trayectoria

| Versión | Estado | Aprob. ES | Aprob. EN | Críticos | Claridad | Diversión | Impulsivos | Deck | Móvil | F | Corridas |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 11.0 (`rapido-60`, 60 personas) | publicada | 36,7 | 40,0 | 15,0 / 20,0 | 5,40 / 5,28 | 6,57 / 6,63 | 38,1 / 38,1 | 44,4 / 0,0 | 33,3 / 53,3 | 124,6 / 112,8 | `rapido-60-20261115-135642`, `rapido-60-en-20261115-142907` |
| **11.0 (`pulso-24`, 4 corridas)** | **Campeón de partida** | 35,4 | 31,2 | 9,4 | 5,28 | 6,43 | 31,2 | 12,5 | 54,2 | **107,14** | `pulso-24-20261115-185857`, `pulso-24-en-20261115-191625`, `pulso-24-20261115-193259`, `pulso-24-en-20261115-193914` |

(En la fila de `rapido-60`, donde hay dos cifras son español / inglés. La fila de `pulso-24` agrupa las cuatro corridas.)

## Bitácora de hipótesis

### Fase A · el instrumento (2026-11-15)

- Hecho: `pulso-24`, caché de auditorías visuales por SHA-256, clasificador de quejas bilingüe con cubeta «aburrimiento / ritmo», `DESCUBRIMIENTO.json`, orden `fitness`, guardia de honestidad (ninguna palabra de venta ni instrucción de voto en lo que el panel narra: ninguna escena de la 11.0 la tenía). 146 tests del panel.
- Hallazgo: las capturas de `npm run qa:visual` no son idénticas byte a byte entre dos corridas sin cambios (8 de 16). La caché solo acierta si la QA es determinista: requisito de la V12.
- Hallazgo: el ruido por semilla es del tamaño de las diferencias que se querían leer (la del inglés frente al español, +11,85 de F, cae dentro). De ahí las cuatro corridas por versión.

### V12 · cimiento incremental medieval y cero fricción

En curso. Especificación: `SPECS/V12.md`.
