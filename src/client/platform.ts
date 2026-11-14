// Puente con la plataforma. Todo lo que el juego le pide a «la máquina» —guardar, pantalla completa,
// vibrar, logros del sistema, dónde está el servidor de salas— pasa por aquí. En el navegador lo
// resuelve la web; una envoltura de escritorio (Tauri + Steamworks, por ejemplo) solo tiene que
// llamar a setPlatform() con su propia implementación: el resto del juego no cambia.

export interface PlatformBridge {
  readonly name: string;
  /** Guardado local (partida, la Orden, ajustes). En Steam, aquí iría Steam Cloud. */
  load(key: string): string | null;
  save(key: string, value: string): void;
  remove(key: string): void;
  /** Avisa a la plataforma de un logro recién conseguido (el juego ya lo ha anotado en la Orden). */
  unlockAchievement(id: string, name: string): void;
  isFullscreen(): boolean;
  toggleFullscreen(): Promise<void>;
  /** Vibración breve (móvil o mando). `strength` de 0 a 1. */
  vibrate(ms: number, strength?: number): void;
  /** Dirección del servidor de salas, o null si esta instalación es solo local. */
  serverUrl(): string | null;
  /** Claves guardadas que empiezan por `prefix` (para la copia de seguridad). */
  keys(prefix: string): string[];
  /** Entrega un archivo al jugador, texto o binario (descarga en la web; diálogo de guardar en escritorio). */
  saveFile(name: string, data: string | Blob): void;
  /** Abre una dirección fuera del juego (navegador, o la capa de Steam en escritorio). */
  openExternal(url: string): void;
  // ── V10 · ganchos de escritorio (Tauri + Steamworks). Opcionales: la web no los tiene ──
  /** Idioma del cliente de Steam tal como lo da Steamworks («spanish», «latam», «english»…), o null. */
  steamLanguage?(): string | null;
  /** Abre una dirección en la capa de Steam. Devuelve si la capa la abrió (si no, se abre como en la web). */
  openOverlay?(url: string): Promise<boolean>;
  /** Estado de presencia de Steam (Rich Presence): `clave` → `valor`. */
  setPresence?(key: string, value: string): void;
  /** Título de la ventana del escritorio. */
  setTitle?(title: string): void;
  /** Sube a Steam Cloud una copia de lo guardado (`derrumbe:*`). Devuelve si se subió. */
  cloudPush?(): Promise<boolean>;
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
    keys(prefix) {
      const out = new Set<string>([...memory.keys()].filter((k) => k.startsWith(prefix)));
      try {
        const store = storage();
        for (let i = 0; store && i < store.length; i++) {
          const k = store.key(i);
          if (k?.startsWith(prefix)) out.add(k);
        }
      } catch {
        /* solo lo que haya en memoria */
      }
      return [...out];
    },
    saveFile(name, data) {
      const url = URL.createObjectURL(typeof data === 'string' ? new Blob([data], { type: 'application/json' }) : data);
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    },
    openExternal(url) {
      window.open(url, '_blank', 'noopener');
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

// ───────────────────────── V10 · Escritorio: Tauri + Steamworks ─────────────────────────
// La envoltura (tauri/, Tauri v2 con `app.withGlobalTauri`) deja `window.__TAURI__.core.invoke`. Este
// puente parte del de la web y, para lo que Steam hace mejor, llama por `invoke` a los comandos de STEAM:
// si la envoltura no los registra (o fallan), hace lo de la web. Sin SDK ni dependencias en el repositorio:
// los comandos los escribe en Rust quien conecte Steamworks (ver tauri/README.md).

/** `invoke` de Tauri v2: comando y argumentos; la promesa falla si el comando no existe. */
export type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

/** Los comandos de Steam que el puente pide a la envoltura, con sus argumentos y lo que devuelven. */
export const STEAM = {
  /** `{ id }` → nada. El logro de la Orden, con su `id` (el de src/rules/achievements.ts). */
  achievement: 'steam_unlock_achievement',
  /** nada → `string` (idioma del cliente de Steam: «spanish», «latam», «english»…) o `null`. */
  language: 'steam_language',
  /** `{ url }` → `boolean` (true si la capa de Steam la abrió). */
  overlay: 'steam_open_overlay',
  /** `{ key, value }` → nada. Rich Presence. */
  presence: 'steam_set_presence',
  /** `{ data }` (JSON con las claves `derrumbe:*`) → `boolean`. */
  cloudPush: 'steam_cloud_push',
  /** nada → `string` (el mismo JSON) o `null` si Steam Cloud no tiene copia. */
  cloudPull: 'steam_cloud_pull',
} as const;
/** Comando del núcleo de Tauri v2 para cambiar el título de la ventana (permiso en tauri/capabilities). */
export const TAURI_SET_TITLE = 'plugin:window|set_title';

/** El `invoke` de la envoltura de escritorio, o null en la web. */
export function tauriInvoke(): Invoke | null {
  const w = globalThis as { __TAURI__?: { core?: { invoke?: Invoke } } };
  return typeof w.__TAURI__?.core?.invoke === 'function' ? w.__TAURI__.core.invoke : null;
}

/** Idioma del juego a partir del de Steam: «spanish» y «latam» → español; cualquier otro → inglés. */
export function steamLang(steam: string | null | undefined): 'es' | 'en' | null {
  if (typeof steam !== 'string' || !steam.trim()) return null;
  return /^(spanish|latam)$/i.test(steam.trim()) ? 'es' : 'en';
}

/** Lo que se guarda en la nube: todo lo del juego menos la dirección del servidor de esta instalación. */
const CLOUD_PREFIX = 'derrumbe:';
const cloudKeys = (p: PlatformBridge) => p.keys(CLOUD_PREFIX).filter((k) => k !== SERVER_KEY);

/** El puente de escritorio con sus extras: `ready` (Steam ya contestó) y si se recuperó una copia de la nube. */
export type DesktopBridge = PlatformBridge & { ready: Promise<void>; restored: boolean };

/**
 * El puente de escritorio: el de la web más Steam. `invoke` y `base` se pueden inyectar (las pruebas
 * usan un `invoke` falso). Ningún fallo de un comando de Steam llega al juego: se cae a lo de la web.
 */
export function tauriPlatform(invoke: Invoke | null = tauriInvoke(), base: PlatformBridge = webPlatform(), pushDelay = 1500): DesktopBridge {
  const call = (cmd: string, args?: Record<string, unknown>): Promise<unknown> => {
    if (!invoke) return Promise.reject(new Error('sin envoltura'));
    try {
      return Promise.resolve(invoke(cmd, args));
    } catch (e) {
      return Promise.reject(e);
    }
  };
  let language: string | null = null;
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  const bridge: DesktopBridge = {
    ...base,
    name: 'tauri',
    load: (k) => base.load(k),
    remove: (k) => base.remove(k),
    keys: (p) => base.keys(p),
    isFullscreen: () => base.isFullscreen(),
    toggleFullscreen: () => base.toggleFullscreen(),
    vibrate: (ms, s) => base.vibrate(ms, s),
    serverUrl: () => base.serverUrl(),
    saveFile: (n, d) => base.saveFile(n, d),
    restored: false,
    save(key, value) {
      base.save(key, value);
      // Steam Cloud: una copia, como mucho una vez cada `pushDelay` ms tras el último guardado
      if (!invoke || !key.startsWith(CLOUD_PREFIX) || key === SERVER_KEY) return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => {
        pushTimer = null;
        void bridge.cloudPush?.();
      }, pushDelay);
    },
    unlockAchievement(id, name) {
      base.unlockAchievement(id, name);
      call(STEAM.achievement, { id }).catch(() => undefined);
    },
    openExternal(url) {
      void bridge.openOverlay!(url).then((ok) => ok || base.openExternal(url));
    },
    openOverlay: (url) => call(STEAM.overlay, { url }).then((ok) => ok === true, () => false),
    steamLanguage: () => language,
    setPresence(key, value) {
      call(STEAM.presence, { key, value }).catch(() => undefined);
    },
    setTitle(title) {
      if (typeof document !== 'undefined') document.title = title;
      call(TAURI_SET_TITLE, { label: 'main', value: title }).catch(() => undefined);
    },
    cloudPush() {
      const data: Record<string, string> = {};
      for (const k of cloudKeys(base)) {
        const v = base.load(k);
        if (v !== null) data[k] = v;
      }
      return call(STEAM.cloudPush, { data: JSON.stringify(data) }).then((ok) => ok === true, () => false);
    },
    ready: Promise.resolve(),
  };
  bridge.ready = (async () => {
    language = await call(STEAM.language).then((v) => (typeof v === 'string' ? v : null), () => null);
    // equipo nuevo (sin la Orden guardada): si Steam Cloud tiene copia, se recupera
    if (base.load('derrumbe:meta') !== null) return;
    const raw = await call(STEAM.cloudPull).then((v) => (typeof v === 'string' ? v : null), () => null);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      const entries = Object.entries(data).filter(([k, v]) => k.startsWith(CLOUD_PREFIX) && k !== SERVER_KEY && typeof v === 'string') as [string, string][];
      for (const [k, v] of entries) base.save(k, v);
      bridge.restored = entries.length > 0;
    } catch {
      /* copia ilegible: se juega con lo de este equipo */
    }
  })();
  return bridge;
}

/**
 * Arranque en escritorio (main.ts, solo si existe `window.__TAURI__`): pone el puente, espera a Steam y
 * entonces (1) si se recuperó una copia de Steam Cloud, recarga para leerla; (2) si nadie eligió idioma,
 * usa el de Steam; (3) el título de la ventana sigue al idioma. `lang` son las funciones de i18n.
 */
export async function startDesktop(
  lang: { initLang(s: PlatformBridge): unknown; getLang(): 'es' | 'en'; setLang(l: 'es' | 'en'): void; onLangChange(fn: (l: 'es' | 'en') => void): unknown; titleFor(l: 'es' | 'en'): string; key: string },
  bridge: DesktopBridge = tauriPlatform(),
  reload: () => void = () => location.reload(),
): Promise<DesktopBridge> {
  setPlatform(bridge);
  lang.initLang(bridge);
  bridge.setTitle?.(lang.titleFor(lang.getLang()));
  lang.onLangChange((l) => bridge.setTitle?.(lang.titleFor(l)));
  await bridge.ready;
  if (bridge.restored) {
    reload();
    return bridge;
  }
  const fromSteam = steamLang(bridge.steamLanguage?.());
  if (fromSteam && bridge.load(lang.key) === null) lang.setLang(fromSteam);
  return bridge;
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

/** Dónde se habla del juego: avisos de errores, ideas y comentarios. Se puede cambiar al construir (VITE_COMMUNITY_URL). */
export const COMMUNITY_URL = ((import.meta.env.VITE_COMMUNITY_URL as string | undefined) ?? '').trim() || 'https://github.com/ifbotech/derrumbe/issues';

/** Lee un valor guardado como JSON; null si no existe o está corrupto. */
export function loadJson<T>(key: string): T | null {
  try {
    return JSON.parse(platform.load(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}
export const saveJson = (key: string, value: unknown) => platform.save(key, JSON.stringify(value));

// la prueba de humo (con ?qa) lee lo guardado a través del puente: allí el guardado es de quita y pon (qa.ts)
if (typeof location !== 'undefined' && typeof window !== 'undefined' && new URLSearchParams(location.search).has('qa')) Object.assign(window, { __qaPlatform: () => platform });
