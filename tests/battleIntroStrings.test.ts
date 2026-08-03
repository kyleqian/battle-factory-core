import { describe, expect, it } from "vitest";
import {
  BATTLE_INTRO_STRINGS,
  type BattleIntroStringEntry,
} from "../src/data/battleIntroStrings.ts";

/**
 * Pins `src/data/battleIntroStrings.ts`'s hand-mapped STRINGID 0/1/2/5 table
 * (`docs/issue70-stringid-reachability.md` §3's `STRINGID_INTROSENDOUT` gap)
 * against `reference/pokeemerald/src/battle_message.c`'s own switch arms and
 * `sText_*` literals, the same way the `STRINGID_SWITCHINMON` precedent's
 * hand-derived English strings are pinned by direct equality elsewhere in
 * this suite. Every expectation below cites the exact file:line the table's
 * own `source` field also carries, so the two stay re-verifiable against
 * each other, not just internally self-consistent.
 */

function findEntry(id: BattleIntroStringEntry["id"], cSymbol: string): BattleIntroStringEntry {
  const entry = BATTLE_INTRO_STRINGS.find((e) => e.id === id && e.source.cSymbol === cSymbol);
  if (!entry) throw new Error(`no BATTLE_INTRO_STRINGS entry for id ${id} / ${cSymbol}`);
  return entry;
}

describe("battleIntroStrings: table shape and coverage", () => {
  it("has exactly 11 entries: 1 (INTROMSG) + 2 (INTROSENDOUT) + 5 (RETURNMON) + 3 (BATTLEEND)", () => {
    expect(BATTLE_INTRO_STRINGS).toHaveLength(11);
    expect(BATTLE_INTRO_STRINGS.filter((e) => e.id === 0)).toHaveLength(1);
    expect(BATTLE_INTRO_STRINGS.filter((e) => e.id === 1)).toHaveLength(2);
    expect(BATTLE_INTRO_STRINGS.filter((e) => e.id === 2)).toHaveLength(5);
    expect(BATTLE_INTRO_STRINGS.filter((e) => e.id === 5)).toHaveLength(3);
  });

  it("every entry's symbol matches its numeric id (battle_string_ids.h:4-9)", () => {
    const bySymbol: Record<number, string> = {
      0: "STRINGID_INTROMSG",
      1: "STRINGID_INTROSENDOUT",
      2: "STRINGID_RETURNMON",
      5: "STRINGID_BATTLEEND",
    };
    for (const entry of BATTLE_INTRO_STRINGS) {
      expect(entry.symbol, `id ${entry.id}`).toBe(bySymbol[entry.id]);
    }
  });

  it("every entry's segments reconstruct its own template string verbatim (text/placeholder/linebreak concatenation)", () => {
    for (const entry of BATTLE_INTRO_STRINGS) {
      const rebuilt = entry.segments
        .map((segment) => {
          if (segment.type === "text") return segment.value;
          if (segment.type === "placeholder") return `{${segment.token}}`;
          return segment.code;
        })
        .join("");
      expect(rebuilt, `${entry.source.cSymbol} segments`).toBe(entry.template);
    }
  });

  it("every entry's source.branchLine/literalLine cite reference/pokeemerald/src/battle_message.c", () => {
    for (const entry of BATTLE_INTRO_STRINGS) {
      expect(entry.source.branchLine).toMatch(/^reference\/pokeemerald\/src\/battle_message\.c:\d+$/);
      expect(entry.source.literalLine).toMatch(/^reference\/pokeemerald\/src\/battle_message\.c:\d+$/);
    }
  });
});

describe("STRINGID_INTROMSG (id 0) -- battle_message.c:1986 case, :2019 branch", () => {
  it("Trainer1WantsToBattle: '{B_TRAINER1_CLASS} {B_TRAINER1_NAME}\\nwould like to battle!\\p' (:385)", () => {
    const entry = findEntry(0, "sText_Trainer1WantsToBattle");
    expect(entry.template).toBe("{B_TRAINER1_CLASS} {B_TRAINER1_NAME}\\nwould like to battle!\\p");
    expect(entry.segments).toEqual([
      { type: "placeholder", token: "B_TRAINER1_CLASS" },
      { type: "text", value: " " },
      { type: "placeholder", token: "B_TRAINER1_NAME" },
      { type: "linebreak", code: "\\n" },
      { type: "text", value: "would like to battle!" },
      { type: "linebreak", code: "\\p" },
    ]);
    expect(entry.source).toEqual({
      branchLine: "reference/pokeemerald/src/battle_message.c:2019",
      literalLine: "reference/pokeemerald/src/battle_message.c:385",
      cSymbol: "sText_Trainer1WantsToBattle",
    });
  });
});

describe("STRINGID_INTROSENDOUT (id 1) -- battle_message.c:2034 case, the ISSUES #70 gap", () => {
  it("GoPkmn (player send-out): 'Go! {B_PLAYER_MON1_NAME}!' (:2050 branch, :396 literal)", () => {
    const entry = findEntry(1, "sText_GoPkmn");
    expect(entry.template).toBe("Go! {B_PLAYER_MON1_NAME}!");
    expect(entry.segments).toEqual([
      { type: "text", value: "Go! " },
      { type: "placeholder", token: "B_PLAYER_MON1_NAME" },
      { type: "text", value: "!" },
    ]);
    expect(entry.source).toEqual({
      branchLine: "reference/pokeemerald/src/battle_message.c:2050",
      literalLine: "reference/pokeemerald/src/battle_message.c:396",
      cSymbol: "sText_GoPkmn",
    });
  });

  it("Trainer1SentOutPkmn (opponent send-out): '{B_TRAINER1_CLASS} {B_TRAINER1_NAME} sent\\nout {B_OPPONENT_MON1_NAME}!' (:2071 branch, :388 literal)", () => {
    const entry = findEntry(1, "sText_Trainer1SentOutPkmn");
    expect(entry.template).toBe("{B_TRAINER1_CLASS} {B_TRAINER1_NAME} sent\\nout {B_OPPONENT_MON1_NAME}!");
    expect(entry.segments).toEqual([
      { type: "placeholder", token: "B_TRAINER1_CLASS" },
      { type: "text", value: " " },
      { type: "placeholder", token: "B_TRAINER1_NAME" },
      { type: "text", value: " sent" },
      { type: "linebreak", code: "\\n" },
      { type: "text", value: "out " },
      { type: "placeholder", token: "B_OPPONENT_MON1_NAME" },
      { type: "text", value: "!" },
    ]);
    expect(entry.source).toEqual({
      branchLine: "reference/pokeemerald/src/battle_message.c:2071",
      literalLine: "reference/pokeemerald/src/battle_message.c:388",
      cSymbol: "sText_Trainer1SentOutPkmn",
    });
  });
});

describe("STRINGID_RETURNMON (id 2) -- battle_message.c:2079 case", () => {
  it("PkmnThatsEnough (hpScale 0): '{B_BUFF1}, that\u2019s enough!\\nCome back!' (:2083 branch, :403 literal)", () => {
    const entry = findEntry(2, "sText_PkmnThatsEnough");
    expect(entry.template).toBe("{B_BUFF1}, that\u2019s enough!\\nCome back!");
    expect(entry.segments).toEqual([
      { type: "placeholder", token: "B_BUFF1" },
      { type: "text", value: ", that\u2019s enough!" },
      { type: "linebreak", code: "\\n" },
      { type: "text", value: "Come back!" },
    ]);
    expect(entry.source.branchLine).toBe("reference/pokeemerald/src/battle_message.c:2083");
    expect(entry.source.literalLine).toBe("reference/pokeemerald/src/battle_message.c:403");
  });

  it("PkmnComeBack (hpScale 1): '{B_BUFF1}, come back!' (:2085 branch, :404 literal)", () => {
    const entry = findEntry(2, "sText_PkmnComeBack");
    expect(entry.template).toBe("{B_BUFF1}, come back!");
    expect(entry.segments).toEqual([
      { type: "placeholder", token: "B_BUFF1" },
      { type: "text", value: ", come back!" },
    ]);
    expect(entry.source.branchLine).toBe("reference/pokeemerald/src/battle_message.c:2085");
    expect(entry.source.literalLine).toBe("reference/pokeemerald/src/battle_message.c:404");
  });

  it("PkmnOkComeBack (hpScale 2): '{B_BUFF1}, OK!\\nCome back!' (:2087 branch, :405 literal)", () => {
    const entry = findEntry(2, "sText_PkmnOkComeBack");
    expect(entry.template).toBe("{B_BUFF1}, OK!\\nCome back!");
    expect(entry.segments).toEqual([
      { type: "placeholder", token: "B_BUFF1" },
      { type: "text", value: ", OK!" },
      { type: "linebreak", code: "\\n" },
      { type: "text", value: "Come back!" },
    ]);
    expect(entry.source.branchLine).toBe("reference/pokeemerald/src/battle_message.c:2087");
    expect(entry.source.literalLine).toBe("reference/pokeemerald/src/battle_message.c:405");
  });

  it("PkmnGoodComeBack (hpScale 3, else arm): '{B_BUFF1}, good!\\nCome back!' (:2089 branch, :406 literal)", () => {
    const entry = findEntry(2, "sText_PkmnGoodComeBack");
    expect(entry.template).toBe("{B_BUFF1}, good!\\nCome back!");
    expect(entry.segments).toEqual([
      { type: "placeholder", token: "B_BUFF1" },
      { type: "text", value: ", good!" },
      { type: "linebreak", code: "\\n" },
      { type: "text", value: "Come back!" },
    ]);
    expect(entry.source.branchLine).toBe("reference/pokeemerald/src/battle_message.c:2089");
    expect(entry.source.literalLine).toBe("reference/pokeemerald/src/battle_message.c:406");
  });

  it("Trainer1WithdrewPkmn (opponent side): '{B_TRAINER1_CLASS} {B_TRAINER1_NAME}\\nwithdrew {B_BUFF1}!' (:2102 branch, :407 literal)", () => {
    const entry = findEntry(2, "sText_Trainer1WithdrewPkmn");
    expect(entry.template).toBe("{B_TRAINER1_CLASS} {B_TRAINER1_NAME}\\nwithdrew {B_BUFF1}!");
    expect(entry.segments).toEqual([
      { type: "placeholder", token: "B_TRAINER1_CLASS" },
      { type: "text", value: " " },
      { type: "placeholder", token: "B_TRAINER1_NAME" },
      { type: "linebreak", code: "\\n" },
      { type: "text", value: "withdrew " },
      { type: "placeholder", token: "B_BUFF1" },
      { type: "text", value: "!" },
    ]);
    expect(entry.source.branchLine).toBe("reference/pokeemerald/src/battle_message.c:2102");
    expect(entry.source.literalLine).toBe("reference/pokeemerald/src/battle_message.c:407");
  });
});

describe("STRINGID_BATTLEEND (id 5) -- battle_message.c:2166 case, the final non-multi/non-Union-Room else arm", () => {
  it("PlayerDefeatedLinkTrainer (B_OUTCOME_WON): 'Player defeated\\n{B_LINK_OPPONENT1_NAME}!' (:2223 branch, :322 literal)", () => {
    const entry = findEntry(5, "sText_PlayerDefeatedLinkTrainer");
    expect(entry.template).toBe("Player defeated\\n{B_LINK_OPPONENT1_NAME}!");
    expect(entry.segments).toEqual([
      { type: "text", value: "Player defeated" },
      { type: "linebreak", code: "\\n" },
      { type: "placeholder", token: "B_LINK_OPPONENT1_NAME" },
      { type: "text", value: "!" },
    ]);
    expect(entry.source.branchLine).toBe("reference/pokeemerald/src/battle_message.c:2223");
    expect(entry.source.literalLine).toBe("reference/pokeemerald/src/battle_message.c:322");
  });

  it("PlayerLostAgainstLinkTrainer (B_OUTCOME_LOST): 'Player lost against\\n{B_LINK_OPPONENT1_NAME}!' (:2226 branch, :324 literal)", () => {
    const entry = findEntry(5, "sText_PlayerLostAgainstLinkTrainer");
    expect(entry.template).toBe("Player lost against\\n{B_LINK_OPPONENT1_NAME}!");
    expect(entry.segments).toEqual([
      { type: "text", value: "Player lost against" },
      { type: "linebreak", code: "\\n" },
      { type: "placeholder", token: "B_LINK_OPPONENT1_NAME" },
      { type: "text", value: "!" },
    ]);
    expect(entry.source.branchLine).toBe("reference/pokeemerald/src/battle_message.c:2226");
    expect(entry.source.literalLine).toBe("reference/pokeemerald/src/battle_message.c:324");
  });

  it("PlayerBattledToDrawLinkTrainer (B_OUTCOME_DREW): 'Player battled to a draw against\\n{B_LINK_OPPONENT1_NAME}!' (:2229 branch, :326 literal)", () => {
    const entry = findEntry(5, "sText_PlayerBattledToDrawLinkTrainer");
    expect(entry.template).toBe("Player battled to a draw against\\n{B_LINK_OPPONENT1_NAME}!");
    expect(entry.segments).toEqual([
      { type: "text", value: "Player battled to a draw against" },
      { type: "linebreak", code: "\\n" },
      { type: "placeholder", token: "B_LINK_OPPONENT1_NAME" },
      { type: "text", value: "!" },
    ]);
    expect(entry.source.branchLine).toBe("reference/pokeemerald/src/battle_message.c:2229");
    expect(entry.source.literalLine).toBe("reference/pokeemerald/src/battle_message.c:326");
  });
});

describe("placeholder tokens are already recognized by the extracted table (zero-translation wiring claim)", () => {
  it("every {B_...} token used above appears in battle-message-templates.json's own placeholders array", async () => {
    const templatesModule = await import("../src/data/gen/battle-message-templates.json", {
      with: { type: "json" },
    });
    const knownTokens = new Set(
      (templatesModule.default.placeholders as readonly { token: string }[]).map((p) => p.token),
    );
    const usedTokens = new Set(
      BATTLE_INTRO_STRINGS.flatMap((entry) =>
        entry.segments.filter((s) => s.type === "placeholder").map((s) => (s as { token: string }).token)
      ),
    );
    expect(usedTokens.size).toBeGreaterThan(0);
    for (const token of usedTokens) {
      expect(knownTokens.has(token), `${token} should already be a recognized placeholder`).toBe(true);
    }
  });
});

describe("battle_message.c source cross-check: the C literals these entries were parsed from", () => {
  it("re-reads reference/pokeemerald/src/battle_message.c at each cited line and confirms the literal is still there", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      new URL("../reference/pokeemerald/src/battle_message.c", import.meta.url),
      "utf8",
    ).split("\n");
    for (const entry of BATTLE_INTRO_STRINGS) {
      const literalLineNo = Number(entry.source.literalLine.split(":").pop());
      const branchLineNo = Number(entry.source.branchLine.split(":").pop());
      const literalLine = source[literalLineNo - 1] ?? "";
      const branchLine = source[branchLineNo - 1] ?? "";
      expect(literalLine, `${entry.source.cSymbol} literal line`).toContain(entry.source.cSymbol);
      expect(branchLine, `${entry.source.cSymbol} branch line`).toContain(entry.source.cSymbol);
    }
  });
});
