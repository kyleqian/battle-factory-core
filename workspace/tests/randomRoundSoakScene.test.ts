// Tier-1 pins for the soak's `--scene on|off|both` (tools/soak/randomRoundSoak.ts).
// Default (flag absent) must stay byte-identical: no scene tag on lines, JSON
// or summary. `on` must start every seed from battleSceneMode "on" for the
// fresh, --start-carry and --vary-rng starts. `both` reports each seed once per
// scene. A --parallel fan-out with --scene must reproduce the serial run.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createInitialState } from "../src/engine/core.ts";
import { createStartCarryState, runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

const scratch = mkdtempSync(join(tmpdir(), "soak-scene-test-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const BASE_ARGS = ["--policy", "vanilla", "--seeds", "0:3", "--render-every", "8", "--milestone"];

function runSoakCli(extraArgs: readonly string[]): string {
  return execFileSync(
    process.execPath,
    ["--experimental-strip-types", "tools/soak/randomRoundSoak.ts", ...BASE_ARGS, ...extraArgs],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
}

function normalize(stdout: string, jsonPath: string): string {
  return stdout
    .replace(/\d+\.\d+s/g, "<elapsed>")
    .replace(jsonPath, "<json>");
}

describe("createStartCarryState scene", () => {
  it("defaults to Scene OFF and is unchanged by an explicit off", () => {
    expect(createStartCarryState(0).battleSceneMode).toBe("off");
    expect(createStartCarryState(14, 3).battleSceneMode).toBe("off");
    expect(createStartCarryState(14, 3, "off")).toEqual(createStartCarryState(14, 3));
    expect(createStartCarryState(0, 0, "off")).toEqual(createInitialState());
  });

  it("builds battleSceneMode on for fresh, start-carry and vary-rng starts", () => {
    expect(createStartCarryState(0, 0, "on").battleSceneMode).toBe("on");
    expect(createStartCarryState(14, 0, "on").battleSceneMode).toBe("on");
    expect(createStartCarryState(0, 5, "on").battleSceneMode).toBe("on");
    expect(createStartCarryState(14, 5, "on").battleSceneMode).toBe("on");
  });

  it("changes nothing but the mode", () => {
    for (const [carry, walk] of [[0, 0], [14, 0], [0, 5]] as const) {
      expect({ ...createStartCarryState(carry, walk, "on"), battleSceneMode: "off" })
        .toEqual(createStartCarryState(carry, walk));
    }
  });
});

describe("runSeed scene", () => {
  it("tags the result only when a scene is asked for", () => {
    const options = { policy: "vanilla", stopAtFirstActionMenu: true, renderEvery: 0 } as const;
    expect("scene" in runSeed(0, options)).toBe(false);
    const on = runSeed(0, { ...options, scene: "on" });
    expect(on).toMatchObject({ outcome: "OK", scene: "on", endState: "milestone:first-action-menu" });
    const off = runSeed(0, { ...options, scene: "off" });
    expect(off).toMatchObject({ outcome: "OK", scene: "off" });
    // Scene mode is presentation-only: the same logical milestone is reached.
    expect({ ...off, scene: undefined, frames: 0 }).toEqual({ ...runSeed(0, options), scene: undefined, frames: 0 });
  }, 60_000);

  it("starts from a Scene ON state and renders it", () => {
    const seen: string[] = [];
    const result = runSeed(0, {
      policy: "vanilla",
      stopAtFirstActionMenu: true,
      renderEvery: 8,
      scene: "on",
      collectDiagnostics: true,
      stateFactory: (seed) => {
        const state = createStartCarryState(14, seed, "on");
        seen.push(state.battleSceneMode);
        return state;
      },
    });
    expect(seen).toEqual(["on"]);
    expect(result.outcome).toBe("OK");
    expect(result.diagnostics!.renderCalls).toBeGreaterThan(0);
  }, 60_000);
});

describe("soak CLI --scene", () => {
  it("is byte-identical to today without the flag, and --scene off tags lines only", () => {
    const plain = runSoakCli([]);
    expect(plain).not.toMatch(/scene/);
    const off = runSoakCli(["--scene", "off"]);
    expect(off).toMatch(/\(policy vanilla, scene off\)/);
    expect(off).toMatch(/seed\s+0 off\s+OK/);
    // Same logical per-seed results as the untagged run.
    const strip = (text: string) =>
      text.split("\n").filter((l) => l.startsWith("seed")).map((l) => l.replace(/ off\b/, "").replace(/\d+\.\d+s/, ""));
    expect(strip(off)).toEqual(strip(plain));
  }, 120_000);

  it("--scene both reports every seed under both scenes with per-scene counts", () => {
    const jsonPath = join(scratch, "both.json");
    const out = runSoakCli(["--scene", "both", "--json", jsonPath]);
    const seedLines = out.split("\n").filter((l) => l.startsWith("seed"));
    expect(seedLines.map((l) => l.split(/\s+/).slice(1, 3).join(" "))).toEqual(
      ["0 off", "0 on", "1 off", "1 on", "2 off", "2 on"],
    );
    expect(out).toMatch(/=== soak summary: 6 runs \(policy vanilla, scene both\)/);
    expect(out).toMatch(/scene off: 3 runs  OK 3  CRASH 0  HANG 0/);
    expect(out).toMatch(/scene on : 3 runs  OK 3  CRASH 0  HANG 0/);
    const json = JSON.parse(readFileSync(jsonPath, "utf8")) as { results: { seed: number; scene: string }[] };
    expect(json.results.map((r) => `${r.seed}${r.scene}`)).toEqual(
      ["0off", "0on", "1off", "1on", "2off", "2on"],
    );
  }, 120_000);

  it("--scene on with --vary-rng / --start-carry runs under Scene ON", () => {
    const out = runSoakCli(["--scene", "on", "--vary-rng", "--start-carry", "14"]);
    expect(out).toMatch(/seed\s+0 on\s+OK/);
    expect(out).toMatch(/seed\s+2 on\s+OK/);
    expect(out).toMatch(/scene on : 3 runs  OK 3/);
    expect(out).not.toMatch(/scene off/);
  }, 120_000);

  it("rejects a bad --scene and --scene both with --coverage-json", () => {
    expect(() => runSoakCli(["--scene", "maybe"])).toThrow();
    expect(() => runSoakCli(["--scene", "both", "--coverage-json", join(scratch, "c.json")])).toThrow();
  }, 60_000);

  it("--parallel with --scene reproduces the serial run", () => {
    const serialJson = join(scratch, "serial.json");
    const parallelJson = join(scratch, "parallel.json");
    const serial = runSoakCli(["--scene", "both", "--json", serialJson]);
    const parallel = runSoakCli(["--scene", "both", "--parallel", "2", "--json", parallelJson]);
    expect(normalize(parallel, parallelJson)).toBe(normalize(serial, serialJson));
    expect(JSON.parse(readFileSync(parallelJson, "utf8"))).toEqual(
      JSON.parse(readFileSync(serialJson, "utf8")),
    );
  }, 180_000);
});
