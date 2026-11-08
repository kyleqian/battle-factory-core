// Sprite pixel provider (bnd256c). The battle back / opponent front sprite sheets are ~12 MB of JSON; the headless graph (tick path, replayChallenge)
// never reads them, so this module holds no JSON import: a host that renders installs the tables once (monPicPixelsInstall.ts).
import type { BattleCommandMonPicTileset } from "./battleCommandFieldArt.ts";

export type MonPicPixelSheet = Readonly<{ tileset: BattleCommandMonPicTileset; frame2?: BattleCommandMonPicTileset }>;
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
