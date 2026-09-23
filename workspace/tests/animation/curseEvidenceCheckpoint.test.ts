import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const fixture = JSON.parse(readFileSync(resolve(root, "tools/compare/fixtures/curse-evidence.json"), "utf8")) as Json;
const sha = (value: string | Uint8Array): string => createHash("sha256").update(value).digest("hex");

function verifyText(): string {
  return execFileSync(process.execPath, ["--experimental-strip-types", "tools/compare/curseEvidence.ts"], {
    cwd: root, encoding: "utf8", maxBuffer: 32 << 20,
  });
}

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
  const result = spawnSync("python3", ["-c", [
    "import json, sys",
    "sys.path.insert(0, sys.argv[1])",
    "from battle_lab import validate_request",
    "validate_request(json.load(open(sys.argv[2], encoding='utf-8')), 'battle-scene-on')",
  ].join("\n"), oracleDirectory(), resolve(root, path)], { cwd: root, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toBe("");
}

describe("MOVE_CURSE dense Scene-ON evidence checkpoint", () => {
  it("keeps four complete legal three-mon pre-init windows and no gameplay injection", () => {
    expect(fixture).toMatchObject({
      schema: "curse-bilateral-evidence/v1", oracleProfile: "battle-scene-on", move: "MOVE_CURSE",
      moveId: 174, status: "unsupported-evidence", coverageCredit: false,
      graphComponents: 16, representatives: ["MOVE_CURSE"],
      denseRetainedInScratch: true, rawRgbRetainedInScratch: true, twiceFreshByteIdentical: true,
      boundary: {
        productionChanged: false, reducerAdded: false, typedSceneOnSeam: false, compositorAdded: false,
        coveragePromotion: false, componentTrackFulfilled: false, gameplayStateOwned: false,
      },
    });
    const completeKeys = ["abilitySlot", "evs", "friendship", "gender", "item", "ivs", "level", "moves", "nature", "ppUps", "shiny", "species"].sort();
    const statKeys = ["attack", "defense", "hp", "spAttack", "spDefense", "speed"].sort();
    for (const [key, window] of Object.entries(fixture.windows) as Array<[string, Json]>) {
      validateStage(window.scenario);
      const scenario = JSON.parse(readFileSync(resolve(root, window.scenario), "utf8")) as Json;
      expect(scenario.profile).toBe("battle-scene-on");
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(sha(readFileSync(resolve(root, window.scenario)))).toBe(window.scenarioSha256);
      for (const side of ["player", "opponent"]) {
        expect(scenario.overrides.parties[side]).toHaveLength(3);
        for (const mon of scenario.overrides.parties[side] as Json[]) {
          expect(Object.keys(mon).sort()).toEqual(completeKeys);
          expect(Object.keys(mon.ivs).sort()).toEqual(statKeys);
          expect(Object.keys(mon.evs).sort()).toEqual(statKeys);
          for (const transient of ["hp", "maxHp", "status", "stages", "statStages", "weather", "weatherTurns", "sideConditions", "outcome", "volatile"]) {
            expect(Object.hasOwn(mon, transient)).toBe(false);
          }
        }
      }
      expect(window).toMatchObject({
        branch: key.startsWith("ghost-") ? "ghost" : "stats",
        side: key.endsWith("player-back") ? "player-back" : "opponent-front",
        firstInactiveCleanup: true, denseRetainedInScratch: true, rawRgbRetainedInScratch: true,
        twiceFreshByteIdentical: true, rows: expect.any(Number), map: expect.stringContaining("curse-changemap"),
      });
      const attacker = window.side === "player-back" ? scenario.overrides.parties.player[0] : scenario.overrides.parties.opponent[0];
      expect(attacker.moves).toEqual([174, 174, 174, 174]);
      expect(attacker.species).toBe(window.branch === "ghost" ? 93 : 143);
    }
  });

  it("replays the hermetic four-map verifier twice and retains measured latches without promotion", () => {
    const first = verifyText();
    expect(verifyText()).toBe(first);
    const result = JSON.parse(first) as Json;
    expect(result).toMatchObject({ schema: "curse-evidence-verifier/v1", move: "MOVE_CURSE", noCredit: true });
    expect(Object.keys(result.windows).sort()).toEqual([
      "ghost-opponent-front", "ghost-player-back", "stats-opponent-front", "stats-player-back",
    ]);
    for (const window of Object.values(result.windows) as Json[]) {
      expect(window.rows).toBeGreaterThan(0);
      expect(window.mapSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(window.latches.measuredFromThisMap).toBe(true);
      expect(window.cleanup.zeroOwnedCleanup).toBe(true);
    }
  });
});
