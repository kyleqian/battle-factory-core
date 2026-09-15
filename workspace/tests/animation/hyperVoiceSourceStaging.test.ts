import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/hyperVoiceSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const verifyText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifyHyperVoiceStaging.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();
const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort();

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
  const result = spawnSync("python3", ["-c", ["import json, sys", "sys.path.insert(0, sys.argv[1])", "from battle_lab import validate_request", "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')"].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
}

describe("MOVE_HYPER_VOICE source/component classification + legal bilateral Scene-ON staging", () => {
  it("pins the complete pointer-owned root, direct source/ELF/ROM bodies, carriers, and identity-only controls", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(sha(first)).toBe("ecf1986ba957454d31163cdc22cedda4ed011815bd6c36d677a13532ab53c975");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({
      schema: "hyper-voice-source-audit/v1",
      move: "MOVE_HYPER_VOICE",
      moveId: 304,
      status: "unsupported-source-staging-checkpoint",
      coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_HYPER_VOICE", nextDispatchLabel: "Move_SAND_TOMB", rom: { start: "0x082d50d6", endExclusive: "0x082d516a", byteLength: 148, romSha256: "3a1a178d165c247303bf2476e06dc019215e8939278dfe1a5cfaaeb9a26e3b9b" }, branches: { directlyReachableBlocks: ["Move_HYPER_VOICE", "HyperVoiceEffect"], dispatchedBranches: ["HyperVoiceEffect"], complete: true } } },
      graph: { blocks: ["Move_HYPER_VOICE", "HyperVoiceEffect"], components: ["asset:ANIM_TAG_THIN_RING", "sprite:gHyperVoiceRingSpriteTemplate", "subroutine:HyperVoiceEffect", "task:AnimTask_ScaleMonAndRestore", "task:AnimTask_ShakeMon2", "task:SoundTask_PlayCryWithEcho", "task:SoundTask_WaitForCry", "visualCommand:shake_battle_platforms", "visualCommand:simple_palette_blend"], track: { id: "hyper-voice-ring-cry-platform", representatives: ["MOVE_HYPER_VOICE"], fulfilled: false } },
      behavior: { effectCalls: 2, cries: [false, true], cleanup: ["waitforvisualfinish", "end"] },
      resources: { thinRing: { tag: "ANIM_TAG_THIN_RING", tagValue: 10203, tileBytes: 2048 } },
      carriers: { factoryCount: 1, level50Count: 1, allFactory: [{ index: 397, label: "FRONTIER_MON_EXPLOUD_1", species: "SPECIES_EXPLOUD" }], level50: [{ index: 397, label: "FRONTIER_MON_EXPLOUD_1", species: "SPECIES_EXPLOUD" }] },
      checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, directTaskCallbackResourceBodies: true, legalBilateralPartyOnlyStaging: true, compactBilateralEndpointReceipts: true, twiceFreshPerOrientation: true, denseWindowCaptured: false, latchMeasured: false, durableLatchRowAdded: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, latchPromotion: false, boundaryOrBarrierChanged: false, gameplayStateOwned: false, unsupportedNoCreditBoundary: true },
    });
    expect(audit.source.commands).toHaveLength(17);
    expect(Object.keys(audit.source.directBodies.ring).sort()).toEqual(["affineProgram", "affineTable", "callback", "template", "waitEnd"]);
    expect(Object.keys(audit.source.directBodies.tasks).sort()).toEqual(["cry", "platform", "scale", "shakeMon2", "simplePaletteBlend"]);
    expect(Object.keys(audit.source.directBodies.runtimeCommands)).toHaveLength(8);
    expect(Object.keys(audit.controls.named).sort()).toEqual(["MOVE_ROAR", "MOVE_ROCK_TOMB", "MOVE_SNORE", "MOVE_UPROAR"]);
    expect(audit.controls.kind).toContain("identity checks only");
    expect(audit.controls.kind).toContain("no Hyper Voice timing");
  });

  it("keeps the staging checkpoint historical while Hyper Voice is independently exact", () => {
    const coverage = readJson("ANIMATION_COVERAGE.json");
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_HYPER_VOICE")).toMatchObject({ status: "exact" });
    expect(coverage.componentTracks.find((track: Json) => track.id === "hyper-voice-ring-cry-platform")).toMatchObject({ representatives: ["MOVE_HYPER_VOICE"], fulfilled: true });
    const stages = [
      ["tools/battle-lab/mechanic-hyper-voice-player-exploud-opponent-slowking.json", [397, 398, 399], [410, 411, 412], "player", "opponent"],
      ["tools/battle-lab/mechanic-hyper-voice-opponent-exploud-player-slowking.json", [410, 411, 412], [397, 398, 399], "opponent", "player"],
    ] as const;
    for (const [path, playerSetIds, opponentSetIds, attacker, target] of stages) {
      validateStage(path);
      const stage = readJson(path);
      expect([stage.schemaVersion, stage.mode, stage.profile, stage.level, stage.challengeNum, stage.battleNum, stage.trainerId, stage.seed]).toEqual([1, "mechanicLab", "battle-scene-on", 50, 3, 0, 120, 305420304]);
      expect(stage.playerSetIds).toEqual(playerSetIds);
      expect(stage.opponentSetIds).toEqual(opponentSetIds);
      expect(Object.keys(stage.overrides)).toEqual(["parties"]);
      for (const side of ["player", "opponent"]) for (const mon of stage.overrides.parties[side] as Json[]) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
        expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
        for (const transient of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(Object.hasOwn(mon, transient)).toBe(false);
      }
      expect(stage.overrides.parties[attacker][0].moves).toEqual([304, 304, 304, 304]);
      expect(stage.overrides.parties[target][0].moves).toEqual([133, 133, 133, 133]);
    }
    const first = verifyText();
    expect(verifyText()).toBe(first);
    expect(JSON.parse(first)).toEqual({
      schema: "hyper-voice-source-staging-verifier/v1",
      auditRunSha256: "ecf1986ba957454d31163cdc22cedda4ed011815bd6c36d677a13532ab53c975",
      runs: {
        "player-back": { outputSha256: "fbe3fba3f8f7aded8b0f0c2bca52cd096ea79144b858e0f6159a07e3579392ac", rootObservations: 104, firstInactiveCleanupFrame: 180 },
        "opponent-front": { outputSha256: "6ea48b8b96365df80ed2845d2294838a830a4a225dbad0fb1ba3adc92414436a", rootObservations: 104, firstInactiveCleanupFrame: 184 },
      },
    });
  });
});
