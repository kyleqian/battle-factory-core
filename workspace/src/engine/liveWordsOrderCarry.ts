/**
 * Words-dependent sprite-order units (S10A prep46; docs/next-adapters-prep46.md): the free order after Sand-Attack 28, Mud-Slap 189,
 * Rain Dance 240 and the RAIN_CONTINUES general animation (General_Rain) depends on the unit's own Random2 words. The order host stays
 * word-free (a deferred-lend marker, liveSpriteOrderHost.ts); the render seam resolves the lend by carrying the activation order through
 * the unit with the unit's recorded presentation words (resolveSpriteOrderDeferredLend). Every rule below was checked per frame against
 * the ROM with RAM-read words (prep46 s1: Sand 464/464, Mud 306/306, Rain Dance 744/744, General_Rain 960/960 frames).
 *
 * The dirt profile (slots, Q8.8 steps, the slide-helper seed order) is built here once for the live adapter (liveMoveAnimation.ts case
 * 189 / 28) and the carry; the dirt-phase order is the reducers' own SortSprites loop (sandAttackDirtSpriteOrderAtAge /
 * mudSlapMudSpriteOrderAtAge), the drops' keys are rainDropSortKeys.
 */
import { mudSlapMudSpriteOrderAtAge, MUD_SLAP_MUD_FIRST_DISPLAY_AGE, type MudSlapAnimationProfile } from "../animation/mudSlap.ts";
import { generalRainDropsAtAge, GENERAL_RAIN_LAST_DROP_AGE, GENERAL_RAIN_SPAWN_AGES, rainDanceAtAge, rainDropSortKeys, RAIN_DANCE_WINDOW_ROWS } from "../animation/rainDance.ts";
import { sandAttackDirtSpriteOrderAtAge, SAND_ATTACK_DIRT_FIRST_DISPLAY_AGE, type SandAttackAnimationProfile } from "../animation/sandAttack.ts";
import { sortGbaSpriteOrder } from "../animation/gbaObjCompositor.ts";
import { carryLiveSpriteOrder, type LiveOamSprite } from "./liveMoveOamAssembler.ts";
import { dirtScatterOffsetFromWord, dirtScatterSlots, linearTranslationStep } from "./liveMovePresentationRng.ts";
import type { PresentationRngWords } from "./presentationRngHost.ts";
import { WORDS_ORDER_GENERAL_ANIMATION } from "./wordsOrderUnits.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderWithOccupiedPrefix } from "./spriteOrderProvider.ts";
import type { SpriteOrderDeferredLend } from "./spriteOrderEventTransform.ts";

type Point = Readonly<{ x: number; y: number }>;
type Side = "player" | "opponent";

/** The known-entry in-use slots the dirt / drop allocators skip (liveMoveAnimation.ts KNOWN_ENTRY_IN_USE_SPRITE_SLOTS). */
const ENTRY_IN_USE: readonly number[] = Object.freeze([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const UNCONSUMED_PALETTE: readonly number[] = Object.freeze(new Array<number>(512).fill(0));

const DIRT_TRANSIENTS: Readonly<Record<"mud" | "sand", readonly (readonly [number, number])[]>> = Object.freeze({
  mud: Object.freeze([Object.freeze([4, 8] as const), Object.freeze([9, 11] as const)]),
  sand: Object.freeze([Object.freeze([7, 11] as const), Object.freeze([12, 14] as const)]),
});
/** Live body rows (liveMoveAnimationDuration) and the reducers' animationAgeOffset (the live adapter's config). */
const DIRT_ROWS = Object.freeze({ mud: 51, sand: 58 });
export const DIRT_ANIMATION_AGE_OFFSET = Object.freeze({ mud: 42, sand: 43 });

/**
 * Sand-Attack / Mud-Slap profile from the body's six 10-word rows: 30 dirt sprites (slot, Q8.8 steps) and the reducer's seed order.
 * Source = the attacker's pic point + (+-15, +15), destination = the target's pic point + the AnimDirtScatter offsets, steps =
 * InitAnimLinearTranslation over 20 frames, slots = lowest-free over the computed lifetimes (two transient slot-3 helpers).
 * The seed is the lent activation order (known-entry prefix) carried through the frames before the first dirt sort, where the two
 * invisible slide helpers (`createsprite gSlideMonToOffsetSpriteTemplate, ANIM_ATTACKER, 2`: slot 3, priority 3, subpriority = the
 * attacker battler's 30 / 40 - 2, oam.y 160) move slot 3 ahead of the free slots (prep46 s1; replaces Mud's "4 then 3 -> swap" rule,
 * which declined on second Mud-Slap bodies).
 */
export function liveDirtScatterProfile(
  moveId: 28 | 189, attackerSide: Side, activationOrder: readonly number[], draws: readonly (readonly number[])[],
  attackerPic: Point, targetPic: Point,
): Readonly<{ dirt: SandAttackAnimationProfile["dirt"]; spriteOrderSeed: readonly number[] }> | null {
  if (draws.length !== 6 || draws.some((row) => row.length !== 10)) return null;
  const mud = moveId === 189, kind = mud ? "mud" as const : "sand" as const;
  const playerAttacker = attackerSide === "player";
  const source = { x: attackerPic.x + (playerAttacker ? 15 : -15), y: attackerPic.y + 15 };
  const words = draws.flat();
  const transients = DIRT_TRANSIENTS[kind];
  const slots = dirtScatterSlots(transients, mud ? 9 : 12, ENTRY_IN_USE);
  const dirt = slots.map((slot, i) => ({ slot,
    xStep: linearTranslationStep(targetPic.x + dirtScatterOffsetFromWord(words[2 * i]!) - source.x, 20),
    yStep: linearTranslationStep(targetPic.y + dirtScatterOffsetFromWord(words[2 * i + 1]!) - source.y, 20) }));
  const first = mud ? MUD_SLAP_MUD_FIRST_DISPLAY_AGE : SAND_ATTACK_DIRT_FIRST_DISPLAY_AGE;
  const helperSubpriority = (playerAttacker ? 30 : 40) - 2;
  let order: readonly number[] = activationOrder;
  // reducer age = live age + animationAgeOffset + 1 (the source latch, mudSlapSourceMudAtAge); the helpers are carried before the first sort
  for (let age = 0; age + DIRT_ANIMATION_AGE_OFFSET[kind] + 1 < first; age += 1) {
    const helpers: LiveOamSprite[] = transients.filter(([from, to]) => age >= from && age < to)
      .map(() => ({ slot: 3, attr: [0x00a0, 0, 3 << 10] as never, subpriority: helperSubpriority, visible: false, oamY: 160 }) as LiveOamSprite);
    order = carryLiveSpriteOrder(order, helpers, sortGbaSpriteOrder);
  }
  return Object.freeze({ dirt: Object.freeze(dirt), spriteOrderSeed: Object.freeze([...order]) });
}

const prefixed = (free: readonly number[]) =>
  spriteOrderWithOccupiedPrefix({ known: true as const, free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
const freeOf = (order: readonly number[]) => Object.freeze(order.filter((slot) => !KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER.includes(slot)));

/** Free order after a Rain Dance / General_Rain drop program (SortSprites per frame over the drops' keys). */
function carryDrops(order: readonly number[], rows: number, dropsAt: (age: number) => Parameters<typeof rainDropSortKeys>[0]): readonly number[] {
  let carried = order;
  for (let age = 0; age < rows; age += 1) {
    carried = carryLiveSpriteOrder(carried, rainDropSortKeys(dropsAt(age)).map((key) => ({ ...key, visible: true }) as unknown as LiveOamSprite),
      sortGbaSpriteOrder);
  }
  return carried;
}

/**
 * Post-unit free order of a words-dependent order unit from its activation free order (entry labels) and the unit's recorded
 * presentation words (render-pure); null when the unit is not a words unit or its words / order are unavailable. Anchors are the
 * displayed battlers' Y_PIC_OFFSET points (liveBattlerAnchors; only the dirt units read them).
 */
export function liveWordsUnitPostFree(
  unit: Pick<SpriteOrderDeferredLend, "moveId" | "attackerSide" | "generalAnimation">, activationFree: readonly number[],
  words: PresentationRngWords | null, anchors: Readonly<Record<Side, Point>>,
): readonly number[] | null {
  const start = prefixed(activationFree);
  if (start === null || words === null) return null;
  if (unit.generalAnimation === WORDS_ORDER_GENERAL_ANIMATION) {
    if (words.draws.length !== GENERAL_RAIN_SPAWN_AGES.length) return null;
    return freeOf(carryDrops(start, GENERAL_RAIN_LAST_DROP_AGE + 1, (age) => generalRainDropsAtAge(age, words.draws, ENTRY_IN_USE)));
  }
  if (unit.generalAnimation !== undefined) return null;
  if (unit.moveId === 240) {
    const profile = { animationRngAtAge0: words.activationValue, occupiedSpriteSlots: ENTRY_IN_USE, unfadedPaletteBeforeLoad: UNCONSUMED_PALETTE,
      fadedPaletteBeforeLoad: UNCONSUMED_PALETTE, hardwarePaletteAtAge0: UNCONSUMED_PALETTE, unfadedPaletteAfterLoad: UNCONSUMED_PALETTE,
      fadedPaletteAfterLoad: UNCONSUMED_PALETTE };
    return freeOf(carryDrops(start, RAIN_DANCE_WINDOW_ROWS, (age) => rainDanceAtAge(age, profile).drops));
  }
  if (unit.moveId !== 28 && unit.moveId !== 189) return null;
  const foe: Side = unit.attackerSide === "player" ? "opponent" : "player";
  const profile = liveDirtScatterProfile(unit.moveId, unit.attackerSide, start, words.draws, anchors[unit.attackerSide], anchors[foe]);
  if (profile === null) return null;
  const mud = unit.moveId === 189, kind = mud ? "mud" as const : "sand" as const;
  const lastReducerAge = DIRT_ROWS[kind] - 1 + DIRT_ANIMATION_AGE_OFFSET[kind] + 1;
  const order = mud
    ? mudSlapMudSpriteOrderAtAge(lastReducerAge, anchors[unit.attackerSide], unit.attackerSide, { mud: profile.dirt, spriteOrderSeed: profile.spriteOrderSeed } as MudSlapAnimationProfile)
    : sandAttackDirtSpriteOrderAtAge(lastReducerAge, anchors[unit.attackerSide], unit.attackerSide, profile);
  return freeOf(order);
}
