// Reliquias (en el código, «herramientas» del cinturón). Cada una ocupa un hueco y se evalúa de izquierda a
// derecha: las que suman Daño o Multi actúan donde están, y las que multiplican (×Multi) multiplican todo
// lo acumulado a su izquierda. Por eso el orden importa y se puede cambiar.
//
// Cinco arquetipos se cruzan entre sí:
//   precision    golpes limpios y rachas
//   sismo        repeticiones, copias y daño en área
//   alquimia     mezcla de materiales y estados de las torres
//   limite       convertir el peligro del búnker en potencia
//   trituradora  destruir y agotar cartas para adelgazar el mazo y cebar la chatarra
//   aguante      convertir la defensa (muro y reparación) en remate
import type { Card, Config, Formation, Hook, Outcome, Strike, Suit } from './engine';
import { BALANCE, fill, relic } from './balance-config';

/** Una herramienta equipada. `n` es su contador propio (las que crecen lo usan). */
export interface ToolInst {
  id: string;
  n: number;
}

export type Rarity = 'comun' | 'oficio' | 'capataz' | 'reliquia';
export type Arch = 'base' | 'precision' | 'sismo' | 'alquimia' | 'limite' | 'trituradora' | 'aguante';
/** Nombre de cada rareza; su precio en La Taberna y su peso en el sorteo salen de balance-config.json. */
const RARITY_NAME: Record<Rarity, string> = { comun: 'Común', oficio: 'Rara', capataz: 'Noble', reliquia: 'Regia' };
export const RARITY: Record<Rarity, { name: string; cost: number; weight: number }> = Object.fromEntries(
  (Object.keys(RARITY_NAME) as Rarity[]).map((r) => [r, { name: RARITY_NAME[r], ...BALANCE.taberna.rarezas[r] }]),
) as Record<Rarity, { name: string; cost: number; weight: number }>;
export const ARCH: Record<Arch, string> = {
  base: 'El Arsenal',
  precision: 'Mano precisa',
  sismo: 'Eco y repetición',
  alquimia: 'Alquimia de palos',
  limite: 'Vida al filo',
  trituradora: 'Fuego y ceniza',
  aguante: 'Escudo y réplica',
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
  /** Sonora: la Fuerza que suma en un golpe sale con aviso (`proc`) para que la mesa la anuncie sobre la herramienta. */
  loud?: boolean;
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

// Las cifras de cada reliquia salen de balance-config.json (`reliquias.<id>`): `V.<id>.<campo>`. Las `desc`
// son plantillas: `{campo}` se rellena con esa misma cifra al final del archivo.
const V = BALANCE.reliquias;

export const TOOLS: ToolDef[] = [
  // ───────── obra general ─────────
  { id: 'piqueta', name: 'Daga de Picas', desc: '+{dano} de Daño por cada ♠ que juegues.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('S', V.piqueta.dano) },
  { id: 'cortavidrios', name: 'Anillo de Diamantes', desc: '+{dano} de Daño por cada ♦ que juegues.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('D', V.cortavidrios.dano) },
  { id: 'paleta', name: 'Cáliz de Corazones', desc: '+{dano} de Daño por cada ♥ que juegues.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('H', V.paleta.dano) },
  { id: 'maza', name: 'Maza de Tréboles', desc: '+{dano} de Daño por cada ♣ que juegues.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('C', V.maza.dano) },
  { id: 'cincel', name: 'Estilete', desc: '+{dano} de Daño si juegas una carta sola.', rarity: 'comun', arch: 'base', kind: 'f', strike: (x) => x.cards.length === 1 && x.F(V.cincel.dano) },
  { id: 'gemelos', name: 'Dagas gemelas', desc: '+{multi} de Multi con grupo, doble par, full o póker.', rarity: 'comun', arch: 'base', kind: 'r', strike: (x) => GROUPS.includes(x.formation) && x.R(V.gemelos.multi) },
  { id: 'cinta', name: 'Escalinata', desc: '+{multi} de Multi con escalera o escalera de color.', rarity: 'comun', arch: 'base', kind: 'r', strike: (x) => RUNS.includes(x.formation) && x.R(V.cinta.multi) },
  { id: 'sacos', name: 'Pavés', desc: 'El Escudo sube la mitad de tus ♣ en vez de un tercio, y su tope crece +{tope}.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void ((c.wallDiv = 2), (c.wallCap += V.sacos.tope)) },
  { id: 'botiquin', name: 'Bálsamo', desc: 'Curas la mitad de tus ♥ en vez de un tercio.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void (c.repairDiv = Math.min(c.repairDiv, 2)) },
  { id: 'encofrado', name: 'Broquel', desc: 'Cada guardia abatido: +{escudo} de Escudo.', rarity: 'comun', arch: 'base', kind: 'p', after: (x, _, r) => r.fallen > 0 && (x.wall += V.encofrado.escudo * r.fallen) && x.note(`+${V.encofrado.escudo * r.fallen} de Escudo`) },
  { id: 'casco', name: 'Yelmo', desc: 'Cada guardia abatido: +{vida} de Vida.', rarity: 'comun', arch: 'base', kind: 'p', after: (x, _, r) => r.fallen > 0 && (x.heal += V.casco.vida * r.fallen) && x.note(`+${V.casco.vida * r.fallen} de Vida`) },
  { id: 'puntales', name: 'Baraja de reserva', desc: 'Cuando se agota el Mazo, pierdes {vida} de Vida menos.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void (c.collapseLoss = Math.max(0, c.collapseLoss - V.puntales.vida)) },
  { id: 'hucha', name: 'Bolsa de monedas', desc: '+{oro} de oro al terminar cada asalto.', rarity: 'comun', arch: 'base', kind: 'p' },
  { id: 'taladro', name: 'Lanza', desc: 'Todos tus golpes Perforan, lleven o no ♠.', rarity: 'oficio', arch: 'base', kind: 'p', cfg: (c) => void (c.alwaysPierce = true) },
  { id: 'estandarte', name: 'Estandarte', desc: '+{multi} de Multi con color o escalera de color.', rarity: 'oficio', arch: 'base', kind: 'r', strike: (x) => (x.formation === 'color' || x.formation === 'escaleracolor') && x.R(V.estandarte.multi) },
  { id: 'dados', name: 'Dados cargados', desc: '+{multi} de Multi con doble par o full.', rarity: 'oficio', arch: 'base', kind: 'r', strike: (x) => (x.formation === 'doblepar' || x.formation === 'full') && x.R(V.dados.multi) },
  { id: 'dinamita', name: 'Barril de pólvora', desc: 'La ventaja de palo multiplica ×3 en vez de ×2.', rarity: 'capataz', arch: 'base', box: 'sismo', kind: 'p', cfg: (c) => void (c.advMult = (c.advMult ?? 2) + 1) },
  { id: 'acido', name: 'Gota de veneno', desc: 'Ningún trono es Inmune: tus cartas pegan ×1 contra el trono de su palo.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => void (c.ownMult = 1) },
  { id: 'andamio', name: 'Guantelete', desc: '+{cartas} carta en la mano.', rarity: 'capataz', arch: 'base', box: 'aguante', kind: 'p', cfg: (c) => hand(c, V.andamio.cartas) },
  { id: 'pasarela', name: 'Manga doble', desc: '+1 hueco en La Manga: guardas dos cartas aparte de la mano.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => void (c.reserveSize = (c.reserveSize ?? 1) + 1) },
  { id: 'contrapeso', name: 'Máscara de traidor', desc: 'Inmune se invierte: las cartas del palo del trono pegan con ventaja contra él.', rarity: 'reliquia', arch: 'base', kind: 'p', cfg: (c) => void (c.ownMult = c.advMult ?? 2) },
  { id: 'sordina', name: 'Pócima de sueño', desc: 'El Ataque de todos los guardias baja {ataque}.', rarity: 'capataz', arch: 'base', box: 'limite', kind: 'p', cfg: (c) => void [11, 12, 13].forEach((r) => (c.floorThreat[r] = Math.max(1, c.floorThreat[r] - V.sordina.ataque))) },
  { id: 'plano_maestro', name: 'Llave maestra', desc: '×{multi} de Multi en el primer golpe contra cada guardia.', rarity: 'reliquia', arch: 'base', box: 'precision', kind: 'x', strike: (x) => x.env.towers[x.target].damage === 0 && x.X(V.plano_maestro.multi) },

  // ───────── precisión quirúrgica ─────────
  { id: 'plomada', name: 'Péndulo', desc: 'Cada Golpe exacto: +{vida} de Vida.', rarity: 'comun', arch: 'precision', kind: 'p', after: (x, _, r) => r.clean && (x.heal += V.plomada.vida) && x.note(`+${V.plomada.vida} de Vida`) },
  { id: 'nivel', name: 'Balanza', desc: 'El Golpe exacto admite un margen de ±{margen}.', rarity: 'oficio', arch: 'precision', kind: 'p', cfg: (c) => void (c.cleanTol = (c.cleanTol ?? 0) + V.nivel.margen) },
  { id: 'tiralineas', name: 'Ganzúa', desc: 'Cada Golpe exacto: +{oro} de oro.', rarity: 'comun', arch: 'precision', box: 'precision', kind: 'p', after: (x, _, r) => r.clean && (x.gold += V.tiralineas.oro) && x.note(`+${V.tiralineas.oro} de oro`) },
  {
    id: 'calibre',
    name: 'Compás',
    desc: 'Gana +{multi} de Multi para siempre con cada Golpe exacto.',
    rarity: 'oficio',
    arch: 'precision',
    box: 'precision',
    kind: 'r',
    strike: (x, self) => x.R(V.calibre.multi * self.n),
    after: (x, self, r) => r.clean && ++self.n && x.note('crece'),
    count: (self) => `+${(V.calibre.multi * self.n).toFixed(2).replace(/0$/, '').replace('.', ',')}`,
  },
  {
    id: 'cizalla',
    name: 'Tijeras de sastre',
    desc: 'Tras un Golpe exacto, el guardia siguiente pierde la mitad de su Vida.',
    rarity: 'capataz',
    arch: 'precision',
    box: 'precision',
    kind: 'p',
    after: (x, _, r) => {
      for (const f of r.fell) if (f.clean) x.extra.push({ tower: f.tower, pct: 0.5 });
      if (r.clean) x.note('corta al guardia siguiente');
    },
  },

  // ───────── sismo y vibración ─────────
  { id: 'metralla', name: 'Collar roto', desc: 'Salpica hace la mitad de tus ♦ en vez de un tercio.', rarity: 'oficio', arch: 'sismo', kind: 'p', cfg: (c) => void (c.shardDiv = 2) },
  { id: 'percutor', name: 'Campana', desc: 'Vuelve a activar la primera carta del golpe.', rarity: 'oficio', arch: 'sismo', kind: 'f', strike: (x) => x.F(x.impacts[0] ?? 0) },
  { id: 'resonador', name: 'Cuerno de guerra', desc: '×{multi} de Multi si juegas {cartas} cartas o más.', rarity: 'capataz', arch: 'sismo', kind: 'x', strike: (x) => x.cards.length >= V.resonador.cartas && x.X(V.resonador.multi) },
  { id: 'diapason', name: 'Espejo de mano', desc: 'Copia la reliquia que tenga a su derecha.', rarity: 'oficio', arch: 'sismo', box: 'sismo', kind: 'copy' },
  {
    id: 'vibrador',
    name: 'Tambor de guerra',
    desc: 'Con grupo, doble par, full o póker, la mitad del Golpe salpica a los otros tronos.',
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
  { id: 'timbre', name: 'Anillo de sello', desc: 'Al empezar cada asalto, sella {sellos} carta de tu Mazo al azar. Los sellos se activan dos veces.', rarity: 'reliquia', arch: 'sismo', box: 'sismo', kind: 'p', cfg: (c) => void (c.sealTwice = true) },

  // ───────── alquimia de materiales ─────────
  { id: 'prisma', name: 'Prisma', desc: '+{multi} de Multi por cada carta del golpe que comparta palo con otra (hasta +{tope}).', rarity: 'oficio', arch: 'alquimia', kind: 'r', strike: (x) => x.R(Math.min(V.prisma.tope, V.prisma.multi * x.cards.filter((c) => x.cards.some((o) => o !== c && o.suit === c.suit)).length)) },
  { id: 'mosaico', name: 'Vitral', desc: '+{dano} de Daño si el golpe mezcla 3 palos o más.', rarity: 'oficio', arch: 'alquimia', box: 'alquimia', kind: 'f', strike: (x) => x.poly && x.F(V.mosaico.dano) },
  { id: 'crisol', name: 'Caldero', desc: 'La Brecha multiplica ×{multi}, y los golpes de 3 palos también dejan Brecha.', rarity: 'capataz', arch: 'alquimia', box: 'alquimia', kind: 'p', cfg: (c) => void ((c.fracturaMult = V.crisol.multi), (c.polyFractura = true)) },
  { id: 'catalizador', name: 'Piedra filosofal', desc: '×{multi} de Multi por cada trono con Brecha, En guardia o Desarmado ×1 (se suman).', rarity: 'reliquia', arch: 'alquimia', box: 'alquimia', kind: 'x', strike: (x) => x.X(1 + (V.catalizador.multi - 1) * fx(x)) },

  // ───────── búnker al límite ─────────
  { id: 'sismografo', name: 'Vela gastada', desc: '+{multi} de Multi por cada punto de Vida que te falte.', rarity: 'oficio', arch: 'limite', kind: 'r', strike: (x) => x.R(V.sismografo.multi * Math.max(0, x.cfg.maxIntegrity - x.env.integrity)) },
  { id: 'megafono', name: 'Rosa de espinas', desc: 'Cuando un Contraataque te quita Vida, el trono que atacó recibe {dano}.', rarity: 'oficio', arch: 'limite', box: 'limite', kind: 'p', siren: (h, _, s) => s.taken > 0 && h.hit(s.tower, V.megafono.dano) },
  {
    id: 'piquete',
    name: 'Antorcha',
    desc: 'Cada Motín (Comodín): +{oro} de oro y robas {cartas} cartas.',
    rarity: 'oficio',
    arch: 'limite',
    box: 'limite',
    kind: 'p',
    joker: (h) => {
      h.gold(V.piquete.oro);
      h.draw(V.piquete.cartas);
    },
  },
  { id: 'ultimo', name: 'Último aliento', desc: '×{multi} de Multi si tu Vida está al 50 % o menos.', rarity: 'capataz', arch: 'limite', box: 'limite', kind: 'x', strike: (x) => x.env.integrity * 2 <= x.cfg.maxIntegrity && x.X(V.ultimo.multi) },
  {
    id: 'corazon',
    name: 'Corazón de piedra',
    desc: '×{multi} de Multi. Si el golpe no abate a ningún guardia, pierdes {vida} de Vida.',
    rarity: 'reliquia',
    arch: 'limite',
    box: 'limite',
    kind: 'x',
    strike: (x) => void x.X(V.corazon.multi),
    after: (x, _, r) => r.fallen === 0 && (x.hurt += V.corazon.vida) && x.note(`pierdes ${V.corazon.vida} de Vida`),
  },

  // ───────── trituradora ─────────
  {
    id: 'trituradora',
    name: 'Brasero',
    desc: 'Al descartar, la primera carta arde: sale de tu Mazo para siempre.',
    rarity: 'oficio',
    arch: 'trituradora',
    kind: 'p',
    discard: (h, _, cards) => {
      const victim = cards.find((c) => c.suit !== 'X');
      if (victim) h.burn(victim);
    },
  },
  { id: 'montacargas', name: 'Urna de cenizas', desc: '+{dano} de Daño por cada carta quemada en la campaña.', rarity: 'oficio', arch: 'trituradora', kind: 'f', strike: (x) => x.F(V.montacargas.dano * x.env.scrap) },
  { id: 'horno', name: 'Fuelle', desc: '+{oro} de oro cada vez que arde una carta en un asalto (Brasero, Cristal maldito).', rarity: 'comun', arch: 'trituradora', box: 'trituradora', kind: 'p', burn: (h) => h.gold(V.horno.oro) },
  { id: 'contenedor', name: 'Cofre cerrado', desc: 'Lo que descartas no vuelve en este asalto, y cada carta da +{dano} de Daño a tu próximo golpe.', rarity: 'oficio', arch: 'trituradora', box: 'trituradora', kind: 'p', cfg: (c) => void (c.discardExhaust = (c.discardExhaust ?? 0) + V.contenedor.dano) },
  { id: 'prensa', name: 'Cetro de ceniza', desc: '×{x1} de Multi por cada carta quemada en la campaña (se suman: 4 cartas, ×{x4}).', rarity: 'capataz', arch: 'trituradora', box: 'trituradora', kind: 'x', strike: (x) => x.X(1 + V.prensa.multi * x.env.scrap) },
  // ── aguante: la defensa se cobra en daño ──
  { id: 'ariete', name: 'Ariete', desc: '+{dano} de Daño por cada punto de Escudo en pie.', rarity: 'oficio', arch: 'aguante', box: 'aguante', kind: 'f', loud: true, strike: (x) => x.env.wall > 0 && x.F(V.ariete.dano * x.env.wall) },
  {
    id: 'contragolpe',
    name: 'Rodela de púas',
    desc: 'Si el Escudo frena entero un Contraataque, su trono recibe {factor} × lo frenado. Ej.: frena 4 → recibe {ej}.',
    rarity: 'oficio',
    arch: 'aguante',
    box: 'aguante',
    kind: 'p',
    siren: (h, _, s) => s.taken === 0 && s.blocked > 0 && h.hit(s.tower, V.contragolpe.factor * s.blocked, `${V.contragolpe.factor} × ${s.blocked} frenado`),
  },
  {
    id: 'rebosadero',
    name: 'Copa rebosante',
    desc: 'Escudo que no cabe: cada {escudo} curan 1. Cura que no cabe: +{dano} de Daño por punto a tu próximo golpe.',
    rarity: 'oficio',
    arch: 'aguante',
    box: 'aguante',
    kind: 'p',
    cfg: (c) => void ((c.overhealCharge = (c.overhealCharge ?? 0) + V.rebosadero.dano), (c.overwallRepair = V.rebosadero.escudo)),
  },
  { id: 'bastion', name: 'Baluarte', desc: '×{multi} de Multi con el Escudo al 50 % de su tope o más.', rarity: 'capataz', arch: 'aguante', box: 'aguante', kind: 'x', strike: (x) => x.env.wall > 0 && x.env.wall * 2 >= x.cfg.wallCap && x.X(V.bastion.multi) },
];
/** Cifras derivadas que algunas plantillas enseñan (ejemplos ya calculados). */
const DERIVED: Record<string, Record<string, number>> = {
  timbre: { sellos: BALANCE.timbre.stamps },
  prensa: { x1: 1 + V.prensa.multi, x4: 1 + 4 * V.prensa.multi },
  contragolpe: { ej: 4 * V.contragolpe.factor },
};
for (const t of TOOLS) t.desc = fill(t.desc, { ...relic(t.id), ...DERIVED[t.id] });
export const TOOL: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
export const BOXES: Arch[] = ['precision', 'sismo', 'alquimia', 'limite', 'trituradora', 'aguante'];
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
