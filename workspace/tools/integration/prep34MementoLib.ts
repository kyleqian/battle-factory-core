// prep34: shared Memento inputs (production-derivable reducer config) for prep34MementoCheck.ts / prep34MementoPixels.ts.
// Flags read here: --scanline=first-body|captured|swapped|zero (activation scanline state), --win0=zero (initial WIN0 after an
// earlier body) and --neg=top|bgx (negative controls).
import type { MementoBattlerConfig, MementoConfig } from "../../src/animation/memento.ts";
import picCoords from "../../src/data/gen/mon-pic-coords.json" with { type: "json" };
import speciesNames from "../../src/data/gen/species-names.json" with { type: "json" };

export type Row = Record<string, any>;
const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
export const scanlineMode = flag("scanline") ?? "first-body";
export const neg = flag("neg");
export const S0 = [...Array(80).fill(2), ...Array(80).fill(-2), ...Array(160).fill(0)];
export const Z = Array(320).fill(0);
/** src/engine/liveOamMoves.ts:822 FIRST_BODY_SCANLINE (battle-intro residue, the Dig / Rapid Spin / Extrasensory entry). */
export const FIRST_BODY = { srcBuffer: 1 as const, buffers: [S0, Z] as [number[], number[]] };
const speciesName = (id: number) => (speciesNames as unknown as { species: { name: string }[] }).species[id]!.name;
const coords = picCoords as unknown as Record<"front" | "back", Record<string, { height: number; yOffset: number }>>;
export const stable = (v: any): any => Array.isArray(v) ? v.map(stable) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v;
export const same = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

/** A: per-battler inputs from the battler sprite at activation + pic coords (no species table). */
export function battlerConfig(first: Row, which: "attacker" | "target"): MementoBattlerConfig & { species: string } {
  const battler = first.animationBattlers[which] as 0 | 1;
  const opponent = (battler & 1) !== 0;
  const sprite = first.battlerSprites[which];
  const species = speciesName(first.battlers[opponent ? "opponent" : "player"].species);
  const height = coords[opponent ? "front" : "back"][species]!.height;
  return {
    species, battlerId: battler, side: opponent ? "opponent" : "player", bg: opponent ? "BG1" : "BG2", bgPriorityRank: opponent ? 1 : 2,
    x: sprite.x,
    // GetBattlerSpriteCoordAttr(TOP) - 7 = Y_PIC_OFFSET - height / 2 - 7 (battle_anim_mons.c:2277-2278); Y_PIC_OFFSET =
    // GetBattlerSpriteFinal_Y(.., TRUE): the battler sprite y, + 8 (clamp 104) on the player side (= liveBattlerAnchors picOffsetPoint).
    shadowTop: (opponent ? sprite.y : Math.min(104, sprite.y + 8)) - (height >> 1) - 7 + (neg === "top" ? 1 : 0),
    // GetBattlerSpriteCoord(Y) + 31: the per-side battle-position y (player 80, opponent 40).
    shadowBottom: (opponent ? 40 : 80) + 31,
    // MoveBattlerSpriteToBG: gBattle_BGn = 32 - (x + x2), 32 - (y + y2) (x2 = the idle rest of a front sprite).
    bgX: 32 - (sprite.x + sprite.x2) + (neg === "bgx" ? 1 : 0), bgY: 32 - (sprite.y + sprite.y2),
    bgPaletteId: opponent ? 8 : 9,
  };
}

export function productionConfig(first: Row): MementoConfig {
  const { species: _a, ...attacker } = battlerConfig(first, "attacker");
  const { species: _t, ...target } = battlerConfig(first, "target");
  const scan = scanlineMode === "captured" ? { srcBuffer: first.scanline.srcBuffer, buffers: first.scanlineBuffers }
    : scanlineMode === "swapped" ? { srcBuffer: 1 as const, buffers: [Z, S0] }
      : scanlineMode === "zero" ? { srcBuffer: 1 as const, buffers: [Z, Z] }
          : FIRST_BODY;
  // K: win0 at activation (first body: 240 / 161 = the battle's idle WIN0, measured in every window).
  // --win0=zero: the WIN0 left by an earlier animation body of the same battle (0 / 0; prep22 first-body rule).
  const win0 = process.argv.includes("--win0=zero") ? { win0h: 0, win0v: 0 } : { win0h: 240, win0v: 161 };
  return { attacker, target, initialScanlineSourceBuffer: scan.srcBuffer, initialScanlineBuffers: scan.buffers, initialWindow: win0 };
}
