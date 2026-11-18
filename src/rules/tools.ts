// Reliquias (en el código, «herramientas» del cinturón). Cada una ocupa un hueco. Desde la 31.0 su orden no cambia
// la cuenta: primero se suma todo el Daño y todo el Multi, y al final se aplican los multiplicadores (×Multi). Desde
// la 34.0 no se ordenan: cada Reliquia nueva va al final de la tira y el Espejo de mano copia la más reciente.
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

/** V35 · Los cinco rasgos de build. Cada Reliquia lleva uno; con 2, 4 y 6 del mismo rasgo se activan sus bonos. */
export type Rasgo = 'sangre' | 'tahur' | 'verdugo' | 'bastion' | 'horda';
export const UMBRALES = [2, 4, 6] as const;
export interface RasgoDef {
  id: Rasgo;
  name: string;
  /** Su lema, bajo el nombre. */
  lema: string;
  /** Lo que da con 2, con 4 y con 6 Reliquias del rasgo (plantillas: las cifras salen de `rasgos` en balance-config.json). */
  bonos: [string, string, string];
}

export interface ToolDef {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  arch: Arch;
  /** V35 · Su rasgo de build (se rellena al final del archivo, de `RASGO_DE`). */
  rasgo: Rasgo;
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
/** Tronos en pie que están Expuestos o Aturdidos (cada trono cuenta una vez). */
const fx = (x: Strike) => Object.values(x.env.towers).filter((t) => t.floors.length && Object.values(t.fx).some(Boolean)).length;

// Las cifras de cada reliquia salen de balance-config.json (`reliquias.<id>`): `V.<id>.<campo>`. Las `desc`
// son plantillas: `{campo}` se rellena con esa misma cifra al final del archivo.
const V = BALANCE.reliquias;

export const TOOLS: ToolDef[] = ([
  // ───────── obra general ─────────
  { id: 'piqueta', name: 'Daga de Espadas', desc: '+{dano} de Daño por cada carta de Espadas que juegues.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('S', V.piqueta.dano) },
  { id: 'cortavidrios', name: 'Anillo de Oros', desc: '+{dano} de Daño por cada carta de Oros que juegues.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('D', V.cortavidrios.dano) },
  { id: 'paleta', name: 'Cáliz de Copas', desc: '+{dano} de Daño por cada carta de Copas que juegues.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('H', V.paleta.dano) },
  { id: 'maza', name: 'Maza de Bastos', desc: '+{dano} de Daño por cada carta de Bastos que juegues.', rarity: 'comun', arch: 'base', kind: 'f', strike: perSuit('C', V.maza.dano) },
  { id: 'cincel', name: 'Estilete', desc: '+{dano} de Daño si jugás una carta sola.', rarity: 'comun', arch: 'base', kind: 'f', strike: (x) => x.cards.length === 1 && x.F(V.cincel.dano) },
  { id: 'gemelos', name: 'Dagas gemelas', desc: '+{multi} de Multi con grupo, doble par, full o póker.', rarity: 'comun', arch: 'base', kind: 'r', strike: (x) => GROUPS.includes(x.formation) && x.R(V.gemelos.multi) },
  { id: 'cinta', name: 'Escalinata', desc: '+{multi} de Multi con escalera o escalera de color.', rarity: 'comun', arch: 'base', kind: 'r', strike: (x) => RUNS.includes(x.formation) && x.R(V.cinta.multi) },
  { id: 'sacos', name: 'Pavés', desc: 'Cada carta de Bastos da +{escudo} de Escudo más, y el tope del Escudo sube +{tope}.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void ((c.escudoPorCarta += V.sacos.escudo), (c.wallCap += V.sacos.tope)) },
  { id: 'botiquin', name: 'Bálsamo', desc: 'Cada carta de Copas cura +{vida} más.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void (c.curaPorCarta += V.botiquin.vida) },
  { id: 'encofrado', name: 'Broquel', desc: 'Cada guardia abatido: +{escudo} de Escudo.', rarity: 'comun', arch: 'base', kind: 'p', after: (x, _, r) => r.fallen > 0 && (x.wall += V.encofrado.escudo * r.fallen) && x.note(`+${V.encofrado.escudo * r.fallen} de Escudo`) },
  { id: 'casco', name: 'Yelmo', desc: 'Cada guardia abatido: +{vida} de Vida.', rarity: 'comun', arch: 'base', kind: 'p', after: (x, _, r) => r.fallen > 0 && (x.heal += V.casco.vida * r.fallen) && x.note(`+${V.casco.vida * r.fallen} de Vida`) },
  { id: 'puntales', name: 'Baraja de reserva', desc: '{gratis} Mazo agotado por asalto no sube la Furia.', rarity: 'comun', arch: 'base', kind: 'p', cfg: (c) => void (c.collapseFree = (c.collapseFree ?? 0) + V.puntales.gratis) },
  { id: 'hucha', name: 'Bolsa de monedas', desc: '+{oro} de oro al terminar cada asalto.', rarity: 'comun', arch: 'base', kind: 'p' },
  { id: 'taladro', name: 'Lanza', desc: 'Todos tus golpes Perforan, lleven o no Espadas.', rarity: 'oficio', arch: 'base', kind: 'p', cfg: (c) => void (c.alwaysPierce = true) },
  { id: 'estandarte', name: 'Estandarte', desc: '+{multi} de Multi con color o escalera de color.', rarity: 'oficio', arch: 'base', kind: 'r', strike: (x) => (x.formation === 'color' || x.formation === 'escaleracolor') && x.R(V.estandarte.multi) },
  { id: 'dados', name: 'Dados cargados', desc: '+{multi} de Multi con doble par o full.', rarity: 'oficio', arch: 'base', kind: 'r', strike: (x) => (x.formation === 'doblepar' || x.formation === 'full') && x.R(V.dados.multi) },
  {
    id: 'dinamita',
    name: 'Barril de pólvora',
    desc: 'Cada guardia abatido: los otros tronos reciben {dano}.',
    rarity: 'capataz',
    arch: 'base',
    box: 'sismo',
    kind: 'p',
    after: (x, _, r) => {
      for (const f of r.fell) for (const t of Object.values(x.env.towers)) if (t.suit !== f.tower && t.floors.length) x.burst.push({ tower: t.suit, n: V.dinamita.dano });
      if (r.fallen > 0) x.note(`${V.dinamita.dano * r.fallen} a los otros tronos`);
    },
  },
  { id: 'acido', name: 'Gota de veneno', desc: 'Ningún trono es Inmune: contra el trono de su palo, tus cartas hacen su Daño.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => void (c.ownMult = 1) },
  { id: 'andamio', name: 'Guantelete', desc: '+{cartas} carta en la mano.', rarity: 'capataz', arch: 'base', box: 'aguante', kind: 'p', cfg: (c) => hand(c, V.andamio.cartas) },
  { id: 'pasarela', name: 'Manga doble', desc: '+1 hueco en La Manga: guardás dos cartas aparte de la mano.', rarity: 'capataz', arch: 'base', kind: 'p', cfg: (c) => void (c.reserveSize = (c.reserveSize ?? 1) + 1) },
  { id: 'contrapeso', name: 'Máscara de traidor', desc: 'Inmune se invierte: contra el trono de su palo, tus cartas hacen el doble de Daño.', rarity: 'reliquia', arch: 'base', kind: 'p', cfg: (c) => void (c.ownMult = 2) },
  { id: 'sordina', name: 'Pócima de sueño', desc: 'El Ataque de todos los guardias baja {ataque}.', rarity: 'capataz', arch: 'base', box: 'limite', kind: 'p', cfg: (c) => void Object.keys(c.floorThreat).forEach((r) => (c.floorThreat[+r] = Math.max(1, c.floorThreat[+r] - V.sordina.ataque))) },
  { id: 'plano_maestro', name: 'Llave maestra', desc: '×{multi} de Multi en el primer golpe contra cada guardia.', rarity: 'reliquia', arch: 'base', box: 'precision', kind: 'x', strike: (x) => x.env.towers[x.target].damage === 0 && x.X(V.plano_maestro.multi) },

  // ───────── precisión quirúrgica ─────────
  { id: 'plomada', name: 'Péndulo', desc: 'Cada Golpe exacto: +{vida} de Vida.', rarity: 'comun', arch: 'precision', kind: 'p', after: (x, _, r) => r.clean && (x.heal += V.plomada.vida) && x.note(`+${V.plomada.vida} de Vida`) },
  { id: 'nivel', name: 'Balanza', desc: 'El Golpe exacto admite un margen de ±{margen}.', rarity: 'oficio', arch: 'precision', kind: 'p', cfg: (c) => void (c.cleanTol = (c.cleanTol ?? 0) + V.nivel.margen) },
  { id: 'tiralineas', name: 'Ganzúa', desc: 'Cada Golpe exacto: +{oro} de oro.', rarity: 'comun', arch: 'precision', box: 'precision', kind: 'p', after: (x, _, r) => r.clean && (x.gold += V.tiralineas.oro) && x.note(`+${V.tiralineas.oro} de oro`) },
  {
    id: 'calibre',
    name: 'Compás',
    desc: 'Gana +{dano} de Daño para siempre con cada Golpe exacto.',
    rarity: 'oficio',
    arch: 'precision',
    box: 'precision',
    kind: 'f',
    strike: (x, self) => x.F(V.calibre.dano * self.n),
    after: (x, self, r) => r.clean && ++self.n && x.note('crece'),
    count: (self) => `+${V.calibre.dano * self.n}`,
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
  { id: 'metralla', name: 'Collar roto', desc: 'Cada carta de Oros salpica +{dano} más a los otros tronos.', rarity: 'oficio', arch: 'sismo', kind: 'p', cfg: (c) => void (c.salpicaPorCarta += V.metralla.dano) },
  { id: 'percutor', name: 'Campana', desc: 'Vuelve a activar la primera carta del golpe.', rarity: 'oficio', arch: 'sismo', kind: 'f', strike: (x) => x.F(x.impacts[0] ?? 0) },
  { id: 'resonador', name: 'Cuerno de guerra', desc: '×{multi} de Multi si jugás {cartas} cartas o más.', rarity: 'capataz', arch: 'sismo', kind: 'x', strike: (x) => x.cards.length >= V.resonador.cartas && x.X(V.resonador.multi) },
  { id: 'diapason', name: 'Espejo de mano', desc: 'Copia tu última reliquia que no sea pasiva.', rarity: 'oficio', arch: 'sismo', box: 'sismo', kind: 'copy' },
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
  { id: 'crisol', name: 'Caldero', desc: 'Expuesto hace ×{multi} de Daño en vez de ×{base}, y los golpes de 3 palos también dejan Expuesto.', rarity: 'capataz', arch: 'alquimia', box: 'alquimia', kind: 'p', cfg: (c) => void ((c.expuestoMult = V.crisol.multi), (c.polyExpuesto = true)) },
  { id: 'catalizador', name: 'Piedra filosofal', desc: '+{multi} de Multi por cada trono Expuesto o Aturdido.', rarity: 'reliquia', arch: 'alquimia', box: 'alquimia', kind: 'r', strike: (x) => x.R(V.catalizador.multi * fx(x)) },

  // ───────── búnker al límite ─────────
  { id: 'sismografo', name: 'Vela gastada', desc: '+{dano} de Daño por cada punto de Vida que te falte.', rarity: 'oficio', arch: 'limite', kind: 'f', strike: (x) => x.F(V.sismografo.dano * Math.max(0, x.cfg.maxIntegrity - x.env.integrity)) },
  { id: 'megafono', name: 'Rosa de espinas', desc: 'Cuando un Contraataque te quita Vida, el trono que atacó recibe {dano}.', rarity: 'oficio', arch: 'limite', box: 'limite', kind: 'p', siren: (h, _, s) => s.taken > 0 && h.hit(s.tower, V.megafono.dano) },
  {
    id: 'piquete',
    name: 'Antorcha',
    desc: 'Cada Motín (Comodín): +{oro} de oro y robás {cartas} cartas.',
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
    desc: '×{multi} de Multi. Si el golpe no abate a ningún guardia, perdés {vida} de Vida.',
    rarity: 'reliquia',
    arch: 'limite',
    box: 'limite',
    kind: 'x',
    strike: (x) => void x.X(V.corazon.multi),
    after: (x, _, r) => r.fallen === 0 && (x.hurt += V.corazon.vida) && x.note(`perdés ${V.corazon.vida} de Vida`),
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
  { id: 'contenedor', name: 'Cofre cerrado', desc: 'Lo que descartás no vuelve en este asalto, y cada carta da +{dano} de Daño a tu próximo golpe.', rarity: 'oficio', arch: 'trituradora', box: 'trituradora', kind: 'p', cfg: (c) => void (c.discardExhaust = (c.discardExhaust ?? 0) + V.contenedor.dano) },
  { id: 'prensa', name: 'Cetro de ceniza', desc: '×{multi} de Multi si en la campaña ya ardieron {cartas} cartas o más.', rarity: 'capataz', arch: 'trituradora', box: 'trituradora', kind: 'x', strike: (x) => x.env.scrap >= V.prensa.cartas && x.X(V.prensa.multi) },
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
  { id: 'bastion', name: 'Baluarte', desc: '+{multi} de Multi si tu Escudo está a la mitad de su tope o por encima.', rarity: 'capataz', arch: 'aguante', box: 'aguante', kind: 'r', strike: (x) => x.env.wall > 0 && x.env.wall * 2 >= x.cfg.wallCap && x.R(V.bastion.multi) },
] as Omit<ToolDef, 'rasgo'>[]).map((t) => ({ ...t, rasgo: 'horda' as Rasgo }));
/** Cifras derivadas que algunas plantillas enseñan (ejemplos ya calculados). */
const DERIVED: Record<string, Record<string, number>> = {
  timbre: { sellos: BALANCE.timbre.stamps },
  contragolpe: { ej: 4 * V.contragolpe.factor },
  crisol: { base: BALANCE.golpe.expuesto },
};
for (const t of TOOLS) t.desc = fill(t.desc, { ...relic(t.id), ...DERIVED[t.id] });
export const TOOL: Record<string, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

// ───────────────────────── V35 · Rasgos de build ─────────────────────────
/** El rasgo de cada Reliquia. Sangre: Vida y riesgo. Tahúr: oro, azar y mezcla de palos. Verdugo: precisión y Golpe exacto.
 *  Bastión: Escudo y aguante. Horda: muchas cartas, repeticiones y fuego. */
export const RASGO_DE: Record<string, Rasgo> = {
  // Sangre
  paleta: 'sangre', botiquin: 'sangre', casco: 'sangre', sismografo: 'sangre', megafono: 'sangre', piquete: 'sangre', ultimo: 'sangre', corazon: 'sangre', plomada: 'sangre', acido: 'sangre',
  // Tahúr
  cortavidrios: 'tahur', dados: 'tahur', hucha: 'tahur', tiralineas: 'tahur', horno: 'tahur', prisma: 'tahur', mosaico: 'tahur', crisol: 'tahur', catalizador: 'tahur', diapason: 'tahur', contrapeso: 'tahur',
  // Verdugo
  piqueta: 'verdugo', cincel: 'verdugo', taladro: 'verdugo', plano_maestro: 'verdugo', nivel: 'verdugo', calibre: 'verdugo', cizalla: 'verdugo', montacargas: 'verdugo', prensa: 'verdugo', trituradora: 'verdugo',
  // Bastión
  maza: 'bastion', sacos: 'bastion', encofrado: 'bastion', puntales: 'bastion', sordina: 'bastion', ariete: 'bastion', contragolpe: 'bastion', rebosadero: 'bastion', bastion: 'bastion', pasarela: 'bastion',
  // Horda
  gemelos: 'horda', cinta: 'horda', estandarte: 'horda', dinamita: 'horda', andamio: 'horda', metralla: 'horda', percutor: 'horda', resonador: 'horda', vibrador: 'horda', timbre: 'horda', contenedor: 'horda',
};
for (const t of TOOLS) {
  if (!RASGO_DE[t.id]) throw new Error(`la Reliquia «${t.id}» no tiene rasgo`);
  t.rasgo = RASGO_DE[t.id];
}

const RG = BALANCE.rasgos;
export const RASGOS: RasgoDef[] = [
  { id: 'sangre', name: 'Sangre', lema: 'Pacto de sangre', bonos: ['Cada guardia abatido te cura {vida} de Vida.', '+{multi} de Multi por cada {cada} de Vida que te falten.', '×{x} de Multi con la Vida a la mitad o menos.'] },
  { id: 'tahur', name: 'Tahúr', lema: 'Azar y dados', bonos: ['Dado del Tahúr: cada turno da de +1 a +3 de Multi.', 'El dado da de +1 a +6 de Multi. Con un 6, +{oro} de oro al golpear.', 'Con un 5 o un 6, el dado da además ×{x} de Multi.'] },
  { id: 'verdugo', name: 'Verdugo', lema: 'Ejecución', bonos: ['Ejecuta: el enemigo que quede con {pct} % de Vida o menos, cae.', 'Ejecuta con {pct2} % o menos. Tras ejecutar, +{dano} de Daño al próximo golpe.', 'Toda ejecución cuenta como Golpe exacto.'] },
  { id: 'bastion', name: 'Bastión', lema: 'Muralla de hierro', bonos: ['Empezás cada asalto con {escudo} de Escudo.', '+{dano} de Daño por cada punto de Escudo.', '+{dano2} de Daño por cada punto de Escudo, y su tope sube {tope}.'] },
  { id: 'horda', name: 'Horda', lema: 'Cascada de naipes', bonos: ['+{multi} de Multi si jugás {cartas} cartas o más.', 'La primera carta del golpe se activa otra vez.', 'Todas las cartas del golpe se activan otra vez.'] },
];
for (const r of RASGOS) r.bonos = r.bonos.map((b) => fill(b, RG[r.id])) as [string, string, string];
export const RASGO: Record<Rasgo, RasgoDef> = Object.fromEntries(RASGOS.map((r) => [r.id, r])) as Record<Rasgo, RasgoDef>;

/** Cuántas Reliquias de cada rasgo hay en la tira. */
export function rasgosDe(tools: ToolInst[]): Record<Rasgo, number> {
  const n: Record<Rasgo, number> = { sangre: 0, tahur: 0, verdugo: 0, bastion: 0, horda: 0 };
  for (const t of tools) if (TOOL[t.id]) n[TOOL[t.id].rasgo] += 1;
  return n;
}
/** Nivel de un rasgo con n Reliquias: 0 (sin bono), 1 (con 2), 2 (con 4) o 3 (con 6). */
export const nivelRasgo = (n: number): 0 | 1 | 2 | 3 => (n >= UMBRALES[2] ? 3 : n >= UMBRALES[1] ? 2 : n >= UMBRALES[0] ? 1 : 0);
/** El nivel de cada rasgo en una tira de Reliquias. */
export function nivelesDe(tools: ToolInst[]): Record<Rasgo, 0 | 1 | 2 | 3> {
  const n = rasgosDe(tools);
  return { sangre: nivelRasgo(n.sangre), tahur: nivelRasgo(n.tahur), verdugo: nivelRasgo(n.verdugo), bastion: nivelRasgo(n.bastion), horda: nivelRasgo(n.horda) };
}
/** Las reglas fijas del asalto que ponen los rasgos (antes del decreto del monarca, que puede recortarlas). */
export function rasgosCfg(c: Config, tools: ToolInst[]): void {
  const n = nivelesDe(tools);
  if (n.verdugo >= 1) c.ejecuta = (n.verdugo >= 2 ? RG.verdugo.pct2 : RG.verdugo.pct) / 100;
  if (n.verdugo >= 3) c.ejecutaExacta = true;
  if (n.bastion >= 1) c.wallStart = (c.wallStart ?? 0) + RG.bastion.escudo;
  if (n.bastion >= 3) c.wallCap += RG.bastion.tope;
}
type Marca = (r: RasgoDef, nivel: number) => void;
/** Lo que los rasgos suman a un golpe (tras las Reliquias y antes de multiplicar). */
export function rasgosStrike(x: Strike, marca: Marca): void {
  const n = nivelesDe(x.env.tools);
  if (n.sangre >= 2) {
    marca(RASGO.sangre, n.sangre);
    x.R(RG.sangre.multi * Math.floor(Math.max(0, x.cfg.maxIntegrity - x.env.integrity) / RG.sangre.cada));
    if (n.sangre >= 3 && x.env.integrity * 2 <= x.cfg.maxIntegrity) x.X(RG.sangre.x);
  }
  if (n.tahur >= 1 && x.env.dado) {
    marca(RASGO.tahur, n.tahur);
    const cara = x.env.dado;
    x.R(n.tahur >= 2 ? cara : Math.ceil(cara / 2));
    if (n.tahur >= 2 && cara === 6) x.gold += RG.tahur.oro;
    if (n.tahur >= 3 && cara >= 5) x.X(RG.tahur.x);
  }
  if (n.bastion >= 2 && x.env.wall > 0) {
    marca(RASGO.bastion, n.bastion);
    x.F((n.bastion >= 3 ? RG.bastion.dano2 : RG.bastion.dano) * x.env.wall);
  }
  if (n.horda >= 1) {
    marca(RASGO.horda, n.horda);
    if (x.cards.length >= RG.horda.cartas) x.R(RG.horda.multi);
    if (n.horda >= 3) x.F(x.impacts.reduce((a, b) => a + b, 0));
    else if (n.horda >= 2) x.F(x.impacts[0] ?? 0);
  }
}
/** Lo que los rasgos hacen según cómo quedó el golpe. */
export function rasgosAfter(x: Strike, r: Outcome, marca: Marca): void {
  const n = nivelesDe(x.env.tools);
  if (n.sangre >= 1 && r.fallen > 0) {
    marca(RASGO.sangre, n.sangre);
    x.heal += RG.sangre.vida * r.fallen;
    x.note(`+${RG.sangre.vida * r.fallen} de Vida`);
  }
  if (n.verdugo >= 2 && r.fell.some((f) => f.exec)) {
    marca(RASGO.verdugo, n.verdugo);
    x.env.charge += RG.verdugo.dano;
    x.note(`+${RG.verdugo.dano} de Daño cargado`);
  }
}
export const BOXES: Arch[] = ['precision', 'sismo', 'alquimia', 'limite', 'trituradora', 'aguante'];
export const TOOL_SLOTS = 6;

/** Herramientas que entran en el surtido según las cajas del gremio abiertas. */
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
