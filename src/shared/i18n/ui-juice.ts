// Textos de pantalla de juice-ux (V10), en los dos idiomas a la vez: cada clave lleva [español, inglés].
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
  'ui.ctl.golpear': ['Golpear el trono apuntado', 'Strike the targeted throne'],
  'ui.ctl.golpear.k': ['{k} · clic en el trono', '{k} · click the throne'],
  'ui.ctl.manga': ['Guardar en La Manga', 'Keep a card Up the Sleeve'],
  'ui.ctl.rebobinar': ['Rebobinar (deshacer)', 'Rewind (undo)'],
  'ui.ctl.descartar': ['Descartar lo elegido', 'Discard what you chose'],
  'ui.ctl.descartar.p': ['{p} (pulsar la palanca izquierda)', '{p} (press the left stick)'],
  'ui.ctl.atras': ['Atrás / soltar la selección', 'Back / drop the selection'],
  'ui.ctl.saltar': ['Saltar la partida guiada (sin nada elegido)', 'Skip the Guided Game (with nothing chosen)'],
  'ui.ctl.mazo': ['Ver el Mazo y el Descarte', 'See the Deck and the Discard'],
  'ui.ctl.lupa': ['Lupa', 'Loupe'],
  'ui.ctl.lupa.k': ['{k} · clic derecho · pulsación larga', '{k} · right click · long press'],
  'ui.ctl.reliquias': ['Reordenar las reliquias', 'Reorder your Relics'],
  'ui.ctl.reliquias.k': ['Arrastrar · {mayus} + flechas', 'Drag · {mayus} + arrow keys'],
  'ui.ctl.reliquias.p': ['{a} / {b} con el foco en la reliquia', '{a} / {b} with the focus on a relic'],
  'ui.ctl.velocidad': ['Cambiar la velocidad (1× → 2× → 4×)', 'Change the speed (1× → 2× → 4×)'],
  'ui.ctl.barra': ['botón de la barra', 'button on the top bar'],
  'ui.ctl.pantalla': ['Pantalla completa', 'Full screen'],
  'ui.ctl.pantalla.p': ['{p} (pulsar la palanca derecha)', '{p} (press the right stick)'],
  'ui.ctl.reiniciar': ['Reiniciar la campaña', 'Restart the campaign'],
  'ui.ctl.mantener': ['Mantener {k}', 'Hold {k}'],
  'ui.ctl.ajustes': ['Ajustes', 'Settings'],

  // ── SD5 · la insignia del foco con el mando en La Taberna (nav.ts) ──
  'ui.pad.comprar': ['Comprar', 'Buy'],
  'ui.pad.elegir': ['Elegir', 'Pick'],
  'ui.pad.mover': ['Mover', 'Move'],
  'ui.pad.curar': ['Curar', 'Heal'],
  'ui.pad.quemar': ['Quemar', 'Burn'],
  'ui.pad.renovar': ['Renovar', 'Refresh'],
  'ui.pad.seguir': ['Seguir', 'Go on'],
  'ui.pad.ver': ['Ver', 'View'],

  // ── Susurros (whispers.ts): una línea cada uno ──
  'ui.w.inmune': ['<b>Inmune:</b> tus {glyph} no le hacen nada al trono de su mismo palo. Prueba contra otro.', '<b>Immune:</b> your {glyph} do nothing to the throne of their own suit. Try another throne.'],
  'ui.w.andamio': ['<b>Viene un Contraataque fuerte:</b> guarda en La Manga{kh} la carta que no quieras gastar; al reponer robas una más.', '<b>A strong Counterattack is coming:</b> keep the card you want to save Up the Sleeve{kh}; when you refill, you draw one more.'],
  'ui.w.limpio': ['<b>Golpe exacto:</b> si golpeas ahora no hay Contraataque, cobras 1 de oro y robas una carta más.', '<b>Exact Hit:</b> strike now and there is no Counterattack: you collect 1 gold and draw one more card.'],
  'ui.w.forja': ['<b>Mesa de lacre:</b> la carta que elijas queda sellada para siempre. Cancelar no gasta nada.', '<b>Wax Table:</b> the card you pick stays sealed forever. Cancel spends nothing.'],
  'ui.w.atajo': ['<b>Atajo:</b> te saltas el asalto sin Botín ni Taberna, pero te llevas «{tag}».', '<b>Shortcut:</b> you skip the assault with no Spoils and no Tavern, but you take “{tag}”.'],
  'ui.w.jefe': ['<b>Monarca:</b> {who} impone un decreto en este asalto. Su ficha de la barra te lo recuerda.', '<b>Monarch:</b> {who} imposes a decree on this assault. The token on the top bar reminds you.'],
  'ui.w.fatiga': ['<b>Asedio final:</b> desde ahora tus golpes llevan más Multi, pero los Contraataques pegan más fuerte.', '<b>Final Siege:</b> from now on your strikes carry more Mult, but Counterattacks hit harder.'],
  'ui.w.cantera': ['<b>Mazo bajo ({n}):</b> cuando se acabe, se baraja el Descarte y pierdes {loss} de Vida. El Escudo no lo frena.', '<b>Low Deck ({n}):</b> when it runs out, the Discard is shuffled back and you lose {loss} Health. Shield does not stop it.'],
  'ui.w.off': ['No mostrar más', 'Do not show again'],
  'ui.w.ajuste': ['Susurros', 'Whispers'],
  'ui.w.ajuste.texto': ['Una línea de ayuda la primera vez que te encuentras algo (trono Inmune, La Manga, Mesa de lacre, Asedio final…).', 'A line of help the first time you meet something (Immune throne, Up the Sleeve, Wax Table, Final Siege…).'],

  // ── partida guiada (tutorial-ui.ts): el final y los avisos ──
  'ui.tuto.ganada': ['PARTIDA GUIADA COMPLETADA', 'GUIDED GAME COMPLETE'],
  'ui.tuto.fallida': ['PARTIDA GUIADA FALLIDA', 'GUIDED GAME FAILED'],
  'ui.tuto.lista': ['Lista la<br>conjura', 'The conspiracy<br>is ready'],
  'ui.tuto.deshecha': ['Conjura deshecha', 'Conspiracy Undone'],
  'ui.tuto.lista.texto': ['Ya sabes el poder de cada palo, el trono Inmune, La Manga, Daño × Multi = Golpe y el Golpe exacto. En campaña se suman las Reliquias y Rebobinar.', 'Now you know the power of each suit, the Immune throne, Up the Sleeve, Damage × Mult = Hit and the Exact Hit. A campaign adds Relics and Rewind.'],
  'ui.tuto.deshecha.texto': ['Pasa hasta en las mejores conjuras. Repítela con calma.', 'It happens to the best conspiracies. Play it again, calmly.'],
  'ui.tuto.campana': ['A la campaña', 'To the campaign'],
  'ui.tuto.jugar': ['Jugar de verdad', 'Play for real'],
  'ui.tuto.repetir': ['Repetir', 'Play again'],
  'ui.tuto.invalida': ['Jugada inválida', 'Invalid move'],

  // ── la barra y el reinicio (main.ts) ──
  'ui.main.reiniciar': ['Reiniciar campaña', 'Restart campaign'],
  'ui.main.velocidad': ['Velocidad {v}', 'Speed {v}'],

  // ── insignias de reliquia (fx.ts, procBadge) ──
  'ui.proc.dano': ['Daño', 'Damage'],
  'ui.proc.carga': ['Daño guardado', 'Stored Damage'],
  'ui.proc.vida': ['Vida', 'Health'],

  // ── la red (net.ts): conexión y avisos ──
  'ui.red.sin': ['Sin conexión con el servidor', 'No connection to the server'],
  'ui.red.sin.servidor': ['Esta instalación no tiene servidor de salas: escribe uno en Ajustes', 'This install has no room server: type one in Settings'],
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
  'ui.tel.guiada': ['Partida guiada', 'Guided Game'],
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
