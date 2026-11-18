// Importing this module installs the battle sprite pixel tables into the provider (monPicPixels.ts). Imported by src/lib.ts, the vitest setup
// and the render tools; never by the headless graph (src/headless.ts), which is what keeps the sprite JSON out of dist-lib/chunks-headless.
import backSpriteRows from "../assets/gen/battle-back-sprite-rows.json" with { type: "json" };
import frontSpriteRows from "../assets/gen/battle-opponent-front-sprite-rows.json" with { type: "json" };
import { lazyUnpackMonPicTable } from "./monPicSheetCodec.ts";
import { installMonPicPixels, type MonPicPixelTables } from "./monPicPixels.ts";
import { installBundledAnimAssets } from "./animAssetsInstall.ts";

let tables: MonPicPixelTables | undefined;

/** The packed sheets (dl2) as lazily decoded tables: a species is decoded on its first read and cached; one pair per module instance. */
export function bundledMonPicTables(): MonPicPixelTables {
  tables ??= { back: lazyUnpackMonPicTable(backSpriteRows), front: lazyUnpackMonPicTable(frontSpriteRows) } as unknown as MonPicPixelTables;
  return tables;
}

/**
 * Installs the tables. Bundled hosts must CALL this: package.json declares `"sideEffects": false`, so a bundler drops a bare
 * `import "./monPicPixelsInstall.ts"` (the browser build shipped uninstalled once: play:random pageerror "mon pic pixels not installed").
 */
export function installBundledMonPicPixels(): void {
  installMonPicPixels(bundledMonPicTables());
  installBundledAnimAssets(); // dl4: the full animation asset table rides with the full sprite tables
}

// Unbundled importers (vitest setup, node tools) still install by importing the module.
installBundledMonPicPixels();
