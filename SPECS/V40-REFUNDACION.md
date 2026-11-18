# V40.0 · Refundación rioplatense — constitución del juego

Pedido del usuario del 2026-11-18, después de su UAT de la 38.0. Sustituye a las normas de tema, baraja y pantalla de
las SPECS anteriores donde choquen; lo que esta constitución no toca (motor de turnos, Furia, Árbol de progreso,
guardado, mando, accesibilidad, rendimiento) sigue como estaba. La 38.0 queda intacta en la rama
`legado/baraja-francesa-v38` (etiqueta `v38.0.0`).

Inspiración de diseño (no de contenido): la mesa mínima con anfitrión que habla (*Dice of Kalma*), las bendiciones de
dioses que te cortejan y escalan (*Hades*), los sellos de nivel nativos (*BLITZ*). Nada de nombres, personajes, arte ni
textos de esos juegos: todo lo nuestro es original y de imaginería rioplatense.

Esta misión **no usa el panel simulado**: tema, baraja, modos e interfaz cambian enteros y medir contra placebos de la
V35–V38 no tiene sentido. Mandan las puertas técnicas y el UAT del usuario en la web.

---

## 1. Baraja española

### 1.1 Palos

El motor conserva sus códigos internos de palo, que coinciden con la correspondencia histórica entre las dos barajas:

| Código | Palo | Poder (sin cambios de motor) | Color de serie |
|---|---|---|---|
| `S` | **Espadas** | Perforar: el golpe ignora parte de la defensa / tajo directo | acero azul y empuñadura de oro |
| `C` | **Bastos** | Aguante: Escudo | verde oliva, lacre y oro, con brotes |
| `D` | **Oros** | Salpicadura y moneda | oro con efigie roja |
| `H` | **Copas** | Brindis: Curación | carmesí, azul y oro |

- En pantalla, en textos y en el inglés no queda ningún ♠ ♥ ♦ ♣ ni «Picas, Corazones, Diamantes, Tréboles». El palo se
  dice con su nombre o con su **pinta** (icono pixel-art del palo).
- Inglés: Swords, Clubs, Coins, Cups (glosario de «Spanish deck»).
- El color nunca va solo: cada palo tiene silueta propia (espada, garrote, moneda, cáliz) y las **pintas del marco**
  (cortes en los bordes superior e inferior del naipe: 1 Oros, 2 Copas, 3 Espadas, 4 Bastos), como en la baraja
  española tradicional.

### 1.2 Rangos

- **Cartas jugables: 1 a 9** de cada palo (36) y **Comodines** (2 de serie). No hay 10 numerado.
- **Enemigos de la Corte: 10 Sota, 11 Caballo, 12 Rey** de cada palo. Se combate primero la Sota, luego el Caballo y por
  último el Rey de cada palo (o el orden que el motor ya usa por Casa).
- El 1 es el As («el ancho» en el Truco). Lo que hoy valga el As en el motor (por ejemplo, alto en escaleras) se conserva
  salvo que el laboratorio pida otra cosa.

## 2. Modos y portada

- **Fuera**: Asalto Diario y Partida Guiada separada. El juego principal es la Campaña.
- **Aprendizaje**: en los 3 primeros golpes del Asalto 1 de la primera campaña, el Bufón dice una frase corta por golpe
  (palo e Inmune, la cuenta, Golpe exacto), sin ventanas modales y sin bloquear la mano. Se puede apagar en Ajustes.
- **Portada mínima**: Jugar · Altar (el progreso, ex Árbol) · Colección · Ajustes. El cooperativo, si se conserva, va en
  un acceso secundario (no en la jerarquía principal).
- **La Taberna pasa a ser La Pulpería.**

## 3. El Bufón, anfitrión

- Personaje central original: **marotte** (cetro de bufón) con máscara pálida, capucha roja de puntas con cascabeles de
  oro y cintas azules. Pixel-art limpio.
- Vivo a 60 fps con `transform`/`opacity` o cuadros pixel-art: reposo respirando, risa (Golpe exacto, Escoba, Envido,
  Chancho), burla (te contraatacan), ojos que brillan (apuestas y santuarios), cara sombría (último turno o poca Vida).
  Respeta «Reducir movimiento» (cuadro fijo).
- Habla en un bocadillo corto (≤ 90 caracteres) que nunca tapa la mano, el enemigo ni los botones. Tono pícaro y ambiguo,
  rioplatense elegante en español («¿Y ahora? Mirá que el Caballo no perdona.»), *trickster jester* en inglés.
- Guía el Asalto 1 y tienta en santuarios y apuestas sin que quede claro si quiere ayudarte o verte caer.

## 4. Los 4 Reyes y sus Bendiciones

Sustituyen a los cinco rasgos `[2/4/6]` y a los monarcas sueltos.

- **Rey de Espadas** (filo: perforar, ejecución, Golpe exacto), **Rey de Bastos** (aguante: Escudo, parar el
  Contraataque), **Rey de Oros** (fortuna: oro, salpicadura, dados), **Rey de Copas** (brindis: curación, Vida, robar).
- **Bendiciones**: al empezar la campaña y entre asaltos, dos o tres Reyes te ofrecen una Bendición cada uno (eliges una).
  Cada Bendición pertenece a un Rey.
- **Cargas que se acumulan** (*stacking*): cada Bendición tiene una condición; cada vez que se cumple, suma una carga
  permanente para el resto de la campaña. La cifra exacta se ve en su píldora y en la cuenta («Espadas +6»).
- **Niveles del Rey [2/4]**: con 2 y con 4 Bendiciones del mismo Rey se enciende su bono de nivel (más fuerte en 4).
- **Bendiciones Duales**: con al menos una Bendición de cada uno de dos Reyes concretos, puede ofrecerse su Dual (4 a 6
  pares). Insignia propia; sin controles nuevos.
- **Jefes**: el último enemigo de los asaltos de jefe es el Rey de un palo, con retrato, Furia propia y frases que
  cambian si aceptaste sus Bendiciones o si elegiste a sus rivales.

## 5. Los 5 Mazos

Sustituyen a las barajas de inicio. Cada mazo define una fantasía; todos usan las mismas reglas de base.

1. **Truco** («Envido y bravas»): mazo corto (1 a 7, sin 8 ni 9). Los cuatro **bravos** (1 de Espadas, 1 de Bastos,
   7 de Espadas, 7 de Oros) pegan con bono propio. Jugar exactamente **2 cartas del mismo palo** canta **Envido**
   (+Daño de base).
2. **Escoba** («Mesa barrida»): si las cartas del golpe **suman exactamente 15**, **¡Escoba!**: Multi extra en ese golpe
   y una carga permanente por cada Escoba de la campaña.
3. **Chinchón** («Pierna y escalera»): premia la **Pierna** (trío) y la **Escalera del mismo palo** de 3 o más; las
   manos largas acumulan carga permanente y bajan el Contraataque.
4. **El Mentiroso** («Cara de piedra»): Comodines de más y **Engaño**: una vez por asalto, un golpe puede contar como del
   mismo palo o número, o ignorar Inmune; si no abate al objetivo, la Furia sube.
5. **Chancho Va** («Mano al centro»): ciclar rápido (descarte barato), **Chancho** (4 cartas iguales) aturde en cadena
   y hay bono por abatir guardias en los primeros turnos del asalto.

Los 5 se certifican en el laboratorio (`analyze:meta`): cada uno con su ritmo, ninguno dominante.

## 6. Amuletos, Trampas del Bufón y sellos de nivel

- **20 a 24 Amuletos** en **4 familias** de 5 o 6, una por Rey/palo, emparentadas en color, marco e icono pixel-art
  (por ejemplo: mate curado, facón de plata, taba cargada, porrón, naipes marcados, boleadoras, escudo de cuero, moneda
  falsa). Sustituyen a las 52 Reliquias.
- **8 Cartas Especiales («Trampas del Bufón»)** sustituyen a las 25 especiales.
- **Sellos de nivel S · A · B** en cada Amuleto y Bendición (Pulpería, Bendiciones, Cofre, Colección), calculados por
  el laboratorio (efecto en la tasa de victoria) y guardados en `balance-config.json`; nunca a mano.
- **★ Sinergia**: el sello pasa a «★» con una etiqueta de 2–3 palabras («★ Para Escoba», «★ Bastos [4]») si la pieza
  encaja con el Mazo elegido o completa un nivel [2/4] de un Rey.

## 7. Mesa mínima

- **Arriba al centro**: el Bufón (con su bocadillo) junto al **enemigo activo** (Sota, Caballo o Rey) y la fila compacta
  de los que esperan.
- **Al medio**: una sola barra de la cuenta (`Daño × Multi = Golpe`) y las píldoras de Bendiciones con sus cargas.
- **Abajo**: la mano de naipes grandes y con aire, y dos botones: **Golpear** (acción principal) y **Descartar**.
  Deshacer y AUTO, discretos en la barra de arriba.
- Fuera los bordes recargados, el texto chico y los botones de más. Todo texto ≥ 14 px; índices y siluetas ≥ 7:1.

## 8. Estética

- **Pixel-art geométrico y limpio sobre naipe marfil** (`shape-rendering="crispEdges"`, píxeles nítidos, sin desenfoque),
  paleta plana: acero azul, oro, carmesí, verde oliva, azul de cinta, sobre marfil y un fondo de mesa sereno.
- Dibujos originales en el lenguaje de las referencias del usuario (baraja española pixel-art y el Bufón): pintas
  repetidas en su disposición tradicional en el 1 a 9, figuras de cuerpo entero en 10 (de pie), 11 (a caballo) y 12
  (Rey con corona), el 1 de cada palo ornamentado.
- Se retira el grabado oscuro como estilo dominante.

## 9. Lo que no cambia

Motor de turnos y Contraataque, Furia, Golpe exacto, Inmune, el duelo de un enemigo a la vez, guardado (con migración
que descarta la campaña en curso de la baraja francesa y conserva ajustes y progreso donde se pueda), mando y teclado,
60 fps, accesibilidad (Alto contraste, Reducir movimiento), español e inglés.

## 10. Balance y puertas

- **Laboratorio**: Reinado 1 en **28–34 %** de victorias de base; los 5 Mazos dentro de ±5 puntos entre sí; P95 de turnos
  ≤ 15; Multi entero; ≤ 5 palabras clave nuevas en pantalla a la vez.
- **Puertas para publicar**: `npm run typecheck`, `npm test` (suite renovada a esta constitución: vocabulario, marca e
  invariantes incluidos), `npm run analyze:meta`, `npm run forja`, `npm run qa:visual` ES y EN en las 4 ventanas
  (1920×1080, 1366×768, 1280×800, 390×844) con 0 recortes y texto ≥ 14 px, `npm run qa:smoke`, `npm run qa:fps`
  (60 fps) y `npm run build:web`.
- Publicación: fusión a `main`, etiqueta `v40.0.0`, `git push origin main --tags` y GitHub Pages en verde.

## 11. Fases

1. **Reglas y poda** (agente reglas-balance): baraja 1–9 + 10/11/12 + Comodines, 5 Mazos, 4 Reyes con Bendiciones,
   cargas y Duales, 20–24 Amuletos y 8 Trampas, sellos S/A/B, fuera Diario y Guiada, textos ES/EN, REGLAS.md, pruebas.
2. **Forja pixel-art y el Bufón** (agente arte-ui): naipes, pintas del marco, Reyes, iconos de Amuletos, Bufón animado.
3. **Interfaz mínima y jugo** (arte-ui y juice-ux): portada, mesa, Pulpería, elección de Bendiciones con sellos,
   frases y reacciones del Bufón.
4. **Puertas, documentos y despliegue**.
