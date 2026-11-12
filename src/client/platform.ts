// Puente con la plataforma. Todo lo que el juego le pide a «la máquina» —guardar, pantalla completa,
// vibrar, logros del sistema, dónde está el servidor de salas— pasa por aquí. En el navegador lo
// resuelve la web; una envoltura de escritorio (Tauri + Steamworks, por ejemplo) solo tiene que
// llamar a setPlatform() con su propia implementación: el resto del juego no cambia.

export interface PlatformBridge {
  readonly name: string;
  /** Guardado local (partida, gremio, ajustes). En Steam, aquí iría Steam Cloud. */
  load(key: string): string | null;
  save(key: string, value: string): void;
  remove(key: string): void;
  /** Avisa a la plataforma de un logro recién conseguido (el juego ya lo ha anotado en el gremio). */
  unlockAchievement(id: string, name: string): void;
  isFullscreen(): boolean;
  toggleFullscreen(): Promise<void>;
  /** Vibración breve (móvil o mando). `strength` de 0 a 1. */
  vibrate(ms: number, strength?: number): void;
  /** Dirección del servidor de salas, o null si esta instalación es solo local. */
  serverUrl(): string | null;
}

const SERVER_KEY = 'derrumbe:server';

function webPlatform(): PlatformBridge {
  const memory = new Map<string, string>(); // por si el navegador no deja usar localStorage
  const storage = (): Storage | null => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };
  return {
    name: 'web',
    load(key) {
      try {
        return storage()?.getItem(key) ?? memory.get(key) ?? null;
      } catch {
        return memory.get(key) ?? null;
      }
    },
    save(key, value) {
      memory.set(key, value);
      try {
        storage()?.setItem(key, value);
      } catch {
        /* cuota llena o modo privado: queda en memoria */
      }
    },
    remove(key) {
      memory.delete(key);
      try {
        storage()?.removeItem(key);
      } catch {
        /* nada que hacer */
      }
    },
    unlockAchievement() {
      /* la web no tiene logros de sistema */
    },
    isFullscreen: () => !!document.fullscreenElement,
    async toggleFullscreen() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch {
        /* el navegador lo ha denegado */
      }
    },
    vibrate(ms, strength = 0.6) {
      try {
        navigator.vibrate?.(ms);
        for (const pad of navigator.getGamepads?.() ?? []) {
          const motor = (pad as (Gamepad & { vibrationActuator?: { playEffect?: (type: string, params: object) => Promise<unknown> } }) | null)?.vibrationActuator;
          void motor?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 })?.catch(() => undefined);
        }
      } catch {
        /* sin vibración */
      }
    },
    serverUrl() {
      const custom = this.load(SERVER_KEY)?.trim();
      if (custom) return custom.replace(/^http/, 'ws').replace(/\/?$/, '').replace(/\/ws$/, '') + '/ws';
      const fixed = (import.meta.env.VITE_SERVER as string | undefined)?.trim();
      if (fixed) return fixed;
      // servido por el propio servidor de salas (npm start / npm run dev): mismo origen
      if (location.protocol === 'http:' || location.protocol === 'https:') return import.meta.env.VITE_STATIC ? null : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
      return null; // file://, tauri://…: sin servidor salvo que se configure uno
    },
  };
}

export let platform: PlatformBridge = webPlatform();
/** Sustituye la plataforma (lo llama la envoltura de escritorio antes de arrancar el juego). */
export function setPlatform(next: PlatformBridge): void {
  platform = next;
}
/** Dirección del servidor de salas escrita por el jugador (instalaciones sin servidor propio). */
export const customServer = () => platform.load(SERVER_KEY) ?? '';
export function setCustomServer(url: string): void {
  if (url.trim()) platform.save(SERVER_KEY, url.trim());
  else platform.remove(SERVER_KEY);
}

/** Lee un valor guardado como JSON; null si no existe o está corrupto. */
export function loadJson<T>(key: string): T | null {
  try {
    return JSON.parse(platform.load(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
export const saveJson = (key: string, value: unknown) => platform.save(key, JSON.stringify(value));
