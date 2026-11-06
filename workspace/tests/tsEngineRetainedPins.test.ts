// TS-only pins kept from the Rust<->TS parity tests deleted in cln241 (docs/cln241-core-rs-removal.md).
// Every assertion here was asserted against the TS engine with a literal in a *Parity test; the wasm half is gone.
import { describe, expect, it } from "vitest";
import { advanceRngValue } from "../src/engine/rng.ts";
import { randomU16 } from "../src/engine/opponentGen.ts";
import { generateInitialFactoryRentals } from "../src/engine/factoryRentalGeneration.ts";
import { generateFactoryTrainerSchedule } from "../src/engine/factoryTrainerSchedule.ts";
import { createFactoryCorpusPartyMember, type FactoryCorpusPartyInstance } from "../src/engine/factoryCorpusParty.ts";
import { firstMoveIdWithEffect } from "../src/engine/factoryAiCheckBadMove.ts";
import { runCheckViability, type FactoryAiCheckViabilityBattler } from "../src/engine/factoryAiCheckViability.ts";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { natureFromPersonality } from "../src/engine/opponentGen.ts";

const PLAYER_TRAINER_ID = 0x1234_5678;

describe("rng (rngEngineParity)", () => {
  it("wraps advanceRngValue(0xffffffff) to 0xbe3a1206", () => {
    expect(advanceRngValue(0xffffffff) >>> 0).toBe(0xbe3a1206);
  });

  it("randomU16 from the anchor seed returns the advanced value and its upper 16 bits", () => {
    const result = randomU16(0xd2ddeec8);
    expect(result.rngValue >>> 0).toBe(0xddeffb9b);
    expect(result.value).toBe(0xddef);
  });
});

describe("factory rental generation (factoryRentalParity)", () => {
  it("factoryWinStreak 56 (challengeNum 8) takes the random-IV overread: 305 draws, 12 IV words", () => {
    const ts = generateInitialFactoryRentals({
      rngValue: 0,
      factoryWinStreak: 56,
      rentsCount: 0,
      playerTrainerId: PLAYER_TRAINER_ID,
    });
    expect(ts.challengeNum).toBe(8);
    expect(ts.drawLedger).toHaveLength(305);
    expect(ts.drawLedger.filter((draw) => draw.phase === "random-ivs")).toHaveLength(12);
    const words = ts.drawLedger
      .filter((draw) => draw.phase === "random-ivs" && draw.rentalIndex === 0)
      .map((draw) => draw.randomU16);
    expect(words).toEqual([41_538, 34_362]);
    expect(ts.rentals[0]!.ivs).toEqual({ hp: 2, attack: 18, defense: 8, speed: 26, spAttack: 17, spDefense: 1 });
    expect(ts.rentals[0]!.fixedIv).toBe(18);
  });
});

describe("factory trainer schedule (factoryTrainerScheduleParity)", () => {
  it("seed 31 at streak 0 rejects duplicates on battles 1 and 5 and spends 9 draws", () => {
    const retry = generateFactoryTrainerSchedule(0, 31);
    expect(retry.drawCount).toBe(9);
    expect(retry.ledger.filter((draw) => !draw.accepted).map((draw) => draw.battleIndex)).toEqual([1, 5]);
    expect(retry.storedTrainerIds).toEqual(retry.trainerIds.slice(0, 6));
  });
});

describe("factory corpus party member (factoryPartyMemberParity)", () => {
  const FRONTIER_MONS = (frontierMonsData as unknown as { entries: { nature: string }[] }).entries;
  const natureIndexByName = new Map(
    (naturesData as { natures: { index: number; name: string }[] }).natures.map((row) => [row.name, row.index]),
  );
  function personalityForSet(setId: number): number {
    const target = natureIndexByName.get(FRONTIER_MONS[setId]!.nature)!;
    let personality = (setId * 2654435761) >>> 0;
    while (natureFromPersonality(personality) !== target) personality = (personality + 1) >>> 0;
    return personality;
  }

  it("rejects an out-of-range set id, a nature-mismatched personality and fixedIv 32 with the source messages", () => {
    const base: FactoryCorpusPartyInstance = { setId: 110, personality: 813_709_149, fixedIv: 3, abilitySlot: 0, otId: 0 };
    expect(() => createFactoryCorpusPartyMember({ ...base, setId: 882, personality: 0 })).toThrow(
      "Frontier set id must be in 0..881, got 882",
    );
    expect(() => createFactoryCorpusPartyMember({ ...base, personality: 0 })).toThrow(
      "Frontier set 110 requires nature 24, personality 0 derives 0",
    );
    expect(() => createFactoryCorpusPartyMember({ ...base, fixedIv: 32 })).toThrow(
      "uniform IV must be an integer in 0..31, got 32",
    );
  });

  it("a uniform six-IV spread builds the same member as the bare fixedIv; a disagreeing spread is rejected", () => {
    const personality = personalityForSet(110);
    const bare: FactoryCorpusPartyInstance = {
      setId: 110, personality, fixedIv: 8, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID,
    };
    const spread: FactoryCorpusPartyInstance = {
      ...bare,
      ivs: { hp: 8, attack: 8, defense: 8, speed: 8, spAttack: 8, spDefense: 8 },
    };
    expect(createFactoryCorpusPartyMember(spread)).toEqual(createFactoryCorpusPartyMember(bare));
    expect(() =>
      createFactoryCorpusPartyMember({
        ...bare,
        fixedIv: 5,
        ivs: { hp: 3, attack: 10, defense: 23, speed: 24, spAttack: 3, spDefense: 28 },
      }),
    ).toThrow("instance ivs.attack 10 must equal fixedIv 5");
  });
});

describe("AI_CheckViability receipts (factoryAiCheckViabilityParity)", () => {
  type Input = Parameters<typeof runCheckViability>[0];

  function moveIdForEffect(effect: string): number {
    const moveId = firstMoveIdWithEffect(effect);
    if (moveId === undefined) throw new Error(`no real Gen-3 move for ${effect}`);
    return moveId;
  }

  function baseBattler(overrides: Partial<FactoryAiCheckViabilityBattler> = {}): FactoryAiCheckViabilityBattler {
    return {
      speed: 100,
      speedStage: 6,
      types: ["TYPE_NORMAL", "TYPE_NORMAL"],
      isFirstTurn: 0,
      evasionStage: 6,
      accStage: 6,
      atkStage: 6,
      defStage: 6,
      spDefStage: 6,
      hp: 100,
      maxHp: 100,
      ...overrides,
    };
  }

  function baseInput(
    moveId: number,
    attacker: FactoryAiCheckViabilityBattler = baseBattler(),
    target: FactoryAiCheckViabilityBattler = baseBattler(),
    overrides: Partial<Omit<Input, "moveId" | "attacker" | "target">> = {},
  ): Input {
    return {
      rng: { value: 249_678_687, calls: 0 },
      moveId,
      attacker,
      target,
      drawOrdinalStart: 1,
      reasonPrefix: "cv-parity",
      ...overrides,
    };
  }

  it("preserves zero draw results and a stale funcResult carry/weather collision", () => {
    const input = baseInput(moveIdForEffect("EFFECT_SUNNY_DAY"), baseBattler({ hp: 100, maxHp: 100 }), baseBattler(), {
      staleFuncResultFallback: 2,
      reasonPrefix: "stale-carry",
    });
    expect(runCheckViability(input)).toMatchObject({ kind: "scored", draws: [], scoreDelta: 1, funcResultAfter: 2 });
  });

  it("carries the proven maximum seven active draws", () => {
    const attacker = baseBattler({ hp: 45, maxHp: 100, evasionStage: 9, isRooted: true });
    const target = baseBattler({ hp: 100, maxHp: 100, isToxicPoisoned: true, isLeechSeeded: true, isCursed: true });
    const moveId = moveIdForEffect("EFFECT_EVASION_UP");
    let found = false;
    for (let seed = 1; seed < 4_096 && !found; seed++) {
      const result = runCheckViability(
        baseInput(moveId, attacker, target, { rng: { value: seed, calls: 0 }, drawOrdinalStart: 91, reasonPrefix: "max-draw" }),
      );
      found = result.kind === "scored" && result.draws.length === 7;
    }
    expect(found, "a deterministic EvasionUp seven-draw path").toBe(true);
  });

  it("keeps Haze's repeated ordinal receipt while RNG snapshots still advance", () => {
    const result = runCheckViability(
      baseInput(moveIdForEffect("EFFECT_HAZE"), baseBattler({ atkStage: 9 }), baseBattler({ defStage: 9 }), {
        rng: { value: 1, calls: 0 },
        drawOrdinalStart: 41,
        reasonPrefix: "haze-repeat",
      }),
    );
    expect(result.kind).toBe("scored");
    if (result.kind === "scored") {
      expect(result.draws).toHaveLength(2);
      expect(result.draws.map((draw) => draw.ordinal)).toEqual([41, 41]);
      expect(result.draws[1].before).toEqual(result.draws[0].after);
    }
  });

  it("keeps SemiInvulnerable5's tie receipt alongside its TryEncourage roll", () => {
    const result = runCheckViability(
      baseInput(19, baseBattler({ speed: 100 }), baseBattler({ speed: 100, lastUsedMoveId: 0 }), {
        rng: { value: 1, calls: 0 },
        drawOrdinalStart: 17,
        reasonPrefix: "semi-drop",
      }),
    );
    expect(result.kind).toBe("scored");
    if (result.kind === "scored") {
      expect(result.rng.calls).toBe(2);
      expect(result.draws).toHaveLength(2);
      expect(result.draws[0]).toMatchObject({ kind: "target-faster-tie", ordinal: 17 });
      expect(result.draws[1]).toMatchObject({ kind: "semi-invulnerable-roll", ordinal: 18 });
    }
  });

  it("throws the source unknown-move error", () => {
    expect(() => runCheckViability(baseInput(9_999))).toThrow("factory-ai-check-viability: unknown move 9999");
  });
});
