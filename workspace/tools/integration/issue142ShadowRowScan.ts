/**
 * ISSUES #142 row-exact shadow scan. Unlike issue142Scan.ts (row 0 for every id), this renders the production live path
 * with an elevated GOLBAT opponent in both roles at EVERY age and requires the 32x8 enemy shadow (200 mask pixels of
 * battle-enemy-shadow.json) exactly on the per-id row of LIVE_MOVE_OPPONENT_SHADOW_ROW and absent on every other row
 * before the script's cleanup frame (tailFirstAge from issue142-shadow-rows.json: SpriteCB_EnemyShadow shows it again
 * after cleanup, battle_gfx_sfx_util.c:1214). Ids absent from the table row set (negative offset) must have no shadow row.
 *
 *   node --experimental-strip-types tools/integration/issue142ShadowRowScan.ts [out.json]
 * Writes tools/integration/fixtures/issue142-shadow-row-scan.json by default.
 */
import { readFileSync, writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { liveView } from "./liveAdapterFramebuffer.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import {
  LIVE_MOVE_ANIMATION_IDS, LIVE_MOVE_OPPONENT_SHADOW_ROW, liveMoveAnimationDuration, liveMoveOpponentShadowReturn,
} from "../../src/engine/liveMoveAnimation.ts";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FULL = 200;
const shadow = JSON.parse(readFileSync(resolve(repo, "src/assets/gen/battle-enemy-shadow.json"), "utf8"));
const sx = 176 - shadow.width / 2, sy = 40 + 29 - shadow.height / 2;
const count = (fb: Uint8Array) => {
  let n = 0;
  for (const p of shadow.mask as number[]) {
    const o = ((sy + Math.floor(p / shadow.width)) * 240 + sx + (p % shadow.width)) * 4;
    if (fb[o] === shadow.color.r && fb[o + 1] === shadow.color.g && fb[o + 2] === shadow.color.b) n++;
  }
  return n;
};
const table = JSON.parse(readFileSync(resolve(repo, "tools/integration/fixtures/issue142-shadow-rows.json"), "utf8")).rows as any[];
const extra = JSON.parse(readFileSync(resolve(repo, "tools/integration/fixtures/issue142-shadow-rows-extra.json"), "utf8")).rows as any[];
// ISSUE142_SCAN_IDS=183,... restricts the scan to those ids (a per-adapter check; the default full scan writes the committed fixture).
const onlyIds = process.env.ISSUE142_SCAN_IDS?.split(",").map(Number);
const rows = [...table, ...extra].filter((r) => !onlyIds || onlyIds.includes(r.id));
const mismatches: any[] = [];
const out: any[] = [];
const seen = new Set<number>();
// Icy Wind / Blizzard fall back to the scene-off view where the retained slot table is unproven
// (liveMoveAnimation.ts provableEffectOrder); these [player partner, elevated opponent] pairs are live in both orientations.
const PAIR: Record<number, [string, string]> = { 196: ["SHUCKLE", "MAGNEMITE"], 59: ["SHUCKLE", "BUTTERFREE"], 237: ["UNOWN", "UNOWN"] };
for (const r of rows) {
  seen.add(r.id);
  const partner = PAIR[r.id]?.[0] ?? "PHANPY";
  const mk = (opp: string) => ({
    move: r.move, body: (r.sources?.body ?? "normal") as "normal", probe: "", scenario: "",
    requestFields: r.requestFields,
    // Faithful-random rows carry a pinned activation value (liveAdapterFramebuffer.ts fixturePresentationRng).
    ...(r.presentationRngActivation ? { presentationRngActivation: r.presentationRngActivation } : {}),
    attacker: { species: r.orientation === "player" ? partner : opp, geometry: { side: r.orientation } },
    target: { species: r.orientation === "player" ? opp : partner, geometry: { side: r.orientation === "player" ? "opponent" : "player" } },
    fieldProfile: { playerHp: 120, playerMaxHp: 120, opponentHp: 120, opponentMaxHp: 120, playerGender: "male", opponentGender: "male" },
  });
  const f = mk(PAIR[r.id]?.[1] ?? "GOLBAT");
  const view0 = liveView(f as any, 0);
  const request = (view0.effect as any).request;
  const duration = liveMoveAnimationDuration(request, view0.field) as number;
  const expected: number | null = LIVE_MOVE_OPPONENT_SHADOW_ROW[r.id] ?? null;
  const tail: number = r.tailFirstAge ?? Infinity;
  const drawn: number[] = [];
  for (let age = 0; age < duration; age++) {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleResolutionLiveView(fb, liveView(f as any, age));
    if (count(fb) === FULL) drawn.push(age);
  }
  const bad: string[] = [];
  if (expected !== null && !drawn.includes(expected)) bad.push(`missing row ${expected}`);
  // End-of-body return rows (LIVE_MOVE_OPPONENT_SHADOW_RETURN_ROWS: Light Screen, Future Sight) are expected draws.
  for (const a of drawn) if (a !== expected && a < tail && !liveMoveOpponentShadowReturn(request, a)) bad.push(`extra row ${a}`);
  if (bad.length) mismatches.push({ id: r.id, move: r.move, orientation: r.orientation, expected, drawn, bad });
  out.push({ id: r.id, move: r.move, orientation: r.orientation, duration, expected, drawn, tailFirstAge: Number.isFinite(tail) ? tail : null });
}
const uncovered = (LIVE_MOVE_ANIMATION_IDS as readonly number[]).filter(id => !seen.has(id));
const summary = { rows: out.length, ids: seen.size, uncoveredIds: uncovered, mismatches: mismatches.length };
writeFileSync(process.argv[2] ?? resolve(repo, "tools/integration/fixtures/issue142-shadow-row-scan.json"),
  JSON.stringify({ schema: "issue142-shadow-row-scan/v1", generated: "tools/integration/issue142ShadowRowScan.ts", summary, mismatches, rows: out }, null, 1) + "\n");
console.log(JSON.stringify(summary), JSON.stringify(mismatches.slice(0, 40)));
