# Hoja de ruta SANGRE Y PALO · V11

Escrita por el Director el 2026-11-14, al abrir la V11 sobre `v10.0.0` (`0cfc5c5`). Viene de `ROADMAP_V5_V10.md`. Encargo del usuario: `artifacts/mision/MISION-V11.md`. Especificación ejecutable: `SPECS/V11.md`. Normas: `artifacts/mision/NORMAS.md`.

## Tema

Simplificación radical: una cuenta entera que se lee de un vistazo, una sola regla de palos (Inmune a su propio palo), dos estados, cartas numeradas de cara limpia con cuatro colores, y una campaña de cinco asaltos para 18 a 22 minutos. Por primera vez desde la 6.0 cambian las reglas.

## Por qué

- Siete versiones de interfaz con las reglas congeladas subieron la claridad (4,62 → 5,01) pero no la aprobación (28,8 % → 29,2 %, censos de 240).
- Steam Deck: 4 de 36. Casual: 16,7 %. Quejas de contraste y color de palos: 205 → 290 con todas las medidas en verde.
- La mesa obliga a sostener a la vez formaciones con Multi decimal, una rueda de cuatro palos, tres estados, tres poderes divididos entre 3 y ocho asaltos largos. La cuenta que no cuadraba («54 × 3,7 = 197») la citaron 24 de las 36 personas de Steam Deck.
- La campaña corta ganó su duelo en el censo (63,1 %). Hoy la campaña son unos 78 turnos (unos 32 minutos con el modelo de duración de `SPECS/V11.md`, apartado 1.10).

## Qué cambia

| Antes (10.0) | V11 |
|---|---|
| Multi decimal (1 a 2,5 por formación; +0,15, ×1,5, ×(1 + 0,05 × n)…) | Multi siempre entero: formaciones ×1, ×2, ×3, ×4; lo que crecía por contador suma Daño |
| Rueda de ventaja (×2) + Inmune (×0) | Solo Inmune a su propio palo |
| Poderes ⌈÷3⌉ | 2 por carta de palo (Escudo, Cura, Salpica); Picas Perfora |
| Brecha, En guardia, Desarmado | Expuesto (×2 de Daño) y Aturdido (se salta un Contraataque) |
| 6 palabras clave | 5 |
| 8 asaltos de 4 tronos; 4 monarcas; 3 Secretos; 7 Tabernas | 5 asaltos (2, 3, 4, 4 y 4 tronos); 3 monarcas, el último como Rey Tirano; 2 Secretos; 4 Tabernas |
| Cartas numeradas con trama; ocre para los Diamantes | Cara limpia (≥ 75 % marfil); cuatro colores por defecto (el ocre y las dos tintas, en Ajustes) |
| Vida 15 px y Ataque 20 px en Steam Deck | +35 %, y el trono apuntado más grande |
| 14 nombres y frases dudosos en inglés | Corregidos |

## Orden de celdas

1. `director`: apertura (`SPECS/V11.md`, esta hoja).
2. `reglas-balance`, bloque A: la cuenta nueva.
3. `reglas-balance`, bloque B: la campaña de cinco asaltos, partida guiada, logros, guardado y red.
4. `reglas-balance`, bloque C: rebalanceo hasta 0 avisos y `npm run docs`.
5. `arte-ui`: cara limpia, paleta, mesa sin rueda ni sellos, tronos grandes, QA visual.
6. `juice-ux`: 14 correcciones del inglés, partida guiada, Susurros, mando, sello en frío, pruebas de humo.
7. Orquestador: puertas de CPU y dos `rapido-60` en la 3090 (español contra la 10.0; inglés contra español de la V11).
8. `director`: cierre y decisión de publicar.

Una celda cada vez. Commit local tras cada celda y entre los bloques A, B y C. Tras A y B la QA visual y la de humo pueden quedar en rojo; tras `arte-ui`, solo la de humo por lo que es de `juice-ux`.

## Puertas

`typecheck`, `test`, `forja`, `analyze:meta` (0 avisos con los objetivos de la V11), `docs`, `og`, `qa:visual` y `qa:smoke` en español y en inglés, `qa:fps` (con la pasada en frío del sello), `qa:audio`, `build`, `build:web`. Después, el panel con la regla de lectura de `SPECS/V11.md`, apartado 6: claridad del casual (n = 12, pareada), aprobación de Steam Deck (n = 9, Fisher: desde 0 de 9 hacen falta 5) y quejas de contraste de palos (n = 60, McNemar). Bloquea la fusión una aprobación o una claridad global por debajo del IC95 de la 10.0 en la misma corrida.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El rebalanceo no converge | Palancas en orden (Vida y Ataque por asalto primero, la escalera de Multi la última); seis informes completos como tope y después señal de bloqueo con propuesta |
| Sin la rueda, el juego se queda plano | Quedan formación, trono (Inmune, Golpe exacto, Ataque), estado (un palo para Expuesto o tres para Aturdido), poder de palo, La Manga, Descarte y Comodín. Se pierde el puzle de casar palos. Se mira con el panel; no se añade nada en la V11 |
| El Multi entero revienta o achata los números | Escalera que sube casi por igual las formaciones; el laboratorio mira la mediana y el P99 del Golpe |
| La campaña corta deja contenido sin sitio | 3 reliquias por Taberna y más oro por asalto; el Trono infinito sigue |
| El panel no compara bien | Escenas regeneradas desde la V11 y revisadas antes de lanzar; solo tres cifras con su ruido |

## Resultado

**Hecha** (cierre del Director, 2026-11-15). Candidata `16fe20a`; **se etiqueta `v11.0.0`**. Pasan los 15 criterios de `SPECS/V11.md` y la puerta del panel. Detalle: `SPECS/V11.md` (apartado 7), `CHANGELOG.md` y [`EVOLUCION_V11.md`](EVOLUCION_V11.md).

| | 10.0 | 11.0 | Lectura |
|---|---:|---:|---|
| Aprobación (panel, 60 personas) | 28,3 % | **36,7 %** | la más alta de la misión; no concluyente (p = 0,18; ruido ±12) |
| Claridad (1–10) | 4,92 | **5,40** | **se distingue del azar** (t pareada = 2,81) |
| Claridad del casual | 4,33 | 4,83 | apunta, no concluyente |
| Steam Deck que aprueba | 2 de 9 | 4 de 9 | apunta; en inglés, 0 de 9 con las mismas personas |
| Quejas de contraste de palos | 60 | 70 | no baja; cambia de tema |
| Inglés (misma versión) | — | 40,0 % · 5,28 | igual que el español |
| Palabras clave | 6 | 5 | |
| Asaltos por campaña | 8 | 5 | |
| Duración estimada | ~32 min | **18,2 min** | con la animación medida |
| Reinado 1 (vacía / llena) | 29,7 / 45,1 % (obj. 24–30 / 40–48) | 29,2 / 43,4 % (obj. 26–32 / 42–48) | 0 avisos |
| Peor P95 de turnos | 18 (tope 19) | 15 (tope 15) | |
| Golpes exactos por asalto | 1,6–2,1 | 0,7–1,1 | el precio del Multi entero |
| P99 del Golpe, último asalto | 605 (asalto 8) | 944 (asalto 5) | Asedio de +40 de Daño |
| Comodín por campaña | 8,9 | 5,6 | |

Decisión del riesgo «Golpes exactos más difíciles»: se publica así y la V12 lo mira con datos de personas antes de tocar una regla (`SPECS/V11.md`, 7.3).

## Después de la 11.0

Lo que la 11.0 deja abierto, con su dueño. Todo lo del panel es simulado: ordena, no confirma.

| # | Qué | Evidencia | Dueño | Primera comprobación |
|---|---|---|---|---|
| 1 | **Objetivos viejos en el `README.md`**: el bloque de balance dice los rangos de la 10.0 | `scripts/reglas.ts` los lleva escritos a mano | `reglas-balance` | que lea `OBJETIVOS` y `npm run docs` (celda de cierre en `SPECS/V11.md`; si no entra antes de fusionar, va primero) |
| 2 | **Contraste que ahora cita el panel**: el botón Golpear rojo junto al carmesí de Corazones (4 personas), la placa «Inmune» sobre el grabado del trono y las barras de Vida con trama | 54 quejas de interfaz leídas; las de palos y cartas bajan de 25 a 20 | `arte-ui` | medir en la captura cada caso antes de cambiarlo; que el rojo de la mesa quede para daño y peligro, no para navegar |
| 3 | **Texto chico**: 62 → 82 menciones, con Golpes de tres y cuatro cifras (mediana 204 y P99 944 en el asalto 5) | cubeta del panel; observaciones del laboratorio | `arte-ui` | la cuenta y el Golpe en grande con 4 cifras en 1366×768, 1280×800 y 390×844, sin recorte y a su tamaño mínimo |
| 4 | **Sello de pólvora y sus «tronos vecinos (orden ♠ ♦ ♥ ♣)»** en mesas de 2 y 3 tronos | lo marcó la celda del panel; con tronos ausentes, «vecino» se lee raro | `reglas-balance` (texto y regla), `arte-ui` (cómo se ve en la mesa) | qué hace hoy el motor con un vecino ausente, y un texto que lo diga en ≤ 115 caracteres |
| 5 | **Golpe exacto**: de 1,6–2,1 a 0,7–1,1 por asalto | laboratorio; duelo «Un Golpe exacto con margen» en empate (40 %) | `reglas-balance`, con `arte-ui` para la lectura | la telemetría de la prueba con amigos; después, si hace falta, una hipótesis de laboratorio (`SPECS/V11.md`, 7.3) |
| 6 | **Steam Deck**: 2 → 4 de 9 en español y 0 de 9 en inglés con las mismas personas | dos corridas de la 11.0 | `juice-ux` (mando y aparato), `arte-ui` (lectura a 40 cm) | una Steam Deck física: legibilidad, mando de punta a punta y el teclado en pantalla (`STEAM_BUILD.md`, paso 11) |
| 7 | **El clasificador de quejas del panel no entiende inglés**: «palo Inmune» cae de 45 a 6 y «otras» sube de 56 a 87 por el instrumento | corrida inglesa | celda `panel` (`..\panelAgentesGaming`) | que las cubetas lean también los términos ingleses del juego (Immune, Sleeve, Relics…) antes de comparar quejas entre idiomas |
| 8 | **El sello «SANGRE Y PALO» en la portada inglesa** se lee como texto sin traducir (4 de 5 quejas explícitas de traducción) | corrida inglesa | `director` | es la marca dual que eligió el usuario: no se cambia; se le cuenta |
| 9 | **La prueba con personas reales** | ninguna cifra de esta tabla viene de una persona | `director` (organiza), `juice-ux` (telemetría) | la guía de `EVOLUCION_V4_V10.md` (apartado 10) con la campaña de cinco asaltos; es lo único que puede confirmar la claridad, el casual, Steam Deck y la duración (el supuesto de 12 s por decisión y de 60 s por entreacto) |
| 10 | Reglamentos de `.claude/` con la constitución de la V10 | 6 palabras clave, P95 ≤ 19, Reinado 1 24–30 % | el usuario decide | propuesta lista: `artifacts/mision/v11/parche-reglamentos.mjs` |

Siguen abiertos de `ROADMAP_V5_V10.md` («Después de la 10.0»): la envoltura de escritorio sin compilar, Steamworks, la revisión del inglés por un hablante nativo, la demo y el Asalto diario entre amigos (los dos duelos los vuelve a ganar la propuesta: 75 % y 77,5 %).
