# Sprint V5 · normas comunes y contratos entre celdas

Léelo entero antes de empezar. Lo comparten las cinco celdas que trabajan **a la vez, en el mismo árbol de trabajo** (`C:\Users\ifbar\Documents\regicide`): `director`, `reglas-balance`, `arte-ui` (A: legibilidad y maquetación), `arte-ui` (B: cuenta, autopsia y lámina) y `juice-ux`.

## 1. Convivencia (cinco celdas, un solo árbol)

- **Prohibido**: `git commit`, `git push`, `git stash`, `git checkout -- <archivo>`, `git restore`, `git reset`, `git clean`. Cualquiera de ellos borra el trabajo de otra celda. Tampoco borres archivos ajenos. El commit lo hace el orquestador al final.
- **No arranques servidores de desarrollo** (`npm run dev`, `vite`). Las pruebas construyen y sirven solas.
- **Cada celda edita solo lo suyo** (ver su `.claude/agents/<nombre>.md`). Excepción pactada: un **enganche de una línea** (un `import` y una llamada) en el archivo de otra celda cuando un contrato de abajo lo pide. Edición quirúrgica con la herramienta Edit, nunca reescribir el archivo entero, y se anota en el informe final.
- Otra celda puede haber cambiado un archivo desde que lo leíste: si Edit avisa de que el archivo cambió, vuelve a leer esa zona y repite. Un formateador reescribe los `.ts` al guardar.
- `npm run typecheck` puede fallar por un archivo a medio editar de otra celda. Si el error está en un archivo que no es tuyo, espera un minuto y repite; no lo «arregles».
- **Construcción propia para la QA**: pon `QA_DIR=dist/qa-<celda>` delante de `npm run qa:visual` y `npm run qa:smoke` (Git Bash: `QA_DIR=dist/qa-arte npm run qa:visual -- mesa`; PowerShell: `$env:QA_DIR='dist/qa-arte'; npm run qa:visual -- mesa`). Así dos celdas no se pisan `dist/web`. Las capturas de `qa:visual` caen en `artifacts/visual-qa/<ventana>/<estado>.png` (carpeta compartida: captura solo los estados que estés tocando, `-- estado1 estado2`, y `VIEW=390x844` para una sola ventana).
- **Laboratorio**: `LAB_HILOS=6 npm run analyze:meta -- …` mientras haya otras celdas trabajando.
- Parches grandes: escríbelos como `.mjs` y ejecútalos con `node` (los heredocs de bash con acentos graves o `${}` fallan). En `String.replace` usa función de reemplazo (`s.replace(a, () => b)`).
- El progreso real del usuario está en el `localStorage` de su navegador: no abras el juego en ningún navegador que no sea el Chromium sin ventana de Playwright.
- Textos, comentarios e informe, en español. Nada de blanco ni negro puros en la interfaz.

## 2. Pixel Dungeon: enciende tu sala

Al empezar cada bloque de trabajo (y como mucho cada 10–15 minutos), junto con otra orden y no sola:

```
node C:/Users/ifbar/.claude/dungeon_hook.mjs set <Sala> working "<qué haces, ≤ 60 caracteres>"
```

Al terminar: `… set <Sala> done "<resumen de una línea>"`. Salas: `Director`, `Reglas-Balance`, `Arte-UI`, `Juice-UX`.

## 3. Material de la auditoría V4 (solo lectura)

- `artifacts/auditoria-v4/auditorias-por-pantalla.txt`: las 76 auditorías visuales (19 estados × 4 ventanas), con zonas cortadas, micro-copy confuso y problemas P0/P1/P2.
- `artifacts/auditoria-v4/quejas-foro-auditorias.txt`: quejas por tema con ejemplos, cruce herramientas/jefes con el bot, y los 5 hilos del foro.
- Informe: `C:\Users\ifbar\Documents\panelAgentesGaming\salidas\v4-completo-20261112-084346\INFORME_EJECUTIVO.md`. Capturas V4 que auditó el panel: `…\v4-completo-20261112-084346\capturas\<ventana>\<estado>.png` (las de `artifacts/visual-qa/` son las mismas hasta que alguien las regenere).
- El panel es una **simulación**: ordena prioridades, no manda sobre el laboratorio ni sobre la QA.

## 4. Contratos entre celdas

### C1 · Autopsia de la derrota — la da `reglas-balance`, la pinta `arte-ui` B

```ts
// src/rules/autopsy.ts  (puro, sin DOM)
export type DeathKind = 'sirena' | 'colapso' | 'herida' | 'sin_cartas';
export interface Autopsy {
  kind: DeathKind;
  /** Línea 1, texto llano ≤ 90 caracteres: qué tiró el búnker, con sus números. */
  title: string;
  /** Línea 2, texto llano ≤ 110 caracteres: por qué el muro o la reparación no lo evitaron y qué mirar la próxima vez. */
  detail: string;
  /** Para el gráfico: integridad antes del golpe final, lo que venía, lo que frenó el muro y lo que entró. */
  before: number;
  threat: number;
  blocked: number;
  taken: number;
  /** Torre que dio el golpe final, si fue una sirena. */
  tower?: Suit;
}
/** Lee el lote de eventos de la jugada final. null si no acaba en derrota. */
export function autopsy(events: GameEvent[], cfg: Config): Autopsy | null;

/** Aviso de último turno: lo que puede tirar el búnker en la próxima sirena o el próximo colapso. null si no hay peligro inmediato. */
export interface Omen { kind: 'sirena' | 'colapso'; title: string; detail: string }
export function omen(v: PlayerView): Omen | null;
```

- Ejemplos de texto: «Cantera agotada: el colapso (−5) no pasa por el muro» / «El muro (♣) solo frena sirenas. Mira la cantera antes de descartar.» · «Sirena de ACERO: amenaza 14 contra muro 3 → entran 11» / «Al búnker le quedaban 9. Un ♣ más o un golpe limpio la callaban.»
- `Run` (`src/rules/run.ts`) gana `death?: Autopsy | null`, que `trackEvents` rellena cuando el lote trae `{ e: 'end', result: 'lost' }` y se limpia al empezar otra obra. Campo opcional: no hace falta migrar guardados.
- `omen(v)` avisa cuando **una sola** sirena posible (la mayor amenaza en pie, con fatiga) ≥ integridad + muro, o cuando a la cantera le quedan ≤ 2 cartas y el colapso siguiente ≥ integridad.

### C2 · Avisos de herramienta que dispara — la da `reglas-balance`, lo usa `juice-ux`

El evento `step` gana un campo opcional:

```ts
proc?: { what: 'fuerza' | 'dano' | 'repara' | 'carga'; n: number; tower?: Suit }
```

Lo llevan, como mínimo: Ariete al sumar (`fuerza`, n = Fuerza sumada), Contragolpe al devolver (`dano`, n, `tower`), Rebosadero al reparar con el muro sobrante (`repara`) y al cargar Fuerza (`carga`). `juice-ux` exporta desde `fx.ts` `procBadge(ev)` y deja **una línea** en el `case 'step'` de `animate()` de `table.ts`.

### C3 · Susurros de tiza — módulo de `juice-ux`

`src/client/whispers.ts` exporta `whisper(id: WhisperId, vars?: Record<string, string>): void` y lo lleva todo dentro: el catálogo de textos, que salga una sola vez por perfil y de uno en uno, el botón «No mostrar más» (preferencia guardada), dónde se coloca en cada pantalla y su sonido. La función `whisper()` local de `table.ts` desaparece y sus llamadas pasan a la importada (enganches de una línea de `juice-ux` en `table.ts`, `runscreens.ts` y `campaign.ts`). Las reglas CSS `.whisper*` pasan a `juice.css`: `arte-ui` no las toca. Se mantiene la clase `.whisper` (la QA visual la busca en el estado `mesa-susurro`).

### C4 · Foco de teclado y mando — de `juice-ux`

`.focus-ring` (elemento de `nav.ts`) y sus reglas CSS son de `juice-ux`: marco de 3 px latón y marfil con salto de escala. `arte-ui` no toca `.focus-ring`; sí garantiza que todo lo pulsable sea enfocable (`button` o `tabindex="0"`).

### C5 · Botones de acción de la mesa — markup de `arte-ui` A, insignias de `juice-ux`

`arte-ui` A reordena `.actions` de `table.ts` y añade `#btn-strike` («Golpear», principal) y `#btn-stash` («Andamio») junto a `#btn-undo`, `#btn-discard`, `#btn-clear`, `#btn-pass`. Cada botón lleva `${hint('<acto>')}` de `prompts.ts`. `juice-ux` es dueño de `prompts.ts` (`CONTROLS`: descartar pasa a `['Supr', 'L3']`; nuevos actos para reordenar el cinturón `LB`/`RB` y pantalla completa `R3`) y de las teclas en `nav.ts` / `main.ts`. Los `id` de los botones no cambian: la prueba de humo los usa.

### C6 · Cuenta central, acta y lámina — de `arte-ui` B

`arte-ui` B es dueña de `#score` / `.calc` / `.marks` (previsualización y recibo), del aviso de último turno, de las pantallas de final (`.end`, acta de demolición) y de la lámina compartible con su enlace `?seed=`. Su CSS nuevo va en hojas propias (`src/client/cuenta.css`, `src/client/acta.css`). `arte-ui` A **no toca** esos selectores ni esas funciones (`renderScore`, `showEnd`, la pantalla del acta en `runscreens.ts`); todo lo demás de la mesa y de las pantallas de campaña es de A.

### C7 · QA

- `scripts/visual-qa.ts` y `src/client/qa.ts` son de `arte-ui` A. B y `juice-ux` pueden **añadir** estados nuevos (una entrada en `qa.ts` y su nombre en la lista `ALL`) y comprobaciones propias en un bloque aparte; no reescriben las de A.
- `scripts/smoke.ts` y `scripts/gamepad-qa.ts` son de `juice-ux`.
- `tests/` es de `reglas-balance`. Excepción: `arte-ui` A escribe `tests/imprenta.test.ts` (análisis estático de las hojas de estilo).
