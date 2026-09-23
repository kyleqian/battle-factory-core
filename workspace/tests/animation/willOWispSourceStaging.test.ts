import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const json = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const sha = (value: string): string => createHash("sha256").update(value).digest("hex");
const runAudit = (): string => execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/willOWispSourceAudit.ts"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"];

describe("MOVE_WILL_O_WISP source classification and legal bilateral staging", () => {
  it("pins the complete script, callbacks, templates, components, and carrier census", () => {
    const text = runAudit();
    expect(runAudit()).toBe(text);
    const audit = JSON.parse(text) as Json;
    expect(sha(text)).toMatch(/^[0-9a-f]{64}$/u);
    expect(audit).toMatchObject({ schema: "will-o-wisp-source-audit/v1", moveId: 261, status: "unsupported-source-staged", coverageCredit: false, graph: { componentCount: 10 }, checkpoint: { sourceAudit: true, completePointerOwnedRoot: true, directSpriteAndTaskBodies: true, fullCarrierCensus: true, legalBilateralPartyOnlyStaging: true, productionChanged: false, actualCoreFramebufferAcceptance: false, coveragePromotion: false, componentTrackFulfilled: false, boundaryOrBarrierChanged: false } });
    expect(audit.source.pointerOwnedRoot.rom).toMatchObject({ start: "0x082d4709", endExclusive: "0x082d47c7", byteLength: 190 });
    expect(audit.source.templates.orb.rom.byteLength).toBe(24);
    expect(audit.source.templates.fire.rom.byteLength).toBe(24);
    expect(audit.source.callbacks).toMatchObject({ orb: { rom: { byteLength: 336 } }, orbStep: { rom: { byteLength: 100 } }, fire: { rom: { byteLength: 268 } } });
    expect(audit.carrierCensus).toEqual({ level50: 10, allFactoryTiers: 13 });
    expect(audit.carriers).toHaveLength(13);
    expect(audit.representative).toMatchObject({ index: 62, label: "FRONTIER_MON_SHUPPET", species: "SPECIES_SHUPPET" });
  });

  it.each([
    ["player-back", "tools/battle-lab/mechanic-will-o-wisp-player-shuppet-opponent-shuckle.json", "player", "opponent"],
    ["opponent-front", "tools/battle-lab/mechanic-will-o-wisp-opponent-shuppet-player-shuckle.json", "opponent", "player"],
  ])("keeps the %s stage complete, party-only, and transient-free", (_side, path, attacker, target) => {
    const stage = json(path);
    expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50, challengeNum: 0 });
    expect(Object.keys(stage.overrides)).toEqual(["parties"]);
    expect(stage.trace).not.toHaveProperty("captureFrames");
    for (const party of Object.values(stage.overrides.parties) as Json[][]) {
      expect(party).toHaveLength(3);
      expect(new Set(party.map((mon) => mon.species)).size).toBe(3);
      for (const mon of party) {
        expect(Object.keys(mon).sort()).toEqual(completeKeys);
        for (const key of ["hp", "status", "stages", "statStages", "weather", "sideConditions", "outcome", "volatile"]) expect(mon).not.toHaveProperty(key);
      }
    }
    expect(stage.overrides.parties[attacker][0]).toMatchObject({ species: 353, level: 50, moves: [261, 261, 261, 261], abilitySlot: 0 });
    expect(stage.overrides.parties[target][0]).toMatchObject({ species: 213, level: 50, moves: [150, 150, 150, 150], abilitySlot: 0 });
  });
});
