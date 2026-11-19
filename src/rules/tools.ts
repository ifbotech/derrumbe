// V40 1d · Los Amuletos (en el código, «herramientas»: `TOOLS`, `run.tools`). Sustituyen a las 52 Reliquias: 22 en
// cuatro familias, una por Rey (SPECS/V40-REFUNDACION.md, apartado 6). Cada Amuleto ocupa un hueco, hace una sola cosa
// (una línea con su cifra) y cuenta como pieza de su Rey para los niveles [2/4] (`nivelesReyes` en reyes.ts).
//
//   Espadas  filo: Daño con Espadas, carta sola y Golpe exacto        Bastos  Escudo y frenar el Contraataque
//   Oros     oro, naipes (grupos), el Comodín y el dado              Copas   curar, Vida, escaleras y la mano
//
// Los `id` de datos son los de las Reliquias de antes con la misma mecánica (no se renombran: la Colección y la maestría
// guardadas siguen valiendo); cambian el nombre, el texto, la familia y la cifra. El orden no cambia la cuenta: primero
// se suma todo el Daño y todo el Multi y al final se aplican los multiplicadores (×Multi). Cada Amuleto nuevo va al final.
import type { Card, Config, Formation, Hook, Outcome, Strike, Suit } from './engine';
import type { MazoId } from './mazos';
import type { ReyId } from './reyes';
import { BALANCE, fill, relic } from './balance-config';

/** Una herramienta equipada. `n` es su contador propio (las que crecen lo usan). */
export interface ToolInst {
  id: string;
  n: number;
}

export type Rarity = 'comun' | 'oficio' | 'capataz' | 'reliquia';
/** V40 1d · La familia de un Amuleto: su Rey. */
export type Arch = ReyId;
/** Nombre de cada rareza; su precio en La Pulpería y su peso en el sorteo salen de balance-config.json. */
const RARITY_NAME: Record<Rarity, string> = { comun: 'Común', oficio: 'Raro', capataz: 'Noble', reliquia: 'Regio' };
export const RARITY: Record<Rarity, { name: string; cost: number; weight: number }> = Object.fromEntries(
  (Object.keys(RARITY_NAME) as Rarity[]).map((r) => [r, { name: RARITY_NAME[r], ...BALANCE.taberna.rarezas[r] }]),
) as Record<Rarity, { name: string; cost: number; weight: number }>;
export const ARCH: Record<Arch, string> = { espadas: 'Espadas', bastos: 'Bastos', oros: 'Oros', copas: 'Copas' };

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
  /** Su familia: el Rey del que es pieza (cuenta para sus niveles [2/4]). */
  arch: Arch;
  /** Arcón del Altar que lo añade al surtido (el de su Rey). Sin arcón: disponible desde la primera campaña. */
  box?: Arch;
  /** Los Mazos con los que encaja (★ Para Escoba…; ver `sinergia` en piezas.ts). */
  mazos?: MazoId[];
  /** Necesita el dado de cada turno (como la Taba cargada). */
  dado?: true;
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

// Las cifras de cada Amuleto salen de balance-config.json (`reliquias.<id>`): `V.<id>.<campo>`. Las `desc`
// son plantillas: `{campo}` se rellena con esa misma cifra al final del archivo.
const V = BALANCE.reliquias;

export const TOOLS: ToolDef[] = ([
  // ───────── Rey de Espadas: filo, carta sola y Golpe exacto ─────────
  { id: 'piqueta', name: 'Cuchillo criollo', desc: '+{dano} de Daño por cada carta de Espadas del golpe.', rarity: 'comun', arch: 'espadas', kind: 'f', mazos: ['truco'], strike: perSuit('S', V.piqueta.dano) },
  { id: 'cincel', name: 'Cortaplumas', desc: '+{dano} de Daño si jugás una carta sola.', rarity: 'oficio', arch: 'espadas', kind: 'f', strike: (x) => x.cards.length === 1 && x.F(V.cincel.dano) },
  {
    id: 'calibre',
    name: 'Piedra de afilar',
    desc: 'Cada Golpe exacto le suma +{dano} de Daño para siempre.',
    rarity: 'capataz',
    arch: 'espadas',
    kind: 'f',
    mazos: ['escoba'],
    strike: (x, self) => x.F(V.calibre.dano * self.n),
    after: (x, self, r) => r.clean && ++self.n && x.note('crece'),
    count: (self) => `+${V.calibre.dano * self.n}`,
  },
  {
    id: 'cizalla',
    name: 'Tijera de esquila',
    desc: 'Tras un Golpe exacto, el guardia siguiente pierde la mitad de su Vida.',
    rarity: 'capataz',
    arch: 'espadas',
    box: 'espadas',
    kind: 'p',
    mazos: ['escoba'],
    after: (x, _, r) => {
      for (const f of r.fell) if (f.clean) x.extra.push({ tower: f.tower, pct: 0.5 });
      if (r.clean) x.note('corta al guardia siguiente');
    },
  },
  { id: 'plano_maestro', name: 'Facón de plata', desc: '×{multi} de Multi en el primer golpe contra cada guardia.', rarity: 'reliquia', arch: 'espadas', box: 'espadas', kind: 'x', strike: (x) => x.env.towers[x.target].damage === 0 && x.X(V.plano_maestro.multi) },

  // ───────── Rey de Bastos: Escudo y frenar el Contraataque ─────────
  { id: 'maza', name: 'Rebenque', desc: '+{dano} de Daño por cada carta de Bastos del golpe.', rarity: 'comun', arch: 'bastos', kind: 'f', mazos: ['truco'], strike: perSuit('C', V.maza.dano) },
  { id: 'sacos', name: 'Guardamonte', desc: 'Cada carta de Bastos da +{escudo} de Escudo más, y el tope del Escudo sube {tope}.', rarity: 'comun', arch: 'bastos', kind: 'p', cfg: (c) => void ((c.escudoPorCarta += V.sacos.escudo), (c.wallCap += V.sacos.tope)) },
  { id: 'encofrado', name: 'Poncho', desc: 'Cada guardia abatido: +{escudo} de Escudo.', rarity: 'oficio', arch: 'bastos', kind: 'p', mazos: ['chancho'], after: (x, _, r) => r.fallen > 0 && (x.wall += V.encofrado.escudo * r.fallen) && x.note(`+${V.encofrado.escudo * r.fallen} de Escudo`) },
  {
    id: 'contragolpe',
    name: 'Talero',
    desc: 'Si el Escudo frena entero un Contraataque, ese guardia recibe {factor} × lo frenado.',
    rarity: 'oficio',
    arch: 'bastos',
    box: 'bastos',
    kind: 'p',
    siren: (h, _, s) => s.taken === 0 && s.blocked > 0 && h.hit(s.tower, V.contragolpe.factor * s.blocked, `${V.contragolpe.factor} × ${s.blocked} frenado`),
  },
  { id: 'sordina', name: 'Boleadoras', desc: 'El Ataque de todos los guardias baja {ataque}.', rarity: 'capataz', arch: 'bastos', box: 'bastos', kind: 'p', cfg: (c) => void Object.keys(c.floorThreat).forEach((r) => (c.floorThreat[+r] = Math.max(1, c.floorThreat[+r] - V.sordina.ataque))) },

  // ───────── Rey de Oros: oro, naipes, el Comodín y el dado ─────────
  { id: 'cortavidrios', name: 'Moneda falsa', desc: '+{dano} de Daño por cada carta de Oros del golpe.', rarity: 'comun', arch: 'oros', kind: 'f', mazos: ['truco'], strike: perSuit('D', V.cortavidrios.dano) },
  { id: 'hucha', name: 'Alcancía', desc: '+{oro} de oro al cerrar cada asalto ganado.', rarity: 'comun', arch: 'oros', kind: 'p' },
  { id: 'gemelos', name: 'Naipes marcados', desc: '+{multi} de Multi con grupo, doble par, full o póker.', rarity: 'oficio', arch: 'oros', box: 'oros', kind: 'r', mazos: ['chinchon', 'chancho'], strike: (x) => GROUPS.includes(x.formation) && x.R(V.gemelos.multi) },
  {
    id: 'piquete',
    name: 'Farol',
    desc: 'Cada Comodín que jugás: +{oro} de oro y robás {cartas} cartas.',
    rarity: 'oficio',
    arch: 'oros',
    kind: 'p',
    mazos: ['mentiroso'],
    joker: (h) => {
      h.gold(V.piquete.oro);
      h.draw(V.piquete.cartas);
    },
  },
  { id: 'dados', name: 'Cubilete', desc: 'Cada turno se tira un dado: con {cara} o más, +{multi} de Multi.', rarity: 'oficio', arch: 'oros', box: 'oros', kind: 'r', dado: true, strike: (x) => (x.env.dado ?? 0) >= V.dados.cara && x.R(V.dados.multi) },
  {
    id: 'dinamita',
    name: 'Cañita voladora',
    desc: 'Cada guardia abatido: los otros tronos reciben {dano}.',
    rarity: 'capataz',
    arch: 'oros',
    box: 'oros',
    kind: 'p',
    mazos: ['chancho'],
    after: (x, _, r) => {
      for (const f of r.fell) for (const t of Object.values(x.env.towers)) if (t.suit !== f.tower && t.floors.length) x.burst.push({ tower: t.suit, n: V.dinamita.dano });
      if (r.fallen > 0) x.note(`${V.dinamita.dano * r.fallen} a los otros tronos`);
    },
  },

  // ───────── Rey de Copas: curar, Vida, escaleras y la mano ─────────
  { id: 'paleta', name: 'Mate curado', desc: '+{dano} de Daño por cada carta de Copas del golpe.', rarity: 'comun', arch: 'copas', kind: 'f', strike: perSuit('H', V.paleta.dano) },
  { id: 'botiquin', name: 'Bota de vino', desc: 'Cada carta de Copas cura +{vida} más.', rarity: 'comun', arch: 'copas', kind: 'p', cfg: (c) => void (c.curaPorCarta += V.botiquin.vida) },
  { id: 'casco', name: 'Asado', desc: 'Cada guardia abatido: +{vida} de Vida.', rarity: 'oficio', arch: 'copas', kind: 'p', after: (x, _, r) => r.fallen > 0 && (x.heal += V.casco.vida * r.fallen) && x.note(`+${V.casco.vida * r.fallen} de Vida`) },
  { id: 'cinta', name: 'Guitarra', desc: '+{multi} de Multi con escalera o escalera de color.', rarity: 'oficio', arch: 'copas', box: 'copas', kind: 'r', mazos: ['chinchon'], strike: (x) => RUNS.includes(x.formation) && x.R(V.cinta.multi) },
  { id: 'ultimo', name: 'Último trago', desc: '×{multi} de Multi si tu Vida está al 50 % o menos.', rarity: 'capataz', arch: 'copas', box: 'copas', kind: 'x', strike: (x) => x.env.integrity * 2 <= x.cfg.maxIntegrity && x.X(V.ultimo.multi) },
  { id: 'andamio', name: 'Alpargatas', desc: '+{cartas} carta en la mano.', rarity: 'reliquia', arch: 'copas', box: 'copas', kind: 'p', cfg: (c) => hand(c, V.andamio.cartas) },
] as ToolDef[]);
/** Cifras derivadas que algunas plantillas enseñan (ejemplos ya calculados). */
const DERIVED: Record<string, Record<string, number>> = {};
for (const t of TOOLS) t.desc = fill(t.desc, { ...relic(t.id), ...DERIVED[t.id] });
export const TOOL: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

/** Los cuatro arcones del Altar, uno por Rey. */
export const BOXES: Arch[] = ['espadas', 'bastos', 'oros', 'copas'];
/**
 * V40 1d · Huecos de Amuleto de serie. La Faja ancha del Altar (nodo `tienda`) suma uno por nivel: ver `toolSlots` en
 * run.ts, que es la cuenta que vale en campaña.
 */
export const TOOL_SLOTS = 4;
/** Huecos de Amuleto con `faja` niveles de la Faja ancha del Altar. */
export const huecosAmuleto = (faja: number) => TOOL_SLOTS + Math.max(0, Math.floor(faja || 0));

/** Amuletos que entran en el surtido según los arcones del Altar abiertos. */
export const toolPool = (boxes: Arch[]): string[] => TOOLS.filter((t) => !t.box || boxes.includes(t.box)).map((t) => t.id);

/**
 * V34 · La Reliquia que copia el Espejo de mano: la más reciente de la tira que no sea pasiva ni otro Espejo.
 * undefined si no hay ninguna.
 */
export function espejada(tools: ToolInst[]): ToolInst | undefined {
  for (let i = tools.length - 1; i >= 0; i--) {
    const d = TOOL[tools[i].id];
    if (d && d.kind !== 'copy' && d.kind !== 'p' && d.strike) return tools[i];
  }
  return undefined;
}

/**
 * V34 · Una Reliquia nueva va al final de la tira y ahí se queda: las Reliquias no se ordenan (ninguna depende de su
 * hueco; el Espejo de mano copia la más reciente). Devuelve el hueco en el que queda.
 */
export function placeTool(tools: ToolInst[], nueva: ToolInst): number {
  tools.push(nueva);
  return tools.length - 1;
}
