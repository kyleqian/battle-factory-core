/** Runtime proof for the bounded source-derived live palette plans. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import data from "../../src/data/gen/live-animation-palette-resources.json" with { type: "json" };
import casesFixture from "./fixtures/live-palette-batch-cases.json" with { type: "json" };
import { createLiveMovePaletteHost, prepareLiveMovePalette } from "../../src/engine/liveMoveAnimationPalette.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const evidenceDir = process.argv[2];
assert(evidenceDir, "pass a fresh ignored evidence directory");
const selectedIds = new Set(process.argv.slice(3).map(Number));
const selectedCases = casesFixture.cases.filter(row => selectedIds.size === 0 || selectedIds.has(row.id));
assert(selectedCases.length, "no selected palette cases");
mkdirSync(evidenceDir, { recursive: true });
const hash = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const request = (moveId: number, attacker: 0 | 1): BattleMoveAnimationRequest => ({
  moveId, attacker, target: attacker === 0 ? 1 : 0,
  turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
const stats = (speed: number) => ({
  nature: 0,
  ivs: { hp: 31, attack: 0, defense: 31, speed, spAttack: 0, spDefense: 31 },
  evs: { hp: 252, attack: 0, defense: speed ? 0 : 252, speed: speed ? 252 : 0, spAttack: 0, spDefense: speed ? 6 : 6 },
  ppUps: [0, 0, 0, 0], item: 0, abilitySlot: 0, friendship: 70, gender: "male", shiny: false,
});
const mon = (species: number, moveId: number, fast = false) => ({
  species, level: 50, moves: [moveId, moveId, moveId, moveId], ...stats(fast ? 31 : 0),
});
const triple = <T>(value: T): T[] => [structuredClone(value), structuredClone(value), structuredClone(value)];
const receipts: unknown[] = [];

for (const row of selectedCases) {
  const plan = data.plans[String(row.id) as keyof typeof data.plans];
  assert(plan, `missing generated plan ${row.id}`);
  const loadedTags = plan.loads.map(name => data.resources[name as keyof typeof data.resources].tag);
  for (const orientation of ["player", "opponent"] as const) {
    const priorAttacker = orientation === "player" ? 0 : 1;
    const shadowAttacker = priorAttacker === 0 ? 1 : 0;
    let repeatDigest: string | undefined;
    for (let freshRun = 0; freshRun < 2; freshRun++) {
      const carrier = mon(row.species, row.id);
      // Smeargle legally carries Shadow Punch through Sketch without making
      // Normal/Fighting proof bodies immune merely because the scratch actor
      // itself is Ghost-type.
      const shadow = mon(235, 325);
      const scenario = {
        schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50,
        challengeNum: 0, battleNum: 0, trainerId: 50,
        playerSetIds: [156, 149, 180], opponentSetIds: [135, 188, 184], seed: row.seed,
        overrides: { parties: orientation === "player"
          ? { player: triple(carrier), opponent: triple(shadow) }
          : { player: triple(shadow), opponent: triple(carrier) } },
        trace: { segments: [
          { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
          { frames: 2, buttons: ["A"] }, { frames: 1800, buttons: [] },
          { frames: 2, buttons: ["A"] }, { frames: 30, buttons: [] },
          { frames: 2, buttons: ["A"] }, { frames: 1200, buttons: [] },
        ], captureFrames: [0, 3068] },
      };
      const stem = `${String(row.id).padStart(3, "0")}-${row.move.toLowerCase()}-${orientation}-${freshRun}`;
      const scenarioPath = join(evidenceDir, `${stem}-scenario.json`);
      const outputPath = join(evidenceDir, `${stem}-probe.json`);
      writeFileSync(scenarioPath, JSON.stringify(scenario));
      const probe = spawnSync("python3", [
        join(root, "tools/run-mgba-probe.py"), outputPath, "--",
        join(vendor, "mgba-venv/bin/python"), join(root, "tools/integration/paletteHostSourceProbe.py"),
        scenarioPath, outputPath, "--move-events",
      ], { cwd: root, encoding: "utf8" });
      writeFileSync(join(evidenceDir, `${stem}.log`), probe.stdout + probe.stderr);
      assert.equal(probe.status, 0, `${stem}: ${probe.stdout}${probe.stderr}`);
      const bytes = readFileSync(outputPath);
      const source = JSON.parse(bytes.toString("utf8")) as {
        rows: { tick: number; phase: string; currentMove: number; tags: number[]; unfadedObj: number[] }[];
        moveEvents: { tick: number; moveId: number; attacker: number }[];
      };
      const events = source.moveEvents.filter(event => event.moveId === 325 || event.moveId === row.id);
      assert(events.filter(event => event.moveId === 325 && event.attacker === shadowAttacker).length >= 2,
        `${stem}: Shadow Punch must execute on both sides of the assigned command`);
      assert(events.some(event => event.moveId === row.id && event.attacker === priorAttacker),
        `${stem}: assigned body must execute; misses/status stops cannot count`);
      const firstShadow = events.findIndex(event => event.moveId === 325);
      const priorIndex = events.findIndex((event, index) => index > firstShadow && event.moveId === row.id);
      const nextShadowIndex = events.findIndex((event, index) => index > priorIndex && event.moveId === 325);
      assert(firstShadow >= 0 && priorIndex > firstShadow && nextShadowIndex > priorIndex,
        `${stem}: an assigned body must sit between two successful Shadow Punch bodies`);
      assert(events.slice(priorIndex, nextShadowIndex).some(event => event.moveId === row.id),
        `${stem}: multi-hit/recoil command must survive through the following command`);
      const priorTick = events[priorIndex]!.tick;
      const nextShadowTick = events[nextShadowIndex]!.tick;
      const between = source.rows.filter(sourceRow => sourceRow.tick >= priorTick && sourceRow.tick < nextShadowTick);
      const cleanup = source.rows.findLast(sourceRow => sourceRow.tick < nextShadowTick
        && sourceRow.tags.slice(7).every(tag => tag === 0xffff));
      assert(cleanup, `${stem}: complete cleanup before following Shadow Punch`);
      if (loadedTags.length) assert(cleanup.tick >= priorTick, `${stem}: loaded resources clean up after their body`);
      else assert.equal(between.length, 0, `${stem}: empty support plan changes no OBJ tag or unfaded row`);
      for (const tag of loadedTags) {
        assert(between.some(sourceRow => sourceRow.tags.includes(tag)), `${stem}: source never loaded tag ${tag}`);
      }
      const unexpected = new Set(between.flatMap(sourceRow => sourceRow.tags.slice(7).filter(tag => tag !== 0xffff)));
      assert.deepEqual([...unexpected].sort((a, b) => a - b), [...loadedTags].sort((a, b) => a - b),
        `${stem}: callback introduced an unmodeled OBJ palette tag`);
      const shadowRows = source.rows.filter(sourceRow => sourceRow.currentMove === 325 && sourceRow.tags.includes(data.bentSpoonTag));
      assert.equal(shadowRows.length, 2, `${stem}: both Shadow Punch scratch allocations`);

      let host = createLiveMovePaletteHost();
      host = prepareLiveMovePalette(host, request(325, shadowAttacker)).next;
      host = prepareLiveMovePalette(host, request(row.id, priorAttacker)).next;
      assert(host.historyKnown);
      assert.deepEqual(host.memory.tags, cleanup.tags, `${stem}: cleanup palette tags`);
      assert.deepEqual(host.memory.unfaded.slice(256 + 7 * 16, 256 + 10 * 16), cleanup.unfadedObj.slice(7 * 16, 10 * 16),
        `${stem}: retained owned/startup OBJ scratch rows 7..9 after cleanup`);
      const next = prepareLiveMovePalette(host, request(325, shadowAttacker));
      assert(next.input.historyKnown);
      const raw = next.input.traceScratchUnfadedPalette!.map(color =>
        (color.r >> 3) | ((color.g >> 3) << 5) | ((color.b >> 3) << 10));
      const sourceScratch = shadowRows[1]!;
      const bank = sourceScratch.tags.indexOf(data.bentSpoonTag);
      assert.deepEqual(raw, sourceScratch.unfadedObj.slice(bank * 16, bank * 16 + 16),
        `${stem}: following Shadow Punch scratch input`);
      const digest = hash(bytes);
      if (repeatDigest) assert.equal(digest, repeatDigest, `${stem}: twice-fresh source determinism`);
      repeatDigest = digest;
      receipts.push({ moveId: row.id, move: row.move, orientation, freshRun, digest,
        events, loadedTags, cleanupTick: cleanup.tick, scratchBank: bank, scratchSha256: hash(JSON.stringify(raw)) });
    }
  }
}

const receipt = {
  schema: "live-palette-batch-source-proof/v1",
  claim: "Source palette ownership, cleanup, retained OBJ rows, and following Shadow Punch scratch only; no framebuffer or arbitrary-history exactness.",
  cases: selectedCases.length, orientations: 2, freshRuns: 2, receipts,
};
writeFileSync(join(root, "tools/integration/fixtures/live-palette-batch-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ cases: selectedCases.length, runs: receipts.length, checks: "passed" }));
