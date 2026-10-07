/** prep23: first-body known-entry block for the ghost Curse model (allocator slots, anchors, tile bases/banks, activation state), read from a dense corpus. */
import curseAsset from "../../src/animation/assets/curse.json" with { type: "json" };
import type { CurseGhostKnown } from "./prep23CurseGhost.ts";
import type { Oam3 } from "./prep23CurseStats.ts";
type Json = Record<string, any>;
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string): Oam3 => [word(e, 0), word(e, 4), word(e, 8)];
const bgr555 = (c: { r: number; g: number; b: number }) => (c.r >> 3) | (c.g >> 3) << 5 | (c.b >> 3) << 10;
export function ghostKnownFor(rows: Json[], side: "player" | "opponent"): CurseGhostKnown {
  const r0 = rows[0]!, r1 = rows[1]!, ids = r0.animationBattlers.spriteIds as number[], A = ids[side === "player" ? 0 : 1]!, D = ids[side === "player" ? 1 : 0]!;
  const spr = (r: Json, slot: number) => r.sprites.find((s: Json) => s.slot === slot);
  const nailRow = rows.find((r) => r.sprites.some((s: Json) => s.template?.symbol === "gCurseNailSpriteTemplate"))!, ghostRow = rows.find((r) => r.sprites.some((s: Json) => s.template?.symbol === "gCurseGhostSpriteTemplate"))!;
  const nail = nailRow.sprites.find((s: Json) => s.template?.symbol === "gCurseNailSpriteTemplate"), ghost = ghostRow.sprites.find((s: Json) => s.template?.symbol === "gCurseGhostSpriteTemplate");
  const tiles = (r: Json, tag: number) => { const i = r.tileTags.slice(0, 64).indexOf(tag); return r.resourceAllocators.tileRanges[i][0]; };
  const banks = (r: Json, tag: number) => r.paletteTags.indexOf(tag);
  return { side, healthboxAttr: r1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: r1.spriteOrder.slice(0, 6), dummyAttr: [0x00a0, 0x0130, 0x0c00],
    attackerSlot: A, targetSlot: D, attackerAttr: spr(r0, A).attr, targetAttr: spr(r0, D).attr, attackerX: spr(r0, A).x, attackerY: spr(r0, A).y, targetX: spr(r0, D).x, targetY: spr(r0, D).y,
    nailAnchor: { x: nail.x - (side === "player" ? 24 : -24), y: nail.y }, ghostAnchor: { x: ghost.x, y: ghost.y },
    nailTileBase: tiles(nailRow, 10199), nailBank: banks(nailRow, 10199) , ghostTileBase: tiles(ghostRow, 10200), ghostBank: banks(ghostRow, 10200), sprite3: nail.slot,
    activationRegisters: r0.registers, bodyRegisters: r1.registers, hardwareMatrices: r1.hardwareMatrices, activationPalette: r0.hardwarePalette,
    nailPalette: (curseAsset as any).nail.palette.map(bgr555), ghostPalette: (curseAsset as any).ghost.palette.map(bgr555), spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder };
}
