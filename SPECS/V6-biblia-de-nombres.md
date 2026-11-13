# Biblia de nombres (V6)

> **Desde la 6.1:** el juego se titula **SANGRE Y PALO** (sello **BLOOD & SUITS**; en inglés, al revés), la tienda es **La Taberna** y el final de victoria, **Corte vencida**. Las filas de abajo ya lo dicen.

Fuente única de nombres, descripciones e imágenes para el cambio de tema. Manda el glosario de `SPECS/V6-normas-y-glosario.md`; esta biblia lo baja a cada pieza.

Reglas de uso:

- El `id` no cambia nunca. Solo cambian nombre, descripción e imagen.
- La descripción nueva dice **la misma regla con los mismos números** que el código de la 5.0. Si una fila y el código no casan, manda el código: avisa a `director`.
- Toda descripción cabe en **115 caracteres**. Solo seis palabras clave: **Daño, Multi, Golpe exacto, Brecha, En guardia, Desarmado**.
- La imagen es **un solo objeto, sin texto**, que se reconozca a 24 px.
- Donde la descripción nueva cita otra pieza (p. ej. «Brasero»), usa el nombre nuevo de esta biblia.

---

## 1. Rarezas (`RARITY` en `tools.ts`)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| comun | Común | Común | Cuesta 5 de oro. La más frecuente. | Marco liso, sin adorno. |
| oficio | Oficio | Rara | Cuesta 8 de oro. | Marco con un filete de plata. |
| capataz | Capataz | Noble | Cuesta 11 de oro. | Marco con dos filetes y una flor de lis en lo alto. |
| reliquia | Reliquia | Regia | Cuesta 15 de oro. La más escasa. | Marco con corona de cinco puntas en lo alto. |

## 2. Familias de reliquias (`ARCH`) y arcones de la Orden (`caja_*` en `UPGRADES`)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| base | Obra general | El Arsenal | Las reliquias de siempre: disponibles desde la primera campaña. | Armero de pared con tres armas colgadas. |
| precision | Precisión quirúrgica | Mano precisa | Golpes exactos y Racha. | Mano enguantada que sostiene una aguja. |
| sismo | Sismo y vibración | Eco y repetición | Repetir cartas, copiar reliquias y salpicar a los otros tronos. | Campana con dos ondas a los lados. |
| alquimia | Alquimia de materiales | Alquimia de palos | Mezclar palos y aprovechar los estados de los tronos. | Redoma con los cuatro palos en burbujas. |
| limite | Búnker al límite | Vida al filo | Convertir la Vida que te falta en Golpe. | Vela casi consumida. |
| trituradora | Trituradora | Fuego y ceniza | Quemar cartas para adelgazar el Mazo y cobrar por cada una. | Brasero con llama alta. |
| aguante | Aguante y contragolpe | Escudo y réplica | Convertir el Escudo y la Cura en Golpe. | Escudo redondo con una lanza detrás. |
| caja_precision | Caja de precisión | Arcón de precisión | Añade al surtido las reliquias de Mano precisa que lo piden (lista generada). | Arcón con una aguja grabada en la tapa. |
| caja_sismo | Caja sísmica | Arcón del eco | Añade al surtido las reliquias de su arcón (lista generada). | Arcón con una campana grabada en la tapa. |
| caja_alquimia | Caja de alquimia | Arcón de alquimia | Añade al surtido las reliquias de su arcón (lista generada). | Arcón con una redoma grabada en la tapa. |
| caja_limite | Caja de riesgo | Arcón del filo | Añade al surtido las reliquias de su arcón (lista generada). | Arcón con una vela grabada en la tapa. |
| caja_trituradora | Caja de chatarra | Arcón de cenizas | Añade al surtido las reliquias de su arcón (lista generada). | Arcón con una llama grabada en la tapa. |
| caja_aguante | Caja de aguante | Arcón del escudo | Añade al surtido las reliquias de su arcón (lista generada). | Arcón con un escudo grabado en la tapa. |

Nota: la descripción real de cada arcón la genera `boxUp` («Añade al surtido: …») con los nombres nuevos; no se escribe a mano.

## 3. Reliquias (`TOOLS`, 52)

### 3.1 El Arsenal (`base`, 23)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| piqueta | Piqueta | Daga de Picas | +3 de Daño por cada ♠ que juegues. | Daga recta con el pomo en forma de pica. |
| cortavidrios | Diamante de corte | Anillo de Diamantes | +3 de Daño por cada ♦ que juegues. | Anillo con una gema tallada en rombo. |
| paleta | Paleta de albañil | Cáliz de Corazones | +3 de Daño por cada ♥ que juegues. | Cáliz con un corazón grabado en la copa. |
| maza | Maza de hierro | Maza de Tréboles | +3 de Daño por cada ♣ que juegues. | Maza con la cabeza en forma de trébol. |
| cincel | Cincel | Estilete | +8 de Daño si juegas una carta sola. | Estilete fino, punta abajo. |
| gemelos | Cuadrilla doble | Dagas gemelas | +0,5 de Multi con grupo, doble par, full o póker. | Dos dagas cruzadas en aspa. |
| cinta | Cinta transportadora | Escalinata | +0,7 de Multi con escalera o escalera de color. | Tramo de cinco escalones de piedra. |
| sacos | Sacos terreros | Pavés | El Escudo sube la mitad de tus ♣ en vez de un tercio, y su tope crece +4. | Escudo alto y rectangular, de pie. |
| botiquin | Botiquín | Bálsamo | Curas la mitad de tus ♥ en vez de un tercio. | Frasco panzudo con tapón de corcho. |
| encofrado | Encofrado | Broquel | Cada guardia abatido: +2 de Escudo. | Escudo pequeño y redondo con umbo. |
| casco | Casco | Yelmo | Cada guardia abatido: +1 de Vida. | Yelmo cerrado con visera de rendija. |
| puntales | Puntales | Baraja de reserva | Cuando se agota el Mazo, pierdes 3 de Vida menos. | Mazo de naipes atado con una cinta. |
| hucha | Hucha | Bolsa de monedas | +4 de oro al terminar cada asalto. | Bolsa de cuero atada, con una moneda asomando. |
| taladro | Taladro | Lanza | Todos tus golpes Perforan, lleven o no ♠. | Lanza de punta ancha, en diagonal. |
| estandarte | Estandarte | Estandarte | +1,5 de Multi con color o escalera de color. | Banderín de dos puntas en un asta. |
| dados | Dados cargados | Dados cargados | +1 de Multi con doble par o full. | Dos dados juntos, uno inclinado. |
| dinamita | Dinamita | Barril de pólvora | La ventaja de palo multiplica ×3 en vez de ×2. | Barril con una mecha encendida. |
| acido | Ácido | Gota de veneno | Ningún trono es Inmune: tus cartas pegan ×1 contra el trono de su palo. | Frasco estrecho con una gota cayendo. |
| andamio | Barracón | Guantelete | +1 carta en la mano. | Guantelete abierto, palma al frente. |
| pasarela | Pasarela | Manga doble | +1 hueco en La Manga: guardas dos cartas aparte de la mano. | Manga de jubón con dos naipes asomando. |
| contrapeso | Contrapeso | Máscara de traidor | Inmune se invierte: las cartas del palo del trono pegan con ventaja contra él. | Máscara veneciana de media cara. |
| sordina | Sordina | Pócima de sueño | El Ataque de todos los guardias baja 1. | Frasco redondo con una luna creciente. |
| plano_maestro | Plano maestro | Llave maestra | ×2 de Multi en el primer golpe contra cada guardia. | Llave grande de paletón labrado. |

### 3.2 Mano precisa (`precision`, 5)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| plomada | Plomada | Péndulo | Cada Golpe exacto: +4 de Vida. | Péndulo colgando de un hilo. |
| nivel | Nivel de burbuja | Balanza | El Golpe exacto admite un margen de ±1. | Balanza de dos platos, nivelada. |
| tiralineas | Tiralíneas | Ganzúa | Cada Golpe exacto: +2 de oro. | Ganzúa de punta curva. |
| calibre | Calibre | Compás | Gana +0,15 de Multi para siempre con cada Golpe exacto. | Compás abierto en V invertida. |
| cizalla | Cizalla hidráulica | Tijeras de sastre | Tras un Golpe exacto, el guardia siguiente pierde la mitad de su Vida. | Tijeras abiertas. |

### 3.3 Eco y repetición (`sismo`, 6)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| metralla | Metralla | Collar roto | Salpica hace la mitad de tus ♦ en vez de un tercio. | Collar partido con cuentas cayendo. |
| percutor | Percutor | Campana | Vuelve a activar la primera carta del golpe. | Campana de bronce con badajo. |
| resonador | Resonador | Cuerno de guerra | ×1,5 de Multi si juegas 4 cartas o más. | Cuerno curvo con boquilla. |
| diapason | Diapasón de obra | Espejo de mano | Copia la reliquia que tenga a su derecha. | Espejo de mano ovalado. |
| vibrador | Vibrador de hormigón | Tambor de guerra | Con grupo, doble par, full o póker, la mitad del Golpe salpica a los otros tronos. | Tambor con dos baquetas cruzadas encima. |
| timbre | Timbre del gremio | Anillo de sello | Al empezar cada asalto, sella 1 carta de tu Mazo al azar. Los sellos se activan dos veces. | Anillo de sello con el chatón plano. |

### 3.4 Alquimia de palos (`alquimia`, 4)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| prisma | Prisma | Prisma | +0,5 de Multi por cada carta del golpe que comparta palo con otra (hasta +2). | Prisma triangular con un rayo que se abre en tres. |
| mosaico | Mosaico | Vitral | +10 de Daño si el golpe mezcla 3 palos o más. | Ventana ojival partida en cuatro colores. |
| crisol | Crisol | Caldero | La Brecha multiplica ×2, y los golpes de 3 palos también dejan Brecha. | Caldero de tres patas con burbujas. |
| catalizador | Catalizador | Piedra filosofal | ×1,5 de Multi por cada trono con Brecha, En guardia o Desarmado ×1 (se suman). | Piedra tallada con un brillo en cruz. |

### 3.5 Vida al filo (`limite`, 5)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| sismografo | Sismógrafo | Vela gastada | +0,1 de Multi por cada punto de Vida que te falte. | Vela a medio consumir con cera chorreada. |
| megafono | Megáfono | Rosa de espinas | Cuando un Contraataque te quita Vida, el trono que atacó recibe 8. | Rosa con el tallo lleno de espinas. |
| piquete | Piquete | Antorcha | Cada Motín (Comodín): +3 de oro y robas 2 cartas. | Antorcha encendida, en vertical. |
| ultimo | Último turno | Último aliento | ×2 de Multi si te queda la mitad de tu Vida o menos. | Reloj de arena casi vacío. |
| corazon | Corazón de la torre | Corazón de piedra | ×2 de Multi. Si el golpe no abate a ningún guardia, pierdes 1 de Vida. | Corazón de piedra con una grieta. |

### 3.6 Fuego y ceniza (`trituradora`, 5)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| trituradora | Trituradora | Brasero | Al descartar, la primera carta arde: sale de tu Mazo para siempre. | Brasero de hierro con llama alta. |
| montacargas | Montacargas | Urna de cenizas | +2 de Daño por cada carta quemada en la campaña. | Urna con tapa y dos asas. |
| horno | Horno | Fuelle | +3 de oro cada vez que arde una carta en un asalto (Brasero, Cristal maldito). | Fuelle de cuero con boquilla. |
| contenedor | Contenedor | Cofre cerrado | Lo que descartas no vuelve en este asalto, y cada carta da +6 de Daño a tu próximo golpe. | Cofre con un candado grande. |
| prensa | Prensa de chatarra | Cetro de ceniza | ×1,05 de Multi por cada carta quemada en la campaña (se suman: 4 cartas, ×1,2). | Cetro corto con una brasa en la punta. |

### 3.7 Escudo y réplica (`aguante`, 4)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| ariete | Ariete | Ariete | +4 de Daño por cada punto de Escudo en pie. | Ariete con cabeza de carnero. |
| contragolpe | Contragolpe | Rodela de púas | Si el Escudo frena entero un Contraataque, su trono recibe 3 × lo frenado. Ej.: frena 4 → recibe 12. | Escudo redondo erizado de púas. |
| rebosadero | Rebosadero | Copa rebosante | Escudo que no cabe: cada 2 curan 1. Cura que no cabe: +3 de Daño por punto a tu próximo golpe. | Copa de la que cae un hilo por el borde. |
| bastion | Bastión | Baluarte | ×1,5 de Multi con el Escudo a la mitad de su tope o más. | Almena de tres merlones. |

## 4. Cartas especiales (`SPECIALS`)

### 4.1 Del sorteo (17)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| barreno | Barreno | Ballesta | El golpe Perfora y suma +12 de Daño. | Ballesta cargada, de frente. |
| martillo | Martillo neumático | Martillo de guerra | La carta más alta del golpe cuenta 2 veces. | Martillo de guerra de cabeza cuadrada. |
| saboteador | Saboteador | El Espía | Desarma al guardia que golpeas. | Antifaz negro sobre una capucha. |
| palanca | Palanca | Garfio | +4 de Daño por cada carta del golpe. | Garfio de abordaje de tres puntas. |
| grua | Grúa | Paloma mensajera | Robas 2 cartas extra este turno. | Paloma con un rollito atado a la pata. |
| mordaza | Mordaza | Tregua | No hay Contraataque este turno. | Bandera blanca en un asta corta. |
| clavos | Pistola de clavos | Lluvia de flechas | 9 puntos a cada uno de los otros tronos. | Tres flechas cayendo en abanico. |
| chatarrero | Chatarrero | Carterista | +3 de oro. | Mano que se lleva un monedero. |
| pico | Pico de oro | Rescate | Si el golpe abate a un guardia, +5 de oro. | Moneda grande con una corona. |
| botica | Botica | Elixir | +5 de Vida. | Redoma de cuello largo con un brillo. |
| gemelo | Gemelo | Naipe trucado | Todas las cartas del golpe valen lo que la más alta. | Naipe con una esquina doblada. |
| nitro | Nitroglicerina | Pacto oscuro | ×2 de Multi, pero pierdes 2 de Vida. | Pergamino enrollado con lacre negro. |
| bola | Bola de demolición | Clarín | ×1,5 de Multi. | Trompeta recta con banderola. |
| hormigonera | Hormigonera | Puerta atrancada | +5 de Escudo. | Puerta de tablones con una tranca. |
| cemento | Cemento rápido | Cota de malla | +2 de Escudo por cada carta del golpe. | Cota de malla extendida. |
| embestida | Embestida | Embestida | +4 de Daño, y +3 más por cada punto de Escudo en pie. | Caballo encabritado con testera. |
| sierra | Sierra radial | Pasadizo | Todo el golpe pega con ventaja, sea cual sea el trono. | Puertecilla en arco, entreabierta. |

### 4.2 Legendarias (8)

Se desbloquean con el logro de su `locked`. Las siete de monarca llevan el nombre del monarca vencido (como hoy).

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| ferretero | El Ferretero | El Tratante | +4 de oro y robas 1 carta extra. | Sombrero de ala ancha con una moneda en la cinta. |
| j-doble | La Sirena | El Rey de Dos Caras | No hay Contraataque y robas 1 carta extra. | Corona con dos rostros, uno a cada lado. |
| j-escasez | El Usurero | El Usurero | +6 de oro. | Gorro de terciopelo sobre un monedero. |
| j-sequia | El Matasanos | La Dama del Cáliz | +7 de Vida. | Cáliz con velo. |
| j-intemperie | La Ventisca | La Reina Helada | +3 de Escudo y no hay Contraataque. | Corona de carámbanos. |
| j-blindaje | El Coloso | El Inquisidor | ×1,75 de Multi. | Capucha puntiaguda con una llave colgando. |
| j-furia | La Furia | El Verdugo | +14 de Daño y el golpe Perfora. | Capucha negra con un hacha al hombro (sin filo a la vista). |
| j-inestable | El Topo | El Relojero | 14 puntos a cada uno de los otros tronos. | Reloj de arena con engranajes. |

## 5. Los siete monarcas (`BOSSES`)

`who` es el monarca; `name` es su **decreto**; `desc`, la regla que impone.

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| doble | La Sirena · Doble sirena | El Rey de Dos Caras · Doble Contraataque | Hay 2 Contraataques cada turno, pero cada uno ataca un 40 % menos. | Rey de naipe con una cara arriba y otra abajo, cada una mirando a un lado. |
| escasez | El Usurero · Escasez | El Usurero · Escasez | Jugáis con 1 carta menos en la mano. | Recaudador flaco de cuello de armiño que pesa monedas en una balanza de mano. |
| sequia | El Matasanos · Sin botiquín | La Dama del Cáliz · Cáliz envenenado | Tus ♥ no curan. | Dama velada que ofrece un cáliz del que sube un humo verde. |
| intemperie | La Ventisca · Intemperie | La Reina Helada · Escarcha | El Escudo no puede pasar de 4. | Reina pálida con corona de carámbanos y capa de armiño. |
| blindaje | El Coloso · Blindaje | El Inquisidor · Guardia de hierro | Todos los guardias llegan En guardia y, mientras lo estén, su Ataque sube 1. | Capucha puntiaguda, ojos en sombra y una gran llave al cuello. |
| furia | La Furia · Furia | El Verdugo · Furia | El Ataque de los cuatro tronos sube 2. | Encapuchado corpulento con el hacha apoyada al hombro, de espaldas al filo. |
| inestable | El Topo · Suelo inestable | El Relojero · Arena rápida | El Asedio final empieza 3 turnos antes, y cada guardia abatido sin Golpe exacto te quita 1 de Vida. | Anciano con lupa al ojo y un reloj de arena en la mano. |

La etiqueta del desglose que hoy dice «Suelo inestable» pasa a «Arena rápida».

## 6. Los ocho asaltos (`STAGES`) y el Trono infinito

No tienen descripción en los datos: la columna resume qué guardias salen, que es lo que ya se ve en el mapa.

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| 1 | Caseta de obra | El Puente levadizo | Solo Sotas. Sin monarca. | Puente levadizo colgando de dos cadenas. |
| 2 | Bloque de pisos | El Patio de armas | Sotas y Reinas. Sin monarca. | Pozo de piedra con un cubo. |
| 3 | Torre del capataz | La Armería | Sotas y Reinas. Con monarca. | Panoplia: escudo con dos espadas detrás. |
| 4 | Polígono | Las Cocinas | Sota, Reina y Rey. Sin monarca. | Olla colgada de un gancho sobre el fuego. |
| 5 | Ciudadela | La Capilla | Sota, Reina y Rey. Con monarca. | Vela en un candelabro de tres brazos. |
| 6 | Rascacielos | La Biblioteca | Sota, Reina y Rey. Sin monarca. | Libro cerrado con broche. |
| 7 | Fortaleza | La Galería de espejos | Sota, Reina y Rey. Con monarca. | Espejo alto de marco dorado. |
| 8 | La Torre Madre | El Salón del Trono | Sota, Reina y Rey. Con monarca. El último asalto. | Trono de respaldo alto con una corona encima. |
| 9+ | Cimiento abisal N | Trono infinito N | Siempre con monarca y cada vez más duro. | Trono visto de frente con una escalera que baja tras él. |

## 7. Los ocho Reinados (`ASCENSIONS`)

«Reinado N» es el nivel; el nombre es su giro, que se suma a los de los anteriores.

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| 0 | Obra limpia | Reinado de paz | Las reglas de siempre. | Corona sencilla de tres puntas. |
| 1 | Hormigón armado | Corazas finas | Todos los guardias tienen un 5 % más de Vida. | Peto de armadura. |
| 2 | Precios de obra | Impuesto real | Todo en la Taberna cuesta 2 de oro más. | Moneda con una corona y una muesca. |
| 3 | Vigas maestras | Reyes en guardia | En los asaltos con monarca, los Reyes llegan En guardia. | Corona sobre un escudo. |
| 4 | Sirena afinada | Rey colérico | El Ataque de los Reyes sube 1. | Corona con una espada atravesada. |
| 5 | Búnker viejo | Heridas viejas | Tienes 1 punto menos de Vida. | Corazón con un vendaje cruzado. |
| 6 | Turno de noche | Guardia de noche | El Ataque de las Sotas y las Reinas sube 1. | Farol con una luna detrás. |
| 7 | Clausura | Puertas selladas | Solo en el asalto 8, el Ataque de los cuatro tronos sube 1. | Puerta doble con un candado. |

## 8. Barajas (`DECKS`)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| obra | Baraja de obra | Baraja de la conjura | La de siempre: 40 cartas, 2 Comodines y un Sobre lacrado de 3 especiales. | Reverso de naipe con una daga cruzando una corona. |
| acero | Baraja negra | Baraja negra | Solo ♠ y ♣, dobles: sin Cura ni Salpica. Gota de veneno, Pavés y +5 de Vida (+Baluarte con su arcón). | Reverso negro con una pica y un trébol. |
| prestamista | Baraja del prestamista | Baraja del prestamista | +12 de oro inicial y el interés rinde el doble, pero tienes 1 de Vida menos. | Reverso con una bolsa de monedas. |
| ases | Baraja de ases | Baraja de ases | Ocho ases y ningún 2: más Ases cómplices y más pegada, pero tienes 4 de Vida menos. | Reverso con una A coronada. |
| corta | Baraja corta | Baraja corta | Sin doses ni treses: golpes gordos, el Mazo se agota antes y tienes 6 de Vida menos. +3 de oro inicial. | Reverso con un naipe partido por la mitad. |
| caos | Baraja del caos | Baraja del caos | Un solo Comodín, pero el Sobre lacrado inicial trae 5 cartas especiales. | Reverso con una espiral. |

Duda abierta: en `acero`, el Baluarte se añade si el surtido lo incluye (Arcón del escudo abierto); «con su arcón» lo dice en corto.

## 9. Juramentos (`CONTRACTS`)

La columna «descripción nueva» lleva la condición y, tras « · », el premio (`reward`).

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| intacto | Sin un rasguño | Piel intacta | Termina el asalto sin perder Vida. · +8 de oro | Guante blanco sin mancha. |
| limpios | Pulso firme | Pulso firme | Da 3 Golpes exactos. · Un sello de lacre al azar | Mano abierta con la palma quieta. |
| rapido | A destajo | Al galope | Gana el asalto en menos de 3 turnos + 4 por guardia de cada trono. · +6 de oro | Herradura. |
| sincolapso | Cantera medida | Mazo medido | Termina sin que se agote el Mazo. · +5 de oro | Mazo de naipes cuadrado y entero. |
| austero | Sin huelgas | Sin motines | No juegues ningún Comodín. · Un acabado al azar | Comodín boca abajo. |
| maestra | Jugada maestra | Jugada maestra | Juega un color, un full, un póker o una escalera de color. · Un Pergamino al azar | Abanico de cinco naipes. |
| horas | Horas extra | Noche larga | De riesgo: el Ataque de los cuatro tronos sube 1. · +10 de oro | Luna llena sobre una almena. |
| sinred | Sin red | Sin escudo | De riesgo: el Escudo no puede pasar de 2. · Una reliquia Rara o mejor | Escudo partido en dos. |
| corta | Cuadrilla corta | Conjura corta | De riesgo: jugáis con 1 carta menos en la mano. · +12 de oro | Mano con un naipe menos (cuatro en abanico). |

## 10. Atajos de conspirador (`TAGS`)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| vale | Vale de ferretería | Llave de la Taberna | En la próxima Taberna, reliquias, sobres y Mesa de lacre son gratis. | Llave pequeña con una moneda en el ojo. |
| envio | Envío urgente | Contrabando | Recibes ya una reliquia Noble o Regia. | Fardo atado con cuerda. |
| molde | Molde | Molde de cera | Duplicas la carta de tu Mazo que elijas. | Molde de cera con la silueta de un naipe. |
| liquidacion | Liquidación | Botín escondido | +15 de oro. | Cofre abierto con monedas. |
| timbrado | Timbrado | Lacre doble | Dos cartas al azar de tu Mazo reciben un sello de lacre. | Barra de lacre con dos gotas. |

## 11. Secretos de la cripta (`EVENTS`)

Una fila para el secreto (nombre y texto) y una por cada opción (`label` y `desc`). El `id` de las opciones es su posición.

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| caja | La caja fuerte sepultada | El cofre enterrado | Entre dos tumbas asoma un cofre con candado. Forzarlo hará temblar media cripta. | Cofre medio enterrado con candado. |
| caja · 1 | Forzarla | Forzarlo | Pierdes 5 de Vida. Te llevas una reliquia Noble o Regia. | — |
| caja · 2 | Vendérsela al chatarrero | Vendérselo al Tratante | +8 de oro. | — |
| horno | El horno de fundición | El caldero del alquimista | Un caldero hierve solo en un rincón. Lo que entra, sale convertido en otra cosa. | Caldero sobre brasas. |
| horno · 1 | Fundir dos cartas | Fundir dos cartas | Eliges dos: arden y nace una con el número más alto, en Lacre policromo y con el sello que llevaran. | — |
| horno · 2 | Calentarse y seguir | Calentarse y seguir | +4 de Vida. | — |
| contrato | El contrato maldito | El decreto maldito | Un decreto clavado en la puerta promete una cifra enorme. La letra pequeña habla del próximo asalto. | Pergamino clavado con un puñal. |
| contrato · 1 | Firmar | Firmar | +20 de oro ahora. En el próximo asalto, el Ataque de los cuatro tronos sube 1. | — |
| contrato · 2 | Romperlo | Romperlo | El papel arde bien: +3 de oro. | — |
| clandestino | El gremio clandestino | Los lacradores ciegos | Tres monjes sellan a la luz de una vela lo que les pongas delante, y no aceptan regateos. | Vela con tres gotas de lacre al pie. |
| clandestino · 1 | Pagar con sangre | Pagar con Vida | Pierdes 6 de Vida. Tres cartas al azar reciben un sello de lacre. | — |
| clandestino · 2 | Pagar con oro | Pagar con oro | 8 de oro. Tu carta más alta recibe Lacre policromo. | — |
| clandestino · 3 | Seguir de largo | Seguir de largo | Nada cambia. | — |
| planos | Los planos del arquitecto | Los mapas escondidos | Tras una losa están los mapas del castillo. Arrancarlos hace crujir lo poco que os protege. | Mapa enrollado asomando de una losa. |
| planos · 1 | Arrancarlos | Arrancarlos | Pierdes 3 de Vida máxima para siempre. Dos formaciones al azar suben 2 niveles. | — |
| planos · 2 | Copiarlos a mano | Copiarlos a mano | 5 de oro. Una formación al azar sube 1 nivel. | — |
| planos · 3 | Dejarlos donde están | Dejarlos donde están | Nada cambia. | — |


## 12. Mejoras de la Orden (`UPGRADES`, las que no son arcón)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| tampones | Tampones nuevos | Lacres nuevos | La Mesa de lacre también ofrece los sellos de pólvora y de la manga. | Dos barras de lacre cruzadas. |
| bronce | Taller de bronce | Cristalero real | La Mesa de lacre también ofrece Lacre policromo y Cristal maldito. | Copa de cristal facetado. |
| vale | Vale de remesa | Favor del Tratante | Un «Renovar mesa» gratis en cada Taberna, por nivel. | Moneda partida por la mitad. |
| tienda | Proveedor | Puesto grande | +1 reliquia en oferta en cada Taberna, por nivel. | Toldo de puesto de mercado. |
| caja | Caja chica | Bolsa de la Orden | +2 de oro inicial por nivel. | Bolsa con el emblema de la Orden (una daga y una llave). |
| rutas | Topógrafo | Cartógrafo | Cada asalto sin monarca ofrece 3 rutas con Juramento en vez de 2. | Rosa de los vientos. |

## 13. Sellos de lacre (`SEAL`) y acabados (`TREATMENT`)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| dinamita | Sello de dinamita | Sello de pólvora | Al golpear, los tronos vecinos reciben el valor de esta carta. | Gota de lacre negro con una chispa. |
| eco | Sello de eco | Sello de eco | Su valor y el poder de su palo cuentan 2 veces. | Gota de lacre azul con dos anillos. |
| jornal | Sello de jornal | Sello de oro real | +2 de oro si el golpe abate a un guardia. | Gota de lacre dorado con una corona. |
| sindical | Sello sindical | Sello de la manga | Robas 1 carta extra al jugarla o descartarla. | Gota de lacre verde con un naipe. |
| forjado | Forjado | Filo de plata | +6 de Daño. | Borde de la carta con un filo brillante. |
| templado | Templado | Templado | +0,3 de Multi. | Borde de la carta azulado, con vetas. |
| policromado | Bronce vivo | Lacre policromo | ×1,5 de Multi. | Carta con un baño de lacre en tres colores. |
| agrietado | Agrietado | Cristal maldito | ×2,5 de Multi, pero 1 de cada 4 veces se hace añicos. | Carta de cristal con una grieta en rayo. |

## 14. Estados de los tronos (`TOWER_FX`) y palabras clave (`KEYWORDS`)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| fractura (estado) | Fractura | Brecha | El próximo golpe contra este trono hace ×1,5 de Multi. | Escudo de armas con una raja. |
| sobrecarga (estado) | Desarmada ×1 | Desarmado ×1 | Este trono se salta su próximo Contraataque. | Espada rota (hoja corta). |
| apuntalado (estado) | Apuntalado | En guardia | ×0,5 de Multi en el primer golpe contra este guardia. | Escudo levantado con un brazo detrás. |
| fuerza (clave) | Fuerza | Daño | Lo que suman tus cartas: su número, el doble con ventaja de palo y nada contra el trono de su palo (Inmune). | — |
| resonancia (clave) | Resonancia | Multi | Lo que multiplica al Daño. Lo pone la formación; lo que suma cuenta donde está y lo que multiplica, multiplica todo lo anterior. | — |
| limpio (clave) | Golpe limpio | Golpe exacto | Abatir con el Golpe justo: sin Contraataque, +1 de oro, robas 1, Impulso (el siguiente pierde ¼ de Vida) y Racha (+0,5 de Multi, hasta +2). | — |
| fractura (clave) | Fractura | Brecha | La deja un golpe de un solo palo (2 cartas o más). El próximo golpe contra ese trono hace ×1,5 de Multi. | — |
| apuntalado (clave) | Apuntalado | En guardia | El primer golpe contra ese guardia hace la mitad de Multi. Lo traen algunos monarcas y Reinados. | — |
| desarmada (clave) | Desarmada | Desarmado | Un trono Desarmado no ataca cuando el Contraataque saca su palo. El Motín lo desarma hasta que caiga su guardia; un golpe de 3 palos, solo para su próximo Contraataque (×1). | — |

Las descripciones de las palabras clave pueden pasar de 115: son definiciones del reglamento y de la ayuda, no piezas. `match` de cada clave: `\bDaño\b` (con mayúscula), `\bMulti\b`, `/\bgolpes? exactos?\b/gi`, `/\bbrechas?\b/gi`, `/\ben guardia\b/gi`, `/\bdesarm(?:ad[oa]s?|ar|an|a)\b/gi`.

## 15. Formaciones y etiquetas del desglose

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| compania | As de compañía | As cómplice | Un As con cualquier otra carta. | As con una mano en el hombro de otro naipe. |
| (resto) | Carta sola, Grupo, Doble par, Escalera, Color, Full, Póker, Escalera de color | sin cambio | Son palabras de baraja. | — |
| paso `onda` | Racha limpia | Racha | +0,5 de Multi por cada Golpe exacto seguido. | — |
| paso `carga` | Carga | Carga | El Daño guardado para este golpe. | — |
| paso `fatiga` | Fatiga de cimientos | Asedio final | +Multi que crece con los turnos del asalto. | — |
| paso `inestable` | Suelo inestable | Arena rápida | Pierdes 1 de Vida por guardia abatido sin Golpe exacto. | — |
| `MATERIAL` | ACERO · VIDRIO · LADRILLO · HORMIGÓN | PICAS · DIAMANTES · CORAZONES · TRÉBOLES | Nombre de cada palo en mayúsculas. | — |
| dificultad `obra` · `brutal` (Asalto único) | Obra · Brutal | Conjura · Brutal | Las dos dificultades del Asalto único. | — |

## 16. Logros (`ACHIEVEMENTS`)

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| primera | Primera piedra | Primer paso | Gana tu primer asalto de campaña. | Bota sobre un peldaño. |
| capataz | Adiós, capataz | Adiós, carcelero | Supera el asalto 3. | Argolla de llaves. |
| media | Media ciudad | Medio castillo | Supera el asalto 5. | Medio castillo en silueta. |
| madre | La Torre Madre | Fin del reinado | Gana una campaña. | Corona partida en dos. |
| asc3 | Maestro de obras | Gran conspirador | Gana una campaña en el Reinado 4 o superior. | Capa con una daga en el broche. |
| abismo | Más abajo | Más allá del trono | Supera un Trono infinito. | Escalera que baja tras un trono. |
| abismo3 | Sin fondo | Sin fin | Supera tres Tronos infinitos en una campaña. | Tres coronas apiladas. |
| diaria | Parte diario | Ronda diaria | Termina un Asalto diario. | Sol sobre una almena. |
| doblepar | Dos y dos | Dos y dos | Juega un doble par. | Dos parejas de naipes. |
| color | Todo al mismo palo | Todo al mismo palo | Juega un color. | Cinco picas en abanico. |
| full | Casa llena | Casa llena | Juega un full. | Tres y dos naipes en abanico. |
| poker | Póker | Póker | Juega un póker. | Cuatro ases en abanico. |
| real | Escalera real | Escalera real | Juega una escalera de color de 5 cartas o más. | Escalera de naipes con una corona. |
| golpe100 | De un solo golpe | De un solo golpe | Haz un Golpe de 100 o más. | Puño cerrado. |
| golpe500 | Terremoto | Trueno | Haz un Golpe de 500 o más. | Rayo. |
| golpe2000 | Cataclismo | Cataclismo | Haz un Golpe de 2000 o más. | Cometa. |
| limpio10 | Cirujano | Mano firme | Da 10 Golpes exactos. | Mano con una aguja. |
| limpio50 | Pulso de relojero | Pulso de ladrón | Da 50 Golpes exactos. | Ganzúa en una cerradura. |
| pisos100 | Cien pisos | Cien guardias | Abate a 100 guardias. | Yelmo caído. |
| pisos500 | Demoledor | Azote de la corte | Abate a 500 guardias. | Látigo enrollado. |
| intacto | Ni un rasguño | Ni un rasguño | Termina un asalto con la Vida entera. | Corazón entero. |
| rico | Tacaño | Tacaño | Junta 30 de oro a la vez. | Montón de monedas. |
| cinturon | Cinturón lleno | Relicario lleno | Lleva 6 reliquias a la vez. | Relicario con seis huecos llenos. |
| forja | Timbrador | Lacrador | Estampa 10 sellos de lacre o acabados. | Sello de mano sobre lacre. |
| contratos | Hombre de palabra | De palabra | Cumple 10 Juramentos. | Mano sobre un libro. |
| atajo | Por la puerta de atrás | Por la puerta de atrás | Salta 3 asaltos. | Puerta pequeña en una muralla. |
| coleccion | Coleccionista | Coleccionista | Consigue las 17 cartas especiales comunes, entre todas tus campañas. | Álbum abierto con naipes. |
| ferretero | Cliente del mes | Cliente del Tratante | Lleva 30 reliquias distintas, entre todas tus campañas. | Sombrero de ala ancha. |
| j-doble | Trofeo: La Sirena | Trofeo: El Rey de Dos Caras | Derrota a El Rey de Dos Caras (doble Contraataque). | Corona de dos caras en un cojín. |
| j-escasez | Trofeo: El Usurero | Trofeo: El Usurero | Derrota a El Usurero (escasez). | Monedero en un cojín. |
| j-sequia | Trofeo: El Matasanos | Trofeo: La Dama del Cáliz | Derrota a La Dama del Cáliz (cáliz envenenado). | Cáliz volcado. |
| j-intemperie | Trofeo: La Ventisca | Trofeo: La Reina Helada | Derrota a La Reina Helada (escarcha). | Carámbano. |
| j-blindaje | Trofeo: El Coloso | Trofeo: El Inquisidor | Derrota a El Inquisidor (guardia de hierro). | Llave grande. |
| j-furia | Trofeo: La Furia | Trofeo: El Verdugo | Derrota a El Verdugo (furia). | Capucha negra doblada. |
| j-inestable | Trofeo: El Topo | Trofeo: El Relojero | Derrota a El Relojero (arena rápida). | Reloj de arena tumbado. |
| jefes | Cazajefes | Ningún rey en pie | Derrota a los 7 monarcas. | Siete coronas en fila. |

Las filas `j-*` las genera el código a partir de `BOSSES` (`Trofeo: ${who}`, `Derrota a ${who} (${name en minúscula})`); basta con renombrar los monarcas. «Derrota a El…» suena raro: si `reglas-balance` puede, que use «Vence a» y el artículo contraído («al Usurero»), pero sin cambiar la lógica.

## 17. Plano general de pantallas y piezas sueltas

| id | nombre viejo | nombre nuevo | descripción nueva | imagen que se graba |
|---|---|---|---|---|
| shop | Ferretería · el Ferretero | La Taberna · el Tratante | Donde compras reliquias, sobres y lacre. | Farol colgado sobre un toldo. |
| forge | Mesa de forja | Mesa de lacre | Pones sellos de lacre y acabados en tus cartas. | Vela, barra de lacre y sello. |
| burn | Quemador | La hoguera | Quemas una carta de tu Mazo. | Hoguera pequeña. |
| reroll | Revolver cajones | Renovar mesa | Cambia lo que hay en oferta. | Dos flechas en círculo. |
| pack | Sobre de especiales · sobre clandestino | Sobre lacrado · Sobre a ciegas | Eliges una especial · te toca una sin verla. | Sobre con lacre · sobre con lacre negro. |
| map | Plano de demolición | Mapa del castillo | Las rutas y los asaltos que te esperan. | Pergamino desplegado con un castillo. |
| level | Plano (subir formación) | Pergamino | Sube 1 nivel una formación. | Pergamino enrollado con cinta. |
| reserve | Andamio | La Manga | Te guardas una carta en la manga. | Naipe asomando de un puño de camisa. |
| undo | Tiza | Rebobinar | Deshace la última jugada del turno. | Flecha curva hacia atrás. |
| guild | Gremio · renombre | La Orden · Coronas | Tu progreso entre campañas y su moneda. | Escudo de la Orden: daga y llave cruzadas. |
| acta | Acta de demolición | Crónica | El resumen de una campaña terminada. | Libro con un marcapáginas. |
| end-win | Demolido | Corte vencida | Has ganado. | Corona partida en dos. |
| end-lose | Sepultados | Conjura deshecha | Has perdido. | Daga rota. |
| guide | Capataz (guía) · marcas de tiza | La Maestra · señas | La que te enseña; las marcas que te deja en la mesa. | Mano señalando con el índice. |

## 18. Epígrafes (`src/client/flavor.ts`)

Una línea por pieza, mismo tono: de dónde viene, sin reglas. Ninguna palabra prohibida.

### 18.1 Reliquias

| id | epígrafe nuevo |
|---|---|
| piqueta | Una pica no discute: convence, punta a punta. |
| cortavidrios | Una raya fina y la gema entera se rinde. |
| paleta | Lo que se brinda con este cáliz, se cumple. |
| maza | No tiene filo ni lo necesita. |
| cincel | Un solo punto, bien elegido, y la coraza se abre sola. |
| gemelos | Dos que empujan a la vez pesan como cinco. |
| cinta | Peldaño tras peldaño, la corte baja sola. |
| sacos | Tablas y cuero: la defensa más vieja del mundo. |
| botiquin | Hierbas, vendas y un trago que no figura en el inventario. |
| encofrado | Con la madera de lo que cae se hace lo que protege. |
| casco | Abollado es como mejor demuestra que funciona. |
| puntales | Cuando el Mazo se acaba, siempre queda otro escondido. |
| hucha | Moneda que no se gasta, moneda que compra una corona. |
| taladro | No pregunta qué hay detrás. Lo averigua. |
| estandarte | Bajo un mismo color, la conjura canta al mismo compás. |
| dados | La suerte existe. Por eso conviene traerla hecha de casa. |
| dinamita | Mecha corta, discusión breve. |
| acido | Gota a gota, hasta el orgullo de un trono se pica. |
| andamio | Una mano más en la mesa es una baza más en la conjura. |
| pasarela | En cada manga cabe un secreto. En dos, una traición. |
| contrapeso | Lo que lo protegía es justo lo que lo derriba. |
| sordina | Un sorbo y la guardia entera bosteza. |
| plano_maestro | Todas las puertas ceden a quien llega primero. |
| plomada | El hilo cae recto. Todo lo demás es opinión. |
| nivel | Dos platos quietos perdonan lo que el pulso no. |
| tiralineas | Cerradura fina, cobro seguro. |
| calibre | Cada medida exacta le afina un poco más el pulso. |
| cizalla | Corta una vez y el siguiente ya lo ha notado. |
| metralla | Una gema suelta nunca cae sola. |
| percutor | Por si la primera vez no quedó claro. |
| resonador | Cuatro voces juntas hacen temblar la quinta. |
| diapason | Hace lo que vea al lado. No tiene cara propia. |
| vibrador | Cuando suena, todo el castillo lo oye. |
| timbre | Lo sellado, sellado dos veces. |
| prisma | Una sola luz, partida en todas sus caras. |
| mosaico | De tres colores distintos sale una ventana entera. |
| crisol | Lo que entra roto sale fundido. |
| catalizador | No hace nada. Solo consigue que todo lo demás ocurra. |
| sismografo | Cuanto más corta la vela, más brilla. |
| megafono | Quien la arranca, paga. Con intereses. |
| piquete | Una antorcha encendida y la plaza entera se levanta. |
| ultimo | Nadie golpea tan fuerte como quien ya no tiene adónde volver. |
| corazon | Late dentro de la piedra. Pide que no falles. |
| trituradora | Entra una carta, sale humo. |
| montacargas | Las cenizas pesan más de lo que parece. |
| horno | Lo que no sirve, al menos aviva el fuego. |
| contenedor | Lo guardado hoy pesa mañana. |
| prensa | Cada ceniza, un grado más de mando. |
| ariete | El escudo que te protegía, puesto a correr. |
| contragolpe | Lo que no entra, vuelve. Con intereses. |
| rebosadero | Ni una gota se pierde en esta copa. |
| bastion | Detrás de una buena almena se golpea más tranquilo. |

### 18.2 Cartas especiales

| id | epígrafe nuevo |
|---|---|
| barreno | Un virote pequeño para un problema grande. |
| martillo | Repite. Repite. Repite. |
| saboteador | Entró por la puerta de servicio y salió sin hacer ruido. |
| palanca | Dadme un punto de apoyo y una conjura con ganas. |
| grua | Lo que hace falta, llega volando. |
| mordaza | Hoy la guardia se queda con las ganas. |
| clavos | Una flecha para cada vecino. |
| chatarrero | Toca una vez, pregunta nunca. |
| pico | Hasta los reyes tienen precio. |
| botica | Sabe a rayos. Funciona. |
| gemelo | Nadie distingue cuál de los dos es el bueno. |
| nitro | Firma con cuidado. Con mucho cuidado. |
| bola | Un toque y la conjura entera carga. |
| hormigonera | Tranca echada, puerta cerrada. |
| cemento | Mil anillos pequeños hacen una muralla. |
| sierra | Todo castillo tiene una puerta que nadie vigila. |
| embestida | La mejor defensa es llevársela por delante. |
| ferretero | Fía una vez. Solo una. |
| j-doble | Por fin, las dos caras miran hacia el mismo lado. |
| j-escasez | Lo que os quitó, ahora lo paga. |
| j-sequia | Su cáliz, por fin, a favor de la conjura. |
| j-intemperie | El hielo también sabe hacer de puerta. |
| j-blindaje | Sus preguntas, vueltas contra la corte. |
| j-furia | Rabia prestada. Golpea igual. |
| j-inestable | Da la hora que le pidas, mientras le pagues. |

### 18.3 Monarcas y el Tratante

| id | epígrafe nuevo |
|---|---|
| doble | Nadie sabe cuál de sus dos caras dio la orden. |
| escasez | Lleva la cuenta de cada carta que os falta. |
| sequia | Brinda siempre a tu salud. Nunca bebe primero. |
| intemperie | Donde pisa, el Escudo se cubre de escarcha. |
| blindaje | Pregunta despacio. Nadie responde dos veces. |
| furia | No juzga: ejecuta las órdenes de la corte. |
| inestable | Sabe cuánta arena le queda a cada uno. |
| ferretero | Vende, gruñe y cobra. En ese orden. |

### 18.4 Figuras de la corte (`COURT`)

| rango · palo | epígrafe nuevo |
|---|---|
| 11 · ♠ | Vigila de día, vigila de noche y no ha soltado la lanza desde que entró. |
| 11 · ♦ | Cuenta las joyas del tesoro dos veces al día. Siempre le sale una más. |
| 11 · ♥ | Sirve el vino del Rey. Nunca le tiembla la jarra. |
| 11 · ♣ | Guarda los jardines y conoce cada seto por su nombre. |
| 12 · ♠ | Firma con un punzón. Sus decretos no se rompen: se oxidan. |
| 12 · ♦ | Se mira en mil gemas a la vez y ninguna la engaña. |
| 12 · ♥ | Cada carta de amor del castillo pasa antes por sus manos. |
| 12 · ♣ | Plantó un brote en el patio. Hoy da sombra a toda la guardia. |
| 13 · ♠ | Su corona es una espada doblada a martillazos. |
| 13 · ♦ | Reina desde lo alto de un prisma. Abajo, todo son reflejos. |
| 13 · ♥ | Dicen que tiene el corazón en un cofre. Nadie ha visto la llave. |
| 13 · ♣ | Mandó tallar su trono en un solo roble. |

### 18.5 Palos, ases y Comodín

| pieza | epígrafe nuevo |
|---|---|
| ♠ (palo) | Picas: hierro oscuro, lanza y vigilia. |
| ♦ (palo) | Diamantes: oro bruñido, frío y cortante. |
| ♥ (palo) | Corazones: carmesí real, cáliz y promesa. |
| ♣ (palo) | Tréboles: verdín profundo, raíz y paciencia. |
| A♠ | La primera lanza. Va con quien se lo pida. |
| A♦ | La primera gema del tesoro. |
| A♥ | El primer juramento. Sin él, los demás no saben dónde ir. |
| A♣ | La primera semilla. Abraza lo que le pongan al lado. |
| Comodín | Brazos cruzados. Nadie golpea, nadie cobra, nadie avisa. |
