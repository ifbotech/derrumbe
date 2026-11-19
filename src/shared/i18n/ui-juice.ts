// Textos de pantalla de juice-ux (V10; V11: Susurros de la mesa de dos tronos y de los dos estados), en los dos idiomas a la vez: cada clave lleva [español, inglés].
// es.ts y en.ts los reparten en `ES_UI` y `EN_UI`, junto a los de arte-ui (ui-arte.ts). El español es letra
// por letra el de la 9.0: no se reescribe, solo se saca del código. Sin importaciones (fuera del ciclo de
// las reglas). Lo que va dentro de `{campo}` lo rellena quien llama (insignias de botón, cifras, nombres).

export const UI_JUICE = {
  // ── nombres de teclas que cambian con el idioma (prompts.ts) ──
  'ui.tecla.espacio': ['Espacio', 'Space'],
  'ui.tecla.supr': ['Supr', 'Delete'],
  'ui.tecla.mayus': ['Mayús', 'Shift'],

  // ── tabla de controles (prompts.ts → Ajustes, README y REGLAS en español) ──
  'ui.ctl.mover': ['Mover el foco', 'Move the focus'],
  'ui.ctl.mover.k': ['Flechas', 'Arrow keys'],
  'ui.ctl.mover.p': ['Cruceta o palanca izquierda', 'D-pad or left stick'],
  'ui.ctl.elegir': ['Elegir', 'Choose'],
  'ui.ctl.elegir.k': ['{k} · 1–9 en la mano · clic', '{k} · 1–9 in your hand · click'],
  'ui.ctl.golpear': ['Golpear al enemigo activo', 'Strike the active enemy'],
  'ui.ctl.golpear.k': ['{k} · clic en el trono', '{k} · click the throne'],
  'ui.ctl.manga': ['Guardar en La Manga', 'Keep a card Up the Sleeve'],
  'ui.ctl.rebobinar': ['Rebobinar (deshacer)', 'Rewind (undo)'],
  'ui.ctl.rebobinar.p': ['{p} (pulsar la palanca derecha)', '{p} (press the right stick)'],
  // V12: Mejor jugada, AUTO, la tirada de huesos y el Árbol de la Conjura
  'ui.ctl.mejor': ['Mejor jugada (elige; no golpea)', 'Best Play (picks; does not strike)'],
  'ui.ctl.auto': ['AUTO: encender o apagar', 'AUTO: on or off'],
  'ui.ctl.ritual': ['Saltar la tirada de huesos', 'Skip the Bone Roll'],
  'ui.ctl.ritual.k': ['Cualquier tecla', 'Any key'],
  'ui.ctl.ritual.p': ['Cualquier botón', 'Any button'],
  'ui.ctl.arbol.comprar': ['Altar: elegir un nodo y comprarlo', 'Altar: pick a node and buy it'],
  'ui.ctl.arbol.comprar.k': ['{k} en el nodo · {k} en Comprar', '{k} on the node · {k} on Buy'],
  'ui.ctl.arbol.zum': ['Altar: alejar / ampliar', 'Altar: zoom out / in'],
  'ui.ctl.arbol.mover': ['Altar: mover la vista', 'Altar: move the view'],
  'ui.ctl.arbol.mover.k': ['Arrastrar · {mayus} + flechas', 'Drag · {mayus} + arrow keys'],
  'ui.ctl.arbol.mover.p': ['Palanca derecha', 'Right stick'],
  'ui.ctl.descartar': ['Descartar lo elegido', 'Discard what you chose'],
  'ui.ctl.descartar.p': ['{p} (pulsar la palanca izquierda)', '{p} (press the left stick)'],
  'ui.ctl.atras': ['Atrás / soltar la selección', 'Back / drop the selection'],
  'ui.ctl.mazo': ['Ver el Mazo y el Descarte', 'See the Deck and the Discard'],
  'ui.ctl.lupa': ['Lupa', 'Loupe'],
  'ui.ctl.lupa.k': ['{k} · clic derecho · pulsación larga', '{k} · right click · long press'],
  'ui.ctl.velocidad': ['Cambiar la velocidad (1× → 2× → 4× → 8×)', 'Change the speed (1× → 2× → 4× → 8×)'],
  'ui.ctl.barra': ['botón de la barra', 'button on the top bar'],
  'ui.ctl.pantalla': ['Pantalla completa', 'Full screen'],
  'ui.ctl.pantalla.p': ['{p} → Ajustes → Pantalla completa', '{p} → Settings → Full screen'],
  'ui.ctl.reiniciar': ['Reiniciar la campaña', 'Restart the campaign'],
  'ui.ctl.mantener': ['Mantener {k}', 'Hold {k}'],
  'ui.ctl.ajustes': ['Ajustes', 'Settings'],

  // ── SD5 · la insignia del foco con el mando en La Taberna (nav.ts) ──
  'ui.pad.comprar': ['Comprar', 'Buy'],
  'ui.pad.elegir': ['Elegir', 'Pick'],
  'ui.pad.curar': ['Curar', 'Heal'],
  'ui.pad.quemar': ['Quemar', 'Burn'],
  'ui.pad.renovar': ['Renovar', 'Refresh'],
  'ui.pad.seguir': ['Seguir', 'Go on'],
  'ui.pad.ver': ['Ver', 'View'],

  // ── Susurros (whispers.ts): una línea cada uno ──
  'ui.w.inmune': ['<b>Inmune:</b> tus {glyph} no le hacen Daño a un enemigo de su mismo palo (su poder sí cuenta). Guárdalas para la Casa siguiente.', '<b>Immune:</b> your {glyph} deal no Damage to an enemy of their own suit (their power does count). Save them for the next House.'],
  'ui.w.andamio': ['<b>Viene un Contraataque fuerte:</b> guardá en La Manga{kh} la carta que no quieras gastar; al reponer robás una más.', '<b>A strong Counterattack is coming:</b> keep the card you want to save Up the Sleeve{kh}; when you refill, you draw one more.'],
  'ui.w.limpio': ['<b>Golpe exacto:</b> si golpeás ahora no hay Contraataque, cobrás 1 de oro y robás una carta más.', '<b>Exact Hit:</b> strike now and there is no Counterattack: you collect 1 gold and draw one more card.'],
  'ui.w.forja': ['<b>Mesa de lacre:</b> la carta que elijas queda sellada para siempre. Cancelar no gasta nada.', '<b>Wax Table:</b> the card you pick stays sealed forever. Cancel spends nothing.'],
  'ui.w.atajo': ['<b>El Mapa:</b> elegí el camino. El Guardia Bravo da una Bendición; el Fogón y La Pulpería curan y purgan.', '<b>The Map:</b> choose your path. The Elite Guard gives a Blessing; the Campfire and the General Store heal and purge.'],
  'ui.w.jefe': ['<b>Rey jefe:</b> {who} impone un decreto en este asalto. Su placa, junto a tu Vida, te lo recuerda. Es el último guardia: cada turno que sigue en pie, su Furia sube.', '<b>Boss King:</b> {who} imposes a decree on this assault. The plate beside your Health reminds you. It is the last guard: each turn it stays standing, its Fury rises.'],
  'ui.w.fatiga': ["<b>Furia:</b> el Ataque de los enemigos ha subido. Sube con cada Mazo agotado y, contra el Rey jefe, cada turno.", "<b>Fury:</b> enemy Attack has gone up. It rises each time the Deck runs out and, against the boss King, every turn."],
  'ui.w.cantera': ['<b>Mazo bajo ({n}):</b> cuando se acabe, se baraja el Descarte. No perdés Vida: {efecto}.', '<b>Low Deck ({n}):</b> when it runs out, the Discard is shuffled back in. You lose no Health: {efecto}.'],
  'ui.w.cantera.sube': ["la Furia sube {n} (⚔ +{n} en cada enemigo)", "the Fury rises {n} (⚔ +{n} on every enemy)"],
  'ui.w.cantera.gratis': ['esta vez no pasa nada más', 'nothing else happens this time'],
  // V11: la mesa de dos o tres tronos y los dos estados, la primera vez que se ven
  'ui.w.ausente': ['<b>Un enemigo a la vez:</b> este asalto tiene {n} Casas y se asaltan de una en una. Solo golpeás al del centro, y solo él te contraataca; la fila enseña las que esperan.', '<b>One enemy at a time:</b> this assault has {n} Houses, stormed one by one. You only strike the one in the centre, and only it strikes back; the queue shows the ones waiting.'],
  'ui.w.expuesto': ['<b>Expuesto ({glyph}):</b> el próximo golpe contra ese enemigo hace ×{n} de Daño. Lo deja un golpe de 2 cartas o más de un solo palo.', '<b>Exposed ({glyph}):</b> the next hit against that enemy deals ×{n} Damage. A hit of 2+ cards of one suit leaves it Exposed.'],
  'ui.w.aturdido': ['<b>Aturdido ({glyph}):</b> ese enemigo se salta su próximo Contraataque. Lo deja un golpe de tres palos.', '<b>Stunned ({glyph}):</b> that enemy skips its next Counterattack. A hit with three suits leaves it Stunned.'],
  // V11: el registro de la mesa, cuando el Contraataque saca el palo de un trono que no está en el asalto (table.ts)
  // V12: lo que cae, la tirada de huesos, el Árbol, Mejor jugada, AUTO y las 3 gotas, la primera vez
  'ui.w.caida': ['<b>Lo que cae</b> vuela solo a tu bolsa: esquirlas, monedas y gotas. Pasá el cursor o el dedo para agarrarlo antes.', '<b>Loot</b> flies to your purse by itself: shards, coins and drops. Sweep the cursor or a finger over it to grab it sooner.'],
  'ui.w.tirada': ['<b>Tirada de huesos:</b> tras ganar un asalto, los dados multiplican lo que cayó. Cualquier tecla la salta.', '<b>Bone Roll:</b> after a win, dice multiply what dropped. Any key skips it.'],
  'ui.w.arbol': ['<b>Altar:</b> gasta esquirlas aquí para mejorar para siempre. Lo que podés comprar lleva filete de latón.', '<b>Altar:</b> spend shards here to get better for good. What you can buy has a brass frame.'],
  'ui.w.mejor': ['<b>Mejor jugada</b> elige por vos el mejor golpe. Vos confirmás con Golpear{kh}.', '<b>Best Play</b> picks the best strike for you. You confirm with Strike{kh}.'],
  'ui.w.auto': ['<b>AUTO:</b> el juego juega solo. Cualquier tecla, clic o botón te devuelve el mando.', '<b>AUTO:</b> the game plays itself. Any key, click or button hands control back to you.'],
  'ui.w.gotas': ['<b>{n} gotas de lacre:</b> la próxima Mesa de lacre te sella gratis.', '<b>{n} Wax Drops:</b> the next Wax Table seals for free.'],
  'ui.w.off': ['No mostrar más', 'Do not show again'],
  'ui.w.ajuste': ['Susurros', 'Whispers'],
  'ui.w.ajuste.texto': ['Una línea de ayuda la primera vez que te encontrás algo (trono Inmune, La Manga, Mesa de lacre, Furia…).', 'A line of help the first time you meet something (Immune throne, Up the Sleeve, Wax Table, Fury…).'],

  // ── V40 · el Bufón: sus consejos de la primera campaña (whispers.ts) y su fila de Ajustes ──
  'ui.bufon.ajuste': ['Consejos del Bufón', 'Jester tips'],
  'ui.bufon.ajuste.texto': ['En los 3 primeros golpes de tu primera campaña, el Bufón te dice una frase.', 'In the first 3 hits of your first campaign, the Jester says one line.'],
  'ui.bufon.quien': ['El Bufón', 'The Jester'],
  // V40 · 3b · los sellos de los momentos grandes de la mesa (fx.ts, momento)
  'ui.momento.escoba': ['¡Escoba!', 'Escoba!'],
  'ui.momento.envido': ['¡Envido!', 'Envido!'],
  'ui.momento.chancho': ['¡Chancho!', 'Chancho!'],
  'ui.momento.bravo': ['¡Bravo!', 'Bravo!'],
  'ui.momento.engano': ['¡Engaño!', 'Bluff!'],
  'ui.momento.nivel': ['¡Nivel del Rey!', 'King’s level!'],
  'ui.momento.carga': ['+1 · carga {n}', '+1 · charge {n}'],
  'ui.momento.multi': ['+{n} Multi', '+{n} Multi'],
  'ui.momento.dano': ['+{n} Daño', '+{n} Damage'],
  // V40 · 3b · lo que dice el Bufón cuando la mesa le da motivo (bufon-vivo.ts): varias por momento, separadas por «|»;
  // cada una ≤ 64 caracteres (cabe en dos renglones junto a él en el móvil). Pícaro y ambiguo: nunca se sabe de qué lado está.
  'ui.bufon.r.exacto': [
    '¡Justito en cero! Así me gusta.|Ni un punto de más. Qué prolijo.|Cero redondo. Hasta me dio envidia.|Exacto. Sospechosamente exacto.',
    'Dead on zero! That’s how I like it.|Not a point wasted. How tidy.|Exactly zero. I’m almost jealous.|Precise. Suspiciously precise.',
  ],
  'ui.bufon.r.escoba': [
    '¡Escoba! Barriste la mesa, pícaro.|Quince justos. ¿Quién te enseñó?|¡Escoba! Y yo que te daba por perdido.',
    'Escoba! Swept clean, you rascal.|Fifteen on the nose. Who taught you?|Escoba! And I had written you off.',
  ],
  'ui.bufon.r.envido': [
    '¡Envido! Mirá vos, se anima.|Dos del mismo palo… ¿quiero o no quiero?|Envido cantado. Que tiemble la mesa.',
    'Envido! Look who’s feeling brave.|Two of a suit… shall I call it?|Envido sung. Let the table tremble.',
  ],
  'ui.bufon.r.chancho': [
    '¡Chancho! Cuatro iguales y nadie respira.|¡Chancho va! Y se quedaron quietitos.|Cuatro mellizos. Qué asco. Qué lindo.',
    'Chancho! Four alike and no one breathes.|The pig goes! And they all froze.|Four twins. Revolting. Lovely.',
  ],
  'ui.bufon.r.bravo': [
    'Un bravo en la mano… eso es tener cara.|¡Bravo! El ancho no perdona.|Esa carta pega con ganas. Yo sé.',
    'A bravo in hand… what nerve.|Bravo! The high card shows no mercy.|That card bites with relish. I’d know.',
  ],
  'ui.bufon.r.engano': [
    '¿Engaño? Yo no vi nada. Seguí.|Mentís con cara de piedra. Me encanta.|Ese palo no era tuyo… shh.',
    'A bluff? I saw nothing. Carry on.|Lying with a stone face. Delicious.|That suit wasn’t yours… hush.',
  ],
  'ui.bufon.r.jugada': [
    'Bien servida. Seguí, seguí.|Así se juega al Chinchón, ¿viste?|Prolijo. Demasiado prolijo para vos.',
    'Neatly served. Go on, go on.|That’s how Chinchón is played, see?|Tidy. Too tidy for you.',
  ],
  'ui.bufon.r.carga': [
    'Otra carga. El Rey anota todo.|Suma y sigue. Alguien va a cobrar esto.|Más para la cuenta del Rey.',
    'Another charge. The King keeps score.|It adds up. Someone will collect.|More on the King’s tab.',
  ],
  'ui.bufon.r.nivel': [
    '¡Se encendió el Rey! Ahora te mira distinto.|Un Rey de tu lado… por ahora.|Otra vela para el Rey. Que no se te apague.',
    'The King lights up! He sees you differently now.|A King on your side… for now.|Another candle for the King. Keep it lit.',
  ],
  'ui.bufon.r.contra': [
    '¡Ay! Eso dolió. A mí no, claro.|Te dieron. Yo avisé… ¿avisé?|Sangre. Ahora se pone lindo.|Mirá que no perdonan, ¿eh?',
    'Ouch! That hurt. Not me, of course.|You got hit. I warned you… did I?|Blood. Now it gets interesting.|They don’t forgive, you know.',
  ],
  'ui.bufon.r.salvo': [
    'Ni un rasguño. Qué aburrido.|El Escudo aguantó. Por esta vez.|¿Nada? Pegale más fuerte, che… a vos no, a él.',
    'Not a scratch. How dull.|The Shield held. This time.|Nothing? Hit harder… not you, him.',
  ],
  'ui.bufon.r.sombria': [
    'Te queda poco. Elegí bien… o no.|¿Último turno? Qué emoción.|Mirá que el Caballo no perdona.',
    'Not much left. Choose well… or don’t.|Last turn? How thrilling.|Mind you, the Knight won’t forgive.',
  ],
  'ui.bufon.r.victoria': [
    'Ganaste. Esta vez.|Bien jugado. No se lo digas a nadie.|Mirá vos. El naipe te quiere.',
    'You won. This time.|Well played. Don’t tell anyone.|Well, well. The cards like you.',
  ],
  'ui.bufon.r.derrota': [
    'Y así termina. Yo me río igual.|Otra vez será. Yo te espero.|Se acabó el baile. Barajá y volvé.',
    'And so it ends. I’ll laugh anyway.|Next time, then. I’ll be waiting.|The dance is over. Shuffle and come back.',
  ],
  'ui.bufon.r.tienta': [
    'Mirá sin miedo. Bueno, con un poco.|Elegí una. Las otras no te querían.|Todas brillan. Alguna muerde.',
    'Look without fear. Well, a little.|Choose one. The others didn’t love you.|They all shine. One of them bites.',
  ],

  // ── la barra y el reinicio (main.ts) ──
  'ui.main.reiniciar': ['Reiniciar campaña', 'Restart campaign'],
  'ui.main.velocidad': ['Velocidad {v}', 'Speed {v}'],
  // V12 · AUTO (auto.ts): encendido y apagado fuera de la mesa (en la mesa lo dice su botón)
  'ui.auto.on': ['AUTO encendido: cualquier tecla o botón lo apaga', 'AUTO on: any key or button turns it off'],
  'ui.auto.off': ['AUTO apagado: ahora jugás vos', 'AUTO off: your turn to play'],
  'ui.main.reiniciar.pad': ['Select + Start', 'Select + Start'],

  // ── insignias de reliquia (fx.ts, procBadge) ──
  'ui.proc.dano': ['Daño', 'Damage'],
  'ui.proc.carga': ['Daño guardado', 'Stored Damage'],
  'ui.proc.vida': ['Vida', 'Health'],

  // ── la red (net.ts): conexión y avisos ──
  'ui.red.sin': ['Sin conexión con el servidor', 'No connection to the server'],
  'ui.red.sin.servidor': ['Esta instalación no tiene servidor de salas: escribí uno en Ajustes', 'This install has no room server: type one in Settings'],
  'ui.red.otra': ['Sesión abierta en otra pestaña', 'Session open in another tab'],
  'ui.red.resync': ['Mesa puesta al día con el servidor', 'Table brought up to date with the server'],
  'ui.red.local': ['○ sin servidor de salas: campaña en local', '○ no room server: local campaign'],
  'ui.red.online': ['● servidor en línea', '● server online'],
  'ui.red.conectando': ['○ conectando con el servidor…', '○ connecting to the server…'],
  // los avisos que manda el servidor (src/server/index.ts): el protocolo no cambia, el cliente los reconoce
  'ui.red.srv.no.sala': ['Esa sala no existe.', 'That room does not exist.'],
  'ui.red.srv.empezada': ['La partida ya empezó.', 'The game has already started.'],
  'ui.red.srv.llena': ['La sala está llena (máx. 4).', 'The room is full (4 at most).'],
  'ui.red.srv.fuera': ['No estás en ninguna sala.', 'You are not in any room.'],
  'ui.red.srv.sin.campana': ['No hay campaña en curso.', 'There is no campaign in progress.'],
  'ui.red.srv.anfitrion': ['En campaña decide el anfitrión.', 'In a campaign, the host decides.'],
  'ui.red.srv.ilegible': ['Decisión ilegible.', 'Unreadable decision.'],
  'ui.red.srv.solo.anfitrion': ['Solo el anfitrión puede empezar.', 'Only the host can start.'],
  'ui.red.srv.no.empezada': ['La partida no ha empezado.', 'The game has not started.'],
  'ui.red.srv.invalida': ['Jugada inválida.', 'Invalid move.'],
  'ui.red.srv.mensaje': ['Mensaje ilegible.', 'Unreadable message.'],
  'ui.red.srv.error': ['Error del servidor.', 'Server error.'],

  // ── el resumen de «Enviar Crónica / Feedback de Prueba» (telemetry.ts) ──
  'ui.tel.vacio': ['{titulo} · {v}: sin campañas guardadas', '{titulo} · {v}: no saved campaigns'],
  'ui.tel.cabeza': ['{titulo} · {v} · Feedback de prueba', '{titulo} · {v} · Playtest Feedback'],
  'ui.tel.linea': ['{resultado} · Asalto {asalto} · {turnos} turnos · Reinado {reinado} · {baraja}', '{resultado} · Assault {asalto} · {turnos} turns · Reign {reinado} · {baraja}'],
  'ui.tel.causa': ['Causa: {texto}', 'Cause: {texto}'],
  'ui.tel.dudas': ['Dudas: {dudas} · La Manga: {manga} · Rebobinar: {rebobinar}', 'Doubts: {dudas} · Up the Sleeve: {manga} · Rewind: {rebobinar}'],
  'ui.tel.titulo': ['Feedback de prueba', 'Playtest Feedback'],
  'ui.tel.curso': ['En curso', 'In progress'],
  'ui.tel.victoria': ['Victoria', 'Victory'],
  'ui.tel.derrota': ['Derrota', 'Defeat'],
  'ui.tel.saltada': ['Saltada', 'Skipped'],
} as const satisfies Record<string, readonly [string, string]>;

export type ClaveJuice = keyof typeof UI_JUICE;

/** Una de las dos columnas: 0 = español, 1 = inglés. */
export function columnaJuice(i: 0 | 1): Record<ClaveJuice, string> {
  return Object.fromEntries(Object.entries(UI_JUICE).map(([k, v]) => [k, v[i]])) as Record<ClaveJuice, string>;
}
