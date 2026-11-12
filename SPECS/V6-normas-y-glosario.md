# Sprint V6 · normas de celda y glosario

La V6 cambia el tema entero del juego —de obra y demolición a **conjura contra una corte de naipes**— y su vocabulario, sin tocar una sola cuenta. Lo comparten seis celdas que trabajan **a la vez, en el mismo árbol** (`C:\Users\ifbar\Documents\regicide`): `director`, `reglas-balance`, `arte-ui` A (grabado), `arte-ui` B (textos y pantallas), `juice-ux` y `panel` (el panel simulado, en `..\panelAgentesGaming`).

## 0. Tres reglas que mandan sobre todo lo demás

1. **Ni una cuenta cambia.** Mismos identificadores (`id` de herramientas, especiales, jefes, barajas, contratos, sellos, tratamientos, niveles), mismos números, mismas fórmulas, mismo protocolo de red. Solo cambian nombres, descripciones, textos, arte y sonido. Al final, `npm run analyze:meta` tiene que dar **exactamente** los mismos porcentajes que el informe de la 5.0 (`git show HEAD:scripts/meta-report.json`): si un número se mueve, alguien tocó una regla.
2. **Título propio.** El juego se llama **CORONA ROTA** y vive en `src/shared/brand.ts` (`TITLE`, `SUBTITLE`): nadie escribe el título a mano en otro sitio. No se usa «Regicidio» / «Regicide» como título ni en ningún texto: es el nombre de un juego comercial que ya existe. Por lo mismo no se copian sus nombres propios: la tienda es «Mercado clandestino» (no «la Taberna»), el comodín es «Comodín» y su jugada «Motín» (no «Bufón»), y el as que acompaña es «As cómplice».
3. **Lo entiende un niño de ocho años en dos segundos.** Palabras de baraja y de cuento: Picas, Corazones, Vida, Escudo, Mazo, Descarte. Si un texto necesita explicación, está mal escrito. Tono: oscuro y de conjura, nunca gore; nada de sangre explícita ni de ejecuciones descritas.

## 1. Lo que NO se renombra (identificadores internos)

Se quedan como están, aunque suenen a obra: `id` de datos (`piqueta`, `horno`, `intemperie`, `obra`, `acero`…), nombres de funciones, variables y archivos, clases e `id` de CSS (`.tower`, `.bunker`, `#beltbar`, `#reserve`…), selectores de las pruebas, campos del protocolo, claves de `localStorage` (`derrumbe:*`: son el guardado de los jugadores), el marcador `app: 'derrumbe'` de las copias de seguridad y la dirección de GitHub Pages (`/derrumbe/`). Renombrarlos rompería guardados y pruebas sin que el jugador vea nada.

Sí cambia **todo lo que lee una persona**: textos en pantalla, globos de ayuda, `aria-label`, `title`, nombres de archivo que se descargan, `index.html`, `manifest`, `README.md`, `REGLAS.md`, comentarios de cabecera que describan el juego. Los comentarios internos de código pueden conservar la palabra vieja si nombran un identificador.

## 2. Glosario base (obligatorio y literal)

### Marca
| Antes | Ahora |
|---|---|
| DERRUMBE | **CORONA ROTA** (`TITLE`) · lema `SUBTITLE`: «La conjura de los naipes» |
| roguelike de demolición | roguelike de conjura con baraja francesa |

### Palos
| Antes | Ahora | Tinta y trama (se conservan las cuatro tramas de la V5) |
|---|---|---|
| ♠ Acero | **♠ Picas** | hierro oscuro · rayado diagonal «de lanzas» |
| ♦ Vidrio | **♦ Diamantes** | oro bruñido · punteado «de gemas» |
| ♥ Ladrillo | **♥ Corazones** | carmesí real · aparejo «de cáliz» (hiladas) |
| ♣ Hormigón | **♣ Tréboles** | verdín profundo · rayado cruzado heráldico |

Rueda de palos (antes «ciclo de materiales»): **♠ corta ♦ · ♦ compra ♥ · ♥ doblega ♣ · ♣ quiebra ♠**. Con ventaja, cada carta suma el doble; contra el trono de su propio palo, nada: ese trono es **Inmune** (escudo de armas con su palo).

### Mesa y combate
| Antes | Ahora |
|---|---|
| torre | **trono** («Casa de Picas», «Casa de Diamantes»…); las cuatro: **los cuatro tronos** |
| piso (J, Q, K) | **guardia**: Sota, Reina y Rey de esa casa |
| derribar / demoler un piso | **abatir** a un guardia · cuando cae el Rey: **trono caído** |
| resistencia del piso | **Vida** del guardia |
| amenaza del piso | **Ataque** (⚔ n) |
| búnker · integridad | **tu Vida** (♥ n/20) |
| muro | **Escudo** (🛡) |
| reparar | **curar** |
| cantera | **Mazo** |
| escombrera | **Descarte** |
| colapso (se agota la cantera) | **Mazo agotado**: se baraja el Descarte y pierdes Vida (el Escudo no lo frena) |
| sirena | **Contraataque** (⚔): se voltea una carta del Mazo y ataca el trono de ese palo; primero gasta tu Escudo, luego tu Vida |
| Fuerza | **Daño** |
| Resonancia | **Multi** |
| daño (el total) | **Golpe**: `Daño × Multi = Golpe` |
| +F · +R · ×R (píldoras) | **+D · +M · ×M** |
| golpe limpio | **Golpe exacto** (¡EXACTO!): sin Contraataque, cobras oro, robas y dejas Impulso |
| onda sísmica (castigo al piso de abajo) | **Impulso** |
| racha de golpes limpios | **Racha** |
| fractura | **Brecha** |
| apuntalado | **En guardia** |
| desarmada | **Desarmado** |
| huelga (jugar el comodín) | **Motín**: desarma a ese guardia y no hay Contraataque |
| comodín | **Comodín** |
| As de compañía | **As cómplice** |
| perfora (♠) · esquirlas (♦) · repara (♥) · muro (♣) | **Perfora** · **Salpica** · **Cura** · **Escudo** |
| fatiga de cimientos | **Asedio final** |
| andamio | **La Manga** (te guardas una carta en la manga) |
| tiza de replanteo | **Rebobinar** (↩ Deshacer) |
| pasar | **Pasar** |
| descartar · soltar · golpear | **Descartar** · **Soltar** · **Golpear** |
| formaciones (grupo, doble par, escalera, color, full, póker, escalera de color, carta sola) | igual: son palabras de baraja |

**Las seis palabras clave** (ni una más): **Daño, Multi, Golpe exacto, Brecha, En guardia, Desarmado**. «Daño» y «Multi» van con mayúscula cuando son la palabra clave; «daño» en minúscula es la palabra corriente (evítala: di «Golpe» o «puntos»).

### Campaña y progreso
| Antes | Ahora |
|---|---|
| obra (1–8) | **asalto** (1–8); cada uno, una sala del castillo |
| cinturón de herramientas · herramienta | **Reliquias** · **reliquia** (6 huecos; el orden importa) |
| rarezas común · oficio · capataz · reliquia | **Común · Rara · Noble · Regia** |
| sello (dinamita, eco, jornal, sindical) | **Sello de lacre**: de pólvora, de eco, de oro real, de la manga |
| tratamiento (forjado, templado, policromado, agrietado) | **Acabado**: Filo de plata, Templado, Lacre policromo, Cristal maldito |
| carta especial · legendaria | **carta especial** · **legendaria** |
| jefe · maldición | **monarca** · **decreto** (la regla que impone) |
| ferretería · el Ferretero | **Mercado clandestino** · **el Tratante** |
| mesa de forja | **Mesa de lacre** |
| quemador | **La hoguera** |
| revolver cajones | **Renovar mesa** |
| sobre de especiales · sobre clandestino | **Sobre lacrado** · **Sobre a ciegas** |
| plano de demolición · plano (subir una formación) | **Mapa del castillo** · **Pergamino** |
| ruta · contrato | **ruta** · **Juramento** |
| atajo · etiqueta sindical | **Atajo** · **Atajo de conspirador** |
| hallazgo en los cimientos | **Secreto de la cripta** |
| a cobrar · la paga | **Botín** |
| gremio · renombre | **La Orden** · **Coronas** |
| caja del gremio (surtido) | **Arcón de la Orden** |
| nivel de obra (1–8) | **Reinado** (1–8) |
| cimientos abisales | **Trono infinito** |
| obra diaria | **Asalto diario** |
| acta de demolición · archivo de actas · lámina | **Crónica** · **Archivo de crónicas** · **Lámina** (decreto grabado) |
| sello de maestría | **Sello de maestría** |
| partida clásica (una obra) | **Asalto único** |
| cuadrilla · capataz (guía) · marcas de tiza | **conjura** · **la Maestra** · **señas** |
| susurros de tiza | **Susurros** |
| lupa de grabador | **Lupa** |
| Demolido / Sepultados (finales) | **Corona rota** / **Conjura deshecha** |

La **biblia de nombres** —las 52 reliquias, las especiales, los siete monarcas, las barajas, los ocho asaltos, los ocho Reinados, juramentos, atajos, secretos, logros, arcones, con su `id`, nombre nuevo, descripción nueva (≤ 115 caracteres) y la **imagen** que debe grabarse— la escribe `director` en `SPECS/V6-biblia-de-nombres.md` nada más empezar. Hasta que exista, cada celda avanza con lo que no depende de ella.

## 3. Convivencia (seis celdas, un solo árbol)

- **Prohibido**: `git commit`, `git push`, `git stash`, `git checkout -- <archivo>`, `git restore`, `git reset`, `git clean`. El commit lo hace el orquestador.
- No se arrancan servidores de desarrollo. Las pruebas construyen y sirven solas.
- Cada celda edita lo suyo; en el archivo de otra, solo ediciones quirúrgicas con Edit (nunca reescribir el archivo entero) y anotadas en el informe. Si Edit avisa de que el archivo cambió, vuelve a leer esa zona y repite.
- `npm run typecheck` puede fallar por un archivo a medio editar de otra celda: si el error no es tuyo, espera y repite.
- **Construcción propia**: `QA_DIR=dist/qa-<celda>` y `QA_OUT=artifacts/visual-qa-<celda>` delante de `npm run qa:visual` / `qa:smoke` / `forja`. Laboratorio: `LAB_HILOS=6`.
- Parches grandes: archivo `.mjs` ejecutado con `node`, exigiendo que cada ancla exista y sea única; en `String.replace`, función de reemplazo.
- Nada de abrir el juego en un navegador que no sea el Chromium sin ventana de Playwright: el progreso real del usuario vive en su `localStorage`.
- **Bitácora obligatoria** en `artifacts/v6/progreso-<celda>.md` (hecho · en curso · pendiente), al día tras cada bloque: si la sesión se corta, quien retome lee eso.
- **Sala del calabozo** al empezar cada bloque: `node C:/Users/ifbar/.claude/dungeon_hook.mjs set <Sala> working "<qué haces>"` (salas: `Director`, `Reglas-Balance`, `Arte-UI`, `Juice-UX`, `QA-3090` para la celda del panel) y `… done "<resumen>"` al terminar.
- Reglas de imprenta de la V5, intactas: texto ≥ 13 px (14 en móvil), ninguna cifra en gótica, dianas ≥ 44 px, cero recortes en `1920×1080`, `1366×768`, `1280×800` y `390×844`, nada de blanco ni negro puros. Constitución: ≤ 6 palabras clave, ≤ 56 reliquias, descripciones ≤ 115 caracteres.

## 4. Quién toca qué

| Celda | Archivos |
|---|---|
| `director` | `SPECS/V6-biblia-de-nombres.md`, `ROADMAP_V5_V10.md`, `SPECS/V6.md`…`V10.md`, `CHANGELOG.md`, prosa del `README.md` (las tablas entre marcas las genera `npm run docs`) |
| `reglas-balance` | `src/rules/*` (nombres, descripciones, etiquetas de `step`, mensajes de error, textos de `autopsy.ts`), `src/shared/brand.ts`, `scripts/reglas.ts` (genera `REGLAS.md`), textos de `scripts/analyze-meta.ts`, `tests/*`, y la prueba nueva `tests/vocabulario.test.ts` |
| `arte-ui` A (grabado) | `glyphs.ts`, `art.ts`, `engraving.ts`, el arte de `card.ts`, el dibujo de los tronos en `table.ts`, tipografía de títulos y estilos de arte en `theme.css`, `scripts/og-card.ts`, `public/og-card.png`, `public/favicon.svg`, `scripts/svg-forge.ts`, `forja-qa.ts` |
| `arte-ui` B (textos y pantallas) | todos los textos de `table.ts`, `runscreens.ts`, `guild.ts`, `home.ts`, `widgets.ts`, `lupa.ts`, `lobby.ts`, `campaign.ts`, `core.ts`, `cuenta.ts`, `causa.ts`, `lamina.ts`, `rules-text.ts`, `flavor.ts`, `backup.ts`, `index.html`, `public/manifest.webmanifest`; maquetación (`styles.css`, `campaign.css`, `cuenta.css`, `acta.css`); `scripts/visual-qa.ts` y `qa.ts` |
| `juice-ux` | `whispers.ts`, `tutorial-ui.ts`, `src/rules/tutorial.ts` (el guion), `prompts.ts`, `nav.ts`, `fx.ts`, `audio.ts`, `juice.css`, `net.ts`, `pings.ts`, `platform.ts`, `src/server/*`, `scripts/smoke.ts`, `scripts/gamepad-qa.ts` |
| `panel` | solo `..\panelAgentesGaming` (nunca el repo del juego) |

## 5. Cómo se sabe que no queda jerga vieja

Tres redes, y las tres tienen que quedar en cero:

1. **Prueba estática** `tests/vocabulario.test.ts` (de `reglas-balance`): recorre todos los datos de `src/rules` (nombres, descripciones, etiquetas) y los literales de texto de `src/` con aspecto de frase, más `README.md`, `REGLAS.md` e `index.html`.
2. **Regla «jerga» de la QA visual** (de `arte-ui` B): ningún nodo de texto visible, `data-tip`, `aria-label` ni `title` de los 25 estados × 4 ventanas contiene una palabra prohibida.
3. **Barrido final** del orquestador.

Palabras prohibidas en lo que lee una persona (sin distinguir mayúsculas ni tildes): `derrumbe`, `búnker`, `escombrera`, `cantera`, `ferretería`, `ferretero`, `andamio`, `hormigón`, `ladrillo`, `acero` (como palo), `vidrio`, `sirena`, `obra` (como nivel), `demolición`, `demoler`, `capataz`, `gremio`, `sindical`, `cimientos`, `tiza`, `forja`, `quemador`, `piso` (como enemigo), `torre` (como enemigo), `muro` (como defensa), `integridad`, `Fuerza`, `Resonancia`, `golpe limpio`, `fractura`, `apuntalad`, `huelga`, `herramienta`, `cinturón`, `regicid`.
