// Diccionario español (V10). Dos partes:
//   · `ES_UI`: los textos de pantalla (`ui.*`), un objeto fijo que escriben arte-ui y juice-ux. El inglés
//     va tipado contra sus claves (`Record<ClaveUi, string>`): una clave que falte no compila.
//   · `reglasEs()`: los textos de las reglas, recorridos desde los datos de src/rules tal como hoy los ve
//     el jugador (ya rellenos con sus cifras). Ningún texto español se reescribe aquí: sale de los datos.
//     Las únicas plantillas escritas a mano son las de los textos que las reglas montan al vuelo (causa
//     de la derrota, aviso de último turno, pasos de la cuenta y errores); las vigilan tests/autopsy.test.ts,
//     tests/i18n.test.ts y la foto de textos de la V10, que exigen que salgan letra por letra iguales.
import { ACHIEVEMENTS, unlocksOf } from '../../rules/achievements';
import { fill, BALANCE } from '../../rules/balance-config';
import { FORMATION_NAME, FORMATIONS, MATERIAL, SEAL, SEALS, SUITS, TOWER_FX, TREATMENT, TREATMENTS } from '../../rules/engine';
import { KEYWORDS } from '../../rules/keywords';
import { ASCENSIONS, BOSSES, CONTRACTS, DECKS, EVENTS, STAGES, TAGS, UPGRADES } from '../../rules/run';
import { SPECIALS } from '../../rules/specials';
import { ARCH, RARITY, TOOLS } from '../../rules/tools';
import { TUTORIAL_STEPS, createTutorial } from '../../rules/tutorial';
import { ES_PLANTILLAS } from '../../rules/plantillas';
import { columna } from './ui-arte';
import { columnaJuice } from './ui-juice';

export { ES_PLANTILLAS };

/** Textos de pantalla. Los añaden arte-ui y juice-ux (clave `ui.<pantalla>.<qué>`); la paridad los recorre. */
export const ES_UI = { ...columna(0), ...columnaJuice(0) } as const satisfies Record<string, string>;
export type ClaveUi = keyof typeof ES_UI;


/** Mayúscula inicial y el resto en minúscula: «PICAS» → «Picas», «TRÉBOLES» → «Tréboles». */
const capital = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Los textos de reglas en español, por clave estable, tal como salen hoy de los datos. */
export function reglasEs(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const t of TOOLS) {
    o[`reliquia.${t.id}.nombre`] = t.name;
    o[`reliquia.${t.id}.desc`] = t.desc;
  }
  for (const [r, v] of Object.entries(RARITY)) o[`rareza.${r}`] = v.name;
  for (const [a, v] of Object.entries(ARCH)) o[`arquetipo.${a}`] = v;
  for (const s of SPECIALS) {
    o[`especial.${s.id}.nombre`] = s.name;
    o[`especial.${s.id}.desc`] = s.desc;
  }
  for (const b of BOSSES) {
    o[`monarca.${b.id}.nombre`] = b.who;
    o[`monarca.${b.id}.decreto`] = b.name;
    o[`monarca.${b.id}.desc`] = b.desc;
    o[`monarca.${b.id}.badge`] = b.curse.badge;
    o[`monarca.${b.id}.bark.entrada`] = b.barks.entrada;
    o[`monarca.${b.id}.bark.contraataque`] = b.barks.contraataque;
    o[`monarca.${b.id}.bark.caida`] = b.barks.caida;
  }
  STAGES.forEach((s, i) => (o[`asalto.${i + 1}.nombre`] = s.name));
  ASCENSIONS.forEach((a, i) => {
    o[`reinado.${i + 1}.nombre`] = a.name;
    o[`reinado.${i + 1}.desc`] = a.desc;
  });
  for (const d of DECKS) {
    o[`baraja.${d.id}.nombre`] = d.name;
    o[`baraja.${d.id}.desc`] = d.desc;
  }
  for (const c of CONTRACTS) {
    o[`juramento.${c.id}.nombre`] = c.name;
    o[`juramento.${c.id}.desc`] = c.desc;
    o[`juramento.${c.id}.premio`] = c.reward;
  }
  for (const t of TAGS) {
    o[`atajo.${t.id}.nombre`] = t.name;
    o[`atajo.${t.id}.desc`] = t.desc;
  }
  for (const e of EVENTS) {
    o[`secreto.${e.id}.nombre`] = e.name;
    o[`secreto.${e.id}.texto`] = e.text;
    e.options.forEach((op, i) => {
      o[`secreto.${e.id}.${i}.etiqueta`] = op.label;
      o[`secreto.${e.id}.${i}.desc`] = op.desc;
      o[`secreto.${e.id}.${i}.gana`] = op.read.gain;
      // «lo que cuesta» vacío quiere decir gratis: no hay texto que traducir
      if (op.read.cost) o[`secreto.${e.id}.${i}.cuesta`] = op.read.cost;
    });
  }
  for (const u of UPGRADES) {
    o[`mejora.${u.id}.nombre`] = u.name;
    o[`mejora.${u.id}.desc`] = u.desc;
  }
  for (const a of ACHIEVEMENTS) {
    o[`logro.${a.id}.nombre`] = a.name;
    o[`logro.${a.id}.desc`] = a.desc;
    const u = unlocksOf(a.id);
    if (u) o[`logro.${a.id}.desbloquea`] = u;
  }
  for (const k of KEYWORDS) {
    o[`palabra.${k.id}.nombre`] = k.name;
    o[`palabra.${k.id}.desc`] = k.desc;
  }
  for (const f of FORMATIONS) o[`formacion.${f}`] = FORMATION_NAME[f];
  for (const s of SEALS) {
    o[`sello.${s}.nombre`] = SEAL[s].name;
    o[`sello.${s}.desc`] = SEAL[s].desc;
  }
  for (const t of TREATMENTS) {
    o[`acabado.${t}.nombre`] = TREATMENT[t].name;
    o[`acabado.${t}.desc`] = TREATMENT[t].desc;
  }
  for (const [k, v] of Object.entries(TOWER_FX)) {
    o[`estado.${k}.nombre`] = v.name;
    o[`estado.${k}.desc`] = v.desc;
  }
  for (const s of SUITS) {
    o[`palo.${s}`] = MATERIAL[s];
    o[`palo.${s}.nombre`] = capital(MATERIAL[s]);
  }
  // la cuenta del cobro (run.ts, finishBattle): las mismas cadenas que acaban en `run.pay`
  const C = BALANCE.cobro;
  o['cuenta.asalto'] = 'Asalto ganado';
  o['cuenta.exactos'] = 'Golpes exactos';
  o['cuenta.vida'] = fill('Vida que te queda (1 por cada {n})', { n: C.vidaCada });
  o['cuenta.interes'] = fill('Interés (1 por cada {n} de oro)', { n: C.interesCada });
  // la partida guiada
  for (const s of TUTORIAL_STEPS) {
    o[`guia.${s.id}.titulo`] = s.title;
    o[`guia.${s.id}.linea`] = s.line;
  }
  o['guia.jugador'] = createTutorial().players[0].name;
  return { ...o, ...ES_PLANTILLAS };
}

/** El diccionario español completo: pantalla + reglas. */
export const ES: Record<string, string> = { ...ES_UI, ...reglasEs() };
