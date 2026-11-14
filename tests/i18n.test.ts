// Paridad ES / EN (V10). Es una prueba de PARIDAD, no de inventario: recorre las claves que existan en los
// dos diccionarios y pide que cada una esté en los dos idiomas. Las claves de pantalla (`ui.*`) las añaden
// arte-ui y juice-ux y no se exigen aquí; las de reglas sí, porque salen de los datos.
//
//   · mismas claves, ninguna cadena vacía, los mismos `{campo}`
//   · mismas cifras (el multiconjunto de números, con la coma decimal normalizada)
//   · la constitución también en inglés: descripciones ≤ 115 caracteres, nombres propios ≤ 24
//   · ningún resto de español en el inglés (RESTOS_ES, salvo PERMITIDOS_EN)
//   · el glosario obligatorio de SPECS/V10.md (1.3) donde toca
//   · sin navegador, el idioma es 'es'; setLang avisa y t() cambia sin recargar
//   · el español no cambia: los textos de reglas son los de la 9.0 (tests/textos-es.json)
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRAND, brandFor } from '../src/shared/brand';
import { DICCIONARIOS, LANGS, PERMITIDOS_EN, RESTOS_ES, getLang, idiomaInicial, initLang, numFor, onLangChange, restosEs, setLang, t, tFor } from '../src/shared/i18n';
import { EN_UI } from '../src/shared/i18n/en';
import { ES, ES_PLANTILLAS, ES_UI } from '../src/shared/i18n/es';
import { fill, fillFor, BALANCE } from '../src/rules/balance-config';
import * as E from '../src/rules/engine';
import { KEYWORDS, keywordsInFor, markKeywordsFor } from '../src/rules/keywords';
import * as R from '../src/rules/run';
import { chooseAction } from '../src/rules/bot';
import { SPECIALS } from '../src/rules/specials';
import { TOOLS } from '../src/rules/tools';
import { autopsyFor, cobroFor, errorFor, omenFor, pasoFor } from '../src/rules/textos';
import { autopsy, omen } from '../src/rules/autopsy';
import { playCampaign } from '../scripts/lab';

const es = DICCIONARIOS.es;
const en = DICCIONARIOS.en;
const claves = Object.keys(es);
const campos = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
/** Los números de un texto, con la coma decimal española pasada a punto («1,5» → 1.5). */
const cifras = (s: string) =>
  [...s.replace(/\{\w+\}/g, ' ').matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.'))).sort((a, b) => a - b);

describe('paridad de claves', () => {
  it('las mismas claves en los dos idiomas (y hay de las dos partes que existan)', () => {
    expect(Object.keys(en).sort()).toEqual([...claves].sort());
    expect(Object.keys(EN_UI).sort()).toEqual(Object.keys(ES_UI).sort());
    expect(claves.length).toBeGreaterThan(500);
  });

  it('ninguna cadena vacía', () => {
    for (const lang of LANGS) for (const [k, v] of Object.entries(DICCIONARIOS[lang])) expect(v.trim(), `${lang} ${k}`).not.toBe('');
  });

  it('los mismos {campo} en las dos', () => {
    for (const k of claves) expect(campos(en[k]), k).toEqual(campos(es[k]));
  });

  it('las mismas cifras: el inglés no puede separarse del motor', () => {
    const malas = claves.filter((k) => JSON.stringify(cifras(en[k])) !== JSON.stringify(cifras(es[k]))).map((k) => `${k}: «${es[k]}» / «${en[k]}»`);
    expect(malas).toEqual([]);
  });

  it('cada pieza de reglas tiene sus claves (salen de los datos)', () => {
    for (const x of TOOLS) for (const c of ['nombre', 'desc']) expect(en[`reliquia.${x.id}.${c}`], x.id).toBeTruthy();
    for (const x of SPECIALS) for (const c of ['nombre', 'desc']) expect(en[`especial.${x.id}.${c}`], x.id).toBeTruthy();
    for (const b of R.BOSSES) for (const c of ['nombre', 'decreto', 'desc', 'badge', 'bark.entrada', 'bark.contraataque', 'bark.caida']) expect(en[`monarca.${b.id}.${c}`], `${b.id} ${c}`).toBeTruthy();
    R.STAGES.forEach((_, i) => expect(en[`asalto.${i + 1}.nombre`]).toBeTruthy());
    R.ASCENSIONS.forEach((_, i) => expect(en[`reinado.${i + 1}.desc`]).toBeTruthy());
    for (const k of KEYWORDS) expect(en[`palabra.${k.id}.nombre`]).toBeTruthy();
  });
});

describe('la constitución también en inglés', () => {
  const DESCS = /^(?:reliquia|especial|monarca|juramento|atajo|sello|acabado|estado)\.[^.]+\.desc$|^reinado\.\d+\.desc$/;
  const NOMBRES = /^(?:reliquia|especial|monarca|asalto|reinado|baraja|juramento|atajo|secreto|mejora|logro)\.[^.]+\.nombre$/;

  it('descripciones ≤ 115 caracteres, ya rellenas, y frases con punto', () => {
    const largas = claves.filter((k) => DESCS.test(k) && en[k].length > 115).map((k) => `${k} (${en[k].length}): ${en[k]}`);
    expect(largas).toEqual([]);
    for (const k of claves.filter((x) => DESCS.test(x))) expect(en[k], k).toMatch(/[.!]$/);
    const mas = Math.max(...claves.filter((k) => DESCS.test(k)).map((k) => en[k].length));
    expect(mas).toBeLessThanOrEqual(115);
  });

  it('nombres propios ≤ 24 caracteres y sin repetirse entre reliquias', () => {
    const largos = claves.filter((k) => NOMBRES.test(k) && en[k].length > 24).map((k) => `${k} (${en[k].length}): ${en[k]}`);
    expect(largos).toEqual([]);
    const reliquias = TOOLS.map((x) => en[`reliquia.${x.id}.nombre`]);
    expect(new Set(reliquias).size).toBe(reliquias.length);
  });

  it('placas ≤ 28 caracteres; voz de mesa ≤ 70, sin cifras', () => {
    for (const b of R.BOSSES) {
      expect(en[`monarca.${b.id}.badge`].length, b.id).toBeLessThanOrEqual(28);
      for (const c of ['entrada', 'contraataque', 'caida']) {
        const v = en[`monarca.${b.id}.bark.${c}`];
        expect(v.length, `${b.id} ${c}`).toBeLessThanOrEqual(70);
        expect(v, `${b.id} ${c}`).not.toMatch(/\d/);
      }
    }
  });

  it('las opciones de los Secretos se leen en dos segundos (≤ 24) y la guía cabe en una línea (≤ 60)', () => {
    for (const k of claves.filter((x) => /^secreto\..+\.(gana|cuesta)$/.test(x))) expect(en[k].length, k).toBeLessThanOrEqual(24);
    for (const k of claves.filter((x) => /^guia\..+\.linea$/.test(x))) expect(en[k].replace(/<[^>]*>/g, '').length, k).toBeLessThanOrEqual(60);
  });
});

describe('ningún resto de español en el inglés', () => {
  it('RESTOS_ES pilla lo español y deja pasar lo inglés', () => {
    expect(RESTOS_ES.test('Daño de Picas')).toBe(true);
    expect(RESTOS_ES.test('¿Envido?')).toBe(true);
    expect(RESTOS_ES.test('+2 Damage for each ♠ you play.')).toBe(false);
    expect(restosEs(`${BRAND.es.title} · ${BRAND.en.title}`)).toEqual([]);
    expect(PERMITIDOS_EN).toContain(BRAND.es.title);
  });

  it('ninguna entrada inglesa tiene restos', () => {
    const malas = Object.entries(en).flatMap(([k, v]) => (restosEs(v).length ? [`${k}: ${restosEs(v).join(', ')} | ${v}`] : []));
    expect(malas).toEqual([]);
  });
});

describe('glosario obligatorio (SPECS/V10.md, 1.3)', () => {
  it('palabras clave y palos', () => {
    expect(en['palabra.fuerza.nombre']).toBe('Damage');
    expect(en['palabra.resonancia.nombre']).toBe('Mult');
    expect(en['palabra.limpio.nombre']).toBe('Exact Hit');
    expect(en['palabra.fractura.nombre']).toBe('Breach');
    expect(en['palabra.apuntalado.nombre']).toBe('On Guard');
    expect(en['palabra.desarmada.nombre']).toBe('Disarmed');
    expect(['S', 'D', 'H', 'C'].map((s) => en[`palo.${s}.nombre`])).toEqual(['Spades', 'Diamonds', 'Hearts', 'Clubs']);
  });

  it('Health, Shield, Counterattack, Damage × Mult y Up the Sleeve donde toca', () => {
    expect(en['reliquia.casco.desc']).toContain('Health');
    expect(en['reliquia.encofrado.desc']).toContain('Shield');
    expect(en['monarca.doble.desc']).toContain('Counterattack');
    expect(en['palabra.resonancia.desc']).toContain('Damage × Mult');
    expect(en['guia.cuenta.linea']).toContain('Damage × Mult');
    expect(en['reliquia.pasarela.desc']).toContain('Up the Sleeve');
    expect(en['guia.manga.titulo']).toBe('Up the Sleeve');
    expect(en['monarca.inestable.desc']).toContain('Exact Hit');
  });

  it('las palabras clave se reconocen y se marcan en inglés con el mismo data-kw', () => {
    for (const k of KEYWORDS) {
      const nombre = en[`palabra.${k.id}.nombre`];
      expect(keywordsInFor('en', nombre).map((x) => x.id), nombre).toContain(k.id);
      expect(markKeywordsFor('en', `x ${nombre} x`)).toContain(`data-kw="${k.id}"`);
      // y aparece en algún texto de reglas inglés que no sea el suyo
      expect(Object.entries(en).some(([c, v]) => c !== `palabra.${k.id}.nombre` && keywordsInFor('en', v).some((x) => x.id === k.id)), nombre).toBe(true);
    }
    expect(markKeywordsFor('es', 'Daño')).toBe('<b class="kw" data-kw="fuerza">Daño</b>');
  });
});

describe('idioma de la sesión', () => {
  it('sin navegador es español; lo guardado manda y lo raro no', () => {
    expect(getLang()).toBe('es');
    expect(idiomaInicial(null)).toBe('es');
    expect(idiomaInicial(null, 'en-GB')).toBe('en');
    expect(idiomaInicial(null, 'es-AR')).toBe('es');
    expect(idiomaInicial('en', 'es-ES')).toBe('en');
    expect(idiomaInicial('fr', 'es-ES')).toBe('es');
  });

  it('setLang cambia al instante, guarda en derrumbe:idioma y avisa; t() cambia sin recargar', () => {
    const guardado = new Map<string, string>();
    expect(initLang({ load: (k) => guardado.get(k) ?? null, save: (k, v) => void guardado.set(k, v) })).toBe('es');
    const vistos: string[] = [];
    const deja = onLangChange((l) => vistos.push(l));
    expect(t('palabra.fuerza.nombre')).toBe('Daño');
    setLang('en');
    expect(getLang()).toBe('en');
    expect(t('palabra.fuerza.nombre')).toBe('Damage');
    expect(guardado.get('derrumbe:idioma')).toBe('en');
    setLang('en'); // sin cambio, sin aviso
    setLang('es');
    expect(vistos).toEqual(['en', 'es']);
    deja();
    setLang('en');
    expect(vistos).toEqual(['en', 'es']);
    // al volver a arrancar se recuerda la elección
    expect(initLang({ load: (k) => guardado.get(k) ?? null, save: (k, v) => void guardado.set(k, v) })).toBe('en');
    setLang('es');
    initLang(null);
    expect(getLang()).toBe('es');
  });

  it('cifras: coma en español, punto en inglés; t sustituye {campo}', () => {
    expect(numFor('es', 1.5)).toBe('1,5');
    expect(numFor('en', 1.5)).toBe('1.5');
    expect(numFor('en', 12)).toBe('12');
    expect(fillFor('es', '×{n} de Multi.', { n: 1.5 })).toBe(fill('×{n} de Multi.', { n: 1.5 }));
    expect(fillFor('en', '×{n} Mult.', { n: 1.5 })).toBe('×1.5 Mult.');
    expect(tFor('en', 'error.caben', { n: 6 })).toBe('Only 6 relics fit.');
    expect(tFor('es', 'error.caben', { n: 6 })).toBe('Solo caben 6 reliquias.');
    expect(tFor('en', 'no.existe')).toBe('no.existe');
  });

  it('la marca de cada idioma', () => {
    expect(brandFor('es').title).toBe('SANGRE Y PALO');
    expect(brandFor('es').seal).toBe('BLOOD & SUITS');
    expect(brandFor('en').title).toBe('BLOOD & SUITS');
    expect(brandFor('en').seal).toBe('SANGRE Y PALO');
    expect(brandFor('en').fullTitle).toBe('BLOOD & SUITS · Sangre y Palo');
    expect(brandFor('es').titleProse).toBe('Sangre y Palo');
  });
});

describe('el español no cambia', () => {
  it('los textos de reglas son los de la 9.0, letra por letra (tests/textos-es.json)', () => {
    const guardados = JSON.parse(readFileSync(new URL('./textos-es.json', import.meta.url), 'utf8')) as Record<string, string>;
    const reglas = Object.fromEntries(Object.entries(ES).filter(([k]) => !k.startsWith('ui.')));
    expect(reglas).toEqual(guardados);
  });

  it('las plantillas españolas son las cadenas del código de las reglas', () => {
    const fuente = ['engine', 'run', 'tools', 'achievements'].map((f) => readFileSync(new URL(`../src/rules/${f}.ts`, import.meta.url), 'utf8')).join('\n');
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const comoCodigo = (p: string) => new RegExp(p.split(/\{\w+\}/).map(esc).join('\\$\\{[^`]+?\\}'));
    const vistas = Object.entries(ES_PLANTILLAS).filter(([k]) => /^(?:error\.|paso\.|asalto\.infinito|logro\.desbloquea)/.test(k) && k !== 'paso.golpea.por');
    expect(vistas.length).toBeGreaterThan(60);
    for (const [k, p] of vistas) expect(comoCodigo(p).test(fuente), `${k}: «${p}»`).toBe(true);
  });

  it('las versiones con idioma, en español, dan lo de siempre', () => {
    expect(errorFor('es', 'No es tu turno.')).toBe('No es tu turno.');
    expect(cobroFor('es', 'Asalto ganado')).toBe('Asalto ganado');
  });
});

describe('textos al vuelo en inglés', () => {
  it('errores: cada uno tiene su inglés, sin restos', () => {
    for (const [k, p] of Object.entries(ES_PLANTILLAS).filter(([x]) => x.startsWith('error.'))) {
      const msg = fill(p, { n: 6 });
      const out = errorFor('en', msg);
      expect(out, k).toBe(tFor('en', k, { n: 6 }));
      expect(restosEs(out), k).toEqual([]);
    }
  });

  it('partidas jugadas: pasos de la cuenta, causa de la derrota y aviso, sin restos y con el español de siempre', () => {
    let pasos = 0;
    let causas = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const run = R.newRun({ ascension: seed % 8, up: { caja: 2 }, pool: SPECIALS.map((s) => s.id) }, seed);
      run.tools = [0, 1, 2, 3].map((k) => ({ id: TOOLS[(seed * 7 + k * 13) % TOOLS.length].id, n: k }));
      for (let k = 0; k < 4; k++) R.addSpecial(run, SPECIALS[(seed * 5 + k * 3) % SPECIALS.length].id);
      run.stage = 1 + (seed % 8);
      run.boss = seed % 2 ? R.BOSSES[seed % R.BOSSES.length].id : null;
      let state = R.startStage(run, [{ id: 'p0', name: 'p0' }]);
      for (let guard = 0; state.phase === 'playing' && guard < 400; guard++) {
        const res = E.applyAction(state, E.currentPlayer(state).id, chooseAction(state));
        state = res.state;
        for (const ev of res.events) {
          if (ev.e !== 'step') continue;
          expect(pasoFor('es', ev)).toBe(ev.label);
          expect(restosEs(pasoFor('en', ev)), ev.label).toEqual([]);
          pasos++;
        }
        const a = autopsy(res.events, state.config);
        expect(autopsyFor('es', res.events, state.config)).toEqual(a);
        const b = autopsyFor('en', res.events, state.config);
        if (a && b) {
          causas++;
          expect({ ...b, title: '', detail: '' }).toEqual({ ...a, title: '', detail: '' });
          expect(restosEs(`${b.title} ${b.detail}`), b.title).toEqual([]);
          expect(b.title.length, b.title).toBeLessThanOrEqual(90);
          expect(b.detail.length, b.detail).toBeLessThanOrEqual(110);
        }
        if (state.phase === 'playing') {
          const v = E.viewFor(state, E.currentPlayer(state).id);
          expect(omenFor('es', v)).toEqual(omen(v));
          const o = omenFor('en', v);
          if (o) expect(restosEs(`${o.title} ${o.detail}`), o.title).toEqual([]);
        }
      }
    }
    expect(pasos).toBeGreaterThan(200);
    expect(causas).toBeGreaterThan(3);
  }, 60_000);

  it('las líneas del cobro', () => {
    let lineas = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { run } = playCampaign({ seed, deck: 'obra', ascension: 0, full: true, giveTool: 'hucha' });
      for (const [label] of run.pay) {
        expect(restosEs(cobroFor('en', label)), label).toEqual([]);
        lineas++;
      }
    }
    expect(cobroFor('en', tFor('es', 'cuenta.vida'))).toBe(tFor('en', 'cuenta.vida'));
    expect(cobroFor('en', 'Bolsa de monedas')).toBe('Coin Purse');
    expect(lineas).toBeGreaterThan(0);
    expect(BALANCE.cobro.vidaCada).toBeGreaterThan(0);
  }, 60_000);
});
