// Epígrafes: una línea de ambiente para cada pieza del juego. Solo se leen en la Lupa; no
// explican reglas (para eso está el texto de cada pieza), cuentan de dónde viene. Los textos salen
// de la biblia de nombres de la V6 (SPECS/V6-biblia-de-nombres.md, sección 18).
import type { Card, Suit } from '../rules/engine';

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

export const toolFlavor = (id: string) => TOOL_FLAVOR[id] ?? '';
export const bossFlavor = (id: string) => BOSS_FLAVOR[id] ?? '';

export function cardFlavor(c: Card): string {
  if (c.sp) return SPECIAL_FLAVOR[c.sp] ?? '';
  if (c.suit === 'X') return 'Brazos cruzados. Nadie golpea, nadie cobra, nadie avisa.';
  if (c.rank > 10) return COURT[c.rank]?.[c.suit] ?? '';
  if (c.rank === 1) return ACE_FLAVOR[c.suit];
  return SUIT_FLAVOR[c.suit];
}
