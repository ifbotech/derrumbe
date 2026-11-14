// Epígrafes: una línea de ambiente para cada pieza del juego. Solo se leen en la Lupa; no
// explican reglas (para eso está el texto de cada pieza), cuentan de dónde viene. Los textos salen
// de la biblia de nombres de la V6 (SPECS/V6-biblia-de-nombres.md, sección 18).
import type { Card, Suit } from '../rules/engine';
import { getLang } from './lengua';

const TOOL_FLAVOR: Record<string, string> = {
  piqueta: 'Una pica no discute: convence, punta a punta.',
  cortavidrios: 'Una raya fina y la gema entera se rinde.',
  paleta: 'Lo que se brinda con este cáliz, se cumple.',
  maza: 'No tiene filo ni lo necesita.',
  cincel: 'Un solo punto, bien elegido, y la coraza se abre sola.',
  gemelos: 'Dos que empujan a la vez pesan como cinco.',
  cinta: 'Peldaño tras peldaño, la corte baja sola.',
  sacos: 'Tablas y cuero: la defensa más vieja del mundo.',
  botiquin: 'Hierbas, vendas y un trago que no figura en el inventario.',
  encofrado: 'Con la madera de lo que cae se hace lo que protege.',
  casco: 'Abollado es como mejor demuestra que funciona.',
  puntales: 'Cuando el Mazo se acaba, siempre queda otro escondido.',
  hucha: 'Moneda que no se gasta, moneda que compra una corona.',
  taladro: 'No pregunta qué hay detrás. Lo averigua.',
  estandarte: 'Bajo un mismo color, la conjura canta al mismo compás.',
  dados: 'La suerte existe. Por eso conviene traerla hecha de casa.',
  dinamita: 'Mecha corta, discusión breve.',
  acido: 'Gota a gota, hasta el orgullo de un trono se pica.',
  andamio: 'Una mano más en la mesa es una baza más en la conjura.',
  pasarela: 'En cada manga cabe un secreto. En dos, una traición.',
  contrapeso: 'Lo que lo protegía es justo lo que lo derriba.',
  sordina: 'Un sorbo y la guardia entera bosteza.',
  plano_maestro: 'Todas las puertas ceden a quien llega primero.',
  plomada: 'El hilo cae recto. Todo lo demás es opinión.',
  nivel: 'Dos platos quietos perdonan lo que el pulso no.',
  tiralineas: 'Cerradura fina, cobro seguro.',
  calibre: 'Cada medida exacta le afina un poco más el pulso.',
  cizalla: 'Corta una vez y el siguiente ya lo ha notado.',
  metralla: 'Una gema suelta nunca cae sola.',
  percutor: 'Por si la primera vez no quedó claro.',
  resonador: 'Cuatro voces juntas hacen temblar la quinta.',
  diapason: 'Hace lo que vea al lado. No tiene cara propia.',
  vibrador: 'Cuando suena, todo el castillo lo oye.',
  timbre: 'Lo sellado, sellado dos veces.',
  prisma: 'Una sola luz, partida en todas sus caras.',
  mosaico: 'De tres colores distintos sale una ventana entera.',
  crisol: 'Lo que entra roto sale fundido.',
  catalizador: 'No hace nada. Solo consigue que todo lo demás ocurra.',
  sismografo: 'Cuanto más corta la vela, más brilla.',
  megafono: 'Quien la arranca, paga. Con intereses.',
  piquete: 'Una antorcha encendida y la plaza entera se levanta.',
  ultimo: 'Nadie golpea tan fuerte como quien ya no tiene adónde volver.',
  corazon: 'Late dentro de la piedra. Pide que no falles.',
  trituradora: 'Entra una carta, sale humo.',
  montacargas: 'Las cenizas pesan más de lo que parece.',
  horno: 'Lo que no sirve, al menos aviva el fuego.',
  contenedor: 'Lo guardado hoy pesa mañana.',
  prensa: 'Cada ceniza, un grado más de mando.',
  ariete: 'El escudo que te protegía, puesto a correr.',
  contragolpe: 'Lo que no entra, vuelve. Con intereses.',
  rebosadero: 'Ni una gota se pierde en esta copa.',
  bastion: 'Detrás de una buena almena se golpea más tranquilo.',
};

const SPECIAL_FLAVOR: Record<string, string> = {
  barreno: 'Un virote pequeño para un problema grande.',
  martillo: 'Repite. Repite. Repite.',
  saboteador: 'Entró por la puerta de servicio y salió sin hacer ruido.',
  palanca: 'Dadme un punto de apoyo y una conjura con ganas.',
  grua: 'Lo que hace falta, llega volando.',
  mordaza: 'Hoy la guardia se queda con las ganas.',
  clavos: 'Una flecha para cada vecino.',
  chatarrero: 'Toca una vez, pregunta nunca.',
  pico: 'Hasta los reyes tienen precio.',
  botica: 'Sabe a rayos. Funciona.',
  gemelo: 'Nadie distingue cuál de los dos es el bueno.',
  nitro: 'Firma con cuidado. Con mucho cuidado.',
  bola: 'Un toque y la conjura entera carga.',
  hormigonera: 'Tranca echada, puerta cerrada.',
  cemento: 'Mil anillos pequeños hacen una muralla.',
  sierra: 'Todo castillo tiene una puerta que nadie vigila.',
  embestida: 'La mejor defensa es llevársela por delante.',
  ferretero: 'Fía una vez. Solo una.',
  'j-doble': 'Por fin, las dos caras miran hacia el mismo lado.',
  'j-escasez': 'Lo que os quitó, ahora lo paga.',
  'j-sequia': 'Su cáliz, por fin, a favor de la conjura.',
  'j-intemperie': 'El hielo también sabe hacer de puerta.',
  'j-blindaje': 'Sus preguntas, vueltas contra la corte.',
  'j-furia': 'Rabia prestada. Golpea igual.',
  'j-inestable': 'Da la hora que le pidas, mientras le pagues.',
};

const BOSS_FLAVOR: Record<string, string> = {
  doble: 'Nadie sabe cuál de sus dos caras dio la orden.',
  escasez: 'Lleva la cuenta de cada carta que os falta.',
  sequia: 'Brinda siempre a tu salud. Nunca bebe primero.',
  intemperie: 'Donde pisa, el Escudo se cubre de escarcha.',
  blindaje: 'Pregunta despacio. Nadie responde dos veces.',
  furia: 'No juzga: ejecuta las órdenes de la corte.',
  inestable: 'Sabe cuánta arena le queda a cada uno.',
  ferretero: 'Vende, gruñe y cobra. En ese orden.',
};

const COURT: Record<number, Record<Suit, string>> = {
  11: {
    S: 'Vigila de día, vigila de noche y no ha soltado la lanza desde que entró.',
    D: 'Cuenta las joyas del tesoro dos veces al día. Siempre le sale una más.',
    H: 'Sirve el vino del Rey. Nunca le tiembla la jarra.',
    C: 'Guarda los jardines y conoce cada seto por su nombre.',
  },
  12: {
    S: 'Firma con un punzón. Sus decretos no se rompen: se oxidan.',
    D: 'Se mira en mil gemas a la vez y ninguna la engaña.',
    H: 'Cada carta de amor del castillo pasa antes por sus manos.',
    C: 'Plantó un brote en el patio. Hoy da sombra a toda la guardia.',
  },
  13: {
    S: 'Su corona es una espada doblada a martillazos.',
    D: 'Reina desde lo alto de un prisma. Abajo, todo son reflejos.',
    H: 'Dicen que tiene el corazón en un cofre. Nadie ha visto la llave.',
    C: 'Mandó tallar su trono en un solo roble.',
  },
};

const SUIT_FLAVOR: Record<Suit, string> = {
  S: 'Picas: hierro oscuro, lanza y vigilia.',
  D: 'Diamantes: oro bruñido, frío y cortante.',
  H: 'Corazones: carmesí real, cáliz y promesa.',
  C: 'Tréboles: verdín profundo, raíz y paciencia.',
};
const ACE_FLAVOR: Record<Suit, string> = {
  S: 'La primera lanza. Va con quien se lo pida.',
  D: 'La primera gema del tesoro.',
  H: 'El primer juramento. Sin él, los demás no saben dónde ir.',
  C: 'La primera semilla. Abraza lo que le pongan al lado.',
};

// ───────────── V10 · los mismos epígrafes en inglés ─────────────
const TOOL_FLAVOR_EN: Record<string, string> = {
  piqueta: 'A spear does not argue: it persuades, point by point.',
  cortavidrios: 'One fine scratch and the whole gem gives in.',
  paleta: 'Whatever is toasted from this chalice comes true.',
  maza: 'It has no edge and needs none.',
  cincel: 'A single point, well chosen, and the armour opens itself.',
  gemelos: 'Two who push at once weigh as much as five.',
  cinta: 'Step after step, the court comes down on its own.',
  sacos: 'Planks and leather: the oldest defence in the world.',
  botiquin: 'Herbs, bandages and a swig that is not on the inventory.',
  encofrado: 'From the wood of what falls comes what protects.',
  casco: 'Dented is how it best proves it works.',
  puntales: 'When the Deck runs out, there is always another one hidden.',
  hucha: 'A coin not spent is a coin that buys a crown.',
  taladro: 'It does not ask what lies behind. It finds out.',
  estandarte: 'Under one colour, the crew sings to one beat.',
  dados: 'Luck exists. That is why it pays to bring it from home.',
  dinamita: 'Short fuse, short argument.',
  acido: 'Drop by drop, even the pride of a throne corrodes.',
  andamio: 'One more hand at the table is one more trick for the plot.',
  pasarela: 'One sleeve holds a secret. Two hold a betrayal.',
  contrapeso: 'What protected it is just what brings it down.',
  sordina: 'One sip and the whole guard yawns.',
  plano_maestro: 'Every door yields to whoever arrives first.',
  plomada: 'The thread falls straight. All else is opinion.',
  nivel: 'Two still pans forgive what the pulse does not.',
  tiralineas: 'Fine lock, sure payment.',
  calibre: 'Every exact measure steadies the hand a little more.',
  cizalla: 'Cut once and the next one has already felt it.',
  metralla: 'A loose gem never falls alone.',
  percutor: 'In case it was not clear the first time.',
  resonador: 'Four voices together make the fifth tremble.',
  diapason: 'It does whatever it sees beside it. It has no face of its own.',
  vibrador: 'When it rings, the whole castle hears.',
  timbre: 'What is sealed, sealed twice.',
  prisma: 'A single light, split across all its faces.',
  mosaico: 'Three different colours make one whole window.',
  crisol: 'What goes in broken comes out fused.',
  catalizador: 'It does nothing. It only makes everything else happen.',
  sismografo: 'The shorter the candle, the brighter it burns.',
  megafono: 'Whoever tears it out pays. With interest.',
  piquete: 'One lit torch and the whole square rises.',
  ultimo: 'Nobody hits as hard as one with nowhere left to go back to.',
  corazon: 'It beats inside the stone. It asks you not to miss.',
  trituradora: 'A card goes in, smoke comes out.',
  montacargas: 'Ashes weigh more than they seem.',
  horno: 'What is useless at least feeds the fire.',
  contenedor: 'What is stored today weighs tomorrow.',
  prensa: 'Each ash, one more degree of command.',
  ariete: 'The shield that guarded you, sent running.',
  contragolpe: 'What does not get in comes back. With interest.',
  rebosadero: 'Not a drop is lost from this cup.',
  bastion: 'Behind a good battlement, you strike more calmly.',
};

const SPECIAL_FLAVOR_EN: Record<string, string> = {
  barreno: 'A small bolt for a big problem.',
  martillo: 'Again. Again. Again.',
  saboteador: 'In through the servants’ door, out without a sound.',
  palanca: 'Give me a place to stand and a crew with a will.',
  grua: 'What is needed comes flying.',
  mordaza: 'Today the guard goes without.',
  clavos: 'An arrow for every neighbour.',
  chatarrero: 'Touch once, ask never.',
  pico: 'Even kings have a price.',
  botica: 'Tastes foul. Works.',
  gemelo: 'Nobody can tell which of the two is the real one.',
  nitro: 'Sign carefully. Very carefully.',
  bola: 'One touch and the whole crew charges.',
  hormigonera: 'Bar down, door shut.',
  cemento: 'A thousand small rings make a rampart.',
  sierra: 'Every castle has a door nobody watches.',
  embestida: 'The best defence is to sweep it aside.',
  ferretero: 'Gives credit once. Only once.',
  'j-doble': 'At last, both faces look the same way.',
  'j-escasez': 'What was taken from you, now gets paid back.',
  'j-sequia': 'That chalice, at last, on the side of the plot.',
  'j-intemperie': 'Ice can make a door too.',
  'j-blindaje': 'The questions, turned against the court.',
  'j-furia': 'Borrowed rage. It hits just the same.',
  'j-inestable': 'Tells whatever hour you ask, as long as you pay.',
};

const BOSS_FLAVOR_EN: Record<string, string> = {
  doble: 'Nobody knows which of the two faces gave the order.',
  escasez: 'Keeps count of every card you are missing.',
  sequia: 'Always toasts your health. Never drinks first.',
  intemperie: 'Wherever that foot treads, the Shield frosts over.',
  blindaje: 'Asks slowly. Nobody answers twice.',
  furia: 'Does not judge: carries out the orders of the court.',
  inestable: 'Knows how much sand each one has left.',
  ferretero: 'Sells, grumbles and collects. In that order.',
};

const COURT_EN: Record<number, Record<Suit, string>> = {
  11: {
    S: 'Watches by day, watches by night, and has not let go of the spear since coming in.',
    D: 'Counts the treasure jewels twice a day. Always finds one extra.',
    H: 'Pours the King’s wine. The jug never shakes.',
    C: 'Keeps the gardens and knows every hedge by name.',
  },
  12: {
    S: 'Signs with an awl. Her decrees do not break: they rust.',
    D: 'Sees herself in a thousand gems at once and none of them fools her.',
    H: 'Every love letter in the castle passes through her hands first.',
    C: 'Planted a sprout in the courtyard. Today it shades the whole guard.',
  },
  13: {
    S: 'His crown is a sword bent by hammer blows.',
    D: 'Reigns from the top of a prism. Below, all is reflections.',
    H: 'They say he keeps his heart in a chest. Nobody has seen the key.',
    C: 'Had his throne carved from a single oak.',
  },
};

const SUIT_FLAVOR_EN: Record<Suit, string> = {
  S: 'Spades: dark iron, spear and vigil.',
  D: 'Diamonds: burnished gold, cold and sharp.',
  H: 'Hearts: royal crimson, chalice and promise.',
  C: 'Clubs: deep verdigris, root and patience.',
};
const ACE_FLAVOR_EN: Record<Suit, string> = {
  S: 'The first spear. Goes with whoever asks.',
  D: 'The first gem of the treasure.',
  H: 'The first oath. Without it, the others do not know where to go.',
  C: 'The first seed. Embraces whatever is set beside it.',
};

const en = () => getLang() === 'en';

export const toolFlavor = (id: string) => (en() ? TOOL_FLAVOR_EN : TOOL_FLAVOR)[id] ?? '';
export const bossFlavor = (id: string) => (en() ? BOSS_FLAVOR_EN : BOSS_FLAVOR)[id] ?? '';

export function cardFlavor(c: Card): string {
  if (c.sp) return (en() ? SPECIAL_FLAVOR_EN : SPECIAL_FLAVOR)[c.sp] ?? '';
  if (c.suit === 'X') return en() ? 'Arms folded. Nobody strikes, nobody collects, nobody warns.' : 'Brazos cruzados. Nadie golpea, nadie cobra, nadie avisa.';
  if (c.rank > 10) return (en() ? COURT_EN : COURT)[c.rank]?.[c.suit] ?? '';
  if (c.rank === 1) return (en() ? ACE_FLAVOR_EN : ACE_FLAVOR)[c.suit];
  return (en() ? SUIT_FLAVOR_EN : SUIT_FLAVOR)[c.suit];
}
