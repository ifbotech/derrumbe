import { guardian } from './guardian';
guardian('i18n:check', 30); // tope duro: ver scripts/guardian.ts
// `npm run i18n:check`: paridad de claves entre español e inglés y tope de 100 caracteres en toda descripción.
// Es la puerta rápida del bucle V13 → V26 (menos de un segundo de trabajo); las pruebas completas de idioma
// siguen en `tests/i18n.test.ts`.
import { DICCIONARIOS } from '../src/shared/i18n';

const MAX_DESC = 100;
// las mismas descripciones que vigila la constitución (tests/i18n.test.ts)
const DESCS = /^(?:reliquia|especial|monarca|juramento|atajo|sello|acabado|estado|mejora)\.[^.]+\.desc$|^reinado\.\d+\.desc$|^secreto\.[^.]+(?:\.\d+)?\.desc$/;

const t0 = performance.now();
const { es, en } = DICCIONARIOS;
const fallos: string[] = [];

const soloEs = Object.keys(es).filter((k) => !(k in en));
const soloEn = Object.keys(en).filter((k) => !(k in es));
if (soloEs.length) fallos.push(`${soloEs.length} claves sin inglés: ${soloEs.slice(0, 8).join(', ')}${soloEs.length > 8 ? '…' : ''}`);
if (soloEn.length) fallos.push(`${soloEn.length} claves sin español: ${soloEn.slice(0, 8).join(', ')}${soloEn.length > 8 ? '…' : ''}`);

let maxEs = 0;
let maxEn = 0;
let descs = 0;
for (const [lang, d] of [['es', es], ['en', en]] as const) {
  for (const [k, v] of Object.entries(d)) {
    if (typeof v !== 'string' || !v.trim()) fallos.push(`${lang} ${k}: texto vacío`);
    if (!DESCS.test(k)) continue;
    if (lang === 'es') descs++;
    if (lang === 'es') maxEs = Math.max(maxEs, v.length);
    else maxEn = Math.max(maxEn, v.length);
    if (v.length > MAX_DESC) fallos.push(`${lang} ${k}: ${v.length} caracteres (tope ${MAX_DESC}): ${v}`);
  }
}

const ms = Math.round(performance.now() - t0);
console.log(`i18n: ${Object.keys(es).length} claves ES · ${Object.keys(en).length} claves EN · ${descs} descripciones · máximo ES ${maxEs} · máximo EN ${maxEn} · ${ms} ms`);
if (fallos.length) {
  for (const f of fallos.slice(0, 30)) console.log(`✗ ${f}`);
  console.log(`${fallos.length} fallos de idioma.`);
  process.exit(1);
}
console.log('Idiomas en orden.');
process.exit(0);
