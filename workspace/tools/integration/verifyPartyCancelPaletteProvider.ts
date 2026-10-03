/** Verify the bounded ordinary party/B-cancel palette provider against fresh source runs. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import data from "../../src/data/gen/live-animation-palette-resources.json" with { type: "json" };
import {
  createLiveMovePaletteHost, prepareLiveMovePalette,
  returnLiveMovePaletteHostAfterOrdinaryPartyCancel,
} from "../../src/engine/liveMoveAnimationPalette.ts";

type Row = Readonly<{
  tick: number; callback2: number; reserved: number; currentMove: number;
  tags: number[]; unfadedObj: number[]; fadedObj: number[];
}>;
type Source = Readonly<{
  callbackSymbols: Readonly<Record<string, number>>;
  rows: Row[];
  moveEvents: ReadonlyArray<Readonly<{ tick: number; moveId: number; attacker: number }>>;
}>;
const evidenceDir = resolve(process.argv[2] ?? "");
const receiptPath = process.argv[3];
assert(process.argv[2] && receiptPath, "usage: verifyPartyCancelPaletteProvider EVIDENCE_DIR RECEIPT");
const hash = (value: Uint8Array | string) => createHash("sha256").update(value).digest("hex");
const menuTags = data.ordinaryPartyCancel.menuLoads.map((load) => load.tag);
const returned = returnLiveMovePaletteHostAfterOrdinaryPartyCancel(createLiveMovePaletteHost());
const expectedRow8 = data.ordinaryPartyCancel.menuLoads[8]!.colors;
const request = (attacker: 0 | 1) => ({
  moveId: 325, attacker, target: attacker === 0 ? 1 as const : 0 as const,
  turn: 0, power: 0, damage: 0, friendship: 70, multihit: 0,
});
const providerScratch = prepareLiveMovePalette(returned, request(0)).input.traceScratchUnfadedPalette!
  .map((color) => (color.r >> 3) | ((color.g >> 3) << 5) | ((color.b >> 3) << 10));
assert.deepEqual(providerScratch, expectedRow8);

const receipts: unknown[] = [];
for (const scenario of ["player", "opponent", "player-after-smoke", "opponent-after-smoke"] as const) {
  let repeatDigest: string | undefined;
  for (let freshRun = 0; freshRun < 2; freshRun++) {
    const path = join(evidenceDir, `${scenario}-${freshRun}.json`);
    const bytes = readFileSync(path);
    const source = JSON.parse(bytes.toString("utf8")) as Source;
    const digest = hash(bytes);
    if (repeatDigest !== undefined) assert.equal(digest, repeatDigest, `${scenario}: twice-fresh determinism`);
    repeatDigest = digest;

    const attacker = scenario.startsWith("player") ? 0 : 1;
    let providerEntry = createLiveMovePaletteHost();
    if (scenario.includes("after-smoke")) {
      providerEntry = prepareLiveMovePalette(providerEntry, request(attacker)).next;
      providerEntry = prepareLiveMovePalette(providerEntry, {
        ...request(attacker === 0 ? 1 : 0), moveId: 108,
      }).next;
    }
    const scenarioReturned = returnLiveMovePaletteHostAfterOrdinaryPartyCancel(providerEntry);
    const normalizedCallbacks = new Set(source.rows.map((row) => row.callback2 & ~1));
    for (const symbol of ["CB2_UpdatePartyMenu", "CB2_ReshowBattleScreenAfterMenu", "BattleMainCB2"]) {
      assert(normalizedCallbacks.has(source.callbackSymbols[symbol]! & ~1), `${scenario}: missing ${symbol}`);
    }
    const menu = source.rows.find((row) => row.reserved === 0
      && menuTags.every((tag, index) => row.tags[index] === tag));
    assert(menu, `${scenario}: complete party-menu allocation`);
    for (let bank = 0; bank < menuTags.length; bank++) {
      assert.deepEqual(menu.unfadedObj.slice(bank * 16, bank * 16 + 16),
        data.ordinaryPartyCancel.menuLoads[bank]!.colors, `${scenario}: menu bank ${bank}`);
    }
    const returnRow = source.rows.find((row) => row.tick > menu.tick
      && row.reserved === data.ordinaryPartyCancel.returnReservedCount
      && row.tags.every((tag, index) => tag === scenarioReturned.memory.tags[index]));
    assert(returnRow, `${scenario}: return healthbox/bar ownership`);
    assert.deepEqual(returnRow.unfadedObj.slice(8 * 16, 9 * 16), expectedRow8,
      `${scenario}: sixth icon row retained on return`);
    // Banks 4..9 are the complete currently relevant range: return ownership
    // at 4..5, following move resources/scratch at 6..8, and the startup
    // status-summary residue at 9. Higher untouched RAM is outside this claim.
    assert.deepEqual(returnRow.unfadedObj.slice(4 * 16, 10 * 16),
      scenarioReturned.memory.unfaded.slice(256 + 4 * 16, 256 + 10 * 16),
      `${scenario}: provider relevant allocatable unfaded rows`);

    const scratch = source.rows.find((row) => row.tick > returnRow.tick
      && row.currentMove === 325 && row.tags.indexOf(data.bentSpoonTag) === 8);
    assert(scratch, `${scenario}: Shadow Punch scratch allocation in bank 8`);
    assert.deepEqual(scratch.unfadedObj.slice(8 * 16, 9 * 16), providerScratch,
      `${scenario}: source/provider scratch colors`);
    const blended = providerScratch.map((color) => {
      let result = 0;
      for (const shift of [0, 5, 10]) {
        const channel = (color >> shift) & 31;
        result |= (channel + (((0 - channel) * 13) >> 4)) << shift;
      }
      return result;
    });
    assert.deepEqual(scratch.fadedObj.slice(8 * 16, 9 * 16), blended,
      `${scenario}: source BlendPalette coefficient 13`);
    const cleanup = source.rows.find((row) => row.tick > scratch.tick
      && row.tags.slice(6).every((tag) => tag === 0xffff));
    assert(cleanup, `${scenario}: complete Shadow Punch resource cleanup`);
    assert(source.moveEvents.some((event) => event.tick < scratch.tick
      && event.moveId === 325 && event.attacker === attacker), `${scenario}: actual oriented move event`);
    if (scenario.includes("after-smoke")) {
      assert(source.moveEvents.some((event) => event.tick < menu.tick && event.moveId === 108),
        `${scenario}: audited prior Smokescreen history`);
    }
    receipts.push({ scenario, freshRun, digest, menuTick: menu.tick, returnTick: returnRow.tick,
      scratchTick: scratch.tick, cleanupTick: cleanup.tick, attacker,
      scratchSha256: hash(JSON.stringify(providerScratch)), blendSha256: hash(JSON.stringify(blended)) });
  }
}

const receipt = Object.freeze({
  schema: "ordinary-party-cancel-palette-provider-proof/v1",
  claim: "Ordinary singles party entry/B-cancel retained OBJ ownership through the following Shadow Punch only; no menu framebuffer/timing, switch, summary, substitute/transform, unknown-history, or arbitrary-history claim.",
  evidenceDirectory: basename(evidenceDir), orientations: 2, priorHistories: ["startup", "Smokescreen"],
  freshRuns: 2, providerScratchSha256: hash(JSON.stringify(providerScratch)), receipts,
});
writeFileSync(resolve(receiptPath), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ runs: receipts.length, checks: "passed", receipt: resolve(receiptPath) }));
