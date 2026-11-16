// prep16: the production palette composite for the BG-palette-snapshot moves (Overheat / Silver Wind / Psych Up), built ONLY from existing production assets:
//   hardware/unfaded/faded[bank*16..] for bank 2,3 = battle-bg palette[0] (== [1]), bank 4 = battle-bg palette[2], OBJ bank 16 = player battler (battle-back-sprites[species].palette),
//   OBJ bank 17 = opponent battler (battle-opponent-front-sprites[species].palette); every other bank 0 (the reducers only read the banks listed in prep16-palette-composite.json).
// The move's own asset palette is NOT part of the composite: the reducers load it themselves at their load age from `resources.*.palette` (BGR555 words from the asset, `assetWords`).
import { bundledMonPicTables } from "../../src/engine/monPicPixelsInstall.ts";

const { back: backSprites, front: frontSprites } = bundledMonPicTables();
import battleBg from "../../src/assets/gen/battle-bg.json" with { type: "json" };
type Rgb = { r: number; g: number; b: number };
export const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
export const assetWords = (p: readonly Rgb[]): number[] => p.map(bgr555);
export function composePalettes(playerSpecies: string, opponentSpecies: string): { unfaded: number[]; faded: number[]; hardware: number[] } {
  const back = (backSprites as unknown as Record<string, { palette: Rgb[] }>)[playerSpecies], front = (frontSprites as unknown as Record<string, { palette: Rgb[] }>)[opponentSpecies];
  if (!back || !front) throw new Error(`missing battler palette asset ${playerSpecies}/${opponentSpecies}`);
  const out = new Array<number>(512).fill(0);
  const put = (bank: number, p: readonly Rgb[]) => p.forEach((c, i) => { out[bank * 16 + i] = bgr555(c); });
  const bg = (battleBg as { palette: Rgb[][] }).palette;
  put(2, bg[0]!); put(3, bg[1]!); put(4, bg[2]!); put(16, back.palette); put(17, front.palette);
  return { unfaded: out.slice(), faded: out.slice(), hardware: out.slice() };
}
