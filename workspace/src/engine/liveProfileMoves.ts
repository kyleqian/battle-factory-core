/**
 * Shared "profile" builder for Spikes (191), Octazooka (190) and Lovely Kiss (142) (prep22 s0.3 P1, s B.2-B.5).
 * Every input is production-derivable: the lowest-free sprite slots over the known-entry in-use set, the sprite
 * subpriority from the target battler's side, the attr2 words from the first / second loaded sheet's measured
 * allocation (bank 7 tile 305 / 537, bank 8 tile 305), and the palette snapshots = the assets-only composite
 * (composeLivePalettes) with the move's own asset palette written into the measured OBJ bank. No capture row is read.
 * Lovely Kiss alone consumes Random2 (4 words at age +120); its activation value comes from the presentation host.
 */
import type { LovelyKissProfile } from "../animation/lovelyKiss.ts";
import type { OctazookaProfile } from "../animation/octazooka.ts";
import type { SpikesProfile } from "../animation/spikes.ts";
import lovelyKissAsset from "../animation/assets/lovely-kiss.json" with { type: "json" };
import octazookaAsset from "../animation/assets/octazooka.json" with { type: "json" };
import spikesAsset from "../animation/assets/spikes.json" with { type: "json" };
import type { LivePaletteComposite } from "./liveMovePaletteComposite.ts";

type Rgb = Readonly<{ r: number; g: number; b: number }>;
const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
const OBJ_BANK_BASE = 16;

/** Composite array with one OBJ bank replaced by an asset palette (OBJ bank n = palette bank 16 + n). */
function withObjBank(base: readonly number[], bank: number, palette: readonly Rgb[]): number[] {
  const out = base.slice();
  palette.forEach((c, i) => { out[(OBJ_BANK_BASE + bank) * 16 + i] = bgr555(c); });
  return out;
}

export type LiveProfileSlots = Readonly<{ free: readonly number[]; targetSide: "player" | "opponent" }>;
const targetBattlerSubpriority = (side: "player" | "opponent") => side === "player" ? 30 : 40;
const attr2 = (bank: number, tile: number) => (bank << 12) | (2 << 10) | tile;

/** `Move_SPIKES`: three spikes in the lowest free slots, the target's palette copy (monbg) leaves the OBJ banks unchanged. */
export function liveSpikesProfile(input: LiveProfileSlots & { palettes: LivePaletteComposite; activationRng: number }): SpikesProfile {
  const { free, targetSide, palettes } = input;
  const after = (base: readonly number[]) => withObjBank(base, 7, spikesAsset.spike.palette as Rgb[]);
  return {
    animationRngAtAge0: input.activationRng,
    spriteSlots: [free[0]!, free[1]!, free[2]!],
    targetSubpriority: targetBattlerSubpriority(targetSide) - 2,
    oam: { spikeAttr2: attr2(7, 305) },
    palette: {
      unfadedAtAge0: palettes.unfaded, fadedAtAge0: palettes.faded, hardwareAtAge0: palettes.hardware,
      unfadedAfterLoad: after(palettes.unfaded), fadedAfterLoad: after(palettes.faded),
      unfadedAfterMonbg: after(palettes.unfaded), fadedAfterMonbg: after(palettes.faded),
    },
  };
}

/** `Move_OCTAZOOKA`: ball in the lowest free slot, then four smokes (graySmoke sheet bank 7, blackBall sheet bank 8). */
export function liveOctazookaProfile(input: LiveProfileSlots & { palettes: LivePaletteComposite; activationRng: number }): OctazookaProfile {
  const { free, targetSide, palettes } = input;
  const smoke = (base: readonly number[]) => withObjBank(base, 7, octazookaAsset.graySmoke.palette as Rgb[]);
  const ball = (base: readonly number[]) => withObjBank(smoke(base), 8, octazookaAsset.blackBall.palette as Rgb[]);
  return {
    animationRngAtAge0: input.activationRng,
    ballSpriteSlot: free[0]!,
    smokeSpriteSlots: [free[0]!, free[1]!, free[2]!, free[3]!],
    targetSubpriority: targetBattlerSubpriority(targetSide) - 2,
    oam: { ballAttr2: attr2(8, 305), smokeAttr2: attr2(7, 537) },
    palette: {
      unfadedAtAge0: palettes.unfaded, fadedAtAge0: palettes.faded, hardwareAtAge0: palettes.hardware,
      unfadedAfterGraySmokeLoad: smoke(palettes.unfaded), fadedAfterGraySmokeLoad: smoke(palettes.faded),
      unfadedAfterBlackBallLoad: ball(palettes.unfaded), fadedAfterBlackBallLoad: ball(palettes.faded),
    },
  };
}

/**
 * `Move_LOVELY_KISS`: devil in the lowest free slot, then four hearts (pinkHeart sheet bank 7, devil sheet bank 8). The
 * reducer replays the host's four `% 180` draws from the host's activation value (plan `{ageOffset 120, count 4}`).
 */
export function liveLovelyKissProfile(input: LiveProfileSlots & { palettes: LivePaletteComposite; activationRng: number }): LovelyKissProfile {
  const { free, targetSide, palettes } = input;
  const heart = (base: readonly number[]) => withObjBank(base, 7, lovelyKissAsset.pinkHeart.palette as Rgb[]);
  const devil = (base: readonly number[]) => withObjBank(heart(base), 8, lovelyKissAsset.devil.palette as Rgb[]);
  return {
    animationRngAtAge0: input.activationRng,
    devilSpriteSlot: free[0]!,
    heartSpriteSlots: [free[0]!, free[1]!, free[2]!, free[3]!],
    targetSubpriority: targetBattlerSubpriority(targetSide),
    palette: {
      unfadedAtAge0: palettes.unfaded, fadedAtAge0: palettes.faded, hardwareAtAge0: palettes.hardware,
      unfadedAfterPinkHeartLoad: heart(palettes.unfaded), fadedAfterPinkHeartLoad: heart(palettes.faded),
      unfadedAfterDevilLoad: devil(palettes.unfaded), fadedAfterDevilLoad: devil(palettes.faded),
    },
  };
}
