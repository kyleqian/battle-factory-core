import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import {
  LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS, liveMoveAnimationDuration, liveMoveAnimationPresentation, liveMoveSubstituteDollDeclines,
} from "../src/engine/liveMoveAnimation.ts";
import { prepareLiveMoveSpriteOrder, type LiveMoveSpriteOrderInput } from "../src/engine/liveMoveSpriteAllocator.ts";
import { LIVE_SUBSTITUTE_SWAP_BODY_CELLS, liveSubstituteSwapApplies, substituteSwapCompositeDuration } from "../src/engine/liveSubstituteSwap.ts";
import { knownEntrySpriteOrderState } from "../src/engine/spriteOrderProvider.ts";
import speciesStats from "../src/data/gen/species-stats.json" with { type: "json" };

// sdl119 (docs/sdl119-struggle-doll-live.md; evidence docs/stf115-struggle-declines.md): Struggle (165) on a Substitute doll, both sides.
// Receipts: tools/integration/fixtures/stf115/rung2-*.txt (re-proved from the checkout by tools/integration/sdl119Run.sh).
const request = (attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId: 165, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 50, damage: 20, friendship: 0, multihit: 0 });
function displayed(player: string, opponent: string, doll: { playerDoll?: boolean; opponentDoll?: boolean } = {}): BattleResolutionDisplayedField {
  const mon = (name: string, isDoll: boolean | undefined) => ({
    species: speciesStats.species.find((s) => s.name === `SPECIES_${name}`)!.id, speciesSymbol: name, name, level: 50,
    hp: 100, maxHP: 100, gender: "male", status: "none", ...(isDoll ? { substituteDoll: true } : {}),
  });
  return { player: mon(player, doll.playerDoll), opponent: mon(opponent, doll.opponentDoll) } as unknown as BattleResolutionDisplayedField;
}
const firstBodyOrder = (): LiveMoveSpriteOrderInput =>
  ({ ...prepareLiveMoveSpriteOrder(knownEntrySpriteOrderState("ordinary-factory"), request(0)).input!, firstBody: true });
const present = (req: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField) =>
  liveMoveAnimationPresentation(req, field, 50, undefined, undefined, firstBodyOrder());
const hardware = (req: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField): readonly number[] =>
  (present(req, field) as any).config.animationInputs.hardwarePalette;
const bank = (words: readonly number[], n: number) => words.slice(n * 16, n * 16 + 16);

describe("sdl119: Struggle 165 Substitute-doll cells", () => {
  it("165 is in both cell maps, both sides", () => {
    expect(LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS.get(165)).toEqual(["player", "opponent"]);
    expect([...LIVE_SUBSTITUTE_SWAP_BODY_CELLS.get(165)!].sort()).toEqual(["opponent", "player"]);
  });

  it("a Substitute doll is live on either side: defender doll presents, attacker doll swaps with the 197 / 193 composite", () => {
    for (const attacker of [0, 1] as const) {
      const defenderDoll = displayed("SNORLAX", "GOLBAT", attacker === 0 ? { opponentDoll: true } : { playerDoll: true });
      expect(liveMoveSubstituteDollDeclines(request(attacker), defenderDoll)).toBe(false);
      expect(liveMoveAnimationDuration(request(attacker), defenderDoll)).toBe(112);
      expect(present(request(attacker), defenderDoll)).not.toBeNull();
      const attackerDoll = displayed("SNORLAX", "GOLBAT", attacker === 0 ? { playerDoll: true } : { opponentDoll: true });
      expect(liveSubstituteSwapApplies(request(attacker), attackerDoll)).toBe(true);
      expect(liveMoveSubstituteDollDeclines(request(attacker), attackerDoll)).toBe(false);
      expect(liveMoveAnimationDuration(request(attacker), attackerDoll))
        .toBe(substituteSwapCompositeDuration(attacker === 0 ? "player" : "opponent", 112));
      expect(liveMoveAnimationDuration(request(attacker), attackerDoll)).toBe(attacker === 0 ? 197 : 193);
    }
  });

  it("both battlers shown as dolls still decline", () => {
    for (const attacker of [0, 1] as const) {
      const field = displayed("SNORLAX", "GOLBAT", { playerDoll: true, opponentDoll: true });
      expect(liveMoveSubstituteDollDeclines(request(attacker), field)).toBe(true);
      expect(liveMoveAnimationDuration(request(attacker), field)).toBeNull();
    }
  });

  it("the palette rule: a defender doll carries gSubstituteDollPal in its OBJ bank (16 player / 17 opponent), species-independent; doll-free unchanged", () => {
    // Opponent attacks, player defender is the doll: bank 16 is the doll palette whatever the species (the species palette differs).
    const a = hardware(request(1), displayed("SNORLAX", "GOLBAT", { playerDoll: true }));
    const b = hardware(request(1), displayed("PIDGEOT", "GOLBAT", { playerDoll: true }));
    const free = hardware(request(1), displayed("SNORLAX", "GOLBAT"));
    expect(bank(a, 16)).toEqual(bank(b, 16));
    expect(bank(a, 16)).not.toEqual(bank(free, 16));
    expect(bank(a, 17)).toEqual(bank(free, 17));
    expect(bank(hardware(request(1), displayed("PIDGEOT", "GOLBAT")), 16)).not.toEqual(bank(free, 16));
    // Player attacks, opponent defender is the doll: bank 17.
    const c = hardware(request(0), displayed("SNORLAX", "GOLBAT", { opponentDoll: true }));
    const d = hardware(request(0), displayed("SNORLAX", "CROBAT", { opponentDoll: true }));
    const freeP = hardware(request(0), displayed("SNORLAX", "GOLBAT"));
    expect(bank(c, 17)).toEqual(bank(d, 17));
    expect(bank(c, 17)).not.toEqual(bank(freeP, 17));
    expect(bank(c, 16)).toEqual(bank(freeP, 16));
  });

  it("receipt pins (stf115 rung 2, regenerated from the checkout by sdl119Run.sh): 59 live windows 0 px incl. 5 defender-doll, 6 / 6 attacker-doll composites 0 px", () => {
    const w = readFileSync("tools/integration/fixtures/stf115/rung2-windows-patched.txt", "utf8");
    expect(w).toContain("TOTAL all            windows=66 live=59 live-0px=59 r1==r2=66 lend==ROM=66");
    const att = readFileSync("tools/integration/fixtures/stf115/rung2-attdoll.txt", "utf8");
    expect(att).toContain("TOTAL attacker-doll swap windows=6 presented-0px-every-row(+k1,k2)=6");
    const rows = att.split("\n").filter((l) => l.startsWith("stf115-"));
    expect(rows).toHaveLength(6);
    expect(rows.map((l) => /rows=(\d+)/.exec(l)![1])).toEqual(rows.map((l) => (l.includes(" player ") ? "197" : "193")));
    const receipt = JSON.parse(readFileSync("tools/integration/fixtures/sdl119-live-receipt.json", "utf8"));
    expect(receipt.rung2.defenderDollWindows).toEqual({ live: 5, zeroPx: 5 });
    expect(receipt.rung2.attackerDollWindows).toMatchObject({ live: 6, zeroPx: 6, compositeRows: { player: 197, opponent: 193 } });
    expect(receipt.rung1.dollFreeLiveWindows).toEqual({ live: 54, zeroPx: 54 });
  });
});
