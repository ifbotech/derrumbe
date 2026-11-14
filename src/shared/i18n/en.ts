// English dictionary (V10). Same keys as es.ts. Two parts:
//   · `EN_UI`: screen texts (`ui.*`), typed against the Spanish keys: a missing key does not compile.
//     Written by arte-ui and juice-ux.
//   · `reglasEn()`: rule texts, hand-written with the glossary of SPECS/V10.md (1.3). Descriptions with
//     figures are `{campo}` templates filled with `fillFor('en', …)` and the very same numbers of `BALANCE`,
//     so the English figure can never drift from the engine. tests/i18n.test.ts checks every key.
//
// Proper names (relics, specials, monarchs, assaults, Reigns, decks, Oaths, Shortcuts, Secrets, upgrades,
// achievements): dark court, conspiracy, card table; never gore, never a name from another commercial game;
// each one 24 characters at most.
import { ACHIEVEMENTS, TOOL_GOAL } from '../../rules/achievements';
import { BALANCE, fillFor } from '../../rules/balance-config';
import { CIFRAS_MESA, cifrasBaraja, cifrasEspecial, cifrasMonarca, cifrasReinado, cifrasReliquia } from '../../rules/cifras';
import type { Formation, Seal, Suit, Treatment, TowerFx } from '../../rules/engine';
import { ASCENSIONS, BOSSES, CONTRACTS, DECKS, EVENTS, STAGES, TAGS, UPGRADES } from '../../rules/run';
import { BASE_POOL, SPECIALS } from '../../rules/specials';
import { TOOL_SLOTS, TOOLS } from '../../rules/tools';
import type { Arch, Rarity } from '../../rules/tools';
import { ES_UI, type ClaveUi } from './es';
import { columna } from './ui-arte';
import { columnaJuice } from './ui-juice';

/** Screen texts. Same keys as `ES_UI`. */
export const EN_UI: Record<ClaveUi, string> = { ...columna(1), ...columnaJuice(1) } satisfies Record<keyof typeof ES_UI, string>;

const f = (tpl: string, v: Record<string, number | string> = {}) => fillFor('en', tpl, v);

/** Relics: [name, description template]. */
const RELIQUIAS: Record<string, [string, string]> = {
  piqueta: ['Spade Dagger', '+{dano} Damage for each ♠ you play.'],
  cortavidrios: ['Diamond Ring', '+{dano} Damage for each ♦ you play.'],
  paleta: ['Heart Chalice', '+{dano} Damage for each ♥ you play.'],
  maza: ['Club Mace', '+{dano} Damage for each ♣ you play.'],
  cincel: ['Stiletto', '+{dano} Damage if you play a single card.'],
  gemelos: ['Twin Daggers', '+{multi} Mult with a group, two pair, full house or four of a kind.'],
  cinta: ['Grand Staircase', '+{multi} Mult with a straight or straight flush.'],
  sacos: ['Great Shield', 'Shield rises by half your ♣ instead of a third, and its cap grows +{tope}.'],
  botiquin: ['Balm', 'You heal half your ♥ instead of a third.'],
  encofrado: ['Buckler', 'Each guard defeated: +{escudo} Shield.'],
  casco: ['Helm', 'Each guard defeated: +{vida} Health.'],
  puntales: ['Spare Deck', 'When the Deck runs out, you lose {vida} less Health.'],
  hucha: ['Coin Purse', '+{oro} gold at the end of each assault.'],
  taladro: ['Lance', 'All your hits Pierce, with or without ♠.'],
  estandarte: ['Banner', '+{multi} Mult with a flush or straight flush.'],
  dados: ['Loaded Dice', '+{multi} Mult with two pair or a full house.'],
  dinamita: ['Powder Keg', 'Suit advantage multiplies ×3 instead of ×2.'],
  acido: ['Drop of Poison', 'No throne is Immune: your cards hit ×1 against the throne of their suit.'],
  andamio: ['Gauntlet', '+{cartas} card in your hand.'],
  pasarela: ['Double Sleeve', '+1 slot Up the Sleeve: you keep two cards aside from your hand.'],
  contrapeso: ["Traitor's Mask", "Immune is reversed: cards of the throne's suit hit it with advantage."],
  sordina: ['Sleeping Draught', 'The Attack of every guard drops by {ataque}.'],
  plano_maestro: ['Master Key', '×{multi} Mult on the first hit against each guard.'],
  plomada: ['Pendulum', 'Each Exact Hit: +{vida} Health.'],
  nivel: ['Scales', 'Exact Hit allows a margin of ±{margen}.'],
  tiralineas: ['Lockpick', 'Each Exact Hit: +{oro} gold.'],
  calibre: ['Compass', 'Gains +{multi} Mult for good with each Exact Hit.'],
  cizalla: ["Tailor's Shears", 'After an Exact Hit, the next guard loses half its Health.'],
  metralla: ['Broken Necklace', 'Splash deals half your ♦ instead of a third.'],
  percutor: ['Bell', 'Triggers the first card of the hit again.'],
  resonador: ['War Horn', '×{multi} Mult if you play {cartas} cards or more.'],
  diapason: ['Hand Mirror', 'Copies the relic to its right.'],
  vibrador: ['War Drum', 'With a group, two pair, full house or four of a kind, half the Hit splashes the other thrones.'],
  timbre: ['Signet Ring', 'At the start of each assault, seals {sellos} random card of your Deck. Seals trigger twice.'],
  prisma: ['Prism', '+{multi} Mult for each card in the hit that shares a suit with another (up to +{tope}).'],
  mosaico: ['Stained Glass', '+{dano} Damage if the hit mixes 3 suits or more.'],
  crisol: ['Cauldron', 'Breach multiplies ×{multi}, and 3-suit hits also leave a Breach.'],
  catalizador: ["Philosopher's Stone", '×{multi} Mult for each throne with Breach, On Guard or Disarmed ×1 (they add up).'],
  sismografo: ['Spent Candle', '+{multi} Mult for each point of Health you are missing.'],
  megafono: ['Thorned Rose', 'When a Counterattack takes your Health, the throne that attacked takes {dano}.'],
  piquete: ['Torch', 'Each Mutiny (Joker): +{oro} gold and you draw {cartas} cards.'],
  ultimo: ['Last Breath', '×{multi} Mult if your Health is at 50 % or less.'],
  corazon: ['Heart of Stone', '×{multi} Mult. If the hit defeats no guard, you lose {vida} Health.'],
  trituradora: ['Brazier', 'When you discard, the first card burns: it leaves your Deck for good.'],
  montacargas: ['Ash Urn', '+{dano} Damage for each card burned this campaign.'],
  horno: ['Bellows', '+{oro} gold each time a card burns in an assault (Brazier, Cursed Glass).'],
  contenedor: ['Locked Chest', 'Discards do not come back this assault, and each card gives +{dano} Damage to your next hit.'],
  prensa: ['Ash Scepter', '×{x1} Mult for each card burned this campaign (they add up: 4 cards, ×{x4}).'],
  ariete: ['Battering Ram', '+{dano} Damage for each point of Shield standing.'],
  contragolpe: ['Spiked Shield', 'If Shield fully stops a Counterattack, its throne takes {factor} × what was stopped. E.g.: stops 4 → takes {ej}.'],
  rebosadero: ['Brimming Cup', 'Overflow Shield: every {escudo} heals 1. Overflow healing: +{dano} Damage per point to your next hit.'],
  bastion: ['Bulwark', '×{multi} Mult with Shield at 50 % of its cap or more.'],
};

const RAREZAS: Record<Rarity, string> = { comun: 'Common', oficio: 'Rare', capataz: 'Noble', reliquia: 'Royal' };
const ARQUETIPOS: Record<Arch, string> = {
  base: 'The Arsenal',
  precision: 'Steady Hand',
  sismo: 'Echo and Repeat',
  alquimia: 'Suit Alchemy',
  limite: 'Life on the Edge',
  trituradora: 'Fire and Ash',
  aguante: 'Shield and Riposte',
};

/** Special cards: [name, description template]. */
const ESPECIALES: Record<string, [string, string]> = {
  barreno: ['Crossbow', 'The hit Pierces and adds +{flat} Damage.'],
  martillo: ['War Hammer', 'The highest card in the hit counts 2 times.'],
  saboteador: ['The Spy', 'Disarms the guard you hit.'],
  palanca: ['Grappling Hook', '+{flatPerCard} Damage for each card in the hit.'],
  grua: ['Carrier Pigeon', 'You draw {draw} extra cards this turn.'],
  mordaza: ['Truce', 'No Counterattack this turn.'],
  clavos: ['Rain of Arrows', '{splash} points to each of the other thrones.'],
  chatarrero: ['Pickpocket', '+{gold} gold.'],
  pico: ['Ransom', 'If the hit defeats a guard, +{goldOnKill} gold.'],
  botica: ['Elixir', '+{heal} Health.'],
  gemelo: ['Marked Card', 'Every card in the hit is worth as much as the highest one.'],
  nitro: ['Dark Pact', '×{strikeMult} Mult, but you lose {hurt} Health.'],
  bola: ['Bugle', '×{strikeMult} Mult.'],
  hormigonera: ['Barred Door', '+{wall} Shield.'],
  cemento: ['Chain Mail', '+{wallPerCard} Shield for each card in the hit.'],
  embestida: ['Onslaught', '+{flat} Damage, and +{wallForce} more for each point of Shield standing.'],
  sierra: ['Secret Passage', 'The whole hit strikes with advantage, whatever the throne.'],
  ferretero: ['The Dealer', '+{gold} gold and you draw {draw} extra card.'],
  'j-doble': ['The Two-Faced King', 'No Counterattack and you draw {draw} extra card.'],
  'j-escasez': ['The Usurer', '+{gold} gold.'],
  'j-sequia': ['The Chalice Lady', '+{heal} Health.'],
  'j-intemperie': ['The Frost Queen', '+{wall} Shield and no Counterattack.'],
  'j-blindaje': ['The Inquisitor', '×{strikeMult} Mult.'],
  'j-furia': ['The Executioner', '+{flat} Damage and the hit Pierces.'],
  'j-inestable': ['The Clockmaker', '{splash} points to each of the other thrones.'],
};

interface MonarcaEn {
  nombre: string;
  decreto: string;
  desc: string;
  badge: string;
  entrada: string;
  contraataque: string;
  caida: string;
}
/**
 * The seven monarchs. Their table talk keeps the Spanish card-duel swagger (envido, truco, retruco) through
 * the betting of a card table: bet, call, raise, all in, bluff. No figures and no rule words.
 */
const MONARCAS: Record<string, MonarcaEn> = {
  doble: {
    nombre: 'The Two-Faced King',
    decreto: 'Double Counterattack',
    desc: 'There are {contraataques} Counterattacks each turn, but each one attacks {pct} % weaker.',
    badge: '{contraataques} Counterattacks per turn',
    entrada: 'Care to bet? I have two faces, and both of them are bluffing.',
    contraataque: 'I raise! And the moment you turn around, I raise again.',
    caida: 'My card flipped over... and on both sides at once.',
  },
  escasez: {
    nombre: 'The Usurer',
    decreto: 'Scarcity',
    desc: 'You all play with {cartas} card fewer in hand.',
    badge: '{cartas} card fewer in hand',
    entrada: 'No credit at this table, dear. Play with what you have.',
    contraataque: 'I came to collect the interest. Call? I always call.',
    caida: 'Not a copper left to my name... put it on my tab, friend.',
  },
  sequia: {
    nombre: 'The Chalice Lady',
    decreto: 'Poisoned Chalice',
    desc: 'Your ♥ do not heal.',
    badge: 'Your ♥ do not heal',
    entrada: 'A toast, darling. My cup has never mended a single heart.',
    contraataque: 'One more little sip... no? I will pour it for you anyway.',
    caida: 'I spilled my chalice all over the felt. How very untidy.',
  },
  intemperie: {
    nombre: 'The Frost Queen',
    decreto: 'Frost',
    desc: 'Shield cannot go above {escudoTope}.',
    badge: 'Shield max {escudoTope}',
    entrada: 'Bundle up, little card. At my table no blanket covers you.',
    contraataque: 'I call and I raise, with frost on every word.',
    caida: 'I am melting... and your hands are barely warm. How unfair.',
  },
  blindaje: {
    nombre: 'The Inquisitor',
    decreto: 'Iron Guard',
    desc: 'Every guard arrives On Guard and, while they stay that way, their Attack rises by {ataque}.',
    badge: 'On Guard: +{ataque} Attack',
    entrada: 'My guards pray with their eyes open. No one surprises them.',
    contraataque: 'Confess your hand, heretic. A fierce card never lies.',
    caida: 'Heresy! They beat me with marked cards.',
  },
  furia: {
    nombre: 'The Executioner',
    decreto: 'Fury',
    desc: 'The Attack of all four thrones rises by {ataque}.',
    badge: '+{ataque} Attack on every throne',
    entrada: 'I sharpened my axe all night. All in, and no mercy!',
    contraataque: 'I raise! And this time my hand does not shake.',
    caida: 'My hood slipped off. A bad hand, that one of mine.',
  },
  inestable: {
    nombre: 'The Clockmaker',
    decreto: 'Quicksand',
    desc: 'The Final Siege starts {antes} turns earlier, and each guard defeated without an Exact Hit costs you {vida} Health.',
    badge: 'Final Siege {antes} turns early',
    entrada: 'Tick, tock. Every grain of sand is playing on my side.',
    contraataque: 'Your sand is running out, partner. I never rush: I wait.',
    caida: 'My clock stopped... right on your hour.',
  },
};

const ASALTOS = ['The Drawbridge', 'The Training Yard', 'The Armory', 'The Kitchens', 'The Chapel', 'The Library', 'The Hall of Mirrors', 'The Throne Room'];

const REINADOS: [string, string][] = [
  ['Reign of Peace', 'The usual rules.'],
  ['Fine Armor', 'Every guard has {pct} % more Health.'],
  ['Royal Tax', 'Everything in the Tavern costs {impuesto} more gold.'],
  ['Kings on Guard', 'In assaults with a monarch, Kings arrive On Guard.'],
  ['Wrathful King', 'The Attack of Kings rises by {rey}.'],
  ['Old Wounds', 'You have {heridas} point of Health less.'],
  ['Night Watch', 'The Attack of Jacks and Queens rises by {noche}.'],
  ['Sealed Gates', 'Only in assault {asaltos}, the Attack of all four thrones rises by {clausura}.'],
];

const BARAJAS: Record<string, [string, string]> = {
  obra: ['Conspiracy Deck', 'The usual one: 40 cards, 2 Jokers and a Sealed Pack of {sobre} specials.'],
  acero: ['Black Deck', 'Only ♠ and ♣, doubled: no Heal or Splash. Drop of Poison, Great Shield and +{vida} Health (+Bulwark with its chest).'],
  prestamista: ["Moneylender's Deck", '+{oro} starting gold and interest pays double, but you have {vida} less Health.'],
  ases: ['Deck of Aces', 'Eight aces and no 2: more Accomplice Aces and more punch, but you have {vida} less Health.'],
  corta: ['Short Deck', 'No twos or threes: big hits, the Deck runs out sooner and you have {vida} less Health. +{oro} starting gold.'],
  caos: ['Chaos Deck', 'A single Joker, but the starting Sealed Pack brings {total} special cards.'],
};

/** Oaths: [name, condition, reward]. Their figures are written in run.ts, so here too (the parity test compares them). */
const JURAMENTOS: Record<string, [string, string, string]> = {
  intacto: ['Unscathed', 'Finish the assault without losing Health.', '+8 gold'],
  limpios: ['Steady Pulse', 'Land 3 Exact Hits.', 'A random wax seal'],
  rapido: ['At a Gallop', 'Win the assault in 3 turns + 4 per guard of each throne, or fewer (3 guards: 15).', '+6 gold'],
  sincolapso: ['Measured Deck', 'Finish without the Deck running out.', '+5 gold'],
  austero: ['No Mutinies', 'Do not play any Joker.', 'A random finish'],
  maestra: ['Master Play', 'Play a flush, a full house, four of a kind or a straight flush.', 'A random Scroll'],
  horas: ['Long Night', 'The Attack of all four thrones rises by 1.', '+10 gold'],
  sinred: ['No Shield', 'Shield cannot go above 2.', 'A Rare relic or better'],
  corta: ['Short Conspiracy', 'You all play with 1 card fewer in hand.', '+12 gold'],
};

const ATAJOS: Record<string, [string, string]> = {
  vale: ['Tavern Key', 'At the next Tavern, relics, packs and the Wax Table are free.'],
  envio: ['Contraband', 'You get a Noble or Royal relic right now.'],
  molde: ['Wax Mold', 'Duplicate the card of your Deck that you choose.'],
  liquidacion: ['Hidden Loot', '+15 gold.'],
  timbrado: ['Double Wax', 'Two random cards of your Deck get a wax seal.'],
};

interface OpcionEn {
  etiqueta: string;
  desc: string;
  gana: string;
  cuesta?: string;
}
/** Crypt Secrets: name, scene and options (label, what it does, what you gain and what it costs, ≤ 24). */
const SECRETOS: Record<string, { nombre: string; texto: string; opciones: OpcionEn[] }> = {
  caja: {
    nombre: 'The Buried Chest',
    texto: 'Between two tombs a padlocked chest peeks out. Forcing it open will shake half the crypt.',
    opciones: [
      { etiqueta: 'Force it open', gana: 'Noble or Royal relic', cuesta: '−5 Health', desc: 'You lose 5 Health. You take a Noble or Royal relic.' },
      { etiqueta: 'Sell it to the Dealer', gana: '+8 gold', desc: '+8 gold.' },
    ],
  },
  horno: {
    nombre: "The Alchemist's Cauldron",
    texto: 'A cauldron boils on its own in a corner. Whatever goes in comes out as something else.',
    opciones: [
      { etiqueta: 'Melt two cards', gana: 'Card in Polychrome Wax', cuesta: 'Two cards burn', desc: 'Pick two: they burn and one is born with the higher number, in Polychrome Wax and with any seals they had.' },
      { etiqueta: 'Warm up and move on', gana: '+4 Health', desc: '+4 Health.' },
    ],
  },
  contrato: {
    nombre: 'The Cursed Decree',
    texto: 'A decree nailed to the door promises a huge sum. The fine print speaks of the next assault.',
    opciones: [
      { etiqueta: 'Sign it', gana: '+20 gold', cuesta: '+1 Attack next assault', desc: '+20 gold now. In the next assault, the Attack of all four thrones rises by 1.' },
      { etiqueta: 'Tear it up', gana: '+3 gold', desc: 'The paper burns nicely: +3 gold.' },
    ],
  },
  clandestino: {
    nombre: 'The Blind Sealers',
    texto: 'Three monks seal whatever you set before them by candlelight, and they never haggle.',
    opciones: [
      { etiqueta: 'Pay with Health', gana: '3 sealed cards', cuesta: '−6 Health', desc: 'You lose 6 Health. Three random cards get a wax seal.' },
      { etiqueta: 'Pay with gold', gana: 'Polychrome best card', cuesta: '−8 gold', desc: '8 gold. Your highest card gets Polychrome Wax.' },
      { etiqueta: 'Walk on by', gana: 'Nothing changes', desc: 'Nothing changes.' },
    ],
  },
  planos: {
    nombre: 'The Hidden Maps',
    texto: 'Behind a flagstone lie the castle maps. Tearing them out makes what little shelters you creak.',
    opciones: [
      { etiqueta: 'Tear them out', gana: '2 formations +2 levels', cuesta: '−3 Max Health', desc: 'You lose 3 Max Health for good. Two random formations go up 2 levels.' },
      { etiqueta: 'Copy them by hand', gana: '1 formation +1 level', cuesta: '−5 gold', desc: '5 gold. One random formation goes up 1 level.' },
      { etiqueta: 'Leave them be', gana: 'Nothing changes', desc: 'Nothing changes.' },
    ],
  },
};

/** Upgrades of the Order. The chests list the relics they add (with their English names). */
const MEJORAS: Record<string, [string, string?]> = {
  caja_precision: ['Chest of Precision'],
  caja_sismo: ['Chest of Echoes'],
  caja_alquimia: ['Chest of Alchemy'],
  caja_limite: ['Chest of the Edge'],
  caja_trituradora: ['Chest of Ashes'],
  caja_aguante: ['Chest of the Shield'],
  tampones: ['New Seals', 'The Wax Table also offers the powder and sleeve seals.'],
  bronce: ['Royal Glazier', 'The Wax Table also offers Polychrome Wax and Cursed Glass.'],
  vale: ["Dealer's Favor", 'One free Refresh Table at each Tavern, per level.'],
  tienda: ['Big Stall', '+1 relic on offer at each Tavern, per level.'],
  caja: ["The Order's Purse", '+{oro} starting gold per level.'],
  rutas: ['Cartographer', 'Each assault without a monarch offers 3 routes with an Oath instead of 2.'],
};

/** Achievements: [name, description]. The monarch trophies (`j-<id>`) are built from the monarchs. */
const LOGROS: Record<string, [string, string]> = {
  primera: ['First Step', 'Win your first campaign assault.'],
  capataz: ['Farewell, Jailer', 'Clear assault 3.'],
  media: ['Half the Castle', 'Clear assault 5.'],
  madre: ['End of the Reign', 'Win a campaign.'],
  asc3: ['Grand Conspirator', 'Win a campaign on Reign 4 or higher.'],
  abismo: ['Beyond the Throne', 'Clear an Endless Throne.'],
  abismo3: ['Without End', 'Clear three Endless Thrones in one campaign.'],
  diaria: ['Daily Round', 'Finish a Daily Assault.'],
  doblepar: ['Two and Two', 'Play two pair.'],
  color: ['All One Suit', 'Play a flush.'],
  full: ['House Full', 'Play a full house.'],
  poker: ['Four of a Kind', 'Play four of a kind.'],
  real: ['Royal Straight', 'Play a straight flush of 5 cards or more.'],
  golpe100: ['In One Blow', 'Land a Hit of 100 or more.'],
  golpe500: ['Thunder', 'Land a Hit of 500 or more.'],
  golpe2000: ['Cataclysm', 'Land a Hit of 2000 or more.'],
  limpio10: ['Firm Hand', 'Land 10 Exact Hits.'],
  limpio50: ["Thief's Touch", 'Land 50 Exact Hits.'],
  pisos100: ['A Hundred Guards', 'Defeat 100 guards.'],
  pisos500: ['Scourge of the Court', 'Defeat 500 guards.'],
  intacto: ['Not a Scratch', 'Finish an assault with full Health.'],
  rico: ['Miser', 'Hold 30 gold at once.'],
  cinturon: ['Full Reliquary', 'Carry {n} relics at once.'],
  forja: ['Sealmaker', 'Stamp 10 wax seals or finishes.'],
  contratos: ['Word of Honor', 'Fulfill 10 Oaths.'],
  atajo: ['Through the Back Door', 'Skip 3 assaults.'],
  coleccion: ['Collector', 'Get the {n} common special cards, across all your campaigns.'],
  ferretero: ["The Dealer's Client", 'Carry {n} different relics, across all your campaigns.'],
  jefes: ['No King Left Standing', 'Defeat all {n} monarchs.'],
};
/** Figures of the achievements whose Spanish text is built in achievements.ts. */
const CIFRAS_LOGRO: Record<string, Record<string, number>> = {
  cinturon: { n: TOOL_SLOTS },
  coleccion: { n: BASE_POOL.length },
  ferretero: { n: TOOL_GOAL },
  jefes: { n: BOSSES.length },
};

const PALABRAS: Record<string, [string, string]> = {
  fuerza: ['Damage', 'What your cards add up to: their number, double with suit advantage and nothing against the throne of their suit (Immune).'],
  resonancia: [
    'Mult',
    'What multiplies Damage: Damage × Mult = Hit. The formation sets it; what adds counts where it sits, and what multiplies multiplies everything before it.',
  ],
  limpio: [
    'Exact Hit',
    'Defeating a guard with the exact Hit (equal to its Health): no Counterattack, +1 gold, draw 1, Momentum (the next guard loses ¼ of its Health) and Streak (+0.5 Mult on the next hit, up to +2).',
  ],
  fractura: ['Breach', 'Left by a hit of a single suit (2 cards or more). The next hit against that throne deals ×1.5 Mult.'],
  apuntalado: ['On Guard', 'The first hit against that guard deals half Mult (×0.5). Some monarchs and Reigns bring it.'],
  desarmada: [
    'Disarmed',
    'A Disarmed throne does not attack when the Counterattack draws its suit. Mutiny (Joker) disarms it until its guard falls; a 3-suit hit, only for its next Counterattack (×1).',
  ],
};

const FORMACIONES: Record<Formation, string> = {
  solo: 'Single Card',
  compania: 'Accomplice Ace',
  grupo: 'Group',
  doblepar: 'Two Pair',
  escalera: 'Straight',
  color: 'Flush',
  full: 'Full House',
  poker: 'Four of a Kind',
  escaleracolor: 'Straight Flush',
};

const SELLOS: Record<Seal, [string, string]> = {
  dinamita: ['Powder Seal', "On a hit, the neighboring thrones (order ♠ ♦ ♥ ♣) take this card's value."],
  eco: ['Echo Seal', 'Its Damage and its suit power count 2 times.'],
  jornal: ['Royal Gold Seal', '+{oro} gold if the hit defeats a guard.'],
  sindical: ['Sleeve Seal', 'Draw 1 extra card when you play or discard it.'],
};
const ACABADOS: Record<Treatment, [string, string]> = {
  forjado: ['Silver Edge', '+{n} Damage.'],
  templado: ['Tempered', '+{n} Mult.'],
  policromado: ['Polychrome Wax', '×{n} Mult.'],
  agrietado: ['Cursed Glass', '×{n} Mult, but 1 time in {cada} the card shatters.'],
};
const ESTADOS: Record<keyof TowerFx, [string, string]> = {
  fractura: ['Breach', 'The next hit against this throne deals ×{n} Mult.'],
  sobrecarga: ['Disarmed ×1', 'This throne skips its next Counterattack.'],
  apuntalado: ['On Guard', '×{n} Mult on the first hit against this guard.'],
};
const PALOS: Record<Suit, [string, string]> = { S: ['SPADES', 'Spades'], D: ['DIAMONDS', 'Diamonds'], H: ['HEARTS', 'Hearts'], C: ['CLUBS', 'Clubs'] };

const GUIA: Record<string, [string, string]> = {
  palo: ['The Power of a Suit', 'Play the <b>6♣</b> against SPADES: ♣ give you Shield.'],
  inmune: ['Immune Throne', 'Your ♥ do nothing to HEARTS: <b>8♥</b> to CLUBS.'],
  manga: ['Up the Sleeve', 'Keep the <b>9♦</b> Up the Sleeve for later.'],
  cuenta: ['The Count', 'A pair of <b>7</b>s to DIAMONDS: Damage × Mult = Hit.'],
  exacto: ['Exact Hit', 'The <b>9♦</b> from Up the Sleeve to HEARTS: exactly 18.'],
};

/** Texts the rules build on the fly: same keys and `{campo}` as `ES_PLANTILLAS`. */
export const EN_PLANTILLAS: Record<string, string> = {
  'asalto.infinito.nombre': 'Endless Throne {n}',
  'logro.desbloquea.carta': 'Legendary card: {nombre}',
  'causa.quedaba.1': 'You had {n} Health left',
  'causa.quedaba.n': 'You had {n} Health left',
  'causa.lista.2': '{a} and {b}',
  'causa.lista.mas': '{a}, {b} and more',
  'causa.desde': '{palo} Counterattack',
  'causa.desde.sin': 'Counterattack',
  'causa.falta.1': 'You needed {n} more Shield (♣)',
  'causa.falta.n': 'You needed {n} more Shield (♣)',
  'causa.sirena.titulo': '{desde}: Attack {ataque} against Shield {frena} → {entra} got through',
  'causa.sirena.titulo.sin': '{desde}: Attack {ataque} and no Shield → {entra} got through',
  'causa.sirena.detalle.otra': 'It was Counterattack no. {k} this turn. {queda}. {falta} or an Exact Hit.',
  'causa.sirena.detalle': '{queda}. {falta}; an Exact Hit would have stopped it too.',
  'causa.colapso.titulo': 'Deck ran out: you lose {n} Health; Shield does not stop it',
  'causa.colapso.detalle': '{queda}. Each time the Deck runs out you lose 1 more: count the Deck before drawing.',
  'causa.herida.propia': 'Self-inflicted wound',
  'causa.herida.titulo': '{quien}: your own hit cost you {n} Health',
  'causa.herida.detalle': '{queda}. Shield does not stop what your hit costs: heal (♥) before you gamble.',
  'causa.sin_cartas.titulo': 'No cards: no hand, no Deck, no Discard to go on',
  'causa.sin_cartas.detalle': '{queda}, but there is nothing to hit with: what is spent or destroyed never comes back.',
  'aviso.mazo.0': 'the Deck is empty',
  'aviso.mazo.1': '1 card is left in the Deck',
  'aviso.mazo.n': '{n} cards are left in the Deck',
  'aviso.colapso.titulo': 'Last turn: {mazo} and running it out takes {n} Health',
  'aviso.colapso.detalle.1': 'You have {vida} left and Shield does not stop an empty Deck: heal (♥) now or win the assault before drawing.',
  'aviso.colapso.detalle.n': 'You have {vida} left and Shield does not stop an empty Deck: heal (♥) now or win the assault before drawing.',
  'aviso.sirena.titulo': 'Last turn: the {palo} Counterattack (⚔ {ataque}) can finish you',
  'aviso.sirena.escudo': '{n} Shield',
  'aviso.sirena.escudo.sin': 'no Shield',
  'aviso.sirena.detalle.1': 'You have {vida} Health and {escudo}. Raise your Shield (♣), heal (♥), disarm that throne or land an Exact Hit.',
  'aviso.sirena.detalle.n': 'You have {vida} Health and {escudo}. Raise your Shield (♣), heal (♥), disarm that throne or land an Exact Hit.',
  'paso.racha': 'Streak',
  'paso.carga': 'Stored',
  'paso.asedio': 'Final Siege',
  'paso.inmune': 'immune',
  'paso.eco': 'echo',
  'paso.vecinos': '{n} to the neighboring thrones',
  'paso.oro_si_cae': '+{n} gold if a guard falls',
  'paso.robas': 'you draw {n}',
  'paso.pierdes': 'you lose {n} Health',
  'paso.escudo': '+{n} Shield',
  'paso.vida': '+{n} Health',
  'paso.oro': '+{n} gold',
  'paso.carga_dano': '+{n} stored Damage',
  'paso.golpea': '{n} to {palo}',
  'paso.golpea.por': '{por} = {n} to {palo}',
  'paso.frenado': '{f} × {n} stopped',
  'paso.destruye': 'destroys {carta}',
  'paso.crece': 'grows',
  'paso.corta': 'cuts the next guard',
  'paso.salpica': 'half splashes',
  'paso.rebosa_escudo': '{n} overflow Shield ÷ {d} = heals {c}',
  'paso.rebosa_cura': '{n} overflow healing × {d} = +{c} stored Damage',
  'error.jugadores': 'From 1 to 4 players.',
  'error.repetidas': 'Repeated cards.',
  'error.no_en_mano': 'That card is not in your hand.',
  'error.terminada': 'The game is already over.',
  'error.no_turno': 'It is not your turn.',
  'error.manga_usada': 'You already used Up the Sleeve this turn.',
  'error.sin_manga': 'There is no Up the Sleeve in this assault.',
  'error.formacion': 'Invalid formation: single card, group, two pair, full house, four of a kind, straight or flush.',
  'error.trono_caido': 'That throne has already fallen.',
  'error.descartar': 'Choose at least one card to discard.',
  'error.no_comodin': 'That card is not a Joker.',
  'error.pasar': 'You can only pass with an empty hand.',
  'error.accion': 'Unknown action.',
  'error.rebobinar': 'You have no Rewinds left.',
  'error.orden': 'That order is not valid.',
  'error.pendientes': 'Choose the pending cards first.',
  'error.empezada': 'The campaign has already begun.',
  'error.no_mapa': 'You are not on the Castle Map.',
  'error.ruta': 'That route does not exist.',
  'error.sin_atajo': 'This assault has no Shortcut.',
  'error.sin_seleccion': 'There is no pending pick.',
  'error.no_en_seleccion': 'That card is not in the pick.',
  'error.sin_botin': 'There are no Spoils to choose.',
  'error.no_en_botin': 'That relic is not in the Spoils.',
  'error.caben': 'Only {n} relics fit.',
  'error.caben.vende': 'Only {n} relics fit. Sell one first.',
  'error.oferta': 'That offer is gone.',
  'error.sobre_abierto': 'Choose a card from the open pack first.',
  'error.oro': 'You cannot afford it.',
  'error.sin_sellar': 'You have no cards to seal.',
  'error.sin_sobre': 'There is no open pack.',
  'error.no_en_sobre': 'That card is not in the pack.',
  'error.nada_pendiente': 'Nothing is pending.',
  'error.hoguera': 'Cards only burn in the Bonfire of the Tavern.',
  'error.mazo_minimo': 'The deck cannot drop below {n} cards.',
  'error.no_en_mazo': 'That card is not in the deck.',
  'error.solo_taberna': 'Only in the Tavern.',
  'error.vida_llena': 'Your Health is already full.',
  'error.no_vender': 'No selling in the middle of an assault.',
  'error.no_llevas': 'You do not carry that relic.',
  'error.no_seguir': 'You cannot move on yet.',
  'error.sin_secreto': 'There is no Crypt Secret.',
  'error.opcion': 'That option does not exist.',
  'error.no_ahora': 'You cannot choose that right now.',
  'error.infinito': 'The Endless Throne opens when you win the campaign.',
  'error.eleccion': 'Invalid choice.',
  'error.elige_baraja': 'Choose a deck card.',
  'error.elige_una': 'Choose a card.',
  'error.elige_dos': 'Choose two deck cards.',
};

/** «The Usurer» → «Usurer»: the trophy names fit in 24 characters. */
const sinArticulo = (who: string) => who.replace(/^The /, '');
/** «The Usurer» → «the Usurer», in the middle of a sentence. */
const enFrase = (who: string) => who.replace(/^The /, 'the ');

/** Rule texts in English, by stable key. A piece without its English entry is left out (the parity test catches it). */
export function reglasEn(): Record<string, string> {
  const o: Record<string, string> = {};
  const nombreReliquia = (id: string) => RELIQUIAS[id]?.[0] ?? '';
  for (const t of TOOLS) {
    const r = RELIQUIAS[t.id];
    if (!r) continue;
    o[`reliquia.${t.id}.nombre`] = r[0];
    o[`reliquia.${t.id}.desc`] = f(r[1], cifrasReliquia(t.id));
  }
  for (const [r, v] of Object.entries(RAREZAS)) o[`rareza.${r}`] = v;
  for (const [a, v] of Object.entries(ARQUETIPOS)) o[`arquetipo.${a}`] = v;
  for (const s of SPECIALS) {
    const e = ESPECIALES[s.id];
    if (!e) continue;
    o[`especial.${s.id}.nombre`] = e[0];
    o[`especial.${s.id}.desc`] = f(e[1], cifrasEspecial(s.id));
  }
  for (const b of BOSSES) {
    const m = MONARCAS[b.id];
    if (!m) continue;
    const n = cifrasMonarca(b.id);
    o[`monarca.${b.id}.nombre`] = m.nombre;
    o[`monarca.${b.id}.decreto`] = m.decreto;
    o[`monarca.${b.id}.desc`] = f(m.desc, n);
    o[`monarca.${b.id}.badge`] = f(m.badge, n);
    o[`monarca.${b.id}.bark.entrada`] = m.entrada;
    o[`monarca.${b.id}.bark.contraataque`] = m.contraataque;
    o[`monarca.${b.id}.bark.caida`] = m.caida;
  }
  STAGES.forEach((_, i) => ASALTOS[i] && (o[`asalto.${i + 1}.nombre`] = ASALTOS[i]));
  const nr = cifrasReinado();
  ASCENSIONS.forEach((_, i) => {
    const r = REINADOS[i];
    if (!r) return;
    o[`reinado.${i + 1}.nombre`] = r[0];
    o[`reinado.${i + 1}.desc`] = f(r[1], nr);
  });
  for (const d of DECKS) {
    const b = BARAJAS[d.id];
    if (!b) continue;
    o[`baraja.${d.id}.nombre`] = b[0];
    o[`baraja.${d.id}.desc`] = f(b[1], cifrasBaraja(d.id));
  }
  for (const c of CONTRACTS) {
    const j = JURAMENTOS[c.id];
    if (!j) continue;
    o[`juramento.${c.id}.nombre`] = j[0];
    o[`juramento.${c.id}.desc`] = j[1];
    o[`juramento.${c.id}.premio`] = j[2];
  }
  for (const t of TAGS) {
    const a = ATAJOS[t.id];
    if (!a) continue;
    o[`atajo.${t.id}.nombre`] = a[0];
    o[`atajo.${t.id}.desc`] = a[1];
  }
  for (const e of EVENTS) {
    const s = SECRETOS[e.id];
    if (!s) continue;
    o[`secreto.${e.id}.nombre`] = s.nombre;
    o[`secreto.${e.id}.texto`] = s.texto;
    s.opciones.forEach((op, i) => {
      o[`secreto.${e.id}.${i}.etiqueta`] = op.etiqueta;
      o[`secreto.${e.id}.${i}.desc`] = op.desc;
      o[`secreto.${e.id}.${i}.gana`] = op.gana;
      if (op.cuesta) o[`secreto.${e.id}.${i}.cuesta`] = op.cuesta;
    });
  }
  for (const u of UPGRADES) {
    const m = MEJORAS[u.id];
    if (!m) continue;
    o[`mejora.${u.id}.nombre`] = m[0];
    if (u.id.startsWith('caja_')) {
      const arch = u.id.slice('caja_'.length);
      o[`mejora.${u.id}.desc`] = `Adds to the pool: ${TOOLS.filter((t) => t.box === arch).map((t) => nombreReliquia(t.id)).join(', ')}.`;
    } else if (m[1]) o[`mejora.${u.id}.desc`] = f(m[1], { oro: BALANCE.orden.oroPorNivel });
  }
  for (const a of ACHIEVEMENTS) {
    const boss = a.id.startsWith('j-') ? MONARCAS[a.id.slice(2)] : undefined;
    if (boss) {
      o[`logro.${a.id}.nombre`] = `Trophy: ${sinArticulo(boss.nombre)}`;
      o[`logro.${a.id}.desc`] = `Defeat ${enFrase(boss.nombre)} (${boss.decreto.toLowerCase()}).`;
    } else if (LOGROS[a.id]) {
      o[`logro.${a.id}.nombre`] = LOGROS[a.id][0];
      o[`logro.${a.id}.desc`] = f(LOGROS[a.id][1], CIFRAS_LOGRO[a.id]);
    }
    // lo que desbloquea: una baraja o una carta legendaria
    const deck = DECKS.find((d) => d.unlock === a.id);
    const card = SPECIALS.find((s) => s.locked === a.id);
    if (deck && BARAJAS[deck.id]) o[`logro.${a.id}.desbloquea`] = BARAJAS[deck.id][0];
    else if (card && ESPECIALES[card.id]) o[`logro.${a.id}.desbloquea`] = f(EN_PLANTILLAS['logro.desbloquea.carta'], { nombre: ESPECIALES[card.id][0] });
  }
  for (const [id, [nombre, desc]] of Object.entries(PALABRAS)) {
    o[`palabra.${id}.nombre`] = nombre;
    o[`palabra.${id}.desc`] = desc;
  }
  for (const [id, v] of Object.entries(FORMACIONES)) o[`formacion.${id}`] = v;
  for (const [id, [nombre, desc]] of Object.entries(SELLOS)) {
    o[`sello.${id}.nombre`] = nombre;
    o[`sello.${id}.desc`] = f(desc, id === 'jornal' ? CIFRAS_MESA.jornal : {});
  }
  for (const [id, [nombre, desc]] of Object.entries(ACABADOS)) {
    o[`acabado.${id}.nombre`] = nombre;
    o[`acabado.${id}.desc`] = f(desc, CIFRAS_MESA[id as Treatment]);
  }
  for (const [id, [nombre, desc]] of Object.entries(ESTADOS)) {
    o[`estado.${id}.nombre`] = nombre;
    o[`estado.${id}.desc`] = f(desc, (CIFRAS_MESA as Record<string, Record<string, number>>)[id] ?? {});
  }
  for (const [s, [mayus, nombre]] of Object.entries(PALOS)) {
    o[`palo.${s}`] = mayus;
    o[`palo.${s}.nombre`] = nombre;
  }
  const C = BALANCE.cobro;
  o['cuenta.asalto'] = 'Assault won';
  o['cuenta.exactos'] = 'Exact Hits';
  o['cuenta.vida'] = f('Health left (1 for every {n})', { n: C.vidaCada });
  o['cuenta.interes'] = f('Interest (1 for every {n} gold)', { n: C.interesCada });
  for (const [id, [titulo, linea]] of Object.entries(GUIA)) {
    o[`guia.${id}.titulo`] = titulo;
    o[`guia.${id}.linea`] = linea;
  }
  o['guia.jugador'] = 'YOU';
  return { ...o, ...EN_PLANTILLAS };
}

/** The full English dictionary: screen + rules. */
export const EN: Record<string, string> = { ...EN_UI, ...reglasEn() };
