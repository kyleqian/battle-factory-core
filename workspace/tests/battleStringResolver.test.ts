import { describe, expect, it } from "vitest";
import {
  battleStringPrintableLength,
  battleStringVisibleCharacters,
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

  // docs/presentation-seam-scout.md §12.2/§12.3 step 3: the extractor used to
  // carry battle_message.c's raw straight ASCII apostrophe into the template
  // JSON instead of decoding it to the curly glyph (U+2019) charmap.txt
  // aliases it to (the byte the font actually renders). Pins the fix at the
  // resolver layer so a regression shows up here, not just in the extractor.
  it("STRINGID_DEFENDERSSTATFELL resolves with the curly apostrophe glyph, matching turn6-statfall.json's pixel-confirmed \"ONIX’s ATTACK harshly fell!\" capture", () => {
    const lines = resolveBattleStringLines("STRINGID_DEFENDERSSTATFELL", {
      B_DEF_NAME_WITH_PREFIX: () =>
        resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: "ONIX" }),
      B_BUFF1: () => "ATTACK",
      B_BUFF2: () => "harshly fell!",
    });
    expect(lines).toEqual(["ONIX’s ATTACK", "harshly fell!"]);
    expect(lines[0]).not.toContain("'");
  });

  it("STRINGID_ATTACKMISSED (a second swept template) resolves with the curly apostrophe glyph too, not just STRINGID_DEFENDERSSTATFELL", () => {
    const lines = resolveBattleStringLines("STRINGID_ATTACKMISSED", {
      B_ATK_NAME_WITH_PREFIX: () =>
        resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: "GROVYLE" }),
    });
    expect(lines).toEqual(["Foe GROVYLE’s", "attack missed!"]);
    expect(lines[0]).not.toContain("'");
  });

  it("uses a command-relative one-glyph-per-frame clock with free line breaks", () => {
    const lines = ["ONIX used", "ROCK SLIDE!"];
    expect(battleStringPrintableLength(lines)).toBe(20);
    expect(battleStringVisibleCharacters(lines, -1)).toBe(0);
    expect(battleStringVisibleCharacters(lines, 0)).toBe(1);
    expect(battleStringVisibleCharacters(lines, 18)).toBe(19);
    expect(battleStringVisibleCharacters(lines, 19)).toBe(20);
    expect(battleStringVisibleCharacters(lines, 200)).toBe(20);
  });
});
