import { describe, expect, it } from "vitest";
import battleMessages from "../src/data/gen/battle-message-templates.json" with { type: "json" };
import speciesNames from "../src/data/gen/species-names.json" with { type: "json" };
import moves from "../src/data/gen/moves.json" with { type: "json" };

const bySymbol = new Map(battleMessages.stringTable.map((e) => [e.symbol, e]));
const byToken = new Map(battleMessages.placeholders.map((p) => [p.token, p.id]));
const speciesByName = new Map((speciesNames.species as { species: string; name: string }[]).map((s) => [s.species, s.name]));
const moveByName = new Map((moves.moves as { move: string; name: string }[]).map((m) => [m.move, m.name]));

describe("battle-message-templates.json (S7 groundwork item 4: battle-message TEMPLATE system)", () => {
  it("pins the two turn-1 'used move' strings against docs/battle-turn-notes.md's cited captures", () => {
    // STRINGID_USEDMOVE backs both "ONIX used ROCK SLIDE!" (tick ~2182+) and
    // "GROVYLE used DOUBLE TEAM!" (tick ~1928-2173) - the trace's own two
    // move-use prints, cross-checked against tools/compare/traces-groundtruth/
    // battle1-turn1.json's frame-boundary table (docs/battle-turn-notes.md §2).
    expect(battleMessages.usedMove.template).toBe("{B_ATK_NAME_WITH_PREFIX} used\\n{B_BUFF2}");
    expect(battleMessages.usedMove.segments).toEqual([
      { type: "placeholder", token: "B_ATK_NAME_WITH_PREFIX" },
      { type: "text", value: " used" },
      { type: "linebreak", code: "\\n" },
      { type: "placeholder", token: "B_BUFF2" },
    ]);
    // The attacker name resolves to the plain species name for both battlers
    // this turn (Battle Factory rentals/opponent mons are never nicknamed):
    // "ONIX" and "GROVYLE" both match the on-screen text these captures show.
    expect(speciesByName.get("SPECIES_ONIX")).toBe("ONIX");
    expect(speciesByName.get("SPECIES_GROVYLE")).toBe("GROVYLE");
    expect(moveByName.get("MOVE_ROCK_SLIDE")).toBe("ROCK SLIDE");
    expect(moveByName.get("MOVE_DOUBLE_TEAM")).toBe("DOUBLE TEAM");
  });

  it("pins the DOUBLE_TEAM evasiveness-rose string turn 1 actually renders", () => {
    // "GROVYLE's evasiveness rose!" = STRINGID_DEFENDERSSTATROSE (B_BUFF1 =
    // gStatNamesTable[STAT_EVASION], B_BUFF2 = STRINGID_STATROSE's "rose!"
    // text) - the same stat-stage change RAM-confirmed in this dossier's §7
    // item 2 (gBattleMons[1].statStages[STAT_EVASION] 6->7 at tick 1959).
    const defenderStatRose = bySymbol.get("STRINGID_DEFENDERSSTATROSE")!;
    expect(defenderStatRose.template).toBe("{B_DEF_NAME_WITH_PREFIX}’s {B_BUFF1}\\n{B_BUFF2}");
    expect(bySymbol.get("STRINGID_STATROSE")!.template).toBe("rose!");
    const evasion = battleMessages.statNames.find((s) => s.stat === "STAT_EVASION");
    expect(evasion?.name).toBe("evasiveness");
  });

  it("covers the standard variant families the brief named", () => {
    expect(bySymbol.get("STRINGID_SUPEREFFECTIVE")!.template).toBe("It’s super effective!");
    expect(bySymbol.get("STRINGID_NOTVERYEFFECTIVE")!.template).toBe("It’s not very effective…");
    expect(bySymbol.get("STRINGID_CRITICALHIT")!.template).toBe("A critical hit!");
    expect(bySymbol.get("STRINGID_ATTACKMISSED")!.template).toBe("{B_ATK_NAME_WITH_PREFIX}’s\\nattack missed!");
    expect(bySymbol.get("STRINGID_PKMNFLINCHED")!.template).toBe("{B_ATK_NAME_WITH_PREFIX} flinched!");
    expect(bySymbol.get("STRINGID_ATTACKERFAINTED")!.template).toBe("{B_ATK_NAME_WITH_PREFIX}\\nfainted!\\p");
    expect(bySymbol.get("STRINGID_TARGETFAINTED")!.template).toBe("{B_DEF_NAME_WITH_PREFIX}\\nfainted!\\p");
    expect(bySymbol.get("STRINGID_ATTACKERSSTATFELL")!.template).toBe("{B_ATK_NAME_WITH_PREFIX}’s {B_BUFF1}\\n{B_BUFF2}");
    expect(bySymbol.get("STRINGID_STATFELL")!.template).toBe("fell!");
  });

  it("resolves every placeholder token referenced by the pinned templates", () => {
    const usedTokens = new Set<string>();
    for (const e of [battleMessages.usedMove, ...battleMessages.stringTable]) {
      for (const seg of e.segments) if (seg.type === "placeholder") usedTokens.add(seg.token as string);
    }
    expect(usedTokens.size).toBeGreaterThan(10);
    for (const token of usedTokens) expect(byToken.has(token)).toBe(true);
  });

  it("covers all 365 non-externally-defined gBattleStringsTable entries with no gaps in the extraction", () => {
    expect(battleMessages.stringTable).toHaveLength(365);
    for (const e of battleMessages.stringTable) {
      expect(e.template).toEqual(expect.any(String));
      expect(Array.isArray(e.segments)).toBe(true);
    }
  });
});
