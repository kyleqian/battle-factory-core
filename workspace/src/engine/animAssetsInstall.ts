// dl4: importing this module's `installBundledAnimAssets` puts the full animation asset table behind the provider (animAssets.ts).
// Imported by monPicPixelsInstall.ts (so every host that installs the full sprite tables gets the full animation assets too: the vitest
// setup, the render tools, the dev shell's bench ABI) and never by the headless graph or the library's per-file path.
import { FULL_ANIM_ASSETS } from "./animAssetsFull.ts";
import { AnimAssetPending, installAnimAssets, type AnimAssetSource } from "./animAssets.ts";

export const bundledAnimAssetSource: AnimAssetSource = {
  get(name) {
    const asset = FULL_ANIM_ASSETS[name];
    if (asset === undefined) throw new AnimAssetPending(name);
    return asset;
  },
};

export function installBundledAnimAssets(): void {
  installAnimAssets(bundledAnimAssetSource);
}
