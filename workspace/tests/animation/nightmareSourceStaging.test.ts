import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/nightmareSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });
const verifyText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifyNightmareStaging.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort();
const components = ["subroutine:NightmareInContest", "task:AnimTask_BlendMonInAndOut", "task:AnimTask_NightmareClone", "task:AnimTask_ShakeMon", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:waitbgfadein"];

function oracleDirectory(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("could not locate pinned battle_lab.py");
    candidate = parent;
  }
}
function validateStage(path: string): void {
  const check = spawnSync("python3", ["-c", ["import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request", "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')"].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
  expect(check.status).toBe(0);
  expect(check.stderr).toBe("");
}
function expectBody(record: Json): void {
  expect(record.source).toMatchObject({ path: expect.stringMatching(/^src\//), sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
  expect(record.rom).toMatchObject({ start: expect.stringMatching(/^0x08/), endExclusive: expect.stringMatching(/^0x08/), romSha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
}

describe("MOVE_NIGHTMARE authoritative source classification and legal bilateral staging", () => {
  it("pins the pointer-owned root including its contest-only branch, ELF/ROM/source bodies, Ghost resources/audio, carriers, and identity-only controls", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    const receipt = readJson("tools/compare/fixtures/nightmare-staging-receipt.json");
    expect(sha(first)).toBe(receipt.source.auditRunSha256);
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "nightmare-source-audit/v1", move: "MOVE_NIGHTMARE", moveId: 171, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_NIGHTMARE", nextDispatchLabel: "Move_FLAIL", rom: receipt.source.pointerOwnedRoot, branches: { directlyReachableBlocks: ["Move_NIGHTMARE", "NightmareInContest"], dispatchedBranches: ["NightmareInContest"], complete: true } } },
      graph: { blocks: ["Move_NIGHTMARE", "NightmareInContest"], components, track: { id: "nightmare-clone-blend", representatives: ["MOVE_NIGHTMARE"], fulfilled: false } },
      behavior: { background: "BG_GHOST", targetMonBg: "ANIM_DEF_PARTNER", clone: { task: "AnimTask_NightmareClone", priority: 2 }, shake: { task: "AnimTask_ShakeMon", args: ["ANIM_TARGET", 3, 0, 40, 1] }, contestBlend: { task: "AnimTask_BlendMonInAndOut", args: ["ANIM_ATTACKER", "RGB_WHITE", 10, 2, 1] }, audio: { sound: "SE_M_NIGHTMARE", pan: "SOUND_PAN_TARGET" } },
      carriers: { factoryCount: 2, level50Count: 2, excludedOutsideLevel50: [], inventory: { frontierMonCount: 2, speciesCount: 2 } },
      checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, completeReachableVisualGraph: true, directTaskCallbackResourceBodies: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
    });
    expect(audit.source.commands.root).toHaveLength(12);
    expect(audit.source.commands.contest).toHaveLength(7);
    for (const group of [audit.source.directBodies.nightmareClone, audit.source.directBodies.blend, audit.source.directBodies.shake, audit.source.directBodies.backgroundTasks, audit.source.directBodies.runtimeCommands]) for (const record of Object.values(group) as Json[]) expectBody(record);
    expectBody(audit.source.directBodies.drawHelper);
    for (const resource of Object.values(audit.resources.ghostBackground).filter((value: any) => value.rom) as Json[]) {
      expect(resource.source.source).toMatchObject({ path: expect.stringContaining("graphics.c"), sha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
      expect(resource.rom).toMatchObject({ romSha256: expect.stringMatching(/^[0-9a-f]{64}$/) });
    }
    expect(audit.carriers.allFactory.map((entry: Json) => entry.index)).toEqual([284, 497]);
    expect(audit.carriers.level50.map((entry: Json) => entry.index)).toEqual([284, 497]);
    expect(Object.keys(audit.controls.named).sort()).toEqual(["MOVE_DESTINY_BOND", "MOVE_ENDEAVOR", "MOVE_EXTRASENSORY", "MOVE_FLAME_WHEEL", "MOVE_FORESIGHT", "MOVE_HELPING_HAND", "MOVE_HIDDEN_POWER", "MOVE_NIGHT_SHADE", "MOVE_RAGE", "MOVE_RECYCLE", "MOVE_SKILL_SWAP", "MOVE_SPITE", "MOVE_SUPER_FANG", "MOVE_TORMENT"]);
    expect(audit.controls.kind).toContain("no Nightmare timing");
  });

  it("keeps the unfulfilled track and compact twice-fresh party-before-init receipts without a latch or coverage claim", () => {
    const coverage = readJson("ANIMATION_COVERAGE.json");
    expect(coverage.entries).toHaveLength(256);
    expect(coverage.entries.some((entry: Json) => entry.move === "MOVE_NIGHTMARE")).toBe(false);
    expect(coverage.queue).toEqual(["MOVE_NIGHTMARE"]);
    expect(coverage.componentTracks.find((entry: Json) => entry.id === "nightmare-clone-blend")).toMatchObject({ representatives: ["MOVE_NIGHTMARE"], fulfilled: false, components });
    const receipt = readJson("tools/compare/fixtures/nightmare-staging-receipt.json");
    expect(receipt).toMatchObject({ schema: "nightmare-compact-staging-receipt/v1", status: "unsupported-source-staging-checkpoint", coverageCredit: false, carrierCensus: { allFactory: [284, 497], level50: [284, 497], partyBeforeInit: true }, scope: { framebuffersRetained: false, rawRgbRetained: false, denseWindowCaptured: false, semanticFramesRetained: false, latchMeasured: false, durableLatchRowAdded: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coveragePromotion: false, coverageEntryAdded: false, componentTrackFulfilled: false, battleStateInjected: false, transientOverrides: [], boundaryOrBarrierChanged: false, noTimingOrLatchTransfer: true } });
    for (const [orientation, attacker, target, attackerBattler, targetBattler, targetSpecies] of [
      ["player-back", "player", "opponent", 0, 1, 213],
      ["opponent-front", "opponent", "player", 1, 0, 115],
    ]) {
      const run = receipt.runs[orientation];
      validateStage(run.scenario);
      const stage = readJson(run.scenario);
      expect([stage.schemaVersion, stage.mode, stage.profile, stage.level]).toEqual([1, "mechanicLab", "battle-scene-on", 50]);
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      expect(stage.trace).not.toHaveProperty("captureFrames");
      for (const side of ["player", "opponent"]) for (const mon of stage.overrides.parties[side] as Json[]) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
        expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        for (const transient of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(Object.hasOwn(mon, transient)).toBe(false);
      }
      expect(run).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, output: { sourceInitialized: true, customPartiesBuiltBeforeBattle: true, transientFreeSetup: true, attacker: { side: attacker, partyIndex: 0, species: 93 }, target: { side: target, partyIndex: 0, species: targetSpecies }, root: { symbol: "Move_NIGHTMARE", observations: 168, first: { currentMove: 171, attackerBattler, targetBattler } }, stockOutcome: { nightmareEffect: { targetStatus2: 134217728 }, targetStatus: { kind: "sleep" }, battleOutcome: 0 }, pp: { spent: 1 }, cleanup: { visualTasks: 0, soundTasks: 0 }, benches: { partyIndices: { player: [1, 2], opponent: [1, 2] }, unchanged: true, checksumValid: true }, entryHooks: { weather: 0, weatherTurns: 0, stockDerived: false } } });
    }
    const first = verifyText();
    expect(verifyText()).toBe(first);
    expect(JSON.parse(first)).toEqual({
      schema: "nightmare-source-staging-verifier/v1",
      auditRunSha256: receipt.source.auditRunSha256,
      runs: {
        "player-back": { outputSha256: "b2f7ae99f773c4f2f75feb8336387fba3110623bda0c62eb63f77843f21c8850", rootObservations: 168, ppSpent: 1 },
        "opponent-front": { outputSha256: "1da8133ea52ef1f63f9d44e3b8872035e551913a5f482bb0af83d4a0afb2dab5", rootObservations: 168, ppSpent: 1 },
      },
    });
  });
});
