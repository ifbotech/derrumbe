# SANGRE Y PALO 40.0 · Refundación rioplatense — informe completo

**Versión:** `40.0.0`. Publicada el 2026-11-19 en https://ifbotech.github.io/derrumbe/.

| | |
|---|---|
| Fusión en `main` | `4a59c48` |
| Etiqueta | `v40.0.0` |
| CI y despliegue | En verde: [run 44605238257](https://github.com/ifbotech/derrumbe/actions/runs/44605238257) |
| Respaldo de la 38.0 | Rama `legado/baraja-francesa-v38` (= `v38.0.0`) |
| Rama de trabajo | `refundacion/v40` (subida) |
| Constitución | [`SPECS/V40-REFUNDACION.md`](V40-REFUNDACION.md) |

---

## 1. Por qué existe la V40

Después del UAT de la 38.0 se decidió refundar el juego. La baraja francesa, las 52 reliquias genéricas y una interfaz cargada le quitaban emoción. El nuevo norte tiene tres fuentes de inspiración:

- **Mesa:** mínima, con un anfitrión que habla (*Dice of Kalma*).
- **Reyes:** te cortejan con Bendiciones que escalan (*Hades*).
- **Sellos:** de nivel nativos (*BLITZ*).

En flujo y HUD se siguió a *Slay the Spire 2*. Todo es inspiración: arte, nombres y textos son originales y de imaginería rioplatense.

Esta misión **no usó el panel simulado** hasta publicar. Mandaron las puertas técnicas y el laboratorio.

---

## 2. La baraja española

- **Palos:**
  - Espadas, Bastos, Oros y Copas (EN: Swords, Clubs, Coins, Cups).
  - Por dentro se conservan los códigos `S`, `C`, `D` y `H`, con los mismos poderes de motor.
  - No queda ningún ♠ ♥ ♦ ♣ ni «Picas, Corazones…»: lo vigila la prueba de vocabulario.
- **Cartas jugables:**
  - Del 1 al 9 de cada palo (36) y 2 Comodines.
  - El As vale 11 y enlaza 1-2-3 y 8-9-1 en escaleras.
- **Enemigos (la Corte):** **10 Sota**, **11 Caballo** y **12 Rey** de cada palo. Se combate uno a la vez, con la fila de los que esperan a la vista.
- **Poderes de palo:**

  | Palo | Poder |
  |---|---|
  | Espadas | Perforar / tajo |
  | Bastos | Escudo |
  | Oros | Salpicadura y oro |
  | Copas | Curación |

  **Inmune:** un enemigo es inmune a su propio palo.
- **Recuadro tradicional:** cada palo tiene su propio recuadro, para que el palo se lea sin color.

  | Palo | Recuadro |
  |---|---|
  | Oros | Corrido |
  | Copas | 1 corte |
  | Espadas | 2 cortes |
  | Bastos | 3 cortes |

---

## 3. Modos y portada

- **Fuera:** Asalto diario y Partida guiada.
- **Juego principal:** la Campaña. Se conserva el Asalto único para jugar con naipes de verdad.
- **Portada mínima:** Jugar · Altar · Colección · Ajustes. El cooperativo y las reglas van en accesos secundarios.
- **Renombres:**

  | Antes | Ahora |
  |---|---|
  | Taberna | La Pulpería |
  | Árbol | Altar |
  | Don de la Conjura | Don del Bufón |
  | Monarcas | Reyes jefe |

- **Aprendizaje:** el Bufón dice una frase en cada uno de los 3 primeros golpes de la primera campaña: palo e Inmune, la cuenta, Golpe exacto. No abre ventanas, no bloquea la mano y se apaga en Ajustes.
- **Guardado:**
  - Las campañas en curso de la baraja francesa y de los tramos intermedios se cierran con aviso y reembolso de esquirlas.
  - Los ajustes y el Altar se conservan.

---

## 4. Los 5 Mazos

Sustituyen a las 6 barajas de inicio (Conjura, Negra, Prestamista, Ases, Corta y Caos).

| Mazo | Lema | Vida · mano | Reglas propias | Se desbloquea con |
|---|---|---|---|---|
| **Escoba** | Mesa barrida | 71 · 6 | Si el golpe suma 15, **¡Escoba!**: +1 de Multi y +2 de Daño por cada Escoba ya hecha (carga permanente). | Inicial |
| **Truco** | Envido y bravas | 59 · 7 | Del 1 al 7. **Bravos**: 1 de Espadas +25, 1 de Bastos +20, 7 de Espadas +15 y 7 de Oros +10. **Envido**: 2 cartas del mismo palo, +10. | Adiós, carcelero |
| **Chinchón** | Pierna y escalera | 59 · 7 | **Pierna** (trío): +1 de Multi. **Escalera del palo**: +8. **Mano larga** (4 cartas o más): −2 al Contraataque y +1 de Daño para siempre. | Medio castillo |
| **El Mentiroso** | Cara de piedra | 63 · 7 | 3 Comodines que no gastan el turno (el Contraataque no llega y el golpe siguiente suma +28). **Engaño**: una vez por asalto, automático, el golpe cuenta como de un palo, de un número o sin Inmune. | Fin del reinado |
| **Chancho Va** | Mano al centro | 76 · 6 | **Pasar**: 1 carta por turno sin gastarlo. **Chancho** (póker): los 2 Contraataques siguientes no llegan. **De arranque**: abatir en los 2 primeros turnos da +15 al golpe siguiente. | De un solo golpe |

---

## 5. Los 4 Reyes y sus Bendiciones

Sustituyen a los cinco rasgos `[2/4/6]` y a los siete monarcas viejos.

### 5.1 Cómo funcionan

- **Ofertas:** al empezar y entre asaltos, 2 o 3 Reyes te ofrecen una Bendición cada uno y elegís una.
- **Cargas:** cada Bendición tiene un efecto y una **carga** permanente que crece al cumplir su condición («Espadas +6»).
- **Niveles:** con 2 y con 4 piezas del mismo Rey se enciende su nivel. Cuentan Bendiciones y Amuletos de su familia.

| Rey | Con 2 | Con 4 |
|---|---|---|
| **Espadas** | Golpe exacto aunque te quedes corto o te pases por 1 o menos | Golpes con 2 Espadas o más: ×2 de Multi |
| **Bastos** | Empezás cada asalto con 4 de Escudo | Tope del Escudo +2 |
| **Oros** | Dado por turno: con 6, el Contraataque no llega | Con 5 o más, y +3 de oro al cerrar cada asalto |
| **Copas** | Cada guardia abatido con Copas te cura 1 | Cada guardia abatido te cura 1 |

### 5.2 Bendiciones (26)

Son 5 por Rey y 6 Duales.

- **Espadas:** Filo templado, Estocada, Tajo hondo, Primera sangre, Remate.
- **Bastos:** Garrote, Empalizada, Réplica, Palo y palo, Aguante.
- **Oros:** Moneda de oro, Lluvia de oro, Taba cargada, Arcón del Rey, Envite.
- **Copas:** Brindis, Porrón, Otra ronda, Cáliz rebosante, Sobremesa.
- **Duales** (solo si tenés una Bendición de cada uno de los dos Reyes):

  | Dual | Reyes |
  |---|---|
  | Hoja y broquel | Espadas + Bastos |
  | Filo dorado | Espadas + Oros |
  | Sangría | Espadas + Copas |
  | Peaje | Bastos + Oros |
  | Fogón | Bastos + Copas |
  | Convite | Oros + Copas |

El texto completo de cada efecto y su carga está en [`REGLAS.md`](../REGLAS.md).

### 5.3 Reyes jefe

Son el último enemigo de los asaltos 2, 4 y 5. Tienen retrato, rasgo y Furia propia. Sus frases cambian si aceptaste sus Bendiciones, si elegiste a sus rivales o si no elegiste a ninguno.

| Rey jefe | Rasgo | Efecto | Vida | Furia por turno |
|---|---|---|---|---|
| Espadas | Filo del Rey | Su Contraataque atraviesa 4 de tu Escudo | ×2,8 | +6 |
| Bastos | Corteza de roble | No queda Expuesto ni Aturdido | ×1,2 | +2 |
| Oros | Diezmo | Su Contraataque suma un dado de +2 a +8 | ×2 | +2 |
| Copas | Brindis del Rey | Se cura 12 por turno | ×2,6 | +6 |

---

## 6. Amuletos, Trampas del Bufón y sellos

### 6.1 Amuletos (22)

Son 4 familias, una por Rey, y sustituyen a las 52 Reliquias. Se empieza con 4 huecos y el Altar los sube hasta 6.

| Familia | Amuletos (sello) |
|---|---|
| Espadas | Cuchillo criollo (B), Cortaplumas (A), Piedra de afilar (S), Tijera de esquila (B), Facón de plata (S) |
| Bastos | Rebenque (B), Guardamonte (A), Poncho (S), Talero (B), Boleadoras (A) |
| Oros | Moneda falsa (A), Alcancía (S), Naipes marcados (A), Farol (S), Cubilete (A), Cañita voladora (A) |
| Copas | Mate curado (B), Bota de vino (A), Asado (S), Guitarra (B), Último trago (B), Alpargatas (S) |

### 6.2 Trampas del Bufón (8)

Sustituyen a las 25 especiales.

| Trampa | Efecto | Sello |
|---|---|---|
| Cuento del tío | Cada carta del golpe vale lo que la de mayor número | A |
| Zancadilla | Este turno no hay Contraataque | S |
| Mano negra | ×2 de Multi, pero perdés 4 de Vida | B |
| Disfraz | El golpe no respeta Inmune | B |
| Pase mágico | Robás 2 cartas más | S |
| Mordida | Si abate, +6 de oro | A |
| Puñal oculto | Perfora y +12 de Daño | A |
| ¡Retruco! | +1 de Multi | A |

### 6.3 Sellos S · A · B y ★ Sinergia

- **Sellos:**
  - Los calcula el **laboratorio** midiendo el efecto en la tasa de victoria; nunca se ponen a mano.
  - Se guardan en `balance-config.json` (`sellosNivel`) y se recalculan con `npm run analyze:meta -- sellos`.
  - El bot los usa al comprar.
- **★ Sinergia:** etiqueta de 2 o 3 palabras que aparece cuando la pieza encaja con tu Mazo o completa un nivel de su Rey («★ Bastos 3/4», «★ Para Escoba»).

---

## 7. Campaña: Mapa, Botín, Pulpería y Fogón

- **Mapa de caminos** (`src/rules/mapa.ts`):
  - **Tramos:** el primero entra directo al asalto. Del tramo 2 al 5 hay dos filas de nodos que se bifurcan antes del asalto.
  - **Nodos:** Guardia, **Guardia Bravo**, **Santuario del Bufón**, **Fogón** y **La Pulpería**.
  - **Garantías** (probadas en 300 semillas): siempre hay una Pulpería alcanzable, al menos un Bravo por tramo, todos los caminos llegan al asalto y la misma semilla da el mismo Mapa.
- **Botín por partes:** se cobra o se salta cada parte por separado. La elección de tres va en una pantalla limpia, **«ELEGÍ UNA»**, con sellos, ★ y **Saltar**.

  | Nodo | Botín |
  |---|---|
  | Guardia | Oro y «Elegí una» |
  | Guardia Bravo | Vida ×1,3. Premio: 8 de oro y elegir 1 de 2 Amuletos |
  | Rey jefe | Además, una Bendición a elegir |
  | Fogón | Curar o Purgar gratis, y al dejarlo una Bendición de un Rey |

- **La Pulpería:** en bandejas, con Amuletos, cartas y Trampas. Servicios:
  - **Purgar**: quita una carta del mazo; el precio sube con cada uso.
  - **Curar**: Vida por oro.
- **Rutas medidas** (Escoba, Altar vacío / lleno):

  | Ruta | Vacío | Lleno |
  |---|---|---|
  | Equilibrada | 29,6 | 47 |
  | Prudente | 28,7 | 49,2 |
  | Brava | 27,7 | 32,6 |
  | Sin Pulpería | 18,7 | 19,3 |
  | Al azar | 17,8 | 30,6 |

  La ruta importa: saltarse la Pulpería castiga mucho.

---

## 8. Escala de Vida y combate

- **Vida inicial:**

  | Mazo | Vida |
  |---|---|
  | Escoba | 71 |
  | Truco | 59 |
  | Chinchón | 59 |
  | Mentiroso | 63 |
  | Chancho Va | 76 |

  Antes de la V40 era de 9 a 16.
- **Guardias:** Vida base 25, 35 y 45, multiplicada por asalto; Ataque de la Corte 7, 7 y 8, más un extra por asalto.
- **Ninguna muerte de un golpe con la Vida llena:**
  - El peor golpe de un guardia quita como mucho el **59 %** de la Vida del Mazo más frágil.
  - Un Rey jefe no te mata de un golpe en sus 3 primeros turnos.
  - Antes, entre el 8 y el 25 % de las campañas terminaban así.
  - Lo vigila `tests/golpe-unico.test.ts`.
- **Furia:** +6 por Mazo agotado. Cada Rey jefe suma su Furia por turno.
- Se conservan Golpe exacto, Inmune, Contraataque, Escudo, Furia, Reinados 1–8 y el Trono infinito.

---

## 9. Arte: pixel-art oscuro y tramado

### 9.1 Recorrido

La dirección de arte tuvo tres pasadas y dos correcciones de dirección.

| Pasada | Qué se hizo | Resultado |
|---|---|---|
| Fase 2 | Primer pixel-art | Rechazado: rejilla diminuta, contornos negros gruesos, figuras tipo Atari y pintas enanas |
| Fase 2b, rescate | Rejilla de **96×140** por naipe sin contornos, índice en dos esquinas, pintas grandes y figuras altas | Aprobada en estructura, pero quedó «cutie» |
| Fase 2c | **«Dark Dithered & Textured Pixel Art»** con paleta híper-saturada | Vigente |

En la fase 2b se escribió un linter propio (`scripts/pixel-lint.ts`, ideas de `uilianks/pxl` con licencia MIT, sin ejecutar código ajeno) y la skill `pixel-art-sprites`.

La fase 2c se inspira en la técnica de *Return of the Obra Dinn*, la litografía española antigua y el tarot grotesco:

- **Tramado:**
  - Motor de tramado real en `src/client/pixel/dither.ts`: Bayer 2×2 y 4×4, punteado y rayado a celda entera, sin degradados ni desenfoque.
  - Pesado en los Reyes, el Bufón, los dorsos, los Ases y la Corte. Controlado en los naipes chicos.
- **Paleta:**
  - **Sombras** al abismo `#0B0711` / `#120A24`.
  - **Rampas por palo:**

    | Palo | Rampa |
    |---|---|
    | Espadas | Cobalto a cian (`#1440B8` → `#00C8FF`) |
    | Bastos | Esmeralda a lima (`#0B5E28` → `#22D95B`) |
    | Oros | Ámbar a oro (`#FF7B00` → `#FFD500`) |
    | Copas | Carmesí a magenta (`#7A0026` → `#FF1453`) |

  - **Papel:** hueso `#F4EFE2`.
  - **Fondo de la interfaz:** penumbra tramada `#09070F` → `#24112B`, con la función `fondoTramado()`.
- **Personajes:**
  - **Bufón:** máscara afilada, cuencas hondas, sonrisa torcida y capucha carmesí y púrpura. Tiene 5 expresiones: reposo, risa, burla, brillo y sombría.
  - **Reyes:** severos y en claroscuro. Vencidos, quebrados como estatuas.
  - **Dorso de Chancho Va:** un jabalí grabado.
- **Contraste de índices sobre el papel:**

  | Palo | Contraste |
  |---|---|
  | Espadas | 8,48:1 |
  | Bastos | 7,93:1 |
  | Oros | 7,95:1 |
  | Copas | 8,01:1 |

  En Alto contraste, de 10,4 a 12,4:1.
- **Forja:** `npm run forja` revisa 189 piezas sin fallos y pasa el linter. Los cuatro palos se distinguen en gris a 24 px.
- **Originalidad:** las referencias se usaron solo para técnica, paleta y tono; los dibujos son propios. Están en `artifacts/mision/v40/referencias/` y `referencias-oscuras/`, solo en local.

### 9.2 Piezas

- 36 naipes de número y 12 figuras.
- 2 Comodines.
- 5 dorsos (escoba, espadas cruzadas, sol, antifaz y jabalí).
- 4 Reyes jefe, en calma y vencidos.
- 22 iconos de Amuleto, 8 de Trampa y 26 de Bendición.
- Iconos del Mapa e iconos de interfaz (engranaje, AUTO, Mejor jugada, Deshacer).

---

## 10. Interfaz y jugo

### 10.1 Interfaz (fase 3a)

- **HUD único y persistente** en mesa, Mapa, Botín, «Elegí una», Pulpería y Fogón: Vida · Escudo · Oro · Mazo con contador · tira de Amuletos y Bendiciones con cargas. Se inspecciona con ratón, foco o mando.
- **Mesa mínima:**
  - El Bufón con su bocadillo junto al enemigo activo; si es jefe, con su retrato. Al lado, la fila de los que esperan.
  - Una barra **Daño × Multi = Golpe**.
  - La mano grande, con **Golpear** y **Descartar**.
- **Mapa:** ramificado y desplazable, con ficha lateral de cada nodo.
- **Pulpería:** en bandejas, con precios grandes. El Pulpero mide de 150 a 240 px en escritorio.
- **Mínimo texto:** una línea por efecto, como mucho 5 palabras clave a la vez y todo texto ≥ 14 px.

### 10.2 Jugo y Bufón vivo (fase 3b)

- **Reacciones del Bufón:**

  | Cara | Cuándo |
  |---|---|
  | Respira | En reposo |
  | Risa | Golpe exacto, ¡Escoba!, ¡Envido!, ¡Chancho!, bravos y Engaño |
  | Burla | Cuando te contraatacan |
  | Brillo | En «Elegí una» y en los Santuarios |
  | Sombría | Con poca Vida |

  Tiene 15 motivos con al menos 3 frases por idioma (≤ 90 caracteres) y no repite ninguna de las últimas 6. Con «Reducir movimiento» queda en un cuadro fijo.
- **Momentos grandes:** sello pixel tramado sobre el enemigo, sacudida corta, cifra que salta y **sonido sintetizado** propio. Dura 600 ms.
- **Arreglos:**
  - En el móvil el enemigo se ve entero y la cuenta se pliega.
  - El título del enemigo es «Caballo de Copas».
  - Se cerraron dos huecos de navegación con mando.
  - El primer foco del mando ya no tropieza.

---

## 11. Laboratorio final

El informe completo simuló 47.680 campañas, 1.500 por celda, y salió **sin avisos**.

### 11.1 Mazos en el Reinado 1

| Mazo | Altar vacío | Altar lleno | Peor P95 |
|---|---|---|---|
| Escoba | 29,3 | 48,4 | 14 |
| Truco | 30,8 | 46,5 | 15 |
| Chinchón | 30,6 | 44,7 | 15 |
| El Mentiroso | 30 | 47 | 14 |
| Chancho Va | 31,7 | 48,4 | 17 |

Los 5 Mazos quedan a 2,4 puntos de punta a punta (objetivo ±5).

### 11.2 Reinados 1 a 8

| | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| Vacío | 29,3 | 29 | 23,2 | 19,6 | 17,4 | 14,6 | 11,2 | 8,5 |
| Lleno | 48,4 | 44,4 | 40,3 | 38,2 | 36,2 | 31,3 | 22,8 | 16,9 |

### 11.3 Otros números

- **Reyes jefe:** letalidad media 18,3 %, de ×0,92 a ×1,13.
- **Ritmo:** medianas de turnos por asalto 5, 9, 9, 10 y 10; P95 7, 13, 13, 14 y 15.
- **Duración estimada:** 19,2 minutos de campaña.
- **Muertes en el asalto 1:** 0 %.
- **Asalto único:** 61,1 · 64,2 · 62,5 · 61,5 % con 1 a 4 jugadores.

---

## 12. Puertas que pasó la publicación

- **Typecheck:** en verde.
- **Pruebas:** `npm test` con 458 pruebas y el cooperativo 9/9. `npx vitest run` con 467, incluida la certificación del laboratorio.
- **Textos:** `i18n:check` en verde.
- **Forja:** limpia, con el linter.
- **Revisión visual:** 280/280 en español e inglés, en 1920×1080, 1366×768, 1280×800 y 390×844. Texto ≥ 14 px.
- **Humo:** `--fast` 33, mesa 86, mando 120 (tres veces seguidas), Bufón 34 y campaña.
- **Fluidez:** 60 fps sin fotogramas de más de 50 ms, también en frío.
- **Build:** `build:web` en verde, y Pages sirve la 40.0.0.

---

## 13. Línea base del panel (medida después de publicar)

Las escenas se reescribieron desde cero para la V40 (`escenas_v40.py`, 19 escenas con guardia de honestidad). Medición: run `pulso-60-20261119-172433`, snapshot `20261119-170922`.

| Métrica | Valor | Meta |
|---|---|---|
| F | **195,38** | — |
| Aprobación | 73,3 % | 75 |
| Claridad | 6,23 | 7,6 |
| Diversión | 7,47 | 8,0 |
| Ácidos exigentes | 35 % | 45 |
| Cero-tutorial | 66,7 % ✓ | 65 |
| Steam Deck | 88,9 % ✓ | 70 |
| Móvil | 86,7 % ✓ | 70 |

No se compara con la 38.0 (F 228): cambiaron el juego y las escenas. Es la nueva línea base.

**Quejas dominantes**, casi todas en PC 1080p y portátil 1366×768:

1. La mano de cartas se solapa: no se ve el valor y hay clics fallidos.
2. «312 = 52 × 6»: no se sabe qué es 52 ni 6, y el ×6 se ve chico.
3. Los iconos del HUD no tienen texto.
4. El contraste de las cartas, el palo del enemigo y la regla Inmune no se ven claros.

---

## 14. Pendientes conocidos

- El bot del laboratorio casi no elige Trampas (0–4 %). Las Trampas no tienen un piso de elección vigilado.
- Del Reinado 1 al 2 la victoria baja solo 0,3 puntos: cumple, pero es menos que el ruido.
- Las espadas chicas del 4 al 9 son finas. El caballo queda algo chico bajo la gualdrapa.
- La flecha de Deshacer se lee como un aro con punta.
- Hay iconos que se leen a 56 px pero no a 24.
- Quedan rótulos internos de QA con palabras viejas («La Taberna» en `scripts/fps.ts`), que el jugador no ve.

---

## 15. Cómo se hizo (tramos y commits)

| Tramo | Contenido | Commit final |
|---|---|---|
| Constitución | `SPECS/V40-REFUNDACION.md` | `0118121` |
| 1a | Baraja española, Bufón en lugar de la Guiada, fuera el Diario, Pulpería | `3316196` |
| 1b | 5 Mazos, voseo, duración contada en jugadas | `9ae41b5` |
| 1c | 4 Reyes, Bendiciones, cargas, niveles, Duales, Reyes jefe | `7c54662` |
| — | Agentes y skills alineados a la V40 | `96e9dcb` |
| 1d | 22 Amuletos, 8 Trampas, sellos S·A·B, ★ Sinergia | `db93030` |
| 1e | Mapa de caminos, Botín, «Elegí una», Fogón, servicios de la Pulpería | `8337695` |
| 2 / 2b / 2c | Forja pixel-art → rescate sin línea → oscuro y tramado | `46129e5` / `0a3bbb9` / `f22a804` |
| 1f | Sin muertes de un golpe, ruta prudente viable, Reinados escalonados | `2035395` |
| 3a | HUD, mesa, Mapa, Botín, «Elegí una», Pulpería, portada | `fc7f277` |
| 4, laboratorio | Informe completo sin avisos | `ee675a1` |
| 3b | Bufón vivo, jugo y sonido, arreglos de móvil y mando | `815cf25` |
| 4, textos y documentos | Fuera monarca, Tirano y Conjura; REGLAS desde los datos; versión 40.0.0 | `be072c0` |
| 4, fps | Primer foco del mando sin tropiezo | `2fbd94b` |
| Publicación | Fusión, etiqueta `v40.0.0` y Pages | `4a59c48` |

Las bitácoras de cada tramo están en `artifacts/mision/v40/bitacora-*.md`, solo en local porque `artifacts/` está ignorada por git.

---

## 16. Estado actual (pausa)

- **V41** («la mesa se lee de un vistazo en PC y portátil»): empezada en la rama local `candidata/v41` y **pausada** a pedido del usuario.
  - Hay un commit de trabajo en curso, sin puertas.
  - Toca la mano sin solape, la cuenta con rótulos, el HUD con texto y el palo e Inmune del enemigo.
  - No está publicada. `main` = `v40.0.0`.
- **Para retomar:** terminar la V41, pasar puertas, sacar el snapshot, el placebo emparejado sobre el snapshot de la V40 y el veredicto contra la línea base promediada. Si gana, `v41.0.0` en Pages; si no, va a `rechazado/v41`.

### Qué probar primero en el UAT

1. Primera campaña con **Escoba**: las 3 frases del Bufón, una ¡Escoba! (suma 15) y su sello y sonido.
2. **Mapa**: elegir entre Bravo, Fogón y Pulpería. Probar Purgar y Curar.
3. **«Elegí una»** con sellos S/A/B y ★. Elegir una Bendición y ver su carga crecer en el HUD.
4. **Rey jefe** del asalto 2: retrato, rasgo y Furia por turno.
5. **Truco** o **Chancho Va** (se desbloquean con logros) para sentir otro ritmo.
6. **Móvil (390 px) y mando**: legibilidad de la mesa y del recibo de la cuenta.
