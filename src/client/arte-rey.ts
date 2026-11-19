// V40 1c · Los 4 Reyes jefe aún no tienen busto ni retrato propios (llegan en la fase 3): cada uno usa, de momento,
// el del monarca viejo de su palo. Una sola tabla, sin importaciones, para la mesa, el retrato, la música y la galería.

/** El monarca viejo cuyo arte toma prestado cada Rey. */
export const ARTE_REY: Record<string, string> = { espadas: 'furia', bastos: 'blindaje', oros: 'escasez', copas: 'sequia' };
/** El id de arte de un jefe: el del Rey, si lo es; si no, el mismo. */
export const arteDe = (id: string): string => ARTE_REY[id] ?? id;
