// English dictionary (V10). Same keys as es.ts. Two parts:
//   · `EN_UI`: screen texts (`ui.*`), typed against the Spanish keys: a missing key does not compile.
//     Written by arte-ui and juice-ux.
//   · `reglasEn()`: rule texts, hand-written with the glossary of SPECS/V10.md (1.3). Descriptions with
//     figures are `{campo}` templates filled with `fillFor('en', …)` and the very same numbers of `BALANCE`,
//     so the English figure can never drift from the engine. tests/i18n.test.ts checks every key.
//
// Proper names (amulets, tricks, monarchs, assaults, Reigns, decks, Oaths, Shortcuts, Secrets, upgrades,
// achievements): dark court, conspiracy, card table; never gore, never a name from another commercial game;
// each one 24 characters at most.
import { ACHIEVEMENTS, TOOL_GOAL } from '../../rules/achievements';
import { BALANCE, fillFor } from '../../rules/balance-config';
import { CIFRAS_MESA, cifrasBaraja, cifrasPalabra, cifrasEspecial, cifrasMonarca, cifrasReinado, cifrasReliquia } from '../../rules/cifras';
import type { Formation, Seal, Suit, Treatment, TowerFx } from '../../rules/engine';
import { ASCENSIONS, BOSSES, DECKS, EVENTS, STAGES, UPGRADES } from '../../rules/run';
import { cifraDe } from '../../rules/arbol';
import { BASE_POOL, SPECIALS } from '../../rules/specials';
import { TOOL_SLOTS, TOOLS } from '../../rules/tools';
import { BENDICIONES, REY_IDS } from '../../rules/reyes';
import type { Relacion, ReyId } from '../../rules/reyes';
import { CIFRAS_REGLA, REGLAS } from '../../rules/mazos';
import type { Arch, Rarity } from '../../rules/tools';
import { ES_UI, type ClaveUi } from './es';
import { columna } from './ui-arte';
import { columnaJuice } from './ui-juice';

/** Screen texts. Same keys as `ES_UI`. */
export const EN_UI: Record<ClaveUi, string> = { ...columna(1), ...columnaJuice(1) } satisfies Record<keyof typeof ES_UI, string>;

const f = (tpl: string, v: Record<string, number | string> = {}) => fillFor('en', tpl, v);

/** V40 1d · Amulets: [name, description template]. */
const RELIQUIAS: Record<string, [string, string]> = {
  piqueta: ['Gaucho Knife', '+{dano} Damage for each Swords card in the hit.'],
  cincel: ['Penknife', '+{dano} Damage if you play a single card.'],
  calibre: ['Whetstone', 'Exact Hit with leeway: going up to {margen} over the guard’s Health is still exact.'],
  cizalla: ['Shearing Shears', 'After an Exact Hit, the next guard loses half its Health.'],
  plano_maestro: ['Silver Knife', 'Felling a guard with a single hit of {cartas} cards or fewer counts as an Exact Hit.'],
  maza: ['Riding Whip', '+{dano} Damage for each Clubs card in the hit.'],
  sacos: ['Saddle Guard', 'Each Clubs card gives +{escudo} more Shield, and the Shield cap rises by {tope}.'],
  encofrado: ['Poncho', 'Each guard defeated: +{escudo} Shield.'],
  contragolpe: ['Quirt', 'If Shield fully stops a Counterattack, that guard takes {factor} × the amount stopped.'],
  sordina: ['Bolas', 'The Attack of every guard drops by {ataque}.'],
  cortavidrios: ['Fake Coin', '+{dano} Damage for each Coins card in the hit.'],
  hucha: ['Piggy Bank', '+{oro} gold at the close of each assault you win.'],
  gemelos: ['Marked Deck', '+{multi} Mult with a group, two pair, full house or four of a kind.'],
  piquete: ['Bluff', 'Each Joker you play: +{oro} gold and you draw {cartas} cards.'],
  dados: ['Dice Cup', 'Each turn a die is rolled: on {cara} or more, +{multi} Mult.'],
  dinamita: ['Skyrocket', 'Each guard defeated: the other thrones take {dano}.'],
  paleta: ['Cured Mate', '+{dano} Damage for each Cups card in the hit.'],
  botiquin: ['Wineskin', 'Each Cups card heals +{vida} more.'],
  casco: ['Barbecue', 'Each guard defeated: +{vida} Health.'],
  cinta: ['Guitar', '+{multi} Mult with a straight or straight flush.'],
  ultimo: ['Last Drink', '×{multi} Mult if your Health is at 50 % or less.'],
  andamio: ['Espadrilles', '+{cartas} card in your hand.'],
};

const RAREZAS: Record<Rarity, string> = { comun: 'Common', oficio: 'Rare', capataz: 'Noble', reliquia: 'Royal' };
const ARQUETIPOS: Record<Arch, string> = { espadas: 'Swords', bastos: 'Clubs', oros: 'Coins', copas: 'Cups' };

/** V40 1d · The Jester's Tricks (special cards): [name, description template]. */
const ESPECIALES: Record<string, [string, string]> = {
  gemelo: ['Swindle', 'Every card in the hit is worth as much as the highest number.'],
  mordaza: ['Trip', 'No Counterattack this turn.'],
  nitro: ['Dirty Deal', '×{strikeMult} Mult, but you lose {hurt} Health.'],
  sierra: ['Disguise', 'This hit ignores Immune: your cards deal their Damage against anyone.'],
  grua: ['Sleight', 'You draw {draw} more cards this turn.'],
  pico: ['Kickback', 'If the hit defeats a guard, +{goldOnKill} gold.'],
  barreno: ['Hidden Dagger', 'The hit Pierces and adds +{flat} Damage.'],
  bola: ['Raise!', '+{multi} Mult.'],
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
 * V40 1c · The 4 Kings as bosses. Their table talk keeps the Spanish card-duel swagger (envido, truco, retruco)
 * through the betting of a card table: bet, call, raise, all in, bluff. No figures and no rule words.
 */
const MONARCAS: Record<string, MonarcaEn> = {
  espadas: {
    nombre: 'The King of Swords',
    decreto: "King's Edge",
    desc: 'While he leads, his Counterattack goes through {perfora} of your Shield.',
    badge: 'Goes through {perfora} Shield',
    entrada: 'Draw, if your hand is steady. I call truco with my sword.',
    contraataque: 'I raise! And I sign it with the point of my blade.',
    caida: 'You won the hand... keep that edge, it used to be mine.',
  },
  bastos: {
    nombre: 'The King of Clubs',
    decreto: 'Oak Bark',
    desc: 'While he leads, he is never Exposed nor Stunned.',
    badge: 'Never Exposed nor Stunned',
    entrada: 'I am hardwood, kid. Not even a bluff gets in here.',
    contraataque: 'An old-school clubbing. Shall we raise to four?',
    caida: 'You split my club... I never knew it was all splinters.',
  },
  oros: {
    nombre: 'The King of Coins',
    decreto: 'Tithe',
    desc: 'While he leads, he rolls a die each turn: his Counterattack adds +1 to +{dado}.',
    badge: 'A die of +1 to +{dado}',
    entrada: 'Everything has a price at my table, even your luck. Bet?',
    contraataque: 'The house always collects, dear. Tonight I am the house.',
    caida: 'You emptied my chest... take the trump card, it is over.',
  },
  copas: {
    nombre: 'The King of Cups',
    decreto: "King's Toast",
    desc: 'Each turn he stays in the lead, he heals {cura} Health.',
    badge: 'Heals {cura} per turn',
    entrada: 'Come in, sit down. The first round is always on me.',
    contraataque: 'Not toasting with me? Then take this, to your health.',
    caida: 'My cup spilled all over the felt... what a dry ending.',
  },
};

const ASALTOS = ['The Drawbridge', 'The Training Yard', 'The Crypt', 'The Royal Gallery', 'The Throne Room'];

const REINADOS: [string, string][] = [
  ['Reign of Peace', 'The usual rules.'],
  ['Fine Armor', 'Every guard has {pct} % more Health.'],
  ['Wrathful Court', 'Each Deck run-out raises the Fury {furia} more.'],
  ['Armored Kings', 'In assaults with a monarch, Kings have {reyes} % more Health.'],
  ['Wrathful King', "Kings' Attack rises by {rey}."],
  ['Old Wounds', 'Your max Health drops by {heridas}.'],
  ['Night Watch', "Knaves' and Knights' Attack rises by {noche}."],
  ['Sealed Gates', 'In {asaltos}, the Attack of all four thrones rises by {clausura}.'],
];

/** V40 · The 5 Decks: [name, motto, description template]. */
const BARAJAS: Record<string, [string, string, string]> = {
  escoba: ['Escoba', 'Clean sweep', 'Hand of {mano}. If the hit adds up to 15, Sweep!: +{multi} Mult and a Damage charge.'],
  truco: ['Truco', 'Envido and bravos', '1 to 7, hand of {mano} and {vida} Health. Bravos hit harder; 2 of one suit call Envido.'],
  chinchon: ['Chinchón', 'Sets and runs', 'Sets and suited runs hit harder; long hands store Damage. You start with {vida} Health.'],
  mentiroso: ['The Liar', 'Poker face', 'Hand of {mano}, {n} Jokers that do not spend the turn and one Bluff per assault. {vida} Health.'],
  chancho: ['Chancho Va', 'Pass it on', 'Hand of {mano} and {vida} Health. Pass 1 card per turn and draw another; four of a kind stuns in a chain.'],
};

/** V40 · The rules of the 5 Decks: [name, description template]. Figures from CIFRAS_REGLA (mazos.ts). */
const REGLAS_EN: Record<string, [string, string]> = {
  bravo: ['Bravo', 'Bravos add Damage: 1 of Swords +{s1}, 1 of Clubs +{c1}, 7 of Swords +{s7} and 7 of Coins +{d7}.'],
  envido: ['Envido', 'A hit of 2 cards of the same suit (it counts as a play): +{n} Damage.'],
  escoba: ['Sweep!', 'If the cards add up to 15 (it counts as a play): +{multi} Mult and +{carga} Damage per Sweep already made.'],
  pierna: ['Set', 'A group of 3 equal cards: +{n} Mult.'],
  escalera: ['Suited Run', 'A straight flush: +{n} Damage.'],
  larga: ['Long Hand', 'A hit of {cartas} cards or more: −{alivio} to the Counterattack, and +{carga} Damage for good to those long hands.'],
  piedra: ['Poker Face', "Playing a Joker does not spend the turn: that guard's Counterattack misses and your next hit gets +{n} Damage."],
  engano: ['Bluff', 'Once per assault, the hit that would not defeat counts as one suit, one number or ignores Immune.'],
  pasar: ['Pass', 'Once per turn, discarding just 1 card does not spend the turn: you draw another at once.'],
  chancho: ['Chancho', 'Four of a kind (4 equal cards): the next {n} Counterattacks miss.'],
  arranque: ['Quick Start', 'Defeat a guard in the first {turnos} turns of the assault: +{n} Damage to the next hit.'],
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
      { etiqueta: 'Force it open', gana: 'Noble or Royal amulet', cuesta: '−5 Health', desc: 'You lose 5 Health. You take a Noble or Royal amulet.' },
      { etiqueta: 'Sell it to the Storekeeper', gana: '+8 gold', desc: '+8 gold.' },
    ],
  },
  horno: {
    nombre: "The Alchemist's Cauldron",
    texto: 'A cauldron boils on its own in a corner. Whatever goes in comes out as something else.',
    opciones: [
      { etiqueta: 'Melt two cards', gana: 'Card in Prismatic Wax', cuesta: 'Two cards burn', desc: 'Pick two: they burn and one is born with the higher number, in Prismatic Wax, keeping their seals.' },
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
      { etiqueta: 'Pay with gold', gana: 'Prismatic best card', cuesta: '−8 gold', desc: '8 gold. Your highest card gets Prismatic Wax.' },
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
  rueda: {
    nombre: 'The Wheel of Fortune',
    texto: 'A cartwheel hangs from the ceiling, painted in four wedges. Someone left the crank in place.',
    opciones: [
      { etiqueta: 'Spin the wheel', gana: 'Gold, Health or amulet', cuesta: '1 in 4: −4 Health', desc: 'A random wedge comes up: +12 gold, +6 Health, a Rare amulet or −4 Health.' },
      { etiqueta: 'Leave it alone', gana: '+3 gold', desc: 'You pick up the coins on the floor: +3 gold.' },
    ],
  },
  doble: {
    nombre: "The Devil's Bones",
    texto: 'A faceless gambler shakes two bones in a cup. He looks at your pouch of shards and smiles.',
    opciones: [
      { etiqueta: 'Double or nothing', gana: 'Shards ×2', cuesta: '1 in 2: you lose them', desc: 'You stake the shards of this campaign: 1 time in 2 they double; otherwise you lose them.' },
      { etiqueta: 'Keep the pouch', gana: 'Nothing changes', desc: 'Nothing changes.' },
    ],
  },
  altar: {
    nombre: 'The Altar of Blood',
    texto: 'An altar with four crowns. The bowl in the middle asks for something of yours before giving anything.',
    opciones: [
      { etiqueta: 'Offer your blood', gana: 'Blessing of your King', cuesta: '−3 Max Health', desc: 'You lose 3 Max Health for good. The King you carry the most Blessings of gives you another.' },
      { etiqueta: 'Pray and move on', gana: '+3 Health', desc: '+3 Health.' },
    ],
  },
  dado: {
    nombre: 'The Two-Faced Die',
    texto: 'On a flagstone lies a bone die: three white faces, three black. It can only be rolled once.',
    opciones: [
      { etiqueta: 'Roll it', gana: '2 formations +1 level', cuesta: '1 in 2: +1 Attack', desc: 'White: 2 formations go up 1 level. Black: +10 gold and +1 Attack in the next assault.' },
      { etiqueta: 'Leave it be', gana: '+2 Health', desc: '+2 Health.' },
    ],
  },
};

/** V40 1c · The 4 Kings: name, suit, level bonuses with 2 and 4 pieces (figures from `niveles`) and boss lines. */
const REYES_EN: Record<ReyId, { nombre: string; palo: string; bonos: [string, string]; frases: Record<Relacion, string> }> = {
  espadas: {
    nombre: 'King of Swords',
    palo: 'Swords',
    bonos: ['A guard falls to an Exact Hit even if you fall short or go over by {tol} or less.', 'Your hits with 2 Swords cards or more deal ×{x} Mult.'],
    frases: {
      aliado: 'You carry my edge and still dare to cross it with mine. I like that.',
      rival: 'You chose other kings? My sword never forgets a snub.',
      neutral: 'Blessed by no one. Brave or foolish: the first cut will tell.',
    },
  },
  bastos: {
    nombre: 'King of Clubs',
    palo: 'Clubs',
    bonos: ['You start every assault with {escudo} Shield.', 'Your Shield cap rises by {tope}.'],
    frases: {
      aliado: 'My club covered you all the way. Now see if it holds against me.',
      rival: 'You scorned my club for jewels and cups. You will feel the wood.',
      neutral: 'You arrive with nothing to shelter you. The woods spare no one.',
    },
  },
  oros: {
    nombre: 'King of Coins',
    palo: 'Coins',
    bonos: ['Each turn a die is rolled: on a {cara}, that turn’s Counterattack does not land.', 'On a {cara4} or more it does not land, and +{oro} gold at the close of each assault won.'],
    frases: {
      aliado: 'I lent you my luck; now I have come to collect, with interest.',
      rival: 'You turned your back on my gold. A miser at heart, that is you.',
      neutral: 'Not a coin from anyone. Such poverty, dear. I pity you.',
    },
  },
  copas: {
    nombre: 'King of Cups',
    palo: 'Cups',
    bonos: ['Each guard you defeat with Cups heals you {vida}.', 'Each guard defeated heals you {vida}, with or without Cups in the hit.'],
    frases: {
      aliado: 'We toasted together, remember? This last drink is on me.',
      rival: 'You refused my cup and drank from others. Such a snub, such thirst.',
      neutral: 'No one poured you a drink. Sit down, this round is on me.',
    },
  },
};

/** V40 1c · The Blessings: [name, effect, charge condition] (figures from `bendiciones`). */
const BENDICIONES_EN: Record<string, [string, string, string]> = {
  filo: ['Tempered Edge', '+{dano} Damage for each Swords card in the hit.', 'Each Exact Hit: +{carga} Damage on all your hits.'],
  estocada: ['Thrust', 'A hit with a single card: +{dano} Damage.', 'Each guard you defeat with a single card: +{carga} Damage on those hits.'],
  tajo: ['Deep Cut', 'All your hits pierce, with or without Swords.', 'Each hit that defeats 2 guards or more: +{carga} Damage on all your hits.'],
  duelo: ['First Blood', '+{dano} Damage on the first hit against each guard.', 'Each guard that falls to a single hit: +{carga} Damage on those first hits.'],
  remate: ['Finishing Blow', 'A guard left at {pct} % of its Health or less falls.', 'Each guard finished off this way: +{carga} Damage on all your hits.'],
  garrote: ['Cudgel', 'Your hits with Clubs give +{escudo} Shield.', 'Each Counterattack your Shield fully stops: +{carga} Shield at the start of each assault.'],
  empalizada: ['Palisade', 'The Shield cap rises by {tope}.', 'Each hit that gives you {n} Shield or more: +{carga} Shield at the start of each assault.'],
  replica: ['Riposte', 'If your Shield fully stops a Counterattack, that guard takes {dano}.', 'Each riposte: +{carga} Damage on the riposte.'],
  porra: ['Blow for Blow', '+{dano} Damage for each point of Shield standing.', 'Each Counterattack your Shield fully stops: +{carga} Damage on all your hits.'],
  aguante: ['Endurance', 'You start each assault with {escudo} Shield.', 'Each guard you defeat with Shield standing: +{carga} Damage on your hits with Clubs.'],
  moneda: ['Gold Coin', 'Each guard defeated: +{oro} gold.', 'Each hit with {cartas} Coins cards or more: +{carga} gold at the close of each assault.'],
  lluvia: ['Golden Rain', 'Each Coins card splashes +{dano} more to the other thrones.', 'Each guard that falls to a splash: +{carga} splash on all your hits.'],
  taba: ['Loaded Knucklebone', 'Each turn a die is rolled: your hit adds {x} × the die in Damage.', 'Each 6 on the die in a hit: +{carga} Damage on all your hits.'],
  arcon: ["King's Coffer", 'Now, +{oro} gold, and the interest cap rises by {interes}.', 'Each Exact Hit: +{carga} gold at the close of each assault.'],
  envite: ['Raise', '+{multi} Mult if the hit mixes 3 suits or more.', 'Each guard you defeat with 3 suits or more: +{carga} Damage on those hits.'],
  brindis: ['Toast', 'Your hits with Cups heal +{vida} more.', 'Each hit that heals you {n} or more: +{carga} Health at the close of each assault.'],
  porron: ['Wine Jug', 'Now, +{vida} Max Health (and Health).', 'Each guard you defeat with Cups: +{carga} Damage on your hits with Cups.'],
  ronda: ['Another Round', 'Each guard you defeat with Cups: you draw {cartas} card.', 'Each hit with {n} cards or more: +{carga} Health at the close of each assault.'],
  caliz: ['Brimming Chalice', 'Healing that does not fit: +{dano} Damage per point on your next hit.', 'Each hit that overheals: +{carga} Damage on all your hits.'],
  sobremesa: ['After Dinner', 'At the close of each assault won, you heal {vida} Health.', 'Each guard you defeat at full Health: +{carga} Damage on all your hits.'],
  hoja: ['Blade and Buckler', 'Each Exact Hit: +{escudo} Shield.', 'Each Counterattack your Shield fully stops: +{carga} Damage on all your hits.'],
  filodorado: ['Gilded Edge', 'Each Exact Hit: the other thrones take {dano}.', 'Each guard that falls to a splash: +{carga} Damage on all your hits.'],
  sangria: ['Bloodletting', 'Each Exact Hit heals you {vida}.', 'Each Exact Hit at full Health: +{carga} Damage on all your hits.'],
  peaje: ['Toll', 'Each Counterattack your Shield fully stops: +{oro} gold.', 'Each guard you defeat with Clubs and Coins: +{carga} Shield at the start of each assault.'],
  fogon: ['Hearth', 'Shield that does not fit heals you: every {escudo} extra, 1 Health.', 'Each guard you defeat with Clubs and Cups: +{carga} Health at the close of each assault.'],
  convite: ['Banquet', 'Each hit with Coins and Cups: +{oro} gold and you heal {vida}.', 'Each guard you defeat with Coins and Cups: +{carga} Damage on all your hits.'],
};

/** V40 1c · What the Jester says when a Blessing offer opens: tempting, never clear whether it helps. */
const BUFON_BENDICION_EN: string[] = [
  'The crowns are smiling at you. Pick one... the ones you leave never forget.',
  "A king's gift is never free, but I am not the one who will charge you.",
  'That one? Good hand. Or not. You will know when the King looks at you.',
  'Accept, accept. The court remembers whoever says no to a King.',
  'The more of one King you carry, the more he loves you. And the more it hurts if you switch.',
];

/** Upgrades of the Order. The chests list the amulets they add (with their English names). */
/**
 * Nodes of the Conspiracy Tree (V12): [name, description or template]. A template has `{campo}` and is filled
 * with `cifraDe(id, rango)`: rank 1 for `mejora.<id>.desc`, and kept as `mejora.<id>.plantilla` for the screen.
 * The four chests (one per King) are built from their amulets.
 */
const MEJORAS: Record<string, [string, string?]> = {
  caja_espadas: ['Chest of Swords'],
  caja_bastos: ['Chest of Clubs'],
  caja_oros: ['Chest of Coins'],
  caja_copas: ['Chest of Cups'],
  tampones: ['New Seals', 'The Wax Table also offers the powder and sleeve seals.'],
  bronce: ['Crown Jeweler', 'The Wax Table also offers Prismatic Wax and Cursed Glass.'],
  vale: ["Keeper's Favor", 'One free Refresh Table at each General Store, per level.'],
  tienda: ['Wide Sash', 'Per level: +1 amulet slot (from 4 to 6).'],
  caja: ['Conspiracy Purse', '+{oro} starting gold per rank.'],
  rutas: ['Cartographer', 'At the Campfire, Heal and Purge at once.'],
  tasador: ["Appraiser's Eye", 'Amulets at the General Store cost {n} gold less (minimum 1).'],
  manga: ['Deep Sleeve', 'On the Endless Throne, the Sleeve holds 2 cards instead of 1.'],
  gracia: ['Keen Eye', 'On the Endless Throne, Exact Hit also counts if you go over by {n} or less.'],
  piedra_iman: ['Lodestone', 'The magnet reaches {pct}% farther and collects {s} s sooner.'],
  esq_golpe: ['Crown Splinters', '+{n} shards for each strike.'],
  esq_guardia: ["Guard's Tithe", '+{n} shards for each guard defeated.'],
  esq_exacto: ['Clean Cut', '+{n} shards for each Exact Hit.'],
  esq_monarca: ["King's Ransom", '+{n} shards for each monarch defeated.'],
  esq_derrota: ['Ashes of the Fallen', 'When you lose, +{n} shards for each guard you defeated.'],
  esq_formacion: ['Full Hand', '+{n} shards for each strike of 3 cards or more.'],
  esq_racha: ['Blood Streak', '+{n} shards for each Streak link when you strike.'],
  hueso_tallado: ['Carved Bone', 'Upgrades of +1 to the lowest face of the Crown Die: {n}.'],
  cara_rey: ["King's Face", 'The highest face of the Crown Die is worth ×{n}.'],
  segundo_hueso: ['Second Bone', 'You roll two Crown Dice and their faces multiply.'],
  corona_hierro: ['Iron Crown', 'On the Endless Throne, shards on the table are worth ×{n}.'],
  pendon: ['Black Banner', '+{n} shards for each Endless Throne you clear.'],
  sangre_real: ['Royal Blood', 'On the Endless Throne, each face of the Crown Die rises by {n}.'],
  trono_huesos: ['Bone Throne', 'On the Endless Throne you roll one more Crown Die.'],
};
/** The four branches of the Tree: [name, line]. */
const RAMAS_EN: Record<string, [string, string]> = {
  arsenal: ['The Armory', 'Upgrades that help you win.'],
  bolsa: ['The Purse', 'More shards from every strike.'],
  huesos: ['The Bones', 'Dice that multiply your shards.'],
  corona: ['The Iron Crown', 'More shards and more power on the Endless Throne.'],
};

/** Achievements: [name, description]. The monarch trophies (`j-<id>`) are built from the monarchs. */
const LOGROS: Record<string, [string, string]> = {
  primera: ['First Step', 'Win your first campaign assault.'],
  capataz: ['Farewell, Jailer', 'Clear assault 2.'],
  media: ['Half the Castle', 'Clear assault 3.'],
  madre: ['End of the Reign', 'Win a campaign.'],
  asc3: ['Grand Conspirator', 'Win a campaign on Reign 4 or higher.'],
  abismo: ['Beyond the Throne', 'Clear an Endless Throne.'],
  abismo3: ['Without End', 'Clear three Endless Thrones in one campaign.'],
  doblepar: ['Two and Two', 'Play two pair.'],
  color: ['All One Suit', 'Play a flush.'],
  full: ['Full House', 'Play a full house.'],
  poker: ['Four of a Kind', 'Play four of a kind.'],
  real: ['Royal Straight', 'Play a straight flush of 5 cards or more.'],
  golpe100: ['In One Blow', 'Land a Hit of 100 or more.'],
  golpe500: ['Thunder', 'Land a Hit of 500 or more.'],
  golpe2000: ['Cataclysm', 'Land a Hit of 2000 or more.'],
  limpio10: ['Firm Hand', 'Land 10 Exact Hits.'],
  limpio50: ['Deadeye', 'Land 50 Exact Hits.'],
  pisos100: ['A Hundred Guards', 'Defeat 100 guards.'],
  pisos500: ['Scourge of the Court', 'Defeat 500 guards.'],
  intacto: ['Not a Scratch', 'Finish an assault with full Health.'],
  rico: ['Miser', 'Hold 30 gold at once.'],
  cinturon: ['Full Sash', 'Carry {n} amulets at once.'],
  forja: ['Sealmaker', 'Stamp 10 wax seals or finishes.'],
  contratos: ['Tough Guy', 'Beat 10 Elite Guards.'],
  atajo: ['By the Fire', 'Rest at 3 Campfires.'],
  coleccion: ['Collector', "Get the {n} Jester's Tricks, across all your campaigns."],
  ferretero: ["The Keeper's Regular", 'Carry {n} different amulets, across all your campaigns.'],
  jefes: ['No King Left Standing', 'Defeat all {n} Kings.'],
};
/** Figures of the achievements whose Spanish text is built in achievements.ts. */
const CIFRAS_LOGRO: Record<string, Record<string, number>> = {
  cinturon: { n: TOOL_SLOTS },
  coleccion: { n: BASE_POOL.length },
  ferretero: { n: TOOL_GOAL },
  jefes: { n: BOSSES.length },
};

const PALABRAS: Record<string, [string, string]> = {
  fuerza: ['Damage', 'What your cards add up to: their number, 1 to 9 (Ace: 11). Against the throne of their suit, 0: it is Immune.'],
  resonancia: ['Mult', 'What multiplies Damage: Damage × Mult = Hit. Always a whole number. The formation sets it; amulets and finishes raise it.'],
  limpio: [
    'Exact Hit',
    'Defeating a guard with the exact Hit: no Counterattack, +{oro} gold, draw 1, Momentum (the next one loses {impulso} of its Health) and Streak (+{racha} Mult on the next hit, up to +{tope}).',
  ],
  fractura: ['Exposed', 'Left by a hit of a single suit (2 cards or more). The next hit against that throne deals ×{expuesto} Damage.'],
  desarmada: ['Stunned', 'A Stunned throne skips its next Counterattack. Left by a 3-suit hit, Mutiny (Joker) and The Spy.'],
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
  parpalo: 'Suit Pair',
  quince: 'Fifteen',
};

const SELLOS: Record<Seal, [string, string]> = {
  dinamita: ['Powder Seal', "When it strikes, the thrones beside the target on the table take this card's value."],
  eco: ['Echo Seal', 'Its Damage and its suit power count 2 times.'],
  jornal: ['Royal Gold Seal', '+{oro} gold if the hit defeats a guard.'],
  sindical: ['Sleeve Seal', 'Draw 1 extra card when you play or discard it.'],
};
const ACABADOS: Record<Treatment, [string, string]> = {
  forjado: ['Silver Edge', '+{n} Damage.'],
  templado: ['Tempered', '+{n} Mult.'],
  policromado: ['Prismatic Wax', '×{n} Mult.'],
  agrietado: ['Cursed Glass', '×{n} Mult, but 1 time in {cada} the card shatters.'],
};
const ESTADOS: Record<keyof TowerFx, [string, string]> = {
  fractura: ['Exposed', 'The next hit against this throne deals ×{n} Damage.'],
  sobrecarga: ['Stunned', 'This throne skips its next Counterattack.'],
};
/** V40 · the Spanish deck (glossary «Spanish deck»): S Swords, C Clubs, D Coins, H Cups. */
const PALOS: Record<Suit, [string, string]> = { S: ['SWORDS', 'Swords'], D: ['COINS', 'Coins'], H: ['CUPS', 'Cups'], C: ['CLUBS', 'Clubs'] };
/** V40 · the court figures: 10 Knave (Sota), 11 Knight (Caballo), 12 King (Rey). */
const FIGURAS_EN: Record<number, string> = { 10: 'Knave', 11: 'Knight', 12: 'King' };

/** V40 · the Jester's three lines in the first three hits of the first campaign (src/rules/bufon.ts). */
const BUFON: Record<string, string> = {
  palo: "Check the enemy's suit: your cards of that suit do nothing to it. It is Immune.",
  cuenta: 'The math is simple: Damage × Mult = Hit. Combine cards to raise the Mult.',
  exacto: 'Leave it at exactly zero for an Exact Hit: no Counterattack, and gold for you.',
};

/** Texts the rules build on the fly: same keys and `{campo}` as `ES_PLANTILLAS`. */
export const EN_PLANTILLAS: Record<string, string> = {
  'asalto.infinito.nombre': 'Endless Throne {n}',
  // V40 1d
  'amuletos.aviso': 'The Amulets are here: your {n} old chests were refunded as {esquirlas} ✦.',
  'sinergia.nivel': '★ {palo} [{n}]',
  'sinergia.mazo': '★ For {mazo}',
  'sinergia.acerca': '★ {palo} {k}/{n}',
  // V12
  'cuenta.dado': 'Gold Die ×{n}',
  'suerte.rueda.oro.titulo': 'Golden wedge',
  'suerte.rueda.oro.texto': '+{n} gold.',
  'suerte.rueda.vida.titulo': 'Wedge of life',
  'suerte.rueda.vida.texto': '+{n} Health.',
  'suerte.rueda.reliquia.titulo': 'Treasure wedge',
  'suerte.rueda.reliquia.texto': 'You take “{x}”.',
  'suerte.rueda.lleno.titulo': 'Treasure wedge',
  'suerte.rueda.lleno.texto': 'No room for another amulet: +{n} gold.',
  'suerte.rueda.negro.titulo': 'Black wedge',
  'suerte.rueda.negro.texto': '−{n} Health.',
  'suerte.doble.si.titulo': 'Double',
  'suerte.doble.si.texto': 'Your shards double: {a} → {b} ✦.',
  'suerte.doble.no.titulo': 'Nothing',
  'suerte.doble.no.texto': 'You lose the {a} ✦ of this campaign.',
  'suerte.altar.si.titulo': 'The altar answers',
  'suerte.altar.si.texto': 'The {r} gives you “{x}”: you now carry {n} of his.',
  'suerte.altar.no.titulo': 'The altar is silent',
  'suerte.altar.no.texto': 'The {r} had no Blessings left to give: +{n} gold.',
  'suerte.dado.blanca.titulo': 'White face',
  'suerte.dado.blanca.texto': 'Two formations go up 1 level.',
  'suerte.dado.negra.titulo': 'Black face',
  'suerte.dado.negra.texto': '+{n} gold. In the next assault, the Attack of the guards rises by 1.',
  'arbol.aviso': 'Your {coronas} Crowns are now {esquirlas} Crown Shards. Your {rangos} upgrades remain in the Armory.',
  'logro.desbloquea.carta': 'Legendary card: {nombre}',
  'logro.desbloquea.cartas': 'Legendary cards: {a} and {b}',
  'causa.quedaba.1': 'You had {n} Health left',
  'causa.quedaba.n': 'You had {n} Health left',
  'causa.lista.2': '{a} and {b}',
  'causa.lista.mas': '{a}, {b} and more',
  'causa.desde': '{palo} Counterattack',
  'causa.desde.sin': 'Counterattack',
  'causa.falta.1': 'You needed {n} more Shield (Clubs)',
  'causa.falta.n': 'You needed {n} more Shield (Clubs)',
  'causa.sirena.titulo': '{desde}: Attack {ataque} against Shield {frena} → {entra} got through',
  'causa.sirena.titulo.sin': '{desde}: Attack {ataque} and no Shield → {entra} got through',
  'causa.sirena.detalle.otra': 'It was Counterattack no. {k} this turn. {queda}. {falta} or an Exact Hit.',
  'causa.sirena.detalle': '{queda}. {falta}; an Exact Hit would have stopped it too.',
  'causa.sirena.detalle.asedio': '{queda}. {n} of that Attack was Fury. {falta} or an Exact Hit.',
  'causa.herida.propia': 'Self-inflicted wound',
  'causa.herida.titulo': '{quien}: your own hit cost you {n} Health',
  'causa.herida.detalle': '{queda}. Shield does not stop what your hit costs: heal (Cups) before you gamble.',
  'causa.sin_cartas.titulo': 'No cards: no hand, no Deck, no Discard to go on',
  'causa.sin_cartas.detalle': '{queda}, but there is nothing to hit with: what is spent or destroyed never comes back.',
  'aviso.sirena.titulo': 'Last turn: the {palo} Counterattack (⚔ {ataque}) can finish you',
  'aviso.sirena.escudo': '{n} Shield',
  'aviso.sirena.escudo.sin': 'no Shield',
  'aviso.sirena.detalle.1': 'You have {vida} Health and {escudo}. Raise your Shield (Clubs), heal (Cups), stun that throne or land an Exact Hit.',
  'aviso.sirena.detalle.n': 'You have {vida} Health and {escudo}. Raise your Shield (Clubs), heal (Cups), stun that throne or land an Exact Hit.',
  'paso.racha': 'Streak',
  'paso.carga': 'Stored',
  'paso.expuesto': 'Exposed ×{n}',
  'paso.inmune': 'immune',
  'paso.eco': 'echo',
  'paso.vecinos': '{n} to the neighboring thrones',
  'paso.otros': '{n} to the other thrones',
  'paso.oro_si_cae': '+{n} gold if a guard falls',
  'paso.robas': 'you draw {n}',
  'paso.escudo': '+{n} Shield',
  'paso.vida': '+{n} Health',
  'paso.oro': '+{n} gold',
  'paso.carga_dano': '+{n} stored Damage',
  'paso.golpea': '{n} to {palo}',
  'paso.golpea.por': '{por} = {n} to {palo}',
  // V40 · a card's label in the tally
  'carta.etiqueta': '{n} of {palo}',
  'carta.comodin': 'Joker',
  'paso.frenado': '{f} × {n} stopped',
  'paso.destruye': 'destroys {carta}',
  'paso.crece': 'grows',
  'paso.corta': 'cuts the next guard',
  'paso.rebosa_escudo': '{n} overflow Shield ÷ {d} = heals {c}',
  'paso.rebosa_cura': '{n} overflow healing × {d} = +{c} stored Damage',
  // V40 · the rules of the 5 Decks (engine.ts)
  'paso.engano.inmune': 'ignores Immune',
  'paso.engano.palo': 'as a single suit',
  'paso.engano.numero': 'as a single number',
  'paso.engano.furia': 'Fury rises {n}',
  'paso.alivio': '−{n} to the Counterattack',
  'paso.cadena': 'the next {n} Counterattacks miss',
  'paso.cadena.quedan': '{n} left',
  'paso.carga_mazo': 'charge {n}',
  'paso.se_cura': 'heals {n}',
  'error.jugadores': 'From 1 to 4 players.',
  'error.repetidas': 'Repeated cards.',
  'error.no_en_mano': 'That card is not in your hand.',
  'error.terminada': 'The game is already over.',
  'error.no_turno': 'It is not your turn.',
  'error.manga_usada': 'You already used Up the Sleeve this turn.',
  'error.sin_manga': 'There is no Up the Sleeve in this assault.',
  'error.formacion': 'Invalid formation: single card, group, two pair, full house, four of a kind, straight or flush.',
  'error.trono_caido': 'That throne has already fallen.',
  'error.frente': 'You can only hit the enemy in front of you.',
  'error.descartar': 'Choose at least one card to discard.',
  'error.no_comodin': 'That card is not a Joker.',
  'error.pasar': 'You can only pass with an empty hand.',
  'error.accion': 'Unknown action.',
  'error.rebobinar': 'You have no Rewinds left.',
  'error.pendientes': 'Choose the pending cards first.',
  'error.empezada': 'The campaign has already begun.',
  'error.no_mapa': 'You are not on the Map.',
  'error.ruta': 'That path does not lead from here.',
  'error.no_en_seleccion': 'That card is not in the pick.',
  'error.sin_botin': 'There are no Spoils to collect.',
  'error.no_en_botin': 'That amulet is not in the Chest.',
  'error.caben': 'Only {n} amulets fit.',
  'error.caben.vende': 'Only {n} amulets fit. Sell one first.',
  'error.oferta': 'That offer is gone.',
  'error.sobre_abierto': 'Choose a card from the open pack first.',
  'error.oro': 'You cannot afford it.',
  'error.sin_sellar': 'You have no cards to seal.',
  'error.sin_sobre': 'There is no open pack.',
  'error.no_en_sobre': 'That card is not in the pack.',
  'error.nada_pendiente': 'Nothing is pending.',
  'error.hoguera': 'You can only Purge in the General Store (or for free at the Campfire).',
  'error.mazo_minimo': 'The deck cannot drop below {n} cards.',
  'error.no_en_mazo': 'That card is not in the deck.',
  'error.solo_taberna': 'Only in the General Store.',
  'error.vida_llena': 'Your Health is already full.',
  'error.no_vender': 'No selling in the middle of a fight.',
  'error.no_llevas': 'You do not carry that amulet.',
  'error.no_seguir': 'You cannot move on yet.',
  'error.sin_bendicion': 'There are no Blessings to choose.',
  'error.no_en_bendicion': 'That Blessing is not in the offer.',
  'error.sin_secreto': 'There is no Shrine.',
  'error.recompensa': 'That reward is gone.',
  'error.sin_saltar': 'There are no Spoils to skip.',
  'error.nada_elegir': 'There is nothing to choose.',
  'error.nada_abierto': 'Nothing is open.',
  'error.no_botin': 'There are no Spoils.',
  'error.no_fogon': 'You are not at the Campfire.',
  'error.fogon_usado': 'The Campfire has been used.',
  'error.opcion': 'That option does not exist.',
  'error.no_ahora': 'You cannot choose that right now.',
  'error.infinito': 'The Endless Throne opens when you win the campaign.',
  'error.eleccion': 'Invalid choice.',
  'error.elige_baraja': 'Choose a deck card.',
  'error.elige_una': 'Choose a card.',
  'error.elige_dos': 'Choose two deck cards.',
  'error.version': 'This room is from another version of the game.',
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
  for (const r of REY_IDS) {
    const e = REYES_EN[r];
    o[`rey.${r}.nombre`] = e.nombre;
    o[`rey.${r}.palo`] = e.palo;
    e.bonos.forEach((b, i) => (o[`rey.${r}.bono.${i + 1}`] = f(b, BALANCE.niveles[r])));
    for (const [rel, t] of Object.entries(e.frases)) o[`rey.${r}.frase.${rel}`] = t;
  }
  for (const b of BENDICIONES) {
    const e = BENDICIONES_EN[b.id];
    if (!e) continue;
    const n = (BALANCE.bendiciones as Record<string, Record<string, number>>)[b.id];
    o[`bendicion.${b.id}.nombre`] = e[0];
    o[`bendicion.${b.id}.desc`] = f(e[1], n);
    o[`bendicion.${b.id}.carga`] = f(e[2], n);
  }
  BUFON_BENDICION_EN.forEach((t, i) => (o[`bufon.bendicion.${i + 1}`] = t));
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
  o['asalto.tirano.m'] = 'Tyrant King';
  o['asalto.tirano.f'] = 'Tyrant Queen';
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
    o[`baraja.${d.id}.lema`] = b[1];
    o[`baraja.${d.id}.desc`] = f(b[2], cifrasBaraja(d.id));
  }
  for (const r of REGLAS) {
    const e = REGLAS_EN[r.id];
    if (!e) continue;
    o[`regla.${r.id}.nombre`] = e[0];
    o[`regla.${r.id}.desc`] = f(e[1], CIFRAS_REGLA[r.id]);
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
    } else if (m[1]) {
      o[`mejora.${u.id}.desc`] = f(m[1], cifraDe(u.id, 1));
      if (u.plantilla) o[`mejora.${u.id}.plantilla`] = m[1];
    }
  }
  for (const [id, [nombre, linea]] of Object.entries(RAMAS_EN)) {
    o[`rama.${id}.nombre`] = nombre;
    o[`rama.${id}.desc`] = linea;
  }
  o['arbol.nombre'] = 'The Altar';
  o['arbol.desc'] = 'Spend shards here to get better for good.';
  o['arbol.raiz.nombre'] = 'The Broken Crown';
  o['arbol.raiz.desc'] = 'Your shards are shown here.';
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
    const cards = SPECIALS.filter((s) => s.locked === a.id && ESPECIALES[s.id]);
    if (deck && BARAJAS[deck.id]) o[`logro.${a.id}.desbloquea`] = BARAJAS[deck.id][0];
    else if (cards.length === 2) o[`logro.${a.id}.desbloquea`] = f(EN_PLANTILLAS['logro.desbloquea.cartas'], { a: ESPECIALES[cards[0].id][0], b: ESPECIALES[cards[1].id][0] });
    else if (cards.length) o[`logro.${a.id}.desbloquea`] = f(EN_PLANTILLAS['logro.desbloquea.carta'], { nombre: ESPECIALES[cards[0].id][0] });
  }
  for (const [id, [nombre, desc]] of Object.entries(PALABRAS)) {
    o[`palabra.${id}.nombre`] = nombre;
    o[`palabra.${id}.desc`] = f(desc, cifrasPalabra());
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
    o[`estado.${id}.desc`] = f(desc, id === 'fractura' ? CIFRAS_MESA.expuesto : {});
  }
  for (const [s, [mayus, nombre]] of Object.entries(PALOS)) {
    o[`palo.${s}`] = mayus;
    o[`palo.${s}.nombre`] = nombre;
  }
  for (const [r, nombre] of Object.entries(FIGURAS_EN)) o[`figura.${r}`] = nombre;
  const C = BALANCE.cobro;
  o['cuenta.asalto'] = 'Assault won';
  o['cuenta.bravo'] = 'Elite Guard';
  o['cuenta.vida'] = f('Health left (1 for every {n})', { n: C.vidaCada });
  o['cuenta.interes'] = f('Interest (1 for every {n} gold)', { n: C.interesCada });
  // V12: the Best Play rule (src/rules/mejor-jugada.ts)
  o['regla.mejor'] = 'Best Play: if you can land an Exact Hit, it picks it. If not, your highest Hit. You confirm.';
  o['mejor.nada'] = 'No play deals Damage: discard, or keep a card in the Sleeve.';
  // V12: coins, shards, drops, bone dice, roll, magnet, payout and AUTO (annex A of SPECS/V12.md)
  o['pieza.moneda.nombre'] = 'Coins';
  o['pieza.moneda.desc'] = 'Gold for the General Store.';
  o['pieza.esquirla.nombre'] = 'Crown Shards';
  o['pieza.esquirla.desc'] = 'Crown pieces: you keep them even if you lose.';
  o['pieza.gota.nombre'] = 'Wax Drops';
  o['pieza.gota.desc'] = f('Collect {n} and the Wax Table seals for free.', { n: BALANCE.caida.gotasPorSello });
  o['hueso.oro.nombre'] = 'Gold Die';
  o['hueso.oro.desc'] = 'Multiplies your coins from the assault.';
  o['hueso.corona.nombre'] = 'Crown Die';
  o['hueso.corona.desc'] = 'Multiplies your shards from the assault.';
  o['ritual.nombre'] = 'Bone Roll';
  o['ritual.desc'] = 'After a win, dice multiply what dropped.';
  o['iman.nombre'] = 'Magnet';
  o['iman.desc'] = 'Loot flies to your purse by itself.';
  o['cobro.conjura.nombre'] = 'Conspiracy Payout';
  o['cobro.conjura.desc'] = 'The shards you earn when the campaign ends.';
  o['auto.nombre'] = 'AUTO';
  o['auto.desc'] = 'The game plays itself. Tap to take over.';
  o['auto.saquear.nombre'] = 'Auto-Loot';
  o['auto.saquear.desc'] = 'The bot picks your Loot.';
  o['auto.taberna.nombre'] = 'Auto-Store';
  o['auto.taberna.desc'] = 'The bot shops at the General Store and picks a route.';
  o['auto.pausa.botin'] = 'AUTO is waiting: pick your Loot.';
  o['auto.pausa.bendicion'] = 'AUTO is waiting: pick your Blessing.';
  o['auto.pausa.taberna'] = 'AUTO is waiting: shop at the General Store or move on.';
  o['auto.pausa.mapa'] = 'AUTO is waiting: pick your route on the Map.';
  o['auto.pausa.secreto'] = 'AUTO is waiting: choose in the Secret.';
  o['auto.pausa.fin'] = 'The campaign is over: AUTO turns off.';
  o['auto.pausa.coop'] = 'In co-op you play by hand.';
  for (const [id, texto] of Object.entries(BUFON)) o[`bufon.${id}`] = texto;
  return { ...o, ...EN_PLANTILLAS };
}

/** The full English dictionary: screen + rules. */
export const EN: Record<string, string> = { ...EN_UI, ...reglasEn() };
