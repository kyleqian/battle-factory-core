import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const auditText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/psychUpSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const verifyText = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/verifyPsychUpStaging.ts"], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
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
  expect(result.status).toBe(0); expect(result.stderr).toBe("");
}

describe("MOVE_PSYCH_UP source/component classification + legal bilateral Scene-ON staging", () => {
  it("pins the complete pointer-owned root, command order, direct task/callback/resource bodies, and source identity controls", () => {
    const first = auditText();
    expect(auditText()).toBe(first);
    expect(sha(first)).toBe("f97bca8819c8ad6c3317444ccdec3773ec26b47780431a1d0f20ffe65c50304a");
    const audit = JSON.parse(first) as Json;
    expect(audit).toMatchObject({ schema: "psych-up-source-audit/v1", move: "MOVE_PSYCH_UP", moveId: 244, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: { pointerOwnedRoot: { symbol: "Move_PSYCH_UP", nextDispatchLabel: "Move_DIZZY_PUNCH", rom: { start: "0x082caaea", endExclusive: "0x082cab5c", byteLength: 114 }, branches: { directlyReachableBlocks: ["Move_PSYCH_UP"], dispatchedBranches: [], complete: true } } },
      graph: { blocks: ["Move_PSYCH_UP"], components: ["asset:ANIM_TAG_SPIRAL", "sprite:gPsychUpSpiralSpriteTemplate", "task:AnimTask_BlendBattleAnimPal", "task:AnimTask_ScaleMonAndRestore", "task:AnimTask_SwayMon", "visualCommand:blend_color_cycleexclude", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:monbg", "visualCommand:setalpha"], track: { id: "psych-up-spiral-palette-cycle", representatives: ["MOVE_PSYCH_UP"], fulfilled: false } },
      resources: { spiral: { tag: "ANIM_TAG_SPIRAL", tagValue: 10196, tileBytes: 0x0800 } },
      checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, commandOrder: true, directTaskCallbackResourceBodies: true, fullFactoryCarrierCensus: true, completeLevel50CarrierCensus: true, denseWindowCaptured: false, latchMeasured: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, unsupportedNoCreditBoundary: true },
    });
    expect(audit.source.commands).toHaveLength(17);
    expect(Object.keys(audit.source.directBodies.tasks).sort()).toEqual(["blendBattleAnimPal", "blendColorCycleExclude", "scale", "sway"]);
    expect(Object.keys(audit.source.directBodies.runtimeCommands)).toHaveLength(10);
    expect(audit.controls.kind).toContain("identity checks only");
    for (const move of ["MOVE_LEER", "MOVE_FRUSTRATION", "MOVE_SLEEP_TALK", "MOVE_HYPER_VOICE", "MOVE_SNORE", "MOVE_PSYCHIC", "MOVE_FUTURE_SIGHT"]) expect(audit.controls.named).toHaveProperty(move);
    expect(audit.controls.paletteSiblings.some((entry: Json) => entry.move === "MOVE_FRUSTRATION" && entry.status === "exact")).toBe(true);
  });

  it("pins the full Factory and Level-50 carrier census alongside the later exact promotion", () => {
    const audit = JSON.parse(auditText()) as Json;
    expect(audit.carriers.factoryCount).toBe(15);
    expect(audit.carriers.level50Count).toBe(14);
    expect(audit.carriers.allFactory.map((entry: Json) => entry.index)).toEqual([50, 229, 428, 478, 512, 514, 562, 570, 593, 639, 652, 782, 837, 841, 844]);
    expect(audit.carriers.level50.map((entry: Json) => entry.index)).toEqual([229, 428, 478, 512, 514, 562, 570, 593, 639, 652, 782, 837, 841, 844]);
    expect(audit.carriers.representative).toMatchObject({ index: 229, label: "FRONTIER_MON_JUMPLUFF_1", species: "SPECIES_JUMPLUFF" });
    const coverage = JSON.parse(readFileSync(resolve(root, "ANIMATION_COVERAGE.json"), "utf8")) as Json;
    expect(coverage.entries).toHaveLength(258);
    expect(coverage.entries.find((entry: Json) => entry.move === "MOVE_PSYCH_UP")).toMatchObject({ status: "exact" });
    expect(coverage.queue).toEqual([]);
    expect(coverage.componentTracks.find((entry: Json) => entry.id === "psych-up-spiral-palette-cycle")).toMatchObject({ fulfilled: true, representatives: ["MOVE_PSYCH_UP"] });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-psych-up-player-jumpluff-opponent-ninjask.json", "player", "opponent"],
    ["opponent-front", "tools/battle-lab/mechanic-psych-up-opponent-jumpluff-player-ninjask.json", "opponent", "player"],
  ] as const)("validates the %s complete legal party-before-init stage without transient injection", (_orientation, path, attacker, target) => {
    validateStage(path);
    const stage = JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 1, battleNum: 0, trainerId: 100, seed: 305420244 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).toEqual({ segments: [{ frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] }, { frames: 2, buttons: ["A"] }, { frames: 1200, buttons: [] }] });
    for (const side of ["player", "opponent"] as const) for (const mon of stage.overrides.parties[side] as Json[]) {
      expect(Object.keys(mon).sort()).toEqual(completeKeys);
      expect(Object.keys(mon.ivs).sort()).toEqual(statKeys); expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
      for (const field of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(field);
    }
    expect(stage.overrides.parties[attacker][0]).toMatchObject({ species: 189, moves: [244, 244, 244, 244] });
    expect(stage.overrides.parties[target][0]).toMatchObject({ species: 302, moves: [14, 14, 14, 14] });
  });

  it("replays compact twice-fresh source-root receipts without retaining a dense window", () => {
    const first = verifyText();
    expect(verifyText()).toBe(first);
    expect(JSON.parse(first)).toEqual({
      schema: "psych-up-source-staging-verifier/v1",
      auditRunSha256: "f97bca8819c8ad6c3317444ccdec3773ec26b47780431a1d0f20ffe65c50304a",
      runs: {
        "player-back": { outputSha256: "0cff7447239515bd2a96ecfca356fab9f613c5a39a9ba9600ce237db6c812933", rootObservations: 178 },
        "opponent-front": { outputSha256: "549e39ee21307fbde6791d863d7cecec86e302600513da30ceaeddd1ce1b47b9", rootObservations: 178 },
      },
    });
  });
});
