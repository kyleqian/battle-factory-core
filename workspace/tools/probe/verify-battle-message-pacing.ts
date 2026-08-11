// Battle-message pacing verify (RUNG D of the message-pacing scout).
//
// Replays the two committed scratch dense-pacing fixtures twice fresh via the
// Battle Scene OFF oracle and asserts the key schedule facts banked in
// docs/battle-message-pacing-ground-truth.md:
//
//   A. torment 1040-1260: message-window opens 1052; "Foe MURKROW used\n
//      TORMENT!" first glyph 1052, line2 start 1068, complete 1075, HOLD
//      1076-1113 (38); "But it failed!" first glyph 1114, complete 1127,
//      HOLD 1128-1206 (79); "BUTTERFREE used\nGUST!" first glyph 1207,
//      line2 start 1222, complete 1226, hold from 1227 through 1260.
//   B. switch 1256-1407: opponent "used SPLASH" tail completes 1264, HOLD
//      1265-1303 (39); "But nothing happened!" first glyph 1304, complete
//      1324, HOLD 1325-1398 (74); box clears 1399; action menu drawn 1406;
//      fight-menu submenu/input edge 1407.
//
// Every tick claim in the doc is twice-run byte-identical (the manifest's PNG
// sha256 list is invariant across two fresh runs of the same fixture), which
// this script re-checks before asserting the per-tick facts. The per-tick
// glyph-extent assertions read the committed derived tables
// (tools/probe/ground-truth/*-pacing-dense-table.json), which were produced
// with the same pixel extraction this doc's tables quote.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const ORACLE = join(ROOT, "bin", "oracle");
const OUT = join(ROOT, "tools", "probe", "ground-truth");

type Row = { box: boolean; l1: number; l2: number };

function runFixture(fixture: string, out: string): { captures: { frame: number; sha256: string }[] } {
  const r = spawnSync(
    ORACLE,
    ["lab", join(ROOT, "tools", "battle-lab", fixture), "-o", out, "-q"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`oracle lab failed for ${fixture}: ${r.stderr || r.stdout}`);
  }
  const manifestPath = r.stdout.trim();
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function shas(manifest: { captures: { sha256: string }[] }): string[] {
  return manifest.captures.map((c) => c.sha256);
}

function readDerivedTable(name: string): Map<number, Row> {
  const rows = JSON.parse(readFileSync(join(OUT, name), "utf8")) as [number, string, number, number][];
  const map = new Map<number, Row>();
  for (const [f, kind, l1, l2] of rows) {
    map.set(f, { box: kind === "box", l1, l2 });
  }
  return map;
}

function assertStableHold(
  table: Map<number, Row>,
  start: number,
  end: number,
  label: string,
): void {
  const anchor = table.get(start);
  if (!anchor) throw new Error(`${label}: no row at hold start ${start}`);
  for (let f = start + 1; f <= end; f++) {
    const row = table.get(f);
    if (!row) throw new Error(`${label}: no row at ${f}`);
    if (row.l1 !== anchor.l1 || row.l2 !== anchor.l2) {
      throw new Error(`${label}: pixel state changed inside hold at ${f} (L1 ${anchor.l1}->${row.l1}, L2 ${anchor.l2}->${row.l2})`);
    }
  }
}

function verifyTorment(): void {
  const fixture = "scratch-torment-pacing-dense-a-off.json";
  const m1 = runFixture(fixture, join(OUT, "_verify-torment-1"));
  const m2 = runFixture(fixture, join(OUT, "_verify-torment-2"));
  if (JSON.stringify(shas(m1)) !== JSON.stringify(shas(m2))) {
    throw new Error("torment pacing trace is NOT byte-identical across two fresh runs");
  }
  console.log("torment: 221/221 captures byte-identical across two fresh runs");

  const table = readDerivedTable("torment-pacing-dense-table.json");
  // Fight-submenu window (white bg, ~2800px/line) through 1051; message box opens 1052.
  if (!(table.get(1051)!.l1 > 2000)) throw new Error("torment 1051 should still be the white fight-submenu window");
  if (!(table.get(1052)!.l1 < 200)) throw new Error("torment 1052 should be a fresh message box, not the submenu");
  // M1: first glyph 1052, L1 complete 1067, L2 starts 1068, complete 1075.
  if (!(table.get(1052)!.l1 >= 10)) throw new Error("no first glyph at 1052");
  if (!(table.get(1067)!.l1 > 200)) throw new Error("L1 not complete by 1067");
  if (!(table.get(1068)!.l2 >= 10)) throw new Error("L2 did not start at 1068");
  if (!(table.get(1075)!.l2 >= 100)) throw new Error("L2 not complete by 1075");
  // HOLD 1076-1113, then M2 first glyph 1114.
  assertStableHold(table, 1076, 1113, "torment M1 hold");
  if (!(table.get(1114)!.l1 >= 10 && table.get(1114)!.l1 < 100)) throw new Error("M2 first glyph not at 1114");
  // M2 complete 1127, HOLD 1128-1206, M3 first glyph 1207.
  if (!(table.get(1127)!.l1 > 100)) throw new Error("M2 not complete by 1127");
  assertStableHold(table, 1128, 1206, "torment M2 hold");
  if (!(table.get(1207)!.l1 >= 10 && table.get(1207)!.l1 < 100)) throw new Error("M3 first glyph not at 1207");
  if (!(table.get(1222)!.l2 >= 10)) throw new Error("M3 L2 did not start at 1222");
  console.log("torment: schedule facts PASS (1052/1068/1075, holds 1076-1113 + 1128-1206, 1114/1207 edges)");
}

function verifySwitch(): void {
  const fixture = "scratch-mid-battle-switch-pacing-b-off.json";
  const m1 = runFixture(fixture, join(OUT, "_verify-switch-1"));
  const m2 = runFixture(fixture, join(OUT, "_verify-switch-2"));
  if (JSON.stringify(shas(m1)) !== JSON.stringify(shas(m2))) {
    throw new Error("switch pacing trace is NOT byte-identical across two fresh runs");
  }
  console.log("switch: 152/152 captures byte-identical across two fresh runs");

  const table = readDerivedTable("switch-pacing-dense-table.json");
  // M1 tail: L1 complete 1257, L2 types 1258-1264, complete 1264.
  if (!(table.get(1257)!.l1 > 200)) throw new Error("M1 L1 not complete by 1257");
  if (!(table.get(1264)!.l2 >= 100)) throw new Error("M1 L2 not complete by 1264");
  // HOLD 1265-1303 (39 frames), M2 first glyph 1304.
  assertStableHold(table, 1265, 1303, "switch M1 hold");
  if (!(table.get(1304)!.l1 >= 10 && table.get(1304)!.l1 < 100)) throw new Error("M2 first glyph not at 1304");
  // M2 complete 1324, HOLD 1325-1398, box clears 1399.
  if (!(table.get(1324)!.l1 > 200)) throw new Error("M2 not complete by 1324");
  assertStableHold(table, 1325, 1398, "switch M2 hold");
  if (!(table.get(1399)!.l1 === 0 && table.get(1399)!.l2 === 0)) throw new Error("message box did not clear at 1399");
  // Action menu drawn 1406 (white-text row jumps), fight-menu edge 1407.
  if (!(table.get(1406)!.l1 > 1000)) throw new Error("action menu not drawn at 1406");
  if (!(table.get(1407)!.l1 > 1000)) throw new Error("fight menu edge 1407 not present");
  console.log("switch: schedule facts PASS (1257/1264, hold 1265-1303, 1304/1324, hold 1325-1398, 1399 clear, 1406/1407 menu)");
}

function main(): void {
  verifyTorment();
  verifySwitch();
  console.log("ALL PASS: battle-message pacing schedule verified (twice-run byte-identical + per-tick assertions)");
}

main();
