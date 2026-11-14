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

Pendiente (lo escribe el Director en el cierre).
