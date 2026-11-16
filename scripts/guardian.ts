// Guardián anti-cuelgue (misión V12 → V26). Todo script de puertas lo llama al empezar:
//
//   import { guardian } from './guardian';
//   guardian('qa:smoke', 900);
//
// · Si el script pasa de sus segundos, escribe por qué y sale con 124: ningún temporizador, zócalo ni navegador
//   abierto puede dejar a Node colgado en Windows.
// · Una excepción o una promesa rechazada que nadie recoge sale con 1 en vez de dejar el proceso vivo con el
//   navegador y el servidor abiertos.
// · `GUARDIAN_S=<segundos>` cambia el tope sin tocar el script (0 lo desactiva).
// El tope de fuera lo pone `node scripts/con-tope.mjs <segundos> <orden…>`, que además mata el árbol de procesos.

let armado = false;

export function guardian(nombre: string, segundos: number): void {
  if (armado) return;
  armado = true;
  const pedido = Number(process.env.GUARDIAN_S);
  const tope = Number.isFinite(pedido) && process.env.GUARDIAN_S !== undefined && process.env.GUARDIAN_S !== '' ? pedido : segundos;
  const empezo = Date.now();
  const morir = (motivo: string, codigo: number): never => {
    const seg = Math.round((Date.now() - empezo) / 1000);
    console.error(`\nGUARDIÁN · ${nombre}: ${motivo} (a los ${seg} s). Se corta con ${codigo}.`);
    process.exit(codigo);
  };
  // `unref`: el reloj no mantiene vivo a un script que termina solo; si algo lo deja colgado (un zócalo, un
  // intervalo), el bucle de eventos sigue vivo por eso mismo y el reloj dispara igual.
  if (tope > 0) setTimeout(() => morir(`pasó de ${tope} s`, 124), tope * 1000).unref();
  process.on('unhandledRejection', (e) => morir(`promesa rechazada sin recoger: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`, 1));
  process.on('uncaughtException', (e) => morir(`excepción sin recoger: ${e.stack ?? e.message}`, 1));
}
