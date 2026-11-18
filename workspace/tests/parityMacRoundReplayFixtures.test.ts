// Round replay without an emulator (docs/parity-mac/round-replay.md, "The test"). Each fixture is a whole run recorded on the real ROM
// (tools/audio/romRoundReplay.sh, kept by tools/audio/romRoundFixture.py): the ROM's read-back at every battle start and the ROM's states during every
// battle. The test replays it through the engine's round orchestrator (soundCensusRomReplay.ts `round`, the same code the ROM replay runs) and the
// compare (`round-compare`), and checks what the tool checks: every battle start (battle number, streak, symbols, rent count, swap flag, trainer, both
// teams' sets and every field of all six Pokemon), every trainer and draft roll from the ROM's RNG cursor, and every turn (the ROM's state after each turn
// and the wide state at each decision). The one known, unfixed difference (finding 47, a chained round's first trainer) is counted, not hidden.
// What each recording is for is pinned on the ROM's own data, so a fixture cannot quietly stop covering it.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Fixture = {
  name: string; note: string;
  options: { seed: number; scene: string; policy: string; swap: string; challenge: number; symbols: number; draft: string; swapOverride: string };
  knownK: number[]; playerVariants: number[]; expect: { battles: number; knownDifferences: number };
  setups: any[]; rom: any[];
};
const script = new URL("../tools/integration/soundCensusRomReplay.ts", import.meta.url).pathname;
const load = (name: string): Fixture => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/round-replay/${name}.json.gz`, import.meta.url))).toString("utf8"));

function replay(f: Fixture) {
  const dir = mkdtempSync(join(tmpdir(), "round-fixture-"));
  const setups = f.setups.map((s, n) => { const p = join(dir, `setup-${n}.json`); writeFileSync(p, JSON.stringify(s)); return p; });
  const o = f.options;
  const env = { ...process.env, ROM_REPLAY_ROUND: "1", ROM_REPLAY_CHALLENGE: String(o.challenge), ROM_REPLAY_SYMBOLS: String(o.symbols), ROM_REPLAY_DRAFT: o.draft,
    ROM_REPLAY_SWAP_OVERRIDE: o.swapOverride, ROM_REPLAY_POLICY: o.policy, ROM_REPLAY_SWAP: o.swap };
  const node = (args: string[]) => execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, ...args], { stdio: "pipe", maxBuffer: 1 << 28, env });
  node(["round", `--seed=${o.seed}`, `--scene=${o.scene}`, "--round=1", `--setups=${setups.join(",")}`, `--swap=${o.swap}`, `--policy=${o.policy}`,
    `--known-k=${f.knownK.join(",")}`, `--player-variants=${f.playerVariants.join(",")}`, `--out=${join(dir, "engine.json")}`]);
  writeFileSync(join(dir, "drive.json"), JSON.stringify({ error: null, battles: f.rom }));
  node(["round-compare", `--seed=${o.seed}`, `--engine=${join(dir, "engine.json")}`, `--drive=${join(dir, "drive.json")}`, `--out=${join(dir, "cmp.json")}`]);
  return { engine: JSON.parse(readFileSync(join(dir, "engine.json"), "utf8")), cmp: JSON.parse(readFileSync(join(dir, "cmp.json"), "utf8")) };
}

// The ROM's own facts at every battle start (the engine had to agree with each of them).
const romRounds = (f: Fixture) => f.setups.map((s) => s.round);

const CASES: Array<{ name: string; covers: (f: Fixture, engine: any) => void }> = [
  { name: "never-swap", covers: (f, engine) => {
    expect(engine.battles.slice(0, -1).every((b: any) => b.swapAfter?.type === "decline")).toBe(true);
    // fix 44: the draft is paid at the first win, nothing after
    expect(romRounds(f).map((r) => r.rentsCount)).toEqual([0, 1, 1, 1, 1, 1, 1]);
    expect(romRounds(f).map((r) => r.performedRentalSwap)).toEqual([1, 0, 0, 0, 0, 0, 0]);
  } },
  { name: "swap-every-win", covers: (f, engine) => {
    expect(engine.battles.slice(0, -1).every((b: any) => b.swapAfter?.type === "accept")).toBe(true);
    expect(romRounds(f).map((r) => r.rentsCount)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  } },
  { name: "cancel-after-yes", covers: (f, engine) => {
    const cancels = engine.battles.filter((b: any) => b.swapAfter?.type === "cancel");
    expect(new Set(cancels.map((b: any) => b.swapAfter.at))).toEqual(new Set(["player", "enemy"]));
    expect(f.rom.filter((b) => b.between?.swap?.rom?.monSwapped === 0).length).toBe(cancels.length);
    // a cancelled swap is no rent (SwapMons skips factory_setswapped)
    expect(romRounds(f).map((r) => r.rentsCount)).toEqual([0, 1, 1, 1, 1, 1, 1]);
  } },
  { name: "silver-noland-swapped-away-set", covers: (f, engine) => {
    const last = romRounds(f).at(-1);
    expect([last.battleNum, last.trainerId, last.factorySymbols]).toEqual([6, 1022, 0]);
    // fix 45: Noland's team is rolled after the swap and holds the set the player had just swapped away
    const swappedAway = romRounds(f)[5].rentalMons[engine.battles[5].swapAfter.playerPartyIndex].monId;
    expect(engine.battles[6].between.selection.setIds).toContain(swappedAway);
    expect(swappedAway).toBe(361);
  } },
  { name: "gold-noland", covers: (f) => {
    const last = romRounds(f).at(-1);
    expect([last.battleNum, last.trainerId, last.factorySymbols, last.factoryWinStreak]).toEqual([6, 1022, 1, 41]);
    expect(f.setups.at(-1).snapshot.parties.opponent.map((m: any) => m.ivs.attack)).toEqual([31, 31, 31]);
  } },
  { name: "draft-better-slot", covers: (f, engine) => {
    const next = romRounds(f).findIndex((r, n) => n > 0 && r.battleNum === 0);
    // the next round's draft is rolled at 15 rents: one better slot (GetNumPastRentalsRank 1)
    expect(romRounds(f)[next].rentsCount).toBeGreaterThanOrEqual(15);
    expect(romRounds(f)[next].rentsCount).toBeLessThan(22);
    expect(engine.battles[next].between.newRound).toBe(true);
  } },
  { name: "unbroken-run-to-gold", covers: (f, engine) => {
    // One unbroken ROM play from the very start: streak 0, rent count 0, no symbols; nothing staged after battle 1.
    const r = romRounds(f);
    expect(r).toHaveLength(42);
    const starts = r.map((x, n) => ({ n, x })).filter(({ x }) => x.battleNum === 0);
    expect(starts.map(({ n }) => n)).toEqual([0, 7, 14, 21, 28, 35]);
    expect(starts.map(({ x }) => x.factoryWinStreak)).toEqual([0, 7, 14, 21, 28, 35]);
    expect(starts[0]!.x.rentsCount).toBe(0);
    // silver Noland at battle 21; the ROM gives the symbol, the next rounds carry it; gold Noland at battle 42
    expect([r[20].trainerId, r[20].factoryWinStreak, r[20].factorySymbols]).toEqual([1022, 20, 0]);
    expect(starts.slice(3).every(({ x }) => x.factorySymbols === 1)).toBe(true);
    expect([r[41].trainerId, r[41].factoryWinStreak, r[41].factorySymbols]).toEqual([1022, 41, 1]);
    expect(f.rom.at(-1).drive.outcome).toBe(1);
    // the fourth round's draft is rolled at 15 rents or more: one better slot
    expect(starts[3]!.x.rentsCount).toBeGreaterThanOrEqual(15);
    expect(engine.battles.filter((b: any) => b.swapAfter?.type === "accept").length).toBeGreaterThan(12);
  } },
  { name: "rent-count-wraps", covers: (f, engine) => {
    const next = romRounds(f).findIndex((r, n) => n > 0 && r.battleNum === 0);
    // fix 46: the draft at 256 rents reads the count as one byte
    expect(romRounds(f)[next].rentsCount).toBeGreaterThanOrEqual(256);
    expect(engine.battles[next].between.newRound).toBe(true);
  } },
];

describe("round replay fixtures: recorded real-ROM runs replayed through the engine", () => {
  for (const c of CASES) {
    it(`${c.name}: every battle start, roll and turn matches the ROM`, { timeout: 120_000 }, () => {
      const f = load(c.name);
      const { engine, cmp } = replay(f);
      expect(cmp.roundError).toBeNull();
      expect(cmp.battles).toHaveLength(f.expect.battles);
      for (const b of cmp.battles) {
        expect({ battle: b.battleIndex, startDiffs: b.startDiffs, error: b.engineError }).toEqual({ battle: b.battleIndex, startDiffs: [], error: null });
        if (b.battleIndex > 0 && !b.knownDifference) expect(b.selection?.matched, `battle ${b.battleIndex} roll`).toBe(true);
        expect(b.turns.divergence, `battle ${b.battleIndex} turns`).toBeNull();
        expect(b.turns.wideDiffPoints, `battle ${b.battleIndex} wide states`).toBe(0);
        expect(b.matchExceptKnown, `battle ${b.battleIndex}`).toBe(true);
      }
      expect(cmp.battles.filter((b: any) => b.knownDifference).length).toBe(f.expect.knownDifferences);
      c.covers(f, engine);
    });
  }
});
