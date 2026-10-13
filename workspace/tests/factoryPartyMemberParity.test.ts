// Differential spec for core-rs/adapter/factoryEngine.ts's
// createFactoryCorpusPartyMember/createFactoryCorpusParty additions: proves
// the TS engine (src/engine/factoryCorpusParty.ts) and the factory-wasm
// engine (fw_create_factory_party_member) agree on Battle Factory
// mon-construction for identical inputs, across the full 882-set corpus —
// not just that either one individually looks right.
//
// Availability rules mirror tests/factoryRentalParity.test.ts (see that
// file's header for the rationale): POKEBENCH_ENGINE=wasm with the artifact
// missing is a hard failure; the artifact merely being absent (no opt-in)
// skips only the wasm-dependent suites via describe.skipIf.
//
// Invocations (from the workspace root):
//   ./core-rs/build-wasm.sh
//   NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryPartyMemberParity.test.ts --no-watch --pool=forks
//   POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryPartyMemberParity.test.ts --no-watch --pool=forks

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../src/data/gen/natures.json" with { type: "json" };
import { defaultEngineId, resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";
import { wasmFactoryEngine, type FactoryEngine } from "../core-rs/adapter/factoryEngine.ts";
import {
  createFactoryCorpusParty,
  createFactoryCorpusPartyMember,
  factoryFacilitySetMoveIds,
  setMonMoveAvoidReturn,
  type FactoryCorpusPartyInstance,
} from "../src/engine/factoryCorpusParty.ts";
import { natureFromPersonality } from "../src/engine/opponentGen.ts";

const requestedEngine = defaultEngineId();
const wasmArtifactPath = resolveWasmArtifactPath();
const wasmAvailable = existsSync(wasmArtifactPath);

if (requestedEngine === "wasm" && !wasmAvailable) {
  throw new Error(
    `POKEBENCH_ENGINE=wasm requires the factory-wasm artifact at ${wasmArtifactPath}, ` +
      `which does not exist. Build it with: core-rs/build-wasm.sh`,
  );
}

let wasmEnginePromise: Promise<FactoryEngine> | undefined;
function getWasmEngine(): Promise<FactoryEngine> {
  wasmEnginePromise ??= wasmFactoryEngine();
  return wasmEnginePromise;
}

const PLAYER_TRAINER_ID = 0x1234_5678;

// --- deterministic personality search -------------------------------------
//
// Each Frontier set requires a personality whose `% NUM_NATURES` matches the
// set's declared nature (natureFromPersonality, mirrored on both engines).
// Starting from a fixed per-set base and incrementing until the nature
// matches converges in at most 25 steps (natureFromPersonality's period),
// fully deterministic — no Date/Math.random.

type FrontierMonRow = Readonly<{ index: number; nature: string }>;
const FRONTIER_MONS = (frontierMonsData as unknown as { entries: FrontierMonRow[] }).entries;

type NatureRow = Readonly<{ index: number; name: string }>;
const NATURE_INDEX_BY_NAME = new Map(
  (naturesData as { natures: NatureRow[] }).natures.map((row) => [row.name, row.index]),
);

function targetNatureForSet(setId: number): number {
  const name = FRONTIER_MONS[setId]!.nature;
  const index = NATURE_INDEX_BY_NAME.get(name);
  if (index === undefined) throw new Error(`unknown nature ${name} for Frontier set ${setId}`);
  return index;
}

function findPersonalityForNature(seedBase: number, targetNature: number): number {
  let personality = seedBase >>> 0;
  while (natureFromPersonality(personality) !== targetNature) {
    personality = (personality + 1) >>> 0;
  }
  return personality;
}

function personalityForSet(setId: number): number {
  const seedBase = (setId * 2654435761) >>> 0;
  return findPersonalityForNature(seedBase, targetNatureForSet(setId));
}

/**
 * `isShiny`'s xor-fold is associative: choosing `otId`'s high halfword 0 and
 * low halfword equal to `personality`'s own xor-fold cancels the whole
 * expression to 0 (< SHINY_ODDS), guaranteeing shiny=true without brute
 * force. Mirrors `isShiny` (`src/engine/factoryCorpusParty.ts:171-176`).
 */
function shinyOtIdFor(personality: number): number {
  return ((personality >>> 16) ^ (personality & 0xffff)) & 0xffff;
}

// --- Part A: full-corpus sweep ---------------------------------------------

describe.skipIf(!wasmAvailable)("Full corpus sweep — ts vs wasm across all 882 Frontier sets", () => {
  it(`[0..${FRONTIER_MONS.length - 1}] every Frontier set constructs identically on both engines`, async () => {
    const engine = await getWasmEngine();
    let compared = 0;
    const avoidReturnDivergent: number[] = [];
    for (let setId = 0; setId < FRONTIER_MONS.length; setId++) {
      const personality = personalityForSet(setId);
      const instance: FactoryCorpusPartyInstance = {
        setId,
        personality,
        fixedIv: 3,
        abilitySlot: (personality & 1) as 0 | 1,
        otId: PLAYER_TRAINER_ID,
      };
      const ts = createFactoryCorpusPartyMember(instance);
      const wasm = engine.createFactoryCorpusPartyMember(instance);
      // ISSUES #165 (ret165): the TS builder applies SetMonMoveAvoidReturn
      // (battle_factory.c:913-919); core-rs's port does not yet. Return and
      // Frustration share PP 20, so the moves list is the only divergence.
      if (wasm.moves.some((move, slot) => move !== ts.moves[slot])) avoidReturnDivergent.push(setId);
      expect(wasm.moves, `setId=${setId}: wasm keeps the raw table moves`).toEqual(factoryFacilitySetMoveIds(setId));
      expect(
        { ...wasm, moves: wasm.moves.map(setMonMoveAvoidReturn) },
        `setId=${setId} personality=${personality}: full-member-state parity`,
      ).toEqual(ts);
      compared++;
    }
    expect(compared).toBe(FRONTIER_MONS.length);
    expect(avoidReturnDivergent).toEqual(
      FRONTIER_MONS.map((_row, setId) => setId).filter((setId) => factoryFacilitySetMoveIds(setId).includes(216)),
    );
  });
});

// --- Part B: variation block on 6 chosen sets ------------------------------
//
// fixedIv {0, 8, 31} x abilitySlot {0, 1} x otId {0, shiny-true pair}: 12
// configs per set x 6 sets = 72 comparisons. Set 110 (SPECIES_GRIMER) is
// dual-ability (abilitySlot actually varies the output ability); set 140
// (SPECIES_LILEEP) is single-ability (abilitySlot is always forced to 0 on
// both engines regardless of the requested slot) -- both branches of the
// ability-slot rule get real coverage here.

const VARIATION_SET_IDS = [0, 6, 110, 140, 155, 500] as const;
const VARIATION_FIXED_IVS = [0, 8, 31] as const;
const VARIATION_ABILITY_SLOTS = [0, 1] as const;

describe.skipIf(!wasmAvailable)("Variation block — fixedIv x abilitySlot x otId on 6 chosen sets", () => {
  for (const setId of VARIATION_SET_IDS) {
    const personality = personalityForSet(setId);
    const otIds = [0, shinyOtIdFor(personality)] as const;
    for (const fixedIv of VARIATION_FIXED_IVS) {
      for (const abilitySlot of VARIATION_ABILITY_SLOTS) {
        for (const otId of otIds) {
          it(
            `setId=${setId} personality=${personality} fixedIv=${fixedIv} abilitySlot=${abilitySlot} otId=${otId}`,
            async () => {
              const engine = await getWasmEngine();
              const instance: FactoryCorpusPartyInstance = { setId, personality, fixedIv, abilitySlot, otId };
              const ts = createFactoryCorpusPartyMember(instance);
              const wasm = engine.createFactoryCorpusPartyMember(instance);
              expect(wasm).toEqual(ts);
            },
          );
        }
      }
    }
  }
});

// --- Part C: error parity ---------------------------------------------------

describe.skipIf(!wasmAvailable)("Error parity — party member construction rejects on both engines", () => {
  it("set id 882 (out of the 0..881 range) rejects on both engines with the same message", async () => {
    const engine = await getWasmEngine();
    const instance: FactoryCorpusPartyInstance = { setId: 882, personality: 0, fixedIv: 3, abilitySlot: 0, otId: 0 };
    const message = "Frontier set id must be in 0..881, got 882";
    expect(() => createFactoryCorpusPartyMember(instance)).toThrow(message);
    expect(() => engine.createFactoryCorpusPartyMember(instance)).toThrow(message);
  });

  it("a nature-mismatched personality rejects on both engines with the same message", async () => {
    const engine = await getWasmEngine();
    const instance: FactoryCorpusPartyInstance = { setId: 110, personality: 0, fixedIv: 3, abilitySlot: 0, otId: 0 };
    const message = "Frontier set 110 requires nature 24, personality 0 derives 0";
    expect(() => createFactoryCorpusPartyMember(instance)).toThrow(message);
    expect(() => engine.createFactoryCorpusPartyMember(instance)).toThrow(message);
  });

  it("fixedIv 32 (outside 0..31) rejects on both engines with the same message", async () => {
    const engine = await getWasmEngine();
    const instance: FactoryCorpusPartyInstance = {
      setId: 110, personality: 813_709_149, fixedIv: 32, abilitySlot: 0, otId: 0,
    };
    const message = "uniform IV must be an integer in 0..31, got 32";
    expect(() => createFactoryCorpusPartyMember(instance)).toThrow(message);
    expect(() => engine.createFactoryCorpusPartyMember(instance)).toThrow(message);
  });
});

// --- Part D: createFactoryCorpusParty triple -------------------------------

describe.skipIf(!wasmAvailable)("createFactoryCorpusParty — full 3-member party parity", () => {
  it("one party of 3 matches between engines", async () => {
    const engine = await getWasmEngine();
    const instances = [
      { setId: 110, personality: 813_709_149, fixedIv: 3, abilitySlot: 1, otId: PLAYER_TRAINER_ID },
      { setId: 140, personality: 3_187_899_706, fixedIv: 3, abilitySlot: 1, otId: PLAYER_TRAINER_ID },
      { setId: 6, personality: 279_625, fixedIv: 8, abilitySlot: 0, otId: PLAYER_TRAINER_ID },
    ] as const satisfies readonly [FactoryCorpusPartyInstance, FactoryCorpusPartyInstance, FactoryCorpusPartyInstance];

    const ts = createFactoryCorpusParty(instances);
    const wasm = engine.createFactoryCorpusParty(instances);
    expect(wasm).toEqual(ts);
  });
});

// --- Part E: six-IV instances (CreateBoxMon's random-IV branch) ------------
//
// ISSUES #118: a rental whose fixed-IV argument was retail's
// `sFixedIVTable[8]` overread (110 >= USE_RANDOM_IVS) carries a real rolled
// spread on `instance.ivs`, which routes the wasm engine through
// `fw_create_factory_party_member_with_ivs` (packed MON_DATA_IVS word)
// instead of `fw_create_factory_party_member`. The two exports must produce
// byte-identical members, and both must match the TS engine.

const SIX_IV_SPREADS = [
  { hp: 3, attack: 10, defense: 23, speed: 24, spAttack: 3, spDefense: 28 },
  { hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 },
  { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
  { hp: 31, attack: 0, defense: 31, speed: 0, spAttack: 31, spDefense: 0 },
  { hp: 7, attack: 25, defense: 3, speed: 26, spAttack: 5, spDefense: 9 },
] as const;

describe.skipIf(!wasmAvailable)("Six-IV instances — ts vs wasm through the with-ivs export", () => {
  for (const setId of [110, 140] as const) {
    const personality = personalityForSet(setId);
    for (const ivs of SIX_IV_SPREADS) {
      it(`setId=${setId} ivs=${Object.values(ivs).join(",")}`, async () => {
        const engine = await getWasmEngine();
        const instance: FactoryCorpusPartyInstance = {
          setId,
          personality,
          // The saved RentalMon.ivs is the ATK IV (battle_factory_screen.c:1824).
          fixedIv: ivs.attack,
          ivs,
          abilitySlot: (personality & 1) as 0 | 1,
          otId: PLAYER_TRAINER_ID,
        };
        const ts = createFactoryCorpusPartyMember(instance);
        const wasm = engine.createFactoryCorpusPartyMember(instance);
        expect(wasm, "six-IV member parity").toEqual(ts);
        expect(ts.ivs).toEqual(ivs);
      });
    }
  }

  it("a uniform six-IV spread matches the same instance expressed as a bare fixedIv", async () => {
    const engine = await getWasmEngine();
    const personality = personalityForSet(110);
    const bare: FactoryCorpusPartyInstance = {
      setId: 110, personality, fixedIv: 8, abilitySlot: (personality & 1) as 0 | 1, otId: PLAYER_TRAINER_ID,
    };
    const spread: FactoryCorpusPartyInstance = {
      ...bare,
      ivs: { hp: 8, attack: 8, defense: 8, speed: 8, spAttack: 8, spDefense: 8 },
    };
    // Same member on both engines and across both wasm exports.
    expect(engine.createFactoryCorpusPartyMember(spread)).toEqual(createFactoryCorpusPartyMember(bare));
    expect(engine.createFactoryCorpusPartyMember(spread)).toEqual(engine.createFactoryCorpusPartyMember(bare));
  });

  it("rejects an ivs spread whose attack disagrees with fixedIv (the RentalMon.ivs rule)", () => {
    const personality = personalityForSet(110);
    const instance: FactoryCorpusPartyInstance = {
      setId: 110,
      personality,
      fixedIv: 5,
      ivs: { hp: 3, attack: 10, defense: 23, speed: 24, spAttack: 3, spDefense: 28 },
      abilitySlot: (personality & 1) as 0 | 1,
      otId: PLAYER_TRAINER_ID,
    };
    expect(() => createFactoryCorpusPartyMember(instance)).toThrow(
      "instance ivs.attack 10 must equal fixedIv 5",
    );
  });
});
