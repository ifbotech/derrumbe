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

| 11.0 (`pulso-24` rápido, 4 corridas) | Campeón hasta la 12.0 | 41,7 | 35,4 | 15,6 | 5,70 | 6,75 | 31,2 | 12,5 | 50,0 | **118,94** | `pulso-24-20261116-131719`, `pulso-24-en-20261116-132456`, `pulso-24-20261116-132816`, `pulso-24-en-20261116-133154` |
| **12.0 (`pulso-24` rápido, 4 corridas)** | **Campeón** (`v12.0.0`) | 47,9 | 33,3 | 18,8 | 5,81 | 6,80 | 37,5 | 12,5 | 54,2 | **123,23** | `pulso-24-20261116-140420`, `pulso-24-en-20261116-140817`, `pulso-24-20261116-141154`, `pulso-24-en-20261116-141616` |

(En la fila de `rapido-60`, donde hay dos cifras son español / inglés. Las filas de `pulso-24` agrupan cuatro corridas. **Las dos primeras filas de `pulso-24` no se comparan con las del instrumento rápido**: desde el 2026-11-16 las reseñas van con respuesta corta, `num_predict` 550, y la línea base se rehízo.)

## Bitácora de hipótesis

### Fase A · el instrumento (2026-11-15)

- Hecho: `pulso-24`, caché de auditorías visuales por SHA-256, clasificador de quejas bilingüe con cubeta «aburrimiento / ritmo», `DESCUBRIMIENTO.json`, orden `fitness`, guardia de honestidad (ninguna palabra de venta ni instrucción de voto en lo que el panel narra: ninguna escena de la 11.0 la tenía). 146 tests del panel.
- Hallazgo: las capturas de `npm run qa:visual` no son idénticas byte a byte entre dos corridas sin cambios (8 de 16). La caché solo acierta si la QA es determinista: requisito de la V12.
- Hallazgo: el ruido por semilla es del tamaño de las diferencias que se querían leer (la del inglés frente al español, +11,85 de F, cae dentro). De ahí las cuatro corridas por versión.

### El instrumento rápido (2026-11-16, orden del usuario)

- `pulso-24` pasa de 16 minutos en frío y 6 en caliente a **3–4 minutos por corrida**: reseñas con respuesta corta (los mismos 18 campos, menos caracteres; `num_predict` 550) y la ola visual siempre desde la caché (`calentar-cache` audita antes las capturas nuevas, en pasadas de menos de 900 s). Toda orden lleva tope duro y salida explícita.
- Como cambia el instrumento, **se rehízo la línea base de la 11.0**: F 118,94 (con el instrumento anterior, 107,14). La claridad media sube unas 0,4 con la respuesta corta en las dos versiones: es del instrumento, no del juego.
- Ruido entre corridas de la misma versión con el instrumento nuevo: F de 110 a 127 en la 11.0 y de 98 a 139 en la 12.0. Una diferencia de F agrupado menor que unos 7 puntos no se distingue del azar.

### V12 · cimiento incremental medieval y cero fricción — **publicada, Campeón por la regla, mejora dentro del ruido**

- **Hipótesis**: jugar sin fricción (Mejor jugada, AUTO) y que cada partida deje algo (lo que cae, tirada de huesos, Árbol de la Conjura) sube diversión y aprobación; saldar la deuda visual de la 11.0 sube claridad.
- **Resultado** (4 corridas contra las 4 de la 11.0, 96 pares): **F 123,23 frente a 118,94 (+4,29)**. Aprobación ES 41,7 → 47,9; EN 35,4 → 33,3; críticos 15,6 → 18,8; claridad 5,70 → 5,81 (t = 0,73, p = 0,47); diversión 6,75 → 6,80 (t = 0,40); impulsivos 31,2 → 37,5; Steam Deck 12,5 → 12,5; móvil 50,0 → 54,2. McNemar: 7 suben, 5 bajan (p = 0,77). 0 de 6 objetivos.
- **Lectura honesta**: F sube, así que por la regla de la misión la 12.0 es el Campeón; ninguna cifra se distingue del azar. La capa incremental entera casi no movió al panel. El panel no ve movimiento ni oye: lo que más cambia para una persona (piezas que vuelan, sonido, AUTO jugando) le llega como una frase y una captura quieta.
- **Lo que sí enseñó la autopsia** (57 votos en contra de 96 reseñas, leídos uno por uno):
  - La mitad de las reseñas son la escena de ergonomía de cada dispositivo. PC aprueba 8 de 12 (claridad 7,3). **Portátil 2 de 12, Steam Deck 2 de 12, móvil 4 de 12** (claridad 4,5). Ahí está casi todo el hueco.
  - **«¿1K es el total o el multiplicador?»**: la notación compacta dentro de la cuenta («Daño 148 × Multi ×7 = 1K») rompe la cuenta que cuadra. Es la queja número uno en móvil. La cuenta tiene que enseñar el Golpe exacto.
  - **Botones de acción amontonados**: Golpear, Mejor, Manga, Deshacer y Descartar juntos; clics y toques equivocados en portátil y móvil; Deshacer pegado al borde.
  - **Steam Deck**: «no sé qué carta tengo seleccionada con la cruceta»; precios de La Taberna chicos; panel de daño amontonado.
  - **Inmune sigue sin entenderse**: «¿por qué el 9♥ cura si el trono es Inmune?», «¿Inmune aplica también al poder del palo?». La regla tiene una excepción que nadie espera.
  - **La primera derrota (0 de 8)**: perder Vida al agotarse el Mazo sin que el Escudo lo frene se vive como castigo arbitrario; los sellos del Árbol, chicos para trackpad y cruceta.
  - Rótulo de la formación («Grupo» / «Group») opaco; la ventana de «La cuenta» tapa la mano; «Mejor» pesa igual que «Golpear».
  - En inglés, la cinta «SANGRE Y PALO» sigue leyéndose como texto sin traducir (es la marca que eligió el usuario).
- **Lo que quedó fuera o a medias**: «Buen ojo» y «Manga honda» solo en el Trono infinito (dentro de la campaña llevaban el Árbol lleno al 70 %); 14 nodos de cinco rangos de 30.
- **Candidatos para la V13** (escalera de la misión, aprobación < 55 %: cirugía de interfaz y de bucle): cuenta con el Golpe exacto; mesa de bolsillo (portátil, Deck, móvil) con menos cosas y dianas grandes y separadas; foco del mando inconfundible; Inmune sin excepciones a la vista; Mazo agotado avisado o podado; Buen ojo como regla base con rebalanceo.
