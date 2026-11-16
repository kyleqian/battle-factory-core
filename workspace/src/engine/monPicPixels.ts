// Sprite pixel provider (bnd256c). The battle back / opponent front sprite sheets are ~12 MB of JSON; the headless graph (tick path, replayChallenge)
// never reads them, so this module holds no JSON import: a host that renders installs the tables once (monPicPixelsInstall.ts).
import type { BattleCommandMonPicTileset } from "./battleCommandFieldArt.ts";

export type MonPicPixelSheet = Readonly<{
  tileset: BattleCommandMonPicTileset;
  frame2?: BattleCommandMonPicTileset;
  palette?: readonly Readonly<{ r: number; g: number; b: number }>[];
}>;
export type MonPicPixelTables = Readonly<{
  back: Readonly<Record<string, MonPicPixelSheet>>;
  front: Readonly<Record<string, MonPicPixelSheet>>;
}>;

let installed: MonPicPixelTables | undefined;

export function installMonPicPixels(tables: MonPicPixelTables): void {
  installed = tables;
}

export function monPicPixelsInstalled(): boolean {
  return installed !== undefined;
}

function tables(): MonPicPixelTables {
  if (installed === undefined) throw new Error("mon pic pixels not installed");
  return installed;
}

export function backPixels(speciesSymbol: string): MonPicPixelSheet | undefined {
  return tables().back[speciesSymbol];
}

export function frontPixels(speciesSymbol: string): MonPicPixelSheet | undefined {
  return tables().front[speciesSymbol];
}

export type MonPicSide = "back" | "front";

/**
 * A frozen stand-in for one species' sheet whose enumerable getters read the provider on access, so a module-scope constant can name a
 * sheet without reading pixels before an install (bnd257d: the browser installs after a dynamic import). Spreads and property reads at
 * render time see the installed sheet; a read before the install throws "mon pic pixels not installed".
 */
export function lazyMonPicSheet<T extends MonPicPixelSheet>(side: MonPicSide, speciesSymbol: string): T {
  const sheet = () => tables()[side][speciesSymbol] as MonPicPixelSheet;
  return Object.freeze(
    Object.defineProperties(
      {},
      {
        tileset: { enumerable: true, get: () => sheet().tileset },
        frame2: { enumerable: true, get: () => sheet().frame2 },
        palette: { enumerable: true, get: () => sheet().palette },
      },
    ),
  ) as T;
}

/** The whole table as a live view (reads, `in`, key enumeration forward to the installed table; nothing is read before an install). */
export function lazyMonPicTable<T extends object>(side: MonPicSide): T {
  const target = () => tables()[side] as unknown as T;
  return new Proxy({} as T, {
    get: (_unused, key) => Reflect.get(target(), key),
    has: (_unused, key) => Reflect.has(target(), key),
    ownKeys: () => Reflect.ownKeys(target()),
    getOwnPropertyDescriptor: (_unused, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(target(), key);
      // A decode-on-read entry (dl2) is an accessor until first read; report the value so the view stays a plain data table.
      return descriptor === undefined ? undefined : { value: Reflect.get(target(), key), writable: true, enumerable: descriptor.enumerable, configurable: true };
    },
  });
}
