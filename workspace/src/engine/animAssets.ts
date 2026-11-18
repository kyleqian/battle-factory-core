// dl4: the move-animation asset provider (docs/dl3-per-species-pictures.md, section dl4). The 163 `src/animation/assets/*.json` files are
// ~6 MB of art that only `render()` reads, so the renderer names them through `lazyAnimAsset` and a host installs a source: the full table
// (animAssetsFull.ts: node tools, vitest, the dev shell) or the per-asset file store (animAssetStore.ts: the browser library). An asset the
// headless tick path reads (a duration case) stays a plain JSON import. No JSON import here and no side effect: the headless graph never
// needs this module.

/** Thrown by a read of an asset whose file has not arrived. The lib loop catches it (or sees `takeMissedAnimAssets`) and holds. */
export class AnimAssetPending extends Error {
  override readonly name = "AnimAssetPending";
  readonly asset: string;
  constructor(asset: string) {
    super(`animation asset ${asset} has not loaded`);
    this.asset = asset;
  }
}

export interface AnimAssetSource {
  /** The parsed asset; throws AnimAssetPending when it has not arrived. */
  get(name: string): object;
}

let installed: AnimAssetSource | undefined;

export function installAnimAssets(source: AnimAssetSource): void {
  installed = source;
}

export function animAssetsInstalled(): boolean {
  return installed !== undefined;
}

/** The installed source (the lib tells a per-asset store from the full table by identity). */
export function installedAnimAssets(): AnimAssetSource | undefined {
  return installed;
}

function source(): AnimAssetSource {
  if (installed === undefined) throw new Error("animation assets not installed");
  return installed;
}

/**
 * A live view of one asset: reads, `in` and key enumeration forward to the installed source on every access, so a module-scope constant can
 * name an asset without reading it before the host installed a source. A read of an asset that has not arrived throws AnimAssetPending.
 */
export function lazyAnimAsset<T extends object>(name: string): T {
  const target = (): T => source().get(name) as T;
  return new Proxy({} as T, {
    get: (_unused, key) => Reflect.get(target(), key),
    has: (_unused, key) => Reflect.has(target(), key),
    ownKeys: () => Reflect.ownKeys(target()),
    getOwnPropertyDescriptor: (_unused, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(target(), key);
      return descriptor === undefined ? undefined : { value: Reflect.get(target(), key), writable: true, enumerable: descriptor.enumerable, configurable: true };
    },
  });
}

/** A live view of a part of an asset (`(asset as T).art`), for a module-scope constant derived from one. `read` runs on every access. */
export function lazyAnimAssetPart<T extends object>(read: () => T): T {
  return new Proxy({} as T, {
    get: (_unused, key) => Reflect.get(read(), key),
    has: (_unused, key) => Reflect.has(read(), key),
    ownKeys: () => Reflect.ownKeys(read()),
    getOwnPropertyDescriptor: (_unused, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(read(), key);
      return descriptor === undefined ? undefined : { value: Reflect.get(read(), key), writable: true, enumerable: descriptor.enumerable, configurable: true };
    },
  });
}
