// dolldef-live: every row of each committed dense fixture (tools/integration/fixtures/dolldef-live/*.json, dolldefFixtures.py) through
// the PRODUCTION live renderer (renderBattleResolutionLiveView over liveAdapterFramebuffer.ts liveView) with the DEFENDER flagged as the
// displayed Substitute doll (BattleCommandFieldBattler.substituteDoll, field art rebuilt from it), compared with the committed ROM RGB
// sha256 of that row (both fresh probe runs agree). Pixel counts need the probe RGB: tools/integration/prep38Check.ts --probes.
//   node --experimental-strip-types --no-warnings tools/integration/dolldefLiveCheck.ts [--out=<receipt.json>] fixture.json...
import { createHash } from "node:crypto";
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { liveView, type Fixture } from "./liveAdapterFramebuffer.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import type { BattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";

export type DolldefFixture = Fixture & { stem: string; move: string; moveId: number; defenderDoll: boolean; shift: number;
  precedingBodies?: { moveId: number; side: string }[]; rows: [age: number, frame: number, sha256: string][] };

/** The live view at `age` with the defender shown as the doll; the order input is withheld when the fixture tool reports it unknown. */
export function dolldefView(f: DolldefFixture, age: number): BattleResolutionPresentationRenderView {
  let v: BattleResolutionPresentationRenderView;
  try { v = liveView(f, age); } catch (e) {
    if (!String(e).includes("Sprite order unknown")) throw e;
    process.env.POKEBENCH_LIVE_ORDER_INPUT = "none";
    try { v = liveView(f, age); } finally { delete process.env.POKEBENCH_LIVE_ORDER_INPUT; }
  }
  if (!f.defenderDoll) return v;
  const side = f.target.geometry.side;
  const field = { ...v.field, [side]: { ...v.field[side], substituteDoll: true as const } };
  return { ...v, field, fieldArt: createBattleCommandFieldArtView(field) };
}

/** sha256 of the 240x160 RGB of one production live frame (the probe's per-frame hash format). */
export function dolldefRowSha(f: DolldefFixture, age: number): string {
  const rgba = new Uint8Array(240 * 160 * 4);
  renderBattleResolutionLiveView(rgba, dolldefView(f, age));
  const rgb = new Uint8Array(240 * 160 * 3);
  for (let p = 0; p < 240 * 160; p++) { rgb[p * 3] = rgba[p * 4]!; rgb[p * 3 + 1] = rgba[p * 4 + 1]!; rgb[p * 3 + 2] = rgba[p * 4 + 2]!; }
  return createHash("sha256").update(rgb).digest("hex");
}

export function dolldefCheck(f: DolldefFixture) {
  const v0 = dolldefView(f, 0);
  const duration = liveMoveAnimationDuration((v0.effect as unknown as { request: never }).request, v0.field);
  const mismatched = f.rows.filter(([age, , sha]) => dolldefRowSha(f, age) !== sha).map(([age]) => age);
  return { stem: f.stem, move: f.move, attackerSide: f.attacker.geometry.side, rows: f.rows.length, shift: f.shift, liveDuration: duration,
    exactRows: f.rows.length - mismatched.length, mismatchedAges: mismatched };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=") as [string, string]));
  const out = process.argv.slice(2).filter((a) => !a.startsWith("--")).map((p) => {
    const r = dolldefCheck(JSON.parse(readFileSync(p, "utf8")) as DolldefFixture);
    console.log(JSON.stringify(r));
    return r;
  });
  if (args.out) writeFileSync(args.out, JSON.stringify(out, null, 1) + "\n");
}
