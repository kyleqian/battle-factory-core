/**
 * prep33: source-derived live-input prototype for MOVE_SHOCK_WAVE (351). The accepted reducer (src/animation/shockWave.ts) is already a source
 * model; what it lacks is (a) a producer for its ShockWaveLiveInputs and (b) geometry-derived timing (shockWaveTimingFor hard-codes the two
 * accepted windows: player 159 / 195 / 262 / 266, opponent 153 / 191 / 258 / 262). This file derives both from production-available facts only:
 *
 * Timing (battle_anim_electric.c AnimTask_ShockWaveProgressingBolt / AnimTask_ShockWaveLightning, battle_anim_scripts.s Move_SHOCK_WAVE):
 *   progressing task created at row 77 (delay 30 after the orb at 45); column 1 walks from the attacker Y_PIC_OFFSET up by 8 until <= 4, columns
 *   2..5 are 9 bolts each (4..68 / 68..4), a 5-frame turn between columns, each bolt dies after 13 frames, the task ends when its live count is 0;
 *   waitforvisualfinish -> AnimTask_ShockWaveLightning row = progressing destroy row + 1; lightning y = (target BATTLER_COORD_Y + 32) reduced by
 *   32 until <= 16, one bolt every 2 rows until y >= that bound (count N), each lives 30 frames (anim end) -> waitforvisualfinish -> ShakeMon row
 *   = lightning start + 2 N + 30; ShakeMon/blend run 67 rows -> clearmonbg row + 4 = first inactive row.
 * Inputs (classes S / K / A / P / L / M / H, docs/next-adapters-prep33.md s1.3): anchors from the species tables (prep30Species.ts), battler OAM from
 *   anchors + side constants, sprite / task / matrix slots by lowest-free simulation over the source lifetimes, resource allocator constants,
 *   asset palettes, activation palette / register / BG snapshot from the host, the lent 64-slot sSpriteOrder.
 */
import { coordX, picOffsetY, speciesName, yDelta, yWithElevation } from "./prep30Species.ts";
export type Side = "player" | "opponent";
export interface ShockWaveTiming33 { readonly progressEnd: number; readonly lightningStart: number; readonly lightningCount: number; readonly shakeStart: number; readonly clearStart: number; readonly cleanupAge: number }
const trunc = (n: number, d: number) => Math.trunc(n / d);
/** Source program of AnimTask_ShockWaveProgressingBolt (same loop as shockWave.ts progressingTimeline, run to its destroy row). */
export function progressingEnd(attackerX: number, attackerY: number, targetX: number): number {
  const s = [1, 0, 0, 0, 7, -1, attackerX, attackerY, 4, trunc(targetX - attackerX, 5), targetX, 12, 0, 0, 0, 0];
  const live: number[] = [];
  for (let age = 77; age < 400; age += 1) {
    for (let i = live.length - 1; i >= 0; i -= 1) if (age - live[i]! > 12) { live.splice(i, 1); s[3] -= 1; }
    if (s[0] === 1) {
      s[1] += 1;
      if (s[1]! > 0) {
        s[1] = 0; live.push(age); s[3] += 1;
        s[4] += s[5]!; if (s[4]! < 0) s[4] = 7; if (s[4]! > 7) s[4] = 0;
        if ((s[5]! < 0 && s[7]! <= s[8]!) || (s[5]! > 0 && s[7]! >= s[8]!)) { s[2] += 1; s[6] += s[9]!; s[0] = s[2] === 5 ? 3 : s[0]! + 1; }
        else s[7] += s[5]! * 8;
      }
      if (s[11]) s[11] -= 1;
    } else if (s[0] === 2) {
      if (s[11]) s[11] -= 1;
      s[1] += 1;
      if (s[1]! > 4) { s[1] = 0; if ((s[2]! & 1) !== 0) { s[7] = 4; s[8] = 68; s[4] = 0; s[5] = 1; } else { s[7] = 68; s[8] = 4; s[4] = 7; s[5] = -1; } s[0] = s[11] ? 4 : 1; }
    } else if (s[0] === 4) { if (s[11]) s[11] -= 1; else s[0] = 1; }
    else if (s[0] === 3 && s[3] === 0) return age;
  }
  throw new Error("progressing bolt never ends");
}
export function lightningCount(targetBattleY: number): number {
  const bound = targetBattleY + 32; let y = bound; while (y > 16) y -= 32;
  let n = 0; for (;;) { n += 1; if (y >= bound) return n; y += 32; }
}
export function shockWaveTiming33(attacker: { x: number; y: number }, target: { x: number; y: number }, targetBattleY: number): ShockWaveTiming33 {
  const progressEnd = progressingEnd(attacker.x, attacker.y, target.x), lightningStart = progressEnd + 1, n = lightningCount(targetBattleY);
  const shakeStart = lightningStart + 2 * n + 30, clearStart = shakeStart + 67;
  return { progressEnd, lightningStart, lightningCount: n, shakeStart, clearStart, cleanupAge: clearStart + 4 };
}
/** A: X_2 / Y_PIC_OFFSET from the species tables; BATTLER_COORD_Y is the plain sBattlerCoords y (no elevation: ROM lightning data[15] = 72 for WEEZING). */
export function anchors(species: number, side: Side): { pic: { x: number; y: number }; battleY: number } {
  return { pic: { x: coordX(side), y: picOffsetY(species, side) }, battleY: side === "player" ? 80 : 40 };
}

import shockWaveAsset from "../../src/animation/assets/shock-wave.json" with { type: "json" };
import { composeLivePalettes } from "../../src/engine/liveMovePaletteComposite.ts";
import type { ShockWaveLiveInputs, ShockWaveOam } from "../../src/animation/shockWave.ts";

/** K: known-entry constants, identical in all 6 windows (accepted P / O, prep22 MANECTRIC -> WAILMER P / O, prep33 RAICHU -> WEEZING, WEEZING -> SNORLAX). */
export const SW_K = Object.freeze({
  battlerSlot: { player: 6, opponent: 8 } as const,           // gBattlerSpriteIds (host)
  battlerSub: { player: 30, opponent: 40 } as const,          // GetBattlerSpriteSubpriority (singles)
  battlerAttr2: { player: 2417, opponent: 6617 } as const,    // tile 369 / 473, prio 2, OBJ bank 0 / 1
  taskSlots: { charging: 0, progressing: 2, lightning: 0, shake: 0, blend: 2, monbg: 1, clear: 0 },
  occupied: [0, 1, 2, 6, 8, 60, 61, 62, 63], matrixBitmap: 6,
  healthbox: [[0, [72, 49278, 20508], 1], [1, [16398, 49164, 20636], 1], [60, [16410, 16420, 24868], 0], [61, [16398, 49228, 20668], 1], [62, [16468, 16542, 24860], 0], [63, [72, 49342, 20572], 1]] as const,
  shadowAttr2: 23853,
  // resource allocator (first load into the known entry): tile slot, tile range, OBJ palette allocator slot
  resources: { electricOrbs: [6, [305, 4], 7], circleOfLight: [7, [537, 64], 8], spark: [10, [309, 24], 9], lightning: [11, [601, 80], 10] } as const,
  tags: { circleOfLight: 10212, electricOrbs: 10211, spark: 10001, lightning: 10037 } as const,
  attr2: { charging: 0x7000 | 0x800 | 308, orb: 35353, progressing: 0x9000 | 0x800 | 316, lightning: 0xa000 | 0x800 | 601 },
  paletteBlendAttr: [160, 304, 65535] as ShockWaveOam,
  monbg: { player: { bg: 2, cnt: 24066, bank: 9 }, opponent: { bg: 1, cnt: 23554, bank: 8 } } as const,
});
const rgb555 = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
/** P: the asset palette of one resource (shock-wave.json, extracted from the decomp). */
export const assetPalette = (name: keyof typeof SW_K.tags): number[] => ((shockWaveAsset as any).art[name].palette as { r: number; g: number; b: number }[]).map(rgb555);

export interface ShockWaveHost33 {
  /** L: the live 64-slot sSpriteOrder at activation (lent by the host, as every oam1 move). */
  readonly spriteOrder: readonly number[];
  /** H: activation register / BG-scroll snapshot (first body of a battle: the known entry). */
  readonly registers0: Readonly<Record<string, number>>;
  readonly battleBg0: Readonly<Record<string, number>>;
  /** echo: host gRng2 at activation (never read by the renderer); gameplay RNG is opaque. */
  readonly animationRng: number; readonly gameplayRng: unknown;
}
/** A: a battler sprite (spriteCenter = picOffsetPoint without the player +8 / clamp) with side constants. */
function battlerSprite(species: number, side: Side) {
  const x = coordX(side), y = side === "player" ? 80 + yDelta(species, side) : yWithElevation(species, side) + yDelta(species, side);
  return { slot: SW_K.battlerSlot[side], x, y, x2: 0, y2: 0, subpriority: SW_K.battlerSub[side], oamPriority: (SW_K.battlerAttr2[side] >>> 10) & 3, matrixNum: 0,
    matrix: [256, 0, 0, 256] as const, attr: [(y - 32) & 0xff, 0xc000 | ((x - 32) & 0x1ff), SW_K.battlerAttr2[side]] as ShockWaveOam };
}
/** Lowest-free simulation of the move's sprite births up to the orb (palette-blend sprite row 16, 20 charging particles from row 31, orb row 45). */
export function shockWaveSpriteSlots(): { paletteBlend: number; orb: number } {
  const occ = new Set<number>(SW_K.occupied); const low = () => { for (let s = 0; s < 64; s += 1) if (!occ.has(s)) { occ.add(s); return s; } throw new Error("full"); };
  const paletteBlend = low(); const live: { slot: number; end: number }[] = [{ slot: paletteBlend, end: 29 }];
  const free = (age: number) => { for (let i = live.length - 1; i >= 0; i -= 1) if (live[i]!.end < age) { occ.delete(live[i]!.slot); live.splice(i, 1); } };
  const durations = [40, 40, 35, 35, 30, 30, 25, 25, 20, 20, 15, 15, 10, 10];
  for (let age = 31; age < 45; age += 1) { free(age); live.push({ slot: low(), end: age + durations[age - 31]! + 7 }); }
  free(45); return { paletteBlend, orb: low() };
}
export function shockWaveInputs33(attackerSpecies: number, targetSpecies: number, attackerSide: Side, host: ShockWaveHost33, neg?: string): ShockWaveLiveInputs {
  const targetSide: Side = attackerSide === "player" ? "opponent" : "player";
  const a = anchors(attackerSpecies, attackerSide), t = anchors(targetSpecies, targetSide);
  if (neg === "anchor") a.pic.x += 1;
  const attackerSprite = battlerSprite(attackerSpecies, attackerSide), targetSprite = battlerSprite(targetSpecies, targetSide);
  const playerName = speciesName(attackerSide === "player" ? attackerSpecies : targetSpecies), opponentName = speciesName(attackerSide === "player" ? targetSpecies : attackerSpecies);
  const composite = composeLivePalettes(playerName, opponentName);
  if (!composite) throw new Error(`no palette composite for ${playerName} / ${opponentName}`);
  const resource = (name: keyof typeof SW_K.tags) => { const [tileSlot, tileRange, pal] = SW_K.resources[name];
    const palette = assetPalette(name); if (neg === "palette" && name === "lightning") palette[1] ^= 0x0421;
    return { tag: SW_K.tags[name], tileSlot, tileRange: [tileRange[0], tileRange[1]] as const, paletteAllocatorSlot: pal, hardwarePaletteBank: 16 + pal, palette }; };
  const slots = shockWaveSpriteSlots(), mb = SW_K.monbg[attackerSide];
  const opponentSpecies = attackerSide === "opponent" ? attackerSpecies : targetSpecies;
  const elevated = yWithElevation(opponentSpecies, "opponent") !== 40;
  const live = [...SW_K.healthbox.map(([slot, attr, subpriority]) => ({ slot, attr: [...attr] as unknown as ShockWaveOam, subpriority })),
    { slot: 2, attr: (elevated ? [0x4000 | 65, 0x4000 | 160, SW_K.shadowAttr2] : [0x4000, 0x4000, SW_K.shadowAttr2]) as unknown as ShockWaveOam, subpriority: 200 },
    { slot: attackerSprite.slot, attr: attackerSprite.attr, subpriority: attackerSprite.subpriority }, { slot: targetSprite.slot, attr: targetSprite.attr, subpriority: targetSprite.subpriority }]
    .sort((l, r) => l.slot - r.slot);
  const registers = { ...host.registers0 }; if (neg === "registers") registers.win0h = (registers.win0h ?? 0) + 1;
  return {
    attackerSide, targetSide, attackerSpecies: speciesName(attackerSpecies), targetSpecies: speciesName(targetSpecies),
    attackerPictureOrigin: a.pic, targetPictureOrigin: t.pic, targetBattlePosition: { x: t.pic.x, y: t.battleY },
    attackerSprite, targetSprite, taskSlots: { ...SW_K.taskSlots }, spriteSlots: slots, matrixSlots: { orb: lowestFreeBit(SW_K.matrixBitmap) },
    resources: { circleOfLight: resource("circleOfLight"), electricOrbs: resource("electricOrbs"), spark: resource("spark"), lightning: resource("lightning") },
    allocator: { initialOccupiedSprites: [...SW_K.occupied], initialMatrixBitmap: SW_K.matrixBitmap, spriteOrder: [...host.spriteOrder], initialLiveSprites: live },
    oam: { charging: [0, 0, SW_K.attr2.charging], orb: [0x500 | ((a.pic.y - 32) & 0xff), 0xc000 | ((a.pic.x - 32) & 0x1ff), SW_K.attr2.orb], progressing: [0, 0, SW_K.attr2.progressing],
      lightning: [0, 0, SW_K.attr2.lightning], paletteBlend: SW_K.paletteBlendAttr },
    palettes: { unfaded: [...composite.unfaded], faded: [...composite.faded], hardware: [...composite.hardware] },
    background: { values: { ...host.battleBg0 }, xKey: `gBattle_BG${mb.bg}_X`, yKey: `gBattle_BG${mb.bg}_Y`, controlRegister: `bg${mb.bg}cnt`, horizontalRegister: `bg${mb.bg}hofs`, verticalRegister: `bg${mb.bg}vofs`,
      setupX: 32 - attackerSprite.x, setupY: 32 - attackerSprite.y, setupControl: mb.cnt, clearX: 0, clearY: 0, clearControl: mb.cnt, clearHorizontal: 0, clearVertical: 0, monbgPaletteBank: mb.bank,
      initialVram: "vram:activation", setupVram: "vram:monbg-setup", clearingVram: "vram:monbg-clearing", clearVram: "vram:monbg-cleared" },
    registers, animationRngSeed: host.animationRng, gameplayRng: host.gameplayRng,
  };
}
const lowestFreeBit = (bitmap: number): number => { for (let b = 0; b < 32; b += 1) if (!(bitmap & (1 << b))) return b; throw new Error("no matrix"); };
