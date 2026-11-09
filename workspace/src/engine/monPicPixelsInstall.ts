// Importing this module installs the battle sprite pixel tables into the provider (monPicPixels.ts). Imported by src/lib.ts, the vitest setup
// and the render tools; never by the headless graph (src/headless.ts), which is what keeps the sprite JSON out of dist-lib/chunks-headless.
import backSpritesData from "../assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSpritesData from "../assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import { installMonPicPixels, type MonPicPixelTables } from "./monPicPixels.ts";

/**
 * Installs the tables. Bundled hosts must CALL this: package.json declares `"sideEffects": false`, so a bundler drops a bare
 * `import "./monPicPixelsInstall.ts"` (the browser build shipped uninstalled once: play:random pageerror "mon pic pixels not installed").
 */
export function installBundledMonPicPixels(): void {
  installMonPicPixels({ back: backSpritesData, front: frontSpritesData } as unknown as MonPicPixelTables);
}

// Unbundled importers (vitest setup, node tools) still install by importing the module.
installBundledMonPicPixels();
