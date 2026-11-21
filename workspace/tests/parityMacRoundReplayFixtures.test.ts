// Round replay without an emulator (docs/parity-mac/round-replay.md, "The test"). Each fixture is a whole run recorded on the real ROM
// (tools/audio/romRoundReplay.sh, kept by tools/audio/romRoundFixture.py): the ROM's read-back at every battle start and the ROM's states during every
// battle. The test replays it through the engine's round orchestrator (soundCensusRomReplay.ts `round`, the same code the ROM replay runs) and the
// compare (`round-compare`), and checks what the tool checks: every battle start (battle number, streak, symbols, rent count, swap flag, trainer, both
// teams' sets and every field of all six Pokemon), every trainer and draft roll from the ROM's RNG cursor, and every turn (the ROM's state after each turn
// and the wide state at each decision). Finding 47 (a chained round's first trainer, rolled after the rentals' personalities) was the one known
// difference, counted apart (`knownDifference`); fop1 fixed it (docs/fop1-first-opponent-order.md), so every battle now matches outright: the 8
// chained rounds' first trainers these recordings held as known differences (draft-better-slot 1, unbroken-run-to-gold 5, two-symbols-battle-63 1,
// rent-count-wraps 1: the fixtures' `expect.knownDifferences`, recorded before the fix) are the ROM's own rolls now.
// What each recording is for is pinned on the ROM's own data, so a fixture cannot quietly stop covering it.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

type Fixture = {
  name: string; note: string;
  options: { seed: number; scene: string; policy: string; swap: string; challenge: number; symbols: number; heard?: string; draft: string; swapOverride: string };
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
    ROM_REPLAY_SWAP_OVERRIDE: o.swapOverride, ROM_REPLAY_POLICY: o.policy, ROM_REPLAY_SWAP: o.swap, ROM_REPLAY_HEARD: o.heard ?? "" };
  const node = (args: string[]) => execFileSync("node", ["--experimental-strip-types", "--no-warnings", script, ...args], { stdio: "pipe", maxBuffer: 1 << 28, env });
  node(["round", `--seed=${o.seed}`, `--scene=${o.scene}`, "--round=1", `--setups=${setups.join(",")}`, `--swap=${o.swap}`, `--policy=${o.policy}`,
    `--known-k=${f.knownK.join(",")}`, `--player-variants=${f.playerVariants.join(",")}`, `--out=${join(dir, "engine.json")}`]);
  writeFileSync(join(dir, "drive.json"), JSON.stringify({ error: null, battles: f.rom }));
  node(["round-compare", `--seed=${o.seed}`, `--engine=${join(dir, "engine.json")}`, `--drive=${join(dir, "drive.json")}`, `--out=${join(dir, "cmp.json")}`]);
  return { engine: JSON.parse(readFileSync(join(dir, "engine.json"), "utf8")), cmp: JSON.parse(readFileSync(join(dir, "cmp.json"), "utf8")) };
}

// The ROM's own facts at every battle start (the engine had to agree with each of them).
const romRounds = (f: Fixture) => f.setups.map((s) => s.round);
// The save's Factory record (docs/parity-mac/frontier-record.md): Noland's lines the ROM showed (romRoundDriver.py brainTexts) before battle n,
// and the symbol's lines after battle n (the next round's screens, or the run's epilogue to the next draft screen).
const SPEECH = ["NolandImFactoryHead", "ShakeOutKnowledgeBringItOn", "HarderLookThanLastTime", "AllRightBringItOn"];
const SYMBOL_LINES = { silver: ["NolandLetsSeeFrontierPass", "ReceivedKnowledgeSymbol", "NextTimeNoHoldsBarred"],
  gold: ["OutOfMyLeagueLetsSeePass", "KnowledgeSymbolTookGoldenShine", "LastTimeILoseToYou"] };
const linesBefore = (f: Fixture, n: number) => (f.rom[n - 1].between.brainTexts as string[]).filter((t) => SPEECH.includes(t));
const linesAfter = (f: Fixture, n: number) => (f.rom[n].between.brainTexts as string[]).filter((t) => [...SYMBOL_LINES.silver, ...SYMBOL_LINES.gold].includes(t));
const heard = (silver: number, gold: number) => ({ silver, gold });
// Noland's battle n: what the engine's battle room showed, what the ROM showed, and that the compare checked both sides.
function nolandScreens(f: Fixture, engine: any, cmp: any, n: number, speech: object, lines: string[], after: string[]) {
  expect(engine.battles[n].between.brainSpeech).toMatchObject(speech);
  expect(linesBefore(f, n)).toEqual(lines);
  expect(linesAfter(f, n)).toEqual(after);
  expect(cmp.battles[n].speech.rom).toEqual(lines);
  expect(cmp.battles[n].symbol.rom.texts).toEqual(after);
}

const CASES: Array<{ name: string; covers: (f: Fixture, engine: any, cmp: any) => void }> = [
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
  { name: "two-symbols-battle-21", covers: (f, engine, cmp) => {
    // both symbols: battle 21 is Noland's return battle (STREAK): no first speech, the short silver lines, no symbol
    const r = romRounds(f);
    expect([r[6].battleNum, r[6].trainerId, r[6].factorySymbols, r[6].factoryWinStreak]).toEqual([6, 1022, 2, 20]);
    expect(r.every((x) => JSON.stringify(x.heardBrainSpeech) === JSON.stringify(heard(1, 1)))).toBe(true);
    nolandScreens(f, engine, cmp, 6, { status: "streak", tier: "silver", firstEncounter: false }, ["ShakeOutKnowledgeBringItOn"], []);
    expect(f.rom[6].between).toMatchObject({ epilogue: true, reachedDraft: true, afterRound: { factorySymbols: 2, heardBrainSpeech: heard(1, 1) } });
  } },
  { name: "two-symbols-battle-42", covers: (f, engine, cmp) => {
    // STREAK_LONG at battle 42: the short gold lines (fix 48), no symbol
    const r = romRounds(f);
    expect([r[6].battleNum, r[6].trainerId, r[6].factorySymbols, r[6].factoryWinStreak]).toEqual([6, 1022, 2, 41]);
    nolandScreens(f, engine, cmp, 6, { status: "streak-long", tier: "gold", firstEncounter: false }, ["AllRightBringItOn"], []);
    expect(f.rom[6].between).toMatchObject({ reachedDraft: true, afterRound: { factorySymbols: 2 } });
  } },
  { name: "two-symbols-battle-63", covers: (f, engine, cmp) => {
    // challenges 7 and 8 back to back; battle 63 (challenge 8's seventh) is a return battle with the short gold lines (fix 48), no symbol
    const r = romRounds(f);
    expect(r).toHaveLength(14);
    expect([r[6].factoryWinStreak, r[7].battleNum, r[7].factoryWinStreak]).toEqual([55, 0, 56]);
    expect(r[6].trainerId).not.toBe(1022);
    expect([r[13].battleNum, r[13].trainerId, r[13].factorySymbols, r[13].factoryWinStreak]).toEqual([6, 1022, 2, 62]);
    // challenge 8: the draft's IVs are rolled spreads (the select screen reads sFixedIVTable at row 8, one past its end) and the engine's rule
    // gives the ROM's; the trainers keep a fixed 31
    const uneven = (m: any) => new Set(Object.values(m.ivs)).size > 1;
    expect(f.setups.slice(7).every((s) => s.snapshot.parties.player.every(uneven))).toBe(true);
    expect(f.setups.slice(7).every((s) => s.snapshot.parties.opponent.every((m: any) => !uneven(m) && m.ivs.attack === 31))).toBe(true);
    expect(engine.battles[7].between.rolledIvGaps.every((g: any) => g.found !== null)).toBe(true);
    nolandScreens(f, engine, cmp, 13, { status: "streak-long", tier: "gold", firstEncounter: false }, ["AllRightBringItOn"], []);
    expect(f.rom[13].between).toMatchObject({ reachedDraft: true, afterRound: { factorySymbols: 2, heardBrainSpeech: heard(1, 1) } });
  } },
  { name: "one-symbol-battle-21-ordinary", covers: (f, engine) => {
    // one symbol: battle 21 is an ordinary trainer; Noland says nothing anywhere
    const r = romRounds(f);
    expect([r[6].battleNum, r[6].factorySymbols, r[6].factoryWinStreak]).toEqual([6, 1, 20]);
    expect(r[6].trainerId).not.toBe(1022);
    expect(engine.battles.every((b: any) => b.between?.brainSpeech === undefined)).toBe(true);
    expect(f.rom.every((b) => (b.between?.brainTexts ?? []).length === 0)).toBe(true);
    expect(f.rom[6].between).toMatchObject({ reachedDraft: true, afterRound: { factorySymbols: 1, heardBrainSpeech: heard(1, 0) } });
  } },
  { name: "heard-silver-no-symbol", covers: (f, engine, cmp) => {
    // no symbol, the silver speech heard: silver Noland skips his first speech and gives the silver symbol. Fix 49: the heard bits are
    // checked at every battle start, after the paid first win too.
    const r = romRounds(f);
    expect(r.every((x) => JSON.stringify(x.heardBrainSpeech) === JSON.stringify(heard(1, 0)))).toBe(true);
    expect([r[6].trainerId, r[6].factorySymbols, r[1].rentsCount]).toEqual([1022, 0, 1]);
    nolandScreens(f, engine, cmp, 6, { status: "silver", firstEncounter: false }, ["ShakeOutKnowledgeBringItOn"], SYMBOL_LINES.silver);
    expect(f.rom[6].between).toMatchObject({ reachedDraft: true, afterRound: { factorySymbols: 1, heardBrainSpeech: heard(1, 0) } });
  } },
  { name: "heard-gold-one-symbol", covers: (f, engine, cmp) => {
    // one symbol, the gold speech heard: gold Noland skips his first speech and gives the gold symbol
    const r = romRounds(f);
    expect([r[6].trainerId, r[6].factorySymbols, r[6].factoryWinStreak]).toEqual([1022, 1, 41]);
    nolandScreens(f, engine, cmp, 6, { status: "gold", firstEncounter: false }, ["AllRightBringItOn"], SYMBOL_LINES.gold);
    expect(f.rom[6].between).toMatchObject({ reachedDraft: true, afterRound: { factorySymbols: 2, heardBrainSpeech: heard(1, 1) } });
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
        if (b.battleIndex > 0) expect(b.selection?.matched, `battle ${b.battleIndex} roll`).toBe(true);
        expect(b.turns.divergence, `battle ${b.battleIndex} turns`).toBeNull();
        expect(b.turns.wideDiffPoints, `battle ${b.battleIndex} wide states`).toBe(0);
        expect(b.screensMatch, `battle ${b.battleIndex} Noland's lines and the symbol`).toBe(true);
        expect(b.matchExceptKnown, `battle ${b.battleIndex}`).toBe(true);
        expect({ battle: b.battleIndex, knownDifference: b.knownDifference, match: b.match }).toEqual({ battle: b.battleIndex, knownDifference: null, match: true });
      }
      expect(cmp.battles.filter((b: any) => b.knownDifference).length).toBe(0); // fop1: was f.expect.knownDifferences (finding 47)
      c.covers(f, engine, cmp);
    });
  }
});
