import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "../src/engine/battleResolutionPresentation.ts";
import { createBattleCommandFieldArtView } from "../src/engine/battleCommandFieldArt.ts";
import { renderBattleResolutionLiveView, renderBattleResolutionSceneOffView } from "../src/engine/battleScene.ts";
import { LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS, liveMoveAnimationDuration, liveMoveSubstituteDollDeclines } from "../src/engine/liveMoveAnimation.ts";
import { liveView, type Fixture } from "../tools/integration/liveAdapterFramebuffer.ts";

// doll90 (docs/doll90-doll-cells.md): Substitute-doll residual cells, batch 2. Evidence: tools/integration/fixtures/doll90/ and
// tools/integration/fixtures/doll90-live-receipt.json (0 px through the production renderer, r1 == r2).
const mon = (species: number, battler: 0 | 1, doll = false) => ({
  species, name: "MON", side: battler === 0 ? "player" as const : "trainer" as const, battler, partyIndex: 0 as const, level: 50,
  hp: 100, maxHP: 100, gender: "male" as const, status: "none" as const, moveIds: [0, 0, 0, 0] as const,
  currentPP: [0, 0, 0, 0] as const, ppBonuses: 0, ...(doll ? { substituteDoll: true as const } : {}),
});
const field = (playerDoll: boolean, opponentDoll: boolean): BattleResolutionDisplayedField =>
  ({ player: mon(53, 0, playerDoll), opponent: mon(80, 1, opponentDoll) }) as unknown as BattleResolutionDisplayedField;
const req = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest =>
  ({ moveId, attacker, target: attacker === 0 ? 1 : 0, turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0 }) as BattleMoveAnimationRequest;
const defenderDoll = (attacker: 0 | 1) => (attacker === 0 ? field(false, true) : field(true, false));
const BOTH = ["player", "opponent"];

// The doll81 `def` probes' TEST fixtures (prep38 schema): the DEFENDER is the displayed doll (as prep38Check.ts flags it).
const FIXTURES = "tools/integration/fixtures/doll90/def";
const dollView = (stem: string, age: number) => {
  const f = JSON.parse(readFileSync(`${FIXTURES}/${stem}.json`, "utf8")) as Fixture & { target: { geometry: { side: "player" | "opponent" } } };
  const v = liveView(f, age), side = f.target.geometry.side;
  const doll = { ...v.field, [side]: { ...v.field[side], substituteDoll: true as const } };
  return { side, view: { ...v, field: doll, fieldArt: createBattleCommandFieldArtView(doll) } };
};
// The target battler's box (player 40..104 x 48..112, opponent 144..208 x 8..72 + the doll's lower rows): no Psych Up effect reaches it,
// and its palette bank is not blended (only the attacker's bank and the field BG banks 1..3 are), so at age 0 (no BG blend yet) the live
// body draws the doll exactly as the static Scene OFF field does.
const BOX = { player: [32, 40, 112, 112], opponent: [136, 0, 216, 80] } as const;
const boxDiff = (stem: string, age: number) => {
  const { side, view } = dollView(stem, age);
  const live = new Uint8Array(240 * 160 * 4), off = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(live, view as never);
  renderBattleResolutionSceneOffView(off, view as never);
  const [x0, y0, x1, y1] = BOX[side];
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * 240 + x) * 4;
    if (live[i] !== off[i] || live[i + 1] !== off[i + 1] || live[i + 2] !== off[i + 2]) n++;
  }
  return n;
};

describe("doll90: Substitute-doll residual cells", () => {
  it("defender-doll cell Psych Up 244, both sides, keeps the doll-free duration", () => {
    expect(LIVE_SUBSTITUTE_DOLL_DEFENDER_CELLS.get(244)).toEqual(BOTH);
    for (const a of [0, 1] as const) {
      expect(liveMoveSubstituteDollDeclines(req(244, a), defenderDoll(a))).toBe(false);
      expect(liveMoveAnimationDuration(req(244, a), defenderDoll(a))).toBe(179);
      expect(liveMoveAnimationDuration(req(244, a), defenderDoll(a))).toBe(liveMoveAnimationDuration(req(244, a), field(false, false)));
    }
  });
  it("Psych Up draws the target doll with the doll sheet and gSubstituteDollPal (composeLiveFieldPalettes), both sides", () => {
    // Revert experiments: species art (battleScene.ts artFor without liveSubstituteDollArt) or the species palette bank
    // (composeLiveArtPalettes) each draw species pixels in this box (the doll81 explore residual: ~1.2k..1.9k px per row).
    for (const stem of ["doll90-def-psych-up-player-test", "doll90-def-psych-up-player-gengar-test",
      "doll90-def-psych-up-opponent-test", "doll90-def-psych-up-opponent-golbat-test"]) {
      const { view } = dollView(stem, 0);
      expect(view.effect?.type).toBe("move");
      expect(boxDiff(stem, 0)).toBe(0);
    }
  });
});
