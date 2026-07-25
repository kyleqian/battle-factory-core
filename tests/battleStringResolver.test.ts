import { describe, expect, it } from "vitest";
import {
  resolveBattleNameWithPrefix,
  resolveBattleStringLines,
} from "../src/engine/battleStringResolver.ts";

describe("battleStringResolver (S10 presentation-seam checkpoint, gap 5)", () => {
  it("resolves STRINGID_TARGETFAINTED for GROVYLE (opponent, trainer battle) to the turn5-faint.json window's own pixel-confirmed text", () => {
    // Ground truth, not guessed: docs/battle-turn-notes.md §24's own
    // pixel-confirmed dossier text for turn5-faint.json (110/110), the same
    // literal battleScene.ts's own (now-deleted) TURN5_FAINTED_LINE1/2
    // hardcoded before this rung.
    const lines = resolveBattleStringLines("STRINGID_TARGETFAINTED", {
      B_DEF_NAME_WITH_PREFIX: () =>
        resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: "GROVYLE" }),
    });
    expect(lines).toEqual(["Foe GROVYLE", "fainted!"]);
  });

  it("resolveBattleNameWithPrefix: player side never gets a prefix (source HANDLE_NICKNAME_STRING_CASE)", () => {
    expect(resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: "ONIX" })).toBe("ONIX");
  });

  it("resolveBattleNameWithPrefix: opponent side in a non-trainer (wild) battle gets 'Wild ' instead of 'Foe '", () => {
    expect(resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: false, nickname: "ZIGZAGOON" })).toBe(
      "Wild ZIGZAGOON",
    );
  });

  it("throws on an unknown messageId rather than guessing", () => {
    expect(() => resolveBattleStringLines("STRINGID_NOT_A_REAL_SYMBOL")).toThrow(/unknown battle string id/);
  });

  it("throws when a referenced placeholder has no resolver supplied", () => {
    expect(() => resolveBattleStringLines("STRINGID_TARGETFAINTED", {})).toThrow(
      /references placeholder \{B_DEF_NAME_WITH_PREFIX\}/,
    );
  });

  it("STRINGID_ATTACKERFAINTED (the attacker-side sibling) resolves with no prefix when the attacker is the player", () => {
    const lines = resolveBattleStringLines("STRINGID_ATTACKERFAINTED", {
      B_ATK_NAME_WITH_PREFIX: () =>
        resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: "ONIX" }),
    });
    expect(lines).toEqual(["ONIX", "fainted!"]);
  });
});
