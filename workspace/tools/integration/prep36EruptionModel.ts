/**
 * prep36: source-derived MOVE_ERUPTION (284) profile builder (docs/next-adapters-prep36.md). Builds the complete
 * EruptionAnimationProfile the accepted reducer (src/animation/eruption.ts) and its renderer branch (battleScene.ts ERUPTION)
 * read, from production facts only: attacker side, the two displayed species (art view / liveBattlerAnchors), the known-entry
 * scene (KNOWN_ENTRY_NON_BATTLER_SPRITES, battlerSprite), the production palette composite, the warm-rock asset palette and
 * two host lends (the activation sSpriteOrder and the presentation RNG value, both pass-through). No capture row is read.
 *
 * Schedule (Move_ERUPTION, data/battle_anim_scripts.s:3805-3828; script engine battle_anim.c):
 *   - wave-1 task end E1 comes from the UNCHANGED launch reducer (eruptionLaunchTimeline) given the attacker sprite y;
 *   - wave 2 starts at E1 + 2 (waitforvisualfinish + createvisualtask cadence) and the reducer gives its end E2;
 *   - falling rocks at E2 + 34 (waitforvisualfinish, delay 30), HorizontalShake tasks after the creation row + 23 (delay 22),
 *     loopsewithpan + 24, closing simple_palette_blend + 106 (delay 80 after the loop), first inactive row = E2 + 294.
 */
import warmRock from "../../src/animation/assets/eruption-warm-rock.json" with { type: "json" };
import { type EruptionAnimationProfile, type EruptionSpriteOrderKey, eruptionTimeline } from "../../src/animation/eruption.ts";
import { ERUPTION_FALLING_ROCK_SOURCE_CALLS } from "../../src/animation/eruptionFallingRock.ts";
import { type EruptionLaunchProfile, eruptionLaunchTimeline } from "../../src/animation/eruptionLaunch.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { KNOWN_ENTRY_NON_BATTLER_SPRITES, battlerSprite } from "../../src/engine/liveBgSnapshotMoves.ts";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { composeLivePalettes } from "../../src/engine/liveMovePaletteComposite.ts";
import { speciesName } from "./prep30Species.ts";

type Side = "player" | "opponent";
type Json = Record<string, any>;

/** Known-entry (K) and source (S) constants, each equal in all four measured windows (prep36 s0.4). */
export const ER36 = Object.freeze({
  /** S: ANIM_TAG_WARM_ROCK. */ tag: 10201,
  /** K: first-fit tile range of the 84-tile warm-rock sheet over the known-entry tile allocator. */ tileRange: [537, 84] as [number, number],
  /** K: lowest free palette tag slot at entry. */ paletteSlot: 7,
  /** K: known-entry sSpritePaletteTags (slots 4..6 = battle interface tags). */
  paletteTags: [65535, 65535, 65535, 65535, 54322, 55039, 55044, 65535, 65535, 65535, 65535, 65535, 65535, 65535, 65535, 65535],
  /** K: known-entry occupied OBJ slots (healthboxes 0 / 1 / 61 / 63, shadow 2, battlers 6 / 8, healthbar 60 / 62). */
  occupied: [0, 1, 2, 6, 8, 60, 61, 62, 63],
  /** K: healthBoxesData[battler].matrixNum read by PrepareBattlerSpriteForRotScale (battle_anim_mons.c). */
  matrixNum: { player: 1, opponent: 2 } as Record<Side, number>,
  /** K: GetBattlerSpriteSubpriority in a single battle. */ battlerSub: { player: 30, opponent: 40 } as Record<Side, number>,
  /** S: task slots: no task is live at entry, so createvisualtask / the sound tasks take the lowest free slots. */
  launchTask: 0, companionTask: 1, platformTask: 0, battlerTask: 1, audioTask: 2,
  /** S: script cadence (rows). */ wave1Start: 19, companionWait: 59, wave2Gap: 2, fallingAfterE2: 34, shakeAfterFalling: 23,
  audioAfterFalling: 24, closingAfterFalling: 106, endAfterE2: 294,
});

export interface Eruption36Facts {
  readonly attackerSide: Side;
  /** Displayed species ids (the field art view's). */
  readonly playerSpecies: number;
  readonly opponentSpecies: number;
  /** L: the lent activation 64-slot sSpriteOrder. */
  readonly activationOrder: readonly number[];
  /** L: presentation RNG value at activation (pass-through; Eruption draws no Random2, prep29 s0.2). */
  readonly animationRng: number;
  /** L: gameplay RNG (pass-through invariant). */
  readonly gameplayRng: number;
  readonly immutableGameplayState?: unknown;
  /** H: warm-rock tile slot 6 before the load (previous body's residue; not drawn). Default [0, 0]. */
  readonly tileRangeBeforeLoad?: readonly [number, number];
}

export interface Eruption36Neg {
  /** wave-2 start E1 + 1 instead of + 2. */ wave2?: boolean;
  /** battlerYDelta + 1. */ ydelta?: boolean;
  /** attacker sprite y + 1 (launch geometry only). */ anchor?: boolean;
  /** identity activation order instead of the lend. */ order?: boolean;
  /** composite BG bank 2 word 1 ^ 0x0421. */ palette?: boolean;
  /** opening palette subpriority = attacker sub instead of sub - 2. */ sub?: boolean;
}

const words = (rgb: readonly Json[]): number[] => rgb.map((c) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10);
export const WARM_ROCK_PALETTE = words((warmRock as Json).palette);
const signedY = (attr0: number) => ((attr0 & 0xff) >= 160 ? (attr0 & 0xff) - 256 : attr0 & 0xff);

export function eruptionFacts36(r0: Json, attackerSide: Side): Eruption36Facts {
  return { attackerSide, playerSpecies: r0.battlers.player.species, opponentSpecies: r0.battlers.opponent.species, activationOrder: r0.spriteOrder,
    animationRng: r0.animationRng, gameplayRng: r0.gameplayRng, immutableGameplayState: r0.immutableState };
}

export function eruptionAnchors36(f: Eruption36Facts) {
  const art = createBattleCommandFieldArtView({ player: { species: f.playerSpecies }, opponent: { species: f.opponentSpecies } } as never);
  return { art, player: liveBattlerAnchors("player", art), opponent: liveBattlerAnchors("opponent", art) };
}

/** The complete source-derived profile. */
export function eruptionProfile36(f: Eruption36Facts, neg: Eruption36Neg = {}): EruptionAnimationProfile {
  const side = f.attackerSide, tside: Side = side === "player" ? "opponent" : "player";
  const { art, player, opponent } = eruptionAnchors36(f);
  const anchors = { player, opponent };
  const A = anchors[side], T = anchors[tside];
  const before = f.tileRangeBeforeLoad ?? [0, 0];
  const freeAtEntry = Array.from({ length: 64 }, (_, s) => s).filter((s) => !ER36.occupied.includes(s));
  const geometry = { attackerSpriteSlot: side === "player" ? 6 : 8, attackerX: A.spriteCenter.x, attackerY: A.spriteCenter.y + (neg.anchor ? 1 : 0),
    centerToCornerVecY: -64, battlerPicHeight: 64, battlerYDelta: art[side].coords.yOffset + (neg.ydelta ? 1 : 0), matrixNum: ER36.matrixNum[side],
    // the attacker's idle rest before the task writes x2 (battle_anim_fire.c:829-834)
    ...(A.frontIdleRest.x2 || A.frontIdleRest.y2 ? { initialX2: A.frontIdleRest.x2, initialY2: A.frontIdleRest.y2 } : {}) };
  const launchFor = (wave2Start: number, endAge: number): EruptionLaunchProfile => ({
    side, geometry,
    allocator: { freeSpriteSlots: freeAtEntry, tileTag: ER36.tag, paletteTag: ER36.tag, tileRange: ER36.tileRange, tileRangeBeforeLoad: [before[0]!, before[1]!],
      paletteSlot: ER36.paletteSlot, loadedAge: 1, freedAge: endAge },
    taskSlot: ER36.launchTask,
    waves: [
      { taskStartAge: ER36.wave1Start, sourceOffset: 33, companionTaskSlot: ER36.companionTask, companionTaskEndAge: ER36.wave1Start + ER36.companionWait },
      { taskStartAge: wave2Start, sourceOffset: 46, companionTaskSlot: ER36.companionTask, companionTaskEndAge: wave2Start + ER36.companionWait },
    ],
    startingAnimationRng: f.animationRng, endAge,
  });
  // pass 1: wave 1 alone (wave 2 parked far away) -> E1 from the reducer
  const lifetime = (p: EruptionLaunchProfile, offset: 33 | 46) => {
    const frame = eruptionLaunchTimeline(p).find((fr) => fr.task !== null && fr.source?.offset === offset);
    if (!frame?.task) throw new Error(`no launch task ${offset}`);
    return frame.task.lifetime;
  };
  const e1 = lifetime(launchFor(900, 1200), 33)[1];
  const wave2Start = e1 + ER36.wave2Gap - (neg.wave2 ? 1 : 0);
  const e2 = lifetime(launchFor(wave2Start, 1200), 46)[1];
  const endAge = e2 + ER36.endAfterE2;
  const creationAge = e2 + ER36.fallingAfterE2;
  const resources = { tileTag: ER36.tag, paletteTag: ER36.tag, tileRangeBeforeLoad: [before[0]!, before[1]!] as [number, number], tileRange: ER36.tileRange,
    paletteSlot: ER36.paletteSlot, loadedAge: 1, freedAge: endAge };
  const composite = composeLivePalettes(speciesName(f.playerSpecies), speciesName(f.opponentSpecies));
  if (!composite) throw new Error("no palette composite");
  const pal = (p: readonly number[]) => { const o = [...p]; if (neg.palette) o[2 * 16 + 1] ^= 0x0421; return o; };
  const sprite = (s: Side) => battlerSprite(s, anchors[s]);
  const scene = [...KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({ slot: s.slot, attr: s.attr as readonly number[], subpriority: s.subpriority })),
    sprite("player"), sprite("opponent")].sort((a, b) => a.slot - b.slot);
  // as tools/compare/eruptionReducer.ts orderProfile: the row-0 sprite list, then battlerSprites {attacker, target}
  const keys: EruptionSpriteOrderKey[] = [...scene, sprite(side), sprite(tside)].map((s) => ({
    slot: s.slot, priority: ((s.attr[2]! >> 10) & 3) as 0 | 1 | 2 | 3, subpriority: s.subpriority, y: signedY(s.attr[0]!) }));
  const lowestFree = (n: number) => freeAtEntry.slice(0, n);
  // AnimTask_EruptionLaunchRocks_Step state 1 ends with x2 = 0 and state 5 restores y (battle_anim_fire.c:845, 899): at the shake
  // creation the attacker carries no idle rest; the target keeps its species rest
  const shakeBattler = (s: Side) => ({ battlerId: s === "player" ? 0 : 1, side: s, spriteSlot: s === "player" ? 6 : 8,
    x: anchors[s].spriteCenter.x, y: anchors[s].spriteCenter.y, initialX2: s === side ? 0 : anchors[s].frontIdleRest.x2, initialY2: s === side ? 0 : anchors[s].frontIdleRest.y2 });
  return {
    orientation: side === "player" ? "player-back" : "opponent-front",
    endAge,
    launch: launchFor(wave2Start, endAge),
    falling: {
      creationAge, endAge, calls: ERUPTION_FALLING_ROCK_SOURCE_CALLS,
      geometry: { oamCenterOffsetX: 16, oamCenterOffsetY: 16, subpriority: 3, oamPriority: 2, horizontalFlip: true },
      allocator: { freeSpriteSlots: lowestFree(6), tileTag: ER36.tag, paletteTag: ER36.tag, tileRange: ER36.tileRange, tileRangeBeforeLoad: resources.tileRangeBeforeLoad,
        paletteSlot: ER36.paletteSlot, loadedAge: 1, freedAge: endAge },
      startingAnimationRng: f.animationRng,
    },
    horizontalShake: {
      orientation: side === "player" ? "player-back" : "opponent-front",
      taskCreationAge: creationAge + ER36.shakeAfterFalling, endAge, platformTaskSlot: ER36.platformTask, battlerTaskSlot: ER36.battlerTask,
      platformInitialX: 0, battlers: [shakeBattler("player"), shakeBattler("opponent")],
      startingAnimationRng: f.animationRng, gameplayRng: f.gameplayRng, resources,
    },
    palette: {
      closingCommandAge: creationAge + ER36.closingAfterFalling, cleanupAge: endAge,
      attackerBattler: side === "player" ? 0 : 1, targetBattler: side === "player" ? 1 : 0, visiblePartnerBattlers: [],
      paletteSpriteSlots: { opening: lowestFree(1)[0]!, closing: lowestFree(1)[0]! },
      geometry: { x: T.picOffsetPoint.x, y: T.picOffsetPoint.y, openingSubpriority: ER36.battlerSub[side] - (neg.sub ? 0 : 2), closingSubpriority: 3 },
      warmRockPaletteSlot: ER36.paletteSlot, paletteTagsAtAge0: ER36.paletteTags,
      unfadedPaletteAtAge0: pal(composite.unfaded), fadedPaletteAtAge0: pal(composite.faded), hardwarePaletteAtAge0: pal(composite.hardware),
      warmRockPalette: WARM_ROCK_PALETTE,
    },
    audio: { commandAge: creationAge + ER36.audioAfterFalling, endAge, taskSlot: ER36.audioTask, attackerSide: side, targetSide: tside },
    gameplayRng: f.gameplayRng,
    immutableGameplayState: f.immutableGameplayState,
    spriteOrder: { initialOrder: neg.order ? Array.from({ length: 64 }, (_, s) => s) : f.activationOrder, initialKeys: keys },
  };
}

/** Wave ends of a profile (E1, E2) through the unchanged reducer. */
export function eruptionWaveEnds36(p: EruptionAnimationProfile): [number, number] {
  const frames = eruptionTimeline(p).frames;
  const end = (o: number) => frames.filter((fr) => fr.launch.task !== null && fr.launch.source?.offset === o).at(-1)!.age;
  return [end(33), end(46)];
}
