import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
const runAudit = (): Json => JSON.parse(execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/flatterSourceAudit.ts"], { cwd: root, encoding: "utf8" })) as Json;

describe("MOVE_FLATTER source and bilateral legal staging checkpoint", () => {
  it("pins the authoritative source graph, Level-50 carriers, and no-credit boundary", () => {
    const audit = runAudit();
    expect(audit).toMatchObject({ schema: "flatter-source-staging-audit/v1", move: "MOVE_FLATTER", moveId: 260, status: "unsupported-staging", coverageCredit: false, graph: { componentCount: 11 }, boundary: { productionChanged: false, reducerAdded: false, framebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, siblingCredit: false, gameplayOwnership: false } });
    expect(audit.level50Carriers.map((entry: Json) => [entry.index, entry.species])).toEqual([[146, "SPECIES_NIDORINA"], [147, "SPECIES_NIDORINO"]]);
    expect(Object.keys(audit.source)).toEqual(["script", "confetti", "spotlight", "spotlightTasks", "hardwarePaletteFade", "verticalDip"]);
  });

  it("keeps complete parties and the fresh Scene-ON staging receipt reproducible", () => {
    const receipt = JSON.parse(read("tools/compare/fixtures/flatter-staging.json")) as Json;
    expect(receipt).toMatchObject({ schema: "flatter-bilateral-staging/v1", oracleProfile: "battle-scene-on", status: "unsupported-staging", coverageCredit: false, boundary: { denseEvidenceRetained: false, firstInactiveCleanupRetained: false, latchDocumented: false, reducerAdded: false, framebufferAcceptance: false, coveragePromotion: false } });
    for (const orientation of ["player-back", "opponent-front"]) {
      const entry = receipt.orientations[orientation];
      expect(sha(read(entry.scenario))).toBe(entry.scenarioSha256);
      const stage = JSON.parse(read(entry.scenario)) as Json;
      expect(stage).toMatchObject({ mode: "mechanicLab", profile: "battle-scene-on", overrides: { parties: { player: expect.any(Array), opponent: expect.any(Array) } } });
      for (const side of ["player", "opponent"]) {
        expect(stage.overrides.parties[side]).toHaveLength(3);
        for (const mon of stage.overrides.parties[side]) expect(mon).toMatchObject({ level: 50, ivs: { hp: expect.any(Number), attack: expect.any(Number), defense: expect.any(Number), speed: expect.any(Number), spAttack: expect.any(Number), spDefense: expect.any(Number) }, evs: { hp: expect.any(Number), attack: expect.any(Number), defense: expect.any(Number), speed: expect.any(Number), spAttack: expect.any(Number), spDefense: expect.any(Number) }, moves: expect.any(Array), ppUps: expect.any(Array), item: expect.any(Number), abilitySlot: expect.any(Number), friendship: expect.any(Number), gender: expect.any(String), shiny: expect.any(Boolean) });
      }
    }
  });
});
