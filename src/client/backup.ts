// Copia de seguridad del progreso: todo lo que el juego guarda (gremio, colección, actas, campaña
// en curso y ajustes) cabe en un archivo .json. Sirve para no perderlo al limpiar el navegador y
// para llevárselo a otro equipo o a la versión de escritorio.
import { platform } from './platform';

const PREFIX = 'derrumbe:';
/** Lo que es de esta instalación y no del jugador: no viaja en la copia. */
const LOCAL_ONLY = ['derrumbe:server'];

export interface Backup {
  app: 'derrumbe';
  format: 1;
  exported: string;
  data: Record<string, string>;
}

export function buildBackup(): Backup {
  const data: Record<string, string> = {};
  for (const key of platform.keys(PREFIX)) {
    if (LOCAL_ONLY.includes(key)) continue;
    const value = platform.load(key);
    if (value !== null) data[key] = value;
  }
  return { app: 'derrumbe', format: 1, exported: new Date().toISOString(), data };
}

/** Descarga la copia como archivo. Devuelve el nombre con el que se guardó. */
export function exportProgress(): string {
  const name = `derrumbe-progreso-${new Date().toISOString().slice(0, 10)}.json`;
  platform.saveFile(name, JSON.stringify(buildBackup(), null, 1));
  return name;
}

/** Comprueba un archivo de copia. Devuelve la copia, o un mensaje de error legible. */
export function readBackup(text: string): Backup | string {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return 'Ese archivo no es un JSON válido.';
  }
  const b = raw as Partial<Backup> | null;
  if (!b || b.app !== 'derrumbe' || typeof b.data !== 'object' || b.data === null) return 'Ese archivo no es una copia de progreso de DERRUMBE.';
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(b.data)) {
    if (!key.startsWith(PREFIX) || typeof value !== 'string' || LOCAL_ONLY.includes(key)) continue;
    if (value.length > 2_000_000) return 'La copia es demasiado grande para ser de este juego.';
    data[key] = value;
  }
  if (!data['derrumbe:meta']) return 'La copia no trae gremio: no hay progreso que importar.';
  // el gremio tiene que ser el JSON que el juego guardó: una copia retocada a mano no debe romper el arranque
  // (otras claves, como el nombre o la baraja elegida, son texto llano y no se comprueban así)
  try {
    const meta = JSON.parse(data['derrumbe:meta']) as unknown;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new Error('gremio');
    if (data['derrumbe:actas'] && !Array.isArray(JSON.parse(data['derrumbe:actas']))) throw new Error('actas');
  } catch {
    return 'La copia está dañada: el gremio o las actas no se pueden leer.';
  }
  return { app: 'derrumbe', format: 1, exported: typeof b.exported === 'string' ? b.exported : '', data };
}

/** Lo que dice una copia de un vistazo (para confirmar antes de sustituir nada). */
export function describeBackup(b: Backup): string {
  let renown = 0;
  let runs = 0;
  let actas = 0;
  try {
    const meta = JSON.parse(b.data['derrumbe:meta']) as { renown?: number; runs?: number };
    renown = Number(meta.renown) || 0;
    runs = Number(meta.runs) || 0;
    actas = (JSON.parse(b.data['derrumbe:actas'] ?? '[]') as unknown[]).length;
  } catch {
    /* se enseña lo que se pueda */
  }
  return `${renown} ✦ de renombre · ${runs} campañas · ${actas} actas${b.exported ? ` · guardada el ${b.exported.slice(0, 10)}` : ''}`;
}

/** Sustituye el progreso guardado por el de la copia. Hay que recargar después. */
export function applyBackup(b: Backup): void {
  for (const key of platform.keys(PREFIX)) if (!LOCAL_ONLY.includes(key)) platform.remove(key);
  for (const [key, value] of Object.entries(b.data)) platform.save(key, value);
}
