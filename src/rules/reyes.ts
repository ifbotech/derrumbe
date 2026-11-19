// V40 · Los 4 Reyes y sus Bendiciones (SPECS/V40-REFUNDACION.md, apartado 4). Sustituyen a los cinco rasgos [2/4/6]
// de las Reliquias y a los siete monarcas sueltos.
//
//   Rey de Espadas  filo: perforar, rematar, Golpe exacto          sus cargas suman Daño
//   Rey de Bastos   aguante: Escudo, frenar el Contraataque        sus cargas suman Escudo al empezar o Daño
//   Rey de Oros     fortuna: oro, salpicadura, el dado             sus cargas suman oro, salpicadura o Daño
//   Rey de Copas    brindis: curación, Vida, robar                 sus cargas suman Vida al cerrar o Daño
//
// Cada Bendición pertenece a un Rey (las Duales, a dos). Tiene un efecto simple que vale desde que se toma y una
// condición de carga: cada vez que se cumple, su contador (`n`) sube 1 para el resto de la campaña, y cada carga da
// lo que dice su texto. Con 2 y con 4 piezas de un mismo Rey se enciende su bono de nivel (`nivelesReyes`).
//
// Puro y sin estado: datos, textos (con `{campo}` que salen de `bendiciones`, `niveles`, `reyes` y `oferta` de
// balance-config.json) y las cuentas. El motor (engine.ts) llama a los ganchos de cada Bendición dentro del golpe y del
// Contraataque; la campaña (run.ts) guarda las Bendiciones con sus cargas en `run.bendiciones`, arma la oferta y paga
// lo que se cobra al cerrar cada asalto. Solo importa tipos del motor: engine.ts importa este módulo.
import { BALANCE, fill } from './balance-config';
import type { Config, Hook, Outcome, Strike, Suit } from './engine';

// ───────────────────────── Los 4 Reyes ─────────────────────────

/** El id de un Rey: el nombre de su palo (es también el `id` de su monarca en BOSSES y su clave `rey.<id>.*`). */
export type ReyId = 'espadas' | 'bastos' | 'oros' | 'copas';
export const REY_IDS: ReyId[] = ['espadas', 'bastos', 'oros', 'copas'];
export const PALO_DE_REY: Record<ReyId, Suit> = { espadas: 'S', bastos: 'C', oros: 'D', copas: 'H' };
export const REY_DE_PALO: Record<Suit, ReyId> = { S: 'espadas', C: 'bastos', D: 'oros', H: 'copas' };
export const esRey = (id: unknown): id is ReyId => typeof id === 'string' && (REY_IDS as string[]).includes(id);
/** «Espadas», «Bastos»… (para las píldoras: «Espadas +6»). */
export const REY_PALO: Record<ReyId, string> = { espadas: 'Espadas', bastos: 'Bastos', oros: 'Oros', copas: 'Copas' };

/** Una Bendición tomada: su `id` y sus cargas (`n`), que crecen toda la campaña. Serializable. */
export interface BendInst {
  id: string;
  n: number;
}

/** Lo que cada carga de una Bendición da, para enseñarlo («Espadas +6 de Daño»). */
export type Aporte = 'dano' | 'escudo' | 'oro' | 'vida' | 'salpica' | 'replica';

/** Lo que una Bendición cobra al cerrar un asalto ganado. */
export interface Cierre {
  oro?: number;
  vida?: number;
}

/** Lo que necesita una Bendición de la campaña al tomarse (su efecto inmediato). Sin importar run.ts. */
export interface CampanaBend {
  gold: number;
  integrity: number;
  maxIntegrity: number;
  interestCap: number;
}

export interface BendDef {
  id: string;
  /** Su Rey. Una Dual tiene además `duo`: cuenta para los dos. */
  rey: ReyId;
  duo?: ReyId;
  name: string;
  /** Su efecto (≤ 115 caracteres, con sus cifras). */
  desc: string;
  /** Su condición de carga y lo que da cada carga (≤ 115 caracteres). */
  carga: string;
  /** Lo que suma cada carga, y cuánto (para la píldora y el desglose). */
  aporte: Aporte;
  porCarga: number;
  /** Regla fija de cada asalto (como las Reliquias). */
  cfg?(c: Config, self: BendInst): void;
  /** Su turno en el golpe, antes de los multiplicadores. */
  strike?(x: Strike, self: BendInst): void;
  /** Tras el daño: lo que hace según cómo quedó el golpe y cuántas cargas suma (0 si ninguna). */
  after?(x: Strike, self: BendInst, r: Outcome): number;
  /** En un Contraataque: lo que hace y cuántas cargas suma. */
  siren?(h: Hook, self: BendInst, s: { tower: Suit; threat: number; blocked: number; taken: number }): number;
  /** Escudo con el que empieza cada asalto. */
  escudo?(self: BendInst): number;
  /** Lo que cobra al cerrar un asalto ganado. */
  cierre?(self: BendInst): Cierre;
  /** El efecto inmediato al tomarla (oro, Vida máxima…). */
  toma?(run: CampanaBend): void;
  /** Necesita el dado de cada turno. */
  dado?: true;
}

const V = BALANCE.bendiciones as Record<string, Record<string, number>>;
const palo = (x: Strike, s: Suit) => x.cards.filter((c) => c.suit === s).length;
/** Guardias que cayeron en el trono golpeado / en los otros (por salpicadura). */
const enObjetivo = (x: Strike, r: Outcome) => r.fell.filter((f) => f.tower === x.target).length;
const porSalpica = (x: Strike, r: Outcome) => r.fell.filter((f) => f.tower !== x.target).length;
const exactos = (r: Outcome) => r.fell.filter((f) => f.clean).length;
/** Cada carga, como Daño en el golpe (si tiene alguna). */
const danoCargas = (id: string) => (x: Strike, self: BendInst) => x.F(self.n * V[id].carga);
/** Escudo que gana el golpe (lo de las cartas de Bastos, sin contar el tope). */
const escudoDelGolpe = (x: Strike) => x.wall + palo(x, 'C') * x.cfg.escudoPorCarta;
/** Lo que cura el golpe (sin el tope). */
const curaDelGolpe = (x: Strike) => x.heal + palo(x, 'H') * x.cfg.curaPorCarta;

/** Las Bendiciones, con sus plantillas: `{campo}` sale de `bendiciones.<id>` de balance-config.json. */
const DEFS: BendDef[] = [
  // ───────── Rey de Espadas ─────────
  {
    id: 'filo',
    rey: 'espadas',
    name: 'Filo templado',
    desc: '+{dano} de Daño por cada carta de Espadas del golpe.',
    carga: 'Cada Golpe exacto: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.filo.carga,
    strike: (x, self) => {
      x.F(V.filo.dano * palo(x, 'S'));
      danoCargas('filo')(x, self);
    },
    after: (_x, _s, r) => exactos(r),
  },
  {
    id: 'estocada',
    rey: 'espadas',
    name: 'Estocada',
    desc: 'Golpe de una carta sola: +{dano} de Daño.',
    carga: 'Cada guardia que abatís con una carta sola: +{carga} de Daño a esos golpes.',
    aporte: 'dano',
    porCarga: V.estocada.carga,
    strike: (x, self) => x.cards.length === 1 && x.F(V.estocada.dano + self.n * V.estocada.carga),
    after: (x, _s, r) => (x.cards.length === 1 ? enObjetivo(x, r) : 0),
  },
  {
    id: 'tajo',
    rey: 'espadas',
    name: 'Tajo hondo',
    desc: 'Todos tus golpes perforan, lleven o no Espadas.',
    carga: 'Cada golpe que abate a 2 guardias o más: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.tajo.carga,
    cfg: (c) => void (c.alwaysPierce = true),
    strike: danoCargas('tajo'),
    after: (_x, _s, r) => (r.fallen >= 2 ? 1 : 0),
  },
  {
    id: 'duelo',
    rey: 'espadas',
    name: 'Primera sangre',
    desc: '+{dano} de Daño en el primer golpe contra cada guardia.',
    carga: 'Cada guardia que cae de un solo golpe: +{carga} de Daño a esos primeros golpes.',
    aporte: 'dano',
    porCarga: V.duelo.carga,
    strike: (x, self) => x.previo === 0 && x.F(V.duelo.dano + self.n * V.duelo.carga),
    after: (x, _s, r) => (x.previo === 0 && enObjetivo(x, r) > 0 ? 1 : 0),
  },
  {
    id: 'remate',
    rey: 'espadas',
    name: 'Remate',
    desc: 'El guardia que queda con {pct} % de su Vida o menos, cae.',
    carga: 'Cada guardia rematado así: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.remate.carga,
    cfg: (c) => void (c.ejecuta = Math.max(c.ejecuta ?? 0, V.remate.pct / 100)),
    strike: danoCargas('remate'),
    after: (_x, _s, r) => r.fell.filter((f) => f.exec).length,
  },
  // ───────── Rey de Bastos ─────────
  {
    id: 'garrote',
    rey: 'bastos',
    name: 'Garrote',
    desc: 'Tus golpes con Bastos dan +{escudo} de Escudo.',
    carga: 'Cada Contraataque que el Escudo frena entero: +{carga} de Escudo al empezar cada asalto.',
    aporte: 'escudo',
    porCarga: V.garrote.carga,
    strike: (x) => void (palo(x, 'C') > 0 && (x.wall += V.garrote.escudo)),
    siren: (_h, _s, s) => (s.taken === 0 && s.blocked > 0 ? 1 : 0),
    escudo: (self) => self.n * V.garrote.carga,
  },
  {
    id: 'empalizada',
    rey: 'bastos',
    name: 'Empalizada',
    desc: 'El tope del Escudo sube {tope}.',
    carga: 'Cada golpe que te da {n} de Escudo o más: +{carga} de Escudo al empezar cada asalto.',
    aporte: 'escudo',
    porCarga: V.empalizada.carga,
    cfg: (c) => void (c.wallCap += V.empalizada.tope),
    after: (x) => (escudoDelGolpe(x) >= V.empalizada.n ? 1 : 0),
    escudo: (self) => self.n * V.empalizada.carga,
  },
  {
    id: 'replica',
    rey: 'bastos',
    name: 'Réplica',
    desc: 'Si el Escudo frena entero un Contraataque, ese guardia recibe {dano}.',
    carga: 'Cada réplica: +{carga} de Daño a la réplica.',
    aporte: 'replica',
    porCarga: V.replica.carga,
    siren: (h, self, s) => {
      if (s.taken > 0 || s.blocked <= 0) return 0;
      h.hit(s.tower, V.replica.dano + self.n * V.replica.carga);
      return 1;
    },
  },
  {
    id: 'porra',
    rey: 'bastos',
    name: 'Palo y palo',
    desc: '+{dano} de Daño por cada punto de Escudo en pie.',
    carga: 'Cada Contraataque que el Escudo frena entero: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.porra.carga,
    strike: (x, self) => {
      if (x.env.wall > 0) x.F(V.porra.dano * x.env.wall);
      danoCargas('porra')(x, self);
    },
    siren: (_h, _s, s) => (s.taken === 0 && s.blocked > 0 ? 1 : 0),
  },
  {
    id: 'aguante',
    rey: 'bastos',
    name: 'Aguante',
    desc: 'Empezás cada asalto con {escudo} de Escudo.',
    carga: 'Cada guardia que abatís con Escudo en pie: +{carga} de Daño a tus golpes con Bastos.',
    aporte: 'dano',
    porCarga: V.aguante.carga,
    escudo: () => V.aguante.escudo,
    strike: (x, self) => palo(x, 'C') > 0 && x.F(self.n * V.aguante.carga),
    after: (x, _s, r) => (x.env.wall > 0 ? r.fallen : 0),
  },
  // ───────── Rey de Oros ─────────
  {
    id: 'moneda',
    rey: 'oros',
    name: 'Moneda de oro',
    desc: 'Cada guardia abatido: +{oro} de oro.',
    carga: 'Cada golpe con {cartas} cartas de Oros o más: +{carga} de oro al cerrar cada asalto.',
    aporte: 'oro',
    porCarga: V.moneda.carga,
    after: (x, _s, r) => {
      if (r.fallen > 0) x.gold += V.moneda.oro * r.fallen;
      return palo(x, 'D') >= V.moneda.cartas ? 1 : 0;
    },
    cierre: (self) => ({ oro: self.n * V.moneda.carga }),
  },
  {
    id: 'lluvia',
    rey: 'oros',
    name: 'Lluvia de oro',
    desc: 'Cada carta de Oros salpica +{dano} más a los otros tronos.',
    carga: 'Cada guardia que cae por salpicadura: +{carga} de salpicadura en todos tus golpes.',
    aporte: 'salpica',
    porCarga: V.lluvia.carga,
    cfg: (c) => void (c.salpicaPorCarta += V.lluvia.dano),
    strike: (x, self) => void (x.splash += self.n * V.lluvia.carga),
    after: (x, _s, r) => porSalpica(x, r),
  },
  {
    id: 'taba',
    rey: 'oros',
    name: 'Taba cargada',
    desc: 'Cada turno se tira un dado: tu golpe suma {x} × el dado de Daño.',
    carga: 'Cada 6 del dado en un golpe: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.taba.carga,
    dado: true,
    strike: (x, self) => {
      if (x.env.dado) x.F(V.taba.x * x.env.dado);
      danoCargas('taba')(x, self);
    },
    after: (x) => (x.env.dado === 6 ? 1 : 0),
  },
  {
    id: 'arcon',
    rey: 'oros',
    name: 'Arcón del Rey',
    desc: 'Ahora, +{oro} de oro, y el tope del interés sube {interes}.',
    carga: 'Cada Golpe exacto: +{carga} de oro al cerrar cada asalto.',
    aporte: 'oro',
    porCarga: V.arcon.carga,
    toma: (run) => void ((run.gold += V.arcon.oro), (run.interestCap += V.arcon.interes)),
    after: (_x, _s, r) => exactos(r),
    cierre: (self) => ({ oro: self.n * V.arcon.carga }),
  },
  {
    id: 'envite',
    rey: 'oros',
    name: 'Envite',
    desc: '+{multi} de Multi si el golpe mezcla 3 palos o más.',
    carga: 'Cada guardia que abatís con 3 palos o más: +{carga} de Daño a esos golpes.',
    aporte: 'dano',
    porCarga: V.envite.carga,
    strike: (x, self) => {
      if (!x.poly) return;
      x.R(V.envite.multi);
      x.F(self.n * V.envite.carga);
    },
    after: (x, _s, r) => (x.poly ? enObjetivo(x, r) : 0),
  },
  // ───────── Rey de Copas ─────────
  {
    id: 'brindis',
    rey: 'copas',
    name: 'Brindis',
    desc: 'Tus golpes con Copas curan +{vida} más.',
    carga: 'Cada golpe que te cura {n} o más: +{carga} de Vida al cerrar cada asalto.',
    aporte: 'vida',
    porCarga: V.brindis.carga,
    strike: (x) => void (palo(x, 'H') > 0 && (x.heal += V.brindis.vida)),
    after: (x) => (curaDelGolpe(x) >= V.brindis.n ? 1 : 0),
    cierre: (self) => ({ vida: self.n * V.brindis.carga }),
  },
  {
    id: 'porron',
    rey: 'copas',
    name: 'Porrón',
    desc: 'Ahora, +{vida} de Vida máxima (y de Vida).',
    carga: 'Cada guardia que abatís con Copas: +{carga} de Daño a tus golpes con Copas.',
    aporte: 'dano',
    porCarga: V.porron.carga,
    toma: (run) => void ((run.maxIntegrity += V.porron.vida), (run.integrity += V.porron.vida)),
    strike: (x, self) => palo(x, 'H') > 0 && x.F(self.n * V.porron.carga),
    after: (x, _s, r) => (palo(x, 'H') > 0 ? r.fallen : 0),
  },
  {
    id: 'ronda',
    rey: 'copas',
    name: 'Otra ronda',
    desc: 'Cada guardia que abatís con Copas: robás {cartas} carta.',
    carga: 'Cada golpe de {n} cartas o más: +{carga} de Vida al cerrar cada asalto.',
    aporte: 'vida',
    porCarga: V.ronda.carga,
    after: (x, _s, r) => {
      if (r.fallen > 0 && palo(x, 'H') > 0) x.draw += V.ronda.cartas * r.fallen;
      return x.cards.length >= V.ronda.n ? 1 : 0;
    },
    cierre: (self) => ({ vida: self.n * V.ronda.carga }),
  },
  {
    id: 'caliz',
    rey: 'copas',
    name: 'Cáliz rebosante',
    desc: 'La curación que no cabe: +{dano} de Daño por punto a tu golpe siguiente.',
    carga: 'Cada golpe que cura de más: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.caliz.carga,
    cfg: (c) => void (c.overhealCharge = (c.overhealCharge ?? 0) + V.caliz.dano),
    strike: danoCargas('caliz'),
    after: (x) => (curaDelGolpe(x) > 0 && x.env.integrity + curaDelGolpe(x) > x.cfg.maxIntegrity ? 1 : 0),
  },
  {
    id: 'sobremesa',
    rey: 'copas',
    name: 'Sobremesa',
    desc: 'Al cerrar cada asalto ganado, curás {vida} de Vida.',
    carga: 'Cada guardia que abatís con la Vida llena: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.sobremesa.carga,
    cierre: () => ({ vida: V.sobremesa.vida }),
    strike: danoCargas('sobremesa'),
    after: (x, _s, r) => (x.env.integrity >= x.cfg.maxIntegrity ? r.fallen : 0),
  },
  // ───────── Duales: una por cada par de Reyes ─────────
  {
    id: 'hoja',
    rey: 'espadas',
    duo: 'bastos',
    name: 'Hoja y broquel',
    desc: 'Cada Golpe exacto: +{escudo} de Escudo.',
    carga: 'Cada Contraataque que el Escudo frena entero: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.hoja.carga,
    strike: danoCargas('hoja'),
    after: (x, _s, r) => {
      const n = exactos(r);
      if (n) x.wall += V.hoja.escudo * n;
      return 0;
    },
    siren: (_h, _s, s) => (s.taken === 0 && s.blocked > 0 ? 1 : 0),
  },
  {
    id: 'filodorado',
    rey: 'espadas',
    duo: 'oros',
    name: 'Filo dorado',
    desc: 'Cada Golpe exacto: los otros tronos reciben {dano}.',
    carga: 'Cada guardia que cae por salpicadura: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.filodorado.carga,
    strike: danoCargas('filodorado'),
    after: (x, _s, r) => {
      for (const f of r.fell) if (f.clean) for (const t of Object.values(x.env.towers)) if (t.suit !== f.tower && t.floors.length) x.burst.push({ tower: t.suit, n: V.filodorado.dano });
      return porSalpica(x, r);
    },
  },
  {
    id: 'sangria',
    rey: 'espadas',
    duo: 'copas',
    name: 'Sangría',
    desc: 'Cada Golpe exacto te cura {vida}.',
    carga: 'Cada Golpe exacto con la Vida llena: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.sangria.carga,
    strike: danoCargas('sangria'),
    after: (x, _s, r) => {
      const n = exactos(r);
      if (n) x.heal += V.sangria.vida * n;
      return x.env.integrity >= x.cfg.maxIntegrity ? n : 0;
    },
  },
  {
    id: 'peaje',
    rey: 'bastos',
    duo: 'oros',
    name: 'Peaje',
    desc: 'Cada Contraataque que el Escudo frena entero: +{oro} de oro.',
    carga: 'Cada guardia que abatís con Bastos y Oros: +{carga} de Escudo al empezar cada asalto.',
    aporte: 'escudo',
    porCarga: V.peaje.carga,
    siren: (h, _s, s) => {
      if (s.taken === 0 && s.blocked > 0) h.gold(V.peaje.oro);
      return 0;
    },
    after: (x, _s, r) => (palo(x, 'C') > 0 && palo(x, 'D') > 0 ? r.fallen : 0),
    escudo: (self) => self.n * V.peaje.carga,
  },
  {
    id: 'fogon',
    rey: 'bastos',
    duo: 'copas',
    name: 'Fogón',
    desc: 'El Escudo que no cabe te cura: cada {escudo} de más, 1 de Vida.',
    carga: 'Cada guardia que abatís con Bastos y Copas: +{carga} de Vida al cerrar cada asalto.',
    aporte: 'vida',
    porCarga: V.fogon.carga,
    cfg: (c) => void (c.overwallRepair = c.overwallRepair ? Math.min(c.overwallRepair, V.fogon.escudo) : V.fogon.escudo),
    after: (x, _s, r) => (palo(x, 'C') > 0 && palo(x, 'H') > 0 ? r.fallen : 0),
    cierre: (self) => ({ vida: self.n * V.fogon.carga }),
  },
  {
    id: 'convite',
    rey: 'oros',
    duo: 'copas',
    name: 'Convite',
    desc: 'Cada golpe con Oros y Copas: +{oro} de oro y te curás {vida}.',
    carga: 'Cada guardia que abatís con Oros y Copas: +{carga} de Daño a todos tus golpes.',
    aporte: 'dano',
    porCarga: V.convite.carga,
    strike: danoCargas('convite'),
    after: (x, _s, r) => {
      const ambos = palo(x, 'D') > 0 && palo(x, 'H') > 0;
      if (ambos) (x.gold += V.convite.oro), (x.heal += V.convite.vida);
      return ambos ? r.fallen : 0;
    },
  },
];
for (const b of DEFS) {
  b.desc = fill(b.desc, V[b.id]);
  b.carga = fill(b.carga, V[b.id]);
}
export const BENDICIONES: BendDef[] = DEFS;
export const BENDICION: Record<string, BendDef> = Object.fromEntries(DEFS.map((b) => [b.id, b]));
/** Las Bendiciones de un Rey (sin las Duales). */
export const bendicionesDe = (rey: ReyId): BendDef[] => DEFS.filter((b) => b.rey === rey && !b.duo);
/** Las Duales. */
export const DUALES: BendDef[] = DEFS.filter((b) => b.duo);
/** ¿Cuenta esta Bendición para este Rey? (las Duales cuentan para los dos) */
export const esDe = (b: BendDef, rey: ReyId) => b.rey === rey || b.duo === rey;
/** Los Reyes de una Bendición: uno, o dos si es Dual. */
export const reyesDe = (b: BendDef): ReyId[] => (b.duo ? [b.rey, b.duo] : [b.rey]);

// ───────────────────────── Niveles del Rey [2/4] ─────────────────────────

/** Piezas de un mismo Rey que encienden su bono de nivel: con 2, el primero; con 4, el segundo (más fuerte). */
export const UMBRALES_REY = [2, 4] as const;
export type NivelRey = 0 | 1 | 2;
/** Nivel con n piezas: 0, 1 (con 2) o 2 (con 4). */
export const nivelDe = (n: number): NivelRey => (n >= UMBRALES_REY[1] ? 2 : n >= UMBRALES_REY[0] ? 1 : 0);

/**
 * Lo que cuenta para los niveles de los Reyes. Por ahora, las Bendiciones (`bendiciones`); en el tramo 1d también
 * contarán los Amuletos de la familia de cada Rey (`amuletos`: pares id → Rey, ya resueltos por quien los conoce).
 */
export interface FuentesRey {
  bendiciones?: readonly BendInst[];
  /** V40 1d · el Rey de cada Amuleto que se lleva (aún no hay Amuletos: siempre vacío). */
  amuletos?: readonly ReyId[];
}
export interface NivelInfo {
  /** Piezas que cuentan para este Rey. */
  n: number;
  nivel: NivelRey;
  /** Cuántas faltan para el próximo nivel (0 si ya está en el 2). */
  falta: number;
}
/** La única cuenta de los niveles: cuántas piezas hay de cada Rey y su nivel. Pura; acepta varias fuentes. */
export function nivelesReyes(f: FuentesRey): Record<ReyId, NivelInfo> {
  const n: Record<ReyId, number> = { espadas: 0, bastos: 0, oros: 0, copas: 0 };
  for (const b of f.bendiciones ?? []) {
    const d = BENDICION[b.id];
    if (d) for (const r of reyesDe(d)) n[r]++;
  }
  for (const r of f.amuletos ?? []) n[r]++;
  return Object.fromEntries(
    REY_IDS.map((r) => {
      const nivel = nivelDe(n[r]);
      return [r, { n: n[r], nivel, falta: nivel === 2 ? 0 : UMBRALES_REY[nivel] - n[r] }];
    }),
  ) as Record<ReyId, NivelInfo>;
}

/** Cifras de los bonos de nivel (`niveles.<rey>`). */
const NV = BALANCE.niveles;
/** Los dos bonos de cada Rey: con 2 piezas y con 4 (plantillas rellenas con `niveles.<rey>`). */
export const BONOS_REY: Record<ReyId, [string, string]> = {
  espadas: ['+{multi} de Multi en tus golpes con Espadas.', '×{x} de Multi en tus golpes con 2 cartas de Espadas o más.'],
  bastos: ['Empezás cada asalto con {escudo} de Escudo.', '+{dano} de Daño por cada punto de Escudo en pie, y su tope sube {tope}.'],
  oros: ['+{oro} de oro al cerrar cada asalto ganado.', 'Cada turno se tira un dado: tu golpe suma de +1 a +{caras} de Multi.'],
  copas: ['Cada guardia abatido te cura {vida}.', '+{cartas} carta en la mano, y cada carta de Copas cura +{cura} más.'],
};
for (const r of REY_IDS) BONOS_REY[r] = BONOS_REY[r].map((t) => fill(t, NV[r])) as [string, string];

/** Las reglas fijas del asalto que ponen los niveles. */
export function nivelesCfg(c: Config, nv: Record<ReyId, NivelInfo>): void {
  if (nv.bastos.nivel >= 2) c.wallCap += NV.bastos.tope;
  if (nv.copas.nivel >= 2) {
    c.handSize = Object.fromEntries(Object.entries(c.handSize).map(([k, v]) => [k, v + NV.copas.cartas]));
    c.curaPorCarta += NV.copas.cura;
  }
}
type Marca = (rey: ReyId, nivel: NivelRey) => void;
/** Lo que los niveles suman a un golpe (antes de los multiplicadores). */
export function nivelesStrike(x: Strike, nv: Record<ReyId, NivelInfo>, marca: Marca): void {
  const espadas = palo(x, 'S');
  if (nv.espadas.nivel >= 1 && espadas > 0) {
    marca('espadas', nv.espadas.nivel);
    x.R(NV.espadas.multi);
    if (nv.espadas.nivel >= 2 && espadas >= 2) x.X(NV.espadas.x);
  }
  if (nv.bastos.nivel >= 2 && x.env.wall > 0) {
    marca('bastos', 2);
    x.F(NV.bastos.dano * x.env.wall);
  }
  if (nv.oros.nivel >= 2 && x.env.dado) {
    marca('oros', 2);
    x.R(Math.min(NV.oros.caras, x.env.dado));
  }
}
/** Lo que los niveles hacen según cómo quedó el golpe. */
export function nivelesAfter(x: Strike, r: Outcome, nv: Record<ReyId, NivelInfo>, marca: Marca): void {
  if (nv.copas.nivel >= 1 && r.fallen > 0) {
    marca('copas', nv.copas.nivel);
    x.heal += NV.copas.vida * r.fallen;
    x.note(`+${NV.copas.vida * r.fallen} de Vida`);
  }
}
/** Escudo con el que empieza cada asalto, por las Bendiciones y el nivel de Bastos. */
export function escudoInicial(bend: readonly BendInst[]): number {
  const nv = nivelesReyes({ bendiciones: bend });
  let n = nv.bastos.nivel >= 1 ? NV.bastos.escudo : 0;
  for (const b of bend) n += BENDICION[b.id]?.escudo?.(b) ?? 0;
  return n;
}
/** ¿Hace falta tirar el dado cada turno? (la Taba cargada o Oros [4]) */
export function usaDado(bend: readonly BendInst[] | undefined): boolean {
  if (!bend?.length) return false;
  return bend.some((b) => BENDICION[b.id]?.dado) || nivelesReyes({ bendiciones: bend }).oros.nivel >= 2;
}
/** Lo que se cobra al cerrar un asalto ganado: por Bendición (con su nombre) y por el nivel de Oros. */
export function cierreBendiciones(bend: readonly BendInst[]): { id: string; label: string; oro: number; vida: number }[] {
  const out: { id: string; label: string; oro: number; vida: number }[] = [];
  for (const b of bend) {
    const d = BENDICION[b.id];
    const c = d?.cierre?.(b);
    if (c && ((c.oro ?? 0) > 0 || (c.vida ?? 0) > 0)) out.push({ id: b.id, label: d.name, oro: c.oro ?? 0, vida: c.vida ?? 0 });
  }
  if (nivelesReyes({ bendiciones: bend }).oros.nivel >= 1) out.push({ id: 'rey-oros', label: REY_NOMBRE.oros, oro: NV.oros.oro, vida: 0 });
  return out;
}

// ───────────────────────── Lo que ve la interfaz ─────────────────────────

/** El nombre de cada Rey (también `monarca.<id>.nombre` del diccionario). */
export const REY_NOMBRE: Record<ReyId, string> = { espadas: 'Rey de Espadas', bastos: 'Rey de Bastos', oros: 'Rey de Oros', copas: 'Rey de Copas' };

/** Una Bendición en la mesa: su Rey, sus cargas y lo que suman ahora («Espadas +6»). */
export interface BendVisible {
  id: string;
  rey: ReyId;
  duo?: ReyId;
  n: number;
  aporte: Aporte;
  /** Lo que suman ahora sus cargas (n × lo de cada carga). */
  total: number;
  /** La píldora en español: «Espadas +6» (sin cargas, el nombre del palo solo). */
  pildora: string;
}
/** Las Bendiciones que llevás, con sus cargas, para la mesa y el mapa. */
export function bendicionesVisibles(bend: readonly BendInst[] | undefined): BendVisible[] {
  return (bend ?? []).flatMap((b) => {
    const d = BENDICION[b.id];
    if (!d) return [];
    const total = b.n * d.porCarga;
    return [{ id: b.id, rey: d.rey, ...(d.duo ? { duo: d.duo } : {}), n: b.n, aporte: d.aporte, total, pildora: total ? `${REY_PALO[d.rey]} +${total}` : REY_PALO[d.rey] }];
  });
}

/** Cómo te mira un Rey: aliado (llevás alguna Bendición suya), rival (solo de otros) o neutral (de nadie). */
export type Relacion = 'aliado' | 'rival' | 'neutral';
export function relacionRey(bend: readonly BendInst[] | undefined, rey: ReyId): Relacion {
  const mias = (bend ?? []).map((b) => BENDICION[b.id]).filter((d): d is BendDef => !!d);
  if (mias.some((d) => esDe(d, rey))) return 'aliado';
  return mias.length ? 'rival' : 'neutral';
}
/** La clave de la frase del Rey jefe según cómo te mira (`rey.<id>.frase.<relación>`). */
export const fraseRey = (bend: readonly BendInst[] | undefined, rey: ReyId): string => `rey.${rey}.frase.${relacionRey(bend, rey)}`;

// ───────────────────────── La oferta ─────────────────────────

/** Una opción de la oferta: la Bendición y el Rey que la ofrece (una Dual la ofrece uno de sus dos Reyes). */
export interface OpcionBend {
  id: string;
  rey: ReyId;
  dual?: true;
}
const OF = BALANCE.oferta;
/** Cuántos Reyes ofrecen: al empezar la campaña, `oferta.inicio`; entre asaltos, `oferta.entre`. */
export const reyesEnOferta = (inicio: boolean): number => (inicio ? OF.inicio : OF.entre);

/** Un generador propio (como el de los Dones): la oferta no mueve ningún otro sorteo de la campaña. */
function azarDe(seed: number): (n: number) => number {
  let s = seed >>> 0;
  return (n: number) => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0;
    s = (Math.imul(s ^ (s >>> 13), 3266489909) + 0x9e3779b9) >>> 0;
    return ((s ^ (s >>> 16)) >>> 0) % n;
  };
}

/**
 * La oferta de Bendiciones: `cuantos` Reyes distintos (de los que aún tienen alguna por dar) ofrecen una suya al azar.
 * Si llevás al menos una Bendición de cada uno de dos Reyes y uno de ellos está en la oferta, su Dual puede ocupar
 * su sitio (una como mucho por oferta, con probabilidad `oferta.dual`). Reproducible: sale de la semilla, del asalto
 * y de lo que ya llevás, con un generador aparte.
 */
export function ofertaBendiciones(seed: number, stage: number, bend: readonly BendInst[], cuantos: number): OpcionBend[] {
  const azar = azarDe((seed ^ Math.imul(stage + 1, 0x85ebca6b) ^ Math.imul(bend.length + 7, 0xc2b2ae35)) >>> 0);
  const tengo = new Set(bend.map((b) => b.id));
  const libres = (r: ReyId) => bendicionesDe(r).filter((b) => !tengo.has(b.id));
  const reyes = REY_IDS.filter((r) => libres(r).length > 0);
  // los Reyes, barajados con el generador propio
  for (let i = reyes.length - 1; i > 0; i--) {
    const j = azar(i + 1);
    [reyes[i], reyes[j]] = [reyes[j], reyes[i]];
  }
  const out: OpcionBend[] = reyes.slice(0, cuantos).map((rey) => {
    const l = libres(rey);
    return { id: l[azar(l.length)].id, rey };
  });
  // una Dual, si toca
  const puede = DUALES.filter((d) => !tengo.has(d.id) && bend.some((b) => BENDICION[b.id]?.rey === d.rey || BENDICION[b.id]?.duo === d.rey) && bend.some((b) => BENDICION[b.id]?.rey === d.duo || BENDICION[b.id]?.duo === d.duo));
  const sitio = puede.flatMap((d) => out.map((o, i) => (o.rey === d.rey || o.rey === d.duo ? { d, i } : null)).filter((x): x is { d: BendDef; i: number } => !!x));
  if (sitio.length && azar(1000) < OF.dual * 1000) {
    const { d, i } = sitio[azar(sitio.length)];
    out[i] = { id: d.id, rey: out[i].rey, dual: true };
  }
  return out;
}

/** Lo que la interfaz enseña de una opción: los Reyes, y el nivel de cada uno antes y después de tomarla. */
export interface InfoOpcion {
  id: string;
  rey: ReyId;
  dual: boolean;
  reyes: { rey: ReyId; antes: NivelRey; despues: NivelRey; n: number; enciende: boolean }[];
}
export function infoOpcion(bend: readonly BendInst[], o: OpcionBend): InfoOpcion {
  const d = BENDICION[o.id];
  const antes = nivelesReyes({ bendiciones: bend });
  const despues = nivelesReyes({ bendiciones: [...bend, { id: o.id, n: 0 }] });
  return {
    id: o.id,
    rey: o.rey,
    dual: !!d?.duo,
    reyes: (d ? reyesDe(d) : [o.rey]).map((r) => ({ rey: r, antes: antes[r].nivel, despues: despues[r].nivel, n: despues[r].n, enciende: despues[r].nivel > antes[r].nivel })),
  };
}

/** Lo que dice el Bufón al abrir una oferta (clave `bufon.bendicion.<n>`): tienta sin dejar claro si ayuda. */
export const BUFON_BENDICION: string[] = [
  'Las coronas te sonríen. Elegí una... las que dejás no se olvidan.',
  'Un regalo de rey nunca es gratis, pero tampoco te lo voy a cobrar yo.',
  '¿Ese? Buena mano. O no. Lo vas a saber cuando el Rey te mire.',
  'Aceptá, aceptá. Al que le dice que no a un Rey, la corte lo recuerda.',
  'Cuanto más de un mismo Rey, más te quiere. Y más le dolés si cambiás.',
];
/** La frase del Bufón para la oferta de este asalto (siempre la misma con la misma semilla y asalto). */
export const fraseBufonOferta = (seed: number, stage: number): string => `bufon.bendicion.${(Math.abs((seed | 0) + stage * 3) % BUFON_BENDICION.length) + 1}`;

/** Frases de cada Rey cuando llega como jefe, según cómo lo trataste (`rey.<id>.frase.<relación>`, ≤ 90 caracteres). */
export const FRASES_REY: Record<ReyId, Record<Relacion, string>> = {
  espadas: {
    aliado: 'Llevás mi filo y todavía te animás a cruzarlo conmigo. Me gusta, che.',
    rival: '¿Preferiste a otros reyes? Mi espada no se olvida de un desaire.',
    neutral: 'Sin bendición de nadie. Valiente o zonzo: lo vemos en el primer tajo.',
  },
  bastos: {
    aliado: 'Mi garrote te cubrió todo el camino. Ahora probá si aguanta contra mí.',
    rival: 'Despreciaste mi palo por joyas y copas. Vas a sentir la madera.',
    neutral: 'Llegás sin nada que te ampare. El monte no perdona al desabrigado.',
  },
  oros: {
    aliado: 'Te presté mi suerte, ahora vengo a cobrarla con intereses.',
    rival: 'Le diste la espalda a mi oro. Un tacaño de alma, eso sos.',
    neutral: 'Sin una moneda de nadie. Qué pobreza, querido. Te compadezco.',
  },
  copas: {
    aliado: 'Brindamos juntos, ¿te acordás? Este último trago va por mi cuenta.',
    rival: 'Rechazaste mi copa y bebiste de otras. Qué desaire, qué sed tendrás.',
    neutral: 'Nadie te sirvió de beber. Sentate, que esta ronda la pago yo.',
  },
};
