// Epígrafes: una línea de ambiente para cada pieza del juego. Solo se leen en la lupa de grabador;
// no explican reglas (para eso está el texto de cada pieza), cuentan de dónde viene.
import type { Card, Suit } from '../rules/engine';

const TOOL_FLAVOR: Record<string, string> = {
  piqueta: 'El acero no se dobla: se convence, golpe a golpe.',
  cortavidrios: 'Una raya limpia y el paño entero se rinde.',
  paleta: 'Lo que el albañil unió, el albañil sabe por dónde se suelta.',
  maza: 'No tiene filo ni lo necesita.',
  cincel: 'Un solo punto, bien elegido, y la piedra se abre sola.',
  gemelos: 'Dos que empujan a la vez pesan como cinco.',
  cinta: 'Peldaño tras peldaño, la obra baja sola.',
  sacos: 'Tierra en un saco: la muralla más vieja del mundo.',
  botiquin: 'Yodo, vendas y una petaca que no figura en el inventario.',
  encofrado: 'Con las tablas de lo que cae se levanta lo que protege.',
  casco: 'Abollado es como mejor demuestra que funciona.',
  puntales: 'Cuando el techo cruje, ellos ya estaban ahí.',
  hucha: 'Céntimo que no se bebe, céntimo que tira una torre.',
  taladro: 'No pregunta qué hay detrás. Lo averigua.',
  estandarte: 'Bajo un mismo color, la cuadrilla canta al mismo compás.',
  dados: 'La suerte existe. Por eso conviene traerla hecha de casa.',
  dinamita: 'Mecha corta, discusión breve.',
  acido: 'Gota a gota, hasta el orgullo de una torre se pica.',
  andamio: 'Un catre más en el barracón es una mano más en la obra.',
  pasarela: 'Dos tablones entre dos vacíos: ahí se guarda lo que aún no toca.',
  contrapeso: 'Lo que la sostenía es justo lo que la derriba.',
  sordina: 'Un trapo en la bocina y la torre grita para dentro.',
  plano_maestro: 'El primer golpe ya estaba dado sobre el papel.',
  plomada: 'El hilo cae recto. Todo lo demás es opinión.',
  nivel: 'Una burbuja entre dos rayas perdona lo que el pulso no.',
  tiralineas: 'Línea fina, cobro seguro.',
  calibre: 'Cada medida exacta le afina un poco más el oído.',
  cizalla: 'Muerde una vez y el piso de abajo ya lo ha notado.',
  metralla: 'El vidrio roto nunca se va solo.',
  percutor: 'Por si la primera vez no quedó claro.',
  resonador: 'Cuatro voces juntas hacen temblar el quinto piso.',
  diapason: 'Vibra con lo que tenga al lado. No tiene nota propia.',
  vibrador: 'El hormigón tierno lo cuenta todo a sus vecinos.',
  timbre: 'Lo sellado, sellado dos veces.',
  prisma: 'Una sola tinta, partida en todas sus caras.',
  mosaico: 'De tres retales distintos sale un golpe entero.',
  crisol: 'Lo que entra agrietado sale fundido.',
  catalizador: 'No hace nada. Solo consigue que todo lo demás ocurra.',
  sismografo: 'Cuanto más tiembla el búnker, más fino escribe la aguja.',
  megafono: 'Devuélveles el grito, con intereses.',
  piquete: 'Brazos cruzados, bolsillos llenos.',
  ultimo: 'Nadie pega tan fuerte como el que ya no tiene adónde volver.',
  corazon: 'Late dentro del hormigón. Pide que no falles.',
  trituradora: 'Entra una carta, sale grava.',
  montacargas: 'Sube escombro, baja fuerza.',
  horno: 'Lo que no sirve, al menos calienta.',
  contenedor: 'Lo tirado hoy pesa mañana.',
  prensa: 'Cada chatarra, un grado más de apriete.',
  ariete: 'El muro que te protegía, puesto a correr.',
  contragolpe: 'Lo que no entra, vuelve. Con intereses.',
  rebosadero: 'Ni una gota de arreglo se tira en esta obra.',
  bastion: 'Detrás de un buen muro se pega más tranquilo.',
};

const SPECIAL_FLAVOR: Record<string, string> = {
  barreno: 'Un agujero pequeño para un problema grande.',
  martillo: 'Repite. Repite. Repite.',
  saboteador: 'Entró por la puerta de servicio y salió sin hacer ruido.',
  palanca: 'Dadme un punto de apoyo y una cuadrilla con ganas.',
  grua: 'Lo que hace falta, llega colgando.',
  mordaza: 'Hoy la sirena se queda con las ganas.',
  clavos: 'Un clavo para cada vecina.',
  chatarrero: 'Compra todo, pregunta poco.',
  pico: 'Hay vetas hasta en los forjados.',
  botica: 'Sabe a rayos. Funciona.',
  gemelo: 'Nadie distingue cuál de los dos es el bueno.',
  nitro: 'Con cariño. Con mucho cariño.',
  bola: 'Va y vuelve. A la vuelta ya no hay pared.',
  hormigonera: 'Gira que te gira, y el muro crece.',
  cemento: 'Fragua antes de que termines la frase.',
  sierra: 'Canta agudo y no respeta materiales.',
  embestida: 'La mejor defensa es llevársela por delante.',
  ferretero: 'Fía una vez. Solo una.',
  'j-doble': 'Aprendió a callar a la fuerza.',
  'j-escasez': 'Lo que os quitó, ahora lo paga.',
  'j-sequia': 'Sus frascos, por fin, a favor de la obra.',
  'j-intemperie': 'La nieve también sabe hacer de tapia.',
  'j-blindaje': 'Su coraza, vuelta contra las torres.',
  'j-furia': 'Rabia prestada. Pega igual.',
  'j-inestable': 'Excava donde le digan, mientras haya queso.',
};

const BOSS_FLAVOR: Record<string, string> = {
  doble: 'Nadie recuerda su voz de antes. Solo el megáfono.',
  escasez: 'Lleva la cuenta de cada carta que os falta.',
  sequia: 'Receta siempre lo mismo: aguantarse.',
  intemperie: 'Donde pisa, el mortero no fragua.',
  blindaje: 'Lo remacharon de pie y nunca volvió a sentarse.',
  furia: 'No dirige la obra: la embiste.',
  inestable: 'Conoce los cimientos mejor que quien los puso.',
  ferretero: 'Vende, gruñe y cobra. En ese orden.',
};

const COURT: Record<number, Record<Suit, string>> = {
  11: {
    S: 'Remacha de día, vigila de noche y no ha soltado la lanza desde que entró.',
    D: 'Limpia los ventanales por fuera. No conoce el vértigo.',
    H: 'Lleva ladrillos al hombro desde que aprendió a andar.',
    C: 'Enconfra, vierte y espera: la paciencia hecha oficio.',
  },
  12: {
    S: 'Firma con un punzón. Sus contratos no se rompen: se oxidan.',
    D: 'Se mira en mil paños a la vez y ninguno la engaña.',
    H: 'Cada hilada de la torre lleva una rosa suya escondida.',
    C: 'Plantó un brote en la azotea. Hoy sostiene tres pisos.',
  },
  13: {
    S: 'Su corona es una viga doblada a martillazos.',
    D: 'Reina desde lo alto de un prisma. Abajo, todo son reflejos.',
    H: 'Coció él mismo el primer ladrillo. Dicen que aún está caliente.',
    C: 'Mandó verter su trono en una sola colada.',
  },
};

const SUIT_FLAVOR: Record<Suit, string> = {
  S: 'Acero: negro de humo, remache y viga.',
  D: 'Vidrio: ocre de horno, frágil y cortante.',
  H: 'Ladrillo: almagre cocido, hilada sobre hilada.',
  C: 'Hormigón: verdín viejo, peso y silencio.',
};
const ACE_FLAVOR: Record<Suit, string> = {
  S: 'El primer remache. Va con quien se lo pida.',
  D: 'La primera raya en el cristal.',
  H: 'El primer ladrillo. Sin él, los demás no saben dónde ir.',
  C: 'La primera colada. Abraza lo que le pongan al lado.',
};

export const toolFlavor = (id: string) => TOOL_FLAVOR[id] ?? '';
export const bossFlavor = (id: string) => BOSS_FLAVOR[id] ?? '';

export function cardFlavor(c: Card): string {
  if (c.sp) return SPECIAL_FLAVOR[c.sp] ?? '';
  if (c.suit === 'X') return 'Brazos cruzados. Nadie golpea, nadie cobra, nadie grita.';
  if (c.rank > 10) return COURT[c.rank]?.[c.suit] ?? '';
  if (c.rank === 1) return ACE_FLAVOR[c.suit];
  return SUIT_FLAVOR[c.suit];
}
