import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const json = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");
const runAudit = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/extrasensorySourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

describe("MOVE_EXTRASENSORY source classification and legal bilateral staging", () => {
  it("pins the complete root/shared intervals, exact graph, novel task bodies, and three carriers", () => {
    const text = runAudit();
    expect(runAudit()).toBe(text);
    expect(sha(text)).toBe("667263018a6bc228221e6d6bb6cf1ac3381221c7baa65aa75b639c7edcdcbb5a");
    const audit = JSON.parse(text) as Json;
    expect(audit).toMatchObject({
      schema: "extrasensory-source-audit/v1", move: "MOVE_EXTRASENSORY", moveId: 326, status: "unsupported-source-staging-checkpoint", coverageCredit: false,
      source: {
        pointerOwnedRoot: { source: { byteLength: 773, sha256: "b8dcca5f15ef397ad9357ad328eccc12c7d25f1b34eebc28e38c6d88ec1c7499" }, rom: { start: "0x082cefec", endExclusive: "0x082cf054", byteLength: 104, romSha256: "09941e43d0f6afcc1ed61291b8636fbeeeee07e86790ab576f3f0ef2e5b6de0b" } },
        psychicBackground: { source: { byteLength: 223, sha256: "65d64577e4f4fd01582f21f7b717fad25008a238ac11624c89b01ac092ad3ffa" }, rom: { start: "0x082d7cd1", endExclusive: "0x082d7ce5", byteLength: 20, romSha256: "1639a9d5f5e5ea2a60a8fc5ca63e4726ba034725d265298942f57cf98170d968" } },
        novel: { distortion: { id: "task:AnimTask_ExtrasensoryDistortion", start: { rom: { byteLength: 288 } }, step: { rom: { byteLength: 254 } } }, clone: { id: "task:AnimTask_TransparentCloneGrowAndShrink", start: { rom: { byteLength: 256 } }, step: { rom: { byteLength: 266 } } } },
      },
      graph: { componentCount: 15, novelComponents: ["task:AnimTask_ExtrasensoryDistortion", "task:AnimTask_TransparentCloneGrowAndShrink"] },
      controls: { named: { MOVE_SKILL_SWAP: "exact", MOVE_AMNESIA: "exact", MOVE_CONFUSION: "exact", MOVE_FUTURE_SIGHT: "exact", MOVE_PSYCHIC: "exact" }, transferCredit: false },
      checkpoint: { sourceAudit: true, legalBilateralPartyOnlyStaging: true, productionChanged: false, reducerAdded: false, typedSeamAdded: false, compositorAdded: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingPromotion: false, gameplayStateOwned: false, boundaryOrBarrierChanged: false },
    });
    expect(audit.graph.components).toEqual([
      "subroutine:SetPsychicBackground", "subroutine:UnsetPsychicBackground", "task:AnimTask_BlendMonInAndOut", "task:AnimTask_ExtrasensoryDistortion", "task:AnimTask_SetPsychicBackground", "task:AnimTask_TransparentCloneGrowAndShrink", "visualCommand:blendoff", "visualCommand:clearmonbg", "visualCommand:fadetobg", "visualCommand:monbg", "visualCommand:restorebg", "visualCommand:setalpha", "visualCommand:setarg", "visualCommand:waitbgfadein", "visualCommand:waitbgfadeout",
    ]);
    expect(audit.carriers.map((entry: Json) => [entry.index, entry.label])).toEqual([[130, "FRONTIER_MON_NUZLEAF"], [246, "FRONTIER_MON_STANTLER_1"], [589, "FRONTIER_MON_EXPLOUD_3"]]);
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-extrasensory-player-nuzleaf-opponent-shuckle.json", "player", "opponent"],
    ["opponent-front", "tools/battle-lab/mechanic-extrasensory-opponent-nuzleaf-player-shuckle.json", "opponent", "player"],
  ])("keeps the %s stage complete, party-only, and transient-free", (_side, path, attacker, target) => {
    const stage = json(path);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        for (const key of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
    expect(stage.overrides.parties[attacker][0]).toMatchObject({ species: 299, level: 50, moves: [326, 326, 326, 326], abilitySlot: 0 });
    expect(stage.overrides.parties[target][0]).toMatchObject({ species: 213, level: 50, moves: [150, 150, 150, 150], abilitySlot: 0 });
  });
});
