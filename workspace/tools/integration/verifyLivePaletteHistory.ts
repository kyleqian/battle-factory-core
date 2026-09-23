/** Source-driven palette ownership proof; captured rows are verification only. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createScratchDir } from "../lib/scratch.ts";
import { createLiveMovePaletteHost, prepareLiveMovePalette } from "../../src/engine/liveMoveAnimationPalette.ts";
import { blendPalette, loadPalette } from "../../src/animation/spritePaletteHost.ts";
import { SHADOW_PUNCH_TRACE_BLEND_COEFF } from "../../src/animation/shadowPunch.ts";
import type { BattleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const vendor = dirname(realpathSync(join(root, "reference/pokeemerald")));
const hash = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const historyCase = process.argv[2] ?? "smoke";
assert(["smoke", "confusion", "dynamic-punch"].includes(historyCase));
const priorMove = historyCase === "smoke" ? 108 : historyCase === "confusion" ? 93 : 223;
const receipts = [];
for (const attacker of [0, 1] as const) {
  const scenario = "tools/integration/fixtures/shadow-after-" + historyCase + "-palette-history"
    + (attacker === 1 ? "-opponent" : "") + ".json";
  let previousDigest: string | undefined;
  for (let freshRun = 0; freshRun < 2; freshRun++) {
    const scratch = createScratchDir("pokebench-live-palette-history-");
    const output = join(scratch, "probe.json");
    const probe = spawnSync("python3", [
      join(root, "tools/run-mgba-probe.py"), output, "--",
      join(vendor, "mgba-venv/bin/python"), join(root, "tools/integration/paletteHostSourceProbe.py"),
      join(root, scenario), output, ...(historyCase === "smoke" ? [] : ["--move-events"]),
    ], { cwd: root, encoding: "utf8" });
    assert.equal(probe.status, 0, probe.stdout + probe.stderr);
    const bytes = readFileSync(output);
    const source = JSON.parse(bytes.toString("utf8")) as { rows: {
      tick: number; phase: string; currentMove: number;
      tags: number[]; unfadedObj: number[]; fadedObj: number[];
    }[]; moveEvents?: { tick: number; moveId: number; attacker: number }[] };
    if (historyCase !== "smoke") {
      assert.deepEqual(source.moveEvents!.slice(0, 3).map(event => event.moveId), [325, priorMove, 325],
        "the intervening body executes through normal source input, before the repeated Shadow Punch");
    }
    const traceRows = source.rows.filter(r => r.phase === "move" && r.currentMove === 325 && r.tags.includes(10097));
    const cleanupRows = source.rows.filter(r => r.phase === "move" && r.currentMove === 325 && r.tags.slice(7).every(t => t === 0xffff));
    assert.equal(traceRows.length, 2, "both real Shadow Punch executions allocate a trace row");
    assert.equal(cleanupRows.length, 2, "both executions release all animation palette tags");
    const request = (moveId: number, side = attacker): BattleMoveAnimationRequest => ({
      moveId, attacker: side, target: side === 0 ? 1 : 0,
      turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
    });
    let host = createLiveMovePaletteHost();
    const comparisons = [];
    for (let i = 0; i < 2; i++) {
      const prepared = prepareLiveMovePalette(host, request(325));
      const row = traceRows[i]!;
      const bank = row.tags.indexOf(10097);
      const palette = prepared.input.traceScratchUnfadedPalette!;
      assert(prepared.input.historyKnown);
      const raw = palette.map(c => (c.r >> 3) | ((c.g >> 3) << 5) | ((c.b >> 3) << 10));
      assert.deepEqual(raw, row.unfadedObj.slice(bank * 16, bank * 16 + 16));
      const memory = loadPalette(prepared.next.memory, 256 + bank * 16, raw);
      const blended = blendPalette(memory, 256 + bank * 16, 16, SHADOW_PUNCH_TRACE_BLEND_COEFF, 0);
      assert.deepEqual(blended.faded.slice(256 + bank * 16, 256 + bank * 16 + 16), row.fadedObj.slice(bank * 16, bank * 16 + 16));
      assert.deepEqual(prepared.next.memory.tags, cleanupRows[i]!.tags);
      assert.deepEqual(prepared.next.memory.unfaded.slice(256 + 7 * 16, 256 + 10 * 16), cleanupRows[i]!.unfadedObj.slice(7 * 16, 10 * 16));
      if (priorMove === 223 && i === 1) {
        assert.deepEqual(prepared.next.memory.unfaded.slice(256 + 10 * 16, 256 + 11 * 16),
          cleanupRows[i]!.unfadedObj.slice(10 * 16, 11 * 16));
      }
      comparisons.push({ sourceTick: row.tick, bank, unfadedSha256: hash(JSON.stringify(raw)), fadedSha256: hash(JSON.stringify(row.fadedObj.slice(bank * 16, bank * 16 + 16))) });
      host = prepareLiveMovePalette(prepared.next, request(priorMove, attacker === 0 ? 1 : 0)).next;
    }
    if (historyCase !== "confusion") {
      assert.notEqual(comparisons[0]!.unfadedSha256, comparisons[1]!.unfadedSha256, "The intervening move changes the later trace's stale source colors");
    } else {
      assert.equal(comparisons[0]!.unfadedSha256, comparisons[1]!.unfadedSha256, "Confusion changes no retained OBJ unfaded scratch colors");
    }
    const digest = hash(bytes);
    if (previousDigest) assert.equal(digest, previousDigest, "two fresh source executions agree");
    previousDigest = digest;
    receipts.push({ scenario, attacker, freshRun, sourceSha256: digest, comparisons, checks: ["unfaded scratch row", "source blend result", "palette-tag cleanup", "retained resource rows 7..9"] });
  }
}
const receipt = { schema: "live-palette-history-source-proof/v1", claim: "Palette ownership and colors only; excludes framebuffer/whole-battle timing and unmodeled move/switch history.", receipts };
writeFileSync(join(root, "tools/integration/fixtures/live-palette-" + (historyCase === "smoke" ? "" : historyCase + "-") + "history-receipt.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ orientations: 2, freshRuns: 2, traceAllocations: receipts.length * 2, checks: "passed" }));
