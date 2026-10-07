/**
 * prep35: MOVE_SKILL_SWAP (285) per-row display provider prototype (docs/next-adapters-prep35.md s1). Completes prep33's derived fields
 * (prep33SkillSwapCheck.ts: geometry, orb program, slots / matrices, bldcnt / bldy, T lag row 176) with the three display inputs the
 * SKILL_SWAP renderer branch decodes (battleScene.ts:24600): the 128-entry hardware OAM in SortSprites order, the 32 hardware matrices
 * (sAffineAnims_SkillSwapOrb through the sprite.c affine-anim engine) and the hardware palette (psychic BG load + rotation + restore,
 * the two AnimTask_BlendMonInAndOut white passes, the BLUEGREEN_ORB sheet). Production values only: species tables (class A), the known
 * entry (K), the lent activation sSpriteOrder (L), the asset palettes (P) and the T bit. Never a capture row (the checker feeds row 0
 * only as the host's activation snapshot it would own: order + palette composite).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import orbAsset from "../../src/animation/assets/skill-swap-bluegreen-orb.json" with { type: "json" };
import psychicBgAsset from "../../src/assets/gen/battle-anim-psychic-bg.json" with { type: "json" };
import { sortGbaSpriteOrder } from "../../src/animation/gbaObjCompositor.ts";
import { skillSwapAtAge, type SkillSwapLiveInputs } from "../../src/animation/skillSwap.ts";
import { KNOWN_ENTRY_NON_BATTLER_SPRITES } from "../../src/engine/liveBgSnapshotMoves.ts";
import { KNOWN_ENTRY_HEALTHBOX_OAM, KNOWN_ENTRY_HEALTHBOX_SLOTS, buildLiveHardwareOam, carryLiveSpriteOrder, type LiveOamSprite, type OamAttr } from "../../src/engine/liveMoveOamAssembler.ts";
import { coordX, picOffsetY, speciesName, yDelta, yWithElevation } from "./prep30Species.ts";

export type Side = "player" | "opponent";
type Mat = readonly [number, number, number, number];
const IDENTITY: Mat = [256, 0, 0, 256];

const ref = resolve(import.meta.dirname, "../../reference/pokeemerald/src/data/pokemon_graphics");
const sizes = (file: string) => new Map([...readFileSync(resolve(ref, file), "utf8").matchAll(/\[SPECIES_(\w+)\]\s*=\s*\{\s*\.size\s*=\s*MON_COORDS_SIZE\((\d+),\s*(\d+)\)/g)]
  .map((m) => [m[1]!, [Math.ceil(Number(m[2]) / 8) * 8, Math.ceil(Number(m[3]) / 8) * 8] as const]));
const FRONT = sizes("front_pic_coordinates.h"), BACK = sizes("back_pic_coordinates.h");
/** A (= prep33 skillSwapBounds): GetBattlerSpriteCoordAttr LEFT / RIGHT / TOP / BOTTOM (battle_anim_mons.c:2273-2280). */
export function skillSwapBounds35(species: number, side: Side, dx = 0) {
  const [w, h] = (side === "player" ? BACK : FRONT).get(speciesName(species)) ?? [64, 64];
  const x = coordX(side) + dx, y = picOffsetY(species, side);
  return { left: x - w / 2, right: x + w / 2, top: y - h / 2, bottom: y + h / 2 };
}
/** A + K (= prep33 battlerAttr33): the 64x64 battler OBJ at its sprite centre, side attr2. */
export const battlerAttr35 = (species: number, side: Side): OamAttr => {
  const x = coordX(side), y = side === "player" ? 80 + yDelta(species, side) : yWithElevation(species, side) + yDelta(species, side);
  return [(y - 32) & 0xff, 0xc000 | ((x - 32) & 0x1ff), side === "player" ? 2417 : 6617];
};

/** K (prep33 SS_K, 6/6 windows): lowest-free (slot, matrix) pairs over the known entry, orb attr2 (tile 305, prio 2, OBJ bank 7). */
export const SS35 = Object.freeze({
  orbPairs: [[3, 0], [4, 3], [5, 4], [7, 5], [9, 6]] as const,
  taskSlots: { fadeToPsychic: 0, psychicBackground: 1, targetOrbs: 0, targetBlend: 2, loopReversal: 3, attackerOrbs: 4, attackerBlend: 5, restoreFade: 0 },
  orbAttr2: 31025, orbTile: 305, orbBank: 23, orbSubpriority: 0,
  legStart: { target: 42, attacker: 60 } as const, cadence: 7, life: 16,
});

export interface OrbLife { leg: "target" | "attacker"; ordinal: number; order: number; spawn: number; slot: number; matrixNum: number; anim: number }
/** S: the 24 orbs, (slot, matrix) by chronological lowest-free over the interleaved legs (= prep33 orbAllocations33); the affine anim is
 * StartSpriteAffineAnim(sprite, task->data[2] & 3) with data[2] = the leg ordinal BEFORE its increment (battle_anim_psychic.c:925-930). */
export function orbLives35(animOf: (ordinal: number) => number = (o) => o & 3): OrbLife[] {
  const all: OrbLife[] = [];
  for (const leg of ["target", "attacker"] as const) for (let o = 0; o < 12; o += 1)
    all.push({ leg, ordinal: o, order: (leg === "target" ? 0 : 12) + o, spawn: SS35.legStart[leg] + o * SS35.cadence, slot: -1, matrixNum: -1, anim: animOf(o) });
  const live: { pair: number; end: number }[] = [];
  for (const orb of [...all].sort((l, r) => l.spawn - r.spawn || l.order - r.order)) {
    for (let i = live.length - 1; i >= 0; i -= 1) if (live[i]!.end < orb.spawn) live.splice(i, 1);
    const used = new Set(live.map((l) => l.pair)), pair = SS35.orbPairs.findIndex((_, i) => !used.has(i));
    live.push({ pair, end: orb.spawn + SS35.life }); [orb.slot, orb.matrixNum] = SS35.orbPairs[pair]!;
  }
  return all;
}

/** sAffineAnims_SkillSwapOrb (battle_anim_psychic.c:308-348): [type, scale delta / absolute, duration] or jump target. */
const AFFINE: readonly (readonly (readonly ["frame", number, number] | readonly ["jump", number])[])[] = [
  [["frame", -8, 8], ["frame", 8, 8], ["jump", 0]],
  [["frame", 0xf0, 0], ["frame", -8, 6], ["frame", 8, 8], ["frame", -8, 2], ["jump", 1]],
  [["frame", 0xd0, 0], ["frame", -8, 4], ["frame", 8, 8], ["frame", -8, 4], ["jump", 1]],
  [["frame", 0xb0, 0], ["frame", -8, 2], ["frame", 8, 8], ["frame", -8, 6], ["jump", 1]],
];
/** sprite.c affine engine (BeginAffineAnim on the first AnimateSprite, then ContinueAffineAnim / AffineAnimDelay / jump; a frame with
 * duration 0 is absolute, otherwise relative with duration - 1 delays). Returns the xScale (= yScale) after `steps` AnimateSprite calls. */
export function orbScale35(anim: number, steps: number): number {
  const cmds = AFFINE[anim]!; let scale = 0x100, cmd = 0, delay = 0;
  const apply = (c: number) => { const f = cmds[c]! as readonly ["frame", number, number]; if (f[2]) { scale += f[1]; delay = f[2] - 1; } else { scale = f[1]; delay = 0; } };
  for (let n = 1; n <= steps; n += 1) {
    if (n === 1) { cmd = 0; apply(0); continue; }
    if (delay) { scale += (cmds[cmd]! as readonly ["frame", number, number])[1]; delay -= 1; continue; }
    cmd += 1; if (cmds[cmd]![0] === "jump") cmd = (cmds[cmd] as readonly ["jump", number])[1];
    apply(cmd);
  }
  return scale;
}
/** ConvertScaleParam (0x10000 / scale) + ObjAffineSet at rotation 0. */
export const orbMatrix35 = (scale: number): Mat => { const p = Math.trunc(0x10000 / scale); return [p, 0, 0, p]; };

export interface SkillSwapDisplayArgs {
  attackerSide: Side; attackerSpecies: number; targetSpecies: number;
  /** L: the host's activation 64-slot sSpriteOrder. */
  activationOrder: readonly number[];
  firstInactiveAge: number;
  /** negative controls / alternates */
  animOf?: (ordinal: number) => number; anchorDx?: number; noCarry?: boolean;
}
export interface SkillSwapDisplayRows { oam: string[][]; matrices: Mat[][]; softwareMatrices: Mat[][]; orders: number[][]; lives: OrbLife[] }

/** Stub reducer input: the orb program only (positions / data). */
function programInput(a: SkillSwapDisplayArgs, lives: OrbLife[]): SkillSwapLiveInputs {
  const ts: Side = a.attackerSide === "player" ? "opponent" : "player";
  const bounds = skillSwapBounds35(a.attackerSpecies, a.attackerSide, a.anchorDx ?? 0), tb = skillSwapBounds35(a.targetSpecies, ts);
  const sprite = { slot: 0, x: 0, y: 0, x2: 0, y2: 0, attr: [0, 0, 0] as const, subpriority: 0, matrixNum: 0, matrix: IDENTITY };
  return { attackerSide: a.attackerSide, targetSide: ts, attackerSpecies: "", targetSpecies: "", attackerBounds: bounds, targetBounds: tb,
    attackerSprite: sprite, targetSprite: sprite, taskSlots: SS35.taskSlots,
    orbAllocations: [...lives].sort((l, r) => l.order - r.order).map((l) => ({ slot: l.slot, matrixNum: l.matrixNum, sourceCreationOrder: l.order })),
    orbOam: SS35.orbPairs.map(([slot]) => ({ slot, attr: [0, 0, 0] as const, subpriority: 0 })), spriteOrder: [], softwareOam: [], hardwareOam: [],
    softwareMatrices: Array.from({ length: 32 }, () => IDENTITY), hardwareMatrices: [], palette: { unfaded: [], faded: [], hardware: [] }, registers: {},
    background: { currentVram: null, battleVram: null, psychicVram: null }, resources: { tag: 0, tileSlot: 0, paletteAllocatorSlot: 0, paletteBank: 0, tileRange: [0, 0], allocator: null },
    sharedTaskData: { fadeToPsychic: [], loopReversal: [], restoreFade: [] }, targetBlendPaletteStart: 0, attackerBlendPaletteStart: 0,
    audio: { current: null, attackerPan: 0 }, liveCounts: { visualTasks: 0, soundTasks: 0 }, animationRng: 0, firstInactiveAge: a.firstInactiveAge,
    abilityOutcome: { playerAbilityAfterSwap: -1, opponentAbilityAfterSwap: -1 }, gameplayRng: null, gameplayState: null };
}

/**
 * Per-row hardware OAM / matrices (rows 0..firstInactiveAge). Frame f's BuildOamBuffer (after AnimateSprites, before RunTasks) sees the
 * orbs born on rows < f that are still alive (an orb's callback destroys it, FreeOamMatrix -> identity, on its 17th AnimateSprite = row
 * spawn + 17), at the reducer's state-f position, with matrix = scale after f - spawn affine steps; it sorts all 64 slots once
 * (carryLiveSpriteOrder, free slots carry the dummy key) and the VBlank copies it: hardware row r = build of frame r - 1. Row 0 is the
 * pre-activation idle build (the lent activation order, battlers + scene only).
 */
export function skillSwapDisplayRows35(a: SkillSwapDisplayArgs): SkillSwapDisplayRows {
  const lives = orbLives35(a.animOf), ts: Side = a.attackerSide === "player" ? "opponent" : "player", input = programInput(a, lives);
  const scene = KNOWN_ENTRY_NON_BATTLER_SPRITES.map((s) => ({ slot: s.slot, attr: s.attr as unknown as OamAttr, subpriority: s.subpriority, visible: s.slot !== 2 }));
  const battlers = [[a.attackerSide, a.attackerSpecies], [ts, a.targetSpecies]].map(([side, sp]) => {
    const attr = battlerAttr35(sp as number, side as Side); return { slot: side === "player" ? 6 : 8, attr, subpriority: side === "player" ? 30 : 40, visible: true };
  });
  const healthbox = { slots: KNOWN_ENTRY_HEALTHBOX_SLOTS, entries: KNOWN_ENTRY_HEALTHBOX_OAM };
  /** sprites + matrices as BuildOamBuffer of frame f sees them */
  const atBuild = (f: number): { sprites: LiveOamSprite[]; matrices: Mat[] } => {
    const sprites: LiveOamSprite[] = [...scene, ...battlers].map((s) => ({ ...s, oamY: s.attr[0] & 0xff }));
    const matrices: Mat[] = Array.from({ length: 32 }, () => IDENTITY);
    if (f < 0) return { sprites, matrices };
    const st = skillSwapAtAge(f, input);
    for (const l of lives) {
      const n = f - l.spawn; if (n < 1 || n > SS35.life) continue;
      const o = st.orbs.find((x) => x.sourceCreationOrder === l.order)!;
      const attr: OamAttr = [0x0100 | (o.y + o.y2 - 8) & 0xff, 0x4000 | l.matrixNum << 9 | (o.x + o.x2 - 8) & 0x1ff, SS35.orbAttr2];
      sprites.push({ slot: l.slot, attr, subpriority: SS35.orbSubpriority, visible: true, oamY: attr[0] & 0xff });
      matrices[l.matrixNum] = orbMatrix35(orbScale35(l.anim, n));
    }
    return { sprites, matrices };
  };
  const rows = a.firstInactiveAge + 1, sort = (p: readonly number[], k: Parameters<typeof sortGbaSpriteOrder>[1]) => sortGbaSpriteOrder(p, k);
  const out: SkillSwapDisplayRows = { oam: [], matrices: [], softwareMatrices: [], orders: [], lives };
  let order: readonly number[] = a.activationOrder, prev = atBuild(-1);
  for (let r = 0; r < rows; r += 1) {
    out.oam.push(buildLiveHardwareOam(order, prev.sprites, healthbox, prev.matrices));
    out.matrices.push(prev.matrices);
    prev = atBuild(r);
    out.softwareMatrices.push(prev.matrices);
    if (!a.noCarry) order = carryLiveSpriteOrder(order, prev.sprites, sort);
    out.orders.push([...order]);
  }
  return out;
}

/** P: gBattleAnimSpritePal_BluegreenOrb (src/animation/assets/skill-swap-bluegreen-orb.json) and gBattleAnimBgPalette_Psychic
 * (src/assets/gen/battle-anim-psychic-bg.json) as BGR555 words (the composeLivePalettes expansion). */
type Rgb = Readonly<{ r: number; g: number; b: number }>;
const bgr555 = (c: Rgb): number => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
export const ORB_PALETTE35: readonly number[] = (orbAsset as unknown as { orb: { palette: Rgb[] } }).orb.palette.map(bgr555);
export const PSYCHIC_PALETTE35: readonly number[] = (psychicBgAsset as unknown as { palette: Rgb[] }).palette.map(bgr555);

/** S: the palette schedule (rows) of Move_SKILL_SWAP. */
export const SS35_PAL = Object.freeze({ orbLoad: 1, psychicLoad: 23, firstRotation: 26, rotationEvery: 4, restore: 175, blendStart: { target: 42, attacker: 60 } as const,
  blendDelay: 3, blendMax: 12, white: 0x7fff });
export interface SkillSwapPaletteRow { unfaded: number[]; faded: number[]; hardware: number[] }
export interface SkillSwapPaletteArgs {
  attackerSide: Side; palette0: Readonly<{ unfaded: readonly number[]; faded: readonly number[]; hardware: readonly number[] }>;
  rows: number; restoreRow?: number; orbPalette?: readonly number[]; blendDx?: number;
}
/** BlendPalette (palette.c): faded[i] = unfaded[i] + ((color - unfaded[i]) * coeff >> 4) per channel. */
const blend = (c: number, coeff: number, to: number) => { const ch = (sh: number) => { const a = c >> sh & 31, b = to >> sh & 31; return (a + ((b - a) * coeff >> 4)) & 31; }; return ch(0) | ch(5) << 5 | ch(10) << 10; };
/** AnimTask_BlendMonInAndOut(battler, RGB_WHITE, 12, 3, 1) coefficient written on row r, or null (created on `start`; data[4] reaches 3 on
 * start + 2, then every 3 rows: 1..12 then 11..0, BlendPalette(OBJ bank * 16 + 1, 15, ...)). */
export function monBlendCoeff35(r: number, start: number): number | null {
  const k = r - (start + 2); if (k < 0 || k % SS35_PAL.blendDelay || k / SS35_PAL.blendDelay > 23) return null;
  const j = k / SS35_PAL.blendDelay; return j < 12 ? j + 1 : 23 - j;
}
/**
 * Per-row unfaded / faded / hardware palettes. Row 1: the orb sheet into OBJ bank 23 (loadspritegfx -> palette slot 7, both buffers);
 * row 23: the psychic BG palette into BG bank 2 (SetPsychicBackground, both buffers); SetPsychicBackground_Step rotates faded colours
 * 1..11 of bank 2 by one every 4th step (rows 26, 30, .., 174); UnsetPsychicBackground restores bank 2 on row 175 (both buffers);
 * the two white blends on the target (row 42) / attacker (row 60) OBJ banks (16 + attr2 >> 12: player 16, opponent 17).
 * Hardware row r = faded row r - 1 (the VBlank transfer), row 0 = the activation hardware palette.
 */
export function skillSwapPalettes35(a: SkillSwapPaletteArgs): SkillSwapPaletteRow[] {
  const P = SS35_PAL, restore = a.restoreRow ?? P.restore, orb = a.orbPalette ?? ORB_PALETTE35;
  const bank = (side: Side) => side === "player" ? 16 : 17, ts: Side = a.attackerSide === "player" ? "opponent" : "player";
  const unfaded = [...a.palette0.unfaded], faded = [...a.palette0.faded]; let prev = [...a.palette0.hardware];
  const out: SkillSwapPaletteRow[] = [];
  for (let r = 0; r < a.rows; r += 1) {
    if (r === P.orbLoad) for (let i = 0; i < 16; i += 1) { unfaded[23 * 16 + i] = orb[i]!; faded[23 * 16 + i] = orb[i]!; }
    if (r === P.psychicLoad) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = PSYCHIC_PALETTE35[i]!; faded[32 + i] = PSYCHIC_PALETTE35[i]!; }
    if (r >= P.firstRotation && r < restore && (r - P.firstRotation) % P.rotationEvery === 0) {
      const c11 = faded[32 + 11]!; for (let i = 10; i > 0; i -= 1) faded[32 + i + 1] = faded[32 + i]!; faded[32 + 1] = c11;
    }
    if (r === restore) for (let i = 0; i < 16; i += 1) { unfaded[32 + i] = a.palette0.unfaded[32 + i]!; faded[32 + i] = a.palette0.unfaded[32 + i]!; }
    for (const [side, start] of [[ts, P.blendStart.target + (a.blendDx ?? 0)], [a.attackerSide, P.blendStart.attacker + (a.blendDx ?? 0)]] as const) {
      const c = monBlendCoeff35(r, start); if (c === null) continue;
      const base = bank(side) * 16; for (let i = 1; i < 16; i += 1) faded[base + i] = blend(unfaded[base + i]!, c, P.white);
    }
    out.push({ unfaded: [...unfaded], faded: [...faded], hardware: r === 0 ? [...a.palette0.hardware] : prev });
    prev = [...faded];
  }
  return out;
}
