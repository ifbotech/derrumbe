---
name: regicide-synergy-math
description: Matemática de sinergias y balance de SANGRE Y PALO. Validación Monte Carlo con el laboratorio (npm run analyze:meta) y pruebas de invariantes anticomplejidad en Vitest. Úsala antes y después de tocar cualquier número de src/rules, al añadir o rediseñar un Amuleto, una Bendición, un Rey o un Mazo, y al juzgar una propuesta de balance.
---

# Matemática de sinergias

El nombre de la carpeta (`regicide-synergy-math`) es el identificador de una herramienta interna y no cambia; el juego se llama SANGRE Y PALO.

## La cuenta del golpe

```
Daño × Multi = Golpe        (todo entero, sin redondeo)
```

- **Daño** se suma: base de la formación + cada carta (su número, de 1 a 9; 0 contra el enemigo de su propio palo, que es Inmune; ningún otro palo pega doble) + acabados, sellos de lacre, especiales, Amuletos `kind: 'f'` (las píldoras **+D**), Bendiciones (paso `bendicion`) y reglas del Mazo (bravos y Envido del Truco, base del Quince de la Escoba). Expuesto dobla el Daño al final de la columna (×3 con el Caldero).
- **Multi** arranca en el de la formación (carta sola ×1; As cómplice, grupo, escalera y doble par ×2; color, full y escalera de color ×3; póker ×4) y es **siempre entero**; lo que lo suma (`kind: 'r'`, píldoras **+M**) cuenta donde está y lo que lo multiplica (`kind: 'x'`, píldoras **×M**) multiplica todo lo acumulado a su izquierda. **El orden de los Amuletos importa**: sumas primero, multiplicadores al final (`bestOrder` en `tools.ts`).
- Lo que arrastra la mesa: Racha de Golpes exactos +1 de Multi por eslabón (hasta +3); la **Furia** del enemigo activo (sustituye al Asedio desde la 35.0) sube su Ataque por cada Mazo agotado y con el Rey jefe.
- Poderes de palo por carta, sin dividir: cada carta de Bastos +2 de Escudo, cada una de Copas cura 2, cada una de Oros salpica 2 a los que esperan; Espadas perfora.
- Dos estados: **Expuesto** (golpe de un solo palo con 2 cartas o más: el próximo golpe hace ×2 de Daño) y **Aturdido** (golpe de 3 palos, el Motín del Comodín o El Espía: se salta su próximo Contraataque).
- **Golpe exacto**: un Golpe que abate al guardia justo, sin Contraataque; cobras oro, robas y dejas Impulso. Con Multi ×2 o ×3 el Golpe solo cae en múltiplos de su Multi: en la 11.0 hay 0,7–1,1 exactos por asalto (en la 10.0, 1,6–2,1). Por eso un Daño suelto puede **restar**: rompe el exacto (`cleanTol`). En la 1c los niveles de Daño de tres Reyes restaban y la línea de curación dominaba; el nivel de Espadas da tolerancia 3 al exacto.

Regla de bolsillo para valorar una pieza (medida en la 11.0; rehacerla con la baraja española): un Golpe medio ronda D ≈ 50 y M ≈ 2–3. Entonces **+1 de Daño ≈ +2–3 de Golpe** y **+1 de Multi ≈ +50 de Golpe**; un ×2 dobla todo lo demás. Por eso los multiplicadores son de rareza alta (Noble o Regia) y llevan condición.

## Mazos y Reyes (V40)

- **Los 5 Mazos** (`src/rules/mazos.ts`, números en `balance-config.json`): Escoba (inicial; el golpe que suma exactamente 15 es ¡Escoba!: Multi extra y una carga permanente), Truco (1 a 7; los cuatro bravos pegan con bono; 2 cartas del mismo palo cantan Envido), Chinchón (Pierna y Escalera del mismo palo de 3 o más; las manos largas acumulan carga), El Mentiroso (Comodines de más y un Engaño por asalto; la Cara de piedra anula el Contraataque de ese guardia) y Chancho Va (Pasar: descartar 1 sin gastar el turno; Chancho aturde en cadena; bono De arranque). Cada uno se equilibra sobre todo con su Vida y su mano.
- **Los 4 Reyes** (`src/rules/reyes.ts`): 5 Bendiciones por Rey y una Dual por par. Cada Bendición tiene efecto y condición de carga; cada carga suma para siempre (`run.bendiciones[i].n`). Niveles **[2/4]** con `nivelesReyes({ bendiciones, amuletos })` (las Duales cuentan para sus dos Reyes; los Amuletos, desde la 1d). Oferta: 2 Reyes al empezar, 3 antes de los asaltos 2–5.
- Lo que la 1c midió: las cargas casi no mueven; pesan los efectos y los niveles (+8 puntos). Una Dual que suma el plus de nivel de dos Reyes se elegía el 100 %: el bot la valora con la media de sus dos Reyes. Líneas por Rey con `RunPolicy.rey` (solo laboratorio): ninguna debe dominar (1c final: libre 40,8 · Espadas 42 · Bastos 40,4 · Oros 43,2 · Copas 41,2).

## Constitución anticomplejidad

La comprueba `tests/invariantes.test.ts`. No se negocia: si una idea no cabe, se recorta la idea.

| Invariante | Límite |
|---|---|
| Palabras clave (`KEYWORDS`: Daño, Multi, Golpe exacto, Expuesto, Aturdido) | **≤ 5** |
| Amuletos (`TOOLS`) y Trampas del Bufón (`SPECIAL`) | **20–24** en 4 familias y **8** (tramo 1d; hasta entonces, ≤ 56 Reliquias) |
| Toda `desc` (Amuleto, Trampa, Bendición, Rey, Mazo, Reinado, juramento, sello de lacre, acabado, estado) | **≤ 115 caracteres** en español y en inglés, con su número a la vista |
| Frases del Bufón y de los Reyes | **≤ 90 caracteres** en español y en inglés |
| P95 de turnos por asalto y peor de cada Mazo | topes de `scripts/objetivos.ts` (hoy 8 · 16 · 19, y 19 por Mazo) |
| Multi (formaciones, Amuletos, Bendiciones, acabados, Racha y lo que enseña la mesa) | **siempre entero** |
| Ninguna Bendición empeora un golpe | `tests/reyes.test.ts` |
| Sellos de nivel S · A · B | del laboratorio a `balance-config.json`, nunca a mano |
| Informe publicado (`scripts/meta-report.json`) | sin avisos |

Una pieza nueva sustituye a otra o simplifica algo. Una mecánica que necesita una palabra clave nueva no entra.

## El laboratorio

`npm run analyze:meta` juega decenas de miles de campañas con semilla con el bot de referencia (`src/rules/bot.ts`) y avisa de cada objetivo incumplido.

```bash
npm run analyze:meta -- --fast                          # certificación rápida del bucle (< 90 s; 0 s si la huella no cambió)
npm run analyze:meta -- foco                            # Reinados 1 y 8 (--reinados=5,6,7 para otros)
npm run analyze:meta -- niveles --n=1500                # los 8 Reinados
npm run analyze:meta -- barajas                         # los 5 Mazos en el Reinado 1 (el modo conserva su nombre)
npm run analyze:meta -- clasica                         # Asalto único, 1 a 4 jugadores
npm run analyze:meta -- regalos --piezas=timbre,ariete --n=800   # unas piezas (Anillo de sello, Ariete), con muestra grande
LAB_HILOS=6 npm run analyze:meta -- niveles             # deja núcleos libres
# informe completo, por tramos para no pasar el tope de 300 s por orden:
npm run analyze:meta -- --tramo=1/5                     # … hasta --tramo=5/5
npm run analyze:meta -- --previo=clasica:1,2            # y --previo=clasica:3,4 y --previo=confirmar (< 170 s cada uno)
npm run analyze:meta -- --juntar                        # → scripts/meta-report.json
```

Solo el informe completo (los tramos y `--juntar`) escribe `meta-report.json`. Después, `npm run docs` regenera `REGLAS.md` y las tablas del `README.md`. Desde la 11.0 el informe se compara con los objetivos de `scripts/objetivos.ts` (abajo), no número a número con la versión anterior. La huella (`fingerprint`) de `tests/invariantes.test.ts` obliga a rehacerlo tras cualquier cambio en `engine`, `run`, `tools`, `specials`, `bot`, `arbol`, `caida`, `huesos`, `mazos`, `reyes` o `balance-config.json` (`RULE_FILES` en `scripts/lab.ts`).

### Objetivos

| Qué | Objetivo |
|---|---|
| Reinado 1, Altar vacío / lleno | 28–34 % / 42–50 % |
| Reinado 8 «Puertas selladas», vacío / lleno | 6–10 % / 12–18 % |
| Reinados 1 → 8 | estrictamente decrecientes, vacío y lleno |
| Los 5 Mazos (Reinado 1), vacío / lleno | cada uno 28–34 %, los cinco a ±5 puntos entre sí / ≤ 50 % (avisa por debajo de 40); el Altar suma ≥ 6 puntos |
| Letalidad de cada Rey jefe | 0,8×–1,25× de la media |
| Bendiciones | ninguna elegida más de 2× la media (≥ 40 ofertas); ninguna empeora el resultado dada de salida |
| Turnos: asalto 1 · asaltos 2–3 · asaltos 4–5 | mediana 3–5 (P95 ≤ 8) · 7–11 (≤ 16) · 8–12 (≤ 19); peor P95 por Mazo ≤ 19 |
| Muertes en el asalto 1 (Reinado 1, vacío) | ≤ 8 % |
| Duración estimada de la campaña | 18–22 minutos, en **jugadas** (`OBJETIVOS.duracion`, abajo) |
| Pieza dada de salida (Amuleto, Trampa; hoy, Reliquia y especial) | nunca < 35 % (trampa) ni > 68 % (victoria regalada); elegida ≥ 5 % |
| Asalto único, 1–4 jugadores | 58–65 % |

**Duración**: desde la 1b cuenta **jugadas**, no turnos: 30 s de inicio, 60 s por entreacto, 20 s por Secreto, 5 s por tirada de huesos y **12 s por jugada** sobre la suma de las medianas de jugadas de los cinco asaltos (`pacing[].j50`). Un turno es una jugada que recibe el Contraataque; la que abate y las que no gastan el turno (Pasar de Chancho Va, el Comodín de El Mentiroso) son jugadas pero no turnos (Chancho Va: 36 turnos y 84 jugadas). Los 12 s dejan la 1a en los mismos minutos que el supuesto viejo (42 turnos × 18 s ≈ 62 jugadas × 12 s); un informe sin `j50` usa ese supuesto viejo. El **ritmo** (P95) sigue en turnos. Subir la Vida de los enemigos para alargar la campaña rompe las colas del P95 antes de mover una mediana entera.

### Leer el ruido

Una proporción p medida con n campañas tiene error típico √(p(1−p)/n):

| n | ±1σ con p≈0,3 | diferencia que se puede creer (3σ entre dos celdas) |
|---:|---:|---:|
| 160 | 3,6 | ~15 puntos |
| 800 | 1,6 | ~7 |
| 1.500 | 1,2 | ~5 |
| 3.000 | 0,8 | ~3,5 |

- Las semillas son compartidas entre Reinados y entre «con regalo» y «sin regalo»: las **comparaciones** tienen menos ruido que cada celda suelta.
- Con ~80 piezas a 160 campañas, alguna sale fatal por azar. El informe repite las sospechosas con 800 y semillas nuevas antes de avisar. A mano: `-- regalos --piezas=… --n=800`.
- Repetir la medida sin cambiar reglas da el mismo número: no es confirmación, es la misma muestra.
- Cualquier cambio de reglas mueve todas las celdas ±1–3 puntos. No se persiguen décimas.

## Diagnóstico de una pieza

Cruza cuánto se elige con cuánto gana cuando se da de salida:

| Se elige | Gana dada | Diagnóstico | Arreglo |
|---|---|---|---|
| mucho | poco (< 35 %) | **trampa**: promete más de lo que da | rediseñar; un retoque no basta |
| poco | mucho (> 50 %) | **problema de claridad**: nadie entiende que es buena | reescribir el texto y avisar en mesa cuando dispara; el número se toca poco o nada |
| poco | normal | nicho o texto flojo | texto, y un empujón pequeño (≤ 33 %) |
| mucho | mucho (> 68 %) | **victoria regalada** | condición, coste o rareza |

Casos de la 5.0: `timbre` (hoy Anillo de sello) era trampa (56,5 % / 30,0 %) y se rediseñó; `horno` (hoy Horno) era de claridad (9,2 % / 54,4 %) y subió de 2 a 3, no a 4.

## Protocolo de un cambio

1. Hipótesis por escrito: qué número, hacia dónde, qué celda se mueve y cuánto.
2. Medida barata (`foco`, `niveles`, `regalos`) con n suficiente para la diferencia que esperas.
3. Si funciona, comprueba lo que podías haber roto: Reinado 1, los 5 Mazos a ±5, P95, duración, letalidad de los Reyes.
4. Informe completo por tramos sin avisos → `npm run docs` → `npm test` (dos pasadas: todo y el cooperativo aparte).
5. En el informe de la celda: antes → después con su n.
6. Bitácora al día al cerrar **cada bloque**, no solo al final (una sesión cortada se retoma desde ella). Todo en **primer plano** y en serie, sin órdenes en segundo plano ni esperas de archivos de señal; tope duro de **300 s** por orden (`node scripts/con-tope.mjs 300 <orden…>`). Nunca `git worktree` ni enlaces (junctions) a `node_modules`.

## Guardarraíles contra propuestas de un modelo

Las propuestas del panel simulado (`..\panelAgentesGaming`, `PROPUESTA_BALANCE.json`) son hipótesis de un modelo de lenguaje:

- Un cambio de más del 50 % no se aplica sin medir en dos pasos.
- Un duelo A/B ganado dice que el cambio **gusta**, no que el juego quede balanceado. Si rompe un objetivo, se descarta.
- Las palancas gruesas (1 punto de Vida inicial ≈ +3,5 puntos vacío y +5,8 lleno; una carta menos en la mano ≈ −31; el Ataque de un guardia) se mueven de una en una.
- No se tapa una pieza mala enseñando al bot a jugarla mal o a no elegirla.
