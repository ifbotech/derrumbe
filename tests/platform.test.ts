// V10 · el puente de escritorio (src/client/platform.ts) con un `invoke` falso: los comandos de Steam que
// pide, el idioma de Steam, que un comando que falla hace lo de la web y que sin `__TAURI__` el puente es
// el de la web. Ningún SDK: la envoltura real (tauri/) registra esos comandos en Rust.
import { afterEach, describe, expect, it } from 'vitest';
import { STEAM, TAURI_SET_TITLE, platform, startDesktop, steamLang, tauriInvoke, tauriPlatform, type Invoke, type PlatformBridge } from '../src/client/platform';
import { brandFor } from '../src/shared/brand';

/** Una plataforma «web» en memoria que apunta lo que se le pide. */
function fakeWeb() {
  const mem = new Map<string, string>();
  const log: string[] = [];
  const p: PlatformBridge = {
    name: 'web',
    load: (k) => mem.get(k) ?? null,
    save: (k, v) => void mem.set(k, v),
    remove: (k) => void mem.delete(k),
    unlockAchievement: (id) => void log.push(`web:logro:${id}`),
    isFullscreen: () => false,
    toggleFullscreen: async () => void log.push('web:pantalla'),
    vibrate: () => undefined,
    serverUrl: () => null,
    keys: (prefix) => [...mem.keys()].filter((k) => k.startsWith(prefix)),
    saveFile: () => undefined,
    openExternal: (url) => void log.push(`web:abrir:${url}`),
  };
  return { p, mem, log };
}

/** Un `invoke` falso: responde lo que diga `answers` y apunta cada llamada; lo que no está, falla. */
function fakeInvoke(answers: Record<string, unknown | ((args?: Record<string, unknown>) => unknown)>) {
  const calls: { cmd: string; args?: Record<string, unknown> }[] = [];
  const invoke: Invoke = async (cmd, args) => {
    calls.push({ cmd, args });
    if (!(cmd in answers)) throw new Error(`comando desconocido: ${cmd}`);
    const a = answers[cmd];
    if (a instanceof Error) throw a;
    return typeof a === 'function' ? (a as (x?: Record<string, unknown>) => unknown)(args) : a;
  };
  return { invoke, calls };
}

/** El puente con el que arranca el juego, antes de que ninguna prueba llame a setPlatform. */
const inicial = platform.name;
const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  delete (globalThis as { __TAURI__?: unknown }).__TAURI__;
});

describe('puente de escritorio (Tauri + Steamworks)', () => {
  it('un logro llama al comando de Steam con su id (y la web se entera igual)', async () => {
    const web = fakeWeb();
    const f = fakeInvoke({ [STEAM.achievement]: null, [STEAM.language]: 'english' });
    const p = tauriPlatform(f.invoke, web.p);
    p.unlockAchievement('primera_sangre', 'Primera sangre');
    await tick();
    expect(f.calls.some((c) => c.cmd === 'steam_unlock_achievement' && c.args?.id === 'primera_sangre')).toBe(true);
    expect(web.log).toContain('web:logro:primera_sangre');
    expect(p.name).toBe('tauri');
  });

  it('el idioma de Steam: spanish y latam → es; cualquier otro → en; nada → null', () => {
    expect(steamLang('spanish')).toBe('es');
    expect(steamLang('latam')).toBe('es');
    expect(steamLang('LATAM')).toBe('es');
    for (const l of ['english', 'french', 'german', 'brazilian', 'schinese', 'japanese']) expect(steamLang(l)).toBe('en');
    expect(steamLang(null)).toBeNull();
    expect(steamLang('')).toBeNull();
  });

  it('steamLanguage() devuelve lo que dice Steam en cuanto contesta', async () => {
    const p = tauriPlatform(fakeInvoke({ [STEAM.language]: 'latam' }).invoke, fakeWeb().p);
    await p.ready;
    expect(p.steamLanguage!()).toBe('latam');
  });

  it('un comando que falla (o que la envoltura no registra) hace lo de la web', async () => {
    const web = fakeWeb();
    const f = fakeInvoke({ [STEAM.overlay]: new Error('sin capa') });
    const p = tauriPlatform(f.invoke, web.p);
    await p.ready; // steam_language no existe: el idioma de Steam queda en null
    expect(p.steamLanguage!()).toBeNull();
    p.openExternal('https://example.org/');
    await tick();
    await tick();
    expect(web.log).toContain('web:abrir:https://example.org/');
    p.unlockAchievement('x', 'X'); // steam_unlock_achievement no existe: no revienta
    p.setPresence!('steam_display', '#Mesa');
    await tick();
    expect(web.log).toContain('web:logro:x');
    // la capa de Steam que sí abre: la web no abre nada
    const web2 = fakeWeb();
    const p2 = tauriPlatform(fakeInvoke({ [STEAM.overlay]: true }).invoke, web2.p);
    p2.openExternal('https://example.org/');
    await tick();
    await tick();
    expect(web2.log).not.toContain('web:abrir:https://example.org/');
  });

  it('el título de la ventana sigue al idioma (brandFor) y el idioma de Steam decide el primer arranque', async () => {
    const web = fakeWeb();
    const f = fakeInvoke({ [STEAM.language]: 'english', [TAURI_SET_TITLE]: null });
    const p = tauriPlatform(f.invoke, web.p);
    let lang: 'es' | 'en' = 'es';
    const oyentes: ((l: 'es' | 'en') => void)[] = [];
    await startDesktop(
      {
        initLang: () => lang,
        getLang: () => lang,
        setLang: (l) => {
          lang = l;
          web.p.save('derrumbe:idioma', l);
          oyentes.forEach((fn) => fn(l));
        },
        onLangChange: (fn) => oyentes.push(fn),
        titleFor: (l) => brandFor(l).fullTitle,
        key: 'derrumbe:idioma',
      },
      p,
      () => undefined,
    );
    expect(lang).toBe('en');
    const titles = f.calls.filter((c) => c.cmd === TAURI_SET_TITLE).map((c) => c.args?.value);
    expect(titles).toEqual([brandFor('es').fullTitle, brandFor('en').fullTitle]);
    expect(platform).toBe(p);
  });

  it('si el jugador ya eligió idioma, el de Steam no lo pisa', async () => {
    const web = fakeWeb();
    web.mem.set('derrumbe:idioma', 'es');
    const p = tauriPlatform(fakeInvoke({ [STEAM.language]: 'english' }).invoke, web.p);
    let lang: 'es' | 'en' = 'es';
    await startDesktop({ initLang: () => lang, getLang: () => lang, setLang: (l) => (lang = l), onLangChange: () => undefined, titleFor: (l) => brandFor(l).title, key: 'derrumbe:idioma' }, p, () => undefined);
    expect(lang).toBe('es');
  });

  it('Steam Cloud: guardar sube una copia (sin la dirección del servidor) y un equipo nuevo la recupera', async () => {
    const web = fakeWeb();
    let pushed = '';
    const f = fakeInvoke({ [STEAM.cloudPush]: (a?: Record<string, unknown>) => ((pushed = String(a?.data)), true), [STEAM.cloudPull]: null });
    const p = tauriPlatform(f.invoke, web.p, 5);
    await p.ready;
    p.save('derrumbe:meta', '{"renown":7}');
    p.save('derrumbe:server', 'wss://x');
    await new Promise((r) => setTimeout(r, 30));
    expect(JSON.parse(pushed)).toEqual({ 'derrumbe:meta': '{"renown":7}' });
    // equipo nuevo: la Orden llega de la nube y se pide recargar
    const fresh = fakeWeb();
    const f2 = fakeInvoke({ [STEAM.cloudPull]: pushed });
    const p2 = tauriPlatform(f2.invoke, fresh.p);
    let reloads = 0;
    await startDesktop({ initLang: () => 'es', getLang: () => 'es', setLang: () => undefined, onLangChange: () => undefined, titleFor: (l) => brandFor(l).title, key: 'derrumbe:idioma' }, p2, () => reloads++);
    expect(fresh.mem.get('derrumbe:meta')).toBe('{"renown":7}');
    expect(p2.restored).toBe(true);
    expect(reloads).toBe(1);
    // y si este equipo ya tiene la Orden, la nube no la pisa
    const old = fakeWeb();
    old.mem.set('derrumbe:meta', '{"renown":99}');
    const p3 = tauriPlatform(fakeInvoke({ [STEAM.cloudPull]: pushed }).invoke, old.p);
    await p3.ready;
    expect(old.mem.get('derrumbe:meta')).toBe('{"renown":99}');
    expect(p3.restored).toBe(false);
  });

  it('sin window.__TAURI__ no hay envoltura: el puente es el de la web', () => {
    expect(tauriInvoke()).toBeNull();
    expect(inicial).toBe('web');
    (globalThis as { __TAURI__?: unknown }).__TAURI__ = { core: { invoke: async () => null } };
    expect(typeof tauriInvoke()).toBe('function');
  });

  it('main.ts solo arranca el escritorio si existe window.__TAURI__', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../src/client/main.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/if \(tauriInvoke\(\)\) void startDesktop\(/);
    // y platform.ts no carga ningún SDK ni dependencia de Tauri
    const plat = readFileSync(new URL('../src/client/platform.ts', import.meta.url), 'utf8');
    expect(plat).not.toMatch(/from ['"]@tauri-apps|require\(/);
  });
});
