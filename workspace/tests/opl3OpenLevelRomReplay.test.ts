// opl3 (docs/opl3-open-level-rom-replay.md): the ROM replay at Open Level, pinned without the emulator. Fixture = Open Level census seed 8 driven on the
// stock ROM (tests/fixtures/opl3-open-seed8.json: the lab request, the ROM read-back at the first action menu, the drive's timeline and wide states):
// level-100 parties from the Open Level sets (a high-tier set 863, Tyranitar's Sand Stream), challenge 5's full AI. The engine side is a live
// soundCensusRomReplay run on that setup; every engine state must be in the ROM timeline in order and every wide state must equal the ROM's.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/opl3-open-seed8.json", import.meta.url), "utf8")) as {
  request: Record<string, unknown>; setup: { descriptor: { level: number } }; drive: { timeline: number[][]; wide: unknown[]; outcome: number };
};
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;
const run = (...args: string[]) => execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, ...args], { stdio: "pipe", maxBuffer: 1 << 28, env: { ...process.env, ROM_REPLAY_LEVEL: "" } });

describe("ROM replay at Open Level (opl3)", () => {
  it("the Open request of census seed 8 is the one driven on the ROM; Level 50 keeps its shape", { timeout: 60_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), "opl3-"));
    run("request", "--seed=8", "--scene=off", "--level=open", `--out=${join(dir, "open.json")}`);
    run("request", "--seed=8", "--scene=off", `--out=${join(dir, "l50.json")}`);
    const open = JSON.parse(readFileSync(join(dir, "open.json"), "utf8"));
    const l50 = JSON.parse(readFileSync(join(dir, "l50.json"), "utf8"));
    expect(open).toEqual(fixture.request);
    expect(open.level).toBe(100);
    expect([...open.playerSetIds, ...open.opponentSetIds].every((id: number) => id >= 372 && id <= 881)).toBe(true);
    expect(l50.level).toBe(50);
    expect(l50.replay).toEqual({ policy: "census", censusSeed: 8, symbols: 0 });
  });

  it("the engine battle rebuilt from the ROM's level-100 read-back matches the ROM state for state", { timeout: 120_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), "opl3-"));
    writeFileSync(join(dir, "setup.json"), JSON.stringify(fixture.setup));
    writeFileSync(join(dir, "drive.json"), JSON.stringify({ drive: fixture.drive }));
    run("replay", "--seed=8", "--scene=off", "--level=open", `--setup=${join(dir, "setup.json")}`, `--out=${join(dir, "engine.json")}`);
    run("compare", "--seed=8", "--scene=off", "--level=open", `--engine=${join(dir, "engine.json")}`, `--drive=${join(dir, "drive.json")}`, `--out=${join(dir, "cmp.json")}`);
    const engine = JSON.parse(readFileSync(join(dir, "engine.json"), "utf8"));
    const cmp = JSON.parse(readFileSync(join(dir, "cmp.json"), "utf8"));
    expect(engine.error).toBeNull();
    expect(engine.lvlMode).toBe("open");
    expect(engine.battleOutcome).toBe(fixture.drive.outcome);
    expect(cmp.divergence).toBeNull();
    expect(cmp.matched).toBe(cmp.engineRows - 1);
    expect(cmp.matched).toBeGreaterThan(10);
    expect(cmp.wide.diffPoints).toBe(0);
    expect(cmp.wide.engineStates).toBe(cmp.wide.romStates);
    expect(cmp.wide.romStates).toBe(fixture.drive.wide.length);
  });

  it("a Level 50 replay refuses an Open Level staging", { timeout: 60_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), "opl3-"));
    writeFileSync(join(dir, "setup.json"), JSON.stringify(fixture.setup));
    expect(() => run("replay", "--seed=8", "--scene=off", `--setup=${join(dir, "setup.json")}`, `--out=${join(dir, "engine.json")}`)).toThrow(/level 100/);
  });
});
