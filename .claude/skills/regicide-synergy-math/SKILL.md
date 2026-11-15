---
name: regicide-synergy-math
description: Matemática de sinergias y balance de SANGRE Y PALO. Validación Monte Carlo con el laboratorio (npm run analyze:meta) y pruebas de invariantes anticomplejidad en Vitest. Úsala antes y después de tocar cualquier número de src/rules, al añadir o rediseñar una reliquia, y al juzgar una propuesta de balance.
---

# Matemática de sinergias

El nombre de la carpeta (`regicide-synergy-math`) es el identificador de una herramienta interna y no cambia; el juego se llama SANGRE Y PALO.

## La cuenta del golpe

```
Daño × Multi = Golpe        (todo entero, sin redondeo)
```

- **Daño** se suma: base de la formación + cada carta (su número; 0 contra el trono de su propio palo, que es Inmune; ningún otro palo pega doble) + acabados, sellos de lacre, especiales y reliquias `kind: 'f'` (las píldoras **+D**). Expuesto dobla el Daño al final de la columna (×3 con el Caldero).
- **Multi** arranca en el de la formación (carta sola ×1; As cómplice, grupo, escalera y doble par ×2; color, full y escalera de color ×3; póker ×4) y es **siempre entero**; lo que lo suma (`kind: 'r'`, píldoras **+M**) cuenta donde está y lo que lo multiplica (`kind: 'x'`, píldoras **×M**) multiplica todo lo acumulado a su izquierda. **El orden de las reliquias importa**: sumas primero, multiplicadores al final (`bestOrder` en `tools.ts`).
- Lo que arrastra la mesa: Racha de Golpes exactos +1 de Multi por eslabón (hasta +3); Asedio final +40 de Daño por nivel (`asedio.dano`).
- Poderes de palo por carta, sin dividir: cada ♣ +2 de Escudo, cada ♥ cura 2, cada ♦ salpica 2 a los otros tronos; ♠ perfora.
- Dos estados: **Expuesto** (golpe de un solo palo con 2 cartas o más: el próximo golpe hace ×2 de Daño) y **Aturdido** (golpe de 3 palos, el Motín del Comodín o El Espía: se salta su próximo Contraataque).
- **Golpe exacto**: un Golpe que abate al guardia justo, sin Contraataque; cobras oro, robas y dejas Impulso. Con Multi ×2 o ×3 el Golpe solo cae en múltiplos de su Multi: en la 11.0 hay 0,7–1,1 exactos por asalto (en la 10.0, 1,6–2,1).

Regla de bolsillo para valorar una pieza: en un asalto medio de la 11.0 un Golpe ronda D ≈ 50 y M ≈ 2–3 (mediana del Golpe de 93 a 204 en los asaltos 2 a 5). Entonces **+1 de Daño ≈ +2–3 de Golpe** y **+1 de Multi ≈ +50 de Golpe**; un ×2 dobla todo lo demás. Por eso los multiplicadores son de rareza alta (Noble o Regia) y llevan condición.

## Constitución anticomplejidad

La comprueba `tests/invariantes.test.ts`. No se negocia: si una idea no cabe, se recorta la idea.

| Invariante | Límite |
|---|---|
| Palabras clave (`KEYWORDS`: Daño, Multi, Golpe exacto, Expuesto, Aturdido) | **≤ 5** |
| Reliquias (`TOOLS`) | **≤ 56** |
| Toda `desc` (reliquia, especial, monarca, Reinado, juramento, sello de lacre, acabado, estado) | **≤ 115 caracteres** en español y en inglés, con su número a la vista |
| P95 de turnos en los cinco asaltos, por baraja | **≤ 15** |
| Multi (formaciones, reliquias, acabados, Racha y lo que enseña la mesa) | **siempre entero** |
| Informe publicado (`scripts/meta-report.json`) | sin avisos |

Una pieza nueva sustituye a otra o simplifica algo. Una mecánica que necesita una palabra clave nueva no entra.

## El laboratorio

`npm run analyze:meta` juega decenas de miles de campañas con semilla con el bot de referencia (`src/rules/bot.ts`) y avisa de cada objetivo incumplido.

```bash
npm run analyze:meta                                    # informe completo (~13 min en la 11.0) → scripts/meta-report.json
npm run analyze:meta -- foco                            # Reinados 1 y 8
npm run analyze:meta -- niveles --n=1500                # los 8 Reinados
npm run analyze:meta -- barajas                         # las 6 barajas en el Reinado 1
npm run analyze:meta -- clasica                         # Asalto único, 1 a 4 jugadores
npm run analyze:meta -- regalos --piezas=timbre,ariete --n=800   # unas reliquias (Anillo de sello, Ariete), con muestra grande
LAB_HILOS=6 npm run analyze:meta -- niveles             # deja núcleos libres
```

Solo el informe completo escribe `meta-report.json`. Después, `npm run docs` regenera `REGLAS.md` y las tablas del `README.md`. Desde la 11.0 el informe se compara con los objetivos de `scripts/objetivos.ts` (abajo), no número a número con la versión anterior. La huella (`fingerprint`) de `tests/invariantes.test.ts` obliga a rehacerlo tras cualquier cambio en `engine`, `run`, `tools`, `specials`, `bot` o `balance-config.json`.

### Objetivos

| Qué | Objetivo |
|---|---|
| Reinado 1, La Orden vacía / llena | 26–32 % / 42–48 % |
| Reinado 8 «Puertas selladas», vacía / llena | 6–10 % / 12–18 % |
| Reinados 1 → 8 | estrictamente decrecientes, vacía y llena |
| Barajas (Reinado 1), vacía / llena | 26–32 % / 42–48 % (avisa fuera de 23–34 / 40–50); la Orden suma ≥ 6 puntos |
| Letalidad de cada monarca | 0,8×–1,3× de la media |
| Turnos: asalto 1 · asaltos 2–3 · asaltos 4–5 | mediana 4–6 (P95 ≤ 9) · 7–10 (≤ 13) · 9–12 (**≤ 15**) |
| Muertes en el asalto 1 (Reinado 1, vacía) | ≤ 8 % |
| Duración estimada de la campaña | 18–22 minutos (`OBJETIVOS.duracion`) |
| Reliquia dada de salida | nunca < 35 % (trampa) ni > 68 % (victoria regalada); elegida ≥ 5 % |
| Asalto único, 1–4 jugadores | 58–65 % |

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
3. Si funciona, comprueba lo que podías haber roto: Reinado 1, P95, letalidad de monarcas.
4. Informe completo sin avisos → `npm run docs` → `npm test` (dos pasadas: todo y el cooperativo aparte).
5. En el informe de la celda: antes → después con su n.
6. Bitácora al día al cerrar **cada bloque**, no solo al final (una sesión cortada se retoma desde ella); los trabajos largos se lanzan en segundo plano y se **esperan en primer plano** (`node artifacts/mision/esperar.mjs`): nunca se cede el turno con uno vivo.

## Guardarraíles contra propuestas de un modelo

Las propuestas del panel simulado (`..\panelAgentesGaming`, `PROPUESTA_BALANCE.json`) son hipótesis de un modelo de lenguaje:

- Un cambio de más del 50 % no se aplica sin medir en dos pasos.
- Un duelo A/B ganado dice que el cambio **gusta**, no que el juego quede balanceado. Si rompe un objetivo, se descarta.
- Las palancas gruesas (1 punto de Vida inicial ≈ 6 puntos de victorias; el Ataque de un guardia) se mueven de una en una.
- No se tapa una pieza mala enseñando al bot a jugarla mal o a no elegirla.
