// Cinturón de herramientas. Cada herramienta ocupa un hueco y se evalúa de izquierda a derecha:
// las que suman Fuerza o Resonancia actúan donde están, y las que multiplican (×Resonancia)
// multiplican todo lo acumulado a su izquierda. Por eso el orden importa y se puede cambiar.
//
// Cinco arquetipos se cruzan entre sí:
//   precision    golpes limpios y rachas
//   sismo        repeticiones, copias y daño en área
//   alquimia     mezcla de materiales y estados de las torres
//   limite       convertir el peligro del búnker en potencia
//   trituradora  destruir y agotar cartas para adelgazar el mazo y cebar la chatarra
import type { Card, Config, Formation, Hook, Outcome, Strike, Suit } from './engine';

/** Una herramienta equipada. `n` es su contador propio (las que crecen lo usan). */
export interface ToolInst {
  id: string;
  n: number;
}

export type Rarity = 'comun' | 'oficio' | 'capataz' | 'reliquia';
export type Arch = 'base' | 'precision' | 'sismo' | 'alquimia' | 'limite' | 'trituradora';
export const RARITY: Record<Rarity, { name: string; cost: number; weight: number }> = {
  comun: { name: 'Común', cost: 5, weight: 50 },
  oficio: { name: 'Oficio', cost: 8, weight: 30 },
  capataz: { name: 'Capataz', cost: 11, weight: 15 },
  reliquia: { name: 'Reliquia', cost: 15, weight: 5 },
};
export const ARCH: Record<Arch, string> = {
  base: 'Obra general',
  precision: 'Precisión quirúrgica',
  sismo: 'Sismo y vibración',
  alquimia: 'Alquimia de materiales',
  limite: 'Búnker al límite',
  trituradora: 'Trituradora',
};

export interface SirenInfo {
  tower: Suit;
  threat: number;
  blocked: number;
  taken: number;
}

export interface ToolDef {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  arch: Arch;
  /** Caja del gremio que la añade al surtido. Sin caja: disponible desde la primera campaña. */
  box?: Arch;
  /** Qué hace en un golpe: f suma Fuerza, r suma Resonancia, x multiplica, copy copia, p es pasiva. */
  kind: 'f' | 'r' | 'x' | 'copy' | 'p';
  /** Regla fija de la obra. */
  cfg?(c: Config): void;
  /** Su turno en la resolución del golpe. */
  strike?(x: Strike, self: ToolInst): void;
  /** Tras el daño: reacciona a pisos caídos y golpes limpios. */
  after?(x: Strike, self: ToolInst, r: Outcome): void;
  siren?(h: Hook, self: ToolInst, s: SirenInfo): void;
  joker?(h: Hook, self: ToolInst): void;
  discard?(h: Hook, self: ToolInst, cards: Card[]): void;
  burn?(h: Hook, self: ToolInst, card: Card): void;
  /** Lo que lleva acumulado, para mostrarlo en el cinturón. */
  count?(self: ToolInst): string;
}

const GROUPS: Formation[] = ['grupo', 'doblepar', 'full', 'poker'];
const RUNS: Formation[] = ['escalera', 'escaleracolor'];
const perSuit = (s: Suit, n: number) => (x: Strike) => x.F(n * x.cards.filter((c) => c.suit === s).length);
const hand = (c: Config, n: number) => void (c.handSize = Object.fromEntries(Object.entries(c.handSize).map(([k, v]) => [k, Math.max(3, v + n)])));
const fx = (x: Strike) => Object.values(x.env.towers).reduce((a, t) => a + (t.floors.length ? Object.values(t.fx).filter(Boolean).length : 0), 0);

export const TOOLS: ToolDef[] = [
  // ───────── obra general ─────────
  { id: 'piqueta', name: 'Piqueta', desc: '+3 de Fuerza por cada ♠ del golpe.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('S', 3) },
  { id: 'cortavidrios', name: 'Diamante de corte', desc: '+3 de Fuerza por cada ♦ del golpe.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('D', 3) },
  { id: 'paleta', name: 'Paleta de albañil', desc: '+3 de Fuerza por cada ♥ del golpe.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('H', 3) },
  { id: 'maza', name: 'Maza de hierro', desc: '+3 de Fuerza por cada ♣ del golpe.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('C', 3) },
  { id: 'cincel', name: 'Cincel', desc: '+8 de Fuerza si juegas una carta sola.', rarity: 'comun', arch: 'base', kind: 'f', strike: (x) => x.cards.length === 1 && x.F(8) },
  { id: 'gemelos', name: 'Cuadrilla doble', desc: '+0,5 de Resonancia en grupos, doble par, full y póker.', rarity: 'comun', arch: 'base', kind: 'r', strike: (x) => GROUPS.includes(x.formation) && x.R(0.5) },
  { id: 'cinta', name: 'Cinta transportadora', desc: '+0,7 de Resonancia en escaleras.', rarity: 'comun', arch: 'base', kind: 'r', strike: (x) => RUNS.includes(x.formation) && x.R(0.7) },
  { id: 'sacos', name: 'Sacos terreros', desc: 'El muro sube la mitad de tus ♣ y su tope crece +4.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void ((c.wallDiv = 2), (c.wallCap += 4)) },
  { id: 'botiquin', name: 'Botiquín', desc: 'Reparas la mitad de tus ♥ en vez de un tercio.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void (c.repairDiv = Math.min(c.repairDiv, 2)) },
  { id: 'encofrado', name: 'Encofrado', desc: 'Cada piso demolido: +2 de muro.', rarity: 'comun', arch: 'base', kind: 'p', after: (x, _, r) => r.fallen > 0 && (x.wall += 2 * r.fallen) && x.note(`+${2 * r.fallen} de muro`) },
  { id: 'casco', name: 'Casco', desc: 'Cada piso demolido: +1 de integridad.', rarity: 'comun', arch: 'base', kind: 'p', after: (x, _, r) => r.fallen > 0 && (x.heal += r.fallen) && x.note(`+${r.fallen} de integridad`) },
  { id: 'puntales', name: 'Puntales', desc: 'Los colapsos quitan 3 menos.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void (c.collapseLoss = Math.max(0, c.collapseLoss - 3)) },
  { id: 'hucha', name: 'Hucha', desc: '+4 de oro al terminar cada obra.', rarity: 'comun', arch: 'base', kind: 'p' },
  { id: 'taladro', name: 'Taladro', desc: 'Todos tus golpes perforan, lleven o no picas.', rarity: 'oficio', arch: 'base', kind: 'p', cfg: (c) => void (c.alwaysPierce = true) },
  { id: 'estandarte', name: 'Estandarte', desc: '+1,5 de Resonancia en color y escalera de color.', rarity: 'oficio', arch: 'base', kind: 'r', strike: (x) => (x.formation === 'color' || x.formation === 'escaleracolor') && x.R(1.5) },
  { id: 'dados', name: 'Dados cargados', desc: '+1 de Resonancia en doble par y full.', rarity: 'oficio', arch: 'base', kind: 'r', strike: (x) => (x.formation === 'doblepar' || x.formation === 'full') && x.R(1) },
  { id: 'dinamita', name: 'Dinamita', desc: 'La ventaja de material multiplica ×3 en vez de ×2.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => void (c.advMult = (c.advMult ?? 2) + 1) },
  { id: 'acido', name: 'Ácido', desc: 'Tus cartas ya no son inmunes: ×1 contra la torre de su palo.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => void (c.ownMult = 1) },
  { id: 'andamio', name: 'Barracón', desc: '+1 carta en la mano.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => hand(c, 1) },
  { id: 'pasarela', name: 'Pasarela', desc: '+1 hueco de andamio: guardas dos cartas aparte de la mano.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => void (c.reserveSize = (c.reserveSize ?? 1) + 1) },
  { id: 'contrapeso', name: 'Contrapeso', desc: 'La inmunidad se invierte: las cartas del palo de la torre pegan con ventaja.', rarity: 'reliquia', arch: 'base', kind: 'p', cfg: (c) => void (c.ownMult = c.advMult ?? 2) },
  { id: 'sordina', name: 'Sordina', desc: 'La amenaza de todas las torres baja 1.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => void [11, 12, 13].forEach((r) => (c.floorThreat[r] = Math.max(1, c.floorThreat[r] - 1))) },
  { id: 'plano_maestro', name: 'Plano maestro', desc: '×2 de Resonancia en el primer golpe contra cada piso.', rarity: 'reliquia', arch: 'base', kind: 'x', strike: (x) => x.env.towers[x.target].damage === 0 && x.X(2) },

  // ───────── precisión quirúrgica ─────────
  { id: 'plomada', name: 'Plomada', desc: 'Cada golpe limpio: +4 de integridad.', rarity: 'comun', arch: 'precision', kind: 'p', after: (x, _, r) => r.clean && (x.heal += 4) && x.note('+4 de integridad') },
  { id: 'nivel', name: 'Nivel de burbuja', desc: 'El golpe limpio admite un margen de ±1.', rarity: 'oficio', arch: 'precision', kind: 'p', cfg: (c) => void (c.cleanTol = (c.cleanTol ?? 0) + 1) },
  { id: 'tiralineas', name: 'Tiralíneas', desc: 'Cada golpe limpio: +2 de oro.', rarity: 'comun', arch: 'precision', box: 'precision', kind: 'p', after: (x, _, r) => r.clean && (x.gold += 2) && x.note('+2 de oro') },
  {
    id: 'calibre',
    name: 'Calibre',
    desc: 'Gana +0,15 de Resonancia para siempre con cada golpe limpio.',
    rarity: 'oficio',
    arch: 'precision',
    box: 'precision',
    kind: 'r',
    strike: (x, self) => x.R(0.15 * self.n),
    after: (x, self, r) => r.clean && ++self.n && x.note('crece'),
    count: (self) => `+${(0.15 * self.n).toFixed(2).replace(/0$/, '').replace('.', ',')}`,
  },
  {
    id: 'cizalla',
    name: 'Cizalla hidráulica',
    desc: 'Tras un golpe limpio, el piso siguiente pierde la mitad de su resistencia.',
    rarity: 'capataz',
    arch: 'precision',
    box: 'precision',
    kind: 'p',
    after: (x, _, r) => {
      for (const f of r.fell) if (f.clean) x.extra.push({ tower: f.tower, pct: 0.5 });
      if (r.clean) x.note('corta el piso siguiente');
    },
  },

  // ───────── sismo y vibración ─────────
  { id: 'metralla', name: 'Metralla', desc: 'Las esquirlas hacen la mitad de tus ♦ en vez de un tercio.', rarity: 'oficio', arch: 'sismo', kind: 'p', cfg: (c) => void (c.shardDiv = 2) },
  { id: 'percutor', name: 'Percutor', desc: 'Vuelve a activar la primera carta del golpe.', rarity: 'oficio', arch: 'sismo', kind: 'f', strike: (x) => x.F(x.impacts[0] ?? 0) },
  { id: 'resonador', name: 'Resonador', desc: '×1,5 de Resonancia si el golpe lleva 4 cartas o más.', rarity: 'capataz', arch: 'sismo', kind: 'x', strike: (x) => x.cards.length >= 4 && x.X(1.5) },
  { id: 'diapason', name: 'Diapasón de obra', desc: 'Copia la herramienta que tenga a su derecha.', rarity: 'oficio', arch: 'sismo', box: 'sismo', kind: 'copy' },
  {
    id: 'vibrador',
    name: 'Vibrador de hormigón',
    desc: 'Con grupo, doble par, full o póker, la mitad del daño salpica a las otras torres.',
    rarity: 'oficio',
    arch: 'sismo',
    box: 'sismo',
    kind: 'p',
    strike: (x) => {
      if (!GROUPS.includes(x.formation)) return;
      x.splashPct += 0.5;
      x.note('la mitad salpica');
    },
  },
  { id: 'timbre', name: 'Timbre del gremio', desc: 'Los sellos de las cartas se activan dos veces.', rarity: 'reliquia', arch: 'sismo', box: 'sismo', kind: 'p', cfg: (c) => void (c.sealTwice = true) },

  // ───────── alquimia de materiales ─────────
  { id: 'prisma', name: 'Prisma', desc: '+0,5 de Resonancia por cada carta del golpe que comparta palo con otra (hasta +2).', rarity: 'oficio', arch: 'alquimia', kind: 'r', strike: (x) => x.R(Math.min(2, 0.5 * x.cards.filter((c) => x.cards.some((o) => o !== c && o.suit === c.suit)).length)) },
  { id: 'mosaico', name: 'Mosaico', desc: '+10 de Fuerza si el golpe mezcla 3 palos o más.', rarity: 'oficio', arch: 'alquimia', box: 'alquimia', kind: 'f', strike: (x) => x.poly && x.F(10) },
  { id: 'crisol', name: 'Crisol', desc: 'La fractura multiplica ×2 y los golpes de 3 palos también dejan fractura.', rarity: 'capataz', arch: 'alquimia', box: 'alquimia', kind: 'p', cfg: (c) => void ((c.fracturaMult = 2), (c.polyFractura = true)) },
  { id: 'catalizador', name: 'Catalizador', desc: '×1,5 de Resonancia por cada torre con fractura, apuntalada o desarmada ×1 (se suman).', rarity: 'reliquia', arch: 'alquimia', box: 'alquimia', kind: 'x', strike: (x) => x.X(1 + 0.5 * fx(x)) },

  // ───────── búnker al límite ─────────
  { id: 'sismografo', name: 'Sismógrafo', desc: '+0,1 de Resonancia por cada punto de integridad que le falte al búnker.', rarity: 'oficio', arch: 'limite', kind: 'r', strike: (x) => x.R(0.1 * Math.max(0, x.cfg.maxIntegrity - x.env.integrity)) },
  { id: 'megafono', name: 'Megáfono', desc: 'Cuando la sirena daña al búnker, la torre que golpeó recibe 8.', rarity: 'oficio', arch: 'limite', box: 'limite', kind: 'p', siren: (h, _, s) => s.taken > 0 && h.hit(s.tower, 8) },
  {
    id: 'piquete',
    name: 'Piquete',
    desc: 'Cada huelga (comodín): +3 de oro y robas 2 cartas.',
    rarity: 'oficio',
    arch: 'limite',
    box: 'limite',
    kind: 'p',
    joker: (h) => {
      h.gold(3);
      h.draw(2);
    },
  },
  { id: 'ultimo', name: 'Último turno', desc: '×2 de Resonancia con el búnker a la mitad o menos.', rarity: 'capataz', arch: 'limite', box: 'limite', kind: 'x', strike: (x) => x.env.integrity * 2 <= x.cfg.maxIntegrity && x.X(2) },
  {
    id: 'corazon',
    name: 'Corazón de la torre',
    desc: '×2 de Resonancia. Si el golpe no derriba ningún piso, le cuesta 1 al búnker.',
    rarity: 'reliquia',
    arch: 'limite',
    box: 'limite',
    kind: 'x',
    strike: (x) => void x.X(2),
    after: (x, _, r) => r.fallen === 0 && (x.hurt += 1) && x.note('el búnker pierde 1'),
  },

  // ───────── trituradora ─────────
  {
    id: 'trituradora',
    name: 'Trituradora',
    desc: 'Al descartar, la primera carta se destruye: sale del mazo para siempre.',
    rarity: 'oficio',
    arch: 'trituradora',
    kind: 'p',
    discard: (h, _, cards) => {
      const victim = cards.find((c) => c.suit !== 'X');
      if (victim) h.burn(victim);
    },
  },
  { id: 'montacargas', name: 'Montacargas', desc: '+2 de Fuerza por cada carta destruida en la campaña.', rarity: 'oficio', arch: 'trituradora', kind: 'f', strike: (x) => x.F(2 * x.env.scrap) },
  { id: 'horno', name: 'Horno', desc: 'Cada carta destruida: +2 de oro.', rarity: 'comun', arch: 'trituradora', box: 'trituradora', kind: 'p', burn: (h) => h.gold(2) },
  { id: 'contenedor', name: 'Contenedor', desc: 'Las cartas que descartas no vuelven en esta obra, y cada una da +6 de Fuerza a tu próximo golpe.', rarity: 'oficio', arch: 'trituradora', box: 'trituradora', kind: 'p', cfg: (c) => void (c.discardExhaust = (c.discardExhaust ?? 0) + 6) },
  { id: 'prensa', name: 'Prensa de chatarra', desc: '×1,05 de Resonancia por cada carta destruida en la campaña (se suman: 4 cartas, ×1,2).', rarity: 'capataz', arch: 'trituradora', box: 'trituradora', kind: 'x', strike: (x) => x.X(1 + 0.05 * x.env.scrap) },
];
export const TOOL: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
export const BOXES: Arch[] = ['precision', 'sismo', 'alquimia', 'limite', 'trituradora'];
export const TOOL_SLOTS = 6;

/** Herramientas que entran en el surtido según las cajas del gremio abiertas. */
export const toolPool = (boxes: Arch[]): string[] => TOOLS.filter((t) => !t.box || boxes.includes(t.box)).map((t) => t.id);

/** Orden recomendado del cinturón: primero lo que suma Fuerza, luego lo que suma Resonancia y al final lo que multiplica. */
export function bestOrder(tools: ToolInst[]): number[] {
  const rank = { p: 0, f: 1, r: 2, x: 3, copy: 3 } as const;
  const order = tools.map((_, i) => i).sort((a, b) => rank[TOOL[tools[a].id]?.kind ?? 'p'] - rank[TOOL[tools[b].id]?.kind ?? 'p'] || a - b);
  // el Diapasón rinde más justo a la izquierda del mejor multiplicador
  const copy = order.findIndex((i) => TOOL[tools[i].id]?.kind === 'copy');
  if (copy >= 0) {
    const [c] = order.splice(copy, 1);
    const target = order.findIndex((i) => TOOL[tools[i].id]?.kind === 'x');
    if (target >= 0) order.splice(target, 0, c);
    else {
      const anyStrike = order.findIndex((i) => TOOL[tools[i].id]?.strike);
      order.splice(anyStrike >= 0 ? anyStrike : order.length, 0, c);
    }
  }
  return order;
}
