import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const run = (path: string): string => execFileSync(process.execPath, ["--experimental-strip-types", path], { cwd: root, encoding: "utf8", maxBuffer: 16 << 20 });
const read = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
const complete = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();

function oracleDirectory(): string {
  let at = root;
  while (true) {
    if (existsSync(resolve(at, "oracle/battle_lab.py"))) return resolve(at, "oracle");
    const parent = dirname(at);
    if (parent === at) throw new Error("missing battle_lab.py");
    at = parent;
  }
}

describe("MOVE_SHOCK_WAVE authoritative source classification and legal bilateral staging", () => {
  it("pins the pointer-owned ROM interval, complete visual graph, resources/callbacks/audio, carriers, and identity controls", () => {
    const text = run("tools/compare/shockWaveSourceAudit.ts");
    expect(run("tools/compare/shockWaveSourceAudit.ts")).toBe(text);
    expect(sha(text)).toBe("9a2da9b2461a723884e54a898495759fec59da6e90e31885ee724a731439ed76");
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({ schema: "shock-wave-source-audit/v1", move: "MOVE_SHOCK_WAVE", moveId: 351, status: "exact", coverageCredit: true,
      source: { pointerOwnedRoot: { nextDispatchLabel: "Move_HARDEN", rom: { start: "0x082cf422", endExclusive: "0x082cf4c4", byteLength: 162, romSha256: "954ef9e5653649b09ac7dbd325d125f7406087e24835be7073036db0fbaeefc0" }, branches: { directlyReachableBlocks: ["Move_SHOCK_WAVE"], complete: true } } },
      carriers: { lowestLevel50: { index: 148, label: "FRONTIER_MON_FLAAFFY" } },
      checkpoint: { completeReachableVisualGraph: true, resourcesCallbacksAudio: true, completeLevel50CarrierCensus: true, legalBilateralPartyOnlyStaging: true, denseWindowCaptured: true, reducerAdded: true, typedSceneOnSeam: true, compositorAdded: true, framebufferAcceptance: true, coveragePromotion: true, componentTrackFulfilled: true, unsupportedNoCreditBoundary: false } });
    expect(audit.graph.components).toHaveLength(15);
    expect(Object.keys(audit.resources).sort()).toEqual(["ANIM_TAG_CIRCLE_OF_LIGHT", "ANIM_TAG_ELECTRIC_ORBS", "ANIM_TAG_LIGHTNING", "ANIM_TAG_SPARK"]);
    expect(Object.keys(audit.source.callbacks)).toHaveLength(12);
    expect(audit.audio).toEqual({ script: ["SE_M_CHARGE", "SE_M_TRI_ATTACK2"], callbackOwned: ["SE_M_THUNDERBOLT"], panning: ["SOUND_PAN_ATTACKER", "SOUND_PAN_TARGET", "BattleAnimAdjustPanning"] });
    expect(audit.carriers.allFactory.map((entry: Json) => entry.index)).toEqual([10, 49, 108, 148, 150, 204, 244]);
    expect(audit.carriers.level50.map((entry: Json) => entry.index)).toEqual([148, 150, 204, 244]);
    expect(Object.keys(audit.controls.named).sort()).toEqual(["MOVE_CHARGE", "MOVE_SPARK", "MOVE_SUPERPOWER", "MOVE_TAIL_GLOW", "MOVE_THUNDER", "MOVE_THUNDERBOLT"]);
  });

  it("pins complete transient-free party-before-init scenarios and a hermetic twice-fresh compact receipt without credit", () => {
    const coverage = read("ANIMATION_COVERAGE.json");
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_SHOCK_WAVE")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual(["MOVE_NIGHTMARE"]);
    expect(coverage.componentTracks.find((track: Json) => track.id === "shock-wave-electric-bolts")).toMatchObject({ representatives: ["MOVE_SHOCK_WAVE"], fulfilled: true });
    for (const path of ["tools/battle-lab/mechanic-shock-wave-player-flaaffy-opponent-corsola.json", "tools/battle-lab/mechanic-shock-wave-opponent-flaaffy-player-corsola.json"]) {
      const check = spawnSync("python3", ["-c", "import json,sys;sys.path.insert(0,sys.argv[1]);from battle_lab import validate_request;validate_request(json.load(open(sys.argv[2])), 'battle-scene-on')", oracleDirectory(), resolve(root, path)], { encoding: "utf8" });
      expect(check.status).toBe(0);
      const stage = read(path);
      expect([stage.mode, stage.profile, stage.challengeNum, stage.playerSetIds.length, stage.opponentSetIds.length]).toEqual(["mechanicLab", "battle-scene-on", 0, 3, 3]);
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      for (const side of ["player", "opponent"]) for (const mon of stage.overrides.parties[side]) {
        expect(Object.keys(mon).sort()).toEqual(complete);
        for (const transient of ["hp", "maxHp", "status", "stages", "weather", "sideConditions", "outcome", "volatile"]) expect(Object.hasOwn(mon, transient)).toBe(false);
      }
    }
    const receipt = read("tools/compare/fixtures/shock-wave-staging-receipt.json");
    expect(receipt.factoryLegalSelection).toMatchObject({ allFactoryCarriers: [10,49,108,148,150,204,244], level50Carriers: [148,150,204,244], lowestLevel50Carrier: 148, partyBeforeInit: true });
    expect(receipt.runs["player-back"]).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, outputSha256: "16d32052dc37bf47485b607e0aac8446794988d49e73f35e17362ab32d0332d0", root: { observations: 266, firstInactiveCleanupFrame: 341 }, pp: { spent: 1 } });
    expect(receipt.runs["opponent-front"]).toMatchObject({ freshRuns: 2, outputsByteIdentical: true, outputSha256: "1b89578a88f45707cd167ae9da5feda310118d47be71cb80d14adc8763cfaa6a", root: { observations: 262, firstInactiveCleanupFrame: 341 }, pp: { spent: 1 } });
    expect(receipt.scope).toMatchObject({ framebuffersRetained: false, denseWindowCaptured: false, latchMeasured: false, productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, coreDispatchAdded: false, coveragePromotion: false, coverageEntryAdded: false, queueEntryAdded: false, componentTrackFulfilled: false, battleStateInjected: false, boundaryOrBarrierChanged: false, noTimingOrLatchTransfer: true });
    const first = run("tools/compare/verifyShockWaveStaging.ts");
    expect(run("tools/compare/verifyShockWaveStaging.ts")).toBe(first);
    expect(JSON.parse(first)).toMatchObject({ schema: "shock-wave-source-staging-verifier/v1", runs: { "player-back": { rootObservations: 266 }, "opponent-front": { rootObservations: 262 } } });
  });
});
