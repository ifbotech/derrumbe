// V7 · Mesa brava y lectura rápida: la voz de los siete monarcas, su maldición a la vista, los Secretos
// de la cripta en dos segundos y el factor de palo que pinta el sello de las cartas (fricción F1).
import { describe, expect, it } from 'vitest';
import { BEATS, CardSuit, Config, DEFAULT_CONFIG, SUITS, Suit, multiplier } from '../src/rules/engine';
import { BOSS, BOSSES, EVENTS, bossIdentity } from '../src/rules/run';
import { TOOL } from '../src/rules/tools';
import { GLYPH } from '../src/client/glyphs';

/** Palabras del glosario de mecánicas: un bark no se puede leer como una regla. Sobre minúsculas sin tildes. */
const MECANICAS = /\b(dano|danos|multi|golpes?|golpe exacto|brechas?|en guardia|desarmad[oa]s?|vida|vidas|escudos?|contraataques?|mazos?|descartes?|descartar|reliquias?)\b/;
const llano = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

describe('mesa brava: la voz de los monarcas', () => {
  const barks = BOSSES.flatMap((b) => [b.barks.entrada, b.barks.contraataque, b.barks.caida]);

  it('los siete monarcas, con tres líneas cada uno: 21 distintas', () => {
    expect(BOSSES.map((b) => b.id)).toEqual(['doble', 'escasez', 'sequia', 'intemperie', 'blindaje', 'furia', 'inestable']);
    expect(barks).toHaveLength(21);
    expect(new Set(barks).size).toBe(21);
  });

  it('cada bark cabe en 70 caracteres, sin cifras y sin palabras de reglas', () => {
    for (const b of BOSSES)
      for (const [k, t] of Object.entries(b.barks)) {
        const id = `${b.id}.${k}: «${t}»`;
        expect(t.trim().length, id).toBeGreaterThan(8);
        expect(t.length, id).toBeLessThanOrEqual(70);
        expect(t, id).not.toMatch(/\d/);
        expect(llano(t), id).not.toMatch(MECANICAS);
        expect(t, id).not.toMatch(/<[^>]+>/);
      }
  });

  it('suena a mesa de naipes: el envido, el retruco, el quiero, el vale cuatro y el naipe bravo salen', () => {
    const todo = llano(barks.join(' '));
    for (const w of ['envido', 'retruco', 'quiero', 'vale cuatro', 'naipe bravo']) expect(todo, w).toContain(w);
  });
});

describe('la maldición a la vista', () => {
  it('cada monarca marca una parte distinta de la mesa, con una placa de 28 caracteres como mucho', () => {
    const marks = BOSSES.map((b) => b.curse.mark);
    expect(new Set(marks).size).toBe(BOSSES.length);
    expect(Object.fromEntries(BOSSES.map((b) => [b.id, b.curse.mark]))).toEqual({
      doble: 'contraataque',
      escasez: 'mano',
      sequia: 'corazones',
      intemperie: 'escudo',
      blindaje: 'guardias',
      furia: 'ataque',
      inestable: 'asedio',
    });
    for (const b of BOSSES) {
      expect(b.curse.badge.length, b.id).toBeLessThanOrEqual(28);
      expect(b.curse.badge.trim().length, b.id).toBeGreaterThan(3);
    }
  });

  it('las placas con número dicen el mismo número que la regla', () => {
    // lo comprueba aplicando la maldición: la placa no puede contar una cuenta distinta
    const cfg = (id: string): Config => {
      const c = structuredClone(DEFAULT_CONFIG);
      BOSS[id].apply(c);
      return c;
    };
    expect(cfg('doble').sirenCount).toBe(Number(BOSS.doble.curse.badge.match(/\d+/)![0]));
    expect(DEFAULT_CONFIG.handSize[1] - cfg('escasez').handSize[1]).toBe(Number(BOSS.escasez.curse.badge.match(/\d+/)![0]));
    expect(cfg('intemperie').wallCap).toBe(Number(BOSS.intemperie.curse.badge.match(/\d+/)![0]));
    expect(cfg('blindaje').bracedThreat).toBe(Number(BOSS.blindaje.curse.badge.match(/\d+/)![0]));
    expect(cfg('furia').floorThreat[11] - DEFAULT_CONFIG.floorThreat[11]).toBe(Number(BOSS.furia.curse.badge.match(/\d+/)![0]));
    const c = { ...DEFAULT_CONFIG, fatigueStart: 8 };
    BOSS.inestable.apply(c);
    expect(8 - c.fatigueStart!).toBe(Number(BOSS.inestable.curse.badge.match(/\d+/)![0]));
  });

  it('bossIdentity da quién es, su maldición, su voz y su placa, sin compartir los datos', () => {
    for (const b of BOSSES) {
      const id = bossIdentity(b.id)!;
      expect(id).toEqual({ who: b.who, name: b.name, desc: b.desc, barks: b.barks, curse: b.curse });
      id.barks.entrada = 'x';
      id.curse.badge = 'x';
      expect(b.barks.entrada).not.toBe('x');
      expect(b.curse.badge).not.toBe('x');
    }
    expect(bossIdentity('nadie')).toBeNull();
  });
});

describe('Secretos de la cripta en dos segundos', () => {
  it('cada opción dice lo que da y lo que cuesta en 24 caracteres, con un emblema que existe', () => {
    for (const ev of EVENTS)
      for (const o of ev.options) {
        const id = `${ev.id} · ${o.label}`;
        expect(o.read.gain.trim().length, id).toBeGreaterThan(0);
        expect(o.read.gain.length, id).toBeLessThanOrEqual(24);
        expect(o.read.cost.length, id).toBeLessThanOrEqual(24);
        expect(GLYPH[o.read.glyph], `${id}: emblema ${o.read.glyph}`).toBeTruthy();
      }
  });

  it('lo que cuesta está vacío solo en las opciones gratis, y nunca es igual a lo que da', () => {
    const free = EVENTS.flatMap((ev) => ev.options.filter((o) => !o.read.cost).map((o) => `${ev.id}:${o.label}`));
    expect(free).toEqual(['caja:Vendérselo al Tratante', 'horno:Calentarse y seguir', 'contrato:Romperlo', 'clandestino:Seguir de largo', 'planos:Dejarlos donde están']);
    for (const ev of EVENTS) for (const o of ev.options) expect(o.read.gain).not.toBe(o.read.cost);
  });
});

describe('F1 · el factor de palo que lleva el sello de cada carta', () => {
  const pairs = SUITS.flatMap((c) => SUITS.map((t): [Suit, Suit] => [c, t]));
  const withTool = (id: string, base: Config = DEFAULT_CONFIG): Config => {
    const c = structuredClone(base);
    TOOL[id].cfg!(c);
    return c;
  };

  it('con la configuración por defecto: 0 contra su propio trono, 2 con ventaja y 1 en el resto (16 pares)', () => {
    expect(pairs).toHaveLength(16);
    for (const [c, t] of pairs) expect(multiplier(c, t, DEFAULT_CONFIG), `${c}→${t}`).toBe(c === t ? 0 : BEATS[c] === t ? 2 : 1);
    // sin configuración, la misma rueda
    for (const [c, t] of pairs) expect(multiplier(c, t)).toBe(multiplier(c, t, DEFAULT_CONFIG));
    // la rueda: cada palo tiene ventaja contra uno solo y ese no la tiene contra él
    for (const s of SUITS) expect(pairs.filter(([c, t]) => c === s && multiplier(c, t) === 2)).toHaveLength(1);
  });

  it('con la Gota de veneno (acido) nadie es Inmune: ×1 contra el propio trono', () => {
    const cfg = withTool('acido');
    for (const [c, t] of pairs) expect(multiplier(c, t, cfg), `${c}→${t}`).toBe(c === t ? 1 : BEATS[c] === t ? 2 : 1);
  });

  it('con la Máscara de traidor (contrapeso) el propio palo pega con ventaja, y sigue a la ventaja vigente', () => {
    const cfg = withTool('contrapeso');
    for (const [c, t] of pairs) expect(multiplier(c, t, cfg), `${c}→${t}`).toBe(c === t ? 2 : BEATS[c] === t ? 2 : 1);
    // con el Barril de pólvora delante la ventaja es ×3, y la Máscara la copia
    const fuerte = withTool('contrapeso', withTool('dinamita'));
    for (const [c, t] of pairs) expect(multiplier(c, t, fuerte), `${c}→${t}`).toBe(c === t ? 3 : BEATS[c] === t ? 3 : 1);
  });

  it('un comodín (o una carta especial, palo X) no lleva factor: 0 contra cualquier trono', () => {
    for (const t of SUITS) {
      expect(multiplier('X' as CardSuit, t, DEFAULT_CONFIG)).toBe(0);
      expect(multiplier('X', t, withTool('acido'))).toBe(0);
      expect(multiplier('X', t, withTool('contrapeso'))).toBe(0);
    }
  });
});
