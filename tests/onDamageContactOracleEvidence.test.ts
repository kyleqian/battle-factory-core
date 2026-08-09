import { describe, expect, it } from "vitest";
import parameterization from "../src/data/gen/level50-move-parameterization.json" with { type: "json" };
import fixture from "../tools/battle-lab/mechanic-on-damage-static-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/on-damage-static-off.json" with { type: "json" };

type RouteStep = { mnemonic: string; operands: string[] };
type ContactWitness = {
  move: string;
  status: string;
  familyEvidence: {
    category: string;
    selector: { guard: string; derivedFrom: string };
    entryPath: {
      graph: { route: RouteStep[] };
      program: { route: RouteStep[] };
      dataHpUpdate: { mnemonic: string; operands: string[] };
      moveEnd: { state: string; stateValue: number };
      alternatives?: Array<{ kind: string }>;
    };
    runtimeGuardSignature: {
      orderedAbilityGuards: string[];
      dataHpUpdate: { writes: string[] };
    };
    familyVerification: {
      oracleReceipt: string;
      oracleReceiptFiles: string[];
      abilityOutcomes: string[];
      scopeBoundary: string;
    };
  };
};

const audit = (parameterization as any).coverage.hookCatalogs.ability.onDamage as {
  contact: {
    status: string;
    candidateCount: number;
    sourceProvenRows: string[];
    sourceExceptionRows: unknown[];
    blockers: unknown[];
    routeWitnesses: ContactWitness[];
  };
};

describe("shared ON_DAMAGE contact dispatcher arm", () => {
  it("keeps all finite contact routes on positive damage and the Static receipt live", () => {
    expect(audit.contact).toMatchObject({
      status: "source-proven-family",
      candidateCount: 94,
      sourceProvenRows: expect.any(Array),
      sourceExceptionRows: [],
      blockers: [],
    });
    expect(audit.contact.sourceProvenRows).toHaveLength(94);
    expect(audit.contact.routeWitnesses).toHaveLength(94);

    for (const witness of audit.contact.routeWitnesses) {
      expect(witness.status, witness.move).toBe("source-proven");
      expect(audit.contact.sourceProvenRows).toContain(witness.move);
      const family = witness.familyEvidence;
      expect(family.category, witness.move).toBe("moveend-contact-on-damage");
      expect(family.selector).toEqual({
        path: "src/data/gen/moves.json",
        locator: `moves:${witness.move}.flags`,
        symbol: witness.move,
        guard: "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)",
        derivedFrom: "moveend-contact-on-damage candidate selector moves.json flags includes FLAG_MAKES_CONTACT",
      });
      expect(family.entryPath.graph.route, witness.move).toEqual(family.entryPath.program.route);
      expect(family.entryPath.graph.route, witness.move).toEqual(expect.arrayContaining([
        expect.objectContaining({ mnemonic: "datahpupdate", operands: ["BS_TARGET"] }),
      ]));
      expect(family.entryPath.dataHpUpdate).toEqual({
        label: expect.any(String),
        line: expect.any(Number),
        mnemonic: "datahpupdate",
        operands: ["BS_TARGET"],
      });
      expect(family.entryPath.moveEnd).toMatchObject({ state: "MOVEEND_ON_DAMAGE_ABILITIES", stateValue: 3 });
      expect(family.runtimeGuardSignature.orderedAbilityGuards).toEqual(expect.arrayContaining([
        "TARGET_TURN_DAMAGED",
        "(gBattleMoves[move].flags & FLAG_MAKES_CONTACT)",
      ]));
      expect(family.runtimeGuardSignature.dataHpUpdate.writes).toEqual(expect.arrayContaining([
        "gSpecialStatuses[gActiveBattler].physicalDmg = gHpDealt",
        "gSpecialStatuses[gActiveBattler].specialDmg = gHpDealt",
      ]));
      expect(family.familyVerification.oracleReceipt).toBe(
        "tests/onDamageContactOracleEvidence.test.ts#shared ON_DAMAGE contact dispatcher arm",
      );
      expect(family.familyVerification.oracleReceiptFiles).toEqual([
        "tools/probe/receipts/on-damage-static-off.json",
      ]);
      if (witness.move === "MOVE_BIDE") {
        expect(family.entryPath.alternatives).toEqual(expect.arrayContaining([
          expect.objectContaining({ kind: "bide-charge-no-damage" }),
        ]));
      }
      expect(witness.move).not.toBe("MOVE_FUTURE_SIGHT");
    }

    expect((fixture as any)).toMatchObject({
      schemaVersion: 1,
      mode: "mechanicLab",
      profile: "battle-scene-off",
      overrides: { parties: { player: expect.any(Array), opponent: expect.any(Array) } },
    });
    expect((receipt as any).oracle).toMatchObject({
      profile: "battle-scene-off",
      procRollPosition: 5,
      procFired: true,
      attackerStatus1: 64,
      attackerStatus: "paralysis",
      targetHp: 61,
    });
    expect((receipt as any).oracle.randFrames).toEqual([
      { frame: 42, count: 1 },
      { frame: 64, count: 1 },
      { frame: 67, count: 1 },
      { frame: 195, count: 1 },
      { frame: 198, count: 1 },
    ]);
  });

  it("keeps the five non-Static contact outcome receipt gaps explicit", () => {
    const family = audit.contact.routeWitnesses[0]!.familyEvidence.familyVerification;
    expect(family.abilityOutcomes).toEqual(expect.arrayContaining([
      expect.stringContaining("ABILITY_ROUGH_SKIN"),
      expect.stringContaining("ABILITY_EFFECT_SPORE"),
      expect.stringContaining("ABILITY_POISON_POINT"),
      expect.stringContaining("ABILITY_STATIC"),
      expect.stringContaining("ABILITY_FLAME_BODY"),
      expect.stringContaining("ABILITY_CUTE_CHARM"),
    ]));
    expect(family.abilityOutcomes).toHaveLength(6);
    expect(family.abilityOutcomes.filter((outcome) => !outcome.includes("ABILITY_STATIC"))).toHaveLength(5);
    expect(family.scopeBoundary).toMatch(/No per-move oracle receipts are authored/);
    expect(family.scopeBoundary).toMatch(/distinct ability outcome gaps remain visible/);
  });
});
