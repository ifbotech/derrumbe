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
import { FIGURA_NOMBRE, FIGURAS, FORMACIONES_MAZO, FORMATION_NAME, FORMATIONS, MATERIAL, PALO_NOMBRE, SEAL, SEALS, SUITS, TOWER_FX, TREATMENT, TREATMENTS } from '../../rules/engine';
import { REGLA_MEJOR } from '../../rules/mejor-jugada';
import { KEYWORDS } from '../../rules/keywords';
import { ASCENSIONS, BOSSES, DECKS, EVENTS, STAGES, TIRANO, UPGRADES } from '../../rules/run';
import { RAIZ, RAMAS } from '../../rules/arbol';
import { SPECIALS } from '../../rules/specials';
import { ARCH, RARITY, TOOLS } from '../../rules/tools';
import { BENDICIONES, BONOS_REY, BUFON_BENDICION, FRASES_REY, REY_IDS, REY_NOMBRE, REY_PALO } from '../../rules/reyes';
import { FRASES_BUFON } from '../../rules/bufon';
import { REGLAS } from '../../rules/mazos';
import { ES_PLANTILLAS } from '../../rules/plantillas';
import { columna } from './ui-arte';
import { columnaJuice } from './ui-juice';

export { ES_PLANTILLAS };

/** Textos de pantalla. Los añaden arte-ui y juice-ux (clave `ui.<pantalla>.<qué>`); la paridad los recorre. */
export const ES_UI = { ...columna(0), ...columnaJuice(0) } as const satisfies Record<string, string>;
export type ClaveUi = keyof typeof ES_UI;


/** Los textos de reglas en español, por clave estable, tal como salen hoy de los datos. */
export function reglasEs(): Record<string, string> {
  const o: Record<string, string> = {};
  for (const t of TOOLS) {
    o[`reliquia.${t.id}.nombre`] = t.name;
    o[`reliquia.${t.id}.desc`] = t.desc;
  }
  // V40 1c · los 4 Reyes (sus bonos de nivel con 2 y 4 piezas y sus frases de jefe) y sus Bendiciones
  for (const r of REY_IDS) {
    o[`rey.${r}.nombre`] = REY_NOMBRE[r];
    o[`rey.${r}.palo`] = REY_PALO[r];
    BONOS_REY[r].forEach((b, i) => (o[`rey.${r}.bono.${i + 1}`] = b));
    for (const [rel, t] of Object.entries(FRASES_REY[r])) o[`rey.${r}.frase.${rel}`] = t;
  }
  for (const b of BENDICIONES) {
    o[`bendicion.${b.id}.nombre`] = b.name;
    o[`bendicion.${b.id}.desc`] = b.desc;
    o[`bendicion.${b.id}.carga`] = b.carga;
  }
  BUFON_BENDICION.forEach((t, i) => (o[`bufon.bendicion.${i + 1}`] = t));
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
  o['asalto.tirano.m'] = TIRANO.m;
  o['asalto.tirano.f'] = TIRANO.f;
  ASCENSIONS.forEach((a, i) => {
    o[`reinado.${i + 1}.nombre`] = a.name;
    o[`reinado.${i + 1}.desc`] = a.desc;
  });
  for (const d of DECKS) {
    o[`baraja.${d.id}.nombre`] = d.name;
    o[`baraja.${d.id}.lema`] = d.lema;
    o[`baraja.${d.id}.desc`] = d.desc;
  }
  // V40 · las reglas de los 5 Mazos
  for (const r of REGLAS) {
    o[`regla.${r.id}.nombre`] = r.name;
    o[`regla.${r.id}.desc`] = r.desc;
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
  // V12: los 30 nodos del Árbol de la Conjura (src/rules/arbol.ts); `.plantilla` se rellena con `cifraDe(id, rango)`
  for (const u of UPGRADES) {
    o[`mejora.${u.id}.nombre`] = u.name;
    o[`mejora.${u.id}.desc`] = u.desc;
    if (u.plantilla) o[`mejora.${u.id}.plantilla`] = u.plantilla;
  }
  for (const r of RAMAS) {
    o[`rama.${r.id}.nombre`] = r.name;
    o[`rama.${r.id}.desc`] = r.desc;
  }
  o['arbol.nombre'] = 'El Altar';
  o['arbol.desc'] = 'Gasta esquirlas aquí para mejorar para siempre.';
  o['arbol.raiz.nombre'] = RAIZ.name;
  o['arbol.raiz.desc'] = RAIZ.desc;
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
  for (const f of [...FORMATIONS, ...FORMACIONES_MAZO]) o[`formacion.${f}`] = FORMATION_NAME[f];
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
  // V40 · la baraja española: el nombre de cada palo (en mayúsculas, como en la mesa, y para leer) y de cada figura
  for (const s of SUITS) {
    o[`palo.${s}`] = MATERIAL[s];
    o[`palo.${s}.nombre`] = PALO_NOMBRE[s];
  }
  for (const r of FIGURAS) o[`figura.${r}`] = FIGURA_NOMBRE[r];
  // la cuenta del cobro (run.ts, finishBattle): las mismas cadenas que acaban en `run.pay`
  const C = BALANCE.cobro;
  o['cuenta.asalto'] = 'Asalto ganado';
  o['cuenta.bravo'] = 'Guardia Bravo';
  o['cuenta.vida'] = fill('Vida que te queda (1 por cada {n})', { n: C.vidaCada });
  o['cuenta.interes'] = fill('Interés (1 por cada {n} de oro)', { n: C.interesCada });
  // V12: la regla de Mejor jugada (src/rules/mejor-jugada.ts)
  o['regla.mejor'] = REGLA_MEJOR;
  o['mejor.nada'] = 'Ninguna jugada hace Daño: descarta o guarda en La Manga.';
  // V12: monedas, esquirlas, gotas, dados de hueso, tirada, imán, cobro y AUTO (anexo A de SPECS/V12.md)
  o['pieza.moneda.nombre'] = 'Monedas';
  o['pieza.moneda.desc'] = 'Oro para La Pulpería.';
  o['pieza.esquirla.nombre'] = 'Esquirlas de Corona';
  o['pieza.esquirla.desc'] = 'Trozos de corona: se guardan aunque pierdas.';
  o['pieza.gota.nombre'] = 'Gotas de lacre';
  o['pieza.gota.desc'] = fill('Juntá {n} y la Mesa de lacre te sella gratis.', { n: BALANCE.caida.gotasPorSello });
  o['hueso.oro.nombre'] = 'Dado de oro';
  o['hueso.oro.desc'] = 'Multiplica tus monedas del asalto.';
  o['hueso.corona.nombre'] = 'Dado de la Corona';
  o['hueso.corona.desc'] = 'Multiplica tus esquirlas del asalto.';
  o['ritual.nombre'] = 'Tirada de huesos';
  o['ritual.desc'] = 'Tras ganar un asalto, los dados multiplican lo que cayó.';
  o['iman.nombre'] = 'Imán';
  o['iman.desc'] = 'Lo que cae vuela solo a tu bolsa.';
  o['cobro.conjura.nombre'] = 'Cobro de la conjura';
  o['cobro.conjura.desc'] = 'Las esquirlas que ganás al acabar la campaña.';
  o['auto.nombre'] = 'AUTO';
  o['auto.desc'] = 'El juego juega solo. Tocá para volver.';
  o['auto.saquear.nombre'] = 'Auto-saquear';
  o['auto.saquear.desc'] = 'El bot elige tu Botín.';
  o['auto.taberna.nombre'] = 'Auto-pulpería';
  o['auto.taberna.desc'] = 'El bot compra en La Pulpería y elige ruta.';
  o['auto.pausa.botin'] = 'AUTO espera: elige tu Botín.';
  o['auto.pausa.bendicion'] = 'AUTO espera: elegí tu Bendición.';
  o['auto.pausa.taberna'] = 'AUTO espera: compra en La Pulpería o sigue.';
  o['auto.pausa.mapa'] = 'AUTO espera: elige tu ruta en el Mapa.';
  o['auto.pausa.secreto'] = 'AUTO espera: elige en el Secreto.';
  o['auto.pausa.fin'] = 'La campaña terminó: AUTO se apaga.';
  o['auto.pausa.coop'] = 'En cooperativo se juega a mano.';
  // V40 · lo que dice el Bufón en los tres primeros golpes de la primera campaña (src/rules/bufon.ts)
  for (const b of FRASES_BUFON) o[`bufon.${b.id}`] = b.texto;
  return { ...o, ...ES_PLANTILLAS };
}

/** El diccionario español completo: pantalla + reglas. */
export const ES: Record<string, string> = { ...ES_UI, ...reglasEs() };
