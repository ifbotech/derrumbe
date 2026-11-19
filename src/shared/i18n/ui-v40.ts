// V40 · fase 3a (arte-ui) · Textos de la interfaz mínima: el HUD único, la mesa mínima, el Mapa de caminos, el Botín,
// «Elegí una», La Pulpería en bandejas, el Fogón y la portada. Cada clave lleva [español, inglés], como ui-arte.ts, que
// los suma a su columna. Mínimo texto: rótulos de una o dos palabras; el detalle va en los globos (data-tip).
// Sin importaciones: así no entra en el ciclo de las reglas.

export const UI_V40 = {
  // ── HUD ──
  'ui.hud': ['Tu campaña', 'Your campaign'],
  'ui.hud.vida': ['Vida', 'Health'],
  'ui.hud.vida.tip': ['<b>Vida</b>{v} de {max}. Si llega a 0, perdés.', '<b>Health</b>{v} of {max}. At 0, you lose.'],
  'ui.hud.escudo.tip': ['<b>Escudo</b>{v} de {max}. Para el Contraataque antes que la Vida.', '<b>Shield</b>{v} of {max}. Blocks the Counterattack before your Health.'],
  'ui.hud.oro.tip': ['<b>Oro</b>Para La Pulpería.', '<b>Gold</b>For the General Store.'],
  'ui.hud.mazo': ['Mazo', 'Deck'],
  'ui.hud.mazo.tip': ['<b>Mazo</b>{n} cartas. Pulsá para verlo.', '<b>Deck</b>{n} cards. Press to see it.'],
  'ui.hud.tira': ['Amuletos y Bendiciones', 'Amulets and Blessings'],
  'ui.hud.bend.tip': ['<b>{nombre}</b>{desc}<small>{carga}</small>', '<b>{nombre}</b>{desc}<small>{carga}</small>'],
  'ui.hud.escudo.mesa': ['<b>Escudo</b>Para el Contraataque antes que la Vida.', '<b>Shield</b>Blocks the Counterattack before your Health.'],
  'ui.mesa.vida.tip40': ['<b>Vida</b>Si llega a 0, perdés.', '<b>Health</b>At 0, you lose.'],
  'ui.hud.cargas': ['Cargas: +{n}', 'Charges: +{n}'],
  'ui.hud.asalto': ['Asalto {n}', 'Assault {n}'],

  // ── mesa ──
  'ui.mesa40.bufon': ['El Bufón', 'The Jester'],
  'ui.mesa40.vida': ['Vida', 'Health'],
  'ui.mesa40.esperan': ['Esperan', 'Waiting'],

  // ── Mapa ──
  'ui.mapa40.titulo': ['El Mapa', 'The Map'],
  'ui.mapa40.tramo': ['Asalto {n}', 'Assault {n}'],
  'ui.mapa40.ir': ['Ir a {x}', 'Go to {x}'],

  // ── Botín y «Elegí una» ──
  'ui.botin40.titulo': ['Botín', 'Spoils'],
  'ui.botin40.cobrar.oro': ['Cobrar {n} de oro', 'Collect {n} gold'],
  'ui.botin40.elegi': ['Elegí una: {x}', 'Choose one: {x}'],
  'ui.botin40.seguir': ['Seguir', 'Continue'],
  'ui.botin40.saltar': ['Saltar', 'Skip'],
  'ui.elegi40.titulo': ['Elegí una', 'Choose one'],
  'ui.elegi40.rey': ['Te ofrece', 'Offers you'],
  'ui.elegi40.nivel': ['{r} [{n}/{m}]', '{r} [{n}/{m}]'],

  // ── La Pulpería ──
  'ui.pulp40.titulo': ['La Pulpería', 'The General Store'],
  'ui.pulp40.amuletos': ['Amuletos', 'Amulets'],
  'ui.pulp40.cartas': ['Cartas y Trampas', 'Cards and Tricks'],
  'ui.pulp40.servicios': ['Servicios', 'Services'],
  'ui.pulp40.purgar': ['Purgar', 'Purge'],
  'ui.pulp40.curar': ['Curar', 'Heal'],
  'ui.pulp40.renovar': ['Renovar', 'Restock'],
  'ui.pulp40.volver': ['Volver al Mapa', 'Back to the Map'],
  'ui.pulp40.vendido': ['Vendido', 'Sold'],
  'ui.pulp40.gratis': ['Gratis', 'Free'],

  // ── el Fogón ──
  'ui.fogon40.titulo': ['El Fogón', 'The Campfire'],
  'ui.fogon40.curar': ['Curar +{n}', 'Heal +{n}'],
  'ui.fogon40.purgar': ['Purgar una carta', 'Purge a card'],

  // ── portada ──
  'ui.home40.jugar': ['Jugar', 'Play'],
  'ui.home40.seguir': ['Seguir', 'Continue'],
  'ui.home40.coop': ['Cooperativo', 'Co-op'],
} as const satisfies Record<string, readonly [string, string]>;

export type ClaveV40 = keyof typeof UI_V40;

/** Una de las dos columnas: 0 = español, 1 = inglés. */
export function columnaV40(i: 0 | 1): Record<ClaveV40, string> {
  return Object.fromEntries(Object.entries(UI_V40).map(([k, v]) => [k, v[i]])) as Record<ClaveV40, string>;
}
