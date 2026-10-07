/** prep23: first-body known-entry block for the stats Curse model, read from rows 0/1 of a dense corpus (K values: allocator slots, battler art, activation registers). */
import type { CurseStatsKnown, Oam3 } from "./prep23CurseStats.ts";
type Json = Record<string, any>;
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string): Oam3 => [word(e, 0), word(e, 4), word(e, 8)];
export function knownFor(rows: Json[], side: "player" | "opponent"): CurseStatsKnown {
  const r0 = rows[0]!, r1 = rows[1]!, att = r0.battlerSprites.attacker, tgt = r0.battlerSprites.target;
  const attackerSprite = r0.sprites.find((s: Json) => s.slot === att.slot);
  return { side, healthboxAttr: r1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: r1.spriteOrder.slice(0, 6), dummyAttr: [0x00a0, 0x0130, 0x0c00],
    attackerSlot: att.slot, targetSlot: r0.animationBattlers.spriteIds[side === "player" ? 1 : 0], attackerAttr: att.attr, targetAttr: r0.sprites.find((s: Json) => s.slot === r0.animationBattlers.spriteIds[side === "player" ? 1 : 0]).attr,
    attackerX: attackerSprite.x, attackerY: attackerSprite.y, occupiedSlots: r0.sprites.map((s: Json) => s.slot),
    activationRegisters: r0.registers, bodyRegisters: r1.registers, activationPalette: r0.hardwarePalette, attackerObjBank: att.attr[2] >> 12, hardwareMatrices: r1.hardwareMatrices,
    spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder };
}
